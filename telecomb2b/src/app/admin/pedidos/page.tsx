"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore";
import { 
  Search, X, Loader2, Eye, Upload, Filter, 
  ChevronLeft, ChevronRight, Download, RefreshCw,
  AlertCircle, CheckCircle, Clock, Truck, PackageCheck,
  Ban, FileText, Archive, TrendingUp, Users, 
  DollarSign, ShoppingBag, AlertTriangle, Globe,
  FileSpreadsheet, FileDown, MapPin, Package
} from "lucide-react";

// ============ TIPOS Y CONSTANTES ============
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

// ============ PALETA DE COLORES ============
const COLORS = {
  primary: '#ff6601',
  primaryHover: '#e65c00',
  primaryLight: '#fff0e6',
  dark: '#1E1E1E',
  light: '#030712',
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  }
};

// ============ CONFIGURACIÓN DE IDIOMAS ============
const LANGUAGES = {
  es: {
    appName: 'Gestión de Pedidos',
    search: 'Buscar',
    export: 'Exportar',
    update: 'Actualizar',
    clear: 'Limpiar',
    close: 'Cerrar',
    details: 'Detalles',
    actions: 'Acciones',
    loading: 'Cargando',
    error: 'Error',
    success: 'Éxito',
    pending: 'Pendiente',
    paid: 'Pagado',
    inProcess: 'En Proceso',
    sent: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    archived: 'Archivados',
    allStatus: 'Todos los estados',
    allPayments: 'Todos los métodos',
    searchPlaceholder: 'Email, ID, nombre o RUT...',
    activeFilters: 'Filtros activos',
    clearAll: 'Limpiar todo',
    orderId: 'Pedido / Fecha',
    customer: 'Cliente',
    total: 'Total',
    status: 'Estado',
    payment: 'Pago',
    urgent: 'Urgente',
    todaySales: 'Ventas Hoy',
    monthSales: 'Ventas Mes',
    pendingOrders: 'Pedidos Pendientes',
    avgTicket: 'Ticket Promedio',
    exportExcel: 'Exportar a Excel',
    exportPDF: 'Exportar a PDF',
    generateInvoice: 'Generar Factura',
    lowStock: 'Stock Bajo',
    urgentOrder: 'Pedido Urgente',
    delayedOrder: 'Pedido Retrasado',
    trackingNumber: 'N° Seguimiento',
    courier: 'Courier',
    shippingAddress: 'Dirección de Envío',
    generateLabel: 'Generar Etiqueta',
    currency: 'S/ ',
    noOrders: 'No hay pedidos',
    noResults: 'No se encontraron pedidos con los filtros actuales',
    confirmArchive: '¿Archivar este pedido?',
    confirmDelete: '¿Eliminar este pedido?',
    stockWarning: 'Stock insuficiente',
    orders: 'pedidos',
    viewArchived: 'Ver archivados',
    hideArchived: 'Ocultar archivados',
    onlyUrgent: 'Solo urgentes',
    all: 'Todos',
    seeVoucher: 'Ver voucher',
    withoutTracking: 'Sin tracking',
    archive: 'Archivar',
    products: 'productos',
    product: 'producto',
    sku: 'SKU',
    quantity: 'Cantidad',
    availableStock: 'Stock disponible',
    insufficientStock: 'Stock insuficiente',
    selectCourier: 'Seleccionar courier',
    enterTracking: 'Ingrese número de seguimiento',
    subtotal: 'Subtotal',
    orderHistory: 'Historial de Estados',
    by: 'por',
  },
  en: {
    appName: 'Order Management',
    search: 'Search',
    export: 'Export',
    update: 'Update',
    clear: 'Clear',
    close: 'Close',
    details: 'Details',
    actions: 'Actions',
    loading: 'Loading',
    error: 'Error',
    success: 'Success',
    pending: 'Pending',
    paid: 'Paid',
    inProcess: 'In Process',
    sent: 'Sent',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    archived: 'Archived',
    allStatus: 'All status',
    allPayments: 'All payment methods',
    searchPlaceholder: 'Email, ID, name or RUT...',
    activeFilters: 'Active filters',
    clearAll: 'Clear all',
    orderId: 'Order / Date',
    customer: 'Customer',
    total: 'Total',
    status: 'Status',
    payment: 'Payment',
    urgent: 'Urgent',
    todaySales: 'Today Sales',
    monthSales: 'Month Sales',
    pendingOrders: 'Pending Orders',
    avgTicket: 'Avg Ticket',
    exportExcel: 'Export to Excel',
    exportPDF: 'Export to PDF',
    generateInvoice: 'Generate Invoice',
    lowStock: 'Low Stock',
    urgentOrder: 'Urgent Order',
    delayedOrder: 'Delayed Order',
    trackingNumber: 'Tracking N°',
    courier: 'Courier',
    shippingAddress: 'Shipping Address',
    generateLabel: 'Generate Label',
    currency: 'S/ ',
    noOrders: 'No orders',
    noResults: 'No orders found with current filters',
    confirmArchive: 'Archive this order?',
    confirmDelete: 'Delete this order?',
    stockWarning: 'Insufficient stock',
    orders: 'orders',
    viewArchived: 'View archived',
    hideArchived: 'Hide archived',
    onlyUrgent: 'Only urgent',
    all: 'All',
    seeVoucher: 'See voucher',
    withoutTracking: 'No tracking',
    archive: 'Archive',
    products: 'products',
    product: 'product',
    sku: 'SKU',
    quantity: 'Quantity',
    availableStock: 'Available stock',
    insufficientStock: 'Insufficient stock',
    selectCourier: 'Select courier',
    enterTracking: 'Enter tracking number',
    subtotal: 'Subtotal',
    orderHistory: 'Order History',
    by: 'by',
  },
  pt: {
    appName: 'Gestão de Pedidos',
    search: 'Buscar',
    export: 'Exportar',
    update: 'Atualizar',
    clear: 'Limpar',
    close: 'Fechar',
    details: 'Detalhes',
    actions: 'Ações',
    loading: 'Carregando',
    error: 'Erro',
    success: 'Sucesso',
    pending: 'Pendente',
    paid: 'Pago',
    inProcess: 'Em Processo',
    sent: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
    archived: 'Arquivados',
    allStatus: 'Todos os estados',
    allPayments: 'Todos os métodos',
    searchPlaceholder: 'Email, ID, nome ou RUT...',
    activeFilters: 'Filtros ativos',
    clearAll: 'Limpar tudo',
    orderId: 'Pedido / Data',
    customer: 'Cliente',
    total: 'Total',
    status: 'Estado',
    payment: 'Pagamento',
    urgent: 'Urgente',
    todaySales: 'Vendas Hoje',
    monthSales: 'Vendas Mês',
    pendingOrders: 'Pedidos Pendentes',
    avgTicket: 'Ticket Médio',
    exportExcel: 'Exportar para Excel',
    exportPDF: 'Exportar para PDF',
    generateInvoice: 'Gerar Fatura',
    lowStock: 'Estoque Baixo',
    urgentOrder: 'Pedido Urgente',
    delayedOrder: 'Pedido Atrasado',
    trackingNumber: 'N° Rastreamento',
    courier: 'Transportadora',
    shippingAddress: 'Endereço de Entrega',
    generateLabel: 'Gerar Etiqueta',
    currency: 'S/ ',
    noOrders: 'Sem pedidos',
    noResults: 'Nenhum pedido encontrado com os filtros atuais',
    confirmArchive: 'Arquivar este pedido?',
    confirmDelete: 'Excluir este pedido?',
    stockWarning: 'Estoque insuficiente',
    orders: 'pedidos',
    viewArchived: 'Ver arquivados',
    hideArchived: 'Ocultar arquivados',
    onlyUrgent: 'Apenas urgentes',
    all: 'Todos',
    seeVoucher: 'Ver comprovante',
    withoutTracking: 'Sem rastreamento',
    archive: 'Arquivar',
    products: 'produtos',
    product: 'produto',
    sku: 'SKU',
    quantity: 'Quantidade',
    availableStock: 'Estoque disponível',
    insufficientStock: 'Estoque insuficiente',
    selectCourier: 'Selecionar transportadora',
    enterTracking: 'Digite o número de rastreamento',
    subtotal: 'Subtotal',
    orderHistory: 'Histórico de Estados',
    by: 'por',
  }
};

