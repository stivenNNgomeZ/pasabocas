const express = require('express');
const db = require('../db');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.producto_id, p.nombre, p.precio, p.icono, p.bg, p.imagen, p.stock
       FROM favoritos f JOIN productos p ON f.producto_id = p.id WHERE f.usuario_id = ?`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/toggle', verificarToken, async (req, res) => {
  try {
    const { producto_id } = req.body;
    const usuario_id = req.usuario.id;
    const [existing] = await db.query('SELECT id FROM favoritos WHERE usuario_id = ? AND producto_id = ?', [usuario_id, producto_id]);
    if (existing.length > 0) {
      await db.query('DELETE FROM favoritos WHERE id = ?', [existing[0].id]);
      res.json({ favorito: false });
    } else {
      await db.query('INSERT INTO favoritos (usuario_id, producto_id) VALUES (?, ?)', [usuario_id, producto_id]);
      res.json({ favorito: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/check/:productoId', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM favoritos WHERE usuario_id = ? AND producto_id = ?', [req.usuario.id, req.params.productoId]);
    res.json({ favorito: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
