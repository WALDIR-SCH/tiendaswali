"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import ProductCard from "@/components/ProductCard";
import {
  Search, Filter, ArrowUp, LayoutGrid, Package,
  DollarSign, Hash, Tag, Truck, CheckCircle, XCircle,
  Download, Share2, QrCode, FileText, AlertCircle,
  ChevronDown, Star, Clock, Award, Grid,
  TrendingUp, Layers, Zap, ShieldCheck, Box, X,
  Loader2, RefreshCw, ChevronLeft, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import * as QRCode from "qrcode";

/* ─── PALETA ─── */
const C = {
  orange: "#FF6600", yellow: "#F6FA00", green: "#28FB4B",
  purple: "#9851F9", purpleDark: "#7c3aed",
  black: "#000000", white: "#FFFFFF",
  gray100: "#F3F4F6", gray200: "#E5E7EB", gray300: "#D1D5DB",
  gray400: "#9CA3AF", gray500: "#6B7280", gray600: "#4B5563",
  gray900: "#111827",
};

const CATEGORIAS = ["Todos", "Gama Alta", "Gama Media", "Gama Baja"];

const CATEG_INFO: Record<string, { icon: any; desc: string; color: string }> = {
  "Todos":      { icon: Grid,    desc: "Todo el catálogo",       color: C.purpleDark },
  "Gama Alta":  { icon: Star,    desc: "Premium · Flagship",     color: C.orange     },
  "Gama Media": { icon: Award,   desc: "Balance precio/calidad", color: C.purple     },
  "Gama Baja":  { icon: Package, desc: "Accesibles · Masivos",   color: C.green      },
};

const fmtPEN = (n: number) =>
  `S/ ${(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/* ─── PAGINACIÓN ─── */
const POR_PAGINA = 12;

/* ─── SKELETON ─── */
const Skeleton = ({ i }: { i: number }) => (
  <div className="rounded-2xl overflow-hidden animate-pulse"
    style={{ animationDelay: `${i * 60}ms`, border: `1px solid ${C.gray200}`, background: C.gray100 }}>
    <div className="h-48 w-full" style={{ background: C.gray200 }} />
    <div className="p-4 space-y-2.5">
      <div className="h-2.5 rounded-full w-1/3" style={{ background: C.gray200 }} />
      <div className="h-4 rounded-full w-full"  style={{ background: C.gray200 }} />
      <div className="h-4 rounded-full w-3/4"   style={{ background: C.gray200 }} />
      <div className="h-10 rounded-xl w-full mt-2" style={{ background: C.gray200 }} />
    </div>
  </div>
);

/* ─── BADGE STOCK ─── */
const StockBadge = ({ cajas, unidades, udsPorCaja }: { cajas: number; unidades: number; udsPorCaja: number }) => {
  if (cajas <= 0) return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border"
      style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}>
      <XCircle size={10} /> Sin stock
    </div>
  );
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
        style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }}>
        <Package size={9} /> {cajas} {cajas === 1 ? "caja" : "cajas"}
      </div>
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
        style={{ background: "#ede9fe", color: C.purpleDark, borderColor: "#ddd6fe" }}>
        <Box size={9} /> {unidades || cajas * udsPorCaja} uds
      </div>
    </div>
  );
};

/* ─── CARD PRODUCTO ─── */
const ProductoCard = ({
  prod, onNavigate, onQR, onWhatsApp, navigating
}: {
  prod: any; onNavigate: (id: string) => void;
  onQR: (p: any) => void; onWhatsApp: (p: any) => void;
  navigating: boolean;
}) => {
  const precio        = prod.precio_mostrar || 0;
  const precioUnit    = prod.precio_unitario || 0;
  const stockCajas    = prod.stock_cajas || 0;
  const stockUnidades = prod.stock_unidades || stockCajas * (prod.unidades_por_caja || 1);
  const disponible    = stockCajas > 0;

  return (
    <div className="group relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 bg-white"
      style={{ borderColor: C.gray200 }}
      onClick={() => onNavigate(prod.id)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${C.purpleDark}50`;
        (e.currentTarget as HTMLElement).style.transform   = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow  = `0 12px 36px ${C.purpleDark}15`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = C.gray200;
        (e.currentTarget as HTMLElement).style.transform   = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow  = "none";
      }}>

      {navigating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
          style={{ background: "rgba(255,255,255,0.9)" }}>
          <Loader2 className="animate-spin" size={28} style={{ color: C.purpleDark }} />
        </div>
      )}

      <div className="relative overflow-hidden" style={{ height: 200, background: C.gray100 }}>
        {prod.imagen_principal ? (
          <img src={prod.imagen_principal} alt={prod.nombre_producto}
            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={48} style={{ color: C.gray300 }} />
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {prod.destacado && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-black flex items-center gap-0.5"
              style={{ background: C.yellow }}>
              <Award size={9} /> DEST.
            </span>
          )}
          {prod.en_oferta && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white flex items-center gap-0.5"
              style={{ background: C.orange }}>
              <Zap size={9} /> OFERTA
            </span>
          )}
          {prod.en_oferta_unidad && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-black flex items-center gap-0.5"
              style={{ background: C.green }}>
              OFERTA UD
            </span>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5">
          <StockBadge cajas={stockCajas} unidades={stockUnidades} udsPorCaja={prod.unidades_por_caja || 1} />
        </div>

        <div className="absolute bottom-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button onClick={e => { e.stopPropagation(); onQR(prod); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white border shadow-sm"
            style={{ borderColor: `${C.purpleDark}30` }} title="QR">
            <QrCode size={14} style={{ color: C.purpleDark }} />
          </button>
          <button onClick={e => { e.stopPropagation(); onWhatsApp(prod); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white border shadow-sm"
            style={{ borderColor: "#22c55e30" }} title="WhatsApp">
            <Share2 size={14} style={{ color: "#16a34a" }} />
          </button>
          {prod.documento_ficha && (
            <a href={prod.documento_ficha} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-white border shadow-sm"
              style={{ borderColor: `${C.orange}30` }} title="Ficha PDF">
              <FileText size={14} style={{ color: C.orange }} />
            </a>
          )}
        </div>

        <div className="absolute bottom-2.5 left-2.5">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
            style={{ background: disponible ? "#fffbeb" : C.gray100, color: disponible ? "#b45309" : C.gray500, border: `1px solid ${disponible ? "#fde68a" : C.gray200}` }}>
            <Clock size={9} /> {disponible ? "24-48h" : "Sin stock"}
          </span>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: C.orange }}>
          {prod.marca} · {prod.categoria_id}
        </p>
        <h3 className="text-sm font-black text-gray-900 leading-tight mb-1.5 line-clamp-2">
          {prod.nombre_producto}
        </h3>

        <div className="flex flex-wrap gap-1 mb-3">
          {prod.capacidad_almacenamiento && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: C.gray900 }}>
              {prod.capacidad_almacenamiento}
            </span>
          )}
          {prod.capacidad_ram && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-black" style={{ background: C.yellow }}>
              {prod.capacidad_ram}
            </span>
          )}
          {prod.color && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: C.gray100, color: C.gray600 }}>
              {prod.color}
            </span>
          )}
        </div>

        {prod.descripcion_corta ? (
          <p className="text-[11px] text-gray-500 leading-relaxed mb-3 line-clamp-2">{prod.descripcion_corta}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {prod.sistema_operativo && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: `${C.purpleDark}10`, color: C.purpleDark }}>
                {prod.sistema_operativo}
              </span>
            )}
            {prod.bateria_mah && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: `${C.orange}10`, color: C.orange }}>
                🔋 {prod.bateria_mah}
              </span>
            )}
            {prod.garantia_meses && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: "#f0fdf4", color: "#16a34a" }}>
                ✓ {prod.garantia_meses}m garantía
              </span>
            )}
          </div>
        )}

        <div className="space-y-1 mb-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[9px] font-bold text-gray-500 uppercase">Por caja</p>
              <p className="text-lg font-black" style={{ color: C.orange }}>
                {fmtPEN(prod.en_oferta && prod.precio_oferta_caja ? prod.precio_oferta_caja : prod.precio_caja || 0)}
              </p>
              {prod.en_oferta && prod.precio_oferta_caja && (
                <p className="text-[10px] text-gray-400 line-through">{fmtPEN(prod.precio_caja)}</p>
              )}
            </div>
            {(prod.precio_unitario || 0) > 0 && (
              <div className="text-right">
                <p className="text-[9px] font-bold text-gray-500 uppercase">Por unidad</p>
                <p className="text-sm font-black" style={{ color: C.purpleDark }}>
                  {fmtPEN(prod.en_oferta_unidad && prod.precio_oferta_unidad ? prod.precio_oferta_unidad : prod.precio_unitario || 0)}
                </p>
              </div>
            )}
          </div>
          <p className="text-[9px] text-gray-400 flex items-center gap-0.5">
            · Mín. {prod.pedido_minimo || 5} uds
          </p>
        </div>

        {(prod.total_resenas || 0) > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={11} className={s <= Math.floor(prod.rating_promedio || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
              ))}
            </div>
            <span className="text-[10px] font-bold text-gray-600">{(prod.rating_promedio || 0).toFixed(1)}</span>
            <span className="text-[10px] text-gray-400">({prod.total_resenas})</span>
          </div>
        )}

        <button className="w-full py-2.5 rounded-xl text-xs font-black text-white transition-all"
          style={{
            background: disponible ? `linear-gradient(135deg,${C.purpleDark},${C.purple})` : C.gray400,
            boxShadow: disponible ? `0 4px 14px ${C.purpleDark}35` : "none",
          }}>
          {disponible ? "Ver producto →" : "Sin stock"}
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   PÁGINA PRINCIPAL CATÁLOGO
═══════════════════════════════════════ */
export default function CatalogoPage() {
  const router       = useRouter();
  const { language } = useLanguage();

  const [productos,   setProductos]   = useState<any[]>([]);
  const [filtrados,   setFiltrados]   = useState<any[]>([]);
  const [categoria,   setCategoria]   = useState("Todos");
  const [busqueda,    setBusqueda]    = useState("");
  const [busquedaSku, setBusquedaSku] = useState("");
  const [marcasSel,   setMarcasSel]   = useState<string[]>([]);
  const [rangoPrecio, setRangoPrecio] = useState<[number, number]>([0, 999999]);
  const [soloDisp,    setSoloDisp]    = useState(false);
  const [soloDest,    setSoloDest]    = useState(false);
  const [soloOferta,  setSoloOferta]  = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [scrollTop,   setScrollTop]   = useState(false);
  const [navId,       setNavId]       = useState<string | null>(null);
  const [qrModal,     setQrModal]     = useState<{ show: boolean; url: string; prod: any }>({ show: false, url: "", prod: null });
  const [categDrop,   setCategDrop]   = useState(false);

  // ── PAGINACIÓN ──────────────────────────────────────────────────────────────
  const [paginaActual, setPaginaActual] = useState(1);

  const categRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (categRef.current && !categRef.current.contains(e.target as Node)) setCategDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = () => setScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const generarQR = useCallback(async (prod: any) => {
    try {
      const url = `${window.location.origin}/producto/${prod.id}`;
      const qr  = await QRCode.toDataURL(url, {
        width: 300, margin: 2,
        color: { dark: C.purpleDark, light: C.white },
      });
      setQrModal({ show: true, url: qr, prod });
    } catch {}
  }, []);

  const compartirWA = useCallback((prod: any) => {
    const precio = prod.en_oferta && prod.precio_oferta_caja ? prod.precio_oferta_caja : prod.precio_caja || 0;
    const txt    = `*${prod.nombre_producto}*\nSKU: ${prod.sku}\nMarca: ${prod.marca}\nPrecio/caja: S/ ${precio.toFixed(0)}\nStock: ${prod.stock_cajas || 0} cajas · ${prod.stock_unidades || 0} unidades\n\n${window.location.origin}/producto/${prod.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
  }, []);

  /* ── Cargar productos ── */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "productos"));
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((p: any) => p.estado === "Activo")
          .map((p: any) => {
            const stockCajas    = Number(p.stock_cajas)       || 0;
            const udsPorCaja    = Number(p.unidades_por_caja)  || 1;
            const stockUnidades = p.stock_unidades !== undefined ? Number(p.stock_unidades) : stockCajas * udsPorCaja;
            const precioCaja    = Number(p.precio_caja)        || 0;
            const precioUnit    = Number(p.precio_unitario)    || 0;
            const precioMostrar = p.en_oferta && p.precio_oferta_caja ? Number(p.precio_oferta_caja) : precioCaja;
            return {
              ...p,
              stock_cajas:       stockCajas,
              stock_unidades:    stockUnidades,
              unidades_por_caja: udsPorCaja,
              precio_caja:       precioCaja,
              precio_unitario:   precioUnit,
              precio_mostrar:    precioMostrar,
              disponible:        stockCajas > 0,
            };
          });
        docs.sort((a: any, b: any) => {
          if (a.destacado && !b.destacado) return -1;
          if (!a.destacado && b.destacado) return 1;
          return (b.stock_cajas || 0) - (a.stock_cajas || 0);
        });
        setProductos(docs);
        setFiltrados(docs);
      } catch (e) { console.error(e); }
      finally { setTimeout(() => setLoading(false), 300); }
    })();
  }, []);

  const marcasDisp = useMemo(() => {
    const m = productos.map((p: any) => p.marca).filter(Boolean);
    return [...new Set(m)].sort() as string[];
  }, [productos]);

  /* ── Aplicar filtros ── */
  useEffect(() => {
    let f = [...productos];
    if (categoria !== "Todos") f = f.filter((p: any) => p.categoria_id === categoria);
    if (busqueda.trim()) {
      const t = busqueda.toLowerCase();
      f = f.filter((p: any) => [p.nombre_producto, p.marca, p.modelo, p.color, p.categoria_id, p.descripcion_corta].some(v => v?.toLowerCase().includes(t)));
    }
    if (busquedaSku.trim()) f = f.filter((p: any) => (p.sku || "").toLowerCase().includes(busquedaSku.toLowerCase()));
    if (marcasSel.length > 0) f = f.filter((p: any) => marcasSel.includes(p.marca));
    f = f.filter((p: any) => (p.precio_mostrar || 0) >= rangoPrecio[0] && (p.precio_mostrar || 0) <= rangoPrecio[1]);
    if (soloDisp)   f = f.filter((p: any) => p.stock_cajas > 0);
    if (soloDest)   f = f.filter((p: any) => p.destacado);
    if (soloOferta) f = f.filter((p: any) => p.en_oferta || p.en_oferta_unidad);
    setFiltrados(f);
    // Resetear a página 1 cuando cambian filtros
    setPaginaActual(1);
  }, [categoria, busqueda, busquedaSku, marcasSel, rangoPrecio, soloDisp, soloDest, soloOferta, productos]);

  // ── Calcular página actual ───────────────────────────────────────────────────
  const totalPaginas    = Math.ceil(filtrados.length / POR_PAGINA);
  const inicio          = (paginaActual - 1) * POR_PAGINA;
  const productosPagina = filtrados.slice(inicio, inicio + POR_PAGINA);

  const irAPagina = (n: number) => {
    setPaginaActual(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtrosActivos = marcasSel.length + (soloDisp?1:0) + (soloDest?1:0) + (soloOferta?1:0) + (busquedaSku?1:0);

  const limpiarFiltros = () => {
    setCategoria("Todos"); setBusqueda(""); setBusquedaSku("");
    setMarcasSel([]); setRangoPrecio([0, 999999]);
    setSoloDisp(false); setSoloDest(false); setSoloOferta(false);
    setPaginaActual(1);
  };

  const navegar = useCallback(async (id: string) => {
    setNavId(id);
    try { await router.push(`/producto/${id}`); }
    catch {}
    finally { setTimeout(() => setNavId(null), 2000); }
  }, [router]);

  const statsDisp = useMemo(() => ({
    disponibles:   productos.filter(p => p.stock_cajas > 0).length,
    totalCajas:    productos.reduce((a, p) => a + (p.stock_cajas    || 0), 0),
    totalUnidades: productos.reduce((a, p) => a + (p.stock_unidades || 0), 0),
  }), [productos]);

  if (loading) return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="h-20 rounded-2xl mb-8 animate-pulse" style={{ background: C.gray100 }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} i={i} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* ══ BANNER — imagen desde /images/banner-catalogo.jpg ══
            Pon tu imagen en: public/images/banner-catalogo.jpg
            (también acepta .png — solo cambia la extensión en el src)            */}
        <div className="mb-8 rounded-2xl overflow-hidden">
          <img
            src="/images/bien.jpeg"
            alt="Banner catálogo"
            className="w-full block"
            style={{ height: "auto", objectFit: "contain" }}
            onError={e => {
              (e.target as HTMLImageElement).parentElement!.style.display = "none";
            }}
          />
        </div>

        {/* HEADER */}
        <header className="mb-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                Catálogo <span className="font-light text-gray-400">/</span>{" "}
                <span style={{ color: C.purpleDark }}>Mayorista</span>
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {/* Celulares nuevos sellados · Mínimo {productos[0]?.pedido_minimo || 5} unidades */}
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                {[
                  { icon: Package, label: `${statsDisp.disponibles} modelos disponibles`,              color: "#16a34a"    },
                  { icon: Box,     label: `${statsDisp.totalCajas.toLocaleString()} cajas en stock`,    color: C.purpleDark },
                  { icon: Grid,    label: `${statsDisp.totalUnidades.toLocaleString()} unidades totales`, color: C.orange   },
                ].map(({ icon: Icon, label, color }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
                    <Icon size={12} /> {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Selector categoría */}
              <div className="relative" ref={categRef}>
                <button onClick={() => setCategDrop(!categDrop)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all"
                  style={{
                    background:   categoria !== "Todos" ? `${C.purpleDark}10` : C.white,
                    borderColor:  categoria !== "Todos" ? `${C.purpleDark}40` : C.gray200,
                    color:        categoria !== "Todos" ? C.purpleDark        : C.gray600,
                  }}>
                  <Grid size={14} style={{ color: C.purpleDark }} />
                  {categoria}
                  <ChevronDown size={13} className={`transition-transform ${categDrop ? "rotate-180" : ""}`} />
                </button>
                {categDrop && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl z-50 overflow-hidden border-2 bg-white"
                    style={{ borderColor: `${C.purpleDark}25` }}>
                    <div className="p-2">
                      {CATEGORIAS.map(cat => {
                        const info   = CATEG_INFO[cat];
                        const Icon   = info.icon;
                        const active = categoria === cat;
                        return (
                          <button key={cat} onClick={() => { setCategoria(cat); setCategDrop(false); }}
                            className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 text-left"
                            style={{
                              background: active ? `${info.color}12` : "transparent",
                              color:      active ? info.color        : C.gray600,
                            }}>
                            <Icon size={14} style={{ color: active ? info.color : C.gray400 }} />
                            <div>
                              <p>{cat}</p>
                              <p className="text-[10px]" style={{ color: active ? info.color : C.gray400 }}>{info.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Filtros */}
              <button onClick={() => setShowFiltros(!showFiltros)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all"
                style={{
                  background:  showFiltros ? `${C.purpleDark}10` : C.white,
                  borderColor: showFiltros ? `${C.purpleDark}40` : C.gray200,
                  color:       showFiltros ? C.purpleDark         : C.gray600,
                }}>
                <Filter size={14} style={{ color: C.purpleDark }} />
                Filtros
                {filtrosActivos > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-black"
                    style={{ background: C.purpleDark }}>
                    {filtrosActivos}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Búsquedas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: C.gray400 }} />
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, marca, modelo, color..."
                className="w-full pl-11 pr-10 py-3 rounded-xl border-2 text-sm outline-none transition-all"
                style={{ borderColor: busqueda ? C.purpleDark : C.gray200, color: C.gray900, background: C.white }}
                onFocus={e  => (e.target.style.borderColor = C.purpleDark)}
                onBlur={e   => { if (!busqueda) e.target.style.borderColor = C.gray200; }}
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={15} style={{ color: C.gray400 }} />
                </button>
              )}
            </div>
            <div className="relative">
              <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: C.gray400 }} />
              <input type="text" value={busquedaSku} onChange={e => setBusquedaSku(e.target.value)}
                placeholder="Buscar por SKU exacto..."
                className="w-full pl-11 pr-10 py-3 rounded-xl border-2 text-sm outline-none transition-all"
                style={{ borderColor: busquedaSku ? C.purpleDark : C.gray200, color: C.gray900, background: C.white, fontFamily: "monospace" }}
                onFocus={e  => (e.target.style.borderColor = C.purpleDark)}
                onBlur={e   => { if (!busquedaSku) e.target.style.borderColor = C.gray200; }}
              />
              {busquedaSku && (
                <button onClick={() => setBusquedaSku("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={15} style={{ color: C.gray400 }} />
                </button>
              )}
            </div>
          </div>

          {/* Filtros avanzados */}
          {showFiltros && (
            <div className="rounded-2xl p-6 border-2" style={{ background: C.gray100, borderColor: C.gray200 }}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Filter size={15} style={{ color: C.purpleDark }} /> Filtros avanzados
                </h3>
                <button onClick={limpiarFiltros} className="text-xs font-bold transition-colors"
                  style={{ color: C.purpleDark }}>
                  Limpiar todo
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Marcas */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.gray500 }}>
                    <Tag size={11} className="inline mr-1" style={{ color: C.orange }} />Marcas
                  </p>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {marcasDisp.map(m => (
                      <label key={m} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.gray600 }}>
                        <input type="checkbox" checked={marcasSel.includes(m)}
                          onChange={e => setMarcasSel(prev => e.target.checked ? [...prev, m] : prev.filter(x => x !== m))}
                          className="w-4 h-4 rounded" style={{ accentColor: C.purpleDark }} />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Precio */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.gray500 }}>
                    <DollarSign size={11} className="inline mr-1" style={{ color: C.orange }} />Precio por caja (S/)
                  </p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Mín" value={rangoPrecio[0] || ""}
                      onChange={e => setRangoPrecio([Number(e.target.value), rangoPrecio[1]])}
                      className="w-full px-3 py-2 rounded-xl border-2 text-sm outline-none"
                      style={{ borderColor: C.gray200, background: C.white, color: C.gray900 }} />
                    <input type="number" placeholder="Máx" value={rangoPrecio[1] >= 999999 ? "" : rangoPrecio[1]}
                      onChange={e => setRangoPrecio([rangoPrecio[0], Number(e.target.value) || 999999])}
                      className="w-full px-3 py-2 rounded-xl border-2 text-sm outline-none"
                      style={{ borderColor: C.gray200, background: C.white, color: C.gray900 }} />
                  </div>
                </div>

                {/* Disponibilidad */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.gray500 }}>
                    <Truck size={11} className="inline mr-1" style={{ color: "#16a34a" }} />Disponibilidad
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: "Solo con stock",  val: soloDisp,   set: setSoloDisp,   color: "#16a34a" },
                      { label: "Solo destacados", val: soloDest,   set: setSoloDest,   color: C.yellow  },
                      { label: "Solo en oferta",  val: soloOferta, set: setSoloOferta, color: C.orange  },
                    ].map(f => (
                      <label key={f.label} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.gray600 }}>
                        <input type="checkbox" checked={f.val} onChange={e => f.set(e.target.checked)}
                          className="w-4 h-4 rounded" style={{ accentColor: f.color }} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Descuentos volumen */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.gray500 }}>
                    <TrendingUp size={11} className="inline mr-1" style={{ color: C.purpleDark }} />Descuentos volumen
                  </p>
                  <div className="rounded-xl p-3 border-2" style={{ background: C.white, borderColor: `${C.purpleDark}20` }}>
                    {[
                      { l: "1–9 cajas",   d: "Precio base" },
                      { l: "10–49 cajas", d: "-5%"         },
                      { l: "50–99 cajas", d: "-10%"        },
                      { l: "100+ cajas",  d: "-15%"        },
                    ].map(({ l, d }) => (
                      <div key={l} className="flex justify-between text-xs py-1.5 border-b last:border-0"
                        style={{ color: C.gray600, borderColor: C.gray100 }}>
                        <span>{l}</span>
                        <span className="font-black" style={{ color: d !== "Precio base" ? C.purpleDark : C.gray400 }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resultado */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-black text-gray-900">{filtrados.length}</span>{" "}
              producto{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
              {totalPaginas > 1 && (
                <span className="ml-2 text-gray-400">
                  · Página <span className="font-black text-gray-700">{paginaActual}</span> de {totalPaginas}
                </span>
              )}
            </p>
            {(busqueda || busquedaSku || marcasSel.length || soloDisp || soloDest || soloOferta || categoria !== "Todos") && (
              <button onClick={limpiarFiltros}
                className="text-xs font-bold border rounded-xl px-3 py-1.5 transition-all flex items-center gap-1"
                style={{ borderColor: C.gray200, color: C.gray400 }}>
                <X size={11} /> Limpiar filtros
              </button>
            )}
          </div>
        </header>

        {/* GRID */}
        {filtrados.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border-2" style={{ background: C.gray100, borderColor: C.gray200 }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: `${C.purpleDark}12` }}>
              <AlertCircle size={32} style={{ color: C.purpleDark }} />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Sin resultados</h3>
            <p className="text-sm text-gray-500 mb-6">
              {productos.length === 0 ? "El catálogo aún no tiene productos activos" : "Prueba con otros filtros"}
            </p>
            <button onClick={limpiarFiltros}
              className="px-6 py-3 font-black text-sm rounded-xl text-white"
              style={{ background: `linear-gradient(135deg,${C.purpleDark},${C.purple})` }}>
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {productosPagina.map((prod: any) => (
                <ProductoCard key={prod.id} prod={prod}
                  onNavigate={navegar}
                  onQR={generarQR}
                  onWhatsApp={compartirWA}
                  navigating={navId === prod.id}
                />
              ))}
            </div>

            {/* ── PAGINACIÓN ────────────────────────────────────────────────── */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                {/* Anterior */}
                <button
                  onClick={() => irAPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: paginaActual === 1 ? C.gray200 : C.purpleDark,
                    color:       paginaActual === 1 ? C.gray400 : C.purpleDark,
                    background:  C.white,
                  }}>
                  <ChevronLeft size={15} /> Anterior
                </button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(n => {
                      // Mostrar: primera, última, actual y ±2 alrededor de la actual
                      return n === 1 || n === totalPaginas || Math.abs(n - paginaActual) <= 2;
                    })
                    .reduce((acc: (number | "...")[], n, idx, arr) => {
                      // Insertar "..." donde hay saltos
                      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm select-none">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => irAPagina(item as number)}
                          className="w-10 h-10 rounded-xl text-sm font-black transition-all border-2"
                          style={{
                            background:  paginaActual === item ? C.purpleDark : C.white,
                            color:       paginaActual === item ? C.white      : C.gray600,
                            borderColor: paginaActual === item ? C.purpleDark : C.gray200,
                          }}>
                          {item}
                        </button>
                      )
                    )
                  }
                </div>

                {/* Siguiente */}
                <button
                  onClick={() => irAPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: paginaActual === totalPaginas ? C.gray200 : C.purpleDark,
                    color:       paginaActual === totalPaginas ? C.gray400 : C.purpleDark,
                    background:  C.white,
                  }}>
                  Siguiente <ChevronRight size={15} />
                </button>
              </div>
            )}

            {/* Info página */}
            {totalPaginas > 1 && (
              <p className="text-center text-xs text-gray-400 mt-3">
                Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, filtrados.length)} de {filtrados.length} productos
              </p>
            )}
          </>
        )}

        {/* FOOTER */}
        <footer className="mt-14 pt-8 border-t-2" style={{ borderColor: C.gray200 }}>
          <div className="flex flex-wrap justify-center items-center gap-5 text-xs font-medium" style={{ color: C.gray500 }}>
            {[
              { icon: <ShieldCheck size={13} style={{ color: C.orange }} />,      t: "100% originales sellados" },
              { icon: <Truck       size={13} style={{ color: "#16a34a" }} />,      t: "Envío 24-48h Lima"        },
              { icon: <Award       size={13} style={{ color: C.yellow }} />,       t: "Garantía de fábrica"      },
              { icon: <Layers      size={13} style={{ color: C.purpleDark }} />,   t: "Precios sin IGV · Solo S/ PEN" },
            ].map(({ icon, t }) => (
              <span key={t} className="flex items-center gap-1.5">{icon}{t}</span>
            ))}
          </div>
        </footer>
      </div>

      {/* SCROLL TOP */}
      {scrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-2xl flex items-center justify-center text-black shadow-2xl"
          style={{ background: `linear-gradient(135deg,${C.orange},${C.yellow})` }}>
          <ArrowUp size={20} />
        </button>
      )}

      {/* MODAL QR */}
      {qrModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setQrModal({ show: false, url: "", prod: null })}>
          <div className="rounded-2xl p-8 text-center max-w-sm w-full border-2 bg-white"
            style={{ borderColor: C.gray200 }}
            onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-gray-900 text-base mb-1">{qrModal.prod?.nombre_producto}</h3>
            <p className="text-xs text-gray-500 mb-5">SKU: {qrModal.prod?.sku}</p>
            <img src={qrModal.url} alt="QR" className="mx-auto w-52 h-52 rounded-2xl mb-5 border-2" style={{ borderColor: C.gray200 }} />
            <div className="flex gap-3">
              <a href={qrModal.url} download={`qr-${qrModal.prod?.sku}.png`}
                className="flex-1 py-3 font-black text-sm rounded-xl flex items-center justify-center gap-2 text-black"
                style={{ background: `linear-gradient(135deg,${C.orange},${C.yellow})` }}>
                <Download size={15} /> Descargar
              </a>
              <button onClick={() => setQrModal({ show: false, url: "", prod: null })}
                className="flex-1 py-3 font-bold text-sm rounded-xl border-2" style={{ borderColor: C.gray200, color: C.gray600 }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .line-clamp-2 { display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
      `}</style>
    </div>
  );
}