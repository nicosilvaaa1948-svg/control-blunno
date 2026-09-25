import { CONFIG, isFirebaseConfigured } from "./config.js";

let auth = null, db = null, storage = null;
let initialized = false;
let initPromise = null;

export let firebaseAuth = null;
export let firebaseDb = null;
export let firebaseStorage = null;
export const firebaseEnabled = isFirebaseConfigured();

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

export const authState = async cb => {
  if (!firebaseEnabled) return cb(null);
  try {
    await ensureFirebase();
    return (await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js")).onAuthStateChanged(auth, cb);
  } catch { return cb(null); }
};
export const login = async (email, password) => {
  if (!firebaseEnabled) throw new Error("Firebase no está configurado.");
  await ensureFirebase();
  const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js");
  return signInWithEmailAndPassword(auth, email, password);
};
export const logout = async () => {
  if (!firebaseEnabled) return;
  await ensureFirebase();
  const { signOut } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js");
  return signOut(auth);
};

const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const fs = async () => { await ensureFirebase(); return import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"); };

export async function remoteList(name, period = null) {
  if (!firebaseEnabled) return [];
  await ensureFirebase(); const { collection, getDocs, query, where } = await fs();
  const refCol = collection(db, name);
  const q = period && ["cash","hours","invoices","expenses","investments","employeeDebts","liquidations","tasks","closures"].includes(name) ? query(refCol, where("period","==",period)) : refCol;
  const snap = await getDocs(q); return snap.docs.map(d=>({id:d.id,...d.data()}));
}
export async function remoteGet(name,id){if(!firebaseEnabled)return null;await ensureFirebase();const {doc,getDoc}=await fs();const snap=await getDoc(doc(db,name,id));return snap.exists()?{id:snap.id,...snap.data()}:null;}
export async function remoteAdd(name,data,id=null){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {collection,doc,setDoc,addDoc,serverTimestamp}=await fs();const payload=clean({...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});if(id){await setDoc(doc(db,name,id),payload,{merge:true});return{id,...data};}const r=await addDoc(collection(db,name),payload);return{id:r.id,...data};}
export async function remoteUpdate(name,id,data){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {doc,updateDoc,serverTimestamp}=await fs();await updateDoc(doc(db,name,id),clean({...data,updatedAt:serverTimestamp()}));return{id,...data};}
export async function remotePurge(name,id){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {doc,deleteDoc,getDoc}=await fs();const refDoc=doc(db,name,id);const snap=await getDoc(refDoc);if(name==="files"&&snap.exists()&&snap.data().storagePath){try{const {ref,deleteObject}=await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js");await deleteObject(ref(storage,snap.data().storagePath));}catch(e){console.warn("Storage purge",e)}}await deleteDoc(refDoc);}
export async function remoteDelete(name,id){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {doc,updateDoc,serverTimestamp}=await fs();await updateDoc(doc(db,name,id),{deleted:true,deletedAt:serverTimestamp(),updatedAt:serverTimestamp()});}
export async function remoteAudit(data){if(!firebaseEnabled)return;await ensureFirebase();const {addDoc,collection,serverTimestamp}=await fs();await addDoc(collection(db,"audit"),clean({...data,createdAt:serverTimestamp()}));}
export async function uploadFile(path,blob,contentType){if(!firebaseEnabled)return null;await ensureFirebase();const {ref,uploadBytes,getDownloadURL}=await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js");const r=ref(storage,path);await uploadBytes(r,blob,{contentType:contentType||blob.type||"application/octet-stream"});return getDownloadURL(r);}
export async function remoteBatchSet(rows){if(!firebaseEnabled)throw new Error("Firebase no está configurado.");await ensureFirebase();const {writeBatch,doc,serverTimestamp}=await fs();const b=writeBatch(db);rows.forEach(r=>b.set(doc(db,r.name,r.id),clean({...r.data,updatedAt:serverTimestamp()}),{merge:true}));await b.commit();}
