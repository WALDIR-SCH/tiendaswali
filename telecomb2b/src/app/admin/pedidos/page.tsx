"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, doc, updateDoc,
  query, orderBy, where,
} from "firebase/firestore";
import {
  Search, X, Loader2, Eye, Upload, ChevronLeft, ChevronRight,
  RefreshCw, AlertCircle, CheckCircle, Clock, Truck, PackageCheck,
  Ban, Archive, TrendingUp, Users, DollarSign, ShoppingBag,
  AlertTriangle, FileSpreadsheet, FileDown, Package, Smartphone,
} from "lucide-react";

/* ─── TIPOS ─── */
type OrderStatus = "PENDIENTE" | "PAGADO" | "EN PROCESO" | "ENVIADO" | "ENTREGADO" | "CANCELADO";
type PaymentMethod = "Transferencia" | "Tarjeta" | "Efectivo" | "No especificado";

interface Pedido {
  id: string;
  clienteEmail: string;
  clienteNombre?: string;
  clienteRut?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  fecha: any;
  estado: OrderStatus;
  metodoPago: PaymentMethod;
  total: number;
  items: ProductoPedido[];
  comprobanteUrl?: string;
  nota?: string;
  notaInterna?: string;
  fechaActualizacion?: any;
  fechaEntrega?: any;
  trackingNumber?: string;
  courier?: string;
  guiaEnvio?: string;
  transportista?: string;
  archived?: boolean;
  archivedAt?: any;
  historialEstados?: HistorialEstado[];
  urgente?: boolean;
  imeisAsignados?: string[];
}

interface ProductoPedido {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  sku?: string;
  stock?: number;
}

interface HistorialEstado {
  estado: OrderStatus;
  fecha: any;
  usuario?: string;
  nota?: string;
}

interface Producto {
  id: string;
  nombre: string;
  sku: string;
  precio: number;
  stock: number;
  stockMinimo: number;
}

/* ─── PALETA UNIFICADA ─── */
const C = {
  purple:       "#7c3aed",
  purpleLight:  "#8b5cf6",
  purpleDark:   "#6d28d9",
  purpleBg:     "#ede9fe",
  purpleBorder: "#ddd6fe",
  green:        "#28FB4B",
  greenDark:    "#16a34a",
  greenBg:      "#f0fdf4",
  greenBorder:  "#bbf7d0",
  yellow:       "#F6FA00",
  orange:       "#FF6600",
  orangeBg:     "#fff7ed",
  orangeBorder: "#fed7aa",
  white:        "#ffffff",
  gray50:       "#f9fafb",
  gray100:      "#f3f4f6",
  gray200:      "#e5e7eb",
  gray300:      "#d1d5db",
  gray400:      "#9ca3af",
  gray500:      "#6b7280",
  gray700:      "#374151",
  gray900:      "#111827",
  red:          "#dc2626",
  redBg:        "#fef2f2",
  redBorder:    "#fecaca",
};

/* ─── ESTADOS ─── */
const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; border: string; icon: any; label: string; dot: string }> = {
  PENDIENTE:    { color:"#b45309",  bg:"#fffbeb",   border:"#fde68a",   icon:Clock,        label:"Pendiente",  dot:C.yellow   },
  PAGADO:       { color:"#1d4ed8",  bg:"#eff6ff",   border:"#bfdbfe",   icon:CheckCircle,  label:"Pagado",     dot:"#3b82f6"  },
  "EN PROCESO": { color:C.purple,   bg:C.purpleBg,  border:C.purpleBorder, icon:Package,   label:"En Proceso", dot:C.purple   },
  ENVIADO:      { color:"#0369a1",  bg:"#f0f9ff",   border:"#bae6fd",   icon:Truck,        label:"Enviado",    dot:"#0ea5e9"  },
  ENTREGADO:    { color:C.greenDark,bg:C.greenBg,   border:C.greenBorder,  icon:PackageCheck,label:"Entregado", dot:C.green    },
  CANCELADO:    { color:C.red,      bg:C.redBg,     border:C.redBorder, icon:Ban,          label:"Cancelado",  dot:C.red      },
};

const COURIER_OPTIONS = ["Olva Courier", "Shalom", "OTR", "Rapidísimo", "Otro"];

const fmtPEN = (n: number) =>
  new Intl.NumberFormat("es-PE", { style:"currency", currency:"PEN", minimumFractionDigits:2 }).format(n || 0);

