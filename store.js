import { CONFIG, uid, isFirebaseConfigured, today, now, nextPeriod } from "./config.js";
import { firebaseAuth, remoteList, remoteAdd, remoteUpdate, remoteDelete, remotePurge, remoteAudit } from "./firebase.js";

const KEY = "blunno-control-v10";
const collections = [
  "periods", "providers", "invoices", "cash", "expenses", "investments", "employees", "hours",
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
const employeeSeeds = ["AGUS C.", "NICO", "LUCAS", "ALEXIS", "FRANCO", "FER", "MACA", "FLOR", "IVÒN", "VALENTINA", "JOACO", "AGUS . 1"];

const empty = () => Object.fromEntries(collections.map(c => [c, []]));
const seed = () => {
  const s = empty();
  s.periods.push({ id: CONFIG.defaultPeriod, status: "open", name: CONFIG.defaultPeriod, createdAt: now() });
  providerSeeds.forEach(name => s.providers.push({ id: uid(), name, active: true, master: true, createdAt: now(), updatedAt: now() }));
  employeeSeeds.forEach(name => s.employees.push({ id: uid(), name, branch: "Bodereau", role: "", hourlyRate: 0, active: true, master: true, createdAt: now(), updatedAt: now() }));
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
      cleaned.push({ id: uid(), name, active: true, master: true, createdAt: now(), updatedAt: now() });
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
    if (!merged.employees.length) merged.employees = seed().employees;
    // V10 comienza limpia para no arrastrar movimientos de prueba de versiones anteriores.
    merged.employees = merged.employees.map(e => ({...e, branch: e.branch === "Sin asignar" ? "Bodereau" : e.branch}));
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
      if (t && t <= cutoff) { changed = true; return false; }
      return true;
    });
    state[n] = keep;
  }
  if (changed) persist();
  return changed;
};
purgeExpiredTrash();
setInterval(purgeExpiredTrash, 60 * 60 * 1000);
const actor = () => firebaseAuth?.currentUser?.email || window.__blunnoResponsible || "Usuario local";
const periodIsClosed = (p, branch="General") => state.closures.some(x => x.period === p && x.branch === branch && x.status === "closed");
const assertResponsible = name => { if (!String(name || "").trim()) throw new Error("Seleccioná el responsable antes de guardar."); };
const branchMatches = (row, branch) => !branch || branch === "General" || row.branch === branch;

