import { CONFIG, periodLabel, nextPeriod, prevPeriod, dateLabel, today, now, daysInPeriod, isoDate, money } from "./config.js";
import { Store } from "./store.js";
import { firebaseEnabled, authState, login, logout, uploadFile } from "./firebase.js";
import { formSchema, renderView, esc } from "./views.js";

const $ = s => document.querySelector(s);
const content = $("#content");
let view = "dashboard";
let period = CONFIG.defaultPeriod;
let branch = "General";
let editing = null;
let currentOperator = "";
let agentPerson = "";
let pendingAgent = null;
let compareA = prevPeriod(CONFIG.defaultPeriod);
let compareB = CONFIG.defaultPeriod;

const titles = {
 dashboard:"Panel general", cash:"Caja diaria", providers:"Proveedores", invoices:"Facturas", expenses:"Gastos por categoría", investments:"Gastos de inversión",
 people:"Personal", hours:"Horas mensuales", results:"Resultados", compare:"Comparativas", tasks:"Recordatorios", agent:"Agente BLUNNO", close:"Cierre mensual", files:"Archivos", history:"Historial", trash:"Papelera", import:"Excel / Backup"
};

const toast = (message, ok=true) => {
  const el=$("#toast"); el.textContent=message; el.className=`toast show ${ok?'ok':'bad'}`;
  clearTimeout(window.__blunnoToast); window.__blunnoToast=setTimeout(()=>el.className='toast',3800);
};

function setOperator(name) {
  currentOperator = name || "";
  window.__blunnoResponsible = currentOperator;
  localStorage.setItem("blunno-operator", currentOperator);
  const label=$("#operatorLabel"); if(label) label.textContent=currentOperator || "Elegir responsable";
}

function setBranch(name) {
  branch = CONFIG.profiles.includes(name) ? name : "General";
  localStorage.setItem("blunno-branch",branch); refresh();
}

function connection() {
  $("#connectionDot").className=firebaseEnabled?'connected':'local';
  $("#connectionText").textContent=firebaseEnabled?'Firebase + nube':'Modo local';
  $("#userText").textContent=firebaseEnabled?'Autenticación habilitada':'Configurar Firebase para nube y archivos permanentes';
}

function refresh(){
  $("#pageTitle").textContent=titles[view]||"Blunno";
  renderView(view,content,period,branch,compareA,compareB);
  wire();
  $("#periodSelector").textContent=periodLabel(period);
  $("#periodState").textContent=Store.periodIsClosed(period,branch)?"CERRADO":"ABIERTO";
  $("#periodDot").className=Store.periodIsClosed(period,branch)?"closed":"open";
  $("#branchSelector").value=branch;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  checkReminders();
}

function fieldHtml([n,label,type,options], data) {
  let control="";
  if(type==='select') control=`<select name="${n}">${options.map(v=>{const a=Array.isArray(v)?v:[v,v];return `<option value="${esc(a[0])}">${esc(a[1])}</option>`}).join('')}</select>`;
  else if(type==='textarea') control=`<textarea name="${n}" rows="3"></textarea>`;
  else if(type==='checkbox') control=`<input name="${n}" type="checkbox" class="checkbox-input">`;
  else control=`<input name="${n}" type="${type}" ${type==='number'?'step="0.01" min="0"':''}>`;
  return `<label class="field ${type==='checkbox'?'checkbox-field':''}">${esc(label)}${control}</label>`;
}

