"use client";
import { useCart } from "@/context/CartContext";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Package, Box } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// ─── PALETA OFICIAL ────────────────────────────────────────────
const C = {
  orange:  "#FF6600",
  yellow:  "#F6FA00",
  green:   "#28FB4B",
  purple:  "#9851F9",
  black:   "#000000",
  white:   "#FFFFFF",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
} as const;

const fmt = (n: number) =>
  n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ═════════════════════════════════════════════════════════════
// COMPONENTE
// ═════════════════════════════════════════════════════════════
export default function MiniCart() {
  const {
    carrito,
    agregarAlCarrito,
    reducirCantidad,
    actualizarCantidad,
    eliminarDelCarrito,
    total,
    isCartOpen,
    cerrarCarrito,
  } = useCart();

  // Aumentar cantidad: usa actualizarCantidad con el id EXACTO del item
  // (que puede ser "abc123-caja") — evita que agregarAlCarrito construya
  // "abc123-caja-caja" y cree un duplicado
  const aumentarCantidad = (item: any, step: number) => {
    actualizarCantidad(item.id, (item.cantidad || 1) + step);
  };

  const pathname = usePathname();

  // Cerrar al cambiar de ruta
  useEffect(() => {
    if (isCartOpen) cerrarCarrito();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Determinar step de incremento ─────────────────────────
  // Para B2B: si el ítem es "caja" se incrementa de 1 en 1 caja,
  // si es "unidad" se incrementa de 10 en 10 (pedido mínimo configurable)
  const getStep = (item: any): number => {
    if (item.tipoCompra === "caja")   return 1;
    if (item.tipoCompra === "unidad") return item.pedido_minimo || 10;
    // Compatibilidad con items viejos sin tipoCompra
    if (item.unidad_venta?.toLowerCase().includes("caja")) return 1;
    return 1;
  };

  const getTipoLabel = (item: any): string => {
    if (item.tipoCompra === "caja")   return "caja";
    if (item.tipoCompra === "unidad") return "unidad";
    return "unidad";
  };

  // Subtotal por línea (cantidad × precio)
  const getSubtotal = (item: any): number => {
    return (item.precioBase || 0) * (item.cantidad || 1);
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cerrarCarrito}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.75)" }}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[400px] z-50 flex flex-col shadow-2xl"
            style={{
              background: C.white,
              borderLeft: `1px solid ${C.orange}20`,
            }}
          >
            {/* ── Header ──────────────────────────────────────── */}
            <div
              className="px-5 py-4 flex justify-between items-center shrink-0"
              style={{ borderBottom: `1px solid ${C.orange}15` }}
            >
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Carrito B2B
                </h2>
                <p className="text-xs mt-0.5" style={{ color: C.gray500 }}>
                  {carrito.length} {carrito.length === 1 ? "producto" : "productos"} • Solo S/ (PEN)
                </p>
              </div>
              <button
                onClick={cerrarCarrito}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: C.gray400 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.orange; (e.currentTarget as HTMLElement).style.background = `${C.orange}10`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.gray400; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Ítems ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: `${C.orange}10`, border: `1px solid ${C.orange}20` }}
                  >
                    <ShoppingBag size={28} style={{ color: C.orange }} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">Tu carrito está vacío</p>
                    <p className="text-xs mt-1" style={{ color: C.gray500 }}>
                      Agrega productos del catálogo mayorista
                    </p>
                  </div>
                </div>
              ) : (
                carrito.map(item => {
                  const step      = getStep(item);
                  const tipoLabel = getTipoLabel(item);
                  const esCaja    = tipoLabel === "caja";

                  return (
                    <div
                      key={`${item.id}-${tipoLabel}`}
                      className="flex gap-3 p-3 rounded-xl border transition-colors"
                      style={{
                        background: C.gray100,
                        borderColor: C.gray200,
                      }}
                    >
                      {/* Imagen */}
                      <div
                        className="w-14 h-14 rounded-xl p-1.5 shrink-0 flex items-center justify-center"
                        style={{ background: C.white, border: `1px solid ${C.orange}20` }}
                      >
                        <img
                          src={item.imagenUrl || item.imagen_principal || "/placeholder-image.jpg"}
                          alt={item.nombre}
                          className="w-full h-full object-contain"
                          onError={e => { (e.target as HTMLImageElement).src = "/placeholder-image.jpg"; }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {/* Nombre + SKU */}
                        <p className="text-gray-900 text-xs font-bold leading-tight truncate">
                          {item.nombre || "Producto"}
                        </p>
                        {item.sku && (
                          <p className="text-[9px] font-mono mt-0.5" style={{ color: C.gray500 }}>
                            SKU: {item.sku}
                          </p>
                        )}

                        {/* Tipo compra badge */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center gap-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                            style={
                              esCaja
                                ? { background: `${C.orange}15`, color: C.orange }
                                : { background: `${C.purple}15`, color: C.purple }
                            }
                          >
                            {esCaja ? <Package size={9} /> : <Box size={9} />}
                            Por {tipoLabel}
                          </span>
                          {esCaja && item.unidadesPorCaja && (
                            <span className="text-[8px]" style={{ color: C.gray500 }}>
                              {item.unidadesPorCaja} uds/caja
                            </span>
                          )}
                        </div>

                        {/* Precio + controles */}
                        <div className="flex items-center justify-between mt-2">
                          {/* Precio unitario */}
                          <div>
                            <p className="text-xs font-black" style={{ color: C.orange }}>
                              S/ {fmt(item.precioBase || 0)}
                              <span className="font-medium text-[9px] ml-1" style={{ color: C.gray500 }}>
                                /{tipoLabel}
                              </span>
                            </p>
                            <p className="text-[9px] font-bold" style={{ color: C.purple }}>
                              Total: S/ {fmt(getSubtotal(item))}
                            </p>
                          </div>

                          {/* Controles cantidad */}
                          <div
                            className="flex items-center rounded-lg overflow-hidden border"
                            style={{ borderColor: C.gray200 }}
                          >
                            <button
                              onClick={() => {
                                const nueva = (item.cantidad || 1) - step;
                                if (nueva <= 0) eliminarDelCarrito(item.id);
                                else actualizarCantidad(item.id, nueva);
                              }}
                              className="w-7 h-7 flex items-center justify-center transition-colors"
                              style={{ background: C.white, color: C.gray500 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${C.orange}12`; (e.currentTarget as HTMLElement).style.color = C.orange; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.white; (e.currentTarget as HTMLElement).style.color = C.gray500; }}
                            >
                              <Minus size={12} />
                            </button>
                            <span
                              className="w-9 text-center text-xs font-black text-gray-900"
                              style={{ background: C.gray100 }}
                            >
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => aumentarCantidad(item, step)}
                              className="w-7 h-7 flex items-center justify-center transition-colors"
                              style={{ background: C.white, color: C.gray500 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${C.orange}12`; (e.currentTarget as HTMLElement).style.color = C.orange; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.white; (e.currentTarget as HTMLElement).style.color = C.gray500; }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Eliminar */}
                      <button
                        onClick={() => eliminarDelCarrito(item.id)}
                        className="shrink-0 self-start p-1.5 rounded-lg transition-colors mt-0.5"
                        style={{ color: C.gray600 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.gray600; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────── */}
            {carrito.length > 0 && (
              <div
                className="shrink-0 p-5"
                style={{ borderTop: `1px solid ${C.gray200}`, background: C.white }}
              >
                {/* Resumen */}
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium" style={{ color: C.gray500 }}>
                      Subtotal B2B
                    </p>
                    <p className="text-[9px]" style={{ color: C.gray400 }}>
                      IGV no incluido • Solo PEN
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-900">
                      S/ {fmt(total)}
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href="/carrito"
                  onClick={cerrarCarrito}
                  className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    background: C.purple,
                    color: C.white,
                    boxShadow: `0 4px 20px ${C.purple}40`,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#7c3aed"; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 28px ${C.purple}55`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.purple; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${C.purple}40`; }}
                >
                  Ir al carrito
                  <ArrowRight size={16} />
                </Link>

                <p className="text-center text-[9px] mt-2.5 font-medium" style={{ color: C.gray400 }}>
                  Precios mayoristas exclusivos B2B • Mín. {carrito[0]?.pedido_minimo || 5} uds
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}