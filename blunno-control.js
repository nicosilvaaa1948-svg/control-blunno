// ===== MAIN WEB · V30.1.19 SELECTOR Y EDICIÓN DE FACTURAS =====
(() => {

const { CONFIG, periodLabel, nextPeriod, prevPeriod, dateLabel, dateTimeLabel, today, now, daysInPeriod, isoDate, money, number, defaultMovementDate } = __BLUNNO_MODULES.config;
const { Store, CONTROL_START_PERIOD, periodIsFuture, periodIsStarted, periodStateLabel, isValidPeriod, assertResponsible, periodEditConfirmed, setPeriodEditConfirmed, sourceIdentity, providerAvailableInBranch, vaultClear, sectorForCollection } = __BLUNNO_MODULES.store;
const { firebaseEnabled, uploadFile } = __BLUNNO_MODULES.firebase;
const { formSchema, renderView, esc, auditForContext } = __BLUNNO_MODULES.views;
const { createSimplePDF } = __BLUNNO_MODULES.pdf;

const $ = s => document.querySelector(s);
const canonicalExpenseCategory = value => { const key=sourceIdentity(value); return CONFIG.expenseCategories.find(c=>sourceIdentity(c)===key)||""; };
const providersForBranch = selectedBranch => Store.list("providers").filter(provider=>provider.active!==false&&providerAvailableInBranch(provider,selectedBranch));
const content = $("#content");
let view = "dashboard";
let period = String(today()).slice(0,7);
let lastKnownCalendarPeriod = period;
let followCalendarPeriod = true;
let branch = "General";
let editing = null;
let currentOperator = "";
let compareA = prevPeriod(CONFIG.defaultPeriod);
let compareB = CONFIG.defaultPeriod;
const viewHistory = [];
const viewForward = [];
let pdfDownloadBlob = null;
let pdfDownloadName = "documento-blunno.pdf";
let pendingRecordEdit=null;

function slugPath(value){return String(value||'general').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'general';}
function storagePathFor(periodValue,branchValue,sectorValue,fileName){const [y,m]=String(periodValue||today()).split('-');return `blunno/${y}/${m}/${slugPath(branchValue)}/${slugPath(sectorValue)}/${fileName}`;}

const titles = {
 dashboard:"Panel general", cash:"Caja diaria", providers:"Proveedores", invoices:"Facturas", expenses:"Gastos por categoría", investments:"Gastos de inversión",
 people:"Personal", hours:"Horas mensuales", results:"Resultados", compare:"Comparativas", tasks:"Recordatorios", close:"Cierre mensual", files:"Archivos", history:"Historial", trash:"Papelera", import:"Excel / Backup"
};

const toast = (message, ok=true) => {
  const el=$("#toast"); el.textContent=message; el.className=`toast show ${ok?'ok':'bad'}`;
  clearTimeout(window.__blunnoToast); window.__blunnoToast=setTimeout(()=>el.className='toast',3800);
};

const periodContextKey = _branchName => "blunno-current-period-global";
const calendarPeriodNow = () => String(today()).slice(0,7);
function persistPeriodSelection(value){
  period=value;
  followCalendarPeriod = value === calendarPeriodNow();
  Store.setPeriod(period);
  try { localStorage.setItem(periodContextKey(branch),period); } catch {}
}
function checkCalendarPeriodRollover(){
  const current=calendarPeriodNow();
  if(current===lastKnownCalendarPeriod)return;
  lastKnownCalendarPeriod=current;
  if(!followCalendarPeriod)return;
  period=current;
  Store.setPeriod(period);
  compareB=period;
  compareA=prevPeriod(period);
  try { localStorage.setItem(periodContextKey(branch),period); } catch {}
  refresh();
  toast(`Nuevo período: ${periodLabel(period)}. BLUNNO cambió automáticamente al mes actual.`);
}

function setOperator(name) {
  if (name && !CONFIG.responsiblePeople.includes(name)) { toast('Responsable inválido.',false); return; }
  currentOperator = name || "";
  window.__blunnoResponsible = currentOperator;
  try {
    if (currentOperator) localStorage.setItem("blunno-operator", currentOperator);
    else localStorage.removeItem("blunno-operator");
  } catch {}
  const label=$("#operatorLabel"); if(label) label.textContent=currentOperator || "Elegir responsable"; const selector=$("#operatorSelector"); if(selector) selector.value=currentOperator;
}

function getResponsible() {
  if (currentOperator && CONFIG.responsiblePeople.includes(currentOperator)) return currentOperator;
  let candidate = "";
  try { candidate = localStorage.getItem("blunno-operator") || ""; } catch {}
  candidate = candidate || $("#operatorSelector")?.value || "";
  if (candidate && CONFIG.responsiblePeople.includes(candidate)) {
    currentOperator = candidate;
    window.__blunnoResponsible = currentOperator;
    const label=$("#operatorLabel"); if(label) label.textContent=currentOperator;
    const selector=$("#operatorSelector"); if(selector) selector.value=currentOperator;
    return currentOperator;
  }
  return "";
}

const DELETE_FALLBACK_RESPONSIBLE = "Usuario local";
function getDeleteResponsible(){ return getResponsible() || DELETE_FALLBACK_RESPONSIBLE; }

const CONFIRM_DELETE_COLLECTIONS = new Set(["expenses","investments","invoices","providers","estimates"]);
const deleteRecordLabel = collection => ({expenses:"este movimiento de gasto",investments:"esta inversión",invoices:"esta factura",providers:"este proveedor del catálogo",estimates:"este valor estimado"}[collection] || "este registro");
function openDeleteRecordConfirmation(collection,id){
  const row=Store.get(collection,id);
  if(!row){ toast("El registro ya no está disponible.",false); return; }
  const label=deleteRecordLabel(collection);
  $('#detailTitle').textContent='Confirmar eliminación';
  $('#detailBody').innerHTML=`<div class="notice warning"><b>¿Estás seguro de que deseas eliminar ${esc(label)}?</b><br>El registro no se borrará definitivamente: será enviado a la Papelera y quedará disponible para restaurarlo según la política vigente.</div><div class="detail-grid"><div><span>Sector</span><b>${esc(sectorForCollection(collection))}</b></div><div><span>Detalle</span><b>${esc(row.category||row.provider||row.concept||row.number||row.name||row.id)}</b></div><div><span>Importe</span><b>${row.amount!==undefined?money(row.amount):'—'}</b></div></div><div class="modal-footer"><button type="button" class="secondary-button" id="deleteRecordCancel">Cancelar</button><button type="button" class="danger-button" id="deleteRecordConfirm">Sí, eliminar y enviar a Papelera</button></div>`;
  $('#detailModal').classList.remove('hidden');
  $('#deleteRecordCancel').onclick=()=>$('#detailModal').classList.add('hidden');
  $('#deleteRecordConfirm').onclick=()=>confirmDeleteRecord(collection,id);
}
async function confirmDeleteRecord(collection,id){
  const row=Store.get(collection,id);
  if(!row){ $('#detailModal').classList.add('hidden'); toast('El registro ya no está disponible.',false); refresh(); return; }
  const button=$('#deleteRecordConfirm'); if(button){ button.disabled=true; button.textContent='Enviando a Papelera…'; }
  const responsible=getDeleteResponsible();
  try{
    await Store.remove(collection,id,responsible,'Baja lógica confirmada');
    refresh();
    const label=deleteRecordLabel(collection);
    $('#detailTitle').textContent='Enviado a Papelera';
    $('#detailBody').innerHTML=`<div class="notice success"><b>✓ ${esc(label[0].toUpperCase()+label.slice(1))} fue enviado a la Papelera correctamente.</b><br>El registro conserva su historial y puede restaurarse desde Papelera.</div><div class="modal-footer"><button type="button" class="primary-button" id="deleteRecordSuccessConfirm">Confirmar</button></div>`;
    $('#deleteRecordSuccessConfirm').onclick=()=>$('#detailModal').classList.add('hidden');
  }catch(e){
    if(button){ button.disabled=false; button.textContent='Sí, eliminar y enviar a Papelera'; }
    toast(e.message||'No se pudo enviar el registro a la Papelera.',false);
  }
}

function setBranch(name) {
  const nextBranch = CONFIG.profiles.includes(name) ? name : "General";
  if(nextBranch===branch){ refresh(); return; }
  // El período elegido es global: cambiar de sucursal nunca mueve el mes activo.
  branch = nextBranch;
  window.__blunnoBranch = branch;
  try { localStorage.setItem(periodContextKey(), period); } catch {}
  refresh();
}

function navigate(nextView){ if(nextView===view){refresh();return;} viewHistory.push(view); viewForward.length=0; view=nextView; refresh(); }
function goBack(){ const previous=viewHistory.pop(); if(previous){ viewForward.push(view); view=previous; refresh(); } else { view="dashboard"; refresh(); } }
function goForward(){ const next=viewForward.pop(); if(next){ viewHistory.push(view); view=next; refresh(); } }

function connection() {
  $("#connectionDot").className=firebaseEnabled?'connected':'local';
  $("#connectionText").textContent=firebaseEnabled?'Firebase + nube':'Modo local';
  $("#userText").textContent=firebaseEnabled?'Sin login · Firebase sincronizado':'Datos locales · sin login';
}

async function updateStorageHealth(){
  const el=$("#blunnoStorageHealth");
  if(!el||!Store.storageHealth)return;
  try{
    const h=await Store.storageHealth();
    const fmt=bytes=>{const n=Number(bytes||0);if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;if(n<1024*1024*1024)return `${(n/1024/1024).toFixed(1)} MB`;return `${(n/1024/1024/1024).toFixed(2)} GB`;};
    const parts=[`Base local: ${h.mode||"IndexedDB"}`,`Persistencia protegida por el navegador: ${h.persistent?"confirmada":"no confirmada"}`];
    if(h.quota>0)parts.push(`Uso estimado del sitio: ${fmt(h.usage)} de ${fmt(h.quota)} (${(Math.max(0,Math.min(1,h.ratio||0))*100).toFixed(1)}%)`);
    parts.push(`Operaciones pendientes de sincronización: ${Number(h.pendingSync||0)}`);
    parts.push(`Documentos con copia en nube: ${Number(h.cloudFiles||0)}`);
    parts.push(`Documentos solo locales (incluye papelera): ${Number(h.localOnlyFiles||0)}`);
    if(Number(h.localFallbackFiles||0)>0)parts.push(`Documentos con respaldo local adicional: ${Number(h.localFallbackFiles||0)}`);
    if(h.filePromotionRunning)parts.push("Migración automática de documentos a la nube en curso");
    if(h.legacyEmbeddedFiles>0)parts.push(`Adjuntos antiguos por compactar: ${Number(h.legacyEmbeddedFiles)}`);
    parts.push(`Firebase: ${h.firebase?"configurado; depende de conexión y permisos":"no configurado; datos locales en este dispositivo"}`);
    if(Number(h.localOnlyFiles||0)>0)parts.push("Los documentos solo locales permanecen en esta computadora. Cloud Storage debe estar habilitado para llevarlos a la nube.");
    el.textContent=parts.join(" · ");
    el.style.color=(h.pendingSync>0||!h.persistent||h.localOnlyFiles>0||h.legacyEmbeddedFiles>0)?"#8a4b08":"#166534";
  }catch(error){el.textContent="No se pudo consultar el estado del almacenamiento. No borres los datos del sitio; descargá un backup y revisá la conexión.";el.style.color="#b42318";}
}

function refresh(){
  window.__blunnoBranch = branch;
  $("#pageTitle").textContent=titles[view]||"Blunno";
  document.title = `BLUNNO · ${titles[view]||"Control Empresarial"}`;
  const ctx=$("#webContextLabel"); if(ctx) ctx.textContent=`${branch} · ${periodLabel(period)}`;
  const conn=$("#webConnectionLabel"); if(conn) conn.textContent=firebaseEnabled?"Firebase conectado":"Modo local";
  renderView(view,content,period,branch,compareA,compareB);
  wire();
  void updateStorageHealth();
  const flash=localStorage.getItem('blunno-close-review-flash');
  if(flash===view){const target=content.querySelector('.panel');if(target){target.classList.add('flash-review-panel');setTimeout(()=>target.classList.remove('flash-review-panel'),2800)}toast('Revisá los datos de este sector y volvé a Cierre mensual.',false);localStorage.removeItem('blunno-close-review-flash');}
  $("#periodSelector").textContent=periodLabel(period);
  $("#periodState").textContent=periodStateLabel(period,branch);
  const stateLabel=periodStateLabel(period,branch);
  $("#periodDot").className=Store.periodIsClosed(period,branch)?"closed":(stateLabel==="CIERRE PENDIENTE"?"pending":"open");
  $("#branchSelector").value=branch;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const back=$("#backBtn"); if(back) back.disabled=viewHistory.length===0 && view==="dashboard"; const forward=$("#forwardBtn"); if(forward) forward.disabled=viewForward.length===0;
  checkReminders();
}

function fieldHtml([n,label,type,options], data) {
  let control="";
  if(type==='select') control=`<select name="${n}">${(n==='branch'?'<option value="">Elegir sucursal…</option>':'')}${options.map(v=>{const a=Array.isArray(v)?v:[v,v];return `<option value="${esc(a[0])}">${esc(a[1])}</option>`}).join('')}</select>`;
  else if(type==='textarea') control=`<textarea name="${n}" rows="3"></textarea>`;
  else if(type==='checkbox') control=`<input name="${n}" type="checkbox" class="checkbox-input">`;
  else control=`<input name="${n}" type="${type}" ${type==='number'?'step="0.01" min="0"':''}>`;
  return `<label class="field ${type==='checkbox'?'checkbox-field':''}">${esc(label)}${control}</label>`;
}


let pendingHistoricalControl=null;

function closeHistoricalControl(){
  pendingHistoricalControl=null;
  $('#historicalControlModal')?.classList.add('hidden');
}

function openHistoricalControl({form=null,type,period,branch,action,dateField,rawDate='',onConfirm=null}){
  if(!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(period))){
    toast('No se pudo determinar un período válido para la operación.',false); return;
  }
  const modal=$('#historicalControlModal');
  if(!modal)return;
  const currentPeriod=String(today()).slice(0,7);
  const days=daysInPeriod(period);
  const initial=String(rawDate||'').slice(0,10);
  const validInitial=new RegExp(`^${period}-\\d{2}$`).test(initial) && Number(initial.slice(8))>=1 && Number(initial.slice(8))<=days;
  pendingHistoricalControl={form,type,period,branch,action,dateField,onConfirm,selectedDate:validInitial?initial:''};
  $('#historicalCurrentPeriod').textContent=periodLabel(currentPeriod).toUpperCase();
  $('#historicalTargetPeriod').textContent=periodLabel(period).toUpperCase();
  $('#historicalAction').textContent=`${action} ${type==='invoice'?'factura':type==='expense'?'gasto':type==='investment'?'inversión':type==='cash'?'operación de Caja diaria':type==='hours'?'registro de Personal':'operación'}`;
  const grid=$('#historicalCalendar');
  if(grid){
    const first=new Date(`${period}-01T12:00:00`);
    const offset=(first.getDay()+6)%7;
    let html=['L','M','M','J','V','S','D'].map(x=>`<span class="historical-calendar-head">${x}</span>`).join('');
    for(let i=0;i<offset;i++) html+='<span class="historical-calendar-empty"></span>';
    for(let d=1;d<=days;d++){
      const iso=isoDate(period,d), selected=iso===pendingHistoricalControl.selectedDate;
      html+=`<button type="button" class="historical-day${selected?' selected':''}" data-historical-date="${iso}">${d}</button>`;
    }
    grid.innerHTML=html;
    grid.querySelectorAll('[data-historical-date]').forEach(btn=>btn.onclick=()=>{
      if(!pendingHistoricalControl)return;
      pendingHistoricalControl.selectedDate=btn.dataset.historicalDate;
      grid.querySelectorAll('.historical-day').forEach(x=>x.classList.toggle('selected',x===btn));
      updateHistoricalSummary();
    });
  }
  const select=$('#historicalResponsible');
  if(select){
    select.innerHTML='<option value="">Seleccionar responsable…</option>'+CONFIG.responsiblePeople.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
    select.value='';
    select.onchange=updateHistoricalSummary;
  }
  updateHistoricalSummary();
  modal.classList.remove('hidden');
  setTimeout(()=>grid?.querySelector('.historical-day.selected')?.focus(),0);
}

function updateHistoricalSummary(){
  const p=pendingHistoricalControl;
  if(!p)return;
  const responsible=$('#historicalResponsible')?.value||'';
  $('#historicalTargetPeriodSummary').textContent=periodLabel(p.period).toUpperCase();
  $('#historicalActionSummary').textContent=$('#historicalAction')?.textContent||'—';
  $('#historicalSelectedDate').textContent=p.selectedDate?p.selectedDate.split('-').reverse().join('/'):'—';
  $('#historicalResponsibleSummary').textContent=responsible||'Pendiente de selección';
  const ready=!!p.selectedDate && CONFIG.responsiblePeople.includes(responsible);
  $('#historicalConfirm').disabled=!ready;
  $('#historicalValidation').textContent=ready
    ? '✓ Fecha y responsable listos para confirmar.'
    : (!p.selectedDate?'Seleccioná un día del período.': 'Seleccioná uno de los responsables autorizados.');
  $('#historicalValidation').className=`historical-validation ${ready?'ok':'pending'}`;
}

function confirmHistoricalControl(){
  const p=pendingHistoricalControl;
  if(!p)return;
  const responsible=$('#historicalResponsible')?.value||'';
  if(!p.selectedDate){
    toast(`Seleccioná una fecha dentro de ${periodLabel(p.period).toUpperCase()}.`,false); return;
  }
  if(!CONFIG.responsiblePeople.includes(responsible)){
    toast('Seleccioná uno de los 4 responsables autorizados.',false); return;
  }
  if(String(p.selectedDate).slice(0,7)!==String(p.period)){
    toast('La fecha seleccionada no pertenece al período de trabajo.',false); return;
  }
  try{
    assertResponsible(responsible);
    if(p.dateField){
      const field=p.form?.querySelector(`[name="${p.dateField}"]`);
      if(field)field.value=p.selectedDate;
    }
    const late=Store.periodIsClosed(p.period,p.branch);
    const lateField=p.form?.querySelector('[name="lateMovement"]');
    if(lateField && late)lateField.checked=true;
    if(late)setPeriodEditConfirmed(p.period,p.branch,true);
    setOperator(responsible);
    closeHistoricalControl();
    if(typeof p.onConfirm==='function'){
      Promise.resolve(p.onConfirm(p.selectedDate,responsible)).catch(err=>toast(err.message||'No se pudo completar la operación.',false));
      return;
    }
    p.form.dataset.historicalConfirmed='1';
    p.form.requestSubmit();
  }catch(err){toast(err.message||'No se pudo confirmar el control de período.',false)}
}

function openModal(type,id=null){
  const typeAliases={providers:'provider',employees:'employee',invoices:'invoice',expenses:'expense',investments:'investment',incomes:'income',tasks:'task'};
  type=typeAliases[type]||type;
  const branchScoped=['employee','invoice','cash','expense','investment','income','hours'];
  if(branch==='General' && branchScoped.includes(type)){ toast('General es solo una vista consolidada. Elegí una sucursal concreta para modificar este sector.',false); return; }
  const map={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',expense:'expenses',investment:'investments',task:'tasks',income:'incomes'};
  const col=map[type]||type; editing=id?Store.get(col,id):null;
  if(id&&!editing){toast('No se encontró la factura o el registro que querés editar. Actualizá la lista e intentá nuevamente.',false);return;}
  const dateTypes=new Set(['invoice','cash','expense','investment','income','hours']);
  const invoiceStoredDate=String(editing?.operationDate||editing?.date||'').slice(0,10);
  const invoiceStoredPeriod=/^\d{4}-(0[1-9]|1[0-2])$/.test(String(editing?.periodId||''))?String(editing.periodId):null;
  const editPeriod=editing?.period || (type==='invoice'&&/^\d{4}-\d{2}-\d{2}$/.test(invoiceStoredDate)?invoiceStoredDate.slice(0,7):null) || (type==='invoice'?invoiceStoredPeriod:null) || (dateTypes.has(type)?period:null);
  const systemPeriod=String(today()).slice(0,7);
  if(editing?.period && editing?.branch && editing.period===systemPeriod && Store.periodIsClosed(editing.period,editing.branch) && !periodEditConfirmed(editing.period,editing.branch)){
    pendingRecordEdit={type,id};
    openPeriodActionConfirm('edit',editing.period);
    return;
  }
  const schema=formSchema[type]; if(!schema) return;
  const recordForm=$("#recordForm");
  recordForm.dataset.type=type;
  recordForm.dataset.editingId=editing?.id||'';
  recordForm.dataset.historicalConfirmed='0';
  $("#modalKicker").textContent=editing?'EDICIÓN CONTROLADA':'NUEVO REGISTRO';
  $("#modalTitle").textContent=editing?'Editar registro':'Nuevo registro';
  $("#formFields").innerHTML=schema.map(x=>fieldHtml(x,editing)).join('');
  if(type==='invoice'){const pf=$("#formFields [name=provider]");if(pf){const wrap=document.createElement('div');wrap.className='provider-picker form-provider-picker';pf.parentNode.replaceWith(wrap);wrap.innerHTML=`<div class="provider-picker-line"><input name="provider" type="text" autocomplete="off" placeholder="Escribí o elegí un proveedor" role="combobox" aria-autocomplete="list"><input type="hidden" name="providerId" data-provider-id-field><button type="button" class="provider-picker-toggle" aria-label="Mostrar proveedores" aria-expanded="false">⌄</button></div><div class="provider-suggestions hidden" role="listbox"></div><small class="provider-selection-status"></small>`;}}
  for(const [n] of schema){const el=$("#formFields [name=\""+n+"\"]"); if(!el) continue; if(editing?.[n]!==undefined){if(el.type==='checkbox')el.checked=!!editing[n];else if(el.type==='date')el.value=String(editing[n]||'').slice(0,10);else el.value=editing[n];}}
  const d=$("#formFields [name=date]"); if(d&&!editing&&editPeriod)d.value=defaultMovementDate(editPeriod);
  const od=$("#formFields [name=operationDate]"); if(od&&!editing&&editPeriod)od.value=defaultMovementDate(editPeriod);
  if(editPeriod && dateTypes.has(type)){
    const field=type==='invoice'?od:d;
    if(field){field.min=`${editPeriod}-01`;field.max=`${editPeriod}-${String(daysInPeriod(editPeriod)).padStart(2,'0')}`;}
  }
  const branchField=$("#formFields [name=branch]"); if(branchField&&!editing&&branch!=="General")branchField.value=branch;
  if(type==='invoice'){const pf=$("#formFields [name=provider]");if(pf&&editing){pf.value=Store.invoiceProviderName(editing)||editing.provider||'';pf.dataset.providerId=editing.providerId||'';const idField=providerIdFieldForInput(pf);if(idField)idField.value=editing.providerId||'';}const opField=$("#formFields [name=operationDate]");if(opField&&editing&&!opField.value)opField.value=String(editing.operationDate||editing.date||defaultMovementDate(editPeriod)).slice(0,10);wireProviderPicker(pf);updateProviderSelectionStatus(pf);}
  const op=$("#recordResponsible"); op.value=currentOperator; op.disabled=!!currentOperator; op.title=currentOperator?'Se mantiene el responsable seleccionado para esta sesión.':'';
  $("#modal").classList.remove('hidden');
  $("#formFields input,#formFields select,#formFields textarea")[0]?.focus();
  wireProviderDatalist();
}
function closeModal(){$("#modal").classList.add('hidden');const form=$("#recordForm");if(form){form.dataset.editingId='';form.dataset.type='';form.dataset.historicalConfirmed='0';}editing=null;}

async function saveRecord(e){
  e.preventDefault();
  const form=e.target;
  if(form.dataset.saving==='1')return;
  form.dataset.saving='1';
  const submit=form.querySelector('button[type="submit"]'); if(submit){submit.disabled=true;submit.dataset.originalText=submit.textContent;submit.textContent='Guardando…';}
  const type=form.dataset.type;
  const responsible=currentOperator || $("#recordResponsible").value;
  const editId=form.dataset.editingId||'';
  const collectionByType={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',hours:'hours',expense:'expenses',investment:'investments',income:'incomes',task:'tasks'};
  const activeEditing=editId?Store.get(collectionByType[type]||type,editId):null;
  try{
    if(editId&&!activeEditing)throw new Error('El registro que estabas editando ya no está disponible. Actualizá la pantalla antes de guardar.');
    if(!CONFIG.responsiblePeople.includes(responsible)) throw new Error('Elegí Agus, Nico, Luz o Flor como responsable.');
    const raw=Object.fromEntries(new FormData(form).entries());
    const data={...raw};
    for(const k of ['amount','expected','hourlyRate','hours','advance','merchandise']) if(k in data) data[k]=Number(data[k]||0);
    const dateField=type==='invoice'?'operationDate':(['cash','expense','investment','income','hours'].includes(type)?'date':null);
    const protectedTypes=new Set(['invoice','cash','expense','investment','income','hours']);
    const legacyInvoiceDate=String(activeEditing?.operationDate||activeEditing?.date||'').slice(0,10);
    const legacyInvoicePeriod=/^\d{4}-(0[1-9]|1[0-2])$/.test(String(activeEditing?.periodId||''))?String(activeEditing.periodId):null;
    const targetPeriod=activeEditing?.period || (type==='invoice'&&/^\d{4}-\d{2}-\d{2}$/.test(legacyInvoiceDate)?legacyInvoiceDate.slice(0,7):null) || (type==='invoice'?legacyInvoicePeriod:null) || (protectedTypes.has(type)?period:null);
    const systemPeriod=String(today()).slice(0,7);
    if(protectedTypes.has(type) && targetPeriod && targetPeriod!==systemPeriod && form.dataset.historicalConfirmed!=='1'){
      form.dataset.saving='0';
      openHistoricalControl({form,type,period:targetPeriod,branch:data.branch||activeEditing?.branch||branch,action:activeEditing?'Modificar':'Agregar',dateField,rawDate:data[dateField]||''});
      return;
    }
    if(protectedTypes.has(type) && targetPeriod && data[dateField] && String(data[dateField]).slice(0,7)!==targetPeriod){
      throw new Error(`FECHA INCORRECTA: estás trabajando en ${periodLabel(targetPeriod).toUpperCase()} y la fecha seleccionada pertenece a ${periodLabel(String(data[dateField]).slice(0,7)).toUpperCase()}. Seleccioná una fecha correspondiente al período de trabajo.`);
    }
    if(protectedTypes.has(type) && targetPeriod) data[dateField]=data[dateField]||'';
    if(type==='hours'){
      const emp=Store.list('employees').find(x=>x.name.toLowerCase()===String(data.employee||'').toLowerCase());
      if(!emp) throw new Error('No se encontró el empleado. Usá el nombre exacto de la ficha de Personal.');
      data.employeeId=emp.id; data.employee=emp.name; data.branch=emp.branch; data.period=targetPeriod || (data.date||today()).slice(0,7);
      data.salaryCost=Number(data.hours||0)*Number(emp.hourlyRate||0);
    }
    if('lateMovement' in data) data.lateMovement=$("#formFields [name=lateMovement]")?.checked===true;
    if(type==='invoice'){
      const originalProvider=activeEditing?.providerId?Store.get('providers',activeEditing.providerId):null;
      const unchangedHistoricalProvider=!!originalProvider&&data.providerId===originalProvider.id&&sourceIdentity(data.provider)===sourceIdentity(originalProvider.name);
      const master=unchangedHistoricalProvider?originalProvider:Store.resolveProvider(data.provider,data.providerId||null);
      data.provider=master.name;
      data.providerId=master.id;
      data.period=targetPeriod || (data.operationDate||data.date||today()).slice(0,7);
      data.loadDate=activeEditing?.loadDate || now();
      data.status='CARGADA';
      delete data.paidAmount; delete data.dueDate;
    }
    if(['cash','expense','investment','income'].includes(type)) data.period=targetPeriod || (data.date||today()).slice(0,7);
    if(type==='cash') data.branch=data.branch==='General'?branch:data.branch;
    if(type==='income') data.branch=data.branch==='General'?branch:data.branch;
    if(['expense','investment','income','cash','invoice','employee'].includes(type) && !data.branch) throw new Error('Seleccioná una sucursal concreta.');
    if(['expense','investment','income','cash','invoice'].includes(type) && data.branch==='General') throw new Error('General es solo una vista consolidada.');
    if(type==='task') data.status=activeEditing?.status||'pending';
    if(type==='employee') data.active=data.active!=='false';
    const scopedCollection={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',hours:'hours',expense:'expenses',investment:'investments',income:'incomes',task:'tasks'}[type];
    const shouldBeLate = ['invoices','incomes','expenses','investments','cash','hours'].includes(scopedCollection) && data.period && data.branch && Store.periodIsClosed(data.period,data.branch);
    if (shouldBeLate && !data.lateMovement && !periodEditConfirmed(data.period,data.branch)) {
      const action = activeEditing ? 'modificar' : 'agregar';
      if(!currentOperator){toast('Elegí un responsable antes de modificar un período cerrado.',false);return;}
      const ok = confirm(`El período ${periodLabel(data.period)} está cerrado para ${String(data.branch).toUpperCase()}.\n\nResponsable actual: ${currentOperator}.\n\n¿Estás seguro de que querés ${action} algo en este mes? El cambio quedará auditado y, si existe un cierre real, generará una nueva versión.`);
      if (!ok) return;
      setPeriodEditConfirmed(data.period,data.branch,true); data.lateMovement = true;
    } else data.lateMovement=!!data.lateMovement || shouldBeLate;
    const collection={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',hours:'hours',expense:'expenses',investment:'investments',income:'incomes',task:'tasks'}[type];
    if(!collection) throw new Error('Tipo de registro inválido.');
    if(activeEditing) await Store.update(collection,activeEditing.id,data,responsible,'Edición controlada desde formulario',{lateMovement:data.lateMovement});
    else await Store.add(collection,data,responsible,'Alta controlada desde formulario',{lateMovement:data.lateMovement});
    if(data.lateMovement && data.period && data.branch){
      const latest=Store.db.closures.filter(x=>x.period===data.period&&x.branch===data.branch&&x.status==='closed').sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
      if(latest) await generateClosurePDF(latest);
    }
    form.dataset.historicalConfirmed='0';
    closeModal();
    window.__blunnoDataRevision=(window.__blunnoDataRevision||0)+1;
    window.dispatchEvent(new CustomEvent('blunno:data-changed',{detail:{collection,period:data.period,branch:data.branch}}));
    toast(data.lateMovement?'Movimiento tardío guardado; el cierre quedó versionado.':(activeEditing?'Cambios guardados y auditados.':'Guardado con éxito.'));
    refresh();
  }catch(err){ toast(err.message||'No se pudo guardar el registro.',false); }
  finally{ form.dataset.saving='0'; form.dataset.historicalConfirmed='0'; if(submit){submit.disabled=false;submit.textContent=submit.dataset.originalText||'Guardar y auditar';} }
}
function providerBranchForInput(input){return input?.closest('.provider-picker')?.closest('#recordForm')?.querySelector('[name="branch"]')?.value||branch;}
function providerIdFieldForInput(input){return input?.closest('.provider-picker')?.querySelector('[data-provider-id-field]')||null;}
function findProviderForPicker(input){
 const query=sourceIdentity(input?.value||''),selectedId=providerIdFieldForInput(input)?.value||input?.dataset?.providerId||'';
 const providers=Store.list('providers');
 return (selectedId&&providers.find(x=>x.id===selectedId)) || providers.find(x=>x.active!==false&&(sourceIdentity(x.name)===query||(Array.isArray(x.aliases)&&x.aliases.some(a=>sourceIdentity(a)===query)))) || null;
}
function updateProviderSelectionStatus(input){
 if(!input)return null;
 const wrap=input.closest('.provider-picker'),status=wrap?.querySelector('.provider-selection-status');
 const selectedBranch=providerBranchForInput(input),query=sourceIdentity(input.value.trim());
 const field=providerIdFieldForInput(input),selected=findProviderForPicker(input);
 if(selected&&query&&(sourceIdentity(selected.name)===query||(Array.isArray(selected.aliases)&&selected.aliases.some(a=>sourceIdentity(a)===query)))){
   input.dataset.providerId=selected.id;if(field)field.value=selected.id;
 }else if(field){field.value='';input.dataset.providerId='';}
 const isCurrentEdit=!!input.closest('#recordForm')?.dataset.editingId&&!!selected&&selected.id===input.dataset.providerId;
 const available=!!selected&&((selected.active!==false&&providerAvailableInBranch(selected,selectedBranch))||isCurrentEdit);
 if(status){status.textContent=available?`✓ Proveedor seleccionado · ${selectedBranch}`:(selected?`No disponible en ${selectedBranch}`:'Elegí un proveedor existente');status.className=`provider-selection-status ${available?'valid':'invalid'}`;}
 return available?selected:null;
}
function wireProviderPicker(input){
 if(!input)return;
 const wrap=input.closest('.provider-picker');if(!wrap)return;
 const box=wrap.querySelector('.provider-suggestions'),toggle=wrap.querySelector('.provider-picker-toggle');
 if(!box||input.dataset.providerPickerWired==='1')return;
 let suppressNextFocus=false;
 let idField=providerIdFieldForInput(input);
 if(!idField){idField=document.createElement('input');idField.type='hidden';idField.setAttribute('data-provider-id-field','');if(input.closest('#recordForm'))idField.name='providerId';wrap.querySelector('.provider-picker-line')?.appendChild(idField)||wrap.appendChild(idField);}
 if(input.dataset.providerId&&!idField.value)idField.value=input.dataset.providerId;
 if(!box.id)box.id=`provider-suggestions-${Math.random().toString(36).slice(2,9)}`;
 toggle?.setAttribute('aria-controls',box.id);toggle?.setAttribute('aria-haspopup','listbox');toggle?.setAttribute('aria-expanded','false');
 const selectedBranch=()=>providerBranchForInput(input);
 const currentEditingProviderId=()=>input.closest('#recordForm')?.dataset.editingId?(idField.value||input.dataset.providerId||''):'';
 const list=()=>Store.list('providers').filter(x=>(x.active!==false&&providerAvailableInBranch(x,selectedBranch()))||(currentEditingProviderId()&&x.id===currentEditingProviderId())).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es',{sensitivity:'base'}));
 const hide=()=>{box.classList.add('hidden');wrap.classList.remove('is-open');toggle?.setAttribute('aria-expanded','false');};
 const draw=(raw='')=>{
   const query=sourceIdentity(raw);
   const items=list().filter(x=>!query||sourceIdentity(x.name).includes(query)||(Array.isArray(x.aliases)&&x.aliases.some(a=>sourceIdentity(a).includes(query))));
   box.innerHTML=items.map(x=>`<button type="button" role="option" aria-selected="${x.id===idField.value?'true':'false'}" data-provider-choice="${esc(x.name)}" data-provider-id="${esc(x.id)}"><span>${esc(x.name)}</span><b aria-hidden="true">✓</b></button>`).join('')||`<div class="provider-empty">No hay proveedores disponibles para ${esc(selectedBranch())}. Revisá su disponibilidad desde Proveedores.</div>`;
   box.classList.remove('hidden');wrap.classList.add('is-open');toggle?.setAttribute('aria-expanded','true');
 };
 const choose=button=>{
   if(!button)return false;
   const name=button.dataset.providerChoice||'',id=button.dataset.providerId||'';
   const master=Store.list('providers').find(x=>x.id===id);
   const isSameInvoiceProvider=!!currentEditingProviderId()&&id===currentEditingProviderId();
   if(!master||(master.active===false&&!isSameInvoiceProvider)||(!providerAvailableInBranch(master,selectedBranch())&&!isSameInvoiceProvider)){
     if(idField)idField.value='';input.dataset.providerId='';
     if(wrap.querySelector('.provider-selection-status')){const status=wrap.querySelector('.provider-selection-status');status.textContent=`No disponible en ${selectedBranch()}`;status.className='provider-selection-status invalid';}
     hide();return false;
   }
   input.value=name;input.dataset.providerId=id;idField.value=id;
   updateProviderSelectionStatus(input);hide();
   input.dispatchEvent(new Event('change',{bubbles:true}));
   focusInputWithoutReopening();
   return true;
 };
 const focusInputWithoutReopening=()=>{
   if(document.activeElement===input)return;
   suppressNextFocus=true;
   try{input.focus({preventScroll:true});}catch{input.focus();}
   if(document.activeElement!==input)suppressNextFocus=false;
 };
 const toggleList=()=>{if(!box.classList.contains('hidden'))hide();else draw(input.value);};
 input.__blunnoProviderPicker={draw,hide,toggle:toggleList,choose};input.dataset.providerPickerWired='1';
 toggle?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggleList();});
 toggle?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '||event.key==='ArrowDown'){event.preventDefault();if(box.classList.contains('hidden'))draw(input.value);else box.querySelector('[data-provider-choice]')?.focus();}});
 input.addEventListener('input',()=>{
   idField.value='';input.dataset.providerId='';
   const query=sourceIdentity(input.value),exact=list().find(x=>sourceIdentity(x.name)===query||(Array.isArray(x.aliases)&&x.aliases.some(a=>sourceIdentity(a)===query)));
   if(exact){idField.value=exact.id;input.dataset.providerId=exact.id;if(sourceIdentity(exact.name)===query)input.value=exact.name;}
   draw(input.value);updateProviderSelectionStatus(input);
 });
 input.addEventListener('change',()=>updateProviderSelectionStatus(input));
 input.addEventListener('focus',()=>{if(suppressNextFocus){suppressNextFocus=false;return;}if(box.classList.contains('hidden'))draw(input.value);});
 input.addEventListener('keydown',event=>{
   if(event.key==='Escape'){hide();return;}
   if(event.key==='ArrowDown'){const first=box.querySelector('[data-provider-choice]');if(first){event.preventDefault();first.focus();}}
 });
 // Evita que un toque en la lista pierda el foco y cierre el desplegable antes del click móvil.
 wrap.addEventListener('mousedown',event=>{if(event.target?.closest?.('[data-provider-choice]'))event.preventDefault();});
 wrap.addEventListener('click',event=>{
   const option=event.target?.closest?.('[data-provider-choice]');
   if(!option||!wrap.contains(option))return;
   event.preventDefault();event.stopPropagation();choose(option);
 });
 box.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();hide();input.focus({preventScroll:true});suppressNextFocus=true;return;}
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
     const options=[...box.querySelectorAll('[data-provider-choice]')],index=options.indexOf(document.activeElement);
     if(options.length){event.preventDefault();const step=event.key==='ArrowDown'?1:-1;options[Math.max(0,Math.min(options.length-1,index+step))]?.focus();return;}
   }
   const option=event.target?.closest?.('[data-provider-choice]');if(option&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();choose(option);}
 });
 box.addEventListener('mousedown',event=>{if(event.target?.closest?.('[data-provider-choice]'))event.preventDefault();});
 const branchField=wrap.closest('#recordForm')?.querySelector('[name="branch"]');
 branchField?.addEventListener('change',()=>{
   const selected=findProviderForPicker(input);
   if(selected&&!providerAvailableInBranch(selected,selectedBranch())&&selected.id!==currentEditingProviderId()){
     input.value='';idField.value='';input.dataset.providerId='';
   }
   updateProviderSelectionStatus(input);if(!box.classList.contains('hidden'))draw(input.value);
 });
 if(!window.__blunnoProviderPickerOutsideClick){
   window.__blunnoProviderPickerOutsideClick=true;
   document.addEventListener('click',event=>{
     if(event.target?.closest?.('.provider-picker'))return;
     document.querySelectorAll('.provider-picker.is-open').forEach(openWrap=>{
       const openInput=openWrap.querySelector('input[name="provider"],#quickInvoiceProvider');
       openInput?.__blunnoProviderPicker?.hide();
     });
   });
 }
 updateProviderSelectionStatus(input);hide();
}

