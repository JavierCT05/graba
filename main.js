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
      contextIsolation: false, // Deshabilita el aislamiento de contexto (opcional para tu caso)
    },
  });

  // Asegúrate de que tu servidor React esté corriendo en http://localhost:3000
  win.loadURL('http://localhost:3000');
}

// Validar si los valores son numéricos válidos
function validarNumeros(cantidad, precio) {
  // Asegurarnos de que los valores sean cadenas de texto
  cantidad = cantidad != null ? String(cantidad) : '';
  precio = precio != null ? String(precio) : '';

  // Verificamos los valores antes de convertirlos
  console.log(`Validando cantidad: ${cantidad}, precio: ${precio}`);

  // Limpiar posibles espacios en blanco y convertir a número
  cantidad = cantidad.trim();
  precio = precio.trim();

  cantidad = Number(cantidad);
  precio = Number(precio);

  // Verificamos si la conversión fue exitosa
  if (isNaN(cantidad) || isNaN(precio)) {
    console.error(`Error de validación: cantidad: ${cantidad}, precio: ${precio}`);
    throw new Error('Cantidad o Precio no son valores numéricos válidos');
  }
  return { cantidad, precio };
}


// Insertar un documento en la colección INVENTARIO
async function addDocument(collectionName, document) {
  try {
    // Validamos los campos cantidad y precio
    const { cantidad, precio } = validarNumeros(document.cantidad, document.precio);

    document.cantidad = cantidad;
    document.precio = precio;

    const collection = db.collection(collectionName);
    const result = await collection.insertOne(document);
    console.log("Documento insertado con ID:", result.insertedId);
  } catch (error) {
    console.error("Error al insertar documento:", error);
    throw error; // Relanzamos el error para manejarlo en el canal
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

// Canal para obtener todas las ventas
ipcMain.on('obtener-ventas', async (event) => {
  try {
    // Consultar las ventas desde la colección
    const ventas = await db.collection('ventas').find({}).toArray();
    console.log('Ventas obtenidas:', ventas.length);
    event.reply('respuesta-obtener-ventas', ventas);
  } catch (error) {
    console.error('Error al obtener las ventas:', error);
    event.reply('respuesta-obtener-ventas', []);
  }
});

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
    const { cantidad, precio } = validarNumeros(documento.cantidad, documento.precio);

    documento.cantidad = cantidad;
    documento.precio = precio;

    await addDocument("INVENTARIO", documento);
    event.reply('respuesta-agregar-documento', 'Documento agregado exitosamente');
  } catch (error) {
    console.error("Error al agregar documento:", error);
    event.reply('respuesta-agregar-documento', `Error: ${error.message}`);
  }
});

// Canal para registrar la venta y actualizar el inventario
ipcMain.on('registrar-venta', async (event, { ventaId, ventaDetalles }) => {
  try {
    console.log('Detalles de la venta:', ventaDetalles);

    // Asegúrate de que ventaDetalles es un arreglo con objetos válidos
    if (!Array.isArray(ventaDetalles) || ventaDetalles.length === 0) {
      throw new Error('Venta sin detalles válidos.');
    }

    // Calcular el total de la venta
    let totalVenta = 0;
    for (const detalle of ventaDetalles) {
      const cantidad = Number(detalle.cantidad);
      const precio = Number(detalle.precio);

      if (isNaN(cantidad) || isNaN(precio)) {
        throw new Error(`Cantidad o precio inválido para el artículo ${detalle.descripcion}`);
      }

      totalVenta += cantidad * precio;
    }

    console.log('Total Venta calculado:', totalVenta);

    // Registrar la venta con el total calculado
    const nuevaVenta = {
      ventaId,
      ventaDetalles,
      totalVenta,
    };

    // Insertar la venta en la colección 'ventas'
    await addDocument('ventas', nuevaVenta);

    // Reducir la cantidad de los artículos vendidos en el inventario
    for (const detalle of ventaDetalles) {
      const descripcion = detalle.descripcion; // Descripción del artículo
      let cantidadVendida = Number(detalle.cantidad); // Convertir cantidadVendida a número

      // Verificar que la cantidadVendida sea válida
      if (isNaN(cantidadVendida) || cantidadVendida <= 0) {
        throw new Error(`Cantidad inválida para el artículo ${descripcion}`);
      }

      console.log(`Vendiendo artículo: ${descripcion}, Cantidad: ${cantidadVendida}`);

      // Actualizar la cantidad del artículo en el inventario
      const result = await db.collection('INVENTARIO').updateOne(
        { descripcion },  // Buscamos el artículo por su descripción
        { $inc: { cantidad: -cantidadVendida } }
      );

      // Verificar que se haya actualizado el inventario correctamente
      if (result.modifiedCount === 0) {
        throw new Error(`No se encontró el artículo con descripción: ${descripcion}`);
      }
    }

    console.log('Venta registrada y cantidad de inventario actualizada');
    event.reply('respuesta-registrar-venta', 'Venta registrada exitosamente');
  } catch (error) {
    console.error('Error al registrar la venta o actualizar inventario:', error);
    event.reply('respuesta-registrar-venta', `Error: ${error.message}`);
  }
});



// Canal para aumentar la cantidad de artículo
ipcMain.on('aumentar-articulo', async (event, { descripcion, cantidadAumentada }) => {
  try {
    // Asegurarse de que la cantidad a aumentar sea un número
    cantidadAumentada = Number(cantidadAumentada);

    if (isNaN(cantidadAumentada)) {
      event.reply('respuesta-aumentar-articulo', 'Cantidad no es válida');
      return;
    }

    // Actualizar el inventario: Aumentar la cantidad en base a la descripción
    const result = await db.collection('INVENTARIO').updateOne(
      { descripcion },  // Buscamos el artículo por descripción
      { $inc: { cantidad: cantidadAumentada } }  // Aumentamos la cantidad
    );
    console.log(`Artículo actualizado: ${descripcion}, Cantidad aumentada: ${cantidadAumentada}`);
    event.reply('respuesta-aumentar-articulo', 'Cantidad aumentada exitosamente');
  } catch (error) {
    console.error('Error al aumentar artículo:', error);
    event.reply('respuesta-aumentar-articulo', `Error: ${error.message}`);
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