// ============ CONFIGURACIÓN DE ESTADOS ============
const STATUS_CONFIG: Record<OrderStatus, { 
  color: string; 
  bgColor: string; 
  icon: any;
  label: string;
  nextStatus?: OrderStatus[];
}> = {
  PENDIENTE: { 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-50', 
    icon: Clock,
    label: 'Pendiente',
    nextStatus: ['PAGADO', 'EN PROCESO', 'CANCELADO']
  },
  PAGADO: { 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50', 
    icon: CheckCircle,
    label: 'Pagado',
    nextStatus: ['EN PROCESO', 'ENVIADO', 'CANCELADO']
  },
  'EN PROCESO': { 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-50', 
    icon: Package,
    label: 'En Proceso',
    nextStatus: ['ENVIADO', 'CANCELADO']
  },
  ENVIADO: { 
    color: 'text-indigo-700', 
    bgColor: 'bg-indigo-50', 
    icon: Truck,
    label: 'Enviado',
    nextStatus: ['ENTREGADO', 'CANCELADO']
  },
  ENTREGADO: { 
    color: 'text-emerald-700', 
    bgColor: 'bg-emerald-50', 
    icon: PackageCheck,
    label: 'Entregado',
    nextStatus: []
  },
  CANCELADO: { 
    color: 'text-rose-700', 
    bgColor: 'bg-rose-50', 
    icon: Ban,
    label: 'Cancelado',
    nextStatus: []
  }
};

const DEFAULT_STATUS_CONFIG = {
  color: 'text-gray-700',
  bgColor: 'bg-gray-50',
  icon: AlertCircle,
  label: 'Desconocido'
};

const METODO_PAGO_LABELS: Record<string, string> = {
  Transferencia: 'Transferencia',
  Tarjeta: 'Tarjeta',
  Efectivo: 'Efectivo',
  'No especificado': 'No especificado'
};

const COURIER_OPTIONS = [
  'Olva Courier',
  'Shalom',
  'OTR',
  'Otro'
];

