"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface Producto {
  id: string; nombre?: string; nombre_producto?: string;
  precio?: number; stock?: number; stockMinimo?: number;
}
interface Pedido {
  id: string; numero: string; cliente: string;
  monto: number; estado: string; fecha?: string;
}

const C = {
  purple:     "#9851F9",
  purpleDark: "#7C35E0",
  green:      "#28FB4B",
  yellow:     "#F6FA00",
  orange:     "#FF6600",
  black:      "#000000",
};

const ESTADO: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  completado: { label: "Completado", bg: `${C.green}18`,  color: "#1a9e30", dot: C.green  },
  procesando: { label: "Procesando", bg: `${C.purple}14`, color: C.purple,  dot: C.purple },
  enviado:    { label: "Enviado",    bg: `${C.yellow}20`, color: "#a09600", dot: C.yellow },
  pendiente:  { label: "Pendiente",  bg: `${C.orange}14`, color: C.orange,  dot: C.orange },
};

const fmtMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(n);

/* ── Tooltip del gráfico ── */
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(152,81,249,0.2)", borderRadius: 14,
      padding: "10px 16px", boxShadow: "0 12px 40px rgba(152,81,249,0.2)",
    }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 800, color: p.color, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          {p.name}: {p.name === "Ventas" ? fmtMXN(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

/* ── Tarjeta KPI ── */
function KPICard({ title, value, change, positive, icon, accent }: {
  title: string; value: string; change: string; positive: boolean; icon: string; accent: string;
}) {
  return (
    <div className="kpi-card" style={{
      background: "rgba(255,255,255,0.88)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderRadius: 18, padding: "22px 20px",
      border: `1px solid ${accent}30`,
      position: "relative", overflow: "hidden",
      boxShadow: `0 4px 24px ${accent}18`,
      transition: "transform .2s cubic-bezier(.4,0,.2,1), box-shadow .2s",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accent, borderRadius: "18px 18px 0 0", boxShadow: `0 0 12px ${accent}80` }} />
      <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: accent, opacity: 0.08, filter: "blur(22px)" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${accent}18`, border: `1.5px solid ${accent}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23 }}>
          {icon}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 20,
          background: positive ? `${C.green}18` : `${C.orange}18`,
          color: positive ? "#1a9e30" : C.orange,
          border: `1px solid ${positive ? C.green + "30" : C.orange + "30"}`,
        }}>
          {change}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#0a0a1e", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 7, fontWeight: 600 }}>{title}</div>
    </div>
  );
}

