/* 📍 रैक बदलें · माल ट्रांसफ़र (window.SRX) — विक्रम जी, 09/10-11-2026 · पूरा नियम: docs/रैक-बदलना-प्रॉम्प्ट.txt
   बिलिंग जैसी पूरी स्क्रीन: ऊपर नीली पट्टी (‹ · 📷 · ↔ ट्रांसफ़र | 🗄️ रैक देखें | 🧠 सुझाव) → कैमरा (पट्टी के ठीक नीचे, कभी ढकता नहीं) → नीचे काम।
   ↔ ट्रांसफ़र: ① सामान स्कैन/खोज ② कहाँ से (हर खाने में कितना) + कितने ③ नया खाना (स्टिकर स्कैन / सुझाव) → "↔ 8 पीस भेजें" → ✓ + ↩ वापस।
   🗄️ रैक देखें: रैक → खानों की जाली (खाली/भरा/मिला-जुला) → खाने का सामान → ले जाएँ / "यहाँ रखना है"।
   🧠 सुझाव: जमावट स्कोर, हर किस्म का घर (मालिक चुने: settings/main.rkHome, वरना ≥50% वाला रैक), घर से बाहर वाले, दो जगह, खाली खाने।
   डेटा (पुराना कुछ नहीं बदलता, सिर्फ़ जुड़ता है):
   • items.rack = मुख्य खाना। items.rkx = {"6-2":3} = बाकी खानों में कितने (मालिक लिखता है) + rkxTs। मुख्य में = कुल स्टॉक − बाकी का जोड़।
   • हर ट्रांसफ़र days/<आज>/meta/rkx में {id,from,to,n,rack,x,prack,px,byName,ts} (साथी भी; rack भी लिख सकते हैं)। मालिक का ऐप (SRX.sync) items में लिखता है। */
