const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Inicializa el cliente con autenticación local
const client = new Client({
    authStrategy: new LocalAuth()
});

// Genera y muestra el código QR en la terminal para escanear con WhatsApp Web
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el código QR con WhatsApp');
});

// Enviar un mensaje al grupo cuando el cliente está listo
client.on('ready', () => {
    console.log('Cliente está listo');
});

// Maneja errores
client.on('auth_failure', (msg) => {
    console.error('Error de autenticación', msg);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado', reason);
});

// Inicia el cliente
client.initialize();

// Crea un servidor Express
const app = express();
const PORT = 80;

// Middleware para parsear JSON
app.use(express.json());

// Endpoint para enviar un mensaje
app.post('/send-message', async (req, res) => {
    const { groupId, message } = req.body;

    if (!groupId || !message) {
        return res.status(400).json({ error: 'Faltan groupId o message en la solicitud.' });
    }

    try {
        // Envía el mensaje al grupo
        await client.sendMessage(groupId, message);
        console.log('Mensaje enviado al grupo:', message);
        return res.status(200).json({ success: 'Mensaje enviado.' });
    } catch (error) {
        console.error('Error al enviar el mensaje:', error);
        return res.status(500).json({ error: 'Error al enviar el mensaje.' });
    }
});

// Nuevo Endpoint para manejar el Webhook de Facebook
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = 'mi_token_de_verificacion';

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verifica si el modo y el token son válidos
    if (mode && token === VERIFY_TOKEN) {
        // Responde al challenge de verificación de Facebook
        console.log('Verificación del webhook exitosa');
        res.status(200).send(challenge);
    } else {
        // Respuesta no autorizada
        res.status(403).send('Error de verificación');
    }
});

// Maneja las notificaciones POST del Webhook de Facebook
app.post('/webhook', (req, res) => {
    const body = req.body;

    // Verifica que sea un evento de una página
    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            const pageID = entry.id;
            const timeOfEvent = entry.time;

            // Recorre todos los cambios en el feed
            entry.changes.forEach(function(change) {
                if (change.field === 'feed') {
                    const message = change.value.message || 'Sin mensaje';
                    console.log('Nueva publicación recibida:', message);

                    // Aquí podrías enviar un mensaje a WhatsApp usando el cliente
                    // Ejemplo: await client.sendMessage(groupId, message);
                }
            });
        });
        // Devuelve una respuesta 200 para confirmar que se recibió el evento
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Devuelve una respuesta 404 si el evento no es de una página
        res.status(404).send('Evento no soportado');
    }
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