function openModal(type,id=null){
  const map={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',expense:'expenses',investment:'investments',task:'tasks'};
  const col=map[type]||type; editing=id?Store.get(col,id):null;
  const schema=formSchema[type]; if(!schema) return;
  $("#modalKicker").textContent=editing?'EDICIÓN CONTROLADA':'NUEVO REGISTRO';
  $("#modalTitle").textContent=editing?'Editar registro':'Nuevo registro';
  $("#formFields").innerHTML=schema.map(x=>fieldHtml(x,editing)).join('');
  for(const [n] of schema){const el=$("#formFields [name=\""+n+"\"]"); if(!el) continue; if(editing?.[n]!==undefined){if(el.type==='checkbox')el.checked=!!editing[n];else el.value=editing[n];}}
  const d=$("#formFields [name=date]"); if(d&&!editing)d.value=today();
  const op=$("#recordResponsible"); op.value=currentOperator||"";
  $("#recordForm").dataset.type=type;
  $("#modal").classList.remove('hidden');
  $("#formFields input,#formFields select,#formFields textarea")[0]?.focus();
  wireProviderDatalist();
}
function closeModal(){$("#modal").classList.add('hidden');editing=null;}

async function saveRecord(e){
  e.preventDefault();
  const type=e.target.dataset.type;
  const responsible=$("#recordResponsible").value;
  const raw=Object.fromEntries(new FormData(e.target).entries());
  const data={...raw};
  for(const k of ['amount','expected','paidAmount','hourlyRate','hours','advance','merchandise']) if(k in data) data[k]=Number(data[k]||0);
  if(type==='hours'){ const emp=Store.list('employees').find(x=>x.name.toLowerCase()===String(data.employee||'').toLowerCase()); if(!emp) throw new Error('No se encontró el empleado. Usá el nombre de la ficha de Personal.'); data.employeeId=emp.id; data.employee=emp.name; data.branch=emp.branch; data.period=(data.date||today()).slice(0,7); data.salaryCost=Number(data.hours||0)*Number(emp.hourlyRate||0); }
  if('lateMovement' in data) data.lateMovement = $("#formFields [name=lateMovement]")?.checked || false;
  if(type==='invoice'){data.period=(data.operationDate||today()).slice(0,7);data.loadDate=editing?.loadDate||now();}
  if(['cash','expense','investment'].includes(type)) data.period=(data.date||today()).slice(0,7);
  if(type==='cash') data.branch=data.branch==='General'?branch:data.branch;
  if(['expense','investment'].includes(type) && data.branch==='General') data.branch=branch==='General'?CONFIG.branches[0]:branch;
  if(type==='task') data.status=editing?.status||'pending';
  if(type==='employee') data.active=data.active!=='false';
  try{
    const collection={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',hours:'hours',expense:'expenses',investment:'investments',task:'tasks'}[type];
    if(!collection) throw new Error('Tipo de registro inválido.');
    if(editing) await Store.update(collection,editing.id,data,responsible,'Edición controlada desde formulario',{lateMovement:data.lateMovement});
    else await Store.add(collection,data,responsible,'Alta controlada desde formulario',{lateMovement:data.lateMovement});
    closeModal(); toast(editing?'Cambios guardados y auditados':'Guardado con éxito'); refresh();
  }catch(err){toast(err.message||'No se pudo guardar',false)}
}

function wireProviderDatalist(){
  const inputs=[...document.querySelectorAll('input[name=provider],input[name=name]')];
  inputs.forEach(i=>{ if(i.name!=='provider' && !$("#recordForm")?.dataset.type?.includes('invoice')) return; i.setAttribute('list','providerList'); });
  let dl=$("#providerList"); if(!dl){dl=document.createElement('datalist');dl.id='providerList';document.body.appendChild(dl)}
  dl.innerHTML=Store.list('providers').filter(x=>x.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'es')).map(x=>`<option value="${esc(x.name)}"></option>`).join('');
}

function wire(){
  document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>openModal(b.dataset.new));
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(b.dataset.edit,b.dataset.id));
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.delete,b.dataset.id));
  document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>restoreRecord(b.dataset.restore,b.dataset.id));
  document.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>setBranch(b.dataset.profile));
  document.querySelectorAll('[data-compare-select]').forEach(s=>s.onchange=()=>{if(s.dataset.compareSelect==='a')compareA=s.value;else compareB=s.value;refresh()});
  document.querySelectorAll('[data-view-jump]').forEach(b=>b.onclick=()=>{view=b.dataset.viewJump;refresh()});
  document.querySelectorAll('[data-complete-task]').forEach(b=>b.onclick=()=>completeTask(b.dataset.completeTask));
  document.querySelectorAll('[data-liquidate]').forEach(b=>b.onclick=()=>openLiquidation(b.dataset.liquidate));
  document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>showDetail(b.dataset.detail,b.dataset.id));
  document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>{$('.sheet-wrap')?.scrollBy({left:b.dataset.scroll==='right'?500:-500,behavior:'smooth'})});
  document.querySelectorAll('[data-close-period]').forEach(b=>b.onclick=openCloseConfirm);
  document.querySelectorAll('[data-reopen-period]').forEach(b=>b.onclick=openReopenConfirm);
  $("#exportAudit")?.addEventListener('click',()=>download(`auditoria-blunno-${today()}.json`,JSON.stringify(Store.db.audit,null,2),'application/json'));
  $("#backupButton")?.addEventListener('click',()=>Store.exportJson());
  $("#exportExcelButton")?.addEventListener('click',exportExcel);
  $("#excelInput")?.addEventListener('change',handleExcel);
  document.querySelectorAll('[data-hour-input]').forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur()}});input.addEventListener('blur',()=>saveHourCell(input))});
}