const fmtFecha = (f: any) => {
  try {
    return f?.toDate
      ? f.toDate().toLocaleDateString("es-PE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })
      : "—";
  } catch { return "—"; }
};

/* ─── BADGE ESTADO ─── */
const StatusBadge = ({ estado }: { estado: string }) => {
  const cfg = STATUS_CFG[estado as OrderStatus] ?? { color:C.gray500, bg:C.gray100, border:C.gray200, icon:AlertCircle, label:estado, dot:C.gray500 };
  const Icon = cfg.icon;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, whiteSpace:"nowrap" }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
};

/* ══════════════════════════════════════
   MODAL DETALLE PEDIDO
══════════════════════════════════════ */
function ModalDetalle({ pedido, productos, onClose, onActualizarEnvio }: {
  pedido: Pedido;
  productos: Producto[];
  onClose: () => void;
  onActualizarEnvio: (id: string, tracking: string, courier: string) => void;
}) {
  const [courier,  setCourier]  = useState(pedido.courier || "");
  const [tracking, setTracking] = useState(pedido.trackingNumber || pedido.guiaEnvio || "");
  const [saving,   setSaving]   = useState(false);

  const handleGuardarEnvio = async () => {
    if (!courier || !tracking) { alert("Completa courier y número de seguimiento"); return; }
    setSaving(true);
    try { await onActualizarEnvio(pedido.id, tracking, courier); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.white, borderRadius:22, width:"100%", maxWidth:680, maxHeight:"92vh", overflowY:"auto", border:`1px solid ${C.gray200}`, boxShadow:"0 24px 80px rgba(0,0,0,0.18)" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${C.gray100}`, position:"sticky", top:0, background:C.white, zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:C.purpleBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <ShoppingBag size={18} style={{ color:C.purple }} />
            </div>
            <div>
              <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:C.gray900 }}>
                Pedido #{pedido.id.slice(-8).toUpperCase()}
              </h2>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3 }}>
                <StatusBadge estado={pedido.estado} />
                {pedido.urgente && (
                  <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20, background:C.redBg, color:C.red, border:`1px solid ${C.redBorder}` }}>
                    🔴 URGENTE
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:10, border:`1px solid ${C.gray200}`, background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={16} style={{ color:C.gray500 }} />
          </button>
        </div>

        <div style={{ padding:"22px 24px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* Cliente */}
          <section>
            <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:"0.1em" }}>Cliente</p>
            <div style={{ background:C.gray50, borderRadius:14, padding:"16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                ["Email",     pedido.clienteEmail],
                ["Nombre",    pedido.clienteNombre],
                ["RUC / DNI", pedido.clienteRut],
                ["Teléfono",  pedido.clienteTelefono],
                ["Dirección", pedido.clienteDireccion],
                ["Fecha",     fmtFecha(pedido.fecha)],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string}>
                  <p style={{ margin:0, fontSize:10, fontWeight:700, color:C.gray400, textTransform:"uppercase" }}>{k as string}</p>
                  <p style={{ margin:"2px 0 0", fontSize:13, color:C.gray900, fontWeight:500 }}>{v as string}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Productos */}
          <section>
            <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:"0.1em" }}>Productos ({pedido.items.length})</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {pedido.items.map((item, i) => {
                const prod = productos.find(p => p.id === item.id || p.sku === item.sku);
                const ok   = prod ? prod.stock >= item.cantidad : true;
                return (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"14px 16px", borderRadius:14,
                    border:`1px solid ${ok ? C.gray200 : C.redBorder}`,
                    background: ok ? C.white : C.redBg,
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:C.purpleBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Smartphone size={16} style={{ color:C.purple }} />
                      </div>
                      <div>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.gray900 }}>{item.nombre}</p>
                        <p style={{ margin:"2px 0 0", fontSize:11, color:C.gray500 }}>
                          SKU: {item.sku || "—"} · Cant: {item.cantidad}
                          {prod && ` · Stock disponible: ${prod.stock}`}
                        </p>
                        {!ok && <p style={{ margin:"2px 0 0", fontSize:11, color:C.red, fontWeight:700 }}>⚠ Stock insuficiente</p>}
                      </div>
                    </div>
                    <p style={{ fontSize:14, fontWeight:800, color:C.purple }}>{fmtPEN((item.precio || 0) * (item.cantidad || 1))}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* IMEIs asignados */}
          {pedido.imeisAsignados && pedido.imeisAsignados.length > 0 && (
            <section>
              <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:"0.1em" }}>
                IMEIs Asignados ({pedido.imeisAsignados.length})
              </p>
              <div style={{ background:C.purpleBg, borderRadius:14, padding:"14px 16px", border:`1px solid ${C.purpleBorder}` }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {pedido.imeisAsignados.map((imei, i) => (
                    <span key={i} style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:C.purple, padding:"4px 10px", borderRadius:8, background:C.white, border:`1px solid ${C.purpleBorder}` }}>
                      {imei}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Envío */}
          <section>
            <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:"0.1em" }}>Envío y Logística</p>
            <div style={{ background:C.gray50, borderRadius:14, padding:"16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.gray500, display:"block", marginBottom:6, textTransform:"uppercase" }}>Courier</label>
                <select value={courier} onChange={e => setCourier(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, color:C.gray900, outline:"none", background:C.white }}>
                  <option value="">Seleccionar courier</option>
                  {COURIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.gray500, display:"block", marginBottom:6, textTransform:"uppercase" }}>N° Seguimiento</label>
                <input value={tracking} onChange={e => setTracking(e.target.value)}
                  placeholder="Ej: OLV-123456789"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, color:C.gray900, outline:"none" }}
                />
              </div>
            </div>
            {(courier || tracking) && (
              <button onClick={handleGuardarEnvio} disabled={saving}
                style={{ marginTop:10, padding:"9px 18px", borderRadius:10, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, border:"none", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 12px ${C.purple}35` }}>
                {saving ? "Guardando..." : "💾 Guardar datos de envío"}
              </button>
            )}
          </section>

          {/* Historial */}
          {!!pedido.historialEstados?.length && (
            <section>
              <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:"0.1em" }}>Historial de estados</p>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {pedido.historialEstados.map((h, i) => {
                  const cfg = STATUS_CFG[h.estado] ?? STATUS_CFG.PENDIENTE;
                  const HIcon = cfg.icon;
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 14px", borderRadius:12, background:C.gray50, border:`1px solid ${C.gray100}` }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1px solid ${cfg.border}` }}>
                        <HIcon size={14} style={{ color:cfg.color }} />
                      </div>
                      <div>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.gray900 }}>{cfg.label}</p>
                        <p style={{ margin:"2px 0 0", fontSize:11, color:C.gray500 }}>
                          {fmtFecha(h.fecha)}{h.usuario ? ` · ${h.usuario}` : ""}
                        </p>
                        {h.nota && <p style={{ margin:"2px 0 0", fontSize:11, color:C.gray500 }}>{h.nota}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Resumen */}
          <section>
            <div style={{ padding:"16px", borderRadius:14, background:C.purpleBg, border:`1px solid ${C.purpleBorder}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:13, color:C.gray700, fontWeight:600 }}>Método de pago</span>
                <span style={{ fontSize:13, fontWeight:700, color:C.gray900 }}>{pedido.metodoPago}</span>
              </div>
              {pedido.comprobanteUrl && (
                <div style={{ marginBottom:10 }}>
                  <a href={pedido.comprobanteUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:C.purple, fontWeight:700, textDecoration:"none" }}>
                    <Upload size={13} /> Ver comprobante
                  </a>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10, borderTop:`1px solid ${C.purpleBorder}` }}>
                <span style={{ fontSize:15, fontWeight:800, color:C.gray900 }}>TOTAL</span>
                <span style={{ fontSize:22, fontWeight:900, color:C.purple }}>{fmtPEN(pedido.total)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, padding:"16px 24px", borderTop:`1px solid ${C.gray100}`, position:"sticky", bottom:0, background:C.white }}>
          <button onClick={() => alert(`Generar factura ${pedido.id}`)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, border:"none", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            <FileDown size={15} /> Generar Factura
          </button>
          <button onClick={onClose}
            style={{ padding:"9px 18px", borderRadius:11, border:`1px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:600, color:C.gray700, cursor:"pointer" }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PÁGINA PRINCIPAL PEDIDOS
══════════════════════════════════════ */
export default function GestionPedidos() {
  const [pedidos,            setPedidos]            = useState<Pedido[]>([]);
  const [productos,          setProductos]          = useState<Producto[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [mostrarArchivados,  setMostrarArchivados]  = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);
  const [actualizandoId,     setActualizandoId]     = useState<string | null>(null);
  const [filtroEstado,       setFiltroEstado]       = useState<string>("Todos");
  const [filtroPago,         setFiltroPago]         = useState<string>("Todos");
  const [busqueda,           setBusqueda]           = useState("");
  const [soloUrgentes,       setSoloUrgentes]       = useState(false);
  const [pagina,             setPagina]             = useState(1);
  const POR_PAGINA = 10;

  /* ── Cargar datos ── */
  const cargarPedidos = useCallback(async (incArch = false) => {
    setLoading(true); setError(null);
    try {
      let q = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
      if (!incArch) q = query(q, where("archived", "!=", true));
      const snap = await getDocs(q);
      setPedidos(snap.docs.map(d => {
        const data = d.data();
        return {
          id:                d.id,
          clienteEmail:      data.clienteEmail || data.email || "—",
          clienteNombre:     data.clienteNombre || null,
          clienteRut:        data.clienteRut || null,
          clienteTelefono:   data.clienteTelefono || null,
          clienteDireccion:  data.clienteDireccion || null,
          fecha:             data.fecha || null,
          estado:            data.estado || "PENDIENTE",
          metodoPago:        data.metodoPago || "No especificado",
          total:             Number(data.total) || 0,
          items:             data.items || [],
          comprobanteUrl:    data.comprobanteUrl || data.comprobante || null,
          nota:              data.nota || null,
          notaInterna:       data.notaInterna || null,
          trackingNumber:    data.trackingNumber || null,
          courier:           data.courier || null,
          guiaEnvio:         data.guiaEnvio || null,
          transportista:     data.transportista || null,
          archived:          data.archived || false,
          historialEstados:  data.historialEstados || [],
          urgente:           data.urgente || false,
          imeisAsignados:    data.imeisAsignados || [],
        } as Pedido;
      }));
    } catch { setError("No se pudieron cargar los pedidos."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    cargarPedidos(mostrarArchivados);
    getDocs(collection(db, "productos")).then(snap =>
      setProductos(snap.docs.map(d => ({ id:d.id, ...d.data() } as Producto)))
    );
  }, [cargarPedidos, mostrarArchivados]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const act = pedidos.filter(p => !p.archived && p.estado !== "CANCELADO");
    const ventaHoy = act.filter(p => { try { const d = p.fecha.toDate(); d.setHours(0,0,0,0); return d.getTime() === hoy.getTime(); } catch { return false; } }).reduce((s,p)=>s+p.total,0);
    const ventaMes = act.filter(p => { try { return p.fecha.toDate() >= mes; } catch { return false; } }).reduce((s,p)=>s+p.total,0);
    const pend     = pedidos.filter(p => p.estado==="PENDIENTE" && !p.archived).length;
    const entr     = pedidos.filter(p => p.estado==="ENTREGADO" && !p.archived);
    const ticket   = entr.length ? entr.reduce((s,p)=>s+p.total,0)/entr.length : 0;
    return { ventaHoy, ventaMes, pend, ticket };
  }, [pedidos]);

  /* ── Alertas ── */
  const alertasStock     = useMemo(() => productos.filter(p => p.stock <= p.stockMinimo), [productos]);
  const pedidosUrgentes  = useMemo(() => pedidos.filter(p => p.urgente && !["ENTREGADO","CANCELADO"].includes(p.estado) && !p.archived), [pedidos]);
  const pedidosRetrasados= useMemo(() => {
    const hace3 = new Date(); hace3.setDate(hace3.getDate()-3);
    return pedidos.filter(p => { try { return p.fecha?.toDate && !["ENTREGADO","CANCELADO"].includes(p.estado) && !p.archived && p.fecha.toDate()<hace3; } catch { return false; } });
  }, [pedidos]);

  /* ── Filtrar ── */
  const filtrados = useMemo(() => {
    let f = pedidos;
    if (!mostrarArchivados) f = f.filter(p => !p.archived);
    if (busqueda) {
      const s = busqueda.toLowerCase();
      f = f.filter(p =>
        p.clienteEmail.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) ||
        (p.clienteNombre||"").toLowerCase().includes(s) || (p.clienteRut||"").includes(s) ||
        (p.trackingNumber||"").toLowerCase().includes(s)
      );
    }
    if (filtroEstado !== "Todos") f = f.filter(p => p.estado === filtroEstado);
    if (filtroPago   !== "Todos") f = f.filter(p => p.metodoPago === filtroPago);
    if (soloUrgentes) f = f.filter(p => p.urgente);
    return f;
  }, [pedidos, mostrarArchivados, busqueda, filtroEstado, filtroPago, soloUrgentes]);

  const paginados    = useMemo(() => filtrados.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA), [filtrados, pagina]);
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);

  /* ── Acciones ── */
  const actualizarEstado = useCallback(async (id: string, nuevoEstado: OrderStatus) => {
    setActualizandoId(id);
    const p = pedidos.find(x => x.id === id);
    try {
      const hist = { estado:nuevoEstado, fecha:new Date(), usuario:"admin", nota:`${p?.estado} → ${nuevoEstado}` };
      const data: any = { estado:nuevoEstado, fechaActualizacion:new Date(), historialEstados:[...(p?.historialEstados||[]), hist] };
      if (nuevoEstado==="ENTREGADO") data.fechaEntrega = new Date();
      await updateDoc(doc(db,"pedidos",id), data);
      setPedidos(prev => prev.map(x => x.id===id ? {...x, estado:nuevoEstado, historialEstados:[...(x.historialEstados||[]), hist]} : x));
    } catch { alert("Error actualizando estado"); }
    finally { setActualizandoId(null); }
  }, [pedidos]);

  const actualizarEnvio = useCallback(async (id: string, tracking: string, courier: string) => {
    setActualizandoId(id);
    try {
      await updateDoc(doc(db,"pedidos",id), { trackingNumber:tracking, courier, guiaEnvio:tracking, transportista:courier, estado:"ENVIADO", fechaActualizacion:new Date() });
      setPedidos(prev => prev.map(x => x.id===id ? {...x, trackingNumber:tracking, courier, estado:"ENVIADO" as OrderStatus} : x));
      if (pedidoSeleccionado?.id===id) setPedidoSeleccionado(prev => prev ? {...prev, trackingNumber:tracking, courier, estado:"ENVIADO"} : null);
    } catch { alert("Error actualizando envío"); }
    finally { setActualizandoId(null); }
  }, [pedidoSeleccionado]);

  const archivarPedido = useCallback(async (id: string) => {
    if (!confirm("¿Archivar este pedido?")) return;
    setActualizandoId(id);
    try {
      await updateDoc(doc(db,"pedidos",id), { archived:true, archivedAt:new Date() });
      setPedidos(prev => prev.filter(x => x.id !== id));
    } catch { alert("Error al archivar"); }
    finally { setActualizandoId(null); }
  }, []);

  const exportarCSV = () => {
    if (!filtrados.length) { alert("Sin datos"); return; }
    const rows = filtrados.map(p => ({
      ID: p.id, Fecha: fmtFecha(p.fecha),
      Cliente: p.clienteNombre || p.clienteEmail, Email: p.clienteEmail,
      Total: p.total, Estado: p.estado, Pago: p.metodoPago,
      Tracking: p.trackingNumber||"", Urgente: p.urgente?"Sí":"No",
      IMEIs: (p.imeisAsignados||[]).join(";"),
    }));
    const csv = [Object.keys(rows[0]).join(","), ...rows.map(r => Object.values(r).join(","))].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" })),
      download: `pedidos_${new Date().toISOString().split("T")[0]}.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  /* ─────────────────────── RENDER ─────────────────────── */
  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", minHeight:"100vh", background:C.white }}>

      {/* Header sticky */}
      <div style={{ borderBottom:`1px solid ${C.gray200}`, background:C.white, position:"sticky", top:0, zIndex:30 }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.03em" }}>Gestión de Pedidos</h1>
            <p style={{ fontSize:12, color:C.gray500, margin:"2px 0 0" }}>
              {filtrados.length} pedidos · {pedidos.length} total
            </p>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={() => { setMostrarArchivados(v=>!v); setPagina(1); }}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, border:`1px solid ${mostrarArchivados ? C.purpleBorder : C.gray200}`, background: mostrarArchivados ? C.purpleBg : C.white, fontSize:12, fontWeight:600, color: mostrarArchivados ? C.purple : C.gray500, cursor:"pointer" }}>
              <Archive size={14} /> {mostrarArchivados ? "Ocultar archivados" : "Ver archivados"}
            </button>
            <button onClick={() => cargarPedidos(mostrarArchivados)} disabled={loading}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, border:`1px solid ${C.gray200}`, background:C.white, fontSize:12, fontWeight:600, color:C.gray500, cursor:"pointer" }}>
              <RefreshCw size={14} className={loading ? "spin" : ""} style={{ color:C.purple }} />
              Actualizar
            </button>
            <button onClick={exportarCSV} disabled={!filtrados.length}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, border:"none", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 12px ${C.purple}40` }}>
              <FileSpreadsheet size={14} /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:18 }}>

        {/* ── ALERTAS ── */}
        {(alertasStock.length > 0 || pedidosUrgentes.length > 0 || pedidosRetrasados.length > 0) && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {alertasStock.length > 0 && (
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", borderRadius:14, background:C.orangeBg, border:`1px solid ${C.orangeBorder}`, borderLeft:`4px solid ${C.orange}` }}>
                <AlertTriangle size={16} style={{ color:C.orange, marginTop:1, flexShrink:0 }} />
                <div>
                  <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#92400e" }}>Stock bajo ({alertasStock.length} productos)</p>
                  <p style={{ margin:"3px 0 0", fontSize:12, color:"#b45309" }}>{alertasStock.map(p => `${p.nombre}: ${p.stock} uds`).join(" · ")}</p>
                </div>
              </div>
            )}
            {pedidosUrgentes.length > 0 && (
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", borderRadius:14, background:C.redBg, border:`1px solid ${C.redBorder}`, borderLeft:`4px solid ${C.red}` }}>
                <AlertCircle size={16} style={{ color:C.red, marginTop:1, flexShrink:0 }} />
                <div>
                  <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.red }}>Pedidos urgentes ({pedidosUrgentes.length})</p>
                  <p style={{ margin:"3px 0 0", fontSize:12, color:C.red }}>{pedidosUrgentes.map(p => `#${p.id.slice(-6)} ${p.clienteNombre||p.clienteEmail}`).join(" · ")}</p>
                </div>
              </div>
            )}
            {pedidosRetrasados.length > 0 && (
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", borderRadius:14, background:"#fffbeb", border:`1px solid #fde68a`, borderLeft:`4px solid ${C.yellow}` }}>
                <Clock size={16} style={{ color:"#b45309", marginTop:1, flexShrink:0 }} />
                <div>
                  <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#92400e" }}>Pedidos retrasados +3 días ({pedidosRetrasados.length})</p>
                  <p style={{ margin:"3px 0 0", fontSize:12, color:"#b45309" }}>{pedidosRetrasados.map(p => `#${p.id.slice(-6)}`).join(" · ")}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KPIs ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
          {[
            { label:"Ventas Hoy",      value:fmtPEN(kpis.ventaHoy), icon:DollarSign, accent:C.purple },
            { label:"Ventas del Mes",  value:fmtPEN(kpis.ventaMes), icon:TrendingUp,  accent:C.purpleLight },
            { label:"Pendientes",      value:String(kpis.pend),      icon:Clock,       accent:C.orange },
            { label:"Ticket Promedio", value:fmtPEN(kpis.ticket),   icon:Users,       accent:C.greenDark },
          ].map(({ label, value, icon:Icon, accent }) => (
            <div key={label} style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:18, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${accent},${accent}88)`, borderRadius:"18px 18px 0 0" }} />
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                <p style={{ fontSize:11, fontWeight:700, color:C.gray500, textTransform:"uppercase", letterSpacing:"0.07em", margin:0 }}>{label}</p>
                <div style={{ width:36, height:36, borderRadius:10, background:`${accent}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon size={18} style={{ color:accent }} />
                </div>
              </div>
              <p style={{ fontSize:24, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.03em" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── FILTROS ── */}
        <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:16, padding:"16px 18px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:10 }}>
            {/* Búsqueda */}
            <div style={{ position:"relative" }}>
              <Search size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray300, pointerEvents:"none" }} />
              <input
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                placeholder="Buscar por email, ID, nombre, RUC..."
                style={{ width:"100%", paddingLeft:38, paddingRight:busqueda?34:12, paddingTop:10, paddingBottom:10, borderRadius:11, border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none", color:C.gray900 }}
                onFocus={e => { e.target.style.borderColor=C.purple; e.target.style.boxShadow=`0 0 0 3px ${C.purple}18`; }}
                onBlur={e => { e.target.style.borderColor=C.gray200; e.target.style.boxShadow="none"; }}
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer" }}>
                  <X size={13} style={{ color:C.gray400 }} />
                </button>
              )}
            </div>
            {/* Estado */}
            <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1); }}
              style={{ padding:"10px 14px", borderRadius:11, border:`1.5px solid ${C.gray200}`, fontSize:13, color:C.gray700, outline:"none", background:C.white, minWidth:170 }}>
              <option value="Todos">Todos los estados</option>
              {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{STATUS_CFG[s as OrderStatus].label}</option>)}
            </select>
            {/* Pago */}
            <select value={filtroPago} onChange={e => { setFiltroPago(e.target.value); setPagina(1); }}
              style={{ padding:"10px 14px", borderRadius:11, border:`1.5px solid ${C.gray200}`, fontSize:13, color:C.gray700, outline:"none", background:C.white, minWidth:160 }}>
              <option value="Todos">Todos los pagos</option>
              {["Transferencia","Tarjeta","Efectivo","No especificado"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {/* Urgentes */}
            <button onClick={() => setSoloUrgentes(v => !v)}
              style={{ padding:"10px 16px", borderRadius:11, border:`1.5px solid ${soloUrgentes ? C.redBorder : C.gray200}`, background: soloUrgentes ? C.redBg : C.white, fontSize:13, fontWeight:700, color: soloUrgentes ? C.red : C.gray500, cursor:"pointer", whiteSpace:"nowrap" }}>
              🔴 Urgentes
            </button>
          </div>
          {(busqueda || filtroEstado !== "Todos" || filtroPago !== "Todos" || soloUrgentes) && (
            <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.gray100}`, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, color:C.gray500 }}>Filtros activos:</span>
              <button onClick={() => { setBusqueda(""); setFiltroEstado("Todos"); setFiltroPago("Todos"); setSoloUrgentes(false); setPagina(1); }}
                style={{ fontSize:12, fontWeight:700, color:C.purple, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                Limpiar todo
              </button>
              <span style={{ fontSize:12, color:C.gray400 }}>· {filtrados.length} resultados</span>
            </div>
          )}
        </div>

        {/* ── TABLA ── */}
        <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:18, overflow:"hidden", boxShadow:`0 4px 24px ${C.purple}06` }}>
          {error ? (
            <div style={{ padding:"48px", textAlign:"center" }}>
              <AlertCircle size={40} style={{ color:C.red, margin:"0 auto 12px", display:"block" }} />
              <p style={{ fontSize:14, fontWeight:700, color:C.gray900, margin:"0 0 4px" }}>Error al cargar</p>
              <p style={{ fontSize:13, color:C.gray500, margin:"0 0 16px" }}>{error}</p>
              <button onClick={() => cargarPedidos(mostrarArchivados)}
                style={{ padding:"9px 18px", borderRadius:10, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, border:"none", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:C.gray50, borderBottom:`1px solid ${C.gray200}` }}>
                      {["Pedido / Fecha", "Cliente", "Productos", "Total", "Estado", "Pago / Envío", "Acciones"].map((h, i) => (
                        <th key={h} style={{ padding:"11px 16px", fontSize:11, fontWeight:800, color:C.gray500, textAlign: i===6?"right":"left", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${C.gray100}` }}>
                          {[...Array(7)].map((_, j) => (
                            <td key={j} style={{ padding:"16px" }}>
                              <div style={{ height:14, borderRadius:6, background:C.gray100, animation:"pulse 1.4s ease infinite", width: j===0?"75%":"60%" }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : paginados.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding:"56px", textAlign:"center" }}>
                          <div style={{ width:56, height:56, borderRadius:16, background:C.purpleBg, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                            <ShoppingBag size={26} style={{ color:C.purple }} />
                          </div>
                          <p style={{ fontSize:15, fontWeight:700, color:C.gray900, margin:"0 0 4px" }}>
                            {busqueda || filtroEstado !== "Todos" ? "Sin resultados" : "Sin pedidos"}
                          </p>
                          <p style={{ fontSize:13, color:C.gray500, margin:0 }}>
                            {busqueda || filtroEstado !== "Todos" ? "Prueba con otros filtros" : "Los pedidos aparecerán aquí"}
                          </p>
                        </td>
                      </tr>
                    ) : paginados.map((pedido, idx) => (
                      <tr key={pedido.id}
                        style={{ borderBottom: idx < paginados.length-1 ? `1px solid ${C.gray100}` : "none", transition:"background .12s", background: pedido.urgente ? "#fef2f240" : C.white }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#faf9ff")}
                        onMouseLeave={e => (e.currentTarget.style.background = pedido.urgente ? "#fef2f240" : C.white)}
                      >
                        {/* ID / Fecha */}
                        <td style={{ padding:"14px 16px" }}>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                            {pedido.urgente && <AlertCircle size={14} style={{ color:C.red, marginTop:1, flexShrink:0 }} />}
                            <div>
                              <p style={{ margin:0, fontSize:13, fontWeight:800, color:C.purple }}>#{pedido.id.slice(-8).toUpperCase()}</p>
                              <p style={{ margin:"2px 0 0", fontSize:11, color:C.gray400 }}>{fmtFecha(pedido.fecha)}</p>
                            </div>
                          </div>
                        </td>
                        {/* Cliente */}
                        <td style={{ padding:"14px 16px" }}>
                          <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.gray900 }}>{pedido.clienteNombre || pedido.clienteEmail}</p>
                          {pedido.clienteRut && <p style={{ margin:"2px 0 0", fontSize:11, color:C.gray400 }}>{pedido.clienteRut}</p>}
                        </td>
                        {/* Productos */}
                        <td style={{ padding:"14px 16px" }}>
                          <p style={{ margin:0, fontSize:13, color:C.gray700 }}>{pedido.items.length} producto{pedido.items.length!==1?"s":""}</p>
                          {pedido.imeisAsignados && pedido.imeisAsignados.length > 0 && (
                            <p style={{ margin:"2px 0 0", fontSize:11, color:C.purple, fontWeight:600 }}>📱 {pedido.imeisAsignados.length} IMEIs</p>
                          )}
                        </td>
                        {/* Total */}
                        <td style={{ padding:"14px 16px" }}>
                          <p style={{ margin:0, fontSize:15, fontWeight:900, color:C.purple }}>{fmtPEN(pedido.total)}</p>
                        </td>
                        {/* Estado */}
                        <td style={{ padding:"14px 16px" }}>
                          <StatusBadge estado={pedido.estado} />
                        </td>
                        {/* Pago / Envío */}
                        <td style={{ padding:"14px 16px" }}>
                          <p style={{ margin:0, fontSize:12, color:C.gray700, fontWeight:600 }}>{pedido.metodoPago}</p>
                          {pedido.comprobanteUrl && (
                            <a href={pedido.comprobanteUrl} target="_blank" rel="noopener noreferrer"
                              style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:11, color:C.purple, fontWeight:700, textDecoration:"none", marginTop:2 }}>
                              <Upload size={11} /> Comprobante
                            </a>
                          )}
                          {pedido.trackingNumber ? (
                            <p style={{ margin:"3px 0 0", fontSize:11, color:C.gray400 }}>{pedido.courier} · {pedido.trackingNumber}</p>
                          ) : (
                            <p style={{ margin:"3px 0 0", fontSize:11, color:C.gray300 }}>Sin tracking</p>
                          )}
                        </td>
                        {/* Acciones */}
                        <td style={{ padding:"14px 16px" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6 }}>
                            <select
                              value={pedido.estado}
                              onChange={e => actualizarEstado(pedido.id, e.target.value as OrderStatus)}
                              disabled={!!actualizandoId || !!pedido.archived}
                              style={{ fontSize:11, padding:"6px 10px", borderRadius:9, border:`1.5px solid ${C.purpleBorder}`, color:C.purple, outline:"none", background:C.purpleBg, fontWeight:700, cursor:"pointer", maxWidth:120 }}
                            >
                              {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{STATUS_CFG[s as OrderStatus].label}</option>)}
                            </select>
                            <button onClick={() => setPedidoSeleccionado(pedido)}
                              style={{ width:30, height:30, borderRadius:8, border:`1px solid ${C.gray200}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background=C.purpleBg; (e.currentTarget as HTMLElement).style.borderColor=C.purpleBorder; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background=C.white; (e.currentTarget as HTMLElement).style.borderColor=C.gray200; }}>
                              <Eye size={14} style={{ color:C.purple }} />
                            </button>
                            <button onClick={() => alert(`Factura ${pedido.id}`)}
                              style={{ width:30, height:30, borderRadius:8, border:`1px solid ${C.gray200}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background=C.purpleBg; (e.currentTarget as HTMLElement).style.borderColor=C.purpleBorder; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background=C.white; (e.currentTarget as HTMLElement).style.borderColor=C.gray200; }}>
                              <FileDown size={14} style={{ color:C.purple }} />
                            </button>
                            {!pedido.archived && (
                              <button onClick={() => archivarPedido(pedido.id)} disabled={actualizandoId===pedido.id}
                                style={{ width:30, height:30, borderRadius:8, border:`1px solid ${C.gray200}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", opacity:actualizandoId===pedido.id?0.5:1 }}>
                                <Archive size={14} style={{ color:C.gray400 }} />
                              </button>
                            )}
                            {actualizandoId===pedido.id && <Loader2 size={14} style={{ color:C.purple, animation:"spin .75s linear infinite" }} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {!loading && filtrados.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderTop:`1px solid ${C.gray100}` }}>
                  <p style={{ fontSize:12, color:C.gray500, margin:0 }}>
                    {(pagina-1)*POR_PAGINA+1}–{Math.min(pagina*POR_PAGINA,filtrados.length)} de {filtrados.length} pedidos
                  </p>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <button onClick={() => setPagina(p => Math.max(1,p-1))} disabled={pagina===1}
                      style={{ width:30, height:30, borderRadius:8, border:`1px solid ${C.gray200}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", opacity:pagina===1?0.4:1 }}>
                      <ChevronLeft size={14} style={{ color:C.gray700 }} />
                    </button>
                    <span style={{ fontSize:13, color:C.gray700, fontWeight:600, minWidth:60, textAlign:"center" }}>{pagina} / {totalPaginas||1}</span>
                    <button onClick={() => setPagina(p => Math.min(totalPaginas,p+1))} disabled={pagina===totalPaginas||!totalPaginas}
                      style={{ width:30, height:30, borderRadius:8, border:`1px solid ${C.gray200}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", opacity:(pagina===totalPaginas||!totalPaginas)?0.4:1 }}>
                      <ChevronRight size={14} style={{ color:C.gray700 }} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal detalle */}
      {pedidoSeleccionado && (
        <ModalDetalle
          pedido={pedidoSeleccionado}
          productos={productos}
          onClose={() => setPedidoSeleccionado(null)}
          onActualizarEnvio={actualizarEnvio}
        />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse   { 0%,100%{opacity:1}50%{opacity:.5} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}