async function audit(action, collection, id, before, after, responsible, reason, meta = {}) {
  const row = {
    id: uid(), action, collection, recordId: id, before: before || null, after: after || null,
    responsible: responsible || actor(), actor: actor(), at: now(), reason: reason || "", ...meta
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
    if (period && ["cash", "hours", "invoices", "expenses", "investments", "employeeDebts", "liquidations", "tasks", "closures"].includes(name)) rows = rows.filter(x => x.period === period);
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
    assertResponsible(responsible); if(!["files","audit","closures","settings","agentChats"].includes(name)) assertOpen(data, options.lateMovement);
    const id = uid(), row = { id, ...data, responsible, deleted: false, createdAt: now(), updatedAt: now() };
    if (!state[name]) state[name] = [];
    const wasClosed = !!(data?.period && periodIsClosed(data.period, data.branch || "General"));
    state[name].unshift(row); persist();
    if (isFirebaseConfigured()) await remoteAdd(name, row, id);
    await audit(options.lateMovement ? "CREATE_LATE" : "CREATE", name, id, null, row, responsible, reason, { lateMovement: !!options.lateMovement });
    if (options.lateMovement && wasClosed && data?.period) {
      const closeBranch = data.branch || "General";
      const previous = state.closures.filter(x=>x.period===data.period && x.branch===closeBranch && x.status==="closed").sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
      if(previous){
        const superseded={...previous,status:"superseded",supersededAt:now(),supersededBy:responsible};
        state.closures=state.closures.map(x=>x.id===previous.id?superseded:x);
        const updated={id:uid(),period:data.period,version:Number(previous.version||1)+1,branch:closeBranch,responsible,closedAt:now(),summary:this.summary(data.period,closeBranch),observations:`Actualización automática por movimiento tardío en ${name}.`,status:"closed",previousVersion:previous.version};
        state.closures.unshift(updated); persist();
        if(isFirebaseConfigured()) await remoteUpdate("closures",previous.id,{status:"superseded",supersededAt:superseded.supersededAt,supersededBy:responsible});
        if(isFirebaseConfigured()) await remoteAdd("closures",updated,updated.id);
        await audit("CLOSE_VERSION_UPDATE","closures",updated.id,previous,updated,responsible,"Actualización automática por movimiento tardío");
      }
    }
    return row;
  },
  async update(name, id, patch, responsible, reason = "Edición manual", options = {}) {
    assertResponsible(responsible); const old = this.get(name, id); if (!old) throw new Error("No se encontró el registro.");
    if(!["files","audit","closures","settings","agentChats"].includes(name)) assertOpen(old, options.lateMovement);
    const row = { ...old, ...patch, responsible, updatedAt: now() }; state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteUpdate(name, id, patch);
    await audit("UPDATE", name, id, old, row, responsible, reason, { lateMovement: !!options.lateMovement });
    return row;
  },
  async remove(name, id, responsible, reason = "Baja lógica") {
    assertResponsible(responsible); const old = this.get(name, id); if (!old) return;
    if(!["files","audit","closures","settings","agentChats"].includes(name)) assertOpen(old);
    const row = { ...old, deleted: true, deletedAt: now(), updatedAt: now() }; state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteDelete(name, id);
    await audit("DELETE", name, id, old, row, responsible, reason);
  },
  async restore(name, id, responsible) {
    assertResponsible(responsible); const old = this.getRaw(name, id); if (!old) return;
    const row = { ...old, deleted: false, restoredAt: now(), updatedAt: now() }; state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteUpdate(name, id, { deleted: false, restoredAt: row.restoredAt });
    await audit("RESTORE", name, id, old, row, responsible, "Recuperación desde papelera");
  },
  async addLateMovement(name, data, responsible, reason) { return this.add(name, data, responsible, reason || "Movimiento tardío de período cerrado", { lateMovement: true }); },
  async upsertBySource(name, sourceKey, data, responsible, reason = "Sincronización Excel") {
    assertResponsible(responsible);
    const found = active(name).find(x => x.sourceKey === sourceKey);
    return found ? this.update(name, found.id, data, responsible, reason, { lateMovement: periodIsClosed(data.period, data.branch || "General") }) : this.add(name, { ...data, sourceKey }, responsible, reason, { lateMovement: periodIsClosed(data.period, data.branch || "General") });
  },
  async addTask(data, responsible) { return this.add("tasks", data, responsible, "Creación de recordatorio"); },
  async completeTask(id, responsible) { return this.update("tasks", id, { status: "completed", completedAt: now(), completedBy: responsible }, responsible, "Tarea realizada"); },
  async closePeriod(period, next, responsible, summary, observations = "", checklist = []) {
    assertResponsible(responsible);
    const closeBranch = summary?.branch || "General";
    if (periodIsClosed(period, closeBranch)) throw new Error("El período ya está cerrado para este perfil.");
    const fresh = this.summary(period, closeBranch);
    const existing = state.closures.filter(x => x.period === period && x.branch === closeBranch)
      .sort((a,b) => Number(b.version||0)-Number(a.version||0));
    const version = existing.length + 1;
    if (!state.periods.some(x => x.id === period)) state.periods.push({ id: period, status: "open", name: period, createdAt: now() });
    if (!state.periods.some(x => x.id === next)) state.periods.push({ id: next, status: "open", name: next, createdAt: now() });
    const closure = {
      id: uid(), period, version, branch: closeBranch, responsible, closedAt: now(),
      summary: fresh, observations: String(observations || "").trim(), checklist,
      status: "closed", source: "manual_close", createdAt: now()
    };
    state.closures.unshift(closure);
    state.periods = state.periods.map(x => x.id === period ? {...x, status:"closed", closedAt:closure.closedAt, closedVersion:version} : x);
    persist();
    if (isFirebaseConfigured()) {
      await remoteAdd("periods", state.periods.find(x=>x.id===period), period);
      await remoteAdd("periods", state.periods.find(x=>x.id===next), next);
      await remoteAdd("closures", closure, closure.id);
    }
    await audit("CLOSE_PERIOD", "closures", closure.id, null, closure, responsible, observations || "Cierre mensual confirmado", {period, branch:closeBranch, version});
    return closure;
  },
  async reopenPeriod(period, branch, responsible, reason) {
    assertResponsible(responsible);
    if (!String(reason || "").trim()) throw new Error("Reabrir requiere un motivo.");
    const closure = state.closures.filter(x => x.period === period && x.branch === branch && x.status === "closed")
      .sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
    if (!closure) throw new Error("El período no está cerrado para este perfil.");
    const row = {...closure, status:"reopened", reopenedAt:now(), reopenedBy:responsible, reopenReason:reason};
    state.closures = state.closures.map(x=>x.id===closure.id?row:x);
    state.periods = state.periods.map(x=>x.id===period?{...x,status:"open",reopenedAt:row.reopenedAt,reopenedBy:responsible}:x);
    persist();
    if(isFirebaseConfigured()){
      await remoteUpdate("closures",closure.id,row);
      await remoteUpdate("periods",period,{status:"open",reopenedAt:row.reopenedAt,reopenedBy:responsible});
    }
    await audit("REOPEN_PERIOD","closures",closure.id,closure,row,responsible,reason,{period,branch,version:closure.version});
    return row;
  },
  summary(period, branch = "General") {
    const filter = rows => rows.filter(x => !x.deleted && (!branch || branch === "General" || x.branch === branch));
    const cash = filter(active("cash").filter(x => x.period === period));
    const invoices = filter(active("invoices").filter(x => x.period === period));
    const expenses = filter(active("expenses").filter(x => x.period === period));
    const investments = filter(active("investments").filter(x => x.period === period));
    const hours = filter(active("hours").filter(x => x.period === period));
    const income = cash.filter(x => x.type === "income").reduce((s,x)=>s+Number(x.amount||0),0);
    const cashExpense = cash.filter(x => x.type === "expense").reduce((s,x)=>s+Number(x.amount||0),0);
    const localExpense = expenses.reduce((s,x)=>s+Number(x.amount||0),0);
    const investment = investments.reduce((s,x)=>s+Number(x.amount||0),0);
    const providers = invoices.reduce((s,x)=>s+Number(x.amount||0),0);
    const paidProviders = invoices.reduce((s,x)=>s+Number(x.paidAmount||0),0);
    const liqs = filter(active("liquidations").filter(x => x.period === period));
    const salary = liqs.length ? liqs.reduce((s,x)=>s+Number(x.gross||0),0) : hours.reduce((s,x)=>s+Number(x.salaryCost||0),0);
    const totalExpenses = cashExpense + localExpense + investment + salary;
    const cashExpected = cash.reduce((s,x)=>s+Number(x.expected||0),0);
    const cashControl = cashExpected - (income - cashExpense);
    return { period, branch, income, cashExpense, localExpense, investment, providers, paidProviders, salary,
      totalExpenses, result: income-totalExpenses, cashCount:cash.length, invoiceCount:invoices.length,
      expenseCount:expenses.length, investmentCount:investments.length, hours:hours.reduce((s,x)=>s+Number(x.hours||0),0),
      cashExpected, cashControl, liquidationCount:liqs.length };

  },
  async recordAudit(action, collection, before, after, responsible, reason, meta={}) { assertResponsible(responsible); return audit(action, collection, uid(), before, after, responsible, reason, meta); },
  async sync() { await syncRemote(); },
  exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `blunno-backup-${today()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
  },
  async importState(obj, responsible) { assertResponsible(responsible); const before = JSON.parse(JSON.stringify(state)); state = { ...empty(), ...obj }; persist(); await audit("IMPORT_STATE", "system", "backup", before, state, responsible, "Restauración de backup"); }
};
