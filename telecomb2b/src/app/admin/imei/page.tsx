"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy, onSnapshot, writeBatch,
} from "firebase/firestore";
import Link from "next/link";
import {
  ArrowLeft, Plus, Search, Smartphone, RefreshCw, X,
  CheckCircle, AlertTriangle, Package, Layers, ChevronDown,
  ChevronRight, Eye, Copy, Check, Boxes, Tag, Zap,
  ClipboardList, ListFilter, Hash, ShoppingBag,
} from "lucide-react";

/* ─── TIPOS ─── */
interface RegistroIMEI {
  id: string;
  imei: string;
  imei2?: string;
  productoId: string;
  productoNombre: string;
  sku: string;
  marca: string;
  modelo: string;
  color: string;
  almacenamiento: string;
  lote: string;
  estado: "disponible" | "vendido" | "reservado" | "garantia" | "defectuoso";
  pedidoId?: string;
  clienteNombre?: string;
  fechaIngreso: any;
  fechaVenta?: any;
  garantiaMeses: number;
  notas: string;
}

interface GrupoProducto {
  productoId: string;
  productoNombre: string;
  sku: string;
  marca: string;
  color: string;
  almacenamiento: string;
  disponibles: number;
  vendidos: number;
  reservados: number;
  garantia: number;
  defectuosos: number;
  total: number;
  lotes: string[];
  imeis: RegistroIMEI[];
}

interface GrupoLote {
  lote: string;
  productoNombre: string;
  marca: string;
  total: number;
  disponibles: number;
  vendidos: number;
  imeis: RegistroIMEI[];
  fechaIngreso: any;
}

interface Producto {
  id: string;
  nombre_producto?: string;
  nombre?: string;
  sku?: string;
  marca?: string;
  modelo?: string;
  color?: string;
  capacidad_almacenamiento?: string;
  precio_unitario?: number;
  garantia_meses?: number;
}

/* ─── PALETA ─── */
const C = {
  purple:      "#7c3aed",
  purpleLight: "#8b5cf6",
  purpleBg:    "#ede9fe",
  purpleBorder:"#ddd6fe",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  greenBg:     "#f0fdf4",
  greenBorder: "#bbf7d0",
  yellow:      "#F6FA00",
  orange:      "#FF6600",
  orangeBg:    "#fff7ed",
  orangeBorder:"#fed7aa",
  white:       "#FFFFFF",
  gray50:      "#f9fafb",
  gray100:     "#f3f4f6",
  gray200:     "#e5e7eb",
  gray300:     "#d1d5db",
  gray500:     "#6b7280",
  gray700:     "#374151",
  gray900:     "#111827",
  red:         "#dc2626",
  redBg:       "#fef2f2",
  redBorder:   "#fecaca",
};

const ESTADO_CFG: Record<string, { label: string; bg: string; color: string; border: string; dot: string }> = {
  disponible: { label:"Disponible",  bg:C.greenBg,    color:C.greenDark, border:C.greenBorder,  dot:C.green   },
  vendido:    { label:"Vendido",     bg:C.purpleBg,   color:C.purple,    border:C.purpleBorder, dot:C.purple  },
  reservado:  { label:"Reservado",   bg:"#fffbeb",    color:"#b45309",   border:"#fde68a",      dot:C.yellow  },
  garantia:   { label:"En Garantía", bg:C.orangeBg,   color:C.orange,    border:C.orangeBorder, dot:C.orange  },
  defectuoso: { label:"Defectuoso",  bg:C.redBg,      color:C.red,       border:C.redBorder,    dot:C.red     },
};

const EstadoBadge = ({ estado }: { estado: string }) => {
  const e = ESTADO_CFG[estado] ?? ESTADO_CFG.disponible;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:e.bg, color:e.color, border:`1px solid ${e.border}` }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:e.dot, display:"inline-block" }} />
      {e.label}
    </span>
  );
};

const fmtFecha = (f: any) => {
  try { return f?.toDate ? f.toDate().toLocaleDateString("es-PE", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—"; }
  catch { return "—"; }
};

/* ══════════════════════════════════════
   MODAL DETALLE IMEIs DE UN PRODUCTO
══════════════════════════════════════ */
function ModalDetalleProducto({ grupo, onClose, onCambiarEstado }: {
  grupo: GrupoProducto;
  onClose: () => void;
  onCambiarEstado: (id: string, estado: RegistroIMEI["estado"]) => void;
}) {
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda,     setBusqueda]     = useState("");
  const [copiado,      setCopiado]      = useState<string | null>(null);

  const filtrados = grupo.imeis.filter(r => {
    const matchE = filtroEstado === "todos" ? true : r.estado === filtroEstado;
    const matchS = busqueda ? r.imei.includes(busqueda) || (r.imei2 || "").includes(busqueda) : true;
    return matchE && matchS;
  });

  const copiar = (imei: string) => {
    navigator.clipboard.writeText(imei);
    setCopiado(imei);
    setTimeout(() => setCopiado(null), 1500);
  };

  const resumen = [
    { label:"Disponibles", val:grupo.disponibles,  bg:C.greenBg,  color:C.greenDark, border:C.greenBorder  },
    { label:"Vendidos",    val:grupo.vendidos,     bg:C.purpleBg, color:C.purple,    border:C.purpleBorder },
    { label:"Reservados",  val:grupo.reservados,   bg:"#fffbeb",  color:"#b45309",   border:"#fde68a"      },
    { label:"Garantía",    val:grupo.garantia,     bg:C.orangeBg, color:C.orange,    border:C.orangeBorder },
    { label:"Defectuosos", val:grupo.defectuosos,  bg:C.redBg,    color:C.red,       border:C.redBorder    },
  ].filter(s => s.val > 0);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:70, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:20, overflowY:"auto" }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:780, border:`1px solid ${C.gray200}`, boxShadow:"0 24px 80px rgba(0,0,0,0.2)", marginTop:20 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${C.gray100}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:C.purpleBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Smartphone size={20} style={{ color:C.purple }} />
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:C.gray900 }}>{grupo.productoNombre}</h3>
              <p style={{ margin:0, fontSize:12, color:C.gray500 }}>
                SKU: {grupo.sku} · {grupo.marca} · {grupo.color} {grupo.almacenamiento} · {grupo.total} IMEIs
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, border:`1px solid ${C.gray200}`, background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={16} style={{ color:C.gray500 }} />
          </button>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* Resumen estados */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {resumen.map(s => (
              <button key={s.label} onClick={() => setFiltroEstado(filtroEstado === s.label.toLowerCase().split(" ")[0] ? "todos" : s.label.toLowerCase().split(" ")[0] === "disponibles" ? "disponible" : s.label.toLowerCase().split(" ")[0] === "vendidos" ? "vendido" : s.label.toLowerCase().split(" ")[0] === "reservados" ? "reservado" : s.label.toLowerCase().split(" ")[0] === "garantía" ? "garantia" : "defectuoso")}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:20, border:`1.5px solid ${s.border}`, background:s.bg, cursor:"pointer", transition:"all .15s" }}>
                <span style={{ fontSize:14, fontWeight:900, color:s.color }}>{s.val}</span>
                <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{s.label}</span>
              </button>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:20, border:`1px solid ${C.gray200}`, background:C.gray50 }}>
              <span style={{ fontSize:14, fontWeight:900, color:C.gray900 }}>{grupo.total}</span>
              <span style={{ fontSize:11, fontWeight:700, color:C.gray500 }}>Total</span>
            </div>
          </div>

          {/* Lotes */}
          {grupo.lotes.length > 0 && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {grupo.lotes.map(l => (
                <span key={l} style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:8, background:C.purpleBg, color:C.purple, border:`1px solid ${C.purpleBorder}` }}>
                  📦 {l}
                </span>
              ))}
            </div>
          )}

          {/* Filtro búsqueda */}
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1, position:"relative" }}>
              <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.gray300, pointerEvents:"none" }} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Filtrar por IMEI..."
                style={{ width:"100%", paddingLeft:36, paddingRight:12, paddingTop:9, paddingBottom:9, borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, fontFamily:"monospace", outline:"none", color:C.gray900 }}
                onFocus={e => { e.target.style.borderColor = C.purple; }}
                onBlur={e => { e.target.style.borderColor = C.gray200; }}
              />
            </div>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              style={{ padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, color:C.gray700, outline:"none", background:C.white, minWidth:140 }}>
              <option value="todos">Todos ({grupo.total})</option>
              <option value="disponible">Disponibles ({grupo.disponibles})</option>
              <option value="vendido">Vendidos ({grupo.vendidos})</option>
              <option value="reservado">Reservados ({grupo.reservados})</option>
              <option value="garantia">Garantía ({grupo.garantia})</option>
              <option value="defectuoso">Defectuosos ({grupo.defectuosos})</option>
            </select>
          </div>

          {/* Tabla IMEIs */}
          <div style={{ border:`1px solid ${C.gray200}`, borderRadius:14, overflow:"hidden", maxHeight:380, overflowY:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead style={{ position:"sticky", top:0 }}>
                <tr style={{ background:C.gray50, borderBottom:`1px solid ${C.gray200}` }}>
                  {["#","IMEI 1","IMEI 2","Lote","Estado","Cliente","Ingreso","Acción"].map((h, i) => (
                    <th key={h} style={{ padding:"9px 12px", fontSize:10, fontWeight:800, color:C.gray500, textAlign:"left", whiteSpace:"nowrap", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding:"32px", textAlign:"center", color:C.gray500, fontSize:13 }}>Sin resultados</td></tr>
                ) : filtrados.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom:`1px solid ${C.gray100}`, transition:"background .1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#faf9ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = C.white)}>
                    <td style={{ padding:"9px 12px", fontSize:11, color:C.gray100 }}>{i + 1}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:C.gray900 }}>{r.imei}</span>
                        <button onClick={() => copiar(r.imei)}
                          style={{ width:22, height:22, borderRadius:6, border:`1px solid ${C.gray200}`, background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {copiado === r.imei ? <Check size={10} style={{ color:C.greenDark }} /> : <Copy size={10} style={{ color:C.gray100 }} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:11, color:C.gray500 }}>{r.imei2 || "—"}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:6, background:C.purpleBg, color:C.purple }}>{r.lote}</span>
                    </td>
                    <td style={{ padding:"9px 12px" }}><EstadoBadge estado={r.estado} /></td>
                    <td style={{ padding:"9px 12px", fontSize:11, color:r.clienteNombre ? C.gray900 : C.gray300 }}>
                      {r.clienteNombre || "—"}
                    </td>
                    <td style={{ padding:"9px 12px", fontSize:11, color:C.gray100 }}>{fmtFecha(r.fechaIngreso)}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <select value={r.estado} onChange={e => onCambiarEstado(r.id, e.target.value as RegistroIMEI["estado"])}
                        style={{ padding:"3px 6px", borderRadius:7, border:`1px solid ${C.gray200}`, fontSize:10, color:C.gray700, outline:"none", background:C.white, cursor:"pointer" }}>
                        <option value="disponible">Disponible</option>
                        <option value="reservado">Reservado</option>
                        <option value="vendido">Vendido</option>
                        <option value="garantia">Garantía</option>
                        <option value="defectuoso">Defectuoso</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize:11, color:C.gray100, textAlign:"center" }}>
            Mostrando {filtrados.length} de {grupo.total} IMEIs
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MODAL ASIGNAR IMEIs A PEDIDO
   — con búsqueda en tiempo real de pedidos