function wireProviderDatalist(){
 const inputs=[...document.querySelectorAll('input[name=provider],input[name=name]')];
 inputs.forEach(input=>{if(input.closest('.provider-picker')){input.removeAttribute('list');return;}if(input.name!=='provider'&&!$('#recordForm')?.dataset.type?.includes('invoice'))return;input.setAttribute('list','providerList');});
 let datalist=$('#providerList');if(!datalist){datalist=document.createElement('datalist');datalist.id='providerList';document.body.appendChild(datalist);}
 const refreshOptions=()=>{const selectedBranch=$('#recordForm [name="branch"]')?.value||branch;datalist.innerHTML=Store.list('providers').filter(x=>x.active!==false&&providerAvailableInBranch(x,selectedBranch)).sort((a,b)=>a.name.localeCompare(b.name,'es')).map(x=>`<option value="${esc(x.name)}"></option>`).join('');};
 refreshOptions();$('#recordForm [name="branch"]')?.addEventListener('change',refreshOptions);
}

function changeCashWeek(dir){
  if(dir!=='next'&&dir!=='prev')return false;
  const key=`blunno-cash-week-${period}-${branch}`;
  const max=Math.max(1,Math.ceil(daysInPeriod(period)/7));
  let current=Number(localStorage.getItem(key)||0);
  if(!Number.isFinite(current))current=0;
  current=Math.min(Math.max(Math.trunc(current),0),max-1);
  const next=current+(dir==='next'?1:-1);
  if(next<0||next>max-1){ toast(dir==='next'?'Ya estás en la última semana disponible.':'Ya estás en la primera semana disponible.'); return false; }
  localStorage.setItem(key,String(next));
  setTimeout(()=>refresh(),0);
  return true;
}
function changeHoursWeek(dir){
  if(dir!=='next'&&dir!=='prev')return false;
  const key=`blunno-hours-week-${period}-${branch}`;
  const max=Math.max(1,Math.ceil(daysInPeriod(period)/7));
  let current=Number(localStorage.getItem(key)||1);
  if(!Number.isFinite(current))current=1;
  current=Math.min(Math.max(Math.trunc(current),1),max);
  const next=current+(dir==='next'?1:-1);
  if(next<1||next>max){ toast(dir==='next'?'Ya estás en la última semana disponible.':'Ya estás en la primera semana disponible.'); return false; }
  localStorage.setItem(key,String(next));
  setTimeout(()=>refresh(),0);
  return true;
}

function wire(){
  document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>openModal(b.dataset.new));
  document.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>openModal(button.dataset.edit,button.dataset.id));
document.querySelectorAll('[data-expense-edit]').forEach(b=>b.onclick=()=>openModal('expense',b.dataset.expenseEdit));
  // Estos tres sectores tienen un flujo individual de eliminación propio:
  // confirmación explícita + confirmación final después de enviarlo a Papelera.
  document.querySelectorAll('[data-delete]').forEach(b=>{
    if(!CONFIRM_DELETE_COLLECTIONS.has(b.dataset.delete)) return;
    b.onclick=e=>{e.preventDefault();e.stopPropagation();void deleteRecord(b.dataset.delete,b.dataset.id);};
  });
  document.querySelectorAll('[data-bulk-select-all]').forEach(b=>b.onchange=()=>document.querySelectorAll(`[data-bulk-select="${b.dataset.bulkSelectAll}"]`).forEach(x=>x.checked=b.checked));
  document.querySelectorAll('[data-bulk-delete]').forEach(b=>b.onclick=()=>bulkDelete(b.dataset.bulkDelete));
  document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>restoreRecord(b.dataset.restore,b.dataset.id));
  document.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>{const next=b.dataset.profile;if(next===branch)return;if(confirm(`Estás cambiando el contexto de trabajo a ${String(next).toUpperCase()}.\nLos datos no se modificarán. Solamente cambiará la información que estás visualizando.\n\n¿Querés cambiar el contexto?`))setBranch(next);});
  document.querySelectorAll('[data-compare-select]').forEach(s=>s.onchange=()=>{if(s.dataset.compareSelect==='a')compareA=s.value;else compareB=s.value;refresh()});
  document.querySelectorAll('[data-view-jump]').forEach(b=>b.onclick=()=>{if(b.dataset.hoursEmployee)localStorage.setItem('blunno-hours-employee',b.dataset.hoursEmployee);navigate(b.dataset.viewJump)});
  document.querySelectorAll('[data-complete-task]').forEach(b=>b.onclick=()=>completeTask(b.dataset.completeTask));
  document.querySelectorAll('[data-liquidate]').forEach(b=>b.onclick=()=>openLiquidation(b.dataset.liquidate));
  document.querySelectorAll('[data-salary-view]').forEach(b=>b.onclick=()=>showSalaryVoucher(b.dataset.salaryView));
  document.querySelectorAll('[data-salary-edit]').forEach(b=>b.onclick=()=>openLiquidationById(b.dataset.salaryEdit));
  document.querySelectorAll('[data-salary-pdf]').forEach(b=>b.onclick=()=>runPdfButtonAction(b,()=>generateSalaryVoucherPDF(b.dataset.salaryPdf)));
  document.querySelectorAll('[data-salary-delete]').forEach(b=>b.onclick=()=>deleteSalaryVoucher(b.dataset.salaryDelete));
  document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>showDetail(b.dataset.detail,b.dataset.id));
  document.querySelectorAll('[data-invoice-pdf]').forEach(b=>b.onclick=()=>runPdfButtonAction(b,()=>generateInvoicePDF(b.dataset.invoicePdf)));
  document.querySelectorAll('[data-provider-history]').forEach(b=>b.onclick=()=>showProviderHistory(b.dataset.providerHistory));
  const providerSearchInput=$('#providerSearchInput'),providerSuggestions=$('#providerSearchSuggestions');
  const updateProviderSearch=(rawValue)=>{const q=sourceIdentity(rawValue),items=[...document.querySelectorAll('[data-provider-searchable]')],visibleKeys=new Set();items.forEach(item=>{const key=item.dataset.providerSearchKey||sourceIdentity(item.dataset.providerSearchable||'');const visible=!q||key.includes(q);item.hidden=!visible;if(visible)visibleKeys.add(key)});const empty=$('#providerSearchEmpty');if(empty)empty.hidden=!q||visibleKeys.size>0;if(providerSuggestions){const names=window.__blunnoProviderSuggestionNames||[],matches=q?names.filter(name=>sourceIdentity(name).includes(q)).slice(0,8):[];providerSuggestions.innerHTML=matches.map(name=>`<button type=\"button\" role=\"option\" class=\"provider-search-suggestion\" data-provider-suggestion=\"${esc(name)}\"><span>${esc(name)}</span><small>Ver proveedor</small></button>`).join('');providerSuggestions.classList.toggle('hidden',matches.length===0)}};
  if(providerSearchInput){providerSearchInput.addEventListener('input',()=>{try{localStorage.setItem(`blunno-provider-search-${period}-${branch}`,providerSearchInput.value)}catch{}updateProviderSearch(providerSearchInput.value)});providerSearchInput.addEventListener('focus',()=>updateProviderSearch(providerSearchInput.value));updateProviderSearch(providerSearchInput.value)}
  $('#providerSearchClear')?.addEventListener('click',()=>{if(!providerSearchInput)return;providerSearchInput.value='';try{localStorage.removeItem(`blunno-provider-search-${period}-${branch}`)}catch{}updateProviderSearch('');providerSuggestions?.classList.add('hidden');providerSearchInput.focus()});
  if(!window.__blunnoProviderSuggestionDelegation){window.__blunnoProviderSuggestionDelegation=true;document.addEventListener('click',e=>{const suggestion=e.target?.closest?.('[data-provider-suggestion]');if(suggestion){const input=$('#providerSearchInput'),name=suggestion.dataset.providerSuggestion||'';if(input){input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}))}$('#providerSearchSuggestions')?.classList.add('hidden');return}if(!e.target?.closest?.('.provider-search-control'))$('#providerSearchSuggestions')?.classList.add('hidden')})}
  document.querySelectorAll('[data-provider-branch-toggle]').forEach(b=>b.onclick=async()=>{try{const available=b.dataset.providerAvailable==='1';await Store.setProviderBranchAvailability(b.dataset.providerBranchToggle,b.dataset.providerBranch,!available,currentOperator);toast(available?`Proveedor ocultado de ${b.dataset.providerBranch}.`:`Proveedor agregado a ${b.dataset.providerBranch}.`);refresh()}catch(e){toast(e.message,false)}});
  document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>{$('.sheet-wrap')?.scrollBy({left:b.dataset.scroll==='right'?500:-500,behavior:'smooth'})});
  document.querySelectorAll('[data-investment-edit]').forEach(b=>b.onclick=()=>openModal('investment',b.dataset.investmentEdit));
  document.querySelectorAll('[data-print-investments]').forEach(b=>{b.type='button';b.onclick=()=>runPrintViewAction(b,'investments');});
  document.querySelectorAll('[data-print-view]').forEach(b=>{b.type='button';b.onclick=()=>runPrintViewAction(b,b.dataset.printView);});
  $('#expenseCategoryFilter')?.addEventListener('change',e=>{localStorage.setItem(`blunno-expense-category-${period}-${branch}`,e.target.value);refresh()});
  $('#invoiceProviderFilter')?.addEventListener('change',e=>{localStorage.setItem(`blunno-invoice-provider-${period}-${branch}`,e.target.value);refresh()});
  $('#providerSortFilter')?.addEventListener('change',e=>{localStorage.setItem(`blunno-provider-sort-${period}-${branch}`,e.target.value);refresh()});
  document.querySelectorAll('[data-expense-category]').forEach(b=>b.onclick=()=>{localStorage.setItem(`blunno-expense-category-${period}-${branch}`,b.dataset.expenseCategory);refresh()});
  document.querySelectorAll('[data-expense-category-pdf]').forEach(b=>b.onclick=()=>runPdfButtonAction(b,()=>generateExpenseCategoryPDF(b.dataset.expenseCategory)));
  document.querySelectorAll('[data-expense-selected-category-pdf]').forEach(b=>b.onclick=()=>runPdfButtonAction(b,()=>generateExpenseCategoryPDF($('#expenseCategoryFilter')?.value||localStorage.getItem(`blunno-expense-category-${period}-${branch}`)||'ALL')));
 
  document.querySelectorAll('[data-hour-field]').forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.dataset.advance='1';input.blur()}});input.addEventListener('blur',()=>saveHourCell(input));});
  document.querySelectorAll('[data-cash-cell] input').forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur()}});input.addEventListener('blur',()=>saveCashCell(input));});
  document.querySelectorAll('[data-cash-mobile-day]').forEach(detail=>detail.addEventListener('toggle',()=>{if(!detail.open)return;try{sessionStorage.setItem(`blunno-cash-mobile-day-${period}-${branch}`,detail.dataset.cashMobileDay||'')}catch{}const group=detail.closest('.cash-mobile-day-list, .cash-control-mobile-grid');group?.querySelectorAll(':scope > details[data-cash-mobile-day]').forEach(other=>{if(other!==detail)other.open=false});}));
  document.querySelectorAll('[data-cash-add-row]').forEach(b=>b.onclick=()=>addCashConcept(b.dataset.cashAddRow));
  document.querySelectorAll('[data-cash-delete-concept]').forEach(b=>{
    b.onclick=e=>{e.preventDefault();e.stopPropagation();void deleteCashConcept(b.dataset.cashDeleteType,b.dataset.cashDeleteConcept,b.dataset.cashDeleteConceptId);};
  });
  document.querySelectorAll('[data-hours-adjust]').forEach(b=>b.onclick=()=>editEmployeeAdjustment(b.dataset.employeeAdjust,b.dataset.hoursAdjust));
  $('#hoursEmployeeFilter')?.addEventListener('change',e=>{localStorage.setItem('blunno-hours-employee',e.target.value);refresh()});
  document.querySelectorAll('[data-cash-week]').forEach(b=>b.onclick=()=>{
    if(b.dataset.switching==='1' || window.__blunnoCashWeekSwitching)return;
    const dir=b.dataset.cashWeek; if(dir!=='next'&&dir!=='prev')return;
    window.__blunnoCashWeekSwitching=true; b.dataset.switching='1';
    try { changeCashWeek(dir); } finally {
      setTimeout(()=>{window.__blunnoCashWeekSwitching=false; b.dataset.switching='0';},120);
    }
  });
  document.querySelectorAll('[data-hours-week]').forEach(b=>b.onclick=()=>{
    if(b.dataset.switching==='1' || window.__blunnoHoursWeekSwitching)return;
    const dir=b.dataset.hoursWeek; if(dir!=='next'&&dir!=='prev')return;
    window.__blunnoHoursWeekSwitching=true; b.dataset.switching='1';
    try { changeHoursWeek(dir); } finally {
      setTimeout(()=>{window.__blunnoHoursWeekSwitching=false; b.dataset.switching='0';},120);
    }
  });
  $('#trashRestoreSelected')?.addEventListener('click',restoreSelectedTrash);
  $('#trashPurgeSelected')?.addEventListener('click',purgeSelectedTrash);
  $('#trashEmpty')?.addEventListener('click',purgeAllTrash);
  $('#trashSelectAll')?.addEventListener('change',e=>document.querySelectorAll('.trash-select').forEach(x=>x.checked=e.target.checked));
  document.querySelectorAll('[data-purge]').forEach(b=>b.onclick=()=>purgeOneTrash(b.dataset.purge,b.dataset.id));
  $('#backBtn')?.addEventListener('click',goBack); $('#forwardBtn')?.addEventListener('click',goForward);
  $('#closePdfSuccess')?.addEventListener('click',closePdfSuccess);
  document.querySelectorAll('[data-close-pdf-success]').forEach(b=>b.onclick=closePdfSuccess);
  $('#pdfSuccessDownload').onclick=downloadCurrentPdf;
  $('#pdfSuccessPrint').onclick=printCurrentPdf;
  document.querySelectorAll('[data-pdf-close]').forEach(b=>{b.type='button';b.onclick=e=>{e.preventDefault();void runViewPdfAction(b);};});
  document.querySelectorAll('[data-view-file]').forEach(b=>b.onclick=()=>viewStoredFile(b.dataset.viewFile));
  document.querySelectorAll('[data-download-file]').forEach(b=>b.onclick=()=>downloadStoredFile(b.dataset.downloadFile));
  document.querySelectorAll('[data-print-file]').forEach(b=>b.onclick=()=>printStoredFile(b.dataset.printFile));
  document.querySelectorAll('[data-dashboard-detail]').forEach(b=>b.onclick=()=>showDashboardDetail(b.dataset.dashboardDetail));
  document.querySelectorAll('[data-invoice-quick-save]').forEach(b=>b.onclick=quickInvoiceSave);
  const quickProvider=$('#quickInvoiceProvider');if(quickProvider)wireProviderPicker(quickProvider);
  $('#cashOpeningButton')?.addEventListener('click',editCashOpening);
  $('#cashLateEditButton')?.addEventListener('click',async event=>{
    const button=event.currentTarget;
    if(!cashLateRequired()){toast('La edición tardía no es necesaria en el mes actual.');return;}
    if(branch==='General'){toast('Elegí una sucursal concreta para modificar Caja Diaria.',false);return;}
    if(cashLateEnabled()){
      if(!currentOperator){toast('Seleccioná un responsable antes de desactivar la edición tardía.',false);return;}
      button.disabled=true;
      try{
        await disableCashLateSession(period,branch,currentOperator);
        toast(`Edición tardía desactivada para ${periodLabel(period)} · ${branch}.`);
      }catch(error){toast(error.message||'No se pudo desactivar la edición tardía.',false);}
      finally{refresh();}
      return;
    }
    cashLatePending={period,branch,onReady:null};
    openPeriodActionConfirm('cash-late',period,branch);
  });
  document.querySelectorAll('[data-hours-focus]').forEach(b=>b.onclick=()=>document.querySelector('[data-hour-field="hours"]')?.focus());
  document.querySelectorAll('[data-open-holidays]').forEach(b=>b.onclick=openHolidayCalendar);
 
  document.querySelectorAll('[data-close-period]').forEach(b=>b.onclick=openCloseConfirm);
  document.querySelectorAll('[data-modify-closed-period]').forEach(b=>b.onclick=()=>openPeriodActionConfirm('edit',period));
  document.querySelectorAll('[data-close-review]').forEach(b=>b.onclick=()=>{const target=b.dataset.closeReview||'dashboard';localStorage.setItem('blunno-close-review-flash',target);navigate(target);});
  document.querySelectorAll('[data-close-version]').forEach(b=>b.onclick=()=>{const c=Store.getRaw('closures',b.dataset.closeVersion);if(c)generateClosurePDF(c,{downloadNow:true})});
  document.querySelectorAll('[data-close-version-print]').forEach(b=>b.onclick=()=>printClosureVersion(b.dataset.closeVersionPrint));
  document.querySelectorAll('[data-close-version-download]').forEach(b=>b.onclick=()=>downloadClosureVersion(b.dataset.closeVersionDownload));
  document.querySelectorAll('[data-reopen-period]').forEach(b=>b.onclick=openReopenConfirm);
  document.querySelectorAll('[data-period-edit]').forEach(b=>b.onclick=()=>openPeriodActionConfirm('edit',b.dataset.periodEdit));
  $("#exportAudit")?.addEventListener('click',()=>download(`auditoria-blunno-${period}-${String(branch).replace(/\s+/g,'-').toLowerCase()}.json`,JSON.stringify(auditForContext(period,branch),null,2),'application/json'));
  $("#backupButton")?.addEventListener('click',()=>Store.exportJson());
  $("#backupZipButton")?.addEventListener('click',createBackupZip);
  $("#backupRestoreInput")?.addEventListener('change',e=>restoreBackupFile(e.target.files?.[0]));
  $("#exportExcelButton")?.addEventListener('click',exportExcel);
  $("#excelInput")?.addEventListener('change',handleExcel);
  $('#analyzeWorkbookButton')?.addEventListener('click',()=>window.__blunnoWorkbook&&analyzeWorkbook(window.__blunnoWorkbook,document.querySelector('#excelInput')?.files?.[0]?.name||'Excel'));
 
}

