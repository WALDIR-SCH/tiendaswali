"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, getDocs, addDoc, serverTimestamp, 
  doc, updateDoc, increment, query, orderBy, limit 
} from "firebase/firestore";
import { 
  Trash2, Plus, Minus, ShoppingCart, User, 
  PackageSearch, CreditCard, Banknote, Landmark, CheckCircle2, X, Printer, FileText, History 
} from "lucide-react";

export default function VentaManual() {
  const [productos, setProductos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [ventasRecientes, setVentasRecientes] = useState<any[]>([]);
  const [carritoManual, setCarritoManual] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  // Cargar datos iniciales
  const fetchData = async () => {
    const prodSnap = await getDocs(collection(db, "productos"));
    setProductos(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    const cliSnap = await getDocs(collection(db, "usuarios"));
    setClientes(cliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    // Cargar historial reciente
    const q = query(collection(db, "pedidos"), orderBy("fecha", "desc"), limit(5));
    const histSnap = await getDocs(q);
    setVentasRecientes(histSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const total = carritoManual.reduce((acc, item) => acc + (item.precioBase * item.cantidad), 0);

  // --- LÓGICA DE IMPRESIÓN PROFESIONAL ---
  const imprimirComprobante = (datos: any, esProforma: boolean = false) => {
    const ventana = window.open("", "_blank");
    if (!ventana) return;

    const subtotal = datos.total / 1.18;
    const igv = datos.total - subtotal;

    ventana.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; width: 80mm; padding: 10px; color: #000; font-size: 12px; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .header { margin-bottom: 10px; line-height: 1.2; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { text-align: left; border-bottom: 1px solid #000; }
            .total-table td { text-align: right; }
            .footer { font-size: 10px; margin-top: 20px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="text-center header">
            <h2 style="margin:0">TELECOMB2B S.A.C.</h2>
            <p>RUC: 20608844221</p>
            <p>Av. Tecnología 456 - Lima, Perú</p>
            <p>Tel: (01) 456-7890</p>
            <div class="divider"></div>
            <h3 style="margin:5px 0">${esProforma ? 'PROFORMA / COTIZACIÓN' : 'BOLETA DE VENTA ELECTRÓNICA'}</h3>
            <p>Nº: ${datos.id?.substring(0, 8).toUpperCase() || 'TEMP'}</p>
          </div>

          <div class="info">
            <p><strong>FECHA:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>CLIENTE:</strong> ${datos.clienteEmail}</p>
            ${!esProforma ? `<p><strong>PAGO:</strong> ${datos.metodoPago}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>DESCRIPCIÓN</th>
                <th>CANT</th>
                <th style="text-align:right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${datos.items.map((i: any) => `
                <tr>
                  <td>${i.nombre.substring(0, 20)}</td>
                  <td>${i.cantidad}</td>
                  <td style="text-align:right">$${(i.precio * i.cantidad).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="divider"></div>
          <table class="total-table">
            <tr><td>SUBTOTAL:</td><td class="bold">$${subtotal.toFixed(2)}</td></tr>
            <tr><td>IGV (18%):</td><td class="bold">$${igv.toFixed(2)}</td></tr>
            <tr><td style="font-size:16px">TOTAL:</td><td style="font-size:16px" class="bold">$${datos.total.toFixed(2)}</td></tr>
          </table>

          <div class="footer text-center">
            <p>${esProforma ? 'Válido por 5 días hábiles.' : 'No se aceptan cambios ni devoluciones después de 48 horas.'}</p>
            <p>*** GRACIAS POR SU PREFERENCIA ***</p>
          </div>
          <script>window.print(); window.onafterprint = function(){ window.close(); };</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  // --- FINALIZAR OPERACIÓN ---
  const procesarOperacion = async (tipo: "Venta" | "Proforma") => {
    if (!clienteSeleccionado) return alert("Selecciona un cliente");
    setLoading(true);

    const esVenta = tipo === "Venta";
    const datosOperacion = {
      clienteEmail: clienteSeleccionado,
      items: carritoManual.map(i => ({
        id: i.id, nombre: i.nombre, precio: i.precioBase, cantidad: i.cantidad, sku: i.sku || "N/A"
      })),
      total,
      estado: esVenta ? "Completado" : "Proforma",
      metodoPago: esVenta ? metodoPago : "N/A",
      fecha: serverTimestamp(),
    };

    try {
      // 1. Guardar en Pedidos
      const docRef = await addDoc(collection(db, "pedidos"), datosOperacion);

      // 2. ACTUALIZACIÓN DE STOCK (Solo si es venta real)
      if (esVenta) {
        const updatePromises = carritoManual.map(item => {
          const productoRef = doc(db, "productos", item.id);
          return updateDoc(productoRef, { stock: increment(-item.cantidad) });
        });
        await Promise.all(updatePromises);
      }

      // 3. Imprimir y Resetear
      imprimirComprobante({ ...datosOperacion, id: docRef.id }, !esVenta);
      setCarritoManual([]);
      setClienteSeleccionado("");
      setMostrarModalPago(false);
      fetchData(); // Refrescar stock e historial
    } catch (e) {
      alert("Error en el proceso");
    } finally {
      setLoading(false);
    }
  };

  // Funciones de Carrito
  const agregarAlPedido = (prod: any) => {
    const existe = carritoManual.find(item => item.id === prod.id);
    if (existe) {
      if (existe.cantidad >= prod.stock) return alert("Sin stock suficiente");
      setCarritoManual(carritoManual.map(item => 
        item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      if (prod.stock <= 0) return alert("Producto agotado");
      setCarritoManual([...carritoManual, { ...prod, cantidad: 1 }]);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-50 min-h-screen font-sans">
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* IZQUIERDA: CATÁLOGO */}
        <div className="lg:w-2/3 space-y-4">
          <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
              <User size={16}/> Cliente Emisor
            </h2>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition"
              value={clienteSeleccionado}
              onChange={(e) => setClienteSeleccionado(e.target.value)}
            >
              <option value="">Seleccionar Empresa...</option>
              {clientes.map(c => <option key={c.id} value={c.email}>{c.empresa || c.nombre} ({c.email})</option>)}
            </select>
          </header>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2"><PackageSearch size={18}/> Inventario</h2>
              <input 
                type="text" placeholder="Buscar producto..." 
                className="p-3 border border-slate-200 rounded-xl text-sm w-64 outline-none focus:border-blue-500"
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productos.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase())).map(p => (
                <div key={p.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 transition-all group">
                  <div className="w-16 h-16 bg-white rounded-xl border shrink-0 flex items-center justify-center overflow-hidden">
                    <img src={p.imagenUrl} className="p-2 object-contain" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 font-bold">{p.sku}</p>
                    <p className="text-sm font-black text-slate-800 leading-tight">{p.nombre}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-blue-600 font-black">${p.precioBase}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stock > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        STOCK: {p.stock}
                      </span>
                      <button 
                        onClick={() => agregarAlPedido(p)}
                        className="bg-white border p-1.5 rounded-lg hover:bg-slate-900 hover:text-white transition"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DERECHA: TICKET */}
        <div className="lg:w-1/3 space-y-4">
          <div className="bg-white rounded-4xl shadow-2xl border border-slate-200 overflow-hidden sticky top-6">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h2 className="text-lg font-black uppercase italic tracking-tighter">POS Terminal</h2>
            </div>

            <div className="p-6 max-h-100 overflow-y-auto space-y-4">
              {carritoManual.map(item => (
                <div key={item.id} className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">{item.nombre}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Precio: ${item.precioBase}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => setCarritoManual(prev => prev.map(i => i.id === item.id ? {...i, cantidad: Math.max(1, i.cantidad-1)} : i))} className="p-1 bg-slate-100 rounded"><Minus size={12}/></button>
                    <span className="font-black text-sm">{item.cantidad}</span>
                    <button onClick={() => agregarAlPedido(item)} className="p-1 bg-slate-100 rounded"><Plus size={12}/></button>
                    <button onClick={() => setCarritoManual(prev => prev.filter(i => i.id !== item.id))} className="text-red-300 hover:text-red-500 ml-2"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
              {carritoManual.length === 0 && <p className="text-center text-slate-300 py-10 font-bold uppercase text-[10px]">Caja Vacía</p>}
            </div>

            <div className="p-8 bg-slate-50 border-t">
              <div className="flex justify-between items-end mb-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total a Pagar</span>
                <span className="text-4xl font-black text-slate-900 tracking-tighter">${total.toLocaleString()}</span>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => procesarOperacion("Proforma")}
                  disabled={carritoManual.length === 0}
                  className="flex-1 bg-white border border-slate-200 py-4 rounded-2xl font-bold text-xs uppercase hover:bg-slate-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FileText size={16}/> Proforma
                </button>
                <button 
                  onClick={() => setMostrarModalPago(true)}
                  disabled={carritoManual.length === 0}
                  className="flex-2 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase hover:bg-slate-900 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Cobrar Venta <CheckCircle2 size={18}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: HISTORIAL DE VENTAS */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <History className="text-blue-600" size={20}/>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Ventas Recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-400 font-bold uppercase border-b pb-4">
                <th className="pb-4">Fecha</th>
                <th className="pb-4">Cliente</th>
                <th className="pb-4">Estado</th>
                <th className="pb-4">Total</th>
                <th className="pb-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ventasRecientes.map(venta => (
                <tr key={venta.id} className="text-xs">
                  <td className="py-4 text-slate-500">{venta.fecha?.toDate().toLocaleString()}</td>
                  <td className="py-4 font-bold text-slate-700">{venta.clienteEmail}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${venta.estado === 'Proforma' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                      {venta.estado}
                    </span>
                  </td>
                  <td className="py-4 font-black text-slate-900">${venta.total.toLocaleString()}</td>
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => imprimirComprobante(venta, venta.estado === 'Proforma')}
                      className="p-2 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Printer size={16} className="text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE PAGO */}
      {mostrarModalPago && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800 uppercase italic">Confirmar Pago</h3>
              <button onClick={() => setMostrarModalPago(false)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
            </div>
            
            <div className="space-y-3">
              {[
                { id: 'Efectivo', icon: <Banknote/>, label: 'Efectivo' },
                { id: 'Transferencia', icon: <Landmark/>, label: 'Transferencia' },
                { id: 'Tarjeta', icon: <CreditCard/>, label: 'Tarjeta POS' }
              ].map((opcion) => (
                <button
                  key={opcion.id}
                  onClick={() => setMetodoPago(opcion.id)}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all font-black ${
                    metodoPago === opcion.id ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100 text-slate-500"
                  }`}
                >
                  {opcion.icon} {opcion.label}
                </button>
              ))}
            </div>

            <button 
              onClick={() => procesarOperacion("Venta")}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-lg mt-8 hover:bg-blue-600 transition-all flex flex-col items-center leading-none"
            >
              <span>{loading ? "REGISTRANDO..." : "FINALIZAR VENTA"}</span>
              <span className="text-[9px] font-bold opacity-60 tracking-widest mt-1">EMITIR BOLETA PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}