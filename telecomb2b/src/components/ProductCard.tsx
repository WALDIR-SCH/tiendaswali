"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { ShieldCheck, CheckCircle, Star, Package, ShoppingCart, Check, Zap, Award } from "lucide-react";

// ─── PALETA OFICIAL ────────────────────────────────────────────
const C = {
  orange:  "#FF6600",
  yellow:  "#F6FA00",
  green:   "#28FB4B",
  purple:  "#9851F9",
  black:   "#000000",
  white:   "#FFFFFF",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
} as const;

// ─── INTERFAZ ─────────────────────────────────────────────────
interface ProductoProps {
  producto: {
    id:                       string;
    sku:                      string;
    nombre_producto?:         string;
    nombre?:                  string;            // compatibilidad
    descripcion_corta?:       string;
    descripcion?:             string;            // compatibilidad
    precio?:                  number;            // precio base a mostrar
    precioBase?:              number;            // compatibilidad
    precio_caja:              number;
    precio_unitario?:         number;
    precio_oferta_caja?:      number | null;
    precio_oferta_unidad?:    number | null;
    en_oferta?:               boolean;
    en_oferta_unidad?:        boolean;
    precios_volumen?: {
      unidad: { cantidad: number; precio: number }[];
      caja:   { cantidad: number; precio: number }[];
    } | null;
    moneda?:                  string;
    stock:                    number;            // stock_cajas
    stock_cajas?:             number;
    stock_unidades?:          number;
    unidades_por_caja?:       number;
    pedido_minimo?:           number;
    stock_minimo?:            number;
    stock_minimo_cajas?:      number;
    imagen_principal?:        string;
    imagenUrl?:               string;            // compatibilidad
    categoria?:               string;
    categoria_id?:            string;
    marca?:                   string;
    modelo?:                  string;
    color?:                   string;
    capacidad_almacenamiento?: string;
    capacidad_ram?:           string;
    sistema_operativo?:       string;
    procesador?:              string;
    garantia_meses?:          number;
    rating_promedio?:         number;
    total_resenas?:           number;
    destacado?:               boolean;
    estado?:                  string;
    precioVolumen10?:         number;
    precioVolumen50?:         number;
    precioVolumen100?:        number;
    [key: string]: any;
  };
}