async function deleteRecord(collection,id){
  if(branch==='General'&&['invoices','cash','expenses','investments','employees','hours','incomes'].includes(collection)){toast('General es solo una vista consolidada. Elegí una sucursal concreta.',false);return}
  if(CONFIRM_DELETE_COLLECTIONS.has(collection)){ openDeleteRecordConfirmation(collection,id); return; }
  const responsible=getDeleteResponsible();const row=Store.get(collection,id);if(!row){toast('El registro ya no está disponible.',false);return}
  const label=collection==='employees'?`¿Borrar a ${row.name||'este empleado'} y enviar a Papelera también sus horas, deudas, liquidaciones y comprobantes relacionados?`:`¿Borrar este registro de ${sectorForCollection(collection)} y enviarlo a la papelera?`;if(!confirm(label))return;
  try{if(collection==='employees'){const result=await Store.removeEmployeeCascade(id,responsible,'Baja de empleado y eliminación en cascada');$('#detailModal')?.classList.add('hidden');toast(`Empleado enviado a Papelera. ${result.removed.liquidations} liquidación(es), ${result.removed.hours} registro(s) de horas y ${result.removed.employeeDebts} ajuste(s) también fueron enviados.`);}else{await Store.remove(collection,id,responsible,'Baja lógica confirmada');$('#detailModal')?.classList.add('hidden');toast('El registro fue eliminado y quedó en la papelera.')}refresh();}catch(e){toast(e.message||'No se pudo eliminar el registro.',false)}}
async function restoreRecord(collection,id){if(branch==='General' && ['invoices','cash','expenses','investments','employees','hours','incomes'].includes(collection)){toast('General es solo una vista consolidada. Elegí una sucursal concreta.',false);return}if(!currentOperator){toast('Elegí el responsable antes de restaurar.',false);return}try{await Store.restore(collection,id,currentOperator);toast('Restaurado con éxito.');refresh()}catch(e){toast(e.message,false)}}
async function bulkDelete(collection){
  if(branch==='General' && ['invoices','cash','expenses','investments','employees','hours','incomes'].includes(collection)){toast('General es solo una vista consolidada. Elegí una sucursal concreta.',false);return}
  const responsible = getDeleteResponsible();
  const items=[...new Set([...document.querySelectorAll(`[data-bulk-select="${collection}"]:checked`)].map(x=>x.dataset.id).filter(Boolean))];
  if(!items.length){toast('Seleccioná al menos un elemento.',false);return;}
  if(!confirm(`¿Mover ${items.length} elemento(s) a la papelera?`))return;
  try{for(const id of items)await Store.remove(collection,id,responsible,'Baja lógica seleccionada');toast('Los elementos seleccionados fueron enviados a la papelera.');refresh();}catch(e){toast(e.message,false)}
}

function selectedTrash(){return [...document.querySelectorAll('.trash-select:checked')].map(x=>({collection:x.dataset.collection,id:x.dataset.id}));}
async function restoreSelectedTrash(){const items=selectedTrash();if(!items.length){toast('Seleccioná al menos un elemento.',false);return}if(!currentOperator){toast('Elegí responsable.',false);return}try{await Store.restoreMany(items,currentOperator);toast('Restaurado con éxito.');refresh()}catch(e){toast(e.message,false)}}
async function purgeSelectedTrash(){const items=selectedTrash();if(!items.length){toast('Seleccioná al menos un elemento.',false);return}if(!currentOperator){toast('Elegí responsable.',false);return}if(!confirm(`¿Eliminar definitivamente ${items.length} elemento(s)? Esta acción no se puede deshacer.`))return;try{await Store.purgeTrashMany(items,currentOperator);toast('Elementos eliminados definitivamente.');refresh()}catch(e){toast(e.message,false)}}
async function purgeAllTrash(){if(!currentOperator){toast('Elegí responsable.',false);return}const items=Store.trash();if(!items.length)return toast('La papelera ya está vacía.');if(!confirm(`¿Vaciar definitivamente toda la papelera (${items.length} elementos)?`))return;try{await Store.purgeTrashMany(items,currentOperator);toast('Papelera vaciada definitivamente.');refresh()}catch(e){toast(e.message,false)}}
async function purgeOneTrash(collection,id){if(!currentOperator){toast('Elegí responsable.',false);return}if(!confirm('¿Eliminar definitivamente este elemento? Esta acción no se puede deshacer.'))return;try{await Store.purgeTrashItem(collection,id,currentOperator);toast('Eliminado definitivamente.');refresh()}catch(e){toast(e.message,false)}}

async function completeTask(id){try{const task=Store.get('tasks',id);if(!task)throw new Error('No se encontró el recordatorio.');await Store.completeTask(id,currentOperator);if(task.repeat&&task.repeat!=='none'){const d=new Date(`${task.dueDate}T12:00:00`);if(task.repeat==='daily')d.setDate(d.getDate()+1);if(task.repeat==='weekly')d.setDate(d.getDate()+7);if(task.repeat==='monthly')d.setMonth(d.getMonth()+1);await Store.addTask({title:task.title,description:task.description,dueDate:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,dueTime:task.dueTime||'',priority:task.priority||'normal',responsible:task.responsible,repeat:task.repeat,notes:task.notes||'',status:'pending'},currentOperator);}toast('Recordatorio marcado como realizado.');refresh()}catch(e){toast(e.message,false)}}

function openHolidayCalendar(){
 if(branch==='General'){toast('Elegí una sucursal concreta para configurar feriados.',false);return}
 const days=daysInPeriod(period),selected=new Map();Store.list('hours',period,branch).filter(x=>x.holiday==='yes').forEach(x=>selected.set(x.date,Number(x.hours||0)||8));
 const overlay=document.createElement('div');overlay.className='modal holiday-calendar-modal';overlay.innerHTML=`<div class="modal-card holiday-card"><div class="modal-header"><div><small>CONFIGURACIÓN DE FERIADOS</small><h2>Feriados · ${periodLabel(period)}</h2></div><button class="close-button" data-holiday-close>×</button></div><div class="holiday-intro">¿Hubo feriados? <b>${selected.size?'Sí':'No'}</b>. Seleccioná los días trabajados y cargá las horas.</div><div class="holiday-calendar-grid">${Array.from({length:days},(_,i)=>{const d=i+1,date=isoDate(period,d);return `<button type="button" class="holiday-day ${selected.has(date)?'selected':''}" data-holiday-day="${date}"><span>${d}</span><small>${new Date(`${date}T12:00:00`).toLocaleDateString('es-AR',{weekday:'short'}).replace('.','')}</small></button>`}).join('')}</div><div id="holidayHoursEditor" class="holiday-hours-editor"></div><div class="modal-footer"><button class="secondary-button" data-holiday-no>No</button><button class="primary-button" data-holiday-save>Guardar feriados</button></div></div>`;document.body.appendChild(overlay);const editor=overlay.querySelector('#holidayHoursEditor');
 const renderEditor=()=>{editor.innerHTML=[...selected.entries()].map(([date,h])=>`<label class="field"><span>${dateLabel(date)} · horas trabajadas</span><input type="number" min="0" max="24" step="0.5" data-holiday-hours="${date}" value="${h||8}"></label>`).join('')||'<div class="empty-block">No hay días seleccionados.</div>';};
 overlay.querySelectorAll('[data-holiday-day]').forEach(btn=>btn.onclick=()=>{const d=btn.dataset.holidayDay;if(selected.has(d)){selected.delete(d);btn.classList.remove('selected')}else{selected.set(d,8);btn.classList.add('selected')}renderEditor()});renderEditor();
 overlay.querySelector('[data-holiday-no]').onclick=async()=>{selected.clear();await saveHolidayCalendar(selected,overlay)};
 overlay.querySelector('[data-holiday-save]').onclick=async()=>{for(const input of overlay.querySelectorAll('[data-holiday-hours]')){const h=Number(input.value||0);if(!Number.isFinite(h)||h<0||h>24){toast('Las horas de un feriado deben estar entre 0 y 24.',false);return}selected.set(input.dataset.holidayHours,h)}await saveHolidayCalendar(selected,overlay)};
 overlay.querySelector('[data-holiday-close]').onclick=()=>overlay.remove();
}
async function saveHolidayCalendar(selected,overlay){try{if(!currentOperator)throw new Error('Elegí responsable antes de configurar feriados.');const employees=Store.list('employees').filter(e=>e.active!==false&&e.branch===branch);const current=Store.list('hours',period,branch);for(const employee of employees){for(let d=1;d<=daysInPeriod(period);d++){const date=isoDate(period,d),existing=current.find(x=>x.employeeId===employee.id&&x.date===date);if(selected.has(date)){const h=Number(selected.get(date)||0),data={period,date,branch,employeeId:employee.id,employee:employee.name,hours:h,displayValue:`${h}H`,holiday:'yes',status:'',advance:existing?.advance||0,merchandise:existing?.merchandise||0,overtimeHours:Number(existing?.overtimeHours||0),salaryCost:h*Number(employee.hourlyRate||0),notes:existing?.notes||''};if(existing)await Store.update('hours',existing.id,data,currentOperator,'Configuración de feriado');else await Store.add('hours',data,currentOperator,'Configuración de feriado');}else if(existing?.holiday==='yes'){await Store.update('hours',existing.id,{holiday:'no',displayValue:existing.hours||'',salaryCost:Number(existing.hours||0)*Number(employee.hourlyRate||0)},currentOperator,'Quitar feriado');}}}overlay.remove();toast('Se ha guardado con éxito este cambio.');refresh();}catch(e){toast(e.message,false)}}
async function saveHourCell(input){
 if(!currentOperator){toast('Elegí responsable antes de cargar horas.',false);input.blur();return}
 if(branch==='General'){toast('La planilla de horas es editable solo por sucursal.',false);input.blur();return}
 const td=input.closest('td'); const date=input.dataset.hourDate||td?.dataset.hourDate, employeeId=input.dataset.employee||td?.dataset.employee, field=input.dataset.hourField||'hours'; if(!date||!employeeId)return;
 const employee=Store.get('employees',employeeId); if(!employee)return;
 const existing=Store.list('hours',period,branch).find(x=>x.employeeId===employeeId&&x.date===date);
 const value=input.value.trim();
 try{
   if(field==='overtime'){
     const hoursExtra=value===''?0:Number(value.replace(',','.'));
     if(!Number.isFinite(hoursExtra)||hoursExtra<0||hoursExtra>24)throw new Error('Ingresá horas extras entre 0 y 24.');
     if(!existing && hoursExtra===0)return;
     const data={period,date,branch:employee.branch,employeeId,employee:employee.name,hours:existing?.hours||0,displayValue:existing?.displayValue||'',status:existing?.status||'',advance:existing?.advance||0,merchandise:existing?.merchandise||0,holiday:existing?.holiday||'no',overtimeHours:hoursExtra,salaryCost:Number(existing?.hours||0)*Number(employee.hourlyRate||0),notes:existing?.notes||''};
     if(existing) await Store.update('hours',existing.id,data,currentOperator,'Edición de horas extras'); else await Store.add('hours',data,currentOperator,'Carga de horas extras');
   } else {
     if(!value){
       if(existing && !Number(existing.overtimeHours||0) && !Number(existing.advance||0) && !Number(existing.merchandise||0)) await Store.remove('hours',existing.id,currentOperator,'Borrado de celda de horas');
       else if(existing) await Store.update('hours',existing.id,{hours:0,displayValue:'',status:'',holiday:'no',salaryCost:0},currentOperator,'Limpieza de celda de horas');
     } else {
       const normalized=value.replace(',','.').trim();
       const holidayWithHours=normalized.match(/^(\d+(?:\.\d+)?)\s*h$/i);
       const holidayKey=/^h$/i.test(normalized) || /^feriado$/i.test(normalized);
       const isHolidayRest=/^f$/i.test(normalized);
       const isFranco=/^(franco|fr)$/i.test(normalized);
       let hours,displayValue,holiday='no',status='';
       if(isHolidayRest){hours=0;displayValue='F';holiday='yes';status='feriado';}
       else if(isFranco){hours=0;displayValue='FRANCO';status='franco';}
       else if(holidayWithHours){hours=Number(holidayWithHours[1]);displayValue=`${hours}H`;holiday='yes';status='holiday-worked';}
       else if(holidayKey){hours=0;displayValue='H';holiday='yes';status='holiday-worked';}
       else {hours=Number(normalized);displayValue=String(hours);}
       if(!Number.isFinite(hours)||hours<0||hours>24)throw new Error('Ingresá horas entre 0 y 24, F = feriado sin trabajar, 8H = feriado trabajado y FRANCO = descanso.');
       const data={period,date,branch:employee.branch,employeeId,employee:employee.name,hours,displayValue,status,advance:existing?.advance||0,merchandise:existing?.merchandise||0,holiday,overtimeHours:Number(existing?.overtimeHours||0),salaryCost:hours*Number(employee.hourlyRate||0),notes:existing?.notes||''};
       if(existing) await Store.update('hours',existing.id,data,currentOperator,'Edición directa de planilla'); else await Store.add('hours',data,currentOperator,'Carga directa de planilla');
     }
   }
   toast('Celda guardada y auditada.');
   if(input.dataset.advance==='1'){delete input.dataset.advance;const next=input.closest('td')?.nextElementSibling?.querySelector('input[data-hour-field="hours"]');if(next){next.focus();next.select();}else refresh();} else refresh();
 }catch(e){toast(e.message,false)}
}
let cashLatePending=null;
function cashLateKey(){return `blunno-cash-late-${period}-${branch}`}
function cashLateEnabled(p=period,b=branch){try{return sessionStorage.getItem(`blunno-cash-late-${p}-${b}`)==='1'}catch{return false}}
function cashLateRequired(p=period){return String(p)!==String(today()).slice(0,7)}
function enableCashLateSession(p=period,b=branch,responsible=currentOperator){
  try{sessionStorage.setItem(`blunno-cash-late-${p}-${b}`,'1')}catch{}
  setPeriodEditConfirmed(p,b,true);
  return Store.recordAudit('CASH_LATE_EDIT_ENABLED','cash',null,{period:p,branch:b},responsible,'Habilitación de edición tardía de Caja diaria',{period:p,branch:b,lateMovement:true});
}
async function disableCashLateSession(p=period,b=branch,responsible=currentOperator){
  const key=`blunno-cash-late-${p}-${b}`;
  let storage;
  try{storage=sessionStorage;storage.removeItem(key);}
  catch{throw new Error('El navegador no permitió desactivar la edición tardía. Revisá la configuración de almacenamiento e intentá nuevamente.');}
  try{
    await Store.recordAudit('CASH_LATE_EDIT_DISABLED','cash',null,{period:p,branch:b},responsible,'Desactivación de edición tardía de Caja diaria',{period:p,branch:b,lateMovement:false});
  }catch(error){
    try{storage.setItem(key,'1');}catch{}
    throw error;
  }
  return true;
}
function requestCashLateEdit(onReady){
  if(branch==='General'){toast('General es solo una vista consolidada. Elegí una sucursal concreta para editar Caja.',false);return false}
  if(!cashLateRequired())return true;
  if(cashLateEnabled())return true;
  cashLatePending={period,branch,onReady};
  openPeriodActionConfirm('cash-late',period,branch);
  return false;
}
function finishCashLateEdit(){
  const p=cashLatePending;if(!p)return;
  cashLatePending=null;
  refresh();
  toast(`Edición tardía habilitada para Caja Diaria de ${periodLabel(p.period)}.`);
  if(typeof p.onReady==='function')p.onReady();
}
async function saveCashCell(input){
 if(/saldo\s+d[ií]a\s+anterior/i.test(String(input.closest('td')?.dataset.concept||''))){toast('Saldo día anterior se calcula automáticamente con el resto del día previo.');return}
 if(branch==='General'){toast('General es solo una vista consolidada. Elegí una sucursal concreta para editar Caja.',false);return}
 if(!requestCashLateEdit(()=>saveCashCell(input)))return;
 if(!currentOperator){toast('Elegí responsable antes de cargar caja.',false);return}
 const td=input.closest('td'); const date=td?.dataset.date, type=td?.dataset.type, concept=td?.dataset.concept; if(!date||!type||!concept)return;
 if(!Store.cashConcepts(type,period,branch).some(x=>sourceIdentity(x)===sourceIdentity(concept))){toast('Ese concepto ya no está disponible para nuevas cargas.',false);refresh();return}
 const existing=Store.list('cash',period,branch).find(x=>x.date===date&&x.type===type&&(x.concept||'Sin concepto')===concept);
 const value=input.value.trim();
 try{
   if(!value){if(existing) await Store.remove('cash',existing.id,currentOperator,'Borrado de celda de caja',{lateMovement:cashLateRequired()&&cashLateEnabled()});}
   else {const amount=Number(value.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<0)throw new Error('Ingresá un importe válido.');const data={period,date,branch:type?branch:'General',type,concept,amount,expected:existing?.expected||0,notes:existing?.notes||''};const lateMovement=cashLateRequired()&&cashLateEnabled();if(existing)await Store.update('cash',existing.id,data,currentOperator,'Edición directa de planilla de caja',{lateMovement});else await Store.add('cash',data,currentOperator,'Carga directa de planilla de caja',{lateMovement});}
   toast('Importe guardado y auditado.'); refresh();
 }catch(e){toast(e.message,false)}
}

async function addCashConcept(type){
 if(!requestCashLateEdit(()=>addCashConcept(type)))return;
 if(!currentOperator){toast('Elegí responsable antes de agregar un concepto.',false);return}
 if(branch==='General'){toast('General es solo una vista consolidada. Elegí una sucursal concreta.',false);return}
 const labels={income:'Nombre del concepto de ingreso:',expense:'Nombre del concepto de gasto de caja:',payment:'Nombre del concepto de pago:'};
 const concept=prompt(labels[type]||'Nombre del concepto:'); if(!concept?.trim())return;
 try{await Store.addCashConcept({period,branch,type,name:concept.trim()},currentOperator);toast('Concepto agregado a la planilla.');refresh()}catch(e){toast(e.message,false)}
}
async function deleteCashConcept(type,name,id=null){
 if(!requestCashLateEdit(()=>deleteCashConcept(type,name,id)))return;
 if(branch==='General'){toast('General es solo una vista consolidada. Elegí una sucursal concreta.',false);return}
 const responsible=getDeleteResponsible();
 if(Store.isProtectedCashConcept(type,name)){toast('Este concepto es automático y no se puede eliminar.',false);return}
 if(!confirm(`¿Eliminar el concepto “${name}” de Caja diaria para ${periodLabel(period)} · ${branch}?

El concepto dejará de estar disponible para nuevas cargas. Los importes asociados en este período, sucursal y tipo quedarán en $0; el monto anterior permanecerá registrado en la auditoría para su consulta.`))return;
 try{await Store.removeCashConcept({period,branch,type,name,id},responsible);toast('Concepto eliminado. Los importes asociados quedaron en $0 y el valor anterior permanece auditado.');refresh()}catch(e){toast(e.message||'No se pudo eliminar el concepto.',false)}
}
async function deleteCompletedTask(id){
 const task=Store.get('tasks',id);
 if(!task){toast('El recordatorio ya no está disponible.',false);return}
 if(task.status!=='completed'){toast('Solo se pueden eliminar desde aquí recordatorios ya realizados.',false);return}
 const responsible=getDeleteResponsible();
 if(!confirm(`¿Eliminar el recordatorio “${task.title}” y enviarlo a la Papelera?\n\nEl registro quedará disponible para restaurarlo durante el período de retención habitual.`))return;
 try{await Store.remove('tasks',id,responsible,'Eliminación de recordatorio realizado');toast('Recordatorio enviado a Papelera.');refresh()}catch(e){toast(e.message||'No se pudo eliminar el recordatorio.',false)}
}
async function editEmployeeAdjustment(employeeId,field){
 if(branch==='General'){toast('Los adelantos y la mercadería se editan por sucursal.',false);return}
 if(!currentOperator){toast('Elegí responsable.',false);return}
 const employee=Store.get('employees',employeeId);if(!employee)return;
 const type=field==='advance'?'advance':'merchandise'; const label=type==='advance'?'adelantos / vales':'mercadería';
 const existing=Store.list('employeeDebts',period,branch).find(x=>x.employeeId===employeeId&&x.type===type);
 const current=Number(existing?.amount||0); const raw=prompt(`Monto mensual de ${label} para ${employee.name}:`,String(current)); if(raw===null)return;
 const amount=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<0){toast('Ingresá un monto válido.',false);return}
 try{const data={date:today(),period,branch:employee.branch,employeeId,employee:employee.name,type,amount};if(existing)await Store.update('employeeDebts',existing.id,data,currentOperator,`Edición de ${label}`);else await Store.add('employeeDebts',data,currentOperator,`Carga de ${label}`);toast(`${label} actualizado y auditado.`);refresh()}catch(e){toast(e.message,false)}
}

