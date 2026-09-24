import { CONFIG, uid, isFirebaseConfigured, today, now } from "./config.js";
import { firebaseAuth, remoteList, remoteAdd, remoteUpdate, remoteDelete, remoteAudit } from "./firebase.js";

const KEY="blunno-control-v7";
const collections=["periods","providers","invoices","cash","expenses","investments","employees","hours","employeeDebts","liquidations","tasks","closures","files","imports","audit","settings"];
const empty=()=>Object.fromEntries(collections.map(c=>[c,[]]));
const providerNames=["Aguilera","Alimentar","Argentina Distrib.","B-Burger","Bacha","Ballichoc","Bauton","Bettini","Bimbo","Bonaditos","C.C.U.","Campi","CAP","Cigarillos","Condimentos","Córdoba Drinks","Danal Pasta","Don Apolo","Don Yeyo","El Club del 21","Empanadas","Fini USA","Galiana","Golosina","La Serenísima","Lácteos","Mastellone","Molinos","Paladini","Pehuamar","Sancor","Unilever","Vea","Otros"];
const seed=()=>{const s=empty();s.periods.push({id:CONFIG.defaultPeriod,status:"open",name:CONFIG.defaultPeriod});providerNames.forEach(name=>s.providers.push({id:uid(),name,active:true,master:true,createdAt:now(),updatedAt:now()}));return s;};
let state=load();
function load(){try{const r=localStorage.getItem(KEY);const parsed=r?JSON.parse(r):seed();const base=empty();return {...base,...parsed,providers:parsed.providers?.length?parsed.providers:seed().providers};}catch{return seed();}}
const persist=()=>localStorage.setItem(KEY,JSON.stringify(state));
const active=n=>(state[n]||[]).filter(x=>!x.deleted);
const actor=()=>firebaseAuth?.currentUser?.email||window.__blunnoResponsible||"Usuario local";
const periodIsClosed=p=>state.periods.find(x=>x.id===p)?.status==="closed";
const assertResponsible=name=>{if(!String(name||"").trim())throw new Error("Tenés que indicar el responsable antes de guardar.");};
async function audit(action,collection,id,before,after,responsible,reason){const row={id:uid(),action,collection,recordId:id,before:before||null,after:after||null,responsible:responsible||actor(),actor:actor(),at:now(),reason:reason||""};state.audit.unshift(row);persist();if(isFirebaseConfigured())await remoteAudit(row);}
async function syncRemote(){if(!isFirebaseConfigured())return;for(const n of collections){try{const rows=await remoteList(n);if(rows.length)state[n]=rows;}catch(e){console.warn("Sync",n,e)}}persist();}

