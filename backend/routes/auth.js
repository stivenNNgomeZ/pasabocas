const { Router } = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { generarToken, verificarToken } = require('../middleware/auth');

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y password son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const rolesValidos = ['admin', 'vendedor', 'usuario'];
    const rolAsignado = rolesValidos.includes(rol) ? rol : 'usuario';
    const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const esVendedor = rolAsignado === 'vendedor';
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, aprobado) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, hash, rolAsignado, !esVendedor]
    );

    if (esVendedor) {
      return res.status(201).json({
        pendiente: true,
        mensaje: 'Tu cuenta de vendedor está pendiente de aprobación. Te avisaremos por correo cuando sea aceptada.',
        usuario: { id: result.insertId, nombre, email, rol: rolAsignado }
      });
    }

    const token = generarToken({ id: result.insertId, email, nombre, rol: rolAsignado });
    res.status(201).json({
      token,
      usuario: { id: result.insertId, nombre, email, rol: rolAsignado }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son obligatorios' });
    }
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const usuario = rows[0];
    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    if (usuario.rol === 'vendedor' && !usuario.aprobado) {
      return res.status(403).json({
        error: 'Tu cuenta de vendedor está pendiente de aprobación por el administrador. Te avisaremos por correo cuando sea aceptada.',
        pendiente: true
      });
    }
    const token = generarToken(usuario);
    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, email, rol, avatar, telefono, direccion, google_id, created_at FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