(function(){
if(window.SRX)return;
const SRX=window.SRX={};
const $=s=>document.querySelector(s),H=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const own=()=>!!(S.isOwner||S.demo),who=()=>typeof biller==="function"?biller():"",NM=it=>SE&&SE.capNm?SE.capNm(it.short||it.name):(it.short||it.name);
const can=v=>{const s=String(v||"").trim();return !s?"":window.SRK&&SRK.canon?SRK.canon(s):s.toUpperCase()};
const act=()=>(S.items||[]).filter(i=>i.active!==false&&!i.virtual);
const META=d=>"days/"+d+"/meta/rkx";
const dAdd=(d,k)=>{const t=new Date(d+"T12:00:00");t.setDate(t.getDate()+k);return today(t)};
let EV={};/* id → आख़िरी ट्रांसफ़र */let LOG=[];/* आज के (इस फोन के देखे) */let loaded=0;
const LS={get:k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
(LS.get("srx_ev")||[]).forEach(e=>{if(e&&e.id&&(!EV[e.id]||EV[e.id].ts<e.ts))EV[e.id]=e});
const keepLocal=()=>LS.set("srx_ev",Object.values(EV).filter(e=>Date.now()-e.ts<15*864e5));

/* ---------- हालत: कौन-सा सामान किस खाने में कितना ---------- */
const qty=it=>{const p=S.pstock&&S.pstock[it.id];return p&&p.qty!=null&&isFinite(+p.qty)?+p.qty:null};
SRX.state=function(it){if(!it)return {rack:"",x:{}};const rack=can(it.rack),e=EV[it.id];
  let x=e&&e.ts>(+it.rkxTs||0)?{...(e.x||{})}:{...(it.rkx||{})};
  Object.keys(x).forEach(k=>{const c=can(k);if(c!==k){x[c]=(x[c]||0)+(+x[k]||0);delete x[k]}});
  delete x[rack];Object.keys(x).forEach(k=>{if(!(+x[k]>0))delete x[k]});return {rack,x}};
SRX.locs=function(it){const {rack,x}=SRX.state(it),q=qty(it),sx=Object.values(x).reduce((a,b)=>a+(+b||0),0);
  const L=rack?[{k:rack,q:q==null?null:Math.max(0,Math.round((q-sx)*1000)/1000),main:true}]:[];
  Object.entries(x).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>L.push({k,q:+v,main:false}));
  if(!rack&&!L.length)L.push({k:"",q,main:true});return L};
SRX.more=it=>Object.keys(SRX.state(it).x).length;
SRX.at=code=>{code=can(code);return act().filter(i=>can(i.rack)===code||SRX.state(i).x[code]>0)};

/* ---------- ट्रांसफ़र ---------- */
SRX.xfer=async function(id,from,to,n,mkMain){const it=item(id);if(!it)return false;
  from=can(from);to=can(to);n=Math.round((+n||0)*1000)/1000;
  if(!to){toast("कहाँ रखना है — खाने का नंबर लिखें या स्टिकर स्कैन करें");return false}
  if(window.SRK&&SRK.parse){const p=SRK.parse(to);if(!p){toast(to+" — नंबर ऐसे लिखें: 6-2");return false}if(p.known===false&&SRK.RL&&SRK.RL.length){toast("⚠ "+to+" नक्शे में नहीं — पहले रैक में खाना जोड़ें");return false}}
  const st=SRX.state(it),rack=st.rack,L=SRX.locs(it);
  if(!rack){/* अभी कोई जगह नहीं → बस घर लगा दो */return save(it,{from:"",to,n,rack:to,x:{},prack:"",px:st.x})}
  if(!from)from=rack;if(from===to){toast("दोनों खाने एक ही — "+to);return false}
  const f=L.find(l=>l.k===from);if(!f){toast(from+" में यह सामान नहीं");return false}
  if(!(n>0)){toast("कितने भेजने हैं — लिखें");return false}
  if(f.q!=null&&n>f.q+1e-9){toast(from+" में सिर्फ़ "+f.q+" हैं");return false}
  const x={...st.x};let nr=rack;
  if(from!==rack){x[from]=Math.round(((+x[from]||0)-n)*1000)/1000;if(!(x[from]>0))delete x[from]}
  const allMain=from===rack&&f.q!=null&&n>=f.q-1e-9;
  if(mkMain||allMain){nr=to;const left=from===rack?(f.q==null?0:f.q-n):(L[0].q==null?0:L[0].q);
    if(left>0)x[rack]=Math.round(left*1000)/1000;delete x[to]}
  else if(to!==rack)x[to]=Math.round(((+x[to]||0)+n)*1000)/1000;
  return save(it,{from,to,n,rack:nr,x,prack:rack,px:st.x})};
async function save(it,o){const ev={id:it.id,name:NM(it),...o,by:S.uid||"",byName:who(),ts:Date.now()};
  if(!S.demo&&S.db){
    try{if(own())await S.db.doc("items/"+it.id).update({rack:ev.rack,rkx:ev.x,rkxTs:ev.ts});else if(can(it.rack)!==ev.rack)await S.db.doc("items/"+it.id).update({rack:ev.rack})}
    catch(e){toast("सेव नहीं हुआ — नेट देखें");return false}
    S.db.doc(META(today())).set({["x"+ev.ts+Math.random().toString(36).slice(2,5)]:ev},{merge:true}).catch(()=>{})}
  it.rack=ev.rack;if(own()){it.rkx=ev.x;it.rkxTs=ev.ts}
  EV[it.id]=ev;keepLocal();LOG.unshift(ev);return ev}
/* 📥 खरीद में आया माल: खाना लिखा → घर नहीं तो वही घर; मुख्य से अलग खाना तो वहाँ +n (कुल स्टॉक खरीद से बढ़ता है) */
SRX.addAt=async function(id,k,n){const it=item(id);k=can(k);if(!it||!k)return false;const st=SRX.state(it);
  if(!st.rack)return save(it,{from:"",to:k,n:0,rack:k,x:st.x,prack:"",px:st.x,src:"kharid"});
  if(st.rack===k)return false;const x={...st.x};x[k]=Math.round(((+x[k]||0)+(+n||0))*1000)/1000;
  return save(it,{from:"",to:k,n:+n||0,rack:st.rack,x,prack:st.rack,px:st.x,src:"kharid"})};
SRX.undo=async function(ts){const e=LOG.find(x=>x.ts===+ts);if(!e)return false;const it=item(e.id);if(!it)return false;
  const r=await save(it,{from:e.to,to:e.from||e.prack,n:e.n,rack:e.prack||e.rack,x:e.px||{},prack:e.rack,px:e.x,undo:e.ts});
  if(r){LOG=LOG.filter(x=>x.ts!==e.ts&&x!==r);toast("↩ वापस: "+e.name)}return !!r};

/* ---------- मालिक: साथियों के ट्रांसफ़र items में (14 दिन) ---------- */
async function pull(n){if(S.demo||!S.db)return;const D=await Promise.all([...Array(n)].map((_,k)=>S.db.doc(META(dAdd(today(),-k))).get().then(s=>s.exists?s.data():{}).catch(()=>({}))));
  D.forEach(v=>Object.values(v||{}).forEach(e=>{if(e&&e.id&&e.ts&&(!EV[e.id]||EV[e.id].ts<e.ts))EV[e.id]=e}));
  const t0=today();LOG=Object.values(EV).filter(e=>today(new Date(e.ts))===t0).sort((a,b)=>b.ts-a.ts);keepLocal();loaded=1}
SRX.sync=async function(){if(!S.isOwner||S.demo||!S.db)return 0;await pull(14);let n=0;
  for(const e of Object.values(EV)){const it=item(e.id);if(!it||e.ts<=(+it.rkxTs||0))continue;
    try{await S.db.doc("items/"+it.id).update({rkx:e.x||{},rkxTs:e.ts,...(can(it.rack)!==e.rack&&e.rack?{rack:e.rack}:{})});it.rkx=e.x||{};it.rkxTs=e.ts;if(e.rack)it.rack=e.rack;n++}catch(x){}}
  return n};
let synced=0;setInterval(()=>{if(!synced&&typeof S!=="undefined"&&S.isOwner&&S.items&&S.items.length&&S.db&&!S.demo){synced=1;SRX.sync().catch(()=>{})}},7000);


/* ---------- 🧠 जमावट: किस्म का घर (मालिक का चुना > डेटा से) ---------- */
let _KL=null;
const KL=()=>{if(_KL)return _KL;_KL={};try{Object.values(SUBS).forEach(L=>L.forEach(([k,v])=>{_KL[k]=v}));CATS.forEach(([k,v])=>{if(!_KL[k])_KL[k]=v})}catch(e){}return _KL};
const kn=k=>KL()[k]||(k==="x"?"बाकी":k);
const kindOf=it=>it.sub||(typeof mcat==="function"?mcat(it):it.cat)||"x";
const tob=it=>typeof isTob==="function"&&isTob(it);
const rkN=c=>{const m=/^(\d{1,2})-/.exec(c||"");return m?+m[1]:0};
const RL=()=>(window.SRK&&SRK.RL)||[];
const rkNm=r=>{const x=RL().find(v=>v.r===+r);return x?x.nm:""};
const info=k=>window.SRK&&SRK.info?SRK.info(k):"";
const homeCfg=()=>(typeof S!=="undefined"&&S.settings&&S.settings.rkHome)||{};
const SHOP=r=>r>0&&r<31;/* 31–35 = अंदर रखा माल — जमावट के हिसाब में नहीं */
SRX.kindName=kn;
SRX.zones=function(){const Z={},hc=homeCfg();
  act().forEach(it=>{if(tob(it))return;const c=can(it.rack),r=rkN(c);if(!SHOP(r))return;const k=kindOf(it),z=Z[k]||(Z[k]={k,n:0,r:{},kh:{}});z.n++;z.r[r]=(z.r[r]||0)+1;z.kh[c]=(z.kh[c]||0)+1});
  Object.values(Z).forEach(z=>{const top=Object.entries(z.r).sort((a,b)=>b[1]-a[1]);z.top=top.map(([r,c])=>[+r,c]);
    z.auto=top[0]&&top[0][1]>=3&&top[0][1]/z.n>=.5?+top[0][0]:0;z.own=+hc[z.k]||0;z.home=z.own||z.auto;z.spread=top.length;z.inHome=z.home?(z.r[z.home]||0):0;
    z.khHome=z.home?Object.entries(z.kh).filter(([c])=>rkN(c)===z.home).sort((a,b)=>b[1]-a[1]).map(([c])=>c):[]});
  return Z};
SRX.setHome=async function(kind,rack){if(!own())return false;const nx={...homeCfg(),[kind]:+rack||0};
  try{if(!S.demo&&S.db)await S.db.doc("settings/main").set({rkHome:nx},{merge:true});S.settings={...(S.settings||{}),rkHome:nx};return true}catch(e){toast("सेव नहीं हुआ — नेट देखें");return false}};
function khMap(){const M={};act().forEach(it=>SRX.locs(it).forEach(l=>{if(l.k)(M[l.k]=M[l.k]||[]).push({it,q:l.q,main:l.main})}));return M}
SRX.empty=function(r,M){M=M||khMap();const out=[];RL().filter(x=>!r||x.r===+r).forEach(x=>{if(x.g||(!r&&!SHOP(x.r)))return;for(let k=1;k<=x.n;k++){const c=x.r+"-"+k;if(can(c)===c&&!M[c])out.push(c)}});return out};
/* इस सामान के लिए अच्छे खाने: जहाँ पहले से है · किस्म का घर · इसी कंपनी का सामान · घर के खाली खाने */
SRX.suggest=function(it,from,n){const out=[],seen=new Set([can(from)]),add=(c,t)=>{c=can(c);if(!c||seen.has(c))return;seen.add(c);out.push([c,t])};
  SRX.locs(it).forEach(l=>add(l.k,l.main?"इसकी मुख्य जगह":"यहाँ भी रखा है"));
  const z=SRX.zones()[kindOf(it)],M=khMap();if(z&&z.home)z.khHome.slice(0,2).forEach(c=>add(c,"इसी किस्म के साथ"));
  if(it.brand){const m={};act().forEach(i=>{if(i.id!==it.id&&i.brand===it.brand&&can(i.rack)){const c=can(i.rack);m[c]=(m[c]||0)+1}});Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,2).forEach(([c])=>add(c,it.brand+" यहीं है"))}
  if(z&&z.home)SRX.empty(z.home,M).slice(0,2).forEach(c=>add(c,"खाली खाना · रैक "+z.home));
  return out.slice(0,n||6)};
function bestKh(it,z,M){const inH=c=>rkN(c)===z.home;
  if(it.brand){const m={};act().forEach(i=>{const c=can(i.rack);if(i.id!==it.id&&i.brand===it.brand&&inH(c))m[c]=(m[c]||0)+1});const b=Object.entries(m).sort((a,b)=>b[1]-a[1])[0];if(b)return b[0]}
  const e=SRX.empty(z.home,M)[0];if(e)return e;
  const kinds=c=>new Set((M[c]||[]).map(v=>kindOf(v.it))).size;
  return z.khHome.slice().sort((a,b)=>kinds(a)-kinds(b)||(z.kh[b]-z.kh[a]))[0]||""}
SRX.ideas=function(){const Z=SRX.zones(),M=khMap(),out=[],two=[],none=[];let inH=0,tot=0;
  act().forEach(it=>{if(tob(it))return;const c=can(it.rack),r=rkN(c);
    if(!c){if(it.track!==false&&(S.pstock||{})[it.id])none.push(it);return}if(!SHOP(r))return;
    const k=kindOf(it),z=Z[k];if(z&&z.home){tot++;if(r===z.home)inH++;else out.push({it,k,from:c,to:bestKh(it,z,M),home:z.home})}
    if(SRX.more(it))two.push(it)});
  const KH={};Object.entries(M).forEach(([c,L])=>{if(!SHOP(rkN(c)))return;const s=new Set(L.filter(x=>!tob(x.it)).map(x=>kindOf(x.it)));if(s.size>=3)KH[c]=[...s]});
  return {Z,out,two,none,mixed:Object.entries(KH).map(([c,ks])=>({c,ks})),score:tot?Math.round(inH/tot*100):null,inH,tot,M}};

/* ---------- 🖥️ पूरी स्क्रीन (बिलिंग जैसी): ऊपर पट्टी · कैमरा · नीचे काम ---------- */
const V={open:false,tab:"move",id:"",from:"",to:"",n:"",mk:false,q:"",kh:"",rk:0,rkh:"",preTo:"",done:null,more:0};
const camOnNow=()=>document.documentElement.classList.contains("camon");
const U=it=>(typeof UNITS!=="undefined"&&UNITS[it.unit])||"पीस";
const Qn=(q,it)=>q==null?"?":(typeof fq==="function"?fq(q,it.unit):q+" "+U(it));
const stepOf=it=>typeof isPc==="function"&&!isPc(it.unit)?0.5:1;
SRX.chipHTML=()=>`<button class="chip toolchip rkxchip" data-rkxopen>📍 रैक बदलें</button>`;
SRX.open=function(id,o){V.open=true;V._cam=camOnNow();V.tab=(o&&o.tab)||"move";V.q="";V.kh="";V.done=null;V.more=0;if(id)pick(id,o);else{V.id="";V.from="";V.to="";V.n="";V.mk=false}
  if(!loaded)pull(S.isOwner?14:3).then(()=>{if(V.open)draw()});draw();
  /* फोन में कैमरा पहले से पसंद है तो सीधा चालू — स्कैन करते ही काम */
  try{if(window.SE&&SE.isNative&&!SE.cam.on&&typeof lsGet==="function"&&lsGet("se_cam")==="1"&&typeof camOn==="function")camOn()}catch(e){}};
SRX.close=function(){V.open=false;const s=$("#srxSheet");if(s)s.remove();document.documentElement.classList.remove("srxon");
  try{if(typeof camAuto==="function")camAuto();if(typeof camLayout==="function")camLayout();if(typeof renderBill==="function"&&S.tab==="bill")renderBill()}catch(e){}};
SRX.isOpen=()=>V.open&&!!$("#srxSheet");
function pick(id,o){const it=item(id);if(!it)return;V.id=id;const L=SRX.locs(it);o=o||{};V.done=null;
  V.from=can(o.from)||(L[0]&&L[0].k)||"";V.to=can(o.to)||(V.preTo&&V.preTo!==V.from?V.preTo:"");const f=L.find(l=>l.k===V.from);V.n=o.n||(f&&f.q!=null?f.q:"");V.mk=false;V.kh=""}
function hits(q){q=String(q||"").trim().toLowerCase();if(!q)return [];const bc=typeof findByCode==="function"?findByCode(q):null;
  const L=act().filter(i=>((i.name||"")+" "+(i.short||"")+" "+(i.hi||"")+" "+(i.alias||"")).toLowerCase().includes(q)||String(i.code||"").startsWith(q));if(bc&&!L.includes(bc))L.unshift(bc);return L.slice(0,12)}
const locPills=i=>SRX.locs(i).map(x=>`<em class="${x.main?"m":""}">📍${H(x.k||"जगह नहीं")}${x.q!=null&&x.k?" · "+x.q:""}</em>`).join("");
const row=(i,attr,right)=>`<button type="button" class="rx-row" ${attr}>${tileHTML(i)}<span class="rx-rt"><b>${H(NM(i))}</b><small>${i.code?"#"+H(i.code)+" ":""}${locPills(i)}</small></span>${right||'<i class="rx-chev">›</i>'}</button>`;

function barHTML(){const cam=camOnNow(),n=LOG.filter(e=>!e.undo).length;
  return `<div class="rx-bar1"><button type="button" class="rx-back" data-rxback aria-label="वापस">‹</button>
    <div class="rx-ttl"><b>📍 रैक बदलें</b><span>माल एक खाने से दूसरे में${n?" · आज "+n+" ट्रांसफ़र":""}</span></div>
    <button type="button" class="rx-camb${cam?" on":""}" data-rxcam aria-pressed="${cam}" aria-label="कैमरा">📷<small>${cam?"बंद करें":"स्कैन"}</small></button></div>
  <div class="rx-seg" role="tablist">${[["move","↔","ट्रांसफ़र"],["rack","🗄️","रैक देखें"],["idea","🧠","सुझाव"]].map(([k,e,t])=>`<button type="button" role="tab" data-rxtab="${k}" aria-selected="${V.tab===k}"><i>${e}</i> ${t}</button>`).join("")}</div>`}
function stepsHTML(st,nOk){const T=[["सामान"],["कितने"],["नया खाना"]];
  return `<div class="rx-steps">${T.map(([t],i)=>{const k=i+1,ok=k<st||(k===2&&st>1&&nOk),on=k===st;return `<div class="rx-step${ok&&!on?" ok":on?" on":""}"><i>${ok&&!on?"✓":k}</i><span>${t}</span></div>`}).join('<u></u>')}</div>`}
function doneHTML(){const e=V.done;if(!e)return "";
  return `<div class="rx-done" role="status"><div class="rx-tick">✓</div><div class="rx-dt"><b>${H(e.name)}</b><span>${e.n?H(e.n)+" · ":""}${H(e.from||"—")} → <strong>${H(e.to)}</strong> पहुँच गया${e.rack!==e.prack&&e.prack?" · मुख्य जगह अब "+H(e.rack):""}</span></div>${e.by===(S.uid||"")?`<button type="button" data-rxundo="${e.ts}">↩ वापस</button>`:""}</div>`}
function hitsHTML(){const L=V.kh?SRX.at(V.kh):hits(V.q);
  if(V.kh)return `<div class="rx-khh"><b>📍 ${H(V.kh)}</b><span>${H(info(V.kh))}</span><button type="button" class="lnk" data-rxclr>✕</button></div>${L.length?L.map(i=>row(i,`data-rxpick="${H(i.id)}"`)).join(""):`<p class="rx-none">यह खाना खाली है</p>`}`;
  if(!V.q.trim())return "";
  return L.length?L.map(i=>row(i,`data-rxpick="${H(i.id)}"`)).join(""):`<p class="rx-none">"${H(V.q)}" नहीं मिला — नाम या 4 अंक कोड दोबारा देखें</p>`}
function logHTML(){const L=LOG.slice(0,10);if(!L.length)return "";
  return `<h4 class="rx-h">🕘 आज के ट्रांसफ़र</h4><div class="rx-card rx-log">${L.map(e=>`<div class="rx-li"><span><b>${e.undo?"↩ ":""}${H(e.name)}</b><small>${[e.n?e.n+" पीस":"",H(e.from||"—")+" → "+H(e.to),H(e.byName||""),new Date(e.ts).toLocaleTimeString("hi-IN",{hour:"2-digit",minute:"2-digit"})].filter(Boolean).join(" · ")}</small></span>${e.by===(S.uid||"")&&!e.undo?`<button type="button" class="rx-mini" data-rxundo="${e.ts}">↩ वापस</button>`:""}</div>`).join("")}</div>`}

function scanHTML(){const cam=camOnNow();
  return `${doneHTML()}${stepsHTML(1)}
  ${V.preTo?`<div class="rx-pre">📥 अगला सामान सीधे <b>${H(V.preTo)}</b> में रखा जाएगा <button type="button" class="lnk" data-rxpre0>हटाएँ ✕</button></div>`:""}
  <div class="rx-hero${cam?" rx-cam":""}" ${cam?"":'data-rxcam role="button" tabindex="0"'}>
    <div class="rx-bcode" aria-hidden="true"><span></span></div>
    <div class="rx-ht"><b>${cam?"कैमरा चालू है — बारकोड सामने लाएँ":"सामान का बारकोड स्कैन करें"}</b><span>${cam?"सामान या खाने का स्टिकर — दोनों पढ़ेगा":"📷 कैमरा खोलने के लिए यहाँ दबाएँ"}</span></div>
  </div>
  <div class="rx-search"><span aria-hidden="true">🔍</span><input id="srxQ" placeholder="या नाम / 4 अंक कोड लिखें" value="${H(V.q)}" autocomplete="off" enterkeyhint="search" aria-label="सामान खोजें">${V.q?'<button type="button" data-rxclr aria-label="साफ़ करें">✕</button>':""}</div>
  <div id="rxHits" class="rx-hits">${hitsHTML()}</div>
  ${V.q||V.kh?"":`<div class="rx-tips"><div><i>🏷️</i><span><b>खाने का स्टिकर स्कैन करें</b> तो उस खाने का सारा सामान दिखेगा</span></div><div><i>🗄️</i><span><b>रैक देखें</b> में पूरा रैक, हर खाने में क्या रखा है</span></div></div>`}
  ${logHTML()}`}
function composeHTML(it){const L=SRX.locs(it),f=L.find(l=>l.k===V.from)||L[0],tot=qty(it),n=+V.n||0,placed=!!L[0].k,st=stepOf(it);
  const all=placed&&f.main&&f.q!=null&&n>=f.q-1e-9,ok=!!(V.to&&(n>0||!placed)&&V.to!==V.from);
  const T=SRX.suggest(it,V.from);
  const half=f&&f.q!=null?(st<1?Math.floor(f.q)/2:Math.floor(f.q/2)):0,opt=new Map();
  if(f&&f.q!=null){[1,5,10].forEach(v=>{if(v<f.q)opt.set(v,String(v))});if(half>0&&half<f.q)opt.set(half,"आधा");if(f.q>0)opt.set(f.q,"सब "+f.q)}
  const chips=[...opt].map(([v,t])=>`<button type="button" data-rxset="${v}"${n===v?' class="on"':""}>${t}</button>`).join("");
  return `${stepsHTML(!V.to?3:4,n>0)}
  <div class="rx-item">${tileHTML(it)}<div class="rx-it"><b>${H(NM(it))}</b><span>${it.code?"#"+H(it.code)+" · ":""}कुल ${tot==null?"गिनती नहीं":H(Qn(tot,it))}</span></div><button type="button" class="rx-x" data-rxnew aria-label="दूसरा सामान">✕</button></div>
  ${placed?`<h4 class="rx-h"><i>1</i> कहाँ से उठाना है</h4>
  <div class="rx-locs">${L.map(l=>`<button type="button" class="rx-loc${V.from===l.k?" on":""}" data-rxfrom="${H(l.k)}" aria-pressed="${V.from===l.k}"><span class="rx-k">${H(l.k)}</span><b>${l.q==null?"?":H(Qn(l.q,it))}</b><small>${l.main?"मुख्य जगह":"दूसरी जगह"}</small></button>`).join("")}</div>
  <h4 class="rx-h"><i>2</i> कितने ले जाने हैं</h4>
  <div class="rx-card rx-qty"><div class="rx-n"><button type="button" data-rxn="${-st}" aria-label="कम">−</button><input id="srxN" inputmode="decimal" value="${H(V.n)}" placeholder="0" aria-label="कितने"><button type="button" data-rxn="${st}" aria-label="ज़्यादा">＋</button><span>${H(U(it))}</span></div>${chips?`<div class="rx-qc">${chips}</div>`:""}</div>`
  :`<div class="rx-pre">📍 इस सामान की अभी कोई जगह नहीं लगी — नीचे खाना चुनें, वही इसका घर बनेगा</div>`}
  <h4 class="rx-h"><i>${placed?3:1}</i> कहाँ रखना है</h4>
  <div class="rx-card rx-to"><div class="rx-tor"><span class="rx-pin">📍</span><input id="srxTo" class="code" placeholder="6-2" value="${H(V.to)}" autocomplete="off" autocapitalize="characters" aria-label="किस खाने में"><span class="rx-toh" id="rxToh">${tohHTML()}</span></div>
    <div id="rxNow">${nowHTML(it)}</div>
    ${T.length?`<div class="rx-sug">${T.map(([c,t])=>`<button type="button" data-rxto="${H(c)}"${V.to===c?' class="on"':""}><span class="rx-k">${H(c)}</span><small>${H(t)}</small></button>`).join("")}</div>`:""}</div>
  <div id="rxRoute">${routeHTML(it)}</div>
  <div class="rx-cta"><button type="button" class="big rx-go" data-rxgo ${ok?"":"disabled"}>${!placed?`📍 ${H(V.to||"…")} में रखें`:ok?`↔ ${H(Qn(n,it))} भेजें · ${H(V.from)} → ${H(V.to)}`:!V.to?"नया खाना चुनें ☝":"कितने भेजने हैं?"}</button></div>`}
const tohHTML=()=>V.to?H(info(V.to)||"⚠ यह खाना नक्शे में नहीं"):"खाने का स्टिकर स्कैन करें या नंबर लिखें";
function nowHTML(it){if(!V.to||!info(V.to))return "";const M=SRX.at(V.to).filter(i=>i.id!==it.id);
  return `<p class="rx-now">${M.length?"अभी यहाँ: "+M.slice(0,3).map(i=>H(NM(i))).join(", ")+(M.length>3?" +"+(M.length-3):""):"✨ यह खाना अभी खाली है"}</p>`}
function routeHTML(it){const L=SRX.locs(it),f=L.find(l=>l.k===V.from)||L[0],n=+V.n||0,placed=!!L[0].k,ok=!!(V.to&&(n>0||!placed)&&V.to!==V.from);
  if(!ok||!placed)return "";const toL=L.find(l=>l.k===V.to),toNow=toL?toL.q:0,all=f.main&&f.q!=null&&n>=f.q-1e-9;
  return `<div class="rx-route" aria-label="ट्रांसफ़र"><div class="rx-rb"><span class="rx-k">${H(V.from)}</span><small>बचेंगे <b>${f.q==null?"?":H(Qn(Math.max(0,Math.round((f.q-n)*1000)/1000),it))}</b></small></div>
    <div class="rx-ar"><b>${H(Qn(n,it))}</b><i></i></div>
    <div class="rx-rb to"><span class="rx-k">${H(V.to)}</span><small>हो जाएँगे <b>${toNow==null?"?":H(Qn(Math.round((toNow+n)*1000)/1000,it))}</b></small></div></div>
  ${V.to!==L[0].k&&V.from===L[0].k?`<label class="rx-mk"><input type="checkbox" id="srxMk" ${V.mk||all?"checked":""} ${all?"disabled":""}><span>अब से <b>${H(V.to)}</b> ही इसकी मुख्य जगह${all?" (सारा माल जा रहा है)":""}</span></label>`:""}`}
function moveHTML(){const it=V.id?item(V.id):null;return it?composeHTML(it):scanHTML()}

function rackHTML(){const M=khMap(),R=RL();
  if(!R.length)return `<p class="rx-none">रैक का नक्शा अभी नहीं बना।<br>सेटिंग → 📍 रैक-खाना में अपने रैक और खाने जोड़ें।</p>`;
  if(!V.rk)return `<p class="rx-lead">रैक चुनें — हर खाने में क्या रखा है, दिखेगा</p><div class="rx-racks">${R.map(x=>{let used=0,items=0;for(let k=1;k<=x.n;k++){const L=M[x.r+"-"+k];if(L){used++;items+=L.length}}
      return `<button type="button" class="rx-rack" data-rxrk="${x.r}"><span class="rx-rn">${x.r}</span><b>${H(x.nm||"रैक "+x.r)}</b><small>${x.g?"🚪 अंदर · ":""}${items} सामान · ${x.n-used} खाली</small><i class="rx-bar2"><u style="width:${Math.round(used/x.n*100)}%"></u></i></button>`}).join("")}</div>`;
  const x=R.find(v=>v.r===V.rk)||R[0],sel=V.rkh&&rkN(V.rkh)===x.r?V.rkh:"",SL_=sel?(M[sel]||[]):[];
  return `<div class="rx-rkh"><button type="button" class="rx-mini" data-rxrk="0">‹ सब रैक</button><b>रैक ${x.r} · ${H(x.nm||"")}</b></div>
  ${x.keep?`<p class="rx-lead">${H(x.keep)}</p>`:""}
  <div class="rx-cells">${[...Array(x.n)].map((_,i)=>{const c=x.r+"-"+(i+1);if(can(c)!==c)return `<div class="rx-cell gone"><b>${i+1}</b><span>→ ${H(can(c))}</span></div>`;const L=M[c]||[],ks=new Set(L.map(v=>kindOf(v.it))).size;
    return `<button type="button" class="rx-cell${L.length?"":" empty"}${ks>=3?" mix":""}${sel===c?" on":""}" data-rxkh="${c}"><b>${i+1}</b><span>${L.length?L.length+" सामान":"खाली"}</span></button>`}).join("")}</div>
  <div class="rx-legend"><span><i class="e"></i>खाली</span><span><i class="f"></i>भरा</span><span><i class="m"></i>3+ किस्में मिली</span></div>
  ${sel?`<h4 class="rx-h">📍 ${H(sel)} <small>${H(info(sel))}</small></h4>
  <div class="rx-hits">${SL_.length?SL_.map(v=>row(v.it,`data-rxpick="${H(v.it.id)}" data-f="${H(sel)}"`,`<span class="rx-here"><b>${v.q==null?"?":H(Qn(v.q,v.it))}</b><small>↔ ले जाएँ</small></span>`)).join(""):`<p class="rx-none">✨ यह खाना खाली है</p>`}</div>
  <button type="button" class="big ghost rx-put" data-rxput="${H(sel)}">📥 इस खाने में सामान रखना है</button>`:`<p class="rx-lead" style="text-align:center">किसी खाने पर टैप करें</p>`}`}

const PAL=["#6366f1","#0ea5e9","#f59e0b","#ec4899","#84cc16","#a855f7","#14b8a6","#f43f5e"];
function ideaHTML(){const D=SRX.ideas(),Z=Object.values(D.Z).filter(z=>z.n>=3).sort((a,b)=>(a.home?1:0)-(b.home?1:0)||b.n-a.n),E=SRX.empty(0,D.M),o=own();
  const byR={};E.forEach(c=>{(byR[rkN(c)]=byR[rkN(c)]||[]).push(c)});const cap=V.more?999:8;
  return `<div class="rx-score">${D.score==null?`<div class="rx-ring" style="--p:0"><b>—</b></div><div><b>जमावट स्कोर</b><span>पहले नीचे हर किस्म का घर (रैक) चुनें — फिर स्कोर बनेगा</span></div>`
    :`<div class="rx-ring" style="--p:${D.score}"><b>${D.score}%</b></div><div><b>जमावट स्कोर${D.score>=90?" 🎉":""}</b><span>${D.tot} में से <strong>${D.inH}</strong> सामान अपनी किस्म के घर में${D.out.length?` · <em>${D.out.length} बाहर</em>`:""}</span></div>`}</div>
  <div class="rx-rules"><span>🧩 एक किस्म, एक जगह</span><span>🏋️ भारी नीचे</span><span>👀 तेज़ बिकने वाला आँख के सामने</span><span>⏳ पुराना माल आगे</span></div>
  ${D.out.length?`<h4 class="rx-h">🔀 इन्हें घर ले जाएँ <small>${D.out.length}</small></h4><div class="rx-hits">${D.out.slice(0,cap).map(x=>row(x.it,`data-rxidea="${H(x.it.id)}" data-f="${H(x.from)}" data-t="${H(x.to)}"`,`<span class="rx-mv"><em>${H(x.from)}</em><i>→</i><em class="t">${H(x.to||"रैक "+x.home)}</em></span>`)).join("")}</div>${D.out.length>cap?`<button type="button" class="rx-more" data-rxmore>और ${D.out.length-cap} दिखाएँ ↓</button>`:""}`:""}
  <h4 class="rx-h">🏠 हर किस्म का घर <small>कौन-सी किस्म किस रैक में</small></h4>
  ${Z.length?Z.map(z=>`<div class="rx-card rx-kind${z.home?"":" need"}"><div class="rx-kh2"><b>${H(kn(z.k))}</b><span>${z.n} सामान</span>${z.home?`<em class="ok">🏠 रैक ${z.home}${z.own?"":" (अपने-आप)"}</em>`:`<em class="no">घर तय नहीं · ${z.spread} रैक में बिखरा</em>`}</div>
    <div class="rx-stack">${z.top.map(([r,c],i)=>`<i style="flex:${c};background:${r===z.home?"var(--accent)":PAL[i%PAL.length]}" title="रैक ${r}: ${c}"></i>`).join("")}</div>
    <div class="rx-leg">${z.top.slice(0,6).map(([r,c],i)=>`<span><i style="background:${r===z.home?"var(--accent)":PAL[i%PAL.length]}"></i>रैक ${r} · ${c}</span>`).join("")}</div>
    ${o&&(!z.home||z.spread>1)?`<div class="rx-pick"><small>${z.home?"घर बदलें:":"इस किस्म का घर चुनें:"}</small>${z.top.slice(0,4).filter(([r])=>r!==z.home).map(([r,c])=>`<button type="button" data-rxhome="${H(z.k)}" data-r="${r}">रैक ${r}</button>`).join("")}</div>`:""}</div>`).join(""):`<p class="rx-none">अभी कम सामान की जगह लगी है — जैसे-जैसे सामान चढ़ेगा, सुझाव बेहतर होंगे।</p>`}
  ${D.two.length?`<h4 class="rx-h">📦 दो जगह रखा सामान <small>${D.two.length}</small></h4><div class="rx-hits">${D.two.slice(0,6).map(i=>row(i,`data-rxpick="${H(i.id)}"`)).join("")}</div>`:""}
  ${D.none.length?`<h4 class="rx-h">❓ जगह नहीं लगी <small>${D.none.length}</small></h4><div class="rx-hits">${D.none.slice(0,6).map(i=>row(i,`data-rxpick="${H(i.id)}"`)).join("")}</div>`:""}
  ${D.mixed.length?`<h4 class="rx-h">🧺 मिले-जुले खाने <small>एक खाने में 3+ किस्में</small></h4><div class="rx-card rx-mix">${D.mixed.slice(0,8).map(m=>`<button type="button" data-rxgo2="${H(m.c)}"><span class="rx-k">${H(m.c)}</span><small>${H(m.ks.map(kn).join(" · "))}</small><i class="rx-chev">›</i></button>`).join("")}</div>`:""}
  <h4 class="rx-h">⬜ खाली खाने <small>${E.length} — नया सामान यहाँ</small></h4>
  <div class="rx-card rx-emp">${Object.keys(byR).length?Object.entries(byR).map(([r,L])=>`<div><b>रैक ${r}</b><span>${L.map(c=>`<button type="button" data-rxput="${H(c)}">${H(c)}</button>`).join("")}</span></div>`).join(""):`<p class="rx-none">कोई खाना खाली नहीं</p>`}</div>`}

function fit(){const b=$("#srxSheet .rx-bar");if(b)document.documentElement.style.setProperty("--rxh",Math.round(b.getBoundingClientRect().height)+"px")}
function draw(top){if(!V.open)return;let s=$("#srxSheet");
  if(!s){s=document.createElement("div");s.id="srxSheet";s.setAttribute("role","dialog");s.setAttribute("aria-label","रैक बदलें");s.innerHTML=`<div class="rx-bar"></div><div class="rx-main" id="rxMain"></div>`;document.body.appendChild(s);bind(s)}
  document.documentElement.classList.add("srxon");
  s.querySelector(".rx-bar").innerHTML=barHTML();const m=$("#rxMain");m.innerHTML=V.tab==="idea"?ideaHTML():V.tab==="rack"?rackHTML():moveHTML();
  if(top)m.scrollTop=0;fit()}
SRX.draw=draw;
function live(){/* कितने / कहाँ लिखते समय सिर्फ़ बटन, रास्ता और खाने की जानकारी ताज़ा (की-बोर्ड न हटे, टैप न छूटे) */
  const it=item(V.id);if(!it)return;const L=SRX.locs(it),n=+V.n||0,placed=!!L[0].k,ok=!!(V.to&&(n>0||!placed)&&V.to!==V.from),b=$("[data-rxgo]");
  if(b){b.disabled=!ok;b.textContent=!placed?`📍 ${V.to||"…"} में रखें`:ok?`↔ ${Qn(n,it)} भेजें · ${V.from} → ${V.to}`:!V.to?"नया खाना चुनें ☝":"कितने भेजने हैं?"}
  const r=$("#rxRoute");if(r)r.innerHTML=routeHTML(it);const h=$("#rxToh");if(h)h.innerHTML=tohHTML();const w=$("#rxNow");if(w)w.innerHTML=nowHTML(it)}
function focusQ(){setTimeout(()=>{const q=$("#srxQ");if(q&&!camOnNow())q.focus()},60)}
function bind(s){
  s.addEventListener("input",e=>{const t=e.target;
    if(t.id==="srxQ"){V.q=t.value;V.kh="";const h=$("#rxHits");if(h)h.innerHTML=hitsHTML()}
    else if(t.id==="srxN"){V.n=t.value;live()}
    else if(t.id==="srxTo"){V.to=can(t.value);live()}});
  s.addEventListener("change",e=>{if(e.target.id==="srxMk")V.mk=e.target.checked});
  s.addEventListener("keydown",e=>{if(e.key!=="Enter")return;const t=e.target;
    if(t.id==="srxQ"){e.preventDefault();const c=t.value.trim();if(!c)return;if(/^R?\d{1,2}-\d{1,2}$/i.test(c)){V.q="";SRX.scan(/^R/i.test(c)?c:"R"+c);return}
      const L=hits(c),bc=typeof findByCode==="function"?findByCode(c):null;if(bc||L.length===1){V.q="";pick((bc||L[0]).id,V.kh?{from:V.kh}:null);draw(1)}}
    else if(t.id==="srxTo"){e.preventDefault();V.to=can(t.value);t.blur();draw()}
    else if(t.id==="srxN"){e.preventDefault();t.blur();const x=$("#srxTo");if(x&&!V.to)x.focus()}});
  s.addEventListener("click",async e=>{const g=x=>e.target.closest(x);let b;
    if(g("[data-rxback]")){if(V.tab==="move"&&V.id){V.id="";V.q="";draw(1)}else if(V.tab==="rack"&&V.rk){V.rk=0;V.rkh="";draw(1)}else SRX.close();return}
    if((b=g("[data-rxtab]"))){V.tab=b.dataset.rxtab;V.more=0;draw(1);return}
    if(g("[data-rxcam]")){try{if(camOnNow()){if(typeof camOff==="function")await camOff(true)}else if(typeof camOn==="function")await camOn()}catch(x){}draw();return}
    if((b=g("[data-rxpick]"))){pick(b.dataset.rxpick,b.dataset.f?{from:b.dataset.f}:V.kh?{from:V.kh}:null);V.tab="move";V.q="";draw(1);return}
    if(g("[data-rxnew]")){V.id="";V.q="";V.kh="";V.done=null;draw(1);focusQ();return}
    if(g("[data-rxclr]")){V.q="";V.kh="";draw();focusQ();return}
    if(g("[data-rxpre0]")){V.preTo="";draw();return}
    if((b=g("[data-rxfrom]"))){V.from=b.dataset.rxfrom;const l=SRX.locs(item(V.id)).find(x=>x.k===V.from);V.n=l&&l.q!=null?l.q:"";if(V.to===V.from)V.to="";draw();return}
    if((b=g("[data-rxn]"))){const l=SRX.locs(item(V.id)).find(x=>x.k===V.from);let v=Math.max(0,Math.round(((+V.n||0)+(+b.dataset.rxn))*1000)/1000);if(l&&l.q!=null)v=Math.min(v,l.q);V.n=v;draw();return}
    if((b=g("[data-rxset]"))){V.n=+b.dataset.rxset;draw();return}
    if((b=g("[data-rxto]"))){V.to=b.dataset.rxto;draw();return}
    if((b=g("[data-rxundo]"))){if(await SRX.undo(b.dataset.rxundo)){V.done=null;draw()}return}
    if((b=g("[data-rxidea]"))){V.tab="move";pick(b.dataset.rxidea,{from:b.dataset.f,to:b.dataset.t});draw(1);return}
    if((b=g("[data-rxrk]"))){V.rk=+b.dataset.rxrk||0;V.rkh="";draw(1);return}
    if((b=g("[data-rxkh]"))){V.rkh=b.dataset.rxkh;draw();setTimeout(()=>{const h=$("#rxMain .rx-put");if(h)h.scrollIntoView({block:"nearest",behavior:"smooth"})},40);return}
    if((b=g("[data-rxgo2]"))){V.tab="rack";V.rk=rkN(b.dataset.rxgo2);V.rkh=b.dataset.rxgo2;draw(1);return}
    if((b=g("[data-rxput]"))){V.preTo=can(b.dataset.rxput);V.tab="move";V.id="";V.q="";V.kh="";V.done=null;draw(1);toast("📥 अब सामान स्कैन करें — सीधे "+V.preTo+" में जाएगा");focusQ();return}
    if(g("[data-rxmore]")){V.more=1;draw();return}
    if((b=g("[data-rxhome]"))){if(await SRX.setHome(b.dataset.rxhome,b.dataset.r)){toast("🏠 "+kn(b.dataset.rxhome)+" का घर अब रैक "+b.dataset.r);draw()}return}
    if((b=g("[data-rxgo]"))){if(b.disabled)return;b.disabled=true;const mk=$("#srxMk"),it=item(V.id),nq=+V.n||0;const r=await SRX.xfer(V.id,V.from,V.to,nq,!!(mk&&mk.checked));
      if(r){try{if(navigator.vibrate)navigator.vibrate([30,40,60])}catch(x){}try{if(typeof beep==="function")beep(true)}catch(x){}
        V.done={...r,n:r.n?Qn(r.n,it):""};V.id="";V.q="";V.kh="";V.to="";V.n="";draw(1);clearTimeout(V._dt);V._dt=setTimeout(()=>{if(V.done&&V.done.ts===r.ts){V.done=null;if(V.open&&V.tab==="move"&&!V.id)draw()}},6000)}
      else b.disabled=false;return}});
  s.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches(".rx-hero[data-rxcam]")){e.preventDefault();e.target.click()}})}
