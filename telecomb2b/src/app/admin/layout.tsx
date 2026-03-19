"use client";
// src/app/admin/layout.tsx
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect, useRef, JSX } from "react";
import {
  doc, getDoc, collection, query, where,
  orderBy, limit, onSnapshot, addDoc, updateDoc, serverTimestamp
} from "firebase/firestore";

/* ══════════════════════════════════════════════════════════════════════════
   PALETA OFICIAL — Mundo Móvil
   Fondo blanco · protagonismo #7c3aed
══════════════════════════════════════════════════════════════════════════ */
const C = {
  purple:       "#7c3aed",
  purpleHover:  "#6d28d9",
  purpleLight:  "#9851F9",
  purplePale:   "#ede9fe",
  purpleBg:     "#f5f3ff",
  purpleBorder: "#c4b5fd",
  orange:       "#FF6600",
  orangePale:   "#fff0e6",
  yellow:       "#F6FA00",
  green:        "#28FB4B",
  greenDark:    "#16a34a",
  greenPale:    "#e6fff0",
  gray100:      "#F3F4F6",
  gray200:      "#E5E7EB",
  gray300:      "#D1D5DB",
  gray400:      "#9CA3AF",
  gray500:      "#6B7280",
  gray600:      "#4B5563",
  gray700:      "#374151",
  gray900:      "#111827",
  white:        "#FFFFFF",
};

/* ── ÍCONOS ─────────────────────────────────────────────────────────────── */
const IS   = { width: 18, height: 18 } as const;
const IS16 = { width: 16, height: 16 } as const;

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
const IcoSearch   = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>;
const IcoBell     = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>;
const IcoMail     = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
const IcoUser     = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoActivity = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><polyline strokeLinecap="round" strokeLinejoin="round" points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcoLogout   = () => <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>;
const IcoReply    = () => <svg style={IS16} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>;

const IcoChevron = ({ dir = "down" }: { dir?: "down" | "left" | "right" }) => (
  <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
    {dir === "down"  && <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>}
    {dir === "left"  && <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>}
    {dir === "right" && <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>}
  </svg>
);

const IcoMenu = () => (
  <svg style={IS} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
    <line strokeLinecap="round" x1="3" y1="6"  x2="21" y2="6"/>
    <line strokeLinecap="round" x1="3" y1="12" x2="21" y2="12"/>
    <line strokeLinecap="round" x1="3" y1="18" x2="21" y2="18"/>
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
  { name: "Dashboard",    href: "/admin",                label: "Visión general",          icon: IcoDash,     group: "principal" },
  { name: "Pedidos",      href: "/admin/pedidos",        label: "Gestión de pedidos",      icon: IcoPedidos,  group: "principal", badge: "live" },
  { name: "Cotizaciones", href: "/admin/cotizaciones",   label: "Ciclo B2B completo",      icon: IcoCot,      group: "comercial", badge: "NEW" },
  { name: "Venta Rápida", href: "/admin/venta-manual",   label: "Punto de venta",          icon: IcoCart,     group: "comercial" },
  { name: "Clientes",     href: "/admin/clientes",       label: "Base de clientes B2B",    icon: IcoClients,  group: "comercial", soloAdmin: true },
  { name: "Productos",    href: "/admin/productos",      label: "Inventario y catálogo",   icon: IcoProducts, group: "inventario" },
  { name: "IMEI/Series",  href: "/admin/imei",           label: "Trazabilidad equipos",    icon: IcoIMEI,     group: "inventario" },
  { name: "Por Cobrar",   href: "/admin/cuentas-cobrar", label: "Crédito y cobranza",      icon: IcoCuentas,  group: "finanzas" },
  { name: "Reportes",     href: "/admin/reportes",       label: "Análisis y estadísticas", icon: IcoReports,  group: "finanzas",  soloAdmin: true },
  { name: "Config.",      href: "/admin/configuracion",  label: "Ajustes del sistema",     icon: IcoSettings, group: "sistema",   soloAdmin: true },
  { name: "Equipo",       href: "/admin/equipo",         label: "Gestión de admins",       icon: IcoAdmins,   group: "sistema",   soloAdmin: true },
];

/* Colaboradores monitoreados para notificar conexión */
const COLABORADORES_WATCH = ["vendedor@tiendaswaly.com"];

interface Notif {
  id: string;
  tipo: "pedido" | "cliente" | "conexion" | "sistema";
  titulo: string;
  mensaje: string;
  fecha: any;
  leida: boolean;
  link?: string;
  extra?: string;
}

interface Correo {
  id: string;
  de: string;
  asunto: string;
  mensaje: string;
  fecha: any;
  leido: boolean;
  respondido?: boolean;
}

