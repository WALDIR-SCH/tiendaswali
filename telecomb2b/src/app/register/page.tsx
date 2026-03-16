"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Briefcase, Mail, Phone, Building2, Hash, MapPin,
  Lock, Eye, EyeOff, ChevronLeft, ChevronRight, CheckCircle,
  AlertCircle, Loader2, Smartphone, ArrowRight, Check
} from "lucide-react";

const C = {
  purple:      "#7c3aed",
  purpleLight: "#8b5cf6",
  purpleBg:    "#ede9fe",
  purpleBorder:"#ddd6fe",
  orange:      "#FF6600",
  orangeBg:    "#fff7ed",
  orangeBorder:"#fed7aa",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  greenBg:     "#f0fdf4",
  greenBorder: "#bbf7d0",
  yellow:      "#F6FA00",
  white:       "#FFFFFF",
  gray100:     "#f3f4f6",
  gray200:     "#e5e7eb",
  gray300:     "#d1d5db",
  gray400:     "#9ca3af",
  gray500:     "#6b7280",
  gray600:     "#4b5563",
  gray700:     "#374151",
  gray900:     "#111827",
  red:         "#dc2626",
  redBg:       "#fef2f2",
  redBorder:   "#fecaca",
};

const DOMINIOS_BLOQUEADOS = [
  "gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com","aol.com",
  "protonmail.com","mail.com","live.com","msn.com","ymail.com","rocketmail.com",
  "yandex.com","gmx.com","zoho.com","tutanota.com",
];

const SECTORES = [
  "Telecomunicaciones / ISP","Integrador de Redes / TI","Distribuidor Tecnología",
  "Instalador de Fibra Óptica","Operadora de Telecomunicaciones","Mantenimiento de Redes",
  "Consultoría IT","Empresa Corporativa (Internal IT)","Gobierno / Sector Público",
  "Educación / Universidad","Centro de Datos","Seguridad Electrónica",
  "Minería / Energía","Retail / Comercio","Construcción / Inmobiliaria",
  "Salud / Clínicas","Hotelería / Turismo","Transporte / Logística","Otro",
];

const TAMANIOS = [
  "Microempresa (1-10 trabajadores)","Pequeña Empresa (11-50 trabajadores)",
  "Mediana Empresa (51-250 trabajadores)","Gran Empresa (+250 trabajadores)",
];

const DEPARTAMENTOS = [
  "Amazonas","Áncash","Apurímac","Arequipa","Ayacucho","Cajamarca","Callao",
  "Cusco","Huancavelica","Huánuco","Ica","Junín","La Libertad","Lambayeque",
  "Lima","Loreto","Madre de Dios","Moquegua","Pasco","Piura","Puno",
  "San Martín","Tacna","Tumbes","Ucayali",
];

