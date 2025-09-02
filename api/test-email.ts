// Vercel API endpoint for testing email configuration
import { VercelRequest, VercelResponse } from '@vercel/node';

// Helper function to ensure JSON response
const sendJsonResponse = (response: VercelResponse, status: number, data: any) => {
  response.setHeader('Content-Type', 'application/json');
  response.status(status).json(data);
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    // Set CORS headers for all responses
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    response.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(200).end();
      return;
    }

    if (request.method === 'GET') {
      return sendJsonResponse(response, 200, {
        success: true,
        message: 'Email test endpoint is working',
        timestamp: new Date().toISOString(),
      });
    }

    if (request.method === 'POST') {
      try {
        // Dynamically import nodemailer for Vercel compatibility
        const nodemailer = await import('nodemailer');

        // Test the current email configuration
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
        });

        // Verify connection configuration
        await transporter.verify();

        return sendJsonResponse(response, 200, {
          success: true,
          message: '✅ SMTP connection successful!',
          details: {
            host: 'mail.petgas.com.mx',
            port: 465,
            secure: true,
          },
        });
      } catch (error: any) {
        console.error('Email test failed:', error);

        // Log detailed error information
        const errorDetails = {
          message: error.message,
          code: error.code,
          command: error.command,
          stack: error.stack,
        };

        return sendJsonResponse(response, 500, {
          success: false,
          message: '❌ SMTP connection failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          details: {
            host: 'mail.petgas.com.mx',
            port: 465,
            secure: true,
          },
          debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        });
      }
    }

    // If we get here, it's an unsupported method
    return sendJsonResponse(response, 405, {
      success: false,
      message: 'Método no permitido',
    });
  } catch (error: any) {
    console.error('Unexpected error in test-email endpoint:', error);

    return sendJsonResponse(response, 500, {
      success: false,
      message: 'Error interno del servidor',
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
