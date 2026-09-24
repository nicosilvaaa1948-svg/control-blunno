import { CONFIG, isFirebaseConfigured } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, query, where, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let auth=null, db=null;
if(isFirebaseConfigured()) { const app=initializeApp(CONFIG.firebase); auth=getAuth(app); db=getFirestore(app); }
export const firebaseEnabled=isFirebaseConfigured();
export const firebaseAuth=auth;
export const firebaseDb=db;
export const authState=cb=>auth?onAuthStateChanged(auth,cb):cb(null);
export const login=(email,password)=>auth?signInWithEmailAndPassword(auth,email,password):Promise.reject(new Error("Firebase no está configurado."));
export const logout=()=>auth?signOut(auth):Promise.resolve();
const clean=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined));
export async function remoteList(name, period=null){ if(!db)return[]; let ref=collection(db,name); let q=period&&["cash","hours","invoices","employeeDebts","liquidations"].includes(name)?query(ref,where("period","==",period)):ref; const s=await getDocs(q); return s.docs.map(d=>({id:d.id,...d.data()})); }
export async function remoteGet(name,id){if(!db)return null;const s=await getDoc(doc(db,name,id));return s.exists()?{id:s.id,...s.data()}:null;}
export async function remoteAdd(name,data,id=null){if(!db)throw new Error("Firebase no está configurado.");const payload=clean({...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});if(id){await setDoc(doc(db,name,id),payload,{merge:true});return{id,...data};}const r=await addDoc(collection(db,name),payload);return{id:r.id,...data};}
export async function remoteUpdate(name,id,data){if(!db)throw new Error("Firebase no está configurado.");await updateDoc(doc(db,name,id),clean({...data,updatedAt:serverTimestamp()}));return{id,...data};}
export async function remoteDelete(name,id){if(!db)throw new Error("Firebase no está configurado.");await updateDoc(doc(db,name,id),{deleted:true,deletedAt:serverTimestamp(),updatedAt:serverTimestamp()});}
export async function remoteAudit(data){if(!db)return;await addDoc(collection(db,"audit"),clean({...data,createdAt:serverTimestamp()}));}
export async function remoteBatchSet(rows){if(!db)throw new Error("Firebase no está configurado.");const b=writeBatch(db);rows.forEach(r=>b.set(doc(db,r.name,r.id),clean({...r.data,updatedAt:serverTimestamp()}),{merge:true}));await b.commit();}
