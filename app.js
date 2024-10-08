const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const https = require('https');
const fs = require('fs');

// Cargar los certificados desde la carpeta ~/certificados
const privateKey = fs.readFileSync('/home/admin/certificados/privkey1.pem', 'utf8');
const certificate = fs.readFileSync('/home/admin/certificados/fullchain1.pem', 'utf8');
const ca = fs.readFileSync('/home/admin/certificados/chain1.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: ca };

// Inicializa el cliente con autenticación local
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
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
    const { recipient, message } = req.body; // Cambiamos groupId por recipient

    if (!recipient || !message) {
        return res.status(400).json({ error: 'Faltan recipient o message en la solicitud.' });
    }

    try {
        // Envía el mensaje al destinatario (número o grupo)
        await client.sendMessage(recipient, message);
        console.log('Mensaje enviado a:', recipient, 'Mensaje:', message);
        return res.status(200).json({ success: 'Mensaje enviado.' });
    } catch (error) {
        console.error('Error al enviar el mensaje:', error);
        return res.status(500).json({ error: 'Error al enviar el mensaje.' });
    }
});

// Configura el servidor HTTPS
const httpsServer = https.createServer(credentials, app);

// Escuchar en el puerto 443 para HTTPS
httpsServer.listen(443, () => {
    console.log('Servidor HTTPS escuchando en https://server.activos-digitales.com');
});

// Redirigir tráfico HTTP a HTTPS
const http = require('http');
const httpServer = http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
});

// Escuchar en el puerto 80 para redirigir a HTTPS
httpServer.listen(80, () => {
    console.log('Redireccionando tráfico HTTP a HTTPS');
});
