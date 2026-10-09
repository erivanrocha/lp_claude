// Exporta os cliques marcados como "vendido" (com gclid) no formato CSV de conversões offline do Google Ads.
// Uso: node scripts/exportar-conversoes.mjs "Nome da conversão no Google Ads" [arquivo.csv]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const conversionName = process.argv[2];
const outFile = process.argv[3] || 'conversoes-offline.csv';
if (!conversionName) {
  console.error('Informe o nome da ação de conversão, exatamente como está no Google Ads.');
  console.error('Ex.: node scripts/exportar-conversoes.mjs "Venda Endereço Fiscal"');
  process.exit(1);
}

// sold_at é gravado em UTC; o Brasil (America/Sao_Paulo) está em UTC-3 sem horário de verão.
const sql = `SELECT gclid, strftime('%Y-%m-%d %H:%M:%S', sold_at, '-3 hours') AS conversion_time, sale_value
FROM whatsapp_clicks
WHERE status = 'vendido' AND gclid IS NOT NULL AND sold_at IS NOT NULL
ORDER BY sold_at`;

const output = execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', 'nvo-endereco-fiscal-db', '--remote', '--json', '--command', sql],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
);
const rows = JSON.parse(output)[0].results;

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const lines = [
  'Parameters:TimeZone=America/Sao_Paulo',
  'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency',
  ...rows.map((r) =>
    [r.gclid, conversionName, r.conversion_time, r.sale_value ?? '', r.sale_value != null ? 'BRL' : '']
      .map(csvCell)
      .join(',')
  ),
];
writeFileSync(outFile, lines.join('\n') + '\n');
console.log(`${rows.length} conversão(ões) exportada(s) para ${outFile}`);
