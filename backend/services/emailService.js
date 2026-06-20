const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');

const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.auth.user,
    pass: emailConfig.auth.pass,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

async function enviarCorreoAprobacion(destinatario, nombre) {
  const mailOptions = {
    from: `"SnackZone" <${emailConfig.from}>`,
    to: destinatario,
    subject: '🎉 Tu cuenta de vendedor ha sido aprobada - SnackZone',
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',sans-serif;background:#f8f9fa;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px;margin-bottom:8px">🍪</div>
          <h1 style="color:#ff6b35;margin:0;font-size:28px">SnackZone</h1>
          <p style="color:#636e72;margin:4px 0 0">Pasabocas con amor para Colombia</p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
          <h2 style="color:#2d3436;margin:0 0 8px;font-size:22px">¡Bienvenido, ${nombre}!</h2>
          <p style="color:#636e72;line-height:1.7;font-size:15px;margin:0 0 16px">
            Tu cuenta de <strong>vendedor</strong> ha sido <strong style="color:#27ae60">aprobada</strong> por el administrador.
            Ya puedes iniciar sesión y acceder al panel de administración para gestionar productos, ver pedidos y más.
          </p>
          <div style="background:#e8f5e9;border-radius:10px;padding:16px;margin-bottom:20px">
            <p style="margin:0;color:#2e7d32;font-weight:600;font-size:14px">
              ✅ Ya tienes acceso completo al panel de vendedor
            </p>
          </div>
          <a href="http://localhost:3000" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700;font-size:16px">
            Ir a SnackZone
          </a>
          <p style="color:#b2bec3;font-size:13px;margin-top:24px;border-top:1px solid #eee;padding-top:16px">
            Si tienes alguna duda, responde a este correo.<br>
            SnackZone © ${new Date().getFullYear()}
          </p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { enviarCorreoAprobacion };
