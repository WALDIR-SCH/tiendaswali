// ══════════════════════════════════════════════════════════════════
// INSTRUCCIONES DE INTEGRACIÓN — mis-pedidos/page.tsx (cliente)
// ══════════════════════════════════════════════════════════════════
//
// 1. En el useEffect de notificaciones (ya existente), el listener de
//    Firestore "notificaciones" ya captura el tipo "imeis_asignados".
//    Solo hay que asegurarse de RENDERIZAR ese tipo correctamente.
//
// 2. Agrega el componente <IMEINotifBanner> dentro de cada pedido
//    cuando tenga imeisAsignados.
//
// 3. El hook useIMEINotifs escucha en tiempo real las notificaciones
//    de IMEI para el usuario logueado.
//
// ══════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  orderBy, limit,
} from "firebase/firestore";
import {
  Smartphone, Shield, CheckCircle2, Copy, ExternalLink,
  Bell, Package, Box, X, ChevronDown, ChevronUp,
} from "lucide-react";

const C = {
  purple: "#9851F9", purpleDark: "#7c3aed", purpleBg: "#ede9fe", purpleBorder: "#ddd6fe",
  green: "#28FB4B", greenDark: "#16a34a", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
  orange: "#FF6600", orangeBg: "#fff7ed", orangeBorder: "#fed7aa",
  white: "#FFFFFF", gray100: "#F3F4F6", gray200: "#E5E7EB",
  gray500: "#6B7280", gray700: "#374151", gray900: "#111827",
};

