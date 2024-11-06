import logo from './logo.svg';
import './App.css';
import React, { useState } from 'react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edith 🐧 🥶🥶
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

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
    <div>
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

export default FormularioAgregar;