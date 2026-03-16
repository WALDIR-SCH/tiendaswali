"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle,
  CheckCircle, Loader2, ChevronLeft, Building2, Smartphone
} from "lucide-react";

const C = {
  purple:      "#7c3aed",
  purpleLight: "#8b5cf6",
  purpleBg:    "#ede9fe",
  purpleBorder:"#ddd6fe",
  orange:      "#FF6600",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  yellow:      "#F6FA00",
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

const setSecureCookie = (uid: string, rol: string) => {
  const ts = Date.now();
  const payload = `${uid}.${rol}.${ts}`;
  const sig = btoa(payload + "-telecom-b2b-secret");
  document.cookie = `session=${payload}.${sig}; path=/; max-age=${60*60*24}; SameSite=Strict`;
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

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.grecaptcha) {
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!, { action: "login" })
          .then((t: string) => setRecaptchaToken(t))
          .catch(() => setRecaptchaToken("fallback"));
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    if (!email || !password) { setError("Email y contraseña requeridos"); setLoading(false); return; }

    const emailLimpio    = email.toLowerCase().trim();
    const passwordLimpia = password.trim();

    try {
      const { docRef: rateLimitRef } = await checkRateLimit(emailLimpio);
      const userCredential = await signInWithEmailAndPassword(auth, emailLimpio, passwordLimpia);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (!userDoc.exists()) {
        await auth.signOut();
        throw new Error("Usuario no encontrado en el sistema. Contacta al administrador.");
      }

      const userData = userDoc.data();
      if (!userData?.rol) {
        await auth.signOut();
        throw new Error("Configuración de usuario incompleta. Contacta al administrador.");
      }

      const rol = userData.rol;

      if (rol === "admin") {
        // sin restricción adicional
      } else if (rol === "cliente_pendiente") {
        await auth.signOut();
        throw new Error("Tu cuenta está pendiente de verificación. Contacta al administrador.");
      } else if (rol === "cliente") {
        if (userData.verificado !== true) {
          await auth.signOut();
          throw new Error("Tu cuenta no ha sido verificada. Revisa tu correo o contacta al administrador.");
        }
      } else {
        await auth.signOut();
        throw new Error(`Rol "${rol}" no válido. Contacta al administrador.`);
      }

      setSecureCookie(user.uid, rol);
      await setDoc(rateLimitRef, { intentos:0, ultimoIntento:serverTimestamp(), bloqueadoHasta:null, email:emailLimpio }).catch(() => {});
      await logIntent(emailLimpio, user.uid, rol, "exito");

      setSuccess("✓ Acceso exitoso. Redirigiendo...");
      setTimeout(() => router.push(rol === "admin" ? "/admin" : "/catalogo"), 700);

    } catch (err: any) {
      await logIntent(emailLimpio, "", "", "fallo", err.message).catch(() => {});

      if (["auth/wrong-password","auth/user-not-found","auth/invalid-credential"].includes(err.code)) {
        try {
          const { docRef } = await checkRateLimit(emailLimpio);
          const snap = await getDoc(docRef);
          const data = snap.data() || { intentos: 0 };
          const nuevos = (data.intentos || 0) + 1;
          await setDoc(docRef, {
            intentos: nuevos, ultimoIntento: serverTimestamp(),
            bloqueadoHasta: nuevos >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
            email: emailLimpio,
          });
        } catch {}
      }

      if (err.message?.includes("Demasiados intentos")) {
        setError(err.message);
      } else {
        const msgs: Record<string, string> = {
          "auth/user-not-found":         "Credenciales incorrectas",
          "auth/wrong-password":         "Credenciales incorrectas",
          "auth/invalid-credential":     "Credenciales incorrectas",
          "auth/too-many-requests":      "Demasiados intentos. Espera un momento.",
          "auth/invalid-email":          "Formato de email inválido",
          "auth/user-disabled":          "Esta cuenta ha sido deshabilitada",
          "auth/network-request-failed": "Error de conexión. Verifica tu internet.",
        };
        setError(msgs[err.code] || err.message || "Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarPassword = async () => {
    if (!email) { setError("Ingresa tu email para recuperar la contraseña"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      setSuccess(`Correo enviado a ${email}. Revisa tu bandeja.`);
    } catch {
      setError("No pudimos enviar el correo. Verifica que el email esté registrado.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Script src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`} strategy="afterInteractive" />

      <div style={{ minHeight:"100vh", background:C.white, display:"flex" }}>

        {/* ── Panel izquierdo — solo desktop ── */}
        <div className="login-panel-left" style={{
          width:"45%", flexShrink:0,
          background:`linear-gradient(140deg, ${C.purple} 0%, #4c1d95 55%, #1e1b4b 100%)`,
          padding:"48px 44px", display:"flex", flexDirection:"column",
          justifyContent:"space-between", position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", top:-80, right:-80, width:260, height:260, borderRadius:"50%", background:`${C.purpleLight}25`, filter:"blur(70px)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-60, left:-60, width:200, height:200, borderRadius:"50%", background:`${C.orange}18`, filter:"blur(60px)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", top:"45%", left:"55%", width:140, height:140, borderRadius:"50%", background:`${C.green}12`, filter:"blur(50px)", pointerEvents:"none" }} />

          {/* Logo */}
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:46, height:46, borderRadius:13, background:`linear-gradient(135deg,${C.orange},${C.yellow})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Smartphone size={22} color="#000" />
              </div>
              <div>
                <p style={{ margin:0, fontSize:19, fontWeight:900, color:C.white, letterSpacing:"-0.03em" }}>LOGIN</p>
                <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.6)" }}>Plataforma Mayorista · Perú</p>
              </div>
            </div>
          </div>

          {/* Texto central */}
          <div style={{ position:"relative", zIndex:1 }}>
            <h2 style={{ fontSize:34, fontWeight:900, color:C.white, margin:"0 0 14px", lineHeight:1.2, letterSpacing:"-0.03em" }}>
              La plataforma B2B<br />
              <span style={{ color:C.yellow }}>más confiable</span><br />
              del mercado
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,0.7)", margin:"0 0 28px", lineHeight:1.6 }}>
              Precios exclusivos, gestión de pedidos y trazabilidad IMEI en un solo lugar.
            </p>
            {[
              { icon:"📱", text:"Catálogo mayorista en tiempo real" },
              { icon:"📦", text:"Pedidos, cotizaciones y despacho" },
              { icon:"🔍", text:"Trazabilidad IMEI completa" },
              { icon:"🧾", text:"Facturación electrónica SUNAT" },
            ].map(f => (
              <div key={f.text} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:11 }}>
                <span style={{ fontSize:15 }}>{f.icon}</span>
                <span style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:500 }}>{f.text}</span>
              </div>
            ))}
          </div>

          <p style={{ position:"relative", zIndex:1, fontSize:11, color:"rgba(255,255,255,0.4)", margin:0 }}>
            © {new Date().getFullYear()} TelecomB2B · Solo para empresas con RUC
          </p>
        </div>

        {/* ── Panel derecho: formulario ── */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", overflowY:"auto" }}>
          <div style={{ width:"100%", maxWidth:420 }}>

            {/* Logo mobile */}
            <div className="login-logo-mobile" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Smartphone size={18} color={C.white} />
              </div>
              <div>
                <p style={{ margin:0, fontSize:16, fontWeight:900, color:C.gray900 }}>TelecomB2B</p>
                <p style={{ margin:0, fontSize:11, color:C.gray500 }}>Plataforma Mayorista</p>
              </div>
            </div>

            {/* Heading */}
            <div style={{ marginBottom:28 }}>
              <h1 style={{ fontSize:26, fontWeight:900, color:C.gray900, margin:"0 0 6px", letterSpacing:"-0.03em" }}>
                Bienvenido de vuelta
              </h1>
              <p style={{ fontSize:14, color:C.gray500, margin:0 }}>Accede con tu cuenta empresarial</p>
            </div>

            <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Email */}
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Email corporativo</label>
                <div style={{ position:"relative" }}>
                  <Mail size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="empresa@dominio.com"
                    style={{ width:"100%", paddingLeft:40, paddingRight:14, paddingTop:11, paddingBottom:11, borderRadius:11, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white, transition:"all .2s" }}
                    onFocus={e => { e.target.style.borderColor=C.purple; e.target.style.boxShadow=`0 0 0 3px ${C.purple}18`; }}
                    onBlur={e => { e.target.style.borderColor=C.gray200; e.target.style.boxShadow="none"; }}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <label style={{ fontSize:13, fontWeight:700, color:C.gray700 }}>Contraseña</label>
                  <button type="button" onClick={handleRecuperarPassword}
                    style={{ fontSize:12, fontWeight:600, color:C.purple, background:"none", border:"none", cursor:"pointer", padding:0 }}>
                    ¿Olvidaste?
                  </button>
                </div>
                <div style={{ position:"relative" }}>
                  <Lock size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
                  <input type={showPwd ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width:"100%", paddingLeft:40, paddingRight:44, paddingTop:11, paddingBottom:11, borderRadius:11, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white, transition:"all .2s" }}
                    onFocus={e => { e.target.style.borderColor=C.purple; e.target.style.boxShadow=`0 0 0 3px ${C.purple}18`; }}
                    onBlur={e => { e.target.style.borderColor=C.gray200; e.target.style.boxShadow="none"; }}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.gray400, display:"flex", alignItems:"center" }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"11px 13px", borderRadius:10, background:C.redBg, border:`1px solid ${C.redBorder}` }}>
                  <AlertCircle size={14} style={{ color:C.red, marginTop:1, flexShrink:0 }} />
                  <span style={{ fontSize:13, color:C.red }}>{error}</span>
                </div>
              )}

              {/* Success */}
              {success && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 13px", borderRadius:10, background:`${C.greenDark}10`, border:`1px solid ${C.greenDark}30` }}>
                  <CheckCircle size={14} style={{ color:C.greenDark, flexShrink:0 }} />
                  <span style={{ fontSize:13, color:C.greenDark, fontWeight:600 }}>{success}</span>
                </div>
              )}

              {/* Botón */}
              <button type="submit" disabled={loading}
                style={{ width:"100%", padding:"13px", borderRadius:12, background:loading?C.gray200:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:loading?C.gray400:C.white, border:"none", fontSize:14, fontWeight:800, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:loading?"none":`0 4px 20px ${C.purple}40`, transition:"all .2s", marginTop:4 }}>
                {loading
                  ? <><Loader2 size={15} style={{ animation:"spin .75s linear infinite" }} />Verificando...</>
                  : <>Acceder al sistema <ArrowRight size={15} /></>}
              </button>
            </form>

            {/* Separador */}
            <div style={{ display:"flex", alignItems:"center", gap:12, margin:"22px 0" }}>
              <div style={{ flex:1, height:1, background:C.gray200 }} />
              <span style={{ fontSize:12, color:C.gray400, whiteSpace:"nowrap" }}>¿No tienes cuenta?</span>
              <div style={{ flex:1, height:1, background:C.gray200 }} />
            </div>

            {/* Registro */}
            <Link href="/register"
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"12px", borderRadius:12, border:`1.5px solid ${C.gray200}`, background:C.white, fontSize:14, fontWeight:700, color:C.gray700, textDecoration:"none", transition:"all .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=C.purple; (e.currentTarget as HTMLElement).style.color=C.purple; (e.currentTarget as HTMLElement).style.background=C.purpleBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor=C.gray200; (e.currentTarget as HTMLElement).style.color=C.gray700; (e.currentTarget as HTMLElement).style.background=C.white; }}>
              <Building2 size={15} /> Solicitar acceso empresarial
            </Link>

            <div style={{ textAlign:"center", marginTop:18 }}>
              <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12, color:C.gray500, textDecoration:"none", fontWeight:500 }}
                onMouseEnter={e => (e.currentTarget.style.color=C.purple)}
                onMouseLeave={e => (e.currentTarget.style.color=C.gray500)}>
                <ChevronLeft size={13} /> Volver al inicio
              </Link>
            </div>

            <p style={{ textAlign:"center", fontSize:11, color:C.gray400, marginTop:22 }}>
              © {new Date().getFullYear()} TelecomB2B · Solo para empresas con RUC
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 767px) {
          .login-panel-left { display: none !important; }
        }
        @media (min-width: 768px) {
          .login-logo-mobile { display: none !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

declare global { interface Window { grecaptcha: any; } }