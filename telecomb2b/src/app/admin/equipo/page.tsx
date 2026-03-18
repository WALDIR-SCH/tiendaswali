"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection, getDocs, doc, getDoc, updateDoc,
  deleteDoc, setDoc, Timestamp,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { toast, Toaster } from "react-hot-toast";

/* ══════════════════════════════════
   PALETA OFICIAL
══════════════════════════════════ */
const C = {
  purple:      "#9851F9",
  purpleDark:  "#7C35E0",
  purpleLight: "#f5f0ff",
  orange:      "#FF6600",
  orangeLight: "#fff7ed",
  yellow:      "#F6FA00",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  greenLight:  "#f0fdf4",
  white:       "#FFFFFF",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray300:     "#D1D5DB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray600:     "#4B5563",
  gray700:     "#374151",
  gray900:     "#111827",
  red:         "#dc2626",
  redLight:    "#fef2f2",
};

/* ── TIPOS ── */
interface AdminUser {
  id:          string;
  email?:      string;
  nombre?:     string;
  cargo?:      string;
  telefono?:   string;
  rol?:        string;
  estado?:     string;
  superadmin?: boolean;
  fecha_registro?: any;
  ultimo_acceso?:  any;
}

/* ══════════════════════════════════
   HELPERS
══════════════════════════════════ */
const ROL_CFG: Record<string, { label:string; bg:string; color:string; border:string }> = {
  admin:  { label:"Administrador", bg:`${C.purple}15`, color:C.purple, border:`${C.purple}30` },
  seller: { label:"Vendedor",      bg:`${C.orange}15`, color:C.orange, border:`${C.orange}30` },
};

const ESTADO_CFG: Record<string, { label:string; bg:string; color:string; dot:string }> = {
  activo:    { label:"Activo",    bg:C.greenLight,  color:C.greenDark, dot:C.green  },
  suspendido:{ label:"Suspendido",bg:"#fffbeb",     color:"#b45309",   dot:C.yellow },
};

const fmt = (ts: any) => {
  if (!ts) return "—";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" });
  } catch { return "—"; }
};

const initials = (name?: string, email?: string) =>
  (name || email || "?")[0].toUpperCase();

/* ── BADGE GENÉRICO ── */
const Badge = ({ cfg }: { cfg:{ label:string; bg:string; color:string; border:string } }) => (
  <span style={{
    display:"inline-flex", alignItems:"center",
    fontSize:10, fontWeight:800, padding:"3px 10px",
    borderRadius:20, background:cfg.bg, color:cfg.color,
    border:`1px solid ${cfg.border}`,
    textTransform:"uppercase", letterSpacing:"0.06em",
  }}>
    {cfg.label}
  </span>
);

/* ── TOGGLE ── */
const Toggle = ({ label, sub, checked, onChange, color=C.purple }: {
  label:string; sub?:string; checked:boolean;
  onChange:(v:boolean)=>void; color?:string;
}) => (
  <label style={{
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"11px 14px", borderRadius:12, cursor:"pointer",
    border:`1.5px solid ${checked?`${color}25`:C.gray200}`,
    background:checked?`${color}06`:C.white, transition:"all .15s",
  }}>
    <div>
      <p style={{ fontSize:13, fontWeight:600, color:C.gray900, margin:0 }}>{label}</p>
      {sub && <p style={{ fontSize:10, color:C.gray500, margin:"2px 0 0" }}>{sub}</p>}
    </div>
    <div style={{ position:"relative", width:40, height:20, flexShrink:0, marginLeft:12 }}>
      <input type="checkbox" checked={checked}
        onChange={e=>onChange(e.target.checked)} style={{ display:"none" }}/>
      <div style={{ width:40, height:20, borderRadius:10, background:checked?color:C.gray200,
        transition:"all .2s", boxShadow:checked?`0 2px 8px ${color}40`:"none" }}/>
      <div style={{ position:"absolute", top:2, left:2, width:16, height:16, borderRadius:"50%",
        background:C.white, boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
        transition:"transform .2s", transform:checked?"translateX(20px)":"translateX(0)" }}/>
    </div>
  </label>
);

