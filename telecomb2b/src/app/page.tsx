"use client";
// src/app/page.tsx

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import {
  ShoppingCart, ArrowRight, Star, Shield,
  Truck, Headphones, Zap, Award, CheckCircle,
  Heart, Cpu, Battery, Camera, Lock,
  Tag, Percent, Gift, Clock, X, LogIn, UserPlus,
  Package,
} from "lucide-react";

const V = "#7c3aed";
const O = "#FF6600";
const Y = "#F6FA00";
const G = "#28FB4B";

// ─── MARCAS ───────────────────────────────────────────────────────────────────
const brands = [
  { name:"Apple",    logo:"/images/marcas/apple.png",    bg:"#f8f9fa" },
  { name:"Samsung",  logo:"/images/marcas/samsung.png",  bg:"#eff6ff" },
  { name:"Xiaomi",   logo:"/images/marcas/xiaomi.png",   bg:"#fff1f2" },
  { name:"Motorola", logo:"/images/marcas/motorola.png", bg:"#f0fdf4" },
  { name:"Huawei",   logo:"/images/marcas/huawei.png",   bg:"#fff7ed" },
  { name:"OPPO",     logo:"/images/marcas/oppo.png",     bg:"#fdf4ff" },
  { name:"Nokia",    logo:"/images/marcas/nokia.png",    bg:"#eff6ff" },
  { name:"OnePlus",  logo:"/images/marcas/oneplus.png",  bg:"#fff1f2" },
  { name:"Realme",   logo:"/images/marcas/realme.png",   bg:"#fff7ed" },
  { name:"Vivo",     logo:"/images/marcas/vivo.png",     bg:"#f5f3ff" },
  { name:"Honor",    logo:"/images/marcas/honor.png",    bg:"#f0fdf4" },
  { name:"Asus",     logo:"/images/marcas/asus.png",     bg:"#fdf4ff" },
  { name:"Google",   logo:"/images/marcas/google.png",   bg:"#eff6ff" },
  { name:"Infinix",  logo:"/images/marcas/infinix.png",  bg:"#fff1f2" },
  { name:"Tecno",    logo:"/images/marcas/tecno.png",    bg:"#f0fdf4" },
  { name:"RedMagic", logo:"/images/marcas/redmagic.png", bg:"#fff1f2" },
];

// ─── BRAND CAROUSEL ───────────────────────────────────────────────────────────
function BrandCarousel() {
  const doubled = [...brands, ...brands];
  const BCard = ({ b, k }: { b: typeof brands[0]; k: string }) => (
    <div key={k}
      className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 hover:border-violet-300 hover:shadow-lg transition-all duration-300 cursor-pointer shrink-0 group"
      style={{ width:"130px", height:"96px", background: b.bg, padding:"14px" }}>
      <div className="flex items-center justify-center h-10 w-full mb-1">
        <img src={b.logo} alt={b.name}
          className="max-h-9 w-auto object-contain opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
          onError={e=>{
            const el=e.target as HTMLImageElement;
            el.style.display="none";
            const sp=document.createElement("span");
            sp.style.cssText=`font-size:11px;font-weight:900;color:${V};`;
            sp.textContent=b.name;
            el.parentElement?.appendChild(sp);
          }}
        />
      </div>
      <span className="text-[10px] font-bold text-gray-500 group-hover:text-violet-600 transition-colors text-center">{b.name}</span>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{background:"linear-gradient(90deg,#f9fafb,transparent)"}}/>
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{background:"linear-gradient(-90deg,#f9fafb,transparent)"}}/>
        <div className="flex gap-4 brand-rail-1" style={{width:"max-content"}}>
          {doubled.map((b,i)=><BCard key={`r1-${i}`} b={b} k={`r1-${i}`}/>)}
        </div>
      </div>
      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{background:"linear-gradient(90deg,#f9fafb,transparent)"}}/>
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{background:"linear-gradient(-90deg,#f9fafb,transparent)"}}/>
        <div className="flex gap-4 brand-rail-2" style={{width:"max-content"}}>
          {[...brands].reverse().concat([...brands].reverse()).map((b,i)=><BCard key={`r2-${i}`} b={b} k={`r2-${i}`}/>)}
        </div>
      </div>
      <style>{`
        .brand-rail-1{animation:scroll-left 30s linear infinite;}
        .brand-rail-1:hover{animation-play-state:paused;}
        .brand-rail-2{animation:scroll-right 35s linear infinite;}
        .brand-rail-2:hover{animation-play-state:paused;}
        @keyframes scroll-left{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
        @keyframes scroll-right{0%{transform:translateX(-50%);}100%{transform:translateX(0);}}
      `}</style>
    </div>
  );
}

