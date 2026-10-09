// Pages Function: /api/click
// A validação e a gravação no D1 ficam em src/click.js.
import { handleClick } from '../../src/click.js';

export function onRequestPost({ request, env }) {
  return handleClick(request, env);
}

// Qualquer outro método: 405.
export function onRequest() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
