"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore";
import {
  Search, X, Loader2, Eye, Upload, ChevronLeft, ChevronRight,
  RefreshCw, AlertCircle, CheckCircle, Clock, Truck, PackageCheck,
  Ban, Archive, TrendingUp, Users, DollarSign, ShoppingBag,
  AlertTriangle, FileSpreadsheet, FileDown, Package
} from "lucide-react";

// ============ TIPOS ============
type OrderStatus = 'PENDIENTE' | 'PAGADO' | 'EN PROCESO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
type PaymentMethod = 'Transferencia' | 'Tarjeta' | 'Efectivo' | 'No especificado';
type Language = 'es' | 'en' | 'pt';

interface Pedido {
  id: string;
  clienteEmail: string;
  clienteNombre?: string;
  clienteRut?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  fecha: any;
  estado: OrderStatus;
  metodoPago: PaymentMethod;
  total: number;
  items: ProductoPedido[];
  comprobanteUrl?: string;
  nota?: string;
  notaInterna?: string;
  fechaActualizacion?: any;
  fechaEntrega?: any;
  trackingNumber?: string;
  courier?: string;
  guiaEnvio?: string;
  transportista?: string;
  archived?: boolean;
  archivedAt?: any;
  historialEstados?: HistorialEstado[];
  urgente?: boolean;
}

interface ProductoPedido {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  sku?: string;
  stock?: number;
}

interface HistorialEstado {
  estado: OrderStatus;
  fecha: any;
  usuario?: string;
  nota?: string;
}

interface Producto {
  id: string;
  nombre: string;
  sku: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  categoria?: string;
}

interface Filtros {
  estado: OrderStatus | 'Todos' | 'Archivados';
  busqueda: string;
  metodoPago: PaymentMethod | 'Todos';
  urgente?: boolean;
  archived?: boolean;
}

// ============ PALETA UNIFICADA — FONDO BLANCO ============
const C = {
  primary:      '#FF6600',
  primaryDark:  '#E65C00',
  primaryBg:    'rgba(255,102,0,0.08)',
  white:        '#FFFFFF',
  bgCard:       '#FAFAFA',
  bgInput:      '#F3F4F6',
  border:       '#E5E7EB',
  borderDark:   '#D1D5DB',
  textPrimary:  '#111827',
  textSecondary:'#6B7280',
  textMuted:    '#9CA3AF',
  error:        '#DC2626',
  errorBg:      'rgba(220,38,38,0.08)',
  warning:      '#EA580C',
  warningBg:    'rgba(234,88,12,0.08)',
};

// ============ ESTADOS ============
const STATUS_CONFIG: Record<OrderStatus, {
  color: string; bgColor: string; icon: any; label: string;
}> = {
  PENDIENTE:   { color: 'text-amber-700',   bgColor: 'bg-amber-50 border border-amber-200',   icon: Clock,        label: 'Pendiente'   },
  PAGADO:      { color: 'text-blue-700',    bgColor: 'bg-blue-50 border border-blue-200',     icon: CheckCircle,  label: 'Pagado'      },
  'EN PROCESO':{ color: 'text-purple-700',  bgColor: 'bg-purple-50 border border-purple-200', icon: Package,      label: 'En Proceso'  },
  ENVIADO:     { color: 'text-indigo-700',  bgColor: 'bg-indigo-50 border border-indigo-200', icon: Truck,        label: 'Enviado'     },
  ENTREGADO:   { color: 'text-emerald-700', bgColor: 'bg-emerald-50 border border-emerald-200',icon: PackageCheck, label: 'Entregado'   },
  CANCELADO:   { color: 'text-rose-700',    bgColor: 'bg-rose-50 border border-rose-200',     icon: Ban,          label: 'Cancelado'   },
};

const DEFAULT_STATUS = { color: 'text-gray-600', bgColor: 'bg-gray-50 border border-gray-200', icon: AlertCircle, label: 'Desconocido' };

const METODO_PAGO_LABELS: Record<string, string> = {
  Transferencia: 'Transferencia', Tarjeta: 'Tarjeta',
  Efectivo: 'Efectivo', 'No especificado': 'No especificado',
};

