# Landing Page — Endereço Fiscal em Natal (NVO Coworking)

Página única em HTML, CSS e JS puros, publicada no **Cloudflare Pages**, com uma **Pages Function** que grava os cliques no botão de WhatsApp no **Cloudflare D1**.

## Estrutura

```
public/                         → tudo o que é publicado (diretório de saída do Pages)
  index.html                    → landing page
  politica-de-privacidade.html  → Política de Privacidade (/politica-de-privacidade)
  404.html
  assets/css/style.css
  assets/js/main.js             → WhatsApp + código de rastreio + gclid + banner de cookies
  assets/logo/*.svg             → 6 variações do logo (vertical/horizontal × colorida/branca/negativa)
  assets/fonts/                 → Outfit (OFL), self-hosted
  _headers, robots.txt, sitemap.xml, favicon.svg
functions/api/click.js          → POST /api/click → grava no D1
migrations/0001_whatsapp_clicks.sql
scripts/exportar-conversoes.mjs → gera o CSV de conversões offline para o Google Ads
wrangler.toml
```

## Pendências (SUBSTITUIR QUANDO DISPONÍVEL)

| Item | Onde |
|---|---|
| Fotos reais (hero + galeria: fachada, recepção, vista, sala de reunião) | `public/index.html`: procure por `SUBSTITUIR QUANDO DISPONÍVEL` (há um exemplo de `<picture>`/`<img>` pronto no comentário). Salve as imagens em `public/assets/img/` em WebP/AVIF, com 800 e 1200 px de largura. |
| Imagem de compartilhamento (`og:image`, 1200×630) | `<head>` do `index.html` |
| 3 depoimentos (com autorização por escrito) | Bloco comentado `DEPOIMENTOS` no `index.html` |
| ID de conversão do Google Ads (`{GOOGLE_ADS_CONVERSION_ID_A_DEFINIR}`) | Configurado no GTM (ver abaixo), não no código |
| ID do banco D1 | `wrangler.toml` → `database_id` |
| SVG oficial do logo (exportado do Illustrator) | Substituir os arquivos em `public/assets/logo/`, mantendo os mesmos nomes |
| Variações do título (teste A/B) | `<h1>` do `index.html` |

Contatos, número do WhatsApp e texto da mensagem ficam no topo de `public/assets/js/main.js` (`CONFIG`). O número também aparece nos `href` dos botões no HTML: eles servem de reserva caso o JavaScript não carregue.

## Publicação no Cloudflare

Pré-requisito: Node.js 18+ e uma conta Cloudflare.

1. **Criar o banco D1**
   ```bash
   npx wrangler login
   npx wrangler d1 create nvo-endereco-fiscal
   ```
   Copie o `database_id` exibido para o `wrangler.toml`.
2. **Criar a tabela**
   ```bash
   npx wrangler d1 migrations apply nvo-endereco-fiscal --remote
   ```
3. **Criar o projeto no Pages.** No painel Cloudflare, vá em *Workers & Pages → Create → Pages → Connect to Git*, escolha o repositório `erivanrocha/lp_claude` e configure:
   - Framework preset: *None*
   - Build command: *(vazio)*
   - Build output directory: `public`
4. **Ligar o D1 ao projeto** (caso o painel não leia o `wrangler.toml`): *Settings → Bindings → Add → D1 database*, com a variável `DB` apontando para o banco `nvo-endereco-fiscal`.
5. **Domínio.** Em *Custom domains*, adicione `enderecofiscal.nvocoworking.com.br`. No **Registro.br**, crie um registro **CNAME** `enderecofiscal` apontando para o endereço `*.pages.dev` do projeto.
6. **(Recomendado) Limite de requisições.** Em *Security → WAF → Rate limiting rules*, limite `POST /api/click` (ex.: 20 por minuto por IP) para evitar registros de lixo.

Para testar localmente:
```bash
npx wrangler d1 migrations apply nvo-endereco-fiscal --local
npx wrangler pages dev
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
