import { Request, Response } from 'express';
import { prisma } from '../../config/database';

const EVENT_TYPE_LABELS: Record<string, string> = {
  THEFT: 'Robo',
  LOST: 'Extravío',
  ACCIDENT: 'Accidente',
  FIRE: 'Incendio',
};

const EVENT_TYPE_EMOJI: Record<string, string> = {
  THEFT: '🚨',
  LOST: '📍',
  ACCIDENT: '⚠️',
  FIRE: '🔥',
};

export class ShareController {
  static async getSharedEvent(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const userAgent = req.headers['user-agent'] || '';

      // Check if request is from a social media crawler/bot
      const isCrawler = /facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Pinterest|Googlebot/i.test(userAgent);

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          type: true,
          description: true,
          latitude: true,
          longitude: true,
          status: true,
          isPublic: true,
          imageUrl: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              showName: true,
            },
          },
        },
      });

      // Event not found
      if (!event) {
        return res.status(404).send(generateNotFoundPage());
      }

      // Event is not public
      if (!event.isPublic) {
        return res.status(403).send(generatePrivatePage());
      }

      const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
      const appScheme = 'geotracker://';
      const deepLink = `${appScheme}event/${event.id}`;
      const webUrl = `${baseUrl}/e/${event.id}`;

      // Build OG metadata
      const title = `${EVENT_TYPE_EMOJI[event.type] || '📍'} ${EVENT_TYPE_LABELS[event.type] || 'Alerta'} en tu zona`;
      const description = event.description.length > 150
        ? event.description.slice(0, 147) + '...'
        : event.description;
      const imageUrl = event.imageUrl ? `${baseUrl}${event.imageUrl}` : `${baseUrl}/og-default.png`;
      const creatorName = event.user.showName ? event.user.name : 'Usuario';
      const formattedDate = new Date(event.createdAt).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Generate HTML page
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>

  <!-- Primary Meta Tags -->
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${webUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="GeoTracker">
  <meta property="og:locale" content="es_AR">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${webUrl}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${imageUrl}">

  <!-- App Links -->
  <meta property="al:ios:app_name" content="GeoTracker">
  <meta property="al:ios:url" content="${deepLink}">
  <meta property="al:android:app_name" content="GeoTracker">
  <meta property="al:android:url" content="${deepLink}">
  <meta property="al:android:package" content="com.geotracker.app">

  <!-- Smart App Banner (iOS) -->
  <meta name="apple-itunes-app" content="app-id=YOUR_APP_ID, app-argument=${deepLink}">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 440px;
      width: 100%;
      overflow: hidden;
    }

    .event-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: #f0f0f0;
    }

    .event-image-placeholder {
      width: 100%;
      height: 200px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 64px;
    }

    .content {
      padding: 24px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .badge-theft { background: #FEE2E2; color: #DC2626; }
    .badge-lost { background: #FEF3C7; color: #D97706; }
    .badge-accident { background: #FEF9C3; color: #CA8A04; }
    .badge-fire { background: #FCE7F3; color: #DB2777; }

    .status {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
    }

    .status-progress { background: #DBEAFE; color: #2563EB; }
    .status-closed { background: #D1FAE5; color: #059669; }

    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
      line-height: 1.4;
    }

    .description {
      color: #4b5563;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #6b7280;
    }

    .meta-icon {
      width: 20px;
      text-align: center;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      color: #9ca3af;
      font-size: 13px;
      margin: 8px 0;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e5e7eb;
    }

    .footer {
      text-align: center;
      padding: 20px 24px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .footer-text {
      font-size: 13px;
      color: #9ca3af;
    }

    .footer-logo {
      font-weight: 700;
      color: #667eea;
    }

    .contact-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: #10B981;
      color: white;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      margin-top: 12px;
    }

    .contact-btn:hover {
      background: #059669;
    }
  </style>
</head>
<body>
  <div class="container">
    ${event.imageUrl
      ? `<img src="${imageUrl}" alt="Imagen del evento" class="event-image">`
      : `<div class="event-image-placeholder">${EVENT_TYPE_EMOJI[event.type] || '📍'}</div>`
    }

    <div class="content">
      <div>
        <span class="badge badge-${event.type.toLowerCase()}">${EVENT_TYPE_EMOJI[event.type] || '📍'} ${EVENT_TYPE_LABELS[event.type] || 'Alerta'}</span>
        <span class="status status-${event.status === 'IN_PROGRESS' ? 'progress' : 'closed'}">
          ${event.status === 'IN_PROGRESS' ? 'En progreso' : 'Cerrado'}
        </span>
      </div>

      <h1>${title}</h1>
      <p class="description">${event.description}</p>

      <div class="meta">
        <div class="meta-item">
          <span class="meta-icon">👤</span>
          <span>Reportado por ${creatorName}</span>
        </div>
        <div class="meta-item">
          <span class="meta-icon">📅</span>
          <span>${formattedDate}</span>
        </div>
        <div class="meta-item">
          <span class="meta-icon">📍</span>
          <span>Ver ubicación en la app</span>
        </div>
      </div>

      <div class="actions">
        <a href="${deepLink}" class="btn btn-primary" id="openApp">
          📱 Abrir en GeoTracker
        </a>

        <div class="divider">o</div>

        <a href="#" class="btn btn-secondary" id="downloadApp">
          ⬇️ Descargar la app
        </a>
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">
        Comparte alertas de seguridad con tu comunidad usando
        <span class="footer-logo">GeoTracker</span>
      </p>
    </div>
  </div>

  <script>
    // Try to open the app, fallback to store
    document.getElementById('openApp').addEventListener('click', function(e) {
      e.preventDefault();
      const deepLink = '${deepLink}';
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      // Try to open the app
      window.location.href = deepLink;

      // Fallback to store after delay
      setTimeout(function() {
        if (isIOS) {
          window.location.href = 'https://apps.apple.com/app/geotracker/idYOUR_APP_ID';
        } else if (isAndroid) {
          window.location.href = 'https://play.google.com/store/apps/details?id=com.geotracker.app';
        }
      }, 2500);
    });

    document.getElementById('downloadApp').addEventListener('click', function(e) {
      e.preventDefault();
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      if (isIOS) {
        window.location.href = 'https://apps.apple.com/app/geotracker/idYOUR_APP_ID';
      } else if (isAndroid) {
        window.location.href = 'https://play.google.com/store/apps/details?id=com.geotracker.app';
      } else {
        alert('Visita la tienda de aplicaciones de tu dispositivo y busca "GeoTracker"');
      }
    });
  </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error getting shared event:', error);
      res.status(500).send(generateErrorPage());
    }
  }
}

function generateNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evento no encontrado - GeoTracker</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #1f2937; margin-bottom: 12px; }
    p { color: #6b7280; margin-bottom: 24px; }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔍</div>
    <h1>Evento no encontrado</h1>
    <p>El evento que buscas no existe o fue eliminado.</p>
    <a href="/">Ir al inicio</a>
  </div>
</body>
</html>`;
}

function generatePrivatePage(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evento privado - GeoTracker</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #1f2937; margin-bottom: 12px; }
    p { color: #6b7280; margin-bottom: 24px; line-height: 1.6; }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔒</div>
    <h1>Evento privado</h1>
    <p>Los detalles de este evento no pueden ser mostrados porque es un evento privado o pertenece a un grupo cerrado.</p>
    <a href="/">Descargar GeoTracker</a>
  </div>
</body>
</html>`;
}

function generateErrorPage(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - GeoTracker</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #1f2937; margin-bottom: 12px; }
    p { color: #6b7280; margin-bottom: 24px; }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>Algo salió mal</h1>
    <p>No pudimos cargar el evento. Por favor intenta de nuevo.</p>
    <a href="javascript:location.reload()">Reintentar</a>
  </div>
</body>
</html>`;
}