function openLiquidation(employeeId,liquidationId=null){
 if(branch==='General'){toast('Las liquidaciones se realizan dentro de una sucursal concreta.',false);return}
 const e=Store.get('employees',employeeId); if(!e)return;
 const existingLiq=liquidationId?Store.get('liquidations',liquidationId):null;
 if(existingLiq && existingLiq.employeeId!==employeeId) existingLiq=null;
 const rows=Store.list('hours',period,branch).filter(x=>x.employeeId===employeeId);
 const debts=Store.list('employeeDebts',period,branch).filter(x=>x.employeeId===employeeId);
 const prev=Store.list('employeeDebts',prevPeriod(period),branch).find(x=>x.employeeId===employeeId&&x.type==='negativeBalance');
 const hours=rows.reduce((s,x)=>s+Number(x.hours||0),0);
 const holidays=rows.filter(x=>x.holiday==='yes').reduce((s,x)=>s+Number(x.hours||0),0);
 const sundayHoursFromRows=rows.filter(x=>x.holiday!=='yes'&&new Date(`${x.date}T12:00:00`).getDay()===0).reduce((s,x)=>s+Number(x.hours||0),0);
 const normalHoursFromRows=Math.max(0,hours-holidays-sundayHoursFromRows);
 const overtime=rows.reduce((s,x)=>s+Number(x.overtimeHours||0),0);
 const advance=rows.reduce((s,x)=>s+Number(x.advance||0),0)+debts.filter(x=>x.type==='advance').reduce((s,x)=>s+Number(x.amount||0),0);
 const merchandise=rows.reduce((s,x)=>s+Number(x.merchandise||0),0)+debts.filter(x=>x.type==='merchandise').reduce((s,x)=>s+Number(x.amount||0),0);
 const previousDebt=Number(existingLiq?.previousNegativeBalance ?? prev?.amount ?? 0);
 const initialNormal=Number(existingLiq?.normalHours ?? (existingLiq?hours:normalHoursFromRows)),initialHoliday=Number(existingLiq?.holidayHours ?? holidays),initialSunday=Number(existingLiq?.sundayHours ?? (existingLiq?0:sundayHoursFromRows)),initialOvertime=Number(existingLiq?.overtimeHours ?? overtime),initialAdvance=Number(existingLiq?.advance ?? advance),initialMerch=Number(existingLiq?.merchandise ?? merchandise),initialTotal=Number(existingLiq?.totalHours ?? (initialNormal+initialHoliday+initialSunday+initialOvertime)),initialRate=Number(existingLiq?.hourlyRate ?? e.hourlyRate ?? 0),initialHolidayRate=Number(existingLiq?.holidayRate ?? Number(e.hourlyRate||0)*2),initialSundayRate=Number(existingLiq?.sundayRate ?? e.sundayHourlyRate ?? e.hourlyRate ?? 0);
 $("#liquidationBody").innerHTML=`<div class="liquidation-grid"><div><span>Empleado</span><b>${esc(e.name)}</b></div></div><div class="liquidation-edit-grid"><label class="field">Horas normales<input id="liqNormalHours" type="number" min="0" step="0.5" value="${initialNormal}"></label><label class="field">Horas domingo<input id="liqSundayHours" type="number" min="0" step="0.5" value="${initialSunday}"></label><label class="field">Horas de feriado<input id="liqHolidayHours" type="number" min="0" step="0.5" value="${initialHoliday}"></label><label class="field">Horas extras<input id="liqOvertimeHours" type="number" min="0" step="0.5" value="${initialOvertime}"></label><label class="field">Total horas contabilizadas<input id="liqTotalHours" type="number" min="0" step="0.5" value="${initialTotal}"></label><label class="field">Adelantos<input id="liqAdvance" type="number" min="0" step="0.01" value="${initialAdvance}"></label><label class="field">Mercadería<input id="liqMerch" type="number" min="0" step="0.01" value="${initialMerch}"></label></div><div class="liquidation-grid"><div><span>Saldo negativo anterior</span><b>${money(previousDebt)}</b></div></div><div class="liquidation-rate-grid"><label class="field">Valor hora normal<input id="liqRate" type="number" min="0" step="0.01" value="${initialRate}"></label><label class="field">Valor hora domingo<input id="liqSundayRate" type="number" min="0" step="0.01" value="${initialSundayRate}"></label><label class="field">Valor hora feriado<input id="liqHolidayRate" type="number" min="0" step="0.01" value="${initialHolidayRate}"></label></div><p class="liquidation-rate-hint">El valor de domingo se completa inicialmente con la hora habitual: cambiá ese importe por la tarifa dominical acordada. Si un domingo también es feriado, esas horas se cuentan como feriado para no duplicar el pago.</p><div class="liquidation-live-note"><span class="liquidation-live-dot"></span><b>Cálculo automático en vivo</b><span>El resumen se actualiza al instante cuando cambiás horas, adelantos, mercadería o tarifas.</span></div><div id="liqTotal" class="liq-total" role="status" aria-live="polite" aria-atomic="true"></div><div class="modal-footer"><button class="secondary-button" data-close-liquidation>Cancelar</button><button class="primary-button" id="saveLiquidation">Totalizar sueldo y guardar PDF</button></div>`;
 const calc=()=>{const r=Number($('#liqRate').value||0),sr=Number($('#liqSundayRate').value||0),hr=Number($('#liqHolidayRate').value||0),nhRaw=$('#liqNormalHours').value,shRaw=$('#liqSundayHours').value,hhRaw=$('#liqHolidayHours').value,ohRaw=$('#liqOvertimeHours').value,advRaw=$('#liqAdvance').value,merRaw=$('#liqMerch').value,totalRaw=$('#liqTotalHours').value,nh=Number(nhRaw||0),sh=Number(shRaw||0),hh=Number(hhRaw||0),oh=Number(ohRaw||0),adv=Number(advRaw||0),mer=Number(merRaw||0),totalH=Number(totalRaw===''?nh+sh+hh+oh:totalRaw),gross=nh*r+sh*sr+hh*hr+oh*r,net=gross-adv-mer-previousDebt;$('#liqTotal').innerHTML=`<b>Horas normales: ${number(nh)}</b><b>Horas domingo: ${number(sh)}</b><b>Horas feriado: ${number(hh)}</b><b>Horas extras: ${number(oh)}</b><b>Total contabilizado: ${number(totalH)}</b><b>Sueldo bruto: ${money(gross)}</b><b>Descuentos: ${money(adv+mer)}</b><b>Saldo negativo anterior: ${money(previousDebt)}</b><b>${net>=0?'A cobrar':'SALDO NEGATIVO'}: ${money(Math.abs(net))}</b>`;return{r,sr,hr,nh,sh,hh,oh,adv,mer,totalH,gross,net}};
 const liveLiquidationFields=['liqNormalHours','liqSundayHours','liqHolidayHours','liqOvertimeHours','liqTotalHours','liqAdvance','liqMerch','liqRate','liqSundayRate','liqHolidayRate'];
 liveLiquidationFields.forEach(id=>{const field=document.getElementById(id);if(field){field.addEventListener('input',calc);field.addEventListener('change',calc);}});
 calc();
 $('#saveLiquidation').onclick=async()=>{
  const btn=$('#saveLiquidation');
  if(btn.dataset.saving==='1')return;
  if(!currentOperator){toast('Elegí responsable antes de totalizar el sueldo.',false);return;}
  btn.dataset.saving='1';btn.disabled=true;btn.setAttribute('aria-busy','true');
  const originalText=btn.textContent;
  btn.textContent='Guardando liquidación…';
  try{
    const c=calc();
    const late=Store.periodIsClosed(period,branch);
    const patch={date:today(),period,branch,employeeId,employee:e.name,normalHours:c.nh,sundayHours:c.sh,sundayRate:c.sr,holidayHours:c.hh,overtimeHours:c.oh,totalHours:c.totalH,hourlyRate:c.r,holidayRate:c.hr,advance:c.adv,merchandise:c.mer,previousNegativeBalance:previousDebt,gross:c.gross,net:c.net,responsible:currentOperator,status:'GENERADO',paymentStatus:'NO PAGADO',updatedAt:now()};
    const blob=createSimplePDF('Comprobante de sueldo',`${e.name} · ${periodLabel(period)} · ${branch}`,[['Empleado',e.name],['Período',periodLabel(period)],['Estado','GENERADO · NO IMPLICA PAGO'],['Horas normales',number(c.nh)],['Horas domingo',number(c.sh)],['Horas feriado',number(c.hh)],['Horas extras',number(c.oh)],['Total horas contabilizadas',number(c.totalH)],['Valor hora',money(c.r)],['Valor hora domingo',money(c.sr)],['Valor hora feriado',money(c.hr)],['Adelantos',money(c.adv)],['Mercadería',money(c.mer)],['Saldo negativo anterior',money(previousDebt)],['Sueldo bruto',money(c.gross)],['Resultado de liquidación',money(c.net)],['Responsable',currentOperator]],'Comprobante interno de sueldo. Este documento registra la liquidación y no acredita que el sueldo haya sido pagado.');
    const name=`BLUNNO_Comprobante_Sueldo_${e.name.replace(/[^a-z0-9]+/gi,'_')}_${period}_${Date.now()}.pdf`;
    patch.pdfName=name;patch.pdfCreatedAt=now();
    let liq;
    if(existingLiq)liq=await Store.update('liquidations',existingLiq.id,patch,currentOperator,'Modificación de comprobante de sueldo',{lateMovement:late,fastLocal:true});
    else liq=await Store.add('liquidations',patch,currentOperator,'Totalización de sueldo',{lateMovement:late,fastLocal:true});

    let debtWarning='';
    try{
      const nextPeriodId=nextPeriod(period);
      const oldDebt=existingLiq?Store.list('employeeDebts',nextPeriodId,branch).find(x=>x.employeeId===employeeId&&x.type==='negativeBalance'&&x.originLiquidationId===existingLiq.id):null;
      if(c.net<0){
        const debtData={date:today(),period:nextPeriodId,branch:e.branch,employeeId,employee:e.name,type:'negativeBalance',amount:Math.abs(c.net),originPeriod:period,originLiquidationId:liq.id};
        if(oldDebt)await Store.update('employeeDebts',oldDebt.id,debtData,currentOperator,'Actualización de saldo negativo arrastrado',{lateMovement:Store.periodIsClosed(nextPeriodId,branch),allowFutureDerived:true,fastLocal:true});
        else await Store.add('employeeDebts',debtData,currentOperator,'Arrastre de saldo negativo al siguiente período',{lateMovement:Store.periodIsClosed(nextPeriodId,branch),allowFutureDerived:true,fastLocal:true});
      }else if(oldDebt){
        await Store.remove('employeeDebts',oldDebt.id,currentOperator,'El saldo negativo dejó de corresponder luego de actualizar la liquidación',{lateMovement:Store.periodIsClosed(nextPeriodId,branch),allowFutureDerived:true,fastLocal:true});
      }
    }catch(debtError){
      debtWarning=' La liquidación quedó guardada, pero no se pudo actualizar el saldo negativo del período siguiente: '+debtError.message;
      console.error('Actualización de saldo negativo pendiente',debtError);
    }

    let archiveWarning='';
    try{
      await Store.archiveFile({name,sector:'Liquidaciones',period,branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),sourceCollection:'liquidations',sourceId:liq.id,storagePath:storagePathFor(period,branch,'Liquidaciones',name),blob},{fastLocal:true});
    }catch(archiveError){
      archiveWarning=' El comprobante quedó listo para descargar, pero no se pudo guardar su copia en Archivos: '+archiveError.message;
      console.error('Archivo de liquidación',archiveError);
    }
    $('#liquidationModal').classList.add('hidden');
    const saveWarnings=[debtWarning,archiveWarning].filter(Boolean).join(' ');
    showPdfSuccess(existingLiq?'Comprobante de sueldo actualizado':'Comprobante de sueldo generado',`La liquidación de ${e.name} quedó guardada localmente. La sincronización con Firebase continúa en segundo plano.`,`<b>${esc(name)}</b><span>Estado: GENERADO · NO IMPLICA PAGO · Responsable: ${esc(currentOperator)}</span>${saveWarnings?`<span class="pdf-warning">${esc(saveWarnings)}</span>`:''}`,blob,name);
    refresh();
    toast(debtWarning?'Liquidación guardada con una observación en el saldo negativo.':archiveWarning?'Liquidación guardada. Descargá el PDF para conservar una copia.':'Liquidación guardada y PDF archivado. Sincronización en segundo plano.',!saveWarnings);
  }catch(err){
    console.error('No se pudo totalizar la liquidación',err);
    toast(err?.message||'No se pudo guardar la liquidación. Revisá el responsable y el almacenamiento local.',false);
  }finally{
    btn.dataset.saving='0';btn.disabled=false;btn.removeAttribute('aria-busy');btn.textContent=originalText;
  }
};
 document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden')); $('#liquidationModal').classList.remove('hidden');
}
function showSalaryVoucher(id){const x=Store.get('liquidations',id);if(!x)return;$('#detailTitle').textContent='Comprobante de sueldo';$('#detailBody').innerHTML=`<div class="detail-grid"><div><span>Empleado</span><b>${esc(x.employee)}</b></div><div><span>Período</span><b>${periodLabel(x.period)}</b></div><div><span>Estado</span><b>GENERADO · NO IMPLICA PAGO</b></div><div><span>Horas normales</span><b>${number(x.normalHours||0)}</b></div><div><span>Horas domingo</span><b>${number(x.sundayHours||0)}</b></div><div><span>Valor hora domingo</span><b>${money(x.sundayRate||0)}</b></div><div><span>Horas feriado</span><b>${number(x.holidayHours||0)}</b></div><div><span>Horas extras</span><b>${number(x.overtimeHours||0)}</b></div><div><span>Total horas</span><b>${number(x.totalHours||0)}</b></div><div><span>Sueldo bruto</span><b>${money(x.gross||0)}</b></div><div><span>Adelantos</span><b>${money(x.advance||0)}</b></div><div><span>Mercadería</span><b>${money(x.merchandise||0)}</b></div><div><span>Resultado</span><b>${money(x.net||0)}</b></div><div><span>Responsable</span><b>${esc(x.responsible||'—')}</b></div></div><div class="notice success">Este comprobante registra la liquidación. <b>No significa que el sueldo haya sido pagado.</b></div><div class="modal-footer"><button class="secondary-button" data-close-detail>Cerrar</button><button class="secondary-button" data-salary-edit="${x.id}">Modificar</button><button class="primary-button" data-salary-pdf="${x.id}">PDF</button><button type="button" class="danger-link" data-salary-delete="${x.id}">Eliminar</button></div>`;$('#detailModal').classList.remove('hidden');$('#detailBody').querySelector('[data-close-detail]').onclick=()=>$('#detailModal').classList.add('hidden');$('#detailBody').querySelector('[data-salary-edit]').onclick=()=>{$('#detailModal').classList.add('hidden');openLiquidationById(x.id)};$('#detailBody').querySelector('[data-salary-pdf]').onclick=event=>{const button=event.currentTarget;void runPdfButtonAction(button,()=>generateSalaryVoucherPDF(x.id));};$('#detailBody').querySelector('[data-salary-delete]').onclick=()=>deleteSalaryVoucher(x.id);}

function openLiquidationById(id){const x=Store.get('liquidations',id);if(x)openLiquidation(x.employeeId,id);}
async function deleteSalaryVoucher(id){const x=Store.get('liquidations',id);if(!x)return;const responsible=getDeleteResponsible();if(!confirm(`¿Eliminar el comprobante de sueldo de ${x.employee} correspondiente a ${periodLabel(x.period)}?\n\nSe enviará a Papelera, quedará auditado y no registrará un pago.`))return;try{const late=Store.periodIsClosed(x.period,x.branch);await Store.remove('liquidations',id,responsible,'Eliminación de comprobante de sueldo',{lateMovement:late});const debts=Store.list('employeeDebts',nextPeriod(x.period),x.branch).filter(d=>d.employeeId===x.employeeId&&d.type==='negativeBalance'&&d.originLiquidationId===id);for(const d of debts)await Store.remove('employeeDebts',d.id,responsible,'Eliminación del comprobante que originó saldo negativo',{lateMovement:Store.periodIsClosed(d.period,d.branch),allowFutureDerived:true,skipClosureVersion:true});$('#detailModal').classList.add('hidden');toast('Comprobante eliminado y enviado a Papelera.');refresh()}catch(e){toast(e.message,false)}}
async function generateSalaryVoucherPDF(id){
 const x=Store.get('liquidations',id);if(!x){toast('No se encontró la liquidación.',false);return null;}
 const blob=createSimplePDF('Comprobante de sueldo',`${x.employee||'Empleado'} · ${periodLabel(x.period)} · ${x.branch||branch}`,[['Empleado',x.employee||'—'],['Período',periodLabel(x.period)],['Estado','GENERADO · NO IMPLICA PAGO'],['Horas normales',number(x.normalHours||0)],['Horas domingo',number(x.sundayHours||0)],['Horas feriado',number(x.holidayHours||0)],['Horas extras',number(x.overtimeHours||0)],['Total horas',number(x.totalHours||0)],['Valor hora',money(x.hourlyRate||0)],['Valor hora domingo',money(x.sundayRate||0)],['Valor hora feriado',money(x.holidayRate||0)],['Adelantos',money(x.advance||0)],['Mercadería',money(x.merchandise||0)],['Saldo negativo anterior',money(x.previousNegativeBalance||0)],['Sueldo bruto',money(x.gross||0)],['Resultado',money(x.net||0)],['Responsable',x.responsible||'—']],'Comprobante interno de sueldo. No acredita que el sueldo haya sido pagado.');
 if(!blob)return null;
 const slug=String(x.employee||'Empleado').replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'')||'Empleado';
 const name=`BLUNNO_Comprobante_Sueldo_${slug}_${x.period}_${Date.now()}.pdf`;
 const fileData={name,sector:'Liquidaciones',period:x.period,branch:x.branch||branch,responsible:currentOperator||x.responsible,mime:'application/pdf',createdAt:now(),sourceCollection:'liquidations',sourceId:x.id,storagePath:storagePathFor(x.period,x.branch||branch,'Liquidaciones',name),blob};
 const meta=`<b>${esc(name)}</b><span>Estado: GENERADO · NO IMPLICA PAGO</span>`;
 return deliverPdfAndArchive({blob,name,title:'Comprobante de sueldo listo',description:`Documento interno de ${x.employee||'el empleado'}.`,meta,fileData,downloadNow:true});
}

function showProviderHistory(provider){
  const all = Store.list('invoices', period, branch);
  const inv = all.filter(x=>Store.invoiceMatchesProvider(x,provider)).map((x,i)=>({...x,_loadIndex:i})).sort((a,b)=>String(b.loadDate||b.createdAt||'').localeCompare(String(a.loadDate||a.createdAt||''))||a._loadIndex-b._loadIndex);
  const total = inv.reduce((sum,x)=>sum+Number(x.amount||0),0);
  $('#detailTitle').textContent='Historial · '+provider;
  let body='<div class="panel"><div class="mini-kpis">'+money(total)+' · '+inv.length+' facturas</div>';
  if(inv.length){body+='<div class="table-wrap"><table><thead><tr><th>Factura</th><th>Fecha movimiento</th><th>Fecha carga</th><th>Sucursal</th><th>Importe</th><th>Estado</th><th>PDF</th></tr></thead><tbody>';inv.forEach(function(x){body+='<tr><td>'+esc(x.number||'—')+'</td><td>'+dateLabel(x.operationDate||x.date)+'</td><td>'+dateTimeLabel(x.loadDate||x.createdAt)+'</td><td>'+esc(x.branch||'—')+'</td><td>'+money(x.amount)+'</td><td><span class="status-pill success">CARGADA</span></td><td><button class="secondary-button compact-button" data-invoice-pdf="'+esc(x.id)+'">PDF</button></td></tr>';});body+='</tbody></table></div>';} else body+='<div class="empty-block">No hay facturas de este proveedor en el período/perfil seleccionado.</div>';
  body+='<div class="modal-footer"><button class="primary-button" id="providerHistoryPdf">Generar historial PDF</button></div></div>';
  $('#detailBody').innerHTML=body; $('#detailModal').classList.remove('hidden'); $('#detailBody').querySelectorAll('[data-invoice-pdf]').forEach(invoiceButton=>invoiceButton.onclick=()=>runPdfButtonAction(invoiceButton,()=>generateInvoicePDF(invoiceButton.dataset.invoicePdf))); const historyPdfButton=$('#providerHistoryPdf');if(historyPdfButton)historyPdfButton.onclick=()=>runPdfButtonAction(historyPdfButton,()=>generateProviderHistoryPDF(provider,inv));
}

async function generateProviderHistoryPDF(provider,inv){
 if(!currentOperator){toast('Elegí responsable antes de generar el PDF.',false);return null;}
 const providerName=String(provider||'Sin proveedor').trim()||'Sin proveedor';
 const invoiceRows=Array.isArray(inv)?inv:[];
 const rows=[['Proveedor',providerName],['Período',periodLabel(period)],['Perfil',branch],['Cantidad de facturas',invoiceRows.length],['Total',money(invoiceRows.reduce((sum,x)=>sum+Number(x.amount||0),0))],...invoiceRows.map((x,i)=>[`Factura ${i+1}`,`${x.number||'—'} · ${dateLabel(x.operationDate||x.date)} · ${money(x.amount)} · ${x.branch||'—'} · CARGADA`])];
 const blob=createSimplePDF('HISTORIAL DE PROVEEDOR',`${providerName} · ${periodLabel(period)} · ${branch}`,rows,'Cada factura es un movimiento independiente.');if(!blob)return null;
 const slug=providerName.replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'')||'Sin_proveedor';
 const name=`BLUNNO_Historial_${slug}_${period}_${Date.now()}.pdf`;
 const fileData={name,sector:'Historial de proveedor',period,branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),sourceCollection:'invoices',storagePath:storagePathFor(period,branch,'Historial de proveedor',name),blob};
 const meta=`<b>${esc(name)}</b><span>Responsable: ${esc(currentOperator)} · ${esc(dateTimeLabel(now()))}</span>`;
 return deliverPdfAndArchive({blob,name,title:'Historial listo',description:`Se generó el historial completo de ${providerName}.`,meta,fileData,downloadNow:true});
}

async function generateInvoicePDF(id){
 if(!currentOperator){toast('Elegí responsable antes de generar el PDF.',false);return null;}
 const inv=Store.get('invoices',id);if(!inv){toast('La factura ya no está disponible.',false);return null;}
 const providerName=String(Store.invoiceProviderName(inv)||inv.provider||'Sin proveedor');
 const invoicePeriod=inv.period||period,invoiceBranch=inv.branch||branch;
 const blob=createSimplePDF('FACTURA CARGADA',`${providerName} · ${periodLabel(invoicePeriod)} · ${invoiceBranch}`,[['Proveedor',providerName],['Número de factura',inv.number||'—'],['Fecha de movimiento',dateLabel(inv.operationDate||inv.date)],['Fecha de carga',dateTimeLabel(inv.loadDate||inv.createdAt)],['Sucursal',invoiceBranch],['Importe',money(inv.amount)],['Estado','CARGADA'],['Responsable',inv.responsible||currentOperator],['Observaciones',inv.notes||'—']],'Documento de control interno de la factura cargada.');
 if(!blob){toast('No se pudo crear el PDF de esta factura.',false);return null;}
 const safeProvider=providerName.replace(/[^a-z0-9]+/gi,'_'),safeNumber=String(inv.number||'sin_numero').replace(/[^a-z0-9]+/gi,'_');
 const name=`BLUNNO_Factura_${safeProvider}_${safeNumber}_${invoicePeriod}_${Date.now()}.pdf`,storagePath=storagePathFor(invoicePeriod,invoiceBranch,'Facturas',name);
 const fileData={name,sector:'Facturas',period:invoicePeriod,branch:invoiceBranch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),sourceCollection:'invoices',sourceId:inv.id,storagePath,blob};
 const meta=`<b>${esc(name)}</b><span>Estado: CARGADA · Generado: ${esc(dateTimeLabel(now()))}</span>`;
 return deliverPdfAndArchive({blob,name,title:'Factura PDF lista',description:'La ficha documental de la factura fue generada.',meta,fileData,downloadNow:true});
}