// ─── HELPERS ──────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ═════════════════════════════════════════════════════════════
// COMPONENTE
// ═════════════════════════════════════════════════════════════
export default function ProductCard({ producto }: ProductoProps) {
  const { agregarAlCarrito, abrirCarrito } = useCart();
  const [agregado, setAgregado] = useState(false);

  // ── Guardia ────────────────────────────────────────────────
  if (!producto) {
    return (
      <div
        className="rounded-2xl border p-6 flex items-center justify-center h-40"
        style={{ background: "#0d0005", borderColor: `${C.orange}20` }}
      >
        <p className="text-sm" style={{ color: C.gray500 }}>Producto no disponible</p>
      </div>
    );
  }

  // ── Valores seguros ────────────────────────────────────────
  const nombre       = producto.nombre_producto || producto.nombre || "Producto sin nombre";
  const descripcion  = producto.descripcion_corta || producto.descripcion || "";
  const imagen       = producto.imagen_principal  || producto.imagenUrl || "/placeholder-image.jpg";
  const categoria    = producto.categoria_id      || producto.categoria  || "Sin categoría";
  const moneda       = "PEN";  // Siempre soles

  // Precio principal: usa precio (calculado por el padre con oferta aplicada)
  // Si no viene, calcula desde precio_caja con oferta
  const precioCaja: number = (() => {
    if (producto.precio && producto.precio > 0) return producto.precio;
    if (producto.precioBase && producto.precioBase > 0) return producto.precioBase;
    if (producto.en_oferta && producto.precio_oferta_caja) return Number(producto.precio_oferta_caja);
    return Number(producto.precio_caja) || 0;
  })();

  const precioCajaOriginal: number = Number(producto.precio_caja) || 0;
  const precioUnidad: number       = (() => {
    if (producto.en_oferta_unidad && producto.precio_oferta_unidad) return Number(producto.precio_oferta_unidad);
    return Number(producto.precio_unitario) || 0;
  })();

  const stockCajas         = Number(producto.stock_cajas ?? producto.stock) || 0;
  const stockUnidades      = Number(producto.stock_unidades) || 0;
  const udsPorCaja         = Number(producto.unidades_por_caja) || 1;
  const pedidoMinimo       = Number(producto.pedido_minimo) || 5;
  const stockMinimoCajas   = Number(producto.stock_minimo_cajas ?? producto.stock_minimo) || 2;
  const garantiaMeses      = Number(producto.garantia_meses) || 12;
  const rating             = Number(producto.rating_promedio) || 0;
  const totalResenas       = Number(producto.total_resenas)   || 0;

  const hayOfertaCaja      = Boolean(producto.en_oferta && producto.precio_oferta_caja);
  const hayOfertaUnidad    = Boolean(producto.en_oferta_unidad && producto.precio_oferta_unidad);

  // Estado stock
  const sinStock    = stockCajas <= 0;
  const stockCritico = !sinStock && stockCajas <= stockMinimoCajas;

  // Descuento oferta caja (%)
  const descuentoCaja = hayOfertaCaja && precioCajaOriginal > 0
    ? Math.round((1 - precioCaja / precioCajaOriginal) * 100)
    : 0;

  // WhatsApp contacto (número B2B)
  const WHATSAPP_B2B = "51974212579";
  const mensajeWA = encodeURIComponent(
    `*COTIZACIÓN B2B*\n\n*Producto:* ${nombre}\n*SKU:* ${producto.sku}\n*Precio/caja:* S/ ${fmt(precioCaja)}\n*Stock:* ${stockCajas} cajas\n*Pedido mínimo:* ${pedidoMinimo} unidades\n\n${typeof window !== "undefined" ? window.location.origin : ""}/producto/${producto.id}`
  );

  // ── Agregar al carrito ─────────────────────────────────────
  const handleAgregar = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (sinStock) return;

    agregarAlCarrito(
      {
        id:                producto.id,
        nombre:            nombre,
        sku:               producto.sku,
        precioBase:        precioCaja,
        precio_caja:       precioCajaOriginal,
        precio_unitario:   precioUnidad,
        stock:             stockCajas,
        stock_cajas:       stockCajas,
        stock_unidades:    stockUnidades,
        imagenUrl:         imagen,
        imagen_principal:  imagen,
        unidad_venta:      "caja",
        tipoCompra:        "caja" as const,
        unidadesPorCaja:   udsPorCaja,
      },
      1,       // cantidad inicial: 1 caja
      "caja"   // tipoCompra
    );

    setAgregado(true);
    abrirCarrito();
    setTimeout(() => setAgregado(false), 2000);
  };

  // ── WhatsApp ───────────────────────────────────────────────
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(`https://wa.me/${WHATSAPP_B2B}?text=${mensajeWA}`, "_blank", "noopener,noreferrer");
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div
      className="relative rounded-2xl border overflow-hidden flex flex-col h-full transition-all duration-300"
      style={{ background: C.white, borderColor: C.gray300 }}
    >
      {/* ── Imagen ──────────────────────────────────────────── */}
      <div
        className="relative h-44 flex items-center justify-center p-4 overflow-hidden"
        style={{ background: C.gray300 }}
      >
        <img
          src={imagen}
          alt={nombre}
          className="max-h-full max-w-full object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-110"
          onError={e => { (e.target as HTMLImageElement).src = "/placeholder-image.jpg"; }}
        />

        {/* Badge categoría */}
        <span
          className="absolute bottom-3 left-3 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg"
          style={{ background: `${C.orange}cc`, color: C.black }}
        >
          {categoria.length > 14 ? `${categoria.slice(0, 14)}…` : categoria}
        </span>

        {/* Badge marca */}
        {producto.marca && (
          <span
            className="absolute bottom-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg"
            style={{ background: `${C.purple}cc`, color: C.white }}
          >
            {producto.marca}
          </span>
        )}

        {/* Badge descuento */}
        {descuentoCaja > 0 && (
          <span
            className="absolute top-3 right-3 text-[10px] font-black px-2 py-1 rounded-lg"
            style={{ background: C.green, color: C.black }}
          >
            -{descuentoCaja}%
          </span>
        )}

        {/* Badge stock crítico */}
        {stockCritico && (
          <span
            className="absolute top-3 left-3 text-[9px] font-black px-2 py-1 rounded-lg animate-pulse"
            style={{ background: "#ef4444", color: C.white }}
          >
            ⚠ ÚLTIMAS CAJAS
          </span>
        )}
      </div>

      {/* ── Contenido ───────────────────────────────────────── */}
      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* SKU + Nombre */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: C.gray500 }}>
            SKU: {producto.sku || "—"}
          </p>
          <h3 className="font-black text-gray-900 text-sm leading-tight line-clamp-2" style={{ minHeight: "2.5rem" }}>
            {nombre}
          </h3>
          {descripcion && (
            <p className="text-[11px] leading-relaxed line-clamp-2 mt-1" style={{ color: C.gray400 }}>
              {descripcion}
            </p>
          )}
        </div>

        {/* Specs rápidas */}
        {(producto.capacidad_almacenamiento || producto.capacidad_ram || producto.color) && (
          <div className="flex flex-wrap gap-1">
            {producto.capacidad_almacenamiento && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded" style={{ background: C.black, color: C.white }}>
                {producto.capacidad_almacenamiento}
              </span>
            )}
            {producto.capacidad_ram && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded" style={{ background: C.yellow, color: C.black }}>
                {producto.capacidad_ram}
              </span>
            )}
            {producto.color && (
              <span className="text-[9px] font-medium px-2 py-0.5 rounded border" style={{ color: C.gray600, borderColor: C.gray300 }}>
                {producto.color}
              </span>
            )}
          </div>
        )}

        {/* Garantía + Rating */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border"
            style={{ background: `${C.purple}10`, borderColor: `${C.purple}25` }}
          >
            <ShieldCheck size={11} style={{ color: C.purple }} />
            <span className="text-[9px] font-black uppercase" style={{ color: C.purple }}>
              {garantiaMeses}m garantía
            </span>
          </div>

          {totalResenas > 0 && (
            <div className="flex items-center gap-1">
              <Star size={11} className="fill-yellow-400 text-yellow-400" />
              <span className="text-[10px] font-bold text-gray-800">{rating.toFixed(1)}</span>
              <span className="text-[9px]" style={{ color: C.gray500 }}>({totalResenas})</span>
            </div>
          )}
        </div>

        {/* ── Precio principal ─────────────────────────────── */}
        <div
          className="rounded-xl p-3 border"
          style={{ background: `${C.orange}08`, borderColor: `${C.orange}20` }}
        >
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>
                Precio por caja ({udsPorCaja} uds)
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-gray-900">
                  S/ {fmt(precioCaja)}
                </span>
                {hayOfertaCaja && precioCajaOriginal > precioCaja && (
                  <span className="text-xs line-through" style={{ color: C.gray400 }}>
                    S/ {fmt(precioCajaOriginal)}
                  </span>
                )}
              </div>
            </div>
            {precioUnidad > 0 && (
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.gray500 }}>
                  Por unidad
                </p>
                <span className="text-sm font-black" style={{ color: hayOfertaUnidad ? "#16a34a" : C.gray600 }}>
                  S/ {fmt(precioUnidad)}
                </span>
                {hayOfertaUnidad && (
                  <span className="block text-[8px] font-black" style={{ color: C.green }}>OFERTA</span>
                )}
              </div>
            )}
          </div>

          {/* Mín pedido */}
          <p className="text-[9px] mt-2 font-medium" style={{ color: C.gray500 }}>
            Pedido mín. B2B: <span className="font-black" style={{ color: C.orange }}>{pedidoMinimo} unidades</span>
          </p>
        </div>



        {/* ── Stock ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${sinStock ? "bg-red-500" : stockCritico ? "bg-yellow-400 animate-pulse" : ""}`}
            style={{ background: sinStock ? "#ef4444" : stockCritico ? "#facc15" : C.green }}
          />
          <p
            className="text-[9px] font-black uppercase tracking-wider"
            style={{ color: sinStock ? "#f87171" : stockCritico ? "#fbbf24" : C.green }}
          >
            {sinStock
              ? "Sin stock"
              : stockCritico
                ? `Stock crítico: ${stockCajas} caja${stockCajas !== 1 ? "s" : ""}`
                : `${stockCajas} caja${stockCajas !== 1 ? "s" : ""} disponible${stockCajas !== 1 ? "s" : ""}`
            }
          </p>
          {!sinStock && stockUnidades > 0 && (
            <span className="text-[9px] font-medium ml-auto" style={{ color: C.gray500 }}>
              {stockUnidades} uds
            </span>
          )}
        </div>

        {/* ── Botones ─────────────────────────────────────────── */}
        <div className="flex gap-2 mt-auto">

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-all active:scale-90"
            style={{ background: "linear-gradient(135deg,#25D366,#128C7E)", border: "1px solid #25D36640" }}
            title="Cotizar por WhatsApp"
          >
            <svg viewBox="0 0 448 512" className="w-4 h-4 fill-white">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.1 0-65.6-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.2-3.2-5.6-.3-8.6 2.4-11.4 2.6-2.5 5.6-6.5 8.3-9.8 2.8-3.3 3.7-5.6 5.6-9.3 1.8-3.7.9-6.9-.5-9.8-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
            </svg>
          </button>

          {/* Agregar al carrito */}
          <button
            onClick={handleAgregar}
            disabled={sinStock}
            className="flex-1 h-11 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:cursor-not-allowed"
            style={{
              background: sinStock
                ? `${C.gray600}50`
                : agregado
                  ? `linear-gradient(135deg,${C.green},#16a34a)`
                  : C.purple,
              color: sinStock ? C.gray500 : C.white,
              boxShadow: sinStock || agregado ? "none" : `0 4px 16px ${C.purple}50`,
              opacity: sinStock ? 0.5 : 1,
            }}
          >
            {sinStock ? (
              <>
                <Package size={14} />
                Sin stock
              </>
            ) : agregado ? (
              <>
                <Check size={14} />
                ¡Añadido!
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                Agregar al carrito
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}