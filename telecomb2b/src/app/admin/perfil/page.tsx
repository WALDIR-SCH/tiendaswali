"use client";
// src/app/opciones/perfil/page.tsx
// Requiere: Firebase Auth + Firestore + Storage
// Dependencias: react-hot-toast  →  npm install react-hot-toast

import { useState, useEffect, useRef } from "react";
import {
  auth, db,
  // Si tienes storage configurado en @/lib/firebase, impórtalo así:
  // storage
} from "@/lib/firebase";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
} from "firebase/auth";
import {
  doc, getDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import {
  Camera, Check, Eye, EyeOff, Lock, Mail, Phone,
  Save, Shield, Sparkles, Upload, User, X, Building,
  BadgeCheck, Calendar, Edit3, Key, AlertCircle, Loader2,
} from "lucide-react";

// ─── PALETA ──────────────────────────────────────────────────────────────────
const C = {
  purple:      "#7c3aed",
  purpleLight: "#9851F9",
  purpleFade:  "#f5f0ff",
  orange:      "#FF6600",
  orangeFade:  "#fff3e8",
  yellow:      "#F6FA00",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray300:     "#D1D5DB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray600:     "#4B5563",
  gray700:     "#374151",
  gray900:     "#111827",
  white:       "#FFFFFF",
  red:         "#ef4444",
  redFade:     "#fef2f2",
};

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface UserData {
  nombre?:          string;
  cargo?:           string;
  telefono?:        string;
  email?:           string;
  rol?:             string;
  superadmin?:      boolean;
  estado?:          string;
  fecha_registro?:  any;
  fotoPerfil?:      string;
  nombreComercial?: string;
  razonSocial?:     string;
  ruc?:             string;
  verificado?:      boolean;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const rolLabel: Record<string, string> = {
  admin: "Administrador", seller: "Vendedor", cliente: "Cliente",
};
const rolColor: Record<string, string> = {
  admin: C.purple, seller: C.orange, cliente: C.greenDark,
};

// ─── COMPONENTES INTERNOS ─────────────────────────────────────────────────────

// Campo de formulario
const Field = ({
  label, value, onChange, placeholder, disabled, type = "text", icon: Icon,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; disabled?: boolean; type?: string; icon?: any;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.gray500 }}>
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Icon size={14} style={{ color: disabled ? C.gray300 : C.purple }} />
        </div>
      )}
      <input
        type={type} value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl text-sm font-medium transition-all outline-none"
        style={{
          padding: Icon ? "11px 14px 11px 36px" : "11px 14px",
          border: `1.5px solid ${C.gray200}`,
          background: disabled ? C.gray50 : C.white,
          color: disabled ? C.gray400 : C.gray900,
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = C.purple; }}
        onBlur={e => { e.currentTarget.style.borderColor = C.gray200; }}
      />
    </div>
  </div>
);

// Campo contraseña con toggle
const PasswordField = ({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.gray500 }}>
        {label}
      </label>
      <div className="relative">
        <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.purple }} />
        <input
          type={show ? "text" : "password"}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "••••••••••"}
          className="w-full rounded-xl text-sm font-medium transition-all outline-none"
          style={{ padding: "11px 40px 11px 36px", border: `1.5px solid ${C.gray200}`, background: C.white, color: C.gray900 }}
          onFocus={e => { e.currentTarget.style.borderColor = C.purple; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.gray200; }}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors hover:bg-gray-100">
          {show ? <EyeOff size={14} style={{ color: C.gray400 }} /> : <Eye size={14} style={{ color: C.gray400 }} />}
        </button>
      </div>
    </div>
  );
};

