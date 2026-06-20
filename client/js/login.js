document.addEventListener('DOMContentLoaded', () => {
  const usuario = getUsuario();
  if (usuario) {
    redirigirPorRol(usuario.rol);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    const nombre = params.get('nombre');
    const email = params.get('email');
    const rol = params.get('rol');
    const avatar = params.get('avatar') || null;
    guardarSesion(token, { id: 0, nombre, email, rol, avatar });
    window.history.replaceState({}, '', window.location.pathname);
    mostrarToast('Inicio de sesión exitoso', 'success');
    redirigirPorRol(rol);
    return;
  }

  document.getElementById('login-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') procesarLoginInline();
  });
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') procesarLoginInline();
  });
});

function toggleLoginRegister() {
  const login = document.getElementById('login-form-view');
  const reg = document.getElementById('register-form-view');
  if (login && reg) {
    const showLogin = login.style.display !== 'none';
    login.style.display = showLogin ? 'none' : '';
    reg.style.display = showLogin ? '' : 'none';
  }
}

async function procesarLoginInline() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { mostrarToast('Completa todos los campos', 'error'); return; }
  try {
    const data = await login(email, password);
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    mostrarToast('Bienvenido', 'success');
    redirigirPorRol(data.usuario.rol);
  } catch (err) {
    if (err.pendiente) {
      mostrarToast('⏳ Tu cuenta está pendiente de aprobación. Te avisaremos por correo.', 'error');
    } else {
      mostrarToast(err.message, 'error');
    }
  }
}

async function procesarRegisterInline() {
  const nombre = document.getElementById('reg-nombre').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const rol = document.getElementById('reg-rol').value;
  if (!nombre || !email || !password) { mostrarToast('Completa todos los campos', 'error'); return; }
  if (password.length < 6) { mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, rol }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.pendiente) {
      document.getElementById('reg-nombre').value = '';
      document.getElementById('reg-email').value = '';
      document.getElementById('reg-password').value = '';
      document.getElementById('login-email').value = email;
      toggleLoginRegister();
      mostrarToast('⏳ Registro exitoso. Tu cuenta está pendiente de aprobación.', 'success');
      return;
    }
    guardarSesion(data.token, data.usuario);
    document.getElementById('reg-nombre').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-password').value = '';
    mostrarToast('Cuenta creada', 'success');
    redirigirPorRol(data.usuario.rol);
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function redirigirPorRol(rol) {
  if (rol === 'admin' || rol === 'vendedor') {
    setTimeout(() => window.location.href = 'admin.html', 600);
  } else {
    setTimeout(() => window.location.href = 'tienda.html', 600);
  }
}
