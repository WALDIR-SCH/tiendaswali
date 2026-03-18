"use client";
// src/app/layout.tsx

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, limit } from "firebase/firestore";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import MiniCart from "@/components/MiniCart";
import {
  ChevronDown, User, LogOut, ShoppingCart,
  ShieldCheck, UserPlus, LayoutGrid, Building, Mail,
  Settings, Package, FileText, CreditCard, Bell,
  Globe, Menu, X, Star, Check,
  Truck, AlertCircle, Info, Search,
} from "lucide-react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const V = "#7c3aed";
const O = "#FF6600";
const G = "#28FB4B";

interface Notif {
  id: string;
  tipo: "pedido_nuevo"|"pedido_enviado"|"pedido_entregado"|"pedido_cancelado"|"sistema";
  titulo: string; mensaje: string; fecha: Date; leida: boolean; pedidoId?: string;
}

const tiempoRelativo = (d: Date) => {
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "ahora mismo";
  if (s < 3600) return `hace ${Math.floor(s/60)} min`;
  if (s < 86400) return `hace ${Math.floor(s/3600)}h`;
  return `hace ${Math.floor(s/86400)} días`;
};
const getInitials = (n: string) => n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

const NotifIcon = ({ tipo }: { tipo: Notif["tipo"] }) => {
  const map: Record<string,{icon:any;color:string}> = {
    pedido_nuevo:{icon:Package,color:V}, pedido_enviado:{icon:Truck,color:G},
    pedido_entregado:{icon:Check,color:G}, pedido_cancelado:{icon:AlertCircle,color:"#ef4444"},
    sistema:{icon:Info,color:O},
  };
  const {icon:Icon,color} = map[tipo]??map.sistema;
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{background:`${color}18`}}>
      <Icon size={14} style={{color}}/>
    </div>
  );
};

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const Logo = () => {
  const [hov, setHov] = useState(false);
  return (
    <Link href="/" className="flex items-center gap-3 shrink-0 select-none"
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>

      {/* Icono limpio */}
      <div className="shrink-0 transition-transform duration-300" style={{ transform: hov ? "scale(1.1)" : "scale(1)" }}>
        <img
          src="/images/icono.ico"
          alt="Mundo Móvil"
          style={{ width:"44px", height:"44px", objectFit:"contain" }}
          onError={e=>{
            const el = e.target as HTMLImageElement;
            el.style.display="none";
            const sp = document.createElement("span");
            sp.style.fontSize="30px";
            sp.textContent="📱";
            el.parentElement?.appendChild(sp);
          }}
        />
      </div>

      {/* Texto — colores sólidos, siempre visible */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-0" style={{ lineHeight: 1 }}>
          <span style={{
            fontSize: "18px",
            fontWeight: 900,
            color: "#111827",
            letterSpacing: "-0.03em",
            transition: "color 0.2s",
            ...(hov && { color: "#374151" }),
          }}>
            MUNDO&nbsp;
          </span>
          <span style={{
            fontSize: "18px",
            fontWeight: 900,
            color: V,
            letterSpacing: "-0.03em",
          }}>
            MÓVIL
          </span>
        </div>
        <span style={{
          fontSize: "8px",
          color: "#9ca3af",
          letterSpacing: "0.25em",
          fontWeight: 700,
          marginTop: "3px",
          textTransform: "uppercase" as const,
        }}>
          Smartphones
        </span>
      </div>
    </Link>
  );
};

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { totalArticulos, abrirCarrito } = useCart();
  const { language, setLanguage, t }     = useLanguage();

  const [usuario,    setUsuario]    = useState<FirebaseUser|null>(null);
  const [datosExtra, setDatosExtra] = useState<any>(null);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [notifs,     setNotifs]     = useState<Notif[]>([]);
  const [search,     setSearch]     = useState("");

  const menuRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>4);
    window.addEventListener("scroll",fn);
    return ()=>window.removeEventListener("scroll",fn);
  },[]);

  useEffect(()=>{
    const fn=(e:MouseEvent)=>{
      if(menuRef.current&&!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if(notifRef.current&&!notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown",fn);
    return ()=>document.removeEventListener("mousedown",fn);
  },[]);

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,user=>{
      setUsuario(user);
      if(!user){setDatosExtra(null);setNotifs([]);return;}
      const unsubDoc=onSnapshot(doc(db,"usuarios",user.uid),snap=>{setDatosExtra(snap.exists()?snap.data():null);});
      const q=query(collection(db,"pedidos"),where("clienteId","==",user.uid),limit(30));
      const unsubP=onSnapshot(q,snap=>{
        const docs=[...snap.docs].sort((a,b)=>{
          const fa=a.data().fecha?.toDate?.()?.getTime()??0;
          const fb=b.data().fecha?.toDate?.()?.getTime()??0;
          return fb-fa;
        });
        const arr:Notif[]=[];
        const now=Date.now();
        docs.forEach(d=>{
          const data=d.data();
          const fecha=data.fecha?.toDate?data.fecha.toDate():new Date();
          const est=(data.estado||"").toLowerCase();
          const num=`#${d.id.slice(0,8).toUpperCase()}`;
          if(now-fecha.getTime()<86400000) arr.push({id:`n-${d.id}`,tipo:"pedido_nuevo",titulo:"Pedido recibido",mensaje:`Tu pedido ${num} fue registrado`,fecha,leida:false,pedidoId:d.id});
          if(est==="enviado"||est==="en camino") arr.push({id:`e-${d.id}`,tipo:"pedido_enviado",titulo:"¡Pedido en camino!",mensaje:`Pedido ${num} fue despachado`,fecha,leida:false,pedidoId:d.id});
          if(est==="entregado") arr.push({id:`ent-${d.id}`,tipo:"pedido_entregado",titulo:"Pedido entregado ✓",mensaje:`Pedido ${num} entregado`,fecha,leida:true,pedidoId:d.id});
          if(est==="cancelado") arr.push({id:`c-${d.id}`,tipo:"pedido_cancelado",titulo:"Pedido cancelado",mensaje:`Pedido ${num} fue cancelado`,fecha,leida:false,pedidoId:d.id});
        });
        arr.push({id:"sis-1",tipo:"sistema",titulo:"Catálogo actualizado",mensaje:"Nuevos modelos disponibles",fecha:new Date(),leida:true});
        setNotifs(arr.slice(0,15));
      },err=>{
        console.warn("Navbar:",err.message);
        setNotifs([{id:"sis-1",tipo:"sistema",titulo:"Catálogo actualizado",mensaje:"Nuevos modelos disponibles",fecha:new Date(),leida:true}]);
      });
      return ()=>{unsubDoc();unsubP();};
    });
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    const fn=(e:CustomEvent)=>{if(e.detail&&e.detail!==language)setLanguage(e.detail);};
    window.addEventListener("languageChanged",fn as EventListener);
    return ()=>window.removeEventListener("languageChanged",fn as EventListener);
  },[language,setLanguage]);

  const handleLogout=async()=>{await signOut(auth);setMenuOpen(false);setMobileOpen(false);router.push("/");};
  const marcarLeidas=()=>setNotifs(p=>p.map(n=>({...n,leida:true})));
  const noLeidas=notifs.filter(n=>!n.leida).length;
  const toggleLang=()=>setLanguage(language==="es"?"en":"es");

  if(pathname.startsWith("/admin")) return null;

  const nombre=datosExtra?.nombre||usuario?.displayName||"Usuario";
  const nombreEmpresa=datosExtra?.nombreComercial||datosExtra?.razonSocial||"";
  const cargo=datosExtra?.cargo||"Cliente";
  const rol=datosExtra?.rol||"cliente";

  const dropStyle:React.CSSProperties={
    background:"#ffffff", border:"1px solid #e5e7eb",
    boxShadow:"0 20px 60px rgba(0,0,0,0.10),0 4px 16px rgba(124,58,237,0.06)",
    borderRadius:"16px",
  };

  const MI=({href,icon:Icon,label,desc,onClick,danger}:{href?:string;icon:any;label:string;desc?:string;onClick?:()=>void;danger?:boolean})=>{
    const inner=(
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${danger?"hover:bg-red-50":"hover:bg-violet-50"}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:danger?"#fee2e2":"#f5f3ff"}}>
          <Icon size={14} style={{color:danger?"#ef4444":V}}/>
        </div>
        <div>
          <p className={`text-sm font-semibold ${danger?"text-red-600":"text-gray-800"}`}>{label}</p>
          {desc&&<p className="text-[11px] text-gray-400">{desc}</p>}
        </div>
      </div>
    );
    if(href) return <Link href={href} onClick={()=>{setMenuOpen(false);setMobileOpen(false);}}>{inner}</Link>;
    return <button className="w-full text-left" onClick={onClick}>{inner}</button>;
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-30 transition-all duration-200"
        style={{
          background:"#ffffff",
          borderBottom: scrolled?"1px solid #e5e7eb":"1px solid #f3f4f6",
          boxShadow: scrolled?"0 2px 20px rgba(0,0,0,0.07)":"none",
        }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4" style={{height:"66px"}}>

            <Logo/>

            {/* Buscador */}
            <div className="hidden md:flex flex-1 max-w-xl relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <input type="text"
                placeholder={language==="es"?"Buscar celular, marca o modelo...":"Search phone, brand or model..."}
                value={search} onChange={e=>setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"/>
            </div>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {usuario&&(
                <Link href="/catalogo"
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${pathname==="/catalogo"?"bg-violet-50 text-violet-700":"text-gray-600 hover:text-violet-700 hover:bg-violet-50"}`}>
                  {language==="es"?"Catálogo":"Catalog"}
                </Link>
              )}
              <a href="#marcas" className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-violet-700 hover:bg-violet-50 transition-all">
                {language==="es"?"Marcas":"Brands"}
              </a>
              <a href="#servicios" className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-violet-700 hover:bg-violet-50 transition-all">
                {language==="es"?"Servicios":"Services"}
              </a>
            </nav>

            {/* Acciones */}
            <div className="flex items-center gap-2 ml-auto md:ml-0">
              {/* Idioma */}
              <button onClick={toggleLang}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-200">
                <Globe className="w-3.5 h-3.5" style={{color:V}}/>
                {language==="es"?"ES":"EN"}
              </button>

              {usuario?(
                <>
                  {/* Carrito */}
                  <button onClick={abrirCarrito} className="relative p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-all">
                    <ShoppingCart className="w-5 h-5"/>
                    {totalArticulos>0&&(
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-black rounded-full flex items-center justify-center text-white" style={{background:O}}>{totalArticulos>9?"9+":totalArticulos}</span>
                    )}
                  </button>

                  {/* Notificaciones */}
                  <div className="relative" ref={notifRef}>
                    <button onClick={()=>setNotifOpen(!notifOpen)} className="relative p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-all">
                      <Bell className="w-5 h-5" style={{animation:noLeidas>0?"bell-ring 2s ease-in-out infinite":"none"}}/>
                      {noLeidas>0&&<span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-black rounded-full flex items-center justify-center text-white" style={{background:O}}>{noLeidas>9?"9+":noLeidas}</span>}
                    </button>
                    {notifOpen&&(
                      <>
                        <div className="fixed inset-0 z-40" onClick={()=>setNotifOpen(false)}/>
                        <div className="absolute right-0 mt-2 w-80 z-50 overflow-hidden" style={dropStyle}>
                          <div className="flex items-center justify-between px-4 py-3" style={{borderBottom:"1px solid #f3f4f6"}}>
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4" style={{color:V}}/>
                              <span className="text-sm font-black text-gray-900">{language==="es"?"Notificaciones":"Notifications"}</span>
                              {noLeidas>0&&<span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{background:O}}>{noLeidas}</span>}
                            </div>
                            {noLeidas>0&&<button onClick={marcarLeidas} className="text-[11px] font-semibold hover:underline" style={{color:V}}>{language==="es"?"Marcar leídas":"Mark as read"}</button>}
                          </div>
                          <div className="max-h-72 overflow-y-auto">
                            {notifs.length===0
                              ?<div className="p-6 text-center"><Bell className="w-6 h-6 text-gray-300 mx-auto mb-2"/><p className="text-sm text-gray-400">{language==="es"?"Sin notificaciones":"No notifications"}</p></div>
                              :notifs.map(n=>(
                              <div key={n.id}
                                onClick={()=>{setNotifs(p=>p.map(x=>x.id===n.id?{...x,leida:true}:x));if(n.pedidoId){setNotifOpen(false);router.push("/opciones/pedidos");}}}
                                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-all"
                                style={{borderBottom:"1px solid #f3f4f6",background:n.leida?"transparent":"#f5f3ff",opacity:n.leida?0.7:1}}>
                                <NotifIcon tipo={n.tipo}/>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900">{n.titulo}</p>
                                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{n.mensaje}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{tiempoRelativo(n.fecha)}</p>
                                </div>
                                {!n.leida&&<div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{background:V}}/>}
                              </div>
                            ))}
                          </div>
                          <div className="px-4 py-2.5" style={{borderTop:"1px solid #f3f4f6"}}>
                            <Link href="/opciones/pedidos" onClick={()=>setNotifOpen(false)} className="text-[11px] font-semibold flex items-center justify-center gap-1 hover:underline" style={{color:V}}>
                              {language==="es"?"Ver todos mis pedidos →":"View all my orders →"}
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative" ref={menuRef}>
                    <button onClick={()=>setMenuOpen(!menuOpen)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-all">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{border:`2px solid ${V}`}}>
                        {datosExtra?.fotoPerfil
                          ?<img src={datosExtra.fotoPerfil} alt="av" className="w-full h-full object-cover"/>
                          :<div className="w-full h-full flex items-center justify-center text-xs font-black text-white" style={{background:`linear-gradient(135deg,${V},${O})`}}>{getInitials(nombre)}</div>
                        }
                        {datosExtra?.verificado&&<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center" style={{background:G}}><ShieldCheck size={7} color="#000"/></div>}
                      </div>
                      <div className="hidden sm:flex flex-col items-start">
                        <span className="text-xs font-black text-gray-900 truncate max-w-[80px]">{nombre}</span>
                        <span className="text-[9px] text-gray-400 truncate max-w-[80px]">{cargo}</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" style={{transform:menuOpen?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}/>
                    </button>
                    {menuOpen&&(
                      <>
                        <div className="fixed inset-0 z-40" onClick={()=>setMenuOpen(false)}/>
                        <div className="absolute right-0 mt-2 z-50 overflow-hidden" style={{...dropStyle,width:"288px"}}>
                          <div className="p-4" style={{borderBottom:"1px solid #f3f4f6"}}>
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{border:`2px solid ${V}`}}>
                                {datosExtra?.fotoPerfil?<img src={datosExtra.fotoPerfil} alt="av" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-base font-black text-white" style={{background:`linear-gradient(135deg,${V},${O})`}}>{getInitials(nombre)}</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-gray-900 truncate">{nombre}</p>
                                {nombreEmpresa&&<p className="text-xs text-gray-500 truncate">{nombreEmpresa}</p>}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">{cargo}</span>
                                  {datosExtra?.verificado&&<span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5" style={{background:"#dcfce7",color:"#16a34a"}}><ShieldCheck size={8}/>{language==="es"?"Verificado":"Verified"}</span>}
                                </div>
                              </div>
                            </div>
                            {usuario?.email&&<div className="flex items-center gap-1.5 mt-2.5 text-xs text-gray-500"><Mail className="w-3 h-3" style={{color:V}}/><span className="truncate">{usuario.email}</span></div>}
                          </div>
                          <div className="p-2">
                            <MI href="/opciones/perfil"       icon={User}       label={t("menu.profile")||"Mi Perfil"}       desc="Ver y editar tu perfil"/>
                            <MI href="/opciones/empresa"      icon={Building}   label={t("menu.company")||"Mi Empresa"}      desc="Gestionar datos"/>
                            <MI href="/opciones/pedidos"      icon={Package}    label={t("menu.orders")||"Mis Pedidos"}      desc="Historial de compras"/>
                            <MI href="/opciones/cotizaciones" icon={FileText}   label={t("menu.quotations")||"Cotizaciones"} desc="Gestionar cotizaciones"/>
                            <MI href="/opciones/facturacion"  icon={CreditCard} label={t("menu.billing")||"Facturación"}    desc="Facturas y comprobantes"/>
                            <div className="my-1 border-t border-gray-100"/>
                            <MI href="/opciones/configuracion" icon={Settings}  label={t("menu.settings")||"Configuración"} desc="Ajustes de cuenta"/>
                            {rol==="admin"&&<MI href="/admin" icon={Star} label="Panel Admin" desc="Gestión del sistema"/>}
                            <MI icon={LogOut} label={language==="es"?"Cerrar Sesión":"Sign Out"} desc={language==="es"?"Salir de tu cuenta":"Exit your account"} onClick={handleLogout} danger/>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ):(
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/login" className="px-4 py-2 rounded-xl text-sm font-bold text-gray-700 border border-gray-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all">
                    {language==="es"?"Acceder":"Sign In"}
                  </Link>
                  <Link href="/register" className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90" style={{background:V}}>
                    {language==="es"?"Registrarse":"Sign Up"}
                  </Link>
                </div>
              )}

              <button onClick={()=>setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all">
                {mobileOpen?<X className="w-5 h-5"/>:<Menu className="w-5 h-5"/>}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen&&(
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <input type="text" placeholder={language==="es"?"Buscar celular...":"Search phone..."} value={search} onChange={e=>setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-300"/>
            </div>
            {usuario&&<Link href="/catalogo" onClick={()=>setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-50 text-violet-700 font-semibold text-sm"><LayoutGrid className="w-4 h-4"/>{language==="es"?"Catálogo":"Catalog"}</Link>}
            <a href="#marcas" onClick={()=>setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold text-sm block">{language==="es"?"Marcas":"Brands"}</a>
            <button onClick={()=>{toggleLang();setMobileOpen(false);}} className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold text-sm w-full">
              <Globe className="w-4 h-4" style={{color:V}}/>{language==="es"?"Switch to English":"Cambiar a Español"}
            </button>
            {!usuario&&(
              <div className="flex gap-2 pt-1">
                <Link href="/login" onClick={()=>setMobileOpen(false)} className="flex-1 py-2.5 text-center rounded-xl border border-gray-200 text-gray-700 font-bold text-sm">{language==="es"?"Acceder":"Sign In"}</Link>
                <Link href="/register" onClick={()=>setMobileOpen(false)} className="flex-1 py-2.5 text-center rounded-xl text-white font-bold text-sm" style={{background:V}}>{language==="es"?"Registrarse":"Sign Up"}</Link>
              </div>
            )}
            {usuario&&<button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm"><LogOut className="w-4 h-4"/>{language==="es"?"Cerrar Sesión":"Sign Out"}</button>}
          </div>
        )}

        <style>{`
          @keyframes bell-ring{0%,100%{transform:rotate(0);}10%{transform:rotate(15deg);}20%{transform:rotate(-12deg);}30%{transform:rotate(8deg);}40%{transform:rotate(-4deg);}50%{transform:rotate(0);}}
        `}</style>
      </nav>
      <div className="h-[66px]"/>
      <MiniCart/>
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={dmSans.variable}>
      <head>
        <link rel="icon" href="/images/icono.ico"/>
        <title>Mundo Móvil — Smartphones</title>
      </head>
      <body className={`${dmSans.className} antialiased bg-white text-gray-900`}>
        <LanguageProvider>
          <CartProvider>
            <Navbar/>
            <main className="min-h-screen">{children}</main>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}