const COURIER_OPTIONS = ['Olva Courier', 'Shalom', 'OTR', 'Otro'];

const LANGUAGES = {
  es: {
    appName: 'Gestión de Pedidos', search: 'Buscar', update: 'Actualizar',
    details: 'Detalles', actions: 'Acciones', loading: 'Cargando', error: 'Error',
    allStatus: 'Todos los estados', allPayments: 'Todos los métodos',
    searchPlaceholder: 'Email, ID, nombre o RUT...', activeFilters: 'Filtros activos',
    clearAll: 'Limpiar todo', orderId: 'Pedido / Fecha', customer: 'Cliente',
    total: 'Total', status: 'Estado', payment: 'Pago', urgent: 'Urgente',
    todaySales: 'Ventas Hoy', monthSales: 'Ventas Mes', pendingOrders: 'Pedidos Pendientes',
    avgTicket: 'Ticket Promedio', exportExcel: 'Exportar Excel', generateInvoice: 'Factura',
    lowStock: 'Stock Bajo', urgentOrder: 'Pedido Urgente', delayedOrder: 'Pedido Retrasado',
    trackingNumber: 'N° Seguimiento', courier: 'Courier', currency: 'S/ ',
    noOrders: 'No hay pedidos', noResults: 'No se encontraron pedidos con los filtros actuales',
    confirmArchive: '¿Archivar este pedido?', stockWarning: 'Stock insuficiente',
    orders: 'pedidos', viewArchived: 'Ver archivados', hideArchived: 'Ocultar archivados',
    onlyUrgent: 'Solo urgentes', all: 'Todos', seeVoucher: 'Ver voucher',
    withoutTracking: 'Sin tracking', archive: 'Archivar', products: 'productos', product: 'producto',
    sku: 'SKU', quantity: 'Cantidad', availableStock: 'Stock disponible',
    insufficientStock: 'Stock insuficiente', selectCourier: 'Seleccionar courier',
    enterTracking: 'Ingrese número de seguimiento', subtotal: 'Subtotal',
    orderHistory: 'Historial de Estados', by: 'por', close: 'Cerrar',
  },
};

