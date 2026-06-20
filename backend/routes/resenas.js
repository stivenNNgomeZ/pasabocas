const express = require('express');
const db = require('../db');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.get('/producto/:productoId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.nombre FROM reseñas r LEFT JOIN usuarios u ON r.usuario_id = u.id WHERE r.producto_id = ? ORDER BY r.created_at DESC`,
      [req.params.productoId]
    );
    const [prom] = await db.query('SELECT ROUND(AVG(puntuacion),1) as promedio, COUNT(*) as total FROM reseñas WHERE producto_id = ?', [req.params.productoId]);
    res.json({ reseñas: rows, promedio: prom[0].promedio, total: prom[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verificarToken, async (req, res) => {
  try {
    const { producto_id, puntuacion, comentario } = req.body;
    const usuario_id = req.usuario.id;
    if (puntuacion < 1 || puntuacion > 5) return res.status(400).json({ error: 'Puntuación debe ser 1-5' });
    const [result] = await db.query(
      'INSERT INTO reseñas (producto_id, usuario_id, puntuacion, comentario) VALUES (?, ?, ?, ?)',
      [producto_id, usuario_id, puntuacion, comentario]
    );
    res.json({ id: result.insertId, producto_id, puntuacion, comentario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
