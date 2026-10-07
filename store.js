import { CONFIG, uid, isFirebaseConfigured, today, now, nextPeriod, periodLabel, money, number } from "./config.js";
import { remoteList, remoteAdd, remoteUpdate, remoteDelete, remotePurge, remoteAudit, remoteBatchSet, getRemoteMeta, initializeRemoteMeta, listenRemoteCollection, ensureAnonymousAuth, stopRemoteListeners, getFirebaseUid } from "./firebase.js";

const KEY = "blunno-control-v13-final";
const collections = [
  "periods", "providers", "incomes", "invoices", "cash", "cashConcepts", "expenses", "investments", "employees", "hours",
  "employeeDebts", "liquidations", "tasks", "closures", "files", "imports", "audit", "settings"
];
const REMOTE_COLLECTIONS = collections.filter(n => !["settings","files"].includes(n));
const REALTIME_COLLECTIONS = REMOTE_COLLECTIONS.filter(n => n !== "audit");
const OUTBOX_KEY = "blunno-firebase-outbox-v1";
const outboxRead = () => { try { const raw=localStorage.getItem(OUTBOX_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } };
const outboxWrite = rows => { try { localStorage.setItem(OUTBOX_KEY,JSON.stringify(rows)); } catch {} };
const queueRemoteOp = op => { const rows=outboxRead(); rows.push({...op,queuedAt:now()}); outboxWrite(rows.slice(-1000)); };
const outboxSize = () => outboxRead().length;
const pendingOpsFor = name => outboxRead().filter(op=>op.collection===name);
const isRemoteCollection = name => REMOTE_COLLECTIONS.includes(name);

const providerSeeds = [
  "611 LOGISTICA",
  "ACCESORIOS (CELULAR)",
  "ALFAJORES MAICENA",
  "ALIMENTAR",
  "ALITAS",
  "BAUTOM",
  "BETTINI",
  "BIMBO",
  "CAMPI",
  "CERDO (MARIANO)",
  "CEREALES",
  "CIGARILLOS",
  "COCA COLA",
  "CONDIMENTOS",
  "CORDERO , TORTILLA , CASEROS",
  "Cordoba Drinks",
  "DOS HERMANOS  (MDM)",
  "EL CLUB DEL 29",
  "EMPANADAS",
  "FERMAR",
  "FERRERO ROCHER",
  "FIT NUT SAS",
  "FLOR PEÑA",
  "GALANA",
  "GARRAPIÑADAS",
  "GOLOSINAS",
  "HIELO",
  "HUEVOS",
  "HUMO (TABACO & SUPLEMENTS)",
  "il molinos",
  "INTEGRALL (ARCOR)",
  "L Y L",
  "LAYS",
  "loto granolas",
  "MI MAGO (Distri. CACCIA BERNHARD)",
  "MIGA /PEBETE",
  "MINIMARKET MENDIOLAZA",
  "MOLINOS",
  "MS. FERNANDEZ",
  "PAN CASERO",
  "PAN DE CAMPO",
  "PAN RALLADO",
  "PANADERO (pdf)",
  "PANDERO (PDF 2)",
  "PANZ (DAMIAN)",
  "POLLO (mariano)",
  "QUIPAR S.R.L",
  "SAN BACHA",
  "SAN PABLO",
  "SANTA CRUZ",
  "SECCO",
  "SIMPLE",
  "TANTE",
  "TREMBLAY",
  "VAFOOD S.R.L",
  "VCC365 S.A",
  "VENDEDOR S.R.L",
  "VERDURAS LOS 5 HERMANOS",
  "VILLA ALLENDE",
  "AGUILERA",
  "Argentina",
  "ATUN (SEÑOR RARO)",
  "B-Burger",
  "BACHA",
  "Bordon Gabriel Eduardo (BAGGIO)",
  "Cap",
  "CELESTIAL",
  "CIGARILLOS (DISTRIBUIDORA DE TODO)",
  "CONGELADOS (MERLUZA - MILANESAS-POLLO)",
  "CONGELADOS (POLLO)",
  "Corpel",
  "Cremac",
  "Danal",
  "Danal Pasta",
  "Distribuidora (DUL-C.E.S)",
  "Distribuidora Gaitan",
  "DOBLE COLA / PRITTY",
  "DON ADOLFO",
  "DON PANIFICADO (MÁS Q´ PANNE)",
  "EMPANADAS (CONGELADAS)",
  "FINCA SANTIAGO",
  "Fit Nut SAS (nestle)",
  "GALLETAS SURTIDAS",
  "GEM",
  "INTEGRAL (ARCOR)",
  "L.Y.L",
  "LA CASERITA",
  "MARTIN NOGUEZ",
  "Mayorista (YAGUAR)",
  "MDM",
  "Mercado De Especias",
  "NEVARES",
  "NEW FEL (FELPITA)",
  "OLIVI HERMANOS",
  "PAN (PDF)",
  "PAN MIGA",
  "PIZZAS SALVADOR",
  "QUINTA GENERACION (GROSSO)",
  "QUIPAR SRL",
  "Rutas Comerciales ( DEL VALLE)",
  "RyE",
  "SAL DE CAMPO",
  "SALSAS",
  "SAN ALFONSO",
  "San Jose",
  "Severina (tarquino)",
  "Simple (TREGAR)",
  "Stoecklin Bebidas S.R.L ( COCA COLA)",
  "SUIPA",
  "VenezziANA",
  "WINDY",
  "WINDY (2)",
  "yerbas (mismo remito que golosina)",
  "Argentina Distri.",
  "BALLCHOC",
  "BOCADITOS (MARROC)",
  "C.C.U",
  "Don Yeyo (Vendedor S.R.L)",
  "EMPANADAS (NICO)",
  "Golosina",
  "HUMO (tabaco -suplement)",
  "Ilarina.Integral",
  "Maru (Empanadas)",
  "MÁS Q´ PANNE",
  "Migas",
  "PIZZAS CONGELADAS",
  "ROSBOC",
  "SÓJITAS",
  "TABACO + PIZZAS CONGELADAS",
  "Terrabusi (Quipar S.R.L)",
  "Textiles (TANTES)",
  "Veneziana",
  "VILLA ALLENDE ( bodereau)",
  "VINOS (NO SE SABE)",
  "BENJAMIN",
  "Caserita",
  "Doble cola",
  "El Molino",
  "Ilarina Integral",
  "PANES (PANZ)",
  "Pastelitos",
  "Salvador Pizza",
  "Sorrentino (Ivan)",
  "Tregar",
  "Vendor S.R.L",
  "LAURA",
];


const empty = () => Object.fromEntries(collections.map(c => [c, []]));
const CONTROL_START_PERIOD = "2026-10";
const CLEAN_START_MARKER = "blunno-clean-start-v28-0-6";
const BUSINESS_DATA_COLLECTIONS = ["incomes","invoices","cash","expenses","investments","employees","hours","employeeDebts","liquidations","tasks","closures","files","imports","audit"];
const PROVIDER_RESTORE_MARKER = "blunno-provider-catalog-restored-v28";
const resetLocalForRealStart = data => {
  let firstStart=false;
  try{firstStart=localStorage.getItem(CLEAN_START_MARKER)!=='1'}catch{firstStart=true}
  if(!firstStart)return data;
  for(const name of BUSINESS_DATA_COLLECTIONS)data[name]=[];
  // El maestro de proveedores NO se limpia: es configuración base permanente.
  data.settings=[{id:'ui',branch:'General',responsible:'',period:'2026-10'}];
  data.periods=buildPeriodCatalog().map(x=>({...x,startedBranches:[]}));
  try{localStorage.setItem(CLEAN_START_MARKER,'1')}catch{}
  window.__BLUNNO_NEEDS_FRESH_FILE_VAULT_CLEAN__=true;
  const keysToRemove=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(/^blunno-(cash-week|hours-week|expense-category|current-period)-/.test(k)||k==='blunno-operator'))keysToRemove.push(k)}keysToRemove.forEach(k=>localStorage.removeItem(k));
  return data;
};
const currentCalendarPeriod = () => String(today()).slice(0,7);
const periodDefaultStatus = id => {
  if (String(id) < CONTROL_START_PERIOD) return "closed";
  return periodIsFuture(String(id)) ? "available" : "open";
};
const buildPeriodCatalog = () => {
  const out=[];
  const current=currentCalendarPeriod();
  const currentYear=Number(current.slice(0,4))||2026;
  const endYear=Math.max(2030,currentYear+4);
  for(let y=2026;y<=endYear;y++) for(let m=1;m<=12;m++){
    const id=`${y}-${String(m).padStart(2,'0')}`;
    out.push({id,status:id<CONTROL_START_PERIOD?"closed":(id===current?"open":"available"),name:id,startedBranches:[],createdAt:now(),updatedAt:now()});
  }
  return out;
};
const ensurePeriodCatalog = data => {
  const current=currentCalendarPeriod();
  const map=new Map((Array.isArray(data.periods)?data.periods:[]).map(x=>[x.id,{...x,startedBranches:Array.isArray(x.startedBranches)?x.startedBranches:[]} ]));
  for(const row of buildPeriodCatalog()) {
    if(!map.has(row.id)) map.set(row.id,row);
    const existing=map.get(row.id);
    if(row.id<CONTROL_START_PERIOD) existing.status="closed";
    else if(row.id===current) existing.status="open";
    else if(!existing.startedBranches.length) existing.status="available";
    existing.name=existing.name||row.name;
  }
  data.periods=[...map.values()].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  return data;
};
const seed = () => {
  const s = empty();
  s.periods = buildPeriodCatalog();
  s.incomes = [];
  s.providers = providerSeeds.map(name => ({ id: uid(), name, active: true, master: true, status:"active", excludedBranches: [], deleted:false, createdBy:"Sistema", createdAt: now(), updatedAt: now() }));
  s.settings.push({ id: "ui", branch: "General", responsible: "", period: CONFIG.defaultPeriod });
  return s;
};

