/* PDF A4 generado con los datos visibles; no consulta ni modifica Firebase. */
(function (root) {
  'use strict';
  const DAYS = {jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo', especial:'Culto especial'};
  const NAVY = '#183047', TEAL = '#087467', MUTED = '#526577', LINE = '#d9e2e9';
  const numeric = (value, fallback) => Number.isFinite(value) ? Math.max(6, Math.min(32, value)) : fallback;
  function styles(source) {
    const result = {};
    for (const key of ['title','institution','role','label','description','phrase','text','quote','note']) {
      const s = source?.[key];
      if (!s || typeof s !== 'object') continue;
      result[key] = {};
      if (s.bold === true) result[key].bold = true;
      if (s.italic === true) result[key].italics = true;
      if (Number.isFinite(s.size)) result[key].fontSize = numeric(s.size, 10);
      if (/^#[a-f\d]{6}$/i.test(s.color || '')) result[key].color = s.color;
    }
    return result;
  }
  // El visualizador valida el contenido; aquí solo se conservan opciones de impresión conocidas.
  function retainPrintFields(source, days) {
    for (const key of Object.keys(DAYS)) {
      const original = source.days[key], doc = days[key];
      doc.meta.institution = typeof original.meta?.institution === 'string' ? original.meta.institution.slice(0, 20000) : 'IMPA NQN';
      doc.meta.styles = styles(original.meta?.styles);
      doc.settings = Object.fromEntries(['body','quote','principle'].map(k => [k,numeric(original.settings?.[k], k === 'principle' ? 9.5 : 10.5)]));
      for (const group of ['steps','principles','instructions']) {
        doc[group].forEach((item, index) => { item.styles = styles(original[group]?.[index]?.styles); });
      }
    }
  }
  function definition(doc, day, icons) {
    if (!doc || !DAYS[day]) throw new Error('Día de culto inválido');
    const field = (item, key, defaults = {}) => ({text:item[key] || '', ...defaults, ...item.styles?.[key]});
    const section = text => ({text, font:'Montserrat', bold:true, fontSize:15, color:NAVY, margin:[0,10,0,12]});
    const rule = {canvas:[{type:'line', x1:0, y1:0, x2:499, y2:0, lineWidth:0.7, lineColor:LINE}], margin:[0,8,0,10]};
    const principle = (p, i) => ({stack:[
      field(p,'title',{text:(i+1)+'. '+p.title,font:'Montserrat',bold:true,fontSize:11,color:TEAL,margin:[0,0,0,6]}),
      field(p,'text',{fontSize:doc.settings.principle,margin:[0,0,0,5]}),
      field(p,'quote',{fontSize:doc.settings.principle,italics:true,color:NAVY,margin:[8,0,0,5]}),
      field(p,'note',{fontSize:9,color:MUTED})
    ],margin:[0,0,0,12]});
    const optional = doc.steps.filter(s => ['devotional','gratitude'].includes(s.kind));
    const instruction = (item, index) => ({stack:[
      field(item,'title',{text:item.title+(index===3?' '+DAYS[day].toLowerCase():''),font:'Montserrat',bold:true,fontSize:10,color:TEAL,margin:[0,0,0,5]}),
      ...(index===3 && optional.length ? [{ul:optional.map(s => ({text:s.title+': '+(s.included?'incluido en el orden.':'omitido en este culto.')})),fontSize:9.5,margin:[0,0,0,5]}] : [field(item,'text',{fontSize:9.5})]),
      ...(index===3 ? [field(item,'note',{fontSize:9,color:MUTED,margin:[0,5,0,0]})] : [])
    ],margin:[0,0,0,10]});
    const moment = (s, index) => {
      const icon = icons?.[s.icon]?.[1];
      return {stack:[
        {columns:[{text:String(index+1).padStart(2,'0'),width:26,font:'Montserrat',bold:true,fontSize:19,color:TEAL},
          {stack:[field(s,'title',{font:'Montserrat',bold:true,fontSize:11,color:NAVY}),field(s,'role',{font:'Montserrat',fontSize:8,color:MUTED,margin:[0,4,0,0]})]}],columnGap:5,margin:[0,0,0,8]},
        {columns:[...(icon?[{svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="'+TEAL+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg>',width:18}]:[]),field(s,'label',{font:'Montserrat',fontSize:8.5,bold:true,color:TEAL})],columnGap:5,margin:[0,0,0,7]},
        field(s,'description',{fontSize:doc.settings.body,margin:[0,0,0,8]}),
        field(s,'phrase',{fontSize:doc.settings.quote,italics:true,color:NAVY,margin:[0,0,0,5]}),
        ...(['devotional','gratitude'].includes(s.kind)?[{text:'Opcional · A criterio del coordinador',font:'Montserrat',fontSize:7.5,color:MUTED}]:[])
      ],margin:[0,6,0,10]};
    };
    const visible = doc.steps.filter(s => s.included !== false);
    const rows = [];
    for (let i=0;i<visible.length;i+=2) {
      const pair = visible.slice(i,i+2);
      // Los textos excepcionalmente largos pueden continuar en la siguiente hoja, sin recortarse.
      const safeToKeep = pair.every(s => [s.title,s.role,s.label,s.description,s.phrase].join('\n').split('\n').reduce((lines,text)=>lines+Math.max(1,Math.ceil(text.length/25)),0) <= 26 &&
        Math.max(doc.settings.body,doc.settings.quote,...Object.values(s.styles || {}).map(v=>v.fontSize||0)) <= 16);
      rows.push({table:{widths:['*',14,'*'],dontBreakRows:safeToKeep,body:[[moment(pair[0],i),{text:''},pair[1]?moment(pair[1],i+1):{text:''}]]},layout:{
        hLineWidth:i=>i===0?0.6:0, vLineWidth:()=>0, hLineColor:()=>LINE,
        paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0
      }});
    }
    const guideRows = blocks => {
      const rows=[];
      for(let i=0;i<blocks.length;i+=2) rows.push({table:{widths:['*',14,'*'],body:[[blocks[i],{text:''},blocks[i+1]||{text:''}]]},layout:{hLineWidth:()=>0,vLineWidth:()=>0,paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0}});
      return rows;
    };
    const content = [section('Principios de conducción'),...guideRows(doc.principles.map(principle)),rule,section('Indicaciones para el culto'),...guideRows(doc.instructions.map(instruction)),
      {...section('Orden del culto'),pageBreak:'before'},
      {text:'Leer por filas: izquierda a derecha, luego la siguiente fila.',font:'Montserrat',fontSize:8,color:MUTED,margin:[0,0,0,10]},
      ...(rows.length?rows:[{text:'No hay momentos incluidos en este culto.'}])];
    return {
      info:{title:doc.meta.title+' · '+DAYS[day],author:'IMPA NQN',subject:'Guía de conducción y orden del culto'},
      pageSize:'A4',pageMargins:[48,94,48,44],
      defaultStyle:{font:'Merriweather',fontSize:10,lineHeight:1.18,color:NAVY},
      header:()=>({margin:[48,28,48,0],stack:[
        {columns:[{stack:[{text:'GUÍA DE CULTOS · '+DAYS[day].toUpperCase(),font:'Montserrat',fontSize:8,color:TEAL,margin:[0,0,0,4]},field(doc.meta,'title',{font:'Montserrat',bold:true,fontSize:15})]},
          field(doc.meta,'institution',{font:'Montserrat',fontSize:7.5,color:MUTED,width:145,alignment:'right'})],columnGap:12},
        {canvas:[{type:'line',x1:0,y1:0,x2:499,y2:0,lineWidth:1,lineColor:TEAL}],margin:[0,9,0,0]}
      ]}),
      footer:(page,total)=>({margin:[48,12,48,0],columns:[{text:'Reverencia · Hospitalidad · Sujeción pastoral',fontSize:7,color:MUTED},{text:page+' / '+total+' · A4',fontSize:7,color:MUTED,alignment:'right'}],font:'Montserrat'}),
      content
    };
  }
  const clean = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  // Inferir por función y título, nunca por número, posición o ID del momento.
  function noteKind(step) {
    const title=clean(step.title);
    if (step.kind==='gratitude' || /oportunidad|testimonio|participacion/.test(title)) return 'participations';
    if (/clamor|interces|humillacion/.test(title)) return 'intercession';
    if (/predic|sermon|mensaje.*palabra|palabra.*ministracion/.test(title)) return 'message';
    if (/entrega.*pastor|cierre|despedida|avisos|anuncios|bendicion.*final/.test(title)) return 'closing';
    if (/apertura|invocacion|inicio|inico/.test(title)) return 'opening';
    if (/oracion.*(consagracion|presentacion)/.test(title)) return 'consecration';
    if (/alabanzas.*adoracion|bloque.*alabanz/.test(title)) return 'worship';
    if (/himno/.test(title)) return 'hymn';
    if (/himno|alabanza|adoracion|coro|canto|cancion/.test(title)) return 'music';
    if (step.kind==='devotional' || /devocional/.test(title)) return 'devotional';
    return 'general';
  }
  function notesDefinition(doc,day,icons) {
    const result=definition(doc,day,icons);
    const label=text=>({text,font:'Montserrat',fontSize:8.5,bold:true,color:MUTED,margin:[0,7,0,0]});
    const lines=(count=1)=>({canvas:Array.from({length:count},(_,i)=>({type:'line',x1:0,y1:(i+1)*20,x2:499,y2:(i+1)*20,lineWidth:0.45,lineColor:'#aebac4'})),margin:[0,0,0,3]});
    const area=(text,count=1)=>[label(text),lines(count)];
    const optional=doc.steps.filter(s=>['devotional','gratitude'].includes(s.kind));
    const instructions=doc.instructions.map((item,index)=>({stack:[
      {text:item.title+(index===3?' '+DAYS[day].toLowerCase():''),font:'Montserrat',bold:true,fontSize:10,color:TEAL,margin:[0,9,0,4]},
      ...(index===3&&optional.length?[{ul:optional.map(s=>s.title+': '+(s.included!==false?'incluido en el orden.':'omitido en este culto.')),fontSize:9.5}]:[{text:item.text,fontSize:9.5}]),
      ...(index===3&&item.note?[{text:item.note,fontSize:9,color:MUTED,margin:[0,4,0,0]}]:[])
    ]}));
    const fields=kind=>{
      if(kind==='participations') return [
        {text:'Los hermanos solicitan las oportunidades; el pastor autoriza su participación.',font:'Montserrat',fontSize:8,color:MUTED,margin:[0,6,0,0]},
        {text:'Tipo: agradecimiento / testimonio / canto por gratitud',font:'Montserrat',fontSize:8,color:MUTED,margin:[0,6,0,6]},
        {table:{headerRows:1,widths:[145,120,'*'],heights:row=>row===0?18:38,body:[
          ['Nombre','Tipo de oportunidad','Observaciones'].map(text=>({text,bold:true,font:'Montserrat',fontSize:8})),
          ...Array.from({length:3},()=>['','',''])
        ]},layout:{hLineWidth:()=>0.5,vLineWidth:()=>0.5,hLineColor:()=>LINE,vLineColor:()=>LINE}},
        ...area('Orden de participación / coordinación',1)
      ];
      const sets={
        opening:[['Notas / recordatorios',2]],
        consecration:[],
        intercession:[['Quién dirige',1],['Motivos de oración / personas por quienes orar',3]],
        message:[['Predicador',1],['Tema y texto bíblico',2],['Pauta acordada con el ministro de alabanza',2]],
        music:[['Himnos / alabanzas: título o número y orden',2],['Responsable / coordinación con alabanza',1]],
        hymn:[['Himno: título o número',1],['Notas',2]],
        worship:[['Notas rápidas',2],['Oración de gratitud: a quién invitar a dirigir (si se comparte)',1]],
        closing:[['Avisos antes de entregar al pastor',3],['Pendientes / indicaciones finales',1]],
        devotional:[['Versículo / pasaje bíblico',1],['Notas del devocional',2]],
        general:[['Responsable',1],['Notas / acuerdos',2]]
      };
      return sets[kind].flatMap(([text,count])=>area(text,count));
    };
    const moments=doc.steps.filter(s=>s.included!==false).map((s,index)=>{
      const heading={columns:[{text:String(index+1).padStart(2,'0'),width:30,font:'Montserrat',fontSize:19,bold:true,color:TEAL},{stack:[
        {text:s.title,font:'Montserrat',bold:true,fontSize:12},
        {text:[s.role,s.label].filter(Boolean).join(' · '),font:'Montserrat',fontSize:8,color:MUTED,margin:[0,4,0,0]}
      ]}],columnGap:6,margin:[0,6,0,8]};
      const short=[s.title,s.role,s.label,s.description].join('\n').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/60)),0)<20;
      return {table:{widths:['*'],dontBreakRows:short,body:[[{stack:[heading,{text:s.description,fontSize:10,margin:[0,0,0,6]},...fields(noteKind(s))],margin:[0,0,0,18]}]]},layout:{
        hLineWidth:i=>i===0?0.7:0,hLineColor:()=>LINE,vLineWidth:()=>0,paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0
      }};
    });
    result.info={...result.info,title:'Anotador del coordinador · '+DAYS[day],subject:'Preparación del culto y notas manuscritas'};
    result.pageMargins=[48,120,48,44];
    result.header=()=>({margin:[48,24,48,0],stack:[
      {text:'Iglesia Metodista Pentecostal Argentina',font:'Montserrat',bold:true,fontSize:14,color:NAVY},
      {text:'Neuquén Capital',font:'Montserrat',bold:true,fontSize:11,color:TEAL,margin:[0,3,0,0]},
      {text:'Denis y Elordi · B° Islas Malvinas',font:'Montserrat',fontSize:9,color:MUTED,margin:[0,3,0,0]},
      {text:'ANOTADOR DEL COORDINADOR · '+DAYS[day].toUpperCase(),font:'Montserrat',fontSize:8,color:TEAL,margin:[0,8,0,0]},
      {canvas:[{type:'line',x1:0,y1:0,x2:499,y2:0,lineWidth:1,lineColor:TEAL}],margin:[0,8,0,0]}
    ]});
    result.footer=page=>({text:String(page),alignment:'center',font:'Montserrat',fontSize:8,color:MUTED,margin:[48,12,48,0]});
    result.content=[
      {text:'Preparación del culto',font:'Montserrat',bold:true,fontSize:16,margin:[0,0,0,10]},
      ...area('Fecha del culto',1),...area('Coordinador',1),
      {text:'Indicaciones para el culto',font:'Montserrat',bold:true,fontSize:13,margin:[0,18,0,3]},...instructions,
      {text:'Orden y notas',font:'Montserrat',bold:true,fontSize:16,pageBreak:'before',margin:[0,0,0,10]},
      ...(moments.length?moments:[{text:'No hay momentos incluidos en este culto.'}])
    ];
    return result;
  }
  let loading;
  function loadScript(src) {
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=src;
      script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error('No se pudo cargar el generador PDF'));};
      document.head.append(script);
    });
  }
  async function engine() {
    if (!loading) loading=(async()=>{
      if (!root.pdfMake) await loadScript('pdfmake.min.js?v=0.3.15');
      if (!root.liturgyPdfFontsReady) await loadScript('pdf-fonts.js?v=1');
      return root.pdfMake;
    })().catch(error=>{loading=null;throw error;});
    return loading;
  }
  async function download(doc,day,icons,variant='guide') {
    const maker=await engine();
    const notes=variant==='notes';
    await maker.createPdf(notes?notesDefinition(doc,day,icons):definition(doc,day,icons)).download('IMPA-NQN-'+(notes?'anotador-':'')+day+'.pdf');
  }
  const api={retainPrintFields,definition,notesDefinition,noteKind,download};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.liturgyPdf=api;
})(typeof window === 'undefined' ? globalThis : window);
