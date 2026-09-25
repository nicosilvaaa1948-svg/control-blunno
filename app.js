/* BLUNNO CONTROL EMPRESARIAL — GitHub Pages deployment bundle
 * This file intentionally contains the browser modules in one dependency-free entrypoint.
 * It avoids dynamic-import failures caused by partially deployed module trees.
 */
const __BLUNNO_MODULES = Object.create(null);

// ===== MODULE: config (config.js) =====
(() => {
const CONFIG = {
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

const isFirebaseConfigured = () => Boolean(
  CONFIG.firebase.apiKey && CONFIG.firebase.projectId && CONFIG.firebase.appId
);

const money = value => new Intl.NumberFormat(CONFIG.locale, {
  style: "currency", currency: CONFIG.currency, minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const number = value => new Intl.NumberFormat(CONFIG.locale, {
  maximumFractionDigits: 2
}).format(Number(value || 0));

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";
const partsInArgentina = value => Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: ARGENTINA_TZ, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23" }).formatToParts(value).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
const localDate = () => { const p=partsInArgentina(new Date()); return `${p.year}-${p.month}-${p.day}`; };
const now = () => { const d=new Date(); return d.toISOString(); };
const argentinaNowLabel = value => { if(!value) return "—"; const p=partsInArgentina(value?.toDate?value.toDate():new Date(value)); return Number(p.year)?`${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`:"—"; }; 
const today = localDate;
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const dateLabel = value => {
  if (!value) return "—";
  const raw=String(value).slice(0,10);
  const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(`${raw}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(CONFIG.locale,{timeZone:ARGENTINA_TZ});
};

const dateTimeLabel = value => {
  if (!value) return "—";
  const d = value?.toDate ? value.toDate() : new Date(value);
  if(Number.isNaN(d.getTime())) return String(value);
  const p=partsInArgentina(d);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
};

const periodLabel = period => {
  const [y, m] = String(period).split("-").map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString(CONFIG.locale, { month: "long", year: "numeric" })
    .replace(/^./, c => c.toUpperCase());
};

const nextPeriod = period => {
  const [y, m] = period.split("-").map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
};

const prevPeriod = period => {
  const [y, m] = period.split("-").map(Number);
  return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
};

const daysInPeriod = period => {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

const isoDate = (period, day) => `${period}-${String(day).padStart(2, "0")}`;

__BLUNNO_MODULES.config = { CONFIG, isFirebaseConfigured, money, number, localDate, now, argentinaNowLabel, today, uid, dateLabel, dateTimeLabel, periodLabel, nextPeriod, prevPeriod, daysInPeriod, isoDate };
})();

// ===== MODULE: pdf (pdf/pdf-engine.js) =====
(() => {
const pdfWinAnsi = text => {
  const map={"á":"\xE1","é":"\xE9","í":"\xED","ó":"\xF3","ú":"\xFA","ü":"\xFC","ñ":"\xF1","Á":"\xC1","É":"\xC9","Í":"\xCD","Ó":"\xD3","Ú":"\xDA","Ü":"\xDC","Ñ":"\xD1","¿":"\xBF","¡":"\xA1","€":"\x80"};
  let out="";
  for(const ch of String(text??"")){
    const code=ch.charCodeAt(0);
    if(map[ch]) out+=map[ch];
    else if(code>=32 && code<=126) out+=ch;
    else if(code<=255) out+=String.fromCharCode(code);
    else out+="?";
  }
  return out;
};
const pdfEscape = text => pdfWinAnsi(text).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/\r?\n/g," ");
const pdfWrap = (text,maxChars=92) => {
  const words=String(text??"").split(/\s+/); const lines=[]; let line="";
  for(const word of words){
    if(!line){line=word;continue;}
    if((line+" "+word).length<=maxChars) line+=" "+word;
    else{lines.push(line);line=word;}
  }
  if(line) lines.push(line);
  return lines.length?lines:[""];
};

function createSimplePDF(title,subtitle,rows,footer=''){
  const pageW=595.28,pageH=841.89,margin=42;
  const pages=[];
  const makeChunks=()=>{
    const chunks=[]; let chunk=[]; let used=120;
    for(const [a,b] of (Array.isArray(rows)?rows:[])){
      const h=Math.max(pdfWrap(a,34).length,pdfWrap(b,64).length)*13+7;
      if(chunk.length && used+h>700){chunks.push(chunk);chunk=[];used=120;}
      chunk.push([String(a??''),String(b??'')]); used+=h;
    }
    if(chunk.length || !chunks.length) chunks.push(chunk);
    return chunks;
  };
  const chunks=makeChunks();
  for(const [pageIndex,chunk] of chunks.entries()){
    const content=[]; let y=pageH-48;
    content.push('0.91 0.93 0.96 rg 42 786 511 1 re f');
    content.push(`/F2 17 Tf 0 0 0 rg 1 0 0 1 ${margin} ${y} Tm (${pdfEscape('DISTRIBUIDORA BLUNNO')}) Tj`); y-=22;
    content.push(`/F2 12 Tf 0 g 1 0 0 1 ${margin} ${y} Tm (${pdfEscape(title)}) Tj`); y-=16;
    for(const sub of pdfWrap(subtitle,105)){content.push(`/F1 9 Tf 0.25 g 1 0 0 1 ${margin} ${y} Tm (${pdfEscape(sub)}) Tj`);y-=12;}
    content.push(`0.82 G 0.6 w ${margin} ${y+3} m ${pageW-margin} ${y+3} l S`); y-=16;
    for(const [label,value] of chunk){
      const labelLines=pdfWrap(label,34),valueLines=pdfWrap(value,64),h=Math.max(labelLines.length,valueLines.length)*13+7;
      labelLines.forEach((t,j)=>content.push(`/F2 8.5 Tf 0.08 g 1 0 0 1 ${margin} ${y-j*13} Tm (${pdfEscape(t)}) Tj`));
      valueLines.forEach((t,j)=>content.push(`/F1 8.5 Tf 0.18 g 1 0 0 1 ${margin+145} ${y-j*13} Tm (${pdfEscape(t)}) Tj`));
      content.push(`0.92 G 0.35 w ${margin} ${y-h+3} m ${pageW-margin} ${y-h+3} l S`); y-=h;
    }
    if(pageIndex===chunks.length-1 && footer){if(y<90)y=90;for(const t of pdfWrap(footer,105)){content.push(`/F1 7 Tf 0.35 g 1 0 0 1 ${margin} ${y} Tm (${pdfEscape(t)}) Tj`);y-=10;}}
    content.push(`0.82 G 0.4 w ${margin} 44 m ${pageW-margin} 44 l S`);
    content.push(`/F1 7 Tf 0.4 g 1 0 0 1 ${margin} 30 Tm (${pdfEscape('Documento generado por Control Empresarial Blunno')}) Tj`);
    content.push(`/F1 7 Tf 0.4 g 1 0 0 1 505 30 Tm (${pdfEscape(`Página ${pageIndex+1} de ${chunks.length}`)}) Tj`);
    pages.push(content.join('\n'));
  }
  const objects=[]; const add=o=>{objects.push(o);return objects.length;};
  const catalog=add(''),pagesObj=add(''),font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),boldFont=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageRecords=[];
  for(const content of pages){const cid=add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);const pid=add('');pageRecords.push({cid,pid});}
  objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj-1]=`<< /Type /Pages /Kids [${pageRecords.map(r=>r.pid+' 0 R').join(' ')}] /Count ${pageRecords.length} >>`;
  for(const r of pageRecords) objects[r.pid-1]=`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${font} 0 R /F2 ${boldFont} 0 R >> >> /Contents ${r.cid} 0 R >>`;
  let pdf='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets=[0];
  for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const xref=pdf.length; pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`; for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes=new Uint8Array(pdf.length); for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;
  return new Blob([bytes],{type:'application/pdf'});
}

__BLUNNO_MODULES.pdf = { createSimplePDF };
})();

// ===== MODULE: firebase (firebase.js) =====
(() => {
const { CONFIG, isFirebaseConfigured } = __BLUNNO_MODULES.config;

let auth = null, db = null, storage = null;
let initialized = false;
let initPromise = null;

let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
const firebaseEnabled = isFirebaseConfigured();

async function ensureFirebase() {
  if (!firebaseEnabled) return false;
  if (initialized) return true;
  if (!initPromise) {
    initPromise = (async () => {
      const [{ initializeApp }, authMod, firestoreMod, storageMod] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js")
      ]);
      const app = initializeApp(CONFIG.firebase);
      auth = authMod.getAuth(app);
      db = firestoreMod.getFirestore(app);
      storage = storageMod.getStorage(app);
      firebaseAuth = auth;
      firebaseDb = db;
      firebaseStorage = storage;
      initialized = true;
      return true;
    })().catch(err => { initPromise = null; throw err; });
  }
  return initPromise;
}

const authState = async cb => {
  if (!firebaseEnabled) return cb(null);
  try {
    await ensureFirebase();
    return (await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js")).onAuthStateChanged(auth, cb);
  } catch { return cb(null); }
};
const login = async (email, password) => {
  if (!firebaseEnabled) throw new Error("Firebase no está configurado.");
  await ensureFirebase();
  const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js");
  return signInWithEmailAndPassword(auth, email, password);
};
const logout = async () => {
  if (!firebaseEnabled) return;
  await ensureFirebase();
  const { signOut } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js");
  return signOut(auth);
};

const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const fs = async () => { await ensureFirebase(); return import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"); };

async function remoteList(name, period = null) {
  if (!firebaseEnabled) return [];
  await ensureFirebase(); const { collection, getDocs, query, where } = await fs();
  const refCol = collection(db, name);
  const q = period && ["cash","hours","invoices","expenses","investments","employeeDebts","liquidations","tasks","closures"].includes(name) ? query(refCol, where("period","==",period)) : refCol;
  const snap = await getDocs(q); return snap.docs.map(d=>({id:d.id,...d.data()}));
}
async function remoteGet(name,id){if(!firebaseEnabled)return null;await ensureFirebase();const {doc,getDoc}=await fs();const snap=await getDoc(doc(db,name,id));return snap.exists()?{id:snap.id,...snap.data()}:null;}
async function remoteAdd(name,data,id=null){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {collection,doc,setDoc,addDoc,serverTimestamp}=await fs();const payload=clean({...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});if(id){await setDoc(doc(db,name,id),payload,{merge:true});return{id,...data};}const r=await addDoc(collection(db,name),payload);return{id:r.id,...data};}
async function remoteUpdate(name,id,data){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {doc,updateDoc,serverTimestamp}=await fs();await updateDoc(doc(db,name,id),clean({...data,updatedAt:serverTimestamp()}));return{id,...data};}
async function remotePurge(name,id){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {doc,deleteDoc,getDoc}=await fs();const refDoc=doc(db,name,id);const snap=await getDoc(refDoc);if(name==="files"&&snap.exists()&&snap.data().storagePath){try{const {ref,deleteObject}=await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js");await deleteObject(ref(storage,snap.data().storagePath));}catch(e){console.warn("Storage purge",e)}}await deleteDoc(refDoc);}
async function remoteDelete(name,id){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {doc,updateDoc,serverTimestamp}=await fs();await updateDoc(doc(db,name,id),{deleted:true,deletedAt:serverTimestamp(),updatedAt:serverTimestamp()});}
async function remoteAudit(data){if(!firebaseEnabled)return;await ensureFirebase();const {addDoc,collection,serverTimestamp}=await fs();await addDoc(collection(db,"audit"),clean({...data,createdAt:serverTimestamp()}));}
async function uploadFile(path,blob,contentType){if(!firebaseEnabled)return null;await ensureFirebase();const {ref,uploadBytes,getDownloadURL}=await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js");const r=ref(storage,path);await uploadBytes(r,blob,{contentType:contentType||blob.type||"application/octet-stream"});return getDownloadURL(r);}
async function remoteBatchSet(rows){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {writeBatch,doc,serverTimestamp}=await fs();const b=writeBatch(db);rows.forEach(r=>b.set(doc(db,r.name,r.id),clean({...r.data,updatedAt:serverTimestamp()}),{merge:true}));await b.commit();}

__BLUNNO_MODULES.firebase = { remoteList, remoteGet, remoteAdd, remoteUpdate, remotePurge, remoteDelete, remoteAudit, uploadFile, remoteBatchSet, firebaseAuth, firebaseDb, firebaseStorage, firebaseEnabled, authState, login, logout };
})();

// ===== MODULE: store (store.js) =====
(() => {
const { CONFIG, uid, isFirebaseConfigured, today, now, nextPeriod } = __BLUNNO_MODULES.config;
const { firebaseAuth, remoteList, remoteAdd, remoteUpdate, remoteDelete, remotePurge, remoteAudit } = __BLUNNO_MODULES.firebase;

const KEY = "blunno-control-v12-final";
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
const employeeSeeds = ["AGUS C.", "NICO", "LUCAS", "ALEXIS", "FRANCO", "FER", "MACA", "FLOR", "IVÒN", "VALENTINA", "JOACO", "AGUS . 1"];

const empty = () => Object.fromEntries(collections.map(c => [c, []]));
const seed = () => {
  const s = empty();
  s.periods.push({ id: CONFIG.defaultPeriod, status: "open", name: CONFIG.defaultPeriod, createdAt: now() });
  s.incomes = [];
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

const VAULT_DB = "blunno-file-vault-v1";
const openVault = () => new Promise((resolve,reject)=>{ const req=indexedDB.open(VAULT_DB,1); req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains("blobs")) req.result.createObjectStore("blobs"); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
const vaultPut = async (key,blob) => { const db=await openVault(); return new Promise((resolve,reject)=>{ const tx=db.transaction("blobs","readwrite"); tx.objectStore("blobs").put(blob,key); tx.oncomplete=()=>{db.close();resolve()}; tx.onerror=()=>{db.close();reject(tx.error)}; }); };
const vaultGet = async key => { const db=await openVault(); return new Promise((resolve,reject)=>{ const tx=db.transaction("blobs","readonly"); const req=tx.objectStore("blobs").get(key); req.onsuccess=()=>{db.close();resolve(req.result||null)}; req.onerror=()=>{db.close();reject(req.error)}; }); };
const vaultDelete = async key => { try{const db=await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction("blobs","readwrite");tx.objectStore("blobs").delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}catch{} };

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

const Store = {
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
    const incomes = filter(active("incomes").filter(x => x.period === period));
    const invoices = filter(active("invoices").filter(x => x.period === period));
    const expenses = filter(active("expenses").filter(x => x.period === period));
    const investments = filter(active("investments").filter(x => x.period === period));
    const hours = filter(active("hours").filter(x => x.period === period));
    const income = incomes.reduce((s,x)=>s+Number(x.amount||0),0);
    const cashExpense = cash.filter(x => x.type === "expense").reduce((s,x)=>s+Number(x.amount||0),0);
    const localExpense = expenses.reduce((s,x)=>s+Number(x.amount||0),0);
    const investment = investments.reduce((s,x)=>s+Number(x.amount||0),0);
    const providers = invoices.reduce((s,x)=>s+Number(x.amount||0),0);
    const paidProviders = 0;
    const liqs = filter(active("liquidations").filter(x => x.period === period));
    const salary = liqs.length ? liqs.reduce((s,x)=>s+Number(x.gross||0),0) : hours.reduce((s,x)=>s+Number(x.salaryCost||0),0);
    // Caja diaria es un control físico independiente y JAMÁS forma parte del resultado económico.
    const totalExpenses = localExpense + providers + investment + salary;
    const cashExpected = cash.reduce((s,x)=>s+Number(x.expected||0),0);
    const cashIncome = cash.filter(x=>x.type === "income").reduce((a,x)=>a+Number(x.amount||0),0);
    const cashControl = cashExpected - (cashIncome - cashExpense);
    return { period, branch, income, cashExpense, cashIncome, localExpense, investment, providers, paidProviders, salary,
      totalExpenses, result: income-totalExpenses, cashCount:cash.length, invoiceCount:invoices.length,
      expenseCount:expenses.length, investmentCount:investments.length, hours:hours.reduce((s,x)=>s+Number(x.hours||0),0),
      cashExpected, cashControl, liquidationCount:liqs.length };

  },
  async archiveFile(file) {
    const responsible = file.responsible || window.__blunnoResponsible || "";
    assertResponsible(responsible);
    const row = {
      id: uid(), ...file, responsible,
      deleted: false,
      createdAt: file.createdAt || now(),
      updatedAt: now()
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
    if(row.vaultKey) return vaultGet(row.vaultKey);
    if(row.dataUrl){ const res=await fetch(row.dataUrl); return res.blob(); }
    if(row.url){ const res=await fetch(row.url); if(!res.ok) throw new Error("No se pudo recuperar el archivo desde la nube."); return res.blob(); }
    return null;
  },
  async recordAudit(action, collection, before, after, responsible, reason, meta={}) { assertResponsible(responsible); return audit(action, collection, uid(), before, after, responsible, reason, meta); },
  async sync() { await syncRemote(); },
  exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `blunno-backup-${today()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
  },
  async importState(obj, responsible) { assertResponsible(responsible); const before = JSON.parse(JSON.stringify(state)); state = { ...empty(), ...obj }; persist(); await audit("IMPORT_STATE", "system", "backup", before, state, responsible, "Restauración de backup"); }
};

__BLUNNO_MODULES.store = { Store };
})();

// ===== MODULE: views (views.js) =====
(() => {
const { CONFIG, money, number, dateLabel, dateTimeLabel, periodLabel, daysInPeriod, isoDate, prevPeriod, today } = __BLUNNO_MODULES.config;
const { Store } = __BLUNNO_MODULES.store;

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const rows = (name, period, branch) => Store.list(name, period, branch);
const kpi = (label, value, hint="", cls="") => `<article class="kpi ${cls}"><span>${esc(label)}</span><strong>${value}</strong><small>${esc(hint)}</small></article>`;
const table = (headers, body, empty="No hay registros para mostrar.") => {
 const hasSelection=String(body||'').includes('data-bulk-select=');
 const collection=(String(body||'').match(/data-bulk-select="([^"]+)"/)||[])[1]||'';
 const head=hasSelection?['<input type="checkbox" title="Seleccionar todo" data-bulk-select-all="'+esc(collection)+'">',...headers]:headers;
 const toolbar=hasSelection?`<div class="bulk-toolbar"><span>Seleccioná movimientos para operar en conjunto.</span><button class="danger-button" data-bulk-delete="${esc(collection)}">Enviar seleccionados a papelera</button></div>`:'';
 return `${toolbar}<div class="table-wrap"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${body || `<tr><td colspan="${head.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
};
const actions = (collection,id,editType=collection) => `<div class="row-actions"><input type="checkbox" aria-label="Seleccionar" data-bulk-select="${esc(collection)}" data-id="${esc(id)}"><button data-edit="${editType}" data-id="${esc(id)}">Editar</button><button class="danger-link" data-delete="${collection}" data-id="${esc(id)}">Papelera</button></div>`;
const branchFilter = branch => CONFIG.profiles.map(x=>`<button class="filter-chip ${x===branch?'active':''}" data-profile="${x}">${x}</button>`).join("");

const formSchema = {
  cash: [
    ["date","Fecha","date"],["branch","Sucursal","select",CONFIG.branches],
    ["type","Tipo","select",[["income","Ingreso"],["expense","Egreso"]]],
    ["concept","Concepto","text"],["amount","Importe","number"],["expected","Importe esperado","number"],
    ["notes","Observaciones","textarea"],["lateMovement","Movimiento tardío","checkbox"]
  ],
  provider: [["name","Proveedor","text"]],
  invoice: [
    ["provider","Proveedor","text"],["number","N° de factura","text"],["operationDate","Fecha del movimiento","date"],
    ["loadDate","Fecha de carga","date"],["branch","Sucursal","select",CONFIG.branches],
    ["amount","Importe","number"],["notes","Observaciones","textarea"],["lateMovement","Carga tardía de período cerrado","checkbox"]
  ],
  income: [
    ["date","Fecha","date"],["branch","Sucursal","select",CONFIG.branches],["concept","Origen / concepto","text"],
    ["amount","Importe","number"],["notes","Detalle","textarea"],["lateMovement","Movimiento tardío","checkbox"]
  ],
  expense: [
    ["date","Fecha","date"],["branch","Sucursal","select",CONFIG.branches],["category","Categoría","select",CONFIG.expenseCategories],
    ["concept","Detalle / resumen","text"],["amount","Importe","number"],["document","Comprobante / referencia","text"],["notes","Observaciones","textarea"],
    ["lateMovement","Movimiento tardío","checkbox"]
  ],
  investment: [
    ["date","Fecha","date"],["branch","Sucursal","select",CONFIG.branches],["concept","Resumen de la inversión","text"],
    ["amount","Importe","number"],["document","Comprobante / referencia","text"],["notes","Detalle","textarea"],["lateMovement","Movimiento tardío","checkbox"]
  ],
  employee: [["name","Nombre completo","text"],["branch","Sucursal","select",[...CONFIG.branches,"Sin asignar"]],["role","Puesto","text"],["hourlyRate","Valor hora actual","number"],["active","Estado","select",[["true","Activo"],["false","Inactivo"]]]],
  hours: [["employee","Empleado","text"],["date","Fecha","date"],["hours","Horas","number"],["advance","Adelanto / vale","number"],["merchandise","Mercadería","number"],["holiday","Feriado","select",[["no","No"],["yes","Sí"]]],["notes","Observaciones","textarea"]],
  task: [["title","Tarea / recordatorio","text"],["dueDate","Fecha","date"],["dueTime","Hora","time"],["priority","Prioridad","select",[["normal","Normal"],["high","Alta"],["urgent","Urgente"]]],["responsible","Responsable","select",CONFIG.responsiblePeople],["repeat","Repetición","select",[["none","Sin repetición"],["daily","Diaria"],["weekly","Semanal"],["monthly","Mensual"]]],["notes","Notas","textarea"]]
};

function renderDashboard(content, period, branch="General") {
  const s=Store.summary(period,branch), prev=Store.summary(prevPeriod(period),branch);
  const pct=(a,b)=>a===0?(b===0?0:100):((b-a)/Math.abs(a))*100;
  const alerts=[];
  if(s.income===0) alerts.push("No hay ingresos independientes cargados para el período seleccionado.");
  const tasks=Store.list("tasks").filter(x=>x.status!=="completed").sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`)).slice(0,4);
  const detailButton=(kind,label,value,hint)=>`<button class="kpi kpi-click" data-dashboard-detail="${kind}"><span>${esc(label)}</span><strong>${value}</strong><small>${esc(hint)}</small></button>`;
  content.innerHTML=`
    <div class="profile-bar"><div><span class="section-kicker">PERFIL DE TRABAJO</span><b>${esc(branch)}</b><small>${branch==='General'?'Vista consolidada: no mezcla ni modifica las sucursales.':'Los valores se filtran exclusivamente a esta sucursal.'}</small></div><div class="profile-chips">${branchFilter(branch)}</div></div>
    <section class="hero"><div><span class="hero-tag">CENTRO DE CONTROL BLUNNO</span><h2>Todo el negocio, ordenado y trazable.</h2><p>${periodLabel(period)} · ${esc(branch)} · cada cambio queda auditado.</p><div class="hero-actions"><button class="primary-button" data-view-jump="close">Preparar cierre</button><button class="secondary-button" data-view-jump="agent">Abrir Agente BLUNNO</button><button class="secondary-button" data-pdf-close="dashboard">PDF del resumen</button></div></div><img src="distri.jpeg" alt="Distribuidora Blunno"></section>
    <div class="kpi-grid">${detailButton("income","Ingresos",money(s.income),`${Store.list('incomes',period,branch).length} movimientos independientes`)}${detailButton("expenses","Gastos del local",money(s.localExpense),`${s.expenseCount} movimientos`)}${detailButton("providers","Proveedores",money(s.providers),`${s.invoiceCount} facturas cargadas`)}${detailButton("investments","Inversiones",money(s.investment),`${s.investmentCount} movimientos`)}${detailButton("salary","Personal",money(s.salary),`${s.liquidationCount} liquidaciones / horas`)}${detailButton("result","Resultado",money(s.result),"Sin incluir Caja diaria")}</div>
    <div class="grid-2"><section class="panel"><div class="panel-head"><div><span class="section-kicker">VARIACIÓN</span><h3>Contra ${periodLabel(prevPeriod(period))}</h3></div></div>${metricLine("Ingresos",prev.income,s.income,pct(prev.income,s.income))}${metricLine("Gastos del local",prev.localExpense,s.localExpense,pct(prev.localExpense,s.localExpense))}${metricLine("Resultado",prev.result,s.result,pct(prev.result,s.result))}</section><section class="panel"><div class="panel-head"><div><span class="section-kicker">CONTROL</span><h3>Alertas y pendientes</h3></div></div>${alerts.length?alerts.map(a=>`<div class="alert-row warning">⚠ ${esc(a)}</div>`).join(''):'<div class="alert-row success">✓ No hay alertas críticas detectadas.</div>'}${tasks.map(t=>`<div class="task-mini"><b>${esc(t.title)}</b><span>${dateLabel(t.dueDate)} ${esc(t.dueTime||'')} · ${esc(t.responsible)}</span></div>`).join('')}</section></div>
  `;
}

function metricLine(label,a,b,p){return `<div class="metric-line"><div><b>${esc(label)}</b><span>${money(a)} → ${money(b)}</span></div><strong class="${p>=0?'up':'down'}">${p>=0?'+':''}${p.toFixed(1)}%</strong></div>`}

function renderCash(content,period,branch="General"){
 const data=rows("cash",period,branch); const days=daysInPeriod(period); const opening=getOpeningForView(period,branch); const concepts=[...new Set(data.map(x=>x.concept||"Sin concepto"))].sort((a,b)=>a.localeCompare(b,'es'));
 const dayTotals=Array.from({length:days},(_,i)=>{const d=i+1,date=isoDate(period,d);const inc=data.filter(x=>x.type==='income'&&x.date===date).reduce((s,x)=>s+Number(x.amount||0),0);const exp=data.filter(x=>x.type==='expense'&&x.date===date).reduce((s,x)=>s+Number(x.amount||0),0);const openingDay=i===0?opening:0;return {d,date,inc,exp,openingDay}});let saldo=opening;dayTotals.forEach(x=>{x.opening=saldo;x.rest=saldo+x.inc-x.exp;saldo=x.rest});
 const matrix=(type,title)=>{const list=concepts.filter(c=>data.some(x=>x.type===type&&(x.concept||'Sin concepto')===c));return `<section class="panel cash-matrix-panel"><div class="panel-head"><div><span class="section-kicker">${type==='income'?'INGRESOS':'GASTOS'}</span><h3>${title}</h3></div>${branch!=='General'?`<button class="secondary-button" data-cash-add-row="${type}">＋ Agregar concepto</button>`:''}</div><div class="sheet-wrap"><table class="matrix-table cash-main-matrix"><thead><tr><th class="sticky-col">Concepto</th>${dayTotals.map(x=>`<th>${new Date(`${x.date}T12:00:00`).toLocaleDateString('es-AR',{weekday:'short'}).replace('.','')}<small>${x.d}</small></th>`).join('')}<th>TOTAL</th></tr></thead><tbody>${list.map(c=>`<tr><th class="sticky-col">${esc(c)}</th>${dayTotals.map(x=>{const r=data.find(q=>q.type===type&&q.date===x.date&&(q.concept||'Sin concepto')===c);return `<td data-cash-cell data-type="${type}" data-concept="${esc(c)}" data-date="${x.date}"><input inputmode="decimal" ${branch==='General'?'disabled':''} value="${r?esc(r.amount):''}" placeholder="—"></td>`}).join('')}<td class="total-cell">${money(dayTotals.reduce((s,x)=>s+Number(data.find(q=>q.type===type&&q.date===x.date&&(q.concept||'Sin concepto')===c)?.amount||0),0))}</td></tr>`).join('')||`<tr><td colspan="${days+2}" class="empty">No hay conceptos cargados todavía.</td></tr>`}</tbody><tfoot><tr><th class="sticky-col">TOTAL DÍA</th>${dayTotals.map(x=>`<th>${money(x[type==='income'?'inc':'exp'])}</th>`).join('')}<th>${money(data.filter(x=>x.type===type).reduce((s,x)=>s+Number(x.amount||0),0))}</th></tr></tfoot></table></div></section>`};
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">CAJA DIARIA · CUADRO OPERATIVO</span><b>${esc(branch)}</b><small>Una sola planilla mensual. Cada día se carga directo en la celda y el saldo pasa automáticamente al día siguiente.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="cash-topbar"><div><span>Saldo inicial</span><strong>${money(opening)}</strong><small>El resto de cada día alimenta automáticamente el siguiente.</small></div><button id="cashOpeningButton" class="secondary-button">Editar saldo inicial</button><button class="secondary-button" data-pdf-close="cash">Descargar PDF</button></div><div class="mini-kpis">${kpi('Ingresos',money(data.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0)),'Mes')}${kpi('Gastos',money(data.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0)),'Mes')}${kpi('Saldo final',money(saldo),'Saldo que arranca el día siguiente')}${kpi('Diferencia',money(dayTotals.reduce((s,x)=>s+x.inc-x.exp,0)),'Ingresos − gastos')}</div>${matrix('income','Ingresos por cliente / concepto')}${matrix('expense','Gastos por proveedor / concepto')}<section class="panel"><div class="panel-head"><div><span class="section-kicker">CONTROL DIARIO</span><h3>Saldo, ingreso, gasto y resto</h3></div></div><div class="table-wrap"><table class="matrix-table"><thead><tr><th>Día</th>${dayTotals.map(x=>`<th>${x.d}</th>`).join('')}</tr></thead><tbody><tr><th>SALDO ANTERIOR</th>${dayTotals.map(x=>`<td>${money(x.opening)}</td>`).join('')}</tr><tr><th>INGRESOS</th>${dayTotals.map(x=>`<td>${money(x.inc)}</td>`).join('')}</tr><tr><th>GASTOS</th>${dayTotals.map(x=>`<td>${money(x.exp)}</td>`).join('')}</tr><tr class="total-row"><th>RESTO / SALDO</th>${dayTotals.map(x=>`<td>${money(x.rest)}</td>`).join('')}</tr></tbody></table></div></section>`;
}
function getOpeningForView(period,branch){return Number(Store.db.settings.find(x=>x.id===`cash-opening-${period}-${branch}`)?.amount||0)}

function renderIncome(content,period,branch="General"){ const data=rows('incomes',period,branch).sort((a,b)=>String(b.date).localeCompare(String(a.date))); const total=data.reduce((s,x)=>s+Number(x.amount||0),0); content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">INGRESOS</span><b>${esc(branch)}</b><small>Ingresos del negocio separados de Caja diaria.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Ingresos</h2><p>Estos importes son los que alimentan el indicador Ingresos de la página principal. Caja diaria queda completamente separada.</p></div><button class="secondary-button" data-pdf-close="income">PDF</button><button class="primary-button" data-new="income">＋ Nuevo ingreso</button></div><div class="mini-kpis">${kpi('Total',money(total))}${kpi('Movimientos',data.length)}</div>${table(['Fecha','Concepto','Sucursal','Importe','Acciones'],data.map(x=>`<tr><td>${dateLabel(x.date)}</td><td><b>${esc(x.concept||'Sin concepto')}</b></td><td>${esc(x.branch)}</td><td>${money(x.amount)}</td><td>${actions('incomes',x.id,'income')}</td></tr>`).join(''))}` }

function renderProviders(content,period,branch="General"){
 const data=rows('providers').sort((a,b)=>String(a.name).localeCompare(String(b.name),'es')); const invoices=rows('invoices',period,branch);
 const totals=new Map(); invoices.forEach(x=>totals.set(x.provider,(totals.get(x.provider)||0)+Number(x.amount||0)));
 const days=daysInPeriod(period); const matrix=data.map(p=>{const cells=Array.from({length:days},(_,i)=>{const date=isoDate(period,i+1);const v=invoices.filter(x=>x.provider===p.name&&(x.operationDate||x.date)===date).reduce((s,x)=>s+Number(x.amount||0),0);return `<td>${v?money(v):'—'}</td>`}).join('');return `<tr><th class="sticky-col"><b>${esc(p.name)}</b></th>${cells}<td class="total-cell">${money(totals.get(p.name)||0)}</td></tr>`}).join('');
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">MAESTRO PERMANENTE</span><b>Proveedores</b><small>Los nombres permanecen entre meses. Las facturas son movimientos independientes.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Proveedores</h2><p>Escribí parte del nombre al cargar una factura y completamos la coincidencia.</p></div><button class="secondary-button" data-pdf-close="providers">PDF</button><button class="primary-button" data-new="provider">＋ Nuevo proveedor</button></div>${table(['Proveedor','Facturado en período','Estado','Acciones'],data.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${money(totals.get(x.name)||0)}</td><td><span class="status-pill ${x.active===false?'muted':''}">${x.active===false?'INACTIVO':'ACTIVO'}</span></td><td>${actions('providers',x.id,'provider')}<button class="secondary-button compact-button" data-provider-history="${esc(x.name)}">Historial</button></td></tr>`).join(''))}<section class="panel"><div class="panel-head"><div><span class="section-kicker">PLANILLA</span><h3>Proveedor × día · ${periodLabel(period)}</h3></div></div><div class="sheet-wrap"><table class="hours-sheet provider-matrix"><thead><tr><th class="sticky-col">Proveedor</th>${Array.from({length:days},(_,i)=>`<th>${i+1}</th>`).join('')}<th>TOTAL</th></tr></thead><tbody>${matrix}</tbody></table></div></section>`;
}

function renderInvoices(content,period,branch="General"){
 const data=rows('invoices',period,branch).sort((a,b)=>String(b.operationDate||b.date).localeCompare(String(a.operationDate||a.date))); const total=data.reduce((s,x)=>s+Number(x.amount||0),0);
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">FACTURAS · CARGA Y CONTROL</span><b>${esc(branch)}</b><small>Solo cargamos la factura. No hay estado de pago ni vencimiento: una factura cargada queda marcada en verde como CARGADA.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><section class="panel quick-invoice"><div class="panel-head"><div><span class="section-kicker">CARGA EXPRESS</span><h3>Una factura en segundos</h3></div></div>${branch==='General'?`<div class="notice warning">Elegí una sucursal concreta arriba para cargar facturas.</div>`:`<div class="quick-invoice-grid"><input id="quickInvoiceProvider" list="providerList" placeholder="Proveedor"><input id="quickInvoiceNumber" placeholder="N° factura"><input id="quickInvoiceDate" type="date" value="${today()}"><input id="quickInvoiceAmount" inputmode="decimal" placeholder="Importe"><button class="primary-button" data-invoice-quick-save>Guardar factura</button></div><div class="quick-hint">Ejemplo: Aguilera · 0001-00012345 · fecha · $ 125.000</div>`}</section><div class="page-intro"><div><h2>Facturas</h2><p>Cada factura conserva fecha de movimiento, fecha de carga, sucursal, responsable y auditoría. La misma numeración puede repetirse en distintas sucursales.</p></div><button class="secondary-button" data-pdf-close="invoices">PDF</button></div><div class="mini-kpis">${kpi('Total',money(total))}${kpi('Documentos',data.length)}${kpi('Proveedores con facturas',new Set(data.map(x=>x.provider)).size)}</div>${table(['Proveedor','Factura','Movimiento','Carga','Sucursal','Importe','Estado','Acciones'],data.map(x=>`<tr><td><b>${esc(x.provider)}</b></td><td>${esc(x.number||'—')}</td><td>${dateLabel(x.operationDate||x.date)}</td><td>${dateTimeLabel(x.loadDate||x.createdAt)}</td><td>${esc(x.branch)}</td><td class="amount clickable" data-detail="invoices" data-id="${x.id}">${money(x.amount)}</td><td><span class="status-pill success">CARGADA</span></td><td>${actions('invoices',x.id)}</td></tr>`).join(''))}`;
}

function renderExpenses(content,period,branch="General"){
 const data=rows('expenses',period,branch).sort((a,b)=>String(b.date).localeCompare(String(a.date))); const total=data.reduce((s,x)=>s+Number(x.amount||0),0); const cats=CONFIG.expenseCategories.map(c=>[c,data.filter(x=>x.category===c).reduce((s,x)=>s+Number(x.amount||0),0)]).filter(x=>x[1]);
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">GASTOS DEL LOCAL</span><b>${esc(branch)}</b><small>Categorías basadas en la estructura de tus planillas.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Gastos por categoría</h2><p>Proveedores y gastos del local se mantienen separados.</p></div><button class="secondary-button" data-pdf-close="expenses">PDF</button><button class="primary-button" data-new="expense">＋ Nuevo gasto</button></div><div class="mini-kpis">${kpi('Total gastos',money(total))}${kpi('Movimientos',data.length)}${kpi('Categorías usadas',cats.length)}</div><div class="category-cards">${cats.map(([c,v])=>`<div class="category-card"><span>${esc(c)}</span><strong>${money(v)}</strong></div>`).join('')||'<div class="empty-block">Todavía no hay gastos por categoría.</div>'}</div>${table(['Fecha','Categoría','Detalle','Sucursal','Importe','Responsable','Acciones'],data.map(x=>`<tr><td>${dateLabel(x.date)}</td><td><b>${esc(x.category)}</b></td><td>${esc(x.concept)}</td><td>${esc(x.branch)}</td><td class="amount">${money(x.amount)}</td><td>${esc(x.responsible)}</td><td>${actions('expenses',x.id)}</td></tr>`).join(''))}`;
}

function renderInvestments(content,period,branch="General"){
 const data=rows('investments',period,branch).sort((a,b)=>String(b.date).localeCompare(String(a.date))); const total=data.reduce((s,x)=>s+Number(x.amount||0),0);
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">GASTOS DE INVERSIÓN</span><b>${esc(branch)}</b><small>Cada sucursal conserva su propia cuenta; General consolida sin mezclar registros.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Inversiones</h2><p>Resumen, importe, fecha, responsable y comprobante quedan registrados.</p></div><button class="secondary-button" data-pdf-close="investments">PDF</button><button class="primary-button" data-new="investment">＋ Nueva inversión</button></div><div class="mini-kpis">${kpi('Invertido',money(total))}${kpi('Movimientos',data.length)}</div>${table(['Fecha','Resumen','Sucursal','Importe','Comprobante','Responsable','Acciones'],data.map(x=>`<tr><td>${dateLabel(x.date)}</td><td><b>${esc(x.concept)}</b><small class="cell-note">${esc(x.notes||'')}</small></td><td>${esc(x.branch)}</td><td class="amount">${money(x.amount)}</td><td>${esc(x.document||'—')}</td><td>${esc(x.responsible)}</td><td>${actions('investments',x.id)}</td></tr>`).join(''))}`;
}

function renderPeople(content,period,branch="General"){
 const data=rows('employees').filter(x=>branch==='General'||x.branch===branch);
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">PERSONAL</span><b>${esc(branch)}</b><small>Las fichas pertenecen a una sucursal y no se mezclan.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Personal</h2><p>Valor hora individual, estado y sucursal.</p></div><button class="secondary-button" data-pdf-close="people">PDF</button><button class="primary-button" data-new="employee">＋ Nuevo empleado</button></div>${table(['Empleado','Sucursal','Puesto','Valor hora','Estado','Acciones'],data.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.branch)}</td><td>${esc(x.role||'—')}</td><td>${money(x.hourlyRate)}</td><td><span class="status-pill ${x.active===false?'muted':''}">${x.active===false?'INACTIVO':'ACTIVO'}</span></td><td>${actions('employees',x.id,'employee')}</td></tr>`).join(''))}`;
}

function weekCells(period,employee,branch){const days=daysInPeriod(period);let html='';for(let d=1;d<=days;d++){const date=isoDate(period,d), r=Store.list('hours',period,branch).find(x=>x.employeeId===employee.id&&x.date===date);const dow=new Date(`${date}T12:00:00`).toLocaleDateString('es-AR',{weekday:'short'}).replace('.','');html+=`<td class="hour-cell" data-hour-date="${date}" data-employee="${employee.id}"><span>${dow}</span><input inputmode="decimal" value="${r?esc(r.hours):''}" placeholder="–" data-hour-input></td>`}return html;}

function renderHours(content,period,branch="General"){
 const allEmployees=Store.list('employees').filter(e=>e.active!==false && (branch==='General'||e.branch===branch)).sort((a,b)=>a.name.localeCompare(b.name,'es')); const savedEmployee=localStorage.getItem('blunno-hours-employee')||'ALL'; const selectedEmployee=allEmployees.some(e=>e.id===savedEmployee)?savedEmployee:'ALL'; const employees=allEmployees.filter(e=>selectedEmployee==='ALL'||e.id===selectedEmployee);
 const data=Store.list('hours',period,branch); const days=daysInPeriod(period);
 const totalFor=e=>data.filter(x=>x.employeeId===e.id).reduce((s,x)=>s+Number(x.hours||0),0);
 const value=e=>{const r=data.filter(x=>x.employeeId===e.id);return {hours:r.reduce((s,x)=>s+Number(x.hours||0),0),advance:r.reduce((s,x)=>s+Number(x.advance||0),0),merch:r.reduce((s,x)=>s+Number(x.merchandise||0),0),holiday:r.filter(x=>x.holiday==='yes').reduce((s,x)=>s+Number(x.hours||0),0)}};
 const weeks=[]; for(let start=1;start<=days;start+=7) weeks.push({start,end:Math.min(start+6,days)});
 const grid=employees.map(e=>{const v=value(e); const weekCells=weeks.map(w=>`<td class="week-total">${number(data.filter(x=>x.employeeId===e.id&&Number(x.date.slice(-2))>=w.start&&Number(x.date.slice(-2))<=w.end).reduce((s,x)=>s+Number(x.hours||0),0))}</td>`).join(''); return `<tr><th class="sticky-col employee-sticky"><b>${esc(e.name)}</b><small>${esc(e.branch||'Sin asignar')}</small></th>${Array.from({length:days},(_,i)=>{const d=i+1,date=isoDate(period,d),x=data.find(r=>r.employeeId===e.id&&r.date===date);const cls=x?.holiday==='yes'?'holiday-cell':x?.status==='franco'?'franco-cell':'';return `<td class="${cls}" data-hour-date="${date}" data-employee="${e.id}" data-hour-cell><input class="hour-cell-input" value="${esc(x?.displayValue??x?.hours??'')}" placeholder="—" inputmode="decimal" title="Número de horas · F = franco · H = feriado"></td>`}).join('')}${weekCells}<td class="total-cell">${number(v.hours)}</td><td><button class="cell-edit-button" data-hours-adjust="advance" data-employee-adjust="${e.id}">${money(v.advance)}</button></td><td><button class="cell-edit-button" data-hours-adjust="merchandise" data-employee-adjust="${e.id}">${money(v.merch)}</button></td><td>${number(v.holiday)}</td><td><button class="primary-button compact-button" data-liquidate="${e.id}">Totalizar</button></td></tr>`}).join('');
 const footer=Array.from({length:days},(_,i)=>{const d=i+1;return `<th>${number(data.filter(x=>x.date===isoDate(period,d)).reduce((s,x)=>s+Number(x.hours||0),0))}</th>`}).join('');
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">HORAS MENSUALES · PLANILLA</span><b>${esc(branch)}</b><small>La estructura replica la lógica del Excel: días directos, totales, adelantos, mercadería y feriados. En una celda: número = horas, F = franco, H = feriado (conserva las horas o usa 8 si está vacía).</small></div><div class="profile-chips">${branchFilter(branch)}</div></div>
 <div class="hours-toolbar"><div><b>${periodLabel(period)}</b><span>${employees.length} empleados visibles · ${number(data.reduce((s,x)=>s+Number(x.hours||0),0))} horas cargadas</span></div><div><label class="hours-filter">Empleado<select id="hoursEmployeeFilter"><option value="ALL" ${selectedEmployee==='ALL'?'selected':''}>Todos los empleados</option>${allEmployees.map(e=>`<option value="${e.id}" ${selectedEmployee===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label><button class="secondary-button" data-hours-focus="first">Ir a primera celda</button><button class="secondary-button" data-pdf-close="hours">PDF</button><button class="primary-button" data-new="hours">＋ Carga manual</button></div></div>
 <section class="panel hours-panel"><div class="sheet-wrap hours-sheet"><table class="matrix-table"><thead><tr><th class="sticky-col employee-sticky">Empleado</th>${Array.from({length:days},(_,i)=>{const d=i+1,dt=new Date(`${isoDate(period,d)}T12:00:00`);return `<th>${dt.toLocaleDateString('es-AR',{weekday:'short'}).replace('.','')}<small>${d}</small></th>`}).join('')}${weeks.map((w,i)=>`<th>SEM ${i+1}<small>${w.start}-${w.end}</small></th>`).join('')}<th>HORAS</th><th>ADELANTOS</th><th>MERCADERÍA</th><th>FERIADO</th><th>LIQ.</th></tr></thead><tbody>${grid||`<tr><td colspan="${days+weeks.length+6}" class="empty">No hay empleados asignados a ${esc(branch)}.</td></tr>`}</tbody><tfoot><tr><th class="sticky-col">TOTAL DÍA</th>${footer}${weeks.map(w=>`<th>${number(data.filter(x=>Number(x.date.slice(-2))>=w.start&&Number(x.date.slice(-2))<=w.end).reduce((s,x)=>s+Number(x.hours||0),0))}</th>`).join('')}<th>${number(data.reduce((s,x)=>s+Number(x.hours||0),0))}</th><th>${money(data.reduce((s,x)=>s+Number(x.advance||0),0))}</th><th>${money(data.reduce((s,x)=>s+Number(x.merchandise||0),0))}</th><th>${number(data.filter(x=>x.holiday==='yes').reduce((s,x)=>s+Number(x.hours||0),0))}</th><th>—</th></tr></tfoot></table></div></section>
 <section class="panel"><div class="panel-head"><div><span class="section-kicker">REFERENCIA DE CARGA</span><h3>Valores permitidos en la celda</h3></div></div><div class="legend-row"><span><b>8</b> horas</span><span><b>F</b> / <b>franco</b> descanso</span><span><b>SI</b> / <b>NO</b> estado utilizado en planillas</span><span><b>H</b> marca feriado y calcula con tarifa feriado</span><span>Enter guarda y avanza</span></div></section>`;
}

function renderResults(content,period,branch="General"){
 const s=Store.summary(period,branch); const byCat=CONFIG.expenseCategories.map(c=>[c,rows('expenses',period,branch).filter(x=>x.category===c).reduce((a,x)=>a+Number(x.amount||0),0)]).filter(x=>x[1]);
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">RESULTADOS</span><b>${esc(branch)}</b><small>Ingresos, gastos, proveedores, inversiones y personal separados.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Resultado mensual</h2><p>El resultado se calcula con la estructura real del negocio.</p></div><button class="secondary-button" data-pdf-close="results">Descargar PDF</button></div><div class="result-grid">${[['Ingresos',s.income,'good'],['Gastos operativos',s.totalExpenses,s.result>=0?'':'bad'],['Proveedores',s.providers,''],['Inversiones',s.investment,''],['Personal estimado',s.salary,''],['Resultado',s.result,s.result>=0?'good':'bad']].map(x=>`<div class="result-card"><span>${x[0]}</span><strong class="${x[2]}">${money(x[1])}</strong><p>${x[0]==='Resultado'?'Ingresos menos gastos operativos, inversión y costo estimado de horas.':''}</p></div>`).join('')}</div><section class="panel"><div class="panel-head"><div><span class="section-kicker">GASTOS</span><h3>Distribución por categoría</h3></div></div>${table(['Categoría','Monto','% de gastos'],byCat.map(([c,v])=>`<tr><td><b>${esc(c)}</b></td><td>${money(v)}</td><td>${s.totalExpenses?((v/s.totalExpenses)*100).toFixed(1):0}%</td></tr>`).join(''))}</section>`;
}

function renderCompare(content,period,branch="General",compareA=prevPeriod(period),compareB=period){
 const periods=[...new Set([period,prevPeriod(period),...Store.db.periods.map(x=>x.id)])].sort().reverse();
 const calc=p=>Store.summary(p,branch); const a=calc(compareA),b=calc(compareB); const pct=(x,y)=>x===0?(y===0?0:100):((y-x)/Math.abs(x))*100; const line=(l,x,y)=>`<tr><td><b>${l}</b></td><td>${money(x)}</td><td>${money(y)}</td><td>${money(y-x)}</td><td class="${y-x>=0?'up':'down'}">${pct(x,y)>=0?'+':''}${pct(x,y).toFixed(1)}%</td></tr>`;
 content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">COMPARATIVAS</span><h2>Comparación de períodos</h2><p>Elegí dos meses distintos; también podés ver la evolución de seis meses.</p></div><button class="secondary-button" data-pdf-close="compare">Descargar PDF</button></div><div class="compare-controls"><label>Período A<select data-compare-select="a">${periods.map(p=>`<option value="${p}" ${p===compareA?'selected':''}>${periodLabel(p)}</option>`).join('')}</select></label><span>vs.</span><label>Período B<select data-compare-select="b">${periods.map(p=>`<option value="${p}" ${p===compareB?'selected':''}>${periodLabel(p)}</option>`).join('')}</select></label></div><div class="profile-bar compact"><div><b>Perfil: ${esc(branch)}</b></div><div class="profile-chips">${branchFilter(branch)}</div></div>${table(['Indicador',periodLabel(compareA),periodLabel(compareB),'Diferencia','Variación'],[line('Ingresos',a.income,b.income),line('Gastos',a.totalExpenses,b.totalExpenses),line('Resultado',a.result,b.result),line('Proveedores',a.providers,b.providers),line('Inversiones',a.investment,b.investment),line('Horas',a.hours,b.hours)].join(''))}<section class="panel"><div class="panel-head"><div><span class="section-kicker">EVOLUCIÓN</span><h3>Últimos 6 meses desde ${periodLabel(compareB)}</h3></div></div><div class="bar-chart">${Array.from({length:6},(_,i)=>{const [y,m]=compareB.split('-').map(Number);const d=new Date(y,m-1-i,1),p=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,s=calc(p);return `<div class="bar-item"><div class="bar-track"><div class="bar-fill" style="height:${Math.min(100,Math.abs(s.result)/(Math.max(1,...Array.from({length:6},(_,j)=>{const dd=new Date(y,m-1-j,1),pp=`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}`;return Math.abs(calc(pp).result)})))*100)}%"></div></div><b>${p.slice(5)}</b><span>${money(s.result)}</span></div>`}).reverse().join('')}</div></section>`;
}

function renderTasks(content){const all=Store.list('tasks').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`));const pending=all.filter(x=>x.status!=='completed'),done=all.filter(x=>x.status==='completed');content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">CENTRO DE ATENCIÓN</span><h2>Recordatorios</h2><p>Las tareas viven dentro de Blunno. Completar una tarea también queda auditado.</p></div><button class="primary-button" data-new="task">＋ Nuevo recordatorio</button></div><div class="task-columns"><section class="panel"><h3>Pendientes</h3>${pending.map(t=>taskCard(t)).join('')||'<div class="empty-block">No hay tareas pendientes.</div>'}</section><section class="panel"><h3>Completadas</h3>${done.slice(0,20).map(t=>taskCard(t,true)).join('')||'<div class="empty-block">Todavía no hay tareas completadas.</div>'}</section></div>`}
function taskCard(t,done=false){return `<div class="task-card ${t.priority==='urgent'?'urgent':''}"><div><span class="priority ${t.priority}">${esc(t.priority||'normal')}</span><b>${esc(t.title)}</b><small>📅 ${dateLabel(t.dueDate)} ${esc(t.dueTime||'')} · 👤 ${esc(t.responsible)}</small></div>${done?`<div class="row-actions"><span class="status-pill success">REALIZADA</span><button class="danger-link" data-delete="tasks" data-id="${esc(t.id)}">Borrar</button></div>`:`<button class="primary-button" data-complete-task="${t.id}">✓ Realizada</button>`}</div>`}

function renderAgent(content){
 const recent=Store.db.audit.filter(x=>x.collection!=='settings').slice(0,12); const person=localStorage.getItem('blunno-agent-person')||''; let history=[];try{history=JSON.parse(localStorage.getItem(`blunno-agent-chat-${person||'sin-usuario'}`)||'[]')}catch(e){} const messages=history.slice(-40).map(m=>`<div class="agent-message ${m.who==='user'?'user':'bot'}">${m.html}</div>`).join('');
 content.innerHTML=`<section class="agent-hero"><div><span class="hero-tag">AGENTE BLUNNO · CENTRO OPERATIVO</span><h2>Entiende, consulta y actúa con confirmación.</h2><p>Consulta caja, gastos, facturas, horas, resultados y cierre. Las modificaciones siempre muestran lo que se va a guardar y exigen confirmación.</p></div><div class="agent-badge">● CONFIRMACIÓN OBLIGATORIA</div></section>
 <section class="agent-grid"><div class="panel agent-chat"><div class="agent-statusbar"><span>Usuario actual</span><b id="agentCurrentPerson">${esc(person||'Elegir')}</b></div><div id="agentMessages" class="agent-messages">${messages||`<div class="agent-message bot"><b>Agente BLUNNO</b><span>¿Con quién estoy hablando?</span><div class="person-buttons">${CONFIG.responsiblePeople.map(p=>`<button data-agent-person="${p}">${p}</button>`).join('')}</div></div>`}</div><div class="agent-suggestions"><button data-agent-prompt="¿Cuánto gastamos este mes?">Resumen del mes</button><button data-agent-prompt="¿Qué facturas están pendientes?">Facturas pendientes</button><button data-agent-prompt="Prepará el cierre del mes">Preparar cierre</button><button data-agent-prompt="¿Cuántas horas cargamos?">Horas</button><button data-agent-prompt="¿Cuál es el saldo final de caja?">Saldo de caja</button></div><div class="agent-input"><input id="agentInput" placeholder="Escribí una consulta u orden…"><button id="agentMic" class="icon-button" title="Dictar">🎙</button><button id="agentSend" class="primary-button">Enviar</button></div></div><div class="panel"><span class="section-kicker">TRAZABILIDAD</span><h3>Actividad reciente</h3>${recent.map(x=>`<div class="activity"><div class="activity-dot"></div><div><b>${esc(x.action)}</b><span>${esc(x.responsible)} · ${dateTimeLabel(x.at)}</span></div></div>`).join('')||'<div class="empty-block">Sin actividad.</div>'}</div></section>`;
}

function renderClose(content,period,branch="General"){
 const s=Store.summary(period,branch),closed=Store.periodIsClosed(period,branch);
 const versions=Store.db.closures.filter(x=>x.period===period&&x.branch===branch).sort((a,b)=>Number(b.version||0)-Number(a.version||0));
 const checklist=[
  ['Caja diaria',s.cashCount>0||s.income===0,`${s.cashCount} movimientos · control ${money(s.cashControl)}`],
  ['Ingresos revisados',true,money(s.income)],
  ['Facturas / proveedores',true,`${s.invoiceCount} facturas · ${money(s.providers)} facturado`],
  ['Gastos del local',true,`${s.expenseCount} registros · ${money(s.localExpense)}`],
  ['Inversiones',true,`${s.investmentCount} registros · ${money(s.investment)}`],
  ['Horas mensuales',s.hours>=0,`${number(s.hours)} horas · ${s.liquidationCount} liquidaciones`],
  ['Período abierto',!closed,closed?'Ya cerrado':'Listo para cerrar']
 ];
 const blockers=checklist.filter(x=>!x[1]&&!['Facturas pendientes'].includes(x[0]));
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">CIERRE MENSUAL CONTROLADO</span><b>${esc(branch)}</b><small>El cierre es manual. Se toma una fotografía exacta de los datos y se genera una versión inmutable del control.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div>
 <div class="close-status ${closed?'closed':'open'}"><div><span>ESTADO</span><strong>${closed?'CERRADO':'ABIERTO'}</strong></div><div><span>VERSIÓN ACTUAL</span><strong>${versions[0]?.version||0}</strong></div><div><span>RESULTADO</span><strong>${money(s.result)}</strong></div><div><span>RESPONSABLE</span><strong>${esc(versions[0]?.responsible||"Sin responsable")}</strong></div></div>
 <section class="panel"><div class="panel-head"><div><span class="section-kicker">CONTROL PREVIO OBLIGATORIO</span><h3>Antes de cerrar, Blunno verifica el estado real</h3></div>${closed?'<button class="secondary-button" data-reopen-period="1">Reabrir con motivo</button>':'<button class="primary-button" data-close-period="1" '+(blockers.length?'disabled title="Hay controles bloqueantes pendientes"':'')+'>Cerrar y generar documentación</button>'}</div><div class="close-check-grid">${checklist.map(([name,ok,detail])=>`<div class="close-check ${ok?'ok':'block'}"><div class="check-icon">${ok?'✓':'!'}</div><div><b>${esc(name)}</b><span>${esc(detail)}</span></div><strong>${ok?'OK':'REVISAR'}</strong></div>`).join('')}</div>${blockers.length?`<div class="notice danger-box">Hay ${blockers.length} control(es) bloqueante(s). Corregilos antes de cerrar.</div>`:'<div class="notice success">✓ El control previo no detectó bloqueos.</div>'}</section>
 <section class="panel"><div class="panel-head"><div><span class="section-kicker">FOTOGRAFÍA DEL CIERRE</span><h3>Totales que quedarán registrados</h3></div></div><div class="close-summary"><div><span>Ingresos</span><b>${money(s.income)}</b></div><div><span>Gastos caja</span><b>${money(s.cashExpense)}</b></div><div><span>Gastos del local</span><b>${money(s.localExpense)}</b></div><div><span>Proveedores</span><b>${money(s.providers)}</b></div><div><span>Inversiones</span><b>${money(s.investment)}</b></div><div><span>Personal</span><b>${money(s.salary)}</b></div><div><span>Resultado</span><b>${money(s.result)}</b></div><div><span>Control caja</span><b>${money(s.cashControl)}</b></div></div></section>
 <section class="panel"><div class="panel-head"><div><span class="section-kicker">VERSIONADO</span><h3>Historial completo del cierre</h3></div>${versions[0]?`<button class="secondary-button" data-close-version="${versions[0].id}">Descargar última versión</button>`:''}</div>${versions.map(v=>`<div class="version-row"><div><b>Versión ${v.version}</b><span>${dateTimeLabel(v.closedAt)} · ${esc(v.responsible)} · ${esc(v.status)}</span></div><strong>${money(v.summary?.result)}</strong><button class="secondary-button" data-close-version="${v.id}">PDF</button></div>`).join('')||'<div class="empty-block">Todavía no hay cierres.</div>'}</section>`;
}

function renderFiles(content,period,branch="General"){const allFiles=Store.list('files').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));const files=allFiles.filter(f=>branch==='General'||f.branch===branch);content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">ARCHIVOS</span><h2>Documentos Blunno</h2><p>Cada documento queda guardado con año, mes, sucursal, sector, fecha de generación y ruta interna. Se puede descargar nuevamente todas las veces que quieras.</p></div><button class="secondary-button" data-view-jump="import">Importar archivo</button></div><div class="file-filters"><span>Período: ${periodLabel(period)}</span><span>Perfil: ${esc(branch)}</span><span>${files.length} documentos en este perfil · ${allFiles.length} en total</span></div>${table(['Documento','Sector','Período','Sucursal','Generado','Fecha','Acción'],files.map(f=>`<tr><td><input type="checkbox" data-bulk-select="files" data-id="${esc(f.id)}"></td><td><b>${esc(f.name)}</b><small class="cell-note">${esc(f.mime||'')} · ${esc(f.storagePath||'local/archivos')}</small></td><td>${esc(f.sector||'Documento')}</td><td>${periodLabel(f.period||period)}</td><td>${esc(f.branch||'General')}</td><td>${esc(f.generatedBy||f.responsible||'Consulta')}</td><td>${dateTimeLabel(f.createdAt)}</td><td><div class="row-actions"><button class="secondary-button" data-view-file="${esc(f.id)}">Ver</button><button class="primary-button" data-download-file="${esc(f.id)}">Descargar</button><button class="danger-link" data-delete="files" data-id="${esc(f.id)}">Papelera</button></div></td></tr>`).join(''))}`}

function renderHistory(content){const data=Store.db.audit;content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">AUDITORÍA</span><h2>Historial y trazabilidad</h2><p>Antes/después, responsable, sector, fecha y minuto. Podés seleccionar movimientos y enviarlos a la papelera.</p></div><button class="secondary-button" id="exportAudit">Exportar auditoría</button><button class="secondary-button" data-pdf-close="history">PDF</button></div>${table(['Fecha / hora','Acción','Sector','Responsable','Motivo','Antes / después'],data.map(x=>`<tr><td><input type="checkbox" data-bulk-select="audit" data-id="${esc(x.id)}"></td><td>${dateTimeLabel(x.at)}</td><td><span class="audit-action">${esc(x.action)}</span></td><td>${esc(x.collection)}</td><td>${esc(x.responsible)}</td><td>${esc(x.reason)}</td><td><details><summary>Ver</summary><pre class="audit-pre">${esc(JSON.stringify({antes:x.before,despues:x.after},null,2))}</pre></details></td></tr>`).join(''))}`}
function renderTrash(content){
 const data=Store.trash().sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));
 content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">PAPELERA SEGURA</span><h2>Elementos eliminados</h2><p>Los registros permanecen 30 días. Podés seleccionar varios para restaurarlos o eliminarlos definitivamente. La eliminación definitiva también queda auditada.</p></div></div>
 <div class="trash-toolbar"><div><b>${data.length}</b><span> elementos en papelera</span></div><div><button class="secondary-button" id="trashRestoreSelected" ${data.length?'':'disabled'}>↶ Restaurar seleccionados</button><button class="danger-button" id="trashPurgeSelected" ${data.length?'':'disabled'}>Eliminar definitivamente</button><button class="danger-link" id="trashEmpty" ${data.length?'':'disabled'}>Vaciar papelera</button></div></div>
 ${table(['<input type="checkbox" id="trashSelectAll">','Sector','Registro','Eliminado','Responsable','Vence','Acciones'],data.map(x=>{const expires=new Date(new Date(x.deletedAt).getTime()+30*86400000);return `<tr><td><input type="checkbox" class="trash-select" data-collection="${esc(x._collection)}" data-id="${esc(x.id)}"></td><td>${esc(x._collection)}</td><td><b>${esc(x.name||x.concept||x.title||x.provider||x.id)}</b></td><td>${dateTimeLabel(x.deletedAt)}</td><td>${esc(x.responsible||'—')}</td><td>${dateTimeLabel(expires.toISOString())}</td><td><button class="secondary-button" data-restore="${esc(x._collection)}" data-id="${esc(x.id)}">Restaurar</button><button class="danger-link" data-purge="${esc(x._collection)}" data-id="${esc(x.id)}">Eliminar</button></td></tr>`}).join(''))}`;
}

function renderImport(content){content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">EXCEL / RESPALDOS</span><h2>Importar, exportar y sincronizar</h2><p>Excel puede seguir siendo la herramienta diaria. La web registra la importación con origen, responsable y cambios.</p></div></div><div class="import-grid"><section class="panel"><span class="section-kicker">PLANIFICACIÓN</span><h3>Sincronizar Excel de horas</h3><p>Reconoce hojas por empleado, bloques semanales, HORAS SEMANALES, ADELANTOS DINERO, MERCADERIA y FERIADO.</p><input id="excelInput" type="file" accept=".xlsx,.xls,.csv" class="file-input"><div id="importPreview"></div></section><section class="panel"><span class="section-kicker">RESPALDOS</span><h3>Seguridad</h3><p>Backup completo JSON y exportación de movimientos. Para conservar PDFs/Excel ante pérdida de PC, configurá Firebase Storage.</p><button class="secondary-button" id="backupButton">Descargar backup completo</button><button class="secondary-button" id="exportExcelButton">Exportar Excel Blunno</button></section></div><section class="panel"><span class="section-kicker">SINCRONIZACIÓN REAL</span><h3>Control doble</h3><p>El navegador no puede vigilar silenciosamente un archivo local de Windows. Esta versión evita duplicados por una clave de origen; para sincronización automática permanente, usá el Excel dentro de Google Drive/OneDrive y conectá el proveedor de archivos o un agente de escritorio.</p></section>`}

function renderPeriodModal(){return Store.db.periods.slice().sort((a,b)=>String(b.id).localeCompare(String(a.id)));}
function renderView(view,content,period,branch="General",compareA=prevPeriod(period),compareB=period){
 const map={dashboard:renderDashboard,income:renderIncome,cash:renderCash,providers:renderProviders,invoices:renderInvoices,expenses:renderExpenses,investments:renderInvestments,people:renderPeople,hours:renderHours,results:renderResults,compare:renderCompare,tasks:renderTasks,agent:renderAgent,close:renderClose,files:renderFiles,history:renderHistory,trash:renderTrash,import:renderImport};
 if(view==="compare") return renderCompare(content,period,branch,compareA,compareB);
 (map[view]||renderDashboard)(content,period,branch);
}

__BLUNNO_MODULES.views = { esc, formSchema, renderDashboard, renderCash, renderIncome, renderProviders, renderInvoices, renderExpenses, renderInvestments, renderPeople, renderHours, renderResults, renderCompare, renderTasks, renderAgent, renderClose, renderFiles, renderHistory, renderTrash, renderImport, renderPeriodModal, renderView };
})();

// ===== MODULE: web (web.js) =====
(() => {
const { CONFIG, periodLabel, nextPeriod, prevPeriod, dateLabel, dateTimeLabel, today, now, daysInPeriod, isoDate, money, number } = __BLUNNO_MODULES.config;
const { Store } = __BLUNNO_MODULES.store;
const { firebaseEnabled, uploadFile } = __BLUNNO_MODULES.firebase;
const { formSchema, renderView, esc } = __BLUNNO_MODULES.views;
const { createSimplePDF } = __BLUNNO_MODULES.pdf-engine;

const $ = s => document.querySelector(s);
const content = $("#content");
let view = "dashboard";
let period = CONFIG.defaultPeriod;
let branch = "General";
let editing = null;
let currentOperator = "";
let agentPerson = "";
let pendingAgent = null;
let compareA = prevPeriod(CONFIG.defaultPeriod);
let compareB = CONFIG.defaultPeriod;
const viewHistory = [];
const viewForward = [];
let pdfDownloadBlob = null;
let pdfDownloadName = "documento-blunno.pdf";

const titles = {
 dashboard:"Panel general", income:"Ingresos", cash:"Caja diaria", providers:"Proveedores", invoices:"Facturas", expenses:"Gastos por categoría", investments:"Gastos de inversión",
 people:"Personal", hours:"Horas mensuales", results:"Resultados", compare:"Comparativas", tasks:"Recordatorios", agent:"Agente BLUNNO", close:"Cierre mensual", files:"Archivos", history:"Historial", trash:"Papelera", import:"Excel / Backup"
};

const toast = (message, ok=true) => {
  const el=$("#toast"); el.textContent=message; el.className=`toast show ${ok?'ok':'bad'}`;
  clearTimeout(window.__blunnoToast); window.__blunnoToast=setTimeout(()=>el.className='toast',3800);
};

function setOperator(name) {
  currentOperator = name || "";
  window.__blunnoResponsible = currentOperator;
  localStorage.removeItem("blunno-operator");
  const label=$("#operatorLabel"); if(label) label.textContent=currentOperator || "Elegir responsable"; const selector=$("#operatorSelector"); if(selector) selector.value=currentOperator;
}

function setBranch(name) {
  branch = CONFIG.profiles.includes(name) ? name : "General"; refresh();
}

function navigate(nextView){ if(nextView===view) return; viewHistory.push(view); viewForward.length=0; view=nextView; refresh(); }
function goBack(){ const previous=viewHistory.pop(); if(previous){ viewForward.push(view); view=previous; refresh(); } else { view="dashboard"; refresh(); } }
function goForward(){ const next=viewForward.pop(); if(next){ viewHistory.push(view); view=next; refresh(); } }

function connection() {
  $("#connectionDot").className=firebaseEnabled?'connected':'local';
  $("#connectionText").textContent=firebaseEnabled?'Firebase + nube':'Modo local';
  $("#userText").textContent=firebaseEnabled?'Autenticación habilitada':'Configurar Firebase para nube y archivos permanentes';
}

function refresh(){
  $("#pageTitle").textContent=titles[view]||"Blunno";
  document.title = `BLUNNO · ${titles[view]||"Control Empresarial"}`;
  const ctx=$("#webContextLabel"); if(ctx) ctx.textContent=`${branch} · ${periodLabel(period)}`;
  const conn=$("#webConnectionLabel"); if(conn) conn.textContent=firebaseEnabled?"Firebase conectado":"Modo local";
  renderView(view,content,period,branch,compareA,compareB);
  wire();
  $("#periodSelector").textContent=periodLabel(period);
  $("#periodState").textContent=Store.periodIsClosed(period,branch)?"CERRADO":"ABIERTO";
  $("#periodDot").className=Store.periodIsClosed(period,branch)?"closed":"open";
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

function openModal(type,id=null){
  const map={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',expense:'expenses',investment:'investments',task:'tasks',income:'incomes'};
  const col=map[type]||type; editing=id?Store.get(col,id):null;
  const schema=formSchema[type]; if(!schema) return;
  $("#modalKicker").textContent=editing?'EDICIÓN CONTROLADA':'NUEVO REGISTRO';
  $("#modalTitle").textContent=editing?'Editar registro':'Nuevo registro';
  $("#formFields").innerHTML=schema.map(x=>fieldHtml(x,editing)).join('');
  for(const [n] of schema){const el=$("#formFields [name=\""+n+"\"]"); if(!el) continue; if(editing?.[n]!==undefined){if(el.type==='checkbox')el.checked=!!editing[n];else if(el.type==='date')el.value=String(editing[n]||'').slice(0,10);else el.value=editing[n];}}
  const d=$("#formFields [name=date]"); if(d&&!editing)d.value=today();
  const branchField=$("#formFields [name=branch]"); if(branchField&&!editing&&branch!=="General")branchField.value=branch;
  const op=$("#recordResponsible"); op.value=currentOperator;
  $("#recordForm").dataset.type=type;
  $("#modal").classList.remove('hidden');
  $("#formFields input,#formFields select,#formFields textarea")[0]?.focus();
  wireProviderDatalist();
}
function closeModal(){$("#modal").classList.add('hidden');editing=null;}

async function saveRecord(e){
  e.preventDefault();
  const type=e.target.dataset.type;
  const responsible=$("#recordResponsible").value;
  const raw=Object.fromEntries(new FormData(e.target).entries());
  const data={...raw};
  for(const k of ['amount','expected','paidAmount','hourlyRate','hours','advance','merchandise']) if(k in data) data[k]=Number(data[k]||0);
  if(type==='hours'){ const emp=Store.list('employees').find(x=>x.name.toLowerCase()===String(data.employee||'').toLowerCase()); if(!emp) throw new Error('No se encontró el empleado. Usá el nombre de la ficha de Personal.'); data.employeeId=emp.id; data.employee=emp.name; data.branch=emp.branch; data.period=(data.date||today()).slice(0,7); data.salaryCost=Number(data.hours||0)*Number(emp.hourlyRate||0); }
  if('lateMovement' in data) data.lateMovement = $("#formFields [name=lateMovement]")?.checked || false;
  if(type==='invoice'){data.period=(data.operationDate||today()).slice(0,7);data.loadDate=editing?.loadDate||now();delete data.paidAmount;delete data.status;delete data.dueDate;}
  if(['cash','expense','investment','income'].includes(type)) data.period=(data.date||today()).slice(0,7);
  if(type==='cash') data.branch=data.branch==='General'?branch:data.branch;
  if(type==='income') data.branch=data.branch==='General'?branch:data.branch;
  if(['expense','investment','income','cash','invoice'].includes(type) && (data.branch==='General' || (branch==='General' && !data.branch))) throw new Error('Elegí una sucursal concreta para cargar este movimiento. General es solo una vista consolidada.');
  if(type==='task') data.status=editing?.status||'pending';
  if(['cash','invoice','expense','investment','income','employee'].includes(type) && !data.branch) throw new Error('Seleccioná la sucursal. No se guarda ningún movimiento sin sucursal.');
  if(type==='employee') data.active=data.active!=='false';
  try{
    const collection={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',hours:'hours',expense:'expenses',investment:'investments',income:'incomes',task:'tasks'}[type];
    if(!collection) throw new Error('Tipo de registro inválido.');
    if(editing) await Store.update(collection,editing.id,data,responsible,'Edición controlada desde formulario',{lateMovement:data.lateMovement});
    else await Store.add(collection,data,responsible,'Alta controlada desde formulario',{lateMovement:data.lateMovement});
    if(data.lateMovement && data.period){const latest=Store.db.closures.filter(x=>x.period===data.period&&x.branch===(data.branch||'General')&&x.status==='closed').sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];if(latest) await generateClosurePDF(latest);}
    closeModal();  toast(data.lateMovement?'Movimiento tardío guardado; cierre actualizado y documentado.':(editing?'Cambios guardados y auditados':'Guardado con éxito')); refresh();
  }catch(err){toast(err.message||'No se pudo guardar',false)}
}

function wireProviderDatalist(){
  const inputs=[...document.querySelectorAll('input[name=provider],input[name=name]')];
  inputs.forEach(i=>{ if(i.name!=='provider' && !$("#recordForm")?.dataset.type?.includes('invoice')) return; i.setAttribute('list','providerList'); });
  let dl=$("#providerList"); if(!dl){dl=document.createElement('datalist');dl.id='providerList';document.body.appendChild(dl)}
  dl.innerHTML=Store.list('providers').filter(x=>x.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'es')).map(x=>`<option value="${esc(x.name)}"></option>`).join('');
}

function wire(){
  document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>openModal(b.dataset.new));
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(b.dataset.edit,b.dataset.id));
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.delete,b.dataset.id));
  document.querySelectorAll('[data-bulk-select-all]').forEach(b=>b.onchange=()=>document.querySelectorAll(`[data-bulk-select="${b.dataset.bulkSelectAll}"]`).forEach(x=>x.checked=b.checked));
  document.querySelectorAll('[data-bulk-delete]').forEach(b=>b.onclick=()=>bulkDelete(b.dataset.bulkDelete));
  document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>restoreRecord(b.dataset.restore,b.dataset.id));
  document.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>{const next=b.dataset.profile;if(next===branch)return;if(confirm(`¿Estás seguro de cambiar de sucursal/perfil?\n\nActual: ${branch}\nNuevo: ${next}\n\nNo se mezclan datos: solo cambia la vista.`))setBranch(next);});
  document.querySelectorAll('[data-compare-select]').forEach(s=>s.onchange=()=>{if(s.dataset.compareSelect==='a')compareA=s.value;else compareB=s.value;refresh()});
  document.querySelectorAll('[data-view-jump]').forEach(b=>b.onclick=()=>navigate(b.dataset.viewJump));
  document.querySelectorAll('[data-complete-task]').forEach(b=>b.onclick=()=>completeTask(b.dataset.completeTask));
  document.querySelectorAll('[data-liquidate]').forEach(b=>b.onclick=()=>openLiquidation(b.dataset.liquidate));
  document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>showDetail(b.dataset.detail,b.dataset.id)); document.querySelectorAll('[data-provider-history]').forEach(b=>b.onclick=()=>showProviderHistory(b.dataset.providerHistory));
  document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>{$('.sheet-wrap')?.scrollBy({left:b.dataset.scroll==='right'?500:-500,behavior:'smooth'})});
 
  document.querySelectorAll('[data-hour-cell] input').forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.dataset.advance='1';input.blur()}});input.addEventListener('blur',()=>saveHourCell(input));});
  document.querySelectorAll('[data-cash-cell] input').forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur()}});input.addEventListener('blur',()=>saveCashCell(input));});
  document.querySelectorAll('[data-cash-add-row]').forEach(b=>b.onclick=()=>addCashConcept(b.dataset.cashAddRow));
  document.querySelectorAll('[data-hours-adjust]').forEach(b=>b.onclick=()=>editEmployeeAdjustment(b.dataset.employeeAdjust,b.dataset.hoursAdjust));
  $('#hoursEmployeeFilter')?.addEventListener('change',e=>{localStorage.setItem('blunno-hours-employee',e.target.value);refresh()});
  $('#trashRestoreSelected')?.addEventListener('click',restoreSelectedTrash);
  $('#trashPurgeSelected')?.addEventListener('click',purgeSelectedTrash);
  $('#trashEmpty')?.addEventListener('click',purgeAllTrash);
  $('#trashSelectAll')?.addEventListener('change',e=>document.querySelectorAll('.trash-select').forEach(x=>x.checked=e.target.checked));
  document.querySelectorAll('[data-purge]').forEach(b=>b.onclick=()=>purgeOneTrash(b.dataset.purge,b.dataset.id));
  document.querySelectorAll('[data-agent-person]').forEach(b=>b.onclick=()=>rememberAgentPerson(b.dataset.agentPerson));
  document.querySelectorAll('[data-agent-prompt]').forEach(b=>b.onclick=()=>{const i=$('#agentInput');if(i){i.value=b.dataset.agentPrompt;i.focus()}});
  $('#agentSend')?.addEventListener('click',agentText);
  $('#backBtn')?.addEventListener('click',goBack); $('#forwardBtn')?.addEventListener('click',goForward);
  $('#closePdfSuccess')?.addEventListener('click',closePdfSuccess);
  document.querySelectorAll('[data-close-pdf-success]').forEach(b=>b.onclick=closePdfSuccess);
  $('#pdfSuccessDownload')?.addEventListener('click',()=>{ if(pdfDownloadBlob) downloadBlob(pdfDownloadBlob,pdfDownloadName); });
  document.querySelectorAll('[data-pdf-close]').forEach(b=>b.onclick=()=>generateAndShowViewPDF(b.dataset.pdfClose));
  document.querySelectorAll('[data-view-file]').forEach(b=>b.onclick=()=>viewStoredFile(b.dataset.viewFile));
  document.querySelectorAll('[data-download-file]').forEach(b=>b.onclick=()=>downloadStoredFile(b.dataset.downloadFile));
  document.querySelectorAll('[data-dashboard-detail]').forEach(b=>b.onclick=()=>showDashboardDetail(b.dataset.dashboardDetail));
  document.querySelectorAll('[data-invoice-quick-save]').forEach(b=>b.onclick=quickInvoiceSave);
  $('#cashOpeningButton')?.addEventListener('click',editCashOpening);
  document.querySelectorAll('[data-hours-focus]').forEach(b=>b.onclick=()=>document.querySelector('[data-hour-cell] input')?.focus());
  $('#agentInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();agentText()}});
  $('#agentMic')?.addEventListener('click',startSpeech);
 
  document.querySelectorAll('[data-undo-agent]').forEach(b=>b.onclick=()=>undoAgent(b.dataset.undoCollection,b.dataset.undoAgent));
  document.querySelectorAll('[data-close-period]').forEach(b=>b.onclick=openCloseConfirm);
  document.querySelectorAll('[data-close-version]').forEach(b=>b.onclick=()=>{const c=Store.getRaw('closures',b.dataset.closeVersion);if(c)generateClosurePDF(c)});
  document.querySelectorAll('[data-reopen-period]').forEach(b=>b.onclick=openReopenConfirm);
  $("#exportAudit")?.addEventListener('click',()=>download(`auditoria-blunno-${today()}.json`,JSON.stringify(Store.db.audit,null,2),'application/json'));
  $("#backupButton")?.addEventListener('click',()=>Store.exportJson());
  $("#exportExcelButton")?.addEventListener('click',exportExcel);
  $("#excelInput")?.addEventListener('change',handleExcel);
 
}