async function deleteRecord(collection,id){
  if(!currentOperator){toast('Elegí el responsable antes de eliminar.',false);return}
  if(!confirm('¿Mover este registro a la papelera? Se conserva y se puede restaurar.')) return;
  try{await Store.remove(collection,id,currentOperator,'Baja lógica confirmada');toast('El movimiento se encuentra en la papelera.');refresh()}catch(e){toast(e.message,false)}
}
async function restoreRecord(collection,id){try{await Store.restore(collection,id,currentOperator);toast('Restaurado con éxito.');refresh()}catch(e){toast(e.message,false)}}
async function completeTask(id){try{await Store.completeTask(id,currentOperator);toast('Recordatorio marcado como realizado.');refresh()}catch(e){toast(e.message,false)}}

async function saveHourCell(input){
  if(!currentOperator){toast('Elegí responsable antes de cargar horas.',false);return}
  const date=input.closest('td')?.dataset.hourDate, employeeId=input.closest('td')?.dataset.employee; if(!date||!employeeId)return;
  const employee=Store.get('employees',employeeId); if(!employee)return;
  const existing=Store.list('hours',period,branch).find(x=>x.employeeId===employeeId&&x.date===date);
  const value=input.value.trim();
  try{
    if(!value){if(existing) await Store.remove('hours',existing.id,currentOperator,'Borrado de celda de horas');}
    else {const hours=Number(value.replace(',','.'));if(!Number.isFinite(hours)||hours<0)throw new Error('La hora debe ser un número válido.');const data={period,date,branch:employee.branch,employeeId,employee:employee.name,hours,advance:existing?.advance||0,merchandise:existing?.merchandise||0,holiday:existing?.holiday||'no',salaryCost:hours*Number(employee.hourlyRate||0)};if(existing)await Store.update('hours',existing.id,data,currentOperator,'Edición directa de planilla');else await Store.add('hours',data,currentOperator,'Carga directa de planilla');}
    toast('Hora guardada y auditada.');refresh();
  }catch(e){toast(e.message,false)}
}

function openLiquidation(employeeId){
  const e=Store.get('employees',employeeId); if(!e)return; const rows=Store.list('hours',period,branch).filter(x=>x.employeeId===employeeId); const hours=rows.reduce((s,x)=>s+Number(x.hours||0),0), holidays=rows.filter(x=>x.holiday==='yes').reduce((s,x)=>s+Number(x.hours||0),0), advance=rows.reduce((s,x)=>s+Number(x.advance||0),0), merchandise=rows.reduce((s,x)=>s+Number(x.merchandise||0),0);
  $("#liquidationBody").innerHTML=`<div class="liquidation-grid"><div><span>Empleado</span><b>${esc(e.name)}</b></div><div><span>Horas normales</span><b>${hours-holidays}</b></div><div><span>Horas feriado</span><b>${holidays}</b></div><div><span>Adelantos</span><b>${money(advance)}</b></div><div><span>Mercadería</span><b>${money(merchandise)}</b></div></div><label class="field">Valor hora<input id="liqRate" type="number" min="0" step="0.01" value="${Number(e.hourlyRate||0)}"></label><label class="field">Valor hora feriado<input id="liqHolidayRate" type="number" min="0" step="0.01" value="${Number(e.hourlyRate||0)*2}"></label><div id="liqTotal" class="liq-total"></div><div class="modal-footer"><button class="secondary-button" data-close-liquidation>Cancelar</button><button class="primary-button" id="saveLiquidation">Totalizar sueldo</button></div>`;
  const calc=()=>{const r=Number($('#liqRate').value||0),hr=Number($('#liqHolidayRate').value||0),gross=(hours-holidays)*r+holidays*hr,net=gross-advance-merchandise;$('#liqTotal').innerHTML=`<b>Sueldo bruto: ${money(gross)}</b><b>${net>=0?'A cobrar':'Deuda a favor de Blunno'}: ${money(Math.abs(net))}</b>`;return{r,hr,gross,net}};$('#liqRate').oninput=calc;$('#liqHolidayRate').oninput=calc;calc();$('#saveLiquidation').onclick=async()=>{try{const c=calc();await Store.add('liquidations',{period,branch,employeeId,employee:e.name,normalHours:hours-holidays,holidayHours:holidays,hourlyRate:c.r,holidayRate:c.hr,advance,merchandise,gross:c.gross,net:c.net,responsible:currentOperator},currentOperator,'Totalización de sueldo');$('#liquidationModal').classList.add('hidden');toast('Sueldo totalizado y auditado.');refresh()}catch(err){toast(err.message,false)}};document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden'));$('#liquidationModal').classList.remove('hidden');
}

