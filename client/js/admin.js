let productoAEliminar = null;

document.addEventListener('DOMContentLoaded', () => {
  const usuario = getUsuario();
  if (!usuario || (usuario.rol !== 'admin' && usuario.rol !== 'vendedor')) {
    window.location.href = 'index.html';
    return;
  }
  if (usuario.rol !== 'admin') {
    document.querySelector('[data-seccion="usuarios"]')?.remove();
    document.querySelector('[data-seccion="contactos"]')?.remove();
    document.querySelector('[data-seccion="vendedores"]')?.remove();
    document.getElementById('seccion-usuarios')?.remove();
    document.getElementById('seccion-contactos')?.remove();
    document.getElementById('seccion-vendedores')?.remove();
  }
  cambiarSeccion('resumen');
});

function cerrarSesionAdmin() {
  cerrarSesion();
  window.location.href = 'index.html';
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    cerrarSesion();
    window.location.href = 'index.html';
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

function cerrarModalExterno(e) {
  if (e.target === e.currentTarget) {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
}

function cambiarSeccion(seccion) {
  document.querySelectorAll('.admin-seccion').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`seccion-${seccion}`)?.classList.add('active');
  document.querySelector(`[data-seccion="${seccion}"]`)?.classList.add('active');
  switch (seccion) {
    case 'resumen': cargarResumen(); break;
    case 'pedidos': cargarPedidos(); break;
    case 'productos': cargarProductosAdmin(); break;
    case 'usuarios': cargarUsuarios(); break;
    case 'contactos': cargarContactos(); break;
    case 'cupones': cargarCupones(); break;
    case 'vendedores': cargarVendedores(); break;
  }
}

async function cargarPedidos() {
  const el = document.getElementById('seccion-pedidos');
  el.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando pedidos...</div>';
  try {
    const pedidos = await apiFetch('/api/admin/pedidos');
    if (!pedidos) return;
    if (pedidos.length === 0) {
      el.innerHTML = '<div class="admin-empty"><i class="fas fa-inbox"></i><p>No hay pedidos aún</p></div>';
      return;
    }
    el.innerHTML = `
      <div class="admin-header-section">
        <h2><i class="fas fa-shopping-bag"></i> Pedidos (${pedidos.length})</h2>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Seguimiento</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Total</th>
              <th>Dto.</th>
              <th>Pago</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${pedidos.map(p => `
              <tr>
                <td>${p.id}</td>
                <td style="font-size:11px;font-family:monospace">${p.codigo_seguimiento || '-'}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.telefono}</td>
                <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.direccion}</td>
                <td><strong>$${p.total.toLocaleString()}</strong></td>
                <td>${p.descuento > 0 ? `<span style="color:var(--success);font-weight:600">-$${p.descuento.toLocaleString()}</span>` : '-'}</td>
                <td><span class="badge badge-pago">${p.metodo_pago || 'N/A'}</span></td>
                <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
                <td style="font-size:12px">${new Date(p.created_at).toLocaleDateString('es-CO')}</td>
                <td>
                  <select onchange="cambiarEstadoPedido(${p.id}, this.value)" class="estado-select">
                    <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="preparando" ${p.estado === 'preparando' ? 'selected' : ''}>Preparando</option>
                    <option value="enviado" ${p.estado === 'enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="entregado" ${p.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                    <option value="cancelado" ${p.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                  </select>
                </td>
              </tr>
              <tr class="items-row">
                <td colspan="11">
                  <div class="pedido-items">
                    ${(p.items || []).map(i => `
                      <span class="pedido-item">${i.nombre} x${i.cantidad} = $${(i.precio * i.cantidad).toLocaleString()}</span>
                    `).join('')}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="admin-error">Error: ${err.message}</div>`;
  }
}

async function cambiarEstadoPedido(id, estado) {
  try {
    await apiFetch(`/api/admin/pedidos/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    });
    mostrarToast('Estado actualizado', 'success');
  } catch (err) {
    mostrarToast(err.message, 'error');
    cargarPedidos();
  }
}

