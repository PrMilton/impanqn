(()=>{
 const icons={inicio:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',cultos:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/>',congregacion:'<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M3 7a3 3 0 0 0 0 6m18-6a3 3 0 0 1 0 6M1 21v-3m22 3v-3"/>',contabilidad:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h2m3 0h3m-8 4h2m3 0h3"/>',recursos:'<path d="M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-1-6-2-10 1zm0 0v15"/>'};
 const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[k]||icons.inicio}</svg>`;
 const areas={cultos:{title:'Cultos y organización',color:'var(--ui-blue)',tabs:[['cartelera','Cartelera'],['liturgia','Orden de Culto'],['peticiones','Peticiones'],['organizacion','Organización']]},congregacion:{title:'Congregación',color:'var(--ui-blue)',tabs:[['miembros','Miembros'],['personal','Personal'],['cerca','Mapa']]},contabilidad:{title:'Contabilidad',color:'var(--ui-blue)',tabs:[['mayordomia','Movimientos y cuotas']]},recursos:{title:'Recursos',color:'var(--ui-blue)',tabs:[['rituales','Ritual']]}};
 const localDay=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const main=document.querySelector('body>main'),originalSwitch=switchTab;
 let waitingRoute=null;
 let area='inicio',tab='',activity=localDay(new Date()),financeVisible=true,internalNavigation=false;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sidebar=document.createElement('aside');sidebar.id='dash-sidebar';sidebar.innerHTML=`<div id="dash-brand"><img src="logo.png" alt=""><div><strong>IMPA</strong><small>NEUQUÉN</small></div></div><nav aria-label="Áreas del gestor"><button data-area="inicio" title="Inicio">${icon('inicio')}<span>Inicio</span></button>${Object.entries(areas).map(([k,a])=>`<button data-area="${k}" title="${a.title}">${icon(k)}<span>${a.title}</span></button>`).join('')}</nav><div class="sidebar-foot"><button id="dash-collapse" aria-label="Plegar menú" aria-expanded="true"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5h16M4 12h16M4 19h16"/></svg><span>Plegar menú</span></button></div>`;
 document.body.prepend(sidebar);
 const menuState=()=>{sidebar.inert=innerWidth<=760&&!document.body.classList.contains('dash-mobile-open');};
 new MutationObserver(menuState).observe(document.body,{attributes:true,attributeFilter:['class']});window.addEventListener('resize',menuState);menuState();
 const shell=document.createElement('div');shell.innerHTML=`<header id="dash-top"><button id="dash-menu" aria-label="Abrir menú" aria-expanded="false">☰</button><div><h1 id="dash-title">Resumen general</h1><p id="dash-subtitle">Lo importante, en un vistazo.</p></div><button id="dash-sync" title="Sincronizar ahora">↻ Actualizar</button><button id="dash-theme" aria-label="Alternar tema claro u oscuro">◐</button><button id="dash-print" hidden>Imprimir cartelera</button><span class="dash-status">Consultando datos…</span></header><nav id="dash-subnav" aria-label="Secciones del área" hidden></nav><div id="dash-context" hidden><label>Actividad <input id="dash-date" type="date" value="${activity}"></label><span id="dash-date-detail">Cartelera por fecha · Liturgia conserva su guía compartida por día.</span><button id="dash-open-order">Abrir orden del día</button></div><section id="dashboard-home" aria-label="Resumen de las cuatro áreas"><div class="dash-grid">${Object.entries(areas).map(([k,a])=>`<button class="dash-card" data-area="${k}" aria-label="Abrir ${a.title}"><h2>${icon(k)}${a.title}</h2><div id="dash-summary-${k}"></div><span class="open">Abrir área</span></button>`).join('')}</div></section><section id="dash-restricted" hidden></section>`;
 main.prepend(shell);
 const summary=(key,label,title,lead,detail)=>{document.getElementById('dash-summary-'+key).innerHTML=`<div class="eyebrow">${esc(label)}</div><h3>${esc(title)}</h3><p class="lead">${esc(lead)}</p><div class="detail">${esc(detail)}</div>`;};
 const remote={};let loading=false,lastRead=0;
 const dayName=date=>['domingo','especial','especial','especial','jueves','viernes','sabado'][new Date(date+'T12:00:00').getDay()];
 function orderUrl(){return 'editor-liturgia.html?'+new URLSearchParams({activity,dia:dayName(activity),fecha:activity,volver:'nqn.html'});}
 async function readDocument(url,collection=false){
  const documents=[];let token='';
  do{const u=new URL(url);if(collection){u.searchParams.set('pageSize','100');if(token)u.searchParams.set('pageToken',token);}
   const r=await fetch(u,{signal:AbortSignal.timeout(15000)});
   if(r.status===404)return collection?[]:null;
   if(!r.ok)throw Error('No disponible');const d=await r.json();
   if(!collection)return d;documents.push(...(d.documents||[]));token=d.nextPageToken||'';
  }while(token);return documents;
 }
 async function loadSummaries(force=false){
  if(loading||(!force&&Date.now()-lastRead<15000))return;loading=true;lastRead=Date.now();
  const base=BASE_URL.replace(/congregacion_data\/mainData$/,'');
  await Promise.allSettled([
   ['petitions',base+'artifacts?key='+API_KEY,true],
   ['map',base+'congregacion_data/mapOrganization?key='+API_KEY],
   ['accounting',base+'impa_accounting/globalData?key='+API_KEY],
   ['ritual',base+'ritual_versions?key='+API_KEY,true]
  ].map(async([key,url,collection])=>{try{remote[key]={ok:true,data:await readDocument(url,collection)};}catch{remote[key]={ok:false};}}));
  loading=false;refresh();
 }
 function refresh(){
  const status=window.dashboardMainStatus;
  document.querySelector('.dash-status').textContent=status==='success'?'Gestor · datos actuales':status==='error'?'Sin conexión · revisar sincronización':status==='loading'?'Consultando datos…':'Guardado pendiente';
  const available=status==='success';
  if(available){
   // A future saved activity is preferable to assuming an unsaved weekly event exists.
   const dates=[...new Set(Object.keys(assignments).map(k=>k.match(/^(\d{4}-\d{2}-\d{2})_/ )?.[1]).filter(d=>d&&d>=localDay(new Date())))].sort();
   const date=dates.find(d=>['_coord','_pred','_event_type','_event_name','_min'].some(k=>assignments[d+k]));
   const names=date?['_coord','_pred','_min'].map(k=>assignments[date+k]).filter(Boolean):[];
   const petitions=remote.petitions;
   const p=petitions?.ok?`${petitions.data.length} peticiones registradas`:(petitions?'Peticiones: no se pudo consultar':'Consultando peticiones…');
   summary('cultos',date?new Date(date+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}):'Sin próximas asignaciones',date?(assignments[date+'_event_name']||'Próximo culto registrado'):'Preparar próximos cultos',names.length?'Responsables: '+[...new Set(names)].join(' · '):'Consultá la programación y asigná responsables.',p+'\nOrden de culto · abrir para revisar la guía compartida');
   const incomplete=membersRegistry.filter(m=>!m.birthDate||!m.membershipCategory).length;
   const teams=window.GestorCerca?.personnel()||[];
   let mapText='Consultando organización…';
   if(remote.map){if(!remote.map.ok)mapText='Mapa: no se pudo consultar';else try{const data=JSON.parse(remote.map.data?.fields?.mapData?.stringValue||'{}');mapText=`${(data.tasks||[]).length} tareas · ${(data.transportPlans||[]).length} planes de traslado guardados`;}catch{mapText='Mapa: revisar formato de datos';}}
   summary('congregacion','Miembros y organización',membersRegistry.length?`${membersRegistry.length} miembros`:'Todavía no hay miembros',incomplete?`${incomplete} fichas sin fecha de nacimiento o categoría`:'Datos básicos completos',`${teams.filter(t=>t.members?.length).length} equipos con integrantes\n${mapText}`);
  }else{
   summary('cultos','Cartelera',status==='error'?'No se pudo actualizar':'Consultando programación…','Abrí el área para revisar la sincronización.','');
   summary('congregacion','Miembros',status==='error'?'Sin conexión confirmada':'Consultando padrón…','Los datos existentes se conservan.','');
  }
  const accounting=remote.accounting,month=localDay(new Date()).slice(0,7);
  if(!accounting||!accounting.ok)summary('contabilidad','Período actual',accounting?'Resumen no disponible':'Consultando movimientos…','Abrí Contabilidad para revisar su estado.','');
  else try{
   const data=JSON.parse(accounting.data?.fields?.dataStr?.stringValue||'{}'),m=data[month];
   const income=(m?.debe||[]).reduce((s,r)=>s+(Number(r.amount)||0),0),expense=(m?.haber||[]).reduce((s,r)=>s+(Number(r.amount)||0),0);
   const rows=[...(m?.debe||[]),...(m?.haber||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
   const money=x=>x.toLocaleString('es-AR',{style:'currency',currency:'ARS'});
   summary('contabilidad',new Date().toLocaleDateString('es-AR',{month:'long',year:'numeric'}),m?money((Number(m.saldoAnterior)||0)+income-expense):'Sin movimientos en el período',m?`Ingresos ${money(income)} · Egresos ${money(expense)}`:'Ingresos, egresos y cuotas.',rows.length?rows.length+' movimientos · '+rows.slice(0,2).map(r=>r.description||r.concept||'Movimiento').join(' · '):'Sin movimientos registrados este mes.');
  }catch{summary('contabilidad','Período actual','Revisar datos contables','No se pudo interpretar el resumen.','');}
  const ritual=remote.ritual;
  summary('recursos','Herramienta disponible','Ritual','Consulta y preparación de ceremonias.',ritual?.ok?(ritual.data.length?`${ritual.data.length} versiones personales guardadas`:'Sin versiones personales guardadas'):ritual?'No se pudieron consultar las versiones':'Consultando versiones…');
 }
 function route(next,nextTab,push=true){
  area=areas[next]?next:'inicio';tab=areas[area]?.tabs.some(([k])=>k===nextTab)?nextTab:areas[area]?.tabs[0][0]||'';
  document.documentElement.style.setProperty('--area',areas[area]?.color||'var(--ui-blue)');
  document.getElementById('dash-title').textContent=areas[area]?.title||'Resumen general';document.getElementById('dash-subtitle').textContent=area==='inicio'?'Lo importante, en un vistazo.':({cultos:'Preparar, coordinar y acompañar.',congregacion:'Una comunidad, una misma información.',contabilidad:'Administración y cuidado de los recursos.',recursos:'Herramientas para el ministerio.'})[area];
  document.querySelectorAll('#dash-sidebar [data-area]').forEach(b=>b.setAttribute('aria-current',b.dataset.area===area?'page':'false'));
  const nav=document.getElementById('dash-subnav');nav.hidden=area==='inicio';nav.innerHTML=(areas[area]?.tabs||[]).map(([k,t])=>`<button data-tab="${k}" aria-current="${k===tab?'page':'false'}">${t}</button>`).join('');
  document.getElementById('dash-context').hidden=area!=='cultos';
  const home=document.getElementById('dashboard-home');home.hidden=area!=='inicio';document.getElementById('dash-restricted').hidden=true;
  if(area!=='inicio'&&!(area==='contabilidad'&&!financeVisible)){
   if(!window.dashboardLoaded&&['miembros','personal','cerca','organizacion','cartelera'].includes(tab)){waitingRoute=[next,nextTab];document.querySelectorAll('main [id^="vista-"]').forEach(el=>{el.classList.add('hidden');el.classList.remove('flex');});return;}waitingRoute=null;
   originalSwitch(tab==='organizacion'?'cerca':tab);
   if(tab==='organizacion'){internalNavigation=true;try{window.GestorCerca?.openContext('cartelera');}finally{internalNavigation=false;}}
   if(tab==='liturgia')setTimeout(()=>{const f=document.getElementById('liturgia-editor-frame');if(f&&new URL(f.src).searchParams.get('activity')!==activity)f.src=orderUrl();},0);
  }else{
   document.querySelectorAll('main [id^="vista-"]').forEach(el=>{el.classList.add('hidden');el.classList.remove('flex');});
   if(area==='contabilidad')document.getElementById('dash-restricted').hidden=false;
  }
  document.body.classList.remove('dash-mobile-open');document.getElementById('dash-menu').setAttribute('aria-expanded','false');
  if(push)history.pushState(null,'','#'+area+(tab?'/'+tab:''));
  document.getElementById('dash-print').hidden=tab!=='cartelera';if(area==='inicio'){refresh();void loadSummaries(true);}
 }
 switchTab=function(t){if(internalNavigation)return originalSwitch(t);const found=Object.entries(areas).find(([,v])=>v.tabs.some(([k])=>k===t));if(found)route(found[0],t);else originalSwitch(t);};
 document.querySelectorAll('[data-area]').forEach(b=>b.addEventListener('click',()=>route(b.dataset.area)));
 document.getElementById('dash-subnav').onclick=e=>{const b=e.target.closest('[data-tab]');if(b)route(area,b.dataset.tab);};
 document.getElementById('dash-collapse').onclick=()=>{if(innerWidth<=760){document.body.classList.remove('dash-mobile-open');return;}const c=document.body.classList.toggle('dash-collapsed');document.getElementById('dash-collapse').setAttribute('aria-expanded',String(!c));};
 document.getElementById('dash-menu').onclick=()=>{const open=document.body.classList.toggle('dash-mobile-open');document.getElementById('dash-menu').setAttribute('aria-expanded',String(open));};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('dash-mobile-open');});
 document.getElementById('dash-date').onchange=e=>{if(!e.target.value)return;activity=e.target.value;selectedDate=new Date(activity+'T12:00:00');currentDate=new Date(selectedDate);renderCalendar();renderWeek();const f=document.getElementById('liturgia-editor-frame');if(f){f.src=orderUrl();}document.getElementById('dash-date-detail').textContent='Fecha seleccionada para Cartelera y Peticiones. Liturgia abre la guía compartida del día.';};
 document.getElementById('dash-open-order').onclick=()=>route('cultos','liturgia');
 window.addEventListener('popstate',()=>{const [a,t]=location.hash.slice(1).split('/');route(a,t,false);});
 window.addEventListener('dashboard-data',()=>{if(area==='inicio')setTimeout(refresh,50);});
 setInterval(()=>{if(area==='inicio')refresh();},4000);
 const [start,section]=location.hash.slice(1).split('/');route(start||'inicio',section,false);
 document.getElementById('dash-sync').onclick=()=>{manualSync();void loadSummaries(true);};
 document.getElementById('dash-theme').onclick=()=>toggleDarkMode();
 if(!localStorage.getItem('theme')&&!document.documentElement.classList.contains('dark'))toggleDarkMode();
 document.getElementById('dash-print').onclick=()=>window.print();
 window.addEventListener('dashboard-date',()=>{activity=localDay(selectedDate);document.getElementById('dash-date').value=activity;});
 window.addEventListener('dashboard-data',()=>{refresh();if(window.dashboardLoaded&&waitingRoute){const pending=waitingRoute;waitingRoute=null;route(...pending);}});
 setTimeout(refresh,1200);
 setInterval(()=>{if(!document.hidden&&area==='inicio')void loadSummaries();},60000);
})();



