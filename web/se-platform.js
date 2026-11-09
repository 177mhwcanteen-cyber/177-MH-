/* 177 MH कैंटीन — प्लेटफ़ॉर्म परत
   Firebase लॉगिन, अपने-आप अपडेट, कैमरा स्कैनर, ब्लूटूथ प्रिंटर, A4 प्रिंट, फोटो।
   ऐप का बाकी कोड (index.html) पहले जैसा ही S.db.collection(...) API इस्तेमाल करता है। */
(function(){
"use strict";
const CFG=window.SE_CONFIG||{};
const N=window.SENative||{isNative:false};
const SE=window.SE={version:window.SE_BUILD||"dev",isNative:!!N.isNative,cfg:CFG};
/* 🏢 संस्था-पहरा: हर डेटा (migrate.json, GitHub खेप, खरीद-बही का कोड) पर "org" — दूसरी संस्था का डेटा इस ऐप में कभी नहीं चढ़ता।
   177 MH = "mh177" · भैरव = "bhairav" (हर रिपो की config.js में; scripts/org-guard.mjs build से पहले जाँचता है)। org न लिखा हो तो उसे "mh177" का माना जाता है। */
SE.org=CFG.org||"mh177";
SE.ORGNAME={mh177:"177 MH कैंटीन",bhairav:"भैरव कैंटीन"};
SE.orgOk=function(o){o=o||"mh177";return o===SE.org};
SE.orgErr=o=>"⛔ यह "+(SE.ORGNAME[o||"mh177"]||o)+" का डेटा है — "+(SE.ORGNAME[SE.org]||SE.org)+" के ऐप में नहीं चढ़ेगा";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const STAFF_DOMAIN="staff.mh177canteen.in";
const staffEmail=(ph,v)=>`${ph}.v${v||1}@${STAFF_DOMAIN}`;
const staffPass=(ph,pin)=>`se-${pin}-${ph}`;
// मालिक की ईमेल कोड में साफ़ नहीं लिखी — सिर्फ़ उसकी "छाप" (SHA-256), ताकि Public कोड में ईमेल न दिखे
const OH={};
async function isOwnerMail(email){email=String(email||"").trim().toLowerCase();if(!email||!CFG.ownerHash)return false;if(email in OH)return OH[email];
  try{const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(email));OH[email]=[].concat(CFG.ownerHash).map(x=>String(x).toLowerCase()).includes([...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join(""))}catch(e){OH[email]=false}return OH[email]}
SE.configured=!!(CFG.firebase&&CFG.firebase.apiKey&&!/^PASTE/.test(CFG.firebase.apiKey));

/* ---------- Firebase शुरू ---------- */
let app=null,db=null,auth=null;
function initFB(){
  if(app)return;
  app=firebase.initializeApp(CFG.firebase);
  db=firebase.firestore();
  try{db.settings({ignoreUndefinedProperties:true,merge:true})}catch(e){}
  // फोन में पक्की कॉपी: इंटरनेट न हो तब भी पुराना डेटा दिखे और नए बिल जुड़ते रहें
  db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
  auth=firebase.auth();
  SE.db=db;SE.auth=auth;SE.FieldValue=firebase.firestore.FieldValue;
  capGuard();
}
/* 🔠 विक्रम जी का पक्का नियम (06-11-2026): हर सामान का नाम CAPITAL अक्षरों में।
   items/* में जो भी लिखा जाए (टाइप किया, AI ने पढ़ा, बिल से आया, पुराने ऐप से) — name/short/brand के अंग्रेज़ी अक्षर अपने-आप बड़े।
   हिंदी (hi) वैसी ही। एक ही जगह पर पहरा, ताकि कोई रास्ता छूटे नहीं। */
SE.capNm=s=>typeof s==="string"?s.replace(/[a-z]+/g,m=>m.toUpperCase()):s;
SE.capItem=function(d){if(!d||typeof d!=="object")return d;let o=d;for(const k of ["name","short","brand"])if(typeof d[k]==="string"&&/[a-z]/.test(d[k])){if(o===d)o={...d};o[k]=SE.capNm(d[k])}return o};
function capGuard(){try{const F=firebase.firestore,isI=r=>r&&typeof r.path==="string"&&/^items\/[^/]+$/.test(r.path);
  const wrap=(P,m,pos)=>{if(!P||!P[m]||P[m]._cap)return;const f=P[m];P[m]=function(){const a=[...arguments];const r=pos?a[0]:this;if(isI(r)&&a[pos])a[pos]=SE.capItem(a[pos]);return f.apply(this,a)};P[m]._cap=1};
  if(F.DocumentReference){wrap(F.DocumentReference.prototype,"set",0);wrap(F.DocumentReference.prototype,"update",0)}
  if(F.WriteBatch){wrap(F.WriteBatch.prototype,"set",1);wrap(F.WriteBatch.prototype,"update",1)}
  if(F.Transaction){wrap(F.Transaction.prototype,"set",1);wrap(F.Transaction.prototype,"update",1)}}catch(e){}}
SE.inc=n=>firebase.firestore.FieldValue.increment(n);

/* ---------- लॉगिन स्क्रीन ---------- */
function lockEl(){return $("#lock")}
function drawLogin(st){
  const L=lockEl();L.hidden=false;
  if(st.mode==="owner"){
    L.innerHTML=`<div style="font-size:44px">🛒</div><h2>177 MH कैंटीन</h2>
    <p class="note" style="margin:-8px 0 0">${st.create?"मालिक का नया खाता बनाएँ":"मालिक लॉगिन"}</p>
    <div class="lgform">
      <input class="inp" id="lgEmail" type="email" autocomplete="username" placeholder="ईमेल" value="${esc(st.email||"")}">
      <input class="inp" id="lgPass" type="password" autocomplete="${st.create?"new-password":"current-password"}" placeholder="पासवर्ड (कम से कम 6 अक्षर)">
      ${st.err?`<p class="lgerr">${esc(st.err)}</p>`:""}${st.msg?`<p class="lgmsg">${esc(st.msg)}</p>`:""}
      <button class="big" data-lg="owner-go">${st.busy?"रुकिए…":st.create?"खाता बनाएँ":"लॉगिन करें"}</button>
      <button class="lnk" data-lg="owner-toggle">${st.create?"पहले से खाता है? लॉगिन करें":"पहली बार? नया खाता बनाएँ"}</button>
      ${st.create?"":`<button class="lnk" data-lg="owner-reset">पासवर्ड भूल गए?</button>`}
      <button class="lnk" data-lg="to-staff">← कर्मचारी लॉगिन</button></div>`;
    return}
  if(st.mode==="verify"){
    L.innerHTML=`<div style="font-size:44px">📧</div><h2>ईमेल पक्का करें</h2>
    <p class="note">${esc(st.email)} पर एक लिंक भेजा है। Gmail खोलकर लिंक दबाएँ, फिर यहाँ "हो गया" दबाएँ।</p>
    ${st.err?`<p class="lgerr">${esc(st.err)}</p>`:""}
    <div class="lgform"><button class="big" data-lg="verify-done">हो गया</button><button class="lnk" data-lg="verify-resend">लिंक दोबारा भेजें</button><button class="lnk" data-lg="logout">दूसरा खाता</button></div>`;
    return}
  L.innerHTML=`<div style="font-size:44px">🛒</div><h2>177 MH कैंटीन</h2>
    ${st.step==="pin"?`<p class="note" style="margin:-8px 0 0">📱 ${esc(st.phone)} — अपना 4 अंक का PIN डालें</p>
      <div class="dots ${st.err?"bad":""}" aria-label="PIN">${[0,1,2,3].map(i=>`<i class="${i<st.pin.length?"f":""}"></i>`).join("")}</div>`
    :`<p class="note" style="margin:-8px 0 0">अपना मोबाइल नंबर डालें</p><div class="lgphone" aria-live="polite">${esc(st.phone||"")||'<span class="note">10 अंक</span>'}</div>`}
    ${st.err?`<p class="lgerr">${esc(st.err)}</p>`:""}${st.busy?'<p class="note">जाँच रहे हैं…</p>':""}
    <div class="pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-k="${n}">${n}</button>`).join("")}<button class="t" data-k="c">साफ़</button><button data-k="0">0</button><button class="t" data-k="b" aria-label="एक अंक हटाएँ">⌫</button></div>
    ${st.step==="pin"?`<button class="lnk" data-lg="back">← नंबर बदलें</button>`:""}
    <button class="lnk" data-lg="to-owner">मालिक लॉगिन</button>`;
}
const errHi=e=>{const c=(e&&e.code)||"";
  if(/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c))return "गलत नंबर/PIN या पासवर्ड";
  if(/too-many-requests/.test(c))return "बहुत बार गलत हुआ — थोड़ी देर बाद कोशिश करें";
  if(/network/.test(c))return "इंटरनेट नहीं है — पहली बार लॉगिन के लिए नेट चाहिए";
  if(/email-already-in-use/.test(c))return "यह ईमेल पहले से है — लॉगिन करें";
  if(/weak-password/.test(c))return "पासवर्ड कम से कम 6 अक्षर का रखें";
  if(/invalid-email/.test(c))return "ईमेल सही लिखें";
  return "नहीं हुआ ("+(c||"error")+")"};

function loginFlow(){
  return new Promise(resolve=>{
    const st={mode:"staff",step:"phone",phone:"",pin:"",err:"",busy:false};
    const L=lockEl();
    const draw=()=>drawLogin(st);
    draw();
    const tryStaff=async()=>{
      st.busy=true;st.err="";draw();
      try{
        let v=1;try{const x=st.idx?{exists:true,data:()=>st.idx}:await db.doc("staffIndex/"+st.phone).get();if(x.exists)v=+x.data().v||1}catch(e){}
        await auth.signInWithEmailAndPassword(staffEmail(st.phone,v),staffPass(st.phone,st.pin));
        try{const h=await SE.pinHash(st.phone,st.pin);localStorage.setItem("se_pinh",h);localStorage.setItem("se_pinlen",String(st.pin.length));localStorage.setItem("se_pinph",st.phone);localStorage.setItem("se_act",String(Date.now()));localStorage.setItem("bh_pin_ts",String(Date.now()))}catch(e){}
      }catch(e){st.busy=false;st.pin="";st.err=errHi(e);st.fails=(st.fails||0)+1;
        /* 5 बार गलत → 5 मिनट रुकें (इस फोन पर) */
        if(st.fails>=5){st.until=Date.now()+5*60000;st.fails=0;try{localStorage.setItem("bh_lgwait",String(st.until))}catch(x){}st.err="5 बार गलत PIN — 5 मिनट बाद कोशिश करें"}
        draw()}
    };
    L.onclick=async e=>{
      const lg=e.target.closest("[data-lg]");
      if(lg){const a=lg.dataset.lg;st.err="";st.msg="";
        if(a==="to-owner"){st.mode="owner";draw();return}
        if(a==="to-staff"){st.mode="staff";st.step="phone";draw();return}
        if(a==="back"){st.step="phone";st.pin="";draw();return}
        if(a==="owner-toggle"){st.create=!st.create;draw();return}
        if(a==="logout"){await auth.signOut();st.mode="owner";draw();return}
        if(a==="owner-reset"){const em=$("#lgEmail").value.trim();if(!em){st.err="पहले ईमेल लिखें";draw();return}
          try{await auth.sendPasswordResetEmail(em);st.msg="पासवर्ड बदलने का लिंक "+em+" पर भेज दिया"}catch(x){st.err=errHi(x)}draw();return}
        if(a==="owner-go"){const em=$("#lgEmail").value.trim(),pw=$("#lgPass").value;st.email=em;
          if(!em||pw.length<6){st.err="ईमेल और 6+ अक्षर का पासवर्ड डालें";draw();return}
          st.busy=true;draw();
          try{if(st.create){const r=await auth.createUserWithEmailAndPassword(em,pw);await r.user.sendEmailVerification()}else await auth.signInWithEmailAndPassword(em,pw)}
          catch(x){st.err=errHi(x)}st.busy=false;if(st.err)draw();return}
        if(a==="verify-resend"){try{await auth.currentUser.sendEmailVerification();st.err="लिंक दोबारा भेजा"}catch(x){st.err=errHi(x)}draw();return}
        if(a==="verify-done"){try{await auth.currentUser.reload();await auth.currentUser.getIdToken(true)}catch(x){}
          if(auth.currentUser&&auth.currentUser.emailVerified){done(auth.currentUser)}else{st.err="अभी पक्का नहीं हुआ — Gmail में लिंक दबाएँ";draw()}return}
        return}
      const k=e.target.closest("[data-k]");if(!k||st.mode!=="staff"||st.busy)return;
      {const w=Math.max(st.until||0,+(localStorage.getItem("bh_lgwait")||0));if(w>Date.now()){st.err="5 बार गलत PIN — "+Math.ceil((w-Date.now())/60000)+" मिनट बाद कोशिश करें";draw();return}}
      const v=k.dataset.k;st.err="";
      if(st.step==="phone"){
        if(v==="c")st.phone="";else if(v==="b")st.phone=st.phone.slice(0,-1);else if(st.phone.length<10)st.phone+=v;
        if(st.phone.length===10){st.step="pin";st.pin="";st.len=4;st.idx=null;
          /* PIN कितने अंक का — staffIndex में (नए खाते 6, पुराने 4) */
          db.doc("staffIndex/"+st.phone).get().then(x=>{st.idx=x.exists?x.data():{};st.len=+(st.idx.len)===6?6:4;if(st.step==="pin")draw()}).catch(()=>{})}
        draw();return}
      const L2=st.len||4;
      if(v==="c")st.pin="";else if(v==="b")st.pin=st.pin.slice(0,-1);else if(st.pin.length<L2)st.pin+=v;
      draw();if(st.pin.length===L2)tryStaff();
    };
    let finished=false;
    const done=u=>{if(finished)return;finished=true;L.onclick=null;resolve(u)};
    SE._loginWait=async u=>{
      if(!u)return;
      if(u.email&&!u.emailVerified&&await isOwnerMail(u.email)){st.mode="verify";st.email=u.email;draw();return}
      done(u)};
  });
}

/* लॉगिन के बाद तय करें: मालिक या कर्मचारी */
async function resolveRole(u){
  const isOwner=!!(u.email&&u.emailVerified&&await isOwnerMail(u.email));
  if(isOwner){
    try{await u.getIdToken(true)}catch(e){} // ईमेल पक्की होने के बाद नया टिकट — वरना सर्वर पुराना "पक्की नहीं" वाला देखता है
    try{await db.doc("staff/"+u.uid).set({name:CFG.ownerName||"विक्रम जी",owner:true,active:true,email:u.email,ts:Date.now()},{merge:true})}catch(e){}
    return {uid:u.uid,name:CFG.ownerName||"विक्रम जी",isOwner:true}}
  let d=null;
  try{const x=await db.doc("staff/"+u.uid).get({source:"default"});d=x.exists?x.data():null}catch(e){
    try{const x=await db.doc("staff/"+u.uid).get({source:"cache"});d=x.exists?x.data():null}catch(e2){}}
  if(!d||d.active===false){await auth.signOut();return null}
  return {uid:u.uid,name:d.name||"कर्मचारी",phone:d.phone||"",isOwner:false};
}

SE.start=async function(){
  if(!SE.configured||!window.firebase)return null;
  initFB();
  for(;;){
    const first=await new Promise(r=>{const un=auth.onAuthStateChanged(u=>{un();r(u)})});
    let u=first;
    if(!u||(u.email&&!u.emailVerified&&await isOwnerMail(u.email))){
      const p=loginFlow();
      const un=auth.onAuthStateChanged(x=>{if(x&&SE._loginWait)SE._loginWait(x)});
      if(u)SE._loginWait(u);
      u=await p;un();
    }
    const who=await resolveRole(u);
    if(who){const L=lockEl();L.hidden=true;L.innerHTML="";SE.me=who;
      auth.onAuthStateChanged(x=>{if(!x&&SE.me){SE.me=null;location.reload()}});
      return {db,...who}}
    const L=lockEl();L.hidden=false;
    L.innerHTML=`<div style="font-size:44px">⛔</div><h2>खाता चालू नहीं है</h2><p class="note">यह नंबर अभी चालू नहीं है। विक्रम जी से कहें कि "रेट व सेटिंग" में आपका नाम जोड़ें।</p><button class="big" onclick="location.reload()">दोबारा कोशिश करें</button>`;
    await new Promise(()=>{});
  }
};
/* मालिक को सर्वर से अनुमति मिल रही है या नहीं — गड़बड़ हो तो साफ़ कारण */
SE.ownerDiag=async function(){
  const u=auth&&auth.currentUser;if(!u)return {ok:false,why:"लॉगिन नहीं"};
  let cl={};try{cl=(await u.getIdTokenResult(true)).claims||{}}catch(e){}
  try{await db.collection("settings").doc("main").get({source:"server"});return {ok:true,cl}}
  catch(e){return {ok:false,code:e.code||"",cl,why:!cl.email_verified?"ईमेल अभी पक्की नहीं (Gmail का लिंक दबाएँ, फिर लॉग-आउट करके दोबारा लॉगिन)":"Firestore के Rules में नया कोड Publish नहीं हुआ या गलत चिपका है"}}
};
SE.pinHash=async(ph,pin)=>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("se|"+ph+"|"+pin));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")};
SE.logout=async()=>{try{localStorage.removeItem("se_pinh")}catch(e){}try{await auth.signOut()}catch(e){}location.reload()};

/* मालिक नया कर्मचारी जोड़े — मोबाइल + 6 अंक PIN (आसान PIN जैसे 111111 / 123456 नहीं) */
SE.weakPin=p=>/^(\d)\1+$/.test(p)||"0123456789".includes(p)||"9876543210".includes(p);
SE.addStaff=async function(name,phone,pin){
  phone=String(phone).replace(/\D/g,"").slice(-10);
  if(!name||phone.length!==10||!/^\d{6}$/.test(pin))throw {msg:"नाम, 10 अंक का मोबाइल और 6 अंक का PIN डालें"};
  if(SE.weakPin(pin))throw {msg:"यह PIN बहुत आसान है (जैसे 111111 / 123456) — कोई दूसरा 6 अंक का PIN चुनें"};
  let v=1;try{const x=await db.doc("staffIndex/"+phone).get();if(x.exists)v=(+x.data().v||1)+1}catch(e){}
  const sec=firebase.apps.find(a=>a.name==="sec")||firebase.initializeApp(CFG.firebase,"sec");
  const r=await sec.auth().createUserWithEmailAndPassword(staffEmail(phone,v),staffPass(phone,pin));
  const uid=r.user.uid;await sec.auth().signOut();
  // पुराने खाते (उसी नंबर के) बंद — PIN बदलने पर पुराना PIN काम नहीं करेगा
  try{const old=await db.collection("staff").where("phone","==",phone).get();for(const d of old.docs)if(d.id!==uid&&d.data().active!==false)await d.ref.update({active:false,offTs:Date.now(),offWhy:"नया PIN"})}catch(e){}
  await db.doc("staff/"+uid).set({name,phone,pin,active:true,owner:false,ts:Date.now(),by:auth.currentUser.uid});
  await db.doc("staffIndex/"+phone).set({v,len:6});
  return uid;
};
SE.setStaffActive=(uid,on)=>db.doc("staff/"+uid).update({active:!!on,[on?"onTs":"offTs"]:Date.now()});

/* ---------- फोटो ---------- */
SE.bundled=new Set(window.SE_PHOTOS||[]);
SE.photos={};
SE.photoSrc=function(it){if(!it)return "";if(SE.photos[it.id])return SE.photos[it.id];if(it.photo!=="none"&&SE.bundled.has(it.id))return "img/"+it.id+".jpg";
  /* 📦 GitHub खेप वाली असली फोटो — Pages से (CDN), OTA ज़िप में नहीं */
  if(it.ph&&it.photo!=="none")return (SE.isNative&&CFG.updateUrl?CFG.updateUrl.replace(/\/?$/,"/"):"")+"p/"+encodeURIComponent(it.id)+".jpg?v="+encodeURIComponent(it.ph);return ""};
SE.watchPhotos=function(onChange){if(!db)return;db.collection("photos").onSnapshot(s=>{SE.photos={};s.docs.forEach(d=>{const x=d.data();if(x&&x.d)SE.photos[d.id]=x.d});onChange&&onChange()},()=>{})};
SE.savePhoto=async function(id,blob,max,q){
  /* ऐप में फोटो छोटी (लगभग 8-12 KB) — ताकि ऐप हल्का रहे */
  const url=await new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(blob);img.onload=()=>{const m=max||240,sc=Math.min(1,m/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL("image/jpeg",q||.7))};img.onerror=rej;img.src=u});
  await db.doc("photos/"+id).set({d:url,ts:Date.now()});SE.photos[id]=url;return "fs"+Date.now();
};

/* ---------- कैमरा स्कैनर ---------- */
let mlReady=null;
async function nativeScan(){
  const B=N.BarcodeScanner;
  if(!mlReady)mlReady=(async()=>{try{const a=await B.isGoogleBarcodeScannerModuleAvailable();if(!a.available){await B.installGoogleBarcodeScannerModule();await new Promise(r=>setTimeout(r,2500))}}catch(e){}})();
  await mlReady;
  const F=N.BarcodeFormat;
  const r=await B.scan({formats:[F.Ean13,F.Ean8,F.UpcA,F.UpcE,F.Code128,F.Code39,F.Code93,F.Itf,F.QrCode]});
  return (r&&r.barcodes&&r.barcodes[0]&&r.barcodes[0].rawValue)||null;
}
/* Chrome (वेब) में लाइव कैमरा — BarcodeDetector */
function webLiveScan(){
  return new Promise(async resolve=>{
    let stream=null,stop=false;
    const ov=document.createElement("div");ov.className="camov";
    ov.innerHTML=`<video playsinline muted></video><div class="camframe"></div><p>बारकोड को चौखटे में लाएँ — अपने-आप पढ़ लेगा</p><button class="big ghost">बंद करें</button>`;
    document.body.appendChild(ov);
    const end=v=>{stop=true;try{stream&&stream.getTracks().forEach(t=>t.stop())}catch(e){}ov.remove();resolve(v)};
    ov.querySelector("button").onclick=()=>end(null);
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280}},audio:false});
      const v=ov.querySelector("video");v.srcObject=stream;await v.play();
      const bd=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","code_39","itf","qr_code"]});
      const tick=async()=>{if(stop)return;try{const r=await bd.detect(v);if(r&&r.length){end(r[0].rawValue);return}}catch(e){}setTimeout(tick,120)};tick();
    }catch(e){end(undefined)}
  });
}
/* ---------- लगातार कैमरा (बिलिंग में खुला रहता है) ----------
   कैमरा-खिड़की स्क्रीन के बीच में — फोन का लेंस बीच में सबसे अच्छा फोकस करता है।
   Android: ML Kit startScan — कैमरा WebView के पीछे, बीच की खिड़की पारदर्शी; हल्का ज़ूम ताकि 10-15 cm से पढ़े
   Chrome/लैपटॉप: <video> + BarcodeDetector — सिर्फ़ बीच का हिस्सा (ROI) जाँचता है, ~9 फ्रेम/सेकंड
   सिर्फ़ दुकान वाले कोड: EAN-13/8, UPC-A/E (1D), Code-128 (लेबल), QR (2D) — कम प्रकार = तेज़
   EAN/UPC का जाँच-अंक मिलाकर ही मानता है; एक पैकेट सामने रुका रहे तो एक ही बार जुड़ेगा */
/* 🔫 बारकोड-गन इंजन (05-11-2026) — कैमरा, हाथ वाली USB/ब्लूटूथ गन, फोटो — सबका कोड एक ही तरह साफ़ होता है
   • किसी भी दिशा (उल्टा/तिरछा/दाएँ-बाएँ) — ML Kit/BarcodeDetector 360° पढ़ते हैं; हम सिर्फ़ बीच वाला चुनते हैं
   • EAN/UPC का जाँच-अंक मिलना ज़रूरी · जिन कोड में जाँच-अंक नहीं (Code39, ITF, Codabar) उन्हें 2 बार एक-सा पढ़ने पर ही मानें
   • GS1 (QR/DataMatrix/GS1-128 में (01)GTIN) → असली 13 अंक का बारकोड · AIM उपसर्ग (]E0 ]C1 ]Q3 ]d2) और अदृश्य अक्षर हटें */
SE.normCode=function(raw){let c=String(raw==null?"":raw).replace(/[\u0000-\u001c\u001e\u001f\u007f]/g,"").replace(/\u001d/g,"|").trim();
  c=c.replace(/^\][A-Za-z]\d/,"");
  const g=/^\(?01\)?(\d{14})/.exec(c.replace(/\|/g,""));if(g&&c.length>16&&/^\(?01/.test(c))c=g[1];
  if(/^\d{14}$/.test(c)&&c[0]==="0")c=c.slice(1);
  return c};
SE.codeVariants=function(c){c=SE.normCode(c);const v=[c];if(/^\d{12}$/.test(c))v.push("0"+c);if(/^0\d{12}$/.test(c))v.push(c.slice(1));
  if(/^[01]\d{7}$/.test(c)){const d=c.slice(1,7),x=c[7],m=d[5];let a;if("012".includes(m))a=d.slice(0,2)+m+"0000"+d.slice(2,5);else if(m==="3")a=d.slice(0,3)+"00000"+d.slice(3,5);else if(m==="4")a=d.slice(0,4)+"00000"+d[4];else a=d.slice(0,5)+"0000"+m;const up=c[0]+a+x;v.push(up,"0"+up)}
  return [...new Set(v)]};
const NOCHK=/code_?39|itf|codabar|CODE_39|ITF|CODABAR/i;
function gtinOk(c){if(!/^\d+$/.test(c)||![8,12,13,14].includes(c.length))return true;let s=0;const d=c.slice(0,-1);
  for(let i=0;i<d.length;i++)s+=(+d[d.length-1-i])*(i%2?1:3);return (10-s%10)%10===+c[c.length-1]}
SE.cam={on:false,torch:false,_seen:{},_h:[],_stream:null,_t:0,GAP:900,zoom:1,maxZoom:1,
  canTorch:false,canZoom:false,
  _cand:{},
  _emit(code,cb,fmt){code=SE.normCode(code);if(!code||code.length<4)return;if(!gtinOk(code)&&!(code.length===8&&SE.codeVariants(code).slice(1).some(gtinOk)))return;const now=Date.now();
    /* बिना जाँच-अंक वाले कोड: 700ms में 2 बार एक-सा पढ़ा जाए तभी */
    if(fmt&&NOCHK.test(String(fmt))){const k=this._cand[code];this._cand[code]=now;if(!(k&&now-k<700))return}
    const last=this._seen[code];this._seen[code]=now;if(last&&now-last<this.GAP)return;
    for(const k in this._seen)if(now-this._seen[k]>5000)delete this._seen[k];
    if(document.hidden)return;cb(code)},
  wantZoom(){const z=parseFloat(ls.get("se_zoom"));return z>0?z:1.6},
  async setZoom(z){z=Math.max(1,Math.min(z,this.maxZoom||1));try{
    if(SE.isNative)await N.BarcodeScanner.setZoomRatio({zoomRatio:z});
    else if(this._stream)await this._stream.getVideoTracks()[0].applyConstraints({advanced:[{zoom:z}]});
    this.zoom=z;ls.set("se_zoom",String(z))}catch(e){}return this.zoom},
  async cycleZoom(){const steps=[1,1.6,2.2,3].filter(x=>x<=this.maxZoom+0.01);if(!steps.length)return this.zoom;const i=steps.findIndex(x=>Math.abs(x-this.zoom)<0.05);return this.setZoom(steps[(i+1)%steps.length])},
  async start(cb,video,roi){
    if(this.on)return true;this._seen={};
    if(SE.isNative){const B=N.BarcodeScanner,F=N.BarcodeFormat;
      const pm=await B.checkPermissions().catch(()=>({}));if(pm.camera!=="granted"){const r=await B.requestPermissions().catch(()=>({}));if(r.camera!=="granted")throw {msg:"कैमरे की अनुमति नहीं मिली — फोन की सेटिंग में 177 MH कैंटीन को कैमरा दें"}}
      this._h.push(await B.addListener("barcodesScanned",ev=>{const L=((ev&&ev.barcodes)||[]).filter(b=>b&&b.rawValue);if(!L.length)return;const b=L.length>1?SE.pickCenter(L,window.innerWidth/2,(window.innerHeight)*.3):L[0];this._emit(String(b.rawValue),cb,b.format)}));
      document.documentElement.classList.add("camnative");
      await B.startScan({formats:[F.Ean13,F.Ean8,F.UpcA,F.UpcE,F.Code128,F.Code39,F.Code93,F.Itf,F.Codabar,F.QrCode,F.DataMatrix].filter(Boolean)});
      try{this.canTorch=!!(await B.isTorchAvailable()).available}catch(e){this.canTorch=false}
      try{this.maxZoom=+(await B.getMaxZoomRatio()).zoomRatio||1;this.canZoom=this.maxZoom>1.05;if(this.canZoom)await this.setZoom(this.wantZoom())}catch(e){this.canZoom=false}
      this.on=true;return true}
    if(!("BarcodeDetector" in window)||!navigator.mediaDevices)return false;
    const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1920},height:{ideal:1080}},audio:false});
    this._stream=st;video.srcObject=st;await video.play().catch(()=>{});
    const tr=st.getVideoTracks()[0];let cap={};try{cap=(tr.getCapabilities&&tr.getCapabilities())||{}}catch(e){}
    this.canTorch=!!cap.torch;
    try{if(cap.focusMode&&cap.focusMode.includes("continuous"))await tr.applyConstraints({advanced:[{focusMode:"continuous"}]})}catch(e){}
    this.maxZoom=cap.zoom&&cap.zoom.max?Math.min(cap.zoom.max,4):1;this.canZoom=this.maxZoom>1.05;if(this.canZoom)await this.setZoom(this.wantZoom());
    let fm=["ean_13","ean_8","upc_a","upc_e","code_128","code_39","code_93","itf","codabar","qr_code","data_matrix"];try{const sup=await BarcodeDetector.getSupportedFormats();fm=fm.filter(f=>sup.includes(f))}catch(e){}
    const bd=new BarcodeDetector({formats:fm});
    const cv=document.createElement("canvas"),cx=cv.getContext("2d",{willReadFrequently:true});
    this.on=true;let busy=false,n=0;
    const tick=async()=>{if(!this.on)return;
      if(!busy&&!document.hidden&&video.readyState>=2){busy=true;n++;
        try{let src=video;
          // बीच का हिस्सा (कैमरा-खिड़की के चौखटे जितना) — हर 5वें फ्रेम में पूरा फ्रेम भी
          if(roi&&n%3){const vw=video.videoWidth,vh=video.videoHeight,el=video.getBoundingClientRect();
            if(vw&&vh&&el.width&&el.height){const sc=Math.max(el.width/vw,el.height/vh),visW=el.width/sc,visH=el.height/sc,ox=(vw-visW)/2,oy=(vh-visH)/2,r=roi();
              const sx=ox+visW*r[0],sy=oy+visH*r[1],sw=visW*(r[2]-r[0]),sh=visH*(r[3]-r[1]),k=Math.min(1,960/sw);
              cv.width=Math.round(sw*k);cv.height=Math.round(sh*k);cx.drawImage(video,sx,sy,sw,sh,0,0,cv.width,cv.height);src=cv}}
          const r=await bd.detect(src);if(r&&r.length){const w=(src.videoWidth||src.width),h=(src.videoHeight||src.height);const b=r.length>1?SE.pickCenter(r,w/2,h/2):r[0];this._emit(String(b.rawValue),cb,b.format)}}catch(e){}
        busy=false}
      this._t=setTimeout(tick,110)};tick();
    return true},
  async stop(){if(!this.on&&!this._stream)return;this.on=false;this.torch=false;clearTimeout(this._t);
    if(SE.isNative){try{await N.BarcodeScanner.stopScan()}catch(e){}for(const h of this._h)try{h.remove()}catch(e){}this._h=[];document.documentElement.classList.remove("camnative")}
    if(this._stream){try{this._stream.getTracks().forEach(t=>t.stop())}catch(e){}this._stream=null}},
  async toggleTorch(){try{if(SE.isNative){await N.BarcodeScanner.toggleTorch();this.torch=!this.torch}
    else if(this._stream){this.torch=!this.torch;await this._stream.getVideoTracks()[0].applyConstraints({advanced:[{torch:this.torch}]})}}catch(e){}return this.torch}
};
/* कई बारकोड दिखें तो वही जो खिड़की के बीच के सबसे पास */
SE.pickCenter=function(L,cx,cy){let best=L[0],bd=1e18;for(const b of L){let x=null,y=null;const bb=b.boundingBox||b.bounds;const cp=b.cornerPoints;
  if(bb&&bb.width!=null){x=(bb.x!=null?bb.x:bb.left)+bb.width/2;y=(bb.y!=null?bb.y:bb.top)+bb.height/2}
  else if(Array.isArray(cp)&&cp.length){x=0;y=0;cp.forEach(p=>{x+=(p.x!=null?p.x:p[0]);y+=(p.y!=null?p.y:p[1])});x/=cp.length;y/=cp.length}
  if(x==null)continue;const d=(x-cx)**2+(y-cy)**2;if(d<bd){bd=d;best=b}}return best};
SE.canLiveScan=()=>SE.isNative||("BarcodeDetector" in window&&!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia));
/* null = बंद किया, undefined = यह फोन लाइव स्कैन नहीं कर सकता */
SE.scan=async function(){
  if(SE.isNative){try{return await nativeScan()}catch(e){const m=String(e&&e.message||"");if(/cancel/i.test(m))return null;throw e}}
  if("BarcodeDetector" in window)return webLiveScan();
  return undefined;
};

/* ---------- ब्लूटूथ थर्मल प्रिंटर (58/80mm, ESC/POS इमेज) ---------- */
SE.printer={
  get addr(){return ls.get("se_prn")||""},get name(){return ls.get("se_prn_n")||""},
  /* चौड़ाई डॉट में: 58mm=384, 80mm=576, 4 इंच (Xprinter XP-D4601B जैसे)=800 */
  get mm(){return ls.get("se_prn_w")||"58"},
  get width(){const m=this.mm;return m==="100"?800:m==="80"?576:384},
  get type(){return ls.get("se_prn_t")||(this.mm==="100"?"tspl":"escpos")},
  async list(){if(!SE.isNative)throw {msg:"प्रिंटर सिर्फ़ Android ऐप में जुड़ता है"};const r=await N.BtPrinter.list();return r.devices||[]},
  pick(addr,name,w,t){ls.set("se_prn",addr);ls.set("se_prn_n",name||addr);if(w)ls.set("se_prn_w",String(w));ls.set("se_prn_t",t||(String(w)==="100"?"tspl":"escpos"))},
};
function wrapLines(ctx,text,maxW){const words=String(text).split(" ");const out=[];let cur="";for(const w of words){const t=cur?cur+" "+w:w;if(ctx.measureText(t).width>maxW&&cur){out.push(cur);cur=w}else cur=t}if(cur)out.push(cur);return out}
/* कागज़ जैसी रसीद की तस्वीर — प्रिंट, PDF और WhatsApp तीनों में यही */
SE.receiptCanvas=function(b,o,widthPx){
  const W=widthPx||SE.printer.width,P=Math.round(W*0.03),F='"Mukta","Noto Sans Devanagari","Noto Sans",sans-serif',FB='"Baloo 2","Mukta","Noto Sans Devanagari",sans-serif';
  const k=W/384;const fs=n=>Math.round(n*k);
  const c=document.createElement("canvas");c.width=W;c.height=6000;const x=c.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,W,c.height);x.fillStyle="#000";x.textBaseline="top";
  let y=fs(8);
  const T=(t,sz,al,bold,fam)=>{x.font=`${bold?"800 ":"500 "}${sz}px ${fam||F}`;for(const ln of wrapLines(x,t,W-2*P)){const w=x.measureText(ln).width;x.fillText(ln,al==="c"?(W-w)/2:al==="r"?W-P-w:P,y);y+=Math.round(sz*1.3)}};
  const LR=(l,r,sz,bold)=>{x.font=`${bold?"800 ":"500 "}${sz}px ${F}`;const rw=x.measureText(r).width;x.fillText(l,P,y);x.fillText(r,W-P-rw,y);y+=Math.round(sz*1.35)};
  const DASH=()=>{y+=fs(3);for(let i=P;i<W-P;i+=fs(10))x.fillRect(i,y,fs(6),Math.max(1,fs(1.6)));y+=fs(7)};
  const LINE=()=>{y+=fs(3);x.fillRect(P,y,W-2*P,Math.max(2,fs(2)));y+=fs(7)};
  T("🛒 "+(o.shop||"177 MH कैंटीन"),fs(30),"c",true,FB);
  if(o.tag)T(o.tag,fs(15),"c");
  if(o.addr)T(o.addr,fs(16),"c");
  if(o.phone)T("📞 ऑर्डर: "+o.phone,fs(16),"c");
  LINE();
  if(o.custTag){const h=fs(34);x.fillStyle="#000";if(o.vip){x.fillRect(P,y,W-2*P,h);x.fillStyle="#fff"}else{x.lineWidth=Math.max(2,fs(2));x.strokeRect(P,y,W-2*P,h)}
    x.font=`800 ${fs(20)}px ${FB}`;const tw=x.measureText(o.custTag).width;x.fillText(o.custTag,(W-tw)/2,y+fs(6));x.fillStyle="#000";y+=h+fs(8)}
  LR("बिल नं: "+b.no,"",fs(19),true);
  LR("तारीख: "+(o.date||""),"",fs(17));
  if((b.partyName&&b.partyName!=="VIP ग्राहक")||b.custPhone)LR("ग्राहक: "+(b.partyName||"")+(b.custPhone?" · "+b.custPhone:""),"",fs(17));
  DASH();
  // टेबल: क्र. | सामान | मात्रा | भाव | रकम
  const cS=P,cN=P+W*0.07,cQ=W*0.58,cR=W*0.765,cA=W-P,sz=fs(17);
  const row=(a,bn,q,r,am,bold)=>{x.font=`${bold?"800 ":"500 "}${sz}px ${F}`;const lines=wrapLines(x,bn,cQ-cN-fs(30));const h=Math.round(sz*1.32);
    x.fillText(a,cS,y);lines.forEach((ln,i)=>x.fillText(ln,cN,y+i*h));
    const rt=(t,xr)=>{const w=x.measureText(t).width;x.fillText(t,xr-w,y)};rt(q,cQ+fs(18));rt(r,cR+fs(14));rt(am,cA);y+=h*lines.length+fs(3)};
  row("क्र.","सामान","मात्रा","भाव","रकम",true);DASH();
  (b.lines||[]).forEach((l,i)=>row(String(i+1),window.SN?SN.withEn(l.name):l.name,o.fq(l.qty,l.unit).replace(" कि.ग्रा"," kg"),l.free?"मुफ्त":"₹"+l.rate,"₹"+l.amt));
  DASH();
  const sub=r2(b.sub!=null?b.sub:(b.lines||[]).reduce((a,l)=>a+(l.amt||0),0));
  if(b.disc){LR("जोड़",`₹${sub}`,fs(18));LR("छूट",`−₹${b.disc}`,fs(18))}
  {const ro=window.SF&&SF.roff?SF.roff(b):0;if(ro)LR("जोड़ ₹"+r2(b.sub!=null?b.sub:sub)+" · राउंड ऑफ",(ro>0?"+":"−")+"₹"+Math.abs(ro).toFixed(2),fs(14))}
  LR("कुल रकम",`₹${b.total}`,fs(30),true);
  if(o.saved>0){const h=fs(32);x.lineWidth=Math.max(2,fs(2));x.strokeRect(P,y,W-2*P,h);x.font=`800 ${fs(19)}px ${FB}`;const st="🎉 आपने MRP से ₹"+o.saved+" बचाए",sw=x.measureText(st).width;x.fillText(st,(W-sw)/2,y+fs(5));y+=h+fs(6)}
  if(b.pay&&o.paid!==false&&!o.stampL){const p=b.pay;const parts=[p.cash?"नकद ₹"+p.cash:"",p.upi?"UPI ₹"+p.upi:"",p.udhar?"उधार ₹"+p.udhar:""].filter(Boolean);if(parts.length)T("भुगतान: "+parts.join(" · "),fs(16),"l")}
  if(o.balance!=null)LR("खाते में कुल बाकी",`₹${o.balance}`,fs(18),true);
  if(o.qr||o.stampL){DASH();if(o.qr)T(o.qrLabel||"स्कैन करके भुगतान करें",fs(17),"c",true);
    const s=o.qr?Math.round(W*0.44):0,pad=fs(8),y0=y+pad,sideW=Math.round((W-2*P-s)/2)-fs(12);
    if(o.qr){x.imageSmoothingEnabled=false;x.drawImage(o.qr,(W-s)/2,y0,s,s);
      const bx=(W-s)/2-pad,by=y0-pad,bw=s+2*pad,r=fs(12);x.lineWidth=Math.max(3,fs(3.5));x.strokeStyle="#000";x.beginPath();x.moveTo(bx+r,by);x.arcTo(bx+bw,by,bx+bw,by+bw,r);x.arcTo(bx+bw,by+bw,bx,by+bw,r);x.arcTo(bx,by+bw,bx,by,r);x.arcTo(bx,by,bx+bw,by,r);x.closePath();x.stroke();
      x.font=`800 ${fs(13)}px ${F}`;const tg="UPI · स्कैन करें",tw=x.measureText(tg).width+fs(14);x.fillStyle="#000";x.fillRect((W-tw)/2,by-fs(9),tw,fs(18));x.fillStyle="#fff";x.fillText(tg,(W-tw)/2+fs(7),by-fs(8));x.fillStyle="#000"}
    const stamp=(st,x0,col)=>{if(!st)return;const L=[[st.l1,fs(19),800],[st.l2,fs(16),700],[st.l3,fs(13),500]].filter(l=>l[0]);
      const lh=L.map(l=>Math.round(l[1]*1.3));const h=lh.reduce((a,b)=>a+b,0)+fs(16);const by=y0+Math.max(0,((s||h)-h)/2);
      x.save();x.translate(x0+sideW/2,by+h/2);x.rotate(col==="l"?-0.06:0.06);x.lineWidth=Math.max(2,fs(2.5));x.strokeStyle="#000";
      const rr=(a,b,w,hh,r)=>{x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+hh,r);x.arcTo(a+w,b+hh,a,b+hh,r);x.arcTo(a,b+hh,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();x.stroke()};
      rr(-sideW/2,-h/2,sideW,h,fs(10));x.lineWidth=Math.max(1,fs(1));rr(-sideW/2+fs(4),-h/2+fs(4),sideW-fs(8),h-fs(8),fs(7));
      let yy=-h/2+fs(8);L.forEach((l,k)=>{x.font=`${l[2]} ${l[1]}px ${F}`;for(const ln of wrapLines(x,l[0],sideW-fs(14)).slice(0,2)){const w=x.measureText(ln).width;x.fillStyle="#000";x.fillText(ln,-w/2,yy);yy+=lh[k]}});x.restore();
      return by+h};
    const e1=stamp(o.stampL,P,"l")||0,e2=stamp(o.stampR,W-P-sideW,"r")||0;
    y=Math.max(y0+s+pad,e1,e2)+fs(8);if(o.qr&&o.upi)T("UPI: "+o.upi,fs(14),"c")}
  const t=o.nutri!==false&&window.SN&&SN.ofBill(b);
  if(t){DASH();T("🥗 इस थैले में आपकी सेहत (लगभग)",fs(18),"c",true);
    const cells=SN.cells(t),half=(W-2*P)/2;x.font=`500 ${fs(15)}px ${F}`;
    for(let i=0;i<cells.length;i+=2){[cells[i],cells[i+1]].forEach((c,j)=>{if(!c)return;const x0=P+j*half;x.font=`500 ${fs(15)}px ${F}`;x.fillText(c[0]+" "+c[1],x0,y);
      x.font=`800 ${fs(15)}px ${F}`;const v=c[2],vw=x.measureText(v).width;x.fillText(v,x0+half-vw-(j?fs(4):fs(18)),y)});y+=Math.round(fs(15)*1.45)}
    const hl=SN.headline(t);if(hl){y+=fs(2);T(hl,fs(16),"c",true)}
    SN.top(t,2).forEach(it=>T("• "+it.name+" ("+it.en+"): "+it.why,fs(14),"l"));
    const ch=SN.cheer(t);if(ch)T(ch,fs(15),"c",true);
    T(SN.note,fs(12),"c")}
  DASH();
  if(o.phone){const y0=y;y+=fs(8);T("📲 घर बैठे सामान मँगाएँ",fs(18),"c",true);T("WhatsApp या कॉल करें",fs(15),"c");T(o.phone,fs(28),"c",true,FB);y+=fs(4);
    x.lineWidth=Math.max(2,fs(2));x.strokeRect(P,y0,W-2*P,y-y0);y+=fs(8)}
  T("🙏 धन्यवाद! फिर पधारें",fs(19),"c",true);
  if(b.byName&&!o.stampR)T("बिलर: "+b.byName,fs(14),"c");
  y+=fs(24);
  const out=document.createElement("canvas");out.width=W;out.height=Math.ceil(y);out.getContext("2d").drawImage(c,0,0);return out;
};
const r2=n=>Math.round((+n||0)*100)/100;
function canvasToEscPos(cv){
  const W=cv.width,H=cv.height,bw=W>>3;const d=cv.getContext("2d").getImageData(0,0,W,H).data;
  const parts=[[0x1b,0x40]];
  for(let y0=0;y0<H;y0+=24){
    const h=Math.min(24,H-y0);const blk=new Uint8Array(8+bw*h);
    blk.set([0x1d,0x76,0x30,0x00,bw&255,bw>>8,h&255,h>>8]);
    for(let yy=0;yy<h;yy++)for(let xb=0;xb<bw;xb++){let v=0;for(let bit=0;bit<8;bit++){const i=((y0+yy)*W+xb*8+bit)*4;const lum=d[i]*.3+d[i+1]*.59+d[i+2]*.11;if(lum<150&&d[i+3]>100)v|=0x80>>bit}blk[8+yy*bw+xb]=v}
    parts.push(blk);
  }
  parts.push([0x1b,0x64,0x04],[0x1d,0x56,0x42,0x00]);
  return toB64(parts);
}
function toB64(parts){let n=0;parts.forEach(p=>n+=p.length);const all=new Uint8Array(n);let o=0;parts.forEach(p=>{all.set(p,o);o+=p.length});
  let s="";for(let i=0;i<all.length;i+=0x8000)s+=String.fromCharCode.apply(null,all.subarray(i,i+0x8000));return btoa(s)}
/* TSPL (लेबल प्रिंटर, जैसे Xprinter XP-D4601B) — कोई भी तस्वीर छापो */
/* 🏷️ लेबल खिसकाना (मिलीमीटर): लेबल रोल प्रिंटर में थोड़ा दाएँ/बाएँ या गैप-सेंसर ऊपर/नीचे हो तो पूरी छपाई उतनी खिसकाओ —
   + X = दाएँ, + Y = नीचे (8 डॉट = 1 mm, 203 DPI)। किनारे कभी न कटें, इसलिए लेबल का डिज़ाइन खुद 3 mm किनारा छोड़ता है */
function lblShift(cv){const sx=parseFloat(ls.get("se_lsx"))||0,sy=parseFloat(ls.get("se_lsy"))||0;if(!sx&&!sy)return cv;
  const c=document.createElement("canvas");c.width=cv.width;c.height=cv.height;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.imageSmoothingEnabled=false;x.drawImage(cv,Math.round(sx*8),Math.round(sy*8));return c}
SE.tsplCalib=function(wmm,hmm,gap){const g=gap!=null?gap:(ls.get("se_lgap")||"2");
  return toB64([new TextEncoder().encode(`SIZE ${wmm} mm,${hmm} mm\r\nGAP ${g} mm,0 mm\r\nGAPDETECT\r\nHOME\r\n`)])};
SE.tspl=function(cv,opt){
  opt=opt||{};cv=lblShift(cv);const W=cv.width,H=cv.height,wb=Math.ceil(W/8);const d=cv.getContext("2d").getImageData(0,0,W,H).data;
  const inv=ls.get("se_linv")==="1";const bmp=new Uint8Array(wb*H);
  for(let y=0;y<H;y++)for(let xb=0;xb<wb;xb++){let v=0;for(let b=0;b<8;b++){const px=xb*8+b;let black=false;if(px<W){const i=(y*W+px)*4;black=(d[i]*.3+d[i+1]*.59+d[i+2]*.11)<150}
      const bit=inv?black:!black;if(bit)v|=0x80>>b}bmp[y*wb+xb]=v} // TSPL में 0 = काला डॉट
  const wmm=opt.wmm||Math.round(W/8),hmm=opt.hmm||Math.ceil(H/8);
  const enc=s=>new TextEncoder().encode(s);
  const head=enc(`SIZE ${wmm} mm,${hmm} mm\r\nGAP ${opt.gap!=null?opt.gap:(ls.get("se_lgap")||"2")} mm,0 mm\r\nSPEED 3\r\nDENSITY ${ls.get("se_lden")||"10"}\r\nDIRECTION 1,0\r\nREFERENCE 0,0\r\nOFFSET 0 mm\r\nSET TEAR ON\r\nCLS\r\nBITMAP 0,0,${wb},${H},0,`);
  const tail=enc(`\r\nPRINT ${opt.copies||1},1\r\nEND\r\n`);
  return toB64([head,bmp,tail]);
};
SE.escpos=canvasToEscPos;
SE.printReceipt=async function(b,o){
  const cv=SE.receiptCanvas(b,o);
  if(SE.isNative){
    if(!SE.printer.addr)throw {code:"noprinter",msg:"पहले \"रेट व सेटिंग\" में प्रिंटर चुनें"};
    const data=SE.printer.type==="tspl"?SE.tspl(cv,{gap:0}):canvasToEscPos(cv);
    await N.BtPrinter.print({address:SE.printer.addr,data});return "bt"}
  const url=cv.toDataURL("image/png");
  printHTMLWeb(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${SE.printer.mm}mm auto;margin:0}body{margin:0}img{width:100%;display:block}</style></head><body><img src="${url}"></body></html>`);
  return "web";
};
/* बिल PDF बनाकर ग्राहक के WhatsApp पर */
SE.shareReceipt=async function(b,o,phone,text){
  const cv=SE.receiptCanvas(b,o,768);const png=cv.toDataURL("image/png").split(",")[1];
  const name="MH177Canteen_"+String(b.no||"bill").replace(/[^A-Za-z0-9]/g,"");
  if(SE.isNative){
    try{await N.BtPrinter.shareFile({data:png,name,pdf:true,phone:phone||"",text:text||""});return "pdf"}
    catch(e){const m=String(e&&e.message||"");if(/not implemented|UNIMPLEMENTED/i.test(m))throw {code:"oldapk",msg:"PDF शेयर के लिए नई APK इंस्टॉल करें (लिंक वही है)"};throw e}
  }
  // वेब: फोन का शेयर (WhatsApp चुनें) — न चले तो फोटो डाउनलोड
  const blob=await new Promise(r=>cv.toBlob(r,"image/png"));const file=new File([blob],name+".png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:text||""});return "share"}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name+".png";document.body.appendChild(a);a.click();a.remove();
  return "download";
};
/* 💬 WhatsApp — नंबर डालते ही सीधी उसी ग्राहक की चैट (docs/व्हाट्सएप-प्रॉम्प्ट.txt)
   बड़े ऐप (Vyapar/Khatabook) का तरीका: फ़ाइल-शेयर (ACTION_SEND + jid) सिर्फ़ सेव किए नंबर पर सीधा जाता है, नए नंबर पर
   WhatsApp "किसे भेजें" सूची खोलता है (नंबर दोबारा लिखना पड़ता था)। इसलिए पहले हमेशा "click-to-chat" लिंक —
   ऐप में whatsapp://send?phone=91XXXXXXXXXX&text=… (Capacitor इसे Android Intent से सीधा WhatsApp में खोलता है, नंबर सेव हो या न हो),
   WhatsApp न खुले तो 1.8 सेकंड बाद https://api.whatsapp.com/send (ब्राउज़र/Business)। वेब पर https://wa.me/91…  */
SE.waNum=function(p){let d=String(p||"").replace(/\D/g,"");if(d.length>10&&/^(91|0)/.test(d))d=d.slice(-10);return d.length===10&&/^[6-9]/.test(d)?"91"+d:""};
SE.waUrl=function(phone,text,web){const n=SE.waNum(phone),t=encodeURIComponent(text||"");
  if(SE.isNative&&!web)return "whatsapp://send?"+(n?"phone="+n+"&":"")+"text="+t;
  return "https://"+(web==="api"?"api.whatsapp.com/send?"+(n?"phone="+n+"&":""):"wa.me/"+n+"?")+"text="+t};
SE.wa=function(phone,text){
  SE._waLast={phone:SE.waNum(phone),ts:Date.now()};
  if(!SE.isNative){const w=window.open(SE.waUrl(phone,text,true),"_blank");if(!w)location.href=SE.waUrl(phone,text,true);return true}
  let gone=false;const h=()=>{if(document.hidden)gone=true};document.addEventListener("visibilitychange",h);
  try{location.href=SE.waUrl(phone,text)}catch(e){}
  setTimeout(()=>{document.removeEventListener("visibilitychange",h);if(!gone&&!document.hidden){try{location.href=SE.waUrl(phone,text,"api")}catch(e){}}},1800);
  return true};
/* wa.me / api.whatsapp.com वाला कोई भी लिंक (पुराने बटन, window.open) ऐप में अपने-आप सीधी चैट से */
SE.waParse=function(u){try{const x=new URL(u,location.href);if(!/(^|\.)wa\.me$|api\.whatsapp\.com$/.test(x.hostname))return null;
  return {phone:x.searchParams.get("phone")||x.pathname.replace(/\D/g,""),text:x.searchParams.get("text")||""}}catch(e){return null}};
if(SE.isNative){
  document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a[href]");if(!a)return;const w=SE.waParse(a.getAttribute("href"));if(!w)return;
    e.preventDefault();e.stopPropagation();if(a.getAttribute("aria-disabled")==="true")return;
    a.dispatchEvent(new CustomEvent("wasent",{bubbles:true}));SE.wa(w.phone,w.text)},true);
  const _open=window.open;window.open=function(u){const w=typeof u==="string"&&SE.waParse(u);if(w){SE.wa(w.phone,w.text);return null}return _open.apply(window,arguments)};
}
/* नंबर के खाने में 10 अंक पूरे होते ही (रुककर) अपने-आप भेजो — बीच में बदला तो रुक जाता है */
SE.waAuto=function(inp,go,ms){if(!inp)return;let t=0,last="";
  inp.addEventListener("input",()=>{clearTimeout(t);const n=SE.waNum(inp.value);if(!n||n===last)return;
    t=setTimeout(()=>{if(SE.waNum(inp.value)!==n)return;last=n;try{if(navigator.vibrate)navigator.vibrate(30)}catch(e){}go(n.slice(2))},ms||900)})};
