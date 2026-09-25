import { CONFIG, periodLabel, nextPeriod, prevPeriod, dateLabel, today, now, daysInPeriod, isoDate, money, number } from "./config.js";
import { Store } from "./store.js";
import { firebaseEnabled, uploadFile } from "./firebase.js";
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
const viewHistory = [];
let pdfDownloadBlob = null;
let pdfDownloadName = "documento-blunno.pdf";

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

function navigate(nextView){ if(nextView===view) return; viewHistory.push(view); view=nextView; refresh(); }
function goBack(){ const previous=viewHistory.pop(); if(previous){ view=previous; refresh(); } else { view="dashboard"; refresh(); } }

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
  const back=$("#backBtn"); if(back) back.disabled=viewHistory.length===0 && view==="dashboard";
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
  for(const [n] of schema){const el=$("#formFields [name=\""+n+"\"]"); if(!el) continue; if(editing?.[n]!==undefined){if(el.type==='checkbox')el.checked=!!editing[n];else if(el.type==='date')el.value=String(editing[n]||'').slice(0,10);else el.value=editing[n];}}
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
    if(data.lateMovement && data.period){const latest=Store.db.closures.filter(x=>x.period===data.period&&x.branch===(data.branch||'General')&&x.status==='closed').sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];if(latest) await generateClosurePDF(latest);}
    closeModal(); toast(data.lateMovement?'Movimiento tardío guardado; cierre actualizado y documentado.':(editing?'Cambios guardados y auditados':'Guardado con éxito')); refresh();
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
  document.querySelectorAll('[data-view-jump]').forEach(b=>b.onclick=()=>navigate(b.dataset.viewJump));
  document.querySelectorAll('[data-complete-task]').forEach(b=>b.onclick=()=>completeTask(b.dataset.completeTask));
  document.querySelectorAll('[data-liquidate]').forEach(b=>b.onclick=()=>openLiquidation(b.dataset.liquidate));
  document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>showDetail(b.dataset.detail,b.dataset.id));
  document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>{$('.sheet-wrap')?.scrollBy({left:b.dataset.scroll==='right'?500:-500,behavior:'smooth'})});
 
  document.querySelectorAll('[data-hour-cell] input').forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.dataset.advance='1';input.blur()}});input.addEventListener('blur',()=>saveHourCell(input));});
  document.querySelectorAll('[data-cash-cell] input').forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur()}});input.addEventListener('blur',()=>saveCashCell(input));});
  document.querySelectorAll('[data-cash-add-row]').forEach(b=>b.onclick=()=>addCashConcept(b.dataset.cashAddRow));
  document.querySelectorAll('[data-hours-adjust]').forEach(b=>b.onclick=()=>editEmployeeAdjustment(b.dataset.employeeAdjust,b.dataset.hoursAdjust));
  $('#hoursEmployeeFilter')?.addEventListener('change',e=>{localStorage.setItem('blunno-hours-employee',e.target.value);refresh()});
  $('#trashRestoreSelected')?.addEventListener('click',restoreSelectedTrash);
  $('#trashPurgeSelected')?.addEventListener('click',purgeSelectedTrash);
  $('#trashSelectAll')?.addEventListener('change',e=>document.querySelectorAll('.trash-select').forEach(x=>x.checked=e.target.checked));
  document.querySelectorAll('[data-purge]').forEach(b=>b.onclick=()=>purgeOneTrash(b.dataset.purge,b.dataset.id));
  document.querySelectorAll('[data-agent-person]').forEach(b=>b.onclick=()=>rememberAgentPerson(b.dataset.agentPerson));
  document.querySelectorAll('[data-agent-prompt]').forEach(b=>b.onclick=()=>{const i=$('#agentInput');if(i){i.value=b.dataset.agentPrompt;i.focus()}});
  $('#agentSend')?.addEventListener('click',agentText);
  $('#backBtn')?.addEventListener('click',goBack);
  $('#closePdfSuccess')?.addEventListener('click',closePdfSuccess);
  document.querySelectorAll('[data-close-pdf-success]').forEach(b=>b.onclick=closePdfSuccess);
  $('#pdfSuccessDownload')?.addEventListener('click',()=>{ if(pdfDownloadBlob) downloadBlob(pdfDownloadBlob,pdfDownloadName); });
  document.querySelectorAll('[data-pdf-close]').forEach(b=>b.onclick=()=>generateAndShowViewPDF(b.dataset.pdfClose));
  document.querySelectorAll('[data-invoice-quick-save]').forEach(b=>b.onclick=quickInvoiceSave);
  $('#cashOpeningButton')?.addEventListener('click',editCashOpening);
  document.querySelectorAll('[data-hours-focus]').forEach(b=>b.onclick=()=>document.querySelector('[data-hour-cell] input')?.focus());
  $('#agentInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();agentText()}});
  $('#agentMic')?.addEventListener('click',startSpeech);
 
  document.querySelectorAll('[data-undo-agent]').forEach(b=>b.onclick=()=>undoAgent(b.dataset.undoCollection,b.dataset.undoAgent));
  document.querySelectorAll('[data-close-period]').forEach(b=>b.onclick=openCloseConfirm);
  document.querySelectorAll('[data-close-version]').forEach(b=>b.onclick=()=>{const c=Store.getRaw('closures',b.dataset.closeVersion);if(c)generateClosurePDF(c)});
  document.querySelectorAll('[data-reopen-period]').forEach(b=>b.onclick=openReopenConfirm);
  $("#exportAudit")?.addEventListener('click',()=>download(`auditoria-blunno-${today()}.json`,JSON.stringify(Store.db.audit,null,2),'application/json'));
  $("#backupButton")?.addEventListener('click',()=>Store.exportJson());
  $("#exportExcelButton")?.addEventListener('click',exportExcel);
  $("#excelInput")?.addEventListener('change',handleExcel);
 
}

async function deleteRecord(collection,id){
  if(!currentOperator){toast('Elegí el responsable antes de eliminar.',false);return}
  if(!confirm('¿Mover este registro a la papelera? Se conserva y se puede restaurar.')) return;
  try{await Store.remove(collection,id,currentOperator,'Baja lógica confirmada');toast('El movimiento se encuentra en la papelera.');refresh()}catch(e){toast(e.message,false)}
}
async function restoreRecord(collection,id){try{await Store.restore(collection,id,currentOperator);toast('Restaurado con éxito.');refresh()}catch(e){toast(e.message,false)}}
function selectedTrash(){return [...document.querySelectorAll('.trash-select:checked')].map(x=>({collection:x.dataset.collection,id:x.dataset.id}));}
async function restoreSelectedTrash(){const items=selectedTrash();if(!items.length){toast('Seleccioná al menos un elemento.',false);return}if(!currentOperator){toast('Elegí responsable.',false);return}try{await Store.restoreMany(items,currentOperator);toast('Restaurado con éxito.');refresh()}catch(e){toast(e.message,false)}}
async function purgeSelectedTrash(){const items=selectedTrash();if(!items.length){toast('Seleccioná al menos un elemento.',false);return}if(!currentOperator){toast('Elegí responsable.',false);return}if(!confirm(`¿Eliminar definitivamente ${items.length} elemento(s)? Esta acción no se puede deshacer.`))return;try{await Store.purgeTrashMany(items,currentOperator);toast('Elementos eliminados definitivamente.');refresh()}catch(e){toast(e.message,false)}}
async function purgeOneTrash(collection,id){if(!currentOperator){toast('Elegí responsable.',false);return}if(!confirm('¿Eliminar definitivamente este elemento? Esta acción no se puede deshacer.'))return;try{await Store.purgeTrashItem(collection,id,currentOperator);toast('Eliminado definitivamente.');refresh()}catch(e){toast(e.message,false)}}

async function completeTask(id){try{await Store.completeTask(id,currentOperator);toast('Recordatorio marcado como realizado.');refresh()}catch(e){toast(e.message,false)}}

async function saveHourCell(input){
 if(!currentOperator){toast('Elegí responsable antes de cargar horas.',false);input.blur();return}
 const td=input.closest('td'); const date=td?.dataset.hourDate, employeeId=td?.dataset.employee; if(!date||!employeeId)return;
 const employee=Store.get('employees',employeeId); if(!employee)return;
 const existing=Store.list('hours',period,branch).find(x=>x.employeeId===employeeId&&x.date===date);
 const value=input.value.trim();
 try{
   if(!value){if(existing) await Store.remove('hours',existing.id,currentOperator,'Borrado de celda de horas');}
   else {
     const normalized=value.replace(',','.');
     const isStatus=/^(f|franco|si|no)$/i.test(normalized);
     const hours=isStatus?0:Number(normalized);
     if(!isStatus && (!Number.isFinite(hours)||hours<0||hours>24)) throw new Error('Ingresá horas entre 0 y 24, o F / franco / SI / NO.');
     const displayValue=isStatus?normalized.toUpperCase():hours;
     const data={period,date,branch:employee.branch,employeeId,employee:employee.name,hours,displayValue,status:isStatus?normalized.toLowerCase():'',advance:existing?.advance||0,merchandise:existing?.merchandise||0,holiday:existing?.holiday||'no',salaryCost:hours*Number(employee.hourlyRate||0),notes:existing?.notes||''};
     if(existing) await Store.update('hours',existing.id,data,currentOperator,'Edición directa de planilla');
     else await Store.add('hours',data,currentOperator,'Carga directa de planilla');
   }
   toast('Celda guardada y auditada.');
   if(input.dataset.advance==='1'){delete input.dataset.advance;const next=input.closest('td')?.nextElementSibling?.querySelector('input');if(next){next.focus();next.select();}else refresh();} else refresh();
 }catch(e){toast(e.message,false)}
}