async function deleteRecord(collection,id){
  if(!currentOperator){toast('Elegí el responsable antes de eliminar.',false);return}
  if(!confirm('¿Mover este registro a la papelera? Se conserva y se puede restaurar.')) return;
  try{await Store.remove(collection,id,currentOperator,'Baja lógica confirmada');toast('El movimiento se encuentra en la papelera.');refresh()}catch(e){toast(e.message,false)}
}
async function restoreRecord(collection,id){if(!currentOperator){toast('Elegí el responsable antes de restaurar.',false);return}try{await Store.restore(collection,id,currentOperator);toast('Restaurado con éxito.');refresh()}catch(e){toast(e.message,false)}}
async function bulkDelete(collection){
  if(!currentOperator){toast('Elegí el responsable antes de eliminar.',false);return;}
  const items=[...document.querySelectorAll(`[data-bulk-select="${collection}"]:checked`)].map(x=>x.dataset.id);
  if(!items.length){toast('Seleccioná al menos un elemento.',false);return;}
  if(!confirm(`¿Mover ${items.length} elemento(s) a la papelera?`))return;
  try{for(const id of items)await Store.remove(collection,id,currentOperator,'Baja lógica seleccionada');toast('Los elementos seleccionados fueron enviados a la papelera.');refresh();}catch(e){toast(e.message,false)}
}

