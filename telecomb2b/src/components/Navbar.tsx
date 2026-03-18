// "use client";
// import { useEffect, useState, useRef } from "react";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
// import { doc, onSnapshot, collection, query, where, limit } from "firebase/firestore";
// import {
//   ChevronDown, User, LogOut, ShoppingCart,
//   ShieldCheck, UserPlus, LayoutGrid, Building, Mail,
//   Settings, Package, FileText, CreditCard, Bell,
//   Globe, Menu, X, Sparkles, Star, Check,
//   Truck, AlertCircle, Info
// } from "lucide-react";
// import { useCart } from "@/context/CartContext";
// import { useLanguage } from "@/context/LanguageContext";
// import MiniCart from "./MiniCart";

// const C = {
//   purple:     "#9851F9",
//   purpleDark: "#7c3aed",
//   orange:     "#FF6600",
//   yellow:     "#F6FA00",
//   gold:       "#FFD700",
//   goldLight:  "#FFF176",
//   green:      "#28FB4B",
//   black:      "#000000",
//   white:      "#FFFFFF",
//   w10: "rgba(255,255,255,0.10)",
//   w15: "rgba(255,255,255,0.15)",
//   w20: "rgba(255,255,255,0.20)",
//   w60: "rgba(255,255,255,0.60)",
//   w80: "rgba(255,255,255,0.80)",
// } as const;

// interface Notif {
//   id: string;
//   tipo: "pedido_nuevo" | "pedido_enviado" | "pedido_entregado" | "pedido_cancelado" | "sistema";
//   titulo: string;
//   mensaje: string;
//   fecha: Date;
//   leida: boolean;
//   pedidoId?: string;
// }

// const tiempoRelativo = (d: Date) => {
//   const s = (Date.now() - d.getTime()) / 1000;
//   if (s < 60)    return "ahora mismo";
//   if (s < 3600)  return `hace ${Math.floor(s / 60)} min`;
//   if (s < 86400) return `hace ${Math.floor(s / 3600)}h`;
//   return `hace ${Math.floor(s / 86400)} días`;
// };

// const NotifIcon = ({ tipo }: { tipo: Notif["tipo"] }) => {
//   const map: Record<string, { icon: any; color: string }> = {
//     pedido_nuevo:     { icon: Package,     color: C.purple  },
//     pedido_enviado:   { icon: Truck,       color: C.green   },
//     pedido_entregado: { icon: Check,       color: C.green   },
//     pedido_cancelado: { icon: AlertCircle, color: "#ef4444" },
//     sistema:          { icon: Info,        color: C.gold    },
//   };
//   const { icon: Icon, color } = map[tipo] ?? map.sistema;
//   return (
//     <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
//       style={{ background: `${color}22` }}>
//       <Icon size={14} style={{ color }} />
//     </div>
//   );
// };

