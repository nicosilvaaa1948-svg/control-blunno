import { CONFIG, uid, isFirebaseConfigured, today, now, nextPeriod } from "./config.js";
import { firebaseAuth, remoteList, remoteAdd, remoteUpdate, remoteDelete, remotePurge, remoteAudit } from "./firebase.js";

const KEY = "blunno-control-v13-final";
const collections = [
  "periods", "providers", "incomes", "invoices", "cash", "expenses", "investments", "employees", "hours",
  "employeeDebts", "liquidations", "tasks", "closures", "files", "imports", "audit", "settings", "agentChats"
];
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
const seed = () => {
  const s = empty();
  s.periods.push({ id: CONFIG.defaultPeriod, status: "open", name: CONFIG.defaultPeriod, createdAt: now() });
  s.incomes = [];
  providerSeeds.forEach(name => s.providers.push({ id: uid(), name, active: true, master: true, status:"active", deleted:false, createdBy:"Sistema", createdAt: now(), updatedAt: now() }));
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
  const existingKeys = new Set(cleaned.map(x => providerKey(x.name)));
  for (const name of providerSeeds) {
    const key = providerKey(name);
    if (!existingKeys.has(key)) {
      cleaned.push({ id: uid(), name, active: true, master: true, status:"active", deleted:false, createdBy:"Sistema", createdAt: now(), updatedAt: now() });
      existingKeys.add(key);
    }
  }
  data.providers = cleaned;
  return data;
};

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    let merged = { ...empty(), ...parsed };
    merged = ensureProviderCatalog(merged);
    if (!merged.periods.length) merged.periods = seed().periods;
    if (!merged.providers.length) merged.providers = seed().providers;
    // V10 comienza limpia para no arrastrar movimientos de prueba de versiones anteriores.
    merged.employees = merged.employees
      .filter(e => !(e.createdBy === "Sistema" && e.master === true))
      .map(e => ({...e, branchId: e.branchId || e.branch || null}));
    localStorage.setItem(KEY, JSON.stringify(merged));
    return merged;
  } catch { return seed(); }
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

const slugPath = value => String(value||'general').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'general';
const storagePathFor = (period,branch,sector,fileName) => { const [y,m]=String(period||'0000-00').split('-'); return `blunno/${y}/${m}/${slugPath(branch)}/${slugPath(sector)}/${fileName}`; };

const actor = () => firebaseAuth?.currentUser?.email || window.__blunnoResponsible || "Usuario local";
const periodIsClosed = (p, branch="General") => state.closures.some(x => x.period === p && x.branch === branch && x.status === "closed");
const assertResponsible = name => {
  const value = String(name || "").trim();
  if (!value) throw new Error("Seleccioná el responsable antes de guardar.");
  if (!CONFIG.responsiblePeople.includes(value)) throw new Error("El responsable no es válido. Elegí Agus, Nico, Luz o Flor.");
};
const branchMatches = (row, branch) => !branch || branch === "General" || row.branch === branch;

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
const validResponsible = name => CONFIG.responsiblePeople.includes(String(name || "").trim());
const validBranch = name => concreteBranches.has(String(name || ""));
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
const sectorForCollection = collection => ({incomes:"Ingresos",invoices:"Facturas",cash:"Caja",expenses:"Gastos",investments:"Inversiones",employees:"Personal",hours:"Horas",employeeDebts:"Personal",liquidations:"Liquidaciones",tasks:"Recordatorios",closures:"Cierre mensual",providers:"Proveedores",files:"Archivos",audit:"Auditoría",settings:"Configuración",imports:"Importación",agentChats:"Agente BLUNNO"}[collection] || collection);
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
    row.period = String(row.operationDate).slice(0,7);
  }
  if (["incomes","expenses","investments"].includes(collection) && (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0)) throw new Error("Ingresá un importe válido.");
  if (collection === "cash" && (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0)) throw new Error("Ingresá un importe de caja válido.");
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
  branchId: data.branchId || data.branch || null,
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
  if (isFirebaseConfigured()) await remoteAudit(row);
  return row;
}
async function syncRemote() {
  if (!isFirebaseConfigured()) return;
  for (const n of collections) {
    try {
      const rows = await remoteList(n);
      if (rows.length || n === "periods") state[n] = rows;
    } catch (e) { console.warn("Sync", n, e); }
  }
  if (!state.periods.length) state.periods = seed().periods;
  persist();
}

function assertOpen(data, allowLate = false) {
  if (data?.period && periodIsClosed(data.period, data.branch || "General") && !allowLate) throw new Error("El período está cerrado para esta sucursal. Para un movimiento tardío activá la opción correspondiente.");
}

