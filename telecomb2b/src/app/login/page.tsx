"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle,
  CheckCircle, Loader2, ChevronLeft, Building2, ShieldCheck,
  Sparkles
} from "lucide-react";

// ── PALETA OFICIAL ────────────────────────────────────────────
const C = {
  purple:      "#9851F9",
  purpleDark:  "#7c3aed",
  purpleLight: "#a78bfa",
  purpleBg:    "#f5f0ff",
  purpleBorder:"#ddd6fe",
  orange:      "#FF6600",
  yellow:      "#F6FA00",
  gold:        "#FFD700",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  white:       "#FFFFFF",
  gray50:      "#f9fafb",
  gray100:     "#f3f4f6",
  gray200:     "#e5e7eb",
  gray300:     "#d1d5db",
  gray400:     "#9ca3af",
  gray500:     "#6b7280",
  gray700:     "#374151",
  gray900:     "#111827",
  red:         "#dc2626",
  redBg:       "#fef2f2",
  redBorder:   "#fecaca",
};

// ── HELPERS ───────────────────────────────────────────────────
const setSecureCookie = (uid: string, rol: string) => {
  const payload = `${uid}.${rol}.${Date.now()}`;
  const token   = `${payload}.${btoa(payload + "-waly-b2b-secret")}`;
  document.cookie = `session=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
};

const checkRateLimit = async (email: string) => {
  const docRef  = doc(db, "intentos_login", email.toLowerCase().trim());
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.bloqueadoHasta?.toDate?.() > new Date()) {
      const min = Math.ceil((data.bloqueadoHasta.toDate() - new Date()) / 60000);
      throw new Error(`Demasiados intentos. Espera ${min} minutos.`);
    }
  }
  return { docRef, intentos: docSnap.exists() ? docSnap.data().intentos || 0 : 0 };
};

const logIntent = async (email: string, uid: string, rol: string, estado: "exito" | "fallo", msg = "") => {
  try {
    await setDoc(doc(collection(db, "logs_login")), {
      email: email.toLowerCase().trim(), uid, rol, estado,
      errorMsg: msg.substring(0, 200),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "",
      timestamp: serverTimestamp(),
    });
  } catch {}
};

// ════════════════════════════════════════════════════════════
export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const router = useRouter();

  // ── LOGIN ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    if (!email || !password) { setError("Email y contraseña requeridos"); setLoading(false); return; }
    const emailLimpio = email.toLowerCase().trim();
    try {
      const { docRef: rateLimitRef } = await checkRateLimit(emailLimpio);
      const { user } = await signInWithEmailAndPassword(auth, emailLimpio, password.trim());
      const userDoc  = await getDoc(doc(db, "usuarios", user.uid));
      if (!userDoc.exists()) { await auth.signOut(); throw new Error("Usuario no encontrado. Contacta al administrador."); }
      const userData = userDoc.data();
      if (!userData?.rol) { await auth.signOut(); throw new Error("Configuración incompleta. Contacta al administrador."); }
      const rol = userData.rol;
      if (rol === "cliente_pendiente") { await auth.signOut(); throw new Error("Cuenta pendiente de verificación. Te notificaremos por email."); }
      if (rol === "cliente" && userData.verificado !== true) { await auth.signOut(); throw new Error("Cuenta no verificada. Revisa tu correo."); }
      if (!["admin", "cliente", "seller"].includes(rol)) { await auth.signOut(); throw new Error("Rol no válido. Contacta al administrador."); }
      setSecureCookie(user.uid, rol);
      await setDoc(rateLimitRef, { intentos:0, ultimoIntento:serverTimestamp(), bloqueadoHasta:null, email:emailLimpio }).catch(() => {});
      await logIntent(emailLimpio, user.uid, rol, "exito");
      setSuccess("✓ Acceso exitoso. Redirigiendo...");
      setTimeout(() => router.push(rol === "admin" || rol === "seller" ? "/admin" : "/catalogo"), 700);
    } catch (err: any) {
      await logIntent(emailLimpio, "", "", "fallo", err.message).catch(() => {});
      if (["auth/wrong-password","auth/user-not-found","auth/invalid-credential"].includes(err.code)) {
        try {
          const { docRef } = await checkRateLimit(emailLimpio);
          const snap = await getDoc(docRef);
          const data = snap.data() || { intentos: 0 };
          const nuevos = (data.intentos || 0) + 1;
          await setDoc(docRef, { intentos:nuevos, ultimoIntento:serverTimestamp(), bloqueadoHasta:nuevos>=5?new Date(Date.now()+15*60000):null, email:emailLimpio });
        } catch {}
      }
      const msgs: Record<string,string> = {
        "auth/user-not-found":"Credenciales incorrectas","auth/wrong-password":"Credenciales incorrectas",
        "auth/invalid-credential":"Credenciales incorrectas","auth/too-many-requests":"Demasiados intentos. Espera.",
        "auth/invalid-email":"Formato de email inválido","auth/user-disabled":"Cuenta deshabilitada",
        "auth/network-request-failed":"Error de conexión. Verifica tu internet.",
      };
      setError(err.message?.includes("Demasiados") ? err.message : msgs[err.code] || err.message || "Error al iniciar sesión");
    } finally { setLoading(false); }
  };

  const handleRecuperar = async () => {
    if (!email) { setError("Ingresa tu email primero"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      setSuccess(`Correo enviado a ${email}. Revisa tu bandeja.`);
    } catch { setError("No pudimos enviar el correo. Verifica el email."); }
    finally { setLoading(false); }
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <>
      <Script src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`} strategy="afterInteractive" />

      <div style={{ minHeight:"100vh", background:C.white, display:"flex" }}>

        {/* ════════════════════════════════════════
            PANEL IZQUIERDO — Imagen hero
            ════════════════════════════════════════ */}
        <div className="login-panel-left" style={{
          width:"45%", flexShrink:0, position:"relative", overflow:"hidden",
        }}>
          {/* ── IMAGEN DE FONDO ─────────────────────
              OPCIÓN A — Si usas la imagen local en /public/images/login-hero.png
              Cambia el src a la ruta correcta de tu proyecto.
              
              OPCIÓN B — Si usas una URL externa, pon la URL directamente en src.
          ─────────────────────────────────────── */}
          <Image
            src="/images/login-hero.jpg"
            alt="Tiendas Waly B2B"
            fill
            sizes="45vw"
            style={{ objectFit:"cover", objectPosition:"center center" }}
            priority
            quality={85}
          />

        </div>

        {/* ════════════════════════════════════════
            PANEL DERECHO — Formulario
            ════════════════════════════════════════ */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", overflowY:"auto", background:C.white }}>
          <div style={{ width:"100%", maxWidth:420 }}>

            {/* Logo mobile (solo se ve en móvil) */}
            <div className="login-logo-mobile" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
              <div style={{ position:"relative", width:40, height:40, flexShrink:0 }}>
                <div className="logo-spin-login" style={{ position:"absolute", inset:0, borderRadius:11 }} />
                <div style={{ position:"absolute", inset:2, borderRadius:9, background:`linear-gradient(135deg,${C.orange},${C.yellow})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Sparkles size={16} color="#000" />
                </div>
              </div>
              <div>
                <p style={{ margin:0, fontSize:15, fontWeight:900, color:C.gray900, letterSpacing:"-0.02em" }}>
                  TIENDAS <span style={{ color:C.purple }}>WALY</span>
                </p>
                <p style={{ margin:0, fontSize:10, color:C.gray500, textTransform:"uppercase", letterSpacing:"0.1em" }}>Plataforma B2B</p>
              </div>
            </div>

            {/* Encabezado */}
            <div style={{ marginBottom:28 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, marginBottom:12, background:`${C.purple}10`, border:`1px solid ${C.purple}25` }}>
                <ShieldCheck size={13} color={C.purple} />
                <span style={{ fontSize:11, fontWeight:700, color:C.purple, letterSpacing:"0.05em", textTransform:"uppercase" }}>Acceso Seguro B2B</span>
              </div>
              <h1 style={{ fontSize:26, fontWeight:900, color:C.gray900, margin:"0 0 6px", letterSpacing:"-0.03em" }}>
                Bienvenido de vuelta
              </h1>
              <p style={{ fontSize:14, color:C.gray500, margin:0 }}>Accede con tu cuenta empresarial</p>
            </div>

            {/* ── FORMULARIO ─────────────────────── */}
            <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Email */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                  Email corporativo
                </label>
                <div style={{ position:"relative" }}>
                  <Mail size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.purple, pointerEvents:"none" }} />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="empresa@dominio.com"
                    style={{ width:"100%", paddingLeft:40, paddingRight:14, paddingTop:12, paddingBottom:12, borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white, transition:"all .2s", fontWeight:500 }}
                    onFocus={e => { e.target.style.borderColor=C.purple; e.target.style.boxShadow=`0 0 0 3px ${C.purple}18`; e.target.style.background=`${C.purple}04`; }}
                    onBlur={e  => { e.target.style.borderColor=C.gray200; e.target.style.boxShadow="none"; e.target.style.background=C.white; }} />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray700, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    Contraseña
                  </label>
                  <button type="button" onClick={handleRecuperar}
                    style={{ fontSize:12, fontWeight:600, color:C.purple, background:"none", border:"none", cursor:"pointer", padding:0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.purpleDark)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.purple)}>
                    ¿Olvidaste?
                  </button>
                </div>
                <div style={{ position:"relative" }}>
                  <Lock size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.purple, pointerEvents:"none" }} />
                  <input type={showPwd ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width:"100%", paddingLeft:40, paddingRight:44, paddingTop:12, paddingBottom:12, borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white, transition:"all .2s", fontWeight:500 }}
                    onFocus={e => { e.target.style.borderColor=C.purple; e.target.style.boxShadow=`0 0 0 3px ${C.purple}18`; e.target.style.background=`${C.purple}04`; }}
                    onBlur={e  => { e.target.style.borderColor=C.gray200; e.target.style.boxShadow="none"; e.target.style.background=C.white; }} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.gray400, display:"flex", alignItems:"center", padding:2 }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.purple)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.gray400)}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"11px 13px", borderRadius:11, background:C.redBg, border:`1px solid ${C.redBorder}` }}>
                  <AlertCircle size={14} style={{ color:C.red, marginTop:1, flexShrink:0 }} />
                  <span style={{ fontSize:13, color:C.red, fontWeight:500 }}>{error}</span>
                </div>
              )}

              {/* Éxito */}
              {success && (
                <div style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 13px", borderRadius:11, background:`${C.greenDark}10`, border:`1px solid ${C.greenDark}30` }}>
                  <CheckCircle size={14} style={{ color:C.greenDark, flexShrink:0 }} />
                  <span style={{ fontSize:13, color:C.greenDark, fontWeight:600 }}>{success}</span>
                </div>
              )}

              {/* BOTÓN PRINCIPAL */}
              <button type="submit" disabled={loading}
                style={{
                  width:"100%", padding:"13px",
                  borderRadius:12,
                  background: loading ? C.gray200 : `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                  color: loading ? C.gray400 : C.white,
                  border:"none", fontSize:14, fontWeight:800,
                  cursor: loading ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  boxShadow: loading ? "none" : `0 4px 20px ${C.purple}45`,
                  transition:"all .2s", marginTop:4, letterSpacing:"0.01em",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = C.purpleDark); }}
                onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = `linear-gradient(135deg,${C.purple},${C.purpleDark})`); }}>
                {loading
                  ? <><Loader2 size={15} className="spin-icon" />Verificando...</>
                  : <>Acceder al sistema <ArrowRight size={15} /></>}
              </button>
            </form>

            {/* Separador */}
            <div style={{ display:"flex", alignItems:"center", gap:12, margin:"22px 0" }}>
              <div style={{ flex:1, height:1, background:C.gray200 }} />
              <span style={{ fontSize:12, color:C.gray400, whiteSpace:"nowrap" }}>¿No tienes cuenta?</span>
              <div style={{ flex:1, height:1, background:C.gray200 }} />
            </div>

            {/* Botón registro */}
            <Link href="/register"
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"12px", borderRadius:12, border:`1.5px solid ${C.gray200}`, background:C.white, fontSize:14, fontWeight:700, color:C.gray700, textDecoration:"none", transition:"all .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=C.purple; (e.currentTarget as HTMLElement).style.color=C.purple; (e.currentTarget as HTMLElement).style.background=C.purpleBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor=C.gray200; (e.currentTarget as HTMLElement).style.color=C.gray700; (e.currentTarget as HTMLElement).style.background=C.white; }}>
              <Building2 size={15} /> Solicitar acceso empresarial
            </Link>

            <div style={{ textAlign:"center", marginTop:16 }}>
              <Link href="/"
                style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12, color:C.gray500, textDecoration:"none", fontWeight:500 }}
                onMouseEnter={e => (e.currentTarget.style.color = C.purple)}
                onMouseLeave={e => (e.currentTarget.style.color = C.gray500)}>
                <ChevronLeft size={13} /> Volver al inicio
              </Link>
            </div>

            <p style={{ textAlign:"center", fontSize:11, color:C.gray400, marginTop:20 }}>
              © {new Date().getFullYear()} Tiendas Waly SAC · RUC 20605467891 · Lima, Perú
            </p>
          </div>
        </div>
      </div>

      {/* ── ESTILOS GLOBALES ─────────────────────────── */}
      <style jsx global>{`
        /* Ocultar panel izquierdo en móvil */
        @media (max-width: 767px) {
          .login-panel-left  { display: none !important; }
        }
        /* Ocultar logo mobile en desktop */
        @media (min-width: 768px) {
          .login-logo-mobile { display: none !important; }
        }
        /* Spinner del botón */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 0.75s linear infinite; }
        /* Borde giratorio logo */
        .logo-spin-login {
          background: conic-gradient(from 0deg, #FFD700, #FFF176, #FF6600, #FFD700, #FFF176, #FFD700);
          border-radius: 13px;
          animation: logo-rotate 2.5s linear infinite;
        }
        @keyframes logo-rotate { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

declare global { interface Window { grecaptcha: any; } }