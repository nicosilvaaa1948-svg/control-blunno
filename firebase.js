import { CONFIG, isFirebaseConfigured } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, query, where, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";

let auth = null, db = null, storage = null;
if (isFirebaseConfigured()) {
  const app = initializeApp(CONFIG.firebase);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export const firebaseEnabled = isFirebaseConfigured();
export const firebaseAuth = auth;
export const firebaseDb = db;
export const firebaseStorage = storage;
export const authState = cb => auth ? onAuthStateChanged(auth, cb) : cb(null);
export const login = (email, password) => auth ? signInWithEmailAndPassword(auth, email, password) : Promise.reject(new Error("Firebase no está configurado."));
export const logout = () => auth ? signOut(auth) : Promise.resolve();
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function remoteList(name, period = null) {
  if (!db) return [];
  const refCol = collection(db, name);
  const q = period && ["cash", "hours", "invoices", "expenses", "investments", "employeeDebts", "liquidations", "tasks", "closures"].includes(name)
    ? query(refCol, where("period", "==", period)) : refCol;
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function remoteGet(name, id) {
  if (!db) return null;
  const snap = await getDoc(doc(db, name, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function remoteAdd(name, data, id = null) {
  if (!db) throw new Error("Firebase no está configurado.");
  const payload = clean({ ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  if (id) {
    await setDoc(doc(db, name, id), payload, { merge: true });
    return { id, ...data };
  }
  const r = await addDoc(collection(db, name), payload);
  return { id: r.id, ...data };
}

export async function remoteUpdate(name, id, data) {
  if (!db) throw new Error("Firebase no está configurado.");
  await updateDoc(doc(db, name, id), clean({ ...data, updatedAt: serverTimestamp() }));
  return { id, ...data };
}

export async function remoteDelete(name, id) {
  if (!db) throw new Error("Firebase no está configurado.");
  await updateDoc(doc(db, name, id), { deleted: true, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function remoteAudit(data) {
  if (!db) return;
  await addDoc(collection(db, "audit"), clean({ ...data, createdAt: serverTimestamp() }));
}

export async function uploadFile(path, blob, contentType) {
  if (!storage) return null;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: contentType || blob.type || "application/octet-stream" });
  return getDownloadURL(r);
}

export async function remoteBatchSet(rows) {
  if (!db) throw new Error("Firebase no está configurado.");
  const b = writeBatch(db);
  rows.forEach(r => b.set(doc(db, r.name, r.id), clean({ ...r.data, updatedAt: serverTimestamp() }), { merge: true }));
  await b.commit();
}
