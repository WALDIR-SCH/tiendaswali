"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string;
  idOriginal?: string; // ID original del producto (sin sufijo)
  nombre: string;
  sku?: string;
  precioBase: number;
  precio_caja?: number;
  precio_unitario?: number;
  imagenUrl?: string;
  imagen_principal?: string;
  stock: number;
  cantidad: number;
  unidad_venta?: string;
  tipoCompra?: 'caja' | 'unidad'; // 🔥 NUEVO
  unidadesPorCaja?: number; // 🔥 NUEVO
}

interface CartContextType {
  carrito: CartItem[];
  agregarAlCarrito: (producto: any, cantidad?: number, tipoCompra?: 'caja' | 'unidad') => void;
  reducirCantidad: (id: string, tipoCompra?: 'caja' | 'unidad') => void;
  actualizarCantidad: (id: string, cantidad: number, tipoCompra?: 'caja' | 'unidad') => void;
  eliminarDelCarrito: (id: string, tipoCompra?: 'caja' | 'unidad') => void;
  vaciarCarrito: () => void;
  total: number;
  totalArticulos: number;
  isCartOpen: boolean;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Cargar carrito desde localStorage al iniciar
  useEffect(() => {
    setIsClient(true);
    const savedCart = localStorage.getItem("telecom_cart");
    if (savedCart) {
      try {
        setCarrito(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error cargando el carrito", e);
      }
    }
  }, []);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("telecom_cart", JSON.stringify(carrito));
    }
  }, [carrito, isClient]);

  const abrirCarrito = () => {
    setIsCartOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const cerrarCarrito = () => {
    setIsCartOpen(false);
    document.body.style.overflow = 'auto';
  };

  // 🔥 FUNCIÓN CORREGIDA - Maneja cajas y unidades
  const agregarAlCarrito = (
    producto: any, 
    cantidad: number = 1, 
    tipoCompra?: 'caja' | 'unidad'
  ) => {
    setCarrito((prev) => {
      // Crear un ID único que incluya el tipo de compra
      const itemId = tipoCompra 
        ? `${producto.id}-${tipoCompra}` 
        : producto.id;
      
      const existe = prev.find((item) => 
        tipoCompra 
          ? item.id === `${producto.id}-${tipoCompra}` 
          : item.id === producto.id
      );
      
      if (existe) {
        // Si ya existe, sumar la cantidad especificada
        return prev.map((item) => {
          const match = tipoCompra 
            ? item.id === `${producto.id}-${tipoCompra}` 
            : item.id === producto.id;
          
          if (match) {
            const nuevaCantidad = item.cantidad + cantidad;
            const maxStock = item.stock || 9999;
            return { 
              ...item, 
              cantidad: Math.min(nuevaCantidad, maxStock)
            };
          }
          return item;
        });
      }
      
      // Determinar el precio base según el tipo de compra
      let precioBase = producto.precioBase || producto.precio || 0;
      
      if (tipoCompra === 'caja' && producto.precio_caja) {
        precioBase = producto.precio_caja;
      } else if (tipoCompra === 'unidad' && producto.precio_unitario) {
        precioBase = producto.precio_unitario;
      } else if (producto.precioBase) {
        precioBase = producto.precioBase;
      } else if (producto.precio) {
        precioBase = producto.precio;
      }
      
      // Crear nuevo item con ID compuesto si hay tipo de compra
      const nuevoItem: CartItem = {
        id: tipoCompra ? `${producto.id}-${tipoCompra}` : producto.id,
        idOriginal: producto.id,
        nombre: producto.nombre || producto.nombre_producto || "Producto",
        sku: producto.sku || "",
        precioBase: precioBase,
        precio_caja: producto.precio_caja,
        precio_unitario: producto.precio_unitario,
        imagenUrl: producto.imagenUrl || producto.imagen_principal || "",
        imagen_principal: producto.imagen_principal || producto.imagenUrl || "",
        stock: tipoCompra === 'caja' 
          ? (producto.stock_cajas || producto.stock || 9999)
          : (producto.stock_unidades || (producto.stock_cajas * producto.unidadesPorCaja) || 9999),
        unidad_venta: producto.unidad_venta || (tipoCompra === 'caja' ? 'Caja' : 'Unidad'),
        cantidad: cantidad,
        tipoCompra: tipoCompra,
        unidadesPorCaja: producto.unidadesPorCaja || producto.unidades_por_caja
      };
      
      return [...prev, nuevoItem];
    });

    abrirCarrito();
  };

  // 🔥 ACTUALIZAR CANTIDAD - Ahora considera el tipo de compra
  const actualizarCantidad = (
    id: string, 
    cantidad: number, 
    tipoCompra?: 'caja' | 'unidad'
  ) => {
    setCarrito((prev) => {
      // Buscar el item exacto (con o sin sufijo de tipo)
      const itemToUpdate = prev.find(item => {
        if (tipoCompra) {
          return item.id === `${id}-${tipoCompra}`;
        }
        return item.id === id;
      });
      
      if (!itemToUpdate) return prev;
      
      return prev.map((item) => {
        const match = tipoCompra 
          ? item.id === `${id}-${tipoCompra}` 
          : item.id === id;
        
        if (match) {
          const nuevaCantidad = Math.max(0, Math.min(cantidad, item.stock));
          return { ...item, cantidad: nuevaCantidad };
        }
        return item;
      }).filter(item => item.cantidad > 0);
    });
  };

  // 🔥 REDUCIR CANTIDAD - Ahora considera el tipo de compra
  const reducirCantidad = (id: string, tipoCompra?: 'caja' | 'unidad') => {
    const item = carrito.find(i => 
      tipoCompra ? i.id === `${id}-${tipoCompra}` : i.id === id
    );
    
    if (item && item.cantidad > 1) {
      actualizarCantidad(id, item.cantidad - 1, tipoCompra);
    } else {
      eliminarDelCarrito(id, tipoCompra);
    }
  };

  // 🔥 ELIMINAR DEL CARRITO - Ahora considera el tipo de compra
  const eliminarDelCarrito = (id: string, tipoCompra?: 'caja' | 'unidad') => {
    setCarrito((prev) => 
      prev.filter((item) => {
        if (tipoCompra) {
          return item.id !== `${id}-${tipoCompra}`;
        }
        return item.id !== id;
      })
    );
  };

  const vaciarCarrito = () => {
    setCarrito([]);
  };

  const total = carrito.reduce((acc, item) => acc + (item.precioBase * item.cantidad), 0);
  const totalArticulos = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        carrito,
        agregarAlCarrito,
        reducirCantidad,
        actualizarCantidad,
        eliminarDelCarrito,
        vaciarCarrito,
        total,
        totalArticulos,
        isCartOpen,
        abrirCarrito,
        cerrarCarrito,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de un CartProvider");
  return context;
};