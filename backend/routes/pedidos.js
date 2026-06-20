const { Router } = require('express');
const pool = require('../db');
const { verificarToken } = require('../middleware/auth');

const router = Router();

function generarCodigoSeguimiento() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SNZ-';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

router.get('/', async (req, res) => {
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

router.post('/', async (req, res) => {
  const { nombre, telefono, direccion, metodo_pago, horario, instrucciones, items, cupon_codigo } = req.body;

  if (!nombre || !telefono || !direccion || !items || items.length === 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of items) {
      if (item.id) {
        const [prod] = await conn.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [item.id]);
        if (prod.length === 0 || prod[0].stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${item.nombre}`);
        }
      }
    }

    const totalSinDescuento = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    let descuento = 0;

    if (cupon_codigo) {
      const [cuponRows] = await conn.query(
        'SELECT * FROM cupones WHERE codigo = ? AND activo = 1 AND usos_actuales < usos_maximos AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURDATE()) FOR UPDATE',
        [cupon_codigo]
      );
      if (cuponRows.length > 0) {
        const cupon = cuponRows[0];
        if (totalSinDescuento >= cupon.minimo_compra) {
          if (cupon.descuento_porcentaje > 0) {
            descuento = Math.floor(totalSinDescuento * cupon.descuento_porcentaje / 100);
          } else if (cupon.descuento_fijo > 0) {
            descuento = Math.min(cupon.descuento_fijo, totalSinDescuento);
          }
          await conn.query('UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id = ?', [cupon.id]);
        }
      }
    }

    const total = totalSinDescuento - descuento;
    let usuario_id = null;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), process.env.JWT_SECRET || 'snackzone_secret_key_2026');
        usuario_id = decoded.id;
      } catch (e) {}
    }

    let codigo_seguimiento;
    let unique = false;
    while (!unique) {
      codigo_seguimiento = generarCodigoSeguimiento();
      const [existe] = await conn.query('SELECT id FROM pedidos WHERE codigo_seguimiento = ?', [codigo_seguimiento]);
      if (existe.length === 0) unique = true;
    }

    const [result] = await conn.query(
      'INSERT INTO pedidos (nombre, telefono, direccion, metodo_pago, horario, instrucciones, total, descuento, usuario_id, codigo_seguimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, telefono, direccion, metodo_pago || null, horario || null, instrucciones || null, total, descuento, usuario_id, codigo_seguimiento]
    );

    const pedidoId = result.insertId;

    const values = items.map(item => [
      pedidoId, item.id || null, item.nombre, item.precio, item.cantidad
    ]);

    await conn.query(
      'INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad) VALUES ?',
      [values]
    );

    for (const item of items) {
      if (item.id) {
        await conn.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.id]);
      }
    }

    await conn.commit();

    const [pedido] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
    const [pedidoItems] = await pool.query('SELECT * FROM pedido_items WHERE pedido_id = ?', [pedidoId]);
    pedido[0].items = pedidoItems;

    res.status(201).json(pedido[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.put('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    await pool.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
