"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ pedidos: 0, stockBajo: 0, clientes: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const pSnap = await getDocs(query(collection(db, "pedidos"), where("estado", "==", "Pendiente")));
      const sSnap = await getDocs(query(collection(db, "productos"), where("stock", "<", 5)));
      const cSnap = await getDocs(collection(db, "usuarios")); // Suponiendo colección 'usuarios'
      setStats({ pedidos: pSnap.size, stockBajo: sSnap.size, clientes: cSnap.size });
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-bold">PEDIDOS PENDIENTES</p>
          <h3 className="text-3xl font-black text-blue-600">{stats.pedidos}</h3>
          <p className="text-xs text-green-500 mt-2">↑ 12% desde ayer</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-bold">STOCK BAJO</p>
          <h3 className="text-3xl font-black text-orange-500">{stats.stockBajo}</h3>
          <p className="text-xs text-slate-400 mt-2">Requiere atención</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-bold">CLIENTES REGISTRADOS</p>
          <h3 className="text-3xl font-black text-green-600">{stats.clientes}</h3>
          <p className="text-xs text-slate-400 mt-2">Empresas verificadas</p>
        </div>
      </div>

      {/* ÁREA DE GRÁFICA (Simulada por ahora) */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 h-96 flex flex-col justify-center items-center text-slate-300 italic font-medium">
        <p className="text-6xl mb-4">📈</p>
        <p>Aquí irá la gráfica de Ventas Recientes (Chart.js)</p>
      </div>
    </div>
  );
}