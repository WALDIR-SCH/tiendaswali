"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, addDoc, serverTimestamp,
  doc, updateDoc, increment, query, orderBy, limit
} from "firebase/firestore";
import {
  Trash2, Plus, Minus, ShoppingCart, User,
  PackageSearch, CreditCard, Banknote, Landmark,
  CheckCircle2, X, Printer, FileText, History,
} from "lucide-react";

const C = {
  purple:      "#9851F9",
  purpleDark:  "#7c3aed",
  purpleLight: "#f5f0ff",
  orange:      "#FF6600",
  yellow:      "#F6FA00",
  green:       "#28FB4B",
  white:       "#FFFFFF",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray300:     "#D1D5DB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray600:     "#4B5563",
  gray700:     "#374151",
  gray800:     "#1F2937",
  gray900:     "#111827",
} as const;

/* ─── fmt seguro: nunca falla con undefined/null ─── */
const fmt = (n: number | undefined | null) =>
  (n ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── TIPOS ─── */
interface ProductoItem {
  id: string;
  nombre: string;
  sku: string;
  precioBase: number;       // calculado al cargar
  precioUnidad: number;     // precio_unitario
  precioCaja: number;       // precio_caja
  stockCajas: number;       // stock_cajas
  stockUnidades: number;    // stock_unidades
  imagenUrl: string;
  marca: string;
  categoria: string;
  unidadesPorCaja: number;
}

interface ItemCarrito extends ProductoItem {
  cantidad: number;
  tipoPrecio: "caja" | "unidad";
}

interface VentaReciente {
  id: string;
  clienteEmail: string;
  estado: string;
  total: number;
  metodoPago?: string;
  fecha?: any;
  items?: any[];
}

const METODOS_PAGO = [
  { id: "Efectivo",      icon: Banknote,   label: "Efectivo",      sub: "Pago en mano"             },
  { id: "Transferencia", icon: Landmark,   label: "Transferencia", sub: "BCP / BBVA / Interbank"   },
  { id: "Tarjeta",       icon: CreditCard, label: "Tarjeta POS",   sub: "Visa / Mastercard"        },
];

const Pill = ({ children, color = C.purple }: { children: React.ReactNode; color?: string }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"
    style={{ background: `${color}15`, color }}>
    {children}
  </span>
);

const StatChip = ({ label, value, color = C.purple }: { label: string; value: string | number; color?: string }) => (
  <div className="flex flex-col items-center px-4 py-2 rounded-xl border"
    style={{ background: `${color}06`, borderColor: `${color}20` }}>
    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.gray400 }}>{label}</span>
    <span className="text-lg font-black" style={{ color }}>{value}</span>
  </div>
);