function showDashboardDetail(kind){
 const s=Store.summary(period,branch); let title='',items=[];
 const withRows=(collection,list,labelFn,editType=collection)=>list.map(x=>({label:labelFn(x),collection,id:x.id,editType,...(x.sector?{sector:x.sector}:{})}));
 const estimateRows=Store.list('estimates',period,branch);
 const labelEstimate=x=>`🟡 ESTIMADO · ${dateLabel(x.date)} · ${x.concept||'Sin concepto'} · ${money(x.amount)} · Responsable: ${x.responsible||'—'}`;
 if(kind==='income'){
   title='Detalle de ingresos';
   const real=Store.list('incomes',period,branch);
   items=[...withRows('incomes',real,x=>`${dateLabel(x.date)} · ${x.method||'—'} · ${x.concept||'Sin concepto'} · ${money(x.amount)}`),...withRows('estimates',estimateRows.filter(x=>x.sector==='income'),labelEstimate,'estimate')];
 }
 if(kind==='expenses'){title='Detalle de gastos del local';items=withRows('expenses',Store.list('expenses',period,branch),x=>`${dateLabel(x.date)} · ${x.category} · ${x.concept||'Sin concepto'} · ${money(x.amount)}`)}
 if(kind==='providers'){title='Detalle de proveedores';items=withRows('invoices',Store.list('invoices',period,branch),x=>`${dateLabel(x.operationDate||x.date)} · ${Store.invoiceProviderName(x)||x.provider} · Factura ${x.number||'—'} · ${money(x.amount)}`)}
 if(kind==='investments'){title='Detalle de inversiones';items=withRows('investments',Store.list('investments',period,branch),x=>`${dateLabel(x.date)} · ${x.concept||'Sin concepto'} · ${money(x.amount)}`)}
 if(kind==='salary'){
   title='Detalle de personal';
   const liq=Store.list('liquidations',period,branch),latest=new Map();
   liq.forEach(x=>{const key=x.employeeId||x.employee;const prior=latest.get(key);if(!prior||String(x.updatedAt||x.createdAt)>String(prior.updatedAt||prior.createdAt))latest.set(key,x)});
   items=[...withRows('liquidations',[...latest.values()],x=>`${x.employee} · ${money(Math.max(0,Number(x.net||0)))} · A COBRAR · ${number(x.normalHours||0)} h normales · ${number(x.holidayHours||0)} h feriado`,'liquidation'),...withRows('estimates',estimateRows.filter(x=>x.sector==='salary'),labelEstimate,'estimate')];
 }
 if(kind==='result'){title='Cómo se calcula el resultado';items=[{label:`Ingresos reales · ${money(s.incomeReal)}`},{label:`+ Ingresos estimados · ${money(s.incomeEstimated)}`},{label:`Ingresos considerados · ${money(s.income)}`},{label:`− Gastos del local · ${money(s.localExpense)}`},{label:`− Proveedores · ${money(s.providers)}`},{label:`− Inversiones · ${money(s.investment)}`},{label:`− Personal liquidado real · ${money(s.salaryReal)}`},{label:`− Personal estimado · ${money(s.salaryEstimated)}`},{label:`Personal considerado · ${money(s.salary)}`},{label:`Resultado · ${money(s.result)}`},{label:'Caja diaria · NO está incluida en los valores estimados'}];}
 const canManage=(kind==='salary'||kind==='investments') && branch!=='General';
 $('#detailTitle').textContent=title;
 const summary=kind==='income'
  ? `<div class="estimate-detail-summary estimate-detail-summary-two"><div><span>Estimados</span><b>${money(s.incomeEstimated)}</b></div><div><span>Total considerado</span><b>${money(s.income)}</b></div></div>`
  : kind==='salary'
   ? `<div class="estimate-detail-summary"><div><span>Reales registrados</span><b>${money(s.salaryReal)}</b></div><div><span>Estimados</span><b>${money(s.salaryEstimated)}</b></div><div><span>Total considerado</span><b>${money(s.salary)}</b></div></div>`
   : '';
 $('#detailBody').innerHTML=`${summary}<div class="detail-summary-list">${items.length?items.map(x=>{const manage=!!x.id&&(canManage||x.collection==='estimates');return `<div><span>${esc(x.label)}</span>${x.id?`<div class="row-actions"><button class="secondary-button compact-button" data-detail-open="${esc(x.collection)}" data-id="${esc(x.id)}">Abrir</button>${manage?`<button class="secondary-button compact-button" data-dashboard-edit="${esc(x.editType)}" data-id="${esc(x.id)}" ${x.sector?`data-sector="${esc(x.sector)}"`:''}>Modificar</button><button type="button" class="danger-link" data-dashboard-delete="${esc(x.collection)}" data-id="${esc(x.id)}">Borrar</button>`:''}</div>`:'<b>—</b>'}</div>`}).join(''):'<div class="empty-block">No hay movimientos para este indicador.</div>'}</div>`;
 const header=$('#detailModal .modal-header');
 header?.querySelector('[data-add-estimate]')?.remove();
 if(kind==='income'||kind==='salary'){
   const add=document.createElement('button');add.type='button';add.className='secondary-button compact-button';add.dataset.addEstimate=kind;add.textContent='＋ Agregar valor estimado';
   const close=header?.querySelector('[data-close-detail]'); if(header&&close)header.insertBefore(add,close);
   add.onclick=()=>openEstimateModal(kind==='income'?'income':'salary');
 }
 $('#detailModal').classList.remove('hidden');
 document.querySelectorAll('[data-detail-open]').forEach(b=>b.onclick=()=>showDetail(b.dataset.detailOpen,b.dataset.id));
 document.querySelectorAll('[data-dashboard-edit]').forEach(b=>b.onclick=()=>{const type=b.dataset.dashboardEdit;$('#detailModal').classList.add('hidden');if(type==='liquidation')openLiquidationById(b.dataset.id);else if(type==='estimate')openEstimateModal(b.dataset.sector||Store.get('estimates',b.dataset.id)?.sector,b.dataset.id);else openModal(type,b.dataset.id);});
 document.querySelectorAll('[data-dashboard-delete]').forEach(b=>b.onclick=()=>{const collection=b.dataset.dashboardDelete; if(collection==='liquidations')deleteSalaryVoucher(b.dataset.id); else deleteRecord(collection,b.dataset.id);});
}
function closeEstimateModal(){ $('#estimateModal')?.classList.add('hidden'); }
function openEstimateModal(sector='income',id=null){
  if(!['income','salary'].includes(sector)){toast('Sector de estimación inválido.',false);return;}
  const existing=id?Store.get('estimates',id):null;
  if(id&&!existing){toast('Ese valor estimado ya no está disponible.',false);return;}
  const selectedPeriod=existing?.period||period;
  const selectedBranch=existing?.branch||(branch==='General'?CONFIG.branches[0]:branch);
  const label=sector==='income'?'Ingresos':'Personal';
  $('#estimateModalTitle').textContent=existing?'Modificar valor estimado':`Agregar valor estimado · ${label}`;
  $('#estimateSector').value=existing?.sector||sector;
  $('#estimateId').value=existing?.id||'';
  $('#estimatePeriod').value=selectedPeriod;
  $('#estimatePeriodText').textContent=periodLabel(selectedPeriod);
  const branchSelect=$('#estimateBranch');
  branchSelect.innerHTML=CONFIG.branches.map(b=>`<option value="${esc(b)}" ${b===selectedBranch?'selected':''}>${esc(b)}</option>`).join('');
  branchSelect.disabled=branch!=='General'&&!existing;
  if(existing)branchSelect.disabled=branch!=='General';
  $('#estimateDate').value=existing?.date||defaultMovementDate(selectedPeriod);
  $('#estimateDate').min=`${selectedPeriod}-01`;
  $('#estimateDate').max=`${selectedPeriod}-${String(daysInPeriod(selectedPeriod)).padStart(2,'0')}`;
  $('#estimateAmount').value=existing?.amount??'';
  $('#estimateConcept').value=existing?.concept||'';
  $('#estimateNotes').value=existing?.notes||'';
  $('#estimateResponsible').innerHTML='<option value="">Elegir responsable…</option>'+CONFIG.responsiblePeople.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
  $('#estimateResponsible').value='';
  $('#estimateStatus').textContent=existing?'El estimado seguirá identificado por separado y recalculará el cierre del período. Revisá que el importe no esté contabilizado ya.':'Ingresá solamente el importe que falta: se suma a los valores reales, no los reemplaza, y no crea ni modifica movimientos de Caja Diaria.';
  $('#estimateModal').classList.remove('hidden');
  $('#estimateAmount').focus();
}
async function saveEstimate(e){
  e.preventDefault();
  const form=e.currentTarget;
  if(form.dataset.saving==='1')return;
  const save=form.querySelector('[type="submit"]');
  form.dataset.saving='1'; if(save){save.disabled=true;save.textContent='Guardando…';}
  try{
    const id=$('#estimateId').value||null;
    const sector=$('#estimateSector').value;
    const selectedPeriod=$('#estimatePeriod').value;
    const selectedBranch=$('#estimateBranch').value;
    const date=$('#estimateDate').value;
    const amountRaw=$('#estimateAmount').value.trim();
    if(amountRaw==='')throw new Error('Ingresá un importe estimado, aunque sea cero.');
    const amount=Number(amountRaw);
    const concept=$('#estimateConcept').value.trim();
    const notes=$('#estimateNotes').value.trim();
    const responsible=$('#estimateResponsible').value;
    if(!CONFIG.responsiblePeople.includes(responsible))throw new Error('Elegí Agus, Nico, Luz o Flor como responsable del valor estimado.');
    if(!CONFIG.branches.includes(selectedBranch))throw new Error('Elegí una sucursal válida.');
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedPeriod))throw new Error('El período seleccionado no es válido.');
    if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,7)!==selectedPeriod)throw new Error('La fecha debe pertenecer al mes seleccionado.');
    if(!Number.isFinite(amount)||amount<0)throw new Error('Ingresá un importe válido, igual o mayor que cero.');
    if(!concept)throw new Error('Ingresá un concepto o motivo para justificar el valor estimado.');
    const data={period:selectedPeriod,branch:selectedBranch,sector,date,amount,concept,notes};
    const wasClosed=Store.hasClosure(selectedPeriod,selectedBranch);
    if(id)await Store.update('estimates',id,data,responsible,`Corrección de valor estimado de ${sector==='income'?'Ingresos':'Personal'}`,{lateMovement:Store.periodIsClosed(selectedPeriod,selectedBranch)});
    else await Store.add('estimates',data,responsible,`Valor estimado de ${sector==='income'?'Ingresos':'Personal'} agregado para el cierre`,{lateMovement:Store.periodIsClosed(selectedPeriod,selectedBranch)});
    setOperator(responsible);
    closeEstimateModal();
    const latest=Store.latestClosure(selectedPeriod,selectedBranch);
    if(latest&&(wasClosed||latest.status==='closed'))await generateClosurePDF(latest);
    if(selectedPeriod!==period||selectedBranch!==branch)toast(`Valor estimado guardado en ${periodLabel(selectedPeriod)} · ${selectedBranch}.`);
    else toast('Valor estimado guardado y sumado al resultado. Caja Diaria no fue modificada.');
    refresh();
    if((view==='dashboard'||view==='close')&&document.querySelector('#detailModal:not(.hidden)'))showDashboardDetail(sector==='income'?'income':'salary');
  }catch(err){toast(err?.message||'No se pudo guardar el valor estimado.',false)}
  finally{form.dataset.saving='0';if(save){save.disabled=false;save.textContent='Guardar valor estimado';}}
}

