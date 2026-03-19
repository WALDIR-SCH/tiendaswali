"use client";
// src/app/admin/cotizaciones/page.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc, getDocs,
  serverTimestamp, query, orderBy, onSnapshot, where,
} from "firebase/firestore";
import Link from "next/link";
import {
  Plus, Search, FileText, CheckCircle, XCircle, Clock,
  Send, Eye, RefreshCw, X, Trash2,
  ArrowLeft, Package, Building2, Download,
  Bell, MessageSquare, ChevronRight, Hash,
  AlertCircle, User, Zap, Filter, Tag, Percent,
  ChevronDown, Star,
} from "lucide-react";

/* ─── TIPOS ─── */
interface LineaCot {
  productoId: string;
  nombre: string;
  sku: string;
  cantidad: number;
  precio: number;
  imagen?: string;
  marca?: string;
}

interface MensajeChat {
  texto: string;
  autorRol: "cliente" | "admin";
  autorNombre: string;
  fecha: any;
}

interface Cotizacion {
  id: string;
  numero: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteEmpresa: string;
  lineas: LineaCot[];
  comentario: string;
  subtotal?: number;
  igv?: number;
  total?: number;
  estado: "pendiente" | "en_revision" | "respondida" | "aprobada" | "rechazada";
  fecha: any;
  mensajes?: MensajeChat[];
  leidoPorAdmin?: boolean;
  leidoPorCliente?: boolean;
  ultimoMensaje?: string;
  ultimoMensajeFecha?: any;
}

/* ─── PALETA ─── */
const C = {
  purple: "#9851F9", purpleDark: "#7C35E0",
  green: "#28FB4B", yellow: "#F6FA00", orange: "#FF6600",
  white: "#FFFFFF", gray50: "#f9fafb", gray100: "#f3f4f6",
  gray200: "#e5e7eb", gray300: "#d1d5db", gray500: "#6b7280",
  gray700: "#374151", gray900: "#111827",
};

const ESTADOS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pendiente:   { label: "Pendiente",   bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  en_revision: { label: "En revisión", bg: `${C.purple}12`, color: C.purple, border: `${C.purple}30` },
  respondida:  { label: "Respondida",  bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  aprobada:    { label: "Aprobada",    bg: `${C.green}15`, color: "#16a34a", border: `${C.green}40` },
  rechazada:   { label: "Rechazada",   bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
};

const fmtPEN = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n || 0);

/* ─── BADGE ─── */
const EstadoBadge = ({ estado }: { estado: string }) => {
  const e = ESTADOS[estado] ?? ESTADOS.pendiente;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: e.bg, color: e.color, border: `1px solid ${e.border}`,
    }}>
      {e.label}
    </span>
  );
};

/* ─── TIPOS EXTRA ─── */
interface ClienteDB {
  id: string;
  nombre?: string;
  email?: string;
  empresa?: string;
  razonSocial?: string;
  estado?: string;
  rol?: string;
}
interface ProductoDB {
  id: string;
  nombre_producto?: string;
  nombre?: string;
  sku?: string;
  precio_caja?: number;
  precio_unitario?: number;
  stock_cajas?: number;
  stock_unidades?: number;
  imagen_principal?: string;
  marca?: string;
  categoria_id?: string;
  capacidad_almacenamiento?: string;
  capacidad_ram?: string;
}

/* ─── DESCUENTO POR CANTIDAD ─── */
const calcDescuento = (cantidad: number): number => {
  if (cantidad >= 50) return 15;
  if (cantidad >= 20) return 10;
  if (cantidad >= 10) return 7;
  if (cantidad >= 5)  return 5;
  return 0;
};

