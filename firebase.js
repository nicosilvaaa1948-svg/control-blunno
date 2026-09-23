import { CONFIG, isFirebaseConfigured } from "./config.js";
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let app = null, auth = null, db = null;

if (isFirebaseConfigured()) {
  app = initializeApp(CONFIG.firebase);
  auth = getAuth(app);
  db = getFirestore(app);
}

export const firebaseEnabled = isFirebaseConfigured();
export const firebaseAuth = auth;
export const firebaseDb = db;

export const authState = callback => auth ? onAuthStateChanged(auth, callback) : callback(null);
export const login = (email, password) =>
  auth ? signInWithEmailAndPassword(auth, email, password) : Promise.reject(new Error("Firebase no está configurado."));
export const logout = () => auth ? signOut(auth) : Promise.resolve();

const col = name => collection(db, name);
const clean = obj => Object.fromEntries(Object.entries(obj).filter(([,v]) => v !== undefined));

export async function remoteList(name, constraints = []) {
  if (!db) return [];
  let q = col(name);
  if (constraints.length) {
    const clauses = constraints.map(c => where(c.field, c.op, c.value));
    q = query(q, ...clauses);
  }
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
  if (id) { await setDoc(doc(db, name, id), payload); return { id, ...data }; }
  const ref = await addDoc(col(name), payload);
  return { id: ref.id, ...data };
}

export async function remoteUpdate(name, id, data) {
  if (!db) throw new Error("Firebase no está configurado.");
  await updateDoc(doc(db, name, id), clean({ ...data, updatedAt: serverTimestamp() }));
  return { id, ...data };
}

export async function remoteDelete(name, id) {
  if (!db) throw new Error("Firebase no está configurado.");
  await updateDoc(doc(db, name, id), { deleted: true, updatedAt: serverTimestamp() });
}

export async function remoteAudit(data) {
  if (!db) return;
  await addDoc(col("audit"), clean({ ...data, createdAt: serverTimestamp() }));
}

export async function remoteBatchSet(rows) {
  if (!db) throw new Error("Firebase no está configurado.");
  const batch = writeBatch(db);
  rows.forEach(({ name, id, data }) => {
    batch.set(doc(db, name, id), clean({ ...data, updatedAt: serverTimestamp() }), { merge: true });
  });
  await batch.commit();
}