// Indicador fuerza contraseña
const PasswordStrength = ({ password }: { password: string }) => {
  const checks = [
    { label: "8+ caracteres", ok: password.length >= 8 },
    { label: "Mayúscula",     ok: /[A-Z]/.test(password) },
    { label: "Número",        ok: /[0-9]/.test(password) },
    { label: "Símbolo",       ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["", C.red, C.orange, C.yellow, C.greenDark];
  const labels = ["", "Débil", "Regular", "Buena", "Fuerte"];
  if (!password) return null;
  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: i <= score ? colors[score] : C.gray200 }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold" style={{ color: colors[score] }}>{labels[score]}</span>
        <div className="flex gap-2">
          {checks.map(c => (
            <span key={c.label} className="text-[10px] flex items-center gap-0.5 font-medium"
              style={{ color: c.ok ? C.greenDark : C.gray400 }}>
              {c.ok ? <Check size={10} /> : <X size={10} />} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function MiPerfil() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user,        setUser]        = useState<any>(null);
  const [userData,    setUserData]    = useState<UserData>({});
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<"perfil" | "empresa" | "seguridad">("perfil");

  // Campos personales
  const [nombre,    setNombre]    = useState("");
  const [cargo,     setCargo]     = useState("");
  const [telefono,  setTelefono]  = useState("");
  const [saving,    setSaving]    = useState(false);

  // Campos empresa
  const [nombreComercial, setNombreComercial] = useState("");
  const [razonSocial,     setRazonSocial]     = useState("");
  const [ruc,             setRuc]             = useState("");
  const [savingEmpresa,   setSavingEmpresa]   = useState(false);

  // Foto de perfil
  const [fotoPerfil,        setFotoPerfil]        = useState("");
  const [uploadProgress,    setUploadProgress]    = useState(0);
  const [uploadingFoto,     setUploadingFoto]     = useState(false);

  // Contraseña
  const [passActual,    setPassActual]    = useState("");
  const [passNueva,     setPassNueva]     = useState("");
  const [passConfirm,   setPassConfirm]   = useState("");
  const [savingPass,    setSavingPass]    = useState(false);

  // ── Carga inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) return;
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        if (snap.exists()) {
          const d = snap.data() as UserData;
          setUserData(d);
          setNombre(d.nombre || u.displayName || u.email?.split("@")[0] || "");
          setCargo(d.cargo || "");
          setTelefono(d.telefono || "");
          setFotoPerfil(d.fotoPerfil || u.photoURL || "");
          setNombreComercial(d.nombreComercial || "");
          setRazonSocial(d.razonSocial || "");
          setRuc(d.ruc || "");
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Subir foto ──────────────────────────────────────────────────────────────
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validaciones
    if (file.size > 3 * 1024 * 1024) { toast.error("La imagen no puede superar 3 MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return; }

    setUploadingFoto(true);
    setUploadProgress(0);

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `perfiles/${user.uid}/foto_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        err => { toast.error("Error al subir imagen: " + err.message); setUploadingFoto(false); },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          // Actualizar Firestore + Auth profile
          await Promise.all([
            updateDoc(doc(db, "usuarios", user.uid), {
              fotoPerfil: url, fecha_actualizacion: serverTimestamp()
            }),
            updateProfile(user, { photoURL: url }),
          ]);
          setFotoPerfil(url);
          setUploadingFoto(false);
          toast.success("✅ Foto actualizada");
        }
      );
    } catch (err: any) {
      toast.error("Error: " + err.message);
      setUploadingFoto(false);
    }
  };

  // ── Guardar perfil personal ─────────────────────────────────────────────────
  const guardarPerfil = async () => {
    if (!user) return;
    if (!nombre.trim()) { toast.error("El nombre no puede estar vacío"); return; }
    setSaving(true);
    try {
      await Promise.all([
        updateDoc(doc(db, "usuarios", user.uid), {
          nombre: nombre.trim(),
          cargo:  cargo.trim(),
          telefono: telefono.trim(),
          fecha_actualizacion: serverTimestamp(),
        }),
        updateProfile(user, { displayName: nombre.trim() }),
      ]);
      setUserData(p => ({ ...p, nombre: nombre.trim(), cargo: cargo.trim(), telefono: telefono.trim() }));
      toast.success("✅ Perfil guardado correctamente");
    } catch (e: any) { toast.error("Error: " + e.message); }
    finally { setSaving(false); }
  };

  // ── Guardar empresa ─────────────────────────────────────────────────────────
  const guardarEmpresa = async () => {
    if (!user) return;
    setSavingEmpresa(true);
    try {
      await updateDoc(doc(db, "usuarios", user.uid), {
        nombreComercial: nombreComercial.trim(),
        razonSocial:     razonSocial.trim(),
        ruc:             ruc.trim(),
        fecha_actualizacion: serverTimestamp(),
      });
      setUserData(p => ({ ...p, nombreComercial: nombreComercial.trim(), razonSocial: razonSocial.trim(), ruc: ruc.trim() }));
      toast.success("✅ Datos de empresa guardados");
    } catch (e: any) { toast.error("Error: " + e.message); }
    finally { setSavingEmpresa(false); }
  };

  // ── Cambiar contraseña ──────────────────────────────────────────────────────
  const cambiarPassword = async () => {
    if (!user) return;
    if (!passActual || !passNueva || !passConfirm) { toast.error("Completa todos los campos"); return; }
    if (passNueva.length < 8) { toast.error("Mínimo 8 caracteres"); return; }
    if (passNueva !== passConfirm) { toast.error("Las contraseñas no coinciden"); return; }
    setSavingPass(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, passActual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, passNueva);
      setPassActual(""); setPassNueva(""); setPassConfirm("");
      toast.success("✅ Contraseña actualizada");
    } catch (e: any) {
      const msg = e.code === "auth/wrong-password" || e.code === "auth/invalid-credential"
        ? "Contraseña actual incorrecta"
        : e.message;
      toast.error("❌ " + msg);
    }
    finally { setSavingPass(false); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-t-violet-600 animate-spin"
        style={{ borderColor: `${C.purple}25`, borderTopColor: C.purple }} />
      <span className="text-sm font-semibold" style={{ color: C.gray500 }}>Cargando perfil...</span>
    </div>
  );

  const rol = userData.rol || "cliente";

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: "12px", fontWeight: 600, fontSize: "13px", padding: "12px 16px" },
        success: { iconTheme: { primary: C.purple, secondary: C.white } },
      }} />

      <div className="max-w-3xl mx-auto pb-16"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* ── ENCABEZADO ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight mb-1" style={{ color: C.gray900, letterSpacing: "-0.04em" }}>
            Mi Perfil
          </h1>
          <p className="text-sm" style={{ color: C.gray500 }}>
            Gestiona tu información personal, empresa y seguridad
          </p>
        </div>

        {/* ── TARJETA HERO ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border-2 mb-6 overflow-hidden"
          style={{ borderColor: C.gray200, background: C.white, boxShadow: `0 4px 24px ${C.purple}08` }}>

          {/* Banner degradado */}
          <div className="h-28 relative"
            style={{ background: `linear-gradient(135deg, ${C.purple} 0%, #9333ea 50%, ${C.orange} 100%)` }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: `repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)`, backgroundSize: "20px 20px" }} />
          </div>

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-14 mb-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl border-4 overflow-hidden shrink-0"
                  style={{ borderColor: C.white, boxShadow: `0 8px 32px ${C.purple}30`, background: C.gray100 }}>
                  {fotoPerfil ? (
                    <img src={fotoPerfil} alt="Foto de perfil" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.orange})` }}>
                      {getInitials(nombre || user?.email || "")}
                    </div>
                  )}

                  {/* Overlay de carga */}
                  {uploadingFoto && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.6)" }}>
                      <Loader2 size={20} className="text-white animate-spin mb-1" />
                      <span className="text-white text-[10px] font-bold">{uploadProgress}%</span>
                    </div>
                  )}
                </div>

                {/* Botón cambiar foto */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                  style={{ background: C.purple, borderColor: C.white }}
                  title="Cambiar foto">
                  <Camera size={14} className="text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFotoChange}
                />
              </div>

              {/* Badges */}
              <div className="flex gap-2 flex-wrap justify-end pb-1">
                <span className="text-[10px] font-black px-3 py-1 rounded-full border"
                  style={{ background: `${rolColor[rol]}15`, color: rolColor[rol], borderColor: `${rolColor[rol]}30` }}>
                  {rolLabel[rol] || "Usuario"}
                </span>
                {userData.superadmin && (
                  <span className="text-[10px] font-black px-3 py-1 rounded-full border"
                    style={{ background: `${C.yellow}30`, color: "#7a6500", borderColor: `${C.yellow}60` }}>
                    ★ Superadmin
                  </span>
                )}
                {userData.verificado && (
                  <span className="text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 border"
                    style={{ background: `${C.greenDark}12`, color: C.greenDark, borderColor: `${C.greenDark}25` }}>
                    <BadgeCheck size={10} /> Verificado
                  </span>
                )}
              </div>
            </div>

            {/* Nombre y email */}
            <h2 className="text-xl font-black mb-0.5" style={{ color: C.gray900, letterSpacing: "-0.03em" }}>
              {nombre || "—"}
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Mail size={12} style={{ color: C.gray400 }} />
              <span className="text-sm" style={{ color: C.gray500 }}>{user?.email}</span>
              {cargo && (
                <>
                  <span style={{ color: C.gray300 }}>·</span>
                  <span className="text-sm font-medium" style={{ color: C.gray600 }}>{cargo}</span>
                </>
              )}
            </div>

            {/* Tip foto */}
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl border"
              style={{ background: C.purpleFade, borderColor: `${C.purple}20` }}>
              <Upload size={13} style={{ color: C.purple, marginTop: 1, flexShrink: 0 }} />
              <p className="text-[11px] leading-relaxed" style={{ color: C.gray600 }}>
                Haz clic en el ícono de cámara para subir tu foto. Formatos: JPG, PNG, WEBP. Máximo 3 MB.
              </p>
            </div>
          </div>
        </div>

        {/* ── TABS ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl border"
          style={{ background: C.gray50, borderColor: C.gray200 }}>
          {[
            { id: "perfil",    label: "Datos personales", icon: User },
            { id: "empresa",   label: "Empresa",          icon: Building },
            { id: "seguridad", label: "Seguridad",        icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all"
              style={{
                background:  activeTab === id ? C.white : "transparent",
                color:       activeTab === id ? C.purple : C.gray500,
                boxShadow:   activeTab === id ? `0 2px 12px ${C.purple}15` : "none",
                border:      activeTab === id ? `1.5px solid ${C.gray200}` : "1.5px solid transparent",
              }}>
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: DATOS PERSONALES                                             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "perfil" && (
          <div className="rounded-2xl border-2 p-6"
            style={{ borderColor: C.gray200, background: C.white, boxShadow: `0 4px 24px ${C.purple}06` }}>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${C.purple}12` }}>
                <Edit3 size={14} style={{ color: C.purple }} />
              </div>
              <div>
                <h3 className="text-sm font-black" style={{ color: C.gray900 }}>Información Personal</h3>
                <p className="text-[11px]" style={{ color: C.gray400 }}>Actualiza tus datos de contacto</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Field label="Nombre completo" value={nombre} onChange={setNombre}
                placeholder="Tu nombre completo" icon={User} />
              <Field label="Cargo / Posición" value={cargo} onChange={setCargo}
                placeholder="Ej: Asesor Comercial" icon={Sparkles} />
              <Field label="Teléfono (Perú)" value={telefono} onChange={setTelefono}
                placeholder="+51 999 999 999" type="tel" icon={Phone} />
              <Field label="Correo electrónico" value={user?.email || ""} disabled icon={Mail} />
            </div>

            {/* Rol y estado */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "Rol del sistema", value: rolLabel[rol] || "—", color: rolColor[rol] },
                { label: "Estado de cuenta", value: userData.estado === "inactivo" ? "Inactiva" : "Activa",
                  color: userData.estado === "inactivo" ? C.red : C.greenDark },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 border"
                  style={{ background: `${item.color}08`, borderColor: `${item.color}20` }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: C.gray500 }}>
                    {item.label}
                  </p>
                  <p className="text-sm font-black" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Miembro desde */}
            {userData.fecha_registro && (
              <div className="flex items-center gap-2 mb-6 p-3 rounded-xl border"
                style={{ background: C.gray50, borderColor: C.gray200 }}>
                <Calendar size={13} style={{ color: C.gray400 }} />
                <p className="text-xs" style={{ color: C.gray500 }}>
                  Miembro desde:{" "}
                  <strong style={{ color: C.gray700 }}>
                    {userData.fecha_registro?.toDate
                      ? userData.fecha_registro.toDate().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })
                      : "—"}
                  </strong>
                </p>
              </div>
            )}

            <button
              onClick={guardarPerfil} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, boxShadow: `0 4px 18px ${C.purple}40` }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: EMPRESA                                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "empresa" && (
          <div className="rounded-2xl border-2 p-6"
            style={{ borderColor: C.gray200, background: C.white, boxShadow: `0 4px 24px ${C.purple}06` }}>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${C.orange}12` }}>
                <Building size={14} style={{ color: C.orange }} />
              </div>
              <div>
                <h3 className="text-sm font-black" style={{ color: C.gray900 }}>Datos de Empresa</h3>
                <p className="text-[11px]" style={{ color: C.gray400 }}>Información comercial para facturación en Perú</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Field label="Nombre comercial" value={nombreComercial} onChange={setNombreComercial}
                placeholder="Ej: Distribuidora XYZ" icon={Building} />
              <Field label="Razón social" value={razonSocial} onChange={setRazonSocial}
                placeholder="Razón Social S.A.C." icon={BadgeCheck} />
              <div className="sm:col-span-2">
                <Field label="RUC (Perú — 11 dígitos)" value={ruc} onChange={v => { if (/^\d{0,11}$/.test(v)) setRuc(v); }}
                  placeholder="20XXXXXXXXX" icon={AlertCircle} />
                {ruc && ruc.length !== 11 && (
                  <p className="text-[11px] mt-1 font-medium" style={{ color: C.orange }}>
                    El RUC debe tener exactamente 11 dígitos
                  </p>
                )}
              </div>
            </div>

            {/* Info IGV Perú */}
            <div className="flex items-start gap-2 p-3 rounded-xl border mb-6"
              style={{ background: C.orangeFade, borderColor: `${C.orange}25` }}>
              <AlertCircle size={13} style={{ color: C.orange, marginTop: 1, flexShrink: 0 }} />
              <p className="text-[11px] leading-relaxed" style={{ color: C.gray600 }}>
                Los datos de empresa se usan para generar facturas electrónicas con IGV (18%) según la normativa de la{" "}
                <strong>SUNAT (Perú)</strong>. Asegúrate de que el RUC esté activo.
              </p>
            </div>

            <button
              onClick={guardarEmpresa} disabled={savingEmpresa || (ruc.length > 0 && ruc.length !== 11)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${C.orange}, #ff8533)`, boxShadow: `0 4px 18px ${C.orange}40` }}>
              {savingEmpresa ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {savingEmpresa ? "Guardando..." : "Guardar empresa"}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: SEGURIDAD                                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "seguridad" && (
          <div className="space-y-4">

            {/* Cambiar contraseña */}
            <div className="rounded-2xl border-2 p-6"
              style={{ borderColor: C.gray200, background: C.white, boxShadow: `0 4px 24px ${C.purple}06` }}>

              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${C.purple}12` }}>
                  <Lock size={14} style={{ color: C.purple }} />
                </div>
                <div>
                  <h3 className="text-sm font-black" style={{ color: C.gray900 }}>Cambiar Contraseña</h3>
                  <p className="text-[11px]" style={{ color: C.gray400 }}>Usa una contraseña segura de al menos 8 caracteres</p>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <PasswordField label="Contraseña actual" value={passActual} onChange={setPassActual} />
                <div>
                  <PasswordField label="Nueva contraseña" value={passNueva} onChange={setPassNueva} />
                  <PasswordStrength password={passNueva} />
                </div>
                <PasswordField label="Confirmar nueva contraseña" value={passConfirm} onChange={setPassConfirm} />
                {passConfirm && passNueva !== passConfirm && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg border"
                    style={{ background: C.redFade, borderColor: `${C.red}25` }}>
                    <X size={12} style={{ color: C.red }} />
                    <p className="text-[11px] font-bold" style={{ color: C.red }}>Las contraseñas no coinciden</p>
                  </div>
                )}
                {passNueva && passConfirm && passNueva === passConfirm && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg border"
                    style={{ background: `${C.greenDark}08`, borderColor: `${C.greenDark}25` }}>
                    <Check size={12} style={{ color: C.greenDark }} />
                    <p className="text-[11px] font-bold" style={{ color: C.greenDark }}>Las contraseñas coinciden</p>
                  </div>
                )}
              </div>

              <button
                onClick={cambiarPassword}
                disabled={savingPass || !passActual || !passNueva || !passConfirm || passNueva !== passConfirm || passNueva.length < 8}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, boxShadow: `0 4px 18px ${C.purple}40` }}>
                {savingPass ? <Loader2 size={15} className="animate-spin" /> : <Key size={15} />}
                {savingPass ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>

            {/* Info sesión */}
            <div className="rounded-2xl border-2 p-5"
              style={{ borderColor: C.gray200, background: C.gray50 }}>
              <h3 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: C.gray500 }}>
                Información de sesión
              </h3>
              <div className="space-y-2">
                {[
                  { label: "UID de cuenta",        value: user?.uid?.slice(0, 16) + "..." },
                  { label: "Proveedor de acceso",   value: user?.providerData?.[0]?.providerId === "google.com" ? "Google" : "Email / Contraseña" },
                  { label: "Último inicio de sesión", value: user?.metadata?.lastSignInTime
                    ? new Date(user.metadata.lastSignInTime).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—" },
                  { label: "Cuenta creada",          value: user?.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })
                    : "—" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0"
                    style={{ borderColor: C.gray200 }}>
                    <span className="text-xs font-medium" style={{ color: C.gray500 }}>{item.label}</span>
                    <span className="text-xs font-bold" style={{ color: C.gray700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </>
  );
}