"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";

const C = {
  purple:"#9851F9", purpleDark:"#7C35E0", purpleLight:"#f5f0ff",
  orange:"#FF6600", yellow:"#F6FA00", green:"#28FB4B",
  white:"#FFFFFF",
  gray50:"#F9FAFB", gray100:"#F3F4F6", gray200:"#E5E7EB",
  gray300:"#D1D5DB", gray400:"#9CA3AF", gray500:"#6B7280",
  gray600:"#4B5563", gray700:"#374151", gray900:"#111827",
};

interface UserData {
  nombre?: string; cargo?: string; telefono?: string;
  email?: string; rol?: string; superadmin?: boolean;
  estado?: string; fecha_registro?: any;
}

export default function MiPerfil() {
  const [user,        setUser]        = useState<any>(null);
  const [userData,    setUserData]    = useState<UserData>({});
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  // Formulario datos básicos
  const [nombre,    setNombre]    = useState("");
  const [cargo,     setCargo]     = useState("");
  const [telefono,  setTelefono]  = useState("");

  // Cambio de contraseña
  const [passActual,    setPassActual]    = useState("");
  const [passNueva,     setPassNueva]     = useState("");
  const [passConfirm,   setPassConfirm]   = useState("");
  const [savingPass,    setSavingPass]    = useState(false);
  const [showPassForm,  setShowPassForm]  = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        if (snap.exists()) {
          const data = snap.data() as UserData;
          setUserData(data);
          setNombre(data.nombre || u.email?.split("@")[0] || "");
          setCargo(data.cargo || "");
          setTelefono(data.telefono || "");
        }
      } catch {}
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const guardarPerfil = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "usuarios", user.uid), {
        nombre, cargo, telefono,
        fecha_actualizacion: serverTimestamp(),
      });
      setUserData(prev => ({ ...prev, nombre, cargo, telefono }));
      toast.success("✅ Perfil actualizado");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const cambiarPassword = async () => {
    if (!user || !passActual || !passNueva || !passConfirm) {
      toast.error("Completa todos los campos"); return;
    }
    if (passNueva.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    if (passNueva !== passConfirm) { toast.error("Las contraseñas no coinciden"); return; }
    setSavingPass(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, passActual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, passNueva);
      setPassActual(""); setPassNueva(""); setPassConfirm("");
      setShowPassForm(false);
      toast.success("✅ Contraseña actualizada correctamente");
    } catch (e: any) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")
        toast.error("❌ La contraseña actual es incorrecta");
      else toast.error("❌ Error al cambiar contraseña: " + e.message);
    }
    finally { setSavingPass(false); }
  };

  const rolLabel: Record<string, string> = {
    admin:"Administrador", seller:"Vendedor", cliente:"Cliente",
  };
  const rolColor: Record<string, string> = {
    admin: C.purple, seller: C.orange, cliente: C.green,
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, gap:12, color:C.gray500 }}>
      <div style={{ width:28, height:28, border:`2.5px solid ${C.purple}28`, borderTopColor:C.purple, borderRadius:"50%", animation:"spin .75s linear infinite" }}/>
      Cargando perfil...
    </div>
  );

  const card: React.CSSProperties = {
    background:"rgba(255,255,255,0.92)", backdropFilter:"blur(16px)",
    borderRadius:18, border:`1px solid ${C.purple}14`,
    boxShadow:`0 4px 24px ${C.purple}08`, padding:28,
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style:{ borderRadius:"12px", fontWeight:600, fontSize:"13px" } }}/>

      <div style={{ maxWidth:800, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:26, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>
            Mi Perfil
          </h1>
          <p style={{ fontSize:13, color:C.gray500, marginTop:6 }}>
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>

        {/* Tarjeta de identidad */}
        <div style={{ ...card, marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            {/* Avatar grande */}
            <div style={{ position:"relative" }}>
              <div style={{
                width:80, height:80, borderRadius:22, flexShrink:0,
                background:`linear-gradient(135deg,${userData.rol==="seller"?C.orange:C.purple},${C.purpleDark})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:32, fontWeight:900, color:"#fff",
                boxShadow:`0 8px 28px ${C.purple}40`,
              }}>
                {(nombre||user?.email)?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{
                position:"absolute", bottom:-4, right:-4,
                width:22, height:22, borderRadius:"50%", background:C.green,
                border:`3px solid #fff`,
                boxShadow:`0 0 10px ${C.green}`,
              }}/>
            </div>
            <div>
              <h2 style={{ fontSize:20, fontWeight:900, color:C.gray900, margin:0 }}>{nombre || "—"}</h2>
              <p style={{ fontSize:13, color:C.gray500, margin:"4px 0 8px" }}>{user?.email}</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <span style={{
                  fontSize:11, fontWeight:800, padding:"3px 12px", borderRadius:20,
                  background:`${rolColor[userData.rol||"admin"]||C.purple}18`,
                  color:rolColor[userData.rol||"admin"]||C.purple,
                  border:`1px solid ${rolColor[userData.rol||"admin"]||C.purple}30`,
                }}>
                  {rolLabel[userData.rol||"admin"]||"Admin"}
                </span>
                {userData.superadmin && (
                  <span style={{ fontSize:11, fontWeight:800, padding:"3px 12px", borderRadius:20, background:`${C.yellow}30`, color:"#7a6500", border:`1px solid ${C.yellow}50` }}>
                    ★ Superadmin
                  </span>
                )}
                <span style={{ fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:20, background:`${C.green}18`, color:"#16a34a", border:`1px solid ${C.green}30` }}>
                  ● Activo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario datos */}
        <div style={{ ...card, marginBottom:18 }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:C.gray900, margin:"0 0 20px", textTransform:"uppercase", letterSpacing:"0.08em" }}>
            Información Personal
          </h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            {[
              { label:"Nombre completo", value:nombre, set:setNombre, placeholder:"Tu nombre" },
              { label:"Cargo / Rol descripción", value:cargo, set:setCargo, placeholder:"Ej: Asesor Comercial" },
              { label:"Teléfono", value:telefono, set:setTelefono, placeholder:"+51 999 999 999" },
              { label:"Email (no editable)", value:user?.email||"", set:()=>{}, placeholder:"", disabled:true },
            ].map((f,i) => (
              <div key={i}>
                <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 }}>
                  {f.label}
                </label>
                <input value={f.value} onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  disabled={f.disabled}
                  style={{
                    width:"100%", padding:"10px 14px", borderRadius:12,
                    border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none",
                    color: f.disabled ? C.gray400 : C.gray900,
                    background: f.disabled ? C.gray100 : C.white,
                    boxSizing:"border-box",
                  }}
                  onFocus={e => !f.disabled && (e.currentTarget.style.borderColor=C.purple)}
                  onBlur={e => (e.currentTarget.style.borderColor=C.gray200)}/>
              </div>
            ))}
          </div>
          <button onClick={guardarPerfil} disabled={saving}
            style={{
              padding:"11px 28px", borderRadius:12,
              background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
              color:"#fff", fontSize:13, fontWeight:800, border:"none", cursor:"pointer",
              opacity:saving?0.6:1,
              boxShadow:`0 4px 16px ${C.purple}40`,
            }}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        {/* Cambio de contraseña */}
        <div style={{ ...card }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: showPassForm ? 20 : 0 }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:C.gray900, margin:0, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                Seguridad
              </h3>
              <p style={{ fontSize:12, color:C.gray500, marginTop:4 }}>Cambia tu contraseña de acceso</p>
            </div>
            <button onClick={() => setShowPassForm(v => !v)}
              style={{
                padding:"8px 18px", borderRadius:10, fontSize:12, fontWeight:700,
                background: showPassForm ? C.gray100 : `${C.purple}10`,
                color: showPassForm ? C.gray500 : C.purple,
                border:`1px solid ${showPassForm ? C.gray200 : `${C.purple}30`}`,
                cursor:"pointer",
              }}>
              {showPassForm ? "Cancelar" : "Cambiar contraseña"}
            </button>
          </div>

          {showPassForm && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:14, maxWidth:420 }}>
                {[
                  { label:"Contraseña actual",       value:passActual,  set:setPassActual  },
                  { label:"Nueva contraseña",         value:passNueva,   set:setPassNueva   },
                  { label:"Confirmar nueva contraseña",value:passConfirm, set:setPassConfirm },
                ].map((f,i) => (
                  <div key={i}>
                    <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 }}>
                      {f.label}
                    </label>
                    <input type="password" value={f.value} onChange={e => f.set(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width:"100%", padding:"10px 14px", borderRadius:12,
                        border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none",
                        color:C.gray900, background:C.white, boxSizing:"border-box",
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor=C.purple)}
                      onBlur={e => (e.currentTarget.style.borderColor=C.gray200)}/>
                  </div>
                ))}
              </div>
              {passNueva && passNueva.length < 8 && (
                <p style={{ fontSize:11, color:C.orange, marginTop:8 }}>La contraseña debe tener al menos 8 caracteres</p>
              )}
              {passNueva && passConfirm && passNueva !== passConfirm && (
                <p style={{ fontSize:11, color:"#dc2626", marginTop:8 }}>Las contraseñas no coinciden</p>
              )}
              <button onClick={cambiarPassword} disabled={savingPass}
                style={{
                  marginTop:18, padding:"10px 24px", borderRadius:11,
                  background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                  color:"#fff", fontSize:13, fontWeight:800, border:"none",
                  cursor: savingPass ? "not-allowed" : "pointer",
                  opacity: savingPass ? 0.6 : 1,
                  boxShadow:`0 4px 14px ${C.purple}40`,
                }}>
                {savingPass ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}