async function saveCashCell(input){
 if(!currentOperator){toast('Elegí responsable antes de cargar caja.',false);return}
 const td=input.closest('td'); const date=td?.dataset.date, type=td?.dataset.type, concept=td?.dataset.concept; if(!date||!type||!concept)return;
 const existing=Store.list('cash',period,branch).find(x=>x.date===date&&x.type===type&&(x.concept||'Sin concepto')===concept);
 const value=input.value.trim();
 try{
   if(!value){if(existing) await Store.remove('cash',existing.id,currentOperator,'Borrado de celda de caja');}
   else {const amount=Number(value.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<0)throw new Error('Ingresá un importe válido.');const data={period,date,branch:type?branch:'General',type,concept,amount,expected:existing?.expected||0,notes:existing?.notes||''};if(existing)await Store.update('cash',existing.id,data,currentOperator,'Edición directa de planilla de caja');else await Store.add('cash',data,currentOperator,'Carga directa de planilla de caja');}
   toast('Importe guardado y auditado.'); refresh();
 }catch(e){toast(e.message,false)}
}

function addCashConcept(type){
 if(!currentOperator){toast('Elegí responsable antes de agregar un concepto.',false);return}
 const concept=prompt(type==='income'?'Nombre del cliente / concepto de ingreso:':'Nombre del proveedor / concepto de gasto:');
 if(!concept?.trim())return;
 const date=today(); const data={period,date,branch:branch==='General'?CONFIG.branches[0]:branch,type,concept:concept.trim(),amount:0,expected:0,notes:''};
 Store.add('cash',data,currentOperator,'Alta de concepto para planilla de caja').then(()=>{toast('Concepto agregado a la planilla.');refresh()}).catch(e=>toast(e.message,false));
}
async function editEmployeeAdjustment(employeeId,field){
 if(!currentOperator){toast('Elegí responsable.',false);return}
 const employee=Store.get('employees',employeeId);if(!employee)return;
 const type=field==='advance'?'advance':'merchandise';
 const label=type==='advance'?'adelantos / vales':'mercadería';
 const existing=Store.list('employeeDebts',period,branch).find(x=>x.employeeId===employeeId&&x.type===type);
 const current=Number(existing?.amount||0); const raw=prompt(`Monto mensual de ${label} para ${employee.name}:`,String(current)); if(raw===null)return;
 const amount=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<0){toast('Ingresá un monto válido.',false);return}
 try{const data={period,branch:employee.branch,employeeId,employee:employee.name,type,amount};if(existing)await Store.update('employeeDebts',existing.id,data,currentOperator,`Edición de ${label}`);else await Store.add('employeeDebts',data,currentOperator,`Carga de ${label}`);toast(`${label} actualizado y auditado.`);refresh()}catch(e){toast(e.message,false)}
}

function openLiquidation(employeeId){
  const e=Store.get('employees',employeeId); if(!e)return; const rows=Store.list('hours',period,branch).filter(x=>x.employeeId===employeeId); const debts=Store.list('employeeDebts',period,branch).filter(x=>x.employeeId===employeeId), hours=rows.reduce((s,x)=>s+Number(x.hours||0),0), holidays=rows.filter(x=>x.holiday==='yes').reduce((s,x)=>s+Number(x.hours||0),0), advance=rows.reduce((s,x)=>s+Number(x.advance||0),0)+debts.filter(x=>x.type==='advance').reduce((s,x)=>s+Number(x.amount||0),0), merchandise=rows.reduce((s,x)=>s+Number(x.merchandise||0),0)+debts.filter(x=>x.type==='merchandise').reduce((s,x)=>s+Number(x.amount||0),0);
  $("#liquidationBody").innerHTML=`<div class="liquidation-grid"><div><span>Empleado</span><b>${esc(e.name)}</b></div><div><span>Horas normales</span><b>${hours-holidays}</b></div><div><span>Horas feriado</span><b>${holidays}</b></div><div><span>Adelantos</span><b>${money(advance)}</b></div><div><span>Mercadería</span><b>${money(merchandise)}</b></div></div><label class="field">Valor hora<input id="liqRate" type="number" min="0" step="0.01" value="${Number(e.hourlyRate||0)}"></label><label class="field">Valor hora feriado<input id="liqHolidayRate" type="number" min="0" step="0.01" value="${Number(e.hourlyRate||0)*2}"></label><div id="liqTotal" class="liq-total"></div><div class="modal-footer"><button class="secondary-button" data-close-liquidation>Cancelar</button><button class="primary-button" id="saveLiquidation">Totalizar sueldo</button></div>`;
  const calc=()=>{const r=Number($('#liqRate').value||0),hr=Number($('#liqHolidayRate').value||0),gross=(hours-holidays)*r+holidays*hr,net=gross-advance-merchandise;$('#liqTotal').innerHTML=`<b>Sueldo bruto: ${money(gross)}</b><b>${net>=0?'A cobrar':'Deuda a favor de Blunno'}: ${money(Math.abs(net))}</b>`;return{r,hr,gross,net}};$('#liqRate').oninput=calc;$('#liqHolidayRate').oninput=calc;calc();$('#saveLiquidation').onclick=async()=>{try{const c=calc();const liq=await Store.add('liquidations',{period,branch,employeeId,employee:e.name,normalHours:hours-holidays,holidayHours:holidays,hourlyRate:c.r,holidayRate:c.hr,advance,merchandise,gross:c.gross,net:c.net,responsible:currentOperator},currentOperator,'Totalización de sueldo');const blob=createSimplePDF('Liquidación de sueldo',`${e.name} · ${periodLabel(period)} · ${branch}`,[['Empleado',e.name],['Horas normales',number(hours-holidays)],['Horas feriado',number(holidays)],['Valor hora',money(c.r)],['Valor feriado',money(c.hr)],['Adelantos',money(advance)],['Mercadería',money(merchandise)],['Sueldo bruto',money(c.gross)],['Neto / a cobrar',money(c.net)],['Responsable',currentOperator]],'La liquidación queda registrada en el historial de Blunno.');const name=`liquidacion-${e.name.replace(/\s+/g,'-').toLowerCase()}-${period}.pdf`;if(blob){await Store.add('files',{name,sector:'Liquidaciones',period,branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),dataUrl:await blobToDataURL(blob)},currentOperator,'PDF de liquidación generado');$('#liquidationModal').classList.add('hidden');showPdfSuccess('Liquidación guardada correctamente',`La liquidación de ${e.name} fue registrada y auditada.`,`<b>${name}</b><span>Responsable: ${esc(currentOperator)} · ${new Date().toLocaleString('es-AR')}</span>`,blob,name)}else{$('#liquidationModal').classList.add('hidden');toast('Sueldo totalizado y auditado.');}refresh()}catch(err){toast(err.message,false)}};document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden'));$('#liquidationModal').classList.remove('hidden');
}

