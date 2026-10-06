
/* BLUNNO CONTROL EMPRESARIAL · V28.0 ARRANQUE REAL + AJUSTES FINALES · V20 compatibility baseline retained · self-contained entry for GitHub Pages · build 2026.10.06.28 */
const __BLUNNO_MODULES = Object.create(null);

// ===== MODULE: config =====
(() => {
const CONFIG = {
  companyName: "Distribuidora Blunno",
  locale: "es-AR",
  currency: "ARS",
  defaultPeriod: "2026-10",
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

// ===== MODULE: pdf =====
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

// ===== MODULE: firebase =====
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
const BRANCH_SCOPED = new Set(["cash","hours","invoices","expenses","investments","employeeDebts","liquidations","tasks","closures","files","incomes","employees","imports"]);
async function accessClaims(){
  if(!auth?.currentUser) return {all:false,branches:[]};
  try{
    const token=(await auth.currentUser.getIdTokenResult()).claims||{};
    if(token.role==='admin'||token.role==='general') return {all:true,branches:[]};
    const branches=new Set();
    if(typeof token.branchId==='string'&&token.branchId) branches.add(token.branchId);
    if(token.branchIds&&typeof token.branchIds==='object') Object.keys(token.branchIds).forEach(k=>{if(token.branchIds[k])branches.add(k)});
    return {all:false,branches:[...branches].slice(0,30)};
  }catch{return {all:false,branches:[]};}
}

async function remoteList(name, period = null) {
  if (!firebaseEnabled) return [];
  await ensureFirebase(); const { collection, getDocs, query, where } = await fs();
  const refCol = collection(db, name);
  const clauses=[];
  if(period && ["cash","hours","invoices","expenses","investments","employeeDebts","liquidations","tasks","closures","incomes","imports"].includes(name)) clauses.push(where("period","==",period));
  if(BRANCH_SCOPED.has(name)){
    const access=await accessClaims();
    if(!access.all){
      if(!access.branches.length) throw new Error("La cuenta Firebase no tiene sucursal asignada.");
      clauses.push(where("branchId",access.branches.length===1?"==":"in",access.branches.length===1?access.branches[0]:access.branches));
    }
  }
  const q=clauses.length?query(refCol,...clauses):refCol;
  const snap=await getDocs(q); return snap.docs.map(d=>({id:d.id,...d.data()}));
}
async function remoteGet(name,id){if(!firebaseEnabled)return null;await ensureFirebase();const {doc,getDoc}=await fs();const snap=await getDoc(doc(db,name,id));return snap.exists()?{id:snap.id,...snap.data()}:null;}
async function remoteAdd(name,data,id=null){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {collection,doc,setDoc,addDoc,serverTimestamp}=await fs();const payload=clean({...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});if(id){await setDoc(doc(db,name,id),payload,{merge:true});return{id,...data};}const r=await addDoc(collection(db,name),payload);return{id:r.id,...data};}
async function remoteUpdate(name,id,data){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {doc,updateDoc,serverTimestamp}=await fs();await updateDoc(doc(db,name,id),clean({...data,updatedAt:serverTimestamp()}));return{id,...data};}
async function remotePurge(name,id){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {doc,deleteDoc,getDoc}=await fs();const refDoc=doc(db,name,id);const snap=await getDoc(refDoc);if(name==="files"&&snap.exists()&&snap.data().storagePath){try{const {ref,deleteObject}=await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js");await deleteObject(ref(storage,snap.data().storagePath));}catch(e){console.warn("Storage purge",e)}}await deleteDoc(refDoc);}
async function remoteDelete(name,id){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {doc,updateDoc,serverTimestamp}=await fs();await updateDoc(doc(db,name,id),{deleted:true,deletedAt:serverTimestamp(),updatedAt:serverTimestamp()});}
async function remoteAudit(data){if(!firebaseEnabled)return;await ensureFirebase();const {addDoc,collection,serverTimestamp}=await fs();await addDoc(collection(db,"audit"),clean({...data,createdAt:serverTimestamp()}));}
async function uploadFile(path,blob,contentType){if(!firebaseEnabled)return null;await ensureFirebase();const {ref,uploadBytes,getDownloadURL}=await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js");const r=ref(storage,path);await uploadBytes(r,blob,{contentType:contentType||blob.type||"application/octet-stream"});return getDownloadURL(r);}
async function remoteBatchSet(rows){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {writeBatch,doc,serverTimestamp}=await fs();const b=writeBatch(db);rows.forEach(r=>b.set(doc(db,r.name,r.id),clean({...r.data,updatedAt:serverTimestamp()}),{merge:true}));await b.commit();}

__BLUNNO_MODULES.firebase = { get firebaseAuth(){ return firebaseAuth; }, get firebaseDb(){ return firebaseDb; }, get firebaseStorage(){ return firebaseStorage; }, firebaseEnabled, authState, login, logout, remoteList, remoteGet, remoteAdd, remoteUpdate, remotePurge, remoteDelete, remoteAudit, uploadFile, remoteBatchSet };
})();

// ===== MODULE: store =====
(() => {
const { CONFIG, uid, isFirebaseConfigured, today, now, nextPeriod, periodLabel, money, number } = __BLUNNO_MODULES.config;
const { remoteList, remoteAdd, remoteUpdate, remoteDelete, remotePurge, remoteAudit } = __BLUNNO_MODULES.firebase;

const KEY = "blunno-control-v13-final";
const collections = [
  "periods", "providers", "incomes", "invoices", "cash", "expenses", "investments", "employees", "hours",
  "employeeDebts", "liquidations", "tasks", "closures", "files", "imports", "audit", "settings"
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
const CONTROL_START_PERIOD = "2026-10";
const CLEAN_START_MARKER = "blunno-real-start-2026-10-06-v28";
const BUSINESS_DATA_COLLECTIONS = ["incomes","invoices","cash","expenses","investments","employees","hours","employeeDebts","liquidations","tasks","closures","files","imports","audit"];
const resetLocalForRealStart = data => {
  if(localStorage.getItem(CLEAN_START_MARKER)==='1') return data;
  for(const name of BUSINESS_DATA_COLLECTIONS) data[name]=[];
  data.providers = (Array.isArray(data.providers)?data.providers:[]).map(p=>({...p,deleted:false,active:p.active!==false,master:true,branchId:null,branch:null,periodId:null,period:null,excludedBranches:[]}));
  data.settings = (Array.isArray(data.settings)?data.settings:[]).filter(x=>x?.id==='ui');
  if(!data.settings.length) data.settings=[{id:'ui',branch:'General',responsible:'',period:'2026-10'}];
  const current=currentCalendarPeriod();
  data.periods=(Array.isArray(data.periods)?data.periods:[]).map(row=>({...row,startedBranches:[],status:String(row.id)<CONTROL_START_PERIOD?'closed':(String(row.id)===current?'open':'available'),openedAt:undefined,openedBy:undefined,updatedAt:now()}));
  localStorage.setItem(CLEAN_START_MARKER,'1');
  window.__BLUNNO_NEEDS_FRESH_FILE_VAULT_CLEAN__ = true;
  const keysToRemove=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k && (/^blunno-(cash-week|hours-week|expense-category|current-period)-/.test(k) || k==='blunno-operator')) keysToRemove.push(k);}keysToRemove.forEach(k=>localStorage.removeItem(k));
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
  providerSeeds.forEach(name => s.providers.push({ id: uid(), name, active: true, master: true, status:"active", excludedBranches: [], deleted:false, createdBy:"Sistema", createdAt: now(), updatedAt: now() }));
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
      cleaned.push({ id: uid(), name, active: true, master: true, status:"active", excludedBranches: [], deleted:false, createdBy:"Sistema", createdAt: now(), updatedAt: now() });
      existingKeys.add(key);
    }
  }
  data.providers = cleaned.map(p=>({...p,master:true,branchId:null,branch:null,periodId:null,period:null,excludedBranches:Array.isArray(p.excludedBranches)?p.excludedBranches:[]}));
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
    merged = ensurePeriodCatalog(merged);
    merged = resetLocalForRealStart(merged);
    merged = ensureProviderCatalog(merged);
    merged = ensurePeriodCatalog(merged);
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
const vaultClear = async () => { try{const db=await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction("blobs","readwrite");const req=tx.objectStore("blobs").clear();req.onerror=()=>{db.close();reject(req.error)};tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}catch{} };

const actor = () => __BLUNNO_MODULES.firebase.firebaseAuth?.currentUser?.email || window.__blunnoResponsible || "Usuario local";
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
  if (!CONFIG.responsiblePeople.includes(value)) throw new Error("El responsable no es válido. Elegí Agus, Nico, Luz o Flor.");
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
const sectorForCollection = collection => ({incomes:"Ingresos",invoices:"Facturas",cash:"Caja",expenses:"Gastos",investments:"Inversiones",employees:"Personal",hours:"Horas",employeeDebts:"Personal",liquidations:"Liquidaciones",tasks:"Recordatorios",closures:"Cierre mensual",providers:"Proveedores",files:"Archivos",audit:"Auditoría",settings:"Configuración",imports:"Importación"}[collection] || collection);
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
  state=ensurePeriodCatalog(state);
  persist();
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
    if (isFirebaseConfigured()) await remoteAdd(name, row, id);
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
    if (isFirebaseConfigured()) {
      const remotePatch = name === "providers"
        ? {name:row.name, active:row.active!==false, master:true, branchId:null, branch:null, periodId:null, period:null, excludedBranches:row.excludedBranches}
        : (patch || {});
      await remoteUpdate(name, id, remotePatch);
    }
    await audit(options.lateMovement ? "UPDATE_LATE" : "UPDATE", name, id, old, row, responsible, reason, { lateMovement: !!options.lateMovement });
    if (options.lateMovement && wasClosed && row.period) await this.createClosureVersion(row.period, row.branch || "General", responsible, `Actualización por corrección posterior en ${name}.`);
    return row;
  },
  async remove(name, id, responsible, reason = "Baja lógica", options = {}) {
    assertResponsible(responsible);
    if (name === "audit") throw new Error("La auditoría es permanente y no puede eliminarse.");
    const old = this.get(name, id); if (!old) return;
    if(!["files","closures","settings"].includes(name)) assertOpen(old, options.lateMovement, options);
    const row = {...old, deleted: true, status: "deleted", deletedAt: now(), updatedAt: now(), responsible};
    state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteDelete(name, id);
    await audit(options.lateMovement ? "DELETE_LATE" : "DELETE", name, id, old, row, responsible, reason, {lateMovement:!!options.lateMovement});
    if(options.lateMovement && old.period) await this.createClosureVersion(old.period,old.branch||"General",responsible,`Eliminación/corrección posterior en ${name}.`);
  },
  async restore(name, id, responsible) {
    assertResponsible(responsible);
    if (name === "audit") throw new Error("La auditoría es permanente y no puede restaurarse ni eliminarse.");
    const old = this.getRaw(name, id); if (!old) return;
    const row = {...old, deleted: false, status: name === "invoices" ? "CARGADA" : (old.status === "deleted" ? "active" : old.status), restoredAt: now(), updatedAt: now(), responsible}; state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (isFirebaseConfigured()) await remoteUpdate(name, id, {deleted: false, status: row.status, restoredAt: row.restoredAt});
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
    if(isFirebaseConfigured()) { await remoteUpdate("closures",previous.id,{status:"superseded",supersededAt:updated.closedAt,supersededBy:responsible}); await remoteAdd("closures",updated,updated.id); }
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
    if(isFirebaseConfigured()) await remoteUpdate("providers",id,{excludedBranches:row.excludedBranches,updatedAt:row.updatedAt});
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
    const late=invoices.filter(x=>String(x.loadDate||x.createdAt).slice(0,7)>period);
    const missingInvoice=invoices.filter(x=>!x.provider||!String(x.number||'').trim()||!Number.isFinite(Number(x.amount))||!x.branch);
    const missingExpense=expenses.filter(x=>!x.category||!Number.isFinite(Number(x.amount))||!x.branch);
    const missingInvestment=investments.filter(x=>!x.concept||!Number.isFinite(Number(x.amount))||!x.branch);
    const noHours=employees.filter(e=>!hours.some(h=>h.employeeId===e.id));
    const noLiquidation=employees.filter(e=>hours.some(h=>h.employeeId===e.id)&&!liquidations.some(l=>l.employeeId===e.id));
    const closed=this.periodIsClosed(period,branch);
    const checklist=[
      ['Caja diaria',true,`${s.cashCount} movimientos · resto final ${money(s.cashFinal)}`,'cash'],
      ['Ingresos',true,`${this.list('cash',period,branch).filter(x=>x.type==='income').length} movimientos · ${money(s.income)}`,'cash'],
      ['Proveedores / facturas',missingInvoice.length===0,`${s.invoiceCount} facturas · ${missingInvoice.length?missingInvoice.length+' requieren revisión':'sin datos obligatorios faltantes'}`,'invoices'],
      ['Gastos del local',missingExpense.length===0,`${s.expenseCount} gastos · ${missingExpense.length?missingExpense.length+' requieren revisión':'controlados'}`,'expenses'],
      ['Inversiones',missingInvestment.length===0,`${s.investmentCount} inversiones · ${missingInvestment.length?missingInvestment.length+' requieren revisión':'controladas'}`,'investments'],
      ['Horas',noHours.length===0,`${number(s.hours)} horas · ${noHours.length?`Faltan horas para: ${noHours.map(e=>e.name).join(', ')}`:'carga registrada'}`,'hours'],
      ['Liquidaciones',noLiquidation.length===0,`${s.liquidationCount} liquidaciones vigentes · ${noLiquidation.length?`Falta liquidar: ${noLiquidation.map(e=>e.name).join(', ')}`:'sin pendientes'}`,'hours'],
      ['Facturas posteriores al cierre',late.length===0,late.length?`${late.length} factura(s) cargada(s) después del período`:'No se detectaron cargas posteriores','invoices'],
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
    if (isFirebaseConfigured()) { await remoteAdd("closures", closure, closure.id); }
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

__BLUNNO_MODULES.store = { Store, CONTROL_START_PERIOD, periodIsFuture, periodIsStarted, periodStateLabel, isValidPeriod, assertResponsible, periodEditConfirmed, setPeriodEditConfirmed, sourceIdentity, providerAvailableInBranch };
})();

// ===== MODULE: views =====
(() => {
const { CONFIG, money, number, dateLabel, dateTimeLabel, periodLabel, daysInPeriod, isoDate, prevPeriod, today } = __BLUNNO_MODULES.config;
const { Store, CONTROL_START_PERIOD, sourceIdentity, providerAvailableInBranch } = __BLUNNO_MODULES.store;

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
const actions = (collection,id,editType=collection) => {
 const readOnly = typeof window !== "undefined" && window.__blunnoBranch === "General" && ["invoices","cash","expenses","investments","employees","hours","incomes"].includes(collection);
 if (readOnly) return `<div class="row-actions"><button class="secondary-button compact-button" data-detail="${esc(collection)}" data-id="${esc(id)}">Ver</button></div>`;
 return `<div class="row-actions"><input type="checkbox" aria-label="Seleccionar" data-bulk-select="${esc(collection)}" data-id="${esc(id)}"><button data-edit="${editType}" data-id="${esc(id)}">Editar</button><button class="danger-link" data-delete="${collection}" data-id="${esc(id)}">Papelera</button></div>`;
};
const branchFilter = branch => CONFIG.profiles.map(x=>`<button class="filter-chip ${x===branch?'active':''}" data-profile="${x}">${x}</button>`).join("");

const formSchema = {
  cash: [
    ["date","Fecha","date"],["branch","Sucursal","select",CONFIG.branches],
    ["type","Tipo","select",[["income","Ingreso"],["expense","Gasto de caja"],["payment","Pago"]]],
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
    ["date","Fecha","date"],["branch","Sucursal","select",CONFIG.branches],["method","Medio / categoría","select",["Tarjeta","Contado","Mayoristas","Banco","Transferencia","Otros"]],["concept","Origen / concepto","text"],
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
  employee: [["name","Nombre completo","text"],["branch","Sucursal","select",CONFIG.branches],["role","Puesto","text"],["hourlyRate","Valor hora actual","number"],["active","Estado","select",[["true","Activo"],["false","Inactivo"]]]],
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
    <section class="hero"><div><span class="hero-tag">CENTRO DE CONTROL BLUNNO</span><h2>Todo el negocio, ordenado y trazable.</h2><p>${periodLabel(period)} · ${esc(branch)} · cada cambio queda auditado.</p><div class="hero-actions"><button class="primary-button" data-view-jump="close">Preparar cierre</button><button class="secondary-button" data-pdf-close="dashboard">PDF del resumen</button></div></div><img src="distri.jpeg" alt="Distribuidora Blunno"></section>
    <div class="kpi-grid">${detailButton("income","Ingresos",money(s.income),`${Store.list('cash',period,branch).filter(x=>x.type==='income'&&!/^saldo\s+d[ií]a\s+anterior$/i.test(String(x.concept||''))).length} movimientos de Caja diaria`)}${detailButton("expenses","Gastos del local",money(s.localExpense),`${s.expenseCount} movimientos`)}${detailButton("providers","Proveedores",money(s.providers),`${s.invoiceCount} facturas cargadas`)}${detailButton("investments","Inversiones",money(s.investment),`${s.investmentCount} movimientos`)}${detailButton("salary","Personal",money(s.salary),`${s.liquidationCount} liquidaciones / horas`)}${detailButton("result","Resultado",money(s.result),"Sin incluir Caja diaria")}</div>
    <div class="grid-2"><section class="panel"><div class="panel-head"><div><span class="section-kicker">VARIACIÓN</span><h3>Contra ${periodLabel(prevPeriod(period))}</h3></div></div>${metricLine("Ingresos",prev.income,s.income,pct(prev.income,s.income))}${metricLine("Gastos del local",prev.localExpense,s.localExpense,pct(prev.localExpense,s.localExpense))}${metricLine("Resultado",prev.result,s.result,pct(prev.result,s.result))}</section><section class="panel"><div class="panel-head"><div><span class="section-kicker">CONTROL</span><h3>Alertas y pendientes</h3></div></div>${alerts.length?alerts.map(a=>`<div class="alert-row warning">⚠ ${esc(a)}</div>`).join(''):'<div class="alert-row success">✓ No hay alertas críticas detectadas.</div>'}${tasks.map(t=>`<div class="task-mini"><b>${esc(t.title)}</b><span>${dateLabel(t.dueDate)} ${esc(t.dueTime||'')} · ${esc(t.responsible)}</span></div>`).join('')}</section></div>
  `;
}

function metricLine(label,a,b,p){return `<div class="metric-line"><div><b>${esc(label)}</b><span>${money(a)} → ${money(b)}</span></div><strong class="${p>=0?'up':'down'}">${p>=0?'+':''}${p.toFixed(1)}%</strong></div>`}

function renderCash(content,period,branch="General"){
 const data=rows("cash",period,branch);
 const days=daysInPeriod(period);
 const weeks=Math.max(1,Math.ceil(days/7));
 const rawIndex=Number(localStorage.getItem(`blunno-cash-week-${period}-${branch}`)||0);
 const safeIndex=Number.isFinite(rawIndex)?Math.trunc(rawIndex):0;
 const weekIndex=Math.min(Math.max(safeIndex,0),weeks-1);
 const startDay=weekIndex*7+1, endDay=Math.min(startDay+6,days), weekDays=Array.from({length:endDay-startDay+1},(_,i)=>startDay+i);
 const opening=getOpeningForView(period,branch);
 const conceptsByType={income:[...new Set([...CONFIG.cashIncomeConcepts,...data.filter(x=>x.type==='income').map(x=>x.concept||'Sin concepto')])],expense:[...new Set([...CONFIG.cashExpenseConcepts,...data.filter(x=>x.type==='expense').map(x=>x.concept||'Sin concepto')])],payment:[...new Set([...CONFIG.cashPaymentConcepts,...data.filter(x=>x.type==='payment').map(x=>x.concept||'Pagos')])]};
 const dayTotals=Array.from({length:days},(_,i)=>{const d=i+1,date=isoDate(period,d);const inc=data.filter(x=>x.type==='income'&&x.date===date&&!/^saldo\s+d[ií]a\s+anterior$/i.test(String(x.concept||''))).reduce((s,x)=>s+Number(x.amount||0),0),exp=data.filter(x=>x.type==='expense'&&x.date===date).reduce((s,x)=>s+Number(x.amount||0),0),pay=data.filter(x=>x.type==='payment'&&x.date===date).reduce((s,x)=>s+Number(x.amount||0),0);return {d,date,inc,exp,pay}});
 let saldo=opening; dayTotals.forEach(x=>{x.opening=saldo;x.available=saldo+x.inc;x.rest=x.available-x.exp-x.pay;saldo=x.rest});
 const kindTitle={expense:'Gastos de caja',payment:'Pagos'};
 const matrix=(type)=>`<section class="panel cash-matrix-panel"><div class="panel-head"><div><span class="section-kicker">${type==='income'?'INGRESOS':type==='expense'?'GASTOS DE CAJA':'PAGOS'}</span><h3>${kindTitle[type]}</h3></div>${branch!=='General'?`<button class="secondary-button" data-cash-add-row="${type}">＋ Agregar concepto</button>`:''}</div><div class="sheet-wrap"><table class="matrix-table cash-main-matrix"><thead><tr><th class="sticky-col">Concepto</th>${weekDays.map(d=>{const dt=new Date(`${isoDate(period,d)}T12:00:00`);return `<th>${dt.toLocaleDateString('es-AR',{weekday:'short'}).replace('.','')}<small>${d}</small></th>`}).join('')}<th>TOTAL</th></tr></thead><tbody>${conceptsByType[type].map(c=>`<tr><th class="sticky-col">${esc(c)}</th>${weekDays.map(d=>{const date=isoDate(period,d),r=data.find(q=>q.type===type&&q.date===date&&(q.concept||'Sin concepto')===c);const carry=type==='income'&&/^saldo\s+d[ií]a\s+anterior$/i.test(String(c||''));const carryValue=dayTotals[d-1]?.opening||0;return `<td data-cash-cell data-type="${type}" data-concept="${esc(c)}" data-date="${date}"><input inputmode="decimal" ${branch==='General'||carry?'disabled':''} value="${carry?esc(carryValue):r?esc(r.amount):''}" placeholder="—" title="${carry?'Calculado automáticamente desde el resto del día anterior':''}"></td>`}).join('')}<td class="total-cell">${type==='income'&&/^saldo\s+d[ií]a\s+anterior$/i.test(String(c||''))?'—':money(weekDays.reduce((sum,d)=>sum+Number(data.find(q=>q.type===type&&q.date===isoDate(period,d)&&(q.concept||'Sin concepto')===c)?.amount||0),0))}</td></tr>`).join('')||`<tr><td colspan="${weekDays.length+2}" class="empty">No hay conceptos definidos.</td></tr>`}</tbody><tfoot><tr><th class="sticky-col">TOTAL</th>${weekDays.map(d=>`<th>${money(dayTotals[d-1][type==='income'?'inc':type==='expense'?'exp':'pay'])}</th>`).join('')}<th>${money(weekDays.reduce((sum,d)=>sum+Number(dayTotals[d-1][type==='income'?'inc':type==='expense'?'exp':'pay']),0))}</th></tr></tfoot></table></div></section>`;
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">CAJA DIARIA · CUADRO OPERATIVO</span><b>${esc(branch)}</b><small>Control físico de dinero. No alimenta el resultado económico. Semana ${weekIndex+1} de ${weeks} · días ${startDay}–${endDay}.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div>
 <div class="cash-week-nav"><button type="button" class="secondary-button ${weekIndex===0?'week-nav-edge':''}" data-cash-week="prev" aria-disabled="${weekIndex===0?'true':'false'}">← Semana anterior</button><strong>Semana ${weekIndex+1} · ${dateLabel(isoDate(period,startDay))} al ${dateLabel(isoDate(period,endDay))}</strong><button type="button" class="secondary-button ${weekIndex===weeks-1?'week-nav-edge':''}" data-cash-week="next" aria-disabled="${weekIndex===weeks-1?'true':'false'}">Semana siguiente →</button></div>
 <div class="cash-topbar"><div><span>Saldo inicial del período</span><strong>${money(opening)}</strong><small>El resto de cada día pasa automáticamente al siguiente.</small></div>${branch!=='General'?`<button id="cashOpeningButton" class="secondary-button">Editar saldo inicial</button>`:''}<button class="secondary-button" data-pdf-close="cash">Generar PDF</button></div>
 <div class="mini-kpis">${kpi('Ingresos',money(dayTotals.reduce((s,x)=>s+x.inc,0)),'Período')}${kpi('Gastos',money(dayTotals.reduce((s,x)=>s+x.exp,0)),'Período')}${kpi('Resto final',money(saldo),'Saldo que arranca el siguiente día')}</div>
 ${matrix('income')}${matrix('expense')}
 <section class="panel"><div class="panel-head"><div><span class="section-kicker">CONTROL DIARIO</span><h3>Saldo anterior + ingresos − egresos = resto</h3></div></div><div class="table-wrap"><table class="matrix-table"><thead><tr><th>Día</th>${weekDays.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody><tr><th>SALDO ANTERIOR</th>${weekDays.map(d=>`<td>${money(dayTotals[d-1].opening)}</td>`).join('')}</tr><tr><th>INGRESOS</th>${weekDays.map(d=>`<td>${money(dayTotals[d-1].inc)}</td>`).join('')}</tr><tr><th>PLATA DISPONIBLE</th>${weekDays.map(d=>`<td>${money(dayTotals[d-1].available)}</td>`).join('')}</tr><tr><th>GASTOS</th>${weekDays.map(d=>`<td>${money(dayTotals[d-1].exp)}</td>`).join('')}</tr><tr><th>PAGOS</th>${weekDays.map(d=>`<td>${money(dayTotals[d-1].pay)}</td>`).join('')}</tr><tr class="total-row"><th>RESTO</th>${weekDays.map(d=>`<td>${money(dayTotals[d-1].rest)}</td>`).join('')}</tr></tbody></table></div></section>`;
}

function getOpeningForView(period,branch){return Number(Store.db.settings.find(x=>x.id===`cash-opening-${period}-${branch}`)?.amount||0)}

function renderProviders(content,period,branch="General"){
 const data=rows('providers').map(x=>({...x,branchId:null})).sort((a,b)=>String(a.name).localeCompare(String(b.name),'es'));; const invoices=rows('invoices',period,branch);
 const totals=new Map(),dailyByProvider=new Map(); invoices.forEach(x=>{const key=x.provider||'Sin proveedor';totals.set(key,(totals.get(key)||0)+Number(x.amount||0));const date=x.operationDate||x.date;const dm=dailyByProvider.get(key)||new Map();dm.set(date,(dm.get(date)||0)+Number(x.amount||0));dailyByProvider.set(key,dm);});
 const days=daysInPeriod(period); const matrix=data.map(p=>{const dm=dailyByProvider.get(p.name)||new Map();const cells=Array.from({length:days},(_,i)=>{const v=dm.get(isoDate(period,i+1))||0;return `<td>${v?money(v):'—'}</td>`}).join('');return `<tr><th class="sticky-col"><b>${esc(p.name)}</b></th>${cells}<td class="total-cell">${money(totals.get(p.name)||0)}</td></tr>`}).join('');
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">MAESTRO PERMANENTE</span><b>Proveedores</b><small>Los nombres permanecen entre meses. Las facturas son movimientos independientes.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Proveedores</h2><p>Escribí parte del nombre al cargar una factura y completamos la coincidencia.</p></div><button class="secondary-button" data-pdf-close="providers">PDF</button><button class="primary-button" data-new="provider">＋ Nuevo proveedor</button></div>${table(['Proveedor','Facturado en período','Estado maestro','Disponibilidad en este local','Acciones'],data.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${money(totals.get(x.name)||0)}</td><td><span class="status-pill ${x.active===false?'muted':''}">${x.active===false?'INACTIVO':'ACTIVO'}</span></td><td>${branch==='General'?'<span class="status-pill success">TODOS LOS LOCALES</span>':`<span class="status-pill ${providerAvailableInBranch(x,branch)?'success':'warning'}">${providerAvailableInBranch(x,branch)?'DISPONIBLE':'NO DISPONIBLE'}</span>`}</td><td>${actions('providers',x.id,'provider')}<button class="secondary-button compact-button" data-provider-history="${esc(x.name)}">Historial</button>${branch!=='General'?`<button class="secondary-button compact-button" data-provider-branch-toggle="${esc(x.id)}" data-provider-branch="${esc(branch)}" data-provider-available="${providerAvailableInBranch(x,branch)?'1':'0'}">${providerAvailableInBranch(x,branch)?'Quitar de este local':'Agregar a este local'}</button>`:''}</td></tr>`).join(''))}<section class="panel"><div class="panel-head"><div><span class="section-kicker">PLANILLA</span><h3>Proveedor × día · ${periodLabel(period)}</h3></div></div><div class="sheet-wrap"><table class="hours-sheet provider-matrix"><thead><tr><th class="sticky-col">Proveedor</th>${Array.from({length:days},(_,i)=>`<th>${i+1}</th>`).join('')}<th>TOTAL</th></tr></thead><tbody>${matrix}</tbody></table></div></section>`;
}

function renderInvoices(content,period,branch="General"){
 const data=rows('invoices',period,branch).sort((a,b)=>String(b.operationDate||b.date).localeCompare(String(a.operationDate||a.date))); const total=data.reduce((s,x)=>s+Number(x.amount||0),0);
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">FACTURAS · CARGA Y CONTROL</span><b>${esc(branch)}</b><small>Solo cargamos la factura. No hay estado de pago ni vencimiento: una factura cargada queda marcada en verde como CARGADA.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><section class="panel quick-invoice"><div class="panel-head"><div><span class="section-kicker">CARGA EXPRESS</span><h3>Una factura en segundos</h3></div></div>${branch==='General'?`<div class="notice warning">Elegí una sucursal concreta arriba para cargar facturas.</div>`:`<div class="quick-invoice-grid"><div class="provider-picker quick-provider-picker"><div class="provider-picker-line"><input id="quickInvoiceProvider" autocomplete="off" placeholder="Proveedor"><button type="button" class="provider-picker-toggle">⌄</button></div><div class="provider-suggestions"></div></div><input id="quickInvoiceNumber" placeholder="N° factura"><input id="quickInvoiceDate" type="date" value="${today()}"><input id="quickInvoiceAmount" inputmode="decimal" placeholder="Importe"><button class="primary-button" data-invoice-quick-save>Guardar factura</button></div><div class="quick-hint">Ejemplo: Aguilera · 0001-00012345 · fecha · $ 125.000</div>`}</section><div class="page-intro"><div><h2>Facturas</h2><p>Cada factura conserva fecha de movimiento, fecha de carga, sucursal, responsable y auditoría. La misma numeración puede repetirse en distintas sucursales.</p></div><button class="secondary-button" data-pdf-close="invoices">PDF</button></div><div class="mini-kpis">${kpi('Total',money(total))}${kpi('Documentos',data.length)}${kpi('Proveedores con facturas',new Set(data.map(x=>x.provider)).size)}</div>${table(['Proveedor','Factura','Movimiento','Carga','Sucursal','Importe','Estado','Acciones'],data.map(x=>`<tr><td><b>${esc(x.provider)}</b></td><td>${esc(x.number||'—')}</td><td>${dateLabel(x.operationDate||x.date)}</td><td>${dateTimeLabel(x.loadDate||x.createdAt)}</td><td>${esc(x.branch)}</td><td class="amount clickable" data-detail="invoices" data-id="${x.id}">${money(x.amount)}</td><td><span class="status-pill success">CARGADA</span></td><td>${actions('invoices',x.id)}</td></tr>`).join(''))}`;
}

function canonicalExpenseCategory(value){const key=sourceIdentity(value);return CONFIG.expenseCategories.find(c=>sourceIdentity(c)===key)||'';}
function renderExpenses(content,period,branch="General"){
 const allData=rows('expenses',period,branch).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 let selectedCategory=localStorage.getItem(`blunno-expense-category-${period}-${branch}`)||"ALL";
 if(selectedCategory!=='ALL'){selectedCategory=canonicalExpenseCategory(selectedCategory)||"ALL";localStorage.setItem(`blunno-expense-category-${period}-${branch}`,selectedCategory);}
 const data=selectedCategory==='ALL'?allData:allData.filter(x=>canonicalExpenseCategory(x.category)===selectedCategory); const total=allData.reduce((s,x)=>s+Number(x.amount||0),0); const cats=CONFIG.expenseCategories.map(c=>[c,allData.filter(x=>canonicalExpenseCategory(x.category)===c).reduce((s,x)=>s+Number(x.amount||0),0)]).filter(x=>x[1]);
 const categoryPdf=selectedCategory!=='ALL'?`<button type="button" class="secondary-button" data-expense-selected-category-pdf>Descargar PDF · ${esc(selectedCategory)}</button>`:'';
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">GASTOS DEL LOCAL</span><b>${esc(branch)}</b><small>Categorías basadas en la estructura de tus planillas.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Gastos por categoría</h2><p>Proveedores y gastos del local se mantienen separados.</p></div><div class="page-actions">${selectedCategory!=='ALL'?categoryPdf:''}<button class="secondary-button" data-pdf-close="expenses">Descargar PDF general</button><button class="primary-button" data-new="expense">＋ Nuevo gasto</button></div></div><div class="mini-kpis">${kpi('Total gastos',money(total))}${kpi('Movimientos',data.length)}${kpi('Categorías usadas',cats.length)}</div><section class="panel expense-history-panel"><div class="panel-head"><div><span class="section-kicker">HISTORIAL POR CATEGORÍA</span><h3>${selectedCategory==='ALL'?'Todos los movimientos':`Gastos · ${esc(selectedCategory)}`}</h3></div><label class="field-inline">Categoría<select id="expenseCategoryFilter"><option value="ALL" ${selectedCategory==='ALL'?'selected':''}>Todas</option>${CONFIG.expenseCategories.map(c=>`<option value="${esc(c)}" ${selectedCategory===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label></div><p>Seleccioná una categoría para ver únicamente sus movimientos del local y del período. La opción Descargar PDF genera solo ese rubro.</p></section><div class="category-cards">${cats.map(([c,v])=>`<div class="category-card ${selectedCategory===c?'selected':''}"><button type="button" class="category-card-main" data-expense-category="${esc(c)}"><span>${esc(c)}</span><strong>${money(v)}</strong></button><button type="button" class="category-card-pdf" data-expense-category-pdf="${esc(c)}">PDF</button></div>`).join('')||'<div class="empty-block">Todavía no hay gastos por categoría.</div>'}</div>${table(['Fecha','Categoría','Detalle','Sucursal','Importe','Responsable','Acciones'],data.map(x=>`<tr><td>${dateLabel(x.date)}</td><td><b>${esc(x.category)}</b></td><td>${esc(x.concept)}</td><td>${esc(x.branch)}</td><td class="amount">${money(x.amount)}</td><td>${esc(x.responsible)}</td><td>${branch==='General'?`<div class="row-actions"><button class="secondary-button compact-button" data-detail="expenses" data-id="${esc(x.id)}">Ver</button></div>`:`<div class="row-actions"><input type="checkbox" aria-label="Seleccionar" data-bulk-select="expenses" data-id="${esc(x.id)}"><button data-expense-edit="${esc(x.id)}">Editar</button><button class="danger-link" data-delete="expenses" data-id="${esc(x.id)}">Papelera</button></div>`}</td></tr>`).join(''))}`;
}

function renderPeople(content,period,branch="General"){
 const all=rows('employees').filter(x=>x.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const visible=all.filter(x=>branch==='General'||x.branch===branch);
 const branchOrder=CONFIG.branches.filter(b=>branch==='General'||b===branch);
 const groups=branchOrder.map(b=>({branch:b,items:visible.filter(x=>x.branch===b)})).filter(g=>g.items.length||branch!=='General');
 const groupHtml=groups.map(g=>`<section class="panel people-branch-group"><div class="people-group-head"><div><span class="section-kicker">SUCURSAL</span><h3>${esc(g.branch)}</h3><p>${g.items.length} empleado${g.items.length===1?'':'s'} registrado${g.items.length===1?'':'s'} en este perfil.</p></div><span class="status-pill">${g.items.length} PERSON${g.items.length===1?'A':'AS'}</span></div><div class="people-grid">${g.items.map(x=>{const liqs=Store.list('liquidations',period,g.branch).filter(l=>l.employeeId===x.id).sort((a,b)=>String(b.createdAt||b.date).localeCompare(String(a.createdAt||a.date)));const vouchers=liqs.length?`<div class="salary-vouchers"><div class="salary-voucher-head"><span>COMPROBANTE DE SUELDO · ${esc(periodLabel(period))}</span><b>${liqs.length} generado${liqs.length===1?'':'s'}</b></div>${liqs.map(l=>`<div class="salary-voucher"><div><strong>${money(l.net)}</strong><span>${l.net<0?'SALDO NEGATIVO':'A COBRAR'} · ${dateTimeLabel(l.createdAt||l.date)}</span><small>GENERADO · NO IMPLICA PAGO · Resp.: ${esc(l.responsible||'—')}</small></div><div class="row-actions"><button data-salary-view="${l.id}">Ver</button><button data-salary-edit="${l.id}">Modificar</button><button data-salary-pdf="${l.id}">PDF</button><button class="danger-link" data-salary-delete="${l.id}">Eliminar</button></div></div>`).join('')}</div>`:`<div class="salary-vouchers empty-salary"><span>COMPROBANTE DE SUELDO · ${esc(periodLabel(period))}</span><small>Todavía no se totalizó el sueldo de este empleado en este período.</small></div>`;return `<article class="employee-card"><div class="employee-card-top"><div class="employee-avatar">${esc((x.name||'—').trim().charAt(0).toUpperCase())}</div><div><h4>${esc(x.name)}</h4><span class="employee-status ${x.active===false?'inactive':''}">${x.active===false?'INACTIVO':'ACTIVO'}</span></div></div><div class="employee-facts"><div><span>Puesto</span><strong>${esc(x.role||'—')}</strong></div><div><span>Sucursal</span><strong>${esc(x.branch||'—')}</strong></div><div><span>Valor hora</span><strong>${money(x.hourlyRate||0)}</strong></div><div><span>Estado</span><strong>${x.active===false?'Inactivo':'Activo'}</strong></div></div><div class="employee-actions">${actions('employees',x.id,'employee')}<button class="secondary-button compact-button" data-view-jump="hours" data-hours-employee="${x.id}">Ver horas</button></div>${vouchers}</article>`;}).join('')||'<div class="empty-block">No hay empleados asignados a esta sucursal.</div>'}</div></section>`).join('');
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">PERSONAL</span><b>${esc(branch)}</b><small>${branch==='General'?'Vista consolidada agrupada por sucursal. Los empleados conservan siempre su sucursal original.':'Solo se muestran empleados pertenecientes a esta sucursal.'}</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Personal</h2><p>Los datos de cada empleado están organizados con el nombre de cada campo arriba de su valor para una lectura rápida.</p></div><div class="page-actions"><button class="secondary-button" data-pdf-close="people">Generar PDF</button><button class="primary-button" data-new="employee">＋ Nuevo empleado</button></div></div>${groupHtml||'<div class="empty-block">No hay empleados registrados.</div>'}`;
}

function renderHours(content,period,branch="General"){
 const allEmployees=Store.list('employees').filter(e=>e.active!==false&&(branch==='General'||e.branch===branch)).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const savedEmployee=localStorage.getItem('blunno-hours-employee')||'ALL';
 const selectedEmployee=allEmployees.some(e=>e.id===savedEmployee)?savedEmployee:'ALL';
 const employees=allEmployees.filter(e=>selectedEmployee==='ALL'||e.id===selectedEmployee);
 const data=Store.list('hours',period,branch);
 const days=daysInPeriod(period);
 const lastWeek=Math.max(1,Math.ceil(days/7));
 const editable=branch!=='General';
 const disabledAttr=editable?'':'disabled';
 let selectedWeek=Number(localStorage.getItem(`blunno-hours-week-${period}-${branch}`)||1);
 if(!Number.isFinite(selectedWeek)||selectedWeek<1)selectedWeek=1;
 if(selectedWeek>lastWeek)selectedWeek=lastWeek;
 const weekStart=(selectedWeek-1)*7+1;
 const weekEnd=Math.min(days,weekStart+6);
 const weekDates=Array.from({length:weekEnd-weekStart+1},(_,i)=>weekStart+i);
 const currentRows=Store.list('hours',period,branch);
 const getRow=(employeeId,date)=>currentRows.find(x=>x.employeeId===employeeId&&x.date===date);
 const valueFor=e=>{const rs=currentRows.filter(x=>x.employeeId===e.id);const worked=rs.reduce((s,x)=>s+Number(x.hours||0),0),holiday=rs.filter(x=>x.holiday==='yes').reduce((s,x)=>s+Number(x.hours||0),0);return {normal:worked,holiday,overtime:rs.reduce((s,x)=>s+Number(x.overtimeHours||0),0),advance:rs.reduce((s,x)=>s+Number(x.advance||0),0),merch:rs.reduce((s,x)=>s+Number(x.merchandise||0),0)};};
 const totals={normal:0,holiday:0,overtime:0,advance:0,merch:0}; employees.forEach(e=>{const v=valueFor(e);Object.keys(totals).forEach(k=>totals[k]+=v[k]);});
 const weekLabel=weekStart===weekEnd?`Día ${weekStart}`:`Días ${weekStart} - ${weekEnd}`;
 const nav=(dir,disabled)=>`<button class="secondary-button" data-hours-week="${dir}" ${disabled?'disabled':''}>${dir==='prev'?'← Semana anterior':'Siguiente semana →'}</button>`;
 const header=weekDates.map(d=>{const date=isoDate(period,d),dt=new Date(`${date}T12:00:00`);return `<th class="hours-day-head"><span>${dt.toLocaleDateString('es-AR',{weekday:'short'}).replace('.','')}</span><b>${String(d).padStart(2,'0')}</b></th>`}).join('');
 const rowsHtml=employees.map(e=>{const v=valueFor(e);return `<tr><th class="hours-employee-col"><strong>${esc(e.name)}</strong><small>${esc(e.branch||'—')}</small></th>${weekDates.map(d=>{const date=isoDate(period,d),r=getRow(e.id,date),holiday=r?.holiday==='yes',franco=r?.status==='franco';return `<td class="hours-entry-cell ${holiday?'holiday-cell':''} ${franco?'franco-cell':''}"><div class="hours-cell-stack"><label><span>Horas</span><input data-hour-field="hours" data-hour-date="${date}" data-employee="${e.id}" value="${esc(r?.displayValue??'')}" placeholder="—" inputmode="decimal" title="Número de horas · F = franco · H = feriado" ${disabledAttr}></label><label class="overtime-mini"><span>Extras</span><input data-hour-field="overtime" data-hour-date="${date}" data-employee="${e.id}" value="${r?.overtimeHours?esc(r.overtimeHours):''}" placeholder="0" inputmode="decimal" title="Horas extras manuales" ${disabledAttr}></label></div></td>`}).join('')}<td class="week-total-cell"><strong>${number(v.normal+v.holiday+v.overtime)}</strong><small>total mes</small></td></tr>`}).join('');
 const summaryRows=employees.map(e=>{const v=valueFor(e);return `<tr><td><b>${esc(e.name)}</b><small class="cell-note">${esc(e.branch||'—')}</small></td><td>${number(v.normal)}</td><td>${number(v.holiday)}</td><td>${number(v.overtime)}</td><td class="amount">${number(v.normal+v.holiday+v.overtime)}</td><td>${money(v.advance)}</td><td>${money(v.merch)}</td><td>${editable?`<button class="primary-button compact-button" data-liquidate="${e.id}">Totalizar sueldo</button>`:`<span class="status-pill muted">Solo consulta</span>`}</td></tr>`}).join('');
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">HORAS MENSUALES · PLANILLA</span><b>${esc(branch)}</b><small>Planilla compacta por semana. En cada día podés cargar horas normales, F = franco, H = feriado y Extras de forma manual.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Horas mensuales</h2><p>Semana ${selectedWeek} de ${lastWeek} · ${weekLabel}. Enter guarda la celda y pasa al siguiente día.</p></div><div class="page-actions"><button class="secondary-button" data-open-holidays>Feriados</button><button class="secondary-button" data-pdf-close="hours">Generar PDF</button>${editable?'<button class="primary-button" data-new="hours">＋ Carga manual</button>':''}</div></div><section class="panel hours-control-panel"><div class="hours-control-main"><div><span class="section-kicker">PERÍODO ACTIVO</span><strong>${periodLabel(period)}</strong><span>${employees.length} empleado${employees.length===1?'':'s'} visible${employees.length===1?'':'s'}</span></div><label class="hours-filter">Empleado<select id="hoursEmployeeFilter"><option value="ALL" ${selectedEmployee==='ALL'?'selected':''}>Todos los empleados</option>${allEmployees.map(e=>`<option value="${e.id}" ${selectedEmployee===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label></div><div class="hours-week-nav">${nav('prev',selectedWeek===1)}<div class="hours-week-current"><span>Semana ${selectedWeek}</span><b>${weekLabel}</b></div>${nav('next',selectedWeek===lastWeek)}</div></section><section class="panel"><div class="panel-head"><div><span class="section-kicker">CARGA RÁPIDA</span><h3>${weekLabel}</h3><p>Las horas extras se cargan en su propio casillero y se guardan en el mismo registro diario.</p></div></div><div class="table-wrap hours-v20-wrap"><table class="hours-v20-table"><thead><tr><th class="hours-employee-col">Empleado</th>${header}<th class="hours-total-col">Total</th></tr></thead><tbody>${rowsHtml||`<tr><td colspan="${weekDates.length+2}" class="empty">No hay empleados asignados a ${esc(branch)}.</td></tr>`}</tbody></table></div></section><section class="panel"><div class="panel-head"><div><span class="section-kicker">RESUMEN MENSUAL</span><h3>Totales para liquidación</h3></div></div><div class="hours-summary-strip"><div><span>Horas normales</span><strong>${number(totals.normal)}</strong></div><div><span>Horas feriado</span><strong>${number(totals.holiday)}</strong></div><div><span>Horas extras</span><strong>${number(totals.overtime)}</strong></div><div><span>Total cargado</span><strong>${number(totals.normal+totals.holiday+totals.overtime)}</strong></div></div><div class="table-wrap"><table><thead><tr><th>Empleado</th><th>Normales</th><th>Feriado</th><th>Extras</th><th>Total</th><th>Adelantos</th><th>Mercadería</th><th>Liquidación</th></tr></thead><tbody>${summaryRows||'<tr><td colspan="8" class="empty">No hay datos para resumir.</td></tr>'}</tbody></table></div></section><section class="panel"><div class="panel-head"><div><span class="section-kicker">REFERENCIA</span><h3>Cómo cargar las celdas</h3></div></div><div class="legend-row"><span><b>8</b> horas normales</span><span><b>F</b> franco</span><span><b>H</b> feriado</span><span><b>Extras</b> se ingresa manualmente</span><span><b>Enter</b> guarda y avanza</span></div></section>`;
}

function renderInvestments(content,period,branch="General"){
 const data=rows('investments',period,branch).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||'').localeCompare(String(a.createdAt||''))); const total=data.reduce((s,x)=>s+Number(x.amount||0),0);
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">GASTOS DE INVERSIÓN</span><b>${esc(branch)}</b><small>Cada sucursal conserva su propia cuenta; General consolida sin mezclar registros.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Inversiones</h2><p>Resumen, importe, fecha, hora, responsable y comprobante quedan registrados.</p></div><div class="page-actions"><button class="secondary-button" data-pdf-close="investments">Generar PDF</button><button class="secondary-button" data-print-investments>Imprimir historial</button><button class="primary-button" data-new="investment">＋ Nueva inversión</button></div></div><div class="mini-kpis">${kpi('Invertido',money(total))}${kpi('Movimientos',data.length)}${kpi('Período',periodLabel(period))}</div>${table(['Fecha','Resumen','Sucursal','Importe','Comprobante','Responsable','Acciones'],data.map(x=>`<tr><td>${dateTimeLabel(x.createdAt||`${x.date}T12:00:00`)}</td><td><b>${esc(x.concept)}</b><small class="cell-note">${esc(x.notes||'')}</small></td><td>${esc(x.branch)}</td><td class="amount">${money(x.amount)}</td><td>${esc(x.document||'—')}</td><td>${esc(x.responsible||'—')}</td><td>${branch==='General'?`<div class="row-actions"><button class="secondary-button compact-button" data-detail="investments" data-id="${x.id}">Ver</button></div>`:`<div class="row-actions"><input type="checkbox" aria-label="Seleccionar" data-bulk-select="investments" data-id="${x.id}"><button data-investment-edit="${x.id}">Modificar</button><button class="danger-link" data-delete="investments" data-id="${x.id}">Papelera</button></div>`}</td></tr>`).join(''))}`;
}
function renderResults(content,period,branch="General"){
 const s=Store.summary(period,branch); const byCat=CONFIG.expenseCategories.map(c=>[c,rows('expenses',period,branch).filter(x=>x.category===c).reduce((a,x)=>a+Number(x.amount||0),0)]).filter(x=>x[1]);
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">RESULTADOS</span><b>${esc(branch)}</b><small>Ingresos, gastos, proveedores, inversiones y personal separados.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div><div class="page-intro"><div><h2>Resultado mensual</h2><p>El resultado se calcula con la estructura real del negocio.</p></div><div class="page-actions"><button class="secondary-button" data-pdf-close="results">Generar PDF</button><button class="secondary-button" data-print-view="results">Imprimir</button></div></div><div class="result-grid">${[['Ingresos',s.income,'good'],['Gastos operativos',s.totalExpenses,s.result>=0?'':'bad'],['Proveedores',s.providers,''],['Inversiones',s.investment,''],['Personal estimado',s.salary,''],['Resultado',s.result,s.result>=0?'good':'bad']].map(x=>`<div class="result-card"><span>${x[0]}</span><strong class="${x[2]}">${money(x[1])}</strong><p>${x[0]==='Resultado'?'Ingresos menos gastos operativos, inversión y costo estimado de horas.':''}</p></div>`).join('')}</div><section class="panel"><div class="panel-head"><div><span class="section-kicker">GASTOS</span><h3>Distribución por categoría</h3></div></div>${table(['Categoría','Monto','% de gastos'],byCat.map(([c,v])=>`<tr><td><b>${esc(c)}</b></td><td>${money(v)}</td><td>${s.totalExpenses?((v/s.totalExpenses)*100).toFixed(1):0}%</td></tr>`).join(''))}</section>`;
}

function renderCompare(content,period,branch="General",compareA=prevPeriod(period),compareB=period){
 const periods=[...new Set([period,prevPeriod(period),...Store.db.periods.map(x=>x.id)])].sort().reverse();
 const calc=p=>Store.summary(p,branch); const a=calc(compareA),b=calc(compareB); const pct=(x,y)=>x===0?(y===0?0:100):((y-x)/Math.abs(x))*100; const line=(l,x,y)=>`<tr><td><b>${l}</b></td><td>${money(x)}</td><td>${money(y)}</td><td>${money(y-x)}</td><td class="${y-x>=0?'up':'down'}">${pct(x,y)>=0?'+':''}${pct(x,y).toFixed(1)}%</td></tr>`;
 content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">COMPARATIVAS</span><h2>Comparación de períodos</h2><p>Elegí dos meses distintos; también podés ver la evolución de seis meses.</p></div><button class="secondary-button" data-pdf-close="compare">Descargar PDF</button></div><div class="compare-controls"><label>Período A<select data-compare-select="a">${periods.map(p=>`<option value="${p}" ${p===compareA?'selected':''}>${periodLabel(p)}</option>`).join('')}</select></label><span>vs.</span><label>Período B<select data-compare-select="b">${periods.map(p=>`<option value="${p}" ${p===compareB?'selected':''}>${periodLabel(p)}</option>`).join('')}</select></label></div><div class="profile-bar compact"><div><b>Perfil: ${esc(branch)}</b></div><div class="profile-chips">${branchFilter(branch)}</div></div>${table(['Indicador',periodLabel(compareA),periodLabel(compareB),'Diferencia','Variación'],[line('Ingresos',a.income,b.income),line('Gastos',a.totalExpenses,b.totalExpenses),line('Resultado',a.result,b.result),line('Proveedores',a.providers,b.providers),line('Inversiones',a.investment,b.investment),line('Horas',a.hours,b.hours)].join(''))}<section class="panel"><div class="panel-head"><div><span class="section-kicker">EVOLUCIÓN</span><h3>Últimos 6 meses desde ${periodLabel(compareB)}</h3></div></div><div class="bar-chart">${Array.from({length:6},(_,i)=>{const [y,m]=compareB.split('-').map(Number);const d=new Date(y,m-1-i,1),p=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,s=calc(p);return `<div class="bar-item"><div class="bar-track"><div class="bar-fill" style="height:${Math.min(100,Math.abs(s.result)/(Math.max(1,...Array.from({length:6},(_,j)=>{const dd=new Date(y,m-1-j,1),pp=`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}`;return Math.abs(calc(pp).result)})))*100)}%"></div></div><b>${p.slice(5)}</b><span>${money(s.result)}</span></div>`}).reverse().join('')}</div></section>`;
}

function renderTasks(content){const all=Store.list('tasks').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`));const pending=all.filter(x=>x.status!=='completed'),done=all.filter(x=>x.status==='completed');content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">CENTRO DE ATENCIÓN</span><h2>Recordatorios</h2><p>Las tareas viven dentro de Blunno. Completar una tarea también queda auditado.</p></div><button class="primary-button" data-new="task">＋ Nuevo recordatorio</button></div><div class="task-columns"><section class="panel"><h3>Pendientes</h3>${pending.map(t=>taskCard(t)).join('')||'<div class="empty-block">No hay tareas pendientes.</div>'}</section><section class="panel"><h3>Completadas</h3>${done.slice(0,20).map(t=>taskCard(t,true)).join('')||'<div class="empty-block">Todavía no hay tareas completadas.</div>'}</section></div>`}
function taskCard(t,done=false){return `<div class="task-card ${t.priority==='urgent'?'urgent':''}"><div><span class="priority ${t.priority}">${esc(t.priority||'normal')}</span><b>${esc(t.title)}</b><small>📅 ${dateLabel(t.dueDate)} ${esc(t.dueTime||'')} · 👤 ${esc(t.responsible)}</small></div>${done?`<div class="row-actions"><span class="status-pill success">REALIZADA</span><button class="danger-link" data-delete="tasks" data-id="${esc(t.id)}">Borrar</button></div>`:`<button class="primary-button" data-complete-task="${t.id}">✓ Realizada</button>`}</div>`}

function renderClose(content,period,branch="General"){
 if(branch==='General'){
  const rows=CONFIG.branches.map(b=>{const ss=Store.summary(period,b);const closed=Store.periodIsClosed(period,b);return `<div class="close-summary"><div><span>${esc(b)}</span><b>${closed?'CERRADO':'ABIERTO'}</b></div><div><span>Resultado</span><b>${money(ss.result)}</b></div><div><span>Facturas</span><b>${ss.invoiceCount}</b></div></div>`}).join('');
  content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">CIERRE CONSOLIDADO</span><h2>General es una vista de consulta</h2><p>El cierre mensual se realiza por sucursal. General consolida el estado sin crear, modificar ni reemplazar cierres de las sucursales.</p></div></div><section class="panel"><div class="panel-head"><div><span class="section-kicker">ESTADO DEL MES</span><h3>${periodLabel(period)}</h3></div></div>${rows}</section>`; return;
 }
 const s=Store.summary(period,branch),closed=Store.periodIsClosed(period,branch);
 const versions=Store.db.closures.filter(x=>x.period===period&&x.branch===branch).sort((a,b)=>Number(b.version||0)-Number(a.version||0));
 const validation=Store.validateClosure(period,branch);
 const checklist=validation.checklist;
 const blockers=checklist.filter(x=>!x[1]);
 const current=versions[0];
 const modifyClosedButton=String(period)<CONTROL_START_PERIOD?'<button class="secondary-button" data-period-edit="'+esc(period)+'">✏️ Modificar mes</button>':'<button class="secondary-button" data-reopen-period="1">Reabrir con motivo</button>';
 content.innerHTML=`<div class="profile-bar"><div><span class="section-kicker">CIERRE MENSUAL CONTROLADO</span><b>${esc(branch)}</b><small>El cierre es manual y versionado. Las correcciones posteriores quedan como una nueva versión.</small></div><div class="profile-chips">${branchFilter(branch)}</div></div>
 <div class="close-status ${closed?'closed':'open'}"><div><span>ESTADO</span><strong>${closed?'CERRADO':'ABIERTO'}</strong></div><div><span>VERSIÓN ACTUAL</span><strong>${current?.version||0}</strong></div><div><span>RESULTADO</span><strong>${money(s.result)}</strong></div><div><span>RESPONSABLE</span><strong>${esc(current?.responsible||'Sin cerrar')}</strong></div></div>
 <section class="panel"><div class="panel-head"><div><span class="section-kicker">CENTRO DE CONTROL MENSUAL</span><h3>Estado del período</h3></div>${closed?modifyClosedButton:'<button class="primary-button" data-close-period="1">Cerrar y generar PDF</button>'}</div><div class="close-check-grid">${checklist.map(([name,ok,detail,target])=>`<div class="close-check ${ok?'ok':'block'} ${ok?'':'has-error'}"><div class="check-icon">${ok?'✓':'✕'}</div><div><b>${esc(name)}</b><span>${esc(detail)}</span></div>${ok?'<strong>OK</strong>':`<button type="button" class="close-review-button" data-close-review="${esc(target)}">Solucionar / Revisar ↗</button>`}</div>`).join('')}</div>${blockers.length?`<div class="notice danger-box">Hay ${blockers.length} controles que requieren revisión antes de cerrar.</div>`:'<div class="notice success">✓ El control previo no encontró bloqueos.</div>'}</section>
 <section class="panel"><div class="panel-head"><div><span class="section-kicker">FOTOGRAFÍA</span><h3>Totales del cierre</h3></div></div><div class="close-summary"><div><span>Ingresos</span><b>${money(s.income)}</b></div><div><span>Gastos del local</span><b>${money(s.localExpense)}</b></div><div><span>Proveedores</span><b>${money(s.providers)}</b></div><div><span>Inversiones</span><b>${money(s.investment)}</b></div><div><span>Personal</span><b>${money(s.salary)}</b></div><div><span>Resultado</span><b>${money(s.result)}</b></div><div><span>Caja diaria</span><b>Separada</b></div></div></section>
 <section class="panel"><div class="panel-head"><div><span class="section-kicker">VERSIÓN VIGENTE</span><h3>Documento archivado</h3></div></div>${closed&&current?`<div class="close-current-actions"><div><b>Cierre ${periodLabel(period)} · versión ${current.version}</b><span>Generado y archivado en Archivos. Se puede volver a imprimir o descargar las veces que sea necesario.</span></div><div class="page-actions"><button class="secondary-button" data-close-version="${current.id}">Generar / ver PDF</button><button class="secondary-button" data-close-version-print="${current.id}">Imprimir</button><button class="primary-button" data-close-version-download="${current.id}">Descargar</button></div></div>`:'<div class="empty-block">El período todavía no tiene una versión de cierre registrada.</div>'}</section>
 <section class="panel"><div class="panel-head"><div><span class="section-kicker">VERSIONES DEL CIERRE</span><h3>Historial completo</h3></div></div>${versions.map(v=>`<div class="version-row"><div><b>Versión ${v.version}</b><span>${dateTimeLabel(v.closedAt)} · ${esc(v.responsible)} · ${esc(v.status)}</span></div><strong>${money(v.summary?.result)}</strong><div class="row-actions"><button class="secondary-button compact-button" data-close-version="${v.id}">PDF</button><button class="secondary-button compact-button" data-close-version-print="${v.id}">Imprimir</button><button class="secondary-button compact-button" data-close-version-download="${v.id}">Descargar</button></div></div>`).join('')||'<div class="empty-block">Todavía no hay cierres registrados.</div>'}</section>`;
}
function renderFiles(content,period,branch="General"){
 const allFiles=Store.list('files').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
 const files=allFiles.filter(f=>branch==='General'||f.branch===branch);
 const groups=new Map();
 for(const f of files){const dt=String(f.period||period), year=dt.slice(0,4)||'Sin año', month=dt.slice(5,7)||'00', key=`${year}|${month}|${f.branch||'General'}|${f.sector||'Documento'}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
 const groupHtml=[...groups.entries()].map(([key,items])=>{const [year,month,b,se]=key.split('|');return `<details class="file-folder" open><summary><span>📁 ${esc(year)} / ${esc(periodLabel(`${year}-${month}`))} / ${esc(b)} / ${esc(se)}</span><b>${items.length}</b></summary><div class="file-grid">${items.map(f=>{const integrity=Store.fileIntegrity(f);return `<article class="file-card"><div class="file-type">📄 ${esc(f.mime||'PDF')}</div><h3>${esc(f.name)}</h3><p>${esc(f.sector||'Documento')} · ${esc(f.branch||'General')} · ${periodLabel(f.period||period)}</p><div class="file-meta"><span>Generado: ${dateTimeLabel(f.createdAt)}</span><span>Responsable: ${esc(f.responsible||'—')}</span><span>Versión: ${esc(f.version||1)}</span><span>Ruta: ${esc(f.storagePath||'local/archivos')}</span></div><div class="file-integrity ${integrity.status==='ok'?'ok':integrity.status==='anterior'?'warning':'neutral'}">${integrity.status==='ok'?'✓ Integridad vigente':integrity.status==='anterior'?'⚠ Documento anterior al último cambio':'• Sin comparación de origen'}</div><div class="row-actions"><button class="secondary-button" data-view-file="${esc(f.id)}">Ver</button><button class="primary-button" data-download-file="${esc(f.id)}">Descargar</button><button class="secondary-button" data-print-file="${esc(f.id)}">Imprimir</button><button class="danger-link" data-delete="files" data-id="${esc(f.id)}">Papelera</button></div></article>`}).join('')}</div></details>`}).join('')||'<div class="empty-block">No hay documentos para este contexto.</div>';
 content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">REPOSITORIO DOCUMENTAL</span><h2>Archivos</h2><p>Organizados por año, mes, sucursal y sector. Cada archivo conserva ficha documental, versión, ubicación e integridad.</p></div><button class="secondary-button" data-view-jump="import">Importar / backup</button></div><div class="file-filters"><span>${files.length} documentos visibles</span><span>${allFiles.length} documentos en el repositorio local</span><span>Perfil: ${esc(branch)} · ${periodLabel(period)}</span></div>${groupHtml}`;
}

function auditForContext(contextPeriod,contextBranch){
 const rows=Store.db.audit||[];
 return rows.filter(x=>{
   if(contextBranch==='General') return x.period===contextPeriod || (!x.period && !x.branch);
   return x.period===contextPeriod && x.branch===contextBranch;
 });
}
function renderHistory(content,period=window.__blunnoPeriod||today().slice(0,7),branch=window.__blunnoBranch||"General"){
 const data=auditForContext(period,branch);
 content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">AUDITORÍA PERMANENTE</span><h2>Historial y trazabilidad</h2><p>Fecha, hora, minuto, responsable, sector, sucursal, período, acción, registro afectado y antes/después. La auditoría no se elimina.</p></div><button class="secondary-button" id="exportAudit">Exportar auditoría</button><button class="secondary-button" data-pdf-close="history">PDF</button></div>${table(['Fecha / hora','Acción','Sector','Sucursal','Período','Responsable','Registro','Cambios'],data.map(x=>`<tr><td>${dateTimeLabel(x.at)}</td><td><span class="audit-action">${esc(x.action)}</span></td><td>${esc(x.sector||x.collection)}</td><td>${esc(x.branch||'—')}</td><td>${x.period?esc(periodLabel(x.period)):'—'}</td><td>${esc(x.responsible||'—')}</td><td>${esc(x.collection)} · ${esc(x.recordId)}</td><td><details><summary>Ver</summary><pre class="audit-pre">${esc(JSON.stringify({antes:x.before,despues:x.after},null,2))}</pre></details></td></tr>`).join(''))}`;
}

function renderTrash(content){
 const data=Store.trash().sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));
 content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">PAPELERA SEGURA</span><h2>Elementos eliminados</h2><p>Los registros permanecen 30 días. Podés seleccionar varios para restaurarlos o eliminarlos definitivamente. La eliminación definitiva también queda auditada.</p></div></div>
 <div class="trash-toolbar"><div><b>${data.length}</b><span> elementos en papelera</span></div><div><button class="secondary-button" id="trashRestoreSelected" ${data.length?'':'disabled'}>↶ Restaurar seleccionados</button><button class="danger-button" id="trashPurgeSelected" ${data.length?'':'disabled'}>Eliminar definitivamente</button><button class="danger-link" id="trashEmpty" ${data.length?'':'disabled'}>Vaciar papelera</button></div></div>
 ${table(['<input type="checkbox" id="trashSelectAll">','Sector','Registro','Eliminado','Responsable','Vence','Acciones'],data.map(x=>{const expires=new Date(new Date(x.deletedAt).getTime()+30*86400000);return `<tr><td><input type="checkbox" class="trash-select" data-collection="${esc(x._collection)}" data-id="${esc(x.id)}"></td><td>${esc(x._collection)}</td><td><b>${esc(x.name||x.concept||x.title||x.provider||x.id)}</b></td><td>${dateTimeLabel(x.deletedAt)}</td><td>${esc(x.responsible||'—')}</td><td>${dateTimeLabel(expires.toISOString())}</td><td><button class="secondary-button" data-restore="${esc(x._collection)}" data-id="${esc(x.id)}">Restaurar</button><button class="danger-link" data-purge="${esc(x._collection)}" data-id="${esc(x.id)}">Eliminar</button></td></tr>`}).join(''))}`;
}

function renderImport(content){content.innerHTML=`<div class="page-intro"><div><span class="section-kicker">EXCEL / RESPALDOS</span><h2>Excel / Backup</h2><p>El Excel se analiza completo, hoja por hoja y de arriba hacia abajo. El sistema identifica el sector, conserva los datos y muestra cualquier fila que necesite revisión antes de guardar.</p></div></div><div class="import-grid"><section class="panel"><span class="section-kicker">IMPORTACIÓN COMPLETA</span><h3>Analizar todo el Excel</h3><p>Subí un Excel y BLUNNO revisará todas sus hojas y filas. Las filas válidas se agrupan automáticamente por sector; las ambiguas o incompletas quedan señaladas para no perder ni inventar información.</p><input id="excelInput" type="file" accept=".xlsx,.xls,.csv" class="file-input"><button class="primary-button" id="analyzeWorkbookButton" type="button">Analizar todo el Excel</button><div id="importPreview"></div></section><section class="panel"><span class="section-kicker">RESPALDOS</span><h3>Seguridad</h3><p>Generá una copia completa o restaurá un respaldo después de confirmarlo. Los documentos guardados localmente también forman parte del paquete.</p><div class="backup-actions"><button class="secondary-button" id="backupZipButton">Descargar backup completo ZIP</button><button class="secondary-button" id="backupButton">Descargar datos JSON</button><button class="secondary-button" id="exportExcelButton">Exportar Excel Blunno</button><label class="secondary-button file-button-label">Restaurar datos JSON<input id="backupRestoreInput" type="file" accept=".json,application/json" hidden></label></div></section></div><section class="panel"><span class="section-kicker">CONTROL DE EXPORTACIÓN</span><h3>Archivos ordenados</h3><p>La exportación genera hojas separadas, columnas dimensionadas, encabezados congelados, filtros y formatos numéricos para evitar renglones o columnas cruzadas.</p><div class="page-actions"><button class="secondary-button" data-pdf-close="excel">Generar PDF</button><button class="secondary-button" data-print-view="excel">Imprimir</button></div></section>`} 
function renderPeriodModal(){return Store.db.periods.slice().sort((a,b)=>String(b.id).localeCompare(String(a.id)));}
function renderView(view,content,period,branch="General",compareA=prevPeriod(period),compareB=period){
 const map={dashboard:renderDashboard,cash:renderCash,providers:renderProviders,invoices:renderInvoices,expenses:renderExpenses,investments:renderInvestments,people:renderPeople,hours:renderHours,results:renderResults,compare:renderCompare,tasks:renderTasks,close:renderClose,files:renderFiles,history:renderHistory,trash:renderTrash,import:renderImport};
 if(view==="compare") return renderCompare(content,period,branch,compareA,compareB);
 (map[view]||renderDashboard)(content,period,branch);
}

__BLUNNO_MODULES.views = { esc, formSchema, renderDashboard, renderCash, renderProviders, renderInvoices, renderExpenses, renderInvestments, renderPeople, renderHours, renderResults, renderCompare, renderTasks, renderClose, renderFiles, renderHistory, renderTrash, renderImport, renderPeriodModal, renderView, auditForContext };
})();

// ===== MAIN WEB =====
(() => {

const { CONFIG, periodLabel, nextPeriod, prevPeriod, dateLabel, dateTimeLabel, today, now, daysInPeriod, isoDate, money, number } = __BLUNNO_MODULES.config;
const { Store, CONTROL_START_PERIOD, periodIsFuture, periodIsStarted, periodStateLabel, isValidPeriod, assertResponsible, periodEditConfirmed, setPeriodEditConfirmed, sourceIdentity } = __BLUNNO_MODULES.store;
const { firebaseEnabled, uploadFile } = __BLUNNO_MODULES.firebase;
const { formSchema, renderView, esc, auditForContext } = __BLUNNO_MODULES.views;
const { createSimplePDF } = __BLUNNO_MODULES.pdf;

const $ = s => document.querySelector(s);
const canonicalExpenseCategory = value => { const key=sourceIdentity(value); return CONFIG.expenseCategories.find(c=>sourceIdentity(c)===key)||""; };
const content = $("#content");
let view = "dashboard";
let period = CONFIG.defaultPeriod;
let branch = "General";
let editing = null;
let currentOperator = "";
let compareA = prevPeriod(CONFIG.defaultPeriod);
let compareB = CONFIG.defaultPeriod;
const viewHistory = [];
const viewForward = [];
let pdfDownloadBlob = null;
let pdfDownloadName = "documento-blunno.pdf";
let pendingRecordEdit=null;

function slugPath(value){return String(value||'general').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'general';}
function storagePathFor(periodValue,branchValue,sectorValue,fileName){const [y,m]=String(periodValue||today()).split('-');return `blunno/${y}/${m}/${slugPath(branchValue)}/${slugPath(sectorValue)}/${fileName}`;}

const titles = {
 dashboard:"Panel general", cash:"Caja diaria", providers:"Proveedores", invoices:"Facturas", expenses:"Gastos por categoría", investments:"Gastos de inversión",
 people:"Personal", hours:"Horas mensuales", results:"Resultados", compare:"Comparativas", tasks:"Recordatorios", close:"Cierre mensual", files:"Archivos", history:"Historial", trash:"Papelera", import:"Excel / Backup"
};

const toast = (message, ok=true) => {
  const el=$("#toast"); el.textContent=message; el.className=`toast show ${ok?'ok':'bad'}`;
  clearTimeout(window.__blunnoToast); window.__blunnoToast=setTimeout(()=>el.className='toast',3800);
};

const periodContextKey = branchName => `blunno-current-period-${String(branchName||'General')}`;

function setOperator(name) {
  if (name && !CONFIG.responsiblePeople.includes(name)) { toast('Responsable inválido.',false); return; }
  currentOperator = name || "";
  window.__blunnoResponsible = currentOperator;
  localStorage.removeItem("blunno-operator");
  const label=$("#operatorLabel"); if(label) label.textContent=currentOperator || "Elegir responsable"; const selector=$("#operatorSelector"); if(selector) selector.value=currentOperator;
}

function setBranch(name) {
  const nextBranch = CONFIG.profiles.includes(name) ? name : "General";
  if(nextBranch===branch){ refresh(); return; }
  // Each profile keeps its own last selected period. Switching profile never
  // overwrites the period context of another profile.
  try { localStorage.setItem(periodContextKey(branch), period); } catch {}
  branch = nextBranch;
  window.__blunnoBranch = branch;
  const saved = localStorage.getItem(periodContextKey(branch));
  if(saved && isValidPeriod(saved)) period = saved;
  else { try { localStorage.setItem(periodContextKey(branch), period); } catch {} }
  refresh();
}

function navigate(nextView){ if(nextView===view){refresh();return;} viewHistory.push(view); viewForward.length=0; view=nextView; refresh(); }
function goBack(){ const previous=viewHistory.pop(); if(previous){ viewForward.push(view); view=previous; refresh(); } else { view="dashboard"; refresh(); } }
function goForward(){ const next=viewForward.pop(); if(next){ viewHistory.push(view); view=next; refresh(); } }

function connection() {
  $("#connectionDot").className=firebaseEnabled?'connected':'local';
  $("#connectionText").textContent=firebaseEnabled?'Firebase + nube':'Modo local';
  $("#userText").textContent=firebaseEnabled?'Autenticación habilitada':'Configurar Firebase para nube y archivos permanentes';
}

function refresh(){
  window.__blunnoBranch = branch;
  $("#pageTitle").textContent=titles[view]||"Blunno";
  document.title = `BLUNNO · ${titles[view]||"Control Empresarial"}`;
  const ctx=$("#webContextLabel"); if(ctx) ctx.textContent=`${branch} · ${periodLabel(period)}`;
  const conn=$("#webConnectionLabel"); if(conn) conn.textContent=firebaseEnabled?"Firebase conectado":"Modo local";
  renderView(view,content,period,branch,compareA,compareB);
  wire();
  const flash=localStorage.getItem('blunno-close-review-flash');
  if(flash===view){const target=content.querySelector('.panel');if(target){target.classList.add('flash-success-panel');setTimeout(()=>target.classList.remove('flash-success-panel'),2800)}toast('Se ha guardado con éxito este cambio.');localStorage.removeItem('blunno-close-review-flash');}
  $("#periodSelector").textContent=periodLabel(period);
  $("#periodState").textContent=periodStateLabel(period,branch);
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
  const branchScoped=['employee','invoice','cash','expense','investment','income','hours'];
  if(branch==='General' && branchScoped.includes(type)){ toast('General es solo una vista consolidada. Elegí una sucursal concreta para modificar este sector.',false); return; }
  const map={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',expense:'expenses',investment:'investments',task:'tasks',income:'incomes'};
  const col=map[type]||type; editing=id?Store.get(col,id):null;
  if(editing?.period && editing?.branch && Store.periodIsClosed(editing.period,editing.branch) && !periodEditConfirmed(editing.period,editing.branch)){
    pendingRecordEdit={type,id};
    openPeriodActionConfirm('edit',editing.period);
    return;
  }
  const schema=formSchema[type]; if(!schema) return;
  $("#modalKicker").textContent=editing?'EDICIÓN CONTROLADA':'NUEVO REGISTRO';
  $("#modalTitle").textContent=editing?'Editar registro':'Nuevo registro';
  $("#formFields").innerHTML=schema.map(x=>fieldHtml(x,editing)).join('');
  if(type==='invoice'){const pf=$("#formFields [name=provider]");if(pf){const wrap=document.createElement('div');wrap.className='provider-picker form-provider-picker';pf.parentNode.replaceWith(wrap);wrap.innerHTML=`<div class="provider-picker-line"><input name="provider" type="text" autocomplete="off" placeholder="Escribí o elegí un proveedor"><button type="button" class="provider-picker-toggle">⌄</button></div><div class="provider-suggestions"></div><small class="provider-selection-status"></small>`;}}
  for(const [n] of schema){const el=$("#formFields [name=\""+n+"\"]"); if(!el) continue; if(editing?.[n]!==undefined){if(el.type==='checkbox')el.checked=!!editing[n];else if(el.type==='date')el.value=String(editing[n]||'').slice(0,10);else el.value=editing[n];}}
  const d=$("#formFields [name=date]"); if(d&&!editing)d.value=today();
  if(type==='invoice'){const pf=$("#formFields [name=provider]");if(pf&&editing)pf.value=editing.provider||'';wireProviderPicker(pf);updateProviderSelectionStatus(pf);}
  const branchField=$("#formFields [name=branch]"); if(branchField&&!editing&&branch!=="General")branchField.value=branch;
  const op=$("#recordResponsible"); op.value=currentOperator; op.disabled=!!currentOperator; op.title=currentOperator?'Se mantiene el responsable seleccionado para esta sesión.':'';
  $("#recordForm").dataset.type=type;
  $("#modal").classList.remove('hidden');
  $("#formFields input,#formFields select,#formFields textarea")[0]?.focus();
  wireProviderDatalist();
}
function closeModal(){$("#modal").classList.add('hidden');editing=null;}

async function saveRecord(e){
  e.preventDefault();
  const form=e.target;
  if(form.dataset.saving==='1')return;
  form.dataset.saving='1';
  const submit=form.querySelector('button[type="submit"]'); if(submit){submit.disabled=true;submit.dataset.originalText=submit.textContent;submit.textContent='Guardando…';}
  const type=form.dataset.type;
  const responsible=currentOperator || $("#recordResponsible").value;
  try{
    if(!CONFIG.responsiblePeople.includes(responsible)) throw new Error('Elegí Agus, Nico, Luz o Flor como responsable.');
    const raw=Object.fromEntries(new FormData(form).entries());
    const data={...raw};
    for(const k of ['amount','expected','hourlyRate','hours','advance','merchandise']) if(k in data) data[k]=Number(data[k]||0);
    if(type==='hours'){
      const emp=Store.list('employees').find(x=>x.name.toLowerCase()===String(data.employee||'').toLowerCase());
      if(!emp) throw new Error('No se encontró el empleado. Usá el nombre exacto de la ficha de Personal.');
      data.employeeId=emp.id; data.employee=emp.name; data.branch=emp.branch; data.period=(data.date||today()).slice(0,7);
      data.salaryCost=Number(data.hours||0)*Number(emp.hourlyRate||0);
    }
    if('lateMovement' in data) data.lateMovement=$("#formFields [name=lateMovement]")?.checked===true;
    if(type==='invoice'){
      const master=ensureProviderExists(data.provider);
      data.provider=master.name;
      data.period=(data.operationDate||today()).slice(0,7);
      data.loadDate=editing?.loadDate || now();
      data.status='CARGADA';
      delete data.paidAmount; delete data.dueDate;
    }
    if(['cash','expense','investment','income'].includes(type)) data.period=(data.date||today()).slice(0,7);
    if(type==='cash') data.branch=data.branch==='General'?branch:data.branch;
    if(type==='income') data.branch=data.branch==='General'?branch:data.branch;
    if(['expense','investment','income','cash','invoice','employee'].includes(type) && !data.branch) throw new Error('Seleccioná una sucursal concreta.');
    if(['expense','investment','income','cash','invoice'].includes(type) && data.branch==='General') throw new Error('General es solo una vista consolidada.');
    if(type==='task') data.status=editing?.status||'pending';
    if(type==='employee') data.active=data.active!=='false';
    const scopedCollection={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',hours:'hours',expense:'expenses',investment:'investments',income:'incomes',task:'tasks'}[type];
    const shouldBeLate = ['invoices','incomes','expenses','investments','cash','hours'].includes(scopedCollection) && data.period && data.branch && Store.periodIsClosed(data.period,data.branch);
    if (shouldBeLate && !data.lateMovement && !periodEditConfirmed(data.period,data.branch)) {
      const action = editing ? 'modificar' : 'agregar';
      if(!currentOperator){toast('Elegí un responsable antes de modificar un período cerrado.',false);return;}
      const ok = confirm(`El período ${periodLabel(data.period)} está cerrado para ${String(data.branch).toUpperCase()}.\n\nResponsable actual: ${currentOperator}.\n\n¿Estás seguro de que querés ${action} algo en este mes? El cambio quedará auditado y, si existe un cierre real, generará una nueva versión.`);
      if (!ok) return;
      setPeriodEditConfirmed(data.period,data.branch,true); data.lateMovement = true;
    } else data.lateMovement=!!data.lateMovement || shouldBeLate;
    const collection={provider:'providers',employee:'employees',invoice:'invoices',cash:'cash',hours:'hours',expense:'expenses',investment:'investments',income:'incomes',task:'tasks'}[type];
    if(!collection) throw new Error('Tipo de registro inválido.');
    if(editing) await Store.update(collection,editing.id,data,responsible,'Edición controlada desde formulario',{lateMovement:data.lateMovement});
    else await Store.add(collection,data,responsible,'Alta controlada desde formulario',{lateMovement:data.lateMovement});
    if(data.lateMovement && data.period && data.branch){
      const latest=Store.db.closures.filter(x=>x.period===data.period&&x.branch===data.branch&&x.status==='closed').sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
      if(latest) await generateClosurePDF(latest);
    }
    closeModal();
    window.__blunnoDataRevision=(window.__blunnoDataRevision||0)+1;
    window.dispatchEvent(new CustomEvent('blunno:data-changed',{detail:{collection,period:data.period,branch:data.branch}}));
    toast(data.lateMovement?'Movimiento tardío guardado; el cierre quedó versionado.':(editing?'Cambios guardados y auditados.':'Guardado con éxito.'));
    refresh();
  }catch(err){ toast(err.message||'No se pudo guardar el registro.',false); }
  finally{ form.dataset.saving='0'; if(submit){submit.disabled=false;submit.textContent=submit.dataset.originalText||'Guardar y auditar';} }
}
function updateProviderSelectionStatus(input){if(!input)return;const status=input.closest('.provider-picker')?.querySelector('.provider-selection-status');const query=sourceIdentity(input.value.trim());const master=Store.list('providers').find(x=>x.active!==false&&sourceIdentity(x.name)===query);if(status){status.textContent=master?'✓ Proveedor seleccionado':'Es obligatorio seleccionar un proveedor existente';status.className=`provider-selection-status ${master?'valid':'invalid'}`;}}
function wireProviderPicker(input){
 if(!input)return;
 const wrap=input.closest('.provider-picker'); if(!wrap)return;
 const box=wrap.querySelector('.provider-suggestions');
 const toggle=wrap.querySelector('.provider-picker-toggle');
 const list=()=>Store.list('providers').filter(x=>x.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const hide=()=>{box?.classList.add('hidden');toggle?.setAttribute('aria-expanded','false');};
 const draw=(q='')=>{
   const query=sourceIdentity(q);
   const items=list().filter(x=>!query||sourceIdentity(x.name).includes(query));
   if(!box)return;
   box.innerHTML=items.map(x=>`<button type="button" data-provider-choice="${esc(x.name)}"><span>${esc(x.name)}</span><b>✓</b></button>`).join('')||'<div class="provider-empty">No existe ese proveedor. Crealo primero desde Proveedores.</div>';
   box.classList.remove('hidden');
   toggle?.setAttribute('aria-expanded','true');
 };
 const choose=button=>{
   if(!button)return;
   input.value=button.dataset.providerChoice||'';
   updateProviderSelectionStatus(input);
   hide();
   input.focus();
   input.dispatchEvent(new Event('change',{bubbles:true}));
 };
 const toggleList=()=>{const isOpen=!box?.classList.contains('hidden');if(isOpen)hide();else{draw(input.value);input.focus();}};
 input.addEventListener('input',()=>{draw(input.value);updateProviderSelectionStatus(input)});
 input.addEventListener('focus',()=>draw(input.value));
 toggle?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});
 toggle?.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();});
 toggle?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleList();});
 wrap.addEventListener('pointerdown',e=>{
   const b=e.target.closest('[data-provider-choice]');
   if(b){e.preventDefault();e.stopPropagation();choose(b);}
 });
 wrap.addEventListener('click',e=>{
   const b=e.target.closest('[data-provider-choice]');
   if(b){e.preventDefault();e.stopPropagation();choose(b);}
 });
 hide();
 updateProviderSelectionStatus(input);
}
function wireProviderDatalist(){
  const inputs=[...document.querySelectorAll('input[name=provider],input[name=name]')];
  inputs.forEach(i=>{ if(i.name!=='provider' && !$("#recordForm")?.dataset.type?.includes('invoice')) return; i.setAttribute('list','providerList'); });
  let dl=$("#providerList"); if(!dl){dl=document.createElement('datalist');dl.id='providerList';document.body.appendChild(dl)}
  dl.innerHTML=Store.list('providers').filter(x=>x.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'es')).map(x=>`<option value="${esc(x.name)}"></option>`).join('');
}

function changeCashWeek(dir){
  if(dir!=='next'&&dir!=='prev')return false;
  const key=`blunno-cash-week-${period}-${branch}`;
  const max=Math.max(1,Math.ceil(daysInPeriod(period)/7));
  let current=Number(localStorage.getItem(key)||0);
  if(!Number.isFinite(current))current=0;
  current=Math.min(Math.max(Math.trunc(current),0),max-1);
  const next=current+(dir==='next'?1:-1);
  if(next<0||next>max-1){ toast(dir==='next'?'Ya estás en la última semana disponible.':'Ya estás en la primera semana disponible.'); return false; }
  localStorage.setItem(key,String(next));
  setTimeout(()=>refresh(),0);
  return true;
}
function changeHoursWeek(dir){
  if(dir!=='next'&&dir!=='prev')return false;
  const key=`blunno-hours-week-${period}-${branch}`;
  const max=Math.max(1,Math.ceil(daysInPeriod(period)/7));
  let current=Number(localStorage.getItem(key)||1);
  if(!Number.isFinite(current))current=1;
  current=Math.min(Math.max(Math.trunc(current),1),max);
  const next=current+(dir==='next'?1:-1);
  if(next<1||next>max){ toast(dir==='next'?'Ya estás en la última semana disponible.':'Ya estás en la primera semana disponible.'); return false; }
  localStorage.setItem(key,String(next));
  setTimeout(()=>refresh(),0);
  return true;
}

function wire(){
  document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>openModal(b.dataset.new));
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(b.dataset.edit,b.dataset.id));
  document.querySelectorAll('[data-expense-edit]').forEach(b=>b.onclick=()=>openModal('expense',b.dataset.expenseEdit));
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.delete,b.dataset.id));
  document.querySelectorAll('[data-bulk-select-all]').forEach(b=>b.onchange=()=>document.querySelectorAll(`[data-bulk-select="${b.dataset.bulkSelectAll}"]`).forEach(x=>x.checked=b.checked));
  document.querySelectorAll('[data-bulk-delete]').forEach(b=>b.onclick=()=>bulkDelete(b.dataset.bulkDelete));
  document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>restoreRecord(b.dataset.restore,b.dataset.id));
  document.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>{const next=b.dataset.profile;if(next===branch)return;if(confirm(`Estás cambiando el contexto de trabajo a ${String(next).toUpperCase()}.\nLos datos no se modificarán. Solamente cambiará la información que estás visualizando.\n\n¿Querés cambiar el contexto?`))setBranch(next);});
  document.querySelectorAll('[data-compare-select]').forEach(s=>s.onchange=()=>{if(s.dataset.compareSelect==='a')compareA=s.value;else compareB=s.value;refresh()});
  document.querySelectorAll('[data-view-jump]').forEach(b=>b.onclick=()=>{if(b.dataset.hoursEmployee)localStorage.setItem('blunno-hours-employee',b.dataset.hoursEmployee);navigate(b.dataset.viewJump)});
  document.querySelectorAll('[data-complete-task]').forEach(b=>b.onclick=()=>completeTask(b.dataset.completeTask));
  document.querySelectorAll('[data-liquidate]').forEach(b=>b.onclick=()=>openLiquidation(b.dataset.liquidate));
  document.querySelectorAll('[data-salary-view]').forEach(b=>b.onclick=()=>showSalaryVoucher(b.dataset.salaryView));
  document.querySelectorAll('[data-salary-edit]').forEach(b=>b.onclick=()=>openLiquidationById(b.dataset.salaryEdit));
  document.querySelectorAll('[data-salary-pdf]').forEach(b=>b.onclick=()=>generateSalaryVoucherPDF(b.dataset.salaryPdf));
  document.querySelectorAll('[data-salary-delete]').forEach(b=>b.onclick=()=>deleteSalaryVoucher(b.dataset.salaryDelete));
  document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>showDetail(b.dataset.detail,b.dataset.id));
  document.querySelectorAll('[data-invoice-pdf]').forEach(b=>b.onclick=()=>generateInvoicePDF(b.dataset.invoicePdf));
  document.querySelectorAll('[data-provider-history]').forEach(b=>b.onclick=()=>showProviderHistory(b.dataset.providerHistory));
  document.querySelectorAll('[data-provider-branch-toggle]').forEach(b=>b.onclick=async()=>{try{const available=b.dataset.providerAvailable==='1';await Store.setProviderBranchAvailability(b.dataset.providerBranchToggle,b.dataset.providerBranch,!available,currentOperator);toast(available?`Proveedor ocultado de ${b.dataset.providerBranch}.`:`Proveedor agregado a ${b.dataset.providerBranch}.`);refresh()}catch(e){toast(e.message,false)}});
  document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>{$('.sheet-wrap')?.scrollBy({left:b.dataset.scroll==='right'?500:-500,behavior:'smooth'})});
  document.querySelectorAll('[data-investment-edit]').forEach(b=>b.onclick=()=>openModal('investment',b.dataset.investmentEdit));
  document.querySelectorAll('[data-print-investments]').forEach(b=>b.onclick=async()=>{const blob=await generateAndShowViewPDF('investments');if(blob){const file=Store.db.files.find(f=>!f.deleted&&f.name===pdfDownloadName&&f.period===period&&f.branch===branch);await auditPdfAction(file,'PDF_PRINTED','Historial de inversiones impreso');printBlob(blob);toast('Historial de inversiones enviado a impresión.');}});
  document.querySelectorAll('[data-print-view]').forEach(b=>b.onclick=async()=>{const blob=await generateAndShowViewPDF(b.dataset.printView);if(blob){const file=Store.db.files.find(f=>!f.deleted&&f.name===pdfDownloadName&&f.period===period&&f.branch===branch);await auditPdfAction(file,'PDF_PRINTED',`Sector ${b.dataset.printView} impreso`);printBlob(blob);toast('Documento enviado a impresión.');}});
  $('#expenseCategoryFilter')?.addEventListener('change',e=>{localStorage.setItem(`blunno-expense-category-${period}-${branch}`,e.target.value);refresh()});
  document.querySelectorAll('[data-expense-category]').forEach(b=>b.onclick=()=>{localStorage.setItem(`blunno-expense-category-${period}-${branch}`,b.dataset.expenseCategory);refresh()});
  document.querySelectorAll('[data-expense-category-pdf]').forEach(b=>b.onclick=()=>generateExpenseCategoryPDF(b.dataset.expenseCategory));
  document.querySelectorAll('[data-expense-selected-category-pdf]').forEach(b=>b.onclick=()=>generateExpenseCategoryPDF($('#expenseCategoryFilter')?.value||localStorage.getItem(`blunno-expense-category-${period}-${branch}`)||'ALL'));
 
  document.querySelectorAll('[data-hour-field]').forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.dataset.advance='1';input.blur()}});input.addEventListener('blur',()=>saveHourCell(input));});
  document.querySelectorAll('[data-cash-cell] input').forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur()}});input.addEventListener('blur',()=>saveCashCell(input));});
  document.querySelectorAll('[data-cash-add-row]').forEach(b=>b.onclick=()=>addCashConcept(b.dataset.cashAddRow));
  document.querySelectorAll('[data-hours-adjust]').forEach(b=>b.onclick=()=>editEmployeeAdjustment(b.dataset.employeeAdjust,b.dataset.hoursAdjust));
  $('#hoursEmployeeFilter')?.addEventListener('change',e=>{localStorage.setItem('blunno-hours-employee',e.target.value);refresh()});
  document.querySelectorAll('[data-cash-week]').forEach(b=>b.onclick=()=>{
    if(b.dataset.switching==='1' || window.__blunnoCashWeekSwitching)return;
    const dir=b.dataset.cashWeek; if(dir!=='next'&&dir!=='prev')return;
    window.__blunnoCashWeekSwitching=true; b.dataset.switching='1';
    try { changeCashWeek(dir); } finally {
      setTimeout(()=>{window.__blunnoCashWeekSwitching=false; b.dataset.switching='0';},120);
    }
  });
  document.querySelectorAll('[data-hours-week]').forEach(b=>b.onclick=()=>{
    if(b.dataset.switching==='1' || window.__blunnoHoursWeekSwitching)return;
    const dir=b.dataset.hoursWeek; if(dir!=='next'&&dir!=='prev')return;
    window.__blunnoHoursWeekSwitching=true; b.dataset.switching='1';
    try { changeHoursWeek(dir); } finally {
      setTimeout(()=>{window.__blunnoHoursWeekSwitching=false; b.dataset.switching='0';},120);
    }
  });
  $('#trashRestoreSelected')?.addEventListener('click',restoreSelectedTrash);
  $('#trashPurgeSelected')?.addEventListener('click',purgeSelectedTrash);
  $('#trashEmpty')?.addEventListener('click',purgeAllTrash);
  $('#trashSelectAll')?.addEventListener('change',e=>document.querySelectorAll('.trash-select').forEach(x=>x.checked=e.target.checked));
  document.querySelectorAll('[data-purge]').forEach(b=>b.onclick=()=>purgeOneTrash(b.dataset.purge,b.dataset.id));
  $('#backBtn')?.addEventListener('click',goBack); $('#forwardBtn')?.addEventListener('click',goForward);
  $('#closePdfSuccess')?.addEventListener('click',closePdfSuccess);
  document.querySelectorAll('[data-close-pdf-success]').forEach(b=>b.onclick=closePdfSuccess);
  $('#pdfSuccessDownload')?.addEventListener('click',downloadCurrentPdf);
  $('#pdfSuccessPrint')?.addEventListener('click',printCurrentPdf);
  document.querySelectorAll('[data-pdf-close]').forEach(b=>b.onclick=()=>generateAndShowViewPDF(b.dataset.pdfClose));
  document.querySelectorAll('[data-view-file]').forEach(b=>b.onclick=()=>viewStoredFile(b.dataset.viewFile));
  document.querySelectorAll('[data-download-file]').forEach(b=>b.onclick=()=>downloadStoredFile(b.dataset.downloadFile));
  document.querySelectorAll('[data-print-file]').forEach(b=>b.onclick=()=>printStoredFile(b.dataset.printFile));
  document.querySelectorAll('[data-dashboard-detail]').forEach(b=>b.onclick=()=>showDashboardDetail(b.dataset.dashboardDetail));
  document.querySelectorAll('[data-invoice-quick-save]').forEach(b=>b.onclick=quickInvoiceSave);
  const quickProvider=$('#quickInvoiceProvider');if(quickProvider)wireProviderPicker(quickProvider);
  $('#cashOpeningButton')?.addEventListener('click',editCashOpening);
  document.querySelectorAll('[data-hours-focus]').forEach(b=>b.onclick=()=>document.querySelector('[data-hour-field="hours"]')?.focus());
  document.querySelectorAll('[data-open-holidays]').forEach(b=>b.onclick=openHolidayCalendar);
 
  document.querySelectorAll('[data-close-period]').forEach(b=>b.onclick=openCloseConfirm);
  document.querySelectorAll('[data-close-review]').forEach(b=>b.onclick=()=>{const target=b.dataset.closeReview;navigate(target);localStorage.setItem('blunno-close-review-flash',target);setTimeout(()=>localStorage.removeItem('blunno-close-review-flash'),3200);});
  document.querySelectorAll('[data-close-version]').forEach(b=>b.onclick=()=>{const c=Store.getRaw('closures',b.dataset.closeVersion);if(c)generateClosurePDF(c)});
  document.querySelectorAll('[data-close-version-print]').forEach(b=>b.onclick=()=>printClosureVersion(b.dataset.closeVersionPrint));
  document.querySelectorAll('[data-close-version-download]').forEach(b=>b.onclick=()=>downloadClosureVersion(b.dataset.closeVersionDownload));
  document.querySelectorAll('[data-reopen-period]').forEach(b=>b.onclick=openReopenConfirm);
  document.querySelectorAll('[data-period-edit]').forEach(b=>b.onclick=()=>openPeriodActionConfirm('edit',b.dataset.periodEdit));
  $("#exportAudit")?.addEventListener('click',()=>download(`auditoria-blunno-${period}-${String(branch).replace(/\s+/g,'-').toLowerCase()}.json`,JSON.stringify(auditForContext(period,branch),null,2),'application/json'));
  $("#backupButton")?.addEventListener('click',()=>Store.exportJson());
  $("#backupZipButton")?.addEventListener('click',createBackupZip);
  $("#backupRestoreInput")?.addEventListener('change',e=>restoreBackupFile(e.target.files?.[0]));
  $("#exportExcelButton")?.addEventListener('click',exportExcel);
  $("#excelInput")?.addEventListener('change',handleExcel);
  $('#analyzeWorkbookButton')?.addEventListener('click',()=>window.__blunnoWorkbook&&analyzeWorkbook(window.__blunnoWorkbook,document.querySelector('#excelInput')?.files?.[0]?.name||'Excel'));
 
}

async function deleteRecord(collection,id){
  if(branch==='General' && ['invoices','cash','expenses','investments','employees','hours','incomes'].includes(collection)){toast('General es solo una vista consolidada. Elegí una sucursal concreta.',false);return}
  if(!currentOperator){toast('Elegí el responsable antes de eliminar.',false);return}
  const row=Store.get(collection,id); if(!row){toast('El registro ya no está disponible.',false);return}
  if(!confirm(`¿Borrar este registro de ${sectorForCollection(collection)} y enviarlo a la papelera?`)) return;
  try{await Store.remove(collection,id,currentOperator,'Baja lógica confirmada');$('#detailModal')?.classList.add('hidden');toast('El registro fue eliminado y quedó en la papelera.');refresh()}catch(e){toast(e.message||'No se pudo eliminar el registro.',false)}
}
async function restoreRecord(collection,id){if(branch==='General' && ['invoices','cash','expenses','investments','employees','hours','incomes'].includes(collection)){toast('General es solo una vista consolidada. Elegí una sucursal concreta.',false);return}if(!currentOperator){toast('Elegí el responsable antes de restaurar.',false);return}try{await Store.restore(collection,id,currentOperator);toast('Restaurado con éxito.');refresh()}catch(e){toast(e.message,false)}}
async function bulkDelete(collection){
  if(branch==='General' && ['invoices','cash','expenses','investments','employees','hours','incomes'].includes(collection)){toast('General es solo una vista consolidada. Elegí una sucursal concreta.',false);return}
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

async function completeTask(id){try{const task=Store.get('tasks',id);if(!task)throw new Error('No se encontró el recordatorio.');await Store.completeTask(id,currentOperator);if(task.repeat&&task.repeat!=='none'){const d=new Date(`${task.dueDate}T12:00:00`);if(task.repeat==='daily')d.setDate(d.getDate()+1);if(task.repeat==='weekly')d.setDate(d.getDate()+7);if(task.repeat==='monthly')d.setMonth(d.getMonth()+1);await Store.addTask({title:task.title,description:task.description,dueDate:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,dueTime:task.dueTime||'',priority:task.priority||'normal',responsible:task.responsible,repeat:task.repeat,notes:task.notes||'',status:'pending'},currentOperator);}toast('Recordatorio marcado como realizado.');refresh()}catch(e){toast(e.message,false)}}

function openHolidayCalendar(){
 if(branch==='General'){toast('Elegí una sucursal concreta para configurar feriados.',false);return}
 const days=daysInPeriod(period),selected=new Map();Store.list('hours',period,branch).filter(x=>x.holiday==='yes').forEach(x=>selected.set(x.date,Number(x.hours||0)||8));
 const overlay=document.createElement('div');overlay.className='modal holiday-calendar-modal';overlay.innerHTML=`<div class="modal-card holiday-card"><div class="modal-header"><div><small>CONFIGURACIÓN DE FERIADOS</small><h2>Feriados · ${periodLabel(period)}</h2></div><button class="close-button" data-holiday-close>×</button></div><div class="holiday-intro">¿Hubo feriados? <b>${selected.size?'Sí':'No'}</b>. Seleccioná los días trabajados y cargá las horas.</div><div class="holiday-calendar-grid">${Array.from({length:days},(_,i)=>{const d=i+1,date=isoDate(period,d);return `<button type="button" class="holiday-day ${selected.has(date)?'selected':''}" data-holiday-day="${date}"><span>${d}</span><small>${new Date(`${date}T12:00:00`).toLocaleDateString('es-AR',{weekday:'short'}).replace('.','')}</small></button>`}).join('')}</div><div id="holidayHoursEditor" class="holiday-hours-editor"></div><div class="modal-footer"><button class="secondary-button" data-holiday-no>No</button><button class="primary-button" data-holiday-save>Guardar feriados</button></div></div>`;document.body.appendChild(overlay);const editor=overlay.querySelector('#holidayHoursEditor');
 const renderEditor=()=>{editor.innerHTML=[...selected.entries()].map(([date,h])=>`<label class="field"><span>${dateLabel(date)} · horas trabajadas</span><input type="number" min="0" max="24" step="0.5" data-holiday-hours="${date}" value="${h||8}"></label>`).join('')||'<div class="empty-block">No hay días seleccionados.</div>';};
 overlay.querySelectorAll('[data-holiday-day]').forEach(btn=>btn.onclick=()=>{const d=btn.dataset.holidayDay;if(selected.has(d)){selected.delete(d);btn.classList.remove('selected')}else{selected.set(d,8);btn.classList.add('selected')}renderEditor()});renderEditor();
 overlay.querySelector('[data-holiday-no]').onclick=async()=>{selected.clear();await saveHolidayCalendar(selected,overlay)};
 overlay.querySelector('[data-holiday-save]').onclick=async()=>{for(const input of overlay.querySelectorAll('[data-holiday-hours]')){const h=Number(input.value||0);if(!Number.isFinite(h)||h<0||h>24){toast('Las horas de un feriado deben estar entre 0 y 24.',false);return}selected.set(input.dataset.holidayHours,h)}await saveHolidayCalendar(selected,overlay)};
 overlay.querySelector('[data-holiday-close]').onclick=()=>overlay.remove();
}
async function saveHolidayCalendar(selected,overlay){try{if(!currentOperator)throw new Error('Elegí responsable antes de configurar feriados.');const employees=Store.list('employees').filter(e=>e.active!==false&&e.branch===branch);const current=Store.list('hours',period,branch);for(const employee of employees){for(let d=1;d<=daysInPeriod(period);d++){const date=isoDate(period,d),existing=current.find(x=>x.employeeId===employee.id&&x.date===date);if(selected.has(date)){const h=Number(selected.get(date)||0),data={period,date,branch,employeeId:employee.id,employee:employee.name,hours:h,displayValue:`${h}H`,holiday:'yes',status:'',advance:existing?.advance||0,merchandise:existing?.merchandise||0,overtimeHours:Number(existing?.overtimeHours||0),salaryCost:h*Number(employee.hourlyRate||0),notes:existing?.notes||''};if(existing)await Store.update('hours',existing.id,data,currentOperator,'Configuración de feriado');else await Store.add('hours',data,currentOperator,'Configuración de feriado');}else if(existing?.holiday==='yes'){await Store.update('hours',existing.id,{holiday:'no',displayValue:existing.hours||'',salaryCost:Number(existing.hours||0)*Number(employee.hourlyRate||0)},currentOperator,'Quitar feriado');}}}overlay.remove();toast('Se ha guardado con éxito este cambio.');refresh();}catch(e){toast(e.message,false)}}
async function saveHourCell(input){
 if(!currentOperator){toast('Elegí responsable antes de cargar horas.',false);input.blur();return}
 if(branch==='General'){toast('La planilla de horas es editable solo por sucursal.',false);input.blur();return}
 const td=input.closest('td'); const date=input.dataset.hourDate||td?.dataset.hourDate, employeeId=input.dataset.employee||td?.dataset.employee, field=input.dataset.hourField||'hours'; if(!date||!employeeId)return;
 const employee=Store.get('employees',employeeId); if(!employee)return;
 const existing=Store.list('hours',period,branch).find(x=>x.employeeId===employeeId&&x.date===date);
 const value=input.value.trim();
 try{
   if(field==='overtime'){
     const hoursExtra=value===''?0:Number(value.replace(',','.'));
     if(!Number.isFinite(hoursExtra)||hoursExtra<0||hoursExtra>24)throw new Error('Ingresá horas extras entre 0 y 24.');
     if(!existing && hoursExtra===0)return;
     const data={period,date,branch:employee.branch,employeeId,employee:employee.name,hours:existing?.hours||0,displayValue:existing?.displayValue||'',status:existing?.status||'',advance:existing?.advance||0,merchandise:existing?.merchandise||0,holiday:existing?.holiday||'no',overtimeHours:hoursExtra,salaryCost:Number(existing?.hours||0)*Number(employee.hourlyRate||0),notes:existing?.notes||''};
     if(existing) await Store.update('hours',existing.id,data,currentOperator,'Edición de horas extras'); else await Store.add('hours',data,currentOperator,'Carga de horas extras');
   } else {
     if(!value){
       if(existing && !Number(existing.overtimeHours||0) && !Number(existing.advance||0) && !Number(existing.merchandise||0)) await Store.remove('hours',existing.id,currentOperator,'Borrado de celda de horas');
       else if(existing) await Store.update('hours',existing.id,{hours:0,displayValue:'',status:'',holiday:'no',salaryCost:0},currentOperator,'Limpieza de celda de horas');
     } else {
       const normalized=value.replace(',','.').trim();
       const holidayWithHours=normalized.match(/^(\d+(?:\.\d+)?)\s*h$/i);
       const holidayKey=/^h$/i.test(normalized) || /^feriado$/i.test(normalized);
       const isFranco=/^(f|franco)$/i.test(normalized);
       let hours,displayValue,holiday='no',status='';
       if(isFranco){hours=0;displayValue='F';status='franco';}
       else if(holidayWithHours){hours=Number(holidayWithHours[1]);displayValue=`${hours}H`;holiday='yes';}
       else if(holidayKey){hours=0;displayValue='H';holiday='yes';}
       else {hours=Number(normalized);displayValue=String(hours);}
       if(!Number.isFinite(hours)||hours<0||hours>24)throw new Error('Ingresá horas entre 0 y 24, F = franco, H = feriado.');
       const data={period,date,branch:employee.branch,employeeId,employee:employee.name,hours,displayValue,status,advance:existing?.advance||0,merchandise:existing?.merchandise||0,holiday,overtimeHours:Number(existing?.overtimeHours||0),salaryCost:hours*Number(employee.hourlyRate||0),notes:existing?.notes||''};
       if(existing) await Store.update('hours',existing.id,data,currentOperator,'Edición directa de planilla'); else await Store.add('hours',data,currentOperator,'Carga directa de planilla');
     }
   }
   toast('Celda guardada y auditada.');
   if(input.dataset.advance==='1'){delete input.dataset.advance;const next=input.closest('td')?.nextElementSibling?.querySelector('input[data-hour-field="hours"]');if(next){next.focus();next.select();}else refresh();} else refresh();
 }catch(e){toast(e.message,false)}
}
async function saveCashCell(input){
 if(/saldo\s+d[ií]a\s+anterior/i.test(String(input.closest('td')?.dataset.concept||''))){toast('Saldo día anterior se calcula automáticamente con el resto del día previo.');return}
 if(!currentOperator){toast('Elegí responsable antes de cargar caja.',false);return}
 if(branch==='General'){toast('General es solo una vista consolidada. Elegí una sucursal concreta para editar Caja.',false);return}
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
 if(branch==='General'){toast('General es solo una vista consolidada. Elegí una sucursal concreta.',false);return}
 const labels={income:'Nombre del concepto de ingreso:',expense:'Nombre del concepto de gasto de caja:',payment:'Nombre del concepto de pago:'};
 const concept=prompt(labels[type]||'Nombre del concepto:'); if(!concept?.trim())return; if(type==='income'&&/^saldo\s+d[ií]a\s+anterior$/i.test(concept.trim())){toast('Saldo día anterior es automático y no se puede crear manualmente.',false);return;}
 const date=today(); const data={period,date,branch,type,concept:concept.trim(),amount:0,expected:0,notes:''};
 Store.add('cash',data,currentOperator,'Alta de concepto para planilla de caja').then(()=>{toast('Concepto agregado a la planilla.');refresh()}).catch(e=>toast(e.message,false));
}
async function editEmployeeAdjustment(employeeId,field){
 if(branch==='General'){toast('Los adelantos y la mercadería se editan por sucursal.',false);return}
 if(!currentOperator){toast('Elegí responsable.',false);return}
 const employee=Store.get('employees',employeeId);if(!employee)return;
 const type=field==='advance'?'advance':'merchandise'; const label=type==='advance'?'adelantos / vales':'mercadería';
 const existing=Store.list('employeeDebts',period,branch).find(x=>x.employeeId===employeeId&&x.type===type);
 const current=Number(existing?.amount||0); const raw=prompt(`Monto mensual de ${label} para ${employee.name}:`,String(current)); if(raw===null)return;
 const amount=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<0){toast('Ingresá un monto válido.',false);return}
 try{const data={date:today(),period,branch:employee.branch,employeeId,employee:employee.name,type,amount};if(existing)await Store.update('employeeDebts',existing.id,data,currentOperator,`Edición de ${label}`);else await Store.add('employeeDebts',data,currentOperator,`Carga de ${label}`);toast(`${label} actualizado y auditado.`);refresh()}catch(e){toast(e.message,false)}
}

function openLiquidation(employeeId,liquidationId=null){
 if(branch==='General'){toast('Las liquidaciones se realizan dentro de una sucursal concreta.',false);return}
 const e=Store.get('employees',employeeId); if(!e)return;
 const existingLiq=liquidationId?Store.get('liquidations',liquidationId):null;
 if(existingLiq && existingLiq.employeeId!==employeeId) existingLiq=null;
 const rows=Store.list('hours',period,branch).filter(x=>x.employeeId===employeeId);
 const debts=Store.list('employeeDebts',period,branch).filter(x=>x.employeeId===employeeId);
 const prev=Store.list('employeeDebts',prevPeriod(period),branch).find(x=>x.employeeId===employeeId&&x.type==='negativeBalance');
 const hours=rows.reduce((s,x)=>s+Number(x.hours||0),0);
 const holidays=rows.filter(x=>x.holiday==='yes').reduce((s,x)=>s+Number(x.hours||0),0);
 const overtime=rows.reduce((s,x)=>s+Number(x.overtimeHours||0),0);
 const advance=rows.reduce((s,x)=>s+Number(x.advance||0),0)+debts.filter(x=>x.type==='advance').reduce((s,x)=>s+Number(x.amount||0),0);
 const merchandise=rows.reduce((s,x)=>s+Number(x.merchandise||0),0)+debts.filter(x=>x.type==='merchandise').reduce((s,x)=>s+Number(x.amount||0),0);
 const previousDebt=Number(existingLiq?.previousNegativeBalance ?? prev?.amount ?? 0);
 const initialNormal=Number(existingLiq?.normalHours ?? hours),initialHoliday=Number(existingLiq?.holidayHours ?? holidays),initialOvertime=Number(existingLiq?.overtimeHours ?? overtime),initialAdvance=Number(existingLiq?.advance ?? advance),initialMerch=Number(existingLiq?.merchandise ?? merchandise),initialTotal=Number(existingLiq?.totalHours ?? (initialNormal+initialHoliday+initialOvertime)),initialRate=Number(existingLiq?.hourlyRate ?? e.hourlyRate ?? 0),initialHolidayRate=Number(existingLiq?.holidayRate ?? Number(e.hourlyRate||0)*2);
 $("#liquidationBody").innerHTML=`<div class="liquidation-grid"><div><span>Empleado</span><b>${esc(e.name)}</b></div></div><div class="liquidation-edit-grid"><label class="field">Horas normales<input id="liqNormalHours" type="number" min="0" step="0.5" value="${initialNormal}"></label><label class="field">Horas de feriado<input id="liqHolidayHours" type="number" min="0" step="0.5" value="${initialHoliday}"></label><label class="field">Horas extras<input id="liqOvertimeHours" type="number" min="0" step="0.5" value="${initialOvertime}"></label><label class="field">Total horas contabilizadas<input id="liqTotalHours" type="number" min="0" step="0.5" value="${initialTotal}"></label><label class="field">Adelantos<input id="liqAdvance" type="number" min="0" step="0.01" value="${initialAdvance}"></label><label class="field">Mercadería<input id="liqMerch" type="number" min="0" step="0.01" value="${initialMerch}"></label></div><div class="liquidation-grid"><div><span>Saldo negativo anterior</span><b>${money(previousDebt)}</b></div></div><label class="field">Valor hora<input id="liqRate" type="number" min="0" step="0.01" value="${initialRate}"></label><label class="field">Valor hora feriado<input id="liqHolidayRate" type="number" min="0" step="0.01" value="${initialHolidayRate}"></label><div id="liqTotal" class="liq-total"></div><div class="modal-footer"><button class="secondary-button" data-close-liquidation>Cancelar</button><button class="primary-button" id="saveLiquidation">Totalizar sueldo y guardar PDF</button></div>`;
 const calc=()=>{const r=Number($('#liqRate').value||0),hr=Number($('#liqHolidayRate').value||0),nhRaw=$('#liqNormalHours').value,hhRaw=$('#liqHolidayHours').value,ohRaw=$('#liqOvertimeHours').value,advRaw=$('#liqAdvance').value,merRaw=$('#liqMerch').value,totalRaw=$('#liqTotalHours').value,nh=Number(nhRaw===''?hours:nhRaw),hh=Number(hhRaw===''?holidays:hhRaw),oh=Number(ohRaw===''?overtime:ohRaw),adv=Number(advRaw===''?advance:advRaw),mer=Number(merRaw===''?merchandise:merRaw),totalH=Number(totalRaw===''?hours+holidays+overtime:totalRaw),gross=nh*r+hh*hr+oh*r,net=gross-adv-mer-previousDebt;$('#liqTotal').innerHTML=`<b>Horas normales: ${number(nh)}</b><b>Horas feriado: ${number(hh)}</b><b>Horas extras: ${number(oh)}</b><b>Total contabilizado: ${number(totalH)}</b><b>Sueldo bruto: ${money(gross)}</b><b>Descuentos: ${money(adv+mer)}</b><b>Saldo negativo anterior: ${money(previousDebt)}</b><b>${net>=0?'A cobrar':'SALDO NEGATIVO'}: ${money(Math.abs(net))}</b>`;return{r,hr,nh,hh,oh,adv,mer,totalH,gross,net}};
 $('#liqRate').oninput=calc; $('#liqHolidayRate').oninput=calc; calc();
 $('#saveLiquidation').onclick=async()=>{const btn=$('#saveLiquidation');if(btn.dataset.saving==='1')return;btn.dataset.saving='1';btn.disabled=true;try{if(!currentOperator)throw new Error('Elegí responsable antes de totalizar el sueldo.');const c=calc();const late=Store.periodIsClosed(period,branch);const patch={date:today(),period,branch,employeeId,employee:e.name,normalHours:c.nh,holidayHours:c.hh,overtimeHours:c.oh,totalHours:c.totalH,hourlyRate:c.r,holidayRate:c.hr,advance:c.adv,merchandise:c.mer,previousNegativeBalance:previousDebt,gross:c.gross,net:c.net,responsible:currentOperator,status:'GENERADO',paymentStatus:'NO PAGADO',updatedAt:now()};let liq;if(existingLiq)liq=await Store.update('liquidations',existingLiq.id,patch,currentOperator,'Modificación de comprobante de sueldo',{lateMovement:late});else liq=await Store.add('liquidations',patch,currentOperator,'Totalización de sueldo',{lateMovement:late});const nextPeriodId=nextPeriod(period);const oldDebt=existingLiq?Store.list('employeeDebts',nextPeriodId,branch).find(x=>x.employeeId===employeeId&&x.type==='negativeBalance'&&x.originLiquidationId===existingLiq.id):null;if(oldDebt)await Store.remove('employeeDebts',oldDebt.id,currentOperator,'Actualización de comprobante de sueldo',{lateMovement:Store.periodIsClosed(nextPeriodId,branch)});if(c.net<0){const debtData={date:today(),period:nextPeriodId,branch:e.branch,employeeId,employee:e.name,type:'negativeBalance',amount:Math.abs(c.net),originPeriod:period,originLiquidationId:liq.id};const nextDebt=Store.list('employeeDebts',nextPeriodId,branch).find(x=>x.employeeId===employeeId&&x.type==='negativeBalance'&&x.originLiquidationId===liq.id);if(nextDebt)await Store.update('employeeDebts',nextDebt.id,debtData,currentOperator,'Actualización de saldo negativo arrastrado',{lateMovement:Store.periodIsClosed(nextPeriodId,branch),allowFutureDerived:true});else await Store.add('employeeDebts',debtData,currentOperator,'Arrastre de saldo negativo al siguiente período',{lateMovement:Store.periodIsClosed(nextPeriodId,branch),allowFutureDerived:true});}const blob=createSimplePDF('Comprobante de sueldo',`${e.name} · ${periodLabel(period)} · ${branch}`,[['Empleado',e.name],['Período',periodLabel(period)],['Estado','GENERADO · NO IMPLICA PAGO'],['Horas normales',number(c.nh)],['Horas feriado',number(c.hh)],['Horas extras',number(c.oh)],['Total horas contabilizadas',number(c.totalH)],['Valor hora',money(c.r)],['Valor hora feriado',money(c.hr)],['Adelantos',money(c.adv)],['Mercadería',money(c.mer)],['Saldo negativo anterior',money(previousDebt)],['Sueldo bruto',money(c.gross)],['Resultado de liquidación',money(c.net)],['Responsable',currentOperator]],'Comprobante interno de sueldo. Este documento registra la liquidación y no acredita que el sueldo haya sido pagado.');const name=`BLUNNO_Comprobante_Sueldo_${e.name.replace(/[^a-z0-9]+/gi,'_')}_${period}_${Date.now()}.pdf`;await Store.archiveFile({name,sector:'Liquidaciones',period,branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),sourceCollection:'liquidations',sourceId:liq.id,storagePath:storagePathFor(period,branch,'Liquidaciones',name),blob});await Store.update('liquidations',liq.id,{pdfName:name,pdfCreatedAt:now(),paymentStatus:'NO PAGADO'},currentOperator,'Registro de comprobante PDF',{lateMovement:late});$('#liquidationModal').classList.add('hidden');showPdfSuccess(existingLiq?'Comprobante de sueldo actualizado':'Comprobante de sueldo generado',`El comprobante de ${e.name} quedó registrado como documento interno.`,`<b>${esc(name)}</b><span>Estado: GENERADO · NO IMPLICA PAGO · Responsable: ${esc(currentOperator)}</span>`,blob,name);refresh();}catch(err){toast(err.message,false)}finally{btn.dataset.saving='0';btn.disabled=false}};
 document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden')); $('#liquidationModal').classList.remove('hidden');
}
function showSalaryVoucher(id){const x=Store.get('liquidations',id);if(!x)return;$('#detailTitle').textContent='Comprobante de sueldo';$('#detailBody').innerHTML=`<div class="detail-grid"><div><span>Empleado</span><b>${esc(x.employee)}</b></div><div><span>Período</span><b>${periodLabel(x.period)}</b></div><div><span>Estado</span><b>GENERADO · NO IMPLICA PAGO</b></div><div><span>Horas normales</span><b>${number(x.normalHours||0)}</b></div><div><span>Horas feriado</span><b>${number(x.holidayHours||0)}</b></div><div><span>Horas extras</span><b>${number(x.overtimeHours||0)}</b></div><div><span>Total horas</span><b>${number(x.totalHours||0)}</b></div><div><span>Sueldo bruto</span><b>${money(x.gross||0)}</b></div><div><span>Adelantos</span><b>${money(x.advance||0)}</b></div><div><span>Mercadería</span><b>${money(x.merchandise||0)}</b></div><div><span>Resultado</span><b>${money(x.net||0)}</b></div><div><span>Responsable</span><b>${esc(x.responsible||'—')}</b></div></div><div class="notice success">Este comprobante registra la liquidación. <b>No significa que el sueldo haya sido pagado.</b></div><div class="modal-footer"><button class="secondary-button" data-close-detail>Cerrar</button><button class="secondary-button" data-salary-edit="${x.id}">Modificar</button><button class="primary-button" data-salary-pdf="${x.id}">PDF</button><button class="danger-link" data-salary-delete="${x.id}">Eliminar</button></div>`;$('#detailModal').classList.remove('hidden');$('#detailBody').querySelector('[data-close-detail]').onclick=()=>$('#detailModal').classList.add('hidden');$('#detailBody').querySelector('[data-salary-edit]').onclick=()=>{$('#detailModal').classList.add('hidden');openLiquidationById(x.id)};$('#detailBody').querySelector('[data-salary-pdf]').onclick=()=>generateSalaryVoucherPDF(x.id);$('#detailBody').querySelector('[data-salary-delete]').onclick=()=>deleteSalaryVoucher(x.id);}
function openLiquidationById(id){const x=Store.get('liquidations',id);if(x)openLiquidation(x.employeeId,id);}
async function deleteSalaryVoucher(id){const x=Store.get('liquidations',id);if(!x)return;if(!currentOperator){toast('Elegí responsable antes de eliminar el comprobante.',false);return}if(!confirm(`¿Eliminar el comprobante de sueldo de ${x.employee} correspondiente a ${periodLabel(x.period)}?\n\nSe enviará a Papelera, quedará auditado y no registrará un pago.`))return;try{const late=Store.periodIsClosed(x.period,x.branch);await Store.remove('liquidations',id,currentOperator,'Eliminación de comprobante de sueldo',{lateMovement:late});const debts=Store.list('employeeDebts',nextPeriod(x.period),x.branch).filter(d=>d.employeeId===x.employeeId&&d.type==='negativeBalance'&&d.originLiquidationId===id);for(const d of debts)await Store.remove('employeeDebts',d.id,currentOperator,'Eliminación del comprobante que originó saldo negativo',{lateMovement:Store.periodIsClosed(d.period,d.branch),allowFutureDerived:true});$('#detailModal').classList.add('hidden');toast('Comprobante eliminado y enviado a Papelera.');refresh()}catch(e){toast(e.message,false)}}
async function generateSalaryVoucherPDF(id){const x=Store.get('liquidations',id);if(!x)return;const blob=createSimplePDF('Comprobante de sueldo',`${x.employee} · ${periodLabel(x.period)} · ${x.branch}`,[['Empleado',x.employee],['Período',periodLabel(x.period)],['Estado','GENERADO · NO IMPLICA PAGO'],['Horas normales',number(x.normalHours||0)],['Horas feriado',number(x.holidayHours||0)],['Horas extras',number(x.overtimeHours||0)],['Total horas',number(x.totalHours||0)],['Valor hora',money(x.hourlyRate||0)],['Valor hora feriado',money(x.holidayRate||0)],['Adelantos',money(x.advance||0)],['Mercadería',money(x.merchandise||0)],['Saldo negativo anterior',money(x.previousNegativeBalance||0)],['Sueldo bruto',money(x.gross||0)],['Resultado',money(x.net||0)],['Responsable',x.responsible||'—']], 'Comprobante interno de sueldo. No acredita que el sueldo haya sido pagado.');if(!blob)return;const name=`BLUNNO_Comprobante_Sueldo_${x.employee.replace(/[^a-z0-9]+/gi,'_')}_${x.period}_${Date.now()}.pdf`;await Store.archiveFile({name,sector:'Liquidaciones',period:x.period,branch:x.branch,responsible:currentOperator||x.responsible,mime:'application/pdf',createdAt:now(),sourceCollection:'liquidations',sourceId:x.id,storagePath:storagePathFor(x.period,x.branch,'Liquidaciones',name),blob});showPdfSuccess('Comprobante de sueldo listo',`Documento interno de ${x.employee}.`,`<b>${esc(name)}</b><span>Estado: GENERADO · NO IMPLICA PAGO</span>`,blob,name);}
function showProviderHistory(provider){
  const all = Store.list('invoices', period, branch);
  const inv = all.filter(x=>x.provider===provider).sort((a,b)=>String(b.operationDate||'').localeCompare(String(a.operationDate||'')));
  const total = inv.reduce((sum,x)=>sum+Number(x.amount||0),0);
  $('#detailTitle').textContent='Historial · '+provider;
  let body='<div class="panel"><div class="mini-kpis">'+money(total)+' · '+inv.length+' facturas</div>';
  if(inv.length){body+='<div class="table-wrap"><table><thead><tr><th>Factura</th><th>Fecha movimiento</th><th>Fecha carga</th><th>Sucursal</th><th>Importe</th><th>Estado</th><th>PDF</th></tr></thead><tbody>';inv.forEach(function(x){body+='<tr><td>'+esc(x.number||'—')+'</td><td>'+dateLabel(x.operationDate||x.date)+'</td><td>'+dateTimeLabel(x.loadDate||x.createdAt)+'</td><td>'+esc(x.branch||'—')+'</td><td>'+money(x.amount)+'</td><td><span class="status-pill success">CARGADA</span></td><td><button class="secondary-button compact-button" data-invoice-pdf="'+esc(x.id)+'">PDF</button></td></tr>';});body+='</tbody></table></div>';} else body+='<div class="empty-block">No hay facturas de este proveedor en el período/perfil seleccionado.</div>';
  body+='<div class="modal-footer"><button class="primary-button" id="providerHistoryPdf">Generar historial PDF</button></div></div>';
  $('#detailBody').innerHTML=body; $('#detailModal').classList.remove('hidden'); $('#providerHistoryPdf').onclick=()=>generateProviderHistoryPDF(provider,inv);
}
async function generateProviderHistoryPDF(provider,inv){
 if(!currentOperator){toast('Elegí responsable antes de generar el PDF.',false);return}
 const rows=[['Proveedor',provider],['Período',periodLabel(period)],['Perfil',branch],['Cantidad de facturas',inv.length],['Total',money(inv.reduce((s,x)=>s+Number(x.amount||0),0))],...inv.map((x,i)=>[`Factura ${i+1}`,`${x.number||'—'} · ${dateLabel(x.operationDate||x.date)} · ${money(x.amount)} · ${x.branch} · CARGADA`])];
 const blob=createSimplePDF('HISTORIAL DE PROVEEDOR',`${provider} · ${periodLabel(period)} · ${branch}`,rows,'Cada factura es un movimiento independiente.'); if(!blob)return;
 const name=`BLUNNO_Historial_${provider.replace(/[^a-z0-9]+/gi,'_')}_${period}.pdf`;
 await Store.archiveFile({name,sector:'Historial de proveedor',period,branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),sourceCollection:'invoices',storagePath:storagePathFor(period,branch,'Historial de proveedor',name),blob});
 showPdfSuccess('Historial listo',`Se generó el historial completo de ${provider}.`,`<b>${esc(name)}</b><span>Responsable: ${esc(currentOperator)} · ${esc(dateTimeLabel(now()))}</span>`,blob,name);
}
async function generateInvoicePDF(id){
 if(!currentOperator){toast('Elegí responsable antes de generar el PDF.',false);return}
 const inv=Store.get('invoices',id); if(!inv){toast('La factura ya no está disponible.',false);return}
 const blob=createSimplePDF('FACTURA CARGADA',`${inv.provider} · ${periodLabel(inv.period||period)} · ${inv.branch}`,[["Proveedor",inv.provider],["Número de factura",inv.number||'—'],["Fecha de movimiento",dateLabel(inv.operationDate||inv.date)],["Fecha de carga",dateTimeLabel(inv.loadDate||inv.createdAt)],["Sucursal",inv.branch],["Importe",money(inv.amount)],["Estado","CARGADA"],["Responsable",inv.responsible||currentOperator],["Observaciones",inv.notes||'—']], 'Documento de control interno de la factura cargada.');
 const safeProvider=inv.provider.replace(/[^a-z0-9]+/gi,'_'); const safeNumber=(inv.number||'sin_numero').replace(/[^a-z0-9]+/gi,'_'); const name=`BLUNNO_Factura_${safeProvider}_${safeNumber}_${inv.period||period}.pdf`; const storagePath=storagePathFor(inv.period||period,inv.branch,'Facturas',name); let url=null;try{url=await uploadFile(storagePath,blob,'application/pdf')}catch(e){console.warn('Storage factura',e)}
 await Store.archiveFile({name,sector:'Facturas',period:inv.period||period,branch:inv.branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),sourceCollection:'invoices',sourceId:inv.id,url,storagePath,blob});
 showPdfSuccess('Factura PDF lista','La ficha documental de la factura fue generada y archivada.',`<b>${esc(name)}</b><span>Estado: CARGADA · Generado: ${esc(dateTimeLabel(now()))}</span>`,blob,name);
}
function showDashboardDetail(kind){
 const s=Store.summary(period,branch); let title='',items=[];
 const withRows=(collection,list,labelFn,editType=collection)=>list.map(x=>({label:labelFn(x),collection,id:x.id,editType}));
 if(kind==='income'){title='Detalle de ingresos';items=withRows('cash',Store.list('cash',period,branch).filter(x=>x.type==='income'&&!/^saldo\s+d[ií]a\s+anterior$/i.test(String(x.concept||''))),x=>`${dateLabel(x.date)} · ${x.concept||'Sin concepto'} · ${money(x.amount)}`)}
 if(kind==='expenses'){title='Detalle de gastos del local';items=withRows('expenses',Store.list('expenses',period,branch),x=>`${dateLabel(x.date)} · ${x.category} · ${x.concept||'Sin concepto'} · ${money(x.amount)}`)}
 if(kind==='providers'){title='Detalle de proveedores';items=withRows('invoices',Store.list('invoices',period,branch),x=>`${dateLabel(x.operationDate||x.date)} · ${x.provider} · Factura ${x.number||'—'} · ${money(x.amount)}`)}
 if(kind==='investments'){title='Detalle de inversiones';items=withRows('investments',Store.list('investments',period,branch),x=>`${dateLabel(x.date)} · ${x.concept||'Sin concepto'} · ${money(x.amount)}`)}
 if(kind==='salary'){title='Detalle de personal';items=withRows('liquidations',Store.list('liquidations',period,branch),x=>`${x.employee} · ${money(x.gross||0)} · ${number(x.normalHours||0)} h normales · ${number(x.holidayHours||0)} h feriado`,'liquidation');if(!items.length)items=withRows('hours',Store.list('hours',period,branch),x=>`${x.employee} · ${dateLabel(x.date)} · ${number(x.hours||0)} h`,'hours')}
 if(kind==='result'){title='Cómo se calcula el resultado';items=[{label:`Ingresos · ${money(s.income)}`},{label:`− Gastos del local · ${money(s.localExpense)}`},{label:`− Proveedores · ${money(s.providers)}`},{label:`− Inversiones · ${money(s.investment)}`},{label:`− Personal · ${money(s.salary)}`},{label:`Resultado · ${money(s.result)}`},{label:'Caja diaria · NO está incluida'}];}
 const canManage=(kind==='salary'||kind==='investments') && branch!=='General';
 $('#detailTitle').textContent=title;
 $('#detailBody').innerHTML=`<div class="detail-summary-list">${items.length?items.map(x=>{const manage=canManage&&x.id;return `<div><span>${esc(x.label)}</span>${x.id?`<div class="row-actions"><button class="secondary-button compact-button" data-detail-open="${esc(x.collection)}" data-id="${esc(x.id)}">Abrir</button>${manage?`<button class="secondary-button compact-button" data-dashboard-edit="${esc(x.editType)}" data-id="${esc(x.id)}">Modificar</button><button class="danger-link" data-dashboard-delete="${esc(x.collection)}" data-id="${esc(x.id)}">Borrar</button>`:''}</div>`:'<b>—</b>'}</div>`}).join(''):'<div class="empty-block">No hay movimientos para este indicador.</div>'}</div>`;
 $('#detailModal').classList.remove('hidden');
 document.querySelectorAll('[data-detail-open]').forEach(b=>b.onclick=()=>showDetail(b.dataset.detailOpen,b.dataset.id));
 document.querySelectorAll('[data-dashboard-edit]').forEach(b=>b.onclick=()=>{const type=b.dataset.dashboardEdit;$('#detailModal').classList.add('hidden');if(type==='liquidation')openLiquidationById(b.dataset.id);else openModal(type,b.dataset.id);});
 document.querySelectorAll('[data-dashboard-delete]').forEach(b=>b.onclick=()=>{const collection=b.dataset.dashboardDelete; if(collection==='liquidations')deleteSalaryVoucher(b.dataset.id); else deleteRecord(collection,b.dataset.id);});
}
function showDetail(collection,id){
 const x=Store.get(collection,id); if(!x)return;
 $('#detailTitle').textContent=collection==='invoices'?'Detalle de factura':collection==='investments'?'Detalle de inversión':collection==='liquidations'?'Detalle de liquidación':'Detalle';
 const fields=Object.entries(x).filter(([k])=>!['id','deleted'].includes(k)).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(typeof v==='object'?JSON.stringify(v):v)}</b></div>`).join('');
 const isManageable=collection==='investments'||collection==='liquidations'||collection==='invoices';
 const actions=isManageable?`<div class="modal-footer"><button class="secondary-button" data-close-detail>× Cerrar</button><button class="secondary-button" data-detail-edit="${esc(collection)}" data-id="${esc(x.id)}">Modificar</button><button class="danger-link" data-detail-delete="${esc(collection)}" data-id="${esc(x.id)}">Borrar</button>${collection==='invoices'?`<button class="primary-button" data-invoice-pdf="${esc(x.id)}">Generar PDF</button>`:''}${collection==='liquidations'?`<button class="primary-button" data-salary-pdf="${esc(x.id)}">PDF</button>`:''}</div>`:`<div class="modal-footer"><button class="secondary-button" data-close-detail>× Cerrar</button></div>`;
 $('#detailBody').innerHTML=`<div class="detail-grid">${fields}</div>${actions}`; $('#detailModal').classList.remove('hidden');
 document.querySelectorAll('[data-close-detail]').forEach(b=>b.onclick=()=>$('#detailModal').classList.add('hidden'));
 document.querySelectorAll('[data-invoice-pdf]').forEach(b=>b.onclick=()=>generateInvoicePDF(b.dataset.invoicePdf));
 document.querySelectorAll('[data-detail-edit]').forEach(b=>b.onclick=()=>{const collection=b.dataset.detailEdit;$('#detailModal').classList.add('hidden');if(collection==='liquidations')openLiquidationById(b.dataset.id);else openModal(collection,b.dataset.id);});
 document.querySelectorAll('[data-detail-delete]').forEach(b=>b.onclick=()=>{const collection=b.dataset.detailDelete;$('#detailModal').classList.add('hidden');if(collection==='liquidations')deleteSalaryVoucher(b.dataset.id);else deleteRecord(collection,b.dataset.id);});
 document.querySelectorAll('[data-salary-pdf]').forEach(b=>b.onclick=()=>generateSalaryVoucherPDF(b.dataset.salaryPdf));
}
async function openPeriodModal(){
 const currentYear=Number(today().slice(0,4))||2026; const years=Array.from({length:Math.max(5,currentYear-2026+5)},(_,i)=>2026+i),months=Array.from({length:12},(_,i)=>i+1),names=months.map(m=>new Date(2024,m-1,1).toLocaleDateString('es-AR',{month:'long'}));
 const rows=years.flatMap(y=>months.map(m=>{
   const id=`${y}-${String(m).padStart(2,'0')}`,closed=Store.periodIsClosed(id,branch),future=periodIsFuture(id),started=periodIsStarted(id,branch),selected=id===period,stateLabel=periodStateLabel(id,branch);
   const statusClass=closed?'muted':(future&&!started?'warning':'success');
   const pencil=closed&&branch!=='General'?`<button type="button" class="period-edit-button" data-period-edit="${id}" title="Modificar mes cerrado" aria-label="Modificar mes cerrado">✏️</button>`:'';
   if(closed) return `<div class="period-row-wrap"><button type="button" class="period-row period-month-row period-row-locked ${selected?'selected-period':''}" data-select-period="${id}"><span><b>${names[m-1]} ${y}</b><small>Solo lectura · usá ✏️ para modificar</small></span><span class="status-pill ${statusClass}">${stateLabel}${selected?' · ACTIVO':''}</span></button>${pencil}</div>`;
   return `<button type="button" class="period-row period-month-row ${selected?'selected-period':''}" data-select-period="${id}"><span><b>${names[m-1]} ${y}</b>${future&&!started?'<small>Se inicia desde este selector</small>':''}</span><span class="status-pill ${statusClass}">${stateLabel}${selected?' · ACTIVO':''}</span></button>`;
 }));
 $('#periodBody').innerHTML=`<div class="period-create"><label class="field">Ir a período<input id="periodInput" type="month" value="${period}" min="2026-01" max="2099-12"></label><button class="primary-button" id="goPeriod">Abrir / seleccionar período</button></div><div class="notice success"><b>Regla de períodos:</b> meses anteriores a octubre de 2026 = CERRADOS y se modifican únicamente con el lápiz ✏️ y autorización; octubre de 2026 en adelante = ABIERTO o DISPONIBLE PARA INICIAR según corresponda.</div><div class="period-year-grid">${years.map(y=>`<section><h4>${y}</h4><div class="period-month-grid">${rows.filter(x=>x.includes('data-select-period="'+y+'-')||x.includes('data-period-edit="'+y+'-')).join('')}</div></section>`).join('')}</div>`;
 $('#periodModal').classList.remove('hidden');
 const openValue=value=>{
   if(!isValidPeriod(value)){toast('Elegí un mes y año válidos.',false);return;}
   const closed=Store.periodIsClosed(value,branch),future=periodIsFuture(value),started=periodIsStarted(value,branch);
   if(closed){period=value;Store.setPeriod(period);try{localStorage.setItem(periodContextKey(branch),period)}catch{};$('#periodModal').classList.add('hidden');refresh();return;}
   if(future&&!started){openPeriodActionConfirm('start',value);return;}
   period=value;Store.setPeriod(period);try{localStorage.setItem(periodContextKey(branch),period)}catch{};$('#periodModal').classList.add('hidden');refresh();
 };
 $('#goPeriod').onclick=()=>openValue($('#periodInput').value);
 document.querySelectorAll('[data-select-period]').forEach(b=>b.onclick=()=>openValue(b.dataset.selectPeriod));
 document.querySelectorAll('[data-period-edit]').forEach(b=>b.onclick=()=>openPeriodActionConfirm('edit',b.dataset.periodEdit));
}


function openCloseValidationError(validation){
 const modal=$('#closeErrorModal');
 const body=$('#closeErrorBody');
 if(!modal||!body)return;
 const blockers=(validation?.checklist||[]).filter(x=>!x[1]);
 body.innerHTML=`<div class="notice danger-box"><b>No se puede cerrar ${esc(periodLabel(period))} todavía.</b><br>Hay información obligatoria pendiente. El problema está indicado abajo para que puedas corregirlo.</div>${blockers.map(([name,ok,detail,target])=>`<div class="close-error-item"><div class="close-error-icon">⚠</div><div class="close-error-copy"><b>${esc(name)}</b><span>${esc(detail)}</span></div><button type="button" class="secondary-button compact-button" data-close-error-review="${esc(target)}">Revisar</button></div>`).join('')}`;
 modal.classList.remove('hidden');
 body.querySelectorAll('[data-close-error-review]').forEach(b=>b.onclick=()=>{modal.classList.add('hidden');const target=b.dataset.closeErrorReview;navigate(target);localStorage.setItem('blunno-close-review-flash',target);});
}
function closeCloseValidationError(){$('#closeErrorModal')?.classList.add('hidden');}
async function openCloseConfirm(){if(branch==='General'){toast('General es una vista consolidada. Elegí una sucursal concreta para cerrar.',false);return}if(!currentOperator){toast('Elegí un responsable antes de cerrar el mes.',false);return}if(Store.periodIsClosed(period,branch)){toast('El período ya está cerrado.',false);return}const validation=Store.validateClosure(period,branch);if(validation.blockers.length){openCloseValidationError(validation);return;}const ss=Store.summary(period,branch);const body=$('#closeConfirmBody');body.innerHTML=`<div class="notice warning"><b>Cierre de ${esc(periodLabel(period))} · ${esc(branch)}</b><br>Responsable: <b>${esc(currentOperator)}</b></div><div class="detail-grid"><div><span>Ingresos</span><b>${money(ss.income)}</b></div><div><span>Gastos</span><b>${money(ss.totalExpenses)}</b></div><div><span>Inversiones</span><b>${money(ss.investment)}</b></div><div><span>Personal</span><b>${money(ss.salary)}</b></div><div><span>Resultado</span><b>${money(ss.result)}</b></div></div><label class="field">Observaciones<textarea id="closeObservations" rows="3"></textarea></label><div class="modal-footer"><button class="secondary-button" data-close-close-confirm>Cancelar</button><button class="primary-button" id="confirmClosePeriod">Sí, cerrar mes y generar PDF</button></div>`;$('#closeConfirmModal').classList.remove('hidden');body.querySelectorAll('[data-close-close-confirm]').forEach(b=>b.onclick=()=>$('#closeConfirmModal').classList.add('hidden'));$('#confirmClosePeriod').onclick=async()=>{const btn=$('#confirmClosePeriod');btn.disabled=true;try{const closure=await Store.closePeriod(period,nextPeriod(period),currentOperator,ss,$('#closeObservations').value,Store.validateClosure(period,branch).checklist);$('#closeConfirmModal').classList.add('hidden');await generateClosurePDF(closure);toast(`Cierre ${periodLabel(period)} guardado correctamente.`);refresh()}catch(e){toast(e.message,false)}finally{btn.disabled=false}};}
async function openReopenConfirm(){if(branch==='General'){toast('General es una vista consolidada. Elegí una sucursal concreta para reabrir.',false);return}const reason=prompt('Motivo obligatorio para reabrir el período:');if(!reason?.trim())return;try{await Store.reopenPeriod(period,branch,currentOperator,reason);toast('Período reabierto y auditado.');refresh()}catch(e){toast(e.message,false)}}

async function generateClosurePDF(closure){
 const s=closure.summary||{};
 const rows=[['Período',periodLabel(closure.period)],['Sucursal / perfil',closure.branch],['Versión',closure.version],['Responsable del cierre',closure.responsible],['Fecha y hora exactas',dateTimeLabel(closure.closedAt)],['Ingresos',money(s.income)],['Gastos de caja',money(s.cashExpense)],['Gastos del local',money(s.localExpense)],['Proveedores facturados',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Control de caja',money(s.cashControl)],['Facturas',s.invoiceCount||0],['Horas',number(s.hours||0)],['Observaciones',closure.observations||'Sin observaciones.'],['Movimientos posteriores',String((Store.db.audit||[]).filter(a=>a.period===closure.period&&a.branch===closure.branch&&String(a.at)>String(closure.closedAt)).length)]];
 const blob=createSimplePDF('CIERRE MENSUAL',`Documento oficial de cierre · ${periodLabel(closure.period)} · ${closure.branch}`,rows,'Este documento conserva la versión del cierre. Los cambios posteriores generan una nueva versión y mantienen la trazabilidad.');
 if(!blob)return null;
 const safe=`cierre-${closure.period}-${String(closure.branch).replace(/\s+/g,'-').toLowerCase()}-v${closure.version}.pdf`;
 const closurePath=storagePathFor(closure.period,closure.branch,'Cierre mensual',safe);
 let url=null; try{url=await uploadFile(closurePath,blob,'application/pdf')}catch(e){console.warn('Storage PDF',e)}
 const existing=Store.db.files.find(x=>x.name===safe&&!x.deleted&&x.sourceId===closure.id);
 if(existing){const stored=await Store.getFileBlob(existing.id);if(stored){showPdfSuccess('Cierre mensual listo',`El cierre de ${periodLabel(closure.period)} quedó registrado como versión ${closure.version}.`,`<b>${esc(safe)}</b><span>Perfil: ${esc(closure.branch)} · Responsable: ${esc(closure.responsible)} · ${esc(dateTimeLabel(closure.closedAt))}</span>`,stored,safe);return stored;}}
 if(!existing){await Store.archiveFile({name:safe,sector:'Cierre mensual',period:closure.period,branch:closure.branch,responsible:closure.responsible,mime:'application/pdf',createdAt:now(),sourceCollection:'closures',sourceId:closure.id,url,storagePath:closurePath,blob});}
 else if(existing && !(await Store.getFileBlob(existing.id))){await Store.archiveFile({name:safe,sector:'Cierre mensual',period:closure.period,branch:closure.branch,responsible:closure.responsible,mime:'application/pdf',createdAt:now(),sourceCollection:'closures',sourceId:closure.id,url,storagePath:closurePath,blob});}
 await auditPdfAction(existing||Store.db.files.find(x=>x.name===safe&&!x.deleted&&x.sourceId===closure.id),'PDF_GENERATED','Documento de cierre generado y archivado');
 showPdfSuccess('Cierre mensual listo',`El cierre de ${periodLabel(closure.period)} quedó registrado como versión ${closure.version}.`,`<b>${esc(safe)}</b><span>Perfil: ${esc(closure.branch)} · Responsable: ${esc(closure.responsible)} · ${esc(dateTimeLabel(closure.closedAt))}</span>`,blob,safe);
 return blob;
}
const downloadBlob=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
const download=(name,data,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};

function showPdfSuccess(title,description,meta,blob,name){pdfDownloadBlob=blob;pdfDownloadName=name;$('#pdfSuccessTitle').textContent=title;$('#pdfSuccessDescription').textContent=description;$('#pdfSuccessMeta').innerHTML=meta||'';$('#pdfSuccessModal').classList.remove('hidden');}
function closePdfSuccess(){$('#pdfSuccessModal').classList.add('hidden');pdfDownloadBlob=null;pdfDownloadName='';}
async function auditPdfAction(file,action,reason){try{if(!currentOperator)return;const meta={fileId:file?.id||null,fileName:file?.name||pdfDownloadName||'',sector:file?.sector||'',branch:file?.branch||branch,period:file?.period||period};await Store.recordAudit(action,'files',null,meta,currentOperator,reason||action,meta);}catch(e){console.warn('PDF audit',e)}}
async function printCurrentPdf(){if(!pdfDownloadBlob){toast('No hay un PDF generado para imprimir.',false);return}const file=Store.db.files.find(f=>!f.deleted&&f.name===pdfDownloadName&&f.period===period&&f.branch===branch);await auditPdfAction(file,'PDF_PRINTED','Documento PDF impreso');printBlob(pdfDownloadBlob);toast('PDF enviado a impresión.');}
async function downloadCurrentPdf(){if(!pdfDownloadBlob){toast('No hay un PDF generado para descargar.',false);return}const file=Store.db.files.find(f=>!f.deleted&&f.name===pdfDownloadName&&f.period===period&&f.branch===branch);await auditPdfAction(file,'PDF_DOWNLOADED','Documento PDF descargado');downloadBlob(pdfDownloadBlob,pdfDownloadName);toast('PDF descargado correctamente.');}
async function ensureClosureFile(id){const closure=Store.getRaw('closures',id);if(!closure)throw new Error('No se encontró la versión del cierre.');const safe=`cierre-${closure.period}-${String(closure.branch).replace(/\s+/g,'-').toLowerCase()}-v${closure.version}.pdf`;let file=Store.db.files.find(x=>!x.deleted&&x.sourceId===closure.id&&x.sourceCollection==='closures')||Store.db.files.find(x=>!x.deleted&&x.name===safe&&x.period===closure.period&&x.branch===closure.branch&&x.sector==='Cierre mensual');let blob=file?await Store.getFileBlob(file.id):null;if(!blob){await generateClosurePDF(closure);file=Store.db.files.find(x=>!x.deleted&&x.sourceId===closure.id&&x.sourceCollection==='closures'&&x.name===safe)||Store.db.files.find(x=>!x.deleted&&x.name===safe&&x.period===closure.period&&x.branch===closure.branch&&x.sector==='Cierre mensual');blob=file?await Store.getFileBlob(file.id):null;}if(!file||!blob)throw new Error('No se pudo recuperar el PDF archivado del cierre.');return {closure,file,blob};}
async function printClosureVersion(id){try{const r=await ensureClosureFile(id);await auditPdfAction(r.file,'PDF_PRINTED','Impresión de versión de cierre');printBlob(r.blob);toast(`Cierre V${r.closure.version} enviado a impresión.`);}catch(e){toast(`No se pudo imprimir el cierre: ${e.message}`,false)}}
async function downloadClosureVersion(id){try{const r=await ensureClosureFile(id);await auditPdfAction(r.file,'PDF_DOWNLOADED','Descarga de versión de cierre');downloadBlob(r.blob,r.file.name);toast('Cierre descargado correctamente.');}catch(e){toast(`No se pudo descargar el cierre: ${e.message}`,false)}}
const getSelectedExpenseCategory = () => {
 const selectValue=$('#expenseCategoryFilter')?.value || '';
 const storedValue=localStorage.getItem(`blunno-expense-category-${period}-${branch}`) || '';
 return canonicalExpenseCategory(selectValue) || canonicalExpenseCategory(storedValue);
};
async function generateExpenseCategoryPDF(category){
 if(!currentOperator){toast('Elegí responsable antes de generar el PDF.',false);return null;}
 const target=canonicalExpenseCategory(category) || getSelectedExpenseCategory();
 if(!target){toast('No se pudo identificar la categoría seleccionada. Elegí Luz, Alquiler u otra categoría y volvé a tocar PDF.',false);return null;}
 localStorage.setItem(`blunno-expense-category-${period}-${branch}`,target);
 const list=Store.list('expenses',period,branch).filter(x=>canonicalExpenseCategory(x.category)===target).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(!list.length){toast(`No hay gastos de ${target} para ${periodLabel(period)} en ${branch}.`,false);return null;}
 const total=list.reduce((s,x)=>s+Number(x.amount||0),0);
 const rows=[['Categoría',target],['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total',money(total)],['Detalle','Cada renglón corresponde exclusivamente al rubro seleccionado.']];
 list.forEach((x,i)=>rows.push([`Gasto ${i+1}`,`${dateLabel(x.date)} · ${x.concept||'Sin detalle'} · ${money(x.amount)} · Resp.: ${x.responsible||'—'}${x.document?` · ${x.document}`:''}`]));
 const blob=createSimplePDF(`GASTOS · ${target.toUpperCase()}`,`Rubro ${target} · ${periodLabel(period)} · ${branch}`,rows,'Documento generado por Control Empresarial Blunno. Incluye únicamente la categoría seleccionada.');
 if(!blob)return null;
 const safe=target.replace(/[^a-z0-9áéíóúüñ]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase();
 const name=`BLUNNO_Gastos_${safe}_${period}_${String(branch).replace(/\s+/g,'-').toLowerCase()}.pdf`;
 const storagePath=storagePathFor(period,branch,`Gastos · ${target}`,name);
 let url=null;try{url=await uploadFile(storagePath,blob,'application/pdf')}catch(e){console.warn('Storage gasto individual',e)}
 try{await Store.archiveFile({name,sector:`Gastos · ${target}`,period,branch,responsible:currentOperator,mime:'application/pdf',createdAt:now(),url,storagePath,blob});}catch(e){toast(`El PDF se generó, pero no pudo archivarse: ${e.message}`,false);return null;}
 showPdfSuccess('PDF de gastos listo',`Solo se incluyeron los gastos de ${target}.`,`<b>${esc(name)}</b><span>${esc(periodLabel(period))} · ${esc(branch)} · ${list.length} movimientos</span>`,blob,name);
 return blob;
}

async function generateAndShowViewPDF(type){
  if(!currentOperator){toast('Elegí el responsable en la barra superior antes de generar un PDF.',false);return}
  const s=Store.summary(period,branch); let rows=[]; let title='Documento BLUNNO'; let desc='Documento generado desde Control Empresarial Blunno.';
  const addRecords=(label,list,formatter)=>list.forEach((x,i)=>rows.push([`${label} ${i+1}`,formatter(x)]));
  if(type==='dashboard'){title='RESUMEN GENERAL BLUNNO';desc=`Resumen de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Ingresos',money(s.income)],['Gastos del local',money(s.localExpense)],['Proveedores',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Caja diaria','SEPARADA · no incluida en el resultado']];}
  else   if(type==='cash'){const list=Store.list('cash',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='CAJA DIARIA · CONTROL COMPLETO';desc=`Caja de ${periodLabel(period)} · ${branch}`;const days=daysInPeriod(period);let saldo=getCashOpening();const daily=[];for(let d=1;d<=days;d++){const date=isoDate(period,d),inc=list.filter(x=>x.date===date&&x.type==='income'&&!/^saldo\s+d[ií]a\s+anterior$/i.test(String(x.concept||''))).reduce((a,x)=>a+Number(x.amount||0),0),exp=list.filter(x=>x.date===date&&x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0),pay=list.filter(x=>x.date===date&&x.type==='payment').reduce((a,x)=>a+Number(x.amount||0),0),opening=saldo;saldo=opening+inc-exp-pay;daily.push([`Día ${d}`,`${dateLabel(date)} · Saldo anterior ${money(opening)} · Ingresos ${money(inc)} · Gastos ${money(exp)} · Pagos ${money(pay)} · RESTO ${money(saldo)}`])}rows=[['Período',periodLabel(period)],['Perfil',branch],['Saldo inicial',money(getCashOpening())],['Ingresos de caja',money(list.filter(x=>x.type==='income'&&!/^saldo\s+d[ií]a\s+anterior$/i.test(String(x.concept||''))).reduce((a,x)=>a+Number(x.amount||0),0))],['Gastos de caja',money(list.filter(x=>x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0))],['Pagos',money(list.filter(x=>x.type==='payment').reduce((a,x)=>a+Number(x.amount||0),0))],['Saldo final',money(saldo)],['CONTROL DIARIO','A continuación se detalla cada día']];rows.push(...daily);addRecords('Movimiento',list,x=>`${dateLabel(x.date)} · ${x.type==='income'?'INGRESO':'GASTO'} · ${x.concept||'Sin concepto'} · ${money(x.amount)} · ${x.responsible||'—'}`);}
  else if(type==='income'){const list=Store.list('incomes',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='INGRESOS · DETALLE COMPLETO';desc=`Ingresos independientes de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total ingresos',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Ingreso',list,x=>`${dateLabel(x.date)} · ${x.method||'Sin medio'} · ${x.concept||'Sin concepto'} · ${money(x.amount)} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='invoices'){const list=Store.list('invoices',period,branch).sort((a,b)=>String(a.operationDate||a.date).localeCompare(String(b.operationDate||b.date)));title='FACTURAS · DETALLE COMPLETO';desc=`Facturas cargadas de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Documentos',String(list.length)],['Total facturado',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Factura',list,x=>`${x.provider} · N° ${x.number||'—'} · Movimiento ${dateLabel(x.operationDate||x.date)} · Carga ${dateTimeLabel(x.loadDate||x.createdAt)} · ${money(x.amount)} · CARGADA · Resp.: ${x.responsible||'—'}`);}
  else if(type==='hours'){const list=Store.list('hours',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='HORAS MENSUALES · DETALLE COMPLETO';desc=`Planilla de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Empleados',String(new Set(list.map(x=>x.employeeId)).size)],['Horas',number(list.reduce((a,x)=>a+Number(x.hours||0),0))],['Horas feriado',number(list.filter(x=>x.holiday==='yes').reduce((a,x)=>a+Number(x.hours||0),0))]];addRecords('Carga',list,x=>`${x.employee} · ${dateLabel(x.date)} · ${x.displayValue||x.hours||0} · ${x.holiday==='yes'?'FERIADO':''} · Adelanto ${money(x.advance||0)} · Mercadería ${money(x.merchandise||0)} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='expenses'){const list=Store.list('expenses',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date)));title='GASTOS DEL LOCAL · DETALLE COMPLETO';desc=`Gastos del local de ${periodLabel(period)} · ${branch}`;const totalExp=list.reduce((a,x)=>a+Number(x.amount||0),0);rows=[['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total',money(totalExp)]];const grouped=new Map();list.forEach(x=>grouped.set(x.category,(grouped.get(x.category)||0)+Number(x.amount||0)));[...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).forEach(([cat,val])=>rows.push([`Subtotal · ${cat}`,money(val)]));addRecords('Gasto',list,x=>`${dateLabel(x.date)} · ${x.category} · ${x.concept||'—'} · ${money(x.amount)} · ${x.document||'Sin comprobante'} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='investments'){const list=Store.list('investments',period,branch).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));title='INVERSIONES · HISTORIAL COMPLETO';desc=`Historial de inversiones de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Movimientos',String(list.length)],['Total',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];addRecords('Inversión',list,x=>`${dateTimeLabel(x.createdAt||`${x.date}T12:00:00`)} · ${x.concept||'—'} · ${money(x.amount)} · ${x.document||'Sin comprobante'} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='providers'){const list=Store.list('invoices',period,branch);title='PROVEEDORES · RESUMEN';desc=`Proveedores y facturación de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Proveedores activos',String(Store.list('providers').filter(x=>x.active!==false).length)],['Facturas cargadas',String(list.length)],['Total facturado',money(list.reduce((a,x)=>a+Number(x.amount||0),0))]];[...new Set(list.map(x=>x.provider))].sort((a,b)=>a.localeCompare(b,'es')).forEach(name=>{const p=list.filter(x=>x.provider===name);rows.push([name,`${p.length} facturas · ${money(p.reduce((a,x)=>a+Number(x.amount||0),0))}`])});}
  else if(type==='people'){const list=Store.list('employees').filter(x=>branch==='General'||x.branch===branch);title='PERSONAL · DETALLE';desc=`Personal de ${branch}`;rows=[['Perfil',branch],['Empleados',String(list.length)]];addRecords('Empleado',list,x=>`${x.name} · ${x.branch} · ${x.role||'Sin puesto'} · Valor hora ${money(x.hourlyRate||0)} · ${x.active===false?'INACTIVO':'ACTIVO'}`);}
  else if(type==='results'){title='RESULTADO MENSUAL';desc=`Resultado de ${periodLabel(period)} · ${branch}`;rows=[['Ingresos',money(s.income)],['Gastos del local',money(s.localExpense)],['Proveedores',money(s.providers)],['Inversiones',money(s.investment)],['Personal',money(s.salary)],['Resultado',money(s.result)],['Caja diaria','Separada y no incluida']];}
  else if(type==='compare'){const a=Store.summary(compareA,branch),b=Store.summary(compareB,branch);const cmp=(label,av,bv,fmt=money)=>{const diff=Number(bv||0)-Number(av||0);const pct=Number(av)?(diff/Number(av))*100:null;return [label,`${fmt(av)} / ${fmt(bv)}`,`Diferencia: ${fmt(diff)} · Variación: ${pct===null?'—':pct.toFixed(2)+'%'}`]};title='COMPARATIVA DE PERÍODOS';desc=`${periodLabel(compareA)} vs ${periodLabel(compareB)} · ${branch}`;rows=[['Período A',periodLabel(compareA)],['Período B',periodLabel(compareB)],cmp('Ingresos',a.income,b.income),cmp('Gastos del local',a.localExpense,b.localExpense),cmp('Proveedores',a.providers,b.providers),cmp('Inversiones',a.investment,b.investment),cmp('Personal',a.salary,b.salary),cmp('Resultado',a.result,b.result),cmp('Horas',a.hours,b.hours,number)];}
  else if(type==='history'){const auditRows=auditForContext(period,branch);title='HISTORIAL Y AUDITORÍA';desc=`Trazabilidad de ${periodLabel(period)} · ${branch}`;rows=[['Registros',String(auditRows.length)],['Período',periodLabel(period)],['Perfil',branch]];addRecords('Registro',auditRows.slice(0,250),x=>`${dateTimeLabel(x.at)} · ${x.action} · ${x.collection} · ${x.responsible||'—'} · ${x.reason||''}`);}
  else if(type==='tasks'){const list=Store.list('tasks').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`));title='RECORDATORIOS';desc='Recordatorios y estado';rows=[['Total',String(list.length)],['Pendientes',String(list.filter(x=>x.status!=='completed').length)],['Realizados',String(list.filter(x=>x.status==='completed').length)]];addRecords('Tarea',list,x=>`${x.title} · ${dateLabel(x.dueDate)} ${x.dueTime||''} · ${x.status==='completed'?'REALIZADA':'PENDIENTE'} · Resp.: ${x.responsible||'—'}`);}
  else if(type==='excel'){title='EXCEL / BACKUP · RESUMEN ORDENADO';desc=`Exportación de ${periodLabel(period)} · ${branch}`;rows=[['Período',periodLabel(period)],['Perfil',branch],['Ingresos',money(s.income)],['Gastos caja',money(s.cashExpense)],['Gastos local',money(s.localExpense)],['Facturas',String(s.invoiceCount)],['Inversiones',money(s.investment)],['Horas',number(s.hours)],['Resultado',money(s.result)]];addRecords('Caja',Store.list('cash',period,branch),x=>`${dateLabel(x.date)} · ${x.type==='income'?'INGRESO':x.type==='expense'?'GASTO DE CAJA':'PAGO'} · ${x.concept||'Sin concepto'} · ${money(x.amount)}`);addRecords('Factura',Store.list('invoices',period,branch),x=>`${x.provider||'—'} · ${x.number||'—'} · ${dateLabel(x.operationDate||x.date)} · ${money(x.amount)} · ${x.branch}`);addRecords('Gasto',Store.list('expenses',period,branch),x=>`${dateLabel(x.date)} · ${x.category} · ${x.concept||'—'} · ${money(x.amount)}`);addRecords('Inversión',Store.list('investments',period,branch),x=>`${dateLabel(x.date)} · ${x.concept||'—'} · ${money(x.amount)}`);addRecords('Hora',Store.list('hours',period,branch),x=>`${x.employee||'—'} · ${dateLabel(x.date)} · ${number(x.hours||0)} h · Extras ${number(x.overtimeHours||0)} · ${x.holiday==='yes'?'FERIADO':''}`);}
  else return;
  const blob=createSimplePDF(title,desc,rows,'Documento generado por Control Empresarial Blunno. Caja diaria permanece separada del resultado general.');if(!blob)return;
  const safeBase=`${type}-blunno-${period}-${String(branch).replace(/\s+/g,'-').toLowerCase()}`;const name=`${safeBase}-${Date.now()}.pdf`;
  const storagePath=storagePathFor(period,branch,title,name);let url=null;try{url=await uploadFile(storagePath,blob,'application/pdf')}catch(e){console.warn('Storage PDF',e)}
  try{await Store.archiveFile({name,sector:title,period,branch,generatedBy:currentOperator,responsible:currentOperator,mime:'application/pdf',createdAt:now(),url,storagePath,blob});}catch(e){toast(`El PDF se generó, pero no pudo archivarse: ${e.message}`,false);return}
  showPdfSuccess('PDF listo para descargar',desc,`<b>${esc(name)}</b><span>Ruta: ${esc(storagePath)} · Generado: ${esc(dateTimeLabel(now()))}</span>`,blob,name);
 return blob;
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
async function downloadStoredFile(id){const f=Store.get('files',id);if(!f){toast('No se encontró el archivo.',false);return}try{const blob=await Store.getFileBlob(id);if(!blob){toast('No se encontró una copia descargable de este archivo.',false);return}await auditPdfAction(f,'PDF_DOWNLOADED','Archivo PDF descargado desde Archivos');downloadBlob(blob,f.name);toast('Archivo descargado correctamente.')}catch(e){toast(`No se pudo descargar: ${e.message}`,false)}}


function getCashOpening(){const id=`cash-opening-${period}-${branch}`;return Number(Store.db.settings.find(x=>x.id===id)?.amount||0)}
async function editCashOpening(){if(!currentOperator){toast('Elegí responsable antes de modificar el saldo inicial.',false);return}const current=getCashOpening();const raw=prompt(`Saldo con el que arranca la caja de ${periodLabel(period)} · ${branch}:`,String(current));if(raw===null)return;const amount=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount))return toast('Monto inválido.',false);const id=`cash-opening-${period}-${branch}`;const old=Store.db.settings.find(x=>x.id===id);try{const data={id,period,branch,amount,responsible:currentOperator,updatedAt:now()};if(old)await Store.update('settings',id,data,currentOperator,'Actualización de saldo inicial de caja');else await Store.add('settings',data,currentOperator,'Carga de saldo inicial de caja');toast('Saldo inicial guardado y auditado.');refresh()}catch(e){toast(e.message,false)}}
async function quickInvoiceSave(){
 if(!currentOperator){toast('Elegí responsable antes de cargar facturas.',false);return}
 if(branch==='General'){toast('Para cargar una factura elegí una sucursal concreta.',false);return}
 const providerText=$('#quickInvoiceProvider')?.value.trim(), amount=Number(($('#quickInvoiceAmount')?.value||'').replace(/\./g,'').replace(',','.')), operationDate=$('#quickInvoiceDate')?.value||today(), number=$('#quickInvoiceNumber')?.value.trim()||'';
 if(!providerText){toast('Indicá el proveedor.',false);return}
 if(!Number.isFinite(amount)||amount<0){toast('Indicá un importe válido.',false);return}
 const master=Store.list('providers').find(x=>x.active!==false&&sourceIdentity(x.name)===sourceIdentity(providerText));
 if(!master){toast('El proveedor no existe en el maestro. Elegilo de la lista o crealo primero.',false);return}
 try{const p=operationDate.slice(0,7);const late=Store.periodIsClosed(p,branch);const data={provider:master.name,number,operationDate,loadDate:now(),branch,amount,period:p,status:'CARGADA',notes:'Carga rápida'};await Store.add('invoices',data,currentOperator,'Carga rápida de factura',{lateMovement:late});if(late){const latest=Store.db.closures.filter(x=>x.period===p&&x.branch===branch&&x.status==='closed').sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];if(latest)await generateClosurePDF(latest)}toast(late?'Factura cargada en período cerrado; cierre versionado.':'Factura cargada correctamente.');refresh()}catch(e){toast(e.message,false)}}
async function ensureXLSX(){
 if(typeof XLSX!=="undefined") return XLSX;
 if(typeof window.XLSX!=="undefined") return window.XLSX;
 if(window.__BLUNNO_XLSX_LOADER__) return window.__BLUNNO_XLSX_LOADER__;
 window.__BLUNNO_XLSX_LOADER__=new Promise((resolve,reject)=>{
   const script=document.createElement("script");
   script.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
   script.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error("El módulo Excel se cargó sin exponer XLSX."));
   script.onerror=()=>reject(new Error("No se pudo cargar el módulo Excel. Revisá la conexión a internet e intentá nuevamente."));
   (document.head||document.body).appendChild(script);
 });
 return window.__BLUNNO_XLSX_LOADER__;
}

async function handleExcel(e){
 const f=e.target.files?.[0]; if(!f)return; const box=$('#importPreview'); box.innerHTML='<div class="loading">Leyendo Excel y preparando revisión…</div>';
 try{const XLSXLib=await ensureXLSX(); const wb=XLSXLib.read(await f.arrayBuffer(),{type:'array',cellDates:true});window.__blunnoWorkbook=wb;box.innerHTML=`<div class="notice success"><b>${esc(f.name)}</b> leído correctamente: ${wb.SheetNames.length} hojas.</div>`+wb.SheetNames.map((s,i)=>`<div class="sheet-preview"><div><b>${esc(s)}</b><span>Hoja ${i+1}</span></div><button class="secondary-button sync-sheet" data-sheet="${encodeURIComponent(s)}">Analizar hoja</button></div>`).join('');document.querySelectorAll('.sync-sheet').forEach(b=>b.onclick=()=>analyzeSheet(wb,decodeURIComponent(b.dataset.sheet),f.name));}
 catch(err){box.innerHTML=`<div class="notice danger-box">No se pudo leer el Excel: ${esc(err.message)}</div>`}
}
function normalizeImport(v){return String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
function parseExcelDate(v){if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;const s=String(v??'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})$/);if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;const n=Number(v);if(Number.isFinite(n)&&n>20000&&n<60000){const d=new Date(Date.UTC(1899,11,30)+n*86400000);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}return null}
function parseImportHours(v,marker=''){const raw=String(v??'').trim().replace(',','.');const mk=normalizeImport(marker||v);if(/^f(ra(nco)?)?$/.test(mk))return {hours:0,displayValue:'F',holiday:'no'};if(/^h|feriado$/.test(mk)&&!Number.isFinite(Number(raw)))return {hours:8,displayValue:'H',holiday:'yes'};const hm=raw.match(/^(\d+(?:\.\d+)?)\s*h$/i);if(hm)return {hours:Number(hm[1]),displayValue:`${Number(hm[1])}H`,holiday:'yes'};const hours=Number(raw);if(Number.isFinite(hours)&&hours>=0&&hours<=24)return {hours,displayValue:hours,holiday:/^(h|feriado)$/i.test(mk)?'yes':'no'};return null}
async function analyzeWorkbook(wb,fileName){
 if(!currentOperator){toast('Elegí responsable antes de sincronizar.',false);return}
 const X=await ensureXLSX(),ops=[],errors=[],report=[];
 for(const sheet of wb.SheetNames){const rows=X.utils.sheet_to_json(wb.Sheets[sheet],{header:1,defval:'',raw:true});let header=-1,map={};
  for(let i=0;i<Math.min(rows.length,40);i++){const h=rows[i].map(normalizeImport);const idx={employee:h.findIndex(x=>/empleado|nombre/.test(x)),date:h.findIndex(x=>/fecha|dia/.test(x)),hours:h.findIndex(x=>/hora/.test(x)),provider:h.findIndex(x=>/proveedor/.test(x)),amount:h.findIndex(x=>/importe|monto|total|valor/.test(x)),category:h.findIndex(x=>/categoria|categoría|gasto/.test(x)),concept:h.findIndex(x=>/concepto|detalle|descripcion|descripción/.test(x)),number:h.findIndex(x=>/factura|numero|n°|nro/.test(x)),branch:h.findIndex(x=>/sucursal|local|perfil/.test(x)),type:h.findIndex(x=>/tipo|movimiento/.test(x))};if(idx.employee>=0&&idx.date>=0&&idx.hours>=0){header=i;map={...idx,kind:'hours'};break}if(idx.provider>=0&&idx.amount>=0&&idx.date>=0){header=i;map={...idx,kind:'invoices'};break}if(idx.amount>=0&&idx.date>=0&&(idx.category>=0||idx.concept>=0)){header=i;map={...idx,kind:'expenses'};break}if(idx.amount>=0&&idx.date>=0&&idx.type>=0){header=i;map={...idx,kind:'cash'};break}}
  let ok=0,bad=0;if(header>=0){for(let r=header+1;r<rows.length;r++){const row=rows[r];if(!row.length||row.every(v=>String(v??'').trim()===''))continue;const date=parseExcelDate(row[map.date]);if(!date){errors.push({sheet,row:r+1,message:'Fecha inválida o vacía.'});bad++;continue}const bt=String(map.branch>=0?row[map.branch]:'').trim();const rb=CONFIG.branches.find(b=>normalizeImport(b)===normalizeImport(bt))||(branch!=='General'?branch:null);if(!rb){errors.push({sheet,row:r+1,message:'Sucursal no identificada.'});bad++;continue}let collection,data;if(map.kind==='hours'){const et=String(row[map.employee]??'').trim(),emp=Store.list('employees').find(x=>normalizeImport(x.name)===normalizeImport(et)),h=parseImportHours(row[map.hours]);if(!emp){errors.push({sheet,row:r+1,message:`Empleado no encontrado: ${et||'sin nombre'}`});bad++;continue}if(!h){errors.push({sheet,row:r+1,message:'Horas inválidas.'});bad++;continue}collection='hours';data={period:date.slice(0,7),date,branch:emp.branch,employeeId:emp.id,employee:emp.name,hours:h.hours,displayValue:h.displayValue,holiday:h.holiday,overtimeHours:0,advance:0,merchandise:0,salaryCost:h.hours*Number(emp.hourlyRate||0)}}else if(map.kind==='invoices'){const pt=String(row[map.provider]??'').trim(),master=providersForBranch(rb).find(x=>sourceIdentity(x.name)===sourceIdentity(pt));if(!master){errors.push({sheet,row:r+1,message:`Proveedor no encontrado: ${pt||'vacío'}`});bad++;continue}collection='invoices';data={period:date.slice(0,7),date,branch:rb,provider:master.name,number:map.number>=0?String(row[map.number]??'').trim():'',operationDate:date,loadDate:now(),amount:Number(String(row[map.amount]??0).replace(/\./g,'').replace(',','.'))||0,status:'CARGADA'};}else if(map.kind==='expenses'){collection='expenses';data={period:date.slice(0,7),date,branch:rb,category:map.category>=0?String(row[map.category]??'').trim():'Otros gastos',concept:map.concept>=0?String(row[map.concept]??'').trim():'',amount:Number(String(row[map.amount]??0).replace(/\./g,'').replace(',','.'))||0};}else{collection='cash';const tt=normalizeImport(map.type>=0?row[map.type]:'ingreso'),type=/pago/.test(tt)?'payment':/gasto/.test(tt)?'expense':'income';data={period:date.slice(0,7),date,branch:rb,type,concept:map.concept>=0?String(row[map.concept]??'').trim():'Importado Excel',amount:Number(String(row[map.amount]??0).replace(/\./g,'').replace(',','.'))||0};}ops.push({collection,sourceKey:`${fileName}|${sheet}|${r}|${collection}|${date}|${rb}`,data,row:r+1,sheet});ok++}}else{errors.push({sheet,row:0,message:'No se pudo identificar el sector por los encabezados.'});bad++}report.push({sheet,rows:rows.length,ok,bad})}
 window.__blunnoPendingImport={operations:ops,errors,fileName,sheet:'TODAS LAS HOJAS'};const by=ops.reduce((m,x)=>(m[x.collection]=(m[x.collection]||0)+1,m),{});$('#importPreview').innerHTML=`<div class="import-result-head"><div><b>Análisis completo: ${esc(fileName)}</b><span>${wb.SheetNames.length} hojas · ${ops.length} registros válidos · ${errors.length} para revisión.</span></div>${ops.length?'<button class="primary-button" id="confirmExcelImport">Confirmar importación completa</button>':''}</div><div class="import-sector-summary">${Object.entries(by).map(([k,v])=>`<span>${esc(sectorForCollection(k))}: <b>${v}</b></span>`).join('')||'<span>No se identificaron registros automáticamente.</span>'}</div>${errors.length?`<div class="notice warning"><b>Revisá ${errors.length} fila(s)</b><ul>${errors.slice(0,20).map(x=>`<li>${esc(x.sheet)} · Fila ${x.row}: ${esc(x.message)}</li>`).join('')}</ul></div>`:''}<div class="table-wrap"><table><thead><tr><th>Hoja</th><th>Filas</th><th>Válidas</th><th>Revisión</th></tr></thead><tbody>${report.map(x=>`<tr><td>${esc(x.sheet)}</td><td>${x.rows}</td><td>${x.ok}</td><td>${x.bad?`<span class="text-red">${x.bad}</span>`:'<span class="status-pill success">OK</span>'}</td></tr>`).join('')}</tbody></table></div>`;$('#confirmExcelImport')?.addEventListener('click',confirmExcelImport);
}
async function analyzeSheet(wb,sheet,fileName){
 if(!currentOperator){toast('Elegí responsable antes de sincronizar.',false);return}
 const XLSXLib=await ensureXLSX();
 const ws=wb.Sheets[sheet], rows=XLSXLib.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
 const errors=[], operations=[]; const empRows=Store.list('employees');
 let headerIndex=-1, map={};
 for(let i=0;i<Math.min(rows.length,25);i++){const h=rows[i].map(normalizeImport);const idx={employee:h.findIndex(x=>/empleado|nombre/.test(x)),date:h.findIndex(x=>/fecha|dia/.test(x)),hours:h.findIndex(x=>/hora/.test(x)),branch:h.findIndex(x=>/sucursal|local/.test(x)),holiday:h.findIndex(x=>/feriado/.test(x)),advance:h.findIndex(x=>/adelanto|vale/.test(x)),merchandise:h.findIndex(x=>/mercaderia|mercadería|vale/.test(x))};if(idx.employee>=0&&idx.date>=0&&idx.hours>=0){headerIndex=i;map=idx;break;}}
 if(headerIndex>=0){
   for(let r=headerIndex+1;r<rows.length;r++){const row=rows[r];if(!row.length||row.every(v=>String(v??'').trim()===''))continue;const employeeText=String(row[map.employee]??'').trim();const date=parseExcelDate(row[map.date]);const emp=empRows.find(x=>normalizeImport(x.name)===normalizeImport(employeeText));if(!emp){errors.push({row:r+1,message:`Empleado no encontrado: ${employeeText||'sin nombre'}`});continue}if(!date){errors.push({row:r+1,message:'Fecha inválida o vacía.'});continue}const h=parseImportHours(row[map.hours],map.holiday>=0?row[map.holiday]:'');if(!h){errors.push({row:r+1,message:'Horas inválidas. Usá un número, F o H.'});continue}const sourceKey=`${fileName}|${sheet}|${r}|${emp.id}|${date}`;const data={period:date.slice(0,7),date,branch:emp.branch,employeeId:emp.id,employee:emp.name,hours:h.hours,displayValue:h.displayValue,holiday:h.holiday,advance:map.advance>=0?Number(String(row[map.advance]??0).replace(/\./g,'').replace(',','.'))||0:0,merchandise:map.merchandise>=0?Number(String(row[map.merchandise]??0).replace(/\./g,'').replace(',','.'))||0:0,salaryCost:h.hours*Number(emp.hourlyRate||0)};if(normalizeImport(employeeText)!==normalizeImport(emp.name))data.sourceWarning=`Nombre Excel coincide por normalización con ${emp.name}`;operations.push({collection:'hours',sourceKey,data,row:r+1});}
 }else{
   // Fallback para hojas donde el nombre del empleado es el nombre de la hoja y los encabezados contienen días 1..31.
   const emp=empRows.find(x=>normalizeImport(x.name)===normalizeImport(sheet));
   if(emp){const header=rows.findIndex(row=>row.some(v=>/lunes|martes|miercoles|jueves|viernes|sabado|domingo/i.test(String(v||''))||/\b\d{1,2}\b/.test(String(v||''))));if(header>=0){const row=rows[header], dayCols=[];row.forEach((v,c)=>{const m=String(v||'').match(/(\d{1,2})$/);if(m)dayCols.push({day:Number(m[1]),col:c})});const dataRow=rows[header+1]||[];for(const dc of dayCols){if(dc.day<1||dc.day>31)continue;const date=parseExcelDate(`${period}-${String(dc.day).padStart(2,'0')}`);const h=parseImportHours(dataRow[dc.col]??'');if(!h)continue;operations.push({collection:'hours',sourceKey:`${fileName}|${sheet}|${header+1}|${emp.id}|${date}`,data:{period,date,branch:emp.branch,employeeId:emp.id,employee:emp.name,hours:h.hours,displayValue:h.displayValue,holiday:h.holiday,advance:0,merchandise:0,salaryCost:h.hours*Number(emp.hourlyRate||0)},row:header+2});}}}
   else errors.push({row:0,message:'No se encontró una fila de encabezados compatible ni un empleado con el nombre de la hoja.'});
 }
 window.__blunnoPendingImport={operations,errors,fileName,sheet};
 const preview=operations.slice(0,12).map(op=>`<tr><td>${op.row}</td><td>${esc(op.data.employee)}</td><td>${dateLabel(op.data.date)}</td><td>${esc(op.data.displayValue)}</td><td>${money(op.data.advance+op.data.merchandise)}</td></tr>`).join('');
 $('#importPreview').innerHTML=`<div class="import-result-head"><div><b>Revisión: ${esc(sheet)}</b><span>${rows.length} filas leídas · ${operations.length} válidas · ${errors.length} requieren revisión.</span></div>${operations.length?'<button class="primary-button" id="confirmExcelImport">Confirmar importación</button>':''}</div>${errors.length?`<div class="notice warning"><b>Revisá ${errors.length} fila(s)</b><ul>${errors.slice(0,12).map(x=>`<li>Fila ${x.row}: ${esc(x.message)}</li>`).join('')}</ul></div>`:''}${operations.length?`<div class="table-wrap"><table><thead><tr><th>Fila</th><th>Empleado</th><th>Fecha</th><th>Valor</th><th>Adelanto + mercadería</th></tr></thead><tbody>${preview}</tbody></table></div><p class="cell-note">Solo se guardarán después de presionar “Confirmar importación”. No se crean empleados nuevos automáticamente.</p>`:'<div class="empty-block">No se encontraron filas importables.</div>'}`;
 $('#confirmExcelImport')?.addEventListener('click',confirmExcelImport);
}
async function confirmExcelImport(){const p=window.__blunnoPendingImport;if(!p||!currentOperator)return;const btn=$('#confirmExcelImport');if(btn?.dataset.busy==='1')return;if(btn)btn.dataset.busy='1';let imported=0,failed=0;try{for(const op of p.operations){try{await Store.upsertBySource(op.collection,op.sourceKey,op.data,currentOperator,`Importación Excel · ${p.fileName} · ${p.sheet} · fila ${op.row}`);imported++;}catch(e){failed++;}}await Store.add('imports',{date:today(),period,branch,sourceFile:p.fileName,sheet:p.sheet,rowsRead:p.operations.length+p.errors.length,imported,errors:p.errors.length+failed,status:failed||p.errors.length?'review':'complete'},currentOperator,'Registro de importación Excel');toast(`Importación completada: ${imported} importados, ${p.errors.length+failed} requieren revisión.`);window.__blunnoPendingImport=null;refresh();}catch(e){toast(`No se pudo completar la importación: ${e.message}`,false)}finally{if(btn)btn.dataset.busy='0'}}
async function exportExcel(){
 if(!currentOperator){toast('Elegí el responsable en la barra superior antes de exportar.',false);return}
 const X=await ensureXLSX(),wb=X.utils.book_new(),summary=Store.summary(period,branch);
 const add=(name,headers,rows,nums=[])=>{const ws=X.utils.aoa_to_sheet([headers,...rows]);ws['!cols']=headers.map((h,i)=>({wch:Math.min(44,Math.max(12,String(h).length+3,...rows.slice(0,100).map(r=>String(r[i]??'').length+2)))}));ws['!freeze']={xSplit:0,ySplit:1};if(rows.length)ws['!autofilter']={ref:`A1:${String.fromCharCode(65+Math.min(25,headers.length-1))}${rows.length+1}`};nums.forEach(c=>{for(let r=1;r<=rows.length;r++){const cell=ws[String.fromCharCode(65+Math.min(25,c))+(r+1)];if(cell)cell.z='#,##0.00';}});X.utils.book_append_sheet(wb,ws,name.slice(0,31));};
 add('Resumen',['Indicador','Monto'],[['Período',periodLabel(period)],['Perfil',branch],['Ingresos',summary.income],['Gastos caja',summary.cashExpense],['Gastos local',summary.localExpense],['Inversiones',summary.investment],['Personal',summary.salary],['Proveedores',summary.providers],['Resultado',summary.result]],[1]);
 add('Caja diaria',['Fecha','Tipo','Concepto','Importe','Sucursal','Responsable'],Store.list('cash',period,branch).map(x=>[x.date,x.type==='income'?'Ingreso':x.type==='expense'?'Gasto de caja':'Pago',x.concept||'',Number(x.amount||0),x.branch||'',x.responsible||'—']),[3]);
 add('Facturas',['Proveedor','Factura','Fecha movimiento','Fecha carga','Sucursal','Importe','Estado','Responsable'],Store.list('invoices',period,branch).map(x=>[x.provider||'',x.number||'',x.operationDate||x.date||'',x.loadDate||x.createdAt||'',x.branch||'',Number(x.amount||0),'CARGADA',x.responsible||'—']),[5]);
 add('Gastos',['Fecha','Categoría','Detalle','Sucursal','Importe','Responsable'],Store.list('expenses',period,branch).map(x=>[x.date||'',x.category||'',x.concept||'',x.branch||'',Number(x.amount||0),x.responsible||'—']),[4]);
 add('Inversiones',['Fecha','Resumen','Sucursal','Importe','Comprobante','Responsable'],Store.list('investments',period,branch).map(x=>[x.date||'',x.concept||'',x.branch||'',Number(x.amount||0),x.document||'',x.responsible||'—']),[3]);
 add('Horas',['Empleado','Fecha','Horas','Feriado','Extras','Adelantos','Mercadería','Sucursal','Responsable'],Store.list('hours',period,branch).map(x=>[x.employee||'',x.date||'',Number(x.hours||0),x.holiday==='yes'?'Sí':'No',Number(x.overtimeHours||0),Number(x.advance||0),Number(x.merchandise||0),x.branch||'',x.responsible||'—']),[2,4,5,6]);
 add('Liquidaciones',['Empleado','Fecha','Horas normales','Horas feriado','Horas extras','Total horas','Adelantos','Mercadería','Bruto','Neto','Responsable'],Store.list('liquidations',period,branch).map(x=>[x.employee||'',x.date||'',Number(x.normalHours||0),Number(x.holidayHours||0),Number(x.overtimeHours||0),Number(x.totalHours||0),Number(x.advance||0),Number(x.merchandise||0),Number(x.gross||0),Number(x.net||0),x.responsible||'—']),[2,3,4,5,6,7,8,9]);
 const name=`BLUNNO_${period}_${slugPath(branch)}_EXPORTACION.xlsx`,bytes=X.write(wb,{bookType:'xlsx',type:'array',cellStyles:true}),blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});let url=null;try{url=await uploadFile(storagePathFor(period,branch,'Exportación Excel',name),blob,blob.type)}catch(e){console.warn(e)}await Store.archiveFile({name,sector:'Exportación Excel',period,branch,responsible:currentOperator,mime:blob.type,createdAt:now(),sourceCollection:'imports',url,storagePath:storagePathFor(period,branch,'Exportación Excel',name),blob});downloadBlob(blob,name);toast('Excel exportado, ordenado y archivado correctamente.');
}

function printBlob(blob){
 try{
   const url=URL.createObjectURL(blob);
   const win=window.open("about:blank","_blank","noopener,noreferrer,width=980,height=760");
   if(win){
     win.document.open();
     win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Imprimir PDF · Distribuidora Blunno</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff}embed{display:block;width:100%;height:100%;border:0}</style></head><body><embed id="blunnoPdfPrint" type="application/pdf"></body></html>`);
     win.document.close();
     const embed=win.document.getElementById("blunnoPdfPrint"); if(embed) embed.src=url;
     setTimeout(()=>{try{win.focus();win.print()}catch(e){toast("El navegador no permitió imprimir el documento.",false)}},900);
     setTimeout(()=>URL.revokeObjectURL(url),120000);
     return;
   }
   const frame=document.createElement('iframe'); frame.title='BLUNNO PDF'; frame.style.position='fixed'; frame.style.left='-10000px'; frame.style.top='0'; frame.style.width='1px'; frame.style.height='1px'; frame.src=url; document.body.appendChild(frame);
   frame.onload=()=>setTimeout(()=>{try{frame.contentWindow?.focus();frame.contentWindow?.print()}catch(e){toast('El navegador no permitió imprimir el documento.',false)}setTimeout(()=>{URL.revokeObjectURL(url);frame.remove()},120000)},900);
 }catch(e){toast(`No se pudo preparar la impresión: ${e.message}`,false)}
}
async function printStoredFile(id){try{const file=Store.get('files',id);const blob=await Store.getFileBlob(id);if(!blob)throw new Error('No se encontró el archivo.');await auditPdfAction(file,'PDF_PRINTED','Archivo PDF impreso desde Archivos');printBlob(blob);toast('Documento enviado a impresión.');}catch(e){toast(`No se pudo imprimir: ${e.message}`,false)}}
function dosDateTime(){const d=new Date();return {time:(d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2),date:((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()};}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255]);}
function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
function concatBytes(chunks){const total=chunks.reduce((n,x)=>n+x.length,0);const out=new Uint8Array(total);let o=0;for(const x of chunks){out.set(x,o);o+=x.length}return out;}
function zipStored(entries){const enc=new TextEncoder(),parts=[],central=[];let offset=0;const dt=dosDateTime();for(const entry of entries){const name=enc.encode(entry.name),data=entry.data instanceof Uint8Array?entry.data:new Uint8Array(entry.data);const crc=crc32(data);const local=concatBytes([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);parts.push(local);central.push({name,crc,size:data.length,offset});offset+=local.length;}const centralStart=offset;for(const c of central){parts.push(concatBytes([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(c.crc),u32(c.size),u32(c.size),u16(c.name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(c.offset),c.name]));offset+=46+c.name.length;}const centralSize=offset-centralStart;parts.push(concatBytes([u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(centralSize),u32(centralStart),u16(0)]));return new Blob(parts,{type:'application/zip'});}
async function createBackupZip(){if(!currentOperator){toast('Elegí responsable antes de hacer un backup.',false);return null}try{const state=JSON.parse(JSON.stringify(Store.db));const manifest=[];const entries=[{name:'datos/blunno.json',data:new TextEncoder().encode(JSON.stringify(state,null,2))}];for(const file of Store.list('files')){try{const blob=await Store.getFileBlob(file.id);if(blob){const bytes=new Uint8Array(await blob.arrayBuffer());const entryName=`archivos/${file.id}`;entries.push({name:entryName,data:bytes});manifest.push({id:file.id,name:file.name,mime:file.mime||'application/octet-stream',entry:entryName});}}catch(e){manifest.push({id:file.id,name:file.name,mime:file.mime||'',entry:null,error:e.message})}}entries.push({name:'datos/manifest_archivos.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});const blob=zipStored(entries);const name=`BLUNNO_BACKUP_${today()}.zip`;downloadBlob(blob,name);toast(`Backup completo generado: ${entries.length-2} archivos documentales incluidos.`);return {blob,name,entries:entries.map(x=>x.name)}}catch(e){toast(`No se pudo generar el backup: ${e.message}`,false);return null}}
function readZipEntries(bytes){const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const sig=0x06054b50;let eocd=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65558);i--){if(dv.getUint32(i,true)===sig){eocd=i;break}}if(eocd<0)throw new Error('El ZIP no tiene una estructura reconocible.');const count=dv.getUint16(eocd+10,true),cdOffset=dv.getUint32(eocd+16,true),entries={};let pos=cdOffset;const dec=new TextDecoder();for(let i=0;i<count;i++){if(dv.getUint32(pos,true)!==0x02014b50)throw new Error('Entrada ZIP inválida.');const nameLen=dv.getUint16(pos+28,true),extraLen=dv.getUint16(pos+30,true),commentLen=dv.getUint16(pos+32,true),method=dv.getUint16(pos+10,true),size=dv.getUint32(pos+24,true),offset=dv.getUint32(pos+42,true);const name=dec.decode(bytes.slice(pos+46,pos+46+nameLen));if(method!==0)throw new Error('El backup usa compresión no compatible. Generá nuevamente el backup desde BLUNNO.');const lp=offset;if(dv.getUint32(lp,true)!==0x04034b50)throw new Error('Cabecera local ZIP inválida.');const ln=dv.getUint16(lp+26,true),le=dv.getUint16(lp+28,true);const dataStart=lp+30+ln+le;entries[name]=bytes.slice(dataStart,dataStart+size);pos+=46+nameLen+extraLen+commentLen;}return entries;}
async function restoreBackupFile(file){if(!file||!currentOperator)return;if(!confirm('Vas a restaurar un backup. Esto reemplazará los datos actuales del modo local por la copia elegida. ¿Continuar?'))return;try{const bytes=new Uint8Array(await file.arrayBuffer());let data,manifest=[];if(/\.zip$/i.test(file.name)||file.type==='application/zip'){const entries=readZipEntries(bytes);const json=entries['datos/blunno.json'];if(!json)throw new Error('El backup no contiene datos/blunno.json.');data=JSON.parse(new TextDecoder().decode(json));if(entries['datos/manifest_archivos.json'])manifest=JSON.parse(new TextDecoder().decode(entries['datos/manifest_archivos.json']));await Store.importState(data,currentOperator);let restored=0;for(const m of manifest){if(!m.entry||!entries[m.entry])continue;try{await Store.restoreFileBlob(m.id,new Blob([entries[m.entry]],{type:m.mime||'application/octet-stream'}),currentOperator);restored++}catch(e){console.warn('Restore file',m.id,e)}}toast(`Backup restaurado. ${restored} documentos recuperados.`);}else{data=JSON.parse(new TextDecoder().decode(bytes));await Store.importState(data,currentOperator);toast('Backup JSON restaurado correctamente.');}refresh();}catch(e){toast(`No se pudo restaurar el backup: ${e.message}`,false)}}

function checkReminders(){const due=Store.list('tasks').filter(x=>x.status!=='completed').sort((a,b)=>`${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`))[0];if(!due)return;const nowD=new Date(),d=new Date(`${due.dueDate}T${due.dueTime||'23:59'}:00`);if(d<=nowD||due.dueDate===today()){$('#reminderTitle').textContent=due.priority==='urgent'?'⚠ RECORDATORIO URGENTE':'🔔 TENÉS UN RECORDATORIO';$('#reminderText').textContent=due.title;$('#reminderMeta').textContent=`📅 ${dateLabel(due.dueDate)} — ${due.dueTime||'sin hora'} · 👤 ${due.responsible}`;$('#reminderModal').classList.remove('hidden');$('#reminderDone').onclick=()=>completeTask(due.id);}}

function globalWire(){
 document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{view=b.dataset.view;viewHistory.length=0;viewForward.length=0;refresh();closeMobileMenu();});
 const mobileBtn=$('#mobileMenuBtn');
 const overlay=$('#mobileOverlay');
 function openMobileMenu(){document.body.classList.add('mobile-nav-open');overlay?.classList.remove('hidden');}
 window.__blunnoOpenMobileMenu=openMobileMenu;
 window.__blunnoCloseMobileMenu=closeMobileMenu;
 function closeMobileMenu(){document.body.classList.remove('mobile-nav-open');overlay?.classList.add('hidden');}
 mobileBtn?.addEventListener('click',openMobileMenu);
 overlay?.addEventListener('click',closeMobileMenu);

 $('#periodSelector').onclick=openPeriodModal;
 $('#branchSelector').onchange=e=>{const next=e.target.value;if(next===branch)return;if(confirm(`Estás cambiando el contexto de trabajo a ${String(next).toUpperCase()}.\nLos datos no se modificarán. Solamente cambiará la información que estás visualizando.\n\n¿Querés cambiar el contexto?`))setBranch(next);else e.target.value=branch;};
 $('#operatorSelector').onchange=e=>setOperator(e.target.value);
 $('#newRecordBtn').onclick=()=>{const map={dashboard:'cash',cash:'cash',providers:'invoice',invoices:'invoice',expenses:'expense',investments:'investment',people:'employee',hours:'hours',tasks:'task'};if(map[view])openModal(map[view]);else toast('Elegí un sector para crear un movimiento.',false)};
 $('#searchBtn').onclick=openSearch;

 $('#closeModalBtn')?.addEventListener('click',closeModal);
 $('#recordForm').addEventListener('submit',saveRecord);
 document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=closeModal);
 document.querySelectorAll('[data-close-period-modal]').forEach(b=>b.onclick=()=>$('#periodModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-period-confirm]').forEach(b=>b.onclick=closePeriodConfirm);
 $('#periodConfirmAccept')?.addEventListener('click',confirmPeriodAction);
 $('#periodConfirmModal')?.addEventListener('click',e=>{if(e.target.id==='periodConfirmModal')closePeriodConfirm()});
 document.querySelectorAll('[data-close-detail]').forEach(b=>b.onclick=()=>$('#detailModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-liquidation]').forEach(b=>b.onclick=()=>$('#liquidationModal').classList.add('hidden'));
 document.querySelectorAll('[data-close-reminder]').forEach(b=>b.onclick=()=>$('#reminderModal').classList.add('hidden'));
}

let pendingPeriodAction=null;
function closePeriodConfirm(){pendingPeriodAction=null;$('#periodConfirmModal')?.classList.add('hidden');}
function openPeriodActionConfirm(kind,value){
 if(branch==='General'){toast('General es una vista consolidada. Elegí una sucursal concreta para iniciar o modificar un período.',false);return;}
 pendingPeriodAction={kind,value,branch};
 const edit=kind==='edit';
 $('#periodConfirmTitle').textContent=edit?'Modificar mes cerrado':'Comenzar nuevo mes';
 $('#periodConfirmMessage').textContent=edit?'¿Estás seguro que querés modificar el mes seleccionado?':'¿Estás seguro que querés arrancar este nuevo mes de control?';
 $('#periodConfirmPeriod').textContent=`${periodLabel(value)} · ${branch}`;
 const select=$('#periodConfirmResponsible');
 if(select) select.innerHTML='<option value="">Elegir responsable…</option>'+CONFIG.responsiblePeople.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
 if(select) select.value='';
 $('#periodConfirmModal').classList.remove('hidden');
 setTimeout(()=>select?.focus(),0);
}
async function confirmPeriodAction(){
 if(!pendingPeriodAction)return;
 const target=pendingPeriodAction; const responsible=$('#periodConfirmResponsible')?.value||'';
 try{
   assertResponsible(responsible);
   setOperator(responsible);
   if(target.kind==='edit'){
     const pending=pendingRecordEdit; pendingRecordEdit=null;
     setPeriodEditConfirmed(target.value,target.branch,true);
     period=target.value; Store.setPeriod(period); try{localStorage.setItem(periodContextKey(branch),period)}catch{};
     closePeriodConfirm(); $('#periodModal').classList.add('hidden');
     refresh();
     toast(`${periodLabel(target.value)} quedó habilitado para correcciones y la autorización fue auditada.`);
     if(pending?.id) setTimeout(()=>openModal(pending.type,pending.id),0);
   }else{
     await Store.openPeriod(target.value,responsible,target.branch);
     period=target.value; Store.setPeriod(period); try{localStorage.setItem(periodContextKey(branch),period)}catch{};
     closePeriodConfirm(); $('#periodModal').classList.add('hidden');
     refresh(); toast(`${periodLabel(target.value)} quedó iniciado para ${target.branch}.`);
   }
 }catch(e){toast(e.message,false);}
}

function openSearch(){const m=$('#searchModal');m.classList.remove('hidden');const input=$('#searchInput');input.value='';input.focus();const draw=()=>{const q=input.value.toLowerCase().trim();if(!q){$('#searchResults').innerHTML='<div class="empty-block">Buscá proveedores, facturas, ingresos, gastos, inversiones, empleados, documentos, cierres o auditoría.</div>';return}const sources=[
  ...Store.list('providers').map(x=>({...x,_type:'Proveedor',_label:x.name,_view:'providers'})),
  ...Store.list('employees').map(x=>({...x,_type:'Empleado',_label:x.name,_view:'people'})),
  ...Store.list('invoices').map(x=>({...x,_type:'Factura',_label:`${x.provider} · ${x.number||'sin número'} · ${money(x.amount)}`,_view:'invoices'})),
    ...Store.list('expenses').map(x=>({...x,_type:'Gasto',_label:`${x.category} · ${x.concept||''} · ${money(x.amount)}`,_view:'expenses'})),
  ...Store.list('investments').map(x=>({...x,_type:'Inversión',_label:`${x.concept||'Inversión'} · ${money(x.amount)}`,_view:'investments'})),
  ...Store.list('files').map(x=>({...x,_type:'Documento',_label:x.name,_view:'files'})),
  ...Store.list('closures').map(x=>({...x,_type:'Cierre',_label:`Cierre ${periodLabel(x.period)} · ${x.branch} · V${x.version}`,_view:'close'})),
  ...auditForContext(period,branch).map(x=>({...x,_type:'Auditoría',_label:`${x.action} · ${x.collection} · ${x.responsible} · ${dateTimeLabel(x.at)}`,_view:'history'}))
 ];const found=sources.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).slice(0,40);$('#searchResults').innerHTML=found.map(x=>`<button class="search-result" data-search-view="${esc(x._view)}"><span class="search-result-type">${esc(x._type)}</span><b>${esc(x._label)}</b></button>`).join('')||'<div class="empty-block">No encontramos coincidencias en el contexto actual.</div>';document.querySelectorAll('[data-search-view]').forEach(b=>b.onclick=()=>{navigate(b.dataset.searchView);m.classList.add('hidden')});};input.oninput=draw;draw();}

async function init(){
 try{
   currentOperator=""; localStorage.removeItem("blunno-operator"); branch="General"; window.__blunnoBranch=branch; connection();
   if(window.__BLUNNO_NEEDS_FRESH_FILE_VAULT_CLEAN__) { await vaultClear(); delete window.__BLUNNO_NEEDS_FRESH_FILE_VAULT_CLEAN__; }
   await Store.sync(); globalWire(); refresh(); window.__BLUNNO_BOOTED__=true; window.__BLUNNO_RUNTIME__={version:"2026.10.06.28",entry:"blunno-control.js",mode:Store.mode};
 }catch(e){
   const box=document.getElementById('bootError'); if(box){box.hidden=false;const out=box.querySelector('[data-boot-message]');if(out)out.textContent=e?.message||String(e);}
 }
}
if(window.__BLUNNO_TEST_MODE__) window.__BLUNNO_TEST__={
  Store, navigate, refresh, setOperator, setBranch,
  setPeriod(value){ if(!/^\d{4}-\d{2}$/.test(value)) throw new Error('Período inválido.'); period=value; Store.setPeriod(value); try{localStorage.setItem(periodContextKey(branch),period)}catch{}; refresh(); },
  context:()=>({view,period,branch,currentOperator}),
  generateAndShowViewPDF, generateExpenseCategoryPDF, generateInvoicePDF, generateClosurePDF, generateProviderHistoryPDF,
  openPeriodModal, openPeriodActionConfirm, confirmPeriodAction, closePeriodConfirm, openCloseConfirm,
  openCloseValidationError, changeCashWeek, changeHoursWeek,
  createBackupZip, readZipEntries, restoreBackupFile,
  openLiquidation, showProviderHistory, analyzeSheet, confirmExcelImport, exportExcel, deleteSalaryVoucher,
  printStoredFile, downloadStoredFile, printClosureVersion, downloadClosureVersion, printCurrentPdf, downloadCurrentPdf, saveHourCell,
  wireProviderPicker, showDashboardDetail,
};

init();

__BLUNNO_MODULES.web = {  };
})();

