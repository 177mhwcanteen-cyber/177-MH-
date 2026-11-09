/* 📍 रैक बदलें · माल ट्रांसफ़र (window.SRX) — विक्रम जी, 09-11-2026 · पूरा नियम: docs/रैक-बदलना-प्रॉम्प्ट.txt
   स्कैन/खोज → "यह सामान कहाँ-कहाँ, कितना" → कितने, कहाँ (खाने का स्टिकर स्कैन) → ↔ भेजें। कोई भी साथी कर सकता है।
   डेटा (पुराना कुछ नहीं बदलता, सिर्फ़ जुड़ता है):
   • items.rack = मुख्य खाना (पहले जैसा)। items.rkx = {"6-2":3} = मुख्य के अलावा बाकी खानों में कितने (मालिक लिखता है) + rkxTs।
     मुख्य खाने में = कुल स्टॉक − बाकी खानों का जोड़ (बिक्री मुख्य से घटती मानी)। स्टॉक का कुल (pstock) कभी नहीं बदलता।
   • हर ट्रांसफ़र days/<आज>/meta/rkx में {id,from,to,n,rack,x,prack,px,byName,ts} — साथी के फोन से भी (नियम: meta सब लिख सकते हैं; rack भी)।
     मालिक का ऐप (SRX.sync) नए वाले items.rkx में लिखता है। जब तक नहीं लिखा, हर फोन आख़िरी ट्रांसफ़र से हालत जोड़ लेता है।
   • 🧠 सुझाव: किस्म का असली घर = उस किस्म का सबसे ज़्यादा सामान जिस रैक में (डेटा से), न हो तो SRK.home। बाहर वाले, दो जगह वाले,
     मिले-जुले खाने, खाली खाने — सिर्फ़ दिखते हैं, टैप = वही ट्रांसफ़र भरकर खुलता है। अपने-आप कुछ नहीं बदलता। */
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

/* ---------- 🧠 जमावट: डेटा से किस्म का असली घर ---------- */
const kind=it=>{const h=window.SRK&&SRK.home?SRK.home(it):null;return {k:(it.sub||(typeof mcat==="function"?mcat(it):it.cat)||"x"),h}};
const rkN=c=>{const m=/^(\d{1,2})-/.exec(c||"");return m?+m[1]:0};
const KN={rashan:"आटा-दाल-चावल",oil:"तेल-घी",masala:"मसाले",achar:"अचार-सॉस",dryfruit:"ड्राई फ्रूट",drinks:"चाय-कॉफ़ी-शरबत-ड्रिंक",namkeen:"नमकीन",sweet:"बिस्किट-मीठा",personal:"साबुन-पेस्ट",hair:"बाल",clean:"सफ़ाई",pooja:"पूजा",bakery:"बेकरी",stationery:"स्टेशनरी"};
const kn=k=>KN[k]||k;
SRX.zones=function(){const Z={};act().forEach(it=>{if(typeof isTob==="function"&&isTob(it))return;const r=rkN(can(it.rack));if(!r||r>=31)return;const {k}=kind(it);(Z[k]=Z[k]||{n:0,r:{},kh:{}}).n++;Z[k].r[r]=(Z[k].r[r]||0)+1;const c=can(it.rack);Z[k].kh[c]=(Z[k].kh[c]||0)+1});
  Object.entries(Z).forEach(([k,z])=>{const top=Object.entries(z.r).sort((a,b)=>b[1]-a[1])[0];z.home=top&&top[1]>=3&&top[1]/z.n>=.4?+top[0]:0;z.spread=Object.keys(z.r).length;
    z.khHome=z.home?Object.entries(z.kh).filter(([c])=>rkN(c)===z.home).sort((a,b)=>b[1]-a[1]).map(([c])=>c):[]});return Z};
SRX.empty=function(r){if(!(window.SRK&&SRK.RL))return [];const used=new Set();act().forEach(i=>{const c=can(i.rack);if(c)used.add(c);Object.keys(SRX.state(i).x).forEach(k=>used.add(k))});
  const out=[];SRK.RL.filter(x=>!r||x.r===+r).forEach(x=>{if(x.r>=31&&!r)return;for(let k=1;k<=x.n;k++){const c=x.r+"-"+k;if(!used.has(c))out.push(c)}});return out};