function selectedTrash(){return [...document.querySelectorAll('.trash-select:checked')].map(x=>({collection:x.dataset.collection,id:x.dataset.id}));}
async function restoreSelectedTrash(){const items=selectedTrash();if(!items.length){toast('Seleccioná al menos un elemento.',false);return}if(!currentOperator){toast('Elegí responsable.',false);return}try{await Store.restoreMany(items,currentOperator);toast('Restaurado con éxito.');refresh()}catch(e){toast(e.message,false)}}
async function purgeSelectedTrash(){const items=selectedTrash();if(!items.length){toast('Seleccioná al menos un elemento.',false);return}if(!currentOperator){toast('Elegí responsable.',false);return}if(!confirm(`¿Eliminar definitivamente ${items.length} elemento(s)? Esta acción no se puede deshacer.`))return;try{await Store.purgeTrashMany(items,currentOperator);toast('Elementos eliminados definitivamente.');refresh()}catch(e){toast(e.message,false)}}
async function purgeAllTrash(){if(!currentOperator){toast('Elegí responsable.',false);return}const items=Store.trash();if(!items.length)return toast('La papelera ya está vacía.');if(!confirm(`¿Vaciar definitivamente toda la papelera (${items.length} elementos)?`))return;try{await Store.purgeTrashMany(items,currentOperator);toast('Papelera vaciada definitivamente.');refresh()}catch(e){toast(e.message,false)}}
async function purgeOneTrash(collection,id){if(!currentOperator){toast('Elegí responsable.',false);return}if(!confirm('¿Eliminar definitivamente este elemento? Esta acción no se puede deshacer.'))return;try{await Store.purgeTrashItem(collection,id,currentOperator);toast('Eliminado definitivamente.');refresh()}catch(e){toast(e.message,false)}}

