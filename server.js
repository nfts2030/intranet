
// Trigger redeploy
console.log('--- Vercel Function Start ---');

const path = require('path');

try {
    console.log('Loading environment variables from .env file...');
    require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });
    console.log('dotenv config loaded.');
} catch (e) {
    console.error('CRITICAL: Failed to load dotenv.', e);
    process.exit(1);
}


// Verificar variables de entorno
console.log('Checking environment variables...');
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'GEMINI_API_KEY', 'SMTP_HOST', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => {
    const exists = !!process.env[varName];
    console.log(`- Checking var: ${varName}. Exists: ${exists}`);
    return !exists;
});

if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
    console.error('CRITICAL: Missing required environment variables:', missingVars.join(', '));
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}
console.log('Environment variables check passed.');

console.log('Requiring dependencies...');
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
console.log('Dependencies required.');

console.log('Initializing Express app...');


const app = express();
const port = process.env.PORT || 3000;

// Configuración de body-parser con límites aumentados
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public', {
    extensions: ['html', 'htm'],
    index: 'index.html'
}));

// Inicialización de clientes
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Ruta raíz para servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
});

async function analyzeMessage(asunto, mensaje) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  const prompt = `
    Clasifica el siguiente mensaje de cliente en una de estas categorías: Queja, Sugerencia, Consulta, Otro.

    Definiciones y Ejemplos:
    - Queja: El cliente expresa insatisfacción, un problema no resuelto, frustración, o un reclamo. Ejemplo: "Mi máquina no funciona y nadie me ayuda."
    - Sugerencia: El cliente propone una mejora o una idea. Ejemplo: "Deberían añadir más opciones de pago."
    - Consulta: El cliente pide información o hace una pregunta. Ejemplo: "¿Cuál es el horario de atención?"
    - Otro: El mensaje no encaja en las categorías anteriores.

    Analiza el "Asunto" y el "Mensaje" del cliente.

    Asunto: "${asunto}"
    Mensaje: "${mensaje}"

    Responde ÚNICAMENTE con la categoría final (Queja, Sugerencia, Consulta, u Otro).
  `;

  const result = await model.generateContent(prompt);
  console.log('Gemini raw response:', result.response.text());
  return result.response.text().trim();
}

// Ruta para /api/contacto
app.post('/api/contacto', async (req, res) => {
    console.log('=== INICIO DE SOLICITUD A /api/contacto ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('API Route - Received POST to /api/contacto');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);

    // Verificar que el cuerpo de la solicitud no esté vacío
    if (!req.body || Object.keys(req.body).length === 0) {
        const errorMsg = 'Error: Cuerpo de la solicitud vacío';
        console.error(errorMsg);
        return res.status(400).json({
            success: false,
            error: errorMsg,
            receivedBody: req.body
        });
    }
    console.log('Received request body:', req.body);
    // Extraer y validar campos requeridos
    const { nombre, email, telefono, asunto, mensaje } = req.body;
    
    if (!nombre || !email || !mensaje) {
        const errorMsg = 'Error: Faltan campos requeridos';
        console.error(errorMsg);
        return res.status(400).json({
            success: false,
            error: errorMsg,
            required: ['nombre', 'email', 'mensaje'],
            received: {
                nombre: !!nombre,
                email: !!email,
                mensaje: !!mensaje,
                telefono: !!telefono,
                asunto: !!asunto
            }
        });
    }
    const referencia = uuidv4();

    const { data: insertData, error: insertError } = await supabase
        .from('clientes')
        .insert([{ nombre, email, telefono, mensaje, referencia }])
        .select();

    if (insertError) {
        console.error('Error inserting data into Supabase:', insertError);
        return res.status(500).json({
            success: false,
            error: 'Error al guardar los datos en la base de datos',
            details: insertError
        });
    }

        const categoria = await analyzeMessage(asunto, mensaje);

    const { error: updateError } = await supabase
        .from('clientes')
        .update({ categoria })
        .eq('id', insertData[0].id);

    if (updateError) {
        console.error('Error updating data in Supabase:', updateError);
        // No es necesario devolver un error al cliente aquí, ya que el correo ya se ha enviado
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'ssl', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: email,
        subject: 'Confirmación de recepción de solicitud',
        html: `<p>Su solicitud ha sido recibida. Número de referencia: <strong>${referencia}</strong></p>`
    };

    try {
        // 1. Send confirmation email to the user
        await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent to user.');

        // 2. Send notification email to the company
        const notificationMailOptions = {
            from: process.env.MAIL_FROM,
            to: process.env.MAIL_TO,
            subject: `Nuevo Mensaje de Contacto (${categoria}): ${asunto}`,
            html: `
                <h1>Nuevo Mensaje de Contacto</h1>
                <p><strong>Referencia:</strong> ${referencia}</p>
                <p><strong>Categoría (Gemini):</strong> ${categoria}</p>
                <hr>
                <p><strong>Nombre:</strong> ${nombre}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Teléfono:</strong> ${telefono || 'No proporcionado'}</p>
                <hr>
                <p><strong>Asunto:</strong> ${asunto}</p>
                <p><strong>Mensaje:</strong></p>
                <p>${mensaje.replace(/\n/g, '<br>')}</p>
            `
        };
        await transporter.sendMail(notificationMailOptions);
        console.log('Notification email sent to admin.');

        res.json({ success: true, message: '¡Éxito! Datos recibidos y correos enviados.' });

    } catch (error) {
        console.error('Error sending email(s):', error);
        res.json({ success: true, message: 'Datos recibidos, pero hubo un problema al enviar uno o más correos.' });
    }
});

// ============== AUTHENTICATION ==============

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (token == null) {
        return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Acceso prohibido: Token no válido' });
        }
        req.user = user;
        next();
    });
}

