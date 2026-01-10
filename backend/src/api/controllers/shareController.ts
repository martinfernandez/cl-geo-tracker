import { Request, Response } from 'express';
import { prisma } from '../../config/database';

const EVENT_TYPE_LABELS: Record<string, string> = {
  THEFT: 'Robo reportado',
  LOST: 'Objeto extraviado',
  ACCIDENT: 'Accidente reportado',
  FIRE: 'Incendio reportado',
  GENERAL: 'Alerta comunitaria',
};

const EVENT_TYPE_SHORT: Record<string, string> = {
  THEFT: 'Robo',
  LOST: 'Extravio',
  ACCIDENT: 'Accidente',
  FIRE: 'Incendio',
  GENERAL: 'General',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  THEFT: '#EF4444',
  LOST: '#F59E0B',
  ACCIDENT: '#FBBF24',
  FIRE: '#EC4899',
  GENERAL: '#8B5CF6',
};

const EVENT_TYPE_CTA: Record<string, string> = {
  THEFT: 'Ayudanos a encontrarlo. Si viste algo sospechoso, comparte esta alerta.',
  LOST: 'Lo viste? Ayuda a que vuelva a casa compartiendo esta publicacion.',
  ACCIDENT: 'Mantente alerta y comparte para prevenir.',
  FIRE: 'Precaucion! Comparte para alertar a tu comunidad.',
  GENERAL: 'Manten informada a tu comunidad compartiendo esta alerta.',
};

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

