import { CONFIG, periodLabel, nextPeriod, dateLabel } from "./config.js";
import { Store } from "./store.js";
import { firebaseEnabled, authState, login, logout } from "./firebase.js";
import { formSchema, renderView, renderPeriodModal } from "./views.js";

const $ = s => document.querySelector(s);
const content=$("#content"), title=$("#pageTitle");
let view="dashboard", period=CONFIG.defaultPeriod, editing=null;

const titles={dashboard:"Panel general",cash:"Caja diaria",providers:"Proveedores",invoices:"Facturas",people:"Personal",hours:"Horas · Bodereau",results:"Resultados",compare:"Comparativas",history:"Historial",import:"Importar / Exportar"};

const toast=(msg,ok=true)=>{
  const el=$("#toast"); el.textContent=msg; el.className=`toast show ${ok?"ok":"bad"}`;
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.className="toast",3000);
};

function setConnection(){
  $("#connectionDot").className=firebaseEnabled?"connected":"local";
  $("#connectionText").textContent=firebaseEnabled?"Firebase conectado":"Modo local";
  $("#userText").textContent=firebaseEnabled ? "Autenticación habilitada" : "Firebase pendiente";
}

function refresh(){
  title.textContent=titles[view];
  renderView(view,content,period);
  wireView();
  $("#periodSelector").textContent=periodLabel(period);
  $("#periodState").textContent=Store.periodIsClosed(period)?"CERRADO":"ABIERTO";
  $("#periodDot").className=Store.periodIsClosed(period)?"closed":"open";
}

function openModal(type,id=null){
  editing=id ? Store.get(type==="provider"?"providers":type==="employee"?"employees":type,id) : null;
  const schema=formSchema[type]; if(!schema) return;
  $("#modalKicker").textContent=editing?"EDICIÓN CONTROLADA":"NUEVO REGISTRO";
  $("#modalTitle").textContent=editing?"Editar registro":"Nuevo registro";
  $("#formFields").innerHTML=schema.map(([name,label,t,opts])=>{
    let control;
    if(t==="select") control=`<select name="${name}">${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o]; return `<option value="${v}">${l}</option>`}).join("")}</select>`;
    else if(t==="textarea") control=`<textarea name="${name}" rows="3"></textarea>`;
    else control=`<input name="${name}" type="${t}" ${t==="number"?'step="0.01" min="0"':""}>`;
    return `<label class="field">${label}${control}</label>`;
  }).join("");
  const data=editing||{};
  for(const [name] of schema){
    const input=document.querySelector(`#formFields [name="${name}"]`);
    if(input && data[name]!==undefined) input.value=String(data[name]);
  }
  if(!editing){
    const d=$("#formFields [name='date']"); if(d) d.value=new Date().toISOString().slice(0,10);
    const s=$("#formFields [name='status']"); if(s) s.value="pending";
    const a=$("#formFields [name='active']"); if(a) a.value="true";
  }
  $("#modal").classList.remove("hidden");
  $("#formFields input, #formFields select, #formFields textarea")[0]?.focus();
}

function closeModal(){ $("#modal").classList.add("hidden"); editing=null; }

async function saveRecord(e){
  e.preventDefault();
  const type=e.target.dataset.type, data=Object.fromEntries(new FormData(e.target).entries());
  if(type==="provider") data.active=true;
  if(type==="employee") data.active=data.active!=="false";
  if(["cash","invoice","hours"].includes(type)) data.period=period;
  if(["cash","invoice","hours"].includes(type)) data.amount!==undefined && (data.amount=Number(data.amount||0));
  if(type==="hours") data.hours=Number(data.hours||0);
  if(type==="invoice" && !data.provider) throw new Error("Falta indicar el proveedor.");
  try{
    const collection=type==="provider"?"providers":type==="employee"?"employees":type==="invoice"?"invoices":type;
    if(editing) await Store.update(collection,editing.id,data,"Edición desde formulario");
    else await Store.add(collection,data,"Alta desde formulario");
    closeModal(); toast(editing?"Cambios guardados y auditados":"Registro creado y auditado"); refresh();
  }catch(err){ toast(err.message||"No se pudo guardar",false); }
}

function wireView(){
  document.querySelectorAll("[data-new]").forEach(b=>b.onclick=()=>openModal(b.dataset.new));
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openModal(b.dataset.edit,b.dataset.id));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{
    if(!confirm("¿Dar de baja este registro? No se destruirá: quedará recuperable en el historial.")) return;
    try{ await Store.remove(b.dataset.delete,b.dataset.id,"Baja solicitada desde el sistema"); toast("Registro dado de baja"); refresh(); }
    catch(e){toast(e.message,false);}
  });
  $("#exportAudit")?.addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(Store.db.audit,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="historial-blunno.json"; a.click();
  });
  $("#backupButton")?.addEventListener("click",()=>Store.exportJson());
  $("#printButton")?.addEventListener("click",()=>window.print());
  $("#excelInput")?.addEventListener("change",handleExcel);
}

