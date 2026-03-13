// "use client";
// import { useEffect, useState, ChangeEvent } from "react";
// import { auth, db } from "@/lib/firebase";
// import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
// import { User, Camera, Mail, Building2, Briefcase, ShieldCheck, X, Check, Pencil } from "lucide-react";
// import { Inter } from "next/font/google";
// import { useRouter } from "next/navigation";

// const inter = Inter({ subsets: ["latin"] });

// export default function PerfilCliente() {
//   const [datos, setDatos] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [uploading, setUploading] = useState(false);
//   const [editando, setEditando] = useState(false);
//   const [form, setForm] = useState({ nombre: "", empresa: "" });
//   const [isVisible, setIsVisible] = useState(true);
//   const router = useRouter();

//   useEffect(() => {
//     const user = auth.currentUser;
//     if (user) {
//       // Escuchar cambios en tiempo real
//       const unsub = onSnapshot(doc(db, "usuarios", user.uid), (docSnap) => {
//         if (docSnap.exists()) {
//           const data = docSnap.data();
//           setDatos(data);
//           setForm({ nombre: data.nombre || "", empresa: data.empresa || "" });
//         }
//         setLoading(false);
//       });
//       return () => unsub();
//     }
//   }, []);

//   const handleClose = () => {
//     setIsVisible(false);
//     setTimeout(() => router.push("/catalogo"), 300);
//   };

//   const guardarCambios = async () => {
//     const user = auth.currentUser;
//     if (user) {
//       setUploading(true);
//       await updateDoc(doc(db, "usuarios", user.uid), {
//         nombre: form.nombre,
//         empresa: form.empresa
//       });
//       setEditando(false);
//       setUploading(false);
//     }
//   };

//   const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setUploading(true);
//     const reader = new FileReader();
//     reader.onloadend = async () => {
//       const base64String = reader.result as string;
//       const user = auth.currentUser;
//       if (user) {
//         await updateDoc(doc(db, "usuarios", user.uid), { fotoPerfil: base64String });
//       }
//       setUploading(false);
//     };
//     reader.readAsDataURL(file);
//   };

//   if (loading) return (
//     <div className="min-h-screen bg-slate-950 flex items-center justify-center">
//       <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//     </div>
//   );

//   if (!isVisible) return null;

//   return (
//     <div className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${inter.className} transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      
//       {/* Fondo de desenfoque oscuro (Capa de profundidad) */}
//       <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={handleClose}></div>

//       <div className="w-full max-w-sm relative animate-in fade-in zoom-in duration-300">
        
//         {/* Contenedor Principal (Menos invisible, más definido) */}
//         <div className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden">
          
//           {/* Botón Cerrar */}
//           <button onClick={handleClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
//             <X size={18} />
//           </button>

//           <div className="flex flex-col items-center text-center">
//             {/* Avatar con Indicador de Carga */}
//             <div className="relative mb-6">
//               <div className="h-24 w-24 rounded-3xl overflow-hidden bg-slate-800 border-2 border-blue-500/30 flex items-center justify-center shadow-2xl">
//                 {uploading ? (
//                   <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//                 ) : (
//                   <img src={datos?.fotoPerfil || "/default-avatar.png"} alt="Perfil" className="h-full w-full object-cover" />
//                 )}
//               </div>
//               <label className="absolute -bottom-2 -right-2 p-2.5 bg-blue-600 rounded-xl cursor-pointer hover:bg-blue-500 shadow-lg border-2 border-slate-900 transition-transform active:scale-90">
//                 <Camera size={14} className="text-white" />
//                 <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
//               </label>
//             </div>

//             <div className="mb-6">
//               <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">
//                 Socio<span className="text-blue-500">Telecom</span>
//               </h2>
//               <div className="flex items-center justify-center gap-1.5 mt-1">
//                 <ShieldCheck size={12} className="text-blue-400" />
//                 <span className="text-[9px] font-black uppercase tracking-widest text-blue-400/80">Business Verified</span>
//               </div>
//             </div>
//           </div>

//           {/* Formulario / Lista de Datos */}
//           <div className="space-y-3">
//             {/* CAMPO NOMBRE */}
//             <div className={`p-4 rounded-2xl border transition-all ${editando ? 'bg-blue-500/5 border-blue-500/50' : 'bg-white/5 border-white/5'}`}>
//               <div className="flex items-center gap-3 mb-1">
//                 <Briefcase size={14} className="text-slate-500" />
//                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Representante</p>
//               </div>
//               {editando ? (
//                 <input 
//                   className="bg-transparent border-none text-sm font-bold text-white w-full outline-none p-0 focus:ring-0"
//                   value={form.nombre}
//                   onChange={(e) => setForm({...form, nombre: e.target.value})}
//                   autoFocus
//                 />
//               ) : (
//                 <p className="text-sm font-bold text-slate-200">{datos?.nombre || "Sin nombre"}</p>
//               )}
//             </div>

//             {/* CAMPO EMPRESA */}
//             <div className={`p-4 rounded-2xl border transition-all ${editando ? 'bg-blue-500/5 border-blue-500/50' : 'bg-white/5 border-white/5'}`}>
//               <div className="flex items-center gap-3 mb-1">
//                 <Building2 size={14} className="text-slate-500" />
//                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Empresa</p>
//               </div>
//               {editando ? (
//                 <input 
//                   className="bg-transparent border-none text-sm font-bold text-blue-400 w-full outline-none p-0 focus:ring-0"
//                   value={form.empresa}
//                   onChange={(e) => setForm({...form, empresa: e.target.value})}
//                 />
//               ) : (
//                 <p className="text-sm font-bold text-blue-400">{datos?.empresa || "No asignada"}</p>
//               )}
//             </div>

//             {/* CAMPO EMAIL (Bloqueado) */}
//             <div className="p-4 bg-white/5 border border-white/5 rounded-2xl opacity-50">
//               <div className="flex items-center gap-3 mb-1">
//                 <Mail size={14} className="text-slate-500" />
//                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Email Corporativo</p>
//               </div>
//               <p className="text-sm font-bold truncate text-slate-300">{datos?.email}</p>
//             </div>
//           </div>

//           {/* BOTÓN DINÁMICO */}
//           <button 
//             onClick={editando ? guardarCambios : () => setEditando(true)}
//             className={`w-full mt-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl ${
//               editando 
//               ? "bg-green-600 hover:bg-green-500 text-white shadow-green-900/20" 
//               : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40"
//             }`}
//           >
//             {editando ? (
//               <><Check size={16} /> Confirmar Cambios</>
//             ) : (
//               <><Pencil size={14} /> Gestionar Credenciales</>
//             )}
//           </button>

//         </div>
//       </div>
//     </div>
//   );
// }