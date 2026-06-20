# SnackZone 🥨

App web de pasabocas colombianos con catálogo, carrito de compras, panel admin, cupones, reseñas, favoritos, seguimiento de pedidos y sistema de roles (admin/vendedor/usuario).

---

## 🚀 Inicio Rápido

### Requisitos
- Node.js 16+
- MySQL 8.0.46 corriendo en localhost:3306

### Pasos

```bash
# 1. Ir al backend
cd backend

# 2. Instalar dependencias (solo la primera vez)
npm install

# 3. Crear la base de datos en MySQL
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS snackzone"

# 4. Crear tablas y datos de prueba (solo la primera vez)
npm run setup

# 5. Iniciar el servidor
npm start
```

Abrir en el navegador: **http://localhost:3000**

### Usuarios de prueba

| Email | Contraseña | Rol |
|-------|-----------|------|
| `admin@snackzone.com` | `admin123` | Administrador (acceso total al panel) |
| `vendedor@test.com` | `vendedor123` | Vendedor (pendiente de aprobación) |
| `usuario@test.com` | `usuario123` | Cliente (solo tienda) |

---

## 📁 Estructura del Proyecto

### Backend (`backend/`)

#### Archivos principales

| Archivo | Propósito |
|---------|-----------|
| `servidor.js` | Entry point del servidor Express. Monta todos los routers, configura sesión, passport y archivos estáticos. Lee el puerto de `--port`, `PORT` env, o 3000 |
| `db.js` | Pool de conexión a MySQL (`mysql2/promise`). Base: `snackzone`, user: `root` |
| `setup.js` | Script de inicialización: crea la BD, todas las tablas, migraciones y seed data (25 productos, 3 usuarios, 1 cupón) |

#### Middleware y configuración

| Archivo | Propósito |
|---------|-----------|
| `middleware/auth.js` | JWT helpers: `generarToken()`, `verificarToken()`, `verificarAdmin()`, `verificarAdminOVendedor()` |
| `config/email.js` | Config SMTP de Gmail para envío de correos (usuario + contraseña de aplicación) |
| `services/emailService.js` | Envío de correo de aprobación a vendedores vía nodemailer |

#### Rutas API (`backend/routes/`)

| Archivo | Rutas montadas | Propósito |
|---------|---------------|-----------|
| `auth.js` | `POST /api/auth/login`, `/register`, `GET /me` | Autenticación: login, registro con JWT, perfil actual. Vendedor queda pendiente de aprobación |
| `google.js` | `GET /api/auth/google`, `/google/callback` | OAuth con Google (requiere credenciales reales en placeholders) |
| `productos.js` | `GET /api/productos`, `/:id` | Catálogo público: lista productos activos |
| `pedidos.js` | `POST /api/pedidos`, `GET /`, `PUT /:id/estado` | Crear pedidos con validación de stock, cupones, código de seguimiento. GET/PUT públicas para admin |
| `admin.js` | `GET/POST/PUT/DELETE /api/admin/...` | CRUD de productos, pedidos, usuarios, contactos, resumen con stats. Requiere admin o vendedor |
| `usuario.js` | `GET/PUT/DELETE /api/usuario/...` | Perfil, pedidos del usuario, stats, cambio de contraseña, eliminación de cuenta |
| `cupones.js` | `GET/POST/DELETE /api/cupones`, `POST /validar` | CRUD de cupones + validación contra total del carrito |
| `favoritos.js` | `GET /`, `POST /toggle`, `GET /check/:id` | Corazón de favoritos por usuario |
| `resenas.js` | `GET /producto/:id`, `POST /` | Reseñas con puntuación 1-5 estrellas |
| `contactos.js` | `GET/POST /api/contactos` | Formulario de contacto |
| `vendedores.js` | `GET /`, `PUT /:id/aprobar`, `PUT /:id/rechazar` | Aprobación/rechazo de vendedores por admin |
| `upload.js` | `POST /api/upload/upload` | Subida de imágenes con multer (jpg/png/gif/webp, máx 5MB) |

---

### Cliente (`client/`)

#### Páginas HTML

