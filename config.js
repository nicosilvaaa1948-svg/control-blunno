export const CONFIG = {
  companyName: "Distribuidora Blunno",
  locale: "es-AR",
  currency: "ARS",
  defaultPeriod: "2026-09",
  branches: ["Mendiolaza", "Bodereau", "Derqui", "Unquillo"],
  profiles: ["Mendiolaza", "Bodereau", "Derqui", "Unquillo", "General"],
  responsiblePeople: ["Agus", "Nico", "Luz", "Flor"],
  expenseCategories: [
    "Luz", "Alquiler", "Pinturería", "Refacciones", "Librería", "Agua",
    "Limpieza", "Descartable", "Meriendas", "Retenciones Banco", "Retenciones",
    "Desinfección", "Ferretería", "Otros gastos"
  ],
  cashIncomeConcepts: [
    "Saldo día anterior", "Caja Mendiolaza", "Caja Bodereau", "Caja Unquillo", "Caja Derqui",
    "Suarez", "Fer Maldonado", "Papá", "Juan", "Joa", "San Martín"
  ],
  cashExpenseConcepts: [
    "Gastos de caja"
  ],
  cashPaymentConcepts: [
    "Pagos"
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
  style: "currency", currency: CONFIG.currency, minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(Number.isFinite(Number(value)) ? Number(value) : 0);

export const number = value => new Intl.NumberFormat(CONFIG.locale, {
  maximumFractionDigits: 2
}).format(Number(value || 0));

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";
const partsInArgentina = value => Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: ARGENTINA_TZ, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23" }).formatToParts(value).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
export const localDate = () => { const p=partsInArgentina(new Date()); return `${p.year}-${p.month}-${p.day}`; };
export const now = () => { const d=new Date(); return d.toISOString(); };
export const argentinaNowLabel = value => { if(!value) return "—"; const p=partsInArgentina(value?.toDate?value.toDate():new Date(value)); return Number(p.year)?`${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`:"—"; }; 
export const today = localDate;
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const dateLabel = value => {
  if (!value) return "—";
  const raw=String(value).slice(0,10);
  const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(`${raw}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(CONFIG.locale,{timeZone:ARGENTINA_TZ});
};

export const dateTimeLabel = value => {
  if (!value) return "—";
  const d = value?.toDate ? value.toDate() : new Date(value);
  if(Number.isNaN(d.getTime())) return String(value);
  const p=partsInArgentina(d);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
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