══════════════════════════════════════ */
interface PedidoResumen {
  id: string;
  numero: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  clienteRut: string;
  empresa: string;
  direccion: string;
  estado: string;
  total: number;
  itemProducto: any | null;
  tipoCompra: "caja" | "unidad" | null;
  cantidadCajas: number;
  cantidadUnidades: number;
  unidadesPorCaja: number;
  items: any[];
}

function ModalAsignar({ grupo, onClose, onAsignar }: {
  grupo: GrupoProducto;
  onClose: () => void;
  onAsignar: (ids: string[], pedidoId: string, clienteNombre: string) => void;
}) {
  const [busquedaPedido,  setBusquedaPedido]  = useState("");
  const [pedidosDB,       setPedidosDB]       = useState<PedidoResumen[]>([]);
  const [buscando,        setBuscando]        = useState(false);
  const [pedidoSel,       setPedidoSel]       = useState<PedidoResumen | null>(null);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [cantidad,        setCantidad]        = useState(1);
  const [seleccionados,   setSeleccionados]   = useState<string[]>([]);
  const [modoAuto,        setModoAuto]        = useState(true);
  const [saving,          setSaving]          = useState(false);

  const disponibles = grupo.imeis.filter(r => r.estado === "disponible");

  /* ── Cargar pedidos en tiempo real ── */
  useEffect(() => {
    setBuscando(true);
    const q = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => {
        const data  = d.data();
        const items: any[] = data.items || [];

        // Buscar el item que coincide con este producto
        const itemProducto = items.find((it: any) =>
          it.productoId === grupo.productoId ||
          it.id         === grupo.productoId ||
          it.idOriginal === grupo.productoId ||
          (it.sku && it.sku === grupo.sku)
        ) || null;

        // Detectar tipo de compra y calcular unidades correctamente
        const tipoCompra: "caja" | "unidad" | null = itemProducto
          ? (itemProducto.tipoCompra || (itemProducto.id?.includes("-caja") ? "caja" : "unidad"))
          : null;

        const udsPorCaja    = Number(itemProducto?.unidadesPorCaja || itemProducto?.unidades_por_caja || grupo.imeis[0]?.garantiaMeses || 1);
        const cantPedida    = Number(itemProducto?.cantidad) || 0;
        const cantidadCajas = tipoCompra === "caja" ? cantPedida : 0;
        // Si compró por caja → IMEIs = cajas × uds_por_caja
        // Si compró por unidad → IMEIs = cantidad directa
        const cantidadUnidades = tipoCompra === "caja"
          ? cantPedida * (Number(itemProducto?.unidadesPorCaja || itemProducto?.unidades_por_caja) || 10)
          : cantPedida;

        return {
          id:               d.id,
          numero:           data.numero || data.numeroPedido || `#${d.id.slice(-8).toUpperCase()}`,
          clienteNombre:    data.clienteNombre || data.cliente || "",
          clienteEmail:     data.clienteEmail  || data.email   || "",
          clienteTelefono:  data.clienteTelefono || data.telefono || "",
          clienteRut:       data.clienteRut || data.datosEnvio?.ruc || "",
          empresa:          data.datosEnvio?.razonSocial || data.empresa || data.clienteEmpresa || data.clienteNombre || "",
          direccion:        data.clienteDireccion || data.datosEnvio?.direccion || "",
          estado:           data.estado || "PENDIENTE",
          total:            Number(data.total) || 0,
          itemProducto,
          tipoCompra,
          cantidadCajas,
          cantidadUnidades,
          unidadesPorCaja:  Number(itemProducto?.unidadesPorCaja || itemProducto?.unidades_por_caja) || 10,
          items,
        } as PedidoResumen;
      });
      setPedidosDB(docs);
      setBuscando(false);
    });
    return () => unsub();
  }, [grupo.productoId, grupo.sku]);

  /* ── Filtrar ── */
  const pedidosFiltrados = useMemo(() => {
    if (!busquedaPedido.trim()) return pedidosDB.slice(0, 8);
    const t = busquedaPedido.toLowerCase();
    return pedidosDB.filter(p =>
      p.numero.toLowerCase().includes(t)        ||
      p.clienteNombre.toLowerCase().includes(t) ||
      p.empresa.toLowerCase().includes(t)       ||
      p.clienteEmail.toLowerCase().includes(t)  ||
      p.clienteRut.includes(t)                  ||
      p.id.toLowerCase().includes(t)
    ).slice(0, 8);
  }, [pedidosDB, busquedaPedido]);

  /* ── Seleccionar pedido → autocompleta cantidad ── */
  const seleccionarPedido = (p: PedidoResumen) => {
    setPedidoSel(p);
    setBusquedaPedido(p.numero);
    setShowDropdown(false);
    // Usar las unidades totales del pedido (respetando disponibles)
    const cantAuto = Math.min(
      Math.max(p.cantidadUnidades || p.cantidadCajas || 1, 1),
      disponibles.length
    );
    setCantidad(cantAuto);
  };

  /* ── Auto-seleccionar IMEIs ── */
  useEffect(() => {
    if (modoAuto) {
      setSeleccionados(disponibles.slice(0, Math.min(cantidad, disponibles.length)).map(r => r.id));
    }
  }, [cantidad, modoAuto]);

  const handleAsignar = async () => {
    if (seleccionados.length === 0) { alert("No hay IMEIs seleccionados"); return; }
    if (!pedidoSel) { alert("Selecciona un pedido de la lista"); return; }
    setSaving(true);
    try {
      const nombre = pedidoSel.empresa || pedidoSel.clienteNombre || pedidoSel.clienteEmail;
      await onAsignar(seleccionados, pedidoSel.id, nombre);
      onClose();
    } finally { setSaving(false); }
  };

  const estadoColor: Record<string, { bg: string; color: string }> = {
    Pendiente:    { bg:"#fffbeb", color:"#b45309" },
    PENDIENTE:    { bg:"#fffbeb", color:"#b45309" },
    Pagado:       { bg:"#eff6ff", color:"#1d4ed8" },
    PAGADO:       { bg:"#eff6ff", color:"#1d4ed8" },
    "EN PROCESO": { bg:C.purpleBg, color:C.purple  },
    "En Proceso": { bg:C.purpleBg, color:C.purple  },
    ENVIADO:      { bg:"#f0f9ff", color:"#0369a1" },
    Enviado:      { bg:"#f0f9ff", color:"#0369a1" },
    ENTREGADO:    { bg:C.greenBg,  color:C.greenDark },
    Entregado:    { bg:C.greenBg,  color:C.greenDark },
    CANCELADO:    { bg:C.redBg,    color:C.red       },
    Cancelado:    { bg:C.redBg,    color:C.red       },
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:80, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto", border:`1px solid ${C.gray200}`, boxShadow:"0 24px 80px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${C.gray100}`, position:"sticky", top:0, background:C.white, zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${C.purple}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <ShoppingBag size={18} style={{ color:C.purple }} />
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:C.gray900 }}>Asignar IMEIs a Pedido</h3>
              <p style={{ margin:0, fontSize:12, color:C.gray500 }}>{grupo.productoNombre} · {grupo.color} {grupo.almacenamiento}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:`1px solid ${C.gray200}`, background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} style={{ color:C.gray500 }} />
          </button>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* IMEIs disponibles */}
          <div style={{ padding:"12px 16px", borderRadius:12, background:C.greenBg, border:`1px solid ${C.greenBorder}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, color:C.greenDark, fontWeight:600 }}>IMEIs disponibles para asignar</span>
            <span style={{ fontSize:20, fontWeight:900, color:C.greenDark }}>{disponibles.length}</span>
          </div>

          {/* ── BUSCADOR DE PEDIDOS ── */}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>
              Buscar pedido *
            </label>
            <div style={{ position:"relative" }}>
              <div style={{ position:"relative" }}>
                <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.gray300, pointerEvents:"none" }} />
                <input
                  value={busquedaPedido}
                  onChange={e => {
                    setBusquedaPedido(e.target.value);
                    setPedidoSel(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Escribe N° pedido, cliente, empresa o email..."
                  style={{ width:"100%", paddingLeft:36, paddingRight:pedidoSel?36:12, paddingTop:10, paddingBottom:10, borderRadius:11, border:`1.5px solid ${pedidoSel ? C.greenDark : C.gray200}`, fontSize:13, outline:"none", color:C.gray900, transition:"border-color .2s" }}
                  onKeyDown={e => { if (e.key==="Escape") setShowDropdown(false); }}
                />
                {pedidoSel && (
                  <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)" }}>
                    <CheckCircle size={16} style={{ color:C.greenDark }} />
                  </div>
                )}
              </div>

              {/* Dropdown resultados */}
              {showDropdown && !pedidoSel && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:C.white, borderRadius:14, border:`1.5px solid ${C.gray200}`, boxShadow:"0 12px 40px rgba(0,0,0,0.12)", zIndex:20, overflow:"hidden", maxHeight:280, overflowY:"auto" }}>
                  {buscando ? (
                    <div style={{ padding:"16px", textAlign:"center", fontSize:12, color:C.gray500 }}>
                      Cargando pedidos...
                    </div>
                  ) : pedidosFiltrados.length === 0 ? (
                    <div style={{ padding:"16px", textAlign:"center", fontSize:12, color:C.gray100 }}>
                      No se encontraron pedidos
                    </div>
                  ) : (
                    <>
                      <div style={{ padding:"8px 12px 4px", fontSize:10, fontWeight:700, color:C.gray100, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                        {busquedaPedido ? `${pedidosFiltrados.length} resultado(s)` : "Pedidos recientes"}
                      </div>
                      {pedidosFiltrados.map(p => {
                        const ecfg = estadoColor[p.estado] || { bg:C.gray100, color:C.gray500 };
                        const imeisRequeridos = p.tipoCompra === "caja" ? p.cantidadUnidades : p.cantidadCajas || p.cantidadUnidades;
                        return (
                          <button key={p.id}
                            onClick={() => seleccionarPedido(p)}
                            style={{ width:"100%", display:"flex", alignItems:"flex-start", gap:12, padding:"10px 14px", border:"none", background:"transparent", cursor:"pointer", textAlign:"left", borderBottom:`1px solid ${C.gray100}`, transition:"background .1s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = `${C.purple}06`)}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <div style={{ width:36, height:36, borderRadius:10, background:ecfg.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1px solid ${ecfg.color}30` }}>
                              <ShoppingBag size={15} style={{ color:ecfg.color }} />
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                                <span style={{ fontSize:13, fontWeight:800, color:C.purple }}>{p.numero}</span>
                                <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:20, background:ecfg.bg, color:ecfg.color }}>{p.estado}</span>
                              </div>
                              <p style={{ margin:0, fontSize:12, color:C.gray700, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                {p.empresa || p.clienteNombre || p.clienteEmail}
                              </p>
                              {p.clienteRut && (
                                <p style={{ margin:"1px 0 0", fontSize:10, color:C.gray100 }}>RUC: {p.clienteRut}</p>
                              )}
                            </div>
                            {/* Resumen compra */}
                            {p.itemProducto && (
                              <div style={{ flexShrink:0, textAlign:"right" }}>
                                <p style={{ margin:0, fontSize:11, fontWeight:800, color:C.purple }}>
                                  {p.tipoCompra === "caja"
                                    ? `${p.cantidadCajas} caja${p.cantidadCajas !== 1 ? "s" : ""}`
                                    : `${p.cantidadUnidades} uds`}
                                </p>
                                <p style={{ margin:"1px 0 0", fontSize:9, color:C.gray100 }}>
                                  {p.tipoCompra === "caja" ? `→ ${p.cantidadUnidades} IMEIs` : "→ IMEIs directo"}
                                </p>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── PEDIDO SELECCIONADO — tarjeta completa ── */}
          {pedidoSel && (
            <div style={{ borderRadius:14, border:`2px solid ${C.greenBorder}`, overflow:"hidden" }}>
              {/* Header tarjeta */}
              <div style={{ padding:"10px 16px", background:C.greenBg, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <CheckCircle size={15} style={{ color:C.greenDark }} />
                  <span style={{ fontSize:13, fontWeight:800, color:C.greenDark }}>Pedido encontrado</span>
                  <span style={{ fontSize:11, fontWeight:600, color:C.greenDark, opacity:.7 }}>{pedidoSel.numero}</span>
                </div>
                <button onClick={() => { setPedidoSel(null); setBusquedaPedido(""); setShowDropdown(false); }}
                  style={{ width:24, height:24, borderRadius:6, border:`1px solid ${C.greenBorder}`, background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <X size={12} style={{ color:C.greenDark }} />
                </button>
              </div>

              {/* Datos del cliente */}
              <div style={{ padding:"14px 16px", background:"#fafffe", borderBottom:`1px solid ${C.gray100}` }}>
                <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:"0.1em" }}>Datos del Cliente</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["Razón Social / Empresa", pedidoSel.empresa || pedidoSel.clienteNombre],
                    ["RUC / DNI",              pedidoSel.clienteRut || "—"],
                    ["Email",                  pedidoSel.clienteEmail || "—"],
                    ["Teléfono",               pedidoSel.clienteTelefono || "—"],
                    ["Estado pedido",          pedidoSel.estado],
                    ["Dirección",              pedidoSel.direccion || "—"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p style={{ margin:0, fontSize:9, fontWeight:700, color:C.gray100, textTransform:"uppercase" }}>{k}</p>
                      <p style={{ margin:"1px 0 0", fontSize:12, fontWeight:600, color:k === "Estado pedido" ? (estadoColor[pedidoSel.estado]?.color || C.gray900) : C.gray900 }}>{v || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose compra → IMEIs */}
              <div style={{ padding:"12px 16px", background:C.white }}>
                <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:"0.1em" }}>
                  Resumen de compra → IMEIs a asignar
                </p>
                {pedidoSel.itemProducto ? (
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    {pedidoSel.tipoCompra === "caja" ? (
                      <>
                        <div style={{ padding:"8px 14px", borderRadius:10, background:C.orangeBg, border:`1px solid ${C.orangeBorder}`, textAlign:"center" }}>
                          <p style={{ margin:0, fontSize:18, fontWeight:900, color:C.orange }}>{pedidoSel.cantidadCajas}</p>
                          <p style={{ margin:0, fontSize:10, fontWeight:700, color:C.orange }}>caja{pedidoSel.cantidadCajas !== 1 ? "s" : ""}</p>
                        </div>
                        <span style={{ fontSize:18, color:C.gray300, fontWeight:300 }}>×</span>
                        <div style={{ padding:"8px 14px", borderRadius:10, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, textAlign:"center" }}>
                          <p style={{ margin:0, fontSize:18, fontWeight:900, color:C.purple }}>{pedidoSel.unidadesPorCaja}</p>
                          <p style={{ margin:0, fontSize:10, fontWeight:700, color:C.purple }}>uds/caja</p>
                        </div>
                        <span style={{ fontSize:18, color:C.gray300, fontWeight:300 }}>=</span>
                        <div style={{ padding:"8px 14px", borderRadius:10, background:C.greenBg, border:`2px solid ${C.greenBorder}`, textAlign:"center" }}>
                          <p style={{ margin:0, fontSize:20, fontWeight:900, color:C.greenDark }}>{pedidoSel.cantidadUnidades}</p>
                          <p style={{ margin:0, fontSize:10, fontWeight:800, color:C.greenDark }}>IMEIs a asignar</p>
                        </div>
                      </>
                    ) : (
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ padding:"8px 14px", borderRadius:10, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, textAlign:"center" }}>
                          <p style={{ margin:0, fontSize:18, fontWeight:900, color:C.purple }}>{pedidoSel.cantidadUnidades}</p>
                          <p style={{ margin:0, fontSize:10, fontWeight:700, color:C.purple }}>unidades</p>
                        </div>
                        <span style={{ fontSize:18, color:C.gray300 }}>→</span>
                        <div style={{ padding:"8px 14px", borderRadius:10, background:C.greenBg, border:`2px solid ${C.greenBorder}`, textAlign:"center" }}>
                          <p style={{ margin:0, fontSize:20, fontWeight:900, color:C.greenDark }}>{pedidoSel.cantidadUnidades}</p>
                          <p style={{ margin:0, fontSize:10, fontWeight:800, color:C.greenDark }}>IMEIs a asignar</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize:12, color:C.gray100, margin:0 }}>Este pedido no contiene el producto "{grupo.productoNombre}". Verifica antes de asignar.</p>
                )}
              </div>
            </div>
          )}

          {/* ── CANTIDAD ── */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray700 }}>Cantidad a asignar</label>
              {pedidoSel && pedidoSel.cantidadUnidades > 0 && cantidad !== pedidoSel.cantidadUnidades && (
                <button onClick={() => setCantidad(Math.min(pedidoSel.cantidadUnidades, disponibles.length))}
                  style={{ fontSize:11, fontWeight:700, color:C.purple, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, borderRadius:8, padding:"3px 10px", cursor:"pointer" }}>
                  Usar cantidad del pedido ({pedidoSel.cantidadUnidades} IMEIs)
                </button>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {/* − */}
              <button onClick={() => setCantidad(c => Math.max(1, c - 1))} disabled={cantidad <= 1}
                style={{ width:38, height:38, borderRadius:10, border:`1.5px solid ${C.gray200}`, background:C.gray100, fontSize:18, fontWeight:900, cursor:cantidad<=1?"not-allowed":"pointer", color:cantidad<=1?C.gray300:C.gray700, display:"flex", alignItems:"center", justifyContent:"center" }}>
                −
              </button>
              <input type="number" min={1} max={disponibles.length} value={cantidad}
                onChange={e => setCantidad(Math.min(disponibles.length, Math.max(1, Number(e.target.value))))}
                style={{ width:90, padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:18, fontWeight:900, textAlign:"center", outline:"none", color:C.gray900 }}
                onFocus={e => { e.target.style.borderColor = C.purple; }}
                onBlur={e => { e.target.style.borderColor = C.gray200; }}
              />
              {/* + */}
              <button onClick={() => setCantidad(c => Math.min(disponibles.length, c + 1))} disabled={cantidad >= disponibles.length}
                style={{ width:38, height:38, borderRadius:10, border:`1.5px solid ${C.gray200}`, background:C.gray100, fontSize:18, fontWeight:900, cursor:cantidad>=disponibles.length?"not-allowed":"pointer", color:cantidad>=disponibles.length?C.gray300:C.gray700, display:"flex", alignItems:"center", justifyContent:"center" }}>
                +
              </button>
              <span style={{ fontSize:12, color:C.gray500 }}>
                de <strong style={{ color:C.greenDark }}>{disponibles.length}</strong> disponibles
              </span>
            </div>
            {cantidad > disponibles.length && (
              <p style={{ margin:"4px 0 0", fontSize:11, color:C.red, fontWeight:600 }}>
                ⚠ Solo hay {disponibles.length} IMEIs disponibles
              </p>
            )}
          </div>

          {/* ── MODO SELECCIÓN ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[["auto","🤖 Automático","El sistema elige los primeros disponibles"],["manual","✋ Manual","Elige tú cuáles IMEI asignar"]].map(([modo, titulo, desc]) => (
              <button key={modo} onClick={() => setModoAuto(modo === "auto")}
                style={{ padding:"11px 12px", borderRadius:12, border:`2px solid ${modoAuto===(modo==="auto")?C.purple:C.gray200}`, background:modoAuto===(modo==="auto")?C.purpleBg:C.white, cursor:"pointer", textAlign:"left" }}>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:modoAuto===(modo==="auto")?C.purple:C.gray700 }}>{titulo}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:C.gray500 }}>{desc}</p>
              </button>
            ))}
          </div>

          {/* ── PREVIEW IMEIs ── */}
          {!modoAuto ? (
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:C.gray700, marginBottom:8 }}>
                Selecciona los IMEIs ({seleccionados.length} de {cantidad} requeridos)
              </p>
              <div style={{ border:`1px solid ${C.gray200}`, borderRadius:12, maxHeight:220, overflowY:"auto" }}>
                {disponibles.map(r => {
                  const sel = seleccionados.includes(r.id);
                  return (
                    <div key={r.id}
                      onClick={() => {
                        if (sel) setSeleccionados(prev => prev.filter(id => id !== r.id));
                        else if (seleccionados.length < cantidad) setSeleccionados(prev => [...prev, r.id]);
                      }}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", cursor:"pointer", background:sel?`${C.purple}08`:C.white, borderBottom:`1px solid ${C.gray100}`, transition:"background .1s" }}>
                      <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${sel?C.purple:C.gray300}`, background:sel?C.purple:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                        {sel && <Check size={11} color={C.white} />}
                      </div>
                      <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:600, color:C.gray900, flex:1 }}>{r.imei}</span>
                      {r.imei2 && <span style={{ fontFamily:"monospace", fontSize:10, color:C.gray100 }}>SIM2: {r.imei2}</span>}
                      <span style={{ fontSize:10, color:C.gray100 }}>{r.lote}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding:"12px 16px", borderRadius:12, background:C.purpleBg, border:`1px solid ${C.purpleBorder}` }}>
              <p style={{ margin:0, fontSize:13, color:C.purple, fontWeight:600 }}>
                Se asignarán automáticamente los primeros <strong>{Math.min(cantidad, disponibles.length)}</strong> IMEIs disponibles
              </p>
              <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:5 }}>
                {disponibles.slice(0, Math.min(cantidad, 6)).map(r => (
                  <span key={r.id} style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:C.purple, padding:"2px 7px", borderRadius:6, background:C.white, border:`1px solid ${C.purpleBorder}` }}>
                    {r.imei}
                  </span>
                ))}
                {cantidad > 6 && (
                  <span style={{ fontSize:10, color:C.gray500, padding:"2px 7px", borderRadius:6, background:C.white, border:`1px solid ${C.gray200}` }}>
                    +{Math.min(cantidad, disponibles.length) - 6} más
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── BOTONES ── */}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose}
              style={{ flex:1, padding:"11px", borderRadius:11, border:`1px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:600, color:C.gray700, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={handleAsignar}
              disabled={saving || seleccionados.length === 0 || !pedidoSel}
              style={{ flex:2, padding:"11px", borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", opacity:saving||seleccionados.length===0||!pedidoSel?0.5:1, boxShadow:`0 4px 14px ${C.purple}40` }}>
              {saving ? "Asignando..." : `✓ Asignar ${seleccionados.length} IMEI${seleccionados.length!==1?"s":""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MODAL REGISTRAR IMEI (lote rápido)
══════════════════════════════════════ */
function ModalRegistrar({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [productos,  setProductos]  = useState<Producto[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [modo,       setModo]       = useState<"uno" | "lote">("lote");
  const [loteTexto,  setLoteTexto]  = useState("");
  const [preview,    setPreview]    = useState<{ imei:string; imei2:string; valido:boolean }[]>([]);
  const [step,       setStep]       = useState<1 | 2>(1);

  const [form, setForm] = useState({
    imei:"", imei2:"", productoId:"", productoNombre:"", sku:"",
    marca:"", modelo:"", color:"", almacenamiento:"",
    lote:`LOTE-${new Date().toISOString().slice(0,7)}`,
    garantiaMeses:12, notas:"",
  });

  useEffect(() => {
    getDocs(collection(db, "productos")).then(snap =>
      setProductos(snap.docs.map(d => ({ id:d.id, ...d.data() } as Producto)))
    );
  }, []);

  const validate = (s: string) => /^\d{15}$/.test(s.replace(/\s/g,""));

  const selectProd = (p: Producto) => setForm(f => ({
    ...f, productoId:p.id,
    productoNombre: p.nombre_producto || p.nombre || "",
    sku: p.sku || "", marca: p.marca || "", modelo: p.modelo || "",
    color: p.color || "", almacenamiento: p.capacidad_almacenamiento || "",
    garantiaMeses: p.garantia_meses || 12,
  }));

  const parseLote = () =>
    loteTexto.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const [i1, i2] = l.split(",").map(x => x.trim());
      return { imei:i1||"", imei2:i2||"", valido:validate(i1||"") };
    });

  const handlePreview = () => {
    if (!form.productoId) { alert("Selecciona un producto"); return; }
    const p = parseLote();
    if (p.length === 0) { alert("Ingresa al menos un IMEI"); return; }
    setPreview(p); setStep(2);
  };

  const handleSave = async () => {
    if (!form.productoId) { alert("Selecciona un producto"); return; }
    setSaving(true);
    try {
      if (modo === "uno") {
        if (!validate(form.imei)) { alert("IMEI inválido"); setSaving(false); return; }
        await addDoc(collection(db, "imeis"), { ...form, estado:"disponible", fechaIngreso:serverTimestamp() });
      } else {
        const validos = preview.filter(p => p.valido);
        if (validos.length === 0) { alert("Sin IMEIs válidos"); setSaving(false); return; }
        const batch = writeBatch(db);
        validos.forEach(p => {
          const ref = doc(collection(db, "imeis"));
          batch.set(ref, { ...form, imei:p.imei, imei2:p.imei2, estado:"disponible", fechaIngreso:serverTimestamp() });
        });
        await batch.commit();
      }
      onSaved(); onClose();
    } catch { alert("Error al guardar"); }
    finally { setSaving(false); }
  };

  const validCount   = preview.filter(p => p.valido).length;
  const invalidCount = preview.filter(p => !p.valido).length;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:70, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:20, overflowY:"auto" }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:580, border:`1px solid ${C.gray200}`, boxShadow:"0 24px 80px rgba(0,0,0,0.2)", marginTop:20 }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${C.gray100}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:C.purpleBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Plus size={18} style={{ color:C.purple }} />
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:C.gray900 }}>
                {step === 1 ? "Registrar IMEIs" : `Vista previa — ${preview.length} IMEIs`}
              </h3>
              <p style={{ margin:0, fontSize:11, color:C.gray500 }}>
                {step === 2 ? `${validCount} válidos · ${invalidCount} inválidos` : "Ingreso de inventario"}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:`1px solid ${C.gray200}`, background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} style={{ color:C.gray500 }} />
          </button>
        </div>

        {step === 1 ? (
          <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
            {/* Modo */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {([["uno","📱 Individual"],["lote","📦 Por lote"]] as const).map(([m,l]) => (
                <button key={m} onClick={() => setModo(m)}
                  style={{ padding:"10px", borderRadius:11, border:`2px solid ${modo===m?C.purple:C.gray200}`, background:modo===m?C.purpleBg:C.white, fontSize:13, fontWeight:700, color:modo===m?C.purple:C.gray700, cursor:"pointer" }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Producto */}
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Modelo / Producto *</label>
              <select value={form.productoId} onChange={e => { const p = productos.find(x => x.id===e.target.value); if(p) selectProd(p); }}
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white }}>
                <option value="">— Selecciona modelo —</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre_producto||p.nombre}</option>)}
              </select>
            </div>

            {form.productoId && (
              <div style={{ padding:"10px 14px", borderRadius:10, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, display:"flex", flexWrap:"wrap", gap:10 }}>
                {[["Marca",form.marca],["Color",form.color],["Almac.",form.almacenamiento]].map(([k,v]) => v ? (
                  <span key={k} style={{ fontSize:12, color:C.gray700 }}><strong style={{ color:C.purple }}>{k}:</strong> {v}</span>
                ) : null)}
              </div>
            )}

            {modo === "uno" ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>IMEI 1 * (15 dígitos)</label>
                  <input value={form.imei} onChange={e => setForm(f => ({...f, imei:e.target.value.replace(/\D/g,"").slice(0,15)}))}
                    placeholder="353456789012345"
                    style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${form.imei&&!validate(form.imei)?C.red:form.imei&&validate(form.imei)?C.greenDark:C.gray200}`, fontSize:13, fontFamily:"monospace", outline:"none", color:C.gray900 }}
                  />
                  {form.imei && <p style={{ margin:"3px 0 0", fontSize:11, color:validate(form.imei)?C.greenDark:C.red }}>{validate(form.imei)?"✓ Válido":`Faltan ${15-form.imei.length} dígitos`}</p>}
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>IMEI 2 (dual SIM)</label>
                  <input value={form.imei2} onChange={e => setForm(f => ({...f, imei2:e.target.value.replace(/\D/g,"").slice(0,15)}))}
                    placeholder="Opcional"
                    style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, fontFamily:"monospace", outline:"none", color:C.gray900 }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray700 }}>Lista de IMEIs *</label>
                  <span style={{ fontSize:11, color:C.gray500 }}>{loteTexto.split("\n").filter(l=>l.trim()).length} líneas</span>
                </div>
                <textarea value={loteTexto} onChange={e => setLoteTexto(e.target.value)} rows={8}
                  placeholder={"Un IMEI por línea:\n353456789012345\n353456789012346\n\nDual SIM con coma:\n353456789012347,353456789012348"}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:12, fontFamily:"monospace", outline:"none", resize:"vertical", color:C.gray900, lineHeight:1.6 }}
                />
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Nombre del lote</label>
                <input value={form.lote} onChange={e => setForm(f=>({...f,lote:e.target.value}))}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none", color:C.gray900 }}
                />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Garantía</label>
                <select value={form.garantiaMeses} onChange={e => setForm(f=>({...f,garantiaMeses:Number(e.target.value)}))}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none", color:C.gray900, background:C.white }}>
                  {[3,6,12,18,24].map(m => <option key={m} value={m}>{m} meses</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:11, border:`1px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:600, color:C.gray700, cursor:"pointer" }}>Cancelar</button>
              {modo === "lote"
                ? <button onClick={handlePreview} style={{ flex:2, padding:"11px", borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 14px ${C.purple}40` }}>Vista previa →</button>
                : <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:"11px", borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Guardando...":"Registrar IMEI"}</button>
              }
            </div>
          </div>
        ) : (
          <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { l:"Total",    v:preview.length,  bg:C.purpleBg, c:C.purple,   b:C.purpleBorder },
                { l:"✓ Válidos",v:validCount,       bg:C.greenBg,  c:C.greenDark,b:C.greenBorder  },
                { l:"⚠ Inválidos",v:invalidCount,   bg:C.redBg,    c:C.red,      b:C.redBorder    },
              ].map(s => (
                <div key={s.l} style={{ padding:"10px 12px", borderRadius:10, background:s.bg, border:`1px solid ${s.b}`, textAlign:"center" }}>
                  <p style={{ margin:0, fontSize:10, fontWeight:700, color:s.c, textTransform:"uppercase" }}>{s.l}</p>
                  <p style={{ margin:"3px 0 0", fontSize:20, fontWeight:900, color:s.c }}>{s.v}</p>
                </div>
              ))}
            </div>
            <div style={{ border:`1px solid ${C.gray200}`, borderRadius:12, overflow:"hidden", maxHeight:260, overflowY:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:C.gray50, borderBottom:`1px solid ${C.gray200}` }}>
                    {["#","IMEI 1","IMEI 2",""].map(h => (
                      <th key={h} style={{ padding:"8px 12px", fontSize:10, fontWeight:700, color:C.gray500, textAlign:"left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.gray100}`, background:!p.valido?C.redBg:C.white }}>
                      <td style={{ padding:"7px 12px", fontSize:11, color:C.gray100 }}>{i+1}</td>
                      <td style={{ padding:"7px 12px", fontFamily:"monospace", fontSize:12, fontWeight:600, color:p.valido?C.gray900:C.red }}>{p.imei}</td>
                      <td style={{ padding:"7px 12px", fontFamily:"monospace", fontSize:11, color:C.gray100 }}>{p.imei2||"—"}</td>
                      <td style={{ padding:"7px 12px" }}>
                        {p.valido ? <CheckCircle size={14} style={{ color:C.greenDark }} /> : <span style={{ fontSize:9, fontWeight:700, color:C.red, padding:"1px 6px", borderRadius:6, background:C.redBg, border:`1px solid ${C.redBorder}` }}>Inválido</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invalidCount > 0 && (
              <div style={{ padding:"10px 14px", borderRadius:10, background:C.redBg, border:`1px solid ${C.redBorder}`, display:"flex", alignItems:"center", gap:8 }}>
                <AlertTriangle size={14} style={{ color:C.red }} />
                <p style={{ margin:0, fontSize:12, color:C.red }}><strong>{invalidCount} inválido(s)</strong> serán ignorados. Solo se guardarán {validCount}.</p>
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(1)} style={{ flex:1, padding:"11px", borderRadius:11, border:`1px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:600, color:C.gray700, cursor:"pointer" }}>← Editar</button>
              <button onClick={handleSave} disabled={saving||validCount===0}
                style={{ flex:2, padding:"11px", borderRadius:11, background:validCount===0?C.gray200:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:validCount===0?C.gray500:C.white, border:"none", fontSize:13, fontWeight:800, cursor:validCount===0?"not-allowed":"pointer", boxShadow:validCount>0?`0 4px 14px ${C.purple}40`:"none" }}>
                {saving ? "Guardando..." : `✓ Registrar ${validCount} IMEI${validCount!==1?"s":""}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PÁGINA PRINCIPAL — 3 VISTAS
═══════════════════════════════════════════════ */
type Vista = "producto" | "lote" | "buscar";

export default function IMEIAdmin() {
  const [registros,     setRegistros]     = useState<RegistroIMEI[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [vista,         setVista]         = useState<Vista>("producto");
  const [showRegistrar, setShowRegistrar] = useState(false);
  const [detalleProd,   setDetalleProd]   = useState<GrupoProducto | null>(null);
  const [asignarProd,   setAsignarProd]   = useState<GrupoProducto | null>(null);
  const [busquedaIMEI,  setBusquedaIMEI]  = useState("");
  const [filtroEstado,  setFiltroEstado]  = useState("todos");
  const [expandedLotes, setExpandedLotes] = useState<Set<string>>(new Set());
  const [toast,         setToast]         = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /* ─── Cargar ─── */
  useEffect(() => {
    const q = query(collection(db, "imeis"), orderBy("fechaIngreso", "desc"));
    const unsub = onSnapshot(q, snap => {
      setRegistros(snap.docs.map(d => ({ id:d.id, ...d.data() } as RegistroIMEI)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ─── Cambiar estado ─── */
  const cambiarEstado = useCallback(async (id: string, estado: RegistroIMEI["estado"]) => {
    await updateDoc(doc(db, "imeis", id), { estado });
    showToast("Estado actualizado");
  }, []);

  /* ─── Asignar IMEIs a pedido ─── */
  const asignarAPedido = useCallback(async (ids: string[], pedidoId: string, clienteNombre: string) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.update(doc(db, "imeis", id), {
        estado: "vendido",
        pedidoId,
        clienteNombre,
        fechaVenta: serverTimestamp(),
      });
    });
    await batch.commit();
    showToast(`✅ ${ids.length} IMEI${ids.length!==1?"s":""} asignados al pedido ${pedidoId}`);
  }, []);

  /* ─── Agrupar por producto ─── */
  const gruposPorProducto = useMemo((): GrupoProducto[] => {
    const mapa = new Map<string, GrupoProducto>();
    registros.forEach(r => {
      const key = r.productoId || r.productoNombre;
      if (!mapa.has(key)) {
        mapa.set(key, {
          productoId: r.productoId, productoNombre: r.productoNombre,
          sku: r.sku, marca: r.marca, color: r.color, almacenamiento: r.almacenamiento,
          disponibles:0, vendidos:0, reservados:0, garantia:0, defectuosos:0, total:0,
          lotes:[], imeis:[],
        });
      }
      const g = mapa.get(key)!;
      g.total++;
      g.imeis.push(r);
      if (!g.lotes.includes(r.lote)) g.lotes.push(r.lote);
      if (r.estado === "disponible")  g.disponibles++;
      if (r.estado === "vendido")     g.vendidos++;
      if (r.estado === "reservado")   g.reservados++;
      if (r.estado === "garantia")    g.garantia++;
      if (r.estado === "defectuoso")  g.defectuosos++;
    });
    return Array.from(mapa.values()).sort((a, b) => b.disponibles - a.disponibles);
  }, [registros]);

  /* ─── Agrupar por lote ─── */
  const gruposPorLote = useMemo((): GrupoLote[] => {
    const mapa = new Map<string, GrupoLote>();
    registros.forEach(r => {
      const key = r.lote;
      if (!mapa.has(key)) {
        mapa.set(key, {
          lote:r.lote, productoNombre:r.productoNombre, marca:r.marca,
          total:0, disponibles:0, vendidos:0, imeis:[], fechaIngreso:r.fechaIngreso,
        });
      }
      const g = mapa.get(key)!;
      g.total++;
      g.imeis.push(r);
      if (r.estado === "disponible") g.disponibles++;
      if (r.estado === "vendido")    g.vendidos++;
    });
    return Array.from(mapa.values()).sort((a, b) => {
      try { return (b.fechaIngreso?.toDate?.()?.getTime()||0) - (a.fechaIngreso?.toDate?.()?.getTime()||0); }
      catch { return 0; }
    });
  }, [registros]);

  /* ─── Vista búsqueda IMEI ─── */
  const resultadosBusqueda = useMemo(() => {
    if (busquedaIMEI.length < 4) return [];
    return registros.filter(r => {
      const matchE = filtroEstado === "todos" ? true : r.estado === filtroEstado;
      const matchS = r.imei.includes(busquedaIMEI) || (r.imei2||"").includes(busquedaIMEI);
      return matchE && matchS;
    });
  }, [registros, busquedaIMEI, filtroEstado]);

  /* ─── Stats globales ─── */
  const stats = useMemo(() => ({
    total:       registros.length,
    disponibles: registros.filter(r=>r.estado==="disponible").length,
    vendidos:    registros.filter(r=>r.estado==="vendido").length,
    garantia:    registros.filter(r=>r.estado==="garantia").length,
    defectuosos: registros.filter(r=>r.estado==="defectuoso").length,
    modelos:     gruposPorProducto.length,
    lotes:       gruposPorLote.length,
  }), [registros, gruposPorProducto, gruposPorLote]);

  const toggleLote = (lote: string) => {
    setExpandedLotes(prev => {
      const next = new Set(prev);
      next.has(lote) ? next.delete(lote) : next.add(lote);
      return next;
    });
  };

  /* ═══ RENDER ═══ */
  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", minHeight:"100vh", background:C.gray50 }} className="dash-in">

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:90, padding:"12px 20px", borderRadius:14, background:C.greenDark, color:C.white, fontSize:13, fontWeight:700, boxShadow:`0 8px 30px rgba(22,163,74,0.4)`, animation:"slideIn .3s ease", display:"flex", alignItems:"center", gap:8 }}>
          <CheckCircle size={15} /> {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.gray200}`, padding:"20px 24px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <Link href="/admin" style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12, color:C.purple, textDecoration:"none", fontWeight:600, marginBottom:6 }}>
            <ArrowLeft size={13} /> Dashboard
          </Link>
          <h1 style={{ fontSize:24, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.03em" }}>Trazabilidad IMEI</h1>
          <p style={{ fontSize:13, color:C.gray500, margin:"3px 0 0" }}>
            {stats.modelos} modelos · {stats.lotes} lotes · {stats.total.toLocaleString()} equipos registrados
          </p>
        </div>
        <button onClick={() => setShowRegistrar(true)}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 20px", borderRadius:12, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 18px ${C.purple}45` }}>
          <Plus size={15} /> Registrar IMEIs
        </button>
      </div>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px" }}>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:24 }}>
          {[
            { l:"Total",       v:stats.total,       bg:C.white,     b:C.gray200,       c:C.gray900,   click:"todos"       },
            { l:"Disponibles", v:stats.disponibles, bg:C.greenBg,   b:C.greenBorder,   c:C.greenDark, click:"disponible"  },
            { l:"Vendidos",    v:stats.vendidos,    bg:C.purpleBg,  b:C.purpleBorder,  c:C.purple,    click:"vendido"     },
            { l:"En Garantía", v:stats.garantia,    bg:C.orangeBg,  b:C.orangeBorder,  c:C.orange,    click:"garantia"    },
            { l:"Defectuosos", v:stats.defectuosos, bg:C.redBg,     b:C.redBorder,     c:C.red,       click:"defectuoso"  },
          ].map(s => (
            <div key={s.l} style={{ background:s.bg, borderRadius:14, padding:"14px 16px", border:`1.5px solid ${s.b}`, cursor:"pointer", transition:"all .15s" }}
              onClick={() => { if (vista !== "buscar") {} }}>
              <p style={{ fontSize:11, fontWeight:700, color:s.c, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.l}</p>
              <p style={{ fontSize:22, fontWeight:900, color:s.c, margin:0 }}>{s.v.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Selector de vista */}
        <div style={{ display:"flex", gap:4, background:C.gray100, borderRadius:14, padding:4, marginBottom:20, width:"fit-content" }}>
          {([
            ["producto", Boxes,       "Por Producto"],
            ["lote",     Layers,      "Por Lote"],
            ["buscar",   Search,      "Buscar IMEI"],
          ] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setVista(v)}
              style={{
                display:"flex", alignItems:"center", gap:7, padding:"9px 18px", borderRadius:10,
                background: vista === v ? C.white : "transparent",
                border: vista === v ? `1px solid ${C.gray200}` : "none",
                color: vista === v ? C.purple : C.gray500,
                fontSize:13, fontWeight: vista === v ? 700 : 500,
                cursor:"pointer", transition:"all .15s",
                boxShadow: vista === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}>
              <Icon size={15} style={{ color: vista === v ? C.purple : C.gray100 }} />
              {label}
            </button>
          ))}
        </div>

        {/* ════ VISTA: POR PRODUCTO ════ */}
        {vista === "producto" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {loading ? (
              [...Array(4)].map((_,i) => (
                <div key={i} style={{ height:80, borderRadius:14, background:C.white, border:`1px solid ${C.gray200}`, animation:"pulse 1.4s ease infinite" }} />
              ))
            ) : gruposPorProducto.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 0" }}>
                <Smartphone size={48} style={{ color:C.gray300, margin:"0 auto 12px", display:"block" }} />
                <p style={{ fontSize:15, fontWeight:700, color:C.gray900, margin:"0 0 4px" }}>Sin IMEIs registrados</p>
                <p style={{ fontSize:13, color:C.gray500, margin:0 }}>Registra el primer lote de equipos</p>
              </div>
            ) : gruposPorProducto.map(g => (
              <div key={g.productoId} style={{ background:C.white, borderRadius:16, border:`1.5px solid ${C.gray200}`, overflow:"hidden", transition:"border-color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${C.purple}40`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.gray200)}>
                <div style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 20px", flexWrap:"wrap" }}>

                  {/* Info producto */}
                  <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:200 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:C.purpleBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Smartphone size={20} style={{ color:C.purple }} />
                    </div>
                    <div>
                      <p style={{ margin:0, fontSize:14, fontWeight:800, color:C.gray900 }}>{g.productoNombre}</p>
                      <p style={{ margin:"2px 0 0", fontSize:11, color:C.gray500 }}>
                        {g.marca} · SKU: {g.sku} · {g.color} {g.almacenamiento}
                      </p>
                    </div>
                  </div>

                  {/* Contadores */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                    {[
                      { v:g.disponibles, l:"disp.",   bg:C.greenBg,   c:C.greenDark, b:C.greenBorder  },
                      { v:g.vendidos,    l:"vend.",   bg:C.purpleBg,  c:C.purple,    b:C.purpleBorder },
                      g.reservados  > 0 ? { v:g.reservados, l:"reserv.", bg:"#fffbeb", c:"#b45309", b:"#fde68a" } : null,
                      g.garantia    > 0 ? { v:g.garantia,   l:"garan.",  bg:C.orangeBg,c:C.orange,  b:C.orangeBorder } : null,
                      g.defectuosos > 0 ? { v:g.defectuosos,l:"defect.", bg:C.redBg,   c:C.red,     b:C.redBorder } : null,
                    ].filter(Boolean).map((s: any) => (
                      <div key={s.l} style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 10px", borderRadius:10, background:s.bg, border:`1px solid ${s.b}`, minWidth:48 }}>
                        <span style={{ fontSize:16, fontWeight:900, color:s.c, lineHeight:1 }}>{s.v}</span>
                        <span style={{ fontSize:9, fontWeight:700, color:s.c, textTransform:"uppercase", marginTop:1 }}>{s.l}</span>
                      </div>
                    ))}
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 10px", borderRadius:10, background:C.gray100, border:`1px solid ${C.gray200}`, minWidth:48 }}>
                      <span style={{ fontSize:16, fontWeight:900, color:C.gray900, lineHeight:1 }}>{g.total}</span>
                      <span style={{ fontSize:9, fontWeight:700, color:C.gray500, textTransform:"uppercase", marginTop:1 }}>total</span>
                    </div>
                  </div>

                  {/* Lotes chips */}
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap", maxWidth:200 }}>
                    {g.lotes.slice(0,3).map(l => (
                      <span key={l} style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:6, background:C.purpleBg, color:C.purple, border:`1px solid ${C.purpleBorder}` }}>
                        {l}
                      </span>
                    ))}
                    {g.lotes.length > 3 && (
                      <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:6, background:C.gray100, color:C.gray500 }}>+{g.lotes.length-3}</span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    {g.disponibles > 0 && (
                      <button onClick={() => setAsignarProd(g)}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, background:`${C.purple}12`, color:C.purple, border:`1px solid ${C.purpleBorder}`, fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg,${C.purple},${C.purpleLight})`; (e.currentTarget as HTMLElement).style.color = C.white; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${C.purple}12`; (e.currentTarget as HTMLElement).style.color = C.purple; }}>
                        <ShoppingBag size={13} /> Asignar pedido
                      </button>
                    )}
                    <button onClick={() => setDetalleProd(g)}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, background:C.gray100, color:C.gray700, border:`1px solid ${C.gray200}`, fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.gray200; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.gray100; }}>
                      <Eye size={13} /> Ver IMEIs
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════ VISTA: POR LOTE ════ */}
        {vista === "lote" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {loading ? (
              [...Array(3)].map((_,i) => <div key={i} style={{ height:70, borderRadius:14, background:C.white, border:`1px solid ${C.gray200}`, animation:"pulse 1.4s ease infinite" }} />)
            ) : gruposPorLote.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 0" }}>
                <Package size={48} style={{ color:C.gray300, margin:"0 auto 12px", display:"block" }} />
                <p style={{ fontSize:15, fontWeight:700, color:C.gray500 }}>Sin lotes registrados</p>
              </div>
            ) : gruposPorLote.map(g => {
              const expanded = expandedLotes.has(g.lote);
              return (
                <div key={g.lote} style={{ background:C.white, borderRadius:16, border:`1.5px solid ${C.gray200}`, overflow:"hidden" }}>
                  {/* Cabecera lote */}
                  <button onClick={() => toggleLote(g.lote)}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left" }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:`${C.orange}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Package size={17} style={{ color:C.orange }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:14, fontWeight:800, color:C.gray900 }}>{g.lote}</p>
                      <p style={{ margin:"2px 0 0", fontSize:11, color:C.gray500 }}>
                        {g.productoNombre} · Ingreso: {fmtFecha(g.fechaIngreso)}
                      </p>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ padding:"4px 10px", borderRadius:20, background:C.greenBg, border:`1px solid ${C.greenBorder}` }}>
                        <span style={{ fontSize:12, fontWeight:800, color:C.greenDark }}>{g.disponibles} disp.</span>
                      </div>
                      <div style={{ padding:"4px 10px", borderRadius:20, background:C.purpleBg, border:`1px solid ${C.purpleBorder}` }}>
                        <span style={{ fontSize:12, fontWeight:800, color:C.purple }}>{g.vendidos} vend.</span>
                      </div>
                      <div style={{ padding:"4px 10px", borderRadius:20, background:C.gray100, border:`1px solid ${C.gray200}` }}>
                        <span style={{ fontSize:12, fontWeight:800, color:C.gray900 }}>{g.total} total</span>
                      </div>
                      {expanded ? <ChevronDown size={16} style={{ color:C.gray100 }} /> : <ChevronRight size={16} style={{ color:C.gray100 }} />}
                    </div>
                  </button>

                  {/* Lista IMEIs del lote */}
                  {expanded && (
                    <div style={{ borderTop:`1px solid ${C.gray100}`, maxHeight:300, overflowY:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse" }}>
                        <thead>
                          <tr style={{ background:C.gray50 }}>
                            {["#","IMEI 1","IMEI 2","Estado","Cliente","Acción"].map(h => (
                              <th key={h} style={{ padding:"8px 14px", fontSize:10, fontWeight:700, color:C.gray500, textAlign:"left", textTransform:"uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {g.imeis.map((r, i) => (
                            <tr key={r.id} style={{ borderBottom:`1px solid ${C.gray100}` }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#faf9ff")}
                              onMouseLeave={e => (e.currentTarget.style.background = C.white)}>
                              <td style={{ padding:"8px 14px", fontSize:11, color:C.gray100 }}>{i+1}</td>
                              <td style={{ padding:"8px 14px", fontFamily:"monospace", fontSize:12, fontWeight:600, color:C.gray900 }}>{r.imei}</td>
                              <td style={{ padding:"8px 14px", fontFamily:"monospace", fontSize:11, color:C.gray100 }}>{r.imei2||"—"}</td>
                              <td style={{ padding:"8px 14px" }}><EstadoBadge estado={r.estado} /></td>
                              <td style={{ padding:"8px 14px", fontSize:11, color:r.clienteNombre?C.gray900:C.gray300 }}>{r.clienteNombre||"—"}</td>
                              <td style={{ padding:"8px 14px" }}>
                                <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value as RegistroIMEI["estado"])}
                                  style={{ padding:"3px 6px", borderRadius:7, border:`1px solid ${C.gray200}`, fontSize:10, color:C.gray700, outline:"none", background:C.white, cursor:"pointer" }}>
                                  <option value="disponible">Disponible</option>
                                  <option value="reservado">Reservado</option>
                                  <option value="vendido">Vendido</option>
                                  <option value="garantia">Garantía</option>
                                  <option value="defectuoso">Defectuoso</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════ VISTA: BUSCAR IMEI ════ */}
        {vista === "buscar" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ background:C.white, borderRadius:16, padding:"20px 24px", border:`1.5px solid ${C.gray200}` }}>
              <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:700, color:C.gray700 }}>
                🔍 Busca cualquier IMEI — ideal para garantías y reclamos
              </p>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1, position:"relative" }}>
                  <Hash size={15} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:C.gray300, pointerEvents:"none" }} />
                  <input value={busquedaIMEI} onChange={e => setBusquedaIMEI(e.target.value)}
                    placeholder="Ingresa IMEI completo o parcial (mín 4 dígitos)..."
                    style={{ width:"100%", paddingLeft:40, paddingRight:16, paddingTop:11, paddingBottom:11, borderRadius:12, border:`2px solid ${busquedaIMEI.length>=4?C.purple:C.gray200}`, fontSize:14, fontFamily:"monospace", outline:"none", color:C.gray900, transition:"border-color .2s" }}
                  />
                </div>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                  style={{ padding:"11px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:13, color:C.gray700, outline:"none", background:C.white, minWidth:160 }}>
                  <option value="todos">Todos los estados</option>
                  <option value="disponible">Disponible</option>
                  <option value="vendido">Vendido</option>
                  <option value="reservado">Reservado</option>
                  <option value="garantia">Garantía</option>
                  <option value="defectuoso">Defectuoso</option>
                </select>
              </div>
              {busquedaIMEI.length > 0 && busquedaIMEI.length < 4 && (
                <p style={{ margin:"8px 0 0", fontSize:12, color:C.gray100 }}>Ingresa al menos 4 dígitos para buscar</p>
              )}
            </div>

            {busquedaIMEI.length >= 4 && (
              resultadosBusqueda.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", background:C.white, borderRadius:16, border:`1px solid ${C.gray200}` }}>
                  <Search size={36} style={{ color:C.gray300, margin:"0 auto 10px", display:"block" }} />
                  <p style={{ fontSize:14, fontWeight:700, color:C.gray900, margin:"0 0 4px" }}>Sin resultados</p>
                  <p style={{ fontSize:13, color:C.gray500, margin:0 }}>No se encontró ningún IMEI con "{busquedaIMEI}"</p>
                </div>
              ) : (
                <div style={{ background:C.white, borderRadius:16, border:`1.5px solid ${C.gray200}`, overflow:"hidden" }}>
                  <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.gray100}`, background:C.gray50 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.gray700 }}>
                      {resultadosBusqueda.length} resultado{resultadosBusqueda.length!==1?"s":""} para "{busquedaIMEI}"
                    </p>
                  </div>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:C.gray50, borderBottom:`1px solid ${C.gray200}` }}>
                        {["IMEI 1","IMEI 2","Producto","Lote","Estado","Cliente","Ingreso","Acción"].map(h => (
                          <th key={h} style={{ padding:"10px 14px", fontSize:10, fontWeight:800, color:C.gray500, textAlign:"left", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultadosBusqueda.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom:i<resultadosBusqueda.length-1?`1px solid ${C.gray100}`:"none" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#faf9ff")}
                          onMouseLeave={e => (e.currentTarget.style.background = C.white)}>
                          <td style={{ padding:"12px 14px" }}>
                            <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:C.purple }}>{r.imei}</span>
                          </td>
                          <td style={{ padding:"12px 14px", fontFamily:"monospace", fontSize:11, color:C.gray100 }}>{r.imei2||"—"}</td>
                          <td style={{ padding:"12px 14px" }}>
                            <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.gray900 }}>{r.productoNombre}</p>
                            <p style={{ margin:"1px 0 0", fontSize:10, color:C.gray100 }}>{r.sku}</p>
                          </td>
                          <td style={{ padding:"12px 14px" }}>
                            <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:6, background:C.purpleBg, color:C.purple }}>{r.lote}</span>
                          </td>
                          <td style={{ padding:"12px 14px" }}><EstadoBadge estado={r.estado} /></td>
                          <td style={{ padding:"12px 14px", fontSize:12, color:r.clienteNombre?C.gray900:C.gray300 }}>{r.clienteNombre||"—"}</td>
                          <td style={{ padding:"12px 14px", fontSize:11, color:C.gray100 }}>{fmtFecha(r.fechaIngreso)}</td>
                          <td style={{ padding:"12px 14px" }}>
                            <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value as RegistroIMEI["estado"])}
                              style={{ padding:"4px 8px", borderRadius:8, border:`1px solid ${C.gray200}`, fontSize:11, color:C.gray700, outline:"none", background:C.white, cursor:"pointer" }}>
                              <option value="disponible">Disponible</option>
                              <option value="reservado">Reservado</option>
                              <option value="vendido">Vendido</option>
                              <option value="garantia">Garantía</option>
                              <option value="defectuoso">Defectuoso</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {showRegistrar && <ModalRegistrar onClose={() => setShowRegistrar(false)} onSaved={() => showToast("✅ IMEIs registrados correctamente")} />}
      {detalleProd   && <ModalDetalleProducto grupo={detalleProd} onClose={() => setDetalleProd(null)} onCambiarEstado={cambiarEstado} />}
      {asignarProd   && <ModalAsignar grupo={asignarProd} onClose={() => setAsignarProd(null)} onAsignar={asignarAPedido} />}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes dashIn  { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1}50%{opacity:.5} }
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)} }
        .dash-in { animation: dashIn .35s cubic-bezier(.4,0,.2,1); }
      `}</style>
    </div>
  );
}