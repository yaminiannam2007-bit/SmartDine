const $=id=>document.getElementById(id), money=n=>`₹${Number(n).toFixed(0)}`;
const kitchen=location.pathname==="/kitchen";
const statuses=["Placed","Preparing","Ready","Served","Cancelled"];
async function load(){
 const orders=await fetch("/api/orders").then(r=>r.json());
 if(!kitchen){const active=orders.filter(o=>!["Served","Cancelled"].includes(o.status)).length;const revenue=orders.filter(o=>o.status!=="Cancelled").reduce((s,o)=>s+o.total,0);$("stats").innerHTML=`<div><small>TOTAL ORDERS</small><strong>${orders.length}</strong></div><div><small>ACTIVE ORDERS</small><strong>${active}</strong></div><div><small>ORDER VALUE</small><strong>${money(revenue)}</strong></div>`;}
 const filtered=kitchen?orders.filter(o=>!["Served","Cancelled"].includes(o.status)):orders;
 $("orders").innerHTML=filtered.length?filtered.map(o=>`<article class="order-card"><div class="order-top"><div><span class="order-id">#${o.id}</span><span class="table-pill">TABLE ${o.table_no}</span></div><span class="status-chip">${o.status}</span></div><div class="order-items">${o.items.map(i=>`<div><span>${i.quantity} × ${i.item_name}</span><strong>${money(i.quantity*i.unit_price)}</strong></div>`).join("")}</div>${o.customer_note?`<p class="order-note">Note: ${escapeHtml(o.customer_note)}</p>`:""}<div class="order-bottom"><strong>${money(o.total)}</strong><select data-status="${o.id}">${statuses.map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></div><small class="order-time">${o.created_at}</small></article>`).join(""):`<div class="empty-state"><span>✦</span><h3>All caught up</h3><p>New orders will appear here automatically.</p></div>`;
 document.querySelectorAll("[data-status]").forEach(s=>s.onchange=async()=>{await fetch(`/api/orders/${s.dataset.status}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:s.value})});load();});
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("reload").onclick=load;load();setInterval(load,10000);
