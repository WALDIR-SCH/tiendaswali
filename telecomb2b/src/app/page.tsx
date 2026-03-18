"use client";
// src/app/page.tsx

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingCart, ArrowRight, Star, Shield,
  Truck, Headphones, Zap, Award, CheckCircle,
  Heart, Cpu, Battery, Camera, Lock,
  Tag, Percent, Gift, Clock,
} from "lucide-react";

const V = "#7c3aed";
const O = "#FF6600";
const Y = "#F6FA00";
const G = "#28FB4B";

const brands = [
  { name:"Apple",    logo:"https://logo.clearbit.com/apple.com",           bg:"#f8f9fa" },
  { name:"Samsung",  logo:"https://logo.clearbit.com/samsung.com",         bg:"#eff6ff" },
  { name:"Xiaomi",   logo:"https://logo.clearbit.com/xiaomi.com",          bg:"#fff1f2" },
  { name:"Motorola", logo:"https://logo.clearbit.com/motorola.com",        bg:"#f0fdf4" },
  { name:"Huawei",   logo:"https://logo.clearbit.com/huawei.com",          bg:"#fff7ed" },
  { name:"OPPO",     logo:"https://logo.clearbit.com/oppo.com",            bg:"#fdf4ff" },
  { name:"Nokia",    logo:"https://logo.clearbit.com/nokia.com",           bg:"#eff6ff" },
  { name:"OnePlus",  logo:"https://logo.clearbit.com/oneplus.com",         bg:"#fff1f2" },
  { name:"Realme",   logo:"https://logo.clearbit.com/realme.com",          bg:"#fff7ed" },
  { name:"Vivo",     logo:"https://logo.clearbit.com/vivo.com",            bg:"#f5f3ff" },
  { name:"Honor",    logo:"https://logo.clearbit.com/honor.com",           bg:"#f0fdf4" },
  { name:"Asus",     logo:"https://logo.clearbit.com/asus.com",            bg:"#fdf4ff" },
  { name:"Google",   logo:"https://logo.clearbit.com/google.com",          bg:"#eff6ff" },
  { name:"Infinix",  logo:"https://logo.clearbit.com/infinixmobility.com", bg:"#fff1f2" },
  { name:"Tecno",    logo:"https://logo.clearbit.com/tecno-mobile.com",    bg:"#f0fdf4" },
  { name:"RedMagic", logo:"https://logo.clearbit.com/nubia.com",           bg:"#fff1f2" },
];