function showDetail(collection,id){const x=Store.get(collection,id);if(!x)return;$('#detailTitle').textContent=collection==='invoices'?'Detalle de factura':'Detalle';$('#detailBody').innerHTML=`<div class="detail-grid">${Object.entries(x).filter(([k])=>!['id','deleted'].includes(k)).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(typeof v==='object'?JSON.stringify(v):v)}</b></div>`).join('')}</div>`;$('#detailModal').classList.remove('hidden')}

function openPeriodModal(){const list=Store.db.periods.sort((a,b)=>b.id.localeCompare(a.id));$('#periodBody').innerHTML=`<div class="period-create"><label class="field">Ir a período<input id="periodInput" type="month" value="${period}"></label><button class="primary-button" id="goPeriod">Abrir</button></div>${list.map(p=>`<button class="period-row" data-select-period="${p.id}"><b>${periodLabel(p.id)}</b><span class="status-pill ${p.status==='closed'?'muted':'success'}">${p.status==='closed'?'CERRADO':'ABIERTO'}</span></button>`).join('')}`;$('#periodModal').classList.remove('hidden');$('#goPeriod').onclick=()=>{period=$('#periodInput').value;Store.setPeriod(period);$('#periodModal').classList.add('hidden');refresh()};document.querySelectorAll('[data-select-period]').forEach(b=>b.onclick=()=>{period=b.dataset.selectPeriod;$('#periodModal').classList.add('hidden');refresh()})}

async function openCloseConfirm(){
 if(!currentOperator){toast('Elegí responsable antes del cierre.',false);return}
 const s=Store.summary(period,branch), next=nextPeriod(period);
 $('#closeConfirmBody').innerHTML=`<div class="close-summary"><div><span>Período</span><b>${periodLabel(period)}</b></div><div><span>Perfil</span><b>${esc(branch)}</b></div><div><span>Resultado</span><b>${money(s.result)}</b></div><div><span>Siguiente</span><b>${periodLabel(next)}</b></div></div><div class="check-list">${['Caja','Ingresos','Proveedores','Gastos','Inversiones','Personal / horas','Facturas tardías'].map(x=>`<label><input type="checkbox"> <span>Confirmo revisión de ${x}</span></label>`).join('')}</div><label class="field">Observaciones<textarea id="closeObservation" rows="3" placeholder="Diferencias, notas o aclaraciones"></textarea></label><button class="primary-button full-button" id="confirmCloseBtn">Cerrar período y generar documentación</button>`;$('#closeConfirmModal').classList.remove('hidden');$('#confirmCloseBtn').onclick=async()=>{const checks=[...document.querySelectorAll('#closeConfirmBody input[type=checkbox]')];if(checks.some(x=>!x.checked)){toast('Completá todo el checklist antes de cerrar.',false);return}try{const obs=$('#closeObservation').value;const closure=await Store.closePeriod(period,next,currentOperator,s,'Cierre mensual confirmado');await generateClosurePDF(closure);$('#closeConfirmModal').classList.add('hidden');toast('Mes cerrado, versión registrada y PDF archivado.');refresh()}catch(e){toast(e.message,false)}};
}
async function openReopenConfirm(){const reason=prompt('Motivo obligatorio para reabrir el período:');if(!reason?.trim())return;try{await Store.reopenPeriod(period,branch,currentOperator,reason);toast('Período reabierto y auditado.');refresh()}catch(e){toast(e.message,false)}}

async function generateClosurePDF(closure){
 if(!window.jspdf?.jsPDF) { toast('Cierre guardado. Para generar PDF agregá la librería jsPDF.',false); return; }
 const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4'}); const s=closure.summary;
 doc.setFontSize(18);doc.text('DISTRIBUIDORA BLUNNO',15,18);doc.setFontSize(12);doc.text('CIERRE MENSUAL',15,27);doc.setFontSize(9);doc.text(`Período: ${periodLabel(closure.period)}`,15,35);doc.text(`Sucursal / perfil: ${closure.branch}`,15,41);doc.text(`Versión: ${closure.version}`,15,47);doc.text(`Responsable: ${closure.responsible}`,15,53);doc.text(`Fecha y hora: ${new Date(closure.closedAt).toLocaleString('es-AR')}`,15,59);
 const lines=[['Ingresos',money(s.income)],['Gastos caja',money(s.cashExpense)],['Gastos del local',money(s.localExpense)],['Inversiones',money(s.investment)],['Personal estimado',money(s.salary)],['Proveedores facturados',money(s.providers)],['Resultado',money(s.result)]];let y=70;doc.setFontSize(10);lines.forEach(([a,b])=>{doc.text(a,20,y);doc.text(b,185,y,{align:'right'});doc.line(18,y+2,190,y+2);y+=9});doc.setFontSize(8);doc.text('Documento generado por Control Empresarial Blunno. Toda modificación posterior conserva versión y auditoría.',15,145);const blob=doc.output('blob');const dataUrl=await blobToDataURL(blob);const safe=`cierre-${closure.period}-${closure.branch.replace(/\s+/g,'-').toLowerCase()}-v${closure.version}.pdf`;let url=null;try{url=await uploadFile(`archivos/${closure.period}/${closure.branch}/cierres/${safe}`,blob,'application/pdf')}catch(e){console.warn(e)};await Store.add('files',{name:safe,sector:'Cierre mensual',period:closure.period,branch:closure.branch,responsible:closure.responsible,mime:'application/pdf',createdAt:now(),dataUrl:url?null:dataUrl,url},closure.responsible,'Archivo de cierre generado');downloadBlob(blob,safe);
}
const blobToDataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
const downloadBlob=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
const download=(name,data,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};

async function handleExcel(e){const f=e.target.files?.[0];if(!f)return;const box=$('#importPreview');box.innerHTML='<div class="loading">Leyendo Excel y preparando control…</div>';try{const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});box.innerHTML=`<div class="notice success"><b>${esc(f.name)}</b> leído correctamente: ${wb.SheetNames.length} hojas.</div>`+wb.SheetNames.map((s,i)=>`<div class="sheet-preview"><div><b>${esc(s)}</b><span>Hoja ${i+1}</span></div><button class="secondary-button sync-sheet" data-sheet="${encodeURIComponent(s)}">Analizar / sincronizar</button></div>`).join('');document.querySelectorAll('.sync-sheet').forEach(b=>b.onclick=()=>syncSheet(wb,decodeURIComponent(b.dataset.sheet),f.name))}catch(err){box.innerHTML=`<div class="notice danger-box">No se pudo leer el Excel: ${esc(err.message)}</div>`}}

async function syncSheet(wb,sheet,fileName){if(!currentOperator){toast('Elegí responsable antes de sincronizar.',false);return}const ws=wb.Sheets[sheet],range=XLSX.utils.decode_range(ws['!ref']);let synced=0;try{for(let r=0;r<=range.e.r;r++){const vals=[];for(let c=0;c<Math.min(11,range.e.c+1);c++)vals.push(ws[XLSX.utils.encode_cell({r,c})]?.v??'');const headers=vals.map(v=>String(v||'').trim().toUpperCase());if(!headers.some(x=>x.includes('LUNES')||x.includes('MARTES')||x.includes('MIERCOLES')||x.includes('MIÉRCOLES')))continue;const dataRow=[];for(let c=0;c<Math.min(7,vals.length);c++){const header=String(vals[c]||'');const m=header.match(/(\d{1,2})$/);if(m)dataRow.push({day:Number(m[1]),col:c})}const next=[];for(let rr=r+1;rr<=Math.min(r+2,range.e.r);rr++){const v=[];for(let c=0;c<Math.min(11,range.e.c+1);c++)v.push(ws[XLSX.utils.encode_cell({r:rr,c})]?.v??'');next.push(v)}const values=next[0]||[];for(const cell of dataRow){const val=values[cell.col];if(typeof val!=='number')continue;const date=isoDate(period,cell.day);if(Number(cell.day)>daysInPeriod(period))continue;const emp=Store.list('employees').find(x=>x.name.toLowerCase()===sheet.trim().toLowerCase());if(!emp)continue;const sourceKey=`${fileName}|${sheet}|${date}|${cell.col}`;await Store.upsertBySource('hours',sourceKey,{period,date,branch:emp.branch,employeeId:emp.id,employee:emp.name,hours:Number(val),advance:0,merchandise:0,holiday:'no',salaryCost:Number(val)*Number(emp.hourlyRate||0)},currentOperator);synced++}}
 toast(`Excel sincronizado: ${synced} registros procesados.`);refresh()}catch(e){toast(e.message,false)}}

async function exportExcel(){
 const wb=XLSX.utils.book_new(); const s=Store.summary(period,branch);
 const summary=[['DISTRIBUIDORA BLUNNO'],['Período',periodLabel(period)],['Perfil',branch],[],['Indicador','Monto'],['Ingresos',s.income],['Gastos caja',s.cashExpense],['Gastos local',s.localExpense],['Inversiones',s.investment],['Personal',s.salary],['Proveedores',s.providers],['Resultado',s.result]];
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),'Resumen');
 ['cash','invoices','expenses','investments','hours','liquidations'].forEach(n=>{const data=Store.list(n,period,branch).map(x=>{const o={...x};delete o.deleted;return o});XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.length?data:[{sin_registros:''}]),n.slice(0,31))});
 const name=`blunno-${period}-${branch.replace(/\s+/g,'-').toLowerCase()}.xlsx`;
 const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'}); const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 let url=null; try{url=await uploadFile(`archivos/${period}/${branch}/exportaciones/${name}`,blob,blob.type)}catch(e){console.warn(e)}
 let dataUrl=null; if(!url && blob.size<1200000) dataUrl=await blobToDataURL(blob);
 await Store.add('files',{name,sector:'Exportación Excel',period,branch,responsible:currentOperator,mime:blob.type,createdAt:now(),dataUrl,url},currentOperator,'Excel generado y archivado');
 downloadBlob(blob,name); toast('Excel exportado y archivado.');
}

function checkReminders(){const due=Store.list('tasks').filter(x=>x.status!=='completed').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`))[0];if(!due)return;const nowD=new Date(),d=new Date(`${due.dueDate}T${due.dueTime||'23:59'}:00`);if(d<=nowD||due.dueDate===today()){$('#reminderTitle').textContent=due.priority==='urgent'?'⚠ RECORDATORIO URGENTE':'🔔 TENÉS UN RECORDATORIO';$('#reminderText').textContent=due.title;$('#reminderMeta').textContent=`📅 ${dateLabel(due.dueDate)} — ${due.dueTime||'sin hora'} · 👤 ${due.responsible}`;$('#reminderModal').classList.remove('hidden');$('#reminderDone').onclick=()=>completeTask(due.id);}}

