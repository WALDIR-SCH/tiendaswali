"use client";
import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy, onSnapshot, Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import {
  Plus, Search, FileText, CheckCircle, XCircle, Clock,
  Send, Eye, RefreshCw, ChevronDown, X, Trash2,
  ArrowLeft, Package, Building2, Download,
} from "lucide-react";

/* ─── TIPOS ─── */
interface LineaCot {
  productoId: string;
  nombre: string;
  sku: string;
  cantidad: number;
  precio: number;
  descuento: number;
  subtotal: number;
}

interface Cotizacion {
  id: string;
  numero: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteEmpresa: string;
  lineas: LineaCot[];
  subtotal: number;
  igv: number;
  total: number;
  estado: "borrador" | "enviada" | "aprobada" | "rechazada" | "convertida";
  validezDias: number;
  notas: string;
  fecha: any;
  fechaEnvio?: any;
  fechaVencimiento?: any;
  creadoPor: string;
}

interface Producto {
  id: string;
  nombre_producto?: string;
  nombre?: string;
  sku?: string;
  precio_caja?: number;
  precio_unitario?: number;
  stock_cajas?: number;
  stock_unidades?: number;
}

interface Cliente {
  id: string;
  empresa?: string;
  nombre?: string;
  email?: string;
  estado?: string;
}

/* ─── PALETA ─── */
const C = {
  purple:"#9851F9", purpleDark:"#7C35E0",
  green:"#28FB4B",  yellow:"#F6FA00", orange:"#FF6600",
  white:"#FFFFFF",  gray50:"#f9fafb", gray100:"#f3f4f6",
  gray200:"#e5e7eb",gray300:"#d1d5db",gray500:"#6b7280",
  gray700:"#374151",gray900:"#111827",
};

const ESTADO_COT: Record<string, { label:string; bg:string; color:string; border:string }> = {
  borrador:   { label:"Borrador",   bg:"#f1f5f9", color:"#64748b", border:"#e2e8f0" },
  enviada:    { label:"Enviada",    bg:`${C.yellow}20`, color:"#a09600", border:`${C.yellow}50` },
  aprobada:   { label:"Aprobada",   bg:`${C.green}15`, color:"#16a34a", border:`${C.green}40` },
  rechazada:  { label:"Rechazada",  bg:"#fef2f2",  color:"#dc2626", border:"#fecaca" },
  convertida: { label:"Convertida", bg:`${C.purple}12`, color:C.purple, border:`${C.purple}30` },
};

const fmtPEN = (n: number) =>
  new Intl.NumberFormat("es-PE", { style:"currency", currency:"PEN", minimumFractionDigits:2 }).format(n || 0);