async function cargarProductosAdmin() {
  const el = document.getElementById('seccion-productos');
  el.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando productos...</div>';
  try {
    const productos = await apiFetch('/api/admin/productos');
    if (!productos) return;
    window._productosAdmin = productos;
    el.innerHTML = `
      <div class="admin-header-section">
        <h2><i class="fas fa-box"></i> Productos (${productos.length})</h2>
        <button class="btn btn-primary" onclick="abrirModalProducto()"><i class="fas fa-plus"></i> Agregar</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${productos.map(p => `
              <tr style="${!p.activo ? 'opacity:0.5' : ''}">
                <td>${p.id}</td>
                <td style="font-size:24px">${p.imagen ? `<img src="${p.imagen}" style="width:40px;height:40px;border-radius:8px;object-fit:cover">` : (p.icono || '📦')}</td>
                <td>${p.nombre}</td>
                <td><strong>$${p.precio.toLocaleString()}</strong></td>
                <td><span class="stock-badge ${p.stock <= 0 ? 'agotado' : p.stock <= 5 ? 'bajo' : 'ok'}">${p.stock}</span></td>
                <td><span class="badge badge-cat">${p.categoria || 'N/A'}</span></td>
                <td><span class="badge ${p.activo ? 'badge-entregado' : 'badge-cancelado'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <button class="btn btn-sm btn-ghost" onclick="editarProducto(${p.id})"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-sm btn-ghost" style="border-color:var(--danger);color:var(--danger)" onclick="confirmarEliminarProducto(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="admin-error">Error: ${err.message}</div>`;
  }
}

let editandoProductoId = null;

