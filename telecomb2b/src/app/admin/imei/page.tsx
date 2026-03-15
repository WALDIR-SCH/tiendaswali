"use client";
import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy, onSnapshot, where,
} from "firebase/firestore";
import Link from "next/link";
import {
  ArrowLeft, Plus, Search, Smartphone, CheckCircle,
  XCircle, Package, RefreshCw, X, Upload, AlertTriangle,
} from "lucide-react";

/* ─── TIPOS ─── */
interface RegistroIMEI {
  id: string;
  imei: string;
  imei2?: string;
  productoId: string;
  productoNombre: string;
  productoPrecio: number;
  sku: string;
  marca: string;
  modelo: string;
  color: string;
  almacenamiento: string;
  lote: string;
  estado: "disponible" | "vendido" | "reservado" | "garantia" | "defectuoso";
  pedidoId?: string;
  clienteId?: string;
  clienteNombre?: string;
  fechaIngreso: any;
  fechaVenta?: any;
  garantiaMeses: number;
  notas: string;
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
  purple:"#9851F9", purpleDark:"#7C35E0",
  green:"#28FB4B",  yellow:"#F6FA00", orange:"#FF6600",
  white:"#FFFFFF",  gray50:"#f9fafb", gray100:"#f3f4f6",
  gray200:"#e5e7eb",gray500:"#6b7280",gray700:"#374151",gray900:"#111827",
  red:"#dc2626",    redLight:"#fef2f2",
};

const ESTADO_MAP: Record<string, { label:string; bg:string; color:string; border:string; dot:string }> = {
  disponible: { label:"Disponible",  bg:`${C.green}12`,  color:"#16a34a", border:`${C.green}30`, dot:C.green  },
  vendido:    { label:"Vendido",     bg:`${C.purple}10`, color:C.purple,  border:`${C.purple}28`,dot:C.purple },
  reservado:  { label:"Reservado",   bg:`${C.yellow}18`, color:"#a09600", border:`${C.yellow}40`,dot:C.yellow },
  garantia:   { label:"En Garantía", bg:`${C.orange}12`, color:C.orange,  border:`${C.orange}30`,dot:C.orange },
  defectuoso: { label:"Defectuoso",  bg:C.redLight,      color:C.red,     border:"#fecaca",      dot:C.red    },
};

const EstadoBadge = ({ estado }: { estado: string }) => {
  const e = ESTADO_MAP[estado] ?? ESTADO_MAP.disponible;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:e.bg, color:e.color, border:`1px solid ${e.border}` }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:e.dot, flexShrink:0, display:"inline-block" }} />
      {e.label}
    </span>
  );
};

