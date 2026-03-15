"use client";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  CreditCard, Landmark, ShieldCheck, Plus, Minus, Trash2,
  ChevronLeft, Lock, PackageCheck, Truck,
  CheckCircle2, Loader2, ShoppingBag,
  ArrowRight, Percent, Download,
  Building, FileText, Bell, Mail, Phone,
  Check, QrCode,
  FileSignature, Calculator, Award, Receipt,
  Eye, EyeOff, UserCheck, Target, BarChart3,
  Package, Zap
} from "lucide-react";

// ─── PALETA OFICIAL ────────────────────────────────────────────
const C = {
  orange:  "#FF6600",
  yellow:  "#F6FA00",
  green:   "#28FB4B",
  purple:  "#9851F9",
  purpleDark: "#7c3aed",
  black:   "#000000",
  white:   "#FFFFFF",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
} as const;

const fmt = (n: number) =>
  n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const simulatePayment = async (amount: number, method: string) =>
  new Promise(resolve =>
    setTimeout(() => resolve({
      success: true,
      transactionId: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount, method,
      timestamp: new Date().toISOString()
    }), 2000)
  );

// ─── INPUT REUTILIZABLE ────────────────────────────────────────
const Field = ({
  label, name, value, onChange, placeholder, type = "text",
  maxLength, required, className = "", readOnly = false
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; maxLength?: number;
  required?: boolean; className?: string; readOnly?: boolean;
}) => (
  <div>
    <label className="text-xs font-bold mb-1.5 block" style={{ color: C.gray600 }}>
      {label}{required && <span style={{ color: C.orange }}> *</span>}
    </label>
    <input
      name={name} value={value} onChange={onChange}
      placeholder={placeholder} type={type}
      maxLength={maxLength} readOnly={readOnly}
      className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border-2 ${className}`}
      style={{
        background: readOnly ? C.gray100 : C.white,
        borderColor: C.gray200,
        color: C.gray800,
      }}
      onFocus={e => { if (!readOnly) e.currentTarget.style.borderColor = C.purple; }}
      onBlur={e => { e.currentTarget.style.borderColor = C.gray200; }}
    />
  </div>
);

// ═════════════════════════════════════════════════════════════
export default function CarritoPage() {
  const { carrito, total, agregarAlCarrito, actualizarCantidad, reducirCantidad, eliminarDelCarrito, vaciarCarrito } = useCart();
  const router = useRouter();

  const [metodoPago, setMetodoPago] = useState<"tarjeta" | "transferencia">("transferencia");
  const [loading,           setLoading]           = useState(false);
  const [showModal,         setShowModal]          = useState(false);
  const [step,              setStep]               = useState(1);
  const [showConfirmation,  setShowConfirmation]   = useState(false);
  const [orderDetails,      setOrderDetails]       = useState<any>(null);
  const [showCardDetails,   setShowCardDetails]    = useState(false);

  const [envio, setEnvio] = useState({
    direccion: "", ciudad: "Lima", telefono: "",
    ruc: "", razonSocial: "", contacto: "", email: "", referencia: ""
  });
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "", expiry: "", cvv: "", cardholder: ""
  });

  useEffect(() => {
    const u = auth.currentUser;
    if (u) setEnvio(p => ({
      ...p,
      email:    u.email || "",
      contacto: u.displayName || u.email?.split("@")[0] || ""
    }));
  }, []);

  const handleInput  = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEnvio({ ...envio, [e.target.name]: e.target.value });
  const handleCardInput = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });

  // ── Cálculos IGV Perú ────────────────────────────────────────
  const totalItems     = carrito.reduce((a, i) => a + i.cantidad, 0);
  const descuento      = totalItems >= 100 ? 0.20 : totalItems >= 50 ? 0.15 : totalItems >= 20 ? 0.10 : totalItems >= 10 ? 0.05 : 0;
  const subtotal       = total;
  const descuentoMonto = subtotal * descuento;
  const baseImponible  = subtotal - descuentoMonto;
  const igv            = baseImponible * 0.18;
  const envioCosto     = carrito.length > 0 ? (subtotal > 1000 ? 0 : 25) : 0;
  const totalFinal     = baseImponible + envioCosto + igv;

  // ── Finalizar pedido ─────────────────────────────────────────
  const handleFinalizarPedido = async () => {
    const u = auth.currentUser;
    if (!u) { router.push("/login?redirect=/carrito"); return; }
    if (!envio.ruc || envio.ruc.length !== 11) {
      alert("Ingresa un RUC válido (11 dígitos).");
      return;
    }
    if (!envio.razonSocial) {
      alert("Ingresa la Razón Social para la factura.");
      return;
    }
    if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }

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
              items: itemsCopia.map(item => ({
                id:              item.id,
                nombre:          item.nombre || "Producto B2B",
                sku:             item.sku || "",
                precio:          Number(item.precioBase) || 0,
                cantidad:        Number(item.cantidad) || 1,
                imagen_principal: item.imagen_principal || item.imagenUrl || "",
                imagenUrl:       item.imagenUrl || item.imagen_principal || "",
                tipoCompra:      item.tipoCompra || "caja",
                unidadesPorCaja: item.unidadesPorCaja || 1,
              })),
              archived:         false,
              comprobanteUrl:   null,
              trackingNumber:   null,
              urgente:          false,
              nota:             `Pedido B2B - RUC: ${envio.ruc}`,
              notaInterna:      `Método: ${metodoPago} | Transacción: ${paymentResult.transactionId}`,
              fechaActualizacion: serverTimestamp(),
              historialEstados: [{
                estado:  "Pendiente",
                fecha:   new Date().toISOString(),
                usuario: u.email || "sistema",
                nota:    "Pedido creado desde carrito B2B"
              }]
            });

            // Actualizar stock
            for (const item of itemsCopia) {
              try {
                const idOriginal = item.idOriginal || item.id.replace(/-caja$|-unidad$/, "");
                await updateDoc(doc(db, "productos", idOriginal), {
                  stock_cajas:    item.tipoCompra === "caja"   ? increment(-item.cantidad) : increment(0),
                  stock_unidades: item.tipoCompra === "unidad" ? increment(-item.cantidad) : increment(0),
                });
              } catch (e) { console.error("Stock error:", e); }
            }

            setOrderDetails({
              id: docRef.id, total: totalFinal, items: itemsCopia,
              paymentId: paymentResult.transactionId,
              ruc: envio.ruc, razonSocial: envio.razonSocial
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

  const generateInvoice = () => {
    if (!orderDetails) return;
    alert(`✅ Factura generada\n\nPedido: #${orderDetails.id.substring(0, 8).toUpperCase()}\nRUC: ${envio.ruc}\nRazón Social: ${envio.razonSocial}\nTotal: S/ ${fmt(orderDetails.total)}\n\nSe enviará a: ${envio.email}`);
  };

  // ── Pasos del modal ──────────────────────────────────────────
  const STEPS = [
    { step: 1, title: "Validando Stock",    desc: "Verificación en almacén",      icon: PackageCheck },
    { step: 2, title: "Validación RUC",     desc: "Verificación SUNAT",           icon: FileText },
    { step: 3, title: "Procesando Pago",    desc: "Autorización bancaria",        icon: CreditCard },
    { step: 4, title: "Generando Pedido",   desc: "Creación en sistema",          icon: FileSignature },
    { step: 5, title: "Facturación",        desc: "Generando Factura Electrónica", icon: Receipt },
  ];

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ background: C.white }}>

      {/* ── Modal procesamiento ─────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-8 border shadow-2xl space-y-5"
            style={{ background: C.white, borderColor: `${C.purple}30` }}
          >
            {/* Icono */}
            <div className="text-center space-y-2">
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                style={{ background: `${C.purple}15`, border: `2px solid ${C.purple}30` }}
              >
                <Building size={28} style={{ color: C.purple }} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Procesando Orden B2B</h2>
              <p className="text-sm" style={{ color: C.gray500 }}>Validando RUC y datos SUNAT</p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {STEPS.map(({ step: s, title, desc, icon: Icon }) => (
                <div
                  key={s}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{
                    background: step >= s ? `${C.purple}08` : C.gray100,
                    borderColor: step >= s ? `${C.purple}25` : C.gray200,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: step >= s ? C.purple : C.gray200 }}
                  >
                    {step > s
                      ? <CheckCircle2 size={18} color={C.white} />
                      : step === s
                        ? <Loader2 size={18} color={C.white} className="animate-spin" />
                        : <Icon size={18} color={C.gray400} />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{title}</p>
                    <p className="text-xs" style={{ color: C.gray500 }}>{desc}</p>
                  </div>
                  {step === s && (
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: `${C.purple}15`, color: C.purple }}
                    >
                      En proceso
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Barra progreso */}
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: C.gray500 }}>
                <span>Progreso: {Math.round((step / 5) * 100)}%</span>
                <span>Paso {step} de 5</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: C.gray200 }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(step / 5) * 100}%`, background: `linear-gradient(90deg,${C.purple},${C.orange})` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmación ──────────────────────────────── */}
      {showConfirmation && orderDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-8 border shadow-2xl relative"
            style={{ background: C.white, borderColor: `${C.purple}25` }}
          >
            {/* Check badge */}
            <div
              className="absolute -top-4 -right-4 w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: C.green }}
            >
              <Check size={24} color={C.black} />
            </div>

            <div className="text-center mb-6">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ background: `${C.green}15` }}
              >
                <CheckCircle2 size={40} style={{ color: C.green }} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">¡Orden Confirmada!</h2>
              <p className="text-sm" style={{ color: C.gray500 }}>Tu pedido B2B fue procesado exitosamente</p>
              <div
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-sm font-mono border"
                style={{ background: C.gray100, borderColor: C.gray200, color: C.gray600 }}
              >
                #{orderDetails.id.substring(0, 8).toUpperCase()}
                <span style={{ color: C.green }}>• RUC: {orderDetails.ruc}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
              <div
                className="rounded-xl p-4 border"
                style={{ background: `${C.purple}06`, borderColor: `${C.purple}20` }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.purple }}>
                  Detalles de Pago
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: C.gray500 }}>Total:</span>
                    <span className="font-black text-gray-900">S/ {fmt(orderDetails.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: C.gray500 }}>IGV 18%:</span>
                    <span className="font-medium text-gray-700">S/ {fmt(orderDetails.total * 0.18 / 1.18)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: C.gray500 }}>ID:</span>
                    <span className="font-mono text-xs text-gray-600 truncate max-w-[100px]">{orderDetails.paymentId}</span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4 border"
                style={{ background: `${C.orange}06`, borderColor: `${C.orange}20` }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.orange }}>
                  Próximos Pasos
                </h3>
                <div className="space-y-2">
                  {[
                    { icon: Mail,  color: C.purple, text: `Factura a ${envio.email.split("@")[0]}…` },
                    { icon: Truck, color: C.green,  text: "Envío 24-48h hábiles" },
                    { icon: FileText, color: C.orange, text: `RUC ${envio.ruc} verificado` },
                  ].map(({ icon: Icon, color, text }, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs" style={{ color: C.gray600 }}>
                      <Icon size={13} style={{ color }} />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirmation(false); router.push("/catalogo"); }}
                className="flex-1 py-3.5 rounded-xl font-black text-sm text-white transition-all"
                style={{ background: C.purple, boxShadow: `0 4px 16px ${C.purple}40` }}
                onMouseEnter={e => (e.currentTarget.style.background = C.purpleDark)}
                onMouseLeave={e => (e.currentTarget.style.background = C.purple)}
              >
                Seguir comprando
              </button>
              <button
                onClick={generateInvoice}
                className="flex-1 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 border transition-all"
                style={{ background: C.white, borderColor: C.gray200, color: C.gray700 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.purple; (e.currentTarget as HTMLElement).style.color = C.purple; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gray200; (e.currentTarget as HTMLElement).style.color = C.gray700; }}
              >
                <Download size={16} />
                Descargar Factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 px-4"
        style={{ background: C.white, borderBottom: `1px solid ${C.gray200}` }}
      >
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: C.gray500 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.purple)}
            onMouseLeave={e => (e.currentTarget.style.color = C.gray500)}
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Continuar comprando</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.green }} />
              <span className="text-xs font-bold" style={{ color: C.green }}>B2B Perú</span>
            </div>
            <h1 className="text-lg font-black" style={{ color: C.gray100 }}>
              Checkout <span style={{ color: C.purple }}>B2B</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ShoppingBag size={20} style={{ color: C.gray400 }} />
            <span className="text-xs font-bold" style={{ color: C.gray600 }}>
              {carrito.length} {carrito.length === 1 ? "producto" : "productos"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ══ COLUMNA IZQUIERDA ══════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6">

            {/* ── Datos facturación ─────────────────────────── */}
            <section
              className="rounded-2xl p-6 border"
              style={{ background: C.white, borderColor: C.gray200 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${C.purple}12` }}
                >
                  <Building size={20} style={{ color: C.purple }} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Datos para Facturación</h3>
                  <p className="text-xs" style={{ color: C.gray500 }}>RUC y Razón Social — Obligatorio</p>
                </div>
                <div
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold"
                  style={{ background: `${C.orange}08`, borderColor: `${C.orange}25`, color: C.orange }}
                >
                  <Target size={12} /> SUNAT
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="RUC" name="ruc" value={envio.ruc} onChange={handleInput}
                  placeholder="20XXXXXXXXX" maxLength={11} required />
                <div className="sm:col-span-2">
                  <Field label="Razón Social" name="razonSocial" value={envio.razonSocial}
                    onChange={handleInput} placeholder="EMPRESA SAC" required />
                </div>
                <Field label="Contacto" name="contacto" value={envio.contacto}
                  onChange={handleInput} placeholder="Nombre del responsable" />
                <Field label="Email Facturación" name="email" value={envio.email}
                  onChange={handleInput} placeholder="facturacion@empresa.com" type="email" required />
                <div className="sm:col-span-2">
                  <Field label="Dirección de Entrega" name="direccion" value={envio.direccion}
                    onChange={handleInput} placeholder="Av. Principal 123, Lima" />
                </div>
                <Field label="Teléfono" name="telefono" value={envio.telefono}
                  onChange={handleInput} placeholder="+51 999 888 777" />
                <Field label="Referencia" name="referencia" value={envio.referencia}
                  onChange={handleInput} placeholder="Piso, oficina, interior" />
              </div>
            </section>

            {/* ── Método de pago ────────────────────────────── */}
            <section
              className="rounded-2xl p-6 border"
              style={{ background: C.white, borderColor: C.gray200 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${C.green}12` }}
                >
                  <CreditCard size={20} style={{ color: C.green }} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Método de Pago</h3>
                  <p className="text-xs" style={{ color: C.gray500 }}>Selecciona tu forma de pago</p>
                </div>
                <ShieldCheck size={18} style={{ color: C.green, marginLeft: "auto" }} />
              </div>

              {/* Selector */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {([
                  { id: "transferencia", icon: Landmark, label: "Transferencia", sub: "BCP/BBVA/Interbank", color: C.green },
                  { id: "tarjeta",       icon: CreditCard, label: "Tarjeta",  sub: "Visa/Mastercard",  color: C.purple },
                ] as const).map(({ id, icon: Icon, label, sub, color }) => (
                  <button
                    key={id}
                    onClick={() => setMetodoPago(id)}
                    className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all"
                    style={{
                      borderColor: metodoPago === id ? color : C.gray200,
                      background:  metodoPago === id ? `${color}0d` : C.white,
                    }}
                  >
                    <Icon size={22} style={{ color: metodoPago === id ? color : C.gray400 }} />
                    <span className="text-xs font-black" style={{ color: metodoPago === id ? color : C.gray600 }}>{label}</span>
                    <span className="text-[10px]" style={{ color: C.gray400 }}>{sub}</span>
                  </button>
                ))}
              </div>

              {/* Transferencia info */}
              {metodoPago === "transferencia" && (
                <div
                  className="rounded-xl p-4 border space-y-2"
                  style={{ background: C.gray100, borderColor: C.gray200 }}
                >
                  <h4 className="text-sm font-black text-gray-800 mb-3">Datos para Transferencia — BCP</h4>
                  {[
                    ["Banco",             "BCP"],
                    ["Cuenta Corriente",  "191-23456789-0-99"],
                    ["CCI",               "00219100234567899099"],
                    ["Titular",           "TIENDAS WALY SAC"],
                    ["RUC",               "20605467891"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center p-2.5 rounded-lg" style={{ background: C.white }}>
                      <span className="text-xs" style={{ color: C.gray500 }}>{k}:</span>
                      <span className="text-xs font-bold font-mono text-gray-800">{v}</span>
                    </div>
                  ))}
                  <div
                    className="mt-3 p-3 rounded-lg border text-xs"
                    style={{ background: `${C.purple}08`, borderColor: `${C.purple}20`, color: C.purple }}
                  >
                    <strong>Importante:</strong> Envía el comprobante a facturacion@tiendaswaly.com con tu RUC y número de pedido.
                  </div>
                </div>
              )}

              {/* Tarjeta */}
              {metodoPago === "tarjeta" && (
                <div
                  className="rounded-xl p-4 border"
                  style={{ background: C.gray100, borderColor: C.gray200 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-gray-800">Detalles de Tarjeta</h4>
                    <button
                      onClick={() => setShowCardDetails(!showCardDetails)}
                      className="flex items-center gap-1 text-xs font-semibold transition-colors"
                      style={{ color: C.purple }}
                    >
                      {showCardDetails ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showCardDetails ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Field label="Número de Tarjeta" name="cardNumber"
                        value={paymentDetails.cardNumber} onChange={handleCardInput}
                        placeholder="1234 5678 9012 3456"
                        type={showCardDetails ? "text" : "password"} maxLength={19} />
                    </div>
                    <Field label="Válida hasta" name="expiry"
                      value={paymentDetails.expiry} onChange={handleCardInput}
                      placeholder="MM/AA" maxLength={5} />
                    <Field label="CVV" name="cvv"
                      value={paymentDetails.cvv} onChange={handleCardInput}
                      placeholder="123" type={showCardDetails ? "text" : "password"} maxLength={3} />
                    <div className="col-span-2">
                      <Field label="Nombre del Titular" name="cardholder"
                        value={paymentDetails.cardholder} onChange={handleCardInput}
                        placeholder="Como aparece en la tarjeta" />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ── Productos ─────────────────────────────────── */}
            <section
              className="rounded-2xl p-6 border"
              style={{ background: C.white, borderColor: C.gray200 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${C.orange}12` }}
                >
                  <PackageCheck size={20} style={{ color: C.orange }} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Resumen de Productos</h3>
                  <p className="text-xs" style={{ color: C.gray500 }}>
                    {carrito.length} {carrito.length === 1 ? "producto" : "productos"} en tu orden
                  </p>
                </div>
              </div>

              {carrito.length === 0 ? (
                <div className="text-center py-14">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: C.gray100 }}
                  >
                    <ShoppingBag size={32} style={{ color: C.gray300 }} />
                  </div>
                  <h4 className="text-lg font-black text-gray-800 mb-2">Carrito vacío</h4>
                  <p className="text-sm mb-6" style={{ color: C.gray500 }}>
                    Agrega productos desde nuestro catálogo B2B
                  </p>
                  <button
                    onClick={() => router.push("/catalogo")}
                    className="inline-flex items-center gap-2 px-6 py-3 text-white font-black text-sm rounded-xl transition-all"
                    style={{ background: C.purple, boxShadow: `0 4px 16px ${C.purple}40` }}
                  >
                    <Building size={16} />
                    Explorar Catálogo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map(item => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-4 rounded-xl border transition-all"
                      style={{ background: C.gray100, borderColor: C.gray200 }}
                    >
                      {/* Imagen */}
                      <div
                        className="w-18 h-18 rounded-xl shrink-0 flex items-center justify-center p-2 relative"
                        style={{ background: C.white, border: `1px solid ${C.gray200}`, width: "72px", height: "72px" }}
                      >
                        <img
                          src={item.imagenUrl || item.imagen_principal || "/placeholder-image.jpg"}
                          alt={item.nombre}
                          className="w-full h-full object-contain"
                          onError={e => { (e.target as HTMLImageElement).src = "/placeholder-image.jpg"; }}
                        />
                        <div
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                          style={{ background: C.purple }}
                        >
                          {item.cantidad}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h4 className="text-sm font-black text-gray-900 leading-tight line-clamp-1">
                              {item.nombre || "Producto"}
                            </h4>
                            <p className="text-[10px] font-mono mt-0.5" style={{ color: C.gray500 }}>
                              SKU: {item.sku || item.id?.substring(0, 8).toUpperCase()}
                            </p>
                            {item.tipoCompra && (
                              <span
                                className="inline-block mt-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
                                style={{
                                  background: item.tipoCompra === "caja" ? `${C.orange}15` : `${C.purple}15`,
                                  color: item.tipoCompra === "caja" ? C.orange : C.purple,
                                }}
                              >
                                Por {item.tipoCompra}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => eliminarDelCarrito(item.id)}
                            className="p-1.5 rounded-lg transition-colors shrink-0"
                            style={{ color: C.gray400 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.gray400; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Controles cantidad */}
                          <div
                            className="flex items-center rounded-lg overflow-hidden border"
                            style={{ borderColor: C.gray300 }}
                          >
                            <button
                              onClick={() => {
                                const nueva = (item.cantidad || 1) - 1;
                                if (nueva <= 0) eliminarDelCarrito(item.id);
                                else actualizarCantidad(item.id, nueva);
                              }}
                              className="w-8 h-8 flex items-center justify-center transition-colors"
                              style={{ background: C.white, color: C.gray500 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${C.purple}10`; (e.currentTarget as HTMLElement).style.color = C.purple; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.white; (e.currentTarget as HTMLElement).style.color = C.gray500; }}
                            >
                              <Minus size={13} />
                            </button>
                            <span
                              className="w-10 text-center text-sm font-black text-gray-900"
                              style={{ background: C.gray100 }}
                            >
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => actualizarCantidad(item.id, (item.cantidad || 1) + 1)}
                              className="w-8 h-8 flex items-center justify-center transition-colors"
                              style={{ background: C.white, color: C.gray500 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${C.purple}10`; (e.currentTarget as HTMLElement).style.color = C.purple; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.white; (e.currentTarget as HTMLElement).style.color = C.gray500; }}
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          {/* Precio */}
                          <div className="text-right">
                            <p className="text-base font-black" style={{ color: C.orange }}>
                              S/ {fmt((item.precioBase || 0) * item.cantidad)}
                            </p>
                            <p className="text-[10px]" style={{ color: C.gray500 }}>
                              S/ {fmt(item.precioBase || 0)} c/u
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ══ COLUMNA DERECHA ════════════════════════════════ */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-5">

              {/* ── Resumen de compra ─────────────────────────── */}
              <div
                className="rounded-2xl p-6 border"
                style={{ background: C.white, borderColor: C.gray200 }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Calculator size={18} style={{ color: C.purple }} />
                  <h3 className="text-base font-black text-gray-900">Resumen — IGV 18%</h3>
                </div>

                <div className="space-y-3 mb-5">
                  {[
                    { label: "Subtotal", sub: "Productos", val: `S/ ${fmt(subtotal)}`, highlight: false },
                    ...(descuento > 0 ? [{
                      label: `Descuento ${(descuento * 100).toFixed(0)}%`, sub: "Por volumen",
                      val: `-S/ ${fmt(descuentoMonto)}`, highlight: true, color: C.green
                    }] : []),
                    { label: "Base Imponible", sub: "Antes de IGV", val: `S/ ${fmt(baseImponible)}`, highlight: false },
                    { label: "IGV (18%)", sub: "Impuesto General", val: `S/ ${fmt(igv)}`, highlight: false, color: C.orange },
                    { label: "Envío", sub: "Express 24-48h", val: envioCosto === 0 ? "GRATIS" : `S/ ${fmt(envioCosto)}`, highlight: envioCosto === 0, color: envioCosto === 0 ? C.green : undefined },
                  ].map(({ label, sub, val, highlight, color }, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-2.5"
                      style={{ borderBottom: `1px solid ${C.gray100}` }}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-700" style={highlight && color ? { color } : undefined}>{label}</p>
                        <p className="text-[10px]" style={{ color: C.gray400 }}>{sub}</p>
                      </div>
                      <span
                        className="text-sm font-black"
                        style={{ color: color || C.gray800 }}
                      >
                        {val}
                      </span>
                    </div>
                  ))}

                  {/* Total */}
                  <div
                    className="flex justify-between items-center py-4 px-4 rounded-xl border mt-2"
                    style={{ background: `${C.purple}08`, borderColor: `${C.purple}25` }}
                  >
                    <div>
                      <p className="text-base font-black text-gray-900">Total a Pagar</p>
                      <p className="text-[10px]" style={{ color: C.gray500 }}>Incluye IGV • Factura Electrónica</p>
                    </div>
                    <p className="text-3xl font-black" style={{ color: C.purple }}>
                      S/ {fmt(totalFinal)}
                    </p>
                  </div>
                </div>

                {/* Botón confirmar */}
                <button
                  onClick={handleFinalizarPedido}
                  disabled={loading || carrito.length === 0 || !envio.ruc || envio.ruc.length !== 11}
                  className="w-full py-4 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 mb-3 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: loading || carrito.length === 0 || !envio.ruc || envio.ruc.length !== 11
                      ? C.gray300
                      : C.purple,
                    boxShadow: loading || carrito.length === 0 ? "none" : `0 4px 20px ${C.purple}40`,
                  }}
                  onMouseEnter={e => { if (!loading && carrito.length > 0 && envio.ruc?.length === 11) (e.currentTarget as HTMLElement).style.background = C.purpleDark; }}
                  onMouseLeave={e => { if (!loading && carrito.length > 0 && envio.ruc?.length === 11) (e.currentTarget as HTMLElement).style.background = C.purple; }}
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={18} />Procesando Orden...</>
                  ) : carrito.length === 0 ? (
                    "Agrega productos primero"
                  ) : !envio.ruc || envio.ruc.length !== 11 ? (
                    "Ingresa RUC válido (11 dígitos)"
                  ) : (
                    <><Lock size={16} />Confirmar Orden B2B<ArrowRight size={16} /></>
                  )}
                </button>

                {carrito.length > 0 && (
                  <button
                    onClick={vaciarCarrito}
                    className="w-full py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    style={{ color: C.gray500 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.05)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.gray500; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <Trash2 size={15} />
                    Vaciar carrito
                  </button>
                )}
              </div>

              {/* ── Beneficios B2B ─────────────────────────────── */}
              <div
                className="rounded-2xl p-5 border"
                style={{ background: C.white, borderColor: C.gray200 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Award size={16} style={{ color: C.yellow }} />
                  <h3 className="text-sm font-black text-gray-900">Ventajas B2B</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: FileText, color: C.purple, title: "Factura Electrónica", sub: "Validada por SUNAT" },
                    { icon: Percent,  color: C.green,  title: "Descuentos por Volumen", sub: "Hasta 20% en compras mayoristas" },
                    { icon: Truck,    color: C.orange, title: "Envío a todo Perú", sub: "Olva / Shalom / OTR Express" },
                    { icon: ShieldCheck, color: C.purple, title: "Garantía de fábrica", sub: "Todos los productos sellados" },
                  ].map(({ icon: Icon, color, title, sub }) => (
                    <div
                      key={title}
                      className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ background: C.gray100, borderColor: C.gray200 }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${color}15` }}
                      >
                        <Icon size={16} style={{ color }} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-800">{title}</p>
                        <p className="text-[10px]" style={{ color: C.gray500 }}>{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Descuentos por volumen ─────────────────────── */}
              {descuento === 0 && totalItems < 10 && (
                <div
                  className="rounded-2xl p-4 border text-center"
                  style={{ background: `${C.yellow}08`, borderColor: `${C.yellow}30` }}
                >
                  <Zap size={20} style={{ color: C.orange, margin: "0 auto 8px" }} />
                  <p className="text-xs font-black text-gray-800 mb-1">¡Consigue descuentos!</p>
                  <p className="text-[10px]" style={{ color: C.gray500 }}>
                    Compra 10+ unidades y obtén 5% OFF. Más de 100 uds = 20% OFF
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer
        className="mt-12 py-8"
        style={{ borderTop: `1px solid ${C.gray200}` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            {[
              { title: "Tiendas Waly",    content: <p className="text-xs" style={{ color: C.gray500 }}>Plataforma B2B especializada en comercio mayorista peruano.</p> },
              { title: "Soporte",         content: <div className="space-y-1"><p className="text-xs flex items-center gap-1.5" style={{ color: C.gray500 }}><Phone size={11} />+51 1 640-9000</p><p className="text-xs flex items-center gap-1.5" style={{ color: C.gray500 }}><Mail size={11} />ventas@tiendaswaly.com</p></div> },
              { title: "Bancos aceptados", content: <div className="flex flex-wrap gap-1.5">{["BCP","BBVA","Interbank"].map(b => <span key={b} className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: `${C.purple}10`, color: C.purple }}>{b}</span>)}</div> },
              { title: "RUC",             content: <><p className="text-xs font-mono font-bold text-gray-700">20605467891</p><p className="text-[10px] mt-0.5" style={{ color: C.gray500 }}>TIENDAS WALY SAC</p></> },
            ].map(({ title, content }) => (
              <div key={title}>
                <h4 className="text-sm font-black text-gray-800 mb-3">{title}</h4>
                {content}
              </div>
            ))}
          </div>
          <div
            className="pt-6 text-center text-xs"
            style={{ borderTop: `1px solid ${C.gray200}`, color: C.gray400 }}
          >
            © {new Date().getFullYear()} Tiendas Waly SAC • RUC: 20605467891 • Todos los precios en S/ PEN
          </div>
        </div>
      </footer>
    </div>
  );
}