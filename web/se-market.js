/* 177 MH कैंटीन — 🛍️ बाज़ार खरीद (भाग 1)
   जो व्यक्ति बाज़ार जाता है, वही खरीद एंट्री बनाता है:
   दुकान (नाम/मोबाइल/GPS) → हर सामान: बारकोड · 📦 आगे की फोटो · 🏷️ MRP फोटो · गिनती · एक का भाव · MRP
   → तुरंत फायदा % (10% से कम = लाल) → 🧾 दुकान के बिल की फोटो → भुगतान कैसे → 📤 भेजें
   कच्ची एंट्री फोन में (बिना इंटरनेट भी चलती रहे); भेजते ही Firestore "mbuys" में।
   स्टॉक यहाँ नहीं बढ़ता — बिलर के "गिनकर पक्का" (भाग 3) से बढ़ेगा। */
(function(){
"use strict";
const SM=window.SM={};
const KEY="mh_mkt_draft",MAXL=60,LOW=10;
const num=v=>{const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)?n:0};
const rid=n=>Math.random().toString(36).slice(2,2+(n||4)).toUpperCase();
const PAYS=[["qr","💳 विक्रम जी QR से देंगे"],["cash","💵 मैंने नकद दिया"],["galla","🏪 गल्ले से"],["udhar","📒 दुकान का उधार"]];
const PAYN=Object.fromEntries(PAYS);
let D=null,CUR=null,LIST=[],unsub=null,VIEW="home",OPEN=null;

/* ---------- कच्ची एंट्री फोन में ---------- */
function load(){try{D=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){D=null}}
function save(){try{if(D)localStorage.setItem(KEY,JSON.stringify(D));else localStorage.removeItem(KEY)}catch(e){toast("⚠ फोन की जगह भर गई — पुरानी फोटो हटाएँ")}}
function newCur(){return {bar:"",itemId:"",name:"",qty:1,rate:"",mrp:"",f:"",m:""}}
function blank(){const d=new Date(),p=n=>String(n).padStart(2,"0");
  return {no:"MP-"+p(d.getDate())+p(d.getMonth()+1)+"-"+rid(4),date:today(),start:Date.now(),shop:"",phone:"",loc:null,lines:[],bill:"",pay:"qr",note:""}}

/* ---------- फोटो: छोटी (ऐप में) ---------- */
function shrink(file,max,q){return new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL("image/jpeg",q))};
  img.onerror=e=>{URL.revokeObjectURL(u);rej(e)};img.src=u})}
function pick(cb){const fi=document.createElement("input");fi.type="file";fi.accept="image/*";fi.capture="environment";fi.onchange=()=>{const f=fi.files[0];if(f)cb(f)};fi.click()}

/* ---------- लोकेशन (चालू हो तो) ---------- */
function getLoc(){return new Promise(res=>{
  const l=window.SR&&SR.last;if(l&&Date.now()-l.ts<10*60000)return res({lat:l.lat,lng:l.lng,acc:l.acc||0,ts:l.ts});
  if(!navigator.geolocation)return res(null);
  try{navigator.geolocation.getCurrentPosition(p=>res({lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy),ts:Date.now()}),()=>res(null),{enableHighAccuracy:true,timeout:9000,maximumAge:120000})}catch(e){res(null)}})}
async function fixLoc(){const l=await getLoc();if(l&&D){D.loc=l;save();if(VIEW==="draft")draw()}return l}
function locTxt(l){return l?`📍 जगह दर्ज (±${l.acc||"?"}m)`:"📍 जगह नहीं मिली — फोन की लोकेशन चालू करें"}

/* ---------- फायदा ---------- */
function gain(rate,mrp){rate=num(rate);mrp=num(mrp);if(!(rate>0)||!(mrp>0))return null;const per=r2(mrp-rate),pct=Math.round(per/rate*1000)/10;return {per,pct,low:pct<LOW}}
function gainHTML(g,qty){if(!g)return `<span class="mk-g">भाव और MRP डालें — फायदा दिखेगा</span>`;
  return `<span class="mk-g ${g.low?"bad":"ok"}">${g.per<0?"⛔ घाटा":g.low?"🔴 फायदा कम":"🟢 फायदा"}: एक पर ${rs(g.per)} · <b>${g.pct}%</b>${qty>1?` · कुल ${rs(r2(g.per*qty))}`:""}${g.low?" — मोलभाव करें / विक्रम जी से पूछें":""}</span>`}
