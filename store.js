import { CONFIG, uid, isFirebaseConfigured, today, now, nextPeriod, periodLabel, money, number } from "./config.js";
import { remoteList, remoteAdd, remoteUpdate, remoteDelete, remotePurge, remoteAudit, remoteBatchSet, getRemoteMeta, initializeRemoteMeta, listenRemoteCollection, ensureAnonymousAuth, stopRemoteListeners, getFirebaseUid, uploadFile as uploadCloudFile, deleteUploadedFile } from "./firebase.js";

const KEY = "blunno-control-v13-final";
const collections = [
  "periods", "providers", "incomes", "invoices", "cash", "cashConcepts", "expenses", "investments", "employees", "hours",
  "employeeDebts", "liquidations", "estimates", "tasks", "closures", "files", "imports", "audit", "settings"
];
const REMOTE_COLLECTIONS = collections.filter(n => n !== "settings");
const REALTIME_COLLECTIONS = REMOTE_COLLECTIONS.filter(n => n !== "audit");
const OUTBOX_KEY = "blunno-firebase-outbox-v1";
let pendingRemoteOps=[];
let outboxWritePromise=Promise.resolve();
let outboxLoaded=false;
const outboxRead = () => pendingRemoteOps;
const outboxWrite = rows => {
  pendingRemoteOps=(Array.isArray(rows)?rows:[]).map(op=>op._queueId?op:{...op,_queueId:uid()});
  const snapshot=pendingRemoteOps.map(op=>({...op}));
  outboxWritePromise=outboxWritePromise.catch(()=>{}).then(()=>writeOutboxSnapshot(snapshot));
  outboxWritePromise.catch(error=>{try{notifyStorageError(error);}catch{console.error("No se pudo guardar la cola pendiente de Firebase",error);}});
  return outboxWritePromise;
};
const queueRemoteOp = op => { const rows=outboxRead().slice(); rows.push({...op,_queueId:uid(),queuedAt:now()}); return outboxWrite(rows); };
const outboxSize = () => outboxRead().length;
const pendingOpsFor = name => outboxRead().filter(op=>op.collection===name);
const isRemoteCollection = name => REMOTE_COLLECTIONS.includes(name);
const shouldSyncRemoteRow = (name,row) => isRemoteCollection(name) && (name!=="files" || !!row?.url);
const remoteSafeRow = (name,row) => {
  if(!row || (name==="files" && !row.url))return null;
  if(name!=="files")return row;
  const {blob,dataUrl,vaultKey,...safe}=row;
  return safe;
};
const remoteRowsFor = (name,rows) => (Array.isArray(rows)?rows:[]).map(row=>remoteSafeRow(name,row)).filter(Boolean);
const mergeLocalOnlyFiles = remoteRows => {
  const remote=Array.isArray(remoteRows)?remoteRows:[];
  const localById=new Map((state.files||[]).map(file=>[file.id,file]));
  const remoteIds=new Set(remote.map(row=>row.id));
  const queuedIds=new Set(pendingOpsFor("files").map(op=>op.id));
  // Si una ficha remota sustituye la ficha local, conserva el puntero de vault como
  // respaldo mientras exista un binario local recuperable; nunca se pierde por un listener.
  const cloud=remote.filter(file=>!!file.url).map(file=>{
    const local=localById.get(file.id);
    return local?.vaultKey?{...file,vaultKey:local.vaultKey}:file;
  });
  // No descartar fichas creadas localmente mientras Firestore esté sin conexión:
  // permanecen si aún son locales, conservan su binario local o tienen una operación durable pendiente.
  const local=(state.files||[]).filter(file=>!remoteIds.has(file.id)&&(!file.url||!!file.vaultKey||queuedIds.has(file.id)));
  return [...cloud,...local];
};

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
const BUSINESS_DATA_COLLECTIONS = ["incomes","invoices","cash","expenses","investments","employees","hours","employeeDebts","liquidations","estimates","tasks","closures","files","imports","audit"];
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
  data.providers = cleaned.map(p=>({...p,master:true,branchId:null,branch:null,periodId:null,period:null,aliases:Array.isArray(p.aliases)?[...new Set(p.aliases.map(x=>String(x||"").trim()).filter(Boolean))]:[],excludedBranches:Array.isArray(p.excludedBranches)?p.excludedBranches:[]}));
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

let hadExistingLocalState=false;
function load(){
  // Solo lee el estado anterior; la normalización y escritura se hacen después
  // de comprobar si existe una copia íntegra en IndexedDB.
  try {
    const raw=localStorage.getItem(KEY);
    hadExistingLocalState=raw!==null;
    return raw ? {...empty(),...JSON.parse(raw)} : seed();
  } catch(error) {
    console.warn("No se pudo leer el estado local anterior de BLUNNO.",error);
    return seed();
  }
}
let state=load();

const normalizeLegacyState = data => {
  let merged={...empty(),...(data||{})};
  merged=ensureProviderCatalog(merged);
  merged=ensurePeriodCatalog(merged);
  if(!hadExistingLocalState){
    merged=resetLocalForRealStart(merged);
  }else{
    // Si ya había un estado guardado, preservarlo aunque falte el marcador de
    // limpieza histórica. Nunca borrar movimientos/archivos por una migración
    // de almacenamiento o por falta de cuota.
    try{if(localStorage.getItem(CLEAN_START_MARKER)!=="1")localStorage.setItem(CLEAN_START_MARKER,"1");}catch{}
  }
  merged=restoreProviderCatalogOnce(merged);
  if(!merged.periods.length)merged.periods=buildPeriodCatalog();
  if(!Array.isArray(merged.providers))merged.providers=[];
  merged.employees=(merged.employees||[]).filter(e=>!(e.createdBy==='Sistema'&&e.master===true)).map(e=>({...e,branchId:e.branchId||e.branch||null}));
  return merged;
};

// IndexedDB es siempre la base local principal. localStorage se reserva a preferencias pequeñas y a marcadores de migración.
const STATE_DB="blunno-state-v1";
const STATE_STORE="snapshots";
const STATE_RECORD="current";
const STORAGE_MODE_MARKER="blunno-storage-mode-v1";
let useIndexedDBPersistence=true;
let statePersistenceFailed=false;
let pendingStateSnapshot=null;
let pendingStateResolvers=[];
let stateWriteRunning=false;

