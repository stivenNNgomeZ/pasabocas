const { Router } = require('express');
const pool = require('../db');
const { verificarAdmin } = require('../middleware/auth');
const { enviarCorreoAprobacion } = require('../services/emailService');

const router = Router();

router.use(verificarAdmin);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, rol, aprobado, aprobado_por, created_at FROM usuarios WHERE rol = 'vendedor' ORDER BY aprobado ASC, created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/aprobar', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, aprobado FROM usuarios WHERE id = ? AND rol = 'vendedor'",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Vendedor no encontrado' });
    if (rows[0].aprobado) return res.status(400).json({ error: 'Ya está aprobado' });

    await pool.query(
      'UPDATE usuarios SET aprobado = TRUE, aprobado_por = ? WHERE id = ?',
      [req.usuario.id, req.params.id]
    );

    enviarCorreoAprobacion(rows[0].email, rows[0].nombre).catch(err => {
      console.error('Error al enviar correo de aprobación:', err.message);
    });

    res.json({ mensaje: 'Vendedor aprobado. El correo se enviará en segundo plano.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/rechazar', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id FROM usuarios WHERE id = ? AND rol = 'vendedor' AND aprobado = FALSE",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

    await pool.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Solicitud rechazada y eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
