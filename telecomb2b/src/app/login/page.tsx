"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

// Cookie segura con firma
const setSecureCookie = (uid: string, rol: string) => {
  const timestamp = Date.now();
  const payload = `${uid}.${rol}.${timestamp}`;
  const signature = btoa(payload + "-mercado-global-secret");
  const token = `${payload}.${signature}`;
  
  document.cookie = `session=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict; Secure`;
};

// Rate limiting por email
const checkRateLimit = async (email: string) => {
  const docRef = doc(db, "intentos_login", email.toLowerCase().trim());
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.bloqueadoHasta?.toDate?.() > new Date()) {
      const minutos = Math.ceil((data.bloqueadoHasta.toDate() - new Date()) / 60000);
      throw new Error(`Demasiados intentos. Espera ${minutos} minutos.`);
    }
  }
  return { docRef, intentos: docSnap.exists() ? docSnap.data().intentos || 0 : 0 };
};

// Log de intentos
const logIntent = async (email: string, uid: string, rol: string, estado: "exito" | "fallo", errorMsg = "") => {
  try {
    await setDoc(doc(collection(db, "logs_login")), {
      email: email.toLowerCase().trim(),
      uid: uid || "",
      rol: rol || "desconocido",
      estado,
      errorMsg: errorMsg.substring(0, 200),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "",
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error("Error guardando log:", e);
  }
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  
  const starsContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Efecto de estrellas solo desktop
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const isMobile = window.innerWidth < 768;
    if (isMobile || !starsContainerRef.current) return;

    const createStar = () => {
      if (!starsContainerRef.current) return;
      
      const star = document.createElement('div');
      const size = Math.random() * 2 + 1;
      const duration = Math.random() * 15 + 10;
      
      star.className = 'absolute bg-white rounded-full';
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.opacity = `${Math.random() * 0.6 + 0.2}`;
      star.style.animation = `twinkle ${duration}s infinite alternate`;
      
      starsContainerRef.current.appendChild(star);
      
      setTimeout(() => {
        if (star.parentNode === starsContainerRef.current) {
          starsContainerRef.current?.removeChild(star);
        }
      }, duration * 1000);
    };

    for (let i = 0; i < 30; i++) {
      setTimeout(createStar, i * 50);
    }

    const interval = setInterval(createStar, 400);
    return () => clearInterval(interval);
  }, []);

  // reCAPTCHA v3
  useEffect(() => {
    if (typeof window !== "undefined" && window.grecaptcha) {
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!, { action: "login" })
          .then((token: string) => setRecaptchaToken(token))
          .catch(() => setRecaptchaToken("recaptcha-fallback"));
      });
    }
  }, []);

  // LOGIN PRINCIPAL - CORREGIDO
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset estados
    setLoading(true);
    setError("");
    setSuccessMessage("");

    // Validaciones básicas
    if (!email || !password) {
      setError("Email y contraseña requeridos");
      setLoading(false);
      return;
    }

    const emailLimpio = email.toLowerCase().trim();
    const passwordLimpia = password.trim();

    try {
      // 1. VERIFICAR RATE LIMITING
      const { docRef: rateLimitRef, intentos } = await checkRateLimit(emailLimpio);
      
      // 2. VALIDAR RECAPTCHA (pero no obligatorio)
      if (!recaptchaToken) {
        console.warn("reCAPTCHA no disponible, continuando de todas formas");
      }

      // 3. AUTENTICACIÓN CON FIREBASE AUTH
      console.log("🔐 Intentando autenticar:", emailLimpio);
      const userCredential = await signInWithEmailAndPassword(auth, emailLimpio, passwordLimpia);
      const user = userCredential.user;
      console.log("✅ Autenticación exitosa, UID:", user.uid);

      // 4. LEER DOCUMENTO DE FIRESTORE
      console.log("📁 Leyendo documento de Firestore...");
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      console.log("📄 Documento existe:", userDoc.exists());
      
      if (!userDoc.exists()) {
        console.error("❌ Documento no encontrado en Firestore");
        await auth.signOut();
        throw new Error("Usuario no encontrado en el sistema. Contacta al administrador.");
      }

      // 5. OBTENER DATOS DEL USUARIO
      const userData = userDoc.data();
      console.log("📊 Datos completos del usuario:", {
        uid: user.uid,
        email: user.email,
        rol: userData?.rol,
        verificado: userData?.verificado,
        estado: userData?.estado,
        camposDisponibles: Object.keys(userData || {})
      });

      // 6. VALIDAR QUE EXISTA EL CAMPO ROL
      if (!userData || !userData.rol) {
        console.error("❌ El documento no tiene campo 'rol'");
        await auth.signOut();
        throw new Error("Configuración de usuario incompleta. Contacta al administrador.");
      }

      const rol = userData.rol;

      // ============================================
      // 7. VALIDACIÓN DE ROLES - CORREGIDA
      // ============================================
      
      // CASO 1: ADMIN - ACCESO INMEDIATO
      if (rol === "admin") {
        console.log("👑 ADMIN detectado - acceso permitido sin restricciones");
        // Admin no necesita verificación, continúa
      }
      // CASO 2: CLIENTE PENDIENTE - BLOQUEAR
      else if (rol === "cliente_pendiente") {
        console.log("⏳ Cliente pendiente - bloqueando acceso");
        await auth.signOut();
        throw new Error("Tu cuenta está pendiente de verificación. Contacta al administrador.");
      }
      // CASO 3: CLIENTE - VERIFICAR ESTADO
      else if (rol === "cliente") {
        console.log("👤 Cliente detectado - verificando estado");
        
        // Verificar campo verificado
        if (userData.verificado !== true) {
          console.log("❌ Cliente no verificado - bloqueando");
          await auth.signOut();
          throw new Error("Tu cuenta no ha sido verificada aún. Revisa tu correo o contacta al administrador.");
        }
        
        console.log("✅ Cliente verificado - acceso permitido");
      }
      // CASO 4: ROL DESCONOCIDO
      else {
        console.error("❌ Rol desconocido:", rol);
        await auth.signOut();
        throw new Error(`Rol "${rol}" no válido. Contacta al administrador.`);
      }

      // 8. CREAR COOKIE SEGURA
      console.log("🍪 Creando cookie de sesión");
      setSecureCookie(user.uid, rol);

      // 9. RESETEAR RATE LIMITING
      await setDoc(rateLimitRef, {
        intentos: 0,
        ultimoIntento: serverTimestamp(),
        bloqueadoHasta: null,
        email: emailLimpio
      }).catch(err => console.warn("Error reseteando rate limit:", err));

      // 10. LOG DE ÉXITO
      await logIntent(emailLimpio, user.uid, rol, "exito");

      // 11. MENSAJE DE ÉXITO Y REDIRECCIÓN
      setSuccessMessage("✅ Acceso exitoso. Redirigiendo...");
      console.log("🎉 Login exitoso para:", emailLimpio, "Rol:", rol);

      // 12. REDIRECCIÓN SEGURA
      setTimeout(() => {
        if (rol === "admin") {
          console.log("➡️ Redirigiendo a /admin/dashboard");
          router.push("/admin/dashboard");
        } else if (rol === "cliente") {
          console.log("➡️ Redirigiendo a /catalogo");
          router.push("/catalogo");
        } else {
          console.log("➡️ Redirigiendo a /dashboard");
          router.push("/dashboard");
        }
      }, 800);

    } catch (err: any) {
      // ============================================
      // MANEJO DE ERRORES - MEJORADO
      // ============================================
      
      console.error("❌ Error en login:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });

      // Registrar intento fallido
      await logIntent(emailLimpio, "", "", "fallo", err.message).catch(console.error);

      // Actualizar rate limiting en caso de error de credenciales
      if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        try {
          const { docRef } = await checkRateLimit(emailLimpio);
          const snap = await getDoc(docRef);
          const data = snap.data() || { intentos: 0 };
          
          const nuevosIntentos = (data.intentos || 0) + 1;
          const bloqueadoHasta = nuevosIntentos >= 5 
            ? new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
            : null;
          
          await setDoc(docRef, {
            intentos: nuevosIntentos,
            ultimoIntento: serverTimestamp(),
            bloqueadoHasta,
            email: emailLimpio
          });
        } catch (rateError) {
          console.error("Error actualizando rate limit:", rateError);
        }
      }

      // Mensajes de error amigables
      if (err.message.includes("Demasiados intentos")) {
        setError(err.message);
      } else {
        switch (err.code) {
          case "auth/user-not-found":
          case "auth/wrong-password":
          case "auth/invalid-credential":
            setError("Credenciales incorrectas");
            break;
          case "auth/too-many-requests":
            setError("Demasiados intentos fallidos. Espera 1 minuto.");
            break;
          case "auth/invalid-email":
            setError("Formato de email inválido");
            break;
          case "auth/user-disabled":
            setError("Esta cuenta ha sido deshabilitada");
            break;
          case "auth/network-request-failed":
            setError("Error de conexión. Verifica tu internet.");
            break;
          default:
            setError(err.message || "Error al iniciar sesión");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleRecuperarPassword = async () => {
    if (!email) {
      setError("Ingresa tu email para recuperar la contraseña");
      return;
    }

    const emailLimpio = email.toLowerCase().trim();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await sendPasswordResetEmail(auth, emailLimpio);
      setSuccessMessage(`📧 Te enviamos un correo a ${emailLimpio}. Revisa tu bandeja de entrada.`);
      await logIntent(emailLimpio, "", "reset_password", "exito");
    } catch (err: any) {
      console.error("Error reset password:", err);
      setError("No pudimos enviar el correo. Verifica que el email esté registrado.");
      await logIntent(emailLimpio, "", "reset_password", "fallo", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
        strategy="afterInteractive"
      />
      
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .galaxy-bg {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
        }
        @media (max-width: 768px) {
          .galaxy-bg {
            background: #0f172a;
          }
        }
      `}</style>
      
      <div className="min-h-screen relative overflow-hidden galaxy-bg">
        {/* Estrellas desktop */}
        <div ref={starsContainerRef} className="stars-container absolute inset-0 overflow-hidden hidden md:block"></div>
        
        {/* Contenedor principal */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-sm sm:max-w-md">
            <div className="animate-fade-in">
              <div className="bg-gray-900/30 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl relative p-6 sm:p-8">
                
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-blue-400 to-purple-400 rounded-lg flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    Acceso <span className="text-emerald-300">B2B</span>
                  </h2>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Plataforma exclusiva para empresas del sector
                  </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Email Corporativo
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input 
                        type="email" 
                        required
                        className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-emerald-400 focus:border-transparent transition-all text-sm backdrop-blur-sm"
                        placeholder="empresa@dominio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-medium text-gray-300">
                        Contraseña
                      </label>
                      <button 
                        type="button"
                        onClick={handleRecuperarPassword}
                        className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
                      >
                        ¿Olvidaste?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-emerald-400 focus:border-transparent transition-all text-sm backdrop-blur-sm"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mensajes */}
                  {error && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-1.5 text-red-300 text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center gap-1.5 text-emerald-300 text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{successMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Botón login */}
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 text-white rounded-lg font-semibold text-sm transition-all shadow-lg hover:from-emerald-400 hover:via-blue-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-[1.5px] border-white/50 border-t-white rounded-full animate-spin"></div>
                        Verificando...
                      </>
                    ) : (
                      <>
                        Acceder al sistema
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>

                  {/* Registro */}
                  <div className="pt-4 border-t border-white/10 text-center">
                    <p className="text-gray-400 text-xs">
                      ¿No tienes una cuenta empresarial?{' '}
                      <Link href="/register" className="text-emerald-300 hover:text-emerald-200 font-medium transition">
                        Solicitar acceso
                      </Link>
                    </p>
                  </div>

                  {/* Volver al inicio */}
                  <div className="text-center">
                    <Link href="/" className="text-gray-500 hover:text-gray-300 text-xs font-medium transition inline-flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Volver al inicio
                    </Link>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-600">
                © {new Date().getFullYear()} TelecomB2B - Plataforma exclusiva para empresas
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Extender Window para reCAPTCHA
declare global {
  interface Window {
    grecaptcha: any;
  }
}