function printHTMLWeb(html){
  const f=document.createElement("iframe");f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";document.body.appendChild(f);
  const d=f.contentWindow.document;d.open();d.write(html);d.close();
  const go=()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){}setTimeout(()=>f.remove(),60000)};
  const imgs=[...d.images];if(!imgs.length)setTimeout(go,300);else Promise.all(imgs.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r}))).then(()=>setTimeout(go,200));
}
/* A4 रिपोर्ट — प्रिंट या PDF सेव */
SE.printA4=async function(title,bodyHTML){
  const html=`<!doctype html><html lang="hi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  @page{size:A4;margin:14mm}body{font-family:"Noto Sans Devanagari","Noto Sans",sans-serif;color:#111;font-size:15px;line-height:1.45}
  h1{font-size:24px;margin:0 0 2px}h2,h3{font-size:18px;margin:14px 0 6px}.sub{color:#555;margin:0 0 12px}
  table{width:100%;border-collapse:collapse;margin:6px 0 12px}th,td{border:1px solid #bbb;padding:5px 7px;text-align:left;vertical-align:top}th{background:#eef5ee}
  td.r,th.r{text-align:right}.tot td{font-weight:700;background:#f6f6f6}button,input,select,.noprint{display:none!important}
  </style></head><body><h1>🛒 177 MH कैंटीन</h1><p class="sub">${esc(title)} · छपा: ${new Date().toLocaleString("hi-IN")}</p>${bodyHTML}</body></html>`;
  if(SE.isNative){await N.BtPrinter.printHtml({html,name:title});return}
  printHTMLWeb(html);
};