export const Store={
 get mode(){return isFirebaseConfigured()?"firebase":"local"}, get db(){return state}, list(name,period=null){let r=active(name);if(period&&["cash","hours","invoices","expenses","investments","employeeDebts","liquidations","tasks"].includes(name))r=r.filter(x=>x.period===period);return r;}, get(name,id){return (state[name]||[]).find(x=>x.id===id&&!x.deleted)||null;}, periodIsClosed,
 setPeriod(p){if(!/^\d{4}-\d{2}$/.test(p))throw new Error("El período debe tener formato YYYY-MM.");if(!state.periods.some(x=>x.id===p)){state.periods.push({id:p,status:"open",name:p});persist();}},
 async add(name,data,responsible,reason="Alta manual"){assertResponsible(responsible);if(data.period&&periodIsClosed(data.period)&&!data.lateMovement)throw new Error("El período está cerrado. Usá la opción 'Movimiento tardío' para cargar algo recibido después.");const id=uid(),row={id,...data,deleted:false,createdAt:now(),updatedAt:now()};state[name].unshift(row);persist();if(isFirebaseConfigured())await remoteAdd(name,row,id);await audit("CREATE",name,id,null,row,responsible,reason);return row;},
 async update(name,id,patch,responsible,reason="Edición manual"){assertResponsible(responsible);const old=this.get(name,id);if(!old)throw new Error("No se encontró el registro.");if(old.period&&periodIsClosed(old.period)&&!old.lateMovement)throw new Error("El período está cerrado.");const row={...old,...patch,updatedAt:now()};state[name]=state[name].map(x=>x.id===id?row:x);persist();if(isFirebaseConfigured())await remoteUpdate(name,id,patch);await audit("UPDATE",name,id,old,row,responsible,reason);return row;},
 async remove(name,id,responsible,reason="Baja lógica"){assertResponsible(responsible);const old=this.get(name,id);if(!old)return;const row={...old,deleted:true,deletedAt:now(),updatedAt:now()};state[name]=state[name].map(x=>x.id===id?row:x);persist();if(isFirebaseConfigured())await remoteDelete(name,id);await audit("DELETE",name,id,old,row,responsible,reason);},
 async restore(name,id,responsible){assertResponsible(responsible);const old=(state[name]||[]).find(x=>x.id===id);if(!old)return;const row={...old,deleted:false,restoredAt:now(),updatedAt:now()};state[name]=state[name].map(x=>x.id===id?row:x);persist();if(isFirebaseConfigured())await remoteUpdate(name,id,{deleted:false,restoredAt:row.restoredAt});await audit("RESTORE",name,id,old,row,responsible,"Recuperación");},
 async closePeriod(period,responsible,versionNote="Cierre manual"){assertResponsible(responsible);const p=state.periods.find(x=>x.id===period)||{id:period,status:"open"};const existing=state.closures.filter(x=>x.period===period&&!x.deleted);const version=existing.length+1;const summary=buildSummary(period,"General");const closed={id:uid(),period,version,status:"closed",closedAt:now(),closedBy:responsible,summary,note:versionNote};state.closures.unshift(closed);state.periods=state.periods.map(x=>x.id===period?{...x,status:"closed",closedAt:now(),closedBy:responsible,closureVersion:version}:x);persist();if(isFirebaseConfigured())await remoteAdd("closures",closed,closed.id);await audit("CLOSE_PERIOD","periods",period,p,closed,responsible,versionNote);return closed;},
 async addLateMovement(name,data,responsible,reason){return this.add(name,{...data,lateMovement:true,lateReason:reason},responsible,`Movimiento tardío: ${reason}`);},
 async addTask(data,responsible){return this.add("tasks",{...data,status:"pending",completedAt:null,completedBy:null},responsible,"Nueva tarea");},
 async completeTask(id,responsible){const old=this.get("tasks",id);if(!old)return;return this.update("tasks",id,{status:"completed",completedAt:now(),completedBy:responsible},responsible,"Tarea realizada");},
 async addFileMeta(data,responsible){return this.add("files",data,responsible,"Archivo archivado");},
 async upsertBySource(name,sourceKey,data,responsible,reason="Sincronización Excel"){assertResponsible(responsible);const found=active(name).find(x=>x.sourceKey===sourceKey);if(found)return this.update(name,found.id,data,responsible,reason);return this.add(name,{...data,sourceKey},responsible,reason);},
 async sync(){await syncRemote();},
 exportJson(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`blunno-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);},
 async importState(obj,responsible){assertResponsible(responsible);const before={...state};state={...empty(),...obj};persist();await audit("IMPORT_STATE","system","backup",before,state,responsible,"Restauración de backup");}
};

export function buildSummary(period,branch="General"){
 const filter=x=>branch==="General"||x.branch===branch;
 const cash=Store.list("cash",period).filter(filter), inv=Store.list("invoices",period).filter(filter), exp=Store.list("expenses",period).filter(filter), invst=Store.list("investments",period).filter(filter), hours=Store.list("hours",period).filter(filter), liq=Store.list("liquidations",period).filter(filter);
 const income=cash.filter(x=>x.type==="income").reduce((s,x)=>s+Number(x.amount||0),0);
 const cashExpense=cash.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount||0),0);
 const localExpense=exp.reduce((s,x)=>s+Number(x.amount||0),0), investment=invst.reduce((s,x)=>s+Number(x.amount||0),0), provider=inv.reduce((s,x)=>s+Number(x.amount||0),0), salary=liq.reduce((s,x)=>s+Number(x.net||x.total||0),0);
 return {period,branch,income,cashExpense,localExpense,investment,provider,salary,totalExpenses:cashExpense+localExpense+investment+provider+salary,result:income-(cashExpense+localExpense+investment+provider+salary),hours:hours.reduce((s,x)=>s+Number(x.hours||0),0),invoiceCount:inv.length,investmentCount:invst.length,expenseCount:exp.length};
}
