// ========== CONFIGURACIÓN ==========
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : 'https://bandera-commerce.onrender.com/api';
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// ========== CARRITO ==========
function actualizarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(carrito));
  actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
  const total = carrito.reduce((sum, item) => sum + item.quantity, 0);
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(badge => {
    badge.textContent = total;
    badge.style.display = total > 0 ? 'inline-block' : 'none';
  });
}

function agregarAlCarrito(producto) {
  const existente = carrito.find(p => p.id === producto.id);
  
  if (existente) {
    existente.quantity++;
  } else {
    carrito.push({
      id: producto.id,
      name: producto.name,
      price: producto.price,
      image: producto.image,
      quantity: 1
    });
  }
  
  actualizarCarrito();
  mostrarNotificacion('✅ Producto añadido al carrito', 'success');
}

function eliminarDelCarrito(productoId) {
  carrito = carrito.filter(p => p.id !== productoId);
  actualizarCarrito();
  
  if (window.location.pathname.includes('carrito')) {
    mostrarCarrito();
  }
}

function actualizarCantidad(productoId, cambio) {
  const producto = carrito.find(p => p.id === productoId);
  
  if (producto) {
    producto.quantity += cambio;
    
    if (producto.quantity <= 0) {
      eliminarDelCarrito(productoId);
    } else {
      actualizarCarrito();
      if (window.location.pathname.includes('carrito')) {
        mostrarCarrito();
      }
    }
  }
}

