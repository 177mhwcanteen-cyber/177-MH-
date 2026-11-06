/* 177 MH कैंटीन — 🧾 बिल की छपाई: थीम + हर चीज़ चालू/बंद (se-receipt.js)
   SE.receiptCanvas को बदलता है — प्रिंटर (58/80mm/4 इंच), PDF और WhatsApp तीनों में यही बिल।
   ⚙️ सेटिंग → 🧾 बिल का डिज़ाइन: दुकान का नाम/पता/टैगलाइन/GSTIN, 5 थीम, 24 चीज़ें चालू/बंद, अक्षर का साइज़, लाइव झलक।
   settings/main.rcpt — सब फोन पर एक जैसा। नियम: docs/बिल-छपाई-प्रॉम्प्ट.txt
   तम्बाकू वाले सामान का नाम पहले से "Misc Item …" (billNm) आता है — यहाँ असली नाम कभी नहीं छपता। */
(function(){
"use strict";
const SRc=window.SRc={};
const OLD=SE.receiptCanvas;
const r2=n=>Math.round((+n||0)*100)/100;
const money=n=>{n=r2(n);return "₹"+(Number.isInteger(n)?n.toLocaleString("en-IN"):n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}))};
const THEMES=[["classic","क्लासिक"],["modern","मॉडर्न (काली पट्टी)"],["compact","कम कागज़"],["bigtotal","बड़ा टोटल"],["premium","प्रीमियम फ्रेम"]];
const SHOW=[
  ["logo","🛒 लोगो"],["tag","टैगलाइन"],["addr","📍 पता"],["phone","📞 ऑर्डर नंबर (ऊपर)"],["gst","GSTIN"],
  ["custTag","⭐ ग्राहक टैग (VIP/उधार)"],["billno","बिल नंबर"],["date","तारीख-समय"],["cust","ग्राहक का नाम/नंबर"],
  ["sr","क्र. कॉलम"],["en","अंग्रेज़ी नाम भी"],["rate","भाव कॉलम"],["count","कुल सामान/मात्रा"],["saved","🎉 MRP से बचत"],
  ["pay","भुगतान का तरीका"],["balance","खाते में बाकी"],["qr","UPI QR"],["stamps","PAID / बिलर मुहर"],
  ["points","🎁 ग्राहक के पॉइंट"],["delivery","📲 घर बैठे मँगाएँ डिब्बा"],["nutri","🥗 सेहत का हिसाब"],["note","💬 अपनी लाइन"],["barcode","🔢 बिल नंबर का बारकोड"],
  ["foot","🙏 धन्यवाद लाइन"],["biller","बिलर का नाम"]];
const DEF={theme:"classic",size:"m",shop:"177 MH कैंटीन",tag:"किराना · मिठाई · फास्ट फूड",addr:"आकाशवाणी रोड, बाड़मेर",gst:"",note:"",foot:"🙏 धन्यवाद! फिर पधारें",
  show:{logo:1,tag:1,addr:1,phone:1,gst:0,custTag:1,billno:1,date:1,cust:1,sr:1,en:1,rate:1,count:0,saved:1,pay:1,balance:1,qr:1,stamps:1,delivery:1,points:1,nutri:0,note:0,barcode:1,foot:1,biller:1}};
SRc.THEMES=THEMES;SRc.SHOW=SHOW;
SRc.cfg=function(){let s={};try{s=(S.settings&&S.settings.rcpt)||{}}catch(e){}return {...DEF,...s,show:{...DEF.show,...(s.show||{})}}};
let saveT=0;
SRc.save=function(patch){const cur=SRc.cfg(),c={...cur,...patch,show:{...cur.show,...(patch.show||{})}};S.settings={...(S.settings||{}),rcpt:c};
  clearTimeout(saveT);saveT=setTimeout(async()=>{try{if(!S.demo&&S.db)await S.db.doc("settings/main").set({rcpt:c},{merge:true});toast("✓ बिल का डिज़ाइन सेव — सब फोन पर")}catch(e){toast("सेव नहीं हुआ — सिर्फ़ विक्रम जी बदल सकते हैं")}},450)};

