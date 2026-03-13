import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase";

// --- FUNCIONES PARA PRODUCTOS ---

// 1. Crear un producto (Solo para el Admin)
export const crearProducto = async (datos: any) => {
  try {
    const docRef = await addDoc(collection(db, "productos"), {
      ...datos,
      activo: true,
      fechaCreacion: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al crear producto:", error);
  }
};

// 2. Obtener todos los productos (Para el Catálogo)
export const obtenerProductos = async () => {
  const querySnapshot = await getDocs(collection(db, "productos"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- FUNCIONES PARA PEDIDOS ---

// 3. Crear un pedido (Para el Checkout del Cliente)
export const crearPedido = async (datosPedido: any) => {
  try {
    const docRef = await addDoc(collection(db, "pedidos"), {
      ...datosPedido,
      fechaCreacion: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al crear pedido:", error);
  }
};