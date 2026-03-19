"use client";
// src/app/admin/configuracion/page.tsx

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import {
  Save, Building, Truck, Phone,
  ChevronRight, RefreshCcw, Landmark, Globe,
  MapPin, Zap, AlertCircle, MessageSquare, Eye,
  Store, Navigation, Info, Package, Gift
} from "lucide-react";

const C = {
  purple:      "#7c3aed",
  purpleLight: "#9851F9",
  purpleBg:    "#f5f3ff",
  purplePale:  "#ede9fe",
  purpleBorder:"#c4b5fd",
  orange:      "#FF6600",
  orangeBg:    "#fff7ed",
  yellow:      "#F6FA00",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  greenBg:     "#f0fdf4",
  white:       "#FFFFFF",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray300:     "#D1D5DB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray600:     "#4B5563",
  gray700:     "#374151",
  gray900:     "#111827",
};

interface BancoData { cuenta:string; cci:string; titular:string; activo:boolean; }
interface ConfigType {
  bancos: { bcp:BancoData; bbva:BancoData; interbank:BancoData; scotiabank:BancoData; };
  yape: string; plin: string;
  envios: {
    lima:      { costo:number; tiempo:string; gratis_desde:number };
    provincia: { costo:number; tiempo:string; gratis_desde:number };
    recojo_tienda:     boolean;
    direccion_almacen: string;
    horario_recojo:    string;
  };
  empresa: {
    ruc:string; razon_social:string; domicilio_fiscal:string;
    factura_electronica:boolean; detracciones:boolean; monto_detraccion:number;
  };
  contacto: { whatsapp_ventas:string; whatsapp_soporte:string; email_pedidos:string; horario:string; };
  minimo_compra: number; stock_critico_alerta: number;
}

const DEFAULT: ConfigType = {
  bancos: {
    bcp:        { cuenta:"", cci:"", titular:"MUNDO MÓVIL SAC", activo:true  },
    bbva:       { cuenta:"", cci:"", titular:"MUNDO MÓVIL SAC", activo:true  },
    interbank:  { cuenta:"", cci:"", titular:"MUNDO MÓVIL SAC", activo:false },
    scotiabank: { cuenta:"", cci:"", titular:"MUNDO MÓVIL SAC", activo:false },
  },
  yape:"", plin:"",
  envios: {
    lima:      { costo:15, tiempo:"24-48h hábiles",    gratis_desde:1000 },
    provincia: { costo:35, tiempo:"3-5 días hábiles",  gratis_desde:0    },
    recojo_tienda:true, direccion_almacen:"", horario_recojo:"Lun-Vie 9am-6pm",
  },
  empresa: { ruc:"", razon_social:"", domicilio_fiscal:"", factura_electronica:true, detracciones:false, monto_detraccion:700 },
  contacto: { whatsapp_ventas:"", whatsapp_soporte:"", email_pedidos:"", horario:"Lun-Vie 9am-6pm" },
  minimo_compra:0, stock_critico_alerta:5,
};

const BANCO_COLORS: Record<string,string> = { bcp:"#E30613", bbva:"#004481", interbank:"#00A651", scotiabank:"#D52B1E" };

function BancoLogo({ banco, size=36 }: { banco:string; size?:number }) {
  const [err, setErr] = useState(false);
  const abbr = { bcp:"BCP", bbva:"BBVA", interbank:"IBK", scotiabank:"SCO" }[banco]||banco.toUpperCase().slice(0,4);
  const color = BANCO_COLORS[banco]||C.gray400;
  if (err) return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.22), background:color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ fontSize:Math.round(size*0.28), fontWeight:900, color:"#fff", fontFamily:"Arial,sans-serif" }}>{abbr}</span>
    </div>
  );
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.22), overflow:"hidden", flexShrink:0, background:C.gray100, border:`1px solid ${C.gray200}` }}>
      <img src={`/images/bancos/${banco}.png`} alt={banco} onError={()=>setErr(true)} style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
    </div>
  );
}

