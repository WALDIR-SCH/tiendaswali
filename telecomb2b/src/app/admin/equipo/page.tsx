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
import {
  UserPlus, Search, Shield, Users, X, CheckCircle2,
  AlertCircle, Clock, MoreVertical, Edit, Trash2,
  ToggleLeft, ToggleRight, Mail, Phone, User as UserIcon,
  Calendar, ShieldCheck, ShieldAlert, Key, Eye, EyeOff,
  Download, RefreshCw, Filter, ChevronDown, ChevronUp,
  Settings, Award, Crown, Star, Zap, Flag, Lock,
  Power, PowerOff
} from "lucide-react";

/* ── PALETA MUNDO MÓVIL ─────────────────────────────────────────────────── */
const C = {
  purple:      "#7c3aed",
  purpleLight: "#9851F9",
  purpleBg:    "#f5f3ff",
  purpleBorder:"#ddd6fe",
  orange:      "#FF6600",
  orangeLight: "#ff8333",
  orangeBg:    "#fff7ed",
  orangeBorder:"#fed7aa",
  yellow:      "#F6FA00",
  yellowBg:    "#fefce8",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  greenBg:     "#f0fdf4",
  greenBorder: "#bbf7d0",
  red:         "#dc2626",
  redLight:    "#ef4444",
  redBg:       "#fef2f2",
  redBorder:   "#fecaca",
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
};

interface AdminUser {
  id: string;
  email?: string;
  nombre?: string;
  rol?: string;
  cargo?: string;
  estado?: string;
  superadmin?: boolean;
  fotoPerfil?: string;
  fecha_registro?: any;
  telefono?: string;
  ultimo_acceso?: any;
  permisos?: string[];
  verificado?: boolean;
}

const ROL_CONF: Record<string,{label:string;color:string;bg:string;emoji:string;icon:any}> = {
  admin:  { label:"Administrador", color:C.purple,    bg:C.purpleBg,  emoji:"⚙️", icon: Shield },
  seller: { label:"Vendedor",      color:C.orange,    bg:C.orangeBg,  emoji:"🛒", icon: Users },
};

