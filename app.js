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
client.on('ready', async () => {
    console.log('Cliente está listo');

    // Reemplaza con el ID del grupo obtenido
    const groupId = '120363317929709782@g.us'; // Reemplaza con el ID de tu grupo

    try {
        // Envía un mensaje al grupo
        const message = '¡Hola a todos! Este es un mensaje para el grupo.';
        await client.sendMessage(groupId, message);
        console.log('Mensaje enviado al grupo');
    } catch (error) {
        console.error('Error al enviar el mensaje:', error);
    }
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
