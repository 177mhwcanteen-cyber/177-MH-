/* 🥬 सब्ज़ी एक्सप्रेस की सब्ज़ी 177 MH में भी (28-11-2026, विक्रम जी) — window.SSX
   "जो सब्ज़ी सब्ज़ी एक्सप्रेस में बिकती है, उसमें से कुछ कैंटीन में भी रखी जाती है — कोई लेने आए तो यहीं से बिके,
    भाव वही जो सब्ज़ी एक्सप्रेस में; कोका-कोला के साथ 1 किलो आलू भी एक ही बिल में।"
   • भाव/नाम/फोटो: सब्ज़ी एक्सप्रेस Firebase का सार्वजनिक pub/rates (REST, बिना लॉगिन — config stores.sabji, वही जो ऑर्डर-पेज लेता है)।
   • यहाँ ये "आभासी" सामान हैं: id "sx-<id>", virtual:true, sx:true, cat "sabzi" — Firestore items में कभी नहीं लिखे जाते,
     इसलिए 177 का स्टॉक/रैक/बारकोड/लेबल/ऑनलाइन-भाव/रिपोर्ट-सूचियाँ इन्हें नहीं छूतीं (वे सब !i.virtual छाँटती हैं)।
   • बिल में आम सामान जैसे (किलो = मात्रा पूछे), बिल-पंक्ति id sx-… से; भाव 177 में नहीं बदलता (सब्ज़ी एक्सप्रेस में बदलें)।
   • फोन पर कैश (se_sx) — नेट न हो तब भी आख़िरी भाव; हर 15 मिनट और 🥬 चिप दबाने पर ताज़ा।
   ब्योरा: docs/सब्ज़ी-177-में-प्रॉम्प्ट.txt */