// const LogoWaly = () => {
//   const [hov, setHov] = useState(false);
//   return (
//     <Link href="/" className="flex items-center gap-2.5 select-none"
//       onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
//       <div className="relative w-10 h-10 shrink-0">
//         <div className="logo-spin absolute inset-0 rounded-xl" />
//         <div className="absolute inset-[2px] flex items-center justify-center rounded-[10px] transition-all duration-300"
//           style={{
//             background: `linear-gradient(135deg,${C.orange},${C.yellow})`,
//             boxShadow: hov
//               ? `0 5px 16px ${C.orange}60,inset 0 1px 0 rgba(255,255,255,0.4)`
//               : `0 2px 8px ${C.orange}40,inset 0 1px 0 rgba(255,255,255,0.3)`,
//             transform: hov ? "translateY(-2px) rotateX(6deg)" : "translateY(0)",
//           }}>
//           <div className="absolute inset-0 rounded-[10px]"
//             style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.35) 0%,transparent 60%)" }} />
//           <Sparkles size={18} style={{
//             color: C.black,
//             filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))",
//             transition: "transform 0.3s",
//             transform: hov ? "rotate(20deg) scale(1.1)" : "none",
//           }} />
//         </div>
//       </div>
//       <div className="flex flex-col leading-none">
//         <span className="font-black uppercase tracking-tight transition-all duration-300"
//           style={{
//             fontSize: "16px", color: C.white, letterSpacing: "-0.03em",
//             textShadow: hov
//               ? `0 2px 0 rgba(0,0,0,0.3),0 0 20px ${C.gold}50`
//               : `0 2px 0 rgba(0,0,0,0.25)`,
//             transform: hov ? "translateY(-1px)" : "translateY(0)",
//           }}>
//           TIENDAS{" "}
//           <span style={{
//             backgroundImage: `linear-gradient(135deg,${C.gold},${C.goldLight},${C.orange})`,
//             WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
//           }}>WALY</span>
//         </span>
//         <span style={{
//           fontSize: "7px", color: C.w60, letterSpacing: "0.22em",
//           fontWeight: 700, marginTop: "1px", textTransform: "uppercase",
//         }}>
//           Plataforma B2B
//         </span>
//       </div>
//       <style jsx>{`
//         .logo-spin {
//           background: conic-gradient(from 0deg,#FFD700,#FFF176,#FF6600,#FFD700,#FFF176,#FFD700);
//           border-radius: 13px;
//           animation: lspin 2.5s linear infinite;
//         }
//         @keyframes lspin { to { transform: rotate(360deg); } }
//       `}</style>
//     </Link>
//   );
// };

// const getInitials = (n: string) =>
//   n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

// export default function Navbar() {
//   const pathname = usePathname();
//   const router   = useRouter();
//   const { totalArticulos, abrirCarrito } = useCart();
//   const { language, setLanguage, t }     = useLanguage();

//   const [usuario,    setUsuario]    = useState<FirebaseUser | null>(null);
//   const [datosExtra, setDatosExtra] = useState<any>(null);
//   const [menuOpen,   setMenuOpen]   = useState(false);
//   const [mobileOpen, setMobileOpen] = useState(false);
//   const [scrolled,   setScrolled]   = useState(false);
//   const [notifOpen,  setNotifOpen]  = useState(false);
//   const [notifs,     setNotifs]     = useState<Notif[]>([]);
//   const [stars,      setStars]      = useState<{ x:number; y:number; s:number; o:number; d:number }[]>([]);

//   const menuRef  = useRef<HTMLDivElement>(null);
//   const notifRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     setStars(Array.from({ length: 70 }, () => ({
//       x: Math.random() * 100, y: Math.random() * 100,
//       s: Math.random() * 1.8 + 0.3,
//       o: Math.random() * 0.55 + 0.15,
//       d: Math.random() * 3 + 1.5,
//     })));
//   }, []);

//   useEffect(() => {
//     const fn = () => setScrolled(window.scrollY > 8);
//     window.addEventListener("scroll", fn);
//     return () => window.removeEventListener("scroll", fn);
//   }, []);

//   useEffect(() => {
//     const fn = (e: MouseEvent) => {
//       if (menuRef.current  && !menuRef.current.contains(e.target as Node))  setMenuOpen(false);
//       if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
//     };
//     document.addEventListener("mousedown", fn);
//     return () => document.removeEventListener("mousedown", fn);
//   }, []);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, user => {
//       setUsuario(user);
//       if (!user) { setDatosExtra(null); setNotifs([]); return; }

//       /* ── Datos del usuario ── */
//       const unsubDoc = onSnapshot(doc(db, "usuarios", user.uid), snap => {
//         setDatosExtra(snap.exists() ? snap.data() : null);
//       });

//       /* ── Pedidos: SIN orderBy para evitar índice compuesto ──
//          Ordenamos en el cliente después de recibir los datos      */
//       const q = query(
//         collection(db, "pedidos"),
//         where("clienteId", "==", user.uid),
//         limit(30)                           // ← solo where + limit = sin índice
//       );

