import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@claudiotracker.com';
const APP_NAME = 'Claude Tracker';
const APP_DOWNLOAD_URL = process.env.APP_DOWNLOAD_URL || 'https://play.google.com/store/apps/details?id=com.claudetracker';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function sendGroupInvitationEmail(
  recipientEmail: string,
  senderName: string,
  groupName: string
): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Skipping email send.');
    return;
  }

  const subject = `${senderName} te invitó a unirte a "${groupName}" en ${APP_NAME}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a Grupo</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">${APP_NAME}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #262626; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
                ¡Has sido invitado!
              </h2>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                <strong style="color: #262626;">${senderName}</strong> te ha invitado a unirte al grupo
                <strong style="color: #007AFF;">"${groupName}"</strong> en ${APP_NAME}.
              </p>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Con ${APP_NAME} podrás:
              </p>

              <ul style="color: #666666; font-size: 15px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
                <li>Compartir tu ubicación en tiempo real con tu grupo</li>
                <li>Seguir dispositivos GPS JX10</li>
                <li>Reportar y ver eventos de seguridad en tu zona</li>
                <li>Mantenerte conectado con tu comunidad</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_DOWNLOAD_URL}" style="display: inline-block; background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,122,255,0.3);">
                  Descargar la App
                </a>
              </div>

              <p style="color: #8E8E93; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                Una vez que te registres con este email, automáticamente te unirás al grupo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #8E8E93; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.
              </p>
              <p style="color: #8E8E93; font-size: 12px; margin: 10px 0 0;">
                Si no reconoces esta invitación, puedes ignorar este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const textContent = `
¡Hola!

${senderName} te ha invitado a unirte al grupo "${groupName}" en ${APP_NAME}.

Con ${APP_NAME} podrás:
- Compartir tu ubicación en tiempo real con tu grupo
- Seguir dispositivos GPS JX10
- Reportar y ver eventos de seguridad en tu zona
- Mantenerte conectado con tu comunidad

Descarga la app aquí: ${APP_DOWNLOAD_URL}

Una vez que te registres con este email (${recipientEmail}), automáticamente te unirás al grupo.

Si no reconoces esta invitación, puedes ignorar este email.

© ${new Date().getFullYear()} ${APP_NAME}
`;

  const msg = {
    to: recipientEmail,
    from: FROM_EMAIL,
    subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email invitation sent to ${recipientEmail}`);
  } catch (error: any) {
    console.error('SendGrid error:', error.response?.body || error.message);
    throw error;
  }
}

export async function sendWelcomeEmail(
  recipientEmail: string,
  userName: string
): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Skipping email send.');
    return;
  }

  const subject = `¡Bienvenido a ${APP_NAME}, ${userName}!`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #34C759 0%, #30D158 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">¡Bienvenido!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #262626; font-size: 18px; margin: 0 0 20px;">
                Hola <strong>${userName}</strong>,
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                Tu cuenta en ${APP_NAME} ha sido creada exitosamente.
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                Ya puedes empezar a usar la app para rastrear tus dispositivos y mantenerte conectado con tu comunidad.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const msg = {
    to: recipientEmail,
    from: FROM_EMAIL,
    subject,
    html: htmlContent,
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email sent to ${recipientEmail}`);
  } catch (error: any) {
    console.error('SendGrid error:', error.response?.body || error.message);
    // Don't throw for welcome emails - they're not critical
  }
}
