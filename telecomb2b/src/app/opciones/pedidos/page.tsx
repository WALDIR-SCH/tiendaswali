"use client";
import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  serverTimestamp, addDoc, increment
} from "firebase/firestore";
import {
  Package, Clock, CheckCircle, Truck, AlertCircle, Eye, Download,
  Search, FileText, CreditCard, Calendar, Phone,
  Receipt, MapPin, Building, Hash, History, MessageCircle,
  Bell, Filter, DollarSign, CalendarDays, Shield, X,
  FileSpreadsheet, Star, Camera, Send, ChevronDown, ChevronUp,
  RefreshCw, ArrowRight
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ─── PALETA ────────────────────────────────────────────────────
const C = {
  purple:     "#9851F9",
  purpleDark: "#7c3aed",
  orange:     "#FF6600",
  yellow:     "#F6FA00",
  green:      "#28FB4B",
  black:      "#000000",
  white:      "#FFFFFF",
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

// ─── STARS ─────────────────────────────────────────────────────
const StarRating = ({ rating, setRating, readonly = false, size = 22 }: {
  rating: number; setRating?: (r: number) => void; readonly?: boolean; size?: number;
}) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map(s => (
      <button key={s} type="button" onClick={() => !readonly && setRating?.(s)}
        className={`transition-transform ${!readonly ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
        disabled={readonly}>
        <Star size={size} className={rating >= s ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
      </button>
    ))}
  </div>
);

// ─── ESTADO INFO ───────────────────────────────────────────────
const getEstadoInfo = (est: string) => {
  const e = (est || "pendiente").toLowerCase().replace(/\s/g, "");
  const m: Record<string, any> = {
    pendiente:   { icon: Clock,       bg: `${C.yellow}15`, color: "#a16207",       border: `${C.yellow}40`,  label: "Pendiente"  },
    pagado:      { icon: CheckCircle, bg: `${C.green}12`,  color: "#15803d",       border: `${C.green}30`,   label: "Pagado"     },
    enproceso:   { icon: Package,     bg: `${C.purple}12`, color: C.purple,        border: `${C.purple}30`,  label: "En Proceso" },
    proceso:     { icon: Package,     bg: `${C.purple}12`, color: C.purple,        border: `${C.purple}30`,  label: "En Proceso" },
    enviado:     { icon: Truck,       bg: `${C.orange}10`, color: C.orange,        border: `${C.orange}30`,  label: "Enviado"    },
    encamino:    { icon: Truck,       bg: `${C.orange}10`, color: C.orange,        border: `${C.orange}30`,  label: "En Camino"  },
    entregado:   { icon: CheckCircle, bg: `${C.green}12`,  color: "#15803d",       border: `${C.green}30`,   label: "Entregado"  },
    cancelado:   { icon: AlertCircle, bg: "rgba(239,68,68,0.1)", color: "#dc2626", border: "rgba(239,68,68,0.3)", label: "Cancelado" },
  };
  return m[e] || m.pendiente;
};

// ─── BADGE ESTADO ──────────────────────────────────────────────
const EstadoBadge = ({ estado }: { estado: string }) => {
  const info = getEstadoInfo(estado);
  const Icon = info.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border"
      style={{ background: info.bg, color: info.color, borderColor: info.border }}>
      <Icon size={12} /> {info.label}
    </span>
  );
};

// ─── CARD STAT ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg }: any) => (
  <div className="rounded-2xl border p-4 transition-all"
    style={{ background: C.white, borderColor: C.gray200 }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.background = bg; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gray200; (e.currentTarget as HTMLElement).style.background = C.white; }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold mb-1" style={{ color: C.gray500 }}>{label}</p>
        <p className="text-2xl font-black" style={{ color: C.gray900 }}>{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
        <Icon size={20} style={{ color }} />
      </div>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════
export default function MisPedidosPage() {
  const [pedidos,          setPedidos]          = useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [filtroEstado,     setFiltroEstado]     = useState("todos");
  const [busqueda,         setBusqueda]         = useState("");
  const [expanded,         setExpanded]         = useState<string | null>(null);
  const [showTraza,        setShowTraza]        = useState<string | null>(null);
  const [notifPanel,       setNotifPanel]       = useState(false);
  const [notifs,           setNotifs]           = useState<any[]>([]);
  const [showFiltros,      setShowFiltros]      = useState(false);
  const [filtrosAv,        setFiltrosAv]        = useState({ fechaInicio:"", fechaFin:"", montoMin:"", montoMax:"", transportista:"", tipoComprobante:"" });

  const [modalOpinion,     setModalOpinion]     = useState(false);
  const [pedidoSel,        setPedidoSel]        = useState<any>(null);
  const [prodSel,          setProdSel]          = useState<any>(null);
  const [puntuacion,       setPuntuacion]       = useState(5);
  const [comentario,       setComentario]       = useState("");
  const [imagenesRes,      setImagenesRes]      = useState<File[]>([]);
  const [previews,         setPreviews]         = useState<string[]>([]);
  const [enviando,         setEnviando]         = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (!user) { setPedidos([]); setLoading(false); return; }
      document.body.style.overflow = "auto";
      const q = query(collection(db, "pedidos"), where("clienteId", "==", user.uid));
      const unsubSnap = onSnapshot(q, snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a: any, b: any) => {
          const fa = a.fecha?.toDate?.() || new Date(0);
          const fb = b.fecha?.toDate?.() || new Date(0);
          return fb.getTime() - fa.getTime();
        });
        setPedidos(docs);
        generarNotifs(docs);
        setLoading(false);
      }, () => setLoading(false));
      return () => unsubSnap();
    });
    return () => unsub();
  }, []);

  const generarNotifs = (ps: any[]) => {
    const arr: any[] = [];
    const hoy  = new Date();
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    ps.forEach(p => {
      const f = p.fecha?.toDate?.();
      if (f && f > ayer) arr.push({ id:`n-${p.id}`, tipo:"nuevo", msg:`Pedido #${p.id.slice(0,8).toUpperCase()} registrado`, leida:false });
      if ((p.estado||"").toLowerCase()==="enviado") arr.push({ id:`e-${p.id}`, tipo:"envio", msg:`Pedido #${p.id.slice(0,8).toUpperCase()} despachado`, leida:false });
    });
    setNotifs(arr);
  };

  const noLeidas = notifs.filter(n => !n.leida).length;

  // ── Subir imagen Cloudinary ───────────────────────────────
  const subirCloudinary = async (file: File): Promise<string> => {
    const cn = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const up = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cn || !up) throw new Error("Cloudinary no configurado");
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", up); fd.append("folder", "reseñas_productos");
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cn}/image/upload`, { method:"POST", body:fd });
    const d = await r.json();
    if (!d.secure_url) throw new Error("Error subiendo imagen");
    return d.secure_url;
  };

  const enviarResena = async () => {
    if (!pedidoSel || !prodSel || !comentario.trim()) { alert("Escribe un comentario"); return; }
    setEnviando(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sin sesión");
      const urls: string[] = [];
      for (const f of imagenesRes) urls.push(await subirCloudinary(f));
      await addDoc(collection(db, "productos", prodSel.id, "reseñas"), {
        usuario: user.displayName || user.email?.split("@")[0] || "Usuario",
        usuarioEmail: user.email, usuarioId: user.uid,
        usuarioFoto: user.photoURL || null,
        comentario: comentario.trim(), rating: puntuacion,
        imagenes: urls, fecha: serverTimestamp(),
        verificado: true, util: 0, pedidoId: pedidoSel.id
      });
      await updateDoc(doc(db, "productos", prodSel.id), { total_resenas: increment(1), rating_promedio: increment(puntuacion) });
      const prods = pedidoSel.productosCalificados || [];
      await updateDoc(doc(db, "pedidos", pedidoSel.id), { productosCalificados: [...prods, prodSel.id] });
      alert("✅ ¡Gracias por tu opinión!");
      setModalOpinion(false); setPedidoSel(null); setProdSel(null);
      setPuntuacion(5); setComentario(""); setImagenesRes([]); setPreviews([]);
    } catch (e) { console.error(e); alert("❌ Error al enviar la reseña"); }
    finally { setEnviando(false); }
  };

  const handleImgs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imagenesRes.length > 4) { alert("Máximo 4 fotos"); return; }
    for (const f of files) {
      if (f.size > 3 * 1024 * 1024) { alert(`"${f.name}" supera 3MB`); continue; }
      setImagenesRes(p => [...p, f]);
      const r = new FileReader();
      r.onloadend = () => setPreviews(p => [...p, r.result as string]);
      r.readAsDataURL(f);
    }
  };

  const diasPromedioEntrega = useMemo(() => {
    const ents = pedidos.filter(p => p.estado==="ENTREGADO" && p.fecha?.toDate && p.fechaEntrega?.toDate);
    if (!ents.length) return 0;
    const total = ents.reduce((s, p) => {
      const d = Math.ceil((p.fechaEntrega.toDate() - p.fecha.toDate()) / 86400000);
      return s + d;
    }, 0);
    return Math.round(total / ents.length);
  }, [pedidos]);

  const transportistasUnicos = useMemo(() =>
    [...new Set(pedidos.map(p => p.Transportista || p.transportista).filter(Boolean))],
  [pedidos]);

  const fFecha = (f: any) => {
    if (!f?.toDate) return "—";
    return f.toDate().toLocaleDateString("es-PE", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
  };
  const fFechaSimple = (f: any) => {
    if (!f?.toDate && !(f instanceof Date)) return "—";
    const d = f?.toDate ? f.toDate() : f;
    return d.toLocaleDateString("es-PE", { day:"numeric", month:"short", year:"numeric" });
  };

  const creditoInfo = (fecha: any, plazo: string) => {
    if (!fecha?.toDate || !plazo) return null;
    const d = fecha.toDate(); const hoy = new Date();
    const dias = plazo.includes("60") ? 60 : plazo.includes("30") ? 30 : plazo.includes("15") ? 15 : plazo.includes("7") ? 7 : 0;
    if (!dias) return null;
    const venc = new Date(d); venc.setDate(d.getDate() + dias);
    const rest = Math.ceil((venc.getTime() - hoy.getTime()) / 86400000);
    return { diasRestantes: Math.max(rest, 0), fechaVencimiento: venc, vencido: rest < 0 };
  };

  const calcIGV = (monto: number) => {
    const base = monto / 1.18;
    return { base: fmt(base), igv: fmt(base * 0.18), total: fmt(monto) };
  };

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(pedidosFiltrados.map(p => ({
      "N° Pedido": p.numeroPedido || p.id.slice(0,8),
      "Fecha": fFechaSimple(p.fecha),
      "RUC": p.datosEnvio?.ruc || p.clienteRut || "",
      "Razón Social": p.datosEnvio?.razonSocial || p.clienteNombre || "",
      "Estado": p.estado || "",
      "Base Imponible": calcIGV(p.total||0).base,
      "IGV (18%)": calcIGV(p.total||0).igv,
      "Total": calcIGV(p.total||0).total,
      "Condición": p.plazoCredito || "Contado",
    })));
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `pedidos_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const generarPDF = (pedido: any) => {
    const d = new jsPDF();
    d.setFontSize(18); d.setTextColor(152, 81, 249);
    d.text("ORDEN DE COMPRA — TIENDAS WALY", 105, 18, { align:"center" });
    d.setFontSize(9); d.setTextColor(100);
    d.text(`Pedido: #${pedido.numeroPedido||pedido.id.slice(0,8).toUpperCase()}  Fecha: ${fFechaSimple(pedido.fecha)}`, 20, 30);
    d.text(`RUC: ${pedido.datosEnvio?.ruc||pedido.clienteRut||"—"}  Razón Social: ${pedido.datosEnvio?.razonSocial||pedido.clienteNombre||"—"}`, 20, 36);
    autoTable(d, {
      startY: 44,
      head: [["Producto","SKU","Cant.","Precio c/u","Subtotal"]],
      body: pedido.items?.map((it: any) => [it.nombre, it.sku||"—", it.cantidad, `S/ ${fmt(it.precioBase||0)}`, `S/ ${fmt((it.precioBase||0)*(it.cantidad||1))}`]) || [],
      theme: "grid",
      headStyles: { fillColor: [152,81,249], textColor:255 },
      styles: { fontSize:8 },
    });
    const y = (d as any).lastAutoTable.finalY + 8;
    const ig = calcIGV(pedido.total||0);
    d.setFontSize(9); d.setTextColor(80);
    d.text(`Base Imponible: S/ ${ig.base}`, 140, y);
    d.text(`IGV (18%): S/ ${ig.igv}`, 140, y+5);
    d.setFontSize(12); d.setTextColor(152,81,249);
    d.text(`TOTAL: S/ ${ig.total}`, 140, y+14);
    d.save(`orden-${pedido.numeroPedido||pedido.id.slice(0,8)}.pdf`);
  };

  const verGuia = (guia: string, transp?: string) => {
    const t = (transp||"").toLowerCase();
    const url = t.includes("olva") ? `https://www.olvacourier.com/seguimiento/envios?guia=${guia}`
      : t.includes("shalom") ? `https://www.shalom.com.pe/tracking/${guia}`
      : t.includes("dhl")    ? `https://www.dhl.com/pe-es/home/tracking.html?tracking-id=${guia}`
      : null;
    if (url) window.open(url, "_blank");
    else alert(`📦 Guía: ${guia}\n🚚 Transportista: ${transp||"—"}`);
  };

  const waContact = (p: any) => {
    const num = "+51974212579";
    const msg = `Hola, consulta sobre pedido #${(p.numeroPedido||p.id.slice(0,8)).toUpperCase()}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── Filtrado ──────────────────────────────────────────────
  const pedidosFiltrados = pedidos.filter((p: any) => {
    const est = (p.estado || "pendiente").toLowerCase().replace(/\s/g, "");
    if (filtroEstado !== "todos") {
      if (filtroEstado === "enproceso" && !est.includes("proceso")) return false;
      if (filtroEstado !== "enproceso" && est !== filtroEstado) return false;
    }
    if (showFiltros) {
      const f = p.fecha?.toDate?.();
      if (filtrosAv.fechaInicio && f && f < new Date(filtrosAv.fechaInicio)) return false;
      if (filtrosAv.fechaFin    && f && f > new Date(filtrosAv.fechaFin + "T23:59:59")) return false;
      if (filtrosAv.montoMin && (p.total||0) < Number(filtrosAv.montoMin)) return false;
      if (filtrosAv.montoMax && (p.total||0) > Number(filtrosAv.montoMax)) return false;
      if (filtrosAv.transportista && (p.Transportista||p.transportista) !== filtrosAv.transportista) return false;
    }
    if (busqueda) {
      const b = busqueda.toLowerCase();
      return [p.numeroPedido, p.id, p.datosEnvio?.ruc, p.clienteRut,
        p.GuiaEnvio, p.guiaEnvio, ...(p.items||[]).map((it: any) => it.nombre)
      ].some(v => v?.toLowerCase?.().includes(b));
    }
    return true;
  });

  const ESTADOS_FILTRO = [
    { id:"todos",     label:"Todos" },
    { id:"pendiente", label:"Pendiente" },
    { id:"pagado",    label:"Pagado" },
    { id:"enproceso", label:"En Proceso" },
    { id:"enviado",   label:"Enviado" },
    { id:"entregado", label:"Entregado" },
    { id:"cancelado", label:"Cancelado" },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.white }}>
      <div className="text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${C.purple}30`, borderTopColor: C.purple }} />
        <p className="text-sm font-semibold" style={{ color: C.gray600 }}>Cargando pedidos...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-6 pb-12 px-4 md:px-6" style={{ background: C.white }}>
      <div className="max-w-6xl mx-auto">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black mb-1" style={{ color: C.gray900 }}>
              Mis <span style={{ color: C.purple }}>Pedidos</span>
            </h1>
            <p className="text-sm" style={{ color: C.gray500 }}>
              {pedidos.length} pedidos • {pedidosFiltrados.length} mostrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Días entrega */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{ background: `${C.purple}08`, borderColor: `${C.purple}20` }}>
              <CalendarDays size={16} style={{ color: C.purple }} />
              <div>
                <p className="text-[10px] font-semibold" style={{ color: C.gray500 }}>Entrega prom.</p>
                <p className="text-xs font-black" style={{ color: C.gray900 }}>
                  {diasPromedioEntrega > 0 ? `${diasPromedioEntrega} días` : "Sin datos"}
                </p>
              </div>
            </div>
            {/* Notificaciones */}
            <div className="relative">
              <button onClick={() => setNotifPanel(!notifPanel)}
                className="relative p-2.5 rounded-xl border transition-all"
                style={{ background: C.white, borderColor: C.gray200 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.purple; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gray200; }}>
                <Bell size={18} style={{ color: C.gray600 }} />
                {noLeidas > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[8px] font-black rounded-full flex items-center justify-center"
                    style={{ background: C.orange, color: C.black }}>{noLeidas}</span>
                )}
              </button>
              {notifPanel && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifPanel(false)} />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl shadow-xl z-40 border overflow-hidden"
                    style={{ background: C.white, borderColor: C.gray200 }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:`1px solid ${C.gray100}` }}>
                      <span className="text-sm font-black" style={{ color:C.gray900 }}>Notificaciones</span>
                      <button onClick={() => setNotifPanel(false)}><X size={15} style={{ color:C.gray400 }} /></button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifs.length === 0
                        ? <p className="text-sm text-center p-6" style={{ color:C.gray400 }}>Sin notificaciones</p>
                        : notifs.map(n => (
                          <div key={n.id}
                            className="px-4 py-3 cursor-pointer transition-all"
                            style={{ borderBottom:`1px solid ${C.gray100}`, background:n.leida?C.white:`${C.purple}06` }}
                            onClick={() => setNotifs(p => p.map(x => x.id===n.id?{...x,leida:true}:x))}
                            onMouseEnter={e => (e.currentTarget.style.background = C.gray100)}
                            onMouseLeave={e => (e.currentTarget.style.background = n.leida ? C.white : `${C.purple}06`)}>
                            <p className="text-xs font-bold" style={{ color:C.gray800 }}>{n.msg}</p>
                            {!n.leida && <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background:C.orange }} />}
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── STATS ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Package}     label="Total Pedidos"    value={pedidos.length}       color={C.purple} bg={`${C.purple}08`} />
          <StatCard icon={DollarSign}  label="Monto Total"      value={`S/ ${fmt(pedidos.reduce((s,p)=>s+(p.total||0),0))}`} color={C.green} bg={`${C.green}10`} />
          <StatCard icon={Truck}       label="Activos"           value={pedidos.filter(p=>!["entregado","cancelado"].includes((p.estado||"").toLowerCase())).length} color={C.orange} bg={`${C.orange}10`} />
          <StatCard icon={CreditCard}  label="Crédito Pendiente" value={`S/ ${fmt(pedidos.filter(p=>p.plazoCredito&&p.estado!=="pagado").reduce((s,p)=>s+(p.total||0),0))}`} color={C.purple} bg={`${C.purple}08`} />
        </div>

        {/* ── BÚSQUEDA Y FILTROS ──────────────────────────── */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={17} style={{ color:C.gray400 }} />
              <input type="text" placeholder="Buscar por ID, RUC, producto, guía..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all"
                style={{ background:C.white, borderColor:C.gray200, color:C.gray800 }}
                onFocus={e => e.currentTarget.style.borderColor = C.purple}
                onBlur={e => e.currentTarget.style.borderColor = C.gray200} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFiltros(!showFiltros)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all"
                style={{
                  background: showFiltros ? C.purple : C.white,
                  borderColor: showFiltros ? C.purple : C.gray200,
                  color: showFiltros ? C.white : C.gray600,
                }}>
                <Filter size={15} />Filtros
              </button>
              <button onClick={exportarExcel}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all"
                style={{ background:`${C.green}10`, borderColor:`${C.green}30`, color:"#15803d" }}>
                <FileSpreadsheet size={15} />Excel
              </button>
            </div>
          </div>

          {showFiltros && (
            <div className="rounded-2xl border p-5" style={{ background:C.gray100, borderColor:C.gray200 }}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label:"Fecha inicio", key:"fechaInicio", type:"date" },
                  { label:"Fecha fin",    key:"fechaFin",    type:"date" },
                  { label:"Monto mín.",   key:"montoMin",    type:"number", ph:"0.00" },
                  { label:"Monto máx.",   key:"montoMax",    type:"number", ph:"0.00" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-bold mb-1.5 block" style={{ color:C.gray600 }}>{f.label}</label>
                    <input type={f.type} placeholder={f.ph}
                      value={(filtrosAv as any)[f.key]}
                      onChange={e => setFiltrosAv({...filtrosAv, [f.key]:e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all"
                      style={{ background:C.white, borderColor:C.gray200, color:C.gray800 }}
                      onFocus={e => e.currentTarget.style.borderColor = C.purple}
                      onBlur={e => e.currentTarget.style.borderColor = C.gray200} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color:C.gray600 }}>Transportista</label>
                  <select value={filtrosAv.transportista}
                    onChange={e => setFiltrosAv({...filtrosAv, transportista:e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ background:C.white, borderColor:C.gray200, color:C.gray800 }}>
                    <option value="">Todos</option>
                    {transportistasUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setFiltrosAv({ fechaInicio:"", fechaFin:"", montoMin:"", montoMax:"", transportista:"", tipoComprobante:"" })}
                className="mt-3 text-xs font-semibold transition-colors" style={{ color:C.gray500 }}
                onMouseEnter={e => (e.currentTarget.style.color = C.purple)}
                onMouseLeave={e => (e.currentTarget.style.color = C.gray500)}>
                Limpiar filtros
              </button>
            </div>
          )}

          {/* Chips estado */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ESTADOS_FILTRO.map(({ id, label }) => {
              const count = id === "todos"
                ? pedidos.length
                : pedidos.filter(p => {
                    const e = (p.estado||"pendiente").toLowerCase().replace(/\s/g,"");
                    return id === "enproceso" ? e.includes("proceso") : e === id;
                  }).length;
              const active = filtroEstado === id;
              return (
                <button key={id} onClick={() => setFiltroEstado(id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all"
                  style={{
                    background: active ? C.purple : C.white,
                    borderColor: active ? C.purple : C.gray200,
                    color: active ? C.white : C.gray600,
                    boxShadow: active ? `0 2px 10px ${C.purple}30` : "none",
                  }}>
                  {label}
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                    style={{ background: active ? "rgba(255,255,255,0.25)" : C.gray100, color: active ? C.white : C.gray500 }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── LISTA DE PEDIDOS ────────────────────────────── */}
        {pedidosFiltrados.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border" style={{ background:C.gray100, borderColor:C.gray200 }}>
            <Package size={40} style={{ color:C.gray300, margin:"0 auto 12px" }} />
            <h3 className="text-lg font-black mb-2" style={{ color:C.gray800 }}>Sin pedidos</h3>
            <p className="text-sm mb-6" style={{ color:C.gray500 }}>
              {busqueda ? `Sin resultados para "${busqueda}"` : "No hay pedidos en esta categoría"}
            </p>
            <Link href="/catalogo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition-all"
              style={{ background:C.purple, boxShadow:`0 4px 16px ${C.purple}40` }}>
              <Building size={15} />Ir al Catálogo<ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidosFiltrados.map((pedido: any) => {
              const isExp   = expanded === pedido.id;
              const isTraza = showTraza === pedido.id;
              const cr      = creditoInfo(pedido.fecha, pedido.plazoCredito);
              const igv     = calcIGV(pedido.total || 0);
              const transp  = pedido.Transportista || pedido.transportista;
              const guia    = pedido.GuiaEnvio || pedido.guiaEnvio;
              const prods   = pedido.productosCalificados || [];
              const est     = pedido.estado || "Pendiente";
              const esEntregado = est.toLowerCase() === "entregado";
              const esNuevo = pedido.fecha?.toDate && (Date.now() - pedido.fecha.toDate().getTime()) < 86400000;

              return (
                <div key={pedido.id}
                  className="rounded-2xl border overflow-hidden transition-all"
                  style={{ background:C.white, borderColor:C.gray200 }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${C.purple}30`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.gray200)}>
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">

                      {/* ── Izquierda ────────────────────────── */}
                      <div className="flex-1">
                        {/* Badges top */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <EstadoBadge estado={est} />
                          {esNuevo && (
                            <span className="text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1"
                              style={{ background:`${C.green}15`, color:"#15803d" }}>
                              <Bell size={9} />NUEVO
                            </span>
                          )}
                          {pedido.tipoComprobante && (
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-full border"
                              style={{ background:C.gray100, borderColor:C.gray200, color:C.gray600 }}>
                              <Receipt size={10} className="inline mr-1" />{pedido.tipoComprobante}
                            </span>
                          )}
                          <span className="text-xs" style={{ color:C.gray400 }}>{fFecha(pedido.fecha)}</span>
                        </div>

                        {/* Número pedido */}
                        <h3 className="text-base font-black mb-2 flex items-center gap-2" style={{ color:C.gray900 }}>
                          <Hash size={14} style={{ color:C.purple }} />
                          Pedido #{pedido.numeroPedido || pedido.id.slice(0,8).toUpperCase()}
                        </h3>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-2 text-xs mb-3" style={{ color:C.gray500 }}>
                          <span className="flex items-center gap-1"><Package size={12} />{pedido.items?.length||0} productos</span>
                          <span style={{ color:C.gray300 }}>•</span>
                          <span className="flex items-center gap-1"><CreditCard size={12} />{pedido.plazoCredito||"Contado"}</span>
                          {transp && <><span style={{ color:C.gray300 }}>•</span><span className="flex items-center gap-1"><Truck size={12} />{transp}</span></>}
                          {guia   && <><span style={{ color:C.gray300 }}>•</span><span className="flex items-center gap-1" style={{ color:C.purple }}><FileText size={12} />Guía: {guia}</span></>}
                        </div>

                        {/* RUC */}
                        {(pedido.datosEnvio?.ruc || pedido.clienteRut) && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border mb-3"
                            style={{ background:C.gray100, borderColor:C.gray200 }}>
                            <Building size={13} style={{ color:C.gray500 }} />
                            <span className="text-xs font-bold" style={{ color:C.gray700 }}>
                              {pedido.datosEnvio?.razonSocial || pedido.clienteNombre}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background:`${C.purple}12`, color:C.purple }}>
                              RUC: {pedido.datosEnvio?.ruc || pedido.clienteRut}
                            </span>
                          </div>
                        )}

                        {/* Crédito */}
                        {cr && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold mb-3"
                            style={{
                              background: cr.vencido ? "rgba(239,68,68,0.08)" : cr.diasRestantes <= 5 ? `${C.orange}10` : `${C.green}10`,
                              borderColor: cr.vencido ? "rgba(239,68,68,0.3)" : cr.diasRestantes <= 5 ? `${C.orange}30` : `${C.green}30`,
                              color: cr.vencido ? "#dc2626" : cr.diasRestantes <= 5 ? C.orange : "#15803d",
                            }}>
                            <Calendar size={12} />
                            {cr.vencido ? "CRÉDITO VENCIDO" : `${cr.diasRestantes}d de plazo · vence ${fFechaSimple(cr.fechaVencimiento)}`}
                          </div>
                        )}

                        {/* Miniaturas */}
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5">
                            {pedido.items?.slice(0,5).map((it: any, i: number) => (
                              <div key={i} className="w-9 h-9 rounded-lg border-2 overflow-hidden"
                                style={{ background:C.gray100, borderColor:C.white }}>
                                {(it.imagenUrl||it.imagen_principal)
                                  ? <img src={it.imagenUrl||it.imagen_principal} alt={it.nombre} className="w-full h-full object-contain p-0.5" />
                                  : <div className="w-full h-full flex items-center justify-center"><Package size={12} style={{ color:C.gray400 }} /></div>}
                              </div>
                            ))}
                          </div>
                          {pedido.items?.length > 5 && (
                            <span className="text-xs" style={{ color:C.gray400 }}>+{pedido.items.length-5} más</span>
                          )}
                        </div>
                      </div>

                      {/* ── Derecha ────────────────────────── */}
                      <div className="lg:w-64 flex flex-col gap-3">
                        <div className="text-right">
                          <p className="text-xs mb-0.5" style={{ color:C.gray500 }}>Total del pedido</p>
                          <p className="text-2xl font-black" style={{ color:C.gray900 }}>S/ {fmt(pedido.total||0)}</p>
                          <p className="text-[10px]" style={{ color:C.gray400 }}>IGV: S/ {igv.igv}</p>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-2">
                          <button onClick={() => setExpanded(isExp ? null : pedido.id)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all"
                            style={{ background:C.white, borderColor:C.gray200, color:C.gray700 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.purple; (e.currentTarget as HTMLElement).style.color = C.purple; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gray200; (e.currentTarget as HTMLElement).style.color = C.gray700; }}>
                            <Eye size={13} />{isExp ? "Ocultar" : "Detalles"}
                          </button>
                          <button onClick={() => generarPDF(pedido)}
                            className="py-2.5 px-3.5 rounded-xl text-xs font-bold border transition-all"
                            style={{ background:`${C.purple}10`, borderColor:`${C.purple}25`, color:C.purple }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.purple; (e.currentTarget as HTMLElement).style.color = C.white; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${C.purple}10`; (e.currentTarget as HTMLElement).style.color = C.purple; }}>
                            <Download size={13} />
                          </button>
                        </div>

                        <div className="flex gap-2">
                          {guia && (
                            <button onClick={() => verGuia(guia, transp)}
                              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all"
                              style={{ background:`${C.orange}10`, borderColor:`${C.orange}25`, color:C.orange }}>
                              <FileText size={13} />Guía
                            </button>
                          )}
                          <button onClick={() => waContact(pedido)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all"
                            style={{ background:`${C.green}10`, borderColor:`${C.green}25`, color:"#15803d" }}>
                            <MessageCircle size={13} />Asesor
                          </button>
                        </div>

                        {esEntregado && (
                          <button
                            onClick={() => {
                              setPedidoSel(pedido);
                              if (pedido.items?.length === 1) setProdSel(pedido.items[0]);
                              setModalOpinion(true);
                            }}
                            className="w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                            style={{ background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, boxShadow:`0 2px 10px ${C.purple}30` }}>
                            <Star size={13} />Calificar productos
                          </button>
                        )}

                        <button onClick={() => setShowTraza(isTraza ? null : pedido.id)}
                          className="flex items-center justify-end gap-1 text-[10px] font-semibold transition-colors"
                          style={{ color:C.gray400 }}
                          onMouseEnter={e => (e.currentTarget.style.color = C.purple)}
                          onMouseLeave={e => (e.currentTarget.style.color = C.gray400)}>
                          <History size={11} />Trazabilidad
                        </button>
                      </div>
                    </div>

                    {/* ── Trazabilidad ─────────────────────── */}
                    {isTraza && (
                      <div className="mt-4 p-4 rounded-xl border" style={{ background:C.gray100, borderColor:C.gray200 }}>
                        <h4 className="text-sm font-black mb-3 flex items-center gap-2" style={{ color:C.gray800 }}>
                          <History size={14} style={{ color:C.purple }} />Historial de estados
                        </h4>
                        <div className="space-y-2">
                          {pedido.historialEstados?.map((h: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 text-xs">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background:C.purple }} />
                              <span style={{ color:C.gray500 }}>{fFecha(h.fecha)}</span>
                              <span className="font-bold" style={{ color:C.gray900 }}>{h.estado}</span>
                              {h.usuario && <span style={{ color:C.gray400 }}>por: {h.usuario}</span>}
                            </div>
                          )) ?? <p className="text-xs" style={{ color:C.gray400 }}>Sin historial</p>}
                        </div>
                      </div>
                    )}

                    {/* ── DETALLES EXPANDIDOS ───────────────── */}
                    {isExp && (
                      <div className="mt-5 pt-5" style={{ borderTop:`1px solid ${C.gray100}` }}>
                        <div className="grid md:grid-cols-2 gap-5">
                          {/* Facturación */}
                          <div>
                            <h4 className="text-sm font-black mb-3" style={{ color:C.gray800 }}>Resumen de pago</h4>
                            <div className="rounded-xl p-4 border space-y-2" style={{ background:C.gray100, borderColor:C.gray200 }}>
                              {[
                                ["Base Imponible", `S/ ${igv.base}`, C.gray700],
                                ["IGV (18%)",      `S/ ${igv.igv}`,  C.orange],
                                ["Total",          `S/ ${igv.total}`, C.purple],
                              ].map(([k,v,c]) => (
                                <div key={k} className="flex justify-between text-sm">
                                  <span style={{ color:C.gray500 }}>{k}:</span>
                                  <span className="font-black" style={{ color:c as string }}>{v}</span>
                                </div>
                              ))}
                            </div>
                            {/* Datos envío */}
                            {(pedido.datosEnvio || pedido.clienteNombre) && (
                              <div className="rounded-xl p-4 border mt-3 space-y-2" style={{ background:C.gray100, borderColor:C.gray200 }}>
                                <h5 className="text-xs font-black flex items-center gap-1.5 mb-2" style={{ color:C.gray700 }}>
                                  <MapPin size={12} style={{ color:C.purple }} />Datos de Facturación
                                </h5>
                                {[
                                  [Building, pedido.datosEnvio?.razonSocial || pedido.clienteNombre],
                                  [FileText, `RUC: ${pedido.datosEnvio?.ruc || pedido.clienteRut || "—"}`],
                                  [MapPin,   pedido.datosEnvio?.direccion || pedido.clienteDireccion],
                                  [Phone,    pedido.datosEnvio?.telefono  || pedido.clienteTelefono],
                                ].filter(([,v]) => v).map(([Icon, val], i) => {
                                  const Ic = Icon as any;
                                  return (
                                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color:C.gray600 }}>
                                      <Ic size={12} style={{ color:C.gray400, marginTop:2 }} />{val}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Productos */}
                          <div>
                            <h4 className="text-sm font-black mb-3" style={{ color:C.gray800 }}>
                              Productos ({pedido.items?.length||0})
                            </h4>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {pedido.items?.map((it: any, i: number) => {
                                const tot    = (it.precioBase||0) * (it.cantidad||1);
                                const calif  = prods.includes(it.id);
                                return (
                                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                                    style={{ background:C.white, borderColor:C.gray200 }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = `${C.purple}25`)}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = C.gray200)}>
                                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                                      style={{ background:C.gray100, border:`1px solid ${C.gray200}` }}>
                                      {(it.imagenUrl||it.imagen_principal)
                                        ? <img src={it.imagenUrl||it.imagen_principal} alt={it.nombre} className="w-full h-full object-contain p-1" />
                                        : <Package size={18} style={{ color:C.gray300 }} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold truncate" style={{ color:C.gray900 }}>{it.nombre}</p>
                                      <p className="text-[10px]" style={{ color:C.gray500 }}>SKU: {it.sku||"—"} · Cant: {it.cantidad}</p>
                                      {calif && (
                                        <span className="text-[9px] font-bold flex items-center gap-0.5 mt-0.5" style={{ color:"#15803d" }}>
                                          <CheckCircle size={9} />Calificado
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-black" style={{ color:C.purple }}>S/ {fmt(tot)}</p>
                                      <p className="text-[10px]" style={{ color:C.gray400 }}>S/ {fmt(it.precioBase||0)} c/u</p>
                                      {!calif && esEntregado && (
                                        <button onClick={() => { setProdSel(it); setPedidoSel(pedido); setModalOpinion(true); }}
                                          className="text-[9px] font-bold mt-0.5 transition-colors"
                                          style={{ color:C.purple }}
                                          onMouseEnter={e => (e.currentTarget.style.color = C.purpleDark)}
                                          onMouseLeave={e => (e.currentTarget.style.color = C.purple)}>
                                          Calificar →
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Condiciones adicionales */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                          {[
                            { label:"Condición pago",  val:pedido.plazoCredito||"Contado",   color:C.purple },
                            { label:"Método pago",     val:pedido.metodoPago||"—",            color:C.orange },
                            ...(guia    ? [{ label:"Guía remisión",    val:guia,    color:C.green  }] : []),
                            ...(transp  ? [{ label:"Transportista",    val:transp,  color:C.gray600}] : []),
                          ].map(({ label, val, color }) => (
                            <div key={label} className="p-3 rounded-xl border" style={{ background:C.gray100, borderColor:C.gray200 }}>
                              <p className="text-[10px] font-semibold mb-1" style={{ color:C.gray500 }}>{label}</p>
                              <p className="text-xs font-black" style={{ color }}>{val}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL OPINIÓN ───────────────────────────────── */}
      {modalOpinion && pedidoSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background:C.white, borderColor:`${C.purple}25` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background:`linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
              <div className="flex items-center gap-2">
                <Star size={18} color={C.yellow} />
                <h2 className="text-base font-black text-white">Calificar producto</h2>
              </div>
              <button onClick={() => { setModalOpinion(false); setPedidoSel(null); setProdSel(null); setPuntuacion(5); setComentario(""); setImagenesRes([]); setPreviews([]); }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background:"rgba(255,255,255,0.15)", color:C.white }}>
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Selector producto si hay varios */}
              {!prodSel ? (
                <div>
                  <p className="text-sm font-bold mb-3" style={{ color:C.gray700 }}>Selecciona un producto:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pedidoSel.items?.map((it: any) => {
                      const calif = (pedidoSel.productosCalificados||[]).includes(it.id);
                      return (
                        <button key={it.id} disabled={calif}
                          onClick={() => setProdSel(it)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                          style={{ background:calif?C.gray100:C.white, borderColor:C.gray200, opacity:calif?0.55:1 }}
                          onMouseEnter={e => { if (!calif) (e.currentTarget as HTMLElement).style.borderColor = C.purple; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gray200; }}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ background:C.gray100 }}>
                            {(it.imagenUrl||it.imagen_principal)
                              ? <img src={it.imagenUrl||it.imagen_principal} alt={it.nombre} className="w-full h-full object-contain p-1" />
                              : <Package size={16} style={{ color:C.gray300, margin:"auto" }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color:C.gray900 }}>{it.nombre}</p>
                            <p className="text-[10px]" style={{ color:C.gray500 }}>Cant: {it.cantidad}</p>
                          </div>
                          {calif && <span className="text-[9px] font-bold" style={{ color:"#15803d" }}>✓ Calificado</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {/* Producto seleccionado */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background:C.gray100, borderColor:C.gray200 }}>
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background:C.white }}>
                      {(prodSel.imagenUrl||prodSel.imagen_principal)
                        ? <img src={prodSel.imagenUrl||prodSel.imagen_principal} alt={prodSel.nombre} className="w-full h-full object-contain p-1" />
                        : <Package size={18} style={{ color:C.gray300, margin:"auto" }} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color:C.gray900 }}>{prodSel.nombre}</p>
                      <p className="text-xs" style={{ color:C.gray500 }}>Pedido #{pedidoSel.id.slice(0,8).toUpperCase()}</p>
                    </div>
                  </div>

                  {/* Estrellas */}
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color:C.gray600 }}>Tu calificación</label>
                    <StarRating rating={puntuacion} setRating={setPuntuacion} size={28} />
                  </div>

                  {/* Comentario */}
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color:C.gray600 }}>Tu opinión</label>
                    <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                      placeholder="Comparte tu experiencia con este producto..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none transition-all"
                      style={{ background:C.white, borderColor:C.gray200, color:C.gray800 }}
                      onFocus={e => e.currentTarget.style.borderColor = C.purple}
                      onBlur={e => e.currentTarget.style.borderColor = C.gray200} />
                  </div>

                  {/* Fotos */}
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color:C.gray600 }}>Fotos (opcional, máx 4)</label>
                    {previews.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {previews.map((img, i) => (
                          <div key={i} className="relative aspect-square rounded-xl overflow-hidden group" style={{ background:C.gray100 }}>
                            <img src={img} className="w-full h-full object-cover" alt="" />
                            <button onClick={() => { setImagenesRes(p => p.filter((_,j)=>j!==i)); setPreviews(p => p.filter((_,j)=>j!==i)); }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                              style={{ background:"#ef4444" }}>
                              <X size={10} color={C.white} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {previews.length < 4 && (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed p-4 rounded-xl cursor-pointer transition-all"
                        style={{ borderColor:`${C.purple}30` }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = C.purple)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = `${C.purple}30`)}>
                        <Camera size={20} style={{ color:C.purple, marginBottom:4 }} />
                        <span className="text-xs font-medium" style={{ color:C.gray600 }}>Subir fotos</span>
                        <span className="text-[10px]" style={{ color:C.gray400 }}>Máx 3MB c/u</span>
                        <input type="file" accept="image/*" multiple onChange={handleImgs} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* Botón enviar */}
                  <button onClick={enviarResena} disabled={enviando || !comentario.trim()}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: enviando || !comentario.trim() ? C.gray300 : `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                      boxShadow: enviando || !comentario.trim() ? "none" : `0 4px 16px ${C.purple}40`,
                    }}>
                    {enviando
                      ? <><RefreshCw size={15} className="animate-spin" />Enviando...</>
                      : <><Send size={15} />Publicar opinión</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}