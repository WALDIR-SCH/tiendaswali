"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import {
  doc, getDoc, collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, updateDoc, arrayUnion,
  increment, setDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  Star, Truck, ShoppingCart, ArrowLeft, Share2, Send, Check,
  Facebook, MessageSquare, Lock, Shield, Package, Award, X,
  ChevronLeft, ChevronRight, User, AlertCircle, Camera, Sparkles,
  TrendingUp, Users, Heart, BadgeCheck, FileText, Tag, Scale,
  Box, Calendar, Layers, ZoomIn, RotateCw, Plus, Minus,
  Heart as HeartIcon, Bot, ChevronDown, ChevronUp, Loader2,
  ThumbsUp, ThumbsDown, Grid, List, Download, ExternalLink,
  Info, Receipt, Boxes
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

/* ─── TIPOS ─── */
interface EscalaPrecio   { cantidad: number; precio: number; }
interface PreciosVolumen { unidad: EscalaPrecio[]; caja: EscalaPrecio[]; }

interface Producto {
  id: string; sku: string; nombre_producto: string;
  descripcion_corta: string; categoria_id: string;
  marca: string; modelo: string; color: string;
  capacidad_almacenamiento: string; capacidad_ram: string;
  sistema_operativo: string; procesador: string;
  especificaciones_tecnicas: string | Record<string, string>;
  unidad_venta: string;
  precio_caja: number; precio_unitario: number;
  precio_oferta_caja: number | null; precio_oferta_unidad: number | null;
  en_oferta: boolean; en_oferta_unidad: boolean;
  precios_volumen?: PreciosVolumen;
  stock_cajas: number; stock_unidades: number;
  unidades_por_caja: number; pedido_minimo: number; stock_minimo_cajas: number;
  moneda: string; peso_kg: number; dimensiones: string;
  garantia_meses: number; imagen_principal: string;
  documento_ficha: string; estado: string;
  imagenes?: string[];
  rating_promedio?: number; total_resenas?: number; destacado?: boolean;
  sim?: string; conectividad?: string; bateria_mah?: string;
  camara_principal?: string; camara_frontal?: string;
  tamano_pantalla?: string; version_so?: string;
}

interface Resena {
  id: string; usuario: string; usuarioEmail: string;
  usuarioId: string; usuarioFoto: string | null;
  comentario: string; rating: number; imagenes: string[];
  fecha: any; verificado: boolean; util: number;
}

/* ─── PALETA ─── */
const C = {
  orange:  "#FF6600",
  yellow:  "#F6FA00",
  green:   "#28FB4B",
  greenDark: "#16a34a",
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
  gray900: "#111827",
};

/* IGV PERÚ = 18% */
const IGV = 0.18;
const fmtPEN = (n: number) =>
  `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getRelativeTime = (date: Date): string => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return "ahora mismo";
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = Math.floor(diff / 86400);
  if (d < 7) return `${d} día${d > 1 ? "s" : ""}`;
  return date.toLocaleDateString("es-PE");
};

/* ─── ZOOM ─── */
const ImageZoom = ({ src, alt }: { src: string; alt: string }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [pos, setPos]           = useState({ x: 0, y: 0 });
  const ref                     = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    setPos({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100 });
  }, []);
  return (
    <div className="relative overflow-hidden rounded-xl group">
      <div ref={ref} className="relative overflow-hidden cursor-zoom-in"
        onMouseEnter={() => setIsZoomed(true)} onMouseLeave={() => setIsZoomed(false)} onMouseMove={onMove}>
        <img src={src} alt={alt}
          className={`w-full h-full object-contain transition-transform duration-300 ${isZoomed ? "scale-150" : "scale-100"}`}
          style={{ transformOrigin: `${pos.x}% ${pos.y}%` }} />
        {isZoomed && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
            <ZoomIn size={14} /><span>Zoom 2x</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── 360° ─── */
const ProductView360 = ({ images }: { images: string[] }) => {
  const [idx, setIdx]     = useState(0);
  const [auto, setAuto]   = useState(false);
  const iRef              = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = () => { setAuto(true); iRef.current = setInterval(() => setIdx(p => (p + 1) % images.length), 100); };
  const stop  = () => { setAuto(false); if (iRef.current) clearInterval(iRef.current); };
  const nav   = (d: "prev" | "next") => setIdx(p => d === "prev" ? (p === 0 ? images.length - 1 : p - 1) : (p === images.length - 1 ? 0 : p + 1));
  useEffect(() => () => { if (iRef.current) clearInterval(iRef.current); }, []);
  if (images.length <= 1) return <ImageZoom src={images[0]} alt="Producto" />;
  return (
    <div className="relative overflow-hidden rounded-xl">
      <img src={images[idx]} alt={`Vista ${idx + 1}`} className="w-full h-full object-contain" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <button onClick={() => nav("prev")} className="bg-black/40 hover:bg-black/60 rounded-full p-2 text-white"><ChevronLeft size={18} /></button>
        <button onClick={auto ? stop : start} className="px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2"
          style={{ background: auto ? "#ef4444" : C.purpleDark }}>
          <RotateCw size={14} className={auto ? "animate-spin" : ""} />
          {auto ? "Detener" : "360°"}
        </button>
        <button onClick={() => nav("next")} className="bg-black/40 hover:bg-black/60 rounded-full p-2 text-white"><ChevronRight size={18} /></button>
      </div>
      <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-xs">{idx + 1}/{images.length}</div>
    </div>
  );
};

/* ─── SELECTOR TIPO COMPRA ─── */
const TipoCompraSelector = ({ tipo, setTipo, disabled = false }: {
  tipo: "caja" | "unidad"; setTipo: (t: "caja" | "unidad") => void; disabled?: boolean;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Tipo de compra</label>
    <div className="grid grid-cols-2 gap-2">
      {(["caja", "unidad"] as const).map(t => (
        <button key={t} onClick={() => setTipo(t)} disabled={disabled}
          className="py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border-2"
          style={{
            background: tipo === t ? `linear-gradient(135deg,${C.purple},${C.purpleDark})` : C.gray100,
            borderColor: tipo === t ? C.purpleDark : C.gray300,
            color: tipo === t ? C.white : C.gray600,
            opacity: disabled ? 0.5 : 1,
          }}>
          {t === "caja" ? <Package size={15} /> : <Box size={15} />}
          {t === "caja" ? "Por Caja" : "Por Unidad"}
        </button>
      ))}
    </div>
  </div>
);

/* ─── SELECTOR CANTIDAD ─── */
const QuantitySelector = ({ quantity, setQuantity, max, tipo, pedidoMinimo, disabled = false }: {
  quantity: number; setQuantity: (q: number) => void; max: number;
  tipo: "caja" | "unidad"; pedidoMinimo: number; disabled?: boolean;
}) => {
  const minVal = tipo === "caja" ? 1 : Math.max(pedidoMinimo, 5);
  const maxR   = Math.min(Math.max(max, 0), 99999); // nunca supera el stock real

  const dec = () => { if (quantity > minVal) setQuantity(quantity - 1); };
  const inc = () => { if (quantity < maxR)   setQuantity(quantity + 1); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") { setQuantity(minVal); return; }
    const v = parseInt(raw, 10);
    if (isNaN(v)) return;
    // clamp entre mínimo y stock disponible
    setQuantity(Math.min(maxR, Math.max(minVal, v)));
  };

  const atMin = quantity <= minVal;
  const atMax = quantity >= maxR;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          Cantidad ({tipo === "caja" ? "cajas" : "unidades"})
        </label>
        {atMax && maxR > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
            Máx. stock alcanzado
          </span>
        )}
      </div>

      <div className="flex items-center rounded-xl overflow-hidden border-2 transition-colors"
        style={{ borderColor: disabled ? C.gray200 : atMax ? "#fca5a5" : C.gray200 }}>

        {/* Botón − */}
        <button
          onClick={dec}
          disabled={disabled || atMin}
          className="px-4 py-3 font-black text-lg transition-all select-none"
          style={{
            background:  disabled || atMin ? C.gray100 : C.gray100,
            color:       disabled || atMin ? C.gray300 : C.gray100,
            cursor:      disabled || atMin ? "not-allowed" : "pointer",
            borderRight: `1px solid ${C.gray200}`,
            minWidth: 48,
          }}
          onMouseEnter={e => { if (!disabled && !atMin) (e.currentTarget as HTMLElement).style.background = C.gray200; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.gray100; }}
        >
          −
        </button>

        {/* Input */}
        <input
          type="number"
          value={quantity}
          min={minVal}
          max={maxR}
          onChange={handleChange}
          disabled={disabled}
          className="flex-1 text-center bg-white py-3 font-black text-gray-900 focus:outline-none"
          style={{
            fontSize: 16,
            MozAppearance: "textfield" as any,
            WebkitAppearance: "none" as any,
          }}
        />

        {/* Botón + */}
        <button
          onClick={inc}
          disabled={disabled || atMax}
          className="px-4 py-3 font-black text-lg transition-all select-none"
          style={{
            background:  disabled || atMax ? C.gray100 : C.gray100,
            color:       disabled || atMax ? C.gray300 : C.gray100,
            cursor:      disabled || atMax ? "not-allowed" : "pointer",
            borderLeft:  `1px solid ${C.gray200}`,
            minWidth: 48,
          }}
          onMouseEnter={e => { if (!disabled && !atMax) (e.currentTarget as HTMLElement).style.background = C.gray200; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.gray100; }}
        >
          +
        </button>
      </div>

      {/* Info mín / stock */}
      <div className="flex justify-between text-[11px] px-0.5" style={{ color: C.gray400 }}>
        <span>
          Mínimo: <strong style={{ color: C.purple }}>{minVal} {tipo === "caja" ? "caja" : "uds"}</strong>
        </span>
        <span>
          Disponible: <strong style={{ color: maxR > 0 ? C.greenDark : "#dc2626" }}>
            {maxR} {tipo === "caja" ? "cajas" : "uds"}
          </strong>
        </span>
      </div>
    </div>
  );
};

/* ─── STARS ─── */
const StarRating = ({ rating, setRating, readonly = false, size = 20 }: {
  rating: number; setRating?: (r: number) => void; readonly?: boolean; size?: number;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <button key={s} type="button" onClick={() => !readonly && setRating?.(s)}
        disabled={readonly} className={`transition-transform ${!readonly ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}>
        <Star size={size} className={rating >= s ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
      </button>
    ))}
  </div>
);

