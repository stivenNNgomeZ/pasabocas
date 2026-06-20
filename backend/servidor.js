const express = require('express');
require("dotenv").config();
const path = require('path');
const session = require('express-session');
const passport = require('passport');

const productosRouter = require('./routes/productos');
const pedidosRouter = require('./routes/pedidos');
const contactosRouter = require('./routes/contactos');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const googleRouter = require('./routes/google');
const uploadRouter = require('./routes/upload');
const cuponesRouter = require('./routes/cupones');
const resenasRouter = require('./routes/resenas');
const favoritosRouter = require('./routes/favoritos');
const usuarioRouter = require('./routes/usuario');
const vendedoresRouter = require('./routes/vendedores');

const app = express();
const portIndex = process.argv.indexOf('--port');
const PORT = (portIndex !== -1 ? process.argv[portIndex + 1] : process.argv[2]) || process.env.PORT || 3000;

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

app.use('/uploads', express.static(path.join(__dirname, '..', 'client', 'uploads')));

app.use('/api/productos', productosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/contactos', contactosRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth', googleRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/cupones', cuponesRouter);
app.use('/api/resenas', resenasRouter);
app.use('/api/favoritos', favoritosRouter);
app.use('/api/usuario', usuarioRouter);
app.use('/api/admin/vendedores', vendedoresRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
