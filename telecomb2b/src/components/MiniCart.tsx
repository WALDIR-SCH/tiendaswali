"use client";
import { useCart } from "@/context/CartContext";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function MiniCart() {
  const { 
    carrito, 
    agregarAlCarrito, 
    reducirCantidad, 
    eliminarDelCarrito, 
    total, 
    isCartOpen, 
    cerrarCarrito 
  } = useCart();
  
  const pathname = usePathname();

  // Cerrar MiniCart al cambiar de ruta
  useEffect(() => {
    if (isCartOpen) {
      cerrarCarrito();
    }
  }, [pathname]);

  // Función para determinar si es producto B2B (se vende en miles)
  const esProductoB2B = (item: any) => {
    // Verificar por unidad de venta
    if (item.unidad_venta?.toLowerCase().includes('mil')) return true;
    // Verificar por nombre
    if (item.nombre?.toLowerCase().includes('cable') || 
        item.nombre?.toLowerCase().includes('conector')) return true;
    // Por defecto, si tiene precio alto, asumimos B2B
    if (item.precioBase > 1000) return true;
    return false;
  };

  // Obtener incremento según el producto
  const obtenerIncremento = (item: any) => {
    return esProductoB2B(item) ? 100 : 1;
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cerrarCarrito}
            className="fixed inset-0 bg-black/70 z-50"
          />

          <motion.aside 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-4 right-4 h-fit max-h-[90vh] w-full sm:w-96 bg-gray-900 z-50 flex flex-col shadow-2xl border border-gray-800 rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
              <div>
                <h2 className="text-sm font-bold text-white">Carrito de Compras</h2>
                <p className="text-xs text-gray-400 mt-1">
                  {carrito.length} {carrito.length === 1 ? 'Producto' : 'Productos'}
                </p>
              </div>
              <button onClick={cerrarCarrito} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
              {carrito.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-gray-500 text-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag size={24} />
                  </div>
                  <p className="text-sm font-medium">Tu carrito está vacío</p>
                </div>
              ) : (
                carrito.map((item) => {
                  const incremento = obtenerIncremento(item);
                  const esB2B = esProductoB2B(item);
                  
                  return (
                    <div key={item.id} className="flex gap-3 p-3 bg-gray-800 rounded-lg items-center">
                      <div className="w-14 h-14 bg-white rounded-lg p-2 shrink-0 flex items-center justify-center">
                        <img 
                          src={item.imagenUrl || item.imagen_principal || '/default-image.png'} 
                          alt={item.nombre} 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">
                          {item.nombre || 'Producto sin nombre'}
                        </h3>
                        <p className="text-sm font-bold text-blue-400">
                          S/ {(item.precioBase || 0).toFixed(2)}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-gray-700 rounded-lg p-1">
                            <button 
                              onClick={() => reducirCantidad(item.id)} 
                              className="p-1 text-white hover:bg-gray-600 rounded transition-colors"
                            >
                              <Minus size={14}/>
                            </button>
                            <span className="text-sm font-medium w-8 text-center text-white">{item.cantidad}</span>
                           <button 
  onClick={() => {
    // Para productos B2B, incremento de 10; para normales, incremento de 1
    const incremento = item.unidad_venta?.includes('mil') ? 10 : 1;
    agregarAlCarrito(item, incremento, false);
  }} 
  className="p-1 text-white hover:bg-gray-600 rounded transition-colors"
>
  <Plus size={14}/>
</button>
                          </div>
                          <button 
                            onClick={() => eliminarDelCarrito(item.id)} 
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        {/* Mostrar unidad de venta si es B2B */}
                        {esB2B && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            Unidad: {item.unidad_venta || 'miles'} • +{incremento} c/u
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {carrito.length > 0 && (
              <div className="p-4 bg-gray-950 border-t border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-400">Total</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-white">S/ {total.toFixed(2)}</span>
                  </div>
                </div>
                <Link 
                  href="/carrito" 
                  onClick={cerrarCarrito}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors"
                >
                  Ir al Carrito <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}