const tot=()=>r2((D?D.lines:[]).reduce((a,l)=>a+l.amt,0));
const totGain=()=>r2((D?D.lines:[]).reduce((a,l)=>a+(l.mrp>0?(l.mrp-l.rate)*l.qty:0),0));

/* ---------- स्कैन ---------- */
SM.active=()=>S.tab==="mkt"&&VIEW==="draft"&&!!D;
SM.wantCam=()=>SM.active();
SM.scan=function(code){if(!SM.active())return false;code=String(code||"").trim();if(!code)return true;
  // उसी सामान को दोबारा स्कैन = गिनती +1
  if(CUR&&CUR.bar===code){CUR.qty=(+CUR.qty||0)+1;draw();beep(true);toast("✓ "+(CUR.name||code)+" × "+CUR.qty);return true}
  if(CUR&&(CUR.bar||CUR.name)&&num(CUR.rate)>0)addCur(true);
  CUR=newCur();CUR.bar=code;const it=findByCode(code);
  if(it){CUR.itemId=it.id;CUR.name=it.name;if(+it.mrp)CUR.mrp=+it.mrp;const c=window.SF?SF.costOf(it):(+it.cost||0);if(c>0)CUR.last=c}
  draw();beep(true);
  if(!it)pehchan().then(m=>{const x=m.get(code);if(x&&CUR&&CUR.bar===code&&!CUR.name){CUR.name=x.bill;if(x.mrp&&!CUR.mrp)CUR.mrp=x.mrp;if(x.lastPur)CUR.last=x.lastPur;draw()}});
  toast(it?"♻️ "+it.name:"🆕 नया बारकोड "+code+" — नाम लिखें");return true};

function addCur(silent){
  if(!CUR)return false;const q=num(CUR.qty),r=num(CUR.rate),m=num(CUR.mrp);
  if(!CUR.name.trim()&&!CUR.bar){toast("सामान का नाम लिखें या बारकोड स्कैन करें");return false}
  if(!(q>0)){toast("कितने पीस — लिखें");return false}
  if(!(r>0)){toast("एक का खरीद भाव लिखें");return false}
  if(m>0&&r>m*1.02){if(CUR.sure!=="mrp"){CUR.sure="mrp";beep(false);toast("⚠ खरीद भाव MRP से ज़्यादा है — सही है तो दोबारा ✓ दबाएँ");return false}}
  if(D.lines.length>=MAXL){toast("एक खरीद में "+MAXL+" सामान तक — भेजकर नई शुरू करें");return false}
  const g=gain(r,m);
  const ln={lid:D.no+"-"+String(D.lines.length+1).padStart(2,"0"),bar:CUR.bar||"",itemId:CUR.itemId||"",name:(CUR.name||"").trim()||("बारकोड "+CUR.bar),qty:q,rate:r2(r),mrp:r2(m),amt:r2(q*r),f:CUR.f||"",m:CUR.m||"",low:!!(g&&g.low),ts:Date.now()};
  if(CUR.edit!=null)D.lines[CUR.edit]={...ln,lid:D.lines[CUR.edit].lid};else D.lines.push(ln);
  CUR=newCur();save();try{document.activeElement&&document.activeElement.blur()}catch(e){}draw();if(!silent){beep(true);toast("✓ "+ln.name+" "+q+" × "+rs(ln.rate)+" = "+rs(ln.amt))}return true}

