// Cloudflare Pages Function: POST /api/click
// Registra no D1 (binding "DB") cada clique no botão de WhatsApp.
// Não recebe nome, telefone ou e-mail: apenas código curto, gclid, página, botão e tipo de dispositivo.

const MAX_BODY = 2048;
const CODE_RE = /^[A-Z0-9]{4,6}$/;
const GCLID_RE = /^[A-Za-z0-9_-]{1,512}$/;
const PAGE_RE = /^\/[\w\-./]{0,199}$/;
const BUTTON_RE = /^[a-z-]{1,20}$/;

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!data || typeof data !== 'object' || !CODE_RE.test(String(data.code || ''))) {
    return new Response(null, { status: 400 });
  }

  const gclid = typeof data.gclid === 'string' && GCLID_RE.test(data.gclid) ? data.gclid : null;
  const page = typeof data.page === 'string' && PAGE_RE.test(data.page) ? data.page : null;
  const button = typeof data.button === 'string' && BUTTON_RE.test(data.button) ? data.button : null;

  const ua = request.headers.get('User-Agent') || '';
  const mobile = request.headers.get('Sec-CH-UA-Mobile') === '?1' || /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const device = mobile ? 'mobile' : 'desktop';

  if (!env.DB) {
    console.error('Binding D1 "DB" não configurado.');
    return new Response(null, { status: 503 });
  }

  try {
    await env.DB
      .prepare('INSERT INTO whatsapp_clicks (ref_code, gclid, page, button, device) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(data.code, gclid, page, button, device)
      .run();
  } catch (err) {
    console.error('Falha ao gravar clique:', err);
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