/* ── Sección header ── */
function SH({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0a0a1e", margin: 0, letterSpacing: "-0.025em" }}>{title}</h3>
        {sub && <p style={{ fontSize: 11, color: "#94a3b8", margin: "3px 0 0", fontWeight: 500 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="va-btn" style={{
      fontSize: 12, fontWeight: 700, color: C.purple, textDecoration: "none",
      display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 9,
      background: `${C.purple}10`, border: `1px solid ${C.purple}28`, transition: "all .15s",
    }}>
      Ver todos <span style={{ fontSize: 14 }}>→</span>
    </Link>
  );
}

/* ── Página principal ── */
export default function AdminPage() {
  const [productosCriticos, setProductosCriticos] = useState<Producto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isClient,  setIsClient]  = useState(false);
  const [period,    setPeriod]    = useState<"week" | "month">("week");
  const [tasks, setTasks] = useState([
    { id: 1, text: "Confirmar pedido #7280",        done: false, p: "alta"  },
    { id: 2, text: "Reponer Router Mikrotik RB4011", done: false, p: "alta"  },
    { id: 3, text: "Contactar Data Center MX",       done: false, p: "media" },
    { id: 4, text: "Revisar facturación masiva",      done: false, p: "baja"  },
    { id: 5, text: "Actualizar precios switches",     done: false, p: "media" },
  ]);

  const kpis = [
    { title: "Ventas de Hoy",      value: fmtMXN(24560),  change: "+15.3%",  positive: true,  icon: "💰", accent: C.purple },
    { title: "Pedidos Pendientes", value: "8",             change: "+3",      positive: false, icon: "📦", accent: C.orange },
    { title: "Alertas de Stock",   value: "3",             change: "crítico", positive: false, icon: "⚡", accent: C.yellow },
    { title: "Clientes Activos",   value: "5",             change: "+24%",    positive: true,  icon: "👥", accent: C.green  },
    { title: "Ventas del Mes",     value: fmtMXN(542890), change: "+23.5%",  positive: true,  icon: "📈", accent: C.purple },
  ];

  const pedidos: Pedido[] = [
    { id: "1", numero: "#7281", cliente: "Telecom Express",   monto: 1240, estado: "completado", fecha: "10:30" },
    { id: "2", numero: "#7280", cliente: "Redes Pro",         monto: 890,  estado: "procesando", fecha: "11:45" },
    { id: "3", numero: "#7279", cliente: "Data Center MX",    monto: 3560, estado: "enviado",    fecha: "09:15" },
    { id: "4", numero: "#7278", cliente: "Connect Solutions", monto: 540,  estado: "pendiente",  fecha: "12:20" },
    { id: "5", numero: "#7277", cliente: "FiberNet",          monto: 2780, estado: "completado", fecha: "08:50" },
  ];

  const chartData = {
    week: [
      { dia: "Lun", Ventas: 18240, Pedidos: 12 }, { dia: "Mar", Ventas: 22150, Pedidos: 15 },
      { dia: "Mié", Ventas: 24560, Pedidos: 18 }, { dia: "Jue", Ventas: 19870, Pedidos: 14 },
      { dia: "Vie", Ventas: 27430, Pedidos: 21 }, { dia: "Sáb", Ventas: 15320, Pedidos: 9  },
      { dia: "Dom", Ventas: 12540, Pedidos: 7  },
    ],
    month: [
      { dia: "Sem 1", Ventas: 142890, Pedidos: 98  }, { dia: "Sem 2", Ventas: 158230, Pedidos: 112 },
      { dia: "Sem 3", Ventas: 135670, Pedidos: 95  }, { dia: "Sem 4", Ventas: 162100, Pedidos: 118 },
    ],
  };

  const pieData = [
    { name: "Routers",    value: 35, color: C.purple },
    { name: "Switches",   value: 25, color: C.orange },
    { name: "Fibra",      value: 20, color: C.green  },
    { name: "Antenas",    value: 15, color: C.yellow },
    { name: "Accesorios", value: 5,  color: "#333"   },
  ];

  const clientes = [
    { n: "Data Center MX",    m: 3560, t: "09:30", c: C.purple },
    { n: "FiberNet",          m: 2780, t: "14:50", c: C.green  },
    { n: "Telecom Express",   m: 1240, t: "10:15", c: C.orange },
    { n: "Redes Pro",         m: 890,  t: "11:45", c: C.yellow },
    { n: "Connect Solutions", m: 540,  t: "13:20", c: "#333"   },
  ];

  useEffect(() => {
    setIsClient(true);
    (async () => {
      try {
        const snap = await getDocs(collection(db, "productos"));
        const data: Producto[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Producto));
        setProductosCriticos(data.filter(p => (p.stock ?? 0) <= (p.stockMinimo ?? 5)).slice(0, 5));
      } catch {
        setProductosCriticos([
          { id: "1", nombre: "Router Mikrotik RB4011", stock: 2,  stockMinimo: 5,  precio: 299 },
          { id: "2", nombre: "Splitter PLC 1x16",      stock: 0,  stockMinimo: 3,  precio: 89  },
          { id: "3", nombre: "Antena Ubiquiti Rocket", stock: 5,  stockMinimo: 6,  precio: 199 },
          { id: "4", nombre: "Switch Cisco Catalyst",  stock: 15, stockMinimo: 5,  precio: 899 },
          { id: "5", nombre: "Fibra Óptica 100m",      stock: 3,  stockMinimo: 10, precio: 149 },
        ]);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    })();
  }, []);

  if (!isClient || loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 14, color: "#94a3b8", fontSize: 14 }}>
      <div className="spin" style={{ width: 30, height: 30, border: `2.5px solid ${C.purple}28`, borderTopColor: C.purple, borderRadius: "50%" }} />
      Cargando dashboard...
    </div>
  );

  const doneCount   = tasks.filter(t => t.done).length;
  const progressPct = Math.round((doneCount / tasks.length) * 100);

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.88)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    borderRadius: 18, border: "1px solid rgba(152,81,249,0.14)",
    boxShadow: "0 4px 24px rgba(152,81,249,0.08)",
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", maxWidth: 1600 }} className="dash-in">

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#0a0a1e", margin: 0, letterSpacing: "-0.045em" }}>Buen día 👋</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "6px 0 0", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, display: "inline-block", boxShadow: `0 0 8px ${C.green}` }} />
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/admin/venta-manual" className="btn-primary" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 22px",
            borderRadius: 13, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
            color: "#fff", fontSize: 13, fontWeight: 800, textDecoration: "none",
            boxShadow: `0 6px 22px ${C.purple}50`, transition: "transform .15s, box-shadow .15s",
          }}>
            <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Nuevo Pedido
          </Link>
          <button className="btn-sec" style={{
            padding: "11px 20px", borderRadius: 13, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)",
            border: `1px solid ${C.purple}28`, fontSize: 13, fontWeight: 700, color: C.purple, cursor: "pointer", transition: "all .15s",
          }}>
            ↑ Exportar
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => <KPICard key={i} {...k} />)}
      </div>

      {/* ── Gráficos ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 305px", gap: 14, marginBottom: 22 }}>

        {/* Área */}
        <div style={{ ...card, padding: "26px 26px 18px" }}>
          <SH title="Ventas y Pedidos" sub={period === "week" ? "Últimos 7 días" : "Este mes"}
            action={
              <div style={{ display: "flex", gap: 6 }}>
                {(["week", "month"] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: "5px 15px", borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: period === p ? `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})` : `${C.purple}08`,
                    color: period === p ? "#fff" : "#94a3b8",
                    border: period === p ? "none" : `1px solid ${C.purple}20`,
                    boxShadow: period === p ? `0 4px 14px ${C.purple}45` : "none",
                    transition: "all .15s",
                  }}>
                    {p === "week" ? "Semana" : "Mes"}
                  </button>
                ))}
              </div>
            }
          />
          <div style={{ height: 265 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData[period]} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.green} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={`${C.purple}10`} strokeDasharray="0"/>
                <XAxis dataKey="dia" stroke="transparent" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="l" stroke="transparent" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="r" orientation="right" stroke="transparent" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip />}/>
                <Area yAxisId="l" type="monotone" dataKey="Ventas"  stroke={C.purple} strokeWidth={2.5} fill="url(#gv)" dot={false}/>
                <Area yAxisId="r" type="monotone" dataKey="Pedidos" stroke={C.green}  strokeWidth={2.5} fill="url(#gp)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 10, paddingLeft: 4 }}>
            {[{ c: C.purple, l: "Ventas" }, { c: C.green, l: "Pedidos" }].map((it, x) => (
              <div key={x} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 26, height: 3, borderRadius: 3, background: it.c, boxShadow: `0 0 8px ${it.c}` }} />
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{it.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <div style={{ ...card, padding: "26px" }}>
          <SH title="Distribución" sub="Por categoría"/>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={54} outerRadius={76} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(255,255,255,0.97)", border: `1px solid ${C.purple}20`, borderRadius: 12, fontSize: 12, boxShadow: `0 8px 30px ${C.purple}18` }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flexShrink: 0, boxShadow: `0 0 7px ${d.color}90` }} />
                <span style={{ fontSize: 12, color: "#64748b", flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#0a0a1e" }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Fila inferior ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 290px 290px", gap: 14, marginBottom: 22 }}>

        {/* Pedidos */}
        <div style={{ ...card, padding: "26px" }}>
          <SH title="Últimos Pedidos" sub="Pedidos recientes" action={<ViewAll href="/admin/pedidos"/>}/>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {pedidos.map(p => {
              const e = ESTADO[p.estado] ?? ESTADO.pendiente;
              return (
                <div key={p.id} className="pedido-row" style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 15px", borderRadius: 13,
                  border: `1px solid ${C.purple}0A`,
                  background: "rgba(255,255,255,0.55)", transition: "all .15s", cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: e.dot, flexShrink: 0, boxShadow: `0 0 9px ${e.dot}` }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0a0a1e" }}>{p.numero}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{p.cliente} · {p.fecha}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#0a0a1e" }}>{fmtMXN(p.monto)}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, padding: "2px 9px", borderRadius: 20, background: e.bg, color: e.color, display: "inline-block", border: `1px solid ${e.dot}28` }}>
                      {e.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock crítico */}
        <div style={{ ...card, padding: "26px" }}>
          <SH title="Stock Crítico"
            action={<span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: `${C.orange}15`, color: C.orange, border: `1px solid ${C.orange}28` }}>{productosCriticos.length}</span>}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {productosCriticos.map(p => {
              const s   = p.stock ?? 0;
              const m   = p.stockMinimo ?? 5;
              const pct = Math.min(100, (s / m) * 100);
              const bar = s === 0 ? C.orange : s <= m * 0.3 ? C.orange : C.yellow;
              return (
                <div key={p.id} style={{ padding: "11px 13px", borderRadius: 12, background: "rgba(255,255,255,0.55)", border: `1px solid ${C.purple}0A` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", flex: 1, marginRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.nombre || p.nombre_producto || "Producto"}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                      background: s === 0 ? `${C.orange}15` : `${C.yellow}25`,
                      color: s === 0 ? C.orange : "#a09600",
                      border: `1px solid ${s === 0 ? C.orange : C.yellow}35`,
                    }}>
                      {s === 0 ? "Agotado" : `${s}/${m}`}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 5, background: `${C.purple}10`, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 5, width: `${pct}%`, background: bar, boxShadow: `0 0 8px ${bar}70`, transition: "width .5s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/admin/productos" className="va-btn" style={{
            display: "block", textAlign: "center", marginTop: 16, padding: "10px",
            borderRadius: 11, fontSize: 12, fontWeight: 700, textDecoration: "none",
            color: C.purple, background: `${C.purple}0E`, border: `1px solid ${C.purple}28`, transition: "all .15s",
          }}>
            Gestionar productos →
          </Link>
        </div>

        {/* Tareas */}
        <div style={{ ...card, padding: "26px" }}>
          <SH title="Tareas del Día" action={<span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{doneCount}/{tasks.length}</span>}/>
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Progreso diario</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.purple }}>{progressPct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 6, background: `${C.purple}12`, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 6, width: `${progressPct}%`, background: `linear-gradient(90deg, ${C.purple}, ${C.orange})`, boxShadow: `0 0 10px ${C.purple}55`, transition: "width .5s cubic-bezier(.4,0,.2,1)" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tasks.map(t => {
              const pc = t.p === "alta" ? `${C.orange}12` : t.p === "media" ? `${C.yellow}20` : `${C.green}12`;
              const tc = t.p === "alta" ? C.orange : t.p === "media" ? "#a09600" : "#1a9e30";
              return (
                <div key={t.id}
                  onClick={() => setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                  className="task-row"
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11,
                    cursor: "pointer", background: t.done ? `${C.green}08` : "transparent", transition: "background .15s",
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: t.done ? C.green : "#fff",
                    border: `1.5px solid ${t.done ? C.green : `${C.purple}28`}`,
                    boxShadow: t.done ? `0 0 10px ${C.green}70` : "none",
                    transition: "all .2s",
                  }}>
                    {t.done && (
                      <svg style={{ width: 10, height: 10, color: "#000" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 12, flex: 1, color: t.done ? "#94a3b8" : "#374151", textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, flexShrink: 0, background: pc, color: tc, border: `1px solid ${tc}28` }}>{t.p}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Clientes ── */}
      <div style={{ ...card, padding: "26px" }}>
        <SH title="Clientes Activos Hoy" sub="Actividad del día" action={<ViewAll href="/admin/clientes"/>}/>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 13 }}>
          {clientes.map((cl, i) => (
            <div key={i} className="client-card" style={{
              padding: "20px 18px", borderRadius: 16,
              border: `1px solid ${cl.c}28`, background: "rgba(255,255,255,0.55)",
              cursor: "pointer", transition: "all .22s",
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14, marginBottom: 14,
                background: cl.c === C.yellow ? C.yellow : `${cl.c}18`,
                border: `1.5px solid ${cl.c}38`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 19, fontWeight: 900,
                color: cl.c === C.yellow ? "#000" : cl.c,
              }}>
                {cl.n[0]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0a0a1e", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cl.n}</div>
              <div style={{ fontSize: 10.5, color: "#94a3b8", marginBottom: 12, fontWeight: 500 }}>{cl.t}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: cl.c, letterSpacing: "-0.03em" }}>{fmtMXN(cl.m)}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes dashIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .dash-in      { animation: dashIn .4s cubic-bezier(.4,0,.2,1); }
        .spin         { animation: spin .75s linear infinite; }
        .kpi-card:hover   { transform:translateY(-3px) !important; box-shadow:0 14px 40px rgba(152,81,249,0.16) !important; }
        .btn-primary:hover { transform:translateY(-2px) !important; box-shadow:0 10px 30px rgba(152,81,249,0.5) !important; }
        .btn-sec:hover    { background: rgba(152,81,249,0.06) !important; }
        .va-btn:hover     { background: rgba(152,81,249,0.16) !important; }
        .pedido-row:hover { border-color: rgba(152,81,249,0.22) !important; background:rgba(152,81,249,0.04) !important; }
        .task-row:hover   { background: rgba(152,81,249,0.05) !important; }
        .client-card:hover { transform:translateY(-3px) !important; box-shadow:0 12px 34px rgba(152,81,249,0.12) !important; }
      `}</style>
    </div>
  );
}