SRX.ideas=function(){const Z=SRX.zones(),I=[];
  act().forEach(it=>{if(typeof isTob==="function"&&isTob(it))return;const c=can(it.rack),r=rkN(c);if(!r||r>=31)return;const {k,h}=kind(it),z=Z[k];
    if(z&&z.home&&r!==z.home&&z.n>=3)I.push({t:"out",it,w:3,from:c,to:z.khHome[0]||"",why:`बाकी ${z.r[z.home]} ${kn(k)} रैक ${z.home} में — यह अकेला ${c} में`});
    else if(!z||!z.home){if(h&&h.r&&r!==h.r)I.push({t:"home",it,w:1,from:c,to:"",why:`नक्शे में ${h.t} का घर रैक ${h.r}`})}
    const m=SRX.more(it);if(m)I.push({t:"two",it,w:2,from:Object.keys(SRX.state(it).x)[0],to:c,why:`एक ही सामान ${m+1} जगह — एक जगह करें (मुख्य ${c})`})});
  const KH={};act().forEach(it=>{const c=can(it.rack);if(!rkN(c))return;(KH[c]=KH[c]||new Set()).add(kind(it).k)});
  const mixed=Object.entries(KH).filter(([,s])=>s.size>=3).map(([c,s])=>({c,ks:[...s].map(kn)}));
  return {I:I.sort((a,b)=>b.w-a.w),mixed,Z}};

/* ---------- 🖥️ शीट ---------- */
const V={open:false,id:"",from:"",to:"",n:"",mk:false,q:"",tab:"move",kh:""};
SRX.chipHTML=()=>`<button class="chip rkxchip" data-rkxopen>📍 रैक बदलें</button>`;
SRX.open=function(id,o){V.open=true;V.tab="move";V.q="";V.kh="";if(id)pick(id,o);else{V.id="";V.from="";V.to="";V.n="";V.mk=false}
  if(!loaded)pull(S.isOwner?14:3).then(()=>{if(V.open)draw()});draw();setTimeout(()=>{const q=$("#srxQ");if(q&&!V.id)q.focus()},60)};
SRX.close=function(){V.open=false;const s=$("#srxSheet");if(s)s.remove();document.documentElement.classList.remove("srxon")};
SRX.isOpen=()=>V.open&&!!$("#srxSheet");
function pick(id,o){const it=item(id);if(!it)return;V.id=id;const L=SRX.locs(it);o=o||{};
  V.from=can(o.from)||(L[0]&&L[0].k)||"";V.to=can(o.to)||"";const f=L.find(l=>l.k===V.from);V.n=o.n||(f&&f.q!=null?f.q:"");V.mk=false;V.kh=""}
function hits(q){q=String(q||"").trim().toLowerCase();if(!q)return [];const bc=typeof findByCode==="function"?findByCode(q):null;
  const L=act().filter(i=>((i.name||"")+" "+(i.short||"")+" "+(i.hi||"")+" "+(i.alias||"")).toLowerCase().includes(q)||String(i.code||"")===q);if(bc&&!L.includes(bc))L.unshift(bc);return L.slice(0,10)}
const locChip=l=>`<button type="button" class="rx-loc${V.from===l.k?" on":""}" data-rxfrom="${H(l.k)}"><b>📍 ${H(l.k||"जगह नहीं")}</b><span>${l.q==null?"? (गिनती नहीं)":l.q+" पीस"}${l.main?" · मुख्य":""}</span></button>`;
function toIdeas(it){const out=[],seen=new Set(),add=(c,t)=>{c=can(c);if(!c||c===V.from||seen.has(c))return;seen.add(c);out.push([c,t])};
  SRX.locs(it).forEach(l=>add(l.k,l.main?"मुख्य जगह":"यहाँ भी पड़ा"));
  const Z=SRX.zones(),{k,h}=kind(it),z=Z[k];if(z&&z.home)z.khHome.slice(0,2).forEach(c=>add(c,kn(k)+" यहीं"));
  if(it.brand){const sib=act().filter(i=>i.id!==it.id&&i.brand===it.brand&&can(i.rack));const m={};sib.forEach(i=>{const c=can(i.rack);m[c]=(m[c]||0)+1});Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,2).forEach(([c])=>add(c,it.brand+" यहीं"))}
  const hr=z&&z.home?z.home:h&&h.r;if(hr)SRX.empty(hr).slice(0,2).forEach(c=>add(c,"खाली खाना"));
  return out.slice(0,6)}
