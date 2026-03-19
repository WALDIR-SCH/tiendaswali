"use client";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { db, auth } from "@/lib/firebase";
import {
  collection, addDoc, serverTimestamp, doc, updateDoc,
  increment, getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  CreditCard, Landmark, ShieldCheck, Plus, Minus, Trash2,
  ChevronLeft, Lock, PackageCheck, Truck,
  CheckCircle2, Loader2, ShoppingBag,
  ArrowRight, Percent, Download,
  Building, FileText, Mail, Phone,
  Check, FileSignature, Calculator, Award, Receipt,
  Eye, EyeOff, Target, Package, Zap, Box,
  RefreshCw, User, MapPin, UploadCloud, ImageIcon, XCircle, AlertCircle
} from "lucide-react";

/* ─── PALETA ─── */
const C = {
  orange:     "#FF6600",
  yellow:     "#F6FA00",
  green:      "#28FB4B",
  greenDark:  "#16a34a",
  purple:     "#9851F9",
  purpleDark: "#7c3aed",
  white:      "#FFFFFF",
  gray50:     "#F9FAFB",
  gray100:    "#F3F4F6",
  gray200:    "#E5E7EB",
  gray300:    "#D1D5DB",
  gray400:    "#9CA3AF",
  gray500:    "#6B7280",
  gray600:    "#4B5563",
  gray700:    "#374151",
  gray800:    "#1F2937",
  gray900:    "#111827",
} as const;

const fmt = (n: number) =>
  n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const simulatePayment = async (amount: number, method: string) =>
  new Promise(resolve =>
    setTimeout(() => resolve({
      success: true,
      transactionId: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount, method, timestamp: new Date().toISOString(),
    }), 2000)
  );

/* ─── FIELD ─── */
const Field = ({
  label, name, value, onChange, placeholder, type = "text",
  maxLength, required, readOnly = false, autoFilled = false,
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; maxLength?: number;
  required?: boolean; readOnly?: boolean; autoFilled?: boolean;
}) => (
  <div>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
      <label style={{ fontSize:12, fontWeight:700, color:C.gray600 }}>
        {label}{required && <span style={{ color:C.orange }}> *</span>}
      </label>
      {autoFilled && !readOnly && (
        <span style={{ fontSize:9, fontWeight:800, color:C.greenDark, background:`${C.green}15`, padding:"1px 6px", borderRadius:6, border:`1px solid ${C.green}30` }}>
          ✓ Auto
        </span>
      )}
    </div>
    <div style={{ position:"relative" }}>
      <input
        name={name} value={value} onChange={onChange}
        placeholder={placeholder} type={type}
        maxLength={maxLength} readOnly={readOnly}
        style={{
          width:"100%", padding:"10px 14px",
          paddingRight: autoFilled && !readOnly ? 36 : 14,
          borderRadius:11,
          border:`1.5px solid ${autoFilled && !readOnly ? `${C.greenDark}50` : C.gray200}`,
          fontSize:13, outline:"none", color:C.gray900,
          background: readOnly ? C.gray100 : autoFilled ? `${C.green}06` : C.white,
          transition:"border-color .2s, background .2s",
        }}
        onFocus={e => { if (!readOnly) { e.target.style.borderColor = C.purpleDark; e.target.style.background = C.white; e.target.style.boxShadow = `0 0 0 3px ${C.purpleDark}15`; } }}
        onBlur={e => {
          e.target.style.borderColor = autoFilled && !readOnly ? `${C.greenDark}50` : C.gray200;
          e.target.style.background  = readOnly ? C.gray100 : autoFilled ? `${C.green}06` : C.white;
          e.target.style.boxShadow   = "none";
        }}
      />
      {autoFilled && !readOnly && value && (
        <CheckCircle2 size={14} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:C.greenDark, pointerEvents:"none" }} />
      )}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════ */