/* ═══════════════════════════════════
   MODAL: CREAR COTIZACIÓN (ADMIN)
═══════════════════════════════════ */
function ModalCrearCotAdmin({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [clientes,       setClientes]       = useState<ClienteDB[]>([]);
  const [productos,      setProductos]      = useState<ProductoDB[]>([]);
  const [loadingData,    setLoadingData]    = useState(true);

  // Selección
  const [clienteSelec,  setClienteSelec]   = useState<ClienteDB | null>(null);
  const [busqCliente,   setBusqCliente]    = useState("");
  const [showDropCli,   setShowDropCli]    = useState(false);

  // Producto
  const [busqProd,      setBusqProd]       = useState("");
  const [showDropProd,  setShowDropProd]   = useState(false);
  const [prodSelec,     setProdSelec]      = useState<ProductoDB | null>(null);
  const [tipoPrecio,    setTipoPrecio]     = useState<"caja" | "unidad">("caja");
  const [cantidad,      setCantidad]       = useState(1);
  const [descManual,    setDescManual]     = useState<number | null>(null); // null = auto
  const [lineas,        setLineas]         = useState<(LineaCot & { descuento: number; subtotal: number })[]>([]);

  const [notas,         setNotas]          = useState("");
  const [saving,        setSaving]         = useState(false);

  const clienteRef = useRef<HTMLDivElement>(null);
  const prodRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) setShowDropCli(false);
      if (prodRef.current    && !prodRef.current.contains(e.target as Node))    setShowDropProd(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "usuarios")),
      getDocs(collection(db, "productos")),
    ]).then(([cliSnap, proSnap]) => {
      const clis = cliSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as ClienteDB))
        .filter(c => c.estado === "verificado");
      const pros = proSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProductoDB));
      setClientes(clis);
      setProductos(pros);
      setLoadingData(false);
    });
  }, []);

  const clisFiltrados = clientes.filter(c => {
    const q = busqCliente.toLowerCase();
    return (
      (c.nombre || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.empresa || c.razonSocial || "").toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const prodsFiltrados = productos.filter(p => {
    const q = busqProd.toLowerCase();
    return (
      (p.nombre_producto || p.nombre || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.marca || "").toLowerCase().includes(q)
    );
  }).slice(0, 8);

  // precio base según tipo
  const getPrecioBase = (p: ProductoDB, tipo: "caja" | "unidad") =>
    tipo === "caja" ? (p.precio_caja || p.precio_unitario || 0) : (p.precio_unitario || p.precio_caja || 0);

  const descAutoActual = prodSelec ? calcDescuento(cantidad) : 0;
  const descFinal      = descManual !== null ? descManual : descAutoActual;
  const precioBase     = prodSelec  ? getPrecioBase(prodSelec, tipoPrecio) : 0;
  const precioConDesc  = precioBase * (1 - descFinal / 100);
  const subtotalLinea  = precioConDesc * cantidad;

  const agregarLinea = () => {
    if (!prodSelec) { alert("Selecciona un producto"); return; }
    if (cantidad < 1) { alert("Ingresa una cantidad válida"); return; }
    const nueva = {
      productoId: prodSelec.id,
      nombre:     prodSelec.nombre_producto || prodSelec.nombre || "",
      sku:        prodSelec.sku || "",
      cantidad,
      precio:     precioBase,
      imagen:     prodSelec.imagen_principal || "",
      marca:      prodSelec.marca || "",
      descuento:  descFinal,
      subtotal:   subtotalLinea,
    };
    // Si ya existe, reemplaza
    setLineas(ls => {
      const idx = ls.findIndex(l => l.productoId === prodSelec.id);
      if (idx >= 0) { const n = [...ls]; n[idx] = nueva; return n; }
      return [...ls, nueva];
    });
    setProdSelec(null);
    setBusqProd("");
    setCantidad(1);
    setDescManual(null);
  };

  const quitarLinea = (id: string) => setLineas(ls => ls.filter(l => l.productoId !== id));

  const totalGeneral = lineas.reduce((a, l) => a + l.subtotal, 0);
  const igv          = totalGeneral * 0.18;
  const total        = totalGeneral + igv;

  const handleGuardar = async () => {
    if (!clienteSelec)     { alert("Selecciona un cliente"); return; }
    if (lineas.length < 1) { alert("Agrega al menos un producto"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "cotizaciones"), {
        numero:         `COT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        clienteId:      clienteSelec.id,
        clienteNombre:  clienteSelec.nombre || "",
        clienteEmail:   clienteSelec.email  || "",
        clienteEmpresa: clienteSelec.empresa || clienteSelec.razonSocial || "",
        lineas:         lineas.map(({ descuento, subtotal, ...l }) => ({ ...l })),
        lineasDetalle:  lineas, // guardamos con descuento para referencia
        comentario:     notas,
        subtotal:       totalGeneral,
        igv,
        total,
        estado:         "respondida",
        fecha:          serverTimestamp(),
        mensajes:       [{
          texto:      `📋 Cotización generada por el equipo de Mundo Móvil.\n\n${notas || "Por favor revisa los productos y precios adjuntos."}`,
          autorRol:   "admin",
          autorNombre: auth.currentUser?.email?.split("@")[0] || "Asesor",
          fecha:      new Date(),
        }],
        creadoPorAdmin: true,
        leidoPorAdmin:  true,
        leidoPorCliente: false,
      });
      onSaved();
      onClose();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    finally { setSaving(false); }
  };

  const LabelSec = ({ children }: { children: React.ReactNode }) => (
    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{children}</p>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", overflowY: "auto" }}>
      <div style={{ background: C.white, borderRadius: 22, width: "100%", maxWidth: 780, boxShadow: "0 32px 80px rgba(0,0,0,0.2)", marginTop: 16, overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.gray100}`, background: `linear-gradient(135deg,${C.purple}08,${C.white})`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={20} style={{ color: C.purple }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: C.gray900 }}>Nueva Cotización</h2>
              <p style={{ margin: 0, fontSize: 12, color: C.gray500 }}>Crea una cotización y envíasela al cliente</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.gray200}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={17} style={{ color: C.gray500 }} />
          </button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── 1. CLIENTE ── */}
          <div>
            <LabelSec>1. Seleccionar cliente verificado</LabelSec>
            <div ref={clienteRef} style={{ position: "relative" }}>
              {clienteSelec ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 13, border: `2px solid ${C.purple}`, background: `${C.purple}06` }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${C.purple}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={17} style={{ color: C.purple }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.gray900 }}>{clienteSelec.nombre}</p>
                    <p style={{ margin: 0, fontSize: 12, color: C.gray500 }}>{clienteSelec.email} {clienteSelec.empresa ? `· ${clienteSelec.empresa}` : ""}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#d1fae5", color: "#065f46", padding: "3px 9px", borderRadius: 20 }}>✓ Verificado</span>
                  <button onClick={() => setClienteSelec(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray100 }}><X size={15} /></button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 13, border: `1.5px solid ${C.gray200}`, background: C.white, cursor: "text" }}
                    onClick={() => setShowDropCli(true)}>
                    <Search size={15} style={{ color: C.gray300 }} />
                    <input
                      value={busqCliente}
                      onChange={e => { setBusqCliente(e.target.value); setShowDropCli(true); }}
                      onFocus={() => setShowDropCli(true)}
                      placeholder="Buscar cliente por nombre, email o empresa..."
                      style={{ border: "none", outline: "none", flex: 1, fontSize: 14, color: C.gray900 }}
                    />
                  </div>
                  {showDropCli && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.white, borderRadius: 13, border: `1px solid ${C.gray200}`, boxShadow: "0 12px 40px rgba(0,0,0,0.10)", zIndex: 20, maxHeight: 240, overflowY: "auto" }}>
                      {loadingData ? (
                        <p style={{ padding: "14px", textAlign: "center", fontSize: 13, color: C.gray500 }}>Cargando...</p>
                      ) : clisFiltrados.length === 0 ? (
                        <p style={{ padding: "14px", textAlign: "center", fontSize: 13, color: C.gray500 }}>Sin clientes verificados</p>
                      ) : clisFiltrados.map(c => (
                        <div key={c.id}
                          onClick={() => { setClienteSelec(c); setBusqCliente(""); setShowDropCli(false); }}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", cursor: "pointer", borderBottom: `1px solid ${C.gray100}` }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = `${C.purple}06`}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${C.purple}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <User size={15} style={{ color: C.purple }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.gray900 }}>{c.nombre || c.email}</p>
                            <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>{c.email} {c.empresa ? `· ${c.empresa}` : ""}</p>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 20 }}>✓ Verificado</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── 2. AGREGAR PRODUCTO ── */}
          <div style={{ background: C.gray50, borderRadius: 16, padding: "18px 20px", border: `1px solid ${C.gray200}` }}>
            <LabelSec>2. Agregar producto del catálogo</LabelSec>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, marginBottom: 14 }}>
              {/* Buscador producto */}
              <div ref={prodRef} style={{ position: "relative" }}>
                {prodSelec ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 11, border: `2px solid ${C.purple}`, background: C.white }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.gray200, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {prodSelec.imagen_principal
                        ? <img src={prodSelec.imagen_principal} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        : <Package size={14} style={{ color: C.gray300 }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.gray900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {prodSelec.nombre_producto || prodSelec.nombre}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: C.gray500 }}>{prodSelec.sku}</p>
                    </div>
                    <button onClick={() => setProdSelec(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray100 }}><X size={13} /></button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 11, border: `1.5px solid ${C.gray200}`, background: C.white }}
                      onClick={() => setShowDropProd(true)}>
                      <Search size={13} style={{ color: C.gray300 }} />
                      <input
                        value={busqProd}
                        onChange={e => { setBusqProd(e.target.value); setShowDropProd(true); }}
                        onFocus={() => setShowDropProd(true)}
                        placeholder="Buscar producto..."
                        style={{ border: "none", outline: "none", flex: 1, fontSize: 13, color: C.gray900, background: "transparent" }}
                      />
                    </div>
                    {showDropProd && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, boxShadow: "0 12px 40px rgba(0,0,0,0.10)", zIndex: 20, maxHeight: 220, overflowY: "auto" }}>
                        {prodsFiltrados.length === 0 ? (
                          <p style={{ padding: "12px", textAlign: "center", fontSize: 13, color: C.gray500 }}>Sin resultados</p>
                        ) : prodsFiltrados.map(p => (
                          <div key={p.id}
                            onClick={() => { setProdSelec(p); setBusqProd(""); setShowDropProd(false); setTipoPrecio("caja"); setCantidad(1); setDescManual(null); }}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.gray100}` }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = `${C.purple}06`}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                          >
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: C.gray200, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {p.imagen_principal ? <img src={p.imagen_principal} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Package size={14} style={{ color: C.gray300 }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.gray900 }}>{p.nombre_producto || p.nombre}</p>
                              <p style={{ margin: 0, fontSize: 10, color: C.gray500 }}>
                                {p.marca} · SKU: {p.sku} · Stock: {p.stock_cajas ?? p.stock_unidades ?? 0}
                              </p>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              {p.precio_caja && <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.purple }}>{fmtPEN(p.precio_caja)}/caja</p>}
                              {p.precio_unitario && <p style={{ margin: 0, fontSize: 10, color: C.gray500 }}>{fmtPEN(p.precio_unitario)}/u</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Tipo precio */}
              <div style={{ display: "flex", borderRadius: 11, border: `1.5px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                {(["caja", "unidad"] as const).map(t => (
                  <button key={t} onClick={() => setTipoPrecio(t)} style={{
                    padding: "0 14px", fontSize: 12, fontWeight: 700, border: "none",
                    background: tipoPrecio === t ? C.purple : "transparent",
                    color: tipoPrecio === t ? "#fff" : C.gray500, cursor: "pointer", height: "100%",
                  }}>
                    {t === "caja" ? "📦 Caja" : "🔹 Unidad"}
                  </button>
                ))}
              </div>

              {/* Cantidad */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, borderRadius: 11, border: `1.5px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                <button onClick={() => setCantidad(q => Math.max(1, q - 1))} style={{ width: 34, height: "100%", border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 700, color: C.gray500 }}>−</button>
                <input
                  type="number" min={1} value={cantidad}
                  onChange={e => setCantidad(Math.max(1, Number(e.target.value)))}
                  style={{ width: 54, textAlign: "center", border: "none", outline: "none", fontSize: 14, fontWeight: 700, color: C.gray900 }}
                />
                <button onClick={() => setCantidad(q => q + 1)} style={{ width: 34, height: "100%", border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 700, color: C.gray500 }}>+</button>
              </div>
            </div>

            {/* Preview precio + descuento */}
            {prodSelec && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
                  <p style={{ margin: 0, fontSize: 10, color: C.gray500, fontWeight: 700 }}>Precio base</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: C.gray900 }}>{fmtPEN(precioBase)}</p>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: descFinal > 0 ? "#fef3c7" : C.white, border: `1px solid ${descFinal > 0 ? "#fde68a" : C.gray200}` }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: descFinal > 0 ? "#92400e" : C.gray500 }}>
                    Descuento {descManual === null ? "(auto)" : "(manual)"}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number" min={0} max={100}
                      value={descManual !== null ? descManual : descAutoActual}
                      onChange={e => setDescManual(Number(e.target.value))}
                      style={{ width: 46, fontSize: 15, fontWeight: 900, color: "#92400e", border: "none", outline: "none", background: "transparent" }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>%</span>
                    {descManual !== null && (
                      <button onClick={() => setDescManual(null)} style={{ fontSize: 9, color: C.gray100, background: "none", border: "none", cursor: "pointer" }}>auto</button>
                    )}
                  </div>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: `${C.purple}08`, border: `1px solid ${C.purple}20` }}>
                  <p style={{ margin: 0, fontSize: 10, color: C.purple, fontWeight: 700 }}>Subtotal ({cantidad} u.)</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: C.purple }}>{fmtPEN(subtotalLinea)}</p>
                </div>
                <button onClick={agregarLinea} style={{
                  padding: "10px 18px", borderRadius: 10, background: `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                  color: "#fff", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                  boxShadow: `0 4px 14px ${C.purple}35`,
                }}>
                  <Plus size={14} /> Agregar
                </button>
              </div>
            )}

            {/* Tabla escala descuentos */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { desde: 5, desc: "5%" }, { desde: 10, desc: "7%" },
                { desde: 20, desc: "10%" }, { desde: 50, desc: "15%" },
              ].map(r => (
                <span key={r.desde} style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                  background: cantidad >= r.desde ? `${C.purple}12` : C.gray100,
                  color: cantidad >= r.desde ? C.purple : C.gray500,
                  border: `1px solid ${cantidad >= r.desde ? `${C.purple}25` : C.gray200}`,
                }}>
                  {cantidad >= r.desde ? "✓" : ""} {r.desde}+ u. → {r.desc} OFF
                </span>
              ))}
              <span style={{ fontSize: 10, color: C.gray100, alignSelf: "center", marginLeft: 4 }}>
                * Puedes editar el % manualmente
              </span>
            </div>
          </div>

          {/* ── 3. LÍNEAS AGREGADAS ── */}
          {lineas.length > 0 && (
            <div>
              <LabelSec>3. Productos en cotización</LabelSec>
              <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 13, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
                      {["Producto", "Precio base", "Cant.", "Desc.", "Subtotal", ""].map(h => (
                        <th key={h} style={{ padding: "9px 14px", fontSize: 10, fontWeight: 800, color: C.gray500, textAlign: "left", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, i) => (
                      <tr key={l.productoId} style={{ borderBottom: i < lineas.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: C.gray200, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {l.imagen ? <img src={l.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Package size={12} style={{ color: C.gray300 }} />}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.gray900 }}>{l.nombre}</p>
                              <p style={{ margin: 0, fontSize: 10, color: C.gray500 }}>{l.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: C.gray700 }}>{fmtPEN(l.precio)}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 700, color: C.gray900 }}>{l.cantidad}</td>
                        <td style={{ padding: "11px 14px" }}>
                          {l.descuento > 0
                            ? <span style={{ fontSize: 11, fontWeight: 800, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 20 }}>{l.descuento}% OFF</span>
                            : <span style={{ fontSize: 11, color: C.gray100 }}>—</span>}
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 900, color: C.purple }}>{fmtPEN(l.subtotal)}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <button onClick={() => quitarLinea(l.productoId)} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <Trash2 size={12} style={{ color: "#dc2626" }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Totales */}
                <div style={{ padding: "12px 20px", background: `${C.purple}05`, borderTop: `1px solid ${C.purple}15`, display: "flex", justifyContent: "flex-end", gap: 24 }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Subtotal</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.gray900 }}>{fmtPEN(totalGeneral)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>IGV 18%</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.gray900 }}>{fmtPEN(igv)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>TOTAL</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.purple }}>{fmtPEN(total)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 4. NOTAS ── */}
          <div>
            <LabelSec>4. Mensaje para el cliente (opcional)</LabelSec>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={3}
              placeholder="Condiciones de pago, tiempo de entrega, validez de precios, notas especiales..."
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${C.gray200}`, fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = C.gray200}
            />
          </div>

          {/* ── Acciones ── */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4, borderTop: `1px solid ${C.gray100}` }}>
            <button onClick={onClose} style={{ padding: "11px 22px", borderRadius: 12, border: `1px solid ${C.gray200}`, background: C.white, fontSize: 13, fontWeight: 600, color: C.gray700, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={saving} style={{
              padding: "11px 28px", borderRadius: 12,
              background: saving ? C.gray300 : `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
              color: "#fff", border: "none", fontSize: 13, fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: saving ? "none" : `0 6px 20px ${C.purple}40`,
            }}>
              <Send size={15} />
              {saving ? "Guardando..." : "Crear y enviar al cliente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   PANEL LATERAL: DETALLE + CHAT
═══════════════════════════════════ */
function PanelDetalle({ cot, onClose, onUpdate }: {
  cot: Cotizacion;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>(cot.mensajes || []);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [precioRespuesta, setPrecioRespuesta] = useState("");
  const [notasAdmin, setNotasAdmin] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "cotizaciones", cot.id), snap => {
      if (snap.exists()) setMensajes(snap.data().mensajes || []);
    });
    // Marcar como leído por admin
    updateDoc(doc(db, "cotizaciones", cot.id), { leidoPorAdmin: true });
    return () => unsub();
  }, [cot.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviarMensaje = async (textoOverride?: string, estadoNuevo?: string) => {
    const texto = textoOverride || nuevoMsg.trim();
    if (!texto) return;
    setSending(true);
    const msg: MensajeChat = {
      texto,
      autorRol: "admin",
      autorNombre: auth.currentUser?.email?.split("@")[0] || "Asesor",
      fecha: new Date(),
    };
    try {
      const updMsgs = [...mensajes, msg];
      const updateData: any = {
        mensajes: updMsgs,
        leidoPorCliente: false,
        ultimoMensaje: texto,
        ultimoMensajeFecha: serverTimestamp(),
      };
      if (estadoNuevo) updateData.estado = estadoNuevo;
      await updateDoc(doc(db, "cotizaciones", cot.id), updateData);
      if (!textoOverride) setNuevoMsg("");
      onUpdate();
    } catch (e) { alert("Error al enviar"); }
    finally { setSending(false); }
  };

  const enviarRespuestaCompleta = async () => {
    if (!notasAdmin.trim()) { alert("Escribe una respuesta para el cliente"); return; }
    let texto = notasAdmin.trim();
    if (precioRespuesta) {
      texto = `💰 **Precio cotizado: ${precioRespuesta}**\n\n${texto}`;
    }
    await enviarMensaje(texto, "respondida");
    setNotasAdmin("");
    setPrecioRespuesta("");
  };

  const cambiarEstado = async (estado: string) => {
    await updateDoc(doc(db, "cotizaciones", cot.id), {
      estado,
      leidoPorCliente: false,
    });
    onUpdate();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)",
      display: "flex", justifyContent: "flex-end",
    }}>
      <div style={{
        width: "100%", maxWidth: 560, background: C.white,
        height: "100%", display: "flex", flexDirection: "column",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.15)",
      }}>
        {/* Header panel */}
        <div style={{
          padding: "18px 24px", borderBottom: `1px solid ${C.gray100}`,
          background: `linear-gradient(135deg, ${C.purple}08, ${C.white})`,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Hash size={14} style={{ color: C.purple }} />
              <span style={{ fontSize: 15, fontWeight: 900, color: C.gray900 }}>{cot.numero}</span>
              <EstadoBadge estado={cot.estado} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={13} style={{ color: C.purple }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.gray700 }}>{cot.clienteNombre}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>{cot.clienteEmail}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.gray200}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} style={{ color: C.gray500 }} />
          </button>
        </div>

        {/* Scroll area */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Productos solicitados */}
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.gray100}` }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Productos solicitados ({cot.lineas?.length || 0})
            </h4>
            {cot.lineas?.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: C.gray50, border: `1px solid ${C.gray100}`, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.gray200, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {l.imagen ? <img src={l.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Package size={14} style={{ color: C.gray300 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.gray900 }}>{l.nombre}</p>
                  <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>
                    {l.marca && `${l.marca} · `}SKU: {l.sku || "—"} · Precio ref: {fmtPEN(l.precio)}
                  </p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.purple, background: `${C.purple}10`, padding: "3px 10px", borderRadius: 20 }}>
                  ×{l.cantidad}
                </span>
              </div>
            ))}

            {cot.comentario && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: `${C.yellow}15`, border: `1px solid ${C.yellow}40` }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#92400e" }}>💬 Comentario del cliente</p>
                <p style={{ margin: 0, fontSize: 13, color: C.gray700, lineHeight: 1.5 }}>{cot.comentario}</p>
              </div>
            )}
          </div>

          {/* Cambiar estado rápido */}
          <div style={{ padding: "12px 24px", borderBottom: `1px solid ${C.gray100}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["en_revision", "aprobada", "rechazada"].map(e => (
              <button key={e} onClick={() => cambiarEstado(e)} disabled={cot.estado === e} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: cot.estado === e ? "default" : "pointer",
                background: cot.estado === e ? ESTADOS[e].bg : C.gray100,
                color: cot.estado === e ? ESTADOS[e].color : C.gray500,
                border: `1px solid ${cot.estado === e ? ESTADOS[e].border : C.gray200}`,
                opacity: cot.estado === e ? 1 : 0.7,
              }}>
                {ESTADOS[e].label}
              </button>
            ))}
          </div>

          {/* Chat */}
          <div style={{ flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <h4 style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Conversación
            </h4>
            {mensajes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: C.gray500 }}>
                <MessageSquare size={28} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 13 }}>No hay mensajes aún</p>
              </div>
            ) : mensajes.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.autorRol === "admin" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "10px 14px",
                  borderRadius: m.autorRol === "admin" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.autorRol === "admin" ? `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})` : C.gray100,
                  color: m.autorRol === "admin" ? "#fff" : C.gray700,
                  fontSize: 13, lineHeight: 1.5,
                }}>
                  <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 10, opacity: 0.7 }}>
                    {m.autorRol === "admin" ? `🛡️ ${m.autorNombre}` : `👤 ${m.autorNombre}`}
                  </p>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.texto}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Formulario respuesta completa */}
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.gray100}`, background: `${C.purple}04` }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: C.gray700 }}>
              📝 Enviar respuesta al cliente
            </h4>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                value={precioRespuesta}
                onChange={e => setPrecioRespuesta(e.target.value)}
                placeholder="Precio total cotizado (ej: S/ 4,500.00)"
                style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.gray200}`, fontSize: 13, outline: "none" }}
                onFocus={e => e.target.style.borderColor = C.purple}
                onBlur={e => e.target.style.borderColor = C.gray200}
              />
            </div>
            <textarea
              value={notasAdmin}
              onChange={e => setNotasAdmin(e.target.value)}
              rows={3}
              placeholder="Escribe aquí tu respuesta completa: condiciones, tiempo de entrega, disponibilidad, etc."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.gray200}`, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = C.gray200}
            />
            <button onClick={enviarRespuestaCompleta} disabled={sending} style={{
              width: "100%", marginTop: 8, padding: "11px", borderRadius: 11,
              background: sending ? C.gray300 : `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
              color: "#fff", border: "none", fontSize: 13, fontWeight: 800,
              cursor: sending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: sending ? "none" : `0 4px 16px ${C.purple}40`,
            }}>
              <Send size={15} /> {sending ? "Enviando..." : "Enviar respuesta al cliente"}
            </button>
          </div>
        </div>

        {/* Input chat rápido */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.gray100}`, display: "flex", gap: 8 }}>
          <input
            value={nuevoMsg}
            onChange={e => setNuevoMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarMensaje()}
            placeholder="Mensaje rápido..."
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.gray200}`, fontSize: 13, outline: "none" }}
          />
          <button onClick={() => enviarMensaje()} disabled={sending || !nuevoMsg.trim()} style={{
            padding: "9px 16px", borderRadius: 10, background: C.purple, color: "#fff",
            border: "none", cursor: "pointer", opacity: !nuevoMsg.trim() ? 0.5 : 1,
            display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700,
          }}>
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   PANEL DE NOTIFICACIONES
═══════════════════════════════════ */
function PanelNotificaciones({ cotizaciones, onVerCot, onClose }: {
  cotizaciones: Cotizacion[];
  onVerCot: (c: Cotizacion) => void;
  onClose: () => void;
}) {
  const noLeidas = cotizaciones.filter(c => !c.leidoPorAdmin);
  const recientes = [...cotizaciones]
    .sort((a, b) => {
      const fa = a.fecha?.toDate?.()?.getTime() ?? 0;
      const fb = b.fecha?.toDate?.()?.getTime() ?? 0;
      return fb - fa;
    })
    .slice(0, 15);

  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0, width: 360,
      background: C.white, borderRadius: 16, border: `1px solid ${C.gray200}`,
      boxShadow: "0 20px 60px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden",
    }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.gray100}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bell size={15} style={{ color: C.purple }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.gray900 }}>Cotizaciones</span>
          {noLeidas.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, background: C.orange, color: "#fff", padding: "2px 7px", borderRadius: 20 }}>
              {noLeidas.length} nuevas
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray500 }}>
          <X size={15} />
        </button>
      </div>
      <div style={{ maxHeight: 380, overflowY: "auto" }}>
        {recientes.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: C.gray500 }}>
            <Bell size={24} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 13 }}>Sin cotizaciones</p>
          </div>
        ) : recientes.map(c => (
          <div key={c.id}
            onClick={() => { onVerCot(c); onClose(); }}
            style={{
              padding: "12px 18px", borderBottom: `1px solid ${C.gray100}`,
              cursor: "pointer", background: !c.leidoPorAdmin ? `${C.purple}06` : C.white,
              transition: "background .1s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = `${C.purple}08`}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = !c.leidoPorAdmin ? `${C.purple}06` : C.white}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: !c.leidoPorAdmin ? `${C.purple}15` : C.gray100, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {!c.leidoPorAdmin
                  ? <Zap size={16} style={{ color: C.purple }} />
                  : <FileText size={16} style={{ color: C.gray500 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.gray900 }}>{c.numero}</span>
                  <EstadoBadge estado={c.estado} />
                </div>
                <p style={{ margin: "2px 0", fontSize: 12, color: C.gray700, fontWeight: 600 }}>{c.clienteNombre}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>
                  {c.lineas?.length || 0} producto(s) ·{" "}
                  {c.fecha?.toDate ? c.fecha.toDate().toLocaleDateString("es-PE") : "—"}
                </p>
                {c.ultimoMensaje && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: C.purple, display: "flex", alignItems: "center", gap: 4 }}>
                    <MessageSquare size={10} /> {c.ultimoMensaje.slice(0, 45)}{c.ultimoMensaje.length > 45 ? "..." : ""}
                  </p>
                )}
              </div>
              {!c.leidoPorAdmin && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.purple, flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   PÁGINA PRINCIPAL ADMIN
═══════════════════════════════════ */
export default function CotizacionesAdmin() {
  const [cotizaciones, setCotizaciones]   = useState<Cotizacion[]>([]);
  const [loading, setLoading]             = useState(true);
  const [detalle, setDetalle]             = useState<Cotizacion | null>(null);
  const [filtroEstado, setFiltroEstado]   = useState("todos");
  const [searchTerm, setSearchTerm]       = useState("");
  const [showNotif, setShowNotif]         = useState(false);
  const [showCrear, setShowCrear]         = useState(false);
  const notifRef                          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const cargar = useCallback(() => {
    setLoading(true);
    const q = query(collection(db, "cotizaciones"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, snap => {
      setCotizaciones(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cotizacion)));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = cargar();
    return () => unsub();
  }, [cargar]);

  // Si tenemos detalle abierto, actualizarlo cuando cambie la lista
  useEffect(() => {
    if (detalle) {
      const updated = cotizaciones.find(c => c.id === detalle.id);
      if (updated) setDetalle(updated);
    }
  }, [cotizaciones]);

  const noLeidasCount = cotizaciones.filter(c => !c.leidoPorAdmin).length;

  const filtradas = cotizaciones.filter(c => {
    const matchSearch =
      c.clienteEmpresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clienteEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filtroEstado === "todos" ? true : c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const stats = {
    total:     cotizaciones.length,
    pendiente: cotizaciones.filter(c => c.estado === "pendiente").length,
    enRevision:cotizaciones.filter(c => c.estado === "en_revision").length,
    respondida:cotizaciones.filter(c => c.estado === "respondida").length,
    noLeidas:  noLeidasCount,
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }} className="dash-in">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.purple, textDecoration: "none", fontWeight: 600 }}>
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.gray900, margin: 0, letterSpacing: "-0.04em" }}>
            Cotizaciones
          </h1>
          <p style={{ fontSize: 13, color: C.gray500, margin: "4px 0 0" }}>
            Gestiona y responde solicitudes de cotización de clientes
          </p>
        </div>

        {/* Botón notificaciones */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div ref={notifRef} style={{ position: "relative" }}>
            <button onClick={() => setShowNotif(v => !v)} style={{
              position: "relative", width: 44, height: 44, borderRadius: 12,
              border: `1.5px solid ${noLeidasCount > 0 ? C.purple : C.gray200}`,
              background: noLeidasCount > 0 ? `${C.purple}08` : C.white,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              transition: "all .2s",
            }}>
              <Bell size={18} style={{ color: noLeidasCount > 0 ? C.purple : C.gray500 }} />
              {noLeidasCount > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -6, minWidth: 18, height: 18,
                  background: C.orange, color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                  animation: "bell-pulse 2s ease-in-out infinite",
                }}>
                  {noLeidasCount}
                </span>
              )}
            </button>
            {showNotif && (
              <PanelNotificaciones
                cotizaciones={cotizaciones}
                onVerCot={c => setDetalle(c)}
                onClose={() => setShowNotif(false)}
              />
            )}
          </div>

          <button onClick={() => setShowCrear(true)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            borderRadius: 12, background: C.white,
            color: C.purple, border: `1.5px solid ${C.purple}`, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            <Plus size={15} /> Nueva Cotización
          </button>

          <button onClick={cargar} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            borderRadius: 12, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
            color: C.white, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: `0 4px 14px ${C.purple}40`,
          }}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total",       val: stats.total,      bg: C.gray50,         color: C.gray700,  border: C.gray200 },
          { label: "Pendientes",  val: stats.pendiente,  bg: "#fef3c7",        color: "#92400e",  border: "#fde68a" },
          { label: "En revisión", val: stats.enRevision, bg: `${C.purple}10`,  color: C.purple,   border: `${C.purple}25` },
          { label: "Respondidas", val: stats.respondida, bg: "#d1fae510",      color: "#065f46",  border: "#6ee7b730" },
          { label: "Sin leer",    val: stats.noLeidas,   bg: `${C.orange}12`,  color: C.orange,   border: `${C.orange}30` },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: "16px 18px", border: `1px solid ${s.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: s.color, margin: 0 }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.gray300 }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, número, email..."
            style={{ width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: `1.5px solid ${C.gray200}`, fontSize: 14, outline: "none", color: C.gray900 }}
            onFocus={e => { e.target.style.borderColor = C.purple; e.target.style.boxShadow = `0 0 0 3px ${C.purple}15`; }}
            onBlur={e => { e.target.style.borderColor = C.gray200; e.target.style.boxShadow = "none"; }}
          />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: "10px 16px", borderRadius: 12, border: `1.5px solid ${C.gray200}`, fontSize: 14, color: C.gray700, outline: "none", background: C.white, minWidth: 180 }}>
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="en_revision">En revisión</option>
          <option value="respondida">Respondidas</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background: C.white, borderRadius: 18, border: `1px solid ${C.gray200}`, overflow: "hidden", boxShadow: `0 4px 24px ${C.purple}06` }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
              {["", "N° Cotización", "Cliente", "Productos", "Estado", "Fecha", "Chat", "Acciones"].map((h, i) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: C.gray500, textAlign: i > 5 ? "right" : "left", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} style={{ padding: "16px" }}>
                      <div style={{ height: 14, borderRadius: 6, background: C.gray100, animation: "pulse 1.4s ease infinite", width: j === 0 ? "20px" : "70%" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "48px", textAlign: "center" }}>
                  <FileText size={40} style={{ margin: "0 auto 12px", color: C.gray300, display: "block" }} />
                  <p style={{ fontSize: 14, color: C.gray500, margin: 0 }}>
                    {searchTerm || filtroEstado !== "todos" ? "Sin resultados" : "No hay cotizaciones aún"}
                  </p>
                </td>
              </tr>
            ) : filtradas.map((c, idx) => (
              <tr key={c.id}
                style={{ borderBottom: idx < filtradas.length - 1 ? `1px solid ${C.gray100}` : "none", transition: "background .15s", background: !c.leidoPorAdmin ? `${C.purple}04` : C.white }}
                onMouseEnter={e => (e.currentTarget.style.background = "#faf9ff")}
                onMouseLeave={e => (e.currentTarget.style.background = !c.leidoPorAdmin ? `${C.purple}04` : C.white)}
              >
                {/* Indicador no leído */}
                <td style={{ padding: "14px 8px 14px 16px", width: 20 }}>
                  {!c.leidoPorAdmin && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.purple }} />
                  )}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>{c.numero}</span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.purple}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={15} style={{ color: C.purple }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.gray900 }}>{c.clienteNombre}</div>
                      <div style={{ fontSize: 11, color: C.gray500 }}>{c.clienteEmail}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontSize: 13, color: C.gray700 }}>{c.lineas?.length || 0} productos</span>
                  {c.comentario && (
                    <div style={{ fontSize: 11, color: C.gray500, marginTop: 2, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      "{c.comentario}"
                    </div>
                  )}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <EstadoBadge estado={c.estado} />
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontSize: 12, color: C.gray500 }}>
                    {c.fecha?.toDate ? c.fecha.toDate().toLocaleDateString("es-PE") : "—"}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {(c.mensajes?.length || 0) > 0 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.purple, background: `${C.purple}10`, padding: "3px 9px", borderRadius: 20, fontWeight: 700 }}>
                      <MessageSquare size={11} /> {c.mensajes?.length}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: C.gray300 }}>—</span>
                  )}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                  <button
                    onClick={() => setDetalle(c)}
                    style={{
                      padding: "7px 16px", borderRadius: 9,
                      background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
                      color: C.white, border: "none", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                      boxShadow: `0 3px 10px ${C.purple}30`,
                    }}>
                    Ver <ChevronRight size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panel detalle */}
      {detalle && (
        <PanelDetalle
          cot={detalle}
          onClose={() => setDetalle(null)}
          onUpdate={() => {}}
        />
      )}

      {/* Modal crear cotización admin */}
      {showCrear && (
        <ModalCrearCotAdmin
          onClose={() => setShowCrear(false)}
          onSaved={() => {}}
        />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes dashIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100%{opacity:1}50%{opacity:.5} }
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes bell-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        .dash-in { animation: dashIn .4s cubic-bezier(.4,0,.2,1); }
        .spin    { animation: spin .75s linear infinite; }
      `}</style>
    </div>
  );
}