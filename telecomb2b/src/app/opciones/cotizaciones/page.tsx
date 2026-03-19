"use client";
// src/app/opciones/cotizaciones/page.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy, onSnapshot, where,
} from "firebase/firestore";
import {
  Plus, Search, FileText, CheckCircle, XCircle, Clock,
  Send, Package, X, Trash2, ChevronRight, MessageSquare,
  Eye, AlertCircle, Star, Filter, ShoppingBag, ArrowLeft,
  Zap, Shield, ChevronDown, Building2, Hash,
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
  id?: string;
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
  estado: "pendiente" | "en_revision" | "respondida" | "aprobada" | "rechazada";
  fecha: any;
  mensajes?: MensajeChat[];
  respuestaAdmin?: string;
  fechaRespuesta?: any;
  // campos opcionales que el admin puede poner al responder
  totalEstimado?: number;
  notas?: string;
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
  imagen_principal?: string;
  marca?: string;
  categoria_id?: string;
  capacidad_almacenamiento?: string;
  capacidad_ram?: string;
  color?: string;
  estado?: string;
}

/* ─── PALETA ─── */
const V = "#7c3aed";
const O = "#FF6600";

const ESTADOS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pendiente:    { label: "Pendiente",    color: "#92400e", bg: "#fef3c7", icon: Clock },
  en_revision:  { label: "En revisión",  color: V,         bg: "#f5f3ff", icon: Eye },
  respondida:   { label: "Respondida",   color: "#065f46", bg: "#d1fae5", icon: MessageSquare },
  aprobada:     { label: "Aprobada",     color: "#065f46", bg: "#d1fae5", icon: CheckCircle },
  rechazada:    { label: "Rechazada",    color: "#991b1b", bg: "#fee2e2", icon: XCircle },
};

const fmtPEN = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n || 0);

/* ─── BADGE ESTADO ─── */
const EstadoBadge = ({ estado }: { estado: string }) => {
  const e = ESTADOS[estado] ?? ESTADOS.pendiente;
  const Icon = e.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: e.bg, color: e.color,
    }}>
      <Icon size={11} /> {e.label}
    </span>
  );
};