async function completeTask(id){try{await Store.completeTask(id,currentOperator);toast('Recordatorio marcado como realizado.');refresh()}catch(e){toast(e.message,false)}}

async function saveHourCell(input){
 if(!currentOperator){toast('Elegí responsable antes de cargar horas.',false);input.blur();return}
 const td=input.closest('td'); const date=td?.dataset.hourDate, employeeId=td?.dataset.employee; if(!date||!employeeId)return;
 const employee=Store.get('employees',employeeId); if(!employee)return;
 const existing=Store.list('hours',period,branch).find(x=>x.employeeId===employeeId&&x.date===date);
 const value=input.value.trim();
 try{
   if(!value){if(existing) await Store.remove('hours',existing.id,currentOperator,'Borrado de celda de horas');}
   else {
     const normalized=value.replace(',','.');
     const holidayKey=/^(h|feriado)$/i.test(normalized); const isStatus=/^(f|franco|si|no)$/i.test(normalized);
     const hours=holidayKey?(existing?.hours||8):(isStatus?0:Number(normalized));
     if(!isStatus&&!holidayKey&&(!Number.isFinite(hours)||hours<0||hours>24)) throw new Error('Ingresá horas entre 0 y 24, F = franco, H = feriado.');
     const displayValue=holidayKey?`${hours}H`:(isStatus?normalized.toUpperCase():hours);
     const data={period,date,branch:employee.branch,employeeId,employee:employee.name,hours,displayValue,status:isStatus?normalized.toLowerCase():'',advance:existing?.advance||0,merchandise:existing?.merchandise||0,holiday:holidayKey?'yes':(isStatus?'no':'no'),salaryCost:hours*Number(employee.hourlyRate||0),notes:existing?.notes||''};
     if(existing) await Store.update('hours',existing.id,data,currentOperator,'Edición directa de planilla');
     else await Store.add('hours',data,currentOperator,'Carga directa de planilla');
   }
   toast('Celda guardada y auditada.');
   if(input.dataset.advance==='1'){delete input.dataset.advance;const next=input.closest('td')?.nextElementSibling?.querySelector('input');if(next){next.focus();next.select();}else refresh();} else refresh();
 }catch(e){toast(e.message,false)}
}

