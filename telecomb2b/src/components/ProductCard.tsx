"use client";
import { useState } from "react";
import { Inter } from "next/font/google";
import { useCart } from "@/context/CartContext";
import { Sparkles, Shield, CheckCircle } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

interface ProductoProps {
  producto: {
    id: string;
    nombre?: string; // Para compatibilidad
    nombre_producto?: string; // De tu base de datos
    precioBase?: number; // Para compatibilidad
    precio?: number; // De tu base de datos
    stock: number;
    stock_minimo?: number;
    imagenUrl?: string; // Para compatibilidad
    imagen_principal?: string; // De tu base de datos
    sku: string;
    categoria?: string;
    categoria_id?: string;
    descripcion?: string;
    descripcion_corta?: string;
    marca?: string;
    moneda?: string;
    unidad_venta?: string;
    estado?: string;
    garantia_meses?: number; // Nueva propiedad
    [key: string]: any; // Para campos adicionales
  };
}

export default function ProductCard({ producto }: ProductoProps) {
  const { agregarAlCarrito, abrirCarrito } = useCart();
  const [notificar, setNotificar] = useState(false);

  // 🔴 VALIDACIÓN CRÍTICA: Verificar que producto existe
  if (!producto) {
    return (
      <div className={`${inter.className} bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col h-full`}>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-slate-500 text-sm">Producto no disponible</p>
        </div>
      </div>
    );
  }

  // ✅ FUNCIONES SEGURAS con fallbacks
  const getNombre = (): string => {
    return producto.nombre_producto || producto.nombre || "Producto sin nombre";
  };

  const getPrecio = (): number => {
    return producto.precio || producto.precioBase || 0;
  };

  const getImagen = (): string => {
    return producto.imagen_principal || producto.imagenUrl || "/placeholder-image.jpg";
  };

  const getDescripcion = (): string => {
    return producto.descripcion_corta || producto.descripcion || "";
  };

  const getCategoria = (): string => {
    return producto.categoria || producto.categoria_id || "Sin categoría";
  };

  // ✅ ESTO ESTÁ BIEN:
const getMoneda = (): string => {
  return "PEN";  // <-- FUERZA SOLES SIEMPRE
};

  const getStock = (): number => {
    return producto.stock || 0;
  };

  const getStockMinimo = (): number => {
    return producto.stock_minimo || 0;
  };

  const getUnidadVenta = (): string => {
    return producto.unidad_venta || "Unidad";
  };

  const getEstado = (): string => {
    return producto.estado || "nuevo";
  };

  const getGarantiaMeses = (): number => {
    return producto.garantia_meses || 12; // Valor por defecto 12 meses
  };

  // Usar las funciones seguras
  const nombre = getNombre();
  const precio = getPrecio();
  const imagen = getImagen();
  const descripcion = getDescripcion();
  const categoria = getCategoria();
  const moneda = getMoneda();
  const stockDisponible = getStock();
  const stockMinimo = getStockMinimo();
  const unidadVenta = getUnidadVenta();
  const estado = getEstado();
  const garantiaMeses = getGarantiaMeses();
  
  const miTelefono = "51974212579";
  const mensajeBase = `*SOLICITUD DE COTIZACIÓN B2B* 📡\n\n*PRODUCTO:* ${nombre}\n*SKU:* ${producto.sku || "N/A"}\n*PRECIO:* ${moneda} ${precio.toLocaleString()}\n*UNIDAD:* ${unidadVenta}\n*CATEGORÍA:* ${categoria}\n*GARANTÍA:* ${garantiaMeses} meses\n*ESTADO:* ${estado}`;
  const urlWhatsapp = `https://wa.me/${miTelefono}?text=${encodeURIComponent(mensajeBase)}`;

  const manejarAdicion = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (stockDisponible <= 0) return;
    
    agregarAlCarrito({
      id: producto.id,
      nombre: nombre,
      precio: precio,
      imagenUrl: imagen,
      stock: stockDisponible,
      cantidad: 1,
      sku: producto.sku || "",
      moneda: moneda,
      unidad_venta: unidadVenta
    }, false);
    
    setNotificar(true);
    abrirCarrito();
    
    setTimeout(() => setNotificar(false), 1500);
  };

  const manejarWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(urlWhatsapp, '_blank', 'noopener,noreferrer');
  };

  // Función para determinar color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'nuevo': return 'bg-emerald-500';
      case 'reacondicionado': return 'bg-amber-500';
      case 'usado': return 'bg-slate-500';
      default: return 'bg-blue-500';
    }
  };

  // Calcular si está en oferta
  const esOfertaEspecial = stockDisponible > 0 && precio > 100 && (parseInt(producto.id?.slice(-1) || "0") % 2 === 0);
  
  // Calcular ventas simuladas
  const ventasSimuladas = producto.sku 
    ? Math.floor((parseInt(producto.sku.slice(-2)) || Math.random() * 20) + 5)
    : Math.floor(Math.random() * 20) + 5;
  
  // Verificar si el stock es crítico
  const stockCritico = stockDisponible > 0 && stockDisponible <= (stockMinimo || 5);

  return (
    <div 
      className={`${inter.className} group relative bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden flex flex-col h-full transition-all duration-300 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-900/20
        before:absolute before:inset-0 before:rounded-2xl before:border-2 before:border-transparent 
        before:bg-linear-to-br before:from-blue-600/0 before:via-blue-600/0 before:to-blue-600/0 
        group-hover:before:from-blue-600/40 group-hover:before:via-blue-600/20 group-hover:before:to-blue-600/40 
        before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-500`}
    >
      
      {/* BADGE DE OFERTA */}
      {esOfertaEspecial && (
        <div className="absolute top-4 right-4 z-20">
          <span className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-lg animate-pulse flex items-center gap-1">
            <Sparkles size={10} /> OFERTA B2B
          </span>
        </div>
      )}
      
      {/* BADGE DE STOCK CRÍTICO */}
      {stockCritico && (
        <div className="absolute top-4 left-4 z-20">
          <span className="bg-gradient-to-br from-red-500 to-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-lg animate-pulse">
            ⚠️ STOCK BAJO
          </span>
        </div>
      )}

      {/* IMAGEN DEL PRODUCTO */}
      <div className="relative h-40 bg-gradient-to-br from-gray-900/50 to-black/30 overflow-hidden flex items-center justify-center p-4">
        <div className="transition-transform duration-700 ease-out group-hover:scale-125 h-full w-full flex items-center justify-center cursor-crosshair">
          <img 
            src={imagen} 
            alt={nombre} 
            className="max-h-full max-w-full object-contain drop-shadow-2xl"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder-image.jpg";
            }}
          />
        </div>
        
        {/* BADGE DE CATEGORÍA */}
        <span className="absolute top-3 left-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider z-10 shadow-lg">
          {categoria.length > 12 ? `${categoria.substring(0, 12)}...` : categoria}
        </span>
        
        {/* BADGE DE MARCA */}
        {producto.marca && (
          <span className="absolute top-3 right-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider z-10 shadow-lg">
            {producto.marca}
          </span>
        )}
      </div>

      {/* INFORMACIÓN DEL PRODUCTO */}
      <div className="p-4 flex-1 flex flex-col relative z-10">
        <div className="mb-2">
          {/* SKU */}
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">SKU: {producto.sku || "N/A"}</p>
          
          {/* NOMBRE */}
          <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 h-10 tracking-tight transition-all duration-300 group-hover:text-blue-400 group-hover:translate-x-1">
            {nombre}
          </h3>
          
          {/* DESCRIPCIÓN */}
          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 font-medium leading-relaxed">
            {descripcion || "Producto profesional para telecomunicaciones"}
          </p>
          
          {/* NUEVA SECCIÓN: Garantía y Estado */}
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Garantía */}
            <div className="flex items-center gap-1.5 bg-slate-800/50 rounded-lg px-2 py-1 border border-slate-700/50">
              <Shield size={10} className="text-blue-400" />
              <span className="text-[9px] font-bold text-blue-300 uppercase tracking-wider">
                {garantiaMeses} MESES
              </span>
              <span className="text-[8px] text-slate-400 font-medium">GARANTÍA</span>
            </div>
            
            {/* Estado */}
            <div className={`flex items-center gap-1.5 ${getEstadoColor(estado)} rounded-lg px-2 py-1`}>
              <CheckCircle size={10} className="text-white" />
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">
                {estado.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* PRECIO Y ACCIONES */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-auto">
          <div className="relative">
            {notificar && (
              <span className="absolute -top-8 left-0 bg-gradient-to-r from-green-600 to-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg animate-bounce whitespace-nowrap z-10">
                ¡Añadido! ✓
              </span>
            )}
            {/* PRECIO TACHADO (si aplica) */}
            {precio > 50 && (
              <p className="text-[10px] text-slate-500 font-bold line-through leading-none">
                {moneda} {(precio * 1.15).toFixed(2)}
              </p>
            )}
            {/* PRECIO ACTUAL */}
            <p className="text-lg font-black text-white tracking-tighter">
              {moneda} {precio.toLocaleString()}
            </p>
            {/* UNIDAD DE VENTA */}
            <p className="text-[9px] text-slate-400 font-medium">
              por {unidadVenta}
            </p>
          </div>
          
          {/* BOTONES DE ACCIÓN */}
          <div className="flex gap-2">
            {/* BOTÓN WHATSAPP */}
            <button 
              onClick={manejarWhatsApp}
              className="h-10 w-10 flex items-center justify-center bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white rounded-xl hover:from-[#128C7E] hover:to-[#075E54] transition-all shadow-sm active:scale-90 hover:animate-[shake_0.5s_infinite] border border-[#25D366]/30"
              title="Contactar por WhatsApp"
              aria-label="Solicitar cotización por WhatsApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 fill-current">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.1 0-65.6-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.2-3.2-5.6-.3-8.6 2.4-11.4 2.6-2.5 5.6-6.5 8.3-9.8 2.8-3.3 3.7-5.6 5.6-9.3 1.8-3.7.9-6.9-.5-9.8-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
              </svg>
            </button>

            {/* BOTÓN AÑADIR AL CARRITO */}
            <button 
              onClick={manejarAdicion}
              disabled={stockDisponible <= 0}
              className={`h-10 w-10 rounded-xl transition-all flex items-center justify-center shadow-md border ${
                stockDisponible <= 0 
                ? 'bg-white/5 text-slate-600 border-white/10' 
                : notificar
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white scale-110 border-emerald-500/30' 
                  : 'bg-gradient-to-br from-white to-gray-100 text-slate-900 border-white/20 hover:from-blue-600 hover:to-cyan-500 hover:text-white hover:border-blue-500/30 active:scale-90'
              }`}
              title={stockDisponible <= 0 ? "Producto agotado" : "Añadir al carrito"}
              aria-label={stockDisponible <= 0 ? "Producto agotado" : "Añadir al carrito"}
            >
              {stockDisponible <= 0 ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : notificar ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* INFORMACIÓN DE STOCK */}
        <div className="mt-4 pt-2 border-t border-white/5 flex flex-col gap-1.5 items-center justify-center text-center">
          <div className="flex items-center">
            <div className={`h-1.5 w-1.5 rounded-full mr-2 shadow-[0_0_8px] ${
              stockDisponible > 0 
                ? stockCritico 
                  ? 'bg-yellow-500 shadow-yellow-500 animate-pulse' 
                  : 'bg-emerald-500 shadow-emerald-500' 
                : 'bg-rose-500 shadow-rose-500'
            }`}></div>
            <p className={`text-[9px] font-bold uppercase tracking-[0.15em] ${
              stockDisponible > 0 
                ? stockCritico 
                  ? 'text-yellow-500' 
                  : 'text-emerald-500' 
                : 'text-rose-500'
            }`}>
              {stockDisponible > 0 
                ? `STOCK: ${stockDisponible} ${unidadVenta} DISPONIBLES` 
                : 'AGOTADO'}
              {stockCritico && stockDisponible > 0 && ' ⚠️'}
            </p>
          </div>
          
          {/* INDICADOR DE VENTAS */}
          {stockDisponible > 0 && ventasSimuladas > 0 && (
            <p className="text-[8px] font-medium text-blue-400/80 uppercase tracking-widest">
              🔥 Más de {ventasSimuladas} {ventasSimuladas === 1 ? 'empresa' : 'empresas'} compraron esto recientemente
            </p>
          )}
          
          {/* INDICADOR DE STOCK MÍNIMO */}
          {stockMinimo > 0 && stockDisponible > 0 && (
            <p className="text-[7px] font-medium text-slate-500 uppercase tracking-widest">
              Stock mínimo: {stockMinimo} {unidadVenta}
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        
        /* Asegurar que las imágenes no se desborden */
        img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
}