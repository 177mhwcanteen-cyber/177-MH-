/* 🪙 SKH — खुले का डिब्बा (विक्रम जी, 09-11-2026): गल्ले में एक पक्की रकम (≈ ₹10,000) सिर्फ़ खुले देने के लिए।
   • डिब्बे की रकम हमेशा उतनी ही रहती है — सिर्फ़ नोट बदलते हैं: ग्राहक/साथी का ₹500 डाला → 10×₹50 निकाले (डाले = निकाले)।
   • ₹10/20/50 वगैरह कम हों तो चेतावनी → "➕ रिफिल" (बैंक/दुकान से खुले लाए, बड़े नोट दिए) — वह भी बराबर-बराबर।
   • यह डिब्बा गल्ले की गिनती/"होना चाहिए" में नहीं गिना जाता (अलग थैली/खाना)।
   • डेटा: days/<तारीख>/meta/khula {n500,n200,…,n1, ts} (हर दिन पिछले दिन से आगे) + हर बदलाव days/<तारीख>/galla (kind "khula", total 0) — मालिक को कौन/कब/क्या।
   • मालिक: डिब्बा गिनकर सेट करें (kind "kset") और हर नोट का "चाहिए" (settings/main.khulaT)। */
(function(){
"use strict";
const SKH=window.SKH={};
const DN=[500,200,100,50,20,10,5,2,1];
const SMALL=[100,50,20,10,5,2,1];
const DEF_T={100:30,50:60,20:100,10:150,5:60,2:50,1:100};/* = ₹10,000 */
const num=v=>{const n=parseFloat(String(v==null?"":v).replace(/[^\d.\-]/g,""));return isFinite(n)?n:0};
const K=v=>"n"+v;
const tot=n=>DN.reduce((a,v)=>a+v*(num(n&&n[v])),0);
const LSk={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const dayAdd=(d,k)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+k);return today(x)};
let CUR=null,SRC="",unsub=null,inited=false;/* CUR = {10:42,…} */
SKH.target=()=>{const t=(S.settings||{}).khulaT;return t&&typeof t==="object"?t:DEF_T};
SKH.cur=()=>CUR;SKH.total=()=>CUR?tot(CUR):0;SKH.ttot=()=>tot(SKH.target());
const fromDoc=d=>{const o={};DN.forEach(v=>{o[v]=num(d&&d[K(v)])});return o};
const ref=d=>S.db.doc("days/"+d+"/meta/khula");
/* आज का डिब्बा: आज का दस्तावेज़, न हो तो पिछले 60 दिन में आख़िरी */
SKH.load=async function(){if(S.demo||!S.db){if(!CUR)CUR=null;return CUR}
  try{const g=await ref(today()).get();if(g.exists){CUR=fromDoc(g.data());SRC=today();return CUR}
    for(let k=1;k<=60;k++){const d=dayAdd(today(),-k);const p=await ref(d).get();if(p.exists){CUR=fromDoc(p.data());SRC=d;return CUR}}}catch(e){}
  return CUR};
SKH.init=async function(){if(inited||typeof S==="undefined"||!S.db&&!S.demo)return;inited=true;await SKH.load();
  if(!S.demo&&S.db){try{unsub&&unsub();unsub=ref(today()).onSnapshot(s=>{if(s.exists){CUR=fromDoc(s.data());SRC=today();redraw()}},()=>{})}catch(e){}}redraw()};
/* बदलाव: inN डिब्बे में डाले, outN निकाले (दोनों {नोट:गिनती}) */
SKH.move=async function(inN,outN,kind,note){
  if(!CUR){toast("पहले विक्रम जी डिब्बा गिनकर सेट करें");return false}
  const a=tot(inN),b=tot(outN);if(!(a>0)){toast("कुछ डाला/निकाला नहीं");return false}
  if(Math.abs(a-b)>0.001){toast("डाले "+rs(a)+" ≠ निकाले "+rs(b)+" — बराबर होने चाहिए");return false}
  for(const v of DN)if(num(outN[v])>num(CUR[v])+num(inN[v])){toast("डिब्बे में ₹"+v+" के सिर्फ़ "+CUR[v]+" नोट हैं");return false}
  const ts=Date.now(),inc={};DN.forEach(v=>{const d=num(inN[v])-num(outN[v]);if(d)inc[K(v)]=d});
  const clean=o=>{const r={};DN.forEach(v=>{if(num(o[v])>0)r[v]=num(o[v])});return r};
  const log={kind:kind||"khula",total:0,amt:a,in:clean(inN),out:clean(outN),note:String(note||"").slice(0,120),ts,date:today(),by:S.uid||"",byName:typeof biller==="function"?biller():""};
  const next={...CUR};DN.forEach(v=>{next[v]=num(CUR[v])+num(inN[v])-num(outN[v])});
  try{if(!S.demo&&S.db){const r=ref(today());
      if(SRC!==today()){const seed={ts,seed:SRC||""};DN.forEach(v=>{seed[K(v)]=num(CUR[v])});await r.set(seed,{merge:true});SRC=today()}
      const up={ts};for(const k in inc)up[k]=SE.inc(inc[k]);await r.set(up,{merge:true});
      await S.db.collection("days/"+today()+"/galla").doc("k"+ts.toString(36)+Math.random().toString(36).slice(2,5)).set(log)}
    else if(S.galla)S.galla.push({id:"k"+ts,...log});
    CUR=next;redraw();return true}catch(e){toast("सेव नहीं हुआ — नेट देखें");return false}};
/* मालिक: डिब्बा गिनकर पक्का करें (+ हर नोट का "चाहिए") */
SKH.setBox=async function(notes,target){if(!S.isOwner){toast("सिर्फ़ विक्रम जी");return false}const ts=Date.now(),d={ts,setBy:S.uid||""};DN.forEach(v=>{d[K(v)]=num(notes[v])});
  try{if(!S.demo&&S.db){await ref(today()).set(d);await S.db.collection("days/"+today()+"/galla").doc("k"+ts.toString(36)).set({kind:"kset",total:0,amt:tot(notes),notes:d,ts,date:today(),by:S.uid||"",byName:typeof biller==="function"?biller():""})}
    if(target&&typeof saveSetting==="function")saveSetting({khulaT:target});else if(target)S.settings.khulaT=target;
    CUR=fromDoc(d);SRC=today();redraw();return true}catch(e){toast("सेव नहीं हुआ");return false}};
/* कम खुले: "चाहिए" का 30% से कम */
SKH.low=()=>{if(!CUR)return [];const T=SKH.target();return SMALL.filter(v=>num(T[v])>0&&num(CUR[v])<num(T[v])*0.3).map(v=>({v,have:num(CUR[v]),want:num(T[v])}))};
const lowTxt=L=>L.map(x=>"₹"+x.v+" के "+x.have+" (चाहिए "+x.want+")").join(", ");

/* ---------- गल्ला कार्ड में डिब्बा ---------- */
SKH.cardHTML=function(){const T=SKH.target();
  if(!CUR)return `<div class="skh"><div class="skh-h"><b>🪙 खुले का डिब्बा</b><span class="note">अभी सेट नहीं</span></div>${S.isOwner?`<p class="note" style="margin:4px 0">गल्ले में ₹${SKH.ttot().toLocaleString("en-IN")} के खुले अलग रखें (₹10/20/50…) — गिनकर एक बार सेट करें। फिर साथी खुले देते समय बस "🔄 खुले दिए" दबाएँगे।</p><button class="big ghost" data-skh="set">✏️ डिब्बा गिनकर सेट करें</button>`:`<p class="note">विक्रम जी डिब्बा सेट करेंगे।</p>`}</div>`;
  const L=SKH.low(),t=tot(CUR);
  return `<div class="skh"><div class="skh-h"><b>🪙 खुले का डिब्बा</b><span><b>${rs(t)}</b>${t!==SKH.ttot()&&S.isOwner?` <small class="note">(तय ${rs(SKH.ttot())})</small>`:""}</span></div>
  <div class="skh-g">${DN.filter(v=>num(T[v])>0||num(CUR[v])>0).map(v=>{const w=num(T[v]),h=num(CUR[v]),p=w?Math.min(100,Math.round(h/w*100)):100,lo=w&&h<w*0.3;
    return `<div class="skh-c${lo?" lo":""}"><span>₹${v}</span><b>${h}</b><i style="--p:${p}%"></i>${w?`<small>/${w}</small>`:""}</div>`}).join("")}</div>
  ${L.length?`<div class="warn">🪙 खुले कम: ${esc(lowTxt(L))} — बैंक/दुकान से खुले लाकर "➕ रिफिल" करें</div>`:""}
  <div class="skh-b"><button class="big" data-skh="give">🔄 खुले दिए (नोट बदले)</button><button class="big ghost" data-skh="refill">➕ रिफिल</button>${S.isOwner?`<button class="big ghost" data-skh="set">✏️ गिनें/सेट</button>`:""}</div></div>`};

/* ---------- खुले देने / रिफिल की शीट ---------- */
const SWAP=[[500,{100:5}],[500,{50:10}],[200,{100:2}],[200,{50:4}],[100,{50:2}],[100,{20:5}],[100,{10:10}],[50,{10:5}],[50,{20:2,10:1}],[20,{10:2}],[10,{5:2}],[10,{2:5}],[10,{1:10}]];
SKH.sheet=function(mode){if(typeof biller==="function"&&!biller()){openBiller(()=>SKH.sheet(mode));return}
  if(!CUR){toast("पहले विक्रम जी डिब्बा सेट करें");return}
  const inN={},outN={};let note="";const refill=mode==="refill";
  const ok=(i,o)=>{for(const v of DN)if(num(o[v])>num(CUR[v])+num(i[v]))return false;return true};
  const draw=()=>{const a=tot(inN),b=tot(outN),eq=a>0&&Math.abs(a-b)<0.001;
    const row=(side,N,lbl)=>`<div class="skh-side"><h4>${lbl} <b>${rs(tot(N))}</b></h4><div class="skh-st">${DN.map(v=>`<div class="skh-s"><span>₹${v}</span><button type="button" data-skm="${side}:${v}:-1" aria-label="₹${v} एक कम">−</button><b>${num(N[v])||""}</b><button type="button" data-skm="${side}:${v}:1" aria-label="₹${v} एक और">+</button>${side==="o"?`<small>${num(CUR[v])}</small>`:""}</div>`).join("")}</div></div>`;
    $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px sg-sh skh-sh" role="dialog" aria-label="${refill?"खुले का रिफिल":"खुले दिए"}"><div class="grab"></div>
    <div class="sh-head"><div><h3>${refill?"➕ खुले का रिफिल":"🔄 खुले दिए"}</h3><span class="note">${esc(typeof biller==="function"?biller():"")} · डिब्बे में ${rs(tot(CUR))}</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    ${refill?`<p class="note" style="margin:0 0 6px">बैंक/दुकान से जो खुले लाए, वे "डिब्बे में डाले"; बदले में जो बड़े नोट दिए, वे "डिब्बे से निकाले"।</p>`:
    `<p class="note" style="margin:0 0 6px">एक दबाएँ — बड़ा नोट डिब्बे में, खुले बाहर:</p><div class="skh-q">${SWAP.filter(([b,o])=>ok({[b]:1},o)).map(([b,o],i)=>`<button type="button" data-skq="${i}">₹${b} → ${Object.entries(o).map(([v,c])=>c+"×₹"+v).join(" + ")}</button>`).join("")}</div>`}
    ${row("i",inN,refill?"⬇️ डिब्बे में डाले (खुले)":"⬇️ डिब्बे में डाले")}${row("o",outN,refill?"⬆️ डिब्बे से निकाले (बड़े नोट)":"⬆️ डिब्बे से निकाले (खुले)")}
    <label class="fld">नोट (चाहें तो)<input class="inp" id="skhNote" value="${esc(note)}" placeholder="${refill?"जैसे: SBI से ₹10 की गड्डी":"जैसे: ग्राहक को ₹500 के खुले"}"></label>
    <div class="amtline sg-tot"><span>${eq?"✅ बराबर":"डाले − निकाले"}</span><b style="color:${eq?"inherit":"#b91c1c"}">${eq?rs(a):rs(a-b)}</b></div>
    <button class="big" data-skhsave ${eq?"":"disabled"}>✓ सेव करें</button></div></div>`};
  draw();const sh=$("#sheet");
  sh.oninput=e=>{if(e.target.id==="skhNote")note=e.target.value};
  sh.onclick=async e=>{const t=e.target;if(t.matches("[data-close]")){closeSheet();return}
    const q=t.closest("[data-skq]");if(q){const [b,o]=SWAP[+q.dataset.skq];DN.forEach(v=>{delete inN[v];delete outN[v]});inN[b]=1;Object.assign(outN,o);draw();return}
    const m=t.closest("[data-skm]");if(m){const [s,v,d]=m.dataset.skm.split(":");const N=s==="i"?inN:outN;N[v]=Math.max(0,num(N[v])+(+d));if(!N[v])delete N[v];draw();return}
    if(t.closest("[data-skhsave]")){const r=await SKH.move(inN,outN,refill?"krefill":"khula",note);if(r){closeSheet();try{beep(true)}catch(x){}toast("✓ "+rs(tot(inN))+" के "+(refill?"खुले डिब्बे में आए":"खुले दिए")+" · डिब्बा "+rs(tot(CUR)))}}}};
/* मालिक: डिब्बा सेट */
SKH.setSheet=function(){if(!S.isOwner)return;const N={...(CUR||{})},T={...SKH.target()};
  const draw=()=>{$("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px sg-sh" role="dialog" aria-label="खुले का डिब्बा सेट"><div class="grab"></div>
    <div class="sh-head"><h3>✏️ खुले का डिब्बा — गिनती और "चाहिए"</h3><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <p class="note" style="margin:0 0 6px">बाएँ: अभी डिब्बे में कितने नोट। दाएँ: हमेशा कितने चाहिए (इसका 30% से कम हुए तो चेतावनी)।</p>
    <div class="sg-grid">${DN.map(v=>`<label class="sg-row skh-set"><span class="sg-n">₹${v}</span><input class="inp" data-skn="${v}" inputmode="numeric" value="${num(N[v])||""}" placeholder="0" aria-label="₹${v} अभी"><input class="inp" data-skt="${v}" inputmode="numeric" value="${num(T[v])||""}" placeholder="0" aria-label="₹${v} चाहिए"><b>${rs(v*num(N[v]))}</b></label>`).join("")}</div>
    <div class="amtline sg-tot"><span>डिब्बे में · तय</span><b id="skhT">${rs(tot(N))} · ${rs(tot(T))}</b></div><button class="big" data-skhset>✓ पक्का करें</button></div></div>`};
  draw();const sh=$("#sheet");
  sh.oninput=e=>{const t=e.target;if(t.dataset.skn)N[t.dataset.skn]=num(t.value);if(t.dataset.skt)T[t.dataset.skt]=num(t.value);const x=$("#skhT");if(x)x.textContent=rs(tot(N))+" · "+rs(tot(T))};
  sh.onclick=async e=>{if(e.target.matches("[data-close]")){closeSheet();return}if(e.target.closest("[data-skhset]")){const t={};DN.forEach(v=>{if(num(T[v])>0)t[v]=num(T[v])});if(await SKH.setBox(N,t)){closeSheet();toast("✓ खुले का डिब्बा "+rs(tot(N)))}}}};

/* ---------- कम खुले: बिलिंग पर छोटी याद (हर 2 घंटे में एक बार) ---------- */
SKH.nag=function(){const L=SKH.low();if(!L.length||document.getElementById("skhNag")||typeof S==="undefined"||S.billsDate!==today())return;
  const k="skh_nag_"+today();if(Date.now()-(+LSk.get(k)||0)<2*36e5)return;LSk.set(k,String(Date.now()));
  const el=document.createElement("div");el.id="skhNag";el.className="sgnag";el.setAttribute("role","status");
  el.innerHTML=`<b>🪙 खुले कम हो रहे हैं: ${esc(lowTxt(L))}</b><div><button class="nag-go" data-skh="refill">➕ रिफिल करें</button><button data-skhx>ठीक</button></div>`;
  const m=document.getElementById("main");if(m)m.prepend(el)};
function redraw(){try{const c=document.querySelector(".skh");if(c&&S.tab==="day")c.outerHTML=SKH.cardHTML()}catch(e){}}
document.addEventListener("click",e=>{const b=e.target.closest("[data-skh]");if(b){const k=b.dataset.skh;const n=document.getElementById("skhNag");if(n)n.remove();if(k==="set")SKH.setSheet();else SKH.sheet(k==="refill"?"refill":"give");return}
  if(e.target.closest("[data-skhx]")){const n=document.getElementById("skhNag");if(n)n.remove()}});
setInterval(()=>{try{if(!inited&&typeof S!=="undefined"&&(S.db||S.demo)&&(S.uid||S.demo))SKH.init();else if(inited)SKH.nag()}catch(e){}},5000);

const css=document.createElement("style");css.textContent=`
.skh{margin:10px 0 0;padding:10px;border:1.5px dashed var(--line);border-radius:14px}.skh-h{display:flex;justify-content:space-between;align-items:center;gap:6px;margin:0 0 6px}
.skh-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:5px;margin:0 0 6px}
.skh-c{position:relative;display:grid;gap:1px;padding:5px 6px 7px;border-radius:10px;background:var(--surface);border:1.5px solid var(--line);overflow:hidden}
.skh-c span{font-size:12px;color:var(--muted)}.skh-c b{font-size:17px;line-height:1}.skh-c small{position:absolute;right:6px;top:6px;font-size:11px;color:var(--muted)}
.skh-c i{position:absolute;left:0;bottom:0;height:3px;width:var(--p);background:var(--leaf,#16a34a)}.skh-c.lo{border-color:var(--chili,#dc2626)}.skh-c.lo i{background:var(--chili,#dc2626)}
.skh-b{display:grid;grid-template-columns:1fr 1fr;gap:6px}.skh-b .big:first-child{grid-column:1/-1}
.skh-q{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 8px}.skh-q button{padding:7px 9px;border-radius:11px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13px}
.skh-side h4{margin:6px 0 4px;font-size:14px;display:flex;justify-content:space-between}.skh-st{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px}
.skh-s{display:grid;grid-template-columns:42px 34px 1fr 34px 28px;align-items:center;gap:3px}.skh-s span{font-weight:800}.skh-s b{text-align:center;font-size:17px}
.skh-s button{height:34px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font-size:18px;font-weight:800}.skh-s small{color:var(--muted);font-size:11px}
.skh-set{grid-template-columns:56px 1fr 1fr 72px}`;
document.head.appendChild(css);
})();