export class ShareController {
  static async getSharedEvent(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

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
          isUrgent: true,
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

      if (!event) {
        return res.status(404).send(generateNotFoundPage());
      }

      if (!event.isPublic) {
        return res.status(403).send(generatePrivatePage());
      }

      const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
      const appScheme = 'peek://';
      const deepLink = `${appScheme}event/${event.id}`;
      const webUrl = `${baseUrl}/e/${event.id}`;

      // Generate static map URL if no image
      const staticMapUrl = GOOGLE_MAPS_API_KEY
        ? `https://maps.googleapis.com/maps/api/staticmap?center=${event.latitude},${event.longitude}&zoom=15&size=1200x630&maptype=roadmap&markers=color:red%7C${event.latitude},${event.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        : null;

      // Build optimized OG metadata
      const eventTypeLabel = EVENT_TYPE_LABELS[event.type] || 'Alerta';
      const urgentPrefix = event.isUrgent ? 'URGENTE: ' : '';
      const title = `${urgentPrefix}${eventTypeLabel} cerca de ti`;

      const cta = EVENT_TYPE_CTA[event.type] || EVENT_TYPE_CTA.GENERAL;
      const shortDesc = event.description.length > 80
        ? event.description.slice(0, 77) + '...'
        : event.description;
      const description = `${shortDesc} ${cta}`;

      // Image priority: event image > static map > default
      let imageUrl: string;
      if (event.imageUrl) {
        // Ensure full URL for images
        imageUrl = event.imageUrl.startsWith('http')
          ? event.imageUrl
          : `${baseUrl}${event.imageUrl.startsWith('/') ? '' : '/'}${event.imageUrl}`;
      } else if (staticMapUrl) {
        imageUrl = staticMapUrl;
      } else {
        imageUrl = `${baseUrl}/og-default.png`;
      }

      const creatorName = event.user.showName ? event.user.name : 'Un vecino';
      const formattedDate = new Date(event.createdAt).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      const eventColor = EVENT_TYPE_COLORS[event.type] || '#8B5CF6';
      const eventTypeShort = EVENT_TYPE_SHORT[event.type] || 'Alerta';

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title} | PeeK</title>

  <!-- Primary Meta Tags -->
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  <meta name="author" content="PeeK App">
  <meta name="robots" content="index, follow">

  <!-- Open Graph / Facebook / WhatsApp / Telegram -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${webUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${eventTypeLabel} - Ver ubicacion en PeeK">
  <meta property="og:site_name" content="PeeK - Alertas Comunitarias">
  <meta property="og:locale" content="es_AR">
  <meta property="article:published_time" content="${event.createdAt.toISOString()}">
  <meta property="article:author" content="${creatorName}">
  <meta property="article:section" content="Alertas">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@peekapp">
  <meta name="twitter:creator" content="@peekapp">
  <meta name="twitter:url" content="${webUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:alt" content="${eventTypeLabel} - Ver ubicacion en PeeK">

  <!-- App Links -->
  <meta property="al:ios:app_name" content="PeeK">
  <meta property="al:ios:url" content="${deepLink}">
  <meta property="al:android:app_name" content="PeeK">
  <meta property="al:android:url" content="${deepLink}">
  <meta property="al:android:package" content="com.peek.app">

  <!-- Preload image -->
  <link rel="preload" as="image" href="${imageUrl}">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0F;
      min-height: 100vh;
      color: #F8FAFC;
    }

    .page-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(18, 18, 26, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      color: white;
    }

    .logo-text {
      font-size: 20px;
      font-weight: 700;
      color: #F8FAFC;
    }

    .logo-text span {
      color: #8B5CF6;
    }

    .header-action {
      padding: 8px 16px;
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      border-radius: 20px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }

    .header-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }

    /* Content */
    .content {
      flex: 1;
      max-width: 520px;
      margin: 0 auto;
      width: 100%;
    }

    /* User Header */
    .user-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${eventColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      color: white;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 15px;
      font-weight: 600;
      color: #F8FAFC;
      margin-bottom: 2px;
    }

    .user-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      background: ${eventColor};
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      color: white;
    }

    .status-badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .status-progress {
      background: rgba(59, 130, 246, 0.2);
      color: #60A5FA;
    }

    .status-closed {
      background: rgba(34, 197, 94, 0.2);
      color: #4ADE80;
    }

    .urgent-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .urgent-dot {
      width: 8px;
      height: 8px;
      background: #EF4444;
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
    }

    /* Image */
    .event-image-container {
      width: 100%;
      background: #12121A;
      position: relative;
    }

    .event-image {
      width: 100%;
      max-height: 400px;
      object-fit: cover;
      display: block;
    }

    .event-image-placeholder {
      width: 100%;
      height: 200px;
      background: linear-gradient(135deg, #1A1A24 0%, #12121A 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .placeholder-icon {
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }

    .placeholder-text {
      color: #64748B;
      font-size: 13px;
    }

    /* Interaction Bar */
    .interaction-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .interaction-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .interaction-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #CBD5E1;
      font-size: 14px;
    }

    .interaction-icon {
      width: 24px;
      height: 24px;
    }

    .time-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      font-size: 12px;
      color: #94A3B8;
    }

    /* Description */
    .description-section {
      padding: 14px 16px;
    }

    .description-text {
      font-size: 15px;
      line-height: 1.6;
      color: #F8FAFC;
    }

    .description-text .username {
      font-weight: 600;
    }

    /* Location Card */
    .location-card {
      margin: 0 16px 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
    }

    .location-map {
      height: 160px;
      background: #1A1A24;
      position: relative;
    }

    .location-map iframe {
      width: 100%;
      height: 100%;
      border: none;
      filter: grayscale(0.3) brightness(0.9);
    }

    .location-info {
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .location-icon-container {
      width: 40px;
      height: 40px;
      background: rgba(139, 92, 246, 0.15);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .location-details {
      flex: 1;
    }

    .location-title {
      font-size: 14px;
      font-weight: 600;
      color: #F8FAFC;
      margin-bottom: 2px;
    }

    .location-subtitle {
      font-size: 12px;
      color: #94A3B8;
    }

    /* CTA Section */
    .cta-section {
      padding: 20px 16px 32px;
    }

    .cta-card {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 20px;
      padding: 24px;
      text-align: center;
    }

    .cta-title {
      font-size: 18px;
      font-weight: 700;
      color: #F8FAFC;
      margin-bottom: 8px;
    }

    .cta-text {
      font-size: 14px;
      color: #94A3B8;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .cta-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 24px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: white;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(139, 92, 246, 0.5);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #F8FAFC;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-icon {
      width: 20px;
      height: 20px;
    }

    /* Share Section */
    .share-section {
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .share-title {
      font-size: 13px;
      color: #64748B;
      text-align: center;
      margin-bottom: 16px;
    }

    .share-buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    .share-btn {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }

    .share-btn:hover {
      transform: scale(1.1);
    }

    .share-whatsapp { background: #25D366; }
    .share-telegram { background: #0088cc; }
    .share-facebook { background: #1877F2; }
    .share-x { background: #000; border: 1px solid #333; }

    .share-icon {
      width: 24px;
      height: 24px;
    }

    /* Footer */
    .footer {
      padding: 20px 16px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .footer-text {
      font-size: 13px;
      color: #64748B;
    }

    .footer-logo {
      font-weight: 700;
      background: linear-gradient(135deg, #8B5CF6, #06B6D4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Responsive */
    @media (min-width: 520px) {
      .content {
        margin-top: 20px;
        margin-bottom: 20px;
        border-radius: 24px;
        overflow: hidden;
        background: #12121A;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header -->
    <header class="header">
      <a href="/" class="header-logo">
        <div class="logo-icon">P</div>
        <div class="logo-text">Pee<span>K</span></div>
      </a>
      <a href="${deepLink}" class="header-action" id="openAppHeader">Abrir App</a>
    </header>

    <!-- Content -->
    <main class="content">
      <!-- User Header -->
      <div class="user-header">
        <div class="user-avatar">${creatorName.charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${creatorName}</div>
          <div class="user-meta">
            ${event.isUrgent ? '<div class="urgent-indicator"><span class="urgent-dot"></span></div>' : ''}
            <span class="type-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                ${getEventTypeIcon(event.type)}
              </svg>
              ${eventTypeShort}
            </span>
            <span class="status-badge ${event.status === 'IN_PROGRESS' ? 'status-progress' : 'status-closed'}">
              ${event.status === 'IN_PROGRESS' ? 'En progreso' : 'Cerrado'}
            </span>
          </div>
        </div>
      </div>

      <!-- Image -->
      ${event.imageUrl ? `
        <div class="event-image-container">
          <img
            src="${imageUrl}"
            alt="Imagen del evento"
            class="event-image"
            onerror="this.parentElement.innerHTML='<div class=\\'event-image-placeholder\\'><svg class=\\'placeholder-icon\\' viewBox=\\'0 0 24 24\\' fill=\\'#64748B\\'><path d=\\'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z\\'/></svg><span class=\\'placeholder-text\\'>Imagen no disponible</span></div>'"
          >
        </div>
      ` : `
        <div class="event-image-container">
          <div class="event-image-placeholder">
            <svg class="placeholder-icon" viewBox="0 0 24 24" fill="#64748B">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span class="placeholder-text">Ver ubicacion en la app</span>
          </div>
        </div>
      `}

      <!-- Interaction Bar -->
      <div class="interaction-bar">
        <div class="interaction-left">
          <div class="interaction-item">
            <svg class="interaction-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div class="interaction-item">
            <svg class="interaction-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
        </div>
        <div class="time-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          ${formattedDate}
        </div>
      </div>

      <!-- Description -->
      <div class="description-section">
        <p class="description-text">
          <span class="username">${creatorName}</span> ${event.description}
        </p>
      </div>

      <!-- Location Card -->
      <div class="location-card">
        <div class="location-map">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${event.longitude}!3d${event.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses!2sar!4v1600000000000!5m2!1ses!2sar"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
        <div class="location-info">
          <div class="location-icon-container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#8B5CF6">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="location-details">
            <div class="location-title">Ver ubicacion exacta</div>
            <div class="location-subtitle">Abri la app para ver el mapa completo</div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="cta-section">
        <div class="cta-card">
          <h2 class="cta-title">Mas detalles en PeeK</h2>
          <p class="cta-text">${cta}</p>
          <div class="cta-buttons">
            <a href="${deepLink}" class="btn btn-primary" id="openApp">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12" y2="18"/>
              </svg>
              Abrir en PeeK
            </a>
            <a href="#" class="btn btn-secondary" id="downloadApp">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar la app
            </a>
          </div>
        </div>
      </div>

      <!-- Share Section -->
      <div class="share-section">
        <p class="share-title">Compartir esta alerta</p>
        <div class="share-buttons">
          <a href="https://wa.me/?text=${encodeURIComponent(title + ' - ' + webUrl)}" class="share-btn share-whatsapp" target="_blank" rel="noopener" title="WhatsApp">
            <svg class="share-icon" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
          <a href="https://t.me/share/url?url=${encodeURIComponent(webUrl)}&text=${encodeURIComponent(title)}" class="share-btn share-telegram" target="_blank" rel="noopener" title="Telegram">
            <svg class="share-icon" viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(webUrl)}" class="share-btn share-facebook" target="_blank" rel="noopener" title="Facebook">
            <svg class="share-icon" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
          <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(webUrl)}&text=${encodeURIComponent(title)}" class="share-btn share-x" target="_blank" rel="noopener" title="X">
            <svg class="share-icon" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <p class="footer-text">
        Alertas comunitarias con <span class="footer-logo">PeeK</span>
      </p>
    </footer>
  </div>

  <script>
    function handleOpenApp(e) {
      e.preventDefault();
      const deepLink = '${deepLink}';
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      window.location.href = deepLink;

      setTimeout(function() {
        if (isIOS) {
          window.location.href = 'https://apps.apple.com/app/peek/idYOUR_APP_ID';
        } else if (isAndroid) {
          window.location.href = 'https://play.google.com/store/apps/details?id=com.peek.app';
        }
      }, 2500);
    }

    function handleDownload(e) {
      e.preventDefault();
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      if (isIOS) {
        window.location.href = 'https://apps.apple.com/app/peek/idYOUR_APP_ID';
      } else if (isAndroid) {
        window.location.href = 'https://play.google.com/store/apps/details?id=com.peek.app';
      } else {
        alert('Visita la tienda de aplicaciones de tu dispositivo y busca "PeeK"');
      }
    }

    document.getElementById('openApp')?.addEventListener('click', handleOpenApp);
    document.getElementById('openAppHeader')?.addEventListener('click', handleOpenApp);
    document.getElementById('downloadApp')?.addEventListener('click', handleDownload);
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

function getEventTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    THEFT: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
    LOST: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    ACCIDENT: '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>',
    FIRE: '<path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>',
    GENERAL: '<path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/>',
  };
  return icons[type] || icons.GENERAL;
}

function generateNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evento no encontrado - PeeK</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0F;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #F8FAFC;
    }
    .container {
      background: #12121A;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .icon { margin-bottom: 20px; }
    h1 { color: #F8FAFC; margin-bottom: 12px; font-size: 22px; }
    p { color: #94A3B8; margin-bottom: 24px; line-height: 1.6; }
    a {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: white;
      text-decoration: none;
      border-radius: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }
    a:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon"><svg width="64" height="64" viewBox="0 0 24 24" fill="#8B5CF6"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></div>
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
  <title>Evento privado - PeeK</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0F;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #F8FAFC;
    }
    .container {
      background: #12121A;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .icon { margin-bottom: 20px; }
    h1 { color: #F8FAFC; margin-bottom: 12px; font-size: 22px; }
    p { color: #94A3B8; margin-bottom: 24px; line-height: 1.6; }
    a {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: white;
      text-decoration: none;
      border-radius: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }
    a:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon"><svg width="64" height="64" viewBox="0 0 24 24" fill="#8B5CF6"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg></div>
    <h1>Evento privado</h1>
    <p>Los detalles de este evento no pueden ser mostrados porque es un evento privado o pertenece a un grupo cerrado.</p>
    <a href="/">Descargar PeeK</a>
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
  <title>Error - PeeK</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0F;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #F8FAFC;
    }
    .container {
      background: #12121A;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .icon { margin-bottom: 20px; }
    h1 { color: #F8FAFC; margin-bottom: 12px; font-size: 22px; }
    p { color: #94A3B8; margin-bottom: 24px; line-height: 1.6; }
    a {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: white;
      text-decoration: none;
      border-radius: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }
    a:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon"><svg width="64" height="64" viewBox="0 0 24 24" fill="#EF4444"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></div>
    <h1>Algo salio mal</h1>
    <p>No pudimos cargar el evento. Por favor intenta de nuevo.</p>
    <a href="javascript:location.reload()">Reintentar</a>
  </div>
</body>
</html>`;
}