/* ─── MODAL REGISTRAR IMEI ─── */
function ModalRegistrarIMEI({ onClose, onSaved }: { onClose:()=>void; onSaved:()=>void }) {
  const [productos,  setProductos]  = useState<Producto[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [modo,       setModo]       = useState<"uno"|"lote">("uno");
  const [loteTexto,  setLoteTexto]  = useState("");
  const [form, setForm] = useState({
    imei:"", imei2:"", productoId:"", productoNombre:"", productoPrecio:0,
    sku:"", marca:"", modelo:"", color:"", almacenamiento:"",
    lote:`LOTE-${new Date().toISOString().slice(0,7)}`,
    garantiaMeses:12, notas:"",
  });

  useEffect(() => {
    getDocs(collection(db, "productos")).then(snap => {
      setProductos(snap.docs.map(d => ({ id:d.id, ...d.data() } as Producto)));
    });
  }, []);

  const selectProducto = (p: Producto) => {
    setForm(f => ({
      ...f,
      productoId:     p.id,
      productoNombre: p.nombre_producto || p.nombre || "",
      productoPrecio: p.precio_unitario || 0,
      sku:            p.sku || "",
      marca:          p.marca || "",
      modelo:         p.modelo || "",
      color:          p.color || "",
      almacenamiento: p.capacidad_almacenamiento || "",
      garantiaMeses:  p.garantia_meses || 12,
    }));
  };

  const validateIMEI = (imei: string) => /^\d{15}$/.test(imei.replace(/\s/g,""));

  const handleSave = async () => {
    if (!form.productoId) { alert("Selecciona un producto"); return; }
    if (modo === "uno") {
      if (!validateIMEI(form.imei)) { alert("IMEI inválido — debe tener 15 dígitos"); return; }
      setSaving(true);
      try {
        await addDoc(collection(db, "imeis"), {
          ...form,
          imei:  form.imei.replace(/\s/g,""),
          imei2: form.imei2.replace(/\s/g,""),
          estado: "disponible",
          fechaIngreso: serverTimestamp(),
        });
        onSaved(); onClose();
      } catch (e: any) {
        if (e.code === "already-exists") alert("IMEI ya registrado");
        else alert("Error al guardar");
      } finally { setSaving(false); }
    } else {
      /* Modo lote */
      const lineas = loteTexto.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lineas.length === 0) { alert("Ingresa al menos un IMEI"); return; }
      const invalidos = lineas.filter(l => !validateIMEI(l.split(",")[0]));
      if (invalidos.length > 0) { alert(`IMEIs inválidos:\n${invalidos.join("\n")}`); return; }
      setSaving(true);
      try {
        await Promise.all(lineas.map(l => {
          const [imei, imei2] = l.split(",").map(x => x.trim());
          return addDoc(collection(db, "imeis"), {
            ...form, imei, imei2: imei2 || "",
            estado: "disponible",
            fechaIngreso: serverTimestamp(),
          });
        }));
        onSaved(); onClose();
      } catch { alert("Error al guardar lote"); }
      finally { setSaving(false); }
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:70, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:20, overflowY:"auto" }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:580, border:`1px solid ${C.gray200}`, boxShadow:"0 24px 80px rgba(0,0,0,0.18)", marginTop:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${C.gray100}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${C.purple}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Smartphone size={18} style={{ color:C.purple }} />
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:C.gray900 }}>Registrar IMEI</h3>
              <p style={{ margin:0, fontSize:12, color:C.gray500 }}>Ingreso de inventario</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:`1px solid ${C.gray200}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={16} style={{ color:C.gray500 }} />
          </button>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          {/* Modo */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {([["uno","📱 Individual"],["lote","📦 Por lote"]] as const).map(([m, l]) => (
              <button key={m} onClick={() => setModo(m)}
                style={{ padding:"10px", borderRadius:12, border:`1.5px solid ${modo===m?C.purple:C.gray200}`, background: modo===m?`${C.purple}08`:C.white, fontSize:13, fontWeight:700, color:modo===m?C.purple:C.gray700, cursor:"pointer" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Producto */}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Modelo / Producto *</label>
            <select value={form.productoId} onChange={e => { const p = productos.find(x => x.id===e.target.value); if(p) selectProducto(p); }}
              style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white }}>
              <option value="">— Selecciona modelo —</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre_producto || p.nombre}</option>)}
            </select>
          </div>

          {form.productoId && (
            <div style={{ padding:"12px 14px", borderRadius:12, background:`${C.purple}06`, border:`1px solid ${C.purple}15`, display:"flex", flexWrap:"wrap", gap:12 }}>
              {[["Marca",form.marca],["Modelo",form.modelo],["Color",form.color],["Almacenamiento",form.almacenamiento]].map(([k,v]) => v ? (
                <span key={k} style={{ fontSize:12, color:C.gray700 }}><strong>{k}:</strong> {v}</span>
              ) : null)}
            </div>
          )}

          {modo === "uno" ? (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>IMEI 1 * (15 dígitos)</label>
                  <input value={form.imei} onChange={e => setForm(f=>({...f,imei:e.target.value}))}
                    placeholder="353456789012345"
                    maxLength={15}
                    style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${form.imei&&!validateIMEI(form.imei)?"#dc2626":C.gray200}`, fontSize:14, fontFamily:"monospace", outline:"none", color:C.gray900 }}
                  />
                  {form.imei && !validateIMEI(form.imei) && (
                    <p style={{ margin:"4px 0 0", fontSize:11, color:C.red }}>⚠️ Debe tener 15 dígitos numéricos</p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>IMEI 2 (opcional)</label>
                  <input value={form.imei2} onChange={e => setForm(f=>({...f,imei2:e.target.value}))}
                    placeholder="Solo si es dual SIM"
                    maxLength={15}
                    style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, fontFamily:"monospace", outline:"none", color:C.gray900 }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>
                Lista de IMEIs (uno por línea, o IMEI1,IMEI2 para dual SIM)
              </label>
              <textarea value={loteTexto} onChange={e => setLoteTexto(e.target.value)} rows={8}
                placeholder={"353456789012345\n353456789012346\n353456789012347,353456789012348"}
                style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:13, fontFamily:"monospace", outline:"none", resize:"vertical", color:C.gray900 }}
              />
              <p style={{ margin:"4px 0 0", fontSize:12, color:C.gray500 }}>
                {loteTexto.split("\n").filter(l=>l.trim()).length} IMEIs ingresados
              </p>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Lote</label>
              <input value={form.lote} onChange={e => setForm(f=>({...f,lote:e.target.value}))}
                style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900 }}
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Garantía (meses)</label>
              <select value={form.garantiaMeses} onChange={e => setForm(f=>({...f,garantiaMeses:Number(e.target.value)}))}
                style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white }}>
                {[3,6,12,18,24].map(m => <option key={m} value={m}>{m} meses</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))} rows={2}
              style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none", resize:"vertical", color:C.gray900 }}
            />
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:11, border:`1px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:600, color:C.gray700, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:2, padding:"10px", borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 14px ${C.purple}40` }}>
              {saving ? "Guardando..." : modo==="uno" ? "Registrar IMEI" : "Registrar lote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   PÁGINA PRINCIPAL IMEI
═══════════════════════════════════ */
export default function IMEIAdmin() {
  const [registros,    setRegistros]    = useState<RegistroIMEI[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  useEffect(() => {
    const q = query(collection(db, "imeis"), orderBy("fechaIngreso", "desc"));
    const unsub = onSnapshot(q, snap => {
      setRegistros(snap.docs.map(d => ({ id:d.id, ...d.data() } as RegistroIMEI)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtrados = registros.filter(r => {
    const matchS =
      r.imei?.includes(searchTerm) ||
      r.productoNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.lote?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchE = filtroEstado === "todos" ? true : r.estado === filtroEstado;
    return matchS && matchE;
  });

  const stats = {
    total:      registros.length,
    disponibles:registros.filter(r=>r.estado==="disponible").length,
    vendidos:   registros.filter(r=>r.estado==="vendido").length,
    garantia:   registros.filter(r=>r.estado==="garantia").length,
    defectuosos:registros.filter(r=>r.estado==="defectuoso").length,
  };

  const cambiarEstado = async (id: string, estado: RegistroIMEI["estado"]) => {
    await updateDoc(doc(db, "imeis", id), { estado });
  };

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif" }} className="dash-in">
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ marginBottom:8 }}>
            <Link href="/admin" style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12, color:C.purple, textDecoration:"none", fontWeight:600 }}>
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize:28, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>Trazabilidad IMEI</h1>
          <p style={{ fontSize:13, color:C.gray500, margin:"4px 0 0" }}>Control individual de cada equipo celular</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 22px", borderRadius:13, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 6px 22px ${C.purple}50` }}>
          <Plus size={16} /> Registrar IMEI
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:24 }}>
        {[
          { label:"Total",       val:stats.total,      bg:C.gray50,         border:C.gray200,       color:C.gray900 },
          { label:"Disponibles", val:stats.disponibles,bg:`${C.green}10`,   border:`${C.green}28`,  color:"#16a34a" },
          { label:"Vendidos",    val:stats.vendidos,   bg:`${C.purple}08`,  border:`${C.purple}20`, color:C.purple  },
          { label:"En Garantía", val:stats.garantia,   bg:`${C.orange}10`,  border:`${C.orange}28`, color:C.orange  },
          { label:"Defectuosos", val:stats.defectuosos,bg:C.redLight,       border:"#fecaca",       color:C.red     },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:16, padding:"14px 16px", border:`1px solid ${s.border}` }}>
            <p style={{ fontSize:11, fontWeight:700, color:s.color, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.07em" }}>{s.label}</p>
            <p style={{ fontSize:24, fontWeight:900, color:s.color, margin:0 }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <div style={{ flex:1, position:"relative" }}>
          <Search size={15} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:C.gray100 }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por IMEI, modelo, SKU, cliente, lote..."
            style={{ width:"100%", paddingLeft:40, paddingRight:16, paddingTop:10, paddingBottom:10, borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, fontFamily:"monospace" }}
          />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding:"10px 16px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, color:C.gray700, outline:"none", background:C.white, minWidth:190 }}>
          <option value="todos">Todos los estados</option>
          <option value="disponible">Disponibles</option>
          <option value="vendido">Vendidos</option>
          <option value="reservado">Reservados</option>
          <option value="garantia">En garantía</option>
          <option value="defectuoso">Defectuosos</option>
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background:C.white, borderRadius:18, border:`1px solid ${C.gray200}`, overflow:"hidden", boxShadow:`0 4px 24px ${C.purple}06` }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:C.gray50, borderBottom:`1px solid ${C.gray200}` }}>
              {["IMEI","Modelo / SKU","Color / Almac.","Lote","Garantía","Estado","Cliente","Acciones"].map((h,i) => (
                <th key={h} style={{ padding:"12px 16px", fontSize:11, fontWeight:800, color:C.gray500, textAlign:i===7?"right":"left", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_,i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${C.gray100}` }}>
                  {[...Array(8)].map((_,j) => (
                    <td key={j} style={{ padding:"16px" }}>
                      <div style={{ height:16, borderRadius:6, background:C.gray100, animation:"pulse 1.4s ease infinite", width:"70%" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding:"48px", textAlign:"center" }}>
                  <Smartphone size={40} style={{ margin:"0 auto 12px", color:C.gray100, display:"block" }} />
                  <p style={{ fontSize:14, color:C.gray500, margin:0 }}>Sin registros IMEI</p>
                </td>
              </tr>
            ) : filtrados.map((r, idx) => (
              <tr key={r.id} style={{ borderBottom:idx<filtrados.length-1?`1px solid ${C.gray100}`:"none", transition:"background .15s" }}
                onMouseEnter={e => (e.currentTarget.style.background="#faf9ff")}
                onMouseLeave={e => (e.currentTarget.style.background=C.white)}>
                <td style={{ padding:"14px 16px" }}>
                  <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:C.gray900 }}>{r.imei}</div>
                  {r.imei2 && <div style={{ fontFamily:"monospace", fontSize:11, color:C.gray500 }}>SIM2: {r.imei2}</div>}
                  <div style={{ fontSize:11, color:C.gray500, marginTop:2 }}>
                    {r.fechaIngreso?.toDate ? r.fechaIngreso.toDate().toLocaleDateString("es-PE") : "—"}
                  </div>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:`${C.purple}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Smartphone size={15} style={{ color:C.purple }} />
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.gray900, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.productoNombre}</div>
                      <div style={{ fontSize:11, color:C.gray500 }}>{r.sku || "—"}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <div style={{ fontSize:13, color:C.gray700 }}>{r.color || "—"}</div>
                  <div style={{ fontSize:12, color:C.gray500 }}>{r.almacenamiento || "—"}</div>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <span style={{ fontSize:12, fontWeight:600, color:C.gray700, padding:"3px 8px", borderRadius:8, background:C.gray100 }}>{r.lote}</span>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <span style={{ fontSize:13, color:C.gray700 }}>{r.garantiaMeses} meses</span>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <EstadoBadge estado={r.estado} />
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <span style={{ fontSize:13, color:r.clienteNombre?C.gray900:C.gray100 }}>{r.clienteNombre || "—"}</span>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"flex-end", gap:6 }}>
                    <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value as RegistroIMEI["estado"])}
                      style={{ padding:"5px 10px", borderRadius:9, border:`1px solid ${C.gray200}`, fontSize:12, color:C.gray700, outline:"none", background:C.white, cursor:"pointer" }}>
                      <option value="disponible">Disponible</option>
                      <option value="reservado">Reservado</option>
                      <option value="vendido">Vendido</option>
                      <option value="garantia">Garantía</option>
                      <option value="defectuoso">Defectuoso</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <ModalRegistrarIMEI onClose={() => setShowModal(false)} onSaved={() => {}} />}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes dashIn { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1}50%{opacity:.5} }
        .dash-in { animation: dashIn .4s cubic-bezier(.4,0,.2,1); }
      `}</style>
    </div>
  );
}