const genNumero = () => `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

/* ─── BADGE ─── */
const EstadoBadge = ({ estado }: { estado: string }) => {
  const e = ESTADO_COT[estado] ?? ESTADO_COT.borrador;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:e.bg, color:e.color, border:`1px solid ${e.border}` }}>
      {e.label}
    </span>
  );
};

/* ═══════════════════════════════════
   FORMULARIO NUEVA / EDITAR COT.
═══════════════════════════════════ */
function FormCotizacion({ onClose, onSaved, cotEdit }: {
  onClose: () => void;
  onSaved: () => void;
  cotEdit?: Cotizacion | null;
}) {
  const [clientes,   setClientes]   = useState<Cliente[]>([]);
  const [productos,  setProductos]  = useState<Producto[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [searchProd, setSearchProd] = useState("");
  const [showProdSearch, setShowProdSearch] = useState(false);

  const [form, setForm] = useState({
    clienteId:      cotEdit?.clienteId      || "",
    clienteNombre:  cotEdit?.clienteNombre  || "",
    clienteEmail:   cotEdit?.clienteEmail   || "",
    clienteEmpresa: cotEdit?.clienteEmpresa || "",
    lineas:         cotEdit?.lineas         || [] as LineaCot[],
    validezDias:    cotEdit?.validezDias    || 7,
    notas:          cotEdit?.notas          || "",
    estado:         cotEdit?.estado         || "borrador" as Cotizacion["estado"],
  });

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, "usuarios"), )),
      getDocs(collection(db, "productos")),
    ]).then(([cliSnap, proSnap]) => {
      setClientes(cliSnap.docs.map(d => ({ id:d.id, ...d.data() } as Cliente)).filter(c => c.estado === "verificado" || c.empresa));
      setProductos(proSnap.docs.map(d => ({ id:d.id, ...d.data() } as Producto)));
    });
  }, []);

  const selectCliente = (c: Cliente) => {
    setForm(f => ({ ...f, clienteId:c.id, clienteNombre:c.nombre||"", clienteEmail:c.email||"", clienteEmpresa:c.empresa||"" }));
  };

  const agregarLinea = (p: Producto) => {
    const precio = p.precio_caja ?? p.precio_unitario ?? 0;
    const linea: LineaCot = {
      productoId: p.id,
      nombre: p.nombre_producto || p.nombre || "",
      sku: p.sku || "",
      cantidad: 1,
      precio,
      descuento: 0,
      subtotal: precio,
    };
    setForm(f => ({ ...f, lineas: [...f.lineas, linea] }));
    setSearchProd("");
    setShowProdSearch(false);
  };

  const updateLinea = (idx: number, field: keyof LineaCot, val: number) => {
    setForm(f => {
      const lineas = [...f.lineas];
      (lineas[idx] as any)[field] = val;
      const l = lineas[idx];
      lineas[idx].subtotal = l.cantidad * l.precio * (1 - l.descuento / 100);
      return { ...f, lineas };
    });
  };

  const removeLinea = (idx: number) => {
    setForm(f => ({ ...f, lineas: f.lineas.filter((_,i) => i !== idx) }));
  };

  const subtotal = form.lineas.reduce((a, l) => a + l.subtotal, 0);
  const igv      = subtotal * 0.18;
  const total    = subtotal + igv;

  const prodsFiltrados = productos.filter(p =>
    (p.nombre_producto || p.nombre || "").toLowerCase().includes(searchProd.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(searchProd.toLowerCase())
  ).slice(0, 8);

  const handleSave = async (estado: Cotizacion["estado"]) => {
    if (!form.clienteId) { alert("Selecciona un cliente"); return; }
    if (form.lineas.length === 0) { alert("Agrega al menos un producto"); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        estado,
        subtotal, igv, total,
        numero: cotEdit?.numero || genNumero(),
        creadoPor: auth.currentUser?.email || "admin",
        fecha: cotEdit?.fecha || serverTimestamp(),
        ...(estado === "enviada" ? { fechaEnvio: serverTimestamp() } : {}),
      };
      if (cotEdit) {
        await updateDoc(doc(db, "cotizaciones", cotEdit.id), data);
      } else {
        await addDoc(collection(db, "cotizaciones"), data);
      }
      onSaved();
      onClose();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:60, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"20px", overflowY:"auto" }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:860, border:`1px solid ${C.gray200}`, boxShadow:"0 24px 80px rgba(0,0,0,0.18)", marginTop:20 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 28px", borderBottom:`1px solid ${C.gray100}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:`${C.purple}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <FileText size={20} style={{ color:C.purple }} />
            </div>
            <div>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:C.gray900 }}>
                {cotEdit ? `Editar ${cotEdit.numero}` : "Nueva Cotización"}
              </h2>
              <p style={{ margin:0, fontSize:12, color:C.gray500 }}>Complete los datos para generar la cotización</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${C.gray200}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={18} style={{ color:C.gray500 }} />
          </button>
        </div>

        <div style={{ padding:"24px 28px", display:"flex", flexDirection:"column", gap:24 }}>

          {/* Cliente */}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>Cliente *</label>
            <select
              value={form.clienteId}
              onChange={e => {
                const c = clientes.find(x => x.id === e.target.value);
                if (c) selectCliente(c);
              }}
              style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, color:C.gray900, outline:"none", background:C.white }}
            >
              <option value="">— Selecciona un cliente —</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.empresa || c.nombre || c.email}</option>
              ))}
            </select>
            {form.clienteEmpresa && (
              <div style={{ marginTop:8, padding:"10px 14px", borderRadius:10, background:`${C.purple}08`, border:`1px solid ${C.purple}20`, display:"flex", gap:16 }}>
                <span style={{ fontSize:12, color:C.gray500 }}>Empresa: <strong style={{ color:C.gray900 }}>{form.clienteEmpresa}</strong></span>
                <span style={{ fontSize:12, color:C.gray500 }}>Email: <strong style={{ color:C.gray900 }}>{form.clienteEmail}</strong></span>
              </div>
            )}
          </div>

          {/* Líneas de productos */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray700, textTransform:"uppercase", letterSpacing:"0.05em" }}>Productos *</label>
              <button onClick={() => setShowProdSearch(v => !v)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:10, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                <Plus size={14} /> Agregar producto
              </button>
            </div>

            {/* Buscador productos */}
            {showProdSearch && (
              <div style={{ marginBottom:12, position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", border:`1.5px solid ${C.purple}`, borderRadius:12, background:C.white }}>
                  <Search size={15} style={{ color:C.gray500 }} />
                  <input
                    value={searchProd}
                    onChange={e => setSearchProd(e.target.value)}
                    placeholder="Buscar por nombre o SKU..."
                    autoFocus
                    style={{ border:"none", outline:"none", fontSize:14, flex:1, color:C.gray900 }}
                  />
                </div>
                {searchProd.length > 0 && (
                  <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:C.white, borderRadius:12, border:`1px solid ${C.gray200}`, boxShadow:"0 12px 40px rgba(0,0,0,0.12)", zIndex:10, maxHeight:260, overflowY:"auto" }}>
                    {prodsFiltrados.length === 0 ? (
                      <div style={{ padding:"16px", textAlign:"center", fontSize:13, color:C.gray500 }}>Sin resultados</div>
                    ) : prodsFiltrados.map(p => (
                      <button key={p.id} onClick={() => agregarLinea(p)}
                        style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"12px 16px", border:"none", background:"transparent", cursor:"pointer", textAlign:"left", borderBottom:`1px solid ${C.gray100}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${C.purple}08`)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width:36, height:36, borderRadius:10, background:`${C.purple}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <Package size={16} style={{ color:C.purple }} />
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:C.gray900 }}>{p.nombre_producto || p.nombre}</div>
                          <div style={{ fontSize:11, color:C.gray500 }}>SKU: {p.sku || "—"} · Stock: {p.stock_cajas ?? p.stock_unidades ?? 0}</div>
                        </div>
                        <div style={{ fontSize:13, fontWeight:800, color:C.purple }}>{fmtPEN(p.precio_caja ?? p.precio_unitario ?? 0)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tabla líneas */}
            {form.lineas.length > 0 ? (
              <div style={{ border:`1px solid ${C.gray200}`, borderRadius:14, overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:C.gray50, borderBottom:`1px solid ${C.gray200}` }}>
                      {["Producto","Cant.","Precio Unit.","Desc. %","Subtotal",""].map(h => (
                        <th key={h} style={{ padding:"10px 14px", fontSize:11, fontWeight:700, color:C.gray500, textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineas.map((l, i) => (
                      <tr key={i} style={{ borderBottom: i < form.lineas.length-1 ? `1px solid ${C.gray100}` : "none" }}>
                        <td style={{ padding:"12px 14px" }}>
                          <div style={{ fontSize:13, fontWeight:600, color:C.gray900 }}>{l.nombre}</div>
                          <div style={{ fontSize:11, color:C.gray500 }}>{l.sku}</div>
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <input type="number" min={1} value={l.cantidad}
                            onChange={e => updateLinea(i, "cantidad", Number(e.target.value))}
                            style={{ width:70, padding:"6px 10px", borderRadius:8, border:`1px solid ${C.gray200}`, fontSize:13, textAlign:"center", outline:"none" }}
                          />
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <input type="number" min={0} step={0.01} value={l.precio}
                            onChange={e => updateLinea(i, "precio", Number(e.target.value))}
                            style={{ width:100, padding:"6px 10px", borderRadius:8, border:`1px solid ${C.gray200}`, fontSize:13, outline:"none" }}
                          />
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <input type="number" min={0} max={100} value={l.descuento}
                            onChange={e => updateLinea(i, "descuento", Number(e.target.value))}
                            style={{ width:70, padding:"6px 10px", borderRadius:8, border:`1px solid ${C.gray200}`, fontSize:13, textAlign:"center", outline:"none" }}
                          />
                        </td>
                        <td style={{ padding:"12px 14px", fontSize:13, fontWeight:800, color:C.gray900 }}>
                          {fmtPEN(l.subtotal)}
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <button onClick={() => removeLinea(i)} style={{ width:28, height:28, borderRadius:8, border:`1px solid #fecaca`, background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                            <Trash2 size={13} style={{ color:"#dc2626" }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ border:`2px dashed ${C.gray200}`, borderRadius:14, padding:"32px", textAlign:"center", color:C.gray500 }}>
                <Package size={32} style={{ margin:"0 auto 8px", opacity:0.4 }} />
                <p style={{ margin:0, fontSize:13 }}>Agrega productos para crear la cotización</p>
              </div>
            )}
          </div>

          {/* Totales + notas */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:20 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Notas / Condiciones</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm(f => ({...f, notas:e.target.value}))}
                  rows={4}
                  placeholder="Condiciones de pago, tiempo de entrega, garantías..."
                  style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:13, resize:"vertical", outline:"none", color:C.gray900 }}
                />
              </div>
              <div style={{ display:"flex", gap:12 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Validez (días)</label>
                  <input type="number" min={1} max={90} value={form.validezDias}
                    onChange={e => setForm(f => ({...f, validezDias:Number(e.target.value)}))}
                    style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900 }}
                  />
                </div>
              </div>
            </div>

            {/* Resumen totales */}
            <div style={{ background:`${C.purple}06`, borderRadius:16, padding:"20px", border:`1px solid ${C.purple}18` }}>
              <h4 style={{ margin:"0 0 16px", fontSize:13, fontWeight:700, color:C.gray700 }}>Resumen</h4>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { label:"Subtotal", value:fmtPEN(subtotal) },
                  { label:"IGV (18%)", value:fmtPEN(igv) },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:13, color:C.gray500 }}>{r.label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:C.gray900 }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ borderTop:`1px solid ${C.purple}20`, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:15, fontWeight:800, color:C.gray900 }}>TOTAL</span>
                  <span style={{ fontSize:18, fontWeight:900, color:C.purple }}>{fmtPEN(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:8, borderTop:`1px solid ${C.gray100}` }}>
            <button onClick={onClose} style={{ padding:"10px 20px", borderRadius:11, border:`1px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:600, color:C.gray700, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={() => handleSave("borrador")} disabled={saving}
              style={{ padding:"10px 20px", borderRadius:11, border:`1px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:700, color:C.gray700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              💾 Guardar borrador
            </button>
            <button onClick={() => handleSave("enviada")} disabled={saving}
              style={{ padding:"10px 24px", borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:`0 4px 14px ${C.purple}40` }}>
              <Send size={15} /> {saving ? "Guardando..." : "Enviar cotización"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   PÁGINA PRINCIPAL DE COTIZACIONES
═══════════════════════════════════ */
export default function CotizacionesAdmin() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editCot,      setEditCot]      = useState<Cotizacion | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [searchTerm,   setSearchTerm]   = useState("");

  const cargar = useCallback(() => {
    setLoading(true);
    const q = query(collection(db, "cotizaciones"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, snap => {
      setCotizaciones(snap.docs.map(d => ({ id:d.id, ...d.data() } as Cotizacion)));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = cargar();
    return () => unsub();
  }, [cargar]);

  const cambiarEstado = async (id: string, estado: Cotizacion["estado"]) => {
    try {
      await updateDoc(doc(db, "cotizaciones", id), { estado, ...(estado==="enviada" ? { fechaEnvio:serverTimestamp() } : {}) });
    } catch { alert("Error al actualizar estado"); }
  };

  const convertirAPedido = async (cot: Cotizacion) => {
    if (!confirm("¿Convertir esta cotización en pedido?")) return;
    try {
      await addDoc(collection(db, "pedidos"), {
        numero: `PED-${Date.now().toString().slice(-6)}`,
        cotizacionId: cot.id,
        clienteId: cot.clienteId,
        cliente: cot.clienteNombre,
        empresa: cot.clienteEmpresa,
        email: cot.clienteEmail,
        items: cot.lineas,
        subtotal: cot.subtotal,
        igv: cot.igv,
        total: cot.total,
        estado: "pendiente",
        fecha: serverTimestamp(),
        creadoPor: auth.currentUser?.email || "admin",
      });
      await updateDoc(doc(db, "cotizaciones", cot.id), { estado:"convertida" });
      alert("✅ Pedido creado exitosamente");
    } catch { alert("Error al convertir"); }
  };

  const filtradas = cotizaciones.filter(c => {
    const matchSearch =
      c.clienteEmpresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filtroEstado === "todos" ? true : c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const stats = {
    total:      cotizaciones.length,
    borrador:   cotizaciones.filter(c => c.estado==="borrador").length,
    enviadas:   cotizaciones.filter(c => c.estado==="enviada").length,
    aprobadas:  cotizaciones.filter(c => c.estado==="aprobada").length,
    totalValor: cotizaciones.filter(c => c.estado==="enviada"||c.estado==="aprobada").reduce((a,c)=>a+c.total,0),
  };

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif" }} className="dash-in">

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <Link href="/admin" style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"#9851F9", textDecoration:"none", fontWeight:600 }}>
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize:28, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>Cotizaciones</h1>
          <p style={{ fontSize:13, color:C.gray500, margin:"4px 0 0" }}>Gestiona el ciclo de vida de tus cotizaciones B2B</p>
        </div>
        <button onClick={() => { setEditCot(null); setShowForm(true); }}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 22px", borderRadius:13, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 6px 22px ${C.purple}50` }}>
          <Plus size={16} /> Nueva Cotización
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:24 }}>
        {[
          { label:"Total",     val:stats.total,                        bg:C.gray50,      border:C.gray200, color:C.gray900 },
          { label:"Borradores",val:stats.borrador,                     bg:"#f1f5f9",     border:"#e2e8f0", color:"#64748b" },
          { label:"Enviadas",  val:stats.enviadas,                     bg:`${C.yellow}15`,border:`${C.yellow}35`,color:"#a09600" },
          { label:"Aprobadas", val:stats.aprobadas,                    bg:`${C.green}12`,border:`${C.green}30`,color:"#16a34a" },
          { label:"Pipeline",  val:fmtPEN(stats.totalValor),           bg:`${C.purple}08`,border:`${C.purple}20`,color:C.purple },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:16, padding:"16px 18px", border:`1px solid ${s.border}` }}>
            <p style={{ fontSize:11, fontWeight:700, color:s.color, margin:"0 0 6px", textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</p>
            <p style={{ fontSize:22, fontWeight:900, color:s.color, margin:0 }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <div style={{ flex:1, position:"relative" }}>
          <Search size={15} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:C.gray300 }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por empresa, número, cliente..."
            style={{ width:"100%", paddingLeft:40, paddingRight:16, paddingTop:10, paddingBottom:10, borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900 }}
            onFocus={e => { e.target.style.borderColor = C.purple; e.target.style.boxShadow=`0 0 0 3px ${C.purple}18`; }}
            onBlur={e => { e.target.style.borderColor = C.gray200; e.target.style.boxShadow="none"; }}
          />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding:"10px 16px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, color:C.gray700, outline:"none", background:C.white, minWidth:200 }}>
          <option value="todos">Todos los estados</option>
          <option value="borrador">Borradores</option>
          <option value="enviada">Enviadas</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="convertida">Convertidas</option>
        </select>
        <button onClick={() => cargar()}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:12, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          <RefreshCw size={15} className={loading ? "spin" : ""} />
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background:C.white, borderRadius:18, border:`1px solid ${C.gray200}`, overflow:"hidden", boxShadow:`0 4px 24px ${C.purple}06` }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:C.gray50, borderBottom:`1px solid ${C.gray200}` }}>
              {["N° Cotización","Cliente / Empresa","Productos","Total","Estado","Validez","Acciones"].map((h,i) => (
                <th key={h} style={{ padding:"12px 16px", fontSize:11, fontWeight:800, color:C.gray500, textAlign: i===6?"right":"left", whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_,i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${C.gray100}` }}>
                  {[...Array(7)].map((_,j) => (
                    <td key={j} style={{ padding:"16px" }}>
                      <div style={{ height:16, borderRadius:6, background:C.gray100, animation:"pulse 1.4s ease infinite", width: j===0?"80%":"60%" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding:"48px", textAlign:"center" }}>
                  <FileText size={40} style={{ margin:"0 auto 12px", color:C.gray300, display:"block" }} />
                  <p style={{ fontSize:14, color:C.gray500, margin:0 }}>
                    {searchTerm || filtroEstado !== "todos" ? "No se encontraron cotizaciones" : "Aún no hay cotizaciones"}
                  </p>
                </td>
              </tr>
            ) : filtradas.map((c, idx) => (
              <tr key={c.id} style={{ borderBottom: idx<filtradas.length-1?`1px solid ${C.gray100}`:"none", transition:"background .15s" }}
                onMouseEnter={e => (e.currentTarget.style.background="#faf9ff")}
                onMouseLeave={e => (e.currentTarget.style.background=C.white)}>
                <td style={{ padding:"14px 16px" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.purple }}>{c.numero}</span>
                  <div style={{ fontSize:11, color:C.gray500, marginTop:2 }}>
                    {c.fecha?.toDate ? c.fecha.toDate().toLocaleDateString("es-PE") : "—"}
                  </div>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${C.purple}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Building2 size={16} style={{ color:C.purple }} />
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.gray900 }}>{c.clienteEmpresa || c.clienteNombre || "—"}</div>
                      <div style={{ fontSize:11, color:C.gray500 }}>{c.clienteEmail || "—"}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <span style={{ fontSize:13, color:C.gray700 }}>{c.lineas?.length || 0} productos</span>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <span style={{ fontSize:15, fontWeight:900, color:C.purple }}>{fmtPEN(c.total)}</span>
                  <div style={{ fontSize:11, color:C.gray500 }}>+ IGV {fmtPEN(c.igv)}</div>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <EstadoBadge estado={c.estado} />
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <span style={{ fontSize:13, color:C.gray700 }}>{c.validezDias} días</span>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6 }}>
                    {/* Editar */}
                    {(c.estado === "borrador") && (
                      <button onClick={() => { setEditCot(c); setShowForm(true); }}
                        style={{ padding:"6px 12px", borderRadius:9, border:`1px solid ${C.gray200}`, background:C.white, fontSize:12, fontWeight:600, color:C.gray700, cursor:"pointer" }}>
                        Editar
                      </button>
                    )}
                    {/* Enviar */}
                    {c.estado === "borrador" && (
                      <button onClick={() => cambiarEstado(c.id, "enviada")}
                        style={{ padding:"6px 12px", borderRadius:9, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        Enviar
                      </button>
                    )}
                    {/* Aprobar */}
                    {c.estado === "enviada" && (
                      <button onClick={() => cambiarEstado(c.id, "aprobada")}
                        style={{ padding:"6px 12px", borderRadius:9, background:`${C.green}18`, color:"#16a34a", border:`1px solid ${C.green}30`, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        Aprobar
                      </button>
                    )}
                    {/* Convertir */}
                    {c.estado === "aprobada" && (
                      <button onClick={() => convertirAPedido(c)}
                        style={{ padding:"6px 12px", borderRadius:9, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        → Pedido
                      </button>
                    )}
                    {/* Rechazar */}
                    {(c.estado === "enviada" || c.estado === "aprobada") && (
                      <button onClick={() => cambiarEstado(c.id, "rechazada")}
                        style={{ width:30, height:30, borderRadius:8, border:"1px solid #fecaca", background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                        <XCircle size={14} style={{ color:"#dc2626" }} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal form */}
      {showForm && (
        <FormCotizacion
          onClose={() => { setShowForm(false); setEditCot(null); }}
          onSaved={() => {}}
          cotEdit={editCot}
        />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes dashIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100%{opacity:1}50%{opacity:.5} }
        @keyframes spin   { to { transform:rotate(360deg); } }
        .dash-in { animation: dashIn .4s cubic-bezier(.4,0,.2,1); }
        .spin    { animation: spin .75s linear infinite; }
      `}</style>
    </div>
  );
}