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
  const [carrito, setCarrito] = useState([]);
  const [articulosVenta, setArticulosVenta] = useState([]);
  const [totalVenta, setTotalVenta] = useState(0);

  const handleImageClick = (seccion) => {
    setSeccionVisible(seccion);
  
    if (seccion === 'contacto') {
      setArticulos([]); // Limpia los artículos para evitar duplicados
      consultarArticulos(1); // Carga los artículos desde la página 1
      setArticulosVenta([]);
      setTotalVenta(0);
      setCarrito([]); // Limpia el carrito al entrar a "Venta"
    }
  };

  const manejarEnvio = () => {
    const documento = { identificador, nombre, unidadMedida, descripcion, cantidad, precio };
    ipcRenderer.send('agregar-documento', documento);

    ipcRenderer.once('respuesta-agregar-documento', (event, message) => {
      console.log('Respuesta al agregar documento:', message);
    });
  };

  const consultarArticulos = (pagina = 1) => {
    if (pagina > totalPaginas || cargando) return;
  
    setCargando(true);
    ipcRenderer.send('consultar-documentos', pagina, 10);
  
    ipcRenderer.once('respuesta-consultar-documentos', (event, { documents, totalPages }) => {
      if (documents) {
        setArticulos((prevArticulos) => {
          const nuevosArticulos = documents.filter((articulo) =>
            !prevArticulos.some((prev) => prev._id === articulo._id)
          );
          return [...prevArticulos, ...nuevosArticulos];
        });
        setTotalPaginas(totalPages);
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

  const agregarAlCarrito = (articulo) => {
    setCarrito((prevCarrito) => {
      const existente = prevCarrito.find((item) => item._id === articulo._id);
      if (existente) {
        return prevCarrito.map((item) =>
          item._id === articulo._id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                total: parseFloat((item.cantidad + 1) * item.precio),
              }
            : item
        );
      } else {
        return [
          ...prevCarrito,
          { ...articulo, cantidad: 1, total: parseFloat(articulo.precio) },
        ];
      }
    });
  };

  const finalizarVenta = () => {
    // Generar ID único para la venta (por ejemplo, usando timestamp)
    const ventaId = `venta-${Date.now()}`;
  
    // Creamos un objeto con los detalles de la venta
    const ventaDetalles = carrito.map((item) => ({
      articuloId: item._id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
      total: item.total,
    }));
  
    // Enviar los detalles de la venta al backend
    ipcRenderer.send('registrar-venta', { ventaId, ventaDetalles, totalVenta });
  
    // Limpiar carrito y artículos de venta
    setArticulosVenta(ventaDetalles);
    setTotalVenta(0);
    setCarrito([]);
  };
  

  useEffect(() => {
    if (seccionVisible === 'informacion') {
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
          className={seccionVisible === 'formulario' ? 'activo' : ''}
          onClick={() => handleImageClick('formulario')}
        >
          Agregar Articulo
        </button>
        <button
          className={seccionVisible === 'informacion' ? 'activo' : ''}
          onClick={() => {
            handleImageClick('informacion');
            setArticulos([]);
            consultarArticulos(1);
          }}
        >
          Inventario
        </button>
        <button
          className={seccionVisible === 'contacto' ? 'activo' : ''}
          onClick={() => handleImageClick('contacto')}
        >
          Venta
        </button>
      </div>

      {seccionVisible === 'formulario' && (
        <div className="formulario-agregar">
          <h2>Inserte los datos para dar de Alta el producto</h2>
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
            <button type="button" onClick={manejarEnvio}>
              Agregar a Inventario
            </button>
          </form>
        </div>
      )}

      {seccionVisible === 'informacion' && (
        <div className="informacion-seccion" onScroll={handleScroll}>
          <h2>--------------------------Lista de Artículos--------------------------</h2>
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
                      {articulosVisibles[nombre] ? 'Ocultar' : 'Mostrar'} {nombre}
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

      {seccionVisible === 'contacto' && (
        <div className="venta-seccion">
          <h2>Realizar Venta</h2>
          <div className="lista-articulos">
            <h3>Seleccionar Artículos</h3>
            {cargando ? (
              <p>Cargando...</p>
            ) : (
              <ul>
                {articulos.map((articulo) => (
                  <li key={articulo._id}>
                    {articulo.nombre} - ${articulo.precio}
                    <button onClick={() => agregarAlCarrito(articulo)}>
                      Agregar al Carrito
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="carrito">
            <h3>Carrito de Compra</h3>
            <table className="tabla-carrito">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item) => (
                  <tr key={item._id}>
                    <td>{item.nombre}</td>
                    <td>{item.cantidad}</td>
                    <td>${item.precio}</td>
                    <td>${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={finalizarVenta}>Finalizar Venta</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