//       const unsubPedidos = onSnapshot(q,
//         snap => {
//           /* Ordenar por fecha descendente en el cliente */
//           const docs = [...snap.docs].sort((a, b) => {
//             const fa = a.data().fecha?.toDate?.()?.getTime() ?? 0;
//             const fb = b.data().fecha?.toDate?.()?.getTime() ?? 0;
//             return fb - fa;
//           });

//           const arr: Notif[] = [];
//           const now = Date.now();

//           docs.forEach(d => {
//             const data  = d.data();
//             const fecha = data.fecha?.toDate ? data.fecha.toDate() : new Date();
//             const est   = (data.estado || "").toLowerCase();
//             const num   = `#${d.id.slice(0, 8).toUpperCase()}`;

//             if (now - fecha.getTime() < 86400000)
//               arr.push({
//                 id: `n-${d.id}`, tipo: "pedido_nuevo",
//                 titulo: "Pedido recibido",
//                 mensaje: `Tu pedido ${num} fue registrado`,
//                 fecha, leida: false, pedidoId: d.id,
//               });

//             if (est === "enviado" || est === "en camino")
//               arr.push({
//                 id: `e-${d.id}`, tipo: "pedido_enviado",
//                 titulo: "¡Pedido en camino!",
//                 mensaje: `Pedido ${num} fue despachado`,
//                 fecha, leida: false, pedidoId: d.id,
//               });

//             if (est === "entregado")
//               arr.push({
//                 id: `ent-${d.id}`, tipo: "pedido_entregado",
//                 titulo: "Pedido entregado ✓",
//                 mensaje: `Pedido ${num} entregado exitosamente`,
//                 fecha, leida: true, pedidoId: d.id,
//               });

//             if (est === "cancelado")
//               arr.push({
//                 id: `c-${d.id}`, tipo: "pedido_cancelado",
//                 titulo: "Pedido cancelado",
//                 mensaje: `Pedido ${num} fue cancelado`,
//                 fecha, leida: false, pedidoId: d.id,
//               });
//           });

//           arr.push({
//             id: "sis-1", tipo: "sistema",
//             titulo: "Catálogo actualizado",
//             mensaje: "Nuevos modelos disponibles en el catálogo mayorista",
//             fecha: new Date(), leida: true,
//           });

//           setNotifs(arr.slice(0, 15));
//         },
//         /* ── Manejo de error: si aún falla por índice, silencia y vacía ── */
//         (error) => {
//           console.warn("Navbar pedidos query:", error.message);
//           setNotifs([{
//             id: "sis-1", tipo: "sistema",
//             titulo: "Catálogo actualizado",
//             mensaje: "Nuevos modelos disponibles en el catálogo mayorista",
//             fecha: new Date(), leida: true,
//           }]);
//         }
//       );

//       return () => { unsubDoc(); unsubPedidos(); };
//     });
//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     const fn = (e: CustomEvent) => {
//       if (e.detail && e.detail !== language) setLanguage(e.detail);
//     };
//     window.addEventListener("languageChanged", fn as EventListener);
//     return () => window.removeEventListener("languageChanged", fn as EventListener);
//   }, [language, setLanguage]);

//   const handleLogout = async () => {
//     await signOut(auth);
//     setMenuOpen(false);
//     setMobileOpen(false);
//     router.push("/");
//   };

//   const marcarLeidas = () => setNotifs(p => p.map(n => ({ ...n, leida: true })));
//   const noLeidas = notifs.filter(n => !n.leida).length;

//   if (pathname.startsWith("/admin")) return null;

//   const nombre        = datosExtra?.nombre || usuario?.displayName || t("user.guest") || "Usuario";
//   const nombreEmpresa = datosExtra?.nombreComercial || datosExtra?.razonSocial || "";
//   const cargo         = datosExtra?.cargo || t("position.notAssigned") || "Sin cargo";
//   const rol           = datosExtra?.rol || "cliente";

