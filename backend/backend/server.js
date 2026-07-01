const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

// Configuración
const FRONTEND_PATH = path.join(__dirname, '../frontend');
const DB_FILE = path.join(__dirname, 'database/bandera.db');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_PATH));

// Base de datos en memoria
let db = {
  users: [],
  products: [],
  orders: [],
  categories: [
    { id: 1, name: 'tatuaje', display_name: '🎨 Tatuaje' },
    { id: 2, name: 'piercing', display_name: '📌 Piercing' },
    { id: 3, name: 'higiene', display_name: '🧼 Higiene' },
    { id: 4, name: 'accesorios', display_name: '🛠️ Accesorios' }
  ]
};

// Crear carpeta database si no existe
async function ensureDatabaseDir() {
  const dbDir = path.join(__dirname, 'database');
  try {
    await fs.access(dbDir);
  } catch {
    await fs.mkdir(dbDir, { recursive: true });
  }
}

// Cargar base de datos
async function loadDatabase() {
  await ensureDatabaseDir();
  
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const loaded = JSON.parse(data);
    db = { ...db, ...loaded };
    console.log('✅ Base de datos cargada');
  } catch (error) {
    console.log('📝 Creando nueva base de datos...');
    await saveDatabase();
  }
}

// Guardar base de datos
async function saveDatabase() {
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    console.log('💾 Base de datos guardada');
  } catch (error) {
    console.error('❌ Error guardando:', error);
  }
}

// Utilidades
function generateId(collection) {
  const items = db[collection];
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

function generateOrderNumber() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BC${y}${m}${d}${r}`;
}

// Middleware admin
function authAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token === 'LavadoraDeSamuel123#') {
    next();
  } else {
    res.status(401).json({ success: false, error: 'No autorizado' });
  }
}

// Middleware usuario
function requireLogin(req, res, next) {
  const userEmail = req.headers['x-user-email'];
  const user = db.users.find(u => u.email === userEmail);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Inicia sesión' });
  }
  
  req.user = user;
  next();
}

// ========== API CATEGORÍAS ==========
app.get('/api/categories', (req, res) => {
  res.json({ success: true, categories: db.categories });
});

app.post('/api/categories', authAdmin, async (req, res) => {
  const { name, display_name } = req.body;
  
  if (db.categories.find(c => c.name === name)) {
    return res.status(400).json({ success: false, error: 'Ya existe' });
  }
  
  const newCat = {
    id: generateId('categories'),
    name: name.toLowerCase(),
    display_name,
    created_at: new Date().toISOString()
  };
  
  db.categories.push(newCat);
  await saveDatabase();
  res.json({ success: true, category: newCat });
});

app.delete('/api/categories/:id', authAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const catIndex = db.categories.findIndex(c => c.id === id);
  
  if (catIndex === -1) {
    return res.status(404).json({ success: false, error: 'No encontrada' });
  }
  
  const catName = db.categories[catIndex].name;
  const hasProducts = db.products.some(p => p.category === catName);
  
  if (hasProducts) {
    return res.status(400).json({ success: false, error: 'Hay productos con esta categoría' });
  }
  
  db.categories.splice(catIndex, 1);
  await saveDatabase();
  res.json({ success: true });
});

// ========== API PRODUCTOS ==========
app.get('/api/products', (req, res) => {
  let products = [...db.products];
  const category = req.query.category;
  
  if (category && category !== 'all') {
    products = products.filter(p => p.category === category);
  }
  
  res.json({ success: true, products });
});

app.get('/api/products/:id', (req, res) => {
  const product = db.products.find(p => p.id === parseInt(req.params.id));
  
  if (!product) {
    return res.status(404).json({ success: false, error: 'No encontrado' });
  }
  
  res.json({ success: true, product });
});

app.post('/api/products', authAdmin, async (req, res) => {
  const { name, description, price, category, image } = req.body;
  
  if (!name || !price || !category) {
    return res.status(400).json({ success: false, error: 'Faltan datos' });
  }
  
  const newProduct = {
    id: generateId('products'),
    name,
    description: description || '',
    price: parseFloat(price),
    category,
    image: image || `https://placehold.co/400x300/1a3a5f/white?text=${encodeURIComponent(name)}`,
    created_at: new Date().toISOString()
  };
  
  db.products.push(newProduct);
  await saveDatabase();
  res.json({ success: true, product: newProduct });
});

app.delete('/api/products/:id', authAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'No encontrado' });
  }
  
  db.products.splice(index, 1);
  await saveDatabase();
  res.json({ success: true });
});

// ========== API USUARIOS ==========
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone, company } = req.body;
  
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ success: false, error: 'Faltan datos' });
  }
  
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, error: 'Email ya registrado' });
  }
  
  const newUser = {
    id: generateId('users'),
    name,
    email,
    password,
    phone,
    company: company || '',
    created_at: new Date().toISOString()
  };
  
  db.users.push(newUser);
  await saveDatabase();
  
  const { password: _, ...user } = newUser;
  res.json({ success: true, user });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
  }
  
  const { password: _, ...userData } = user;
  res.json({ success: true, user: userData });
});