function agentSay(html,who='bot'){const box=$('#agentMessages');if(!box)return;box.insertAdjacentHTML('beforeend',`<div class="agent-message ${who}">${html}</div>`);box.scrollTop=box.scrollHeight}
function agentText(){const input=$('#agentInput');const text=input?.value.trim();if(!text)return;input.value='';if(!agentPerson){agentSay('<b>Agente BLUNNO</b><span>Primero elegí con quién estoy hablando.</span>');return}agentSay(`<b>${esc(agentPerson)}</b><span>${esc(text)}</span>`,'user');processAgent(text)}
async function processAgent(text){
 const lower=text.toLowerCase();
 try{ await Store.recordAudit('AGENT_QUERY','agent',{question:text},{view,period,branch},agentPerson||currentOperator,'Consulta realizada por Agente BLUNNO'); }catch(e){ console.warn(e); }
 if(/cu[aá]nto|resumen|resultado|gastamos/.test(lower)){const s=Store.summary(period,branch);agentSay(`<b>Agente BLUNNO</b><span>En ${periodLabel(period)} · ${esc(branch)}: ingresos ${money(s.income)}, gastos operativos ${money(s.totalExpenses)}, inversiones ${money(s.investment)} y resultado ${money(s.result)}.</span>`);return}
 if(/recordatorio|recordá|recordar|crear tarea/.test(lower)){const title=text.replace(/.*?(recordatorio|recordá|recordar|crear tarea)[:\s]*/i,'').trim()||'Nueva tarea';pendingAgent={type:'task',data:{title,dueDate:today(),dueTime:'',priority:'normal',responsible:agentPerson,status:'pending',repeat:'none'}};showAgentConfirmation('Crear este recordatorio');return}
 if(/factura|cargar factura/.test(lower)){const provider=Store.list('providers').find(p=>lower.includes(p.name.toLowerCase().slice(0,4)));const m=text.match(/(\d+[\d\.]*(?:,\d{1,2})?)/);pendingAgent={type:'invoice',data:{provider:provider?.name||'',number:'',operationDate:today(),loadDate:now(),dueDate:today(),branch:branch==='General'?CONFIG.branches[0]:branch,amount:m?Number(m[1].replace(/\./g,'').replace(',','.')):0,paidAmount:0,status:'pending',period:period,notes:'Cargada por Agente BLUNNO'}};showAgentConfirmation('Cargar esta factura');return}
 if(/inversi[oó]n|invert/.test(lower)){const m=text.match(/(\d+[\d\.]*(?:,\d{1,2})?)/);pendingAgent={type:'investment',data:{date:today(),period,branch:branch==='General'?CONFIG.branches[0]:branch,concept:text,amount:m?Number(m[1].replace(/\./g,'').replace(',','.')):0,notes:'Preparada por Agente BLUNNO'}};showAgentConfirmation('Cargar esta inversión');return}
 agentSay('<b>Agente BLUNNO</b><span>Puedo consultar resultados, preparar facturas, inversiones y recordatorios. Para modificar algo, siempre te muestro lo que voy a hacer y espero tu confirmación.</span>');
}
function showAgentConfirmation(label){const p=pendingAgent;agentSay(`<div class="agent-confirm"><b>${esc(label)}</b><pre>${esc(JSON.stringify(p.data,null,2))}</pre><div><button class="primary-button" data-agent-confirm>Confirmar</button><button class="secondary-button" data-agent-cancel>Cancelar</button></div></div>`);document.querySelector('[data-agent-confirm]')?.addEventListener('click',confirmAgent);document.querySelector('[data-agent-cancel]')?.addEventListener('click',()=>{pendingAgent=null;agentSay('<span>Acción cancelada. No se modificó ningún dato.</span>')})}
async function confirmAgent(){if(!pendingAgent)return;try{const {type,data}=pendingAgent;const collection={task:'tasks',invoice:'invoices',investment:'investments'}[type];const row=await Store.add(collection,data,agentPerson,'Acción confirmada por Agente BLUNNO');agentSay(`<b>Listo.</b><span>Se registró correctamente y quedó auditado.</span><button class="secondary-button" data-undo-agent="${row.id}" data-undo-collection="${collection}">↶ Deshacer esta acción</button>`);pendingAgent=null;refresh()}catch(e){agentSay(`<span class="text-red">No se pudo ejecutar: ${esc(e.message)}</span>`)}}