//   const Btn = ({
//     onClick, children, badge, title = "",
//   }: {
//     onClick?: () => void; children: React.ReactNode; badge?: number; title?: string;
//   }) => (
//     <button onClick={onClick} title={title}
//       className="relative p-2 rounded-xl transition-all"
//       style={{ background: C.w10, color: C.white }}
//       onMouseEnter={e => (e.currentTarget.style.background = C.w20)}
//       onMouseLeave={e => (e.currentTarget.style.background = C.w10)}>
//       {children}
//       {!!badge && badge > 0 && (
//         <span className="absolute -top-1 -right-1 w-4 h-4 text-[8px] font-black rounded-full flex items-center justify-center"
//           style={{ background: C.orange, color: C.black }}>
//           {badge > 9 ? "9+" : badge}
//         </span>
//       )}
//     </button>
//   );

//   const MI = ({
//     href, icon: Icon, label, desc, onClick,
//   }: {
//     href?: string; icon: any; label: string; desc?: string; onClick?: () => void;
//   }) => {
//     const inner = (
//       <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer"
//         style={{ color: C.w80 }}
//         onMouseEnter={e => {
//           (e.currentTarget as HTMLElement).style.background = C.w15;
//           (e.currentTarget as HTMLElement).style.color = C.white;
//         }}
//         onMouseLeave={e => {
//           (e.currentTarget as HTMLElement).style.background = "transparent";
//           (e.currentTarget as HTMLElement).style.color = C.w80;
//         }}>
//         <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
//           style={{ background: C.w10 }}>
//           <Icon size={13} style={{ color: C.yellow }} />
//         </div>
//         <div>
//           <p className="text-sm font-semibold">{label}</p>
//           {desc && <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.32)" }}>{desc}</p>}
//         </div>
//       </div>
//     );
//     if (href) return (
//       <Link href={href} onClick={() => { setMenuOpen(false); setMobileOpen(false); }}>
//         {inner}
//       </Link>
//     );
//     return <button className="w-full text-left" onClick={onClick}>{inner}</button>;
//   };

//   return (
//     <>
//       <nav className="fixed top-0 left-0 w-full z-30 transition-all duration-300"
//         style={{
//           background: scrolled
//             ? "linear-gradient(135deg,#06010f 0%,#0d0520 40%,#100830 60%,#06010f 100%)"
//             : "linear-gradient(135deg,#06010f 0%,#0d0520 50%,#06010f 100%)",
//           boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.6)" : "none",
//           borderBottom: "1px solid rgba(255,255,255,0.05)",
//         }}>

//         {/* Fondo galaxia */}
//         <div className="absolute inset-0 pointer-events-none overflow-hidden">
//           {stars.map((s, i) => (
//             <div key={i} className="absolute rounded-full"
//               style={{
//                 left: `${s.x}%`, top: `${s.y}%`,
//                 width: `${s.s}px`, height: `${s.s}px`,
//                 background: C.white, opacity: s.o,
//                 animation: `star-twinkle ${s.d}s ease-in-out infinite`,
//                 animationDelay: `${(i * 0.1) % 3}s`,
//               }} />
//           ))}
//           <div className="absolute -top-8 left-1/4 w-56 h-28 rounded-full blur-[55px]"
//             style={{ background: `${C.purple}16` }} />
//           <div className="absolute -top-6 right-1/3 w-44 h-24 rounded-full blur-[45px]"
//             style={{ background: `${C.orange}0d` }} />
//           <div className="absolute top-0 left-0 right-0 h-px"
//             style={{ background: `linear-gradient(90deg,transparent,${C.gold}55,${C.orange}35,${C.gold}55,transparent)` }} />
//         </div>

//         <div className="max-w-7xl mx-auto px-4 sm:px-5 relative z-10">
//           <div className="flex items-center justify-between"
//             style={{ height: scrolled ? "52px" : "60px", transition: "height 0.3s" }}>