| Archivo | Qué contiene |
|---------|-------------|
| `index.html` | Login y registro con selector de rol (cliente/vendedor), botón de Google, manejo de cuenta pendiente |
| `tienda.html` | Tienda principal con 3 secciones: **Catálogo** (búsqueda, filtros, grid, carrito lateral), **Mis Pedidos** (stats + timeline + búsqueda), **Perfil** (información, contraseña, eliminar cuenta). Incluye checkout, modales y WhatsApp flotante |
| `admin.html` | Panel admin con sidebar: Resumen (charts), Pedidos, Productos, Usuarios, Mensajes, Cupones, Vendedores. Vendedor ve menos secciones |

#### JavaScript

| Archivo | Propósito |
|---------|-----------|
| `js/auth.js` | Gestión de sesión: `getToken()`, `guardarSesion()`, `cerrarSesion()`, login/register via API |
| `js/cart.js` | Carrito en localStorage: agregar, quitar, cantidades, total, barra de envío gratis, toast, WhatsApp |
| `js/login.js` | Lógica de login/register page: toggle formularios, Google callback (token desde URL), redirección por rol |
| `js/app.js` | Lógica de la tienda: cargar productos, filtros, búsqueda, carrito, pedidos con timeline, perfil con 3 tabs, cambio de contraseña, eliminar cuenta, contacto |
| `js/admin.js` | Lógica del panel: CRUD de productos/pedidos/usuarios/cupones/vendedores, charts (Chart.js), resumen, upload de imágenes |

#### Estilos

| Archivo | Propósito |
|---------|-----------|
| `css/style.css` | ~2100 líneas con todos los estilos: layout, hero, catálogo, carrito, admin, perfil sidebar, timeline pedidos, charts, responsive, animaciones |

---

## 🗄️ Base de Datos

Base: **`snackzone`** en MySQL 8.0.46

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `productos` | Catálogo con nombre, descripción, precio, categoría, icono, imagen (URL), stock, activo |
| `usuarios` | Usuarios con email, password hash, rol (admin/vendedor/usuario), google_id, avatar, teléfono, dirección, aprobado, aprobado_por |
| `pedidos` | Pedidos con usuario, total, descuento, cupón, código de seguimiento (SNZ-XXXXXXXX), estado, método de pago, dirección, instrucciones |
| `pedido_items` | Items individuales de cada pedido (producto, cantidad, precio) |
| `contactos` | Mensajes del formulario de contacto |
| `cupones` | Códigos de descuento con tipo (porcentaje/fijo), valor, mínimo, usos, expiración |
| `reseñas` | Reseñas de productos con puntuación 1-5 y comentario |
| `favoritos` | Relación usuario-producto para favoritos |

---

## 🗃️ Esquema SQL para Workbench

Copiá esto en MySQL Workbench para ver la estructura completa:

```sql
-- ============================================
-- SNACKZONE - ESQUEMA COMPLETO DE BASE DE DATOS
-- ============================================

-- CATÁLOGO
CREATE TABLE productos (
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
);

-- PEDIDOS
CREATE TABLE pedidos (
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
);

-- ITEMS DE CADA PEDIDO
CREATE TABLE pedido_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT,
  nombre VARCHAR(100),
  precio INT,
  cantidad INT,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- USUARIOS
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  google_id VARCHAR(255) UNIQUE,
  avatar VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  rol VARCHAR(20) DEFAULT 'usuario',
  aprobado BOOLEAN DEFAULT FALSE,
  aprobado_por INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CUPONES
CREATE TABLE cupones (
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
);

-- RESEÑAS
CREATE TABLE reseñas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  usuario_id INT,
  puntuacion INT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
  comentario TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- FAVORITOS
CREATE TABLE favoritos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  producto_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_fav (usuario_id, producto_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- CONTACTOS
CREATE TABLE contactos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Consultas útiles para Workbench

```sql
-- Todos los pedidos con su usuario
SELECT p.id, p.codigo_seguimiento, u.nombre AS cliente, p.total, p.estado, p.created_at
FROM pedidos p
LEFT JOIN usuarios u ON p.usuario_id = u.id
ORDER BY p.created_at DESC;

-- Productos con stock bajo (< 10)
SELECT nombre, stock, categoria FROM productos WHERE stock < 10 ORDER BY stock ASC;

-- Total vendido por producto
SELECT pi.nombre, SUM(pi.cantidad) AS unidades_vendidas, SUM(pi.precio * pi.cantidad) AS total
FROM pedido_items pi
JOIN pedidos p ON pi.pedido_id = p.id
WHERE p.estado != 'cancelado'
GROUP BY pi.nombre
ORDER BY total DESC;

