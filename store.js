import { CONFIG, uid, isFirebaseConfigured, today, now, nextPeriod } from "./config.js";
import { firebaseAuth, remoteList, remoteAdd, remoteUpdate, remoteDelete, remoteAudit } from "./firebase.js";

const KEY = "blunno-control-v8";
const collections = [
  "periods", "providers", "invoices", "cash", "expenses", "investments", "employees", "hours",
  "employeeDebts", "liquidations", "tasks", "closures", "files", "imports", "audit", "settings"
];
const providerSeeds = [
  "Aguilera", "Alimentar", "Argentina Distrib.", "B-Burger", "Bacha", "Ballichoc", "Bauton", "Bettini", "Bimbo", "Bonaditos",
  "C.C.U.", "Campi", "CAP", "Cigarillos", "Condimentos", "Córdoba Drinks", "Danal Pasta", "Don Apolo", "Don Yeyo", "El Club del 21",
  "Empanadas", "Fini USA", "Galiana", "Golosina", "La Serenísima", "Lácteos", "Mastellone", "Molinos", "Paladini", "Pehuamar",
  "Sancor", "Unilever", "Vea", "Otros"
];
const employeeSeeds = ["AGUS C.", "NICO", "LUCAS", "ALEXIS", "FRANCO", "FER", "MACA", "FLOR", "IVÒN", "VALENTINA", "JOACO", "AGUS . 1"];

const empty = () => Object.fromEntries(collections.map(c => [c, []]));
const seed = () => {
  const s = empty();
  s.periods.push({ id: CONFIG.defaultPeriod, status: "open", name: CONFIG.defaultPeriod, createdAt: now() });
  providerSeeds.forEach(name => s.providers.push({ id: uid(), name, active: true, master: true, createdAt: now(), updatedAt: now() }));
  employeeSeeds.forEach(name => s.employees.push({ id: uid(), name, branch: "Sin asignar", role: "", hourlyRate: 0, active: true, master: true, createdAt: now(), updatedAt: now() }));
  s.settings.push({ id: "ui", branch: "General", responsible: "", period: CONFIG.defaultPeriod });
  return s;
};

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem("blunno-control-v5");
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    const merged = { ...empty(), ...parsed };
    if (!merged.periods.length) merged.periods = seed().periods;
    if (!merged.providers.length) merged.providers = seed().providers;
    if (!merged.employees.length) merged.employees = seed().employees;
    // Migración suave desde la versión anterior: conserva los datos existentes y agrega las nuevas colecciones.
    if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(merged));
    return merged;
  } catch { return seed(); }
}
const persist = () => localStorage.setItem(KEY, JSON.stringify(state));
const active = name => (state[name] || []).filter(x => !x.deleted);
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
    const names = name ? [name] : collections;
    return names.flatMap(n => (state[n] || []).filter(x => x.deleted).map(x => ({ ...x, _collection: n })));
  },
  get(name, id) { return (state[name] || []).find(x => x.id === id && !x.deleted) || null; },
  getRaw(name, id) { return (state[name] || []).find(x => x.id === id) || null; },
  periodIsClosed,
  setPeriod(p) {
    if (!/^\d{4}-\d{2}$/.test(p)) throw new Error("Período inválido.");
    if (!state.periods.some(x => x.id === p)) { state.periods.push({ id: p, status: "open", name: p, createdAt: now() }); persist(); }
  },
  async add(name, data, responsible, reason = "Alta manual", options = {}) {
    assertResponsible(responsible); assertOpen(data, options.lateMovement);
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
    assertOpen(old, options.lateMovement);
    const row = { ...old, ...patch, responsible, updatedAt: now() }; state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteUpdate(name, id, patch);
    await audit("UPDATE", name, id, old, row, responsible, reason, { lateMovement: !!options.lateMovement });
    return row;
  },
  async remove(name, id, responsible, reason = "Baja lógica") {
    assertResponsible(responsible); const old = this.get(name, id); if (!old) return;
    assertOpen(old);
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
  async closePeriod(period, next, responsible, summary, observations = "") {
    assertResponsible(responsible); const closeBranch = summary.branch || "General"; if (periodIsClosed(period, closeBranch)) throw new Error("El período ya está cerrado para este perfil.");
    const existing = state.closures.filter(x => x.period === period && x.branch === closeBranch).sort((a,b) => Number(b.version||0)-Number(a.version||0));
    const version = existing.length + 1;
    const p = state.periods.find(x => x.id === period) || { id: period, status: "open" };
    if (!state.periods.some(x => x.id === next)) state.periods.push({ id: next, status: "open", name: next, createdAt: now() });
    const closure = { id: uid(), period, version, branch: closeBranch, responsible, closedAt: now(), summary, observations, status: "closed" };
    state.closures.unshift(closure); persist();
    if (isFirebaseConfigured()) { await remoteAdd("periods", p, period); await remoteAdd("periods", { id: next, status: "open", name: next, createdAt: now() }, next); await remoteAdd("closures", closure, closure.id); }
    await audit("CLOSE_PERIOD", "closures", closure.id, null, closure, responsible, observations || "Cierre mensual");
    return closure;
  },
  async reopenPeriod(period, branch, responsible, reason) {
    assertResponsible(responsible); if (!String(reason || "").trim()) throw new Error("Reabrir requiere un motivo.");
    const closure = state.closures.find(x => x.period === period && x.branch === branch && x.status === "closed"); if (!closure) throw new Error("El período no está cerrado para este perfil.");
    const row = { ...closure, status: "reopened", reopenedAt: now(), reopenedBy: responsible, reopenReason: reason }; state.closures = state.closures.map(x => x.id === closure.id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteUpdate("closures", closure.id, row);
    await audit("REOPEN_PERIOD", "closures", closure.id, closure, row, responsible, reason); return row;
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
    const salary = hours.reduce((s,x)=>s+Number(x.salaryCost||0),0);
    const totalExpenses = cashExpense + localExpense + investment + salary;
    return { period, branch, income, cashExpense, localExpense, investment, providers, paidProviders, salary, totalExpenses, result: income-totalExpenses, cashCount:cash.length, invoiceCount:invoices.length, expenseCount:expenses.length, investmentCount:investments.length, hours:hours.reduce((s,x)=>s+Number(x.hours||0),0) };
  },
  async recordAudit(action, collection, before, after, responsible, reason, meta={}) { assertResponsible(responsible); return audit(action, collection, uid(), before, after, responsible, reason, meta); },
  async sync() { await syncRemote(); },
  exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `blunno-backup-${today()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
  },
  async importState(obj, responsible) { assertResponsible(responsible); const before = JSON.parse(JSON.stringify(state)); state = { ...empty(), ...obj }; persist(); await audit("IMPORT_STATE", "system", "backup", before, state, responsible, "Restauración de backup"); }
};
