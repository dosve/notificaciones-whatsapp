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

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
