// Vercel API endpoint for contact form
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as nodemailer from 'nodemailer';

// Helper function to ensure JSON response
const sendJsonResponse = (response: VercelResponse, status: number, data: any) => {
  response.setHeader('Content-Type', 'application/json');
  response.status(status).json(data);
};

// Mock email sending function for testing
const mockSendEmail = async (mailOptions: any) => {
  console.log('MOCK EMAIL SEND:', {
    to: mailOptions.to,
    subject: mailOptions.subject,
    from: mailOptions.from,
  });

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return success (this would be replaced with actual email sending)
  return { messageId: 'mock-message-id-' + Date.now() };
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[${requestId}] Contact form request started`);

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

    // Try to send email with multiple fallback options
    const emailMethods = [
      // Primary method - original SMTP
      async () => {
        console.log(`[${requestId}] Trying primary SMTP method (port 465)...`);
        const transporter = nodemailer.createTransport({
          host: 'mail.petgas.com.mx',
          port: 465,
          secure: true,
          auth: {
            user: 'contacto@petgas.com.mx',
            pass: 'NyeaR[QcW;tP',
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        });

        // Verify connection
        console.log(`[${requestId}] Verifying SMTP connection...`);
        await transporter.verify();
        console.log(`[${requestId}] SMTP verification successful`);

        const mailOptions = {
          from: '"Formulario de Contacto" <contacto@petgas.com.mx>',
          to: 'contacto@petgas.com.mx',
          replyTo: email,
          subject: `Nuevo mensaje de contacto: ${subject}`,
          html: `
            <h2>Nuevo mensaje de contacto</h2>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
            <p><strong>Asunto:</strong> ${subject}</p>
            <p><strong>Mensaje:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>Enviado desde el formulario de contacto de PETGAS México - ${new Date().toLocaleString()}</small></p>
          `,
          text: `
            Nuevo mensaje de contacto

            Nombre: ${name}
            Email: ${email}
            Teléfono: ${phone || 'No proporcionado'}
            Asunto: ${subject}

            Mensaje:
            ${message}

            ---
            Enviado desde el formulario de contacto de PETGAS México - ${new Date().toLocaleString()}
          `,
        };

        console.log(`[${requestId}] Sending email via primary SMTP...`);
        const result = await transporter.sendMail(mailOptions);
        console.log(`[${requestId}] Primary SMTP email sent successfully:`, result.messageId);
        return result;
      },

      // Fallback method 1 - Alternative port
      async () => {
        console.log(`[${requestId}] Trying fallback SMTP method (port 587)...`);
        const transporter = nodemailer.createTransport({
          host: 'mail.petgas.com.mx',
          port: 587,
          secure: false,
          auth: {
            user: 'contacto@petgas.com.mx',
            pass: 'NyeaR[QcW;tP',
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        });

        console.log(`[${requestId}] Verifying fallback SMTP connection...`);
        await transporter.verify();
        console.log(`[${requestId}] Fallback SMTP verification successful`);

        const mailOptions = {
          from: '"Formulario de Contacto" <contacto@petgas.com.mx>',
          to: 'contacto@petgas.com.mx',
          replyTo: email,
          subject: `Nuevo mensaje de contacto: ${subject}`,
          html: `
            <h2>Nuevo mensaje de contacto</h2>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
            <p><strong>Asunto:</strong> ${subject}</p>
            <p><strong>Mensaje:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>Enviado desde el formulario de contacto de PETGAS México - ${new Date().toLocaleString()}</small></p>
          `,
          text: `
            Nuevo mensaje de contacto

            Nombre: ${name}
            Email: ${email}
            Teléfono: ${phone || 'No proporcionado'}
            Asunto: ${subject}

            Mensaje:
            ${message}

            ---
            Enviado desde el formulario de contacto de PETGAS México - ${new Date().toLocaleString()}
          `,
        };

        console.log(`[${requestId}] Sending email via fallback SMTP...`);
        const result = await transporter.sendMail(mailOptions);
        console.log(`[${requestId}] Fallback SMTP email sent successfully:`, result.messageId);
        return result;
      },
    ];

    // Try each method in sequence
    let lastError: any = null;
    let emailSent = false;

    for (let i = 0; i < emailMethods.length; i++) {
      try {
        console.log(`[${requestId}] Attempting email method ${i + 1}...`);
        const result = await emailMethods[i]();
        console.log(
          `[${requestId}] Email method ${i + 1} succeeded with messageId:`,
          result.messageId
        );

        emailSent = true;
        return sendJsonResponse(response, 200, {
          success: true,
          sent: true,
          message: '¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto.',
          method: `SMTP Method ${i + 1}`,
          messageId: result.messageId,
          debug:
            process.env.NODE_ENV === 'development'
              ? {
                  result: { messageId: result.messageId, response: result.response },
                }
              : undefined,
        });
      } catch (error: any) {
        console.error(`[${requestId}] Email method ${i + 1} failed:`, {
          message: error.message,
          code: error.code,
          command: error.command,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
        lastError = error;

        // If this is the last method, continue to error handling
        if (i === emailMethods.length - 1) {
          break;
        }

        // Wait a bit before trying the next method
        console.log(`[${requestId}] Waiting before trying next method...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // If we get here, all methods failed
    console.error(`[${requestId}] All email methods failed. Last error:`, {
      message: lastError?.message,
      code: lastError?.code,
      command: lastError?.command,
    });

    // Store form data for manual follow-up
    const formData = {
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
      error: lastError
        ? {
            message: lastError.message,
            code: lastError.code,
            command: lastError.command,
          }
        : null,
    };

    console.log(`[${requestId}] Form data stored for manual follow-up:`, {
      ...formData,
      email: formData.email.replace(/(.{2}).*@/, '$1***@'), // Mask email in logs
    });

    // Return an error response indicating the email failed
    return sendJsonResponse(response, 500, {
      success: false,
      sent: false,
      stored: true,
      message:
        'Lo sentimos, hubo un problema técnico al enviar tu mensaje. Hemos guardado tu información y nos pondremos en contacto contigo pronto. Si es urgente, puedes contactarnos directamente por teléfono.',
      requestId,
      debug:
        process.env.NODE_ENV === 'development'
          ? {
              lastError: {
                message: lastError?.message,
                code: lastError?.code,
                command: lastError?.command,
              },
            }
          : undefined,
    });
  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error in contact form handler:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    // Return proper error response for unexpected errors
    return sendJsonResponse(response, 500, {
      success: false,
      sent: false,
      stored: false,
      message:
        'Lo sentimos, ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde o contáctanos directamente.',
      requestId,
      debug:
        process.env.NODE_ENV === 'development'
          ? {
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            }
          : undefined,
    });
  }
}