function abrirModalProducto(producto = null) {
  editandoProductoId = producto ? producto.id : null;
  document.getElementById('prod-id').value = producto ? producto.id : '';
  document.getElementById('prod-nombre').value = producto ? producto.nombre : '';
  document.getElementById('prod-desc').value = producto ? producto.descripcion : '';
  document.getElementById('prod-precio').value = producto ? producto.precio : '';
  document.getElementById('prod-categoria').value = producto ? producto.categoria : '';
  document.getElementById('prod-stock').value = producto ? producto.stock : '';
  document.getElementById('prod-imagen').value = producto ? producto.imagen || '' : '';
  document.getElementById('prod-icono').value = producto ? producto.icono : '';
  document.getElementById('prod-bg').value = producto ? producto.bg : '#fff8e1';
  document.getElementById('modal-producto-titulo').textContent = producto ? 'Editar Producto' : 'Nuevo Producto';
  document.getElementById('modal-producto').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarModalProducto() {
  document.getElementById('modal-producto').classList.remove('open');
  document.getElementById('form-producto').reset();
  editandoProductoId = null;
  document.body.style.overflow = '';
}

async function guardarProducto(e) {
  e.preventDefault();
  const data = {
    nombre: document.getElementById('prod-nombre').value.trim(),
    descripcion: document.getElementById('prod-desc').value.trim(),
    precio: parseInt(document.getElementById('prod-precio').value),
    categoria: document.getElementById('prod-categoria').value,
    icono: document.getElementById('prod-icono').value || '📦',
    bg: document.getElementById('prod-bg').value || '#fff8e1',
    imagen: document.getElementById('prod-imagen')?.value || null,
    stock: parseInt(document.getElementById('prod-stock')?.value) || 0,
  };
  const btn = document.getElementById('btn-guardar-producto');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    if (editandoProductoId) {
      data.activo = true;
      await apiFetch(`/api/admin/productos/${editandoProductoId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      mostrarToast('Producto actualizado', 'success');
    } else {
      await apiFetch('/api/admin/productos', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      mostrarToast('Producto creado', 'success');
    }
    cerrarModalProducto();
    cargarProductosAdmin();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = editandoProductoId ? '<i class="fas fa-save"></i> Guardar cambios' : '<i class="fas fa-plus"></i> Crear producto';
}

function editarProducto(id) {
  const productos = window._productosAdmin || [];
  const p = productos.find(x => x.id === id);
  if (p) abrirModalProducto(p);
}

function confirmarEliminarProducto(id) {
  const p = window._productosAdmin || [];
  const prod = p.find(x => x.id === id);
  productoAEliminar = id;
  document.getElementById('confirm-nombre').textContent = prod ? prod.nombre : 'este producto';
  document.getElementById('modal-confirm').classList.add('open');
}

function cerrarModalConfirm() {
  document.getElementById('modal-confirm').classList.remove('open');
  document.getElementById('confirm-modal-yes').onclick = eliminarProductoConfirmado;
  productoAEliminar = null;
}

async function eliminarProductoConfirmado() {
  if (!productoAEliminar) return;
  const id = productoAEliminar;
  cerrarModalConfirm();
  try {
    await apiFetch(`/api/admin/productos/${id}`, { method: 'DELETE' });
    mostrarToast('Producto eliminado permanentemente', 'success');
    cargarProductosAdmin();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function cargarUsuarios() {
  const el = document.getElementById('seccion-usuarios');
  el.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando usuarios...</div>';
  try {
    const usuarios = await apiFetch('/api/admin/usuarios');
    if (!usuarios) return;
    if (usuarios.length === 0) {
      el.innerHTML = '<div class="admin-empty"><i class="fas fa-users"></i><p>No hay usuarios registrados</p></div>';
      return;
    }
    el.innerHTML = `
      <div class="admin-header-section">
        <h2><i class="fas fa-users"></i> Usuarios (${usuarios.length})</h2>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Fecha registro</th>
            </tr>
          </thead>
          <tbody>
            ${usuarios.map(u => `
              <tr>
                <td>${u.id}</td>
                <td><strong>${u.nombre}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge ${u.rol === 'admin' ? 'badge-preparando' : 'badge-pago'}">${u.rol}</span></td>
                <td style="font-size:12px">${new Date(u.created_at).toLocaleDateString('es-CO')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="admin-error">Error: ${err.message}</div>`;
  }
}

async function cargarContactos() {
  const el = document.getElementById('seccion-contactos');
  el.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando mensajes...</div>';
  try {
    const contactos = await apiFetch('/api/admin/contactos');
    if (!contactos) return;
    if (contactos.length === 0) {
      el.innerHTML = '<div class="admin-empty"><i class="fas fa-inbox"></i><p>No hay mensajes</p></div>';
      return;
    }
    el.innerHTML = `
      <div class="admin-header-section">
        <h2><i class="fas fa-envelope"></i> Mensajes de contacto (${contactos.length})</h2>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Mensaje</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${contactos.map(c => `
              <tr>
                <td>${c.id}</td>
                <td><strong>${c.nombre}</strong></td>
                <td>${c.email || 'N/A'}</td>
                <td style="max-width:300px">${c.mensaje}</td>
                <td style="font-size:12px">${new Date(c.created_at).toLocaleString('es-CO')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="admin-error">Error: ${err.message}</div>`;
  }
}

const modalConfirmHTML = `
  <div class="modal" id="modal-confirm" onclick="cerrarModalExterno(event)">
    <div class="modal-content modal-confirm">
      <div class="confirm-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h2 id="confirm-modal-title">¿Eliminar producto?</h2>
      <p id="confirm-modal-desc">Se eliminará <strong id="confirm-nombre">este producto</strong> de la base de datos permanentemente.</p>
      <div class="confirm-buttons">
        <button class="btn btn-ghost" onclick="cerrarModalConfirm()">Cancelar</button>
        <button class="btn btn-danger" id="confirm-modal-yes" onclick="eliminarProductoConfirmado()"><i class="fas fa-trash"></i> Eliminar</button>
      </div>
    </div>
  </div>
`;

document.body.insertAdjacentHTML('beforeend', modalConfirmHTML);

const modalProductoHTML = `
  <div class="modal" id="modal-producto" onclick="cerrarModalExterno(event)">
    <div class="modal-content" style="max-width:500px">
      <button class="close-btn" onclick="cerrarModalProducto()">&times;</button>
      <div class="modal-header">
        <i class="fas fa-box"></i>
        <h2 id="modal-producto-titulo">Nuevo Producto</h2>
      </div>
      <form id="form-producto" onsubmit="guardarProducto(event)">
        <input type="hidden" id="prod-id">
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="prod-nombre" required placeholder="Ej: Papas Margarita">
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <textarea id="prod-desc" rows="2" placeholder="Descripción del producto"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Precio ($)</label>
            <input type="number" id="prod-precio" required min="100">
          </div>
          <div class="form-group">
            <label>Categoría</label>
            <select id="prod-categoria">
              <option value="salados">Salados</option>
              <option value="dulces">Dulces</option>
              <option value="bebidas">Bebidas</option>
              <option value="extras">Extras</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Stock</label>
            <input type="number" id="prod-stock" min="0" value="0">
          </div>
          <div class="form-group">
            <label>Imagen URL</label>
            <input type="text" id="prod-imagen" placeholder="URL de la imagen">
          </div>
        </div>
        <div class="form-group">
          <label>O subir imagen</label>
          <input type="file" id="prod-imagen-file" accept="image/*" onchange="subirImagenProducto(this)">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Icono (emoji)</label>
            <input type="text" id="prod-icono" placeholder="Ej: 🥔" maxlength="10">
          </div>
          <div class="form-group">
            <label>Color fondo</label>
            <input type="color" id="prod-bg" value="#fff8e1">
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-guardar-producto">
          <i class="fas fa-plus"></i> Crear producto
        </button>
      </form>
    </div>
  </div>
`;

document.body.insertAdjacentHTML('beforeend', modalProductoHTML);

async function subirImagenProducto(input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('imagen', file);
  try {
    const data = await apiFetch('/api/upload/upload', { method: 'POST', body: formData });
    document.getElementById('prod-imagen').value = data.url;
    mostrarToast('Imagen subida', 'success');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

let chartInstances = [];

async function cargarResumen() {
  const el = document.getElementById('seccion-resumen');
  el.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
  try {
    const data = await apiFetch('/api/admin/resumen');
    el.innerHTML = `
      <div class="admin-header-section">
        <h2><i class="fas fa-chart-pie"></i> Resumen de la tienda</h2>
      </div>
      <div class="stats-grid-admin">
        <div class="stat-card" style="background:#fff3ed;border-left:4px solid var(--primary)">
          <div class="stat-card-icon" style="background:var(--primary)"><i class="fas fa-shopping-bag"></i></div>
          <div class="stat-card-info">
            <span class="stat-card-num">${data.pedidos}</span>
            <span class="stat-card-label">Pedidos totales</span>
          </div>
        </div>
        <div class="stat-card" style="background:#fff8e1;border-left:4px solid #ffc107">
          <div class="stat-card-icon" style="background:#ffc107"><i class="fas fa-clock"></i></div>
          <div class="stat-card-info">
            <span class="stat-card-num">${data.pendientes}</span>
            <span class="stat-card-label">Pendientes</span>
          </div>
        </div>
        <div class="stat-card" style="background:#e8f5e9;border-left:4px solid var(--success)">
          <div class="stat-card-icon" style="background:var(--success)"><i class="fas fa-box"></i></div>
          <div class="stat-card-info">
            <span class="stat-card-num">${data.productos}</span>
            <span class="stat-card-label">Productos activos</span>
          </div>
        </div>
        ${data.usuarios !== undefined ? `
        <div class="stat-card" style="background:#f3e5f5;border-left:4px solid #673ab7">
          <div class="stat-card-icon" style="background:#673ab7"><i class="fas fa-users"></i></div>
          <div class="stat-card-info">
            <span class="stat-card-num">${data.usuarios}</span>
            <span class="stat-card-label">Usuarios</span>
          </div>
        </div>
        ` : ''}
        ${data.contactos !== undefined ? `
        <div class="stat-card" style="background:#e3f2fd;border-left:4px solid #2196f3">
          <div class="stat-card-icon" style="background:#2196f3"><i class="fas fa-envelope"></i></div>
          <div class="stat-card-info">
            <span class="stat-card-num">${data.contactos}</span>
            <span class="stat-card-label">Mensajes</span>
          </div>
        </div>
        ` : ''}
      </div>
      <div class="chart-grid">
        <div class="chart-card"><h3><i class="fas fa-chart-bar"></i> Productos por categoría</h3><canvas id="chart-categorias"></canvas></div>
        <div class="chart-card"><h3><i class="fas fa-chart-doughnut"></i> Productos en stock</h3><canvas id="chart-stock"></canvas></div>
      </div>
    `;
    const pedidosData = await apiFetch('/api/admin/pedidos');
    const productosData = await apiFetch('/api/admin/productos');
    setTimeout(() => renderCharts(pedidosData || [], productosData || [], data), 100);
  } catch (err) {
    el.innerHTML = `<div class="admin-error">Error: ${err.message}</div>`;
  }
}

function renderCharts(pedidos, productos, resumen) {
  chartInstances.forEach(c => c.destroy());
  chartInstances = [];
  const catEl = document.getElementById('chart-categorias');
  const stockEl = document.getElementById('chart-stock');
  if (!catEl || !stockEl) return;

  const cats = {};
  productos.forEach(p => { cats[p.categoria || 'otro'] = (cats[p.categoria || 'otro'] || 0) + 1; });

  chartInstances.push(new Chart(catEl, {
    type: 'bar',
    data: {
      labels: Object.keys(cats).map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      datasets: [{
        label: 'Productos',
        data: Object.values(cats),
        backgroundColor: ['#ff6b35', '#f7931e', '#27ae60', '#673ab7'],
        borderRadius: 6,
      }]
    },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
  }));

  chartInstances.push(new Chart(stockEl, {
    type: 'doughnut',
    data: {
      labels: ['Con stock', 'Agotados'],
      datasets: [{
        data: [productos.filter(p => p.stock > 0).length, productos.filter(p => p.stock <= 0).length],
        backgroundColor: ['#27ae60', '#d63031'],
      }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  }));
}

async function cargarCupones() {
  const el = document.getElementById('seccion-cupones');
  el.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando cupones...</div>';
  try {
    const cupones = await apiFetch('/api/cupones');
    if (!cupones) return;
    el.innerHTML = `
      <div class="admin-header-section">
        <h2><i class="fas fa-tags"></i> Cupones (${cupones.length})</h2>
        <button class="btn btn-primary" onclick="abrirModalCupon()"><i class="fas fa-plus"></i> Nuevo cupón</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Código</th>
              <th>% Dto.</th>
              <th>Dto. Fijo</th>
              <th>Mínimo</th>
              <th>Usos</th>
              <th>Expira</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${cupones.map(c => `
              <tr>
                <td>${c.id}</td>
                <td><strong style="font-family:monospace">${c.codigo}</strong></td>
                <td>${c.descuento_porcentaje > 0 ? c.descuento_porcentaje + '%' : '-'}</td>
                <td>${c.descuento_fijo > 0 ? '$' + c.descuento_fijo.toLocaleString() : '-'}</td>
                <td>$${(c.minimo_compra || 0).toLocaleString()}</td>
                <td>${c.usos_actuales}/${c.usos_maximos}</td>
                <td style="font-size:12px">${c.fecha_expiracion ? new Date(c.fecha_expiracion).toLocaleDateString('es-CO') : 'Sin exp.'}</td>
                <td><span class="badge ${c.activo ? 'badge-entregado' : 'badge-cancelado'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <button class="btn btn-sm btn-ghost" style="border-color:var(--danger);color:var(--danger)" onclick="eliminarCupon(${c.id})"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="admin-error">Error: ${err.message}</div>`;
  }
}

function abrirModalCupon() {
  document.getElementById('cupon-codigo').value = '';
  document.getElementById('cupon-porcentaje').value = '';
  document.getElementById('cupon-fijo').value = '';
  document.getElementById('cupon-minimo').value = '';
  document.getElementById('cupon-usos').value = '100';
  document.getElementById('cupon-expiracion').value = '';
  document.getElementById('modal-cupon-titulo').textContent = 'Nuevo Cupón';
  document.getElementById('modal-cupon').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarModalCupon() {
  document.getElementById('modal-cupon').classList.remove('open');
  document.getElementById('form-cupon').reset();
  document.body.style.overflow = '';
}

async function guardarCupon(e) {
  e.preventDefault();
  const data = {
    codigo: document.getElementById('cupon-codigo').value.trim().toUpperCase(),
    descuento_porcentaje: parseInt(document.getElementById('cupon-porcentaje').value) || 0,
    descuento_fijo: parseInt(document.getElementById('cupon-fijo').value) || 0,
    minimo_compra: parseInt(document.getElementById('cupon-minimo').value) || 0,
    usos_maximos: parseInt(document.getElementById('cupon-usos').value) || 100,
    fecha_expiracion: document.getElementById('cupon-expiracion').value || null,
  };
  const btn = document.getElementById('btn-guardar-cupon');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    await apiFetch('/api/cupones', { method: 'POST', body: JSON.stringify(data) });
    mostrarToast('Cupón creado', 'success');
    cerrarModalCupon();
    cargarCupones();
  } catch (err) { mostrarToast(err.message, 'error'); }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-plus"></i> Crear cupón';
}

async function eliminarCupon(id) {
  if (!confirm('¿Eliminar este cupón?')) return;
  try {
    await apiFetch(`/api/cupones/${id}`, { method: 'DELETE' });
    mostrarToast('Cupón eliminado', 'success');
    cargarCupones();
  } catch (err) { mostrarToast(err.message, 'error'); }
}

const modalCuponHTML = `
  <div class="modal" id="modal-cupon" onclick="cerrarModalExterno(event)">
    <div class="modal-content" style="max-width:480px">
      <button class="close-btn" onclick="cerrarModalCupon()">&times;</button>
      <div class="modal-header">
        <i class="fas fa-tag"></i>
        <h2 id="modal-cupon-titulo">Nuevo Cupón</h2>
      </div>
      <form id="form-cupon" onsubmit="guardarCupon(event)">
        <div class="form-group">
          <label>Código</label>
          <input type="text" id="cupon-codigo" required placeholder="Ej: VERANO30" maxlength="30" style="text-transform:uppercase">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Descuento %</label>
            <input type="number" id="cupon-porcentaje" min="0" max="100" placeholder="0">
          </div>
          <div class="form-group">
            <label>Descuento fijo ($)</label>
            <input type="number" id="cupon-fijo" min="0" placeholder="0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Compra mínima ($)</label>
            <input type="number" id="cupon-minimo" min="0" value="0">
          </div>
          <div class="form-group">
            <label>Usos máximos</label>
            <input type="number" id="cupon-usos" min="1" value="100">
          </div>
        </div>
        <div class="form-group">
          <label>Fecha expiración (opcional)</label>
          <input type="date" id="cupon-expiracion">
        </div>
        <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-guardar-cupon">
          <i class="fas fa-plus"></i> Crear cupón
        </button>
      </form>
    </div>
  </div>
`;

document.body.insertAdjacentHTML('beforeend', modalCuponHTML);

async function cargarVendedores() {
  const el = document.getElementById('seccion-vendedores');
  el.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando vendedores...</div>';
  try {
    const vendedores = await apiFetch('/api/admin/vendedores');
    if (!vendedores) return;
    const pendientes = vendedores.filter(v => !v.aprobado);
    const aprobados = vendedores.filter(v => v.aprobado);
    el.innerHTML = `
      <div class="admin-header-section">
        <h2><i class="fas fa-user-check"></i> Vendedores</h2>
      </div>
      <div class="stats-grid-admin" style="margin-bottom:20px">
        <div class="stat-card" style="background:#fff8e1;border-left:4px solid #ffc107">
          <div class="stat-card-icon" style="background:#ffc107"><i class="fas fa-clock"></i></div>
          <div class="stat-card-info">
            <span class="stat-card-num">${pendientes.length}</span>
            <span class="stat-card-label">Pendientes</span>
          </div>
        </div>
        <div class="stat-card" style="background:#e8f5e9;border-left:4px solid var(--success)">
          <div class="stat-card-icon" style="background:var(--success)"><i class="fas fa-check-circle"></i></div>
          <div class="stat-card-info">
            <span class="stat-card-num">${aprobados.length}</span>
            <span class="stat-card-label">Aprobados</span>
          </div>
        </div>
      </div>
      ${pendientes.length > 0 ? `
      <h3 style="margin-bottom:12px;color:#ffc107"><i class="fas fa-clock"></i> Solicitudes pendientes</h3>
      <div class="admin-table-wrap" style="margin-bottom:24px">
        <table class="admin-table">
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Fecha</th><th>Acción</th></tr>
          </thead>
          <tbody>
            ${pendientes.map(v => `
              <tr>
                <td>${v.id}</td>
                <td><strong>${v.nombre}</strong></td>
                <td>${v.email}</td>
                <td style="font-size:12px">${new Date(v.created_at).toLocaleDateString('es-CO')}</td>
                <td>
                  <button class="btn btn-sm btn-success" onclick="aprobarVendedor(${v.id})"><i class="fas fa-check"></i> Aprobar</button>
                  <button class="btn btn-sm btn-danger" onclick="rechazarVendedor(${v.id})"><i class="fas fa-times"></i> Rechazar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : '<div class="admin-empty"><i class="fas fa-check-circle" style="color:var(--success)"></i><p>No hay solicitudes pendientes</p></div>'}
      ${aprobados.length > 0 ? `
      <h3 style="margin-bottom:12px;color:var(--success)"><i class="fas fa-check-circle"></i> Vendedores aprobados</h3>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            ${aprobados.map(v => `
              <tr>
                <td>${v.id}</td>
                <td><strong>${v.nombre}</strong></td>
                <td>${v.email}</td>
                <td style="font-size:12px">${new Date(v.created_at).toLocaleDateString('es-CO')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `;
  } catch (err) {
    el.innerHTML = `<div class="admin-error">Error: ${err.message}</div>`;
  }
}

async function aprobarVendedor(id) {
  const modal = document.getElementById('modal-confirm');
  document.getElementById('confirm-modal-title').textContent = 'Aprobar vendedor';
  document.getElementById('confirm-modal-desc').innerHTML = '¿Estás seguro de aprobar a <strong id="confirm-nombre">este vendedor</strong>? Se le notificará por correo electrónico.';
  modal.classList.add('open');
  document.getElementById('confirm-modal-yes').onclick = async function() {
    modal.classList.remove('open');
    document.getElementById('confirm-modal-yes').onclick = eliminarProductoConfirmado;
    try {
      await apiFetch(`/api/admin/vendedores/${id}/aprobar`, { method: 'PUT' });
      mostrarToast('Vendedor aprobado', 'success');
      cargarVendedores();
    } catch (err) { mostrarToast(err.message, 'error'); }
  };
}

async function rechazarVendedor(id) {
  const modal = document.getElementById('modal-confirm');
  document.getElementById('confirm-modal-title').textContent = 'Rechazar vendedor';
  document.getElementById('confirm-modal-desc').innerHTML = '¿Estás seguro de rechazar a <strong id="confirm-nombre">este vendedor</strong>? Su solicitud será eliminada.';
  modal.classList.add('open');
  document.getElementById('confirm-modal-yes').onclick = async function() {
    modal.classList.remove('open');
    document.getElementById('confirm-modal-yes').onclick = eliminarProductoConfirmado;
    try {
      await apiFetch(`/api/admin/vendedores/${id}/rechazar`, { method: 'PUT' });
      mostrarToast('Vendedor rechazado', 'error');
      cargarVendedores();
    } catch (err) { mostrarToast(err.message, 'error'); }
  };
}