/* ---------- भेजें ---------- */
async function send(btn){
  if(CUR&&(CUR.bar||CUR.name)&&num(CUR.rate)>0&&!addCur(true))return;
  if(!D.shop.trim()){toast("दुकान का नाम लिखें");$("#mkShop")?.focus();return}
  if(D.phone&&String(D.phone).replace(/\D/g,"").length!==10){toast("दुकान का मोबाइल 10 अंक का हो (या खाली छोड़ें)");return}
  if(!D.lines.length){toast("कम से कम एक सामान जोड़ें");return}
  if(!D.bill&&D.sureBill!==1){D.sureBill=1;save();beep(false);toast("🧾 दुकान के बिल की फोटो नहीं ली — बिना बिल भेजना है तो दोबारा दबाएँ");return}
  if(!D.loc)await fixLoc();
  const total=tot(),low=D.lines.filter(l=>l.low).map(l=>l.name);
  const doc={no:D.no,date:today(),ts:Date.now(),start:D.start,by:S.uid||"",byName:biller(),shop:D.shop.trim(),phone:String(D.phone||"").replace(/\D/g,"").slice(-10),loc:D.loc||null,
    lines:D.lines,n:D.lines.length,total,gain:totGain(),low,bill:D.bill||"",pay:{mode:D.pay,status:D.pay==="qr"?"pending":D.pay==="udhar"?"udhar":"paid",amt:total},
    note:(D.note||"").trim(),status:"sent",recv:null,app:SE.version};
  if(btn)btn.disabled=true;
  try{if(!S.demo)await S.db.collection("mbuys").doc(D.no).set(doc);
    if(S.demo)LIST.unshift({id:D.no,...doc});
    D=null;CUR=null;save();VIEW="home";camAuto();draw();beep(true);
    toast(doc.pay.mode==="qr"?"📤 भेज दिया — विक्रम जी को "+rs(total)+" के भुगतान की सूचना गई":"📤 खरीद "+doc.no+" भेज दी · "+rs(total));
  }catch(e){if(btn)btn.disabled=false;toast("नहीं गया: "+(e.code||e.message||"")+" — इंटरनेट देखकर दोबारा दबाएँ (एंट्री फोन में सुरक्षित है)")}}

/* ---------- सूची (मेरी / सबकी) ---------- */
SM.watch=function(){if(unsub||S.demo||!S.db||!S.uid)return;
  let q=S.db.collection("mbuys");q=S.isOwner?q.orderBy("ts","desc").limit(40):q.where("by","==",S.uid).limit(40);
  try{unsub=q.onSnapshot(s=>{LIST=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.ts||0)-(a.ts||0));if(S.tab==="mkt"&&VIEW==="home")draw();try{renderTabs()}catch(e){}},()=>{})}catch(e){}};
SM.pendingPay=()=>LIST.filter(b=>b.pay&&b.pay.status==="pending").length;
const ST=b=>b.recv?`<span class="pill green">📦 माल पक्का</span>`:b.pay&&b.pay.status==="pending"?`<span class="pill red">🕐 भुगतान बाकी</span>`:b.pay&&b.pay.status==="udhar"?`<span class="pill blue">📒 उधार</span>`:`<span class="pill green">✅ भुगतान हुआ</span>`;

/* ---------- स्क्रीन ---------- */
function homeHTML(){
  const mine=LIST;
  return `<div class="mk-hero"><div><h2 class="sec" style="margin:0">🛍️ बाज़ार खरीद</h2><span class="note">दुकान पर ही एंट्री बनाएँ — फोटो, गिनती, भाव, MRP। बिलर सिर्फ़ गिनकर पक्का करेंगे।</span></div></div>
  ${D?`<button class="big mk-go" data-mkresume>▶ अधूरी खरीद चालू करें — ${esc(D.shop||"दुकान")} · ${D.lines.length} सामान · ${rs(tot())}</button>`:`<button class="big mk-go" data-mknew>＋ नई खरीद शुरू करें</button>`}
  <h3 style="margin:16px 0 6px">${S.isOwner?"सबकी खरीद":"मेरी खरीद"} ${S.isOwner&&SM.pendingPay()?`<span class="pill red">${SM.pendingPay()} का भुगतान बाकी</span>`:""}</h3>
  <div class="list">${mine.length?mine.map(b=>`<div class="li mk-li" data-mkopen="${esc(b.id)}" role="button" tabindex="0"><div class="mid"><b>${esc(b.shop||"")} · ${rs(b.total)}</b><span>${esc(b.no)} · ${fdate(b.date)} ${ftime(b.ts)}${S.isOwner?" · "+esc(b.byName||""):""} · ${b.n||0} सामान${b.low&&b.low.length?` · <b style="color:var(--chili)">🔴 ${b.low.length} कम फायदे वाले</b>`:""}</span></div><div class="rt">${ST(b)}</div></div>`).join(""):`<div class="empty">अभी कोई खरीद नहीं भेजी गई</div>`}</div>`}