/* ── INPUT FIELD ── */
const Field = ({ label, value, onChange, placeholder, type="text", required=false, disabled=false }: {
  label:string; value:string; onChange:(v:string)=>void;
  placeholder?:string; type?:string; required?:boolean; disabled?:boolean;
}) => (
  <div>
    <label style={{ fontSize:10, fontWeight:700, color:C.gray500,
      textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 }}>
      {label}{required && <span style={{ color:C.orange }}> *</span>}
    </label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      style={{
        width:"100%", padding:"10px 13px", borderRadius:11,
        border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none",
        color:disabled?C.gray400:C.gray900,
        background:disabled?C.gray100:C.white,
        boxSizing:"border-box", transition:"border-color .15s",
      }}
      onFocus={e=>!disabled&&(e.currentTarget.style.borderColor=C.purple)}
      onBlur={e=>(e.currentTarget.style.borderColor=C.gray200)}
    />
  </div>
);

/* ══════════════════════════════════
   MODAL — CREAR / EDITAR
══════════════════════════════════ */
const ModalForm = ({
  onClose, onSaved, editUser,
}: {
  onClose:()=>void;
  onSaved:()=>void;
  editUser?: AdminUser;
}) => {
  const isEdit = !!editUser;

  const [nombre,   setNombre]   = useState(editUser?.nombre   || "");
  const [email,    setEmail]    = useState(editUser?.email    || "");
  const [cargo,    setCargo]    = useState(editUser?.cargo    || "");
  const [telefono, setTelefono] = useState(editUser?.telefono || "");
  const [rol,      setRol]      = useState<"admin"|"seller">(
    editUser?.rol === "seller" ? "seller" : "admin"
  );
  const [password, setPassword] = useState("");
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!nombre || !email) { toast.error("Nombre y email son obligatorios"); return; }
    if (!isEdit && (!password || password.length < 8)) {
      toast.error("La contraseña debe tener al menos 8 caracteres"); return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        // Solo actualizar Firestore
        await updateDoc(doc(db, "usuarios", editUser!.id), {
          nombre, cargo, telefono, rol,
          fecha_actualizacion: Timestamp.now(),
        });
        toast.success("✅ Colaborador actualizado");
      } else {
        // Crear en Auth + Firestore
        const cred = await createUserWithEmailAndPassword(getAuth(), email, password);
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          email, nombre, cargo,
          telefono, rol,
          estado:          "activo",
          verificado:      true,
          acceso_catalogo: true,
          superadmin:      false,
          fecha_registro:  Timestamp.now(),
        });
        toast.success(`✅ ${rol==="admin"?"Administrador":"Vendedor"} creado`);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use")
        toast.error("❌ Ese email ya está registrado");
      else toast.error("❌ Error: " + e.message);
    }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
      background:"rgba(0,0,0,0.5)", backdropFilter:"blur(6px)",
    }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{
        background:C.white, borderRadius:22, width:"100%", maxWidth:520,
        maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 32px 80px rgba(100,40,200,0.3)",
        animation:"modalIn .2s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Header modal */}
        <div style={{
          background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
          padding:"22px 26px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:900, color:"#fff", margin:0 }}>
              {isEdit ? "Editar Colaborador" : "Nuevo Colaborador"}
            </h2>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:3 }}>
              {isEdit ? "Actualiza los datos del usuario" : "Crea una cuenta con acceso al panel"}
            </p>
          </div>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:"50%", border:"none",
            background:"rgba(255,255,255,0.15)", color:"#fff",
            fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}>×</button>
        </div>

        <div style={{ padding:"24px 26px 28px" }}>
          {/* Selector de rol */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:10, fontWeight:700, color:C.gray500,
              textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:10 }}>
              Nivel de acceso *
            </label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {([
                { val:"seller", emoji:"🛒", title:"Vendedor",     desc:"Dashboard, pedidos, POS, catálogo" },
                { val:"admin",  emoji:"⚙️", title:"Administrador", desc:"Acceso completo (sin superadmin)" },
              ] as const).map(opt => (
                <button key={opt.val} type="button" onClick={()=>setRol(opt.val)}
                  style={{
                    padding:"12px 14px", borderRadius:13, cursor:"pointer", textAlign:"left",
                    border:`2px solid ${rol===opt.val?C.purple:C.gray200}`,
                    background:rol===opt.val?`${C.purple}08`:C.white,
                    transition:"all .15s",
                  }}>
                  <div style={{ fontSize:20, marginBottom:6 }}>{opt.emoji}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:rol===opt.val?C.purple:C.gray900 }}>
                    {opt.title}
                  </div>
                  <div style={{ fontSize:10, color:C.gray500, marginTop:2 }}>{opt.desc}</div>
                  {rol===opt.val && (
                    <div style={{
                      marginTop:8, display:"inline-flex", alignItems:"center", gap:4,
                      fontSize:9, fontWeight:800, color:C.purple, textTransform:"uppercase",
                    }}>
                      <svg style={{ width:10, height:10 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                      </svg>
                      Seleccionado
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Campos */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
            <Field label="Nombre completo" value={nombre} onChange={setNombre}
              placeholder="Juan Pérez" required/>
            <Field label="Email" value={email} onChange={setEmail}
              placeholder="vendedor@waly.com" required type="email" disabled={isEdit}/>
            <Field label="Cargo (opcional)" value={cargo} onChange={setCargo}
              placeholder="Ej: Asesor Comercial"/>
            <Field label="Teléfono (opcional)" value={telefono} onChange={setTelefono}
              placeholder="+51 999 999 999"/>
            {!isEdit && (
              <div style={{ gridColumn:"1 / -1" }}>
                <Field label="Contraseña" value={password} onChange={setPassword}
                  placeholder="Mínimo 8 caracteres" required type="password"/>
                {password && password.length < 8 && (
                  <p style={{ fontSize:10, color:C.orange, marginTop:5 }}>
                    Mínimo 8 caracteres
                  </p>
                )}
              </div>
            )}
          </div>

          {!isEdit && (
            <div style={{
              padding:"10px 14px", borderRadius:11,
              background:`${C.orange}08`, border:`1px solid ${C.orange}20`,
              marginBottom:20,
            }}>
              <p style={{ fontSize:11, color:C.orange, fontWeight:600, margin:0 }}>
                ⚠️ La cuenta se crea en Firebase Authentication. Guarda las credenciales de forma segura.
              </p>
            </div>
          )}

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{
              flex:1, padding:"11px", borderRadius:11, fontSize:13, fontWeight:700,
              background:C.gray100, color:C.gray600, border:"none", cursor:"pointer",
            }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} style={{
              flex:2, padding:"11px", borderRadius:11, fontSize:13, fontWeight:800,
              background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
              color:"#fff", border:"none", cursor:saving?"not-allowed":"pointer",
              opacity:saving?0.6:1,
              boxShadow:`0 4px 16px ${C.purple}40`,
            }}>
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : `Crear ${rol==="admin"?"Admin":"Vendedor"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════
   MODAL CONFIRMAR ACCIÓN
══════════════════════════════════ */
const ModalConfirm = ({ titulo, msg, onConfirm, onCancel, danger=false }: {
  titulo:string; msg:string; onConfirm:()=>void; onCancel:()=>void; danger?:boolean;
}) => (
  <div style={{
    position:"fixed", inset:0, zIndex:300,
    display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    background:"rgba(0,0,0,0.5)", backdropFilter:"blur(6px)",
  }}>
    <div style={{
      background:C.white, borderRadius:20, width:"100%", maxWidth:400, padding:28,
      boxShadow:"0 32px 80px rgba(0,0,0,0.25)",
      animation:"modalIn .18s cubic-bezier(.4,0,.2,1)",
    }}>
      <div style={{
        width:52, height:52, borderRadius:16, margin:"0 auto 16px",
        background:danger?C.redLight:C.purpleLight,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:24,
      }}>
        {danger ? "🗑️" : "⚠️"}
      </div>
      <h3 style={{ fontSize:16, fontWeight:800, color:C.gray900, margin:"0 0 8px", textAlign:"center" }}>
        {titulo}
      </h3>
      <p style={{ fontSize:13, color:C.gray500, margin:"0 0 24px", textAlign:"center", lineHeight:1.6 }}>
        {msg}
      </p>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onCancel} style={{
          flex:1, padding:"10px", borderRadius:11, fontSize:13, fontWeight:700,
          background:C.gray100, color:C.gray600, border:"none", cursor:"pointer",
        }}>Cancelar</button>
        <button onClick={onConfirm} style={{
          flex:1, padding:"10px", borderRadius:11, fontSize:13, fontWeight:800,
          background:danger?C.red:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
          color:"#fff", border:"none", cursor:"pointer",
          boxShadow:`0 4px 14px ${danger?"rgba(220,38,38,0.4)":C.purple+"40"}`,
        }}>Confirmar</button>
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════ */
export default function GestionAdmins() {
  const [admins,      setAdmins]      = useState<AdminUser[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [esSuperadmin,setEsSuperadmin]= useState(false);
  const [miUid,       setMiUid]       = useState("");
  const [searchTerm,  setSearchTerm]  = useState("");
  const [filtroRol,   setFiltroRol]   = useState("todos");
  const [showForm,    setShowForm]    = useState(false);
  const [editUser,    setEditUser]    = useState<AdminUser|undefined>();
  const [confirmData, setConfirmData] = useState<{
    tipo:"suspender"|"activar"|"eliminar"; user:AdminUser;
  }|null>(null);

  /* ── Cargar admins ── */
  const cargarAdmins = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "usuarios"));
      const lista = snap.docs
        .map(d => ({ id:d.id, ...d.data() } as AdminUser))
        .filter(u => u.rol === "admin" || u.rol === "seller");
      setAdmins(lista);
    } catch { toast.error("Error al cargar el equipo"); }
    finally { setLoading(false); }
  };

  /* ── Auth + permisos ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setMiUid(u.uid);
      try {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        if (snap.exists()) setEsSuperadmin(snap.data().superadmin === true);
      } catch {}
      cargarAdmins();
    });
    return () => unsub();
  }, []);

  /* ── Acciones ── */
  const ejecutarAccion = async () => {
    if (!confirmData) return;
    const { tipo, user: u } = confirmData;
    try {
      if (tipo === "suspender") {
        await updateDoc(doc(db,"usuarios",u.id), { estado:"suspendido" });
        setAdmins(p => p.map(a => a.id===u.id ? { ...a, estado:"suspendido" } : a));
        toast("Acceso suspendido", { icon:"⚠️" });
      } else if (tipo === "activar") {
        await updateDoc(doc(db,"usuarios",u.id), { estado:"activo" });
        setAdmins(p => p.map(a => a.id===u.id ? { ...a, estado:"activo" } : a));
        toast.success("Acceso reactivado");
      } else if (tipo === "eliminar") {
        await deleteDoc(doc(db,"usuarios",u.id));
        setAdmins(p => p.filter(a => a.id!==u.id));
        toast.success("Colaborador eliminado");
      }
    } catch { toast.error("Error al realizar la acción"); }
    finally { setConfirmData(null); }
  };

  /* ── Filtros ── */
  const filtrados = admins.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (a.nombre||"").toLowerCase().includes(term) ||
      (a.email||"").toLowerCase().includes(term)  ||
      (a.cargo||"").toLowerCase().includes(term);
    const matchRol = filtroRol==="todos" ? true : a.rol===filtroRol;
    return matchSearch && matchRol;
  });

  /* ── Stats ── */
  const stats = {
    total:      admins.length,
    admins:     admins.filter(a=>a.rol==="admin").length,
    sellers:    admins.filter(a=>a.rol==="seller").length,
    activos:    admins.filter(a=>a.estado!=="suspendido").length,
    suspendidos:admins.filter(a=>a.estado==="suspendido").length,
  };

  const card: React.CSSProperties = {
    background:"rgba(255,255,255,0.92)", backdropFilter:"blur(16px)",
    borderRadius:18, border:`1px solid ${C.purple}12`,
    boxShadow:`0 4px 24px ${C.purple}08`,
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style:{ borderRadius:"12px", fontWeight:600, fontSize:"13px" },
      }}/>

      <div style={{ maxWidth:1100, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>

        {/* ── HEADER ── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <div style={{
                width:36, height:36, borderRadius:10,
                background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <svg style={{ width:18, height:18, color:"#fff" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:"0.18em" }}>
                Sistema B2B · Equipo
              </span>
            </div>
            <h1 style={{ fontSize:28, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>
              Equipo Administrativo
            </h1>
            <p style={{ fontSize:13, color:C.gray500, marginTop:6 }}>
              Gestiona admins y vendedores con acceso al panel
            </p>
          </div>

          {esSuperadmin && (
            <button onClick={() => { setEditUser(undefined); setShowForm(true); }}
              style={{
                display:"flex", alignItems:"center", gap:9,
                padding:"11px 22px", borderRadius:13,
                background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                color:"#fff", fontSize:13, fontWeight:800, border:"none", cursor:"pointer",
                boxShadow:`0 6px 22px ${C.purple}50`,
                transition:"transform .15s, box-shadow .15s",
              }}
              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 10px 28px ${C.purple}55`; }}
              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform="translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 6px 22px ${C.purple}50`; }}>
              <svg style={{ width:14, height:14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
              </svg>
              Agregar colaborador
            </button>
          )}
        </div>

        {/* ── STATS CARDS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:24 }}>
          {[
            { label:"Total equipo",  value:stats.total,      color:C.purple, icon:"👥", bg:C.purpleLight },
            { label:"Admins",        value:stats.admins,     color:C.purple, icon:"⚙️", bg:C.purpleLight },
            { label:"Vendedores",    value:stats.sellers,    color:C.orange, icon:"🛒", bg:C.orangeLight },
            { label:"Activos",       value:stats.activos,    color:C.greenDark, icon:"✅", bg:C.greenLight },
            { label:"Suspendidos",   value:stats.suspendidos,color:C.red,    icon:"⛔", bg:C.redLight },
          ].map((s,i) => (
            <div key={i} style={{
              ...card, padding:"18px 20px",
              borderLeft:`4px solid ${s.color}`,
            }}>
              <div style={{ fontSize:22, marginBottom:10 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:900, color:s.color, letterSpacing:"-0.03em" }}>{s.value}</div>
              <div style={{ fontSize:11, color:C.gray500, marginTop:4, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FILTROS Y BÚSQUEDA ── */}
        <div style={{ ...card, padding:"14px 18px", marginBottom:16, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          {/* Buscador */}
          <div style={{ flex:1, minWidth:200, position:"relative" }}>
            <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:C.gray400 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email o cargo..."
              style={{
                width:"100%", padding:"9px 12px 9px 36px",
                borderRadius:11, border:`1.5px solid ${C.gray200}`,
                fontSize:13, outline:"none", color:C.gray900, boxSizing:"border-box",
              }}
              onFocus={e=>(e.currentTarget.style.borderColor=C.purple)}
              onBlur={e=>(e.currentTarget.style.borderColor=C.gray200)}
            />
          </div>

          {/* Filtros rol */}
          <div style={{ display:"flex", gap:8 }}>
            {[
              { v:"todos",  l:"Todos" },
              { v:"admin",  l:"⚙️ Admins" },
              { v:"seller", l:"🛒 Vendedores" },
            ].map(f => (
              <button key={f.v} onClick={()=>setFiltroRol(f.v)}
                style={{
                  padding:"7px 16px", borderRadius:20, fontSize:11, fontWeight:700,
                  cursor:"pointer", transition:"all .15s",
                  background:filtroRol===f.v?`linear-gradient(135deg,${C.purple},${C.purpleDark})`:C.gray100,
                  color:filtroRol===f.v?"#fff":C.gray500,
                  border:filtroRol===f.v?"none":`1px solid ${C.gray200}`,
                  boxShadow:filtroRol===f.v?`0 3px 12px ${C.purple}40`:"none",
                }}>
                {f.l}
              </button>
            ))}
          </div>

          {/* Refrescar */}
          <button onClick={cargarAdmins}
            style={{ padding:"8px 14px", borderRadius:11, fontSize:12, fontWeight:700,
              background:C.gray100, color:C.gray600, border:`1px solid ${C.gray200}`,
              cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <svg style={{ width:13, height:13, animation:loading?"spin .8s linear infinite":"none" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>

        {/* ── TABLA ── */}
        <div style={{ ...card, overflow:"hidden" }}>
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px", gap:12, color:C.gray500 }}>
              <div style={{ width:28, height:28, border:`2.5px solid ${C.purple}28`, borderTopColor:C.purple, borderRadius:"50%", animation:"spin .75s linear infinite" }}/>
              <span style={{ fontSize:14 }}>Cargando equipo...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding:"60px", textAlign:"center" }}>
              <div style={{ fontSize:42, marginBottom:12 }}>👥</div>
              <p style={{ fontSize:15, fontWeight:700, color:C.gray700, margin:0 }}>
                {searchTerm ? "Sin resultados para tu búsqueda" : "No hay colaboradores registrados"}
              </p>
              <p style={{ fontSize:13, color:C.gray400, marginTop:6 }}>
                {esSuperadmin ? 'Haz clic en "Agregar colaborador" para crear el primero' : "Contacta al superadmin para agregar colaboradores"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:C.gray50, borderBottom:`2px solid ${C.gray100}` }}>
                    {["Colaborador","Rol","Estado","Cargo","Fecha registro","Acciones"].map((h,i) => (
                      <th key={h} style={{
                        padding:"13px 18px",
                        fontSize:10, fontWeight:800, color:C.gray500,
                        textTransform:"uppercase", letterSpacing:"0.12em",
                        textAlign:i===5?"right":"left",
                        whiteSpace:"nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((a, idx) => {
                    const esMismo    = a.id === miUid;
                    const esSuperA   = a.superadmin === true;
                    const suspendido = a.estado === "suspendido";
                    const rolCfg     = ROL_CFG[a.rol||"admin"];
                    const estadoCfg  = ESTADO_CFG[suspendido?"suspendido":"activo"];

                    return (
                      <tr key={a.id}
                        style={{
                          borderBottom: idx < filtrados.length-1 ? `1px solid ${C.gray100}` : "none",
                          transition:"background .12s",
                          opacity: suspendido ? 0.7 : 1,
                        }}
                        onMouseEnter={e=>(e.currentTarget.style.background="#faf8ff")}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>

                        {/* Colaborador */}
                        <td style={{ padding:"16px 18px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            <div style={{ position:"relative" }}>
                              <div style={{
                                width:42, height:42, borderRadius:13, flexShrink:0,
                                background: esSuperA
                                  ? `linear-gradient(135deg,${C.purple},${C.purpleDark})`
                                  : a.rol==="admin"
                                    ? `linear-gradient(135deg,${C.purple}80,${C.purpleDark}80)`
                                    : `linear-gradient(135deg,${C.orange}80,#cc4400)`,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:17, fontWeight:900, color:"#fff",
                                boxShadow:`0 3px 12px ${a.rol==="admin"?C.purple:C.orange}40`,
                              }}>
                                {initials(a.nombre, a.email)}
                              </div>
                              {/* Punto online */}
                              <div style={{
                                position:"absolute", bottom:-1, right:-1,
                                width:12, height:12, borderRadius:"50%",
                                background:suspendido?C.gray300:C.green,
                                border:`2px solid ${C.white}`,
                                boxShadow:suspendido?"none":`0 0 8px ${C.green}`,
                              }}/>
                            </div>
                            <div>
                              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                <span style={{ fontSize:13, fontWeight:700, color:C.gray900 }}>
                                  {a.nombre || a.email?.split("@")[0] || "—"}
                                </span>
                                {esMismo && (
                                  <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, background:`${C.green}20`, color:C.greenDark, textTransform:"uppercase" }}>
                                    Tú
                                  </span>
                                )}
                                {esSuperA && (
                                  <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, background:`${C.yellow}40`, color:"#7a6500", textTransform:"uppercase" }}>
                                    ★ Super
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize:11, color:C.gray400, marginTop:2 }}>{a.email}</div>
                              {a.telefono && (
                                <div style={{ fontSize:10, color:C.gray400, marginTop:1 }}>📱 {a.telefono}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Rol */}
                        <td style={{ padding:"16px 18px" }}>
                          {rolCfg && <Badge cfg={rolCfg}/>}
                        </td>

                        {/* Estado */}
                        <td style={{ padding:"16px 18px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:7, height:7, borderRadius:"50%", background:estadoCfg.dot, boxShadow:`0 0 6px ${estadoCfg.dot}` }}/>
                            <span style={{ fontSize:12, fontWeight:700, color:estadoCfg.color }}>
                              {estadoCfg.label}
                            </span>
                          </div>
                        </td>

                        {/* Cargo */}
                        <td style={{ padding:"16px 18px" }}>
                          <span style={{ fontSize:12, color:C.gray600 }}>
                            {a.cargo || <span style={{ color:C.gray300 }}>—</span>}
                          </span>
                        </td>

                        {/* Fecha */}
                        <td style={{ padding:"16px 18px" }}>
                          <span style={{ fontSize:12, color:C.gray500 }}>{fmt(a.fecha_registro)}</span>
                        </td>

                        {/* Acciones */}
                        <td style={{ padding:"16px 18px" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8 }}>
                            {/* Solo superadmin puede modificar. No puede modificarse a sí mismo ni al superadmin */}
                            {esSuperadmin && !esMismo && !esSuperA ? (
                              <>
                                {/* Editar */}
                                <button onClick={()=>{ setEditUser(a); setShowForm(true); }}
                                  style={{
                                    padding:"6px 13px", borderRadius:9, fontSize:11, fontWeight:700,
                                    background:C.purpleLight, color:C.purple,
                                    border:`1px solid ${C.purple}25`, cursor:"pointer",
                                    transition:"all .15s",
                                  }}
                                  onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=`${C.purple}20`; }}
                                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=C.purpleLight; }}>
                                  ✏️ Editar
                                </button>

                                {/* Suspender / Activar */}
                                {suspendido ? (
                                  <button onClick={()=>setConfirmData({ tipo:"activar", user:a })}
                                    style={{
                                      padding:"6px 13px", borderRadius:9, fontSize:11, fontWeight:700,
                                      background:C.greenLight, color:C.greenDark,
                                      border:`1px solid ${C.green}30`, cursor:"pointer",
                                    }}>
                                    ▶ Activar
                                  </button>
                                ) : (
                                  <button onClick={()=>setConfirmData({ tipo:"suspender", user:a })}
                                    style={{
                                      padding:"6px 13px", borderRadius:9, fontSize:11, fontWeight:700,
                                      background:"#fffbeb", color:"#b45309",
                                      border:"1px solid #fde68a", cursor:"pointer",
                                    }}>
                                    ⏸ Suspender
                                  </button>
                                )}

                                {/* Eliminar */}
                                <button onClick={()=>setConfirmData({ tipo:"eliminar", user:a })}
                                  style={{
                                    padding:"6px 13px", borderRadius:9, fontSize:11, fontWeight:700,
                                    background:C.redLight, color:C.red,
                                    border:"1px solid #fecaca", cursor:"pointer",
                                  }}>
                                  🗑️
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize:11, color:C.gray300, fontStyle:"italic" }}>
                                {esMismo ? "Tu cuenta" : esSuperA ? "Protegido" : "Sin permiso"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer tabla */}
          {!loading && filtrados.length > 0 && (
            <div style={{
              padding:"12px 18px",
              borderTop:`1px solid ${C.gray100}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background:C.gray50,
            }}>
              <span style={{ fontSize:11, color:C.gray400, fontWeight:600 }}>
                Mostrando {filtrados.length} de {admins.length} colaboradores
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, boxShadow:`0 0 8px ${C.green}` }}/>
                <span style={{ fontSize:11, color:C.greenDark, fontWeight:700 }}>Sistema activo</span>
              </div>
            </div>
          )}
        </div>

        {/* ── INFO PERMISOS ── */}
        <div style={{
          marginTop:16, padding:"14px 18px", borderRadius:14,
          background:`${C.purple}06`, border:`1px solid ${C.purple}15`,
          display:"flex", gap:12, alignItems:"flex-start",
        }}>
          <div style={{ fontSize:18, flexShrink:0 }}>ℹ️</div>
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:C.purple, margin:"0 0 4px" }}>
              Permisos por rol
            </p>
            <p style={{ fontSize:11, color:C.gray600, margin:0, lineHeight:1.7 }}>
              <strong>Administrador:</strong> Acceso completo al panel excepto gestión de superadmin. &nbsp;|&nbsp;
              <strong>Vendedor:</strong> Dashboard, pedidos, cotizaciones, POS y catálogo. Sin acceso a clientes, reportes ni configuración.
            </p>
          </div>
        </div>
      </div>

      {/* ── MODAL CREAR / EDITAR ── */}
      {showForm && (
        <ModalForm
          editUser={editUser}
          onClose={() => { setShowForm(false); setEditUser(undefined); }}
          onSaved={cargarAdmins}
        />
      )}

      {/* ── MODAL CONFIRMAR ── */}
      {confirmData && (
        <ModalConfirm
          titulo={
            confirmData.tipo==="eliminar"  ? "Eliminar colaborador" :
            confirmData.tipo==="suspender" ? "Suspender acceso" :
            "Reactivar acceso"
          }
          msg={
            confirmData.tipo==="eliminar"
              ? `¿Eliminar a ${confirmData.user.nombre||confirmData.user.email}? Esta acción no se puede deshacer.`
              : confirmData.tipo==="suspender"
              ? `${confirmData.user.nombre||confirmData.user.email} no podrá acceder al panel hasta que se reactive.`
              : `${confirmData.user.nombre||confirmData.user.email} recuperará acceso completo al panel.`
          }
          danger={confirmData.tipo==="eliminar"}
          onConfirm={ejecutarAccion}
          onCancel={()=>setConfirmData(null)}
        />
      )}

      <style jsx global>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes modalIn { from { opacity:0; transform:scale(.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </>
  );
}