/* 🔐 ज़िप का SHA-256 (Capgo 8.5x इसके बिना डाउनलोड नहीं करता)। version.json में हो तो वही, नहीं तो खुद फ़ाइल लाकर गिनो।
   साथ में जाँच: फ़ाइल मिली? (HTTP, आकार, सच में ज़िप "PK") — ताकि ग़लती का असली कारण दिखे। */
SE._zipCk=async function(v,url,D){if(v&&v.checksum&&!D)return v.checksum;
  try{const r=await fetch(url+(url.includes("?")?"&":"?")+"ck="+Date.now(),{cache:"no-store"});const b=new Uint8Array(await r.arrayBuffer());
    const h=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",b))).map(x=>x.toString(16).padStart(2,"0")).join("");
    if(D)D.probe="HTTP "+r.status+" · "+Math.round(b.length/1024)+" KB · "+(b[0]===80&&b[1]===75?"ज़िप ✓":"ज़िप नहीं ✗")+(v&&v.checksum?" · checksum "+(v.checksum===h?"✓":"✗ अलग"):"");
    return r.ok?((v&&v.checksum)||h):(v&&v.checksum)||""}catch(e){if(D)D.probe="फ़ाइल नहीं आई: "+String(e.message||e).slice(0,80);return (v&&v.checksum)||""}};
