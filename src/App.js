import React, { useState, useEffect } from 'react';
import './App.css';
const { ipcRenderer } = window.require('electron');

function App() {
  const [seccionVisible, setSeccionVisible] = useState(null);
  const [identificador, setIdentificador] = useState('');
  const [nombre, setNombre] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('pieza');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [articulos, setArticulos] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [articulosVisibles, setArticulosVisibles] = useState({});

  const handleImageClick = (seccion) => {
    setSeccionVisible(seccion);
  };

  const manejarEnvio = () => {
    const documento = { identificador, nombre, unidadMedida, descripcion, cantidad, precio };
    ipcRenderer.send('agregar-documento', documento);

    ipcRenderer.once('respuesta-agregar-documento', (event, message) => {
      console.log('Respuesta al agregar documento:', message);
    });
  };

  const consultarArticulos = (pagina = 1) => {
    if (pagina > totalPaginas || cargando) return; // No hacer nada si ya estamos en la última página o si está cargando

    setCargando(true);
    console.log(`Consultando artículos, página: ${pagina}`);
    ipcRenderer.send('consultar-documentos', pagina, 10);
    
    ipcRenderer.once('respuesta-consultar-documentos', (event, { documents, totalPages }) => {
      console.log("Respuesta recibida:", documents);
      if (documents && documents.length > 0) {
        // Evitar agregar artículos duplicados
        setArticulos((prevArticulos) => {
          const nuevosArticulos = documents.filter((articulo) => 
            !prevArticulos.some((prev) => prev._id === articulo._id)
          );
          return [...prevArticulos, ...nuevosArticulos];
        });
        setTotalPaginas(totalPages);
        setPaginaActual(pagina);
      } else {
        console.log('No se encontraron documentos');
      }
      setCargando(false);
    });
  };

  const agruparArticulosPorNombre = (articulos) => {
    const agrupados = {};

    articulos.forEach((articulo) => {
      if (!agrupados[articulo.nombre]) {
        agrupados[articulo.nombre] = [];
      }
      agrupados[articulo.nombre].push(articulo);
    });

    return agrupados;
  };

  const toggleVisibilidadGrupo = (nombreGrupo) => {
    setArticulosVisibles((prevState) => ({
      ...prevState,
      [nombreGrupo]: !prevState[nombreGrupo],
    }));
  };

  useEffect(() => {
    if (seccionVisible === "informacion") {
      consultarArticulos(paginaActual);
    }
  }, [seccionVisible, paginaActual]);

  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight === e.target.scrollTop + e.target.clientHeight;
    if (bottom && !cargando) {
      setPaginaActual((prev) => prev + 1);
    }
  };

  return (
    <div className="contenedor-imagenes">
      <div className="botones">
        <button
          className={seccionVisible === "formulario" ? "activo" : ""}
          onClick={() => handleImageClick("formulario")}
        >
          Formulario
        </button>
        <button
          className={seccionVisible === "informacion" ? "activo" : ""}
          onClick={() => {
            handleImageClick("informacion");
            setArticulos([]); // Reinicia los artículos al cambiar a información
            consultarArticulos(1);
          }}
        >
          Información
        </button>
        <button
          className={seccionVisible === "contacto" ? "activo" : ""}
          onClick={() => handleImageClick("contacto")}
        >
          Contacto
        </button>
      </div>

      {seccionVisible === "formulario" && (
        <div className="formulario-agregar">
          <h2>Formulario para agregar inventario</h2>
          <form>
            <label>Identificador:</label>
            <input
              type="text"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Identificador"
            />
            <label>Nombre:</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre"
            />
            <label>Unidad de Medida:</label>
            <select
              value={unidadMedida}
              onChange={(e) => setUnidadMedida(e.target.value)}
            >
              <option value="pieza">Pieza</option>
              <option value="kilogramo">Kilogramo</option>
              <option value="litro">Litro</option>
            </select>
            <label>Descripción:</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción"
            />
            <label>Cantidad:</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Cantidad"
            />
            <label>Precio:</label>
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Precio"
            />
            <button type="button" onClick={manejarEnvio}>Agregar a Inventario</button>
          </form>
        </div>
      )}

      {seccionVisible === "informacion" && (
        <div className="informacion-seccion" onScroll={handleScroll}>
          <h2>Lista de Artículos</h2>
          {cargando ? (
            <p>Cargando...</p>
          ) : (
            <>
              {articulos.length === 0 ? (
                <p>No hay artículos en el inventario.</p>
              ) : (
                Object.entries(agruparArticulosPorNombre(articulos)).map(([nombre, grupo]) => (
                  <div key={nombre} className="grupo-articulos">
                    <span 
                      className="toggle-text"
                      onClick={() => toggleVisibilidadGrupo(nombre)}
                    >
                      {articulosVisibles[nombre] ? "Ocultar" : "Mostrar"} {nombre}
                    </span>
                    {articulosVisibles[nombre] && (
                      <table className="tabla-articulos">
                        <thead>
                          <tr>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            <th>Unidad</th>
                            <th>Precio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.map((articulo, index) => (
                            <tr key={index}>
                              <td>{articulo.descripcion}</td>
                              <td>{articulo.cantidad}</td>
                              <td>{articulo.unidadMedida}</td>
                              <td>${articulo.precio}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))
              )}
            </>
          )}
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

export default App;
