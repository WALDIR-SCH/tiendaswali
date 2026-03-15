"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import ProductCard from "@/components/ProductCard";
import {
  Search, Filter, ArrowUp, LayoutGrid, Loader2, Package,
  DollarSign, Hash, Tag, Truck, CheckCircle, XCircle,
  Download, Share2, QrCode, FileText, AlertCircle,
  ChevronDown, Star, Clock, Award, Grid,
  TrendingUp, Layers, Zap, ShieldCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import * as QRCode from "qrcode";

// ─── PALETA OFICIAL ───────────────────────────────────────────
const C = {
  orange:  "#FF6600",
  yellow:  "#F6FA00",
  green:   "#28FB4B",
  purple:  "#9851F9",
  black:   "#000000",
  white:   "#FFFFFF",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
} as const;

// ─── ÍCONOS POR CATEGORÍA ─────────────────────────────────────
const CATEGORIA_ICONS: Record<string, React.ElementType> = {
  "Todos":      LayoutGrid,
  "Gama Alta":  Star,
  "Gama Media": LayoutGrid,
  "Gama Baja":  Package,
};

const CATEGORIAS = ["Todos", "Gama Alta", "Gama Media", "Gama Baja"];

const DESCUENTOS_VOLUMEN = [
  { label: "1–9 cajas",    descuento: 0  },
  { label: "10–49 cajas",  descuento: 5  },
  { label: "50–99 cajas",  descuento: 10 },
  { label: "100+ cajas",   descuento: 15 },
];

// ─── SKELETON ─────────────────────────────────────────────────
const SkeletonCard = ({ index }: { index: number }) => (
  <div
    className="rounded-2xl overflow-hidden flex flex-col h-96 animate-pulse"
    style={{
      animationDelay: `${index * 80}ms`,
      background: "linear-gradient(135deg,#1a0a00 0%,#110614 100%)",
      border: `1px solid ${C.orange}20`,
    }}
  >
    <div className="h-44 w-full" style={{ background: `${C.orange}08` }} />
    <div className="p-5 space-y-3">
      <div className="h-2.5 rounded w-1/3" style={{ background: `${C.orange}15` }} />
      <div className="h-4 rounded w-full"  style={{ background: `${C.orange}10` }} />
      <div className="h-4 rounded w-2/3"   style={{ background: `${C.orange}08` }} />
      <div className="h-10 rounded-xl w-full mt-4" style={{ background: `${C.orange}06` }} />
    </div>
  </div>
);

// ─── BADGE REUTILIZABLE ───────────────────────────────────────
const Badge = ({
  children, color, bg, border, className = ""
}: {
  children: React.ReactNode;
  color: string; bg: string; border: string; className?: string;
}) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm border whitespace-nowrap ${className}`}
    style={{ color, background: bg, borderColor: border }}
  >
    {children}
  </span>
);

// ═════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════
export default function CatalogoPage() {
  const router = useRouter();
  const { language } = useLanguage();

  // ── Estado ──────────────────────────────────────────────────
  const [productos,          setProductos]          = useState<any[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([]);
  const [categoriaActiva,    setCategoriaActiva]    = useState("Todos");
  const [busqueda,           setBusqueda]           = useState("");
  const [busquedaSku,        setBusquedaSku]        = useState("");
  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState<string[]>([]);
  const [rangoPrecio,        setRangoPrecio]        = useState<[number, number]>([0, 500000]);
  const [soloDisponibles,    setSoloDisponibles]    = useState(false);
  const [soloDestacados,     setSoloDestacados]     = useState(false);
  const [mostrarFiltros,     setMostrarFiltros]     = useState(false);
  const [loading,            setLoading]            = useState(true);
  const [showScrollTop,      setShowScrollTop]      = useState(false);
  const [navigatingId,       setNavigatingId]       = useState<string | null>(null);
  const [qrModal,            setQrModal]            = useState<{ show: boolean; url: string; producto: any }>({ show: false, url: "", producto: null });
  const [sugerencias,        setSugerencias]        = useState<string[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [categoriasAbierto,  setCategoriasAbierto]  = useState(false);

  const searchRef     = useRef<HTMLDivElement>(null);
  const categoriasRef = useRef<HTMLDivElement>(null);

  // ── Click fuera ─────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current     && !searchRef.current.contains(e.target as Node))     setMostrarSugerencias(false);
      if (categoriasRef.current && !categoriasRef.current.contains(e.target as Node)) setCategoriasAbierto(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Scroll ──────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Generar QR ──────────────────────────────────────────────
  const generarQR = useCallback(async (producto: any) => {
    try {
      const url    = `${window.location.origin}/producto/${producto.id}`;
      const qrData = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: C.orange, light: C.white },
      });
      setQrModal({ show: true, url: qrData, producto });
    } catch (e) {
      console.error("QR generation error:", e);
    }
  }, []);

  // ── Compartir WhatsApp ───────────────────────────────────────
  const compartirWhatsApp = useCallback((producto: any) => {
    const precio = producto.en_oferta && producto.precio_oferta_caja
      ? producto.precio_oferta_caja
      : producto.precio_caja || 0;
    const texto = `*${producto.nombre_producto}*\nSKU: ${producto.sku}\nMarca: ${producto.marca}\nPrecio/caja: S/ ${precio.toFixed(2)}\nStock: ${producto.stock_cajas || 0} cajas\n\n${window.location.origin}/producto/${producto.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }, []);

  // ── Precio base con oferta ───────────────────────────────────
  const getPrecioBase = (prod: any): number => {
    if (prod.en_oferta && prod.precio_oferta_caja) return Number(prod.precio_oferta_caja);
    return Number(prod.precio_caja) || 0;
  };

  // ── Precio con descuento por volumen ────────────────────────
  const precioConVolumen = useCallback((precioBase: number, cajas: number): number => {
    if (cajas >= 100) return precioBase * 0.85;
    if (cajas >= 50)  return precioBase * 0.90;
    if (cajas >= 10)  return precioBase * 0.95;
    return precioBase;
  }, []);

  // ── Cargar productos ────────────────────────────────────────
  useEffect(() => {
    const obtener = async () => {
      try {
        const snap   = await getDocs(collection(db, "productos"));
        const docs   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const activos = docs.filter((p: any) => p.estado === "Activo");

        const mapeados = activos.map((prod: any) => {
          const stockCajas    = Number(prod.stock_cajas)      || 0;
          const udsPorCaja    = Number(prod.unidades_por_caja) || 1;
          const precioBase    = getPrecioBase(prod);
          return {
            ...prod,
            stock_cajas:       stockCajas,
            unidades_por_caja: udsPorCaja,
            stock_unidades:    prod.stock_unidades ?? stockCajas * udsPorCaja,
            precio_mostrar:    precioBase,
            disponible:        stockCajas > 0,
            tiempoEntrega:     stockCajas > 0 ? "24-48h" : "7-10 días",
            precioVolumen10:   precioConVolumen(precioBase, 10),
            precioVolumen50:   precioConVolumen(precioBase, 50),
            precioVolumen100:  precioConVolumen(precioBase, 100),
          };
        });

        // Ordenar: destacados primero, luego por stock
        mapeados.sort((a: any, b: any) => {
          if (a.destacado && !b.destacado) return -1;
          if (!a.destacado && b.destacado) return 1;
          return (b.stock_cajas || 0) - (a.stock_cajas || 0);
        });

        setProductos(mapeados);
        setProductosFiltrados(mapeados);

        const palabras = mapeados.flatMap((p: any) =>
          [p.nombre_producto, p.sku, p.marca, p.modelo, p.categoria_id].filter(Boolean)
        );
        setSugerencias([...new Set(palabras)].slice(0, 15) as string[]);
      } catch (e) {
        console.error("Error loading products:", e);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
    obtener();
  }, [precioConVolumen]);

  // ── Marcas disponibles ───────────────────────────────────────
  const marcasDisponibles = useMemo(() => {
    const m = productos.map((p: any) => p.marca).filter(Boolean);
    return [...new Set(m)].sort() as string[];
  }, [productos]);

  // ── Filtros aplicados ────────────────────────────────────────
  useEffect(() => {
    let r = [...productos];

    if (categoriaActiva !== "Todos")
      r = r.filter((p: any) => p.categoria_id === categoriaActiva);

    if (busqueda.trim()) {
      const t = busqueda.toLowerCase();
      r = r.filter((p: any) =>
        [p.nombre_producto, p.descripcion_corta, p.marca, p.modelo, p.categoria_id, p.color]
          .some(v => v?.toLowerCase().includes(t))
      );
    }

    if (busquedaSku.trim()) {
      const t = busquedaSku.toLowerCase();
      r = r.filter((p: any) => (p.sku || "").toLowerCase().includes(t));
    }

    if (marcasSeleccionadas.length > 0)
      r = r.filter((p: any) => marcasSeleccionadas.includes(p.marca));

    r = r.filter((p: any) => {
      const precio = p.precio_mostrar || 0;
      return precio >= rangoPrecio[0] && precio <= rangoPrecio[1];
    });

    if (soloDisponibles) r = r.filter((p: any) => p.stock_cajas > 0);
    if (soloDestacados)  r = r.filter((p: any) => p.destacado === true);

    setProductosFiltrados(r);
  }, [categoriaActiva, busqueda, busquedaSku, marcasSeleccionadas, rangoPrecio, soloDisponibles, soloDestacados, productos]);

  // ── Conteo filtros activos ───────────────────────────────────
  const filtrosActivos = marcasSeleccionadas.length +
    (soloDisponibles ? 1 : 0) +
    (soloDestacados  ? 1 : 0) +
    (busquedaSku     ? 1 : 0);

  // ── Navegar a producto ───────────────────────────────────────
  const handleProductClick = useCallback(async (id: string) => {
    setNavigatingId(id);
    try {
      await router.push(`/producto/${id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setNavigatingId(null), 1500);
    }
  }, [router]);

  // ── Limpiar filtros ──────────────────────────────────────────
  const limpiarFiltros = useCallback(() => {
    setCategoriaActiva("Todos");
    setBusqueda("");
    setBusquedaSku("");
    setMarcasSeleccionadas([]);
    setRangoPrecio([0, 500000]);
    setSoloDisponibles(false);
    setSoloDestacados(false);
  }, []);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ background: C.white }}
      >
        <div className="max-w-7xl mx-auto">
          <div
            className="h-24 rounded-2xl mb-8 animate-pulse"
            style={{ background: `${C.orange}08`, border: `1px solid ${C.orange}20` }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} index={i} />)}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════
  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: C.white }}
    >
      {/* ── Fondo decorativo sutil ───────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-[200px]"
          style={{ background: `radial-gradient(circle,${C.orange}07 0%,transparent 70%)` }}
        />
        <div
          className="absolute top-1/2 -right-56 w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: `radial-gradient(circle,${C.purple}05 0%,transparent 70%)` }}
        />
        {/* Línea superior */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg,transparent,${C.orange}30,transparent)` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">

        {/* ══════ HEADER ══════════════════════════════════════ */}
        <header className="mb-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">

            {/* Título */}
            <div className="space-y-3">
              {/* Badge B2B */}
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-[0.25em]"
                style={{
                  background: `${C.orange}12`,
                  borderColor: `${C.orange}40`,
                  color: C.orange,
                }}
              >
                <div
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: C.orange }}
                />
                B2B • Celulares Nuevos Sellados • Solo PEN (S/)
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Catálogo
                <span className="font-thin text-gray-400"> / </span>
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg,${C.orange},#e65c00)` }}
                >
                  Mayorista
                </span>
              </h1>
              <p className="text-gray-500 text-sm font-medium tracking-wide">
                Precios B2B exclusivos • Stock industrial • Envío prioritario 24-48h
              </p>
            </div>

            {/* Controles derecha */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Selector de categorías */}
              <div className="relative" ref={categoriasRef}>
                <button
                  onClick={() => setCategoriasAbierto(!categoriasAbierto)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border text-sm font-semibold"
                  style={{
                    background: `${C.orange}10`,
                    borderColor: `${C.orange}35`,
                    color: C.gray600,
                  }}
                >
                  <Grid size={15} style={{ color: C.orange }} />
                  <span className="max-w-[140px] truncate">{categoriaActiva}</span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform ${categoriasAbierto ? "rotate-180" : ""}`}
                    style={{ color: C.gray400 }}
                  />
                </button>

                {categoriasAbierto && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl z-50 overflow-hidden border"
                    style={{ background: C.white, borderColor: `${C.orange}30` }}
                  >
                    <div className="p-2">
                      {CATEGORIAS.map(cat => {
                        const Icon   = CATEGORIA_ICONS[cat] || LayoutGrid;
                        const active = categoriaActiva === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => { setCategoriaActiva(cat); setCategoriasAbierto(false); }}
                            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 border"
                            style={{
                              background: active ? `${C.orange}12` : "transparent",
                              borderColor: active ? `${C.orange}35` : "transparent",
                              color: active ? C.orange : C.gray500,
                            }}
                          >
                            <Icon size={15} style={{ color: active ? C.orange : C.gray400 }} />
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Moneda */}
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold"
                style={{
                  background: `${C.orange}08`,
                  borderColor: `${C.orange}25`,
                  color: C.orange,
                }}
              >
                <DollarSign size={15} />
                PEN (S/)
              </div>

              {/* Filtros */}
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border text-sm font-semibold"
                style={{
                  background: mostrarFiltros ? `${C.purple}15` : `${C.purple}08`,
                  borderColor: `${C.purple}35`,
                  color: mostrarFiltros ? C.purple : C.gray600,
                }}
              >
                <Filter size={15} style={{ color: C.purple }} />
                Filtros
                {filtrosActivos > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-black"
                    style={{ background: C.purple }}
                  >
                    {filtrosActivos}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── Búsquedas ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* Búsqueda general */}
            <div className="relative" ref={searchRef}>
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                size={18}
                style={{ color: busqueda ? C.orange : C.gray500 }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre, marca, modelo, color..."
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setMostrarSugerencias(true); }}
                onFocus={() => setMostrarSugerencias(true)}
                className="w-full pl-12 pr-10 py-3.5 text-gray-800 placeholder-gray-400 outline-none text-sm font-medium transition-all rounded-xl border"
                style={{ background: C.white, borderColor: `${C.orange}35` }}
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-lg leading-none"
                >
                  ×
                </button>
              )}

              {/* Sugerencias */}
              {mostrarSugerencias && busqueda && (
                  <div
                  className="absolute z-50 w-full mt-1.5 rounded-xl shadow-2xl border overflow-hidden"
                  style={{ background: C.white, borderColor: `${C.orange}25` }}
                >
                  {sugerencias
                    .filter(s => s?.toLowerCase().includes(busqueda.toLowerCase()))
                    .slice(0, 6)
                    .map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setBusqueda(s); setMostrarSugerencias(false); }}
                        className="w-full px-4 py-2.5 text-left text-gray-700 text-sm flex items-center gap-3 transition-colors"
                        style={{ borderBottom: `1px solid ${C.orange}10` }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${C.orange}08`)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <Search size={13} style={{ color: C.gray400 }} />
                        {s}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Búsqueda por SKU */}
            <div className="relative">
              <Hash
                className="absolute left-4 top-1/2 -translate-y-1/2"
                size={18}
                style={{ color: busquedaSku ? C.orange : C.gray500 }}
              />
              <input
                type="text"
                placeholder="Buscar por SKU exacto..."
                value={busquedaSku}
                onChange={e => setBusquedaSku(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 text-gray-800 placeholder-gray-400 outline-none text-sm font-medium transition-all rounded-xl border"
                style={{ background: C.white, borderColor: `${C.orange}35` }}
              />
              {busquedaSku && (
                <button
                  onClick={() => setBusquedaSku("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* ── Filtros avanzados ──────────────────────────────── */}
          {mostrarFiltros && (
            <div
              className="rounded-2xl p-6 border"
              style={{ background: C.gray100, borderColor: `${C.orange}20` }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Filter size={16} style={{ color: C.orange }} />
                  Filtros avanzados
                </h3>
                <button
                  onClick={limpiarFiltros}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: C.gray500 }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.orange)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.gray500)}
                >
                  Limpiar todos
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Marcas */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: C.gray500 }}>
                    <Tag size={11} style={{ color: C.orange }} /> Marcas
                  </label>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {marcasDisponibles.length > 0
                      ? marcasDisponibles.map(marca => (
                        <label key={marca} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.gray600 }}>
                          <input
                            type="checkbox"
                            checked={marcasSeleccionadas.includes(marca)}
                            onChange={e =>
                              setMarcasSeleccionadas(prev =>
                                e.target.checked ? [...prev, marca] : prev.filter(m => m !== marca)
                              )
                            }
                            className="w-4 h-4 rounded"
                            style={{ accentColor: C.orange }}
                          />
                          {marca}
                        </label>
                      ))
                      : <p className="text-xs" style={{ color: C.gray400 }}>Sin marcas disponibles</p>
                    }
                  </div>
                </div>

                {/* Rango precio */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: C.gray500 }}>
                    <DollarSign size={11} style={{ color: C.orange }} /> Precio por caja (S/)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number" placeholder="Mín" value={rangoPrecio[0]}
                      onChange={e => setRangoPrecio([Number(e.target.value), rangoPrecio[1]])}
                      className="w-full px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400 outline-none text-sm border"
                      style={{ background: C.white, borderColor: `${C.orange}30` }}
                    />
                    <input
                      type="number" placeholder="Máx" value={rangoPrecio[1]}
                      onChange={e => setRangoPrecio([rangoPrecio[0], Number(e.target.value)])}
                      className="w-full px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400 outline-none text-sm border"
                      style={{ background: C.white, borderColor: `${C.orange}30` }}
                    />
                  </div>
                </div>

                {/* Disponibilidad */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: C.gray500 }}>
                    <Truck size={11} style={{ color: C.green }} /> Disponibilidad
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.gray600 }}>
                      <input type="checkbox" checked={soloDisponibles} onChange={e => setSoloDisponibles(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: C.green }} />
                      Con stock disponible
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.gray600 }}>
                      <input type="checkbox" checked={soloDestacados} onChange={e => setSoloDestacados(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: C.yellow }} />
                      Solo destacados
                    </label>
                  </div>
                </div>

                {/* Descuentos por volumen */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: C.gray500 }}>
                    <TrendingUp size={11} style={{ color: C.purple }} /> Descuentos por volumen
                  </label>
                  <div
                    className="rounded-xl p-3 border"
                    style={{ background: C.white, borderColor: `${C.purple}20` }}
                  >
                    {DESCUENTOS_VOLUMEN.map(({ label, descuento }) => (
                      <div key={label} className="flex justify-between text-xs py-1.5" style={{ color: C.gray600, borderBottom: `1px solid ${C.purple}10` }}>
                        <span>{label}</span>
                        <span className="font-black" style={{ color: descuento > 0 ? C.purple : C.gray400 }}>
                          {descuento > 0 ? `-${descuento}%` : "Precio base"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Contador resultados ────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: C.gray500 }}>
              <span className="font-black text-gray-900">{productosFiltrados.length}</span>
              {" "}producto{productosFiltrados.length !== 1 ? "s" : ""} encontrado{productosFiltrados.length !== 1 ? "s" : ""}
            </p>
            {(busqueda || busquedaSku || marcasSeleccionadas.length > 0 || soloDisponibles || soloDestacados || categoriaActiva !== "Todos") && (
              <button
                onClick={limpiarFiltros}
                className="text-xs font-semibold flex items-center gap-1.5 border rounded-lg px-3 py-1.5 transition-colors"
                style={{ borderColor: `${C.orange}25`, color: C.gray400 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.white; (e.currentTarget as HTMLElement).style.borderColor = `${C.orange}50`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.gray400; (e.currentTarget as HTMLElement).style.borderColor = `${C.orange}25`; }}
              >
                × Limpiar filtros
              </button>
            )}
          </div>
        </header>

        {/* ══════ GRID DE PRODUCTOS ═══════════════════════════ */}
        {productosFiltrados.length === 0 ? (
          <div
            className="text-center py-32 rounded-2xl border"
            style={{ background: `${C.orange}04`, borderColor: `${C.orange}15` }}
          >
            <div
              className="inline-flex p-5 rounded-2xl mb-5"
              style={{ background: `${C.orange}10` }}
            >
              <AlertCircle size={40} style={{ color: C.orange }} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Sin resultados</h3>
            <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: C.gray500 }}>
              {productos.length === 0
                ? "El catálogo B2B no tiene productos activos aún"
                : "Prueba con otros filtros o términos de búsqueda"}
            </p>
            <button
              onClick={limpiarFiltros}
              className="px-6 py-3 text-black font-black text-sm rounded-xl transition-all"
              style={{
                background: `linear-gradient(135deg,${C.orange},${C.yellow})`,
                boxShadow: `0 4px 20px ${C.orange}40`,
              }}
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productosFiltrados.map((prod: any) => {
              const precioMostrar = prod.precio_mostrar || 0;

              return (
                <div key={prod.id} className="group cursor-pointer relative">

                  {/* Badge stock */}
                  <div className="absolute top-3 left-3 z-10">
                    {prod.stock_cajas > 0 ? (
                      <Badge color={C.green} bg={`${C.green}18`} border={`${C.green}35`}>
                        <CheckCircle size={11} />
                        {prod.stock_cajas} caja{prod.stock_cajas !== 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge color="#f87171" bg="rgba(239,68,68,0.15)" border="rgba(239,68,68,0.3)">
                        <XCircle size={11} />
                        Sin stock
                      </Badge>
                    )}
                  </div>

                  {/* Badge entrega */}
                  <div className="absolute top-3 right-3 z-10">
                    <Badge color="#fbbf24" bg="rgba(251,191,36,0.12)" border="rgba(251,191,36,0.25)">
                      <Clock size={11} />
                      {prod.stock_cajas > 0 ? "24-48h" : "7-10 días"}
                    </Badge>
                  </div>

                  {/* Badge oferta */}
                  {prod.en_oferta && (
                    <div className="absolute top-12 left-3 z-10">
                      <Badge color={C.black} bg={C.orange} border={C.orange} className="font-black">
                        <Zap size={11} /> OFERTA
                      </Badge>
                    </div>
                  )}

                  {/* Badge oferta unidad */}
                  {prod.en_oferta_unidad && !prod.en_oferta && (
                    <div className="absolute top-12 left-3 z-10">
                      <Badge color={C.black} bg={C.green} border={C.green} className="font-black">
                        OFERTA UNIDAD
                      </Badge>
                    </div>
                  )}

                  {/* Badge destacado */}
                  {prod.destacado && !prod.en_oferta && !prod.en_oferta_unidad && (
                    <div className="absolute top-12 left-3 z-10">
                      <Badge color={C.black} bg={C.yellow} border={C.yellow} className="font-black">
                        <Award size={11} /> DESTACADO
                      </Badge>
                    </div>
                  )}

                  {/* Acciones rápidas B2B (hover) */}
                  <div className="absolute bottom-24 right-3 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button
                      onClick={e => { e.stopPropagation(); generarQR(prod); }}
                      title="Generar QR"
                      className="p-2 rounded-lg transition-all border"
                      style={{ background: "rgba(255,255,255,0.92)", borderColor: `${C.orange}30`, color: C.gray500 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.orange; (e.currentTarget as HTMLElement).style.borderColor = `${C.orange}60`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.gray500; (e.currentTarget as HTMLElement).style.borderColor = `${C.orange}30`; }}
                    >
                      <QrCode size={15} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); compartirWhatsApp(prod); }}
                      title="Compartir por WhatsApp"
                      className="p-2 rounded-lg transition-all border"
                      style={{ background: "rgba(255,255,255,0.92)", borderColor: `${C.green}30`, color: C.gray500 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.green; (e.currentTarget as HTMLElement).style.borderColor = `${C.green}60`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.gray500; (e.currentTarget as HTMLElement).style.borderColor = `${C.green}30`; }}
                    >
                      <Share2 size={15} />
                    </button>
                    {prod.documento_ficha && (
                      <a
                        href={prod.documento_ficha}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Ficha técnica PDF"
                        className="p-2 rounded-lg transition-all border"
                        style={{ background: "rgba(255,255,255,0.92)", borderColor: `${C.purple}30`, color: C.gray500 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.purple; (e.currentTarget as HTMLElement).style.borderColor = `${C.purple}60`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.gray500; (e.currentTarget as HTMLElement).style.borderColor = `${C.purple}30`; }}
                      >
                        <FileText size={15} />
                      </a>
                    )}
                  </div>

                  {/* Tarjeta */}
                  <div
                    className="relative overflow-hidden rounded-2xl h-full transition-all duration-300"
                    style={{
                      background: "linear-gradient(160deg,rgba(255,102,0,0.06) 0%,rgba(5,0,13,0.7) 100%)",
                      border: `1px solid ${C.orange}20`,
                    }}
                    onClick={() => handleProductClick(prod.id)}
                    role="button"
                    tabIndex={0}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 36px ${C.orange}18`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${C.orange}45`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      (e.currentTarget as HTMLElement).style.borderColor = `${C.orange}20`;
                    }}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleProductClick(prod.id); } }}
                  >
                    {/* Overlay navegando */}
                    {navigatingId === prod.id && (
                      <div
                        className="absolute inset-0 z-20 rounded-2xl flex flex-col items-center justify-center gap-3"
                        style={{ background: "rgba(5,0,13,0.85)", backdropFilter: "blur(4px)" }}
                      >
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.orange }} />
                        <p className="text-sm font-semibold" style={{ color: C.gray300 }}>Cargando...</p>
                      </div>
                    )}

                    <ProductCard
                      producto={{
                        ...prod,
                        id:                       prod.id,
                        sku:                      prod.sku,
                        nombre_producto:          prod.nombre_producto,
                        descripcion_corta:        prod.descripcion_corta,
                        precio:                   precioMostrar,
                        precio_caja:              prod.precio_caja,
                        precio_unitario:          prod.precio_unitario,
                        precio_oferta_caja:       prod.precio_oferta_caja,
                        precio_oferta_unidad:     prod.precio_oferta_unidad,
                        en_oferta:                prod.en_oferta,
                        en_oferta_unidad:         prod.en_oferta_unidad,
                        precios_volumen:          prod.precios_volumen,
                        moneda:                   "PEN",
                        stock:                    prod.stock_cajas,
                        stock_cajas:              prod.stock_cajas,
                        stock_unidades:           prod.stock_unidades,
                        unidades_por_caja:        prod.unidades_por_caja,
                        pedido_minimo:            prod.pedido_minimo,
                        marca:                    prod.marca,
                        modelo:                   prod.modelo,
                        color:                    prod.color,
                        capacidad_almacenamiento: prod.capacidad_almacenamiento,
                        capacidad_ram:            prod.capacidad_ram,
                        sistema_operativo:        prod.sistema_operativo,
                        procesador:               prod.procesador,
                        imagen_principal:         prod.imagen_principal,
                        imagenUrl:                prod.imagen_principal,
                        rating_promedio:          prod.rating_promedio  || 0,
                        total_resenas:            prod.total_resenas    || 0,
                        destacado:                prod.destacado,
                        garantia_meses:           prod.garantia_meses,
                        precioVolumen10:          prod.precioVolumen10,
                        precioVolumen50:          prod.precioVolumen50,
                        precioVolumen100:         prod.precioVolumen100,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════ FOOTER ══════════════════════════════════════ */}
        <footer
          className="mt-16 pt-8"
          style={{ borderTop: `1px solid ${C.orange}15` }}
        >
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs font-medium" style={{ color: C.gray500 }}>
            {[
              { icon: <ShieldCheck size={13} style={{ color: C.orange }} />, text: "Celulares 100% originales sellados" },
              { icon: <Truck size={13} style={{ color: C.green }} />,        text: "Envío B2B prioritario 24-48h" },
              { icon: <Award size={13} style={{ color: C.yellow }} />,       text: "Garantía de fábrica incluida" },
              { icon: <Layers size={13} style={{ color: C.purple }} />,      text: `${new Date().getFullYear()} • Todos los precios en S/ PEN` },
            ].map(({ icon, text }, i) => (
              <span key={i} className="flex items-center gap-1.5">{icon}{text}</span>
            ))}
          </div>
        </footer>
      </div>

      {/* ══════ SCROLL TOP ══════════════════════════════════ */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 p-3 text-black rounded-xl shadow-2xl transition-all border font-black"
          style={{
            background: `linear-gradient(135deg,${C.orange},${C.yellow})`,
            boxShadow: `0 4px 24px ${C.orange}50`,
            borderColor: `${C.orange}50`,
          }}
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* ══════ MODAL QR ════════════════════════════════════ */}
      {qrModal.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)" }}
          onClick={() => setQrModal({ show: false, url: "", producto: null })}
        >
          <div
            className="rounded-2xl p-8 text-center max-w-sm w-full border shadow-2xl"
            style={{ background: C.white, borderColor: `${C.orange}30` }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-black text-gray-900 text-base mb-1">{qrModal.producto?.nombre_producto ?? qrModal.producto?.nombre_producto}</h3>
            <p className="text-xs mb-5" style={{ color: C.gray500 }}>SKU: {qrModal.producto?.sku}</p>
            <img src={qrModal.url} alt="QR" className="mx-auto w-52 h-52 rounded-xl mb-5 border" style={{ borderColor: `${C.orange}20` }} />
            <div className="flex gap-3">
              <a
                href={qrModal.url}
                download={`qr-${qrModal.producto?.sku}.png`}
                className="flex-1 py-3 text-black font-black text-sm rounded-xl flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg,${C.orange},${C.yellow})` }}
              >
                <Download size={15} /> Descargar
              </a>
              <button
                onClick={() => setQrModal({ show: false, url: "", producto: null })}
                className="flex-1 py-3 font-bold text-sm rounded-xl border"
                style={{ background: C.gray100, borderColor: C.gray200, color: C.gray600 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}