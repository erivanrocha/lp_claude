// Worker da landing Endereço Fiscal.
// Os arquivos de public/ são servidos direto pelo Cloudflare (static assets);
// o Worker só é executado para caminhos que não existem como arquivo, como /api/click.
import { handleClick } from './click.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/click') {
      if (request.method !== 'POST') {
        return new Response(null, { status: 405, headers: { Allow: 'POST' } });
      }
      return handleClick(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
