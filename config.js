export const CONFIG={company:'Distribuidora Blunno',currency:'ARS',locale:'es-AR',defaultPeriod:'2026-09',branches:['Mendiolaza','Bodereau','Derqui','Unquillo'],hoursBranches:['Bodereau'],firebase:{apiKey:'',authDomain:'',projectId:'',storageBucket:'',messagingSenderId:'',appId:''}};
export const money=n=>new Intl.NumberFormat(CONFIG.locale,{style:'currency',currency:CONFIG.currency,maximumFractionDigits:0}).format(Number(n)||0);
export const dateTime=iso=>iso?new Intl.DateTimeFormat(CONFIG.locale,{dateStyle:'short',timeStyle:'short'}).format(new Date(iso)):'—';
export const monthLabel=p=>{const [y,m]=p.split('-');return new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric'}).format(new Date(Number(y),Number(m)-1,1)).replace(/^./,c=>c.toUpperCase())};
