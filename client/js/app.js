let productos = [];
let pedidosCache = [];

document.addEventListener('DOMContentLoaded', () => {
  const usuario = getUsuario();
  if (!usuario) { window.location.href = 'index.html'; return; }
  cargarCarrito();
  cargarProductos();
  initEventos();
  const adminLink = document.getElementById('nav-admin-link');
  if (adminLink && (usuario.rol === 'admin' || usuario.rol === 'vendedor')) {
    adminLink.style.display = '';
  }
});

function initEventos() {
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.filtro-btn.active')?.classList.remove('active');
      btn.classList.add('active');
      filtrarProductos(btn.dataset.categoria);
    });
  });
}

function cambiarPagina(pagina) {
  document.querySelectorAll('.pagina').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  const page = document.getElementById(`pagina-${pagina}`);
  const link = document.querySelector(`.nav-link[data-page="${pagina}"]`);
  if (page) page.classList.add('active');
  if (link) link.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (pagina === 'pedidos') cargarMisPedidos();
  if (pagina === 'perfil') cargarPerfil();
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

async function cargarMisPedidos() {
  const container = document.getElementById('mis-pedidos-list');
  const statsEl = document.getElementById('pedidos-stats');
  if (!container) return;
  try {
    const res = await fetch('/api/usuario/pedidos', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const pedidos = await res.json();
    pedidosCache = pedidos;

    const statsRes = await fetch('/api/usuario/stats', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const stats = await statsRes.json();

    statsEl.innerHTML = `
      <div class="pedidos-stat-card">
        <div class="stat-icon" style="background:#fff3ed;color:var(--primary)"><i class="fas fa-receipt"></i></div>
        <span class="stat-num">${stats.total_pedidos}</span>
        <span class="stat-label">Pedidos totales</span>
      </div>
      <div class="pedidos-stat-card">
        <div class="stat-icon" style="background:#e8f5e9;color:var(--success)"><i class="fas fa-dollar-sign"></i></div>
        <span class="stat-num">$${(stats.total_gastado || 0).toLocaleString()}</span>
        <span class="stat-label">Total gastado</span>
      </div>
      <div class="pedidos-stat-card">
        <div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-calendar-alt"></i></div>
        <span class="stat-num">${stats.ultimo_pedido ? new Date(stats.ultimo_pedido).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '-'}</span>
        <span class="stat-label">Último pedido</span>
      </div>
      <div class="pedidos-stat-card">
        <div class="stat-icon" style="background:#f3e5f5;color:#6a1b9a"><i class="fas fa-box-open"></i></div>
        <span class="stat-num">${pedidos.length}</span>
        <span class="stat-label">En historial</span>
      </div>
    `;

    if (pedidos.length === 0) {
      container.innerHTML = `
        <div class="pedido-empty">
          <i class="fas fa-box-open"></i>
          <h3>Aún no tienes pedidos</h3>
          <p>Explora nuestro catálogo y haz tu primer pedido</p>
        </div>`;
      return;
    }
    renderPedidos(pedidos);
  } catch (err) {
    container.innerHTML = `<div class="admin-error">Error: ${err.message}</div>`;
  }
}

function renderPedidos(pedidos) {
  const container = document.getElementById('mis-pedidos-list');
  container.innerHTML = pedidos.map(p => {
    const estados = ['pendiente', 'recibido', 'preparando', 'enviado', 'entregado'];
    const idx = estados.indexOf(p.estado);
    const totalSteps = estados.length;
    const pagoLabel = { efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'DaviPlata', bancolombia: 'Bancolombia' };

    return `
      <div class="pedido-card">
        <div class="pedido-header">
          <div class="pedido-header-left">
            <h3>
              <i class="fas fa-receipt"></i> Pedido <span class="pedido-id">#${p.id}</span>
              ${p.codigo_seguimiento ? `<span class="tracking-code">${p.codigo_seguimiento}</span>` : ''}
            </h3>
            <span class="pedido-meta">
              <i class="far fa-calendar-alt"></i> ${new Date(p.created_at).toLocaleDateString('es-CO', { dateStyle: 'long' })}
              &middot; <i class="fas fa-box"></i> ${p.items_count} producto(s)
              &middot; <i class="fas fa-credit-card"></i> ${pagoLabel[p.metodo_pago] || p.metodo_pago}
            </span>
          </div>
          <span class="badge badge-${p.estado}">${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}</span>
        </div>

        <div class="pedido-timeline">
          ${estados.map((e, i) => `
            <div class="timeline-step ${i <= idx ? 'completed' : i === idx + 1 ? 'active' : ''}">
              <span class="step-dot"></span>
              <span>${e.charAt(0).toUpperCase() + e.slice(1)}</span>
            </div>
            ${i < totalSteps - 1 ? '<span class="timeline-arrow"><i class="fas fa-chevron-right"></i></span>' : ''}
          `).join('')}
        </div>

        <ul class="pedido-items-list">
          ${p.items.map(i => `<li><span>${i.nombre} x${i.cantidad}</span><span>$${(i.precio * i.cantidad).toLocaleString()}</span></li>`).join('')}
        </ul>

        <div class="pedido-footer">
          <div>
            <div class="pedido-descuento">${p.descuento > 0 ? `Descuento: -$${p.descuento.toLocaleString()}` : ''}</div>
          </div>
          <div class="pedido-total">Total: $${p.total.toLocaleString()}</div>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarPedidos(value) {
  const q = value.toLowerCase().trim();
  if (!q) { renderPedidos(pedidosCache); return; }
  const filtrados = pedidosCache.filter(p =>
    (p.codigo_seguimiento || '').toLowerCase().includes(q) ||
    p.estado.toLowerCase().includes(q) ||
    p.items.some(i => i.nombre.toLowerCase().includes(q))
  );
  renderPedidos(filtrados);
}

async function cargarPerfil() {
  try {
    const res = await fetch('/api/usuario/perfil', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const u = await res.json();
    document.getElementById('perfil-nombre-display').textContent = u.nombre || '';
    document.getElementById('perfil-email').textContent = u.email || '';
    const rolMap = { admin: 'Administrador', vendedor: 'Vendedor', usuario: 'Cliente' };
    document.getElementById('perfil-rol').textContent = rolMap[u.rol] || u.rol;
    if (u.created_at) {
      document.getElementById('perfil-miembro').textContent = `Miembro desde ${new Date(u.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}`;
    }
    document.getElementById('perfil-nombre').value = u.nombre || '';
    document.getElementById('perfil-telefono').value = u.telefono || '';
    document.getElementById('perfil-direccion').value = u.direccion || '';
    if (u.avatar) document.getElementById('perfil-avatar').src = u.avatar;
    cambiarPestanaPerfil('info');
  } catch (err) {
    console.error('Error al cargar perfil:', err);
  }
}

function cambiarPestanaPerfil(tab) {
  document.querySelectorAll('.perfil-nav-btn').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.perfil-section-card').forEach(el => el.classList.remove('active'));
  document.querySelector(`.perfil-nav-btn[data-ptab="${tab}"]`)?.classList.add('active');
  document.getElementById(`perfil-${tab}-section`)?.classList.add('active');
}

async function guardarPerfil() {
  const nombre = document.getElementById('perfil-nombre').value.trim();
  const telefono = document.getElementById('perfil-telefono').value.trim();
  const direccion = document.getElementById('perfil-direccion').value.trim();
  if (!nombre) { mostrarToast('El nombre es obligatorio', 'error'); return; }
  try {
    const res = await fetch('/api/usuario/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ nombre, telefono, direccion })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    document.getElementById('perfil-nombre-display').textContent = nombre;
    mostrarToast('Perfil actualizado', 'success');
  } catch (err) { mostrarToast(err.message, 'error'); }
}

async function cambiarPassword(e) {
  e.preventDefault();
  const actual = document.getElementById('pass-actual').value;
  const nueva = document.getElementById('pass-nueva').value;
  const confirmar = document.getElementById('pass-confirmar').value;
  if (nueva !== confirmar) { mostrarToast('Las contraseñas no coinciden', 'error'); return; }
  try {
    const res = await fetch('/api/usuario/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ password_actual: actual, password_nueva: nueva })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    mostrarToast('Contraseña actualizada', 'success');
    e.target.reset();
  } catch (err) { mostrarToast(err.message, 'error'); }
}

async function eliminarCuenta(e) {
  e.preventDefault();
  const password = document.getElementById('delete-password').value;
  if (!confirm('¿Estás seguro? Esta acción eliminará tu cuenta permanentemente.')) return;
  try {
    const res = await fetch('/api/usuario/cuenta', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    mostrarToast('Cuenta eliminada', 'success');
    setTimeout(() => cerrarSesion(), 1500);
  } catch (err) { mostrarToast(err.message, 'error'); }
}

async function cargarProductos() {
  try {
    const res = await fetch('/api/productos');
    productos = await res.json();
    renderProductos(productos);
    cargarFavoritos();
  } catch (err) {
    console.error('Error al cargar productos:', err);
  }
}

async function cargarFavoritos() {
  try {
    const res = await fetch('/api/favoritos', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const favs = await res.json();
    favs.forEach(f => {
      const btn = document.getElementById(`fav-${f.producto_id}`);
      if (btn) { btn.classList.add('active'); btn.dataset.fav = 'true'; }
    });
  } catch (e) {}
}

async function toggleFavorito(id, btn) {
  try {
    const res = await fetch('/api/favoritos/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ producto_id: id })
    });
    const data = await res.json();
    if (data.favorito) {
      btn.classList.add('active');
      btn.dataset.fav = 'true';
      mostrarToast('Añadido a favoritos', 'success');
    } else {
      btn.classList.remove('active');
      btn.dataset.fav = 'false';
      mostrarToast('Eliminado de favoritos', 'error');
    }
  } catch (err) { mostrarToast(err.message, 'error'); }
}

function renderProductos(lista) {
  const grid = document.getElementById('productos-grid');
  const empty = document.getElementById('productos-empty');
  if (!grid) return;
  if (lista.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = lista.map(p => {
    const stockClass = p.stock <= 0 ? 'agotado' : p.stock <= 5 ? 'bajo' : 'ok';
    const stockText = p.stock <= 0 ? 'Agotado' : p.stock <= 5 ? `Stock: ${p.stock}` : '';
    return `
      <div class="producto-card">
        <div class="producto-img${p.imagen ? ' has-image' : ''}" style="background:${p.bg || '#ffeaa7'}">
          ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}">` : `<span class="producto-icon">${p.icono || '📦'}</span>`}
          <span class="categoria-badge">${p.categoria}</span>
          <button class="producto-fav" id="fav-${p.id}" data-fav="false" onclick="event.stopPropagation(); toggleFavorito(${p.id}, this)" title="Favorito">
            <i class="fas fa-heart"></i>
          </button>
        </div>
        <div class="producto-info">
          <h3>${p.nombre}</h3>
          ${stockText ? `<div class="stock-badge ${stockClass}">${stockText}</div>` : ''}
          <p class="producto-desc">${p.descripcion}</p>
          <div class="producto-precio">$${p.precio.toLocaleString()}</div>
          ${p.stock > 0 ? `
          <div class="producto-actions">
            <div class="qty-selector">
              <button onclick="changeQty(${p.id}, -1, event)" id="qty-minus-${p.id}">-</button>
              <span id="qty-val-${p.id}">1</span>
              <button onclick="changeQty(${p.id}, 1, event)" id="qty-plus-${p.id}">+</button>
            </div>
            <button class="btn-add" onclick="agregarAlCarritoDesdeCard(${p.id})">
              <i class="fas fa-cart-plus"></i> Agregar
            </button>
          </div>
          ` : '<div style="color:var(--danger);font-weight:700;text-align:center;padding:8px">No disponible</div>'}
        </div>
      </div>
    `;
  }).join('');
}

function changeQty(id, delta, e) {
  e?.stopPropagation();
  const span = document.getElementById(`qty-val-${id}`);
  if (!span) return;
  let val = parseInt(span.textContent) || 1;
  val = Math.max(1, Math.min(99, val + delta));
  span.textContent = val;
}

function agregarAlCarritoDesdeCard(id) {
  const span = document.getElementById(`qty-val-${id}`);
  const cantidad = span ? parseInt(span.textContent) || 1 : 1;
  agregarAlCarrito(id, cantidad);
  if (span) span.textContent = '1';
}

function filtrarProductos(categoria) {
  const lista = categoria === 'todas' ? productos : productos.filter(p => p.categoria === categoria);
  const query = document.getElementById('search-input')?.value?.toLowerCase().trim();
  if (query) {
    const filtrados = lista.filter(p => p.nombre.toLowerCase().includes(query) || (p.descripcion || '').toLowerCase().includes(query));
    renderProductos(filtrados);
  } else renderProductos(lista);
}

function buscarProductos(value) {
  const active = document.querySelector('.filtro-btn.active');
  const categoria = active ? active.dataset.categoria : 'todas';
  const lista = categoria === 'todas' ? productos : productos.filter(p => p.categoria === categoria);
  const query = value.toLowerCase().trim();
  if (!query) { renderProductos(lista); return; }
  renderProductos(lista.filter(p => p.nombre.toLowerCase().includes(query) || (p.descripcion || '').toLowerCase().includes(query)));
}

function abrirCarrito(e) { e?.preventDefault(); document.getElementById('cart-overlay')?.classList.add('open'); document.body.style.overflow = 'hidden'; }
function cerrarCarrito() { document.getElementById('cart-overlay')?.classList.remove('open'); document.body.style.overflow = ''; }
function cerrarCarritoOverlay(e) { if (e.target === e.currentTarget) cerrarCarrito(); }

let descuentoCupon = 0;
let cuponAplicado = null;

function abrirCheckout() {
  if (carrito.length === 0) { mostrarToast('Agrega productos al carrito', 'error'); return; }
  descuentoCupon = 0;
  cuponAplicado = null;
  document.getElementById('cupon-input').value = '';
  document.getElementById('cupon-mensaje').innerHTML = '';
  const modal = document.getElementById('checkout-modal');
  modal?.classList.add('open');
  document.body.style.overflow = 'hidden';
  actualizarResumenCheckout();
}

function actualizarResumenCheckout() {
  const summary = document.getElementById('order-summary');
  if (!summary) return;
  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  summary.innerHTML = `
    <h3><i class="fas fa-receipt"></i> Resumen del pedido</h3>
    ${carrito.map(item => `
      <div class="order-summary-item"><span>${item.nombre} x${item.cantidad}</span><span>$${(item.precio * item.cantidad).toLocaleString()}</span></div>
    `).join('')}
    ${descuentoCupon > 0 ? `<div class="order-summary-item" style="color:var(--success)"><span>Descuento cupón</span><span>-$${descuentoCupon.toLocaleString()}</span></div>` : ''}
    <div class="order-summary-item total-line"><span>Total</span><span>$${(subtotal - descuentoCupon).toLocaleString()}</span></div>
  `;
}

async function validarCupon() {
  const codigo = document.getElementById('cupon-input').value.trim();
  const mensaje = document.getElementById('cupon-mensaje');
  if (!codigo) { mensaje.innerHTML = '<div class="coupon-error">Ingresa un código</div>'; return; }
  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  try {
    const res = await fetch('/api/cupones/validar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, total: subtotal })
    });
    const data = await res.json();
    if (!res.ok) { mensaje.innerHTML = `<div class="coupon-error">${data.error}</div>`; return; }
    descuentoCupon = data.descuento;
    cuponAplicado = data.cupon;
    mensaje.innerHTML = `<div class="coupon-success"><i class="fas fa-check-circle"></i> Cupón aplicado: -$${data.descuento.toLocaleString()}</div>`;
    actualizarResumenCheckout();
  } catch (err) { mostrarToast(err.message, 'error'); }
}

function cerrarCheckout() {
  document.getElementById('checkout-modal')?.classList.remove('open');
  document.getElementById('checkout-form')?.reset();
  document.body.style.overflow = '';
}

function cerrarModalExterno(e) {
  if (e.target === e.currentTarget) {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
}

function procesarPedido(e) {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const direccion = document.getElementById('direccion').value.trim();
  const pago = document.getElementById('pago').value;
  const horario = document.getElementById('horario').value;
  const instrucciones = document.getElementById('instrucciones').value.trim();
  const btn = document.getElementById('btn-confirmar');
  if (!nombre || !telefono || !direccion) { mostrarToast('Completa todos los campos obligatorios', 'error'); return; }
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const pedido = {
    fecha: new Date().toLocaleString('es-CO'),
    cliente: { nombre, telefono, direccion },
    pago, horario, instrucciones,
    items: [...carrito],
    total: subtotal,
  };

  const body = { nombre, telefono, direccion, metodo_pago: pago, horario, instrucciones, items: carrito };
  if (cuponAplicado) body.cupon_codigo = cuponAplicado.codigo;

  fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  }).catch(err => console.error(err));

  const mensaje = generarMensajeWhatsApp(pedido);
  const url = `https://wa.me/${WHATSAPP_NEGOCIO}?text=${encodeURIComponent(mensaje)}`;
  cerrarCheckout();
  vaciarCarrito();
  mostrarExito(pedido);
  setTimeout(() => {
    window.open(url, '_blank');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Pedido';
  }, 800);
}

function mostrarExito(pedido) {
  const modal = document.getElementById('success-modal');
  const details = document.getElementById('success-details');
  if (!modal) return;
  const horarios = { '9-12': '9:00am a 12:00pm', '12-3': '12:00pm a 3:00pm', '3-6': '3:00pm a 6:00pm', '6-8': '6:00pm a 8:00pm' };
  if (details) {
    details.innerHTML = `
      <strong>👤 Cliente:</strong> ${pedido.cliente.nombre}<br>
      <strong>📞 Teléfono:</strong> ${pedido.cliente.telefono}<br>
      <strong>📍 Dirección:</strong> ${pedido.cliente.direccion}<br>
      <strong>💳 Pago:</strong> ${pedido.pago.charAt(0).toUpperCase() + pedido.pago.slice(1)}<br>
      <strong>⏰ Horario:</strong> ${horarios[pedido.horario] || pedido.horario}<br>
      <strong>💰 Total:</strong> $${pedido.total.toLocaleString()}
    `;
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarExito() { document.getElementById('success-modal')?.classList.remove('open'); document.body.style.overflow = ''; }

function generarMensajeWhatsApp(pedido) {
  const items = pedido.items.map(i => `• ${i.nombre} x${i.cantidad} = $${(i.precio * i.cantidad).toLocaleString()}`).join('\n');
  const horarios = { '9-12': '9:00am a 12:00pm', '12-3': '12:00pm a 3:00pm', '3-6': '3:00pm a 6:00pm', '6-8': '6:00pm a 8:00pm' };
  return ['🛒 *NUEVO PEDIDO - SnackZone*', '━━━━━━━━━━━━━━━━━━', `📅 ${pedido.fecha}`, '', '*👤 Cliente*', `Nombre: ${pedido.cliente.nombre}`, `Tel: ${pedido.cliente.telefono}`, `Dirección: ${pedido.cliente.direccion}`, '', '*📦 Productos*', items, '', `⏰ Horario: ${horarios[pedido.horario] || pedido.horario}`, pedido.instrucciones ? `📝 Notas: ${pedido.instrucciones}` : '', '', '━━━━━━━━━━━━━━━━━━', `💰 *TOTAL: $${pedido.total.toLocaleString()}*`, `💳 *Pago:* ${pedido.pago.toUpperCase()}`, '━━━━━━━━━━━━━━━━━━'].filter(Boolean).join('\n');
}

function enviarContacto(e) {
  e.preventDefault();
  const form = e.target;
  const nombre = form.querySelector('input[type="text"]').value.trim();
  const email = form.querySelector('input[type="email"]').value.trim();
  const mensaje = form.querySelector('textarea').value.trim();
  if (!nombre || !email || !mensaje) { mostrarToast('Completa todos los campos', 'error'); return; }
  fetch('/api/contactos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, email, mensaje }) }).catch(err => console.error(err));
  const texto = `Hola SnackZone!%0A%0A*Nombre:* ${encodeURIComponent(nombre)}%0A*Email:* ${encodeURIComponent(email)}%0A*Mensaje:* ${encodeURIComponent(mensaje)}`;
  window.open(`https://wa.me/${WHATSAPP_NEGOCIO}?text=${texto}`, '_blank');
  form.reset();
  mostrarToast('Mensaje enviado', 'success');
}

function toggleMenu() { document.getElementById('nav-links')?.classList.toggle('open'); }
function cerrarMenu() { document.getElementById('nav-links')?.classList.remove('open'); }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