function moveHTML(){const it=V.id?item(V.id):null;
  if(!it){const L=V.kh?SRX.at(V.kh):hits(V.q);
    return `<div class="rx-scan"><span class="rx-big">📷</span><div><b>सामान स्कैन करें</b><span>या नाम / 4 अंक कोड लिखें · खाने का स्टिकर स्कैन = उस खाने का सामान</span></div></div>
    <div class="rx-qrow"><input id="srxQ" class="inp" placeholder="🔍 नाम / कोड / बारकोड" value="${H(V.q)}" autocomplete="off" enterkeyhint="search"><button type="button" class="rx-cam" data-rxcam aria-label="कैमरा">📷</button></div>
    ${V.kh?`<p class="note" style="margin:6px 0">📍 ${H(V.kh)} · ${H(window.SRK?SRK.info(V.kh):"")} — ${L.length?"इनमें से चुनें":"खाली है"}</p>`:""}
    <div class="rx-hits">${L.map(i=>{const l=SRX.locs(i);return `<button type="button" data-rxpick="${H(i.id)}">${tileHTML(i)}<span><b>${H(NM(i))}</b><small>${l.map(x=>"📍"+H(x.k||"—")+(x.q!=null?" · "+x.q:"")).join("  ")||"जगह नहीं"}</small></span></button>`}).join("")}</div>`}
  const L=SRX.locs(it),f=L.find(l=>l.k===V.from)||L[0],tot=qty(it),T=toIdeas(it),n=+V.n||0,can2=!!(V.to&&(n>0||!L[0].k));
  const all=f&&f.main&&f.q!=null&&n>=f.q;
  return `<div class="rx-it">${tileHTML(it)}<div><b>${H(NM(it))}</b><span>${it.code?"#"+H(it.code)+" · ":""}कुल ${tot==null?"? (स्टॉक गिनती नहीं)":tot+" पीस"}</span></div><button type="button" class="lnk" data-rxnew>बदलें</button></div>
  <div class="rx-h">① कहाँ से (कहाँ-कहाँ पड़ा है)</div><div class="rx-locs">${L.map(locChip).join("")}</div>
  ${L[0].k?`<div class="rx-h">② कितने ले जाने हैं</div>
  <div class="rx-n"><button type="button" data-rxn="-1" aria-label="एक कम">−</button><input id="srxN" inputmode="decimal" value="${H(V.n)}" placeholder="0" aria-label="कितने"><button type="button" data-rxn="1" aria-label="एक ज़्यादा">＋</button>${f&&f.q!=null?`<button type="button" class="chip" data-rxall>सब ${f.q}</button>`:""}</div>`:""}
  <div class="rx-h">${L[0].k?"③":"①"} कहाँ रखना है <small>— खाने का स्टिकर स्कैन करें</small></div>
  <div class="rx-qrow"><input id="srxTo" class="inp code" placeholder="6-2" value="${H(V.to)}" autocomplete="off" inputmode="text"><button type="button" class="rx-cam" data-rxcam aria-label="कैमरा">📷</button></div>
  ${V.to&&window.SRK?`<p class="note rx-info">📍 ${H(V.to)} · ${H(SRK.info(V.to)||"⚠ नक्शे में नहीं")}${SRX.at(V.to).length?" · अभी: "+SRX.at(V.to).slice(0,3).map(i=>H(NM(i))).join(", "):" · खाली"}</p>`:""}
  ${T.length?`<div class="rx-sug">${T.map(([c,t])=>`<button type="button" data-rxto="${H(c)}"${V.to===c?' class="on"':""}><b>${H(c)}</b><small>${H(t)}</small></button>`).join("")}</div>`:""}
  ${L[0].k&&V.to&&V.to!==L[0].k?`<label class="rx-mk"><input type="checkbox" id="srxMk" ${V.mk||all?"checked":""} ${all?"disabled":""}> अब से <b>${H(V.to)}</b> ही इसकी मुख्य जगह${all?" (सारा माल जा रहा है)":""}</label>`:""}
  <button class="big rx-go" data-rxgo ${can2?"":"disabled"}>${!L[0].k?`📍 ${H(V.to||"…")} पर रखें`:`↔ ${n||"…"} पीस  ${H(V.from)} → ${H(V.to||"…")}  भेजें`}</button>`}
function logHTML(){const L=LOG.slice(0,12);if(!L.length)return "";
  return `<div class="rx-log"><div class="rx-h">✓ आज के ट्रांसफ़र</div>${L.map(e=>`<div class="rx-li"><span>${e.undo?"↩ ":""}<b>${H(e.name)}</b> ${e.n?e.n+" पीस ":""}${H(e.from||"—")} → ${H(e.to)}<small>${H(e.byName||"")} · ${new Date(e.ts).toLocaleTimeString("hi-IN",{hour:"2-digit",minute:"2-digit"})}</small></span>${e.by===(S.uid||"")&&!e.undo?`<button type="button" class="lnk" data-rxundo="${e.ts}">↩</button>`:""}</div>`).join("")}</div>`}
