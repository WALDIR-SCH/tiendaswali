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
  Receipt, MapPin, Building, Hash, TrendingUp, History, MessageCircle,
  Upload, Bell, Filter, DollarSign, CalendarDays, Shield, Sun,
  X, FileSpreadsheet, Image as ImageIcon, Star, Camera, Send, Heart
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Componente de calificación con estrellas
const StarRating = ({ 
  rating, 
  setRating,
  readonly = false,
  size = 24 
}: { 
  rating: number; 
  setRating?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && setRating && setRating(star)}
          className={`transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
          disabled={readonly}
        >
          <Star 
            size={size} 
            className={rating >= star ? "text-amber-400 fill-amber-400" : "text-gray-600"}
          />
        </button>
      ))}
    </div>
  );
};

export default function MisPedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [expandedPedido, setExpandedPedido] = useState<string | null>(null);
  const [mostrarTrazabilidad, setMostrarTrazabilidad] = useState<string | null>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  
  // 🔥 ESTADOS PARA EL MODAL DE OPINIÓN
  const [modalOpinionAbierto, setModalOpinionAbierto] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [imagenesReseña, setImagenesReseña] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [enviandoReseña, setEnviandoReseña] = useState(false);
  
  // Filtros avanzados
  const [filtrosAvanzados, setFiltrosAvanzados] = useState({
    fechaInicio: '',
    fechaFin: '',
    montoMin: '',
    montoMax: '',
    transportista: '',
    tipoComprobante: ''
  });

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        document.body.style.overflow = 'auto';
        document.body.classList.remove('overflow-hidden');

        const q = query(
          collection(db, "pedidos"),
          where("clienteId", "==", user.uid)
        );

        const unsubscribeSnap = onSnapshot(q, 
          (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            docs.sort((a: any, b: any) => {
              const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(0);
              const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(0);
              return fechaB.getTime() - fechaA.getTime();
            });
            
            setPedidos(docs);
            generarNotificaciones(docs);
            setLoading(false);
          },
          (error) => {
            console.error("Error:", error);
            setLoading(false);
          }
        );

        return () => unsubscribeSnap();
      } else {
        setPedidos([]);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // Generar notificaciones en vivo
  const generarNotificaciones = (pedidos: any[]) => {
    const nuevasNotificaciones: any[] = [];
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    pedidos.forEach(pedido => {
      const fechaPedido = pedido.fecha?.toDate();
      
      if (fechaPedido && fechaPedido > ayer) {
        nuevasNotificaciones.push({
          id: `nuevo-${pedido.id}`,
          pedidoId: pedido.id,
          mensaje: `Nuevo pedido #${pedido.numeroPedido || pedido.id.slice(0, 8)}`,
          tipo: 'nuevo',
          fecha: fechaPedido,
          leida: false
        });
      }

      if (pedido.estado === 'En Proceso' && fechaPedido) {
        const diasProceso = Math.floor((hoy.getTime() - fechaPedido.getTime()) / (1000 * 60 * 60 * 24));
        if (diasProceso >= 2) {
          nuevasNotificaciones.push({
            id: `retraso-${pedido.id}`,
            pedidoId: pedido.id,
            mensaje: `Pedido #${pedido.numeroPedido || pedido.id.slice(0, 8)} en proceso por ${diasProceso} días`,
            tipo: 'retraso',
            fecha: hoy,
            leida: false
          });
        }
      }

      if (pedido.estado === 'Enviado' && pedido.fechaEnvio?.toDate) {
        const fechaEnvio = pedido.fechaEnvio.toDate();
        if (fechaEnvio > ayer) {
          nuevasNotificaciones.push({
            id: `enviado-${pedido.id}`,
            pedidoId: pedido.id,
            mensaje: `Pedido #${pedido.numeroPedido || pedido.id.slice(0, 8)} ha sido enviado`,
            tipo: 'envio',
            fecha: fechaEnvio,
            leida: false
          });
        }
      }
    });

    setNotificaciones(nuevasNotificaciones);
  };

  // ✅ FUNCIÓN PARA SUBIR IMÁGENES A CLOUDINARY
  const subirImagenACloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset) {
      throw new Error('Configuración de Cloudinary no encontrada');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'reseñas_productos');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('Error al subir imagen');
    }

    return data.secure_url;
  };

  // ✅ FUNCIÓN PARA ENVIAR RESEÑA
  const enviarReseña = async () => {
    if (!pedidoSeleccionado || !productoSeleccionado || !comentario.trim()) {
      alert('Debes escribir un comentario');
      return;
    }

    setEnviandoReseña(true);
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No hay usuario autenticado');

      // Subir imágenes si hay
      const imagenesUrls: string[] = [];
      for (const file of imagenesReseña) {
        const url = await subirImagenACloudinary(file);
        imagenesUrls.push(url);
      }

      // Guardar reseña en Firestore
      const reseñaRef = await addDoc(
        collection(db, "productos", productoSeleccionado.id, "reseñas"), 
        {
          usuario: user.displayName || user.email?.split('@')[0] || "Usuario",
          usuarioEmail: user.email,
          usuarioId: user.uid,
          usuarioFoto: user.photoURL || null,
          comentario: comentario.trim(),
          rating: puntuacion,
          imagenes: imagenesUrls,
          fecha: serverTimestamp(),
          verificado: true, // El cliente está verificado porque compró el producto
          util: 0,
          pedidoId: pedidoSeleccionado.id
        }
      );

      // Actualizar contador de reseñas del producto
      const productoRef = doc(db, "productos", productoSeleccionado.id);
      await updateDoc(productoRef, {
        total_resenas: increment(1),
        rating_promedio: increment(puntuacion) // Esto se recalculará después
      });

      // Marcar en el pedido que ya se calificó este producto
      const pedidoRef = doc(db, "pedidos", pedidoSeleccionado.id);
      const productosCalificados = pedidoSeleccionado.productosCalificados || [];
      
      await updateDoc(pedidoRef, {
        productosCalificados: [...productosCalificados, productoSeleccionado.id]
      });

      // Cerrar modal y limpiar
      alert('✅ ¡Gracias por tu opinión!');
      setModalOpinionAbierto(false);
      setPedidoSeleccionado(null);
      setProductoSeleccionado(null);
      setPuntuacion(5);
      setComentario('');
      setImagenesReseña([]);
      setPreviewImages([]);

    } catch (error) {
      console.error("Error al enviar reseña:", error);
      alert('❌ Error al enviar la reseña');
    } finally {
      setEnviandoReseña(false);
    }
  };

  // ✅ MANEJO DE IMÁGENES PARA LA RESEÑA
  const handleImagenesReseña = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + imagenesReseña.length > 4) {
      alert("Máximo 4 fotos");
      return;
    }
    
    const nuevasImagenes: File[] = [];
    const nuevosPreviews: string[] = [];
    
    for (const file of files) {
      if (file.size > 3 * 1024 * 1024) {
        alert(`La imagen "${file.name}" es muy grande. Máximo 3MB.`);
        continue;
      }
      
      nuevasImagenes.push(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        nuevosPreviews.push(reader.result as string);
        setPreviewImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
    
    setImagenesReseña(prev => [...prev, ...nuevasImagenes]);
  };

  const eliminarImagenPreview = (index: number) => {
    setImagenesReseña(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ CALCULAR DÍAS PROMEDIO DE ENTREGA
  const diasPromedioEntrega = useMemo(() => {
    const pedidosEntregados = pedidos.filter(p => 
      p.estado === 'ENTREGADO' && 
      p.fecha?.toDate && 
      p.fechaEntrega?.toDate
    );

    if (pedidosEntregados.length === 0) return 0;

    const totalDias = pedidosEntregados.reduce((sum, p) => {
      const fechaPedido = p.fecha.toDate();
      const fechaEntrega = p.fechaEntrega.toDate();
      const dias = Math.ceil((fechaEntrega - fechaPedido) / (1000 * 60 * 60 * 24));
      return sum + dias;
    }, 0);

    return Math.round(totalDias / pedidosEntregados.length);
  }, [pedidos]);

  // Obtener transportistas únicos
  const transportistasUnicos = useMemo(() => {
    const transportistas = pedidos
      .map(p => p.Transportista || p.transportista)
      .filter((t, i, arr) => t && arr.indexOf(t) === i);
    return transportistas;
  }, [pedidos]);

  const getEstadoInfo = (estado: string) => {
    if (!estado) estado = 'PENDIENTE';
    
    const estadoLower = estado.toLowerCase();
    
    const estados: any = {
      pendiente: { icon: Clock, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Pendiente' },
      pagado: { icon: CheckCircle, color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Pagado' },
      enproceso: { icon: Package, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'En Proceso' },
      enviado: { icon: Truck, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', label: 'Enviado' },
      entregado: { icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Entregado' },
      cancelado: { icon: AlertCircle, color: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Cancelado' }
    };
    
    if (estadoLower === 'pendiente') return estados.pendiente;
    if (estadoLower === 'pagado') return estados.pagado;
    if (estadoLower === 'en proceso' || estadoLower === 'enproceso' || estadoLower === 'proceso') return estados.enproceso;
    if (estadoLower === 'enviado') return estados.enviado;
    if (estadoLower === 'entregado') return estados.entregado;
    if (estadoLower === 'cancelado') return estados.cancelado;
    
    return estados.pendiente;
  };

  const pedidosFiltrados = pedidos.filter((p: any) => {
    const estadoPedido = (p.estado || 'PENDIENTE').toLowerCase();
    
    if (filtroEstado !== 'todos') {
      let filtroLower = filtroEstado.toLowerCase();
      if (filtroLower === 'enproceso' || filtroLower === 'en proceso') {
        filtroLower = 'enproceso';
        if (!estadoPedido.includes('proceso')) return false;
      } else if (estadoPedido !== filtroLower) {
        return false;
      }
    }

    if (mostrarFiltrosAvanzados) {
      if (filtrosAvanzados.fechaInicio) {
        const fechaPedido = p.fecha?.toDate();
        const fechaInicio = new Date(filtrosAvanzados.fechaInicio);
        if (fechaPedido && fechaPedido < fechaInicio) return false;
      }
      if (filtrosAvanzados.fechaFin) {
        const fechaPedido = p.fecha?.toDate();
        const fechaFin = new Date(filtrosAvanzados.fechaFin);
        fechaFin.setHours(23, 59, 59);
        if (fechaPedido && fechaPedido > fechaFin) return false;
      }
      if (filtrosAvanzados.montoMin && (p.total || 0) < Number(filtrosAvanzados.montoMin)) return false;
      if (filtrosAvanzados.montoMax && (p.total || 0) > Number(filtrosAvanzados.montoMax)) return false;
      
      const transportistaValue = p.Transportista || p.transportista;
      if (filtrosAvanzados.transportista && transportistaValue !== filtrosAvanzados.transportista) return false;
      
      if (filtrosAvanzados.tipoComprobante && p.tipoComprobante !== filtrosAvanzados.tipoComprobante) return false;
    }
    
    if (busqueda) {
      const term = busqueda.toLowerCase();
      const matchNumero = p.numeroPedido?.toLowerCase().includes(term);
      const matchRUC = p.datosEnvio?.ruc?.toLowerCase().includes(term);
      const matchItems = p.items?.some((item: any) => 
        item?.nombre?.toLowerCase().includes(term)
      );
      const matchId = p.id.toLowerCase().includes(term);
      
      const matchGuia = (p.GuiaEnvio || p.guiaEnvio || '')?.toLowerCase().includes(term);
      const matchComprobante = p.numeroComprobante?.toLowerCase().includes(term);
      
      return matchNumero || matchItems || matchId || matchRUC || matchGuia || matchComprobante;
    }
    
    return true;
  });

  // Marcar notificación como leída
  const marcarNotificacionLeida = (id: string) => {
    setNotificaciones(prev => 
      prev.map(not => not.id === id ? { ...not, leida: true } : not)
    );
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const datosExportar = pedidosFiltrados.map(p => ({
      'N° Pedido': p.numeroPedido || p.id.slice(0, 8),
      'Fecha': p.fecha?.toDate ? formatFechaSimple(p.fecha) : '',
      'RUC': p.datosEnvio?.ruc || '',
      'Razón Social': p.datosEnvio?.razonSocial || '',
      'Estado': p.estado || '',
      'Base Imponible': p.total ? (p.total / 1.18).toFixed(2) : '0.00',
      'IGV (18%)': p.total ? (p.total * 0.18 / 1.18).toFixed(2) : '0.00',
      'Total': p.total?.toFixed(2) || '0.00',
      'Condición': p.plazoCredito || 'Contado',
      'Comprobante': p.tipoComprobante || '',
      'N° Comprobante': p.numeroComprobante || '',
      'Guía': p.GuiaEnvio || p.guiaEnvio || '',
      'Transportista': p.Transportista || p.transportista || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExportar);
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `pedidos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatFecha = (fecha: any) => {
    if (!fecha?.toDate) return 'Fecha no disponible';
    const date = fecha.toDate();
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFechaSimple = (fecha: any) => {
    if (!fecha?.toDate) return 'Fecha no disponible';
    const date = fecha.toDate();
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const calcularDiasCredito = (fechaPedido: any, plazoCredito: string) => {
    if (!fechaPedido?.toDate || !plazoCredito) return null;
    
    const fecha = fechaPedido.toDate();
    const hoy = new Date();
    let diasPlazo = 0;
    
    if (plazoCredito.includes('30')) diasPlazo = 30;
    else if (plazoCredito.includes('60')) diasPlazo = 60;
    else if (plazoCredito.includes('15')) diasPlazo = 15;
    else if (plazoCredito.includes('7')) diasPlazo = 7;
    
    const fechaVencimiento = new Date(fecha);
    fechaVencimiento.setDate(fecha.getDate() + diasPlazo);
    
    const diasRestantes = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
      fechaVencimiento,
      vencido: diasRestantes < 0
    };
  };

  const calcularIGV = (monto: number) => {
    const IGV = 0.18;
    const base = monto / (1 + IGV);
    return {
      base: base.toFixed(2),
      igv: (base * IGV).toFixed(2),
      total: monto.toFixed(2)
    };
  };

  const verEstadoSUNAT = (comprobante: any) => {
    if (!comprobante) {
      alert('Este pedido aún no tiene comprobante electrónico');
      return;
    }

    let mensaje = '';
    switch(comprobante.estadoSUNAT) {
      case 'Aceptado':
        mensaje = `✅ Comprobante ACEPTADO por SUNAT\n`;
        mensaje += `📄 Serie: ${comprobante.serie}\n`;
        mensaje += `🔢 Número: ${comprobante.numero}\n`;
        mensaje += `📅 Fecha: ${formatFechaSimple(comprobante.fechaEmision)}\n`;
        mensaje += `🔑 Código CDR: ${comprobante.cdrCodigo || 'N/A'}`;
        break;
      case 'Rechazado':
        mensaje = `❌ Comprobante RECHAZADO por SUNAT\n`;
        mensaje += `⚠️ Observación: ${comprobante.observacionSUNAT || 'Sin detalle'}`;
        break;
      case 'De baja':
        mensaje = `🔄 Comprobante DADO DE BAJA\n`;
        mensaje += `📅 Fecha: ${formatFechaSimple(comprobante.fechaBaja)}`;
        break;
      default:
        mensaje = `⏳ Comprobante en proceso de envío a SUNAT`;
    }
    
    alert(mensaje);
  };

  const generarOrdenCompraPDF = (pedido: any) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text("ORDEN DE COMPRA", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("TU EMPRESA S.A.C.", 20, 35);
    doc.text("RUC: 20123456789", 20, 40);
    doc.text("Av. Ejemplo 123 - Lima, Perú", 20, 45);
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("DATOS DEL CLIENTE:", 20, 60);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Razón Social: ${pedido.datosEnvio?.razonSocial || 'N/A'}`, 20, 70);
    doc.text(`RUC: ${pedido.datosEnvio?.ruc || 'N/A'}`, 20, 75);
    doc.text(`Dirección: ${pedido.datosEnvio?.direccion || 'N/A'}`, 20, 80);
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("DATOS DEL PEDIDO:", 120, 60);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`N° Pedido: ${pedido.numeroPedido || pedido.id.slice(0, 8).toUpperCase()}`, 120, 70);
    doc.text(`Fecha: ${formatFechaSimple(pedido.fecha)}`, 120, 75);
    doc.text(`Condición: ${pedido.plazoCredito || 'Contado'}`, 120, 80);
    
    const tableColumn = ["Producto", "Cantidad", "Precio Unit.", "Total"];
    const tableRows = pedido.items?.map((item: any) => [
      item.nombre,
      item.cantidad,
      `S/ ${(item.precioBase || 0).toFixed(2)}`,
      `S/ ${((item.precioBase || 0) * (item.cantidad || 1)).toFixed(2)}`
    ]) || [];
    
    autoTable(doc, {
      startY: 95,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: 255 },
      styles: { fontSize: 9 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const calculo = calcularIGV(pedido.total || 0);
    
    doc.text(`Subtotal: S/ ${calculo.base}`, 140, finalY);
    doc.text(`IGV (18%): S/ ${calculo.igv}`, 140, finalY + 5);
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text(`TOTAL: S/ ${calculo.total}`, 140, finalY + 15);
    
    doc.text("Observaciones:", 20, finalY + 30);
    doc.text(pedido.observaciones || "Sin observaciones", 20, finalY + 40);
    
    doc.save(`orden-compra-${pedido.numeroPedido || pedido.id.slice(0, 8)}.pdf`);
  };

  const contactarWhatsApp = (pedido: any) => {
    const numero = "+51999999999";
    const mensaje = `Hola, tengo una consulta sobre mi pedido #${pedido.numeroPedido || pedido.id.slice(0, 8).toUpperCase()}`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // Ver guía de remisión
  const verGuiaRemision = (guia: string, transportista?: string) => {
    let url = '';
    const transportistaValue = transportista || '';
    const transportistaLower = transportistaValue.toLowerCase();
    
    switch(true) {
      case transportistaLower.includes('olva'):
        url = `https://www.olvacourier.com/seguimiento/envios?guia=${guia}`;
        break;
      case transportistaLower.includes('shalom'):
        url = `https://www.shalom.com.pe/tracking/${guia}`;
        break;
      case transportistaLower === 'dhl' || transportistaLower.includes('dhl'):
        url = `https://www.dhl.com/pe-es/home/tracking.html?tracking-id=${guia}`;
        break;
      case transportistaLower.includes('fedex'):
        url = `https://www.fedex.com/apps/fedextrack/?tracknumbers=${guia}`;
        break;
      case transportistaLower.includes('servientrega'):
        url = `https://www.servientrega.com.pe/rastreo/consulta?guias=${guia}`;
        break;
      case transportistaLower.includes('puma') || transportistaLower.includes('el puma'):
        url = `https://www.elpuma.com.pe/seguimiento?guia=${guia}`;
        break;
      case transportistaLower.includes('cargo'):
        url = `https://www.cargoexpreso.com/tracking/${guia}`;
        break;
      default:
        alert(`📦 NÚMERO DE GUÍA: ${guia}\n🚚 TRANSPORTISTA: ${transportistaValue || 'No especificado'}\n\n🔗 Tracking: https://www.google.com/search?q=${encodeURIComponent(transportistaValue + ' ' + guia)}`);
        return;
    }
    
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-8 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header con notificaciones */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Mis Pedidos</h1>
            <p className="text-gray-400">
              {pedidos.length} pedidos encontrados • {pedidosFiltrados.length} mostrados
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Días promedio de entrega */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-400" />
              <div>
                <p className="text-xs text-gray-400">Entrega promedio</p>
                <p className="text-sm font-bold text-white">
                  {diasPromedioEntrega > 0 ? `${diasPromedioEntrega} días` : 'Sin datos'}
                </p>
              </div>
            </div>

            {/* Notificaciones */}
            <div className="relative">
              <button
                onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
                className="relative p-3 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Bell size={20} className="text-gray-400" />
                {notificaciones.filter(n => !n.leida).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {notificaciones.filter(n => !n.leida).length}
                  </span>
                )}
              </button>

              {mostrarNotificaciones && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50">
                  <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="font-bold text-white">Notificaciones</h3>
                    <button 
                      onClick={() => setMostrarNotificaciones(false)}
                      className="text-gray-500 hover:text-gray-400"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificaciones.length === 0 ? (
                      <p className="text-sm text-gray-500 p-4 text-center">No hay notificaciones</p>
                    ) : (
                      notificaciones.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer ${
                            notif.leida ? 'opacity-50' : ''
                          }`}
                          onClick={() => {
                            marcarNotificacionLeida(notif.id);
                            setExpandedPedido(notif.pedidoId);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {notif.tipo === 'nuevo' && <Package size={16} className="text-green-500 mt-1" />}
                            {notif.tipo === 'retraso' && <AlertCircle size={16} className="text-orange-500 mt-1" />}
                            {notif.tipo === 'envio' && <Truck size={16} className="text-blue-500 mt-1" />}
                            <div className="flex-1">
                              <p className="text-sm text-white">{notif.mensaje}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatFechaSimple(notif.fecha)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Buscar por ID, RUC, producto, guía o comprobante..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  mostrarFiltrosAvanzados
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
                }`}
              >
                <Filter size={16} />
                Filtros
              </button>
              
              <button
                onClick={exportarExcel}
                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm font-medium text-green-400 transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
            </div>
          </div>

          {/* Filtros avanzados */}
          {mostrarFiltrosAvanzados && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={filtrosAvanzados.fechaInicio}
                    onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, fechaInicio: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={filtrosAvanzados.fechaFin}
                    onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, fechaFin: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Monto Mínimo (S/)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filtrosAvanzados.montoMin}
                    onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, montoMin: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Monto Máximo (S/)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filtrosAvanzados.montoMax}
                    onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, montoMax: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Transportista</label>
                  <select
                    value={filtrosAvanzados.transportista}
                    onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, transportista: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {transportistasUnicos.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo Comprobante</label>
                  <select
                    value={filtrosAvanzados.tipoComprobante}
                    onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, tipoComprobante: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="Factura">Factura</option>
                    <option value="Boleta">Boleta</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setFiltrosAvanzados({
                      fechaInicio: '',
                      fechaFin: '',
                      montoMin: '',
                      montoMax: '',
                      transportista: '',
                      tipoComprobante: ''
                    });
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}

          {/* Filtros por estado */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['todos', 'pendiente', 'pagado', 'enproceso', 'enviado', 'entregado', 'cancelado'].map((estado) => {
              const info = getEstadoInfo(estado);
              const count = estado === 'todos' 
                ? pedidos.length 
                : pedidos.filter(p => {
                    const estadoPedido = (p.estado || 'PENDIENTE').toLowerCase();
                    if (estado === 'enproceso') {
                      return estadoPedido.includes('proceso');
                    }
                    return estadoPedido === estado.toLowerCase();
                  }).length;
              
              return (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(estado)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                    filtroEstado === estado
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
                  }`}
                >
                  <span>{estado === 'todos' ? 'Todos' : info.label}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    filtroEstado === estado ? 'bg-blue-700' : 'bg-gray-800'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumen de Pedidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-blue-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pedidos Totales</p>
                <p className="text-2xl font-bold text-white">{pedidos.length}</p>
              </div>
              <Package className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-green-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Monto Total</p>
                <p className="text-2xl font-bold text-white">
                  S/ {pedidos.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pedidos Activos</p>
                <p className="text-2xl font-bold text-white">
                  {pedidos.filter(p => {
                    const estado = (p.estado || '').toLowerCase();
                    return !['entregado', 'cancelado'].includes(estado);
                  }).length}
                </p>
              </div>
              <Truck className="text-purple-500" size={24} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-yellow-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Crédito Pendiente</p>
                <p className="text-2xl font-bold text-white">
                  S/ {pedidos
                    .filter(p => p.plazoCredito && p.estado !== 'pagado' && p.estado !== 'cancelado')
                    .reduce((sum, p) => sum + (p.total || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
              <CreditCard className="text-yellow-500" size={24} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-emerald-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Entrega Promedio</p>
                <p className="text-2xl font-bold text-white">
                  {diasPromedioEntrega > 0 ? `${diasPromedioEntrega} días` : 'Sin datos'}
                </p>
              </div>
              <CalendarDays className="text-emerald-500" size={24} />
            </div>
          </div>
        </div>

        {/* Lista de Pedidos */}
        {pedidosFiltrados.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Package className="mx-auto text-gray-700 mb-4" size={48} />
            <h3 className="text-xl text-white mb-2">No hay pedidos</h3>
            <p className="text-gray-400">
              {busqueda 
                ? `No se encontraron resultados para "${busqueda}"`
                : filtroEstado !== 'todos'
                ? `No hay pedidos con estado "${getEstadoInfo(filtroEstado).label}"`
                : 'Aún no tienes pedidos registrados'}
            </p>
            <Link 
              href="/catalogo" 
              className="inline-block mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Ir al Catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidosFiltrados.map((pedido: any) => {
              const estadoPedido = pedido.estado || 'PENDIENTE';
              const EstadoIcon = getEstadoInfo(estadoPedido).icon;
              const infoEstado = getEstadoInfo(estadoPedido);
              const isExpanded = expandedPedido === pedido.id;
              const mostrarTraza = mostrarTrazabilidad === pedido.id;
              const creditoInfo = calcularDiasCredito(pedido.fecha, pedido.plazoCredito);
              const calculoIGV = calcularIGV(pedido.total || 0);
              
              const transportistaValue = pedido.Transportista || pedido.transportista;
              const guiaValue = pedido.GuiaEnvio || pedido.guiaEnvio;
              const productosCalificados = pedido.productosCalificados || [];
              
              return (
                <div key={pedido.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors group">
                  <div className="p-6">
                    {/* Encabezado con badge de nuevo */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border ${infoEstado.color}`}>
                            <EstadoIcon size={14} />
                            {infoEstado.label}
                          </span>
                          <span className="text-sm text-gray-400">
                            {formatFecha(pedido.fecha)}
                          </span>
                          {pedido.tipoComprobante && (
                            <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300 flex items-center gap-1">
                              <Receipt size={12} />
                              {pedido.tipoComprobante}
                            </span>
                          )}
                          {pedido.fecha?.toDate && 
                            (new Date().getTime() - pedido.fecha.toDate().getTime()) < 86400000 && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold flex items-center gap-1">
                              <Bell size={10} />
                              NUEVO
                            </span>
                          )}
                        </div>
                        
                        <div className="mb-4">
                          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <Hash size={16} className="text-gray-500" />
                            Pedido #{pedido.numeroPedido || pedido.id.slice(0, 8).toUpperCase()}
                          </h3>
                          
                          <div className="flex flex-wrap items-center gap-3 text-gray-400">
                            <span className="flex items-center gap-1">
                              <Package size={14} />
                              {pedido.items?.length || 0} productos
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className="flex items-center gap-1">
                              <CreditCard size={14} />
                              {pedido.plazoCredito || 'Contado'}
                            </span>
                            
                            {transportistaValue && (
                              <>
                                <span className="text-gray-600">•</span>
                                <span className="flex items-center gap-1">
                                  <Truck size={14} />
                                  {transportistaValue}
                                </span>
                              </>
                            )}
                            
                            {guiaValue && (
                              <>
                                <span className="text-gray-600">•</span>
                                <span className="flex items-center gap-1 text-blue-400">
                                  <FileText size={14} />
                                  Guía: {guiaValue}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* RUC y Razón Social */}
                        {pedido.datosEnvio?.ruc && (
                          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700 inline-block">
                            <div className="flex items-center gap-3">
                              <Building size={16} className="text-gray-500" />
                              <span className="text-sm text-white font-medium">{pedido.datosEnvio.razonSocial}</span>
                              <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                                RUC: {pedido.datosEnvio.ruc}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Crédito aprobado */}
                        {pedido.plazoCredito && creditoInfo && (
                          <div className="mb-4 flex items-center gap-3">
                            <div className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                              creditoInfo.vencido 
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                : creditoInfo.diasRestantes <= 5 
                                ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                : 'bg-green-500/10 text-green-500 border border-green-500/20'
                            }`}>
                              <Calendar size={14} />
                              {creditoInfo.vencido 
                                ? 'CRÉDITO VENCIDO' 
                                : `${creditoInfo.diasRestantes} días de plazo restante`}
                            </div>
                            <span className="text-xs text-gray-500">
                              Vence: {formatFechaSimple(creditoInfo.fechaVencimiento)}
                            </span>
                          </div>
                        )}
                        
                        {/* Productos mini */}
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {pedido.items?.slice(0, 5).map((item: any, index: number) => (
                              <div key={index} className="w-10 h-10 rounded-lg border-2 border-gray-950 overflow-hidden bg-gray-800">
                                {item.imagenUrl ? (
                                  <img 
                                    src={item.imagenUrl} 
                                    alt={item.nombre}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package size={14} className="text-gray-400" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {pedido.items?.length > 5 && (
                            <span className="text-sm text-gray-500">
                              +{pedido.items.length - 5} más
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Lado derecho con total y acciones */}
                      <div className="lg:w-72 flex flex-col items-end gap-3">
                        <div className="text-right w-full">
                          <p className="text-sm text-gray-400 mb-1">Total del pedido</p>
                          <p className="text-2xl font-bold text-white">
                            S/ {pedido.total ? pedido.total.toLocaleString() : '0'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            IGV: S/ {calculoIGV.igv}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setExpandedPedido(isExpanded ? null : pedido.id)}
                              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
                            >
                              <Eye size={16} />
                              {isExpanded ? 'Ocultar' : 'Detalles'}
                            </button>
                            <button 
                              onClick={() => generarOrdenCompraPDF(pedido)}
                              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                          
                          <div className="flex gap-2">
                            {/* Botón de Guía */}
                            {guiaValue && (
                              <button 
                                onClick={() => verGuiaRemision(guiaValue, transportistaValue)}
                                className="flex-1 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm font-medium text-purple-400 transition-colors flex items-center justify-center gap-2"
                              >
                                <FileText size={16} />
                                Ver Guía
                              </button>
                            )}
                            <button 
                              onClick={() => contactarWhatsApp(pedido)}
                              className="flex-1 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm font-medium text-green-400 transition-colors flex items-center justify-center gap-2"
                            >
                              <MessageCircle size={16} />
                              Asesor
                            </button>
                          </div>

                          {/* 🔥 BOTÓN "DAR MI OPINIÓN" - SOLO SI ESTADO ES ENTREGADO */}
                          {estadoPedido.toLowerCase() === 'entregado' && (
                            <div className="w-full">
                              <button
                                onClick={() => {
                                  if (pedido.items && pedido.items.length > 0) {
                                    // Si hay varios productos, mostramos selector
                                    if (pedido.items.length === 1) {
                                      setProductoSeleccionado(pedido.items[0]);
                                    }
                                    setPedidoSeleccionado(pedido);
                                    setModalOpinionAbierto(true);
                                  }
                                }}
                                className="w-full py-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 rounded-lg text-sm font-medium text-amber-400 transition-colors flex items-center justify-center gap-2"
                              >
                                <Star size={16} />
                                {pedido.items && pedido.items.length > 1 ? 'Calificar productos' : 'Dar mi opinión'}
                              </button>
                              
                              {/* Mostrar productos ya calificados */}
                              {productosCalificados.length > 0 && (
                                <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-1">
                                  {pedido.items?.map((item: any) => (
                                    <span 
                                      key={item.id} 
                                      className={`px-2 py-1 rounded ${
                                        productosCalificados.includes(item.id) 
                                          ? 'bg-green-500/20 text-green-400' 
                                          : 'bg-gray-800 text-gray-400'
                                      }`}
                                    >
                                      {item.nombre.slice(0, 15)}...
                                      {productosCalificados.includes(item.id) && ' ✓'}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <button 
                            onClick={() => setMostrarTrazabilidad(mostrarTraza ? null : pedido.id)}
                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-end gap-1"
                          >
                            <History size={12} />
                            Ver trazabilidad
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Trazabilidad de estados */}
                    {mostrarTraza && (
                      <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                          <History size={14} />
                          Historial de cambios de estado
                        </h4>
                        <div className="space-y-2">
                          {pedido.historialEstados?.map((historial: any, index: number) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-gray-400">{formatFecha(historial.fecha)}</span>
                              <span className="text-white font-medium">{historial.estado}</span>
                              {historial.usuario && (
                                <span className="text-xs text-gray-500">por: {historial.usuario}</span>
                              )}
                            </div>
                          ))}
                          {!pedido.historialEstados && (
                            <p className="text-sm text-gray-500">No hay historial disponible</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Detalles Expandidos */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-gray-800">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Información del Pedido */}
                          <div className="space-y-4">
                            <h4 className="font-bold text-white text-lg mb-3">📋 Información del Pedido</h4>
                            
                            <div className="bg-gray-800 rounded-lg p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Base Imponible:</span>
                                  <span className="text-white">S/ {calculoIGV.base}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">IGV (18%):</span>
                                  <span className="text-white">S/ {calculoIGV.igv}</span>
                                </div>
                                {pedido.envio && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Envío:</span>
                                    <span className="text-white">S/ {pedido.envio.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-bold pt-3 border-t border-gray-700">
                                  <span className="text-gray-400">Total:</span>
                                  <span className="text-white text-lg">S/ {calculoIGV.total}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Dirección con RUC */}
                            {pedido.datosEnvio && (
                              <div className="bg-gray-800 rounded-lg p-4">
                                <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                                  <MapPin size={14} />
                                  Datos de Facturación y Envío
                                </h5>
                                <div className="text-sm text-gray-300 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Building size={14} className="text-gray-500" />
                                    <span className="font-medium">{pedido.datosEnvio.razonSocial}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-gray-500" />
                                    <span>RUC: {pedido.datosEnvio.ruc || 'No registrado'}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <MapPin size={14} className="text-gray-500 mt-1" />
                                    <span>{pedido.datosEnvio.direccion}</span>
                                  </div>
                                  <p>{pedido.datosEnvio.ciudad}</p>
                                  <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-gray-500" />
                                    <span>📞 {pedido.datosEnvio.telefono}</span>
                                  </div>
                                  {pedido.datosEnvio.email && (
                                    <p className="text-xs">✉️ {pedido.datosEnvio.email}</p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Facturación Electrónica SUNAT */}
                            {pedido.comprobanteElectronico && (
                              <div className="bg-gray-800 rounded-lg p-4">
                                <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                                  <Sun size={14} />
                                  Comprobante Electrónico - SUNAT
                                </h5>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Serie:</span>
                                    <span className="text-white font-mono">{pedido.comprobanteElectronico.serie}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Número:</span>
                                    <span className="text-white font-mono">{pedido.comprobanteElectronico.numero}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Estado SUNAT:</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                      pedido.comprobanteElectronico.estadoSUNAT === 'Aceptado' ? 'bg-green-500/20 text-green-400' :
                                      pedido.comprobanteElectronico.estadoSUNAT === 'Rechazado' ? 'bg-red-500/20 text-red-400' :
                                      'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      {pedido.comprobanteElectronico.estadoSUNAT || 'En proceso'}
                                    </span>
                                  </div>
                                  {pedido.comprobanteElectronico.cdrCodigo && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-400">Código CDR:</span>
                                      <span className="text-white font-mono text-xs">{pedido.comprobanteElectronico.cdrCodigo}</span>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => verEstadoSUNAT(pedido.comprobanteElectronico)}
                                    className="w-full mt-2 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-400 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Shield size={12} />
                                    Ver detalle SUNAT
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Productos Detallados */}
                          <div>
                            <h4 className="font-bold text-white text-lg mb-3">🛒 Productos ({pedido.items?.length || 0})</h4>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                              {pedido.items?.map((item: any, index: number) => {
                                const itemTotal = (item.precioBase || 0) * (item.cantidad || 1);
                                const itemIGV = itemTotal * 0.18;
                                const itemBase = itemTotal / 1.18;
                                const yaCalificado = productosCalificados.includes(item.id);
                                
                                return (
                                  <div key={index} className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                                    <div className="w-14 h-14 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                      {item.imagenUrl ? (
                                        <img 
                                          src={item.imagenUrl} 
                                          alt={item.nombre}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Package size={20} className="text-gray-400" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-white truncate">{item.nombre}</p>
                                      <div className="flex justify-between items-center mt-2">
                                        <div className="text-xs text-gray-400">
                                          <span className="block">Cantidad: {item.cantidad}</span>
                                          <span className="block mt-1">Precio: S/ {(item.precioBase || 0).toFixed(2)} c/u</span>
                                          <span className="block mt-1 text-gray-500">Base: S/ {itemBase.toFixed(2)}</span>
                                          <span className="block mt-1 text-gray-500">IGV: S/ {itemIGV.toFixed(2)}</span>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-bold text-white">
                                            S/ {itemTotal.toFixed(2)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Inc. IGV
                                          </div>
                                          {yaCalificado && (
                                            <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
                                              <CheckCircle size={12} />
                                              Calificado
                                            </div>
                                          )}
                                          {!yaCalificado && estadoPedido.toLowerCase() === 'entregado' && (
                                            <button
                                              onClick={() => {
                                                setProductoSeleccionado(item);
                                                setPedidoSeleccionado(pedido);
                                                setModalOpinionAbierto(true);
                                              }}
                                              className="text-xs text-amber-400 hover:text-amber-300 mt-1"
                                            >
                                              Calificar
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Información adicional */}
                        <div className="mt-6 pt-6 border-t border-gray-800">
                          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                            <div className="bg-gray-800 rounded-lg p-3">
                              <p className="text-gray-400 mb-1 flex items-center gap-1">
                                <CreditCard size={14} />
                                Condición de Pago
                              </p>
                              <p className="text-white font-medium capitalize">{pedido.plazoCredito || 'Contado'}</p>
                              {creditoInfo && (
                                <p className={`text-xs mt-1 ${creditoInfo.vencido ? 'text-red-400' : 'text-gray-500'}`}>
                                  {creditoInfo.vencido ? 'VENCIDO' : `Vence: ${formatFechaSimple(creditoInfo.fechaVencimiento)}`}
                                </p>
                              )}
                            </div>
                            
                            {pedido.estadoPago && (
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-gray-400 mb-1 flex items-center gap-1">
                                  <CheckCircle size={14} />
                                  Estado de Pago
                                </p>
                                <p className="text-white font-medium">{pedido.estadoPago}</p>
                                {pedido.montoPagado && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Pagado: S/ {pedido.montoPagado.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {guiaValue && (
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-gray-400 mb-1 flex items-center gap-1">
                                  <Truck size={14} />
                                  Guía de Remisión
                                </p>
                                <p className="text-white font-mono font-medium text-xs">{guiaValue}</p>
                                <button 
                                  onClick={() => verGuiaRemision(guiaValue, transportistaValue)}
                                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-1"
                                >
                                  <FileText size={12} />
                                  Ver tracking
                                </button>
                              </div>
                            )}

                            {transportistaValue && (
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-gray-400 mb-1 flex items-center gap-1">
                                  <Truck size={14} />
                                  Transportista
                                </p>
                                <p className="text-white font-medium">{transportistaValue}</p>
                                {pedido.fechaEnvio?.toDate && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Enviado: {formatFechaSimple(pedido.fechaEnvio)}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            <div className="bg-gray-800 rounded-lg p-3">
                              <p className="text-gray-400 mb-1 flex items-center gap-1">
                                <Hash size={14} />
                                ID del Pedido
                              </p>
                              <p className="text-white font-mono text-xs">{pedido.id}</p>
                            </div>
                          </div>
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

      {/* 🔥 MODAL DE OPINIÓN */}
      {modalOpinionAbierto && pedidoSeleccionado && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Calificar producto</h2>
                <button
                  onClick={() => {
                    setModalOpinionAbierto(false);
                    setPedidoSeleccionado(null);
                    setProductoSeleccionado(null);
                    setPuntuacion(5);
                    setComentario('');
                    setImagenesReseña([]);
                    setPreviewImages([]);
                  }}
                  className="text-gray-500 hover:text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              {productoSeleccionado ? (
  <div className="mb-4 p-4 bg-gray-800 rounded-lg">
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden">
        <img 
          src={productoSeleccionado.imagenUrl || productoSeleccionado.imagen_principal || productoSeleccionado.image || 'https://placehold.co/100x100/2563eb/ffffff?text=Producto'} 
          alt={productoSeleccionado.nombre}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/2563eb/ffffff?text=Producto';
          }}
        />
      </div>
      <div>
        <p className="text-white font-medium">{productoSeleccionado.nombre}</p>
        <p className="text-sm text-gray-400">Pedido #{pedidoSeleccionado.numeroPedido || pedidoSeleccionado.id.slice(0, 8)}</p>
      </div>
    </div>
  </div>
) : (
  <div className="mb-4">
  <p className="text-white mb-2">Selecciona un producto para calificar:</p>
  <div className="space-y-2 max-h-60 overflow-y-auto">
    {pedidoSeleccionado.items?.map((item: any) => {
      const yaCalificado = (pedidoSeleccionado.productosCalificados || []).includes(item.id);
      return (
        <button
          key={item.id}
          onClick={() => setProductoSeleccionado(item)}
          disabled={yaCalificado}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
            yaCalificado 
              ? 'bg-gray-800/50 cursor-not-allowed opacity-50'
              : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden shrink-0">
            <img 
              src={item.imagen_principal || item.imagenUrl || 'https://placehold.co/100x100/2563eb/ffffff?text=Producto'} 
              alt={item.nombre} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/2563eb/ffffff?text=Producto';
              }}
            />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm">{item.nombre}</p>
            <p className="text-xs text-gray-400">Cantidad: {item.cantidad}</p>
          </div>
          {yaCalificado && (
            <CheckCircle size={16} className="text-green-500 shrink-0" />
          )}
        </button>
      );
    })}
    </div>
  </div>
)}

              {productoSeleccionado && (
                <div className="space-y-4">
                  {/* Estrellas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Tu calificación
                    </label>
                    <StarRating rating={puntuacion} setRating={setPuntuacion} size={32} />
                  </div>

                  {/* Comentario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Tu opinión
                    </label>
                    <textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Comparte tu experiencia con este producto..."
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-32"
                      required
                    />
                  </div>

                  {/* Subir fotos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Agregar fotos (opcional, máx 4)
                    </label>
                    
                    {previewImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {previewImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 group">
                            <img src={img} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                            <button
                              onClick={() => eliminarImagenPreview(idx)}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {previewImages.length < 4 && (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-6 cursor-pointer hover:border-amber-500 transition-colors">
                        <Camera size={24} className="text-gray-500 mb-2" />
                        <span className="text-sm text-gray-400">Haz clic para subir fotos</span>
                        <span className="text-xs text-gray-500 mt-1">Máx 4 fotos, 3MB cada una</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImagenesReseña}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Botón enviar */}
                  <button
                    onClick={enviarReseña}
                    disabled={enviandoReseña || !comentario.trim()}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2"
                  >
                    {enviandoReseña ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Publicar opinión
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}