function draftHTML(){
  const c=CUR||(CUR=newCur()),g=gain(c.rate,c.mrp),L=D.lines;
  return `<div class="mk-top"><button class="lnk" data-mkback>← वापस</button><b>${esc(D.no)}</b><span class="note">${esc(biller())}</span></div>
  <div class="card2 mk-shop"><div class="row2" style="margin:0"><label class="fld">🏪 दुकान का नाम<input class="inp" id="mkShop" value="${esc(D.shop)}" placeholder="जैसे शर्मा किराना, बाड़मेर" list="mkShops" autocomplete="off"></label><label class="fld">📞 दुकान का मोबाइल<input class="inp" id="mkPh" inputmode="tel" value="${esc(D.phone)}" placeholder="10 अंक"></label></div>
    <datalist id="mkShops">${[...new Set(LIST.map(b=>b.shop).filter(Boolean))].slice(0,30).map(s=>`<option value="${esc(s)}">`).join("")}</datalist>
    <p class="note mk-loc">${locTxt(D.loc)} ${D.loc?"":`<button class="lnk" data-mkloc>दोबारा देखें</button>`}</p></div>

  <div class="card2 mk-cur">
    <div class="mk-bar">${c.bar?`📟 <b>${esc(c.bar)}</b> ${c.itemId?`<span class="pill green">♻️ ऐप में है</span>`:`<span class="pill blue">🆕 नया</span>`}`:`<span class="note">कैमरा बारकोड पर रखें — या 📷 दबाएँ। बिना बारकोड वाला सामान: सीधे नाम लिखें</span>`}<button class="scanbtn" type="button" data-mkscan aria-label="बारकोड स्कैन">📷</button></div>
    <label class="fld" style="margin:8px 0 0">सामान का नाम<input class="inp" id="mkName" value="${esc(c.name)}" placeholder="जैसे India Gate चावल 1kg" autocomplete="off"></label>
    <div class="mk-ph"><button type="button" data-mkph="f" class="${c.f?"has":""}">${c.f?`<img src="${c.f}" alt="">`:"📦"}<span>आगे की फोटो</span></button><button type="button" data-mkph="m" class="${c.m?"has":""}">${c.m?`<img src="${c.m}" alt="">`:"🏷️"}<span>MRP की फोटो</span></button></div>
    <div class="mk-nums">
      <div class="fld">कितने पीस<div class="cstep2"><button type="button" data-mkq="-1">−</button><input id="mkQ" inputmode="decimal" value="${esc(c.qty)}"><button type="button" data-mkq="1">+</button></div></div>
      <label class="fld">एक का भाव ₹<input class="inp" id="mkR" inputmode="decimal" value="${esc(c.rate)}" placeholder="${c.last?"पिछली बार "+c.last:"0"}"></label>
      <label class="fld">MRP ₹<input class="inp" id="mkM" inputmode="decimal" value="${esc(c.mrp)}" placeholder="0"></label>
    </div>
    <div id="mkGain">${gainHTML(g,num(c.qty))}${c.last&&num(c.rate)>0&&num(c.rate)>c.last*1.05?`<span class="mk-g bad">⚠ पिछली बार ${rs(c.last)} में आया था</span>`:""}</div>
    <div class="row2" style="margin:10px 0 0">${c.edit!=null?`<button class="big ghost" data-mkcancel>रद्द</button>`:`<button class="big ghost" data-mkclear>साफ़ करें</button>`}<button class="big" data-mkadd>✓ ${c.edit!=null?"बदलें":"जोड़ें"}${num(c.qty)>0&&num(c.rate)>0?" · "+rs(r2(num(c.qty)*num(c.rate))):""}</button></div>
  </div>

  ${L.length?`<h3 style="margin:14px 0 6px">इस दुकान से (${L.length})</h3><div class="list">${L.map((l,i)=>`<div class="li mk-ln ${l.low?"low":""}" data-mkedit="${i}" role="button" tabindex="0">${l.f?`<img class="mk-th" src="${l.f}" alt="">`:`<span class="mk-th">📦</span>`}<div class="mid"><b>${esc(l.name)}</b><span>${l.qty} × ${rs(l.rate)}${l.mrp?` · MRP ${rs(l.mrp)}`:""}${(()=>{const g=gain(l.rate,l.mrp);return g?` · <b style="color:${g.low?"var(--chili)":"var(--leaf)"}">${g.pct}%</b>`:""})()}</span></div><div class="rt"><b>${rs(l.amt)}</b></div><button class="sdx" data-mkdel="${i}" aria-label="${esc(l.name)} हटाएँ">✕</button></div>`).join("")}</div>`:""}

  <div class="card2 mk-fin"><h3 style="margin:0 0 8px">🧾 बिल और भुगतान</h3>
    <div class="mk-ph"><button type="button" data-mkbill class="${D.bill?"has":""}">${D.bill?`<img src="${D.bill}" alt="">`:"🧾"}<span>दुकान के बिल की फोटो</span></button></div>
    <div class="chips mk-pay">${PAYS.map(([k,v])=>`<button class="chip" aria-pressed="${D.pay===k}" data-mkpay="${k}">${v}</button>`).join("")}</div>
    ${D.pay==="qr"?`<p class="note" style="margin:6px 0 0">भेजते ही विक्रम जी को ${rs(tot())} के भुगतान की सूचना जाएगी। (दुकान के QR की फोटो — अगले अपडेट में)</p>`:""}
    <label class="fld" style="margin:8px 0 0">कुछ लिखना हो (ज़रूरी नहीं)<input class="inp" id="mkNote" value="${esc(D.note)}" placeholder="जैसे 2 पेटी बाद में आएगी"></label>
  </div>
  <div class="mk-sum"><div><b>${L.length} सामान · ${rs(tot())}</b><span>${totGain()?"MRP पर फायदा "+rs(totGain()):""}${L.some(l=>l.low)?` · <b style="color:#ffd0d0">🔴 ${L.filter(l=>l.low).length} कम फायदा</b>`:""}</span></div><button class="big" data-mksend ${L.length?"":"disabled"}>📤 भेजें</button></div>`}

