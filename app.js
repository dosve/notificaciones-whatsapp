require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el código QR con WhatsApp');
});

client.on('ready', async () => {
    console.log('Cliente está listo');
   // Esperar 5 segundos para asegurarse de que los chats están sincronizados
   const chats = await client.getChats();
    console.log(`🔍 Total de chats cargados: ${chats.length}`);

    mostrarGrupos();
});

client.on('auth_failure', msg => {
    console.error('Error de autenticación', msg);
});

client.on('disconnected', reason => {
    console.log('Cliente desconectado', reason);
});

client.initialize();

app.post('/send-message', async (req, res) => {
    const { recipient, message } = req.body;

    if (!recipient || !message) {
        return res.status(400).json({ error: 'Faltan recipient o message en la solicitud.' });
    }

    try {
        await client.sendMessage(recipient, message);
        console.log('Mensaje enviado a:', recipient, 'Mensaje:', message);
        return res.status(200).json({ success: 'Mensaje enviado.' });
    } catch (error) {
        console.error('Error al enviar el mensaje:', error);
        return res.status(500).json({ error: 'Error al enviar el mensaje.' });
    }
});

if (process.env.APP_ENV === 'production') {
    const https = require('https');
    const privateKey = fs.readFileSync('/home/admin/certificados/privkey1.pem', 'utf8');
    const certificate = fs.readFileSync('/home/admin/certificados/fullchain1.pem', 'utf8');
    const ca = fs.readFileSync('/home/admin/certificados/chain1.pem', 'utf8');

    const credentials = { key: privateKey, cert: certificate, ca: ca };
    const httpsServer = https.createServer(credentials, app);

    httpsServer.listen(443, () => {
        console.log('Servidor HTTPS escuchando en https://server.activos-digitales.com');
    });

    const http = require('http');
    const httpServer = http.createServer((req, res) => {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    });

    httpServer.listen(80, () => {
        console.log('Redireccionando tráfico HTTP a HTTPS');
    });

} else {
    const PORT = 3000;

    app.listen(PORT, () => {
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
}


/**
 * Muestra en consola todos los grupos del usuario conectado
 */


async function mostrarGrupos() {
    try {
        const chats = await client.getChats(); // Obtener todos los chats
        const grupos = chats.filter(chat => chat.isGroup); // Filtrar solo los grupos

        console.log(`📋 Grupos encontrados: ${grupos.length}`);
        grupos.forEach(group => {
            console.log(`➡️ ${group.name} | ID: ${group.id._serialized}`);
        });

        return grupos;
    } catch (error) {
        console.error('❌ Error al obtener los grupos:', error);
        return [];
    }
}
