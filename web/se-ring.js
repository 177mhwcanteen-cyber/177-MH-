/* 🔔 177 MH — ऑर्डर की घंटी (window.SRG) — Blinkit के राइडर जैसी: ऐप बंद हो, स्क्रीन बंद हो, तब भी नया ऑर्डर आते ही अलार्म।
   असली काम APK में: OrderRingService.java (हर 20 सेकंड orders/status==new पूछती है — लॉगिन वाले की चाबी से; दुकान बंद समय में 2 मिनट)।
   यह फाइल: लॉगिन के बाद अपने-आप चालू (हर फोन पर, जब तक उस फोन पर "बंद" न करें), इजाज़तों की जाँच-सूची, 🔔 जाँच-घंटी,
   सूचना से ऐप खुले तो सीधे ऑर्डर-शीट, ऑर्डर देख/स्वीकार कर लें तो घंटी चुप। पूरा तरीका: docs/ऑर्डर-घंटी-प्रॉम्प्ट.txt */
(function(){
"use strict";
const SRG=window.SRG={st:null,ok:false,unsupported:false};
const N=()=>window.SENative||{};const BP=()=>N().BtPrinter;
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const say=t=>{try{toast(t)}catch(e){}};
const mins=t=>{const m=String(t||"").match(/^(\d{1,2}):(\d{2})/);return m?(+m[1])*60+(+m[2]):-1};
SRG.native=()=>!!(N().isNative&&BP());
SRG.off=()=>LS.get("srg_off")==="1";
const isUnimpl=e=>/not implemented|UNIMPLEMENTED|is not a function/i.test(String(e&&(e.code||e.message)||e));

SRG.status=async function(consume){if(!SRG.native())return null;try{const r=await BP().ringStatus({consume:!!consume});SRG.st=r;SRG.ok=true;return r}catch(e){if(isUnimpl(e))SRG.unsupported=true;return null}};
SRG.start=async function(ask){if(!SRG.native()||SRG.unsupported)return null;
  try{const u=firebase.auth().currentUser;if(!u)return null;const fc=(window.SE_CONFIG||{}).firebase||{};
    const c=window.SON&&SON.cfg?SON.cfg():{};
    const r=await BP().ringStart({rt:u.refreshToken||"",key:fc.apiKey||"",pid:fc.projectId||"",every:20,open:mins(c.open),close:mins(c.close),loud:LS.get("srg_soft")!=="1",ask:ask!==false});
    SRG.st=r;SRG.ok=true;return r}catch(e){if(isUnimpl(e))SRG.unsupported=true;return null}};
SRG.stop=async function(){if(!SRG.native())return;try{SRG.st=await BP().ringStop()}catch(e){}};
SRG.silence=async function(){if(!SRG.native()||!SRG.ok)return;try{SRG.st=await BP().ringSilence()}catch(e){}};
SRG.running=()=>!!(SRG.st&&SRG.st.running);
/* इजाज़तें जो घंटी को पक्का बनाती हैं */
SRG.gaps=function(r){r=r||SRG.st||{};const g=[];if(!r.notif)g.push(["notif","🔔 सूचना की इजाज़त","इसके बिना घंटी की सूचना नहीं दिखेगी"]);if(r.chan===false)g.push(["chan","🔕 सूचनाएँ बंद हैं","फोन की सेटिंग में इस ऐप की सूचनाएँ चालू करें"]);
  if(!r.battery)g.push(["battery","🔋 बैटरी-बचत से छूट","नहीं तो फोन कुछ देर बाद घंटी को सुला देता है"]);if(!r.fsi)g.push(["fsi","📱 लॉक-स्क्रीन पर पूरी स्क्रीन","फोन बंद हो तो भी ऑर्डर सामने खुले"]);return g};

/* 🚀 लॉगिन के बाद अपने-आप (डिफ़ॉल्ट चालू) */
SRG.boot=async function(){if(SRG._boot||!SRG.native()||S.demo)return;SRG._boot=1;SRG.wrapLogout();
  const r0=await SRG.status();if(SRG.unsupported)return;
  if(!SRG.off())await SRG.start(true);
  setTimeout(SRG.nag,2500);SRG.checkOpened()};
/* पहली बार (और जब कोई ज़रूरी इजाज़त कम हो — दिन में एक बार) छोटी शीट */
SRG.nag=async function(){if(SRG.off()||!SRG.ok)return;const r=await SRG.status();if(!r)return;const g=SRG.gaps(r);if(!g.length)return;
  const d=new Date().toISOString().slice(0,10);if(LS.get("srg_nag")===d)return;LS.set("srg_nag",d);SRG.sheet()};
/* 🔔 सूचना से ऐप खुला → सीधे ऑर्डर दिखाओ, घंटी चुप */
SRG.checkOpened=async function(){const r=await SRG.status(true);if(r&&r.opened){try{if(window.SX&&SX.ordersSheet)SX.ordersSheet()}catch(e){}SRG.silence()}};

/* ⚙️ घंटी की शीट (☰ → 🔔, ऑर्डर-शीट, ऑनलाइन सेटिंग से) */
SRG.html=function(r){if(!SRG.native())return `<p class="note">यह घंटी सिर्फ़ फोन वाले ऐप (APK) में बजती है — वेब/ब्राउज़र में नहीं।</p>`;
  if(SRG.unsupported)return `<div class="srg-warn">📲 इसके लिए <b>नया ऐप (APK)</b> चाहिए — एक बार डाउनलोड करके इंस्टॉल करें, फिर यहाँ "चालू" दिखेगा।<br><a class="big" style="display:block;text-align:center;margin-top:8px;text-decoration:none" href="https://github.com/177mhwcanteen-cyber/177-MH-/releases/latest/download/mh-wet-canteen.apk" target="_blank" rel="noopener">⬇️ नया ऐप डाउनलोड करें</a></div>`;
  r=r||SRG.st||{};const on=!!r.on&&!SRG.off(),g=SRG.gaps(r),age=r.lastOk?Math.round((Date.now()-r.lastOk)/1000):-1;
  const live=on&&r.running&&age>=0&&age<180;
  return `<div class="srg-top ${live?"ok":on?"wait":"off"}"><b>${live?"✅ घंटी चालू है":on?"⏳ घंटी चालू हो रही है…":"⛔ इस फोन पर घंटी बंद"}</b>
    <span>${live?`आख़िरी जाँच ${age<60?age+" सेकंड":Math.round(age/60)+" मिनट"} पहले · ऐप बंद करके भी बजेगी`:r.lastErr?"⚠ "+esc(r.lastErr):on?"कुछ सेकंड रुकें":"ग्राहक ऑर्डर करे तो इस फोन पर नहीं बजेगी"}</span>${r.pending?`<span>🛵 अभी ${r.pending} नया ऑर्डर रुका है</span>`:""}</div>
  ${on&&g.length?`<p class="note" style="margin:8px 0 4px"><b>पक्की घंटी के लिए ये ${g.length} इजाज़त दें</b> (एक-एक दबाकर "Allow / अनुमति दें"):</p>${g.map(([k,t,d])=>`<button type="button" class="srg-g" data-srgfix="${k}"><b>${t}</b><span>${d}</span><i>›</i></button>`).join("")}`:on?`<p class="note" style="margin:8px 0">✅ सारी इजाज़तें मिल गईं।</p>`:""}
  <div class="row2" style="margin:8px 0 0"><button type="button" class="big" data-srgtest ${on?"":"disabled"}>🔔 जाँच-घंटी बजाओ</button><button type="button" class="big ghost" data-srgtoggle>${on?"⛔ इस फोन पर बंद करें":"✅ चालू करें"}</button></div>
  <label class="srg-ck"><input type="checkbox" data-srgloud ${LS.get("srg_soft")==="1"?"":"checked"}> घंटी के समय फोन की अलार्म-आवाज़ तेज़ कर दो (बाद में पहले जैसी)</label>
  <details class="srg-help"><summary>ℹ️ कैसे काम करती है · Xiaomi/Vivo/Oppo में ज़रूरी</summary><p class="note">• ग्राहक ऑर्डर करे → 20 सेकंड के अंदर हर उस फोन पर अलार्म जिसमें घंटी चालू है (दुकान बंद समय में 2 मिनट)।<br>• घंटी 1 मिनट बजती है, थोड़ा रुककर फिर बजती है — जब तक कोई साथी ऑर्डर <b>स्वीकार</b> न करे या सूचना में <b>🔕 चुप</b> न दबाए।<br>• सूचना दबाएँ → ऐप सीधे ऑर्डर पर खुलता है।<br>• <b>Xiaomi/Redmi/Vivo/Oppo/Realme</b>: फोन की सेटिंग → ऐप्स → 177 MH → <b>Autostart चालू</b> + बैटरी "No restrictions"। रीसेंट ऐप्स में ऐप पर 🔒 लॉक लगा दें।<br>• फोन बंद-चालू होने पर घंटी अपने-आप फिर चालू हो जाती है।</p></details>`};
SRG.sheet=async function(){await SRG.status();const sh=document.getElementById("sheet");if(!sh)return;
  sh.innerHTML=`<div class="scrim" data-close><div class="sheet px srg-sheet" role="dialog" aria-label="ऑर्डर की घंटी"><div class="grab"></div>
  <div class="sh-head"><div><h3>🔔 ऑर्डर की घंटी</h3><span class="note">घर बैठे ऑर्डर आते ही — ऐप बंद हो तब भी</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <div id="srgBody">${SRG.html()}</div></div></div>`;
  clearInterval(SRG._t);SRG._t=setInterval(async()=>{const b=document.getElementById("srgBody");if(!b){clearInterval(SRG._t);return}const r=await SRG.status();if(r&&!b.contains(document.activeElement))b.innerHTML=SRG.html(r)},4000)};
const redraw=async()=>{const b=document.getElementById("srgBody");if(b)b.innerHTML=SRG.html(await SRG.status())};

document.addEventListener("click",async e=>{const t=e.target;let b;
  if(t.closest("[data-srgopen]")){SRG.sheet();return}
  if(t.closest("[data-srgtest]")){try{await BP().ringTest();say("🔔 घंटी 8 सेकंड बजेगी — स्क्रीन बंद करके भी देख सकते हैं")}catch(err){say("घंटी नहीं बजी — पहले इजाज़तें दें")}return}
  if(t.closest("[data-srgtoggle]")){const on=SRG.st&&SRG.st.on&&!SRG.off();if(on){LS.set("srg_off","1");await SRG.stop();say("⛔ इस फोन पर घंटी बंद")}else{LS.set("srg_off","0");await SRG.start(true);say("✅ घंटी चालू")}setTimeout(redraw,800);return}
  if((b=t.closest("[data-srgfix]"))){const k=b.dataset.srgfix;try{if(k==="notif")await SRG.start(true);else if(k==="battery")await BP().ringBattery();else await BP().ringSettings({what:k==="fsi"?"fsi":"notif"})}catch(err){}setTimeout(redraw,1500);return}
},true);
document.addEventListener("change",async e=>{const t=e.target;if(t.matches&&t.matches("[data-srgloud]")){LS.set("srg_soft",t.checked?"0":"1");if(SRG.st&&SRG.st.on)await SRG.start(false)}});
/* ऐप सामने आए → इजाज़तें लौटकर देखो, सूचना से खुला हो तो ऑर्डर */
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&SRG._boot){SRG.checkOpened();redraw();if(!SRG.off()&&SRG.ok)SRG.start(false)}});
/* रूप */
try{const st=document.createElement("style");st.textContent=`
.srg-top{display:grid;gap:2px;border-radius:14px;padding:12px 14px;background:var(--bg);border:2px solid var(--line)}.srg-top b{font-size:17px}.srg-top span{font-size:13px;color:var(--muted)}
.srg-top.ok{border-color:#16a34a;background:#16a34a14}.srg-top.ok b{color:#15803d}.srg-top.wait{border-color:#d97706;background:#d9770614}.srg-top.off{border-color:#dc2626;background:#dc262610}.srg-top.off b{color:#b91c1c}
.srg-g{display:grid;grid-template-columns:1fr auto;gap:0 8px;width:100%;text-align:left;border:1.5px solid #d97706;background:#fff7ed;border-radius:12px;padding:10px 12px;margin:0 0 6px;cursor:pointer;color:inherit;font:inherit}
.srg-g b{font-size:15px}.srg-g span{grid-column:1;font-size:12.5px;color:var(--muted)}.srg-g i{grid-row:1/3;grid-column:2;align-self:center;font-style:normal;font-size:22px;color:#d97706}
.srg-ck{display:flex;gap:8px;align-items:center;font-size:13px;margin:10px 2px 0}.srg-help{margin-top:8px}.srg-help summary{cursor:pointer;font-size:13px;font-weight:700}
.srg-warn{background:#fff7ed;border:1.5px solid #d97706;border-radius:12px;padding:12px;font-size:14px}`;document.head.appendChild(st)}catch(e){}
/* लॉगिन होते ही अपने-आप */
let tries=0;const iv=setInterval(()=>{tries++;try{if(typeof S!=="undefined"&&S.db&&!S.demo&&window.firebase&&firebase.auth&&firebase.auth().currentUser){clearInterval(iv);SRG.boot()}}catch(e){}if(tries>200)clearInterval(iv)},3000);
/* लॉग-आउट पर इस फोन की घंटी बंद (चाबी भी मिटे) */
SRG.wrapLogout=function(){const lo=window.SE&&SE.logout;if(lo&&!lo._srg){const w=async function(){try{await SRG.stop()}catch(e){}return lo.apply(this,arguments)};w._srg=1;SE.logout=w}};SRG.wrapLogout();
})();
