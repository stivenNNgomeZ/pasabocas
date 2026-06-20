const mysql = require('mysql2/promise');

async function setup() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'stiven30032007.',
  });

  await conn.query('CREATE DATABASE IF NOT EXISTS snackzone');
  await conn.query('USE snackzone');  

  await conn.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      descripcion TEXT,
      precio INT NOT NULL,
      categoria VARCHAR(50),
      icono VARCHAR(10),
      bg VARCHAR(20),
      imagen VARCHAR(255),
      stock INT DEFAULT 0,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT,
      nombre VARCHAR(100) NOT NULL,
      telefono VARCHAR(20) NOT NULL,
      direccion TEXT NOT NULL,
      metodo_pago VARCHAR(50),
      horario VARCHAR(20),
      instrucciones TEXT,
      total INT NOT NULL,
      descuento INT DEFAULT 0,
      cupon_id INT,
      codigo_seguimiento VARCHAR(20) UNIQUE,
      estado VARCHAR(20) DEFAULT 'pendiente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS pedido_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pedido_id INT NOT NULL,
      producto_id INT,
      nombre VARCHAR(100),
      precio INT,
      cantidad INT,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS contactos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      mensaje TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      google_id VARCHAR(255) UNIQUE,
      avatar VARCHAR(255),
      telefono VARCHAR(20),
      direccion TEXT,
      rol VARCHAR(20) DEFAULT 'usuario',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cupones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo VARCHAR(50) NOT NULL UNIQUE,
      descuento_porcentaje INT DEFAULT 0,
      descuento_fijo INT DEFAULT 0,
      minimo_compra INT DEFAULT 0,
      activo BOOLEAN DEFAULT TRUE,
      usos_maximos INT DEFAULT 100,
      usos_actuales INT DEFAULT 0,
      fecha_expiracion DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS reseñas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT NOT NULL,
      usuario_id INT,
      puntuacion INT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
      comentario TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS favoritos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      producto_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_fav (usuario_id, producto_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
    )
  `);

  try { await conn.query('ALTER TABLE productos ADD COLUMN imagen VARCHAR(255)'); } catch (e) { console.log('migrate imagen:', e.message); }
  try { await conn.query('ALTER TABLE productos ADD COLUMN stock INT DEFAULT 0'); } catch (e) { console.log('migrate stock:', e.message); }
  try { await conn.query('ALTER TABLE pedidos ADD COLUMN usuario_id INT'); } catch (e) { console.log('migrate usuario_id:', e.message); }
  try { await conn.query('ALTER TABLE pedidos ADD COLUMN descuento INT DEFAULT 0'); } catch (e) { console.log('migrate descuento:', e.message); }
  try { await conn.query('ALTER TABLE pedidos ADD COLUMN cupon_id INT'); } catch (e) { console.log('migrate cupon_id:', e.message); }
  try { await conn.query('ALTER TABLE pedidos ADD COLUMN codigo_seguimiento VARCHAR(20) UNIQUE'); } catch (e) { console.log('migrate codigo_seguimiento:', e.message); }
  try { await conn.query('ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) UNIQUE'); } catch (e) { console.log('migrate google_id:', e.message); }
  try { await conn.query('ALTER TABLE usuarios ADD COLUMN avatar VARCHAR(255)'); } catch (e) { console.log('migrate avatar:', e.message); }
  try { await conn.query('ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(20)'); } catch (e) { console.log('migrate telefono:', e.message); }
  try { await conn.query('ALTER TABLE usuarios ADD COLUMN direccion TEXT'); } catch (e) { console.log('migrate direccion:', e.message); }
  try { await conn.query('ALTER TABLE usuarios MODIFY COLUMN password_hash VARCHAR(255) NULL'); } catch (e) { console.log('migrate password_hash:', e.message); }
  try { await conn.query("ALTER TABLE usuarios ADD COLUMN aprobado BOOLEAN DEFAULT FALSE"); } catch (e) { console.log('migrate aprobado:', e.message); }
  try { await conn.query("ALTER TABLE usuarios ADD COLUMN aprobado_por INT"); } catch (e) { console.log('migrate aprobado_por:', e.message); }
  try { await conn.query("UPDATE usuarios SET aprobado = TRUE WHERE rol IN ('admin','vendedor','usuario')"); } catch (e) { console.log('actualizar aprobados:', e.message); }

  const bcrypt = require('bcryptjs');
  const [userRows] = await conn.query('SELECT COUNT(*) as count FROM usuarios');
  if (userRows[0].count === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await conn.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
      ['Admin', 'admin@snackzone.com', hash, 'admin']
    );
    console.log('Usuario admin creado: admin@snackzone.com / admin123');
  }

  const [rows] = await conn.query('SELECT COUNT(*) as count FROM productos');
  if (rows[0].count === 0) {
    const productos = [
      [1, 'Choclitos', 'Crujientes chips de maíz con queso, bolsa 40g', 2200, 'salados', '🧀', '#fff8e1', null, 50],
      [2, 'Platanutres', 'Plátano verde frito con sal, bolsa 50g', 1800, 'salados', '🍌', '#fff3e0', null, 50],
      [3, 'Papas Margarita', 'Papas fritas tradicionales, bolsa 35g', 2000, 'salados', '🥔', '#fce4ec', null, 50],
      [4, 'De Todito', 'Mezcla de cereales, maní y pasas, bolsa 60g', 2500, 'salados', '🥜', '#e8f5e9', null, 50],
      [5, 'Tostacos', 'Totopos de maíz con limón y sal, bolsa 45g', 2300, 'salados', '🌮', '#fff8e1', null, 50],
      [6, 'Chicharrón', 'Chicharrón de cerdo crujiente, bolsa 40g', 2800, 'salados', '🍖', '#fce4ec', null, 50],
      [7, 'Maní Salado', 'Maní salado tostado, bolsa 100g', 2000, 'salados', '🥜', '#fff3e0', null, 50],
      [8, 'Mecato Mixto', 'Variedad de dulces surtidos, bolsa 100g', 3000, 'dulces', '🍬', '#f3e5f5', null, 50],
      [9, 'Galletas Oreo', 'Galletas con crema sabor vainilla, paquete 6und', 2800, 'dulces', '🍪', '#e0f7fa', null, 50],
      [10, 'Chocolatina Jet', 'Chocolate con leche y maní, 25g', 1500, 'dulces', '🍫', '#efebe9', null, 50],
      [11, 'Bombombón', 'Caramelo relleno de leche condensada, unidad', 1000, 'dulces', '🍭', '#fce4ec', null, 50],
      [12, 'Chocorramo', 'Pastelito relleno de arequipe bañado en chocolate', 2000, 'dulces', '🧁', '#f3e5f5', null, 50],
      [13, 'Gomitas Trululu', 'Gomitas de fruta ácidas, bolsa 50g', 1800, 'dulces', '🐻', '#e8f5e9', null, 50],
      [14, 'Brownie', 'Brownie de chocolate con nueces, unidad', 2500, 'dulces', '🍫', '#efebe9', null, 50],
      [15, 'Chocolatina Milky Way', 'Chocolate con caramelo y nougat, 20g', 2000, 'dulces', '🍫', '#fff8e1', null, 50],
      [16, 'Gaseosa 350ml', 'Refresco de cola 350ml, lata', 2500, 'bebidas', '🥤', '#e3f2fd', null, 50],
      [17, 'Agua Botella', 'Agua natural 500ml', 1500, 'bebidas', '💧', '#e0f7fa', null, 50],
      [18, 'Jugo Hit', 'Jugo en caja sabor mango 200ml', 1200, 'bebidas', '🧃', '#fff3e0', null, 50],
      [19, 'Gaseosa Personal 400ml', 'Gaseosa personal sabor cola 400ml', 3000, 'bebidas', '🥤', '#e3f2fd', null, 50],
      [20, 'Agua Saborizada', 'Agua con sabor a limón 500ml', 2000, 'bebidas', '🍋', '#e8f5e9', null, 50],
      [21, 'Helado Popsy', 'Helado de crema sabor vainilla, unidad', 3000, 'extras', '🍦', '#fce4ec', null, 50],
      [22, 'Chicles Bubbaloo', 'Chicles sabor fruta, paquete 5und', 1000, 'extras', '🫧', '#e0f7fa', null, 50],
      [23, 'Chocolatina Snickers', 'Chocolate con maní, caramelo y nougat, 50g', 3500, 'dulces', '🍫', '#fff8e1', null, 50],
      [24, 'Papas de Limón', 'Papas fritas sabor limón, bolsa 35g', 2200, 'salados', '🍋', '#fce4ec', null, 50],
      [25, 'Café Liofilizado', 'Café instantáneo 3 en 1, sobre', 1500, 'extras', '☕', '#efebe9', null, 50],
    ];

    const sql = 'INSERT INTO productos (id, nombre, descripcion, precio, categoria, icono, bg, imagen, stock) VALUES ?';
    await conn.query(sql, [productos]);
  }

  const [cuponRows] = await conn.query('SELECT COUNT(*) as count FROM cupones');
  if (cuponRows[0].count === 0) {
    await conn.query(
      'INSERT INTO cupones (codigo, descuento_porcentaje, minimo_compra, usos_maximos) VALUES (?, ?, ?, ?)',
      ['BIENVENIDO10', 10, 10000, 100]
    );
    console.log('Cupón creado: BIENVENIDO10 (10% OFF, min $10.000)');
  }

  console.log('Base de datos inicializada correctamente');
  await conn.end();
}

setup().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
