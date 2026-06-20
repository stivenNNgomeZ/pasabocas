const express = require('express');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'snackzone_secret_key_2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'TU_CLIENT_ID.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'TU_CLIENT_SECRET',
    callbackURL: `${FRONTEND_URL}/api/auth/google/callback`,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email from Google'));

      const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
      let usuario;

      if (rows.length > 0) {
        usuario = rows[0];
        if (!usuario.google_id) {
          await db.query(
            'UPDATE usuarios SET google_id = ?, avatar = ? WHERE id = ?',
            [profile.id, profile.photos?.[0]?.value || null, usuario.id]
          );
        }
      } else {
        const [result] = await db.query(
          'INSERT INTO usuarios (nombre, email, password_hash, google_id, avatar, rol) VALUES (?, ?, NULL, ?, ?, ?)',
          [profile.displayName, email, profile.id, profile.photos?.[0]?.value || null, 'usuario']
        );
        usuario = { id: result.insertId, nombre: profile.displayName, email, rol: 'usuario', avatar: profile.photos?.[0]?.value || null };
      }

      done(null, usuario);
    } catch (err) {
      done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query('SELECT id, nombre, email, rol, avatar FROM usuarios WHERE id = ?', [id]);
    done(null, rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/?error=google_failed' }),
  (req, res) => {
    const usuario = req.user;
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.redirect(`/?token=${token}&nombre=${encodeURIComponent(usuario.nombre)}&email=${encodeURIComponent(usuario.email)}&rol=${usuario.rol}`);
  }
);

module.exports = router;
