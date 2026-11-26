/* Vista de edición para pantallas pequeñas; los borradores no se publican al escribir. */
(()=>{
'use strict';
const api=window.liturgyCompact;if(!api)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={title:'Título',role:'Responsable',label:'Postura indicada',description:'Descripción',phrase:'Frase de conducción',text:'Texto',quote:'Ejemplo / proclamación',note:'Recordatorio',institution:'Institución'};
const keys=kind=>kind==='meta'?['title','institution']:kind==='steps'?['title','role','label','description','phrase']:kind==='principles'?['title','text','quote','note']:['title','text','note'];
const paths={menu:'M4 6h16M4 12h16M4 18h16',add:'M12 4v16M4 12h16',content:'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',style:'M4 20L12 4l8 16M7 14h10',preview:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6',undo:'M9 5L4 10l5 5M4 10h10a6 6 0 0 1 6 6',redo:'M15 5l5 5-5 5M20 10H10a6 6 0 0 0-6 6',header:'M4 5h16M8 5v15M16 5v15',print:'M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6z'};
const faIcons={menu:'bars',add:'plus',content:'list-ul',style:'font',preview:'eye',undo:'rotate-left',redo:'rotate-right',header:'heading',print:'print'};
const icon=n=>'<i class="fa-solid fa-'+(faIcons[n]||faIcons.content)+'" aria-hidden="true"></i>';
const root=document.createElement('section');root.id='compact-editor';root.setAttribute('aria-label','Editor compacto');document.querySelector('#day-workspace').append(root);
const dialog=document.createElement('dialog');dialog.id='compact-dialog';document.body.append(dialog);
const toggle=document.createElement('button');toggle.id='compact-mode';toggle.textContent='Vista compacta';document.querySelector('.appbar').append(toggle);
let manual=false, draft=null, returnFocus=null;
const media=matchMedia('(max-width:900px)');
function mode(){document.body.classList.toggle('compact-mode',manual||media.matches);toggle.textContent=manual?'Vista A4':'Vista compacta';}
toggle.onclick=()=>{manual=!manual;mode();render();};media.addEventListener('change',mode);mode();
function tool(action,title,symbol){return `<button type="button" data-tool="${action}" aria-label="${title}" title="${title}">${icon(symbol)}<span>${title}</span></button>`;}
function render(){
 const opened=new Set([...root.querySelectorAll('details[open]')].map(x=>x.dataset.open));const expanded=root.classList.contains('tools-expanded');
 const {document:d,day,names,stages}=api.read();
 const card=(kind,item,index)=>`<details class="compact-card" data-open="${kind}-${esc(item.id)}"><summary>${index?`<b class="compact-number">${index}</b>`:''}<span>${esc(item.title||'Sin título')}${item.included===false?' <small>Omitido</small>':''}</span></summary><div class="compact-card-body">${keys(kind).filter(k=>item[k]).map(k=>`<button class="compact-field" data-edit="${kind}" data-id="${esc(item.id)}" data-focus="${k}"><small>${labels[k]}</small><span>${esc(item[k])}</span></button>`).join('')}<button data-edit="${kind}" data-id="${esc(item.id)}">Editar contenido y estilo</button>${kind==='steps'?`<div class="compact-actions"><button data-action="up" data-id="${esc(item.id)}" aria-label="Subir ${esc(item.title)}">↑ Subir</button><button data-action="down" data-id="${esc(item.id)}" aria-label="Bajar ${esc(item.title)}">↓ Bajar</button><button data-action="toggle" data-id="${esc(item.id)}">${item.included===false?'Incluir':'Omitir'}</button><button data-action="duplicate" data-id="${esc(item.id)}">Duplicar</button><button data-action="delete" data-id="${esc(item.id)}">Eliminar</button></div>`:''}</div></details>`;
 let number=0;const numbered=d.steps.map(s=>({s,n:s.included===false?'—':String(++number).padStart(2,'0')}));
 root.innerHTML=`<nav class="compact-tools" aria-label="Herramientas del editor">${tool('menu','Expandir herramientas','menu')}${tool('content','Contenido','content')}${tool('add','Añadir momento','add')}${tool('meta','Encabezado','header')}${tool('settings','Tipografía','style')}${tool('undo','Deshacer','undo')}${tool('redo','Rehacer','redo')}${tool('preview','Ver guía','preview')}${tool('print','Imprimir / PDF','print')}</nav><div class="compact-content"><div class="compact-day"><label for="compact-day">Día de culto</label><select id="compact-day">${Object.entries(names).map(([k,v])=>`<option value="${k}" ${k===day?'selected':''}>${v}</option>`).join('')}</select></div><p class="compact-help">Abrí un apartado y tocá el texto para editar.</p><details data-open="principles" class="compact-section"><summary>Principios de conducción</summary>${d.principles.map(p=>card('principles',p)).join('')}<details data-open="instructions" class="compact-section"><summary>Indicaciones para el culto</summary>${d.instructions.map(p=>card('instructions',p)).join('')}</details></details><h2>Orden del culto</h2>${Object.entries(stages).filter(([key])=>numbered.some(({s})=>(s.stage||'pending')===key)).map(([key,title])=>`<details data-open="${key}" class="compact-section"><summary>${esc(title)} <small>${numbered.filter(({s})=>(s.stage||'pending')===key).length} momentos</small></summary>${numbered.filter(({s})=>(s.stage||'pending')===key).map(({s,n})=>card('steps',s,n)).join('')}</details>`).join('')}<p id="compact-status" role="status"></p></div>`;
 for(const el of root.querySelectorAll('details'))el.open=opened.has(el.dataset.open);
 root.querySelector('[data-tool="menu"]').setAttribute('aria-expanded',String(expanded));
 root.querySelector('#compact-day').onchange=e=>api.switchDay(e.target.value);
}
function status(text){root.querySelector('#compact-status').textContent=text;}
function close(){dialog.close();draft=null;returnFocus?.focus();}
function cancel(){if(draft&&JSON.stringify(readForm())!==draft.baseline&&!confirm('¿Descartar los cambios sin guardar?'))return;close();}
function open(kind,id,focus,newItem){
 if(api.locked()){status('Ingresá con tu cuenta autorizada para editar.');return;}
 const snap=api.read(),obj=newItem||(kind==='meta'||kind==='settings'?snap.document[kind]:snap.document[kind].find(x=>x.id===id));
 if(!obj)return;returnFocus=document.activeElement;draft={kind,id,day:snap.day,before:newItem?null:structuredClone(obj),value:structuredClone(obj)};
 const title=kind==='settings'?'Tipografía del documento':kind==='meta'?'Encabezado':obj.title||'Editar contenido';
 const styleFields=k=>{const s=obj.styles?.[k]||{};return `<details class="compact-format"><summary>Formato de ${labels[k].toLowerCase()}</summary><div class="compact-format-grid"><label>Tamaño (pt)<input data-size="${k}" type="number" min="6" max="26" step="0.5" placeholder="Automático" value="${s.size||''}"></label><label>Color<input data-color="${k}" type="color" value="${s.color||'#12394d'}"></label><label><input data-bold="${k}" type="checkbox" ${s.bold?'checked':''}> Negrita</label><label><input data-italic="${k}" type="checkbox" ${s.italic?'checked':''}> Cursiva</label></div><button type="button" data-reset="${k}">Restablecer formato</button></details>`;};
 dialog.innerHTML=`<form id="compact-form"><header><h2 id="compact-dialog-title">${esc(title)}</h2><button type="button" id="compact-close" aria-label="Cerrar edición">×</button></header><div class="compact-edit-body">${['principles','instructions'].includes(kind)?'<p>Estos cambios se aplican a todos los días.</p>':''}${kind==='settings'?Object.entries({body:'Explicaciones',quote:'Frases modelo',principle:'Principios'}).map(([k,v])=>`<label>${v} (pt)<input data-setting="${k}" type="number" min="7" max="16" step="0.1" required value="${obj[k]}"></label>`).join(''):keys(kind).filter(k=>k in obj).map(k=>`<label for="compact-${k}">${labels[k]}</label><textarea id="compact-${k}" data-key="${k}" rows="${['title','role','label'].includes(k)?2:4}" maxlength="${snap.maxText}">${esc(obj[k])}</textarea>${styleFields(k)}`).join('')}${kind==='steps'?`<label>Etapa<select data-property="stage">${Object.entries(snap.stages).map(([k,v])=>`<option value="${k}" ${obj.stage===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Postura (color)<select data-property="posture">${Object.entries({stand:'De pie',sit:'Sentados',kneel:'De rodillas'}).map(([k,v])=>`<option value="${k}" ${obj.posture===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Icono<select data-property="icon">${Object.entries(snap.icons).map(([k,v])=>`<option value="${k}" ${obj.icon===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label><input id="compact-included" type="checkbox" ${obj.included!==false?'checked':''}> Incluir en el culto</label>`:''}<p id="compact-error" role="alert"></p></div><footer><button type="button" id="compact-cancel">Cancelar</button><button class="compact-save" type="submit">Guardar cambios</button></footer></form>`;
 dialog.setAttribute('aria-labelledby','compact-dialog-title');dialog.showModal();
 // La apertura no cambia el modelo, incluso al cancelar sin tocar ningún campo.
 draft.value=readForm();draft.baseline=JSON.stringify(draft.value);
 dialog.querySelector('#compact-close').onclick=cancel;dialog.querySelector('#compact-cancel').onclick=cancel;
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();try{api.save(draft.day,kind,id,draft.before,readForm());close();status('Cambios guardados. Consultá el estado de sincronización.');}catch(error){dialog.querySelector('#compact-error').textContent=error.message;}};
 dialog.querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>{const k=b.dataset.reset;delete draft.value.styles[k];dialog.querySelector(`[data-size="${k}"]`).value='';dialog.querySelector(`[data-color="${k}"]`).value='#12394d';dialog.querySelector(`[data-bold="${k}"]`).checked=false;dialog.querySelector(`[data-italic="${k}"]`).checked=false;});
 if(focus)dialog.querySelector(`[data-key="${focus}"]`)?.focus();
}
function readForm(){
 const value=structuredClone(draft.value);
 dialog.querySelectorAll('[data-key]').forEach(el=>value[el.dataset.key]=el.value);
 dialog.querySelectorAll('[data-setting]').forEach(el=>value[el.dataset.setting]=Number(el.value));
 dialog.querySelectorAll('[data-property]').forEach(el=>value[el.dataset.property]=el.value);
 const included=dialog.querySelector('#compact-included');if(included)value.included=included.checked;
 dialog.querySelectorAll('[data-size]').forEach(el=>{const k=el.dataset.size;value.styles??={};const prev=value.styles[k]||{},color=dialog.querySelector(`[data-color="${k}"]`).value;const s={};if(el.value!=='')s.size=Number(el.value);if(prev.color||color!=='#12394d')s.color=color;if(dialog.querySelector(`[data-bold="${k}"]`).checked)s.bold=true;if(dialog.querySelector(`[data-italic="${k}"]`).checked)s.italic=true;value.styles[k]=s;});return value;
}
dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
window.addEventListener('beforeunload',e=>{if(draft&&JSON.stringify(readForm())!==draft.baseline){e.preventDefault();e.returnValue='';}});
root.onclick=e=>{
 const b=e.target.closest('button');if(!b)return;
 try{
  if(b.dataset.edit){open(b.dataset.edit,b.dataset.id,b.dataset.focus);return;}
  if(b.dataset.action){if(b.dataset.action==='delete'&&!confirm('¿Eliminar este momento? Podés recuperarlo con Deshacer.'))return;api.action(b.dataset.action,b.dataset.id);return;}
  const t=b.dataset.tool;
  if(t==='menu'){const expanded=root.classList.toggle('tools-expanded');b.setAttribute('aria-expanded',String(expanded));b.setAttribute('aria-label',expanded?'Contraer herramientas':'Expandir herramientas');b.querySelector('span').textContent=expanded?'Contraer herramientas':'Expandir herramientas';return;}
  if(t==='content'){root.querySelector('.compact-content').scrollIntoView({behavior:'smooth'});return;}
  if(t==='meta'||t==='settings'){open(t,t);return;}
  if(t==='add'){const item=api.action('add');open('steps',item.id,'title',item);return;}
  if(t==='undo'||t==='redo'){api.action(t);return;}
  if(t==='preview')document.querySelector('#open-viewer').click();
  if(t==='print')document.querySelector('#print').click();
 }catch(error){status(error.message);}
};
window.addEventListener('liturgy-editor-render',render);
render();
})();
