const express = require("express");
const Database = require("better-sqlite3");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "smartdine.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS menu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  emoji TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_no TEXT NOT NULL,
  customer_note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Placed',
  total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  menu_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM menu").get().n;
if (!count) {
  const seed = [
    ["Paneer Tikka","Smoky tandoori paneer with mint chutney","Starters",220,"🧀"],
    ["Crispy Corn","Golden crunchy corn tossed with spices","Starters",160,"🌽"],
    ["Veg Spring Rolls","Crispy rolls with fresh vegetable filling","Starters",180,"🥢"],
    ["Classic Margherita","Mozzarella, basil and rich tomato sauce","Pizza",299,"🍕"],
    ["Farmhouse Pizza","Loaded with capsicum, onion, tomato and olives","Pizza",379,"🍕"],
    ["Creamy Alfredo Pasta","Penne in a silky white sauce","Mains",289,"🍝"],
    ["Veg Biryani","Aromatic basmati rice with chef's special masala","Mains",260,"🍛"],
    ["Paneer Butter Masala","Paneer in a rich tomato-butter gravy","Mains",280,"🥘"],
    ["Chocolate Brownie","Warm chocolate brownie","Desserts",140,"🍫"],
    ["Gulab Jamun","Soft milk dumplings in sugar syrup","Desserts",100,"🍮"],
    ["Fresh Lime Soda","Refreshing sweet or salted lime soda","Drinks",90,"🍋"],
    ["Cold Coffee","Chilled creamy coffee","Drinks",130,"🥤"]
  ];
  const insert = db.prepare("INSERT INTO menu(name,description,category,price,emoji) VALUES(?,?,?,?,?)");
  const tx = db.transaction(rows => rows.forEach(r => insert.run(...r)));
  tx(seed);
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/menu", (req,res) => {
  res.json(db.prepare("SELECT * FROM menu WHERE available=1 ORDER BY category,id").all());
});
app.get("/api/orders", (req,res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  const getItems = db.prepare("SELECT item_name,quantity,unit_price FROM order_items WHERE order_id=?");
  res.json(orders.map(o => ({...o, items:getItems.all(o.id)})));
});
app.get("/api/orders/:id", (req,res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id=?").get(req.params.id);
  if (!order) return res.status(404).json({error:"Order not found"});
  order.items = db.prepare("SELECT item_name,quantity,unit_price FROM order_items WHERE order_id=?").all(order.id);
  res.json(order);
});
app.post("/api/orders", (req,res) => {
  const { tableNo, items, note="" } = req.body || {};
  if (!tableNo || !Array.isArray(items) || !items.length) return res.status(400).json({error:"Choose at least one item."});
  const menuRows = db.prepare("SELECT id,name,price FROM menu WHERE available=1").all();
  const byId = new Map(menuRows.map(x => [x.id,x]));
  let total = 0;
  const clean = [];
  for (const item of items) {
    const product = byId.get(Number(item.id));
    const qty = Math.max(1, Math.min(20, Number(item.quantity) || 1));
    if (!product) return res.status(400).json({error:"One of the selected items is unavailable."});
    total += product.price * qty;
    clean.push({ ...product, qty });
  }
  const createOrder = db.prepare("INSERT INTO orders(table_no,customer_note,total) VALUES(?,?,?)");
  const addItem = db.prepare("INSERT INTO order_items(order_id,menu_id,item_name,quantity,unit_price) VALUES(?,?,?,?,?)");
  const create = db.transaction(() => {
    const result = createOrder.run(String(tableNo).slice(0,20), String(note).slice(0,300), total);
    clean.forEach(x => addItem.run(result.lastInsertRowid,x.id,x.name,x.qty,x.price));
    return result.lastInsertRowid;
  });
  const id = create();
  res.status(201).json({id,total});
});
app.patch("/api/orders/:id/status", (req,res) => {
  const allowed = ["Placed","Preparing","Ready","Served","Cancelled"];
  const {status} = req.body || {};
  if (!allowed.includes(status)) return res.status(400).json({error:"Invalid status"});
  const result = db.prepare("UPDATE orders SET status=? WHERE id=?").run(status,req.params.id);
  if (!result.changes) return res.status(404).json({error:"Order not found"});
  res.json({ok:true});
});
app.get("/api/qr.png", async (req,res) => {
  const table = String(req.query.table || "1").replace(/[^a-zA-Z0-9-]/g,"").slice(0,20) || "1";
  const origin = `${req.protocol}://${req.get("host")}`;
  const target = `${origin}/?table=${encodeURIComponent(table)}`;
  try {
    const png = await QRCode.toBuffer(target,{type:"png",width:360,margin:2,color:{dark:"#17231f",light:"#ffffff"}});
    res.set("Content-Type","image/png").send(png);
  } catch(e) { res.status(500).json({error:"Could not generate QR code"}); }
});
app.get("/qr", async (req,res) => {
  const origin = `${req.protocol}://${req.get("host")}`;
  const table = String(req.query.table || "1").replace(/[^a-zA-Z0-9-]/g,"").slice(0,20) || "1";
  const target = `${origin}/?table=${encodeURIComponent(table)}`;
  try {
    const image = await QRCode.toDataURL(target,{width:280,margin:2,color:{dark:"#17231f",light:"#ffffff"}});
    res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SmartDine QR</title><link rel="stylesheet" href="/style.css"></head><body class="qr-page"><main class="qr-card"><div class="brand-mark">S</div><p class="eyebrow">SMARTDINE TABLE ACCESS</p><h1>Table ${table}</h1><p>Scan to explore the menu and order directly from your table.</p><img src="${image}" alt="QR code for table ${table}"><a class="btn primary" href="/">Back to SmartDine</a><small>For local demo use, scan while your phone is connected to the same Wi-Fi and use your computer's LAN IP instead of localhost.</small></main></body></html>`);
  } catch(e) { res.status(500).send("Could not generate QR code."); }
});
app.get("/staff", (req,res) => res.sendFile(path.join(__dirname,"public","staff.html")));
app.get("/kitchen", (req,res) => res.sendFile(path.join(__dirname,"public","kitchen.html")));
app.listen(PORT, () => console.log(`SmartDine running at http://localhost:${PORT}`));
