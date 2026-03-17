"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";

const C = {
  purple:"#9851F9", purpleDark:"#7C35E0", purpleLight:"#f5f0ff",
  orange:"#FF6600", yellow:"#F6FA00", green:"#28FB4B",
  white:"#FFFFFF",
  gray50:"#F9FAFB", gray100:"#F3F4F6", gray200:"#E5E7EB",
  gray400:"#9CA3AF", gray500:"#6B7280", gray700:"#374151", gray900:"#111827",
};

interface MiConfig {
  notif_pedidos:    boolean;
  notif_clientes:   boolean;
  notif_stock:      boolean;
  notif_email:      boolean;
  idioma:           string;
  moneda:           string;
  zona_horaria:     string;
  sidebar_compacto: boolean;
  tema:             string;
}

const CONFIG_DEFAULT: MiConfig = {
  notif_pedidos:    true,
  notif_clientes:   true,
  notif_stock:      true,
  notif_email:      false,
  idioma:           "es",
  moneda:           "PEN",
  zona_horaria:     "America/Lima",
  sidebar_compacto: false,
  tema:             "light",
};

const Toggle = ({ label, sub, checked, onChange, color = C.purple }: {
  label:string; sub?:string; checked:boolean; onChange:(v:boolean)=>void; color?:string;
}) => (
  <label style={{
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"12px 16px", borderRadius:12, cursor:"pointer",
    border:`1.5px solid ${checked ? `${color}25` : C.gray200}`,
    background: checked ? `${color}06` : C.white,
    transition:"all .15s",
  }}>
    <div>
      <p style={{ fontSize:13, fontWeight:600, color:C.gray900, margin:0 }}>{label}</p>
      {sub && <p style={{ fontSize:11, color:C.gray500, margin:"2px 0 0" }}>{sub}</p>}
    </div>
    <div style={{ position:"relative", width:42, height:22, flexShrink:0, marginLeft:12 }}>
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{ display:"none" }}/>
      <div style={{
        width:42, height:22, borderRadius:11, transition:"all .2s",
        background: checked ? color : C.gray200,
        boxShadow: checked ? `0 2px 10px ${color}40` : "none",
      }}/>
      <div style={{
        position:"absolute", top:2, left:2, width:18, height:18,
        borderRadius:"50%", background:C.white,
        boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
        transition:"transform .2s",
        transform: checked ? "translateX(20px)" : "translateX(0)",
      }}/>
    </div>
  </label>
);

