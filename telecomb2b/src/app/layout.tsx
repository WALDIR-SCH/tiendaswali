"use client";
// src/app/layout.tsx

import { useEffect, useState, useRef, useCallback } from "react";
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
  ShieldCheck, LayoutGrid, Building, Mail,
  Settings, Package, FileText, CreditCard, Bell,
  Globe, Menu, X, Star, Check,
  Truck, AlertCircle, Info, Search, CheckCircle, Moon, Sun,
} from "lucide-react";

const dmSans = DM_Sans({
  subsets: ["latin"], display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
});

/* ─── PALETA POR TEMA ─── */
const TEMAS = {
  claro: {
    bgCard: "#ffffff", bgInput: "#f3f4f6", bgNav: "#ffffff",
    text: "#111827", textSec: "#6b7280", textMuted: "#9ca3af",
    border: "#e5e7eb", shadow: "rgba(0,0,0,0.07)",
    primary: "#7c3aed", priLight: "#f5f3ff",
    orange: "#FF6600",
  },
  oscuro: {
    bgCard: "#1e1e2e", bgInput: "#252535", bgNav: "#141420",
    text: "#f1f1f5", textSec: "#a8a8c0", textMuted: "#6b6b80",
    border: "#2e2e42", shadow: "rgba(0,0,0,0.4)",
    primary: "#9b5cf6", priLight: "#1e1228",
    orange: "#ff7a20",
  },
};

type TemaKey = keyof typeof TEMAS;

/* Aplica estilos directamente al DOM — sin ThemeContext ni globals */
function applyTheme(tema: TemaKey) {
  const T = TEMAS[tema];
  const r = document.documentElement;
  r.setAttribute("data-theme", tema);
  tema === "oscuro" ? r.classList.add("dark") : r.classList.remove("dark");
  document.body.style.backgroundColor = tema === "oscuro" ? "#0f0f13" : "#f9fafb";
  document.body.style.color = T.text;
  document.body.style.transition = "background-color 0.3s, color 0.3s";
}

/* ─── NOTIFICACIONES ─── */
interface Notif {
  id: string; tipo: string; titulo: string; mensaje: string;
  fecha: Date; leida: boolean; pedidoId?: string; cotizacionId?: string;
}

const tiempoRelativo = (d: Date) => {
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60)    return "ahora mismo";
  if (s < 3600)  return `hace ${Math.floor(s/60)} min`;
  if (s < 86400) return `hace ${Math.floor(s/3600)}h`;
  return `hace ${Math.floor(s/86400)} días`;
};

const getInitials = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

const NotifIcon = ({ tipo }: { tipo: string }) => {
  const m: Record<string, { icon: any; color: string }> = {
    pedido_nuevo:          { icon: Package,     color: "#7c3aed" },
    pedido_enviado:        { icon: Truck,       color: "#16a34a" },
    pedido_entregado:      { icon: Check,       color: "#16a34a" },
    pedido_cancelado:      { icon: AlertCircle, color: "#ef4444" },
    cotizacion_respondida: { icon: FileText,    color: "#7c3aed" },
    cotizacion_aprobada:   { icon: CheckCircle, color: "#16a34a" },
    cotizacion_pendiente:  { icon: FileText,    color: "#FF6600" },
    sistema:               { icon: Info,        color: "#FF6600" },
  };
  const { icon: Icon, color } = m[tipo] ?? m.sistema;
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={14} style={{ color }} />
    </div>
  );
};

