// Vercel API endpoint for contact form using SendGrid
import { VercelRequest, VercelResponse } from '@vercel/node';
import sgMail from '@sendgrid/mail';

// Helper function to ensure JSON response
const sendJsonResponse = (response: VercelResponse, status: number, data: any) => {
  response.setHeader('Content-Type', 'application/json');
  response.status(status).json(data);
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[${requestId}] Contact form request started (SendGrid)`);

    // Set CORS headers for all responses
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    response.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      console.log(`[${requestId}] Handling preflight request`);
      response.status(200).end();
      return;
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      console.log(`[${requestId}] Invalid method: ${request.method}`);
      return sendJsonResponse(response, 405, {
        success: false,
        message: 'Método no permitido. Solo se permiten solicitudes POST.',
      });
    }

    // Check if SendGrid API key is configured
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendGridApiKey) {
      console.error(`[${requestId}] SendGrid API key not configured`);
      return sendJsonResponse(response, 500, {
        success: false,
        message: 'Servicio de correo no configurado. Contacta al administrador.',
        error: 'SENDGRID_API_KEY not set',
      });
    }

    // Set SendGrid API key
    sgMail.setApiKey(sendGridApiKey);

    // Parse body - handle both string and object
    let body;
    if (typeof request.body === 'string') {
      try {
        body = JSON.parse(request.body);
      } catch (e) {
        return sendJsonResponse(response, 400, {
          success: false,
          message: 'Formato de datos inválido. Se esperaba JSON.',
        });
      }
    } else {
      body = request.body;
    }

    const { name, email, phone, subject, message, privacy } = body || {};

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return sendJsonResponse(response, 400, {
        success: false,
        message: 'Por favor, completa todos los campos requeridos.',
      });
    }

    if (!privacy) {
      return sendJsonResponse(response, 400, {
        success: false,
        message: 'Debes aceptar la política de privacidad.',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendJsonResponse(response, 400, {
        success: false,
        message: 'Por favor, ingresa un correo electrónico válido.',
      });
    }

    // Log the incoming request for debugging
    console.log(`[${requestId}] Contact form submission:`, {
      name,
      email: email.replace(/(.{2}).*@/, '$1***@'), // Partially mask email for privacy
      phone: phone ? phone.replace(/(\d{3}).*(\d{4})/, '$1***$2') : 'Not provided',
      subject,
    });

    // Prepare email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nuevo mensaje de contacto - PETGAS México</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #0a4b2a;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
          }
          .field {
            margin-bottom: 15px;
            padding: 10px;
            background-color: white;
            border-left: 4px solid #0a4b2a;
          }
          .field strong {
            color: #0a4b2a;
            display: inline-block;
            width: 100px;
          }
          .message-content {
            background-color: white;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #0a4b2a;
            margin-top: 10px;
            white-space: pre-line;
          }
          .footer {
            background-color: #0a4b2a;
            color: white;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            border-radius: 0 0 8px 8px;
          }
          .metadata {
            font-size: 11px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">Nuevo Mensaje de Contacto</h2>
          <p style="margin: 5px 0 0 0;">PETGAS México</p>
        </div>

        <div class="content">
          <div class="field">
            <strong>Nombre:</strong> ${name}
          </div>

          <div class="field">
            <strong>Email:</strong> <a href="mailto:${email}">${email}</a>
          </div>

          <div class="field">
            <strong>Teléfono:</strong> ${phone || 'No proporcionado'}
          </div>

          <div class="field">
            <strong>Asunto:</strong> ${subject}
          </div>

          <div class="field">
            <strong>Mensaje:</strong>
            <div class="message-content">${message}</div>
          </div>

          <div class="metadata">
            <strong>Información adicional:</strong><br>
            • Fecha y hora: ${new Date().toLocaleString('es-MX', {
              timeZone: 'America/Mexico_City',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}<br>
            • IP del usuario: ${request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'No disponible'}<br>
            • User Agent: ${request.headers['user-agent'] || 'No disponible'}<br>
            • Request ID: ${requestId}
          </div>
        </div>

        <div class="footer">
          Enviado automáticamente desde el formulario de contacto de PETGAS México<br>
          <a href="https://petgas.com.mx" style="color: #fff;">www.petgas.com.mx</a>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Nuevo mensaje de contacto - PETGAS México

Nombre: ${name}
Email: ${email}
Teléfono: ${phone || 'No proporcionado'}
Asunto: ${subject}

Mensaje:
${message}

---
Información adicional:
• Fecha y hora: ${new Date().toLocaleString('es-MX', {
  timeZone: 'America/Mexico_City',
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
• IP del usuario: ${request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'No disponible'}
• Request ID: ${requestId}

Enviado automáticamente desde el formulario de contacto de PETGAS México
www.petgas.com.mx
    `;

    // Prepare SendGrid message
    const msg = {
      to: process.env.SENDGRID_TO_EMAIL || 'contacto@petgas.com.mx',
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@petgas.com.mx',
        name: 'PETGAS México - Formulario de Contacto'
      },
      replyTo: {
        email: email,
        name: name
      },
      subject: `Nuevo contacto: ${subject} - ${name}`,
      text: textContent,
      html: htmlContent,
      categories: ['contact-form'],
      customArgs: {
        'request_id': requestId,
        'form_type': 'contact',
        'source': 'website'
      }
    };

    try {
      console.log(`[${requestId}] Sending email via SendGrid...`);

      const [sendGridResponse] = await sgMail.send(msg);

      console.log(`[${requestId}] SendGrid email sent successfully:`, {
        statusCode: sendGridResponse.statusCode,
        messageId: sendGridResponse.headers?.['x-message-id'],
      });

      // Log success for monitoring
      console.log(`[${requestId}] Contact form processed successfully`, {
        name,
        email: email.replace(/(.{2}).*@/, '$1***@'),
        subject,
        statusCode: sendGridResponse.statusCode,
      });

      return sendJsonResponse(response, 200, {
        success: true,
        sent: true,
        message: '¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto.',
        requestId,
        messageId: sendGridResponse.headers?.['x-message-id'],
      });

    } catch (sendGridError: any) {
      console.error(`[${requestId}] SendGrid email failed:`, {
        message: sendGridError.message,
        code: sendGridError.code,
        statusCode: sendGridError.response?.status,
        body: sendGridError.response?.body,
      });

      // Handle specific SendGrid errors
      let userMessage = 'No se pudo enviar el mensaje. Por favor, inténtalo de nuevo más tarde.';

      if (sendGridError.response?.status === 429) {
        userMessage = 'Límite de envío excedido. Por favor, inténtalo de nuevo en unos minutos.';
      } else if (sendGridError.response?.status === 401) {
        userMessage = 'Error de configuración del servicio de correo. Contacta al administrador.';
      } else if (sendGridError.response?.status >= 500) {
        userMessage = 'Problema temporal del servidor de correo. Por favor, inténtalo de nuevo más tarde.';
      }

      // Store form data for manual follow-up
      const errorFormData = {
        requestId,
        name,
        email,
        phone,
        subject,
        message,
        privacy,
        timestamp: new Date().toISOString(),
        userAgent: request.headers['user-agent'] || 'Unknown',
        ip: request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'Unknown',
        sendgrid_error: {
          message: sendGridError.message,
          code: sendGridError.code,
          status: sendGridError.response?.status,
        },
      };

      console.log(`[${requestId}] Form data logged for manual follow-up:`, {
        ...errorFormData,
        email: errorFormData.email.replace(/(.{2}).*@/, '$1***@'),
      });

      return sendJsonResponse(response, 500, {
        success: false,
        sent: false,
        stored: true,
        message: userMessage,
        requestId,
        debug: process.env.NODE_ENV === 'development' ? {
          sendgrid_error: {
            message: sendGridError.message,
            status: sendGridError.response?.status,
          }
        } : undefined,
      });
    }

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error in SendGrid contact handler:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    return sendJsonResponse(response, 500, {
      success: false,
      sent: false,
      stored: false,
      message: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.',
      requestId,
      debug: process.env.NODE_ENV === 'development' ? {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      } : undefined,
    });
  }
}
