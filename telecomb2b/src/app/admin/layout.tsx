"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect, useRef, JSX } from "react";
import { doc, getDoc } from "firebase/firestore";

/* ══════════════════════════════════
   PALETA OFICIAL
══════════════════════════════════ */
const C = {
  purple:     "#9851F9",
  purpleDark: "#7C35E0",
  purpleDeep: "#5B1FBE",
  green:      "#28FB4B",
  yellow:     "#F6FA00",
  orange:     "#FF6600",
  white:      "#FFFFFF",
  black:      "#000000",
};

const IS    = { width:22, height:22 } as const;
const IS_SM = { width:18, height:18 } as const;

/* ── ÍCONOS ─────────────────────── */
const IconDashboard = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9"/></svg>);
const IconOrders    = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1.5"/><path strokeLinecap="round" d="M9 12h6M9 16h4"/></svg>);
const IconProducts  = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline strokeLinecap="round" strokeLinejoin="round" points="3.27 6.96 12 12.01 20.73 6.96"/><line strokeLinecap="round" x1="12" y1="22.08" x2="12" y2="12"/></svg>);
const IconCart      = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>);
const IconClients   = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>);
const IconReports   = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 20V10M12 20V4M6 20v-6"/></svg>);
const IconSettings  = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>);
const IconCot       = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>);
const IconCuentas   = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>);
const IconIMEI      = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><path strokeLinecap="round" d="M12 18h.01"/></svg>);
const IconAdmins    = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>);
const IconMail      = () => (<svg style={{ width:19,height:19 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>);
const IconBell      = () => (<svg style={{ width:19,height:19 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>);

// Íconos del menú perfil (pequeños)
const IcoUser    = () => (<svg style={IS_SM} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const IcoGear    = () => (<svg style={IS_SM} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>);
const IcoActivity = () => (<svg style={IS_SM} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><polyline strokeLinecap="round" strokeLinejoin="round" points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>);
const IcoLogout   = () => (<svg style={IS_SM} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>);

/* ── TIPOS ───────────────────────── */
type MenuItem = {
  name: string; href: string; label: string;
  icon: () => JSX.Element; badge?: string; group?: string;
  soloAdmin?: boolean;
};

const GRUPOS = [
  { key:"principal",  label:"Principal"  },
  { key:"comercial",  label:"Comercial"  },
  { key:"inventario", label:"Inventario" },
  { key:"finanzas",   label:"Finanzas"   },
  { key:"sistema",    label:"Sistema"    },
];

const MENU_ITEMS: MenuItem[] = [
  { name:"Dashboard",     href:"/admin",                label:"Visión general",         icon:IconDashboard, group:"principal" },
  { name:"Pedidos",       href:"/admin/pedidos",        label:"Gestión de pedidos",     icon:IconOrders,    group:"principal", badge:"8" },
  { name:"Cotizaciones",  href:"/admin/cotizaciones",   label:"Ciclo B2B completo",     icon:IconCot,       group:"comercial", badge:"NEW" },
  { name:"Venta Rápida",  href:"/admin/venta-manual",   label:"Punto de venta",         icon:IconCart,      group:"comercial" },
  { name:"Clientes",      href:"/admin/clientes",       label:"Base de clientes B2B",   icon:IconClients,   group:"comercial", soloAdmin:true },
  { name:"Productos",     href:"/admin/productos",      label:"Inventario y catálogo",  icon:IconProducts,  group:"inventario" },
  { name:"IMEI / Series", href:"/admin/imei",           label:"Trazabilidad equipos",   icon:IconIMEI,      group:"inventario" },
  { name:"Por Cobrar",    href:"/admin/cuentas-cobrar", label:"Crédito y cobranza",     icon:IconCuentas,   group:"finanzas" },
  { name:"Reportes",      href:"/admin/reportes",       label:"Análisis y estadísticas",icon:IconReports,   group:"finanzas",  badge:"NEW", soloAdmin:true },
  { name:"Configuración", href:"/admin/configuracion",  label:"Ajustes del sistema",    icon:IconSettings,  group:"sistema",   soloAdmin:true },
  { name:"Equipo Admin",  href:"/admin/equipo",         label:"Gestión de admins",      icon:IconAdmins,    group:"sistema",   soloAdmin:true },
];

const ACCENTS = [C.green,C.yellow,C.orange,C.green,C.yellow,C.orange,C.green,C.yellow,C.orange,C.green,C.yellow];

/* ══════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════ */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [user,        setUser]        = useState(auth.currentUser);
  const [userRol,     setUserRol]     = useState<"admin"|"seller"|null>(null);
  const [superadmin,  setSuperadmin]  = useState(false);
  const [userName,    setUserName]    = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted,     setMounted]     = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mailOpen,    setMailOpen]    = useState(false);
  const [searchQ,     setSearchQ]     = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const mailRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "usuarios", u.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUserRol(data.rol === "seller" ? "seller" : "admin");
            setSuperadmin(data.superadmin === true);
            setUserName(data.nombre || u.email?.split("@")[0] || "Admin");
          }
        } catch {
          setUserRol("admin");
          setUserName(u.email?.split("@")[0] || "Admin");
        }
      } else {
        // No hay sesión → redirigir al login
        router.replace("/login");
      }
    });
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (mailRef.current    && !mailRef.current.contains(e.target as Node))    setMailOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => { unsub(); document.removeEventListener("mousedown", handleClick); };
  }, [router]);

  /* ── CERRAR SESIÓN — corregido ── */
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setProfileOpen(false);
    try {
      await signOut(auth);
      // Limpiar cualquier cookie de sesión
      document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      router.replace("/login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      // Forzar redirección aunque falle
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const esSeller = userRol === "seller";

  const menuVisible = MENU_ITEMS.filter(item => {
    if (item.soloAdmin && esSeller) return false;
    return true;
  });

  const filtered = searchQ.length > 1
    ? menuVisible.filter(i =>
        i.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        i.label.toLowerCase().includes(searchQ.toLowerCase()))
    : [];

  if (!mounted) return null;

  const currentPage = menuVisible.find(i =>
    pathname.startsWith(i.href) && (i.href !== "/admin" || pathname === "/admin")
  );

  /* ── Render grupos del sidebar ── */
  const renderGrupo = (grupoKey: string, grupoLabel: string) => {
    const items = menuVisible.filter(i => i.group === grupoKey);
    if (!items.length) return null;
    return (
      <div key={grupoKey} style={{ marginBottom:10 }}>
        {sidebarOpen && (
          <div style={{
            fontSize:9, fontWeight:900, color:"rgba(255,255,255,0.22)",
            letterSpacing:"0.22em", margin:"0 8px 7px", paddingLeft:10,
            textTransform:"uppercase", display:"flex", alignItems:"center", gap:8,
          }}>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)", borderRadius:4 }}/>
            {grupoLabel}
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)", borderRadius:4 }}/>
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {items.map((item) => {
            const globalIdx = MENU_ITEMS.indexOf(item);
            const isActive  = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const accent    = ACCENTS[globalIdx % ACCENTS.length];
            const Icon      = item.icon;
            return (
              <Link key={item.href} href={item.href}
                title={!sidebarOpen ? item.name : undefined}
                className="sb-link"
                style={{
                  display:"flex", alignItems:"center",
                  gap: sidebarOpen ? 12 : 0,
                  padding: sidebarOpen ? "9px 10px 9px 14px" : "11px 0",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  borderRadius:14, textDecoration:"none", position:"relative",
                  background: isActive
                    ? "rgba(255,255,255,0.14)"
                    : "transparent",
                  border: isActive
                    ? "1px solid rgba(255,255,255,0.18)"
                    : "1px solid transparent",
                  transition:"all .18s cubic-bezier(.4,0,.2,1)",
                }}>

                {/* Barra lateral activa */}
                {isActive && (
                  <div style={{
                    position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
                    width:3.5, height:26, borderRadius:"0 8px 8px 0",
                    background:accent,
                    boxShadow:`0 0 18px ${accent}, 0 0 8px ${accent}80`,
                  }}/>
                )}

                {/* Ícono */}
                <div style={{
                  width:38, height:38, borderRadius:11, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all .18s",
                  background: isActive
                    ? accent
                    : "rgba(255,255,255,0.08)",
                  color: isActive ? "#000" : "rgba(255,255,255,0.7)",
                  boxShadow: isActive ? `0 4px 18px ${accent}60` : "none",
                }}>
                  <Icon />
                </div>

                {/* Texto */}
                {sidebarOpen && (
                  <>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13, lineHeight:1.2,
                        fontWeight: isActive ? 800 : 500,
                        color: isActive ? "#fff" : "rgba(255,255,255,0.78)",
                      }}>{item.name}</div>
                      <div style={{
                        fontSize:10, marginTop:1.5,
                        color: isActive ? accent : "rgba(255,255,255,0.32)",
                      }}>{item.label}</div>
                    </div>
                    {item.badge && (
                      <span style={{
                        fontSize:9, fontWeight:900,
                        padding:"2px 8px", borderRadius:20, flexShrink:0,
                        background: item.badge === "NEW" ? C.yellow : C.orange,
                        color: item.badge === "NEW" ? "#000" : "#fff",
                        boxShadow:`0 2px 10px ${item.badge==="NEW"?"rgba(246,250,0,0.5)":"rgba(255,102,0,0.5)"}`,
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Tooltip cuando está colapsado */}
                {!sidebarOpen && (
                  <div className="sb-tip" style={{
                    position:"absolute", left:"calc(100% + 16px)", top:"50%", transform:"translateY(-50%)",
                    background:"rgba(10,10,30,0.95)", color:"#fff",
                    fontSize:12, fontWeight:700,
                    padding:"7px 14px", borderRadius:10, whiteSpace:"nowrap",
                    pointerEvents:"none", zIndex:200,
                    boxShadow:`0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px ${C.purple}30`,
                  }}>
                    {item.name}
                    <div style={{
                      position:"absolute", right:"100%", top:"50%", transform:"translateY(-50%)",
                      borderWidth:5, borderStyle:"solid",
                      borderColor:"transparent rgba(10,10,30,0.95) transparent transparent",
                    }}/>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────
     RENDER
  ───────────────────────────────── */
  return (
    <div style={{
      display:"flex", minHeight:"100vh",
      fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif",
      background:"#f0eaff", position:"relative",
    }}>

      {/* Fondo galaxia */}
      <canvas id="galaxy-canvas" style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none", width:"100%", height:"100%",
      }}/>

      {/* ══════════ SIDEBAR ══════════ */}
      <aside style={{
        position:"fixed", top:0, left:0, height:"100%", zIndex:40,
        width: sidebarOpen ? 272 : 76,
        background:`linear-gradient(168deg,
          #7928CA 0%,
          ${C.purple} 35%,
          #6B22CC 70%,
          #5B1FBE 100%)`,
        display:"flex", flexDirection:"column",
        transition:"width .32s cubic-bezier(.4,0,.2,1)",
        boxShadow:"8px 0 40px rgba(80,20,180,0.45), 2px 0 0 rgba(255,255,255,0.05)",
        overflow:"hidden",
      }}>

        {/* Orbs decorativos */}
        <div style={{ position:"absolute", top:-60, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(40,251,75,0.08)", filter:"blur(50px)", pointerEvents:"none", zIndex:0 }}/>
        <div style={{ position:"absolute", bottom:80, left:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,102,0,0.1)", filter:"blur(50px)", pointerEvents:"none", zIndex:0 }}/>
        <div style={{ position:"absolute", top:"40%", right:-20, width:120, height:120, borderRadius:"50%", background:"rgba(246,250,0,0.06)", filter:"blur(40px)", pointerEvents:"none", zIndex:0 }}/>

        {/* ── Logo ── */}
        <div style={{
          display:"flex", alignItems:"center", position:"relative", zIndex:2,
          padding: sidebarOpen ? "18px 18px 14px" : "18px 0 14px",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          borderBottom:"1px solid rgba(255,255,255,0.1)",
        }}>
          {/* Logo box */}
          <div style={{
            width:42, height:42, borderRadius:12, flexShrink:0,
            background:`linear-gradient(135deg, ${C.green} 0%, ${C.yellow} 100%)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, fontWeight:900, color:"#000",
            boxShadow:`0 4px 20px rgba(40,251,75,0.45), 0 0 0 2px rgba(255,255,255,0.12)`,
          }}>W</div>

          {sidebarOpen && (
            <div style={{ marginLeft:11, overflow:"hidden", animation:"sideIn .2s ease" }}>
              <div style={{ fontSize:15, fontWeight:900, color:"#fff", letterSpacing:"-0.02em", whiteSpace:"nowrap" }}>
                Tiendas Waly
              </div>
              <div style={{
                fontSize:9, fontWeight:800, letterSpacing:"0.18em", marginTop:1.5,
                color: esSeller ? C.orange : superadmin ? C.yellow : C.green,
                textTransform:"uppercase",
              }}>
                {esSeller ? "● Vendedor" : superadmin ? "★ Superadmin" : "● Admin Panel"}
              </div>
            </div>
          )}
        </div>

        {/* Botón colapsar */}
        <button onClick={() => setSidebarOpen(v => !v)} style={{
          position:"absolute", right:-11, top:80,
          width:22, height:22,
          background:`linear-gradient(135deg, ${C.green}, #1de23a)`,
          border:"none", borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:`0 2px 12px rgba(40,251,75,0.6)`,
          cursor:"pointer", zIndex:50,
          transition:"transform .2s",
        }}>
          <svg style={{
            width:10, height:10, color:"#000",
            transform: sidebarOpen ? "" : "rotate(180deg)",
            transition:"transform .3s",
          }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* Badge seller */}
        {sidebarOpen && esSeller && (
          <div style={{
            margin:"8px 10px 0", padding:"6px 12px", borderRadius:10,
            background:"rgba(255,102,0,0.15)",
            border:"1px solid rgba(255,102,0,0.3)",
            display:"flex", alignItems:"center", gap:7, position:"relative", zIndex:2,
          }}>
            <svg style={{ width:12, height:12, color:C.orange, flexShrink:0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span style={{ fontSize:10, color:C.orange, fontWeight:700 }}>Acceso limitado</span>
          </div>
        )}

        {/* Nav */}
        <nav style={{
          flex:1, padding:"12px 8px 8px",
          overflowY:"auto", overflowX:"hidden",
          position:"relative", zIndex:2,
        }}>
          {GRUPOS.map(g => renderGrupo(g.key, g.label))}
        </nav>

        {/* Footer — usuario actual */}
        <div style={{
          padding:"10px 10px 14px",
          borderTop:"1px solid rgba(255,255,255,0.08)",
          position:"relative", zIndex:2,
        }}>
          {sidebarOpen ? (
            <div style={{
              display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
              borderRadius:12,
              background:"rgba(255,255,255,0.07)",
              border:"1px solid rgba(255,255,255,0.1)",
            }}>
              <div style={{
                width:32, height:32, borderRadius:9, flexShrink:0,
                background:`linear-gradient(135deg, ${esSeller?C.orange:C.green}, ${C.yellow})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:900, color:"#000",
              }}>
                {userName?.[0]?.toUpperCase() || "A"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {userName}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:C.green, boxShadow:`0 0 8px ${C.green}` }}/>
                  <span style={{ fontSize:9, color:"rgba(255,255,255,0.5)", fontWeight:600 }}>En línea</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"center" }}>
              <div style={{
                width:32, height:32, borderRadius:9,
                background:`linear-gradient(135deg, ${esSeller?C.orange:C.green}, ${C.yellow})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:900, color:"#000",
              }}>
                {userName?.[0]?.toUpperCase() || "A"}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <div style={{
        flex:1,
        marginLeft: sidebarOpen ? 272 : 76,
        display:"flex", flexDirection:"column",
        transition:"margin-left .32s cubic-bezier(.4,0,.2,1)",
        position:"relative", zIndex:1,
      }}>

        {/* ── HEADER ── */}
        <header style={{
          height:64, position:"sticky", top:0, zIndex:30,
          background:`linear-gradient(90deg,
            #8B3EF5 0%,
            ${C.purple} 50%,
            ${C.purpleDark} 100%)`,
          borderBottom:"1px solid rgba(255,255,255,0.08)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 24px",
          boxShadow:`0 4px 24px rgba(120,50,220,0.4), 0 1px 0 rgba(255,255,255,0.08)`,
        }}>

          {/* Breadcrumb */}
          <div>
            <h1 style={{ fontSize:16, fontWeight:900, color:"#fff", margin:0, letterSpacing:"-0.02em" }}>
              {currentPage?.name || "Dashboard"}
            </h1>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>
                {esSeller ? "Vendedor" : superadmin ? "Superadmin" : "Admin"}
              </span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)" }}>›</span>
              <span style={{ fontSize:10, color: esSeller ? C.orange : C.green, fontWeight:700 }}>
                {currentPage?.name || "Dashboard"}
              </span>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>

            {/* Buscador */}
            <div style={{ position:"relative" }}>
              <div style={{
                display:"flex", alignItems:"center", gap:8, height:36, padding:"0 12px",
                borderRadius:11,
                width: searchFocus ? 280 : 210,
                background: searchFocus ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.12)",
                border:`1.5px solid ${searchFocus ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.18)"}`,
                backdropFilter:"blur(10px)",
                transition:"all .22s cubic-bezier(.4,0,.2,1)",
              }}>
                <svg style={{ width:13, height:13, color: searchFocus ? C.purple : "rgba(255,255,255,0.6)", flexShrink:0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                </svg>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  onFocus={() => setSearchFocus(true)}
                  onBlur={() => setTimeout(() => { setSearchFocus(false); setSearchQ(""); }, 200)}
                  placeholder="Buscar módulo..."
                  style={{
                    border:"none", outline:"none", fontSize:12, fontFamily:"inherit",
                    width:"100%", background:"transparent",
                    color: searchFocus ? "#1a1a2e" : "#fff",
                  }}
                />
              </div>
              {searchFocus && (
                <div className="dd-panel" style={{
                  position:"absolute", top:"calc(100% + 8px)", left:0, right:0,
                  background:"#fff", borderRadius:14,
                  border:"1px solid rgba(152,81,249,0.15)",
                  boxShadow:"0 20px 50px rgba(100,40,200,0.2)",
                  overflow:"hidden", zIndex:100,
                }}>
                  <div style={{ padding:8 }}>
                    {(searchQ.length < 2 ? menuVisible.slice(0,6) : filtered).map(it => (
                      <Link key={it.href} href={it.href} className="srow" style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:10, textDecoration:"none" }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:`${C.purple}12`, display:"flex", alignItems:"center", justifyContent:"center", color:C.purple, flexShrink:0 }}><it.icon/></div>
                        <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", flex:1 }}>{it.name}</span>
                        <span style={{ fontSize:11, color:"#94a3b8" }}>{it.label}</span>
                      </Link>
                    ))}
                    {searchQ.length >= 2 && filtered.length === 0 && (
                      <div style={{ padding:"14px", textAlign:"center", fontSize:13, color:"#94a3b8" }}>Sin resultados</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ width:1, height:24, background:"rgba(255,255,255,0.18)" }}/>

            {/* Mail */}
            <div ref={mailRef} style={{ position:"relative" }}>
              <button onClick={() => { setMailOpen(v => !v); setNotifOpen(false); setProfileOpen(false); }}
                className="hdr-btn"
                style={{ width:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background: mailOpen ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)", border:`1.5px solid ${mailOpen ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.15)"}`, cursor:"pointer", position:"relative", color:"#fff" }}>
                <IconMail/>
                <span style={{ position:"absolute", top:-5, right:-5, width:16, height:16, borderRadius:"50%", background:C.yellow, color:"#000", fontSize:8, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid rgba(152,81,249,0.8)" }}>2</span>
              </button>
              {mailOpen && (
                <div className="dd-panel" style={{ position:"absolute", right:0, top:"calc(100% + 10px)", width:350, background:"#fff", borderRadius:18, border:"1px solid rgba(152,81,249,0.15)", boxShadow:"0 24px 60px rgba(100,40,200,0.2)", zIndex:100, overflow:"hidden" }}>
                  <div style={{ background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Mensajes</span>
                    <span style={{ fontSize:10, padding:"3px 10px", borderRadius:20, background:C.yellow, color:"#000", fontWeight:900 }}>2 sin leer</span>
                  </div>
                  <div style={{ padding:8 }}>
                    {[
                      { de:"Data Center MX", msg:"Necesitamos cotización urgente...", hora:"10:32", unread:true,  av:"D", c:C.purple },
                      { de:"Redes Pro S.A.",  msg:"¿Tienen iPhone 15 Pro Max?",       hora:"09:15", unread:true,  av:"R", c:C.orange },
                      { de:"FiberNet",        msg:"Confirmamos el pedido #7277.",     hora:"Ayer",  unread:false, av:"F", c:C.green  },
                    ].map((m,i) => (
                      <div key={i} className="drow" style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 11px", borderRadius:10, cursor:"pointer", background:m.unread?`${m.c}08`:"transparent", marginBottom:2 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:m.c, color:m.c===C.green?"#000":"#fff", fontSize:13, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{m.av}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", justifyContent:"space-between" }}>
                            <span style={{ fontSize:13, fontWeight:m.unread?800:500, color:"#0a0a1e" }}>{m.de}</span>
                            <span style={{ fontSize:10, color:"#94a3b8" }}>{m.hora}</span>
                          </div>
                          <p style={{ fontSize:11, color:"#64748b", margin:"2px 0 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notificaciones */}
            <div ref={notifRef} style={{ position:"relative" }}>
              <button onClick={() => { setNotifOpen(v => !v); setMailOpen(false); setProfileOpen(false); }}
                className="hdr-btn"
                style={{ width:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background:notifOpen?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.1)", border:`1.5px solid ${notifOpen?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.15)"}`, cursor:"pointer", position:"relative", color:"#fff" }}>
                <IconBell/>
                <span style={{ position:"absolute", top:-5, right:-5, width:16, height:16, borderRadius:"50%", background:C.orange, color:"#fff", fontSize:8, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid rgba(152,81,249,0.8)" }}>3</span>
              </button>
              {notifOpen && (
                <div className="dd-panel" style={{ position:"absolute", right:0, top:"calc(100% + 10px)", width:370, background:"#fff", borderRadius:18, border:"1px solid rgba(152,81,249,0.15)", boxShadow:"0 24px 60px rgba(100,40,200,0.2)", zIndex:100, overflow:"hidden" }}>
                  <div style={{ background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Notificaciones</span>
                    <button style={{ fontSize:11, color:C.yellow, fontWeight:700, background:"none", border:"none", cursor:"pointer" }}>Marcar leído</button>
                  </div>
                  <div style={{ padding:8, maxHeight:300, overflowY:"auto" }}>
                    {[
                      { ico:"⚡", t:"Stock crítico",      d:"3 modelos próximos a agotarse",       time:"5 min",  c:C.yellow, unread:true  },
                      { ico:"💳", t:"Pagos pendientes",   d:"2 cuentas vencen hoy",                time:"23 min", c:C.orange, unread:true  },
                      { ico:"📋", t:"Cotización aprobada",d:"Data Center MX aprobó COT-2026-0023", time:"1h",     c:C.purple, unread:false },
                      { ico:"✅", t:"Nuevo cliente B2B",  d:"FiberNet completó verificación",      time:"2h",     c:C.green,  unread:false },
                    ].map((n,i) => (
                      <div key={i} className="drow" style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 11px", borderRadius:10, cursor:"pointer", background:n.unread?`${n.c}08`:"transparent", marginBottom:2 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:n.c===C.yellow?C.yellow:`${n.c}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{n.ico}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", justifyContent:"space-between" }}>
                            <span style={{ fontSize:12, fontWeight:800, color:"#0a0a1e" }}>{n.t}</span>
                            <span style={{ fontSize:10, color:"#94a3b8" }}>hace {n.time}</span>
                          </div>
                          <p style={{ fontSize:11, color:"#64748b", margin:"2px 0 0" }}>{n.d}</p>
                        </div>
                        {n.unread && <div style={{ width:7, height:7, borderRadius:"50%", background:n.c, marginTop:5, flexShrink:0 }}/>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ width:1, height:24, background:"rgba(255,255,255,0.18)" }}/>

            {/* Perfil */}
            <div ref={profileRef} style={{ position:"relative" }}>
              <button onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); setMailOpen(false); }}
                style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"4px 10px 4px 4px", borderRadius:11, cursor:"pointer",
                  background: profileOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                  border:`1.5px solid ${profileOpen ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`,
                  transition:"all .15s",
                }}>
                {/* Avatar */}
                <div style={{
                  width:32, height:32, borderRadius:9, flexShrink:0,
                  background:`linear-gradient(135deg, ${esSeller?C.orange:C.green}, ${C.yellow})`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:13, fontWeight:900, color:"#000",
                  boxShadow:`0 2px 10px ${esSeller?C.orange:C.green}50`,
                }}>
                  {userName?.[0]?.toUpperCase() || "A"}
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#fff", lineHeight:1.2, maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {userName}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:1 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background: esSeller ? C.orange : C.green }}/>
                    <span style={{ fontSize:9, color:"rgba(255,255,255,0.55)" }}>
                      {esSeller ? "Vendedor" : superadmin ? "Superadmin" : "Administrador"}
                    </span>
                  </div>
                </div>
                <svg style={{ width:11, height:11, color:"rgba(255,255,255,0.6)", transform:profileOpen?"rotate(180deg)":"", transition:"transform .2s" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {/* Dropdown perfil */}
              {profileOpen && (
                <div className="dd-panel" style={{
                  position:"absolute", right:0, top:"calc(100% + 10px)", width:270,
                  background:"#fff", borderRadius:18,
                  border:"1px solid rgba(152,81,249,0.15)",
                  boxShadow:"0 24px 60px rgba(100,40,200,0.22)",
                  zIndex:100, overflow:"hidden",
                }}>
                  {/* Header del dropdown */}
                  <div style={{
                    background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
                    padding:"20px 18px", textAlign:"center", position:"relative", overflow:"hidden",
                  }}>
                    <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:"rgba(40,251,75,0.15)", filter:"blur(20px)" }}/>
                    <div style={{ position:"absolute", bottom:-20, left:-20, width:80, height:80, borderRadius:"50%", background:"rgba(255,102,0,0.1)", filter:"blur(20px)" }}/>
                    <div style={{
                      width:56, height:56, borderRadius:16, margin:"0 auto 10px",
                      background:`linear-gradient(135deg, ${esSeller?C.orange:C.green}, ${C.yellow})`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:22, fontWeight:900, color:"#000",
                      position:"relative", zIndex:1,
                      boxShadow:`0 4px 20px ${esSeller?C.orange:C.green}50`,
                    }}>
                      {userName?.[0]?.toUpperCase() || "A"}
                    </div>
                    <div style={{ fontSize:14, fontWeight:800, color:"#fff", position:"relative", zIndex:1 }}>
                      {userName}
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2, position:"relative", zIndex:1 }}>
                      {user?.email}
                    </div>
                    <div style={{
                      display:"inline-flex", alignItems:"center", gap:5, marginTop:8,
                      padding:"3px 12px", borderRadius:20,
                      background: esSeller ? "rgba(255,102,0,0.2)" : "rgba(40,251,75,0.18)",
                      border:`1px solid ${esSeller ? "rgba(255,102,0,0.35)" : "rgba(40,251,75,0.35)"}`,
                      position:"relative", zIndex:1,
                    }}>
                      <div style={{ width:5, height:5, borderRadius:"50%", background: esSeller ? C.orange : C.green }}/>
                      <span style={{ fontSize:10, color: esSeller ? C.orange : C.green, fontWeight:700 }}>
                        {esSeller ? "Vendedor" : superadmin ? "Superadmin" : "Administrador"}
                      </span>
                    </div>
                  </div>

                  {/* Opciones del menú — con Link reales */}
                  <div style={{ padding:8 }}>
                    {[
                      { icon:<IcoUser/>,     label:"Mi Perfil",     desc:"Ver y editar perfil",  href:"/admin/perfil",      c:C.purple, bg:`${C.purple}12` },
                      ...(!esSeller ? [
                        { icon:<IcoGear/>,   label:"Configuración", desc:"Ajustes de mi cuenta", href:"/admin/mi-config",   c:C.orange, bg:`${C.orange}12` },
                      ] : []),
                      { icon:<IcoActivity/>, label:"Mi Actividad",  desc:"Historial de acciones",href:"/admin/actividad",   c:C.green,  bg:`${C.green}12`  },
                    ].map((it,i) => (
                      <Link key={i} href={it.href} onClick={() => setProfileOpen(false)}
                        className="prow" style={{
                          width:"100%", display:"flex", alignItems:"center", gap:11,
                          padding:"9px 11px", borderRadius:11, cursor:"pointer",
                          background:"transparent", textDecoration:"none",
                        }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:it.bg, display:"flex", alignItems:"center", justifyContent:"center", color:it.c, flexShrink:0 }}>
                          {it.icon}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{it.label}</div>
                          <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{it.desc}</div>
                        </div>
                      </Link>
                    ))}

                    <div style={{ height:1, background:"rgba(152,81,249,0.08)", margin:"6px 4px" }}/>

                    {/* Cerrar sesión — FUNCIONAL */}
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="lrow"
                      style={{
                        width:"100%", display:"flex", alignItems:"center", gap:11,
                        padding:"9px 11px", borderRadius:11, cursor: loggingOut ? "not-allowed" : "pointer",
                        background:"transparent", border:"none", textAlign:"left",
                        opacity: loggingOut ? 0.6 : 1,
                      }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,102,0,0.12)", display:"flex", alignItems:"center", justifyContent:"center", color:C.orange, flexShrink:0 }}>
                        {loggingOut
                          ? <div style={{ width:16, height:16, border:`2px solid ${C.orange}40`, borderTopColor:C.orange, borderRadius:"50%", animation:"spin .6s linear infinite" }}/>
                          : <IcoLogout/>
                        }
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:C.orange }}>
                          {loggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
                        </div>
                        <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>Salir del panel</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main style={{ flex:1, padding:"24px", overflowY:"auto" }} className="pg-in">
          {children}
        </main>
      </div>

      {/* ESTILOS GLOBALES */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { background: #f0eaff; }
        input::placeholder { color: rgba(255,255,255,0.45) !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(152,81,249,0.28); border-radius: 5px; }
        @keyframes sideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        @keyframes ddIn   { from { opacity:0; transform:translateY(-8px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pgIn   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .pg-in    { animation: pgIn .28s cubic-bezier(.4,0,.2,1); }
        .dd-panel { animation: ddIn .18s cubic-bezier(.4,0,.2,1); }
        .sb-link:hover { background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.12) !important; }
        .sb-link .sb-tip { opacity:0; transition:opacity .12s; }
        .sb-link:hover .sb-tip { opacity:1 !important; }
        .hdr-btn:hover { background: rgba(255,255,255,0.24) !important; border-color: rgba(255,255,255,0.4) !important; }
        .srow:hover { background: rgba(152,81,249,0.07) !important; }
        .drow:hover { background: rgba(152,81,249,0.04) !important; }
        .prow:hover { background: rgba(152,81,249,0.07) !important; }
        .lrow:hover { background: rgba(255,102,0,0.07) !important; }
        /* Quitar flechitas de input number */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Fondo galaxia animado */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          const c=document.getElementById('galaxy-canvas');
          if(!c)return;
          const ctx=c.getContext('2d');
          let W=c.width=innerWidth,H=c.height=innerHeight;
          window.addEventListener('resize',()=>{W=c.width=innerWidth;H=c.height=innerHeight;});
          const stars=Array.from({length:160},()=>({
            x:Math.random()*W,y:Math.random()*H,
            r:Math.random()*1.3+0.2,o:Math.random()*0.3+0.05,sp:Math.random()*0.35+0.05,
            dx:(Math.random()-.5)*0.05,dy:(Math.random()-.5)*0.05,
            col:['152,81,249','40,251,75','246,250,0','255,102,0'][Math.floor(Math.random()*4)],
          }));
          const nebulae=Array.from({length:5},()=>({
            x:Math.random()*W,y:Math.random()*H,
            r:Math.random()*180+80,t:Math.random()*Math.PI*2,sp:0.0015+Math.random()*0.003,
            col:['152,81,249','40,251,75','255,102,0','246,250,0'][Math.floor(Math.random()*4)],
          }));
          let f=0;
          function draw(){
            ctx.clearRect(0,0,W,H);f++;
            nebulae.forEach(n=>{
              n.t+=n.sp;
              const px=n.x+Math.sin(n.t)*45,py=n.y+Math.cos(n.t*.65)*30;
              const g=ctx.createRadialGradient(px,py,0,px,py,n.r);
              g.addColorStop(0,'rgba('+n.col+',0.035)');
              g.addColorStop(.5,'rgba('+n.col+',0.012)');
              g.addColorStop(1,'rgba('+n.col+',0)');
              ctx.beginPath();ctx.arc(px,py,n.r,0,Math.PI*2);
              ctx.fillStyle=g;ctx.fill();
            });
            stars.forEach(s=>{
              s.x+=s.dx;s.y+=s.dy;
              if(s.x<0)s.x=W;if(s.x>W)s.x=0;
              if(s.y<0)s.y=H;if(s.y>H)s.y=0;
              const fl=s.o+Math.sin(f*s.sp+s.x*.008)*0.15;
              ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
              ctx.fillStyle='rgba('+s.col+','+Math.max(.03,Math.min(.6,fl))+')';
              ctx.fill();
            });
            requestAnimationFrame(draw);
          }
          draw();
        })();
      `}}/>
    </div>
  );
}