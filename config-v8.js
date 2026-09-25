export const CONFIG = {
  companyName: "Distribuidora Blunno",
  locale: "es-AR",
  currency: "ARS",
  defaultPeriod: "2026-09",
  branches: ["Mendiolaza", "Bodereau", "Derqui", "Unquillo"],
  profiles: ["Mendiolaza", "Bodereau", "Derqui", "Unquillo", "General"],
  responsiblePeople: ["Agus", "Nico", "Luz", "Flor"],
  expenseCategories: [
    "Empleados", "Luz", "Alquiler", "Pinturería", "Refacciones", "Librería", "Agua",
    "Limpieza", "Descartable", "Meriendas", "Retenciones Banco", "Retenciones",
    "Desinfección", "Ferretería", "Otros gastos"
  ],
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }
};

export const isFirebaseConfigured = () => Boolean(
  CONFIG.firebase.apiKey && CONFIG.firebase.projectId && CONFIG.firebase.appId
);

export const money = value => new Intl.NumberFormat(CONFIG.locale, {
  style: "currency", currency: CONFIG.currency, maximumFractionDigits: 0
}).format(Number(value || 0));

export const number = value => new Intl.NumberFormat(CONFIG.locale, {
  maximumFractionDigits: 2
}).format(Number(value || 0));

export const localDate = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const now = () => new Date().toISOString();
export const today = localDate;
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const dateLabel = value => {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(CONFIG.locale);
};

export const dateTimeLabel = value => {
  if (!value) return "—";
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(CONFIG.locale, { dateStyle: "short", timeStyle: "short" });
};

export const periodLabel = period => {
  const [y, m] = String(period).split("-").map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString(CONFIG.locale, { month: "long", year: "numeric" })
    .replace(/^./, c => c.toUpperCase());
};

export const nextPeriod = period => {
  const [y, m] = period.split("-").map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
};

export const prevPeriod = period => {
  const [y, m] = period.split("-").map(Number);
  return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
};

export const daysInPeriod = period => {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

export const isoDate = (period, day) => `${period}-${String(day).padStart(2, "0")}`;
