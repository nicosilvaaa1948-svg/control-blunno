import { CONFIG, uid, isFirebaseConfigured } from "./config.js";
import {
  firebaseAuth, remoteList, remoteAdd, remoteUpdate, remoteDelete, remoteAudit
} from "./firebase.js";

const KEY = "blunno-control-v3";
const collections = ["periods","providers","invoices","cash","employees","hours","audit","imports","closures","settings"];

const emptyState = () => Object.fromEntries(collections.map(c => [c, []]));

const seed = () => {
  const s = emptyState();
  s.periods.push({ id: CONFIG.defaultPeriod, status: "open", name: CONFIG.defaultPeriod });
  return s;
};

let state = load();
let remoteMode = isFirebaseConfigured;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : seed();
  } catch { return seed(); }
}

function persist() { localStorage.setItem(KEY, JSON.stringify(state)); }

const active = (name) => (state[name] || []).filter(x => !x.deleted);
const now = () => new Date().toISOString();

function actor() {
  return firebaseAuth?.currentUser?.email || "Usuario local";
}

function periodIsClosed(period) {
  return state.periods.find(p => p.id === period)?.status === "closed";
}

async function audit(action, collection, id, before, after, reason = "") {
  const row = {
    id: uid(), action, collection, recordId: id,
    before: before || null, after: after || null, reason,
    actor: actor(), at: now()
  };
  state.audit.unshift(row);
  persist();
  if (remoteMode) await remoteAudit(row);
}

async function hydrateRemote() {
  if (!remoteMode) return;
  for (const name of collections) {
    try {
      const rows = await remoteList(name);
      if (rows.length || name === "periods") state[name] = rows;
    } catch (e) {
      console.warn(`No se pudo sincronizar ${name}`, e);
    }
  }
  if (!state.periods.length) state.periods = seed().periods;
  persist();
}

export const Store = {
  get mode() { return remoteMode ? "firebase" : "local"; },
  get db() { return state; },
  setPeriod(period) {
    if (!state.periods.some(p => p.id === period)) {
      state.periods.push({ id: period, status: "open", name: period });
      persist();
    }
  },
  get(name, id) { return state[name]?.find(x => x.id === id && !x.deleted) || null; },
  list(name, period = null) {
    let rows = active(name);
    if (period && ["invoices","cash","hours"].includes(name)) rows = rows.filter(x => x.period === period);
    return rows;
  },
  async add(name, data, reason = "Alta manual") {
    const period = data.period;
    if (period && periodIsClosed(period)) throw new Error("El período está cerrado. Reabrilo antes de modificarlo.");
    const id = uid();
    const row = { id, ...data, deleted: false, createdAt: now(), updatedAt: now() };
    state[name].unshift(row); persist();
    if (remoteMode) await remoteAdd(name, row, id);
    await audit("CREATE", name, id, null, row, reason);
    return row;
  },
  async update(name, id, patch, reason = "Edición manual") {
    const old = Store.get(name, id);
    if (!old) throw new Error("No se encontró el registro.");
    if (old.period && periodIsClosed(old.period)) throw new Error("El período está cerrado. No se puede editar.");
    const row = { ...old, ...patch, updatedAt: now() };
    state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (remoteMode) await remoteUpdate(name, id, patch);
    await audit("UPDATE", name, id, old, row, reason);
    return row;
  },
  async remove(name, id, reason = "Baja lógica") {
    const old = Store.get(name, id);
    if (!old) return;
    if (old.period && periodIsClosed(old.period)) throw new Error("El período está cerrado. No se puede dar de baja.");
    const row = { ...old, deleted: true, deletedAt: now(), updatedAt: now() };
    state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (remoteMode) await remoteDelete(name, id);
    await audit("DELETE", name, id, old, row, reason);
  },
  async restore(name, id) {
    const row = state[name]?.find(x => x.id === id);
    if (!row) return;
    const restored = { ...row, deleted: false, restoredAt: now(), updatedAt: now() };
    state[name] = state[name].map(x => x.id === id ? restored : x); persist();
    if (remoteMode) await remoteUpdate(name, id, { deleted: false, restoredAt: restored.restoredAt });
    await audit("RESTORE", name, id, row, restored, "Recuperación desde papelera");
  },
  async closePeriod(period, next) {
    const p = state.periods.find(x => x.id === period) || { id: period };
    const closed = { ...p, status: "closed", closedAt: now(), closedBy: actor() };
    state.periods = state.periods.filter(x => x.id !== period);
    state.periods.push(closed);
    if (!state.periods.some(x => x.id === next)) state.periods.push({ id: next, status: "open", name: next });
    persist();
    if (remoteMode) {
      await remoteUpdate("periods", period, { status: "closed", closedAt: closed.closedAt, closedBy: closed.closedBy });
      await remoteAdd("periods", { id: next, status: "open", name: next }, next);
    }
    await audit("CLOSE_PERIOD", "periods", period, p, closed, `Apertura de ${next}`);
  },
  exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `blunno-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(a.href);
  },
  async sync() { await hydrateRemote(); },
  periodIsClosed
};