function wrap(x,t,maxW){const out=[];for(const para of String(t).split("\n")){const ws=para.split(" ");let cur="";
  for(const w of ws){const tt=cur?cur+" "+w:w;if(x.measureText(tt).width>maxW&&cur){out.push(cur);cur=w}else cur=tt}
  /* एक शब्द ही बहुत लंबा हो तो अक्षर से तोड़ो */
  while(cur&&x.measureText(cur).width>maxW&&cur.length>1){let k=cur.length;while(k>1&&x.measureText(cur.slice(0,k)).width>maxW)k--;out.push(cur.slice(0,k));cur=cur.slice(k)}
  out.push(cur)}return out}

/* ================= बिल बनाना ================= */
SRc.draw=function(b,o,widthPx,cfg){
  cfg=cfg||SRc.cfg();const sh=cfg.show,th=cfg.theme;
  const W=widthPx||SE.printer.width,P=Math.round(W*(th==="premium"?0.045:0.03));
  const F='"Mukta","Noto Sans Devanagari","Noto Sans",sans-serif',FB='"Baloo 2","Mukta","Noto Sans Devanagari",sans-serif';
  const k=W/384*({s:.9,m:1,l:1.12}[cfg.size]||1)*(th==="compact"?.9:1);const fs=n=>Math.max(9,Math.round(n*k));const px=n=>Math.max(1,Math.round(n*W/384));
  const c=document.createElement("canvas");c.width=W;c.height=9000;const x=c.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,W,c.height);x.fillStyle="#000";x.strokeStyle="#000";x.textBaseline="top";
  let y=px(th==="premium"?14:8);
  const font=(sz,w,fam)=>{x.font=`${w||500} ${sz}px ${fam||F}`};
  const T=(t,sz,al,w,fam,maxW)=>{font(sz,w,fam);const L=wrap(x,t,maxW||W-2*P);for(const ln of L){const tw=x.measureText(ln).width;x.fillText(ln,al==="c"?(W-tw)/2:al==="r"?W-P-tw:P,y);y+=Math.round(sz*1.3)}};
  const LR=(l,r,sz,w,wr)=>{font(sz,wr||w);const rw=x.measureText(r).width;x.fillText(r,W-P-rw,y);font(sz,w);const L=wrap(x,l,W-2*P-rw-px(10));L.forEach((ln,i)=>x.fillText(ln,P,y+i*Math.round(sz*1.3)));y+=Math.round(sz*1.32)*Math.max(1,L.length)};
  const DASH=()=>{y+=px(3);for(let i=P;i<W-P;i+=px(10))x.fillRect(i,y,px(6),Math.max(1,px(1.6)));y+=px(7)};
  const LINE=(t)=>{y+=px(3);x.fillRect(P,y,W-2*P,Math.max(2,px(t||2)));y+=px(7)};
  const DLINE=()=>{y+=px(3);x.fillRect(P,y,W-2*P,Math.max(1,px(1.2)));x.fillRect(P,y+px(4),W-2*P,Math.max(1,px(1.2)));y+=px(10)};
  const rr=(a,bb,w,h,r)=>{x.beginPath();x.moveTo(a+r,bb);x.arcTo(a+w,bb,a+w,bb+h,r);x.arcTo(a+w,bb+h,a,bb+h,r);x.arcTo(a,bb+h,a,bb,r);x.arcTo(a,bb,a+w,bb,r);x.closePath()};
  const SEP=()=>th==="modern"||th==="compact"?LINE(th==="compact"?1:1.5):th==="premium"?DLINE():DASH();
  const inst=b.mode==="inst";
  const shop=(sh.logo&&!inst?"🛒 ":"")+(cfg.shop||o.shop||"177 MH कैंटीन");
  const tag=inst?(o.tag||""):(sh.tag?cfg.tag:"");
  /* ---------- ऊपर: दुकान ---------- */
  if(th==="modern"){const y0=y;const lines=[];font(fs(28),800,FB);const sL=wrap(x,shop,W-2*P-px(16));
    const h=sL.length*Math.round(fs(28)*1.25)+(tag?Math.round(fs(14)*1.35):0)+px(16);x.save();rr(P,y0,W-2*P,h,px(10));x.fill();x.fillStyle="#fff";y=y0+px(8);
    sL.forEach(l=>{font(fs(28),800,FB);const tw=x.measureText(l).width;x.fillText(l,(W-tw)/2,y);y+=Math.round(fs(28)*1.25)});
    if(tag){font(fs(14),600);const tw=x.measureText(tag).width;x.fillText(tag,(W-tw)/2,y);y+=Math.round(fs(14)*1.35)}x.restore();y=y0+h+px(6);void lines}
  else if(th==="premium"){const y0=y;y+=px(10);T("✦ "+shop+" ✦",fs(27),"c",800,FB);if(tag)T(tag,fs(14),"c",600);
    if(sh.addr&&cfg.addr)T(cfg.addr,fs(14),"c");if(sh.phone&&o.phone)T("📞 "+o.phone,fs(15),"c",700);if(sh.gst&&cfg.gst)T("GSTIN: "+cfg.gst,fs(13),"c",700);
    y+=px(8);x.lineWidth=px(2.5);rr(P,y0,W-2*P,y-y0,px(12));x.stroke();x.lineWidth=px(1);rr(P+px(5),y0+px(5),W-2*P-px(10),y-y0-px(10),px(9));x.stroke();y+=px(8)}
  else{T(shop,fs(th==="compact"?24:30),"c",800,FB);if(tag)T(tag,fs(15),"c")}
  if(th!=="premium"){if(sh.addr&&cfg.addr)T(cfg.addr,fs(th==="compact"?13:16),"c");if(sh.phone&&o.phone)T("📞 ऑर्डर: "+o.phone,fs(th==="compact"?13:16),"c");if(sh.gst&&cfg.gst)T("GSTIN: "+cfg.gst,fs(13),"c",700)}
  if(th==="classic"||th==="bigtotal")LINE();else if(th==="compact")DASH();
  /* ---------- ग्राहक टैग ---------- */
  if(sh.custTag&&o.custTag){const h=fs(34);x.fillStyle="#000";if(o.vip){x.fillRect(P,y,W-2*P,h);x.fillStyle="#fff"}else{x.lineWidth=Math.max(2,px(2));x.strokeRect(P,y,W-2*P,h)}
    font(fs(20),800,FB);const tw=x.measureText(o.custTag).width;x.fillText(o.custTag,(W-tw)/2,y+fs(6));x.fillStyle="#000";y+=h+px(8)}
  /* ---------- बिल नं / तारीख ---------- */
  if(th==="modern"||th==="compact"){const L=sh.billno?"बिल: "+b.no:"",R=sh.date?(o.date||""):"";if(L||R)LR(L,R,fs(th==="compact"?14:16),700,500)}
  else{if(sh.billno)LR("बिल नं: "+b.no,"",fs(19),800);if(sh.date)LR("तारीख: "+(o.date||""),"",fs(17))}
  if(sh.cust&&((b.partyName&&b.partyName!=="VIP ग्राहक")||b.custPhone))LR("ग्राहक: "+(b.partyName||"")+(b.custPhone?" · "+b.custPhone:""),"",fs(th==="compact"?14:17));
  SEP();
  /* ---------- सामान ---------- */
  const L=b.lines||[];const nm=l=>SE.capNm(sh.en&&window.SN?SN.withEn(String(l.name||"")):String(l.name||""));/* 🔠 पुराने बिल भी CAPITAL में छपें */const qf=l=>(o.fq?o.fq(l.qty,l.unit):String(l.qty)).replace(" कि.ग्रा"," kg");
  const rateT=l=>l.free?"मुफ्त":money(l.rate);
  if(th==="modern"){/* दो लाइन: नाम … रकम / नीचे छोटा "2 × ₹40" — Swiggy/Amazon जैसा साफ़ */
    L.forEach((l,i)=>{const sz=fs(17);font(sz,700);const am=money(l.amt),aw=x.measureText(am).width;const pre=sh.sr?(i+1)+". ":"";
      const nl=wrap(x,pre+nm(l),W-2*P-aw-px(12));x.fillText(am,W-P-aw,y);nl.forEach((t,j)=>x.fillText(t,P,y+j*Math.round(sz*1.28)));y+=Math.round(sz*1.28)*nl.length;
      font(fs(14),500);x.fillText(qf(l)+(sh.rate?" × "+rateT(l):""),P+(sh.sr?x.measureText(pre).width:0),y);y+=Math.round(fs(14)*1.45)});
  }else{
    const sz=fs(th==="compact"?14:17),sr=sh.sr&&th!=="compact",rt=sh.rate;
    const cS=P,cN=sr?P+W*0.07:P,cA=W-P,cR=rt?W*0.765:0,cQ=rt?W*0.58:W*0.74;
    const row=(a,bn,q,r,am,bold)=>{font(sz,bold?800:500);const ls=wrap(x,bn,cQ-cN-px(th==="compact"?36:30));const h=Math.round(sz*1.3);
      if(sr)x.fillText(a,cS,y);ls.forEach((ln,i)=>x.fillText(ln,cN,y+i*h));
      const R=(t,xr)=>{const w=x.measureText(t).width;x.fillText(t,xr-w,y)};R(q,cQ+px(18));if(rt)R(r,cR+px(14));R(am,cA);y+=h*ls.length+px(3)};
    row("क्र.","सामान","मात्रा","भाव","रकम",true);th==="premium"?LINE(1):DASH();
    L.forEach((l,i)=>row(String(i+1),nm(l),qf(l),rateT(l),money(l.amt)));
  }
  SEP();
  if(sh.count&&L.length){const pc=L.filter(l=>l.unit!=="kg").reduce((a,l)=>a+(+l.qty||0),0);LR("कुल सामान: "+L.length,pc?"पीस: "+r2(pc):"",fs(14),600)}
  /* ---------- जोड़ ---------- */
  const sub=r2(b.sub!=null?b.sub:L.reduce((a,l)=>a+(l.amt||0),0));
  if(b.disc){LR("जोड़",money(sub),fs(17));LR("छूट","−"+money(b.disc),fs(17))}
  {const ro=window.SF&&SF.roff?SF.roff(b):0;if(ro)LR("राउंड ऑफ",(ro>0?"+":"−")+"₹"+Math.abs(ro).toFixed(2),fs(14))}
  if(th==="bigtotal"||th==="modern"){const h=fs(th==="bigtotal"?58:46);x.save();rr(P,y,W-2*P,h,px(10));x.fill();x.fillStyle="#fff";
    font(fs(th==="bigtotal"?20:17),700);x.fillText("कुल रकम",P+px(12),y+(h-fs(20))/2);font(fs(th==="bigtotal"?40:30),800,FB);const t=money(b.total),tw=x.measureText(t).width;x.fillText(t,W-P-px(12)-tw,y+(h-fs(th==="bigtotal"?40:30)*1.15)/2);x.restore();y+=h+px(8)}
  else if(th==="premium"){y+=px(2);const h=fs(44);x.lineWidth=px(2);rr(P,y,W-2*P,h,px(8));x.stroke();font(fs(18),700);x.fillText("कुल रकम",P+px(12),y+(h-fs(18))/2);font(fs(30),800,FB);const t=money(b.total),tw=x.measureText(t).width;x.fillText(t,W-P-px(12)-tw,y+(h-fs(30)*1.15)/2);y+=h+px(8)}
  else LR("कुल रकम",money(b.total),fs(th==="compact"?24:30),800);
  if(sh.saved&&o.saved>0){const h=fs(32);x.lineWidth=Math.max(2,px(2));if(th==="bigtotal"){x.save();x.setLineDash([px(6),px(4)])}x.strokeRect(P,y,W-2*P,h);if(th==="bigtotal")x.restore();
    font(fs(18),800,FB);const st="🎉 आपने MRP से "+money(o.saved)+" बचाए",sw=x.measureText(st).width;x.fillText(st,(W-sw)/2,y+(h-fs(18)*1.2)/2);y+=h+px(6)}
  if(sh.pay&&b.pay&&o.paid!==false&&!(sh.stamps&&o.stampL)){const p=b.pay;const parts=[p.cash?"नकद ₹"+p.cash:"",p.upi?"UPI ₹"+p.upi:"",p.udhar?"उधार ₹"+p.udhar:""].filter(Boolean);if(parts.length)T("भुगतान: "+parts.join(" · "),fs(15),"l")}
  if(sh.balance&&o.balance!=null)LR("खाते में कुल बाकी",money(o.balance),fs(17),800);
  if(sh.points&&o.points&&o.points.left>0){const t2="🎁 आपके पॉइंट: "+o.points.left+(o.points.left>=20?" — अगली बार इनाम":"");font(fs(15),800);const tw=x.measureText(t2).width+px(20),h=fs(26);
    x.save();x.setLineDash([px(4),px(3)]);x.lineWidth=px(1.5);rr((W-tw)/2,y,tw,h,px(8));x.stroke();x.restore();x.fillText(t2,(W-tw)/2+px(10),y+(h-fs(15)*1.2)/2);y+=h+px(6)}
  /* ---------- QR + मुहर ---------- */
  const qrOn=sh.qr&&o.qr,stL=sh.stamps?o.stampL:null,stR=sh.stamps?o.stampR:null;
  if(qrOn||stL){SEP();if(qrOn)T(o.qrLabel||"स्कैन करके भुगतान करें",fs(16),"c",800);
    const s=qrOn?Math.round(W*(th==="compact"?0.36:0.44)):0,pad=px(8),y0=y+pad+(qrOn?px(12):0),sideW=Math.round((W-2*P-s)/2)-px(12);
    if(qrOn){x.imageSmoothingEnabled=false;x.drawImage(o.qr,(W-s)/2,y0,s,s);
      const bx=(W-s)/2-pad,by=y0-pad,bw=s+2*pad;x.lineWidth=Math.max(3,px(3.5));rr(bx,by,bw,bw,px(12));x.stroke();
      font(px(13),800);const tg="UPI · स्कैन करें",tw=x.measureText(tg).width+px(14);x.fillRect((W-tw)/2,by-px(9),tw,px(18));x.fillStyle="#fff";x.fillText(tg,(W-tw)/2+px(7),by-px(8));x.fillStyle="#000"}
    const stamp=(st,x0,side)=>{if(!st||sideW<px(60))return 0;const LL=[[st.l1,fs(18),800],[st.l2,fs(15),700],[st.l3,fs(12),500]].filter(l=>l[0]);
      const lh=LL.map(l=>Math.round(l[1]*1.3));const h=lh.reduce((a,v)=>a+v,0)+px(16);const by=y0+Math.max(0,((s||h)-h)/2);
      x.save();x.translate(x0+sideW/2,by+h/2);x.rotate(side==="l"?-0.06:0.06);x.lineWidth=Math.max(2,px(2.5));rr(-sideW/2,-h/2,sideW,h,px(10));x.stroke();
      x.lineWidth=Math.max(1,px(1));rr(-sideW/2+px(4),-h/2+px(4),sideW-px(8),h-px(8),px(7));x.stroke();
      let yy=-h/2+px(8);LL.forEach((l,i)=>{font(l[1],l[2]);for(const ln of wrap(x,l[0],sideW-px(14)).slice(0,2)){const w=x.measureText(ln).width;x.fillText(ln,-w/2,yy);yy+=lh[i]}});x.restore();return by+h};
    const e1=stamp(stL,P,"l"),e2=stamp(stR,W-P-sideW,"r");
    y=Math.max(y0+s+pad,e1,e2)+px(8);if(qrOn&&o.upi)T("UPI: "+o.upi,fs(13),"c")}
  /* ---------- सेहत ---------- */
  const t=sh.nutri&&window.SN&&SN.ofBill(b);
  if(t){SEP();T("🥗 इस थैले में आपकी सेहत (लगभग)",fs(17),"c",800);const cells=SN.cells(t),half=(W-2*P)/2;
    for(let i=0;i<cells.length;i+=2){[cells[i],cells[i+1]].forEach((cc,j)=>{if(!cc)return;const x0=P+j*half;font(fs(14),500);x.fillText(cc[0]+" "+cc[1],x0,y);
      font(fs(14),800);const v=cc[2],vw=x.measureText(v).width;x.fillText(v,x0+half-vw-(j?px(4):px(18)),y)});y+=Math.round(fs(14)*1.45)}
    const hl=SN.headline(t);if(hl)T(hl,fs(15),"c",800);T(SN.note,fs(11),"c")}
  /* ---------- नीचे ---------- */
  if(sh.note&&cfg.note){SEP();T(cfg.note,fs(15),"c",700)}
  if(sh.delivery&&o.phone&&th!=="compact"){SEP();const y0=y;y+=px(8);T("📲 घर बैठे सामान मँगाएँ",fs(17),"c",800);T("WhatsApp या कॉल करें",fs(14),"c");T(o.phone,fs(26),"c",800,FB);y+=px(4);
    x.lineWidth=Math.max(2,px(2));th==="premium"?(rr(P,y0,W-2*P,y-y0,px(10)),x.stroke()):x.strokeRect(P,y0,W-2*P,y-y0);y+=px(8)}
  else if(sh.delivery&&o.phone){T("📲 घर बैठे मँगाएँ: "+o.phone,fs(14),"c",800)}
  if(sh.barcode&&b.no&&window.JsBarcode&&/^[\x20-\x7e]+$/.test(String(b.no))){try{const bc=document.createElement("canvas");
      JsBarcode(bc,String(b.no),{format:"CODE128",width:W>=576?3:2,height:px(46),displayValue:true,font:"monospace",fontOptions:"bold",fontSize:px(16),margin:0,marginLeft:px(20),marginRight:px(20),background:"#fff",lineColor:"#000"});
      if(bc.width<=W){y+=px(6);x.imageSmoothingEnabled=false;x.drawImage(bc,Math.round((W-bc.width)/2),y);y+=bc.height+px(6)}}catch(e){}}
  if(th!=="compact")SEP();
  if(sh.foot&&cfg.foot)T(cfg.foot,fs(th==="compact"?15:19),"c",800);
  if(sh.biller&&b.byName&&!(sh.stamps&&o.stampR))T("बिलर: "+b.byName,fs(13),"c");
  y+=px(th==="premium"?16:24);
  if(th==="premium"){x.lineWidth=px(1.5);x.setLineDash([px(4),px(4)]);x.strokeRect(px(4),px(4),W-px(8),y-px(8));x.setLineDash([])}
  const out=document.createElement("canvas");out.width=W;out.height=Math.ceil(y);out.getContext("2d").drawImage(c,0,0);return out;
};
SE.receiptCanvas=function(b,o,w){o=o||{};if(o.points==null&&window.SA&&SA.points&&b&&b.custPhone)try{o={...o,points:SA.points(b.custPhone)}}catch(e){}try{return SRc.draw(b,o,w)}catch(e){console.warn("receipt",e);return OLD(b,o,w)}};
SE.receiptCanvasOld=OLD;

