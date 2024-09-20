const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const https = require('https');
const http = require('http');
const fs = require('fs');

// Cargar los certificados SSL generados por Let's Encrypt
const privateKey = fs.readFileSync('/etc/letsencrypt/live/server.activos-digitales.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/server.activos-digitales.com/fullchain.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/server.activos-digitales.com/chain.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: ca };

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
    const VERIFY_TOKEN = '123456789';

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

// Configura el servidor HTTPS
const httpsServer = https.createServer(credentials, app);

// Escuchar en el puerto 443 para HTTPS
httpsServer.listen(443, () => {
    console.log('Servidor HTTPS escuchando en https://server.activos-digitales.com');
});

// Redirigir tráfico HTTP a HTTPS
const httpServer = http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
});

// Escuchar en el puerto 80 para redirigir a HTTPS
httpServer.listen(80, () => {
    console.log('Redireccionando tráfico HTTP a HTTPS');
});
