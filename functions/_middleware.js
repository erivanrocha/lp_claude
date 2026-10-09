// Middleware de todas as rotas do Pages.
// Acessos pelo endereço *.pages.dev (produção e previews) são redirecionados (301) para o domínio
// próprio, no mesmo caminho e com a mesma query string (ex.: ?gclid=...).
// O domínio próprio e o desenvolvimento local (localhost) passam direto, sem alteração.

const CANONICAL_ORIGIN = 'https://enderecofiscal.nvocoworking.com.br';
const PAGES_DEV_HOST = 'nvo-endereco-fiscal-pages.pages.dev';

function isPagesDevHost(hostname) {
  return hostname === PAGES_DEV_HOST || hostname.endsWith('.' + PAGES_DEV_HOST);
}

export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  if (isPagesDevHost(url.hostname.toLowerCase())) {
    return new Response(null, {
      status: 301,
      headers: {
        Location: CANONICAL_ORIGIN + url.pathname + url.search,
        // Reforço: o endereço pages.dev nunca deve ser indexado.
        'X-Robots-Tag': 'noindex',
      },
    });
  }

  return next();
}
