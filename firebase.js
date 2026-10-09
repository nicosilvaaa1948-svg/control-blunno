import { CONFIG, isFirebaseConfigured } from "./config.js";

let auth=null;
let db=null;
let initialized=false;
let initPromise=null;
let authReadyPromise=null;
let unsubscribeFns=[];

export let firebaseAuth=null;
export let firebaseDb=null;
export let firebaseStorage=null;
export const firebaseEnabled=isFirebaseConfigured();
export const REMOTE_META_COLLECTION="_blunno_meta";
export const REMOTE_META_ID="app";

const SDK_VERSION="12.19.0";
const SDK_BASE=`https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

async function ensureFirebase(){
  if(!firebaseEnabled)return false;
  if(initialized)return true;
  if(!initPromise){
    initPromise=(async()=>{
      const [{initializeApp},authMod,firestoreMod]=await Promise.all([
        import(`${SDK_BASE}/firebase-app.js`),
        import(`${SDK_BASE}/firebase-auth.js`),
        import(`${SDK_BASE}/firebase-firestore.js`)
      ]);
      const app=initializeApp(CONFIG.firebase);
      auth=authMod.getAuth(app);
      try{await authMod.setPersistence(auth,authMod.browserLocalPersistence)}catch(e){console.warn("Persistencia Auth no disponible",e)}
      db=firestoreMod.getFirestore(app);
      firebaseAuth=auth; firebaseDb=db; initialized=true; return true;
    })().catch(err=>{initPromise=null;throw err});
  }
  return initPromise;
}

export async function ensureAnonymousAuth(){
  if(!firebaseEnabled)return null;
  await ensureFirebase();
  if(authReadyPromise)return authReadyPromise;
  authReadyPromise=(async()=>{
    if(auth.currentUser)return auth.currentUser;
    const {signInAnonymously}=await import(`${SDK_BASE}/firebase-auth.js`);
    return (await signInAnonymously(auth)).user;
  })().catch(err=>{authReadyPromise=null;throw err});
  return authReadyPromise;
}

export const authState=async cb=>{
  if(!firebaseEnabled)return cb(null);
  try{await ensureAnonymousAuth();const {onAuthStateChanged}=await import(`${SDK_BASE}/firebase-auth.js`);return onAuthStateChanged(auth,cb)}catch{return cb(null)}
};
export const login=async()=>ensureAnonymousAuth();
export const logout=async()=>null;

const clean=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined));
const fs=async()=>{await ensureAnonymousAuth();return import(`${SDK_BASE}/firebase-firestore.js`)};
const normalizeRemoteValue=value=>{
  if(value==null)return value;
  if(value?.toDate instanceof Function)return value.toDate().toISOString();
  if(Array.isArray(value))return value.map(normalizeRemoteValue);
  if(Object.prototype.toString.call(value)==="[object Object]")return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,normalizeRemoteValue(v)]));
  return value;
};
const normalizeRemoteRow=snap=>({id:snap.id,...normalizeRemoteValue(snap.data())});

export async function remoteList(name){
  if(!firebaseEnabled)return [];
  await ensureAnonymousAuth(); const {collection,getDocs}=await fs();
  const snap=await getDocs(collection(db,name)); return snap.docs.map(normalizeRemoteRow);
}
export async function remoteGet(name,id){
  if(!firebaseEnabled)return null;
  await ensureAnonymousAuth(); const {doc,getDoc}=await fs(); const snap=await getDoc(doc(db,name,id));
  return snap.exists()?normalizeRemoteRow(snap):null;
}
export async function remoteSet(name,id,data){
  if(!firebaseEnabled)throw new Error("Firebase no está configurado.");
  await ensureAnonymousAuth(); const {doc,setDoc,serverTimestamp}=await fs();
  await setDoc(doc(db,name,id),clean({...data,updatedAt:serverTimestamp()}),{merge:true}); return{id,...data};
}
export async function remoteAdd(name,data,id=null){
  if(!firebaseEnabled)throw new Error("Firebase no está configurado.");
  await ensureAnonymousAuth(); const {collection,doc,setDoc,addDoc,serverTimestamp}=await fs();
  const payload=clean({...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  if(id){await setDoc(doc(db,name,id),payload,{merge:true});return{id,...data};}
  const r=await addDoc(collection(db,name),payload);return{id:r.id,...data};
}
export async function remoteUpdate(name,id,data){return remoteSet(name,id,data)}
export async function remoteDelete(name,id){
  if(!firebaseEnabled)throw new Error("Firebase no está configurado.");
  await ensureAnonymousAuth(); const {doc,setDoc,serverTimestamp}=await fs();
  await setDoc(doc(db,name,id),{deleted:true,deletedAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
}
export async function remotePurge(name,id){
  if(!firebaseEnabled)throw new Error("Firebase no está configurado.");
  await ensureAnonymousAuth(); const {doc,deleteDoc}=await fs(); await deleteDoc(doc(db,name,id));
}
export async function remoteAudit(data){
  if(!firebaseEnabled)return;
  await ensureAnonymousAuth(); const {doc,setDoc,serverTimestamp}=await fs();
  await setDoc(doc(db,"audit",data.id),clean({...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}),{merge:true});
}
export async function uploadFile(){return null}
export async function remoteBatchSet(rows){
  if(!firebaseEnabled)throw new Error("Firebase no está configurado.");
  await ensureAnonymousAuth(); const {writeBatch,doc,serverTimestamp}=await fs();
  for(let offset=0;offset<rows.length;offset+=450){
    const chunk=rows.slice(offset,offset+450); if(!chunk.length)continue;
    const batch=writeBatch(db);
    for(const r of chunk)batch.set(doc(db,r.name,r.id),clean({...r.data,updatedAt:serverTimestamp()}),{merge:true});
    await batch.commit();
  }
}
export async function getRemoteMeta(){return remoteGet(REMOTE_META_COLLECTION,REMOTE_META_ID)}
export async function initializeRemoteMeta(data){return remoteSet(REMOTE_META_COLLECTION,REMOTE_META_ID,data)}
export async function listenRemoteCollection(name,onRows){
  if(!firebaseEnabled)return()=>{};
  await ensureAnonymousAuth(); const {collection,onSnapshot}=await fs();
  const unsubscribe=onSnapshot(collection(db,name),snap=>onRows(snap.docs.map(normalizeRemoteRow)),err=>console.warn(`Firebase listener ${name}`,err));
  unsubscribeFns.push(unsubscribe); return unsubscribe;
}
export function stopRemoteListeners(){unsubscribeFns.forEach(fn=>{try{fn()}catch{}});unsubscribeFns=[]}
export const getFirebaseUid=()=>auth?.currentUser?.uid||null;
