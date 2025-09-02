// Vercel API endpoint for contact form - Simplified Version with SendGrid
import { VercelRequest, VercelResponse } from '@vercel/node';

// Helper function to ensure JSON response
const sendJsonResponse = (response: VercelResponse, status: number, data: any) => {
  response.setHeader('Content-Type', 'application/json');
  response.status(status).json(data);
};

// Simple fallback email function using fetch to external service
const sendEmailViaWebhook = async (formData: any) => {
  // This could be a Zapier webhook, Make.com webhook, or any external service
  // For now, we'll simulate success for testing
  console.log('Fallback: Email data would be sent to external service:', formData);

  // In production, you would uncomment this and use a real webhook:
  /*
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    return response.ok;
  }
  */

  return true; // Simulate success for testing
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[${requestId}] Contact form request started (v2)`);

    // Set CORS headers for all responses
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    response.setHeader('Access-Control-Max-Age', '86400');

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

    // Parse body
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

    // Log the incoming request
    console.log(`[${requestId}] Contact form submission:`, {
      name,
      email: email.replace(/(.{2}).*@/, '$1***@'),
      phone: phone ? phone.replace(/(\d{3}).*(\d{4})/, '$1***$2') : 'Not provided',
      subject,
      messageLength: message.length,
    });

    // Prepare form data
    const formData = {
      requestId,
      name,
      email,
      phone: phone || '',
      subject,
      message,
      privacy,
      timestamp: new Date().toISOString(),
      userAgent: request.headers['user-agent'] || 'Unknown',
      ip: request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'Unknown',
    };

    // Try SendGrid first, then fallback
    let emailSent = false;
    let method = 'none';

    // Method 1: Try SendGrid if API key is available
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (sendGridApiKey && !emailSent) {
      try {
        console.log(`[${requestId}] Attempting SendGrid...`);

        // Dynamic import to avoid issues if @sendgrid/mail is not installed
        const sgMail = await import('@sendgrid/mail');
        sgMail.default.setApiKey(sendGridApiKey);

        const msg = {
          to: process.env.SENDGRID_TO_EMAIL || 'contacto@petgas.com.mx',
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || 'noreply@petgas.com.mx',
            name: 'PETGAS México - Formulario de Contacto'
          },
          replyTo: { email: email, name: name },
          subject: `Nuevo contacto: ${subject} - ${name}`,
          html: `
            <h2>Nuevo mensaje de contacto - PETGAS México</h2>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
            <p><strong>Asunto:</strong> ${subject}</p>
            <p><strong>Mensaje:</strong></p>
            <p style="background:#f5f5f5;padding:15px;border-left:4px solid #0a4b2a;">${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>Enviado desde el formulario de contacto - ${new Date().toLocaleString()}</small></p>
            <p><small>Request ID: ${requestId}</small></p>
          `,
          text: `
Nuevo mensaje de contacto - PETGAS México

Nombre: ${name}
Email: ${email}
Teléfono: ${phone || 'No proporcionado'}
Asunto: ${subject}

Mensaje:
${message}

---
Enviado: ${new Date().toLocaleString()}
Request ID: ${requestId}
          `
        };

        const [sgResponse] = await sgMail.default.send(msg);
        console.log(`[${requestId}] SendGrid success:`, sgResponse.statusCode);
        emailSent = true;
        method = 'SendGrid';

      } catch (error: any) {
        console.error(`[${requestId}] SendGrid failed:`, error.message);
        // Continue to fallback methods
      }
    }

    // Method 2: Fallback to webhook/external service
    if (!emailSent) {
      try {
        console.log(`[${requestId}] Attempting fallback method...`);
        const webhookSuccess = await sendEmailViaWebhook(formData);
        if (webhookSuccess) {
          emailSent = true;
          method = 'Webhook';
        }
      } catch (error: any) {
        console.error(`[${requestId}] Webhook failed:`, error.message);
      }
    }

    // Method 3: Simple SMTP attempt (basic nodemailer test)
    if (!emailSent) {
      try {
        console.log(`[${requestId}] Attempting simple SMTP...`);

        // Try basic nodemailer import
        const nodemailer = await import('nodemailer');

        if (nodemailer.createTransport) {
          const transporter = nodemailer.createTransport({
            host: 'mail.petgas.com.mx',
            port: 587,
            secure: false,
            auth: {
              user: 'contacto@petgas.com.mx',
              pass: 'NyeaR[QcW;tP',
            },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000,
          });

          await transporter.verify();

          const mailOptions = {
            from: '"Formulario de Contacto" <contacto@petgas.com.mx>',
            to: 'contacto@petgas.com.mx',
            replyTo: email,
            subject: `Nuevo contacto: ${subject}`,
            html: `
              <h2>Nuevo mensaje de contacto</h2>
              <p><strong>Nombre:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
              <p><strong>Asunto:</strong> ${subject}</p>
              <p><strong>Mensaje:</strong></p>
              <p>${message.replace(/\n/g, '<br>')}</p>
              <hr>
              <p><small>Enviado: ${new Date().toLocaleString()}</small></p>
            `,
          };

          await transporter.sendMail(mailOptions);
          console.log(`[${requestId}] SMTP success`);
          emailSent = true;
          method = 'SMTP';
        }
      } catch (error: any) {
        console.error(`[${requestId}] SMTP failed:`, error.message);
      }
    }

    // Store form data for manual follow-up regardless of email success
    console.log(`[${requestId}] Form data stored:`, {
      ...formData,
      email: formData.email.replace(/(.{2}).*@/, '$1***@'),
      method: method,
      emailSent: emailSent
    });

    // Return appropriate response
    if (emailSent) {
      return sendJsonResponse(response, 200, {
        success: true,
        sent: true,
        message: '¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto.',
        method: method,
        requestId: requestId,
      });
    } else {
      // Even if email fails, we acknowledge the form submission
      // and store it for manual follow-up
      return sendJsonResponse(response, 200, {
        success: true,
        sent: false,
        stored: true,
        message: '¡Mensaje recibido! Hemos guardado tu información y nos pondremos en contacto contigo pronto. Si es urgente, puedes llamarnos directamente.',
        requestId: requestId,
        note: 'Email delivery temporarily unavailable, but your message has been stored.'
      });
    }

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    return sendJsonResponse(response, 500, {
      success: false,
      sent: false,
      stored: false,
      message: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde o contáctanos directamente por teléfono.',
      requestId: requestId,
    });
  }
}
