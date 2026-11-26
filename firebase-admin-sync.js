import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithRedirect,getRedirectResult,signOut} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {doc,getFirestore,setDoc} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';

const config={apiKey:'AIzaSyBPNi8h-XNpwyISUoaDe5tjf4SjL0Z3I1o',authDomain:'cartelera-pastoral-neuqu-cf1dd.firebaseapp.com',projectId:'cartelera-pastoral-neuqu-cf1dd',storageBucket:'cartelera-pastoral-neuqu-cf1dd.firebasestorage.app',messagingSenderId:'117860342876',appId:'1:117860342876:web:e14d816a7fe1ed15d85a99'};
await window.GestorAccess.ready;
const app=window.GestorAccess.apps[config.projectId],auth=getAuth(app),db=getFirestore(app),button=document.getElementById('firebaseBtn'),status=document.getElementById('firebaseStatus');
let timer=null,syncing=false;
function setStatus(text,ok=false){status.textContent=text;status.style.color=ok?'#86efac':''}
async function syncNow(){if(!window.GestorAccess.allowed||!auth.currentUser||syncing||!window.getPublicCarteleraData)return;syncing=true;setStatus('Sincronizando…');try{const data=window.getPublicCarteleraData();await setDoc(doc(db,'public','cartelera'),{payload:JSON.stringify(data)});setStatus('Sincronizado ahora',true)}catch(error){console.error(error);setStatus('No se pudo sincronizar')}finally{syncing=false}}
window.queueFirebasePublicSync=()=>{if(!auth.currentUser)return;clearTimeout(timer);timer=setTimeout(syncNow,700)};
button.addEventListener('click',syncNow);
onAuthStateChanged(auth,user=>{if(window.GestorAccess.allowed&&user?.emailVerified){button.textContent='Sincronizar';setStatus('Conectado · guardado automático',true)}else{button.disabled=true;setStatus('Sin conexión')}});
