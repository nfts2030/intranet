// Test file for the Node.js API
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Handle CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }
  
  // Handle GET requests for testing
  if (request.method === 'GET') {
    response.status(200).json({ 
      success: true, 
      message: 'API endpoint is working correctly',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // Only allow POST requests for the actual contact form
  if (request.method !== 'POST') {
    response.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Only POST requests are accepted for the contact form.' 
    });
    return;
  }

  // For testing purposes, just return a success message
  response.status(200).json({ 
    success: true, 
    message: 'Contact form API is working correctly' 
  });
}