// main.js
const { app, BrowserWindow } = require('electron');
const { MongoClient } = require('mongodb');
const { ipcMain } = require('electron');

let db;

async function connectToDatabase() {
  const uri = 'mongodb://localhost:27017'; // Cambia esto a la URI de tu base de datos
  const client = new MongoClient(uri);

  try {
    // Conectar a MongoDB
    await client.connect();
    console.log("Conectado a MongoDB");

    // Seleccionar la base de datos
    db = client.db("nombreDeTuBaseDeDatos"); // Cambia esto por el nombre de tu base de datos
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  win.loadURL('http://localhost:3000');
}

async function addDocument(collectionName, document) {
  try {
    const collection = db.collection(collectionName);
    const result = await collection.insertOne(document);
    console.log("Documento insertado con ID:", result.insertedId);
  } catch (error) {
    console.error("Error al insertar documento:", error);
  }
}

ipcMain.on('agregar-documento', async (event, documento) => {
  await addDocument("nombreDeLaColeccion", documento);
  event.reply('respuesta-agregar-documento', 'Documento agregado exitosamente');
});

// Ejecuta la conexión a la base de datos cuando Electron esté listo
app.whenReady().then(async () => {
  await connectToDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
