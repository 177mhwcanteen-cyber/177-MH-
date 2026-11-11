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
/* 🎵 10 अलर्ट-धुनें (APK: res/raw/order_tN.wav · ऐप में सुनने को: sounds/tN.wav) + फोन का अपना अलार्म */
SRG.TONES=[["t1","🚨 सायरन"],["t2","🛎️ होटल की घंटी"],["t3","📢 तेज़ बीप-बीप"],["t4","🔔 डिंग-डोंग"],["t5","⏰ अलार्म घड़ी"],["t6","🚓 दो सुर (पुलिस)"],["t7","🎵 चढ़ती धुन"],["t8","📱 पुराना फोन"],["t9","✨ तिहरी झंकार"],["t10","⚡ इमरजेंसी"],["sys","📲 फोन का अपना अलार्म"]];
SRG.tone=()=>{const t=LS.get("srg_tone");return SRG.TONES.some(x=>x[0]===t)?t:"t1"};
let au=null;SRG.play=function(t,loop){SRG.hush();if(!t||t==="sys")return;try{au=new Audio("sounds/"+t+".wav");au.loop=!!loop;au.play().catch(()=>{})}catch(e){}};
SRG.hush=function(){try{if(au){au.pause();au.src=""}}catch(e){}au=null};
SRG.off=()=>LS.get("srg_off")==="1";
const who=()=>{try{return typeof biller==="function"?String(biller()||""):""}catch(e){return ""}};
const isUnimpl=e=>/not implemented|UNIMPLEMENTED|is not a function/i.test(String(e&&(e.code||e.message)||e));

SRG.status=async function(consume){if(!SRG.native())return null;try{const r=await BP().ringStatus({consume:!!consume});SRG.st=r;SRG.ok=true;return r}catch(e){if(isUnimpl(e))SRG.unsupported=true;return null}};
SRG.start=async function(ask){if(!SRG.native()||SRG.unsupported)return null;
  try{const u=firebase.auth().currentUser;if(!u)return null;const fc=(window.SE_CONFIG||{}).firebase||{};
    const c=window.SON&&SON.cfg?SON.cfg():{};
    const r=await BP().ringStart({rt:u.refreshToken||"",key:fc.apiKey||"",pid:fc.projectId||"",every:20,open:mins(c.open),close:mins(c.close),loud:LS.get("srg_soft")!=="1",tone:SRG.tone(),name:who(),ask:ask!==false});
    SRG.st=r;SRG.ok=true;return r}catch(e){if(isUnimpl(e))SRG.unsupported=true;return null}};
SRG.stop=async function(){if(!SRG.native())return;try{SRG.st=await BP().ringStop()}catch(e){}};
SRG.silence=async function(){if(!SRG.native()||!SRG.ok)return;try{SRG.st=await BP().ringSilence()}catch(e){}};
SRG.running=()=>!!(SRG.st&&SRG.st.running);
/* इजाज़तें जो घंटी को पक्का बनाती हैं */
SRG.gaps=function(r){r=r||SRG.st||{};const g=[];if(!r.notif)g.push(["notif","🔔 सूचना की इजाज़त","इसके बिना घंटी की सूचना नहीं दिखेगी"]);if(r.chan===false)g.push(["chan","🔕 सूचनाएँ बंद हैं","फोन की सेटिंग में इस ऐप की सूचनाएँ चालू करें"]);
  if(!r.battery)g.push(["battery","🔋 बैटरी-बचत से छूट","नहीं तो फोन कुछ देर बाद घंटी को सुला देता है"]);if(!r.fsi)g.push(["fsi","📱 लॉक-स्क्रीन पर पूरी स्क्रीन","फोन बंद हो तो भी ऑर्डर सामने खुले"]);
  /* 📍 साथी के फोन में लोकेशन भी (डिलीवरी का सबूत, मालिक को अभी की जगह) */
  try{const L=window.SR&&SR.st;if(typeof S!=="undefined"&&!S.isOwner&&L&&L.native&&!L.unsupported&&(L.perm===false||L.gps===false))g.push(["loc",L.perm===false?"📍 लोकेशन की इजाज़त":"📍 फोन की लोकेशन (GPS) चालू करें","डिलीवरी पहुँची या नहीं — इसी से पता चलता है"])}catch(e){}
  return g};

/* 🚀 लॉगिन के बाद अपने-आप (डिफ़ॉल्ट चालू) */
SRG.auth=async function(){if(!SRG.native())return null;try{const u=firebase.auth().currentUser;if(!u)return null;const fc=(window.SE_CONFIG||{}).firebase||{};return await BP().authSet({rt:u.refreshToken||"",key:fc.apiKey||"",pid:fc.projectId||"",name:who()})}catch(e){return null}};
SRG.boot=async function(){if(SRG._boot||!SRG.native()||S.demo)return;SRG._boot=1;SRG.wrapLogout();SRG.auth();
  const r0=await SRG.status();if(SRG.unsupported)return;
  if(!SRG.off())await SRG.start(true);
  setTimeout(SRG.nag,2500);SRG.checkOpened()};