/* ─── STOCK DISPLAY MEJORADO ─── */
const StockDisplay = ({ producto, tipo }: { producto: Producto; tipo: "caja" | "unidad" }) => {
  const stockCajas    = producto.stock_cajas    || 0;
  const stockUnidades = producto.stock_unidades || 0;
  const udsXcaja      = producto.unidades_por_caja || 1;
  const totalUds      = stockCajas * udsXcaja + (stockUnidades > 0 ? stockUnidades : 0);
  const minCajas      = producto.stock_minimo_cajas || 2;
  const isCrit        = stockCajas <= minCajas && stockCajas > 0;
  const isOut         = stockCajas <= 0;

  return (
    <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: isOut ? "#fecaca" : isCrit ? "#fde68a" : "#bbf7d0" }}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: isOut ? "#fef2f2" : isCrit ? "#fffbeb" : "#f0fdf4" }}>
        <div className="flex items-center gap-2">
          <Boxes size={16} style={{ color: isOut ? "#dc2626" : isCrit ? "#b45309" : "#16a34a" }} />
          <span className="text-xs font-black uppercase tracking-wide"
            style={{ color: isOut ? "#dc2626" : isCrit ? "#b45309" : "#16a34a" }}>
            {isOut ? "SIN STOCK" : isCrit ? "STOCK CRÍTICO" : "EN STOCK"}
          </span>
        </div>
        {!isOut && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: isOut ? "#dc2626" : isCrit ? "#b45309" : "#16a34a" }}>
            {tipo === "caja" ? `${stockCajas} cajas disp.` : `${stockUnidades} uds disp.`}
          </span>
        )}
      </div>

      {/* Detalle por tipo */}
      <div className="p-4 bg-white grid grid-cols-2 gap-3">
        {/* Cajas */}
        <div className="rounded-lg p-3 border" style={{ borderColor: C.gray200, background: C.gray100 }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Package size={13} style={{ color: C.purple }} />
            <span className="text-[10px] font-black uppercase tracking-wide text-gray-600">Por Caja</span>
          </div>
          <p className="text-2xl font-black" style={{ color: isOut ? "#dc2626" : C.purple }}>{stockCajas}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">cajas disponibles</p>
          <p className="text-[10px] font-bold mt-1" style={{ color: C.orange }}>
            = {stockCajas * udsXcaja} unidades
          </p>
        </div>

        {/* Unidades */}
        <div className="rounded-lg p-3 border" style={{ borderColor: C.gray200, background: C.gray100 }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Box size={13} style={{ color: C.orange }} />
            <span className="text-[10px] font-black uppercase tracking-wide text-gray-600">Por Unidad</span>
          </div>
          <p className="text-2xl font-black" style={{ color: isOut ? "#dc2626" : C.orange }}>
            {stockUnidades > 0 ? stockUnidades : stockCajas * udsXcaja}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">unidades disponibles</p>
          <p className="text-[10px] font-bold mt-1 text-gray-400">
            {udsXcaja} uds por caja
          </p>
        </div>
      </div>

      {/* Nota pedido mínimo */}
      <div className="px-4 py-2 border-t" style={{ borderColor: C.gray200, background: "#fafafa" }}>
        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
          <Info size={11} style={{ color: C.purple }} />
          Pedido mínimo: <strong style={{ color: C.purple }}>{producto.pedido_minimo} unidades</strong>
          {" · "} <strong style={{ color: C.orange }}>1 caja = {udsXcaja} unidades</strong>
        </p>
      </div>
    </div>
  );
};

