/* ↩️ SV — माल वापसी
   बिक्री वापसी: ग्राहक ने माल लौटाया → नकद/UPI लौटाया या उधार खाते में कम; ठीक माल फिर स्टॉक में, खराब अलग दर्ज।
   खरीद वापसी: दुकान/177 MH को माल लौटाया → स्टॉक घटे, सप्लायर का बाकी घटे या नकद गल्ले में आए।
   डेटा: returns/{id} — बिल/खरीद में कोई बदलाव नहीं (वो पक्के रहते हैं), वापसी अलग दर्ज। */
(function(){
"use strict";
const SV=window.SV={};
const num=v=>{const n=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(n)?n:0};
const r2=v=>Math.round(v*100)/100;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
S.returns=[];
SV.listen=function(db){if(!db||SV._un)return;let first=true;
  SV._un=db.collection("returns").orderBy("ts","desc").limit(400).onSnapshot(s=>{const prev=new Set(S.returns.map(r=>r.id));
    S.returns=s.docs.map(d=>({id:d.id,...d.data()}));
    if(S.isOwner&&!first)S.returns.filter(r=>!prev.has(r.id)&&r.by!==S.uid).forEach(r=>toast("↩️ "+(r.byName||"")+": "+(r.kind==="sale"?"ग्राहक का माल वापस":"माल "+(r.supName||"दुकान")+" को लौटाया")+" · "+rs(r.total)+(r.why?" ("+r.why+")":"")));
    first=false;try{if(typeof renderPane==="function"&&["day","bills","kharid"].includes(S.tab))renderPane()}catch(e){}},()=>{})};
const live=()=>(S.returns||[]).filter(r=>!r.void);
SV.ofBill=no=>live().filter(r=>r.kind==="sale"&&r.billNo===no);
SV.ofPurch=id=>live().filter(r=>r.kind==="purchase"&&r.pid===id);
SV.day=d=>live().filter(r=>r.date===d);
/* गल्ले पर असर: बिक्री वापसी में नकद लौटाया (−), खरीद वापसी में नकद मिला (+) */
SV.cashAt=function(d,t0,t){return r2(SV.day(d).filter(r=>r.ts>t0&&r.ts<=t).reduce((a,r)=>a+(r.kind==="sale"&&r.refund==="cash"?-num(r.total):r.kind==="purchase"&&r.refund==="cash"?num(r.total):0),0))};
/* सप्लायर का बाकी जितना घटा */
SV.supCredit=id=>r2(live().filter(r=>r.kind==="purchase"&&r.supId===id&&r.refund==="due").reduce((a,r)=>a+num(r.total),0));
const trackedIt=id=>{const it=item(id);return it&&it.track};

/* ---------- बिक्री वापसी ---------- */
SV.billBtnHTML=function(b){if(!b||b.cancelled||b.mode==="inst"||b.settled===false||S.demo&&false)return "";const R=SV.ofBill(b.no);
  return `${R.length?`<div class="sv-done">↩️ इस बिल पर वापसी: ${R.map(r=>rs(r.total)+" ("+fdate(r.date).slice(0,5)+", "+esc(r.byName||"")+")").join(", ")}</div>`:""}
  <button class="big ghost" data-svsale="${esc(b.no)}" style="margin-top:8px">↩️ माल वापसी (ग्राहक ने लौटाया)</button>`};
SV.saleSheet=function(b){
  if(!biller()){openBiller(()=>SV.saleSheet(b));return}
  const prev={};SV.ofBill(b.no).forEach(r=>(r.lines||[]).forEach(l=>{prev[l.k]=(prev[l.k]||0)+num(l.qty)}));
  const L=(b.lines||[]).map((l,i)=>({k:i+"|"+l.id,i,id:l.id,name:l.name,unit:l.unit,rate:l.free?0:num(l.rate),max:r2(num(l.qty)-(prev[i+"|"+l.id]||0)),q:0})).filter(l=>l.max>0);
  if(!L.length){toast("इस बिल का सारा माल पहले ही वापस हो चुका");return}
  const party=b.mode==="udhar"&&b.partyId?(S.parties||[]).find(p=>p.id===b.partyId):null;
  const WHY=["खराब निकला","एक्सपायर","ग्राहक ने बदला","गलत सामान दिया","ज़्यादा ले गए"];
  const st={why:"",refund:party?"udhar":"cash",good:true};
  const tot=()=>r2(L.reduce((a,l)=>a+l.q*l.rate,0));
  const draw=()=>{$("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="माल वापसी"><div class="grab"></div>
    <div class="sh-head"><div><h3>↩️ माल वापसी</h3><span class="note">बिल ${esc(b.no)} · ${fdate(b.date)} · ${esc(b.partyName||"")}</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <p class="note" style="margin:0 0 8px">कौन-सा सामान कितना लौटाया:</p>
    <div class="sbe-list">${L.map((l,j)=>`<div class="sbe-row"><div class="sbe-n"><b>${esc(l.name)}</b><span>₹${l.rate} · अधिकतम ${fq(l.max,l.unit)}</span></div>
      <div class="sbe-q"><button data-svm="${j}" aria-label="कम">−</button><input data-svq="${j}" inputmode="decimal" value="${l.q||""}" placeholder="0" aria-label="${esc(l.name)} कितना लौटाया"><button data-svp="${j}" aria-label="ज़्यादा">+</button></div>
      <b class="sbe-a">₹${r2(l.q*l.rate)}</b></div>`).join("")}</div>
    <h4 style="margin:10px 0 6px">क्यों?</h4><div class="seg">${WHY.map(w=>`<button class="chip" data-svw="${esc(w)}" aria-pressed="${st.why===w}">${esc(w)}</button>`).join("")}</div>
    <h4 style="margin:10px 0 6px">लौटाया माल</h4><div class="paym" style="margin:0"><button data-svg="1" aria-pressed="${st.good}">✅ ठीक है — फिर बिकेगा</button><button data-svg="0" aria-pressed="${!st.good}">🗑️ खराब — नहीं बिकेगा</button></div>
    <h4 style="margin:10px 0 6px">पैसा कैसे लौटाया</h4><div class="paym" style="margin:0">${party?`<button data-svr="udhar" aria-pressed="${st.refund==="udhar"}">📒 ${esc(party.name)} के उधार में कम</button>`:""}<button data-svr="cash" aria-pressed="${st.refund==="cash"}">💵 नकद लौटाया</button><button data-svr="upi" aria-pressed="${st.refund==="upi"}">📱 UPI से लौटाया</button></div>
    <div class="amtline" style="margin:12px 0"><span>वापसी की रकम</span><b id="svTot">${rs(tot())}</b></div>
    <button class="big" data-svsave>✓ वापसी दर्ज करें</button></div></div>`};
  draw();const sh=$("#sheet");
  const setQ=(j,v)=>{const l=L[j];l.q=Math.max(0,Math.min(l.max,r2(v)))};
  sh.oninput=e=>{const q=e.target.closest("[data-svq]");if(!q)return;const j=+q.dataset.svq;setQ(j,num(q.value));if(num(q.value)>L[j].max){q.value=L[j].max;toast("इससे ज़्यादा इस बिल में नहीं था")}
    q.closest(".sbe-row").querySelector(".sbe-a").textContent="₹"+r2(L[j].q*L[j].rate);$("#svTot").textContent=rs(tot())};
  sh.onkeydown=null;sh.onchange=null;
  sh.onclick=async e=>{const t=e.target;
    if(t.matches("[data-close]")){closeSheet();return}
    const m=t.closest("[data-svm]");if(m){const j=+m.dataset.svm;setQ(j,L[j].q-(L[j].unit==="kg"?.25:1));draw();return}
    const p=t.closest("[data-svp]");if(p){const j=+p.dataset.svp;setQ(j,L[j].q+(L[j].unit==="kg"?.25:1));draw();return}
    const w=t.closest("[data-svw]");if(w){st.why=w.dataset.svw;if(/खराब|एक्सपायर/.test(st.why))st.good=false;draw();return}
    const g=t.closest("[data-svg]");if(g){st.good=g.dataset.svg==="1";draw();return}
    const rf=t.closest("[data-svr]");if(rf){st.refund=rf.dataset.svr;draw();return}
    if(!t.closest("[data-svsave]"))return;
    const lines=L.filter(l=>l.q>0).map(l=>({k:l.k,id:l.id,name:l.name,unit:l.unit,qty:l.q,rate:l.rate,amt:r2(l.q*l.rate),restock:st.good}));
    if(!lines.length){toast("कितना लौटाया — मात्रा लिखें");return}if(!st.why){toast("वापसी की वजह चुनें");return}
    const total=r2(lines.reduce((a,l)=>a+l.amt,0)),ts=Date.now();
    const doc={kind:"sale",billNo:b.no,billDate:b.date||"",date:today(),ts,by:S.uid||"",byName:biller(),lines,total,refund:st.refund,why:st.why,good:st.good,
      partyId:st.refund==="udhar"&&party?party.id:"",partyName:b.partyName||"",cost:r2(lines.reduce((a,l)=>{const bl=(b.lines||[])[+l.k.split("|")[0]];return a+num(bl&&bl.cost)*l.qty},0))};
    const id="v"+uid();
    try{
      if(S.demo)S.returns.unshift({id,...doc});else await S.db.collection("returns").doc(id).set(doc);
      if(!S.returns.some(r=>r.id===id))S.returns.unshift({id,...doc});
      if(st.good){const pr=lines.filter(l=>trackedIt(l.id)).map(l=>[l.id,l.qty]);if(pr.length)await adjStock(pr,"वापसी बिल "+b.no)}
      if(st.refund==="udhar"&&party){const le={ts,date:today(),partyId:party.id,partyName:party.name,type:"jama",mode:"return",amt:total,billNo:b.no,note:"माल वापसी ("+st.why+")",by:S.uid||"",byName:biller()};
        if(S.demo)S.ledger.push({id:"r"+id,...le});else await S.db.collection("ledger").doc("r"+id).set(le)}
      closeSheet();try{beep(true)}catch(x){}
      toast("↩️ वापसी दर्ज · "+rs(total)+(st.refund==="cash"?" — गल्ले से नकद लौटाएँ":st.refund==="upi"?" — UPI से लौटाएँ":" — उधार में कम हुआ")+(st.good?" · माल स्टॉक में":""));
    }catch(err){toast("वापसी सेव नहीं हुई — नेट देखकर दोबारा दबाएँ")}
  };
};

/* ---------- खरीद वापसी ---------- */
SV.purBtnHTML=function(p){if(!p||p.cancelled)return "";const R=SV.ofPurch(p.id);
  return `${R.length?`<div class="sv-done">↩️ इस खरीद से लौटाया: ${R.map(r=>rs(r.total)+" ("+fdate(r.date).slice(0,5)+")").join(", ")}</div>`:""}
  <button class="big ghost" data-svpur="${esc(p.id)}" style="margin-top:8px">↩️ माल ${p.src==="mh"?"177 MH को":"दुकान को"} लौटाया</button>`};
SV.purSheet=function(p){
  if(!biller()){openBiller(()=>SV.purSheet(p));return}
  const prev={};SV.ofPurch(p.id).forEach(r=>(r.lines||[]).forEach(l=>{prev[l.k]=(prev[l.k]||0)+num(l.qty)}));
  const L=(p.lines||[]).map((l,i)=>({k:i+"|"+(l.id||l.name),i,id:l.id||"",name:l.name,unit:l.unit,rate:num(l.amt)&&num(l.qty)?r2(num(l.amt)/num(l.qty)):num(l.rate),max:r2(num(l.qty)-(prev[i+"|"+(l.id||l.name)]||0)),q:0})).filter(l=>l.max>0);
  if(!L.length){toast("इस खरीद का सारा माल पहले ही लौट चुका");return}
  const mh=p.src==="mh",WHY=["खराब/टूटा","एक्सपायर","ज़्यादा आ गया","गलत माल","बिका नहीं"];
  const st={why:"",refund:mh?"mh":(p.pay==="udhar"&&num(p.due)>0?"due":"cash")};
  const tot=()=>r2(L.reduce((a,l)=>a+l.q*l.rate,0));
  const draw=()=>{$("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="खरीद वापसी"><div class="grab"></div>
    <div class="sh-head"><div><h3>↩️ माल लौटाया</h3><span class="note">${esc(p.supName||"")} · खरीद ${fdate(p.date)}</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <div class="sbe-list">${L.map((l,j)=>`<div class="sbe-row"><div class="sbe-n"><b>${esc(l.name)}</b><span>₹${l.rate} · अधिकतम ${fq(l.max,l.unit)}</span></div>
      <div class="sbe-q"><button data-svm="${j}" aria-label="कम">−</button><input data-svq="${j}" inputmode="decimal" value="${l.q||""}" placeholder="0" aria-label="${esc(l.name)} कितना लौटाया"><button data-svp="${j}" aria-label="ज़्यादा">+</button></div>
      <b class="sbe-a">₹${r2(l.q*l.rate)}</b></div>`).join("")}</div>
    <h4 style="margin:10px 0 6px">क्यों?</h4><div class="seg">${WHY.map(w=>`<button class="chip" data-svw="${esc(w)}" aria-pressed="${st.why===w}">${esc(w)}</button>`).join("")}</div>
    <h4 style="margin:10px 0 6px">पैसे का हिसाब</h4><div class="paym" style="margin:0">${mh?`<button data-svr="mh" aria-pressed="true">🏥 177 MH के हिसाब में कम</button>`:`<button data-svr="due" aria-pressed="${st.refund==="due"}">📒 दुकान का बाकी घटे</button><button data-svr="cash" aria-pressed="${st.refund==="cash"}">💵 नकद वापस मिला</button>`}</div>
    <div class="amtline" style="margin:12px 0"><span>लौटाए माल की रकम</span><b id="svTot">${rs(tot())}</b></div>
    <button class="big" data-svsave>✓ दर्ज करें</button></div></div>`};
  draw();const sh=$("#sheet");
  const setQ=(j,v)=>{const l=L[j];l.q=Math.max(0,Math.min(l.max,r2(v)))};
  sh.oninput=e=>{const q=e.target.closest("[data-svq]");if(!q)return;const j=+q.dataset.svq;setQ(j,num(q.value));if(num(q.value)>L[j].max){q.value=L[j].max;toast("इससे ज़्यादा इस खरीद में नहीं था")}
    q.closest(".sbe-row").querySelector(".sbe-a").textContent="₹"+r2(L[j].q*L[j].rate);$("#svTot").textContent=rs(tot())};
  sh.onkeydown=null;sh.onchange=null;
  sh.onclick=async e=>{const t=e.target;
    if(t.matches("[data-close]")){closeSheet();return}
    const m=t.closest("[data-svm]");if(m){const j=+m.dataset.svm;setQ(j,L[j].q-(L[j].unit==="kg"?.25:1));draw();return}
    const pp=t.closest("[data-svp]");if(pp){const j=+pp.dataset.svp;setQ(j,L[j].q+(L[j].unit==="kg"?.25:1));draw();return}
    const w=t.closest("[data-svw]");if(w){st.why=w.dataset.svw;draw();return}
    const rf=t.closest("[data-svr]");if(rf){st.refund=rf.dataset.svr;draw();return}
    if(!t.closest("[data-svsave]"))return;
    const lines=L.filter(l=>l.q>0).map(l=>({k:l.k,id:l.id,name:l.name,unit:l.unit,qty:l.q,rate:l.rate,amt:r2(l.q*l.rate)}));
    if(!lines.length){toast("कितना लौटाया — मात्रा लिखें");return}if(!st.why){toast("वजह चुनें");return}
    const total=r2(lines.reduce((a,l)=>a+l.amt,0)),ts=Date.now();
    const doc={kind:"purchase",pid:p.id,pDate:p.date||"",supId:p.supId||"",supName:p.supName||"",src:p.src||"",date:today(),ts,by:S.uid||"",byName:biller(),lines,total,refund:st.refund,why:st.why};
    const id="v"+uid();
    try{
      if(S.demo)S.returns.unshift({id,...doc});else await S.db.collection("returns").doc(id).set(doc);
      if(!S.returns.some(r=>r.id===id))S.returns.unshift({id,...doc});
      const pr=lines.filter(l=>l.id&&trackedIt(l.id)).map(l=>[l.id,-l.qty]);if(pr.length)await adjStock(pr,"माल लौटाया · "+(p.supName||""));
      closeSheet();try{beep(true)}catch(x){}
      toast("↩️ "+rs(total)+" का माल लौटाया दर्ज"+(st.refund==="due"?" · दुकान का बाकी घटा":st.refund==="cash"?" · नकद गल्ले में रखें":" · 177 MH के हिसाब में"));
    }catch(err){toast("सेव नहीं हुआ — नेट देखकर दोबारा दबाएँ")}
  };
};

/* दिन के हिसाब / रिपोर्ट के लिए */
SV.dayLine=function(d){const R=SV.day(d);if(!R.length)return "";const s=R.filter(r=>r.kind==="sale"),p=R.filter(r=>r.kind==="purchase");const sum=a=>r2(a.reduce((x,r)=>x+num(r.total),0));
  return "↩️ माल वापसी:"+(s.length?" ग्राहक से "+s.length+" बार "+rs(sum(s))+(s.some(r=>r.refund==="cash")?" (नकद लौटाया "+rs(sum(s.filter(r=>r.refund==="cash")))+")":""):"")+(p.length?" · दुकान को लौटाया "+rs(sum(p)):"")+"\n"+
    s.slice(0,4).map(r=>"   "+r.billNo+" ("+(r.byName||"")+"): "+(r.lines||[]).map(l=>l.name+" "+fq(l.qty,l.unit)).join(", ")+" — "+r.why).join("\n")+(s.length?"\n":"")};
SV.saleTotal=d=>r2(SV.day(d).filter(r=>r.kind==="sale").reduce((a,r)=>a+num(r.total),0));
SV.saleCost=d=>r2(SV.day(d).filter(r=>r.kind==="sale").reduce((a,r)=>a+num(r.cost),0));

document.addEventListener("click",e=>{
  const s=e.target.closest("[data-svsale]");if(s){const no=s.dataset.svsale;const b=(S.dayBills||[]).find(x=>x.no===no)||(SV._bill&&SV._bill.no===no?SV._bill:null);if(b)SV.saleSheet(b);else toast("बिल नहीं मिला — आज के बिल में खोलें");return}
  const p=e.target.closest("[data-svpur]");if(p){const id=p.dataset.svpur;const x=(S.purchHist||[]).concat(S.purch||[]).find(y=>y.id===id);if(x)SV.purSheet(x);return}
});
const css=document.createElement("style");css.textContent=`.sv-done{margin:8px 0 0;padding:8px 10px;border-radius:12px;background:#fff7ed;color:#9a3412;font-size:13px;font-weight:600}`;
document.head.appendChild(css);
if(window.SF){const _o=SF.onDb;SF.onDb=function(db){_o(db);try{SV.listen(db)}catch(e){}}}
})();
