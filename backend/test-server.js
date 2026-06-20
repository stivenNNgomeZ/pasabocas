const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

app.get('/api/productos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos WHERE activo = TRUE ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('Test server on 3001');
});
