"use client";
// src/app/admin/page.tsx

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  collection, getDocs, query, orderBy, limit,
  where, doc, getDoc, onSnapshot
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

/* ── PALETA MUNDO MÓVIL ─────────────────────────────────────────────────── */
const C = {
  purple:      "#7c3aed",
  purpleLight: "#9851F9",
  purpleBg:    "#f5f3ff",
  purpleBorder:"#ddd6fe",
  orange:      "#FF6600",
  orangeBg:    "#fff7ed",
  yellow:      "#F6FA00",
  yellowBg:    "#fefce8",
  green:       "#28FB4B",
  greenDark:   "#16a34a",
  greenBg:     "#f0fdf4",
  red:         "#dc2626",
  redBg:       "#fef2f2",
  white:       "#FFFFFF",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray700:     "#374151",
  gray900:     "#111827",
};

const fmtPEN = (n: number) =>
  `S/ ${(n||0).toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/* ── TIPOS ──────────────────────────────────────────────────────────────── */
interface Producto   { id:string; nombre_producto?:string; nombre?:string; precio_caja?:number; stock_cajas?:number; stock_minimo_cajas?:number; marca?:string; categoria_id?:string; }
interface Pedido     { id:string; numero?:string; empresa?:string; cliente?:string; total?:number; monto?:number; estado?:string; fecha?:any; }
interface Cliente    { id:string; empresa?:string; nombre?:string; acceso_catalogo?:boolean; estado?:string; }
interface Cotizacion { id:string; numero?:string; cliente?:string; total?:number; estado?:string; fecha?:any; }

const ESTADO_MAP: Record<string,{label:string;bg:string;color:string;dot:string}> = {
  completado:{ label:"Completado",bg:C.greenBg,   color:C.greenDark, dot:C.greenDark },
  procesando:{ label:"Procesando",bg:C.purpleBg,  color:C.purple,    dot:C.purple    },
  enviado:   { label:"Enviado",   bg:C.yellowBg,  color:"#a09600",   dot:C.yellow    },
  pendiente: { label:"Pendiente", bg:C.orangeBg,  color:C.orange,    dot:C.orange    },
  confirmado:{ label:"Confirmado",bg:C.purpleBg,  color:C.purple,    dot:C.purple    },
  entregado: { label:"Entregado", bg:C.greenBg,   color:C.greenDark, dot:C.greenDark },
  cancelado: { label:"Cancelado", bg:C.redBg,     color:C.red,       dot:C.red       },
};

/* ── TOOLTIP PERSONALIZADO ──────────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.gray200}`,
      borderRadius: 12, padding: "10px 14px",
      boxShadow: `0 8px 30px rgba(124,58,237,0.15)`,
    }}>
      <div style={{ fontSize: 10, color: C.gray400, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: 12, fontWeight: 800, color: p.color, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
          {p.name}: {p.name === "Ventas" ? fmtPEN(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

/* ── KPI CARD ───────────────────────────────────────────────────────────── */
function KPICard({ title, value, change, positive, emoji, accent, loading, sub }: {
  title:string; value:string; change:string; positive:boolean;
  emoji:string; accent:string; loading?:boolean; sub?:string;
}) {
  return (
    <div style={{
      background: C.white, borderRadius: 16,
      border: `1px solid ${C.gray200}`,
      padding: "20px", position: "relative", overflow: "hidden",
      boxShadow: "0 1px 8px rgba(124,58,237,0.04)",
      transition: "transform .2s, box-shadow .2s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${accent}18`; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 8px rgba(124,58,237,0.04)"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "16px 16px 0 0" }} />
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: accent, opacity: 0.06 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${accent}15`, border: `1px solid ${accent}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>{emoji}</div>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 20,
          background: positive ? C.greenBg : C.orangeBg,
          color: positive ? C.greenDark : C.orange,
          border: `1px solid ${positive ? C.green + "30" : C.orange + "30"}`,
        }}>{change}</span>
      </div>
      {loading
        ? <div style={{ height: 26, width: "55%", borderRadius: 6, background: C.gray100, animation: "pulse 1.4s ease infinite" }} />
        : <div style={{ fontSize: 26, fontWeight: 900, color: C.gray900, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
      }
      <div style={{ fontSize: 11, color: C.gray500, marginTop: 6, fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: C.gray400, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [pedidos,      setPedidos]      = useState<Pedido[]>([]);
  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [clientes,     setClientes]     = useState<Cliente[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [period,       setPeriod]       = useState<"week"|"month">("week");
  const [esSuperadmin, setEsSuperadmin] = useState(false);
  const [esSeller,     setEsSeller]     = useState(false);
  const [userName,     setUserName]     = useState("");
  const [tasks, setTasks] = useState([
    { id:1, text:"Revisar cotizaciones pendientes",  done:false, p:"alta"  },
    { id:2, text:"Confirmar pedidos del día",        done:false, p:"alta"  },
    { id:3, text:"Reponer stock de iPhones 15",      done:false, p:"alta"  },
    { id:4, text:"Actualizar precios Samsung S24",   done:false, p:"media" },
    { id:5, text:"Enviar estados de cuenta clientes",done:false, p:"media" },
    { id:6, text:"Revisar IMEI pendientes",          done:false, p:"baja"  },
  ]);

  /* ── Auth ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) return;
      try {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        if (snap.exists()) {
          const d = snap.data();
          setEsSeller(d.rol === "seller");
          setEsSuperadmin(d.superadmin === true);
          setUserName(d.nombre || u.email?.split("@")[0] || "Admin");
        }
      } catch {}
    });
    return () => unsub();
  }, []);

  /* ── Carga de datos en tiempo real ─────────────────────────────────────── */
  useEffect(() => {
    const qPed = query(collection(db, "pedidos"), orderBy("fecha", "desc"), limit(50));
    const unsubPed = onSnapshot(qPed, snap => {
      setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pedido)));
    }, () => {});

    const qProd = query(collection(db, "productos"), where("estado", "==", "Activo"));
    const unsubProd = onSnapshot(qProd, snap => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Producto)));
    }, () => {});

    Promise.all([
      getDocs(collection(db, "usuarios")),
      getDocs(query(collection(db, "cotizaciones"), orderBy("fecha", "desc"), limit(20))),
    ]).then(([cliSnap, cotSnap]) => {
      setClientes(cliSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente)));
      setCotizaciones(cotSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cotizacion)));
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => { unsubPed(); unsubProd(); };
  }, []);

  /* ── Cálculos KPI ─────────────────────────────────────────────────────── */
  const ahora     = Date.now();
  const inicioHoy = new Date(); inicioHoy.setHours(0,0,0,0);
  const pedHoy    = pedidos.filter(p => { try { return p.fecha?.toDate?.()?.getTime() >= inicioHoy.getTime(); } catch { return false; } });
  const ventaHoy  = pedHoy.reduce((a, p) => a + (p.total||p.monto||0), 0);
  const ventaMes  = pedidos.reduce((a, p) => a + (p.total||p.monto||0), 0);
  const pendCnt   = pedidos.filter(p => p.estado === "pendiente" || p.estado === "procesando").length;
  const critCnt   = productos.filter(p => (p.stock_cajas||0) <= (p.stock_minimo_cajas||2)).length;
  const cliActivos= clientes.filter(c => c.acceso_catalogo && c.estado === "verificado").length;
  const cotPend   = cotizaciones.filter(c => c.estado === "pendiente" || c.estado === "enviada").length;

  /* ── Datos para gráfica ─────────────────────────────────────────────────── */
  const buildChartData = () => {
    const days: Record<string,{Ventas:number;Pedidos:number}> = {};
    if (period === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
        days[d.toLocaleDateString("es-PE",{weekday:"short"})] = { Ventas:0, Pedidos:0 };
      }
      pedidos.forEach(p => {
        try {
          const d = p.fecha?.toDate?.() ?? new Date();
          const diff = Math.floor((ahora - d.getTime()) / 86400000);
          if (diff < 7) {
            const key = d.toLocaleDateString("es-PE",{weekday:"short"});
            if (days[key]) { days[key].Ventas += (p.total||p.monto||0); days[key].Pedidos++; }
          }
        } catch {}
      });
    } else {
      ["Sem 1","Sem 2","Sem 3","Sem 4"].forEach(s => { days[s] = { Ventas:0, Pedidos:0 }; });
      pedidos.forEach(p => {
        try {
          const d = p.fecha?.toDate?.() ?? new Date();
          const diff = Math.floor((ahora - d.getTime()) / 86400000);
          if (diff < 28) {
            const sem = `Sem ${4 - Math.floor(diff/7)}`;
            if (days[sem]) { days[sem].Ventas += (p.total||p.monto||0); days[sem].Pedidos++; }
          }
        } catch {}
      });
    }
    return Object.entries(days).map(([dia,v]) => ({ dia, ...v }));
  };

  /* ── Distribución por marca ─────────────────────────────────────────────── */
  const marcaCount: Record<string,number> = {};
  productos.forEach(p => { const m = p.marca||"Otro"; marcaCount[m] = (marcaCount[m]||0) + 1; });
  const topMarcas = Object.entries(marcaCount).sort((a,b) => b[1]-a[1]).slice(0,5);
  const pieColors = [C.purple, C.orange, C.greenDark, "#0ea5e9", "#ec4899"];
  const pieData = topMarcas.map(([name,value],i) => ({ name, value, color: pieColors[i] }));

  const stockCritico     = productos.filter(p => (p.stock_cajas||0) <= (p.stock_minimo_cajas||2)).slice(0,5);
  const pedidosRecientes = pedidos.slice(0,5);
  const doneCount        = tasks.filter(t => t.done).length;
  const progressPct      = Math.round((doneCount/tasks.length)*100);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  const card: React.CSSProperties = {
    background: C.white, borderRadius: 16,
    border: `1px solid ${C.gray200}`,
    boxShadow: "0 1px 8px rgba(124,58,237,0.04)",
  };

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", maxWidth:1600 }} className="dash-in">

      {/* ── Encabezado ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>
            {saludo} {userName ? `, ${userName.split(" ")[0]}` : ""}👋
          </h1>
          <p style={{ fontSize:12, color:C.gray400, margin:"5px 0 0", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:C.greenDark, display:"inline-block", boxShadow:`0 0 6px ${C.greenDark}` }}/>
            {new Date().toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            <span style={{ padding:"2px 8px", borderRadius:20, background:C.purpleBg, color:C.purple, fontSize:10, fontWeight:700 }}>
              {productos.length} celulares activos
            </span>
          </p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Link href="/admin/cotizaciones/nueva" style={{
            display:"flex", alignItems:"center", gap:7, padding:"9px 18px",
            borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,
            color:C.white, fontSize:12, fontWeight:800, textDecoration:"none",
            boxShadow:`0 4px 16px ${C.purple}40`,
          }}>📋 Nueva Cotización</Link>
          <Link href="/admin/pedidos/nuevo" style={{
            display:"flex", alignItems:"center", gap:7, padding:"9px 18px",
            borderRadius:11, background:C.white,
            border:`1px solid ${C.gray200}`, color:C.purple, fontSize:12, fontWeight:700, textDecoration:"none",
          }}>+ Pedido</Link>
        </div>
      </div>

      {/* ── KPIs 6 columnas ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:20 }}>
        {[
          { title:"Ventas Hoy",     value:fmtPEN(ventaHoy), change:"hoy",       positive:true,           emoji:"💰", accent:C.purple,    sub:`${pedHoy.length} pedidos` },
          { title:"Pedidos Act.",   value:String(pendCnt),  change:`${pendCnt} activos`, positive:pendCnt===0, emoji:"📦", accent:C.orange,    sub:"Sin confirmar" },
          { title:"Stock Crítico",  value:String(critCnt),  change:"alerta",    positive:critCnt===0,    emoji:"⚡", accent:C.yellow,    sub:"Reponer pronto" },
          { title:"Clientes B2B",   value:String(cliActivos),change:"activos",  positive:true,           emoji:"🏢", accent:C.greenDark, sub:"Verificados" },
          { title:"Cotizaciones",   value:String(cotPend),  change:"pendientes",positive:cotPend===0,    emoji:"📋", accent:C.purpleLight,sub:"Por responder" },
          { title:"Venta del Mes",  value:fmtPEN(ventaMes), change:"mes actual",positive:true,           emoji:"📈", accent:C.purple,    sub:"Total acumulado" },
        ].map((k,i) => <KPICard key={i} {...k} loading={loading}/>)}
      </div>

      {/* ── Gráfica + Distribución ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:14, marginBottom:14 }}>

        {/* Area chart */}
        <div style={{ ...card, padding:"24px 24px 16px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18 }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:C.gray900, margin:0 }}>Ventas y Pedidos</h3>
              <p style={{ fontSize:11, color:C.gray400, margin:"3px 0 0" }}>Datos en tiempo real · {period==="week"?"Últimos 7 días":"Este mes"}</p>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {(["week","month"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding:"5px 12px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer",
                  background: period===p ? `linear-gradient(135deg,${C.purple},${C.purpleLight})` : C.gray100,
                  color: period===p ? C.white : C.gray500,
                  border: period===p ? "none" : `1px solid ${C.gray200}`,
                  boxShadow: period===p ? `0 4px 12px ${C.purple}40` : "none",
                }}>{p==="week"?"Semana":"Mes"}</button>
              ))}
            </div>
          </div>
          <div style={{ height:240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={buildChartData()} margin={{ top:0, right:4, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.purple} stopOpacity={0.18}/>
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.greenDark} stopOpacity={0.18}/>
                    <stop offset="95%" stopColor={C.greenDark} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={`${C.purple}08`} strokeDasharray="0"/>
                <XAxis dataKey="dia" stroke="transparent" tick={{ fontSize:10, fill:C.gray400 }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="l" stroke="transparent" tick={{ fontSize:9, fill:C.gray400 }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="r" orientation="right" stroke="transparent" tick={{ fontSize:9, fill:C.gray400 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Area yAxisId="l" type="monotone" dataKey="Ventas"  stroke={C.purple}   strokeWidth={2.5} fill="url(#gv)" dot={false}/>
                <Area yAxisId="r" type="monotone" dataKey="Pedidos" stroke={C.greenDark} strokeWidth={2.5} fill="url(#gp)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"flex", gap:18, marginTop:10, paddingLeft:4 }}>
            {[{c:C.purple,l:"Ventas (S/)"},{c:C.greenDark,l:"Pedidos"}].map((it,x) => (
              <div key={x} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:22, height:3, borderRadius:3, background:it.c }}/>
                <span style={{ fontSize:10, color:C.gray400, fontWeight:600 }}>{it.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut marcas */}
        <div style={{ ...card, padding:"24px" }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:C.gray900, margin:"0 0 4px" }}>Por Marca</h3>
          <p style={{ fontSize:11, color:C.gray400, margin:"0 0 14px" }}>Distribución del catálogo</p>
          {pieData.length > 0 ? (
            <>
              <div style={{ height:165 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:10, fontSize:11 }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:10 }}>
                {pieData.map((d,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:d.color, flexShrink:0 }}/>
                    <span style={{ fontSize:11, color:C.gray500, flex:1 }}>{d.name}</span>
                    <span style={{ fontSize:11, fontWeight:800, color:C.gray900 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"40px 0", color:C.gray400, fontSize:12 }}>
              Cargando datos...
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: Pedidos + Stock + Tareas ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px 280px", gap:14, marginBottom:14 }}>

        {/* Pedidos recientes */}
        <div style={{ ...card, padding:"24px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18 }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:C.gray900, margin:0 }}>Últimos Pedidos</h3>
              <p style={{ fontSize:11, color:C.gray400, margin:"3px 0 0" }}>
                Actualizado en tiempo real
                <span style={{ marginLeft:6, width:5, height:5, borderRadius:"50%", background:C.greenDark, display:"inline-block", animation:"pulse-dot 2s ease infinite" }}/>
              </p>
            </div>
            <Link href="/admin/pedidos" style={{
              fontSize:11, fontWeight:700, color:C.purple, textDecoration:"none",
              padding:"5px 12px", borderRadius:8, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`,
            }}>Ver todos →</Link>
          </div>
          {loading ? (
            [...Array(4)].map((_,i) => (
              <div key={i} style={{ height:58, borderRadius:12, background:C.gray100, marginBottom:8, animation:"pulse 1.4s ease infinite" }}/>
            ))
          ) : pedidosRecientes.length === 0 ? (
            <div style={{ textAlign:"center", padding:"30px 0", color:C.gray400, fontSize:12 }}>Sin pedidos aún</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {pedidosRecientes.map(p => {
                const e = ESTADO_MAP[p.estado||"pendiente"] || ESTADO_MAP.pendiente;
                return (
                  <Link key={p.id} href={`/admin/pedidos/${p.id}`}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:12, border:`1px solid ${C.gray200}`, textDecoration:"none", transition:"all .15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.purpleBorder}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.gray200}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:e.dot, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:C.gray900 }}>{p.numero||`#${p.id.slice(0,8)}`}</div>
                        <div style={{ fontSize:10, color:C.gray400, marginTop:1 }}>{p.empresa||p.cliente||"—"}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:13, fontWeight:900, color:C.gray900 }}>{fmtPEN(p.total||p.monto||0)}</div>
                      <div style={{ fontSize:9, fontWeight:700, marginTop:3, padding:"2px 7px", borderRadius:20, background:e.bg, color:e.color, display:"inline-block" }}>
                        {e.label}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock crítico */}
        <div style={{ ...card, padding:"24px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18 }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:C.gray900, margin:0 }}>Stock Crítico</h3>
            <span style={{ fontSize:9, fontWeight:900, padding:"3px 8px", borderRadius:20, background:critCnt>0?C.orangeBg:C.greenBg, color:critCnt>0?C.orange:C.greenDark, border:`1px solid ${critCnt>0?C.orange+"30":C.green+"30"}` }}>
              {critCnt > 0 ? `${critCnt} alertas` : "Todo OK"}
            </span>
          </div>
          {loading ? (
            [...Array(4)].map((_,i) => <div key={i} style={{ height:50, borderRadius:10, background:C.gray100, marginBottom:7, animation:"pulse 1.4s ease infinite" }}/>)
          ) : stockCritico.length === 0 ? (
            <div style={{ textAlign:"center", padding:"30px 0" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
              <p style={{ fontSize:12, color:C.greenDark, fontWeight:600, margin:0 }}>¡Todo el stock OK!</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {stockCritico.map(p => {
                const s = p.stock_cajas||0, m = p.stock_minimo_cajas||2;
                const pct = Math.min(100, (s / Math.max(m,1)) * 100);
                const barColor = s === 0 ? C.red : pct < 30 ? C.orange : C.yellow;
                return (
                  <div key={p.id} style={{ padding:"10px 12px", borderRadius:10, background:C.gray50, border:`1px solid ${C.gray200}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <div>
                        <span style={{ fontSize:11, fontWeight:600, color:C.gray900 }}>
                          {(p.nombre_producto||p.nombre||"Producto").slice(0,22)}
                        </span>
                        {p.marca && <div style={{ fontSize:9, color:C.gray400, marginTop:1 }}>{p.marca}</div>}
                      </div>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:20, flexShrink:0, background:s===0?C.redBg:C.orangeBg, color:s===0?C.red:C.orange }}>
                        {s===0?"Agotado":`${s}/${m}`}
                      </span>
                    </div>
                    <div style={{ height:4, borderRadius:4, background:C.gray200, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:4, width:`${pct}%`, background:barColor, transition:"width .5s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Link href="/admin/productos" style={{
            display:"block", textAlign:"center", marginTop:14, padding:"9px",
            borderRadius:10, fontSize:11, fontWeight:700, textDecoration:"none",
            color:C.purple, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`,
          }}>Gestionar inventario →</Link>
        </div>

        {/* Tareas */}
        <div style={{ ...card, padding:"24px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:C.gray900, margin:0 }}>Tareas del Día</h3>
            <span style={{ fontSize:11, fontWeight:700, color:C.gray400 }}>{doneCount}/{tasks.length}</span>
          </div>
          {/* Barra progreso */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:10, color:C.gray400 }}>Progreso diario</span>
              <span style={{ fontSize:10, fontWeight:800, color:C.purple }}>{progressPct}%</span>
            </div>
            <div style={{ height:5, borderRadius:5, background:C.gray100, overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:5, width:`${progressPct}%`,
                background:`linear-gradient(90deg,${C.purple},${C.orange})`,
                transition:"width .5s cubic-bezier(.4,0,.2,1)",
              }}/>
            </div>
          </div>
          {/* Lista */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {tasks.map(t => {
              const prioColor = t.p==="alta" ? C.orange : t.p==="media" ? "#a09600" : C.greenDark;
              const prioBg    = t.p==="alta" ? C.orangeBg : t.p==="media" ? C.yellowBg : C.greenBg;
              return (
                <div key={t.id}
                  onClick={() => setTasks(prev => prev.map(x => x.id===t.id ? {...x,done:!x.done} : x))}
                  style={{
                    display:"flex", alignItems:"center", gap:9, padding:"8px 10px",
                    borderRadius:9, cursor:"pointer",
                    background: t.done ? C.greenBg : "transparent",
                    transition:"background .15s",
                  }}
                  onMouseEnter={e => { if (!t.done) (e.currentTarget as HTMLElement).style.background = C.gray50; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = t.done ? C.greenBg : "transparent"; }}>
                  <div style={{
                    width:18, height:18, borderRadius:5, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background: t.done ? C.greenDark : C.white,
                    border: `1.5px solid ${t.done ? C.greenDark : C.gray100}`,
                    transition:"all .2s",
                  }}>
                    {t.done && (
                      <svg style={{width:10,height:10}} fill="none" stroke={C.white} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize:11, flex:1, color:t.done?C.gray400:C.gray700, textDecoration:t.done?"line-through":"none" }}>
                    {t.text}
                  </span>
                  <span style={{ fontSize:8, fontWeight:800, padding:"2px 6px", borderRadius:20, background:prioBg, color:prioColor, flexShrink:0 }}>
                    {t.p}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Cotizaciones pendientes ── */}
      {cotPend > 0 && (
        <div style={{ ...card, padding:"24px", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18 }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:C.gray900, margin:0 }}>Cotizaciones Pendientes</h3>
              <p style={{ fontSize:11, color:C.gray400, margin:"3px 0 0" }}>Requieren tu respuesta</p>
            </div>
            <Link href="/admin/cotizaciones" style={{ fontSize:11, fontWeight:700, color:C.purple, textDecoration:"none", padding:"5px 12px", borderRadius:8, background:C.purpleBg, border:`1px solid ${C.purpleBorder}` }}>
              Ver todas →
            </Link>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
            {cotizaciones.filter(c => c.estado==="pendiente"||c.estado==="enviada").slice(0,4).map(c => (
              <Link key={c.id} href={`/admin/cotizaciones/${c.id}`}
                style={{ padding:"14px 16px", borderRadius:12, border:`1px solid ${C.gray200}`, textDecoration:"none", display:"block", transition:"all .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=C.purpleBorder; (e.currentTarget as HTMLElement).style.background=C.purpleBg; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor=C.gray200; (e.currentTarget as HTMLElement).style.background=C.white; }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.gray900 }}>{c.numero||`COT-${c.id.slice(0,6)}`}</span>
                  <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:20, background:C.yellowBg, color:"#a09600" }}>{c.estado}</span>
                </div>
                <div style={{ fontSize:11, color:C.gray400, marginTop:3 }}>{c.cliente||"—"}</div>
                <div style={{ fontSize:16, fontWeight:900, color:C.purple, marginTop:8 }}>{fmtPEN(c.total||0)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes dashIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:.3; } }
        .dash-in { animation: dashIn .3s cubic-bezier(.4,0,.2,1); }
      `}</style>
    </div>
  );
}