async function saveCashCell(input){
 if(!currentOperator){toast('Elegí responsable antes de cargar caja.',false);return}
 const td=input.closest('td'); const date=td?.dataset.date, type=td?.dataset.type, concept=td?.dataset.concept; if(!date||!type||!concept)return;
 const existing=Store.list('cash',period,branch).find(x=>x.date===date&&x.type===type&&(x.concept||'Sin concepto')===concept);
 const value=input.value.trim();
 try{
   if(!value){if(existing) await Store.remove('cash',existing.id,currentOperator,'Borrado de celda de caja');}
   else {const amount=Number(value.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<0)throw new Error('Ingresá un importe válido.');const data={period,date,branch:type?branch:'General',type,concept,amount,expected:existing?.expected||0,notes:existing?.notes||''};if(existing)await Store.update('cash',existing.id,data,currentOperator,'Edición directa de planilla de caja');else await Store.add('cash',data,currentOperator,'Carga directa de planilla de caja');}
   toast('Importe guardado y auditado.'); refresh();
 }catch(e){toast(e.message,false)}
}

function addCashConcept(type){
 if(!currentOperator){toast('Elegí responsable antes de agregar un concepto.',false);return}
 const concept=prompt(type==='income'?'Nombre del cliente / concepto de ingreso:':'Nombre del proveedor / concepto de gasto:');
 if(!concept?.trim())return;
 const date=today(); const data={period,date,branch:branch==='General'?CONFIG.branches[0]:branch,type,concept:concept.trim(),amount:0,expected:0,notes:''};
 Store.add('cash',data,currentOperator,'Alta de concepto para planilla de caja').then(()=>{toast('Concepto agregado a la planilla.');refresh()}).catch(e=>toast(e.message,false));
}
async function editEmployeeAdjustment(employeeId,field){
 if(!currentOperator){toast('Elegí responsable.',false);return}
 const employee=Store.get('employees',employeeId);if(!employee)return;
 const type=field==='advance'?'advance':'merchandise';
 const label=type==='advance'?'adelantos / vales':'mercadería';
 const existing=Store.list('employeeDebts',period,branch).find(x=>x.employeeId===employeeId&&x.type===type);
 const current=Number(existing?.amount||0); const raw=prompt(`Monto mensual de ${label} para ${employee.name}:`,String(current)); if(raw===null)return;
 const amount=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<0){toast('Ingresá un monto válido.',false);return}
 try{const data={period,branch:employee.branch,employeeId,employee:employee.name,type,amount};if(existing)await Store.update('employeeDebts',existing.id,data,currentOperator,`Edición de ${label}`);else await Store.add('employeeDebts',data,currentOperator,`Carga de ${label}`);toast(`${label} actualizado y auditado.`);refresh()}catch(e){toast(e.message,false)}
}

function openLiquidation(employeeId){
  const e=Store.get('employees',employeeId); if(!e)return; const rows=Store.list('hours',period,branch).filter(x=>x.employeeId===employeeId); const debts=Store.list('employeeDebts',period,branch).filter(x=>x.employeeId===employeeId), hours=rows.reduce((s,x)=>s+Number(x.hours||0),0), holidays=rows.filter(x=>x.holiday==='yes').reduce((s,x)=>s+Number(x.hours||0),0), advance=rows.reduce((s,x)=>s+Number(x.advance||0),0)+debts.filter(x=>x.type==='advance').reduce((s,x)=>s+Number(x.amount||0),0), merchandise=rows.reduce((s,x)=>s+Number(x.merchandise||0),0)+debts.filter(x=>x.type==='merchandise').reduce((s,x)=>s+Number(x.amount||0),0);
  $("#liquidationBody").innerHTML=`<div class="liquidation-grid"><div><span>Empleado</span><b>${esc(e.name)}</b></div><div><span>Horas normales</span><b>${hours-holidays}</b></div><div><span>Horas feriado</span><b>${holidays}</b></div><div><span>Adelantos</span><b>${money(advance)}</b></div><div><span>Mercadería</span><b>${money(merchandise)}</b></div></div><label class="field">Valor hora<input id="liqRate" type="number" min="0" step="0.01" value="${Number(e.hourlyRate||0)}"></label><label class="field">Valor hora feriado<input id="liqHolidayRate" type="number" min="0" step="0.01" value="${Number(e.hourlyRate||0)*2}"></label><div id="liqTotal" class="liq-total"></div><div class="modal-footer"><button class="secondary-button" data-close-liquidation>Cancelar</button><button class="primary-button" id="saveLiquidation">Totalizar sueldo</button></div>`;
  const calc=()=>{const r=Number($('#liqRate').value||0),hr=Number($('#liqHolidayRate').value||0),gross=(hours-holidays)*r+holidays*hr,net=gross-advance-merchandise;$('#liqTotal').innerHTML=`<b>Sueldo bruto: ${money(gross)}</b><b>${net>=0?'A cobrar':'Deuda a favor de Blunno'}: ${money(Math.abs(net))}</b>`;return{r,hr,gross,net}};$('#liqRate').oninput=calc;$('#liqHolidayRate').oninput=calc;calc();$('#saveLiquidation').onclick=async()=>{try{const c=calc();const liq=await Store.add('liquidations',{period,branch,employeeId,employee:e.name,normalHours:hours-holidays,holidayHours:holidays,hourlyRate:c.r,holidayRate:c.hr,advance,merchandise,gross:c.gross,net:c.net,responsible:currentOperator},currentOperator,'Totalización de sueldo');const blob=createSimplePDF('Liquidación de sueldo',`${e.name} · ${periodLabel(period)} · ${branch}`,[['Empleado',e.name],['Horas normales',number(hours-holidays)],['Horas feriado',number(holidays)],['Valor hora',money(c.r)],['Valor feriado',money(c.hr)],['Adelantos',money(advance)],['Mercadería',money(merchandise)],['Sueldo bruto',money(c.gross)],['Neto / a cobrar',money(c.net)],['Responsable',currentOperator]],'La liquidación queda registrada en el historial de Blunno.');const name=`liquidacion-${e.name.replace(/\s+/g,'-').toLowerCase()}-${period}.pdf`;if(blob){await Store.archiveFile({name,sector:'Liquidaciones',period,branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),blob});$('#liquidationModal').classList.add('hidden');showPdfSuccess('Liquidación guardada correctamente',`La liquidación de ${e.name} fue registrada y auditada.`,`<b>${name}</b><span>Responsable: ${esc(currentOperator)} · ${dateTimeLabel(now())}</span>`,blob,name)}else{$('#liquidationModal').classList.add('hidden');toast('Sueldo totalizado y auditado.')}refresh()}catch(err){toast(err.message,false)}};document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden'));$('#liquidationModal').classList.remove('hidden');
}

function showProviderHistory(provider){
  const all = Store.list('invoices', period, branch);
  const inv = all.filter(function(x){ return x.provider === provider; });
  inv.sort(function(a,b){
    return String(b.operationDate || '').localeCompare(String(a.operationDate || ''));
  });
  const total = inv.reduce(function(sum,x){ return sum + Number(x.amount || 0); }, 0);
  $('#detailTitle').textContent = 'Historial · ' + provider;
  let body = '<div class=\"panel\">';
  body += '<div class=\"mini-kpis\">' + money(total) + ' · ' + inv.length + ' facturas</div>';
  if(inv.length){
    body += '<div class=\"table-wrap\"><table><thead><tr>' +
      '<th>Factura</th><th>Fecha movimiento</th><th>Fecha carga</th><th>Sucursal</th><th>Importe</th><th>Estado</th>' +
      '</tr></thead><tbody>';
    inv.forEach(function(x){
      body += '<tr>' +
        '<td>' + esc(x.number || '—') + '</td>' +
        '<td>' + dateLabel(x.operationDate || x.date) + '</td>' +
        '<td>' + dateTimeLabel(x.loadDate || x.createdAt) + '</td>' +
        '<td>' + esc(x.branch || '—') + '</td>' +
        '<td>' + money(x.amount) + '</td>' +
        '<td>' + esc(x.status || 'pendiente') + '</td>' +
        '</tr>';
    });
    body += '</tbody></table></div>';
  } else {
    body += '<div class=\"empty-block\">No hay facturas de este proveedor en el período/perfil seleccionado.</div>';
  }
  body += '<div class=\"modal-footer\"><button class=\"primary-button\" id=\"providerHistoryPdf\">Descargar PDF</button></div></div>';
  $('#detailBody').innerHTML = body;
  $('#detailModal').classList.remove('hidden');
  $('#providerHistoryPdf').onclick = function(){ generateProviderHistoryPDF(provider, inv); };
}
async function generateProviderHistoryPDF(provider,inv){
 if(!currentOperator){toast('Elegí responsable antes de generar el PDF.',false);return;}
 const rows=[['Proveedor',provider],['Período',periodLabel(period)],['Perfil',branch],['Cantidad de facturas',inv.length],['Total',money(inv.reduce((s,x)=>s+Number(x.amount||0),0))],...inv.map((x,i)=>[`Factura ${i+1}`,`${x.number||'—'} · ${dateLabel(x.operationDate||x.date)} · ${money(x.amount)} · ${x.branch}`])];
 const blob=createSimplePDF('HISTORIAL DE PROVEEDOR',`${provider} · ${periodLabel(period)} · ${branch}`,rows,'Cada factura es un movimiento independiente, incluso cuando se repite un número o importe.'); if(!blob)return;
 const name=`historial-${provider.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${period}.pdf`; showPdfSuccess('Historial listo',`Se generó el historial completo de ${provider}.`,`<b>${esc(name)}</b><span>Responsable: ${esc(currentOperator)} · ${esc(dateTimeLabel(now()))}</span>`,blob,name);
 const dataUrl=await blobToDataURL(blob); try{await Store.add('files',{name,sector:'Historial de proveedor',period,branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),dataUrl},currentOperator,'PDF de historial de proveedor generado')}catch(e){toast(e.message,false)}
}

function showDashboardDetail(kind){
 const s=Store.summary(period,branch); let title='',items=[];
 if(kind==='income'){title='Detalle de ingresos';items=Store.list('incomes',period,branch).map(x=>[dateLabel(x.date),`${x.concept||'Sin concepto'} · ${money(x.amount)}`]);}
 if(kind==='expenses'){title='Detalle de gastos del local';items=Store.list('expenses',period,branch).map(x=>[dateLabel(x.date),`${x.category} · ${x.concept||'Sin concepto'} · ${money(x.amount)}`]);}
 if(kind==='providers'){title='Detalle de proveedores';items=Store.list('invoices',period,branch).map(x=>[dateLabel(x.operationDate||x.date),`${x.provider} · Factura ${x.number||'—'} · ${money(x.amount)}`]);}
 if(kind==='investments'){title='Detalle de inversiones';items=Store.list('investments',period,branch).map(x=>[dateLabel(x.date),`${x.concept||'Sin concepto'} · ${money(x.amount)}`]);}
 if(kind==='salary'){title='Detalle de personal';items=Store.list('liquidations',period,branch).map(x=>[x.employee,`${money(x.gross||0)} · ${number(x.normalHours||0)} h normales · ${number(x.holidayHours||0)} h feriado`]);if(!items.length)items=Store.list('hours',period,branch).map(x=>[x.employee,`${dateLabel(x.date)} · ${number(x.hours||0)} h`]);}
 if(kind==='result'){title='Cómo se calcula el resultado';items=[['Ingresos',money(s.income)],['Gastos del local',`− ${money(s.localExpense)}`],['Proveedores',`− ${money(s.providers)}`],['Inversiones',`− ${money(s.investment)}`],['Personal',`− ${money(s.salary)}`],['Resultado',money(s.result)],['Caja diaria','NO está incluida']];}
 $('#detailTitle').textContent=title;$('#detailBody').innerHTML=`<div class="detail-summary-list">${items.length?items.map(([a,b])=>`<div><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join(''):'<div class="empty-block">No hay movimientos para este indicador.</div>'}</div>`;$('#detailModal').classList.remove('hidden');
}

function showDetail(collection,id){const x=Store.get(collection,id);if(!x)return;$('#detailTitle').textContent=collection==='invoices'?'Detalle de factura':'Detalle';$('#detailBody').innerHTML=`<div class="detail-grid">${Object.entries(x).filter(([k])=>!['id','deleted'].includes(k)).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(typeof v==='object'?JSON.stringify(v):v)}</b></div>`).join('')}</div>`;$('#detailModal').classList.remove('hidden')}

function openPeriodModal(){const list=Store.db.periods.sort((a,b)=>b.id.localeCompare(a.id));$('#periodBody').innerHTML=`<div class="period-create"><label class="field">Ir a período<input id="periodInput" type="month" value="${period}"></label><button class="primary-button" id="goPeriod">Abrir</button></div>${list.map(p=>`<button class="period-row" data-select-period="${p.id}"><b>${periodLabel(p.id)}</b><span class="status-pill ${p.status==='closed'?'muted':'success'}">${p.status==='closed'?'CERRADO':'ABIERTO'}</span></button>`).join('')}`;$('#periodModal').classList.remove('hidden');$('#goPeriod').onclick=()=>{period=$('#periodInput').value;Store.setPeriod(period);$('#periodModal').classList.add('hidden');refresh()};document.querySelectorAll('[data-select-period]').forEach(b=>b.onclick=()=>{period=b.dataset.selectPeriod;$('#periodModal').classList.add('hidden');refresh()})}