export default function GestionPedidos() {
  const [pedidos,           setPedidos]           = useState<Pedido[]>([]);
  const [productos,         setProductos]         = useState<Producto[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [pedidoSeleccionado,setPedidoSeleccionado]= useState<Pedido | null>(null);
  const [actualizandoId,    setActualizandoId]    = useState<string | null>(null);
  const [pagination,        setPagination]        = useState({ pagina: 1, itemsPorPagina: 10, total: 0 });
  const [filtros,           setFiltros]           = useState<Filtros>({ estado: 'Todos', busqueda: '', metodoPago: 'Todos', archived: false });

  const t = LANGUAGES.es;

  // ── CARGA ──
  const cargarPedidos = useCallback(async (incluirArchivados = false) => {
    setLoading(true); setError(null);
    try {
      let q = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
      if (!incluirArchivados) q = query(q, where("archived", "!=", true));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          clienteEmail:      data.clienteEmail || data.email || "Sin email",
          clienteNombre:     data.clienteNombre     || null,
          clienteRut:        data.clienteRut         || null,
          clienteTelefono:   data.clienteTelefono    || null,
          clienteDireccion:  data.clienteDireccion   || null,
          fecha:             data.fecha              || null,
          estado:            data.estado             || "PENDIENTE",
          metodoPago:        data.metodoPago         || "No especificado",
          total:             Number(data.total)      || 0,
          items:             data.items              || [],
          comprobanteUrl:    data.comprobanteUrl || data.comprobante || null,
          nota:              data.nota               || null,
          notaInterna:       data.notaInterna        || null,
          trackingNumber:    data.trackingNumber     || null,
          courier:           data.courier            || null,
          guiaEnvio:         data.guiaEnvio          || null,
          transportista:     data.transportista      || null,
          archived:          data.archived           || false,
          archivedAt:        data.archivedAt         || null,
          historialEstados:  data.historialEstados   || [],
          urgente:           data.urgente            || false,
          fechaActualizacion:data.fechaActualizacion || null,
          fechaEntrega:      data.fechaEntrega       || null,
        } as Pedido;
      });
      setPedidos(docs);
      setPagination(p => ({ ...p, total: docs.length, pagina: 1 }));
    } catch {
      setError("No se pudieron cargar los pedidos. Intenta nuevamente.");
    } finally { setLoading(false); }
  }, []);

  const cargarProductos = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "productos"));
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Producto)));
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    cargarPedidos(mostrarArchivados);
    cargarProductos();
  }, [cargarPedidos, cargarProductos, mostrarArchivados]);

  // ── UTILIDADES ──
  const getStatusConfig = (estado: string) => STATUS_CONFIG[estado as OrderStatus] || DEFAULT_STATUS;

  const formatearFecha = (fecha: any) => {
    if (!fecha) return '—';
    try {
      return fecha.toDate().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return '—'; }
  };

  const fmt = (n: number) => `${t.currency}${n.toFixed(2)}`;

  // ── FILTROS ──
  const pedidosFiltrados = useMemo(() => {
    let f = pedidos;
    if (filtros.archived !== undefined) f = f.filter(p => p.archived === filtros.archived);
    if (filtros.busqueda) {
      const s = filtros.busqueda.toLowerCase();
      f = f.filter(p =>
        p.clienteEmail.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) ||
        (p.clienteNombre?.toLowerCase() || '').includes(s) || (p.clienteRut || '').includes(s) ||
        (p.trackingNumber || '').toLowerCase().includes(s)
      );
    }
    if (filtros.estado !== 'Todos' && filtros.estado !== 'Archivados') f = f.filter(p => p.estado === filtros.estado);
    if (filtros.metodoPago !== 'Todos') f = f.filter(p => p.metodoPago === filtros.metodoPago);
    if (filtros.urgente) f = f.filter(p => p.urgente);
    return f;
  }, [pedidos, filtros]);

  const pedidosPaginados = useMemo(() => {
    const start = (pagination.pagina - 1) * pagination.itemsPorPagina;
    return pedidosFiltrados.slice(start, start + pagination.itemsPorPagina);
  }, [pedidosFiltrados, pagination]);

  // ── ALERTAS ──
  const alertasStock     = useMemo(() => productos.filter(p => p.stock <= p.stockMinimo), [productos]);
  const pedidosUrgentes  = useMemo(() => pedidos.filter(p => p.urgente && !['ENTREGADO','CANCELADO'].includes(p.estado) && !p.archived), [pedidos]);
  const pedidosRetrasados= useMemo(() => {
    const hace3 = new Date(); hace3.setDate(hace3.getDate() - 3);
    return pedidos.filter(p => p.fecha?.toDate && !['ENTREGADO','CANCELADO'].includes(p.estado) && !p.archived && p.fecha.toDate() < hace3);
  }, [pedidos]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const mes  = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const activos = pedidos.filter(p => !p.archived && p.estado !== 'CANCELADO');
    const ventasHoy = activos.filter(p => { if (!p.fecha?.toDate) return false; const d = p.fecha.toDate(); d.setHours(0,0,0,0); return d.getTime() === hoy.getTime(); }).reduce((s,p) => s+p.total, 0);
    const ventasMes = activos.filter(p => p.fecha?.toDate && p.fecha.toDate() >= mes).reduce((s,p) => s+p.total, 0);
    const pendientes = pedidos.filter(p => p.estado === 'PENDIENTE' && !p.archived).length;
    const entregados = pedidos.filter(p => p.estado === 'ENTREGADO' && !p.archived);
    const ticket = entregados.length ? entregados.reduce((s,p) => s+p.total, 0) / entregados.length : 0;
    return { ventasHoy, ventasMes, pendientes, ticket };
  }, [pedidos]);

  // ── ACCIONES ──
  const verificarStock = (items: ProductoPedido[]) => {
    const faltantes = items.filter(item => {
      const prod = productos.find(p => p.id === item.id || p.sku === item.sku);
      return prod && prod.stock < item.cantidad;
    }).map(item => `${item.nombre}`);
    return { suficiente: faltantes.length === 0, faltantes };
  };

  const exportarExcel = () => {
    if (!pedidosFiltrados.length) { alert('No hay datos'); return; }
    const rows = pedidosFiltrados.map(p => ({
      ID: p.id, Fecha: formatearFecha(p.fecha),
      Cliente: p.clienteNombre || p.clienteEmail, Email: p.clienteEmail,
      Total: p.total, Estado: p.estado, Pago: p.metodoPago,
      Tracking: p.trackingNumber || '', Urgente: p.urgente ? 'Sí' : 'No',
    }));
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' })),
      download: `pedidos_${new Date().toISOString().split('T')[0]}.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const archivarPedido = async (id: string) => {
    if (!confirm(t.confirmArchive)) return;
    setActualizandoId(id);
    try {
      await updateDoc(doc(db, "pedidos", id), { archived: true, archivedAt: new Date() });
      setPedidos(p => p.filter(x => x.id !== id));
    } catch { alert("Error al archivar"); }
    finally { setActualizandoId(null); }
  };

  const actualizarEstado = async (id: string, nuevoEstado: OrderStatus) => {
    setActualizandoId(id);
    const pedidoActual = pedidos.find(p => p.id === id);
    if (nuevoEstado === 'PAGADO' && pedidoActual) {
      const check = verificarStock(pedidoActual.items);
      if (!check.suficiente) { alert(`${t.stockWarning}:\n${check.faltantes.join('\n')}`); setActualizandoId(null); return; }
    }
    try {
      const nuevoHist = { estado: nuevoEstado, fecha: new Date(), usuario: 'admin', nota: `${pedidoActual?.estado} → ${nuevoEstado}` };
      const data: any = { estado: nuevoEstado, fechaActualizacion: new Date(), historialEstados: [...(pedidoActual?.historialEstados || []), nuevoHist] };
      if (nuevoEstado === 'ENTREGADO') data.fechaEntrega = new Date();
      await updateDoc(doc(db, "pedidos", id), data);
      setPedidos(p => p.map(x => x.id === id ? { ...x, estado: nuevoEstado, historialEstados: [...(x.historialEstados || []), nuevoHist] } : x));
    } catch { alert("Error actualizando estado"); }
    finally { setActualizandoId(null); }
  };

  const actualizarEnvio = async (id: string, trackingNumber: string, courier: string) => {
    setActualizandoId(id);
    try {
      await updateDoc(doc(db, "pedidos", id), { trackingNumber, courier, guiaEnvio: trackingNumber, transportista: courier, estado: 'ENVIADO', fechaActualizacion: new Date() });
      const upd = (x: Pedido) => ({ ...x, trackingNumber, courier, guiaEnvio: trackingNumber, transportista: courier, estado: 'ENVIADO' as OrderStatus });
      setPedidos(p => p.map(x => x.id === id ? upd(x) : x));
      if (pedidoSeleccionado?.id === id) setPedidoSeleccionado(prev => prev ? upd(prev) : null);
    } catch { alert("Error actualizando envío"); }
    finally { setActualizandoId(null); }
  };

  const estadosDisponibles = Object.keys(STATUS_CONFIG) as OrderStatus[];
  const totalPaginas = Math.ceil(pedidosFiltrados.length / pagination.itemsPorPagina);

  // ══════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HEADER ── */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t.appName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{pedidosFiltrados.length} {t.orders} · {pedidos.length} total</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Ver archivados */}
            <button
              onClick={() => { setMostrarArchivados(!mostrarArchivados); setFiltros(f => ({ ...f, archived: !mostrarArchivados })); }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-600 font-medium"
            >
              <Archive className="w-4 h-4" style={{ color: C.primary }} />
              {mostrarArchivados ? t.hideArchived : t.viewArchived}
            </button>
            {/* Actualizar */}
            <button
              onClick={() => cargarPedidos(mostrarArchivados)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-600 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: C.primary }} />
              {t.update}
            </button>
            {/* Exportar */}
            <button
              onClick={exportarExcel}
              disabled={!pedidosFiltrados.length}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: C.primary }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.primaryDark)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.primary)}
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t.exportExcel}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        {/* ── ALERTAS ── */}
        {(alertasStock.length > 0 || pedidosUrgentes.length > 0 || pedidosRetrasados.length > 0) && (
          <div className="space-y-2">
            {alertasStock.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl border-l-4 bg-orange-50 border-orange-400">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">{t.lowStock} ({alertasStock.length})</p>
                  <p className="text-xs text-orange-600 mt-0.5">{alertasStock.map(p => `${p.nombre}: ${p.stock} uds`).join(' · ')}</p>
                </div>
              </div>
            )}
            {pedidosUrgentes.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl border-l-4 bg-red-50 border-red-500">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-800">{t.urgentOrder} ({pedidosUrgentes.length})</p>
                  <p className="text-xs text-red-600 mt-0.5">{pedidosUrgentes.map(p => `#${p.id.slice(-6)} ${p.clienteNombre || p.clienteEmail}`).join(' · ')}</p>
                </div>
              </div>
            )}
            {pedidosRetrasados.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl border-l-4 bg-amber-50 border-amber-500">
                <Clock className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{t.delayedOrder} ({pedidosRetrasados.length})</p>
                  <p className="text-xs text-amber-600 mt-0.5">{pedidosRetrasados.map(p => `#${p.id.slice(-6)} ${p.clienteNombre || p.clienteEmail}`).join(' · ')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t.todaySales,    value: fmt(kpis.ventasHoy),  icon: DollarSign,  },
            { label: t.monthSales,    value: fmt(kpis.ventasMes),  icon: TrendingUp,  },
            { label: t.pendingOrders, value: kpis.pendientes,       icon: Clock,       },
            { label: t.avgTicket,     value: fmt(kpis.ticket),     icon: Users,       },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.primaryBg }}>
                  <Icon className="w-5 h-5" style={{ color: C.primary }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* ── FILTROS ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* búsqueda */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder={t.searchPlaceholder} value={filtros.busqueda}
                onChange={e => setFiltros(f => ({ ...f, busqueda: e.target.value, pagina: 1 }))}
                className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-colors"
              />
              {filtros.busqueda && (
                <button onClick={() => setFiltros(f => ({ ...f, busqueda: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* estado */}
            <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value as any }))}
              className="py-2.5 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 focus:outline-none focus:border-orange-400 transition-colors">
              <option value="Todos">{t.allStatus}</option>
              {estadosDisponibles.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
            {/* pago */}
            <select value={filtros.metodoPago} onChange={e => setFiltros(f => ({ ...f, metodoPago: e.target.value as any }))}
              className="py-2.5 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 focus:outline-none focus:border-orange-400 transition-colors">
              <option value="Todos">{t.allPayments}</option>
              {Object.entries(METODO_PAGO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {/* urgente */}
            <select value={filtros.urgente ? 'urgente' : 'todos'} onChange={e => setFiltros(f => ({ ...f, urgente: e.target.value === 'urgente' }))}
              className="py-2.5 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 focus:outline-none focus:border-orange-400 transition-colors">
              <option value="todos">{t.all}</option>
              <option value="urgente">{t.onlyUrgent}</option>
            </select>
          </div>
          {(filtros.estado !== 'Todos' || filtros.metodoPago !== 'Todos' || filtros.busqueda || filtros.urgente) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">{t.activeFilters}:</span>
              <button onClick={() => setFiltros({ estado:'Todos', busqueda:'', metodoPago:'Todos', urgente:false, archived: mostrarArchivados })}
                className="text-xs font-semibold hover:underline" style={{ color: C.primary }}>
                {t.clearAll}
              </button>
            </div>
          )}
        </div>

        {/* ── TABLA ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
              <p className="font-semibold text-gray-900 mb-1">{t.error}</p>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button onClick={() => cargarPedidos(mostrarArchivados)} className="px-4 py-2 text-white rounded-lg text-sm font-semibold" style={{ backgroundColor: C.primary }}>
                {t.update}
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {[t.orderId, t.customer, t.total, t.status, t.payment, 'Envío', t.actions].map((h, i) => (
                        <th key={h} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan={7} className="py-16 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: C.primary }} />
                        <p className="text-sm text-gray-500">{t.loading}...</p>
                      </td></tr>
                    ) : pedidosPaginados.length === 0 ? (
                      <tr><td colSpan={7} className="py-16 text-center">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-semibold text-gray-700">{t.noOrders}</p>
                        <p className="text-sm text-gray-400 mt-1">{t.noResults}</p>
                      </td></tr>
                    ) : pedidosPaginados.map(pedido => {
                      const cfg = getStatusConfig(pedido.estado);
                      const Icon = cfg.icon;
                      return (
                        <tr key={pedido.id}
                          className="hover:bg-gray-50 transition-colors"
                          style={pedido.urgente ? { backgroundColor: 'rgba(239,68,68,0.04)' } : {}}>
                          {/* ID/fecha */}
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2">
                              {pedido.urgente && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />}
                              <div>
                                <p className="text-sm font-semibold text-gray-900">#{pedido.id.slice(-8).toUpperCase()}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{formatearFecha(pedido.fecha)}</p>
                              </div>
                            </div>
                          </td>
                          {/* cliente */}
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-gray-900">{pedido.clienteNombre || pedido.clienteEmail}</p>
                            {pedido.clienteRut && <p className="text-xs text-gray-400">{pedido.clienteRut}</p>}
                          </td>
                          {/* total */}
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-gray-900">{fmt(pedido.total)}</p>
                            <p className="text-xs text-gray-400">{pedido.items.length} {pedido.items.length === 1 ? t.product : t.products}</p>
                          </td>
                          {/* estado */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bgColor} ${cfg.color}`}>
                              <Icon className="w-3.5 h-3.5" />{cfg.label}
                            </span>
                          </td>
                          {/* pago */}
                          <td className="px-5 py-4">
                            <p className="text-sm text-gray-700">{METODO_PAGO_LABELS[pedido.metodoPago] || pedido.metodoPago}</p>
                            {pedido.comprobanteUrl && (
                              <a href={pedido.comprobanteUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs mt-1 font-medium hover:underline" style={{ color: C.primary }}>
                                <Upload className="w-3 h-3" />{t.seeVoucher}
                              </a>
                            )}
                          </td>
                          {/* envío */}
                          <td className="px-5 py-4">
                            {pedido.trackingNumber || pedido.guiaEnvio ? (
                              <div>
                                <p className="text-xs font-semibold text-gray-700">{pedido.courier || pedido.transportista}</p>
                                <p className="text-xs text-gray-400">{pedido.trackingNumber || pedido.guiaEnvio}</p>
                              </div>
                            ) : <span className="text-xs text-gray-400">{t.withoutTracking}</span>}
                          </td>
                          {/* acciones */}
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <select value={pedido.estado}
                                onChange={e => actualizarEstado(pedido.id, e.target.value as OrderStatus)}
                                disabled={!!actualizandoId || !!pedido.archived}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-900 focus:outline-none focus:border-orange-400 disabled:opacity-50">
                                {estadosDisponibles.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                              </select>
                              <button onClick={() => setPedidoSeleccionado(pedido)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => alert(`Factura #${pedido.id.slice(-8).toUpperCase()}`)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <FileDown className="w-4 h-4" />
                              </button>
                              {!pedido.archived && (
                                <button onClick={() => archivarPedido(pedido.id)} disabled={actualizandoId === pedido.id}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                              {actualizandoId === pedido.id && <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.primary }} />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {!loading && pedidosFiltrados.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-500">
                      {(pagination.pagina-1)*pagination.itemsPorPagina+1}–{Math.min(pagination.pagina*pagination.itemsPorPagina,pedidosFiltrados.length)} de {pedidosFiltrados.length}
                    </p>
                    <select value={pagination.itemsPorPagina}
                      onChange={e => setPagination({ pagina:1, itemsPorPagina:Number(e.target.value), total:pedidosFiltrados.length })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 text-gray-700 focus:outline-none">
                      {[10,25,50,100].map(n => <option key={n} value={n}>{n} / pág</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPagination(p => ({ ...p, pagina: Math.max(1,p.pagina-1) }))} disabled={pagination.pagina===1}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-gray-600">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-sm text-gray-500">{pagination.pagina}/{totalPaginas||1}</span>
                    <button onClick={() => setPagination(p => ({ ...p, pagina: Math.min(totalPaginas,p.pagina+1) }))} disabled={pagination.pagina===totalPaginas||!totalPaginas}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-gray-600">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══════ MODAL DETALLES ══════ */}
      {pedidoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setPedidoSeleccionado(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-xl">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-900">{t.details} #{pedidoSeleccionado.id.slice(-8).toUpperCase()}</h2>
                {pedidoSeleccionado.urgente && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Urgente</span>
                )}
              </div>
              <button onClick={() => setPedidoSeleccionado(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* cliente */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t.customer}</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  {[
                    ['Email', pedidoSeleccionado.clienteEmail],
                    ['Nombre', pedidoSeleccionado.clienteNombre],
                    ['RUT', pedidoSeleccionado.clienteRut],
                    ['Teléfono', pedidoSeleccionado.clienteTelefono],
                    ['Dirección', pedidoSeleccionado.clienteDireccion],
                  ].filter(([,v]) => v).map(([k, v]) => (
                    <p key={k} className="text-sm"><span className="text-gray-500 font-medium">{k}: </span><span className="text-gray-900">{v}</span></p>
                  ))}
                </div>
              </section>

              {/* envío */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Envío y Logística</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">{t.courier}</label>
                      <select value={pedidoSeleccionado.courier || ''}
                        onChange={e => {
                          const courier = e.target.value;
                          const tracking = window.prompt(t.enterTracking);
                          if (tracking) actualizarEnvio(pedidoSeleccionado.id, tracking, courier);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:border-orange-400">
                        <option value="">{t.selectCourier}</option>
                        {COURIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">{t.trackingNumber}</label>
                      <input value={pedidoSeleccionado.trackingNumber || pedidoSeleccionado.guiaEnvio || ''} readOnly
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900" />
                    </div>
                  </div>
                </div>
              </section>

              {/* productos */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Productos</h3>
                <div className="space-y-2">
                  {pedidoSeleccionado.items.map((item: any, i: number) => {
                    const prod = productos.find(p => p.id === item.id || p.sku === item.sku);
                    const ok = prod ? prod.stock >= item.cantidad : true;
                    return (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${ok ? 'border-gray-200 bg-gray-50' : 'border-red-300 bg-red-50'}`}>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.nombre}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{t.sku}: {item.sku||'N/A'} · {t.quantity}: {item.cantidad}</p>
                          {prod && <p className={`text-xs mt-0.5 ${prod.stock <= prod.stockMinimo ? 'text-red-600' : 'text-gray-400'}`}>Stock: {prod.stock}{!ok && ' ⚠️ insuficiente'}</p>}
                        </div>
                        <p className="text-sm font-bold text-gray-900">{fmt((item.precio||0)*(item.cantidad||1))}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* historial */}
              {!!pedidoSeleccionado.historialEstados?.length && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t.orderHistory}</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {pedidoSeleccionado.historialEstados.map((h, i) => {
                      const cfg = getStatusConfig(h.estado); const HIcon = cfg.icon;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-lg ${cfg.bgColor}`}><HIcon className={`w-3.5 h-3.5 ${cfg.color}`} /></div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{cfg.label}</p>
                            <p className="text-xs text-gray-400">{formatearFecha(h.fecha)}{h.usuario && ` · ${h.usuario}`}</p>
                            {h.nota && <p className="text-xs text-gray-500 mt-0.5">{h.nota}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* resumen */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Resumen</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {[
                    [t.subtotal, fmt(pedidoSeleccionado.total)],
                    [t.payment, METODO_PAGO_LABELS[pedidoSeleccionado.metodoPago] || pedidoSeleccionado.metodoPago],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-semibold text-gray-900">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t.status}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${getStatusConfig(pedidoSeleccionado.estado).bgColor} ${getStatusConfig(pedidoSeleccionado.estado).color}`}>
                      {getStatusConfig(pedidoSeleccionado.estado).label}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => alert(`Factura ${pedidoSeleccionado.id}`)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: C.primary }}>
                {t.generateInvoice}
              </button>
              <button onClick={() => setPedidoSeleccionado(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}