//             <LogoWaly />

//             <div />

//             <div className="flex items-center gap-1.5">

//               {/* Idioma */}
//               <button
//                 onClick={() => setLanguage(language === "es" ? "en" : "es")}
//                 className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
//                 style={{ background: C.w10, color: C.w80 }}
//                 onMouseEnter={e => {
//                   (e.currentTarget as HTMLElement).style.background = C.w20;
//                   (e.currentTarget as HTMLElement).style.color = C.white;
//                 }}
//                 onMouseLeave={e => {
//                   (e.currentTarget as HTMLElement).style.background = C.w10;
//                   (e.currentTarget as HTMLElement).style.color = C.w80;
//                 }}>
//                 <Globe size={12} style={{ color: C.yellow }} />
//                 {language === "es" ? "ES" : "EN"}
//               </button>

//               {/* Catálogo */}
//               <Link href="/catalogo"
//                 className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
//                 style={{
//                   color: pathname === "/catalogo" ? C.yellow : C.w80,
//                   background: pathname === "/catalogo" ? C.w15 : C.w10,
//                 }}
//                 onMouseEnter={e => {
//                   (e.currentTarget as HTMLElement).style.background = C.w20;
//                   (e.currentTarget as HTMLElement).style.color = C.white;
//                 }}
//                 onMouseLeave={e => {
//                   (e.currentTarget as HTMLElement).style.background = pathname === "/catalogo" ? C.w15 : C.w10;
//                   (e.currentTarget as HTMLElement).style.color = pathname === "/catalogo" ? C.yellow : C.w80;
//                 }}>
//                 <LayoutGrid size={13} />
//                 {t("nav.catalog") || "Catálogo"}
//               </Link>

//               {usuario ? (
//                 <>
//                   {/* Carrito */}
//                   <Btn onClick={abrirCarrito} badge={totalArticulos} title="Carrito">
//                     <ShoppingCart size={17} />
//                   </Btn>

//                   {/* Notificaciones */}
//                   <div className="relative" ref={notifRef}>
//                     <Btn onClick={() => setNotifOpen(!notifOpen)} badge={noLeidas} title="Notificaciones">
//                       <Bell size={17} style={{ animation: noLeidas > 0 ? "bell-ring 1.5s ease-in-out infinite" : "none" }} />
//                     </Btn>

//                     {notifOpen && (
//                       <>
//                         <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
//                         <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden border"
//                           style={{
//                             background: "linear-gradient(160deg,#06010f 0%,#0d0520 100%)",
//                             borderColor: "rgba(255,255,255,0.1)",
//                             boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
//                           }}>
//                           {/* Header notifs */}
//                           <div className="flex items-center justify-between px-4 py-3"
//                             style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
//                             <div className="flex items-center gap-2">
//                               <Bell size={14} style={{ color: C.yellow }} />
//                               <span className="text-sm font-black text-white">Notificaciones</span>
//                               {noLeidas > 0 && (
//                                 <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
//                                   style={{ background: C.orange, color: C.black }}>
//                                   {noLeidas}
//                                 </span>
//                               )}
//                             </div>
//                             {noLeidas > 0 && (
//                               <button onClick={marcarLeidas}
//                                 className="text-[10px] font-semibold transition-colors"
//                                 style={{ color: C.yellow }}
//                                 onMouseEnter={e => (e.currentTarget.style.color = C.white)}
//                                 onMouseLeave={e => (e.currentTarget.style.color = C.yellow)}>
//                                 Marcar leídas
//                               </button>
//                             )}
//                           </div>

