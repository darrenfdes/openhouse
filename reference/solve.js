const {PLANS,run,breakEven,maxRent,TESTS}=require('./model2.js');
const SC={Conservative:{occScale:0.75,adrNew:4500,adrHeritage:6500,cafe:0.75,nomadRooms:2},Base:{occScale:1,adrNew:5000,adrHeritage:7500,cafe:1,nomadRooms:3},Optimistic:{occScale:1.15,adrNew:5500,adrHeritage:8500,cafe:1.2,nomadRooms:3}};
const apply=(p,s)=>{const c=p.cafeCovers;return {...p,occScale:s.occScale,adrNew:s.adrNew,adrHeritage:s.adrHeritage,nomadRooms:s.nomadRooms,cafeCovers:{peak:c.peak*s.cafe,shoulder:c.shoulder*s.cafe,low:c.low*s.cafe,monsoon:c.monsoon*s.cafe}}};
const out={};
for(const k of ['A','B','C']){const p=PLANS[k];const b=breakEven(p);out[k]={...b,maxRentLease:maxRent(p,TESTS.lease),maxRent5:maxRent(p,TESTS.five)};}
const row=(cs,plan,p)=>{const r=run(p);return {case:cs,plan,capex:r.capex.total/1e5,occ:r.years[3].occupancy,ebitda:r.years[3].ebitda/1e5,payback:r.payback,irr:r.irr,end:r.endCash/1e5}};
out.scenarios=[];
for(const [n,s] of Object.entries(SC)) for(const k of ['A','B','C']) out.scenarios.push(row(n,k,apply(PLANS[k],s)));
out.scenarios.push(row('Base + construction 50% over','A',{...PLANS.A,constructionOverrun:0.5}));
out.scenarios.push(row('Base + ₹40 L budget 25% over','B',{...PLANS.B,budgetOverrun:0.25}));
out.scenarios.push(row('Base + ₹40 L budget 50% over','B',{...PLANS.B,budgetOverrun:0.5}));
out.scenarios.push(row('Base, rent ₹1,00,000 (owner\'s ask)','A',{...PLANS.A,rent:100000}));
out.scenarios.push(row('Base, rent ₹1,00,000 (owner\'s ask)','B',{...PLANS.B,rent:100000}));
out.scenarios.push(row('Base + ₹20 L budget 25% over','C',{...PLANS.C,budgetOverrun:0.25}));
out.scenarios.push(row('Base, rent ₹60,000','C',{...PLANS.C,rent:60000}));
out.sensitivity=[];
for(let s=0.7;s<=1.301;s+=0.05){const a=run({...PLANS.A,occScale:s}),b=run({...PLANS.B,occScale:s}),c=run({...PLANS.C,occScale:s});out.sensitivity.push({scale:+s.toFixed(2),occA:a.years[3].occupancy,pbA:a.payback,endA:a.endCash/1e5,occB:b.years[3].occupancy,pbB:b.payback,endB:b.endCash/1e5,occC:c.years[3].occupancy,pbC:c.payback,endC:c.endCash/1e5});}
console.log(JSON.stringify(out));