/* ================= नमूना बिल (झलक के लिए) ================= */
SRc.sample=function(){const lines=[{name:"Shahi Kaju Katli",qty:.5,unit:"kg",rate:840,amt:420},{name:"Mogar Kachori",qty:4,unit:"pc",rate:15,amt:60},{name:"Fortune Mustard Oil 1L",qty:1,unit:"pc",rate:189,amt:189},{name:"Parle-G 70g",qty:3,unit:"pc",rate:10,amt:30}];
  const b={no:"MH-0611-27",date:today(),ts:Date.now(),lines,sub:699,total:699,mode:"cash",pay:{upi:699},byName:"मुकेश भाई",partyName:"",custPhone:""};
  const o={shop:"177 MH कैंटीन",phone:(window.SF&&SF.fmtPh&&SF.orderPh)?SF.fmtPh(SF.orderPh()):"98xxxxxx10",date:fdate(today())+"  "+(typeof ftime==="function"?ftime(Date.now()):""),fq:typeof fq==="function"?fq:(q,u)=>q+" "+u,
    custTag:"⭐ VIP ग्राहक",vip:true,saved:46,points:{left:37},paid:true,upi:"",qr:null,stampL:{l1:"✅ PAID",l2:"by UPI"},stampR:{l1:"🧑‍🌾 बिलिंग",l2:"मुकेश भाई",l3:"05:30 PM"},balance:null};
  try{if(window.SF&&SF.qrCanvas)o.qr=SF.qrCanvas(699,b.no);o.upi=typeof upiId==="function"?upiId():""}catch(e){}
  return {b,o}};

