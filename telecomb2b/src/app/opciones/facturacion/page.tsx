"use client";
import { useState } from 'react';
import { 
  CreditCard, FileText, Download, Eye, 
  Calendar, DollarSign, Building, MapPin,
  Plus, Filter, Printer, Share2,
  Edit
} from 'lucide-react';

const facturas = [
  {
    id: 'FAC-2024-001',
    fecha: '15 Ene 2024',
    fechaVencimiento: '15 Feb 2024',
    estado: 'Pagada',
    total: '$2,450.00',
    tipo: 'Factura Electrónica',
    descripcion: 'Router Catalyst 9000 x2'
  },
  {
    id: 'FAC-2024-002',
    fecha: '01 Feb 2024',
    fechaVencimiento: '01 Mar 2024',
    estado: 'Pendiente',
    total: '$1,850.50',
    tipo: 'Factura Electrónica',
    descripcion: 'Switch Enterprise x1'
  },
  {
    id: 'FAC-2024-003',
    fecha: '10 Feb 2024',
    fechaVencimiento: '10 Mar 2024',
    estado: 'Vencida',
    total: '$890.75',
    tipo: 'Boleta Electrónica',
    descripcion: 'Access Points x3'
  }
];

export default function FacturacionPage() {
  const [mostrarDatosFiscales, setMostrarDatosFiscales] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Facturación</h1>
          <p className="text-slate-400 mt-2">Gestión de facturas y datos fiscales</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
          <Plus size={18} />
          Nueva Factura
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Resumen financiero */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">$5,191.25</div>
                  <div className="text-slate-400">Total Facturado</div>
                </div>
                <DollarSign size={24} className="text-emerald-400" />
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">$1,850.50</div>
                  <div className="text-slate-400">Pendiente</div>
                </div>
                <Calendar size={24} className="text-amber-400" />
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">3</div>
                  <div className="text-slate-400">Facturas</div>
                </div>
                <FileText size={24} className="text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Lista de facturas */}
          <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Historial de Facturas</h2>
              <div className="flex gap-2">
                <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg">
                  <Filter size={18} className="text-slate-400" />
                </button>
                <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg">
                  <Printer size={18} className="text-slate-400" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-4 px-6 text-slate-400 font-semibold">Factura</th>
                    <th className="text-left py-4 px-6 text-slate-400 font-semibold">Fecha</th>
                    <th className="text-left py-4 px-6 text-slate-400 font-semibold">Estado</th>
                    <th className="text-left py-4 px-6 text-slate-400 font-semibold">Total</th>
                    <th className="text-left py-4 px-6 text-slate-400 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((factura) => (
                    <tr key={factura.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{factura.id}</div>
                        <div className="text-sm text-slate-500">{factura.tipo}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-white">{factura.fecha}</div>
                        <div className="text-sm text-slate-500">Vence: {factura.fechaVencimiento}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                          factura.estado === 'Pagada' 
                            ? 'bg-emerald-900/30 text-emerald-400' 
                            : factura.estado === 'Pendiente'
                            ? 'bg-amber-900/30 text-amber-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          <span className="text-sm font-medium">{factura.estado}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-lg font-bold text-white">{factura.total}</div>
                        <div className="text-sm text-slate-500">{factura.descripcion}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg">
                            <Eye size={18} className="text-slate-400" />
                          </button>
                          <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg">
                            <Download size={18} className="text-slate-400" />
                          </button>
                          <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg">
                            <Share2 size={18} className="text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel derecho - Datos fiscales */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building size={20} />
              Datos Fiscales
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-400 mb-1">Razón Social</div>
                <div className="text-white font-medium">FiberPlus S.A.C</div>
              </div>
              
              <div>
                <div className="text-sm text-slate-400 mb-1">RUC</div>
                <div className="text-white font-medium">20123456789</div>
              </div>
              
              <div>
                <div className="text-sm text-slate-400 mb-1">Dirección Fiscal</div>
                <div className="text-white font-medium">Calle Unamba 123</div>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-sm text-slate-400 mb-1">Ciudad</div>
                  <div className="text-white font-medium">Abancay</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-400 mb-1">Código Postal</div>
                  <div className="text-white font-medium">03001</div>
                </div>
              </div>
              
              <button
                onClick={() => setMostrarDatosFiscales(!mostrarDatosFiscales)}
                className="w-full mt-4 py-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
              >
                {mostrarDatosFiscales ? 'Ocultar detalles' : 'Mostrar más detalles'}
              </button>
              
              {mostrarDatosFiscales && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Registro Tributario</div>
                    <div className="text-white font-medium">Activo</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Condición Fiscal</div>
                    <div className="text-white font-medium">Responsable Inscripto</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Tipo de Contribuyente</div>
                    <div className="text-white font-medium">Persona Jurídica</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Métodos de pago */}
          <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard size={20} />
              Métodos de Pago
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-white">VISA</span>
                  </div>
                  <div>
                    <div className="text-white text-sm">**** **** **** 4321</div>
                    <div className="text-slate-400 text-xs">Principal</div>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-white">
                  <Eye size={16} />
                </button>
              </div>
              
              <button className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors">
                <Plus size={18} />
                Agregar método de pago
              </button>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                <span className="text-white">Descargar certificado</span>
                <Download size={16} className="text-slate-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                <span className="text-white">Actualizar datos</span>
                <Edit size={16} className="text-slate-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                <span className="text-white">Contactar contabilidad</span>
                <MapPin size={16} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}