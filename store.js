import {CONFIG} from './config.js';
const KEY='blunno-control-v2';
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const base=()=>({periods:[{id:CONFIG.defaultPeriod,status:'open',createdAt:now(),createdBy:'local'}],providers:[{id:uid(),name:'Aguilera',taxId:'',phone:'',active:true,createdAt:now(),updatedAt:now()}],employees:[],cash:[],invoices:[],hours:[],audit:[],settings:{},closures:[]});
let db=JSON.parse(localStorage.getItem(KEY)||'null')||base();
function persist(){localStorage.setItem(KEY,JSON.stringify(db));}
function clone(x){return JSON.parse(JSON.stringify(x));}
function audit(action,collection,id,before,after,reason=''){db.audit.unshift({id:uid(),at:now(),by:'usuario-local',action,collection,recordId:id,before:clone(before),after:clone(after),reason});}
function collection(name){return db[name]||[]}
function visible(name,period){return collection(name).filter(x=>!x.deleted&&(x.period===undefined||x.period===period));}
function add(name,data,reason=''){const id=uid(),at=now();const row={...data,id,createdAt:at,updatedAt:at,deleted:false};db[name].push(row);audit('CREATE',name,id,null,row,reason);persist();return row}
function update(name,id,patch,reason=''){const i=db[name].findIndex(x=>x.id===id);if(i<0)throw Error('Registro no encontrado');const before=clone(db[name][i]);db[name][i]={...db[name][i],...patch,updatedAt:now()};audit('UPDATE',name,id,before,db[name][i],reason);persist();return db[name][i]}
function remove(name,id,reason=''){return update(name,id,{deleted:true,deletedAt:now()},reason||'Baja lógica')}
function restore(name,id,reason='Restauración'){return update(name,id,{deleted:false,deletedAt:null},reason)}
function get(name,id){return db[name].find(x=>x.id===id)}
function closePeriod(period,next){const p=db.periods.find(x=>x.id===period);if(!p)throw Error('Período inexistente');if(p.status==='closed')throw Error('El período ya está cerrado');p.status='closed';p.closedAt=now();audit('CLOSE','periods',period,{status:'open'},{status:'closed',closedAt:p.closedAt},'Cierre mensual');if(!db.periods.find(x=>x.id===next))db.periods.push({id:next,status:'open',createdAt:now(),createdBy:'usuario-local'});persist()}
function exportJson(){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`backup-blunno-${now().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)}
export const Store={get db(){return db},collection,visible,add,update,remove,restore,get,closePeriod,exportJson,persist,now,uid};
