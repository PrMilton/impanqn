/* URLs y visor compartidos por editor y guía. No inserta HTML remoto en la app. */
window.liturgyWeb = (() => {
  function localHttp(url) {
    const ip = url.hostname.split('.').map(Number);
    return url.protocol === 'http:' && /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) &&
      ip.every(n => Number.isInteger(n) && n >= 0 && n <= 255) &&
      (ip[0] === 10 || (ip[0] === 172 && ip[1] >= 16 && ip[1] <= 31) || (ip[0] === 192 && ip[1] === 168));
  }
  function safeUrl(value) {
    if (typeof value !== 'string' || value.length > 2048 || !value.trim()) return '';
    try {
      const url = new URL(value.trim());
      if ((url.protocol !== 'https:' && !localHttp(url)) || url.username || url.password) return '';
      return url.href;
    } catch { return ''; }
  }
  function sharedUrl(document) {
    // Una cadena vacía explícita desactiva el visor, sin rescatar valores antiguos.
    if (Object.prototype.hasOwnProperty.call(document, 'sharedWebUrl')) return safeUrl(document.sharedWebUrl);
    for (const day of ['sabado', 'domingo', 'jueves', 'viernes', 'especial']) {
      const url = safeUrl(document.days?.[day]?.meta?.webUrl);
      if (url) return url;
    }
    return '';
  }
  let currentUrl = '';
  function update(url) {
    const panel = document.querySelector('#web-visor');
    const button = document.querySelector('#web-toggle');
    const safe = safeUrl(url);
    button.hidden = !safe;
    if (currentUrl === safe) return;
    const wasOpen = !panel.hidden;
    currentUrl = safe;
    setOpen(wasOpen && !!safe);
  }
  function setOpen(open) {
    const panel = document.querySelector('#web-visor');
    const button = document.querySelector('#web-toggle');
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Ocultar proyección' : 'Mostrar proyección');
    button.title = open ? 'Ocultar proyección' : 'Mostrar proyección';
      const slot = document.querySelector('#web-frame-slot');
      slot.replaceChildren();
      if (!open || !currentUrl) return;
      const frame = document.createElement('iframe');
      frame.title = 'Página de consulta para el culto';
      const url = new URL(currentUrl);
      // Holyrics necesita su propio origen para consultar la proyección en vivo.
      // Nunca otorgar scripts + same-origin a una página del origen de Liturgia.
      const local = localHttp(url) && url.origin !== location.origin;
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups' + (local ? ' allow-same-origin' : ''));
      if (local) frame.setAttribute('allow', 'local-network ' + url.origin);
      frame.referrerPolicy = 'no-referrer';
      frame.src = currentUrl;
      slot.append(frame);
  }
  function initViewer() {
    document.querySelector('#web-toggle').addEventListener('click', () => {
      setOpen(document.querySelector('#web-visor').hidden && !!currentUrl);
    });
  }
  return {safeUrl, sharedUrl, update, initViewer};
})();
