
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

// ONE-TIME-USE: Endpoint to set up initial admin users
app.post('/api/setup-users', async (req, res) => {
    // Simple password protection for this endpoint
    if (req.body.secret !== process.env.JWT_SECRET) {
        return res.status(401).send('No autorizado');
    }

    const users = [
        { username: 'diego', email: 'contacto@petgas.com.mx', password: 'NyeaR[QcW;tP' },
        { username: 'admin', email: 'nfts2030@gmail.com', password: 'R1712admin2019!' }
    ];

    try {
        for (const user of users) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(user.password, salt);

            const { data, error } = await supabase
                .from('users')
                .insert([
                    { username: user.username, email: user.email, password_hash: password_hash }
                ]);

            if (error) {
                // Handle potential duplicate users gracefully
                if (error.code === '23505') { // Unique violation
                    console.log(`Usuario ${user.username} ya existe.`);
                } else {
                    throw error;
                }
            }
        }
        res.status(201).json({ message: 'Usuarios creados o actualizados exitosamente.' });
    } catch (error) {
        console.error('Error al configurar usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear usuarios.' });
    }
});


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


app.get('/admin/data', verifyToken, async (req, res) => {
    const { data, error } = await supabase
        .from('clientes')
        .select('*');

    if (error) {
        console.error('Error fetching data from Supabase:', error);
        return res.status(500).send('Error al obtener los datos');
    }

    res.json(data);
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

module.exports = app;