async function undoAgent(collection,id){const audit=Store.db.audit.find(x=>x.collection===collection&&x.recordId===id&&x.action==='CREATE');if(!audit)return;try{await Store.remove(collection,id,currentOperator||agentPerson,'Deshacer acción del Agente BLUNNO');toast('Acción del agente revertida; la auditoría original se conserva.');refresh()}catch(e){toast(e.message,false)}}

function globalWire(){
 document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{view=b.dataset.view;refresh()});
 $('#periodSelector').onclick=openPeriodModal;
 $('#branchSelector').onchange=e=>setBranch(e.target.value);
 $('#operatorSelector').onchange=e=>setOperator(e.target.value);
 $('#newRecordBtn').onclick=()=>{const map={dashboard:'cash',cash:'cash',providers:'invoice',invoices:'invoice',expenses:'expense',investments:'investment',people:'employee',hours:'hours',tasks:'task'};if(map[view])openModal(map[view]);else toast('Elegí un sector para crear un movimiento.',false)};
 $('#searchBtn').onclick=openSearch;
 $('#accountBtn').onclick=()=>$('#loginModal').classList.remove('hidden');
 $('#closeModalBtn')?.addEventListener('click',closeModal);
 $('#recordForm').addEventListener('submit',saveRecord);
 document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=closeModal);
 document.querySelectorAll('[data-close-period-modal]').forEach(b=>b.onclick=()=>$('#periodModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-detail]').forEach(b=>b.onclick=()=>$('#detailModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-reminder]').forEach(b=>b.onclick=()=>$('#reminderModal').classList.add('hidden'));
 $('#agentSend')?.addEventListener('click',agentText);$('#agentInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')agentText()});document.querySelectorAll('[data-agent-person]').forEach(b=>b.onclick=()=>{agentPerson=b.dataset.agentPerson;agentSay(`<b>Agente BLUNNO</b><span>Perfecto, ${esc(agentPerson)}. Te escucho. ¿Qué necesitás?</span>`)});
 document.querySelectorAll('[data-undo-agent]').forEach(b=>b.onclick=()=>undoAgent(b.dataset.undoCollection,b.dataset.undoAgent));
 $('#agentMic')?.addEventListener('click',startSpeech);
 $('#loginForm').onsubmit=async e=>{e.preventDefault();try{await login($('#loginEmail').value,$('#loginPassword').value);toast('Sesión iniciada.');$('#loginModal').classList.add('hidden')}catch(err){$('#loginMessage').textContent=err.message}};
 $('#logoutButton').onclick=async()=>{await logout();toast('Sesión cerrada.')};
}