function detailHTML(b){
  return `<div class="mk-top"><button class="lnk" data-mkback>← वापस</button><b>${esc(b.no)}</b>${ST(b)}</div>
  <div class="card2"><b style="font-size:18px">${esc(b.shop)}</b>${b.phone?` · <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>`:""}<p class="note" style="margin:4px 0 0">${fdate(b.date)} ${ftime(b.ts)} · ${esc(b.byName||"")} · ${esc(PAYN[b.pay&&b.pay.mode]||"")}${b.loc?` · <a target="_blank" rel="noopener" href="https://maps.google.com/?q=${b.loc.lat},${b.loc.lng}">📍 नक्शे पर</a>`:" · 📍 जगह नहीं"}</p>${b.note?`<p class="note" style="margin:4px 0 0">📝 ${esc(b.note)}</p>`:""}</div>
  <div class="list">${(b.lines||[]).map(l=>`<div class="li mk-ln ${l.low?"low":""}">${l.f?`<img class="mk-th" src="${l.f}" alt="">`:`<span class="mk-th">📦</span>`}${l.m?`<img class="mk-th" src="${l.m}" alt="">`:""}<div class="mid"><b>${esc(l.name)}</b><span>${l.bar?esc(l.bar)+" · ":""}${l.qty} × ${rs(l.rate)}${l.mrp?` · MRP ${rs(l.mrp)}`:""}${(()=>{const g=gain(l.rate,l.mrp);return g?` · <b style="color:${g.low?"var(--chili)":"var(--leaf)"}">${g.pct}%</b>`:""})()}</span></div><div class="rt"><b>${rs(l.amt)}</b></div></div>`).join("")}</div>
  <div class="card2"><b>कुल ${rs(b.total)}</b>${b.gain?` · MRP पर फायदा ${rs(b.gain)}`:""}${b.bill?`<img src="${b.bill}" alt="दुकान का बिल" style="display:block;width:100%;margin-top:10px;border-radius:12px">`:`<p class="note">🧾 बिल की फोटो नहीं ली गई</p>`}</div>`}