/* ---------- अपने-आप अपडेट (APK दोबारा नहीं भेजनी पड़ेगी) ----------
   🩹 07-11-2026 सुधार: पहले "मैं ठीक चल रहा हूँ" (notifyAppReady) सिर्फ़ लॉगिन के 4 सेकंड बाद बोला जाता था।
   Capgo 15 सेकंड में यह न सुने तो नया संस्करण "खराब" मानकर पुराना वापस लगा देता है (rollback) — इसी से
   "अपडेट दबाया पर लगा नहीं" होता था। अब ऐप खुलते ही बोलते हैं, लॉगिन से पहले भी जाँचते हैं,
   और अगली बार खुलने पर पक्का करते हैं कि नया संस्करण सच में लगा (न लगे तो साफ़ बताकर दोबारा)। */
const _U=()=>SE.isNative&&N.CapacitorUpdater;
if(_U()){try{N.CapacitorUpdater.notifyAppReady().catch(()=>{})}catch(e){}
  document.addEventListener("DOMContentLoaded",()=>{try{N.CapacitorUpdater.notifyAppReady().catch(()=>{})}catch(e){}})}
/* पिछली बार कौन-सा संस्करण लगाने चले थे — लगा या वापस हो गया? */
SE.updInfo=(()=>{try{const o=JSON.parse(ls.get("se_upd_try")||"null");if(!o||!o.v)return null;ls.set("se_upd_try","");
  if(o.v===SE.version)return {ok:true,v:o.v};if(Date.now()-(+o.ts||0)<30*60000)return {ok:false,v:o.v,from:SE.version};}catch(e){}return null})();