function obtenerTotalCarrito() {
  return carrito.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function mostrarCarrito() {
  const container = document.getElementById('carritoItems');
  if (!container) return;
  
  if (carrito.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem;">
        <i class="fas fa-shopping-cart fa-4x" style="color: #6c757d; margin-bottom: 1rem;"></i>
        <h3>Tu carrito está vacío</h3>
        <p>Explora nuestros productos y añade algo a tu carrito.</p>
        <a href="/productos" class="btn btn-primary" style="margin-top: 1rem;">
          Ver Productos
        </a>
      </div>
    `;
    return;
  }
  
  let html = '';
  let subtotal = 0;
  
  carrito.forEach(item => {
    const total = item.price * item.quantity;
    subtotal += total;
    
    html += `
      <div class="cart-item">
        <img src="${item.image || 'https://placehold.co/80x80'}" class="cart-item-image" onerror="this.src='https://placehold.co/80x80'">
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">${item.price.toFixed(2)}€</div>
        </div>
        <div class="cart-item-quantity">
          <button class="quantity-btn" onclick="actualizarCantidad(${item.id}, -1)">-</button>
          <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
          <button class="quantity-btn" onclick="actualizarCantidad(${item.id}, 1)">+</button>
        </div>
        <div style="font-weight: bold; min-width: 80px; text-align: right;">${total.toFixed(2)}€</div>
        <button class="btn btn-danger" style="padding: 0.5rem;" onclick="eliminarDelCarrito(${item.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  });
  
  const shipping = 5.99;
  const total = subtotal + shipping;
  
  html += `
    <div class="cart-total">
      <p>Subtotal: ${subtotal.toFixed(2)}€</p>
      <p>Envío: ${shipping.toFixed(2)}€</p>
      <h3>TOTAL: ${total.toFixed(2)}€</h3>
      <a href="/checkout" class="btn btn-success btn-full" style="margin-top: 1rem;">
        <i class="fas fa-credit-card"></i> Proceder al Pago
      </a>
    </div>
  `;
  
  container.innerHTML = html;
}

// ========== NOTIFICACIONES ==========
function mostrarNotificacion(mensaje, tipo = 'info') {
  const notif = document.createElement('div');
  notif.className = `notification notification-${tipo}`;
  notif.innerHTML = `<i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${mensaje}`;
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

// ========== PRODUCTOS ==========
async function cargarProductos() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const data = await response.json();
    
    if (data.success) {
      mostrarProductos(data.products);
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('Error cargando productos', 'error');
  }
}

function mostrarProductos(productos) {
  const container = document.getElementById('productosGrid');
  if (!container) return;
  
  if (productos.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem; grid-column: 1/-1;">
        <i class="fas fa-box-open fa-4x" style="color: #6c757d; margin-bottom: 1rem;"></i>
        <h3>No hay productos</h3>
        <p>Vuelve más tarde.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = productos.map(p => `
    <div class="product-card">
      <img src="${p.image || 'https://placehold.co/400x300/1a3a5f/white?text=' + encodeURIComponent(p.name)}" 
           class="product-image" 
           onerror="this.src='https://placehold.co/400x300/1a3a5f/white?text=Producto'">
      <div class="product-info">
        <span class="product-category">${p.category}</span>
        <h3 class="product-title">${p.name}</h3>
        <p class="product-description">${p.description || 'Sin descripción'}</p>
        <div class="product-price">${p.price.toFixed(2)}€</div>
      </div>
      <div class="product-actions">
        <button onclick='agregarAlCarrito(${JSON.stringify(p)})' class="btn btn-primary" style="flex: 1;">
          <i class="fas fa-cart-plus"></i> Añadir
        </button>
      </div>
    </div>
  `).join('');
}

// ========== CHECKOUT ==========
async function mostrarCheckout() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  
  if (!usuario) {
    window.location.href = '/login?redirect=checkout';
    return;
  }
  
  if (carrito.length === 0) {
    window.location.href = '/carrito';
    return;
  }
  
  document.getElementById('nombre').value = usuario.name;
  document.getElementById('email').value = usuario.email;
  document.getElementById('telefono').value = usuario.phone || '';
  document.getElementById('empresa').value = usuario.company || '';
  
  let itemsHtml = '';
  let subtotal = 0;
  
  carrito.forEach(item => {
    const total = item.price * item.quantity;
    subtotal += total;
    itemsHtml += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span>${item.name} x${item.quantity}</span>
        <span>${total.toFixed(2)}€</span>
      </div>
    `;
  });
  
  const shipping = 5.99;
  document.getElementById('resumenItems').innerHTML = itemsHtml;
  document.getElementById('resumenSubtotal').textContent = subtotal.toFixed(2);
  document.getElementById('resumenTotal').textContent = (subtotal + shipping).toFixed(2);
}

async function realizarPedido() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  
  if (!usuario) {
    mostrarNotificacion('Debes iniciar sesión', 'error');
    return;
  }
  
  const direccion = document.getElementById('direccion')?.value.trim();
  const telefono = document.getElementById('telefono')?.value.trim();
  const empresa = document.getElementById('empresa')?.value.trim();
  const metodoPago = document.getElementById('metodoPago')?.value;
  const notas = document.getElementById('notas')?.value.trim();
  
  if (!direccion || !telefono) {
    mostrarNotificacion('Completa todos los campos', 'error');
    return;
  }
  
  const subtotal = obtenerTotalCarrito();
  
  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': usuario.email
      },
      body: JSON.stringify({
        products: carrito,
        subtotal,
        shipping_address: direccion,
        payment_method: metodoPago,
        notes: notas,
        company_name: empresa
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.removeItem('carrito');
      carrito = [];
      actualizarCarrito();
      mostrarNotificacion('✅ Pedido realizado con éxito', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      mostrarNotificacion(data.error || 'Error al procesar', 'error');
    }
  } catch (error) {
    mostrarNotificacion('Error de conexión', 'error');
  }
}

// ========== AUTENTICACIÓN ==========
async function iniciarSesion() {
  const email = document.getElementById('email')?.value;
  const password = document.getElementById('password')?.value;
  
  if (!email || !password) {
    mostrarNotificacion('Completa todos los campos', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('usuario', JSON.stringify(data.user));
      mostrarNotificacion('✅ Bienvenido ' + data.user.name, 'success');
      
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || '/';
      setTimeout(() => {
        window.location.href = redirect;
      }, 1000);
    } else {
      mostrarNotificacion(data.error || 'Credenciales incorrectas', 'error');
    }
  } catch (error) {
    mostrarNotificacion('Error de conexión', 'error');
  }
}

async function registrarse() {
  const name = document.getElementById('name')?.value;
  const email = document.getElementById('email')?.value;
  const password = document.getElementById('password')?.value;
  const phone = document.getElementById('phone')?.value;
  const company = document.getElementById('company')?.value;
  
  if (!name || !email || !password || !phone) {
    mostrarNotificacion('Completa todos los campos', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, company })
    });
    
    const data = await response.json();
    
    if (data.success) {
      mostrarNotificacion('✅ Registro exitoso, ahora inicia sesión', 'success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } else {
      mostrarNotificacion(data.error || 'Error al registrar', 'error');
    }
  } catch (error) {
    mostrarNotificacion('Error de conexión', 'error');
  }
}

function cerrarSesion() {
  localStorage.removeItem('usuario');
  mostrarNotificacion('Sesión cerrada', 'info');
  setTimeout(() => {
    window.location.href = '/';
  }, 500);
}

function verificarSesion() {
  const usuario = localStorage.getItem('usuario');
  const userInfo = document.getElementById('userInfo');
  
  if (userInfo) {
    if (usuario) {
      const user = JSON.parse(usuario);
      userInfo.innerHTML = `
        <span style="margin-right: 1rem;">👋 ${user.name}</span>
        <a href="#" onclick="cerrarSesion()" style="color: white;">Cerrar Sesión</a>
      `;
    } else {
      userInfo.innerHTML = `
        <a href="/login">Iniciar Sesión</a>
        <a href="/registro">Registrarse</a>
      `;
    }
  }
}

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', () => {
  actualizarContadorCarrito();
  verificarSesion();
  
  if (document.getElementById('productosGrid')) {
    cargarProductos();
  }
  
  if (document.getElementById('carritoItems')) {
    mostrarCarrito();
  }
  
  if (document.getElementById('checkoutForm')) {
    mostrarCheckout();
  }
});
