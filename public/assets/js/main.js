/* NVO Coworking — Landing Endereço Fiscal */
(function () {
  'use strict';

  // ===== Configuração (edite aqui) =====
  var CONFIG = {
    whatsappNumber: '5584988114949',
    // {codigo} é substituído pelo código curto de rastreio gerado no clique.
    whatsappMessage: 'Olá! Quero contratar o Endereço Fiscal. Ref {codigo}',
    trackEndpoint: '/api/click',
    consentKey: 'nvo_consent',
    gclidKey: 'nvo_gclid'
  };
  // Sem caracteres ambíguos (0/O, 1/I/L).
  var CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var CODE_LENGTH = 5;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function safeGet(storage, key) {
    try { return window[storage].getItem(key); } catch (e) { return null; }
  }
  function safeSet(storage, key, value) {
    try { window[storage].setItem(key, value); } catch (e) {}
  }

  // ===== gclid =====
  // Guardado na sessão para não se perder se o visitante navegar para a política e voltar.
  var GCLID_RE = /^[A-Za-z0-9_-]{1,512}$/;
  var urlGclid = new URLSearchParams(window.location.search).get('gclid');
  if (urlGclid && GCLID_RE.test(urlGclid)) safeSet('sessionStorage', CONFIG.gclidKey, urlGclid);
  function getGclid() {
    var g = safeGet('sessionStorage', CONFIG.gclidKey);
    return g && GCLID_RE.test(g) ? g : null;
  }

  // ===== Código curto de rastreio =====
  function generateCode() {
    var out = '';
    var bytes = new Uint8Array(CODE_LENGTH);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < CODE_LENGTH; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    for (var j = 0; j < CODE_LENGTH; j++) out += CODE_ALPHABET[bytes[j] % CODE_ALPHABET.length];
    return out;
  }

  function whatsappUrl(code) {
    var text = CONFIG.whatsappMessage.replace('{codigo}', code);
    return 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(text);
  }

  function track(code, button) {
    var payload = JSON.stringify({
      code: code,
      gclid: getGclid(),
      page: window.location.pathname,
      button: button
    });
    // text/plain evita preflight de CORS; o servidor faz o parse do JSON.
    var blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
    var sent = false;
    if (navigator.sendBeacon) {
      try { sent = navigator.sendBeacon(CONFIG.trackEndpoint, blob); } catch (e) {}
    }
    if (!sent && window.fetch) {
      fetch(CONFIG.trackEndpoint, { method: 'POST', body: blob, keepalive: true }).catch(function () {});
    }
  }

  // ===== Clique no WhatsApp =====
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-wa]');
    if (!link) return;
    var code = generateCode();
    var button = link.getAttribute('data-wa') || 'desconhecido';
    // Atualiza o href antes da navegação padrão acontecer.
    link.href = whatsappUrl(code);
    track(code, button);
    // Evento de conversão: configurar a tag do Google Ads e do GA4 no GTM com o gatilho "whatsapp_click".
    window.dataLayer.push({ event: 'whatsapp_click', wa_ref: code, wa_button: button });
  });

  // ===== Banner de cookies (Consent Mode v2) =====
  var banner = document.querySelector('.cookie-banner');

  function setConsent(value) {
    var state = value === 'granted' ? 'granted' : 'denied';
    safeSet('localStorage', CONFIG.consentKey, state);
    gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state
    });
    window.dataLayer.push({ event: 'consent_update', consent_state: state });
    hideBanner();
  }
  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    document.documentElement.classList.add('cookie-open');
    updateStickyOffset();
  }
  function hideBanner() {
    if (!banner) return;
    banner.hidden = true;
    document.documentElement.classList.remove('cookie-open');
    updateStickyOffset();
  }

  if (banner) {
    banner.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-consent]');
      if (btn) setConsent(btn.getAttribute('data-consent'));
    });
    var stored = safeGet('localStorage', CONFIG.consentKey);
    if (stored !== 'granted' && stored !== 'denied') showBanner();
  }
  document.querySelectorAll('[data-cookie-settings]').forEach(function (el) {
    el.addEventListener('click', showBanner);
  });

  // ===== Espaço para o botão fixo no mobile =====
  var sticky = document.querySelector('.sticky-cta');
  function updateStickyOffset() {
    var visible = sticky && window.getComputedStyle(sticky).display !== 'none';
    var h = visible ? sticky.offsetHeight : 0;
    document.body.style.setProperty('--sticky-h', h + 'px');
  }
  updateStickyOffset();
  window.addEventListener('resize', updateStickyOffset);
})();
