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
    user: "gymfitzone2025@gmail.com",
    pass: "iwao brcb ooky mqti"
  }
});

// Ruta para enviar correo
app.post('/api/enviar-correo', async (req, res) => {
  const { nombre, email, motivo, comentarios, respuesta } = req.body;

  const mailOptions = {
    from: 'gymfitzone2025@gmail.com',
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
  const { nombre, email, clase, turno, fecha, precio, fechaRegistro } = req.body;
  let dias = req.body.dias;

  // Corregir si dias viene como string
  dias = Array.isArray(dias) ? dias : String(dias).split(',').map(d => d.trim());

  const contenidoQR = `
    Nombre: ${nombre}
    Email: ${email}
    Clase: ${clase}
    Turno: ${turno}
    Dias: ${dias.join(', ')}
    Fecha: ${fecha}
    Precio: $${precio}
    Registrado: ${fechaRegistro}
  `;

  try {
    const qr = await QRCode.toDataURL(contenidoQR);
    res.json({ qr });
  } catch (error) {
    console.error("Error al generar QR:", error);
    res.status(500).json({ error: "No se pudo generar el código QR" });
  }
});


app.get('/api/generar-qr/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const doc = await db.collection('inscripciones').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }

    const inscripcion = doc.data();

    const dias = Array.isArray(inscripcion.dias)
      ? inscripcion.dias
      : String(inscripcion.dias).split(',').map(d => d.trim());

    const contenidoQR = `
      Nombre: ${inscripcion.nombre}
      Email: ${inscripcion.email}
      Clase: ${inscripcion.clase}
      Turno: ${inscripcion.turno}
      Dias: ${dias.join(', ')}
      Fecha: ${inscripcion.fecha}
      Precio: $${inscripcion.precio}
      Registro: ${inscripcion.fechaRegistro}
    `;

    const qr = await QRCode.toDataURL(contenidoQR);
    res.json({ qr, datos: inscripcion }); // Devolver también los datos si los necesitas en el PDF

  } catch (error) {
    console.error('Error al generar QR desde Firebase:', error);
    res.status(500).json({ error: 'Error al generar QR desde Firebase' });
  }
});

app.post('/api/enviar-codigo', async (req, res) => {
  const { correo, usuario } = req.body;

  if (!correo || !usuario) {
    return res.status(400).json({ ok: false, mensaje: 'Faltan datos' });
  }

  try {
    const colecciones = ['usuarios', 'admins'];
    let encontrado = null;

    for (const col of colecciones) {
      const snapshot = await db.collection(col)
        .where('correo', '==', correo)
        .where('usuario', '==', usuario)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        encontrado = true;
        break;
      }
    }

    if (!encontrado) {
      return res.status(404).json({
        ok: false,
        mensaje: '❌ No se encontró una cuenta con ese usuario y correo'
      });
    }

    // Generar código y guardar
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    await db.collection('codigos').doc(correo).set({
      codigo,
      timestamp: Date.now()
    });

    // Enviar correo
    await transporter.sendMail({
      from: 'FitZone <gymfitzone2025@gmail.com>',
      to: correo,
      subject: 'Código de recuperación de cuenta',
      html: `
        <h3>Tu código de recuperación es:</h3>
        <p style="font-size: 24px; font-weight: bold;">${codigo}</p>
        <p>Este código expirará en unos minutos por seguridad.</p>
      `
    });

    return res.status(200).json({ ok: true, mensaje: 'Código enviado correctamente' });

  } catch (error) {
    console.error('Error al enviar el código:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error en el servidor', error: error.message });
  }
});