function draw(){const el=$("#p-mkt");if(!el||S.tab!=="mkt")return;
  const keep=document.activeElement&&el.contains(document.activeElement)?document.activeElement.id:"";
  el.innerHTML=VIEW==="draft"&&D?draftHTML():VIEW==="detail"&&OPEN?detailHTML(LIST.find(b=>b.id===OPEN)||{lines:[]}):homeHTML();
  if(keep){const k=document.getElementById(keep);if(k)try{k.focus();const v=k.value;k.setSelectionRange&&k.setSelectionRange(v.length,v.length)}catch(e){}}}
SM.render=function(){load();draw()};

/* ---------- बटन ---------- */
SM.bind=function(){const el=$("#p-mkt");if(!el)return;
  el.addEventListener("click",async e=>{const t=e.target;
    if(t.closest("[data-mknew]")){D=blank();CUR=newCur();save();VIEW="draft";draw();camAuto();fixLoc();setTimeout(()=>$("#mkShop")?.focus(),60);return}
    if(t.closest("[data-mkresume]")){VIEW="draft";draw();camAuto();if(!D.loc)fixLoc();return}
    if(t.closest("[data-mkback]")){VIEW="home";OPEN=null;camAuto();draw();return}
    const op=t.closest("[data-mkopen]");if(op){OPEN=op.dataset.mkopen;VIEW="detail";draw();window.scrollTo(0,0);return}
    if(t.closest("[data-mkloc]")){toast("📍 जगह देख रहे हैं…");const l=await fixLoc();if(!l)toast("जगह नहीं मिली — फोन में Location चालू करें");return}
    if(t.closest("[data-mkscan]")){if(typeof liveScan==="function")liveScan();return}
    const ph=t.closest("[data-mkph]");if(ph){const k=ph.dataset.mkph;pick(async f=>{try{CUR[k]=await shrink(f,k==="m"?220:180,.6);draw()}catch(x){toast("फोटो नहीं बनी")}});return}
    if(t.closest("[data-mkbill]")){pick(async f=>{try{D.bill=await shrink(f,900,.6);D.sureBill=0;save();draw()}catch(x){toast("फोटो नहीं बनी")}});return}
    const q=t.closest("[data-mkq]");if(q){CUR.qty=Math.max(0,r2(num(CUR.qty)+(+q.dataset.mkq)));if(!(CUR.qty>0))CUR.qty=1;draw();return}
    if(t.closest("[data-mkadd]")){addCur();return}
    if(t.closest("[data-mkclear]")){CUR=newCur();draw();return}
    if(t.closest("[data-mkcancel]")){CUR=newCur();draw();return}
    const dl=t.closest("[data-mkdel]");if(dl){e.stopPropagation();const i=+dl.dataset.mkdel;if(dl.dataset.sure!=="1"){dl.dataset.sure="1";dl.textContent="पक्का?";setTimeout(()=>{if(dl.isConnected){dl.dataset.sure="";dl.textContent="✕"}},2500);return}
      D.lines.splice(i,1);D.lines.forEach((l,k)=>l.lid=D.no+"-"+String(k+1).padStart(2,"0"));save();draw();return}
    const ed=t.closest("[data-mkedit]");if(ed){const l=D.lines[+ed.dataset.mkedit];CUR={...newCur(),...l,qty:l.qty,rate:l.rate,mrp:l.mrp||"",edit:+ed.dataset.mkedit};draw();window.scrollTo({top:0,behavior:"smooth"});return}
    const py=t.closest("[data-mkpay]");if(py){D.pay=py.dataset.mkpay;save();draw();return}
    const sd=t.closest("[data-mksend]");if(sd){send(sd);return}
  });
  el.addEventListener("input",e=>{const id=e.target.id,v=e.target.value;if(!D)return;
    if(id==="mkShop"){D.shop=v;save();return}if(id==="mkPh"){D.phone=v;save();return}if(id==="mkNote"){D.note=v;save();return}
    if(id==="mkName"){CUR.name=v;return}
    if(id==="mkQ"||id==="mkR"||id==="mkM"){CUR[id==="mkQ"?"qty":id==="mkR"?"rate":"mrp"]=v;CUR.sure="";const g=$("#mkGain");if(g)g.innerHTML=gainHTML(gain(CUR.rate,CUR.mrp),num(CUR.qty))+(CUR.last&&num(CUR.rate)>CUR.last*1.05?`<span class="mk-g bad">⚠ पिछली बार ${rs(CUR.last)} में आया था</span>`:"");
      const a=$("[data-mkadd]");if(a)a.textContent="✓ "+(CUR.edit!=null?"बदलें":"जोड़ें")+(num(CUR.qty)>0&&num(CUR.rate)>0?" · "+rs(r2(num(CUR.qty)*num(CUR.rate))):"")}
  });
  el.addEventListener("keydown",e=>{if(e.key==="Enter"&&["mkName","mkQ","mkR","mkM"].includes(e.target.id)){e.preventDefault();const nx={mkName:"mkQ",mkQ:"mkR",mkR:"mkM"}[e.target.id];if(nx)$("#"+nx).focus();else addCur()}
    if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-mkopen],[data-mkedit]")){e.preventDefault();e.target.click()}});
  const st=document.createElement("style");st.textContent=`
#p-mkt{padding-bottom:110px}
.mk-hero{padding:4px 0 10px}.mk-go{width:100%;background:linear-gradient(120deg,var(--leaf),var(--hdr3,#4f46e5));color:#fff;font-weight:800}
.mk-top{display:flex;align-items:center;gap:10px;margin:2px 0 10px}.mk-top b{font-size:17px}.mk-top .note,.mk-top .pill{margin-left:auto}
.mk-loc{margin:6px 0 0}
.mk-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mk-bar .scanbtn{margin-left:auto}
.mk-ph{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.mk-fin .mk-ph{grid-template-columns:1fr}
.mk-ph button{position:relative;height:84px;border:2px dashed var(--line);border-radius:14px;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:28px;overflow:hidden}
.mk-ph button span{font-size:12.5px;font-weight:700;color:var(--muted)}.mk-ph button.has{border-style:solid;border-color:var(--leaf)}
.mk-ph button img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.mk-ph button.has span{position:relative;z-index:1;background:rgba(0,0,0,.55);color:#fff;border-radius:8px;padding:1px 6px;margin-top:auto;margin-bottom:4px}
.mk-nums{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:8px;margin-top:10px;align-items:end}.mk-nums .fld{margin:0}.mk-nums .cstep2 input{width:100%;min-width:0}.mk-nums .cstep2{display:grid;grid-template-columns:36px 1fr 36px}
#mkGain{margin-top:8px;display:grid;gap:4px}.mk-g{display:block;font-size:14px;padding:7px 10px;border-radius:10px;background:var(--bg);color:var(--muted)}
.mk-g.ok{background:#e9f9ef;color:#0f6b36}.mk-g.bad{background:#fdecec;color:#b42318;font-weight:700}
.mk-ln{position:relative;align-items:center;gap:8px}.mk-ln.low{box-shadow:inset 4px 0 0 var(--chili)}
.mk-th{width:44px;height:44px;border-radius:10px;object-fit:cover;flex:none;display:grid;place-items:center;background:var(--bg);font-size:22px}
.mk-pay{display:flex;flex-wrap:wrap;gap:6px}
.mk-sum{position:fixed;left:0;right:0;bottom:0;z-index:15;display:flex;align-items:center;gap:10px;padding:10px max(14px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(14px,env(safe-area-inset-left,0px));background:linear-gradient(120deg,#0f5132,var(--leaf));color:#fff;box-shadow:0 -6px 20px rgba(0,0,0,.25)}
.mk-sum>div{flex:1;min-width:0;display:grid}.mk-sum b{font-size:17px}.mk-sum span{font-size:12.5px;opacity:.9}.mk-sum .big{width:auto;padding:12px 20px;background:#fff;color:#0f5132;font-weight:900}
.mk-li .mid span b{font-weight:700}`;document.head.appendChild(st);
};
})();