async function openCloseConfirm(){
 if(!currentOperator){toast('Elegí responsable antes del cierre.',false);return}
 const s=Store.summary(period,branch);
 if(Store.periodIsClosed(period,branch)){toast('Este perfil ya está cerrado.');return}
 const blockers=[];
 if(!period||!/^[0-9]{4}-[0-9]{2}$/.test(period)) blockers.push('Período inválido.');
 if(!branch) blockers.push('Perfil inválido.');
 if(blockers.length){toast(blockers.join(' '),false);return}
 const checks=[
  ['Caja diaria revisada',`${s.cashCount} movimientos · control ${money(s.cashControl)}`],
  ['Ingresos revisados',money(s.income)],
  ['Proveedores / facturas revisados',`${s.invoiceCount} facturas · ${money(s.providers)}`],
  ['Gastos del local revisados',`${s.expenseCount} registros · ${money(s.localExpense)}`],
  ['Inversiones revisadas',`${s.investmentCount} registros · ${money(s.investment)}`],
  ['Horas y liquidaciones revisadas',`${number(s.hours)} horas · ${s.liquidationCount} liquidaciones`],
  ['Resultado revisado',money(s.result)]
 ];
 $('#closeConfirmBody').innerHTML=`<div class="close-summary"><div><span>Período</span><b>${periodLabel(period)}</b></div><div><span>Perfil</span><b>${esc(branch)}</b></div><div><span>Resultado</span><b>${money(s.result)}</b></div><div><span>Siguiente período</span><b>${periodLabel(nextPeriod(period))}</b></div></div><div class="close-preflight">${checks.map((c,i)=>`<label><input type="checkbox" data-close-check="${i}"> <span><b>${esc(c[0])}</b><small>${esc(c[1])}</small></span></label>`).join('')}</div><label class="field">Observaciones / diferencias<textarea id="closeObservation" rows="3" placeholder="Dejá constancia de diferencias o aclaraciones."></textarea></label><button class="primary-button full-button" id="confirmCloseBtn">Confirmar cierre y generar PDF</button>`;
 $('#closeConfirmModal').classList.remove('hidden');
 $('#confirmCloseBtn').onclick=async()=>{
   const checks=[...document.querySelectorAll('[data-close-check]')];
   if(checks.some(x=>!x.checked)){toast('Debés confirmar todos los puntos del control previo.',false);return}
   const observations=$('#closeObservation').value.trim();
   try{
     const closure=await Store.closePeriod(period,nextPeriod(period),currentOperator,s,observations,checks.map((x,i)=>({index:i,confirmed:true,at:now()})));
     $('#closeConfirmModal').classList.add('hidden');refresh();await generateClosurePDF(closure);
   }catch(e){toast(e.message,false)}
 };
}
async function openReopenConfirm(){const reason=prompt('Motivo obligatorio para reabrir el período:');if(!reason?.trim())return;try{await Store.reopenPeriod(period,branch,currentOperator,reason);toast('Período reabierto y auditado.');refresh()}catch(e){toast(e.message,false)}}

async function generateClosurePDF(closure){
    const s=closure.summary||{};
  const rows=[['Período',periodLabel(closure.period)],['Sucursal / perfil',closure.branch],['Versión',closure.version],['Responsable del cierre',closure.responsible],['Fecha y hora exactas',dateTimeLabel(closure.closedAt)],['Ingresos',money(s.income)],['Gastos de caja',money(s.cashExpense)],['Gastos del local',money(s.localExpense)],['Proveedores facturados',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Control de caja',money(s.cashControl)],['Facturas',s.invoiceCount||0],['Horas',number(s.hours||0)],['Observaciones',closure.observations||'Sin observaciones.']];
  const blob=createSimplePDF('CIERRE MENSUAL',`Documento oficial de cierre · ${periodLabel(closure.period)} · ${closure.branch}`,rows,'Este documento conserva la versión del cierre. Los cambios posteriores generan una nueva versión y mantienen la trazabilidad.');
  if(!blob)return null;
  const safe=`cierre-${closure.period}-${String(closure.branch).replace(/\\s+/g,'-').toLowerCase()}-v${closure.version}.pdf`;
  const dataUrl=await blobToDataURL(blob); let url=null;
  try{url=await uploadFile(`archivos/${closure.period}/${closure.branch}/cierres/${safe}`,blob,'application/pdf')}catch(e){console.warn('Storage PDF',e)}
  const existing=Store.db.files.find(x=>x.name===safe&&!x.deleted);
  if(!existing){await Store.archiveFile({name:safe,sector:'Cierre mensual',period:closure.period,branch:closure.branch,responsible:closure.responsible,mime:'application/pdf',createdAt:now(),url,storagePath:`archivos/${closure.period}/${closure.branch}/cierres/${safe}`,blob});}
  showPdfSuccess('Cierre mensual listo',`El cierre de ${periodLabel(closure.period)} quedó registrado como versión ${closure.version}.`,`<b>${esc(safe)}</b><span>Perfil: ${esc(closure.branch)} · Responsable: ${esc(closure.responsible)} · ${esc(dateTimeLabel(closure.closedAt))}</span>`,blob,safe);
  return blob;
}
const blobToDataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
const downloadBlob=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
const download=(name,data,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};

function showPdfSuccess(title,description,meta,blob,name){pdfDownloadBlob=blob;pdfDownloadName=name;$('#pdfSuccessTitle').textContent=title;$('#pdfSuccessDescription').textContent=description;$('#pdfSuccessMeta').innerHTML=meta||'';$('#pdfSuccessModal').classList.remove('hidden');}
function closePdfSuccess(){$('#pdfSuccessModal').classList.add('hidden');pdfDownloadBlob=null;}

async function generateAndShowViewPDF(type){
  if(!currentOperator){toast('Elegí el responsable en la barra superior antes de generar un PDF.',false);return}
  const s=Store.summary(period,branch); let rows=[]; let title='Documento BLUNNO'; let desc='Documento generado desde Control Empresarial Blunno.';
  const addRecords=(label,list,formatter)=>list.forEach((x,i)=>rows.push([`${label} ${i+1}`,formatter(x)]));
  if(type==='dashboard'){title='RESUMEN GENERAL BLUNNO';desc=`Resumen de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Ingresos',money(s.income)],['Gastos del local',money(s.localExpense)],['Proveedores',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Caja diaria','SEPARADA · no incluida en el resultado']];}
  else   if(type==='cash'){const list=Store.list('cash',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='CAJA DIARIA · CONTROL COMPLETO';desc=`Caja de ${periodLabel(period)} · ${branch}`;const days=daysInPeriod(period);let saldo=getCashOpening();const daily=[];for(let d=1;d<=days;d++){const date=isoDate(period,d),inc=list.filter(x=>x.date===date&&x.type==='income').reduce((a,x)=>a+Number(x.amount||0),0),exp=list.filter(x=>x.date===date&&x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0),opening=saldo;saldo=opening+inc-exp;daily.push([`Día ${d}`,`${dateLabel(date)} · Saldo anterior ${money(opening)} · Ingresos ${money(inc)} · Gastos ${money(exp)} · RESTO ${money(saldo)}`])}rows=[['Período',periodLabel(period)],['Perfil',branch],['Saldo inicial',money(getCashOpening())],['Ingresos de caja',money(list.filter(x=>x.type==='income').reduce((a,x)=>a+Number(x.amount||0),0))],['Gastos de caja',money(list.filter(x=>x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0))],['Saldo final',money(saldo)],['CONTROL DIARIO','A continuación se detalla cada día']];rows.push(...daily);addRecords('Movimiento',list,x=>`${dateLabel(x.date)} · ${x.type==='income'?'INGRESO':'GASTO'} · ${x.concept||'Sin concepto'} · ${money(x.amount)} · ${x.responsible||'—'}`);}
  else if(type==='income'){const list=Store.list('incomes',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='INGRESOS · DETALLE COMPLETO';desc=`Ingresos independientes de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total ingresos',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Ingreso',list,x=>`${dateLabel(x.date)} · ${x.concept||'Sin concepto'} · ${money(x.amount)} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='invoices'){const list=Store.list('invoices',period,branch).sort((a,b)=>String(a.operationDate||a.date).localeCompare(String(b.operationDate||b.date)));title='FACTURAS · DETALLE COMPLETO';desc=`Facturas cargadas de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Documentos',String(list.length)],['Total facturado',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Factura',list,x=>`${x.provider} · N° ${x.number||'—'} · Movimiento ${dateLabel(x.operationDate||x.date)} · Carga ${dateTimeLabel(x.loadDate||x.createdAt)} · ${money(x.amount)} · CARGADA · Resp.: ${x.responsible||'—'}`);}
  else if(type==='hours'){const list=Store.list('hours',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='HORAS MENSUALES · DETALLE COMPLETO';desc=`Planilla de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Empleados',String(new Set(list.map(x=>x.employeeId)).size)],['Horas',number(list.reduce((a,x)=>a+Number(x.hours||0),0))],['Horas feriado',number(list.filter(x=>x.holiday==='yes').reduce((a,x)=>a+Number(x.hours||0),0))]];addRecords('Carga',list,x=>`${x.employee} · ${dateLabel(x.date)} · ${x.displayValue||x.hours||0} · ${x.holiday==='yes'?'FERIADO':''} · Adelanto ${money(x.advance||0)} · Mercadería ${money(x.merchandise||0)} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='expenses'){const list=Store.list('expenses',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='GASTOS DEL LOCAL · DETALLE COMPLETO';desc=`Gastos del local de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Gasto',list,x=>`${dateLabel(x.date)} · ${x.category} · ${x.concept||'—'} · ${money(x.amount)} · ${x.document||'Sin comprobante'} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='investments'){const list=Store.list('investments',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='INVERSIONES · DETALLE COMPLETO';desc=`Inversiones de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Inversión',list,x=>`${dateLabel(x.date)} · ${x.concept||'—'} · ${money(x.amount)} · ${x.document||'Sin comprobante'} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='providers'){const list=Store.list('invoices',period,branch);title='PROVEEDORES · RESUMEN';desc=`Proveedores y facturación de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Proveedores activos',String(Store.list('providers').filter(x=>x.active!==false).length)],['Facturas cargadas',String(list.length)],['Total facturado',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];[...new Set(list.map(x=>x.provider))].sort((a,b)=>a.localeCompare(b,'es')).forEach(name=>{const p=list.filter(x=>x.provider===name);rows.push([name,`${p.length} facturas · ${money(p.reduce((a,x)=>a+Number(x.amount||0),0))}`])});}
  else if(type==='people'){const list=Store.list('employees').filter(x=>branch==='General'||x.branch===branch);title='PERSONAL · DETALLE';desc=`Personal de ${branch}`;rows=[['Perfil',branch],['Empleados',String(list.length)]];addRecords('Empleado',list,x=>`${x.name} · ${x.branch} · ${x.role||'Sin puesto'} · Valor hora ${money(x.hourlyRate||0)} · ${x.active===false?'INACTIVO':'ACTIVO'}`);}
  else if(type==='results'){title='RESULTADO MENSUAL';desc=`Resultado de ${periodLabel(period)} · ${branch}`;rows=[['Ingresos',money(s.income)],['Gastos del local',money(s.localExpense)],['Proveedores',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Caja diaria','Separada y no incluida']];}
  else if(type==='compare'){const a=Store.summary(compareA,branch),b=Store.summary(compareB,branch);title='COMPARATIVA DE PERÍODOS';desc=`${periodLabel(compareA)} vs ${periodLabel(compareB)} · ${branch}`;rows=[['Período A',periodLabel(compareA)],['Período B',periodLabel(compareB)],['Ingresos A / B',`${money(a.income)} / ${money(b.income)}`],['Gastos local A / B',`${money(a.localExpense)} / ${money(b.localExpense)}`],['Resultado A / B',`${money(a.result)} / ${money(b.result)}`],['Proveedores A / B',`${money(a.providers)} / ${money(b.providers)}`],['Inversiones A / B',`${money(a.investment)} / ${money(b.investment)}`],['Horas A / B',`${number(a.hours)} / ${number(b.hours)}`]];}
  else if(type==='history'){title='HISTORIAL Y AUDITORÍA';desc='Trazabilidad completa de Control Empresarial Blunno';rows=[['Registros',String(Store.db.audit.length)]];addRecords('Registro',Store.db.audit.slice(0,250),x=>`${dateTimeLabel(x.at)} · ${x.action} · ${x.collection} · ${x.responsible||'—'} · ${x.reason||''}`);}
  else if(type==='tasks'){const list=Store.list('tasks').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`));title='RECORDATORIOS';desc='Recordatorios y estado';rows=[['Total',String(list.length)],['Pendientes',String(list.filter(x=>x.status!=='completed').length)],['Realizados',String(list.filter(x=>x.status==='completed').length)]];addRecords('Tarea',list,x=>`${x.title} · ${dateLabel(x.dueDate)} ${x.dueTime||''} · ${x.status==='completed'?'REALIZADA':'PENDIENTE'} · Resp.: ${x.responsible||'—'}`);}
  else return;
  const blob=createSimplePDF(title,desc,rows,'Documento generado por Control Empresarial Blunno. Caja diaria permanece separada del resultado general.');if(!blob)return;
  const safeBase=`${type}-blunno-${period}-${String(branch).replace(/\s+/g,'-').toLowerCase()}`;const name=`${safeBase}-${Date.now()}.pdf`;
  const dataUrl=await blobToDataURL(blob);const storagePath=`archivos/${period}/${String(branch).replace(/\s+/g,'-').toLowerCase()}/${type}/${name}`;let url=null;try{url=await uploadFile(storagePath,blob,'application/pdf')}catch(e){console.warn('Storage PDF',e)}
  try{await Store.archiveFile({name,sector:title,period,branch,generatedBy:currentOperator,responsible:currentOperator,mime:'application/pdf',createdAt:now(),url,storagePath,blob});}catch(e){toast(`El PDF se generó, pero no pudo archivarse: ${e.message}`,false);return}
  showPdfSuccess('PDF listo para descargar',desc,`<b>${esc(name)}</b><span>Ruta: ${esc(storagePath)} · Generado: ${esc(dateTimeLabel(now()))}</span>`,blob,name);
}

async function viewStoredFile(id){
  const f=Store.get('files',id);
  if(!f){toast('No se encontró el archivo.',false);return}
  try{
    const blob=await Store.getFileBlob(id);
    if(!blob){toast('No se encontró una copia visualizable de este archivo.',false);return}
    const url=URL.createObjectURL(blob);
    const win=window.open(url,'_blank','noopener,noreferrer');
    if(!win){toast('El navegador bloqueó la vista previa. Permití ventanas emergentes para Blunno.',false);return}
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){toast(`No se pudo abrir el archivo: ${e.message}`,false)}
}
async function downloadStoredFile(id){const f=Store.get('files',id);if(!f){toast('No se encontró el archivo.',false);return}try{const blob=await Store.getFileBlob(id);if(!blob){toast('No se encontró una copia descargable de este archivo.',false);return}downloadBlob(blob,f.name);toast('Archivo descargado correctamente.')}catch(e){toast(`No se pudo descargar: ${e.message}`,false)}}


function getCashOpening(){const id=`cash-opening-${period}-${branch}`;return Number(Store.db.settings.find(x=>x.id===id)?.amount||0)}
async function editCashOpening(){if(!currentOperator){toast('Elegí responsable antes de modificar el saldo inicial.',false);return}const current=getCashOpening();const raw=prompt(`Saldo con el que arranca la caja de ${periodLabel(period)} · ${branch}:`,String(current));if(raw===null)return;const amount=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount))return toast('Monto inválido.',false);const id=`cash-opening-${period}-${branch}`;const old=Store.db.settings.find(x=>x.id===id);try{const data={id,period,branch,amount,responsible:currentOperator,updatedAt:now()};if(old)await Store.update('settings',id,data,currentOperator,'Actualización de saldo inicial de caja');else await Store.add('settings',data,currentOperator,'Carga de saldo inicial de caja');toast('Saldo inicial guardado y auditado.');refresh()}catch(e){toast(e.message,false)}}
async function quickInvoiceSave(){if(!currentOperator){toast('Elegí responsable antes de cargar facturas.',false);return}if(branch==='General'){toast('Para cargar una factura elegí una sucursal concreta.',false);return}const provider=$('#quickInvoiceProvider')?.value.trim(), amount=Number(($('#quickInvoiceAmount')?.value||'').replace(/\./g,'').replace(',','.')), operationDate=$('#quickInvoiceDate')?.value||today(), number=$('#quickInvoiceNumber')?.value.trim()||'';if(!provider){toast('Indicá el proveedor.',false);return}if(!amount||amount<0){toast('Indicá un importe válido.',false);return}const master=Store.list('providers').find(x=>x.name.toLowerCase()===provider.toLowerCase())||Store.list('providers').find(x=>x.name.toLowerCase().startsWith(provider.toLowerCase()));try{const data={provider:master?.name||provider,number,operationDate,loadDate:now(),branch,amount,period:operationDate.slice(0,7),notes:'Carga rápida'};await Store.add('invoices',data,currentOperator,'Carga rápida de factura');toast('Factura cargada correctamente.');refresh()}catch(e){toast(e.message,false)}}
async function handleExcel(e){const f=e.target.files?.[0];if(!f)return;const box=$('#importPreview');box.innerHTML='<div class="loading">Leyendo Excel y preparando control…</div>';try{const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});box.innerHTML=`<div class="notice success"><b>${esc(f.name)}</b> leído correctamente: ${wb.SheetNames.length} hojas.</div>`+wb.SheetNames.map((s,i)=>`<div class="sheet-preview"><div><b>${esc(s)}</b><span>Hoja ${i+1}</span></div><button class="secondary-button sync-sheet" data-sheet="${encodeURIComponent(s)}">Analizar / sincronizar</button></div>`).join('');document.querySelectorAll('.sync-sheet').forEach(b=>b.onclick=()=>syncSheet(wb,decodeURIComponent(b.dataset.sheet),f.name))}catch(err){box.innerHTML=`<div class="notice danger-box">No se pudo leer el Excel: ${esc(err.message)}</div>`}}

async function syncSheet(wb,sheet,fileName){if(!currentOperator){toast('Elegí responsable antes de sincronizar.',false);return}const ws=wb.Sheets[sheet],range=XLSX.utils.decode_range(ws['!ref']);let synced=0;try{for(let r=0;r<=range.e.r;r++){const vals=[];for(let c=0;c<Math.min(11,range.e.c+1);c++)vals.push(ws[XLSX.utils.encode_cell({r,c})]?.v??'');const headers=vals.map(v=>String(v||'').trim().toUpperCase());if(!headers.some(x=>x.includes('LUNES')||x.includes('MARTES')||x.includes('MIERCOLES')||x.includes('MIÉRCOLES')))continue;const dataRow=[];for(let c=0;c<Math.min(7,vals.length);c++){const header=String(vals[c]||'');const m=header.match(/(\d{1,2})$/);if(m)dataRow.push({day:Number(m[1]),col:c})}const next=[];for(let rr=r+1;rr<=Math.min(r+2,range.e.r);rr++){const v=[];for(let c=0;c<Math.min(11,range.e.c+1);c++)v.push(ws[XLSX.utils.encode_cell({r:rr,c})]?.v??'');next.push(v)}const values=next[0]||[];for(const cell of dataRow){const val=values[cell.col];if(typeof val!=='number')continue;const date=isoDate(period,cell.day);if(Number(cell.day)>daysInPeriod(period))continue;const emp=Store.list('employees').find(x=>x.name.toLowerCase()===sheet.trim().toLowerCase());if(!emp)continue;const sourceKey=`${fileName}|${sheet}|${date}|${cell.col}`;await Store.upsertBySource('hours',sourceKey,{period,date,branch:emp.branch,employeeId:emp.id,employee:emp.name,hours:Number(val),advance:0,merchandise:0,holiday:'no',salaryCost:Number(val)*Number(emp.hourlyRate||0)},currentOperator);synced++}}
 toast(`Excel sincronizado: ${synced} registros procesados.`);refresh()}catch(e){toast(e.message,false)}}

async function exportExcel(){
 if(!currentOperator){toast('Elegí el responsable en la barra superior antes de exportar.',false);return}
 const wb=XLSX.utils.book_new(); const s=Store.summary(period,branch);
 const summary=[['DISTRIBUIDORA BLUNNO'],['Período',periodLabel(period)],['Perfil',branch],[],['Indicador','Monto'],['Ingresos',s.income],['Gastos caja',s.cashExpense],['Gastos local',s.localExpense],['Inversiones',s.investment],['Personal',s.salary],['Proveedores',s.providers],['Resultado',s.result]];
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),'Resumen');
 ['incomes','cash','invoices','expenses','investments','hours','liquidations'].forEach(n=>{const data=Store.list(n,period,branch).map(x=>{const o={...x};delete o.deleted;return o});XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.length?data:[{sin_registros:''}]),n.slice(0,31))});
 const name=`blunno-${period}-${branch.replace(/\s+/g,'-').toLowerCase()}.xlsx`;
 const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'}); const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 let url=null; try{url=await uploadFile(`archivos/${period}/${branch}/exportaciones/${name}`,blob,blob.type)}catch(e){console.warn(e)}
 let dataUrl=null; if(!url && blob.size<1200000) dataUrl=await blobToDataURL(blob);
 await Store.archiveFile({name,sector:'Exportación Excel',period,branch,responsible:currentOperator,mime:blob.type,createdAt:now(),url,storagePath:`archivos/${period}/${branch}/exportaciones/${name}`,blob});
 downloadBlob(blob,name);  toast('Excel exportado y archivado.');
}

