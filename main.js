const { app, BrowserWindow } = require('electron');

function createWindow() {
  // Crea una nueva ventana de aplicación
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,  // Permite el uso de Node.js en el frontend
      contextIsolation: false // Necesario para acceder a las APIs de Electron desde React
    },
  });

  // Carga la URL de tu aplicación en React
  win.loadURL('http://localhost:3000'); // Dirección del servidor de desarrollo de React
}

// Ejecuta la función cuando Electron esté listo
app.whenReady().then(createWindow);

// Finaliza la aplicación cuando todas las ventanas están cerradas (para sistemas distintos de macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Reactiva la aplicación cuando se hace clic en el ícono (solo en macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
