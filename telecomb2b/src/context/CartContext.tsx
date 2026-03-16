"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string;
  idOriginal?: string;
  nombre: string;
  sku?: string;
  precioBase: number;
  precio_caja?: number;
  precio_unitario?: number;
  imagenUrl?: string;
  imagen_principal?: string;
  stock: number;
  stock_cajas?: number;
  stock_unidades?: number;
  cantidad: number;
  unidad_venta?: string;
  tipoCompra?: "caja" | "unidad";
  unidadesPorCaja?: number;
  pedido_minimo: number; // ← mínimo real del producto
}

interface CartContextType {
  carrito: CartItem[];
  agregarAlCarrito: (producto: any, cantidad?: number, tipoCompra?: "caja" | "unidad") => void;
  reducirCantidad: (id: string, tipoCompra?: "caja" | "unidad") => void;
  actualizarCantidad: (id: string, cantidad: number, tipoCompra?: "caja" | "unidad") => void;
  eliminarDelCarrito: (id: string, tipoCompra?: "caja" | "unidad") => void;
  vaciarCarrito: () => void;
  total: number;
  totalArticulos: number;
  isCartOpen: boolean;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [carrito,    setCarrito]    = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isClient,   setIsClient]   = useState(false);

  /* ── Persistencia localStorage ── */
  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem("telecom_cart");
      if (saved) setCarrito(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (isClient) {
      try { localStorage.setItem("telecom_cart", JSON.stringify(carrito)); } catch {}
    }
  }, [carrito, isClient]);

  const abrirCarrito  = () => { setIsCartOpen(true);  document.body.style.overflow = "hidden"; };
  const cerrarCarrito = () => { setIsCartOpen(false); document.body.style.overflow = "auto"; };

  /* ── Agregar al carrito ── */
  const agregarAlCarrito = (
    producto: any,
    cantidad: number = 1,
    tipoCompra?: "caja" | "unidad"
  ) => {
    setCarrito(prev => {
      // ID único por tipo de compra: "abc123-caja" o "abc123-unidad"
      const itemId = tipoCompra ? `${producto.id}-${tipoCompra}` : producto.id;

      const existe = prev.find(item => item.id === itemId);

      if (existe) {
        return prev.map(item => {
          if (item.id !== itemId) return item;
          const maxStock = tipoCompra === "caja"
            ? (producto.stock_cajas || producto.stock || 9999)
            : (producto.stock_unidades || 9999);
          return { ...item, cantidad: Math.min(item.cantidad + cantidad, maxStock) };
        });
      }

      /* ── Precio según tipo ── */
      let precioBase = 0;
      if (tipoCompra === "caja") {
        precioBase = (producto.en_oferta && producto.precio_oferta_caja)
          ? Number(producto.precio_oferta_caja)
          : Number(producto.precio_caja) || Number(producto.precioBase) || 0;
      } else if (tipoCompra === "unidad") {
        precioBase = (producto.en_oferta_unidad && producto.precio_oferta_unidad)
          ? Number(producto.precio_oferta_unidad)
          : Number(producto.precio_unitario) || Number(producto.precioBase) || 0;
      } else {
        precioBase = Number(producto.precioBase) || Number(producto.precio) || Number(producto.precio_caja) || 0;
      }

      const udsPorCaja   = Number(producto.unidadesPorCaja || producto.unidades_por_caja) || 10;
      const pedidoMinimo = Number(producto.pedido_minimo) || (tipoCompra === "caja" ? 1 : 5);

      const stockFinal = tipoCompra === "caja"
        ? (Number(producto.stock_cajas) || Number(producto.stock) || 9999)
        : tipoCompra === "unidad"
          ? (Number(producto.stock_unidades) || Number(producto.stock_cajas) * udsPorCaja || 9999)
          : (Number(producto.stock_cajas) || Number(producto.stock) || 9999);

      const nuevoItem: CartItem = {
        id:               itemId,
        idOriginal:       producto.id,
        nombre:           producto.nombre_producto || producto.nombre || "Producto",
        sku:              producto.sku || "",
        precioBase,
        precio_caja:      Number(producto.precio_caja) || 0,
        precio_unitario:  Number(producto.precio_unitario) || 0,
        imagenUrl:        producto.imagenUrl || producto.imagen_principal || "",
        imagen_principal: producto.imagen_principal || producto.imagenUrl || "",
        stock:            stockFinal,
        stock_cajas:      Number(producto.stock_cajas) || Number(producto.stock) || 0,
        stock_unidades:   Number(producto.stock_unidades) || 0,
        cantidad,
        unidad_venta:     tipoCompra === "caja" ? "Caja" : "Unidad",
        tipoCompra,
        unidadesPorCaja:  udsPorCaja,
        pedido_minimo:    pedidoMinimo,  // ← ahora viene del producto
      };

      return [...prev, nuevoItem];
    });

    abrirCarrito();
  };

  /* ── Actualizar cantidad — busca por id exacto ── */
  const actualizarCantidad = (
    id: string,
    cantidad: number,
    tipoCompra?: "caja" | "unidad"
  ) => {
    setCarrito(prev => {
      // El id que llega puede ser el id compuesto ya (ej "abc-caja")
      // o el id base con tipoCompra separado
      const target = tipoCompra ? `${id}-${tipoCompra}` : id;
      return prev
        .map(item => {
          if (item.id !== target && item.id !== id) return item;
          const nueva = Math.max(0, Math.min(cantidad, item.stock));
          return { ...item, cantidad: nueva };
        })
        .filter(item => item.cantidad > 0);
    });
  };

  /* ── Reducir en 1 (o eliminar si llega a 0) ── */
  const reducirCantidad = (id: string, tipoCompra?: "caja" | "unidad") => {
    const target = tipoCompra ? `${id}-${tipoCompra}` : id;
    const item   = carrito.find(i => i.id === target || i.id === id);
    if (!item) return;
    if (item.cantidad > 1) actualizarCantidad(item.id, item.cantidad - 1);
    else eliminarDelCarrito(item.id);
  };

  /* ── Eliminar ── */
  const eliminarDelCarrito = (id: string, tipoCompra?: "caja" | "unidad") => {
    const target = tipoCompra ? `${id}-${tipoCompra}` : id;
    setCarrito(prev => prev.filter(item => item.id !== target && item.id !== id ? true : item.id === target ? false : item.id === id ? false : true));
  };

  const vaciarCarrito = () => setCarrito([]);

  const total         = carrito.reduce((s, i) => s + i.precioBase * i.cantidad, 0);
  const totalArticulos = carrito.reduce((s, i) => s + i.cantidad, 0);

  return (
    <CartContext.Provider value={{
      carrito, agregarAlCarrito, reducirCantidad, actualizarCantidad,
      eliminarDelCarrito, vaciarCarrito, total, totalArticulos,
      isCartOpen, abrirCarrito, cerrarCarrito,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de un CartProvider");
  return ctx;
};