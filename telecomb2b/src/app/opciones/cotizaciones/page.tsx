"use client";
import { useState } from 'react';
import { 
  FileText, Clock, CheckCircle, XCircle,
  Plus, Download, Send, Edit, Trash2,
  Eye
} from 'lucide-react';

/* ─── PALETA ─── */
const C = {
  primary: "var(--primary-color)",
  primaryHover: "var(--primary-hover)",
  white: "#FFFFFF",
  bgPrimary: "var(--background-primary)",
  bgSecondary: "var(--background-secondary)",
  bgCard: "var(--background-card)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  border: "var(--border-color)",
  gray500: "#6b7280",
  red: "#ef4444",
  gray700: "#374151",
  gray900: "#111827",
  purple: "#9851F9",
  purpleDark: "#7C35E0",
  shadow: "0 8px 32px 0 rgba(80,80,120,0.10)",
    orange: "#FF6600",
        yellow: "#F6FA00",
        green: "#28FB4B",
        black: "#000000",
        gray100: "#F3F4F6",
        gray200: "#E5E7EB",
        gray300: "#D1D5DB",
        gray400: "#9CA3AF",
        gray600: "#4B5563",
};

const ESTADO_COT: Record<string, { label:string; bg:string; color:string; border:string }> = {
  pendiente:  { label:"Pendiente",  bg:C.yellow, color:C.orange, border:C.yellow },
  aprobada:   { label:"Aprobada",   bg:C.green, color:C.orange, border:C.green },
  rechazada:  { label:"Rechazada",  bg:C.orange, color:C.yellow, border:C.orange },
  expirada:   { label:"Expirada",   bg:C.bgSecondary, color:C.orange, border:C.border },
};

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
    <div className="space-y-8 p-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold" style={{color: '#4B5563'}}>Cotizaciones</h1>
          <p className="mt-2" style={{color: C.gray500}}>Solicitudes y seguimiento de cotizaciones</p>
        </div>
        <button 
          onClick={() => setNuevaCotizacion(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{backgroundColor: C.purple, color: C.white}}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.purpleDark}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.purple}
        >
          <Plus size={18} />
          Nueva Cotización
        </button>
      </div>

      {/* Lista de cotizaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cotizaciones.map((cotizacion) => {
          const estadoKey = cotizacion.estado.toLowerCase() as keyof typeof ESTADO_COT;
          const config = ESTADO_COT[estadoKey] || ESTADO_COT.pendiente;
          const Icon = cotizacion.estado.toLowerCase() === 'aprobada' ? CheckCircle : 
            cotizacion.estado.toLowerCase() === 'rechazada' ? XCircle : Clock;

          return (
            <div
              key={cotizacion.id}
              className="rounded-2xl p-6 relative transition-all duration-300 hover:scale-105 hover:shadow-xl"
              style={{
                background: C.bgCard,
                boxShadow: C.shadow,
                border: `1.5px solid ${C.border}`,
                minHeight: 320,
                overflow: 'hidden',
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold tracking-wide" style={{color: C.textPrimary}}>{cotizacion.id}</h3>
                  <p className="text-xs font-medium mt-1" style={{color: C.textSecondary}}>{cotizacion.fecha}</p>
                </div>
                <div
                  className="flex items-center gap-1 px-3 py-1 rounded-full border"
                  style={{
                    background: config.bg,
                    color: config.color,
                    borderColor: config.border,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <Icon size={16} />
                  <span>{cotizacion.estado}</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs mb-1 font-semibold" style={{color: C.textSecondary}}>Proveedor</div>
                <div className="font-semibold text-base" style={{color: C.textPrimary}}>{cotizacion.proveedor}</div>
              </div>

              <div className="mb-4">
                <div className="text-xs mb-2 font-semibold" style={{color: C.textSecondary}}>Productos</div>
                <ul className="space-y-1">
                  {cotizacion.productos.map((producto, idx) => (
                    <li key={idx} className="text-sm flex items-center gap-2" style={{color: C.textSecondary}}>
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: C.primary}}></div>
                      {producto}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-xs font-semibold" style={{color: C.textSecondary}}>Total</div>
                  <div className="text-2xl font-bold mt-1" style={{color: C.textPrimary}}>{cotizacion.total}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{color: C.textSecondary}}>Validez</div>
                  <div className="font-semibold text-base mt-1" style={{color: C.textPrimary}}>{cotizacion.validez}</div>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-semibold shadow-sm border"
                  style={{
                    backgroundColor: C.bgSecondary,
                    color: C.textPrimary,
                    borderColor: C.border,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = C.primary;
                    e.currentTarget.style.color = C.white;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = C.bgSecondary;
                    e.currentTarget.style.color = C.textPrimary;
                  }}
                >
                  <Eye size={18} style={{color: C.gray900}} />
                  <span>Ver</span>
                </button>
                <button
                  className="p-2 rounded-lg transition-colors border shadow-sm"
                  style={{backgroundColor: C.bgSecondary, borderColor: C.border}}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = C.primaryHover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = C.bgSecondary}
                >
                  <Download size={18} style={{color: C.gray900}} />
                </button>
                <button
                  className="p-2 rounded-lg transition-colors border shadow-sm"
                  style={{backgroundColor: C.bgSecondary, borderColor: C.border}}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = C.primary}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = C.bgSecondary}
                >
                  <Send size={18} style={{color: C.gray900}} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nueva cotización modal */}
      {nuevaCotizacion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300">
          <div className="border rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl" style={{backgroundColor: C.bgCard, borderColor: C.border, boxShadow: '0 20px 40px rgba(255, 0, 0, 0.3)'}}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{color: C.textPrimary}}>Nueva Cotización</h2>
              <button
                onClick={() => setNuevaCotizacion(false)}
                className="p-2 rounded-lg transition-colors hover:bg-red-500/20"
                style={{backgroundColor: 'transparent'}}
              >
                <XCircle size={24} style={{color: C.red}} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 font-semibold" style={{color: C.textSecondary}}>Proveedor</label>
                <select className="w-full border rounded-lg px-4 py-3 transition-colors focus:ring-2 focus:ring-primary" style={{backgroundColor: C.bgSecondary, borderColor: C.border, color: C.textPrimary}}>
                  <option value="">Seleccionar proveedor</option>
                  <option value="cisco">Cisco Systems</option>
                  <option value="huawei">Huawei</option>
                  <option value="mikrotik">MikroTik</option>
                  <option value="tplink">TP-Link</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-2 font-semibold" style={{color: C.textSecondary}}>Productos</label>
                <textarea
                  className="w-full border rounded-lg px-4 py-3 min-h-[100px] transition-colors focus:ring-2 focus:ring-primary"
                  style={{backgroundColor: C.bgSecondary, borderColor: C.border, color: C.textPrimary}}
                  placeholder="Describe los productos o servicios que necesitas cotizar..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 font-semibold" style={{color: C.textSecondary}}>Validez (días)</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-4 py-3 transition-colors focus:ring-2 focus:ring-primary"
                    style={{backgroundColor: C.bgSecondary, borderColor: C.border, color: C.textPrimary}}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-semibold" style={{color: C.textSecondary}}>Fecha límite</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-4 py-3 transition-colors focus:ring-2 focus:ring-primary"
                    style={{backgroundColor: C.bgSecondary, borderColor: C.border, color: C.textPrimary}}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setNuevaCotizacion(false)}
                  className="px-6 py-3 rounded-lg transition-colors font-semibold shadow-sm border hover:shadow-md"
                  style={{backgroundColor: C.bgSecondary, color: C.textPrimary, borderColor: C.border}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.primaryHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.bgSecondary}
                >
                  Cancelar
                </button>
                <button 
                  className="px-6 py-3 rounded-lg transition-colors font-semibold shadow-sm border hover:shadow-md" 
                  style={{backgroundColor: C.primary, color: C.white, borderColor: C.primary}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.primaryHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.primary}
                >
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