function openSearch(){const m=$('#searchModal');m.classList.remove('hidden');const input=$('#searchInput');input.value='';input.focus();const draw=()=>{const q=input.value.toLowerCase().trim();if(!q){$('#searchResults').innerHTML='<div class="empty-block">Escribí para buscar en proveedores, facturas, gastos, personal y auditoría.</div>';return}const sources=[...Store.list('providers').map(x=>({...x,_type:'Proveedor',_label:x.name})),...Store.list('employees').map(x=>({...x,_type:'Empleado',_label:x.name})),...Store.list('invoices').map(x=>({...x,_type:'Factura',_label:`${x.provider} ${x.number||''} ${x.amount||''}`})),...Store.list('expenses').map(x=>({...x,_type:'Gasto',_label:`${x.category} ${x.concept||''} ${x.amount||''}`}))];const found=sources.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).slice(0,30);$('#searchResults').innerHTML=found.map(x=>`<div class="search-result"><b>${esc(x._label)}</b><span>${esc(x._type)}</span></div>`).join('')||'<div class="empty-block">No encontramos coincidencias.</div>'};input.oninput=draw;draw();}
function startSpeech(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Este navegador no tiene reconocimiento de voz habilitado.',false);return}const r=new SR();r.lang='es-AR';r.interimResults=false;r.onresult=e=>{$('#agentInput').value=e.results[0][0].transcript;agentText()};r.onerror=()=>toast('No se pudo interpretar el audio.',false);r.start();}

async function init(){
 currentOperator=localStorage.getItem('blunno-operator')||'';branch=localStorage.getItem('blunno-branch')||'General';setOperator(currentOperator);connection();
 await Store.sync();
 authState(user=>{if(user){$('#userText').textContent=user.email;$('#logoutButton').classList.remove('hidden')}else{$('#logoutButton').classList.add('hidden')}});
 globalWire();refresh();
}
init();