/* ─── RESUMEN PRECIO + IGV ─── */
const ResumenPrecio = ({ precio, cantidad, tipo, unidadesPorCaja, moneda }: {
  precio: number; cantidad: number; tipo: "caja" | "unidad";
  unidadesPorCaja: number; moneda: string;
}) => {
  const subtotal   = precio * cantidad;
  const igvMonto   = subtotal * IGV;
  const total      = subtotal + igvMonto;
  const unidadesTotal = tipo === "caja" ? cantidad * unidadesPorCaja : cantidad;
  const precioPorUd   = tipo === "caja" ? precio / unidadesPorCaja : precio;

  return (
    <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: `${C.purple}30` }}>
      <div className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
        <Receipt size={14} className="text-white" />
        <span className="text-xs font-black text-white uppercase tracking-wide">Resumen de tu pedido</span>
      </div>
      <div className="p-4 bg-white space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            {cantidad} {tipo === "caja" ? `caja${cantidad !== 1 ? "s" : ""}` : `unidad${cantidad !== 1 ? "es" : ""}`}
            {tipo === "caja" && <span className="text-gray-400 text-xs"> ({unidadesTotal} uds total)</span>}
          </span>
          <span className="font-bold text-gray-900">{fmtPEN(subtotal)}</span>
        </div>

        {tipo === "caja" && (
          <div className="flex justify-between text-xs text-gray-400">
            <span>Precio por unidad</span>
            <span>{fmtPEN(precioPorUd)}</span>
          </div>
        )}

        {/* Separador */}
        <div className="border-t border-dashed" style={{ borderColor: C.gray200 }} />

        {/* Subtotal sin IGV */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal (sin IGV)</span>
          <span className="font-bold text-gray-700">{fmtPEN(subtotal)}</span>
        </div>

        {/* IGV 18% */}
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1 text-gray-500">
            IGV (18%)
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: C.orange }}>PERÚ</span>
          </span>
          <span className="font-bold" style={{ color: C.orange }}>{fmtPEN(igvMonto)}</span>
        </div>

        {/* Total */}
        <div className="rounded-lg p-3 flex justify-between items-center"
          style={{ background: `${C.purple}08`, border: `1.5px solid ${C.purple}25` }}>
          <span className="font-black text-gray-900">TOTAL CON IGV</span>
          <span className="text-xl font-black" style={{ color: C.purple }}>{fmtPEN(total)}</span>
        </div>

        <p className="text-[10px] text-gray-400 text-center">
          * Precio base sin IGV: {fmtPEN(subtotal)} · IGV incluido en precio final
        </p>
      </div>
    </div>
  );
};

