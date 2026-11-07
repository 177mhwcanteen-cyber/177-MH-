/* 💵 SG — गल्ला: सुबह खोलना, हर 2-3 घंटे नोट गिनती, पैसा देना/निकालना, रात को बंद करना
   कर्मचारी सिर्फ़ गिनकर लिखते हैं — "होना चाहिए" कभी नहीं दिखता।
   मालिक को हर गिनती पर उसी समय का "होना चाहिए" और फर्क दिखता है। डेटा: days/{date}/galla/{id} */
(function(){
"use strict";
const SG=window.SG={};
const NOTES=[500,200,100,50,20,10];
const KIND={open:["🌅","गल्ला खोला"],count:["💵","गिनती"],out:["📤","पैसा दिया/निकाला"],close:["🔒","गल्ला बंद"],back:["🔁","खरीद का हिसाब मिला"]};
const ADV="🛒 खरीद के लिए साथी को";
const OUT_TO=[ADV,"विक्रम जी को दिए","बैंक में जमा","दूसरी दुकान को"];
const num=v=>{const n=parseFloat(String(v==null?"":v).replace(/[^\d.\-]/g,""));return isFinite(n)?n:0};
const r2=v=>Math.round(v*100)/100;
const dayAdd=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return today(x)};
const LSg={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
S.galla=[];

SG.hrs=()=>{const h=+((S.settings||{}).gallaHrs);return h>=1&&h<=8?h:3};
SG.list=()=>(S.galla||[]).filter(g=>!g.void).slice().sort((a,b)=>a.ts-b.ts);
SG.state=function(){const L=SG.list();const open=L.find(g=>g.kind==="open")||null;const closes=L.filter(g=>g.kind==="close");
  const counts=L.filter(g=>g.kind==="open"||g.kind==="count"||g.kind==="close");const last=counts.length?counts[counts.length-1]:null;
  return {L,open,close:closes.length?closes[closes.length-1]:null,last,outs:L.filter(g=>g.kind==="out")}};

/* उसी समय गल्ले में कितना होना चाहिए (सिर्फ़ मालिक के फ़ोन पर गिना जाता है) */
SG.expAt=function(t){
  const st=SG.state();const base=st.open?num(st.open.total):num((S.settings||{}).float);const t0=st.open?st.open.ts:0;
  const at=x=>x>t0&&x<=t;
  const bills=(S.dayBills||[]).filter(b=>!b.cancelled&&b.mode!=="inst");
  const cash=bills.reduce((a,b)=>a+(at(b.settleTs||b.ts)?num(b.pay&&b.pay.cash):0),0);
  const jama=(S.ledger||[]).filter(l=>l.date===S.billsDate&&l.type==="jama"&&l.mode!=="upi"&&l.mode!=="return"&&at(l.ts)).reduce((a,l)=>a+num(l.amt),0);
  const kh=(S.kharch||[]).filter(k=>k.mode!=="upi"&&at(k.ts)).reduce((a,k)=>a+num(k.amt),0);
  const pu=(window.SF&&SF.livePurch?SF.livePurch():[]).filter(p=>p.pay==="galla"&&at(p.ts)).reduce((a,p)=>a+num(p.paid),0);
  const out=st.outs.filter(o=>at(o.ts)).reduce((a,o)=>a+num(o.total),0)-SG.list().filter(g=>g.kind==="back"&&at(g.ts)).reduce((a,g)=>a+num(g.total),0);
  const rv=window.SV?SV.cashAt(S.billsDate,t0,t):0;
  return {base,cash:r2(cash),jama:r2(jama),kh:r2(kh),pu:r2(pu),out:r2(out),rv,exp:r2(base+cash+jama-kh-pu-out+rv)};
};
/* 🛒 खरीद के लिए गल्ले से दिया पैसा = "हिसाब बाकी" जब तक "🔁 हिसाब मिला" (बिल कितने का + कितने वापस) न दर्ज हो — 3 दिन तक पीछा */
let OLD=[];SG.loadOld=async function(){if(S.demo||!S.db)return;const L=[];for(const k of [1,2]){const d=dayAdd(today(),-k);try{const q=await S.db.collection("days/"+d+"/galla").get();q.docs.forEach(x=>L.push({id:x.id,...x.data()}))}catch(e){}}OLD=L};
SG.advAll=()=>[...OLD,...(S.galla||[])].filter(g=>!g.void);
SG.openAdv=function(){const A=SG.advAll(),done=new Set(A.filter(g=>g.kind==="back").map(g=>g.ref));return A.filter(g=>g.kind==="out"&&g.adv&&!done.has(g.id)).sort((a,b)=>a.ts-b.ts)};
SG.backSheet=function(ref){if(!biller()){openBiller(()=>SG.backSheet(ref));return}const L=SG.openAdv();if(!L.length){toast("कोई हिसाब बाकी नहीं ✅");return}
  let sel=L.find(x=>x.id===ref)||L[0],buy="",back="",note="";
  const draw=()=>{const f=r2(num(sel.total)-num(buy)-num(back));
    $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px sg-sh" role="dialog" aria-label="खरीद का हिसाब"><div class="grab"></div>
    <div class="sh-head"><div><h3>🔁 खरीद का हिसाब</h3><span class="note">${esc(biller())} · ${ftime(Date.now())}</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <div class="seg">${L.map(x=>`<button class="chip" data-sgref="${esc(x.id)}" aria-pressed="${x.id===sel.id}">${esc(x.person||"साथी")} · ${rs(x.total)} · ${x.date!==today()?fdate(x.date)+" ":""}${ftime(x.ts)}</button>`).join("")}</div>
    <p class="note" style="margin:6px 0">${esc(sel.person||"")} को ${rs(sel.total)} दिए थे${sel.note?" — "+esc(sel.note):""}। बिल देखकर लिखें:</p>
    <label class="fld">🧾 खरीद हुई (बिल कुल) ₹<input class="inp" id="sgBuy" inputmode="decimal" value="${esc(buy)}"></label>
    <label class="fld">💵 बचे पैसे गल्ले में वापस ₹<input class="inp" id="sgBack" inputmode="decimal" value="${esc(back)}"></label>
    <label class="fld">नोट<input class="inp" id="sgNote2" value="${esc(note)}" placeholder="दुकान का नाम / बिल नंबर"></label>
    <div class="amtline sg-tot"><span>फ़र्क</span><b id="sgF" style="color:${Math.abs(f)<=1?"inherit":"#b91c1c"}">${Math.abs(f)<=1?"✅ पूरा":rs(f)+(f>0?" कम लौटे":" ज़्यादा")}</b></div>
    <button class="big" data-sgbsave>✓ हिसाब पक्का करें</button></div></div>`};
  draw();const sh=$("#sheet");
  sh.oninput=e=>{const t=e.target;if(t.id==="sgBuy")buy=t.value;if(t.id==="sgBack")back=t.value;if(t.id==="sgNote2")note=t.value;const f=r2(num(sel.total)-num(buy)-num(back)),F=$("#sgF");if(F){F.textContent=Math.abs(f)<=1?"✅ पूरा":rs(f)+(f>0?" कम लौटे":" ज़्यादा");F.style.color=Math.abs(f)<=1?"inherit":"#b91c1c"}};
  sh.onclick=async e=>{if(e.target.matches("[data-close]")){closeSheet();return}const c=e.target.closest("[data-sgref]");if(c){sel=L.find(x=>x.id===c.dataset.sgref)||sel;draw();return}
    if(!e.target.closest("[data-sgbsave]"))return;if(!(num(buy)>0)&&!(num(back)>0)){toast("खरीद या वापस — कम से कम एक लिखें");return}
    const doc={kind:"back",total:r2(num(back)),buy:r2(num(buy)),ref:sel.id,refDate:sel.date||today(),person:sel.person||"",given:num(sel.total),fark:r2(num(sel.total)-num(buy)-num(back)),note:String(note).trim().slice(0,120),ts:Date.now(),date:today(),by:S.uid||"",byName:biller()};
    const id="g"+doc.ts.toString(36)+Math.random().toString(36).slice(2,5);
    try{if(!S.demo)await S.db.collection("days/"+today()+"/galla").doc(id).set(doc);S.galla.push({id,...doc});closeSheet();beep(Math.abs(doc.fark)<=1);
      toast(Math.abs(doc.fark)<=1?"✓ हिसाब पूरा — "+esc(doc.person):"⚠ हिसाब में "+rs(doc.fark)+" फ़र्क — विक्रम जी को दिखेगा");if(S.tab==="day"&&typeof renderDay==="function")renderDay();const nb=document.getElementById("sgNag");if(nb)nb.remove()}
    catch(err){toast("सेव नहीं हुआ — नेट देखें")}}};
/* cashCalc (दिन का हिसाब) के लिए: खोला/बंद/दिया */
SG.forCalc=function(){const st=SG.state();if(!st.open&&!st.close&&!st.outs.length)return null;
  return {float:st.open?num(st.open.total):null,counted:st.close?num(st.close.total):null,out:r2(st.outs.reduce((a,o)=>a+num(o.total),0)-st.L.filter(g=>g.kind==="back").reduce((a,g)=>a+num(g.total),0)),closeBy:st.close?st.close.byName:""}};

SG.listen=function(d){S.galla=[];if(S.demo||!S.db)return ()=>{};let first=true;
  return S.db.collection("days/"+d+"/galla").onSnapshot(s=>{
    const prev=new Set((S.galla||[]).map(g=>g.id));S.galla=s.docs.map(x=>({id:x.id,...x.data()}));
    if(S.isOwner&&!first)S.galla.filter(g=>!prev.has(g.id)&&g.by!==S.uid&&g.kind!=="open").forEach(alertOwner);
    first=false;if(S.tab==="day"&&typeof renderDay==="function")renderDay();SG.nag();
  },()=>{})};
function alertOwner(g){setTimeout(()=>{try{
  if(g.kind==="out"){toast("📤 "+(g.byName||"")+": "+rs(g.total)+" — "+(g.to||"दिए")+(g.person?" "+g.person:""));return}
  if(g.kind==="back"){toast((Math.abs(g.fark||0)>1?"🚨 ":"🔁 ")+(g.person||"")+" का हिसाब: खरीद "+rs(g.buy)+" + वापस "+rs(g.total)+(Math.abs(g.fark||0)>1?" · "+rs(g.fark)+" फ़र्क!":" · ✅ पूरा"));if(Math.abs(g.fark||0)>1)try{beep(false)}catch(x){}return}
  const e=SG.expAt(g.ts).exp,df=r2(num(g.total)-e),bad=df<-5;
  toast((bad?"🚨 ":"💵 ")+(g.byName||"")+" ने गल्ला "+(g.kind==="close"?"बंद किया":"गिना")+": "+rs(g.total)+" · होना चाहिए "+rs(e)+" → "+(Math.abs(df)<=5?"✅ ठीक":df>0?"+"+rs(df)+" ज़्यादा":rs(-df)+" कम"));
  if(bad)try{beep(false)}catch(x){}}catch(x){}},900)}

/* ---------- नोट गिनने वाली शीट ---------- */
SG.sheet=function(kind){
  if(!biller()){openBiller(()=>SG.sheet(kind));return}
  if(S.billsDate!==today()){toast("गल्ला सिर्फ़ आज की तारीख पर — ऊपर तारीख आज करें");return}
  const st=SG.state();
  if(kind==="open"&&st.open){toast("आज गल्ला पहले ही खुल चुका — अब ‘गिनती’ करें");kind="count"}
  const [ic,tt]=KIND[kind];const n={};let coins="",amt="",to=OUT_TO[1],note="",keep="",per="";
  const tot=()=>kind==="out"?num(amt):r2(NOTES.reduce((a,v)=>a+v*num(n[v]),0)+num(coins));
  const draw=()=>{
    $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px sg-sh" role="dialog" aria-label="${tt}"><div class="grab"></div>
    <div class="sh-head"><div><h3>${ic} ${tt}</h3><span class="note">${esc(biller())} · ${ftime(Date.now())}</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    ${kind==="out"?`<label class="fld">कितने रुपये? ₹<input class="inp" id="sgAmt" inputmode="numeric" value="${esc(amt)}" autocomplete="off"></label>
      <div class="seg">${OUT_TO.map(x=>`<button class="chip" data-sgto="${esc(x)}" aria-pressed="${x===to}">${esc(x)}</button>`).join("")}</div>
      ${to===ADV?`<label class="fld">किसको दिए (नाम)<input class="inp" id="sgPer" value="${esc(per)}" placeholder="जैसे रविंद्र जी" list="sgPerL"></label><datalist id="sgPerL">${[...new Set(SG.advAll().filter(g=>g.person).map(g=>g.person))].map(n=>`<option value="${esc(n)}">`).join("")}</datalist>`:""}
      <label class="fld">${to===ADV?"किस लिए / कहाँ से":"नोट (चाहें तो)"}<input class="inp" id="sgNote" value="${esc(note)}" placeholder="${to===ADV?"जैसे: मजीशा से डिस्पोज़ल":"जैसे: शाम को विक्रम जी आए थे"}"></label>`
    :`<p class="note" style="margin:0 0 8px">${kind==="open"?"सुबह गल्ले में जो नोट हैं, गिनकर लिखें":kind==="close"?"दुकान बंद करते समय पूरे नोट गिनकर लिखें":"अभी गल्ले के नोट गिनकर लिखें"} — कितने-कितने नोट हैं:</p>
    <div class="sg-grid">${NOTES.map(v=>`<label class="sg-row"><span class="sg-n">₹${v}</span><span class="sg-x">×</span><input class="inp" data-sgn="${v}" inputmode="numeric" value="${esc(n[v]||"")}" placeholder="0" aria-label="₹${v} के कितने नोट"><b data-sgr="${v}">${n[v]?rs(v*num(n[v])):""}</b></label>`).join("")}
      <label class="sg-row"><span class="sg-n">🪙 सिक्के</span><span class="sg-x">₹</span><input class="inp" id="sgCoin" inputmode="numeric" value="${esc(coins)}" placeholder="0" aria-label="सिक्कों के कुल रुपये"><b></b></label></div>
    ${kind==="close"?`<label class="fld" style="margin-top:8px">इसमें से कल के लिए गल्ले में छोड़ा ₹<input class="inp" id="sgKeep" inputmode="numeric" value="${esc(keep)}" placeholder="जैसे 1000"></label>`:""}`}
    <div class="amtline sg-tot"><span>कुल</span><b id="sgTot">${rs(tot())}</b></div>
    <button class="big" data-sgsave>✓ सेव करें</button></div></div>`;
    const f=kind==="out"?$("#sgAmt"):document.querySelector('[data-sgn="500"]');if(f)setTimeout(()=>f.focus(),60);
  };
  draw();const sh=$("#sheet");
  sh.oninput=e=>{const t=e.target;
    if(t.dataset.sgn){n[t.dataset.sgn]=t.value.replace(/\D/g,"");const r=sh.querySelector(`[data-sgr="${t.dataset.sgn}"]`);if(r)r.textContent=n[t.dataset.sgn]?rs(+t.dataset.sgn*num(n[t.dataset.sgn])):""}
    if(t.id==="sgCoin")coins=t.value;if(t.id==="sgAmt")amt=t.value;if(t.id==="sgNote")note=t.value;if(t.id==="sgPer")per=t.value;if(t.id==="sgKeep")keep=t.value;
    const T=$("#sgTot");if(T)T.textContent=rs(tot())};
  sh.onkeydown=e=>{if(e.key!=="Enter")return;const I=[...sh.querySelectorAll("input")];const i=I.indexOf(e.target);if(i>-1&&i<I.length-1){e.preventDefault();I[i+1].focus()}};
  sh.onchange=null;
  sh.onclick=async e=>{
    if(e.target.matches("[data-close]")){closeSheet();return}
    const o=e.target.closest("[data-sgto]");if(o){to=o.dataset.sgto;draw();return}
    if(!e.target.closest("[data-sgsave]"))return;
    const total=tot();
    if(kind==="out"&&!(total>0)){toast("कितने रुपये — यह लिखें");return}
    if(kind==="out"&&to===ADV&&!String(per).trim()){toast("किस साथी को दिए — नाम लिखें");return}
    if(kind!=="out"&&!(total>0)&&!confirm("गल्ले में कुछ नहीं है — फिर भी सेव करें?"))return;
    const notes={};NOTES.forEach(v=>{if(num(n[v])>0)notes[v]=num(n[v])});
    const doc={kind,total,ts:Date.now(),date:today(),by:S.uid||"",byName:biller(),
      ...(kind==="out"?{to,note:String(note).trim().slice(0,120),...(to===ADV?{adv:true,person:String(per).trim().slice(0,30)}:{})}:{notes,coins:num(coins)}),...(kind==="close"&&String(keep).trim()!==""?{keep:num(keep)}:{})};
    const id="g"+doc.ts.toString(36)+Math.random().toString(36).slice(2,5);
    try{if(S.demo)S.galla.push({id,...doc});else await S.db.collection("days/"+today()+"/galla").doc(id).set(doc);
      if(!S.galla.some(g=>g.id===id))S.galla.push({id,...doc});
      LSg.set("sg_last_"+today(),String(doc.ts));closeSheet();beep(true);
      toast(kind==="out"?"✓ "+rs(total)+" दर्ज हुए"+(doc.adv?" — लौटने पर 🔁 हिसाब ज़रूर दर्ज करें":""):"✓ गल्ला "+(kind==="open"?"खुला":kind==="close"?"बंद हुआ":"गिनती सेव")+" · कुल "+rs(total)+" — धन्यवाद 🙏");
      if(kind==="close"&&doc.keep!=null&&S.isOwner)saveSetting({float:doc.keep});
      if(S.tab==="day")renderDay();const nb=document.getElementById("sgNag");if(nb)nb.remove();
    }catch(err){toast("सेव नहीं हुआ — नेट देखें और दोबारा दबाएँ")}
  };
};

/* ---------- दिन का हिसाब: गल्ला कार्ड ---------- */
SG.dayHTML=function(){
  const st=SG.state(),isT=S.billsDate===today();
  const btns=isT?`<div class="sg-btns">${!st.open?`<button class="big" data-sg="open">🌅 गल्ला खोलें</button>`:`<button class="big" data-sg="count">💵 अभी गिनें</button>`}
    <button class="big ghost" data-sg="out">📤 पैसा दिया</button>${SG.openAdv().length?`<button class="big" data-sgback>🔁 खरीद का हिसाब (${SG.openAdv().length} बाकी)</button>`:""}${st.open&&!st.close?`<button class="big ghost" data-sg="close">🔒 गल्ला बंद</button>`:""}</div>`:"";
  const advL=SG.openAdv(),advH=advL.length?`<div class="warn">🛒 हिसाब बाकी: ${advL.map(x=>`${esc(x.person||"साथी")} ${rs(x.total)} (${x.date!==today()?fdate(x.date)+" ":""}${ftime(x.ts)})`).join(" · ")}</div>`:"";
  const rowsStaff=st.L.map(g=>`<div class="li"><div class="mid"><b>${KIND[g.kind][0]} ${KIND[g.kind][1]}${g.kind==="out"&&g.to?" · "+esc(g.to):""}${g.person?" · "+esc(g.person):""}</b><span>${ftime(g.ts)} · ${esc(g.byName||"")}</span></div><div class="rt">${rs(g.total)}</div></div>`).join("");
  if(!S.isOwner)return `<div class="card2" data-ds="paisa"><h3>💵 गल्ला</h3>
    <p class="note" style="margin:0 0 8px">सुबह खोलें, हर ${SG.hrs()} घंटे में एक बार नोट गिनें, रात को बंद करें — बस इतना।</p>${advH}${btns}
    ${rowsStaff?`<div class="list" style="margin:8px 0 0">${rowsStaff}</div>`:""}</div>`;
  const rows=st.L.map(g=>{if(g.kind==="back")return `<div class="li"><div class="mid"><b>🔁 ${esc(g.person||"")} · खरीद ${rs(g.buy)} + वापस ${rs(g.total)}</b><span>${ftime(g.ts)} · ${esc(g.byName||"")} · दिए थे ${rs(g.given)}${g.note?" · "+esc(g.note):""}</span></div><div class="rt">${Math.abs(g.fark||0)<=1?'<span class="pill green">✓ पूरा</span>':`<span class="pill red">${rs(g.fark)} फ़र्क</span>`}</div></div>`;
    if(g.kind==="out")return `<div class="li"><div class="mid"><b>📤 ${rs(g.total)} · ${esc(g.to||"दिए")}${g.person?" "+esc(g.person):""}</b><span>${ftime(g.ts)} · ${esc(g.byName||"")}${g.note?" · "+esc(g.note):""}</span></div><div class="rt"></div></div>`;
    if(g.kind==="open")return `<div class="li"><div class="mid"><b>🌅 गल्ला खोला</b><span>${ftime(g.ts)} · ${esc(g.byName||"")}${notesTxt(g)}</span></div><div class="rt">${rs(g.total)}</div></div>`;
    const x=SG.expAt(g.ts),df=r2(num(g.total)-x.exp);
    return `<div class="li"><div class="mid"><b>${KIND[g.kind][0]} ${KIND[g.kind][1]} · ${rs(g.total)}</b><span>${ftime(g.ts)} · ${esc(g.byName||"")} · होना चाहिए ${rs(x.exp)}${notesTxt(g)}${g.keep!=null?" · कल के लिए छोड़ा "+rs(g.keep):""}</span></div><div class="rt">${pill(df)}</div></div>`}).join("");
  const now=SG.expAt(Date.now()),lastC=st.last,gap=lastC?Math.round((Date.now()-lastC.ts)/36e5*10)/10:null;
  return `<div class="card2" data-ds="paisa"><h3>💵 गल्ला — दिन भर <small class="note">(सिर्फ़ आपको)</small></h3>
    <div class="stkmeta"><span>${st.open?"सुबह खुला ("+ftime(st.open.ts)+")":"सुबह खुला पैसा (सेटिंग से)"}</span><b>${rs(now.base)}</b></div>
    <div class="stkmeta"><span>+ नकद बिक्री</span><b>${rs(now.cash)}</b></div>
    ${now.jama?`<div class="stkmeta"><span>+ उधारी वसूली (नकद)</span><b>${rs(now.jama)}</b></div>`:""}
    ${now.kh||now.pu?`<div class="stkmeta"><span>− नकद खर्चा / गल्ले से खरीद</span><b>${rs(now.kh+now.pu)}</b></div>`:""}
    ${now.out?`<div class="stkmeta"><span>− दिया / निकाला</span><b>${rs(now.out)}</b></div>`:""}
    ${now.rv?`<div class="stkmeta"><span>${now.rv<0?"− वापसी में नकद लौटाया":"+ लौटाए माल का नकद मिला"}</span><b>${rs(Math.abs(now.rv))}</b></div>`:""}
    <div class="amtline" style="margin:0"><span>अभी गल्ले में होना चाहिए</span><b>${rs(now.exp)}</b></div>
    ${isT&&st.open&&!st.close&&gap!=null&&gap>=SG.hrs()?`<div class="warn">⏰ आख़िरी गिनती ${gap} घंटे पहले हुई थी</div>`:""}
    ${isT&&!st.open?`<div class="warn">🌅 आज अभी तक गल्ला नहीं खोला गया</div>`:""}
    ${advH}${rows?`<div class="list" style="margin:8px 0">${rows}</div>`:""}
    ${btns}
    <div class="seg" style="margin-top:8px"><span class="note" style="align-self:center">कर्मचारी को गिनती की याद हर</span>${[2,3,4].map(h=>`<button class="chip" data-sghrs="${h}" aria-pressed="${SG.hrs()===h}">${h} घंटे</button>`).join("")}</div>
  </div>`;
};
const notesTxt=g=>{const N=g.notes||{};const k=Object.keys(N).sort((a,b)=>b-a);return k.length?" · "+k.map(v=>v+"×"+N[v]).join(", ")+(g.coins?" + सिक्के "+g.coins:""):""};
const pill=df=>Math.abs(df)<=5?'<span class="pill green">✓ ठीक</span>':df<0?`<span class="pill red">${rs(-df)} कम</span>`:`<span class="pill blue">+${rs(df)}</span>`;

/* रात की रिपोर्ट (मालिक) के लिए एक लाइन */
SG.ownerLine=function(){const st=SG.state();if(!st.L.length)return "";const c=st.L.filter(g=>g.kind==="count").length;
  let t="💵 गल्ला: "+(st.open?"खुला "+rs(st.open.total):"खोला नहीं")+(c?" · "+c+" बार गिना":"");
  if(st.close){const df=r2(num(st.close.total)-SG.expAt(st.close.ts).exp);t+=" · बंद "+rs(st.close.total)+" ("+(Math.abs(df)<=5?"✅ ठीक":df<0?"🚨 "+rs(-df)+" कम":"+"+rs(df)+" ज़्यादा")+")"}else t+=" · ⚠ बंद नहीं किया";
  const o=st.outs.reduce((a,x)=>a+num(x.total),0);if(o)t+=" · दिया "+rs(o);
  const oa=SG.openAdv();if(oa.length)t+="\n   🛒 खरीद का हिसाब बाकी: "+oa.map(x=>(x.person||"साथी")+" "+rs(x.total)).join(", ");
  const fk=st.L.filter(g=>g.kind==="back"&&Math.abs(g.fark||0)>1);if(fk.length)t+="\n   🚨 हिसाब में फ़र्क: "+fk.map(g=>(g.person||"")+" "+rs(g.fark)).join(", ");
  const bad=st.L.filter(g=>g.kind==="count").map(g=>r2(num(g.total)-SG.expAt(g.ts).exp)).filter(d=>d<-5);if(bad.length)t+="\n   🚨 "+bad.length+" गिनती में कमी मिली";
  return t+"\n"};

/* ---------- कर्मचारी को याद (बिलिंग पर छोटी पट्टी) ---------- */
SG.nag=function(force){
  if(S.isOwner||S.demo&&!force||!biller()||S.billsDate!==today())return false;
  if(document.getElementById("sgNag"))return false;
  const h=new Date().getHours()+new Date().getMinutes()/60;if(!force&&(h<7||h>=23.5))return false;
  const st=SG.state();let msg="",k="";
  if(SG.openAdv().some(x=>Date.now()-x.ts>=2*36e5)){const x=SG.openAdv()[0];msg=`🛒 ${x.person||"साथी"} को ${rs(x.total)} खरीद के लिए दिए थे (${x.date!==today()?fdate(x.date)+" ":""}${ftime(x.ts)}) — बिल और बचे पैसे लेकर हिसाब दर्ज करें`;k="back"}
  else if(!st.open){msg="🌅 आज का गल्ला खोलें — सुबह गल्ले में कितने नोट हैं, गिनकर लिखें";k="open"}
  else if(!st.close&&h>=21.5){msg="🔒 दुकान बंद करते समय गल्ला बंद करें — नोट गिनकर लिखें";k="close"}
  else if(!st.close&&st.last&&Date.now()-st.last.ts>=SG.hrs()*36e5){msg="💵 गल्ला गिनती का समय — नोट गिनकर लिख दें (1 मिनट)";k="count"}
  if(!k)return false;
  const sk="sg_snz_"+today()+"_"+k;if(!force&&Date.now()-(+LSg.get(sk)||0)<20*60000)return false;
  const el=document.createElement("div");el.id="sgNag";el.className="sgnag";el.setAttribute("role","status");
  el.dataset.k=k;el.innerHTML=`<b>${msg}</b><div><button class="nag-go" data-sgnag="${k}">अभी करें</button><button data-sgnag="later">20 मिनट बाद</button></div>`;
  const m=document.getElementById("main");if(m)m.prepend(el);else document.body.appendChild(el);return true;
};
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-sg]");if(g){SG.sheet(g.dataset.sg);return}
  const h=e.target.closest("[data-sghrs]");if(h&&S.isOwner){saveSetting({gallaHrs:+h.dataset.sghrs});return}
  const n=e.target.closest("[data-sgnag]");if(n){const el=document.getElementById("sgNag");const k=el?el.dataset.k:"count";
    if(el)el.remove();if(n.dataset.sgnag==="later"){LSg.set("sg_snz_"+today()+"_"+k,String(Date.now()));return}if(n.dataset.sgnag==="back"){SG.backSheet();return}SG.sheet(n.dataset.sgnag)}
  if(e.target.closest("[data-sgback]")){SG.backSheet();return}
});
setTimeout(()=>{try{SG.loadOld().then(()=>{if(S.tab==="day"&&typeof renderDay==="function")renderDay()})}catch(e){}},8000);setTimeout(()=>{try{SG.nag()}catch(e){}},25000);setInterval(()=>{try{SG.nag()}catch(e){}},60000);