export default function MiConfiguracion() {
  const [user,    setUser]    = useState<any>(null);
  const [config,  setConfig]  = useState<MiConfig>(CONFIG_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "usuarios", u.uid, "config", "preferencias"));
        if (snap.exists()) setConfig(prev => ({ ...prev, ...snap.data() }));
      } catch {}
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const guardar = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "usuarios", user.uid, "config", "preferencias"),
        { ...config, fecha_actualizacion: serverTimestamp() },
        { merge: true }
      );
      toast.success("✅ Configuración guardada");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, gap:12, color:C.gray500 }}>
      <div style={{ width:28, height:28, border:`2.5px solid ${C.purple}28`, borderTopColor:C.purple, borderRadius:"50%", animation:"spin .75s linear infinite" }}/>
      Cargando configuración...
    </div>
  );

  const card: React.CSSProperties = {
    background:"rgba(255,255,255,0.92)", backdropFilter:"blur(16px)",
    borderRadius:18, border:`1px solid ${C.purple}14`,
    boxShadow:`0 4px 24px ${C.purple}08`, padding:24,
    marginBottom:18,
  };

  const SectionTitle = ({ title, sub }: { title:string; sub?:string }) => (
    <div style={{ marginBottom:16 }}>
      <h3 style={{ fontSize:13, fontWeight:900, color:C.gray900, margin:0, textTransform:"uppercase", letterSpacing:"0.1em" }}>{title}</h3>
      {sub && <p style={{ fontSize:11, color:C.gray500, marginTop:3 }}>{sub}</p>}
    </div>
  );

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style:{ borderRadius:"12px", fontWeight:600, fontSize:"13px" } }}/>

      <div style={{ maxWidth:720, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:26, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>
            Configuración de Cuenta
          </h1>
          <p style={{ fontSize:13, color:C.gray500, marginTop:6 }}>
            Ajusta tus preferencias personales del panel
          </p>
        </div>

        {/* Notificaciones */}
        <div style={card}>
          <SectionTitle title="Notificaciones" sub="Elige qué alertas quieres recibir"/>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <Toggle label="Nuevos pedidos" sub="Notificar cuando llegue un pedido" checked={config.notif_pedidos} onChange={v=>setConfig(p=>({...p,notif_pedidos:v}))} color={C.purple}/>
            <Toggle label="Nuevos clientes" sub="Notificar cuando se registre una empresa" checked={config.notif_clientes} onChange={v=>setConfig(p=>({...p,notif_clientes:v}))} color={C.green}/>
            <Toggle label="Alertas de stock" sub="Avisar cuando un producto esté crítico" checked={config.notif_stock} onChange={v=>setConfig(p=>({...p,notif_stock:v}))} color={C.orange}/>
            <Toggle label="Notificaciones por email" sub="Recibir resumen diario en tu correo" checked={config.notif_email} onChange={v=>setConfig(p=>({...p,notif_email:v}))} color={C.purple}/>
          </div>
        </div>

        {/* Regional */}
        <div style={card}>
          <SectionTitle title="Región y Formato" sub="Idioma, moneda y zona horaria"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { label:"Idioma", value:config.idioma, key:"idioma", opts:[{v:"es",l:"Español"},{v:"en",l:"English"}] },
              { label:"Moneda", value:config.moneda, key:"moneda", opts:[{v:"PEN",l:"S/ Soles (PEN)"},{v:"USD",l:"$ Dólares (USD)"}] },
              { label:"Zona horaria", value:config.zona_horaria, key:"zona_horaria", opts:[
                {v:"America/Lima",    l:"Lima (UTC-5)"},
                {v:"America/Bogota",  l:"Bogotá (UTC-5)"},
                {v:"America/Mexico_City",l:"Ciudad de México (UTC-6)"},
              ]},
            ].map((f,i) => (
              <div key={i} style={{ gridColumn: i===2 ? "1 / -1" : "auto" }}>
                <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 }}>
                  {f.label}
                </label>
                <select value={f.value} onChange={e=>setConfig(p=>({...p,[f.key]:e.target.value}))}
                  style={{
                    width:"100%", padding:"10px 14px", borderRadius:12,
                    border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none",
                    color:C.gray900, background:C.white, cursor:"pointer",
                    appearance:"none",
                  }}>
                  {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Apariencia */}
        <div style={card}>
          <SectionTitle title="Apariencia" sub="Personaliza la interfaz del panel"/>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <Toggle label="Sidebar compacto" sub="Mostrar solo íconos en el menú lateral" checked={config.sidebar_compacto} onChange={v=>setConfig(p=>({...p,sidebar_compacto:v}))} color={C.purple}/>
          </div>
          <div style={{ marginTop:16 }}>
            <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:8 }}>
              Tema
            </label>
            <div style={{ display:"flex", gap:10 }}>
              {[{v:"light",l:"☀️ Claro"},{v:"dark",l:"🌙 Oscuro"},{v:"auto",l:"⚙️ Sistema"}].map(t => (
                <button key={t.v} onClick={()=>setConfig(p=>({...p,tema:t.v}))}
                  style={{
                    flex:1, padding:"10px 14px", borderRadius:11, fontSize:12, fontWeight:700,
                    cursor:"pointer", transition:"all .15s",
                    background: config.tema===t.v ? `linear-gradient(135deg,${C.purple},${C.purpleDark})` : C.gray100,
                    color: config.tema===t.v ? "#fff" : C.gray100,
                    border: config.tema===t.v ? "none" : `1px solid ${C.gray200}`,
                    boxShadow: config.tema===t.v ? `0 4px 14px ${C.purple}40` : "none",
                  }}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Guardar */}
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button onClick={guardar} disabled={saving}
            style={{
              padding:"12px 32px", borderRadius:12,
              background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
              color:"#fff", fontSize:13, fontWeight:800, border:"none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              boxShadow:`0 4px 18px ${C.purple}40`,
            }}>
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select { appearance: none !important; -webkit-appearance: none !important; }
      `}</style>
    </>
  );
}