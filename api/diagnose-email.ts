// Vercel API endpoint for diagnosing email issues
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as nodemailer from 'nodemailer';

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
    response.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(200).end();
      return;
    }

    if (request.method !== 'POST') {
      return sendJsonResponse(response, 405, {
        success: false,
        message: 'Solo se permiten solicitudes POST',
      });
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      tests: [],
    };

    // Test 1: SMTP Connection Test (Primary)
    try {
      console.log('Testing primary SMTP connection...');
      const transporter1 = nodemailer.createTransport({
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

      await transporter1.verify();
      diagnostics.tests.push({
        name: 'Primary SMTP Connection (465)',
        status: 'SUCCESS',
        message: 'Connection successful',
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Primary SMTP Connection (465)',
        status: 'FAILED',
        error: error.message,
        code: error.code,
        command: error.command,
      });
    }

    // Test 2: Alternative SMTP Connection Test
    try {
      console.log('Testing alternative SMTP connection...');
      const transporter2 = nodemailer.createTransport({
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

      await transporter2.verify();
      diagnostics.tests.push({
        name: 'Alternative SMTP Connection (587)',
        status: 'SUCCESS',
        message: 'Connection successful',
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Alternative SMTP Connection (587)',
        status: 'FAILED',
        error: error.message,
        code: error.code,
        command: error.command,
      });
    }

    // Test 3: Try to send actual test email if at least one connection works
    const hasWorkingConnection = diagnostics.tests.some((test) => test.status === 'SUCCESS');

    if (hasWorkingConnection && request.body?.sendTestEmail) {
      try {
        console.log('Attempting to send test email...');

        // Use the working configuration
        const workingTest = diagnostics.tests.find((test) => test.status === 'SUCCESS');
        const isPort465 = workingTest?.name.includes('465');

        const transporter = nodemailer.createTransport({
          host: 'mail.petgas.com.mx',
          port: isPort465 ? 465 : 587,
          secure: isPort465,
          auth: {
            user: 'contacto@petgas.com.mx',
            pass: 'NyeaR[QcW;tP',
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        const mailOptions = {
          from: '"PETGAS Diagnóstico" <contacto@petgas.com.mx>',
          to: 'contacto@petgas.com.mx',
          subject: 'Test de diagnóstico de email - ' + new Date().toLocaleString(),
          html: `
            <h2>Email de Prueba - Diagnóstico</h2>
            <p><strong>Timestamp:</strong> ${diagnostics.timestamp}</p>
            <p><strong>Entorno:</strong> ${diagnostics.environment}</p>
            <p><strong>Puerto usado:</strong> ${isPort465 ? '465 (SSL)' : '587 (TLS)'}</p>
            <p><strong>IP del servidor:</strong> ${request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'Unknown'}</p>
            <p><strong>User Agent:</strong> ${request.headers['user-agent'] || 'Unknown'}</p>
            <hr>
            <p><small>Este es un email automático de prueba del sistema de diagnóstico</small></p>
          `,
          text: `
            Email de Prueba - Diagnóstico

            Timestamp: ${diagnostics.timestamp}
            Entorno: ${diagnostics.environment}
            Puerto usado: ${isPort465 ? '465 (SSL)' : '587 (TLS)'}
            IP del servidor: ${request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'Unknown'}
            User Agent: ${request.headers['user-agent'] || 'Unknown'}

            ---
            Este es un email automático de prueba del sistema de diagnóstico
          `,
        };

        const result = await transporter.sendMail(mailOptions);
        diagnostics.tests.push({
          name: 'Send Test Email',
          status: 'SUCCESS',
          messageId: result.messageId,
          message: 'Test email sent successfully',
        });
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'Send Test Email',
          status: 'FAILED',
          error: error.message,
          code: error.code,
          command: error.command,
        });
      }
    }

    // Test 4: Environment Variables Check
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      VERCEL: process.env.VERCEL || 'not set',
      VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
      VERCEL_REGION: process.env.VERCEL_REGION || 'not set',
    };

    diagnostics.environment_details = envVars;

    // Test 5: Network connectivity test (simplified)
    try {
      // Simple connectivity test using fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      // Try to connect to the mail server on HTTP (just to test connectivity)
      const response = await fetch('https://mail.petgas.com.mx', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      diagnostics.tests.push({
        name: 'Network Connectivity',
        status: 'SUCCESS',
        message: `Server accessible (HTTP ${response.status})`,
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Network Connectivity',
        status: 'FAILED',
        error: error.name === 'AbortError' ? 'Connection timeout' : error.message,
      });
    }

    // Summary
    const successCount = diagnostics.tests.filter((test) => test.status === 'SUCCESS').length;
    const totalTests = diagnostics.tests.length;

    diagnostics.summary = {
      total_tests: totalTests,
      successful_tests: successCount,
      failed_tests: totalTests - successCount,
      overall_status: successCount > 0 ? 'PARTIAL_SUCCESS' : 'ALL_FAILED',
      recommendations: [],
    };

    // Add recommendations based on test results
    if (diagnostics.tests.some((test) => test.name.includes('SMTP') && test.status === 'FAILED')) {
      diagnostics.summary.recommendations.push(
        'SMTP connection failed. Consider using alternative email service like SendGrid, Resend, or Mailgun for better reliability on Vercel.'
      );
    }

    if (
      diagnostics.tests.some((test) => test.name === 'DNS Resolution' && test.status === 'FAILED')
    ) {
      diagnostics.summary.recommendations.push(
        'DNS resolution failed. Check if mail.petgas.com.mx is accessible from Vercel servers.'
      );
    }

    if (diagnostics.tests.every((test) => test.name.includes('SMTP') && test.status === 'FAILED')) {
      diagnostics.summary.recommendations.push(
        'All SMTP connections failed. This is likely due to Vercel network restrictions or mail server configuration issues.'
      );
    }

    const httpStatus = successCount > 0 ? 200 : 500;

    return sendJsonResponse(response, httpStatus, {
      success: successCount > 0,
      message: `Diagnóstico completado: ${successCount}/${totalTests} pruebas exitosas`,
      diagnostics,
    });
  } catch (error: any) {
    console.error('Unexpected error in email diagnosis:', error);

    return sendJsonResponse(response, 500, {
      success: false,
      message: 'Error durante el diagnóstico',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