export const Store = {
  get mode() { return isFirebaseConfigured() ? "firebase" : "local"; },
  get db() { return state; },
  list(name, period = null, branch = null) {
    let rows = active(name);
    if (period && ["incomes", "cash", "hours", "invoices", "expenses", "investments", "employeeDebts", "liquidations", "tasks", "closures"].includes(name)) rows = rows.filter(x => x.period === period);
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
    if (isFirebaseConfigured()) await remotePurge(name, id);
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
  setPeriod(p) {
    if (!/^\d{4}-\d{2}$/.test(p)) throw new Error("Período inválido.");
    if (!state.periods.some(x => x.id === p)) { state.periods.push({ id: p, status: "open", name: p, createdAt: now() }); persist(); }
  },
  async add(name, data, responsible, reason = "Alta manual", options = {}) {
    assertResponsible(responsible);
    const payload = {...(data || {})};
    validateRecord(name, payload);
    if(!["files","audit","closures","settings","agentChats"].includes(name)) assertOpen(payload, options.lateMovement);
    if (name === "hours") payload.period = payload.period || String(payload.date).slice(0,7);
    const id = uid();
    const row = decorate(payload, responsible, name === "tasks" ? (payload.status || "pending") : "active", id);
    if (!state[name]) state[name] = [];
    const wasClosed = !!(payload?.period && periodIsClosed(payload.period, payload.branch || "General"));
    state[name].unshift(row); persist();
    if (isFirebaseConfigured()) await remoteAdd(name, row, id);
    await audit(options.lateMovement ? "CREATE_LATE" : "CREATE", name, id, null, row, responsible, reason, { lateMovement: !!options.lateMovement });
    if (options.lateMovement && wasClosed && payload?.period) await this.createClosureVersion(payload.period, payload.branch || "General", responsible, `Actualización por movimiento tardío en ${name}.`);
    return row;
  },
  async update(name, id, patch, responsible, reason = "Edición manual", options = {}) {
    assertResponsible(responsible);
    const old = this.get(name, id); if (!old) throw new Error("No se encontró el registro.");
    const row = {...old, ...(patch || {}), responsible, updatedAt: now()};
    validateRecord(name, row, id);
    const wasClosed = !!(old.period && periodIsClosed(old.period, old.branch || "General"));
    if(!["files","audit","closures","settings","agentChats"].includes(name)) assertOpen(old, options.lateMovement);
    state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteUpdate(name, id, patch || {});
    await audit(options.lateMovement ? "UPDATE_LATE" : "UPDATE", name, id, old, row, responsible, reason, { lateMovement: !!options.lateMovement });
    if (options.lateMovement && wasClosed && row.period) await this.createClosureVersion(row.period, row.branch || "General", responsible, `Actualización por corrección posterior en ${name}.`);
    return row;
  },
  async remove(name, id, responsible, reason = "Baja lógica", options = {}) {
    assertResponsible(responsible);
    if (name === "audit") throw new Error("La auditoría es permanente y no puede eliminarse.");
    const old = this.get(name, id); if (!old) return;
    if(!["files","closures","settings","agentChats"].includes(name)) assertOpen(old, options.lateMovement);
    const row = {...old, deleted: true, status: "deleted", deletedAt: now(), updatedAt: now(), responsible};
    state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteDelete(name, id);
    await audit("DELETE", name, id, old, row, responsible, reason);
  },
  async restore(name, id, responsible) {
    assertResponsible(responsible);
    if (name === "audit") throw new Error("La auditoría es permanente y no puede restaurarse ni eliminarse.");
    const old = this.getRaw(name, id); if (!old) return;
    const row = {...old, deleted: false, status: name === "invoices" ? "CARGADA" : (old.status === "deleted" ? "active" : old.status), restoredAt: now(), updatedAt: now(), responsible}; state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteUpdate(name, id, {deleted: false, status: row.status, restoredAt: row.restoredAt});
    await audit("RESTORE", name, id, old, row, responsible, "Recuperación desde papelera");
    if(old.period && old.branch && periodIsClosed(old.period, old.branch) && !["providers","audit","files","closures","settings","agentChats"].includes(name)) {
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
    if(isFirebaseConfigured()) { await remoteUpdate("closures",previous.id,{status:"superseded",supersededAt:updated.closedAt,supersededBy:responsible}); await remoteAdd("closures",updated,updated.id); }
    await audit("CLOSE_VERSION_UPDATE","closures",updated.id,previous,updated,responsible,observations||"Nueva versión del cierre",{period,branch,version});
    return updated;
  },
  async addTask(data, responsible) { return this.add("tasks", data, responsible, "Creación de recordatorio"); },
  async completeTask(id, responsible) { return this.update("tasks", id, { status: "completed", completedAt: now(), completedBy: responsible }, responsible, "Tarea realizada"); },
  async closePeriod(period, next, responsible, summary, observations = "", checklist = []) {
    assertResponsible(responsible);
    const closeBranch = summary?.branch || "General";
    if (closeBranch === "General") throw new Error("El cierre mensual se realiza por sucursal. General es una vista consolidada y no se puede cerrar.");
    if (!CONFIG.branches.includes(closeBranch)) throw new Error("Perfil de sucursal inválido para el cierre.");
    if (periodIsClosed(period, closeBranch)) throw new Error("El período ya está cerrado para este perfil.");
    const fresh = this.summary(period, closeBranch);
    const existing = state.closures.filter(x => x.period === period && x.branch === closeBranch).sort((a,b) => Number(b.version||0)-Number(a.version||0));
    const version = existing.length ? Number(existing[0].version||0)+1 : 1;
    if (!state.periods.some(x => x.id === period)) state.periods.push({ id: period, status: "open", name: period, createdAt: now(), updatedAt: now() });
    if (!state.periods.some(x => x.id === next)) state.periods.push({ id: next, status: "open", name: next, createdAt: now(), updatedAt: now() });
    const closure = { id: uid(), period, version, branch: closeBranch, branchId: closeBranch, periodId: period, responsible, createdBy: responsible, closedAt: now(), summary: fresh, observations: String(observations||"").trim(), checklist, status:"closed", source:"manual_close", createdAt:now(), updatedAt:now() };
    state.closures.unshift(closure); persist();
    if (isFirebaseConfigured()) { await remoteAdd("closures", closure, closure.id); }
    await audit("CLOSE_PERIOD","closures",closure.id,null,closure,responsible,observations||"Cierre mensual confirmado",{period,branch:closeBranch,version});
    return closure;
  },
  async reopenPeriod(period, branch, responsible, reason) {
    assertResponsible(responsible);
    if (!String(reason||"").trim()) throw new Error("Reabrir requiere un motivo.");
    const closure = state.closures.filter(x=>x.period===period&&x.branch===branch&&x.status==="closed").sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
    if (!closure) throw new Error("El período no está cerrado para este perfil.");
    const row={...closure,status:"reopened",reopenedAt:now(),reopenedBy:responsible,reopenReason:reason,updatedAt:now()}; state.closures=state.closures.map(x=>x.id===closure.id?row:x); persist();
    if(isFirebaseConfigured()) await remoteUpdate("closures",closure.id,row);
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
    const income = incomes.reduce((s,x)=>s+Number(x.amount||0),0);
    const cashExpense = cash.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount||0),0);
    const cashPayment = cash.filter(x=>x.type==="payment").reduce((s,x)=>s+Number(x.amount||0),0);
    const cashIncome = cash.filter(x=>x.type==="income" && String(x.concept||"").trim().toLowerCase() !== "saldo día anterior" && String(x.concept||"").trim().toLowerCase() !== "saldo dia anterior").reduce((s,x)=>s+Number(x.amount||0),0);
    const localExpense = expenses.reduce((s,x)=>s+Number(x.amount||0),0);
    const investment = investments.reduce((s,x)=>s+Number(x.amount||0),0);
    const providers = invoices.reduce((s,x)=>s+Number(x.amount||0),0);
    const liqsAll = filter(active("liquidations").filter(x=>x.period===period));
    const latestLiq = new Map();
    liqsAll.forEach(x=>{const key=x.employeeId||x.employee;const cur=latestLiq.get(key);if(!cur || String(x.updatedAt||x.createdAt)>String(cur.updatedAt||cur.createdAt)) latestLiq.set(key,x);});
    const latest = [...latestLiq.values()];
    const salary = latest.length ? latest.reduce((s,x)=>s+Number(x.gross||0),0) : hours.reduce((s,x)=>s+Number(x.salaryCost||0),0);
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
      storagePath: file.storagePath || storagePathFor(file.period,file.branch,file.sector,baseName),
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
    if (isFirebaseConfigured()) await remoteAdd("files", row, row.id);
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
  async sync() { await syncRemote(); },
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
    await audit("IMPORT_STATE","system","backup",before,after,responsible,"Restauración de backup");
  }
};
