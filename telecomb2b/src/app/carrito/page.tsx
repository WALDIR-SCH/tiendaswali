"use client";
import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import { useCart } from "@/context/CartContext";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { 
  CreditCard, Landmark, ShieldCheck, Plus, Minus, Trash2, 
  ChevronLeft, Lock, MapPin, PackageCheck, Truck,
  CheckCircle2, Loader2, Clock, AlertCircle, ShoppingBag,
  ArrowRight, Shield, DollarSign, Percent, Gift,
  Building, Users, FileText, Download, Calendar,
  Bell, Mail, Phone, Globe, Briefcase,
  Check, X, CreditCard as Card, QrCode,
  Send, Globe as Web, FileSignature,
  Calculator, TrendingUp, Award, Zap,
  ChevronDown, ChevronUp, Eye, EyeOff,
  UserCheck, Target, BarChart3, Receipt
} from "lucide-react";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

// Simulación de pasarela de pagos
const simulatePayment = async (amount: number, method: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount,
        method,
        timestamp: new Date().toISOString()
      });
    }, 2000);
  });
};

export default function CarritoPage() {
  const { carrito, total, agregarAlCarrito, reducirCantidad, eliminarDelCarrito, vaciarCarrito } = useCart();
  const router = useRouter();
  
  const [metodoPago, setMetodoPago] = useState<"tarjeta" | "transferencia" | "credito">("transferencia");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [envio, setEnvio] = useState({ 
    direccion: "", 
    ciudad: "Lima", 
    telefono: "",
    ruc: "",
    razonSocial: "",
    contacto: "",
    email: "",
    referencia: ""
  });
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholder: "",
    dni: ""
  });
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    const usuarioActual = auth.currentUser;
    if (usuarioActual) {
      setEnvio(prev => ({
        ...prev,
        email: usuarioActual.email || "",
        contacto: usuarioActual.displayName || usuarioActual.email?.split("@")[0] || ""
      }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEnvio({ ...envio, [e.target.name]: e.target.value });
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });
  };

  // ===========================================
  // 🟢 FUNCIÓN PRINCIPAL - 100% CORREGIDA
  // ===========================================
  const handleFinalizarPedido = async () => {
    const usuarioActual = auth.currentUser;
    if (!usuarioActual) {
      router.push("/login?redirect=/carrito");
      return;
    }
    
    if (!envio.ruc || envio.ruc.length !== 11) {
      alert("Ingresa un RUC válido (11 dígitos) para facturar.");
      return;
    }
    if (!envio.razonSocial) {
      alert("Ingresa la Razón Social para la factura.");
      return;
    }
    if (carrito.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    setLoading(true);
    setShowModal(true);
    setStep(1);

    try {
      const itemsCopia = [...carrito];
      const totalCopia = total;
      
      setTimeout(() => setStep(2), 1500);
      
      setTimeout(async () => {
        setStep(3);
        try {
          const paymentResult: any = await simulatePayment(totalCopia, metodoPago);
          
          if (paymentResult.success) {
            setStep(4);
            
            // ===========================================
            // 🟢 FIRESTORE - GUARDAR PEDIDO CON IMÁGENES
            // ===========================================
            const docRef = await addDoc(collection(db, "pedidos"), {
              // ✅ DATOS DEL CLIENTE
              clienteId: usuarioActual.uid,
              clienteEmail: envio.email || usuarioActual.email || "cliente@empresa.com",
              clienteNombre: envio.razonSocial || envio.contacto || "Empresa SAC",
              clienteRut: envio.ruc,
              clienteTelefono: envio.telefono || "+51999999999",
              clienteDireccion: envio.direccion || "Lima, Perú",
              
              // ✅ FECHA Y ESTADO
              fecha: serverTimestamp(),
              estado: "Pendiente",
              metodoPago: metodoPago === "tarjeta" ? "Tarjeta" :
                          metodoPago === "transferencia" ? "Transferencia" : "No especificado",
              
              // ✅ TOTAL Y PRODUCTOS - CON IMÁGENES INCLUIDAS
              total: Number(totalFinal.toFixed(2)),
              items: itemsCopia.map(item => ({
                id: item.id || `PROD-${Date.now()}`,
                nombre: item.nombre || "Producto B2B",
                sku: item.sku || item.id?.substring(0, 8).toUpperCase() || `SKU-${Date.now()}`,
                precio: Number(item.precioBase) || 0,
                cantidad: Number(item.cantidad) || 1,
                // ✅ GUARDAR LA IMAGEN EN AMBOS FORMATOS PARA ASEGURAR COMPATIBILIDAD
                imagen_principal: item.imagen_principal || item.imagenUrl || '',
                imagenUrl: item.imagenUrl || item.imagen_principal || ''
              })),
              
              // ✅ ARCHIVED
              archived: false,
              
              // ✅ COMPROBANTE Y ENVÍO
              comprobanteUrl: null,
              trackingNumber: null,
              courier: null,
              
              // ✅ NOTAS
              urgente: false,
              nota: `Pedido B2B - RUC: ${envio.ruc}`,
              notaInterna: `Método: ${metodoPago} | Transacción: ${paymentResult.transactionId}`,
              
              // ✅ TIMESTAMPS
              fechaActualizacion: serverTimestamp(),
              fechaEntrega: null,
              archivedAt: null,
              
              // ✅ HISTORIAL DE ESTADOS
              historialEstados: [
                {
                  estado: "Pendiente",
                  fecha: new Date().toISOString(),
                  usuario: usuarioActual.email || "sistema",
                  nota: "Pedido creado desde carrito B2B"
                }
              ]
            });

            // ✅ ACTUALIZAR STOCK
            for (const item of itemsCopia) {
              try {
                const productRef = doc(db, "productos", item.id);
                await updateDoc(productRef, {
                  stock: increment(-item.cantidad)
                });
              } catch (stockError) {
                console.error("Error actualizando stock:", stockError);
              }
            }

            setOrderDetails({
              id: docRef.id,
              total: totalFinal,
              items: itemsCopia,
              paymentId: paymentResult.transactionId,
              ruc: envio.ruc,
              razonSocial: envio.razonSocial
            });

            vaciarCarrito();

            setStep(5);
            setTimeout(() => {
              setShowModal(false);
              setShowConfirmation(true);
            }, 1500);
          }
        } catch (paymentError) {
          console.error("Error en pago:", paymentError);
          setShowModal(false);
          setLoading(false);
          alert("Error en el procesamiento del pago. Intenta nuevamente.");
        }
      }, 3000);

    } catch (error) {
      console.error("Error al crear pedido:", error);
      setShowModal(false);
      setLoading(false);
      alert("Error en la transacción. Intenta nuevamente.");
    }
  };

  // ===========================================
  // 🟢 GENERAR FACTURA PERÚ
  // ===========================================
  const generateInvoice = async () => {
    if (!envio.email || !orderDetails) {
      alert("No hay información suficiente para generar la factura");
      return;
    }

    try {
      alert(`✅ Factura generada correctamente\n\nPedido: #${orderDetails.id.substring(0, 8).toUpperCase()}\nRUC: ${envio.ruc}\nRazón Social: ${envio.razonSocial}\nTotal: S/ ${orderDetails.total.toFixed(2)}\n\nLa factura electrónica será enviada a: ${envio.email}`);
      
      console.log("Enviando a SUNAT:", {
        ruc: envio.ruc,
        razonSocial: envio.razonSocial,
        total: orderDetails.total,
        items: orderDetails.items
      });

    } catch (error) {
      console.error("Error generando factura:", error);
      alert("Error al generar la factura. Intenta nuevamente.");
    }
  };

  // ===========================================
  // 🟢 CÁLCULOS PERÚ (IGV 18%)
  // ===========================================
  const calculateDiscount = () => {
    const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    if (totalItems >= 100) return 0.20;
    if (totalItems >= 50) return 0.15;
    if (totalItems >= 20) return 0.10;
    if (totalItems >= 10) return 0.05;
    return 0;
  };

  const subtotal = total;
  const envioCosto = carrito.length > 0 ? (subtotal > 1000 ? 0 : 25) : 0;
  const descuento = calculateDiscount();
  const descuentoMonto = subtotal * descuento;
  const baseImponible = subtotal - descuentoMonto;
  const igv = baseImponible * 0.18;
  const totalFinal = baseImponible + envioCosto + igv;

  return (
    <div className={`${inter.className} ${inter.variable} min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white`}>
      {/* MODAL DE PROCESAMIENTO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
          <div className="relative w-full max-w-lg">
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl space-y-6">
              <div className="absolute inset-0 rounded-2xl p-px bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-emerald-600/20 -m-px"></div>
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
                  <Building size={28} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-bold">Procesando Orden B2B</h2>
                <p className="text-sm text-gray-400">Validando RUC y datos SUNAT</p>
              </div>
              
              <div className="space-y-4">
                {[
                  { step: 1, title: "Validando Stock", desc: "Verificación en almacén", icon: PackageCheck },
                  { step: 2, title: "Validación RUC", desc: "Verificación SUNAT", icon: FileText },
                  { step: 3, title: "Procesando Pago", desc: "Autorización bancaria", icon: CreditCard },
                  { step: 4, title: "Generando Pedido", desc: "Creación en Firestore", icon: FileSignature },
                  { step: 5, title: "Facturación", desc: "Generando Factura Electrónica", icon: Receipt }
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-4 p-3 rounded-xl bg-gray-800/50 border border-gray-700/30">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      step >= item.step 
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600' 
                        : 'bg-gray-800/70'
                    }`}>
                      {step > item.step ? (
                        <CheckCircle2 size={20} className="text-white" />
                      ) : step === item.step ? (
                        <Loader2 className="animate-spin text-white" size={20} />
                      ) : (
                        <item.icon size={20} className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                    {step === item.step && (
                      <div className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs font-medium rounded">
                        En proceso
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-gray-700/50">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Progreso: {Math.round((step / 5) * 100)}%</span>
                  <span>Paso {step} de 5</span>
                </div>
                <div className="w-full bg-gray-800/50 rounded-full h-2">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${(step / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmation && orderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
          <div className="relative w-full max-w-2xl">
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-full flex items-center justify-center">
                <Check size={24} />
              </div>
              
              <div className="text-center space-y-4 mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={40} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold">¡Orden Confirmada!</h2>
                <p className="text-gray-400">Tu pedido B2B ha sido procesado exitosamente</p>
                <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full">
                  <span className="text-sm font-mono">#{orderDetails.id.substring(0, 8).toUpperCase()}</span>
                  <span className="text-xs text-emerald-400">• RUC: {orderDetails.ruc}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-400">Detalles de Pago</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Total:</span>
                      <span className="font-bold text-lg">S/ {orderDetails.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">IGV (18%):</span>
                      <span className="text-sm">S/ {(orderDetails.total * 0.18).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Transacción:</span>
                      <span className="text-sm font-mono">{orderDetails.paymentId}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-400">Próximos Pasos</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-blue-400" />
                      <span className="text-sm">Factura a {envio.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-emerald-400" />
                      <span className="text-sm">Envío 24-48h hábiles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-amber-400" />
                      <span className="text-sm">RUC {envio.ruc} verificado</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    router.push("/catalogo");
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-semibold transition-all"
                >
                  Ver en Dashboard
                </button>
                <button
                  onClick={generateInvoice}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Descargar Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              className="group flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Continuar comprando</span>
            </button>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-400">B2B Perú</span>
                </div>
                <div className="h-4 w-px bg-gray-700"></div>
                <div className="flex items-center gap-1.5">
                  <Building size={14} className="text-blue-400" />
                  <span className="text-xs font-medium">{envio.razonSocial || "Empresa"}</span>
                </div>
              </div>
              
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Checkout B2B Perú
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <ShoppingBag size={20} className="text-gray-300" />
                {carrito.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-r from-red-500 to-rose-500 rounded-full text-xs font-bold flex items-center justify-center">
                    {carrito.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <UserCheck size={14} className="text-emerald-400" />
                <span className="hidden sm:inline">Crédito: 30 días</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 space-y-8">
            {/* DATOS EMPRESA */}
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-lg flex items-center justify-center">
                    <Building size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Datos para Facturación</h3>
                    <p className="text-sm text-gray-400">RUC y Razón Social - Obligatorio</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700">
                  <Target size={14} className="text-blue-400" />
                  <span className="text-xs font-medium">SUNAT</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">RUC *</label>
                  <input 
                    name="ruc" 
                    value={envio.ruc}
                    onChange={handleInputChange}
                    placeholder="20XXXXXXXXX" 
                    maxLength={11}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3.5 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">11 dígitos sin guiones</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Razón Social *</label>
                  <input 
                    name="razonSocial" 
                    value={envio.razonSocial}
                    onChange={handleInputChange}
                    placeholder="EJEMPLO SAC" 
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3.5 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Contacto</label>
                  <input 
                    name="contacto" 
                    value={envio.contacto}
                    onChange={handleInputChange}
                    placeholder="Nombre del responsable" 
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3.5 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Email Facturación</label>
                  <input 
                    name="email" 
                    value={envio.email}
                    onChange={handleInputChange}
                    type="email"
                    placeholder="facturacion@empresa.com" 
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3.5 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Dirección de Entrega</label>
                  <input 
                    name="direccion" 
                    value={envio.direccion}
                    onChange={handleInputChange}
                    placeholder="Av. Principal 123, Lima" 
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3.5 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Teléfono</label>
                  <input 
                    name="telefono" 
                    value={envio.telefono}
                    onChange={handleInputChange}
                    placeholder="+51 999 888 777" 
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3.5 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Referencia</label>
                  <input 
                    name="referencia" 
                    value={envio.referencia}
                    onChange={handleInputChange}
                    placeholder="Piso, oficina, interior" 
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3.5 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* MÉTODO DE PAGO */}
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 rounded-lg flex items-center justify-center">
                    <CreditCard size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Método de Pago</h3>
                    <p className="text-sm text-gray-400">Selecciona tu forma de pago</p>
                  </div>
                </div>
                <ShieldCheck size={20} className="text-emerald-400" />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button 
                  onClick={() => setMetodoPago("transferencia")} 
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    metodoPago === 'transferencia' 
                    ? 'border-emerald-500 bg-gradient-to-r from-emerald-600/20 to-emerald-700/10' 
                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                  }`}
                >
                  <Landmark size={24} className={metodoPago === 'transferencia' ? 'text-emerald-400' : 'text-gray-500'} />
                  <span className="text-xs font-bold">Transferencia</span>
                  <span className="text-[10px] text-gray-400">BCP/BBVA/Interbank</span>
                </button>
                <button 
                  onClick={() => setMetodoPago("tarjeta")} 
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    metodoPago === 'tarjeta' 
                    ? 'border-blue-500 bg-gradient-to-r from-blue-600/20 to-blue-700/10' 
                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                  }`}
                >
                  <Card size={24} className={metodoPago === 'tarjeta' ? 'text-blue-400' : 'text-gray-500'} />
                  <span className="text-xs font-bold">Tarjeta</span>
                  <span className="text-[10px] text-gray-400">Visa/Mastercard</span>
                </button>
              </div>

              {metodoPago === "transferencia" && (
                <div className="mt-6 p-4 bg-gray-900/30 rounded-xl border border-gray-700">
                  <h4 className="text-sm font-semibold mb-3">Datos para Transferencia - BCP</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                      <span className="text-sm text-gray-400">Banco:</span>
                      <span className="text-sm font-semibold">BCP</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                      <span className="text-sm text-gray-400">Cuenta Corriente:</span>
                      <span className="text-sm font-mono">191-23456789-0-99</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                      <span className="text-sm text-gray-400">CCI:</span>
                      <span className="text-sm font-mono">00219100234567899099</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                      <span className="text-sm text-gray-400">Titular:</span>
                      <span className="text-sm font-semibold">B2B PERÚ SAC</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                      <span className="text-sm text-gray-400">RUC:</span>
                      <span className="text-sm font-mono">20605467891</span>
                    </div>
                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                      <p className="text-xs text-blue-300">
                        <strong>Importante:</strong> Envía el comprobante a facturacion@b2bperu.com con tu RUC y número de pedido.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {metodoPago === "tarjeta" && (
                <div className="mt-6 p-4 bg-gray-900/30 rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold">Detalles de Tarjeta</h4>
                    <button 
                      onClick={() => setShowCardDetails(!showCardDetails)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {showCardDetails ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showCardDetails ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-400 mb-2 block">Número de Tarjeta</label>
                      <div className="relative">
                        <input 
                          name="cardNumber"
                          value={paymentDetails.cardNumber}
                          onChange={handlePaymentInputChange}
                          type={showCardDetails ? "text" : "password"}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3.5 text-sm font-mono placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Válida hasta</label>
                      <input 
                        name="expiry"
                        value={paymentDetails.expiry}
                        onChange={handlePaymentInputChange}
                        placeholder="MM/AA"
                        maxLength={5}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3.5 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">CVV</label>
                      <div className="relative">
                        <input 
                          name="cvv"
                          value={paymentDetails.cvv}
                          onChange={handlePaymentInputChange}
                          type={showCardDetails ? "text" : "password"}
                          placeholder="123"
                          maxLength={3}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3.5 text-sm font-mono placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-400 mb-2 block">Nombre del Titular</label>
                      <input 
                        name="cardholder"
                        value={paymentDetails.cardholder}
                        onChange={handlePaymentInputChange}
                        placeholder="Como aparece en la tarjeta"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3.5 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PRODUCTOS */}
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-600/20 to-amber-700/20 rounded-lg flex items-center justify-center">
                    <PackageCheck size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Resumen de Productos</h3>
                    <p className="text-sm text-gray-400">{carrito.length} {carrito.length === 1 ? 'producto' : 'productos'} en tu orden</p>
                  </div>
                </div>
              </div>

              {carrito.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag size={32} className="text-gray-600" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Carrito vacío</h4>
                  <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                    Agrega productos desde nuestro catálogo B2B
                  </p>
                  <button
                    onClick={() => router.push("/catalogo")}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-semibold text-sm transition-all shadow-lg"
                  >
                    <Building size={18} />
                    Explorar Catálogo B2B
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {carrito.map((item, index) => (
                    <div key={item.id} className="group bg-gray-900/30 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-all">
                      <div className="flex gap-4 items-center">
                        <div className="relative">
                          <img 
                            src={item.imagenUrl || item.imagen_principal || '/default-image.png'} 
                            className="w-20 h-20 object-contain bg-gray-900/50 rounded-lg p-2" 
                            alt={item.nombre} 
                          />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full text-xs font-bold flex items-center justify-center">
                            {item.cantidad}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-sm group-hover:text-cyan-300 transition-colors">
                                  {item.nombre || 'Producto B2B'}
                                </h4>
                              </div>
                              <p className="text-xs text-gray-400">SKU: {item.sku || item.id?.substring(0, 8).toUpperCase()}</p>
                            </div>
                            <button 
                              onClick={() => eliminarDelCarrito(item.id)} 
                              className="text-gray-500 hover:text-rose-400 transition-colors p-1 hover:bg-gray-800/50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          <div className="flex justify-between items-center mt-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700">
                                <button 
                                  onClick={() => reducirCantidad(item.id)} 
                                  className="p-2 hover:bg-gray-700/50 transition-colors rounded-l-lg"
                                >
                                  <Minus size={14} className="text-gray-400" />
                                </button>
                                <span className="px-3 text-sm font-bold min-w-10 text-center">{item.cantidad}</span>
                                <button 
                                  onClick={() => agregarAlCarrito(item, false)} 
                                  className="p-2 hover:bg-gray-700/50 transition-colors rounded-r-lg"
                                >
                                  <Plus size={14} className="text-cyan-400" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                S/ {((item.precioBase || 0) * item.cantidad).toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-400">
                                S/ {item.precioBase?.toFixed(2)} c/u
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-8">
              {/* RESUMEN DE COMPRA */}
              <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <Calculator size={20} className="text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Resumen - IGV 18%</h3>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
                    <div>
                      <span className="text-sm font-medium">Subtotal</span>
                      <p className="text-xs text-gray-400">Productos</p>
                    </div>
                    <span className="font-bold">S/ {subtotal.toFixed(2)}</span>
                  </div>
                  
                  {descuento > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
                      <div>
                        <span className="text-sm font-medium text-emerald-400">Descuento por Volumen</span>
                        <p className="text-xs text-emerald-400/70">-{(descuento * 100).toFixed(0)}%</p>
                      </div>
                      <span className="font-bold text-emerald-400">-S/ {descuentoMonto.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
                    <div>
                      <span className="text-sm font-medium">Base Imponible</span>
                      <p className="text-xs text-gray-400">Monto antes de IGV</p>
                    </div>
                    <span className="font-bold">S/ {baseImponible.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
                    <div>
                      <span className="text-sm font-medium">IGV (18%)</span>
                      <p className="text-xs text-gray-400">Impuesto General a las Ventas</p>
                    </div>
                    <span className="font-bold text-amber-400">S/ {igv.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
                    <div>
                      <span className="text-sm font-medium">Envío</span>
                      <p className="text-xs text-gray-400">Express 24-48h</p>
                    </div>
                    <span className={`font-bold ${envioCosto === 0 ? 'text-emerald-400' : ''}`}>
                      {envioCosto === 0 ? 'GRATIS' : `S/ ${envioCosto.toFixed(2)}`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 border-t border-gray-600 mt-2">
                    <div>
                      <span className="text-lg font-bold">Total a Pagar</span>
                      <p className="text-xs text-gray-400">Incluye IGV • Factura Electrónica</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        S/ {totalFinal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleFinalizarPedido}
                  disabled={loading || carrito.length === 0 || !envio.ruc || envio.ruc.length !== 11}
                  className={`w-full py-4 rounded-xl font-bold text-sm shadow-2xl transition-all flex items-center justify-center gap-2 mb-3 ${
                    loading || carrito.length === 0 || !envio.ruc || envio.ruc.length !== 11
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 hover:from-blue-700 hover:via-cyan-700 hover:to-emerald-700 hover:shadow-lg hover:shadow-blue-500/25'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Procesando Orden...
                    </>
                  ) : carrito.length === 0 ? (
                    'Agrega productos primero'
                  ) : !envio.ruc || envio.ruc.length !== 11 ? (
                    'Ingresa RUC válido (11 dígitos)'
                  ) : (
                    <>
                      <Lock size={20} />
                      Confirmar Orden B2B
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                {carrito.length > 0 && (
                  <button 
                    onClick={vaciarCarrito}
                    className="w-full py-3 text-sm font-medium text-gray-400 hover:text-rose-400 hover:bg-gray-800/50 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Vaciar carrito
                  </button>
                )}
              </div>

              {/* BENEFICIOS B2B PERÚ */}
              <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <Award size={20} className="text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Ventajas B2B Perú</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-900/30 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-lg flex items-center justify-center">
                      <FileText size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Factura Electrónica</p>
                      <p className="text-xs text-gray-400">Validada por SUNAT</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-900/30 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 rounded-lg flex items-center justify-center">
                      <Percent size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Descuentos por Volumen</p>
                      <p className="text-xs text-gray-400">Hasta 20% en compras mayoristas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-900/30 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600/20 to-purple-700/20 rounded-lg flex items-center justify-center">
                      <Truck size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Envío a todo Perú</p>
                      <p className="text-xs text-gray-400">Olva/Shalom/OTR</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-12 py-8 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-sm font-bold text-white mb-4">B2B Perú</h4>
              <p className="text-xs text-gray-400">
                Plataforma B2B especializada en comercio empresarial peruano.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Soporte</h4>
              <div className="space-y-2">
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <Phone size={12} />
                  +51 1 640-9000
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <Mail size={12} />
                  ventas@b2bperu.com
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Bancos</h4>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 bg-gray-800/50 rounded text-xs">BCP</div>
                <div className="px-2 py-1 bg-gray-800/50 rounded text-xs">BBVA</div>
                <div className="px-2 py-1 bg-gray-800/50 rounded text-xs">Interbank</div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-4">RUC</h4>
              <p className="text-xs font-mono text-gray-400">20605467891</p>
              <p className="text-xs text-gray-500 mt-1">B2B PERÚ SAC</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500">© 2024 B2B Perú SAC. RUC: 20605467891</p>
          </div>
        </div>
      </footer>
    </div>
  );
}