/* ─── LOGO ─── */
const Logo = ({ C }: { C: typeof TEMAS.claro }) => {
  const [hov, setHov] = useState(false);
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", userSelect: "none" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ transform: hov ? "scale(1.08)" : "scale(1)", transition: "transform 0.25s" }}>
        <img src="/images/icono.ico" alt="Mundo Móvil" style={{ width: 42, height: 42, objectFit: "contain" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; const s = document.createElement("span"); s.textContent = "📱"; s.style.fontSize = "28px"; (e.target as HTMLImageElement).parentElement?.appendChild(s); }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <div>
          <span style={{ fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: "-0.03em", transition: "color 0.2s" }}>MUNDO </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: C.primary, letterSpacing: "-0.03em" }}>MÓVIL</span>
        </div>
        <span style={{ fontSize: 7, color: C.textMuted, letterSpacing: "0.25em", fontWeight: 700, marginTop: 3, textTransform: "uppercase" }}>Smartphones</span>
      </div>
    </Link>
  );
};

/* ─── NAVBAR ─── */
function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { totalArticulos, abrirCarrito } = useCart();
  const { language, setLanguage, t }     = useLanguage();

  /* ── TEMA desde localStorage (sin contexto externo) ── */
  const [tema, setTemaState] = useState<TemaKey>("claro");

  // Leer tema al montar
  useEffect(() => {
    const saved = (localStorage.getItem("mm_tema") || "claro") as TemaKey;
    const valid: TemaKey = saved === "oscuro" ? "oscuro" : "claro";
    setTemaState(valid);
    applyTheme(valid);
  }, []);

  // Escuchar cambios de tema desde la página de configuración
  useEffect(() => {
    const fn = () => {
      const saved = (localStorage.getItem("mm_tema") || "claro") as TemaKey;
      const valid: TemaKey = saved === "oscuro" ? "oscuro" : "claro";
      setTemaState(valid);
      applyTheme(valid);
    };
    window.addEventListener("storage", fn);
    // También escuchar evento custom
    window.addEventListener("themeChanged", fn);
    return () => { window.removeEventListener("storage", fn); window.removeEventListener("themeChanged", fn); };
  }, []);

  const toggleTema = () => {
    const next: TemaKey = tema === "claro" ? "oscuro" : "claro";
    setTemaState(next);
    applyTheme(next);
    localStorage.setItem("mm_tema", next);
    // Sync con mm_config
    try {
      const cfg = JSON.parse(localStorage.getItem("mm_config") || "{}");
      cfg.tema = next; localStorage.setItem("mm_config", JSON.stringify(cfg));
    } catch {}
    window.dispatchEvent(new Event("themeChanged"));
  };

  const C = TEMAS[tema];

  /* ── ESTADO ── */
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

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current  && !menuRef.current.contains(e.target as Node))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  /* ── Autenticación + Notificaciones ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUsuario(user);
      if (!user) { setDatosExtra(null); setNotifs([]); return; }
      const unsubDoc = onSnapshot(doc(db, "usuarios", user.uid), snap => setDatosExtra(snap.exists() ? snap.data() : null));

      const qP = query(collection(db, "pedidos"), where("clienteId", "==", user.uid), limit(30));
      const unsubP = onSnapshot(qP, snap => {
        const arrP: Notif[] = [];
        const now = Date.now();
        [...snap.docs].sort((a, b) => (b.data().fecha?.toDate?.()?.getTime()??0)-(a.data().fecha?.toDate?.()?.getTime()??0))
          .forEach(d => {
            const data = d.data(); const fecha = data.fecha?.toDate ? data.fecha.toDate() : new Date();
            const est = (data.estado||"").toLowerCase(); const num = `#${d.id.slice(0,8).toUpperCase()}`;
            if (now - fecha.getTime() < 86400000) arrP.push({ id:`n-${d.id}`, tipo:"pedido_nuevo",     titulo:"Pedido recibido",    mensaje:`Tu pedido ${num} fue registrado`, fecha, leida:false, pedidoId:d.id });
            if (est==="enviado"||est==="en camino") arrP.push({ id:`e-${d.id}`, tipo:"pedido_enviado",   titulo:"¡Pedido en camino!", mensaje:`Pedido ${num} fue despachado`,     fecha, leida:false, pedidoId:d.id });
            if (est==="entregado")                  arrP.push({ id:`ent-${d.id}`,tipo:"pedido_entregado",titulo:"Pedido entregado ✓", mensaje:`Pedido ${num} entregado`,          fecha, leida:true,  pedidoId:d.id });
            if (est==="cancelado")                  arrP.push({ id:`c-${d.id}`, tipo:"pedido_cancelado", titulo:"Pedido cancelado",   mensaje:`Pedido ${num} fue cancelado`,      fecha, leida:false, pedidoId:d.id });
          });

        const qC = query(collection(db, "cotizaciones"), where("clienteId", "==", user.uid), limit(20));
        const unsubC = onSnapshot(qC, snapC => {
          const arrC: Notif[] = [];
          snapC.docs.forEach(d => {
            const data = d.data(); const fecha = data.fecha?.toDate ? data.fecha.toDate() : new Date();
            const est = (data.estado||"").toLowerCase(); const num = data.numero||`#${d.id.slice(0,6).toUpperCase()}`;
            const noLeida = data.leidoPorCliente === false;
            if (est==="respondida"&&noLeida)                       arrC.push({ id:`cr-${d.id}`, tipo:"cotizacion_respondida", titulo:"💬 ¡Cotización respondida!", mensaje:`${num} — Tu asesor envió precios`, fecha, leida:false, cotizacionId:d.id });
            else if (est==="aprobada")                             arrC.push({ id:`ca-${d.id}`, tipo:"cotizacion_aprobada",   titulo:"✅ Cotización aprobada",     mensaje:`${num} fue aprobada`,             fecha, leida:!noLeida, cotizacionId:d.id });
            else if ((est==="pendiente"||est==="en_revision")&&noLeida) arrC.push({ id:`cp-${d.id}`, tipo:"cotizacion_pendiente",  titulo:"📋 En revisión",            mensaje:`${num} está siendo revisada`,    fecha, leida:false, cotizacionId:d.id });
          });
          setNotifs([...arrP,...arrC].sort((a,b)=>b.fecha.getTime()-a.fecha.getTime()).slice(0,20));
        }, () => setNotifs(arrP.slice(0,15)));
        return () => unsubC();
      }, () => setNotifs([{ id:"s1", tipo:"sistema", titulo:"Catálogo actualizado", mensaje:"Nuevos modelos disponibles", fecha:new Date(), leida:true }]));
      return () => { unsubDoc(); unsubP(); };
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fn = (e: CustomEvent) => { if (e.detail && e.detail !== language) setLanguage(e.detail); };
    window.addEventListener("languageChanged", fn as EventListener);
    return () => window.removeEventListener("languageChanged", fn as EventListener);
  }, [language, setLanguage]);

  const handleLogout = async () => { await signOut(auth); setMenuOpen(false); setMobileOpen(false); router.push("/"); };
  const marcarLeidas = () => setNotifs(p => p.map(n => ({ ...n, leida: true })));
  const noLeidas     = notifs.filter(n => !n.leida).length;
  const cotBadge     = notifs.filter(n => n.tipo.startsWith("cotizacion") && !n.leida).length;

  const cycleIdiomaNav = () => {
    const next = language === "es" ? "en" : language === "en" ? "pt" : "es";
    setLanguage(next);
    try { const cfg = JSON.parse(localStorage.getItem("mm_config")||"{}"); cfg.idioma=next; localStorage.setItem("mm_config",JSON.stringify(cfg)); } catch {}
  };

  const handleClickNotif = (n: Notif) => {
    setNotifs(p => p.map(x => x.id === n.id ? { ...x, leida: true } : x));
    setNotifOpen(false);
    if (n.cotizacionId) router.push("/opciones/cotizaciones");
    else if (n.pedidoId) router.push("/opciones/pedidos");
  };

  if (pathname.startsWith("/admin")) return null;

  const nombre        = datosExtra?.nombre       || usuario?.displayName || "Usuario";
  const nombreEmpresa = datosExtra?.nombreComercial || datosExtra?.razonSocial || "";
  const cargo         = datosExtra?.cargo || "Cliente";
  const rol           = datosExtra?.rol   || "cliente";
  const langLabels: Record<string, string> = { es: "ES", en: "EN", pt: "PT" };
  const langTx: Record<string, Record<string, string>> = {
    catalogo: { es:"Catálogo", en:"Catalog",  pt:"Catálogo"  },
    marcas:   { es:"Marcas",   en:"Brands",   pt:"Marcas"    },
    servicios:{ es:"Servicios",en:"Services", pt:"Serviços"  },
    acceder:  { es:"Acceder",  en:"Sign In",  pt:"Entrar"    },
    registro: { es:"Registrarse",en:"Sign Up",pt:"Registrar" },
    cerrar:   { es:"Cerrar Sesión",en:"Sign Out",pt:"Sair"   },
    buscar:   { es:"Buscar celular, marca...",en:"Search phone, brand...",pt:"Buscar celular, marca..." },
    pedidos:  { es:"Mis pedidos →",en:"My orders →",pt:"Meus pedidos →" },
    cotiz:    { es:"Mis cotizaciones →",en:"My quotes →",pt:"Minhas cotações →" },
    notifs:   { es:"Notificaciones",en:"Notifications",pt:"Notificações" },
    marcar:   { es:"Marcar leídas",en:"Mark read",pt:"Marcar lidas" },
    sinNotif: { es:"Sin notificaciones",en:"No notifications",pt:"Sem notificações" },
  };
  const Tx = (k: string) => langTx[k]?.[language] ?? langTx[k]?.["es"] ?? k;

  const navBg     = `${C.bgNav}${scrolled ? "" : ""}`;
  const navBorder = `1px solid ${scrolled ? C.border : C.border}`;
  const navShadow = scrolled ? `0 2px 20px ${C.shadow}` : "none";

  /* ── Menú item ── */
  const MI = ({ href, icon: Icon, label, desc, onClick, danger, badge }: {
    href?: string; icon: any; label: string; desc?: string;
    onClick?: () => void; danger?: boolean; badge?: number;
  }) => {
    const [hov, setHov] = useState(false);
    const inner = (
      <div
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11,
          background: hov ? (danger ? "#fee2e218" : C.priLight) : "transparent",
          cursor: "pointer", transition: "background 0.15s",
        }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: danger ? "#fee2e2" : C.priLight }}>
          <Icon size={13} style={{ color: danger ? "#ef4444" : C.primary }} />
          {badge && badge > 0 ? (
            <span style={{ position: "absolute", top: -4, right: -4, minWidth: 14, height: 14, background: C.orange, color: "#fff", borderRadius: 20, fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px" }}>{badge}</span>
          ) : null}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: danger ? "#ef4444" : C.text }}>{label}</p>
          {desc && <p style={{ margin: 0, fontSize: 10, color: C.textMuted }}>{desc}</p>}
        </div>
      </div>
    );
    if (href) return <Link href={href} onClick={() => { setMenuOpen(false); setMobileOpen(false); }} style={{ textDecoration: "none" }}>{inner}</Link>;
    return <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0 }} onClick={onClick}>{inner}</button>;
  };

  const iconBtn = (onClick: () => void, children: React.ReactNode, badge?: number) => (
    <button onClick={onClick} style={{ position: "relative", width: 36, height: 36, borderRadius: 9, background: C.bgInput, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      {children}
      {badge != null && badge > 0 && (
        <span style={{ position: "absolute", top: -5, right: -5, minWidth: 15, height: 15, background: C.orange, color: "#fff", borderRadius: 20, fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );

  return (
    <>
      <nav style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 30, background: navBg, borderBottom: navBorder, boxShadow: navShadow, transition: "background 0.3s, box-shadow 0.3s" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", gap: 12, height: 64 }}>

          <Logo C={C} />

          {/* Buscador */}
          <div style={{ flex: 1, maxWidth: 460, position: "relative", display: "none" }} className="md-search">
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
            <input type="text" placeholder={Tx("buscar")} value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 11, border: `1.5px solid ${C.border}`, background: C.bgInput, color: C.text, fontSize: 13, outline: "none" }}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Nav links */}
          <nav style={{ display: "flex", alignItems: "center", gap: 2 }} className="md-nav">
            {usuario && (
              <Link href="/catalogo" style={{ padding: "7px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, color: pathname === "/catalogo" ? C.primary : C.textSec, background: pathname === "/catalogo" ? C.priLight : "transparent", textDecoration: "none" }}>
                {Tx("catalogo")}
              </Link>
            )}
            {["marcas","servicios"].map(k => (
              <a key={k} href={`#${k}`} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, color: C.textSec, textDecoration: "none" }}>{Tx(k)}</a>
            ))}
          </nav>

          {/* Acciones */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>

            {/* Idioma */}
            <button onClick={cycleIdiomaNav} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 9, fontSize: 11, fontWeight: 800, color: C.textSec, background: C.bgInput, border: `1.5px solid ${C.border}`, cursor: "pointer" }}>
              <Globe size={12} style={{ color: C.primary }} />{langLabels[language] || "ES"}
            </button>

            {/* Tema toggle */}
            <button onClick={toggleTema} title={tema === "claro" ? "Modo oscuro" : "Modo claro"}
              style={{ width: 36, height: 36, borderRadius: 9, background: C.bgInput, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {tema === "claro" ? <Moon size={14} style={{ color: C.textSec }} /> : <Sun size={14} style={{ color: "#f5c518" }} />}
            </button>

            {usuario ? (
              <>
                {/* Carrito */}
                {iconBtn(abrirCarrito, <ShoppingCart size={15} style={{ color: C.textSec }} />, totalArticulos > 0 ? totalArticulos : undefined)}

                {/* Notificaciones */}
                <div ref={notifRef} style={{ position: "relative" }}>
                  {iconBtn(() => setNotifOpen(!notifOpen), <Bell size={15} style={{ color: noLeidas > 0 ? C.primary : C.textSec, animation: noLeidas > 0 ? "bell-ring 2s ease-in-out infinite" : "none" }} />, noLeidas)}

                  {notifOpen && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setNotifOpen(false)} />
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 360, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: `0 20px 60px ${C.shadow}`, zIndex: 50, overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Bell size={14} style={{ color: C.primary }} />
                            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{Tx("notifs")}</span>
                            {noLeidas > 0 && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 20, background: C.orange, color: "#fff" }}>{noLeidas}</span>}
                          </div>
                          {noLeidas > 0 && <button onClick={marcarLeidas} style={{ fontSize: 11, fontWeight: 600, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>{Tx("marcar")}</button>}
                        </div>
                        <div style={{ maxHeight: 300, overflowY: "auto" }}>
                          {notifs.length === 0 ? (
                            <div style={{ padding: 28, textAlign: "center", color: C.textMuted }}>
                              <Bell size={22} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
                              <p style={{ margin: 0, fontSize: 13 }}>{Tx("sinNotif")}</p>
                            </div>
                          ) : notifs.map(n => (
                            <div key={n.id} onClick={() => handleClickNotif(n)}
                              style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 16px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: n.leida ? "transparent" : n.tipo.startsWith("cotizacion") ? C.priLight : `${C.primary}08`, opacity: n.leida ? 0.6 : 1 }}>
                              <NotifIcon tipo={n.tipo} />
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>{n.titulo}</p>
                                <p style={{ margin: "2px 0", fontSize: 11, color: C.textSec }}>{n.mensaje}</p>
                                <p style={{ margin: 0, fontSize: 10, color: C.textMuted }}>{tiempoRelativo(n.fecha)}</p>
                              </div>
                              {!n.leida && <div style={{ width: 7, height: 7, borderRadius: "50%", background: n.tipo.startsWith("cotizacion") ? C.primary : C.orange, flexShrink: 0, marginTop: 4 }} />}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "10px 16px", borderTop: `1px solid ${C.border}` }}>
                          <Link href="/opciones/pedidos" onClick={() => setNotifOpen(false)} style={{ fontSize: 11, fontWeight: 600, color: C.primary, textDecoration: "none" }}>{Tx("pedidos")}</Link>
                          <span style={{ color: C.border }}>|</span>
                          <Link href="/opciones/cotizaciones" onClick={() => setNotifOpen(false)} style={{ fontSize: 11, fontWeight: 600, color: C.primary, textDecoration: "none" }}>{Tx("cotiz")}</Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Avatar */}
                <div ref={menuRef} style={{ position: "relative" }}>
                  <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", borderRadius: 10, background: "transparent", border: "none", cursor: "pointer" }}>
                    <div style={{ position: "relative", width: 30, height: 30, borderRadius: "50%", overflow: "hidden", border: `2px solid ${C.primary}`, flexShrink: 0 }}>
                      {datosExtra?.fotoPerfil
                        ? <img src={datosExtra.fotoPerfil} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff", background: `linear-gradient(135deg,${C.primary},${C.orange})` }}>{getInitials(nombre)}</div>
                      }
                      {datosExtra?.verificado && <div style={{ position: "absolute", bottom: -1, right: -1, width: 11, height: 11, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldCheck size={6} color="#fff" /></div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }} className="md-avatar-text">
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.text, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</span>
                      <span style={{ fontSize: 9, color: C.textMuted }}>{cargo}</span>
                    </div>
                    <ChevronDown size={12} style={{ color: C.textMuted, transform: menuOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                  </button>

                  {menuOpen && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 278, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: `0 20px 60px ${C.shadow}`, zIndex: 50, overflow: "hidden" }}>
                        {/* Header perfil */}
                        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 11, overflow: "hidden", border: `2px solid ${C.primary}`, flexShrink: 0 }}>
                              {datosExtra?.fotoPerfil ? <img src={datosExtra.fotoPerfil} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff", background: `linear-gradient(135deg,${C.primary},${C.orange})` }}>{getInitials(nombre)}</div>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</p>
                              {nombreEmpresa && <p style={{ margin: 0, fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis" }}>{nombreEmpresa}</p>}
                              <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 20, background: C.bgInput, color: C.textSec }}>{cargo}</span>
                                {datosExtra?.verificado && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 20, background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", gap: 2 }}><ShieldCheck size={7} />Ok</span>}
                              </div>
                            </div>
                          </div>
                          {usuario?.email && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11, color: C.textMuted }}>
                              <Mail size={11} style={{ color: C.primary }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.email}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: 8 }}>
                          <MI href="/opciones/perfil"        icon={User}       label={t("menu.profile")    || "Mi Perfil"}       desc="Ver y editar tu perfil" />
                          <MI href="/opciones/empresa"       icon={Building}   label={t("menu.company")    || "Mi Empresa"}      desc="Gestionar datos" />
                          <MI href="/opciones/pedidos"       icon={Package}    label={t("menu.orders")     || "Mis Pedidos"}      desc="Historial de compras" />
                          <MI href="/opciones/cotizaciones"  icon={FileText}   label={t("menu.quotations") || "Cotizaciones"}     desc="Gestionar cotizaciones" badge={cotBadge} />
                          <MI href="/opciones/facturacion"   icon={CreditCard} label={t("menu.billing")    || "Facturación"}      desc="Facturas y comprobantes" />
                          <div style={{ margin: "4px 0", borderTop: `1px solid ${C.border}` }} />
                          <MI href="/opciones/configuracion" icon={Settings}   label={t("menu.settings")   || "Configuración"}   desc="Ajustes de cuenta" />
                          {rol === "admin" && <MI href="/admin" icon={Star} label="Panel Admin" desc="Gestión del sistema" />}
                          <MI icon={LogOut} label={Tx("cerrar")} onClick={handleLogout} danger />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 700, color: C.text, border: `1.5px solid ${C.border}`, background: "transparent", textDecoration: "none" }}>
                  {Tx("acceder")}
                </Link>
                <Link href="/register" style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", background: C.primary, textDecoration: "none" }}>
                  {Tx("registro")}
                </Link>
              </>
            )}

            {/* Hamburguesa */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="mobile-btn" style={{ width: 36, height: 36, borderRadius: 9, background: C.bgInput, border: `1.5px solid ${C.border}`, display: "none", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {mobileOpen ? <X size={16} style={{ color: C.textSec }} /> : <Menu size={16} style={{ color: C.textSec }} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ background: C.bgCard, borderTop: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
              <input type="text" placeholder={Tx("buscar")} value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: 33, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bgInput, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {usuario && <Link href="/catalogo" onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: C.priLight, color: C.primary, fontWeight: 600, fontSize: 13, textDecoration: "none" }}><LayoutGrid size={15} />{Tx("catalogo")}</Link>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={cycleIdiomaNav} style={{ flex: 1, padding: 9, borderRadius: 9, background: C.bgInput, border: `1.5px solid ${C.border}`, color: C.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🌐 {langLabels[language]}</button>
              <button onClick={toggleTema} style={{ width: 38, height: 38, borderRadius: 9, background: C.bgInput, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                {tema === "claro" ? <Moon size={14} style={{ color: C.textSec }} /> : <Sun size={14} style={{ color: "#f5c518" }} />}
              </button>
            </div>
            {!usuario ? (
              <div style={{ display: "flex", gap: 8 }}>
                <Link href="/login" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: 10, textAlign: "center", borderRadius: 9, border: `1.5px solid ${C.border}`, color: C.text, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{Tx("acceder")}</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: 10, textAlign: "center", borderRadius: 9, background: C.primary, color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{Tx("registro")}</Link>
              </div>
            ) : (
              <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, background: "#fee2e2", color: "#ef4444", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
                <LogOut size={14} />{Tx("cerrar")}
              </button>
            )}
          </div>
        )}

        <style>{`
          @keyframes bell-ring{0%,100%{transform:rotate(0)}10%{transform:rotate(14deg)}20%{transform:rotate(-11deg)}30%{transform:rotate(7deg)}40%{transform:rotate(-4deg)}50%{transform:rotate(0)}}
          @media(min-width:768px){.md-search{display:flex!important}.md-nav{display:flex!important}.md-avatar-text{display:flex!important}}
          .mobile-btn{display:flex!important}
          @media(min-width:768px){.mobile-btn{display:none!important}}
        `}</style>
      </nav>
      <div style={{ height: 64 }} />
      <MiniCart />
    </>
  );
}

/* ─── ROOT LAYOUT ─── */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={dmSans.variable}>
      <head>
        <link rel="icon" href="/images/icono.ico" />
        <title>Mundo Móvil — Smartphones</title>
        {/* Evita flash de tema incorrecto al cargar */}
        <script dangerouslySetInnerHTML={{ __html: `
          try{
            var t=localStorage.getItem('mm_tema')||'claro';
            if(t==='oscuro'){
              document.documentElement.classList.add('dark');
              document.documentElement.setAttribute('data-theme','oscuro');
              document.documentElement.style.colorScheme='dark';
              document.body && (document.body.style.backgroundColor='#0f0f13');
            }
          }catch(e){}
        `}} />
      </head>
      <body className={`${dmSans.className} antialiased`}>
        <LanguageProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}