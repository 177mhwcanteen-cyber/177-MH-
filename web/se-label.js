/* 177 MH कैंटीन — 🏷️ बारकोड छपाई (se-label.js)
   • छापने की लिस्ट: नाम/कोड लिखो या पुराना लेबल/पैकेट स्कैन करो → हर सामान के आगे संख्या → एक बटन से सब छपें
   • बिलिंग में "✏️ भाव बदलें" के पास "🏷️ बारकोड छापें": सामान दबाओ → कितने → "अभी छापें" या "लिस्ट में जोड़ें"
   • सामान की सेटिंग और बाज़ार खरीद में भी 🏷️ बटन
   • ⚙️ सेटिंग → 🎨 लेबल डिज़ाइन: दुकान का नाम, 6 डिज़ाइन, हर चीज़ चालू/बंद (बारकोड हमेशा), लाइव झलक — सब फोन पर एक जैसा
   • बारकोड: पूरे-पूरे डॉट (2-4 डॉट मॉड्यूल), दोनों तरफ़ खाली जगह (quiet zone), लंबी बार, मोटे अंक — गन/कैमरा झट से पढ़ें
   नियम: docs/बारकोड-छपाई-प्रॉम्प्ट.txt
   मुख्य ऐप (index.html) के S, $, esc, rs, item, toast, tileHTML, findByCode, beep… और SF (se-features) इस्तेमाल करता है। */