/* पहली बार (और जब कोई ज़रूरी इजाज़त कम हो — दिन में एक बार) छोटी शीट */
SRG.nag=async function(){if(SRG.off()||!SRG.ok)return;const r=await SRG.status();if(!r)return;const g=SRG.gaps(r);if(!g.length)return;
  const d=new Date().toISOString().slice(0,10);if(LS.get("srg_nag")===d)return;LS.set("srg_nag",d);SRG.sheet()};
/* 🔔 सूचना से ऐप खुला → सीधे ऑर्डर दिखाओ, घंटी चुप */
SRG.checkOpened=async function(){const r=await SRG.status(true);if(r&&r.opened){const n=((window.SX&&SX.orders)||[]).filter(o=>o.status==="new");if(n.length)SRG.popup(n[0],true);else{try{if(window.SX&&SX.ordersSheet)SX.ordersSheet()}catch(e){}SRG.silence()}}};
/* 🛵 नया ऑर्डर आते ही पूरी स्क्रीन का पॉप-अप (Blinkit राइडर जैसा) — स्वीकार / सब ऑर्डर / बाद में */
SRG.popup=function(o,fromNote){if(!o)return;let el=document.getElementById("srgPop");
  const all=((window.SX&&SX.orders)||[]).filter(x=>x.status==="new"),more=all.filter(x=>x.id!==o.id).length,p=window.SON&&SON.parse?SON.parse(o):{};
  const items=(o.items||[]),est=p.total||items.reduce((a,x)=>a+(+x.q||0)*(+x.s||0),0),cap=t=>window.SE&&SE.capNm?SE.capNm(t):t;
  if(!el){el=document.createElement("div");el.id="srgPop";el.className="srg-pop";el.setAttribute("role","alertdialog");el.setAttribute("aria-label","नया ऑर्डर");document.body.appendChild(el)}
  el.dataset.id=o.id;
  el.innerHTML=`<div class="sp-box"><div class="sp-ring" aria-hidden="true">🛵</div><div class="sp-k">नया ऑर्डर${more?` <i>+${more} और</i>`:""}</div>
    <h2>${esc(o.name||"ग्राहक")}</h2><div class="sp-m">${p.mode==="p"?"🏪 दुकान से लेंगे":"🛵 घर पहुँचाना"}${p.pay?" · "+(p.pay==="UPI"?"📱 UPI":"💵 नकद"):""} · ⏰ ${esc(p.when||"अभी")}</div>
    ${o.addr&&p.mode!=="p"?`<div class="sp-a">📍 ${esc(o.addr)}</div>`:""}
    <div class="sp-i">${items.slice(0,8).map(x=>`<div><span>${esc(cap(x.n||""))}</span><b>${esc(x.q)} ${esc(x.u||"")}</b></div>`).join("")}${items.length>8?`<div><span>…और ${items.length-8} सामान</span></div>`:""}</div>
    <div class="sp-t"><span>${items.length} सामान</span><b>≈ ₹${Math.round(est).toLocaleString("en-IN")}</b></div>
    <div class="sp-acc">${[15,30,45].map(m=>`<button type="button" data-spacc="${m}">✓ ${m} मिनट</button>`).join("")}</div>
    <div class="sp-b"><button type="button" class="g" data-spall>📥 सब ऑर्डर</button>${o.phone?`<a class="g" href="tel:+91${esc(o.phone)}">📞 कॉल</a>`:""}<button type="button" class="g" data-splater>बाद में</button></div></div>`;
  el.hidden=false;try{if(document.activeElement)document.activeElement.blur()}catch(e){}
  if(!(SRG.st&&SRG.st.running))SRG.play(SRG.tone()==="sys"?"t1":SRG.tone(),true);clearTimeout(SRG._pt);SRG._pt=setTimeout(SRG.hush,60000)};
SRG.popClose=function(){const el=document.getElementById("srgPop");if(el)el.hidden=true;SRG.hush();SRG.silence()};