const ESTADO_CONF: Record<string,{label:string;color:string;bg:string;border:string;icon:any}> = {
  activo:     { label:"Activo",     color:C.greenDark, bg:C.greenBg, border:C.greenBorder, icon: CheckCircle2 },
  suspendido: { label:"Suspendido", color:C.red,       bg:C.redBg,   border:C.redBorder,   icon: AlertCircle },
  inactivo:   { label:"Inactivo",   color:C.gray500,   bg:C.gray100, border:C.gray200,     icon: Clock },
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

function formatearFecha(fecha: any): string {
  if (!fecha) return "—";
  try {
    const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return d.toLocaleDateString("es-PE", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch { return "—"; }
}

/* ── Indicador fuerza password ──────────────────────────────────────────── */
function PassStrength({ pass }: { pass: string }) {
  if (!pass) return null;
  
  // Criterios de seguridad
  const tieneLongitud = pass.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(pass);
  const tieneNumero = /[0-9]/.test(pass);
  const tieneEspecial = /[^A-Za-z0-9]/.test(pass);
  
  const score = [tieneLongitud, tieneMayuscula, tieneNumero, tieneEspecial].filter(Boolean).length;
  
  const configs = [
    { color: "#ef4444", label: "Muy débil", icon: AlertCircle },
    { color: "#f97316", label: "Débil", icon: AlertCircle },
    { color: "#eab308", label: "Buena", icon: Shield },
    { color: "#22c55e", label: "Fuerte", icon: ShieldCheck },
  ];
  
  const config = configs[score - 1] || configs[0];
  const Icon = config.icon;
  
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:"flex", gap:4, marginBottom:6 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ 
            flex:1, height:4, borderRadius:4, 
            background: i < score ? config.color : C.gray200,
            transition:"all .3s ease",
            boxShadow: i < score ? `0 0 8px ${config.color}60` : "none"
          }}/>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <Icon size={12} style={{ color: config.color }} />
        <span style={{ fontSize:10, fontWeight:700, color: config.color }}>
          {config.label}
        </span>
        <div style={{ display:"flex", gap:8, marginLeft:"auto" }}>
          {tieneLongitud && <span style={{ fontSize:8, padding:"2px 6px", borderRadius:12, background:C.greenBg, color:C.greenDark }}>8+ chars</span>}
          {tieneMayuscula && <span style={{ fontSize:8, padding:"2px 6px", borderRadius:12, background:C.greenBg, color:C.greenDark }}>Mayús</span>}
          {tieneNumero && <span style={{ fontSize:8, padding:"2px 6px", borderRadius:12, background:C.greenBg, color:C.greenDark }}>Núm</span>}
          {tieneEspecial && <span style={{ fontSize:8, padding:"2px 6px", borderRadius:12, background:C.greenBg, color:C.greenDark }}>Especial</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Modal de confirmación para acciones ───────────────────────────────── */
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, type = "danger" }: any) {
  if (!isOpen) return null;
  
  const colors = {
    danger: { bg: C.redBg, color: C.red, border: C.redBorder, icon: AlertCircle },
    warning: { bg: C.orangeBg, color: C.orange, border: C.orangeBorder, icon: AlertCircle },
    success: { bg: C.greenBg, color: C.greenDark, border: C.greenBorder, icon: CheckCircle2 },
  };
  
  const cfg = colors[type as keyof typeof colors] || colors.danger;
  const Icon = cfg.icon;
  
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:100,
      background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16,
    }} onClick={onClose}>
      <div style={{
        background:C.white, borderRadius:20, maxWidth:400, width:"100%",
        border:`1px solid ${C.gray200}`, boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
        overflow:"hidden", animation:"slideUp 0.2s ease",
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ padding:20, textAlign:"center" }}>
          <div style={{
            width:56, height:56, borderRadius:"50%",
            background:cfg.bg, border:`2px solid ${cfg.border}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 16px",
          }}>
            <Icon size={28} style={{ color:cfg.color }} />
          </div>
          <h3 style={{ fontSize:18, fontWeight:800, color:C.gray900, margin:"0 0 8px" }}>{title}</h3>
          <p style={{ fontSize:14, color:C.gray500, lineHeight:1.5, margin:0 }}>{message}</p>
        </div>
        
        <div style={{ display:"flex", borderTop:`1px solid ${C.gray200}` }}>
          <button onClick={onClose}
            style={{
              flex:1, padding:"14px", fontSize:13, fontWeight:600,
              background:C.white, color:C.gray600,
              border:"none", cursor:"pointer",
            }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{
              flex:1, padding:"14px", fontSize:13, fontWeight:800,
              background:cfg.color, color:C.white,
              border:"none", cursor:"pointer",
              borderLeft:`1px solid ${C.gray200}`,
            }}>
            Confirmar
          </button>
        </div>
      </div>
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
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [confirmDel,   setConfirmDel]   = useState<string|null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<{id:string, accion:'suspender'|'activar'} | null>(null);
  const [editId,       setEditId]       = useState<string|null>(null);
  const [showFilters,  setShowFilters]  = useState(false);
  const [stats,        setStats]        = useState({
    total:0, admins:0, sellers:0, activos:0, suspendidos:0
  });

  // Form nuevo usuario
  const [fNombre,   setFNombre]   = useState("");
  const [fEmail,    setFEmail]    = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fRol,      setFRol]      = useState<"admin"|"seller">("seller");
  const [fCargo,    setFCargo]    = useState("");
  const [fTel,      setFTel]      = useState("");
  const [creando,   setCreando]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* ── Auth ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) return;
      setCurrentUser(u);
      try {
        const { doc: docFn, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(docFn(db, "usuarios", u.uid));
        if (snap.exists()) {
          const userData = snap.data();
          setEsSuperadmin(userData.superadmin === true);
        }
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
      
      const sorted = lista.sort((a,b) => {
        if (a.superadmin && !b.superadmin) return -1;
        if (!a.superadmin && b.superadmin) return 1;
        if (a.rol === "admin" && b.rol !== "admin") return -1;
        if (a.rol !== "admin" && b.rol === "admin") return 1;
        return (a.nombre||"").localeCompare(b.nombre||"");
      });
      
      setAdmins(sorted);
      
      // Calcular stats
      setStats({
        total: sorted.length,
        admins: sorted.filter(u => u.rol === "admin").length,
        sellers: sorted.filter(u => u.rol === "seller").length,
        activos: sorted.filter(u => u.estado === "activo").length,
        suspendidos: sorted.filter(u => u.estado === "suspendido").length,
      });
      
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
    
    const toastId = toast.loading("Creando colaborador...");
    
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
        permisos:        fRol === "admin" ? ["*"] : ["ver_catalogo", "crear_pedidos"],
        fecha_registro:  Timestamp.now(),
        ultimo_acceso:   null,
      });
      
      toast.success(`✅ ${fRol==="admin"?"Administrador":"Vendedor"} creado correctamente`, { id: toastId });
      
      setShowForm(false);
      setFNombre(""); setFEmail(""); setFPassword(""); setFCargo(""); setFTel("");
      setFPassword("");
      
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") {
        toast.error("❌ Ese email ya está registrado", { id: toastId });
      } else {
        toast.error("Error: " + (e.message||"intenta de nuevo"), { id: toastId });
      }
    } finally { 
      setCreando(false); 
    }
  };

  /* ── Cambiar rol ─────────────────────────────────────────────────────── */
  const cambiarRol = async (id: string, nuevoRol: string) => {
    const a = admins.find(x => x.id === id);
    if (a?.superadmin) { toast.error("No puedes cambiar el rol del superadmin"); return; }
    
    const toastId = toast.loading("Actualizando rol...");
    
    try {
      await updateDoc(doc(db, "usuarios", id), { 
        rol: nuevoRol,
        permisos: nuevoRol === "admin" ? ["*"] : ["ver_catalogo", "crear_pedidos"]
      });
      toast.success("✅ Rol actualizado", { id: toastId });
    } catch { 
      toast.error("❌ Error al actualizar", { id: toastId }); 
    }
  };

  /* ── Suspender/Activar (CONEXIÓN REAL CON FIREBASE) ────────────────── */
  const toggleEstado = async (id: string) => {
    const a = admins.find(x => x.id === id);
    if (a?.superadmin) { 
      toast.error("No puedes modificar al superadmin"); 
      setConfirmSuspend(null);
      return; 
    }
    
    const nuevoEstado = a?.estado === "activo" ? "suspendido" : "activo";
    const accion = nuevoEstado === "activo" ? "activar" : "suspender";
    
    const toastId = toast.loading(`${accion === "activar" ? "Activando" : "Suspendiendo"} cuenta...`);
    
    try {
      await updateDoc(doc(db, "usuarios", id), { 
        estado: nuevoEstado,
        fecha_actualizacion: Timestamp.now()
      });
      
      toast.success(
        nuevoEstado === "activo" 
          ? "✅ Cuenta activada correctamente" 
          : "⚠️ Cuenta suspendida", 
        { id: toastId }
      );
      
      // Registrar en historial (opcional)
      await setDoc(doc(db, "logs_acciones", `${id}_${Date.now()}`), {
        usuarioId: id,
        accion: accion,
        realizadaPor: currentUser?.uid,
        fecha: Timestamp.now()
      });
      
    } catch (error) { 
      toast.error("❌ Error al actualizar estado", { id: toastId }); 
    } finally {
      setConfirmSuspend(null);
    }
  };

  /* ── Eliminar ────────────────────────────────────────────────────────── */
  const eliminar = async (id: string) => {
    const a = admins.find(x => x.id === id);
    if (a?.superadmin) { 
      toast.error("El superadmin no puede ser eliminado"); 
      setConfirmDel(null); 
      return; 
    }
    
    const toastId = toast.loading("Eliminando colaborador...");
    
    try {
      await deleteDoc(doc(db, "usuarios", id));
      setConfirmDel(null);
      toast.success("✅ Colaborador eliminado del sistema", { id: toastId });
    } catch { 
      toast.error("❌ Error al eliminar", { id: toastId }); 
    }
  };

  /* ── Filtros ─────────────────────────────────────────────────────────── */
  const adminsFiltrados = admins.filter(a => {
    const matchSearch = !search ||
      (a.nombre||"").toLowerCase().includes(search.toLowerCase()) ||
      (a.email||"").toLowerCase().includes(search.toLowerCase()) ||
      (a.cargo||"").toLowerCase().includes(search.toLowerCase()) ||
      (a.telefono||"").includes(search);
    
    const matchRol = filtroRol === "todos" || a.rol === filtroRol;
    const matchEstado = filtroEstado === "todos" || a.estado === filtroEstado;
    
    return matchSearch && matchRol && matchEstado;
  });

  /* ─────────────────── RENDER ─────────────────────────────────────────── */
  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius:"12px", fontWeight:600, fontSize:"13px" },
        success: { icon: "✅", duration: 4000 },
        error: { icon: "❌", duration: 5000 },
      }}/>

      {/* Modales de confirmación */}
      <ConfirmModal
        isOpen={confirmSuspend !== null}
        onClose={() => setConfirmSuspend(null)}
        onConfirm={() => confirmSuspend && toggleEstado(confirmSuspend.id)}
        title={confirmSuspend?.accion === "suspender" ? "¿Suspender cuenta?" : "¿Activar cuenta?"}
        message={confirmSuspend?.accion === "suspender" 
          ? "El usuario no podrá acceder al sistema hasta que sea reactivado." 
          : "El usuario podrá acceder nuevamente al sistema."}
        type={confirmSuspend?.accion === "suspender" ? "danger" : "success"}
      />
      
      <ConfirmModal
        isOpen={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => confirmDel && eliminar(confirmDel)}
        title="¿Eliminar colaborador?"
        message="Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema."
        type="danger"
      />

      <div style={{ 
        maxWidth:1200, 
        fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
        margin:"0 auto",
        padding:"20px 24px"
      }}>

        {/* Encabezado */}
        <div style={{ 
          display:"flex", 
          alignItems:"flex-start", 
          justifyContent:"space-between", 
          marginBottom:28, 
          flexWrap:"wrap", 
          gap:16 
        }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
              <div style={{
                width:48, height:48, borderRadius:14,
                background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:`0 8px 16px ${C.purple}30`,
              }}>
                <Users size={22} color={C.white} />
              </div>
              <div>
                <h1 style={{ fontSize:26, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>
                  Equipo Administrativo
                </h1>
                <p style={{ fontSize:13, color:C.gray400, margin:"4px 0 0" }}>
                  Gestiona administradores y vendedores del sistema
                </p>
              </div>
            </div>
          </div>
          
          {esSuperadmin && (
            <button onClick={() => setShowForm(v => !v)}
              style={{
                display:"flex", alignItems:"center", gap:8, padding:"12px 24px",
                borderRadius:30,
                background: showForm ? C.gray100 : `linear-gradient(135deg,${C.purple},${C.purpleLight})`,
                color: showForm ? C.gray500 : C.white,
                fontSize:13, fontWeight:800, border:"none", cursor:"pointer",
                boxShadow: showForm ? "none" : `0 8px 20px ${C.purple}40`,
                transition:"all .2s",
              }}>
              {showForm ? (
                <>
                  <X size={16} /> Cancelar
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Agregar colaborador
                </>
              )}
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display:"grid", 
          gridTemplateColumns:"repeat(5,1fr)", 
          gap:12, 
          marginBottom:24 
        }}>
          {[
            { label:"Total",        value:stats.total,      color:C.purple,    icon:Users,        bg:C.purpleBg,     border:C.purpleBorder },
            { label:"Administradores", value:stats.admins,   color:C.purpleLight, icon:Shield,      bg:C.purpleBg,     border:C.purpleBorder },
            { label:"Vendedores",   value:stats.sellers,    color:C.orange,    icon:Users,        bg:C.orangeBg,     border:C.orangeBorder },
            { label:"Activos",      value:stats.activos,    color:C.greenDark, icon:CheckCircle2, bg:C.greenBg,      border:C.greenBorder },
            { label:"Suspendidos",  value:stats.suspendidos,color:C.red,       icon:AlertCircle,  bg:C.redBg,        border:C.redBorder },
          ].map(s => (
            <div key={s.label} style={{
              background:C.white, borderRadius:16, padding:"16px 14px",
              border:`1px solid ${s.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              transition:"all .2s",
              boxShadow:"0 2px 8px rgba(0,0,0,0.02)",
            }}>
              <div>
                <div style={{ fontSize:20, fontWeight:900, color:s.color, lineHeight:1.2 }}>{s.value}</div>
                <div style={{ fontSize:11, fontWeight:600, color:C.gray400, marginTop:2 }}>{s.label}</div>
              </div>
              <div style={{
                width:36, height:36, borderRadius:10,
                background:s.bg, border:`1px solid ${s.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <s.icon size={16} style={{ color:s.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Formulario nuevo colaborador */}
        {showForm && esSuperadmin && (
          <div style={{
            background:`linear-gradient(135deg,${C.white},${C.gray50})`,
            borderRadius:20, padding:28, marginBottom:24,
            border:`1px solid ${C.purpleBorder}`,
            boxShadow:`0 12px 30px ${C.purple}15`,
            position:"relative",
            overflow:"hidden",
          }}>
            {/* Decorative elements */}
            <div style={{
              position:"absolute", top:-20, right:-20, width:150, height:150,
              borderRadius:"50%", background:`${C.purple}08`,
              pointerEvents:"none",
            }} />
            
            <h3 style={{ 
              fontSize:14, fontWeight:800, 
              color:C.purple, margin:"0 0 22px", 
              textTransform:"uppercase", 
              letterSpacing:"0.1em",
              display:"flex",
              alignItems:"center",
              gap:8
            }}>
              <UserPlus size={16} /> Nuevo Colaborador
            </h3>

            {/* Tipo de rol */}
            <div style={{ marginBottom:24 }}>
              <label style={{ 
                fontSize:11, fontWeight:700, color:C.gray500, 
                display:"block", marginBottom:10,
                textTransform:"uppercase", letterSpacing:"0.05em" 
              }}>
                Nivel de acceso *
              </label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {[
                  { val:"seller", label:"Vendedor", desc:"Acceso a ventas, catálogo y POS", icon:Users, color:C.orange },
                  { val:"admin",  label:"Administrador", desc:"Acceso completo al sistema", icon:Shield, color:C.purple },
                ].map(opt => {
                  const Icon = opt.icon;
                  const isSelected = fRol === opt.val;
                  return (
                    <button key={opt.val} type="button" onClick={() => setFRol(opt.val as any)}
                      style={{
                        padding:"16px 18px", borderRadius:14, cursor:"pointer", textAlign:"left",
                        background: isSelected ? `${opt.color}08` : C.white,
                        border: `2px solid ${isSelected ? opt.color : C.gray200}`,
                        transition:"all .2s",
                        position:"relative",
                        overflow:"hidden",
                      }}>
                      {isSelected && (
                        <div style={{
                          position:"absolute", top:0, right:0, width:30, height:30,
                          background:opt.color,
                          clipPath:"polygon(100% 0, 0 0, 100% 100%)",
                        }}>
                          <CheckCircle2 size={12} color={C.white} style={{ position:"absolute", top:4, right:4 }} />
                        </div>
                      )}
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                        <Icon size={18} color={isSelected ? opt.color : C.gray500} />
                        <span style={{ fontSize:14, fontWeight:800, color:isSelected?opt.color:C.gray700 }}>
                          {opt.label}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:C.gray400 }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campos */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
              {[
                { label:"Nombre completo *", value:fNombre, set:setFNombre, ph:"Juan Pérez", icon:UserIcon },
                { label:"Email *",           value:fEmail,  set:setFEmail,  ph:"vendedor@empresa.com", icon:Mail, type:"email" },
                { label:"Teléfono",          value:fTel,    set:setFTel,    ph:"+51 999 999 999", icon:Phone },
                { label:"Cargo (opcional)",  value:fCargo,  set:setFCargo,  ph:"Ej: Asesor Comercial", icon:Shield },
              ].map((f,i) => {
                const Icon = f.icon;
                return (
                  <div key={i}>
                    <label style={{ fontSize:10, fontWeight:700, color:C.gray400, display:"block", marginBottom:6 }}>
                      {f.label}
                    </label>
                    <div style={{ position:"relative" }}>
                      <Icon size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.gray400 }} />
                      <input 
                        type={f.type || "text"} 
                        value={f.value} 
                        onChange={e => f.set(e.target.value)} 
                        placeholder={f.ph}
                        style={{
                          width:"100%", paddingLeft:36, paddingRight:12, paddingTop:12, paddingBottom:12,
                          borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:13,
                          outline:"none", boxSizing:"border-box" as any,
                          background: f.value ? C.white : C.gray50,
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = C.purple}
                        onBlur={e => e.currentTarget.style.borderColor = C.gray200}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:10, fontWeight:700, color:C.gray400, display:"block", marginBottom:6 }}>
                Contraseña * (mín. 8 caracteres)
              </label>
              <div style={{ position:"relative" }}>
                <Key size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.gray400 }} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={fPassword} 
                  onChange={e => setFPassword(e.target.value)} 
                  placeholder="••••••••"
                  style={{
                    width:"100%", paddingLeft:36, paddingRight:40, paddingTop:12, paddingBottom:12,
                    borderRadius:12, border:`1.5px solid ${fPassword ? C.purple : C.gray200}`, fontSize:13,
                    outline:"none", boxSizing:"border-box" as any,
                    background: fPassword ? C.white : C.gray50,
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = C.purple}
                  onBlur={e => e.currentTarget.style.borderColor = C.gray200}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", color:C.gray400
                  }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <PassStrength pass={fPassword} />
            </div>

            {/* Aviso de seguridad */}
            <div style={{
              padding:"14px 16px", borderRadius:12, 
              background:`${C.orange}08`, border:`1px solid ${C.orange}25`,
              display:"flex", alignItems:"flex-start", gap:10,
              marginBottom:20,
            }}>
              <Lock size={16} style={{ color:C.orange, flexShrink:0, marginTop:1 }} />
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:C.orange, margin:"0 0 3px" }}>
                  Credenciales de acceso
                </p>
                <p style={{ fontSize:11, color:C.orange + "cc", margin:0, lineHeight:1.4 }}>
                  La cuenta se creará en Firebase Authentication. 
                  El usuario podrá iniciar sesión con este email y contraseña.
                  Recomienda cambiar la contraseña en el primer acceso.
                </p>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowForm(false)}
                style={{
                  padding:"12px 24px", borderRadius:30,
                  background:C.white, color:C.gray600,
                  border:`1.5px solid ${C.gray200}`,
                  fontSize:13, fontWeight:700, cursor:"pointer",
                }}>
                Cancelar
              </button>
              <button onClick={crearColaborador} disabled={creando || !fNombre || !fEmail || !fPassword}
                style={{
                  padding:"12px 30px", borderRadius:30,
                  background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,
                  color:C.white, fontSize:13, fontWeight:800, border:"none",
                  cursor:creando||!fNombre||!fEmail||!fPassword?"not-allowed":"pointer",
                  opacity:creando||!fNombre||!fEmail||!fPassword?0.6:1,
                  boxShadow:creando||!fNombre||!fEmail||!fPassword?"none":`0 8px 20px ${C.purple}40`,
                  display:"flex", alignItems:"center", gap:8,
                }}>
                {creando ? (
                  <>
                    <div style={{ width:16, height:16, border:`2px solid ${C.white}60`, borderTopColor:C.white, borderRadius:"50%", animation:"spin .75s linear infinite" }} />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Crear {fRol === "admin" ? "Administrador" : "Vendedor"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filtros + búsqueda */}
        <div style={{
          background:C.white, borderRadius:16, padding:"14px 16px", marginBottom:16,
          border:`1px solid ${C.gray200}`, boxShadow:"0 2px 8px rgba(0,0,0,0.02)",
        }}>
          
          {/* Primera fila: búsqueda y filtros rápidos */}
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            {/* Búsqueda */}
            <div style={{ flex:1, minWidth:250, position:"relative" }}>
              <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.gray400 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, cargo o teléfono..."
                style={{
                  width:"100%", paddingLeft:36, paddingRight:12, paddingTop:10, paddingBottom:10,
                  borderRadius:30, border:`1.5px solid ${search ? C.purple : C.gray200}`,
                  fontSize:13, outline:"none", boxSizing:"border-box" as any,
                  background: search ? C.white : C.gray50,
                  transition:"all .2s",
                  boxShadow: search ? `0 0 0 4px ${C.purple}15` : "none",
                }}
              />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{
                    position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", color:C.gray400
                  }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Botón mostrar filtros */}
            <button onClick={() => setShowFilters(!showFilters)}
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
                borderRadius:30, background: showFilters ? C.purple : C.white,
                border:`1.5px solid ${showFilters ? C.purple : C.gray200}`,
                fontSize:12, fontWeight:600, color: showFilters ? C.white : C.gray600,
                cursor:"pointer",
              }}>
              <Filter size={14} />
              Filtros
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div style={{
              marginTop:16, paddingTop:16, borderTop:`1px solid ${C.gray100}`,
              display:"flex", gap:20, flexWrap:"wrap"
            }}>
              {/* Filtro por rol */}
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:C.gray400, display:"block", marginBottom:8 }}>
                  <Shield size={11} style={{ display:"inline", marginRight:4 }} /> Rol
                </label>
                <div style={{ display:"flex", gap:8 }}>
                  {[
                    {val:"todos",  label:"Todos"},
                    {val:"admin",  label:"⚙️ Admins"},
                    {val:"seller", label:"🛒 Vendedores"},
                  ].map(f => (
                    <button key={f.val} onClick={() => setFiltroRol(f.val)}
                      style={{
                        padding:"6px 14px", borderRadius:20, fontSize:11, fontWeight:700,
                        background:filtroRol===f.val ? C.purple : C.gray100,
                        color:filtroRol===f.val ? C.white : C.gray500,
                        border:"none", cursor:"pointer",
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por estado */}
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:C.gray400, display:"block", marginBottom:8 }}>
                  <CheckCircle2 size={11} style={{ display:"inline", marginRight:4 }} /> Estado
                </label>
                <div style={{ display:"flex", gap:8 }}>
                  {[
                    {val:"todos",     label:"Todos"},
                    {val:"activo",    label:"✅ Activos"},
                    {val:"suspendido",label:"⛔ Suspendidos"},
                  ].map(f => (
                    <button key={f.val} onClick={() => setFiltroEstado(f.val)}
                      style={{
                        padding:"6px 14px", borderRadius:20, fontSize:11, fontWeight:700,
                        background:filtroEstado===f.val ? C.purple : C.gray100,
                        color:filtroEstado===f.val ? C.white : C.gray500,
                        border:"none", cursor:"pointer",
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset filtros */}
              {(filtroRol !== "todos" || filtroEstado !== "todos" || search) && (
                <button onClick={() => {
                  setSearch("");
                  setFiltroRol("todos");
                  setFiltroEstado("todos");
                }}
                  style={{
                    marginLeft:"auto", padding:"6px 14px", borderRadius:20,
                    background:C.gray100, color:C.gray600, fontSize:11, fontWeight:600,
                    border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4
                  }}>
                  <X size={12} /> Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lista de colaboradores */}
        <div style={{
          background:C.white, borderRadius:20, border:`1px solid ${C.gray200}`,
          overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.04)",
        }}>
          
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:C.gray400 }}>
              <div style={{ width:24, height:24, border:`2px solid ${C.purple}28`, borderTopColor:C.purple, borderRadius:"50%", animation:"spin .75s linear infinite" }}/>
              Cargando equipo...
            </div>
          ) : adminsFiltrados.length === 0 ? (
            <div style={{ textAlign:"center", padding:"64px 24px" }}>
              <div style={{
                width:72, height:72, borderRadius:"50%", background:C.gray100,
                display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px"
              }}>
                <Users size={32} color={C.gray300} />
              </div>
              <p style={{ fontSize:16, fontWeight:800, color:C.gray800, margin:"0 0 6px" }}>
                No hay colaboradores
              </p>
              <p style={{ fontSize:13, color:C.gray400, margin:0 }}>
                {search || filtroRol !== "todos" || filtroEstado !== "todos"
                  ? "Prueba con otros filtros de búsqueda"
                  : "Agrega tu primer colaborador usando el botón superior"}
              </p>
            </div>
          ) : (
            <>
              {/* Header tabla */}
              <div style={{
                display:"grid", gridTemplateColumns:"2.2fr 1.2fr 1.2fr 1.3fr 1.8fr",
                padding:"14px 20px", background:C.gray50,
                borderBottom:`1px solid ${C.gray200}`,
                fontSize:11, fontWeight:700, color:C.gray400, textTransform:"uppercase", letterSpacing:"0.05em",
              }}>
                <div>Colaborador</div>
                <div>Rol</div>
                <div>Estado</div>
                <div>Registro</div>
                <div style={{ textAlign:"right" }}>Acciones</div>
              </div>

              {/* Filas */}
              {adminsFiltrados.map((a, idx) => {
                const rolCfg    = ROL_CONF[a.rol||"seller"] || ROL_CONF.seller;
                const estadoCfg = ESTADO_CONF[a.estado||"activo"] || ESTADO_CONF.activo;
                const isSelf    = a.id === currentUser?.uid;
                const EstadoIcon = estadoCfg.icon;
                
                // Determinar si el usuario actual tiene permisos de superadmin
                const puedeEditar = esSuperadmin && !a.superadmin;

                return (
                  <div key={a.id} style={{
                    display:"grid", gridTemplateColumns:"2.2fr 1.2fr 1.2fr 1.3fr 1.8fr",
                    padding:"16px 20px", alignItems:"center",
                    borderBottom: idx < adminsFiltrados.length-1 ? `1px solid ${C.gray100}` : "none",
                    background: a.estado === "suspendido" ? C.redBg + "40" : C.white,
                    transition:"all .15s",
                    position:"relative",
                  }}
                  onMouseEnter={e => {
                    if (a.estado !== "suspendido") {
                      (e.currentTarget as HTMLElement).style.background = C.gray50;
                    }
                  }}
                  onMouseLeave={e => {
                    if (a.estado !== "suspendido") {
                      (e.currentTarget as HTMLElement).style.background = C.white;
                    }
                  }}>

                    {/* Colaborador */}
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{
                        width:44, height:44, borderRadius:12, flexShrink:0,
                        background: a.fotoPerfil ? "transparent" : 
                                   a.superadmin ? `linear-gradient(135deg,${C.purple},${C.orange})` : 
                                   a.rol==="admin" ? C.purpleBg : C.orangeBg,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:16, fontWeight:900,
                        color: a.superadmin ? C.white : a.rol==="admin" ? C.purple : C.orange,
                        border: `2px solid ${a.superadmin ? C.purple : C.gray200}`,
                        overflow:"hidden",
                      }}>
                        {a.fotoPerfil
                          ? <img src={a.fotoPerfil} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                          : getInitials(a.nombre||a.email||"?")}
                      </div>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <span style={{ fontSize:14, fontWeight:800, color:C.gray900 }}>
                            {a.nombre || a.email?.split("@")[0] || "—"}
                          </span>
                          {a.superadmin && (
                            <span style={{
                              fontSize:8, fontWeight:900, padding:"2px 8px", borderRadius:20,
                              background:C.purple, color:C.white, letterSpacing:"0.05em",
                              display:"flex", alignItems:"center", gap:3,
                            }}>
                              <Crown size={10} /> SUPERADMIN
                            </span>
                          )}
                          {isSelf && (
                            <span style={{
                              fontSize:8, fontWeight:700, padding:"2px 8px", borderRadius:20,
                              background:C.greenBg, color:C.greenDark,
                              border:`1px solid ${C.green}30`,
                            }}>
                              TÚ
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:C.gray400, marginTop:2 }}>{a.email}</div>
                        {a.cargo && (
                          <div style={{ fontSize:10, color:C.gray400, marginTop:1 }}>
                            {a.cargo}
                          </div>
                        )}
                        {a.telefono && (
                          <div style={{ fontSize:9, color:C.gray400, marginTop:1, display:"flex", alignItems:"center", gap:3 }}>
                            <Phone size={8} /> {a.telefono}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rol */}
                    <div>
                      <span style={{
                        fontSize:11, fontWeight:800, padding:"5px 12px", borderRadius:20,
                        background:rolCfg.bg, color:rolCfg.color,
                        border:`1px solid ${rolCfg.color}25`,
                        display:"inline-flex", alignItems:"center", gap:4,
                      }}>
                        <rolCfg.icon size={12} />
                        {rolCfg.label}
                      </span>
                    </div>

                    {/* Estado */}
                    <div>
                      <div style={{
                        display:"flex", alignItems:"center", gap:6,
                        background:estadoCfg.bg, padding:"4px 10px", borderRadius:20,
                        border:`1px solid ${estadoCfg.border}`,
                        width:"fit-content",
                      }}>
                        <EstadoIcon size={12} style={{ color:estadoCfg.color }} />
                        <span style={{ fontSize:11, fontWeight:700, color:estadoCfg.color }}>
                          {estadoCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Registro */}
                    <div style={{ fontSize:11, color:C.gray400 }}>
                      <div>{tiempoDesde(a.fecha_registro)}</div>
                      <div style={{ fontSize:9, color:C.gray300, marginTop:2 }}>
                        {formatearFecha(a.fecha_registro)}
                      </div>
                    </div>

                    {/* Acciones - AHORA FUNCIONAN CORRECTAMENTE */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                      {puedeEditar ? (
                        <>
                          {/* Selector de rol */}
                          <select value={a.rol||"seller"} onChange={e => cambiarRol(a.id, e.target.value)}
                            style={{
                              fontSize:11, fontWeight:600, padding:"6px 10px", borderRadius:30,
                              border:`1px solid ${C.gray200}`, background:C.white,
                              color:C.gray700, cursor:"pointer", outline:"none",
                              boxShadow:"0 2px 4px rgba(0,0,0,0.02)",
                            }}>
                            <option value="seller">🛒 Vendedor</option>
                            <option value="admin">⚙️ Administrador</option>
                          </select>

                          {/* Botón Suspender/Activar - CON FUNCIONALIDAD REAL */}
                          <button 
                            onClick={() => setConfirmSuspend({
                              id: a.id, 
                              accion: a.estado === "activo" ? "suspender" : "activar"
                            })}
                            style={{
                              padding:"6px 14px", borderRadius:30, fontSize:11, fontWeight:700,
                              border:"none",
                              background: a.estado === "activo" ? C.redBg : C.greenBg,
                              color: a.estado === "activo" ? C.red : C.greenDark,
                              cursor:"pointer",
                              display:"flex", alignItems:"center", gap:4,
                              transition:"all .2s",
                            }}
                            onMouseEnter={e => {
                              if (a.estado === "activo") {
                                e.currentTarget.style.background = C.redBg + "dd";
                              } else {
                                e.currentTarget.style.background = C.greenBg + "dd";
                              }
                            }}
                            onMouseLeave={e => {
                              if (a.estado === "activo") {
                                e.currentTarget.style.background = C.redBg;
                              } else {
                                e.currentTarget.style.background = C.greenBg;
                              }
                            }}>
                            {a.estado === "activo" ? (
                              <>
                                <PowerOff size={14} /> Suspender
                              </>
                            ) : (
                              <>
                                <Power size={14} /> Activar
                              </>
                            )}
                          </button>

                          {/* Botón Eliminar */}
                          <button onClick={() => setConfirmDel(a.id)}
                            style={{
                              padding:"6px 12px", borderRadius:30, fontSize:11, fontWeight:700,
                              border:`1px solid ${C.redBorder}`,
                              background:C.white, color:C.red,
                              cursor:"pointer", display:"flex", alignItems:"center", gap:4,
                              transition:"all .2s",
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = C.red;
                              e.currentTarget.style.color = C.white;
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = C.white;
                              e.currentTarget.style.color = C.red;
                            }}>
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : a.superadmin ? (
                        <span style={{
                          fontSize:11, color:C.gray400, padding:"4px 12px", borderRadius:30,
                          background:C.gray50, fontStyle:"italic", display:"flex", alignItems:"center", gap:4,
                        }}>
                          <Lock size={12} /> Protegido
                        </span>
                      ) : (
                        <span style={{
                          fontSize:11, color:C.gray400, padding:"4px 12px", borderRadius:30,
                          background:C.gray50, display:"flex", alignItems:"center", gap:4,
                        }}>
                          <Lock size={12} /> Solo lectura
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          marginTop:16, fontSize:11, color:C.gray400, padding:"0 4px",
        }}>
          <span>
            Mostrando {adminsFiltrados.length} de {admins.length} colaboradores
          </span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}>
            <RefreshCw size={12} />
            Actualizado en tiempo real
          </span>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        select { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 12px; padding-right: 28px; }
      `}</style>
    </>
  );
}