function BancoCard({ id, nombre, banco, onChange }: { id:string; nombre:string; banco:BancoData; onChange:(b:BancoData)=>void }) {
  const [open, setOpen] = useState(banco.activo);
  const cfg = (v:Partial<BancoData>) => onChange({...banco,...v});
  const isComplete = banco.cuenta && banco.cci;
  return (
    <div style={{ borderRadius:14, border:`1.5px solid ${banco.activo?C.purpleBorder:C.gray200}`, overflow:"hidden", transition:"all .2s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:banco.activo?C.purpleBg:C.gray50, cursor:"pointer" }} onClick={()=>setOpen(!open)}>
        <BancoLogo banco={id} size={36}/>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, fontWeight:800, color:C.gray900 }}>{nombre}</span>
            {isComplete&&banco.activo&&<span style={{ fontSize:9, fontWeight:900, padding:"2px 7px", borderRadius:20, background:C.greenBg, color:C.greenDark, border:`1px solid ${C.green}30` }}>✓ Configurado</span>}
            {!banco.activo&&<span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:20, background:C.gray100, color:C.gray400 }}>Inactivo</span>}
          </div>
          {banco.cuenta&&<div style={{ fontSize:10, color:C.gray400, fontFamily:"monospace", marginTop:2 }}>{banco.cuenta.slice(0,6)}••••••</div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }} onClick={e=>e.stopPropagation()}>
            <span style={{ fontSize:10, fontWeight:600, color:C.gray500 }}>Activo</span>
            <div style={{ position:"relative", width:36, height:20 }}>
              <input type="checkbox" checked={banco.activo} onChange={e=>cfg({activo:e.target.checked})} style={{ display:"none" }}/>
              <div style={{ width:36, height:20, borderRadius:10, background:banco.activo?C.purple:C.gray300, transition:"background .2s" }}/>
              <div style={{ position:"absolute", top:2, left:2, width:16, height:16, borderRadius:"50%", background:C.white, boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transition:"transform .2s", transform:banco.activo?"translateX(16px)":"translateX(0)" }}/>
            </div>
          </label>
          <div style={{ transform:open?"rotate(90deg)":"rotate(0)", transition:"transform .2s", color:C.gray400 }}><ChevronRight size={14}/></div>
        </div>
      </div>
      {open&&(
        <div style={{ padding:"16px", borderTop:`1px solid ${C.gray100}`, background:C.white }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[{label:"Número de Cuenta",key:"cuenta",ph:"000-0000000-0-00"},{label:"CCI (Interbancario)",key:"cci",ph:"00200000000000000000"},{label:"Titular",key:"titular",ph:"MUNDO MÓVIL SAC"}].map(f=>(
              <div key={f.key} style={{ gridColumn:f.key==="titular"?"1/-1":"auto" }}>
                <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:5 }}>{f.label}</label>
                <input value={(banco as any)[f.key]} onChange={e=>cfg({[f.key]:e.target.value} as any)} placeholder={f.ph}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:12, fontFamily:f.key!=="titular"?"monospace":"inherit", outline:"none", boxSizing:"border-box" as any }}
                  onFocus={e=>e.currentTarget.style.borderColor=C.purple}
                  onBlur={e=>e.currentTarget.style.borderColor=C.gray200}/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, sub, checked, onChange, color=C.purple }: { label:string; sub?:string; checked:boolean; onChange:(v:boolean)=>void; color?:string }) {
  return (
    <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:12, cursor:"pointer", border:`1.5px solid ${checked?`${color}25`:C.gray200}`, background:checked?`${color}06`:C.white, transition:"all .15s" }}>
      <div><p style={{ fontSize:13, fontWeight:600, color:C.gray900, margin:0 }}>{label}</p>{sub&&<p style={{ fontSize:10, color:C.gray400, margin:"2px 0 0" }}>{sub}</p>}</div>
      <div style={{ position:"relative", width:40, height:22, flexShrink:0, marginLeft:12 }}>
        <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{ display:"none" }}/>
        <div style={{ width:40, height:22, borderRadius:11, background:checked?color:C.gray200, transition:"background .2s", boxShadow:checked?`0 2px 8px ${color}40`:"none" }}/>
        <div style={{ position:"absolute", top:2, left:2, width:18, height:18, borderRadius:"50%", background:C.white, boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"transform .2s", transform:checked?"translateX(18px)":"translateX(0)" }}/>
      </div>
    </label>
  );
}

function Field({ label, value, onChange, ph, type="text", mono=false, required=false, hint }: { label:string; value:string|number; onChange:(v:string)=>void; ph?:string; type?:string; mono?:boolean; required?:boolean; hint?:string }) {
  return (
    <div>
      <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:5 }}>
        {label}{required&&<span style={{ color:C.orange }}> *</span>}
      </label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={ph}
        style={{ width:"100%", padding:"10px 12px", borderRadius:11, border:`1.5px solid ${C.gray200}`, fontSize:12, outline:"none", fontFamily:mono?"monospace":"inherit", boxSizing:"border-box" as any, background:C.white, color:C.gray900 }}
        onFocus={e=>e.currentTarget.style.borderColor=C.purple}
        onBlur={e=>e.currentTarget.style.borderColor=C.gray200}/>
      {hint&&<p style={{ fontSize:10, color:C.gray400, margin:"4px 0 0" }}>{hint}</p>}
    </div>
  );
}

