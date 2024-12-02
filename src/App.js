import React, { useState, useEffect } from 'react';
import './App.css';
import { isContentEditable } from '@testing-library/user-event/dist/utils';
const { ipcRenderer } = window.require('electron');

function App() {
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
  const [seccionVisible, setSeccionVisible] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [ventasAgrupadas, setVentasAgrupadas] = useState({});
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const obtenerVentas = () => {
    ipcRenderer.send('obtener-ventas');
    ipcRenderer.once('respuesta-obtener-ventas', (event, ventasRecibidas) => {
      setVentas(ventasRecibidas);
      agruparVentas(ventasRecibidas); // Agrupar las ventas
    });
  };

  // Función para agrupar ventas por `ventaId`
  const agruparVentas = (ventas) => {
    const agrupadas = {};
    ventas.forEach((venta) => {
      if (!agrupadas[venta.ventaId]) {
        agrupadas[venta.ventaId] = [];
      }
      agrupadas[venta.ventaId].push(venta);
    });
    setVentasAgrupadas(agrupadas);
  };

  // Al hacer clic en un `Venta ID`, se muestra o se oculta la información de la venta
  const toggleVentaDetalles = (ventaId) => {
    if (ventaSeleccionada === ventaId) {
      setVentaSeleccionada(null); // Si ya está seleccionado, ocultarlo
    } else {
      setVentaSeleccionada(ventaId); // Si no está seleccionado, mostrarlo
    }
  };

  useEffect(() => {
    if (seccionVisible === 'venta') {
      obtenerVentas(); // Cargar las ventas cuando se entra a la sección "venta"
    }
  }, [seccionVisible]);

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
  const agruparVentasPorId = (ventas) => {
    const agrupadas = {};
    ventas.forEach((venta) => {
      if (!agrupadas[venta.ventaId]) {
        agrupadas[venta.ventaId] = [];
      }
      agrupadas[venta.ventaId].push(venta);
    });
    return agrupadas;
  };
  
  const finalizarVenta = () => {
    const ventaId = `venta-${Date.now()}`;
    const ventaDetalles = carrito.map((item) => ({
      articuloId: item._id,
      descripcion: item.descripcion,
      cantidad: Number(item.cantidad),
      precio: Number(item.precio),
      total: item.total,
    }));

    ipcRenderer.send('registrar-venta', { ventaId, ventaDetalles, totalVenta });

    ventaDetalles.forEach((item) => {
      ipcRenderer.send('actualizar-articulo', {
        descripcion: item.descripcion,
        cantidadVendida: item.cantidad,
      });
    });

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
  useEffect(() => {
    if (seccionVisible === 'venta') {
      obtenerVentas(); // Cargar las ventas cuando se entra a la sección "venta"
    }
  }, [seccionVisible]);
  
  return (
    <div className="contenedor-imagenes">
      <div className="botones">
        <img
          src={'https://cdn-icons-png.flaticon.com/512/7387/7387315.png'}
          alt="Agregar Articulo"
          className={seccionVisible === 'formulario' ? 'activo' : ''}
          onClick={() => handleImageClick('formulario')}
        />
        <img
          src={'https://cdn3.iconfinder.com/data/icons/logistics-85/512/inventory-Check-list-store-product-512.png'}
          alt="Inventario"
          className={seccionVisible === 'informacion' ? 'activo' : ''}
          onClick={() => {
            handleImageClick('informacion');
            setArticulos([]); // Limpiar artículos al entrar
            consultarArticulos(1); // Consultar artículos
          }}
        />
        <img
          src={'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRw_qEy_wi7HWQ_5gHuZAlTY36BCzjq70BbFA&s'}
          alt="Venta"
          className={seccionVisible === 'contacto' ? 'activo' : ''}
          onClick={() => handleImageClick('contacto')}
        />
        <img
          src={'https://cdn-icons-png.flaticon.com/512/591/591815.png'}
          alt="Ventas"
          className={seccionVisible === 'venta' ? 'activo' : ''}
          onClick={() => handleImageClick('venta')}
        />
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
      <div>
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
                      <th>Añadir Cantidad</th> {/* Columna para agregar cantidad */}
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.map((articulo, index) => (
                      <tr key={index}>
                        <td>{articulo.descripcion}</td>
                        <td>{articulo.cantidad}</td>
                        <td>{articulo.unidadMedida}</td>
                        <td>${articulo.precio}</td>
                        <td>
                          {/* Campo de entrada para agregar cantidad */}
                          <input
                            type="number"
                            min="1"
                            placeholder="Cantidad"
                            onChange={(e) => setCantidad(e.target.value)}
                          />
                          {/* Botón para añadir cantidad */}
                          <button
                          onClick={() => {
                            const nuevaCantidad = parseInt(cantidad);
                            if (nuevaCantidad > 0) {
                              // Llamar al canal de Electron para aumentar la cantidad
                              ipcRenderer.send('aumentar-articulo', {
                                descripcion: articulo.descripcion, 
                                cantidadAumentada: nuevaCantidad
                              });

                              // Actualiza el inventario localmente para reflejar el cambio
                              setArticulos((prevArticulos) =>
                                prevArticulos.map((art) =>
                                  art._id === articulo._id
                                    ? { ...art, cantidad: art.cantidad + nuevaCantidad }
                                    : art
                                )
                              );
                            }
                          }}
                        >
                          Añadir
                        </button>

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </div>
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
        <div>
          {articulos.length === 0 ? (
            <p>No hay artículos disponibles para la venta.</p>
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
                        <th>Acción</th> {/* Columna para el botón */}
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.map((articulo, index) => (
                        <tr key={index}>
                          <td>{articulo.descripcion}</td>
                          <td>{articulo.cantidad}</td>
                          <td>{articulo.unidadMedida}</td>
                          <td>${articulo.precio}</td>
                          <td>
                            <button onClick={() => agregarAlCarrito(articulo)}>
                              Agregar al Carrito
                            </button>
                          </td> {/* Botón para agregar al carrito */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>
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
              <td>{item.descripcion}</td>
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
{seccionVisible === 'venta' && (
   <div className="ventas-seccion">
      <h2>--------------------------VENTAS--------------------------</h2>
      <div className="lista-ventas">
        {Object.keys(ventasAgrupadas).length === 0 ? (
          <p>No se encontraron ventas registradas.</p>
        ) : (
          // Mostrar las ventas agrupadas por `ventaId`
          Object.entries(ventasAgrupadas).map(([ventaId, grupo]) => (
            <div key={ventaId} className="grupo-venta">
              <h3
                className="venta-id"
                onClick={() => toggleVentaDetalles(ventaId)}
              >
                Venta ID: {ventaId}
              </h3>
              {ventaSeleccionada === ventaId && (
                <div className="detalles-venta">
                  <p>Total Venta: ${grupo.reduce((total, venta) => total + venta.totalVenta, 0).toFixed(2)}</p>
                  <ul>
                    {grupo.map((venta, index) => (
                      <li key={index}>
                        <strong>{venta.ventaId}</strong> - Total: ${venta.totalVenta.toFixed(2)}
                        <ul>
                          {venta.ventaDetalles.map((detalle, i) => (
                            <li key={i}>
                              {detalle.descripcion} - Cantidad: {detalle.cantidad} - Precio: {detalle.precio} - Total: {detalle.cantidad*detalle.precio}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>

  )}



    </div>
    
  );
}

export default App;
