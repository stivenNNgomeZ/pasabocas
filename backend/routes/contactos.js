const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contactos ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, email, mensaje } = req.body;
  if (!nombre || !mensaje) {
    return res.status(400).json({ error: 'Nombre y mensaje son obligatorios' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO contactos (nombre, email, mensaje) VALUES (?, ?, ?)',
      [nombre, email || null, mensaje]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Mensaje recibido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
