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
    <div className="space-y-6 p-6 min-h-screen" style={{backgroundColor: '#F3F4F6'}}>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold" style={{color: '#4B5563'}}>Facturación</h1>
          <p className="mt-2" style={{color: '#6B7280'}}>Gestión de facturas y datos fiscales</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors" style={{backgroundColor: '#9851F9'}}>
          <Plus size={18} />
          Nueva Factura
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Resumen financiero */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg" style={{borderColor: '#D1D5D8', borderWidth: '1px', backgroundColor: 'rgba(40, 251, 75, 0.08)'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(40, 251, 75, 0.15)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(40, 251, 75, 0.08)'}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold" style={{color: '#4B5563'}}>$5,191.25</div>
                  <div style={{color: '#6B7280'}}>Total Facturado</div>
                </div>
                <DollarSign size={24} style={{color: '#28FB4B'}} />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg" style={{borderColor: '#D1D5D8', borderWidth: '1px', backgroundColor: 'rgba(246, 250, 0, 0.12)'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(246, 250, 0, 0.22)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(246, 250, 0, 0.12)'}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold" style={{color: '#4B5563'}}>$1,850.50</div>
                  <div style={{color: '#6B7280'}}>Pendiente</div>
                </div>
                <Calendar size={24} style={{color: '#F6FA00'}} />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg" style={{borderColor: '#D1D5D8', borderWidth: '1px', backgroundColor: 'rgba(152, 81, 249, 0.10)'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(152, 81, 249, 0.18)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(152, 81, 249, 0.10)'}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold" style={{color: '#4B5563'}}>3</div>
                  <div style={{color: '#6B7280'}}>Facturas</div>
                </div>
                <FileText size={24} style={{color: '#9851F9'}} />
              </div>
            </div>
          </div>

          {/* Lista de facturas */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg" style={{borderColor: '#D1D5D8', borderWidth: '1px'}}>
            <div className="p-6 flex justify-between items-center" style={{borderBottomColor: '#D1D5D8', borderBottomWidth: '1px'}}>
              <h2 className="text-xl font-bold" style={{color: '#4B5563'}}>Historial de Facturas</h2>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg transition-all duration-300" style={{backgroundColor: '#E5E7EB'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D1D5D8'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}>
                  <Filter size={18} style={{color: '#1F408C'}} />
                </button>
                <button className="p-2 rounded-lg transition-all duration-300" style={{backgroundColor: '#E5E7EB'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D1D5D8'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}>
                  <Printer size={18} style={{color: '#1F408C'}} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{borderBottomColor: '#D1D5D8', borderBottomWidth: '1px'}}>
                    <th className="text-left py-4 px-6 font-semibold" style={{color: '#6B7280'}}>Factura</th>
                    <th className="text-left py-4 px-6 font-semibold" style={{color: '#6B7280'}}>Fecha</th>
                    <th className="text-left py-4 px-6 font-semibold" style={{color: '#6B7280'}}>Estado</th>
                    <th className="text-left py-4 px-6 font-semibold" style={{color: '#6B7280'}}>Total</th>
                    <th className="text-left py-4 px-6 font-semibold" style={{color: '#6B7280'}}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((factura) => (
                    <tr key={factura.id} style={{borderBottomColor: '#D1D5D8', borderBottomWidth: '1px'}} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="font-bold" style={{color: '#4B5563'}}>{factura.id}</div>
                        <div className="text-sm" style={{color: '#6B7280'}}>{factura.tipo}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div style={{color: '#4B5563'}}>{factura.fecha}</div>
                        <div className="text-sm" style={{color: '#6B7280'}}>Vence: {factura.fechaVencimiento}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{
                          backgroundColor: factura.estado === 'Pagada' ? 'rgba(40, 251, 75, 0.15)' : factura.estado === 'Pendiente' ? 'rgba(246, 250, 0, 0.25)' : 'rgba(220, 38, 38, 0.15)',
                          color: factura.estado === 'Pagada' ? '#065f46' : factura.estado === 'Pendiente' ? '#000' : '#991b1b'
                        }}>
                          <span className="text-sm font-medium">{factura.estado}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-lg font-bold" style={{color: '#4B5563'}}>{factura.total}</div>
                        <div className="text-sm" style={{color: '#6B7280'}}>{factura.descripcion}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button className="p-2 rounded-lg transition-all duration-300" style={{backgroundColor: '#E5E7EB'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D1D5D8'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}>
                            <Eye size={18} style={{color: '#1F408C'}} />
                          </button>
                          <button className="p-2 rounded-lg transition-all duration-300" style={{backgroundColor: '#E5E7EB'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D1D5D8'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}>
                            <Download size={18} style={{color: '#ff0000'}} />
                          </button>
                          <button className="p-2 rounded-lg transition-all duration-300" style={{backgroundColor: '#E5E7EB'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D1D5D8'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}>
                            <Share2 size={18} style={{color: '#0055ff'}} />
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
          <div className="bg-white rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg" style={{borderColor: '#D1D5D8', borderWidth: '1px'}}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{color: '#4B5563'}}>
              <Building size={20} style={{color: '#9851F9'}} />
              Datos Fiscales
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm mb-1" style={{color: '#6B7280'}}>Razón Social</div>
                <div className="font-medium" style={{color: '#4B5563'}}>FiberPlus S.A.C</div>
              </div>
              
              <div>
                <div className="text-sm mb-1" style={{color: '#6B7280'}}>RUC</div>
                <div className="font-medium" style={{color: '#4B5563'}}>20123456789</div>
              </div>
              
              <div>
                <div className="text-sm mb-1" style={{color: '#6B7280'}}>Dirección Fiscal</div>
                <div className="font-medium" style={{color: '#4B5563'}}>Calle Unamba 123</div>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-sm mb-1" style={{color: '#6B7280'}}>Ciudad</div>
                  <div className="font-medium" style={{color: '#4B5563'}}>Abancay</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm mb-1" style={{color: '#6B7280'}}>Código Postal</div>
                  <div className="font-medium" style={{color: '#4B5563'}}>03001</div>
                </div>
              </div>
              
              <button
                onClick={() => setMostrarDatosFiscales(!mostrarDatosFiscales)}
                className="w-full mt-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{color: '#9851F9'}}
              >
                {mostrarDatosFiscales ? 'Ocultar detalles' : 'Mostrar más detalles'}
              </button>
              
              {mostrarDatosFiscales && (
                <div className="mt-4 pt-4 space-y-3" style={{borderTopColor: '#D1D5D8', borderTopWidth: '1px'}}>
                  <div>
                    <div className="text-sm mb-1" style={{color: '#6B7280'}}>Registro Tributario</div>
                    <div className="font-medium" style={{color: '#4B5563'}}>Activo</div>
                  </div>
                  <div>
                    <div className="text-sm mb-1" style={{color: '#6B7280'}}>Condición Fiscal</div>
                    <div className="font-medium" style={{color: '#4B5563'}}>Responsable Inscripto</div>
                  </div>
                  <div>
                    <div className="text-sm mb-1" style={{color: '#6B7280'}}>Tipo de Contribuyente</div>
                    <div className="font-medium" style={{color: '#4B5563'}}>Persona Jurídica</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Métodos de pago */}
          <div className="bg-white rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg" style={{borderColor: '#D1D5D8', borderWidth: '1px'}}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{color: '#4B5563'}}>
              <CreditCard size={20} style={{color: '#FF6600'}} />
              Métodos de Pago
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-300" style={{backgroundColor: '#F3F4F6'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 rounded flex items-center justify-center" style={{backgroundColor: '#9851F9'}}>
                    <span className="text-xs font-bold text-white">VISA</span>
                  </div>
                  <div>
                    <div className="text-sm" style={{color: '#4B5563'}}>**** **** **** 4321</div>
                    <div className="text-xs" style={{color: '#6B7280'}}>Principal</div>
                  </div>
                </div>
                <button style={{color: '#1F408C'}} className="hover:opacity-70 transition-opacity">
                  <Eye size={16} />
                </button>
              </div>
              
              <button className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-lg transition-all duration-300" style={{borderColor: '#FF6600', color: '#FF6600'}} onMouseEnter={(e) => {e.currentTarget.style.backgroundColor = 'rgba(255, 102, 0, 0.08)'; e.currentTarget.style.borderColor = '#FF6600';}} onMouseLeave={(e) => {e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#FF6600';}}>
                <Plus size={18} />
                Agregar método de pago
              </button>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-white rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg" style={{borderColor: '#D1D5D8', borderWidth: '1px'}}>
            <h3 className="text-lg font-bold mb-4" style={{color: '#4B5563'}}>Acciones Rápidas</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 rounded-lg transition-all duration-300" style={{backgroundColor: '#F3F4F6'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}>
                <span style={{color: '#4B5563'}}>Descargar certificado</span>
                <Download size={16} style={{color: '#ff0000'}} />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-lg transition-all duration-300" style={{backgroundColor: '#F3F4F6'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}>
                <span style={{color: '#4B5563'}}>Actualizar datos</span>
                <Edit size={16} style={{color: '#9851F9'}} />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-lg transition-all duration-300" style={{backgroundColor: '#F3F4F6'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}>
                <span style={{color: '#4B5563'}}>Contactar contabilidad</span>
                <MapPin size={16} style={{color: '#ff0000'}} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}