function showDetail(collection,id){const x=Store.get(collection,id);if(!x)return;$('#detailTitle').textContent=collection==='invoices'?'Detalle de factura':'Detalle';$('#detailBody').innerHTML=`<div class="detail-grid">${Object.entries(x).filter(([k])=>!['id','deleted'].includes(k)).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(typeof v==='object'?JSON.stringify(v):v)}</b></div>`).join('')}</div>`;$('#detailModal').classList.remove('hidden')}

function openPeriodModal(){const list=Store.db.periods.sort((a,b)=>b.id.localeCompare(a.id));$('#periodBody').innerHTML=`<div class="period-create"><label class="field">Ir a período<input id="periodInput" type="month" value="${period}"></label><button class="primary-button" id="goPeriod">Abrir</button></div>${list.map(p=>`<button class="period-row" data-select-period="${p.id}"><b>${periodLabel(p.id)}</b><span class="status-pill ${p.status==='closed'?'muted':'success'}">${p.status==='closed'?'CERRADO':'ABIERTO'}</span></button>`).join('')}`;$('#periodModal').classList.remove('hidden');$('#goPeriod').onclick=()=>{period=$('#periodInput').value;Store.setPeriod(period);$('#periodModal').classList.add('hidden');refresh()};document.querySelectorAll('[data-select-period]').forEach(b=>b.onclick=()=>{period=b.dataset.selectPeriod;$('#periodModal').classList.add('hidden');refresh()})}

async function openCloseConfirm(){
 if(!currentOperator){toast('Elegí responsable antes del cierre.',false);return}
 const s=Store.summary(period,branch);
 if(Store.periodIsClosed(period,branch)){toast('Este perfil ya está cerrado.');return}
 const pending=Store.list('invoices',period,branch).filter(x=>x.status!=='paid');
 const blockers=[];
 if(!period||!/^[0-9]{4}-[0-9]{2}$/.test(period)) blockers.push('Período inválido.');
 if(!branch) blockers.push('Perfil inválido.');
 if(blockers.length){toast(blockers.join(' '),false);return}
 const checks=[
  ['Caja diaria revisada',`${s.cashCount} movimientos · control ${money(s.cashControl)}`],
  ['Ingresos revisados',money(s.income)],
  ['Proveedores / facturas revisados',`${s.invoiceCount} facturas · ${money(s.providers)}`],
  ['Gastos del local revisados',`${s.expenseCount} registros · ${money(s.localExpense)}`],
  ['Inversiones revisadas',`${s.investmentCount} registros · ${money(s.investment)}`],
  ['Horas y liquidaciones revisadas',`${number(s.hours)} horas · ${s.liquidationCount} liquidaciones`],
  ['Facturas pendientes identificadas',pending.length?`${pending.length} pendientes · ${money(pending.reduce((a,x)=>a+Number(x.amount||0),0))}`:'Sin pendientes'],
  ['Resultado revisado',money(s.result)]
 ];
 $('#closeConfirmBody').innerHTML=`<div class="close-summary"><div><span>Período</span><b>${periodLabel(period)}</b></div><div><span>Perfil</span><b>${esc(branch)}</b></div><div><span>Resultado</span><b>${money(s.result)}</b></div><div><span>Siguiente período</span><b>${periodLabel(nextPeriod(period))}</b></div></div><div class="close-preflight">${checks.map((c,i)=>`<label><input type="checkbox" data-close-check="${i}"> <span><b>${esc(c[0])}</b><small>${esc(c[1])}</small></span></label>`).join('')}</div>${pending.length?`<div class="notice warning">Hay facturas pendientes. No bloquea el cierre, pero quedarán registradas en la versión cerrada.</div>`:''}<label class="field">Observaciones / diferencias<textarea id="closeObservation" rows="3" placeholder="Dejá constancia de diferencias o aclaraciones."></textarea></label><button class="primary-button full-button" id="confirmCloseBtn">Confirmar cierre y generar PDF</button>`;
 $('#closeConfirmModal').classList.remove('hidden');
 $('#confirmCloseBtn').onclick=async()=>{
   const checks=[...document.querySelectorAll('[data-close-check]')];
   if(checks.some(x=>!x.checked)){toast('Debés confirmar todos los puntos del control previo.',false);return}
   const observations=$('#closeObservation').value.trim();
   try{
     const closure=await Store.closePeriod(period,nextPeriod(period),currentOperator,s,observations,checks.map((x,i)=>({index:i,confirmed:true,at:now()})));
     $('#closeConfirmModal').classList.add('hidden');refresh();await generateClosurePDF(closure);
   }catch(e){toast(e.message,false)}
 };
}
async function openReopenConfirm(){const reason=prompt('Motivo obligatorio para reabrir el período:');if(!reason?.trim())return;try{await Store.reopenPeriod(period,branch,currentOperator,reason);toast('Período reabierto y auditado.');refresh()}catch(e){toast(e.message,false)}}

async function generateClosurePDF(closure){
 if(!window.jspdf?.jsPDF){toast('No se puede generar el PDF porque la librería PDF no está disponible.',false);return;}
 const {jsPDF}=window.jspdf,s=closure.summary||{};const doc=new jsPDF({unit:'mm',format:'a4'});let y=18;doc.setFontSize(18);doc.text('DISTRIBUIDORA BLUNNO',15,y);y+=9;doc.setFontSize(13);doc.text('CIERRE MENSUAL',15,y);y+=7;doc.setFontSize(9);doc.text(`Período: ${periodLabel(closure.period)}`,15,y);y+=6;doc.text(`Sucursal / perfil: ${closure.branch}`,15,y);y+=6;doc.text(`Versión: ${closure.version}`,15,y);y+=6;doc.text(`Responsable: ${closure.responsible}`,15,y);y+=6;doc.text(`Fecha y hora: ${new Date(closure.closedAt).toLocaleString('es-AR')}`,15,y);y+=9;doc.line(15,y,195,y);y+=8;const lines=[['Ingresos',money(s.income)],['Gastos de caja',money(s.cashExpense)],['Gastos del local',money(s.localExpense)],['Proveedores facturados',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Control de caja',money(s.cashControl)]];doc.setFontSize(10);for(const [a,b] of lines){doc.setFont(undefined,'bold');doc.text(a,20,y);doc.setFont(undefined,'normal');doc.text(b,185,y,{align:'right'});doc.line(18,y+2,190,y+2);y+=9;}y+=5;doc.setFontSize(8);doc.text(`Observaciones: ${closure.observations||'Sin observaciones.'}`,15,y,{maxWidth:180});y+=12;doc.text('Documento generado por Control Empresarial Blunno. Las modificaciones posteriores generan nueva versión y mantienen auditoría.',15,y,{maxWidth:180});const blob=doc.output('blob');const dataUrl=await blobToDataURL(blob);const safe=`cierre-${closure.period}-${closure.branch.replace(/\s+/g,'-').toLowerCase()}-v${closure.version}.pdf`;let url=null;try{url=await uploadFile(`archivos/${closure.period}/${closure.branch}/cierres/${safe}`,blob,'application/pdf')}catch(e){console.warn(e)};const existing=Store.db.files.find(x=>x.name===safe&&!x.deleted);if(!existing)await Store.add('files',{name:safe,sector:'Cierre mensual',period:closure.period,branch:closure.branch,responsible:closure.responsible,mime:'application/pdf',createdAt:now(),dataUrl:url?null:dataUrl,url,storagePath:url?`archivos/${closure.period}/${closure.branch}/cierres/${safe}`:''},closure.responsible,'Archivo de cierre generado');showPdfSuccess('¡Cierre de mes realizado correctamente!',`El cierre de ${periodLabel(closure.period)} quedó registrado y documentado como versión ${closure.version}.`,`<b>${safe}</b><span>Perfil: ${esc(closure.branch)} · Responsable: ${esc(closure.responsible)} · ${new Date(closure.closedAt).toLocaleString('es-AR')}</span><span>${esc(closure.observations||'Sin observaciones.')}</span>`,blob,safe);
}
const blobToDataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
const downloadBlob=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
const download=(name,data,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};

function showPdfSuccess(title,description,meta,blob,name){pdfDownloadBlob=blob;pdfDownloadName=name;$('#pdfSuccessTitle').textContent=title;$('#pdfSuccessDescription').textContent=description;$('#pdfSuccessMeta').innerHTML=meta||'';$('#pdfSuccessModal').classList.remove('hidden');}
function closePdfSuccess(){$('#pdfSuccessModal').classList.add('hidden');pdfDownloadBlob=null;}
function createSimplePDF(title,subtitle,rows,footer=''){if(!window.jspdf?.jsPDF){toast('La librería PDF no está disponible.',false);return null}const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});let y=18;doc.setFontSize(17);doc.text('DISTRIBUIDORA BLUNNO',15,y);y+=9;doc.setFontSize(12);doc.text(title,15,y);y+=7;doc.setFontSize(9);doc.text(subtitle,15,y);y+=10;doc.setDrawColor(220);doc.line(15,y,195,y);y+=8;doc.setFontSize(9);for(const [a,b] of rows){if(y>275){doc.addPage();y=18}doc.setFont(undefined,'bold');doc.text(String(a),18,y);doc.setFont(undefined,'normal');doc.text(String(b),190,y,{align:'right'});doc.line(18,y+2,190,y+2);y+=8}if(footer){y=Math.min(y+8,280);doc.setFontSize(7);doc.text(footer,15,y,{maxWidth:180})}return doc.output('blob')}
async function generateAndShowViewPDF(type){const s=Store.summary(period,branch);let rows=[];let title='Documento BLUNNO',desc='Documento generado desde Control Empresarial Blunno.';if(type==='cash'){title='Caja diaria';desc=`Resumen de caja de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Saldo inicial',money(getCashOpening())],['Ingresos',money(s.income)],['Gastos caja',money(s.cashExpense)],['Saldo / resultado de caja',money(s.income-s.cashExpense)],['Control esperado',money(s.cashControl)],['Responsable',currentOperator||'—']]}else if(type==='invoices'){const inv=Store.list('invoices',period,branch),total=inv.reduce((a,x)=>a+Number(x.amount||0),0),paid=inv.reduce((a,x)=>a+Number(x.paidAmount||0),0);title='Resumen de facturas';desc=`Facturas de ${periodLabel(period)} · ${branch}`;rows=[['Documentos',String(inv.length)],['Total facturado',money(total)],['Pagado',money(paid)],['Pendiente',money(total-paid)],['Proveedores con facturas',String(new Set(inv.map(x=>x.provider)).size)],['Responsable',currentOperator||'—']]}else if(type==='hours'){const hs=Store.list('hours',period,branch);title='Planilla de horas';desc=`Horas de ${periodLabel(period)} · ${branch}`;rows=[['Empleados con carga',String(new Set(hs.map(x=>x.employeeId)).size)],['Horas normales',number(hs.reduce((a,x)=>a+Number(x.hours||0),0))],['Adelantos',money(hs.reduce((a,x)=>a+Number(x.advance||0),0))],['Mercadería',money(hs.reduce((a,x)=>a+Number(x.merchandise||0),0))],['Feriado',number(hs.filter(x=>x.holiday==='yes').reduce((a,x)=>a+Number(x.hours||0),0))],['Liquidaciones',String(Store.list('liquidations',period,branch).length)],['Responsable',currentOperator||'—']]}else if(type==='expenses'){const ex=Store.list('expenses',period,branch),total=ex.reduce((a,x)=>a+Number(x.amount||0),0);title='Gastos por categoría';desc=`Gastos del local de ${periodLabel(period)} · ${branch}`;rows=[['Movimientos',String(ex.length)],['Total',money(total)],...CONFIG.expenseCategories.map(c=>[c,money(ex.filter(x=>x.category===c).reduce((a,x)=>a+Number(x.amount||0),0))]).filter(x=>x[1]!=='$0'),['Responsable',currentOperator||'—']]}else if(type==='investments'){const inv=Store.list('investments',period,branch),total=inv.reduce((a,x)=>a+Number(x.amount||0),0);title='Gastos de inversión';desc=`Inversiones de ${periodLabel(period)} · ${branch}`;rows=[['Movimientos',String(inv.length)],['Total invertido',money(total)],['Responsable',currentOperator||'—']]}else if(type==='results'){title='Resultados mensuales';desc=`Resumen económico de ${periodLabel(period)} · ${branch}`;rows=[['Ingresos',money(s.income)],['Gastos caja',money(s.cashExpense)],['Gastos del local',money(s.localExpense)],['Proveedores',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Responsable',currentOperator||'—']]}else if(type==='compare'){const a=Store.summary(compareA,branch),b=Store.summary(compareB,branch);title='Comparativa de períodos';desc=`${periodLabel(compareA)} vs ${periodLabel(compareB)} · ${branch}`;rows=[['Ingresos A / B',`${money(a.income)} / ${money(b.income)}`],['Gastos A / B',`${money(a.totalExpenses)} / ${money(b.totalExpenses)}`],['Resultado A / B',`${money(a.result)} / ${money(b.result)}`],['Proveedores A / B',`${money(a.providers)} / ${money(b.providers)}`],['Inversiones A / B',`${money(a.investment)} / ${money(b.investment)}`],['Horas A / B',`${number(a.hours)} / ${number(b.hours)}`]]}else return;const blob=createSimplePDF(title,desc,rows,'Generado y auditado por Control Empresarial Blunno.');if(!blob)return;const name=`${type}-blunno-${period}-${branch.replace(/\s+/g,'-').toLowerCase()}.pdf`;showPdfSuccess('PDF listo para descargar',desc,`<b>${name}</b><span>Responsable: ${esc(currentOperator||'—')} · ${new Date().toLocaleString('es-AR')}</span>`,blob,name);try{const dataUrl=await blobToDataURL(blob);await Store.add('files',{name,sector:title,period,branch,responsible:currentOperator||'—',mime:'application/pdf',createdAt:now(),dataUrl},currentOperator||'Usuario local','Documento PDF generado')}catch(e){console.warn(e)}}
function getCashOpening(){const id=`cash-opening-${period}-${branch}`;return Number(Store.db.settings.find(x=>x.id===id)?.amount||0)}
async function editCashOpening(){if(!currentOperator){toast('Elegí responsable antes de modificar el saldo inicial.',false);return}const current=getCashOpening();const raw=prompt(`Saldo con el que arranca la caja de ${periodLabel(period)} · ${branch}:`,String(current));if(raw===null)return;const amount=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount))return toast('Monto inválido.',false);const id=`cash-opening-${period}-${branch}`;const old=Store.db.settings.find(x=>x.id===id);try{const data={id,period,branch,amount,responsible:currentOperator,updatedAt:now()};if(old)await Store.update('settings',id,data,currentOperator,'Actualización de saldo inicial de caja');else await Store.add('settings',data,currentOperator,'Carga de saldo inicial de caja');toast('Saldo inicial guardado y auditado.');refresh()}catch(e){toast(e.message,false)}}
async function quickInvoiceSave(){if(!currentOperator){toast('Elegí responsable antes de cargar facturas.',false);return}if(branch==='General'){toast('Para cargar una factura elegí una sucursal concreta.',false);return}const provider=$('#quickInvoiceProvider')?.value.trim(), amount=Number(($('#quickInvoiceAmount')?.value||'').replace(/\./g,'').replace(',','.')), operationDate=$('#quickInvoiceDate')?.value||today(), number=$('#quickInvoiceNumber')?.value.trim()||'';if(!provider){toast('Indicá el proveedor.',false);return}if(!amount||amount<0){toast('Indicá un importe válido.',false);return}const master=Store.list('providers').find(x=>x.name.toLowerCase()===provider.toLowerCase())||Store.list('providers').find(x=>x.name.toLowerCase().startsWith(provider.toLowerCase()));try{const data={provider:master?.name||provider,number,operationDate,loadDate:now(),dueDate:operationDate,branch,amount,paidAmount:0,status:'pending',period:operationDate.slice(0,7),notes:'Carga rápida'};await Store.add('invoices',data,currentOperator,'Carga rápida de factura');toast('Factura cargada correctamente.');refresh()}catch(e){toast(e.message,false)}}
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
 await Store.add('files',{name,sector:'Exportación Excel',period,branch,responsible:currentOperator,mime:blob.type,createdAt:now(),dataUrl,url,storagePath:url?`archivos/${period}/${branch}/exportaciones/${name}`:''},currentOperator,'Excel generado y archivado');
 downloadBlob(blob,name); toast('Excel exportado y archivado.');
}

