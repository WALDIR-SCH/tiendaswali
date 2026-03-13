"use client";
import { useState } from 'react';
import { 
  FileText, Clock, CheckCircle, XCircle,
  Plus, Download, Send, Edit, Trash2,
  Eye
} from 'lucide-react';

const cotizaciones = [
  {
    id: 'COT-2024-001',
    fecha: '10 Feb 2024',
    estado: 'Pendiente',
    proveedor: 'Cisco Systems',
    productos: ['Router Catalyst 9000', 'Switch Nexus 9300'],
    total: '$15,450.00',
    validez: '30 días'
  },
  {
    id: 'COT-2024-002',
    fecha: '12 Feb 2024',
    estado: 'Aprobada',
    proveedor: 'Huawei',
    productos: ['Access Point AX3', 'Router Enterprise'],
    total: '$8,750.00',
    validez: '15 días'
  },
  {
    id: 'COT-2024-003',
    fecha: '15 Feb 2024',
    estado: 'Rechazada',
    proveedor: 'MikroTik',
    productos: ['Router RB5009', 'Switch CRS326'],
    total: '$3,200.00',
    validez: '20 días'
  },
  {
    id: 'COT-2024-004',
    fecha: '18 Feb 2024',
    estado: 'Expirada',
    proveedor: 'TP-Link',
    productos: ['Switch JetStream', 'Access Point EAP'],
    total: '$1,890.00',
    validez: '7 días'
  }
];

export default function CotizacionesPage() {
  const [nuevaCotizacion, setNuevaCotizacion] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Cotizaciones</h1>
          <p className="text-slate-400 mt-2">Solicitudes y seguimiento de cotizaciones</p>
        </div>
        <button 
          onClick={() => setNuevaCotizacion(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Nueva Cotización
        </button>
      </div>

      {/* Lista de cotizaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cotizaciones.map((cotizacion) => {
          const getEstadoConfig = (estado: string) => {
            switch (estado.toLowerCase()) {
              case 'aprobada':
                return { color: 'bg-emerald-900/30 text-emerald-400', icon: CheckCircle };
              case 'pendiente':
                return { color: 'bg-amber-900/30 text-amber-400', icon: Clock };
              case 'rechazada':
                return { color: 'bg-red-900/30 text-red-400', icon: XCircle };
              case 'expirada':
                return { color: 'bg-slate-800 text-slate-400', icon: Clock };
              default:
                return { color: 'bg-slate-800 text-slate-400', icon: FileText };
            }
          };

          const config = getEstadoConfig(cotizacion.estado);
          const Icon = config.icon;

          return (
            <div key={cotizacion.id} className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{cotizacion.id}</h3>
                  <p className="text-sm text-slate-500">{cotizacion.fecha}</p>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${config.color}`}>
                  <Icon size={14} />
                  <span className="text-sm font-medium">{cotizacion.estado}</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-slate-400 mb-1">Proveedor</div>
                <div className="text-white font-medium">{cotizacion.proveedor}</div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-slate-400 mb-2">Productos</div>
                <ul className="space-y-1">
                  {cotizacion.productos.map((producto, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-center gap-2">
                      <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                      {producto}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-sm text-slate-400">Total</div>
                  <div className="text-xl font-bold text-white">{cotizacion.total}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Validez</div>
                  <div className="text-white font-medium">{cotizacion.validez}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                  <Eye size={16} className="text-slate-400" />
                  <span className="text-sm text-white">Ver</span>
                </button>
                <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                  <Download size={16} className="text-slate-400" />
                </button>
                <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                  <Send size={16} className="text-slate-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nueva cotización modal */}
      {nuevaCotizacion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Nueva Cotización</h2>
              <button
                onClick={() => setNuevaCotizacion(false)}
                className="p-2 hover:bg-slate-800 rounded-lg"
              >
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Proveedor</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white">
                  <option value="">Seleccionar proveedor</option>
                  <option value="cisco">Cisco Systems</option>
                  <option value="huawei">Huawei</option>
                  <option value="mikrotik">MikroTik</option>
                  <option value="tplink">TP-Link</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Productos</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white min-h-[100px]"
                  placeholder="Describe los productos o servicios que necesitas cotizar..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Validez (días)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Fecha límite</label>
                  <input
                    type="date"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setNuevaCotizacion(false)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
                  <Send size={18} className="inline mr-2" />
                  Enviar Solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}