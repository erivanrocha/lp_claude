# Landing Page — Endereço Fiscal em Natal (NVO Coworking)

Página única em HTML, CSS e JS puros, publicada no **Cloudflare Pages**. Os arquivos da pasta `public/` são servidos direto; a **Pages Function** `functions/api/click.js` responde por `POST /api/click` e grava os cliques no botão de WhatsApp no **Cloudflare D1**.

> **Transição:** a versão anterior rodava como Cloudflare Worker (`nvo-endereco-fiscal`). A configuração dele foi mantida em `wrangler.worker.toml` (com `src/index.js`) até o Pages ser confirmado em produção. Depois disso, o Worker e esses dois arquivos podem ser removidos.

## Estrutura

```
public/                         → arquivos da página (saída do build do Pages)
  index.html                    → landing page
  politica-de-privacidade.html  → Política de Privacidade (/politica-de-privacidade)
  404.html
  assets/css/style.css
  assets/js/main.js             → WhatsApp + código de rastreio + gclid + banner de cookies
  assets/img/                   → fotos (AVIF + WebP)
  assets/logo/*.svg             → 6 variações do logo (vertical/horizontal × colorida/branca/negativa)
  assets/fonts/                 → Outfit (OFL), self-hosted
  _headers, robots.txt, sitemap.xml, favicon.svg
functions/api/click.js          → Pages Function: POST /api/click (outros métodos: 405)
src/click.js                    → validação e gravação do clique no D1 (usado pela Function e pelo Worker antigo)
src/index.js                    → Worker antigo (temporário)
migrations/0001_whatsapp_clicks.sql
scripts/exportar-conversoes.mjs → gera o CSV de conversões offline para o Google Ads
wrangler.toml                   → Cloudflare Pages: nome do projeto, pasta public/ e binding do D1
wrangler.worker.toml            → Worker antigo (temporário)
```

## Pendências (SUBSTITUIR QUANDO DISPONÍVEL)

| Item | Onde |
|---|---|
| Novas fotos (opcional; todas as seções já têm fotos reais) | Galeria do `public/index.html`: siga o formato das fotos já usadas (WebP + AVIF em `public/assets/img/`, 600 e 1000 px de largura). |
| 3 depoimentos (com autorização por escrito) | Bloco comentado `DEPOIMENTOS` no `index.html` |
| ID de conversão do Google Ads (`{GOOGLE_ADS_CONVERSION_ID_A_DEFINIR}`) | Configurado no GTM (ver abaixo), não no código |
| SVG oficial do logo (exportado do Illustrator) | Substituir os arquivos em `public/assets/logo/`, mantendo os mesmos nomes |
| Variações do título (teste A/B) | `<h1>` do `index.html` |

Contatos, número do WhatsApp e texto da mensagem ficam no topo de `public/assets/js/main.js` (`CONFIG`). O número também aparece nos `href` dos botões no HTML: eles servem de reserva caso o JavaScript não carregue.

## Publicação no Cloudflare Pages

Configuração já definida no `wrangler.toml`:
- Projeto Pages `nvo-endereco-fiscal-pages`. **O nome do projeto no painel precisa ser igual ao `name` do `wrangler.toml`.**
- Saída do build: pasta `public`.
- Banco D1 `nvo-endereco-fiscal`, ID `2413cf3a-a47c-4ded-a13d-cddc4c996a87`, ligado como `DB`.

### Criar o projeto no painel
Em *Workers & Pages → Create → Pages → Connect to Git*, escolha o repositório `erivanrocha/lp_claude` e configure:
- Project name: `nvo-endereco-fiscal-pages`
- Production branch: `claude/awesome-fermat-xt7569`
- Framework preset: *None*
- Build command: *(vazio)*
- Build output directory: `public`
- Root directory: *(vazio)*

O D1 é ligado pelo `wrangler.toml`. Depois do primeiro deploy, confira em *(projeto) → Settings → Bindings* se aparece `DB → nvo-endereco-fiscal`. Se não aparecer, adicione ali: *Add → D1 database*, nome da variável `DB`, banco `nvo-endereco-fiscal`.

### Worker antigo (temporário)
O Worker `nvo-endereco-fiscal` continua no ar com a última versão publicada. Como o `wrangler.toml` agora é do Pages, os próximos builds automáticos do Worker vão falhar, mas o site dele não sai do ar por isso. Para o Worker continuar recebendo atualizações até a troca, mude o deploy command dele (*Settings → Build*) para `npx wrangler deploy --config wrangler.worker.toml`.

