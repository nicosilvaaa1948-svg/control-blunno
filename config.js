export const CONFIG = {
  companyName: "Distribuidora Blunno",
  locale: "es-AR",
  currency: "ARS",
  defaultPeriod: "2026-09",
  branches: ["Mendiolaza", "Bodereau", "Derqui", "Unquillo"],
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
export const money = v => new Intl.NumberFormat(CONFIG.locale,{style:"currency",currency:CONFIG.currency,maximumFractionDigits:0}).format(Number(v||0));
export const number = v => new Intl.NumberFormat(CONFIG.locale,{maximumFractionDigits:2}).format(Number(v||0));
export const dateLabel = v => { if(!v)return "—"; const d=new Date(`${String(v).slice(0,10)}T12:00:00`); return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString(CONFIG.locale); };
export const dateTimeLabel = v => { if(!v)return "—"; const d=v?.toDate?v.toDate():new Date(v); return Number.isNaN(d.getTime())?String(v):d.toLocaleString(CONFIG.locale,{dateStyle:"short",timeStyle:"short"}); };
export const periodLabel = p => { const [y,m]=String(p).split("-").map(Number); if(!y||!m)return p; return new Date(y,m-1,1).toLocaleDateString(CONFIG.locale,{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase()); };
export const nextPeriod = p => { const [y,m]=p.split("-").map(Number); return `${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,"0")}`; };
export const prevPeriod = p => { const [y,m]=p.split("-").map(Number); return `${m===1?y-1:y}-${String(m===1?12:m-1).padStart(2,"0")}`; };
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const today = () => new Date().toISOString().slice(0,10);