const _markTry=v=>ls.set("se_upd_try",JSON.stringify({v,ts:Date.now(),from:SE.version}));
/* अटका/खराब बंडल हटाओ ताकि दोबारा साफ़ डाउनलोड हो */
async function _dropBundles(U,ver){try{const l=await U.list();for(const x of (l.bundles||[]))if(x.version===ver||x.status==="error")try{await U.delete({id:x.id})}catch(e){}}catch(e){}}
SE.checkUpdate=async function(toast){
  if(!_U()||!CFG.updateUrl)return;
  const U=N.CapacitorUpdater;
  try{await U.notifyAppReady()}catch(e){}
  if(toast&&SE.updInfo){const I=SE.updInfo;SE.updInfo=null;
    if(I.ok)toast("✅ अपडेट लग गया — संस्करण "+I.v);
    else{toast("⚠ पिछला अपडेट ("+I.v+") नहीं लगा — फिर से ला रहे हैं");ls.set("se_upd_ready","");await _dropBundles(U,I.v)}}
  if(SE._chk)return;SE._chk=1;
  try{
    const r=await fetch(CFG.updateUrl.replace(/\/?$/,"/")+"update/version.json?t="+Date.now(),{cache:"no-store"});
    if(!r.ok)return;const v=await r.json();
    if(!v||!v.version||v.version===SE.version)return;
    if(v.minNative&&+v.minNative>+(window.SE_NATIVE_MIN||1)){toast&&toast("नई APK आई है — विक्रम जी से नया ऐप लें");return}
    const pend=ls.get("se_upd_ready");
    let b;
    if(pend===v.version){try{const l=await U.list();b=(l.bundles||[]).find(x=>x.version===v.version&&x.status!=="error")}catch(e){}}
    // पिछली बार डाउनलोड हो चुका — ऐप खुलते ही (कोई बिल चालू न हो तो) तुरंत लगा दो
    if(b&&!SE._busy()){toast&&toast("✨ नया अपडेट "+v.version+" लग रहा है…");try{_markTry(v.version);await U.set({id:b.id});return}catch(e){}}
    if(!b){const zu=new URL(v.url,CFG.updateUrl.replace(/\/?$/,"/")).href;b=await U.download({url:zu,version:v.version,checksum:await SE._zipCk(v,zu)});ls.set("se_upd_ready",v.version)}
    SE._pendingBundle=b;
    toast&&toast("✨ नया अपडेट "+v.version+" आ गया — ऐप बंद करके खोलते ही लग जाएगा");
    if(!SE._asl){SE._asl=1;N.App.addListener("appStateChange",async s=>{if(!s.isActive&&SE._pendingBundle&&!SE._busy()){try{_markTry(SE._pendingBundle.version||"");await U.set({id:SE._pendingBundle.id})}catch(e){}}})}
  }catch(e){}finally{SE._chk=0}
};
/* लॉगिन का इंतज़ार किए बिना भी जाँचो (लॉगिन पन्ने पर अटका पुराना ऐप भी नया हो जाए) */
if(_U())setTimeout(()=>SE.checkUpdate(),6000);
SE._busy=()=>false;
/* 🤖 Google Gemini — Apps Script के ज़रिए (चाबी Script में, ऐप में नहीं) */
/* ऐप की सेटिंग (index.html का S — window पर नहीं होता, इसलिए typeof से) */
const _set=()=>{try{return (typeof S!=="undefined"&&S&&S.settings)||{}}catch(e){return {}}};
SE._ogk="";/* मालिक की चाबी ownerCfg/ai से (se-quick.js) — साथियों के फोन में नहीं */
SE.gk=()=>String(SE._ogk||_set().gk||"").replace(/\s+/g,"");
SE.scriptUrl=()=>CFG.photoUrl||_set().scriptUrl||"";
SE.aiReady=()=>!!(SE.gk()||SE.scriptUrl());
/* सीधा Gemini (चाबी ऐप की सेटिंग में — सिर्फ़ लॉगिन वाले साथी पढ़ सकते हैं; GitHub/कोड में नहीं) */
const AI_P={code:c=>'Search the web (Google) for the retail product with barcode / EAN / GTIN "'+c+'" sold in India. Use only what you actually find for this exact barcode; if nothing reliable is found, set found=false. Reply with ONLY one JSON object, no other words: {"found":true,"name":"Brand Item Size (short, for a shop bill, e.g. Parle-G Biscuit 100g)","hi":"हिंदी नाम","brand":"","size":"","mrp":0,"category":"namkeen|biscuit|chocolate|drinks|dairy|rashan|masala|clean|personal|tobacco|other","source":"website name"}',
  img:'This is a photo of a retail product pack (front or back label) in an Indian shop. Read it. Reply with ONLY one JSON object: {"found":true,"name":"Brand Item Size (short, e.g. Haldiram Bhujia 200g)","hi":"हिंदी नाम","brand":"","size":"","mrp":0,"barcode":"digits if visible else empty","exp":"YYYY-MM if expiry/best-before visible else empty","category":"namkeen|biscuit|chocolate|drinks|dairy|rashan|masala|clean|personal|tobacco|other"}. mrp = printed MRP in rupees (number only). If not readable, use 0 / empty. If this is not a product, found=false.'};