-- Cupones más usados
SELECT codigo, usos_actuales, usos_maximos, (usos_actuales/usos_maximos)*100 AS porcentaje_uso
FROM cupones
WHERE activo = TRUE
ORDER BY porcentaje_uso DESC;

-- Ventas por día
SELECT DATE(created_at) AS fecha, COUNT(*) AS pedidos, SUM(total) AS ingresos
FROM pedidos
WHERE estado != 'cancelado'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- Usuarios registrados por rol
SELECT rol, COUNT(*) AS cantidad FROM usuarios GROUP BY rol;

-- Reseñas promedio por producto
SELECT p.nombre, ROUND(AVG(r.puntuacion), 1) AS promedio, COUNT(r.id) AS total_reseñas
FROM productos p
LEFT JOIN reseñas r ON r.producto_id = p.id
GROUP BY p.id, p.nombre
ORDER BY promedio DESC;

-- Productos sin stock (agotados)
SELECT nombre, categoria FROM productos WHERE stock = 0 OR stock IS NULL;

-- Historial de estados de un pedido específico
SELECT codigo_seguimiento, estado, created_at FROM pedidos WHERE codigo_seguimiento = 'SNZ-XXXXXXXX';
```

---

## 🔌 API Endpoints

### Públicos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/productos` | Listar productos activos |
| GET | `/api/productos/:id` | Producto individual |
| POST | `/api/pedidos` | Crear pedido |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/register` | Registrarse |
| GET | `/api/auth/google` | Login con Google |
| GET | `/api/cupones` | Cupones activos |
| POST | `/api/cupones/validar` | Validar cupón |
| GET | `/api/resenas/producto/:id` | Reseñas de un producto |
| POST | `/api/contactos` | Enviar mensaje |

### Requieren autenticación (usuario logueado)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auth/me` | Perfil del usuario actual |
| GET | `/api/usuario/pedidos` | Pedidos del usuario |
| GET | `/api/usuario/pedidos/:codigo` | Pedido por código |
| GET | `/api/usuario/stats` | Estadísticas del usuario |
| GET | `/api/usuario/perfil` | Datos del perfil |
| PUT | `/api/usuario/perfil` | Actualizar perfil |
| PUT | `/api/usuario/password` | Cambiar contraseña |
| DELETE | `/api/usuario/cuenta` | Eliminar cuenta |
| GET | `/api/favoritos` | Favoritos del usuario |
| POST | `/api/favoritos/toggle` | Agregar/quitar favorito |
| GET | `/api/favoritos/check/:id` | Verificar si es favorito |
| POST | `/api/resenas` | Crear reseña |

### Requieren admin o vendedor

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/resumen` | Dashboard stats |
| GET | `/api/admin/pedidos` | Todos los pedidos |
| PUT | `/api/admin/pedidos/:id/estado` | Cambiar estado de pedido |
| GET | `/api/admin/productos` | Todos los productos |
| POST | `/api/admin/productos` | Crear producto |
| PUT | `/api/admin/productos/:id` | Actualizar producto |
| DELETE | `/api/admin/productos/:id` | Eliminar producto |
| POST | `/api/cupones` | Crear cupón |
| DELETE | `/api/cupones/:id` | Eliminar cupón |
| POST | `/api/upload/upload` | Subir imagen |

### Requieren solo admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/usuarios` | Listar usuarios |
| GET | `/api/admin/contactos` | Mensajes de contacto |
| GET | `/api/admin/vendedores` | Listar vendedores |
| PUT | `/api/admin/vendedores/:id/aprobar` | Aprobar vendedor |
| PUT | `/api/admin/vendedores/:id/rechazar` | Rechazar vendedor |

---

## 🔐 Autenticación y Roles

- **JWT** con expiración de 24 horas. Se envía como `Authorization: Bearer <token>`
- **Google OAuth** configurado con Passport (requiere `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` reales en `routes/google.js`)
- **Roles:** `admin` (todo), `vendedor` (panel limitado), `usuario` (solo tienda)
- Los vendedores se registran como pendientes (`aprobado = false`) y el admin debe aprobarlos desde la sección "Vendedores" del panel
- Al aprobar, se envía un correo de bienvenida automático a su email

---

## ⚙️ Puerto

Tres formas de especificar el puerto:

