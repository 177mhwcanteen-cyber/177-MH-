/* 177 MH — 📍 रैक-खाना व्यवस्था (window.SRK) — पक्का नियम: docs/रैक-व्यवस्था-प्रॉम्प्ट.txt · जाँच: tests/rack.py
   विक्रम जी की फोटो पर लगे नंबर: "11-23" = रैक 11 का खाना 23 (ऊपर-बाएँ से, किताब जैसे)। रैक 1–21 दुकान, 31–35 गोदाम (पटरी ऊपर से), कुल 238।
   डेटा: items/<id>.rack = दुकान की मुख्य जगह (se-stock की रैक-वार गिनती वाला ही खाना) · items/<id>.grack = गोदाम की जगह (31–35)।
   रैक लगाना (खाने का स्टिकर/नंबर → सामान स्कैन), खाना खोज, आज की गिनती, खाने के स्टिकर (TSC/A4), भाव-पट्टी, ऑनलाइन ऑर्डर रैक-क्रम में। */
(()=>{
const SRK=window.SRK={};
const LSr={get:(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const NM=it=>typeof shortNm==="function"?shortNm(it):SE.capNm(it.short||it.name||"");
/* [रैक, खाने/पटरी, नाम, क्या रखें] — दूसरी योजना ("हर खाने का एक नंबर", 20 फोटो) से, 238 खाने।
   07-11 जोड़: छोटी-छोटी जगहें अलग रैक नहीं — 2→1 (1-7,1-8) · 3→12 (12-5…12-8) · 14→13 (13-13,13-14) · 16→10 (10-5)। पुराने नंबर OLD से नए में पढ़े जाते हैं। */
const MAP=[[1,8,"दरवाज़े के ऊपर","1–6 ऊपर के डिब्बे · 7–8 बगल के गुलाबजल वाले खाने — हल्का, कम बिकने वाला, कपड़े"],[4,10,"खिड़की के ऊपर","डिस्पोज़ल, कप-गिलास, बाल्टी-घर का हल्का सामान, बैटरी-बल्ब"],
 [5,7,"काउंटर पीछे (1)","साबूदाना, पोहा, सोया · 📦 कोड वाले (सिर्फ़ साथी के हाथ में)"],[6,13,"काउंटर पीछे (2)","🌶️ सारे मसाले एक जगह (Everest, MDH, साबुत) + सॉस की बोतलें"],[7,13,"काउंटर पीछे (3)","अचार, जैम, सॉस, टमाटर प्यूरी, ड्राई फ्रूट"],[8,12,"काउंटर पीछे (4)","जैम-जार, मूँगफली, दाल-मसाले का दूसरा फ़ेस"],
 [9,33,"कोने की अलमारी","रस्क, बूँदी, टॉफ़ी, 🎁 गिफ़्ट, 🪔 पूजा (सफ़ाई केमिकल नहीं)"],[10,5,"चिप्स रैक + शोकेस","1–4 Lays, Kurkure, चिप्स · 5 तराज़ू के पास काँच का शोकेस (मिठाई-बेकरी)"],[11,63,"बड़ा रैक","बाएँ नमकीन-बिस्किट · दाएँ साबुन-पेस्ट-शैम्पू-बाल-सफ़ाई · नीचे (55–63) स्टॉक"],[12,8,"टँगी लड़ियाँ (सब)","1–4 Coca-Cola के ऊपर की रॉड · 5–8 दरवाज़े के पास — Haldiram, Kurkure, शैम्पू-मसाले-कार्ड की लड़ियाँ"],
 [13,14,"खिड़की बाएँ + ऊपर","1–12 आटा, बेसन, चना, तेल-घी — भारी (भारी नीचे) · 13–14 खिड़की के ऊपर हल्का"],[15,14,"खिड़की दाएँ","✏️ सारी स्टेशनरी एक जगह (पेन, कॉपी, फ़ाइल, कलर) + पापड़"],[17,3,"चॉकलेट फ्रिज (नीला)","चॉकलेट — ऊपर से 1, 2, 3"],
 [18,2,"सफ़ेद डबल फ्रीज़र","दूध-दही-पनीर · 1 बायाँ, 2 दायाँ ढक्कन"],[19,2,"Amul आइसक्रीम फ्रीज़र","आइसक्रीम · 1 बायाँ, 2 दायाँ ढक्कन"],[20,5,"Coca-Cola फ्रिज","कोल्ड ड्रिंक-पानी-जूस · ऊपर से 1–5"],[21,2,"सब्ज़ी-ब्रेड बेंच","1 ब्रेड-पाव, 2 सब्ज़ी-फल"],
 [31,5,"गोदाम अलमारी","नमकीन-बिस्किट का अतिरिक्त स्टॉक"],[32,5,"गोदाम लोहे की रैक","बर्तन, डिब्बे"],[33,5,"गोदाम खंभे के पीछे","बिजली का सामान, कार्टन (फफूँद — खाना नहीं)"],[34,5,"गोदाम टिश्यू-कप","टिश्यू, पेपर कप, पैकिंग"],[35,4,"गोदाम मशीन वाली","मशीनें, मरम्मत"]];
/* पुराने नंबर (फोटो पर छपे) → नए — डेटा नहीं बदलता, पढ़ते समय नया */
const OLD={"2-1":"1-7","2-2":"1-8","3-1":"12-5","3-2":"12-6","3-3":"12-7","3-4":"12-8","14-1":"13-13","14-2":"13-14","16-1":"10-5"};SRK.OLD=OLD;
const GONE={2:1,3:12,14:13,16:10};SRK.GONE=GONE;
/* 🧭 घर (home zone) — हर किस्म की एक पक्की जगह (planogram)। पहले नाम के शब्द, फिर sub, फिर cat */
const HOME=[["chips","चिप्स",10,/\b(lays|kurkure|bingo|uncle chips|doritos|pringles|cheetos|too yumm)\b|चिप्स|कुरकुरे/i],
 ["choco","चॉकलेट",17,/(chocolate|dairy milk|kit ?kat|5 ?star|munch|perk|snickers|bournville|ferrero|kinder|eclairs|silk\b)|चॉकलेट/i],
 ["bread","ब्रेड-पाव",21,/\b(bread|pav|bun)\b|ब्रेड|पाव/i],["ice","आइसक्रीम",19,null,["ice"]],["dairy","दूध-दही-पनीर",18,null,["dairy"]],["drinks","कोल्ड ड्रिंक",20,null,["drinks"]],
 ["masala","मसाले",6,null,["masala"]],["achar","अचार-सॉस-ड्राई फ्रूट",7,null,["achar","dryfruit"]],["rashan","आटा-दाल-तेल (भारी)",13,null,["rashan","oil"]],
 ["namkeen","नमकीन-बिस्किट",11,null,["namkeen","sweet"]],["care","साबुन-पेस्ट-बाल-सफ़ाई",11,null,["personal","hair","clean"]],["tob","कोड वाले",5,null,["tob"]],
 ["pooja","पूजा",9,null,["pooja"]],["gift","गिफ़्ट-खिलौने",9,null,null,["gift"]],["light","डिस्पोज़ल-घर-बिजली",4,null,["disposal","home","tools","elec"]],
 ["stat","स्टेशनरी",15,null,null,["stationery"]],["sweets","मिठाई-बेकरी",10,null,null,["mithai"]],["sabzi","सब्ज़ी-फल",21,null,null,["sabzi"]],["kapde","कपड़े",1,null,null,["kapde"]]];
SRK.HOME=HOME;
SRK.home=function(it){if(!it)return null;const nm=(it.name||"")+" "+(it.short||"")+" "+(it.hi||""),c=typeof mcat==="function"?mcat(it):it.cat;
  if(typeof isTob==="function"&&isTob(it))return {k:"tob",t:"कोड वाले",r:5};
  for(const h of HOME)if(h[3]&&h[3].test(nm))return {k:h[0],t:h[1],r:h[2]};
  for(const h of HOME)if(h[4]&&h[4].includes(it.sub))return {k:h[0],t:h[1],r:h[2]};
  for(const h of HOME)if(h[5]&&h[5].includes(c))return {k:h[0],t:h[1],r:h[2]};return null};
SRK.MAP=MAP;const RK={};MAP.forEach(([r,n,nm,keep])=>RK[r]={r,n,nm,keep,g:r>=31});SRK.RK=RK;
SRK.total=()=>MAP.reduce((a,x)=>a+x[1],0);
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
SRK.today=()=>{const used=[...new Set(act().map(i=>rk0(i.rack)).filter(r=>r&&r<31))].sort((a,b)=>a-b);const L=used.length?used:MAP.filter(x=>x[0]<31).map(x=>x[0]);
  const d=Math.floor((Date.now()+5.5*3600e3)/864e5);return L[d%L.length]};

/* ---------- रैक लगाना ---------- */
async function setLoc(id,r){const it=item(id);if(!it)return false;r=SRK.norm(r);const p=SRK.parse(r),f=p&&p.g?"grack":"rack";
  if(S.demo||!S.db){it[f]=r;return f}
  if(!S.isOwner){toast("रैक सिर्फ़ विक्रम जी लगा सकते हैं — गिनती में रैक चुनकर गिनें");return false}
  try{await S.db.doc("items/"+id).update({[f]:r});it[f]=r;return f}catch(e){toast("सेव नहीं हुआ");return false}}
SRK.set=setLoc;
async function clearLoc(id,f){const it=item(id);if(!it)return false;if(S.demo||!S.db){it[f]="";return true}if(!S.isOwner)return false;try{await S.db.doc("items/"+id).update({[f]:""});it[f]="";return true}catch(e){return false}}
const V={rack:LSr.get("srk_cur",""),q:"",sel:"",open:false,aud:false};
/* खाने का स्टिकर (R11-23) स्कैन = वही खाना चुनो; सामान स्कैन = उस खाने का */
SRK.scan=function(code){const c=String(code||"").trim().toUpperCase(),m=/^R(\d{1,2}-\d{1,2})$/.exec(c);
  if(!V.open||!$("#srkSheet")){if(!m)return false;const p=SRK.parse(m[1]);if(!p)return false;beep(true);
    /* सामान का editor / नया सामान खुला हो → रैक का खाना वहीं भर दो */
    const ed=document.querySelector(p.g?'[data-if="grack"]':'[data-if="rack"]');
    if(ed&&ed.offsetParent!==null){ed.value=p.code;ed.dispatchEvent(new Event("input",{bubbles:true}));ed.dispatchEvent(new Event("change",{bubbles:true}));toast("📍 "+(p.g?"गोदाम ":"")+"खाना "+p.code+" भर दिया — "+SRK.info(p.code)+" · सेव दबाएँ");return true}
    const L=SRK.of(p.code);toast("📍 "+p.code+" · "+SRK.info(p.code)+(L.length?" — "+L.slice(0,4).map(NM).join(", ")+(L.length>4?" +"+(L.length-4):""):" — खाली"));return true}
  if(m){beep(true);V.rack=SRK.norm(m[1]);LSr.set("srk_cur",V.rack);toast("📍 खाना "+V.rack+" — "+SRK.info(V.rack)+" · अब सामान स्कैन करें");draw();return true}
  const it=findByCode(code);beep(!!it);if(!it){toast("यह बारकोड किसी सामान में नहीं: "+code);return true}assign(it.id);return true};
async function assign(id){const it=item(id);if(!it)return;if(!V.rack){toast("पहले ऊपर खाने का नंबर लिखें (जैसे 11-23) या खाने का स्टिकर स्कैन करें");const i=$("#srkR");if(i)i.focus();return}
  const p=SRK.parse(V.rack);if(p&&p.old){V.rack=p.code;LSr.set("srk_cur",V.rack)}const f=p&&p.g?"grack":"rack",old=SRK.canon(it[f]);if(old===V.rack){toast(NM(it)+" पहले से "+V.rack+" में");return}
  if(await setLoc(id,V.rack)){toast("📍 "+NM(it)+" → "+V.rack+(f==="grack"?" (गोदाम)":"")+(old?" · पहले "+old:""));V.q="";draw()}}

/* ---------- खाने के स्टिकर (TSC लेबल प्रिंटर / A4) ---------- */
SRK.stickerCanvas=function(code){const p=SRK.parse(code)||{code:SRK.norm(code)},W=400,H=200,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,W,H);x.fillStyle="#000";x.textBaseline="alphabetic";x.textAlign="center";
  let fs=80;x.font=`900 ${fs}px sans-serif`;while(x.measureText(p.code).width>W-40&&fs>40){fs-=6;x.font=`900 ${fs}px sans-serif`}x.fillText(p.code,W/2,24+fs*0.8);
  const nm=p.info?p.info.nm+(p.g?" · पटरी "+p.k:""):"",hm=SRK.homeOf(p.code);x.font="700 24px sans-serif";if(nm)x.fillText(nm.slice(0,30),W/2,24+fs*0.8+30);
  if(hm){x.font="600 19px sans-serif";x.fillText(hm.slice(0,34),W/2,24+fs*0.8+52)}
  try{if(window.SL&&SL.barCanvas){const b=SL.barCanvas("R"+p.code,W-60,34,false,0,2);if(b&&b.c){x.imageSmoothingEnabled=false;x.drawImage(b.c,Math.round((W-b.c.width)/2),H-b.c.height-10)}}}catch(e){}
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
    return `<div class="bd"><div class="n">${d.r}</div><div class="t">${d.g?"गोदाम · ":""}${esc(d.nm)}</div><div class="k">${esc(d.keep)}</div>
    <div class="g" style="grid-template-columns:repeat(${cols},1fr)">${SRK.codesOf(d.r).map(c=>`<div>${c}${d.n<=33?`<small>${esc(SRK.homeOf(c))}</small>`:""}</div>`).join("")}</div></div>`}).join("")}`};
SRK.boards=async function(racks){racks=(racks||MAP.map(x=>x[0])).filter(r=>RK[+r]);if(!racks.length)return 0;
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
const locTxt=it=>{const a=SRK.norm(it.rack),g=SRK.norm(it.grack);return (a?"📍 "+esc(a):"<em>जगह नहीं</em>")+(g?" · 🏬 "+esc(g):"")};
const row=(it,btn)=>`<div class="srk-r">${tileHTML(it)}<div><b>${esc(NM(it))}</b><span>${locTxt(it)}${+it.sale>0?" · "+rs(+it.sale):""}${it.code?" · #"+esc(it.code):""}</span></div>${btn||""}</div>`;
const setBtn=i=>`<button type="button" class="srk-b" data-srkset="${esc(i.id)}">→ ${esc(V.rack||"?")}</button>`;
function codeInfo(){const p=SRK.parse(V.rack);if(!V.rack)return `<span class="note">खाने का नंबर लिखें (11-23) या खाने का स्टिकर स्कैन करें</span>`;
  if(!p)return `<span class="srk-wn">⚠ नंबर ऐसे लिखें: रैक-खाना, जैसे 11-23</span>`;
  if(p.old)return `<span class="srk-wn">↪ ${esc(p.old)} पुराना नंबर — अब ${esc(p.code)} (${esc(SRK.info(p.code))})। स्टिकर नए नंबर का लगाएँ।</span>`;
  if(!p.known)return `<span class="srk-wn">⚠ ${esc(p.code)} नक्शे में नहीं${p.info?` — रैक ${p.rack} में ${p.info.n} ${p.g?"पटरी":"खाने"} हैं`:""}</span>`;
  const L=SRK.of(p.code);return `<span class="srk-ok">✓ ${esc(SRK.info(p.code))}${p.g?" · गोदाम (दूसरी जगह में लगेगा)":""}</span>${L.length?`<div class="srk-in"><b>इस खाने में:</b> ${L.map(i=>esc(NM(i))).join(" · ")}</div>`:`<div class="srk-in">यह खाना अभी खाली है</div>`}`}
const fill=r=>{const d=RK[r];if(!d)return 0;const f=d.g?"grack":"rack",S2=new Set();act().forEach(i=>{const p=SRK.parse(i[f]);if(p&&p.rack===r&&p.known)S2.add(p.k)});return S2.size};
function rackChip(d){const n=fill(d.r);return `<button type="button" class="srk-rk${V.sel===String(d.r)?" on":""}${SRK.today()===d.r?" td":""}" data-srksel="${d.r}"><b>${d.r}</b><span>${esc(d.nm)}</span><i>${n}/${d.n}</i></button>`}
function rackDetail(){const d=RK[+V.sel];if(!d){const L=SRK.of(V.sel);return L.length?`<div class="srk-sel"><b>📍 ${esc(V.sel)} · ${L.length} सामान</b>${L.map(i=>row(i)).join("")}</div>`:""}
  const f=d.g?"grack":"rack",by={};act().forEach(i=>{const p=SRK.parse(i[f]);if(p&&p.rack===d.r)(by[p.k]=by[p.k]||[]).push(i)});
  const lines=Array.from({length:d.n},(_,k)=>{const L=by[k+1]||[];return `<div class="srk-kh${L.length?"":" e"}"><code>${d.r}-${k+1}</code><div>${L.length?L.map(i=>`<span>${esc(NM(i))}${isOwn()?`<button type="button" data-srkrm="${esc(i.id)}" data-f="${f}" aria-label="${esc(NM(i))} हटाएँ">✕</button>`:""}</span>`).join(""):"<em>खाली</em>"}</div></div>`}).join("");
  const extra=act().filter(i=>{const p=SRK.parse(i[f]);return p&&p.rack===d.r&&!p.known});
  return `<div class="srk-sel"><div class="srk-st"><div><b>${d.g?"🏬":"🗄️"} रैक ${d.r} · ${esc(d.nm)}</b><span class="note" style="display:block">${esc(d.keep)}</span></div></div>${(()=>{const o=Object.keys(OLD).filter(k=>OLD[k].startsWith(d.r+"-"));return o.length?`<p class="note" style="margin:2px 0">↪ पुराने फोटो के नंबर ${o.join(", ")} अब इसी रैक में (${o.map(k=>OLD[k]).join(", ")})</p>`:""})()}
    ${isOwn()?`<div class="srk-pb2"><button type="button" class="srk-b" data-srkstk="${d.r}">🏷️ ${d.n} खानों के स्टिकर</button><button type="button" class="srk-b" data-srkbd="${d.r}">🪧 बोर्ड A4</button>${d.g?"":`<button type="button" class="srk-b pri" data-srkpr="${d.r}">🏷️ भाव-पट्टी</button>`}</div>`:""}
    ${lines}${extra.length?`<p class="srk-wn">⚠ गलत खाना नंबर: ${extra.map(i=>esc(NM(i))+" ("+esc(i[f])+")").join(", ")}</p>`:""}</div>`}
function body(){const R=SRK.racks(),none=act().filter(i=>!SRK.norm(i.rack)).length,ch=SRK.changed(),T=SRK.today(),td=RK[T];
  const filled=MAP.reduce((a,x)=>a+fill(x[0]),0),gd=act().filter(i=>SRK.norm(i.grack)).length;
  return `<div class="srk-k"><div><b>${act().length-none}</b><span>जगह लगी</span></div><div class="${none?"w":""}"><b>${none}</b><span>बाकी</span></div><div><b>${filled}/${SRK.total()}</b><span>खाने भरे</span></div><div><b>${gd}</b><span>गोदाम</span></div></div>
  ${td?`<div class="srk-td">🔢 <b>आज गिनें: रैक ${T}</b> — ${esc(td.nm)}<button type="button" class="srk-b pri" data-srkcount="${T}">गिनती खोलें</button></div>`:""}
  <div class="srk-as"><label>📍 खाना<input id="srkR" class="inp code" value="${esc(V.rack)}" placeholder="11-23" inputmode="text" autocomplete="off" aria-label="खाने का नंबर"></label>
    <div id="srkInfo">${codeInfo()}</div>
    <div class="srk-q"><input id="srkQ" class="inp" type="search" value="${esc(V.q)}" placeholder="🔍 सामान का नाम / कोड — या बारकोड स्कैन करें" autocomplete="off" aria-label="सामान खोजें"><button type="button" class="scanbtn" data-srkcam aria-label="कैमरे से स्कैन">📷</button></div>
    <div id="srkHits">${hits(V.q).map(i=>row(i,setBtn(i))).join("")}</div>
    <p class="note" style="margin:4px 0 0">खाने का स्टिकर स्कैन करें (या नंबर लिखें), फिर उस खाने का हर सामान स्कैन करें — अपने-आप उसी खाने का। 31–35 गोदाम = सामान की "गोदाम वाली जगह"।</p></div>
  <h4 class="srk-h">🗄️ दुकान (17 रैक, 1–21)</h4><div class="srk-g">${MAP.filter(x=>x[0]<31).map(x=>rackChip(RK[x[0]])).join("")}</div>
  <h4 class="srk-h">🏬 गोदाम (31–35, पटरी ऊपर से)</h4><div class="srk-g">${MAP.filter(x=>x[0]>=31).map(x=>rackChip(RK[x[0]])).join("")}</div>
  ${R.some(x=>!SRK.parse(x.r))?`<p class="note">पुराने नाम: ${R.filter(x=>!SRK.parse(x.r)).map(x=>`<button type="button" class="chip" data-srksel="${esc(x.r)}">${esc(x.r)} ${x.n}</button>`).join(" ")}</p>`:""}
  ${V.sel?rackDetail():""}
  <button type="button" class="big ghost srk-ab" data-srkaud aria-expanded="${V.aud}">🧭 सही जगह — बिखरा सामान एक जगह ${V.aud?"▲":"▼"}</button>${V.aud?audHTML():""}
  ${isOwn()?`<div class="srk-pb"><button type="button" class="big" data-srkall ${act().some(i=>SRK.norm(i.rack))?"":"disabled"}>🏷️ सारी भाव-पट्टी (${act().filter(i=>SRK.norm(i.rack)).length} सामान)</button>
    ${ch.length?`<button type="button" class="big ghost" data-srkch>🔁 भाव बदले — ${ch.length} पट्टी दोबारा छापें</button>`:""}
    <button type="button" class="big ghost" data-srkbdall>🪧 सारे ${MAP.length} रैक के बोर्ड (A4, बड़ा नंबर)</button>
    <button type="button" class="big ghost" data-srkstkall>🏷️ सारे ${SRK.total()} खानों के स्टिकर (TSC / A4)</button></div>`:""}
  <details class="srk-lg"><summary>नंबर का तरीका</summary><p class="note">11-23 = रैक 11 का खाना 23। हर रैक में गिनती ऊपर-बाएँ से, किताब पढ़ने जैसे — बाएँ से दाएँ, फिर नीचे की लाइन। 1–21 दुकान, 31–35 गोदाम (वहाँ पटरी गिनें, सबसे ऊपर = 1)। छोटी जगहें अलग रैक नहीं: पुराने 2 → 1-7/1-8, 3 → 12-5…8, 14 → 13-13/14, 16 → 10-5। फ्रिज-फ्रीज़र: 17 चॉकलेट फ्रिज, 18 डबल फ्रीज़र, 19 आइसक्रीम, 20 Coca-Cola, 21 सब्ज़ी-ब्रेड बेंच। गोदाम का फ़र्श खाली रहे।</p></details>`}
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
    if(g("[data-srkaud]")){V.aud=!V.aud;draw();return}
    if(g("[data-srkmv]")){SE.printA4("सामान सही जगह",SRK.moveHTML()).catch(()=>toast("प्रिंट नहीं हुआ"));return}
    if((b=g("[data-srkbd]"))){SRK.boards([+b.dataset.srkbd]);return}
    if(g("[data-srkbdall]")){SRK.boards();return}
    if(g("[data-srkstkall]")){SRK.stickers(MAP.flatMap(x=>SRK.codesOf(x[0])));return}
    if((b=g("[data-srkcount]"))){openCount(+b.dataset.srkcount);return}
    if(g("[data-srkall]")){SRK.print(act().filter(i=>SRK.norm(i.rack)),"खाने की भाव-पट्टी · सब");return}
    if(g("[data-srkch]")){SRK.print(SRK.changed(),"भाव बदले — नई पट्टी");return}
    if(g("[data-srkcam]")){if(typeof camOn==="function")camOn();return}};
  sh.oninput=e=>{const t=e.target;if(t.id==="srkR"){const v=SRK.norm(t.value);if(v!==t.value)t.value=v;V.rack=v;LSr.set("srk_cur",v);const n=$("#srkInfo");if(n)n.innerHTML=codeInfo();const h=$("#srkHits");if(h)h.innerHTML=hits(V.q).map(i=>row(i,setBtn(i))).join("");return}
    if(t.id==="srkQ"){V.q=t.value;const h=$("#srkHits");if(h)h.innerHTML=hits(V.q).map(i=>row(i,setBtn(i))).join("")}};
  sh.onkeydown=e=>{if(e.key==="Enter"&&e.target.id==="srkQ"){const v=e.target.value.trim(),it=findByCode(v)||hits(v)[0];if(it){e.preventDefault();assign(it.id)}}}};
SRK.settingsHTML=function(){if(!isOwn())return "";const none=act().filter(i=>!SRK.norm(i.rack)).length,ch=SRK.changed().length,T=SRK.today(),filled=MAP.reduce((a,x)=>a+fill(x[0]),0);
  return `<div class="card2" id="srkCard"><h3 style="margin:0 0 4px">📍 रैक-खाना व्यवस्था</h3>
  <p class="note" style="margin:0 0 8px">जगह लगी: <b>${act().length-none}</b> · बाकी: <b>${none}</b> · खाने भरे: <b>${filled}/${SRK.total()}</b>${ch?` · 🔁 भाव बदले: <b>${ch}</b>`:""}${RK[T]?` · 🔢 आज गिनें: <b>रैक ${T}</b>`:""}</p>
  <div class="srk-pb"><button type="button" class="pri" data-srkopen>📍 जगह लगाएँ · खाना खोजें · स्टिकर</button></div></div>`};
function refreshCard(){const c=$("#srkCard");if(c)c.outerHTML=SRK.settingsHTML()}
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
.srk-ab{margin-top:10px}.srk-au{border:1.5px solid var(--line);border-radius:14px;padding:8px;margin-top:6px}.srk-ag{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--line);font-size:12.5px}.srk-ag b{min-width:120px}.srk-ag i{font-style:normal;font-weight:700;color:#b45309}.srk-ag.bad b{color:#b91c1c}
.srk-mv{margin:8px 0;font-size:12.5px;max-height:320px;overflow:auto}.srk-mv div{padding:3px 0;border-bottom:1px dashed var(--line)}.srk-mv code{font:700 12px monospace;color:#b45309}
.srk-kh{display:grid;grid-template-columns:52px 1fr;gap:6px;padding:3px 0;border-bottom:1px solid var(--line);font-size:12.5px;align-items:start}.srk-kh code{font:800 13px monospace}.srk-kh.e{opacity:.55}.srk-kh span{display:inline-flex;align-items:center;gap:2px;margin:0 6px 2px 0}.srk-kh span button{border:0;background:none;color:var(--muted);font-size:11px;padding:0 2px}.srk-pb2{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}`;
document.head.appendChild(css);
})();