function checkReminders(){const due=Store.list('tasks').filter(x=>x.status!=='completed').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`))[0];if(!due)return;const nowD=new Date(),d=new Date(`${due.dueDate}T${due.dueTime||'23:59'}:00`);if(d<=nowD||due.dueDate===today()){$('#reminderTitle').textContent=due.priority==='urgent'?'⚠ RECORDATORIO URGENTE':'🔔 TENÉS UN RECORDATORIO';$('#reminderText').textContent=due.title;$('#reminderMeta').textContent=`📅 ${dateLabel(due.dueDate)} — ${due.dueTime||'sin hora'} · 👤 ${due.responsible}`;$('#reminderModal').classList.remove('hidden');$('#reminderDone').onclick=()=>completeTask(due.id);}}

function agentSay(html,who='bot'){
  const box=$('#agentMessages');
  const key=`blunno-agent-chat-${agentPerson||'sin-usuario'}`;
  try{const h=JSON.parse(localStorage.getItem(key)||'[]');h.push({who,html,at:now()});localStorage.setItem(key,JSON.stringify(h.slice(-160)))}catch(e){}
  if(!box)return;
  box.insertAdjacentHTML('beforeend',`<div class="agent-message ${who}">${html}</div>`);
  box.scrollTop=box.scrollHeight;
}
function rememberAgentPerson(p){
  if(!CONFIG.responsiblePeople.includes(p))return;
  agentPerson=p;
  const el=$('#agentCurrentPerson');if(el)el.textContent=p;
  agentSay(`<b>Agente BLUNNO</b><span>Perfecto, ${esc(p)}. Estoy operando como <b>${esc(p)}</b>. Podés hablarme o escribirme normalmente.</span>`);
}
function agentText(){
  const input=$('#agentInput');const text=input?.value.trim();if(!text)return;
  input.value='';
  if(!agentPerson){agentSay('<b>Agente BLUNNO</b><span>Primero elegí si estoy hablando con Agus, Nico, Luz o Flor.</span>');return;}
  agentSay(`<b>${esc(agentPerson)}</b><span>${esc(text)}</span>`,'user');
  processAgent(text);
}
function parseMoney(text){
  const rawText=String(text||'').replace(/\$/g,'');
  const matches=[...rawText.matchAll(/(?:^|\s)(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?=\s*(?:pesos?|ars)?(?:\s|$))/gi)];
  if(!matches.length)return null;
  const raw=matches[matches.length-1][1].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
  const n=Number(raw);return Number.isFinite(n)?n:null;
}
function normalizeAgentText(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!]/g,'').replace(/\s+/g,' ').trim()}
function detectBranch(text){
  const l=normalizeAgentText(text);
  return CONFIG.branches.find(b=>l.includes(normalizeAgentText(b))) || (l.includes('general')?'General':null);
}
function detectPeriod(text){
  const l=normalizeAgentText(text);
  const months={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',setiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};
  const ym=l.match(/\b(20\d{2})[-\/]?(0[1-9]|1[0-2])\b/);if(ym)return `${ym[1]}-${ym[2]}`;
  for(const [name,num] of Object.entries(months)){if(l.includes(name)){const y=(l.match(/\b(20\d{2})\b/)||[])[1]||period.slice(0,4);return `${y}-${num}`;}}
  if(/este mes|mes actual/.test(l))return period;
  if(/mes pasado|ultimo mes/.test(l))return prevPeriod(period);
  if(/proximo mes|siguiente mes/.test(l))return nextPeriod(period);
  return period;
}
function dateFromAgent(text, fallback=today()){
  const l=normalizeAgentText(text);
  const d=l.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](20\d{2}))?\b/);
  if(d){const y=d[3]||fallback.slice(0,4);return `${y}-${String(d[2]).padStart(2,'0')}-${String(d[1]).padStart(2,'0')}`;}
  if(l.includes('hoy'))return today();
  const x=new Date(`${today()}T12:00:00`);
  if(l.includes('anteayer')){x.setDate(x.getDate()-2);return x.toISOString().slice(0,10)}
  if(l.includes('ayer')){x.setDate(x.getDate()-1);return x.toISOString().slice(0,10)}
  if(l.includes('pasado manana')){x.setDate(x.getDate()+2);return x.toISOString().slice(0,10)}
  if(l.includes('manana')){x.setDate(x.getDate()+1);return x.toISOString().slice(0,10)}
  return fallback;
}
function agentPriority(text){const l=normalizeAgentText(text);return /urgente|ya mismo|inmediatamente/.test(l)?'urgent':/alta|importante/.test(l)?'high':'normal'}
function agentFindProvider(text){
  const l=normalizeAgentText(text);
  const rows=Store.list('providers').filter(x=>x.active!==false);
  const explicit=(l.match(/(?:proveedor|de|a|para)\s+([a-z0-9][a-z0-9 .&'’()/-]{1,80})/i)||[])[1];
  const hay=[explicit,l].filter(Boolean);
  for(const source of hay){
    const s=normalizeAgentText(source);
    const exact=rows.find(x=>normalizeAgentText(x.name)===s);if(exact)return exact;
    const hits=rows.filter(x=>s.includes(normalizeAgentText(x.name))||normalizeAgentText(x.name).includes(s)).sort((a,b)=>normalizeAgentText(b.name).length-normalizeAgentText(a.name).length);
    if(hits[0])return hits[0];
  }
  return null;
}
function agentFindEmployee(text, scopeBranch='General'){
  const l=normalizeAgentText(text);let rows=Store.list('employees').filter(x=>x.active!==false);
  if(scopeBranch!=='General')rows=rows.filter(x=>x.branch===scopeBranch);
  const exact=rows.find(x=>l.includes(normalizeAgentText(x.name)));if(exact)return exact;
  const after=(l.match(/(?:empleado|de|para)\s+([a-z0-9 .'-]{2,60})/i)||[])[1];
  if(after){const a=normalizeAgentText(after);return rows.find(x=>a.includes(normalizeAgentText(x.name))||normalizeAgentText(x.name).includes(a))||null;}
  return null;
}
function agentPeriodAndBranch(text){return {period:detectPeriod(text),branch:detectBranch(text)||branch};}
function agentRowsSummary(collection,p,b){return Store.list(collection,p,b)}
function agentOpen(viewName){navigate(viewName);agentSay(`<b>✓ Listo</b><span>Te abrí <b>${esc(titles[viewName]||viewName)}</b>.</span>`)}
function agentQueryResult(title,html){agentSay(`<b>${esc(title)}</b><span>${html}</span>`)}
function agentList(items, empty='No hay registros.'){return items.length?items.slice(0,20).map(x=>`<small class="agent-line">${esc(x)}</small>`).join(''):`<small class="agent-line">${esc(empty)}</small>`}
function agentRecordLabel(x){return x.provider||x.concept||x.title||x.name||x.employee||x.id}
function agentConfirmationButtons(){
  const box=$('#agentMessages');if(!box)return;
  const card=box.lastElementChild;
  card?.querySelector('[data-agent-confirm]')?.addEventListener('click',confirmAgent);
  card?.querySelector('[data-agent-cancel]')?.addEventListener('click',()=>{pendingAgent=null;agentSay('<span>Acción cancelada. No se modificó ningún dato.</span>')});
}
function showAgentConfirmation(label){
  const p=pendingAgent;if(!p)return;
  const missing=p.missing||[];
  const missingHtml=missing.length?`<div class="notice warning">Falta definir: ${missing.map(esc).join(', ')}.</div>`:'';
  agentSay(`<div class="agent-confirm"><b>${esc(label)}</b><div class="notice">${esc(p.preview||'Revisá los datos antes de guardar.')}</div>${missingHtml}<pre>${esc(JSON.stringify(p.data,null,2))}</pre><div>${missing.length?'':`<button class="primary-button" data-agent-confirm>Confirmar y ejecutar</button>`}<button class="secondary-button" data-agent-cancel>Cancelar</button></div></div>`);
  agentConfirmationButtons();
}
function makePending(type,data,missing,preview){pendingAgent={type,data,missing:[...new Set(missing)],preview};showAgentConfirmation(`Preparar ${type==='invoice'?'factura':type==='expense'?'gasto':type==='investment'?'inversión':type==='cash'?'movimiento de caja':type==='hours'?'horas':type==='employee'?'empleado':type==='provider'?'proveedor':type==='invoicePayment'?'pago de factura':'recordatorio'}`)}
function pendingFillFromText(text){
  if(!pendingAgent?.missing?.length)return false;
  const l=normalizeAgentText(text),p=pendingAgent;
  if(p.missing.includes('sucursal concreta')){const b=detectBranch(text);if(b&&b!=='General'){p.data.branch=b;p.missing=p.missing.filter(x=>x!=='sucursal concreta')}}
  if(p.missing.includes('proveedor')){const v=agentFindProvider(text);if(v){p.data.provider=v.name;p.missing=p.missing.filter(x=>x!=='proveedor')}}
  if(p.missing.includes('empleado')){const e=agentFindEmployee(text,p.data.branch||branch);if(e){p.data.employee=e.name;p.data.employeeId=e.id;p.missing=p.missing.filter(x=>x!=='empleado')}}
  if(p.missing.includes('importe')){const n=parseMoney(text);if(n!==null){p.data.amount=n;p.missing=p.missing.filter(x=>x!=='importe')}}
  if(p.missing.includes('cantidad de horas')){const m=l.match(/(\d+(?:[,.]\d+)?)\s*horas?/);if(m){p.data.hours=Number(m[1].replace(',','.'));p.missing=p.missing.filter(x=>x!=='cantidad de horas')}}
  if(p.missing.includes('nombre del empleado')){const n=text.replace(/^(agrega|agreg[aá]|crea|crear|nuevo|nueva|empleado|personal)\s*/i,'').trim();if(n.length>=2){p.data.name=n;p.missing=p.missing.filter(x=>x!=='nombre del empleado')}}
  if(p.missing.includes('categoría')){const c=CONFIG.expenseCategories.find(x=>l.includes(normalizeAgentText(x)));if(c){p.data.category=c;p.missing=p.missing.filter(x=>x!=='categoría')}}
  if(p.missing.includes('fecha')){const d=dateFromAgent(text,null);if(d){p.data.date=d;p.data.period=d.slice(0,7);p.missing=p.missing.filter(x=>x!=='fecha')}}
  if(p.type==='invoice'&&p.data.branch&&p.data.operationDate){p.data.period=p.data.operationDate.slice(0,7)}
  if(!p.missing.length){showAgentConfirmation('Datos completos — listo para confirmar');return true}
  showAgentConfirmation('Falta completar un dato');return true;
}
function agentDateTime(text){const d=dateFromAgent(text,today()),m=String(text).match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);return {date:d,time:m?`${String(m[1]).padStart(2,'0')}:${m[2]}`:''}}
function agentProviderNameFromText(text){
  const l=normalizeAgentText(text);const rows=Store.list('providers').filter(x=>x.active!==false);
  const candidates=rows.filter(x=>l.includes(normalizeAgentText(x.name))).sort((a,b)=>normalizeAgentText(b.name).length-normalizeAgentText(a.name).length);
  return candidates[0]||null;
}
function agentEmployeeFromText(text,scopeBranch){return agentFindEmployee(text,scopeBranch)}
function agentSummary(p,b){
  const s=Store.summary(p,b);return `Perfil: <b>${esc(b)}</b> · ${periodLabel(p)} · ingresos ${money(s.income)} · gastos caja ${money(s.cashExpense)} · gastos del local ${money(s.localExpense)} · proveedores ${money(s.providers)} · inversiones ${money(s.investment)} · personal ${money(s.salary)} · resultado ${money(s.result)}.`;
}
async function processAgent(text){
  const l=normalizeAgentText(text);
  try{await Store.recordAudit('AGENT_QUERY','agent',{question:text},{view,period,branch},agentPerson,'Consulta realizada por Agente BLUNNO')}catch(e){}
  if(pendingAgent && /^(confirmar|confirma|si|sí|dale|hacerlo|ejecuta|ejecutalo|guardalo|guardar|ok|okay)$/i.test(l)){await confirmAgent();return}
  if(pendingAgent && /^(cancelar|cancela|no|anular|anula)$/i.test(l)){pendingAgent=null;agentSay('<span>Cancelado. No se modificó ningún dato.</span>');return}
  if(pendingAgent && pendingFillFromText(text))return;
  const ctx=agentPeriodAndBranch(text), scopeBranch=ctx.branch, scopePeriod=ctx.period;
  const nav={inicio:'dashboard',panel:'dashboard',dashboard:'dashboard',caja:'cash',facturas:'invoices',factura:'invoices',proveedores:'providers',proveedor:'providers',gastos:'expenses',inversiones:'investments',inversion:'investments',personal:'people',empleados:'people',horas:'hours',resultados:'results',comparativas:'compare',comparativa:'compare',recordatorios:'tasks',tareas:'tasks',archivos:'files',historial:'history',papelera:'trash',cierre:'close',agente:'agent'};
  const navKey=Object.keys(nav).find(k=>l.includes(k));
  if(/^(abr|mostrame|mostrar|lleva(me|nos)|ir a|entra(r)?|quiero ver|ver|pasame|pasame a)/.test(l)&&navKey){agentOpen(nav[navKey]);return;}
  if(/^(ayuda|que podes|que puedes|comandos|como te uso|que haces|en que me ayudas)/.test(l)){
    agentSay('<b>Agente BLUNNO</b><span>Puedo consultar y preparar acciones sobre caja, facturas, proveedores, gastos, inversiones, personal, horas, liquidaciones, recordatorios, archivos, resultados, comparativas y cierre. También puedo generar PDF, exportar Excel, hacer backup, abrir sectores y buscar registros. Toda modificación requiere confirmación y queda auditada.</span>');return;
  }
  if(/quien soy|con quien|responsable actual/.test(l)){agentQueryResult('Responsable',`Estás operando como <b>${esc(agentPerson)}</b>.`);return;}
  if(/^(prepara|preparame|prepará|preparame) .*cierre|^(cerrar|hace|hacer|confirmar|confirma) .*cierre/.test(l)){agentOpen('close');agentSay('<span>Te llevé al control previo de cierre. Ahí se revisan todos los puntos y el cierre requiere confirmación.</span>');return;}
  if(/pdf|documento.*pdf|gener[aá].*pdf/.test(l)){
    const type=/factura|proveedor/.test(l)?'invoices':/caja/.test(l)?'cash':/hora|personal|empleado/.test(l)?'hours':/gasto/.test(l)?'expenses':/inversion/.test(l)?'investments':/compar/.test(l)?'compare':/resultado|resumen/.test(l)?'results':null;
    if(type){await generateAndShowViewPDF(type);return;}
    agentSay('<span>Decime qué PDF querés: caja, facturas, gastos, inversiones, horas, resultados o comparativa.</span>');return;
  }
  if(/exporta|exportar|excel/.test(l)&&/excel/.test(l)){await exportExcel();agentSay('<span>✓ Excel generado y archivado.</span>');return;}
  if(/backup|respaldo|copia de seguridad/.test(l)){Store.exportJson();agentSay('<span>✓ Backup completo preparado.</span>');return;}
  if(/caja|saldo/.test(l)&&/(saldo|ingreso|egreso|gasto|resto|final|cuanto|cuánto)/.test(l)){
    const rows=agentRowsSummary('cash',scopePeriod,scopeBranch),inc=rows.filter(x=>x.type==='income').reduce((a,x)=>a+Number(x.amount||0),0),exp=rows.filter(x=>x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0);
    agentQueryResult('Caja',`${periodLabel(scopePeriod)} · ${esc(scopeBranch)} · ingresos ${money(inc)} · gastos ${money(exp)} · saldo neto ${money(inc-exp)} · movimientos ${rows.length}.`);return;
  }
  if(/(facturas?|proveedores?).*(pendiente|debo|deben|falta pagar|por pagar|sin pagar)|cuanto.*deb(o|emos).*proveedor/.test(l)){
    const pv=agentProviderNameFromText(text);let rows=Store.list('invoices',scopePeriod,scopeBranch).filter(x=>x.status!=='paid');
    if(pv)rows=rows.filter(x=>normalizeAgentText(x.provider)===normalizeAgentText(pv.name));
    const total=rows.reduce((a,x)=>a+Math.max(0,Number(x.amount||0)-Number(x.paidAmount||0)),0);
    agentQueryResult(pv?`Deuda con ${pv.name}`:'Facturas pendientes',`${rows.length} registros por ${money(total)} en ${periodLabel(scopePeriod)} · ${esc(scopeBranch)}.${agentList(rows.map(x=>`${x.provider} · pendiente ${money(Math.max(0,Number(x.amount||0)-Number(x.paidAmount||0)))} · ${dateLabel(x.operationDate||x.date)}`))}`);return;
  }
  if(/proveedores/.test(l)&&/(tenemos|lista|listar|todos|catalogo|catálogo|mostrar|mostrame)/.test(l)){
    const ps=Store.list('providers').filter(x=>x.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'es'));agentQueryResult('Catálogo de proveedores',agentList(ps.map(x=>x.name),'No hay proveedores cargados.'));return;
  }
  if(/facturas?/.test(l)&&/(mostrar|mostrame|lista|listar|historial|tenemos|hay)/.test(l)){
    const pv=agentProviderNameFromText(text);let inv=Store.list('invoices',scopePeriod,scopeBranch);if(pv)inv=inv.filter(x=>normalizeAgentText(x.provider)===normalizeAgentText(pv.name));const total=inv.reduce((a,x)=>a+Number(x.amount||0),0);agentQueryResult('Facturas',`${inv.length} facturas · total ${money(total)} · ${periodLabel(scopePeriod)} · ${esc(scopeBranch)}.${agentList(inv.map(x=>`${x.provider} · ${money(x.amount)} · ${dateLabel(x.operationDate||x.date)} · ${x.status||'pendiente'}`),'No hay facturas para ese período.')}}`);return;
  }
  if(/proveedor/.test(l)&&/(buscar|busca|tenemos|existe|mostra|mostrar|cuanto|cuánto|historial|facturas)/.test(l)){
    const p=agentProviderNameFromText(text)||agentFindProvider(l);if(!p){agentQueryResult('Proveedor','No encontré ese proveedor en el catálogo.');return;}
    const inv=Store.list('invoices',scopePeriod,scopeBranch).filter(x=>normalizeAgentText(x.provider)===normalizeAgentText(p.name));const total=inv.reduce((a,x)=>a+Number(x.amount||0),0);const debt=inv.reduce((a,x)=>a+Math.max(0,Number(x.amount||0)-Number(x.paidAmount||0)),0);
    agentQueryResult(p.name,`${inv.length} facturas · total ${money(total)} · pendiente ${money(debt)}.${agentList(inv.map(x=>`${x.provider} · ${money(x.amount)} · ${dateLabel(x.operationDate||x.date)} · ${x.status||'pendiente'}`))}`);return;
  }
  if(/(cuanto|cuánto|total|resumen|resultado|gastamos|ingresos|gastos|balance|neto)/.test(l)&&!/(factura|proveedor|caja)/.test(l)){agentQueryResult(`Resumen ${periodLabel(scopePeriod)}`,agentSummary(scopePeriod,scopeBranch));return;}
  if(/(empleados|personal)/.test(l)&&/(mostrar|mostrame|lista|listar|tenemos|quien|quienes)/.test(l)){
    const es=Store.list('employees').filter(x=>x.active!==false&&(scopeBranch==='General'||x.branch===scopeBranch));agentQueryResult('Personal',agentList(es.map(x=>`${x.name} · ${x.branch} · ${x.role||'sin puesto'}`),'No hay empleados en ese perfil.'));return;
  }
  if(/(horas|empleados|personal)/.test(l)&&/(cu[aá]nt|total|resumen|carg|trabaj|ficha|quien)/.test(l)){
    const emp=agentEmployeeFromText(text,scopeBranch);if(emp){const rows=Store.list('hours',scopePeriod,scopeBranch).filter(x=>x.employeeId===emp.id);const h=rows.reduce((a,x)=>a+Number(x.hours||0),0);agentQueryResult(`Horas de ${emp.name}`,`${number(h)} horas en ${periodLabel(scopePeriod)} · adelantos ${money(rows.reduce((a,x)=>a+Number(x.advance||0),0))} · mercadería ${money(rows.reduce((a,x)=>a+Number(x.merchandise||0),0))}.`);return;}
    const s=Store.summary(scopePeriod,scopeBranch);agentQueryResult('Horas',`${number(s.hours)} horas registradas en ${periodLabel(scopePeriod)} · ${esc(scopeBranch)}.`);return;
  }
  if(/(liquid|sueldo|salario)/.test(l)&&/(total|calcula|abr|mostrar|historial)/.test(l)){
    const emp=agentEmployeeFromText(text,scopeBranch);if(!emp){agentQueryResult('Liquidación','Decime el nombre del empleado para abrir su liquidación.');return;}openLiquidation(emp.id);agentSay(`<span>Te abrí la liquidación de <b>${esc(emp.name)}</b>. Revisá el valor hora y confirmá la totalización.</span>`);return;
  }
  if(/(tarea|recordatorio)/.test(l)&&/(pendiente|proxim|hoy|mostrar|listar|que tengo)/.test(l)){
    const rows=Store.list('tasks').filter(x=>x.status!=='completed').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`));agentQueryResult('Recordatorios',agentList(rows.map(x=>`${x.title} · ${dateLabel(x.dueDate)} ${x.dueTime||''} · ${x.responsible}`),'No tenés recordatorios pendientes.'));return;
  }
  if(/(completa|complet[aá]|termina|termin[aá]|marca).*?(tarea|recordatorio)/.test(l)){
    const rows=Store.list('tasks').filter(x=>x.status!=='completed');const q=l.replace(/.*?(tarea|recordatorio)\s*/,'').trim();const t=rows.find(x=>normalizeAgentText(x.title).includes(q)||q.includes(normalizeAgentText(x.title)));if(!t){agentQueryResult('Recordatorio','No encontré esa tarea.');return;}makePending('taskComplete',{id:t.id,title:t.title},[],`Marcar como completado: ${t.title}.`);return;
  }
  if(/(crear|cargar|agregar|registrar|anotar|poneme|guard[aá])/.test(l)&&/(recordatorio|tarea)/.test(l)){
    const title=text.replace(/.*?(recordatorio|tarea)\s*(para)?\s*/i,'').replace(/\b(mañana|manana|hoy|urgente)\b/gi,'').replace(/\b(?:a las?)\s*[0-2]?\d:[0-5]\d\b/gi,'').trim()||'Nueva tarea';const dt=agentDateTime(text);makePending('task',{title,dueDate:dt.date,dueTime:dt.time,priority:agentPriority(text),responsible:agentPerson,status:'pending',repeat:'none',notes:'Creado por Agente BLUNNO'},[],`Crear recordatorio para ${agentPerson} el ${dateLabel(dt.date)}${dt.time?' a las '+dt.time:''}.`);return;
  }
  if(/(pagar|registrar pago|abonar)/.test(l)&&/factura|proveedor/.test(l)){
    const pv=agentProviderNameFromText(text);let rows=Store.list('invoices',scopePeriod,scopeBranch).filter(x=>x.status!=='paid');if(pv)rows=rows.filter(x=>normalizeAgentText(x.provider)===normalizeAgentText(pv.name));const amount=parseMoney(text);if(rows.length!==1&&!pv){agentQueryResult('Pago de factura','Encontré varias facturas pendientes. Decime el proveedor o el número de factura.');return;}const inv=rows[0];if(!inv){agentQueryResult('Pago de factura','No encontré una factura pendiente para esos datos.');return;}const pay=amount===null?Math.max(0,Number(inv.amount||0)-Number(inv.paidAmount||0)):amount;const newPaid=Number(inv.paidAmount||0)+pay;makePending('invoicePayment',{id:inv.id,provider:inv.provider,number:inv.number||'',amount:pay,newPaid,total:Number(inv.amount||0),status:newPaid>=Number(inv.amount||0)?'paid':'partial'},[],`Registrar pago de ${money(pay)} a ${inv.provider}${inv.number?' · factura '+inv.number:''}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/factura/.test(l)){
    const provider=agentProviderNameFromText(text)||agentFindProvider(l),amount=parseMoney(text),dt=agentDateTime(text),missing=[];if(!provider)missing.push('proveedor');if(amount===null)missing.push('importe');if(scopeBranch==='General')missing.push('sucursal concreta');
    makePending('invoice',{provider:provider?.name||'',number:(text.match(/(?:nro|número|numero|n°|num\.?\s*factura)\s*[:#-]?\s*([A-Za-z0-9-]+)/i)||[])[1]||'',operationDate:dt.date,loadDate:now(),dueDate:dt.date,branch:scopeBranch==='General'?'':scopeBranch,amount:amount||0,paidAmount:0,status:'pending',period:dt.date.slice(0,7),notes:'Cargada por Agente BLUNNO'},missing,`${provider?.name||'Proveedor pendiente'} · ${money(amount||0)} · ${esc(scopeBranch==='General'?'sucursal pendiente':scopeBranch)} · movimiento ${dateLabel(dt.date)}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/gasto/.test(l)){
    const amount=parseMoney(text),dt=agentDateTime(text),missing=[];if(amount===null)missing.push('importe');if(scopeBranch==='General')missing.push('sucursal concreta');const category=CONFIG.expenseCategories.find(c=>l.includes(normalizeAgentText(c)));if(!category)missing.push('categoría');const concept=text.replace(/.*?gasto\s*/i,'').replace(/\$?\s*[\d.]+(?:,\d+)?\s*(pesos|peso|ars)?/i,'').trim()||'Gasto cargado por Agente BLUNNO';makePending('expense',{date:dt.date,period:dt.date.slice(0,7),branch:scopeBranch==='General'?'':scopeBranch,category:category||'',concept,amount:amount||0,document:'',notes:'Cargado por Agente BLUNNO'},missing,`${category||'Categoría pendiente'} · ${concept} · ${money(amount||0)} · ${esc(scopeBranch)}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/inversi[oó]n/.test(l)){
    const amount=parseMoney(text),dt=agentDateTime(text),missing=[];if(amount===null)missing.push('importe');if(scopeBranch==='General')missing.push('sucursal concreta');makePending('investment',{date:dt.date,period:dt.date.slice(0,7),branch:scopeBranch==='General'?'':scopeBranch,concept:text,amount:amount||0,document:'',notes:'Cargada por Agente BLUNNO'},missing,`Inversión · ${money(amount||0)} · ${esc(scopeBranch)}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/(ingreso|egreso|caja|resto)/.test(l)){
    const amount=parseMoney(text),dt=agentDateTime(text),missing=[];if(amount===null)missing.push('importe');if(scopeBranch==='General')missing.push('sucursal concreta');const type=/egreso|gasto|pago/.test(l)?'expense':'income';makePending('cash',{date:dt.date,period:dt.date.slice(0,7),branch:scopeBranch==='General'?'':scopeBranch,type,concept:text,amount:amount||0,expected:amount||0,notes:'Cargado por Agente BLUNNO'},missing,`${type==='income'?'Ingreso':'Egreso'} de caja · ${money(amount||0)} · ${esc(scopeBranch)}.`);return;
  }
  if(/(cargar|carga|registrar|registra|agregar|agrega|anotar|anota|guardar|guarda|guardame|guardá)/.test(l)&&/horas?/.test(l)){
    const emp=agentEmployeeFromText(text,scopeBranch),dt=agentDateTime(text),missing=[];const hourMatch=l.match(/(\d+(?:[,.]\d+)?)\s*horas?/);const hrs=hourMatch?Number(hourMatch[1].replace(',','.')):null;if(!emp)missing.push('empleado');if(hrs===null)missing.push('cantidad de horas');makePending('hours',{employee:emp?.name||'',employeeId:emp?.id||'',date:dt.date,hours:hrs||0,advance:0,merchandise:0,holiday:/feriado/.test(l)?'yes':'no',notes:'Cargadas por Agente BLUNNO'},missing,`${emp?.name||'Empleado pendiente'} · ${hrs||0} horas · ${dateLabel(dt.date)}.`);return;
  }
  if(/(agregar|crear|alta|nuevo|nueva)/.test(l)&&/(empleado|personal)/.test(l)){
    const name=text.replace(/.*?(empleado|personal)\s*(nuevo|nueva|que se llama|llamado|llamada)?\s*/i,'').replace(/\s+en\s+(mendiolaza|bodereau|derqui|unquillo|general).*$/i,'').trim();const missing=[];if(!name||name.length<2)missing.push('nombre del empleado');if(scopeBranch==='General')missing.push('sucursal concreta');makePending('employee',{name:name||'',branch:scopeBranch==='General'?'':scopeBranch,role:'',hourlyRate:0,active:true},missing,`Crear empleado ${name||'(falta nombre)'} en ${scopeBranch}.`);return;
  }
  if(/(agregar|crear|alta|nuevo|nueva)/.test(l)&&/proveedor/.test(l)){
    const name=text.replace(/.*?proveedor\s*(nuevo|nueva|que se llama|llamado|llamada)?\s*/i,'').trim();const missing=[];if(!name||name.length<2)missing.push('nombre del proveedor');makePending('provider',{name:name||'',active:true,master:false},missing,`Crear proveedor ${name||'(falta nombre)'}.`);return;
  }
  if(/(elimina|borrar|borra|manda|mand[aá]).*?(papelera|proveedor|factura|gasto|inversion|empleado|tarea)/.test(l)){
    const p=agentProviderNameFromText(text);if(p){makePending('delete',{collection:'providers',id:p.id,label:p.name},[],`Enviar proveedor ${p.name} a la papelera.`);return;}
    agentSay('<span>Para eliminar por voz necesito el nombre exacto del registro. No borro nada sin confirmación.</span>');return;
  }
  agentSay('<b>Agente BLUNNO</b><span>No ejecuté nada porque no pude interpretar la orden con seguridad. Podés decirla de otra forma; si falta un dato te lo voy a pedir antes de modificar.</span>');
}
async function confirmAgent(){
  if(!pendingAgent)return;
  const p=pendingAgent;
  try{
    if(p.missing?.length){agentSay(`<span>No puedo ejecutar todavía. Falta: ${p.missing.join(', ')}.</span>`);return;}
    if(p.type==='taskComplete'){await Store.update('tasks',p.data.id,{status:'completed',completedAt:now(),completedBy:agentPerson},agentPerson,'Tarea completada por Agente BLUNNO');pendingAgent=null;refresh();agentSay('<span>✓ Recordatorio completado y auditado.</span>');return;}
    if(p.type==='invoicePayment'){const inv=Store.get('invoices',p.data.id);if(!inv)throw new Error('La factura ya no está disponible.');const row=await Store.update('invoices',inv.id,{paidAmount:p.data.newPaid,status:p.data.status},agentPerson,'Pago registrado por Agente BLUNNO');pendingAgent=null;refresh();setTimeout(()=>agentSay(`<span>✓ Pago registrado para ${esc(row.provider)}. Queda ${money(Math.max(0,Number(row.amount||0)-Number(row.paidAmount||0)))} pendiente.</span>`),30);return;}
    if(p.type==='delete'){await Store.remove(p.data.collection,p.data.id,agentPerson,'Baja lógica confirmada por Agente BLUNNO');pendingAgent=null;refresh();agentSay('<span>✓ Registro enviado a la papelera. Se conserva la auditoría y puede restaurarse.</span>');return;}
    if(p.type==='task'){await Store.add('tasks',p.data,agentPerson,'Creación de recordatorio por Agente BLUNNO');pendingAgent=null;refresh();agentSay('<span>✓ Recordatorio creado y auditado.</span>');return;}
    const collection={provider:'providers',invoice:'invoices',investment:'investments',expense:'expenses',cash:'cash',hours:'hours',employee:'employees'}[p.type];
    if(!collection)throw new Error('Acción no disponible.');
    const data={...p.data};
    if(['invoice','expense','investment','cash'].includes(p.type)&&data.branch==='')throw new Error('Necesito una sucursal concreta para guardar este movimiento.');
    if(p.type==='invoice'){data.period=String(data.operationDate||today()).slice(0,7);data.loadDate=data.loadDate||now();data.dueDate=data.dueDate||data.operationDate||today();}
    if(p.type==='hours'){
      const emp=Store.get('employees',data.employeeId)||Store.list('employees').find(x=>normalizeAgentText(x.name)===normalizeAgentText(data.employee));if(!emp)throw new Error('No se encontró el empleado.');
      data.employeeId=emp.id;data.employee=emp.name;data.branch=emp.branch;data.period=String(data.date).slice(0,7);data.salaryCost=Number(data.hours||0)*Number(emp.hourlyRate||0);
    }
    if(p.type==='employee')data.createdByAgent=true;
    const row=await Store.add(collection,data,agentPerson,'Acción confirmada por Agente BLUNNO');pendingAgent=null;refresh();setTimeout(()=>{agentSay(`<b>✓ Acción ejecutada correctamente</b><span>${esc(collection)} quedó guardado con responsable ${esc(agentPerson)}, fecha/hora y auditoría completa.</span><button class="secondary-button" data-undo-agent="${row.id}" data-undo-collection="${collection}">↶ Deshacer esta acción</button>`);const box=$('#agentMessages');box?.lastElementChild?.querySelector('[data-undo-agent]')?.addEventListener('click',()=>undoAgent(collection,row.id));},30);
  }catch(e){agentSay(`<span class="text-red">No se pudo ejecutar: ${esc(e.message||'Error inesperado')}</span>`)}
}
async function undoAgent(collection,id){try{await Store.remove(collection,id,agentPerson||currentOperator,'Deshacer acción del Agente BLUNNO');toast('Acción revertida; la auditoría original se conserva.');refresh();setTimeout(()=>agentSay('<span>↶ La acción fue deshecha. El registro original y la reversión siguen en auditoría.</span>'),30)}catch(e){toast(e.message,false)}}
let speechRecognition=null;
function startSpeech(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Este navegador no ofrece reconocimiento de voz. Usá Chrome o Edge.',false);return;}
  if(speechRecognition){try{speechRecognition.stop()}catch(e){}speechRecognition=null;return;}
  const r=new SR();speechRecognition=r;r.lang='es-AR';r.continuous=false;r.interimResults=true;r.maxAlternatives=5;
  const btn=$('#agentMic');if(btn){btn.textContent='⏹';btn.title='Detener escucha';btn.classList.add('recording')}
  let finalText='';
  r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const part=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=part+' ';else interim+=part}const input=$('#agentInput');if(input)input.value=(finalText+interim).trim()};
  r.onend=()=>{if(btn){btn.textContent='🎙';btn.title='Dictar';btn.classList.remove('recording')}speechRecognition=null;const input=$('#agentInput');const t=input?.value.trim();if(t)agentText()};
  r.onerror=e=>{if(btn){btn.textContent='🎙';btn.title='Dictar';btn.classList.remove('recording')}speechRecognition=null;if(e.error!=='aborted'&&e.error!=='no-speech')toast(`No se pudo interpretar el audio (${e.error}).`,false)};
  try{r.start()}catch(e){speechRecognition=null;if(btn){btn.textContent='🎙';btn.classList.remove('recording')}toast('No se pudo iniciar el micrófono. Permití el acceso al micrófono.',false)}
}

