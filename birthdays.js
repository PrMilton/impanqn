/* Birthdays are derived from Miembros; this module never writes member data. */
(function(root){
 function list(members,date){
  const seen=new Set();
  return members.filter(m=>{
   if(!m.name||['fallecido','trasladado'].includes(m.status))return false;
   const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(m.birthDate||'');if(!match)return false;
   const y=+match[1],month=+match[2],day=+match[3],birth=new Date(y,month-1,day);
   if(y<1900||birth.getFullYear()!==y||birth.getMonth()!==month-1||birth.getDate()!==day||birth>new Date()||month!==date.getMonth()+1)return false;
   const key=m.id||m.name+'|'+m.birthDate;if(seen.has(key))return false;seen.add(key);return true;
  }).sort((a,b)=>a.birthDate.slice(8).localeCompare(b.birthDate.slice(8))||a.name.localeCompare(b.name,'es'));
 }
 function message(members,date){return 'Cumpleaños de '+date.toLocaleDateString('es-AR',{month:'long',year:'numeric'})+' · IMPA Neuquén\n\n'+members.map(m=>'• '+Number(m.birthDate.slice(8))+' — '+m.name).join('\n')+'\n\n¡Acompañemos con cariño y oración a nuestros hermanos en su cumpleaños! Que el Señor bendiga sus vidas.';}
 root.BirthdayModel={list,message};
 if(typeof module!=='undefined')module.exports=root.BirthdayModel;
 if(typeof document==='undefined')return;
 const section=document.createElement('section');section.id='monthly-birthdays';section.className='p-4 border-t dark:border-gray-700';
 document.getElementById('upcoming-events').parentElement.after(section);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 function preview(text){
  document.getElementById('birthday-message-dialog')?.remove();const d=el('dialog');d.id='birthday-message-dialog';d.style.cssText='width:min(560px,94vw);padding:24px;border:1px solid var(--ui-line);border-radius:16px;background:var(--ui-panel,#263445);color:var(--ui-text,#eef2f7)';
  d.append(el('h2','Mensaje para la congregación','text-lg font-bold mb-3'));const area=el('textarea');area.value=text;area.setAttribute('aria-label','Mensaje de cumpleaños');area.className='member-input';area.style.cssText='width:100%;min-height:250px';d.append(area);
  const actions=el('div',null,'flex flex-wrap gap-2 mt-3');
  const copy=el('button','Copiar','px-3 py-2 rounded-lg border');copy.onclick=async()=>{try{await navigator.clipboard.writeText(area.value);copy.textContent='Copiado';}catch{area.focus();area.select();copy.textContent='Seleccionado: copiá el texto';}};
  const share=el('a','Compartir por WhatsApp','px-3 py-2 rounded-lg border');share.target='_blank';share.rel='noopener noreferrer';share.href='https://wa.me/?text='+encodeURIComponent(area.value);area.oninput=()=>share.href='https://wa.me/?text='+encodeURIComponent(area.value);
  const close=el('button','Cerrar','px-3 py-2 rounded-lg border');close.onclick=()=>d.close();actions.append(copy,share,close);d.append(actions);document.body.append(d);d.showModal();
 }
 function render(){
  const date=new Date(currentDate),today=new Date(),items=list(membersRegistry,date);section.replaceChildren();
  const heading=el('h3',null,'font-bold text-blue-800 dark:text-blue-200 mb-3');heading.innerHTML='<i class="fa-solid fa-cake-candles" aria-hidden="true"></i> ';heading.append(document.createTextNode('Cumpleaños de '+date.toLocaleDateString('es-AR',{month:'long'})));section.append(heading);
  if(!window.gestorLoaded){section.append(el('p','Cargando cumpleaños…','text-sm'));return;}
  if(!items.length){section.append(el('p','No hay cumpleaños registrados para este mes.','text-sm'));return;}
  const ul=el('ul',null,'space-y-2');items.forEach(m=>{
   const day=Number(m.birthDate.slice(8)),isToday=date.getFullYear()===today.getFullYear()&&date.getMonth()===today.getMonth()&&day===today.getDate();
   const row=el('li',null,'flex items-center justify-between gap-3 p-2 rounded-lg border dark:border-gray-600');const label=el('div');label.append(el('strong',String(day).padStart(2,'0')+' · '+m.name));if(isToday)label.append(el('span','¡Cumple hoy!','block text-sm text-emerald-600 dark:text-emerald-300'));row.append(label);
   const phone=whatsappNumber(m.phone);if(phone&&phone.length>=10&&phone.length<=15){const a=el('a',null,'inline-flex items-center justify-center rounded-lg text-emerald-600 dark:text-emerald-300');a.style.cssText='min-width:44px;min-height:44px;font-size:22px';a.innerHTML='<i class="fa-brands fa-whatsapp" aria-hidden="true"></i>';a.title='Saludar a '+m.name+' por WhatsApp';a.setAttribute('aria-label',a.title);a.target='_blank';a.rel='noopener noreferrer';a.href='https://wa.me/'+phone+'?text='+encodeURIComponent('¡Feliz cumpleaños, '+m.name+'! Que el Señor bendiga tu vida y te acompañe en este nuevo año. Con cariño, tu familia de IMPA Neuquén.');row.append(a);}else row.append(el('small','Sin teléfono','text-sm'));ul.append(row);
  });section.append(ul);const button=el('button','Generar mensaje para el grupo','w-full mt-3 px-3 py-2 rounded-lg border font-bold no-print');button.onclick=()=>preview(message(items,date));section.append(button);
 }
 const oldEvents=renderUpcomingEvents;renderUpcomingEvents=function(...args){const result=oldEvents.apply(this,args);render();return result;};
 const oldMembers=window.renderMembersRegistry;window.renderMembersRegistry=function(...args){const result=oldMembers.apply(this,args);render();return result;};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});setInterval(render,60000);render();
})(globalThis);
