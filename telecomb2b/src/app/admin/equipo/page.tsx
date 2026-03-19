"use client";
// src/app/admin/equipo/page.tsx

import { useState, useEffect } from "react";
import {
  collection, getDocs, doc, updateDoc,
  deleteDoc, setDoc, Timestamp, onSnapshot
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { toast, Toaster } from "react-hot-toast";

/* ── PALETA MUNDO MÓVIL ─────────────────────────────────────────────────── */
const C = {
  purple:      "#7c3aed",
  purpleLight: "#9851F9",
  purpleBg:    "#f5f3ff",
  purpleBorder:"#ddd6fe",
  orange:      "#FF6600",
  orangeBg:    "#fff7ed",
  yellow:      "#F6FA00",
  yellowBg:    "#fefce8",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  greenBg:     "#f0fdf4",
  red:         "#dc2626",
  redBg:       "#fef2f2",
  white:       "#FFFFFF",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray300:     "#D1D5DB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray700:     "#374151",
  gray900:     "#111827",
};

interface AdminUser {
  id:string; email?:string; nombre?:string; rol?:string; cargo?:string;
  estado?:string; superadmin?:boolean; fotoPerfil?:string;
  fecha_registro?:any; telefono?:string;
}

const ROL_CONF: Record<string,{label:string;color:string;bg:string;emoji:string}> = {
  admin:  { label:"Admin",    color:C.purple,    bg:C.purpleBg,  emoji:"⚙️" },
  seller: { label:"Vendedor", color:C.orange,    bg:C.orangeBg,  emoji:"🛒" },
};

const ESTADO_CONF: Record<string,{label:string;color:string;bg:string}> = {
  activo:     { label:"Activo",     color:C.greenDark, bg:C.greenBg },
  suspendido: { label:"Suspendido", color:C.red,       bg:C.redBg   },
  inactivo:   { label:"Inactivo",   color:C.gray500,   bg:C.gray100 },
};

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) || "?";
}

function tiempoDesde(fecha: any): string {
  if (!fecha) return "—";
  try {
    const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Ayer";
    if (diff < 30)  return `${diff} días`;
    if (diff < 365) return `${Math.floor(diff/30)} meses`;
    return `${Math.floor(diff/365)} años`;
  } catch { return "—"; }
}

/* ── Indicador fuerza password ──────────────────────────────────────────── */
function PassStrength({ pass }: { pass: string }) {
  if (!pass) return null;
  const score = [pass.length>=8, /[A-Z]/.test(pass), /[0-9]/.test(pass), /[^A-Za-z0-9]/.test(pass)].filter(Boolean).length;
  const cols = ["#ef4444","#f97316","#eab308","#22c55e"];
  const labs = ["Muy débil","Débil","Buena","Fuerte"];
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ display:"flex", gap:3, marginBottom:4 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex:1, height:3, borderRadius:3, background:i<score?cols[score-1]:C.gray200, transition:"all .3s" }}/>
        ))}
      </div>
      <span style={{ fontSize:9, fontWeight:700, color:score>0?cols[score-1]:C.gray400 }}>
        {score>0?labs[score-1]:""}
      </span>
    </div>
  );
}

/* ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────── */
export default function AdminEquipo() {
  const [admins,       setAdmins]       = useState<AdminUser[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [currentUser,  setCurrentUser]  = useState<any>(null);
  const [esSuperadmin, setEsSuperadmin] = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [filtroRol,    setFiltroRol]    = useState("todos");
  const [confirmDel,   setConfirmDel]   = useState<string|null>(null);
  const [editId,       setEditId]       = useState<string|null>(null);

  // Form nuevo usuario
  const [fNombre,   setFNombre]   = useState("");
  const [fEmail,    setFEmail]    = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fRol,      setFRol]      = useState<"admin"|"seller">("seller");
  const [fCargo,    setFCargo]    = useState("");
  const [fTel,      setFTel]      = useState("");
  const [creando,   setCreando]   = useState(false);

  /* ── Auth ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) return;
      setCurrentUser(u);
      try {
        const { doc: docFn, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(docFn(db, "usuarios", u.uid));
        if (snap.exists()) setEsSuperadmin(snap.data().superadmin === true);
      } catch {}
    });
    return () => unsub();
  }, []);

  /* ── Carga en tiempo real ────────────────────────────────────────────── */
  useEffect(() => {
    const q = collection(db, "usuarios");
    const unsub = onSnapshot(q, snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as AdminUser))
        .filter(u => u.rol === "admin" || u.rol === "seller");
      setAdmins(lista.sort((a,b) => {
        if (a.superadmin && !b.superadmin) return -1;
        if (!a.superadmin && b.superadmin) return 1;
        if (a.rol === "admin" && b.rol !== "admin") return -1;
        if (a.rol !== "admin" && b.rol === "admin") return 1;
        return (a.nombre||"").localeCompare(b.nombre||"");
      }));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  /* ── Crear colaborador ──────────────────────────────────────────────── */
  const crearColaborador = async () => {
    if (!fNombre.trim() || !fEmail.trim() || !fPassword.trim()) {
      toast.error("Completa todos los campos obligatorios"); return;
    }
    if (fPassword.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    setCreando(true);
    try {
      const secondaryAuth = getAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, fEmail.trim(), fPassword);
      const uid  = cred.user.uid;
      await setDoc(doc(db, "usuarios", uid), {
        email:           fEmail.trim(),
        nombre:          fNombre.trim(),
        rol:             fRol,
        cargo:           fCargo.trim() || (fRol==="admin"?"Administrador":"Vendedor"),
        telefono:        fTel.trim(),
        estado:          "activo",
        verificado:      true,
        acceso_catalogo: true,
        superadmin:      false,
        fecha_registro:  Timestamp.now(),
      });
      toast.success(`✅ ${fRol==="admin"?"Administrador":"Vendedor"} creado correctamente`);
      setShowForm(false);
      setFNombre(""); setFEmail(""); setFPassword(""); setFCargo(""); setFTel("");
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") toast.error("❌ Ese email ya está registrado");
      else toast.error("Error: " + (e.message||"intenta de nuevo"));
    }
    finally { setCreando(false); }
  };

  /* ── Cambiar rol ─────────────────────────────────────────────────────── */
  const cambiarRol = async (id: string, nuevoRol: string) => {
    const a = admins.find(x => x.id === id);
    if (a?.superadmin) { toast.error("No puedes cambiar el rol del superadmin"); return; }
    try {
      await updateDoc(doc(db, "usuarios", id), { rol: nuevoRol });
      toast.success("Rol actualizado");
    } catch { toast.error("Error al actualizar"); }
  };

  /* ── Suspender/Activar ───────────────────────────────────────────────── */
  const toggleEstado = async (id: string) => {
    const a = admins.find(x => x.id === id);
    if (a?.superadmin) { toast.error("No puedes suspender al superadmin"); return; }
    const nuevo = a?.estado === "activo" ? "suspendido" : "activo";
    try {
      await updateDoc(doc(db, "usuarios", id), { estado: nuevo });
      toast.success(nuevo === "activo" ? "✅ Cuenta activada" : "⚠️ Cuenta suspendida");
    } catch { toast.error("Error al actualizar estado"); }
  };

  /* ── Eliminar ────────────────────────────────────────────────────────── */
  const eliminar = async (id: string) => {
    const a = admins.find(x => x.id === id);
    if (a?.superadmin) { toast.error("El superadmin no puede ser eliminado"); setConfirmDel(null); return; }
    try {
      await deleteDoc(doc(db, "usuarios", id));
      setConfirmDel(null);
      toast.success("Colaborador eliminado del sistema");
    } catch { toast.error("Error al eliminar"); }
  };

  /* ── Filtros ─────────────────────────────────────────────────────────── */
  const adminsFiltrados = admins.filter(a => {
    const matchSearch = !search ||
      (a.nombre||"").toLowerCase().includes(search.toLowerCase()) ||
      (a.email||"").toLowerCase().includes(search.toLowerCase()) ||
      (a.cargo||"").toLowerCase().includes(search.toLowerCase());
    const matchRol = filtroRol === "todos" || a.rol === filtroRol;
    return matchSearch && matchRol;
  });

  const stats = {
    total:    admins.length,
    admins:   admins.filter(a => a.rol==="admin").length,
    sellers:  admins.filter(a => a.rol==="seller").length,
    activos:  admins.filter(a => a.estado==="activo").length,
  };

  /* ─────────────────── RENDER ─────────────────────────────────────────── */
  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius:"12px", fontWeight:600, fontSize:"13px" }
      }}/>

      <div style={{ maxWidth:1100, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>

        {/* Encabezado */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>
              Equipo Administrativo
            </h1>
            <p style={{ fontSize:12, color:C.gray400, margin:"5px 0 0" }}>
              Gestiona administradores y vendedores del sistema
            </p>
          </div>
          {esSuperadmin && (
            <button onClick={() => setShowForm(v => !v)}
              style={{
                display:"flex", alignItems:"center", gap:8, padding:"10px 20px",
                borderRadius:12,
                background: showForm ? C.gray100 : `linear-gradient(135deg,${C.purple},${C.purpleLight})`,
                color: showForm ? C.gray500 : C.white,
                fontSize:12, fontWeight:800, border:"none", cursor:"pointer",
                boxShadow: showForm ? "none" : `0 4px 16px ${C.purple}40`,
                transition:"all .2s",
              }}>
              {showForm ? "✕ Cancelar" : "+ Agregar colaborador"}
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"Total",    value:stats.total,   color:C.purple,    emoji:"👥" },
            { label:"Admins",   value:stats.admins,  color:C.purpleLight,emoji:"⚙️" },
            { label:"Vendedores",value:stats.sellers, color:C.orange,   emoji:"🛒" },
            { label:"Activos",  value:stats.activos, color:C.greenDark, emoji:"✅" },
          ].map(s => (
            <div key={s.label} style={{
              background:C.white, borderRadius:14, padding:"16px 18px",
              border:`1px solid ${C.gray200}`, display:"flex", alignItems:"center", gap:12,
            }}>
              <div style={{ fontSize:26 }}>{s.emoji}</div>
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10, fontWeight:600, color:C.gray400, marginTop:1 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario nuevo colaborador */}
        {showForm && esSuperadmin && (
          <div style={{
            background:C.white, borderRadius:16, padding:24, marginBottom:20,
            border:`1px solid ${C.purpleBorder}`,
            boxShadow:`0 4px 20px ${C.purple}10`,
          }}>
            <h3 style={{ fontSize:13, fontWeight:800, color:C.purple, margin:"0 0 18px", textTransform:"uppercase", letterSpacing:"0.1em" }}>
              Nuevo Colaborador
            </h3>

            {/* Tipo de rol */}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:10, fontWeight:700, color:C.gray400, textTransform:"uppercase", display:"block", marginBottom:8 }}>
                Nivel de acceso *
              </label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { val:"seller", label:"🛒 Vendedor", desc:"Dashboard, catálogo, pedidos, POS", color:C.orange },
                  { val:"admin",  label:"⚙️ Admin",    desc:"Acceso completo al sistema",        color:C.purple },
                ].map(opt => (
                  <button key={opt.val} type="button" onClick={() => setFRol(opt.val as any)}
                    style={{
                      padding:"12px 16px", borderRadius:11, cursor:"pointer", textAlign:"left",
                      background: fRol===opt.val ? `${opt.color}08` : C.white,
                      border: `2px solid ${fRol===opt.val ? opt.color : C.gray200}`,
                      transition:"all .15s",
                    }}>
                    <div style={{ fontSize:13, fontWeight:700, color:fRol===opt.val?opt.color:C.gray700 }}>{opt.label}</div>
                    <div style={{ fontSize:10, color:C.gray400, marginTop:3 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campos */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
              {[
                { label:"Nombre completo *", value:fNombre, set:setFNombre, ph:"Juan Pérez", type:"text" },
                { label:"Email *",           value:fEmail,  set:setFEmail,  ph:"vendedor@empresa.com", type:"email" },
                { label:"Teléfono",          value:fTel,    set:setFTel,    ph:"+51 999 999 999", type:"tel" },
                { label:"Cargo (opcional)",  value:fCargo,  set:setFCargo,  ph:"Ej: Asesor Comercial", type:"text" },
              ].map((f,i) => (
                <div key={i}>
                  <label style={{ fontSize:10, fontWeight:700, color:C.gray400, textTransform:"uppercase", display:"block", marginBottom:6 }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:12, outline:"none", boxSizing:"border-box" as any }}
                    onFocus={e => e.currentTarget.style.borderColor=C.purple}
                    onBlur={e => e.currentTarget.style.borderColor=C.gray200}/>
                </div>
              ))}
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:10, fontWeight:700, color:C.gray400, textTransform:"uppercase", display:"block", marginBottom:6 }}>
                Contraseña * (mín. 8 caracteres)
              </label>
              <input type="password" value={fPassword} onChange={e => setFPassword(e.target.value)} placeholder="••••••••"
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:12, outline:"none", boxSizing:"border-box" as any }}
                onFocus={e => e.currentTarget.style.borderColor=C.purple}
                onBlur={e => e.currentTarget.style.borderColor=C.gray200}/>
              <PassStrength pass={fPassword}/>
            </div>

            {/* Aviso */}
            <div style={{ padding:"10px 14px", borderRadius:10, background:C.orangeBg, border:`1px solid ${C.orange}25`, marginBottom:16 }}>
              <p style={{ fontSize:11, color:C.orange, fontWeight:600, margin:0 }}>
                ⚠️ Las credenciales se crean en Firebase Auth. Comparte la contraseña de forma segura y pide al usuario que la cambie al ingresar.
              </p>
            </div>

            <button onClick={crearColaborador} disabled={creando || !fNombre || !fEmail || !fPassword}
              style={{
                padding:"10px 24px", borderRadius:11,
                background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,
                color:C.white, fontSize:12, fontWeight:800, border:"none",
                cursor:creando||!fNombre||!fEmail||!fPassword?"not-allowed":"pointer",
                opacity:creando||!fNombre||!fEmail||!fPassword?0.5:1,
                boxShadow:`0 4px 14px ${C.purple}40`,
              }}>
              {creando ? "Creando cuenta..." : `Crear ${fRol==="admin"?"Administrador":"Vendedor"}`}
            </button>
          </div>
        )}

        {/* Filtros + búsqueda */}
        <div style={{
          background:C.white, borderRadius:14, padding:"14px 16px", marginBottom:16,
          border:`1px solid ${C.gray200}`, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
        }}>
          {/* Búsqueda */}
          <div style={{ flex:1, minWidth:200, position:"relative" }}>
            <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:C.gray400 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o cargo..."
              style={{
                width:"100%", paddingLeft:32, paddingRight:12, paddingTop:8, paddingBottom:8,
                borderRadius:9, border:`1.5px solid ${search?C.purple:C.gray200}`,
                fontSize:12, outline:"none", boxSizing:"border-box" as any,
                boxShadow:search?`0 0 0 3px ${C.purple}15`:"none",
              }}
            />
          </div>
          {/* Filtros rol */}
          <div style={{ display:"flex", gap:6 }}>
            {[
              {val:"todos",  label:"Todos"},
              {val:"admin",  label:"⚙️ Admins"},
              {val:"seller", label:"🛒 Vendedores"},
            ].map(f => (
              <button key={f.val} onClick={() => setFiltroRol(f.val)}
                style={{
                  padding:"6px 14px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer",
                  background:filtroRol===f.val?`linear-gradient(135deg,${C.purple},${C.purpleLight})`:C.gray100,
                  color:filtroRol===f.val?C.white:C.gray500,
                  border:"none", boxShadow:filtroRol===f.val?`0 3px 10px ${C.purple}40`:"none",
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de colaboradores */}
        <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.gray200}`, overflow:"hidden" }}>
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 0", gap:10, color:C.gray400, fontSize:13 }}>
              <div style={{ width:20, height:20, border:`2px solid ${C.purple}28`, borderTopColor:C.purple, borderRadius:"50%", animation:"spin .75s linear infinite" }}/>
              Cargando equipo...
            </div>
          ) : adminsFiltrados.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 16px" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>👥</div>
              <p style={{ fontSize:14, fontWeight:700, color:C.gray100, margin:"0 0 4px" }}>Sin resultados</p>
              <p style={{ fontSize:12, color:C.gray400 }}>
                {search ? "Prueba con otro término de búsqueda" : "No hay colaboradores registrados"}
              </p>
            </div>
          ) : (
            <>
              {/* Header tabla */}
              <div style={{
                display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto",
                padding:"10px 20px", background:C.gray50,
                borderBottom:`1px solid ${C.gray200}`,
              }}>
                {["Colaborador","Rol","Estado","Registrado","Acciones"].map((h,i) => (
                  <div key={i} style={{ fontSize:10, fontWeight:800, color:C.gray400, textTransform:"uppercase", letterSpacing:"0.1em", textAlign:i===4?"right":"left" }}>
                    {h}
                  </div>
                ))}
              </div>

              {adminsFiltrados.map((a, idx) => {
                const rolCfg    = ROL_CONF[a.rol||"seller"] || ROL_CONF.seller;
                const estadoCfg = ESTADO_CONF[a.estado||"activo"] || ESTADO_CONF.activo;
                const isSelf    = a.id === currentUser?.uid;

                return (
                  <div key={a.id} style={{
                    display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto",
                    padding:"14px 20px", alignItems:"center",
                    borderBottom: idx < adminsFiltrados.length-1 ? `1px solid ${C.gray100}` : "none",
                    background: a.estado==="suspendido" ? "#fffbfb" : C.white,
                    transition:"background .1s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.gray50}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = a.estado==="suspendido"?"#fffbfb":C.white}>

                    {/* Colaborador */}
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{
                        width:40, height:40, borderRadius:11, flexShrink:0,
                        background: a.fotoPerfil ? "transparent" : a.superadmin ? `linear-gradient(135deg,${C.purple},${C.orange})` : a.rol==="admin" ? C.purpleBg : C.orangeBg,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:14, fontWeight:900,
                        color: a.superadmin ? C.white : a.rol==="admin" ? C.purple : C.orange,
                        border: `2px solid ${a.superadmin ? C.purple + "40" : C.gray200}`,
                        overflow:"hidden",
                      }}>
                        {a.fotoPerfil
                          ? <img src={a.fotoPerfil} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                          : getInitials(a.nombre||a.email||"?")}
                      </div>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:C.gray900 }}>
                            {a.nombre || a.email?.split("@")[0] || "—"}
                          </span>
                          {a.superadmin && (
                            <span style={{ fontSize:8, fontWeight:900, padding:"2px 6px", borderRadius:20, background:C.purple, color:C.white }}>SUPERADMIN</span>
                          )}
                          {isSelf && (
                            <span style={{ fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:20, background:C.greenBg, color:C.greenDark, border:`1px solid ${C.green}30` }}>Tú</span>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:C.gray400, marginTop:2 }}>{a.email}</div>
                        {a.cargo && <div style={{ fontSize:10, color:C.gray400 }}>{a.cargo}</div>}
                      </div>
                    </div>

                    {/* Rol */}
                    <span style={{
                      fontSize:10, fontWeight:800, padding:"4px 10px", borderRadius:20,
                      background:rolCfg.bg, color:rolCfg.color,
                      border:`1px solid ${rolCfg.color}25`,
                      display:"inline-flex", alignItems:"center", gap:4,
                    }}>
                      {rolCfg.emoji} {rolCfg.label}
                    </span>

                    {/* Estado */}
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:estadoCfg.color, boxShadow:a.estado==="activo"?`0 0 6px ${C.greenDark}`:"none" }}/>
                      <span style={{ fontSize:11, fontWeight:600, color:estadoCfg.color }}>{estadoCfg.label}</span>
                    </div>

                    {/* Registrado */}
                    <span style={{ fontSize:11, color:C.gray400 }}>hace {tiempoDesde(a.fecha_registro)}</span>

                    {/* Acciones */}
                    <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end" }}>
                      {esSuperadmin && !a.superadmin ? (
                        <>
                          {/* Cambiar rol */}
                          <select value={a.rol||"seller"} onChange={e => cambiarRol(a.id, e.target.value)}
                            style={{
                              fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:8,
                              border:`1px solid ${C.gray200}`, background:C.gray50, color:C.gray100, cursor:"pointer", outline:"none",
                            }}>
                            <option value="seller">Vendedor</option>
                            <option value="admin">Admin</option>
                          </select>

                          {/* Suspender/Activar */}
                          <button onClick={() => toggleEstado(a.id)}
                            style={{
                              padding:"5px 12px", borderRadius:8, fontSize:11, fontWeight:700,
                              border:`1px solid ${a.estado==="activo"?C.gray200:C.purpleBorder}`,
                              background:a.estado==="activo"?C.gray50:C.purpleBg,
                              color:a.estado==="activo"?C.gray500:C.purple,
                              cursor:"pointer",
                            }}>
                            {a.estado==="activo" ? "Suspender" : "Activar"}
                          </button>

                          {/* Eliminar */}
                          {confirmDel === a.id ? (
                            <div style={{ display:"flex", gap:5 }}>
                              <button onClick={() => eliminar(a.id)}
                                style={{ padding:"5px 10px", borderRadius:8, background:C.red, color:C.white, border:"none", cursor:"pointer", fontSize:11, fontWeight:800 }}>
                                Confirmar
                              </button>
                              <button onClick={() => setConfirmDel(null)}
                                style={{ padding:"5px 10px", borderRadius:8, background:C.gray100, color:C.gray500, border:"none", cursor:"pointer", fontSize:11 }}>
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDel(a.id)}
                              style={{ padding:"5px 12px", borderRadius:8, fontSize:11, fontWeight:700, border:`1px solid #fecaca`, background:C.redBg, color:C.red, cursor:"pointer" }}>
                              Eliminar
                            </button>
                          )}
                        </>
                      ) : a.superadmin ? (
                        <span style={{ fontSize:11, color:C.gray300, fontStyle:"italic" }}>Protegido</span>
                      ) : (
                        <span style={{ fontSize:11, color:C.gray300, fontStyle:"italic" }}>Solo lectura</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <p style={{ fontSize:11, color:C.gray400, textAlign:"center", marginTop:14 }}>
          {adminsFiltrados.length} de {admins.length} colaboradores · Actualizado en tiempo real
        </p>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        select { -webkit-appearance: none; appearance: none; }
      `}</style>
    </>
  );
}