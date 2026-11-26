// Configuración pública de la app web. La autorización se aplica en database.rules.json.
const config = {
  apiKey: 'AIzaSyAepAyu8E0w7RIv167BZd3nhXTW7WeAK5A',
  authDomain: 'liturgia-impa-nqn.firebaseapp.com',
  databaseURL: 'https://liturgia-impa-nqn-default-rtdb.firebaseio.com',
  projectId: 'liturgia-impa-nqn',
  appId: '1:102211378295:web:6f69ad5dc4313c3e973a72'
};
const CACHE = 'impa-cloud-published-v1';
const DRAFT = 'impa-cloud-draft-v1';
const editor = window.liturgyEditor;
const viewer = window.liturgyViewer;
const status = document.querySelector('#cloud-status');
const message = text => { if (status) status.textContent = text; };
const writeLocal = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
};
const readLocal = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const content = document => JSON.stringify({version:2, days:document.days, sharedWebUrl:document.sharedWebUrl, liturgyRevision:document.liturgyRevision ?? 3, qualityRevision:document.qualityRevision ?? 1});
function decode(value) {
  if (!value || !Number.isInteger(value.revision) || value.revision < 1 || typeof value.payload !== 'string' || value.payload.length > 1000000) throw Error('Datos compartidos inválidos');
  const parsed = JSON.parse(value.payload);
  if (parsed.version !== 2 || !parsed.days) throw Error('Guía incompatible');
  return parsed;
}
if (viewer) {
  const cached = readLocal(CACHE);
  if (cached) { try { viewer.apply(decode(cached)); } catch {} }
}

