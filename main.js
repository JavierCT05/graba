const { app, BrowserWindow, ipcMain } = require('electron');
const { MongoClient, ObjectId } = require('mongodb');

let db; // Variable global para la base de datos

// Función para conectar a la base de datos
async function connectToDatabase() {
  const uri = 'mongodb://localhost:27017'; // Dirección de MongoDB local
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Conectado a MongoDB");
    db = client.db("INVENTARIO"); // Base de datos: INVENTARIO
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
  }
}

// Crear ventana de Electron
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, // Permite el uso de Node.js en el renderizador
      contextIsolation: false, // Deshabilita la aislamiento de contexto (opcional para tu caso)
    },
  });

  // Asegúrate de que tu servidor React esté corriendo en http://localhost:3000
  win.loadURL('http://localhost:3000');
}

// Insertar un documento en la colección INVENTARIO
async function addDocument(collectionName, document) {
  try {
    const collection = db.collection(collectionName);
    const result = await collection.insertOne(document);
    console.log("Documento insertado con ID:", result.insertedId);
  } catch (error) {
    console.error("Error al insertar documento:", error);
  }
}

// Consultar documentos de la colección INVENTARIO con paginación
async function queryDocuments(collectionName, skip = 0, limit = 10) {
  try {
    const collection = db.collection(collectionName);
    const documents = await collection.find({}).skip(skip).limit(limit).toArray();
    return documents;
  } catch (error) {
    console.error("Error al consultar documentos:", error);
    return [];
  }
}

// Canal para consultar documentos con paginación
ipcMain.on('consultar-documentos', async (event, pagina, limit) => {
  console.log(`Recibiendo consulta de documentos - Página: ${pagina}, Límite: ${limit}`);
  const skip = (pagina - 1) * limit;

  try {
    // Usar la función queryDocuments para obtener los documentos paginados
    const documents = await queryDocuments('INVENTARIO', skip, limit);
    console.log(`Documentos encontrados: ${documents.length}`);

    // Contar el total de documentos en la colección
    const total = await db.collection('INVENTARIO').countDocuments({});
    const totalPages = Math.ceil(total / limit);

    // Enviar la respuesta con los documentos y el total de páginas
    event.reply('respuesta-consultar-documentos', { documents, totalPages });
  } catch (error) {
    console.error("Error al consultar documentos:", error);
    event.reply('respuesta-consultar-documentos', { documents: [], totalPages: 1 });
  }
});

// Canal para agregar documento
ipcMain.on('agregar-documento', async (event, documento) => {
  try {
    await addDocument("INVENTARIO", documento);
    event.reply('respuesta-agregar-documento', 'Documento agregado exitosamente');
  } catch (error) {
    console.error("Error al agregar documento:", error);
    event.reply('respuesta-agregar-documento', 'Error al agregar documento');
  }
});

// Canal para registrar venta (modificado para usar MongoDB directamente)
ipcMain.on('registrar-venta', async (event, { ventaId, ventaDetalles, totalVenta }) => {
  try {
    // Convertir articuloId a ObjectId si es un Buffer
    ventaDetalles.forEach(detalle => {
      if (detalle.articuloId && Buffer.isBuffer(detalle.articuloId)) {
        detalle.articuloId = new ObjectId(detalle.articuloId);
      }
    });

    // Crear un nuevo documento de venta
    const nuevaVenta = {
      ventaId,
      ventaDetalles,
      totalVenta,
    };

    // Insertar la venta en la colección de INVENTARIO (o una colección específica para ventas)
    await addDocument('ventas', nuevaVenta);
    console.log('Venta registrada exitosamente');
    event.reply('respuesta-registrar-venta', 'Venta registrada exitosamente');
  } catch (error) {
    console.error('Error al registrar la venta:', error);
    event.reply('respuesta-registrar-venta', 'Error al registrar la venta');
  }
});

// Ejecuta la conexión a la base de datos cuando Electron esté listo
app.whenReady().then(async () => {
  await connectToDatabase(); // Conectar a MongoDB
  createWindow(); // Crear la ventana del navegador con React
});

// Cerrar la aplicación si todas las ventanas se cierran
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Re-crear la ventana si la aplicación es reactivada en MacOS
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