```bash
# Opción 1: argumento --port
node servidor.js --port 4000

# Opción 2: variable de entorno
PORT=4000 node servidor.js

# Opción 3: por defecto
node servidor.js   # usa el puerto 3000
```

---

## 🌐 Exponer con ngrok (para que tus amigos accedan)

```bash
# 1. Prendé el server
cd backend
npm start

# 2. En otra terminal, ejecutá ngrok
ngrok http 3000

# 3. Ngrok te da una URL como:
#    https://a1b2c3d4e5f6.ngrok-free.app
#    Esa URL se la pasás a tus amigos por WhatsApp
```

**Notas:**
- Tus amigos **no necesitan instalar nada**, solo abren el link en su navegador
- Si cerrás la terminal de ngrok, se corta. Volvé a ejecutar el paso 2
- La URL cambia cada vez que abrís ngrok (a menos que tengas cuenta paga)
- Ngrok authtoken ya está configurado en este equipo

---

## 📚 Todo lo que Aprendimos (en la práctica)

### Comandos que usamos en la terminal

```bash
# Navegar
cd /c/Users/STIVEN/proyectos/pasabocas/backend
cd ..
pwd
ls
dir

# Node / npm
npm install
npm run setup
npm start
node servidor.js
node servidor.js --port 3008

# MySQL
mysql -u root -p
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS snackzone"
# Dentro de MySQL:
SHOW DATABASES;
USE snackzone;
SHOW TABLES;
DESCRIBE usuarios;
SELECT * FROM productos;
SELECT * FROM usuarios;

# Matar procesos
taskkill //F //IM node.exe

# Red / ngrok
ipconfig
ngrok config add-authtoken 3FNUcwVgUV5HIvOMoCnUKVRYUa8_61p1gjiQ1qnxSCV9Cb5aF
ngrok http 3000
ngrok http 3008
```

### Cosas que aprendimos sobre la marcha

- **npm install** siempre desde `backend/`, no desde la raíz del proyecto
- **MySQL** es un servicio de Windows que a veces hay que prenderlo manualmente (Servicios → MySQL80)
- **Puerto ocupado** → `taskkill //F //IM node.exe` con doble slash en Git Bash
- **Puerto personalizado** → `node servidor.js --port 3008` y abrir `http://localhost:3008`
- **ngrok** necesita su propia terminal; el server y ngrok corren al mismo tiempo
- **La URL de ngrok cambia** cada vez que lo abrís (a menos que pagues)
- **Contraseña de aplicación de Gmail** (`xxxx xxxx xxxx xxxx`) no es la contraseña real, es una clave especial para que el server pueda enviar correos
- **JWT expira en 24h** — si algo deja de funcionar, volver a iniciar sesión
- **Vendedor pendiente** no puede iniciar sesión hasta que el admin lo apruebe desde el panel
- **products.js fue eliminado** porque creaba un conflicto con la variable `productos` en `app.js`
- **F12 (Console + Network)** es lo primero que hay que abrir cuando algo no funciona en el frontend
- **El error siempre está en la terminal del server** cuando algo falla en backend

---

## ⚠️ Solución de Problemas

| Problema | Solución |
|----------|----------|
| "No se conecta a MySQL" | Abre "Servicios" de Windows y asegúrate que "MySQL80" esté en ejecución |
| "Base de datos no existe" | `mysql -u root -p -e "CREATE DATABASE snackzone"` |
| "Table doesn't exist" | Ejecuta `npm run setup` en la carpeta `backend/` |
| Error `products is not defined` | El servidor necesita reiniciarse después de crear las tablas |
| Token inválido o expirado | Vuelve a iniciar sesión |
| Puerto 3000 ocupado | `taskkill //F //IM node.exe` o usa `--port` con otro puerto |
| Login con Google no funciona | Configura las credenciales en `backend/routes/google.js` |
| Correo de aprobación no llega | Verifica la contraseña de aplicación en `backend/config/email.js` |
| Vendedor no puede iniciar sesión | Un admin debe aprobarlo desde el panel en "Vendedores" |
| Imagen no se muestra | Las imágenes se guardan en `client/uploads/`. Verifica que la carpeta exista |
| Error al subir imagen | Solo se permiten jpg, png, gif, webp de máximo 5MB |

---

## 📦 Dependencias

```
bcryptjs, express, express-session, jsonwebtoken, multer,
mysql2, nodemailer, passport, passport-google-oauth20, uuid
```
