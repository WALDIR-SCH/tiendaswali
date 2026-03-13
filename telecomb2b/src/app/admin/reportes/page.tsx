"use client";
import { useEffect, useState, useRef } from "react";
import { Inter } from "next/font/google";
import { db } from "@/lib/firebase";
import { collection, getDocs, Timestamp, query, orderBy, limit } from "firebase/firestore";
import { 
  TrendingUp, DollarSign, Briefcase, Zap, 
  Target, Calendar, Download, RefreshCcw, CheckCircle, List
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const inter = Inter({ subsets: ["latin"] });

// --- INTERFACES ---
interface Venta {
  id: string;
  total: number;
  estado: string;
  metodoPago: string;
  clienteNombre?: string;
  fecha?: Timestamp;
  items?: { nombre: string; cantidad: number }[];
}

interface Metricas {
  ingresosTotales: number;
  deltaIngresos: number;
  pedidosCompletados: number;
  deltaPedidos: number;
  proyeccionMes: number;
  ticketPromedio: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  rankingProductos: { nombre: string; cantidad: number }[];
  transacciones: Venta[];
}

export default function DashboardEmpresarial() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pedidosSnap = await getDocs(collection(db, "pedidos"));
      const ahora = new Date();
      const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const inicioMesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const finMesPasado = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

      let ingresosActual = 0, ingresosPasado = 0, pedidosActual = 0, pedidosPasado = 0;
      let efec = 0, tarj = 0, trans = 0;
      const conteo: Record<string, number> = {};
      const listaTransacciones: Venta[] = [];

      pedidosSnap.forEach((doc) => {
        const data = doc.data() as Venta;
        const fechaPedido = data.fecha?.toDate() || new Date();
        const total = data.total || 0;

        if (["Pagado", "Completado"].includes(data.estado)) {
          if (fechaPedido >= inicioMesActual) {
            ingresosActual += total;
            pedidosActual++;
            if (data.metodoPago === "Efectivo") efec += total;
            else if (data.metodoPago === "Tarjeta") tarj += total;
            else trans += total;
            
            // Guardar transacciones para la tabla
            listaTransacciones.push({ ...data, id: doc.id });
          } else if (fechaPedido >= inicioMesPasado && fechaPedido <= finMesPasado) {
            ingresosPasado += total;
            pedidosPasado++;
          }
        }

        data.items?.forEach(item => {
          conteo[item.nombre] = (conteo[item.nombre] || 0) + item.cantidad;
        });
      });

      const calcularDelta = (a: number, p: number) => p === 0 ? 100 : ((a - p) / p) * 100;
      
      setMetricas({
        ingresosTotales: ingresosActual,
        deltaIngresos: calcularDelta(ingresosActual, ingresosPasado),
        pedidosCompletados: pedidosActual,
        deltaPedidos: calcularDelta(pedidosActual, pedidosPasado),
        proyeccionMes: (ingresosActual / (ahora.getDate() || 1)) * new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate(),
        ticketPromedio: pedidosActual > 0 ? ingresosActual / pedidosActual : 0,
        efectivo: efec,
        tarjeta: tarj,
        transferencia: trans,
        rankingProductos: Object.entries(conteo).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a,b) => b.cantidad - a.cantidad).slice(0,5),
        transacciones: listaTransacciones.sort((a,b) => (b.fecha?.toMillis() || 0) - (a.fecha?.toMillis() || 0)).slice(0, 10)
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const exportarPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#F8FAFC"
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Reporte_Telecom_Full_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error exportando:", error);
    } finally { setIsExporting(false); }
  };

  if (loading || !metricas) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">CARGANDO...</div>;

  return (
    <div className={`${inter.className} min-h-screen bg-[#F8FAFC] pb-10`}>
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#000000] rounded-xl flex items-center justify-center text-white"><Zap size={20} /></div>
            <h1 className="text-xl font-bold tracking-tight">TELECOM B2B</h1>
          </div>
          <button 
            onClick={exportarPDF}
            disabled={isExporting}
            className="flex items-center gap-2 bg-[#000000] text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[#4f46e5] disabled:bg-slate-400 transition-all shadow-lg"
          >
            {isExporting ? <RefreshCcw size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting ? "Generando..." : "Exportar Reporte"}
          </button>
        </div>
      </header>

      <div ref={dashboardRef} className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 bg-[#F8FAFC]">
        
        {/* TITULO REPORTE (Aparece en PDF) */}
        <div className="border-l-4 border-[#4f46e5] pl-4">
          <h2 className="text-2xl font-black text-[#0f172a] uppercase">Reporte de Desempeño Comercial</h2>
          <p className="text-sm text-[#64748b] font-medium">Periodo: {new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Ingresos", val: `$${metricas.ingresosTotales.toLocaleString()}`, delta: metricas.deltaIngresos, icon: <DollarSign size={20}/>, color: "#059669" },
            { label: "Ventas", val: metricas.pedidosCompletados, delta: metricas.deltaPedidos, icon: <Briefcase size={20}/>, color: "#0f172a" },
            { label: "Ticket Prom.", val: `$${metricas.ticketPromedio.toFixed(0)}`, delta: null, icon: <Target size={20}/>, color: "#2563eb" },
            { label: "Proyección", val: `$${metricas.proyeccionMes.toLocaleString(undefined, {maximumFractionDigits:0})}`, delta: null, icon: <TrendingUp size={20}/>, color: "#4f46e5" }
          ].map((kpi, i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] p-8 rounded-4xl shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-[#f8fafc] rounded-2xl" style={{ color: kpi.color }}>{kpi.icon}</div>
                {kpi.delta !== null && (
                  <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${kpi.delta >= 0 ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#fef2f2] text-[#dc2626]'}`}>
                    {Math.abs(kpi.delta).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">{kpi.label}</p>
              <h2 className="text-3xl font-black text-[#0f172a] mt-1 tracking-tighter">{kpi.val}</h2>
            </div>
          ))}
        </div>

        {/* GRÁFICO Y CANALES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-[#e2e8f0] p-8 rounded-[2.5rem] shadow-sm">
            <h3 className="font-bold text-[#0f172a] text-sm uppercase mb-10 tracking-widest flex items-center gap-2">
              <Calendar size={18} className="text-[#4f46e5]"/> Ventas por Línea de Producto
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricas.rankingProductos}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} dy={10} />
                  <YAxis hide />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                  <Area type="monotone" dataKey="cantidad" stroke="#4f46e5" strokeWidth={3} fill="url(#colorArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#020617] p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-between">
            <h3 className="font-bold text-[#818cf8] text-[10px] uppercase tracking-widest mb-8">Mezcla de Cobro</h3>
            <div className="space-y-6">
              {[
                { label: "Efectivo", val: metricas.efectivo, color: "#10b981" },
                { label: "Transferencia", val: metricas.transferencia, color: "#3b82f6" },
                { label: "Tarjeta", val: metricas.tarjeta, color: "#6366f1" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[#94a3b8]">
                    <span>{item.label}</span>
                    <span className="text-white">${item.val.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#ffffff1a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${(item.val / (metricas.ingresosTotales || 1)) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 p-6 bg-[#ffffff0d] rounded-3xl border border-[#ffffff1a]">
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1">Crecimiento vs Mes Anterior</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{metricas.deltaIngresos.toFixed(1)}%</span>
                <TrendingUp size={20} className="text-[#34d399]" />
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE ÚLTIMAS TRANSACCIONES (NUEVO) */}
        <div className="bg-white border border-[#e2e8f0] rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-[#f1f5f9] flex justify-between items-center bg-[#fafbfc]">
            <h3 className="font-bold text-[#0f172a] text-sm uppercase tracking-widest flex items-center gap-2">
              <List size={18} className="text-[#4f46e5]"/> Registro de Transacciones Recientes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fafc] text-[#64748b] text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-4">Cliente</th>
                  <th className="px-8 py-4">Fecha</th>
                  <th className="px-8 py-4">Método</th>
                  <th className="px-8 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {metricas.transacciones.map((t) => (
                  <tr key={t.id} className="hover:bg-[#fcfdfe] transition-colors">
                    <td className="px-8 py-4 font-bold text-[#1e293b] text-sm">{t.clienteNombre || 'Sin nombre'}</td>
                    <td className="px-8 py-4 text-[#64748b] text-xs">{t.fecha?.toDate().toLocaleDateString()}</td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1 bg-[#f1f5f9] text-[#475569] rounded-full text-[10px] font-bold">
                        {t.metodoPago}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right font-black text-[#0f172a] text-sm">
                      ${t.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}