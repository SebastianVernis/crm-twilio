// Cargar las variables de entorno
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Twilio = require('twilio');

// Validar que las variables de entorno estén presentes
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.error("Error: Las credenciales de Twilio no están configuradas en el archivo .env");
    process.exit(1);
}

// Inicializar el cliente de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new Twilio(accountSid, authToken);

const app = express();
app.use(cors()); // Permitir peticiones desde el frontend
app.use(express.json());

// --- Endpoint para enviar SMS ---
app.post('/send-sms', async (req, res) => {
    const { to, body } = req.body;
    if (!to || !body) {
        return res.status(400).json({ success: false, message: 'Faltan el destinatario y el cuerpo del mensaje.' });
    }

    try {
        await client.messages.create({
            body: body,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });
        console.log(`SMS enviado a ${to}`);
        res.json({ success: true, message: 'SMS enviado con éxito.' });
    } catch (error) {
        console.error('Error al enviar SMS:', error);
        res.status(500).json({ success: false, message: 'Error al enviar SMS.' });
    }
});

// --- Endpoint para realizar llamadas (Click-to-Call) ---
app.post('/make-call', async (req, res) => {
    const { to } = req.body;
    if (!to) {
        return res.status(400).json({ success: false, message: 'Falta el número del destinatario.' });
    }

    const twiml = new Twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'alice', language: 'es-MX' }, 'Conectando con el cliente, por favor espere.');
    twiml.dial(to);

    try {
        await client.calls.create({
            twiml: twiml.toString(),
            to: process.env.AGENT_PHONE_NUMBER, // Llama al asesor primero
            from: process.env.TWILIO_PHONE_NUMBER
        });
        console.log(`Iniciando llamada al asesor para conectar con ${to}`);
        res.json({ success: true, message: 'Llamada iniciada. Tu teléfono sonará primero.' });
    } catch (error) {
        console.error('Error al iniciar la llamada:', error);
        res.status(500).json({ success: false, message: 'Error al iniciar la llamada.' });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Servidor de Twilio escuchando en el puerto ${PORT}`));