function ideasHTML(){const {I,mixed,Z}=SRX.ideas(),E=SRX.empty();
  const zs=Object.entries(Z).filter(([,z])=>z.n>=3).sort((a,b)=>b[1].spread-a[1].spread);
  return `<p class="note" style="margin:0 0 8px">सुपरमार्केट का नियम: <b>एक किस्म = एक जगह</b> · भारी नीचे · तेज़ बिकने वाला आँख-हाथ की ऊँचाई पर · पुराना माल आगे (FEFO) · खाली खाना नए सामान के लिए। टैप करें = ट्रांसफ़र तैयार।</p>
  <div class="rx-h">🗺️ किस्म कहाँ-कहाँ बिखरी</div><div class="rx-zs">${zs.map(([k,z])=>`<div class="rx-z${z.spread>2?" bad":""}"><b>${H(kn(k))}</b><span>${Object.entries(z.r).sort((a,b)=>b[1]-a[1]).map(([r,c])=>`रैक ${r}${+r===z.home?"★":""}: ${c}`).join(" · ")}</span></div>`).join("")||'<p class="note">अभी कम सामान — और सामान आने पर बेहतर सुझाव।</p>'}</div>
  <div class="rx-h">🔀 ले जाएँ (${I.length})</div><div class="rx-ideas">${I.slice(0,60).map(x=>`<button type="button" data-rxidea="${H(x.it.id)}" data-f="${H(x.from||"")}" data-t="${H(x.to||"")}">${tileHTML(x.it)}<span><b>${H(NM(x.it))}</b><small>📍${H(x.from)}${x.to?" → "+H(x.to):""} · ${H(x.why)}</small></span></button>`).join("")||'<p class="note">✅ सब अपनी किस्म के साथ।</p>'}</div>
  ${mixed.length?`<div class="rx-h">🧺 मिले-जुले खाने (एक खाने में 3+ किस्म)</div><p class="note">${mixed.map(m=>`<b>${H(m.c)}</b>: ${H(m.ks.join(", "))}`).join("<br>")}</p>`:""}
  <div class="rx-h">⬜ खाली खाने — नया सामान यहाँ (${E.length})</div><p class="note rx-empty">${E.slice(0,80).map(H).join(" · ")||"—"}</p>`}
function draw(){if(!V.open)return;let s=$("#srxSheet");
  if(!s){s=document.createElement("div");s.id="srxSheet";s.setAttribute("role","dialog");s.setAttribute("aria-label","रैक बदलें");document.body.appendChild(s);bind(s)}
  document.documentElement.classList.add("srxon");
  s.innerHTML=`<div class="rx-top"><b>📍 रैक बदलें · माल ट्रांसफ़र</b><button type="button" class="rx-x" data-rxclose aria-label="बंद">✕</button></div>
  <div class="rx-tabs"><button type="button" data-rxtab="move" aria-pressed="${V.tab==="move"}">↔ ट्रांसफ़र</button><button type="button" data-rxtab="idea" aria-pressed="${V.tab==="idea"}">🧠 सुझाव</button></div>
  <div class="rx-body">${V.tab==="idea"?ideasHTML():moveHTML()+logHTML()}</div>`}