/* ═══════════════════════════════════
   MODAL: NUEVA COTIZACIÓN
═══════════════════════════════════ */
function ModalNuevaCotizacion({ onClose, onSaved, user }: {
  onClose: () => void;
  onSaved: () => void;
  user: any;
}) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("todas");
  const [lineas, setLineas] = useState<LineaCot[]>([]);
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [paso, setPaso] = useState<"catalogo" | "resumen">("catalogo");
  const [loadingProds, setLoadingProds] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "productos"))).then(snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Producto))
        .filter(p => p.estado === "Activo" || !p.estado);
      setProductos(docs);
      setLoadingProds(false);
    });
  }, []);

  const marcas = ["todas", ...Array.from(new Set(productos.map(p => p.marca).filter(Boolean)))];

  const prodsFiltrados = productos.filter(p => {
    const nombre = (p.nombre_producto || p.nombre || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();
    const marca = (p.marca || "").toLowerCase();
    const busq = busqueda.toLowerCase();
    const matchBusq = nombre.includes(busq) || sku.includes(busq) || marca.includes(busq);
    const matchMarca = filtroMarca === "todas" || p.marca === filtroMarca;
    return matchBusq && matchMarca;
  });

  const agregarProducto = (p: Producto) => {
    const existe = lineas.find(l => l.productoId === p.id);
    if (existe) {
      setLineas(ls => ls.map(l => l.productoId === p.id ? { ...l, cantidad: l.cantidad + 1 } : l));
    } else {
      setLineas(ls => [...ls, {
        productoId: p.id,
        nombre: p.nombre_producto || p.nombre || "",
        sku: p.sku || "",
        cantidad: 1,
        precio: p.precio_caja || p.precio_unitario || 0,
        imagen: p.imagen_principal || "",
        marca: p.marca || "",
      }]);
    }
  };

  const quitarProducto = (id: string) => setLineas(ls => ls.filter(l => l.productoId !== id));
  const setCantidad = (id: string, cant: number) => {
    if (cant < 1) return;
    setLineas(ls => ls.map(l => l.productoId === id ? { ...l, cantidad: cant } : l));
  };

  const estaAgregado = (id: string) => lineas.some(l => l.productoId === id);
  const getCantidad = (id: string) => lineas.find(l => l.productoId === id)?.cantidad || 0;

  const handleEnviar = async () => {
    if (lineas.length === 0) { alert("Agrega al menos un producto"); return; }
    setSaving(true);
    try {
      const userData = user;
      await addDoc(collection(db, "cotizaciones"), {
        numero: `COT-${Date.now().toString().slice(-7)}`,
        clienteId: userData?.uid || "",
        clienteNombre: userData?.displayName || userData?.email?.split("@")[0] || "Cliente",
        clienteEmail: userData?.email || "",
        clienteEmpresa: "",
        lineas,
        comentario,
        estado: "pendiente",
        fecha: serverTimestamp(),
        mensajes: [],
        leidoPorAdmin: false,
        leidoPorCliente: true,
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error al enviar cotización");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "20px", overflowY: "auto",
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, width: "100%", maxWidth: 920,
        boxShadow: "0 32px 80px rgba(0,0,0,0.2)", marginTop: 16, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px", borderBottom: "1px solid #f3f4f6",
          background: `linear-gradient(135deg, ${V}08, #fff)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {paso === "resumen" && (
              <button onClick={() => setPaso("catalogo")} style={{ marginRight: 4, cursor: "pointer", background: "none", border: "none", display: "flex", alignItems: "center", color: V }}>
                <ArrowLeft size={18} />
              </button>
            )}
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${V}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {paso === "catalogo" ? <ShoppingBag size={20} style={{ color: V }} /> : <FileText size={20} style={{ color: V }} />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111827" }}>
                {paso === "catalogo" ? "Selecciona productos" : "Confirmar cotización"}
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                {paso === "catalogo"
                  ? `${lineas.length} producto(s) seleccionado(s)`
                  : "Revisa y envía tu solicitud"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {paso === "catalogo" && lineas.length > 0 && (
              <button onClick={() => setPaso("resumen")} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 20px",
                borderRadius: 12, background: `linear-gradient(135deg, ${V}, #5b21b6)`,
                color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                Continuar <ChevronRight size={15} />
              </button>
            )}
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb",
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <X size={18} style={{ color: "#6b7280" }} />
            </button>
          </div>
        </div>

        {/* PASO 1: Catálogo */}
        {paso === "catalogo" && (
          <div style={{ display: "flex", height: 580 }}>
            {/* Lista productos */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #f3f4f6" }}>
              {/* Búsqueda y filtro */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 10 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre, marca, SKU..."
                    style={{
                      width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                      borderRadius: 11, border: "1.5px solid #e5e7eb", fontSize: 13, outline: "none", color: "#111827",
                    }}
                  />
                </div>
                <select
                  value={filtroMarca}
                  onChange={e => setFiltroMarca(e.target.value)}
                  style={{
                    padding: "9px 12px", borderRadius: 11, border: "1.5px solid #e5e7eb",
                    fontSize: 13, color: "#374151", outline: "none", background: "#fff", minWidth: 130,
                  }}>
                  {marcas.map(m => <option key={m} value={m}>{m === "todas" ? "Todas las marcas" : m}</option>)}
                </select>
              </div>

              {/* Grid productos */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                {loadingProds ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} style={{ height: 160, borderRadius: 14, background: "#f3f4f6", animation: "pulse 1.4s ease infinite" }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    {prodsFiltrados.map(p => {
                      const agregado = estaAgregado(p.id);
                      const cant = getCantidad(p.id);
                      return (
                        <div key={p.id} style={{
                          borderRadius: 14, border: agregado ? `2px solid ${V}` : "1.5px solid #e5e7eb",
                          padding: 14, background: agregado ? `${V}05` : "#fafafa",
                          transition: "all .15s", cursor: "pointer", position: "relative",
                        }}
                          onClick={() => agregarProducto(p)}
                        >
                          {agregado && (
                            <div style={{
                              position: "absolute", top: 10, right: 10,
                              background: V, color: "#fff", borderRadius: 20, fontSize: 10,
                              fontWeight: 800, padding: "2px 8px",
                            }}>×{cant}</div>
                          )}
                          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <div style={{
                              width: 52, height: 52, borderRadius: 10, background: "#f3f4f6",
                              flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {p.imagen_principal
                                ? <img src={p.imagen_principal} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                : <Package size={20} style={{ color: "#d1d5db" }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: O, marginBottom: 2 }}>
                                {p.marca} · {p.categoria_id}
                              </p>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
                                {p.nombre_producto || p.nombre}
                              </p>
                              <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                                {p.capacidad_almacenamiento && (
                                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#111827", color: "#fff" }}>
                                    {p.capacidad_almacenamiento}
                                  </span>
                                )}
                                {p.capacidad_ram && (
                                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#fef08a", color: "#713f12" }}>
                                    {p.capacidad_ram}
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>
                                SKU: {p.sku || "—"} · Stock: {p.stock_cajas ?? p.stock_unidades ?? 0}
                              </p>
                            </div>
                          </div>
                          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: V }}>
                              {fmtPEN(p.precio_caja || p.precio_unitario || 0)}
                            </span>
                            <button style={{
                              padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                              background: agregado ? `${V}15` : `${V}`, color: agregado ? V : "#fff",
                              border: agregado ? `1px solid ${V}40` : "none", cursor: "pointer",
                            }}
                              onClick={e => { e.stopPropagation(); agregarProducto(p); }}>
                              {agregado ? "Agregar más" : "+ Agregar"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {prodsFiltrados.length === 0 && (
                      <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#9ca3af" }}>
                        <Search size={32} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
                        <p style={{ margin: 0, fontSize: 14 }}>Sin resultados</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Panel derecho: seleccionados */}
            <div style={{ width: 280, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#374151" }}>
                  Productos seleccionados ({lineas.length})
                </h4>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                {lineas.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                    <Package size={28} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
                    <p style={{ margin: 0, fontSize: 12 }}>Haz clic en productos para agregarlos</p>
                  </div>
                ) : lineas.map(l => (
                  <div key={l.productoId} style={{
                    padding: "10px 12px", borderRadius: 10, background: "#f9fafb",
                    border: "1px solid #e5e7eb", marginBottom: 8,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111827", lineHeight: 1.3, flex: 1 }}>
                        {l.nombre}
                      </p>
                      <button onClick={() => quitarProducto(l.productoId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", flexShrink: 0, padding: 2 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <button onClick={() => setCantidad(l.productoId, l.cantidad - 1)} style={{
                        width: 24, height: 24, borderRadius: 6, border: "1px solid #d1d5db",
                        background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", minWidth: 20, textAlign: "center" }}>{l.cantidad}</span>
                      <button onClick={() => setCantidad(l.productoId, l.cantidad + 1)} style={{
                        width: 24, height: 24, borderRadius: 6, border: "1px solid #d1d5db",
                        background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>+</button>
                      <span style={{ fontSize: 11, color: "#6b7280", marginLeft: "auto" }}>{fmtPEN(l.precio)}/u</span>
                    </div>
                  </div>
                ))}
              </div>
              {lineas.length > 0 && (
                <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6" }}>
                  <button onClick={() => setPaso("resumen")} style={{
                    width: "100%", padding: "11px", borderRadius: 12,
                    background: `linear-gradient(135deg, ${V}, #5b21b6)`,
                    color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    Revisar y enviar <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 2: Resumen y envío */}
        {paso === "resumen" && (
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Lista resumen */}
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "#374151" }}>
                Productos en tu solicitud
              </h3>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["Producto", "Marca", "SKU", "Cantidad", "Precio ref."].map(h => (
                        <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, i) => (
                      <tr key={l.productoId} style={{ borderBottom: i < lineas.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f3f4f6", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {l.imagen
                                ? <img src={l.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                : <Package size={16} style={{ color: "#d1d5db" }} />}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{l.nombre}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#6b7280" }}>{l.marca || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>{l.sku || "—"}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => setCantidad(l.productoId, l.cantidad - 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 700 }}>−</button>
                            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{l.cantidad}</span>
                            <button onClick={() => setCantidad(l.productoId, l.cantidad + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 700 }}>+</button>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: V }}>
                          {fmtPEN(l.precio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comentario */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8 }}>
                💬 Comentario o especificaciones adicionales
              </label>
              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={4}
                placeholder="Ej: Necesito cotización para 5 unidades del Samsung S24, con entrega en Lima Centro. También me interesa saber si tienen el modelo en color negro. ¿Incluye accesorios?"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  border: "1.5px solid #e5e7eb", fontSize: 13, resize: "vertical",
                  outline: "none", color: "#111827", lineHeight: 1.6, boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = V}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>

            {/* Info */}
            <div style={{
              background: "#f0fdf4", borderRadius: 12, padding: "14px 16px",
              border: "1px solid #bbf7d0", display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <Shield size={16} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#065f46" }}>Tu solicitud es 100% segura</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#059669" }}>
                  Un asesor revisará tu cotización y te responderá con precios exactos y condiciones de compra. Recibirás una notificación cuando tengamos respuesta.
                </p>
              </div>
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleEnviar} disabled={saving} style={{
                padding: "11px 28px", borderRadius: 12,
                background: saving ? "#d1d5db" : `linear-gradient(135deg, ${V}, #5b21b6)`,
                color: "#fff", border: "none", fontSize: 13, fontWeight: 800,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: saving ? "none" : `0 6px 20px ${V}40`,
              }}>
                <Send size={15} />
                {saving ? "Enviando..." : "Enviar solicitud de cotización"}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

/* ═══════════════════════════════════
   MODAL: VER DETALLE Y CHAT (MEJORADO)
═══════════════════════════════════ */
function ModalDetalle({ cot, onClose, user }: { cot: Cotizacion; onClose: () => void; user: any }) {
  const [cotData, setCotData]   = useState<any>({ ...cot });
  const [mensajes, setMensajes] = useState<MensajeChat[]>(cot.mensajes || []);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [sending, setSending]   = useState(false);
  const chatEndRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Marcar como leída por cliente
    updateDoc(doc(db, "cotizaciones", cot.id), { leidoPorCliente: true }).catch(() => {});
    const unsub = onSnapshot(doc(db, "cotizaciones", cot.id), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setCotData({ id: snap.id, ...d });
        setMensajes(d.mensajes || []);
      }
    });
    return () => unsub();
  }, [cot.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviarMensaje = async () => {
    if (!nuevoMsg.trim()) return;
    setSending(true);
    const msg: MensajeChat = {
      texto: nuevoMsg.trim(),
      autorRol: "cliente",
      autorNombre: user?.displayName || user?.email?.split("@")[0] || "Cliente",
      fecha: new Date(),
    };
    try {
      const updMsgs = [...mensajes, msg];
      await updateDoc(doc(db, "cotizaciones", cot.id), {
        mensajes: updMsgs,
        leidoPorAdmin: false,
        ultimoMensaje: nuevoMsg.trim(),
        ultimoMensajeFecha: serverTimestamp(),
      });
      setNuevoMsg("");
    } catch (e) { alert("Error al enviar"); }
    finally { setSending(false); }
  };

  // Detectar si esta cot fue creada por admin (tiene precios y descuentos)
  const lineasDetalle: any[] = cotData.lineasDetalle || cotData.lineas || [];
  const esCotAdmin = cotData.creadoPorAdmin === true;
  const subtotal   = cotData.subtotal || 0;
  const igv        = cotData.igv || 0;
  const total      = cotData.total || 0;
  const tieneTotal = total > 0;

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>
      {children}
    </p>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 22, width: "100%", maxWidth: 760, maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.22)" }}>

        {/* ── Header ── */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", background: cotData.estado === "respondida" || esCotAdmin ? `linear-gradient(135deg,${V}08,#fff)` : "#fff" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Hash size={13} style={{ color: V }} />
              <span style={{ fontSize: 15, fontWeight: 900, color: "#111827" }}>{cotData.numero}</span>
              <EstadoBadge estado={cotData.estado} />
              {esCotAdmin && (
                <span style={{ fontSize: 10, fontWeight: 800, background: `${V}15`, color: V, padding: "2px 8px", borderRadius: 20 }}>
                  ✨ Cotización del asesor
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
              Solicitada el {cotData.fecha?.toDate ? cotData.fecha.toDate().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} style={{ color: "#6b7280" }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── SECCIÓN COTIZACIÓN OFICIAL (solo si admin la creó o respondió con precio) ── */}
          {tieneTotal && (
            <div style={{ margin: "16px 24px 0", borderRadius: 16, overflow: "hidden", border: `1.5px solid ${V}25` }}>
              {/* Banner precio */}
              <div style={{ background: `linear-gradient(135deg,${V},#5b21b6)`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={16} style={{ color: "#fff" }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>COTIZACIÓN OFICIAL</p>
                    <p style={{ margin: 0, fontSize: 13, color: "#fff", fontWeight: 800 }}>Precio cotizado por Mundo Móvil</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.6)" }}>TOTAL</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff" }}>{fmtPEN(total)}</p>
                </div>
              </div>

              {/* Tabla productos con descuentos */}
              <div style={{ background: "#fff" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["Producto", "Cant.", "Precio unit.", "Descuento", "Subtotal"].map(h => (
                        <th key={h} style={{ padding: "9px 14px", fontSize: 10, fontWeight: 800, color: "#9ca3af", textAlign: "left", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineasDetalle.map((l: any, i: number) => {
                      const desc      = l.descuento || 0;
                      const precioU   = l.precio || 0;
                      const precioFin = precioU * (1 - desc / 100);
                      const subtot    = l.subtotal || (precioFin * l.cantidad);
                      return (
                        <tr key={i} style={{ borderBottom: i < lineasDetalle.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f3f4f6", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {l.imagen ? <img src={l.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Package size={14} style={{ color: "#d1d5db" }} />}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>{l.nombre}</p>
                                <p style={{ margin: 0, fontSize: 10, color: "#9ca3af" }}>{l.marca && `${l.marca} · `}SKU: {l.sku || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#374151", background: "#f3f4f6", padding: "3px 10px", borderRadius: 20 }}>×{l.cantidad}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#374151" }}>{fmtPEN(precioFin)}</p>
                              {desc > 0 && <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>{fmtPEN(precioU)}</p>}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {desc > 0 ? (
                              <span style={{ fontSize: 12, fontWeight: 800, background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: 20 }}>
                                🏷️ {desc}% OFF
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#d1d5db" }}>Sin descuento</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontSize: 14, fontWeight: 900, color: V }}>{fmtPEN(subtot)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totales */}
                <div style={{ padding: "14px 20px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>Subtotal</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{fmtPEN(subtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>IGV (18%)</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{fmtPEN(igv)}</span>
                    </div>
                    {/* Ahorro total */}
                    {lineasDetalle.some((l: any) => (l.descuento || 0) > 0) && (() => {
                      const ahorro = lineasDetalle.reduce((a: number, l: any) => {
                        const desc = l.descuento || 0;
                        return a + (l.precio * l.cantidad * desc / 100);
                      }, 0);
                      return ahorro > 0 ? (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: 8, background: "#fef3c720", border: "1px solid #fde68a" }}>
                          <span style={{ fontSize: 12, color: "#92400e", fontWeight: 700 }}>🎉 Tu ahorro total</span>
                          <span style={{ fontSize: 13, fontWeight: 900, color: "#92400e" }}>{fmtPEN(ahorro)}</span>
                        </div>
                      ) : null;
                    })()}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #e5e7eb", paddingTop: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: "#111827" }}>TOTAL</span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: V }}>{fmtPEN(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Productos solicitados (si NO es cot admin con detalle) ── */}
          {!tieneTotal && (
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
              <SectionLabel>Productos solicitados</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(cotData.lineas || []).map((l: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e5e7eb", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {l.imagen ? <img src={l.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Package size={14} style={{ color: "#d1d5db" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{l.nombre}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>SKU: {l.sku} · Precio ref: {fmtPEN(l.precio)}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: V, background: `${V}10`, padding: "3px 10px", borderRadius: 20 }}>×{l.cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tu comentario ── */}
          {cotData.comentario && (
            <div style={{ padding: "14px 24px", borderBottom: "1px solid #f3f4f6" }}>
              <SectionLabel>Tu comentario</SectionLabel>
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6, background: "#f9fafb", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                {cotData.comentario}
              </p>
            </div>
          )}

          {/* ── Conversación ── */}
          <div style={{ padding: "16px 24px 8px" }}>
            <SectionLabel>Conversación</SectionLabel>
            {mensajes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: "#9ca3af" }}>
                <MessageSquare size={28} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 13 }}>Cuando el asesor responda, aparecerá aquí.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mensajes.map((m, i) => {
                  const esAdmin = m.autorRol === "admin";
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: esAdmin ? "flex-start" : "flex-end", gap: 8, alignItems: "flex-end" }}>
                      {esAdmin && (
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${V}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                          <span style={{ fontSize: 12 }}>🛡️</span>
                        </div>
                      )}
                      <div style={{
                        maxWidth: "75%", padding: "11px 15px",
                        borderRadius: esAdmin ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                        background: esAdmin ? "#f3f4f6" : `linear-gradient(135deg,${V},#5b21b6)`,
                        color: esAdmin ? "#374151" : "#fff",
                        fontSize: 13, lineHeight: 1.6,
                        boxShadow: esAdmin ? "none" : `0 4px 12px ${V}30`,
                      }}>
                        <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 700, opacity: 0.6 }}>
                          {esAdmin ? "Asesor Mundo Móvil" : "Tú"}
                        </p>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.texto}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── Input mensaje ── */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, background: "#fafafa" }}>
          <input
            value={nuevoMsg}
            onChange={e => setNuevoMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarMensaje()}
            placeholder="Escribe un mensaje o pregunta adicional..."
            style={{ flex: 1, padding: "10px 14px", borderRadius: 11, border: "1.5px solid #e5e7eb", fontSize: 13, outline: "none", color: "#111827", background: "#fff" }}
            onFocus={e => e.target.style.borderColor = V}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          />
          <button onClick={enviarMensaje} disabled={sending || !nuevoMsg.trim()} style={{
            padding: "10px 20px", borderRadius: 11,
            background: (!nuevoMsg.trim() || sending) ? "#e5e7eb" : `linear-gradient(135deg,${V},#5b21b6)`,
            color: (!nuevoMsg.trim() || sending) ? "#9ca3af" : "#fff",
            border: "none", cursor: (!nuevoMsg.trim() || sending) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700,
            transition: "all .2s",
          }}>
            <Send size={14} /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════ */
export default function CotizacionesClientePage() {
  const [user, setUser] = useState<any>(null);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNueva, setShowNueva] = useState(false);
  const [detalle, setDetalle] = useState<Cotizacion | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "cotizaciones"),
      where("clienteId", "==", user.uid),
      orderBy("fecha", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setCotizaciones(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cotizacion)));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const tieneNoLeidas = cotizaciones.some(c => c.estado === "respondida" && !(c as any).leidoPorCliente);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111827", margin: 0, letterSpacing: "-0.03em" }}>
            Mis Cotizaciones
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            Solicita precios y condiciones personalizadas
          </p>
        </div>
        <button onClick={() => setShowNueva(true)} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
          borderRadius: 13, background: `linear-gradient(135deg, ${V}, #5b21b6)`,
          color: "#fff", border: "none", fontSize: 13, fontWeight: 800,
          cursor: "pointer", boxShadow: `0 6px 20px ${V}40`,
        }}>
          <Plus size={16} /> Nueva cotización
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total", val: cotizaciones.length, color: "#374151", bg: "#f9fafb" },
          { label: "Pendientes", val: cotizaciones.filter(c => c.estado === "pendiente" || c.estado === "en_revision").length, color: "#92400e", bg: "#fef3c7" },
          { label: "Respondidas", val: cotizaciones.filter(c => c.estado === "respondida").length, color: "#065f46", bg: "#d1fae5" },
          { label: "Aprobadas", val: cotizaciones.filter(c => c.estado === "aprobada").length, color: V, bg: `${V}12` },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0 }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 90, borderRadius: 14, background: "#f3f4f6", animation: "pulse 1.4s ease infinite" }} />
          ))}
        </div>
      ) : cotizaciones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", border: "2px dashed #e5e7eb", borderRadius: 20 }}>
          <FileText size={44} style={{ margin: "0 auto 12px", color: "#d1d5db", display: "block" }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No tienes cotizaciones aún</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 20px" }}>
            Solicita precios personalizados para los productos que te interesan
          </p>
          <button onClick={() => setShowNueva(true)} style={{
            padding: "11px 24px", borderRadius: 12, background: V, color: "#fff",
            border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            Crear primera cotización
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cotizaciones.map(c => (
            <div key={c.id} style={{
              background: "#fff", borderRadius: 16, border: "1.5px solid #e5e7eb",
              padding: "16px 20px", display: "flex", alignItems: "center", gap: 16,
              transition: "all .15s", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
              onClick={() => setDetalle(c)}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${V}50`; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${V}12`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${V}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={20} style={{ color: V }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{c.numero}</span>
                  <EstadoBadge estado={c.estado} />
                  {(c as any).leidoPorAdmin === false && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: O, color: "#fff", padding: "2px 7px", borderRadius: 10 }}>NUEVA</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                  {c.lineas?.length || 0} producto(s) · {c.fecha?.toDate ? c.fecha.toDate().toLocaleDateString("es-PE") : "—"}
                  {c.comentario && ` · "${c.comentario.slice(0, 50)}${c.comentario.length > 50 ? "..." : ""}"`}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(c.mensajes?.length || 0) > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "4px 10px", borderRadius: 20 }}>
                    <MessageSquare size={12} /> {c.mensajes?.length}
                  </span>
                )}
                <button style={{
                  padding: "7px 14px", borderRadius: 9, background: `${V}10`,
                  color: V, border: `1px solid ${V}25`, fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>
                  Ver detalle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNueva && (
        <ModalNuevaCotizacion
          onClose={() => setShowNueva(false)}
          onSaved={() => {}}
          user={user}
        />
      )}
      {detalle && (
        <ModalDetalle
          cot={detalle}
          onClose={() => setDetalle(null)}
          user={user}
        />
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}