//                           {/* Lista notifs */}
//                           <div className="max-h-72 overflow-y-auto">
//                             {notifs.length === 0 ? (
//                               <div className="p-6 text-center">
//                                 <Bell size={22} style={{ color: C.w60, margin: "0 auto 8px" }} />
//                                 <p className="text-sm" style={{ color: C.w60 }}>Sin notificaciones</p>
//                               </div>
//                             ) : notifs.map(n => (
//                               <div key={n.id}
//                                 onClick={() => {
//                                   setNotifs(p => p.map(x => x.id === n.id ? { ...x, leida: true } : x));
//                                   if (n.pedidoId) { setNotifOpen(false); router.push("/opciones/pedidos"); }
//                                 }}
//                                 className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all"
//                                 style={{
//                                   borderBottom: "1px solid rgba(255,255,255,0.04)",
//                                   background: n.leida ? "transparent" : `${C.purple}10`,
//                                   opacity: n.leida ? 0.6 : 1,
//                                 }}
//                                 onMouseEnter={e => (e.currentTarget.style.background = C.w10)}
//                                 onMouseLeave={e => (e.currentTarget.style.background = n.leida ? "transparent" : `${C.purple}10`)}>
//                                 <NotifIcon tipo={n.tipo} />
//                                 <div className="flex-1 min-w-0">
//                                   <p className="text-xs font-bold text-white">{n.titulo}</p>
//                                   <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: C.w60 }}>{n.mensaje}</p>
//                                   <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{tiempoRelativo(n.fecha)}</p>
//                                 </div>
//                                 {!n.leida && <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: C.orange }} />}
//                               </div>
//                             ))}
//                           </div>

//                           <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
//                             <Link href="/opciones/pedidos" onClick={() => setNotifOpen(false)}
//                               className="text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
//                               style={{ color: C.yellow }}
//                               onMouseEnter={e => (e.currentTarget.style.color = C.white)}
//                               onMouseLeave={e => (e.currentTarget.style.color = C.yellow)}>
//                               Ver todos mis pedidos →
//                             </Link>
//                           </div>
//                         </div>
//                       </>
//                     )}
//                   </div>

//                   {/* Avatar / menú usuario */}
//                   <div className="relative" ref={menuRef}>
//                     <button onClick={() => setMenuOpen(!menuOpen)}
//                       className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
//                       style={{ background: C.w10 }}
//                       onMouseEnter={e => (e.currentTarget.style.background = C.w20)}
//                       onMouseLeave={e => (e.currentTarget.style.background = menuOpen ? C.w20 : C.w10)}>
//                       <div className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
//                         style={{ border: `2px solid ${C.gold}` }}>
//                         {datosExtra?.fotoPerfil
//                           ? <img src={datosExtra.fotoPerfil} alt="av" className="w-full h-full object-cover" />
//                           : <div className="w-full h-full flex items-center justify-center text-xs font-black"
//                               style={{ background: `linear-gradient(135deg,${C.orange},${C.yellow})`, color: C.black }}>
//                               {getInitials(nombre)}
//                             </div>
//                         }
//                         {datosExtra?.verificado && (
//                           <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
//                             style={{ background: C.green }}>
//                             <ShieldCheck size={7} color={C.black} />
//                           </div>
//                         )}
//                       </div>
//                       <div className="hidden sm:flex flex-col items-start">
//                         <span className="text-xs font-black text-white truncate max-w-[85px]">{nombre}</span>
//                         <span className="text-[9px] truncate max-w-[85px]" style={{ color: C.w60 }}>{cargo}</span>
//                       </div>
//                       <ChevronDown size={12} style={{
//                         color: C.yellow,
//                         transform: menuOpen ? "rotate(180deg)" : "rotate(0)",
//                         transition: "transform 0.2s",
//                       }} />
//                     </button>