/* ─── PRECIOS POR VOLUMEN ─── */
const PreciosVolumenDisplay = ({
  preciosVolumen, tipo, precioCajaBase, precioUnidadBase, onSelectPrecio, precioSeleccionado
}: {
  preciosVolumen?: PreciosVolumen; tipo: "caja" | "unidad";
  precioCajaBase: number; precioUnidadBase: number;
  onSelectPrecio: (precio: number, cantidad: number) => void;
  precioSeleccionado: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const escalas = tipo === "caja" ? (preciosVolumen?.caja || []) : (preciosVolumen?.unidad || []);
  if (escalas.length === 0) return null;
  const precioBase = tipo === "caja" ? precioCajaBase : precioUnidadBase;
  const ordenadas  = [...escalas].sort((a, b) => a.cantidad - b.cantidad);

  return (
    <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: `${C.purple}35` }}>
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        style={{ color: C.purple }}>
        <div className="flex items-center gap-2">
          <TrendingUp size={14} style={{ color: C.purple }} />
          <span className="text-sm font-bold">Precios por volumen</span>
          {precioSeleccionado !== precioBase && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: C.purple }}>Aplicado</span>
          )}
        </div>
        <ChevronDown size={15} className={`transition-transform ${expanded ? "rotate-180" : ""}`} style={{ color: C.purple }} />
      </button>
      {expanded && (
        <div className="px-4 pb-4 bg-white">
          <p className="text-xs text-gray-400 mb-3">Haz clic para aplicar ese precio</p>
          <div className="space-y-2">
            {ordenadas.map((e, i) => {
              const sel  = precioSeleccionado === e.precio;
              const desc = precioBase > 0 ? Math.round((1 - e.precio / precioBase) * 100) : 0;
              return (
                <button key={i} type="button" onClick={() => onSelectPrecio(e.precio, e.cantidad)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all border-2 text-left"
                  style={{ background: sel ? `${C.purple}12` : C.white, borderColor: sel ? C.purple : `${C.purple}20` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{ borderColor: sel ? C.purple : C.gray300, background: sel ? C.purple : "transparent" }}>
                      {sel && <Check size={9} color={C.white} />}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">
                      {e.cantidad} {tipo === "caja" ? (e.cantidad === 1 ? "caja" : "cajas") : (e.cantidad === 1 ? "unidad" : "unidades")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {desc > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${C.purple}15`, color: C.purple }}>-{desc}%</span>
                    )}
                    <span className={`text-sm font-black ${sel ? "text-gray-900" : "text-gray-700"}`}>
                      {fmtPEN(e.precio)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">* Precios sin IGV. Mín: {tipo === "caja" ? "1 caja" : `${escalas[0]?.cantidad} unidades`}</p>
        </div>
      )}
    </div>
  );
};

/* ─── FORMATEAR SPECS ─── */
const formatearEspecificaciones = (esp: string | Record<string, string>): string[] => {
  if (typeof esp === "string") return esp.split("\n").map(l => l.trim()).filter(Boolean);
  if (typeof esp === "object" && esp !== null) return Object.entries(esp).map(([k, v]) => `${k}: ${v}`);
  return [];
};

/* ═══════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════ */
export default function DetalleProducto() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const { agregarAlCarrito } = useCart();
  const { language }         = useLanguage();

  const [producto,        setProducto]        = useState<Producto | null>(null);
  const [imgSeleccionada, setImgSeleccionada] = useState("");
  const [activeTab,       setActiveTab]        = useState("descripcion");
  const [agregado,        setAgregado]         = useState(false);
  const [showShareMenu,   setShowShareMenu]    = useState(false);
  const [loading,         setLoading]          = useState(true);
  const [currentUser,     setCurrentUser]      = useState<any>(null);

  const [reseñas,        setReseñas]        = useState<Resena[]>([]);
  const [nuevaReseña,    setNuevaReseña]    = useState("");
  const [puntuacion,     setPuntuacion]     = useState(5);
  const [enviando,       setEnviando]       = useState(false);
  const [imagenesReseña, setImagenesReseña] = useState<File[]>([]);
  const [previewImages,  setPreviewImages]  = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus,   setUploadStatus]   = useState("");

  const [galleriaAbierta,      setGalleriaAbierta]      = useState(false);
  const [imagenGaleriaActual,  setImagenGaleriaActual]  = useState(0);
  const [todasImagenesReseñas, setTodasImagenesReseñas] = useState<string[]>([]);

  const [estadisticas, setEstadisticas] = useState({
    totalReseñas: 0, promedioRating: 5.0,
    distribucionRating: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  const [tipoCompra,          setTipoCompra]          = useState<"caja" | "unidad">("caja");
  const [cantidad,            setCantidad]            = useState(1);
  const [precioSeleccionado,  setPrecioSeleccionado]  = useState(0);
  const [enWishlist,          setEnWishlist]          = useState(false);
  const [isView360,           setIsView360]           = useState(false);
  const [wishlistLoading,     setWishlistLoading]     = useState(false);

  /* ─── PRECIO BASE ─── */
  const getPrecioBase = useCallback(() => {
    if (!producto) return 0;
    if (tipoCompra === "caja")
      return producto.en_oferta && producto.precio_oferta_caja ? producto.precio_oferta_caja : producto.precio_caja;
    return producto.en_oferta_unidad && producto.precio_oferta_unidad ? producto.precio_oferta_unidad : producto.precio_unitario;
  }, [producto, tipoCompra]);

  useEffect(() => { setPrecioSeleccionado(getPrecioBase()); }, [tipoCompra, producto, getPrecioBase]);

  const getStockActual = useCallback(() => {
    if (!producto) return 0;
    return tipoCompra === "caja" ? producto.stock_cajas : (producto.stock_unidades || producto.stock_cajas * (producto.unidades_por_caja || 1));
  }, [producto, tipoCompra]);

  /* ─── AUTH ─── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (user && producto) checkWishlist(user.uid, producto.id);
    });
    return () => unsub();
  }, [producto]);

  const checkWishlist = async (uid: string, pid: string) => {
    try {
      const snap = await getDoc(doc(db, "usuarios", uid, "wishlist", pid));
      setEnWishlist(snap.exists() && snap.data()?.estado === "activo");
    } catch {}
  };

  const toggleWishlist = async () => {
    if (!currentUser) { alert("Inicia sesión para agregar a favoritos"); return; }
    if (!producto) return;
    setWishlistLoading(true);
    try {
      const ref = doc(db, "usuarios", currentUser.uid, "wishlist", producto.id);
      if (enWishlist) {
        await updateDoc(ref, { estado: "removido", fecha_actualizacion: serverTimestamp() });
        setEnWishlist(false);
      } else {
        await setDoc(ref, {
          producto_id: producto.id, sku: producto.sku, nombre: producto.nombre_producto,
          precio_caja: producto.precio_caja, precio_unitario: producto.precio_unitario,
          imagen: producto.imagen_principal, fecha_agregado: serverTimestamp(), estado: "activo"
        });
        setEnWishlist(true);
      }
    } catch { alert("Error al actualizar favoritos"); }
    finally { setWishlistLoading(false); }
  };

  /* ─── CARGAR PRODUCTO ─── */
  useEffect(() => {
    if (!id) { router.push("/catalogo"); return; }
    const pid = decodeURIComponent(id as string);

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "productos", pid));
        if (snap.exists()) {
          const d = snap.data();
          const p: Producto = {
            id: snap.id,
            sku:                      d.sku                      || "",
            nombre_producto:          d.nombre_producto          || "",
            descripcion_corta:        d.descripcion_corta        || "",
            categoria_id:             d.categoria_id             || "",
            marca:                    d.marca                    || "",
            modelo:                   d.modelo                   || "",
            color:                    d.color                    || "",
            capacidad_almacenamiento: d.capacidad_almacenamiento || "",
            capacidad_ram:            d.capacidad_ram            || "",
            sistema_operativo:        d.sistema_operativo        || "",
            version_so:               d.version_so               || "",
            procesador:               d.procesador               || "",
            especificaciones_tecnicas:d.especificaciones_tecnicas|| "",
            unidad_venta:             d.unidad_venta             || "",
            precio_caja:              Number(d.precio_caja)      || 0,
            precio_unitario:          Number(d.precio_unitario)  || 0,
            precio_oferta_caja:       d.precio_oferta_caja       || null,
            precio_oferta_unidad:     d.precio_oferta_unidad     || null,
            en_oferta:                d.en_oferta                || false,
            en_oferta_unidad:         d.en_oferta_unidad         || false,
            precios_volumen:          d.precios_volumen          || undefined,
            stock_cajas:              Number(d.stock_cajas)      || 0,
            stock_unidades:           Number(d.stock_unidades)   || 0,
            unidades_por_caja:        Number(d.unidades_por_caja)|| 10,
            pedido_minimo:            Number(d.pedido_minimo)    || 5,
            stock_minimo_cajas:       Number(d.stock_minimo_cajas)|| 2,
            moneda:                   "PEN",
            peso_kg:                  Number(d.peso_kg)          || 0,
            dimensiones:              d.dimensiones              || "",
            garantia_meses:           Number(d.garantia_meses)   || 0,
            imagen_principal:         d.imagen_principal         || "",
            documento_ficha:          d.documento_ficha          || "",
            estado:                   d.estado                   || "Inactivo",
            imagenes:                 Array.isArray(d.imagenes_adicionales) ? d.imagenes_adicionales : [],
            rating_promedio:          d.rating_promedio          || 5.0,
            total_resenas:            d.total_resenas            || 0,
            destacado:                d.destacado                || false,
            sim:                      d.sim                      || "",
            conectividad:             d.conectividad             || "",
            bateria_mah:              d.bateria_mah              || "",
            camara_principal:         d.camara_principal         || "",
            camara_frontal:           d.camara_frontal           || "",
            tamano_pantalla:          d.tamano_pantalla          || "",
          };
          setProducto(p);
          setImgSeleccionada(p.imagen_principal);
          setPrecioSeleccionado(p.en_oferta && p.precio_oferta_caja ? p.precio_oferta_caja : p.precio_caja);
          if (currentUser) checkWishlist(currentUser.uid, p.id);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };

    const q = query(collection(db, "productos", pid, "reseñas"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, snap => {
      const data: Resena[] = snap.docs.map(d => ({
        id: d.id, usuario: d.data().usuario || "Usuario",
        usuarioEmail: d.data().usuarioEmail || "", usuarioId: d.data().usuarioId || "",
        usuarioFoto: d.data().usuarioFoto || null, comentario: d.data().comentario || "",
        rating: d.data().rating || 5, imagenes: Array.isArray(d.data().imagenes) ? d.data().imagenes : [],
        fecha: d.data().fecha, verificado: d.data().verificado || false, util: d.data().util || 0
      }));
      setReseñas(data);
      setTodasImagenesReseñas(data.flatMap(r => r.imagenes || []));
      if (data.length === 0) {
        setEstadisticas({ totalReseñas: 0, promedioRating: 5.0, distribucionRating: { 5:0,4:0,3:0,2:0,1:0 } });
      } else {
        const suma = data.reduce((a, r) => a + r.rating, 0);
        const dist = { 5:0, 4:0, 3:0, 2:0, 1:0 };
        data.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating as keyof typeof dist]++; });
        setEstadisticas({ totalReseñas: data.length, promedioRating: parseFloat((suma / data.length).toFixed(1)), distribucionRating: dist });
      }
    });
    load();
    return () => unsub();
  }, [id, currentUser]);

  /* ─── COMPRIMIR IMAGEN ─── */
  const comprimirImagen = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (file.size < 500 * 1024) { resolve(file); return; }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = evt => {
        const img = new Image();
        img.src = evt.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 1200; let { width, height } = img;
          if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
          else { if (height > MAX) { width *= MAX / height; height = MAX; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => {
            if (blob) resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            else reject(new Error("Error comprimiendo"));
          }, "image/jpeg", 0.7);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const subirACloudinary = async (file: File): Promise<string> => {
    const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error("Cloudinary no configurado");
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", uploadPreset); fd.append("folder", "product_reviews");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Error subiendo imagen");
    return (await res.json()).secure_url;
  };

  const handleImagenesReseña = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imagenesReseña.length > 4) { alert("Máximo 4 fotos"); e.target.value = ""; return; }
    const nuevas: File[] = [];
    for (const f of files) {
      if (f.size > 3 * 1024 * 1024) { alert(`"${f.name}" supera 3MB`); continue; }
      if (!f.type.startsWith("image/")) { alert(`"${f.name}" no es imagen`); continue; }
      const comp = await comprimirImagen(f);
      nuevas.push(comp);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImages(p => [...p, reader.result as string]);
      reader.readAsDataURL(comp);
    }
    setImagenesReseña(p => [...p, ...nuevas]);
    e.target.value = "";
  };

  const eliminarImagenPreview = (i: number) => {
    setImagenesReseña(p => p.filter((_, j) => j !== i));
    setPreviewImages(p => p.filter((_, j) => j !== i));
  };

  const handleEnviarReseña = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaReseña.trim() || enviando || !currentUser) return;
    if (nuevaReseña.length < 10) { alert("Mínimo 10 caracteres"); return; }
    setEnviando(true); setUploadStatus("Preparando...");
    try {
      let imagenesUrls: string[] = [];
      if (imagenesReseña.length > 0) {
        setUploadStatus("Subiendo imágenes...");
        for (let i = 0; i < imagenesReseña.length; i++) {
          setUploadStatus(`Subiendo ${i + 1}/${imagenesReseña.length}...`);
          try { imagenesUrls.push(await subirACloudinary(imagenesReseña[i])); } catch {}
          setUploadProgress(((i + 1) / imagenesReseña.length) * 100);
        }
      }
      const pid = decodeURIComponent(id as string);
      await addDoc(collection(db, "productos", pid, "reseñas"), {
        usuario: currentUser.displayName || currentUser.email?.split("@")[0] || "Usuario",
        usuarioEmail: currentUser.email, usuarioId: currentUser.uid,
        usuarioFoto: currentUser.photoURL || null, comentario: nuevaReseña.trim(),
        rating: puntuacion, imagenes: imagenesUrls, fecha: serverTimestamp(),
        verificado: currentUser.emailVerified || false, util: 0, reportes: 0
      });
      await updateDoc(doc(db, "productos", pid), { total_resenas: increment(1), rating_promedio: increment(puntuacion) });
      setNuevaReseña(""); setPuntuacion(5); setImagenesReseña([]); setPreviewImages([]);
      setUploadProgress(0); setUploadStatus("");
      alert("✅ ¡Reseña publicada!");
    } catch { alert("❌ Error al enviar."); setUploadStatus(""); }
    finally { setEnviando(false); }
  };

  const marcarUtil = async (rid: string) => {
    if (!currentUser) { alert("Inicia sesión para marcar como útil"); return; }
    try {
      const pid = decodeURIComponent(id as string);
      await updateDoc(doc(db, "productos", pid, "reseñas", rid), {
        util: increment(1), usuariosUtil: arrayUnion(currentUser.uid)
      });
    } catch {}
  };

  /* ─── GALERÍA ─── */
  const abrirGaleria   = (i: number) => { setImagenGaleriaActual(i); setGalleriaAbierta(true); document.body.style.overflow = "hidden"; };
  const cerrarGaleria  = ()          => { setGalleriaAbierta(false); document.body.style.overflow = "auto"; };
  const navegarGaleria = (dir: "prev" | "next") =>
    setImagenGaleriaActual(p => dir === "prev" ? (p === 0 ? todasImagenesReseñas.length - 1 : p - 1) : (p === todasImagenesReseñas.length - 1 ? 0 : p + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!galleriaAbierta) return;
      if (e.key === "ArrowLeft")  navegarGaleria("prev");
      if (e.key === "ArrowRight") navegarGaleria("next");
      if (e.key === "Escape")     cerrarGaleria();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleriaAbierta, imagenGaleriaActual]);

  /* ─── CARRITO ─── */
  const handleAgregarAlCarrito = () => {
    if (!producto || getStockActual() <= 0) { alert("Sin stock"); return; }
    agregarAlCarrito({
      id: producto.id, nombre: producto.nombre_producto, sku: producto.sku,
      precioBase: precioSeleccionado, precio_caja: producto.precio_caja,
      precio_unitario: producto.precio_unitario, stock: getStockActual(),
      stock_cajas: producto.stock_cajas, stock_unidades: producto.stock_unidades,
      imagenUrl: producto.imagen_principal, imagen_principal: producto.imagen_principal,
      unidad_venta: producto.unidad_venta, tipoCompra, unidadesPorCaja: producto.unidades_por_caja
    }, cantidad, tipoCompra);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2500);
  };

  const handleDescargarFicha = useCallback(async () => {
    if (!producto?.documento_ficha) return;
    try {
      const link = document.createElement("a");
      link.href = producto.documento_ficha;
      link.download = `ficha-tecnica-${producto.sku || producto.id}.pdf`;
      link.target = "_blank"; link.rel = "noopener noreferrer";
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch { window.open(producto.documento_ficha, "_blank", "noopener,noreferrer"); }
  }, [producto]);

  /* ══════ LOADING ══════ */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto border-4 rounded-full animate-spin"
          style={{ borderColor: `${C.purple}25`, borderTopColor: C.purple }} />
        <p className="font-bold text-gray-700">Cargando producto...</p>
      </div>
    </div>
  );

  if (!producto) return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: `${C.purple}15` }}>
          <AlertCircle size={30} style={{ color: C.purple }} />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Producto no encontrado</h2>
        <p className="text-gray-500 text-sm">El producto que buscas no existe o fue eliminado.</p>
        <button onClick={() => router.push("/catalogo")}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold text-sm rounded-xl"
          style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
          <ArrowLeft size={14} /> Volver al catálogo
        </button>
      </div>
    </div>
  );

  const specsArray    = formatearEspecificaciones(producto.especificaciones_tecnicas);
  const productImages = [producto.imagen_principal, ...(producto.imagenes || [])].filter(Boolean);
  const stockActual   = getStockActual();
  const precioBase    = getPrecioBase();
  const porcentajes   = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (estadisticas.totalReseñas > 0)
    [5, 4, 3, 2, 1].forEach(s => {
      porcentajes[s as keyof typeof porcentajes] =
        (estadisticas.distribucionRating[s as keyof typeof estadisticas.distribucionRating] / estadisticas.totalReseñas) * 100;
    });

  return (
    <div className="min-h-screen bg-white text-gray-800 antialiased">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: C.gray200 }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/catalogo"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" style={{ color: C.purple }} />
            <span className="hidden sm:inline">Catálogo</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Breadcrumb */}
            <span className="text-xs text-gray-400 hidden sm:block">{producto.categoria_id} · {producto.marca}</span>
            {/* Compartir */}
            <div className="relative">
              <button onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ borderColor: C.gray300 }}>
                <Share2 size={13} style={{ color: C.purple }} />
                <span className="hidden sm:inline">Compartir</span>
              </button>
              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                  <div className="absolute right-0 mt-1.5 w-44 rounded-xl p-1 shadow-2xl z-50 border bg-white"
                    style={{ borderColor: `${C.purple}30` }}>
                    <button onClick={() => { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${producto.nombre_producto}\n${window.location.href}`)}`, "_blank"); setShowShareMenu(false); }}
                      className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg text-xs font-medium text-emerald-600 transition-colors">
                      <MessageSquare size={13} /> WhatsApp
                    </button>
                    <button onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank"); setShowShareMenu(false); }}
                      className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg text-xs font-medium text-blue-600 transition-colors">
                      <Facebook size={13} /> Facebook
                    </button>
                    <div className="border-t my-1" style={{ borderColor: C.gray200 }} />
                    <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Enlace copiado"); setShowShareMenu(false); }}
                      className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-600 transition-colors">
                      <Share2 size={13} /> Copiar enlace
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

          {/* ─── GALERÍA ─── */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden border-2" style={{ borderColor: C.gray200 }}>
              {isView360 && productImages.length > 1
                ? <ProductView360 images={productImages} />
                : <ImageZoom src={imgSeleccionada || productImages[0]} alt={producto.nombre_producto} />
              }
              {productImages.length > 1 && (
                <button onClick={() => setIsView360(!isView360)}
                  className="absolute top-3 left-3 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  style={{ background: C.purpleDark }}>
                  <RotateCw size={13} />
                  {isView360 ? "Vista normal" : "360°"}
                </button>
              )}
              <button onClick={toggleWishlist} disabled={wishlistLoading}
                className="absolute top-3 right-3 p-2 rounded-xl bg-white border-2 disabled:opacity-50"
                style={{ borderColor: C.gray200 }}>
                {wishlistLoading
                  ? <div className="w-5 h-5 border-2 border-t-purple-500 rounded-full animate-spin" />
                  : enWishlist ? <HeartIcon size={20} className="fill-red-500 text-red-500" /> : <HeartIcon size={20} className="text-gray-500" />
                }
              </button>
              {/* Badges */}
              <div className="absolute top-14 right-3 flex flex-col gap-1.5">
                {producto.en_oferta && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-full text-white" style={{ background: C.orange }}>OFERTA CAJA</span>
                )}
                {producto.en_oferta_unidad && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-full text-black" style={{ background: C.yellow }}>OFERTA UNIDAD</span>
                )}
                {producto.destacado && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-full text-white" style={{ background: C.purple }}>DESTACADO</span>
                )}
              </div>
            </div>
            {/* Miniaturas */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {productImages.map((img, i) => (
                <button key={i} onClick={() => setImgSeleccionada(img)}
                  className="shrink-0 w-16 h-16 rounded-xl bg-white overflow-hidden border-2 transition-all"
                  style={{
                    borderColor: imgSeleccionada === img ? C.purple : C.gray200,
                    boxShadow: imgSeleccionada === img ? `0 0 0 2px ${C.purple}50` : "none",
                    opacity: imgSeleccionada === img ? 1 : 0.6,
                  }}>
                  <img src={img} className="w-full h-full object-contain p-1" alt={`Vista ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* ─── INFO + COMPRA ─── */}
          <div className="lg:col-span-6 space-y-4">
            {/* Encabezado */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full border"
                  style={{ background: C.gray100, borderColor: C.gray300, color: C.gray600 }}>
                  {producto.categoria_id}
                </span>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: `${C.purple}15`, color: C.purple }}>
                  <BadgeCheck size={10} className="inline mr-0.5" /> Premium B2B
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">{producto.nombre_producto}</h1>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span><strong className="text-gray-700">SKU:</strong> {producto.sku}</span>
                <span><strong className="text-gray-700">Marca:</strong> {producto.marca}</span>
                {producto.modelo && <span><strong className="text-gray-700">Modelo:</strong> {producto.modelo}</span>}
                {producto.color  && <span><strong className="text-gray-700">Color:</strong> {producto.color}</span>}
              </div>
              {/* Rating */}
              <div className="flex items-center gap-3">
                <StarRating rating={estadisticas.promedioRating} readonly size={15} />
                <span className="text-sm font-bold text-gray-700">{estadisticas.promedioRating}</span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Users size={11} /> {estadisticas.totalReseñas} opiniones
                </span>
              </div>
            </div>

            {/* Specs rápidas */}
            {(producto.capacidad_almacenamiento || producto.capacidad_ram || producto.sistema_operativo || producto.procesador) && (
              <div className="flex flex-wrap gap-2">
                {producto.capacidad_almacenamiento && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: C.purple }}>{producto.capacidad_almacenamiento}</span>
                )}
                {producto.capacidad_ram && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-black" style={{ background: C.yellow }}>RAM {producto.capacidad_ram}</span>
                )}
                {producto.sistema_operativo && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-black" style={{ background: C.green }}>{producto.sistema_operativo}</span>
                )}
                {producto.procesador && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: C.orange }}>{producto.procesador}</span>
                )}
              </div>
            )}

            {/* ── STOCK DISPLAY MEJORADO ── */}
            <StockDisplay producto={producto} tipo={tipoCompra} />

            {/* Tipo compra */}
            <TipoCompraSelector tipo={tipoCompra} setTipo={tipo => {
              setTipoCompra(tipo);
              setCantidad(tipo === "caja" ? 1 : producto.pedido_minimo);
            }} disabled={producto.estado !== "Activo"} />

            {/* Precio */}
            <div className="rounded-xl p-4 border-2" style={{ background: C.gray100, borderColor: C.gray200 }}>
              <div className="flex items-baseline gap-2 flex-wrap mb-2">
                <span className="text-3xl font-black text-gray-900">{fmtPEN(precioSeleccionado)}</span>
                {precioSeleccionado !== precioBase && (
                  <span className="text-sm text-gray-400 line-through">{fmtPEN(precioBase)}</span>
                )}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-gray-500 border" style={{ borderColor: C.gray300 }}>
                  sin IGV
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                {tipoCompra === "caja" ? (
                  <>
                    <span className="flex items-center gap-1"><Package size={12} style={{ color: C.purple }} /> Caja de {producto.unidades_por_caja} unidades</span>
                    <span className="flex items-center gap-1 font-bold" style={{ color: C.purple }}>
                      {fmtPEN(precioSeleccionado / producto.unidades_por_caja)} / unidad
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1"><Box size={12} style={{ color: C.orange }} /> Por unidad suelta</span>
                    <span className="flex items-center gap-1 font-bold" style={{ color: C.orange }}>
                      Mín {producto.pedido_minimo} unidades
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Precios por volumen */}
            <PreciosVolumenDisplay
              preciosVolumen={producto.precios_volumen} tipo={tipoCompra}
              precioCajaBase={producto.en_oferta && producto.precio_oferta_caja ? producto.precio_oferta_caja : producto.precio_caja}
              precioUnidadBase={producto.en_oferta_unidad && producto.precio_oferta_unidad ? producto.precio_oferta_unidad : producto.precio_unitario}
              onSelectPrecio={(precio, cantMin) => { setPrecioSeleccionado(precio); setCantidad(cantMin); }}
              precioSeleccionado={precioSeleccionado}
            />

            {/* Cantidad */}
            <QuantitySelector
              quantity={cantidad} setQuantity={setCantidad} max={stockActual}
              tipo={tipoCompra} pedidoMinimo={producto.pedido_minimo}
              disabled={stockActual <= 0 || producto.estado !== "Activo"}
            />

            {/* ── RESUMEN CON IGV ── */}
            {stockActual > 0 && producto.estado === "Activo" && (
              <ResumenPrecio
                precio={precioSeleccionado} cantidad={cantidad}
                tipo={tipoCompra} unidadesPorCaja={producto.unidades_por_caja}
                moneda={producto.moneda}
              />
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button onClick={handleAgregarAlCarrito}
                disabled={stockActual <= 0 || producto.estado !== "Activo"}
                className="flex-1 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-white"
                style={{
                  background: agregado ? "#16a34a" : stockActual <= 0 || producto.estado !== "Activo" ? C.gray400 : `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                  boxShadow: agregado || stockActual <= 0 ? "none" : `0 4px 20px ${C.purple}50`,
                }}>
                {producto.estado !== "Activo" ? <><AlertCircle size={16} /> Inactivo</>
                  : stockActual <= 0 ? <><AlertCircle size={16} /> Sin stock</>
                  : agregado ? <><Check size={16} /> ¡Añadido!</>
                  : <><ShoppingCart size={16} /> Agregar al carrito</>
                }
              </button>
              <button onClick={toggleWishlist} disabled={wishlistLoading || !currentUser}
                className="px-4 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border-2 transition-all disabled:opacity-50"
                style={{
                  background: enWishlist ? C.gray100 : C.white,
                  borderColor: enWishlist ? C.orange : C.gray300,
                  color: enWishlist ? C.orange : C.gray500,
                }}>
                {enWishlist ? <HeartIcon size={16} className="fill-orange-500" /> : <HeartIcon size={16} />}
                <span className="hidden sm:inline">{enWishlist ? "Quitar" : "Favoritos"}</span>
              </button>
            </div>

            {/* Beneficios */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Truck,  color: C.purple, title: "Envío Express",         desc: "24-48h Lima y regiones" },
                { icon: Shield, color: "#16a34a", title: `Garantía ${producto.garantia_meses}m`, desc: "Fábrica, sin costo" },
                { icon: Lock,   color: C.purple,  title: "Pago Seguro",          desc: "SSL 256-bit" },
                { icon: Award,  color: C.orange,  title: "Original sellado",     desc: "Nuevo de fábrica" },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="rounded-xl p-3 border-2 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: C.gray200 }}>
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${color}15` }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-gray-800">{title}</p>
                      <p className="text-[10px] text-gray-500">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Datos físicos */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Scale,    label: "Peso",     val: `${producto.peso_kg} kg` },
                { icon: Calendar, label: "Garantía", val: `${producto.garantia_meses} meses` },
                { icon: Box,      label: "Dimensiones", val: producto.dimensiones || "—" },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="rounded-xl p-3 border-2" style={{ background: C.gray100, borderColor: C.gray200 }}>
                  <Icon size={12} style={{ color: C.purple }} className="mb-1" />
                  <p className="text-[10px] font-bold text-gray-500">{label}</p>
                  <p className="text-xs font-black text-gray-900 mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            {/* Ficha técnica */}
            {producto.documento_ficha && (
              <div className="flex gap-2">
                <button onClick={handleDescargarFicha}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border-2 transition-all text-gray-700 hover:border-purple-400 hover:text-purple-700"
                  style={{ borderColor: C.gray300 }}>
                  <Download size={14} /> Descargar Ficha Técnica (PDF)
                </button>
                <a href={producto.documento_ficha} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl border-2 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                  style={{ borderColor: C.gray300 }}>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ══════ TABS ══════ */}
        <div className="mt-12">
          <div className="flex gap-1 mb-6 border-b-2 overflow-x-auto" style={{ borderColor: C.gray200 }}>
            {[
              { id: "descripcion",      label: "Descripción" },
              { id: "especificaciones", label: "Especificaciones" },
              { id: "feedback",         label: "Opiniones", count: estadisticas.totalReseñas },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="pb-3 px-2 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-1.5"
                style={{ color: activeTab === tab.id ? C.purple : C.gray500 }}>
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black"
                    style={{ background: `${C.purple}18`, color: C.purple }}>{tab.count}</span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: `linear-gradient(90deg,${C.purple},#c084fc)` }} />
                )}
              </button>
            ))}
          </div>

          {/* DESCRIPCIÓN */}
          {activeTab === "descripcion" && (
            <div className="rounded-2xl p-6 border-2" style={{ background: C.gray100, borderColor: C.gray200 }}>
              <h3 className="text-base font-black text-gray-900 mb-3">Descripción del producto</h3>
              <p className="text-gray-600 leading-relaxed text-sm mb-6">
                {producto.descripcion_corta || "Producto de alta calidad ideal para distribución B2B."}
              </p>
              {/* Specs adicionales si existen */}
              {(producto.sim || producto.conectividad || producto.bateria_mah || producto.camara_principal) && (
                <div className="mt-4">
                  <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-1.5">
                    <Sparkles size={14} style={{ color: C.purple }} /> Características destacadas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      ["SIM",          producto.sim],
                      ["Conectividad", producto.conectividad],
                      ["Batería",      producto.bateria_mah],
                      ["Cám. Trasera", producto.camara_principal],
                      ["Cám. Frontal", producto.camara_frontal],
                      ["Pantalla",     producto.tamano_pantalla],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string} className="flex justify-between p-2.5 rounded-xl border-2 bg-white"
                        style={{ borderColor: C.gray200 }}>
                        <span className="text-xs text-gray-500 font-medium">{k as string}:</span>
                        <span className="text-xs text-gray-900 font-bold text-right max-w-[60%]">{v as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-5">
                <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-1.5">
                  <Info size={14} style={{ color: C.purple }} /> Información general
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ["SKU",            producto.sku],
                    ["Marca",          producto.marca],
                    ["Modelo",         producto.modelo   || "N/A"],
                    ["Color",          producto.color    || "N/A"],
                    ["Almacenamiento", producto.capacidad_almacenamiento || "N/A"],
                    ["RAM",            producto.capacidad_ram            || "N/A"],
                    ["SO",             `${producto.sistema_operativo} ${producto.version_so || ""}`.trim() || "N/A"],
                    ["Procesador",     producto.procesador               || "N/A"],
                    ["Garantía",       `${producto.garantia_meses} meses`],
                    ["Cajas disp.",    `${producto.stock_cajas} cajas (${producto.stock_cajas * producto.unidades_por_caja} uds)`],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between p-2.5 rounded-xl border-2 bg-white"
                      style={{ borderColor: C.gray200 }}>
                      <span className="text-xs text-gray-500 font-medium">{k as string}:</span>
                      <span className="text-xs text-gray-900 font-bold">{v as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ESPECIFICACIONES */}
          {activeTab === "especificaciones" && (
            <div className="rounded-2xl p-6 border-2" style={{ background: C.gray100, borderColor: C.gray200 }}>
              <h3 className="text-base font-black text-gray-900 mb-4">Especificaciones Técnicas</h3>
              {specsArray.length > 0 ? (
                <div className="space-y-2">
                  {specsArray.map((item, i) => (
                    <div key={i} className="rounded-xl p-3 border-2 bg-white hover:bg-gray-50 transition-colors"
                      style={{ borderColor: C.gray200 }}>
                      <div className="flex items-start gap-2">
                        <List size={12} className="shrink-0 mt-0.5" style={{ color: C.purple }} />
                        <span className="text-xs text-gray-700">{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <FileText size={36} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No hay especificaciones técnicas disponibles</p>
                </div>
              )}
            </div>
          )}

          {/* RESEÑAS */}
          {activeTab === "feedback" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Izquierda */}
              <div className="space-y-4">
                {/* Resumen */}
                <div className="rounded-2xl p-5 border-2" style={{ background: C.white, borderColor: C.gray200 }}>
                  <h3 className="text-sm font-black text-gray-900 mb-4">Calificaciones</h3>
                  <div className="text-center mb-4">
                    <p className="text-5xl font-black text-gray-900">{estadisticas.promedioRating}</p>
                    <StarRating rating={estadisticas.promedioRating} readonly size={18} />
                    <p className="text-xs text-gray-400 mt-1">{estadisticas.totalReseñas} opiniones</p>
                  </div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(s => (
                      <div key={s} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-8">{s} ★</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden bg-gray-100">
                          <div className="h-full rounded-full" style={{ width: `${porcentajes[s as keyof typeof porcentajes]}%`, background: `linear-gradient(90deg,${C.purple},#c084fc)` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-4 text-right">
                          {estadisticas.distribucionRating[s as keyof typeof estadisticas.distribucionRating]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulario */}
                {currentUser ? (
                  <div className="rounded-2xl p-5 border-2" style={{ background: C.white, borderColor: C.gray200 }}>
                    <h3 className="text-sm font-black text-gray-900 mb-4">Escribir reseña</h3>
                    <form onSubmit={handleEnviarReseña} className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Calificación</label>
                        <StarRating rating={puntuacion} setRating={setPuntuacion} size={24} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Comentario *</label>
                        <textarea value={nuevaReseña} onChange={e => setNuevaReseña(e.target.value)}
                          rows={3} placeholder="Tu experiencia con este producto..."
                          className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none border-2"
                          style={{ background: C.gray100, borderColor: C.gray200 }} />
                        <p className="text-[10px] text-gray-400 mt-1 text-right">
                          {nuevaReseña.length < 10 ? `Faltan ${10 - nuevaReseña.length} caracteres` : "✓ Listo"}
                        </p>
                      </div>
                      {/* Upload fotos */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Fotos (opcional)</label>
                        {previewImages.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 mb-2">
                            {previewImages.map((img, i) => (
                              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                                <img src={img} className="w-full h-full object-cover" alt="" />
                                <button type="button" onClick={() => eliminarImagenPreview(i)}
                                  className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X size={10} color="white" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {previewImages.length < 4 && (
                          <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                            style={{ borderColor: `${C.purple}40` }}>
                            <Camera size={15} style={{ color: C.purple }} />
                            <span className="text-xs font-medium text-gray-600">{previewImages.length}/4 fotos</span>
                            <input type="file" accept="image/*" multiple onChange={handleImagenesReseña} className="hidden" />
                          </label>
                        )}
                      </div>
                      {uploadStatus && (
                        <div className="text-xs p-2 rounded-xl" style={{ background: `${C.purple}12`, color: C.purple }}>
                          {uploadStatus}
                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="mt-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: C.purple }} />
                            </div>
                          )}
                        </div>
                      )}
                      <button type="submit" disabled={enviando || nuevaReseña.length < 10}
                        className="w-full py-3 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50"
                        style={{ background: enviando || nuevaReseña.length < 10 ? C.gray400 : `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
                        {enviando ? "Publicando..." : "Publicar reseña"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="rounded-2xl p-5 text-center border-2" style={{ background: C.white, borderColor: C.gray200 }}>
                    <User size={28} className="mx-auto mb-2" style={{ color: C.purple }} />
                    <p className="text-sm font-black text-gray-900 mb-1">Inicia sesión</p>
                    <p className="text-xs text-gray-400 mb-3">Para dejar una reseña</p>
                    <Link href="/login"
                      className="inline-block px-5 py-2.5 text-white font-bold text-xs rounded-xl"
                      style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
                      Iniciar sesión
                    </Link>
                  </div>
                )}
              </div>

              {/* Derecha: reseñas */}
              <div className="lg:col-span-2 space-y-4">
                {todasImagenesReseñas.length > 0 && (
                  <div className="rounded-2xl p-4 border-2" style={{ background: C.gray100, borderColor: C.gray200 }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                        <Camera size={14} style={{ color: C.purple }} /> Fotos de clientes
                      </h3>
                      <span className="text-xs text-gray-400">{todasImagenesReseñas.length} fotos</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {todasImagenesReseñas.slice(0, 10).map((img, i) => (
                        <button key={i} onClick={() => abrirGaleria(i)}
                          className="aspect-square rounded-lg overflow-hidden bg-white border-2 group"
                          style={{ borderColor: C.gray200 }}>
                          <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <h3 className="text-base font-black text-gray-900">Opiniones ({estadisticas.totalReseñas})</h3>
                {reseñas.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {reseñas.map(r => (
                      <div key={r.id} className="rounded-2xl p-4 border-2 hover:bg-gray-50 transition-colors"
                        style={{ background: C.white, borderColor: C.gray200 }}>
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            {r.usuarioFoto
                              ? <img src={r.usuarioFoto} className="w-9 h-9 rounded-xl object-cover border-2" style={{ borderColor: C.gray200 }} alt="" />
                              : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs"
                                  style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
                                  {r.usuario?.charAt(0).toUpperCase()}
                                </div>
                            }
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-black text-xs text-gray-900">{r.usuario}</h4>
                                {r.verificado && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ background: `${C.purple}15`, color: C.purple }}>
                                    <BadgeCheck size={9} className="inline" /> Verificado
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400">{r.usuarioEmail}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StarRating rating={r.rating} readonly size={12} />
                            <span className="text-[10px] text-gray-400">
                              {r.fecha?.toDate ? getRelativeTime(r.fecha.toDate()) : "Reciente"}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed mb-2">{r.comentario}</p>
                        {r.imagenes?.length > 0 && (
                          <div className="flex gap-1.5 mb-2">
                            {r.imagenes.map((img, i) => (
                              <button key={i} onClick={() => abrirGaleria(todasImagenesReseñas.indexOf(img))}
                                className="w-12 h-12 rounded-lg overflow-hidden border-2" style={{ borderColor: C.gray200 }}>
                                <img src={img} className="w-full h-full object-cover" alt="" />
                              </button>
                            ))}
                          </div>
                        )}
                        <button onClick={() => marcarUtil(r.id)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors"
                          style={{ color: C.purple }}
                          onMouseEnter={e => (e.currentTarget.style.background = `${C.purple}12`)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <Heart size={10} /> Útil ({r.util})
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-2xl border-2" style={{ background: C.gray100, borderColor: C.gray200 }}>
                    <Star size={32} className="text-gray-300 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-gray-700 mb-1">Sin reseñas aún</h3>
                    <p className="text-xs text-gray-400">¡Sé el primero en opinar!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL GALERÍA ── */}
      {galleriaAbierta && todasImagenesReseñas.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/92">
          <button onClick={cerrarGaleria} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
            <X size={18} color="white" />
          </button>
          {todasImagenesReseñas.length > 1 && (
            <>
              <button onClick={() => navegarGaleria("prev")} className="absolute left-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
                <ChevronLeft size={20} color="white" />
              </button>
              <button onClick={() => navegarGaleria("next")} className="absolute right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
                <ChevronRight size={20} color="white" />
              </button>
            </>
          )}
          <div className="max-w-3xl max-h-[80vh]">
            <img src={todasImagenesReseñas[imagenGaleriaActual]} className="max-w-full max-h-full object-contain rounded-2xl mx-auto" alt="" />
            <p className="text-center text-white text-xs mt-3 font-bold">{imagenGaleriaActual + 1} / {todasImagenesReseñas.length}</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
      `}</style>
    </div>
  );
}