const openStateDB = () => new Promise((resolve,reject)=>{
  if(typeof indexedDB==="undefined"){reject(new Error("IndexedDB no está disponible en este navegador."));return;}
  const req=indexedDB.open(STATE_DB,2);
  req.onupgradeneeded=()=>{
    if(!req.result.objectStoreNames.contains(STATE_STORE))req.result.createObjectStore(STATE_STORE);
    if(!req.result.objectStoreNames.contains("outbox"))req.result.createObjectStore("outbox");
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error("No se pudo abrir el almacenamiento ampliado."));
  req.onblocked=()=>reject(new Error("El almacenamiento ampliado está bloqueado por otra pestaña de BLUNNO."));
});
const readStateSnapshot = async () => {
  const db=await openStateDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STATE_STORE,"readonly");
    const req=tx.objectStore(STATE_STORE).get(STATE_RECORD);
    req.onsuccess=()=>{const value=req.result||null;db.close();resolve(value);};
    req.onerror=()=>{const err=req.error;db.close();reject(err||new Error("No se pudo leer la copia de BLUNNO."));};
    tx.onabort=()=>{const err=tx.error;db.close();reject(err||new Error("No se pudo leer la copia de BLUNNO."));};
  });
};
const writeOutboxSnapshot = async rows => {
  const db=await openStateDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction("outbox","readwrite"),store=tx.objectStore("outbox");
    store.clear();
    for(const op of (rows||[]))store.put(op,op._queueId||uid());
    tx.oncomplete=()=>{db.close();resolve(true);};
    tx.onerror=()=>{const err=tx.error;db.close();reject(err||new Error("No se pudo conservar la cola de sincronización."));};
    tx.onabort=()=>{const err=tx.error;db.close();reject(err||new Error("Se canceló el guardado de la cola de sincronización."));};
  });
};
const loadOutboxFromPersistence = async () => {
  const db=await openStateDB();
  const durable=await new Promise((resolve,reject)=>{
    const tx=db.transaction("outbox","readonly"),req=tx.objectStore("outbox").getAll();
    req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error||new Error("No se pudo recuperar la cola pendiente."));
    tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();reject(tx.error||new Error("No se pudo recuperar la cola pendiente."));};
  });
  let legacy=[];
  try{const raw=localStorage.getItem(OUTBOX_KEY);if(raw)legacy=JSON.parse(raw)||[];}catch(error){console.warn("No se pudo leer la cola antigua de sincronización.",error);}
  const merged=[],seen=new Set();
  for(const raw of [...durable,...(Array.isArray(legacy)?legacy:[])]){
    const op={...raw,_queueId:raw?._queueId||uid()};
    const signature=JSON.stringify({...op,_queueId:undefined});
    if(!seen.has(signature)){seen.add(signature);merged.push(op);}
  }
  pendingRemoteOps=merged;
  await outboxWrite(merged);
  try{localStorage.removeItem(OUTBOX_KEY);}catch{}
  outboxLoaded=true;
  return true;
};
let storagePersisted=false;
const requestPersistentStorage = async () => {
  try{if(globalThis.navigator?.storage?.persist)storagePersisted=await globalThis.navigator.storage.persist();}catch{storagePersisted=false;}
  return storagePersisted;
};
const storageEstimate = async () => {
  try{if(globalThis.navigator?.storage?.estimate){const e=await globalThis.navigator.storage.estimate();return{usage:Number(e.usage||0),quota:Number(e.quota||0),ratio:e.quota?Number(e.usage||0)/Number(e.quota):0};}}catch{}
  return{usage:0,quota:0,ratio:0};
};
const storagePathFromUrl = value => {
  try{
    const u=new URL(String(value||""));
    const marker="/o/";const at=u.pathname.indexOf(marker);
    if(at<0||!u.hostname.includes("firebasestorage.googleapis.com"))return null;
    return decodeURIComponent(u.pathname.slice(at+marker.length));
  }catch{return null;}
};
const notifyStorageError = error => {
  statePersistenceFailed=true;
  console.error("Error al guardar el estado de BLUNNO:",error);
  try{window.dispatchEvent(new CustomEvent("blunno:storage-error",{detail:{message:error?.message||String(error)}}));}catch{}
};
const writeStateSnapshot = async snapshot => {
  const db=await openStateDB();
  return new Promise((resolve,reject)=>{
    let finished=false;
    const close=()=>{if(!finished){finished=true;db.close();}};
    const tx=db.transaction(STATE_STORE,"readwrite");
    tx.objectStore(STATE_STORE).put({mode:"indexeddb",state:snapshot,savedAt:now()},STATE_RECORD);
    tx.oncomplete=()=>{
      close();
      // La copia nueva ya quedó confirmada: ahora es seguro liberar el objeto
      // grande de localStorage para que no vuelva a bloquear las preferencias.
      try{localStorage.removeItem(KEY);localStorage.setItem(STORAGE_MODE_MARKER,"indexeddb");}catch{}
      resolve(true);
    };
    tx.onerror=()=>{const err=tx.error;close();reject(err||new Error("No se pudo guardar la copia ampliada de BLUNNO."));};
    tx.onabort=()=>{const err=tx.error;close();reject(err||new Error("Se canceló el guardado ampliado de BLUNNO."));};
  });
};
async function drainStateWrites(){
  if(stateWriteRunning)return;
  stateWriteRunning=true;
  try{
    while(pendingStateSnapshot){
      const snapshot=pendingStateSnapshot;
      pendingStateSnapshot=null;
      const resolvers=pendingStateResolvers;
      pendingStateResolvers=[];
      let saved=false;
      try{await writeStateSnapshot(snapshot);saved=true;statePersistenceFailed=false;}
      catch(error){notifyStorageError(error);}
      resolvers.forEach(resolve=>resolve(saved));
    }
  }finally{
    stateWriteRunning=false;
    if(pendingStateSnapshot)void drainStateWrites();
  }
}
const saveStateInIndexedDB = snapshot => new Promise(resolve=>{
  let copy;
  try{copy=JSON.parse(JSON.stringify(snapshot));}
  catch(error){notifyStorageError(error);resolve(false);return;}
  pendingStateSnapshot=copy;
  pendingStateResolvers.push(resolve);
  if(!stateWriteRunning)void drainStateWrites();
});
const persist = () => {
  // La base principal vive siempre en IndexedDB; localStorage queda reservado
  // para preferencias pequeñas y nunca vuelve a recibir el estado completo.
  useIndexedDBPersistence=true;
  return saveStateInIndexedDB(state);
};
const active = name => (state[name] || []).filter(x => !x.deleted);
const purgeExpiredTrash = async () => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let changed = false;
  const expiredFiles=[];
  for (const n of collections) {
    const before = state[n] || [];
    const keep = before.filter(x => {
      if (!x.deleted) return true;
      const rawDate = x.deletedAt?.toDate ? x.deletedAt.toDate() : x.deletedAt;
      const t = new Date(rawDate || 0).getTime();
      if (t && t <= cutoff) {
        changed = true;
        if(n==="files")expiredFiles.push(x);
        const at = now();
        const time = auditTime(at);
        // La auditoría conserva la ficha documental y la trazabilidad, no el Base64 ni los punteros internos del vault.
        const beforeSnapshot=n==="files"?Object.fromEntries(Object.entries(x).filter(([key])=>!['blob','dataUrl','vaultKey'].includes(key))):x;
        state.audit.unshift({ id: uid(), action:"AUTO_PURGE", collection:n, recordId:x.id, before:beforeSnapshot, after:null, responsible:"Sistema", actor:"Sistema", at, date:time.date, hour:time.hour, minute:time.minute, sector:sectorForCollection(n), branch:x.branch ?? null, period:x.period ?? null, reason:"Purga automática de papelera después de 30 días" });
        return false;
      }
      return true;
    });
    state[n] = keep;
  }
  if(changed){
    const saved=await persist();
    if(!saved)throw new Error("No se pudo guardar la purga de papelera; los archivos no se eliminaron del almacenamiento.");
    // Recién después de confirmar la ficha eliminada se limpia su binario local/remoto.
    await Promise.all(expiredFiles.map(async file=>{
      if(file.vaultKey)await vaultDelete(file.vaultKey);
      if((file.storageProvider==="firebase-storage"||storagePathFromUrl(file.url))&&file.storagePath)await deleteUploadedFile(file.storagePath);
    }));
  }
  return changed;
};
const storageReady = (async()=>{
  let snapshot=null;
  let readError=null;
  try{snapshot=await readStateSnapshot();}catch(error){readError=error;}
  let modeMarker="";
  try{modeMarker=localStorage.getItem(STORAGE_MODE_MARKER)||"";}catch{}
  if(snapshot?.mode==="indexeddb"){
    const complete=!!snapshot.state&&typeof snapshot.state==="object"&&collections.every(name=>Array.isArray(snapshot.state[name]));
    if(!complete)throw new Error("BLUNNO encontró una copia ampliada incompleta. No se inició una base vacía para proteger tus datos. Conservá los datos del navegador y contactá soporte.");
    state={...snapshot.state};
    useIndexedDBPersistence=true;
    try{localStorage.removeItem(KEY);localStorage.setItem(STORAGE_MODE_MARKER,"indexeddb");}catch{}
  }else if(modeMarker==="indexeddb"){
    throw new Error("BLUNNO detectó que los datos están en el almacenamiento ampliado, pero el navegador no pudo leerlos. No se inició una base vacía para proteger tus datos. Cerrá otras pestañas de BLUNNO y volvé a abrir la web. Detalle: "+(readError?.message||"no se encontró la copia guardada."));
  }else{
    state=normalizeLegacyState(state);
    const saved=await persist();
    if(!saved)throw new Error("BLUNNO no pudo guardar tus datos ni en el almacenamiento habitual ni en el ampliado. No cierres esta pestaña sin exportar un backup y revisá el espacio disponible del navegador.");
  }
  await loadOutboxFromPersistence();
  await requestPersistentStorage();
  await purgeExpiredTrash();
  return true;
})();
const storageReadySafe=storageReady.catch(error=>{console.error("Inicialización segura del almacenamiento BLUNNO",error);throw error;});
setInterval(()=>{storageReadySafe.then(()=>purgeExpiredTrash()).catch(()=>{});},60*60*1000);

