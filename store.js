import { CONFIG, uid, isFirebaseConfigured, today } from "./config.js";
import { firebaseAuth, remoteList, remoteAdd, remoteUpdate, remoteDelete, remoteAudit } from "./firebase.js";
const KEY="blunno-control-v5";
const collections=["periods","providers","invoices","cash","employees","hours","employeeDebts","liquidations","audit","imports","closures","settings"];
const empty=()=>Object.fromEntries(collections.map(c=>[c,[]]));
const seed=()=>{const s=empty();s.periods.push({id:CONFIG.defaultPeriod,status:"open",name:CONFIG.defaultPeriod});return s;};
let state=load();
function load(){try{const r=localStorage.getItem(KEY);return r?{...empty(),...JSON.parse(r)}:seed();}catch{return seed();}}
const persist=()=>localStorage.setItem(KEY,JSON.stringify(state));
const now=()=>new Date().toISOString();
const active=n=>(state[n]||[]).filter(x=>!x.deleted);
const actor=()=>firebaseAuth?.currentUser?.email||window.__blunnoResponsible||"Usuario local";
const periodIsClosed=p=>state.periods.find(x=>x.id===p)?.status==="closed";
async function audit(action,collection,id,before,after,responsible,reason){const row={id:uid(),action,collection,recordId:id,before:before||null,after:after||null,responsible:responsible||actor(),actor:actor(),at:now(),reason:reason||""};state.audit.unshift(row);persist();if(isFirebaseConfigured())await remoteAudit(row);}
async function syncRemote(){if(!isFirebaseConfigured())return;for(const n of collections){try{const rows=await remoteList(n);if(rows.length||n==="periods")state[n]=rows;}catch(e){console.warn("Sync",n,e)}}if(!state.periods.length)state.periods=seed().periods;persist();}
function assertResponsible(name){if(!String(name||"").trim())throw new Error("Tenés que indicar el nombre del responsable antes de guardar.");}
export const Store={
 get mode(){return isFirebaseConfigured()?"firebase":"local"},get db(){return state},list(name,period=null){let r=active(name);if(period&&["cash","hours","invoices","employeeDebts","liquidations"].includes(name))r=r.filter(x=>x.period===period);return r;},get(name,id){return (state[name]||[]).find(x=>x.id===id&&!x.deleted)||null;},periodIsClosed,
 setPeriod(p){if(!/^\d{4}-\d{2}$/.test(p))throw new Error("El período debe tener formato YYYY-MM.");if(!state.periods.some(x=>x.id===p)){state.periods.push({id:p,status:"open",name:p});persist();}},
 async add(name,data,responsible,reason="Alta manual"){assertResponsible(responsible);if(data.period&&periodIsClosed(data.period))throw new Error("El período está cerrado.");const id=uid(),row={id,...data,deleted:false,createdAt:now(),updatedAt:now()};state[name].unshift(row);persist();if(isFirebaseConfigured())await remoteAdd(name,row,id);await audit("CREATE",name,id,null,row,responsible,reason);return row;},
 async update(name,id,patch,responsible,reason="Edición manual"){assertResponsible(responsible);const old=this.get(name,id);if(!old)throw new Error("No se encontró el registro.");if(old.period&&periodIsClosed(old.period))throw new Error("El período está cerrado. No se puede editar.");const row={...old,...patch,updatedAt:now()};state[name]=state[name].map(x=>x.id===id?row:x);persist();if(isFirebaseConfigured())await remoteUpdate(name,id,patch);await audit("UPDATE",name,id,old,row,responsible,reason);return row;},
 async remove(name,id,responsible,reason="Baja lógica"){assertResponsible(responsible);const old=this.get(name,id);if(!old)return;if(old.period&&periodIsClosed(old.period))throw new Error("El período está cerrado.");const row={...old,deleted:true,deletedAt:now(),updatedAt:now()};state[name]=state[name].map(x=>x.id===id?row:x);persist();if(isFirebaseConfigured())await remoteDelete(name,id);await audit("DELETE",name,id,old,row,responsible,reason);},
 async restore(name,id,responsible){assertResponsible(responsible);const old=(state[name]||[]).find(x=>x.id===id);if(!old)return;const row={...old,deleted:false,restoredAt:now(),updatedAt:now()};state[name]=state[name].map(x=>x.id===id?row:x);persist();if(isFirebaseConfigured())await remoteUpdate(name,id,{deleted:false,restoredAt:row.restoredAt});await audit("RESTORE",name,id,old,row,responsible,"Recuperación");},
 async closePeriod(period,next,responsible){assertResponsible(responsible);if(periodIsClosed(period))throw new Error("El período ya está cerrado.");const p=state.periods.find(x=>x.id===period)||{id:period,status:"open"};const closed={...p,status:"closed",closedAt:now(),closedBy:responsible};state.periods=state.periods.filter(x=>x.id!==period);state.periods.push(closed);if(!state.periods.some(x=>x.id===next))state.periods.push({id:next,status:"open",name:next});persist();if(isFirebaseConfigured()){await remoteAdd("periods",closed,period);await remoteAdd("periods",{id:next,status:"open",name:next},next);}await audit("CLOSE_PERIOD","periods",period,p,closed,responsible,`Apertura de ${next}`);},
 async upsertBySource(name,sourceKey,data,responsible,reason="Sincronización Excel"){assertResponsible(responsible);const found=active(name).find(x=>x.sourceKey===sourceKey);if(found)return this.update(name,found.id,data,responsible,reason);return this.add(name,{...data,sourceKey},responsible,reason);},
 async sync(){await syncRemote();},
 exportJson(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`blunno-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);},
 async importState(obj,responsible){assertResponsible(responsible);const before={...state};state={...empty(),...obj};persist();await audit("IMPORT_STATE","system","backup",before,state,responsible,"Restauración de backup");}
};