/* ════════════════════════════════════════════════════════════ */
export default function VentaManual() {
  const [productos,           setProductos]           = useState<ProductoItem[]>([]);
  const [clientes,            setClientes]            = useState<any[]>([]);
  const [ventasRecientes,     setVentasRecientes]     = useState<VentaReciente[]>([]);
  const [carrito,             setCarrito]             = useState<ItemCarrito[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [filtro,              setFiltro]              = useState("");
  const [loading,             setLoading]             = useState(false);
  const [modalPago,           setModalPago]           = useState(false);
  const [metodoPago,          setMetodoPago]          = useState("Efectivo");

  const fetchData = async () => {
    try {
      const [prodSnap, cliSnap] = await Promise.all([
        getDocs(collection(db, "productos")),
        getDocs(collection(db, "usuarios")),
      ]);

      /* ── Mapeo EXACTO a los campos de Firebase ── */
      const prods: ProductoItem[] = prodSnap.docs
        .map(d => {
          const data = d.data();

          const precioCaja    = Number(data.precio_caja)     || 0;
          const precioUnidad  = Number(data.precio_unitario) || 0;
          const stockCajas    = Number(data.stock_cajas)     || 0;
          const stockUnidades = Number(data.stock_unidades)  || 0;

          return {
            id:             d.id,
            nombre:         data.nombre_producto || data.nombre || "Sin nombre",
            sku:            data.sku             || "",
            precioBase:     precioCaja  > 0 ? precioCaja : precioUnidad, // preferimos caja
            precioUnidad,
            precioCaja,
            stockCajas,
            stockUnidades,
            imagenUrl:      data.imagen_principal || "",
            marca:          data.marca            || "",
            categoria:      data.categoria_id     || "",
            unidadesPorCaja:Number(data.unidades_por_caja) || 1,
          };
        })
        /* Solo mostrar productos con stock Y activos */
        .filter(p => p.stockCajas > 0 || p.stockUnidades > 0);

      setProductos(prods);
      setClientes(cliSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      /* Historial — sin orderBy para evitar índice compuesto */
      const histSnap = await getDocs(
        query(collection(db, "pedidos"), limit(8))
      );
      const ventas = histSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as VentaReciente))
        .sort((a, b) => {
          const fa = a.fecha?.toDate?.()?.getTime() ?? 0;
          const fb = b.fecha?.toDate?.()?.getTime() ?? 0;
          return fb - fa;
        });
      setVentasRecientes(ventas);
    } catch (e) {
      console.error("fetchData error:", e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ─── TOTALES ─── */
  const total      = carrito.reduce((s, i) => s + i.precioBase * i.cantidad, 0);
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
  const subtotal   = total / 1.18;
  const igv        = total - subtotal;

  /* ─── CARRITO ─── */
  const agregarProducto = (prod: ProductoItem) => {
    const stockDisp = prod.stockCajas > 0 ? prod.stockCajas : prod.stockUnidades;
    if (stockDisp <= 0) { alert("Producto agotado"); return; }
    const existente = carrito.find(i => i.id === prod.id);
    if (existente) {
      if (existente.cantidad >= stockDisp) { alert("Sin stock suficiente"); return; }
      setCarrito(p => p.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setCarrito(p => [...p, { ...prod, cantidad: 1, tipoPrecio: prod.stockCajas > 0 ? "caja" : "unidad" }]);
    }
  };

  const cambiarCantidad = (id: string, delta: number) =>
    setCarrito(p => p.map(i => {
      if (i.id !== id) return i;
      const maxStock = i.stockCajas > 0 ? i.stockCajas : i.stockUnidades;
      const nueva    = Math.max(1, Math.min(i.cantidad + delta, maxStock));
      return { ...i, cantidad: nueva };
    }));

  const eliminarItem   = (id: string) => setCarrito(p => p.filter(i => i.id !== id));
  const limpiarCarrito = () => { setCarrito([]); setClienteSeleccionado(""); };

  /* ─── IMPRESIÓN ─── */
  const imprimirComprobante = (datos: any, esProforma = false) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const sub    = (datos.total || 0) / 1.18;
    const igvImp = (datos.total || 0) - sub;
    w.document.write(`
      <html><head><style>
        body{font-family:Arial,sans-serif;width:80mm;padding:10px;font-size:12px;color:#000}
        .c{text-align:center}.b{font-weight:bold}
        hr{border-top:1px dashed #000;margin:8px 0}
        table{width:100%;border-collapse:collapse;margin:8px 0}
        th{text-align:left;border-bottom:1px solid #000;padding:4px 0}
        td{padding:3px 0}.r{text-align:right}
      </style></head><body>
      <div class="c">
        <h2 style="margin:0;color:#9851F9">TIENDAS WALY SAC</h2>
        <p style="margin:2px 0;font-size:10px">RUC: 20605467891 | Lima, Perú</p>
        <hr/>
        <h3 style="margin:4px 0">${esProforma ? "PROFORMA / COTIZACIÓN" : "BOLETA DE VENTA"}</h3>
        <p>Nº: ${(datos.id || "TEMP").substring(0, 8).toUpperCase()}</p>
      </div>
      <p><b>FECHA:</b> ${new Date().toLocaleString("es-PE")}</p>
      <p><b>CLIENTE:</b> ${datos.clienteEmail || "—"}</p>
      ${!esProforma ? `<p><b>PAGO:</b> ${datos.metodoPago || "—"}</p>` : ""}
      <table>
        <thead><tr><th>Descripción</th><th>Cant</th><th class="r">Total</th></tr></thead>
        <tbody>
          ${(datos.items || []).map((i: any) => `
            <tr>
              <td>${(i.nombre || "").substring(0, 22)}</td>
              <td>${i.cantidad || 0}</td>
              <td class="r">S/ ${((i.precio || 0) * (i.cantidad || 1)).toFixed(2)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      <hr/>
      <table>
        <tr><td>Base Imponible:</td><td class="r b">S/ ${sub.toFixed(2)}</td></tr>
        <tr><td>IGV (18%):</td><td class="r b">S/ ${igvImp.toFixed(2)}</td></tr>
        <tr><td style="font-size:14px"><b>TOTAL:</b></td>
            <td class="r b" style="font-size:14px">S/ ${(datos.total || 0).toFixed(2)}</td></tr>
      </table>
      <div class="c" style="margin-top:12px;font-size:10px">
        <p>${esProforma ? "Válido por 5 días hábiles." : "Sin devoluciones después de 48 horas."}</p>
        <p>*** GRACIAS POR SU PREFERENCIA ***</p>
      </div>
      <script>window.print();window.onafterprint=()=>window.close();</script>
      </body></html>`);
    w.document.close();
  };

  /* ─── PROCESAR VENTA ─── */
  const procesarOperacion = async (tipo: "Venta" | "Proforma") => {
    if (!clienteSeleccionado) { alert("Selecciona un cliente"); return; }
    if (carrito.length === 0) { alert("El carrito está vacío"); return; }
    setLoading(true);
    const esVenta = tipo === "Venta";
    const datosOp = {
      clienteEmail: clienteSeleccionado,
      items: carrito.map(i => ({
        id:       i.id,
        nombre:   i.nombre,
        precio:   i.precioBase,
        cantidad: i.cantidad,
        sku:      i.sku || "N/A",
      })),
      total,
      estado:     esVenta ? "Completado" : "Proforma",
      metodoPago: esVenta ? metodoPago : "N/A",
      fecha:      serverTimestamp(),
    };
    try {
      const ref = await addDoc(collection(db, "pedidos"), datosOp);
      if (esVenta) {
        await Promise.all(carrito.map(item =>
          updateDoc(doc(db, "productos", item.id), {
            stock_cajas:    increment(-item.cantidad),
            stock_unidades: increment(-(item.cantidad * item.unidadesPorCaja)),
          })
        ));
      }
      imprimirComprobante({ ...datosOp, id: ref.id }, !esVenta);
      limpiarCarrito();
      setModalPago(false);
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Error en el proceso. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.sku?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.marca?.toLowerCase().includes(filtro.toLowerCase())
  );

  const clienteObj = clientes.find(c => c.email === clienteSeleccionado);

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: C.white, fontFamily: "'Outfit', 'Inter', sans-serif" }}>

      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white" style={{ borderBottom: `2px solid ${C.gray100}` }}>
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
              <ShoppingCart size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight">Terminal POS · B2B</h1>
              <p className="text-[10px]" style={{ color: C.gray400 }}>
                {carrito.length > 0
                  ? `${totalItems} artículo${totalItems !== 1 ? "s" : ""} · S/ ${fmt(total)}`
                  : "Caja vacía"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatChip label="Productos" value={productosFiltrados.length} color={C.purple} />
            <StatChip label="Clientes"  value={clientes.length}           color={C.orange} />
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* IZQUIERDA */}
          <div className="lg:w-3/5 space-y-4">

            {/* Selector cliente */}
            <div className="bg-white rounded-2xl border p-4" style={{ borderColor: C.gray200 }}>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2.5"
                style={{ color: C.gray500 }}>
                <User size={13} style={{ color: C.purple }} /> Cliente / Empresa
              </label>
              <select value={clienteSeleccionado} onChange={e => setClienteSeleccionado(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all border"
                style={{
                  background:  clienteSeleccionado ? `${C.purple}06` : C.gray50,
                  borderColor: clienteSeleccionado ? C.purple : C.gray200,
                  color:       C.gray900,
                }}>
                <option value="">Seleccionar empresa B2B...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.email}>
                    {c.empresa || c.nombre || c.razonSocial || c.email} ({c.email})
                  </option>
                ))}
              </select>
              {clienteObj && (
                <div className="mt-2.5 flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: `${C.purple}08` }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
                    {(clienteObj.nombre || clienteObj.empresa || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: C.gray800 }}>
                      {clienteObj.empresa || clienteObj.nombre || clienteObj.email}
                    </p>
                    <p className="text-[10px]" style={{ color: C.gray500 }}>
                      RUC: {clienteObj.ruc || clienteObj.nifCifRuc || "—"}
                    </p>
                  </div>
                  <Pill color={C.green}>Activo</Pill>
                </div>
              )}
            </div>

            {/* Catálogo productos */}
            <div className="bg-white rounded-2xl border" style={{ borderColor: C.gray200 }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: `1px solid ${C.gray100}` }}>
                <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"
                  style={{ color: C.gray700 }}>
                  <PackageSearch size={14} style={{ color: C.purple }} /> Inventario
                </h2>
                <input type="text" placeholder="Buscar nombre, SKU, marca..."
                  value={filtro} onChange={e => setFiltro(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-medium outline-none transition-all border w-56"
                  style={{ background: C.gray50, borderColor: C.gray200, color: C.gray900 }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.purple)}
                  onBlur={e  => (e.currentTarget.style.borderColor = C.gray200)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 max-h-[500px] overflow-y-auto">
                {productosFiltrados.map(p => {
                  const stockMostrar = p.stockCajas > 0 ? `${p.stockCajas} cajas` : `${p.stockUnidades} uds`;
                  const stockBajo    = (p.stockCajas > 0 && p.stockCajas <= 5) || (p.stockCajas === 0 && p.stockUnidades <= 10);
                  const agotado      = p.stockCajas === 0 && p.stockUnidades === 0;
                  const enCarrito    = carrito.find(i => i.id === p.id);

                  return (
                    <div key={p.id}
                      className="flex gap-3 p-3 rounded-xl border transition-all cursor-pointer"
                      style={{
                        borderColor: enCarrito ? C.purple : C.gray200,
                        background:  enCarrito ? `${C.purple}06` : C.white,
                        opacity:     agotado ? 0.5 : 1,
                        cursor:      agotado ? "not-allowed" : "pointer",
                      }}
                      onClick={() => !agotado && agregarProducto(p)}
                      onMouseEnter={e => {
                        if (!enCarrito && !agotado) {
                          (e.currentTarget as HTMLElement).style.borderColor = `${C.purple}50`;
                          (e.currentTarget as HTMLElement).style.background  = C.gray50;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!enCarrito) {
                          (e.currentTarget as HTMLElement).style.borderColor = C.gray200;
                          (e.currentTarget as HTMLElement).style.background  = C.white;
                        }
                      }}>

                      {/* Imagen */}
                      <div className="w-12 h-12 rounded-xl border shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: C.gray100, borderColor: C.gray200 }}>
                        {p.imagenUrl
                          ? <img src={p.imagenUrl} className="w-full h-full object-contain p-1" alt={p.nombre}
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          : <PackageSearch size={16} style={{ color: C.gray300 }} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {p.sku && (
                          <p className="text-[9px] font-black uppercase tracking-wider mb-0.5"
                            style={{ color: C.gray400 }}>{p.sku}</p>
                        )}
                        <p className="text-xs font-bold text-gray-900 leading-tight truncate">{p.nombre}</p>
                        {p.marca && (
                          <p className="text-[10px] mt-0.5" style={{ color: C.gray500 }}>{p.marca}</p>
                        )}
                        <div className="flex items-center justify-between mt-1.5">
                          <div>
                            <span className="text-sm font-black" style={{ color: C.orange }}>
                              S/ {fmt(p.precioCaja)}
                            </span>
                            <span className="text-[9px] ml-1" style={{ color: C.gray400 }}>/ caja</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                              agotado   ? "bg-red-50 text-red-500 border-red-200" :
                              stockBajo ? "bg-amber-50 text-amber-700 border-amber-200" :
                                          "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                              {agotado ? "Agotado" : stockMostrar}
                            </span>
                            {enCarrito && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                style={{ background: `${C.purple}15`, color: C.purple }}>
                                ×{enCarrito.cantidad}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Precio unitario secundario */}
                        <p className="text-[9px] mt-0.5" style={{ color: C.gray400 }}>
                          Unitario: S/ {fmt(p.precioUnidad)} · {p.unidadesPorCaja} uds/caja
                        </p>
                      </div>
                    </div>
                  );
                })}

                {productosFiltrados.length === 0 && (
                  <div className="col-span-2 py-14 text-center">
                    <PackageSearch size={32} style={{ color: C.gray300, margin: "0 auto 8px" }} />
                    <p className="text-sm" style={{ color: C.gray400 }}>Sin productos</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DERECHA: TICKET */}
          <div className="lg:w-2/5">
            <div className="bg-white rounded-2xl border overflow-hidden sticky top-20"
              style={{ borderColor: C.gray200 }}>

              {/* Header ticket */}
              <div className="px-5 py-4"
                style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-white">Terminal POS</h2>
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {carrito.length > 0 ? `${totalItems} artículo${totalItems !== 1 ? "s" : ""}` : "Caja vacía"}
                    </p>
                  </div>
                  {carrito.length > 0 && (
                    <button onClick={limpiarCarrito}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Items carrito */}
              <div className="p-4 max-h-72 overflow-y-auto space-y-2.5" style={{ background: C.gray50 }}>
                {carrito.length === 0 ? (
                  <div className="py-12 text-center">
                    <ShoppingCart size={28} style={{ color: C.gray300, margin: "0 auto 8px" }} />
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.gray300 }}>
                      Haz clic en un producto
                    </p>
                  </div>
                ) : carrito.map(item => (
                  <div key={item.id}
                    className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border"
                    style={{ borderColor: C.gray200 }}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.nombre}</p>
                      <p className="text-[10px]" style={{ color: C.gray500 }}>
                        S/ {fmt(item.precioBase)} × {item.cantidad} ={" "}
                        <strong style={{ color: C.purple }}>S/ {fmt(item.precioBase * item.cantidad)}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => cambiarCantidad(item.id, -1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all border"
                        style={{ background: C.gray100, borderColor: C.gray200 }}>
                        <Minus size={12} style={{ color: C.gray600 }} />
                      </button>
                      <span className="text-xs font-black w-5 text-center" style={{ color: C.gray900 }}>
                        {item.cantidad}
                      </span>
                      <button onClick={() => cambiarCantidad(item.id, 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all border"
                        style={{ background: C.gray100, borderColor: C.gray200 }}>
                        <Plus size={12} style={{ color: C.gray600 }} />
                      </button>
                      <button onClick={() => eliminarItem(item.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all ml-0.5"
                        style={{ color: "#ef4444" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales + botones */}
              <div className="p-5 border-t space-y-4 bg-white" style={{ borderColor: C.gray100 }}>
                {carrito.length > 0 ? (
                  <div className="rounded-xl p-3 space-y-1.5"
                    style={{ background: C.gray50, border: `1px solid ${C.gray200}` }}>
                    <div className="flex justify-between text-xs" style={{ color: C.gray500 }}>
                      <span>Subtotal (sin IGV)</span><span>S/ {fmt(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: C.orange }}>
                      <span>IGV (18%)</span><span>S/ {fmt(igv)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black pt-1"
                      style={{ borderTop: `1px solid ${C.gray200}`, color: C.gray900 }}>
                      <span>Total</span>
                      <span style={{ color: C.purple }}>S/ {fmt(total)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.gray500 }}>Total</span>
                    <span className="text-3xl font-black" style={{ color: C.gray900 }}>S/ 0.00</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => procesarOperacion("Proforma")}
                    disabled={carrito.length === 0}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-40"
                    style={{ borderColor: C.gray200, color: C.gray700, background: C.white }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = C.purple;
                      (e.currentTarget as HTMLElement).style.color       = C.purple;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = C.gray200;
                      (e.currentTarget as HTMLElement).style.color       = C.gray700;
                    }}>
                    <FileText size={14} /> Proforma
                  </button>
                  <button onClick={() => setModalPago(true)}
                    disabled={carrito.length === 0 || !clienteSeleccionado}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-black text-white transition-all disabled:opacity-40"
                    style={{
                      background:  `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                      boxShadow:   `0 4px 14px ${C.purple}40`,
                    }}>
                    <CheckCircle2 size={14} /> Cobrar
                  </button>
                </div>

                {!clienteSeleccionado && carrito.length > 0 && (
                  <p className="text-[10px] text-center" style={{ color: C.orange }}>
                    ⚠ Selecciona un cliente para cobrar
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* HISTORIAL RECIENTE */}
        <div className="mt-6 bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.gray200 }}>
          <div className="px-6 py-4 flex items-center gap-2"
            style={{ borderBottom: `1px solid ${C.gray100}`, background: C.gray50 }}>
            <History size={14} style={{ color: C.purple }} />
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: C.gray700 }}>
              Ventas Recientes
            </h2>
            <span className="ml-auto text-[10px] font-semibold" style={{ color: C.gray400 }}>Últimas 8</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: C.gray50, borderBottom: `1px solid ${C.gray100}` }}>
                  {["Fecha","Cliente","Estado","Método","Total",""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest"
                      style={{ color: C.gray400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventasRecientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm" style={{ color: C.gray400 }}>
                      Sin ventas recientes
                    </td>
                  </tr>
                ) : ventasRecientes.map(v => (
                  <tr key={v.id} className="transition-colors"
                    style={{ borderBottom: `1px solid ${C.gray50}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.gray50)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-5 py-3 text-xs" style={{ color: C.gray500 }}>
                      {v.fecha?.toDate?.().toLocaleString("es-PE", {
                        day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"
                      }) || "—"}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold" style={{ color: C.gray900 }}>
                      {v.clienteEmail || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                        v.estado === "Proforma"   ? "bg-amber-50 text-amber-700 border-amber-200" :
                        v.estado === "Completado" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                    "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {v.estado || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: C.gray500 }}>
                      {v.metodoPago || "—"}
                    </td>
                    <td className="px-5 py-3 text-xs font-black" style={{ color: C.gray900 }}>
                      S/ {fmt(v.total)}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => imprimirComprobante(v, v.estado === "Proforma")}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: C.gray400 }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = `${C.purple}10`;
                          (e.currentTarget as HTMLElement).style.color      = C.purple;
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color      = C.gray400;
                        }}>
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL PAGO */}
      {modalPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={e => e.target === e.currentTarget && setModalPago(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-2xl overflow-hidden"
            style={{ borderColor: `${C.purple}25` }}>

            <div className="px-6 py-5 flex justify-between items-center"
              style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
              <div>
                <h3 className="text-sm font-black text-white">Confirmar Pago</h3>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Selecciona el método de cobro
                </p>
              </div>
              <button onClick={() => setModalPago(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", color: C.white }}>
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl px-4 py-3 flex justify-between items-center border"
                style={{ background: `${C.purple}06`, borderColor: `${C.purple}20` }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.gray500 }}>
                    Total a cobrar
                  </p>
                  <p className="text-[10px]" style={{ color: C.gray400 }}>IGV incluido (18%)</p>
                </div>
                <span className="text-2xl font-black" style={{ color: C.purple }}>S/ {fmt(total)}</span>
              </div>

              <div className="space-y-2">
                {METODOS_PAGO.map(op => {
                  const Icon = op.icon;
                  const sel  = metodoPago === op.id;
                  return (
                    <button key={op.id} onClick={() => setMetodoPago(op.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all"
                      style={{
                        borderColor: sel ? C.purple : C.gray200,
                        background:  sel ? `${C.purple}08` : C.white,
                        color:       sel ? C.purple : C.gray600,
                      }}>
                      <Icon size={18} />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold">{op.label}</p>
                        <p className="text-[10px]">{op.sub}</p>
                      </div>
                      {sel && <CheckCircle2 size={16} style={{ color: C.purple }} />}
                    </button>
                  );
                })}
              </div>

              <button onClick={() => procesarOperacion("Venta")} disabled={loading}
                className="w-full py-4 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                  boxShadow:  `0 4px 16px ${C.purple}40`,
                }}>
                {loading ? "REGISTRANDO..." : "FINALIZAR VENTA · EMITIR BOLETA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}