import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// 1. Función para REGISTRAR un usuario con Empresa y Rol
export const registrarUsuario = async (email: string, pass: string, nombre: string, empresa: string, rol: "cliente" | "admin") => {
  try {
    // Crea el usuario en el sistema de autenticación
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Crea el documento en la colección "usuarios" que hicimos en Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      nombre: nombre,
      email: email,
      empresa: empresa,
      rol: rol,
      fechaCreacion: new Date()
    });

    return { uid: user.uid, rol };
  } catch (error) {
    throw error;
  }
};

// 2. Función para INICIAR SESIÓN
export const loginUsuario = async (email: string, pass: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Buscamos el rol del usuario en Firestore para saber a dónde mandarlo
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);
    
    return { uid: user.uid, ...docSnap.data() };
  } catch (error) {
    throw error;
  }
};

// 3. Función para CERRAR SESIÓN
export const cerrarSesion = () => signOut(auth);