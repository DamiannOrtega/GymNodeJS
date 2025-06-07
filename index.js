const express = require("express");
const admin = require("firebase-admin");  // Importar Firebase Admin SDK
const nodemailer = require("nodemailer");
const cors = require("cors");
const QRCode = require('qrcode');
const app = express();
const port = process.env.PORT || 3000;

// Configurar Firebase Admin
const serviceAccount = require("./config/ServiceAccountKey.json");  // Ruta al archivo de credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gymweb-2025.firebaseio.com"  
});

const db = admin.firestore();  // Acceder a Firestore

app.use(cors()); // habilita CORS para llamadas desde Angular
app.use(express.urlencoded({extended:false}));
app.use(express.json());

// Prueba inicial
app.get('/', (req, res) => {
  res.send({ message: "helou jaz" });
});

// Ruta para obtener todos los registros de la colección "admins" (prueba funcionalidad de conexion de bd)
app.get('/api/admins', async (req, res) => {
  try {
    const snapshot = await db.collection("admins").get();  // Obtener todos los documentos en "admins"
    const admins = snapshot.docs.map(doc => doc.data());    // Mapear los documentos a un array
    res.status(200).json(admins);  // Devolver los datos como JSON
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los administradores", message: error.message });
  }
});

//PARTE DEL CORREO
// Configuración del transportador de correos
const transporter = nodemailer.createTransport({
  service: "gmail", // Se puede cambiar a otro proveedor (ej. Outlook, Yahoo)
  auth: {
    user: "vivapinaycarlitos@gmail.com",
    pass: "ohen cgif igag yivj"
  }
});

// Ruta para enviar correo
app.post('/api/enviar-correo', async (req, res) => {
  const { nombre, email, motivo, comentarios, respuesta } = req.body;

  const mailOptions = {
    from: 'vivapinaycarlitos@gmail.com',
    to: email,
    subject: `Respuesta a tu mensaje: ${motivo}`,
    html: `
      <h3>Hola ${nombre},</h3>
      <p><strong>Tu mensaje:</strong> ${comentarios}</p>
      <hr/>
      <p><strong>Respuesta:</strong> ${respuesta}</p>
      <p>Gracias por contactarnos,<br>Equipo FitZone</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Correo enviado con éxito' });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    res.status(500).json({ message: 'Error al enviar correo', error: error.message });
  }
});

// Ruta de mi primera prueba
app.get('/', (req, res) => {
  res.send({ message: "Servidor funcionando" });
});





// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});


//parte del codigo QR
app.post('/api/generar-qr', async (req, res) => {
  const {
    nombre,
    email,
    clase,
    turno,
    dias = [],
    fecha,
    precio,
    fechaRegistro
  } = req.body;

  const contenidoQR = `
    Registro FitZone
    ------------------------
    Nombre: ${nombre}
    Email: ${email}
    Clase: ${clase}
    Turno: ${turno}
    Días: ${dias.join(', ')}
    Fecha de inicio: ${fecha}
    Precio: $${precio}
    Registro: ${new Date(fechaRegistro).toLocaleString()}
  `;

  try {
    const qrBase64 = await QRCode.toDataURL(contenidoQR);
    res.status(200).json({ qr: qrBase64 });
  } catch (error) {
    console.error('Error al generar QR:', error);
    res.status(500).json({ error: 'No se pudo generar el código QR' });
  }
});