/* कैमरा चालू/बंद (✕ बंद से भी) → पट्टी और स्कैन-कार्ड ताज़ा */
try{new MutationObserver(()=>{if(!V.open)return;const c=camOnNow();if(c!==V._cam){V._cam=c;const a=document.activeElement;if(!(a&&/^srx/.test(a.id||"")))draw();else fit()}}).observe(document.documentElement,{attributes:true,attributeFilter:["class"]})}catch(e){}

/* स्कैन (गन/कैमरा) — स्क्रीन खुली हो तभी: खाने का स्टिकर = "कहाँ" (सामान न चुना हो तो उस खाने का सामान), सामान = चुनो */
SRX.scan=function(code){if(!SRX.isOpen())return false;const c=String(code||"").trim().toUpperCase(),m=/^R(\d{1,2}-\d{1,2})$/.exec(c);
  if(m){const k=can(m[1]);beep(true);if(typeof camFlash==="function")camFlash(true);
    if(V.tab==="move"&&V.id){if(k===V.from){toast("यह तो वही खाना है जहाँ से उठा रहे हैं — नया खाना स्कैन करें");return true}V.to=k}
    else{V.tab="move";V.q="";V.done=null;const L=SRX.at(k);if(L.length===1)pick(L[0].id,{from:k});else V.kh=k}
    draw(1);return true}
  const it=typeof findByCode==="function"?findByCode(code):null;beep(!!it);if(typeof camFlash==="function")camFlash(!!it);
  if(!it){toast("⚠ यह बारकोड ऐप में नहीं ("+code+") — पहले सामान जोड़ें");return true}
  V.tab="move";pick(it.id,V.kh?{from:V.kh}:null);draw(1);return true};

