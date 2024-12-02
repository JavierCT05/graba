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
    // Asegurarnos de que cantidad y precio sean números
    document.cantidad = Number(document.cantidad);  // Convertir a número
    document.precio = Number(document.precio);  // Convertir a número
    console.log(document);
    // Verificar si la conversión fue exitosa
    if (isNaN(document.cantidad) || isNaN(document.precio)) {
      throw new Error('Cantidad o Precio no son valores numéricos válidos');
    }

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
    // Asegurarnos de que cantidad y precio sean números
    documento.cantidad = Number(documento.cantidad);  // Convertir a número
    documento.precio = Number(documento.precio);  // Convertir a número

    // Verificar si la conversión fue exitosa
    if (isNaN(documento.cantidad) || isNaN(documento.precio)) {
      event.reply('respuesta-agregar-documento', 'Cantidad o Precio no son valores numéricos válidos');
      return;
    }

    await addDocument("INVENTARIO", documento);
    event.reply('respuesta-agregar-documento', 'Documento agregado exitosamente');
  } catch (error) {
    console.error("Error al agregar documento:", error);
    event.reply('respuesta-agregar-documento', 'Error al agregar documento');
  }
});

// Canal para registrar venta (modificado para actualizar inventario usando descripción)
ipcMain.on('registrar-venta', async (event, { ventaId, ventaDetalles, totalVenta }) => {
  const session = db.startSession(); // Iniciar una sesión de MongoDB para realizar la transacción

  try {
    session.startTransaction(); // Comenzar la transacción

    // Registrar la venta
    const nuevaVenta = {
      ventaId,
      ventaDetalles,
      totalVenta,
    };

    await addDocument('ventas', nuevaVenta);

    // Reducir la cantidad de los artículos vendidos en el inventario
    for (const detalle of ventaDetalles) {
      const descripcion = detalle.descripcion; // Descripción del artículo
      let cantidadVendida = Number(detalle.cantidad); // Convertir cantidadVendida a número

      // Verificar si la cantidad es un número válido
      if (isNaN(cantidadVendida)) {
        throw new Error(`Cantidad inválida para el artículo ${descripcion}`);
      }

      // Reducir la cantidad del artículo utilizando la descripción
      await db.collection('INVENTARIO').updateOne(
        { descripcion },  // Buscamos el artículo por su descripción
        { $inc: { cantidad: -cantidadVendida } },
        { session }
      );
    }

    // Confirmar la transacción si todo fue exitoso
    await session.commitTransaction();
    session.endSession();

    console.log('Venta registrada y cantidad de inventario actualizada');
    event.reply('respuesta-registrar-venta', 'Venta registrada exitosamente');
  } catch (error) {
    // Si hubo un error, hacer rollback de la transacción
    console.error('Error al registrar la venta o actualizar inventario:', error);
    session.abortTransaction();
    session.endSession();
    event.reply('respuesta-registrar-venta', 'Error al registrar la venta');
  }
});

// Canal para actualizar cantidad de artículo
ipcMain.on('actualizar-articulo', async (event, { descripcion, cantidadVendida }) => {
  try {
    // Convertir cantidadVendida a número antes de actualizar
    cantidadVendida = Number(cantidadVendida);

    // Verificar si la cantidad es un número válido
    if (isNaN(cantidadVendida)) {
      event.reply('respuesta-actualizar-articulo', 'Cantidad no es válida');
      return;
    }

    // Actualizar el inventario: Reducir la cantidad en base a la descripción
    const result = await db.collection('INVENTARIO').updateOne(
      { descripcion },  // Buscamos el artículo por descripción
      { $inc: { cantidad: -cantidadVendida } }  // Reducimos la cantidad vendida
    );
    console.log(`Artículo actualizado: ${descripcion}, Cantidad reducida: ${cantidadVendida}`);
    event.reply('respuesta-actualizar-articulo', 'Inventario actualizado correctamente');
  } catch (error) {
    console.error('Error al actualizar artículo:', error);
    event.reply('respuesta-actualizar-articulo', 'Error al actualizar artículo');
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
