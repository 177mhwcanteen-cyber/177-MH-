/* 🏪 SOD — दुकान-वार ऑर्डर: कम स्टॉक (और जल्दी खत्म होने वाला) माल, जिस दुकान से आता है उसकी अलग सूची → उसी दुकान के WhatsApp पर।
   दुकान कैसे तय: सामान पर मालिक की चुनी दुकान (supId) → पिछली खरीद की दुकान → सामान में लिखा नाम → "तय नहीं"। भाव संदेश में नहीं जाते। */
(function(){
"use strict";
const SOD=window.SOD={};
const num=v=>{const n=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(n)?n:0};
const qOf=it=>+(S.pstock[it.id]&&S.pstock[it.id].qty)||0;
const need=it=>Math.max(lowOf(it),Math.ceil(lowOf(it)*2-qOf(it)));
const MHN="177 MH कैंटीन";
const LSo={get(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const clean=v=>{let d=String(v||"").replace(/\D/g,"");if(d.length>10)d=d.slice(-10);return d.length===10?d:""};
function lastBuy(id){const P=(S.purchHist||[]).concat(S.purch||[]).filter(p=>!p.cancelled&&(p.lines||[]).some(l=>l.id===id)).sort((a,b)=>b.ts-a.ts);return P[0]||null}
function supOf(it){
  if(it.supId){const s=(S.suppliers||[]).find(x=>x.id===it.supId);if(s)return {key:s.id,name:s.name,phone:clean(s.phone)};if(it.supId==="mh")return {key:"mh",name:MHN,phone:""}}
  const p=lastBuy(it.id);if(p){if(p.src==="mh")return {key:"mh",name:MHN,phone:""};const s=(S.suppliers||[]).find(x=>x.id===p.supId);return {key:p.supId||("n:"+p.supName),name:p.supName||(s&&s.name)||"दुकान",phone:clean(p.supPhone)||clean(s&&s.phone)}}
  if(it.supplier){const s=(S.suppliers||[]).find(x=>String(x.name).trim().toLowerCase()===String(it.supplier).trim().toLowerCase());return s?{key:s.id,name:s.name,phone:clean(s.phone)}:{key:"n:"+it.supplier,name:it.supplier,phone:""}}
  return {key:"",name:"दुकान तय नहीं",phone:""};
}
SOD.list=function(){
  const T=S.items.filter(i=>i.track&&i.active!==false&&!i.virtual);
  const fast={};if(window.SQ&&SQ.res)SQ.res.rows.forEach(r=>{if(r.stock!=null&&r.perDay>0)fast[r.id]=Math.floor(r.stock/r.perDay)});
  const Q=LSo.get("bh_ordq")||{};
  const L=T.filter(it=>isLow(it)||(fast[it.id]!=null&&fast[it.id]<=5)).map(it=>({it,q:Q[it.id]!=null?Q[it.id]:need(it),left:qOf(it),days:fast[it.id],sup:supOf(it)}));
  const G={};L.forEach(x=>{const k=x.sup.key||"_";(G[k]||(G[k]={...x.sup,rows:[]})).rows.push(x)});
  return Object.values(G).sort((a,b)=>(a.key?0:1)-(b.key?0:1)||b.rows.length-a.rows.length);
};
SOD.text=function(g){const sent=biller()||"";const ph=window.SF&&SF.orderPh?SF.orderPh():"";const R=g.rows.filter(x=>x.q>0);
  return `🛒 *177 MH कैंटीन — माल का ऑर्डर*\n${fdate(today())}\n────────\n${g.key&&g.key!=="_"?g.name+" जी, नमस्ते 🙏\nयह माल भेज दीजिए:\n":""}`+
    R.map((x,i)=>`${i+1}. ${x.it.name}${x.it.size&&!String(x.it.name).includes(x.it.size)?" "+x.it.size:""} — *${x.q} ${UNITS[x.it.unit]||x.it.unit}*`).join("\n")+
    `\n────────\nकुल ${R.length} सामान${sent?"\nभेजा: "+sent:""}${ph?" · मो. "+(SF.fmtPh?SF.fmtPh(ph):ph):""}\nधन्यवाद 🙏`};
SOD.sheet=function(){
  const draw=()=>{const G=SOD.list(),sent=LSo.get("bh_ordsent_"+today())||{};
    $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="दुकान-वार ऑर्डर"><div class="grab"></div>
    <div class="sh-head"><div><h3>🏪 दुकान-वार ऑर्डर</h3><span class="note">कम स्टॉक${window.SQ&&SQ.res?" + 5 दिन में खत्म होने वाला":""} · हर दुकान को अलग सूची</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    ${G.length?G.map((g,gi)=>`<div class="card2 sod-g"><div class="sod-h"><div><b>${g.key?"🏪":"❓"} ${esc(g.name)}</b><span class="note">${g.rows.length} सामान${g.phone?" · "+esc(g.phone):g.key&&g.key!=="mh"?" · नंबर नहीं":""}${sent[g.key||"_"]?" · ✓ भेजा "+sent[g.key||"_"]:""}</span></div></div>
      <div class="list" style="margin:6px 0">${g.rows.map(x=>`<div class="li"><div class="mid"><b>${esc(x.it.name)}</b><span>बचे ${x.left<=0?"0 (खत्म)":fq(x.left,x.it.unit)}${x.days!=null&&x.days<=5?" · ~"+x.days+" दिन चलेगा":""}</span>
        ${!g.key&&S.isOwner?`<select class="inp sod-sel" data-sodsup="${esc(x.it.id)}" aria-label="${esc(x.it.name)} किस दुकान से"><option value="">— किस दुकान से आता है? —</option><option value="mh">${MHN}</option>${(S.suppliers||[]).map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select>`:""}</div>
        <div class="cstep2"><button type="button" data-sodm="${esc(x.it.id)}" aria-label="कम">−</button><input class="inp" data-sodq="${esc(x.it.id)}" inputmode="numeric" value="${x.q}" aria-label="${esc(x.it.name)} कितना मँगाना"><button type="button" data-sodp="${esc(x.it.id)}" aria-label="ज़्यादा">+</button></div></div>`).join("")}</div>
      ${g.key==="mh"?`<a class="big" style="display:block;text-align:center;text-decoration:none" target="_blank" rel="noopener" data-sodsent="mh" href="${waLink(SOD.text(g),String((S.settings||{}).ownerPh||"9509553600").replace(/\D/g,"").slice(-10))}">🟢 177 MH का ऑर्डर (विक्रम जी को)</a>`
        :g.key?`${g.phone?"":`<div class="row2" style="margin:0 0 6px"><input class="inp" data-sodph="${esc(g.key)}" inputmode="tel" placeholder="${esc(g.name)} का मोबाइल"><button class="big ghost" data-sodphs="${esc(g.key)}">नंबर सेव</button></div>`}<a class="big" style="display:block;text-align:center;text-decoration:none;background:#25d366;color:#04230f" target="_blank" rel="noopener" data-sodsent="${esc(g.key)}" href="${waLink(SOD.text(g),g.phone)}">🟢 ${esc(g.name)} को WhatsApp</a>`
        :`<a class="big ghost" style="display:block;text-align:center;text-decoration:none" target="_blank" rel="noopener" data-sodsent="_" href="${waLink(SOD.text(g),"")}">🟢 यह सूची WhatsApp पर (नंबर चुनें)</a>${S.isOwner?'<p class="note" style="margin:6px 0 0">ऊपर हर सामान की दुकान चुन दें — अगली बार अपने-आप उसी दुकान की सूची में आएगा</p>':""}`}
    </div>`).join(""):'<p class="note" style="font-size:16px">✅ अभी कुछ मँगाना नहीं है — सब सामान पूरा है</p>'}
    </div></div>`};
  draw();const sh=$("#sheet");
  const setQ=(id,v)=>{const Q=LSo.get("bh_ordq")||{};Q[id]=Math.max(0,Math.round(num(v)));LSo.set("bh_ordq",Q)};
  sh.oninput=e=>{const q=e.target.closest("[data-sodq]");if(q){setQ(q.dataset.sodq,q.value);
    const a=q.closest(".sod-g").querySelector("[data-sodsent]");if(a){const G=SOD.list(),g=G.find(x=>(x.key||"_")===a.dataset.sodsent);if(g){const u=new URL(a.href);u.searchParams.set("text",SOD.text(g));a.href=u.toString()}}}};
  sh.onkeydown=null;
  sh.onchange=async e=>{const s=e.target.closest("[data-sodsup]");if(!s||!s.value||!S.isOwner)return;const id=s.dataset.sodsup;try{await saveItem(id,{supId:s.value});const it=item(id);if(it)it.supId=s.value}catch(x){}draw()};
  sh.onclick=async e=>{const t=e.target;
    if(t.matches("[data-close]")){closeSheet();return}
    const m=t.closest("[data-sodm]"),p=t.closest("[data-sodp]");if(m||p){const id=(m||p).dataset[m?"sodm":"sodp"];const inp=sh.querySelector(`[data-sodq="${CSS.escape(id)}"]`);setQ(id,num(inp.value)+(m?-1:1));draw();return}
    const ps=t.closest("[data-sodphs]");if(ps){const k=ps.dataset.sodphs,ph=clean((sh.querySelector(`[data-sodph="${CSS.escape(k)}"]`)||{}).value);if(!ph){toast("10 अंक का मोबाइल नंबर लिखें");return}
      const s=(S.suppliers||[]).find(x=>x.id===k);if(!s){toast("यह दुकान सूची में नहीं — पहले उससे एक खरीद दर्ज करें");return}
      try{if(!S.demo)await S.db.collection("suppliers").doc(k).update({phone:ph});s.phone=ph;toast("✓ नंबर सेव");draw()}catch(x){toast("नंबर सेव नहीं हुआ")}return}
    const a=t.closest("[data-sodsent]");if(a){const k="bh_ordsent_"+today(),o=LSo.get(k)||{};o[a.dataset.sodsent]=ftime(Date.now());LSo.set(k,o);setTimeout(draw,600)}
  };
};
document.addEventListener("click",e=>{if(e.target.closest("[data-sodopen]"))SOD.sheet()});
const css=document.createElement("style");css.textContent=`.sod-g{margin:0 0 10px}.sod-h{display:flex;justify-content:space-between;gap:8px}.sod-h b{font-size:17px;display:block}.sod-sel{margin:6px 0 0;padding:6px 8px;font-size:13px}`;document.head.appendChild(css);
})();