// ============ COMPONENTE PRINCIPAL ============
export default function GestionPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('es');
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pagina: 1,
    itemsPorPagina: 10,
    total: 0
  });

  // Filtros state
  const [filtros, setFiltros] = useState<Filtros>({
    estado: 'Todos',
    busqueda: '',
    metodoPago: 'Todos',
    archived: false
  });

  const t = LANGUAGES[language];

  // ============ FUNCIONES DE CARGA ============
  const cargarPedidos = useCallback(async (incluirArchivados = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const pedidosRef = collection(db, "pedidos");
      let q = query(pedidosRef, orderBy("fecha", "desc"));
      
      if (!incluirArchivados) {
        q = query(q, where("archived", "!=", true));
      }
      
      const querySnapshot = await getDocs(q);
      
      const docs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          clienteEmail: data.clienteEmail || data.email || "Sin email",
          clienteNombre: data.clienteNombre || null,
          clienteRut: data.clienteRut || null,
          clienteTelefono: data.clienteTelefono || null,
          clienteDireccion: data.clienteDireccion || null,
          fecha: data.fecha || null,
          estado: data.estado || "PENDIENTE",
          metodoPago: data.metodoPago || "No especificado",
          total: Number(data.total) || 0,
          items: data.items || [],
          comprobanteUrl: data.comprobanteUrl || data.comprobante || null,
          nota: data.nota || null,
          notaInterna: data.notaInterna || null,
          trackingNumber: data.trackingNumber || null,
          courier: data.courier || null,
          guiaEnvio: data.guiaEnvio || null,
          transportista: data.transportista || null,
          archived: data.archived || false,
          archivedAt: data.archivedAt || null,
          historialEstados: data.historialEstados || [],
          urgente: data.urgente || false,
          fechaActualizacion: data.fechaActualizacion || null,
          fechaEntrega: data.fechaEntrega || null
        };
      }) as Pedido[];

      setPedidos(docs);
      setPagination(prev => ({ ...prev, total: docs.length, pagina: 1 }));
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
      setError("No se pudieron cargar los pedidos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    try {
      const productosRef = collection(db, "productos");
      const querySnapshot = await getDocs(productosRef);
      
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Producto[];

      setProductos(docs);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  }, []);

  useEffect(() => {
    cargarPedidos(mostrarArchivados);
    cargarProductos();
  }, [cargarPedidos, cargarProductos, mostrarArchivados]);

  // ============ FUNCIONES DE UTILIDAD ============
  const getStatusConfig = useCallback((estado: string) => {
    return STATUS_CONFIG[estado as OrderStatus] || DEFAULT_STATUS_CONFIG;
  }, []);

  const formatearFecha = useCallback((fecha: any) => {
    if (!fecha) return 'Fecha no disponible';
    try {
      if (fecha.toDate) {
        return fecha.toDate().toLocaleDateString(`es-${language.toUpperCase()}`, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return 'Fecha inválida';
    } catch {
      return 'Fecha inválida';
    }
  }, [language]);

  const formatearMoneda = useCallback((monto: number) => {
    return `${t.currency}${monto.toFixed(2)}`;
  }, [t.currency]);

  // ============ FILTROS Y PAGINACIÓN ============
  const pedidosFiltrados = useMemo(() => {
    let filtrados = pedidos;

    if (filtros.archived !== undefined) {
      filtrados = filtrados.filter(p => p.archived === filtros.archived);
    }

    if (filtros.busqueda) {
      const searchTerm = filtros.busqueda.toLowerCase();
      filtrados = filtrados.filter((pedido) => {
        return (
          pedido.clienteEmail.toLowerCase().includes(searchTerm) ||
          pedido.id.toLowerCase().includes(searchTerm) ||
          (pedido.clienteNombre?.toLowerCase() || '').includes(searchTerm) ||
          (pedido.clienteRut || '').includes(searchTerm) ||
          (pedido.trackingNumber || '').toLowerCase().includes(searchTerm) ||
          (pedido.guiaEnvio || '').toLowerCase().includes(searchTerm)
        );
      });
    }

    if (filtros.estado !== 'Todos' && filtros.estado !== 'Archivados') {
      filtrados = filtrados.filter(p => p.estado === filtros.estado);
    }

    if (filtros.metodoPago !== 'Todos') {
      filtrados = filtrados.filter(p => p.metodoPago === filtros.metodoPago);
    }

    if (filtros.urgente) {
      filtrados = filtrados.filter(p => p.urgente === true);
    }

    return filtrados;
  }, [pedidos, filtros]);

  const pedidosPaginados = useMemo(() => {
    const startIndex = (pagination.pagina - 1) * pagination.itemsPorPagina;
    const endIndex = startIndex + pagination.itemsPorPagina;
    return pedidosFiltrados.slice(startIndex, endIndex);
  }, [pedidosFiltrados, pagination.pagina, pagination.itemsPorPagina]);

  // ============ ALERTAS ============
  const alertasStock = useMemo(() => {
    return productos.filter(p => p.stock <= p.stockMinimo);
  }, [productos]);

  const pedidosUrgentes = useMemo(() => {
    return pedidos.filter(p => 
      p.urgente === true && 
      p.estado !== 'ENTREGADO' && 
      p.estado !== 'CANCELADO' &&
      !p.archived
    );
  }, [pedidos]);

  const pedidosRetrasados = useMemo(() => {
    const hoy = new Date();
    const hace3Dias = new Date(hoy);
    hace3Dias.setDate(hace3Dias.getDate() - 3);
    
    return pedidos.filter(p => {
      if (!p.fecha?.toDate) return false;
      if (p.estado === 'ENTREGADO' || p.estado === 'CANCELADO' || p.archived) return false;
      
      const fechaPedido = p.fecha.toDate();
      return fechaPedido < hace3Dias;
    });
  }, [pedidos]);

  // ============ KPIs ============
  const kpis = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    const ventasHoy = pedidos
      .filter(p => {
        if (!p.fecha?.toDate) return false;
        const fechaPedido = p.fecha.toDate();
        fechaPedido.setHours(0, 0, 0, 0);
        return fechaPedido.getTime() === hoy.getTime() && p.estado !== 'CANCELADO' && !p.archived;
      })
      .reduce((sum, p) => sum + p.total, 0);
    
    const ventasMes = pedidos
      .filter(p => {
        if (!p.fecha?.toDate) return false;
        const fechaPedido = p.fecha.toDate();
        return fechaPedido >= inicioMes && p.estado !== 'CANCELADO' && !p.archived;
      })
      .reduce((sum, p) => sum + p.total, 0);
    
    const pendientes = pedidos.filter(p => p.estado === 'PENDIENTE' && !p.archived).length;
    
    const pedidosCompletados = pedidos.filter(p => p.estado === 'ENTREGADO' && !p.archived);
    const ticketPromedio = pedidosCompletados.length > 0 
      ? pedidosCompletados.reduce((sum, p) => sum + p.total, 0) / pedidosCompletados.length 
      : 0;
    
    return {
      ventasHoy,
      ventasMes,
      pendientes,
      ticketPromedio
    };
  }, [pedidos]);

  // ============ VALIDACIÓN DE STOCK ============
  const verificarStock = useCallback((items: ProductoPedido[]): { suficiente: boolean; faltantes: string[] } => {
    const faltantes: string[] = [];
    
    items.forEach(item => {
      const producto = productos.find(p => p.id === item.id || p.sku === item.sku);
      if (producto && producto.stock < item.cantidad) {
        faltantes.push(`${item.nombre} (Stock: ${producto.stock}, Solicitado: ${item.cantidad})`);
      }
    });

    return {
      suficiente: faltantes.length === 0,
      faltantes
    };
  }, [productos]);

  // ============ EXPORTACIÓN ============
  const exportarExcel = useCallback(() => {
    if (!pedidosFiltrados.length) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const datosExportar = pedidosFiltrados.map(p => ({
        ID: p.id,
        Fecha: formatearFecha(p.fecha),
        Cliente: p.clienteNombre || p.clienteEmail,
        Email: p.clienteEmail,
        RUT: p.clienteRut || '',
        Teléfono: p.clienteTelefono || '',
        Total: p.total,
        Estado: p.estado,
        'Método Pago': p.metodoPago,
        Productos: p.items.map(i => `${i.nombre} x${i.cantidad}`).join(', '),
        'N° Seguimiento': p.trackingNumber || '',
        'Guía Envío': p.guiaEnvio || '',
        Courier: p.courier || '',
        Transportista: p.transportista || '',
        Urgente: p.urgente ? 'Sí' : 'No'
      }));

      const headers = Object.keys(datosExportar[0]).join(',');
      const rows = datosExportar.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' && (val.includes(',') || val.includes('"')) 
            ? `"${val.replace(/"/g, '""')}"` 
            : val
        ).join(',')
      ).join('\n');

      const csv = `${headers}\n${rows}`;
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar los datos');
    }
  }, [pedidosFiltrados, formatearFecha]);

  const generarPDF = useCallback((pedido: Pedido) => {
    alert(`Generando factura para pedido #${pedido.id.slice(-8).toUpperCase()}`);
  }, []);

  // ============ ARCHIVAR PEDIDOS ============
  const archivarPedido = async (id: string) => {
    if (!confirm(t.confirmArchive)) return;
    
    setActualizandoId(id);
    try {
      const pedidoRef = doc(db, "pedidos", id);
      await updateDoc(pedidoRef, { 
        archived: true,
        archivedAt: new Date()
      });
      
      setPedidos(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error al archivar pedido:", error);
      alert("Error al archivar el pedido");
    } finally {
      setActualizandoId(null);
    }
  };

  // ============ ACTUALIZAR ESTADO ============
  const actualizarEstado = async (id: string, nuevoEstado: OrderStatus) => {
    setActualizandoId(id);
    try {
      const pedidoRef = doc(db, "pedidos", id);
      const pedidoActual = pedidos.find(p => p.id === id);
      
      if (nuevoEstado === 'PAGADO' && pedidoActual) {
        const stockCheck = verificarStock(pedidoActual.items);
        if (!stockCheck.suficiente) {
          alert(`${t.stockWarning}:\n${stockCheck.faltantes.join('\n')}`);
          setActualizandoId(null);
          return;
        }
      }

      const nuevoHistorial: HistorialEstado = {
        estado: nuevoEstado,
        fecha: new Date(),
        usuario: 'admin',
        nota: `Cambio de ${pedidoActual?.estado} a ${nuevoEstado}`
      };

      const historialActual = pedidoActual?.historialEstados || [];
      
      const updateData: any = { 
        estado: nuevoEstado,
        fechaActualizacion: new Date(),
        historialEstados: [...historialActual, nuevoHistorial]
      };

      if (nuevoEstado === 'ENTREGADO') {
        updateData.fechaEntrega = new Date();
      }

      await updateDoc(pedidoRef, updateData);
      
      setPedidos(prev => prev.map(p => 
        p.id === id ? { 
          ...p, 
          estado: nuevoEstado,
          fechaEntrega: nuevoEstado === 'ENTREGADO' ? new Date() : p.fechaEntrega,
          historialEstados: [...(p.historialEstados || []), nuevoHistorial]
        } : p
      ));
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("Error al actualizar el estado del pedido");
    } finally {
      setActualizandoId(null);
    }
  };

  // ============ ACTUALIZAR ENVÍO - CORREGIDO ============
  const actualizarEnvio = async (id: string, trackingNumber: string, courier: string) => {
    setActualizandoId(id);
    try {
      const pedidoRef = doc(db, "pedidos", id);
      await updateDoc(pedidoRef, { 
        trackingNumber,
        courier,
        guiaEnvio: trackingNumber,
        transportista: courier,
        estado: 'ENVIADO',
        fechaActualizacion: new Date()
      });
      
      setPedidos(prev => prev.map(p => 
        p.id === id ? { 
          ...p, 
          trackingNumber, 
          courier,
          guiaEnvio: trackingNumber,
          transportista: courier,
          estado: 'ENVIADO' 
        } : p
      ));
      
      if (pedidoSeleccionado?.id === id) {
        setPedidoSeleccionado(prev => prev ? { 
          ...prev, 
          trackingNumber, 
          courier,
          guiaEnvio: trackingNumber,
          transportista: courier,
          estado: 'ENVIADO' 
        } : null);
      }
    } catch (error) {
      console.error("Error al actualizar envío:", error);
      alert("Error al actualizar la información de envío");
    } finally {
      setActualizandoId(null);
    }
  };

  // ============ ESTADOS DISPONIBLES ============
  const estadosDisponibles = useMemo(() => {
    return Object.keys(STATUS_CONFIG) as OrderStatus[];
  }, []);

  const totalPaginas = Math.ceil(pedidosFiltrados.length / pagination.itemsPorPagina);

  // ============ RENDER ============
  return (
    <div suppressHydrationWarning className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: COLORS.light }}>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* ============ HEADER ============ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold" style={{ color: COLORS.white }}>
              {t.appName}
            </h1>
            <p className="text-sm mt-1" style={{ color: COLORS.gray[400] }}>
              {pedidosFiltrados.length} {t.orders} • {pedidos.length} total
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="px-3 py-2 border rounded-lg bg-gray-900 text-white text-sm focus:ring-2 outline-none"
              style={{ borderColor: COLORS.gray[700], color: COLORS.white, backgroundColor: COLORS.gray[800] }}
              suppressHydrationWarning
            >
              <option value="es">🇪🇸 Español</option>
              <option value="en">🇬🇧 English</option>
              <option value="pt">🇧🇷 Português</option>
            </select>

            <button
              onClick={() => {
                setMostrarArchivados(!mostrarArchivados);
                setFiltros(prev => ({ ...prev, archived: !mostrarArchivados, pagina: 1 }));
              }}
              className="inline-flex items-center px-4 py-2 border rounded-lg bg-gray-900 text-sm font-medium hover:bg-gray-800 transition-colors"
              style={{ borderColor: COLORS.gray[700], color: COLORS.white, backgroundColor: COLORS.gray[800] }}
              suppressHydrationWarning
            >
              <Archive className="w-4 h-4 mr-2" style={{ color: COLORS.primary }} />
              {mostrarArchivados ? t.hideArchived : t.viewArchived}
            </button>

            <button
              onClick={() => cargarPedidos(mostrarArchivados)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border rounded-lg bg-gray-900 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              style={{ borderColor: COLORS.gray[700], color: COLORS.white, backgroundColor: COLORS.gray[800] }}
              suppressHydrationWarning
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} style={{ color: COLORS.primary }} />
              {t.update}
            </button>
            
            <button
              onClick={exportarExcel}
              disabled={pedidosFiltrados.length === 0}
              className="inline-flex items-center px-4 py-2 border rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary }}
              suppressHydrationWarning
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {t.exportExcel}
            </button>
          </div>
        </div>

        {/* ============ ALERTAS ============ */}
        {(alertasStock.length > 0 || pedidosUrgentes.length > 0 || pedidosRetrasados.length > 0) && (
          <div className="space-y-2">
            {alertasStock.length > 0 && (
              <div className="border-l-4 p-4 rounded-r-lg" style={{ backgroundColor: 'rgba(255, 102, 1, 0.1)', borderColor: COLORS.primary }}>
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 mt-0.5 mr-3" style={{ color: COLORS.primary }} />
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: COLORS.white }}>
                      {t.lowStock} ({alertasStock.length})
                    </h3>
                    <p className="text-xs mt-1" style={{ color: COLORS.gray[400] }}>
                      {alertasStock.map(p => `${p.nombre}: ${p.stock} unidades`).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pedidosUrgentes.length > 0 && (
              <div className="border-l-4 p-4 rounded-r-lg" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', borderColor: '#dc2626' }}>
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 mt-0.5 mr-3" style={{ color: '#dc2626' }} />
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: '#fecaca' }}>
                      {t.urgentOrder} ({pedidosUrgentes.length})
                    </h3>
                    <p className="text-xs mt-1" style={{ color: COLORS.gray[400] }}>
                      {pedidosUrgentes.map(p => `#${p.id.slice(-6)} - ${p.clienteNombre || p.clienteEmail}`).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pedidosRetrasados.length > 0 && (
              <div className="border-l-4 p-4 rounded-r-lg" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)', borderColor: '#ea580c' }}>
                <div className="flex items-start">
                  <Clock className="w-5 h-5 mt-0.5 mr-3" style={{ color: '#ea580c' }} />
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: '#fed7aa' }}>
                      {t.delayedOrder} ({pedidosRetrasados.length})
                    </h3>
                    <p className="text-xs mt-1" style={{ color: COLORS.gray[400] }}>
                      {pedidosRetrasados.map(p => `#${p.id.slice(-6)} - ${p.clienteNombre || p.clienteEmail}`).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ KPIS ============ */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-xl shadow-sm border p-6" style={{ borderColor: COLORS.gray[800] }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                  {t.todaySales}
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: COLORS.white }}>
                  {formatearMoneda(kpis.ventasHoy)}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 102, 1, 0.1)' }}>
                <DollarSign className="w-6 h-6" style={{ color: COLORS.primary }} />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl shadow-sm border p-6" style={{ borderColor: COLORS.gray[800] }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                  {t.monthSales}
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: COLORS.white }}>
                  {formatearMoneda(kpis.ventasMes)}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 102, 1, 0.1)' }}>
                <TrendingUp className="w-6 h-6" style={{ color: COLORS.primary }} />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl shadow-sm border p-6" style={{ borderColor: COLORS.gray[800] }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                  {t.pendingOrders}
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: COLORS.white }}>
                  {kpis.pendientes}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 102, 1, 0.1)' }}>
                <Clock className="w-6 h-6" style={{ color: COLORS.primary }} />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl shadow-sm border p-6" style={{ borderColor: COLORS.gray[800] }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                  {t.avgTicket}
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: COLORS.white }}>
                  {formatearMoneda(kpis.ticketPromedio)}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 102, 1, 0.1)' }}>
                <Users className="w-6 h-6" style={{ color: COLORS.primary }} />
              </div>
            </div>
          </div>
        </div>

        {/* ============ FILTROS ============ */}
        <div className="bg-gray-900 rounded-xl shadow-sm border p-4" style={{ borderColor: COLORS.gray[800] }}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.gray[400] }}>
                {t.search}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: COLORS.gray[500] }} />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value, pagina: 1 }))}
                  className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 outline-none text-sm bg-gray-800 text-white placeholder-gray-500"
                  style={{ borderColor: COLORS.gray[700] }}
                  suppressHydrationWarning
                />
                {filtros.busqueda && (
                  <button 
                    onClick={() => setFiltros(prev => ({ ...prev, busqueda: '', pagina: 1 }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-gray-300"
                    style={{ color: COLORS.gray[400] }}
                    suppressHydrationWarning
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.gray[400] }}>
                {t.status}
              </label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value as any, pagina: 1 }))}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 outline-none text-sm bg-gray-800 text-white"
                style={{ borderColor: COLORS.gray[700] }}
                suppressHydrationWarning
              >
                <option value="Todos">{t.allStatus}</option>
                {estadosDisponibles.map(estado => (
                  <option key={estado} value={estado}>{STATUS_CONFIG[estado].label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.gray[400] }}>
                {t.payment}
              </label>
              <select
                value={filtros.metodoPago}
                onChange={(e) => setFiltros(prev => ({ ...prev, metodoPago: e.target.value as any, pagina: 1 }))}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 outline-none text-sm bg-gray-800 text-white"
                style={{ borderColor: COLORS.gray[700] }}
                suppressHydrationWarning
              >
                <option value="Todos">{t.allPayments}</option>
                {Object.entries(METODO_PAGO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.gray[400] }}>
                {t.urgent}
              </label>
              <select
                value={filtros.urgente ? 'urgente' : 'todos'}
                onChange={(e) => setFiltros(prev => ({ ...prev, urgente: e.target.value === 'urgente', pagina: 1 }))}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 outline-none text-sm bg-gray-800 text-white"
                style={{ borderColor: COLORS.gray[700] }}
                suppressHydrationWarning
              >
                <option value="todos">{t.all}</option>
                <option value="urgente">{t.onlyUrgent}</option>
              </select>
            </div>
          </div>

          {(filtros.estado !== 'Todos' || filtros.metodoPago !== 'Todos' || filtros.busqueda || filtros.urgente) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: COLORS.gray[800] }}>
              <span className="text-xs" style={{ color: COLORS.gray[500] }}>{t.activeFilters}:</span>
              <button
                onClick={() => {
                  setFiltros({
                    estado: 'Todos',
                    busqueda: '',
                    metodoPago: 'Todos',
                    urgente: false,
                    archived: mostrarArchivados
                  });
                  setPagination(prev => ({ ...prev, pagina: 1 }));
                }}
                className="text-xs font-medium hover:underline"
                style={{ color: COLORS.primary }}
                suppressHydrationWarning
              >
                {t.clearAll}
              </button>
            </div>
          )}
        </div>

        {/* ============ TABLA DE PEDIDOS ============ */}
        <div className="bg-gray-900 rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: COLORS.gray[800] }}>
          {error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#dc2626' }} />
              <p className="font-medium mb-2" style={{ color: COLORS.white }}>{t.error}</p>
              <p className="text-sm mb-4" style={{ color: COLORS.gray[400] }}>{error}</p>
              <button
                onClick={() => cargarPedidos(mostrarArchivados)}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: COLORS.primary }}
                suppressHydrationWarning
              >
                {t.update}
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y" style={{ borderColor: COLORS.gray[800] }}>
                  <thead style={{ backgroundColor: COLORS.gray[800] }}>
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                        {t.orderId}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                        {t.customer}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                        {t.total}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                        {t.status}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                        {t.payment}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                        Envío
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.gray[400] }}>
                        {t.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 divide-y" style={{ borderColor: COLORS.gray[800] }}>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12">
                          <div className="flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: COLORS.primary }} />
                            <p className="text-sm" style={{ color: COLORS.gray[400] }}>{t.loading}...</p>
                          </div>
                        </td>
                      </tr>
                    ) : pedidosPaginados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12">
                          <div className="text-center">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: COLORS.gray[600] }} />
                            <p className="font-medium mb-1" style={{ color: COLORS.white }}>{t.noOrders}</p>
                            <p className="text-sm" style={{ color: COLORS.gray[400] }}>
                              {t.noResults}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pedidosPaginados.map((pedido) => {
                        const statusConfig = getStatusConfig(pedido.estado);
                        const StatusIcon = statusConfig.icon;
                        
                        return (
                          <tr key={pedido.id} className="hover:bg-gray-800 transition-colors" style={pedido.urgente ? { backgroundColor: 'rgba(220, 38, 38, 0.1)' } : {}}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-start gap-2">
                                {pedido.urgente && (
                                  <AlertCircle className="w-4 h-4 mt-0.5" style={{ color: '#dc2626' }} />
                                )}
                                <div>
                                  <div className="text-sm font-medium" style={{ color: COLORS.white }}>
                                    #{pedido.id.slice(-8).toUpperCase()}
                                  </div>
                                  <div className="text-xs mt-0.5" style={{ color: COLORS.gray[400] }}>
                                    {formatearFecha(pedido.fecha)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium" style={{ color: COLORS.white }}>
                                {pedido.clienteNombre || pedido.clienteEmail}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: COLORS.gray[400] }}>
                                {pedido.clienteRut && `${pedido.clienteRut}`}
                              </div>
                              {pedido.clienteTelefono && (
                                <div className="text-xs" style={{ color: COLORS.gray[400] }}>
                                  {pedido.clienteTelefono}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold" style={{ color: COLORS.white }}>
                                {formatearMoneda(pedido.total)}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: COLORS.gray[400] }}>
                                {pedido.items.length} {pedido.items.length === 1 ? t.product : t.products}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                                <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm" style={{ color: COLORS.white }}>
                                {METODO_PAGO_LABELS[pedido.metodoPago] || pedido.metodoPago}
                              </div>
                              {pedido.comprobanteUrl && (
                                <a
                                  href={pedido.comprobanteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-xs hover:underline mt-1"
                                  style={{ color: COLORS.primary }}
                                  suppressHydrationWarning
                                >
                                  <Upload className="w-3 h-3 mr-1" />
                                  {t.seeVoucher}
                                </a>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {(pedido.trackingNumber || pedido.guiaEnvio) ? (
                                <div>
                                  <div className="text-xs font-medium" style={{ color: COLORS.white }}>
                                    {pedido.courier || pedido.transportista}
                                  </div>
                                  <div className="text-xs" style={{ color: COLORS.gray[400] }}>
                                    {pedido.trackingNumber || pedido.guiaEnvio}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs" style={{ color: COLORS.gray[500] }}>
                                  {t.withoutTracking}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <select
                                  value={pedido.estado}
                                  onChange={(e) => actualizarEstado(pedido.id, e.target.value as OrderStatus)}
                                  disabled={actualizandoId === pedido.id || pedido.archived}
                                  className="text-xs border rounded-lg px-2 py-1.5 bg-gray-800 text-white focus:ring-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ borderColor: COLORS.gray[700] }}
                                  suppressHydrationWarning
                                >
                                  {estadosDisponibles.map(estado => (
                                    <option key={estado} value={estado}>{STATUS_CONFIG[estado].label}</option>
                                  ))}
                                </select>
                                
                                <button
                                  onClick={() => setPedidoSeleccionado(pedido)}
                                  className="p-2 rounded-lg transition-colors hover:bg-gray-700"
                                  style={{ color: COLORS.gray[400] }}
                                  title={t.details}
                                  suppressHydrationWarning
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => generarPDF(pedido)}
                                  className="p-2 rounded-lg transition-colors hover:bg-gray-700"
                                  style={{ color: COLORS.gray[400] }}
                                  title={t.generateInvoice}
                                  suppressHydrationWarning
                                >
                                  <FileDown className="w-4 h-4" />
                                </button>
                                
                                {!pedido.archived && (
                                  <button
                                    onClick={() => archivarPedido(pedido.id)}
                                    disabled={actualizandoId === pedido.id}
                                    className="p-2 rounded-lg transition-colors hover:bg-gray-700"
                                    style={{ color: COLORS.gray[400] }}
                                    title={t.archive}
                                    suppressHydrationWarning
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                )}
                                
                                {actualizandoId === pedido.id && (
                                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.primary }} />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {!loading && pedidosFiltrados.length > 0 && (
                <div className="bg-gray-900 px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: COLORS.gray[800] }}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm" style={{ color: COLORS.gray[400] }}>
                      Mostrando <span className="font-medium" style={{ color: COLORS.white }}>{(pagination.pagina - 1) * pagination.itemsPorPagina + 1}</span>
                      {' - '}
                      <span className="font-medium" style={{ color: COLORS.white }}>
                        {Math.min(pagination.pagina * pagination.itemsPorPagina, pedidosFiltrados.length)}
                      </span>
                      {' '}de <span className="font-medium" style={{ color: COLORS.white }}>{pedidosFiltrados.length}</span> {t.orders}
                    </p>
                    <select
                      value={pagination.itemsPorPagina}
                      onChange={(e) => setPagination({ pagina: 1, itemsPorPagina: Number(e.target.value), total: pedidosFiltrados.length })}
                      className="ml-4 text-sm border rounded-lg px-2 py-1 bg-gray-800 text-white focus:ring-2 outline-none"
                      style={{ borderColor: COLORS.gray[700] }}
                      suppressHydrationWarning
                    >
                      <option value={10}>10 por página</option>
                      <option value={25}>25 por página</option>
                      <option value={50}>50 por página</option>
                      <option value={100}>100 por página</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, pagina: Math.max(1, prev.pagina - 1) }))}
                      disabled={pagination.pagina === 1}
                      className="p-2 border rounded-lg bg-gray-800 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      style={{ borderColor: COLORS.gray[700], color: COLORS.white }}
                      suppressHydrationWarning
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="px-3 py-2 text-sm" style={{ color: COLORS.gray[400] }}>
                      Página {pagination.pagina} de {totalPaginas || 1}
                    </span>
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, pagina: Math.min(totalPaginas, prev.pagina + 1) }))}
                      disabled={pagination.pagina === totalPaginas || totalPaginas === 0}
                      className="p-2 border rounded-lg bg-gray-800 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      style={{ borderColor: COLORS.gray[700], color: COLORS.white }}
                      suppressHydrationWarning
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============ MODAL DE DETALLES ============ */}
      {pedidoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border" style={{ borderColor: COLORS.gray[800] }}>
            <div className="sticky top-0 bg-gray-900 border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: COLORS.gray[800] }}>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold" style={{ color: COLORS.white }}>
                  {t.details} #{pedidoSeleccionado.id.slice(-8).toUpperCase()}
                </h2>
                {pedidoSeleccionado.urgente && (
                  <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)', color: '#fecaca' }}>
                    {t.urgent}
                  </span>
                )}
              </div>
              <button
                onClick={() => setPedidoSeleccionado(null)}
                className="p-2 rounded-lg transition-colors hover:bg-gray-800"
                style={{ color: COLORS.gray[400] }}
                suppressHydrationWarning
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: COLORS.gray[400] }}>
                  {t.customer}
                </h3>
                <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: COLORS.gray[800] }}>
                  <p className="text-sm">
                    <span className="font-medium" style={{ color: COLORS.gray[400] }}>Email:</span>{' '}
                    <span style={{ color: COLORS.white }}>{pedidoSeleccionado.clienteEmail}</span>
                  </p>
                  {pedidoSeleccionado.clienteNombre && (
                    <p className="text-sm">
                      <span className="font-medium" style={{ color: COLORS.gray[400] }}>Nombre:</span>{' '}
                      <span style={{ color: COLORS.white }}>{pedidoSeleccionado.clienteNombre}</span>
                    </p>
                  )}
                  {pedidoSeleccionado.clienteRut && (
                    <p className="text-sm">
                      <span className="font-medium" style={{ color: COLORS.gray[400] }}>RUT:</span>{' '}
                      <span style={{ color: COLORS.white }}>{pedidoSeleccionado.clienteRut}</span>
                    </p>
                  )}
                  {pedidoSeleccionado.clienteTelefono && (
                    <p className="text-sm">
                      <span className="font-medium" style={{ color: COLORS.gray[400] }}>Teléfono:</span>{' '}
                      <span style={{ color: COLORS.white }}>{pedidoSeleccionado.clienteTelefono}</span>
                    </p>
                  )}
                  {pedidoSeleccionado.clienteDireccion && (
                    <p className="text-sm">
                      <span className="font-medium" style={{ color: COLORS.gray[400] }}>Dirección:</span>{' '}
                      <span style={{ color: COLORS.white }}>{pedidoSeleccionado.clienteDireccion}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: COLORS.gray[400] }}>
                  Envío y Logística
                </h3>
                <div className="rounded-lg p-4" style={{ backgroundColor: COLORS.gray[800] }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: COLORS.gray[400] }}>{t.courier}</label>
                      <select
                        value={pedidoSeleccionado.courier || ''}
                        onChange={(e) => {
                          const courier = e.target.value;
                          const tracking = window.prompt(t.enterTracking);
                          if (tracking) {
                            actualizarEnvio(pedidoSeleccionado.id, tracking, courier);
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-900 text-white focus:ring-2 outline-none"
                        style={{ borderColor: COLORS.gray[700] }}
                        suppressHydrationWarning
                      >
                        <option value="">{t.selectCourier}</option>
                        {COURIER_OPTIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: COLORS.gray[400] }}>{t.trackingNumber}</label>
                      <input
                        type="text"
                        value={pedidoSeleccionado.trackingNumber || pedidoSeleccionado.guiaEnvio || ''}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-900 text-white"
                        style={{ borderColor: COLORS.gray[700] }}
                        suppressHydrationWarning
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: COLORS.gray[400] }}>
                  Productos
                </h3>
                <div className="space-y-2">
                  {pedidoSeleccionado.items.map((item: any, index: number) => {
                    const producto = productos.find(p => p.id === item.id || p.sku === item.sku);
                    const stockSuficiente = producto ? producto.stock >= item.cantidad : true;
                    
                    return (
                      <div 
                        key={index} 
                        className="rounded-lg p-4 flex justify-between items-center"
                        style={{ 
                          backgroundColor: COLORS.gray[800],
                          border: !stockSuficiente ? '1px solid #dc2626' : 'none'
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: COLORS.white }}>{item.nombre || 'Producto sin nombre'}</p>
                          <p className="text-xs mt-0.5" style={{ color: COLORS.gray[400] }}>
                            {t.sku}: {item.sku || 'N/A'} | {t.quantity}: {item.cantidad}
                          </p>
                          {producto && (
                            <p 
                              className="text-xs mt-1"
                              style={{ color: producto.stock <= producto.stockMinimo ? '#f87171' : COLORS.gray[400] }}
                            >
                              {t.availableStock}: {producto.stock} {t.products}
                              {!stockSuficiente && ` ⚠️ ${t.insufficientStock}`}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold" style={{ color: COLORS.white }}>
                          {formatearMoneda((item.precio || 0) * (item.cantidad || 1))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {pedidoSeleccionado.historialEstados && pedidoSeleccionado.historialEstados.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: COLORS.gray[400] }}>
                    {t.orderHistory}
                  </h3>
                  <div className="rounded-lg p-4" style={{ backgroundColor: COLORS.gray[800] }}>
                    <div className="space-y-3">
                      {pedidoSeleccionado.historialEstados.map((historial, index) => {
                        const config = getStatusConfig(historial.estado);
                        const Icon = config.icon;
                        return (
                          <div key={index} className="flex items-start gap-3">
                            <div className={`p-1 rounded-lg ${config.bgColor}`}>
                              <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: COLORS.white }}>{config.label}</p>
                              <p className="text-xs" style={{ color: COLORS.gray[400] }}>
                                {formatearFecha(historial.fecha)}
                                {historial.usuario && ` ${t.by} ${historial.usuario}`}
                              </p>
                              {historial.nota && (
                                <p className="text-xs mt-1" style={{ color: COLORS.gray[400] }}>{historial.nota}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: COLORS.gray[400] }}>
                  Resumen
                </h3>
                <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: COLORS.gray[800] }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: COLORS.gray[400] }}>{t.subtotal}:</span>
                    <span className="font-medium" style={{ color: COLORS.white }}>
                      {formatearMoneda(pedidoSeleccionado.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: COLORS.gray[400] }}>{t.payment}:</span>
                    <span className="font-medium" style={{ color: COLORS.white }}>
                      {METODO_PAGO_LABELS[pedidoSeleccionado.metodoPago] || pedidoSeleccionado.metodoPago}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: COLORS.gray[400] }}>{t.status}:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getStatusConfig(pedidoSeleccionado.estado).bgColor} ${getStatusConfig(pedidoSeleccionado.estado).color}`}>
                      {getStatusConfig(pedidoSeleccionado.estado).label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-gray-900 border-t px-6 py-4 flex justify-end gap-3" style={{ borderColor: COLORS.gray[800] }}>
              <button
                onClick={() => generarPDF(pedidoSeleccionado)}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: COLORS.primary }}
                suppressHydrationWarning
              >
                {t.generateInvoice}
              </button>
              <button
                onClick={() => setPedidoSeleccionado(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                style={{ backgroundColor: COLORS.gray[800], color: COLORS.white }}
                suppressHydrationWarning
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}