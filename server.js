
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });

// Verificar variables de entorno
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'GEMINI_API_KEY', 'SMTP_HOST', 'SMTP_USERNAME', 'SMTP_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
    console.error('Faltan variables de entorno requeridas:', missingVars.join(', '));
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de body-parser con límites aumentados
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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

// Manejador de errores 404
app.use((req, res) => {
    res.status(404).send('404 - Not Found');
});

// Iniciar el servidor solo si no estamos en Vercel
if (process.env.VERCEL !== '1') {
    app.listen(port, () => {
        console.log(`Servidor corriendo en http://localhost:${port}`);
    });
}

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

// Ruta para manejar tanto /api/contacto como /contacto
app.post(['/contacto', '/api/contacto'], async (req, res) => {
    console.log('Received request body:', req.body);
    const { nombre, email, telefono, asunto, mensaje } = req.body;
    const referencia = uuidv4();

    const { data: insertData, error: insertError } = await supabase
        .from('clientes')
        .insert([{ nombre, email, telefono, mensaje, referencia }])
        .select();

    if (insertError) {
        console.error('Error inserting data into Supabase:', insertError);
        return res.status(500).send('Error al guardar los datos');
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

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            // Send a JSON response indicating partial success
            return res.json({ success: true, message: 'Datos recibidos, pero hubo un problema al enviar el correo de confirmación.' });
        }
        res.json({ success: true, message: '¡Éxito! Datos recibidos y correo de confirmación enviado.' });
    });
});

app.get('/admin/data', async (req, res) => {
    const { data, error } = await supabase
        .from('clientes')
        .select('*');

    if (error) {
        console.error('Error fetching data from Supabase:', error);
        return res.status(500).send('Error al obtener los datos');
    }

    res.json(data);
});

module.exports = app;
