// Vercel API endpoint for contact form - Development version
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Set CORS headers for all responses
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ 
      success: false, 
      message: 'Método no permitido. Solo se permiten solicitudes POST.' 
    });
  }

  try {
    const { name, email, phone, subject, message, privacy } = request.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      response.status(400).json({ 
        success: false, 
        message: 'Por favor, completa todos los campos requeridos.' 
      });
      return;
    }

    if (!privacy) {
      response.status(400).json({ 
        success: false, 
        message: 'Debes aceptar la política de privacidad.' 
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      response.status(400).json({ 
        success: false, 
        message: 'Por favor, ingresa un correo electrónico válido.' 
      });
      return;
    }

    // Simulate email sending in development
    console.log('=== CONTACT FORM SUBMISSION (DEVELOPMENT) ===');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Phone:', phone || 'No proporcionado');
    console.log('Subject:', subject);
    console.log('Message:', message);
    console.log('Privacy Accepted:', privacy);
    console.log('=============================================');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) { // 10% chance of failure
      throw new Error('Simulated network error');
    }
    
    response.status(200).json({ 
      success: true, 
      message: '¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto.' 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    
    response.status(500).json({ 
      success: false, 
      message: 'No se pudo enviar el mensaje. Por favor, inténtalo de nuevo más tarde.' 
    });
  }
}