function showDetail(collection,id){
 const x=Store.get(collection,id); if(!x)return;
 $('#detailTitle').textContent=collection==='invoices'?'Detalle de factura':collection==='investments'?'Detalle de inversión':collection==='liquidations'?'Detalle de liquidación':'Detalle';
 const fields=Object.entries(x).filter(([k])=>!['id','deleted'].includes(k)).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(typeof v==='object'?JSON.stringify(v):v)}</b></div>`).join('');
 const isManageable=collection==='investments'||collection==='liquidations'||collection==='invoices';
 const actions=isManageable?`<div class="modal-footer"><button class="secondary-button" data-close-detail>× Cerrar</button><button class="secondary-button" data-detail-edit="${esc(collection)}" data-id="${esc(x.id)}">Modificar</button><button type="button" class="danger-link" data-detail-delete="${esc(collection)}" data-id="${esc(x.id)}">Borrar</button>${collection==='invoices'?`<button class="primary-button" data-invoice-pdf="${esc(x.id)}">Generar PDF</button>`:''}${collection==='liquidations'?`<button class="primary-button" data-salary-pdf="${esc(x.id)}">PDF</button>`:''}</div>`:`<div class="modal-footer"><button class="secondary-button" data-close-detail>× Cerrar</button></div>`;
 $('#detailBody').innerHTML=`<div class="detail-grid">${fields}</div>${actions}`; $('#detailModal').classList.remove('hidden');
 document.querySelectorAll('[data-close-detail]').forEach(b=>b.onclick=()=>$('#detailModal').classList.add('hidden'));
 document.querySelectorAll('[data-invoice-pdf]').forEach(b=>b.onclick=()=>runPdfButtonAction(b,()=>generateInvoicePDF(b.dataset.invoicePdf)));
 document.querySelectorAll('[data-detail-edit]').forEach(b=>b.onclick=()=>{const collection=b.dataset.detailEdit;$('#detailModal').classList.add('hidden');if(collection==='liquidations')openLiquidationById(b.dataset.id);else openModal(collection==='invoices'?'invoice':collection,b.dataset.id);});
 document.querySelectorAll('[data-detail-delete]').forEach(b=>b.onclick=()=>{const collection=b.dataset.detailDelete;$('#detailModal').classList.add('hidden');if(collection==='liquidations')deleteSalaryVoucher(b.dataset.id);else deleteRecord(collection,b.dataset.id);});
 document.querySelectorAll('[data-salary-pdf]').forEach(b=>b.onclick=()=>runPdfButtonAction(b,()=>generateSalaryVoucherPDF(b.dataset.salaryPdf)));
}

async function openPeriodModal(){
 const currentYear=Number(today().slice(0,4))||2026; const firstSelectableYear=2026; const years=Array.from({length:Math.max(5,currentYear-firstSelectableYear+5)},(_,i)=>firstSelectableYear+i),months=Array.from({length:12},(_,i)=>i+1),names=months.map(m=>new Date(2024,m-1,1).toLocaleDateString('es-AR',{month:'long'}));
 const rows=years.flatMap(y=>months.map(m=>{
   const id=`${y}-${String(m).padStart(2,'0')}`,closed=Store.periodIsClosed(id,branch),future=periodIsFuture(id),started=periodIsStarted(id,branch),selected=id===period,stateLabel=periodStateLabel(id,branch);
   const statusClass=closed?'muted':(stateLabel==='CIERRE PENDIENTE'||(future&&!started)?'warning':'success');
   const pencil=closed&&branch!=='General'?`<button type="button" class="period-edit-button" data-period-edit="${id}" title="Modificar mes cerrado" aria-label="Modificar mes cerrado">✏️</button>`:'';
   if(closed) return `<div class="period-row-wrap"><button type="button" class="period-row period-month-row period-row-locked ${selected?'selected-period':''}" data-select-period="${id}"><span><b>${names[m-1]} ${y}</b><small>Solo lectura · usá ✏️ para modificar</small></span><span class="status-pill ${statusClass}">${stateLabel}${selected?' · ACTIVO':''}</span></button>${pencil}</div>`;
   return `<button type="button" class="period-row period-month-row ${selected?'selected-period':''}" data-select-period="${id}"><span><b>${names[m-1]} ${y}</b>${future&&!started?'<small>Se inicia desde este selector</small>':''}</span><span class="status-pill ${statusClass}">${stateLabel}${selected?' · ACTIVO':''}</span></button>`;
 }));
 $('#periodBody').innerHTML=`<div class="period-create"><label class="field">Ir a período<input id="periodInput" type="month" value="${period}" min="${firstSelectableYear}-01" max="2099-12"></label><button class="primary-button" id="goPeriod">Abrir / seleccionar período</button></div><div class="notice success"><b>Estados de los períodos:</b> el mes actual figura ABIERTO; un mes anterior sin cierre formal figura CIERRE PENDIENTE; los meses cerrados conservan su protección y autorización de corrección.</div><div class="period-year-grid">${years.map(y=>`<section><h4>${y}</h4><div class="period-month-grid">${rows.filter(x=>x.includes('data-select-period="'+y+'-')||x.includes('data-period-edit="'+y+'-')).join('')}</div></section>`).join('')}</div>`;
 $('#periodModal').classList.remove('hidden');
 const openValue=value=>{
   if(!isValidPeriod(value)){toast('Elegí un mes y año válidos.',false);return;}
   const closed=Store.periodIsClosed(value,branch),future=periodIsFuture(value),started=periodIsStarted(value,branch);
   if(closed){persistPeriodSelection(value);$('#periodModal').classList.add('hidden');refresh();return;}
   if(future&&!started){openPeriodActionConfirm('start',value);return;}
   persistPeriodSelection(value);$('#periodModal').classList.add('hidden');refresh();
 };
 $('#goPeriod').onclick=()=>openValue($('#periodInput').value);
 document.querySelectorAll('[data-select-period]').forEach(b=>b.onclick=()=>openValue(b.dataset.selectPeriod));
 document.querySelectorAll('[data-period-edit]').forEach(b=>b.onclick=()=>openPeriodActionConfirm('edit',b.dataset.periodEdit));
}


function openCloseValidationError(validation){
 const modal=$('#closeErrorModal');
 const body=$('#closeErrorBody');
 if(!modal||!body)return;
 const blockers=(validation?.checklist||[]).filter(x=>!x[1]);
 body.innerHTML=`<div class="notice danger-box"><b>No se puede cerrar ${esc(periodLabel(period))} todavía.</b><br>Hay información obligatoria pendiente. El problema está indicado abajo para que puedas corregirlo.</div>${blockers.map(([name,ok,detail,target])=>`<div class="close-error-item"><div class="close-error-icon">⚠</div><div class="close-error-copy"><b>${esc(name)}</b><span>${esc(detail)}</span></div><button type="button" class="secondary-button compact-button" data-close-error-review="${esc(target)}">Revisar</button></div>`).join('')}`;
 modal.classList.remove('hidden');
 body.querySelectorAll('[data-close-error-review]').forEach(b=>b.onclick=()=>{modal.classList.add('hidden');const target=b.dataset.closeErrorReview||'dashboard';localStorage.setItem('blunno-close-review-flash',target);navigate(target);});
}
function closeCloseValidationError(){$('#closeErrorModal')?.classList.add('hidden');}
async function openCloseConfirm(){if(branch==='General'){toast('General es una vista consolidada. Elegí una sucursal concreta para cerrar.',false);return}if(!currentOperator){toast('Elegí un responsable antes de cerrar el mes.',false);return}if(Store.hasClosure(period,branch)){toast('El período ya tiene un cierre formal. Usá Autorizar corrección para actualizarlo.',false);return}const validation=Store.validateClosure(period,branch);if(validation.blockers.length){openCloseValidationError(validation);return}const ss=Store.summary(period,branch);const body=$('#closeConfirmBody');body.innerHTML=`<div class="notice warning"><b>Cierre de ${esc(periodLabel(period))} · ${esc(branch)}</b><br>Responsable: <b>${esc(currentOperator)}</b><br>Los valores estimados se incorporan al resultado, pero no crean movimientos en Caja Diaria.</div><div class="detail-grid"><div><span>Ingresos reales</span><b>${money(ss.incomeReal)}</b></div><div><span>Ingresos estimados</span><b>${money(ss.incomeEstimated)}</b></div><div><span>Total de ingresos</span><b>${money(ss.income)}</b></div><div><span>Gastos</span><b>${money(ss.totalExpenses)}</b></div><div><span>Personal real</span><b>${money(ss.salaryReal)}</b></div><div><span>Personal estimado</span><b>${money(ss.salaryEstimated)}</b></div><div><span>Total personal</span><b>${money(ss.salary)}</b></div><div><span>Resultado</span><b>${money(ss.result)}</b></div></div><label class="field">Observaciones<textarea id="closeObservations" rows="3"></textarea></label><div class="modal-footer"><button class="secondary-button" data-close-close-confirm>Cancelar</button><button class="primary-button" id="confirmClosePeriod">Sí, cerrar mes y generar PDF</button></div>`;$('#closeConfirmModal').classList.remove('hidden');body.querySelectorAll('[data-close-close-confirm]').forEach(b=>b.onclick=()=>$('#closeConfirmModal').classList.add('hidden'));$('#confirmClosePeriod').onclick=async()=>{const btn=$('#confirmClosePeriod');btn.disabled=true;try{const closure=await Store.closePeriod(period,nextPeriod(period),currentOperator,ss,$('#closeObservations').value,Store.validateClosure(period,branch).checklist);$('#closeConfirmModal').classList.add('hidden');await generateClosurePDF(closure);toast(`Cierre ${periodLabel(period)} guardado correctamente.`);refresh()}catch(e){toast(e.message,false)}finally{btn.disabled=false}};}
async function openReopenConfirm(){if(branch==='General'){toast('General es una vista consolidada. Elegí una sucursal concreta para reabrir.',false);return}const reason=prompt('Motivo obligatorio para reabrir el período:');if(!reason?.trim())return;try{await Store.reopenPeriod(period,branch,currentOperator,reason);toast('Período reabierto y auditado.');refresh()}catch(e){toast(e.message,false)}}

async function generateClosurePDF(closure,{downloadNow=false,awaitArchive=false,forceArchive=false}={}){
 if(!closure){toast('No se encontró el cierre que querés exportar.',false);return null;}
 const summary=closure.summary||{};
 const rows=[['Período',periodLabel(closure.period)],['Sucursal / perfil',closure.branch],['Versión',closure.version],['Responsable del cierre',closure.responsible],['Fecha y hora exactas',dateTimeLabel(closure.closedAt)],['Ingresos reales',money(summary.incomeReal??summary.income)],['Ingresos estimados',money(summary.incomeEstimated||0)],['Ingresos considerados',money(summary.income)],['Gastos de caja',money(summary.cashExpense)],['Gastos del local',money(summary.localExpense)],['Proveedores facturados',money(summary.providers)],['Inversiones',money(summary.investment)],['Personal liquidado real',money(summary.salaryReal??summary.salary)],['Personal estimado',money(summary.salaryEstimated||0)],['Personal considerado',money(summary.salary)],['Resultado',money(summary.result)],['Control de caja',money(summary.cashControl)],['Caja diaria','Separada; los estimados no generan movimientos de caja'],['Facturas',summary.invoiceCount||0],['Horas',number(summary.hours||0)],['Observaciones',closure.observations||'Sin observaciones.'],['Movimientos posteriores',String((Store.db.audit||[]).filter(a=>a.period===closure.period&&a.branch===closure.branch&&String(a.at)>String(closure.closedAt)).length)]];
 const blob=createSimplePDF('CIERRE MENSUAL',`Documento oficial de cierre · ${periodLabel(closure.period)} · ${closure.branch}`,rows,'Este documento conserva la versión del cierre. Los cambios posteriores generan una nueva versión y mantienen la trazabilidad.');
 if(!blob)return null;
 const safe=`cierre-${closure.period}-${String(closure.branch||'General').replace(/\s+/g,'-').toLowerCase()}-v${closure.version}.pdf`;
 const closurePath=storagePathFor(closure.period,closure.branch,'Cierre mensual',safe);
 const existing=Store.db.files.find(x=>x.name===safe&&!x.deleted&&x.sourceId===closure.id);
 const meta=`<b>${esc(safe)}</b><span>Perfil: ${esc(closure.branch)} · Responsable: ${esc(closure.responsible)} · ${esc(dateTimeLabel(closure.closedAt))}</span>`;
 const fileData=existing&&!forceArchive?null:{name:safe,sector:'Cierre mensual',period:closure.period,branch:closure.branch,responsible:closure.responsible,mime:'application/pdf',createdAt:now(),sourceCollection:'closures',sourceId:closure.id,storagePath:closurePath,blob};
 const result=deliverPdfAndArchive({blob,name:safe,title:'Cierre mensual listo',description:`El cierre de ${periodLabel(closure.period)} quedó registrado como versión ${closure.version}.`,meta,fileData,downloadNow,awaitArchive});
 void auditPdfAction(existing||{name:safe,sector:'Cierre mensual',period:closure.period,branch:closure.branch},'PDF_GENERATED','Documento de cierre generado.');
 return result;
}

function downloadBlob(blob,name){
 if(!(blob instanceof Blob)||blob.size===0)throw new Error('El documento PDF está vacío o no se pudo generar.');
 const safeName=String(name||'BLUNNO_Documento.pdf').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'_').replace(/\s+/g,' ').trim()||'BLUNNO_Documento.pdf';
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=safeName;a.rel='noopener';a.style.position='fixed';a.style.left='-10000px';a.style.top='0';
 document.body.appendChild(a);
 try{a.click();}catch(error){try{window.open(url,'_blank','noopener')}catch{}throw error;}
 finally{a.remove();}
 window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 return true;
}
const download=(name,data,type)=>{const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)};

function showPdfSuccess(title,description,meta,blob,name,options={}){pdfDownloadBlob=blob;pdfDownloadName=name;$('#pdfSuccessTitle').textContent=title;$('#pdfSuccessDescription').textContent=description;$('#pdfSuccessMeta').innerHTML=meta||'';const downloadButton=$('#pdfSuccessDownload');if(downloadButton)downloadButton.textContent=options.alreadyDownloaded?'Descargar otra vez':'Descargar PDF';$('#pdfSuccessModal').classList.remove('hidden');}
function closePdfSuccess(){$('#pdfSuccessModal').classList.add('hidden');pdfDownloadBlob=null;pdfDownloadName='';const downloadButton=$('#pdfSuccessDownload');if(downloadButton)downloadButton.textContent='Descargar PDF';}
async function auditPdfAction(file,action,reason){try{if(!currentOperator)return;const meta={fileId:file?.id||null,fileName:file?.name||pdfDownloadName||'',sector:file?.sector||'',branch:file?.branch||branch,period:file?.period||period};await Store.recordAudit(action,'files',null,meta,currentOperator,reason||action,meta);}catch(e){console.warn('PDF audit',e)}}
async function archivePdfFast(fileData){try{await Store.archiveFile(fileData,{fastLocal:true});return '';}catch(error){console.error('No se pudo archivar el PDF localmente',error);return error?.message||'No se pudo archivar una copia local del PDF.';}}
function updatePdfArchiveStatus(name,baseMeta,warning){
 if(pdfDownloadName!==name)return;
 const modal=$('#pdfSuccessModal');if(!modal||modal.classList.contains('hidden'))return;
 const status=warning?`<span class="pdf-warning">No se pudo archivar una copia local: ${esc(warning)}</span>`:'<span class="pdf-archive-ok">✓ Copia guardada en Archivos locales. La sincronización queda en segundo plano.</span>';
 $('#pdfSuccessMeta').innerHTML=`${baseMeta||''}${status}`;
}
function deliverPdfAndArchive({blob,name,title,description,meta,fileData,downloadNow=true,awaitArchive=false}){
 if(!(blob instanceof Blob)||blob.size===0)throw new Error('No se pudo generar un PDF válido.');
 const downloaded=downloadNow?downloadBlob(blob,name):false;
 showPdfSuccess(title,description,meta,blob,name,{alreadyDownloaded:downloaded});
 if(downloaded)void auditPdfAction({name,sector:fileData?.sector||title,period:fileData?.period||period,branch:fileData?.branch||branch},'PDF_DOWNLOADED','Descarga directa del PDF desde el sector.');
 let archivePromise=Promise.resolve('');
 if(fileData){
   archivePromise=archivePdfFast(fileData).then(warning=>{
     updatePdfArchiveStatus(name,meta,warning);
     if(warning)toast('El PDF se descargó, pero no se pudo guardar una copia en Archivos. Conservá el archivo descargado.',false);
     return warning;
   }).catch(error=>{
     console.error('Fallo al archivar el PDF después de descargarlo',error);
     updatePdfArchiveStatus(name,meta,error?.message||'Error de almacenamiento local.');
     toast('El PDF se descargó, pero falló el archivado local. Conservá el archivo descargado.',false);
     return error?.message||'Error de almacenamiento local.';
   });
 }
 return awaitArchive?archivePromise.then(()=>blob):blob;
}
function normalizePdfViewType(type){
 const raw=String(type||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ _]+/g,'-');
 const aliases={gasto:'expenses',gastos:'expenses',factura:'invoices',facturas:'invoices',proveedor:'providers',proveedores:'providers',caja:'cash','caja-diaria':'cash',resultado:'results',resultados:'results',comparativa:'compare',comparativas:'compare',corporativa:'compare',corporativas:'compare',historial:'history',inversion:'investments',inversiones:'investments',personal:'people',empleados:'people',horas:'hours',ingresos:'income',resumen:'dashboard'};
 return aliases[raw]||raw;
}
async function runPdfButtonAction(button,action,busyLabel='Preparando PDF…'){
 if(!button||button.dataset.pdfBusy==='1')return null;
 const originalText=button.textContent;
 button.dataset.pdfBusy='1';button.disabled=true;button.setAttribute('aria-busy','true');button.textContent=busyLabel;
 try{return await action();}
 catch(error){console.error('Error al generar o entregar el PDF',error);toast(`No se pudo generar el PDF: ${error?.message||'error inesperado'}`,false);return null;}
 finally{button.dataset.pdfBusy='0';button.disabled=false;button.removeAttribute('aria-busy');button.textContent=originalText;}
}
function runViewPdfAction(button){
 if(!button)return;
 return runPdfButtonAction(button,()=>generateAndShowViewPDF(button.dataset.pdfClose,{downloadNow:true}));
}
function runPrintViewAction(button,type){
 if(!button)return;
 return runPdfButtonAction(button,async()=>{
   const target=openPdfPrintWindow();
   try{
     const blob=await generateAndShowViewPDF(type,{downloadNow:false});
     if(!blob)throw new Error('No se pudo preparar el documento para imprimir.');
     const file=Store.db.files.find(f=>!f.deleted&&f.name===pdfDownloadName&&f.period===period&&f.branch===branch);
     void auditPdfAction(file||{name:pdfDownloadName,sector:type,period,branch},'PDF_PRINTED',`Sector ${type} impreso`);
     const opened=printBlob(blob,target,true);
     if(opened)toast('Documento preparado para imprimir.');
     return blob;
   }catch(error){try{target?.close()}catch{}throw error;}
 },'Preparando impresión…');
}
function printCurrentPdf(){if(!pdfDownloadBlob){toast('No hay un PDF generado para imprimir.',false);return}const target=openPdfPrintWindow();const file=Store.db.files.find(f=>!f.deleted&&f.name===pdfDownloadName&&f.period===period&&f.branch===branch);void auditPdfAction(file,'PDF_PRINTED','Documento PDF impreso');printBlob(pdfDownloadBlob,target,true);toast('PDF preparado para impresión.');}
function downloadCurrentPdf(){if(!pdfDownloadBlob){toast('No hay un PDF generado para descargar.',false);return}const file=Store.db.files.find(f=>!f.deleted&&f.name===pdfDownloadName&&f.period===period&&f.branch===branch);downloadBlob(pdfDownloadBlob,pdfDownloadName);void auditPdfAction(file,'PDF_DOWNLOADED','Documento PDF descargado');toast('PDF descargado correctamente.');}

async function ensureClosureFile(id){const closure=Store.getRaw('closures',id);if(!closure)throw new Error('No se encontró la versión del cierre.');const safe=`cierre-${closure.period}-${String(closure.branch).replace(/\s+/g,'-').toLowerCase()}-v${closure.version}.pdf`;let file=Store.db.files.find(x=>!x.deleted&&x.sourceId===closure.id&&x.sourceCollection==='closures')||Store.db.files.find(x=>!x.deleted&&x.name===safe&&x.period===closure.period&&x.branch===closure.branch&&x.sector==='Cierre mensual');let blob=file?await Store.getFileBlob(file.id):null;if(!blob){await generateClosurePDF(closure,{forceArchive:true,awaitArchive:true});file=Store.db.files.find(x=>!x.deleted&&x.sourceId===closure.id&&x.sourceCollection==='closures'&&x.name===safe)||Store.db.files.find(x=>!x.deleted&&x.name===safe&&x.period===closure.period&&x.branch===closure.branch&&x.sector==='Cierre mensual');blob=file?await Store.getFileBlob(file.id):null;}if(!file||!blob)throw new Error('No se pudo recuperar el PDF archivado del cierre.');return {closure,file,blob};}
async function printClosureVersion(id){const target=openPdfPrintWindow();try{const r=await ensureClosureFile(id);void auditPdfAction(r.file,'PDF_PRINTED','Impresión de versión de cierre');printBlob(r.blob,target,true);toast(`Cierre V${r.closure.version} preparado para impresión.`);}catch(e){try{target?.close()}catch{}toast(`No se pudo imprimir el cierre: ${e.message}`,false)}}
async function downloadClosureVersion(id){try{const r=await ensureClosureFile(id);showPdfSuccess('Cierre listo para descargar',`Cierre ${periodLabel(r.closure.period)} · versión ${r.closure.version}.`,`<b>${esc(r.file.name)}</b><span>Perfil: ${esc(r.closure.branch)} · Responsable: ${esc(r.closure.responsible)}</span>`,r.blob,r.file.name);toast('Cierre recuperado. Tocá Descargar PDF para guardarlo.')}catch(e){toast(`No se pudo recuperar el cierre: ${e.message}`,false)}}

const getSelectedExpenseCategory = () => {
 const selectValue=$('#expenseCategoryFilter')?.value || '';
 const storedValue=localStorage.getItem(`blunno-expense-category-${period}-${branch}`) || '';
 return canonicalExpenseCategory(selectValue) || canonicalExpenseCategory(storedValue);
};
async function generateExpenseCategoryPDF(category){
 if(!currentOperator){toast('Elegí responsable antes de generar el PDF.',false);return null;}
 const target=canonicalExpenseCategory(category)||getSelectedExpenseCategory();
 if(!target){toast('No se pudo identificar la categoría seleccionada. Elegí un rubro y volvé a tocar PDF.',false);return null;}
 try{localStorage.setItem(`blunno-expense-category-${period}-${branch}`,target)}catch{}
 const list=Store.list('expenses',period,branch).filter(x=>canonicalExpenseCategory(x.category)===target);
 if(!list.length){toast(`No hay gastos de ${target} para ${periodLabel(period)} en ${branch}.`,false);return null;}
 const total=list.reduce((sum,x)=>sum+Number(x.amount||0),0);
 const rows=[['Categoría',target],['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total',money(total)],['Detalle','Cada renglón corresponde exclusivamente al rubro seleccionado.']];
 list.forEach((x,i)=>rows.push([`Gasto ${i+1}`,`${dateLabel(x.date)} · ${x.concept||'Sin detalle'} · ${money(x.amount)} · Resp.: ${x.responsible||'—'}${x.document?` · ${x.document}`:''}`]));
 const blob=createSimplePDF(`GASTOS · ${target.toUpperCase()}`,`Rubro ${target} · ${periodLabel(period)} · ${branch}`,rows,'Documento generado por Control Empresarial Blunno. Incluye únicamente la categoría seleccionada.');if(!blob)return null;
 const safe=target.replace(/[^a-z0-9áéíóúüñ]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'sin-categoria';
 const name=`BLUNNO_Gastos_${safe}_${period}_${String(branch).replace(/\s+/g,'-').toLowerCase()}_${Date.now()}.pdf`;
 const meta=`<b>${esc(name)}</b><span>${esc(periodLabel(period))} · ${esc(branch)} · ${list.length} movimientos</span>`;
 const fileData={name,sector:`Gastos · ${target}`,period,branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),storagePath:storagePathFor(period,branch,`Gastos · ${target}`,name),blob};
 return deliverPdfAndArchive({blob,name,title:'PDF de gastos listo',description:`Solo se incluyeron los gastos de ${target}.`,meta,fileData,downloadNow:true});
}

async function generateAndShowViewPDF(type,{downloadNow=true}={}){
  type=normalizePdfViewType(type);
  if(!currentOperator){toast('Elegí el responsable en la barra superior antes de generar un PDF.',false);return}
  const s=Store.summary(period,branch); let rows=[]; let title='Documento BLUNNO'; let desc='Documento generado desde Control Empresarial Blunno.';
  const addRecords=(label,list,formatter)=>list.forEach((x,i)=>rows.push([`${label} ${i+1}`,formatter(x)]));
  if(type==='dashboard'){title='RESUMEN GENERAL BLUNNO';desc=`Resumen de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Ingresos',money(s.income)],['Gastos del local',money(s.localExpense)],['Proveedores',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Caja diaria','SEPARADA · no incluida en el resultado']];}
  else if(type==='cash'){const list=Store.list('cash',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='CAJA DIARIA · CONTROL COMPLETO';desc=`Caja de ${periodLabel(period)} · ${branch}`;const days=daysInPeriod(period);let saldo=getCashOpening();const daily=[];for(let d=1;d<=days;d++){const date=isoDate(period,d),inc=list.filter(x=>x.date===date&&x.type==='income'&&!/^saldo\s+d[ií]a\s+anterior$/i.test(String(x.concept||''))).reduce((a,x)=>a+Number(x.amount||0),0),exp=list.filter(x=>x.date===date&&x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0),pay=list.filter(x=>x.date===date&&x.type==='payment').reduce((a,x)=>a+Number(x.amount||0),0),opening=saldo;saldo=opening+inc-exp-pay;daily.push([`Día ${d}`,`${dateLabel(date)} · Saldo anterior ${money(opening)} · Ingresos ${money(inc)} · Gastos ${money(exp)} · Pagos ${money(pay)} · RESTO ${money(saldo)}`])}rows=[['Período',periodLabel(period)],['Perfil',branch],['Saldo inicial',money(getCashOpening())],['Ingresos de caja',money(list.filter(x=>x.type==='income'&&!/^saldo\s+d[ií]a\s+anterior$/i.test(String(x.concept||''))).reduce((a,x)=>a+Number(x.amount||0),0))],['Gastos de caja',money(list.filter(x=>x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0))],['Pagos',money(list.filter(x=>x.type==='payment').reduce((a,x)=>a+Number(x.amount||0),0))],['Saldo final',money(saldo)],['CONTROL DIARIO','A continuación se detalla cada día']];rows.push(...daily);addRecords('Movimiento',list,x=>`${dateLabel(x.date)} · ${x.type==='income'?'INGRESO':x.type==='payment'?'PAGO':'GASTO'} · ${x.concept||'Sin concepto'} · ${money(x.amount)} · ${x.responsible||'—'}`);}
  else if(type==='income'){const list=Store.list('incomes',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='INGRESOS · DETALLE COMPLETO';desc=`Ingresos independientes de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total ingresos',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Ingreso',list,x=>`${dateLabel(x.date)} · ${x.method||'Sin medio'} · ${x.concept||'Sin concepto'} · ${money(x.amount)} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='invoices'){const list=Store.list('invoices',period,branch).map((x,index)=>({...x,_loadIndex:index})).sort((a,b)=>String(b.loadDate||b.createdAt||'').localeCompare(String(a.loadDate||a.createdAt||''))||a._loadIndex-b._loadIndex);title='FACTURAS · DETALLE COMPLETO';desc=`Facturas cargadas de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Documentos',String(list.length)],['Total facturado',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Factura',list,x=>`${Store.invoiceProviderName(x)||x.provider} · N° ${x.number||'—'} · Movimiento ${dateLabel(x.operationDate||x.date)} · Carga ${dateTimeLabel(x.loadDate||x.createdAt)} · ${money(x.amount)} · CARGADA · Resp.: ${x.responsible||'—'}`);}
  else if(type==='hours'){const list=Store.list('hours',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='HORAS MENSUALES · DETALLE COMPLETO';desc=`Planilla de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Empleados',String(new Set(list.map(x=>x.employeeId)).size)],['Horas',number(list.reduce((a,x)=>a+Number(x.hours||0),0))],['Horas feriado',number(list.filter(x=>x.holiday==='yes').reduce((a,x)=>a+Number(x.hours||0),0))]];addRecords('Carga',list,x=>`${x.employee} · ${dateLabel(x.date)} · ${x.displayValue||x.hours||0} · ${x.holiday==='yes'?'FERIADO':''} · Adelanto ${money(x.advance||0)} · Mercadería ${money(x.merchandise||0)} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='expenses'){const list=Store.list('expenses',period,branch);title='GASTOS DEL LOCAL · DETALLE COMPLETO';desc=`Gastos del local de ${periodLabel(period)} · ${branch}`;const totalExp=list.reduce((a,x)=>a+Number(x.amount||0),0);rows=[['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total',money(totalExp)]];const grouped=new Map();list.forEach(x=>{const cat=String(x.category||'Sin categoría').trim()||'Sin categoría';grouped.set(cat,(grouped.get(cat)||0)+Number(x.amount||0));});[...grouped.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'es',{sensitivity:'base'})).forEach(([cat,val])=>rows.push([`Subtotal · ${cat}`,money(val)]));addRecords('Gasto',list,x=>`${dateLabel(x.date)} · Cargado ${dateTimeLabel(x.createdAt||`${x.date}T12:00:00`)} · ${x.category||'Sin categoría'} · ${x.concept||'—'} · ${money(x.amount)} · ${x.document||'Sin comprobante'} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='investments'){const list=Store.list('investments',period,branch);title='INVERSIONES · HISTORIAL COMPLETO';desc=`Historial de inversiones de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Inversión',list,x=>`${dateLabel(x.date)} · Cargado ${dateTimeLabel(x.createdAt||`${x.date}T12:00:00`)} · ${x.concept||'—'} · ${money(x.amount)} · ${x.document||'Sin comprobante'} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='providers'){const list=Store.list('invoices',period,branch);title='PROVEEDORES · RESUMEN';desc=`Proveedores y facturación de ${periodLabel(period)} · ${branch}`;const providerLabel=x=>String(Store.invoiceProviderName(x)||x.provider||'Sin proveedor').trim()||'Sin proveedor';rows=[['Período',periodLabel(period)],['Perfil',branch],['Proveedores activos',String(Store.list('providers').filter(x=>x.active!==false).length)],['Facturas cargadas',String(list.length)],['Total facturado',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];[...new Set(list.map(providerLabel))].sort((a,b)=>String(a).localeCompare(String(b),'es',{sensitivity:'base'})).forEach(name=>{const p=list.filter(x=>providerLabel(x)===name);rows.push([name,`${p.length} facturas · ${money(p.reduce((a,x)=>a+Number(x.amount||0),0))}`])});}
  else if(type==='people'){const list=Store.list('employees').filter(x=>branch==='General'||x.branch===branch);title='PERSONAL · DETALLE';desc=`Personal de ${branch}`;rows=[['Perfil',branch],['Empleados',String(list.length)]];addRecords('Empleado',list,x=>`${x.name} · ${x.branch} · ${x.role||'Sin puesto'} · Valor hora ${money(x.hourlyRate||0)} · ${x.active===false?'INACTIVO':'ACTIVO'}`);}
  else if(type==='results'){title='RESULTADO MENSUAL';desc=`Resultado de ${periodLabel(period)} · ${branch}`;rows=[['Ingresos',money(s.income)],['Gastos del local',money(s.localExpense)],['Proveedores',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Caja diaria','Separada y no incluida']];}
  else if(type==='compare'){const a=Store.summary(compareA,branch),b=Store.summary(compareB,branch);const cmp=(label,av,bv,fmt=money)=>{const diff=Number(bv||0)-Number(av||0);const pct=Number(av)?(diff/Number(av))*100:null;return [label,`${fmt(av)} / ${fmt(bv)}`,`Diferencia: ${fmt(diff)} · Variación: ${pct===null?'—':pct.toFixed(2)+'%'}`]};title='COMPARATIVA DE PERÍODOS';desc=`${periodLabel(compareA)} vs ${periodLabel(compareB)} · ${branch}`;rows=[['Período A',periodLabel(compareA)],['Período B',periodLabel(compareB)],cmp('Ingresos',a.income,b.income),cmp('Gastos del local',a.localExpense,b.localExpense),cmp('Proveedores',a.providers,b.providers),cmp('Inversiones',a.investment,b.investment),cmp('Personal',a.salary,b.salary),cmp('Resultado',a.result,b.result),cmp('Horas',a.hours,b.hours,number)];}
  else if(type==='history'){const auditRows=auditForContext(period,branch);title='HISTORIAL Y AUDITORÍA';desc=`Trazabilidad de ${periodLabel(period)} · ${branch}`;rows=[['Registros',String(auditRows.length)],['Período',periodLabel(period)],['Perfil',branch]];addRecords('Registro',auditRows.slice(0,250),x=>`${dateTimeLabel(x.at)} · ${x.action} · ${x.collection} · ${x.responsible||'—'} · ${x.reason||''}`);}
  else if(type==='tasks'){const list=Store.list('tasks').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`));title='RECORDATORIOS';desc='Recordatorios y estado';rows=[['Total',String(list.length)],['Pendientes',String(list.filter(x=>x.status!=='completed').length)],['Realizados',String(list.filter(x=>x.status==='completed').length)]];addRecords('Tarea',list,x=>`${x.title} · ${dateLabel(x.dueDate)} ${x.dueTime||''} · ${x.status==='completed'?'REALIZADA':'PENDIENTE'} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='excel'){title='EXCEL / BACKUP · RESUMEN ORDENADO';desc=`Exportación de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Ingresos',money(s.income)],['Gastos caja',money(s.cashExpense)],['Gastos local',money(s.localExpense)],['Facturas',String(s.invoiceCount)],['Inversiones',money(s.investment)],['Horas',number(s.hours)],['Resultado',money(s.result)]];addRecords('Caja',Store.list('cash',period,branch),x=>`${dateLabel(x.date)} · ${x.type==='income'?'INGRESO':x.type==='expense'?'GASTO DE CAJA':'PAGO'} · ${x.concept||'Sin concepto'} · ${money(x.amount)}`);addRecords('Factura',Store.list('invoices',period,branch),x=>`${Store.invoiceProviderName(x)||x.provider||'—'} · ${x.number||'—'} · ${dateLabel(x.operationDate||x.date)} · ${money(x.amount)} · ${x.branch}`);addRecords('Gasto',Store.list('expenses',period,branch),x=>`${dateLabel(x.date)} · ${x.category} · ${x.concept||'—'} · ${money(x.amount)}`);addRecords('Inversión',Store.list('investments',period,branch),x=>`${dateLabel(x.date)} · ${x.concept||'—'} · ${money(x.amount)}`);addRecords('Hora',Store.list('hours',period,branch),x=>`${x.employee||'—'} · ${dateLabel(x.date)} · ${number(x.hours||0)} h · Extras ${number(x.overtimeHours||0)} · ${x.holiday==='yes'?'FERIADO':''}`);}
  else {toast(`No existe una plantilla PDF para el sector: ${type}.`,false);return null;}
  const blob=createSimplePDF(title,desc,rows,'Documento generado por Control Empresarial Blunno. Caja diaria permanece separada del resultado general.');if(!blob)throw new Error(`No se pudo crear el PDF de ${title}.`);
  const safeBase=`${type}-blunno-${period}-${String(branch).replace(/\s+/g,'-').toLowerCase()}`;const name=`${safeBase}-${Date.now()}.pdf`;
  const storagePath=storagePathFor(period,branch,title,name);
  const meta=`<b>${esc(name)}</b><span>Ruta: ${esc(storagePath)} · Generado: ${esc(dateTimeLabel(now()))}</span>`;
  const fileData={name,sector:title,period,branch,generatedBy:currentOperator,responsible:currentOperator,mime:'application/pdf',createdAt:now(),storagePath,blob};
  return deliverPdfAndArchive({blob,name,title:'PDF listo para descargar',description:desc,meta,fileData,downloadNow});
}

async function viewStoredFile(id){
  const f=Store.get('files',id);
  if(!f){toast('No se encontró el archivo.',false);return}
  const target=openPdfPrintWindow();
  try{
    const blob=await Store.getFileBlob(id);
    if(!blob)throw new Error('No se encontró una copia visualizable de este archivo.');
    printBlob(blob,target,false);
    toast('Vista previa del documento abierta.');
  }catch(e){try{target?.close()}catch{}toast(`No se pudo abrir el archivo: ${e.message}`,false)}
}

async function downloadStoredFile(id){const f=Store.get('files',id);if(!f){toast('No se encontró el archivo.',false);return}try{const blob=await Store.getFileBlob(id);if(!blob){toast('No se encontró una copia descargable de este archivo.',false);return}showPdfSuccess('Archivo PDF listo',`Documento: ${f.name}.`, `<b>${esc(f.name)}</b><span>Sector: ${esc(f.sector||'—')} · ${esc(f.period||'—')} · ${esc(f.branch||'—')}</span>`,blob,f.name);toast('Documento recuperado. Tocá Descargar PDF para guardarlo.')}catch(e){toast(`No se pudo recuperar el PDF: ${e.message}`,false)}}



function getCashOpening(){const id=`cash-opening-${period}-${branch}`;return Number(Store.db.settings.find(x=>x.id===id)?.amount||0)}
async function editCashOpening(){if(!requestCashLateEdit(editCashOpening))return;if(!currentOperator){toast('Elegí responsable antes de modificar el saldo inicial.',false);return}const current=getCashOpening();const raw=prompt(`Saldo con el que arranca la caja de ${periodLabel(period)} · ${branch}:`,String(current));if(raw===null)return;const amount=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount))return toast('Monto inválido.',false);const id=`cash-opening-${period}-${branch}`;const old=Store.db.settings.find(x=>x.id===id);try{const data={id,period,branch,amount,responsible:currentOperator,updatedAt:now()};if(old)await Store.update('settings',id,data,currentOperator,'Actualización de saldo inicial de caja');else await Store.add('settings',data,currentOperator,'Carga de saldo inicial de caja');toast('Saldo inicial guardado y auditado.');refresh()}catch(e){toast(e.message,false)}}
async function quickInvoiceSave(){
  if(!currentOperator){toast('Elegí responsable antes de cargar facturas.',false);return}
  if(branch==='General'){toast('Para cargar una factura elegí una sucursal concreta.',false);return}
  const providerInput=$('#quickInvoiceProvider'),providerText=providerInput?.value.trim(),providerId=$('#quickInvoiceProviderId')?.value||providerInput?.dataset?.providerId||'', amount=Number(($('#quickInvoiceAmount')?.value||'').replace(/\./g,'').replace(',','.')), operationDate=$('#quickInvoiceDate')?.value||defaultMovementDate(period), number=$('#quickInvoiceNumber')?.value.trim()||'';
  if(!providerText){toast('Indicá el proveedor.',false);return}
  if(!Number.isFinite(amount)||amount<0){toast('Indicá un importe válido.',false);return}
  let master=Store.list('providers').find(x=>x.id===providerId&&x.active!==false)||Store.list('providers').find(x=>x.active!==false&&(sourceIdentity(x.name)===sourceIdentity(providerText)||(Array.isArray(x.aliases)&&x.aliases.some(a=>sourceIdentity(a)===sourceIdentity(providerText)))));
  if(!master){toast('El proveedor no está disponible en este local. Elegilo de la lista o revisá su estado desde Proveedores.',false);return}
  if(!providerAvailableInBranch(master,branch)){toast('El proveedor está desactivado para este local. Reactivalo desde Proveedores.',false);return}
  try{
    const targetPeriod=period,systemPeriod=String(today()).slice(0,7);
    const saveQuick=async(date,responsible)=>{
      if(String(date).slice(0,7)!==targetPeriod)throw new Error(`La fecha ${dateLabel(date)} no pertenece a ${periodLabel(targetPeriod).toUpperCase()}.`);
      const late=Store.periodIsClosed(targetPeriod,branch);
      const data={provider:master.name,providerId:master.id,number,operationDate:date,date,loadDate:now(),branch,amount,period:targetPeriod,status:'CARGADA',notes:'Carga rápida'};
      await Store.add('invoices',data,responsible,'Carga rápida de factura',{lateMovement:late});
      if(late){const latest=Store.db.closures.filter(x=>x.period===targetPeriod&&x.branch===branch&&x.status==='closed').sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];if(latest)await generateClosurePDF(latest)}
      toast(late?'Factura cargada en período cerrado; cierre versionado.':'Factura cargada correctamente.');refresh();
    };
    if(targetPeriod!==systemPeriod){openHistoricalControl({type:'invoice',period:targetPeriod,branch,action:'Agregar',dateField:null,rawDate:operationDate,onConfirm:saveQuick});return;}
    const finalDate=operationDate||today();
    if(finalDate.slice(0,7)!==targetPeriod)throw new Error(`FECHA INCORRECTA: estás trabajando en ${periodLabel(targetPeriod).toUpperCase()}. La fecha seleccionada pertenece a ${periodLabel(finalDate.slice(0,7)).toUpperCase()}.`);
    await saveQuick(finalDate,currentOperator);
  }catch(e){toast(e.message,false)}
}