const providerKey = value => {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
};
const ensureProviderCatalog = data => {
  const providers = Array.isArray(data.providers) ? data.providers : [];
  const seen = new Map();
  const cleaned = [];
  for (const row of providers) {
    const key = providerKey(row.name);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.set(key, true);
    cleaned.push(row);
  }
  data.providers = cleaned.map(p=>({...p,master:true,branchId:null,branch:null,periodId:null,period:null,excludedBranches:Array.isArray(p.excludedBranches)?p.excludedBranches:[]}));
  return data;
};

const restoreProviderCatalogOnce = data => {
  let restored = false;
  try { restored = localStorage.getItem(PROVIDER_RESTORE_MARKER) === '1'; } catch {}
  if (restored) return data;
  const providers = Array.isArray(data.providers) ? data.providers.filter(p => p && p.name) : [];
  // V28.0.5 erroneously emptied providers during the clean-start migration.
  // If the current catalog is empty, rebuild the original master catalog once.
  if (providers.length === 0) {
    data.providers = providerSeeds.map(name => ({ id: uid(), name, active: true, master: true, status:'active', excludedBranches: [], deleted:false, createdBy:'Sistema', createdAt: now(), updatedAt: now() }));
  }
  try { localStorage.setItem(PROVIDER_RESTORE_MARKER, '1'); } catch {}
  return data;
};

let state=load();
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    let merged=raw?{...empty(),...JSON.parse(raw)}:seed();
    merged=ensureProviderCatalog(merged);
    merged=ensurePeriodCatalog(merged);
    merged=resetLocalForRealStart(merged);
    merged=restoreProviderCatalogOnce(merged);
    if(!merged.periods.length)merged.periods=buildPeriodCatalog();
    if(!Array.isArray(merged.providers))merged.providers=[];
    merged.employees=(merged.employees||[]).filter(e=>!(e.createdBy==='Sistema'&&e.master===true)).map(e=>({...e,branchId:e.branchId||e.branch||null}));
    localStorage.setItem(KEY,JSON.stringify(merged));return merged;
  }catch{return seed()}
}
const persist = () => localStorage.setItem(KEY, JSON.stringify(state));
const active = name => (state[name] || []).filter(x => !x.deleted);
const purgeExpiredTrash = () => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const n of collections) {
    const before = state[n] || [];
    const keep = before.filter(x => {
      if (!x.deleted) return true;
      const rawDate = x.deletedAt?.toDate ? x.deletedAt.toDate() : x.deletedAt;
      const t = new Date(rawDate || 0).getTime();
      if (t && t <= cutoff) {
        changed = true;
        const at = now();
        const time = auditTime(at);
        state.audit.unshift({ id: uid(), action:"AUTO_PURGE", collection:n, recordId:x.id, before:x, after:null, responsible:"Sistema", actor:"Sistema", at, date:time.date, hour:time.hour, minute:time.minute, sector:sectorForCollection(n), branch:x.branch ?? null, period:x.period ?? null, reason:"Purga automática de papelera después de 30 días" });
        return false;
      }
      return true;
    });
    state[n] = keep;
  }
  if (changed) persist();
  return changed;
};
purgeExpiredTrash();
setInterval(purgeExpiredTrash, 60 * 60 * 1000);