const validarEmail = (email: string) => {
  const d = email.split("@")[1]?.toLowerCase();
  return d && !DOMINIOS_BLOQUEADOS.includes(d) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
const validarRUC = (ruc: string) => /^\d{11}$/.test(ruc.replace(/\s/g,""));

const inputStyle = (hasIcon = true): React.CSSProperties => ({
  width:"100%", paddingLeft:hasIcon?40:14, paddingRight:14,
  paddingTop:11, paddingBottom:11, borderRadius:11,
  border:`1.5px solid ${C.gray200}`, fontSize:14,
  outline:"none", color:C.gray900, background:C.white, transition:"all .2s",
});
const selectStyle: React.CSSProperties = {
  width:"100%", padding:"11px 14px", borderRadius:11,
  border:`1.5px solid ${C.gray200}`, fontSize:14,
  outline:"none", color:C.gray900, background:C.white, transition:"all .2s",
};
const onFocus = (e: any) => { e.target.style.borderColor=C.purple; e.target.style.boxShadow=`0 0 0 3px ${C.purple}18`; };
const onBlur  = (e: any) => { e.target.style.borderColor=C.gray200; e.target.style.boxShadow="none"; };

const PASOS = ["Representante","Empresa","Negocio","Acceso"];

export default function RegisterPage() {
  const [form, setForm] = useState({
    nombre:"", cargo:"", email:"", telefono:"",
    razonSocial:"", nombreComercial:"", ruc:"",
    direccionFiscal:"", departamento:"", distrito:"", ciudad:"", codigoPostal:"",
    sectorActividad:"", tamanioEmpresa:"",
    password:"", confirmPassword:"",
    aceptaTerminosB2B:false, aceptaPoliticaPrivacidad:false,
  });
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [step,    setStep]    = useState(1);
  const router = useRouter();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: (e.target as HTMLInputElement).type==="checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const validate = (s: number) => {
    setError("");
    if (s===1) {
      if (!form.nombre.trim())   { setError("Nombre del representante obligatorio"); return false; }
      if (!form.cargo.trim())    { setError("Cargo en la empresa obligatorio"); return false; }
      if (!form.email)           { setError("Email corporativo obligatorio"); return false; }
      if (!validarEmail(form.email)) { setError("Solo se aceptan emails corporativos. No Gmail, Hotmail, Outlook, etc."); return false; }
    }
    if (s===2) {
      if (!form.razonSocial.trim())     { setError("Razón Social obligatoria"); return false; }
      if (!form.ruc.trim())             { setError("RUC obligatorio"); return false; }
      if (!validarRUC(form.ruc))        { setError("El RUC debe tener 11 dígitos numéricos"); return false; }
      if (!form.direccionFiscal.trim()) { setError("Dirección fiscal obligatoria"); return false; }
      if (!form.departamento)           { setError("Selecciona un departamento"); return false; }
    }
    if (s===3) {
      if (!form.sectorActividad) { setError("Selecciona el sector de tu empresa"); return false; }
      if (!form.tamanioEmpresa)  { setError("Selecciona el tamaño de tu empresa"); return false; }
    }
    if (s===4) {
      if (!form.password || form.password.length<8) { setError("La contraseña debe tener al menos 8 caracteres"); return false; }
      if (form.password !== form.confirmPassword)   { setError("Las contraseñas no coinciden"); return false; }
      if (!form.aceptaTerminosB2B)        { setError("Acepta los Términos y Condiciones B2B"); return false; }
      if (!form.aceptaPoliticaPrivacidad) { setError("Acepta la Política de Privacidad"); return false; }
    }
    return true;
  };

  const next = () => { if (validate(step)) { setError(""); setStep(s=>s+1); window.scrollTo(0,0); } };
  const prev = () => { setStep(s=>s-1); setError(""); window.scrollTo(0,0); };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (![1,2,3,4].every(s => validate(s))) return;
    setLoading(true); setError("");
    try {
      const uc   = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = uc.user;
      const ruc  = form.ruc.replace(/\s/g,"");

      await setDoc(doc(db, "usuarios", user.uid), {
        nombre:form.nombre, cargo:form.cargo, email:form.email, telefono:form.telefono,
        razonSocial:form.razonSocial, nombreComercial:form.nombreComercial||form.razonSocial,
        ruc, direccionFiscal:form.direccionFiscal,
        departamento:form.departamento, distrito:form.distrito||"",
        ciudad:form.ciudad||form.departamento, codigoPostal:form.codigoPostal||"", pais:"Perú",
        sectorActividad:form.sectorActividad, tamanioEmpresa:form.tamanioEmpresa,
        rol:"cliente_pendiente", estado:"pendiente_verificacion",
        fecha_registro:new Date(), verificado:false,
        acceso_catalogo:false, acceso_precios:false,
        aceptaTerminosB2B:true, aceptaPoliticaPrivacidad:true,
        fecha_aceptacion:new Date(), ultima_actualizacion:new Date(),
      });

      await setDoc(doc(db, "empresas", `emp_${ruc}`), {
        razonSocial:form.razonSocial, nombreComercial:form.nombreComercial||form.razonSocial,
        ruc, direccionFiscal:form.direccionFiscal,
        departamento:form.departamento, distrito:form.distrito||"",
        ciudad:form.ciudad||form.departamento, pais:"Perú",
        representanteLegal:form.nombre, cargoRepresentante:form.cargo,
        emailPrincipal:form.email, telefonoContacto:form.telefono,
        sectorActividad:form.sectorActividad, tamanioEmpresa:form.tamanioEmpresa,
        adminId:user.uid, usuarios:[user.uid],
        estado:"pendiente_verificacion", nivelAcceso:"pendiente", categoriaCliente:"nuevo",
        fecha_registro:new Date(), fecha_verificacion:null, verificadoPor:null,
        terminosAceptados:true, tipoCliente:"empresa", paisOrigen:"Perú", notificacion_enviada:false,
      });

      await auth.signOut();
      setSuccess(`Tu solicitud fue enviada con éxito.\n\nRevisaremos tu cuenta en las próximas 24 horas hábiles y te notificaremos a ${form.email} cuando esté activa.`);
      setTimeout(() => router.push("/login?registro=exitoso"), 7000);
    } catch (err: any) {
      const msgs: Record<string,string> = {
        "auth/email-already-in-use":    "Este email ya está registrado. Intenta iniciar sesión.",
        "auth/invalid-email":           "El formato del email no es válido.",
        "auth/weak-password":           "La contraseña debe tener al menos 8 caracteres.",
        "auth/network-request-failed":  "Error de conexión. Verifica tu internet.",
        "auth/too-many-requests":       "Demasiados intentos. Espera un momento.",
      };
      setError(msgs[err.code] || "Error en el registro: " + (err.message || "Intenta nuevamente"));
    } finally { setLoading(false); }
  };

  /* ── Render de cada paso ── */
  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[
            { k:"nombre",   l:"Nombre completo",      ph:"Juan Pérez García",               Ic:User,      req:true  },
            { k:"cargo",    l:"Cargo en la empresa",   ph:"Gerente de Compras, Jefe de TI…", Ic:Briefcase, req:true  },
            { k:"telefono", l:"Teléfono de contacto",  ph:"987 654 321",                     Ic:Phone,     req:false },
          ].map(({ k, l, ph, Ic, req }) => (
            <div key={k}>
              <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>
                {l}{req && <span style={{ color:C.orange }}> *</span>}
              </label>
              <div style={{ position:"relative" }}>
                <Ic size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
                <input type={k==="telefono"?"tel":"text"} value={(form as any)[k]} onChange={set(k)}
                  placeholder={ph} style={inputStyle()} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>
          ))}
          {/* Email separado por hint */}
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>
              Email corporativo <span style={{ color:C.orange }}>*</span>
            </label>
            <div style={{ position:"relative" }}>
              <Mail size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
              <input type="email" value={form.email} onChange={set("email")}
                placeholder="contacto@tuempresa.pe" style={inputStyle()} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <p style={{ fontSize:11, color:C.orange, margin:"4px 0 0", fontWeight:500 }}>
              ✗ No aceptamos Gmail, Hotmail, Outlook, Yahoo ni similares.
            </p>
          </div>
        </div>
      );

      case 2: return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Razón Social <span style={{ color:C.orange }}>*</span></label>
            <div style={{ position:"relative" }}>
              <Building2 size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
              <input type="text" value={form.razonSocial} onChange={set("razonSocial")}
                placeholder="TELECOM SOLUTIONS PERÚ S.A.C." style={inputStyle()} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Nombre Comercial</label>
            <div style={{ position:"relative" }}>
              <Building2 size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
              <input type="text" value={form.nombreComercial} onChange={set("nombreComercial")}
                placeholder="Telecom Solutions (opcional)" style={inputStyle()} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>RUC <span style={{ color:C.orange }}>*</span></label>
            <div style={{ position:"relative" }}>
              <Hash size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
              <input type="text" value={form.ruc} maxLength={11}
                onChange={e => setForm(f=>({...f, ruc:e.target.value.replace(/\D/g,"")}))}
                placeholder="20XXXXXXXXX" style={{ ...inputStyle(), fontFamily:"monospace" }} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <p style={{ fontSize:11, color:C.gray400, margin:"4px 0 0" }}>11 dígitos numéricos</p>
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Dirección Fiscal <span style={{ color:C.orange }}>*</span></label>
            <div style={{ position:"relative" }}>
              <MapPin size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
              <input type="text" value={form.direccionFiscal} onChange={set("direccionFiscal")}
                placeholder="Av. Principal 123, Oficina 401" style={inputStyle()} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Departamento <span style={{ color:C.orange }}>*</span></label>
              <select value={form.departamento} onChange={set("departamento")} style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">Selecciona</option>
                {DEPARTAMENTOS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Distrito</label>
              <input type="text" value={form.distrito} onChange={set("distrito")}
                placeholder="San Isidro" style={{ ...inputStyle(false) }} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Ciudad</label>
              <input type="text" value={form.ciudad} onChange={set("ciudad")}
                placeholder="Lima" style={{ ...inputStyle(false) }} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Código Postal</label>
              <input type="text" value={form.codigoPostal} onChange={set("codigoPostal")}
                placeholder="15073" style={{ ...inputStyle(false) }} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
        </div>
      );

      case 3: return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Sector de actividad <span style={{ color:C.orange }}>*</span></label>
            <select value={form.sectorActividad} onChange={set("sectorActividad")} style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
              <option value="">Selecciona tu sector</option>
              {SECTORES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Tamaño de la empresa <span style={{ color:C.orange }}>*</span></label>
            <select value={form.tamanioEmpresa} onChange={set("tamanioEmpresa")} style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
              <option value="">Selecciona el tamaño</option>
              {TAMANIOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ padding:"14px 16px", borderRadius:12, background:C.purpleBg, border:`1px solid ${C.purpleBorder}` }}>
            <p style={{ margin:0, fontSize:13, color:C.purple, fontWeight:700 }}>¿Por qué necesitamos esta info?</p>
            <p style={{ margin:"4px 0 0", fontSize:12, color:C.purple, opacity:.8 }}>
              Nos permite asignarte precios y condiciones de compra adecuados para tu tipo de empresa.
            </p>
          </div>
        </div>
      );

      case 4: return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Contraseña <span style={{ color:C.orange }}>*</span></label>
            <div style={{ position:"relative" }}>
              <Lock size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
              <input type={showPwd?"text":"password"} value={form.password} onChange={set("password")}
                placeholder="Mínimo 8 caracteres" style={{ ...inputStyle(), paddingRight:44 }} onFocus={onFocus} onBlur={onBlur} />
              <button type="button" onClick={()=>setShowPwd(!showPwd)}
                style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.gray400, display:"flex", alignItems:"center" }}>
                {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Confirmar contraseña <span style={{ color:C.orange }}>*</span></label>
            <div style={{ position:"relative" }}>
              <Lock size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }} />
              <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")}
                placeholder="Repite tu contraseña" style={inputStyle()} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          {/* Checkboxes */}
          {[
            { k:"aceptaTerminosB2B",        label:"Acepto los", href:"/terminos-b2b",  linkLabel:"Términos y Condiciones B2B" },
            { k:"aceptaPoliticaPrivacidad",  label:"Acepto la",  href:"/privacidad-b2b", linkLabel:"Política de Privacidad"  },
          ].map(({ k, label, href, linkLabel }) => (
            <label key={k} style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer" }}>
              <div style={{ position:"relative", marginTop:2, flexShrink:0 }}>
                <input type="checkbox" checked={(form as any)[k]} onChange={set(k)}
                  style={{ position:"absolute", opacity:0, width:18, height:18, cursor:"pointer", margin:0 }} />
                <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${(form as any)[k]?C.purple:C.gray300}`, background:(form as any)[k]?C.purple:C.white, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
                  {(form as any)[k] && <Check size={11} color={C.white} strokeWidth={3} />}
                </div>
              </div>
              <span style={{ fontSize:13, color:C.gray600 }}>
                {label}{" "}
                <Link href={href} style={{ color:C.purple, fontWeight:700, textDecoration:"none" }}>{linkLabel}</Link>
              </span>
            </label>
          ))}
          <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"12px 14px", borderRadius:10, background:C.orangeBg, border:`1px solid ${C.orangeBorder}` }}>
            <AlertCircle size={14} style={{ color:C.orange, marginTop:1, flexShrink:0 }} />
            <p style={{ fontSize:12, color:C.orange, margin:0, fontWeight:500 }}>
              Tu cuenta será verificada en máximo 24 horas hábiles. Recibirás un correo cuando esté activa.
            </p>
          </div>
        </div>
      );
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.white, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"32px 24px" }}>
      <div style={{ width:"100%", maxWidth:560 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Smartphone size={20} color={C.white} />
          </div>
          <div>
            <p style={{ margin:0, fontSize:17, fontWeight:900, color:C.gray900 }}>TelecomB2B</p>
            <p style={{ margin:0, fontSize:11, color:C.gray500 }}>Registro Empresarial · Solo Perú</p>
          </div>
        </div>

        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:24, fontWeight:900, color:C.gray900, margin:"0 0 4px", letterSpacing:"-0.03em" }}>Solicitar acceso B2B</h1>
          <p style={{ fontSize:14, color:C.gray500, margin:0 }}>Solo empresas con RUC válido. No se aceptan correos personales.</p>
        </div>

        {!success ? (
          <>
            {/* Progress steps */}
            <div style={{ display:"flex", alignItems:"center", marginBottom:24, position:"relative" }}>
              <div style={{ position:"absolute", top:16, left:16, right:16, height:2, background:C.gray200, zIndex:0 }} />
              <div style={{ position:"absolute", top:16, left:16, height:2, zIndex:0, transition:"width .4s ease", background:`linear-gradient(90deg,${C.purple},${C.purpleLight})`, width:`calc(${((step-1)/(PASOS.length-1))*100}% - 0px)` }} />
              {PASOS.map((label, i) => {
                const n = i+1; const active=step===n; const done=step>n;
                return (
                  <div key={n} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:i===0?"flex-start":i===PASOS.length-1?"flex-end":"center", position:"relative", zIndex:1 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:done||active?C.purple:C.white, border:`2px solid ${done||active?C.purple:C.gray300}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .25s", boxShadow:active?`0 0 0 4px ${C.purple}20`:"none" }}>
                      {done ? <Check size={13} color={C.white} strokeWidth={3}/> : <span style={{ fontSize:12, fontWeight:800, color:active?C.white:C.gray400 }}>{n}</span>}
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:active||done?C.purple:C.gray400, marginTop:5, whiteSpace:"nowrap" }}>{label}</span>
                  </div>
                );
              })}
            </div>

            {/* Card */}
            <div style={{ background:C.white, borderRadius:16, border:`1.5px solid ${C.gray200}`, padding:"22px", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
              <h2 style={{ fontSize:16, fontWeight:800, color:C.gray900, margin:"0 0 16px" }}>Paso {step}: {PASOS[step-1]}</h2>
              {renderStep()}
            </div>

            {/* Error */}
            {error && (
              <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"11px 14px", borderRadius:10, background:C.redBg, border:`1px solid ${C.redBorder}`, marginBottom:12 }}>
                <AlertCircle size={14} style={{ color:C.red, marginTop:1, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, color:C.red }}>{error}</span>
                  {error.includes("ya está registrado") && (
                    <div style={{ marginTop:8 }}>
                      <Link href="/login" style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12, fontWeight:700, color:C.purple, textDecoration:"none", padding:"5px 12px", borderRadius:8, background:C.purpleBg, border:`1px solid ${C.purpleBorder}` }}>
                        Iniciar sesión →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <form onSubmit={handleRegister}>
              <div style={{ display:"flex", gap:10 }}>
                {step > 1 && (
                  <button type="button" onClick={prev}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 18px", borderRadius:12, border:`1.5px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:700, color:C.gray700, cursor:"pointer" }}>
                    <ChevronLeft size={14}/> Anterior
                  </button>
                )}
                <div style={{ flex:1 }} />
                {step < 4 ? (
                  <button type="button" onClick={next}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 22px", borderRadius:12, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 14px ${C.purple}35` }}>
                    Siguiente <ChevronRight size={14}/>
                  </button>
                ) : (
                  <button type="submit" disabled={loading}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 22px", borderRadius:12, background:loading?C.gray200:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:loading?C.gray400:C.white, border:"none", fontSize:13, fontWeight:800, cursor:loading?"not-allowed":"pointer", boxShadow:loading?"none":`0 4px 14px ${C.purple}35` }}>
                    {loading ? <><Loader2 size={14} style={{ animation:"spin .75s linear infinite" }}/>Enviando...</> : <><CheckCircle size={14}/>Enviar solicitud B2B</>}
                  </button>
                )}
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"40px 24px" }}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:C.greenBg, border:`3px solid ${C.greenBorder}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
              <CheckCircle size={34} style={{ color:C.greenDark }} />
            </div>
            <h2 style={{ fontSize:22, fontWeight:900, color:C.gray900, margin:"0 0 8px" }}>¡Solicitud enviada!</h2>
            <div style={{ padding:"16px 20px", borderRadius:14, background:C.greenBg, border:`1px solid ${C.greenBorder}`, marginBottom:20, textAlign:"left" }}>
              <p style={{ fontSize:13, color:C.greenDark, margin:0, whiteSpace:"pre-line", lineHeight:1.7 }}>{success}</p>
            </div>
            <Link href="/login" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"12px 24px", borderRadius:12, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, textDecoration:"none", fontSize:14, fontWeight:800, boxShadow:`0 4px 14px ${C.purple}35` }}>
              Ir a iniciar sesión <ArrowRight size={14}/>
            </Link>
          </div>
        )}

        {!success && (
          <div style={{ textAlign:"center", marginTop:18, paddingTop:16, borderTop:`1px solid ${C.gray200}` }}>
            <p style={{ fontSize:13, color:C.gray500, margin:0 }}>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" style={{ color:C.purple, fontWeight:700, textDecoration:"none" }}>Iniciar sesión</Link>
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}