/* ================= ⚙️ सेटिंग: 🧾 बिल का डिज़ाइन ================= */
SRc.settingsHTML=function(){const c=SRc.cfg();setTimeout(SRc.drawPrev,0);
  return `<div class="card2 rc-set" id="rcDesign"><h3>🧾 बिल का डिज़ाइन</h3>
  <p class="note" style="margin:0">प्रिंटर, PDF और WhatsApp — तीनों में यही बिल। हर फोन पर एक जैसा।</p>
  <div class="rc-two"><label class="fld">🏪 दुकान का नाम<input class="inp" data-rcf="shop" value="${esc(c.shop)}" maxlength="40"></label>
  <label class="fld">टैगलाइन<input class="inp" data-rcf="tag" value="${esc(c.tag)}" maxlength="60"></label>
  <label class="fld">📍 पता<input class="inp" data-rcf="addr" value="${esc(c.addr)}" maxlength="80"></label>
  <label class="fld">GSTIN (हो तो)<input class="inp" data-rcf="gst" value="${esc(c.gst)}" maxlength="15" style="text-transform:uppercase"></label>
  <label class="fld">🙏 आख़िरी लाइन<input class="inp" data-rcf="foot" value="${esc(c.foot)}" maxlength="60"></label>
  <label class="fld">💬 अपनी लाइन (ऑफ़र/सूचना)<input class="inp" data-rcf="note" value="${esc(c.note)}" maxlength="90" placeholder="जैसे: रविवार को 5% छूट"></label></div>
  <b class="sl-t">1️⃣ थीम</b>
  <div class="seg rc-th">${THEMES.map(([k,v])=>`<button class="chip" data-rcth="${k}" aria-pressed="${c.theme===k}">${v}</button>`).join("")}</div>
  <div class="seg rc-th">${[["s","छोटे अक्षर"],["m","सामान्य"],["l","बड़े अक्षर"]].map(([k,v])=>`<button class="chip" data-rcsz="${k}" aria-pressed="${c.size===k}">${v}</button>`).join("")}</div>
  <b class="sl-t">2️⃣ बिल पर क्या-क्या छपे</b>
  <div class="sl-tg">${SHOW.map(([k,v])=>`<label class="sl-sw${c.show[k]?" on":""}"><input type="checkbox" data-rcshow="${k}" ${c.show[k]?"checked":""}><span>${v}</span></label>`).join("")}</div>
  <b class="sl-t">3️⃣ ऐसा दिखेगा <small class="note">(नमूना बिल)</small></b>
  <div class="rc-prev"><canvas id="rcPrev"></canvas></div></div>`};
