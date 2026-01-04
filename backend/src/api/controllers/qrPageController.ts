import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class QRPageController {
  static async getQRPage(req: Request, res: Response) {
    try {
      const { qrCode } = req.params;

      const device = await prisma.device.findUnique({
        where: { qrCode },
        select: {
          id: true,
          name: true,
          type: true,
          qrEnabled: true,
        },
      });

      // Device not found
      if (!device) {
        return res.send(generateNotFoundPage());
      }

      // QR disabled
      if (!device.qrEnabled) {
        return res.send(generateDisabledPage());
      }

      // Detect protocol from x-forwarded-proto header (set by Railway/proxies) or default to https in production
      const protocol = req.headers['x-forwarded-proto'] || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      const baseUrl = process.env.BASE_URL || `${protocol}://${req.headers.host}`;
      const appScheme = 'peek://';
      const deepLink = `${appScheme}qr/${qrCode}`;
      const apiBaseUrl = `${baseUrl}/api/qr`;

      const html = generateQRPage(device.name || 'Objeto', qrCode, deepLink, apiBaseUrl, baseUrl);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error getting QR page:', error);
      res.status(500).send(generateErrorPage());
    }
  }
}

function generateQRPage(
  deviceName: string,
  qrCode: string,
  deepLink: string,
  apiBaseUrl: string,
  baseUrl: string
): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Encontraste: ${deviceName} - PeeK</title>

  <!-- Primary Meta Tags -->
  <meta name="title" content="Has encontrado un objeto perdido">
  <meta name="description" content="Contacta al dueno de ${deviceName} de forma segura y anonima">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Has encontrado un objeto perdido">
  <meta property="og:description" content="Contacta al dueno de ${deviceName}">
  <meta property="og:site_name" content="PeeK">

  <!-- App Links -->
  <meta property="al:ios:url" content="${deepLink}">
  <meta property="al:android:url" content="${deepLink}">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary: #8B5CF6;
      --primary-dark: #7C3AED;
      --success: #10B981;
      --success-dark: #059669;
      --bg: #0F0F1A;
      --bg-card: #1A1A2E;
      --bg-input: #252540;
      --text: #FFFFFF;
      --text-secondary: #9CA3AF;
      --border: #374151;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      min-height: 100vh;
      color: var(--text);
    }

    .container {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .header {
      text-align: center;
      padding: 24px 0;
    }

    .logo {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary) 0%, #EC4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }

    .found-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid var(--success);
      border-radius: 20px;
      color: var(--success);
      font-size: 14px;
      font-weight: 600;
    }

    /* Card */
    .card {
      background: var(--bg-card);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 20px;
      border: 1px solid var(--border);
    }

    .device-name {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .device-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--primary) 0%, #EC4899 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .info-text {
      color: var(--text-secondary);
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .privacy-note {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .privacy-note-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .privacy-note-text {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Form */
    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text);
    }

    .form-input {
      width: 100%;
      padding: 14px 16px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 16px;
      color: var(--text);
      outline: none;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      border-color: var(--primary);
    }

    .form-input::placeholder {
      color: var(--text-secondary);
    }

    textarea.form-input {
      min-height: 100px;
      resize: vertical;
    }

    .btn {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(139, 92, 246, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-success {
      background: linear-gradient(135deg, var(--success) 0%, var(--success-dark) 100%);
      color: white;
    }

    .btn-secondary {
      background: var(--bg-input);
      color: var(--text);
      border: 1px solid var(--border);
      margin-top: 12px;
    }

    /* Chat view */
    .chat-container {
      display: none;
      flex-direction: column;
      flex: 1;
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg-card);
      border-radius: 16px;
      margin-bottom: 16px;
    }

    .chat-header-info h3 {
      font-size: 16px;
      font-weight: 600;
    }

    .chat-header-info p {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 15px;
      line-height: 1.4;
    }

    .message-sent {
      align-self: flex-end;
      background: var(--primary);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message-received {
      align-self: flex-start;
      background: var(--bg-input);
      color: var(--text);
      border-bottom-left-radius: 4px;
    }

    .message-time {
      font-size: 11px;
      color: rgba(255,255,255,0.6);
      margin-top: 4px;
    }

    .message-received .message-time {
      color: var(--text-secondary);
    }

    .chat-input-container {
      display: flex;
      gap: 12px;
      padding: 16px 0;
    }

    .chat-input {
      flex: 1;
      padding: 14px 16px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 24px;
      font-size: 16px;
      color: var(--text);
      outline: none;
    }

    .chat-input:focus {
      border-color: var(--primary);
    }

    .send-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary);
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Status badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-active {
      background: rgba(16, 185, 129, 0.2);
      color: var(--success);
    }

    .status-resolved {
      background: rgba(59, 130, 246, 0.2);
      color: #3B82F6;
    }

    .status-closed {
      background: rgba(107, 114, 128, 0.2);
      color: #9CA3AF;
    }

    /* App download section */
    .app-section {
      text-align: center;
      padding: 24px;
      margin-top: auto;
    }

    .app-section p {
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 16px;
    }

    .app-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .app-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--text);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }

    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #EF4444;
      color: #EF4444;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      margin-bottom: 16px;
      display: none;
    }

    .success-message {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid var(--success);
      color: var(--success);
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      margin-bottom: 16px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">PeeK</div>
      <div class="found-badge">
        <span>&#128269;</span> Has encontrado un objeto
      </div>
    </div>

    <!-- Initial contact form -->
    <div id="contactForm">
      <div class="card">
        <div class="device-name">
          <div class="device-icon">&#128276;</div>
          <span>${deviceName}</span>
        </div>

        <p class="info-text">
          Este objeto tiene dueno registrado. Puedes contactarlo de forma segura
          y anonima para coordinar la devolucion.
        </p>

        <div class="privacy-note">
          <span class="privacy-note-icon">&#128274;</span>
          <span class="privacy-note-text">
            Tu informacion personal no sera compartida automaticamente.
            Solo se compartira lo que decidas escribir en el chat.
          </span>
        </div>

        <div id="errorMessage" class="error-message"></div>

        <form id="startChatForm">
          <div class="form-group">
            <label class="form-label">Tu nombre (opcional)</label>
            <input type="text" class="form-input" id="finderName" placeholder="Ej: Juan" maxlength="50">
          </div>

          <div class="form-group">
            <label class="form-label">Mensaje inicial</label>
            <textarea class="form-input" id="initialMessage" placeholder="Ej: Hola! Encontre tu objeto en el parque..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary" id="submitBtn">
            <span id="submitText">&#128172; Contactar al dueno</span>
            <span id="submitLoading" class="loading" style="display: none;"></span>
          </button>
        </form>

        <button class="btn btn-secondary" id="openAppBtn">
          &#128241; Abrir en la app PeeK
        </button>
      </div>
    </div>

    <!-- Chat view (shown after starting conversation) -->
    <div id="chatView" class="chat-container">
      <div class="chat-header">
        <div class="device-icon" style="width: 40px; height: 40px; font-size: 18px;">&#128276;</div>
        <div class="chat-header-info">
          <h3>${deviceName}</h3>
          <p>Chat con el dueno</p>
        </div>
        <span id="chatStatus" class="status-badge status-active">Activo</span>
      </div>

      <div class="messages-container" id="messagesContainer">
        <!-- Messages will be inserted here -->
      </div>

      <div class="chat-input-container">
        <input type="text" class="chat-input" id="messageInput" placeholder="Escribe un mensaje...">
        <button class="send-btn" id="sendBtn">&#10148;</button>
      </div>
    </div>

    <!-- App download section -->
    <div class="app-section">
      <p>Descarga PeeK para proteger tus objetos con QR</p>
      <div class="app-buttons">
        <a href="#" class="app-btn" id="iosBtn">
          <span>&#63743;</span> iOS
        </a>
        <a href="#" class="app-btn" id="androidBtn">
          <span>&#128225;</span> Android
        </a>
      </div>
    </div>
  </div>

  <script>
    const QR_CODE = '${qrCode}';
    const API_BASE = '${apiBaseUrl}';
    const DEEP_LINK = '${deepLink}';

    let chatId = null;
    let sessionId = null;
    let pollInterval = null;

    // DOM Elements
    const contactForm = document.getElementById('contactForm');
    const chatView = document.getElementById('chatView');
    const startChatForm = document.getElementById('startChatForm');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitLoading = document.getElementById('submitLoading');
    const errorMessage = document.getElementById('errorMessage');
    const chatStatus = document.getElementById('chatStatus');

    // Check for existing session
    function checkExistingSession() {
      const stored = localStorage.getItem('peek_chat_' + QR_CODE);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          chatId = data.chatId;
          sessionId = data.sessionId;
          showChat();
          loadMessages();
        } catch (e) {
          localStorage.removeItem('peek_chat_' + QR_CODE);
        }
      }
    }

    // Start chat form submission
    startChatForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const finderName = document.getElementById('finderName').value.trim();
      const message = document.getElementById('initialMessage').value.trim();

      submitBtn.disabled = true;
      submitText.style.display = 'none';
      submitLoading.style.display = 'inline-block';
      errorMessage.style.display = 'none';

      try {
        const response = await fetch(API_BASE + '/public/' + QR_CODE + '/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ finderName, message })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al iniciar el chat');
        }

        chatId = data.chatId;
        sessionId = data.sessionId;

        // Save to localStorage
        localStorage.setItem('peek_chat_' + QR_CODE, JSON.stringify({ chatId, sessionId }));

        showChat();
        loadMessages();

      } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        submitLoading.style.display = 'none';
      }
    });

    // Show chat view
    function showChat() {
      contactForm.style.display = 'none';
      chatView.style.display = 'flex';
      startPolling();
    }

    // Load messages
    async function loadMessages() {
      if (!chatId || !sessionId) return;

      try {
        const response = await fetch(API_BASE + '/public/chat/' + chatId + '/session/' + sessionId);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error);
        }

        renderMessages(data.messages);
        updateStatus(data.status);

      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }

    // Render messages
    function renderMessages(messages) {
      messagesContainer.innerHTML = messages.map(msg => {
        const time = new Date(msg.createdAt).toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const isOwner = msg.isOwner;

        return \`
          <div class="message \${isOwner ? 'message-received' : 'message-sent'}">
            \${escapeHtml(msg.content)}
            <div class="message-time">\${time}</div>
          </div>
        \`;
      }).join('');

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Update status badge
    function updateStatus(status) {
      chatStatus.className = 'status-badge';
      if (status === 'ACTIVE') {
        chatStatus.classList.add('status-active');
        chatStatus.textContent = 'Activo';
        messageInput.disabled = false;
        sendBtn.disabled = false;
      } else if (status === 'RESOLVED') {
        chatStatus.classList.add('status-resolved');
        chatStatus.textContent = 'Resuelto';
        messageInput.disabled = true;
        sendBtn.disabled = true;
        stopPolling();
      } else {
        chatStatus.classList.add('status-closed');
        chatStatus.textContent = 'Cerrado';
        messageInput.disabled = true;
        sendBtn.disabled = true;
        stopPolling();
      }
    }

    // Send message
    async function sendMessage() {
      const content = messageInput.value.trim();
      if (!content || !chatId || !sessionId) return;

      messageInput.disabled = true;
      sendBtn.disabled = true;

      try {
        const response = await fetch(
          API_BASE + '/public/chat/' + chatId + '/session/' + sessionId + '/message',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }

        messageInput.value = '';
        loadMessages();

      } catch (error) {
        console.error('Error sending message:', error);
        alert('Error al enviar mensaje: ' + error.message);
      } finally {
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
      }
    }

    // Send button click
    sendBtn.addEventListener('click', sendMessage);

    // Enter key to send
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Polling for new messages
    function startPolling() {
      pollInterval = setInterval(loadMessages, 5000);
    }

    function stopPolling() {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }

    // Open app button
    document.getElementById('openAppBtn').addEventListener('click', () => {
      window.location.href = DEEP_LINK;
    });

    // App store buttons
    document.getElementById('iosBtn').addEventListener('click', (e) => {
      e.preventDefault();
      // TODO: Add real App Store link
      alert('Proximamente en App Store');
    });

    document.getElementById('androidBtn').addEventListener('click', (e) => {
      e.preventDefault();
      // TODO: Add real Play Store link
      alert('Proximamente en Google Play');
    });

    // Helper function to escape HTML
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Initialize
    checkExistingSession();
  </script>
</body>
</html>`;
}

function generateNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR no encontrado - PeeK</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0F0F1A;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
      color: white;
    }
    .container {
      background: #1A1A2E;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
      border: 1px solid #374151;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { margin-bottom: 12px; }
    p { color: #9CA3AF; margin-bottom: 24px; }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#128269;</div>
    <h1>QR no encontrado</h1>
    <p>Este codigo QR no esta registrado en PeeK o fue eliminado.</p>
    <a href="/">Conoce PeeK</a>
  </div>
</body>
</html>`;
}

function generateDisabledPage(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR desactivado - PeeK</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0F0F1A;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
      color: white;
    }
    .container {
      background: #1A1A2E;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
      border: 1px solid #374151;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { margin-bottom: 12px; }
    p { color: #9CA3AF; margin-bottom: 24px; line-height: 1.6; }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#128683;</div>
    <h1>QR desactivado</h1>
    <p>El dueno de este objeto ha desactivado temporalmente el codigo QR.</p>
    <a href="/">Conoce PeeK</a>
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
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0F0F1A;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
      color: white;
    }
    .container {
      background: #1A1A2E;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
      border: 1px solid #374151;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { margin-bottom: 12px; }
    p { color: #9CA3AF; margin-bottom: 24px; }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#9888;</div>
    <h1>Algo salio mal</h1>
    <p>No pudimos cargar la informacion. Por favor intenta de nuevo.</p>
    <a href="javascript:location.reload()">Reintentar</a>
  </div>
</body>
</html>`;
}