// ─── MODAL LOGIN REQUERIDO ────────────────────────────────────────────────────
function LoginRequiredModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-violet-100"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:"#f5f3ff"}}>
              <Lock className="w-6 h-6" style={{color:V}}/>
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Acceso requerido</h3>
              <p className="text-xs text-gray-400">Contenido exclusivo para clientes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-400"/>
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Para ver los precios reales y detalles completos del producto, debes iniciar sesión o registrarte si eres nuevo.
        </p>
        <div className="space-y-3">
          <Link href="/login" onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 font-bold rounded-xl text-white transition-all hover:opacity-90"
            style={{background:V}}>
            <LogIn className="w-4 h-4"/> Iniciar Sesión
          </Link>
          <Link href="/register" onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 font-bold rounded-xl border-2 transition-all hover:bg-violet-50"
            style={{borderColor:`${V}40`, color:V}}>
            <UserPlus className="w-4 h-4"/> Registrarse — Es gratis
          </Link>
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          ¿Tienes dudas?{" "}
          <a href="https://wa.me/51925903712" target="_blank" rel="noopener noreferrer"
            className="hover:underline" style={{color:V}}>
            Contáctanos por WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── PRODUCT CARD (productos reales) ─────────────────────────────────────────
function CatalogProductCard({
  prod, logueado, onLoginRequired
}: {
  prod: any; logueado: boolean; onLoginRequired: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const router = useRouter();

  const precio = prod.en_oferta && prod.precio_oferta_caja
    ? prod.precio_oferta_caja
    : prod.precio_caja || 0;
  const fmtPEN = (n: number) =>
    `S/ ${(n||0).toLocaleString("es-PE",{minimumFractionDigits:0,maximumFractionDigits:0})}`;

  const handleClick = () => {
    if (!logueado) { onLoginRequired(); return; }
    router.push(`/producto/${prod.id}`);
  };

  const tagColor = prod.categoria_id === "Gama Alta" ? V
    : prod.categoria_id === "Gama Media" ? O
    : "#16a34a";

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 flex flex-col cursor-pointer"
      onClick={handleClick}>
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
        {prod.destacado && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-black" style={{background:Y}}>⭐ Destacado</span>
        )}
        {prod.en_oferta && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{background:O}}>🔥 Oferta</span>
        )}
        {!prod.destacado && !prod.en_oferta && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{background:tagColor}}>
            {prod.categoria_id}
          </span>
        )}
      </div>
      <button
        onClick={e=>{e.stopPropagation(); setLiked(l=>!l);}}
        className="absolute top-3 right-3 z-20 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:scale-110 transition-transform">
        <Heart className={`w-4 h-4 ${liked?"fill-red-500 text-red-500":"text-gray-300"}`}/>
      </button>
      <div className="relative overflow-hidden bg-gray-50 h-52">
        {prod.imagen_principal ? (
          <img src={prod.imagen_principal} alt={prod.nombre_producto}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={48} className="text-gray-300"/>
          </div>
        )}
        {!logueado && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{background:"rgba(124,58,237,0.88)"}}>
            <div className="text-center text-white">
              <Lock className="w-6 h-6 mx-auto mb-1"/>
              <p className="text-sm font-black">Ver precio real</p>
              <p className="text-xs opacity-80">Inicia sesión</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{color:O}}>
          {prod.marca} · {prod.categoria_id}
        </p>
        <h3 className="font-black text-gray-900 text-base mb-2 leading-tight line-clamp-2">
          {prod.nombre_producto}
        </h3>
        <div className="flex flex-wrap gap-1 mb-3">
          {prod.capacidad_almacenamiento && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{background:"#111827"}}>
              {prod.capacidad_almacenamiento}
            </span>
          )}
          {prod.capacidad_ram && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-black" style={{background:Y}}>
              {prod.capacidad_ram}
            </span>
          )}
          {prod.color && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-gray-600 bg-gray-100">
              {prod.color}
            </span>
          )}
        </div>
        {(prod.total_resenas||0) > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map(s=>(
              <Star key={s} className={`w-3.5 h-3.5 ${s<=Math.floor(prod.rating_promedio||0)?"fill-yellow-400 text-yellow-400":"text-gray-200"}`}/>
            ))}
            <span className="text-xs text-gray-400 ml-1">({prod.total_resenas})</span>
          </div>
        )}
        <div className="mt-auto">
          {logueado ? (
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl font-black" style={{color:V}}>{fmtPEN(precio)}</span>
              {prod.en_oferta && prod.precio_caja && (
                <span className="text-sm text-gray-400 line-through">{fmtPEN(prod.precio_caja)}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl" style={{background:"#f5f3ff"}}>
              <Lock className="w-4 h-4 shrink-0" style={{color:V}}/>
              <span className="text-sm font-bold" style={{color:V}}>Precio solo para clientes</span>
            </div>
          )}
          <button
            onClick={e=>{e.stopPropagation(); handleClick();}}
            className="w-full py-2.5 font-bold rounded-xl flex items-center justify-center gap-2 text-sm text-white transition-all hover:opacity-90"
            style={{background: logueado ? `linear-gradient(135deg,${V},#9333ea)` : `linear-gradient(135deg,${V},${O})`}}>
            {logueado
              ? <>Ver producto →</>
              : <><Lock className="w-4 h-4"/> Ver precio completo</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WHATSAPP FLOTANTE ────────────────────────────────────────────────────────
function WhatsAppFlotante() {
  const [hov, setHov] = useState(false);
  return (
    <>
      <a
        href="https://wa.me/51925903712?text=Hola%2C%20tengo%20una%20consulta%20sobre%20Mundo%20M%C3%B3vil%20%F0%9F%93%B1"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {/* Tooltip */}
        <div
          className="bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap transition-all duration-300"
          style={{
            opacity: hov ? 1 : 0,
            transform: hov ? "translateX(0)" : "translateX(8px)",
            pointerEvents: "none",
          }}>
          ¿Tienes dudas? ¡Escríbenos!
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-2 h-2 bg-gray-900 rotate-45"/>
        </div>

        {/* Botón verde */}
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: "#25D366",
            boxShadow: hov
              ? "0 8px 28px rgba(37,211,102,0.6)"
              : "0 4px 14px rgba(37,211,102,0.4)",
            transform: hov ? "scale(1.12)" : "scale(1)",
            transition: "transform 0.2s, box-shadow 0.2s",
            animation: hov ? "wa-vibrate 0.35s ease-in-out" : "wa-idle 2.5s ease-in-out infinite",
          }}>
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {/* Ping cuando no hay hover */}
          {!hov && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{background:"#25D366"}}/>
          )}
        </div>
      </a>

      <style>{`
        @keyframes wa-vibrate {
          0%,100% { transform: scale(1.12) rotate(0deg); }
          20%      { transform: scale(1.12) rotate(-9deg); }
          40%      { transform: scale(1.12) rotate(9deg); }
          60%      { transform: scale(1.12) rotate(-5deg); }
          80%      { transform: scale(1.12) rotate(5deg); }
        }
        @keyframes wa-idle {
          0%,100% { box-shadow: 0 4px 14px rgba(37,211,102,0.4); }
          50%     { box-shadow: 0 4px 22px rgba(37,211,102,0.65); }
        }
      `}</style>
    </>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [logueado,       setLogueado]       = useState(false);
  const [loadingAuth,    setLoadingAuth]    = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [productos,      setProductos]      = useState<any[]>([]);
  const [loadingProds,   setLoadingProds]   = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setLogueado(!!user);
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "productos"), where("estado", "==", "Activo"), limit(20))
        );
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => {
            if (a.destacado && !b.destacado) return -1;
            if (!a.destacado && b.destacado) return 1;
            return (b.stock_cajas||0) - (a.stock_cajas||0);
          })
          .slice(0, 6);
        setProductos(docs);
      } catch (e) {
        console.error("Error cargando productos:", e);
      } finally {
        setLoadingProds(false);
      }
    })();
  }, []);

  const irACatalogo = () => {
    if (!logueado) { router.push("/login"); return; }
    router.push("/catalogo");
  };

  const irAGama = (gama: string) => {
    if (!logueado) { router.push("/login"); return; }
    router.push(`/catalogo?gama=${encodeURIComponent(gama)}`);
  };

  return (
    <div className="min-h-screen bg-white">

      {showLoginModal && <LoginRequiredModal onClose={() => setShowLoginModal(false)} />}

      {/* ── WHATSAPP FLOTANTE ── */}
      <WhatsAppFlotante />

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{background:V}}/>

        {/* ── CINTILLO CARRUSEL — Envíos 100% seguros ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 mb-6">
          <div className="rounded-xl overflow-hidden" style={{background:"#0d0520", height:"44px"}}>
            <div className="ticker-wrap h-full flex items-center overflow-hidden">
              <div className="ticker-content flex items-center gap-0 whitespace-nowrap">
                {[...Array(8)].map((_,idx)=>(
                  <span key={idx} className="inline-flex items-center gap-3 px-8">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="#F6FA00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    <span className="text-sm font-black tracking-widest uppercase" style={{color:"#ffffff"}}>
                      ENVÍOS <span style={{color:"#9851F9"}}>100% SEGUROS</span> A TODO EL PERÚ
                    </span>
                    <span className="text-yellow-400 font-black text-base mx-2">·</span>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="#28FB4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span className="text-sm font-bold tracking-wide" style={{color:"#28FB4B"}}>
                      Garantía oficial en todos los equipos
                    </span>
                    <span className="text-yellow-400 font-black text-base mx-2">·</span>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <span className="text-sm font-bold tracking-wide" style={{color:"#FF6600"}}>
                      Entrega en 24-48h a todo el país
                    </span>
                    <span className="text-yellow-400 font-black text-base mx-2">·</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <style>{`
            .ticker-content {
              animation: ticker-scroll 30s linear infinite;
            }
            .ticker-content:hover {
              animation-play-state: paused;
            }
            @keyframes ticker-scroll {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-center pb-12 md:pb-20">

          {/* Izquierda */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border" style={{background:"#f5f3ff",borderColor:"#ddd6fe"}}>
              <Zap className="w-4 h-4" style={{color:V}}/>
              <span className="text-sm font-bold" style={{color:V}}>Envío gratis en pedidos +S/ 500</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.0] mb-6">
              El mejor{" "}
              <span className="relative inline-block">
                <span style={{color:V}}>celular</span>
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6 Q100 2 198 6" stroke={Y} strokeWidth="3.5" strokeLinecap="round"/>
                </svg>
              </span>
              <br/>al mejor precio
            </h1>
            <p className="text-gray-500 text-lg mb-8 max-w-lg leading-relaxed">
              Encuentra tu smartphone ideal — gama alta, media y baja. Más de{" "}
              <strong className="text-gray-800">16 marcas líderes</strong>, garantía oficial y envíos a todo el Perú.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button
                onClick={irACatalogo}
                className="px-8 py-4 font-black text-lg rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 text-white"
                style={{background:V}}>
                <ShoppingCart className="w-5 h-5"/> Ver Catálogo
              </button>
              <a href="#marcas" className="px-8 py-4 border-2 border-gray-200 hover:border-violet-300 text-gray-700 font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5">
                Ver Marcas <ArrowRight className="w-5 h-5"/>
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-gray-100">
              {[
                {icon:<Shield className="w-4 h-4" style={{color:G}}/>, text:"Garantía oficial"},
                {icon:<Truck  className="w-4 h-4" style={{color:O}}/>, text:"Envío rápido"},
                {icon:<Award  className="w-4 h-4" style={{color:V}}/>, text:"16+ marcas"},
              ].map(b=>(
                <div key={b.text} className="flex items-center gap-2 text-sm text-gray-600 font-medium">{b.icon}{b.text}</div>
              ))}
            </div>
          </div>

          {/* Derecha — imagen portada limpia */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-80 h-80 rounded-full opacity-10 pointer-events-none"
              style={{background:`radial-gradient(circle,${V},transparent)`}}/>
            <div className="relative z-10 w-full rounded-3xl overflow-hidden shadow-2xl shadow-violet-100">
              <img
                src="/images/portada.png"
                alt="Mundo Móvil"
                className="w-full h-auto block"
                style={{objectFit:"cover"}}
                onError={e=>{
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&q=80&w=700";
                }}
              />
            </div>
          </div>
        </div>

        {/* Gama pills */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
          <div className="grid grid-cols-3 gap-4">
            {[
              {label:"Gama Alta",  desc:"Desde S/ 2,000", bg:V,         gama:"Gama Alta",  icon:<Cpu     className="w-5 h-5 text-white"/>},
              {label:"Gama Media", desc:"Desde S/ 800",   bg:O,         gama:"Gama Media", icon:<Battery className="w-5 h-5 text-white"/>},
              {label:"Gama Baja",  desc:"Desde S/ 300",   bg:"#16a34a", gama:"Gama Baja",  icon:<Camera  className="w-5 h-5 text-white"/>},
            ].map(r=>(
              <button key={r.label} onClick={() => irAGama(r.gama)}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white border-2 border-gray-100 hover:border-violet-200 rounded-2xl hover:shadow-md transition-all group text-left w-full">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{background:r.bg}}>
                  {r.icon}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{r.label}</p>
                  <p className="text-xs text-gray-400">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ MARCAS — CARRUSEL DOBLE ANIMADO ═════════════════════════════════ */}
      <section id="marcas" className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-2">Marcas <span style={{color:V}}>Oficiales</span></h2>
          <p className="text-gray-400 text-sm">Distribuidores autorizados de las mejores marcas del mundo</p>
        </div>
        <BrandCarousel/>
      </section>

      {/* ══ NUESTROS CELULARES — productos reales ════════════════════════════ */}
      <section id="productos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 border"
              style={{background:"#f5f3ff", borderColor:"#ddd6fe"}}>
              {logueado
                ? <><CheckCircle className="w-4 h-4" style={{color:"#16a34a"}}/><span className="text-sm font-bold text-green-700">Sesión activa — Precios visibles</span></>
                : <><Lock className="w-4 h-4" style={{color:V}}/><span className="text-sm font-bold" style={{color:V}}>Inicia sesión para ver precios reales y comprar</span></>
              }
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-2">Nuestros <span style={{color:V}}>Celulares</span></h2>
            <p className="text-gray-400 text-sm max-w-lg mx-auto">
              Equipos disponibles en catálogo. Regístrate para ver precios exclusivos.
            </p>
          </div>

          {/* BANNER debajo del subtítulo */}
          <div className="rounded-2xl overflow-hidden mb-10">
            <img
              src="/images/cintillo.png"
              alt="Promoción celulares"
              className="w-full block"
              style={{height:"auto", objectFit:"contain"}}
              onError={e => {
                (e.target as HTMLImageElement).parentElement!.style.display = "none";
              }}
            />
          </div>

          {/* Grid de productos reales */}
          {loadingProds ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_,i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{border:"1px solid #e5e7eb", background:"#f9fafb"}}>
                  <div className="h-52 bg-gray-200"/>
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-gray-200 rounded-full w-1/3"/>
                    <div className="h-4 bg-gray-200 rounded-full w-full"/>
                    <div className="h-4 bg-gray-200 rounded-full w-3/4"/>
                    <div className="h-10 bg-gray-200 rounded-xl mt-2"/>
                  </div>
                </div>
              ))}
            </div>
          ) : productos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {productos.map(p => (
                <CatalogProductCard
                  key={p.id}
                  prod={p}
                  logueado={logueado}
                  onLoginRequired={() => setShowLoginModal(true)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="text-center mt-12">
            <button
              onClick={irACatalogo}
              className="inline-flex items-center gap-3 px-8 py-4 font-bold rounded-2xl text-white hover:opacity-90 hover:-translate-y-0.5 transition-all"
              style={{background:`linear-gradient(135deg,${V},${O})`}}>
              {logueado
                ? <><ShoppingCart className="w-5 h-5"/> Ver catálogo completo <ArrowRight className="w-5 h-5"/></>
                : <><Lock className="w-5 h-5"/> Ver catálogo completo — Regístrate gratis <ArrowRight className="w-5 h-5"/></>
              }
            </button>
          </div>
        </div>
      </section>

      {/* ══ BANNER PROMO ═════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="relative rounded-3xl overflow-hidden min-h-[280px] flex items-center"
            style={{background:`linear-gradient(135deg,${V} 0%,#5b21b6 50%,#4c1d95 100%)`}}>
            <img src="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&q=80&w=1400"
              alt="Oferta gama alta" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"/>
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10" style={{background:"rgba(255,255,255,0.3)",transform:"translate(30%,-30%)"}}/>
            <div className="relative z-10 grid md:grid-cols-2 w-full">
              <div className="p-10 md:p-14 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit mb-5" style={{background:"rgba(255,255,255,0.15)"}}>
                  <Zap className="w-3.5 h-3.5 text-white"/>
                  <span className="text-white text-xs font-bold">Oferta especial — Tiempo limitado</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
                  Hasta <span style={{color:Y}}>30% OFF</span><br/>en Gama Alta
                </h2>
                <p className="text-violet-200 mb-8 leading-relaxed">Accede a precios exclusivos solo para usuarios registrados.</p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/register" className="px-7 py-3.5 font-black rounded-xl hover:scale-105 hover:shadow-lg text-violet-900 text-base transition-all" style={{background:Y}}>
                    Registrarme gratis
                  </Link>
                  <Link href="/login" className="px-7 py-3.5 border-2 text-white font-bold rounded-xl hover:bg-white/10 transition-all text-base" style={{borderColor:"rgba(255,255,255,0.4)"}}>
                    Ya tengo cuenta
                  </Link>
                </div>
                <div className="flex gap-4 mt-6">
                  {[{icon:<Shield className="w-4 h-4"/>,text:"Garantía oficial"},{icon:<Truck className="w-4 h-4"/>,text:"Envío gratis"},{icon:<Clock className="w-4 h-4"/>,text:"Oferta 48h"}].map(b=>(
                    <div key={b.text} className="flex items-center gap-1.5 text-violet-200 text-xs font-medium">{b.icon}{b.text}</div>
                  ))}
                </div>
              </div>
              <div className="relative hidden md:flex items-center justify-end pr-10">
                <img src="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&q=80&w=600"
                  alt="Smartphones gama alta" className="rounded-2xl shadow-2xl max-h-64 w-auto object-cover border-2 border-white/20"/>
                <div className="absolute bottom-6 right-6 bg-white rounded-2xl p-4 shadow-2xl">
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Ahorro promedio</p>
                  <p className="text-2xl font-black" style={{color:V}}>S/ 800</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"/>
                    <span className="text-[10px] text-green-600 font-bold">En stock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banners secundarios */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {src:"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600",tag:"Gama Media",tc:O,title:"Desde S/ 800",sub:"Motorola, Samsung A, Realme",gama:"Gama Media"},
              {src:"https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&q=80&w=600",tag:"Gama Baja",tc:"#16a34a",title:"Desde S/ 300",sub:"Xiaomi, Infinix, Tecno",gama:"Gama Baja"},
              {src:"https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&q=80&w=600",tag:"Nuevos Lanzamientos",tc:V,title:"Últimos modelos",sub:"iPhone 15, S24, Pixel 8",gama:"Gama Alta"},
            ].map(b=>(
              <button key={b.tag} onClick={() => irAGama(b.gama)}
                className="relative rounded-2xl overflow-hidden min-h-[160px] flex items-end p-5 cursor-pointer group w-full text-left">
                <img src={b.src} alt={b.tag} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className="absolute inset-0" style={{background:"linear-gradient(to top,rgba(0,0,0,0.8),transparent)"}}/>
                <div className="relative z-10 w-full">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white mb-2 inline-block" style={{background:b.tc}}>{b.tag}</span>
                  <p className="text-white font-black text-lg leading-tight">{b.title}<br/><span className="text-sm font-medium opacity-80">{b.sub}</span></p>
                  <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-white">Ver más <ArrowRight className="w-3.5 h-3.5"/></span>
                </div>
              </button>
            ))}
          </div>

          {/* Beneficios */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {icon:<Percent    className="w-5 h-5"/>,bg:"#f5f3ff",color:V,         title:"Precios exclusivos",     sub:"Solo para registrados"},
              {icon:<Gift       className="w-5 h-5"/>,bg:"#fff7ed",color:O,         title:"Regalo en tu 1ra compra",sub:"Accesorios gratis"},
              {icon:<Truck      className="w-5 h-5"/>,bg:"#f0fdf4",color:"#16a34a", title:"Envío express gratis",   sub:"Pedidos +S/ 500"},
              {icon:<Tag        className="w-5 h-5"/>,bg:"#fdf4ff",color:"#9333ea", title:"Cupón bienvenida",       sub:"10% OFF primer pedido"},
            ].map(b=>(
              <div key={b.title} className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all bg-white">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:b.bg,color:b.color}}>{b.icon}</div>
                <div><p className="text-sm font-black text-gray-900">{b.title}</p><p className="text-xs text-gray-400">{b.sub}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SERVICIOS ════════════════════════════════════════════════════════ */}
      <section id="servicios" className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-gray-900 mb-3">¿Por qué elegir <span style={{color:V}}>Mundo Móvil</span>?</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">Tu tienda de confianza con las mejores garantías</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Garantía Oficial */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-violet-200 hover:shadow-xl transition-all duration-300 group">
              <div className="relative h-40 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&q=80&w=600"
                  alt="Garantía oficial" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className="absolute inset-0" style={{background:"linear-gradient(to bottom,transparent 40%,rgba(124,58,237,0.7))"}}/>
                <div className="absolute bottom-3 left-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100">
                    <Shield className="w-5 h-5 text-violet-600"/>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-black text-gray-900 text-base mb-2">Garantía Oficial</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Garantía oficial del fabricante en todos los equipos. Productos 100% originales y sellados.</p>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"/>
                  <span className="text-xs font-bold text-green-600">Certificado y sellado</span>
                </div>
              </div>
            </div>

            {/* Envío Express */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300 group">
              <div className="relative h-40 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&q=80&w=600"
                  alt="Envío express" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className="absolute inset-0" style={{background:"linear-gradient(to bottom,transparent 40%,rgba(255,102,0,0.7))"}}/>
                <div className="absolute bottom-3 left-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-100">
                    <Truck className="w-5 h-5 text-orange-500"/>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-black text-gray-900 text-base mb-2">Envío Express</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Entrega en 24-48h a todo el Perú con seguimiento en tiempo real desde tu cuenta.</p>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500"/>
                  <span className="text-xs font-bold text-orange-500">Lima y provincias</span>
                </div>
              </div>
            </div>

            {/* 30 días devolución */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-green-200 hover:shadow-xl transition-all duration-300 group">
              <div className="relative h-40 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600"
                  alt="Devolución" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className="absolute inset-0" style={{background:"linear-gradient(to bottom,transparent 40%,rgba(22,163,74,0.7))"}}/>
                <div className="absolute bottom-3 left-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100">
                    <Award className="w-5 h-5 text-green-600"/>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-black text-gray-900 text-base mb-2">30 días devolución</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Devolución sin preguntas si no estás satisfecho. Tu dinero de regreso garantizado.</p>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"/>
                  <span className="text-xs font-bold text-green-600">Sin complicaciones</span>
                </div>
              </div>
            </div>

            {/* Soporte 24/7 */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-yellow-200 hover:shadow-xl transition-all duration-300 group">
              <div className="relative h-40 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&q=80&w=600"
                  alt="Soporte 24/7" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className="absolute inset-0" style={{background:"linear-gradient(to bottom,transparent 40%,rgba(161,98,7,0.7))"}}/>
                <div className="absolute bottom-3 left-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-100">
                    <Headphones className="w-5 h-5 text-yellow-600"/>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-black text-gray-900 text-base mb-2">Soporte 24/7</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Equipo disponible para ayudarte en cualquier momento por WhatsApp, email o teléfono.</p>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"/>
                  <span className="text-xs font-bold text-yellow-600">Respuesta inmediata</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ STATS ════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {number:"16+",    label:"Marcas oficiales",     color:V},
              {number:"5,000+", label:"Clientes satisfechos", color:O},
              {number:"98%",    label:"Satisfacción",         color:"#16a34a"},
              {number:"24h",    label:"Envío express",        color:V},
            ].map(s=>(
              <div key={s.label} className="text-center p-6 rounded-2xl border border-gray-100 hover:border-violet-100 hover:shadow-md transition-all">
                <div className="text-4xl font-black mb-2" style={{color:s.color}}>{s.number}</div>
                <p className="text-gray-500 text-sm font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border" style={{background:"#f5f3ff",borderColor:"#ddd6fe"}}>
            <CheckCircle className="w-4 h-4" style={{color:V}}/>
            <span className="text-sm font-bold" style={{color:V}}>Únete a miles de clientes felices</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
            Tu próximo celular<br/><span style={{color:V}}>te está esperando</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            Crea tu cuenta gratuita y accede a precios exclusivos, ofertas anticipadas y envíos gratis en tu primera compra.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="px-10 py-4 font-black text-lg rounded-2xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3 text-white hover:opacity-90" style={{background:V}}>
              Crear cuenta gratis <ArrowRight className="w-5 h-5"/>
            </Link>
            <Link href="/login" className="px-10 py-4 border-2 border-gray-200 hover:border-violet-300 text-gray-700 font-bold text-lg rounded-2xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/images/icono.ico" alt="Mundo Móvil"
                  style={{width:"36px",height:"36px",objectFit:"contain"}}
                  onError={e=>(e.target as HTMLImageElement).style.display="none"}/>
                <span className="text-xl font-black">Mundo <span style={{color:"#a78bfa"}}>Móvil</span></span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Tu tienda de smartphones de confianza. 16 marcas oficiales, garantía real y los mejores precios del Perú.
              </p>
              <div className="space-y-3">
                <a href="mailto:mundomovil@import.com"
                  className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-violet-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:"#1f2937"}}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  mundomovil@import.com
                </a>
                <a href="https://wa.me/51925903712" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-green-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:"#25D366"}}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  +51 925 903 712
                </a>
                <a href="tel:+51015551234"
                  className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-violet-400 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:"#1f2937"}}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                  </div>
                  (01) 555-1234
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-black mb-5 text-sm uppercase tracking-wider text-gray-300">Categorías</h4>
              <ul className="space-y-2.5">
                {[
                  {l:"Gama Alta",  h:logueado?"/catalogo?gama=Gama%20Alta":"/login"},
                  {l:"Gama Media", h:logueado?"/catalogo?gama=Gama%20Media":"/login"},
                  {l:"Gama Baja",  h:logueado?"/catalogo?gama=Gama%20Baja":"/login"},
                  {l:"Accesorios", h:logueado?"/catalogo":"/login"},
                  {l:"Ofertas",    h:logueado?"/catalogo":"/login"},
                ].map(i=>(
                  <li key={i.l}><Link href={i.h} className="text-gray-400 hover:text-violet-400 transition-colors text-sm">{i.l}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-black mb-5 text-sm uppercase tracking-wider text-gray-300">Marcas</h4>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {brands.map(b=>(
                  <li key={b.name}>
                    <Link
                      href={logueado ? `/catalogo?marca=${encodeURIComponent(b.name)}` : "/login"}
                      className="text-gray-400 hover:text-violet-400 transition-colors text-sm">
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-black mb-5 text-sm uppercase tracking-wider text-gray-300">Cuenta</h4>
              <ul className="space-y-2.5">
                {[
                  {l:"Iniciar Sesión", h:"/login"},
                  {l:"Registrarse",    h:"/register"},
                  {l:"Mis Pedidos",    h:logueado?"/opciones/pedidos":"/login"},
                  {l:"Mi Perfil",      h:logueado?"/opciones/perfil":"/login"},
                  {l:"Configuración",  h:logueado?"/opciones/configuracion":"/login"},
                ].map(i=>(
                  <li key={i.l}><Link href={i.h} className="text-gray-400 hover:text-violet-400 transition-colors text-sm">{i.l}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-xs">© 2025 Mundo Móvil. Todos los derechos reservados.</p>
            <div className="flex gap-4">
              {[{bg:"#16a34a",l:"Gama Baja"},{bg:O,l:"Gama Media"},{bg:V,l:"Gama Alta"}].map(d=>(
                <span key={d.l} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full inline-block" style={{background:d.bg}}/>{d.l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}