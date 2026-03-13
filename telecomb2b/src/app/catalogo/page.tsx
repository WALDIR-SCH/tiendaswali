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
  TrendingUp, Layers
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from '@/context/LanguageContext';
import * as QRCode from 'qrcode';

/* ─── ICONOS POR CATEGORÍA ─── */
const CATEGORIA_ICONS: Record<string, any> = {
  "Todos":      LayoutGrid,
  "Gama Alta":  Star,
  "Gama Media": LayoutGrid,
  "Gama Baja":  Package
};

const CATEGORIAS_PRINCIPALES = ["Todos", "Gama Alta", "Gama Media", "Gama Baja"];

const VOLUME_PRICING = {
  1:   { discount: 0,  label: "1-9" },
  10:  { discount: 5,  label: "10-49" },
  50:  { discount: 10, label: "50-99" },
  100: { discount: 15, label: "100+" }
};

/* ─── SKELETON ─── */
const SkeletonCard = ({ index }: { index: number }) => (
  <div
    className="rounded-2xl border border-white/10 overflow-hidden flex flex-col h-96 animate-pulse backdrop-blur-sm"
    style={{
      animationDelay: `${index * 100}ms`,
      background: "linear-gradient(135deg, rgba(152,81,249,0.08) 0%, rgba(30,20,50,0.5) 100%)"
    }}
  >
    <div className="h-40 w-full" style={{ background: "rgba(152,81,249,0.06)" }} />
    <div className="p-5 space-y-4">
      <div className="h-3 rounded w-1/3" style={{ background: "rgba(152,81,249,0.1)" }} />
      <div className="space-y-2">
        <div className="h-4 rounded w-full"  style={{ background: "rgba(152,81,249,0.08)" }} />
        <div className="h-4 rounded w-2/3"   style={{ background: "rgba(152,81,249,0.06)" }} />
      </div>
      <div className="h-10 rounded-xl w-full mt-6" style={{ background: "rgba(152,81,249,0.05)" }} />
    </div>
  </div>
);

