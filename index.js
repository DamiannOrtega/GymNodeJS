const express = require("express");
const admin = require("firebase-admin");  // Importar Firebase Admin SDK

const app = express();
const port = process.env.PORT || 3000;

// Configurar Firebase Admin
const serviceAccount = require("./config/ServiceAccountKey.json");  // Ruta al archivo de credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gymweb-2025.firebaseio.com"  // Reemplaza con el ID de tu proyecto
});

const db = admin.firestore();  // Acceder a Firestore

app.use(express.urlencoded({extended:false}));
app.use(express.json());

// Prueba inicial
app.get('/', (req, res) => {
  res.send({ message: "helou jaz" });
});

// Ruta para obtener todos los registros de la colección "admins"
app.get('/api/admins', async (req, res) => {
  try {
    const snapshot = await db.collection("admins").get();  // Obtener todos los documentos en "admins"
    const admins = snapshot.docs.map(doc => doc.data());    // Mapear los documentos a un array
    res.status(200).json(admins);  // Devolver los datos como JSON
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los administradores", message: error.message });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