function SH({ icon:Icon, title, sub, color=C.purple }: { icon:any; title:string; sub?:string; color?:string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
      <div style={{ width:40, height:40, borderRadius:12, background:`${color}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={18} style={{ color }}/>
      </div>
      <div>
        <h2 style={{ fontSize:14, fontWeight:900, color:C.gray900, margin:0 }}>{title}</h2>
        {sub&&<p style={{ fontSize:11, color:C.gray500, margin:"2px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background:C.white, borderRadius:18, border:`1px solid ${C.gray200}`, boxShadow:"0 1px 8px rgba(124,58,237,0.04)", padding:24 };

export default function ConfiguracionAdmin() {
  const [config,  setConfig]  = useState<ConfigType>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [section, setSection] = useState<"empresa"|"bancos"|"envios"|"contacto">("empresa");
  const [changed, setChanged] = useState(false);
  const [preview, setPreview] = useState(false);

  const set = <K extends keyof ConfigType>(key:K, val:ConfigType[K]) => { setConfig(p=>({...p,[key]:val})); setChanged(true); };

  useEffect(()=>{
    const unsub = onSnapshot(doc(db,"ajustes","global"), snap=>{
      if (snap.exists()) {
        const d = snap.data() as Partial<ConfigType>;
        // Merge envios con defaults para garantizar gratis_desde en provincia
        setConfig(p=>({
          ...p, ...d,
          envios: d.envios ? {
            ...DEFAULT.envios, ...d.envios,
            lima:      { ...DEFAULT.envios.lima,      ...(d.envios.lima||{})      },
            provincia: { ...DEFAULT.envios.provincia, ...(d.envios.provincia||{}) },
          } : p.envios,
        }));
      }
      setLoading(false);
    }, ()=>setLoading(false));
    return ()=>unsub();
  },[]);

  const guardar = async ()=>{
    setSaving(true);
    try { await setDoc(doc(db,"ajustes","global"), config, {merge:true}); setChanged(false); toast.success("✅ Configuración guardada y sincronizada"); }
    catch { toast.error("❌ Error al guardar"); }
    finally { setSaving(false); }
  };

  const SECTIONS = [
    { id:"empresa",  label:"Empresa",      icon:Building,  color:C.purple    },
    { id:"bancos",   label:"Bancos/Pagos", icon:Landmark,  color:C.orange    },
    { id:"envios",   label:"Envíos",       icon:Truck,     color:C.greenDark },
    { id:"contacto", label:"Contacto",     icon:Phone,     color:C.orange    },
  ] as const;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:280, gap:12, color:C.gray500 }}>
      <div style={{ width:24, height:24, border:`2px solid ${C.purple}28`, borderTopColor:C.purple, borderRadius:"50%", animation:"spin .75s linear infinite" }}/>
      <span style={{ fontSize:13, fontWeight:600 }}>Cargando configuración...</span>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style:{ borderRadius:"12px", fontWeight:600, fontSize:"13px" } }}/>
      <div style={{ maxWidth:1100, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>

        {/* Encabezado */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>Configuración General</h1>
            <p style={{ fontSize:12, color:C.gray400, margin:"5px 0 0", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:C.greenDark, display:"inline-block", animation:"pulse-dot 2s ease infinite" }}/>
              Cambios sincronizados en tiempo real con el carrito
            </p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {changed&&<span style={{ fontSize:10, fontWeight:700, padding:"6px 12px", borderRadius:20, background:C.orangeBg, color:C.orange, border:`1px solid ${C.orange}30`, display:"flex", alignItems:"center", gap:4 }}><AlertCircle size={10}/> Cambios sin guardar</span>}
            <button onClick={guardar} disabled={saving}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:12, fontSize:12, fontWeight:800, border:"none", cursor:"pointer", background:changed?`linear-gradient(135deg,${C.purple},${C.purpleLight})`:C.gray200, color:changed?C.white:C.gray500, boxShadow:changed?`0 4px 14px ${C.purple}40`:"none", opacity:saving?0.6:1 }}>
              {saving?<RefreshCcw size={14} style={{ animation:"spin .75s linear infinite" }}/>:<Save size={14}/>}
              {saving?"Guardando...":"Guardar todo"}
            </button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:16 }}>

          {/* Sidebar nav */}
          <div style={{ ...card, padding:10, height:"fit-content", position:"sticky", top:80 }}>
            {SECTIONS.map(s=>(
              <button key={s.id} onClick={()=>setSection(s.id as any)}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:11, marginBottom:2, background:section===s.id?`${s.color}10`:"transparent", border:`1px solid ${section===s.id?`${s.color}25`:"transparent"}`, cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`${s.color}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <s.icon size={13} style={{ color:s.color }}/>
                </div>
                <span style={{ fontSize:12, fontWeight:section===s.id?800:500, color:section===s.id?s.color:C.gray600 }}>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* ══ EMPRESA ══ */}
            {section==="empresa"&&(
              <div style={card}>
                <SH icon={Building} title="Datos de la Empresa" sub="RUC, razón social y configuración fiscal SUNAT"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
                  <Field label="RUC *" value={config.empresa.ruc} required mono onChange={v=>set("empresa",{...config.empresa,ruc:v})} ph="20XXXXXXXXX"/>
                  <Field label="Razón Social *" value={config.empresa.razon_social} required onChange={v=>set("empresa",{...config.empresa,razon_social:v.toUpperCase()})} ph="MUNDO MÓVIL SAC"/>
                  <div style={{ gridColumn:"1/-1" }}>
                    <Field label="Domicilio Fiscal" value={config.empresa.domicilio_fiscal} onChange={v=>set("empresa",{...config.empresa,domicilio_fiscal:v})} ph="Av. Principal 123, Lima, Lima"/>
                  </div>
                </div>
                <div style={{ borderTop:`1px solid ${C.gray100}`, paddingTop:16 }}>
                  <p style={{ fontSize:10, fontWeight:900, color:C.gray400, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:12 }}>Configuración Fiscal SUNAT</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <Toggle label="Factura Electrónica" sub="Habilitar emisión de comprobantes electrónicos" checked={config.empresa.factura_electronica} onChange={v=>set("empresa",{...config.empresa,factura_electronica:v})}/>
                    <Toggle label="Detracciones" sub="Aplicar sistema de detracciones para operaciones sujetas" checked={config.empresa.detracciones} onChange={v=>set("empresa",{...config.empresa,detracciones:v})}/>
                    {config.empresa.detracciones&&<div style={{ marginLeft:16 }}><Field label="Monto mínimo de detracción (S/)" type="number" value={config.empresa.monto_detraccion} onChange={v=>set("empresa",{...config.empresa,monto_detraccion:Number(v)})} ph="700"/></div>}
                  </div>
                </div>
                <div style={{ borderTop:`1px solid ${C.gray100}`, paddingTop:16, marginTop:16 }}>
                  <p style={{ fontSize:10, fontWeight:900, color:C.gray400, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:12 }}>Reglas de Venta</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <Field label="Compra mínima (S/)" type="number" value={config.minimo_compra} onChange={v=>set("minimo_compra",Number(v))} ph="0"/>
                    <Field label="Alerta stock crítico (uds)" type="number" value={config.stock_critico_alerta} onChange={v=>set("stock_critico_alerta",Number(v))} ph="5"/>
                  </div>
                </div>
              </div>
            )}

            {/* ══ BANCOS ══ */}
            {section==="bancos"&&(
              <>
                <div style={{ padding:"12px 16px", borderRadius:12, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:C.greenDark, marginTop:5, flexShrink:0, boxShadow:`0 0 6px ${C.greenDark}`, animation:"pulse-dot 2s ease infinite" }}/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:800, color:C.purple, margin:"0 0 2px" }}>Sincronización automática con el Carrito</p>
                    <p style={{ fontSize:11, color:C.gray500, margin:0 }}>Los datos se actualizan inmediatamente en el checkout.</p>
                  </div>
                </div>
                <div style={card}>
                  <SH icon={Landmark} title="Cuentas Bancarias" sub="Configura las cuentas · Se actualizan en tiempo real" color={C.orange}/>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <BancoCard id="bcp"        nombre="BCP — Banco de Crédito del Perú" banco={config.bancos.bcp}        onChange={b=>set("bancos",{...config.bancos,bcp:b})}/>
                    <BancoCard id="bbva"       nombre="BBVA Continental"                banco={config.bancos.bbva}       onChange={b=>set("bancos",{...config.bancos,bbva:b})}/>
                    <BancoCard id="interbank"  nombre="Interbank"                       banco={config.bancos.interbank}  onChange={b=>set("bancos",{...config.bancos,interbank:b})}/>
                    <BancoCard id="scotiabank" nombre="Scotiabank"                      banco={config.bancos.scotiabank} onChange={b=>set("bancos",{...config.bancos,scotiabank:b})}/>
                  </div>
                </div>
                <div style={card}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <SH icon={Eye} title="Vista Previa del Carrito" sub="Así se verá en el checkout" color={C.purple}/>
                    <button onClick={()=>setPreview(v=>!v)} style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:8, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, color:C.purple, cursor:"pointer" }}>{preview?"Ocultar":"Mostrar"}</button>
                  </div>
                  {preview&&(
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
                      {(Object.entries(config.bancos) as [string,BancoData][]).filter(([,b])=>b.activo).map(([id,b])=>(
                        <div key={id} style={{ padding:"14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, background:C.gray50 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                            <BancoLogo banco={id} size={32}/>
                            <span style={{ fontSize:13, fontWeight:800, color:C.gray900 }}>{id==="bcp"?"BCP":id==="bbva"?"BBVA":id==="interbank"?"Interbank":"Scotiabank"}</span>
                          </div>
                          {b.cuenta?<div style={{ fontSize:10, color:C.gray500 }}><div>Cuenta: <span style={{ fontFamily:"monospace", fontWeight:700 }}>{b.cuenta}</span></div><div>CCI: <span style={{ fontFamily:"monospace", fontWeight:700 }}>{b.cci}</span></div><div>Titular: {b.titular}</div></div>:<p style={{ fontSize:10, color:C.gray400, margin:0 }}>Sin cuenta configurada</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={card}>
                  <SH icon={Zap} title="Billeteras Digitales" sub="Yape, Plin u otros medios" color={C.orange}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <Field label="🟡 Yape (número)" value={config.yape} onChange={v=>set("yape",v)} ph="+51 999 999 999"/>
                    <Field label="🔵 Plin (número)" value={config.plin} onChange={v=>set("plin",v)} ph="+51 999 999 999"/>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════
                ══ ENVÍOS — SECCIÓN COMPLETA ══
            ══════════════════════════════════ */}
            {section==="envios"&&(
              <>
                {/* Banner info */}
                <div style={{ padding:"12px 16px", borderRadius:12, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, display:"flex", alignItems:"flex-start", gap:10 }}>
                  <Info size={15} style={{ color:C.purple, flexShrink:0, marginTop:1 }}/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:800, color:C.purple, margin:"0 0 2px" }}>3 modos de entrega disponibles en el carrito</p>
                    <p style={{ fontSize:11, color:C.gray500, margin:0 }}>
                      Los costos, tiempos y umbrales de envío gratis que configures aquí se aplican <strong>en tiempo real</strong> en el checkout del cliente.
                    </p>
                  </div>
                </div>

                {/* ── LIMA METROPOLITANA ── */}
                <div style={{ ...card, border:`1.5px solid ${C.purple}25` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:C.purplePale, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <MapPin size={20} style={{ color:C.purple }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <h3 style={{ fontSize:14, fontWeight:900, color:C.purple, margin:0 }}>Lima Metropolitana</h3>
                      <p style={{ fontSize:11, color:C.gray400, margin:"2px 0 0" }}>Todos los 42 distritos de Lima</p>
                    </div>
                    {/* Badge estado */}
                    <div style={{ padding:"5px 12px", borderRadius:20, background:C.purplePale, border:`1px solid ${C.purpleBorder}` }}>
                      <span style={{ fontSize:11, fontWeight:800, color:C.purple }}>
                        {config.envios.lima.gratis_desde>0 && config.envios.lima.costo>0
                          ? `Gratis +S/${config.envios.lima.gratis_desde}`
                          : config.envios.lima.costo===0 ? "Siempre gratis" : `S/ ${config.envios.lima.costo}`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    <Field label="Costo de envío (S/)" type="number"
                      value={config.envios.lima.costo}
                      onChange={v=>set("envios",{...config.envios,lima:{...config.envios.lima,costo:Number(v)}})}
                      ph="15" hint="Escribe 0 para envío siempre gratis"/>
                    <Field label="Tiempo estimado de entrega"
                      value={config.envios.lima.tiempo}
                      onChange={v=>set("envios",{...config.envios,lima:{...config.envios.lima,tiempo:v}})}
                      ph="24-48h hábiles"/>

                    {/* Envío gratis desde — Lima */}
                    <div style={{ gridColumn:"1/-1" }}>
                      <div style={{ padding:"16px", borderRadius:14, background:`${C.green}08`, border:`1.5px solid ${C.green}25` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                          <div style={{ width:32, height:32, borderRadius:9, background:`${C.greenDark}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Gift size={16} style={{ color:C.greenDark }}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <p style={{ fontSize:13, fontWeight:800, color:C.greenDark, margin:0 }}>Envío GRATIS en compras mayores a</p>
                            <p style={{ fontSize:11, color:C.gray500, margin:"2px 0 0" }}>Escribe 0 para desactivar esta promoción</p>
                          </div>
                          {config.envios.lima.gratis_desde>0&&(
                            <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:10, background:C.greenBg, color:C.greenDark, border:`1px solid ${C.green}30` }}>Activo</span>
                          )}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:16, fontWeight:900, color:C.greenDark, flexShrink:0 }}>S/</span>
                          <input
                            type="number" min="0"
                            value={config.envios.lima.gratis_desde}
                            onChange={e=>set("envios",{...config.envios,lima:{...config.envios.lima,gratis_desde:Number(e.target.value)}})}
                            placeholder="1000"
                            style={{ flex:1, padding:"10px 14px", borderRadius:11, border:`2px solid ${C.greenDark}40`, fontSize:18, fontWeight:900, outline:"none", color:C.greenDark, background:C.white, boxSizing:"border-box" as any, textAlign:"center" }}
                            onFocus={e=>e.currentTarget.style.borderColor=C.greenDark}
                            onBlur={e=>e.currentTarget.style.borderColor=`${C.greenDark}40`}
                          />
                        </div>
                        {config.envios.lima.gratis_desde>0&&(
                          <p style={{ fontSize:11, color:C.greenDark, margin:"10px 0 0", fontWeight:600, textAlign:"center" }}>
                            🎉 Clientes que compren más de S/ {config.envios.lima.gratis_desde} recibirán envío gratis a Lima
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PROVINCIAS ── */}
                <div style={{ ...card, border:`1.5px solid ${C.orange}25` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:C.orangeBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Navigation size={20} style={{ color:C.orange }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <h3 style={{ fontSize:14, fontWeight:900, color:C.orange, margin:0 }}>Provincias / Nacional</h3>
                      <p style={{ fontSize:11, color:C.gray400, margin:"2px 0 0" }}>Todas las 25 regiones del Perú</p>
                    </div>
                    <div style={{ padding:"5px 12px", borderRadius:20, background:C.orangeBg, border:`1px solid ${C.orange}30` }}>
                      <span style={{ fontSize:11, fontWeight:800, color:C.orange }}>
                        {config.envios.provincia.gratis_desde>0 && config.envios.provincia.costo>0
                          ? `Gratis +S/${config.envios.provincia.gratis_desde}`
                          : config.envios.provincia.costo===0 ? "Siempre gratis" : `S/ ${config.envios.provincia.costo}`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    <Field label="Costo de envío (S/)" type="number"
                      value={config.envios.provincia.costo}
                      onChange={v=>set("envios",{...config.envios,provincia:{...config.envios.provincia,costo:Number(v)}})}
                      ph="35" hint="Escribe 0 para envío siempre gratis"/>
                    <Field label="Tiempo estimado de entrega"
                      value={config.envios.provincia.tiempo}
                      onChange={v=>set("envios",{...config.envios,provincia:{...config.envios.provincia,tiempo:v}})}
                      ph="3-5 días hábiles"/>

                    {/* Envío gratis desde — Provincias */}
                    <div style={{ gridColumn:"1/-1" }}>
                      <div style={{ padding:"16px", borderRadius:14, background:`${C.green}08`, border:`1.5px solid ${C.green}25` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                          <div style={{ width:32, height:32, borderRadius:9, background:`${C.greenDark}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Gift size={16} style={{ color:C.greenDark }}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <p style={{ fontSize:13, fontWeight:800, color:C.greenDark, margin:0 }}>Envío GRATIS en compras mayores a</p>
                            <p style={{ fontSize:11, color:C.gray500, margin:"2px 0 0" }}>Escribe 0 para desactivar esta promoción en provincias</p>
                          </div>
                          {config.envios.provincia.gratis_desde>0&&(
                            <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:10, background:C.greenBg, color:C.greenDark, border:`1px solid ${C.green}30` }}>Activo</span>
                          )}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:16, fontWeight:900, color:C.greenDark, flexShrink:0 }}>S/</span>
                          <input
                            type="number" min="0"
                            value={config.envios.provincia.gratis_desde}
                            onChange={e=>set("envios",{...config.envios,provincia:{...config.envios.provincia,gratis_desde:Number(e.target.value)}})}
                            placeholder="0"
                            style={{ flex:1, padding:"10px 14px", borderRadius:11, border:`2px solid ${C.greenDark}40`, fontSize:18, fontWeight:900, outline:"none", color:C.greenDark, background:C.white, boxSizing:"border-box" as any, textAlign:"center" }}
                            onFocus={e=>e.currentTarget.style.borderColor=C.greenDark}
                            onBlur={e=>e.currentTarget.style.borderColor=`${C.greenDark}40`}
                          />
                        </div>
                        {config.envios.provincia.gratis_desde>0&&(
                          <p style={{ fontSize:11, color:C.greenDark, margin:"10px 0 0", fontWeight:600, textAlign:"center" }}>
                            🎉 Clientes que compren más de S/ {config.envios.provincia.gratis_desde} recibirán envío gratis a provincias
                          </p>
                        )}
                        {config.envios.provincia.gratis_desde===0&&(
                          <p style={{ fontSize:11, color:C.gray400, margin:"10px 0 0", textAlign:"center" }}>
                            Promo desactivada · Todos los pedidos a provincias pagarán S/ {config.envios.provincia.costo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RECOJO EN TIENDA ── */}
                <div style={{ ...card, border:`1.5px solid ${config.envios.recojo_tienda?`${C.greenDark}25`:C.gray200}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:config.envios.recojo_tienda?20:0 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:C.greenBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Store size={20} style={{ color:C.greenDark }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <h3 style={{ fontSize:14, fontWeight:900, color:C.greenDark, margin:0 }}>Recojo en Tienda</h3>
                      <p style={{ fontSize:11, color:C.gray400, margin:"2px 0 0" }}>Sin costo para el cliente — Gratis siempre</p>
                    </div>
                    <label style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:config.envios.recojo_tienda?C.greenDark:C.gray400 }}>
                        {config.envios.recojo_tienda?"Habilitado":"Deshabilitado"}
                      </span>
                      <div style={{ position:"relative", width:44, height:24 }}>
                        <input type="checkbox" checked={config.envios.recojo_tienda} onChange={e=>set("envios",{...config.envios,recojo_tienda:e.target.checked})} style={{ display:"none" }}/>
                        <div style={{ width:44, height:24, borderRadius:12, background:config.envios.recojo_tienda?C.greenDark:C.gray300, transition:"background .2s", boxShadow:config.envios.recojo_tienda?`0 2px 8px ${C.greenDark}40`:"none" }}/>
                        <div style={{ position:"absolute", top:3, left:3, width:18, height:18, borderRadius:"50%", background:C.white, boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"transform .2s", transform:config.envios.recojo_tienda?"translateX(20px)":"translateX(0)" }}/>
                      </div>
                    </label>
                  </div>

                  {config.envios.recojo_tienda&&(
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      {/* Dirección del almacén */}
                      <div>
                        <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:5 }}>
                          Dirección del almacén *
                        </label>
                        <textarea
                          value={config.envios.direccion_almacen}
                          onChange={e=>set("envios",{...config.envios,direccion_almacen:e.target.value})}
                          placeholder="Av. Principal 123, Urbanización Las Flores, Miraflores, Lima"
                          rows={2}
                          style={{ width:"100%", padding:"10px 12px", borderRadius:11, border:`1.5px solid ${C.gray200}`, fontSize:12, outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" as any, color:C.gray900 }}
                          onFocus={e=>e.currentTarget.style.borderColor=C.greenDark}
                          onBlur={e=>e.currentTarget.style.borderColor=C.gray200}
                        />
                        {config.envios.direccion_almacen&&(
                          <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, background:C.greenBg, border:`1px solid ${C.green}30` }}>
                            <MapPin size={10} style={{ color:C.greenDark, flexShrink:0 }}/>
                            <span style={{ fontSize:10, color:C.greenDark, fontWeight:600 }}>{config.envios.direccion_almacen}</span>
                          </div>
                        )}
                      </div>
                      <Field label="Horario de retiro"
                        value={config.envios.horario_recojo||""}
                        onChange={v=>set("envios",{...config.envios,horario_recojo:v})}
                        ph="Lun-Vie 9am-6pm / Sáb 9am-1pm"/>
                    </div>
                  )}

                  {!config.envios.recojo_tienda&&(
                    <div style={{ padding:"10px 14px", borderRadius:10, background:C.gray50, border:`1px solid ${C.gray200}`, marginTop:12 }}>
                      <p style={{ fontSize:11, color:C.gray400, margin:0, textAlign:"center" }}>Opción deshabilitada · Los clientes no verán esta opción en el checkout</p>
                    </div>
                  )}
                </div>

                {/* Resumen de tarifas */}
                <div style={card}>
                  <SH icon={Package} title="Resumen de Tarifas" sub="Así aparecerán en el selector de envío del carrito" color={C.purple}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                    {[
                      { icon:MapPin,     color:C.purple,    label:"Lima",         costo:config.envios.lima.costo===0?"GRATIS":`S/ ${config.envios.lima.costo}`,             tiempo:config.envios.lima.tiempo,       tag:config.envios.lima.gratis_desde>0?`Gratis +S/${config.envios.lima.gratis_desde}`:null },
                      { icon:Navigation, color:C.orange,    label:"Provincias",   costo:config.envios.provincia.costo===0?"GRATIS":`S/ ${config.envios.provincia.costo}`,   tiempo:config.envios.provincia.tiempo,  tag:config.envios.provincia.gratis_desde>0?`Gratis +S/${config.envios.provincia.gratis_desde}`:null },
                      { icon:Store,      color:C.greenDark, label:"Recojo Tienda",costo:"GRATIS",                                                                            tiempo:config.envios.horario_recojo||"Coordinar", tag:config.envios.recojo_tienda?"Activo":"Deshabilitado" },
                    ].map(({icon:Icon,color,label,costo,tiempo,tag})=>(
                      <div key={label} style={{ padding:"14px", borderRadius:12, background:C.gray50, border:`1px solid ${C.gray200}`, display:"flex", flexDirection:"column", gap:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:30, height:30, borderRadius:9, background:`${color}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Icon size={15} style={{ color }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:800, color:C.gray900 }}>{label}</span>
                        </div>
                        <p style={{ fontSize:20, fontWeight:900, color, margin:0 }}>{costo}</p>
                        <p style={{ fontSize:11, color:C.gray400, margin:0 }}>{tiempo}</p>
                        {tag&&<span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:10, background:`${color}12`, color, border:`1px solid ${color}25`, alignSelf:"flex-start" }}>{tag}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ══ CONTACTO ══ */}
            {section==="contacto"&&(
              <div style={card}>
                <SH icon={Phone} title="Contacto y Soporte" sub="WhatsApp, email y horarios de atención" color={C.orange}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <Field label="📱 WhatsApp Ventas"     value={config.contacto.whatsapp_ventas}  onChange={v=>set("contacto",{...config.contacto,whatsapp_ventas:v})}  ph="+51 925 903 712"/>
                  <Field label="🛠 WhatsApp Soporte"    value={config.contacto.whatsapp_soporte} onChange={v=>set("contacto",{...config.contacto,whatsapp_soporte:v})} ph="+51 925 903 712"/>
                  <Field label="✉️ Email de Pedidos"   value={config.contacto.email_pedidos}    onChange={v=>set("contacto",{...config.contacto,email_pedidos:v})}    ph="pedidos@mundomovil.com" type="email"/>
                  <Field label="🕒 Horario de Atención" value={config.contacto.horario}          onChange={v=>set("contacto",{...config.contacto,horario:v})}          ph="Lun-Vie 9am-6pm"/>
                </div>
                {config.contacto.whatsapp_ventas&&(
                  <div style={{ marginTop:16, padding:"12px 16px", borderRadius:12, background:C.greenBg, border:`1px solid ${C.green}30`, display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:"#25D366", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <MessageSquare size={18} color={C.white}/>
                    </div>
                    <div>
                      <p style={{ fontSize:12, fontWeight:800, color:C.greenDark, margin:0 }}>WhatsApp activo</p>
                      <p style={{ fontSize:12, fontFamily:"monospace", color:C.gray700, margin:"2px 0 0" }}>{config.contacto.whatsapp_ventas}</p>
                    </div>
                    <span style={{ marginLeft:"auto", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20, background:C.greenBg, color:C.greenDark, border:`1px solid ${C.green}30` }}>✓ Configurado</span>
                  </div>
                )}
              </div>
            )}

            {/* Guardar bottom */}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              {changed&&<span style={{ fontSize:11, color:C.gray400, display:"flex", alignItems:"center", gap:4 }}><AlertCircle size={12}/> Cambios sin guardar</span>}
              <button onClick={guardar} disabled={saving}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 24px", borderRadius:12, fontSize:12, fontWeight:800, border:"none", background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`, color:C.white, cursor:"pointer", opacity:saving?0.6:1, boxShadow:`0 4px 14px ${C.purple}40` }}>
                {saving?<RefreshCcw size={14} style={{ animation:"spin .75s linear infinite" }}/>:<Save size={14}/>}
                {saving?"Guardando...":"Guardar configuración"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:.3; } }
      `}</style>
    </>
  );
}