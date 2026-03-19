"use client";
// src/app/admin/layout.tsx
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect, useRef, JSX } from "react";
import {
  doc, getDoc, collection, query, where,
  orderBy, limit, onSnapshot, updateDoc, Timestamp
} from "firebase/firestore";

/* ── PALETA MUNDO MÓVIL ─────────────────────────────────────────────────── */
const C = {
  purple:      "#7c3aed",
  purpleLight: "#9851F9",
  purpleBg:    "#f5f3ff",
  purpleBorder:"#ddd6fe",
  orange:      "#FF6600",
  orangeBg:    "#fff7ed",
  yellow:      "#F6FA00",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  greenBg:     "#f0fdf4",
  white:       "#FFFFFF",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray300:     "#D1D5DB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray600:     "#4B5563",
  gray700:     "#374151",
  gray900:     "#111827",
};

/* ── ÍCONOS SVG ─────────────────────────────────────────────────────────── */
const IS = { width:18, height:18 } as const;
const IcoDash     = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9"/></svg>;
const IcoPedidos  = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1.5"/><path strokeLinecap="round" d="M9 12h6M9 16h4"/></svg>;
const IcoProducts = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline strokeLinecap="round" strokeLinejoin="round" points="3.27 6.96 12 12.01 20.73 6.96"/><line strokeLinecap="round" x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IcoCart     = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
const IcoClients  = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const IcoReports  = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 20V10M12 20V4M6 20v-6"/></svg>;
const IcoSettings = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const IcoCot      = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
const IcoCuentas  = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>;
const IcoIMEI     = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><path strokeLinecap="round" d="M12 18h.01"/></svg>;
const IcoAdmins   = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>;
const IcoSearch   = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>;
const IcoBell     = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>;
const IcoUser     = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoActivity = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><polyline strokeLinecap="round" strokeLinejoin="round" points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcoLogout   = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>;
const IcoMenu     = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><line strokeLinecap="round" x1="3" y1="6" x2="21" y2="6"/><line strokeLinecap="round" x1="3" y1="12" x2="21" y2="12"/><line strokeLinecap="round" x1="3" y1="18" x2="21" y2="18"/></svg>;
const IcoChevron  = ({ dir = "down" }: { dir?: "down"|"left"|"right" }) => (
  <svg style={{ width:12, height:12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
    {dir==="down"  && <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>}
    {dir==="left"  && <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>}
    {dir==="right" && <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>}
  </svg>
);

/* ── TIPOS ──────────────────────────────────────────────────────────────── */
type MenuItem = {
  name: string; href: string; label: string; icon: () => JSX.Element;
  badge?: string; group: string; soloAdmin?: boolean;
};

const GRUPOS = [
  { key: "principal",  label: "Principal"  },
  { key: "comercial",  label: "Comercial"  },
  { key: "inventario", label: "Inventario" },
  { key: "finanzas",   label: "Finanzas"   },
  { key: "sistema",    label: "Sistema"    },
];

const MENU: MenuItem[] = [
  { name:"Dashboard",    href:"/admin",                 label:"Visión general",          icon:IcoDash,     group:"principal" },
  { name:"Pedidos",      href:"/admin/pedidos",         label:"Gestión de pedidos",      icon:IcoPedidos,  group:"principal", badge:"live" },
  { name:"Cotizaciones", href:"/admin/cotizaciones",    label:"Ciclo B2B completo",      icon:IcoCot,      group:"comercial", badge:"NEW" },
  { name:"Venta Rápida", href:"/admin/venta-manual",    label:"Punto de venta",          icon:IcoCart,     group:"comercial" },
  { name:"Clientes",     href:"/admin/clientes",        label:"Base de clientes B2B",    icon:IcoClients,  group:"comercial", soloAdmin:true },
  { name:"Productos",    href:"/admin/productos",       label:"Inventario y catálogo",   icon:IcoProducts, group:"inventario" },
  { name:"IMEI/Series",  href:"/admin/imei",            label:"Trazabilidad equipos",    icon:IcoIMEI,     group:"inventario" },
  { name:"Por Cobrar",   href:"/admin/cuentas-cobrar",  label:"Crédito y cobranza",      icon:IcoCuentas,  group:"finanzas" },
  { name:"Reportes",     href:"/admin/reportes",        label:"Análisis y estadísticas", icon:IcoReports,  group:"finanzas",  soloAdmin:true },
  { name:"Config.",      href:"/admin/configuracion",   label:"Ajustes del sistema",     icon:IcoSettings, group:"sistema",   soloAdmin:true },
  { name:"Equipo",       href:"/admin/equipo",          label:"Gestión de admins",       icon:IcoAdmins,   group:"sistema",   soloAdmin:true },
];

interface Notif {
  id: string; tipo: string; titulo: string; mensaje: string;
  fecha: any; leida: boolean; pedidoId?: string;
}

/* ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────── */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [user,        setUser]        = useState<any>(null);
  const [userRol,     setUserRol]     = useState<"admin"|"seller"|null>(null);
  const [superadmin,  setSuperadmin]  = useState(false);
  const [userName,    setUserName]    = useState("");
  const [userFoto,    setUserFoto]    = useState("");
  const [sideOpen,    setSideOpen]    = useState(true);
  const [mounted,     setMounted]     = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifs,      setNotifs]      = useState<Notif[]>([]);
  const [searchQ,     setSearchQ]     = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);
  const [pedBadge,    setPedBadge]    = useState(0);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  /* ── Auth + datos + notificaciones en tiempo real ──────────────────────── */
  useEffect(() => {
    setMounted(true);
    const unsubAuth = auth.onAuthStateChanged(async u => {
      if (!u) { router.replace("/login"); return; }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        if (snap.exists()) {
          const d = snap.data();
          setUserRol(d.rol === "seller" ? "seller" : "admin");
          setSuperadmin(d.superadmin === true);
          setUserName(d.nombre || u.email?.split("@")[0] || "Admin");
          setUserFoto(d.fotoPerfil || u.photoURL || "");
        }
      } catch {
        setUserRol("admin");
        setUserName(u.email?.split("@")[0] || "Admin");
      }

      /* Notificaciones en tiempo real — pedidos pendientes */
      const qPed = query(
        collection(db, "pedidos"),
        where("estado", "in", ["pendiente", "procesando"]),
        orderBy("fecha", "desc"),
        limit(20)
      );
      const unsubPed = onSnapshot(qPed, snap => {
        setPedBadge(snap.docs.length);
        const arr: Notif[] = snap.docs.map(d => {
          const data = d.data();
          const estado = data.estado || "pendiente";
          const emojis: Record<string,string> = {
            pendiente:"📦", procesando:"⏳", enviado:"🚚", entregado:"✅", cancelado:"❌"
          };
          return {
            id: d.id,
            tipo: estado,
            titulo: `Pedido ${estado}`,
            mensaje: `Pedido #${d.id.slice(0,8).toUpperCase()} — ${data.empresa||data.cliente||"Cliente"}`,
            fecha: data.fecha,
            leida: false,
            pedidoId: d.id,
          };
        });
        setNotifs(arr.slice(0, 10));
      }, () => {});

      return () => unsubPed();
    });

    /* Click fuera cierra dropdowns */
    const fn = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => { unsubAuth(); document.removeEventListener("mousedown", fn); };
  }, [router]);

  /* ── Logout ─────────────────────────────────────────────────────────────── */
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setProfileOpen(false);
    try {
      await signOut(auth);
      router.replace("/login");
    } catch { router.replace("/login"); }
    finally { setLoggingOut(false); }
  };

  const marcarLeidas = async () => {
    setNotifs(p => p.map(n => ({ ...n, leida: true })));
  };

  const esSeller  = userRol === "seller";
  const noLeidas  = notifs.filter(n => !n.leida).length;
  const menuVis   = MENU.filter(i => !(i.soloAdmin && esSeller));
  const filtered  = searchQ.length > 1
    ? menuVis.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase()) || i.label.toLowerCase().includes(searchQ.toLowerCase()))
    : [];
  const currentPage = menuVis.find(i => pathname === i.href || (i.href !== "/admin" && pathname.startsWith(i.href)));
  const getInitials = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const tiempoRel = (f: any): string => {
    try {
      const d = f?.toDate ? f.toDate() : new Date(f);
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60)    return "ahora";
      if (diff < 3600)  return `${Math.floor(diff/60)}m`;
      if (diff < 86400) return `${Math.floor(diff/3600)}h`;
      return `${Math.floor(diff/86400)}d`;
    } catch { return ""; }
  };

  if (!mounted) return null;

  /* ─────────────────────────── RENDER ─────────────────────────────────── */
  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      background: C.gray50,
    }}>

      {/* ══════════ SIDEBAR ══════════ */}
      <aside style={{
        position: "fixed", top: 0, left: 0, height: "100%", zIndex: 40,
        width: sideOpen ? 256 : 68,
        background: C.white,
        borderRight: `1px solid ${C.gray200}`,
        display: "flex", flexDirection: "column",
        transition: "width .28s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
        boxShadow: "2px 0 12px rgba(124,58,237,0.04)",
      }}>

        {/* Logo */}
        <div style={{
          height: 64,
          display: "flex", alignItems: "center",
          padding: sideOpen ? "0 16px" : "0",
          justifyContent: sideOpen ? "flex-start" : "center",
          borderBottom: `1px solid ${C.gray100}`,
          gap: 10, flexShrink: 0,
        }}>
          <img
            src="/images/icono.ico"
            alt="Mundo Móvil"
            style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}
            onError={e => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              const sp = document.createElement("div");
              sp.style.cssText = `width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${C.purple},${C.orange});display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#fff;flex-shrink:0;`;
              sp.textContent = "M";
              el.parentElement?.prepend(sp);
            }}
          />
          {sideOpen && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.gray900, whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>
                MUNDO <span style={{ color: C.purple }}>MÓVIL</span>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: C.gray400, textTransform: "uppercase" }}>
                {esSeller ? "● Vendedor" : superadmin ? "★ Superadmin" : "● Admin Panel"}
              </div>
            </div>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setSideOpen(v => !v)}
          style={{
            position: "absolute", right: -11, top: 76,
            width: 22, height: 22, borderRadius: "50%",
            background: `linear-gradient(135deg,${C.purple},${C.purpleLight})`,
            border: `2px solid ${C.white}`,
            boxShadow: `0 2px 8px ${C.purple}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 50,
          }}>
          <div style={{ transform: sideOpen ? "rotate(0)" : "rotate(180deg)", transition: "transform .3s", display:"flex" }}>
            <IcoChevron dir="left" />
          </div>
        </button>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto", overflowX: "hidden" }}>
          {GRUPOS.map(g => {
            const items = menuVis.filter(i => i.group === g.key);
            if (!items.length) return null;
            return (
              <div key={g.key} style={{ marginBottom: 8 }}>
                {sideOpen && (
                  <div style={{
                    fontSize: 9, fontWeight: 800, color: C.gray400,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    padding: "0 8px", marginBottom: 4, marginTop: 8,
                  }}>{g.label}</div>
                )}
                {!sideOpen && <div style={{ height: 1, background: C.gray100, margin: "8px 4px 6px" }} />}
                {items.map(item => {
                  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                  const liveCount = item.badge === "live" ? pedBadge : null;
                  return (
                    <Link key={item.href} href={item.href}
                      title={!sideOpen ? item.name : undefined}
                      style={{
                        display: "flex", alignItems: "center",
                        gap: sideOpen ? 10 : 0,
                        padding: sideOpen ? "8px 10px" : "10px 0",
                        justifyContent: sideOpen ? "flex-start" : "center",
                        borderRadius: 10, textDecoration: "none",
                        background: active ? C.purpleBg : "transparent",
                        border: `1px solid ${active ? C.purpleBorder : "transparent"}`,
                        marginBottom: 2, position: "relative",
                        transition: "all .15s",
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = C.gray50; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: active ? C.purple : C.gray100,
                        color: active ? C.white : C.gray500,
                        transition: "all .15s",
                      }}>
                        <item.icon />
                      </div>
                      {sideOpen && (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: active ? 700 : 500,
                              color: active ? C.purple : C.gray700,
                              whiteSpace: "nowrap",
                            }}>{item.name}</div>
                          </div>
                          {liveCount !== null && liveCount > 0 && (
                            <span style={{
                              fontSize: 9, fontWeight: 900, padding: "2px 6px",
                              borderRadius: 20, background: C.orange, color: C.white,
                              boxShadow: `0 2px 8px ${C.orange}50`,
                            }}>{liveCount}</span>
                          )}
                          {item.badge === "NEW" && (
                            <span style={{
                              fontSize: 9, fontWeight: 900, padding: "2px 6px",
                              borderRadius: 20, background: C.yellow, color: C.gray900,
                            }}>NEW</span>
                          )}
                        </>
                      )}
                      {/* Tooltip colapsado */}
                      {!sideOpen && (
                        <div style={{
                          position: "absolute", left: "calc(100% + 12px)", top: "50%",
                          transform: "translateY(-50%)",
                          background: C.gray900, color: C.white,
                          fontSize: 11, fontWeight: 700,
                          padding: "6px 12px", borderRadius: 8, whiteSpace: "nowrap",
                          pointerEvents: "none", zIndex: 200, opacity: 0,
                          transition: "opacity .1s",
                        }} className="sb-tip">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer usuario */}
        <div style={{
          padding: "10px 8px 14px",
          borderTop: `1px solid ${C.gray100}`,
        }}>
          {sideOpen ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 10,
              background: C.gray50, border: `1px solid ${C.gray200}`,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: userFoto ? "transparent" : `linear-gradient(135deg,${C.purple},${C.orange})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 900, color: C.white, overflow: "hidden",
              }}>
                {userFoto
                  ? <img src={userFoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : getInitials(userName)
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gray900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.greenDark }} />
                  <span style={{ fontSize: 9, color: C.gray400 }}>En línea</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `linear-gradient(135deg,${C.purple},${C.orange})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 900, color: C.white,
              }}>
                {getInitials(userName)}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <div style={{
        flex: 1,
        marginLeft: sideOpen ? 256 : 68,
        display: "flex", flexDirection: "column",
        transition: "margin-left .28s cubic-bezier(.4,0,.2,1)",
        minHeight: "100vh",
      }}>

        {/* ── TOPBAR ── */}
        <header style={{
          height: 64, position: "sticky", top: 0, zIndex: 30,
          background: C.white,
          borderBottom: `1px solid ${C.gray200}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px",
          boxShadow: "0 1px 8px rgba(124,58,237,0.05)",
        }}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setSideOpen(v => !v)} style={{
              width: 34, height: 34, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: `1px solid ${C.gray200}`,
              cursor: "pointer", color: C.gray500, marginRight: 4,
            }}>
              <IcoMenu />
            </button>
            <span style={{ fontSize: 11, color: C.gray400 }}>Admin</span>
            <span style={{ fontSize: 11, color: C.gray300 }}>›</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>{currentPage?.name || "Dashboard"}</span>
          </div>

          {/* Acciones */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* Buscador */}
            <div style={{ position: "relative" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                height: 36, padding: "0 12px",
                borderRadius: 10,
                background: searchFocus ? C.white : C.gray50,
                border: `1.5px solid ${searchFocus ? C.purple : C.gray200}`,
                width: searchFocus ? 260 : 200,
                transition: "all .2s",
                boxShadow: searchFocus ? `0 0 0 3px ${C.purple}15` : "none",
              }}>
                <div style={{ color: C.gray400, flexShrink: 0 }}><IcoSearch /></div>
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onFocus={() => setSearchFocus(true)}
                  onBlur={() => setTimeout(() => { setSearchFocus(false); setSearchQ(""); }, 200)}
                  placeholder="Buscar módulo..."
                  style={{
                    border: "none", outline: "none", fontSize: 12,
                    background: "transparent", color: C.gray700, width: "100%",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              {/* Resultados */}
              {searchFocus && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: C.white, borderRadius: 12,
                  border: `1px solid ${C.gray200}`,
                  boxShadow: `0 12px 40px rgba(124,58,237,0.15)`,
                  overflow: "hidden", zIndex: 100,
                  animation: "ddIn .15s ease",
                }}>
                  {(searchQ.length < 2 ? menuVis.slice(0, 6) : filtered).map(it => (
                    <Link key={it.href} href={it.href}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.purpleBg}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: C.purpleBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.purple }}>
                        <it.icon />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray900 }}>{it.name}</div>
                        <div style={{ fontSize: 10, color: C.gray400 }}>{it.label}</div>
                      </div>
                    </Link>
                  ))}
                  {searchQ.length >= 2 && filtered.length === 0 && (
                    <div style={{ padding: "14px", textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin resultados</div>
                  )}
                </div>
              )}
            </div>

            {/* Separador */}
            <div style={{ width: 1, height: 24, background: C.gray200 }} />

            {/* Notificaciones en tiempo real */}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
                style={{
                  width: 36, height: 36, borderRadius: 9,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: notifOpen ? C.purpleBg : "transparent",
                  border: `1px solid ${notifOpen ? C.purpleBorder : C.gray200}`,
                  cursor: "pointer", color: notifOpen ? C.purple : C.gray500,
                  position: "relative",
                }}>
                <IcoBell />
                {noLeidas > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    width: 16, height: 16, borderRadius: "50%",
                    background: C.orange, color: C.white,
                    fontSize: 8, fontWeight: 900,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `2px solid ${C.white}`,
                    boxShadow: `0 2px 6px ${C.orange}50`,
                  }}>
                    {noLeidas > 9 ? "9+" : noLeidas}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)", width: 360,
                  background: C.white, borderRadius: 16,
                  border: `1px solid ${C.gray200}`,
                  boxShadow: `0 16px 48px rgba(124,58,237,0.15)`,
                  overflow: "hidden", zIndex: 100,
                  animation: "ddIn .15s ease",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", borderBottom: `1px solid ${C.gray100}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.gray900 }}>Notificaciones</span>
                      {noLeidas > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 20, background: C.orange, color: C.white }}>{noLeidas}</span>
                      )}
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: C.greenDark, display: "inline-block",
                        boxShadow: `0 0 6px ${C.greenDark}`,
                        animation: "pulse-dot 2s ease-in-out infinite",
                      }} title="Tiempo real" />
                    </div>
                    {noLeidas > 0 && (
                      <button onClick={marcarLeidas}
                        style={{ fontSize: 11, fontWeight: 700, color: C.purple, background: "none", border: "none", cursor: "pointer" }}>
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: "32px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                        <p style={{ fontSize: 12, color: C.gray400, margin: 0 }}>Sin notificaciones pendientes</p>
                      </div>
                    ) : notifs.map(n => (
                      <div key={n.id}
                        onClick={() => { setNotifs(p => p.map(x => x.id === n.id ? { ...x, leida: true } : x)); if (n.pedidoId) { setNotifOpen(false); router.push("/admin/pedidos"); } }}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "12px 16px", cursor: "pointer",
                          borderBottom: `1px solid ${C.gray100}`,
                          background: n.leida ? "transparent" : `${C.purple}04`,
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.gray50}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.leida ? "transparent" : `${C.purple}04`}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                          background: n.tipo === "pendiente" ? `${C.orange}15` : n.tipo === "procesando" ? `${C.purple}15` : `${C.greenDark}10`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                        }}>
                          {n.tipo === "pendiente" ? "📦" : n.tipo === "procesando" ? "⏳" : n.tipo === "enviado" ? "🚚" : "✅"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray900 }}>{n.titulo}</span>
                            <span style={{ fontSize: 10, color: C.gray400 }}>{tiempoRel(n.fecha)}</span>
                          </div>
                          <p style={{ fontSize: 11, color: C.gray500, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {n.mensaje}
                          </p>
                        </div>
                        {!n.leida && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.purple, marginTop: 4, flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.gray100}` }}>
                    <Link href="/admin/pedidos" onClick={() => setNotifOpen(false)}
                      style={{ fontSize: 12, fontWeight: 600, color: C.purple, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      Ver todos los pedidos →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Separador */}
            <div style={{ width: 1, height: 24, background: C.gray200 }} />

            {/* Perfil */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "4px 10px 4px 4px", borderRadius: 10, cursor: "pointer",
                  background: profileOpen ? C.purpleBg : C.gray50,
                  border: `1px solid ${profileOpen ? C.purpleBorder : C.gray200}`,
                  transition: "all .15s",
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: userFoto ? "transparent" : `linear-gradient(135deg,${C.purple},${C.orange})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900, color: C.white,
                  overflow: "hidden",
                  boxShadow: `0 2px 8px ${C.purple}30`,
                }}>
                  {userFoto
                    ? <img src={userFoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : getInitials(userName)
                  }
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.gray900, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
                  <div style={{ fontSize: 9, color: esSeller ? C.orange : C.purple, fontWeight: 600 }}>
                    {esSeller ? "Vendedor" : superadmin ? "Superadmin" : "Admin"}
                  </div>
                </div>
                <div style={{ transition: "transform .2s", transform: profileOpen ? "rotate(180deg)" : "rotate(0)", color: C.gray400, display:"flex" }}>
                  <IcoChevron dir="down" />
                </div>
              </button>

              {/* Dropdown perfil */}
              {profileOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)", width: 260,
                  background: C.white, borderRadius: 16,
                  border: `1px solid ${C.gray200}`,
                  boxShadow: `0 16px 48px rgba(124,58,237,0.15)`,
                  overflow: "hidden", zIndex: 100,
                  animation: "ddIn .15s ease",
                }}>
                  {/* Header */}
                  <div style={{
                    padding: "16px", textAlign: "center",
                    background: `linear-gradient(135deg,${C.purpleBg},${C.orangeBg})`,
                    borderBottom: `1px solid ${C.gray200}`,
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14, margin: "0 auto 10px",
                      background: userFoto ? "transparent" : `linear-gradient(135deg,${C.purple},${C.orange})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 900, color: C.white,
                      overflow: "hidden",
                      border: `2px solid ${C.white}`,
                      boxShadow: `0 4px 16px ${C.purple}30`,
                    }}>
                      {userFoto
                        ? <img src={userFoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : getInitials(userName)
                      }
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.gray900 }}>{userName}</div>
                    <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>{user?.email}</div>
                    <span style={{
                      display: "inline-block", marginTop: 6,
                      fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 20,
                      background: esSeller ? C.orangeBg : C.purpleBg,
                      color: esSeller ? C.orange : C.purple,
                      border: `1px solid ${esSeller ? C.orange + "30" : C.purpleBorder}`,
                    }}>
                      {esSeller ? "Vendedor" : superadmin ? "★ Superadmin" : "Administrador"}
                    </span>
                  </div>

                  {/* Links */}
                  <div style={{ padding: "8px" }}>
                    {[
                      { icon: IcoUser,     label: "Mi Perfil",    desc: "Ver y editar",          href: "/admin/perfil",    color: C.purple },
                      { icon: IcoActivity, label: "Mi Actividad", desc: "Historial de acciones",  href: "/admin/actividad", color: C.greenDark },
                      ...(!esSeller ? [{ icon: IcoSettings, label: "Configuración", desc: "Ajustes de cuenta", href: "/admin/mi-config", color: C.orange }] : []),
                    ].map((it, i) => (
                      <Link key={i} href={it.href} onClick={() => setProfileOpen(false)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 10px", borderRadius: 10, textDecoration: "none",
                          transition: "background .1s",
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.gray50}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${it.color}12`, display: "flex", alignItems: "center", justifyContent: "center", color: it.color }}>
                          <it.icon />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.gray900 }}>{it.label}</div>
                          <div style={{ fontSize: 10, color: C.gray400 }}>{it.desc}</div>
                        </div>
                      </Link>
                    ))}

                    <div style={{ height: 1, background: C.gray100, margin: "6px 4px" }} />

                    <button
                      onClick={handleLogout} disabled={loggingOut}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 10px", borderRadius: 10, cursor: loggingOut ? "not-allowed" : "pointer",
                        background: "transparent", border: "none", textAlign: "left",
                        opacity: loggingOut ? 0.6 : 1, transition: "background .1s",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fef2f2"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                        {loggingOut
                          ? <div style={{ width: 14, height: 14, border: "2px solid #dc262640", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
                          : <IcoLogout />
                        }
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#dc2626" }}>
                          {loggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
                        </div>
                        <div style={{ fontSize: 10, color: C.gray400 }}>Salir del panel</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main style={{ flex: 1, padding: "24px", overflowY: "auto" }} className="pg-in">
          {children}
        </main>
      </div>

      {/* Estilos globales */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        body { background: #F9FAFB; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd6fe; border-radius: 4px; }
        input::placeholder { color: #9CA3AF; }
        a { color: inherit; }
        @keyframes ddIn   { from { opacity:0; transform:translateY(-6px) scale(.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pgIn   { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .pg-in { animation: pgIn .25s cubic-bezier(.4,0,.2,1); }
        .sb-link:hover .sb-tip { opacity: 1 !important; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}