/* मॉडल: फोटो पढ़ने के लिए सबसे समझदार (Pro) पहले, सीमा खत्म हो तो तेज़ वाला (Flash) — बारकोड खोज के लिए Flash (Google खोज के साथ) */
/* 🏷️ बारकोड पहरा: कौन-सा सामान फ़ैक्ट्री पैकेट (कंपनी बारकोड छपा) और कौन-सा खुला/दुकान का (अपना लेबल) — EAN सिर्फ़ सुझाव */
AI_P.bcfind=L=>'You help an Indian army canteen shop. For EACH product below (id | name | brand | size), use Google search and decide:\n'+
 '"pack" = factory-packed branded retail product whose pack carries a printed manufacturer barcode (EAN-13/GTIN, usually starting 890);\n'+
 '"loose" = shop-made, loose, unbranded, sold by weight/plate, handmade sweets/snacks, or no manufacturer barcode.\n'+
 'Only if you find the EXACT EAN-13 for that exact brand+product+size on a reliable page, put it in "ean"; otherwise "". Never guess digits.\n'+
 'Reply with ONLY one JSON object, no other words: {"r":[{"id":"<id>","k":"pack|loose","ean":"","why":"max 8 words"}]}\n\n'+
 L.map(x=>String(x.id)+" | "+String(x.n||"")+" | "+String(x.b||"")+" | "+String(x.s||"")).join("\n");
