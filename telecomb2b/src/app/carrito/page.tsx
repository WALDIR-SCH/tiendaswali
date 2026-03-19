"use client";
// src/app/carrito/page.tsx

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { db, auth } from "@/lib/firebase";
import {
  collection, addDoc, serverTimestamp, doc, updateDoc,
  increment, getDoc, onSnapshot
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  CreditCard, Landmark, ShieldCheck, Plus, Minus, Trash2,
  ChevronLeft, Lock, PackageCheck, Truck, CheckCircle2,
  Loader2, ShoppingBag, ArrowRight, Percent,
  Building, FileText, Mail, Check, FileSignature,
  Calculator, Award, Receipt, Eye, EyeOff, Target, Package,
  Box, User, UploadCloud, ImageIcon,
  XCircle, AlertCircle, MapPin, MessageSquare, Store,
  Navigation, Gift, Sparkles
} from "lucide-react";

/* ── PALETA ─────────────────────────────────────────────────── */
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
} as const;

/* ── GEO PERÚ ────────────────────────────────────────────────── */
const DISTRITOS_LIMA: string[] = [
  "Ate","Barranco","Breña","Carabayllo","Chaclacayo","Chorrillos","Cieneguilla",
  "Comas","El Agustino","Independencia","Jesús María","La Molina","La Victoria",
  "Lince","Los Olivos","Lurigancho","Lurín","Magdalena del Mar","Miraflores",
  "Pachacámac","Pucusana","Pueblo Libre","Puente Piedra","Punta Hermosa",
  "Punta Negra","Rímac","San Bartolo","San Borja","San Isidro","San Juan de Lurigancho",
  "San Juan de Miraflores","San Luis","San Martín de Porres","San Miguel",
  "Santa Anita","Santa María del Mar","Santa Rosa","Santiago de Surco","Surquillo",
  "Villa El Salvador","Villa María del Triunfo","Cercado de Lima",
];

const REGIONES_PERU: Record<string,string[]> = {
  "Amazonas":["Chachapoyas","Bagua","Bongará","Condorcanqui","Luya","Rodríguez de Mendoza","Utcubamba"],
  "Áncash":["Huaraz","Aija","Antonio Raymondi","Asunción","Bolognesi","Carhuaz","Carlos F. Fitzcarrald","Casma","Corongo","Huari","Huarmey","Huaylas","Mariscal Luzuriaga","Ocros","Pallasca","Pomabamba","Recuay","Santa","Sihuas","Yungay"],
  "Apurímac":["Abancay","Andahuaylas","Antabamba","Aymaraes","Chincheros","Cotabambas","Grau"],
  "Arequipa":["Arequipa","Camaná","Caravelí","Castilla","Caylloma","Condesuyos","Islay","La Unión"],
  "Ayacucho":["Huamanga","Cangallo","Huanca Sancos","Huanta","La Mar","Lucanas","Parinacochas","Páucar del Sara Sara","Sucre","Víctor Fajardo","Vilcas Huamán"],
  "Cajamarca":["Cajamarca","Cajabamba","Celendín","Chota","Contumazá","Cutervo","Hualgayoc","Jaén","San Ignacio","San Marcos","San Miguel","San Pablo","Santa Cruz"],
  "Callao":["Callao","Bellavista","Carmen de La Legua Reynoso","La Perla","La Punta","Mi Perú","Ventanilla"],
  "Cusco":["Cusco","Acomayo","Anta","Calca","Canas","Canchis","Chumbivilcas","Espinar","La Convención","Paruro","Paucartambo","Quispicanchi","Urubamba"],
  "Huancavelica":["Huancavelica","Acobamba","Angaraes","Castrovirreyna","Churcampa","Huaytará","Tayacaja"],
  "Huánuco":["Huánuco","Ambo","Dos de Mayo","Huacaybamba","Huamalíes","Leoncio Prado","Marañón","Pachitea","Puerto Inca","Lauricocha","Yarowilca"],
  "Ica":["Ica","Chincha","Nasca","Palpa","Pisco"],
  "Junín":["Huancayo","Chanchamayo","Chupaca","Concepción","Jauja","Junín","Satipo","Tarma","Yauli"],
  "La Libertad":["Trujillo","Ascope","Bolívar","Chepén","Gran Chimú","Julcán","Otuzco","Pacasmayo","Pataz","Sánchez Carrión","Santiago de Chuco","Virú"],
  "Lambayeque":["Chiclayo","Ferreñafe","Lambayeque"],
  "Lima":DISTRITOS_LIMA,
  "Lima Provincias":["Barranca","Cajatambo","Canta","Cañete","Huaral","Huarochirí","Huaura","Oyón","Yauyos"],
  "Loreto":["Iquitos","Alto Amazonas","Datem del Marañón","Loreto","Mariscal Ramón Castilla","Maynas","Putumayo","Requena","Ucayali"],
  "Madre de Dios":["Puerto Maldonado","Manu","Tahuamanu","Tambopata"],
  "Moquegua":["Moquegua","General Sánchez Cerro","Ilo","Mariscal Nieto"],
  "Pasco":["Cerro de Pasco","Daniel Alcides Carrión","Oxapampa"],
  "Piura":["Piura","Ayabaca","Huancabamba","Morropón","Paita","Sechura","Sullana","Talara"],
  "Puno":["Puno","Azángaro","Carabaya","Chucuito","El Collao","Huancané","Lampa","Melgar","Moho","San Antonio de Putina","San Román","Sandia","Yunguyo"],
  "San Martín":["Tarapoto","Bellavista","El Dorado","Huallaga","Lamas","Mariscal Cáceres","Moyobamba","Picota","Rioja","San Martín","Tocache"],
  "Tacna":["Tacna","Candarave","Jorge Basadre","Tarata"],
  "Tumbes":["Tumbes","Contralmirante Villar","Zarumilla"],
  "Ucayali":["Pucallpa","Atalaya","Coronel Portillo","Padre Abad","Purús"],
};
const REGIONES_LIST = Object.keys(REGIONES_PERU).sort();

/* ── TIPOS ───────────────────────────────────────────────────── */
interface BancoData { cuenta:string; cci:string; titular:string; activo:boolean; }
interface ConfigBancos { bcp:BancoData; bbva:BancoData; interbank:BancoData; scotiabank:BancoData; }
type BancoId = keyof ConfigBancos;
type ModoEnvio = "lima"|"provincia"|"recojo";

const BANCO_COLORS: Record<BancoId,string> = { bcp:"#E30613", bbva:"#004481", interbank:"#00A651", scotiabank:"#D52B1E" };
const BANCO_NOMBRES: Record<BancoId,string> = { bcp:"BCP", bbva:"BBVA", interbank:"Interbank", scotiabank:"Scotiabank" };

function BancoLogo({ id, size=44 }: { id:BancoId; size?:number }) {
  const [err,setErr] = useState(false);
  const color=BANCO_COLORS[id]; const abbr={bcp:"BCP",bbva:"BBVA",interbank:"IBK",scotiabank:"SCO"}[id];
  if (err) return <div style={{ width:size,height:size,borderRadius:Math.round(size*.22),flexShrink:0,background:color,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:Math.round(size*.27),fontWeight:900,color:"#fff",fontFamily:"Arial,sans-serif" }}>{abbr}</span></div>;
  return <div style={{ width:size,height:size,borderRadius:Math.round(size*.22),overflow:"hidden",flexShrink:0,background:"#fff",border:`1.5px solid #E5E7EB`,boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}><img src={`/images/bancos/${id}.png`} alt={BANCO_NOMBRES[id]} onError={()=>setErr(true)} style={{ width:"100%",height:"100%",objectFit:"contain" }}/></div>;
}

const fmt = (n:number) => n.toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2});
const simulatePayment = async (amount:number,method:string) => new Promise(r=>setTimeout(()=>r({success:true,transactionId:`TRX-${Date.now()}-${Math.random().toString(36).substr(2,8)}`,amount,method,timestamp:new Date().toISOString()}),2000));

/* ── FIELD ─────────────────────────────────────────────────── */
function Field({ label,name,value,onChange,placeholder,type="text",required=false,readOnly=false,autoFilled=false }:{
  label:string;name:string;value:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;
  placeholder?:string;type?:string;required?:boolean;readOnly?:boolean;autoFilled?:boolean;
}) {
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5 }}>
        <label style={{ fontSize:12,fontWeight:700,color:C.gray600 }}>{label}{required&&<span style={{ color:C.orange }}> *</span>}</label>
        {autoFilled&&!readOnly&&<span style={{ fontSize:9,fontWeight:800,color:C.greenDark,background:`${C.green}15`,padding:"1px 6px",borderRadius:6,border:`1px solid ${C.green}30` }}>✓ Auto</span>}
      </div>
      <div style={{ position:"relative" }}>
        <input name={name} value={value} onChange={onChange} placeholder={placeholder} type={type} readOnly={readOnly}
          style={{ width:"100%",padding:"10px 14px",paddingRight:autoFilled&&!readOnly?36:14,borderRadius:11,border:`1.5px solid ${autoFilled&&!readOnly?`${C.greenDark}50`:C.gray200}`,fontSize:13,outline:"none",color:C.gray900,background:readOnly?C.gray100:autoFilled?`${C.green}06`:C.white,transition:"border-color .2s",boxSizing:"border-box" as any }}
          onFocus={e=>{ if(!readOnly){e.target.style.borderColor=C.purple;e.target.style.boxShadow=`0 0 0 3px ${C.purple}15`;} }}
          onBlur={e=>{ e.target.style.borderColor=autoFilled&&!readOnly?`${C.greenDark}50`:C.gray200;e.target.style.boxShadow="none"; }}/>
        {autoFilled&&!readOnly&&value&&<CheckCircle2 size={14} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:C.greenDark,pointerEvents:"none" }}/>}
      </div>
    </div>
  );
}