async function handleExcel(e){
 const f=e.target.files?.[0]; if(!f)return; const box=$('#importPreview'); box.innerHTML='<div class="loading">Leyendo Excel y preparando revisión…</div>';
 try{const XLSXLib=await ensureXLSX(); const wb=XLSXLib.read(await f.arrayBuffer(),{type:'array',cellDates:true});window.__blunnoWorkbook=wb;box.innerHTML=`<div class="notice success"><b>${esc(f.name)}</b> leído correctamente: ${wb.SheetNames.length} hojas.</div>`+wb.SheetNames.map((s,i)=>`<div class="sheet-preview"><div><b>${esc(s)}</b><span>Hoja ${i+1}</span></div><button class="secondary-button sync-sheet" data-sheet="${encodeURIComponent(s)}">Analizar hoja</button></div>`).join('');document.querySelectorAll('.sync-sheet').forEach(b=>b.onclick=()=>analyzeSheet(wb,decodeURIComponent(b.dataset.sheet),f.name));}
 catch(err){box.innerHTML=`<div class="notice danger-box">No se pudo leer el Excel: ${esc(err.message)}</div>`}
}
function normalizeImport(v){return String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
function parseExcelDate(v){if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;const s=String(v??'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})$/);if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;const n=Number(v);if(Number.isFinite(n)&&n>20000&&n<60000){const d=new Date(Date.UTC(1899,11,30)+n*86400000);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}return null}
function parseImportHours(v,marker=''){const raw=String(v??'').trim().replace(',','.');const mk=normalizeImport(marker||v);if(/^f$/.test(mk))return {hours:0,displayValue:'F',holiday:'yes',status:'feriado'};if(/^(franco|fr)$/.test(mk))return {hours:0,displayValue:'FRANCO',holiday:'no',status:'franco'};if(/^(h|feriado)$/.test(mk)&&!Number.isFinite(Number(raw)))return {hours:8,displayValue:'8H',holiday:'yes',status:'holiday-worked'};const hm=raw.match(/^(\d+(?:\.\d+)?)\s*h$/i);if(hm)return {hours:Number(hm[1]),displayValue:`${Number(hm[1])}H`,holiday:'yes',status:'holiday-worked'};const hours=Number(raw);if(Number.isFinite(hours)&&hours>=0&&hours<=24)return {hours,displayValue:hours,holiday:/^(h|feriado)$/.test(mk)?'yes':'no',status:/^(h|feriado)$/.test(mk)?'holiday-worked':''};return null}
async function analyzeWorkbook(wb,fileName){
 if(!currentOperator){toast('Elegí responsable antes de sincronizar.',false);return}
 const X=await ensureXLSX(),ops=[],errors=[],report=[];
 for(const sheet of wb.SheetNames){const rows=X.utils.sheet_to_json(wb.Sheets[sheet],{header:1,defval:'',raw:true});let header=-1,map={};
  for(let i=0;i<Math.min(rows.length,40);i++){const h=rows[i].map(normalizeImport);const idx={employee:h.findIndex(x=>/empleado|nombre/.test(x)),date:h.findIndex(x=>/fecha|dia/.test(x)),hours:h.findIndex(x=>/hora/.test(x)),provider:h.findIndex(x=>/proveedor/.test(x)),amount:h.findIndex(x=>/importe|monto|total|valor/.test(x)),category:h.findIndex(x=>/categoria|categoría|gasto/.test(x)),concept:h.findIndex(x=>/concepto|detalle|descripcion|descripción/.test(x)),number:h.findIndex(x=>/factura|numero|n°|nro/.test(x)),branch:h.findIndex(x=>/sucursal|local|perfil/.test(x)),type:h.findIndex(x=>/tipo|movimiento/.test(x))};if(idx.employee>=0&&idx.date>=0&&idx.hours>=0){header=i;map={...idx,kind:'hours'};break}if(idx.provider>=0&&idx.amount>=0&&idx.date>=0){header=i;map={...idx,kind:'invoices'};break}if(idx.amount>=0&&idx.date>=0&&(idx.category>=0||idx.concept>=0)){header=i;map={...idx,kind:'expenses'};break}if(idx.amount>=0&&idx.date>=0&&idx.type>=0){header=i;map={...idx,kind:'cash'};break}}
  let ok=0,bad=0;if(header>=0){for(let r=header+1;r<rows.length;r++){const row=rows[r];if(!row.length||row.every(v=>String(v??'').trim()===''))continue;const date=parseExcelDate(row[map.date]);if(!date){errors.push({sheet,row:r+1,message:'Fecha inválida o vacía.'});bad++;continue}const bt=String(map.branch>=0?row[map.branch]:'').trim();const rb=CONFIG.branches.find(b=>normalizeImport(b)===normalizeImport(bt))||(branch!=='General'?branch:null);if(!rb){errors.push({sheet,row:r+1,message:'Sucursal no identificada.'});bad++;continue}let collection,data;if(map.kind==='hours'){const et=String(row[map.employee]??'').trim(),emp=Store.list('employees').find(x=>normalizeImport(x.name)===normalizeImport(et)),h=parseImportHours(row[map.hours]);if(!emp){errors.push({sheet,row:r+1,message:`Empleado no encontrado: ${et||'sin nombre'}`});bad++;continue}if(!h){errors.push({sheet,row:r+1,message:'Horas inválidas.'});bad++;continue}collection='hours';data={period:date.slice(0,7),date,branch:emp.branch,employeeId:emp.id,employee:emp.name,hours:h.hours,displayValue:h.displayValue,holiday:h.holiday,status:h.status||'',overtimeHours:0,advance:0,merchandise:0,salaryCost:h.hours*Number(emp.hourlyRate||0)}}else if(map.kind==='invoices'){const pt=String(row[map.provider]??'').trim(),master=providersForBranch(rb).find(x=>sourceIdentity(x.name)===sourceIdentity(pt));if(!master){errors.push({sheet,row:r+1,message:`Proveedor no encontrado: ${pt||'vacío'}`});bad++;continue}collection='invoices';data={period:date.slice(0,7),date,branch:rb,provider:master.name,providerId:master.id,number:map.number>=0?String(row[map.number]??'').trim():'',operationDate:date,loadDate:now(),amount:Number(String(row[map.amount]??0).replace(/\./g,'').replace(',','.'))||0,status:'CARGADA'};}else if(map.kind==='expenses'){collection='expenses';data={period:date.slice(0,7),date,branch:rb,category:map.category>=0?String(row[map.category]??'').trim():'Otros gastos',concept:map.concept>=0?String(row[map.concept]??'').trim():'',amount:Number(String(row[map.amount]??0).replace(/\./g,'').replace(',','.'))||0};}else{collection='cash';const tt=normalizeImport(map.type>=0?row[map.type]:'ingreso'),type=/pago/.test(tt)?'payment':/gasto/.test(tt)?'expense':'income';data={period:date.slice(0,7),date,branch:rb,type,concept:map.concept>=0?String(row[map.concept]??'').trim():'Importado Excel',amount:Number(String(row[map.amount]??0).replace(/\./g,'').replace(',','.'))||0};}ops.push({collection,sourceKey:`${fileName}|${sheet}|${r}|${collection}|${date}|${rb}`,data,row:r+1,sheet});ok++}}else{errors.push({sheet,row:0,message:'No se pudo identificar el sector por los encabezados.'});bad++}report.push({sheet,rows:rows.length,ok,bad})}
 window.__blunnoPendingImport={operations:ops,errors,fileName,sheet:'TODAS LAS HOJAS'};const by=ops.reduce((m,x)=>(m[x.collection]=(m[x.collection]||0)+1,m),{});$('#importPreview').innerHTML=`<div class="import-result-head"><div><b>Análisis completo: ${esc(fileName)}</b><span>${wb.SheetNames.length} hojas · ${ops.length} registros válidos · ${errors.length} para revisión.</span></div>${ops.length?'<button class="primary-button" id="confirmExcelImport">Confirmar importación completa</button>':''}</div><div class="import-sector-summary">${Object.entries(by).map(([k,v])=>`<span>${esc(sectorForCollection(k))}: <b>${v}</b></span>`).join('')||'<span>No se identificaron registros automáticamente.</span>'}</div>${errors.length?`<div class="notice warning"><b>Revisá ${errors.length} fila(s)</b><ul>${errors.slice(0,20).map(x=>`<li>${esc(x.sheet)} · Fila ${x.row}: ${esc(x.message)}</li>`).join('')}</ul></div>`:''}<div class="table-wrap"><table><thead><tr><th>Hoja</th><th>Filas</th><th>Válidas</th><th>Revisión</th></tr></thead><tbody>${report.map(x=>`<tr><td>${esc(x.sheet)}</td><td>${x.rows}</td><td>${x.ok}</td><td>${x.bad?`<span class="text-red">${x.bad}</span>`:'<span class="status-pill success">OK</span>'}</td></tr>`).join('')}</tbody></table></div>`;$('#confirmExcelImport')?.addEventListener('click',confirmExcelImport);
}
async function analyzeSheet(wb,sheet,fileName){
 if(!currentOperator){toast('Elegí responsable antes de sincronizar.',false);return}
 const XLSXLib=await ensureXLSX();
 const ws=wb.Sheets[sheet], rows=XLSXLib.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
 const errors=[], operations=[]; const empRows=Store.list('employees');
 let headerIndex=-1, map={};
 for(let i=0;i<Math.min(rows.length,25);i++){const h=rows[i].map(normalizeImport);const idx={employee:h.findIndex(x=>/empleado|nombre/.test(x)),date:h.findIndex(x=>/fecha|dia/.test(x)),hours:h.findIndex(x=>/hora/.test(x)),branch:h.findIndex(x=>/sucursal|local/.test(x)),holiday:h.findIndex(x=>/feriado/.test(x)),advance:h.findIndex(x=>/adelanto|vale/.test(x)),merchandise:h.findIndex(x=>/mercaderia|mercadería|vale/.test(x))};if(idx.employee>=0&&idx.date>=0&&idx.hours>=0){headerIndex=i;map=idx;break;}}
 if(headerIndex>=0){
   for(let r=headerIndex+1;r<rows.length;r++){const row=rows[r];if(!row.length||row.every(v=>String(v??'').trim()===''))continue;const employeeText=String(row[map.employee]??'').trim();const date=parseExcelDate(row[map.date]);const emp=empRows.find(x=>normalizeImport(x.name)===normalizeImport(employeeText));if(!emp){errors.push({row:r+1,message:`Empleado no encontrado: ${employeeText||'sin nombre'}`});continue}if(!date){errors.push({row:r+1,message:'Fecha inválida o vacía.'});continue}const h=parseImportHours(row[map.hours],map.holiday>=0?row[map.holiday]:'');if(!h){errors.push({row:r+1,message:'Horas inválidas. Usá un número, F o H.'});continue}const sourceKey=`${fileName}|${sheet}|${r}|${emp.id}|${date}`;const data={period:date.slice(0,7),date,branch:emp.branch,employeeId:emp.id,employee:emp.name,hours:h.hours,displayValue:h.displayValue,holiday:h.holiday,status:h.status||'',advance:map.advance>=0?Number(String(row[map.advance]??0).replace(/\./g,'').replace(',','.'))||0:0,merchandise:map.merchandise>=0?Number(String(row[map.merchandise]??0).replace(/\./g,'').replace(',','.'))||0:0,salaryCost:h.hours*Number(emp.hourlyRate||0)};if(normalizeImport(employeeText)!==normalizeImport(emp.name))data.sourceWarning=`Nombre Excel coincide por normalización con ${emp.name}`;operations.push({collection:'hours',sourceKey,data,row:r+1});}
 }else{
   // Fallback para hojas donde el nombre del empleado es el nombre de la hoja y los encabezados contienen días 1..31.
   const emp=empRows.find(x=>normalizeImport(x.name)===normalizeImport(sheet));
   if(emp){const header=rows.findIndex(row=>row.some(v=>/lunes|martes|miercoles|jueves|viernes|sabado|domingo/i.test(String(v||''))||/\b\d{1,2}\b/.test(String(v||''))));if(header>=0){const row=rows[header], dayCols=[];row.forEach((v,c)=>{const m=String(v||'').match(/(\d{1,2})$/);if(m)dayCols.push({day:Number(m[1]),col:c})});const dataRow=rows[header+1]||[];for(const dc of dayCols){if(dc.day<1||dc.day>31)continue;const date=parseExcelDate(`${period}-${String(dc.day).padStart(2,'0')}`);const h=parseImportHours(dataRow[dc.col]??'');if(!h)continue;operations.push({collection:'hours',sourceKey:`${fileName}|${sheet}|${header+1}|${emp.id}|${date}`,data:{period,date,branch:emp.branch,employeeId:emp.id,employee:emp.name,hours:h.hours,displayValue:h.displayValue,holiday:h.holiday,status:h.status||'',advance:0,merchandise:0,salaryCost:h.hours*Number(emp.hourlyRate||0)},row:header+2});}}}
   else errors.push({row:0,message:'No se encontró una fila de encabezados compatible ni un empleado con el nombre de la hoja.'});
 }
 window.__blunnoPendingImport={operations,errors,fileName,sheet};
 const preview=operations.slice(0,12).map(op=>`<tr><td>${op.row}</td><td>${esc(op.data.employee)}</td><td>${dateLabel(op.data.date)}</td><td>${esc(op.data.displayValue)}</td><td>${money(op.data.advance+op.data.merchandise)}</td></tr>`).join('');
 $('#importPreview').innerHTML=`<div class="import-result-head"><div><b>Revisión: ${esc(sheet)}</b><span>${rows.length} filas leídas · ${operations.length} válidas · ${errors.length} requieren revisión.</span></div>${operations.length?'<button class="primary-button" id="confirmExcelImport">Confirmar importación</button>':''}</div>${errors.length?`<div class="notice warning"><b>Revisá ${errors.length} fila(s)</b><ul>${errors.slice(0,12).map(x=>`<li>Fila ${x.row}: ${esc(x.message)}</li>`).join('')}</ul></div>`:''}${operations.length?`<div class="table-wrap"><table><thead><tr><th>Fila</th><th>Empleado</th><th>Fecha</th><th>Valor</th><th>Adelanto + mercadería</th></tr></thead><tbody>${preview}</tbody></table></div><p class="cell-note">Solo se guardarán después de presionar “Confirmar importación”. No se crean empleados nuevos automáticamente.</p>`:'<div class="empty-block">No se encontraron filas importables.</div>'}`;
 $('#confirmExcelImport')?.addEventListener('click',confirmExcelImport);
}
async function confirmExcelImport(){const p=window.__blunnoPendingImport;if(!p||!currentOperator)return;const btn=$('#confirmExcelImport');if(btn?.dataset.busy==='1')return;if(btn)btn.dataset.busy='1';let imported=0,failed=0;try{for(const op of p.operations){try{await Store.upsertBySource(op.collection,op.sourceKey,op.data,currentOperator,`Importación Excel · ${p.fileName} · ${p.sheet} · fila ${op.row}`);imported++;}catch(e){failed++;}}await Store.add('imports',{date:today(),period,branch,sourceFile:p.fileName,sheet:p.sheet,rowsRead:p.operations.length+p.errors.length,imported,errors:p.errors.length+failed,status:failed||p.errors.length?'review':'complete'},currentOperator,'Registro de importación Excel');toast(`Importación completada: ${imported} importados, ${p.errors.length+failed} requieren revisión.`);window.__blunnoPendingImport=null;refresh();}catch(e){toast(`No se pudo completar la importación: ${e.message}`,false)}finally{if(btn)btn.dataset.busy='0'}}
async function exportExcel(){
 if(!currentOperator){toast('Elegí el responsable en la barra superior antes de exportar.',false);return}
 const X=await ensureXLSX(),wb=X.utils.book_new(),summary=Store.summary(period,branch);
 const add=(name,headers,rows,nums=[])=>{const ws=X.utils.aoa_to_sheet([headers,...rows]);ws['!cols']=headers.map((h,i)=>({wch:Math.min(44,Math.max(12,String(h).length+3,...rows.slice(0,100).map(r=>String(r[i]??'').length+2)))}));ws['!freeze']={xSplit:0,ySplit:1};if(rows.length)ws['!autofilter']={ref:`A1:${String.fromCharCode(65+Math.min(25,headers.length-1))}${rows.length+1}`};nums.forEach(c=>{for(let r=1;r<=rows.length;r++){const cell=ws[String.fromCharCode(65+Math.min(25,c))+(r+1)];if(cell)cell.z='#,##0.00';}});X.utils.book_append_sheet(wb,ws,name.slice(0,31));};
 add('Resumen',['Indicador','Monto'],[['Período',periodLabel(period)],['Perfil',branch],['Ingresos',summary.income],['Gastos caja',summary.cashExpense],['Gastos local',summary.localExpense],['Inversiones',summary.investment],['Personal',summary.salary],['Proveedores',summary.providers],['Resultado',summary.result]],[1]);
 add('Caja diaria',['Fecha','Tipo','Concepto','Importe','Sucursal','Responsable'],Store.list('cash',period,branch).map(x=>[x.date,x.type==='income'?'Ingreso':x.type==='expense'?'Gasto de caja':'Pago',x.concept||'',Number(x.amount||0),x.branch||'',x.responsible||'—']),[3]);
 add('Facturas',['Proveedor','Factura','Fecha movimiento','Fecha carga','Sucursal','Importe','Estado','Responsable'],Store.list('invoices',period,branch).map(x=>[x.provider||'',x.number||'',x.operationDate||x.date||'',x.loadDate||x.createdAt||'',x.branch||'',Number(x.amount||0),'CARGADA',x.responsible||'—']),[5]);
 add('Gastos',['Fecha del gasto','Fecha de carga','Categoría','Detalle','Sucursal','Importe','Responsable'],Store.list('expenses',period,branch).map(x=>[x.date||'',x.createdAt||'',x.category||'',x.concept||'',x.branch||'',Number(x.amount||0),x.responsible||'—']),[5]);
 add('Inversiones',['Fecha de inversión','Fecha de carga','Resumen','Sucursal','Importe','Comprobante','Responsable'],Store.list('investments',period,branch).map(x=>[x.date||'',x.createdAt||'',x.concept||'',x.branch||'',Number(x.amount||0),x.document||'',x.responsible||'—']),[4]);
 add('Horas',['Empleado','Fecha','Horas','Feriado','Extras','Adelantos','Mercadería','Sucursal','Responsable'],Store.list('hours',period,branch).map(x=>[x.employee||'',x.date||'',Number(x.hours||0),x.holiday==='yes'?'Sí':'No',Number(x.overtimeHours||0),Number(x.advance||0),Number(x.merchandise||0),x.branch||'',x.responsible||'—']),[2,4,5,6]);
 add('Liquidaciones',['Empleado','Fecha','Horas normales','Horas feriado','Horas extras','Total horas','Adelantos','Mercadería','Bruto','Neto','Responsable'],Store.list('liquidations',period,branch).map(x=>[x.employee||'',x.date||'',Number(x.normalHours||0),Number(x.holidayHours||0),Number(x.overtimeHours||0),Number(x.totalHours||0),Number(x.advance||0),Number(x.merchandise||0),Number(x.gross||0),Number(x.net||0),x.responsible||'—']),[2,3,4,5,6,7,8,9]);
 const name=`BLUNNO_${period}_${slugPath(branch)}_EXPORTACION.xlsx`,bytes=X.write(wb,{bookType:'xlsx',type:'array',cellStyles:true}),blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});let url=null;try{url=await uploadFile(storagePathFor(period,branch,'Exportación Excel',name),blob,blob.type)}catch(e){console.warn(e)}await Store.archiveFile({name,sector:'Exportación Excel',period,branch,responsible:currentOperator,mime:blob.type,createdAt:now(),sourceCollection:'imports',url,storagePath:storagePathFor(period,branch,'Exportación Excel',name),blob});downloadBlob(blob,name);toast('Excel exportado, ordenado y archivado correctamente.');
}

function openPdfPrintWindow(){
  try{return window.open('about:blank','_blank','popup=yes,width=980,height=760');}
  catch(error){return null;}
}
function printBlob(blob,preparedWindow=null,autoPrint=true){
 try{
   const url=URL.createObjectURL(blob);
   const win=preparedWindow||openPdfPrintWindow();
   if(win&&!win.closed){
     win.document.open();
     win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BLUNNO · Documento para imprimir</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#eef2f7}header{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:#10243b;color:#fff;font:600 13px Arial,sans-serif}embed{display:block;width:100%;height:calc(100% - 48px);border:0;background:#fff}button{border:0;border-radius:6px;padding:8px 12px;background:#167b91;color:#fff;font-weight:700;cursor:pointer}@media print{header{display:none}embed{height:100%}}</style></head><body><header><span>DISTRIBUIDORA BLUNNO · Vista de impresión</span><button onclick="window.print()">Imprimir</button></header><embed id="blunnoPdfPrint" type="application/pdf"></body></html>`);
     win.document.close();
     const embed=win.document.getElementById('blunnoPdfPrint');if(embed)embed.src=url;
     if(autoPrint)setTimeout(()=>{try{win.focus();win.print()}catch(error){console.warn('Impresión manual disponible en la pestaña PDF.',error);}},800);
     setTimeout(()=>URL.revokeObjectURL(url),180000);
     return true;
   }
   // Si el navegador bloquea la ventana emergente, muestra el PDF en una capa accesible para imprimir o abrirlo manualmente.
   const frame=document.createElement('iframe');frame.title='Vista previa PDF de BLUNNO';frame.src=url;
   Object.assign(frame.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',border:'0',background:'#fff',zIndex:'100001'});
   const close=document.createElement('button');close.type='button';close.textContent='Cerrar vista previa';
   Object.assign(close.style,{position:'fixed',right:'16px',top:'12px',zIndex:'100002',padding:'10px 14px',border:'0',borderRadius:'8px',background:'#10243b',color:'#fff',fontWeight:'700'});
   const remove=()=>{frame.remove();close.remove();URL.revokeObjectURL(url);};close.addEventListener('click',remove);
   document.body.append(frame,close);
   toast('Se abrió la vista previa del PDF. Podés imprimirlo desde el visor.',true);
   return false;
 }catch(error){toast(`No se pudo preparar la impresión: ${error.message}`,false);return false;}
}
async function printStoredFile(id){const target=openPdfPrintWindow();try{const file=Store.get('files',id);const blob=await Store.getFileBlob(id);if(!blob)throw new Error('No se encontró el archivo.');void auditPdfAction(file,'PDF_PRINTED','Archivo PDF impreso desde Archivos');printBlob(blob,target);toast('Documento preparado para impresión.');}catch(e){try{target?.close()}catch{}toast(`No se pudo imprimir: ${e.message}`,false)}}

function dosDateTime(){const d=new Date();return {time:(d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2),date:((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()};}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255]);}
function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
function concatBytes(chunks){const total=chunks.reduce((n,x)=>n+x.length,0);const out=new Uint8Array(total);let o=0;for(const x of chunks){out.set(x,o);o+=x.length}return out;}
function zipStored(entries){const enc=new TextEncoder(),parts=[],central=[];let offset=0;const dt=dosDateTime();for(const entry of entries){const name=enc.encode(entry.name),data=entry.data instanceof Uint8Array?entry.data:new Uint8Array(entry.data);const crc=crc32(data);const local=concatBytes([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);parts.push(local);central.push({name,crc,size:data.length,offset});offset+=local.length;}const centralStart=offset;for(const c of central){parts.push(concatBytes([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(c.crc),u32(c.size),u32(c.size),u16(c.name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(c.offset),c.name]));offset+=46+c.name.length;}const centralSize=offset-centralStart;parts.push(concatBytes([u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(centralSize),u32(centralStart),u16(0)]));return new Blob(parts,{type:'application/zip'});}
async function createBackupZip(){
 if(!currentOperator){toast('Elegí responsable antes de hacer un backup.',false);return null}
 try{
  const state=JSON.parse(JSON.stringify(Store.db)),manifest=[];
  const entries=[{name:'datos/blunno.json',data:new TextEncoder().encode(JSON.stringify(state,null,2))}];
  // Incluye todos los documentos del repositorio, incluso los que están en Papelera, para que el backup sea recuperable.
  for(const file of (Store.db.files||[])){
   try{
    const blob=await Store.getFileBlob(file.id);
    if(blob){const bytes=new Uint8Array(await blob.arrayBuffer()),entryName=`archivos/${file.id}`;entries.push({name:entryName,data:bytes});manifest.push({id:file.id,name:file.name,mime:file.mime||'application/octet-stream',entry:entryName,deleted:!!file.deleted});}
    else manifest.push({id:file.id,name:file.name,mime:file.mime||'',entry:null,deleted:!!file.deleted,error:'No se pudo recuperar el binario al momento del backup.'});
   }catch(e){manifest.push({id:file.id,name:file.name,mime:file.mime||'',entry:null,deleted:!!file.deleted,error:e.message})}
  }
  entries.push({name:'datos/manifest_archivos.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});
  const blob=zipStored(entries),name=`BLUNNO_BACKUP_${today()}.zip`;
  downloadBlob(blob,name);
  const included=manifest.filter(x=>x.entry).length,missing=manifest.length-included;
  toast(`Backup generado: ${included} documentos incluidos${missing?`, ${missing} sin binario recuperable (revisá el manifiesto)`:''}.`,missing===0);
  return {blob,name,entries:entries.map(x=>x.name),manifest};
 }catch(e){toast(`No se pudo generar el backup: ${e.message}`,false);return null}
}
function readZipEntries(bytes){const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const sig=0x06054b50;let eocd=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65558);i--){if(dv.getUint32(i,true)===sig){eocd=i;break}}if(eocd<0)throw new Error('El ZIP no tiene una estructura reconocible.');const count=dv.getUint16(eocd+10,true),cdOffset=dv.getUint32(eocd+16,true),entries={};let pos=cdOffset;const dec=new TextDecoder();for(let i=0;i<count;i++){if(dv.getUint32(pos,true)!==0x02014b50)throw new Error('Entrada ZIP inválida.');const nameLen=dv.getUint16(pos+28,true),extraLen=dv.getUint16(pos+30,true),commentLen=dv.getUint16(pos+32,true),method=dv.getUint16(pos+10,true),size=dv.getUint32(pos+24,true),offset=dv.getUint32(pos+42,true);const name=dec.decode(bytes.slice(pos+46,pos+46+nameLen));if(method!==0)throw new Error('El backup usa compresión no compatible. Generá nuevamente el backup desde BLUNNO.');const lp=offset;if(dv.getUint32(lp,true)!==0x04034b50)throw new Error('Cabecera local ZIP inválida.');const ln=dv.getUint16(lp+26,true),le=dv.getUint16(lp+28,true);const dataStart=lp+30+ln+le;entries[name]=bytes.slice(dataStart,dataStart+size);pos+=46+nameLen+extraLen+commentLen;}return entries;}
async function restoreBackupFile(file){if(!file||!currentOperator)return;if(!confirm('Vas a restaurar un backup. Esto reemplazará los datos actuales del modo local por la copia elegida. ¿Continuar?'))return;try{const bytes=new Uint8Array(await file.arrayBuffer());let data,manifest=[];if(/\.zip$/i.test(file.name)||file.type==='application/zip'){const entries=readZipEntries(bytes);const json=entries['datos/blunno.json'];if(!json)throw new Error('El backup no contiene datos/blunno.json.');data=JSON.parse(new TextDecoder().decode(json));if(entries['datos/manifest_archivos.json'])manifest=JSON.parse(new TextDecoder().decode(entries['datos/manifest_archivos.json']));await Store.importState(data,currentOperator);let restored=0;for(const m of manifest){if(!m.entry||!entries[m.entry])continue;try{await Store.restoreFileBlob(m.id,new Blob([entries[m.entry]],{type:m.mime||'application/octet-stream'}),currentOperator,{preserveDeleted:!!m.deleted});restored++}catch(e){console.warn('Restore file',m.id,e)}}toast(`Backup restaurado. ${restored} documentos recuperados.`);}else{data=JSON.parse(new TextDecoder().decode(bytes));await Store.importState(data,currentOperator);toast('Backup JSON restaurado correctamente.');}refresh();}catch(e){toast(`No se pudo restaurar el backup: ${e.message}`,false)}}

function checkReminders(){const due=Store.list('tasks').filter(x=>x.status!=='completed').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`))[0];if(!due)return;const nowD=new Date(),d=new Date(`${due.dueDate}T${due.dueTime||'23:59'}:00`);if(d<=nowD||due.dueDate===today()){$('#reminderTitle').textContent=due.priority==='urgent'?'⚠ RECORDATORIO URGENTE':'🔔 TENÉS UN RECORDATORIO';$('#reminderText').textContent=due.title;$('#reminderMeta').textContent=`📅 ${dateLabel(due.dueDate)} — ${due.dueTime||'sin hora'} · 👤 ${due.responsible}`;$('#reminderModal').classList.remove('hidden');$('#reminderDone').onclick=()=>completeTask(due.id);}}

window.__blunnoCloseHistoricalControl=closeHistoricalControl;
window.__blunnoConfirmHistoricalControl=confirmHistoricalControl;

function globalWire(){
 // Eliminación por delegación en fase de burbujeo. Los sectores se redibujan
 // constantemente, así que un único listener estable mantiene operativo
 // Eliminar en cualquier pantalla y evita conflictos con listeners antiguos.
 if(!window.__blunnoDeleteDelegation){
   window.__blunnoDeleteDelegation=true;
   document.addEventListener('click',e=>{
     const button=e.target?.closest?.('[data-delete]');
     if(!button || button.dataset.delete==='audit')return;
     e.preventDefault();
     e.stopPropagation();
     void deleteRecord(button.dataset.delete,button.dataset.id);
   });
 }
 if(!window.__blunnoCompletedTaskDeleteDelegation){
   window.__blunnoCompletedTaskDeleteDelegation=true;
   document.addEventListener('click',e=>{
     const button=e.target?.closest?.('[data-delete-completed-task]');
     if(!button)return;
     e.preventDefault();
     e.stopPropagation();
     void deleteCompletedTask(button.dataset.deleteCompletedTask);
   });
 }
 document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{view=b.dataset.view;viewHistory.length=0;viewForward.length=0;refresh();closeMobileMenu();});
 const mobileBtn=$('#mobileMenuBtn');
 const overlay=$('#mobileOverlay');
 function openMobileMenu(){document.body.classList.add('mobile-nav-open');overlay?.classList.remove('hidden');}
 window.__blunnoOpenMobileMenu=openMobileMenu;
 window.__blunnoCloseMobileMenu=closeMobileMenu;
 function closeMobileMenu(){document.body.classList.remove('mobile-nav-open');overlay?.classList.add('hidden');}
 mobileBtn?.addEventListener('click',openMobileMenu);
 overlay?.addEventListener('click',closeMobileMenu);

 $('#periodSelector').onclick=openPeriodModal;
 $('#branchSelector').onchange=e=>{const next=e.target.value;if(next===branch)return;if(confirm(`Estás cambiando el contexto de trabajo a ${String(next).toUpperCase()}.\nLos datos no se modificarán. Solamente cambiará la información que estás visualizando.\n\n¿Querés cambiar el contexto?`))setBranch(next);else e.target.value=branch;};
 $('#operatorSelector').onchange=e=>setOperator(e.target.value);

 $('#closeModalBtn')?.addEventListener('click',closeModal);
 $('#recordForm').addEventListener('submit',saveRecord);
 document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=closeModal);
 document.querySelectorAll('[data-close-period-modal]').forEach(b=>b.onclick=()=>$('#periodModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-period-confirm]').forEach(b=>b.onclick=closePeriodConfirm);
 document.querySelectorAll('[data-close-estimate]').forEach(b=>b.onclick=closeEstimateModal);
 $('#estimateForm')?.addEventListener('submit',saveEstimate);
 $('#periodConfirmAccept')?.addEventListener('click',confirmPeriodAction);
 $('#historicalConfirm')?.addEventListener('click',confirmHistoricalControl);
 $('#historicalControlModal')?.addEventListener('click',e=>{if(e.target.id==='historicalControlModal')closeHistoricalControl()});
 $('#periodConfirmModal')?.addEventListener('click',e=>{if(e.target.id==='periodConfirmModal')closePeriodConfirm()});
 document.querySelectorAll('[data-close-detail]').forEach(b=>b.onclick=()=>$('#detailModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-reminder]').forEach(b=>b.onclick=()=>$('#reminderModal').classList.add('hidden'));
}

let pendingPeriodAction=null;
function closePeriodConfirm(){pendingPeriodAction=null;$('#periodConfirmModal')?.classList.add('hidden');}
function openPeriodActionConfirm(kind,value,actionBranch=branch){
 if(branch==='General'){toast('General es una vista consolidada. Elegí una sucursal concreta para iniciar o modificar un período.',false);return;}
 pendingPeriodAction={kind,value,branch:actionBranch};
 const edit=kind==='edit', cashLate=kind==='cash-late';
 $('#periodConfirmTitle').textContent=cashLate?'Habilitar edición tardía de Caja Diaria':(edit?'Modificar mes cerrado':'Comenzar nuevo mes');
 $('#periodConfirmMessage').textContent=cashLate?`Estás por modificar la Caja Diaria de ${periodLabel(value).toUpperCase()}. El mes puede estar cerrado. Para continuar, confirmá que querés realizar una corrección histórica y seleccioná el responsable.`:(edit?'¿Estás seguro que querés modificar el mes seleccionado?':'¿Estás seguro que querés arrancar este nuevo mes de control?');
 $('#periodConfirmPeriod').textContent=`Mes de Caja: ${periodLabel(value)} · ${actionBranch}`;
 const select=$('#periodConfirmResponsible');
 if(select) select.innerHTML='<option value="">Elegir responsable…</option>'+CONFIG.responsiblePeople.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
 if(select) select.value='';
 $('#periodConfirmModal').classList.remove('hidden');
 setTimeout(()=>select?.focus(),0);
}
async function confirmPeriodAction(){
 if(!pendingPeriodAction)return;
 const target=pendingPeriodAction; const responsible=$('#periodConfirmResponsible')?.value||'';
 try{
   assertResponsible(responsible);
   setOperator(responsible);
   if(target.kind==='cash-late'){
     await enableCashLateSession(target.value,target.branch,responsible);
     closePeriodConfirm();
     finishCashLateEdit();
   }else if(target.kind==='edit'){
     const pending=pendingRecordEdit; pendingRecordEdit=null;
     setPeriodEditConfirmed(target.value,target.branch,true);
     persistPeriodSelection(target.value);
     closePeriodConfirm(); $('#periodModal').classList.add('hidden');
     refresh();
     toast(`${periodLabel(target.value)} quedó habilitado para correcciones y la autorización fue auditada.`);
     if(pending?.id) setTimeout(()=>openModal(pending.type,pending.id),0);
   }else{
     await Store.openPeriod(target.value,responsible,target.branch);
     persistPeriodSelection(target.value);
     closePeriodConfirm(); $('#periodModal').classList.add('hidden');
     refresh(); toast(`${periodLabel(target.value)} quedó iniciado para ${target.branch}.`);
   }
 }catch(e){toast(e.message,false);}
}

function argentinaCalendarParts(input=new Date()){
 const date=input instanceof Date?input:new Date(`${String(input).slice(0,10)}T12:00:00-03:00`);
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const values=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 return {year:values.year,month:values.month,day:values.day};
}
function easterSundayUTC(year){
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114,month=Math.floor(n/31),day=n%31+1;
 return Date.UTC(year,month-1,day);
}
function argentinaSeasonStartDates(year){
 const T=(year-2000)/1000,T2=T*T,T3=T2*T,T4=T3*T;
 const terms={
  autumn:[2451623.80984,365242.37404,0.05169,-0.00411,-0.00057],
  winter:[2451716.56767,365241.62603,0.00325,0.00888,-0.00030],
  spring:[2451810.21715,365242.01767,-0.11575,0.00337,0.00078],
  summer:[2451900.05952,365242.74049,-0.06223,-0.00823,0.00032]
 };
 const localDateKey=coefficients=>{
  const jde=coefficients[0]+coefficients[1]*T+coefficients[2]*T2+coefficients[3]*T3+coefficients[4]*T4;
  const date=new Date((jde-2440587.5)*86400000);
  const local=argentinaCalendarParts(date);
  return Date.UTC(local.year,local.month-1,local.day);
 };
 return Object.fromEntries(Object.entries(terms).map(([name,coefficients])=>[name,localDateKey(coefficients)]));
}
function seasonalThemeForDate(input=new Date()){
 const {year,month,day}=argentinaCalendarParts(input);
 const stamp=Date.UTC(year,month-1,day),dayMs=86400000;
 const dayDistance=(target)=>Math.round((target-stamp)/dayMs);
 const between=(start,end)=>stamp>=start&&stamp<=end;
 const thirdSunday=(y,m)=>{const firstDay=new Date(Date.UTC(y,m-1,1)).getUTCDay();return 1+((7-firstDay)%7)+14;};
 const motifs={
  prefiestas:{key:'prefiestas',label:'Se acercan las fiestas',icon:'✨',items:['✨','🎄','🔔','🎁','⭐'],accent:'festive'},
  navidad:{key:'navidad',label:'Navidad argentina',icon:'🎄',items:['❄️','❄️','✨','❄️','⭐','❄️','🎀','❄️','✨','❄️','🎁','❄️'],accent:'festive'},
  finAno:{key:'fin-ano',label:'Fin de año',icon:'🎉',items:['🎉','✨','🥂','⭐','🎊'],accent:'festive'},
  reyes:{key:'reyes',label:'Día de Reyes',icon:'👑',items:['👑','⭐','🎁','🐪','✨'],accent:'festive'},
  sanValentin:{key:'san-valentin',label:'San Valentín',icon:'💗',items:['💗','🌹','💌','✨','💕'],accent:'romance'},
  carnaval:{key:'carnaval',label:'Carnaval',icon:'🎭',items:['🎭','🎉','🎊','🎈','✨'],accent:'carnival'},
  pascuas:{key:'pascuas',label:'Pascuas',icon:'🐰',items:['🐰','🥚','🌷','✨'],accent:'spring'},
  halloween:{key:'halloween',label:'Halloween',icon:'🎃',items:['🎃','👻','🕸️','🦇','✨'],accent:'halloween'},
  mujer:{key:'mujer',label:'Día de la Mujer',icon:'🌷',items:['🌷','💜','🌸','✨'],accent:'romance'},
  malvinas:{key:'malvinas',label:'Día del Veterano y de los Caídos en Malvinas',icon:'🇦🇷',items:['🇦🇷','🩵','🤍','🕊️'],accent:'patria'},
  trabajador:{key:'trabajador',label:'Día del Trabajador',icon:'🧉',items:['🧉','💙','🤝','⭐'],accent:'amigo'},
  padre:{key:'padre',label:'Día del Padre',icon:'💙',items:['💙','👔','⭐','🤝','✨'],accent:'amigo'},
  padreBandera:{key:'padre-bandera',label:'Día del Padre y Día de la Bandera',icon:'🇦🇷',items:['💙','👔','🇦🇷','🩵','⭐'],accent:'patria'},
  nino:{key:'nino',label:'Día de las Infancias',icon:'🎈',items:['🎈','🧸','⭐','🎉','✨'],accent:'summer'},
  maestro:{key:'maestro',label:'Día del Maestro',icon:'📚',items:['📚','✏️','🌟','🍎'],accent:'spring'},
  madre:{key:'madre',label:'Día de la Madre',icon:'🌷',items:['🌷','💐','💗','✨','💕'],accent:'romance'},
  estudiante:{key:'estudiante',label:'Día del Estudiante',icon:'🌸',items:['🌸','📚','🦋','🎉'],accent:'spring'},
  patria:{key:'patria',label:'Semana de Mayo',icon:'🇦🇷',items:['🇦🇷','🩵','🤍','⭐','🩵'],accent:'patria'},
  bandera:{key:'bandera',label:'Orgullo argentino',icon:'🇦🇷',items:['🇦🇷','🩵','🤍','⭐'],accent:'patria'},
  amigo:{key:'amigo',label:'Día del Amigo',icon:'🧉',items:['🧉','💙','✨','🤝'],accent:'amigo'},
  tradicion:{key:'tradicion',label:'Día de la Tradición',icon:'🧉',items:['🧉','🐎','🎸','⭐'],accent:'amigo'},
  verano:{key:'verano',label:'Verano argentino',icon:'☀️',items:['☀️','🌻','🍊','✨'],accent:'summer'},
  otono:{key:'otono',label:'Otoño argentino',icon:'🍂',items:['🍂','🧉','☕','🍁'],accent:'autumn'},
  invierno:{key:'invierno',label:'Invierno argentino',icon:'🧣',items:['❄️','🧣','🧉','☕','✨'],accent:'winter'},
  primavera:{key:'primavera',label:'Primavera argentina',icon:'🌸',items:['🌸','🌼','🦋','🌷','✨'],accent:'spring'}
 };
 // Fiestas populares y fechas argentinas puntuales; cada motivo termina al cambiar su fecha.
 if(month===10&&day===thirdSunday(year,10))return motifs.madre;
 if(month===10&&day>=25)return motifs.halloween;
 if(month===11&&day===1)return motifs.halloween;
 if(month===3&&day===8)return motifs.mujer;
 if(month===4&&day===2)return motifs.malvinas;
 if(month===5&&day===1)return motifs.trabajador;
 if(month===6&&day===thirdSunday(year,6))return day===20?motifs.padreBandera:motifs.padre;
 if(month===8&&day===thirdSunday(year,8))return motifs.nino;
 if(month===9&&day===11)return motifs.maestro;
 if(month===9&&day===21)return motifs.estudiante;
 // Argentine cultural dates take priority over the seasonal pre-Christmas theme.
 if(month===11&&day===10)return motifs.tradicion;
 if(month===11&&day===20)return motifs.bandera;
 // Fiestas: start with a restrained pre-season, then Christmas, New Year and Reyes.
 if(month===11&&day>=3&&day<=30)return motifs.navidad;
 if(month===12&&day<=7)return motifs.navidad;
 if(month===12&&day>=8&&day<=28)return motifs.navidad;
 if((month===12&&day>=29)||(month===1&&day===1))return motifs.finAno;
 if(month===1&&day>=2&&day<=6)return motifs.reyes;
 if(month===2&&day>=10&&day<=14)return motifs.sanValentin;
 // Carnival follows Easter's movable date (Saturday before Carnival Monday through Tuesday).
 const easter=easterSundayUTC(year),daysToEaster=dayDistance(easter);
 if(daysToEaster>=47&&daysToEaster<=50)return motifs.carnaval;
 if(daysToEaster>=0&&daysToEaster<=3)return motifs.pascuas;
 if(month===5&&day>=18&&day<=25)return motifs.patria;
 if((month===6&&day===20)||(month===7&&day===9)||(month===8&&day===17)||(month===11&&day===20))return motifs.bandera;
 if(month===7&&day===20)return motifs.amigo;
 // The Southern Hemisphere season boundaries are calculated per year from the equinoxes and solstices, converted to Argentina's local calendar date.
 const seasons=argentinaSeasonStartDates(year);
 if(stamp>=seasons.summer||stamp<seasons.autumn)return motifs.verano;
 if(stamp>=seasons.autumn&&stamp<seasons.winter)return motifs.otono;
 if(stamp>=seasons.winter&&stamp<seasons.spring)return motifs.invierno;
 return motifs.primavera;
}
function scheduleSeasonalMidnightUpdate(){
 if(window.__BLUNNO_SEASONAL_TIMEOUT__)window.clearTimeout(window.__BLUNNO_SEASONAL_TIMEOUT__);
 const {year,month,day}=argentinaCalendarParts(new Date());
 // Argentina UTC-3: refresh five minutes after local midnight so each dated theme ends on time.
 const nextRefresh=Date.UTC(year,month-1,day+1,3,5);
 const delay=Math.max(1000,nextRefresh-Date.now());
 window.__BLUNNO_SEASONAL_TIMEOUT__=window.setTimeout(()=>{initSeasonalDecor();scheduleSeasonalMidnightUpdate();},delay);
}
function seasonalFestiveWindow(input=new Date()){
 const {year,month,day}=argentinaCalendarParts(input);
 if((month===11&&day>=3)||(month===12&&day<=28))return {key:'navidad',year};
 if(month===12&&day>=29)return {key:'fin-ano',year:year+1};
 if(month===1&&day===1)return {key:'fin-ano',year};
 if(month===1&&day>=2&&day<=6)return {key:'reyes',year};
 return null;
}
function initSeasonalDecor(){
 const host=document.getElementById('blunnoSeasonalDecor');
 const banner=document.getElementById('blunnoSeasonalBanner');
 if(!host)return;
 const theme=seasonalThemeForDate();
 const festive=seasonalFestiveWindow();
 const visualKey=festive?.key||theme.key;
 const visualLabel=festive?.key==='navidad'?'Navidad argentina':theme.label;
 document.body.dataset.blunnoSeason=visualKey;
 if(host.dataset.theme!==visualKey){
   host.dataset.theme=visualKey;
   let particles=theme.items;
   if(visualKey==='navidad')particles=['❄️','❄️','✨','❄️','🧊','⭐','❄️','❄️','✨','🧊','❄️','❄️'];
   else if(visualKey==='fin-ano')particles=['✨','🎉','⭐','🎊','✨','🥂'];
   else if(visualKey==='reyes')particles=['⭐','✨','👑','🎁','⭐','✨'];
   const xPositions=[1,5,10,90,95,99,2,8,92,97,0,100];
   const yPositions=[8,24,42,58,76,17,91,34,66,49,84,12];
   host.innerHTML=particles.map((item,index)=>{
     const falling=visualKey==='navidad';
     const style=falling
       ? `--season-x:${xPositions[index%xPositions.length]}vw;--season-y:${yPositions[index%yPositions.length]}vh;--season-delay:${-index*1.8}s;--season-duration:${18+(index%5)*3}s`
       : `--season-y:${yPositions[index%yPositions.length]}vh;--season-delay:${-index*6.4}s;--season-duration:${34+(index%3)*5}s`;
     return `<span class="blunno-seasonal-particle" style="${style}">${item}</span>`;
   }).join('');
   host.setAttribute('aria-label',visualLabel);
 }
 if(!banner)return;
 const bannerStateKey=festive?`${festive.key}:${theme.key}`:'';
 if(banner.dataset.theme===bannerStateKey)return;
 banner.dataset.theme=bannerStateKey;
 banner.hidden=!festive;
 if(festive?.key==='navidad'){
   const special=theme.key!=='navidad'?`<span class="blunno-festive-special">Hoy también: ${theme.label}</span>`:'';
   banner.innerHTML=`<section class="blunno-festive-banner blunno-festive-christmas" role="note" aria-label="Temporada navideña BLUNNO ${festive.year}">
     <div class="blunno-festive-copy"><span class="blunno-festive-eyebrow">BLUNNO · EDICIÓN ESPECIAL ${festive.year}</span><h2>¡La Navidad ya llegó!</h2><p>Que la magia de las fiestas acompañe cada jornada de trabajo.</p><div class="blunno-festive-tags"><span>❄️ Copos de nieve</span><span>🎁 Espíritu navideño</span><span>✨ Buenos deseos</span></div>${special}</div>
     <div class="blunno-festive-scene" aria-hidden="true"><span class="blunno-scene-star star-one">✦</span><span class="blunno-scene-star star-two">✧</span><span class="blunno-scene-snow snow-one">❄</span><span class="blunno-scene-snow snow-two">❄</span><span class="blunno-scene-santa">🎅</span><span class="blunno-scene-tree">🎄</span><span class="blunno-scene-tree tree-small">🎄</span><span class="blunno-scene-gift gift-one">🎁</span><span class="blunno-scene-gift gift-two">🎁</span><span class="blunno-scene-label">¡Felices Fiestas!</span></div>
   </section>`;
 }else if(festive?.key==='fin-ano'){
   banner.innerHTML=`<section class="blunno-festive-banner blunno-festive-newyear" role="note"><div class="blunno-festive-copy"><span class="blunno-festive-eyebrow">BLUNNO · RECIBIMOS ${festive.year}</span><h2>¡Vamos por un gran año nuevo!</h2><p>Un cierre de año lleno de buenos deseos y nuevos proyectos.</p></div><div class="blunno-festive-scene" aria-hidden="true"><span class="blunno-scene-santa">🎉</span><span class="blunno-scene-tree">🥂</span><span class="blunno-scene-gift gift-one">🎊</span><span class="blunno-scene-gift gift-two">✨</span><span class="blunno-scene-label">¡Feliz Año Nuevo!</span></div></section>`;
 }else if(festive?.key==='reyes'){
   banner.innerHTML=`<section class="blunno-festive-banner blunno-festive-kings" role="note"><div class="blunno-festive-copy"><span class="blunno-festive-eyebrow">BLUNNO · 6 DE ENERO</span><h2>¡Llegaron los Reyes Magos!</h2><p>Estrellas, regalos y buenos deseos para empezar el año.</p></div><div class="blunno-festive-scene" aria-hidden="true"><span class="blunno-scene-santa">👑</span><span class="blunno-scene-tree">⭐</span><span class="blunno-scene-gift gift-one">🎁</span><span class="blunno-scene-gift gift-two">🐪</span><span class="blunno-scene-label">¡Felices Reyes!</span></div></section>`;
 }else banner.innerHTML='';
}
async function init(){
 try{
   await Store.ready;
   initSeasonalDecor();
   scheduleSeasonalMidnightUpdate();
   if(!window.__BLUNNO_SEASONAL_VISIBILITY__){const refreshSeason=()=>{if(!document.hidden){initSeasonalDecor();scheduleSeasonalMidnightUpdate();}};document.addEventListener('visibilitychange',refreshSeason);window.addEventListener('focus',refreshSeason);window.__BLUNNO_SEASONAL_VISIBILITY__=true;}
   window.addEventListener('blunno:storage-health',()=>void updateStorageHealth());
   window.addEventListener('blunno:storage-error',e=>toast('ATENCIÓN: no se pudo confirmar el guardado ampliado. Exportá un backup y no cierres la pestaña. '+(e?.detail?.message||''),false));
   window.__blunnoRefreshFromRemote = () => { try { refresh(); } catch {} };
   window.addEventListener('online',()=>{ try { Store.flushPendingSync().then(()=>refresh()).catch(()=>{}); } catch {} });
   window.addEventListener('focus',checkCalendarPeriodRollover);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkCalendarPeriodRollover();});
   window.setInterval(checkCalendarPeriodRollover,60000);
   const savedOperator = (()=>{try{return localStorage.getItem("blunno-operator")||""}catch{return ""}})();
   currentOperator = CONFIG.responsiblePeople.includes(savedOperator) ? savedOperator : "";
   window.__blunnoResponsible = currentOperator;
   branch="General"; window.__blunnoBranch=branch;
   period=calendarPeriodNow(); lastKnownCalendarPeriod=period; followCalendarPeriod=true;
   Store.setPeriod(period);
   try { localStorage.setItem(periodContextKey(),period); } catch {}
   compareB=period; compareA=prevPeriod(period);
   connection();
   const operatorSelector=$("#operatorSelector"); if(operatorSelector) operatorSelector.value=currentOperator;
   const operatorLabel=$("#operatorLabel"); if(operatorLabel) operatorLabel.textContent=currentOperator || "Elegir responsable";
   if(window.__BLUNNO_NEEDS_FRESH_FILE_VAULT_CLEAN__) { await vaultClear(); delete window.__BLUNNO_NEEDS_FRESH_FILE_VAULT_CLEAN__; }
   await Store.sync(); globalWire(); refresh(); if(Store.storagePersistenceFailed)toast("ATENCIÓN: revisá el almacenamiento del navegador y exportá un backup.",false); window.__BLUNNO_BOOTED__=true; window.__BLUNNO_RUNTIME__={version:"2026.11.06.48",entry:"blunno-control.js",mode:Store.mode,storage:Store.storageMode};
 }catch(e){
   const box=document.getElementById('bootError'); if(box){box.hidden=false;const out=box.querySelector('[data-boot-message]');if(out)out.textContent=e?.message||String(e);}
 }
}
if(window.__BLUNNO_TEST_MODE__) window.__BLUNNO_TEST__={
  Store, navigate, refresh, setOperator, setBranch, seasonalThemeForDate, initSeasonalDecor, scheduleSeasonalMidnightUpdate,
  setPeriod(value){ if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('Período inválido.'); persistPeriodSelection(value); refresh(); },
  context:()=>({view,period,branch,currentOperator}),
  generateAndShowViewPDF, generateExpenseCategoryPDF, generateInvoicePDF, generateClosurePDF, generateProviderHistoryPDF,
  openPeriodModal, openPeriodActionConfirm, confirmPeriodAction, closePeriodConfirm, openCloseConfirm,
  openCloseValidationError, changeCashWeek, changeHoursWeek,
  createBackupZip, readZipEntries, restoreBackupFile,
  openLiquidation, showProviderHistory, analyzeSheet, confirmExcelImport, exportExcel, deleteSalaryVoucher,
  printStoredFile, downloadStoredFile, printClosureVersion, downloadClosureVersion, printCurrentPdf, downloadCurrentPdf, saveHourCell,
  wireProviderPicker, showDashboardDetail,
};

init();

__BLUNNO_MODULES.web = {  };
})();