export default function CarritoPage() {
  const { carrito, total, actualizarCantidad, eliminarDelCarrito, vaciarCarrito } = useCart();
  const router = useRouter();

  const [metodoPago,       setMetodoPago]       = useState<"tarjeta"|"transferencia">("transferencia");
  const [loading,          setLoading]          = useState(false);
  const [loadingUser,      setLoadingUser]      = useState(true);  // cargando datos usuario
  const [showModal,        setShowModal]        = useState(false);
  const [step,             setStep]             = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderDetails,     setOrderDetails]     = useState<any>(null);
  const [showCardDetails,  setShowCardDetails]  = useState(false);
  // ── Constancia de transferencia ──
  const [constanciaFile,    setConstanciaFile]   = useState<File | null>(null);
  const [constanciaPreview, setConstanciaPreview]= useState<string>("");
  const [constanciaUrl,     setConstanciaUrl]    = useState<string>("");
  const [subiendoConstancia,setSubiendoConstancia]= useState(false);
  const [pedidoIdGuardado,  setPedidoIdGuardado] = useState<string>("");
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set()); // qué campos se llenaron auto

  const [envio, setEnvio] = useState({
    ruc:"", razonSocial:"", contacto:"", email:"",
    telefono:"", direccion:"", referencia:"", ciudad:"Lima",
  });
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber:"", expiry:"", cvv:"", cardholder:"",
  });

  /* ─── Auto-completar datos desde Firestore ─── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoadingUser(false); return; }

      // Primero rellenar con datos de auth (rápido)
      const autoFields = new Set<string>();
      const updates: Partial<typeof envio> = {};

      if (user.email)       { updates.email    = user.email;                          autoFields.add("email"); }
      if (user.displayName) { updates.contacto = user.displayName;                   autoFields.add("contacto"); }

      // Luego leer documento completo de Firestore
      try {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
          const d = userDoc.data();

          // RUC y Razón Social (de datosEnvio o campos directos)
          const ruc          = d.ruc          || d.clienteRut    || d.datosEnvio?.ruc          || "";
          const razonSocial  = d.razonSocial  || d.nombreComercial || d.datosEnvio?.razonSocial  || d.clienteNombre || "";
          const nombre       = d.nombre       || d.displayName   || user.displayName             || "";
          const telefono     = d.telefono     || d.clienteTelefono || d.datosEnvio?.telefono    || "";
          const direccion    = d.direccionFiscal || d.clienteDireccion || d.datosEnvio?.direccion || "";
          const ciudad       = d.ciudad       || d.departamento  || "Lima";
          const email        = d.email        || user.email      || "";

          if (ruc)         { updates.ruc         = ruc;         autoFields.add("ruc"); }
          if (razonSocial) { updates.razonSocial  = razonSocial; autoFields.add("razonSocial"); }
          if (nombre)      { updates.contacto     = nombre;      autoFields.add("contacto"); }
          if (telefono)    { updates.telefono     = telefono;    autoFields.add("telefono"); }
          if (direccion)   { updates.direccion    = direccion;   autoFields.add("direccion"); }
          if (ciudad)      { updates.ciudad       = ciudad;      autoFields.add("ciudad"); }
          if (email)       { updates.email        = email;       autoFields.add("email"); }
        }
      } catch (e) { console.error("Error cargando datos usuario:", e); }

      setEnvio(prev => ({ ...prev, ...updates }));
      setAutoFilledFields(autoFields);
      setLoadingUser(false);
    });
    return () => unsub();
  }, []);

  const handleInput     = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnvio({ ...envio, [e.target.name]: e.target.value });
    // Si el usuario edita un campo, ya no es "auto"
    setAutoFilledFields(prev => { const n = new Set(prev); n.delete(e.target.name); return n; });
  };
  const handleCardInput = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });

  /* ─── Subir constancia a Cloudinary ─── */
  const subirConstancia = async (file: File): Promise<string> => {
    const cn = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const up = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cn || !up) throw new Error("Cloudinary no configurado");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", up);
    fd.append("folder", "constancias_pago");
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cn}/upload`, { method:"POST", body:fd });
    const d = await r.json();
    if (!d.secure_url) throw new Error("Error subiendo archivo");
    return d.secure_url;
  };

  const handleConstanciaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validar tipo y tamaño
    const tipos = ["image/png","image/jpeg","image/jpg","application/pdf"];
    if (!tipos.includes(file.type)) { alert("Solo se permiten PNG, JPG o PDF"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("El archivo no debe superar 5MB"); return; }

    setConstanciaFile(file);
    // Preview para imágenes
    if (file.type !== "application/pdf") {
      const reader = new FileReader();
      reader.onloadend = () => setConstanciaPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setConstanciaPreview("pdf");
    }
    // Subir inmediatamente
    setSubiendoConstancia(true);
    try {
      const url = await subirConstancia(file);
      setConstanciaUrl(url);
      // Si ya hay un pedido guardado, actualizar directamente
      if (pedidoIdGuardado) {
        await updateDoc(doc(db, "pedidos", pedidoIdGuardado), {
          comprobanteUrl: url,
          estado: "PAGADO",
          fechaActualizacion: serverTimestamp(),
        });
      }
    } catch {
      alert("Error al subir el archivo. Intenta nuevamente.");
      setConstanciaFile(null); setConstanciaPreview(""); setConstanciaUrl("");
    } finally {
      setSubiendoConstancia(false);
    }
  };

  const quitarConstancia = () => {
    setConstanciaFile(null); setConstanciaPreview(""); setConstanciaUrl("");
  };

  /* ─── Cálculos IGV ─── */
  const totalItems     = carrito.reduce((a, i) => a + i.cantidad, 0);
  const descuento      = totalItems >= 100 ? 0.20 : totalItems >= 50 ? 0.15 : totalItems >= 20 ? 0.10 : totalItems >= 10 ? 0.05 : 0;
  const subtotal       = total;
  const descuentoMonto = subtotal * descuento;
  const baseImponible  = subtotal - descuentoMonto;
  const igv            = baseImponible * 0.18;
  const envioCosto     = carrito.length > 0 ? (subtotal > 1000 ? 0 : 25) : 0;
  const totalFinal     = baseImponible + envioCosto + igv;

  /* ─── Cuántos campos se llenaron automáticamente ─── */
  const camposAutoCount = autoFilledFields.size;

  /* ─── Finalizar pedido ─── */
  const handleFinalizarPedido = async () => {
    const u = auth.currentUser;
    if (!u) { router.push("/login?redirect=/carrito"); return; }
    if (!envio.ruc || envio.ruc.length !== 11) { alert("Ingresa un RUC válido (11 dígitos)."); return; }
    if (!envio.razonSocial)                    { alert("Ingresa la Razón Social para la factura."); return; }
    if (carrito.length === 0)                  { alert("Tu carrito está vacío."); return; }

    setLoading(true); setShowModal(true); setStep(1);
    const itemsCopia = [...carrito];

    try {
      setTimeout(() => setStep(2), 1500);
      setTimeout(async () => {
        setStep(3);
        try {
          const paymentResult: any = await simulatePayment(totalFinal, metodoPago);
          if (paymentResult.success) {
            setStep(4);
            const docRef = await addDoc(collection(db, "pedidos"), {
              clienteId:        u.uid,
              clienteEmail:     envio.email || u.email || "",
              clienteNombre:    envio.razonSocial || envio.contacto || "",
              clienteRut:       envio.ruc,
              clienteTelefono:  envio.telefono || "",
              clienteDireccion: envio.direccion || "",
              fecha:            serverTimestamp(),
              estado:           "Pendiente",
              metodoPago:       metodoPago === "tarjeta" ? "Tarjeta" : "Transferencia",
              total:            Number(totalFinal.toFixed(2)),
              datosEnvio: {
                ruc:          envio.ruc,
                razonSocial:  envio.razonSocial,
                contacto:     envio.contacto,
                email:        envio.email,
                telefono:     envio.telefono,
                direccion:    envio.direccion,
                ciudad:       envio.ciudad,
                referencia:   envio.referencia,
              },
              items: itemsCopia.map(item => ({
                id:               item.id,
                idOriginal:       item.idOriginal || item.id,
                nombre:           item.nombre || "Producto B2B",
                sku:              item.sku || "",
                precioBase:       Number(item.precioBase) || 0,
                precio:           Number(item.precioBase) || 0,
                cantidad:         Number(item.cantidad) || 1,
                imagen_principal: item.imagen_principal || item.imagenUrl || "",
                imagenUrl:        item.imagenUrl || item.imagen_principal || "",
                tipoCompra:       item.tipoCompra || "caja",
                unidadesPorCaja:  item.unidadesPorCaja || 10,
              })),
              archived:           false,
              comprobanteUrl:     constanciaUrl || null,
              trackingNumber:     null,
              urgente:            false,
              nota:               `Pedido B2B - RUC: ${envio.ruc}`,
              notaInterna:        `Método: ${metodoPago} | TRX: ${paymentResult.transactionId}`,
              fechaActualizacion: serverTimestamp(),
              historialEstados: [{
                estado:  "Pendiente",
                fecha:   new Date().toISOString(),
                usuario: u.email || "sistema",
                nota:    "Pedido creado desde carrito B2B",
              }],
            });

            // Actualizar stock
            for (const item of itemsCopia) {
              try {
                const idOriginal = item.idOriginal || item.id.replace(/-caja$|-unidad$/, "");
                await updateDoc(doc(db, "productos", idOriginal), {
                  stock_cajas:    item.tipoCompra === "caja"   ? increment(-item.cantidad) : increment(0),
                  stock_unidades: item.tipoCompra === "unidad" ? increment(-item.cantidad) : increment(0),
                });
              } catch {}
            }

            // Si hay constancia ya subida, actualizarla en el doc recién creado
            if (constanciaUrl) {
              await updateDoc(doc(db, "pedidos", docRef.id), {
                comprobanteUrl: constanciaUrl,
                estado: "PAGADO",
              }).catch(() => {});
            }
            setPedidoIdGuardado(docRef.id);
            setOrderDetails({
              id:docRef.id, total:totalFinal, items:itemsCopia,
              paymentId:paymentResult.transactionId,
              ruc:envio.ruc, razonSocial:envio.razonSocial,
              esTransferencia: metodoPago === "transferencia",
            });
            vaciarCarrito();
            setStep(5);
            setTimeout(() => { setShowModal(false); setShowConfirmation(true); }, 1500);
          }
        } catch (e) {
          console.error(e);
          setShowModal(false); setLoading(false);
          alert("Error en el procesamiento del pago. Intenta nuevamente.");
        }
      }, 3000);
    } catch (e) {
      console.error(e);
      setShowModal(false); setLoading(false);
      alert("Error en la transacción. Intenta nuevamente.");
    }
  };

  const STEPS_MODAL = [
    { step:1, title:"Validando Stock",   desc:"Verificación en almacén",        icon:PackageCheck  },
    { step:2, title:"Validación RUC",    desc:"Verificación SUNAT",             icon:FileText      },
    { step:3, title:"Procesando Pago",   desc:"Autorización bancaria",          icon:CreditCard    },
    { step:4, title:"Generando Pedido",  desc:"Creación en sistema",            icon:FileSignature },
    { step:5, title:"Facturación",       desc:"Generando Factura Electrónica",  icon:Receipt       },
  ];

  /* ═══ RENDER ═══ */
  return (
    <div style={{ minHeight:"100vh", background:C.white, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Modal procesamiento ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)" }}>
          <div style={{ width:"100%", maxWidth:440, borderRadius:22, padding:32, border:`1px solid ${C.purple}30`, background:C.white, boxShadow:"0 24px 80px rgba(0,0,0,0.25)", display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ width:64, height:64, borderRadius:"50%", background:`${C.purple}15`, border:`2px solid ${C.purple}30`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                <Building size={28} style={{ color:C.purple }} />
              </div>
              <h2 style={{ fontSize:18, fontWeight:900, color:C.gray900, margin:"0 0 4px" }}>Procesando Orden</h2>
              <p style={{ fontSize:13, color:C.gray500, margin:0 }}>Validando RUC y datos SUNAT</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {STEPS_MODAL.map(({ step:s, title, desc, icon:Icon }) => (
                <div key={s} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, background: step>=s ? `${C.purple}08` : C.gray100, border:`1px solid ${step>=s ? `${C.purple}25` : C.gray200}` }}>
                  <div style={{ width:36, height:36, borderRadius:10, background: step>=s ? C.purple : C.gray300, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {step > s
                      ? <CheckCircle2 size={18} color={C.white} />
                      : step === s
                        ? <Loader2 size={18} color={C.white} style={{ animation:"spin .75s linear infinite" }} />
                        : <Icon size={18} color={C.white} />}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:C.gray900, margin:0 }}>{title}</p>
                    <p style={{ fontSize:11, color:C.gray500, margin:0 }}>{desc}</p>
                  </div>
                  {step === s && (
                    <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:`${C.purple}15`, color:C.purple }}>
                      En proceso
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.gray500, marginBottom:6 }}>
                <span>Progreso: {Math.round((step/5)*100)}%</span>
                <span>Paso {step} de 5</span>
              </div>
              <div style={{ width:"100%", height:8, borderRadius:4, background:C.gray200 }}>
                <div style={{ height:"100%", borderRadius:4, width:`${(step/5)*100}%`, background:`linear-gradient(90deg,${C.purpleDark},${C.orange})`, transition:"width .5s ease" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmación ── */}
      {showConfirmation && orderDetails && (
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)" }}>
          <div style={{ width:"100%", maxWidth:480, borderRadius:22, padding:32, border:`1px solid ${C.purple}25`, background:C.white, boxShadow:"0 24px 80px rgba(0,0,0,0.25)", position:"relative" }}>
            {/* Badge check */}
            <div style={{ position:"absolute", top:-20, right:-16, width:48, height:48, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 16px ${C.green}50` }}>
              <Check size={22} color="#000" />
            </div>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ width:80, height:80, borderRadius:"50%", background:`${C.green}12`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <CheckCircle2 size={38} style={{ color:C.greenDark }} />
              </div>
              <h2 style={{ fontSize:22, fontWeight:900, color:C.gray900, margin:"0 0 6px" }}>¡Orden Confirmada!</h2>
              <p style={{ fontSize:13, color:C.gray500, margin:0 }}>Tu pedido fue procesado exitosamente</p>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:12, padding:"6px 16px", borderRadius:20, background:C.gray100, border:`1px solid ${C.gray200}` }}>
                <span style={{ fontSize:12, fontFamily:"monospace", color:C.gray700 }}>#{orderDetails.id.substring(0,8).toUpperCase()}</span>
                <span style={{ fontSize:11, fontWeight:700, color:C.greenDark }}>· RUC: {orderDetails.ruc}</span>
              </div>

            {/* Upload constancia post-pedido si es transferencia y no se subió aún */}
            {orderDetails.esTransferencia && !constanciaUrl && (
              <div style={{ marginTop:16, padding:"14px 16px", borderRadius:14, background:"#fffbeb", border:"1.5px solid #fde68a" }}>
                <p style={{ fontSize:13, fontWeight:800, color:"#92400e", margin:"0 0 8px", display:"flex", alignItems:"center", gap:6 }}>
                  <AlertCircle size={14} style={{ color:"#b45309" }} />
                  Sube tu constancia para agilizar la verificación
                </p>
                <label style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", borderRadius:10, background:C.white, border:"1px solid #fde68a", cursor:"pointer" }}>
                  {subiendoConstancia
                    ? <><Loader2 size={14} style={{ color:C.purpleDark, animation:"spin .75s linear infinite" }} /><span style={{ fontSize:12, color:C.purpleDark, fontWeight:700 }}>Subiendo...</span></>
                    : <><UploadCloud size={14} style={{ color:C.purpleDark }} /><span style={{ fontSize:12, color:C.purpleDark, fontWeight:700 }}>Subir constancia de pago (PNG/JPG/PDF)</span></>}
                  <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleConstanciaChange} style={{ display:"none" }} />
                </label>
              </div>
            )}
            {orderDetails.esTransferencia && constanciaUrl && (
              <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:12, background:`${C.greenDark}10`, border:`1px solid ${C.greenDark}30` }}>
                <CheckCircle2 size={16} style={{ color:C.greenDark }} />
                <span style={{ fontSize:13, fontWeight:700, color:C.greenDark }}>Constancia subida. El admin verificará tu pago.</span>
              </div>
            )}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 }}>
              <div style={{ padding:"14px 16px", borderRadius:14, background:`${C.purple}06`, border:`1px solid ${C.purple}20` }}>
                <p style={{ fontSize:10, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 10px" }}>Detalles de Pago</p>
                {[["Total", `S/ ${fmt(orderDetails.total)}`],["IGV 18%",`S/ ${fmt(orderDetails.total*0.18/1.18)}`],["ID",orderDetails.paymentId.slice(-10)]].map(([k,v])=>(
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:C.gray500 }}>{k}:</span>
                    <span style={{ fontSize:12, fontWeight:700, color:C.gray900, fontFamily:k==="ID"?"monospace":"inherit" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding:"14px 16px", borderRadius:14, background:`${C.orange}06`, border:`1px solid ${C.orange}20` }}>
                <p style={{ fontSize:10, fontWeight:800, color:C.orange, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 10px" }}>Próximos Pasos</p>
                {[
                  { icon:Mail,     color:C.purple, text:`Factura a ${envio.email.split("@")[0]}…`     },
                  { icon:Truck,    color:C.greenDark, text:"Envío 24-48h hábiles"                    },
                  { icon:FileText, color:C.orange, text:`RUC ${envio.ruc} verificado`                },
                ].map(({icon:Icon,color,text})=>(
                  <div key={text} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <Icon size={12} style={{ color, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:C.gray600 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={() => { setShowConfirmation(false); router.push("/catalogo"); }}
                style={{ flex:1, padding:"13px", borderRadius:12, background:`linear-gradient(135deg,${C.purpleDark},${C.purple})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 16px ${C.purple}40` }}>
                Seguir comprando
              </button>
              <button onClick={() => alert(`✅ Factura\nPedido: #${orderDetails.id.substring(0,8).toUpperCase()}\nRUC: ${envio.ruc}\nRazón Social: ${envio.razonSocial}\nTotal: S/ ${fmt(orderDetails.total)}\n\nSe enviará a: ${envio.email}`)}
                style={{ flex:1, padding:"13px", borderRadius:12, background:C.white, color:C.gray700, border:`1.5px solid ${C.gray200}`, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Download size={15} />Descargar Factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ position:"sticky", top:0, zIndex:40, background:C.white, borderBottom:`1px solid ${C.gray200}`, padding:"0 16px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button onClick={() => router.back()}
            style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:C.gray500, background:"none", border:"none", cursor:"pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.purpleDark)}
            onMouseLeave={e => (e.currentTarget.style.color = C.gray500)}>
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Continuar comprando</span>
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:C.green, boxShadow:`0 0 6px ${C.green}`, animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:11, fontWeight:700, color:C.greenDark }}>Perú</span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <ShoppingBag size={18} style={{ color:C.gray400 }} />
            <span style={{ fontSize:12, fontWeight:700, color:C.gray600 }}>{carrito.length} producto{carrito.length!==1?"s":""}</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth:1280, margin:"0 auto", padding:"28px 16px" }}>
        <style>{`
          @media (min-width: 1024px) { .checkout-grid { grid-template-columns: 1fr 420px !important; } }
        `}</style>
        <div className="checkout-grid" style={{ display:"grid", gridTemplateColumns:"1fr", gap:24 }}>

          {/* ══ COLUMNA IZQUIERDA ══ */}
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* ── Banner autocompletado ── */}
            {!loadingUser && camposAutoCount > 0 && (
              <div style={{ padding:"12px 16px", borderRadius:14, background:`${C.green}10`, border:`1.5px solid ${C.green}35`, display:"flex", alignItems:"center", justifyContent:"space-between", animation:"slideDown .35s ease" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:`${C.greenDark}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <User size={16} style={{ color:C.greenDark }} />
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:800, color:C.greenDark, margin:0 }}>
                      ✓ Datos completados automáticamente
                    </p>
                    <p style={{ fontSize:11, color:C.greenDark, margin:0, opacity:.8 }}>
                      {camposAutoCount} campos llenados desde tu cuenta · Puedes editarlos
                    </p>
                  </div>
                </div>
                <div style={{ fontSize:20, fontWeight:900, color:C.greenDark, background:C.white, borderRadius:10, padding:"4px 10px", border:`1px solid ${C.green}30` }}>
                  {camposAutoCount}
                </div>
              </div>
            )}

            {loadingUser && (
              <div style={{ padding:"12px 16px", borderRadius:14, background:C.gray100, border:`1px solid ${C.gray200}`, display:"flex", alignItems:"center", gap:10 }}>
                <RefreshCw size={15} style={{ color:C.gray400, animation:"spin 1s linear infinite" }} />
                <span style={{ fontSize:13, color:C.gray500, fontWeight:600 }}>Cargando tus datos...</span>
              </div>
            )}

            {/* ── Datos facturación ── */}
            <section style={{ borderRadius:18, padding:24, border:`1px solid ${C.gray200}`, background:C.white, boxShadow:`0 2px 12px rgba(0,0,0,0.04)` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${C.purpleDark}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Building size={19} style={{ color:C.purpleDark }} />
                </div>
                <div style={{ flex:1 }}>
                  <h3 style={{ fontSize:15, fontWeight:900, color:C.gray900, margin:0 }}>Datos para Facturación</h3>
                  <p style={{ fontSize:12, color:C.gray500, margin:0 }}>RUC y Razón Social — Obligatorio SUNAT</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:8, background:`${C.orange}08`, border:`1px solid ${C.orange}25` }}>
                  <Target size={11} style={{ color:C.orange }} />
                  <span style={{ fontSize:11, fontWeight:800, color:C.orange }}>SUNAT</span>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {/* RUC */}
                <Field label="RUC" name="ruc" value={envio.ruc} onChange={handleInput}
                  placeholder="20XXXXXXXXX" maxLength={11} required
                  autoFilled={autoFilledFields.has("ruc")} />

                {/* Razón social — col span 2 */}
                <div style={{ gridColumn:"1 / -1" }}>
                  <Field label="Razón Social" name="razonSocial" value={envio.razonSocial} onChange={handleInput}
                    placeholder="EMPRESA SAC" required autoFilled={autoFilledFields.has("razonSocial")} />
                </div>

                <Field label="Contacto / Nombre" name="contacto" value={envio.contacto} onChange={handleInput}
                  placeholder="Nombre del responsable" autoFilled={autoFilledFields.has("contacto")} />

                <Field label="Email Facturación" name="email" value={envio.email} onChange={handleInput}
                  placeholder="facturacion@empresa.com" type="email" required autoFilled={autoFilledFields.has("email")} />

                {/* Dirección — col span 2 */}
                <div style={{ gridColumn:"1 / -1" }}>
                  <Field label="Dirección de Entrega" name="direccion" value={envio.direccion} onChange={handleInput}
                    placeholder="Av. Principal 123, Lima" autoFilled={autoFilledFields.has("direccion")} />
                </div>

                <Field label="Teléfono" name="telefono" value={envio.telefono} onChange={handleInput}
                  placeholder="+51 999 888 777" autoFilled={autoFilledFields.has("telefono")} />

                <Field label="Ciudad / Departamento" name="ciudad" value={envio.ciudad} onChange={handleInput}
                  placeholder="Lima" autoFilled={autoFilledFields.has("ciudad")} />

                <div style={{ gridColumn:"1 / -1" }}>
                  <Field label="Referencia" name="referencia" value={envio.referencia} onChange={handleInput}
                    placeholder="Piso, oficina, interior (opcional)" />
                </div>
              </div>
            </section>

            {/* ── Método de pago ── */}
            <section style={{ borderRadius:18, padding:24, border:`1px solid ${C.gray200}`, background:C.white, boxShadow:`0 2px 12px rgba(0,0,0,0.04)` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${C.greenDark}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <CreditCard size={19} style={{ color:C.greenDark }} />
                </div>
                <div style={{ flex:1 }}>
                  <h3 style={{ fontSize:15, fontWeight:900, color:C.gray900, margin:0 }}>Método de Pago</h3>
                  <p style={{ fontSize:12, color:C.gray500, margin:0 }}>Selecciona tu forma de pago</p>
                </div>
                <ShieldCheck size={17} style={{ color:C.greenDark }} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
                {([
                  { id:"transferencia", icon:Landmark,   label:"Transferencia", sub:"BCP/BBVA/Interbank", color:C.greenDark },
                  { id:"tarjeta",       icon:CreditCard,  label:"Tarjeta",       sub:"Visa/Mastercard",    color:C.purpleDark },
                ] as const).map(({ id, icon:Icon, label, sub, color }) => (
                  <button key={id} onClick={() => setMetodoPago(id)}
                    style={{ padding:"14px 12px", borderRadius:14, border:`2px solid ${metodoPago===id ? color : C.gray200}`, background:metodoPago===id ? `${color}0e` : C.white, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"all .2s" }}>
                    <Icon size={22} style={{ color:metodoPago===id ? color : C.gray400 }} />
                    <span style={{ fontSize:13, fontWeight:800, color:metodoPago===id ? color : C.gray600 }}>{label}</span>
                    <span style={{ fontSize:10, color:C.gray400 }}>{sub}</span>
                  </button>
                ))}
              </div>

              {metodoPago === "transferencia" && (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {/* Datos bancarios */}
                  <div style={{ borderRadius:12, padding:16, background:C.gray50, border:`1px solid ${C.gray200}` }}>
                    <h4 style={{ fontSize:13, fontWeight:900, color:C.gray800, margin:"0 0 12px" }}>Datos para Transferencia — BCP</h4>
                    {[["Banco","BCP"],["Cuenta Corriente","191-23456789-0-99"],["CCI","00219100234567899099"],["Titular","TIENDAS WALY SAC"],["RUC","20605467891"]].map(([k,v])=>(
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", borderRadius:8, background:C.white, marginBottom:6 }}>
                        <span style={{ fontSize:12, color:C.gray500 }}>{k}:</span>
                        <span style={{ fontSize:12, fontWeight:700, fontFamily:"monospace", color:C.gray900 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Subir constancia */}
                  <div style={{ borderRadius:12, padding:16, background:C.white, border:`2px dashed ${constanciaUrl ? C.greenDark : C.gray300}`, transition:"border-color .2s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                      <div style={{ width:32, height:32, borderRadius:9, background: constanciaUrl ? `${C.greenDark}12` : `${C.purpleDark}10`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {constanciaUrl
                          ? <CheckCircle2 size={16} style={{ color:C.greenDark }} />
                          : <UploadCloud size={16} style={{ color:C.purpleDark }} />}
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:800, color: constanciaUrl ? C.greenDark : C.gray900, margin:0 }}>
                          {constanciaUrl ? "✓ Constancia subida correctamente" : "Subir constancia de pago"}
                        </p>
                        <p style={{ fontSize:11, color:C.gray500, margin:0 }}>
                          {constanciaUrl ? "El admin podrá verificar tu pago" : "PNG, JPG o PDF · Máx. 5MB"}
                        </p>
                      </div>
                    </div>

                    {/* Preview */}
                    {constanciaPreview && (
                      <div style={{ marginBottom:12, position:"relative", display:"inline-block" }}>
                        {constanciaPreview === "pdf" ? (
                          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, background:C.gray50, border:`1px solid ${C.gray200}` }}>
                            <FileText size={24} style={{ color:C.purpleDark }} />
                            <div>
                              <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.gray900 }}>{constanciaFile?.name}</p>
                              <p style={{ margin:0, fontSize:11, color:C.gray500 }}>{((constanciaFile?.size||0)/1024).toFixed(0)} KB · PDF</p>
                            </div>
                          </div>
                        ) : (
                          <img src={constanciaPreview} alt="Constancia"
                            style={{ maxHeight:160, maxWidth:"100%", borderRadius:10, objectFit:"contain", border:`1px solid ${C.gray200}` }} />
                        )}
                        <button onClick={quitarConstancia}
                          style={{ position:"absolute", top:-8, right:-8, width:22, height:22, borderRadius:"50%", background:"#ef4444", border:"2px solid #fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <XCircle size={13} color="#fff" />
                        </button>
                      </div>
                    )}

                    {/* Estado subida */}
                    {subiendoConstancia && (
                      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:8, background:`${C.purpleDark}08`, marginBottom:10 }}>
                        <Loader2 size={14} style={{ color:C.purpleDark, animation:"spin .75s linear infinite" }} />
                        <span style={{ fontSize:12, color:C.purpleDark, fontWeight:600 }}>Subiendo archivo...</span>
                      </div>
                    )}

                    {/* Input file */}
                    {!constanciaFile && (
                      <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 16px", borderRadius:10, background:`${C.purpleDark}08`, border:`1px solid ${C.purpleDark}25`, cursor:"pointer", transition:"all .2s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background=`${C.purpleDark}14`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background=`${C.purpleDark}08`; }}>
                        <ImageIcon size={15} style={{ color:C.purpleDark }} />
                        <span style={{ fontSize:13, fontWeight:700, color:C.purpleDark }}>Seleccionar archivo</span>
                        <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleConstanciaChange} style={{ display:"none" }} />
                      </label>
                    )}
                  </div>

                  {/* Aviso sin constancia */}
                  {!constanciaUrl && (
                    <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 12px", borderRadius:10, background:"#fffbeb", border:"1px solid #fde68a" }}>
                      <AlertCircle size={14} style={{ color:"#b45309", flexShrink:0, marginTop:1 }} />
                      <p style={{ fontSize:12, color:"#92400e", margin:0, fontWeight:600 }}>
                        Puedes continuar sin subir la constancia ahora, pero tu pedido quedará en estado <strong>Pendiente</strong> hasta que el admin verifique el pago.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {metodoPago === "tarjeta" && (
                <div style={{ borderRadius:12, padding:16, background:C.gray50, border:`1px solid ${C.gray200}` }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <h4 style={{ fontSize:13, fontWeight:900, color:C.gray800, margin:0 }}>Detalles de Tarjeta</h4>
                    <button onClick={() => setShowCardDetails(!showCardDetails)}
                      style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:700, color:C.purpleDark, background:"none", border:"none", cursor:"pointer" }}>
                      {showCardDetails ? <EyeOff size={13}/> : <Eye size={13}/>}
                      {showCardDetails ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div style={{ gridColumn:"1 / -1" }}>
                      <Field label="Número de Tarjeta" name="cardNumber" value={paymentDetails.cardNumber} onChange={handleCardInput}
                        placeholder="1234 5678 9012 3456" type={showCardDetails?"text":"password"} maxLength={19} />
                    </div>
                    <Field label="Válida hasta" name="expiry" value={paymentDetails.expiry} onChange={handleCardInput}
                      placeholder="MM/AA" maxLength={5} />
                    <Field label="CVV" name="cvv" value={paymentDetails.cvv} onChange={handleCardInput}
                      placeholder="123" type={showCardDetails?"text":"password"} maxLength={3} />
                    <div style={{ gridColumn:"1 / -1" }}>
                      <Field label="Nombre del Titular" name="cardholder" value={paymentDetails.cardholder} onChange={handleCardInput}
                        placeholder="Como aparece en la tarjeta" />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ── Productos del carrito ── */}
            <section style={{ borderRadius:18, padding:24, border:`1px solid ${C.gray200}`, background:C.white, boxShadow:`0 2px 12px rgba(0,0,0,0.04)` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${C.orange}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <PackageCheck size={19} style={{ color:C.orange }} />
                </div>
                <div>
                  <h3 style={{ fontSize:15, fontWeight:900, color:C.gray900, margin:0 }}>Resumen de Productos</h3>
                  <p style={{ fontSize:12, color:C.gray500, margin:0 }}>{carrito.length} producto{carrito.length!==1?"s":""} en tu orden</p>
                </div>
              </div>

              {carrito.length === 0 ? (
                <div style={{ textAlign:"center", padding:"48px 0" }}>
                  <div style={{ width:72, height:72, borderRadius:"50%", background:C.gray100, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                    <ShoppingBag size={30} style={{ color:C.gray300 }} />
                  </div>
                  <h4 style={{ fontSize:16, fontWeight:900, color:C.gray800, margin:"0 0 6px" }}>Carrito vacío</h4>
                  <p style={{ fontSize:13, color:C.gray500, margin:"0 0 20px" }}>Agrega productos desde nuestro catálogo</p>
                  <button onClick={() => router.push("/catalogo")}
                    style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px", borderRadius:12, background:`linear-gradient(135deg,${C.purpleDark},${C.purple})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 16px ${C.purpleDark}40` }}>
                    <Building size={15} />Explorar Catálogo
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {carrito.map(item => {
                    const esCaja   = item.tipoCompra === "caja";
                    const udsCaja  = item.unidadesPorCaja || 10;
                    const totalUds = esCaja ? item.cantidad * udsCaja : item.cantidad;
                    return (
                      <div key={item.id} style={{ display:"flex", gap:12, padding:"14px 16px", borderRadius:14, background:C.gray50, border:`1px solid ${C.gray200}` }}>
                        {/* Imagen */}
                        <div style={{ width:68, height:68, borderRadius:12, background:C.white, border:`1px solid ${C.gray200}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative", padding:6 }}>
                          <img src={item.imagenUrl||item.imagen_principal||"/placeholder-image.jpg"} alt={item.nombre}
                            style={{ width:"100%", height:"100%", objectFit:"contain" }}
                            onError={e => { (e.target as HTMLImageElement).src="/placeholder-image.jpg"; }} />
                          <div style={{ position:"absolute", top:-6, right:-6, width:20, height:20, borderRadius:"50%", background:C.purpleDark, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <span style={{ fontSize:9, fontWeight:900, color:C.white }}>{item.cantidad}</span>
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:4 }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <h4 style={{ fontSize:13, fontWeight:800, color:C.gray900, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.nombre||"Producto"}</h4>
                              <p style={{ fontSize:10, fontFamily:"monospace", color:C.gray400, margin:"2px 0 0" }}>SKU: {item.sku||item.id?.slice(0,8).toUpperCase()}</p>
                            </div>
                            <button onClick={() => eliminarDelCarrito(item.id)}
                              style={{ padding:6, borderRadius:8, background:"transparent", border:"none", cursor:"pointer", color:C.gray400, flexShrink:0, marginLeft:6 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#ef4444"; (e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.08)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color=C.gray400; (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Tipo + desglose */}
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                            <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:6, background:esCaja?`${C.orange}15`:`${C.purpleDark}15`, color:esCaja?C.orange:C.purpleDark, display:"inline-flex", alignItems:"center", gap:4 }}>
                              {esCaja ? <Package size={9}/> : <Box size={9}/>}
                              Por {esCaja?"caja":"unidad"}
                            </span>
                            {esCaja && (
                              <span style={{ fontSize:10, fontWeight:600, color:C.gray600 }}>
                                {item.cantidad} caja{item.cantidad!==1?"s":""} × {udsCaja} uds = <strong style={{ color:C.purpleDark }}>{totalUds} uds</strong>
                              </span>
                            )}
                          </div>

                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            {/* Controles */}
                            <div style={{ display:"flex", alignItems:"center", borderRadius:9, overflow:"hidden", border:`1px solid ${C.gray200}` }}>
                              <button onClick={() => { const n=(item.cantidad||1)-1; if(n<=0) eliminarDelCarrito(item.id); else actualizarCantidad(item.id,n); }}
                                style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", background:C.white, border:"none", cursor:"pointer", color:C.gray500 }}
                                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${C.purpleDark}10`;(e.currentTarget as HTMLElement).style.color=C.purpleDark;}}
                                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=C.white;(e.currentTarget as HTMLElement).style.color=C.gray500;}}>
                                <Minus size={12} />
                              </button>
                              <span style={{ width:36, textAlign:"center", fontSize:13, fontWeight:900, color:C.gray900, background:C.gray100 }}>{item.cantidad}</span>
                              <button onClick={() => actualizarCantidad(item.id,(item.cantidad||1)+1)}
                                style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", background:C.white, border:"none", cursor:"pointer", color:C.gray500 }}
                                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${C.purpleDark}10`;(e.currentTarget as HTMLElement).style.color=C.purpleDark;}}
                                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=C.white;(e.currentTarget as HTMLElement).style.color=C.gray500;}}>
                                <Plus size={12} />
                              </button>
                            </div>
                            {/* Precio */}
                            <div style={{ textAlign:"right" }}>
                              <p style={{ fontSize:15, fontWeight:900, color:C.orange, margin:0 }}>S/ {fmt((item.precioBase||0)*item.cantidad)}</p>
                              <p style={{ fontSize:10, color:C.gray400, margin:0 }}>S/ {fmt(item.precioBase||0)} c/{esCaja?"caja":"ud"}</p>
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
          <div style={{ position:"sticky", top:76, alignSelf:"start", display:"flex", flexDirection:"column", gap:16 }}>

            {/* Resumen IGV */}
            <div style={{ borderRadius:18, padding:22, border:`1px solid ${C.gray200}`, background:C.white, boxShadow:`0 2px 12px rgba(0,0,0,0.04)` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
                <Calculator size={17} style={{ color:C.purpleDark }} />
                <h3 style={{ fontSize:14, fontWeight:900, color:C.gray900, margin:0 }}>Resumen — IGV 18%</h3>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                {[
                  { label:"Subtotal",      sub:"Productos",     val:`S/ ${fmt(subtotal)}`,          color:C.gray800   },
                  ...(descuento>0 ? [{ label:`Descuento ${(descuento*100).toFixed(0)}%`, sub:"Por volumen", val:`-S/ ${fmt(descuentoMonto)}`, color:C.greenDark }] : []),
                  { label:"Base Imponible", sub:"Antes de IGV",  val:`S/ ${fmt(baseImponible)}`,     color:C.gray800   },
                  { label:"IGV (18%)",      sub:"Impuesto",      val:`S/ ${fmt(igv)}`,               color:C.orange    },
                  { label:"Envío",          sub:"Express 24-48h",val:envioCosto===0?"GRATIS":`S/ ${fmt(envioCosto)}`, color:envioCosto===0?C.greenDark:C.gray800 },
                ].map(({ label, sub, val, color }, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.gray100}` }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:C.gray700, margin:0 }}>{label}</p>
                      <p style={{ fontSize:10, color:C.gray400, margin:0 }}>{sub}</p>
                    </div>
                    <span style={{ fontSize:13, fontWeight:800, color }}>{val}</span>
                  </div>
                ))}

                {/* Total */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderRadius:12, background:`${C.purpleDark}08`, border:`1.5px solid ${C.purpleDark}25`, marginTop:12 }}>
                  <div>
                    <p style={{ fontSize:14, fontWeight:900, color:C.gray900, margin:0 }}>Total a Pagar</p>
                    <p style={{ fontSize:10, color:C.gray500, margin:0 }}>Incluye IGV · Factura Electrónica</p>
                  </div>
                  <p style={{ fontSize:26, fontWeight:900, color:C.purpleDark, margin:0 }}>S/ {fmt(totalFinal)}</p>
                </div>
              </div>

              {/* Botón confirmar */}
              <button onClick={handleFinalizarPedido}
                disabled={loading || carrito.length===0 || !envio.ruc || envio.ruc.length!==11}
                style={{ width:"100%", marginTop:16, padding:"14px", borderRadius:13, background:loading||carrito.length===0||!envio.ruc||envio.ruc.length!==11 ? C.gray300 : `linear-gradient(135deg,${C.purpleDark},${C.purple})`, color:C.white, border:"none", fontSize:13, fontWeight:900, cursor:loading||carrito.length===0||!envio.ruc||envio.ruc.length!==11?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:loading||carrito.length===0?"none":`0 4px 20px ${C.purpleDark}40`, transition:"all .2s" }}
                onMouseEnter={e => { if(!loading && carrito.length>0 && envio.ruc?.length===11) (e.currentTarget as HTMLElement).style.transform="translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="none"; }}>
                {loading
                  ? <><Loader2 size={17} style={{ animation:"spin .75s linear infinite" }} />Procesando Orden...</>
                  : carrito.length===0 ? "Agrega productos primero"
                  : !envio.ruc||envio.ruc.length!==11 ? "Ingresa RUC válido (11 dígitos)"
                  : <><Lock size={15} />Confirmar Orden<ArrowRight size={15}/></>}
              </button>

              {carrito.length>0 && (
                <button onClick={vaciarCarrito}
                  style={{ width:"100%", marginTop:8, padding:"10px", borderRadius:11, background:"transparent", border:"none", fontSize:12, fontWeight:600, color:C.gray400, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#ef4444";(e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.05)";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=C.gray400;(e.currentTarget as HTMLElement).style.background="transparent";}}>
                  <Trash2 size={13} />Vaciar carrito
                </button>
              )}
            </div>

            {/* Beneficios B2B */}
            <div style={{ borderRadius:18, padding:18, border:`1px solid ${C.gray200}`, background:C.white }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <Award size={15} style={{ color:C.yellow }} />
                <h3 style={{ fontSize:13, fontWeight:900, color:C.gray900, margin:0 }}>Ventajas</h3>
              </div>
              {[
                { icon:FileText,    color:C.purpleDark, title:"Factura Electrónica",     sub:"Validada por SUNAT"                },
                { icon:Percent,     color:C.greenDark,  title:"Descuentos por Volumen",  sub:"Hasta 20% en compras mayoristas"   },
                { icon:Truck,       color:C.orange,     title:"Envío a todo Perú",       sub:"Olva / Shalom / OTR Express"       },
                { icon:ShieldCheck, color:C.purpleDark, title:"Garantía de fábrica",     sub:"Todos los productos sellados"      },
              ].map(({ icon:Icon, color, title, sub }) => (
                <div key={title} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:10, background:C.gray50, border:`1px solid ${C.gray200}`, marginBottom:8 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:`${color}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div>
                    <p style={{ fontSize:12, fontWeight:800, color:C.gray900, margin:0 }}>{title}</p>
                    <p style={{ fontSize:10, color:C.gray500, margin:0 }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tip descuento */}
            {descuento===0 && totalItems<10 && (
              <div style={{ borderRadius:14, padding:14, background:`${C.yellow}08`, border:`1px solid ${C.yellow}30`, textAlign:"center" }}>
                <Zap size={18} style={{ color:C.orange, margin:"0 auto 6px", display:"block" }} />
                <p style={{ fontSize:12, fontWeight:900, color:C.gray800, margin:"0 0 4px" }}>¡Consigue descuentos!</p>
                <p style={{ fontSize:10, color:C.gray500, margin:0 }}>
                  Compra 10+ unidades → 5% OFF. 100+ uds → 20% OFF
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ marginTop:48, padding:"28px 16px", borderTop:`1px solid ${C.gray200}` }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24, marginBottom:20 }}>
            {[
              { title:"Tiendas Waly",     body:<p style={{ fontSize:12, color:C.gray500, margin:0 }}>Plataforma mayorista peruano.</p> },
              { title:"Soporte",          body:<><p style={{ fontSize:12, color:C.gray500, margin:"0 0 4px", display:"flex", alignItems:"center", gap:5 }}><Phone size={10}/>+51 1 640-9000</p><p style={{ fontSize:12, color:C.gray500, margin:0, display:"flex", alignItems:"center", gap:5 }}><Mail size={10}/>ventas@tiendaswaly.com</p></> },
              { title:"Bancos aceptados", body:<div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{["BCP","BBVA","Interbank"].map(b=><span key={b} style={{ padding:"3px 9px", borderRadius:8, fontSize:11, fontWeight:700, background:`${C.purpleDark}10`, color:C.purpleDark }}>{b}</span>)}</div> },
              { title:"RUC",              body:<><p style={{ fontSize:12, fontFamily:"monospace", fontWeight:700, color:C.gray700, margin:0 }}>20605467891</p><p style={{ fontSize:10, color:C.gray500, margin:"3px 0 0" }}>TIENDAS WALY SAC</p></> },
            ].map(({ title, body }) => (
              <div key={title}>
                <h4 style={{ fontSize:13, fontWeight:900, color:C.gray800, margin:"0 0 10px" }}>{title}</h4>
                {body}
              </div>
            ))}
          </div>
          <div style={{ paddingTop:16, textAlign:"center", fontSize:11, color:C.gray400, borderTop:`1px solid ${C.gray200}` }}>
            © {new Date().getFullYear()} Tiendas Waly SAC · RUC: 20605467891 · Todos los precios en S/ PEN
          </div>
        </div>
      </footer>
    </div>
  );
}