function checkReminders(){const due=Store.list('tasks').filter(x=>x.status!=='completed').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`))[0];if(!due)return;const nowD=new Date(),d=new Date(`${due.dueDate}T${due.dueTime||'23:59'}:00`);if(d<=nowD||due.dueDate===today()){$('#reminderTitle').textContent=due.priority==='urgent'?'⚠ RECORDATORIO URGENTE':'🔔 TENÉS UN RECORDATORIO';$('#reminderText').textContent=due.title;$('#reminderMeta').textContent=`📅 ${dateLabel(due.dueDate)} — ${due.dueTime||'sin hora'} · 👤 ${due.responsible}`;$('#reminderModal').classList.remove('hidden');$('#reminderDone').onclick=()=>completeTask(due.id);}}

function agentSay(html,who='bot'){
  const box=$('#agentMessages');
  const key=`blunno-agent-chat-${agentPerson||'sin-usuario'}`;
  try{const h=JSON.parse(localStorage.getItem(key)||'[]');h.push({who,html,at:now()});localStorage.setItem(key,JSON.stringify(h.slice(-160)))}catch(e){}
  if(!box)return;
  box.insertAdjacentHTML('beforeend',`<div class="agent-message ${who}">${html}</div>`);
  box.scrollTop=box.scrollHeight;
}
function rememberAgentPerson(p){
  if(!CONFIG.responsiblePeople.includes(p))return;
  agentPerson=p; setOperator(p); localStorage.setItem('blunno-agent-person',p);
  const el=$('#agentCurrentPerson');if(el)el.textContent=p;
  agentSay(`<b>Agente BLUNNO</b><span>Perfecto, ${esc(p)}. Estoy operando como <b>${esc(p)}</b>. Podés hablarme o escribirme normalmente.</span>`);
}
function agentText(){
  const input=$('#agentInput');const text=input?.value.trim();if(!text)return;
  input.value='';
  if(!agentPerson){agentSay('<b>Agente BLUNNO</b><span>Primero elegí si estoy hablando con Agus, Nico, Luz o Flor.</span>');return;}
  agentSay(`<b>${esc(agentPerson)}</b><span>${esc(text)}</span>`,'user');
  processAgent(text);
}
function parseMoney(text){
  const rawText=String(text||'').replace(/\$/g,'');
  const matches=[...rawText.matchAll(/(?:^|\s)(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?=\s*(?:pesos?|ars)?(?:\s|$))/gi)];
  if(!matches.length)return null;
  const raw=matches[matches.length-1][1].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
  const n=Number(raw);return Number.isFinite(n)?n:null;
}
function normalizeAgentText(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!]/g,'').replace(/\s+/g,' ').trim()}
function detectBranch(text){
  const l=normalizeAgentText(text);
  return CONFIG.branches.find(b=>l.includes(normalizeAgentText(b))) || (l.includes('general')?'General':null);
}
function detectPeriod(text){
  const l=normalizeAgentText(text);
  const months={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',setiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};
  const ym=l.match(/\b(20\d{2})[-\/]?(0[1-9]|1[0-2])\b/);if(ym)return `${ym[1]}-${ym[2]}`;
  for(const [name,num] of Object.entries(months)){if(l.includes(name)){const y=(l.match(/\b(20\d{2})\b/)||[])[1]||period.slice(0,4);return `${y}-${num}`;}}
  if(/este mes|mes actual/.test(l))return period;
  if(/mes pasado|ultimo mes/.test(l))return prevPeriod(period);
  if(/proximo mes|siguiente mes/.test(l))return nextPeriod(period);
  return period;
}
function dateFromAgent(text, fallback=today()){
  const l=normalizeAgentText(text);
  const d=l.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](20\d{2}))?\b/);
  if(d){const y=d[3]||fallback.slice(0,4);return `${y}-${String(d[2]).padStart(2,'0')}-${String(d[1]).padStart(2,'0')}`;}
  if(l.includes('hoy'))return today();
  const x=new Date(`${today()}T12:00:00`);
  if(l.includes('anteayer')){x.setDate(x.getDate()-2);return x.toISOString().slice(0,10)}
  if(l.includes('ayer')){x.setDate(x.getDate()-1);return x.toISOString().slice(0,10)}
  if(l.includes('pasado manana')){x.setDate(x.getDate()+2);return x.toISOString().slice(0,10)}
  if(l.includes('manana')){x.setDate(x.getDate()+1);return x.toISOString().slice(0,10)}
  return fallback;
}
function agentPriority(text){const l=normalizeAgentText(text);return /urgente|ya mismo|inmediatamente/.test(l)?'urgent':/alta|importante/.test(l)?'high':'normal'}
function agentFindProvider(text){
  const l=normalizeAgentText(text);
  const rows=Store.list('providers').filter(x=>x.active!==false);
  const explicit=(l.match(/(?:proveedor|de|a|para)\s+([a-z0-9][a-z0-9 .&'’()/-]{1,80})/i)||[])[1];
  const hay=[explicit,l].filter(Boolean);
  for(const source of hay){
    const s=normalizeAgentText(source);
    const exact=rows.find(x=>normalizeAgentText(x.name)===s);if(exact)return exact;
    const hits=rows.filter(x=>s.includes(normalizeAgentText(x.name))||normalizeAgentText(x.name).includes(s)).sort((a,b)=>normalizeAgentText(b.name).length-normalizeAgentText(a.name).length);
    if(hits[0])return hits[0];
  }
  return null;
}
function agentFindEmployee(text, scopeBranch='General'){
  const l=normalizeAgentText(text);let rows=Store.list('employees').filter(x=>x.active!==false);
  if(scopeBranch!=='General')rows=rows.filter(x=>x.branch===scopeBranch);
  const exact=rows.find(x=>l.includes(normalizeAgentText(x.name)));if(exact)return exact;
  const after=(l.match(/(?:empleado|de|para)\s+([a-z0-9 .'-]{2,60})/i)||[])[1];
  if(after){const a=normalizeAgentText(after);return rows.find(x=>a.includes(normalizeAgentText(x.name))||normalizeAgentText(x.name).includes(a))||null;}
  return null;
}
function agentPeriodAndBranch(text){return {period:detectPeriod(text),branch:detectBranch(text)||branch};}
function agentRowsSummary(collection,p,b){return Store.list(collection,p,b)}
function agentOpen(viewName){navigate(viewName);agentSay(`<b>✓ Listo</b><span>Te abrí <b>${esc(titles[viewName]||viewName)}</b>.</span>`)}
function agentQueryResult(title,html){agentSay(`<b>${esc(title)}</b><span>${html}</span>`)}
function agentList(items, empty='No hay registros.'){return items.length?items.slice(0,20).map(x=>`<small class="agent-line">${esc(x)}</small>`).join(''):`<small class="agent-line">${esc(empty)}</small>`}
function agentRecordLabel(x){return x.provider||x.concept||x.title||x.name||x.employee||x.id}
function agentConfirmationButtons(){
  const box=$('#agentMessages');if(!box)return;
  const card=box.lastElementChild;
  card?.querySelector('[data-agent-confirm]')?.addEventListener('click',confirmAgent);
  card?.querySelector('[data-agent-cancel]')?.addEventListener('click',()=>{pendingAgent=null;agentSay('<span>Acción cancelada. No se modificó ningún dato.</span>')});
}
function showAgentConfirmation(label){
  const p=pendingAgent;if(!p)return;
  const missing=p.missing||[];
  const missingHtml=missing.length?`<div class="notice warning">Falta definir: ${missing.map(esc).join(', ')}.</div>`:'';
  agentSay(`<div class="agent-confirm"><b>${esc(label)}</b><div class="notice">${esc(p.preview||'Revisá los datos antes de guardar.')}</div>${missingHtml}<pre>${esc(JSON.stringify(p.data,null,2))}</pre><div>${missing.length?'':`<button class="primary-button" data-agent-confirm>Confirmar y ejecutar</button>`}<button class="secondary-button" data-agent-cancel>Cancelar</button></div></div>`);
  agentConfirmationButtons();
}
function makePending(type,data,missing,preview){pendingAgent={type,data,missing:[...new Set(missing)],preview};showAgentConfirmation(`Preparar ${type==='invoice'?'factura':type==='expense'?'gasto':type==='investment'?'inversión':type==='cash'?'movimiento de caja':type==='hours'?'horas':type==='employee'?'empleado':type==='provider'?'proveedor':type==='invoicePayment'?'pago de factura':'recordatorio'}`)}
function pendingFillFromText(text){
  if(!pendingAgent?.missing?.length)return false;
  const l=normalizeAgentText(text),p=pendingAgent;
  if(p.missing.includes('sucursal concreta')){const b=detectBranch(text);if(b&&b!=='General'){p.data.branch=b;p.missing=p.missing.filter(x=>x!=='sucursal concreta')}}
  if(p.missing.includes('proveedor')){const v=agentFindProvider(text);if(v){p.data.provider=v.name;p.missing=p.missing.filter(x=>x!=='proveedor')}}
  if(p.missing.includes('empleado')){const e=agentFindEmployee(text,p.data.branch||branch);if(e){p.data.employee=e.name;p.data.employeeId=e.id;p.missing=p.missing.filter(x=>x!=='empleado')}}
  if(p.missing.includes('importe')){const n=parseMoney(text);if(n!==null){p.data.amount=n;p.missing=p.missing.filter(x=>x!=='importe')}}
  if(p.missing.includes('cantidad de horas')){const m=l.match(/(\d+(?:[,.]\d+)?)\s*horas?/);if(m){p.data.hours=Number(m[1].replace(',','.'));p.missing=p.missing.filter(x=>x!=='cantidad de horas')}}
  if(p.missing.includes('nombre del empleado')){const n=text.replace(/^(agrega|agreg[aá]|crea|crear|nuevo|nueva|empleado|personal)\s*/i,'').trim();if(n.length>=2){p.data.name=n;p.missing=p.missing.filter(x=>x!=='nombre del empleado')}}
  if(p.missing.includes('categoría')){const c=CONFIG.expenseCategories.find(x=>l.includes(normalizeAgentText(x)));if(c){p.data.category=c;p.missing=p.missing.filter(x=>x!=='categoría')}}
  if(p.missing.includes('fecha')){const d=dateFromAgent(text,null);if(d){p.data.date=d;p.data.period=d.slice(0,7);p.missing=p.missing.filter(x=>x!=='fecha')}}
  if(p.type==='invoice'&&p.data.branch&&p.data.operationDate){p.data.period=p.data.operationDate.slice(0,7)}
  if(!p.missing.length){showAgentConfirmation('Datos completos — listo para confirmar');return true}
  showAgentConfirmation('Falta completar un dato');return true;
}
function agentDateTime(text){const d=dateFromAgent(text,today()),m=String(text).match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);return {date:d,time:m?`${String(m[1]).padStart(2,'0')}:${m[2]}`:''}}
function agentProviderNameFromText(text){
  const l=normalizeAgentText(text);const rows=Store.list('providers').filter(x=>x.active!==false);
  const candidates=rows.filter(x=>l.includes(normalizeAgentText(x.name))).sort((a,b)=>normalizeAgentText(b.name).length-normalizeAgentText(a.name).length);
  return candidates[0]||null;
}
function agentEmployeeFromText(text,scopeBranch){return agentFindEmployee(text,scopeBranch)}
function agentSummary(p,b){
  const s=Store.summary(p,b);return `Perfil: <b>${esc(b)}</b> · ${periodLabel(p)} · ingresos ${money(s.income)} · gastos caja ${money(s.cashExpense)} · gastos del local ${money(s.localExpense)} · proveedores ${money(s.providers)} · inversiones ${money(s.investment)} · personal ${money(s.salary)} · resultado ${money(s.result)}.`;
}
async function processAgent(text){
  const l=normalizeAgentText(text);
  try{await Store.recordAudit('AGENT_QUERY','agent',{question:text},{view,period,branch},agentPerson,'Consulta realizada por Agente BLUNNO')}catch(e){}
  if(pendingAgent && /^(confirmar|confirma|si|sí|dale|hacerlo|ejecuta|ejecutalo|guardalo|guardar|ok|okay)$/i.test(l)){await confirmAgent();return}
  if(pendingAgent && /^(cancelar|cancela|no|anular|anula)$/i.test(l)){pendingAgent=null;agentSay('<span>Cancelado. No se modificó ningún dato.</span>');return}
  if(pendingAgent && pendingFillFromText(text))return;
  const ctx=agentPeriodAndBranch(text), scopeBranch=ctx.branch, scopePeriod=ctx.period;
  const nav={inicio:'dashboard',panel:'dashboard',dashboard:'dashboard',caja:'cash',facturas:'invoices',factura:'invoices',proveedores:'providers',proveedor:'providers',gastos:'expenses',inversiones:'investments',inversion:'investments',personal:'people',empleados:'people',horas:'hours',resultados:'results',comparativas:'compare',comparativa:'compare',recordatorios:'tasks',tareas:'tasks',archivos:'files',historial:'history',papelera:'trash',cierre:'close',agente:'agent'};
  const navKey=Object.keys(nav).find(k=>l.includes(k));
  if(/^(abr|mostrame|mostrar|lleva(me|nos)|ir a|entra(r)?|quiero ver|ver|pasame|pasame a)/.test(l)&&navKey){agentOpen(nav[navKey]);return;}
  if(/^(ayuda|que podes|que puedes|comandos|como te uso|que haces|en que me ayudas)/.test(l)){
    agentSay('<b>Agente BLUNNO</b><span>Puedo consultar y preparar acciones sobre caja, facturas, proveedores, gastos, inversiones, personal, horas, liquidaciones, recordatorios, archivos, resultados, comparativas y cierre. También puedo generar PDF, exportar Excel, hacer backup, abrir sectores y buscar registros. Toda modificación requiere confirmación y queda auditada.</span>');return;
  }
  if(/quien soy|con quien|responsable actual/.test(l)){agentQueryResult('Responsable',`Estás operando como <b>${esc(agentPerson)}</b>.`);return;}
  if(/^(prepara|preparame|prepará|preparame) .*cierre|^(cerrar|hace|hacer|confirmar|confirma) .*cierre/.test(l)){agentOpen('close');agentSay('<span>Te llevé al control previo de cierre. Ahí se revisan todos los puntos y el cierre requiere confirmación.</span>');return;}
  if(/pdf|documento.*pdf|gener[aá].*pdf/.test(l)){
    const type=/factura|proveedor/.test(l)?'invoices':/caja/.test(l)?'cash':/hora|personal|empleado/.test(l)?'hours':/gasto/.test(l)?'expenses':/inversion/.test(l)?'investments':/compar/.test(l)?'compare':/resultado|resumen/.test(l)?'results':null;
    if(type){await generateAndShowViewPDF(type);return;}
    agentSay('<span>Decime qué PDF querés: caja, facturas, gastos, inversiones, horas, resultados o comparativa.</span>');return;
  }
  if(/exporta|exportar|excel/.test(l)&&/excel/.test(l)){await exportExcel();agentSay('<span>✓ Excel generado y archivado.</span>');return;}
  if(/backup|respaldo|copia de seguridad/.test(l)){Store.exportJson();agentSay('<span>✓ Backup completo preparado.</span>');return;}
  if(/caja|saldo/.test(l)&&/(saldo|ingreso|egreso|gasto|resto|final|cuanto|cuánto)/.test(l)){
    const rows=agentRowsSummary('cash',scopePeriod,scopeBranch),inc=rows.filter(x=>x.type==='income').reduce((a,x)=>a+Number(x.amount||0),0),exp=rows.filter(x=>x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0);
    agentQueryResult('Caja',`${periodLabel(scopePeriod)} · ${esc(scopeBranch)} · ingresos ${money(inc)} · gastos ${money(exp)} · saldo neto ${money(inc-exp)} · movimientos ${rows.length}.`);return;
  }
  if(/(facturas?|proveedores?).*(pendiente|debo|deben|falta pagar|por pagar|sin pagar)|cuanto.*deb(o|emos).*proveedor/.test(l)){
    const pv=agentProviderNameFromText(text);let rows=Store.list('invoices',scopePeriod,scopeBranch).filter(x=>x.status!=='paid');
    if(pv)rows=rows.filter(x=>normalizeAgentText(x.provider)===normalizeAgentText(pv.name));
    const total=rows.reduce((a,x)=>a+Math.max(0,Number(x.amount||0)-Number(x.paidAmount||0)),0);
    agentQueryResult(pv?`Deuda con ${pv.name}`:'Facturas pendientes',`${rows.length} registros por ${money(total)} en ${periodLabel(scopePeriod)} · ${esc(scopeBranch)}.${agentList(rows.map(x=>`${x.provider} · pendiente ${money(Math.max(0,Number(x.amount||0)-Number(x.paidAmount||0)))} · ${dateLabel(x.operationDate||x.date)}`))}`);return;
  }
  if(/proveedores/.test(l)&&/(tenemos|lista|listar|todos|catalogo|catálogo|mostrar|mostrame)/.test(l)){
    const ps=Store.list('providers').filter(x=>x.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'es'));agentQueryResult('Catálogo de proveedores',agentList(ps.map(x=>x.name),'No hay proveedores cargados.'));return;
  }
  if(/facturas?/.test(l)&&/(mostrar|mostrame|lista|listar|historial|tenemos|hay)/.test(l)){
    const pv=agentProviderNameFromText(text);let inv=Store.list('invoices',scopePeriod,scopeBranch);if(pv)inv=inv.filter(x=>normalizeAgentText(x.provider)===normalizeAgentText(pv.name));const total=inv.reduce((a,x)=>a+Number(x.amount||0),0);agentQueryResult('Facturas',`${inv.length} facturas · total ${money(total)} · ${periodLabel(scopePeriod)} · ${esc(scopeBranch)}.${agentList(inv.map(x=>`${x.provider} · ${money(x.amount)} · ${dateLabel(x.operationDate||x.date)} · ${x.status||'pendiente'}`),'No hay facturas para ese período.')}}`);return;
  }
  if(/proveedor/.test(l)&&/(buscar|busca|tenemos|existe|mostra|mostrar|cuanto|cuánto|historial|facturas)/.test(l)){
    const p=agentProviderNameFromText(text)||agentFindProvider(l);if(!p){agentQueryResult('Proveedor','No encontré ese proveedor en el catálogo.');return;}
    const inv=Store.list('invoices',scopePeriod,scopeBranch).filter(x=>normalizeAgentText(x.provider)===normalizeAgentText(p.name));const total=inv.reduce((a,x)=>a+Number(x.amount||0),0);const debt=inv.reduce((a,x)=>a+Math.max(0,Number(x.amount||0)-Number(x.paidAmount||0)),0);
    agentQueryResult(p.name,`${inv.length} facturas · total ${money(total)} · pendiente ${money(debt)}.${agentList(inv.map(x=>`${x.provider} · ${money(x.amount)} · ${dateLabel(x.operationDate||x.date)} · ${x.status||'pendiente'}`))}`);return;
  }
  if(/(cuanto|cuánto|total|resumen|resultado|gastamos|ingresos|gastos|balance|neto)/.test(l)&&!/(factura|proveedor|caja)/.test(l)){agentQueryResult(`Resumen ${periodLabel(scopePeriod)}`,agentSummary(scopePeriod,scopeBranch));return;}
  if(/(empleados|personal)/.test(l)&&/(mostrar|mostrame|lista|listar|tenemos|quien|quienes)/.test(l)){
    const es=Store.list('employees').filter(x=>x.active!==false&&(scopeBranch==='General'||x.branch===scopeBranch));agentQueryResult('Personal',agentList(es.map(x=>`${x.name} · ${x.branch} · ${x.role||'sin puesto'}`),'No hay empleados en ese perfil.'));return;
  }
  if(/(horas|empleados|personal)/.test(l)&&/(cu[aá]nt|total|resumen|carg|trabaj|ficha|quien)/.test(l)){
    const emp=agentEmployeeFromText(text,scopeBranch);if(emp){const rows=Store.list('hours',scopePeriod,scopeBranch).filter(x=>x.employeeId===emp.id);const h=rows.reduce((a,x)=>a+Number(x.hours||0),0);agentQueryResult(`Horas de ${emp.name}`,`${number(h)} horas en ${periodLabel(scopePeriod)} · adelantos ${money(rows.reduce((a,x)=>a+Number(x.advance||0),0))} · mercadería ${money(rows.reduce((a,x)=>a+Number(x.merchandise||0),0))}.`);return;}
    const s=Store.summary(scopePeriod,scopeBranch);agentQueryResult('Horas',`${number(s.hours)} horas registradas en ${periodLabel(scopePeriod)} · ${esc(scopeBranch)}.`);return;
  }
  if(/(liquid|sueldo|salario)/.test(l)&&/(total|calcula|abr|mostrar|historial)/.test(l)){
    const emp=agentEmployeeFromText(text,scopeBranch);if(!emp){agentQueryResult('Liquidación','Decime el nombre del empleado para abrir su liquidación.');return;}openLiquidation(emp.id);agentSay(`<span>Te abrí la liquidación de <b>${esc(emp.name)}</b>. Revisá el valor hora y confirmá la totalización.</span>`);return;
  }
  if(/(tarea|recordatorio)/.test(l)&&/(pendiente|proxim|hoy|mostrar|listar|que tengo)/.test(l)){
    const rows=Store.list('tasks').filter(x=>x.status!=='completed').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`));agentQueryResult('Recordatorios',agentList(rows.map(x=>`${x.title} · ${dateLabel(x.dueDate)} ${x.dueTime||''} · ${x.responsible}`),'No tenés recordatorios pendientes.'));return;
  }
  if(/(completa|complet[aá]|termina|termin[aá]|marca).*?(tarea|recordatorio)/.test(l)){
    const rows=Store.list('tasks').filter(x=>x.status!=='completed');const q=l.replace(/.*?(tarea|recordatorio)\s*/,'').trim();const t=rows.find(x=>normalizeAgentText(x.title).includes(q)||q.includes(normalizeAgentText(x.title)));if(!t){agentQueryResult('Recordatorio','No encontré esa tarea.');return;}makePending('taskComplete',{id:t.id,title:t.title},[],`Marcar como completado: ${t.title}.`);return;
  }
  if(/(crear|cargar|agregar|registrar|anotar|poneme|guard[aá])/.test(l)&&/(recordatorio|tarea)/.test(l)){
    const title=text.replace(/.*?(recordatorio|tarea)\s*(para)?\s*/i,'').replace(/\b(mañana|manana|hoy|urgente)\b/gi,'').replace(/\b(?:a las?)\s*[0-2]?\d:[0-5]\d\b/gi,'').trim()||'Nueva tarea';const dt=agentDateTime(text);makePending('task',{title,dueDate:dt.date,dueTime:dt.time,priority:agentPriority(text),responsible:agentPerson,status:'pending',repeat:'none',notes:'Creado por Agente BLUNNO'},[],`Crear recordatorio para ${agentPerson} el ${dateLabel(dt.date)}${dt.time?' a las '+dt.time:''}.`);return;
  }
  if(/(pagar|registrar pago|abonar)/.test(l)&&/factura|proveedor/.test(l)){
    const pv=agentProviderNameFromText(text);let rows=Store.list('invoices',scopePeriod,scopeBranch).filter(x=>x.status!=='paid');if(pv)rows=rows.filter(x=>normalizeAgentText(x.provider)===normalizeAgentText(pv.name));const amount=parseMoney(text);if(rows.length!==1&&!pv){agentQueryResult('Pago de factura','Encontré varias facturas pendientes. Decime el proveedor o el número de factura.');return;}const inv=rows[0];if(!inv){agentQueryResult('Pago de factura','No encontré una factura pendiente para esos datos.');return;}const pay=amount===null?Math.max(0,Number(inv.amount||0)-Number(inv.paidAmount||0)):amount;const newPaid=Number(inv.paidAmount||0)+pay;makePending('invoicePayment',{id:inv.id,provider:inv.provider,number:inv.number||'',amount:pay,newPaid,total:Number(inv.amount||0),status:newPaid>=Number(inv.amount||0)?'paid':'partial'},[],`Registrar pago de ${money(pay)} a ${inv.provider}${inv.number?' · factura '+inv.number:''}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/factura/.test(l)){
    const provider=agentProviderNameFromText(text)||agentFindProvider(l),amount=parseMoney(text),dt=agentDateTime(text),missing=[];if(!provider)missing.push('proveedor');if(amount===null)missing.push('importe');if(scopeBranch==='General')missing.push('sucursal concreta');
    makePending('invoice',{provider:provider?.name||'',number:(text.match(/(?:nro|número|numero|n°|num\.?\s*factura)\s*[:#-]?\s*([A-Za-z0-9-]+)/i)||[])[1]||'',operationDate:dt.date,loadDate:now(),dueDate:dt.date,branch:scopeBranch==='General'?'':scopeBranch,amount:amount||0,paidAmount:0,status:'pending',period:dt.date.slice(0,7),notes:'Cargada por Agente BLUNNO'},missing,`${provider?.name||'Proveedor pendiente'} · ${money(amount||0)} · ${esc(scopeBranch==='General'?'sucursal pendiente':scopeBranch)} · movimiento ${dateLabel(dt.date)}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/gasto/.test(l)){
    const amount=parseMoney(text),dt=agentDateTime(text),missing=[];if(amount===null)missing.push('importe');if(scopeBranch==='General')missing.push('sucursal concreta');const category=CONFIG.expenseCategories.find(c=>l.includes(normalizeAgentText(c)));if(!category)missing.push('categoría');const concept=text.replace(/.*?gasto\s*/i,'').replace(/\$?\s*[\d.]+(?:,\d+)?\s*(pesos|peso|ars)?/i,'').trim()||'Gasto cargado por Agente BLUNNO';makePending('expense',{date:dt.date,period:dt.date.slice(0,7),branch:scopeBranch==='General'?'':scopeBranch,category:category||'',concept,amount:amount||0,document:'',notes:'Cargado por Agente BLUNNO'},missing,`${category||'Categoría pendiente'} · ${concept} · ${money(amount||0)} · ${esc(scopeBranch)}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/inversi[oó]n/.test(l)){
    const amount=parseMoney(text),dt=agentDateTime(text),missing=[];if(amount===null)missing.push('importe');if(scopeBranch==='General')missing.push('sucursal concreta');makePending('investment',{date:dt.date,period:dt.date.slice(0,7),branch:scopeBranch==='General'?'':scopeBranch,concept:text,amount:amount||0,document:'',notes:'Cargada por Agente BLUNNO'},missing,`Inversión · ${money(amount||0)} · ${esc(scopeBranch)}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/(ingreso|egreso|caja|resto)/.test(l)){
    const amount=parseMoney(text),dt=agentDateTime(text),missing=[];if(amount===null)missing.push('importe');if(scopeBranch==='General')missing.push('sucursal concreta');const type=/egreso|gasto|pago/.test(l)?'expense':'income';makePending('cash',{date:dt.date,period:dt.date.slice(0,7),branch:scopeBranch==='General'?'':scopeBranch,type,concept:text,amount:amount||0,expected:amount||0,notes:'Cargado por Agente BLUNNO'},missing,`${type==='income'?'Ingreso':'Egreso'} de caja · ${money(amount||0)} · ${esc(scopeBranch)}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/horas?/.test(l)){
    const emp=agentEmployeeFromText(text,scopeBranch),dt=agentDateTime(text),missing=[];const hourMatch=l.match(/(\d+(?:[,.]\d+)?)\s*horas?/);const hrs=hourMatch?Number(hourMatch[1].replace(',','.')):null;if(!emp)missing.push('empleado');if(hrs===null)missing.push('cantidad de horas');makePending('hours',{employee:emp?.name||'',employeeId:emp?.id||'',date:dt.date,hours:hrs||0,advance:0,merchandise:0,holiday:/feriado/.test(l)?'yes':'no',notes:'Cargadas por Agente BLUNNO'},missing,`${emp?.name||'Empleado pendiente'} · ${hrs||0} horas · ${dateLabel(dt.date)}.`);return;
  }
  if(/(agregar|crear|alta|nuevo|nueva)/.test(l)&&/(empleado|personal)/.test(l)){
    const name=text.replace(/.*?(empleado|personal)\s*(nuevo|nueva|que se llama|llamado|llamada)?\s*/i,'').replace(/\s+en\s+(mendiolaza|bodereau|derqui|unquillo|general).*$/i,'').trim();const missing=[];if(!name||name.length<2)missing.push('nombre del empleado');if(scopeBranch==='General')missing.push('sucursal concreta');makePending('employee',{name:name||'',branch:scopeBranch==='General'?'':scopeBranch,role:'',hourlyRate:0,active:true},missing,`Crear empleado ${name||'(falta nombre)'} en ${scopeBranch}.`);return;
  }
  if(/(agregar|crear|alta|nuevo|nueva)/.test(l)&&/proveedor/.test(l)){
    const name=text.replace(/.*?proveedor\s*(nuevo|nueva|que se llama|llamado|llamada)?\s*/i,'').trim();const missing=[];if(!name||name.length<2)missing.push('nombre del proveedor');makePending('provider',{name:name||'',active:true,master:false},missing,`Crear proveedor ${name||'(falta nombre)'}.`);return;
  }
  if(/(elimina|borrar|borra|manda|mand[aá]).*?(papelera|proveedor|factura|gasto|inversion|empleado|tarea)/.test(l)){
    const p=agentProviderNameFromText(text);if(p){makePending('delete',{collection:'providers',id:p.id,label:p.name},[],`Enviar proveedor ${p.name} a la papelera.`);return;}
    agentSay('<span>Para eliminar por voz necesito el nombre exacto del registro. No borro nada sin confirmación.</span>');return;
  }
  agentSay('<b>Agente BLUNNO</b><span>No ejecuté nada porque no pude interpretar la orden con seguridad. Podés decirla de otra forma; si falta un dato te lo voy a pedir antes de modificar.</span>');
}
async function confirmAgent(){
  if(!pendingAgent)return;
  const p=pendingAgent;
  try{
    if(p.missing?.length){agentSay(`<span>No puedo ejecutar todavía. Falta: ${p.missing.join(', ')}.</span>`);return;}
    if(p.type==='taskComplete'){await Store.update('tasks',p.data.id,{status:'completed',completedAt:now(),completedBy:agentPerson},agentPerson,'Tarea completada por Agente BLUNNO');pendingAgent=null;refresh();agentSay('<span>✓ Recordatorio completado y auditado.</span>');return;}
    if(p.type==='invoicePayment'){const inv=Store.get('invoices',p.data.id);if(!inv)throw new Error('La factura ya no está disponible.');const row=await Store.update('invoices',inv.id,{paidAmount:p.data.newPaid,status:p.data.status},agentPerson,'Pago registrado por Agente BLUNNO');pendingAgent=null;refresh();setTimeout(()=>agentSay(`<span>✓ Pago registrado para ${esc(row.provider)}. Queda ${money(Math.max(0,Number(row.amount||0)-Number(row.paidAmount||0)))} pendiente.</span>`),30);return;}
    if(p.type==='delete'){await Store.remove(p.data.collection,p.data.id,agentPerson,'Baja lógica confirmada por Agente BLUNNO');pendingAgent=null;refresh();agentSay('<span>✓ Registro enviado a la papelera. Se conserva la auditoría y puede restaurarse.</span>');return;}
    if(p.type==='task'){await Store.add('tasks',p.data,agentPerson,'Creación de recordatorio por Agente BLUNNO');pendingAgent=null;refresh();agentSay('<span>✓ Recordatorio creado y auditado.</span>');return;}
    const collection={provider:'providers',invoice:'invoices',investment:'investments',expense:'expenses',cash:'cash',hours:'hours',employee:'employees'}[p.type];
    if(!collection)throw new Error('Acción no disponible.');
    const data={...p.data};
    if(['invoice','expense','investment','cash'].includes(p.type)&&data.branch==='')throw new Error('Necesito una sucursal concreta para guardar este movimiento.');
    if(p.type==='invoice'){data.period=String(data.operationDate||today()).slice(0,7);data.loadDate=data.loadDate||now();data.dueDate=data.dueDate||data.operationDate||today();}
    if(p.type==='hours'){
      const emp=Store.get('employees',data.employeeId)||Store.list('employees').find(x=>normalizeAgentText(x.name)===normalizeAgentText(data.employee));if(!emp)throw new Error('No se encontró el empleado.');
      data.employeeId=emp.id;data.employee=emp.name;data.branch=emp.branch;data.period=String(data.date).slice(0,7);data.salaryCost=Number(data.hours||0)*Number(emp.hourlyRate||0);
    }
    if(p.type==='employee')data.createdByAgent=true;
    const row=await Store.add(collection,data,agentPerson,'Acción confirmada por Agente BLUNNO');pendingAgent=null;refresh();setTimeout(()=>{agentSay(`<b>✓ Acción ejecutada correctamente</b><span>${esc(collection)} quedó guardado con responsable ${esc(agentPerson)}, fecha/hora y auditoría completa.</span><button class="secondary-button" data-undo-agent="${row.id}" data-undo-collection="${collection}">↶ Deshacer esta acción</button>`);const box=$('#agentMessages');box?.lastElementChild?.querySelector('[data-undo-agent]')?.addEventListener('click',()=>undoAgent(collection,row.id));},30);
  }catch(e){agentSay(`<span class="text-red">No se pudo ejecutar: ${esc(e.message||'Error inesperado')}</span>`)}
}
async function undoAgent(collection,id){try{await Store.remove(collection,id,agentPerson||currentOperator,'Deshacer acción del Agente BLUNNO');toast('Acción revertida; la auditoría original se conserva.');refresh();setTimeout(()=>agentSay('<span>↶ La acción fue deshecha. El registro original y la reversión siguen en auditoría.</span>'),30)}catch(e){toast(e.message,false)}}
let speechRecognition=null;
function startSpeech(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Este navegador no ofrece reconocimiento de voz. Usá Chrome o Edge.',false);return;}
  if(speechRecognition){try{speechRecognition.stop()}catch(e){}speechRecognition=null;return;}
  const r=new SR();speechRecognition=r;r.lang='es-AR';r.continuous=false;r.interimResults=true;r.maxAlternatives=5;
  const btn=$('#agentMic');if(btn){btn.textContent='⏹';btn.title='Detener escucha';btn.classList.add('recording')}
  let finalText='';
  r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const part=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=part+' ';else interim+=part}const input=$('#agentInput');if(input)input.value=(finalText+interim).trim()};
  r.onend=()=>{if(btn){btn.textContent='🎙';btn.title='Dictar';btn.classList.remove('recording')}speechRecognition=null;const input=$('#agentInput');const t=input?.value.trim();if(t)agentText()};
  r.onerror=e=>{if(btn){btn.textContent='🎙';btn.title='Dictar';btn.classList.remove('recording')}speechRecognition=null;if(e.error!=='aborted'&&e.error!=='no-speech')toast(`No se pudo interpretar el audio (${e.error}).`,false)};
  try{r.start()}catch(e){speechRecognition=null;if(btn){btn.textContent='🎙';btn.classList.remove('recording')}toast('No se pudo iniciar el micrófono. Permití el acceso al micrófono.',false)}
}

function globalWire(){
 document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>navigate(b.dataset.view));
 $('#periodSelector').onclick=openPeriodModal;
 $('#branchSelector').onchange=e=>setBranch(e.target.value);
 $('#operatorSelector').onchange=e=>setOperator(e.target.value);
 $('#newRecordBtn').onclick=()=>{const map={dashboard:'cash',cash:'cash',providers:'invoice',invoices:'invoice',expenses:'expense',investments:'investment',people:'employee',hours:'hours',tasks:'task'};if(map[view])openModal(map[view]);else toast('Elegí un sector para crear un movimiento.',false)};
 $('#searchBtn').onclick=openSearch;

 $('#closeModalBtn')?.addEventListener('click',closeModal);
 $('#recordForm').addEventListener('submit',saveRecord);
 document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=closeModal);
 document.querySelectorAll('[data-close-period-modal]').forEach(b=>b.onclick=()=>$('#periodModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-detail]').forEach(b=>b.onclick=()=>$('#detailModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-reminder]').forEach(b=>b.onclick=()=>$('#reminderModal').classList.add('hidden'));
}

function openSearch(){const m=$('#searchModal');m.classList.remove('hidden');const input=$('#searchInput');input.value='';input.focus();const draw=()=>{const q=input.value.toLowerCase().trim();if(!q){$('#searchResults').innerHTML='<div class="empty-block">Escribí para buscar en proveedores, facturas, gastos, personal y auditoría.</div>';return}const sources=[...Store.list('providers').map(x=>({...x,_type:'Proveedor',_label:x.name})),...Store.list('employees').map(x=>({...x,_type:'Empleado',_label:x.name})),...Store.list('invoices').map(x=>({...x,_type:'Factura',_label:`${x.provider} ${x.number||''} ${x.amount||''}`})),...Store.list('expenses').map(x=>({...x,_type:'Gasto',_label:`${x.category} ${x.concept||''} ${x.amount||''}`}))];const found=sources.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).slice(0,30);$('#searchResults').innerHTML=found.map(x=>`<div class="search-result"><b>${esc(x._label)}</b><span>${esc(x._type)}</span></div>`).join('')||'<div class="empty-block">No encontramos coincidencias.</div>'};input.oninput=draw;draw();}

async function init(){
 currentOperator=localStorage.getItem('blunno-operator')||'';agentPerson=localStorage.getItem('blunno-agent-person')||currentOperator||'';if(agentPerson&&CONFIG.responsiblePeople.includes(agentPerson))currentOperator=agentPerson;branch=localStorage.getItem('blunno-branch')||'General';setOperator(currentOperator);connection();
 await Store.sync();
 globalWire();refresh();
}
init();
