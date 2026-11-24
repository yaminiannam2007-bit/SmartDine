const params = new URLSearchParams(location.search);
const tableNo = params.get("table") || "1";
document.getElementById("table-label").textContent = `TABLE ${tableNo}`;
let menu = [], cart = {}, activeCategory = "All", currentOrder = null;
const money = n => `₹${Number(n).toFixed(0)}`;
const $ = id => document.getElementById(id);
async function loadMenu(){
  menu = await fetch("/api/menu").then(r=>r.json());
  const cats = ["All",...new Set(menu.map(x=>x.category))];
  $("categories").innerHTML = cats.map(c=>`<button class="cat ${c===activeCategory?"active":""}" data-cat="${c}">${c}</button>`).join("");
  document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;renderMenu();});
  renderMenu();
}
function renderMenu(){
  const term=$("search").value.toLowerCase();
  const filtered=menu.filter(x=>(activeCategory==="All"||x.category===activeCategory)&&(x.name.toLowerCase().includes(term)||x.description.toLowerCase().includes(term)));
  $("menu-grid").innerHTML=filtered.length?filtered.map(x=>`<article class="menu-card"><div class="dish-art">${x.emoji}<span>${x.category}</span></div><div class="dish-info"><h3>${x.name}</h3><p>${x.description}</p><div class="dish-bottom"><strong>${money(x.price)}</strong><button class="add-btn" data-add="${x.id}">＋ Add</button></div></div></article>`).join(""):`<p class="empty">No dishes found. Try another search.</p>`;
  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addItem(Number(b.dataset.add)));
  document.querySelectorAll("[data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===activeCategory));
}
function addItem(id){cart[id]=(cart[id]||0)+1;updateCart();toast("Added to your cart");}
function updateCart(){
  const qty=Object.values(cart).reduce((a,b)=>a+b,0);
  const total=menu.reduce((s,x)=>s+x.price*(cart[x.id]||0),0);
  $("cart-count").textContent=`${qty} item${qty===1?"":"s"}`;$("cart-total").textContent=money(total);
  $("cart-dock").classList.toggle("show",qty>0);$("modal-total").textContent=money(total);
}
function renderCart(){
  const chosen=menu.filter(x=>cart[x.id]);
  $("cart-lines").innerHTML=chosen.length?chosen.map(x=>`<div class="cart-line"><div><strong>${x.name}</strong><small>${money(x.price)} each</small></div><div class="quantity"><button data-minus="${x.id}">−</button><b>${cart[x.id]}</b><button data-plus="${x.id}">＋</button></div><strong>${money(x.price*cart[x.id])}</strong></div>`).join(""):`<p>Your cart is empty.</p>`;
  document.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>{const id=b.dataset.minus;cart[id]--;if(cart[id]<=0)delete cart[id];renderCart();updateCart();});
  document.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>{cart[b.dataset.plus]++;renderCart();updateCart();});
  updateCart();
}
$("open-cart").onclick=()=>{$("cart-modal").hidden=false;renderCart();};
$("close-cart").onclick=()=>$("cart-modal").hidden=true;
$("cart-modal").onclick=e=>{if(e.target.id==="cart-modal")$("cart-modal").hidden=true;};
$("search").addEventListener("input",renderMenu);
$("place-order").onclick=async()=>{
  const items=Object.entries(cart).map(([id,quantity])=>({id:Number(id),quantity}));
  if(!items.length)return toast("Add something to your cart first.");
  $("place-order").disabled=true;$("place-order").textContent="Sending order...";
  try{
    const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tableNo,items,note:$("order-note").value})});
    const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not place order");
    currentOrder=data.id;cart={};$("cart-modal").hidden=true;updateCart();showStatus(data.id);toast("Order placed successfully!");
  }catch(e){toast(e.message);}finally{$("place-order").disabled=false;$("place-order").innerHTML='Place order <span>→</span>';}
};
async function showStatus(id){
  const o=await fetch(`/api/orders/${id}`).then(r=>r.json());if(o.error)return;
  $("order-status").hidden=false;$("status-order-id").textContent=`#${o.id}`;$("status-table").textContent=`Table ${o.table_no} · ${o.items.map(i=>`${i.quantity}× ${i.item_name}`).join(", ")}`;
  $("status-chip").textContent=o.status;$("status-message").textContent=({Placed:"Your order has been sent to the kitchen.",Preparing:"The kitchen is preparing your food.",Ready:"Your order is ready. The team will bring it to you.",Served:"Enjoy your meal!",Cancelled:"This order was cancelled."})[o.status]||"Order update";
  const steps=["Placed","Preparing","Ready","Served"],idx=steps.indexOf(o.status);
  $("status-order").querySelectorAll(".status-track span").forEach((s,i)=>s.classList.toggle("done",idx>=i));
}
$("refresh-status").onclick=()=>currentOrder&&showStatus(currentOrder);
setInterval(()=>currentOrder&&showStatus(currentOrder),12000);
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("visible");setTimeout(()=>t.classList.remove("visible"),2200);}
loadMenu();updateCart();

const quiz=[
 {q:"Which spice gives biryani its golden colour?",a:["Turmeric","Cinnamon","Clove"],correct:0,why:"Turmeric gives food its warm golden-yellow colour."},
 {q:"Which of these is made from chickpeas?",a:["Hummus","Pesto","Salsa"],correct:0,why:"Hummus is a creamy dip made mainly from chickpeas."},
 {q:"What is the main ingredient in guacamole?",a:["Avocado","Cucumber","Peas"],correct:0,why:"Avocado gives guacamole its creamy texture."}
];let qi=0,answered=false;
function showQuiz(){const q=quiz[qi];$("quiz-count").textContent=`0${qi+1} / 03`;$("quiz-question").textContent=q.q;$("quiz-options").innerHTML=q.a.map((a,i)=>`<button class="quiz-option" data-answer="${i}">${a}</button>`).join("");$("quiz-feedback").textContent="Pick your answer to play.";$("next-question").hidden=true;answered=false;document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{if(answered)return;answered=true;const ok=Number(b.dataset.answer)===q.correct;b.classList.add(ok?"correct":"wrong");$("quiz-feedback").textContent=(ok?"Correct! ":"Not quite. ")+q.why;if(!ok)document.querySelector(`[data-answer="${q.correct}"]`).classList.add("correct");$("next-question").hidden=false;});}
$("next-question").onclick=()=>{qi=(qi+1)%quiz.length;showQuiz();};showQuiz();