const css=document.createElement("style");css.textContent=`
.sg-grid{display:grid;gap:6px}.sg-row{display:grid;grid-template-columns:72px 16px 1fr 84px;align-items:center;gap:6px}
.sg-row .sg-n{font-weight:800;font-size:17px}.sg-row .sg-x{color:var(--muted);text-align:center}.sg-row .inp{margin:0;font-size:20px;text-align:center;padding:8px}
.sg-row b{text-align:right;font-size:15px;color:var(--muted)}.sg-tot{margin:10px 0}.sg-tot b{font-size:26px}
.sg-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sg-btns .big:first-child{grid-column:1/-1}
html.camon .sgnag{display:none}
.sgnag{position:relative;margin:8px 0 10px;background:var(--warn-bg,#fff7e6);color:var(--ink);border:2px solid var(--haldi,#f59e0b);border-radius:16px;padding:12px 14px;display:grid;gap:8px;animation:pulse .5s ease}
.sgnag b{font-size:15px;line-height:1.35}.sgnag div{display:flex;gap:8px}.sgnag button{flex:1;border:0;border-radius:12px;padding:10px;font-weight:700;background:var(--chip-bg,#eee);color:var(--ink)}
.sgnag .nag-go{background:var(--haldi);color:var(--haldi-ink)}`;
document.head.appendChild(css);
})();