/* ══════════════════════════════════════
   BANNER IMEI — se muestra dentro del pedido
   cuando imeisAsignados.length > 0
══════════════════════════════════════ */
export function IMEINotifBanner({ pedido }: { pedido: any }) {
  const [expanded,  setExpanded]  = useState(false);
  const [copiados,  setCopiados]  = useState<Set<string>>(new Set());

  const imeis: string[] = pedido.imeisAsignados || [];
  if (imeis.length === 0) return null;

  const esCaja = pedido.items?.some((it: any) =>
    it.tipoCompra === "caja" || it.unidad_venta?.toLowerCase?.().includes("caja")
  );

  const copiarIMEI = (imei: string) => {
    navigator.clipboard.writeText(imei);
    setCopiados(prev => {
      const n = new Set(prev); n.add(imei);
      setTimeout(() => setCopiados(s => { const ns = new Set(s); ns.delete(imei); return ns; }), 2000);
      return n;
    });
  };

  const copiarTodos = () => {
    navigator.clipboard.writeText(imeis.join("\n"));
    setCopiados(new Set(imeis));
    setTimeout(() => setCopiados(new Set()), 2000);
  };

  return (
    <div style={{ borderRadius:14, overflow:"hidden", border:`1.5px solid ${C.greenBorder}`, marginTop:12 }}>
      {/* Header banner */}
      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"12px 16px",
        background:`linear-gradient(135deg,${C.greenDark},#0d7c3d)`,
        cursor:"pointer",
      }} onClick={() => setExpanded(v => !v)}>
        <div style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          <Shield size={18} color="#fff" />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ margin:0,fontSize:13,fontWeight:900,color:"#fff" }}>
            📱 IMEIs registrados en OSIPTEL
          </p>
          <p style={{ margin:"2px 0 0",fontSize:11,color:"rgba(255,255,255,0.8)" }}>
            {imeis.length} equipo{imeis.length!==1?"s":""} registrado{imeis.length!==1?"s":""} oficialmente •{" "}
            {esCaja
              ? `Compra por caja · ${pedido.items?.reduce((s:number,it:any)=>s+(it.tipoCompra==="caja"?Number(it.cantidad)||0:0),0)} caja(s)`
              : `Compra por unidad`}
          </p>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:11,fontWeight:700,background:"rgba(255,255,255,0.2)",color:"#fff",padding:"3px 10px",borderRadius:20 }}>
            {expanded ? "Ocultar" : "Ver IMEIs"}
          </span>
          {expanded ? <ChevronUp size={15} color="#fff" /> : <ChevronDown size={15} color="#fff" />}
        </div>
      </div>

      {/* Contenido expandido */}
      {expanded && (
        <div style={{ background:"#f0fdf4",padding:"16px" }}>
          {/* Info OSIPTEL */}
          <div style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:12,background:"rgba(22,163,74,0.08)",border:`1px solid ${C.greenBorder}`,marginBottom:14 }}>
            <Shield size={14} style={{ color:C.greenDark,flexShrink:0,marginTop:1 }} />
            <div>
              <p style={{ margin:0,fontSize:12,fontWeight:800,color:C.greenDark }}>Registro oficial verificado</p>
              <p style={{ margin:"2px 0 0",fontSize:11,color:"#065f46",lineHeight:1.5 }}>
                Estos IMEIs están registrados en la base de datos de OSIPTEL (Organismo Supervisor de Inversión Privada en Telecomunicaciones). Puedes verificar cualquiera en{" "}
                <a href="https://www.osiptel.gob.pe/imei" target="_blank" rel="noopener noreferrer"
                  style={{ color:C.greenDark,fontWeight:700 }}>osiptel.gob.pe/imei</a>
              </p>
            </div>
          </div>

          {/* Lista IMEIs */}
          <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
            {imeis.map((imei, i) => (
              <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:"#fff",border:`1px solid ${C.greenBorder}` }}>
                <div style={{ width:28,height:28,borderRadius:8,background:`${C.greenDark}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <Smartphone size={13} style={{ color:C.greenDark }} />
                </div>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:11,fontWeight:700,color:C.gray500,display:"block" }}>
                    IMEI #{i+1} {imeis.length > 1 && esCaja ? `· Unidad ${i+1}` : ""}
                  </span>
                  <span style={{ fontFamily:"monospace",fontSize:14,fontWeight:900,color:C.gray900,letterSpacing:"0.05em" }}>{imei}</span>
                </div>
                <div style={{ display:"flex",gap:6 }}>
                  <button onClick={() => copiarIMEI(imei)}
                    style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:8,background:"#fff",border:`1px solid ${C.greenBorder}`,fontSize:11,fontWeight:700,color:copiados.has(imei)?C.greenDark:C.gray500,cursor:"pointer" }}>
                    {copiados.has(imei) ? <CheckCircle2 size={11}/> : <Copy size={11}/>}
                    {copiados.has(imei) ? "Copiado" : "Copiar"}
                  </button>
                  <a href={`https://www.osiptel.gob.pe/imei?imei=${imei}`} target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:8,background:C.greenDark,color:"#fff",textDecoration:"none",fontSize:11,fontWeight:700 }}>
                    <ExternalLink size={11}/> OSIPTEL
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Copiar todos */}
          {imeis.length > 1 && (
            <button onClick={copiarTodos}
              style={{ width:"100%",padding:"10px",borderRadius:11,background:`${C.greenDark}12`,border:`1px solid ${C.greenBorder}`,color:C.greenDark,fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <Copy size={13} /> Copiar todos los IMEIs ({imeis.length})
            </button>
          )}

          {/* Tip */}
          <p style={{ margin:"10px 0 0",fontSize:11,color:C.gray500,textAlign:"center" }}>
            💡 Guarda estos números para reportar pérdidas o robos ante las operadoras.
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   HOOK: Notificaciones IMEI en tiempo real
   Úsalo en el componente principal de Mis Pedidos
══════════════════════════════════════ */
export function useIMEINotifs() {
  const [notifImeis, setNotifImeis] = useState<any[]>([]);
  const [noLeidasImei, setNoLeidasImei] = useState(0);

  useEffect(() => {
    let unsubNotif: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged(user => {
      if (unsubNotif) { unsubNotif(); unsubNotif = null; }
      if (!user?.email) return;

      try {
        const q = query(
          collection(db, "notificaciones"),
          where("clienteEmail", "==", user.email),
          where("tipo", "==", "imeis_asignados"),
          limit(20)
        );
        unsubNotif = onSnapshot(q, snap => {
          const docs = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => {
              const ta = a.timestamp?.toMillis?.() || (a.timestamp?.seconds || 0) * 1000;
              const tb = b.timestamp?.toMillis?.() || (b.timestamp?.seconds || 0) * 1000;
              return tb - ta;
            });
          setNotifImeis(docs);
          setNoLeidasImei(docs.filter((n: any) => !n.leida).length);
        }, () => {});
      } catch {}
    });

    return () => { unsubAuth(); if (unsubNotif) unsubNotif(); };
  }, []);

  const marcarLeidaImei = async (id: string) => {
    setNotifImeis(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    try { await updateDoc(doc(db, "notificaciones", id), { leida: true }); } catch {}
  };

  return { notifImeis, noLeidasImei, marcarLeidaImei };
}

/* ══════════════════════════════════════
   TOAST IMEI — aparece automáticamente cuando
   llega una notificación nueva de IMEIs
══════════════════════════════════════ */
export function IMEIToastListener() {
  const { notifImeis, marcarLeidaImei } = useIMEINotifs();
  const [visible, setVisible] = useState<any | null>(null);
  const [shown, setShown] = useState<Set<string>>(new Set());

  useEffect(() => {
    const nueva = notifImeis.find(n => !n.leida && !shown.has(n.id));
    if (nueva) {
      setVisible(nueva);
      setShown(prev => new Set([...prev, nueva.id]));
      // Auto-ocultar a los 8 segundos
      setTimeout(() => setVisible(null), 8000);
    }
  }, [notifImeis]);

  if (!visible) return null;

  const imeis: string[] = visible.imeisAsignados || [];
  const esCaja = visible.tipoCompra === "caja";

  return (
    <div style={{
      position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      zIndex:9999, width:"100%", maxWidth:480, padding:"0 16px",
      animation:"slideUp 0.4s cubic-bezier(.4,0,.2,1)",
    }}>
      <div style={{
        background:`linear-gradient(135deg,${C.greenDark},#0d7c3d)`,
        borderRadius:18, padding:"16px 20px",
        boxShadow:"0 16px 48px rgba(22,163,74,0.4)",
        border:"1px solid rgba(255,255,255,0.2)",
      }}>
        <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
          <div style={{ width:42,height:42,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <Smartphone size={20} color="#fff" />
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0,fontSize:14,fontWeight:900,color:"#fff" }}>
              📱 IMEIs registrados en OSIPTEL
            </p>
            <p style={{ margin:"4px 0 0",fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.5 }}>
              Tu pedido <strong>{visible.pedidoId?.slice(-8)?.toUpperCase()}</strong> tiene{" "}
              {imeis.length} IMEI{imeis.length!==1?"s":""} asignados.
              {esCaja && ` (${visible.cantidadCajas} caja${visible.cantidadCajas!==1?"s":""} × ${visible.unidadesPorCaja} uds)`}
            </p>
            {imeis.length > 0 && (
              <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginTop:8 }}>
                {imeis.slice(0,3).map((imei,i)=>(
                  <span key={i} style={{ fontFamily:"monospace",fontSize:11,fontWeight:700,background:"rgba(255,255,255,0.2)",color:"#fff",padding:"2px 8px",borderRadius:6 }}>
                    {imei}
                  </span>
                ))}
                {imeis.length>3&&<span style={{ fontSize:11,color:"rgba(255,255,255,0.7)",padding:"2px 8px" }}>+{imeis.length-3} más</span>}
              </div>
            )}
          </div>
          <button onClick={() => { setVisible(null); marcarLeidaImei(visible.id); }}
            style={{ background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
            <X size={14} color="#fff" />
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   PARCHE PARA MIS-PEDIDOS — CAMBIOS MÍNIMOS
   
   En tu archivo mis-pedidos/page.tsx, agrega:
   
   1. Al inicio del componente:
   
   import { IMEINotifBanner, IMEIToastListener } from "./imei-components";
   
   2. En el return principal, antes del cierre de </div>:
   
   <IMEIToastListener />
   
   3. Dentro de cada tarjeta de pedido, después del PipelineEstado
      y antes o después del bloque de tracking:
   
   <IMEINotifBanner pedido={pedido} />
   
   4. En el panel de notificaciones (campana), agrega manejo
      del tipo "imeis_asignados". El listener existente ya lo captura
      porque escucha toda la colección "notificaciones".
      Solo agrega este render en el map de notifs:
   
   if (n.tipo === "imeis_asignados") {
     return (
       <div key={n.id} ... >
         <p>📱 {n.titulo}</p>
         <p>{n.mensaje}</p>
         {n.imeisAsignados?.slice(0,2).map(imei => <span key={imei}>{imei}</span>)}
       </div>
     );
   }
   
══════════════════════════════════════ */