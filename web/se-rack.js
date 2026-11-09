/* 177 MH — 📍 रैक-खाना व्यवस्था (window.SRK) — पक्का नियम: docs/रैक-व्यवस्था-प्रॉम्प्ट.txt · जाँच: tests/rack.py
   विक्रम जी की फोटो पर लगे नंबर: "11-23" = रैक 11 का खाना 23 (ऊपर-बाएँ से, किताब जैसे)। रैक 1–21 दुकान, 31–35 गोदाम (पटरी ऊपर से), कुल 238।
   डेटा: items/<id>.rack = दुकान की मुख्य जगह (se-stock की रैक-वार गिनती वाला ही खाना) · items/<id>.grack = गोदाम की जगह (31–35)।
   रैक लगाना (खाने का स्टिकर/नंबर → सामान स्कैन), खाना खोज, आज की गिनती, खाने के स्टिकर (TSC/A4), भाव-पट्टी, ऑनलाइन ऑर्डर रैक-क्रम में। */
(()=>{
const SRK=window.SRK={};
/* 🏢 संस्था: रैक का नक्शा, पुराने नंबर, घर (HOME) और सुनहरे खाने सिर्फ़ 177 MH के हैं।
   दूसरी संस्था (भैरव…) में खाली शुरुआत — मालिक सेटिंग से अपने रैक/खाने जोड़ें (settings/main.rk)। */
const ORG=((window.SE_CONFIG||{}).org)||"mh177",ISMH=ORG==="mh177";SRK.org=ORG;
const LSr={get:(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const NM=it=>typeof shortNm==="function"?shortNm(it):SE.capNm(it.short||it.name||"");
/* [रैक, खाने/पटरी, नाम, क्या रखें] — दूसरी योजना ("हर खाने का एक नंबर", 20 फोटो) से, 238 खाने।
   07-11 जोड़: छोटी-छोटी जगहें अलग रैक नहीं — 2→1 (1-7,1-8) · 3→12 (12-5…12-8) · 14→13 (13-13,13-14) · 16→10 (10-5)। पुराने नंबर OLD से नए में पढ़े जाते हैं। */
const MAP=!ISMH?[]:[[1,8,"दरवाज़े के ऊपर","1–6 ऊपर के डिब्बे · 7–8 बगल के गुलाबजल वाले खाने — हल्का, कम बिकने वाला, कपड़े"],[4,10,"खिड़की के ऊपर","डिस्पोज़ल, कप-गिलास, बाल्टी-घर का हल्का सामान, बैटरी-बल्ब"],
 [5,7,"काउंटर पीछे (1)","साबूदाना, पोहा, सोया · 📦 कोड वाले (सिर्फ़ साथी के हाथ में)"],[6,13,"काउंटर पीछे (2)","🌶️ सारे मसाले एक जगह (Everest, MDH, साबुत) + सॉस की बोतलें"],[7,15,"काउंटर पीछे (3)","अचार, जैम, सॉस, टमाटर प्यूरी, ड्राई फ्रूट · 09-11: नीचे 7-14, 7-15 नए; 7-3 अब 7-2 में मिला"],[8,12,"काउंटर पीछे (4)","जैम-जार, मूँगफली, दाल-मसाले का दूसरा फ़ेस"],
 [9,33,"कोने की अलमारी","रस्क, बूँदी, टॉफ़ी, 🎁 गिफ़्ट, 🪔 पूजा (सफ़ाई केमिकल नहीं)"],[10,5,"चिप्स रैक + शोकेस","1–4 Lays, Kurkure, चिप्स · 5 तराज़ू के पास काँच का शोकेस (मिठाई-बेकरी)"],[11,63,"बड़ा रैक","बाएँ नमकीन-बिस्किट · दाएँ साबुन-पेस्ट-शैम्पू-बाल-सफ़ाई · नीचे (55–63) स्टॉक"],[12,8,"टँगी लड़ियाँ (सब)","1–4 Coca-Cola के ऊपर की रॉड · 5–8 दरवाज़े के पास — Haldiram, Kurkure, शैम्पू-मसाले-कार्ड की लड़ियाँ"],
 [13,14,"खिड़की बाएँ + ऊपर","1–12 आटा, बेसन, चना, तेल-घी — भारी (भारी नीचे) · 13–14 खिड़की के ऊपर हल्का"],[15,14,"खिड़की दाएँ","✏️ सारी स्टेशनरी एक जगह (पेन, कॉपी, फ़ाइल, कलर) + पापड़"],[17,3,"चॉकलेट फ्रिज (नीला)","चॉकलेट — ऊपर से 1, 2, 3"],
 [18,2,"सफ़ेद डबल फ्रीज़र","दूध-दही-पनीर · 1 बायाँ, 2 दायाँ ढक्कन"],[19,2,"Amul आइसक्रीम फ्रीज़र","आइसक्रीम · 1 बायाँ, 2 दायाँ ढक्कन"],[20,5,"Coca-Cola फ्रिज","कोल्ड ड्रिंक-पानी-जूस · ऊपर से 1–5"],[21,2,"सब्ज़ी-ब्रेड बेंच","1 ब्रेड-पाव, 2 सब्ज़ी-फल"],
 [31,5,"अंदर अलमारी","नमकीन-बिस्किट का अतिरिक्त स्टॉक"],[32,5,"अंदर लोहे की रैक","बर्तन, डिब्बे"],[33,5,"अंदर खंभे के पीछे","बिजली का सामान, कार्टन (फफूँद — खाना नहीं)"],[34,5,"अंदर टिश्यू-कप","टिश्यू, पेपर कप, पैकिंग"],[35,4,"अंदर मशीन वाली","मशीनें, मरम्मत"]];
/* पुराने नंबर (फोटो पर छपे) → नए — डेटा नहीं बदलता, पढ़ते समय नया */
const OLD=!ISMH?{}:{"2-1":"1-7","2-2":"1-8","3-1":"12-5","3-2":"12-6","3-3":"12-7","3-4":"12-8","14-1":"13-13","14-2":"13-14","16-1":"10-5","7-3":"7-2"};SRK.OLD=OLD;
const GONE=!ISMH?{}:{2:1,3:12,14:13,16:10};SRK.GONE=GONE;
/* 🧭 घर (home zone) — हर किस्म की एक पक्की जगह (planogram)। पहले नाम के शब्द, फिर sub, फिर cat */
const HOME=!ISMH?[]:[["chips","चिप्स",10,/\b(lays|kurkure|bingo|uncle chips|doritos|pringles|cheetos|too yumm)\b|चिप्स|कुरकुरे/i],
 ["choco","चॉकलेट",17,/(chocolate|dairy milk|kit ?kat|5 ?star|munch|perk|snickers|bournville|ferrero|kinder|eclairs|silk\b)|चॉकलेट/i],
 ["bread","ब्रेड-पाव",21,/\b(bread|pav|bun)\b|ब्रेड|पाव/i],["ice","आइसक्रीम",19,null,["ice"]],["dairy","दूध-दही-पनीर",18,null,["dairy"]],["drinks","कोल्ड ड्रिंक",20,null,["drinks"]],
 ["masala","मसाले",6,null,["masala"]],["achar","अचार-सॉस-ड्राई फ्रूट",7,null,["achar","dryfruit"]],["rashan","आटा-दाल-तेल (भारी)",13,null,["rashan","oil"]],
 ["namkeen","नमकीन-बिस्किट",11,null,["namkeen","sweet"]],["care","साबुन-पेस्ट-बाल-सफ़ाई",11,null,["personal","hair","clean"]],["tob","कोड वाले",5,null,["tob"]],
 ["pooja","पूजा",9,null,["pooja"]],["gift","गिफ़्ट-खिलौने",9,null,null,["gift"]],["light","डिस्पोज़ल-घर-बिजली",4,null,["disposal","home","tools","elec"]],
 ["stat","स्टेशनरी",15,null,null,["stationery"]],["sweets","मिठाई-बेकरी",10,null,null,["mithai"]],["sabzi","सब्ज़ी-फल",21,null,null,["sabzi"]],["kapde","कपड़े",1,null,null,["kapde"]]];
SRK.HOME=HOME;
SRK.home=function(it){if(!it)return null;const nm=(it.name||"")+" "+(it.short||"")+" "+(it.hi||""),c=typeof mcat==="function"?mcat(it):it.cat;
  if(ISMH&&typeof isTob==="function"&&isTob(it))return {k:"tob",t:"कोड वाले",r:5};
  for(const h of HOME)if(h[3]&&h[3].test(nm))return {k:h[0],t:h[1],r:h[2]};
  for(const h of HOME)if(h[4]&&h[4].includes(it.sub))return {k:h[0],t:h[1],r:h[2]};
  for(const h of HOME)if(h[5]&&h[5].includes(c))return {k:h[0],t:h[1],r:h[2]};return null};
/* 🧩 मालिक नक्शा बदल सकते हैं: settings/main.rk = {n:{r:खाने}, nm:{r:नाम}, keep:{r:क्या रखें}, add:[[r,n,नाम,क्या रखें]]} — बेस MAP वैसा ही */
SRK.MAP=MAP;const RK={};let RL=[],rkKey=null;SRK.RK=RK;
const cfgRk=()=>{const c=(typeof S!=="undefined"&&S.settings&&S.settings.rk)||{};return {n:c.n||{},nm:c.nm||{},keep:c.keep||{},add:Array.isArray(c.add)?c.add:[]}};
function chk(){const c=cfgRk(),k=JSON.stringify(c);if(k===rkKey)return;rkKey=k;Object.keys(RK).forEach(x=>delete RK[x]);
  const base=MAP.map(x=>[...x]).concat(c.add.filter(a=>a&&+a[0]>0&&!GONE[+a[0]]&&!MAP.some(m=>m[0]===+a[0])).map(a=>[+a[0],+a[1]||1,String(a[2]||"रैक "+a[0]),String(a[3]||""),1]));
  base.forEach(([r,n,nm,keep,nw])=>{const N=Math.max(1,Math.min(99,+c.n[r]||n));RK[r]={r,n:N,base:n,nm:c.nm[r]||nm,keep:c.keep[r]!=null?c.keep[r]:keep,g:r>=31,nw:!!nw}});
  RL=Object.values(RK).sort((a,b)=>a.r-b.r);SRK.RL=RL}
SRK.chk=chk;chk();
SRK.total=()=>{chk();return RL.reduce((a,x)=>a+x.n,0)};
const DEV="०१२३४५६७८९";
SRK.norm=v=>String(v||"").replace(/[०-९]/g,d=>DEV.indexOf(d)).toUpperCase().replace(/\s+/g,"").replace(/[–—_./]/g,"-").replace(/-+/g,"-").slice(0,12);
SRK.canon=v=>{const r=SRK.norm(v);return OLD[r]||r};
SRK.parse=v=>{const o=SRK.norm(v),r=OLD[o]||o,m=/^(\d{1,2})-(\d{1,2})$/.exec(r);if(!m)return null;const rk=+m[1],k=+m[2],d=RK[rk];return {code:r,rack:rk,k,info:d||null,known:!!(d&&k>=1&&k<=d.n),g:rk>=31,old:OLD[o]?o:""}};
SRK.info=v=>{const p=SRK.parse(v);if(p&&p.info)return p.info.nm+(p.g?" · पटरी "+p.k:" · खाना "+p.k);const m=/^(\d{1,2})$/.exec(SRK.norm(v));return m&&RK[+m[1]]?RK[+m[1]].nm:""};
/* क्रम: दुकान 1→21, फिर गोदाम 31→35 (रैक, फिर खाना), फिर पुराने खुले नाम, बिना रैक सबसे आख़िर */
SRK.key=r=>{r=SRK.canon(r);if(!r)return "~~";const m=/^(\d{1,2})(?:-(\d{1,3}))?$/.exec(r);if(m)return "a"+m[1].padStart(3,"0")+String(+m[2]||0).padStart(3,"0");return "y"+r};
const act=()=>(S.items||[]).filter(i=>i.active!==false&&!i.virtual&&i.id!=="xyz");
const rk0=c=>{const m=/^(\d{1,2})-/.exec(SRK.canon(c));return m?+m[1]:null};
SRK.racks=()=>{const m={};act().forEach(i=>[i.rack,i.grack].forEach(c=>{const r=SRK.norm(c);if(r)m[r]=(m[r]||0)+1}));return Object.keys(m).sort((a,b)=>SRK.key(a)<SRK.key(b)?-1:1).map(r=>({r,n:m[r]}))};
SRK.of=r=>{r=SRK.canon(r);const pre=/^\d{1,2}$/.test(r)||(r.length<=3&&/^[A-Z]\d?$/.test(r));return act().filter(i=>[i.rack,i.grack].some(c=>{const x=SRK.canon(c);return x&&(x===r||(pre&&x.startsWith(r+"-")))}))};
SRK.sortItems=L=>[...L].sort((a,b)=>{const A=SRK.key((item(a.id)||{}).rack),B=SRK.key((item(b.id)||{}).rack);return A<B?-1:A>B?1:0});
const isOwn=()=>!!(S.isOwner||S.demo);
/* 🔢 आज की गिनती: दुकान के जिन रैक में सामान है, उनमें रोज़ एक (क्रम से) — 21 रैक ≈ 3 हफ़्ते में पूरी दुकान */
SRK.today=()=>{const used=[...new Set(act().map(i=>rk0(i.rack)).filter(r=>r&&r<31))].sort((a,b)=>a-b);chk();const L=used.length?used:RL.filter(x=>!x.g).map(x=>x.r);
  const d=Math.floor((Date.now()+5.5*3600e3)/864e5);return L[d%L.length]};

/* ---------- रैक लगाना ---------- */
async function setLoc(id,r){const it=item(id);if(!it)return false;r=SRK.canon(r);const f="rack";
  if(S.demo||!S.db){it[f]=r;return f}
  if(!S.isOwner){toast("रैक सिर्फ़ विक्रम जी लगा सकते हैं — गिनती में रैक चुनकर गिनें");return false}
  try{await S.db.doc("items/"+id).update({[f]:r});it[f]=r;return f}catch(e){toast("सेव नहीं हुआ");return false}}
SRK.set=setLoc;
async function clearLoc(id,f){const it=item(id);if(!it)return false;if(S.demo||!S.db){it[f]="";return true}if(!S.isOwner)return false;try{await S.db.doc("items/"+id).update({[f]:""});it[f]="";return true}catch(e){return false}}
const V={rack:LSr.get("srk_cur",""),q:"",sel:"",open:false,aud:false,nf:{},edit:false,fa:"",fb:"",ta:"",tb:"",nr:false};
/* खाने का स्टिकर (R11-23) स्कैन = वही खाना चुनो; सामान स्कैन = उस खाने का */
SRK.scan=function(code){const c=String(code||"").trim().toUpperCase(),m=/^R(\d{1,2}-\d{1,2})$/.exec(c);
  if(!V.open||!$("#srkSheet")){if(!m)return false;const p=SRK.parse(m[1]);if(!p)return false;beep(true);
    /* 📷 से चुना सामान (editor) → सीधा उसी का खाना */
    if(SRK.arm&&item(SRK.arm)){const id=SRK.arm;SRK.arm="";const it=item(id),old=SRK.canon(it.rack);
      setLoc(id,p.code).then(ok=>{if(!ok)return;logMoves([{id,from:old,to:p.code}]);document.querySelectorAll('[data-if="rack"]').forEach(e=>{const w=e.closest("[data-sid]");if(w&&w.dataset.sid===id)e.value=p.code});toast("📍 "+NM(it)+" → "+p.code+" · "+SRK.info(p.code))});return true}
    /* नया सामान फ़ॉर्म / अकेला editor खुला हो → रैक का खाना वहीं भर दो */
    const vis=[...document.querySelectorAll('#ni-rack,[data-if="rack"]')].filter(e=>e.offsetParent!==null),ed=vis.find(e=>e.id==="ni-rack")||(vis.length===1?vis[0]:null);
    if(ed){ed.value=p.code;ed.dispatchEvent(new Event("input",{bubbles:true}));ed.dispatchEvent(new Event("change",{bubbles:true}));toast("📍 खाना "+p.code+" भर दिया — "+SRK.info(p.code)+" · सेव दबाएँ");return true}
    const L=SRK.of(p.code);toast("📍 "+p.code+" · "+SRK.info(p.code)+(L.length?" — "+L.slice(0,4).map(NM).join(", ")+(L.length>4?" +"+(L.length-4):""):" — खाली"));return true}
  if(m){beep(true);V.rack=SRK.norm(m[1]);LSr.set("srk_cur",V.rack);toast("📍 खाना "+V.rack+" — "+SRK.info(V.rack)+" · अब सामान स्कैन करें");draw();return true}
  const it=findByCode(code);beep(!!it);if(!it){toast("यह बारकोड किसी सामान में नहीं: "+code);return true}assign(it.id);return true};
async function assign(id){const it=item(id);if(!it)return;if(!V.rack){toast("पहले ऊपर खाने का नंबर लिखें (जैसे 11-23) या खाने का स्टिकर स्कैन करें");const i=$("#srkR");if(i)i.focus();return}
  const p=SRK.parse(V.rack);if(p&&p.old){V.rack=p.code;LSr.set("srk_cur",V.rack)}const f="rack",old=SRK.canon(it[f]);if(old===V.rack){toast(NM(it)+" पहले से "+V.rack+" में");return}
  if(await setLoc(id,V.rack)){toast("📍 "+NM(it)+" → "+V.rack+(old?" · पहले "+old:""));logMoves([{id,from:old,to:V.rack}]);V.q="";draw()}}

/* ---------- खाने के स्टिकर (TSC लेबल प्रिंटर / A4) ---------- */
/* खाने का स्टिकर 50×25 (400×200 डॉट): बाएँ ऊपर QR (2D, कैमरे के लिए) · दाएँ बहुत बड़ा नंबर (दूर से) + छोटा रैक-नाम · नीचे पूरी चौड़ाई Code-128 (1D, गन के लिए) */
function qrM(t){try{if(!window.QRCode)return null;const d=document.createElement("div");const q=new QRCode(d,{text:t,width:64,height:64,correctLevel:QRCode.CorrectLevel.M});const m=q&&q._oQRCode;return m?{n:m.getModuleCount(),dark:(r,c)=>m.isDark(r,c)}:null}catch(e){return null}}
SRK.stickerCanvas=function(code){const p=SRK.parse(code)||{code:SRK.norm(code)},W=400,H=200,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,W,H);x.fillStyle="#000";const t="R"+p.code,TOP=136;let qx=16;
  const M=qrM(t);if(M){const ms=Math.max(2,Math.floor(118/(M.n)));const qs=ms*M.n,qy=Math.round((TOP-qs)/2)+2;for(let r=0;r<M.n;r++)for(let c=0;c<M.n;c++)if(M.dark(r,c))x.fillRect(qx+c*ms,qy+r*ms,ms,ms);qx+=qs+12;cv._qr=1}
  const L=qx,Rr=W-12;x.textAlign="center";x.textBaseline="alphabetic";let fs=112;x.font=`900 ${fs}px sans-serif`;while(x.measureText(p.code).width>Rr-L&&fs>36){fs-=4;x.font=`900 ${fs}px sans-serif`}
  const cx=(L+Rr)/2;x.fillText(p.code,cx,Math.round(16+fs*0.74));
  const nm=p.info?p.info.nm+(p.g?" · पटरी "+p.k:""):"";if(nm){let f2=22;x.font=`700 ${f2}px sans-serif`;while(x.measureText(nm).width>Rr-L&&f2>13){f2--;x.font=`700 ${f2}px sans-serif`}x.fillText(nm,cx,TOP-6)}
  try{if(window.SL&&SL.barCanvas){const b=SL.barCanvas(t,W-24,H-TOP-12,false,0,3);if(b&&b.c){x.imageSmoothingEnabled=false;x.drawImage(b.c,Math.round((W-b.c.width)/2),H-b.c.height-6);cv._bc=b.m}}}catch(e){}
  return cv};
/* खाने पर क्या रखें (घर) — छोटा, स्टिकर/बोर्ड के लिए */
SRK.homeOf=function(code){const p=SRK.parse(code);if(!p||!p.info)return "";const r=p.rack,k=p.k;
  if(r===10)return k===5?"मिठाई-बेकरी (शोकेस)":"चिप्स";if(r===11)return k>=55?"नीचे: भरने वाला स्टॉक":"नमकीन-बिस्किट · साबुन-पेस्ट";
  if(r===13)return k>=13?"हल्का सामान":"आटा-दाल-तेल (भारी)";if(r===1)return k>=7?"हल्का, कम बिकने वाला":"हल्का · कपड़े";if(r===21)return k===1?"ब्रेड-पाव":"सब्ज़ी-फल";
  if(r===5)return "साबूदाना-पोहा · कोड वाले";if(r===8)return "जैम · मूँगफली · दाल";if(r>=31)return p.info.keep.split(" (")[0];
  const L=HOME.filter(h=>h[2]===r).map(h=>h[1]);return L.join(" · ")||p.info.keep.split(" ·")[0]};
/* 🪧 रैक का बोर्ड (A4, हर रैक एक पन्ना): बड़ा नंबर, नाम, क्या रखें, हर खाने का नंबर-जाल — दूर से दिखे */
SRK.boardHTML=function(racks){return `<style>.bd{page-break-after:always;border:1.2mm solid #000;border-radius:6mm;padding:8mm;height:265mm;box-sizing:border-box;display:flex;flex-direction:column;gap:4mm;font-family:sans-serif}
  .bd .n{font:900 120pt/0.9 sans-serif;text-align:center}.bd .t{font:800 28pt/1.1 sans-serif;text-align:center}.bd .k{font:600 15pt/1.3 sans-serif;text-align:center;border-top:0.5mm solid #000;padding-top:3mm}
  .bd .g{display:grid;gap:1.5mm;margin-top:auto}.bd .g div{border:0.4mm solid #000;border-radius:1.5mm;padding:1.5mm;text-align:center;font:800 13pt monospace}.bd .g small{display:block;font:600 8pt sans-serif}</style>
  ${racks.map(r=>{const d=RK[+r];if(!d)return "";const cols=d.n>=40?9:d.n>=12?4:d.n>=6?3:2;
    const ph=SE.photos&&SE.photos["rk_"+d.r];return `<div class="bd"><div class="n">${d.r}</div>${ph?`<img src="${ph}" style="height:40mm;width:auto;align-self:center;border-radius:2mm">`:""}<div class="t">${d.g?"गोदाम · ":""}${esc(d.nm)}</div><div class="k">${esc(d.keep)}</div>
    <div class="g" style="grid-template-columns:repeat(${cols},1fr)">${SRK.codesOf(d.r).map(c=>`<div>${c}${d.n<=33?`<small>${esc(SRK.homeOf(c))}</small>`:""}</div>`).join("")}</div></div>`}).join("")}`};
SRK.boards=async function(racks){chk();racks=(racks||RL.map(x=>x.r)).filter(r=>RK[+r]);if(!racks.length)return 0;
  try{await SE.printA4("रैक के बोर्ड · "+racks.length,SRK.boardHTML(racks))}catch(e){toast("प्रिंट नहीं हुआ");return 0}toast("🪧 "+racks.length+" रैक-बोर्ड A4 पर");return racks.length};

/* 🧭 सही जगह (planogram जाँच): हर किस्म का एक घर — बिखरा सामान, गलत रैक, बिना जगह + सुझाव, छपने वाली "सामान हटाओ" सूची */
SRK.audit=function(){const L=act().filter(i=>!["fast","mela"].includes(typeof mcat==="function"?mcat(i):i.cat)),by={},move=[],none=[];
  L.forEach(it=>{const h=SRK.home(it);if(!h)return;const p=SRK.parse(it.rack),cur=p?p.rack:null;const g=by[h.k]=by[h.k]||{k:h.k,t:h.t,r:h.r,n:0,at:{}};g.n++;
    if(cur)g.at[cur]=(g.at[cur]||0)+1;if(!cur)none.push({it,h});else if(cur!==h.r)move.push({it,h,cur:p.code})});
  const groups=Object.values(by).map(g=>({...g,spots:Object.keys(g.at).length,out:Object.entries(g.at).filter(([r])=>+r!==g.r).reduce((a,x)=>a+x[1],0)})).sort((a,b)=>b.out-a.out||b.n-a.n);
  return {groups,move:move.sort((a,b)=>a.h.r-b.h.r),none:none.sort((a,b)=>a.h.r-b.h.r)}};
SRK.moveHTML=function(A){A=A||SRK.audit();return `<style>table{border-collapse:collapse;width:100%;font:11pt sans-serif}td,th{border:0.3mm solid #444;padding:1.5mm 2mm;text-align:left}th{background:#eee}td.c{font:800 12pt monospace;white-space:nowrap}h2{font:800 15pt sans-serif;margin:3mm 0}</style>
  <h2>🧭 सामान सही जगह ले जाएँ — ${A.move.length+A.none.length}</h2><table><tr><th>✓</th><th>सामान</th><th>अभी</th><th>ले जाएँ → रैक</th><th>किस्म</th></tr>
  ${[...A.move.map(m=>[m.it,m.cur,m.h]),...A.none.map(m=>[m.it,"—",m.h])].map(([it,c,h])=>`<tr><td>☐</td><td>${esc(typeof isTob==="function"&&isTob(it)&&typeof billNm==="function"?billNm(it):NM(it))}</td><td class="c">${esc(c)}</td><td class="c">${h.r} · ${esc(RK[h.r]?RK[h.r].nm:"")}</td><td>${esc(h.t)}</td></tr>`).join("")}</table>
  <p style="font:10pt sans-serif">ले जाकर उस खाने का स्टिकर स्कैन करें, फिर सामान स्कैन करें — ऐप में जगह अपने-आप लग जाएगी।</p>`};
SRK.codesOf=r=>{const d=RK[+r];if(!d)return [];return Array.from({length:d.n},(_,i)=>r+"-"+(i+1))};
SRK.stickers=async function(codes){codes=(codes||[]).map(SRK.norm).filter(Boolean);if(!codes.length)return 0;if(codes.length>300){toast("एक बार में 300 तक");return 0}
  const pr=window.SF&&SF.labelPrinter||{},nat=SE.isNative&&pr.addr&&typeof SENative!=="undefined";
  try{if(nat){let all="";for(const c of codes){const cv=SRK.stickerCanvas(c);all+=pr.type==="escpos"?atob(SE.escpos(cv)):atob(SE.tspl(cv,{wmm:50,hmm:25,copies:1}))}
      await SENative.BtPrinter.print({address:pr.addr,data:btoa(all)})}
    else await SE.printA4("खानों के स्टिकर · "+codes.length,`<style>.kg{display:flex;flex-wrap:wrap;gap:2mm}.kg img{width:50mm;height:25mm;border:0.2mm dashed #bbb}</style><div class="kg">${codes.map(c=>`<img src="${SRK.stickerCanvas(c).toDataURL("image/png")}">`).join("")}</div>`)}
  catch(e){toast(e.msg||"प्रिंट नहीं हुआ");return 0}
  toast("🏷️ "+codes.length+" खानों के स्टिकर छप रहे हैं");return codes.length};

/* ---------- खाने की भाव-पट्टी (A4) ---------- */
const PR=LSr.get("srk_pr",{});
SRK.changed=()=>act().filter(i=>SRK.norm(i.rack)&&PR[i.id]!=null&&+PR[i.id]!==+i.sale);
function barURL(it){try{const c=window.SF&&SF.itemCode?SF.itemCode(it):"";if(!c||!window.SL||!SL.barCanvas)return "";const b=SL.barCanvas(c,520,70,true,20,3);return b&&b.c?b.c.toDataURL("image/png"):""}catch(e){return ""}}
SRK.stripHTML=function(L){return `<style>.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:2.5mm}.st{border:0.3mm solid #222;border-radius:2mm;padding:1.6mm 2mm;height:31mm;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;page-break-inside:avoid}
  .st .t{display:flex;justify-content:space-between;align-items:baseline;gap:2mm}.st .r{font:800 15pt/1 sans-serif;letter-spacing:0.3mm;white-space:nowrap}.st .p{font:800 16pt/1 sans-serif;white-space:nowrap}.st .c{font:700 10pt monospace;align-self:center;margin-top:1mm}.st .p s{font:600 9pt sans-serif;color:#555;margin-right:1mm}
  .st .n{font:700 9pt/1.15 sans-serif;margin:1mm 0 0.6mm;max-height:7mm;overflow:hidden;text-transform:uppercase}.st img{height:11mm;width:auto;max-width:100%;align-self:center;image-rendering:pixelated}</style>
  <div class="sg">${L.map(it=>{const tob=typeof isTob==="function"&&isTob(it),nm=tob&&typeof billNm==="function"?billNm(it):NM(it),mrp=+it.mrp>+it.sale&&+it.sale>0?`<s>₹${+it.mrp}</s>`:"",u=barURL(it);
    return `<div class="st"><div class="t"><span class="r">${esc(SRK.norm(it.rack)||"—")}</span><span class="p">${mrp}${+it.sale>0?"₹"+(+it.sale):""}</span></div><div class="n">${esc(nm)}</div>${u?`<img src="${u}" alt="">`:it.code?`<span class="c">#${esc(it.code)}</span>`:""}</div>`}).join("")}</div>`};
SRK.print=async function(L,title){L=(L||[]).filter(Boolean);if(!L.length){toast("कोई सामान नहीं");return 0}if(L.length>300){toast("एक बार में 300 पट्टी तक — रैक चुनें");return 0}
  L=[...L].sort((a,b)=>SRK.key(a.rack)<SRK.key(b.rack)?-1:1);
  try{await SE.printA4(title||("खाने की भाव-पट्टी · "+L.length),SRK.stripHTML(L))}catch(e){toast("प्रिंट नहीं हुआ");return 0}
  L.forEach(i=>PR[i.id]=+i.sale||0);LSr.set("srk_pr",PR);SRK._last=L.map(i=>i.id);toast("🏷️ "+L.length+" पट्टी छप रही हैं");draw();refreshCard();return L.length};

/* ---------- UI ---------- */
function hits(q){q=String(q||"").trim().toLowerCase();if(!q)return [];const byC=findByCode(q);
  const L=act().filter(i=>((i.name||"")+" "+(i.hi||"")+" "+(i.short||"")+" "+(i.alias||"")).toLowerCase().includes(q)||String(i.code||"")===q);
  if(byC&&!L.includes(byC))L.unshift(byC);return L.slice(0,10)}
const locTxt=it=>{const a=SRK.canon(it.rack),g=SRK.canon(it.grack);return (a?"📍 "+esc(a):"<em>जगह नहीं</em>")+(g?" · 🚪 "+esc(g):"")};
const row=(it,btn)=>`<div class="srk-r">${tileHTML(it)}<div><b>${esc(NM(it))}</b><span>${locTxt(it)}${+it.sale>0?" · "+rs(+it.sale):""}${it.code?" · #"+esc(it.code):""}</span></div>${btn||""}</div>`;
const setBtn=i=>`<button type="button" class="srk-b" data-srkset="${esc(i.id)}">→ ${esc(V.rack||"?")}</button>`;
function codeInfo(){const p=SRK.parse(V.rack);if(!V.rack)return `<span class="note">खाने का नंबर लिखें (11-23) या खाने का स्टिकर स्कैन करें</span>`;
  if(!p)return `<span class="srk-wn">⚠ नंबर ऐसे लिखें: रैक-खाना, जैसे 11-23</span>`;
  if(p.old)return `<span class="srk-wn">↪ ${esc(p.old)} पुराना नंबर — अब ${esc(p.code)} (${esc(SRK.info(p.code))})। स्टिकर नए नंबर का लगाएँ।</span>`;
  if(!p.known)return `<span class="srk-wn">⚠ ${esc(p.code)} नक्शे में नहीं${p.info?` — रैक ${p.rack} में ${p.info.n} ${p.g?"पटरी":"खाने"} हैं`:""}</span>`;
  const L=SRK.of(p.code);return `<span class="srk-ok">✓ ${esc(SRK.info(p.code))}${p.g?" · अंदर वाला हिस्सा":""}</span>${L.length?`<div class="srk-in"><b>इस खाने में:</b> ${L.map(i=>esc(NM(i))).join(" · ")}</div>`:`<div class="srk-in">यह खाना अभी खाली है</div>`}`}
const locs=(i,r)=>["rack","grack"].map(f=>({f,p:SRK.parse(i[f])})).filter(x=>x.p&&x.p.rack===r);
const fill=r=>{const d=RK[r];if(!d)return 0;const S2=new Set();act().forEach(i=>locs(i,r).forEach(x=>{if(x.p.known)S2.add(x.p.k)}));return S2.size};
function rackChip(d){const n=fill(d.r);return `<button type="button" class="srk-rk${V.sel===String(d.r)?" on":""}${SRK.today()===d.r?" td":""}" data-srksel="${d.r}"><b>${d.r}</b><span>${esc(d.nm)}</span><i>${n}/${d.n}</i></button>`}
function rackDetail(){const d=RK[+V.sel];if(!d){const L=SRK.of(V.sel);return L.length?`<div class="srk-sel"><b>📍 ${esc(V.sel)} · ${L.length} सामान</b>${L.map(i=>row(i)).join("")}</div>`:""}
  const by={},extra=[];act().forEach(i=>locs(i,d.r).forEach(x=>{if(x.p.known)(by[x.p.k]=by[x.p.k]||[]).push([i,x.f]);else extra.push([i,x.f])}));
  const own=isOwn(),nf=V.nf[d.r];
  const lines=Array.from({length:d.n},(_,k)=>{const L=by[k+1]||[],c=d.r+"-"+(k+1);return `<div class="srk-kh${L.length?"":" e"}${nf&&k+1>=nf?" nw":""}"><code>${c}</code><div>${L.length?L.map(([i,f])=>`<span>${esc(NM(i))}${own?`<button type="button" data-srkrm="${esc(i.id)}" data-f="${f}" aria-label="${esc(NM(i))} हटाएँ">✕</button>`:""}</span>`).join(""):"<em>खाली</em>"}</div>${own&&L.length?`<button type="button" class="srk-mvb" data-srkfrom="${c}" aria-label="${c} का सामान दूसरे खाने में">↔</button>`:""}</div>`}).join("");
  return `<div class="srk-sel"><div class="srk-st"><div><b>${d.g?"🚪":"🗄️"} रैक ${d.r} · ${esc(d.nm)}</b><span class="note" style="display:block">${d.n} ${d.g?"पटरी":"खाने"} · ${esc(d.keep)}</span></div></div>${(()=>{const u=SE.photos&&SE.photos["rk_"+d.r];return u||own?`<div class="srk-ph">${u?`<img src="${esc(u)}" alt="रैक ${d.r} की फोटो">`:""}${own?`<label class="srk-b">📷 ${u?"नई फोटो":"रैक की फोटो डालें"}<input type="file" accept="image/*" capture="environment" data-srkph="${d.r}" hidden></label>`:""}</div>`:""})()}${(()=>{const o=Object.keys(OLD).filter(k=>OLD[k].startsWith(d.r+"-"));return o.length?`<p class="note" style="margin:2px 0">↪ पुराने फोटो के नंबर ${o.join(", ")} अब इसी रैक में (${o.map(k=>OLD[k]).join(", ")})</p>`:""})()}
    ${own?`<div class="srk-pb2"><button type="button" class="srk-b" data-srkstk="${d.r}">🏷️ सारे ${d.n} स्टिकर</button><button type="button" class="srk-b" data-srkbd="${d.r}">🪧 बोर्ड A4</button><button type="button" class="srk-b pri" data-srkpr="${d.r}">🏷️ भाव-पट्टी</button></div>
    ${nf?`<button type="button" class="srk-b pri srk-nf" data-srkrange="${d.r}" data-a="${nf}" data-b="${d.n}">🏷️ नए खानों के स्टिकर ${d.r}-${nf} … ${d.r}-${d.n}</button>`:""}
    <div class="srk-tl"><span>🏷️ स्टिकर</span><input id="srkFa" class="inp" inputmode="numeric" value="${V.fa||""}" placeholder="से" aria-label="किस खाने से"><input id="srkFb" class="inp" inputmode="numeric" value="${V.fb||""}" placeholder="तक" aria-label="किस खाने तक"><button type="button" class="srk-b" data-srkrange="${d.r}">छापें</button></div>
    <div class="srk-tl"><span>🧩 खाने</span><button type="button" class="srk-b" data-srkadd="1">＋1</button><button type="button" class="srk-b" data-srkadd="5">＋5</button><button type="button" class="srk-b" data-srkdel ${by[d.n]?"disabled":""}>− आख़िरी</button><button type="button" class="srk-b" data-srkedit>✏️ नाम</button></div>
    ${V.edit?`<div class="srk-ed"><input id="srkEn" class="inp" value="${esc(d.nm)}" aria-label="रैक का नाम"><input id="srkEk" class="inp" value="${esc(d.keep)}" aria-label="क्या रखें"><button type="button" class="srk-b pri" data-srkedsave>सेव</button></div>`:""}
    <div class="srk-tl"><span>↔ बदलें</span><input id="srkTa" class="inp code" value="${esc(V.ta||"")}" placeholder="${d.r}-3 या ${d.r}" aria-label="कहाँ से"><b>→</b><input id="srkTb" class="inp code" value="${esc(V.tb||"")}" placeholder="4-2 या 4" aria-label="कहाँ"><button type="button" class="srk-b pri" data-srkmove>बदलें</button></div>
    <p class="note" style="margin:0">खाना → खाना = उसका सारा सामान · रैक → रैक (जैसे ${d.r} → 4) = हर खाना उसी नंबर पर · एक सामान = नए खाने का स्टिकर स्कैन करके सामान स्कैन।</p>`:""}
    ${lines}${extra.length?`<p class="srk-wn">⚠ गलत खाना नंबर: ${extra.map(([i,f])=>esc(NM(i))+" ("+esc(i[f])+")").join(", ")} — "＋1" से खाना बढ़ाएँ या ↔ से बदलें</p>`:""}</div>`}
/* ---------- 🧩 नक्शा बदलना / ↔ ट्रांसफ़र (मालिक) ---------- */
async function saveRk(patch){const c=cfgRk();const nx={n:{...c.n,...(patch.n||{})},nm:{...c.nm,...(patch.nm||{})},keep:{...c.keep,...(patch.keep||{})},add:patch.add||c.add};
  if(!isOwn()){toast("नक्शा सिर्फ़ विक्रम जी बदल सकते हैं");return false}
  try{if(!S.demo&&S.db)await S.db.doc("settings/main").set({rk:nx},{merge:true});S.settings={...(S.settings||{}),rk:nx};chk();return true}catch(e){toast("सेव नहीं हुआ — नेट देखें");return false}}
SRK.saveRk=saveRk;
SRK.addKhana=async function(r,d){chk();const x=RK[+r];if(!x)return false;const old=x.n,n=Math.min(99,old+d);if(n===old)return false;
  if(await saveRk({n:{[r]:n}})){V.nf[r]=old+1;toast("🧩 रैक "+r+": "+old+" → "+n+" खाने · अब नए खानों के स्टिकर छापें");return true}return false};
SRK.delKhana=async function(r){chk();const x=RK[+r];if(!x||x.n<=1)return false;if(SRK.of(r+"-"+x.n).length){toast("खाना "+r+"-"+x.n+" में सामान है — पहले उसे ↔ से हटाएँ");return false}
  if(await saveRk({n:{[r]:x.n-1}})){if(V.nf[r]&&V.nf[r]>x.n-1)delete V.nf[r];toast("रैक "+r+" अब "+(x.n-1)+" खाने");return true}return false};
SRK.addRack=async function(r,n,nm,keep){chk();r=+r;n=+n||1;if(!(r>=1&&r<=99)){toast("रैक नंबर 1–99");return false}if(GONE[r]){toast("नंबर "+r+" पुराना (मिलाया गया) — दूसरा नंबर लें");return false}
  if(RK[r]){toast("रैक "+r+" पहले से है");return false}const c=cfgRk();if(await saveRk({add:[...c.add,[r,Math.min(99,n),String(nm||"रैक "+r).slice(0,40),String(keep||"").slice(0,80)]]})){V.nf[r]=1;V.sel=String(r);toast("➕ नया रैक "+r+" · "+n+" खाने");return true}return false};
SRK.nextRack=g=>{chk();for(let r=g?36:22;r<=(g?99:30);r++)if(!RK[r]&&!GONE[r])return r;return 0};
async function logMoves(L){if(!L.length||S.demo||!S.db)return;const o={},t=Date.now();L.forEach((m,i)=>o["m"+t+"_"+i]={...m,by:S.uid||"",byName:typeof biller==="function"?biller():"",ts:t});
  try{await S.db.doc("days/"+today()+"/meta/rack").set(o,{merge:true})}catch(e){}}
/* ↔ खाना→खाना (सारा सामान) या रैक→रैक (k→k) */
SRK.move=async function(a,b){chk();a=SRK.canon(a);b=SRK.canon(b);const ra=/^\d{1,2}$/.test(a),rb=/^\d{1,2}$/.test(b);const plan=[];
  if(ra&&rb){const A=RK[+a],B=RK[+b];if(!A||!B){toast("रैक नक्शे में नहीं");return 0}
    act().forEach(i=>["rack","grack"].forEach(f=>{const p=SRK.parse(i[f]);if(p&&p.rack===+a)plan.push({it:i,f,from:p.code,to:b+"-"+p.k,k:p.k})}));
    const mx=plan.reduce((m,x)=>Math.max(m,x.k),0);if(mx>B.n){toast("रैक "+b+" में "+B.n+" खाने हैं, चाहिए "+mx+" — पहले ＋ से खाने बढ़ाएँ");return 0}}
  else if(!ra&&!rb){const pb=SRK.parse(b),pa=SRK.parse(a);if(!pa||!pb){toast("नंबर ऐसे लिखें: 5-3 → 4-2");return 0}if(!pb.known){toast(b+" नक्शे में नहीं");return 0}
    act().forEach(i=>["rack","grack"].forEach(f=>{if(SRK.canon(i[f])===pa.code)plan.push({it:i,f,from:pa.code,to:pb.code})}))}
  else{toast("दोनों खाने (5-3 → 4-2) या दोनों रैक (5 → 4) लिखें");return 0}
  if(!plan.length){toast(a+" में कोई सामान नहीं");return 0}if(!isOwn()){toast("सिर्फ़ विक्रम जी");return 0}
  let n=0;const log=[];for(const x of plan){const ok=S.demo||!S.db?true:await S.db.doc("items/"+x.it.id).update({rack:x.to}).then(()=>true,()=>false);
    if(ok){x.it.rack=x.to;n++;log.push({id:x.it.id,from:x.from,to:x.to})}}
  logMoves(log);toast("↔ "+n+" सामान "+a+" → "+b);return n};
function body(){chk();const R=SRK.racks(),none=act().filter(i=>!SRK.norm(i.rack)).length,ch=SRK.changed(),T=SRK.today(),td=RK[T];
  const filled=RL.reduce((a,x)=>a+fill(x.r),0),gd=act().filter(i=>{const p=SRK.parse(i.rack);return (p&&p.g)||SRK.norm(i.grack)}).length;
  return `<div class="srk-k"><div><b>${act().length-none}</b><span>जगह लगी</span></div><div class="${none?"w":""}"><b>${none}</b><span>बाकी</span></div><div><b>${filled}/${SRK.total()}</b><span>खाने भरे</span></div><div><b>${gd}</b><span>अंदर</span></div></div>
  ${td?`<div class="srk-td">🔢 <b>आज गिनें: रैक ${T}</b> — ${esc(td.nm)}<button type="button" class="srk-b pri" data-srkcount="${T}">गिनती खोलें</button></div>`:""}
  <div class="srk-as"><label>📍 खाना<input id="srkR" class="inp code" value="${esc(V.rack)}" placeholder="11-23" inputmode="text" autocomplete="off" aria-label="खाने का नंबर"></label>
    <div id="srkInfo">${codeInfo()}</div>
    <div class="srk-q"><input id="srkQ" class="inp" type="search" value="${esc(V.q)}" placeholder="🔍 सामान का नाम / कोड — या बारकोड स्कैन करें" autocomplete="off" aria-label="सामान खोजें"><button type="button" class="scanbtn" data-srkcam aria-label="कैमरे से स्कैन">📷</button></div>
    <div id="srkHits">${hits(V.q).map(i=>row(i,setBtn(i))).join("")}</div>
    <p class="note" style="margin:4px 0 0">खाने का स्टिकर स्कैन करें (या नंबर लिखें), फिर उस खाने का हर सामान स्कैन करें — अपने-आप उसी खाने का। 31–35 गोदाम = सामान की "गोदाम वाली जगह"।</p></div>
  <h4 class="srk-h">🗄️ बाहर वाला हिस्सा (${RL.filter(x=>!x.g).length} रैक)</h4><div class="srk-g">${RL.filter(x=>!x.g).map(rackChip).join("")}${isOwn()?`<button type="button" class="srk-rk srk-new" data-srknew="0"><b>＋</b><span>नया रैक</span></button>`:""}</div>
  <h4 class="srk-h">🚪 अंदर वाला हिस्सा (${RL.filter(x=>x.g).length} रैक, पटरी ऊपर से)</h4><div class="srk-g">${RL.filter(x=>x.g).map(rackChip).join("")}${isOwn()?`<button type="button" class="srk-rk srk-new" data-srknew="1"><b>＋</b><span>नया रैक</span></button>`:""}</div>
  ${V.nr?`<div class="srk-ed srk-nr"><b>➕ नया रैक</b><input id="srkNr" class="inp code" inputmode="numeric" value="${V.nr.r}" aria-label="रैक नंबर"><input id="srkNn" class="inp" inputmode="numeric" value="${V.nr.n}" aria-label="कितने खाने" placeholder="खाने"><input id="srkNm" class="inp" value="" placeholder="नाम (जैसे दरवाज़े के पीछे)" aria-label="नाम"><input id="srkNk" class="inp" value="" placeholder="क्या रखें" aria-label="क्या रखें"><button type="button" class="srk-b pri" data-srknrsave>जोड़ें</button><button type="button" class="srk-b" data-srknrx>रद्द</button></div>`:""}
  ${R.some(x=>!SRK.parse(x.r))?`<p class="note">पुराने नाम: ${R.filter(x=>!SRK.parse(x.r)).map(x=>`<button type="button" class="chip" data-srksel="${esc(x.r)}">${esc(x.r)} ${x.n}</button>`).join(" ")}</p>`:""}
  ${V.sel?rackDetail():""}
  ${isOwn()?`<div class="srk-rp"><b>📊 रैक का हिसाब + 🧠 सुझाव</b><div class="srk-tl">${[7,15,30].map(d=>`<button type="button" class="srk-b${V.rep===d?" pri":""}" data-srkrep="${d}">${d} दिन</button>`).join("")}</div><div id="srkRep">${V.repD?repHTML(V.repD):`<p class="note" style="margin:0">दिन चुनें — हर रैक की बिक्री, किस साथी ने बेचा, स्टॉक-मूल्य, और 10 दिन की बिक्री के बाद जगह बदलने के सुझाव।</p>`}</div></div>`:""}
  ${isOwn()?`<details class="srk-im"${V.imp?" open":""}><summary>📥 AI से आई रैक-सूची चिपकाएँ (ZIP v4.8)</summary><textarea id="srkImp" class="inp" rows="5" placeholder='{"items":[{"barcode":"8901786140503","rack":"6-4"}]}  या हर लाइन: बारकोड,6-4' style="font:12.5px monospace;width:100%">${esc(V.impT||"")}</textarea><button type="button" class="srk-b pri" data-srkimp>📍 जगह लगाएँ</button><div id="srkImpR">${V.impR||""}</div></details>`:""}
  <button type="button" class="big ghost srk-ab" data-srkaud aria-expanded="${V.aud}">🧭 सही जगह — बिखरा सामान एक जगह ${V.aud?"▲":"▼"}</button>${V.aud?audHTML():""}
  ${isOwn()?`<div class="srk-pb"><button type="button" class="big" data-srkall ${act().some(i=>SRK.norm(i.rack))?"":"disabled"}>🏷️ सारी भाव-पट्टी (${act().filter(i=>SRK.norm(i.rack)).length} सामान)</button>
    ${ch.length?`<button type="button" class="big ghost" data-srkch>🔁 भाव बदले — ${ch.length} पट्टी दोबारा छापें</button>`:""}
    <button type="button" class="big" data-srkchk>📋 चिपकाने की सूची (A4, ☐ हर खाना)</button>
    <button type="button" class="big ghost" data-srkbdall>🪧 सारे ${RL.length} रैक के बोर्ड (A4, बड़ा नंबर)</button>
    <button type="button" class="big ghost" data-srkstkall>🏷️ सारे ${SRK.total()} खानों के स्टिकर (TSC / A4)</button></div>`:""}
  <details class="srk-lg"><summary>नंबर का तरीका</summary><p class="note">11-23 = रैक 11 का खाना 23। हर रैक में गिनती ऊपर-बाएँ से, किताब पढ़ने जैसे — बाएँ से दाएँ, फिर नीचे की लाइन। 1–21 दुकान, 31–35 गोदाम (वहाँ पटरी गिनें, सबसे ऊपर = 1)। छोटी जगहें अलग रैक नहीं: पुराने 2 → 1-7/1-8, 3 → 12-5…8, 14 → 13-13/14, 16 → 10-5। 31–35 दुकान का अंदर वाला हिस्सा (गोदाम नहीं)। फोटो में खाने छूट गए हों तो रैक खोलकर ＋1 दबाएँ, फिर "नए खानों के स्टिकर"। फ्रिज-फ्रीज़र: 17 चॉकलेट फ्रिज, 18 डबल फ्रीज़र, 19 आइसक्रीम, 20 Coca-Cola, 21 सब्ज़ी-ब्रेड बेंच। गोदाम का फ़र्श खाली रहे।</p></details>`}
/* ---------- 📊 रैक का हिसाब (मालिक) + 🧠 सुझाव ---------- */
const BC={};const GOLD=p=>ISMH&&!!p&&([5,6,7,8,10].includes(p.rack)||(p.rack===11&&p.k>=10&&p.k<=36));SRK.gold=c=>GOLD(SRK.parse(c));
SRK.sales=async function(days){days=Math.max(1,Math.min(60,+days||15));const out=[];
  for(let i=0;i<days;i++){const d=today(new Date(Date.now()-i*864e5));let L=null;
    if(d===S.billsDate&&Array.isArray(S.dayBills))L=S.dayBills;else if(BC[d])L=BC[d];
    else if(SRK._demoBills)L=SRK._demoBills[d]||[];else if(!S.demo&&S.db){try{const q=await S.db.collection("days/"+d+"/bills").get();L=q.docs.map(z=>z.data());if(d!==today())BC[d]=L}catch(e){L=[]}}
    out.push([d,(L||[]).filter(b=>b&&!b.cancelled&&!b.pending)])}
  const rk={},itq={};let nd=0;
  out.forEach(([d,L])=>{if(L.length)nd++;L.forEach(b=>(b.lines||[]).forEach(l=>{const it=item(l.id),c=SRK.canon(l.rk||(it&&it.rack)||""),p=SRK.parse(c),r=p?p.rack:0;
    const g=rk[r]=rk[r]||{r,amt:0,q:0,bills:new Set(),st:{},it:{}};const a=+l.amt||0;g.amt+=a;g.q+=+l.qty||0;g.bills.add(b.no);const nm=b.byName||"—";g.st[nm]=(g.st[nm]||0)+a;
    const t=g.it[l.id]=g.it[l.id]||{id:l.id,n:l.name,a:0,q:0};t.a+=a;t.q+=+l.qty||0;itq[l.id]=(itq[l.id]||0)+(+l.qty||0)}))});
  /* 📥 माल आया: खरीद (purchases, मालिक के फोन में ~20 दिन) सामान की अभी की जगह के रैक में */
  const from=today(new Date(Date.now()-(days-1)*864e5)),seen=new Set();
  [...(S.purchHist||[]),...(S.purch||[])].forEach(pu=>{if(!pu||pu.cancelled||seen.has(pu.id)||!(pu.date>=from))return;seen.add(pu.id);
    (pu.lines||[]).forEach(l=>{const it=l.id&&item(l.id);if(!it)return;const p=SRK.parse(SRK.canon(l.rk||it.rack||"")),r=p?p.rack:0;
      const g=rk[r]=rk[r]||{r,amt:0,q:0,bills:new Set(),st:{},it:{}};g.inA=(g.inA||0)+(+l.amt||0);g.inQ=(g.inQ||0)+(+l.qty||0);const nm=pu.byName||"—";g.inS=g.inS||{};g.inS[nm]=(g.inS[nm]||0)+(+l.amt||0)})});
  const val={};act().forEach(i=>{const p=SRK.parse(i.rack);if(!p||!i.track)return;val[p.rack]=(val[p.rack]||0)+(+(S.pstock[i.id]&&S.pstock[i.id].qty)||0)*(+i.cost||0)});
  const R=Object.values(rk).map(g=>({...g,bills:g.bills.size,val:val[g.r]||0,top:Object.values(g.it).sort((a,b)=>b.a-a.a).slice(0,3)}));
  Object.keys(val).forEach(r=>{if(!rk[r])R.push({r:+r,amt:0,q:0,bills:0,st:{},top:[],val:val[r]})});R.sort((a,b)=>b.amt-a.amt);
  /* 🧠 सुझाव — 10 दिन की बिक्री के बाद */
  let sug=null;if(nd>=10){const sold=act().filter(i=>itq[i.id]>0).sort((a,b)=>itq[b.id]-itq[a.id]),top=sold.slice(0,Math.max(1,Math.ceil(sold.length*0.2)));
    sug={near:top.filter(i=>SRK.canon(i.rack)&&!SRK.gold(i.rack)).slice(0,25).map(i=>({it:i,q:itq[i.id]})),
      away:act().filter(i=>SRK.gold(i.rack)&&!itq[i.id]&&!(typeof isTob==="function"&&isTob(i))).slice(0,25)}}
  const D={days,nd,R,sug};V.repD=D;return D};
function repHTML(D){const tot=D.R.reduce((a,g)=>a+g.amt,0)||1;
  return `<p class="note" style="margin:4px 0">${D.days} दिन में ${D.nd} दिन की बिक्री · हर रैक पर टैप = कौन-सा साथी, टॉप सामान</p>
  ${D.R.map(g=>{const d=RK[g.r];return `<div class="srk-rr"><button type="button" class="srk-rh" data-srkrk="${g.r}"><b>${g.r?"रैक "+g.r:"बिना रैक"}</b><span>${esc(d?d.nm:g.r?"":"जगह नहीं लगी")}</span><i>${rs(Math.round(g.amt))}</i><em style="width:${Math.max(2,Math.round(g.amt/tot*100))}%"></em></button>
    <div class="srk-rx">${g.bills} बिल · ${Math.round(g.q*100)/100} मात्रा${g.val?` · स्टॉक ${rs(Math.round(g.val))}`:""}${g.inA?`<br>📥 माल आया ${rs(Math.round(g.inA))} (${Math.round(g.inQ*100)/100}) — ${Object.entries(g.inS||{}).map(([n,a])=>esc(n)+" "+rs(Math.round(a))).join(" · ")}`:""}<br>👥 ${Object.entries(g.st).sort((a,b)=>b[1]-a[1]).map(([n,a])=>esc(n)+" "+rs(Math.round(a))).join(" · ")||"—"}<br>⭐ ${g.top.map(t=>esc(SE.capNm(t.n||""))+" "+rs(Math.round(t.a))).join(" · ")||"—"}</div></div>`}).join("")||`<p class="note">इन दिनों में कोई बिक्री नहीं</p>`}
  <h4 class="srk-h">🧠 सुझाव</h4>${!D.sug?`<p class="note" style="margin:0">अभी ${D.nd} दिन की बिक्री है — 10 दिन होते ही यहाँ बताएँगे कौन-सा सामान पास लाएँ, कौन-सा ऊपर/अंदर भेजें। (30 दिन चुनें)</p>`:
  `${D.sug.near.length?`<p class="srk-in"><b>⬇️ पास लाएँ (तेज़ बिकते हैं, पर दूर रखे):</b> ${D.sug.near.map(x=>esc(NM(x.it))+` <code>${esc(SRK.canon(x.it.rack))}</code>`).join(" · ")} — रैक 5–8 / 10 / 11 के बीच वाले खानों में</p>`:""}
  ${D.sug.away.length?`<p class="srk-in"><b>⬆️ ऊपर या अंदर भेजें (सबसे अच्छी जगह पर, पर ${D.days} दिन में नहीं बिके):</b> ${D.sug.away.map(i=>esc(NM(i))+` <code>${esc(SRK.canon(i.rack))}</code>`).join(" · ")}</p>`:""}
  ${!D.sug.near.length&&!D.sug.away.length?`<p class="srk-ok">✓ जगहें बिक्री के हिसाब से ठीक हैं</p>`:""}<p class="note" style="margin:0">बिखरी किस्मों के लिए नीचे 🧭 सही जगह देखें। ↔ से बदलें — ऐप अपने-आप कुछ नहीं बदलता।</p>`}`}
SRK.repHTML=repHTML;
/* 📋 चिपकाने की सूची (A4): हर रैक का डिब्बा, ☐ हर खाना */
SRK.checklistHTML=function(){chk();return `<style>.cl{display:grid;grid-template-columns:1fr 1fr;gap:3mm;font-family:sans-serif}.cb{border:0.4mm solid #000;border-radius:2mm;padding:2mm;page-break-inside:avoid}
  .cb h3{margin:0;font:800 14pt sans-serif;display:flex;gap:2mm;align-items:baseline}.cb h3 b{font:900 20pt monospace}.cb p{margin:0.5mm 0 1.5mm;font:9pt sans-serif}.cb .g{display:flex;flex-wrap:wrap;gap:1mm}.cb .g span{font:700 9.5pt monospace;border:0.25mm solid #555;border-radius:1mm;padding:0.3mm 1mm}
  h2{font:800 15pt sans-serif;margin:0 0 3mm}</style><h2>📋 चिपकाने की सूची · ${RL.length} रैक · ${SRK.total()} खाने — हर खाना ऊपर-बाएँ से, किताब जैसे</h2>
  <div class="cl">${RL.map(d=>`<div class="cb"><h3><b>${d.r}</b>${esc(d.nm)}${d.g?" (अंदर)":""}</h3><p>${d.n} ${d.g?"पटरी":"खाने"} · ${esc(d.keep)}</p><div class="g">${SRK.codesOf(d.r).map(c=>`<span>☐ ${c}</span>`).join("")}<span>☐ बोर्ड</span></div></div>`).join("")}</div>
  <p style="font:10pt sans-serif">छूटा खाना मिले तो: ऐप → 📍 रैक → वह रैक → ＋1 → "नए खानों के स्टिकर"।</p>`};
SRK.checklist=async function(){try{await SE.printA4("चिपकाने की सूची",SRK.checklistHTML())}catch(e){toast("प्रिंट नहीं हुआ");return 0}return 1};
/* 📥 AI (ZIP v4.8) से आई रैक-सूची: {"items":[{barcode|key|code|name, rack, rackConf}], "racks":[{rack, thumb}]} या "बारकोड,11-23" लाइनें
   मिलान: बारकोड → 4 अंक कोड → पूरा नाम। सिर्फ़ नक्शे वाले खाने; जिसकी जगह पहले से अलग है उसे बदलता है (मालिक), हर बदलाव meta/rack में। */
SRK.importText=async function(txt){txt=String(txt||"");let L=[],racks=[];
  try{let t=txt;const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f)t=f[1];const a=t.indexOf("{"),a2=t.indexOf("["),st=a2>-1&&(a<0||a2<a)?a2:a;if(st<0)throw 0;
    const j=JSON.parse(t.slice(st,t.lastIndexOf(st===a2?"]":"}")+1).replace(/[“”]/g,'"'));L=Array.isArray(j)?j:(j.items||[]);racks=Array.isArray(j.racks)?j.racks:[]}
  catch(e){L=txt.split(/\n+/).map(l=>l.split(/[,\t;|]+/).map(x=>x.trim())).filter(x=>x.length>=2).map(x=>({key:x[0],rack:x[x.length-1]}))}
  const R0={ok:0,same:0,bad:[],miss:[],low:[],ph:0};const log=[];
  for(const x of L){if(!x)continue;const rc=SRK.canon(x.rack||"");const p=SRK.parse(rc);const nm=String(x.short||x.name||x.key||x.barcode||"").slice(0,40);
    if(!rc)continue;if(!p||!p.known){R0.bad.push(nm+" ("+(x.rack||"")+")");continue}
    const keys=[x.barcode,x.key,x.gtin].map(v=>String(v||"").trim()).filter(Boolean);let it=null;for(const k of keys){it=findByCode(k);if(it)break}
    if(!it&&x.code)it=act().find(i=>String(i.code)===String(x.code));
    if(!it&&nm){const u=SE.capNm(nm);it=act().find(i=>SE.capNm(i.short||"")===u||SE.capNm(i.name||"")===u)}
    if(!it){R0.miss.push(nm);continue}if(SRK.canon(it.rack)===p.code){R0.same++;continue}
    const old=SRK.canon(it.rack);if(await setLoc(it.id,p.code)){R0.ok++;log.push({id:it.id,from:old,to:p.code,src:"ai"});if(String(x.rackConf||"").toLowerCase()==="low")R0.low.push(NM(it)+" "+p.code)}}
  for(const r of racks){const n=+String(r&&r.rack||"").replace(/\D.*$/,"");const u=r&&r.thumb;if(!RK[n]||!/^data:image\//.test(String(u||"")))continue;
    try{const sp=String(u).split(","),bin=atob(sp[1]||""),ar=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)ar[i]=bin.charCodeAt(i);const b=new Blob([ar],{type:(sp[0].match(/data:([^;]+)/)||[])[1]||"image/jpeg"});if(window.SPH&&SPH.save){await SPH.save("rk_"+n,b);R0.ph++}}catch(e){}}
  logMoves(log);return R0};
function audHTML(){const A=SRK.audit(),n=A.move.length+A.none.length;
  return `<div class="srk-au"><p class="note" style="margin:0 0 6px">हर किस्म का एक पक्का घर (दुनिया के वेयरहाउस/मेडिकल स्टोर जैसा): ग्राहक-साथी को कभी ढूँढना न पड़े। लाल = घर से बाहर रखा सामान।</p>
  ${A.groups.map(g=>`<div class="srk-ag${g.out?" bad":""}"><b>${esc(g.t)}</b><span>${g.n} सामान · घर <button type="button" class="chip" data-srksel="${g.r}">रैक ${g.r}</button>${g.spots>1?` · <i>${g.spots} जगह बिखरा</i>`:""}${g.out?` · <i>${g.out} बाहर</i>`:""}</span></div>`).join("")}
  ${n?`<div class="srk-mv"><b>ले जाएँ (${n})</b>${[...A.move.map(m=>[m.it,m.cur,m.h]),...A.none.slice(0,60).map(m=>[m.it,"",m.h])].slice(0,80).map(([it,c,h])=>`<div>${esc(NM(it))} <code>${c?esc(c):"जगह नहीं"}</code> → <button type="button" class="chip" data-srksel="${h.r}">रैक ${h.r}</button></div>`).join("")}</div>
  ${isOwn()?`<button type="button" class="big" data-srkmv>🖨️ "ले जाएँ" सूची छापें (A4, ☐ टिक करने वाली)</button>`:""}`:`<p class="srk-ok">✓ सब सामान अपने घर में</p>`}</div>`}
function draw(){const b=$("#srkBody");if(!b)return;const a=document.activeElement,id=a&&a.id,pos=a&&a.selectionStart;b.innerHTML=body();if(id){const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}}
function openCount(r){V.open=false;closeSheet();S.tab="stock";showTab();setTimeout(()=>{let b=document.querySelector("[data-skstart]");if(b)b.click();
  setTimeout(()=>{const i=document.querySelector("#ckrack");if(i){i.value=String(r);i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new Event("change",{bubbles:true}))}toast("🔢 रैक "+r+" की गिनती — "+(RK[r]?RK[r].nm:""))},120)},120)}
SRK.openCount=openCount;
SRK.open=function(sel){V.open=true;if(sel)V.sel=SRK.norm(sel);
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px srk" id="srkSheet" role="dialog" aria-label="रैक व्यवस्था"><div class="grab"></div>
  <div class="sh-head"><h3 style="font-size:17px">📍 रैक-खाना व्यवस्था</h3><button class="x" data-close aria-label="बंद करें">✕</button></div><div id="srkBody"></div></div></div>`;
  const sh=$("#sheet");draw();
  sh.onclick=async e=>{const t=e.target;if(t.matches("[data-close]")){V.open=false;closeSheet();refreshCard();return}const g=s=>t.closest(s);let b;
    if((b=g("[data-srkset]"))){await assign(b.dataset.srkset);return}
    if((b=g("[data-srksel]"))){V.sel=V.sel===b.dataset.srksel?"":b.dataset.srksel;draw();const d=$(".srk-sel");if(d&&V.sel)d.scrollIntoView({block:"nearest"});return}
    if((b=g("[data-srkrm]"))){if(await clearLoc(b.dataset.srkrm,b.dataset.f||"rack"))draw();return}
    if((b=g("[data-srkpr]"))){const L=SRK.of(b.dataset.srkpr).filter(i=>SRK.norm(i.rack));SRK.print(L,"खाने की भाव-पट्टी · रैक "+b.dataset.srkpr);return}
    if((b=g("[data-srkstk]"))){SRK.stickers(SRK.codesOf(+b.dataset.srkstk));return}
    if(g("[data-srkimp]")){V.imp=true;V.impT=$("#srkImp").value;const r=await SRK.importText(V.impT);
      V.impR=`<p class="srk-ok">✓ ${r.ok} सामान की जगह लगी · ${r.same} पहले से सही${r.ph?` · 📷 ${r.ph} रैक-फोटो`:""}</p>${r.low.length?`<p class="srk-wn">🔎 AI को पक्का नहीं — एक बार देख लें: ${r.low.map(esc).join(" · ")}</p>`:""}${r.miss.length?`<p class="srk-wn">❓ ऐप में नहीं मिले (पहले सामान जोड़ें): ${r.miss.slice(0,30).map(esc).join(" · ")}</p>`:""}${r.bad.length?`<p class="srk-wn">⚠ खाना नक्शे में नहीं: ${r.bad.slice(0,30).map(esc).join(" · ")}</p>`:""}`;draw();return}
    if(g("[data-srkaud]")){V.aud=!V.aud;draw();return}
    if(g("[data-srkmv]")){SE.printA4("सामान सही जगह",SRK.moveHTML()).catch(()=>toast("प्रिंट नहीं हुआ"));return}
    if((b=g("[data-srkbd]"))){SRK.boards([+b.dataset.srkbd]);return}
    if(g("[data-srkbdall]")){SRK.boards();return}
    if(g("[data-srkstkall]")){chk();SRK.stickers(RL.flatMap(x=>SRK.codesOf(x.r)));return}
    if(g("[data-srkchk]")){SRK.checklist();return}
    if((b=g("[data-srkrange]"))){const r=+b.dataset.srkrange,A=+(b.dataset.a||($("#srkFa")||{}).value)||1,B=+(b.dataset.b||($("#srkFb")||{}).value)||A;SRK.stickers(SRK.codesOf(r).filter((c,k)=>k+1>=Math.min(A,B)&&k+1<=Math.max(A,B)));return}
    if((b=g("[data-srkadd]"))){if(await SRK.addKhana(+V.sel,+b.dataset.srkadd))draw();return}
    if(g("[data-srkdel]")){if(await SRK.delKhana(+V.sel))draw();return}
    if(g("[data-srkedit]")){V.edit=!V.edit;draw();return}
    if(g("[data-srkedsave]")){const r=V.sel;if(await saveRk({nm:{[r]:$("#srkEn").value.trim().slice(0,40)||RK[+r].nm},keep:{[r]:$("#srkEk").value.trim().slice(0,90)}})){V.edit=false;toast("✓ रैक "+r+" का नाम सेव");draw()}return}
    if((b=g("[data-srkfrom]"))){V.ta=b.dataset.srkfrom;V.tb="";draw();const i=$("#srkTb");if(i)i.focus();return}
    if(g("[data-srkmove]")){V.ta=$("#srkTa").value;V.tb=$("#srkTb").value;if(await SRK.move(V.ta,V.tb)){V.ta=V.tb="";draw()}return}
    if((b=g("[data-srknew]"))){V.nr={r:SRK.nextRack(b.dataset.srknew==="1"),n:6};draw();const i=$("#srkNm");if(i)i.focus();return}
    if(g("[data-srknrx]")){V.nr=false;draw();return}
    if(g("[data-srknrsave]")){if(await SRK.addRack($("#srkNr").value,$("#srkNn").value,$("#srkNm").value.trim(),$("#srkNk").value.trim())){V.nr=false;draw()}return}
    if((b=g("[data-srkrep]"))){V.rep=+b.dataset.srkrep||15;const o=$("#srkRep");if(o)o.innerHTML=`<p class="note">⏳ ${V.rep} दिन के बिल पढ़ रहे हैं…</p>`;const D=await SRK.sales(V.rep);if(o&&V.open)o.innerHTML=repHTML(D);return}
    if((b=g("[data-srkrk]"))){const o=b.closest(".srk-rr");if(o)o.classList.toggle("op");return}
    if((b=g("[data-srkcount]"))){openCount(+b.dataset.srkcount);return}
    if(g("[data-srkall]")){SRK.print(act().filter(i=>SRK.norm(i.rack)),"खाने की भाव-पट्टी · सब");return}
    if(g("[data-srkch]")){SRK.print(SRK.changed(),"भाव बदले — नई पट्टी");return}
    if(g("[data-srkcam]")){if(typeof camOn==="function")camOn();return}};
  sh.onchange=async e=>{const t=e.target;if(!t.dataset||!t.dataset.srkph||!t.files||!t.files[0])return;const r=t.dataset.srkph;
    if(!window.SPH||!SPH.save){toast("फोटो वाला हिस्सा नहीं मिला");return}toast("📷 फोटो छोटी करके सेव कर रहे हैं…");
    try{await SPH.save("rk_"+r,t.files[0]);toast("✓ रैक "+r+" की फोटो सेव (≤20 KB)");draw()}catch(err){toast("फोटो सेव नहीं हुई — सिर्फ़ विक्रम जी")}};
  sh.oninput=e=>{const t=e.target;if(t.id==="srkFa"||t.id==="srkFb"){V[t.id==="srkFa"?"fa":"fb"]=t.value;return}if(t.id==="srkTa"||t.id==="srkTb"){const v=SRK.norm(t.value);if(v!==t.value)t.value=v;V[t.id==="srkTa"?"ta":"tb"]=v;return}if(t.id==="srkR"){const v=SRK.norm(t.value);if(v!==t.value)t.value=v;V.rack=v;LSr.set("srk_cur",v);const n=$("#srkInfo");if(n)n.innerHTML=codeInfo();const h=$("#srkHits");if(h)h.innerHTML=hits(V.q).map(i=>row(i,setBtn(i))).join("");return}
    if(t.id==="srkQ"){V.q=t.value;const h=$("#srkHits");if(h)h.innerHTML=hits(V.q).map(i=>row(i,setBtn(i))).join("")}};
  sh.onkeydown=e=>{if(e.key==="Enter"&&e.target.id==="srkQ"){const v=e.target.value.trim(),it=findByCode(v)||hits(v)[0];if(it){e.preventDefault();assign(it.id)}}}};
SRK.settingsHTML=function(){if(!isOwn())return "";chk();const none=act().filter(i=>!SRK.norm(i.rack)).length,ch=SRK.changed().length,T=SRK.today(),filled=RL.reduce((a,x)=>a+fill(x.r),0);
  return `<div class="card2" id="srkCard"><h3 style="margin:0 0 4px">📍 रैक-खाना व्यवस्था</h3>
  <p class="note" style="margin:0 0 8px">जगह लगी: <b>${act().length-none}</b> · बाकी: <b>${none}</b> · खाने भरे: <b>${filled}/${SRK.total()}</b>${ch?` · 🔁 भाव बदले: <b>${ch}</b>`:""}${RK[T]?` · 🔢 आज गिनें: <b>रैक ${T}</b>`:""}</p>
  <div class="srk-pb"><button type="button" class="pri" data-srkopen>📍 जगह लगाएँ · खाना खोजें · स्टिकर</button></div></div>`};
function refreshCard(){const c=$("#srkCard");if(c)c.outerHTML=SRK.settingsHTML()}
/* 🧭 नया सामान: किस्म से घर का सुझाव */
function niHome(){const b=document.getElementById("ni-rkhome");if(!b)return;const v=id=>(document.getElementById(id)||{}).value||"";const h=SRK.home({name:v("ni-name"),cat:v("ni-cat"),sub:v("ni-sub"),secret:v("ni-secret")});
  if(!h||!RK[h.r]){b.hidden=true;return}b.hidden=false;b.dataset.r=h.r;b.textContent="🧭 रैक "+h.r+" ("+h.t+")"}
SRK.niHome=niHome;
["input","change"].forEach(ev=>document.addEventListener(ev,e=>{const t=e.target;if(t&&["ni-name","ni-cat","ni-sub","ni-secret"].includes(t.id))niHome()}));
document.addEventListener("click",e=>{const b=e.target.closest("#ni-rkhome");if(!b)return;const i=document.getElementById("ni-rack");if(i){i.value=b.dataset.r+"-";i.focus();toast("खाने का नंबर पूरा करें, या खाने का स्टिकर स्कैन करें")}});
/* 📷 editor / नया सामान: रैक का स्टिकर कैमरे से */
document.addEventListener("click",e=>{const b=e.target.closest("[data-rkcam]");if(!b)return;e.preventDefault();SRK.arm=b.dataset.rkcam||"";toast("📷 खाने का स्टिकर (QR या बारकोड) कैमरे के सामने रखें");if(typeof camOn==="function")camOn()});
document.addEventListener("click",e=>{const b=e.target.closest("[data-srkopen]");if(!b||b.closest("#srkSheet"))return;SRK.open(b.dataset.srkopen||"")});

const css=document.createElement("style");css.textContent=`
.srk-k{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 0 8px}.srk-k div{border:1.5px solid var(--line);border-radius:12px;padding:6px;text-align:center}.srk-k b{display:block;font-size:18px}.srk-k span{font-size:11.5px;color:var(--muted)}.srk-k .w b{color:#b45309}
.srk-as{border:1.5px solid var(--line);border-radius:14px;padding:8px;display:flex;flex-direction:column;gap:6px}.srk-as label{display:flex;align-items:center;gap:8px;font-weight:700}.srk-as #srkR{width:120px;font:800 18px monospace;text-transform:uppercase}
.srk-q{display:flex;gap:6px}.srk-q input{flex:1;min-width:0}
.srk-r{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--line)}.srk-r .tile{width:40px;height:40px;border-radius:9px}.srk-r .tile .em{font-size:20px}.srk-r b{display:block;font-size:13px}.srk-r span{font-size:12px;color:var(--muted)}
.srk-b{padding:6px 9px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13px;white-space:nowrap}.srk .pri,#srkCard .pri{background:#0f766e;color:#fff;border-color:#0f766e;padding:8px 12px;border-radius:12px;font:inherit}
.srk-h{margin:10px 0 6px;font-size:14px}.srk-c{display:flex;flex-wrap:wrap;gap:6px}.srk-c b{font-size:11px;opacity:.75;margin-left:2px}
.srk-sel{margin-top:8px;border:1.5px solid #0f766e55;border-radius:14px;padding:8px}.srk-st{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px}
.srk-pb{display:flex;flex-direction:column;gap:6px;margin-top:10px}.srk-lg{margin-top:8px}.srk-k{grid-template-columns:repeat(4,1fr)!important}
.srk-td{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;padding:8px 10px;border-radius:12px;background:#0f766e14;border:1.5px solid #0f766e55;font-size:13.5px}.srk-td button{margin-left:auto}
.srk-wn{color:#b45309;font-size:12.5px;font-weight:700}.srk-ok{color:#0f766e;font-size:12.5px;font-weight:700}.srk-in{font-size:12.5px;margin-top:2px}
.srk-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px}.srk-rk{display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:6px 8px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;text-align:left;min-width:0}
.srk-rk b{font:900 18px/1 monospace}.srk-rk span{font-size:11px;line-height:1.2;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.srk-rk i{font-style:normal;font-size:11px;font-weight:700;color:#0f766e}.srk-rk.on{border-color:#0f766e;box-shadow:0 0 0 2px #0f766e44}.srk-rk.td{border-style:dashed;border-color:#0f766e}
.srk-ph{display:flex;align-items:center;gap:8px;margin:4px 0 6px;flex-wrap:wrap}.srk-ph img{width:120px;height:120px;object-fit:cover;border-radius:10px;border:1.5px solid var(--line)}.srk-ph label{cursor:pointer}
.srk-rp{margin-top:10px;border:1.5px solid var(--line);border-radius:14px;padding:8px}.srk-rr{border-bottom:1px solid var(--line)}.srk-rh{display:grid;grid-template-columns:62px 1fr auto;gap:6px;align-items:center;width:100%;border:0;background:none;color:var(--ink);font:inherit;padding:6px 0 3px;text-align:left;position:relative}
.srk-rh span{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.srk-rh i{font-style:normal;font-weight:800;font-variant-numeric:tabular-nums}.srk-rh em{position:absolute;left:0;bottom:0;height:3px;border-radius:2px;background:#0f766e}
.srk-rx{display:none;font-size:12.5px;padding:2px 0 6px}.srk-rr.op .srk-rx{display:block}.srk-in code{font:700 11.5px monospace;color:#0f766e}
.srk-ab{margin-top:10px}.srk-im{margin-top:10px;border:1.5px solid var(--line);border-radius:14px;padding:8px}.srk-im summary{font-weight:700;cursor:pointer}.srk-im textarea{margin:6px 0}.srk-au{border:1.5px solid var(--line);border-radius:14px;padding:8px;margin-top:6px}.srk-ag{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--line);font-size:12.5px}.srk-ag b{min-width:120px}.srk-ag i{font-style:normal;font-weight:700;color:#b45309}.srk-ag.bad b{color:#b91c1c}
.srk-mv{margin:8px 0;font-size:12.5px;max-height:320px;overflow:auto}.srk-mv div{padding:3px 0;border-bottom:1px dashed var(--line)}.srk-mv code{font:700 12px monospace;color:#b45309}
.srk-tl{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:4px 0}.srk-tl>span{font-size:12.5px;font-weight:700;min-width:62px}.srk-tl .inp{width:84px;padding:6px 8px;font-size:14px}
.srk-ed{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;align-items:center}.srk-ed .inp{flex:1 1 140px;min-width:0;padding:6px 8px}.srk-nr{border:1.5px dashed #0f766e;border-radius:12px;padding:8px;margin-top:6px}.srk-nr #srkNr,.srk-nr #srkNn{flex:0 0 70px}
.srk-new{border-style:dashed;align-items:center;justify-content:center}.srk-nf{margin:4px 0;width:100%}.srk-kh.nw code{background:#fde68a;border-radius:4px;padding:0 3px}.srk-mvb{border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:8px;font-size:13px;padding:2px 7px}
.srk-kh{display:grid;grid-template-columns:52px 1fr auto;gap:6px;padding:3px 0;border-bottom:1px solid var(--line);font-size:12.5px;align-items:start}.srk-kh code{font:800 13px monospace}.srk-kh.e{opacity:.55}.srk-kh span{display:inline-flex;align-items:center;gap:2px;margin:0 6px 2px 0}.srk-kh span button{border:0;background:none;color:var(--muted);font-size:11px;padding:0 2px}.srk-pb2{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}`;
document.head.appendChild(css);
})();