//                     {menuOpen && (
//                       <>
//                         <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
//                         <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden border"
//                           style={{
//                             background: "linear-gradient(160deg,#06010f 0%,#0d0520 100%)",
//                             borderColor: "rgba(255,255,255,0.1)",
//                             boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
//                           }}>
//                           {/* Header menú */}
//                           <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
//                             <div className="flex items-center gap-3">
//                               <div className="relative w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center"
//                                 style={{ border: `2px solid ${C.gold}` }}>
//                                 {datosExtra?.fotoPerfil
//                                   ? <img src={datosExtra.fotoPerfil} alt="av" className="w-full h-full object-cover" />
//                                   : <div className="w-full h-full flex items-center justify-center text-base font-black"
//                                       style={{ background: `linear-gradient(135deg,${C.orange},${C.yellow})`, color: C.black }}>
//                                       {getInitials(nombre)}
//                                     </div>
//                                 }
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <h3 className="text-sm font-black text-white truncate">{nombre}</h3>
//                                 {nombreEmpresa && (
//                                   <p className="text-xs truncate" style={{ color: C.w60 }}>{nombreEmpresa}</p>
//                                 )}
//                                 <div className="flex items-center gap-1.5 mt-1 flex-wrap">
//                                   <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
//                                     style={{ background: C.w10, color: C.w80 }}>
//                                     {cargo}
//                                   </span>
//                                   {datosExtra?.verificado && (
//                                     <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
//                                       style={{ background: `${C.green}22`, color: C.green }}>
//                                       <ShieldCheck size={8} /> Verificado
//                                     </span>
//                                   )}
//                                 </div>
//                               </div>
//                             </div>
//                             {usuario?.email && (
//                               <div className="flex items-center gap-1.5 mt-2.5 text-xs" style={{ color: C.w60 }}>
//                                 <Mail size={10} style={{ color: C.yellow }} />
//                                 <span className="truncate">{usuario.email}</span>
//                               </div>
//                             )}
//                           </div>

//                           {/* Items menú */}
//                           <div className="p-2">
//                             <MI href="/opciones/perfil"        icon={User}       label={t("menu.profile")    || "Mi Perfil"}      desc={t("menu.profileDescription")    || "Ver y editar tu perfil"} />
//                             <MI href="/opciones/empresa"       icon={Building}   label={t("menu.company")    || "Mi Empresa"}     desc={t("menu.companyDescription")    || "Gestionar datos B2B"} />
//                             <MI href="/opciones/pedidos"       icon={Package}    label={t("menu.orders")     || "Mis Pedidos"}    desc={t("menu.ordersDescription")     || "Historial de compras"} />
//                             <MI href="/opciones/cotizaciones"  icon={FileText}   label={t("menu.quotations") || "Cotizaciones"}   desc={t("menu.quotationsDescription") || "Gestionar cotizaciones"} />
//                             <MI href="/opciones/facturacion"   icon={CreditCard} label={t("menu.billing")    || "Facturación"}    desc={t("menu.billingDescription")    || "Facturas y comprobantes"} />
//                             <div style={{ margin: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }} />
//                             <MI href="/opciones/configuracion" icon={Settings}   label={t("menu.settings")   || "Configuración"}  desc={t("menu.settingsDescription")   || "Ajustes de cuenta"} />
//                             {rol === "admin" && (
//                               <MI href="/admin" icon={Star} label={t("menu.adminPanel") || "Panel Admin"} desc="Gestión del sistema" />
//                             )}
//                             <button onClick={handleLogout}
//                               className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-1 transition-all"
//                               style={{ color: "#fca5a5" }}
//                               onMouseEnter={e => {
//                                 (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
//                                 (e.currentTarget as HTMLElement).style.color = "#f87171";
//                               }}
//                               onMouseLeave={e => {
//                                 (e.currentTarget as HTMLElement).style.background = "transparent";
//                                 (e.currentTarget as HTMLElement).style.color = "#fca5a5";
//                               }}>
//                               <div className="w-7 h-7 rounded-lg flex items-center justify-center"
//                                 style={{ background: "rgba(239,68,68,0.12)" }}>
//                                 <LogOut size={12} style={{ color: "#f87171" }} />
//                               </div>
//                               <div>
//                                 <p className="text-sm font-semibold">{t("auth.logout") || "Cerrar Sesión"}</p>
//                                 <p className="text-[10px]" style={{ color: "rgba(252,165,165,0.45)" }}>Salir de tu cuenta</p>
//                               </div>
//                             </button>
//                           </div>
//                         </div>
//                       </>
//                     )}
//                   </div>
//                 </>
//               ) : (
//                 <div className="hidden sm:flex items-center gap-1.5">
//                   <Link href="/login"
//                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
//                     style={{ background: C.w15, color: C.white }}
//                     onMouseEnter={e => (e.currentTarget.style.background = C.w20)}
//                     onMouseLeave={e => (e.currentTarget.style.background = C.w15)}>
//                     <ShieldCheck size={12} style={{ color: C.green }} />
//                     {t("auth.access") || "Acceder"}
//                   </Link>
//                   <Link href="/register"
//                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
//                     style={{ background: `linear-gradient(135deg,${C.orange},${C.yellow})`, color: C.black }}>
//                     <UserPlus size={12} />
//                     {t("auth.register") || "Registrarse"}
//                   </Link>
//                 </div>
//               )}