// ========== API PEDIDOS ==========
app.get('/api/orders', authAdmin, (req, res) => {
  const orders = [...db.orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, orders });
});

app.get('/api/orders/:id', authAdmin, (req, res) => {
  const order = db.orders.find(o => o.id === parseInt(req.params.id));
  
  if (!order) {
    return res.status(404).json({ success: false, error: 'No encontrado' });
  }
  
  res.json({ success: true, order });
});

app.post('/api/orders', requireLogin, async (req, res) => {
  const { products, subtotal, shipping_address, payment_method, notes, company_name } = req.body;
  
  if (!products || products.length === 0 || !shipping_address) {
    return res.status(400).json({ success: false, error: 'Faltan datos' });
  }
  
  const shipping = 5.99;
  const newOrder = {
    id: generateId('orders'),
    order_number: generateOrderNumber(),
    user_id: req.user.id,
    user_name: req.user.name,
    user_email: req.user.email,
    user_phone: req.user.phone,
    user_company: company_name || req.user.company || '',
    products,
    subtotal: parseFloat(subtotal),
    shipping,
    total: parseFloat(subtotal) + shipping,
    shipping_address,
    payment_method: payment_method || 'efectivo',
    payment_status: 'pendiente',
    shipping_status: 'pendiente',
    notes: notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.orders.push(newOrder);
  await saveDatabase();
  res.json({ success: true, order: newOrder });
});

app.put('/api/orders/:id/status', authAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { payment_status, shipping_status } = req.body;
  const orderIndex = db.orders.findIndex(o => o.id === id);
  
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'No encontrado' });
  }
  
  if (payment_status) db.orders[orderIndex].payment_status = payment_status;
  if (shipping_status) db.orders[orderIndex].shipping_status = shipping_status;
  db.orders[orderIndex].updated_at = new Date().toISOString();
  
  await saveDatabase();
  res.json({ success: true, order: db.orders[orderIndex] });
});

app.delete('/api/orders/:id', authAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.orders.findIndex(o => o.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'No encontrado' });
  }
  
  db.orders.splice(index, 1);
  await saveDatabase();
  res.json({ success: true });
});

// ========== STATS ==========
app.get('/api/stats', authAdmin, (req, res) => {
  const totalSales = db.orders.reduce((sum, o) => sum + o.total, 0);
  
  res.json({
    success: true,
    stats: {
      totalProducts: db.products.length,
      totalOrders: db.orders.length,
      totalUsers: db.users.length,
      totalSales,
      pendingOrders: db.orders.filter(o => o.payment_status === 'pendiente').length
    }
  });
});

// ========== SERVIR HTML ==========
const pages = ['', 'productos', 'carrito', 'checkout', 'login', 'registro', 'admin', 'admin-login'];
pages.forEach(page => {
  const filename = page === '' ? 'index.html' : `${page}.html`;
  app.get(`/${page === '' ? '' : page}`, (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, filename));
  });
});

app.get('/style.css', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'style.css'));
});

app.get('/script.js', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'script.js'));
});

// ========== INICIAR ==========
async function startServer() {
  await loadDatabase();
  
  // Datos iniciales si está vacío
  if (db.products.length === 0) {
    db.products = [
      { id: 1, name: 'Máquina de Tatuar Profesional', description: 'Alta precisión', price: 299.99, category: 'tatuaje', image: 'https://images.unsplash.com/photo-1562525108-df5e1d7cb1c1?w=400', created_at: new Date().toISOString() },
      { id: 2, name: 'Kit Piercing Estéril', description: 'Completo y seguro', price: 49.99, category: 'piercing', image: 'https://images.unsplash.com/photo-1585435557343-3b0920313a1b?w=400', created_at: new Date().toISOString() },
      { id: 3, name: 'Espuma Antiséptica', description: 'Limpieza profunda', price: 24.99, category: 'higiene', image: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=400', created_at: new Date().toISOString() }
    ];
    db.users = [
      { id: 1, name: 'Admin', email: 'admin@bandera.com', password: 'LavadoraDeSamuel123#', phone: '744755575', company: 'Bandera', created_at: new Date().toISOString() },
      { id: 2, name: 'Juan Pérez', email: 'juan@test.com', password: '123456', phone: '600000000', company: 'Studio Ink', created_at: new Date().toISOString() }
    ];
    await saveDatabase();
  }
  
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 BANDERA COMMERCE INICIADO');
    console.log('='.repeat(60));
    console.log(`🌐 Tienda: http://localhost:${PORT}`);
    console.log(`🔐 Admin login: http://localhost:${PORT}/admin-login`);
    console.log(`📦 API test: http://localhost:${PORT}/api/products`);
    console.log('\n👤 CREDENCIALES:');
    console.log('   Admin: admin@bandera.com / LavadoraDeSamuel123#');
    console.log('   Cliente: juan@test.com / 123456');
    console.log('='.repeat(60) + '\n');
  });
}

startServer();