const GM={bcfind:["gemini-flash-latest","gemini-2.5-flash","gemini-2.0-flash"],img:["gemini-flash-latest","gemini-2.5-flash","gemini-2.0-flash","gemini-2.5-pro"],code:["gemini-flash-latest","gemini-2.5-flash","gemini-2.0-flash"],ping:["gemini-2.5-flash-lite","gemini-2.0-flash","gemini-flash-latest"]};
SE.aiLast="";
/* Android ऐप में Google को सीधा (फ़ोन की मशीनी नेटवर्क से — ब्राउज़र की CORS रोक नहीं); वेब में सामान्य fetch */
async function gfetch(url,opt,ms){
  const H=N.CapacitorHttp;
  if(SE.isNative&&H&&H.request){
    const r=await Promise.race([H.request({url,method:opt.method||"GET",headers:opt.headers||{},data:opt.body?JSON.parse(opt.body):undefined,connectTimeout:ms,readTimeout:ms}),
      new Promise((_,rej)=>setTimeout(()=>{const e=new Error("timeout");e.name="AbortError";rej(e)},ms+2000))]);
    const txt=typeof r.data==="string"?r.data:JSON.stringify(r.data);
    return {ok:r.status>=200&&r.status<300,status:r.status,text:async()=>txt,json:async()=>typeof r.data==="string"?JSON.parse(r.data):r.data}}
  const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),ms);
  try{return await fetch(url,{...opt,signal:ctl.signal})}finally{clearTimeout(tm)}}
