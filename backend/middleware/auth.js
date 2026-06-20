const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function verificarAdmin(req, res, next) {
  verificarToken(req, res, () => {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Se requiere rol de admin' });
    }
    next();
  });
}

function verificarAdminOVendedor(req, res, next) {
  verificarToken(req, res, () => {
    if (req.usuario.rol !== 'admin' && req.usuario.rol !== 'vendedor') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  });
}

module.exports = { generarToken, verificarToken, verificarAdmin, verificarAdminOVendedor };
