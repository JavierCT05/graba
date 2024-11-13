import './App.css';
import React, { useState } from 'react';

// En el archivo de React donde deseas enviar datos
const { ipcRenderer } = window.require('electron');

const enviarDocumento = (documento) => {
  ipcRenderer.send('agregar-documento', documento);

  ipcRenderer.once('respuesta-agregar-documento', (event, message) => {
    console.log(message);
  });
};

function FormularioAgregar() {
  const [nombre, setNombre] = useState('');

  const manejarEnvio = () => {
    const documento = { nombre };
    enviarDocumento(documento); // Envía el documento a Electron y MongoDB
  };

  return (
    <div className="formulario-agregar">
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre"
      />
      <button onClick={manejarEnvio}>Agregar a MongoDB</button>
    </div>
  );
}

function ImagenConFormulario() {
  // Estado para controlar la visibilidad del formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Función para manejar el clic en la imagen
  const handleImageClick = () => {
    setMostrarFormulario(true); // Muestra el formulario cuando se hace clic en la imagen
  };

  return (
    <div>
      {/* Imagen que, al hacer clic, mostrará el formulario */}
      {!mostrarFormulario && (
      <img
        src="https://media.printables.com/media/prints/375908/images/3160471_a5e402d6-017e-4791-b62c-500ea716844a/thumbs/cover/800x800/jpeg/020ae98af02c4b6da2c8d1e1584cded3.webp"  // Asegúrate de poner la ruta correcta de la imagen
        alt="Imagen de Agregar Documento"
        className="imagen-agregar"  // Asigna la clase CSS aquí
          onClick={handleImageClick}
      />
      )}
      {/* Condicionalmente rend erizamos el formulario solo si 'mostrarFormulario' es true */}
      {mostrarFormulario && <FormularioAgregar />}
    </div>
  );
}

export default ImagenConFormulario;