function globalWire(){
 document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{navigate(b.dataset.view);closeMobileMenu();});
 const mobileBtn=$('#mobileMenuBtn');
 const overlay=$('#mobileOverlay');
 function openMobileMenu(){document.body.classList.add('mobile-nav-open');overlay?.classList.remove('hidden');}
 window.__blunnoOpenMobileMenu=openMobileMenu;
 window.__blunnoCloseMobileMenu=closeMobileMenu;
 function closeMobileMenu(){document.body.classList.remove('mobile-nav-open');overlay?.classList.add('hidden');}
 mobileBtn?.addEventListener('click',openMobileMenu);
 overlay?.addEventListener('click',closeMobileMenu);

 $('#periodSelector').onclick=openPeriodModal;
 $('#branchSelector').onchange=e=>{const next=e.target.value;if(next===branch)return;if(confirm(`¿Estás seguro de cambiar de sucursal/perfil?\n\nActual: ${branch}\nNuevo: ${next}\n\nNo se mezclan datos: solo cambia la vista de trabajo.`))setBranch(next);else e.target.value=branch;};
 $('#operatorSelector').onchange=e=>setOperator(e.target.value);
 $('#newRecordBtn').onclick=()=>{const map={dashboard:'income',income:'income',cash:'cash',providers:'invoice',invoices:'invoice',expenses:'expense',investments:'investment',people:'employee',hours:'hours',tasks:'task'};if(map[view])openModal(map[view]);else toast('Elegí un sector para crear un movimiento.',false)};
 $('#searchBtn').onclick=openSearch;

 $('#closeModalBtn')?.addEventListener('click',closeModal);
 $('#recordForm').addEventListener('submit',saveRecord);
 document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=closeModal);
 document.querySelectorAll('[data-close-period-modal]').forEach(b=>b.onclick=()=>$('#periodModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-detail]').forEach(b=>b.onclick=()=>$('#detailModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-reminder]').forEach(b=>b.onclick=()=>$('#reminderModal').classList.add('hidden'));
}

function openSearch(){const m=$('#searchModal');m.classList.remove('hidden');const input=$('#searchInput');input.value='';input.focus();const draw=()=>{const q=input.value.toLowerCase().trim();if(!q){$('#searchResults').innerHTML='<div class="empty-block">Buscá proveedores, facturas, ingresos, gastos, inversiones, empleados, documentos, cierres o auditoría.</div>';return}const sources=[
  ...Store.list('providers').map(x=>({...x,_type:'Proveedor',_label:x.name,_view:'providers'})),
  ...Store.list('employees').map(x=>({...x,_type:'Empleado',_label:x.name,_view:'people'})),
  ...Store.list('invoices').map(x=>({...x,_type:'Factura',_label:`${x.provider} · ${x.number||'sin número'} · ${money(x.amount)}`,_view:'invoices'})),
  ...Store.list('incomes').map(x=>({...x,_type:'Ingreso',_label:`${x.concept||'Ingreso'} · ${money(x.amount)}`,_view:'income'})),
  ...Store.list('expenses').map(x=>({...x,_type:'Gasto',_label:`${x.category} · ${x.concept||''} · ${money(x.amount)}`,_view:'expenses'})),
  ...Store.list('investments').map(x=>({...x,_type:'Inversión',_label:`${x.concept||'Inversión'} · ${money(x.amount)}`,_view:'investments'})),
  ...Store.list('files').map(x=>({...x,_type:'Documento',_label:x.name,_view:'files'})),
  ...Store.list('closures').map(x=>({...x,_type:'Cierre',_label:`Cierre ${periodLabel(x.period)} · ${x.branch} · V${x.version}`,_view:'close'})),
  ...Store.db.audit.map(x=>({...x,_type:'Auditoría',_label:`${x.action} · ${x.collection} · ${x.responsible} · ${dateTimeLabel(x.at)}`,_view:'history'}))
 ];const found=sources.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).slice(0,40);$('#searchResults').innerHTML=found.map(x=>`<button class="search-result" data-search-view="${esc(x._view)}"><span class="search-result-type">${esc(x._type)}</span><b>${esc(x._label)}</b></button>`).join('')||'<div class="empty-block">No encontramos coincidencias en el contexto actual.</div>';document.querySelectorAll('[data-search-view]').forEach(b=>b.onclick=()=>{navigate(b.dataset.searchView);m.classList.add('hidden')});};input.oninput=draw;draw();}

async function init(){
 currentOperator=""; agentPerson=""; localStorage.removeItem("blunno-operator"); localStorage.removeItem("blunno-agent-person"); branch="General";  connection();
 await Store.sync();
 globalWire();refresh();
}
init();

__BLUNNO_MODULES.web = {  };
})();
