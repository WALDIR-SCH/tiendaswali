"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, JSX } from "react";

const C = {
  purple:"#9851F9", purpleDark:"#7C35E0", purpleDeep:"#5B1FBE",
  green:"#28FB4B",  yellow:"#F6FA00", orange:"#FF6600",
  black:"#000000",  white:"#FFFFFF",
};

const IS    = { width:22, height:22 } as const;
const IS_SM = { width:18, height:18 } as const;

/* ─── ÍCONOS ─── */
const IconDashboard  = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9"/></svg>);
const IconOrders     = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1.5"/><path strokeLinecap="round" d="M9 12h6M9 16h4"/></svg>);
const IconProducts   = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline strokeLinecap="round" strokeLinejoin="round" points="3.27 6.96 12 12.01 20.73 6.96"/><line strokeLinecap="round" x1="12" y1="22.08" x2="12" y2="12"/></svg>);
const IconCart       = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>);
const IconClients    = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>);
const IconReports    = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 20V10M12 20V4M6 20v-6"/></svg>);
const IconSettings   = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>);
const IconCot        = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>);
const IconCuentas    = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>);
const IconIMEI       = () => (<svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><path strokeLinecap="round" d="M12 18h.01"/></svg>);
const IconProfile    = () => (<svg style={IS_SM} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const IconActivity   = () => (<svg style={IS_SM} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><polyline strokeLinecap="round" strokeLinejoin="round" points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>);
const IconConfig     = () => (<svg style={IS_SM} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>);
const IconLogout     = () => (<svg style={IS_SM} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>);
const IconMail       = () => (<svg style={{ width:19,height:19 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>);
const IconBell       = () => (<svg style={{ width:19,height:19 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>);

type MenuItem = {
  name:string; href:string; label:string;
  icon:()=>JSX.Element; badge?:string; group?:string;
};

/* ─── GRUPOS DEL MENÚ ─── */
const GRUPOS = [
  { key:"principal",  label:"Principal"  },
  { key:"comercial",  label:"Comercial"  },
  { key:"inventario", label:"Inventario" },
  { key:"finanzas",   label:"Finanzas"   },
  { key:"sistema",    label:"Sistema"    },
];

const MENU_ITEMS: MenuItem[] = [
  { name:"Dashboard",       href:"/admin",                    label:"Visión general",        icon:IconDashboard, group:"principal" },
  { name:"Pedidos",         href:"/admin/pedidos",            label:"Gestión de pedidos",    icon:IconOrders,    group:"principal", badge:"8" },
  { name:"Cotizaciones",    href:"/admin/cotizaciones",       label:"Ciclo B2B completo",    icon:IconCot,       group:"comercial",  badge:"NEW" },
  { name:"Venta Rápida",    href:"/admin/venta-manual",       label:"Punto de venta",        icon:IconCart,      group:"comercial" },
  { name:"Clientes",        href:"/admin/clientes",           label:"Base de clientes B2B",  icon:IconClients,   group:"comercial" },
  { name:"Productos",       href:"/admin/productos",          label:"Inventario y catálogo", icon:IconProducts,  group:"inventario" },
  { name:"IMEI / Series",   href:"/admin/imei",               label:"Trazabilidad equipos",  icon:IconIMEI,      group:"inventario" },
  { name:"Por Cobrar",      href:"/admin/cuentas-cobrar",     label:"Crédito y cobranza",    icon:IconCuentas,   group:"finanzas" },
  { name:"Reportes",        href:"/admin/reportes",           label:"Análisis y estadísticas",icon:IconReports,  group:"finanzas", badge:"NEW" },
  { name:"Configuración",   href:"/admin/configuracion",      label:"Ajustes del sistema",   icon:IconSettings,  group:"sistema" },
];

const ACCENTS = [C.green, C.yellow, C.orange, C.green, C.yellow, C.orange, C.green, C.yellow, C.orange, C.green];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const router     = useRouter();
  const [user, setUser]               = useState(auth.currentUser);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted]         = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mailOpen, setMailOpen]       = useState(false);
  const [searchQ, setSearchQ]         = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const mailRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const unsub = auth.onAuthStateChanged(setUser);
    const h = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (mailRef.current    && !mailRef.current.contains(e.target as Node))    setMailOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => { unsub(); document.removeEventListener("mousedown", h); };
  }, []);

  const handleLogout = async () => { await signOut(auth); router.push("/login"); };

  const filtered = searchQ.length > 1
    ? MENU_ITEMS.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase()) || i.label.toLowerCase().includes(searchQ.toLowerCase()))
    : [];

  if (!mounted) return null;
  const currentPage = MENU_ITEMS.find(i => pathname.startsWith(i.href) && (i.href !== "/admin" || pathname === "/admin"));

  /* ─── Render grupos en sidebar ─── */
  const renderGrupo = (grupoKey: string, grupoLabel: string) => {
    const items = MENU_ITEMS.filter(i => i.group === grupoKey);
    if (items.length === 0) return null;
    return (
      <div key={grupoKey} style={{ marginBottom:8 }}>
        {sidebarOpen && (
          <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.28)", letterSpacing:"0.18em", margin:"0 6px 6px", paddingLeft:8, textTransform:"uppercase" }}>
            {grupoLabel}
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          {items.map((item, idx) => {
            const globalIdx = MENU_ITEMS.indexOf(item);
            const isActive  = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const accent    = ACCENTS[globalIdx % ACCENTS.length];
            const Icon      = item.icon;
            return (
              <Link key={item.href} href={item.href} title={!sidebarOpen ? item.name : undefined}
                className="sb-link"
                style={{
                  display:"flex", alignItems:"center",
                  gap: sidebarOpen ? 13 : 0,
                  padding: sidebarOpen ? "10px 12px" : "11px 0",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  borderRadius:13, textDecoration:"none", position:"relative",
                  background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                  border: isActive ? "1px solid rgba(255,255,255,0.22)" : "1px solid transparent",
                  transition:"all .2s cubic-bezier(.4,0,.2,1)",
                }}>
                {isActive && (
                  <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:4, height:22, borderRadius:"0 6px 6px 0", background:accent, boxShadow:`0 0 14px ${accent}` }} />
                )}
                <div style={{
                  width:40, height:40, borderRadius:12, flexShrink:0,
                  background: isActive ? accent : "rgba(255,255,255,0.1)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all .2s",
                  color: isActive ? "#000" : "rgba(255,255,255,0.78)",
                  boxShadow: isActive ? `0 6px 22px ${accent}65` : "none",
                }}>
                  <Icon />
                </div>
                {sidebarOpen && (
                  <>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight: isActive ? 800 : 500, color: isActive ? "#fff" : "rgba(255,255,255,0.8)", lineHeight:1.2 }}>{item.name}</div>
                      <div style={{ fontSize:10, color: isActive ? accent : "rgba(255,255,255,0.38)", marginTop:1 }}>{item.label}</div>
                    </div>
                    {item.badge && (
                      <span style={{
                        fontSize:9, fontWeight:900, padding:"2px 7px", borderRadius:20, flexShrink:0,
                        background: item.badge === "NEW" ? C.yellow : C.orange,
                        color: item.badge === "NEW" ? "#000" : "#fff",
                        boxShadow:`0 3px 10px ${item.badge==="NEW" ? "rgba(246,250,0,0.55)" : "rgba(255,102,0,0.55)"}`,
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {!sidebarOpen && (
                  <div className="sb-tip" style={{
                    position:"absolute", left:"calc(100% + 14px)", top:"50%", transform:"translateY(-50%)",
                    background:"#0a0a1e", color:"#fff", fontSize:12, fontWeight:700,
                    padding:"7px 14px", borderRadius:10, whiteSpace:"nowrap",
                    pointerEvents:"none", zIndex:100,
                    boxShadow:"0 8px 30px rgba(0,0,0,0.35)",
                    border:`1px solid ${C.purple}40`,
                  }}>
                    {item.name}
                    <div style={{ position:"absolute", right:"100%", top:"50%", transform:"translateY(-50%)", borderWidth:5, borderStyle:"solid", borderColor:"transparent #0a0a1e transparent transparent" }} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", background:"#f0eaff", position:"relative" }}>

      {/* Galaxy BG canvas */}
      <canvas id="galaxy-canvas" style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", width:"100%", height:"100%" }} />

      {/* ══════════ SIDEBAR ══════════ */}
      <aside style={{
        position:"fixed", top:0, left:0, height:"100%", zIndex:40,
        width: sidebarOpen ? 268 : 78,
        background:`linear-gradient(170deg, #8B3EF5 0%, ${C.purple} 40%, #6B22CC 100%)`,
        display:"flex", flexDirection:"column",
        transition:"width .35s cubic-bezier(.4,0,.2,1)",
        boxShadow:"6px 0 50px rgba(152,81,249,0.5)",
        overflow:"hidden",
      }}>
        {/* Orbs decorativos */}
        <div style={{ position:"absolute", top:-50, right:-50, width:180, height:180, borderRadius:"50%", background:"rgba(40,251,75,0.1)", filter:"blur(40px)", pointerEvents:"none", zIndex:0 }} />
        <div style={{ position:"absolute", bottom:100, left:-30, width:150, height:150, borderRadius:"50%", background:"rgba(255,102,0,0.12)", filter:"blur(45px)", pointerEvents:"none", zIndex:0 }} />

        {/* Logo */}
        <div style={{
          display:"flex", alignItems:"center", position:"relative", zIndex:2,
          padding: sidebarOpen ? "20px 20px 16px" : "20px 0 16px",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          borderBottom:"1px solid rgba(255,255,255,0.12)",
        }}>
          <div style={{
            width:44, height:44, borderRadius:13, flexShrink:0,
            background:`linear-gradient(135deg, ${C.green}, ${C.yellow})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:21, fontWeight:900, color:"#000",
            boxShadow:`0 6px 24px rgba(40,251,75,0.5)`,
          }}>T</div>
          {sidebarOpen && (
            <div style={{ marginLeft:12, animation:"sideIn .22s ease", overflow:"hidden" }}>
              <div style={{ fontSize:16, fontWeight:900, color:"#fff", letterSpacing:"-0.025em", whiteSpace:"nowrap" }}>TelecomB2B</div>
              <div style={{ fontSize:9, color:C.green, fontWeight:800, letterSpacing:"0.16em", marginTop:1 }}>PANEL ADMIN</div>
            </div>
          )}
        </div>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(v => !v)} style={{
          position:"absolute", right:-12, top:84, width:24, height:24,
          background:C.green, border:"none", borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:`0 4px 16px rgba(40,251,75,0.55)`, cursor:"pointer", zIndex:50,
        }}>
          <svg style={{ width:11, height:11, color:"#000", transform: sidebarOpen ? "" : "rotate(180deg)", transition:"transform .3s" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* Nav con grupos */}
        <nav style={{ flex:1, padding:"12px 10px 8px", overflowY:"auto", overflowX:"hidden", position:"relative", zIndex:2 }}>
          {GRUPOS.map(g => renderGrupo(g.key, g.label))}
        </nav>

        {/* Footer status */}
        <div style={{ padding:"10px 10px 14px", borderTop:"1px solid rgba(255,255,255,0.1)", position:"relative", zIndex:2 }}>
          <div style={{
            display:"flex", alignItems:"center", gap:8, padding:"9px 10px",
            borderRadius:11, background:"rgba(40,251,75,0.12)", border:"1px solid rgba(40,251,75,0.28)",
            justifyContent: sidebarOpen ? "flex-start" : "center",
          }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, flexShrink:0, boxShadow:`0 0 10px ${C.green}, 0 0 20px ${C.green}80` }} />
            {sidebarOpen && <span style={{ fontSize:11, color:C.green, fontWeight:700 }}>Sistema operativo</span>}
          </div>
        </div>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <div style={{ flex:1, marginLeft: sidebarOpen ? 268 : 78, display:"flex", flexDirection:"column", transition:"margin-left .35s cubic-bezier(.4,0,.2,1)", position:"relative", zIndex:1 }}>

        {/* ─── HEADER ─── */}
        <header style={{
          height:68, position:"sticky", top:0, zIndex:30,
          background:`linear-gradient(90deg, #8B3EF5 0%, ${C.purple} 60%, #7C35E0 100%)`,
          borderBottom:"1px solid rgba(255,255,255,0.1)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 26px",
          boxShadow:"0 4px 30px rgba(152,81,249,0.45)",
        }}>
          <div>
            <h1 style={{ fontSize:17, fontWeight:900, color:"#fff", margin:0, letterSpacing:"-0.025em" }}>
              {currentPage?.name || "Dashboard"}
            </h1>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>Admin</span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>›</span>
              <span style={{ fontSize:10, color:C.green, fontWeight:800 }}>{currentPage?.name || "Dashboard"}</span>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* Search */}
            <div style={{ position:"relative" }}>
              <div style={{
                display:"flex", alignItems:"center", gap:9, height:38, padding:"0 14px",
                borderRadius:12, width: searchFocus ? 285 : 220,
                background: searchFocus ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.14)",
                border:`1.5px solid ${searchFocus ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"}`,
                backdropFilter:"blur(8px)",
                transition:"all .25s cubic-bezier(.4,0,.2,1)",
              }}>
                <svg style={{ width:14, height:14, color: searchFocus ? C.purple : "rgba(255,255,255,0.7)", flexShrink:0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                </svg>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  onFocus={() => setSearchFocus(true)}
                  onBlur={() => setTimeout(() => { setSearchFocus(false); setSearchQ(""); }, 200)}
                  placeholder="Buscar módulo..."
                  style={{ border:"none", outline:"none", fontSize:13, fontFamily:"inherit", width:"100%", background:"transparent", color: searchFocus ? "#1a1a2e" : "#fff" }}
                />
              </div>
              {searchFocus && (
                <div className="dd-panel" style={{ position:"absolute", top:"calc(100% + 10px)", left:0, right:0, background:"#fff", borderRadius:14, border:"1px solid rgba(152,81,249,0.18)", boxShadow:"0 20px 60px rgba(152,81,249,0.28)", overflow:"hidden", zIndex:100 }}>
                  <div style={{ padding:8 }}>
                    {(searchQ.length < 2 ? MENU_ITEMS.slice(0,6) : filtered).map(it => (
                      <Link key={it.href} href={it.href} className="srow" style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:10, textDecoration:"none" }}>
                        <div style={{ width:32, height:32, borderRadius:9, background:`${C.purple}12`, display:"flex", alignItems:"center", justifyContent:"center", color:C.purple, flexShrink:0 }}><it.icon /></div>
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

            <div style={{ width:1, height:26, background:"rgba(255,255,255,0.2)" }} />

            {/* Mail */}
            <div ref={mailRef} style={{ position:"relative" }}>
              <button onClick={() => { setMailOpen(v => !v); setNotifOpen(false); setProfileOpen(false); }}
                className="hdr-icon-btn"
                style={{ width:40, height:40, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", background: mailOpen ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)", border:`1.5px solid ${mailOpen ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)"}`, cursor:"pointer", position:"relative", color:"#fff" }}>
                <IconMail />
                <span style={{ position:"absolute", top:-5, right:-5, width:18, height:18, borderRadius:"50%", background:C.yellow, color:"#000", fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #fff" }}>2</span>
              </button>
              {mailOpen && (
                <div className="dd-panel" style={{ position:"absolute", right:0, top:"calc(100% + 12px)", width:360, background:"#fff", borderRadius:18, border:"1px solid rgba(152,81,249,0.18)", boxShadow:"0 24px 70px rgba(152,81,249,0.28)", zIndex:100, overflow:"hidden" }}>
                  <div style={{ background:`linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Mensajes</span>
                    <span style={{ fontSize:11, padding:"3px 11px", borderRadius:20, background:C.yellow, color:"#000", fontWeight:900 }}>2 sin leer</span>
                  </div>
                  <div style={{ padding:10 }}>
                    {[
                      { de:"Data Center MX", msg:"Necesitamos cotización urgente de equipos...", hora:"10:32", unread:true,  av:"D", c:C.purple },
                      { de:"Redes Pro S.A.",  msg:"¿Tienen disponible el iPhone 15 Pro Max?",   hora:"09:15", unread:true,  av:"R", c:C.orange },
                      { de:"FiberNet",        msg:"Confirmamos el pedido #7277. Gracias.",       hora:"Ayer",  unread:false, av:"F", c:C.green  },
                    ].map((m, i) => (
                      <div key={i} className="drow" style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 12px", borderRadius:11, cursor:"pointer", background:m.unread?`${m.c}08`:"transparent", marginBottom:2 }}>
                        <div style={{ width:38, height:38, borderRadius:11, background:m.c, color:m.c===C.green?"#000":"#fff", fontSize:14, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{m.av}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", justifyContent:"space-between" }}>
                            <span style={{ fontSize:13, fontWeight:m.unread?800:500, color:"#0a0a1e" }}>{m.de}</span>
                            <span style={{ fontSize:10, color:"#94a3b8" }}>{m.hora}</span>
                          </div>
                          <p style={{ fontSize:12, color:"#64748b", margin:"3px 0 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.msg}</p>
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
                className="hdr-icon-btn"
                style={{ width:40, height:40, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", background:notifOpen?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.12)", border:`1.5px solid ${notifOpen?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.2)"}`, cursor:"pointer", position:"relative", color:"#fff" }}>
                <IconBell />
                <span style={{ position:"absolute", top:-5, right:-5, width:18, height:18, borderRadius:"50%", background:C.orange, color:"#fff", fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #fff" }}>3</span>
              </button>
              {notifOpen && (
                <div className="dd-panel" style={{ position:"absolute", right:0, top:"calc(100% + 12px)", width:380, background:"#fff", borderRadius:18, border:"1px solid rgba(152,81,249,0.18)", boxShadow:"0 24px 70px rgba(152,81,249,0.28)", zIndex:100, overflow:"hidden" }}>
                  <div style={{ background:`linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Notificaciones</span>
                    <button style={{ fontSize:11, color:C.yellow, fontWeight:900, background:"none", border:"none", cursor:"pointer" }}>Marcar leído</button>
                  </div>
                  <div style={{ padding:10, maxHeight:320, overflowY:"auto" }}>
                    {[
                      { ico:"⚡", t:"Stock crítico",     d:"3 modelos próximos a agotarse",       time:"5 min",  c:C.yellow, unread:true  },
                      { ico:"💳", t:"Pagos pendientes",  d:"2 cuentas vencen hoy",                time:"23 min", c:C.orange, unread:true  },
                      { ico:"📋", t:"Cotización aprobada",d:"Data Center MX aprobó COT-2026-0023",time:"1h",     c:C.purple, unread:false },
                      { ico:"✅", t:"Nuevo cliente B2B", d:"FiberNet completó verificación",      time:"2h",     c:C.green,  unread:false },
                    ].map((n, i) => (
                      <div key={i} className="drow" style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 12px", borderRadius:11, cursor:"pointer", background:n.unread?`${n.c}08`:"transparent", marginBottom:2 }}>
                        <div style={{ width:38, height:38, borderRadius:11, background:n.c===C.yellow?C.yellow:`${n.c}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{n.ico}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", justifyContent:"space-between" }}>
                            <span style={{ fontSize:13, fontWeight:800, color:"#0a0a1e" }}>{n.t}</span>
                            <span style={{ fontSize:10, color:"#94a3b8" }}>hace {n.time}</span>
                          </div>
                          <p style={{ fontSize:12, color:"#64748b", margin:"3px 0 0" }}>{n.d}</p>
                        </div>
                        {n.unread && <div style={{ width:8, height:8, borderRadius:"50%", background:n.c, marginTop:6, flexShrink:0 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ width:1, height:26, background:"rgba(255,255,255,0.2)" }} />

            {/* Perfil */}
            <div ref={profileRef} style={{ position:"relative" }}>
              <button onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); setMailOpen(false); }}
                style={{ display:"flex", alignItems:"center", gap:9, padding:"4px 10px 4px 4px", borderRadius:12, cursor:"pointer", background:profileOpen?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.12)", border:`1.5px solid ${profileOpen?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.2)"}` }}>
                <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg, ${C.green}, ${C.yellow})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:"#000" }}>
                  {user?.email?.[0].toUpperCase() || "A"}
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:12, fontWeight:800, color:"#fff", lineHeight:1.2 }}>{user?.email?.split("@")[0] || "Admin"}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:1 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:C.green }} />
                    <span style={{ fontSize:9, color:"rgba(255,255,255,0.6)" }}>Administrador</span>
                  </div>
                </div>
                <svg style={{ width:12, height:12, color:"rgba(255,255,255,0.7)", transform:profileOpen?"rotate(180deg)":"", transition:"transform .2s" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {profileOpen && (
                <div className="dd-panel" style={{ position:"absolute", right:0, top:"calc(100% + 12px)", width:280, background:"#fff", borderRadius:18, border:"1px solid rgba(152,81,249,0.18)", boxShadow:"0 24px 70px rgba(152,81,249,0.32)", zIndex:100, overflow:"hidden" }}>
                  <div style={{ background:`linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`, padding:"22px 20px", textAlign:"center", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:"rgba(40,251,75,0.18)", filter:"blur(15px)" }} />
                    <div style={{ width:60, height:60, borderRadius:17, margin:"0 auto 11px", background:`linear-gradient(135deg, ${C.green}, ${C.yellow})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:900, color:"#000", position:"relative", zIndex:1 }}>
                      {user?.email?.[0].toUpperCase() || "A"}
                    </div>
                    <div style={{ fontSize:14, fontWeight:900, color:"#fff", position:"relative", zIndex:1 }}>{user?.email?.split("@")[0] || "Admin"}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2, position:"relative", zIndex:1 }}>{user?.email}</div>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:10, padding:"4px 12px", borderRadius:20, background:"rgba(40,251,75,0.18)", border:"1px solid rgba(40,251,75,0.38)", position:"relative", zIndex:1 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:C.green }} />
                      <span style={{ fontSize:10, color:C.green, fontWeight:800 }}>Activo</span>
                    </div>
                  </div>
                  <div style={{ padding:10 }}>
                    {[
                      { icon:<IconProfile />,  label:"Mi Perfil",     c:C.purple, bg:`${C.purple}12` },
                      { icon:<IconConfig />,   label:"Configuración", c:C.orange, bg:`${C.orange}12` },
                      { icon:<IconActivity />, label:"Mi Actividad",  c:C.green,  bg:`${C.green}12`  },
                    ].map((it, i) => (
                      <button key={i} className="prow" style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 11px", borderRadius:12, cursor:"pointer", background:"transparent", border:"none", textAlign:"left" }}>
                        <div style={{ width:38, height:38, borderRadius:11, background:it.bg, display:"flex", alignItems:"center", justifyContent:"center", color:it.c, flexShrink:0 }}>{it.icon}</div>
                        <span style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{it.label}</span>
                      </button>
                    ))}
                    <div style={{ height:1, background:"rgba(152,81,249,0.1)", margin:"4px" }} />
                    <button onClick={handleLogout} className="lrow" style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 11px", borderRadius:12, cursor:"pointer", background:"transparent", border:"none", textAlign:"left" }}>
                      <div style={{ width:38, height:38, borderRadius:11, background:`${C.orange}15`, display:"flex", alignItems:"center", justifyContent:"center", color:C.orange, flexShrink:0 }}>
                        <IconLogout />
                      </div>
                      <span style={{ fontSize:13, fontWeight:800, color:C.orange }}>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main style={{ flex:1, padding:"26px", overflowY:"auto" }} className="pg-in">
          {children}
        </main>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { background: #f0eaff; }
        input::placeholder { color: rgba(255,255,255,0.5) !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(152,81,249,0.3); border-radius: 5px; }
        @keyframes sideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes ddIn   { from { opacity:0; transform:translateY(-10px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pgIn   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .pg-in    { animation: pgIn .32s cubic-bezier(.4,0,.2,1); }
        .dd-panel { animation: ddIn .2s cubic-bezier(.4,0,.2,1); }
        .sb-link:hover    { background: rgba(255,255,255,0.12) !important; }
        .sb-link .sb-tip  { opacity:0; transition:opacity .15s; }
        .sb-link:hover .sb-tip { opacity:1 !important; }
        .hdr-icon-btn:hover { background: rgba(255,255,255,0.28) !important; }
        .srow:hover { background: rgba(152,81,249,0.06) !important; }
        .drow:hover { background: rgba(152,81,249,0.05) !important; }
        .prow:hover { background: rgba(152,81,249,0.06) !important; }
        .lrow:hover { background: rgba(255,102,0,0.08) !important; }
      `}</style>

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          const c=document.getElementById('galaxy-canvas');
          if(!c)return;
          const ctx=c.getContext('2d');
          let W=c.width=innerWidth,H=c.height=innerHeight;
          window.addEventListener('resize',()=>{W=c.width=innerWidth;H=c.height=innerHeight;});
          const stars=Array.from({length:180},()=>({
            x:Math.random()*W,y:Math.random()*H,
            r:Math.random()*1.4+0.2,o:Math.random()*0.35+0.05,sp:Math.random()*0.4+0.05,
            dx:(Math.random()-.5)*0.06,dy:(Math.random()-.5)*0.06,
            col:['152,81,249','40,251,75','246,250,0','255,102,0'][Math.floor(Math.random()*4)],
          }));
          const nebulae=Array.from({length:6},()=>({
            x:Math.random()*W,y:Math.random()*H,
            r:Math.random()*200+100,t:Math.random()*Math.PI*2,sp:0.002+Math.random()*0.003,
            col:['152,81,249','40,251,75','255,102,0','246,250,0'][Math.floor(Math.random()*4)],
          }));
          let f=0;
          function draw(){
            ctx.clearRect(0,0,W,H);f++;
            nebulae.forEach(n=>{
              n.t+=n.sp;
              const px=n.x+Math.sin(n.t)*50,py=n.y+Math.cos(n.t*.7)*35;
              const g=ctx.createRadialGradient(px,py,0,px,py,n.r);
              g.addColorStop(0,'rgba('+n.col+',0.04)');g.addColorStop(.5,'rgba('+n.col+',0.015)');g.addColorStop(1,'rgba('+n.col+',0)');
              ctx.beginPath();ctx.arc(px,py,n.r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
            });
            stars.forEach(s=>{
              s.x+=s.dx;s.y+=s.dy;
              if(s.x<0)s.x=W;if(s.x>W)s.x=0;if(s.y<0)s.y=H;if(s.y>H)s.y=0;
              const fl=s.o+Math.sin(f*s.sp+s.x*.01)*0.18;
              ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
              ctx.fillStyle='rgba('+s.col+','+Math.max(.04,Math.min(.65,fl))+')';ctx.fill();
            });
            requestAnimationFrame(draw);
          }
          draw();
        })();
      `}} />
    </div>
  );
}