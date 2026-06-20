const TOKEN_KEY = 'snackzone_token';
const USER_KEY = 'snackzone_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUsuario() {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function guardarSesion(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = 'index.html';
}

async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Error al iniciar sesión');
    err.pendiente = data.pendiente || false;
    throw err;
  }
  guardarSesion(data.token, data.usuario);
  return data;
}

async function register(nombre, email, password) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  guardarSesion(data.token, data.usuario);
  return data;
}

function cerrarSesionYRedirigir() {
  cerrarSesion();
  window.location.href = 'index.html';
}
