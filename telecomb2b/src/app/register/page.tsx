"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    // Datos del Representante
    nombre: "",
    cargo: "",
    email: "",
    telefono: "",
    
    // Datos de la Empresa (B2B Perú)
    razonSocial: "",
    nombreComercial: "",
    ruc: "", // Cambiado de nifCifRuc a ruc
    direccionFiscal: "",
    ciudad: "",
    codigoPostal: "",
    departamento: "", // AÑADIDO para Perú
    distrito: "", // AÑADIDO para Perú
    
    // Información Adicional B2B
    sectorActividad: "",
    tamanioEmpresa: "",
    
    // Credenciales
    password: "",
    confirmPassword: "",
    
    // Términos B2B
    aceptaTerminosB2B: false,
    aceptaPoliticaPrivacidad: false
  });

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  
  // 📌 LISTA DE DOMINIOS BLOQUEADOS (CORREOS PERSONALES)
  const dominiosBloqueados = [
    "gmail.com",
    "hotmail.com",
    "outlook.com",
    "yahoo.com",
    "icloud.com",
    "aol.com",
    "protonmail.com",
    "mail.com",
    "live.com",
    "msn.com",
    "ymail.com",
    "rocketmail.com",
    "yandex.com",
    "gmx.com",
    "zoho.com",
    "tutanota.com"
  ];

  // 📌 SECTORES PARA PERÚ
  const [sectores] = useState([
    "Telecomunicaciones / ISP",
    "Integrador de Redes / TI",
    "Distribuidor Tecnología",
    "Instalador de Fibra Óptica",
    "Operadora de Telecomunicaciones",
    "Mantenimiento de Redes",
    "Consultoría IT",
    "Empresa Corporativa (Internal IT)",
    "Gobierno / Sector Público",
    "Educación / Universidad",
    "Centro de Datos",
    "Seguridad Electrónica",
    "Minería / Energía",
    "Retail / Comercio",
    "Construcción / Inmobiliaria",
    "Salud / Clínicas",
    "Hotelería / Turismo",
    "Transporte / Logística",
    "Otro"
  ]);

  // 📌 TAMAÑOS DE EMPRESA (SEGÚN SUNAT)
  const [tamaniosEmpresa] = useState([
    "Microempresa (1-10 trabajadores)",
    "Pequeña Empresa (11-50 trabajadores)",
    "Mediana Empresa (51-250 trabajadores)",
    "Gran Empresa (+250 trabajadores)"
  ]);

  // 📌 DEPARTAMENTOS DEL PERÚ
  const [departamentos] = useState([
    "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", 
    "Cajamarca", "Callao", "Cusco", "Huancavelica", "Huánuco", 
    "Ica", "Junín", "La Libertad", "Lambayeque", "Lima", 
    "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", 
    "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali"
  ]);

  const router = useRouter();

  // FIX: Hydration - Solo ejecutar en cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Optimización de estrellas (solo desktop y cliente)
  useEffect(() => {
    if (!isMounted) return;
    
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    const createStar = () => {
      const star = document.createElement('div');
      const size = Math.random() * 3 + 1;
      const duration = Math.random() * 20 + 10;
      
      star.className = 'absolute bg-white rounded-full';
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.opacity = `${Math.random() * 0.7 + 0.3}`;
      star.style.animation = `twinkle ${duration}s infinite alternate`;
      
      document.querySelector('.stars-container')?.appendChild(star);
      
      setTimeout(() => star.remove(), duration * 1000);
    };

    for (let i = 0; i < 40; i++) {
      setTimeout(createStar, i * 50);
    }

    const interval = setInterval(createStar, 400);
    return () => clearInterval(interval);
  }, [isMounted]);

  // Validación de contraseñas
  useEffect(() => {
    if (formData.password && formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setError("Las contraseñas no coinciden");
      } else if (formData.password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres");
      } else {
        setError("");
      }
    }
  }, [formData.password, formData.confirmPassword]);

  // 📌 VALIDACIÓN DE EMAIL CORPORATIVO (SOLO PERÚ)
  const validarEmailCorporativo = (email: string) => {
    const dominio = email.split('@')[1]?.toLowerCase();
    if (!dominio) return false;
    
    // Bloquear correos personales
    if (dominiosBloqueados.includes(dominio)) {
      return false;
    }
    
    // Validar formato básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 📌 VALIDACIÓN DE RUC (PERÚ)
  const validarRUC = (ruc: string) => {
    // RUC peruano: 11 dígitos
    const rucLimpio = ruc.replace(/\s/g, '');
    return /^\d{11}$/.test(rucLimpio);
  };

  const validateStep = (stepNumber: number) => {
    switch(stepNumber) {
      case 1:
        if (!formData.nombre.trim()) {
          setError("El nombre del representante legal es obligatorio");
          return false;
        }
        if (!formData.cargo.trim()) {
          setError("El cargo en la empresa es obligatorio");
          return false;
        }
        if (!formData.email) {
          setError("El email corporativo es obligatorio");
          return false;
        }
        if (!validarEmailCorporativo(formData.email)) {
          setError("❌ Usa tu email corporativo. No se permiten correos personales (Gmail, Hotmail, Outlook, Yahoo, etc.)");
          return false;
        }
        return true;
      
      case 2:
        if (!formData.razonSocial.trim()) {
          setError("La Razón Social es obligatoria");
          return false;
        }
        if (!formData.ruc.trim()) {
          setError("El RUC es obligatorio");
          return false;
        }
        if (!validarRUC(formData.ruc)) {
          setError("El RUC debe tener 11 dígitos numéricos");
          return false;
        }
        if (!formData.direccionFiscal.trim()) {
          setError("La dirección fiscal es obligatoria");
          return false;
        }
        if (!formData.departamento) {
          setError("Selecciona un departamento");
          return false;
        }
        return true;
      
      case 3:
        if (!formData.sectorActividad) {
          setError("Selecciona el sector de tu empresa");
          return false;
        }
        if (!formData.tamanioEmpresa) {
          setError("Selecciona el tamaño de tu empresa");
          return false;
        }
        return true;
      
      case 4:
        if (!formData.password || formData.password.length < 8) {
          setError("La contraseña debe tener al menos 8 caracteres");
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Las contraseñas no coinciden");
          return false;
        }
        if (!formData.aceptaTerminosB2B) {
          setError("Debes aceptar los Términos y Condiciones B2B");
          return false;
        }
        if (!formData.aceptaPoliticaPrivacidad) {
          setError("Debes aceptar la Política de Privacidad");
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setError("");
      setStep(step + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
    setError("");
    window.scrollTo(0, 0);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validación final
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      setLoading(false);
      return;
    }

    // Validar email corporativo otra vez
    if (!validarEmailCorporativo(formData.email)) {
      setError("❌ Usa tu email corporativo. No se permiten correos personales.");
      setLoading(false);
      return;
    }

    // Validar RUC otra vez
    if (!validarRUC(formData.ruc)) {
      setError("El RUC debe tener 11 dígitos numéricos");
      setLoading(false);
      return;
    }

    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // Guardar en colección 'usuarios' con estado PENDIENTE
      await setDoc(doc(db, "usuarios", user.uid), {
        // Datos del representante
        nombre: formData.nombre,
        cargo: formData.cargo,
        email: formData.email,
        telefono: formData.telefono,
        
        // Datos de la empresa (Perú)
        razonSocial: formData.razonSocial,
        nombreComercial: formData.nombreComercial || formData.razonSocial,
        ruc: formData.ruc.replace(/\s/g, ''),
        direccionFiscal: formData.direccionFiscal,
        departamento: formData.departamento,
        distrito: formData.distrito || "",
        ciudad: formData.ciudad || formData.departamento,
        codigoPostal: formData.codigoPostal || "",
        pais: "Perú",
        
        // Información adicional
        sectorActividad: formData.sectorActividad,
        tamanioEmpresa: formData.tamanioEmpresa,
        
        // Estado B2B
        rol: "cliente_pendiente",
        estado: "pendiente_verificacion",
        fecha_registro: new Date(),
        verificado: false,
        acceso_catalogo: false,
        acceso_precios: false,
        
        // Términos
        aceptaTerminosB2B: formData.aceptaTerminosB2B,
        aceptaPoliticaPrivacidad: formData.aceptaPoliticaPrivacidad,
        fecha_aceptacion: new Date(),
        
        ultima_actualizacion: new Date(),
      });

      // Registrar empresa en colección 'empresas'
      const empresaId = `emp_${formData.ruc.replace(/\s/g, '')}`;

      await setDoc(doc(db, "empresas", empresaId), {
        razonSocial: formData.razonSocial,
        nombreComercial: formData.nombreComercial || formData.razonSocial,
        ruc: formData.ruc.replace(/\s/g, ''),
        
        direccionFiscal: formData.direccionFiscal,
        departamento: formData.departamento,
        distrito: formData.distrito || "",
        ciudad: formData.ciudad || formData.departamento,
        pais: "Perú",
        
        representanteLegal: formData.nombre,
        cargoRepresentante: formData.cargo,
        emailPrincipal: formData.email,
        telefonoContacto: formData.telefono,
        
        sectorActividad: formData.sectorActividad,
        tamanioEmpresa: formData.tamanioEmpresa,
        
        adminId: user.uid,
        usuarios: [user.uid],
        
        estado: "pendiente_verificacion",
        nivelAcceso: "pendiente",
        categoriaCliente: "nuevo",
        
        fecha_registro: new Date(),
        fecha_verificacion: null,
        verificadoPor: null,
        
        terminosAceptados: true,
        tipoCliente: "empresa",
        paisOrigen: "Perú",
        
        notificacion_enviada: false
      });

      // Cerrar sesión automáticamente
      await auth.signOut();

      // Mensaje de éxito
      setSuccessMessage(`
        ✅ ¡Solicitud de registro empresarial enviada con éxito!
        
        Tu solicitud está siendo revisada:
        1. Validación de RUC
        2. Verificación de datos de empresa
        3. Activación de cuenta B2B
        
        Te enviaremos un correo a ${formData.email} cuando tu cuenta esté verificada.
        Tiempo estimado: 24 horas hábiles.
      `);

      // Limpiar formulario
      setFormData({
        nombre: "",
        cargo: "",
        email: "",
        telefono: "",
        razonSocial: "",
        nombreComercial: "",
        ruc: "",
        direccionFiscal: "",
        ciudad: "",
        codigoPostal: "",
        departamento: "",
        distrito: "",
        sectorActividad: "",
        tamanioEmpresa: "",
        password: "",
        confirmPassword: "",
        aceptaTerminosB2B: false,
        aceptaPoliticaPrivacidad: false
      });

      // Redirigir al login
      setTimeout(() => {
        router.push("/login?registro=exitoso&tipo=b2b");
      }, 8000);

    } catch (err: any) {
      console.error("Error en registro:", err);
      
      // ============================================
      // FIX: Firebase Error - Manejo específico y mensajes amigables
      // ============================================
      if (err.code === "auth/email-already-in-use") {
        setError(
          "⚠️ Este email corporativo ya está registrado.\n\n" +
          "¿Ya solicitaste acceso? Tu cuenta podría estar pendiente de verificación.\n\n" +
          "• Si ya tienes cuenta: Inicia sesión\n" +
          "• Si no recibiste correo: Revisa spam o contacta a soporte\n" +
          "• ¿Otro email? Usa el email corporativo de tu empresa"
        );
      } else {
        switch (err.code) {
          case "auth/invalid-email":
            setError("❌ El formato del email corporativo no es válido");
            break;
          case "auth/weak-password":
            setError("🔐 La contraseña debe tener al menos 8 caracteres");
            break;
          case "auth/network-request-failed":
            setError("🌐 Error de conexión. Verifica tu internet e intenta nuevamente");
            break;
          case "auth/too-many-requests":
            setError("⏳ Demasiados intentos. Espera 1 minuto y vuelve a intentar");
            break;
          default:
            setError("❌ Error en el registro: " + (err.message || "Intenta nuevamente"));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // FIX: Hydration - No renderizar hasta montar
  if (!isMounted) {
    return null;
  }

  // Renderizado de pasos
  const renderStepContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">
              Paso 1: Representante Legal
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Datos de la persona autorizada para gestionar la cuenta empresarial
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Nombre Completo *
                </label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="Ej: Juan Pérez García"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Cargo en la Empresa *
                </label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="Ej: Gerente de Compras, Jefe de TI, etc."
                  value={formData.cargo}
                  onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Email Corporativo *
                </label>
                <input 
                  type="email" 
                  required
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="Ej: contacto@tuempresa.pe"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <p className="text-xs text-amber-300 mt-1">
                  ❌ No aceptamos @gmail, @hotmail, @outlook, @yahoo. Solo email corporativo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Teléfono de Contacto
                </label>
                <input 
                  type="tel"
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="Ej: 987 654 321"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">
              Paso 2: Datos de la Empresa
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Información legal y fiscal de tu empresa en Perú
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Razón Social *
                </label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Ej: TELECOM SOLUTIONS PERÚ S.A.C."
                  value={formData.razonSocial}
                  onChange={(e) => setFormData({...formData, razonSocial: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Nombre Comercial (Opcional)
                </label>
                <input 
                  type="text"
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Ej: Telecom Solutions"
                  value={formData.nombreComercial}
                  onChange={(e) => setFormData({...formData, nombreComercial: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  RUC *
                </label>
                <input 
                  type="text"
                  required
                  maxLength={11}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                  placeholder="20XXXXXXXXX"
                  value={formData.ruc}
                  onChange={(e) => setFormData({...formData, ruc: e.target.value.replace(/\D/g, '')})}
                />
                <p className="text-xs text-gray-400 mt-1">
                  11 dígitos numéricos
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Dirección Fiscal *
                </label>
                <input 
                  type="text"
                  required
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Ej: Av. Principal 123, Oficina 401"
                  value={formData.direccionFiscal}
                  onChange={(e) => setFormData({...formData, direccionFiscal: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Departamento *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:ring-1 focus:ring-blue-400"
                    value={formData.departamento}
                    onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                  >
                    <option value="">Selecciona</option>
                    {departamentos.map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Distrito
                  </label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Ej: San Isidro"
                    value={formData.distrito}
                    onChange={(e) => setFormData({...formData, distrito: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Ciudad
                  </label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Ej: Lima"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({...formData, ciudad: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Código Postal
                  </label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Ej: 15073"
                    value={formData.codigoPostal}
                    onChange={(e) => setFormData({...formData, codigoPostal: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">
              Paso 3: Información del Negocio
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Ayúdanos a conocerte mejor
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Sector de Actividad *
                </label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:ring-1 focus:ring-purple-400"
                  value={formData.sectorActividad}
                  onChange={(e) => setFormData({...formData, sectorActividad: e.target.value})}
                >
                  <option value="">Selecciona tu sector</option>
                  {sectores.map((sector) => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Tamaño de la Empresa *
                </label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:ring-1 focus:ring-purple-400"
                  value={formData.tamanioEmpresa}
                  onChange={(e) => setFormData({...formData, tamanioEmpresa: e.target.value})}
                >
                  <option value="">Selecciona el tamaño</option>
                  {tamaniosEmpresa.map((tamanio) => (
                    <option key={tamanio} value={tamanio}>{tamanio}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">
              Paso 4: Credenciales y Términos
            </h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:ring-1 focus:ring-emerald-400"
                      placeholder="Mínimo 8 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <input 
                    type="password"
                    required
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="Repite tu contraseña"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terminosB2B"
                    checked={formData.aceptaTerminosB2B}
                    onChange={(e) => setFormData({...formData, aceptaTerminosB2B: e.target.checked})}
                    className="w-3.5 h-3.5 mt-0.5 accent-emerald-500"
                  />
                  <label htmlFor="terminosB2B" className="text-xs text-gray-300">
                    Acepto los{' '}
                    <Link href="/terminos-b2b" className="text-emerald-300 hover:underline">
                      Términos y Condiciones B2B
                    </Link>
                  </label>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="privacidad"
                    checked={formData.aceptaPoliticaPrivacidad}
                    onChange={(e) => setFormData({...formData, aceptaPoliticaPrivacidad: e.target.checked})}
                    className="w-3.5 h-3.5 mt-0.5 accent-emerald-500"
                  />
                  <label htmlFor="privacidad" className="text-xs text-gray-300">
                    Acepto la{' '}
                    <Link href="/privacidad-b2b" className="text-emerald-300 hover:underline">
                      Política de Privacidad
                    </Link>
                  </label>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-300 font-medium">
                  ⏳ Tu cuenta será verificada en un máximo de 24 horas hábiles.
                  Recibirás un correo cuando esté activa.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
        .galaxy-bg { background: linear-gradient(135deg, #0f172a, #1e293b); }
        @media (max-width: 768px) { .stars-container { display: none; } }
      `}</style>
      
      <div className="min-h-screen relative galaxy-bg">
        <div className="stars-container absolute inset-0 overflow-hidden"></div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-3">
          <div className="w-full max-w-2xl">
            <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-xl p-6">
              
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg mb-3">
                  <span className="text-white font-bold text-lg">B2B</span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Registro <span className="text-emerald-300">Empresarial</span>
                </h2>
                <p className="text-gray-300 text-sm mt-1">
                  Solo empresas con RUC · Perú
                </p>
              </div>

              {/* Progress Steps */}
              {!successMessage && (
                <div className="mb-6">
                  <div className="flex justify-between">
                    {[1,2,3,4].map((num) => (
                      <div key={num} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                          ${step === num ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white' : 
                            step > num ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-gray-400'}`}>
                          {step > num ? '✓' : num}
                        </div>
                        <span className="text-xs mt-1 text-gray-400">
                          {num === 1 && 'Representante'}
                          {num === 2 && 'Empresa'}
                          {num === 3 && 'Negocio'}
                          {num === 4 && 'Acceso'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensaje de advertencia */}
              {!successMessage && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-300 font-medium flex items-center gap-1">
                    ⚠️ Solo empresas peruanas con RUC. No aceptamos Gmail, Hotmail ni Outlook.
                  </p>
                </div>
              )}

              {/* Formulario */}
              {!successMessage ? (
                <form onSubmit={handleRegister}>
                  {renderStepContent()}

                  {/* ============================================
                      FIX: Firebase Error - Mensaje mejorado
                  ============================================ */}
                  {error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-red-300 text-lg">⚠️</span>
                        <div className="flex-1">
                          <p className="text-sm text-red-300 whitespace-pre-line font-medium">
                            {error}
                          </p>
                          {error.includes("ya está registrado") && (
                            <div className="mt-3 flex gap-2">
                              <Link 
                                href="/login" 
                                className="inline-block px-3 py-1.5 bg-emerald-500/30 text-emerald-300 rounded-md text-xs font-medium hover:bg-emerald-500/50 transition"
                              >
                                🔑 Iniciar sesión
                              </Link>
                              <button
                                type="button"
                                onClick={() => setError("")}
                                className="px-3 py-1.5 bg-white/10 text-gray-300 rounded-md text-xs hover:bg-white/20 transition"
                              >
                                ✕ Cerrar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-between">
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
                      >
                        ← Anterior
                      </button>
                    )}
                    <div className="flex-1"></div>
                    {step < 4 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-semibold hover:from-blue-400 hover:to-purple-400"
                      >
                        Siguiente →
                      </button>
                    ) : (
                      <button 
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg text-sm font-semibold hover:from-emerald-400 hover:to-blue-400 disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading ? (
                          <>⏳ Enviando...</>
                        ) : (
                          <>✅ Enviar Solicitud B2B</>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                // Mensaje de éxito
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl">✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    ¡Solicitud Enviada!
                  </h3>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-left mb-4">
                    <p className="text-sm text-emerald-300 whitespace-pre-line">
                      {successMessage}
                    </p>
                  </div>
                  <Link 
                    href="/login" 
                    className="inline-block px-6 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg text-sm font-semibold hover:from-emerald-400 hover:to-blue-400"
                  >
                    Ir a Iniciar Sesión
                  </Link>
                </div>
              )}

              {/* Link a login */}
              {!successMessage && (
                <div className="mt-4 pt-4 border-t border-white/10 text-center">
                  <p className="text-xs text-gray-400">
                    ¿Ya tienes cuenta?{' '}
                    <Link href="/login" className="text-emerald-300 hover:underline">
                      Inicia sesión
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}