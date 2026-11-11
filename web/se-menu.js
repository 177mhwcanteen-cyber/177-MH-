/* 🏠 ऐप का ढाँचा साफ़ (window.SMN) — विक्रम जी, 10-11-2026 · नियम: docs/ऐप-ढाँचा-प्रॉम्प्ट.txt
   शिकायत: "इतने सारे बटन, कौन-सा क्या करेगा समझ नहीं आता; सेटिंग में ढेर सारी चीज़ें; जो काम की हो वह एक क्लिक पर मिले।"
   ① 🏠 सब काम (☰): हर काम एक जगह — बड़ा चिह्न + नाम + एक लाइन में "यह क्या करता है" + खोज ("क्या करना है?") + ⭐ जो आप ज़्यादा करते हैं।
   ② ⚙️ सेटिंग = साफ़ मेन्यू (4 समूह) → टैप पर सिर्फ़ वही हिस्सा खुले, ऊपर "‹ सेटिंग"; खोज (हिस्से के अंदर लिखे शब्द भी)। कुछ हटाया नहीं —
      हर पुराना बटन वहीं है, बस एक साथ नहीं दिखता। नया कार्ड जो भी मॉड्यूल जोड़े, अपने-आप "और" में आ जाता है।
   ③ ◁ फोन का वापस-बटन: खुली स्क्रीन/शीट बंद → सेटिंग का हिस्सा → मेन्यू → बिलिंग → तभी ऐप छोटा (पहले कुछ नहीं होता था)।
   जाँच: tests/menu.py · पुराने टेस्ट के लिए window.__SET_FLAT__ (mock) = सेटिंग पहले जैसी लंबी। */