async function start() {
  const [{initializeApp}, database] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js')
  ]);
  const app = initializeApp(config);
  const db = database.getDatabase(app);
  const shared = database.ref(db, 'public/liturgy');
  let notices = {setAuthorized(){}};
  try {
    const {startNotices} = await import('./live-notices.js?v=neon-1');
    notices = startNotices({database, db, editor, viewer});
  } catch (error) {
    const note = document.querySelector('#notice-editor-status');
    if (note) note.textContent = 'No se pudieron cargar los avisos. Recargá la página.';
    const bell = document.querySelector('#notice-bell');
    if (bell) { bell.disabled = true; bell.setAttribute('aria-label','Avisos no disponibles. Recargá la página.'); }
    console.error('Avisos no disponibles:', error.message);
  }
  if (viewer) {
    database.onValue(shared, snapshot => {
      try {
        if (!snapshot.exists()) { message('La guía compartida aún no fue publicada.'); return; }
        const value = snapshot.val();
        viewer.apply(decode(value));
        writeLocal(CACHE, value);
        message('');
      } catch { message('No se pudo actualizar la guía. Se conserva la última versión disponible.'); }
    }, () => message('No se pudo conectar. Se muestra la última guía disponible.'));
    database.onValue(database.ref(db, '.info/connected'), snapshot => {
      if (!snapshot.val()) message('Sin conexión en tiempo real. Se muestra la última guía disponible.');
      else message('');
    });
    return;
  }
  if (!editor) return;
  const authSdk = await import('https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js');
  const auth = authSdk.getAuth(app);
  auth.languageCode = 'es';
  const login = document.querySelector('#cloud-login');
  const logout = document.querySelector('#cloud-logout');
  const publish = document.querySelector('#cloud-publish');
  const reload = document.querySelector('#cloud-reload');
  const restore = document.querySelector('#cloud-restore');
  let user = null, latest = null, ready = false, connected = false;
  let revision = 0, baseline = '', pending = null, saving = false, conflict = false, timer;
  let initialBackup = false;
  const authorized = () => user?.email === 'miltong.nqn@gmail.com' && user.emailVerified;
  function access() {
    const allowed = authorized();
    notices.setAuthorized(!!allowed);
    login.hidden = !!user; logout.hidden = !user;
    publish.hidden = !(allowed && ready && !latest);
    reload.hidden = !conflict;
    restore.hidden = !(allowed && ready && latest && !pending && !conflict && readLocal(DRAFT));
    editor.lock(!allowed || !ready || !latest || conflict);
  }
  function show() {
    access();
    if (!user) return message('Ingresá con Google para editar y sincronizar.');
    if (!authorized()) return message('Esta cuenta no tiene permiso para editar.');
    if (conflict) return message('Hay otra versión compartida. Tu borrador está conservado; cargá la versión actual para continuar.');
    if (!ready) return message('Cargando guía compartida…');
    if (!latest) return message('Publicá la guía de este navegador para iniciar la sincronización.');
    if (saving) return message(connected ? 'Sincronizando…' : 'Sin conexión · cambios pendientes de sincronizar.');
    if (pending) return message(connected ? 'Cambios pendientes de sincronizar…' : 'Sin conexión · borrador guardado en este equipo.');
    return message(connected ? 'Sincronizado · los ministros reciben los cambios en tiempo real.' : 'Sin conexión · se muestra la última versión recibida.');
  }
  function backup() {
    if (!initialBackup) {
      initialBackup = writeLocal('impa-before-cloud-' + Date.now(), editor.snapshot());
      if (!initialBackup) throw Error('No se pudo preservar el contenido local');
    }
  }
  function adopt(value) {
    backup();
    editor.apply(decode(value));
    revision = value.revision;
    baseline = content(editor.snapshot());
    writeLocal(CACHE, value);
  }
  function keepDraft() {
    if (!pending) return;
    if (!writeLocal(DRAFT, {payload:pending, baseRevision:revision, savedAt:Date.now()})) {
      message('No se pudo guardar el borrador local. No cierres esta pestaña.');
    }
  }
  window.liturgyCloudChanged = document => {
    if (!authorized() || !ready || !latest || conflict) return;
    const payload = content(document);
    if (!saving && payload === baseline) {
      pending = null;
      try { localStorage.removeItem(DRAFT); } catch {}
    } else { pending = payload; keepDraft(); }
    clearTimeout(timer); timer = setTimeout(flush, 600); show();
  };
  async function flush() {
    if (!pending || saving || conflict || !authorized() || !ready || !connected) return;
    const payload = pending, expected = revision;
    if (payload.length > 1000000) { message('La guía supera el tamaño permitido. Reducí el contenido antes de sincronizar.'); return; }
    saving = true; show();
    try {
      const result = await database.runTransaction(shared, current => {
        if ((current?.revision || 0) !== expected) return;
        return {payload, revision:expected + 1, updatedAt:database.serverTimestamp()};
      }, {applyLocally:false});
      if (!result.committed) { conflict = true; keepDraft(); }
      else {
        latest = result.snapshot.val(); revision = latest.revision; baseline = payload;
        writeLocal(CACHE, latest);
        if (pending === payload) {
          pending = null;
          try { localStorage.removeItem(DRAFT); } catch {}
        } else keepDraft();
      }
    } catch (error) {
      keepDraft();
      message('No se pudo sincronizar. Conservamos tu borrador; comprobá la conexión y tu sesión.');
      console.error('No se pudo guardar en Firebase:', error.code || error.message);
      saving = false; access(); return;
    }
    saving = false; show();
    if (pending && !conflict) timer = setTimeout(flush, 600);
  }
  database.onValue(shared, snapshot => {
    latest = snapshot.val(); ready = true;
    if (latest && !saving) {
      try {
        if (pending && latest.revision !== revision) { conflict = true; keepDraft(); }
        else if (!pending && latest.revision !== revision) adopt(latest);
      } catch { conflict = true; message('No se pudo cargar la guía compartida. Tu contenido local permanece intacto.'); access(); return; }
    }
    show();
  }, () => { ready = false; editor.lock(true); message('No se pudo leer Firebase. Revisá la conexión o los permisos.'); });
  database.onValue(database.ref(db, '.info/connected'), snapshot => {
    connected = snapshot.val() === true; show(); if (connected) flush();
  });
  authSdk.onAuthStateChanged(auth, current => { user = current; show(); if (authorized()) flush(); });
  login.onclick = async () => {
    login.disabled = true;
    try {
      const provider = new authSdk.GoogleAuthProvider();
      provider.setCustomParameters({prompt:'select_account'});
      await authSdk.signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Acceso Google:', error.code || error.message);
      const explanations = {
        'auth/popup-blocked': 'Permití la ventana de Google y volvé a ingresar.',
        'auth/unauthorized-domain': 'Este dominio aún no está autorizado para ingresar. Probá nuevamente en unos minutos.',
        'auth/popup-closed-by-user': 'La ventana de Google se cerró antes de terminar. Volvé a ingresar.',
        'auth/network-request-failed': 'No se pudo contactar con Google. Revisá la conexión y volvé a ingresar.'
      };
      message(explanations[error.code] || 'No se completó el acceso con Google. Podés volver a intentarlo.');
    } finally { login.disabled = false; }
  };
  logout.onclick = async () => {
    if (pending || saving) { message('Esperá a que termine la sincronización antes de salir.'); return; }
    await authSdk.signOut(auth);
  };
  publish.onclick = async () => {
    if (!authorized() || !ready || latest) return;
    backup(); pending = content(editor.snapshot()); keepDraft(); await flush();
    if (latest && !pending) { revision = latest.revision; baseline = content(editor.snapshot()); show(); }
  };
  reload.onclick = () => {
    if (!latest || saving) return;
    keepDraft(); pending = null; conflict = false;
    try { adopt(latest); show(); } catch { conflict = true; show(); }
  };
  restore.onclick = () => {
    const draft = readLocal(DRAFT);
    if (!draft || !authorized() || saving) return;
    if (draft.baseRevision !== revision) { message('El borrador pertenece a una versión anterior. Descargalo para recuperar sus textos sin reemplazar la guía actual.'); return; }
    try { editor.apply(JSON.parse(draft.payload)); pending = content(editor.snapshot()); keepDraft(); show(); flush(); }
    catch { message('No se pudo recuperar ese borrador.'); }
  };
  document.querySelector('#cloud-download').onclick = () => {
    const draft = readLocal(DRAFT) || {payload:content(editor.snapshot())};
    const url = URL.createObjectURL(new Blob([draft.payload], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'liturgia-respaldo.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.addEventListener('beforeunload', event => {
    if (pending || saving) { keepDraft(); event.preventDefault(); event.returnValue = ''; }
  });
}
start().catch(error => {
  if (editor) editor.lock(true);
  message('No se pudo conectar con Firebase. Revisá internet y recargá la página.');
  console.error('Firebase no disponible:', error.code || error.message);
});