/* ── SELECT ────────────────────────────────────────────────── */
function SelectField({ label,value,onChange,options,required,placeholder }:{
  label:string;value:string;onChange:(v:string)=>void;options:string[];required?:boolean;placeholder?:string;
}) {
  return (
    <div>
      <label style={{ fontSize:12,fontWeight:700,color:C.gray600,display:"block",marginBottom:5 }}>{label}{required&&<span style={{ color:C.orange }}> *</span>}</label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%",padding:"10px 14px",borderRadius:11,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",color:value?C.gray900:C.gray400,background:C.white,cursor:"pointer",boxSizing:"border-box" as any,appearance:"none" as any,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center",paddingRight:36 }}
        onFocus={e=>{ e.currentTarget.style.borderColor=C.purple;e.currentTarget.style.boxShadow=`0 0 0 3px ${C.purple}15`; }}
        onBlur={e=>{ e.currentTarget.style.borderColor=C.gray200;e.currentTarget.style.boxShadow="none"; }}>
        <option value="">{placeholder||"Seleccionar..."}</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BARRA DE PROGRESO ENVÍO GRATIS
══════════════════════════════════════════════════════════════ */
function EnvioGratisBar({ subtotal, gratis_desde, costo, modo }: {
  subtotal:number; gratis_desde:number; costo:number; modo:ModoEnvio;
}) {
  if (gratis_desde<=0 || modo==="recojo") return null;

  const faltante = Math.max(0, gratis_desde - subtotal);
  const pct      = Math.min(100, (subtotal / gratis_desde) * 100);
  const yaGratis = subtotal >= gratis_desde;
  const modoLabel = modo==="lima" ? "Lima" : "provincias";

  return (
    <div style={{
      padding:"14px 16px", borderRadius:14,
      background: yaGratis ? `${C.greenDark}08` : `${C.purple}06`,
      border:`1.5px solid ${yaGratis ? `${C.greenDark}30` : `${C.purple}20`}`,
      transition:"all .3s",
    }}>
      {yaGratis ? (
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:10,background:C.greenDark,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 4px 12px ${C.greenDark}40` }}>
            <Gift size={17} color={C.white}/>
          </div>
          <div>
            <p style={{ fontSize:13,fontWeight:900,color:C.greenDark,margin:0 }}>🎉 ¡Envío GRATIS desbloqueado!</p>
            <p style={{ fontSize:11,color:C.greenDark,margin:"2px 0 0",opacity:.8 }}>Tu pedido califica para envío gratis a {modoLabel}</p>
          </div>
          <span style={{ marginLeft:"auto",fontSize:12,fontWeight:900,color:C.greenDark,background:C.white,padding:"4px 12px",borderRadius:20,border:`1px solid ${C.greenDark}30`,flexShrink:0 }}>GRATIS</span>
        </div>
      ) : (
        <div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <Truck size={14} style={{ color:C.purple }}/>
              <p style={{ fontSize:12,fontWeight:700,color:C.gray700,margin:0 }}>
                Agrega <strong style={{ color:C.purple }}>S/ {fmt(faltante)}</strong> más y desbloquea envío gratis a {modoLabel}
              </p>
            </div>
            <span style={{ fontSize:11,fontWeight:800,color:C.purple,flexShrink:0,marginLeft:12 }}>{Math.round(pct)}%</span>
          </div>
          {/* Barra de progreso */}
          <div style={{ height:8,borderRadius:8,background:C.gray200,overflow:"hidden",position:"relative" }}>
            <div style={{
              height:"100%", borderRadius:8,
              width:`${pct}%`,
              background:`linear-gradient(90deg, ${C.purple}, ${C.purpleLight})`,
              boxShadow:`0 0 10px ${C.purple}50`,
              transition:"width .5s cubic-bezier(.4,0,.2,1)",
              position:"relative",
            }}>
              {pct>10&&<div style={{ position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",width:14,height:14,borderRadius:"50%",background:C.purpleLight,border:`2px solid ${C.white}`,boxShadow:`0 0 8px ${C.purple}` }}/>}
            </div>
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",marginTop:6 }}>
            <span style={{ fontSize:10,color:C.gray400 }}>S/ {fmt(subtotal)}</span>
            <span style={{ fontSize:10,color:C.purple,fontWeight:700 }}>🎁 Gratis desde S/ {fmt(gratis_desde)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function CarritoPage() {
  const { carrito, total, actualizarCantidad, eliminarDelCarrito, vaciarCarrito } = useCart();
  const router = useRouter();

  const [metodoPago,       setMetodoPago]       = useState<"transferencia"|"tarjeta">("transferencia");
  const [bancoSel,         setBancoSel]         = useState<BancoId>("bcp");
  const [modoEnvio,        setModoEnvio]        = useState<ModoEnvio>("lima");
  const [configBancos,     setConfigBancos]     = useState<ConfigBancos|null>(null);
  const [configEnvio,      setConfigEnvio]      = useState<any>(null);
  const [configContacto,   setConfigContacto]   = useState<any>(null);
  const [loadingConfig,    setLoadingConfig]    = useState(true);
  const [loading,          setLoading]          = useState(false);
  const [loadingUser,      setLoadingUser]      = useState(true);
  const [showModal,        setShowModal]        = useState(false);
  const [step,             setStep]             = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderDetails,     setOrderDetails]     = useState<any>(null);
  const [showCardDetails,  setShowCardDetails]  = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [constanciaFile,   setConstanciaFile]   = useState<File|null>(null);
  const [constanciaPreview,setConstanciaPreview]= useState("");
  const [constanciaUrl,    setConstanciaUrl]    = useState("");
  const [subiendoConst,    setSubiendoConst]    = useState(false);
  const [pedidoIdGuardado, setPedidoIdGuardado] = useState("");

  const [envio, setEnvio] = useState({
    ruc:"",razonSocial:"",contacto:"",email:"",
    telefono:"",direccion:"",referencia:"",region:"",distrito:"",
  });
  const [cardDetails,setCardDetails] = useState({ cardNumber:"",expiry:"",cvv:"",cardholder:"" });

  /* ── Firestore en tiempo real ── */
  useEffect(()=>{
    const unsub = onSnapshot(doc(db,"ajustes","global"), snap=>{
      if (snap.exists()) {
        const d=snap.data();
        if (d.bancos) { setConfigBancos(d.bancos); const act=(Object.entries(d.bancos as ConfigBancos) as [BancoId,BancoData][]).filter(([,b])=>b.activo); if(act.length>0&&!act.find(([id])=>id===bancoSel))setBancoSel(act[0][0]); }
        if (d.envios)   setConfigEnvio(d.envios);
        if (d.contacto) setConfigContacto(d.contacto);
      }
      setLoadingConfig(false);
    }, ()=>setLoadingConfig(false));
    return ()=>unsub();
  },[]);

  /* ── Auth + autocompletar ── */
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async u=>{
      if (!u) { setLoadingUser(false); return; }
      const af=new Set<string>(); const up:Partial<typeof envio>={};
      if(u.email){up.email=u.email;af.add("email");}
      if(u.displayName){up.contacto=u.displayName;af.add("contacto");}
      try {
        const snap=await getDoc(doc(db,"usuarios",u.uid));
        if(snap.exists()){
          const d=snap.data();
          const fields:[keyof typeof envio,string][]=[["ruc",d.ruc||""],[  "razonSocial",d.razonSocial||""],["contacto",d.nombre||""],["telefono",d.telefono||""],["direccion",d.direccionFiscal||""],["region",d.region||""],["distrito",d.distrito||""],["email",d.email||u.email||""]];
          fields.forEach(([k,v])=>{ if(v){(up as any)[k]=v;af.add(k);} });
        }
      } catch {}
      setEnvio(p=>({...p,...up})); setAutoFilledFields(af); setLoadingUser(false);
    });
    return ()=>unsub();
  },[]);

  /* ── Subir constancia ── */
  const subirConstancia = async (file:File):Promise<string>=>{
    const cn=process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, up=process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if(!cn||!up) throw new Error("Cloudinary no configurado");
    const fd=new FormData(); fd.append("file",file); fd.append("upload_preset",up); fd.append("folder","constancias_pago");
    const r=await fetch(`https://api.cloudinary.com/v1_1/${cn}/upload`,{method:"POST",body:fd});
    const d=await r.json(); if(!d.secure_url) throw new Error("Error subiendo"); return d.secure_url;
  };

  const handleConstanciaChange = async (e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(!["image/png","image/jpeg","image/jpg","application/pdf"].includes(file.type)){alert("Solo PNG, JPG o PDF");return;}
    if(file.size>5*1024*1024){alert("Máximo 5MB");return;}
    setConstanciaFile(file);
    if(file.type!=="application/pdf"){const r=new FileReader();r.onloadend=()=>setConstanciaPreview(r.result as string);r.readAsDataURL(file);}else{setConstanciaPreview("pdf");}
    setSubiendoConst(true);
    try { const url=await subirConstancia(file); setConstanciaUrl(url); if(pedidoIdGuardado)await updateDoc(doc(db,"pedidos",pedidoIdGuardado),{comprobanteUrl:url,estado:"PAGADO",fechaActualizacion:serverTimestamp()}); }
    catch { alert("Error al subir."); setConstanciaFile(null); setConstanciaPreview(""); setConstanciaUrl(""); }
    finally { setSubiendoConst(false); }
  };

  /* ── Cálculos con envío gratis ── */
  const totalItems     = carrito.reduce((a,i)=>a+i.cantidad,0);
  const descuento      = totalItems>=100?.20:totalItems>=50?.15:totalItems>=20?.10:totalItems>=10?.05:0;
  const subtotal       = total;
  const descuentoMonto = subtotal*descuento;
  const baseImponible  = subtotal-descuentoMonto;
  const igv            = baseImponible*.18;

  const costoEnvio = (()=>{
    if (carrito.length===0||modoEnvio==="recojo") return 0;
    if (modoEnvio==="lima") {
      const gd=configEnvio?.lima?.gratis_desde??0;
      if (gd>0&&subtotal>=gd) return 0;
      return configEnvio?.lima?.costo??15;
    }
    // provincia
    const gd=configEnvio?.provincia?.gratis_desde??0;
    if (gd>0&&subtotal>=gd) return 0;
    return configEnvio?.provincia?.costo??35;
  })();

  const tiempoEnvio = modoEnvio==="lima"?(configEnvio?.lima?.tiempo||"24-48h hábiles"):modoEnvio==="provincia"?(configEnvio?.provincia?.tiempo||"3-5 días hábiles"):"Retiro en tienda";
  const totalFinal  = baseImponible+igv+costoEnvio;
  const distritosDisponibles = envio.region?(REGIONES_PERU[envio.region]||[]):[];

  // Datos para barra gratis según modo activo
  const gratisDesdeActivo = modoEnvio==="lima"?(configEnvio?.lima?.gratis_desde??0):modoEnvio==="provincia"?(configEnvio?.provincia?.gratis_desde??0):0;

  /* ── Finalizar pedido ── */
  const handleFinalizarPedido = async ()=>{
    const u=auth.currentUser;
    if(!u){router.push("/login?redirect=/carrito");return;}
    if(!envio.ruc||envio.ruc.length!==11){alert("RUC inválido (11 dígitos)");return;}
    if(!envio.razonSocial){alert("Ingresa la Razón Social");return;}
    if(carrito.length===0){alert("Carrito vacío");return;}
    if(modoEnvio!=="recojo"&&!envio.region){alert("Selecciona tu región");return;}
    if(modoEnvio!=="recojo"&&!envio.distrito){alert("Selecciona tu distrito");return;}
    if(modoEnvio!=="recojo"&&!envio.direccion){alert("Ingresa tu dirección de entrega");return;}
    if(metodoPago==="transferencia"&&!constanciaUrl){alert("Debes subir la constancia de pago");return;}

    setLoading(true);setShowModal(true);setStep(1);
    const itemsCopia=[...carrito]; const bancoData=configBancos?.[bancoSel];
    try {
      setTimeout(()=>setStep(2),1500);
      setTimeout(async()=>{
        setStep(3);
        try {
          const payRes:any=await simulatePayment(totalFinal,metodoPago);
          if(payRes.success){
            setStep(4);
            const docRef=await addDoc(collection(db,"pedidos"),{
              clienteId:u.uid,clienteEmail:envio.email||u.email||"",clienteNombre:envio.razonSocial||envio.contacto||"",clienteRut:envio.ruc,clienteTelefono:envio.telefono||"",
              clienteDireccion:modoEnvio==="recojo"?"RECOJO EN TIENDA":`${envio.direccion}, ${envio.distrito}, ${envio.region}`,
              fecha:serverTimestamp(),estado:"Pendiente",metodoPago:metodoPago==="tarjeta"?"Tarjeta":"Transferencia",modoEnvio,
              banco:bancoData?BANCO_NOMBRES[bancoSel]:bancoSel,cuentaBanco:bancoData?.cuenta||"",
              total:Number(totalFinal.toFixed(2)),costoEnvio,tiempoEnvio,
              datosEnvio:{ruc:envio.ruc,razonSocial:envio.razonSocial,contacto:envio.contacto,email:envio.email,telefono:envio.telefono,direccion:modoEnvio==="recojo"?"RECOJO EN TIENDA":envio.direccion,region:envio.region,distrito:envio.distrito,referencia:envio.referencia,modoEnvio},
              items:itemsCopia.map(i=>({id:i.id,idOriginal:i.idOriginal||i.id,nombre:i.nombre||"Producto",sku:i.sku||"",precioBase:Number(i.precioBase)||0,precio:Number(i.precioBase)||0,cantidad:Number(i.cantidad)||1,imagen_principal:i.imagen_principal||i.imagenUrl||"",imagenUrl:i.imagenUrl||i.imagen_principal||"",tipoCompra:i.tipoCompra||"caja",unidadesPorCaja:i.unidadesPorCaja||10})),
              archived:false,comprobanteUrl:constanciaUrl||null,trackingNumber:null,
              nota:`Pedido B2B · RUC: ${envio.ruc} · Envío: ${modoEnvio}`,notaInterna:`Método: ${metodoPago}|Banco:${BANCO_NOMBRES[bancoSel]}|TRX:${payRes.transactionId}`,
              fechaActualizacion:serverTimestamp(),historialEstados:[{estado:"Pendiente",fecha:new Date().toISOString(),usuario:u.email||"sistema",nota:"Pedido creado"}],
            });
            for(const item of itemsCopia){try{const idO=item.idOriginal||item.id.replace(/-caja$|-unidad$/,"");await updateDoc(doc(db,"productos",idO),{stock_cajas:item.tipoCompra==="caja"?increment(-item.cantidad):increment(0),stock_unidades:item.tipoCompra==="unidad"?increment(-item.cantidad):increment(0)});}catch{}}
            if(constanciaUrl)await updateDoc(doc(db,"pedidos",docRef.id),{comprobanteUrl:constanciaUrl,estado:"PAGADO"}).catch(()=>{});
            setPedidoIdGuardado(docRef.id);
            setOrderDetails({id:docRef.id,total:totalFinal,items:itemsCopia,paymentId:payRes.transactionId,ruc:envio.ruc,razonSocial:envio.razonSocial,esTransferencia:metodoPago==="transferencia",banco:BANCO_NOMBRES[bancoSel],modoEnvio,tiempoEnvio});
            vaciarCarrito(); setStep(5);
            setTimeout(()=>{setShowModal(false);setShowConfirmation(true);},1500);
          }
        } catch(e){console.error(e);setShowModal(false);setLoading(false);alert("Error en el pago.");}
      },3000);
    } catch(e){console.error(e);setShowModal(false);setLoading(false);alert("Error.");}
  };

  const bancosActivos = configBancos?(Object.entries(configBancos) as [BancoId,BancoData][]).filter(([,b])=>b.activo&&b.cuenta):[];

  const STEPS_MODAL=[
    {step:1,title:"Validando Stock",desc:"Verificación en almacén",icon:PackageCheck},
    {step:2,title:"Validación RUC",desc:"Verificando en SUNAT",icon:FileText},
    {step:3,title:"Procesando Pago",desc:"Autorización bancaria",icon:CreditCard},
    {step:4,title:"Generando Pedido",desc:"Creación en sistema",icon:FileSignature},
    {step:5,title:"Confirmado",desc:"Generando Factura Electrónica",icon:Receipt},
  ];

  const btnDisabled = loading||carrito.length===0||!envio.ruc||envio.ruc.length!==11
    ||(modoEnvio!=="recojo"&&(!envio.region||!envio.distrito||!envio.direccion))
    ||(metodoPago==="transferencia"&&!constanciaUrl);

  const btnLabel = loading?"Procesando..."
    :carrito.length===0?"Agrega productos al carrito"
    :!envio.ruc||envio.ruc.length!==11?"RUC inválido (11 dígitos)"
    :modoEnvio!=="recojo"&&!envio.region?"Selecciona tu región"
    :modoEnvio!=="recojo"&&!envio.distrito?"Selecciona tu distrito/provincia"
    :modoEnvio!=="recojo"&&!envio.direccion?"Ingresa tu dirección de entrega"
    :metodoPago==="transferencia"&&!constanciaUrl?"Sube la constancia de pago"
    :null;

  /* ════════ RENDER ════════ */
  return (
    <div style={{ minHeight:"100vh",background:C.white,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes pulse     { 0%,100%{opacity:1}50%{opacity:.5} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:.3} }
        @keyframes shimmer   { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        select option { color:#111827; }
        @media(min-width:1024px){ .checkout-grid{grid-template-columns:1fr 420px!important;} }
      `}</style>

      {/* Modal procesamiento */}
      {showModal&&(
        <div style={{ position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)" }}>
          <div style={{ width:"100%",maxWidth:440,borderRadius:22,padding:32,background:C.white,boxShadow:"0 24px 80px rgba(0,0,0,0.25)",display:"flex",flexDirection:"column",gap:20 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ width:64,height:64,borderRadius:"50%",background:`${C.purple}15`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                <Building size={28} style={{ color:C.purple }}/>
              </div>
              <h2 style={{ fontSize:18,fontWeight:900,color:C.gray900,margin:"0 0 4px" }}>Procesando Orden</h2>
              <p style={{ fontSize:13,color:C.gray500,margin:0 }}>Verificando datos y procesando pago</p>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {STEPS_MODAL.map(({step:s,title,desc,icon:Icon})=>(
                <div key={s} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:12,background:step>=s?`${C.purple}08`:C.gray100,border:`1px solid ${step>=s?`${C.purple}25`:C.gray200}` }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:step>=s?C.purple:C.gray300,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    {step>s?<CheckCircle2 size={18} color={C.white}/>:step===s?<Loader2 size={18} color={C.white} style={{ animation:"spin .75s linear infinite" }}/>:<Icon size={18} color={C.white}/>}
                  </div>
                  <div style={{ flex:1 }}><p style={{ fontSize:13,fontWeight:700,color:C.gray900,margin:0 }}>{title}</p><p style={{ fontSize:11,color:C.gray500,margin:0 }}>{desc}</p></div>
                  {step===s&&<span style={{ fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:20,background:`${C.purple}15`,color:C.purple }}>Procesando</span>}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:C.gray500,marginBottom:6 }}><span>Progreso: {Math.round((step/5)*100)}%</span><span>Paso {step} de 5</span></div>
              <div style={{ width:"100%",height:7,borderRadius:4,background:C.gray200 }}>
                <div style={{ height:"100%",borderRadius:4,width:`${(step/5)*100}%`,background:`linear-gradient(90deg,${C.purple},${C.orange})`,transition:"width .5s ease" }}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación */}
      {showConfirmation&&orderDetails&&(
        <div style={{ position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)" }}>
          <div style={{ width:"100%",maxWidth:500,borderRadius:22,padding:32,background:C.white,boxShadow:"0 24px 80px rgba(0,0,0,0.25)",position:"relative",maxHeight:"90vh",overflowY:"auto" }}>
            <div style={{ position:"absolute",top:-20,right:-16,width:48,height:48,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${C.green}50` }}>
              <Check size={22} color="#000"/>
            </div>
            <div style={{ textAlign:"center",marginBottom:20 }}>
              <div style={{ width:80,height:80,borderRadius:"50%",background:`${C.green}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
                <CheckCircle2 size={38} style={{ color:C.greenDark }}/>
              </div>
              <h2 style={{ fontSize:22,fontWeight:900,color:C.gray900,margin:"0 0 6px" }}>¡Orden Confirmada!</h2>
              <p style={{ fontSize:13,color:C.gray500,margin:0 }}>Tu pedido fue procesado exitosamente</p>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginTop:12,padding:"6px 16px",borderRadius:20,background:C.gray100,border:`1px solid ${C.gray200}` }}>
                <span style={{ fontSize:12,fontFamily:"monospace",color:C.gray700 }}>#{orderDetails.id.substring(0,8).toUpperCase()}</span>
                <span style={{ fontSize:11,fontWeight:700,color:C.greenDark }}>· RUC: {orderDetails.ruc}</span>
              </div>
            </div>
            <div style={{ padding:"12px 16px",borderRadius:14,background:`${C.purple}06`,border:`1px solid ${C.purple}20`,marginBottom:16,display:"flex",alignItems:"center",gap:12 }}>
              {orderDetails.modoEnvio==="recojo"?<Store size={20} style={{ color:C.purple,flexShrink:0 }}/>:<Truck size={20} style={{ color:C.purple,flexShrink:0 }}/>}
              <div>
                <p style={{ fontSize:13,fontWeight:800,color:C.purple,margin:0 }}>{orderDetails.modoEnvio==="recojo"?"Recojo en tienda":orderDetails.modoEnvio==="lima"?"Envío Lima Metropolitana":"Envío a Provincias"}</p>
                <p style={{ fontSize:11,color:C.gray500,margin:"2px 0 0" }}>{orderDetails.tiempoEnvio} · {costoEnvio===0?"Gratis":`S/ ${fmt(costoEnvio)}`}</p>
              </div>
            </div>
            {orderDetails.esTransferencia&&!constanciaUrl&&(
              <div style={{ marginBottom:16,padding:"14px 16px",borderRadius:14,background:"#fffbeb",border:"1.5px solid #fde68a" }}>
                <p style={{ fontSize:13,fontWeight:800,color:"#92400e",margin:"0 0 8px",display:"flex",alignItems:"center",gap:6 }}><AlertCircle size={14} style={{ color:"#b45309" }}/> Sube tu constancia para agilizar</p>
                <label style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 14px",borderRadius:10,background:C.white,border:"1px solid #fde68a",cursor:"pointer" }}>
                  {subiendoConst?<><Loader2 size={14} style={{ color:C.purple,animation:"spin .75s linear infinite" }}/><span style={{ fontSize:12,color:C.purple,fontWeight:700 }}>Subiendo...</span></>:<><UploadCloud size={14} style={{ color:C.purple }}/><span style={{ fontSize:12,color:C.purple,fontWeight:700 }}>Subir constancia</span></>}
                  <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleConstanciaChange} style={{ display:"none" }}/>
                </label>
              </div>
            )}
            <div style={{ display:"flex",gap:12 }}>
              <button onClick={()=>{setShowConfirmation(false);router.push("/catalogo");}} style={{ flex:1,padding:"13px",borderRadius:12,background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,color:C.white,border:"none",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:`0 4px 16px ${C.purple}40` }}>Seguir comprando</button>
              <button onClick={()=>router.push("/opciones/pedidos")} style={{ flex:1,padding:"13px",borderRadius:12,background:C.white,color:C.gray700,border:`1.5px solid ${C.gray200}`,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}><Package size={15}/>Ver mis pedidos</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ position:"sticky",top:0,zIndex:40,background:C.white,borderBottom:`1px solid ${C.gray200}`,padding:"0 16px" }}>
        <div style={{ maxWidth:1280,margin:"0 auto",height:60,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <button onClick={()=>router.back()} style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:C.gray500,background:"none",border:"none",cursor:"pointer" }}>
            <ChevronLeft size={18}/><span>Continuar comprando</span>
          </button>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:C.greenDark,boxShadow:`0 0 6px ${C.greenDark}`,animation:"pulse 2s infinite",display:"inline-block" }}/>
            <span style={{ fontSize:11,fontWeight:700,color:C.greenDark }}>Perú · S/ PEN</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <ShoppingBag size={16} style={{ color:C.gray400 }}/>
            <span style={{ fontSize:12,fontWeight:700,color:C.gray600 }}>{carrito.length} producto{carrito.length!==1?"s":""}</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1280,margin:"0 auto",padding:"28px 16px" }}>
        <div className="checkout-grid" style={{ display:"grid",gridTemplateColumns:"1fr",gap:24 }}>

          {/* ══ IZQUIERDA ══ */}
          <div style={{ display:"flex",flexDirection:"column",gap:20 }}>

            {/* Banner autocompletado */}
            {!loadingUser&&autoFilledFields.size>0&&(
              <div style={{ padding:"12px 16px",borderRadius:14,background:`${C.green}10`,border:`1.5px solid ${C.green}35`,display:"flex",alignItems:"center",justifyContent:"space-between",animation:"slideDown .35s ease" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:34,height:34,borderRadius:10,background:`${C.greenDark}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><User size={16} style={{ color:C.greenDark }}/></div>
                  <div>
                    <p style={{ fontSize:13,fontWeight:800,color:C.greenDark,margin:0 }}>✓ Datos completados automáticamente</p>
                    <p style={{ fontSize:11,color:C.greenDark,margin:0,opacity:.8 }}>{autoFilledFields.size} campos desde tu cuenta · Puedes editarlos</p>
                  </div>
                </div>
                <div style={{ fontSize:18,fontWeight:900,color:C.greenDark,background:C.white,borderRadius:10,padding:"4px 10px",border:`1px solid ${C.green}30` }}>{autoFilledFields.size}</div>
              </div>
            )}

            {/* Datos facturación */}
            <section style={{ borderRadius:18,padding:24,border:`1px solid ${C.gray200}`,background:C.white,boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:22 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:`${C.purple}12`,display:"flex",alignItems:"center",justifyContent:"center" }}><Building size={19} style={{ color:C.purple }}/></div>
                <div style={{ flex:1 }}>
                  <h3 style={{ fontSize:15,fontWeight:900,color:C.gray900,margin:0 }}>Datos para Facturación</h3>
                  <p style={{ fontSize:12,color:C.gray500,margin:0 }}>RUC y Razón Social — Requerido SUNAT Perú</p>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:8,background:`${C.orange}08`,border:`1px solid ${C.orange}25` }}>
                  <Target size={11} style={{ color:C.orange }}/><span style={{ fontSize:11,fontWeight:800,color:C.orange }}>SUNAT</span>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                <Field label="RUC" name="ruc" value={envio.ruc} onChange={e=>{setEnvio({...envio,ruc:e.target.value});setAutoFilledFields(p=>{const n=new Set(p);n.delete("ruc");return n;})}} placeholder="20XXXXXXXXX" required autoFilled={autoFilledFields.has("ruc")}/>
                <div style={{ gridColumn:"1/-1" }}><Field label="Razón Social" name="razonSocial" value={envio.razonSocial} onChange={e=>{setEnvio({...envio,razonSocial:e.target.value});setAutoFilledFields(p=>{const n=new Set(p);n.delete("razonSocial");return n;})}} placeholder="EMPRESA SAC" required autoFilled={autoFilledFields.has("razonSocial")}/></div>
                <Field label="Contacto" name="contacto" value={envio.contacto} onChange={e=>setEnvio({...envio,contacto:e.target.value})} placeholder="Nombre del responsable" autoFilled={autoFilledFields.has("contacto")}/>
                <Field label="Email Facturación" name="email" value={envio.email} onChange={e=>setEnvio({...envio,email:e.target.value})} placeholder="facturacion@empresa.com" type="email" required autoFilled={autoFilledFields.has("email")}/>
                <Field label="Teléfono" name="telefono" value={envio.telefono} onChange={e=>setEnvio({...envio,telefono:e.target.value})} placeholder="+51 999 888 777" autoFilled={autoFilledFields.has("telefono")}/>
              </div>
            </section>

            {/* ════════════════════════════════════════════
                SECCIÓN ENTREGA — REDISEÑADA
            ════════════════════════════════════════════ */}
            <section style={{ borderRadius:18,border:`1px solid ${C.gray200}`,background:C.white,boxShadow:"0 2px 12px rgba(0,0,0,0.04)",overflow:"hidden" }}>

              {/* Header sección */}
              <div style={{ padding:"20px 24px 16px",borderBottom:`1px solid ${C.gray100}`,display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:`${C.greenDark}12`,display:"flex",alignItems:"center",justifyContent:"center" }}><Truck size={19} style={{ color:C.greenDark }}/></div>
                <div>
                  <h3 style={{ fontSize:15,fontWeight:900,color:C.gray900,margin:0 }}>Entrega del Pedido</h3>
                  <p style={{ fontSize:12,color:C.gray500,margin:0 }}>Selecciona cómo y dónde recibirás tu pedido</p>
                </div>
              </div>

              <div style={{ padding:"20px 24px" }}>

                {/* ── Selector 3 modos ── */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20 }}>
                  {([
                    {
                      id:"lima", icon:MapPin, label:"Lima Metropolitana",
                      precio: (()=>{ const gd=configEnvio?.lima?.gratis_desde??0; return gd>0&&subtotal>=gd?"GRATIS":`S/ ${configEnvio?.lima?.costo??15}`; })(),
                      sub: configEnvio?.lima?.tiempo||"24-48h hábiles",
                      promo: (configEnvio?.lima?.gratis_desde??0)>0 && subtotal<(configEnvio?.lima?.gratis_desde??0) ? `Gratis desde S/${configEnvio.lima.gratis_desde}` : null,
                      color:C.purple,
                    },
                    {
                      id:"provincia", icon:Navigation, label:"Provincias",
                      precio: (()=>{ const gd=configEnvio?.provincia?.gratis_desde??0; return gd>0&&subtotal>=gd?"GRATIS":`S/ ${configEnvio?.provincia?.costo??35}`; })(),
                      sub: configEnvio?.provincia?.tiempo||"3-5 días hábiles",
                      promo: (configEnvio?.provincia?.gratis_desde??0)>0 && subtotal<(configEnvio?.provincia?.gratis_desde??0) ? `Gratis desde S/${configEnvio.provincia.gratis_desde}` : null,
                      color:C.orange,
                    },
                    {
                      id:"recojo", icon:Store, label:"Recojo en Tienda",
                      precio:"GRATIS",
                      sub:"Sin costo · Coordina retiro",
                      promo:null,
                      color:C.greenDark,
                    },
                  ] as const).map(({id,icon:Icon,label,precio,sub,promo,color})=>(
                    <button key={id} onClick={()=>{ setModoEnvio(id as ModoEnvio); }}
                      style={{
                        padding:"14px 10px",borderRadius:16,cursor:"pointer",
                        border:`2px solid ${modoEnvio===id?color:C.gray200}`,
                        background:modoEnvio===id?`${color}08`:C.white,
                        transition:"all .22s",
                        boxShadow:modoEnvio===id?`0 6px 20px ${color}20`:"none",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:6,
                        position:"relative",
                      }}>
                      {/* Ícono */}
                      <div style={{ width:42,height:42,borderRadius:12,background:modoEnvio===id?color:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .22s",boxShadow:modoEnvio===id?`0 4px 12px ${color}40`:"none" }}>
                        <Icon size={20} style={{ color:modoEnvio===id?C.white:color }}/>
                      </div>
                      <p style={{ fontSize:11,fontWeight:800,color:modoEnvio===id?color:C.gray700,margin:0,textAlign:"center",lineHeight:1.2 }}>{label}</p>
                      {/* Precio */}
                      <p style={{ fontSize:precio==="GRATIS"?13:13,fontWeight:900,color:precio==="GRATIS"?C.greenDark:C.gray900,margin:0 }}>{precio}</p>
                      <p style={{ fontSize:10,color:C.gray400,margin:0,textAlign:"center",lineHeight:1.2 }}>{sub}</p>
                      {/* Promo tag */}
                      {promo&&<span style={{ fontSize:8,fontWeight:800,padding:"2px 7px",borderRadius:10,background:`${C.greenDark}12`,color:C.greenDark,display:"inline-block" }}>{promo}</span>}
                      {/* Check activo */}
                      {modoEnvio===id&&(
                        <div style={{ position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${C.white}`,boxShadow:`0 2px 8px ${color}50` }}>
                          <Check size={10} color={C.white} strokeWidth={3}/>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* ── BARRA PROGRESO ENVÍO GRATIS ── */}
                {modoEnvio!=="recojo" && gratisDesdeActivo>0 && (
                  <div style={{ marginBottom:16 }}>
                    <EnvioGratisBar
                      subtotal={subtotal}
                      gratis_desde={gratisDesdeActivo}
                      costo={modoEnvio==="lima"?(configEnvio?.lima?.costo??15):(configEnvio?.provincia?.costo??35)}
                      modo={modoEnvio}
                    />
                  </div>
                )}

                {/* ── INFO SEGÚN MODO ── */}
                {modoEnvio==="lima"&&(
                  <div style={{ padding:"12px 14px",borderRadius:12,background:`${C.purple}06`,border:`1px solid ${C.purple}18`,display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
                    <MapPin size={15} style={{ color:C.purple,flexShrink:0 }}/>
                    <p style={{ fontSize:11,color:C.gray600,margin:0 }}>
                      <strong style={{ color:C.purple }}>Lima Metropolitana</strong> — {configEnvio?.lima?.tiempo||"24-48h hábiles"} · {costoEnvio===0?<strong style={{ color:C.greenDark }}>Envío GRATIS aplicado 🎉</strong>:`Costo: S/ ${configEnvio?.lima?.costo??15}`}
                    </p>
                  </div>
                )}
                {modoEnvio==="provincia"&&(
                  <div style={{ padding:"12px 14px",borderRadius:12,background:`${C.orange}06`,border:`1px solid ${C.orange}18`,display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
                    <Navigation size={15} style={{ color:C.orange,flexShrink:0 }}/>
                    <p style={{ fontSize:11,color:C.gray600,margin:0 }}>
                      <strong style={{ color:C.orange }}>Envío Nacional</strong> — {configEnvio?.provincia?.tiempo||"3-5 días"} vía transportista · {costoEnvio===0?<strong style={{ color:C.greenDark }}>Envío GRATIS aplicado 🎉</strong>:`Costo: S/ ${configEnvio?.provincia?.costo??35}`}
                    </p>
                  </div>
                )}
                {modoEnvio==="recojo"&&(
                  <div style={{ padding:"14px 16px",borderRadius:12,background:`${C.greenDark}06`,border:`1.5px solid ${C.greenDark}20`,display:"flex",alignItems:"flex-start",gap:12,marginBottom:18 }}>
                    <div style={{ width:36,height:36,borderRadius:10,background:`${C.greenDark}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Store size={18} style={{ color:C.greenDark }}/></div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13,fontWeight:800,color:C.greenDark,margin:0 }}>Retiro sin costo en nuestra tienda</p>
                      {configEnvio?.direccion_almacen?(
                        <>
                          <p style={{ fontSize:12,color:C.gray700,margin:"4px 0 2px",fontWeight:600 }}>📍 {configEnvio.direccion_almacen}</p>
                          {configEnvio?.horario_recojo&&<p style={{ fontSize:11,color:C.gray400,margin:0 }}>🕒 {configEnvio.horario_recojo}</p>}
                        </>
                      ):<p style={{ fontSize:11,color:C.gray400,margin:"3px 0 0" }}>El administrador debe configurar la dirección.</p>}
                    </div>
                    <span style={{ fontSize:11,fontWeight:800,padding:"4px 12px",borderRadius:20,background:`${C.greenDark}15`,color:C.greenDark,border:`1px solid ${C.greenDark}30`,flexShrink:0 }}>GRATIS</span>
                  </div>
                )}

                {/* ── FORMULARIO DIRECCIÓN (solo si NO es recojo) ── */}
                {modoEnvio!=="recojo"&&(
                  <div style={{ display:"flex",flexDirection:"column",gap:14,paddingTop:4 }}>
                    <p style={{ fontSize:10,fontWeight:800,color:C.gray400,textTransform:"uppercase",letterSpacing:"0.14em",margin:0,display:"flex",alignItems:"center",gap:6 }}>
                      <MapPin size={11} style={{ color:C.gray400 }}/> Datos de entrega
                    </p>

                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                      {/* Lima: selector directo de distrito */}
                      {modoEnvio==="lima"&&(
                        <SelectField
                          label="Distrito *"
                          value={envio.distrito}
                          onChange={v=>setEnvio(p=>({...p,distrito:v,region:"Lima"}))}
                          options={DISTRITOS_LIMA}
                          required
                          placeholder="Seleccionar distrito"
                        />
                      )}

                      {/* Provincia: región → provincia en cascada */}
                      {modoEnvio==="provincia"&&(
                        <>
                          <SelectField
                            label="Región / Departamento *"
                            value={envio.region}
                            onChange={v=>setEnvio(p=>({...p,region:v,distrito:""}))}
                            options={REGIONES_LIST.filter(r=>r!=="Lima")}
                            required
                            placeholder="Seleccionar región"
                          />
                          <SelectField
                            label="Provincia / Ciudad *"
                            value={envio.distrito}
                            onChange={v=>setEnvio(p=>({...p,distrito:v}))}
                            options={distritosDisponibles}
                            required
                            placeholder={envio.region?"Seleccionar provincia":"Primero elige región"}
                          />
                        </>
                      )}
                    </div>

                    {/* Dirección */}
                    <Field label="Dirección de entrega *" name="direccion" value={envio.direccion}
                      onChange={e=>setEnvio({...envio,direccion:e.target.value})}
                      placeholder="Av. Principal 123, Urbanización, Manzana/Lote"
                      required autoFilled={autoFilledFields.has("direccion")}/>

                    <Field label="Referencia (opcional)" name="referencia" value={envio.referencia}
                      onChange={e=>setEnvio({...envio,referencia:e.target.value})}
                      placeholder="Piso, oficina, cerca de…"/>

                    {/* Resumen dirección completa */}
                    {((modoEnvio==="lima"&&envio.distrito)||(modoEnvio==="provincia"&&envio.region&&envio.distrito))&&envio.direccion&&(
                      <div style={{ padding:"11px 14px",borderRadius:12,background:C.gray50,border:`1px solid ${C.gray200}`,display:"flex",alignItems:"flex-start",gap:10 }}>
                        <MapPin size={15} style={{ color:C.purple,flexShrink:0,marginTop:1 }}/>
                        <div>
                          <p style={{ fontSize:12,fontWeight:700,color:C.gray900,margin:0 }}>
                            {envio.direccion}{envio.referencia&&`, ${envio.referencia}`}
                          </p>
                          <p style={{ fontSize:11,color:C.gray400,margin:"2px 0 0" }}>
                            {modoEnvio==="lima"?`${envio.distrito}, Lima Metropolitana`:`${envio.distrito}, ${envio.region}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Método de pago */}
            <section style={{ borderRadius:18,padding:24,border:`1px solid ${C.gray200}`,background:C.white,boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:`${C.greenDark}12`,display:"flex",alignItems:"center",justifyContent:"center" }}><CreditCard size={19} style={{ color:C.greenDark }}/></div>
                <div style={{ flex:1 }}>
                  <h3 style={{ fontSize:15,fontWeight:900,color:C.gray900,margin:0 }}>Método de Pago</h3>
                  <p style={{ fontSize:12,color:C.gray500,margin:0,display:"flex",alignItems:"center",gap:5 }}>
                    En tiempo real <span style={{ width:5,height:5,borderRadius:"50%",background:C.greenDark,display:"inline-block",animation:"pulse-dot 2s ease infinite" }}/>
                  </p>
                </div>
                <ShieldCheck size={17} style={{ color:C.greenDark }}/>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
                {([{id:"transferencia",icon:Landmark,label:"Transferencia Bancaria",sub:"Todos los bancos del Perú",color:C.greenDark},{id:"tarjeta",icon:CreditCard,label:"Tarjeta Débito/Crédito",sub:"Visa · Mastercard",color:C.purple}] as const).map(({id,icon:Icon,label,sub,color})=>(
                  <button key={id} onClick={()=>setMetodoPago(id)} style={{ padding:"14px 12px",borderRadius:14,border:`2px solid ${metodoPago===id?color:C.gray200}`,background:metodoPago===id?`${color}08`:C.white,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,transition:"all .2s" }}>
                    <Icon size={22} style={{ color:metodoPago===id?color:C.gray400 }}/>
                    <span style={{ fontSize:12,fontWeight:800,color:metodoPago===id?color:C.gray600,textAlign:"center" }}>{label}</span>
                    <span style={{ fontSize:10,color:C.gray400 }}>{sub}</span>
                  </button>
                ))}
              </div>

              {metodoPago==="transferencia"&&(
                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  {loadingConfig?(
                    <div style={{ display:"flex",alignItems:"center",gap:8,padding:"14px",borderRadius:12,background:C.gray50 }}>
                      <Loader2 size={16} style={{ color:C.purple,animation:"spin .75s linear infinite" }}/>
                      <span style={{ fontSize:12,color:C.gray500 }}>Cargando cuentas bancarias...</span>
                    </div>
                  ):bancosActivos.length===0?(
                    <div style={{ padding:"16px",borderRadius:12,background:`${C.orange}08`,border:`1px solid ${C.orange}25`,display:"flex",gap:10 }}>
                      <AlertCircle size={16} style={{ color:C.orange,marginTop:1 }}/>
                      <p style={{ fontSize:12,fontWeight:700,color:C.orange,margin:0 }}>Sin cuentas bancarias configuradas. El administrador debe configurarlas.</p>
                    </div>
                  ):(
                    <>
                      <div>
                        <label style={{ fontSize:11,fontWeight:700,color:C.gray500,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:10 }}>Selecciona el banco destino</label>
                        <div style={{ display:"grid",gridTemplateColumns:`repeat(${Math.min(bancosActivos.length,4)},1fr)`,gap:10 }}>
                          {bancosActivos.map(([id])=>(
                            <button key={id} onClick={()=>setBancoSel(id)} style={{ padding:"14px 10px",borderRadius:14,border:`2px solid ${bancoSel===id?BANCO_COLORS[id]:C.gray200}`,background:bancoSel===id?`${BANCO_COLORS[id]}10`:C.white,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,transition:"all .2s",boxShadow:bancoSel===id?`0 4px 16px ${BANCO_COLORS[id]}25`:"none" }}>
                              <BancoLogo id={id} size={44}/>
                              <span style={{ fontSize:12,fontWeight:800,color:bancoSel===id?BANCO_COLORS[id]:C.gray700 }}>{BANCO_NOMBRES[id]}</span>
                              {bancoSel===id&&<span style={{ width:6,height:6,borderRadius:"50%",background:BANCO_COLORS[id],boxShadow:`0 0 6px ${BANCO_COLORS[id]}` }}/>}
                            </button>
                          ))}
                        </div>
                      </div>
                      {configBancos&&configBancos[bancoSel]&&(
                        <div style={{ borderRadius:14,border:`1.5px solid ${BANCO_COLORS[bancoSel]}30`,overflow:"hidden" }}>
                          <div style={{ padding:"14px 16px",background:`${BANCO_COLORS[bancoSel]}08`,display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${BANCO_COLORS[bancoSel]}15` }}>
                            <BancoLogo id={bancoSel} size={36}/>
                            <div>
                              <p style={{ fontSize:14,fontWeight:900,color:C.gray900,margin:0 }}>Transferir al {BANCO_NOMBRES[bancoSel]}</p>
                              <p style={{ fontSize:10,color:C.gray400,margin:"2px 0 0",display:"flex",alignItems:"center",gap:4 }}>
                                <span style={{ width:4,height:4,borderRadius:"50%",background:C.greenDark,display:"inline-block",animation:"pulse-dot 2s ease infinite" }}/>
                                Datos en tiempo real
                              </p>
                            </div>
                          </div>
                          <div style={{ padding:16,background:C.white }}>
                            {configBancos[bancoSel].cuenta?(
                              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                                {[["Número de Cuenta",configBancos[bancoSel].cuenta],["CCI (Interbancario)",configBancos[bancoSel].cci],["Titular",configBancos[bancoSel].titular],["Moneda","Soles (PEN)"]].filter(([,v])=>v).map(([k,v])=>(
                                  <div key={k} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:9,background:C.gray50,border:`1px solid ${C.gray200}` }}>
                                    <span style={{ fontSize:12,color:C.gray500 }}>{k}:</span>
                                    <span style={{ fontSize:12,fontWeight:700,fontFamily:k!=="Titular"&&k!=="Moneda"?"monospace":"inherit",color:C.gray900 }}>{v}</span>
                                  </div>
                                ))}
                              </div>
                            ):<p style={{ fontSize:12,color:C.gray400,textAlign:"center",padding:"12px 0" }}>Cuenta no configurada</p>}
                          </div>
                        </div>
                      )}
                      {/* Subir constancia */}
                      <div style={{ borderRadius:14,padding:16,background:C.white,border:`2px dashed ${constanciaUrl?C.greenDark:C.gray300}`,transition:"border-color .2s" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                          <div style={{ width:32,height:32,borderRadius:9,background:constanciaUrl?`${C.greenDark}12`:`${C.purple}10`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                            {constanciaUrl?<CheckCircle2 size={16} style={{ color:C.greenDark }}/>:<UploadCloud size={16} style={{ color:C.purple }}/>}
                          </div>
                          <div>
                            <p style={{ fontSize:13,fontWeight:800,color:constanciaUrl?C.greenDark:C.gray900,margin:0 }}>{constanciaUrl?"✓ Constancia subida":"Subir constancia de pago *"}</p>
                            <p style={{ fontSize:11,color:C.gray500,margin:0 }}>{constanciaUrl?"El admin verificará tu pago pronto":"PNG, JPG o PDF · Máx. 5MB · Obligatorio"}</p>
                          </div>
                        </div>
                        {constanciaPreview&&(
                          <div style={{ marginBottom:12,position:"relative",display:"inline-block" }}>
                            {constanciaPreview==="pdf"?(
                              <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:C.gray50,border:`1px solid ${C.gray200}` }}>
                                <FileText size={24} style={{ color:C.purple }}/><div><p style={{ margin:0,fontSize:12,fontWeight:700,color:C.gray900 }}>{constanciaFile?.name}</p><p style={{ margin:0,fontSize:11,color:C.gray500 }}>{((constanciaFile?.size||0)/1024).toFixed(0)} KB</p></div>
                              </div>
                            ):<img src={constanciaPreview} alt="Constancia" style={{ maxHeight:160,maxWidth:"100%",borderRadius:10,objectFit:"contain",border:`1px solid ${C.gray200}` }}/>}
                            <button onClick={()=>{setConstanciaFile(null);setConstanciaPreview("");setConstanciaUrl("");}} style={{ position:"absolute",top:-8,right:-8,width:22,height:22,borderRadius:"50%",background:"#ef4444",border:"2px solid #fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                              <XCircle size={13} color="#fff"/>
                            </button>
                          </div>
                        )}
                        {subiendoConst&&<div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,background:`${C.purple}08`,marginBottom:10 }}><Loader2 size={14} style={{ color:C.purple,animation:"spin .75s linear infinite" }}/><span style={{ fontSize:12,color:C.purple,fontWeight:600 }}>Subiendo archivo...</span></div>}
                        {!constanciaFile&&(
                          <label style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 16px",borderRadius:10,background:`${C.purple}08`,border:`1px solid ${C.purple}25`,cursor:"pointer",transition:"background .2s" }}
                            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=`${C.purple}14`}
                            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=`${C.purple}08`}>
                            <ImageIcon size={15} style={{ color:C.purple }}/><span style={{ fontSize:13,fontWeight:700,color:C.purple }}>Seleccionar constancia</span>
                            <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleConstanciaChange} style={{ display:"none" }}/>
                          </label>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {metodoPago==="tarjeta"&&(
                <div style={{ borderRadius:12,padding:16,background:C.gray50,border:`1px solid ${C.gray200}` }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
                    <h4 style={{ fontSize:13,fontWeight:900,color:C.gray700,margin:0 }}>Datos de Tarjeta</h4>
                    <button onClick={()=>setShowCardDetails(!showCardDetails)} style={{ display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,color:C.purple,background:"none",border:"none",cursor:"pointer" }}>
                      {showCardDetails?<EyeOff size={13}/>:<Eye size={13}/>}{showCardDetails?"Ocultar":"Mostrar"}
                    </button>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={{ fontSize:11,fontWeight:700,color:C.gray500,textTransform:"uppercase",display:"block",marginBottom:5 }}>Número de Tarjeta</label>
                      <input value={cardDetails.cardNumber} onChange={e=>setCardDetails({...cardDetails,cardNumber:e.target.value})} placeholder="1234 5678 9012 3456" type={showCardDetails?"text":"password"} maxLength={19} style={{ width:"100%",padding:"10px 14px",borderRadius:11,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"monospace",boxSizing:"border-box" as any }} onFocus={e=>e.currentTarget.style.borderColor=C.purple} onBlur={e=>e.currentTarget.style.borderColor=C.gray200}/>
                    </div>
                    {[{label:"Válida hasta",key:"expiry",ph:"MM/AA",max:5},{label:"CVV",key:"cvv",ph:"123",max:3}].map(f=>(
                      <div key={f.key}>
                        <label style={{ fontSize:11,fontWeight:700,color:C.gray500,textTransform:"uppercase",display:"block",marginBottom:5 }}>{f.label}</label>
                        <input value={(cardDetails as any)[f.key]} onChange={e=>setCardDetails({...cardDetails,[f.key]:e.target.value})} placeholder={f.ph} type={showCardDetails?"text":"password"} maxLength={f.max} style={{ width:"100%",padding:"10px 14px",borderRadius:11,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"monospace",boxSizing:"border-box" as any }} onFocus={e=>e.currentTarget.style.borderColor=C.purple} onBlur={e=>e.currentTarget.style.borderColor=C.gray200}/>
                      </div>
                    ))}
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={{ fontSize:11,fontWeight:700,color:C.gray500,textTransform:"uppercase",display:"block",marginBottom:5 }}>Nombre del Titular</label>
                      <input value={cardDetails.cardholder} onChange={e=>setCardDetails({...cardDetails,cardholder:e.target.value})} placeholder="Como aparece en la tarjeta" style={{ width:"100%",padding:"10px 14px",borderRadius:11,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",boxSizing:"border-box" as any }} onFocus={e=>e.currentTarget.style.borderColor=C.purple} onBlur={e=>e.currentTarget.style.borderColor=C.gray200}/>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Productos */}
            <section style={{ borderRadius:18,padding:24,border:`1px solid ${C.gray200}`,background:C.white,boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:`${C.orange}12`,display:"flex",alignItems:"center",justifyContent:"center" }}><PackageCheck size={19} style={{ color:C.orange }}/></div>
                <h3 style={{ fontSize:15,fontWeight:900,color:C.gray900,margin:0 }}>Resumen · {carrito.length} producto{carrito.length!==1?"s":""}</h3>
              </div>
              {carrito.length===0?(
                <div style={{ textAlign:"center",padding:"48px 0" }}>
                  <div style={{ width:72,height:72,borderRadius:"50%",background:C.gray100,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}><ShoppingBag size={30} style={{ color:C.gray300 }}/></div>
                  <h4 style={{ fontSize:16,fontWeight:900,color:C.gray700,margin:"0 0 6px" }}>Carrito vacío</h4>
                  <button onClick={()=>router.push("/catalogo")} style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"11px 22px",borderRadius:12,background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,color:C.white,border:"none",fontSize:13,fontWeight:800,cursor:"pointer" }}><Package size={15}/>Ver Catálogo</button>
                </div>
              ):(
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {carrito.map(item=>{
                    const esCaja=item.tipoCompra==="caja"; const udsCaja=item.unidadesPorCaja||10;
                    return (
                      <div key={item.id} style={{ display:"flex",gap:12,padding:"14px 16px",borderRadius:14,background:C.gray50,border:`1px solid ${C.gray200}` }}>
                        <div style={{ width:68,height:68,borderRadius:12,background:C.white,border:`1px solid ${C.gray200}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",padding:6 }}>
                          <img src={item.imagenUrl||item.imagen_principal||""} alt={item.nombre} style={{ width:"100%",height:"100%",objectFit:"contain" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                          <div style={{ position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:C.purple,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:9,fontWeight:900,color:C.white }}>{item.cantidad}</span></div>
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4 }}>
                            <div style={{ flex:1,minWidth:0 }}>
                              <h4 style={{ fontSize:13,fontWeight:800,color:C.gray900,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.nombre||"Producto"}</h4>
                              <p style={{ fontSize:10,fontFamily:"monospace",color:C.gray400,margin:"2px 0 0" }}>SKU: {item.sku||item.id?.slice(0,8).toUpperCase()}</p>
                            </div>
                            <button onClick={()=>eliminarDelCarrito(item.id)} style={{ padding:6,borderRadius:8,background:"transparent",border:"none",cursor:"pointer",color:C.gray400,flexShrink:0,marginLeft:6 }}
                              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#ef4444";(e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.08)";}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=C.gray400;(e.currentTarget as HTMLElement).style.background="transparent";}}>
                              <Trash2 size={14}/>
                            </button>
                          </div>
                          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                            <span style={{ fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:6,background:esCaja?`${C.orange}15`:`${C.purple}15`,color:esCaja?C.orange:C.purple,display:"inline-flex",alignItems:"center",gap:4 }}>
                              {esCaja?<Package size={9}/>:<Box size={9}/>} Por {esCaja?"caja":"unidad"}
                            </span>
                            {esCaja&&<span style={{ fontSize:10,fontWeight:600,color:C.gray600 }}>{item.cantidad} caja{item.cantidad!==1?"s":""} × {udsCaja} uds = <strong style={{ color:C.purple }}>{item.cantidad*udsCaja} uds</strong></span>}
                          </div>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                            <div style={{ display:"flex",alignItems:"center",borderRadius:9,overflow:"hidden",border:`1px solid ${C.gray200}` }}>
                              <button onClick={()=>{const n=(item.cantidad||1)-1;if(n<=0)eliminarDelCarrito(item.id);else actualizarCantidad(item.id,n);}} style={{ width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",background:C.white,border:"none",cursor:"pointer",color:C.gray500 }}
                                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${C.purple}10`;(e.currentTarget as HTMLElement).style.color=C.purple;}}
                                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=C.white;(e.currentTarget as HTMLElement).style.color=C.gray500;}}>
                                <Minus size={12}/>
                              </button>
                              <span style={{ width:36,textAlign:"center",fontSize:13,fontWeight:900,color:C.gray900,background:C.gray100 }}>{item.cantidad}</span>
                              <button onClick={()=>actualizarCantidad(item.id,(item.cantidad||1)+1)} style={{ width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",background:C.white,border:"none",cursor:"pointer",color:C.gray500 }}
                                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${C.purple}10`;(e.currentTarget as HTMLElement).style.color=C.purple;}}
                                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=C.white;(e.currentTarget as HTMLElement).style.color=C.gray500;}}>
                                <Plus size={12}/>
                              </button>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <p style={{ fontSize:15,fontWeight:900,color:C.orange,margin:0 }}>S/ {fmt((item.precioBase||0)*item.cantidad)}</p>
                              <p style={{ fontSize:10,color:C.gray400,margin:0 }}>S/ {fmt(item.precioBase||0)} c/{esCaja?"caja":"ud"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ══ COLUMNA DERECHA ══ */}
          <div style={{ position:"sticky",top:76,alignSelf:"start",display:"flex",flexDirection:"column",gap:16 }}>

            {/* Resumen con barra gratis mini */}
            <div style={{ borderRadius:18,padding:22,border:`1px solid ${C.gray200}`,background:C.white,boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:18 }}>
                <Calculator size={17} style={{ color:C.purple }}/>
                <h3 style={{ fontSize:14,fontWeight:900,color:C.gray900,margin:0 }}>Resumen — IGV 18%</h3>
              </div>

              {/* Barra compacta en el resumen */}
              {modoEnvio!=="recojo"&&gratisDesdeActivo>0&&costoEnvio>0&&(
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:C.gray500,marginBottom:5 }}>
                    <span style={{ display:"flex",alignItems:"center",gap:5 }}><Gift size={10} style={{ color:C.purple }}/>Progreso envío gratis {modoEnvio==="lima"?"Lima":"Provincias"}</span>
                    <span style={{ fontWeight:700,color:C.purple }}>S/ {fmt(Math.max(0,gratisDesdeActivo-subtotal))} más</span>
                  </div>
                  <div style={{ height:5,borderRadius:5,background:C.gray200,overflow:"hidden" }}>
                    <div style={{ height:"100%",borderRadius:5,width:`${Math.min(100,(subtotal/gratisDesdeActivo)*100)}%`,background:`linear-gradient(90deg,${C.purple},${C.purpleLight})`,transition:"width .5s cubic-bezier(.4,0,.2,1)" }}/>
                  </div>
                </div>
              )}

              <div style={{ display:"flex",flexDirection:"column" }}>
                {[
                  {label:"Subtotal",sub:"Productos",val:`S/ ${fmt(subtotal)}`,color:C.gray700},
                  ...(descuento>0?[{label:`Descuento ${(descuento*100).toFixed(0)}%`,sub:"Por volumen",val:`-S/ ${fmt(descuentoMonto)}`,color:C.greenDark}]:[]),
                  {label:"Base Imponible",sub:"Sin IGV",val:`S/ ${fmt(baseImponible)}`,color:C.gray700},
                  {label:"IGV (18%)",sub:"SUNAT",val:`S/ ${fmt(igv)}`,color:C.orange},
                  {label:modoEnvio==="recojo"?"Recojo en tienda":modoEnvio==="lima"?"Envío Lima":"Envío Provincias",sub:tiempoEnvio,val:costoEnvio===0?"GRATIS":`S/ ${fmt(costoEnvio)}`,color:costoEnvio===0?C.greenDark:C.gray700},
                ].map(({label,sub,val,color},i)=>(
                  <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.gray100}` }}>
                    <div><p style={{ fontSize:12,fontWeight:600,color:C.gray700,margin:0 }}>{label}</p><p style={{ fontSize:10,color:C.gray400,margin:0 }}>{sub}</p></div>
                    <span style={{ fontSize:13,fontWeight:800,color }}>{val}</span>
                  </div>
                ))}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderRadius:12,background:`${C.purple}08`,border:`1.5px solid ${C.purple}25`,marginTop:12 }}>
                  <div><p style={{ fontSize:14,fontWeight:900,color:C.gray900,margin:0 }}>Total a Pagar</p><p style={{ fontSize:10,color:C.gray500,margin:0 }}>IGV incluido · Factura Electrónica</p></div>
                  <p style={{ fontSize:26,fontWeight:900,color:C.purple,margin:0 }}>S/ {fmt(totalFinal)}</p>
                </div>
              </div>

              {/* Botón confirmar */}
              <button onClick={handleFinalizarPedido} disabled={btnDisabled}
                style={{ width:"100%",marginTop:16,padding:"14px",borderRadius:13,background:btnDisabled?C.gray300:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,color:C.white,border:"none",fontSize:13,fontWeight:900,cursor:btnDisabled?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:btnDisabled?"none":`0 4px 20px ${C.purple}40`,transition:"all .2s" }}
                onMouseEnter={e=>{ if(!btnDisabled)(e.currentTarget as HTMLElement).style.transform="translateY(-1px)"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform="none"; }}>
                {loading?<><Loader2 size={17} style={{ animation:"spin .75s linear infinite" }}/>Procesando...</>
                  :btnLabel??<><Lock size={15}/>Confirmar Orden<ArrowRight size={15}/></>}
              </button>
              {carrito.length>0&&(
                <button onClick={vaciarCarrito} style={{ width:"100%",marginTop:8,padding:"10px",borderRadius:11,background:"transparent",border:"none",fontSize:12,fontWeight:600,color:C.gray400,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#ef4444";(e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.05)";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=C.gray400;(e.currentTarget as HTMLElement).style.background="transparent";}}>
                  <Trash2 size={13}/>Vaciar carrito
                </button>
              )}
            </div>

            {/* Beneficios */}
            <div style={{ borderRadius:18,padding:18,border:`1px solid ${C.gray200}`,background:C.white }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
                <Award size={15} style={{ color:C.yellow }}/>
                <h3 style={{ fontSize:13,fontWeight:900,color:C.gray900,margin:0 }}>Ventajas Mundo Móvil</h3>
              </div>
              {[
                {icon:FileText,color:C.purple,title:"Factura Electrónica SUNAT",sub:"Válida para declaraciones tributarias"},
                {icon:Percent,color:C.greenDark,title:"Descuentos por Volumen",sub:"Hasta 20% en compras mayoristas"},
                {icon:Truck,color:C.orange,title:"Envío a todo el Perú",sub:`Lima ${configEnvio?.lima?.tiempo||"24-48h"} · Provincias ${configEnvio?.provincia?.tiempo||"3-5 días"}`},
                {icon:ShieldCheck,color:C.purple,title:"Garantía de fábrica",sub:"Equipos 100% originales y sellados"},
              ].map(({icon:Icon,color,title,sub})=>(
                <div key={title} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:10,background:C.gray50,border:`1px solid ${C.gray200}`,marginBottom:8 }}>
                  <div style={{ width:32,height:32,borderRadius:9,background:`${color}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Icon size={15} style={{ color }}/></div>
                  <div><p style={{ fontSize:12,fontWeight:800,color:C.gray900,margin:0 }}>{title}</p><p style={{ fontSize:10,color:C.gray500,margin:0 }}>{sub}</p></div>
                </div>
              ))}
            </div>

            {/* WhatsApp */}
            {configContacto?.whatsapp_soporte&&(
              <a href={`https://wa.me/51${configContacto.whatsapp_soporte.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                style={{ borderRadius:14,padding:"14px 16px",background:"#25D366",display:"flex",alignItems:"center",gap:12,textDecoration:"none",boxShadow:"0 4px 14px rgba(37,211,102,0.35)",transition:"transform .2s" }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform="translateY(-2px)"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform="none"}>
                <div style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}><MessageSquare size={18} color={C.white}/></div>
                <div><p style={{ fontSize:13,fontWeight:800,color:C.white,margin:0 }}>¿Tienes dudas?</p><p style={{ fontSize:11,color:"rgba(255,255,255,0.85)",margin:0 }}>Chatea con un asesor ahora</p></div>
                <ArrowRight size={16} color={C.white} style={{ marginLeft:"auto" }}/>
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}