/* ── HELPERS ──────────────────────────────────────────────────────────── */
const tiempoRel = (f: any): string => {
  try {
    const d    = f?.toDate ? f.toDate() : new Date(f);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)    return "ahora";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  } catch { return ""; }
};

const fmtDateTime = (f: any): string => {
  try {
    const d = f?.toDate ? f.toDate() : new Date(f);
    return d.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════════════════ */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [user,        setUser]        = useState<any>(null);
  const [userRol,     setUserRol]     = useState<"admin" | "seller" | null>(null);
  const [superadmin,  setSuperadmin]  = useState(false);
  const [userName,    setUserName]    = useState("");
  const [userFoto,    setUserFoto]    = useState("");
  const [sideOpen,    setSideOpen]    = useState(true);
  const [mounted,     setMounted]     = useState(false);

  const [notifOpen,   setNotifOpen]   = useState(false);
  const [mailOpen,    setMailOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [notifs,      setNotifs]      = useState<Notif[]>([]);
  const [correos,     setCorreos]     = useState<Correo[]>([]);
  const [pedBadge,    setPedBadge]    = useState(0);

  const [searchQ,     setSearchQ]     = useState("");
  const [searchFocus, setSearchFocus] = useState(false);

  const [mailReply,   setMailReply]   = useState<Correo | null>(null);
  const [replyText,   setReplyText]   = useState("");
  const [sending,     setSending]     = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);

  const notifRef   = useRef<HTMLDivElement>(null);
  const mailRef    = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  /* ── Auth + listeners ──────────────────────────────────────────────── */
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

      /* 1. Pedidos pendientes/procesando */
      const qPed = query(
        collection(db, "pedidos"),
        where("estado", "in", ["pendiente", "procesando"]),
        orderBy("fecha", "desc"),
        limit(20)
      );
      const unsubPed = onSnapshot(qPed, snap => {
        setPedBadge(snap.docs.length);
        const arr: Notif[] = snap.docs.map(d => {
          const data   = d.data();
          const estado = data.estado || "pendiente";
          return {
            id: `ped-${d.id}`,
            tipo: "pedido" as const,
            titulo: estado === "pendiente" ? "Nuevo pedido pendiente" : "Pedido en proceso",
            mensaje: `#${d.id.slice(0, 8).toUpperCase()} — ${data.empresa || data.cliente || "Cliente"}`,
            fecha: data.fecha, leida: false,
            link: "/admin/pedidos",
            extra: estado === "pendiente" ? "📦" : "⏳",
          };
        });
        setNotifs(prev => [...arr, ...prev.filter(n => n.tipo !== "pedido")].slice(0, 30));
      }, () => {});

      /* 2. Clientes pendientes de verificación */
      const qCli = query(
        collection(db, "clientes"),
        where("verificado", "==", false),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const unsubCli = onSnapshot(qCli, snap => {
        const arr: Notif[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: `cli-${d.id}`,
            tipo: "cliente" as const,
            titulo: "Cliente pendiente de verificación",
            mensaje: `${data.empresa || data.nombre || "Nuevo cliente"} — ${data.email || ""}`,
            fecha: data.createdAt, leida: false,
            link: "/admin/clientes",
            extra: "👤",
          };
        });
        setNotifs(prev => [...prev.filter(n => n.tipo !== "cliente"), ...arr].slice(0, 30));
      }, () => {});

      /* 3. Conexiones de colaboradores */
      const qConex = query(
        collection(db, "sesiones_colaboradores"),
        orderBy("fecha", "desc"),
        limit(10)
      );
      const unsubConex = onSnapshot(qConex, snap => {
        const arr: Notif[] = snap.docs
          .filter(d => COLABORADORES_WATCH.includes(d.data().email || ""))
          .map(d => {
            const data = d.data();
            return {
              id: `conex-${d.id}`,
              tipo: "conexion" as const,
              titulo: "Colaborador conectado",
              mensaje: `${data.nombre || data.email} se conectó`,
              fecha: data.fecha, leida: false,
              extra: "🟢",
            };
          });
        setNotifs(prev => [...prev.filter(n => n.tipo !== "conexion"), ...arr].slice(0, 30));
      }, () => {});

      /* 4. Correos de clientes */
      const qMail = query(
        collection(db, "correos_clientes"),
        orderBy("fecha", "desc"),
        limit(20)
      );
      const unsubMail = onSnapshot(qMail, snap => {
        const arr: Correo[] = snap.docs.map(d => ({
          id: d.id,
          de: d.data().de || "cliente@ejemplo.com",
          asunto: d.data().asunto || "Sin asunto",
          mensaje: d.data().mensaje || "",
          fecha: d.data().fecha,
          leido: d.data().leido ?? false,
          respondido: d.data().respondido ?? false,
        }));
        setCorreos(arr);
      }, () => {
        // Fallback demo
        setCorreos([
          { id: "1", de: "juan@empresa.com",      asunto: "Consulta precios Mikrotik",   mensaje: "Buenos días, quisiera saber el precio al por mayor de los routers Mikrotik RB4011.", fecha: new Date(Date.now() - 1200000),  leido: false, respondido: false },
          { id: "2", de: "maria@fibernet.pe",     asunto: "Cotización switches Cisco",   mensaje: "Necesito cotización urgente para 10 switches Cisco Catalyst 2960.",                 fecha: new Date(Date.now() - 7200000),  leido: false, respondido: false },
          { id: "3", de: "compras@datacenter.mx", asunto: "Estado de pedido #7279",      mensaje: "¿Podrían indicarme el estado del pedido #7279? Necesito entrega antes del viernes.", fecha: new Date(Date.now() - 86400000), leido: true,  respondido: true  },
        ]);
      });

      return () => { unsubPed(); unsubCli(); unsubConex(); unsubMail(); };
    });

    const fn = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (mailRef.current    && !mailRef.current.contains(e.target as Node))    { setMailOpen(false); setMailReply(null); }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => { unsubAuth(); document.removeEventListener("mousedown", fn); };
  }, [router]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setProfileOpen(false);
    try { await signOut(auth); router.replace("/login"); }
    catch { router.replace("/login"); }
    finally { setLoggingOut(false); }
  };

  const marcarCorreoLeido = async (id: string) => {
    setCorreos(p => p.map(c => c.id === id ? { ...c, leido: true } : c));
    try { await updateDoc(doc(db, "correos_clientes", id), { leido: true }); } catch {}
  };

  const handleResponder = async () => {
    if (!mailReply || !replyText.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "respuestas_correos"), {
        correoId: mailReply.id, para: mailReply.de,
        asunto: `Re: ${mailReply.asunto}`, mensaje: replyText,
        fecha: serverTimestamp(), enviadoPor: user?.email,
      });
      await updateDoc(doc(db, "correos_clientes", mailReply.id), { respondido: true, leido: true });
      setCorreos(p => p.map(c => c.id === mailReply.id ? { ...c, respondido: true, leido: true } : c));
      setMailReply(null); setReplyText("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  /* ── Derivados ── */
  const esSeller       = userRol === "seller";
  const noLeidasNotif  = notifs.filter(n => !n.leida).length;
  const noLeidosMail   = correos.filter(c => !c.leido).length;
  const menuVis        = MENU.filter(i => !(i.soloAdmin && esSeller));
  const searchResults  = searchQ.length > 1
    ? menuVis.filter(i =>
        i.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        i.label.toLowerCase().includes(searchQ.toLowerCase()))
    : [];
  const getInitials = (n: string) =>
    n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  if (!mounted) return null;

  /* ── Estilos helper ── */
  const iconBtn = (active: boolean): React.CSSProperties => ({
    width: 38, height: 38, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: active ? C.purplePale : "transparent",
    border: `1.5px solid ${active ? C.purpleBorder : C.gray200}`,
    cursor: "pointer", color: active ? C.purple : C.gray500,
    position: "relative", transition: "all .15s",
  });

  const badgeDot = (n: number, color = C.orange): React.CSSProperties => ({
    position: "absolute", top: -5, right: -5,
    minWidth: 18, height: 18, borderRadius: 9,
    background: color, color: C.white,
    fontSize: 9, fontWeight: 900,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: `2px solid ${C.white}`, padding: "0 4px",
    boxShadow: `0 2px 8px ${color}60`,
  });

  const dropdown: React.CSSProperties = {
    position: "absolute", right: 0, top: "calc(100% + 10px)",
    background: C.white, borderRadius: 18,
    border: `1.5px solid ${C.gray200}`,
    boxShadow: `0 24px 64px rgba(124,58,237,0.14), 0 4px 16px rgba(0,0,0,0.05)`,
    overflow: "hidden", zIndex: 200,
    animation: "ddIn .18s cubic-bezier(.4,0,.2,1)",
  };

  const dropHeader: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 18px 12px",
    borderBottom: `1.5px solid ${C.gray100}`,
    background: `linear-gradient(135deg, ${C.purplePale} 0%, ${C.orangePale} 100%)`,
  };

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#F9FAFB" }}>

      {/* ════════════ SIDEBAR ════════════ */}
      <aside style={{
        position: "fixed", top: 0, left: 0, height: "100%", zIndex: 40,
        width: sideOpen ? 256 : 68,
        background: C.white,
        borderRight: `1.5px solid ${C.gray200}`,
        display: "flex", flexDirection: "column",
        transition: "width .28s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
        boxShadow: "3px 0 20px rgba(124,58,237,0.06)",
      }}>

        {/* Logo */}
        <div style={{
          height: 66, display: "flex", alignItems: "center",
          padding: sideOpen ? "0 18px" : "0",
          justifyContent: sideOpen ? "flex-start" : "center",
          borderBottom: `1.5px solid ${C.gray100}`,
          gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.purple} 0%, #FF6600 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: C.white,
            boxShadow: `0 4px 14px ${C.purple}40`,
          }}>M</div>
          {sideOpen && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.gray900, whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>
                MUNDO <span style={{ color: C.purple }}>MÓVIL</span>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: C.gray400, textTransform: "uppercase" }}>
                {esSeller ? "● Vendedor" : superadmin ? "★ Superadmin" : "● Admin Panel"}
              </div>
            </div>
          )}
        </div>

        {/* Toggle pill */}
        <button
          onClick={() => setSideOpen(v => !v)}
          title={sideOpen ? "Colapsar" : "Expandir"}
          style={{
            position: "absolute", right: -13, top: "50%", transform: "translateY(-50%)",
            width: 26, height: 48, borderRadius: 13,
            background: C.white, border: `1.5px solid ${C.purpleBorder}`,
            boxShadow: `0 4px 16px rgba(124,58,237,0.2)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 50, transition: "all .2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.purplePale; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.white; }}
        >
          <div style={{ transition: "transform .3s", transform: sideOpen ? "rotate(0)" : "rotate(180deg)", color: C.purple, display: "flex" }}>
            <IcoChevron dir="left" />
          </div>
        </button>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", overflowX: "hidden" }}>
          {GRUPOS.map(g => {
            const items = menuVis.filter(i => i.group === g.key);
            if (!items.length) return null;
            return (
              <div key={g.key} style={{ marginBottom: 6 }}>
                {sideOpen && (
                  <div style={{ fontSize: 9, fontWeight: 800, color: C.gray400, letterSpacing: "0.15em", textTransform: "uppercase", padding: "0 10px", marginBottom: 4, marginTop: 10 }}>
                    {g.label}
                  </div>
                )}
                {!sideOpen && <div style={{ height: 1, background: C.gray100, margin: "8px 6px 6px" }} />}
                {items.map(item => {
                  const active    = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                  const liveCount = item.badge === "live" ? pedBadge : null;
                  return (
                    <Link key={item.href} href={item.href}
                      title={!sideOpen ? item.name : undefined}
                      style={{
                        display: "flex", alignItems: "center",
                        gap: sideOpen ? 10 : 0,
                        padding: sideOpen ? "9px 10px" : "10px 0",
                        justifyContent: sideOpen ? "flex-start" : "center",
                        borderRadius: 11, textDecoration: "none",
                        background: active ? C.purplePale : "transparent",
                        border: `1.5px solid ${active ? C.purpleBorder : "transparent"}`,
                        marginBottom: 2, position: "relative",
                        transition: "all .15s",
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = C.gray100; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: active ? C.purple : C.gray100,
                        color: active ? C.white : C.gray500,
                        transition: "all .15s",
                        boxShadow: active ? `0 4px 12px ${C.purple}40` : "none",
                      }}>
                        <item.icon />
                      </div>
                      {sideOpen && (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? C.purple : C.gray700, whiteSpace: "nowrap" }}>
                              {item.name}
                            </div>
                          </div>
                          {liveCount !== null && liveCount > 0 && (
                            <span style={{ fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 20, background: C.orange, color: C.white, boxShadow: `0 2px 8px ${C.orange}50` }}>
                              {liveCount}
                            </span>
                          )}
                          {item.badge === "NEW" && (
                            <span style={{ fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 20, background: C.yellow, color: C.gray900 }}>NEW</span>
                          )}
                        </>
                      )}
                      {!sideOpen && (
                        <div className="sb-tip" style={{
                          position: "absolute", left: "calc(100% + 14px)", top: "50%",
                          transform: "translateY(-50%)", background: C.gray900, color: C.white,
                          fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8,
                          whiteSpace: "nowrap", pointerEvents: "none", zIndex: 200,
                          opacity: 0, transition: "opacity .1s",
                        }}>
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
      </aside>

      {/* ════════════ MAIN ════════════ */}
      <div style={{
        flex: 1, marginLeft: sideOpen ? 256 : 68,
        display: "flex", flexDirection: "column",
        transition: "margin-left .28s cubic-bezier(.4,0,.2,1)",
        minHeight: "100vh",
      }}>

        {/* ════════════ TOPBAR ════════════ */}
        <header style={{
          height: 66, position: "sticky", top: 0, zIndex: 30,
          background: C.white,
          borderBottom: `1.5px solid ${C.gray200}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 22px", gap: 16,
          boxShadow: "0 2px 12px rgba(124,58,237,0.06)",
        }}>

          {/* ── IZQUIERDA: hamburguesa + búsqueda ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>

            {/* Hamburguesa */}
            <button onClick={() => setSideOpen(v => !v)}
              style={{ ...iconBtn(false), flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.purplePale; (e.currentTarget as HTMLElement).style.color = C.purple; (e.currentTarget as HTMLElement).style.borderColor = C.purpleBorder; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.gray500; (e.currentTarget as HTMLElement).style.borderColor = C.gray200; }}
            >
              <IcoMenu />
            </button>

            {/* ────────── BARRA DE BÚSQUEDA GLOBAL ────────── */}
            <div style={{ position: "relative", flex: 1, maxWidth: 620 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                height: 40, padding: "0 16px", borderRadius: 12,
                background: searchFocus ? C.white : C.gray100,
                border: `1.5px solid ${searchFocus ? C.purple : "transparent"}`,
                boxShadow: searchFocus ? `0 0 0 4px ${C.purple}10` : "none",
                transition: "all .22s",
              }}>
                <div style={{ color: searchFocus ? C.purple : C.gray400, flexShrink: 0, transition: "color .2s" }}>
                  <IcoSearch />
                </div>
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onFocus={() => setSearchFocus(true)}
                  onBlur={() => setTimeout(() => { setSearchFocus(false); setSearchQ(""); }, 200)}
                  placeholder="Buscar módulos, productos, pedidos, clientes…"
                  style={{
                    border: "none", outline: "none", fontSize: 13,
                    background: "transparent", color: C.gray900, width: "100%",
                    fontFamily: "inherit", fontWeight: 500,
                  }}
                />
                {searchFocus && (
                  <kbd style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: C.gray200, color: C.gray500, fontFamily: "inherit", fontWeight: 700, flexShrink: 0 }}>
                    ESC
                  </kbd>
                )}
              </div>

              {/* Resultados */}
              {searchFocus && (
                <div style={{
                  ...dropdown, right: "unset", left: 0, width: "100%",
                  top: "calc(100% + 8px)", maxHeight: 400, overflowY: "auto",
                }}>
                  {searchQ.length < 2 ? (
                    <>
                      <div style={{ padding: "12px 16px 6px", fontSize: 9, fontWeight: 800, color: C.gray400, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        Módulos del panel
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "0 8px 10px", gap: 3 }}>
                        {menuVis.slice(0, 10).map(it => (
                          <Link key={it.href} href={it.href}
                            style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 10, textDecoration: "none", transition: "background .1s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.purplePale}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.purplePale, display: "flex", alignItems: "center", justifyContent: "center", color: C.purple, flexShrink: 0 }}>
                              <it.icon />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: C.gray900, whiteSpace: "nowrap" }}>{it.name}</div>
                              <div style={{ fontSize: 10, color: C.gray400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div style={{ padding: "12px 16px 6px", fontSize: 9, fontWeight: 800, color: C.gray400, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        Resultados · {searchResults.length}
                      </div>
                      {searchResults.map(it => (
                        <Link key={it.href} href={it.href}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", textDecoration: "none", transition: "background .1s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.purplePale}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.purplePale, display: "flex", alignItems: "center", justifyContent: "center", color: C.purple }}>
                            <it.icon />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.gray900 }}>{it.name}</div>
                            <div style={{ fontSize: 11, color: C.gray400 }}>{it.label}</div>
                          </div>
                          <div style={{ color: C.gray300, fontSize: 16 }}>→</div>
                        </Link>
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: "32px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                      <p style={{ fontSize: 12, color: C.gray400, margin: 0 }}>Sin resultados para "{searchQ}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── DERECHA: iconos ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

            {/* ══ CORREO ══ */}
            <div ref={mailRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setMailOpen(v => !v); setNotifOpen(false); setProfileOpen(false); }}
                style={iconBtn(mailOpen)}
                onMouseEnter={e => { if (!mailOpen) { (e.currentTarget as HTMLElement).style.background = C.purplePale; (e.currentTarget as HTMLElement).style.color = C.purple; } }}
                onMouseLeave={e => { if (!mailOpen) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.gray500; } }}
              >
                <IcoMail />
                {noLeidosMail > 0 && <span style={badgeDot(noLeidosMail, C.purple)}>{noLeidosMail > 9 ? "9+" : noLeidosMail}</span>}
              </button>

              {mailOpen && (
                <div style={{ ...dropdown, width: 430 }}>
                  <div style={dropHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, boxShadow: `0 4px 12px ${C.purple}40` }}>
                        <IcoMail />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.gray900 }}>Correos de clientes</div>
                        <div style={{ fontSize: 10, color: C.gray500 }}>{noLeidosMail} sin leer · {correos.length} total</div>
                      </div>
                    </div>
                    {noLeidosMail > 0 && (
                      <button onClick={() => setCorreos(p => p.map(c => ({ ...c, leido: true })))}
                        style={{ fontSize: 11, fontWeight: 700, color: C.purple, background: `${C.purple}14`, border: `1px solid ${C.purpleBorder}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                        Marcar leídos
                      </button>
                    )}
                  </div>

                  {!mailReply ? (
                    <div style={{ maxHeight: 370, overflowY: "auto" }}>
                      {correos.length === 0 ? (
                        <div style={{ padding: "36px", textAlign: "center" }}>
                          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                          <p style={{ fontSize: 12, color: C.gray400, margin: 0 }}>Sin correos nuevos</p>
                        </div>
                      ) : correos.map(c => (
                        <div key={c.id}
                          onClick={() => marcarCorreoLeido(c.id)}
                          style={{ padding: "13px 18px", borderBottom: `1px solid ${C.gray100}`, background: c.leido ? "transparent" : `${C.purple}04`, cursor: "pointer", transition: "background .15s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.gray100}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = c.leido ? "transparent" : `${C.purple}04`}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                              background: c.leido ? C.gray100 : C.purplePale,
                              border: `1.5px solid ${c.leido ? C.gray200 : C.purpleBorder}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 15, fontWeight: 800, color: c.leido ? C.gray400 : C.purple,
                            }}>
                              {c.de[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: c.leido ? 500 : 800, color: c.leido ? C.gray600 : C.gray900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>
                                  {c.de}
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                  {c.respondido && (
                                    <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 6px", borderRadius: 10, background: C.greenPale, color: C.greenDark, border: `1px solid ${C.green}30` }}>✓ Respondido</span>
                                  )}
                                  <span style={{ fontSize: 10, color: C.gray400 }}>{tiempoRel(c.fecha)}</span>
                                </div>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: c.leido ? 400 : 700, color: c.leido ? C.gray500 : C.gray100, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {c.asunto}
                              </div>
                              <div style={{ fontSize: 11, color: C.gray400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {c.mensaje}
                              </div>
                            </div>
                            {!c.leido && <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.purple, flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${C.purple}` }} />}
                          </div>
                          {/* Botón responder */}
                          <div style={{ marginTop: 10, marginLeft: 49 }}>
                            <button
                              onClick={e => { e.stopPropagation(); setMailReply(c); setReplyText(""); }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: C.purple, background: C.purplePale, border: `1px solid ${C.purpleBorder}`, borderRadius: 7, padding: "4px 12px", cursor: "pointer" }}>
                              <IcoReply /> Responder
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "18px" }}>
                      <button onClick={() => setMailReply(null)}
                        style={{ fontSize: 11, color: C.purple, background: "none", border: "none", cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                        ← Volver a bandeja
                      </button>
                      <div style={{ padding: "10px 14px", borderRadius: 10, background: C.purplePale, border: `1px solid ${C.purpleBorder}`, marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: C.purple }}>Para: {mailReply.de}</div>
                        <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>Re: {mailReply.asunto}</div>
                      </div>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Escribe tu respuesta…"
                        rows={5}
                        style={{
                          width: "100%", resize: "vertical", borderRadius: 10,
                          border: `1.5px solid ${C.purpleBorder}`,
                          padding: "10px 12px", fontSize: 12, fontFamily: "inherit",
                          outline: "none", boxSizing: "border-box",
                          background: C.white, color: C.gray900,
                          transition: "border-color .15s",
                        }}
                        onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = C.purple}
                        onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = C.purpleBorder}
                      />
                      <button
                        onClick={handleResponder}
                        disabled={sending || !replyText.trim()}
                        style={{
                          marginTop: 10, width: "100%", padding: "12px",
                          borderRadius: 10, border: "none",
                          cursor: sending || !replyText.trim() ? "not-allowed" : "pointer",
                          background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
                          color: C.white, fontSize: 13, fontWeight: 800,
                          boxShadow: `0 4px 16px ${C.purple}40`,
                          opacity: !replyText.trim() ? 0.55 : 1,
                          transition: "all .15s",
                        }}>
                        {sending ? "Enviando…" : "Enviar respuesta ✉️"}
                      </button>
                    </div>
                  )}
                  <div style={{ padding: "10px 18px", borderTop: `1px solid ${C.gray100}` }}>
                    <Link href="/admin/correos" onClick={() => setMailOpen(false)}
                      style={{ fontSize: 12, fontWeight: 700, color: C.purple, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      Ver bandeja completa →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div style={{ width: 1, height: 26, background: C.gray200 }} />

            {/* ══ NOTIFICACIONES ══ */}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setNotifOpen(v => !v); setMailOpen(false); setProfileOpen(false); }}
                style={iconBtn(notifOpen)}
                onMouseEnter={e => { if (!notifOpen) { (e.currentTarget as HTMLElement).style.background = C.purplePale; (e.currentTarget as HTMLElement).style.color = C.purple; } }}
                onMouseLeave={e => { if (!notifOpen) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.gray500; } }}
              >
                <IcoBell />
                {noLeidasNotif > 0 && <span style={badgeDot(noLeidasNotif, C.orange)}>{noLeidasNotif > 9 ? "9+" : noLeidasNotif}</span>}
              </button>

              {notifOpen && (
                <div style={{ ...dropdown, width: 400 }}>
                  <div style={dropHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, boxShadow: `0 4px 12px ${C.orange}40` }}>
                        <IcoBell />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.gray900 }}>Notificaciones</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.greenDark, display: "inline-block", animation: "pulse-dot 2s ease-in-out infinite", boxShadow: `0 0 6px ${C.greenDark}` }} />
                          <span style={{ fontSize: 10, color: C.gray500 }}>Tiempo real</span>
                        </div>
                      </div>
                    </div>
                    {noLeidasNotif > 0 && (
                      <button onClick={() => setNotifs(p => p.map(n => ({ ...n, leida: true })))}
                        style={{ fontSize: 11, fontWeight: 700, color: C.purple, background: `${C.purple}14`, border: `1px solid ${C.purpleBorder}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  {/* Chips de categorías */}
                  <div style={{ display: "flex", gap: 6, padding: "10px 14px", borderBottom: `1px solid ${C.gray100}`, flexWrap: "wrap" }}>
                    {([
                      { tipo: "pedido",   label: "📦 Pedidos",    color: C.purple },
                      { tipo: "cliente",  label: "👤 Clientes",   color: C.orange },
                      { tipo: "conexion", label: "🟢 Conexiones", color: C.greenDark },
                    ] as const).map(t => {
                      const cnt = notifs.filter(n => n.tipo === t.tipo).length;
                      return cnt > 0 ? (
                        <span key={t.tipo} style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${t.color}10`, color: t.color, border: `1px solid ${t.color}25` }}>
                          {t.label} · {cnt}
                        </span>
                      ) : null;
                    })}
                    {notifs.length === 0 && (
                      <span style={{ fontSize: 10, color: C.gray400 }}>Sin actividad pendiente</span>
                    )}
                  </div>

                  <div style={{ maxHeight: 350, overflowY: "auto" }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: "36px", textAlign: "center" }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                        <p style={{ fontSize: 12, color: C.gray400, margin: 0 }}>Sin notificaciones pendientes</p>
                      </div>
                    ) : notifs.map(n => {
                      const accent =
                        n.tipo === "pedido"   ? C.purple :
                        n.tipo === "cliente"  ? C.orange :
                        n.tipo === "conexion" ? C.greenDark : C.gray500;
                      return (
                        <div key={n.id}
                          onClick={() => { setNotifs(p => p.map(x => x.id === n.id ? { ...x, leida: true } : x)); if (n.link) { setNotifOpen(false); router.push(n.link); } }}
                          style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 18px", cursor: "pointer", borderBottom: `1px solid ${C.gray100}`, background: n.leida ? "transparent" : `${accent}05`, transition: "background .15s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.gray100}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.leida ? "transparent" : `${accent}05`}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                            {n.extra || "🔔"}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <span style={{ fontSize: 12, fontWeight: n.leida ? 500 : 800, color: n.leida ? C.gray600 : C.gray900, lineHeight: 1.3 }}>{n.titulo}</span>
                              <span style={{ fontSize: 10, color: C.gray400, flexShrink: 0, marginLeft: 8 }}>{tiempoRel(n.fecha)}</span>
                            </div>
                            <p style={{ fontSize: 11, color: C.gray500, margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {n.mensaje}
                            </p>
                            {n.tipo === "conexion" && (
                              <div style={{ marginTop: 4, fontSize: 10, color: C.gray400, display: "flex", alignItems: "center", gap: 4 }}>
                                📅 {fmtDateTime(n.fecha)}
                              </div>
                            )}
                          </div>
                          {!n.leida && <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, flexShrink: 0, marginTop: 5, boxShadow: `0 0 6px ${accent}` }} />}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: "10px 18px", borderTop: `1px solid ${C.gray100}` }}>
                    <Link href="/admin/pedidos" onClick={() => setNotifOpen(false)}
                      style={{ fontSize: 12, fontWeight: 700, color: C.purple, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      Ver todos los pedidos →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div style={{ width: 1, height: 26, background: C.gray200 }} />

            {/* ══ PERFIL ══ */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); setMailOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "5px 12px 5px 5px", borderRadius: 12, cursor: "pointer",
                  background: profileOpen ? C.purplePale : C.gray100,
                  border: `1.5px solid ${profileOpen ? C.purpleBorder : C.gray200}`,
                  transition: "all .15s",
                }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: userFoto ? "transparent" : `linear-gradient(135deg, ${C.purple}, #FF6600)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 900, color: C.white,
                  overflow: "hidden", boxShadow: `0 2px 10px ${C.purple}35`,
                }}>
                  {userFoto
                    ? <img src={userFoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : getInitials(userName)
                  }
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.gray900, maxWidth: 96, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
                  <div style={{ fontSize: 9, color: esSeller ? C.orange : C.purple, fontWeight: 700 }}>
                    {esSeller ? "Vendedor" : superadmin ? "Superadmin" : "Admin"}
                  </div>
                </div>
                <div style={{ transition: "transform .2s", transform: profileOpen ? "rotate(180deg)" : "rotate(0)", color: C.gray400, display: "flex" }}>
                  <IcoChevron dir="down" />
                </div>
              </button>

              {profileOpen && (
                <div style={{ ...dropdown, width: 275 }}>
                  <div style={{
                    padding: "18px", textAlign: "center",
                    background: `linear-gradient(135deg, ${C.purplePale} 0%, ${C.orangePale} 100%)`,
                    borderBottom: `1.5px solid ${C.gray200}`,
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16, margin: "0 auto 12px",
                      background: userFoto ? "transparent" : `linear-gradient(135deg, ${C.purple}, #FF6600)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, fontWeight: 900, color: C.white,
                      overflow: "hidden", border: `3px solid ${C.white}`,
                      boxShadow: `0 6px 20px ${C.purple}35`,
                    }}>
                      {userFoto
                        ? <img src={userFoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : getInitials(userName)
                      }
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.gray900 }}>{userName}</div>
                    <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>{user?.email}</div>
                    <span style={{
                      display: "inline-block", marginTop: 8,
                      fontSize: 9, fontWeight: 800, padding: "3px 12px", borderRadius: 20,
                      background: esSeller ? C.orangePale : C.purplePale,
                      color: esSeller ? C.orange : C.purple,
                      border: `1px solid ${esSeller ? C.orange + "30" : C.purpleBorder}`,
                    }}>
                      {esSeller ? "Vendedor" : superadmin ? "★ Superadmin" : "Administrador"}
                    </span>
                  </div>
                  <div style={{ padding: "8px" }}>
                    {[
                      { icon: IcoUser,     label: "Mi Perfil",      desc: "Ver y editar perfil",     href: "/admin/perfil",    color: C.purple    },
                      { icon: IcoActivity, label: "Mi Actividad",   desc: "Historial de acciones",   href: "/admin/actividad", color: C.greenDark },
                      ...(!esSeller ? [{ icon: IcoSettings, label: "Configuración", desc: "Ajustes de cuenta", href: "/admin/mi-config", color: C.orange }] : []),
                    ].map((it, i) => (
                      <Link key={i} href={it.href} onClick={() => setProfileOpen(false)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, textDecoration: "none", transition: "background .1s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.gray100}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${it.color}14`, display: "flex", alignItems: "center", justifyContent: "center", color: it.color }}>
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
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, cursor: loggingOut ? "not-allowed" : "pointer", background: "transparent", border: "none", textAlign: "left", opacity: loggingOut ? 0.6 : 1, transition: "background .1s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fef2f2"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                        {loggingOut
                          ? <div style={{ width: 14, height: 14, border: "2px solid #dc262640", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
                          : <IcoLogout />
                        }
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#dc2626" }}>{loggingOut ? "Cerrando sesión…" : "Cerrar Sesión"}</div>
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

      {/* ── ESTILOS GLOBALES ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        body { background: #F9FAFB; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #7c3aed; }
        input::placeholder  { color: #9CA3AF; }
        textarea::placeholder { color: #9CA3AF; }
        a { color: inherit; }
        @keyframes ddIn      { from { opacity:0; transform:translateY(-8px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pgIn      { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.8); } }
        .pg-in { animation: pgIn .3s cubic-bezier(.4,0,.2,1); }
        a:hover .sb-tip { opacity: 1 !important; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}