async function geminiDirect(p,key){
  let parts,tools=null;
  if(p.mode==="ping")parts=[{text:"Reply with exactly: OK"}];
  else if(p.mode==="code"){const c=String(p.code||"").replace(/\D/g,"").slice(0,14);if(c.length<8)return {ok:false,error:"bad-code"};parts=[{text:AI_P.code(c)}];tools=[{google_search:{}}]}
  else if(p.mode==="bcfind"){const L=(p.items||[]).slice(0,25);if(!L.length)return {ok:false,error:"no-items"};parts=[{text:AI_P.bcfind(L)}];tools=[{google_search:{}}]}
  else if(p.mode==="img")parts=[{inline_data:{mime_type:"image/jpeg",data:String(p.b64||"")}},{text:AI_P.img}];else return {ok:false,error:"mode"};
  const own=_set().gmodel;const list=[...(own?[own]:[]),...GM[p.mode]];let last="",quota=false,busy=false;const tries=[];
  for(const m of list){
    const body={contents:[{role:"user",parts}],generationConfig:{temperature:0.1}};if(tools)body.tools=tools;
    if(p.onStep)try{p.onStep(m)}catch(e){}
    let r;try{r=await gfetch("https://generativelanguage.googleapis.com/v1beta/models/"+m+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify(body)},p.mode==="ping"?30000:60000)}
    catch(e){const em=String(e.message||e);if(e.name==="AbortError"||/time ?out/i.test(em)){last="समय खत्म ("+m+")";tries.push(m+": समय खत्म");continue}tries.push(m+": "+em.slice(0,60));last=em;continue}
    if(r.ok){const j=await r.json();SE.aiLast=m;const t=((((j.candidates||[])[0]||{}).content||{}).parts||[]).map(x=>x.text||"").join("");
      if(p.mode==="ping")return {ok:true,pong:true,model:m};const a=t.indexOf("{"),z=t.lastIndexOf("}");
      if(a<0||z<a)return {ok:true,found:false,model:m};try{return {...JSON.parse(t.slice(a,z+1)),ok:true,model:m}}catch(e){return {ok:true,found:false,model:m}}}
    const t=await r.text().catch(()=>"");let msg=t;try{const e=JSON.parse(t).error;msg=(e.status||"")+" "+(e.message||"")}catch(e){}
    if(r.status===404){last="model "+m;continue}
    if(r.status===429){quota=true;last=msg;continue}
    if(r.status===503||r.status===500){busy=true;last=msg;if(!p._re){p._re=1;await new Promise(z=>setTimeout(z,2500));const rr=await geminiDirect(p,key);if(rr.ok)return rr}continue}
    if([400,401,403].includes(r.status)&&/API[_ ]?key|PERMISSION|UNAUTHENTICATED|credential|ACCESS_TOKEN|not valid/i.test(msg))return {ok:false,error:"bad-key",detail:msg.slice(0,200)};
    last=r.status+" "+msg.slice(0,160)}
  if(p.mode==="ping"&&(busy||quota))return {ok:true,pong:true,busy:true,model:"Google व्यस्त"};
  return {ok:false,error:quota?"quota":busy?"busy":"ai",detail:(tries.length?tries.join(" · "):String(last)).slice(0,240)}}
SE.ai=async function(p){if(navigator.onLine===false)return {ok:false,error:"offline",detail:"फ़ोन का इंटरनेट बंद है"};
  const k=SE.gk();if(k){try{return await geminiDirect(p,k)}catch(e){return {ok:false,error:String(e.message||e)}}}
  const u=SE.scriptUrl();if(!u)return {ok:false,error:"no-url"};if(navigator.onLine===false)return {ok:false,error:"offline"};
  try{const tok=await firebase.auth().currentUser.getIdToken();const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),25000);
    const r=await fetch(u,{method:"POST",signal:ctl.signal,headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({idToken:tok,apiKey:CFG.firebase.apiKey,act:"ai",...p})});clearTimeout(tm);
    return await r.json()}catch(e){return {ok:false,error:e.name==="AbortError"?"timeout":String(e.message||e)}}};
/* 🔄 "ऐप अपडेट करें" बटन — GitHub (Pages) से नया संस्करण अभी लाकर तुरंत लगाओ।
   Play Store / WhatsApp जैसे ऐप का "Update now" तरीका: जाँचो → डाउनलोड (प्रतिशत दिखाओ) → लगाओ → ऐप अपने-आप दोबारा खुले।
   डेटा Firebase में है, इसलिए अपडेट से कोई बिल/स्टॉक/सामान नहीं मिटता; चालू बिल के टैब फ़ोन में सेव रहते हैं। */
SE.latest=async function(){const r=await fetch(CFG.updateUrl.replace(/\/?$/,"/")+"update/version.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error("सर्वर "+r.status);return r.json()};
SE.updateNow=async function(say){
  say=say||(()=>{});
  if(!CFG.updateUrl){say("अपडेट का पता सेट नहीं है","bad");return}
  if(!navigator.onLine){say("इंटरनेट बंद है — चालू करके दोबारा दबाएँ","bad");return}
  say("🔍 नया संस्करण देख रहे हैं…");
  let v;try{v=await SE.latest()}catch(e){say("GitHub से जवाब नहीं आया — थोड़ी देर बाद दबाएँ","bad");return}
  if(!v||!v.version){say("संस्करण नहीं मिला","bad");return}
  if(v.version===SE.version){say("✅ ऐप पूरा नया है — संस्करण "+SE.version,"ok");return}
  if(SE.isNative&&v.minNative&&+v.minNative>+(window.SE_NATIVE_MIN||1)){say("नई APK चाहिए — GitHub Releases से mh-wet-canteen.apk डाउनलोड करके इंस्टॉल करें","bad");return}
  if(SE.isNative&&N.CapacitorUpdater){const U=N.CapacitorUpdater;let h=null;
    try{h=await U.addListener("download",e=>{const pc=Math.round(+e.percent||0);say("⬇️ नया संस्करण "+v.version+" आ रहा है… "+pc+"%","busy",pc)})}catch(e){}
    /* 🩺 हर कदम का असली कारण पकड़ो (पहले सिर्फ़ "नेटवर्क" लिखा आता था) — Sentry में भी जाता है */
    const D={to:v.version,from:SE.version,steps:[]};const st=(k,e)=>D.steps.push(k+(e?": "+String(e.message||e.code||e).slice(0,160):""));
    try{try{const pv=await U.getPluginVersion();D.plugin=pv&&pv.version}catch(e){}try{const c=await U.current();D.cur=c&&c.bundle&&c.bundle.version;D.native=c&&c.native}catch(e){}
      try{if(U.getFailedUpdate){const f=await U.getFailedUpdate();if(f)D.failed=JSON.stringify(f).slice(0,200)}}catch(e){}
      let b=null;try{const l=await U.list();D.list=(l.bundles||[]).map(x=>x.version+":"+x.status).join(",").slice(0,200);b=(l.bundles||[]).find(x=>x.version===v.version&&x.status!=="error")}catch(e){st("list",e)}
      if(!b)await _dropBundles(U,v.version);
      if(!b){const base=new URL(v.url,CFG.updateUrl.replace(/\/?$/,"/")).href;D.url=base;
        const ck=await SE._zipCk(v,base,D);D.ck=ck?ck.slice(0,12):"";
        try{b=await U.download({url:base,version:v.version,checksum:ck});st("download-1 ok")}
        catch(e1){st("download-1",e1);say("⬇️ दोबारा कोशिश… (नेटवर्क धीमा)","busy",0);await _dropBundles(U,v.version);
          await new Promise(r=>setTimeout(r,2500));
          /* दूसरी बार अलग नाम से (पिछला अधूरा/खराब बंडल उसी नाम से अटका न रहे) */
          try{b=await U.download({url:base+"?t="+Date.now(),version:v.version+"-r"+Date.now().toString(36).slice(-4),checksum:ck});st("download-2 ok")}catch(e2){st("download-2",e2);throw e2}}}
      try{h&&h.remove()}catch(e){}
      say("✨ लग रहा है — ऐप 2 सेकंड में दोबारा खुलेगा","ok",100);try{SE.beforeUpdate&&SE.beforeUpdate()}catch(e){}
      await new Promise(r=>setTimeout(r,900));_markTry(v.version);try{await U.set({id:b.id})}catch(e3){st("set",e3);throw e3}
    }catch(e){try{h&&h.remove()}catch(x){}const why=(D.steps.filter(x=>!/ ok$/.test(x)).pop()||String(e.message||e).slice(0,120)).replace(/\?t=\d+/,"")+(D.probe?" · फ़ाइल: "+D.probe:"");
      try{window.SEW&&SEW.report("OTA अपडेट नहीं हुआ: "+why,D)}catch(x){}try{ls.set("se_upd_diag",JSON.stringify({...D,ts:Date.now()}))}catch(x){}
      say("अपडेट नहीं हुआ — कारण: "+why+" · 1 मिनट बाद दोबारा दबाएँ, या नीचे से पूरा नया ऐप लें","bad");
      const bx=document.querySelector(".updbox");if(bx&&!bx.querySelector(".apkl")){const a2=document.createElement("a");a2.className="big ghost apkl";a2.style.cssText="display:block;text-align:center;text-decoration:none;margin-top:8px";a2.href="https://github.com/177mhwcanteen-cyber/177-MH-/releases/latest/download/mh-wet-canteen.apk";a2.target="_blank";a2.rel="noopener";a2.textContent="📲 पूरा नया ऐप (APK) डाउनलोड करें — डेटा सुरक्षित रहेगा";bx.appendChild(a2)}}
    return}
  // वेब (Chrome): पुराना कैश हटाकर नया पेज
  say("✨ नया संस्करण "+v.version+" लग रहा है…","ok",100);try{SE.beforeUpdate&&SE.beforeUpdate()}catch(e){}
  try{if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()))}if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}}catch(e){}
  location.replace(location.pathname+"?v="+encodeURIComponent(v.version));
};
/* ऐप खुला रहे तब भी हर 30 मिनट और फ़ोन पर वापस आते ही चुपचाप जाँच */
SE.autoUpdateLoop=function(toast){if(SE._loop)return;SE._loop=1;
  setInterval(()=>{if(document.visibilityState==="visible")SE.checkUpdate(toast)},30*60000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&Date.now()-(SE._lastChk||0)>10*60000){SE._lastChk=Date.now();SE.checkUpdate(toast)}})};
SE.applyUpdateNow=async()=>{if(SE._pendingBundle)try{_markTry(SE._pendingBundle.version||"");await N.CapacitorUpdater.set({id:SE._pendingBundle.id})}catch(e){}};

/* वेब (Chrome) के लिए ऑफ़लाइन कैश */
if(!SE.isNative&&"serviceWorker" in navigator&&location.protocol==="https:"){window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}))}
})();
