// Canal independiente: enviar un aviso nunca reemplaza el contenido del culto.
const NOTICE_PATH = 'public/urgentNotice';
const TTL = 2 * 60 * 60 * 1000;
const ACK = 'impa-urgent-notice-read-v1';
export function validNotice(value) {
  return !!value && typeof value.id === 'string' && /^[\w-]{1,80}$/.test(value.id)
    && typeof value.text === 'string' && value.text.trim().length > 0 && value.text.length <= 500
    && typeof value.active === 'boolean' && Number.isFinite(value.createdAt);
}
export function startNotices({database, db, editor, viewer}) {
  const $ = selector => document.querySelector(selector);
  const bell = $('#notice-bell'), dialog = $('#notice-dialog');
  const input = $('#notice-text'), send = $('#notice-send'), withdraw = $('#notice-withdraw');
  if (!bell && !send) return {setAuthorized(){}};
  let value = null, ready = false, connected = false, allowed = false, busy = false;
  let offset = 0, expiryTimer, displayedId = null, error = '', feedback = '';
  let acknowledgement = null;
  const now = () => Date.now() + offset;
  const current = () => ready && validNotice(value) && value.active && value.createdAt + TTL > now() ? value : null;
  const acknowledgeId = () => {
    if (acknowledgement) return acknowledgement;
    try { return localStorage.getItem(ACK); } catch { return null; }
  };
  function closeDialog() {
    if (dialog?.open) dialog.close();
    displayedId = null;
  }
  function acknowledge() {
    if (displayedId) {
      acknowledgement = displayedId;
      try { localStorage.setItem(ACK, displayedId); } catch {}
    }
    closeDialog(); render();
  }
  function showDialog(notice) {
    dialog.classList.toggle('is-urgent', !!notice);
    $('#notice-dialog-title').textContent = notice ? 'Aviso urgente' : 'Avisos';
    $('#notice-dialog-text').textContent = notice ? notice.text : !connected ? 'Sin conexión. No se pueden comprobar nuevos avisos.' : !ready ? 'Consultando avisos…' : error || 'No hay avisos vigentes.';
    $('#notice-dialog-time').textContent = notice ? 'Enviado a las ' + new Date(notice.createdAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}) : '';
    $('#notice-understood').textContent = notice ? 'Entendido' : 'Cerrar';
    displayedId = notice?.id || null;
    if (!dialog.open) dialog.showModal();
  }
  function render() {
    clearTimeout(expiryTimer);
    const notice = current();
    if (notice) expiryTimer = setTimeout(render, Math.max(1, notice.createdAt + TTL - now() + 20));
    if (viewer) {
      const unread = notice && acknowledgeId() !== notice.id;
      $('#notice-dot').hidden = !unread;
      bell.setAttribute('aria-label', unread ? 'Avisos: tenés un aviso nuevo' : 'Ver avisos urgentes');
      bell.classList.toggle('has-notice', !!unread);
      if (displayedId && (!notice || notice.id !== displayedId)) closeDialog();
      if (notice && unread && connected) showDialog(notice);
      return;
    }
    input.disabled = !allowed || busy;
    send.disabled = !allowed || !connected || !ready || busy || !input.value.trim();
    withdraw.disabled = !allowed || !connected || !ready || busy || !notice;
    $('#notice-count').textContent = input.value.length + '/500';
    $('#notice-current').textContent = notice ? notice.text : 'Sin aviso vigente.';
    $('#notice-editor-status').textContent = !allowed ? 'Ingresá con tu cuenta autorizada para enviar avisos.'
      : busy ? (connected ? 'Enviando…' : 'Sin conexión · envío pendiente. No cierres esta pestaña.')
      : !connected ? 'Sin conexión. Los avisos requieren internet.'
      : error || feedback || (!ready ? 'Consultando avisos…' : notice ? 'Aviso vigente para todos los ministros.' : 'Listo para enviar a todos los ministros.');
  }
  function subscribe() {
    database.onValue(database.ref(db, NOTICE_PATH), snapshot => {
      value = snapshot.val(); ready = true; error = ''; render();
    }, () => {
      value = null; ready = false;
      error = 'No se pudieron consultar los avisos. Recargá la página para reintentar.'; render();
    });
    render();
  }
  database.onValue(database.ref(db,'.info/serverTimeOffset'), snapshot => { offset = Number(snapshot.val()) || 0; render(); });
  database.onValue(database.ref(db,'.info/connected'), snapshot => { connected = snapshot.val() === true; render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  if (viewer) {
    bell.onclick = () => showDialog(current());
    $('#notice-understood').onclick = acknowledge;
    dialog.addEventListener('cancel', event => { event.preventDefault(); acknowledge(); });
    window.addEventListener('storage', event => { if (event.key === ACK) { acknowledgement = null; closeDialog(); render(); } });
  } else {
    input.oninput = () => { feedback = ''; render(); };
    send.onclick = async () => {
      const text = input.value.trim();
      if (!allowed || !ready || !connected || busy || !text || text.length > 500) return;
      busy = true; feedback = ''; error = ''; render();
      try {
        await database.set(database.ref(db, NOTICE_PATH), {
          id: crypto.randomUUID(), text, active: true, createdAt: now()
        });
        input.value = ''; feedback = 'Aviso publicado para todos los ministros. Esto no confirma que todos lo hayan leído.';
      } catch { error = 'No se pudo publicar el aviso. El texto sigue disponible para reintentar.'; }
      finally { busy = false; render(); }
    };
    withdraw.onclick = async () => {
      const notice = current();
      if (!notice || !allowed || !ready || !connected || busy) return;
      busy = true; feedback = ''; error = ''; render();
      try {
        const result = await database.runTransaction(database.ref(db, NOTICE_PATH), latest => {
          if (!latest || latest.id !== notice.id) return;
          return {...latest, active:false};
        }, {applyLocally:false});
        feedback = result.committed ? 'Aviso retirado.' : 'El aviso cambió desde otro equipo. Revisá el aviso vigente.';
      } catch { error = 'No se pudo retirar el aviso. Volvé a intentarlo.'; }
      finally { busy = false; render(); }
    };
    window.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } });
  }
  subscribe();
  return {setAuthorized(value) { allowed = value === true; render(); }};
}