//               {/* Botón móvil */}
//               <button onClick={() => setMobileOpen(!mobileOpen)}
//                 className="lg:hidden p-2 rounded-xl transition-all"
//                 style={{ background: C.w10, color: C.white }}
//                 onMouseEnter={e => (e.currentTarget.style.background = C.w20)}
//                 onMouseLeave={e => (e.currentTarget.style.background = C.w10)}>
//                 {mobileOpen ? <X size={17} /> : <Menu size={17} />}
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Menú móvil */}
//         {mobileOpen && (
//           <div className="lg:hidden border-t"
//             style={{ background: "rgba(6,1,15,0.97)", borderColor: "rgba(255,255,255,0.05)" }}>
//             <div className="px-4 py-3 space-y-2">
//               <Link href="/catalogo" onClick={() => setMobileOpen(false)}
//                 className="flex items-center gap-3 px-4 py-3 rounded-xl"
//                 style={{ background: C.w10, color: C.white }}>
//                 <LayoutGrid size={14} style={{ color: C.yellow }} />
//                 <span className="text-sm font-bold">Catálogo</span>
//               </Link>
//               {!usuario && (
//                 <>
//                   <Link href="/login" onClick={() => setMobileOpen(false)}
//                     className="flex items-center gap-3 px-4 py-3 rounded-xl"
//                     style={{ background: C.w10, color: C.white }}>
//                     <ShieldCheck size={14} style={{ color: C.green }} />
//                     <span className="text-sm font-bold">Acceder</span>
//                   </Link>
//                   <Link href="/register" onClick={() => setMobileOpen(false)}
//                     className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black"
//                     style={{ background: `linear-gradient(135deg,${C.orange},${C.yellow})`, color: C.black }}>
//                     <UserPlus size={14} /> Registrarse
//                   </Link>
//                 </>
//               )}
//               {usuario && (
//                 <button onClick={handleLogout}
//                   className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
//                   style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>
//                   <LogOut size={14} />
//                   <span className="text-sm font-bold">Cerrar Sesión</span>
//                 </button>
//               )}
//             </div>
//           </div>
//         )}

//         <style jsx global>{`
//           @keyframes star-twinkle {
//             0%,100% { opacity: inherit; transform: scale(1); }
//             50%      { opacity: 0.05;   transform: scale(0.3); }
//           }
//           @keyframes bell-ring {
//             0%,100% { transform: rotate(0); }
//             10%     { transform: rotate(18deg); }
//             20%     { transform: rotate(-14deg); }
//             30%     { transform: rotate(10deg); }
//             40%     { transform: rotate(-5deg); }
//             50%     { transform: rotate(0); }
//           }
//         `}</style>
//       </nav>

//       <div className="h-16" />
//       <MiniCart />
//     </>
//   );
// }