(function(){
if(window.SMN)return;
const SMN=window.SMN={};
const $=s=>document.querySelector(s),H=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS={get:(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v==null?d:v}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const own=()=>typeof S!=="undefined"&&!!(S.isOwner||S.demo);
const flat=()=>!!window.__SET_FLAT__;
const norm=s=>String(s||"").toLowerCase().replace(/\s+/g," ").trim();

/* ================= ① 🏠 सब काम ================= */
const GRP=[["roz","🧾 रोज़ का काम"],["maal","📦 माल और जगह"],["chhap","🏷️ छपाई"],["malik","📈 हिसाब और सेटिंग"]];
const ACTS=[
 {k:"bill",i:"🧾",t:"बिलिंग",d:"सामान बेचें · बिल बनाएँ",g:"roz",tab:"bill",kw:"bill sale bechna बेचना"},
 {k:"bills",i:"📋",t:"आज के बिल",d:"बिल देखें · दोबारा छापें · वापसी",g:"roz",tab:"bills",kw:"return wapsi reprint पुराना बिल"},
 {k:"udhar",i:"📒",t:"उधार खाता",d:"किस पर कितना बाकी · जमा लें",g:"roz",tab:"udhar",kw:"credit baki khata बाकी जमा"},
 {k:"day",i:"🌙",t:"दिन का हिसाब",d:"गल्ला · खर्चा · रात का स्टॉक",g:"roz",tab:"day",kw:"galla cash kharcha expense गल्ला नकद"},
 {k:"ring",i:"🔔",t:"ऑर्डर की घंटी",d:"घर बैठे ऑर्डर पर अलार्म — ऐप बंद हो तब भी",g:"roz",run:()=>SRG.sheet(),need:"SRG",kw:"order alarm ghanti bell notification"},
 {k:"omenu",i:"🌐",t:"ऑनलाइन मेन्यू",d:"ग्राहक को क्या दिख रहा — किराना · सब्ज़ी · रसोई",g:"roz",run:()=>SON.menuSheet(),need:"SON",kw:"online menu order rasoi sabji restaurant"},
 {k:"khula",i:"🪙",t:"खुले का डिब्बा",d:"₹10-20-50 के खुले पैसे · बदलाव",g:"roz",run:()=>SKH.sheet(),need:"SKH",kw:"change chillar चिल्लर"},
 {k:"kharid",i:"🚚",t:"माल आया",d:"सप्लायर का बिल चढ़ाएँ · कार्टून",g:"maal",tab:"kharid",kw:"purchase kharid खरीद supplier"},
 {k:"mkt",i:"🛍️",t:"बाज़ार खरीद",d:"बाज़ार से लाया सामान लिखें",g:"maal",tab:"mkt",kw:"market bazaar"},
 {k:"stock",i:"📦",t:"स्टॉक",d:"कितना बचा · कम स्टॉक · गिनती",g:"maal",tab:"stock",kw:"stock ginti count expiry एक्सपायरी"},
 {k:"rkx",i:"📍",t:"रैक बदलें",d:"माल एक खाने से दूसरे खाने में",g:"maal",run:()=>SRX.open(),need:"SRX",kw:"rack transfer khana जगह"},
 {k:"rkv",i:"🗄️",t:"रैक देखें",d:"किस खाने में क्या रखा है",g:"maal",run:()=>SRX.open(null,{tab:"rack"}),need:"SRX",kw:"rack khana kahan कहाँ"},
 {k:"rki",i:"🧠",t:"जमावट के सुझाव",d:"क्या कहाँ रखना ठीक रहेगा",g:"maal",run:()=>SRX.open(null,{tab:"idea"}),need:"SRX",kw:"sujhav idea supermarket"},
 {k:"label",i:"🏷️",t:"लेबल छापें",d:"भाव और बारकोड के स्टिकर",g:"chhap",tab:"label",kw:"label barcode sticker print"},
 {k:"sbc",i:"🔖",t:"बारकोड पहरा",d:"जिन पर बारकोड नहीं — छापें, लगाएँ",g:"chhap",run:()=>SBC.open("need"),need:"SBC",kw:"barcode pehra"},
 {k:"report",i:"📈",t:"रिपोर्ट",d:"बिक्री · मुनाफ़ा · सामान-वार",g:"malik",tab:"report",kw:"report profit munafa bikri"},
 {k:"route",i:"🧭",t:"लोकेशन",d:"साथी कहाँ हैं · ग्राहक रजिस्टर",g:"malik",tab:"route",kw:"location map grahak customer"},
 {k:"set",i:"⚙️",t:"सेटिंग",d:"भाव, साथी, प्रिंटर, डिज़ाइन, बैकअप",g:"malik",tab:"set",kw:"setting rate bhav"}
];
const tabsNow=()=>{try{return typeof tabsList==="function"?tabsList().map(x=>x[0]):[]}catch(e){return []}};
SMN.acts=function(){const T=tabsNow();return ACTS.filter(a=>a.tab?T.includes(a.tab):!!window[a.need])};
const HV={open:false,q:""};
function bump(k){const U=LS.get("smn_use",{});U[k]=(U[k]||0)+1;LS.set("smn_use",U)}
SMN.go=function(k){const a=ACTS.find(x=>x.k===k);if(!a)return false;bump(k);SMN.closeHome();
  try{if(a.tab){if(window.SRX&&SRX.isOpen&&SRX.isOpen())SRX.close();S.tab=a.tab;if(a.tab==="set")SV.cur="";showTab()}else a.run()}catch(e){if(typeof toast==="function")toast("अभी नहीं खुला — दोबारा दबाएँ")}return true};
const tile=a=>`<button type="button" class="hm-t" data-hmgo="${a.k}"><i>${a.i}</i><span><b>${H(a.t)}</b><small>${H(a.d)}</small></span></button>`;
const srow=m=>`<button type="button" class="hm-r" data-hmset="${H(m.key)}"><i>${m.i}</i><span><b>${H(m.n)}</b><small>${H(m.d)}</small></span><u>›</u></button>`;
function homeBody(){const A=SMN.acts(),q=norm(HV.q);
  if(q){const L=A.filter(a=>norm(a.t+" "+a.d+" "+(a.kw||"")).includes(q)),M=own()?setSearch(q):[];
    return (L.length?`<div class="hm-grid">${L.map(tile).join("")}</div>`:"")+(M.length?`<h4 class="hm-h">⚙️ सेटिंग में</h4><div class="hm-list">${M.map(srow).join("")}</div>`:"")||`<p class="hm-none">"${H(HV.q)}" नहीं मिला — दूसरे शब्द से खोजें (जैसे: लेबल, उधार, प्रिंटर)</p>`}
  const U=LS.get("smn_use",{}),top=A.filter(a=>U[a.k]>=2).sort((a,b)=>U[b.k]-U[a.k]).slice(0,4);
  return (top.length>=2?`<h4 class="hm-h">⭐ आप ज़्यादा यही करते हैं</h4><div class="hm-grid">${top.map(tile).join("")}</div>`:"")+
    GRP.map(([g,t])=>{const L=A.filter(a=>a.g===g);return L.length?`<h4 class="hm-h">${t}</h4><div class="hm-grid">${L.map(tile).join("")}</div>`:""}).join("")}
function homeDraw(){let h=$("#smnHome");
  if(!h){h=document.createElement("div");h.id="smnHome";h.setAttribute("role","dialog");h.setAttribute("aria-label","सब काम");
    h.innerHTML=`<div class="hm-bar"><div class="hm-b1"><button type="button" class="hm-back" data-hmclose aria-label="बंद">‹</button><div class="hm-ttl"><b>🏠 सब काम</b><span>जो करना है, यहीं से — एक टैप</span></div></div>
      <label class="hm-search"><span aria-hidden="true">🔍</span><input id="hmQ" placeholder="क्या करना है? (जैसे: लेबल, उधार, प्रिंटर)" autocomplete="off" enterkeyhint="search" aria-label="काम खोजें"></label></div><div class="hm-main" id="hmMain"></div>`;
    document.body.appendChild(h);
    h.addEventListener("input",e=>{if(e.target.id==="hmQ"){HV.q=e.target.value;$("#hmMain").innerHTML=homeBody()}});
    h.addEventListener("click",e=>{let b;if(e.target.closest("[data-hmclose]")){SMN.closeHome();return}
      if((b=e.target.closest("[data-hmgo]"))){SMN.go(b.dataset.hmgo);return}
      if((b=e.target.closest("[data-hmset]"))){SMN.closeHome();SMN.openSet(b.dataset.hmset)}})}
  $("#hmMain").innerHTML=homeBody();document.documentElement.classList.add("smnon")}
SMN.home=function(){HV.open=true;HV.q="";if(own()&&!$("#p-set [data-smn]")){try{if(typeof renderSettings==="function")renderSettings()}catch(e){}}homeDraw();const q=$("#hmQ");if(q)q.value="";$("#hmMain").scrollTop=0};
SMN.closeHome=function(){HV.open=false;const h=$("#smnHome");if(h)h.remove();document.documentElement.classList.remove("smnon")};
SMN.isHome=()=>HV.open&&!!$("#smnHome");
function addBtn(){const lg=$("#lgBtn");if(!lg||$("#smnBtn"))return;const b=document.createElement("button");b.id="smnBtn";b.type="button";b.className="smn-btn";b.setAttribute("aria-label","सब काम — मेन्यू");b.innerHTML="☰";lg.insertAdjacentElement("afterend",b);b.addEventListener("click",()=>SMN.home())}

/* ================= ② ⚙️ सेटिंग = साफ़ मेन्यू ================= */
const SG=[["saman","📦 सामान और भाव"],["dukan","🏪 दुकान"],["chhap","🖨️ छपाई और डिज़ाइन"],["system","🔧 ऐप और डेटा"],["aur","➕ और"]];
const MAP=[
 {key:"items",t:/^सामान और भाव/,i:"💰",n:"सामान और भाव",d:"भाव बदलें · सामान खोजें · बंद/चालू करें",g:"saman",kw:"rate price bhav item"},
 {key:"new",i:"➕",n:"नया सामान जोड़ें",d:"नाम, भाव, बारकोड, रैक — हाथ से",g:"saman",kw:"new item add"},
 {key:"photo",id:/^sphCard$/,i:"📸",n:"सामान की फोटो",d:"असली फोटो जोड़ें · बाकी फोटो देखें",g:"saman",kw:"photo image"},
 {key:"sbc",id:/^sbcCard$/,i:"🔖",n:"बारकोड पहरा",d:"बिना बारकोड वाले सामान · छपे / लगे",g:"saman",kw:"barcode"},
 {key:"rack",id:/^srkCard$/,i:"📍",n:"रैक और खाने",d:"रैक का नक्शा · खाने के स्टिकर · रैक बदलें",g:"saman",kw:"rack khana sticker"},
 {key:"plog",t:/रेट बदलने का रिकॉर्ड/,i:"📝",n:"भाव बदलने का रिकॉर्ड",d:"किसने, कब, कौन-सा भाव बदला",g:"saman",kw:"price log"},
 {key:"shop",i:"🏪",n:"दुकान की जानकारी",d:"WhatsApp व ऑर्डर नंबर · UPI · संस्थाएँ",g:"dukan",kw:"upi whatsapp number sanstha"},
 {key:"staff",t:/कर्मचारी|साथी/,i:"👥",n:"साथी और PIN",d:"नया साथी जोड़ें · PIN बदलें · बंद करें",g:"dukan",kw:"staff login pin karmchari"},
 {key:"online",id:/^sonSet$/,i:"🛵",n:"ऑनलाइन दुकान",d:"घर बैठे ऑर्डर · QR कार्ड · डिलीवरी शुल्क",g:"dukan",kw:"online order delivery qr"},
 {key:"printer",t:/^\S*\s*ब्लूटूथ प्रिंटर/,i:"🖨️",n:"बिल का प्रिंटर",d:"ब्लूटूथ प्रिंटर चुनें",g:"chhap",kw:"printer bluetooth"},
 {key:"rc",id:/^rcDesign$/,i:"🧾",n:"बिल का डिज़ाइन",d:"बिल पर क्या छपे · थीम · भाषा",g:"chhap",kw:"bill design receipt theme"},
 {key:"lblp",t:/लेबल प्रिंटर/,i:"🖨️",n:"लेबल का प्रिंटर",d:"बारकोड लेबल वाला प्रिंटर",g:"chhap",kw:"label printer"},
 {key:"sl",id:/^slDesign$/,i:"🎨",n:"लेबल का डिज़ाइन",d:"लेबल का आकार · नमूना · क्या छपे",g:"chhap",kw:"label design size"},
 {key:"upd",t:/ऐप अपडेट/,i:"🔄",n:"ऐप अपडेट",d:"नया संस्करण लें",g:"system",kw:"update version"},
 {key:"bk",t:/बैकअप/,i:"💾",n:"बैकअप",d:"डेटा सुरक्षित है या नहीं",g:"system",kw:"backup drive"},
 {key:"skj",id:/^skjCard$/,i:"🔍",n:"खरीद-जाँच",d:"असली बिल बनाम ऐप में चढ़ी खरीद",g:"system",kw:"kharid jaanch purchase check"},
 {key:"ai",t:/Google AI|Gemini/,i:"🤖",n:"Google AI की चाबी",d:"फोटो से सामान पहचानने के लिए",g:"system",kw:"ai gemini key"},
 {key:"old",t:/पुराने ऐप/,i:"🗃️",n:"पुराने ऐप का डेटा",d:"पुराने ऐप से सामान-भाव लाएँ",g:"system",kw:"old data import"},
 {key:"zero",id:/^skjZero$/,i:"🧹",n:"स्टॉक शून्य करें",d:"⚠ सोच-समझकर — गिनती नए सिरे से",g:"system",kw:"zero reset stock"}
];
const SV={cur:"",q:"",secs:[]};let busy=false;
const headOf=el=>el.matches("h3")?el:el.querySelector(":scope > h3, :scope > summary");
function metaFor(el){const id=el.id||"",h=headOf(el),txt=h?h.textContent.replace(/\s+/g," ").trim():"";
  for(const m of MAP){if((m.id&&m.id.test(id))||(m.t&&m.t.test(txt)))return m}
  if(!txt)return null;const e=txt.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*/u);
  return {key:"x-"+(id||txt.slice(0,18)),i:e?e[1]:"•",n:txt.slice(e?e[0].length:0).split(/[(—]/)[0].trim().slice(0,28)||txt.slice(0,28),d:"",g:"aur",kw:""}}
const byKey=k=>MAP.find(m=>m.key===k);
function classify(P){const secs=new Map();let cur=byKey("shop");
  [...P.children].forEach(el=>{if(el.classList.contains("smn")||el.classList.contains("smn-bar"))return;
    if(el.classList.contains("snav")){el.dataset.smn="_nav";return}
    let m=null;
    if(el.matches(".card2,details"))m=metaFor(el)||cur;
    else if(el.matches("h3")){m=metaFor(el)||cur;cur=m}
    else if(el.querySelector&&el.querySelector("#ni-name"))m=byKey("new");
    else m=cur;
    el.dataset.smn=m.key;if(!secs.has(m.key))secs.set(m.key,{...m,els:[]});secs.get(m.key).els.push(el)});
  const ord=k=>{const i=MAP.findIndex(m=>m.key===k);return i<0?999:i};
  return [...secs.values()].sort((x,y)=>ord(x.key)-ord(y.key))}
const badge=m=>{try{if(m.key==="items")return (S.items||[]).filter(i=>i.active!==false&&!i.virtual).length+" सामान";
  if(m.key==="upd"&&window.SE&&SE.ver)return String(SE.ver).slice(0,13)}catch(e){}return ""};
function setSearch(q){q=norm(q);if(!q)return [];const hit=[];
  SV.secs.forEach(m=>{const a=norm(m.n+" "+m.d+" "+(m.kw||""));if(a.includes(q)){hit.push({...m,w:2});return}
    const txt=norm(m.els.map(e=>e.textContent).join(" "));const p=txt.indexOf(q);if(p>=0)hit.push({...m,w:1,d:"…"+txt.slice(Math.max(0,p-18),p+q.length+26)+"…"})});
  return hit.sort((a,b)=>b.w-a.w)}
function menuHTML(){const q=norm(SV.q);const row=m=>{const b=badge(m);return `<button type="button" class="smn-row" data-smnopen="${H(m.key)}"><i>${m.i}</i><span><b>${H(m.n)}</b>${m.d?`<small>${H(m.d)}</small>`:""}</span>${b?`<em>${H(b)}</em>`:""}<u>›</u></button>`};
  let body;
  if(q){const L=setSearch(q);body=L.length?`<div class="smn-grp">${L.map(row).join("")}</div>`:`<p class="smn-none">"${H(SV.q)}" नहीं मिला</p>`}
  else body=SG.map(([g,t])=>{const L=SV.secs.filter(m=>m.g===g);return L.length?`<h3 class="smn-gh">${t}</h3><div class="smn-grp">${L.map(row).join("")}</div>`:""}).join("");
  return `<div class="smn-top"><h2>⚙️ सेटिंग</h2><p>जो बदलना है उस पर टैप करें — सिर्फ़ वही खुलेगा</p></div>
    <label class="smn-search"><span aria-hidden="true">🔍</span><input id="smnQ" placeholder="सेटिंग खोजें (जैसे: प्रिंटर, PIN, बैकअप)" value="${H(SV.q)}" autocomplete="off" enterkeyhint="search" aria-label="सेटिंग खोजें"></label>
    <div id="smnBody">${body}</div>`}
function apply(){const P=$("#p-set");if(!P||busy)return;if(flat()){P.classList.remove("smn-on");return}
  busy=true;try{
    SV.secs=classify(P);if(SV.cur&&!SV.secs.some(m=>m.key===SV.cur))SV.cur="";
    P.classList.add("smn-on");try{if(typeof camLayout==="function")camLayout()}catch(e){}
    let menu=P.querySelector(":scope > .smn"),bar=P.querySelector(":scope > .smn-bar");
    if(SV.cur){if(menu)menu.remove();const m=SV.secs.find(x=>x.key===SV.cur);
      const html=`<button type="button" data-smnback aria-label="सेटिंग की सूची पर वापस">‹ सेटिंग</button><b>${m.i} ${H(m.n)}</b>`;
      if(!bar){bar=document.createElement("div");bar.className="smn-bar";P.insertAdjacentElement("afterbegin",bar)}
      if(bar.dataset.k!==m.key){bar.innerHTML=html;bar.dataset.k=m.key}}
    else{if(bar)bar.remove();const a=document.activeElement,typing=a&&a.id==="smnQ";
      if(!menu){menu=document.createElement("div");menu.className="smn";P.insertAdjacentElement("afterbegin",menu);menu.innerHTML=menuHTML()}
      else if(typing){const b=menu.querySelector("#smnBody");if(b){const t=document.createElement("div");t.innerHTML=menuHTML();b.innerHTML=t.querySelector("#smnBody").innerHTML}}
      else menu.innerHTML=menuHTML()}
    [...P.children].forEach(el=>{const k=el.dataset.smn;if(!k)return;el.classList.toggle("smn-h",k==="_nav"||k!==SV.cur)});
  }finally{busy=false}}
SMN.apply=apply;
SMN.openSet=function(key){if(!own())return false;if(S.tab!=="set"){S.tab="set";showTab()}
  if(flat()){const e=document.getElementById(key)||$('#p-set [data-smn="'+key+'"]');if(e&&e.scrollIntoView)e.scrollIntoView({block:"start"});return true}
  apply();let m=SV.secs.find(x=>x.key===key);if(!m){const e=document.getElementById(key);if(e&&e.dataset.smn)m=SV.secs.find(x=>x.key===e.dataset.smn)}
  if(!m)return false;SV.cur=m.key;SV.q="";apply();window.scrollTo(0,0);return true};
SMN.backSet=function(){SV.cur="";apply();window.scrollTo(0,0)};
SMN.setState=()=>({cur:SV.cur,keys:SV.secs.map(m=>m.key)});
function watch(){const P=$("#p-set");if(!P||P._smn)return;P._smn=1;
  new MutationObserver(()=>{if(!busy)apply()}).observe(P,{childList:true});
  /* सेटिंग से बाहर गए (किसी भी रास्ते से) → अगली बार मेन्यू से शुरू */
  new MutationObserver(()=>{if(P.hidden&&(SV.cur||SV.q)&&!SV._hold){SV.cur="";SV.q="";apply()}}).observe(P,{attributes:true,attributeFilter:["hidden"]});
  P.addEventListener("input",e=>{if(e.target.id==="smnQ"){SV.q=e.target.value;apply()}});
  P.addEventListener("click",e=>{let b;if((b=e.target.closest("[data-smnopen]"))){SMN.openSet(b.dataset.smnopen);return}
    if(e.target.closest("[data-smnback]"))SMN.backSet()});
  apply()}

/* ================= ③ ◁ वापस-बटन ================= */
SMN.back=function(){try{
  if(SMN.isHome()){SMN.closeHome();return "home"}
  if(window.SRX&&SRX.isOpen&&SRX.isOpen()){const b=$("#srxSheet [data-rxback]");if(b)b.click();else SRX.close();return "srx"}
  const bx=$("#shbox");if(bx&&!bx.hidden&&bx.innerHTML){bx.hidden=true;bx.innerHTML="";return "box"}
  const sh=$("#sheet");if(sh&&sh.innerHTML.trim()){if(typeof closeSheet==="function")closeSheet();return "sheet"}
  if(document.documentElement.classList.contains("camon")&&typeof camOff==="function"){camOff(true);return "cam"}
  if(typeof S!=="undefined"&&S.tab==="set"&&SV.cur&&!flat()){SMN.backSet();return "set"}
  if(typeof S!=="undefined"&&S.tab!=="bill"&&tabsNow().includes("bill")){S.tab="bill";showTab();return "tab"}
}catch(e){}return ""};
function hookBack(){try{const A=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App;if(!A||!A.addListener||SMN._bk)return;SMN._bk=1;
  A.addListener("backButton",()=>{if(!SMN.back()){try{(A.minimizeApp||A.exitApp).call(A)}catch(e){}}})}catch(e){}}

function boot(){addBtn();watch();hookBack()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
setTimeout(boot,1200);

const css=document.createElement("style");css.textContent=`
.smn-btn{flex:none;width:34px;height:34px;border-radius:11px;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:19px;line-height:1;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
.smn-btn:active{transform:scale(.94)}
/* 🏠 सब काम */
html.smnon{overflow:hidden}
#smnHome{position:fixed;inset:0;z-index:58;background:var(--bg,#f2f2f7);color:var(--ink);display:flex;flex-direction:column;font-size:15px;animation:hmin .18s ease}
@keyframes hmin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.hm-bar{background:var(--hdr,linear-gradient(135deg,#0d1a33,#1b3566));color:#fff;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 12px;box-shadow:0 6px 20px rgba(8,16,40,.25);flex:none}
.hm-b1{display:flex;align-items:center;gap:10px}.hm-back{border:0;background:rgba(255,255,255,.14);color:#fff;width:40px;height:40px;border-radius:12px;font-size:26px;line-height:1;flex:none}
.hm-ttl b{display:block;font-size:19px;letter-spacing:-.01em}.hm-ttl span{display:block;font-size:12.5px;opacity:.75}
.hm-search,.smn-search{display:flex;align-items:center;gap:8px;background:var(--surface,#fff);border-radius:14px;padding:2px 12px;margin-top:10px;border:1.5px solid transparent}
.hm-search input,.smn-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font-size:16px;padding:11px 0;color:var(--ink)}
.smn-search{box-shadow:var(--shadow);margin:0 0 6px}.smn-search:focus-within,.hm-search:focus-within{border-color:var(--accent,#ef5a0a)}
.hm-main{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 14px calc(28px + env(safe-area-inset-bottom,0px))}
@media (min-width:900px){.hm-main{padding-inline:max(14px,calc(50vw - 380px))}}
.hm-h{margin:18px 2px 8px;font-size:14.5px;font-weight:900;letter-spacing:-.01em;color:var(--ink)}
.hm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.hm-t{display:flex;gap:10px;align-items:center;text-align:left;border:0;background:var(--surface,#fff);color:var(--ink);border-radius:18px;padding:12px 10px;box-shadow:var(--shadow);min-width:0;min-height:68px}
.hm-t:active,.hm-r:active,.smn-row:active{transform:scale(.98);background:var(--surface2,#f2f2f5)}
.hm-t i,.hm-r i,.smn-row i{font-style:normal;flex:none;width:42px;height:42px;border-radius:13px;background:var(--accent-bg,#fff1e6);display:grid;place-items:center;font-size:22px}
.hm-t span,.hm-r span,.smn-row span{flex:1;min-width:0}.hm-t b,.hm-r b,.smn-row b{display:block;font-size:15px;line-height:1.25}
.hm-t small,.hm-r small,.smn-row small{display:block;font-size:12px;color:var(--muted);line-height:1.3;margin-top:2px}
.hm-list{display:grid;gap:8px}.hm-r{display:flex;gap:12px;align-items:center;text-align:left;border:0;background:var(--surface,#fff);color:var(--ink);border-radius:16px;padding:10px 12px;box-shadow:var(--shadow);width:100%}
.hm-r u,.smn-row u{text-decoration:none;color:var(--muted);font-size:22px;flex:none}.hm-none,.smn-none{text-align:center;color:var(--muted);margin:28px 10px;line-height:1.5}
/* ⚙️ सेटिंग मेन्यू */
#p-set.smn-on>.smn-h{display:none!important}
.smn-top h2{margin:2px 2px 0;font-size:22px;letter-spacing:-.02em}.smn-top p{margin:2px 2px 10px;color:var(--muted);font-size:13px}
.smn-gh{margin:16px 4px 7px!important;font-size:13.5px;font-weight:900;color:var(--muted);letter-spacing:.01em}
.smn-grp{background:var(--surface,#fff);border-radius:18px;box-shadow:var(--shadow);overflow:hidden}
.smn-row{display:flex;gap:12px;align-items:center;text-align:left;width:100%;border:0;background:transparent;color:var(--ink);padding:10px 12px;border-bottom:1px solid var(--line);min-height:62px}
.smn-row:last-child{border-bottom:0}.smn-row i{width:40px;height:40px;font-size:20px}
.smn-row em{font-style:normal;flex:none;font-size:12px;font-weight:800;color:var(--muted);background:var(--surface2,#f2f2f5);border-radius:99px;padding:3px 9px}
.smn-bar{position:sticky;top:calc(var(--hdh,96px) + 4px);z-index:6;display:flex;align-items:center;gap:10px;margin:-4px -4px 10px;padding:8px 6px;background:color-mix(in srgb,var(--bg,#f2f2f7) 94%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:14px;box-shadow:0 6px 14px -8px rgba(0,0,0,.25)}
.smn-bar button{border:0;background:var(--surface,#fff);color:var(--accent,#ef5a0a);font-weight:900;font-size:15px;border-radius:11px;padding:8px 12px;box-shadow:var(--shadow);flex:none}
.smn-bar b{font-size:16px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (prefers-reduced-motion:reduce){#smnHome{animation:none}}`;
document.head.appendChild(css);
})();