/* ══════════ COMPONENTE PRINCIPAL ══════════ */
export default function CatalogoPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [productos,          setProductos]          = useState<any[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([]);
  const [categoriaActiva,    setCategoriaActiva]    = useState("Todos");
  const [busqueda,           setBusqueda]           = useState("");
  const [busquedaSku,        setBusquedaSku]        = useState("");
  const [marcasSeleccionadas,setMarcasSeleccionadas]= useState<string[]>([]);
  const [rangoPrecio,        setRangoPrecio]        = useState<[number, number]>([0, 200000]);
  const [soloDisponibles,    setSoloDisponibles]    = useState(false);
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

  /* ─── CLICK FUERA ─── */
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current     && !searchRef.current.contains(e.target as Node))     setMostrarSugerencias(false);
      if (categoriasRef.current && !categoriasRef.current.contains(e.target as Node)) setCategoriasAbierto(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* ─── SCROLL ─── */
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ─── GENERAR QR ─── */
  const generarQR = useCallback(async (producto: any) => {
    try {
      const url    = `${window.location.origin}/producto/${producto.id}`;
      const qrData = await QRCode.toDataURL(url, {
        width: 300, margin: 2,
        color: { dark: '#9851F9', light: '#FFFFFF' }
      });
      setQrModal({ show: true, url: qrData, producto });
    } catch (e) { console.error(e); }
  }, []);

  /* ─── COMPARTIR WHATSAPP ─── */
  const compartirWhatsApp = useCallback((producto: any) => {
    const precio = producto.en_oferta && producto.precio_oferta_caja
      ? producto.precio_oferta_caja
      : producto.precio_caja || 0;
    const texto = `*${producto.nombre_producto}*\nSKU: ${producto.sku}\nMarca: ${producto.marca}\nPrecio por caja: S/ ${precio.toFixed(2)}\nStock: ${producto.stock_cajas || 0} cajas\n\n${window.location.origin}/producto/${producto.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }, []);

  /* ─── PRECIO VOLUMEN ─── */
  const calcularPrecioVolumen = useCallback((precioBase: number, cantidad = 1) => {
    if (!precioBase) return 0;
    if (cantidad >= 100) return precioBase * 0.85;
    if (cantidad >= 50)  return precioBase * 0.90;
    if (cantidad >= 10)  return precioBase * 0.95;
    return precioBase;
  }, []);

  /* ─── CARGAR PRODUCTOS ─── */
  useEffect(() => {
    const obtener = async () => {
      try {
        const snap = await getDocs(collection(db, "productos"));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const activos = docs.filter((p: any) => p.estado !== "Inactivo");

        const mapeados = activos.map((prod: any) => {
          const stockCajas     = Number(prod.stock_cajas)     || 0;
          const udsPorCaja     = Number(prod.unidades_por_caja) || 1;
          const precioMostrar  = prod.en_oferta && prod.precio_oferta_caja
            ? Number(prod.precio_oferta_caja)
            : Number(prod.precio_caja) || 0;
          return {
            ...prod,
            stock_cajas:      stockCajas,
            unidades_por_caja: udsPorCaja,
            stock_unidades:   stockCajas * udsPorCaja,
            precio_mostrar:   precioMostrar,
            disponible:       stockCajas > 0,
            tiempoEntrega:    stockCajas > 0 ? "24-48 horas" : "7-10 días",
            precioVolumen10:  calcularPrecioVolumen(precioMostrar, 10),
            precioVolumen50:  calcularPrecioVolumen(precioMostrar, 50),
            precioVolumen100: calcularPrecioVolumen(precioMostrar, 100),
          };
        });

        setProductos(mapeados);
        setProductosFiltrados(mapeados);

        const palabras = mapeados.flatMap((p: any) =>
          [p.nombre_producto, p.sku, p.marca, p.modelo, p.categoria_id].filter(Boolean)
        );
        setSugerencias([...new Set(palabras)].slice(0, 10) as string[]);
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    };
    obtener();
  }, []);

  /* ─── MARCAS ─── */
  const marcasDisponibles = useMemo(() => {
    const m = productos.map((p: any) => p.marca).filter(Boolean);
    return [...new Set(m)].sort() as string[];
  }, [productos]);

  /* ─── FILTROS ─── */
  useEffect(() => {
    let r = [...productos];
    if (categoriaActiva !== "Todos") r = r.filter((p: any) => p.categoria_id === categoriaActiva);
    if (busqueda.trim()) {
      const t = busqueda.toLowerCase();
      r = r.filter((p: any) =>
        [p.nombre_producto, p.descripcion_corta, p.marca, p.modelo, p.categoria_id]
          .some(v => v?.toLowerCase().includes(t))
      );
    }
    if (busquedaSku.trim()) {
      const t = busquedaSku.toLowerCase();
      r = r.filter((p: any) => (p.sku || "").toLowerCase().includes(t));
    }
    if (marcasSeleccionadas.length > 0) r = r.filter((p: any) => marcasSeleccionadas.includes(p.marca));
    r = r.filter((p: any) => {
      const precio = p.en_oferta && p.precio_oferta_caja ? p.precio_oferta_caja : p.precio_caja;
      return precio >= rangoPrecio[0] && precio <= rangoPrecio[1];
    });
    if (soloDisponibles) r = r.filter((p: any) => p.stock_cajas > 0);
    setProductosFiltrados(r);
  }, [categoriaActiva, busqueda, busquedaSku, marcasSeleccionadas, rangoPrecio, soloDisponibles, productos]);

  /* ─── NAVEGACIÓN ─── */
  const handleProductClick = useCallback(async (id: string) => {
    setNavigatingId(id);
    try { await router.push(`/producto/${id}`); }
    catch (e) { console.error(e); }
    finally { setTimeout(() => setNavigatingId(null), 1000); }
  }, [router]);

  /* ─── LIMPIAR ─── */
  const limpiarFiltros = useCallback(() => {
    setCategoriaActiva("Todos");
    setBusqueda("");
    setBusquedaSku("");
    setMarcasSeleccionadas([]);
    setRangoPrecio([0, 200000]);
    setSoloDisponibles(false);
  }, []);

  /* ─── LOADING ─── */
  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0514 0%, #0d0a1a 40%, #080510 100%)" }}>
        {/* Orbes de fondo */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(152,81,249,0.12) 0%, transparent 70%)" }} />
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => <SkeletonCard key={i} index={i} />)}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════ RENDER ══════════ */
  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a0514 0%, #0d0a1a 40%, #080510 100%)" }}>

      {/* ── FONDO PURPLE SUAVE ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Orbe superior izquierdo */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: "radial-gradient(circle, rgba(152,81,249,0.10) 0%, transparent 65%)" }} />
        {/* Orbe central derecho */}
        <div className="absolute top-1/3 -right-48 w-[500px] h-[500px] rounded-full blur-[160px]"
          style={{ background: "radial-gradient(circle, rgba(152,81,249,0.07) 0%, transparent 65%)" }} />
        {/* Orbe inferior izquierdo */}
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[150px]"
          style={{ background: "radial-gradient(circle, rgba(152,81,249,0.06) 0%, transparent 65%)" }} />
        {/* Línea horizontal tenue */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(152,81,249,0.3), transparent)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">

        {/* ══════ HEADER ══════ */}
        <header className="mb-10 space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border"
                style={{
                  background: "rgba(152,81,249,0.08)",
                  borderColor: "rgba(152,81,249,0.25)"
                }}>
                <div className="h-2 w-2 rounded-full animate-pulse"
                  style={{ background: "linear-gradient(135deg,#9851F9,#c084fc)" }} />
                <span className="text-xs font-bold uppercase tracking-[0.3em]"
                  style={{ color: "#c084fc" }}>
                  B2B • CELULARES NUEVOS SELLADOS
                </span>
              </div>

              {/* Título */}
              <div>
                <h1 className="text-5xl font-black text-white tracking-tight">
                  Catálogo
                  <span className="font-extralight text-gray-400"> / </span>
                  <span className="bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(135deg,#9851F9,#c084fc)" }}>
                    Profesional
                  </span>
                </h1>
                <p className="text-gray-400 font-medium text-base mt-2 tracking-wide">
                  Precios mayoristas • Stock industrial • Envío prioritario
                </p>
              </div>
            </div>

            {/* Controles derecha */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Selector categorías */}
              <div className="relative" ref={categoriasRef}>
                <button
                  onClick={() => setCategoriasAbierto(!categoriasAbierto)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-all backdrop-blur-sm border"
                  style={{
                    background: "rgba(152,81,249,0.08)",
                    borderColor: "rgba(152,81,249,0.2)"
                  }}>
                  <Grid size={16} style={{ color: "#c084fc" }} />
                  <span className="text-sm font-medium max-w-[150px] truncate">{categoriaActiva}</span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${categoriasAbierto ? 'rotate-180' : ''}`} />
                </button>

                {categoriasAbierto && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden border"
                    style={{
                      background: "rgba(13,10,26,0.95)",
                      borderColor: "rgba(152,81,249,0.3)"
                    }}>
                    <div className="p-2">
                      {CATEGORIAS_PRINCIPALES.map(cat => {
                        const Icon = CATEGORIA_ICONS[cat] || LayoutGrid;
                        const isActive = categoriaActiva === cat;
                        return (
                          <button key={cat} onClick={() => { setCategoriaActiva(cat); setCategoriasAbierto(false); }}
                            className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 border"
                            style={{
                              background: isActive ? "rgba(152,81,249,0.15)" : "transparent",
                              borderColor: isActive ? "rgba(152,81,249,0.35)" : "transparent",
                              color: isActive ? "#c084fc" : "#9ca3af"
                            }}>
                            <Icon size={16} style={{ color: isActive ? "#9851F9" : "#6b7280" }} />
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Moneda */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-sm border"
                style={{ background: "rgba(152,81,249,0.06)", borderColor: "rgba(152,81,249,0.15)" }}>
                <DollarSign size={16} style={{ color: "#9851F9" }} />
                <span className="text-white text-sm font-medium">PEN (S/)</span>
              </div>

              {/* Filtros */}
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-all border"
                style={{
                  background: mostrarFiltros ? "rgba(152,81,249,0.18)" : "rgba(152,81,249,0.08)",
                  borderColor: "rgba(152,81,249,0.3)"
                }}>
                <Filter size={16} />
                <span className="text-sm font-medium">Filtros</span>
                {(marcasSeleccionadas.length > 0 || soloDisponibles || busquedaSku) && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-white text-xs font-bold"
                    style={{ background: "#9851F9" }}>
                    {marcasSeleccionadas.length + (soloDisponibles ? 1 : 0) + (busquedaSku ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ─── BÚSQUEDAS ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Búsqueda general */}
            <div className="relative" ref={searchRef}>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Buscar por nombre, descripción, marca, modelo..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setMostrarSugerencias(true); }}
                  onFocus={() => setMostrarSugerencias(true)}
                  className="w-full pl-14 pr-5 py-4 text-white placeholder-gray-500 outline-none text-sm font-medium transition-all backdrop-blur-sm shadow-xl rounded-xl border"
                  style={{
                    background: "rgba(152,81,249,0.05)",
                    borderColor: "rgba(152,81,249,0.2)"
                  }} />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 transition-colors" size={20}
                  style={{ color: busqueda ? "#9851F9" : undefined }} />
                {busqueda && (
                  <button onClick={() => setBusqueda("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">✕</button>
                )}
              </div>

              {/* Sugerencias */}
              {mostrarSugerencias && busqueda && sugerencias.filter(s => s?.toLowerCase().includes(busqueda.toLowerCase())).length > 0 && (
                <div className="absolute z-50 w-full mt-2 rounded-xl shadow-2xl backdrop-blur-xl border overflow-hidden"
                  style={{ background: "rgba(13,10,26,0.97)", borderColor: "rgba(152,81,249,0.25)" }}>
                  {sugerencias.filter(s => s?.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 5).map((s, idx) => (
                    <button key={idx} onClick={() => { setBusqueda(s); setMostrarSugerencias(false); }}
                      className="w-full px-5 py-3 text-left text-gray-300 hover:text-white transition-colors flex items-center gap-3"
                      style={{ borderBottom: "1px solid rgba(152,81,249,0.08)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(152,81,249,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <Search size={14} className="text-gray-500" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Búsqueda SKU */}
            <div className="relative group">
              <Hash size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 transition-colors"
                style={{ color: busquedaSku ? "#9851F9" : undefined }} />
              <input
                type="text"
                placeholder="Buscar por SKU específico..."
                value={busquedaSku}
                onChange={e => setBusquedaSku(e.target.value)}
                className="w-full pl-14 pr-5 py-4 text-white placeholder-gray-500 outline-none text-sm font-medium transition-all backdrop-blur-sm shadow-xl rounded-xl border"
                style={{
                  background: "rgba(152,81,249,0.05)",
                  borderColor: "rgba(152,81,249,0.2)"
                }} />
              {busquedaSku && (
                <button onClick={() => setBusquedaSku("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">✕</button>
              )}
            </div>
          </div>

          {/* ─── PANEL FILTROS AVANZADOS ─── */}
          {mostrarFiltros && (
            <div className="rounded-2xl p-6 backdrop-blur-xl border"
              style={{
                background: "rgba(152,81,249,0.05)",
                borderColor: "rgba(152,81,249,0.2)"
              }}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Filter size={18} style={{ color: "#9851F9" }} />
                  Filtros avanzados
                </h3>
                <button onClick={limpiarFiltros} className="text-sm text-gray-400 hover:text-white transition-colors">
                  Limpiar todos
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Marcas */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Tag size={12} /> Marcas
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {marcasDisponibles.length > 0 ? marcasDisponibles.map(marca => (
                      <label key={marca} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white cursor-pointer">
                        <input type="checkbox" checked={marcasSeleccionadas.includes(marca)}
                          onChange={e => setMarcasSeleccionadas(prev =>
                            e.target.checked ? [...prev, marca] : prev.filter(m => m !== marca)
                          )}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                          style={{ accentColor: "#9851F9" }} />
                        {marca}
                      </label>
                    )) : <p className="text-gray-500 text-sm">No hay marcas</p>}
                  </div>
                </div>

                {/* Rango precio */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign size={12} /> Rango de precio (S/)
                  </label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={rangoPrecio[0]}
                      onChange={e => setRangoPrecio([Number(e.target.value), rangoPrecio[1]])}
                      className="w-full px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none text-sm border"
                      style={{ background: "rgba(152,81,249,0.06)", borderColor: "rgba(152,81,249,0.2)" }} />
                    <input type="number" placeholder="Max" value={rangoPrecio[1]}
                      onChange={e => setRangoPrecio([rangoPrecio[0], Number(e.target.value)])}
                      className="w-full px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none text-sm border"
                      style={{ background: "rgba(152,81,249,0.06)", borderColor: "rgba(152,81,249,0.2)" }} />
                  </div>
                </div>

                {/* Disponibilidad */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Truck size={12} /> Disponibilidad
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 hover:text-white cursor-pointer">
                    <input type="checkbox" checked={soloDisponibles} onChange={e => setSoloDisponibles(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600"
                      style={{ accentColor: "#9851F9" }} />
                    Solo productos disponibles
                  </label>
                </div>

                {/* Descuentos por volumen */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={12} /> Descuentos por volumen
                  </label>
                  <div className="rounded-lg p-3 text-xs border"
                    style={{ background: "rgba(152,81,249,0.06)", borderColor: "rgba(152,81,249,0.15)" }}>
                    {Object.entries(VOLUME_PRICING).map(([cantidad, { discount, label }]) => (
                      <div key={cantidad} className="flex justify-between text-gray-300 py-1">
                        <span>{label} cajas</span>
                        <span className="font-semibold" style={{ color: "#a78bfa" }}>{discount}% OFF</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── CONTADOR RESULTADOS ─── */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="font-bold text-white">{productosFiltrados.length}</span> producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
            </p>
            {(busqueda || busquedaSku || marcasSeleccionadas.length > 0 || soloDisponibles || categoriaActiva !== "Todos") && (
              <button onClick={limpiarFiltros}
                className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 border rounded-lg px-3 py-1.5"
                style={{ borderColor: "rgba(152,81,249,0.2)" }}>
                ✕ Limpiar filtros
              </button>
            )}
          </div>
        </header>

        {/* ══════ GRID DE PRODUCTOS ══════ */}
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-32 rounded-2xl border backdrop-blur-sm"
            style={{ background: "rgba(152,81,249,0.04)", borderColor: "rgba(152,81,249,0.15)" }}>
            <div className="inline-flex p-4 rounded-2xl mb-6"
              style={{ background: "rgba(152,81,249,0.08)" }}>
              <AlertCircle className="text-gray-600" size={48} />
            </div>
            <h3 className="text-xl font-bold text-gray-300 mb-3">No se encontraron productos</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
              {productos.length === 0
                ? "No hay productos activos en el catálogo"
                : "Intenta con otros filtros o términos de búsqueda"}
            </p>
            <button onClick={limpiarFiltros}
              className="px-6 py-3 text-white font-semibold text-sm rounded-lg transition-all shadow-lg"
              style={{ background: "linear-gradient(135deg,#9851F9,#7c3aed)", boxShadow: "0 4px 20px rgba(152,81,249,0.3)" }}>
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productosFiltrados.map((prod: any) => {
              const precioMostrar = prod.en_oferta && prod.precio_oferta_caja
                ? prod.precio_oferta_caja
                : prod.precio_caja;

              return (
                <div key={prod.id} className="group cursor-pointer relative">

                  {/* Badge stock */}
                  <div className="absolute top-3 left-3 z-10">
                    {prod.stock_cajas > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm border"
                        style={{ background: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.3)", color: "#4ade80" }}>
                        <CheckCircle size={12} />
                        {prod.stock_cajas} cajas
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm border"
                        style={{ background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}>
                        <XCircle size={12} />
                        Sin stock
                      </span>
                    )}
                  </div>

                  {/* Badge entrega */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm border"
                      style={{ background: "rgba(152,81,249,0.15)", borderColor: "rgba(152,81,249,0.3)", color: "#c084fc" }}>
                      <Clock size={12} />
                      {prod.stock_cajas > 0 ? "24-48h" : "7-10 días"}
                    </span>
                  </div>

                  {/* Badge oferta */}
                  {prod.en_oferta && (
                    <div className="absolute top-14 left-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-sm text-white"
                        style={{ background: "rgba(239,68,68,0.8)", border: "1px solid rgba(239,68,68,0.5)" }}>
                        OFERTA
                      </span>
                    </div>
                  )}

                  {/* Badge destacado */}
                  {prod.destacado && !prod.en_oferta && (
                    <div className="absolute top-14 left-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-sm text-white"
                        style={{ background: "rgba(152,81,249,0.85)", border: "1px solid rgba(152,81,249,0.5)" }}>
                        DESTACADO
                      </span>
                    </div>
                  )}

                  {/* Acciones rápidas B2B */}
                  <div className="absolute bottom-20 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); generarQR(prod); }}
                      title="Generar QR"
                      className="p-2 rounded-lg text-gray-400 hover:text-white transition-all backdrop-blur-sm border"
                      style={{ background: "rgba(13,10,26,0.85)", borderColor: "rgba(152,81,249,0.3)" }}>
                      <QrCode size={16} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); compartirWhatsApp(prod); }}
                      title="Compartir por WhatsApp"
                      className="p-2 rounded-lg text-gray-400 hover:text-white transition-all backdrop-blur-sm border"
                      style={{ background: "rgba(13,10,26,0.85)", borderColor: "rgba(34,197,94,0.3)" }}>
                      <Share2 size={16} />
                    </button>
                    {prod.documento_ficha && (
                      <a href={prod.documento_ficha} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Ficha técnica"
                        className="p-2 rounded-lg text-gray-400 hover:text-white transition-all backdrop-blur-sm border"
                        style={{ background: "rgba(13,10,26,0.85)", borderColor: "rgba(152,81,249,0.3)" }}>
                        <FileText size={16} />
                      </a>
                    )}
                  </div>

                  {/* Tarjeta producto */}
                  <div
                    className="relative overflow-hidden rounded-2xl h-full transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, rgba(152,81,249,0.07) 0%, rgba(13,10,26,0.6) 100%)",
                      border: "1px solid rgba(152,81,249,0.18)",
                      boxShadow: "0 0 0 rgba(152,81,249,0)"
                    }}
                    onClick={() => handleProductClick(prod.id)}
                    role="button" tabIndex={0}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(152,81,249,0.18)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(152,81,249,0.4)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 rgba(152,81,249,0)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(152,81,249,0.18)";
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProductClick(prod.id); } }}>

                    {/* Overlay cargando */}
                    {navigatingId === prod.id && (
                      <div className="absolute inset-0 z-20 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                        style={{ background: "rgba(13,10,26,0.75)" }}>
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#9851F9" }} />
                          <p className="text-sm text-gray-300 font-medium">Cargando...</p>
                        </div>
                      </div>
                    )}

                    <ProductCard
                      producto={{
                        ...prod,
                        id:                    prod.id,
                        sku:                   prod.sku,
                        nombre:                prod.nombre_producto,
                        nombre_producto:       prod.nombre_producto,
                        descripcion_corta:     prod.descripcion_corta,
                        precio:                precioMostrar,
                        precio_caja:           prod.precio_caja,
                        precio_unitario:       prod.precio_unitario,
                        precio_oferta_caja:    prod.precio_oferta_caja,
                        en_oferta:             prod.en_oferta,
                        moneda:                "PEN",
                        stock:                 prod.stock_cajas,
                        stock_cajas:           prod.stock_cajas,
                        stock_unidades:        prod.stock_unidades,
                        unidades_por_caja:     prod.unidades_por_caja,
                        pedido_minimo:         prod.pedido_minimo,
                        marca:                 prod.marca,
                        modelo:                prod.modelo,
                        color:                 prod.color,
                        capacidad_almacenamiento: prod.capacidad_almacenamiento,
                        capacidad_ram:         prod.capacidad_ram,
                        sistema_operativo:     prod.sistema_operativo,
                        procesador:            prod.procesador,
                        imagen_principal:      prod.imagen_principal,
                        imagenUrl:             prod.imagen_principal,
                        rating_promedio:       prod.rating_promedio || 0,
                        total_resenas:         prod.total_resenas || 0,
                        destacado:             prod.destacado,
                        garantia_meses:        prod.garantia_meses,
                        precioMostrado:        precioMostrar,
                        precioVolumen10:       prod.precioVolumen10  || calcularPrecioVolumen(precioMostrar, 10),
                        precioVolumen50:       prod.precioVolumen50  || calcularPrecioVolumen(precioMostrar, 50),
                        precioVolumen100:      prod.precioVolumen100 || calcularPrecioVolumen(precioMostrar, 100),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════ FOOTER ══════ */}
        <footer className="mt-14 pt-8" style={{ borderTop: "1px solid rgba(152,81,249,0.12)" }}>
          <div className="text-center">
            <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Award size={14} style={{ color: "#9851F9" }} />
                Celulares 100% originales
              </span>
              <span style={{ color: "rgba(152,81,249,0.3)" }}>•</span>
              <span className="flex items-center gap-1">
                <Truck size={14} className="text-green-500" />
                Envío prioritario B2B
              </span>
              <span style={{ color: "rgba(152,81,249,0.3)" }}>•</span>
              <span className="flex items-center gap-1">
                <Layers size={14} style={{ color: "#9851F9" }} />
                Garantía de fábrica
              </span>
              <span style={{ color: "rgba(152,81,249,0.3)" }}>•</span>
              <span>{new Date().getFullYear()} • Todos los precios en Soles (PEN)</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ══════ SCROLL TOP ══════ */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 text-white rounded-xl shadow-2xl transition-all border"
          style={{
            background: "linear-gradient(135deg,#9851F9,#7c3aed)",
            boxShadow: "0 4px 20px rgba(152,81,249,0.4)",
            borderColor: "rgba(152,81,249,0.5)"
          }}>
          <ArrowUp size={20} />
        </button>
      )}

      {/* ══════ MODAL QR ══════ */}
      {qrModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setQrModal({ show: false, url: "", producto: null })}>
          <div className="rounded-2xl p-8 text-center max-w-sm w-full border"
            style={{ background: "rgba(13,10,26,0.97)", borderColor: "rgba(152,81,249,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-white text-lg mb-1">{qrModal.producto?.nombre_producto}</h3>
            <p className="text-xs text-gray-500 mb-5">SKU: {qrModal.producto?.sku}</p>
            <img src={qrModal.url} alt="QR" className="mx-auto w-52 h-52 rounded-xl mb-5" />
            <div className="flex gap-3">
              <a href={qrModal.url} download={`qr-${qrModal.producto?.sku}.png`}
                className="flex-1 py-3 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#9851F9,#7c3aed)" }}>
                <Download size={16} /> Descargar
              </a>
              <button onClick={() => setQrModal({ show: false, url: "", producto: null })}
                className="flex-1 py-3 font-bold text-sm rounded-xl text-white border"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(152,81,249,0.2)" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(152,81,249,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(152,81,249,0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(152,81,249,0.6); }
      `}</style>
    </div>
  );
}