SRc.drawPrev=function(tmp){const cv=document.getElementById("rcPrev");if(!cv)return;const {b,o}=SRc.sample();const src=SRc.draw(b,o,384,tmp||SRc.cfg());
  cv.width=src.width;cv.height=src.height;cv.getContext("2d").drawImage(src,0,0)};
function bindSettings(){const ps=document.getElementById("p-set");if(!ps)return;
  ps.addEventListener("click",e=>{let t;
    if((t=e.target.closest("#rcDesign [data-rcth]"))){SRc.save({theme:t.dataset.rcth});ps.querySelectorAll("#rcDesign [data-rcth]").forEach(x=>x.setAttribute("aria-pressed",String(x===t)));SRc.drawPrev();return}
    if((t=e.target.closest("#rcDesign [data-rcsz]"))){SRc.save({size:t.dataset.rcsz});ps.querySelectorAll("#rcDesign [data-rcsz]").forEach(x=>x.setAttribute("aria-pressed",String(x===t)));SRc.drawPrev()}});
  ps.addEventListener("change",e=>{const t=e.target;
    if(t.dataset.rcshow){SRc.save({show:{[t.dataset.rcshow]:t.checked?1:0}});const l=t.closest(".sl-sw");if(l)l.classList.toggle("on",t.checked);SRc.drawPrev();return}
    if(t.dataset.rcf){SRc.save({[t.dataset.rcf]:t.dataset.rcf==="gst"?t.value.trim().toUpperCase():t.value.trim()});SRc.drawPrev()}});
  let it=0;ps.addEventListener("input",e=>{const t=e.target;if(!t.dataset||!t.dataset.rcf)return;clearTimeout(it);it=setTimeout(()=>SRc.drawPrev({...SRc.cfg(),[t.dataset.rcf]:t.value}),150)});
}
const css=document.createElement("style");css.textContent=`
.rc-set{display:grid;gap:10px}.rc-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media(max-width:380px){.rc-two{grid-template-columns:1fr}}
.rc-th{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0}.rc-th .chip{flex:none}
.rc-prev{background:repeating-linear-gradient(45deg,rgba(0,0,0,.04) 0 8px,transparent 8px 16px);padding:10px;border-radius:12px;max-height:560px;overflow:auto}
.rc-prev canvas{display:block;margin:0 auto;width:100%;max-width:300px;height:auto;background:#fff;box-shadow:0 3px 14px rgba(0,0,0,.3)}`;document.head.appendChild(css);
bindSettings();
})();