const VAULT_DB = "blunno-file-vault-v1";
const openVault = () => new Promise((resolve,reject)=>{ const req=indexedDB.open(VAULT_DB,1); req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains("blobs")) req.result.createObjectStore("blobs"); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
const vaultPut = async (key,blob) => { const db=await openVault(); return new Promise((resolve,reject)=>{ const tx=db.transaction("blobs","readwrite"); tx.objectStore("blobs").put(blob,key); tx.oncomplete=()=>{db.close();resolve()}; tx.onerror=()=>{db.close();reject(tx.error)}; }); };
const vaultGet = async key => { const db=await openVault(); return new Promise((resolve,reject)=>{ const tx=db.transaction("blobs","readonly"); const req=tx.objectStore("blobs").get(key); req.onsuccess=()=>{db.close();resolve(req.result||null)}; req.onerror=()=>{db.close();reject(req.error)}; }); };
const vaultDelete = async key => { try{const db=await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction("blobs","readwrite");tx.objectStore("blobs").delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}catch{} };
const vaultClear = async () => { try{const db=await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction("blobs","readwrite");const req=tx.objectStore("blobs").clear();req.onerror=()=>{db.close();reject(req.error)};tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}catch{} };
async function migrateLegacyEmbeddedFiles(){
  let changed=false;const migratedIds=new Set();
  for(const file of (state.files||[])){
    if(!file?.dataUrl || file.url || file.vaultKey)continue;
    try{
      const response=await fetch(file.dataUrl);if(!response.ok)continue;
      const blob=await response.blob();await vaultPut(file.id,blob);
      state.files=state.files.map(row=>row.id===file.id?({...row,vaultKey:file.id,dataUrl:undefined}):row);
      migratedIds.add(file.id);changed=true;
    }catch(error){console.warn("Se conserva el documento Base64 legado porque no se pudo migrar aún.",file.id,error);}
  }
  if(migratedIds.size){
    state.audit=(state.audit||[]).map(entry=>{
      if(entry.collection!=="files"||!migratedIds.has(entry.recordId))return entry;
      const cleanFile=value=>{if(!value||typeof value!=="object")return value;const copy={...value};delete copy.dataUrl;delete copy.blob;return copy;};
      return {...entry,before:cleanFile(entry.before),after:cleanFile(entry.after)};
    });
  }
  if(changed){const saved=await persist();if(!saved)throw new Error("No se pudo confirmar la compactación segura de documentos antiguos.");}
  return {migrated:migratedIds.size,remaining:(state.files||[]).filter(file=>!!file.dataUrl).length};
}

let cloudFilePromotionRunning=false;
let cloudFilePromotionMoved=0;
const announceStorageHealth=()=>{try{window.dispatchEvent(new CustomEvent("blunno:storage-health"));}catch{}};
async function promoteLocalFilesToCloud(){
  if(!isFirebaseConfigured()||cloudFilePromotionRunning)return {moved:0,skipped:true};
  cloudFilePromotionRunning=true;announceStorageHealth();
  let moved=0;
  try{
    const candidates=(state.files||[]).filter(file=>!file.deleted&&!file.url&&!!file.vaultKey);
    for(const candidate of candidates){
      const file=(state.files||[]).find(row=>row.id===candidate.id);
      if(!file||file.deleted||file.url||!file.vaultKey)continue;
      const blob=await vaultGet(file.vaultKey);
      if(!blob)continue;
      const url=await uploadCloudFile(file.storagePath||`blunno/${file.id}/${file.name||"documento.bin"}`,blob,file.mime||blob.type||"application/octet-stream");
      // Cloud Storage puede no estar habilitado o las reglas pueden denegar la carga.
      // En ese caso se interrumpe el intento y se conserva el binario local sin borrarlo.
      if(!url)break;
      const cloudPath=storagePathFromUrl(url)||file.storagePath;
      const cloudRow={...file,url,storagePath:cloudPath,storageProvider:"firebase-storage"};
      state.files=state.files.map(row=>row.id===file.id?cloudRow:row);
      if(!await persist()){
        state.files=state.files.map(row=>row.id===file.id?file:row);
        break;
      }
      let metadataDurable=false;
      try{await remoteAdd("files",remoteSafeRow("files",cloudRow),file.id);metadataDurable=true;}
      catch(error){
        try{await queueRemoteOp({kind:"add",collection:"files",id:file.id,data:remoteSafeRow("files",cloudRow)});metadataDurable=true;}
        catch(queueError){console.warn("No se pudo asegurar la ficha remota; se conserva la copia local del documento.",queueError);}
      }
      if(!metadataDurable){
        // Mantiene la clave del binario local aunque el objeto ya se haya subido: la ficha no debe quedar huérfana.
        state.files=state.files.map(row=>row.id===file.id?{...cloudRow,vaultKey:file.vaultKey}:row);
        await persist();
        break;
      }
      const compact={...cloudRow};delete compact.vaultKey;delete compact.dataUrl;
      state.files=state.files.map(row=>row.id===file.id?compact:row);
      if(await persist()){
        await vaultDelete(file.vaultKey);
        moved++;cloudFilePromotionMoved=moved;
      }else{
        state.files=state.files.map(row=>row.id===file.id?{...cloudRow,vaultKey:file.vaultKey}:row);
        break;
      }
      announceStorageHealth();
    }
    return {moved};
  }finally{cloudFilePromotionRunning=false;announceStorageHealth();}
}

const actor = () => window.__blunnoResponsible || "Usuario local";
const periodRecord = p => state.periods.find(x => x.id === p) || null;
const periodIsFuture = p => String(p) > currentCalendarPeriod();
const periodIsStarted = (p, branch="General") => {
  if (!periodIsFuture(p)) return true;
  const row=periodRecord(p);
  return Array.isArray(row?.startedBranches) && row.startedBranches.includes(branch);
};
const hasActualClosure = (p, branch="General") => state.closures.some(x => x.period === p && x.branch === branch && x.status === "closed");
// Períodos anteriores al inicio del sistema siguen protegidos contra movimientos
// ordinarios, pero eso no significa que tengan un cierre formal ya generado.
const periodIsClosed = (p, branch="General") => String(p) < CONTROL_START_PERIOD || hasActualClosure(p,branch);
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

const movementCollections = new Set(["incomes","invoices","cash","expenses","investments","hours","employeeDebts","liquidations","estimates","closures"]);
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

const providerAliases = provider => Array.isArray(provider?.aliases) ? [...new Set(provider.aliases.map(x=>String(x||"").trim()).filter(Boolean).filter(x=>sourceIdentity(x)!==sourceIdentity(provider?.name)))] : [];
const findProviderByName = providerName => {
  const key=sourceIdentity(providerName);
  if(!key)return null;
  const providers=active("providers");
  const exact=providers.filter(x=>sourceIdentity(x.name)===key);
  if(exact.length===1)return exact[0];
  if(exact.length>1)return null;
  const aliases=providers.filter(x=>providerAliases(x).some(a=>sourceIdentity(a)===key));
  return aliases.length===1?aliases[0]:null;
};
const providerForInvoice = invoice => {
  if(!invoice)return null;
  const providers=active("providers");
  if(invoice.providerId){const byId=providers.find(x=>x.id===invoice.providerId);if(byId)return byId;}
  return findProviderByName(invoice.provider);
};
const ensureProviderExists = (providerName, providerId = null) => {
  const providers=active("providers");
  const byId=providerId?providers.find(x=>x.id===providerId):null;
  if(byId)return byId;
  const key=sourceIdentity(providerName);
  if (!key) throw new Error("La factura necesita un proveedor.");
  const exact=providers.filter(x=>sourceIdentity(x.name)===key);
  if(exact.length===1)return exact[0];
  if(exact.length>1)throw new Error("Hay más de un proveedor con ese nombre. Revisá el maestro de Proveedores.");
  const aliases=providers.filter(x=>providerAliases(x).some(a=>sourceIdentity(a)===key));
  if(aliases.length===1)return aliases[0];
  if(aliases.length>1)throw new Error("El nombre anterior coincide con más de un proveedor. Revisá el maestro antes de editar esta factura.");
  throw new Error("El proveedor no existe en el maestro. Crealo primero desde Proveedores.");
};
const auditTime = value => {
  const d = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d).filter(x=>x.type!=="literal");
  const map = Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {date:`${map.year}-${map.month}-${map.day}`,hour:map.hour,minute:map.minute};
};
const sectorForCollection = collection => ({incomes:"Ingresos",estimates:"Valores estimados",invoices:"Facturas",cash:"Caja",cashConcepts:"Caja",expenses:"Gastos",investments:"Inversiones",employees:"Personal",hours:"Horas",employeeDebts:"Personal",liquidations:"Liquidaciones",tasks:"Recordatorios",closures:"Cierre mensual",providers:"Proveedores",files:"Archivos",audit:"Auditoría",settings:"Configuración",imports:"Importación"}[collection] || collection);
const validateRecord = (collection, data, editingId = null) => {
  const row = data || {};
  if (movementCollections.has(collection) && row.period && !isValidPeriod(row.period)) throw new Error("El período no es válido.");
  for (const k of ["date","operationDate"]) if (row[k] && !validDate(String(row[k]).slice(0,10))) throw new Error(`La fecha de ${k === "operationDate" ? "la factura" : "movimiento"} no es válida.`);
  if (["incomes","invoices","cash","expenses","investments","hours","employeeDebts","liquidations","estimates"].includes(collection) && !validBranch(row.branch)) throw new Error("Seleccioná una sucursal concreta. General es solo una vista consolidada.");
  if (collection === "providers") {
    const name = sourceIdentity(row.name); if (!name) throw new Error("Ingresá el nombre del proveedor.");
    const duplicate = active("providers").find(x => x.id !== editingId && (sourceIdentity(x.name) === name || providerAliases(x).some(alias=>sourceIdentity(alias)===name)));
    if (duplicate) throw new Error(`El proveedor ${duplicate.name} ya existe o conserva ese nombre como alias histórico. No se creó un duplicado.`);
  }
  if (collection === "invoices") {
    if (!row.provider && !row.providerId) throw new Error("La factura necesita un proveedor.");
    const invoiceProvider=ensureProviderExists(row.provider,row.providerId);
    row.providerId=invoiceProvider.id;
    row.provider=invoiceProvider.name;
    if (!row.operationDate || !validDate(String(row.operationDate).slice(0,10))) throw new Error("Ingresá una fecha válida para la factura.");
    if (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0) throw new Error("Ingresá un importe válido para la factura.");
    row.status = "CARGADA";
    row.period = String(row.period || row.operationDate).slice(0,7);
  }
  const dateBearing = new Set(["invoices","incomes","cash","expenses","investments","hours","estimates"]);
  if(dateBearing.has(collection) && row.period){
    const movementDate=String(row.operationDate || row.date || "").slice(0,10);
    if(movementDate && movementDate.slice(0,7)!==String(row.period)){
      throw new Error(`Fecha fuera de período: ${movementDate} no pertenece a ${periodLabel(row.period)}. La operación fue bloqueada para evitar mezclar meses.`);
    }
  }
  if (["incomes","expenses","investments"].includes(collection) && (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0)) throw new Error("Ingresá un importe válido.");
  if (collection === "estimates") {
    if (!isValidPeriod(row.period)) throw new Error("El período del valor estimado no es válido.");
    if (!validBranch(row.branch)) throw new Error("Elegí una sucursal concreta para el valor estimado.");
    if (!(["income","salary"].includes(String(row.sector||"")))) throw new Error("El sector estimado debe ser Ingresos o Personal.");
    if (!row.date || !validDate(String(row.date).slice(0,10))) throw new Error("Elegí una fecha válida para el valor estimado.");
    if (String(row.date).slice(0,7)!==String(row.period)) throw new Error("La fecha del valor estimado tiene que pertenecer al mes seleccionado.");
    if (!Number.isFinite(Number(row.amount)) || Number(row.amount)<0) throw new Error("Ingresá un importe estimado válido, igual o mayor que cero.");
    if (!String(row.concept||"").trim()) throw new Error("Ingresá un concepto o motivo para el valor estimado.");
  }
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
  state.audit.unshift(row); const saved=await persist(); if(!saved)throw new Error("No se pudo confirmar el guardado local. No sigas cargando movimientos hasta que se restablezca el almacenamiento.");
  if (isFirebaseConfigured()) { try { await remoteAudit(row); } catch(e) { await queueRemoteOp({kind:"audit",collection:"audit",id:row.id,data:row}); console.warn("Firebase audit pendiente",e); } }
  return row;
}
async function syncRemote(){
  if(!isFirebaseConfigured())return;
  await ensureAnonymousAuth();
  const meta=await getRemoteMeta();
  if(!meta){
    const rows=[];
    for(const name of REMOTE_COLLECTIONS)for(const row of remoteRowsFor(name,state[name]||[]))rows.push({name,id:row.id,data:row});
    if(rows.length)await remoteBatchSet(rows);
    await initializeRemoteMeta({schemaVersion:4,app:"BLUNNO",initializedAt:now(),initializedBy:getFirebaseUid(),mode:"anonymous-shared",files:"cloud-when-available-local-fallback"});
  }else{
    await Promise.all(REMOTE_COLLECTIONS.map(async name=>{try{const rows=await remoteList(name);state[name]=name==="files"?mergeLocalOnlyFiles(rows):rows}catch(e){console.warn("Firebase sync",name,e)}}));
  }
  if(!state.periods.length)state.periods=seed().periods;
  state=ensurePeriodCatalog(state);
  state=ensureProviderCatalog(state);
  const stored=await persist();
  if(!stored)throw new Error("No se pudo guardar localmente la sincronización de Firebase.");
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
  if(!isFirebaseConfigured())return;
  await outboxWritePromise;
  if(!outboxSize())return;
  const pending=outboxRead().slice(),keep=[];
  for(const op of pending){
    try{
      if(op.kind==='add')await remoteAdd(op.collection,op.data,op.id);
      else if(op.kind==='update')await remoteUpdate(op.collection,op.id,op.data);
      else if(op.kind==='delete')await remoteDelete(op.collection,op.id);
      else if(op.kind==='purge')await remotePurge(op.collection,op.id);
      else if(op.kind==='audit')await remoteAudit(op.data);
    }catch{keep.push(op)}
  }
  await outboxWrite(keep);
}
async function subscribeRealtime(){
  if(!isFirebaseConfigured())return;
  stopRemoteListeners(); await ensureAnonymousAuth();
  for(const name of REALTIME_COLLECTIONS){
    await listenRemoteCollection(name,rows=>{
      let next=applyPendingOps(name,rows);
      if(name === "files") next=mergeLocalOnlyFiles(next);
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
  get ready() { return storageReadySafe; },
  get storageMode() { return "indexeddb"; },
  get storageFallbackActivatedThisSession() { return false; },
  get storagePersistenceFailed() { return statePersistenceFailed; },
  async storageHealth() {
    const e=await storageEstimate();
    return {mode:"IndexedDB",persistent:storagePersisted,usage:e.usage,quota:e.quota,ratio:e.ratio,pendingSync:outboxSize(),firebase:isFirebaseConfigured(),filePromotionRunning:cloudFilePromotionRunning,cloudFiles:(state.files||[]).filter(file=>!!file.url).length,localOnlyFiles:(state.files||[]).filter(file=>!file.url).length,localFallbackFiles:(state.files||[]).filter(file=>!!file.url&&!!file.vaultKey).length,legacyEmbeddedFiles:(state.files||[]).filter(file=>!!file.dataUrl).length};
  },
  get db() { return state; },
  list(name, period = null, branch = null) {
    let rows = active(name);
    if (period && ["incomes", "cash", "cashConcepts", "hours", "invoices", "expenses", "investments", "employeeDebts", "liquidations", "estimates", "tasks", "closures"].includes(name)) rows = rows.filter(x => x.period === period);
    if (name === "cashConcepts") rows = rows.filter(x => x.active !== false);
    if (branch && branch !== "General") rows = rows.filter(x => branchMatches(x, branch));
    return rows;
  },
  trash(name = null) {
    void purgeExpiredTrash().catch(error=>notifyStorageError(error));
    const names = name ? [name] : collections;
    return names.flatMap(n => (state[n] || []).filter(x => x.deleted).map(x => ({ ...x, _collection: n })));
  },
  async purgeTrashItem(name, id, responsible, reason = "Eliminación definitiva") {
    assertResponsible(responsible);
    const old = this.getRaw(name, id);
    if (!old || !old.deleted) throw new Error("El registro no se encuentra en la papelera.");
    state[name] = state[name].filter(x => x.id !== id);
    const saved=await persist();
    if(!saved)throw new Error("No se pudo confirmar la eliminación definitiva local; los archivos no se eliminaron del almacenamiento.");
    if(name === "files" && old.vaultKey) await vaultDelete(old.vaultKey);
    if(name === "files" && (old.storageProvider==="firebase-storage"||storagePathFromUrl(old.url)) && old.storagePath) await deleteUploadedFile(old.storagePath);
    if (isRemoteCollection(name) && isFirebaseConfigured() && (name!=="files" || !!old.url)) { try { await remotePurge(name,id); } catch(e) { await queueRemoteOp({kind:"purge",collection:name,id}); } }
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
  resolveProvider(providerName, providerId = null) { return ensureProviderExists(providerName, providerId); },
  providerForInvoice(invoice) { return providerForInvoice(invoice); },
  invoiceProviderName(invoice) { return providerForInvoice(invoice)?.name || String(invoice?.provider || ""); },
  invoiceMatchesProvider(invoice, providerOrName) {
    const provider = providerOrName && typeof providerOrName === "object" ? providerOrName : findProviderByName(providerOrName);
    if(!provider)return sourceIdentity(invoice?.provider)===sourceIdentity(providerOrName);
    if(invoice?.providerId && invoice.providerId===provider.id)return true;
    return providerForInvoice(invoice)?.id===provider.id;
  },
  periodIsClosed,
  hasClosure: hasActualClosure,
  latestClosure(p, b="General") { return state.closures.filter(x=>x.period===p&&x.branch===b&&x.status==="closed").sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0]||null; },
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
      catch(e) { await queueRemoteOp({kind:"update",collection:"cashConcepts",id,data:row}); }
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
    // Al quitar un concepto, poner en cero los importes que estaban guardados
    // con ese concepto en el mismo período, sucursal y tipo. Se conserva el
    // movimiento y su valor anterior en auditoría para que no reaparezca un monto.
    const linkedMovements = this.list("cash", period, branch).filter(x =>
      x.type === cleanType && sourceIdentity(x.concept || (cleanType === "payment" ? "Pagos" : "Sin concepto")) === sourceIdentity(cleanName)
    );
    for (const movement of linkedMovements) {
      await this.update("cash", movement.id, {
        amount: 0,
        cashConceptRemoved: true,
        cashConceptRemovedAt: timestamp,
        cashConceptRemovedBy: responsible,
        amountBeforeConceptRemoval: Number(movement.amount || 0)
      }, responsible, `Importe puesto en cero por eliminación del concepto ${cleanName}`, {
        lateMovement: periodIsClosed(period, branch), skipClosureVersion: true
      });
    }
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
      catch(e) { await queueRemoteOp({kind:"update",collection:"cashConcepts",id,data:remotePatch}); }
      const latest = state.cashConcepts || [];
      state.cashConcepts = latest.map(x => x.id === id ? row : x);
      persist();
    }
    await audit("CASH_CONCEPT_REMOVE", "cashConcepts", id, old, row, responsible, "Concepto retirado; los importes asociados se pusieron en cero y el valor previo queda auditado", {branch,period,sector:"Caja"});
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
      payload.aliases = providerAliases(payload);
    }
    validateRecord(name, payload);
    if(!["files","audit","closures","settings"].includes(name)) assertOpen(payload, options.lateMovement, options);
    if (name === "hours") payload.period = payload.period || String(payload.date).slice(0,7);
    const id = uid();
    const row = decorate(payload, responsible, name === "tasks" ? (payload.status || "pending") : "active", id);
    if (!state[name]) state[name] = [];
    const wasClosed = !!(payload?.period && periodIsClosed(payload.period, payload.branch || "General"));
    state[name].unshift(row); persist();
    if (shouldSyncRemoteRow(name,row) && isFirebaseConfigured()) { try { await remoteAdd(name,remoteSafeRow(name,row),id); } catch(e) { await queueRemoteOp({kind:"add",collection:name,id,data:row}); } }
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
      const aliases=new Set(providerAliases(old));
      if(sourceIdentity(old.name)!==sourceIdentity(row.name) && String(old.name||"").trim()) aliases.add(String(old.name).trim());
      row.aliases=[...aliases].filter(alias=>sourceIdentity(alias)!==sourceIdentity(row.name));
    }
    validateRecord(name, row, id);
    const wasClosed = !!(old.period && periodIsClosed(old.period, old.branch || "General"));
    if(!["files","audit","closures","settings"].includes(name)) assertOpen(old, options.lateMovement, options);
    state[name] = state[name].map(x => x.id === id ? row : x); persist();
    if (shouldSyncRemoteRow(name,row) && isFirebaseConfigured()) {
      const remotePatch = name === "providers"
        ? {name:row.name, aliases:row.aliases||[], active:row.active!==false, master:true, branchId:null, branch:null, periodId:null, period:null, excludedBranches:row.excludedBranches}
        : (patch || {});
      try { await remoteUpdate(name,id,remotePatch); } catch(e) { await queueRemoteOp({kind:"update",collection:name,id,data:remotePatch}); }
    }
    await audit(options.lateMovement ? "UPDATE_LATE" : "UPDATE", name, id, old, row, responsible, reason, { lateMovement: !!options.lateMovement });
    if (options.lateMovement && wasClosed && row.period && !options.skipClosureVersion) await this.createClosureVersion(row.period, row.branch || "General", responsible, `Actualización por corrección posterior en ${name}.`);
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
    if (shouldSyncRemoteRow(name,row) && isFirebaseConfigured()) { try { await remoteDelete(name,id); } catch(e) { await queueRemoteOp({kind:"delete",collection:name,id}); } }
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
    if (shouldSyncRemoteRow(name,row) && isFirebaseConfigured()) { try { await remoteUpdate(name,id,{deleted:false,status:row.status,restoredAt:row.restoredAt}); } catch(e) { await queueRemoteOp({kind:"update",collection:name,id,data:{deleted:false,status:row.status,restoredAt:row.restoredAt}}); } }
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
    if(isFirebaseConfigured()) { try { await remoteUpdate("closures",previous.id,{status:"superseded",supersededAt:updated.closedAt,supersededBy:responsible}); await remoteAdd("closures",updated,updated.id); } catch(e) { await queueRemoteOp({kind:"update",collection:"closures",id:previous.id,data:{status:"superseded",supersededAt:updated.closedAt,supersededBy:responsible}}); await queueRemoteOp({kind:"add",collection:"closures",id:updated.id,data:updated}); } }
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
    if(isFirebaseConfigured()) { try { await remoteUpdate("providers",id,{excludedBranches:row.excludedBranches,updatedAt:row.updatedAt}); } catch(e) { await queueRemoteOp({kind:"update",collection:"providers",id,data:{excludedBranches:row.excludedBranches,updatedAt:row.updatedAt}}); } }
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
    const estimates=this.list("estimates",period,branch);
    const incomeEstimates=estimates.filter(x=>x.sector==="income");
    const salaryEstimates=estimates.filter(x=>x.sector==="salary");
    const realIncomeRows=this.list("incomes",period,branch);
    const incomeCovered=realIncomeRows.length>0||incomeEstimates.length>0;
    const salaryEstimateCoversMissing=salaryEstimates.length>0;
    const closed=this.hasClosure(period,branch);
    const checklist=[
      ['Ingresos',incomeCovered,`${realIncomeRows.length} ingreso(s) real(es) · ${incomeEstimates.length} estimación(es) · total considerado ${money(s.income)}${incomeCovered?'':' · cargá un valor estimado desde Inicio para cerrar sin rehacer Caja Diaria'}`,'dashboard'],
      ['Proveedores / facturas',true,`${s.invoiceCount} facturas registradas${missingInvoice.length?` · ${missingInvoice.length} con datos incompletos para revisar`:''} · sin control de pago`,'invoices'],
      ['Gastos del local',missingExpense.length===0,`${s.expenseCount} gastos · ${missingExpense.length?missingExpense.length+' requieren revisión':'controlados'}`,'expenses'],
      ['Inversiones',missingInvestment.length===0,`${s.investmentCount} inversiones · ${missingInvestment.length?missingInvestment.length+' requieren revisión':'controladas'}`,'investments'],
      ['Horas',noHours.length===0||salaryEstimateCoversMissing,`${number(s.hours)} horas · ${noHours.length?(salaryEstimateCoversMissing?`Faltan horas de ${noHours.map(e=>e.name).join(', ')}; cubierto por estimación de Personal (${money(s.salaryEstimated)})`:`Faltan horas para: ${noHours.map(e=>e.name).join(', ')} · podés usar Agregar valor estimado en Personal`):'carga registrada'}`,'hours'],
      ['Liquidaciones',noLiquidation.length===0||salaryEstimateCoversMissing,`${s.liquidationCount} liquidaciones vigentes · ${noLiquidation.length?(salaryEstimateCoversMissing?`Pendientes cubiertas por estimación de Personal (${money(s.salaryEstimated)})`:`Falta liquidar: ${noLiquidation.map(e=>e.name).join(', ')} · podés usar Agregar valor estimado en Personal`):'sin pendientes'}`,'hours'],
      ['Facturas cargadas después del período',true,late.length?`${late.length} factura(s) cargada(s) posteriormente · revisar trazabilidad si corresponde`:'No se detectaron cargas posteriores','invoices'],
      ['Cierre formal del período',true,closed?'Ya existe un cierre formal vigente':'Todavía no existe un cierre formal; se puede cerrar aunque el período sea histórico','close']
    ];
    return {checklist,blockers:checklist.filter(x=>!x[1]).map(x=>`${x[0]}: ${x[2]}`)};
  },
  async closePeriod(period, next, responsible, summary, observations = "", checklist = []) {
    assertResponsible(responsible);
    const closeBranch = summary?.branch || "General";
    if (closeBranch === "General") throw new Error("El cierre mensual se realiza por sucursal. General es una vista consolidada y no se puede cerrar.");
    if (!CONFIG.branches.includes(closeBranch)) throw new Error("Perfil de sucursal inválido para el cierre.");
    if (this.hasClosure(period, closeBranch)) throw new Error("El período ya tiene un cierre formal para este perfil. Usá la corrección autorizada para generar una nueva versión.");
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
    if (isFirebaseConfigured()) { try { await remoteAdd("closures",closure,closure.id); } catch(e) { await queueRemoteOp({kind:"add",collection:"closures",id:closure.id,data:closure}); } }
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
    if(isFirebaseConfigured()) { try { await remoteUpdate("closures",closure.id,row); } catch(e) { await queueRemoteOp({kind:"update",collection:"closures",id:closure.id,data:row}); } }
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
    const estimates = filter(active("estimates").filter(x=>x.period===period));
    const incomeEstimateRows=estimates.filter(x=>x.sector==="income");
    const salaryEstimateRows=estimates.filter(x=>x.sector==="salary");
    const incomeEstimated=incomeEstimateRows.reduce((s,x)=>s+Number(x.amount||0),0);
    const salaryEstimated=salaryEstimateRows.reduce((s,x)=>s+Number(x.amount||0),0);
    const incomeReal=incomes.reduce((s,x)=>s+Number(x.amount||0),0);
    const income=incomeReal+incomeEstimated;
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
    const salaryReal = salary;
    const salaryTotal = salaryReal+salaryEstimated;
    const totalExpenses = localExpense + providers + investment + salaryTotal;
    const result = income-totalExpenses;
    const cashOpening = Number(state.settings.find(x=>x.id===`cash-opening-${period}-${branch}`)?.amount||0);
    const cashExpected = cash.reduce((s,x)=>s+Number(x.expected||0),0);
    const cashFinal = cashOpening + cashIncome - cashExpense - cashPayment;
    const cashControl = cashExpected - cashFinal;
    return {period,branch,income,incomeReal,incomeEstimated,incomeEstimateCount:incomeEstimateRows.length,cashExpense,cashPayment,cashIncome,cashOpening,localExpense,investment,providers,salary:salaryTotal,salaryReal,salaryEstimated,salaryEstimateCount:salaryEstimateRows.length,estimateCount:estimates.length,totalExpenses,result,cashCount:cash.length,invoiceCount:invoices.length,expenseCount:expenses.length,investmentCount:investments.length,hours:hours.reduce((s,x)=>s+Number(x.hours||0),0),cashExpected,cashFinal,cashControl,liquidationCount:latest.length};
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
      // Si el controlador no lo subió previamente, intentamos Cloud Storage.
      // Si no está habilitado, queda en IndexedDB local sin convertirlo a Base64.
      if(!row.url){
        try{row.url=await uploadCloudFile(row.storagePath,file.blob,row.mime||file.blob.type||"application/octet-stream");}catch(error){console.warn("Subida opcional a Cloud Storage",error);}
      }
      const uploadedPath=storagePathFromUrl(row.url);
      if(uploadedPath){row.storagePath=uploadedPath;row.storageProvider="firebase-storage";}
      if(!row.url){
        try{await vaultPut(row.id,file.blob);row.vaultKey=row.id;}
        catch(error){throw new Error("No se pudo archivar el documento en la nube ni en el almacenamiento local ampliado. Descargá el documento generado y liberá espacio o habilitá Cloud Storage antes de volver a archivarlo.");}
      }else{
        delete row.vaultKey;delete row.dataUrl;
      }
      delete row.blob;
    }
    state.files.unshift(row);
    const savedAfterInsert=await persist();
    if(!savedAfterInsert)throw new Error("El documento fue generado, pero no se confirmó la ficha en el almacenamiento. No cierres la pestaña; descargá el archivo y exportá un backup.");
    if(row.url&&isFirebaseConfigured()){
      const remoteRow=remoteSafeRow("files",row);
      try{await remoteAdd("files",remoteRow,row.id);}catch(error){await queueRemoteOp({kind:"add",collection:"files",id:row.id,data:remoteRow});}
    }
    // El binario remoto se comparte por URL; si no hay bucket habilitado, solo su ficha y binario local se conservan en este navegador.
    await audit("FILE_ARCHIVED","files",row.id,null,row,responsible,"Documento archivado en Archivos",{
      sector: row.sector || "Documento",
      period: row.period || "",
      branch: row.branch || "General"
    });
    return row;
  },
  async getFileBlob(id) {
    const row=this.getRaw("files",id); if(!row) return null;
    if(row.url){ try{ const res=await fetch(row.url); if(res.ok) return res.blob(); }catch(e){ console.warn("Storage recovery",e); } }
    if(row.vaultKey){ const local=await vaultGet(row.vaultKey); if(local) return local; }
    if(row.dataUrl){ try{ const res=await fetch(row.dataUrl); if(res.ok) return res.blob(); }catch(e){ console.warn("Data URL recovery",e); } }
    return null;
  },
  async restoreFileBlob(id, blob, responsible, options = {}) {
    assertResponsible(responsible);
    if(!(blob instanceof Blob)) throw new Error("El archivo del backup no es válido.");
    const row=this.getRaw("files",id); if(!row) throw new Error("No se encontró la ficha documental del archivo.");
    // Si la URL remota responde, no hace falta duplicar el binario en el navegador.
    // Si no responde (backup movido, token vencido, Storage temporalmente fuera de línea),
    // guardamos el binario del ZIP en el vault local antes de confirmar la ficha.
    let remoteUsable=false;
    if(row.url){try{const response=await fetch(row.url,{method:"GET"});remoteUsable=response.ok;if(remoteUsable)await response.body?.cancel?.();}catch{remoteUsable=false;}}
    let localVaultKey=row.vaultKey;
    if(!remoteUsable){await vaultPut(id,blob);localVaultKey=id;}
    const keepDeleted=!!options.preserveDeleted&&!!row.deleted;
    const next={...row,vaultKey:localVaultKey,deleted:keepDeleted,status:keepDeleted?row.status:(row.status==='deleted'?'active':row.status),updatedAt:now(),responsible};
    state.files=state.files.map(x=>x.id===id?next:x);
    const saved=await persist();if(!saved){state.files=state.files.map(x=>x.id===id?row:x);throw new Error("El documento se extrajo, pero BLUNNO no pudo confirmar su ficha. No elimines el ZIP de respaldo.");}
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
  async sync() { await storageReadySafe; await migrateLegacyEmbeddedFiles(); try { await syncRemote(); await subscribeRealtime(); } catch(e) { console.warn("Firebase no disponible; BLUNNO continúa en local y reintentará la sincronización.",e); } void promoteLocalFilesToCloud().catch(error=>console.warn("No se pudo completar la migración opcional de documentos a la nube; se conservan localmente.",error)); },
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
    const saved=await persist();
    if(!saved){state=before;throw new Error("No se pudo confirmar la restauración local. Conservá el backup original y no cierres esta pestaña hasta verificar los datos.");}
    if(isFirebaseConfigured()) { const rows=[]; for(const name of REMOTE_COLLECTIONS) for(const row of remoteRowsFor(name,state[name]||[])) rows.push({name,id:row.id,data:row}); try { await remoteBatchSet(rows); } catch(e) { for(const r of rows) await queueRemoteOp({kind:"add",collection:r.name,id:r.id,data:r.data}); } }
    await audit("IMPORT_STATE","system","backup",before,after,responsible,"Restauración de backup");
  }
};



export { Store, CONTROL_START_PERIOD, periodIsFuture, periodIsStarted, periodStateLabel, isValidPeriod, assertResponsible, periodEditConfirmed, setPeriodEditConfirmed, sourceIdentity, providerAvailableInBranch, vaultClear, sectorForCollection };
