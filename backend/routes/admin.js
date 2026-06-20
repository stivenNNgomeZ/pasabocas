const { Router } = require('express');
const pool = require('../db');
const { verificarAdminOVendedor, verificarAdmin } = require('../middleware/auth');

const router = Router();

router.use(verificarAdminOVendedor);

router.get('/pedidos', async (req, res) => {
  try {
    const [pedidos] = await pool.query('SELECT * FROM pedidos ORDER BY created_at DESC');
    for (const pedido of pedidos) {
      const [items] = await pool.query('SELECT * FROM pedido_items WHERE pedido_id = ?', [pedido.id]);
      pedido.items = items;
    }
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pedidos/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    const estados = ['pendiente', 'preparando', 'enviado', 'entregado', 'cancelado'];
    if (!estados.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    await pool.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/productos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/productos', async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, icono, bg, imagen, stock } = req.body;
    if (!nombre || !precio) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }
    const [result] = await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio, categoria, icono, bg, imagen, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion || null, precio, categoria || null, icono || '📦', bg || '#f8f9fa', imagen || null, stock || 0]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Producto creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/productos/:id', async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, icono, bg, imagen, stock, activo } = req.body;
    await pool.query(
      'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, icono = ?, bg = ?, imagen = ?, stock = ?, activo = ? WHERE id = ?',
      [nombre, descripcion, precio, categoria, icono, bg, imagen, stock, activo, req.params.id]
    );
    res.json({ mensaje: 'Producto actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/productos/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM productos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Producto eliminado permanentemente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/contactos', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contactos ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/usuarios', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, email, rol, created_at FROM usuarios ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/resumen', async (req, res) => {
  try {
    const esAdmin = req.usuario.rol === 'admin';
    const [pedidos] = await pool.query('SELECT COUNT(*) as total FROM pedidos');
    const [pendientes] = await pool.query("SELECT COUNT(*) as total FROM pedidos WHERE estado = 'pendiente'");
    const [productos] = await pool.query('SELECT COUNT(*) as total FROM productos WHERE activo = TRUE');
    const result = {
      pedidos: pedidos[0].total,
      pendientes: pendientes[0].total,
      productos: productos[0].total,
    };
    if (esAdmin) {
      const [contactos] = await pool.query('SELECT COUNT(*) as total FROM contactos');
      const [usuarios] = await pool.query('SELECT COUNT(*) as total FROM usuarios');
      result.contactos = contactos[0].total;
      result.usuarios = usuarios[0].total;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