(function(){
"use strict";
const SL=window.SL={};
const LSl={get:k=>{try{return localStorage.getItem(k)||""}catch(e){return ""}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const num=v=>{const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)?n:0};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const F='"Baloo 2","Mukta","Noto Sans Devanagari",sans-serif';
const SZ=()=>(window.SF&&SF.SIZES)||{"50x25":[50,25]};
const sizeKey=()=>{const k=LSl.get("se_lsize")||"50x25";return SZ()[k]?k:"50x25"};
const fmtP=n=>{n=Math.round(n*100)/100;return Number.isInteger(n)?String(n):n.toFixed(2)};
const sd=s=>{if(!s)return "";const p=String(s).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0].slice(2):String(s)};

/* ================= सेटिंग (settings/main.lbl — सब फोन पर एक जैसी) ================= */
const STYLES=[["classic","क्लासिक"],["band","काली पट्टी"],["tag","प्राइस टैग"],["frame","फ्रेम"],["bigprice","बड़ा भाव"],["minimal","सादा"]];
const SHOW=[["shop","🏪 दुकान का नाम"],["name","📝 सामान का नाम"],["price","₹ भाव"],["rack","📍 रैक-खाना"],["mrp","MRP (कटा हुआ)"],["size","⚖️ मात्रा / ml"],["code","# सामान कोड"],["brand","🏭 कंपनी का नाम"],["mfg","📅 पैकिंग तारीख"],["exp","⏳ एक्सपायरी"],["digits","🔢 बारकोड के अंक"],["qr","📱 QR कोड भी"],["extra","💬 नीचे की लाइन"],["caps","🔠 नाम CAPITAL में"]];
const DEF={shop:"177 MH वेट कैंटीन · बाड़मेर",style:"classic",extra:"धन्यवाद · फिर पधारें",
  show:{shop:1,name:1,price:1,rack:1,mrp:0,size:0,code:0,brand:0,mfg:0,exp:0,digits:1,qr:0,extra:0,caps:0}};
SL.STYLES=STYLES;SL.SHOW=SHOW;
SL.cfg=function(){const s=(S.settings&&S.settings.lbl)||{};return {...DEF,...s,show:{...DEF.show,...(s.show||{})}}};
let saveT=0;
SL.save=function(patch){
  const cur=SL.cfg(),c={...cur,...patch,show:{...cur.show,...(patch.show||{})}};
  S.settings={...(S.settings||{}),lbl:c};
  clearTimeout(saveT);saveT=setTimeout(async()=>{try{if(!S.demo&&S.db)await S.db.doc("settings/main").set({lbl:c},{merge:true});toast("✓ लेबल डिज़ाइन सेव — सब फोन पर यही छपेगा")}
    catch(e){toast("सेव नहीं हुआ — डिज़ाइन सिर्फ़ विक्रम जी बदल सकते हैं")}},450);
};

/* ================= सामान → लेबल की बातें ================= */
/* नाम के आख़िर का साइज़ (240ml, 1kg…) अलग — "मात्रा" चालू हो तभी छपे */
const SIZE_RE=/\s*[-–(]?\s*\d+(?:[.,]\d+)?\s*(?:ml|ltr|lt|l|gms?|grm|g|kgs?|pcs?|nos|मि\.?\s?ली\.?|ली\.?|ग्राम|किलो|पीस)\.?\s*\)?\s*$/i;
function nameParts(it){
  const nm=SE.capNm(String(it.short||it.name||"").trim());/* 🔠 CAPITAL *//* पूरा नाम — लंबा हो तो लेबल पर 2 लाइन में */const m=nm.match(SIZE_RE);
  const plain=m&&nm.replace(SIZE_RE,"").trim()?nm.replace(SIZE_RE,"").trim():nm;
  const size=String(it.size||it.pack||"").trim()||(m?m[0].replace(/[()\-–]/g,"").trim():"");
  return {plain,size};
}
SL.dataOf=function(it,o){o=o||{};const p=nameParts(it);
  return {it,name:p.plain,size:p.size,price:num(o.price)||+it.sale||0,mrp:+it.mrp||0,code:String(it.code||""),brand:String(it.brand||"").trim(),
    rack:String(it.rack||"").trim().toUpperCase(),mrpOn:!!o.mrp,mfg:o.mfg||today(),exp:o.exp||it.exp||"",bc:window.SF&&SF.itemCode?SF.itemCode(it):String(it.barcode||"").split(",")[0].trim()}};

/* ================= बारकोड (स्कैन होने लायक पक्का) ================= */
function ean13ok(c){if(!/^\d{13}$/.test(c))return false;let s=0;for(let i=0;i<12;i++)s+=(+c[i])*(i%2?3:1);return (10-s%10)%10===+c[12]}
function ean8ok(c){if(!/^\d{8}$/.test(c))return false;let s=0;for(let i=0;i<7;i++)s+=(+c[i])*(i%2?1:3);return (10-s%10)%10===+c[7]}
const barFmt=c=>ean13ok(c)?"EAN13":(/^\d{12}$/.test(c)&&ean13ok("0"+c))?"UPC":ean8ok(c)?"EAN8":"CODE128";
SL.barFmt=barFmt;
/* मॉड्यूल = पूरे डॉट (4→1, जो चौड़ाई में आए उनमें सबसे मोटा) + नियम वाली खाली जगह (quiet zone) दोनों तरफ़:
   EAN-13 बाएँ 11 / दाएँ 7 · UPC-A 9/9 · EAN-8 7/7 · Code-128 10/10 मॉड्यूल — कभी खिंचाव/धुंधलापन नहीं, गन पहली बार में पढ़े */
const QZ={EAN13:[11,7],UPC:[9,9],EAN8:[7,7],CODE128:[10,10]};
SL.barCanvas=function(code,maxW,barH,digits,fontPx,maxM){
  if(!window.JsBarcode||!code)return null;const fmt=barFmt(code),[qL,qR]=QZ[fmt];
  const mk=(m,ml,mr)=>{const c=document.createElement("canvas");
    JsBarcode(c,code,{format:fmt,width:m,height:Math.max(16,Math.round(barH)),displayValue:!!digits,font:"monospace",fontOptions:"bold",fontSize:fontPx,
      textMargin:Math.max(1,Math.round(fontPx*.1)),margin:0,marginLeft:ml,marginRight:mr,background:"#ffffff",lineColor:"#000000",flat:!digits});return c};
  const edges=c=>{const x=c.getContext("2d"),W=c.width,d=x.getImageData(0,0,W,Math.min(c.height,8)).data;let a=W,b=-1;
    for(let y=0;y<Math.min(c.height,8);y++)for(let i=0;i<W;i++)if(d[(y*W+i)*4]<128){if(i<a)a=i;if(i>b)b=i}return [a,W-1-b]};
  for(let m=maxM||4;m>=1;m--){let c;try{c=mk(m,0,0);const [l,r]=edges(c);/* लाइब्रेरी अंकों के लिए जो जगह खुद छोड़ती है, उसे गिनकर बाकी जोड़ो */
      const ml=Math.max(0,qL*m-l),mr=Math.max(0,qR*m-r);if(ml||mr)c=mk(m,ml,mr)}catch(e){return null}
    if(c.width<=maxW||m===1)return {c,m,fmt}}
  return null};
function qrMatrix(text){if(!window.QRCode||!text)return null;
  try{const d=document.createElement("div");const q=new QRCode(d,{text,width:64,height:64,correctLevel:QRCode.CorrectLevel.M});const m=q&&q._oQRCode;if(!m)return null;
    return {n:m.getModuleCount(),dark:(r,c)=>m.isDark(r,c)}}catch(e){return null}}

/* ================= लेबल बनाना (थर्मल: सिर्फ़ काला-सफ़ेद, 8 डॉट = 1 mm) ================= */
SL.draw=function(d,cfg,sk){
  cfg=cfg||SL.cfg();sk=sk&&SZ()[sk]?sk:sizeKey();const [wmm,hmm]=SZ()[sk];
  const st=cfg.style,sh=cfg.show,frame=st==="frame";
  const W=wmm*8,H=hmm*8,U=Math.min(H/200,W/400*1.25);
  const PX=frame?28:24,PT=frame?26:16,PB=frame?22:13;/* 3 mm बाएँ-दाएँ, 2 mm ऊपर — कुछ भी किनारे से न कटे */
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,W,H);x.fillStyle="#000";x.textBaseline="middle";
  const shop=sh.shop&&cfg.shop?String(cfg.shop).trim():"",brand=sh.brand&&d.brand?d.brand:"",extra=sh.extra&&cfg.extra?String(cfg.extra).trim():"";
  const name=sh.name&&d.name?(sh.caps?d.name.toLocaleUpperCase("en-IN"):d.name):"";
  const meta=[sh.rack&&d.rack&&"रैक "+d.rack,sh.size&&d.size,sh.code&&d.code&&"#"+d.code].filter(Boolean).join("  ·  ");
  const price=sh.price&&d.price>0?"₹"+fmtP(d.price):"",mrp=(sh.mrp||d.mrpOn)&&d.mrp>d.price?"MRP ₹"+fmtP(d.mrp):"";
  const dates=[sh.mfg&&d.mfg?"पैक: "+sd(d.mfg):"",sh.exp&&d.exp?"एक्सपायरी: "+sd(d.exp):""].filter(Boolean).join("    ");
  const X0=PX;let X1=W-PX;
  const fitF=(t,px,maxW,w)=>{let s=Math.max(9,Math.round(px));for(;s>9;s--){x.font=`${w} ${s}px ${F}`;if(x.measureText(t).width<=maxW)break}x.font=`${w} ${s}px ${F}`;return s};
  const txt=(t,yc,px,w,a,b,al)=>{const s=fitF(t,px,b-a,w),tw=x.measureText(t).width,tx=al==="l"?a:al==="r"?b-tw:(a+b-tw)/2;x.fillText(t,Math.round(tx),Math.round(yc));return {s,tw,tx}};
  const strike=(r,yc)=>x.fillRect(Math.round(r.tx),Math.round(yc),Math.round(r.tw),Math.max(2,Math.round(r.s/11)));
  const rr=(a,b,w,h,r)=>{r=Math.min(r,h/2,w/2);x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()};
  const two=(t,px,w,maxW)=>{x.font=`${w} ${Math.round(px)}px ${F}`;if(x.measureText(t).width<=maxW*1.15||!/\s/.test(t))return [t];
    const ws=t.split(/\s+/);let best=null;for(let i=1;i<ws.length;i++){const a=ws.slice(0,i).join(" "),b=ws.slice(i).join(" ");const m=Math.max(x.measureText(a).width,x.measureText(b).width);if(!best||m<best.m)best={a,b,m}}return [best.a,best.b]};
  /* --- पंक्तियाँ: {h, draw(y,h)} — जगह कम हो तो सब एक साथ छोटी होती हैं, बारकोड को हमेशा पूरी जगह --- */
  const R={
    text:(t,px,w,al,o)=>({h:px,draw(y,h){const yc=y+h/2,r=txt(t,yc,h*.96,w,X0,X1,al||"c");if(o&&o.strike)strike(r,yc)}}),
    rule:()=>({h:Math.max(3,Math.round(4*U)),fixed:1,draw(y,h){x.fillRect(X0,Math.round(y+h/2-1),X1-X0,2)}}),
    name:(px,al)=>{const L=two(name,px,800,X1-X0);return {h:L.length>1?px*1.62:px,draw(y,h){const lh=h/L.length;L.forEach((l,i)=>txt(l,y+lh*(i+.5),L.length>1?lh*1.02:lh*.97,800,X0,X1,al||"c"))}}},
    price:(px,al)=>({h:px,draw(y,h){const yc=y+h/2;let s=Math.round(h*.98);const ms=()=>Math.round(s*.46);
      const wid=()=>{x.font=`800 ${s}px ${F}`;let w=x.measureText(price).width;if(mrp){x.font=`700 ${ms()}px ${F}`;w+=x.measureText(mrp).width+s*.35}return w};
      while(s>10&&wid()>X1-X0)s--;const tw=wid();let a=al==="l"?X0:al==="r"?X1-tw:(X0+X1-tw)/2;
      if(mrp){x.font=`700 ${ms()}px ${F}`;const mw=x.measureText(mrp).width,my=yc+s*.12;x.fillText(mrp,Math.round(a),Math.round(my));x.fillRect(Math.round(a),Math.round(my),Math.round(mw),Math.max(2,Math.round(ms()/10)));a+=mw+s*.35}
      x.font=`800 ${s}px ${F}`;x.fillText(price,Math.round(a),Math.round(yc))}}),
    split:(a,b,px,wa,wb,o)=>({h:px,draw(y,h){const yc=y+h/2;let bw=0;
      if(b){const s=fitF(b,h*.97,(X1-X0)*.5,wb);bw=x.measureText(b).width;const bx=X1-bw;x.fillText(b,Math.round(bx),Math.round(yc));if(o&&o.strikeB)strike({tx:bx,tw:bw,s},yc)}
      if(a)txt(a,yc,(o&&o.ha?o.ha:1)*h*.97,wa,X0,X1-bw-(b?Math.round(10*U):0),"l")}}),
    band:(t,px)=>({h:px,draw(y,h){x.save();rr(X0-6,y,X1-X0+12,h,Math.round(h*.3));x.fill();x.fillStyle="#fff";txt(t,y+h/2,h*.72,800,X0+6,X1-6,"c");x.restore()}}),
    tag:(px)=>({h:px,draw(y,h){let cx=X0;
      if(price){let s=Math.round(h*(mrp?.5:.6));x.font=`800 ${s}px ${F}`;while(s>10&&x.measureText(price).width>(X1-X0)*.4){s--;x.font=`800 ${s}px ${F}`}
        const pw=x.measureText(price).width,bw=Math.round(pw+s*.55);x.save();rr(X0,y,bw,h,Math.round(h*.2));x.fill();x.fillStyle="#fff";
        x.fillText(price,Math.round(X0+(bw-pw)/2),Math.round(y+(mrp?h*.4:h/2)));
        if(mrp){const r=txt(mrp,y+h*.8,h*.22,700,X0+4,X0+bw-4,"c");x.fillRect(Math.round(r.tx),Math.round(y+h*.8),Math.round(r.tw),2)}x.restore();cx=X0+bw+Math.round(10*U)}
      const col=[];if(brand)col.push({t:[brand],p:.22,w:600});if(name){const L=two(name,h*.36,800,X1-cx);col.push({t:L,p:L.length>1?.6:.42,w:800})}if(meta)col.push({t:[meta],p:.22,w:700});
      const tot=col.reduce((a,c)=>a+c.p,0)||1;let yy=y;col.forEach(c=>{const ch=h*c.p/tot,lh=ch/c.t.length;c.t.forEach((l,i)=>txt(l,yy+lh*(i+.5),Math.min(lh*.98,h*(col.length===1&&c.t.length===1?.5:.4)),c.w,cx,X1,"l"));yy+=ch})}}),
  };
  const rows=[];
  if(st==="band"){
    if(shop)rows.push(R.band(shop,24*U));if(brand)rows.push(R.text(brand,13*U,600,"l"));
    let mrpDone=false;
    if(name&&price){x.font=`800 ${Math.round(30*U)}px ${F}`;if(x.measureText(name).width<(X1-X0)*.8)rows.push(R.split(name,price,30*U,800,800));else{rows.push(R.name(28*U,"l"));rows.push(R.price(28*U,"r"));mrpDone=true}}
    else if(name)rows.push(R.name(30*U,"l"));else if(price){rows.push(R.price(30*U,"r"));mrpDone=true}
    if(meta||(mrp&&!mrpDone))rows.push(R.split(meta,mrpDone?"":mrp,14*U,700,700,{strikeB:1}));
  }else if(st==="tag"){
    if(shop){rows.push(R.text(shop,15*U,700,"l"));rows.push(R.rule())}
    if(name||price||brand||meta)rows.push(R.tag((brand||meta?50:44)*U));
  }else if(st==="minimal"){
    if(shop)rows.push(R.text(shop,13*U,600,"c"));
    if(name||price)rows.push(R.split(name,price,26*U,800,800));
    if(brand||meta||mrp)rows.push(R.split([brand,meta].filter(Boolean).join("  ·  "),mrp,13*U,700,700,{strikeB:1}));
  }else if(st==="bigprice"){
    if(shop)rows.push(R.text(shop,14*U,700,"c"));if(brand)rows.push(R.text(brand,12*U,600,"c"));
    if(name)rows.push(R.name(21*U,"c"));if(meta)rows.push(R.text(meta,13*U,700,"c"));if(price)rows.push(R.price(50*U,"c"));
  }else{/* classic / frame */
    if(shop){rows.push(R.text(frame?"✦ "+shop+" ✦":shop,(frame?16:17)*U,700,"c"));if(!frame)rows.push(R.rule())}
    if(brand)rows.push(R.text(brand,13*U,600,"c"));if(name)rows.push(R.name(30*U,"c"));if(meta)rows.push(R.text(meta,14*U,700,"c"));
    if(price)rows.push(R.price(30*U,"c"));
  }
  if(dates)rows.push(R.text(dates,14*U,700,"c"));if(extra)rows.push(R.text(extra,13*U,600,"c"));
  /* --- जगह बाँटो --- */
  const avail=H-PT-PB;let gap=Math.max(2,Math.round(3*U));
  const digPx=sh.digits?Math.max(15,Math.round(19*U)):0,digH=digPx?digPx+Math.max(1,Math.round(digPx*.1)):0;
  const barMin=Math.max(40,Math.round(54*U)),barMax=Math.round(118*U);
  const want=rows.reduce((a,r)=>a+r.h,0)+gap*rows.length;
  /* बहुत कुछ चालू हो तो: पहले लिखाई छोटी (कम से कम ~1.3 mm), फिर ही बार थोड़ी छोटी (कम से कम 5 mm) — कुछ भी एक-दूसरे पर न चढ़े */
  const fixedH=rows.filter(r=>r.fixed).reduce((a,r)=>a+r.h,0)+gap*rows.length,flex=Math.max(1,want-fixedH);
  const barFloor=Math.max(40,Math.round(40*U));
  let f=Math.min(1,(avail-(d.bc?barMin+digH+2:0)-fixedH)/flex);
  if(f<.5){gap=1;const fx=rows.filter(r=>r.fixed).reduce((a,r)=>a+r.h,0)+gap*rows.length;f=Math.max(.3,(avail-(d.bc?barFloor+digH+2:0)-fx)/flex)}
  f=Math.min(1,f);
  rows.forEach(r=>{if(!r.fixed)r.h=Math.max(10,Math.round(r.h*f))});
  const used=rows.reduce((a,r)=>a+r.h,0)+gap*rows.length;
  const bcBlock=d.bc?Math.max(Math.min(barFloor+digH,avail-used),30+digH,Math.min(barMax+digH,avail-used)):0;
  const topH=avail-bcBlock;
  /* --- QR (चालू हो तो): ऊपर दाएँ, पूरे डॉट --- */
  let qrDrawn=0;
  if(sh.qr&&d.bc&&topH>40){const M=qrMatrix(d.bc);if(M){const side=Math.min(topH-4,Math.round((W-2*PX)*.3));const ms=Math.floor(side/(M.n+2));
    if(ms>=2){const qs=ms*M.n,qx=X1-qs-ms,qy=PT+Math.round((topH-qs)/2);X1=qx-Math.round(8*U);
      for(let r=0;r<M.n;r++)for(let c=0;c<M.n;c++)if(M.dark(r,c))x.fillRect(qx+c*ms,qy+r*ms,ms,ms);qrDrawn=1}}}
  /* --- ऊपर की लिखाई --- */
  const spare=Math.max(0,topH-used),sp=rows.length?Math.min(spare/(rows.length+1),12*U):0;
  let y=PT+sp+(rows.length?Math.max(0,spare-sp*(rows.length+1))/2:0);
  let topEnd=PT;rows.forEach(r=>{r.draw(Math.round(y),r.h);topEnd=Math.round(y+r.h);y+=r.h+gap+sp});cv._top=topEnd;
  /* --- बारकोड: बीच में, नीचे, कभी स्केल नहीं (बार साफ़-धारदार) --- */
  if(d.bc){const bm=SL.barCanvas(d.bc,W-2*PX,bcBlock-digH,digPx>0,digPx,4);
    if(bm){x.imageSmoothingEnabled=false;const bx=Math.round((W-bm.c.width)/2),by=H-PB-bm.c.height;x.drawImage(bm.c,bx,by);cv._bc={x:bx,y:by,w:bm.c.width,h:bm.c.height,m:bm.m,fmt:bm.fmt}}
    else{x.font=`700 ${Math.round(14*U)}px ${F}`;x.fillText(d.bc,X0,H-PB-bcBlock/2)}}
  if(frame){x.lineWidth=3;rr(17,16,W-34,H-32,Math.round(14*U));x.stroke()}/* फ्रेम 2 mm अंदर, पतली पक्की लाइन */
  cv._qr=qrDrawn;return cv;
};
SL.canvasFor=(it,o,cfg,sk)=>SL.draw(SL.dataOf(it,o),cfg,sk);
/* दिखाने के लिए नमूना सामान */
SL.sample=function(){const q=Q.map(r=>item(r.id)).find(Boolean);if(q)return q;
  const k=(S.items||[]).find(i=>i.active!==false&&!i.virtual&&+i.sale>0&&String(i.barcode||"").trim());
  return k||{id:"_demo",name:"Nihar Badam Amla 240ml",short:"Nihar Badam Amla 240ml",size:"240ml",brand:"Marico",sale:72,mrp:80,code:"1001",barcode:"2000000100104",exp:""}};

/* ================= छापने की लिस्ट (हर फोन की अपनी) ================= */
let Q=[];try{Q=JSON.parse(LSl.get("se_lq")||"[]").filter(r=>r&&r.id)}catch(e){Q=[]}
const saveQ=()=>LSl.set("se_lq",JSON.stringify(Q));
const V={q:"",prev:"",flash:"",cam:false,done:0};
SL.list=()=>Q;
SL.count=()=>Q.reduce((a,r)=>a+(Math.max(0,Math.round(+r.n)||0)),0);
SL.add=function(id,n,o){n=Math.max(1,Math.min(500,Math.round(+n||1)));const i=Q.findIndex(x=>x.id===id);let r;
  if(i>=0){r=Q.splice(i,1)[0];r.n=Math.min(500,(Math.round(+r.n)||0)+n)}else r={id,n,...(o||{})};
  Q.unshift(r);V.prev=id;V.flash=id;V.done=0;saveQ();return r.n};
SL.clear=()=>{Q=[];V.prev="";V.done=0;saveQ()};

/* ================= छापना ================= */
SL.print=async function(rows){
  rows=(rows||Q).map(r=>({...r,it:item(r.id),n:Math.max(0,Math.round(+r.n)||0)})).filter(r=>r.it&&r.n>0);
  if(!rows.length){toast("पहले लिस्ट में सामान जोड़ें");return 0}
  const noBc=rows.find(r=>!SL.dataOf(r.it,r).bc);
  if(noBc){toast("⚠ "+noBc.it.name+" का बारकोड नहीं है — सेटिंग में बारकोड डालें या विक्रम जी एक बार ऐप खोलें");return 0}
  const total=rows.reduce((a,r)=>a+r.n,0);if(total>600){toast("एक बार में 600 लेबल तक — संख्या कम करें");return 0}
  try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch(e){}
  const sk=sizeKey(),[w,h]=SZ()[sk],cfg=SL.cfg(),how=LSl.get("se_lout")||"label";
  const jobs=rows.map(r=>({r,cv:SL.draw(SL.dataOf(r.it,r),cfg,sk)}));
  try{
    if(how==="a4"||!SE.isNative){const imgs=[];jobs.forEach(j=>{const u=j.cv.toDataURL("image/png");for(let i=0;i<j.r.n;i++)imgs.push(u)});
      if(how==="a4")await SE.printA4("बारकोड स्टिकर · "+total+" लेबल",`<style>.lg{display:flex;flex-wrap:wrap;gap:2mm}.lg img{width:${w}mm;height:${h}mm;border:0.2mm dashed #bbb}</style><div class="lg">${imgs.map(u=>`<img src="${u}">`).join("")}</div>`);
      else await SE.printA4("लेबल",`<style>@page{size:${w}mm ${h}mm;margin:0}body{margin:0}h1,.sub{display:none}img{width:${w}mm;height:${h}mm;display:block;page-break-after:always}</style>${imgs.map(u=>`<img src="${u}">`).join("")}`)}
    else{const pr=SF.labelPrinter;if(!pr.addr)throw {msg:"पहले \"रेट व सेटिंग\" में लेबल प्रिंटर चुनें"};let all="";
      for(const j of jobs){if(pr.type==="escpos"){const one=atob(SE.escpos(j.cv));for(let i=0;i<j.r.n;i++)all+=one}else all+=atob(SE.tspl(j.cv,{wmm:w,hmm:h,copies:j.r.n}))}
      await SENative.BtPrinter.print({address:pr.addr,data:btoa(all)})}
    toast("🏷️ "+total+" लेबल छप रहे हैं");
    if(!S.demo)S.db.collection("labelLog").doc("l"+uid()).set({batch:"list",items:rows.map(r=>({id:r.id,name:r.it.name,n:r.n})),copies:total,style:cfg.style,size:sk,date:today(),ts:Date.now(),by:S.uid||"",byName:biller()}).catch(()=>{});
    return total;
  }catch(e){toast(e.msg||("प्रिंट नहीं हुआ: "+(e.message||"")));return 0}
};

/* ================= 🏷️ टैब: लिस्ट ================= */
function hits(q){q=String(q||"").trim().toLowerCase();if(!q)return [];
  const byCode=findByCode(q);
  const L=S.items.filter(i=>i.active!==false&&!i.virtual&&(((i.name||"")+" "+(i.hi||"")+" "+(i.alias||"")+" "+(i.short||"")).toLowerCase().includes(q)||String(i.code||"")===q));
  if(byCode&&!L.includes(byCode))L.unshift(byCode);return L.slice(0,12)}
const hitsHTML=()=>hits(V.q).map(i=>`<button type="button" data-sladd="${esc(i.id)}">${tileHTML(i)}<span><b>${esc(SL.dataOf(i).name)}</b><small>${+i.sale>0?rs(+i.sale):"भाव नहीं"}${i.code?" · #"+esc(i.code):""}</small></span><em>＋</em></button>`).join("")||(V.q.trim()?`<p class="note" style="margin:4px 0">"${esc(V.q)}" नहीं मिला</p>`:"");
function rowHTML(r){const it=item(r.id);if(!it)return "";const d=SL.dataOf(it,r),sh=SL.cfg().show,id=esc(r.id);
  return `<div class="sl-row${V.flash===r.id?" flash":""}${V.prev===r.id?" sel":""}">
    <button type="button" class="sl-tl" data-slprev="${id}" aria-label="${esc(it.name)} की झलक">${tileHTML(it)}</button>
    <div class="sl-nm" data-slprev="${id}"><b>${esc(d.name)}</b><span>${d.price>0?rs(d.price):'<em>भाव नहीं</em>'}${it.code?" · #"+esc(it.code):""}${d.bc?"":' · <em>⚠ बारकोड नहीं</em>'}</span></div>
    <div class="sl-n"><button type="button" data-slm="${id}" aria-label="एक कम">−</button><input data-sln="${id}" inputmode="numeric" value="${Math.round(+r.n)||0}" aria-label="${esc(it.name)} के कितने लेबल"><button type="button" data-slp="${id}" aria-label="एक ज़्यादा">＋</button></div>
    <button type="button" class="sl-x" data-slx="${id}" aria-label="${esc(it.name)} हटाएँ">✕</button>
    ${sh.mfg||sh.exp?`<div class="sl-dt">${sh.mfg?`<label>पैक<input type="date" data-slmfg="${id}" value="${esc(r.mfg||today())}"></label>`:""}${sh.exp?`<label>एक्सपायरी<input type="date" data-slexp="${id}" value="${esc(r.exp||it.exp||"")}"></label>`:""}</div>`:""}</div>`}
const sumHTML=()=>Q.length?`<b>${Q.length} सामान · ${SL.count()} लेबल</b><button type="button" class="lnk" data-slclear>🗑️ लिस्ट खाली करें</button>`:"";
SL.render=function(force){
  const el=$("#p-label");if(!el)return;
  if(!force&&el.contains(document.activeElement)&&document.activeElement.matches("input")){SL.drawPrev();return}
  const Ls=SF.lblState?SF.lblState():null;if(Ls&&Ls.id){SL.add(Ls.id,1);Ls.id=""}/* नया सामान अभी जोड़ा → सीधा लिस्ट में */
  const sk=sizeKey(),n=SL.count(),cfg=SL.cfg(),out=LSl.get("se_lout")||"label";
  el.innerHTML=`<h2 class="sec">🏷️ बारकोड लेबल</h2>
  <div class="paym" style="margin:0 0 10px"><button data-ltype="kirana" aria-pressed="true">🛒 सामान · लिस्ट से</button><button data-ltype="sabzi" aria-pressed="false">🥬 सब्ज़ी-फल (वज़न)</button></div>
  <div class="card2 sl-box">
    <div class="sl-hd"><b>📋 छापने की लिस्ट</b><span class="note">नाम लिखें या पुराना लेबल/पैकेट स्कैन करें</span></div>
    <div class="sl-srch"><input id="slQ" type="search" value="${esc(V.q)}" placeholder="🔍 नाम / 4 अंक कोड / बारकोड" autocomplete="off" enterkeyhint="done" aria-label="लेबल के लिए सामान खोजें"><button type="button" class="scanbtn" data-slcam aria-label="कैमरे से स्कैन">📷</button></div>
    <div id="slHits" class="sl-hits">${hitsHTML()}</div>
    <div id="slList" class="sl-list">${Q.map(rowHTML).join("")||`<div class="sl-empty"><b>लिस्ट खाली है</b><span>① ऊपर नाम लिखें या बारकोड स्कैन करें → सामान जुड़ेगा<br>② हर सामान के आगे लिखें कितने लेबल<br>③ नीचे 🖨️ दबाएँ — सब एक साथ छपेंगे</span></div>`}</div>
    <div class="sl-sum" id="slSum">${sumHTML()}</div>
  </div>
  <div class="card2 sl-pv">
    <div class="sl-pvh"><b>👀 ऐसा छपेगा</b><span class="note">${esc((STYLES.find(s=>s[0]===cfg.style)||STYLES[0])[1])} डिज़ाइन</span></div>
    <div class="lprev"><canvas id="slPrev"></canvas></div>
    <div class="seg sl-sz">${Object.keys(SZ()).map(k=>`<button class="chip" data-slsize="${k}" aria-pressed="${sk===k}">${k.replace("x","×")}</button>`).join("")}</div>
    ${S.isOwner?`<div class="sl-sty">${STYLES.map(([k,v])=>`<button class="chip" data-slstyle="${k}" aria-pressed="${cfg.style===k}">${v}</button>`).join("")}</div>
    <p class="note" style="margin:0">दुकान का नाम, क्या-क्या छपे (MRP, मात्रा, तारीख, QR…) — <button type="button" class="lnk" data-slgoset>⚙️ लेबल डिज़ाइन खोलें ›</button></p>`:`<p class="note" style="margin:0">डिज़ाइन विक्रम जी सेटिंग में तय करते हैं।</p>`}
  </div>
  <div class="paym" style="margin:0 0 8px"><button data-lout="label" aria-pressed="${out==="label"}">🏷️ लेबल प्रिंटर</button><button data-lout="a4" aria-pressed="${out==="a4"}">📄 A4 स्टिकर शीट</button></div>
  <button class="big sl-go" data-slprint ${n?"":"disabled"}>🖨️ ${n?n+" लेबल छापें":"लिस्ट में सामान जोड़ें"}</button>
  ${V.done?`<div class="sl-done">✓ ${V.done} लेबल भेजे गए · <button type="button" class="lnk" data-slclear>लिस्ट खाली करें</button></div>`:""}
  <p class="note" style="margin:6px 0 12px;text-align:center">बिलिंग में यह लेबल स्कैन करते ही सामान बिल में जुड़ेगा।</p>
  ${SF.batchHTML?SF.batchHTML():""}${S.isOwner&&SF.kNewHTML?SF.kNewHTML():""}`;
  V.flash="";SL.drawPrev();
};
SL.drawPrev=function(){const cv=$("#slPrev");if(!cv)return;const it=item(V.prev)||SL.sample();const r=Q.find(x=>x.id===it.id)||{};
  const src=SL.canvasFor(it,r);cv.width=src.width;cv.height=src.height;cv.getContext("2d").drawImage(src,0,0)};
function sumUp(){const s=$("#slSum");if(s)s.innerHTML=sumHTML();const n=SL.count(),b=$("[data-slprint]");if(b){b.disabled=!n;b.textContent="🖨️ "+(n?n+" लेबल छापें":"लिस्ट में सामान जोड़ें")}}
function addFromTab(id,n){SL.add(id,n||1);V.q="";SL.render(1);
  setTimeout(()=>{const i=document.querySelector(`[data-sln="${CSS.escape(id)}"]`);if(i){i.focus();i.select()}},30)}
SL.bind=function(){
  const el=$("#p-label");if(!el||SL._b)return;SL._b=1;
  el.addEventListener("input",e=>{const t=e.target;
    if(t.id==="slQ"){V.q=t.value;const h=$("#slHits");if(h)h.innerHTML=hitsHTML();return}
    if(t.dataset.sln){const r=Q.find(x=>x.id===t.dataset.sln);if(r){r.n=Math.max(0,Math.min(500,Math.round(num(t.value))));saveQ();sumUp()}return}});
  el.addEventListener("change",e=>{const t=e.target,id=t.dataset.slmfg||t.dataset.slexp;if(!id)return;const r=Q.find(x=>x.id===id);if(!r)return;
    if(t.dataset.slmfg)r.mfg=t.value;else r.exp=t.value;saveQ();V.prev=id;SL.drawPrev()});
  el.addEventListener("keydown",e=>{if(e.key!=="Enter")return;const t=e.target;
    if(t.id==="slQ"){const v=t.value.trim();if(!v)return;e.preventDefault();
      if(/^\d{6,}$/.test(v)){t.value="";V.q="";SL.scan(v);return}
      const H=hits(v);if(H.length===1||(H.length&&findByCode(v)===H[0]))addFromTab(H[0].id);else toast(H.length?H.length+" मिले — सही वाला दबाएँ":"नहीं मिला");return}
    if(t.dataset.sln){e.preventDefault();const q=$("#slQ");if(q){q.focus();q.select()}}});
  el.addEventListener("click",async e=>{const T=e.target,c=s=>T.closest(s);let b;
    if((b=c("[data-sladd]"))){addFromTab(b.dataset.sladd);return}
    if((b=c("[data-slp]"))||(b=c("[data-slm]"))){const id=b.dataset.slp||b.dataset.slm,r=Q.find(x=>x.id===id);if(!r)return;r.n=Math.max(0,Math.min(500,(Math.round(+r.n)||0)+(b.dataset.slp?1:-1)));saveQ();
      const i=el.querySelector(`[data-sln="${CSS.escape(id)}"]`);if(i)i.value=r.n;sumUp();return}
    if((b=c("[data-slx]"))){Q=Q.filter(x=>x.id!==b.dataset.slx);if(V.prev===b.dataset.slx)V.prev="";saveQ();SL.render(1);return}
    if((b=c("[data-slprev]"))){V.prev=b.dataset.slprev;el.querySelectorAll(".sl-row.sel").forEach(x=>x.classList.remove("sel"));const row=b.closest(".sl-row");if(row)row.classList.add("sel");SL.drawPrev();return}
    if(c("[data-slclear]")){SL.clear();SL.render(1);toast("लिस्ट खाली");return}
    if((b=c("[data-slsize]"))){LSl.set("se_lsize",b.dataset.slsize);SL.render(1);return}
    if((b=c("[data-slstyle]"))){SL.save({style:b.dataset.slstyle});SL.render(1);return}
    if(c("[data-slgoset]")){S.tab="set";showTab();setTimeout(()=>{const s=$("#slDesign");if(s)s.scrollIntoView({block:"start"})},80);return}
    if(c("[data-slcam]")){V.cam=true;if(typeof camOn==="function")camOn();return}
    if((b=c("[data-slprint]"))){b.disabled=true;const n=await SL.print();b.disabled=false;if(n){V.done=n;SL.render(1)}return}
  });
};
SL.wantCam=()=>V.cam;

/* ================= स्कैन (गन/कैमरा): लेबल टैब में, या बिलिंग के 🏷️ मोड में ================= */
SL.scan=function(code){
  const onL=S.tab==="label"&&!(SF.lblState&&SF.lblState().type==="sabzi"),onB=S.tab==="bill"&&S.lblMode&&!S.scanIn;
  if(!onL&&!onB)return false;
  let it=findByCode(code);if(!it&&SF.parseVW){const v=SF.parseVW(code);if(v&&v.it)it=v.it}
  beep(!!it);if(!it){toast("यह बारकोड किसी सामान में नहीं: "+code);return true}
  if(onB){SL.tap(it,1);return true}
  const n=SL.add(it.id,1);V.q="";SL.render(1);
  toast("🏷️ "+SL.dataOf(it).name+" · "+n+" लेबल (लिस्ट में "+Q.length+" सामान)");return true;
};

/* ================= बिलिंग: "🏷️ बारकोड छापें" — बिक्री जैसा: सामान दबाओ = +1 लेबल =================
   कोई बड़ा पॉपअप नहीं। हेडर में एक पतली पट्टी: आख़िरी सामान · [− संख्या ＋] · 📋 लिस्ट · ✕ — कीबोर्ड खुलने पर भी दिखे। */
SL.chipHTML=function(){const n=SL.count();setTimeout(()=>{SL.syncBar(1);SL.marks()},0);
  return `<button class="chip lblchip${S.lblMode?" on":""}" data-lblmode>${S.lblMode?"🏷️ बारकोड मोड · बंद ✕":"🏷️ बारकोड छापें"}${n&&!S.lblMode?` <i>${n}</i>`:""}</button>`};
SL.tap=function(it,n){if(!it||it.virtual)return;SL.add(it.id,n||1);V.last=it.id;try{if(navigator.vibrate)navigator.vibrate(20)}catch(e){}SL.syncBar(1);SL.marks()};
/* कार्ड पर 🏷️ गिनती */
SL.marks=function(){const g=$("#grid");if(!g)return;g.querySelectorAll(".lbub").forEach(x=>x.remove());if(!(S.tab==="bill"&&S.lblMode))return;
  Q.forEach(r=>{const c=g.querySelector(`[data-item="${CSS.escape(r.id)}"]`);if(c&&r.n>0){const s=document.createElement("span");s.className="lbub";s.textContent="🏷️"+r.n;c.appendChild(s)}})};
SL.syncBar=function(keep){const sb=$("#sbar");if(!sb)return;let b=$("#lblbar");
  if(!b){b=document.createElement("div");b.id="lblbar";b.className="lblbar";sb.parentNode.insertBefore(b,sb.nextSibling);bindBar(b)}
  const on=S.tab==="bill"&&!!S.lblMode;b.hidden=!on;document.documentElement.classList.toggle("lblon",on);if(!on){V.last="";return}
  if(keep&&b.contains(document.activeElement)&&document.activeElement.id==="lbN"){const r=Q.find(x=>x.id===V.last);const g=b.querySelector(".lb-go");if(g)g.innerHTML=`📋 ${Q.length}·${SL.count()} ›`;return}
  const it=item(V.last),r=it&&Q.find(x=>x.id===it.id),n=SL.count();
  b.innerHTML=`<span class="lb-ic">🏷️</span>${r?`<b class="lb-nm">${esc(SL.dataOf(it).name)}</b><span class="lb-n"><button type="button" data-lbm aria-label="एक कम">−</button><input id="lbN" inputmode="numeric" enterkeyhint="done" value="${r.n}" aria-label="कितने लेबल"><button type="button" data-lbp aria-label="एक ज़्यादा">＋</button></span>`
    :`<b class="lb-nm lb-hint">सामान दबाएँ या स्कैन करें — हर बार +1</b>`}
    <button type="button" class="lb-go" data-lblgo ${n?"":"disabled"} aria-label="लेबल की लिस्ट खोलें और छापें">📋 ${Q.length}·${n} ›</button><button type="button" class="lb-x" data-lbloff aria-label="बारकोड मोड बंद करें">✕</button>`};
function bindBar(b){
  b.addEventListener("click",e=>{const c=s=>e.target.closest(s);
    if(c("[data-lbloff]")){S.lblMode=false;renderBill();return}
    if(c("[data-lblgo]")){S.tab="label";showTab();return}
    const p=c("[data-lbp]"),m=c("[data-lbm]");if(p||m){const r=Q.find(x=>x.id===V.last);if(!r)return;r.n=Math.max(0,Math.min(500,(+r.n||0)+(p?1:-1)));
      if(!r.n){Q=Q.filter(x=>x!==r);V.last=""}saveQ();SL.syncBar();SL.marks()}});
  b.addEventListener("input",e=>{if(e.target.id!=="lbN")return;const r=Q.find(x=>x.id===V.last);if(!r)return;r.n=Math.max(0,Math.min(500,Math.round(num(e.target.value))));saveQ();SL.syncBar(1);SL.marks()});
  b.addEventListener("keydown",e=>{if(e.target.id==="lbN"&&e.key==="Enter"){e.preventDefault();const r=Q.find(x=>x.id===V.last);if(r&&!r.n){Q=Q.filter(x=>x!==r);saveQ()}e.target.blur();SL.syncBar();SL.marks()}});
}
/* छोटा पॉपअप (सेटिंग/कहीं से एक सामान): नाम · [− n ＋] · 1/5/10/20 · अभी छापें / जोड़ें — कोई बड़ी तस्वीर नहीं */
SL.ask=function(it){if(!it||it.virtual)return;
  const d=SL.dataOf(it,{}),hd=$("header"),top=hd?Math.max(8,Math.round(hd.getBoundingClientRect().bottom)+6):60;
  const inQ=(Q.find(r=>r.id===it.id)||{}).n||0;
  $("#sheet").innerHTML=`<div class="qscrim" data-close></div><div class="qpop sl-ask" style="top:${Math.min(top,140)}px" role="dialog" aria-label="${esc(it.name)} के बारकोड लेबल">
    <div class="sl-ah"><b>🏷️ ${esc(d.name)}</b><span>${d.price>0?rs(d.price):"⚠ भाव नहीं"}${inQ?" · लिस्ट में "+inQ:""}${d.bc?"":" · ⚠ बारकोड नहीं"}</span><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <div class="sl-ar"><span class="lb-n"><button type="button" data-slqm aria-label="एक कम">−</button><input id="slAskN" inputmode="numeric" enterkeyhint="done" autocomplete="off" value="1" aria-label="कितने लेबल"><button type="button" data-slqp aria-label="एक ज़्यादा">＋</button></span>
      ${[5,10,20,50].map(k=>`<button type="button" class="sl-k" data-slqk="${k}">${k}</button>`).join("")}</div>
    <div class="sl-ar"><button class="big ghost" data-slnow ${d.bc?"":"disabled"}>🖨️ अभी छापें</button><button class="big" data-sladdq>＋ लिस्ट में</button></div></div>`;
  const I=$("#slAskN"),N=()=>Math.max(1,Math.min(500,Math.round(num(I.value))||1));
  const addQ=()=>{const n=N();const t=SL.add(it.id,n);closeSheet();if(S.tab==="bill"){V.last=it.id;SL.syncBar();SL.marks()}else if(S.tab==="label")SL.render(1);toast("🏷️ "+d.name+" · "+t+" लेबल लिस्ट में")};
  $("#sheet").onclick=async e=>{const c=s=>e.target.closest(s);let b;
    if(c("[data-close]")){closeSheet();return}
    if((b=c("[data-slqk]"))){I.value=b.dataset.slqk;return}
    if(c("[data-slqp]")){I.value=N()+1;return}if(c("[data-slqm]")){I.value=Math.max(1,N()-1);return}
    if(c("[data-sladdq]")){addQ();return}
    if((b=c("[data-slnow]"))){b.disabled=true;const n=await SL.print([{id:it.id,n:N()}]);b.disabled=false;if(n)closeSheet()}};
  $("#sheet").onkeydown=e=>{if(e.key==="Enter"&&e.target===I){e.preventDefault();addQ()}if(e.key==="Escape")closeSheet()};
};
function bindBill(){const pb=$("#p-bill");if(!pb)return;
  pb.addEventListener("click",e=>{
    if(e.target.closest("[data-lblmode]")){e.stopPropagation();S.lblMode=!S.lblMode;if(S.lblMode)S.rateMode=false;V.last="";renderBill();
      if(S.lblMode)toast("🏷️ सामान दबाते जाएँ — हर बार +1 लेबल");return}
    if(e.target.closest("[data-ratemode]")){S.lblMode=false;return}
    if(!S.lblMode)return;
    const c=e.target.closest("[data-item]");if(c){e.stopPropagation();e.preventDefault();SL.tap(item(c.dataset.item),1)}
  },true);
  pb.addEventListener("keydown",e=>{if(!S.lblMode||e.key!=="Enter")return;const c=e.target.closest&&e.target.closest("[data-item]");if(c){e.stopPropagation();e.preventDefault();SL.tap(item(c.dataset.item),1)}},true);
  const q=$("#q");if(q)q.addEventListener("keydown",e=>{if(!S.lblMode||e.key!=="Enter")return;const v=q.value.trim();if(!v)return;
    const bl=typeof billList==="function"?billList():null;const L=bl?bl.list:[];
    if(/^\d{6,}$/.test(v)&&findByCode(v)){e.preventDefault();e.stopImmediatePropagation();q.value="";S.q="";renderBill();SL.scan(v);return}
    if(L.length===1){e.preventDefault();e.stopImmediatePropagation();q.value="";S.q="";renderBill();SL.tap(L[0],bl.qq>0?bl.qq:1)}},true);
}

/* ================= कहीं से भी: 🏷️ बटन (सामान की सेटिंग, बाज़ार खरीद) ================= */
document.addEventListener("click",e=>{let b;
  if((b=e.target.closest("[data-lbladd]"))){e.preventDefault();e.stopPropagation();SL.ask(item(b.dataset.lbladd));return}
  if(e.target.closest("[data-mklbl]")){e.preventDefault();e.stopPropagation();
    const L=window.SM&&SM.draftLines?SM.draftLines():[];let ok=0,skip=0;
    L.forEach(l=>{const it=(l.itemId&&item(l.itemId))||(l.bar&&findByCode(l.bar));const n=Math.max(1,Math.round(num(l.qty))||1);if(it){SL.add(it.id,n);ok++}else skip++});
    if(!ok){toast("इन सामान का बारकोड/सामान अभी नहीं बना — खरीद सेव करने के बाद छापें");return}
    toast("🏷️ "+ok+" सामान लिस्ट में"+(skip?" · "+skip+" नए सामान खरीद सेव होने के बाद":""));S.tab="label";showTab()}
},true);

/* ================= ⚙️ सेटिंग: 🎨 लेबल डिज़ाइन ================= */
SL.settingsHTML=function(){const c=SL.cfg(),sk=sizeKey(),smp=SL.sample();setTimeout(SL.drawSetPrev,0);
  let thumbs="";try{thumbs=STYLES.map(([k,v])=>{const u=SL.canvasFor(smp,{},{...c,style:k},sk).toDataURL("image/png");return `<button type="button" data-slstyle="${k}" aria-pressed="${c.style===k}"><img src="${u}" alt=""><span>${v}</span></button>`}).join("")}catch(e){}
  return `<div class="card2 sl-set" id="slDesign"><h3>🎨 बारकोड लेबल का डिज़ाइन</h3>
  <p class="note" style="margin:0">यहाँ जो चुनेंगे, वही हर फोन से छपेगा। बारकोड हमेशा छपता है — बाकी हर चीज़ आपकी मर्ज़ी।</p>
  <label class="fld">🏪 दुकान का नाम (सबसे ऊपर)<input class="inp" id="slShop" value="${esc(c.shop)}" maxlength="48" placeholder="जैसे 177 MH वेट कैंटीन · बाड़मेर"></label>
  <b class="sl-t">1️⃣ डिज़ाइन चुनें</b>
  <div class="sl-thumbs">${thumbs}</div>
  <b class="sl-t">2️⃣ लेबल पर क्या-क्या छपे</b>
  <div class="sl-tg">${SHOW.map(([k,v])=>`<label class="sl-sw${c.show[k]?" on":""}"><input type="checkbox" data-slshow="${k}" ${c.show[k]?"checked":""}><span>${v}</span></label>`).join("")}</div>
  <label class="fld">💬 नीचे की लाइन (जैसे धन्यवाद / 📞 नंबर / ऑफ़र)<input class="inp" id="slExtra" value="${esc(c.extra)}" maxlength="48"></label>
  <b class="sl-t">3️⃣ ऐसा दिखेगा <small class="note">(${sk.replace("x","×")} mm)</small></b>
  <div class="lprev sl-big"><canvas id="slSetPrev"></canvas></div>
  <p class="note" style="margin:0">💡 तेज़ स्कैन के लिए: "बारकोड के अंक" चालू रखें, 50×25 या बड़ा लेबल, कालापन 8-12। बहुत सारी चीज़ें चालू करने पर लिखाई अपने-आप छोटी होती है — बारकोड की जगह कभी कम नहीं होती।</p>
  </div>`};
SL.drawSetPrev=function(){const cv=$("#slSetPrev");if(!cv)return;
  clearTimeout(SL._tt);SL._tt=setTimeout(()=>{const c=SL.cfg(),smp=SL.sample();document.querySelectorAll("#slDesign [data-slstyle] img").forEach(im=>{try{im.src=SL.canvasFor(smp,{},{...c,style:im.parentNode.dataset.slstyle}).toDataURL("image/png")}catch(e){}})},120);const src=SL.canvasFor(SL.sample(),{});cv.width=src.width;cv.height=src.height;cv.getContext("2d").drawImage(src,0,0)};
function bindSettings(){const ps=$("#p-set");if(!ps)return;
  ps.addEventListener("click",e=>{const b=e.target.closest("#slDesign [data-slstyle]");if(!b)return;SL.save({style:b.dataset.slstyle});
    ps.querySelectorAll("#slDesign [data-slstyle]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));SL.drawSetPrev()});
  ps.addEventListener("change",e=>{const t=e.target;
    if(t.dataset.slshow){SL.save({show:{[t.dataset.slshow]:t.checked?1:0}});const l=t.closest(".sl-sw");if(l)l.classList.toggle("on",t.checked);SL.drawSetPrev();return}
    if(t.id==="slShop"){SL.save({shop:t.value.trim()});SL.drawSetPrev();return}
    if(t.id==="slExtra"){SL.save({extra:t.value.trim()});SL.drawSetPrev()}});
  ps.addEventListener("input",e=>{const t=e.target;if(t.id!=="slShop"&&t.id!=="slExtra")return;
    const c=SL.cfg();const tmp={...c,[t.id==="slShop"?"shop":"extra"]:t.value};const cv=$("#slSetPrev");if(!cv)return;const src=SL.canvasFor(SL.sample(),{},tmp);cv.width=src.width;cv.height=src.height;cv.getContext("2d").drawImage(src,0,0)});
}

/* ================= रूप-रंग ================= */
const css=document.createElement("style");css.id="slcss";css.textContent=`
.lblchip{border-color:var(--haldi)!important;font-weight:800}.lblchip.on{background:var(--haldi)!important;color:var(--haldi-ink)!important}
.lblchip i{font-style:normal;background:var(--haldi);color:var(--haldi-ink);border-radius:9px;padding:0 6px;margin-left:4px;font-size:12px}
.lblbar{display:flex;align-items:center;gap:6px;margin:6px 0 2px;padding:4px 4px 4px 8px;border-radius:12px;background:var(--haldi);color:var(--haldi-ink);font-weight:700;min-height:40px}
.lblbar[hidden]{display:none}html.lblon #btabs,html.lblon #custbox,html.lblon #greet{display:none!important}.lb-ic{font-size:16px;flex:none}.lb-nm{flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lb-hint{font-weight:600;font-size:13px;opacity:.85}
.lb-n{display:flex;align-items:center;flex:none;background:rgba(255,255,255,.55);border-radius:9px;overflow:hidden}
.lb-n button{border:0;background:transparent;color:inherit;width:28px;height:32px;font-size:18px;font-weight:900;padding:0}
.lb-n input{width:40px;border:0;background:#fff;color:#111;text-align:center;font-weight:900;font-size:16px;height:32px;padding:0}
.lb-go{flex:none;border:0;border-radius:9px;padding:0 9px;height:32px;font-weight:900;font-size:13px;background:var(--haldi-ink);color:var(--haldi)}.lb-go:disabled{opacity:.5}
.lb-x{flex:none;border:0;background:transparent;color:inherit;width:28px;height:32px;font-size:16px;font-weight:900}
.lbub{position:absolute;top:6px;right:6px;z-index:4;padding:1px 7px;border-radius:99px;font-weight:900;font-size:13px;background:var(--haldi);color:var(--haldi-ink);box-shadow:0 2px 6px rgba(0,0,0,.3)}
.sl-ah{display:flex;align-items:center;gap:8px}.sl-ah b{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.sl-ah span{flex:1;font-size:12px;color:var(--muted);white-space:nowrap}
.sl-ar{display:flex;gap:6px;align-items:center}.sl-ar .lb-n{background:var(--bg);border:1.5px solid var(--line)}.sl-ar .lb-n button{color:var(--ink)}
.sl-ar .big{flex:1;padding:10px!important;font-size:15px!important}.sl-k{flex:1;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:9px;height:34px;font-weight:800}
.sl-ask{gap:8px!important;padding:10px!important}
.sl-box{display:grid;gap:8px}.sl-hd{display:flex;justify-content:space-between;align-items:baseline;gap:6px;flex-wrap:wrap}
.sl-srch{display:flex;gap:6px}.sl-srch input{flex:1;min-width:0;border:2px solid var(--line);border-radius:12px;padding:10px 12px;font-size:17px;background:var(--bg);color:var(--ink)}
.sl-srch .scanbtn{border:0;border-radius:12px;padding:0 14px;font-size:20px;background:var(--haldi);color:var(--haldi-ink)}
.sl-hits{display:grid;gap:4px}.sl-hits:empty{display:none}
.sl-hits button{display:flex;align-items:center;gap:8px;text-align:left;border:1.5px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);padding:5px 8px}
.sl-hits .tile,.sl-row .tile{width:40px;height:40px;flex:none;border-radius:9px}.sl-hits .tile .em,.sl-row .tile .em{font-size:20px}
.sl-hits span{flex:1;min-width:0;display:grid}.sl-hits b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sl-hits small{color:var(--muted);font-size:12px}
.sl-hits em{font-style:normal;font-weight:900;font-size:20px;color:var(--leaf)}
.sl-list{display:grid;gap:6px}
.sl-row{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:14px;padding:6px;background:var(--surface)}
.sl-row.sel{border-color:var(--haldi)}.sl-row.flash{animation:slfl .9s ease}@keyframes slfl{0%{background:var(--haldi);}100%{}}
.sl-tl{border:0;background:none;padding:0}.sl-nm{min-width:0;display:grid}.sl-nm b{font-size:15px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-nm span{font-size:12px;color:var(--muted)}.sl-nm em{font-style:normal;color:var(--chili);font-weight:700}
.sl-n{display:flex;align-items:center;border:2px solid var(--line);border-radius:12px;overflow:hidden}
.sl-n button{border:0;background:var(--bg);color:var(--ink);width:30px;height:38px;font-size:18px;font-weight:800}
.sl-n input{width:46px;border:0;text-align:center;font-weight:800;font-size:18px;background:var(--surface);color:var(--ink);padding:0}
.sl-x{border:0;background:none;color:var(--muted);font-size:18px;width:26px}
.sl-dt{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap}.sl-dt label{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted)}
.sl-dt input{border:1.5px solid var(--line);border-radius:8px;padding:3px 6px;background:var(--bg);color:var(--ink)}
.sl-empty{display:grid;gap:4px;text-align:center;padding:14px 8px;border:2px dashed var(--line);border-radius:14px}.sl-empty span{font-size:13px;color:var(--muted);line-height:1.6}
.sl-sum{display:flex;justify-content:space-between;align-items:center;gap:6px}.sl-sum:empty{display:none}
.sl-pv{display:grid;gap:8px}.sl-pvh{display:flex;justify-content:space-between;align-items:baseline}
.sl-sz,.sl-sty{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0}.sl-sz .chip,.sl-sty .chip{flex:none}
.lprev canvas{max-width:100%;height:auto;display:block;margin:0 auto;background:#fff;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.sl-go{width:100%;font-size:19px!important;padding:15px!important}.sl-go:disabled{opacity:.55}
.sl-done{text-align:center;font-weight:700;margin:6px 0;color:var(--leaf)}
.sl-ask .sl-askpv{width:100%;max-width:320px;margin:0 auto;display:block;background:#fff;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.sl-qk{display:flex;gap:6px}.sl-qk button{flex:1;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:10px;padding:8px 0;font-weight:800;font-size:15px}
.sl-set{display:grid;gap:10px}.sl-t{font-size:15px}
.sl-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.sl-thumbs button{border:2px solid var(--line);border-radius:12px;background:var(--bg);padding:6px;display:grid;gap:4px;color:var(--ink);font-weight:700;font-size:13px}
.sl-thumbs button[aria-pressed="true"]{border-color:var(--haldi);box-shadow:0 0 0 2px var(--haldi)}
.sl-thumbs img{width:100%;background:#fff;border-radius:4px;display:block}
.sl-tg{display:flex;flex-wrap:wrap;gap:6px}
.sl-sw{display:flex;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:20px;padding:6px 10px;font-size:14px;font-weight:700;color:var(--muted)}
.sl-sw.on{border-color:var(--leaf);color:var(--ink);background:var(--ok-bg)}.sl-sw input{width:18px;height:18px;margin:0}
.sl-big canvas{width:100%;max-width:420px}
.mk-lbl{width:100%;margin:2px 0 8px;border:1.5px dashed var(--haldi);background:transparent;color:inherit;border-radius:12px;padding:9px;font-weight:800;font-size:14px}
`;document.head.appendChild(css);

bindBill();SL.bind();bindSettings();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{try{SL.drawPrev();SL.drawSetPrev()}catch(e){}});
})();