function bind(s){
  s.addEventListener("input",e=>{const t=e.target;if(t.id==="srxQ"){V.q=t.value;V.kh="";const p=t.selectionStart;draw();const q=$("#srxQ");if(q){q.focus();try{q.setSelectionRange(p,p)}catch(x){}}}
    else if(t.id==="srxN"){V.n=t.value;upBtn()}else if(t.id==="srxTo"){V.to=can(t.value)}else if(t.id==="srxMk")V.mk=t.checked});
  s.addEventListener("change",e=>{if(e.target.id==="srxTo"){V.to=can(e.target.value);draw()}});
  s.addEventListener("keydown",e=>{if(e.key!=="Enter")return;const t=e.target;
    if(t.id==="srxQ"){e.preventDefault();const c=t.value.trim();if(window.SRK&&/^R?\d{1,2}-\d{1,2}$/i.test(c)){SRX.scan(/^R/i.test(c)?c:"R"+c);return}const L=hits(c);if(L.length===1||(L[0]&&typeof findByCode==="function"&&findByCode(c)===L[0])){pick(L[0].id);draw()}}
    else if(t.id==="srxTo"){e.preventDefault();V.to=can(t.value);draw()}else if(t.id==="srxN"){e.preventDefault();const x=$("#srxTo");if(x)x.focus()}});
  s.addEventListener("click",async e=>{const g=x=>e.target.closest(x);let b;
    if(g("[data-rxclose]")){SRX.close();return}
    if((b=g("[data-rxtab]"))){V.tab=b.dataset.rxtab;draw();return}
    if((b=g("[data-rxpick]"))){pick(b.dataset.rxpick,V.kh?{from:V.kh}:null);draw();return}
    if(g("[data-rxnew]")){V.id="";V.q="";V.kh="";draw();setTimeout(()=>{const q=$("#srxQ");if(q)q.focus()},30);return}
    if((b=g("[data-rxfrom]"))){V.from=b.dataset.rxfrom;const l=SRX.locs(item(V.id)).find(x=>x.k===V.from);V.n=l&&l.q!=null?l.q:"";draw();return}
    if((b=g("[data-rxn]"))){V.n=Math.max(0,(+V.n||0)+(+b.dataset.rxn));draw();return}
    if(g("[data-rxall]")){const l=SRX.locs(item(V.id)).find(x=>x.k===V.from);if(l&&l.q!=null)V.n=l.q;draw();return}
    if((b=g("[data-rxto]"))){V.to=b.dataset.rxto;draw();return}
    if(g("[data-rxcam]")){if(typeof camOn==="function")camOn();return}
    if((b=g("[data-rxundo]"))){if(await SRX.undo(b.dataset.rxundo))draw();return}
    if((b=g("[data-rxidea]"))){V.tab="move";pick(b.dataset.rxidea,{from:b.dataset.f,to:b.dataset.t});draw();return}
    if(g("[data-rxgo]")){const mk=$("#srxMk");const r=await SRX.xfer(V.id,V.from,V.to,+V.n||0,mk&&mk.checked);
      if(r){try{if(navigator.vibrate)navigator.vibrate(40)}catch(x){}toast("✅ "+r.name+(r.n?" · "+r.n+" पीस":"")+" "+(r.from||"")+" → "+r.to+(r.rack!==r.prack&&r.prack?" · मुख्य जगह अब "+r.rack:""));
        V.id="";V.q="";V.kh="";V.to="";V.n="";draw();setTimeout(()=>{const q=$("#srxQ");if(q)q.focus()},30)}return}});}
function upBtn(){const b=$("[data-rxgo]");if(!b)return;const it=item(V.id);if(!it)return;const n=+V.n||0,L=SRX.locs(it);
  b.disabled=!(V.to&&(n>0||!L[0].k));if(L[0].k)b.textContent=`↔ ${n||"…"} पीस  ${V.from} → ${V.to||"…"}  भेजें`}

/* स्कैन (गन/कैमरा) — शीट खुली हो तभी: खाने का स्टिकर = "कहाँ" (या सामान न चुना हो तो उस खाने का सामान), सामान = चुनो */
SRX.scan=function(code){if(!SRX.isOpen())return false;const c=String(code||"").trim().toUpperCase(),m=/^R(\d{1,2}-\d{1,2})$/.exec(c);
  if(m){const k=can(m[1]);beep(true);if(V.id){if(k===V.from){toast("यह तो 'कहाँ से' वाला खाना है — दूसरा स्कैन करें");return true}V.to=k}else{V.kh=k;V.q="";const L=SRX.at(k);if(L.length===1){pick(L[0].id,{from:k})}}
    V.tab="move";draw();return true}
  const it=typeof findByCode==="function"?findByCode(code):null;beep(!!it);if(!it){toast("यह बारकोड ऐप में नहीं");return true}
  V.tab="move";pick(it.id,V.kh?{from:V.kh}:null);draw();return true};

document.addEventListener("click",e=>{if(e.target.closest("[data-rkxopen]")){e.stopPropagation();SRX.open()}},true);