### Criar a tabela (uma única vez)
O deploy não cria a tabela. Escolha uma das formas:
- No painel: *Storage & Databases → D1 → nvo-endereco-fiscal → Console*, cole o conteúdo de `migrations/0001_whatsapp_clicks.sql` e execute.
- Pelo terminal: `npx wrangler login` e depois `npm run db:migrate`.

### Domínio
No projeto Pages: *Custom domains → Set up a custom domain*, informe `enderecofiscal.nvocoworking.com.br` e siga as instruções. Com o DNS no **Registro.br**, basta criar lá um registro **CNAME** `enderecofiscal` apontando para `nvo-endereco-fiscal-pages.pages.dev`. Até lá, a página fica acessível em `https://nvo-endereco-fiscal-pages.pages.dev`.

### (Recomendado) Limite de requisições
Em *Security → WAF → Rate limiting rules* (disponível quando o domínio estiver na Cloudflare), limite `POST /api/click` (ex.: 20 por minuto por IP) para evitar registros de lixo.

### Testar localmente
```bash
npm install
npm run db:migrate:local
npm run dev
```

## Rastreamento

### Como funciona
1. Se a URL tiver `?gclid=...`, o valor é guardado no `sessionStorage` durante a visita.
2. No clique em qualquer botão de WhatsApp:
   - é gerado um código de 5 caracteres (ex.: `K7M2Q`, sem 0/O/1/I/L);
   - o WhatsApp abre com a mensagem `Olá! Quero contratar o Endereço Fiscal. Ref K7M2Q`;
   - `POST /api/click` grava no D1: código, gclid, data/hora (UTC), página, botão (`header`, `hero`, `sticky`, `final`) e dispositivo (`mobile`/`desktop`, detectado no servidor);
   - é enviado o evento `whatsapp_click` ao `dataLayer` (com `wa_ref` e `wa_button`).

### Configuração no Google Tag Manager (GTM-NR7FQPX)
O código não instala o GA4 nem o Google Ads diretamente: tudo é configurado dentro do GTM.

1. **Consentimento.** A página já envia o *Consent Mode v2* (padrão `denied` e `granted` só após o "Aceitar" no banner). Nas tags do Google, mantenha as verificações de consentimento integradas.
2. **Tag do Google (GA4)** com o ID de medição do GA4, gatilho *Initialization – All Pages*.
3. **Gatilho** do tipo *Evento personalizado* com nome do evento `whatsapp_click`.
4. **GA4 – Evento** com nome `whatsapp_click` e os parâmetros `wa_ref` = `{{DLV - wa_ref}}` e `wa_button` = `{{DLV - wa_button}}` (variáveis da camada de dados). Marque-o como evento principal (conversão) no GA4.
5. **Google Ads – Acompanhamento de conversões**: ID de conversão `{GOOGLE_ADS_CONVERSION_ID_A_DEFINIR}` (o `AW-XXXXXXXXX`) e o rótulo da conversão, com o gatilho `whatsapp_click`.
6. **Vinculador de conversões** (*Conversion Linker*), gatilho *All Pages*.

### Marcar vendas e enviar conversões offline ao Google Ads
Quando a venda for fechada, localize o código (`Ref ...`) recebido no WhatsApp e marque o registro:
```bash
npx wrangler d1 execute nvo-endereco-fiscal --remote --command \
  "UPDATE whatsapp_clicks SET status='vendido', sold_at=strftime('%Y-%m-%dT%H:%M:%SZ','now'), sale_value=1188 WHERE ref_code='K7M2Q'"
```
Periodicamente, gere o CSV no formato do Google Ads:
```bash
node scripts/exportar-conversoes.mjs "Nome da ação de conversão no Google Ads"
```
Em seguida, envie o arquivo `conversoes-offline.csv` em *Google Ads → Metas → Conversões → Uploads*. A ação de conversão precisa ser do tipo *Importação → Cliques*. O Google só aceita cliques de até 90 dias.

Ver os últimos cliques:
```bash
npx wrangler d1 execute nvo-endereco-fiscal --remote --command \
  "SELECT ref_code, gclid, created_at, button, device, status FROM whatsapp_clicks ORDER BY id DESC LIMIT 50"
```