const VAULT_DB = "blunno-file-vault-v1";
const openVault = () => new Promise((resolve,reject)=>{ const req=indexedDB.open(VAULT_DB,1); req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains("blobs")) req.result.createObjectStore("blobs"); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
const vaultPut = async (key,blob) => { const db=await openVault(); return new Promise((resolve,reject)=>{ const tx=db.transaction("blobs","readwrite"); tx.objectStore("blobs").put(blob,key); tx.oncomplete=()=>{db.close();resolve()}; tx.onerror=()=>{db.close();reject(tx.error)}; }); };
const vaultGet = async key => { const db=await openVault(); return new Promise((resolve,reject)=>{ const tx=db.transaction("blobs","readonly"); const req=tx.objectStore("blobs").get(key); req.onsuccess=()=>{db.close();resolve(req.result||null)}; req.onerror=()=>{db.close();reject(req.error)}; }); };
const vaultDelete = async key => { try{const db=await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction("blobs","readwrite");tx.objectStore("blobs").delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}catch{} };
const vaultClear = async () => { try{const db=await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction("blobs","readwrite");const req=tx.objectStore("blobs").clear();req.onerror=()=>{db.close();reject(req.error)};tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}catch{} };

const actor = () => window.__blunnoResponsible || "Usuario local";
const periodRecord = p => state.periods.find(x => x.id === p) || null;
const periodIsFuture = p => String(p) > currentCalendarPeriod();
const periodIsStarted = (p, branch="General") => {
  if (!periodIsFuture(p)) return true;
  const row=periodRecord(p);
  return Array.isArray(row?.startedBranches) && row.startedBranches.includes(branch);
};
const periodIsClosed = (p, branch="General") => {
  if (String(p) < CONTROL_START_PERIOD) return true;
  return state.closures.some(x => x.period === p && x.branch === branch && x.status === "closed");
};
const periodStateLabel = (p, branch="General") => {
  if (periodIsClosed(p,branch)) return "CERRADO";
  if (periodIsFuture(p) && !periodIsStarted(p,branch)) return "DISPONIBLE PARA INICIAR";
  return "ABIERTO";
};
const periodEditConfirmedKey = (p,b) => `blunno-period-edit-confirmed-${p}-${b}`;
const periodEditStorage = () => typeof sessionStorage !== 'undefined' ? sessionStorage : localStorage;
const periodEditConfirmed = (p,b) => periodEditStorage().getItem(periodEditConfirmedKey(p,b)) === "1";
const setPeriodEditConfirmed = (p,b,on=true) => on ? periodEditStorage().setItem(periodEditConfirmedKey(p,b),"1") : periodEditStorage().removeItem(periodEditConfirmedKey(p,b));
const assertResponsible = name => {
  const value = String(name || "").trim();
  if (!value) throw new Error("Seleccioná el responsable antes de guardar.");
  if (value !== "Usuario local" && !CONFIG.responsiblePeople.includes(value)) throw new Error("El responsable no es válido. Elegí Agus, Nico, Luz o Flor.");
};
const branchMatches = (row, branch) => !branch || branch === "General" || row.branch === branch;
const providerMatches = (row, branch) => true;

const movementCollections = new Set(["incomes","invoices","cash","expenses","investments","hours","employeeDebts","liquidations","closures"]);
const concreteBranches = new Set(CONFIG.branches);
const isValidPeriod = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
const validDate = value => {
  const raw=String(value||"");
  const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return false;
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  const dt=new Date(y,mo-1,d,12,0,0);
  return dt.getFullYear()===y && dt.getMonth()===mo-1 && dt.getDate()===d;
};
const sourceIdentity = value => String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g," ");
const CASH_CONCEPT_TYPES = new Set(["income", "expense", "payment"]);
const isProtectedCashConcept = (type, name) => type === "income" && /^saldo\s+d[ií]a\s+anterior$/i.test(String(name || "").trim());
const cashConceptId = (period, branch, type, name) => {
  const raw = `${period}|${branch}|${type}|${sourceIdentity(name)}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619);
  const slug = sourceIdentity(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "concepto";
  return `cash-${type}-${slug}-${(hash >>> 0).toString(16)}`;
};
const validResponsible = name => CONFIG.responsiblePeople.includes(String(name || "").trim());
const validBranch = name => concreteBranches.has(String(name || ""));
const providerAvailableInBranch = (provider, branch) => !branch || branch === "General" || !Array.isArray(provider?.excludedBranches) || !provider.excludedBranches.includes(branch);
// El maestro de proveedores es global: todos los perfiles/sucursales consultan exactamente el mismo catálogo.
// La separación por sucursal aplica a las FACTURAS (movimientos), no al maestro de proveedores.
const providersForBranch = _branch => active("providers");

const ensureProviderExists = providerName => {
  const key = sourceIdentity(providerName);
  if (!key) throw new Error("La factura necesita un proveedor.");
  const provider = active("providers").find(x => sourceIdentity(x.name) === key);
  if (!provider) throw new Error("El proveedor no existe en el maestro. Crealo primero desde Proveedores.");
  return provider;
};
const auditTime = value => {
  const d = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d).filter(x=>x.type!=="literal");
  const map = Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {date:`${map.year}-${map.month}-${map.day}`,hour:map.hour,minute:map.minute};
};
const sectorForCollection = collection => ({incomes:"Ingresos",invoices:"Facturas",cash:"Caja",cashConcepts:"Caja",expenses:"Gastos",investments:"Inversiones",employees:"Personal",hours:"Horas",employeeDebts:"Personal",liquidations:"Liquidaciones",tasks:"Recordatorios",closures:"Cierre mensual",providers:"Proveedores",files:"Archivos",audit:"Auditoría",settings:"Configuración",imports:"Importación"}[collection] || collection);
const validateRecord = (collection, data, editingId = null) => {
  const row = data || {};
  if (movementCollections.has(collection) && row.period && !isValidPeriod(row.period)) throw new Error("El período no es válido.");
  for (const k of ["date","operationDate"]) if (row[k] && !validDate(String(row[k]).slice(0,10))) throw new Error(`La fecha de ${k === "operationDate" ? "la factura" : "movimiento"} no es válida.`);
  if (["incomes","invoices","cash","expenses","investments","hours","employeeDebts","liquidations"].includes(collection) && !validBranch(row.branch)) throw new Error("Seleccioná una sucursal concreta. General es solo una vista consolidada.");
  if (collection === "providers") {
    const name = sourceIdentity(row.name); if (!name) throw new Error("Ingresá el nombre del proveedor.");
    const duplicate = active("providers").find(x => x.id !== editingId && sourceIdentity(x.name) === name);
    if (duplicate) throw new Error(`El proveedor ${duplicate.name} ya existe. No se creó un duplicado.`);
  }
  if (collection === "invoices") {
    if (!row.provider) throw new Error("La factura necesita un proveedor.");
    ensureProviderExists(row.provider);
    if (!row.operationDate || !validDate(String(row.operationDate).slice(0,10))) throw new Error("Ingresá una fecha válida para la factura.");
    if (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0) throw new Error("Ingresá un importe válido para la factura.");
    row.status = "CARGADA";
    row.period = String(row.period || row.operationDate).slice(0,7);
  }
  const dateBearing = new Set(["invoices","incomes","cash","expenses","investments","hours"]);
  if(dateBearing.has(collection) && row.period){
    const movementDate=String(row.operationDate || row.date || "").slice(0,10);
    if(movementDate && movementDate.slice(0,7)!==String(row.period)){
      throw new Error(`Fecha fuera de período: ${movementDate} no pertenece a ${periodLabel(row.period)}. La operación fue bloqueada para evitar mezclar meses.`);
    }
  }
  if (["incomes","expenses","investments"].includes(collection) && (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0)) throw new Error("Ingresá un importe válido.");
  if (collection === "cash" && (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0)) throw new Error("Ingresá un importe de caja válido.");
  if (collection === "cashConcepts") {
    if (!CASH_CONCEPT_TYPES.has(String(row.type || ""))) throw new Error("El tipo de concepto de caja no es válido.");
    if (!validBranch(row.branch)) throw new Error("El concepto debe pertenecer a una sucursal concreta.");
    if (!isValidPeriod(row.period)) throw new Error("El período del concepto no es válido.");
    if (!String(row.name || "").trim()) throw new Error("Ingresá el nombre del concepto.");
  }
  if (collection === "employees") { if (!String(row.name || "").trim()) throw new Error("Ingresá el nombre del empleado."); if (!validBranch(row.branch)) throw new Error("El empleado debe tener una sucursal concreta."); }
  if (collection === "hours") {
    if (!row.employeeId) throw new Error("Seleccioná un empleado válido.");
    const emp=active("employees").find(x=>x.id===row.employeeId);
    if(!emp) throw new Error("El empleado seleccionado no existe.");
    if(!validBranch(row.branch) || emp.branch!==row.branch) throw new Error("Las horas deben pertenecer a la misma sucursal del empleado.");
    if (!row.date || !validDate(row.date)) throw new Error("Ingresá una fecha válida.");
    const hv=String(row.displayValue||""); if (hv && /^(f|franco)$/i.test(hv)) row.status="franco";
  }
  if (collection === "employeeDebts" || collection === "liquidations") {
    if(row.employeeId){
      const emp=active("employees").find(x=>x.id===row.employeeId);
      if(!emp) throw new Error("El empleado seleccionado no existe.");
      if(row.branch!==emp.branch) throw new Error("El registro de personal debe pertenecer a la sucursal del empleado.");
    }
  }
  if (collection === "tasks") { if (!String(row.title||"").trim()) throw new Error("Ingresá el título del recordatorio."); if (row.responsible && !validResponsible(row.responsible)) throw new Error("El responsable del recordatorio no es válido."); }
};
const decorate = (data, responsible, status="active", id=null) => ({
  ...(id ? { id } : {}),
  ...data,
  responsible,
  createdBy: data.createdBy || responsible,
  branchId: data.master===true || data.branchId===null ? null : (data.branchId || data.branch || null),
  periodId: data.periodId || data.period || null,
  status: data.status || status,
  deleted: false,
  createdAt: data.createdAt || now(),
  updatedAt: now()
});


async function audit(action, collection, id, before, after, responsible, reason, meta = {}) {
  const at = now();
  const source = after || before || {};
  const t = auditTime(at);
  const row = {
    id: uid(), action, collection, recordId: id,
    before: before || null, after: after || null,
    responsible: responsible || actor(), actor: actor(), at,
    date: t.date, hour: t.hour, minute: t.minute,
    sector: meta.sector || sectorForCollection(collection),
    branch: meta.branch ?? source.branch ?? null,
    period: meta.period ?? source.period ?? null,
    reason: reason || "",
    ...meta
  };
  state.audit.unshift(row); persist();
  if (isFirebaseConfigured()) { try { await remoteAudit(row); } catch(e) { queueRemoteOp({kind:"audit",collection:"audit",id:row.id,data:row}); console.warn("Firebase audit pendiente",e); } }
  return row;
}
async function syncRemote(){
  if(!isFirebaseConfigured())return;
  await ensureAnonymousAuth();
  const meta=await getRemoteMeta();
  if(!meta){
    const rows=[];
    for(const name of REMOTE_COLLECTIONS)for(const row of(state[name]||[]))rows.push({name,id:row.id,data:row});
    if(rows.length)await remoteBatchSet(rows);
    await initializeRemoteMeta({schemaVersion:4,app:"BLUNNO",initializedAt:now(),initializedBy:getFirebaseUid(),mode:"anonymous-shared",files:"local-only"});
  }else{
    await Promise.all(REMOTE_COLLECTIONS.map(async name=>{try{state[name]=await remoteList(name)}catch(e){console.warn("Firebase sync",name,e)}}));
  }
  if(!state.periods.length)state.periods=seed().periods;
  state=ensurePeriodCatalog(state);
  state=ensureProviderCatalog(state);
  persist();
  await flushOutbox();
}
const applyPendingOps=(name,rows)=>{
  const map=new Map(rows.map(x=>[x.id,x]));
  for(const op of pendingOpsFor(name)){
    if(op.kind==='add')map.set(op.id,op.data);
    else if(op.kind==='update')map.set(op.id,{...(map.get(op.id)||{}),...(op.data||{}),id:op.id});
    else if(op.kind==='delete')map.set(op.id,{...(map.get(op.id)||{}),id:op.id,deleted:true});
    else if(op.kind==='purge')map.delete(op.id);
  }
  return [...map.values()];
};
async function flushOutbox(){
  if(!isFirebaseConfigured()||!outboxSize())return;
  const pending=outboxRead(),keep=[];
  for(const op of pending){
    try{
      if(op.kind==='add')await remoteAdd(op.collection,op.data,op.id);
      else if(op.kind==='update')await remoteUpdate(op.collection,op.id,op.data);
      else if(op.kind==='delete')await remoteDelete(op.collection,op.id);
      else if(op.kind==='purge')await remotePurge(op.collection,op.id);
      else if(op.kind==='audit')await remoteAudit(op.data);
    }catch{keep.push(op)}
  }
  outboxWrite(keep);
}
async function subscribeRealtime(){
  if(!isFirebaseConfigured())return;
  stopRemoteListeners(); await ensureAnonymousAuth();
  for(const name of REALTIME_COLLECTIONS){
    await listenRemoteCollection(name,rows=>{
      let next=applyPendingOps(name,rows);
      if(name === "cashConcepts") {
        const localById=new Map((state.cashConcepts||[]).map(x=>[x.id,x]));
        const remoteById=new Map(next.map(x=>[x.id,x]));
        for(const [id,localRow] of localById) {
          const remoteRow=remoteById.get(id);
          const localTs=String(localRow?.updatedAt||"");
          const remoteTs=String(remoteRow?.updatedAt||"");
          if(localRow?.active===false && (!remoteRow || localTs.localeCompare(remoteTs)>=0)) remoteById.set(id,localRow);
        }
        next=[...remoteById.values()];
      }
      state[name]=next; persist();
      try{if(typeof window!=='undefined'&&typeof window.__blunnoRefreshFromRemote==='function')window.__blunnoRefreshFromRemote(name)}catch{}
    });
  }
}

function assertOpen(data, allowLate = false, options = {}) {
  const p=String(data?.period||"");
  const b=data?.branch||"General";
  if (!p) return;
  if (periodIsClosed(p,b) && !allowLate) throw new Error("El período está cerrado para esta sucursal. Para un movimiento tardío activá la opción correspondiente.");
  if (periodIsFuture(p) && !periodIsStarted(p,b) && !allowLate && !options.allowFutureDerived) throw new Error(`El período ${periodLabel(p)} todavía no fue iniciado para ${b}. Abrilo desde el selector de períodos antes de cargar movimientos.`);
}

const Store = {
  get mode() { return isFirebaseConfigured() ? "firebase" : "local"; },
  get db() { return state; },
  list(name, period = null, branch = null) {
    let rows = active(name);
    if (period && ["incomes", "cash", "cashConcepts", "hours", "invoices", "expenses", "investments", "employeeDebts", "liquidations", "tasks", "closures"].includes(name)) rows = rows.filter(x => x.period === period);
    if (name === "cashConcepts") rows = rows.filter(x => x.active !== false);
    if (branch && branch !== "General") rows = rows.filter(x => branchMatches(x, branch));
    return rows;
  },
  trash(name = null) {
    purgeExpiredTrash();
    const names = name ? [name] : collections;
    return names.flatMap(n => (state[n] || []).filter(x => x.deleted).map(x => ({ ...x, _collection: n })));
  },
  async purgeTrashItem(name, id, responsible, reason = "Eliminación definitiva") {
    assertResponsible(responsible);
    const old = this.getRaw(name, id);
    if (!old || !old.deleted) throw new Error("El registro no se encuentra en la papelera.");
    state[name] = state[name].filter(x => x.id !== id);
    if(name === "files" && old.vaultKey) await vaultDelete(old.vaultKey);
    persist();
    if (isRemoteCollection(name) && isFirebaseConfigured()) { try { await remotePurge(name,id); } catch(e) { queueRemoteOp({kind:"purge",collection:name,id}); } }
    await audit("PURGE", name, id, old, null, responsible, reason);
  },
  async purgeTrashMany(items, responsible) {
    assertResponsible(responsible);
    for (const item of items) await this.purgeTrashItem(item.collection || item._collection, item.id, responsible, "Eliminación definitiva seleccionada");
  },
  async restoreMany(items, responsible) {
    assertResponsible(responsible);
    for (const item of items) await this.restore(item.collection || item._collection, item.id, responsible);
  },
  get(name, id) { return (state[name] || []).find(x => x.id === id && !x.deleted) || null; },
  getRaw(name, id) { return (state[name] || []).find(x => x.id === id) || null; },
  periodIsClosed,
  periodIsStarted,
  periodStateLabel,
  setPeriod(p) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(p)) throw new Error("Período inválido.");
    if (!state.periods.some(x => x.id === p)) { state.periods.push({ id: p, status: periodDefaultStatus(p), name: p, startedBranches: [], createdAt: now(), updatedAt: now() }); persist(); }
  },
  async openPeriod(p,responsible){
    assertResponsible(responsible);
    const activeBranch=arguments[2] || "General";
    if(activeBranch==='General') throw new Error("Elegí una sucursal concreta para iniciar el nuevo mes.");
    if(!periodIsFuture(p)) throw new Error("El período seleccionado ya está abierto por calendario o pertenece a un período anterior.");
    this.setPeriod(p);
    const old=periodRecord(p)||{id:p,status:"available",name:p,startedBranches:[]};
    const startedBranches=new Set(Array.isArray(old.startedBranches)?old.startedBranches:[]);
    startedBranches.add(activeBranch);
    const row={...old,status:"open",startedBranches:[...startedBranches],openedAt:now(),openedBy:responsible,updatedAt:now()};
    state.periods=state.periods.map(x=>x.id===p?row:x); persist();
    await audit("OPEN_PERIOD","periods",p,old,row,responsible,`Inicio del período ${p}`,{period:p,branch:activeBranch});
    return row;
  },
  async addCashConcept({ period, branch, type, name }, responsible) {
    assertResponsible(responsible);
    const cleanName = String(name || "").trim();
    if (!validBranch(branch)) throw new Error("Elegí una sucursal concreta para administrar conceptos.");
    if (!isValidPeriod(period)) throw new Error("El período del concepto no es válido.");
    if (!CASH_CONCEPT_TYPES.has(String(type || ""))) throw new Error("El tipo de concepto de caja no es válido.");
    if (!cleanName) throw new Error("Ingresá el nombre del concepto.");
    if (isProtectedCashConcept(type, cleanName)) throw new Error("Saldo día anterior es automático y no se puede crear manualmente.");
    const available = this.cashConcepts(type, period, branch);
    if (available.some(x => sourceIdentity(x) === sourceIdentity(cleanName))) throw new Error(`El concepto ${cleanName} ya existe en ${branch} para ${periodLabel(period)}.`);
    const id = cashConceptId(period, branch, type, cleanName);
    const old = this.getRaw("cashConcepts", id);
    const row = {
      id, period, branch, type, name: cleanName,
      active: true, source: "manual",
      restoredFromRemoval: !!old,
      createdAt: old?.createdAt || now(), updatedAt: now(),
      createdBy: old?.createdBy || responsible, responsible
    };
    if (old) state.cashConcepts = state.cashConcepts.map(x => x.id === id ? row : x);
    else { state.cashConcepts ||= []; state.cashConcepts.unshift(row); }
    persist();
    if (isFirebaseConfigured()) {
      try { await remoteUpdate("cashConcepts", id, row); }
      catch(e) { queueRemoteOp({kind:"update",collection:"cashConcepts",id,data:row}); }
    }
    await audit(old ? "CASH_CONCEPT_REACTIVATE" : "CASH_CONCEPT_ADD", "cashConcepts", id, old, row, responsible, old ? "Reactivación de concepto de Caja diaria" : "Alta de concepto de Caja diaria", {branch,period,sector:"Caja"});
    return row;
  },
  async removeCashConcept({ period, branch, type, name, id: requestedId = null }, responsible) {
    assertResponsible(responsible);
    const cleanName = String(name || "").trim();
    const cleanType = String(type || "");
    if (!validBranch(branch)) throw new Error("Elegí una sucursal concreta para administrar conceptos.");
    if (!isValidPeriod(period)) throw new Error("El período del concepto no es válido.");
    if (!CASH_CONCEPT_TYPES.has(cleanType)) throw new Error("El tipo de concepto de caja no es válido.");
    if (!cleanName) throw new Error("El concepto no es válido.");
    if (isProtectedCashConcept(cleanType, cleanName)) throw new Error("Este concepto es automático y no se puede eliminar.");

    const deterministicId = cashConceptId(period, branch, cleanType, cleanName);
    const stateRows = state.cashConcepts || [];
    const old = this.getRaw("cashConcepts", requestedId || deterministicId) ||
      stateRows.find(x => x.period === period && x.branch === branch && x.type === cleanType && sourceIdentity(x.name) === sourceIdentity(cleanName));
    const id = old?.id || requestedId || deterministicId;
    const timestamp = now();
    const row = {
      ...(old || {}), id, period, branch, type: cleanType, name: cleanName,
      active: false, source: old?.source || "system",
      removedAt: timestamp, removedBy: responsible, updatedAt: timestamp,
      createdAt: old?.createdAt || timestamp, createdBy: old?.createdBy || responsible, responsible
    };
    if (old) state.cashConcepts = stateRows.map(x => x.id === old.id ? row : x);
    else { state.cashConcepts ||= []; state.cashConcepts.unshift(row); }
    persist();

    const remotePatch = {period, branch, type: cleanType, name: cleanName, active:false, source:row.source, removedAt:row.removedAt, removedBy:responsible, updatedAt:row.updatedAt, createdAt:row.createdAt, createdBy:row.createdBy, responsible};
    if (isFirebaseConfigured()) {
      try { await remoteUpdate("cashConcepts", id, remotePatch); }
      catch(e) { queueRemoteOp({kind:"update",collection:"cashConcepts",id,data:remotePatch}); }
      const latest = state.cashConcepts || [];
      state.cashConcepts = latest.map(x => x.id === id ? row : x);
      persist();
    }
    await audit("CASH_CONCEPT_REMOVE", "cashConcepts", id, old, row, responsible, "Baja de concepto de Caja diaria; los movimientos históricos se conservan", {branch,period,sector:"Caja"});
    return row;
  },
  cashConcepts(type, period, branch = "General") {
    if (!CASH_CONCEPT_TYPES.has(String(type || "")) || !isValidPeriod(period)) return [];
    const branches = branch === "General" ? CONFIG.branches : (validBranch(branch) ? [branch] : []);
    const base = type === "income" ? CONFIG.cashIncomeConcepts : type === "expense" ? CONFIG.cashExpenseConcepts : CONFIG.cashPaymentConcepts;
    const names = new Set();
    for (const b of branches) {
      const disabled = new Set((state.cashConcepts || [])
        .filter(x => x.period === period && x.branch === b && x.type === type && x.active === false)
        .map(x => sourceIdentity(x.name)));
      const candidates = [
        ...base,
        ...(state.cashConcepts || []).filter(x => x.period === period && x.branch === b && x.type === type && x.active !== false).map(x => x.name),
        ...active("cash").filter(x => x.period === period && x.branch === b && x.type === type).map(x => x.concept || (type === "payment" ? "Pagos" : "Sin concepto"))
      ];
      for (const value of candidates) {
        const cleanName = String(value || "").trim();
        if (!cleanName || disabled.has(sourceIdentity(cleanName))) continue;
        names.add(cleanName);
      }
    }
    return [...names];
  },
  isProtectedCashConcept,
  cashConceptId,

  async add(name, data, responsible, reason = "Alta manual", options = {}) {
    assertResponsible(responsible);
    const payload = {...(data || {})};
    if(name === "providers"){
      payload.master = true;
      payload.branchId = null;
      payload.branch = null;
      payload.periodId = null;
      payload.period = null;
      payload.excludedBranches = Array.isArray(payload.excludedBranches) ? payload.excludedBranches : [];
    }
    validateRecord(name, payload);
    if(!["files","audit","closures","settings"].includes(name)) assertOpen(payload, options.lateMovement, options);
    if (name === "hours") payload.period = payload.period || String(payload.date).slice(0,7);
    const id = uid();
    const row = decorate(payload, responsible, name === "tasks" ? (payload.status || "pending") : "active", id);
    if (!state[name]) state[name] = [];
    const wasClosed = !!(payload?.period && periodIsClosed(payload.period, payload.branch || "General"));
    state[name].unshift(row); persist();
    if (isRemoteCollection(name) && isFirebaseConfigured()) { try { await remoteAdd(name,row,id); } catch(e) { queueRemoteOp({kind:"add",collection:name,id,data:row}); } }
    await audit(options.lateMovement ? "CREATE_LATE" : "CREATE", name, id, null, row, responsible, reason, { lateMovement: !!options.lateMovement });
    if (options.lateMovement && wasClosed && payload?.period) await this.createClosureVersion(payload.period, payload.branch || "General", responsible, `Actualización por movimiento tardío en ${name}.`);
    return row;
  },
  async update(name, id, patch, responsible, reason = "Edición manual", options = {}) {
    assertResponsible(responsible);
    const old = this.get(name, id); if (!old) throw new Error("No se encontró el registro.");
    const row = {...old, ...(patch || {}), responsible, updatedAt: now()};
    if(name === "providers"){
      row.master = true;
      row.branchId = null;
      row.branch = null;
      row.periodId = null;
      row.period = null;
      row.excludedBranches = Array.isArray(row.excludedBranches) ? row.excludedBranches : [];
    }
    validateRecord(name, row, id);
    const wasClosed = !!(old.period && periodIsClosed(old.period, old.branch || "General"));
    if(!["files","audit","closures","settings"].includes(name)) assertOpen(old, options.lateMovement, options);
    state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isRemoteCollection(name) && isFirebaseConfigured()) {
      const remotePatch = name === "providers"
        ? {name:row.name, active:row.active!==false, master:true, branchId:null, branch:null, periodId:null, period:null, excludedBranches:row.excludedBranches}
        : (patch || {});
      try { await remoteUpdate(name,id,remotePatch); } catch(e) { queueRemoteOp({kind:"update",collection:name,id,data:remotePatch}); }
    }
    await audit(options.lateMovement ? "UPDATE_LATE" : "UPDATE", name, id, old, row, responsible, reason, { lateMovement: !!options.lateMovement });
    if (options.lateMovement && wasClosed && row.period) await this.createClosureVersion(row.period, row.branch || "General", responsible, `Actualización por corrección posterior en ${name}.`);
    return row;
  },
  async remove(name, id, responsible, reason = "Baja lógica", options = {}) {
    assertResponsible(responsible);
    if (name === "audit") throw new Error("La auditoría es permanente y no puede eliminarse.");
    const old = this.get(name, id); if (!old) return;
    // La baja lógica siempre debe estar disponible: incluso un movimiento de un
    // mes cerrado puede eliminarse y queda en Papelera. Si ese movimiento ya
    // pertenecía a un cierre, la eliminación genera una nueva versión del cierre.
    const wasClosed = !!(old.period && periodIsClosed(old.period, old.branch || "General"));
    const row = {...old, deleted: true, status: "deleted", deletedAt: now(), updatedAt: now(), responsible};
    state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isRemoteCollection(name) && isFirebaseConfigured()) { try { await remoteDelete(name,id); } catch(e) { queueRemoteOp({kind:"delete",collection:name,id}); } }
    await audit(wasClosed ? "DELETE_LATE" : "DELETE", name, id, old, row, responsible, reason, {lateMovement:wasClosed});
    if(wasClosed && !options.skipClosureVersion) await this.createClosureVersion(old.period,old.branch||"General",responsible,`Nueva versión por eliminación de ${sectorForCollection(name)}.`);
  },
  async removeEmployeeCascade(id,responsible,reason="Baja de empleado"){
    assertResponsible(responsible);
    const employee=this.get("employees",id);if(!employee)throw new Error("El empleado ya no está disponible.");
    const employeeNameKey=String(employee.name||'').trim().toLowerCase();const belongsToEmployee=row=>{if(String(row.employeeId||'')===String(id))return true;if(row.employeeId)return false;const legacyName=String(row.employee||row.employeeName||'').trim().toLowerCase();return !!employeeNameKey&&legacyName===employeeNameKey;};const related={hours:this.list("hours").filter(belongsToEmployee),employeeDebts:this.list("employeeDebts").filter(belongsToEmployee),liquidations:this.list("liquidations").filter(belongsToEmployee)};
    const affectedClosed=new Map();const markClosed=row=>{if(row?.period&&row?.branch&&periodIsClosed(row.period,row.branch))affectedClosed.set(`${row.period}|${row.branch}`,{period:row.period,branch:row.branch})};Object.values(related).flat().forEach(markClosed);
    const liqIds=new Set(related.liquidations.map(x=>x.id));const files=this.list("files").filter(f=>(f.sourceCollection==="liquidations"&&liqIds.has(f.sourceId))||f.employeeId===id||(!f.employeeId&&String(f.employeeName||'').trim().toLowerCase()===employeeNameKey));
    for(const row of related.hours)await this.remove("hours",row.id,responsible,`Eliminación en cascada por baja de ${employee.name}`,{skipClosureVersion:true});
    for(const row of related.employeeDebts)await this.remove("employeeDebts",row.id,responsible,`Eliminación en cascada por baja de ${employee.name}`,{skipClosureVersion:true,allowFutureDerived:true});
    for(const row of related.liquidations)await this.remove("liquidations",row.id,responsible,`Eliminación en cascada por baja de ${employee.name}`,{skipClosureVersion:true});
    for(const file of files)await this.remove("files",file.id,responsible,`Eliminación documental en cascada por baja de ${employee.name}`,{skipClosureVersion:true});
    await this.remove("employees",id,responsible,reason,{skipClosureVersion:true});
    for(const {period,branch} of affectedClosed.values())await this.createClosureVersion(period,branch,responsible,`Nueva versión por baja de empleado ${employee.name}.`);
    return {employee,removed:{hours:related.hours.length,employeeDebts:related.employeeDebts.length,liquidations:related.liquidations.length,files:files.length}};
  },
  async restore(name, id, responsible) {
    assertResponsible(responsible);
    if (name === "audit") throw new Error("La auditoría es permanente y no puede restaurarse ni eliminarse.");
    const old = this.getRaw(name, id); if (!old) return;
    const row = {...old, deleted: false, status: name === "invoices" ? "CARGADA" : (old.status === "deleted" ? "active" : old.status), restoredAt: now(), updatedAt: now(), responsible}; state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isRemoteCollection(name) && isFirebaseConfigured()) { try { await remoteUpdate(name,id,{deleted:false,status:row.status,restoredAt:row.restoredAt}); } catch(e) { queueRemoteOp({kind:"update",collection:name,id,data:{deleted:false,status:row.status,restoredAt:row.restoredAt}}); } }
    await audit("RESTORE", name, id, old, row, responsible, "Recuperación desde papelera");
    if(old.period && old.branch && periodIsClosed(old.period, old.branch) && !["providers","audit","files","closures","settings"].includes(name)) {
      await this.createClosureVersion(old.period, old.branch, responsible, `Nueva versión por restauración de ${sectorForCollection(name)}.`);
    }
  },
  async addLateMovement(name, data, responsible, reason) { return this.add(name, data, responsible, reason || "Movimiento tardío de período cerrado", { lateMovement: true }); },
  async upsertBySource(name, sourceKey, data, responsible, reason = "Sincronización Excel") {
    assertResponsible(responsible);
    const found = active(name).find(x => x.sourceKey === sourceKey);
    return found ? this.update(name, found.id, data, responsible, reason, { lateMovement: periodIsClosed(data.period, data.branch || "General") }) : this.add(name, {...data, sourceKey}, responsible, reason, { lateMovement: periodIsClosed(data.period, data.branch || "General") });
  },
  async createClosureVersion(period, branch, responsible, observations = "") {
    const previous = state.closures.filter(x=>x.period===period&&x.branch===branch&&x.status==="closed").sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
    if (!previous) return null;
    const version = Number(previous.version||1)+1;
    state.closures = state.closures.map(x=>x.id===previous.id?{...x,status:"superseded",supersededAt:now(),supersededBy:responsible}:x);
    const updated={id:uid(),period,version,branch,responsible,closedAt:now(),summary:this.summary(period,branch),observations:String(observations||""),status:"closed",previousVersion:previous.version,createdAt:now(),updatedAt:now(),createdBy:responsible,branchId:branch,periodId:period};
    state.closures.unshift(updated); persist();
    if(isFirebaseConfigured()) { try { await remoteUpdate("closures",previous.id,{status:"superseded",supersededAt:updated.closedAt,supersededBy:responsible}); await remoteAdd("closures",updated,updated.id); } catch(e) { queueRemoteOp({kind:"update",collection:"closures",id:previous.id,data:{status:"superseded",supersededAt:updated.closedAt,supersededBy:responsible}}); queueRemoteOp({kind:"add",collection:"closures",id:updated.id,data:updated}); } }
    await audit("CLOSE_VERSION_UPDATE","closures",updated.id,previous,updated,responsible,observations||"Nueva versión del cierre",{period,branch,version});
    return updated;
  },
  async setProviderBranchAvailability(id, branch, available, responsible) {
    assertResponsible(responsible);
    if(!CONFIG.branches.includes(branch)) throw new Error("Sucursal inválida.");
    const old=this.getRaw("providers",id); if(!old || old.deleted) throw new Error("No se encontró el proveedor.");
    const excluded=new Set(Array.isArray(old.excludedBranches)?old.excludedBranches:[]);
    if(available) excluded.delete(branch); else excluded.add(branch);
    const row={...old,excludedBranches:[...excluded],updatedAt:now()};
    state.providers=state.providers.map(x=>x.id===id?row:x); persist();
    if(isFirebaseConfigured()) { try { await remoteUpdate("providers",id,{excludedBranches:row.excludedBranches,updatedAt:row.updatedAt}); } catch(e) { queueRemoteOp({kind:"update",collection:"providers",id,data:{excludedBranches:row.excludedBranches,updatedAt:row.updatedAt}}); } }
    await audit(available?"PROVIDER_BRANCH_ENABLED":"PROVIDER_BRANCH_DISABLED","providers",id,old,row,responsible,available?`Proveedor habilitado en ${branch}`:`Proveedor ocultado de ${branch}`,{branch,sector:"Proveedores"});
    return row;
  },
  async addTask(data, responsible) { return this.add("tasks", data, responsible, "Creación de recordatorio"); },
  async completeTask(id, responsible) { return this.update("tasks", id, { status: "completed", completedAt: now(), completedBy: responsible }, responsible, "Tarea realizada"); },
  validateClosure(period, branch) {
    if(branch==='General') return {checklist:[],blockers:["El cierre mensual se realiza por sucursal; General es una vista consolidada."]};
    const s=this.summary(period,branch);
    const invoices=this.list('invoices',period,branch), expenses=this.list('expenses',period,branch), investments=this.list('investments',period,branch);
    const employees=this.list('employees').filter(e=>e.active!==false&&e.branch===branch);
    const hours=this.list('hours',period,branch);
    const liquidations=this.list('liquidations',period,branch);
    // Una factura cargada no implica pago ni vencimiento. Para cerrar el mes
    // solo se controla que el movimiento tenga proveedor, importe y sucursal.
    const missingInvoice=invoices.filter(x=>!x.provider||!Number.isFinite(Number(x.amount))||!x.branch);
    const late=invoices.filter(x=>String(x.loadDate||x.createdAt).slice(0,7)>period);
    const missingExpense=expenses.filter(x=>!x.category||!Number.isFinite(Number(x.amount))||!x.branch);
    const missingInvestment=investments.filter(x=>!x.concept||!Number.isFinite(Number(x.amount))||!x.branch);
    const noHours=employees.filter(e=>!hours.some(h=>h.employeeId===e.id));
    const noLiquidation=employees.filter(e=>hours.some(h=>h.employeeId===e.id)&&!liquidations.some(l=>l.employeeId===e.id));
    const closed=this.periodIsClosed(period,branch);
    const checklist=[
      ['Caja diaria',true,`${s.cashCount} movimientos · resto final ${money(s.cashFinal)}`,'cash'],
      ['Ingresos',true,`${this.list('cash',period,branch).filter(x=>x.type==='income').length} movimientos · ${money(s.income)}`,'cash'],
      ['Proveedores / facturas',true,`${s.invoiceCount} facturas registradas${missingInvoice.length?` · ${missingInvoice.length} con datos incompletos para revisar`:''} · sin control de pago`,'invoices'],
      ['Gastos del local',missingExpense.length===0,`${s.expenseCount} gastos · ${missingExpense.length?missingExpense.length+' requieren revisión':'controlados'}`,'expenses'],
      ['Inversiones',missingInvestment.length===0,`${s.investmentCount} inversiones · ${missingInvestment.length?missingInvestment.length+' requieren revisión':'controladas'}`,'investments'],
      ['Horas',noHours.length===0,`${number(s.hours)} horas · ${noHours.length?`Faltan horas para: ${noHours.map(e=>e.name).join(', ')}`:'carga registrada'}`,'hours'],
      ['Liquidaciones',noLiquidation.length===0,`${s.liquidationCount} liquidaciones vigentes · ${noLiquidation.length?`Falta liquidar: ${noLiquidation.map(e=>e.name).join(', ')}`:'sin pendientes'}`,'hours'],
      // Una carga posterior se informa como advertencia, pero no bloquea el cierre: el
      // sistema conserva la fecha de movimiento y la trazabilidad por separado.
      ['Facturas cargadas después del período',true,late.length?`${late.length} factura(s) cargada(s) posteriormente · revisar trazabilidad si corresponde`:'No se detectaron cargas posteriores','invoices'],
      ['Período abierto',!closed,closed?'Ya existe un cierre vigente':'Listo para cerrar','close']
    ];
    return {checklist,blockers:checklist.filter(x=>!x[1]).map(x=>`${x[0]}: ${x[2]}`)};
  },
  async closePeriod(period, next, responsible, summary, observations = "", checklist = []) {
    assertResponsible(responsible);
    const closeBranch = summary?.branch || "General";
    if (closeBranch === "General") throw new Error("El cierre mensual se realiza por sucursal. General es una vista consolidada y no se puede cerrar.");
    if (!CONFIG.branches.includes(closeBranch)) throw new Error("Perfil de sucursal inválido para el cierre.");
    if (periodIsClosed(period, closeBranch)) throw new Error("El período ya está cerrado para este perfil.");
    const validation=this.validateClosure(period,closeBranch);
    if(validation.blockers.length) throw new Error(`No se puede cerrar ${periodLabel(period)} en ${closeBranch}.\n\n${validation.blockers.map(x=>`• ${x}`).join('\n')}`);
    const fresh = this.summary(period, closeBranch);
    const finalChecklist=validation.checklist;
    const existing = state.closures.filter(x => x.period === period && x.branch === closeBranch).sort((a,b) => Number(b.version||0)-Number(a.version||0));
    const version = existing.length ? Number(existing[0].version||0)+1 : 1;
    if (!state.periods.some(x => x.id === period)) state.periods.push({ id: period, status: periodDefaultStatus(period), name: period, startedBranches: [], createdAt: now(), updatedAt: now() });
    if (!state.periods.some(x => x.id === next)) state.periods.push({ id: next, status: periodDefaultStatus(next), name: next, startedBranches: [], createdAt: now(), updatedAt: now() });
    const closure = { id: uid(), period, version, branch: closeBranch, branchId: closeBranch, periodId: period, responsible, createdBy: responsible, closedAt: now(), summary: fresh, observations: String(observations||"").trim(), checklist:finalChecklist, status:"closed", source:"manual_close", createdAt:now(), updatedAt:now() };
    state.closures.unshift(closure);
    state.periods=state.periods.map(x=>x.id===period?{...x,closedAt:closure.closedAt,closedBy:responsible,updatedAt:now()}:x);
    persist();
    if (isFirebaseConfigured()) { try { await remoteAdd("closures",closure,closure.id); } catch(e) { queueRemoteOp({kind:"add",collection:"closures",id:closure.id,data:closure}); } }
    await audit("CLOSE_PERIOD","closures",closure.id,null,closure,responsible,observations||"Cierre mensual confirmado",{period,branch:closeBranch,version});
    return closure;
  },
  async reopenPeriod(period, branch, responsible, reason) {
    assertResponsible(responsible);
    if (!String(reason||"").trim()) throw new Error("Reabrir requiere un motivo.");
    const closure = state.closures.filter(x=>x.period===period&&x.branch===branch&&x.status==="closed").sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
    if (!closure) throw new Error("El período no está cerrado para este perfil.");
    if(String(period)<CONTROL_START_PERIOD) throw new Error("Los meses anteriores a octubre de 2026 se mantienen cerrados; para corregirlos usá Modificar mes y su autorización.");
    const row={...closure,status:"reopened",reopenedAt:now(),reopenedBy:responsible,reopenReason:reason,updatedAt:now()}; state.closures=state.closures.map(x=>x.id===closure.id?row:x); state.periods=state.periods.map(x=>x.id===period?{...x,status:"open",updatedAt:now()}:x); persist();
    if(isFirebaseConfigured()) { try { await remoteUpdate("closures",closure.id,row); } catch(e) { queueRemoteOp({kind:"update",collection:"closures",id:closure.id,data:row}); } }
    await audit("REOPEN_PERIOD","closures",closure.id,closure,row,responsible,reason,{period,branch,version:closure.version}); return row;
  },
  summary(period, branch = "General") {
    const filter = rows => rows.filter(x => !x.deleted && (!branch || branch === "General" || x.branch === branch));
    const cash = filter(active("cash").filter(x=>x.period===period));
    const incomes = filter(active("incomes").filter(x=>x.period===period));
    const invoices = filter(active("invoices").filter(x=>x.period===period));
    const expenses = filter(active("expenses").filter(x=>x.period===period));
    const investments = filter(active("investments").filter(x=>x.period===period));
    const hours = filter(active("hours").filter(x=>x.period===period));
    const cashExpense = cash.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount||0),0);
    const cashPayment = cash.filter(x=>x.type==="payment").reduce((s,x)=>s+Number(x.amount||0),0);
    const cashIncome = cash.filter(x=>x.type==="income" && String(x.concept||"").trim().toLowerCase() !== "saldo día anterior" && String(x.concept||"").trim().toLowerCase() !== "saldo dia anterior").reduce((s,x)=>s+Number(x.amount||0),0);
    const income = cashIncome;
    const localExpense = expenses.reduce((s,x)=>s+Number(x.amount||0),0);
    const investment = investments.reduce((s,x)=>s+Number(x.amount||0),0);
    const providers = invoices.reduce((s,x)=>s+Number(x.amount||0),0);
    const liqsAll = filter(active("liquidations").filter(x=>x.period===period));
    const latestLiq = new Map();
    liqsAll.forEach(x=>{const key=x.employeeId||x.employee;const cur=latestLiq.get(key);if(!cur || String(x.updatedAt||x.createdAt)>String(cur.updatedAt||cur.createdAt)) latestLiq.set(key,x);});
    const latest = [...latestLiq.values()];
    // Personal representa el importe final de cada liquidación vigente, es decir,
    // el NETO luego de todos los descuentos. Si el resultado final es negativo,
    // no se contabiliza como gasto salarial negativo: ese importe vive como saldo
    // negativo/deuda del empleado. Al eliminar la liquidación, deja de computarse.
    const liquidationFinal = x => {
      const storedNet = Number(x?.net);
      if (Number.isFinite(storedNet)) return storedNet;
      return Number(x?.gross||0) - Number(x?.advance||0) - Number(x?.merchandise||0) - Number(x?.previousNegativeBalance||0);
    };
    const salary = latest.reduce((s,x)=>s+Math.max(0,liquidationFinal(x)),0);
    const totalExpenses = localExpense + providers + investment + salary;
    const result = income-totalExpenses;
    const cashOpening = Number(state.settings.find(x=>x.id===`cash-opening-${period}-${branch}`)?.amount||0);
    const cashExpected = cash.reduce((s,x)=>s+Number(x.expected||0),0);
    const cashFinal = cashOpening + cashIncome - cashExpense - cashPayment;
    const cashControl = cashExpected - cashFinal;
    return {period,branch,income,cashExpense,cashPayment,cashIncome,cashOpening,localExpense,investment,providers,salary,totalExpenses,result,cashCount:cash.length,invoiceCount:invoices.length,expenseCount:expenses.length,investmentCount:investments.length,hours:hours.reduce((s,x)=>s+Number(x.hours||0),0),cashExpected,cashFinal,cashControl,liquidationCount:latest.length};
  },
  async archiveFile(file) {
    const responsible = file.responsible || window.__blunnoResponsible || "";
    assertResponsible(responsible);
    const baseName = String(file.name || "documento-blunno.pdf");
    const siblings = active("files").filter(x=>x.sector===file.sector&&x.period===file.period&&x.branch===file.branch&&x.name===baseName);
    const nextVersion = Number(file.version || 0) || (siblings.reduce((m,x)=>Math.max(m,Number(x.version||1)),0)+1);
    const row = {
      id: uid(), ...file, name: baseName, version: nextVersion, responsible, createdBy: file.createdBy || responsible,
      branchId: file.branch || null, periodId: file.period || null, status: "active",
      storagePath: file.storagePath || `blunno/${String(file.period||'0000-00').slice(0,4)}/${String(file.period||'0000-00').slice(5,7)}/${String(file.branch||'General').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase()}/${String(file.sector||'documentos').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase()}/${baseName}`,
      deleted: false, createdAt: file.createdAt || now(), updatedAt: now()
    };
    if(file.blob){
      try{
        await vaultPut(row.id,file.blob);
        row.vaultKey=row.id;
      }catch(e){
        console.warn("Vault local",e);
        try{
          if(file.blob.size <= 1500000) row.dataUrl = await new Promise((resolve,reject)=>{
            const reader = new FileReader();
            reader.onload=()=>resolve(reader.result);
            reader.onerror=reject;
            reader.readAsDataURL(file.blob);
          });
        }catch(_){}
      }
      delete row.blob;
    }
    state.files.unshift(row);
    persist();
    // El binario y su ficha documental permanecen locales por computadora. La auditoría sí se sincroniza.
    await audit("FILE_ARCHIVED","files",row.id,null,row,responsible,"Documento archivado en Archivos",{
      sector: row.sector || "Documento",
      period: row.period || "",
      branch: row.branch || "General"
    });
    return row;
  },
  async getFileBlob(id) {
    const row=this.get("files",id); if(!row) return null;
    if(row.url){ try{ const res=await fetch(row.url); if(res.ok) return res.blob(); }catch(e){ console.warn("Storage recovery",e); } }
    if(row.vaultKey){ const local=await vaultGet(row.vaultKey); if(local) return local; }
    if(row.dataUrl){ try{ const res=await fetch(row.dataUrl); if(res.ok) return res.blob(); }catch(e){ console.warn("Data URL recovery",e); } }
    return null;
  },
  async restoreFileBlob(id, blob, responsible) {
    assertResponsible(responsible);
    if(!(blob instanceof Blob)) throw new Error("El archivo del backup no es válido.");
    const row=this.getRaw("files",id); if(!row) throw new Error("No se encontró la ficha documental del archivo.");
    await vaultPut(id, blob);
    const next={...row,vaultKey:id,deleted:false,status:row.status==='deleted'?'active':row.status,updatedAt:now(),responsible};
    state.files=state.files.map(x=>x.id===id?next:x); persist();
    await audit("FILE_RESTORED_FROM_BACKUP","files",id,row,next,responsible,"Archivo binario restaurado desde backup");
    return next;
  },
  latestChangeAt(period, branch, sourceCollection = null) {
    const rows = (state.audit||[]).filter(x => x.period === period && (!branch || x.branch === branch) && x.collection !== "files" && (!sourceCollection || x.collection === sourceCollection));
    return rows.reduce((latest,x) => !latest || String(x.at)>String(latest.at) ? x : latest, null);
  },
  fileIntegrity(file) {
    const source = this.latestChangeAt(file.period,file.branch,file.sourceCollection||null);
    if (!source || !file.createdAt) return {status:"sin-control",detail:"No hay una modificación de origen comparable."};
    return String(source.at) > String(file.createdAt) ? {status:"anterior",detail:`El origen cambió después de generar el documento (${source.action}).`} : {status:"ok",detail:"El documento fue generado después de la última modificación de origen registrada."};
  },
  async recordAudit(action, collection, before, after, responsible, reason, meta={}) { assertResponsible(responsible); return audit(action, collection, uid(), before, after, responsible, reason, meta); },
  async sync() { try { await syncRemote(); await subscribeRealtime(); } catch(e) { console.warn("Firebase no disponible; BLUNNO continúa en local y reintentará la sincronización.",e); } },
  async flushPendingSync() { try { await ensureAnonymousAuth(); await flushOutbox(); await subscribeRealtime(); } catch(e) { console.warn("Reintento Firebase",e); } },
  get pendingSyncCount(){ return outboxSize(); },
  get firebaseUid(){ return getFirebaseUid(); },
  exportJsonBlob() { return new Blob([JSON.stringify(state, null, 2)], {type:"application/json"}); },
  exportJson() {
    const blob=this.exportJsonBlob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`BLUNNO_BACKUP_${today()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),800);
  },
  async importState(obj, responsible) {
    assertResponsible(responsible);
    if (!obj || typeof obj !== "object") throw new Error("El backup no tiene un formato válido.");
    const before=JSON.parse(JSON.stringify(state));
    const next={...empty(),...obj};
    next.providers=Array.isArray(next.providers)?next.providers:[];
    next.employees=Array.isArray(next.employees)?next.employees:[];
    state=ensureProviderCatalog(next);
    if(!state.periods.length)state.periods=[{id:CONFIG.defaultPeriod,status:"open",name:CONFIG.defaultPeriod,createdAt:now(),updatedAt:now()}];
    const after=JSON.parse(JSON.stringify(state));
    persist();
    if(isFirebaseConfigured()) { const rows=[]; for(const name of REMOTE_COLLECTIONS) for(const row of (state[name]||[])) rows.push({name,id:row.id,data:row}); try { await remoteBatchSet(rows); } catch(e) { for(const r of rows) queueRemoteOp({kind:"add",collection:r.name,id:r.id,data:r.data}); } }
    await audit("IMPORT_STATE","system","backup",before,after,responsible,"Restauración de backup");
  }
};



export { Store, CONTROL_START_PERIOD, periodIsFuture, periodIsStarted, periodStateLabel, isValidPeriod, assertResponsible, periodEditConfirmed, setPeriodEditConfirmed, sourceIdentity, providerAvailableInBranch };