async function handleExcel(e){
  const file=e.target.files?.[0], box=$("#importPreview");
  if(!file) return;
  box.innerHTML=`<div class="loading">Leyendo <b>${file.name}</b>…</div>`;
  try{
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:"array",cellDates:true});
    const sheets=wb.SheetNames;
    const previews=[];
    for(const name of sheets){
      const ws=wb.Sheets[name];
      const data=XLSX.utils.sheet_to_json(ws,{defval:"",raw:false});
      const cols=data.length?Object.keys(data[0]):[];
      previews.push({name,rows:data.length,cols,data:data.slice(0,5)});
    }
    box.innerHTML=`<div class="notice success"><b>Archivo leído correctamente.</b> ${sheets.length} hoja(s) detectada(s).</div>`+
      previews.map(p=>`<div class="sheet-preview"><div><b>${p.name}</b><span>${p.rows} filas · ${p.cols.length} columnas</span></div><small>${p.cols.map(x=>`<em>${x}</em>`).join(" ")}</small><button class="secondary-button import-sheet" data-sheet="${encodeURIComponent(p.name)}">Preparar esta hoja</button></div>`).join("");
    document.querySelectorAll(".import-sheet").forEach(b=>b.onclick=()=>prepareImport(wb,decodeURIComponent(b.dataset.sheet),file.name));
  }catch(err){box.innerHTML=`<div class="notice danger-box">No se pudo leer el Excel: ${err.message}</div>`;}
}

function prepareImport(wb,sheet,fileName){
  const ws=wb.Sheets[sheet], data=XLSX.utils.sheet_to_json(ws,{defval:"",raw:false});
  const normalized=data.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k.trim().toLowerCase(),v])));
  const text=JSON.stringify(normalized.slice(0,30)).toLowerCase();
  let type="cash";
  if(/proveedor|factura|vencimiento|cuit/.test(text)) type="invoice";
  else if(/empleado|legajo|horas|jornada/.test(text)) type="hours";
  const box=$("#importPreview");
  box.innerHTML+=`<div class="import-confirm"><h3>Vista previa · ${sheet}</h3><p>Tipo sugerido: <b>${type}</b>. Se encontraron <b>${data.length}</b> filas.</p><p>Antes de guardar, revisá los encabezados y los datos. Esta versión no sobrescribe registros automáticamente.</p><button class="primary-button" id="downloadPreview">Descargar vista previa CSV</button></div>`;
  $("#downloadPreview").onclick=()=>{
    const ws2=XLSX.utils.json_to_sheet(data), out=XLSX.utils.sheet_to_csv(ws2);
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([out],{type:"text/csv"}));
    a.download=`revision-${fileName.replace(/\.[^.]+$/,"")}-${sheet}.csv`; a.click();
  };
}

$("#recordForm").addEventListener("submit",saveRecord);
document.querySelectorAll("[data-close-modal]").forEach(b=>b.onclick=closeModal);
document.querySelector("[data-close-search]").onclick=()=>$("#searchModal").classList.add("hidden");
$("#searchBtn").onclick=()=>{ $("#searchModal").classList.remove("hidden"); $("#searchInput").focus(); };
$("#newRecordBtn").onclick=()=>{
  const map={cash:"cash",providers:"provider",invoices:"invoice",people:"employee",hours:"hours"};
  openModal(map[view]||"cash");
};
$("#mainNav").addEventListener("click",e=>{
  const b=e.target.closest("[data-view]"); if(!b)return;
  view=b.dataset.view;
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x===b));
  refresh();
});
$("#periodSelector").onclick=()=>{
  const list=renderPeriodModal();
  const options=list.map(p=>`${p.id} — ${p.status==="closed"?"CERRADO":"ABIERTO"}`).join("\n");
  const choice=prompt(`Períodos disponibles:\n${options}\n\nEscribí YYYY-MM para consultar o crear un período:`,period);
  if(!choice) return;
  Store.setPeriod(choice.trim()); period=choice.trim(); refresh();
};
$("#accountBtn").onclick=()=>{
  if(!firebaseEnabled){toast("Firebase todavía no está configurado.");return;}
  $("#loginModal").classList.remove("hidden");
};
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); $("#loginMessage").textContent="Ingresando…";
  try{await login($("#loginEmail").value.trim(),$("#loginPassword").value);$("#loginModal").classList.add("hidden");toast("Sesión iniciada");await Store.sync();refresh();}
  catch(err){$("#loginMessage").textContent=err.message;}
});
$("#logoutButton").onclick=async()=>{await logout();toast("Sesión cerrada");};

$("#searchInput").addEventListener("input",e=>{
  const q=e.target.value.trim().toLowerCase(), box=$("#searchResults");
  if(!q){box.innerHTML=`<div class="empty-block">Escribí un proveedor, factura, empleado o concepto.</div>`;return;}
  const source=["providers","employees","invoices","cash"].flatMap(c=>Store.list(c).map(x=>({...x,_collection:c})));
  const found=source.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).slice(0,25);
  box.innerHTML=found.length?found.map(x=>`<div class="search-result"><b>${x.name||x.provider||x.number||x.concept||"Registro"}</b><span>${x._collection} · ${x.amount?new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(x.amount):""}</span></div>`).join(""):`<div class="empty-block">Sin resultados.</div>`;
});

document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();$("#searchModal").classList.add("hidden");}});
authState(async user=>{
  if(firebaseEnabled && user){
    $("#connectionText").textContent="Firebase conectado";
    $("#userText").textContent=user.email||"Usuario autenticado";
    await Store.sync(); refresh();
  }
});

setConnection();
refresh();