(function(){
const SSX=window.SSX={list:[],ts:0,at:0,old:0};
const SC=((window.SE_CONFIG||{}).stores||{}).sabji||{};
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const V=v=>{if(!v)return null;if("stringValue"in v)return v.stringValue;if("integerValue"in v)return +v.integerValue;if("doubleValue"in v)return v.doubleValue;if("booleanValue"in v)return v.booleanValue;if("nullValue"in v)return null;if("arrayValue"in v)return (v.arrayValue.values||[]).map(V);if("mapValue"in v){const o={};Object.entries(v.mapValue.fields||{}).forEach(([k,x])=>o[k]=V(x));return o}return null};
const SUB={sabzi:"sabzi",patta:"patta",fal:"fruit",packed:"sabzi"};
const UNIT={kg:"kg",g:"kg",pc:"pc",pk:"pk",gaddi:"pc",gd:"pc",dz:"pc",dozen:"pc",l:"l",ltr:"l"};
const pic=p=>!p?"":/^(https?:|data:)/.test(p)?(/^data:/.test(p)?"":p):(SC.base||"")+String(p).replace(/^\.?\//,"");
function toItem(r,i){const id="sx-"+String(r.id).replace(/[^\w-]/g,"");const en=String(r.e||"").trim(),hi=String(r.n||"").trim();
  return {id,name:en&&hi?en.toUpperCase()+" "+hi:(en||hi).toUpperCase(),short:(en||hi).toUpperCase().slice(0,24),hi:en?hi:"",alias:[en,hi,r.id,"sabzi sabji सब्ज़ी"].join(" "),
    emoji:r.c==="fal"?"🍎":r.c==="patta"?"🌿":"🥬",cat:"sabzi",sub:SUB[r.c]||"sabzi",unit:UNIT[r.u]||r.u||"kg",sale:+r.s||0,mrp:0,cost:0,
    hue:+r.h||120,plu:0,active:true,virtual:true,sx:true,sxImg:pic(r.p),sxOut:r.o?1:0,order:i}}
/* S.items में आभासी सब्ज़ी जोड़ो/ताज़ा करो (पुरानी sx- हटाकर) — items की हर snapshot के बाद भी */
SSX.merge=function(){if(typeof S==="undefined"||!Array.isArray(S.items))return;
  for(let k=S.items.length-1;k>=0;k--)if(S.items[k]&&S.items[k].sx)S.items.splice(k,1);
  if((S.settings||{}).sxOff)return;/* मालिक ने बंद किया हो */
  const own=new Set(S.items.filter(i=>i.active!==false&&!i.virtual).map(i=>String(i.name||"").toUpperCase()));
  SSX.list.forEach(it=>{if(it.sale>0&&!own.has(it.name)&&!own.has(it.short))S.items.push(it)})};
function apply(rows,ts){SSX.list=(rows||[]).filter(r=>r&&r.id&&+r.s>0).map(toItem);SSX.ts=+ts||0;SSX.old=SSX.ts>0&&Date.now()-SSX.ts>36*3600e3?1:0;
  SSX.merge();try{if(S.tab==="bill")renderBill()}catch(e){}}
SSX.load=async function(force){if(!SC.pid||!SC.key)return;if(!force&&Date.now()-SSX.at<60e3)return;SSX.at=Date.now();
  try{const r=await fetch("https://firestore.googleapis.com/v1/projects/"+SC.pid+"/databases/(default)/documents/pub/rates?key="+SC.key,{cache:"no-store"});if(!r.ok)throw 0;
    const X=V({mapValue:{fields:(await r.json()).fields||{}}})||{};if(!Array.isArray(X.items)||!X.items.length)return;
    LS.set("se_sx",{items:X.items,ts:+X.ts||0});apply(X.items,X.ts)}catch(e){}};
/* 🥬 चिप पर ऊपर की पट्टी: कहाँ से भाव, कब के */
SSX.barHTML=function(){if(!SSX.list.length)return `<div class="sxbar"><b>🥬 सब्ज़ी एक्सप्रेस के भाव अभी नहीं आए</b><button type="button" data-sxre>🔄 लाएँ</button></div>`;
  const t=SSX.ts?new Date(SSX.ts):null,tt=t?t.toLocaleString("hi-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"";
  return `<div class="sxbar${SSX.old?" old":""}"><b>🥬 भाव सब्ज़ी एक्सप्रेस से${tt?" · "+tt:""}</b>${SSX.old?`<i>⚠ भाव पुराने हो सकते हैं — सब्ज़ी एक्सप्रेस का ऐप खोलें</i>`:`<i>${SSX.list.length} सब्ज़ी-फल · किलो वाली पर मात्रा पूछेगा</i>`}<button type="button" data-sxre aria-label="भाव ताज़ा करें">🔄</button></div>`};
SSX.syncBar=function(){const g=document.getElementById("grid");if(!g)return;let b=document.getElementById("sxbarw");
  const on=typeof S!=="undefined"&&S.tab==="bill"&&S.cat==="sabzi"&&!String(S.q||"").trim();
  if(!on){if(b)b.remove();return}
  if(!b){b=document.createElement("div");b.id="sxbarw";g.parentNode.insertBefore(b,g)}b.innerHTML=SSX.barHTML()};
document.addEventListener("click",e=>{if(e.target.closest("[data-sxre]")){SSX.load(true).then(()=>{toast&&toast(SSX.list.length?"🥬 "+SSX.list.length+" सब्ज़ी के भाव ताज़ा":"भाव नहीं आए — नेट देखें")});return}
  const c=e.target.closest('[data-cat="sabzi"]');if(c)SSX.load()},true);
const st=document.createElement("style");st.textContent=`
.sxbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;padding:8px 10px 8px 12px;border-radius:14px;background:linear-gradient(90deg,#dcfce7,#f0fdf4);border:1.5px solid #86efac;color:#14532d}
.sxbar b{font-size:14px}.sxbar i{font-style:normal;font-size:12px;color:#166534;flex:1;min-width:140px}
.sxbar.old{background:linear-gradient(90deg,#fef3c7,#fffbeb);border-color:#fcd34d;color:#78350f}.sxbar.old i{color:#92400e;font-weight:700}
.sxbar button{border:0;background:#16a34a;color:#fff;border-radius:999px;padding:5px 11px;font-weight:800;font-size:13px}`;document.head.appendChild(st);
/* शुरू: कैश से तुरंत, फिर नेट से; हर 15 मिनट */
try{const c=LS.get("se_sx",null);if(c&&Array.isArray(c.items))apply(c.items,c.ts)}catch(e){}
setTimeout(()=>SSX.load(true),4000);setInterval(()=>SSX.load(true),15*60e3);
})();
