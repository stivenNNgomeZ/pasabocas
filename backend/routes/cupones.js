const express = require('express');
const db = require('../db');
const { verificarToken, verificarAdminOVendedor } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cupones WHERE activo = 1 AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURDATE())');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/validar', async (req, res) => {
  try {
    const { codigo, total } = req.body;
    const [rows] = await db.query(
      'SELECT * FROM cupones WHERE codigo = ? AND activo = 1 AND usos_actuales < usos_maximos AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURDATE())',
      [codigo]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cupón inválido o expirado' });

    const cupon = rows[0];
    if (total < cupon.minimo_compra) {
      return res.status(400).json({ error: `Compra mínima de $${cupon.minimo_compra.toLocaleString()}` });
    }

    let descuento = 0;
    if (cupon.descuento_porcentaje > 0) {
      descuento = Math.floor(total * cupon.descuento_porcentaje / 100);
    } else if (cupon.descuento_fijo > 0) {
      descuento = Math.min(cupon.descuento_fijo, total);
    }

    res.json({ descuento, cupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verificarToken, verificarAdminOVendedor, async (req, res) => {
  try {
    const { codigo, descuento_porcentaje, descuento_fijo, minimo_compra, usos_maximos, fecha_expiracion } = req.body;
    const [result] = await db.query(
      'INSERT INTO cupones (codigo, descuento_porcentaje, descuento_fijo, minimo_compra, usos_maximos, fecha_expiracion) VALUES (?, ?, ?, ?, ?, ?)',
      [codigo, descuento_porcentaje || 0, descuento_fijo || 0, minimo_compra || 0, usos_maximos || 100, fecha_expiracion || null]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verificarToken, verificarAdminOVendedor, async (req, res) => {
  try {
    await db.query('DELETE FROM cupones WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cupón eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
