const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.get('/pedidos', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, (SELECT COUNT(*) FROM pedido_items WHERE pedido_id = p.id) as items_count
       FROM pedidos p WHERE p.usuario_id = ? ORDER BY p.created_at DESC`,
      [req.usuario.id]
    );
    for (let pedido of rows) {
      const [items] = await db.query('SELECT * FROM pedido_items WHERE pedido_id = ?', [pedido.id]);
      pedido.items = items;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pedidos/:codigo', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.* FROM pedidos p WHERE p.codigo_seguimiento = ? AND p.usuario_id = ?`,
      [req.params.codigo, req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    const [items] = await db.query('SELECT * FROM pedido_items WHERE pedido_id = ?', [rows[0].id]);
    rows[0].items = items;
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', verificarToken, async (req, res) => {
  try {
    const [[{ total_pedidos, total_gastado, ultimo_pedido }]] = await db.query(
      `SELECT COUNT(*) as total_pedidos, COALESCE(SUM(total),0) as total_gastado,
              MAX(created_at) as ultimo_pedido FROM pedidos WHERE usuario_id = ?`,
      [req.usuario.id]
    );
    res.json({ total_pedidos, total_gastado, ultimo_pedido });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, avatar, telefono, direccion, created_at FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/perfil', verificarToken, async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body;
    await db.query('UPDATE usuarios SET nombre = ?, telefono = ?, direccion = ? WHERE id = ?',
      [nombre, telefono, direccion, req.usuario.id]);
    res.json({ message: 'Perfil actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/password', verificarToken, async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;
    if (!password_actual || !password_nueva) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    if (password_nueva.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const [rows] = await db.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (rows[0].password_hash && !(await bcrypt.compare(password_actual, rows[0].password_hash))) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }
    if (!rows[0].password_hash) {
      return res.status(400).json({ error: 'Las cuentas con Google no pueden cambiar contraseña aquí' });
    }

    const hash = await bcrypt.hash(password_nueva, 10);
    await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.usuario.id]);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cuenta', verificarToken, async (req, res) => {
  try {
    const { password } = req.body;
    const [rows] = await db.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (rows[0].password_hash && !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    await db.query('DELETE FROM pedidos WHERE usuario_id = ?', [req.usuario.id]);
    await db.query('DELETE FROM favoritos WHERE usuario_id = ?', [req.usuario.id]);
    await db.query('DELETE FROM reseñas WHERE usuario_id = ?', [req.usuario.id]);
    await db.query('DELETE FROM usuarios WHERE id = ?', [req.usuario.id]);
    res.json({ message: 'Cuenta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