const css=document.createElement("style");css.textContent=`
#srxSheet{position:fixed;inset:0;z-index:60;background:var(--bg,#fff);display:flex;flex-direction:column;overflow:hidden}
html.camon #srxSheet{top:var(--camh)}
.rx-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;font-size:17px}
.rx-x{border:0;background:#ffffff26;color:#fff;font-size:20px;width:40px;height:40px;border-radius:12px}
.rx-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 12px 0}.rx-tabs button{border:1.5px solid var(--line);background:var(--surface);border-radius:12px;padding:9px;font-weight:800;font-size:15px}
.rx-tabs button[aria-pressed="true"]{background:#0f766e;color:#fff;border-color:#0f766e}
.rx-body{flex:1;overflow:auto;padding:10px 12px 90px;-webkit-overflow-scrolling:touch}
.rx-scan{display:flex;gap:12px;align-items:center;padding:12px;border:2px dashed #0f766e;border-radius:16px;background:#f0fdfa;margin-bottom:10px}.rx-scan b{display:block;font-size:17px}.rx-scan span{font-size:13px;color:var(--muted,#555)}.rx-big{font-size:34px}
.rx-qrow{display:flex;gap:6px}.rx-qrow .inp{flex:1;font-size:19px}.rx-cam{border:0;border-radius:12px;background:#0f766e;color:#fff;font-size:22px;width:52px}
.rx-hits,.rx-ideas{display:grid;gap:6px;margin-top:8px}.rx-hits button,.rx-ideas button{display:flex;gap:10px;align-items:center;text-align:left;border:1.5px solid var(--line);background:var(--surface);border-radius:14px;padding:6px}
.rx-hits .tile,.rx-ideas .tile,.rx-it .tile{width:46px;height:46px;flex:none;border-radius:10px}.rx-hits small,.rx-ideas small{display:block;font:700 12px/1.35 monospace;color:#0f766e}.rx-ideas small{font-family:inherit;color:var(--muted,#555);font-weight:600}
.rx-it{display:flex;gap:10px;align-items:center;padding:8px;border-radius:16px;background:#f0fdfa;border:1.5px solid #99f6e4}.rx-it>div{flex:1}.rx-it b{display:block;font-size:17px}.rx-it span{font-size:13px}
.rx-h{margin:14px 0 6px;font-weight:900;font-size:15px}.rx-h small{font-weight:600;color:var(--muted,#666)}
.rx-locs{display:flex;flex-wrap:wrap;gap:6px}.rx-loc{border:2px solid var(--line);background:var(--surface);border-radius:14px;padding:8px 12px;text-align:left}.rx-loc b{display:block;font:900 18px monospace}.rx-loc span{font-size:12px}
.rx-loc.on{border-color:#0f766e;background:#ccfbf1}
.rx-n{display:flex;gap:6px;align-items:center}.rx-n button{width:48px;height:48px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);font-size:24px;font-weight:900}.rx-n input{width:90px;height:48px;text-align:center;font-size:24px;font-weight:900;border:2px solid #0f766e;border-radius:12px}
.rx-n .chip{width:auto;height:auto;font-size:14px;padding:10px 12px}
.rx-sug{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.rx-sug button{border:1.5px solid #99f6e4;background:#f0fdfa;border-radius:12px;padding:6px 10px;text-align:left}.rx-sug b{display:block;font:900 16px monospace;color:#0f766e}.rx-sug small{font-size:11px}
.rx-sug button.on{background:#0f766e}.rx-sug button.on b,.rx-sug button.on small{color:#fff}
.rx-info{margin:6px 2px 0}.rx-mk{display:flex;gap:8px;align-items:center;margin:12px 2px 0;font-size:15px}.rx-mk input{width:22px;height:22px}
.rx-go{margin-top:14px;background:linear-gradient(135deg,#0f766e,#14b8a6)!important;color:#fff!important;font-size:18px}
.rx-log{margin-top:16px;border-top:1px dashed var(--line);padding-top:6px}.rx-li{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px}.rx-li small{display:block;color:var(--muted,#666);font-size:11px}
.rx-zs{display:grid;gap:4px}.rx-z{padding:6px 10px;border-radius:10px;background:var(--surface);border:1px solid var(--line);font-size:13px}.rx-z b{margin-right:6px}.rx-z.bad{border-color:#f59e0b;background:#fffbeb}
.rx-empty{font:700 12px/1.6 monospace}
.chip.rkxchip{background:#0f766e;color:#fff;border-color:#0f766e}
.card .rkb2{top:24px}.rkb i{font-style:normal;opacity:.85}
@media (prefers-color-scheme:dark){.rx-scan,.rx-it,.rx-sug button{background:#042f2e}.rx-loc.on{background:#134e4a}.rx-z.bad{background:#451a03}}`;
document.head.appendChild(css);
})();
