// Vercel API endpoint for health check
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
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(200).end();
      return;
    }
    
    // Only allow GET requests
    if (request.method !== 'GET') {
      return sendJsonResponse(response, 405, { 
        success: false, 
        message: 'Método no permitido. Solo se permiten solicitudes GET.' 
      });
    }

    // Get detailed system information
    const healthInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    return sendJsonResponse(response, 200, { 
      success: true, 
      message: 'API is working correctly',
      timestamp: new Date().toISOString(),
      info: healthInfo
    });
  } catch (error: any) {
    console.error('Error in health check:', error);
    
    return sendJsonResponse(response, 500, { 
      success: false, 
      message: 'Error en la verificación de salud de la API.',
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: process.env.NODE_ENV === 'development' ? {
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
  }
}