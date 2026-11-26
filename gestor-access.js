/* Staged access implementation. Requires matching server rules before release. */
(()=>{
 const OWNER='miltong.nqn@gmail.com';
 const configs=[
  {projectId:'formulario-7d5cb',apiKey:'AIzaSyDKUN0hzq3-y3pRSjTDJ0WT-1P2bxZI1Xk'},
  {projectId:'cartelera-pastoral-neuqu-cf1dd',apiKey:'AIzaSyBPNi8h-XNpwyISUoaDe5tjf4SjL0Z3I1o'},
  {projectId:'liturgia-impa-nqn',apiKey:'AIzaSyAepAyu8E0w7RIv167BZd3nhXTW7WeAK5A',databaseURL:'https://liturgia-impa-nqn-default-rtdb.firebaseio.com'}
 ];
 const originalFetch=window.fetch.bind(window);
 let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
 const api={ready,apps:{},allowed:false,owner:false,email:'',logout:async()=>{}};window.GestorAccess=api;
 const css=document.createElement('style');css.textContent='html:not([data-access="ready"]) body{visibility:hidden}#gestor-access-screen{visibility:visible}@media print{.access-controls{display:none!important}}html:not([data-access="ready"]) body>*:not(#gestor-access-screen):not(script):not(style){display:none!important}#gestor-access-screen{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#202938;color:#edf1f8;font:16px system-ui;padding:20px}#gestor-access-screen>section{width:min(440px,100%);padding:30px;border:1px solid #566476;border-radius:18px;background:#293649}#gestor-access-screen button,.access-controls button{padding:12px 18px;border:1px solid #718096;border-radius:9px;background:#344763;color:#fff;cursor:pointer;font:inherit}.access-controls{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:8px 20px;font:14px system-ui}.access-dialog{width:min(640px,94vw);max-height:85vh;overflow:auto;padding:24px;background:#263445;color:#edf1f8;border:1px solid #718096;border-radius:16px}.access-dialog input,.access-dialog button{padding:10px;border:1px solid #718096;border-radius:8px;margin:5px;font:inherit}.access-dialog input{background:#202938;color:#fff}';document.head.append(css);
 function node(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
 async function start(){
  if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
  const screen=node('div');screen.id='gestor-access-screen';const card=node('section'),title=node('h1','Gestión IMPA NQN'),status=node('p','Comprobando acceso…'),login=node('button','Ingresar con Google'),exit=node('button','Cambiar cuenta');login.type=exit.type='button';login.hidden=true;exit.hidden=true;card.append(title,status,login,exit);screen.append(card);document.body.append(screen);
  try{
   // Same-origin embedded editors reuse the parent identity instead of opening
   // independent sign-in windows and accidentally selecting another account.
   if(parent!==window&&parent.GestorAccess){await parent.GestorAccess.ready;Object.assign(api,parent.GestorAccess);screen.remove();document.documentElement.dataset.access='ready';resolveReady();return;}
   const [appSdk,authSdk,firestore,databaseSdk]=await Promise.all(['app','auth','firestore','database'].map(x=>import('https://www.gstatic.com/firebasejs/13.3.0/firebase-'+x+'.js')));
   api.sdk={database:databaseSdk,auth:authSdk,firestore};
   const instances=configs.map(config=>{const app=appSdk.initializeApp({...config,authDomain:config.projectId+'.firebaseapp.com'},'gestor-'+config.projectId);const auth=authSdk.getAuth(app);api.apps[config.projectId]=app;return {app,auth,config};});
   await Promise.all(instances.map(async i=>{await authSdk.setPersistence(i.auth,authSdk.browserLocalPersistence);await i.auth.authStateReady();}));
   const email=()=>instances[0].auth.currentUser?.email?.toLowerCase();
   const db=firestore.getFirestore(instances[0].app);
   api.logout=async()=>{api.allowed=false;await Promise.all(instances.map(i=>authSdk.signOut(i.auth)));for(const key of ['gestor_unified','impa-cloud-published-v1','impa-cloud-draft-v1'])localStorage.removeItem(key);location.reload();};exit.onclick=api.logout;
   async function unlock(){
    const account=email();if(!account)return false;
    if(instances.some(i=>i.auth.currentUser?.email?.toLowerCase()!==account)){status.textContent='Ingresá con Google para completar la conexión de los módulos.';return false;}
    if(instances.some(i=>!i.auth.currentUser.emailVerified||!i.auth.currentUser.providerData.some(p=>p.providerId==='google.com'))){status.textContent='Usá una cuenta de Google con correo verificado.';return false;}
    const owner=account===OWNER;let allowed=owner;
    if(!owner){const doc=await firestore.getDoc(firestore.doc(db,'gestor_access',account));allowed=doc.exists()&&doc.data().active===true;}
    if(!allowed){status.textContent='Tu cuenta todavía no está autorizada. El pastor debe habilitar tu correo.';exit.hidden=false;return false;}
    api.allowed=true;api.email=account;api.owner=owner;
    api.token=async project=>{if(!api.allowed)throw Error('Acceso no autorizado');const auth=instances.find(i=>i.config.projectId===project)?.auth;if(!auth?.currentUser)throw Error('Falta iniciar sesión');return auth.currentUser.getIdToken();};
    if(!owner)firestore.onSnapshot(firestore.doc(db,'gestor_access',account),snap=>{if(!snap.exists()||snap.data().active!==true){api.allowed=false;location.reload();}},()=>{api.allowed=false;location.reload();});
    for(const i of instances)authSdk.onAuthStateChanged(i.auth,user=>{if(api.allowed&&user?.email?.toLowerCase()!==account){api.allowed=false;location.reload();}});
    const controls=node('div');controls.className='access-controls no-print';controls.append(node('span',owner?'Pastor · Administrador':account));if(owner){const manage=node('button','Usuarios');manage.onclick=()=>users(instances,firestore,authSdk);controls.append(manage);}const logout=node('button','Cerrar sesión');logout.onclick=api.logout;controls.append(logout);document.body.prepend(controls);
    screen.remove();document.documentElement.dataset.access='ready';resolveReady();return true;
   }
   const moduleNames=['gestor','encuestas','orden de cultos'];
   function nextConnection(){const account=email();const index=instances.findIndex(i=>!i.auth.currentUser || (account&&i.auth.currentUser.email?.toLowerCase()!==account));return index<0?0:index;}
   function connectionLabel(){const index=nextConnection();login.textContent=index===0?'Ingresar con Google':'Conectar '+moduleNames[index];}
   login.onclick=async()=>{login.disabled=true;const index=nextConnection();status.textContent='Conectando '+moduleNames[index]+' con Google…';try{const provider=new authSdk.GoogleAuthProvider();if(email())provider.setCustomParameters({login_hint:email()});const result=await authSdk.signInWithPopup(instances[index].auth,provider);if(index>0&&result.user.email?.toLowerCase()!==email()){await authSdk.signOut(instances[index].auth);throw Object.assign(Error('Cuenta diferente'),{code:'Elegí la misma cuenta en todos los módulos'});}if(!await unlock())connectionLabel();}catch(error){status.textContent='No se pudo completar el acceso. '+(error.code||'Error de conexión')+' ('+moduleNames[index]+').';exit.hidden=false;}finally{login.disabled=false;}};
   if(!await unlock()){connectionLabel();login.hidden=false;if(!email())status.textContent='Ingresá con tu cuenta de Google autorizada.';}
   async function users(instances,f,g){
    const d=node('dialog');d.className='access-dialog';d.append(node('h2','Usuarios autorizados'));const note=node('p','Solo el administrador puede habilitar o desactivar correos.');d.append(note);const input=node('input');input.type='email';input.placeholder='Correo de Google';input.setAttribute('aria-label','Correo de Google');const add=node('button','Autorizar'),close=node('button','Cerrar'),list=node('div');close.onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.append(input,add,list,close);document.body.append(d);d.showModal();
    async function paint(){list.replaceChildren(node('p','Pastor · '+OWNER+' · Administrador'));const result=await f.getDocs(f.collection(db,'gestor_access'));for(const item of result.docs){if(item.id===OWNER)continue;const row=node('p',item.id+' · '+(item.data().active?'Autorizado':'Desactivado')+' '),button=node('button',item.data().active?'Desactivar':'Autorizar');button.onclick=()=>save(item.id,!item.data().active);row.append(button);list.append(row);}}
    async function save(address,active){
     address=address.trim().toLowerCase();if(!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(address)||address===OWNER){note.textContent='Revisá el correo. La cuenta administradora se conserva.';return;}
     add.disabled=true;note.textContent='Sincronizando permisos de todos los módulos…';
     try{
      // Primary authorization is applied last on activation. On revocation it
      // is removed first. A partial write must never be reported as complete.
      const main=instances[0],survey=instances[1],liturgy=instances[2];
      const write=async i=>f.setDoc(f.doc(f.getFirestore(i.app),'gestor_access',address),{active,updatedBy:OWNER,updatedAt:f.serverTimestamp()});
      if(!active)await write(main);
      await write(survey);
      const key=address.replaceAll('.','%2E'),url=liturgy.config.databaseURL+'/gestorAccess/'+encodeURIComponent(key)+'.json?auth='+encodeURIComponent(await liturgy.auth.currentUser.getIdToken());
      const result=await originalFetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({active,updatedBy:OWNER})});if(!result.ok)throw Error('No se pudo actualizar Orden de Cultos');
      if(active)await write(main);
      note.textContent='Permisos actualizados en los tres proyectos.';input.value='';await paint();
     }catch{note.textContent='No se completó la sincronización de permisos. Reintentá esta misma operación antes de dar el acceso por actualizado.';}finally{add.disabled=false;}
    }
    add.onclick=()=>save(input.value,true);try{await paint();}catch{note.textContent='No se pudieron cargar los usuarios.';}
   }
  }catch{status.textContent='No se pudo comprobar el acceso. Recargá la página o contactá al administrador.';}
 }
 window.fetch=async(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);const project=/^\/v1\/projects\/([^/]+)\//.exec(url.pathname)?.[1];
  if(url.hostname!=='firestore.googleapis.com'||!configs.some(c=>c.projectId===project))return originalFetch(input,options);
  await ready;if(!api.allowed)throw Error('Acceso no autorizado');const headers=new Headers(input instanceof Request?input.headers:undefined);new Headers(options.headers).forEach((v,k)=>headers.set(k,v));headers.set('Authorization','Bearer '+await api.token(project));return originalFetch(input,{...options,headers});
 };
 start();
})();
