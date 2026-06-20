const ENVIO_GRATIS = 20000;
const WHATSAPP_NEGOCIO = '573001234567';

let carrito = [];

function cargarCarrito() {
  try {
    const data = localStorage.getItem('snackzone_carrito');
    if (data) {
      carrito = JSON.parse(data);
      actualizarResumen();
    }
  } catch (e) {
    carrito = [];
  }
}

function guardarCarrito() {
  try {
    localStorage.setItem('snackzone_carrito', JSON.stringify(carrito));
  } catch (e) {}
}

function agregarAlCarrito(id, cantidad) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  const existente = carrito.find(item => item.id === id);
  if (existente) {
    existente.cantidad += cantidad || 1;
  } else {
    carrito.push({ ...producto, cantidad: cantidad || 1 });
  }

  guardarCarrito();
  actualizarResumen();
  animarContador();
  mostrarToast(`${producto.nombre} agregado al carrito`, 'success');
}

function eliminarDelCarrito(id) {
  const producto = carrito.find(item => item.id === id);
  carrito = carrito.filter(item => item.id !== id);
  guardarCarrito();
  actualizarResumen();
  if (producto) mostrarToast(`${producto.nombre} eliminado`, 'error');
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(p => p.id === id);
  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) {
    eliminarDelCarrito(id);
    return;
  }

  guardarCarrito();
  actualizarResumen();
}

function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
  actualizarResumen();
}

function confirmarVaciarCarrito() {
  if (carrito.length === 0) return;
  const modal = document.getElementById('confirm-modal');
  if (modal) {
    modal.classList.add('open');
    document.getElementById('confirm-modal-msg').textContent = '¿Estás seguro de vaciar el carrito?';
    document.getElementById('confirm-modal-yes').onclick = () => { vaciarCarrito(); modal.classList.remove('open'); mostrarToast('Carrito vaciado', 'error'); };
  }
}

function actualizarResumen() {
  const count = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');
  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = `$${total.toLocaleString()}`;

  renderCarrito();
  renderFreeShipping(total);
}

function renderFreeShipping(total) {
  const bar = document.getElementById('free-shipping-bar');
  if (!bar) return;

  if (total >= ENVIO_GRATIS) {
    bar.className = 'free-shipping-bar success';
    bar.innerHTML = '<i class="fas fa-truck"></i> Envío gratis';
  } else if (total > 0) {
    const falta = ENVIO_GRATIS - total;
    bar.className = 'free-shipping-bar progress';
    bar.innerHTML = `<i class="fas fa-truck"></i> Te faltan $${falta.toLocaleString()} para envío gratis`;
  } else {
    bar.innerHTML = '';
  }
}

function renderCarrito() {
  const container = document.getElementById('cart-items');
  if (!container) return;

  if (carrito.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-bag"></i>
        <p>Tu carrito está vacío</p>
        <p style="font-size:13px;color:#aaa;margin-top:4px">Agrega productos del catálogo</p>
      </div>
    `;
    return;
  }

  container.innerHTML = carrito.map(item => `
    <div class="cart-item">
      <div class="cart-item-img" style="background:${item.bg || '#ffeaa7'}">${item.icono}</div>
      <div class="cart-item-info">
        <h4>${item.nombre}</h4>
        <div class="cart-item-precio">$${(item.precio * item.cantidad).toLocaleString()}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="cambiarCantidad(${item.id}, -1)">-</button>
          <span class="qty-num">${item.cantidad}</span>
          <button class="qty-btn" onclick="cambiarCantidad(${item.id}, 1)">+</button>
          <button class="remove-item" onclick="eliminarDelCarrito(${item.id})" title="Eliminar">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

let animarContador = (function() {
  let timeout;
  return function() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    el.classList.remove('bounce');
    void el.offsetWidth;
    el.classList.add('bounce');
    clearTimeout(timeout);
    timeout = setTimeout(() => el.classList.remove('bounce'), 500);
  };
})();

function mostrarToast(mensaje, tipo) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = mensaje;
  toast.className = 'toast ' + (tipo || '');
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2500);
}