const promoProducts = [
  { id:1, name:"iPhone 15 Pro Max",       brand:"Apple",    price:"S/ 4,299", oldPrice:"S/ 4,599",
    badge:"⭐ Más Vendido", badgeColor:V, tag:"Gama Alta",  tagColor:V,
    image:"https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600",
    rating:4.9, specs:["A17 Pro","256GB","48MP","Titanio"], discount:"-7%" },
  { id:2, name:"Samsung Galaxy S24 Ultra",brand:"Samsung",  price:"S/ 3,899", oldPrice:null,
    badge:"🔥 Nuevo",       badgeColor:O, tag:"Gama Alta",  tagColor:V,
    image:"https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&q=80&w=600",
    rating:4.8, specs:["SD 8 Gen 3","12GB RAM","200MP","S-Pen"], discount:null },
  { id:3, name:"Xiaomi Redmi Note 13",    brand:"Xiaomi",   price:"S/ 599",   oldPrice:"S/ 699",
    badge:"💚 Mejor Precio",badgeColor:"#16a34a",tag:"Gama Baja", tagColor:"#16a34a",
    image:"https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&q=80&w=600",
    rating:4.3, specs:["SD 685","8GB RAM","108MP","33W"], discount:"-14%" },
  { id:4, name:"Motorola Edge 40",        brand:"Motorola", price:"S/ 1,299", oldPrice:"S/ 1,499",
    badge:"🧡 Oferta",      badgeColor:O, tag:"Gama Media", tagColor:O,
    image:"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600",
    rating:4.5, specs:["Dimensity 8020","8GB RAM","144Hz","68W"], discount:"-13%" },
  { id:5, name:"Google Pixel 8 Pro",      brand:"Google",   price:"S/ 3,499", oldPrice:null,
    badge:"✨ Premium",     badgeColor:V, tag:"Gama Alta",  tagColor:V,
    image:"https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&q=80&w=600",
    rating:4.7, specs:["Tensor G3","12GB RAM","50MP","IA Google"], discount:null },
  { id:6, name:"Samsung Galaxy A55",      brand:"Samsung",  price:"S/ 999",   oldPrice:null,
    badge:"🔶 Popular",     badgeColor:O, tag:"Gama Media", tagColor:O,
    image:"https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&q=80&w=600",
    rating:4.4, specs:["Exynos 1480","8GB RAM","50MP","5000mAh"], discount:null },
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

// ─── PROMO CARD ───────────────────────────────────────────────────────────────
function PromoCard({ p }: { p: typeof promoProducts[0] }) {
  const [liked, setLiked] = useState(false);
  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 flex flex-col">
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{background:p.badgeColor}}>{p.badge}</span>
        {p.discount&&<span className="text-xs font-black px-2.5 py-1 rounded-full text-white" style={{background:"#dc2626"}}>{p.discount}</span>}
      </div>
      <button onClick={()=>setLiked(l=>!l)} className="absolute top-3 right-3 z-20 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:scale-110 transition-transform">
        <Heart className={`w-4 h-4 ${liked?"fill-red-500 text-red-500":"text-gray-300"}`}/>
      </button>
      <div className="relative overflow-hidden bg-gray-50 h-52">
        <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
        <Link href="/login" className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{background:"rgba(124,58,237,0.88)"}}>
          <div className="text-center text-white"><Lock className="w-6 h-6 mx-auto mb-1"/><p className="text-sm font-black">Ver precio real</p><p className="text-xs opacity-80">Inicia sesión</p></div>
        </Link>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{background:p.tagColor}}>{p.tag}</span>
          <span className="text-xs text-gray-400 font-medium">{p.brand}</span>
        </div>
        <h3 className="font-black text-gray-900 text-base mb-2 leading-tight">{p.name}</h3>
        <div className="flex flex-wrap gap-1 mb-3">
          {p.specs.map(s=><span key={s} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s}</span>)}
        </div>
        <div className="flex items-center gap-1 mb-4">
          {[...Array(5)].map((_,i)=><Star key={i} className={`w-3.5 h-3.5 ${i<Math.floor(p.rating)?"fill-yellow-400 text-yellow-400":"text-gray-200"}`}/>)}
          <span className="text-xs text-gray-400 ml-1">{p.rating}</span>
        </div>
        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl font-black" style={{color:V}}>{p.price}</span>
            {p.oldPrice&&<span className="text-sm text-gray-400 line-through">{p.oldPrice}</span>}
            <span className="text-xs text-gray-400 flex items-center gap-0.5 ml-auto"><Lock className="w-3 h-3"/>ref.</span>
          </div>
          <Link href="/login" className="w-full py-2.5 font-bold rounded-xl flex items-center justify-center gap-2 text-sm text-white hover:opacity-90 transition-all" style={{background:`linear-gradient(135deg,${V},${O})`}}>
            <Lock className="w-4 h-4"/> Ver precio completo
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{background:V}}/>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-center py-12 md:py-20">

          {/* Izquierda — texto */}
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
              <Link href="/login" className="px-8 py-4 font-black text-lg rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 text-white" style={{background:V}}>
                <ShoppingCart className="w-5 h-5"/> Ver Catálogo
              </Link>
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

          {/* Derecha — SOLO la imagen portada.jpg, limpia, sin overlay ni texto */}
          <div className="relative flex items-center justify-center">
            {/* Blob decorativo detrás */}
            <div className="absolute w-80 h-80 rounded-full opacity-10 pointer-events-none"
              style={{background:`radial-gradient(circle,${V},transparent)`}}/>

            {/* Imagen portada — completamente limpia */}
            <div className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl shadow-violet-100">
              <img
                src="/images/portada.jpg"
                alt="Mundo Móvil"
                className="w-full h-auto block"
                style={{ maxHeight: "460px", objectFit: "cover" }}
                onError={e=>{
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&q=80&w=700";
                }}
              />
            </div>

            {/* Chips flotantes externos a la imagen */}
            {/* <div className="absolute -top-3 -right-3 z-20 bg-white rounded-2xl shadow-lg px-3 py-2.5 border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:"#dcfce7"}}>
                <Truck className="w-4 h-4" style={{color:"#16a34a"}}/>
              </div>
              <div><p className="text-xs font-black text-gray-900">Envío Gratis</p><p className="text-[10px] text-gray-400">24-48 horas</p></div>
            </div> */}

            {/* <div className="absolute -bottom-3 -left-3 z-20 bg-white rounded-2xl shadow-lg px-3 py-2.5 border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:"#ede9fe"}}>
                <Award className="w-4 h-4" style={{color:V}}/>
              </div>
              <div><p className="text-xs font-black text-gray-900">+16 Marcas</p><p className="text-[10px] text-gray-400">Garantía oficial</p></div>
            </div> */}
          </div>
        </div>

        {/* Gama pills */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
          <div className="grid grid-cols-3 gap-4">
            {[
              {label:"Gama Alta",  desc:"Desde S/ 2,000", bg:V,        icon:<Cpu     className="w-5 h-5 text-white"/>},
              {label:"Gama Media", desc:"Desde S/ 800",   bg:O,        icon:<Battery className="w-5 h-5 text-white"/>},
              {label:"Gama Baja",  desc:"Desde S/ 300",   bg:"#16a34a",icon:<Camera  className="w-5 h-5 text-white"/>},
            ].map(r=>(
              <Link key={r.label} href="/login" className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white border-2 border-gray-100 hover:border-violet-200 rounded-2xl hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{background:r.bg}}>{r.icon}</div>
                <div><p className="font-bold text-gray-900 text-sm">{r.label}</p><p className="text-xs text-gray-400">{r.desc}</p></div>
              </Link>
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

      {/* ══ PRODUCTOS PUBLICITARIOS ══════════════════════════════════════════ */}
      <section id="productos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 border" style={{background:"#f5f3ff",borderColor:"#ddd6fe"}}>
              <Lock className="w-4 h-4" style={{color:V}}/>
              <span className="text-sm font-bold" style={{color:V}}>Inicia sesión para ver precios reales y comprar</span>
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-2">Nuestros <span style={{color:V}}>Celulares</span></h2>
            <p className="text-gray-400 text-sm max-w-lg mx-auto">Equipos disponibles en catálogo. Regístrate para ver precios exclusivos.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {promoProducts.map(p=><PromoCard key={p.id} p={p}/>)}
          </div>
          <div className="text-center mt-12">
            <Link href="/login" className="inline-flex items-center gap-3 px-8 py-4 font-bold rounded-2xl text-white hover:opacity-90 hover:-translate-y-0.5 transition-all" style={{background:`linear-gradient(135deg,${V},${O})`}}>
              <Lock className="w-5 h-5"/> Ver catálogo completo — Regístrate gratis <ArrowRight className="w-5 h-5"/>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ BANNER PROMO ═════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Banner principal */}
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
                  <Link href="/register" className="px-7 py-3.5 font-black rounded-xl hover:scale-105 hover:shadow-lg text-violet-900 text-base transition-all" style={{background:Y}}>Registrarme gratis</Link>
                  <Link href="/login" className="px-7 py-3.5 border-2 text-white font-bold rounded-xl hover:bg-white/10 transition-all text-base" style={{borderColor:"rgba(255,255,255,0.4)"}}>Ya tengo cuenta</Link>
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
                  <div className="flex items-center gap-1 mt-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/><span className="text-[10px] text-green-600 font-bold">En stock</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Banners secundarios */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {src:"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600",tag:"Gama Media",tc:O,title:"Desde S/ 800",sub:"Motorola, Samsung A, Realme"},
              {src:"https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&q=80&w=600",tag:"Gama Baja",tc:"#16a34a",title:"Desde S/ 300",sub:"Xiaomi, Infinix, Tecno"},
              {src:"https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&q=80&w=600",tag:"Nuevos Lanzamientos",tc:V,title:"Últimos modelos",sub:"iPhone 15, S24, Pixel 8"},
            ].map(b=>(
              <div key={b.tag} className="relative rounded-2xl overflow-hidden min-h-[160px] flex items-end p-5 cursor-pointer group">
                <img src={b.src} alt={b.tag} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className="absolute inset-0" style={{background:"linear-gradient(to top,rgba(0,0,0,0.8),transparent)"}}/>
                <div className="relative z-10 w-full">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white mb-2 inline-block" style={{background:b.tc}}>{b.tag}</span>
                  <p className="text-white font-black text-lg leading-tight">{b.title}<br/><span className="text-sm font-medium opacity-80">{b.sub}</span></p>
                  <Link href="/login" className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-white hover:gap-2.5 transition-all">Ver más <ArrowRight className="w-3.5 h-3.5"/></Link>
                </div>
              </div>
            ))}
          </div>

          {/* Beneficios */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {icon:<Percent    className="w-5 h-5"/>,bg:"#f5f3ff",color:V,        title:"Precios exclusivos",  sub:"Solo para registrados"},
              {icon:<Gift       className="w-5 h-5"/>,bg:"#fff7ed",color:O,        title:"Regalo en tu 1ra compra",sub:"Accesorios gratis"},
              {icon:<Truck      className="w-5 h-5"/>,bg:"#f0fdf4",color:"#16a34a",title:"Envío express gratis", sub:"Pedidos +S/ 500"},
              {icon:<Tag        className="w-5 h-5"/>,bg:"#fdf4ff",color:"#9333ea",title:"Cupón bienvenida",     sub:"10% OFF primer pedido"},
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
            {[
              {icon:<Shield     className="w-7 h-7"/>,bg:"bg-violet-100 text-violet-600",title:"Garantía Oficial",  desc:"Garantía oficial del fabricante en todos los equipos."},
              {icon:<Truck      className="w-7 h-7"/>,bg:"bg-orange-100 text-orange-500",title:"Envío Express",      desc:"Entrega en 24-48h a todo el Perú con seguimiento."},
              {icon:<Award      className="w-7 h-7"/>,bg:"bg-green-100 text-green-600",  title:"30 días devolución", desc:"Devolución sin preguntas si no estás satisfecho."},
              {icon:<Headphones className="w-7 h-7"/>,bg:"bg-yellow-100 text-yellow-600",title:"Soporte 24/7",       desc:"Equipo disponible para ayudarte en cualquier momento."},
            ].map(s=>(
              <div key={s.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-violet-200 hover:shadow-lg transition-all group">
                <div className={`w-14 h-14 ${s.bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>{s.icon}</div>
                <h3 className="font-black text-gray-900 text-base mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
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
                <img src="/images/icono.ico" alt="Mundo Móvil" style={{width:"36px",height:"36px",objectFit:"contain"}}
                  onError={e=>(e.target as HTMLImageElement).style.display="none"}/>
                <span className="text-xl font-black">Mundo <span style={{color:"#a78bfa"}}>Móvil</span></span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">Tu tienda de smartphones de confianza. 16 marcas oficiales, garantía real y los mejores precios del Perú.</p>
            </div>
            <div>
              <h4 className="font-black mb-5 text-sm uppercase tracking-wider text-gray-300">Categorías</h4>
              <ul className="space-y-2.5">
                {["Gama Alta","Gama Media","Gama Baja","Accesorios","Ofertas"].map(i=>(
                  <li key={i}><Link href="/login" className="text-gray-400 hover:text-violet-400 transition-colors text-sm">{i}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-5 text-sm uppercase tracking-wider text-gray-300">Marcas</h4>
              <ul className="space-y-2.5">
                {["Apple","Samsung","Xiaomi","Motorola","OPPO"].map(i=>(
                  <li key={i}><Link href="/login" className="text-gray-400 hover:text-violet-400 transition-colors text-sm">{i}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-5 text-sm uppercase tracking-wider text-gray-300">Cuenta</h4>
              <ul className="space-y-2.5">
                {[{l:"Iniciar Sesión",h:"/login"},{l:"Registrarse",h:"/register"},{l:"Mis Pedidos",h:"/opciones/pedidos"},{l:"Contacto",h:"/contact"}].map(i=>(
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