// The /api/setup-users endpoint was removed for security.


// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, email, password_hash')
            .eq('email', email)
            .single();

        if (error || !users) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const user = users;
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }

        const payload = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({
            message: 'Login exitoso',
            token: token
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


app.get('/api/admin/data', verifyToken, async (req, res) => {
    const { data, error } = await supabase
        .from('clientes')
        .select('*');

    if (error) {
        console.error('Error fetching data from Supabase:', error);
        return res.status(500).send('Error al obtener los datos');
    }

    res.json(data);
});

// API endpoint for updating incident response status
app.put('/api/admin/incidents/:id', verifyToken, async (req, res) => {
    console.log('PUT /api/admin/incidents/:id route hit');
    const { id } = req.params;
    const { response_status, responded_by, response_message } = req.body;
    const user = req.user; // Get user info from JWT token

    try {
        // Validate incident ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de incidente inválido' });
        }

        // Validate required fields
        if (!response_status) {
            return res.status(400).json({ error: 'Estado de respuesta es requerido' });
        }

        // Prepare update data
        const updateData = {
            response_status,
            responded_by: responded_by || user.username || user.email,
            response_date: new Date().toISOString()
        };

        // Add response message if provided
        if (response_message !== undefined) {
            updateData.response_message = response_message;
        }

        // Update the incident in Supabase
        const { data, error } = await supabase
            .from('clientes')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating incident:', error);
            return res.status(500).json({ error: 'Error al actualizar el incidente' });
        }

        if (data.length === 0) {
            return res.status(404).json({ error: 'Incidente no encontrado' });
        }

        res.json({
            message: 'Incidente actualizado exitosamente',
            incident: data[0]
        });

    } catch (error) {
        console.error('Error updating incident:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// API endpoint for fetching list of users
app.get('/api/admin/users', verifyToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, email');

        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ error: 'Error al obtener la lista de usuarios' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// API endpoint for sending email responses to clients
app.post('/api/admin/incidents/:id/respond', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { response_message, response_subject } = req.body;
        const user = req.user; // Get user info from JWT token

        // Validate incident ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de incidente inválido' });
        }

        // Validate required fields
        if (!response_message) {
            return res.status(400).json({ error: 'Mensaje de respuesta es requerido' });
        }

        // Fetch incident details from Supabase
        const { data: incidentData, error: incidentError } = await supabase
            .from('clientes')
            .select('nombre, email, telefono, mensaje, referencia, categoria, created_at')
            .eq('id', id)
            .single();

        if (incidentError) {
            console.error('Error fetching incident:', incidentError);
            return res.status(500).json({ error: 'Error al obtener los datos del incidente' });
        }

        if (!incidentData) {
            return res.status(404).json({ error: 'Incidente no encontrado' });
        }

        // Create email transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'ssl', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USERNAME,
                pass: process.env.SMTP_PASSWORD
            }
        });

        // Prepare email content
        const subject = response_subject || `Respuesta a su solicitud: ${incidentData.referencia}`;
        
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #0a4b2a; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">PetGas - Respuesta a su solicitud</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <p>Estimado(a) <strong>${incidentData.nombre}</strong>,</p>
                    <p>Gracias por contactarnos. A continuación le proporcionamos una respuesta a su solicitud con referencia <strong>${incidentData.referencia}</strong>:</p>
                    <div style="background-color: white; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 20px 0;">
                        <h3 style="color: #0a4b2a; margin-top: 0;">Respuesta de nuestro equipo:</h3>
                        <p style="white-space: pre-wrap;">${response_message}</p>
                    </div>
                    <div style="background-color: #f0f0f0; border-left: 4px solid #0a4b2a; padding: 10px; margin: 20px 0;">
                        <h4 style="margin-top: 0;">Detalles de su solicitud original:</h4>
                        <p><strong>Referencia:</strong> ${incidentData.referencia}</p>
                        <p><strong>Categoría:</strong> ${incidentData.categoria || 'No especificada'}</p>
                        <p><strong>Fecha:</strong> ${new Date(incidentData.created_at).toLocaleDateString('es-ES')}</p>
                    </div>
                    <p>Atentamente,<br><strong>${user.username || user.email}</strong><br>Equipo de Soporte - PetGas</p>
                </div>
                <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
                    <p>Este es un mensaje automático. Por favor no responda a este correo.</p>
                    <p>PetGas - Servicio al Cliente</p>
                </div>
            </div>
        `;

        // Send email
        const mailOptions = {
            from: process.env.MAIL_FROM,
            to: incidentData.email,
            subject: subject,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`Response email sent to ${incidentData.email} for incident ${id}`);

        // Update incident with response info
        const { data: updateData, error: updateError } = await supabase
            .from('clientes')
            .update({
                response_message: response_message,
                responded_by: user.username || user.email,
                response_date: new Date().toISOString(),
                response_status: 'Resuelto'
            })
            .eq('id', id)
            .select();

        if (updateError) {
            console.error('Error updating incident:', updateError);
            // Don't fail the request if we can't update the database, since the email was sent
        }

        res.json({
            message: 'Respuesta enviada exitosamente',
            incident: updateData ? updateData[0] : incidentData
        });

    } catch (error) {
        console.error('Error sending response email:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Manejador de errores 404
app.use((req, res, next) => {
    console.log(`404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.path,
        method: req.method
    });
});

// Start the server only when run directly
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Servidor corriendo en http://localhost:${port}`);
    });
}

module.exports = app;
