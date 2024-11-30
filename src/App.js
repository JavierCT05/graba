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
    // Estado para controlar qué sección se muestra
    const [seccionVisible, setSeccionVisible] = useState(null);

    // Función para manejar el clic en las imágenes
    const handleImageClick = (seccion) => {
      setSeccionVisible(seccion); // Establece qué sección mostrar
    };

    return (
      <div className="contenedor-imagenes">
        {/* Si no se ha hecho clic en ninguna imagen, mostramos las imágenes */}
        {seccionVisible === null && (
          <>
            <img
              src="https://media.printables.com/media/prints/375908/images/3160471_a5e402d6-017e-4791-b62c-500ea716844a/thumbs/cover/800x800/jpeg/020ae98af02c4b6da2c8d1e1584cded3.webp"
              alt="Imagen de Agregar Documento"
              className="imagen-izquierda"
              onClick={() => handleImageClick("formulario")} // Muestra el formulario
            />
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ02Ghzq2An5zSMCfm9XdhysGn7vhQ7vskDuw&s"
              alt="Imagen Central"
              className="imagen-central"
              onClick={() => handleImageClick("informacion")} // Muestra la sección de información
            />
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_wexrpDddTxBrbx1b1n7a2jCGJWrIY9JRMGs50kW6Dgju4WNgOXJxtTnHSQbAstMSMRU&usqp=CAU"
              alt="Imagen de la derecha"
              className="imagen-derecha"
              onClick={() => handleImageClick("contacto")} // Muestra la sección de contacto
            />
          </>
        )}

        {/* Mostrar diferentes secciones según la imagen clickeada */}
        {seccionVisible === "formulario" && (
          <FormularioAgregar />
        )}
        {seccionVisible === "informacion" && (
          <div className="informacion-seccion">
            <h2>Información Adicional</h2>
            <p>Aquí va la información adicional sobre el producto o servicio.</p>
          </div>
        )}
        {seccionVisible === "contacto" && (
          <div className="contacto-seccion">
            <h2>Contacto</h2>
            <p>Aquí puedes encontrar información para ponerte en contacto con nosotros.</p>
          </div>
        )}
      </div>
    );
  }


  export default ImagenConFormulario;