document.addEventListener("click",e=>{if(e.target.closest("[data-rkxopen]")){e.stopPropagation();SRX.open()}},true);

const css=document.createElement("style");css.textContent=`
html.srxon header{visibility:hidden}
html.srxon.camon #camwin{top:var(--rxh,104px)!important;z-index:61}
html.srxon .cartbar{display:none!important}
html.srxon .toast{z-index:80;bottom:calc(110px + env(safe-area-inset-bottom,0px))}
#srxSheet{--rxa:var(--accent,#ef5a0a);--rxa-bg:var(--accent-bg,#fff1e6);font-size:15px}
#srxSheet .rx-bar{position:fixed;left:0;right:0;top:0;z-index:62;background:var(--hdr,linear-gradient(135deg,#0d1a33,#1b3566));color:#fff;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 10px;box-shadow:0 6px 20px rgba(8,16,40,.25)}
.rx-bar1{display:flex;align-items:center;gap:10px}
.rx-back{border:0;background:rgba(255,255,255,.14);color:#fff;width:40px;height:40px;border-radius:12px;font-size:26px;line-height:1;flex:none}
.rx-ttl{flex:1;min-width:0}.rx-ttl b{display:block;font-size:18px;letter-spacing:-.01em}.rx-ttl span{display:block;font-size:12px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rx-camb{border:0;border-radius:14px;background:var(--grad,linear-gradient(135deg,#ff9a4d,#e04a00));color:#fff;font-size:20px;padding:5px 12px;display:grid;justify-items:center;line-height:1.1;flex:none;box-shadow:0 4px 12px rgba(0,0,0,.25)}
.rx-camb small{font-size:10.5px;font-weight:800}.rx-camb.on{background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
.rx-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:10px;background:rgba(255,255,255,.1);border-radius:14px;padding:4px}
.rx-seg button{border:0;background:transparent;color:#fff;opacity:.75;border-radius:11px;padding:8px 4px;font-weight:800;font-size:14px;white-space:nowrap}
.rx-seg button i{font-style:normal}.rx-seg button[aria-selected="true"]{opacity:1;background:#fff;color:#13264a;box-shadow:0 2px 8px rgba(0,0,0,.2)}
#srxSheet .rx-main{position:fixed;left:0;right:0;bottom:0;top:var(--rxh,104px);z-index:60;background:var(--bg,#f2f2f7);color:var(--ink);overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 14px calc(24px + env(safe-area-inset-bottom,0px))}
html.camon #srxSheet .rx-main{top:calc(var(--rxh,104px) + var(--camh,28vh))}
@media (min-width:900px){#srxSheet .rx-main{padding-inline:max(14px,calc(50vw - 330px))}}
.rx-card{background:var(--surface,#fff);border-radius:18px;box-shadow:var(--shadow);padding:12px}
.rx-h{margin:18px 2px 8px;font-size:15px;font-weight:900;display:flex;align-items:center;gap:8px;letter-spacing:-.01em}
.rx-h>i{font-style:normal;width:22px;height:22px;border-radius:50%;background:var(--ink);color:var(--bg);display:grid;place-items:center;font-size:12px;flex:none}
.rx-h small{font-weight:600;color:var(--muted);font-size:12px;margin-left:auto}
.rx-k{font:900 17px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.02em}
.rx-lead{margin:0 2px 10px;color:var(--muted);font-size:13px}.rx-none{margin:14px 4px;text-align:center;color:var(--muted);font-size:14px;line-height:1.5}
.rx-chev{font-style:normal;color:var(--muted);font-size:22px;flex:none}.rx-mini{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:6px 10px;font-weight:800;font-size:13px;flex:none}
/* कदम */
.rx-steps{display:flex;align-items:center;gap:6px;margin:0 2px 12px}.rx-steps u{flex:1;height:2px;background:var(--line);border-radius:2px;text-decoration:none}
.rx-step{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:var(--muted);white-space:nowrap}
.rx-step i{font-style:normal;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--line);color:var(--muted);font-size:12.5px}
.rx-step.on{color:var(--ink)}.rx-step.on i{background:var(--grad);color:#fff;box-shadow:0 3px 10px color-mix(in srgb,var(--rxa) 40%,transparent)}
.rx-step.ok{color:var(--leaf,#1f8a3c)}.rx-step.ok i{background:var(--leaf,#1f8a3c);color:#fff}
/* स्कैन कार्ड */
.rx-hero{display:flex;align-items:center;gap:14px;padding:16px;border-radius:22px;background:var(--hdr,linear-gradient(135deg,#0d1a33,#1b3566));color:#fff;box-shadow:0 10px 26px rgba(13,26,51,.28);cursor:pointer;position:relative;overflow:hidden}
.rx-hero::after{content:"";position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(255,154,77,.35),transparent 70%)}
.rx-hero.rx-cam{cursor:default;padding:9px 12px;border-radius:16px;gap:10px;box-shadow:none}.rx-hero.rx-cam .rx-bcode{width:40px;height:30px;border-radius:8px}.rx-hero.rx-cam .rx-bcode::before{inset:5px 6px}.rx-hero.rx-cam .rx-ht b{font-size:14.5px}.rx-hero.rx-cam .rx-ht span{font-size:12px;margin-top:0}.rx-hero.rx-cam::after{display:none}
.rx-bcode{width:76px;height:58px;border-radius:12px;background:#fff;position:relative;flex:none;overflow:hidden;box-shadow:inset 0 0 0 3px #fff}
.rx-bcode::before{content:"";position:absolute;inset:8px 9px;background:repeating-linear-gradient(90deg,#111 0 3px,transparent 3px 5px,#111 5px 6px,transparent 6px 9px,#111 9px 13px,transparent 13px 15px)}
.rx-bcode span{position:absolute;left:4px;right:4px;top:50%;height:2px;background:#ef4444;box-shadow:0 0 8px 2px rgba(239,68,68,.6);animation:rxlaser 1.6s ease-in-out infinite}
@keyframes rxlaser{0%,100%{transform:translateY(-16px)}50%{transform:translateY(16px)}}
.rx-ht{min-width:0;flex:1;position:relative;z-index:1}.rx-ht b{display:block;font-size:17px;line-height:1.25}.rx-ht span{display:block;font-size:13px;opacity:.8;margin-top:2px}
.rx-pre{margin:0 0 10px;padding:10px 12px;border-radius:14px;background:var(--rxa-bg);color:var(--ink);font-size:14px;border:1.5px dashed var(--rxa)}.rx-pre .lnk{margin-left:6px}
.rx-search{display:flex;align-items:center;gap:8px;margin-top:12px;background:var(--surface);border-radius:16px;padding:4px 12px;box-shadow:var(--shadow);border:1.5px solid transparent}
.rx-search:focus-within{border-color:var(--rxa)}.rx-search input{flex:1;border:0;outline:0;background:transparent;font-size:17px;padding:11px 0;color:var(--ink);min-width:0}
.rx-search button{border:0;background:var(--line);color:var(--ink);width:28px;height:28px;border-radius:50%;font-size:13px}
.rx-hits{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin-top:10px}.rx-hits:empty{display:none}
.rx-row{display:flex;gap:10px;align-items:center;text-align:left;border:0;background:var(--surface);border-radius:16px;padding:8px 10px 8px 8px;box-shadow:var(--shadow);color:var(--ink);width:100%}
.rx-row .tile,.rx-item .tile{width:50px;height:50px;flex:none;border-radius:12px}.rx-rt{flex:1;min-width:0}.rx-rt b{display:block;font-size:15px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rx-rt small{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:3px;font-size:12px;color:var(--muted)}
.rx-rt em{font-style:normal;font:800 11.5px ui-monospace,Menlo,monospace;background:var(--surface2,#f2f2f5);color:var(--ink);border-radius:8px;padding:2px 6px}.rx-rt em.m{background:var(--rxa-bg);color:var(--rxa)}
.rx-khh{display:flex;align-items:center;gap:8px;padding:2px 4px}.rx-khh b{font:900 17px ui-monospace,Menlo,monospace}.rx-khh span{flex:1;font-size:12.5px;color:var(--muted)}
.rx-tips{display:grid;gap:8px;margin-top:14px}.rx-tips>div{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:var(--surface);box-shadow:var(--shadow);font-size:13.5px;color:var(--muted)}
.rx-tips i{font-style:normal;font-size:22px}.rx-tips b{color:var(--ink)}
/* हो गया */
.rx-done{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:var(--ok-bg,#e8f7ec);border:1.5px solid var(--leaf,#1f8a3c);margin-bottom:12px;animation:rxpop .35s cubic-bezier(.2,1.4,.4,1)}
.rx-tick{width:42px;height:42px;border-radius:50%;background:var(--leaf,#1f8a3c);color:#fff;display:grid;place-items:center;font-size:24px;font-weight:900;flex:none;animation:rxtick .5s ease}
.rx-dt{flex:1;min-width:0}.rx-dt b{display:block;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rx-dt span{font-size:13px;color:var(--ink)}
.rx-done button{border:0;background:var(--surface);color:var(--ink);border-radius:10px;padding:8px 10px;font-weight:800;font-size:13px;flex:none;box-shadow:var(--shadow)}
@keyframes rxpop{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}@keyframes rxtick{0%{transform:scale(0) rotate(-40deg)}70%{transform:scale(1.2)}100%{transform:none}}
/* सामान + कहाँ से */
.rx-item{display:flex;gap:12px;align-items:center;padding:10px;border-radius:18px;background:var(--surface);box-shadow:var(--shadow)}
.rx-item .tile{width:60px;height:60px;border-radius:14px}.rx-it{flex:1;min-width:0}.rx-it b{display:block;font-size:17px;line-height:1.25}.rx-it span{font-size:13px;color:var(--muted)}
.rx-x{border:0;background:var(--surface2,#f2f2f5);color:var(--ink);width:36px;height:36px;border-radius:50%;font-size:15px;flex:none}
.rx-locs{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 6px;margin:0 -2px;scrollbar-width:none}.rx-locs::-webkit-scrollbar{display:none}
.rx-loc{flex:1 0 108px;display:grid;gap:3px;text-align:left;border:2px solid transparent;background:var(--surface);border-radius:16px;padding:10px 12px;box-shadow:var(--shadow);color:var(--ink)}
.rx-loc b{font-size:15px}.rx-loc small{font-size:11.5px;color:var(--muted)}.rx-loc .rx-k{font-size:22px}
.rx-loc.on{border-color:var(--rxa);background:var(--rxa-bg)}.rx-loc.on .rx-k{color:var(--rxa)}
.rx-n{display:flex;gap:8px;align-items:center}.rx-n button{width:52px;height:52px;border-radius:14px;border:0;background:var(--surface2,#f2f2f5);color:var(--ink);font-size:26px;font-weight:900;flex:none}
.rx-n input{flex:1;min-width:0;height:52px;text-align:center;font-size:28px;font-weight:900;border:2px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);outline:0}.rx-n input:focus{border-color:var(--rxa)}
.rx-n span{font-weight:800;color:var(--muted);font-size:14px}
.rx-qc{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}.rx-qc button{flex:1;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:11px;padding:8px 6px;font-weight:800;font-size:14px;white-space:nowrap}
.rx-qc button.on{border-color:transparent;background:var(--grad);color:#fff}
/* कहाँ रखना */
.rx-tor{display:flex;align-items:center;gap:8px}.rx-pin{font-size:22px}
.rx-tor input{width:96px;flex:none;height:50px;text-align:center;font:900 24px ui-monospace,Menlo,monospace;border:2px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);outline:0;text-transform:uppercase}
.rx-tor input:focus{border-color:var(--rxa)}.rx-toh{flex:1;font-size:13px;color:var(--muted);line-height:1.35}
.rx-now{margin:8px 2px 0;font-size:13px;color:var(--muted)}
.rx-sug{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}
.rx-sug button{display:grid;gap:3px;justify-items:start;text-align:left;border:1.5px solid var(--line);background:var(--surface);border-radius:13px;padding:8px 9px;color:var(--ink);min-width:0}
.rx-sug small{font-size:11px;color:var(--muted);line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.rx-sug button.on{border-color:var(--rxa);background:var(--rxa-bg)}.rx-sug button.on .rx-k{color:var(--rxa)}
.rx-route{display:flex;align-items:center;gap:8px;margin-top:14px;padding:12px;border-radius:18px;background:var(--surface);box-shadow:var(--shadow);animation:rxpop .3s ease}
.rx-rb{flex:1;display:grid;gap:4px;justify-items:center;padding:10px 6px;border-radius:14px;background:var(--surface2,#f2f2f5)}.rx-rb .rx-k{font-size:22px}.rx-rb small{font-size:12px;color:var(--muted)}.rx-rb small b{color:var(--ink)}
.rx-rb.to{background:var(--ok-bg,#e8f7ec)}.rx-rb.to .rx-k{color:var(--leaf,#1f8a3c)}
.rx-ar{display:grid;justify-items:center;gap:4px;flex:none}.rx-ar b{font-size:13px;white-space:nowrap;background:var(--grad);color:#fff;border-radius:99px;padding:3px 10px}
.rx-ar i{width:54px;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--line),var(--rxa));position:relative}
.rx-ar i::after{content:"";position:absolute;right:-2px;top:-5px;border:6.5px solid transparent;border-left-color:var(--rxa)}
.rx-mk{display:flex;gap:10px;align-items:center;margin:12px 4px 0;font-size:14px}.rx-mk input{width:22px;height:22px;accent-color:var(--rxa);flex:none}
.rx-cta{position:sticky;bottom:0;margin:14px -14px calc(-24px - env(safe-area-inset-bottom,0px));padding:12px 14px calc(14px + env(safe-area-inset-bottom,0px));background:linear-gradient(to top,var(--bg) 72%,transparent)}
#srxSheet .rx-go{width:100%;font-size:17px;padding:16px 10px;border-radius:16px;margin:0}
#srxSheet .rx-go:disabled{background:var(--line)!important;color:var(--muted)!important;box-shadow:none!important;text-shadow:none}
.rx-log{padding:4px 12px}.rx-li{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px}.rx-li:last-child{border:0}
.rx-li span{min-width:0}.rx-li b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rx-li small{display:block;color:var(--muted);font-size:12px}
/* रैक देखें */
.rx-racks{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rx-rack{display:grid;gap:3px;text-align:left;border:0;background:var(--surface);border-radius:18px;padding:12px;box-shadow:var(--shadow);color:var(--ink);position:relative;min-width:0}
.rx-rn{position:absolute;right:10px;top:8px;font:900 26px/1 ui-monospace,Menlo,monospace;color:var(--rxa);opacity:.9}
.rx-rack b{font-size:14.5px;line-height:1.25;padding-right:36px;min-height:36px}.rx-rack small{font-size:12px;color:var(--muted)}
.rx-bar2{display:block;height:6px;border-radius:6px;background:var(--line);margin-top:6px;overflow:hidden}.rx-bar2 u{display:block;height:100%;background:var(--grad);border-radius:6px}
.rx-rkh{display:flex;align-items:center;gap:10px;margin-bottom:8px}.rx-rkh b{font-size:16px}
.rx-cells{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.rx-cell{display:grid;gap:2px;justify-items:center;border:2px solid transparent;background:var(--surface);border-radius:14px;padding:10px 4px;box-shadow:var(--shadow);color:var(--ink)}
.rx-cell b{font:900 20px/1 ui-monospace,Menlo,monospace}.rx-cell span{font-size:11.5px;color:var(--muted)}
.rx-cell.empty{background:transparent;border:2px dashed var(--line);box-shadow:none}.rx-cell.empty b{color:var(--muted)}
.rx-cell.mix{background:var(--warn-bg,#fff4e0)}.rx-cell.on{border-color:var(--rxa);background:var(--rxa-bg)}.rx-cell.on b{color:var(--rxa)}.rx-cell.gone{opacity:.45;box-shadow:none;background:transparent}
.rx-legend{display:flex;gap:14px;justify-content:center;margin:10px 0 0;font-size:12px;color:var(--muted)}.rx-legend i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:5px;vertical-align:-1px;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.rx-legend i.e{background:transparent;box-shadow:none;border:1.5px dashed var(--muted)}.rx-legend i.m{background:var(--warn-bg,#fff4e0);box-shadow:0 0 0 1px #f59e0b}
.rx-here{display:grid;justify-items:end;gap:1px;flex:none}.rx-here b{font-size:15px}.rx-here small{font-size:11.5px;color:var(--rxa);font-weight:800}
#srxSheet .rx-put{width:100%;margin:12px 0 0;font-size:15px;padding:13px}
/* सुझाव */
.rx-score{display:flex;align-items:center;gap:14px;padding:14px;border-radius:22px;background:var(--hdr,linear-gradient(135deg,#0d1a33,#1b3566));color:#fff;box-shadow:0 10px 26px rgba(13,26,51,.28)}
.rx-ring{--p:0;width:76px;height:76px;border-radius:50%;flex:none;display:grid;place-items:center;background:conic-gradient(#ff9a4d calc(var(--p)*1%),rgba(255,255,255,.16) 0);position:relative}
.rx-ring::before{content:"";position:absolute;inset:8px;border-radius:50%;background:#14284f}.rx-ring b{position:relative;font-size:19px}
.rx-score>div:last-child b{display:block;font-size:17px}.rx-score span{display:block;font-size:13px;opacity:.85;margin-top:2px;line-height:1.4}.rx-score strong{color:#ffd0a8}.rx-score em{font-style:normal;color:#ffb4b4}
.rx-rules{display:flex;gap:6px;overflow-x:auto;margin:10px -14px 0;padding:0 14px 2px;scrollbar-width:none}.rx-rules::-webkit-scrollbar{display:none}
.rx-rules span{flex:none;font-size:12.5px;font-weight:700;background:var(--surface);border-radius:99px;padding:6px 11px;box-shadow:var(--shadow);color:var(--ink)}
.rx-mv{display:flex;align-items:center;gap:4px;flex:none}.rx-mv em{font-style:normal;font:800 12.5px ui-monospace,Menlo,monospace;background:var(--surface2,#f2f2f5);border-radius:8px;padding:4px 7px;color:var(--ink)}
.rx-mv em.t{background:var(--ok-bg,#e8f7ec);color:var(--leaf,#1f8a3c)}.rx-mv i{font-style:normal;color:var(--muted)}
.rx-more{display:block;width:100%;margin-top:8px;border:0;background:transparent;color:var(--rxa);font-weight:800;font-size:14px;padding:8px}
.rx-kind{margin-bottom:8px}.rx-kind.need{box-shadow:var(--shadow),inset 0 0 0 1.5px #f59e0b}
.rx-kh2{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rx-kh2 b{font-size:15px}.rx-kh2 span{font-size:12px;color:var(--muted)}
.rx-kh2 em{font-style:normal;margin-left:auto;font-size:12px;font-weight:800;border-radius:99px;padding:3px 9px}.rx-kh2 em.ok{background:var(--ok-bg,#e8f7ec);color:var(--leaf,#1f8a3c)}.rx-kh2 em.no{background:var(--warn-bg,#fff4e0);color:var(--warn-ink,#9a4d00)}
.rx-stack{display:flex;gap:2px;height:12px;border-radius:8px;overflow:hidden;margin:9px 0 7px}.rx-stack i{min-width:5px}
.rx-leg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--muted)}.rx-leg i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:4px}
.rx-pick{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px;padding-top:9px;border-top:1px dashed var(--line)}.rx-pick small{font-size:12.5px;color:var(--muted);font-weight:700}
.rx-pick button{border:1.5px solid var(--rxa);background:var(--rxa-bg);color:var(--ink);border-radius:10px;padding:6px 11px;font-weight:800;font-size:13px}
.rx-mix{padding:2px 10px}.rx-mix button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:var(--ink);padding:10px 2px;border-bottom:1px solid var(--line);text-align:left}.rx-mix button:last-child{border:0}.rx-mix small{flex:1;font-size:12.5px;color:var(--muted)}
.rx-emp>div{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line)}.rx-emp>div:last-child{border:0}.rx-emp b{flex:none;width:52px;font-size:13px;padding-top:5px}
.rx-emp span{display:flex;flex-wrap:wrap;gap:5px}.rx-emp button{border:1.5px dashed var(--line);background:transparent;color:var(--ink);border-radius:9px;padding:4px 8px;font:800 12.5px ui-monospace,Menlo,monospace}
/* बिलिंग की पट्टी में औज़ार वाले बटन + टाइल का 📍 */
.cats .chip.toolchip{background:var(--surface)!important;color:var(--ink)!important;box-shadow:var(--shadow),inset 0 0 0 1.5px var(--line)!important;font-weight:800}
.cats .chip.rkxchip{box-shadow:var(--shadow),inset 0 0 0 1.5px #0ea5e9!important;color:#0369a1!important}
.chip.rkxchip{background:var(--surface);color:#0369a1;font-weight:800;box-shadow:inset 0 0 0 1.5px #0ea5e9}
.card .rkb2{top:24px}.rkb i{font-style:normal;opacity:.85}
@media (prefers-color-scheme:dark){html:not([data-theme="light"]) .cats .chip.rkxchip,html:not([data-theme="light"]) .chip.rkxchip{color:#7dd3fc!important}html:not([data-theme="light"]) .rx-seg button[aria-selected="true"]{background:#f5f5f7}}
@media (prefers-reduced-motion:reduce){.rx-bcode span,.rx-done,.rx-tick,.rx-route{animation:none}}`;
document.head.appendChild(css);
})();