/* ⚙️ घंटी की शीट (☰ → 🔔, ऑर्डर-शीट, ऑनलाइन सेटिंग से) */
SRG.html=function(r){if(!SRG.native())return `<p class="note">यह घंटी सिर्फ़ फोन वाले ऐप (APK) में बजती है — वेब/ब्राउज़र में नहीं।</p>`;
  if(SRG.unsupported)return `<div class="srg-warn">📲 इसके लिए <b>नया ऐप (APK)</b> चाहिए — एक बार डाउनलोड करके इंस्टॉल करें, फिर यहाँ "चालू" दिखेगा।<br><a class="big" style="display:block;text-align:center;margin-top:8px;text-decoration:none" href="https://github.com/177mhwcanteen-cyber/177-MH-/releases/latest/download/mh-wet-canteen.apk" target="_blank" rel="noopener">⬇️ नया ऐप डाउनलोड करें</a></div>`;
  r=r||SRG.st||{};const on=!!r.on&&!SRG.off(),g=SRG.gaps(r),age=r.lastOk?Math.round((Date.now()-r.lastOk)/1000):-1;
  const live=on&&r.running&&age>=0&&age<180;
  return `<div class="srg-top ${live?"ok":on?"wait":"off"}"><b>${live?"✅ घंटी चालू है":on?"⏳ घंटी चालू हो रही है…":"⛔ इस फोन पर घंटी बंद"}</b>
    <span>${live?`आख़िरी जाँच ${age<60?age+" सेकंड":Math.round(age/60)+" मिनट"} पहले · ऐप बंद करके भी बजेगी`:r.lastErr?"⚠ "+esc(r.lastErr):on?"कुछ सेकंड रुकें":"ग्राहक ऑर्डर करे तो इस फोन पर नहीं बजेगी"}</span>${r.pending?`<span>🛵 अभी ${r.pending} नया ऑर्डर रुका है</span>`:""}</div>
  ${on&&g.length?`<p class="note" style="margin:8px 0 4px"><b>पक्की घंटी के लिए ये ${g.length} इजाज़त दें</b> (एक-एक दबाकर "Allow / अनुमति दें"):</p>${g.map(([k,t,d])=>`<button type="button" class="srg-g" data-srgfix="${k}"><b>${t}</b><span>${d}</span><i>›</i></button>`).join("")}`:on?`<p class="note" style="margin:8px 0">✅ सारी इजाज़तें मिल गईं।</p>`:""}
  <div class="row2" style="margin:8px 0 0"><button type="button" class="big" data-srgtest ${on?"":"disabled"}>🔔 जाँच-घंटी बजाओ</button><button type="button" class="big ghost" data-srgtoggle>${on?"⛔ इस फोन पर बंद करें":"✅ चालू करें"}</button></div>
  <div class="srg-tn"><b>🎵 घंटी की आवाज़</b> <span class="note">(दबाकर सुनें, ✓ से चुनें)</span>
    <div class="srg-tl">${SRG.TONES.map(([k,t])=>`<div class="srg-to${SRG.tone()===k?" on":""}"><button type="button" class="srg-pl" data-srgplay="${k}" aria-label="${t} सुनें">▶</button><span>${t}</span><button type="button" class="srg-pk" data-srgtone="${k}" aria-pressed="${SRG.tone()===k}">${SRG.tone()===k?"✓ चुनी":"चुनें"}</button></div>`).join("")}</div></div>
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
  if((b=t.closest("[data-srgplay]"))){const k=b.dataset.srgplay;if(k==="sys"){say("📲 फोन का अलार्म — \"जाँच-घंटी\" दबाकर सुनें");return}SRG.play(k,false);return}
  if((b=t.closest("[data-srgtone]"))){LS.set("srg_tone",b.dataset.srgtone);SRG.hush();if(SRG.st&&SRG.st.on&&!SRG.off())await SRG.start(false);say("🎵 आवाज़ बदली — "+(SRG.TONES.find(x=>x[0]===b.dataset.srgtone)||[])[1]);redraw();return}
  if((b=t.closest("[data-spacc]"))){const el=document.getElementById("srgPop"),id=el&&el.dataset.id;if(id&&window.SON&&SON.step){b.disabled=true;const ok=await SON.step(id,"acc",{mins:+b.dataset.spacc});if(ok){SRG.popClose();const n=((window.SX&&SX.orders)||[]).filter(o=>o.status==="new"&&o.id!==id);if(n.length)setTimeout(()=>SRG.popup(n[0]),400)}else b.disabled=false}return}
  if(t.closest("[data-spall]")){SRG.popClose();try{SX.ordersSheet()}catch(e){}return}
  if(t.closest("[data-splater]")){SRG.popClose();return}
  if(t.closest("[data-srgtest]")){try{await BP().ringTest();say("🔔 घंटी 8 सेकंड बजेगी — स्क्रीन बंद करके भी देख सकते हैं")}catch(err){say("घंटी नहीं बजी — पहले इजाज़तें दें")}return}
  if(t.closest("[data-srgtoggle]")){const on=SRG.st&&SRG.st.on&&!SRG.off();if(on){LS.set("srg_off","1");await SRG.stop();say("⛔ इस फोन पर घंटी बंद")}else{LS.set("srg_off","0");await SRG.start(true);say("✅ घंटी चालू")}setTimeout(redraw,800);return}
  if((b=t.closest("[data-srgfix]"))){const k=b.dataset.srgfix;try{if(k==="loc"){if(window.SR&&SR.fixLoc)await SR.fixLoc()}else if(k==="notif")await SRG.start(true);else if(k==="battery")await BP().ringBattery();else await BP().ringSettings({what:k==="fsi"?"fsi":"notif"})}catch(err){}setTimeout(redraw,1500);return}
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
.srg-tn{margin-top:10px}.srg-tl{display:grid;gap:4px;margin-top:6px}.srg-to{display:flex;align-items:center;gap:8px;border:1.5px solid var(--line);border-radius:12px;padding:4px 6px 4px 4px}
.srg-to.on{border-color:#16a34a;background:#16a34a12}.srg-to span{flex:1;font-size:14.5px;font-weight:700}.srg-pl{width:38px;height:38px;border-radius:50%;border:0;background:var(--ink,#1e293b);color:#fff;font-size:15px;cursor:pointer;flex:none}
.srg-pk{border:1.5px solid var(--line);background:var(--bg);border-radius:9px;padding:6px 10px;font-weight:800;cursor:pointer;color:inherit}.srg-to.on .srg-pk{background:#16a34a;border-color:#16a34a;color:#fff}
.srg-pop{position:fixed;inset:0;z-index:9990;background:rgba(10,15,30,.72);display:flex;align-items:flex-end;justify-content:center;padding:12px;backdrop-filter:blur(3px)}
.srg-pop .sp-box{width:100%;max-width:460px;max-height:94vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#111);border-radius:22px;padding:18px 16px 14px;box-shadow:0 20px 60px #0007;animation:spIn .25s ease-out}
@keyframes spIn{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
.sp-ring{width:64px;height:64px;margin:0 auto 6px;border-radius:50%;background:#16a34a;color:#fff;font-size:34px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 0 #16a34a88;animation:spPulse 1.2s infinite}
@keyframes spPulse{0%{box-shadow:0 0 0 0 #16a34a99}70%{box-shadow:0 0 0 22px #16a34a00}100%{box-shadow:0 0 0 0 #16a34a00}}
.sp-k{text-align:center;font-weight:900;color:#16a34a;letter-spacing:.04em}.sp-k i{font-style:normal;background:#dc2626;color:#fff;border-radius:99px;padding:1px 8px;font-size:12px;margin-left:4px}
.srg-pop h2{text-align:center;margin:2px 0 4px;font-size:24px}.sp-m{text-align:center;font-size:14px;color:var(--muted,#555)}.sp-a{margin:8px 0 0;font-size:14px;background:var(--bg,#f4f4f5);border-radius:10px;padding:7px 10px}
.sp-i{margin:10px 0 0;border-top:1px dashed var(--line,#ddd)}.sp-i div{display:flex;justify-content:space-between;gap:10px;padding:6px 2px;border-bottom:1px dashed var(--line,#ddd);font-size:14.5px}.sp-i b{white-space:nowrap}
.sp-t{display:flex;justify-content:space-between;align-items:baseline;margin:8px 2px 12px}.sp-t span{color:var(--muted,#555)}.sp-t b{font-size:22px}
.sp-acc{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sp-acc button{border:0;border-radius:14px;padding:15px 4px;background:#16a34a;color:#fff;font-weight:900;font-size:16px;cursor:pointer}
.sp-b{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}.sp-b .g{border:1.5px solid var(--line,#ddd);background:var(--bg,#f4f4f5);color:inherit;border-radius:12px;padding:11px 4px;font-weight:800;text-align:center;text-decoration:none;font-size:14px;cursor:pointer}
.srg-warn{background:#fff7ed;border:1.5px solid #d97706;border-radius:12px;padding:12px;font-size:14px}`;document.head.appendChild(st)}catch(e){}
/* लॉगिन होते ही अपने-आप */
let tries=0;const iv=setInterval(()=>{tries++;try{if(typeof S!=="undefined"&&S.db&&!S.demo&&window.firebase&&firebase.auth&&firebase.auth().currentUser){clearInterval(iv);SRG.boot()}}catch(e){}if(tries>200)clearInterval(iv)},3000);
/* लॉग-आउट पर इस फोन की घंटी बंद (चाबी भी मिटे) */
SRG.wrapLogout=function(){const lo=window.SE&&SE.logout;if(lo&&!lo._srg){const w=async function(){try{await SRG.stop()}catch(e){}try{if(SRG.native())await BP().authClear()}catch(e){}return lo.apply(this,arguments)};w._srg=1;SE.logout=w}};SRG.wrapLogout();
})();
