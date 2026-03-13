"use client";
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  Building, MapPin, FileText, Users, Globe, 
  Edit, Save, X, Briefcase, DollarSign,
  CheckCircle, AlertCircle
} from 'lucide-react';

export default function EmpresaPage() {
  const [datosEmpresa, setDatosEmpresa] = useState<any>(null);
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const docRef = doc(db, "usuarios", user.uid);
        const unsub = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDatosEmpresa(data);
            setFormData(data);
          }
          setCargando(false);
        });
        return () => unsub();
      } else {
        setCargando(false);
      }
    });

    return () => unsubAuth();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    
    try {
      const docRef = doc(db, "usuarios", auth.currentUser.uid);
      await updateDoc(docRef, {
        ...formData,
        ultima_actualizacion: new Date().toISOString(),
      });
      setEditando(false);
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  if (cargando) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Empresa</h1>
          <p className="text-slate-400 mt-2">Gestiona la información de tu empresa</p>
        </div>
        <div className="flex gap-3">
          {!editando ? (
            <button
              onClick={() => setEditando(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              <Edit size={18} />
              Editar Empresa
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <Save size={18} />
                Guardar Cambios
              </button>
              <button
                onClick={() => {
                  setEditando(false);
                  setFormData(datosEmpresa);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <X size={18} />
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Información básica */}
          <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Building size={24} />
              Información Básica
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Razón Social</label>
                  {editando ? (
                    <input
                      type="text"
                      value={formData.razonSocial || ''}
                      onChange={(e) => handleChange('razonSocial', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full"
                      placeholder="Ej: FiberPlus S.A.C"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.razonSocial || 'No especificado'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Nombre Comercial</label>
                  {editando ? (
                    <input
                      type="text"
                      value={formData.nombreComercial || ''}
                      onChange={(e) => handleChange('nombreComercial', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full"
                      placeholder="Ej: FiberPlus"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.nombreComercial || 'No especificado'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                    <FileText size={16} />
                    NIF/CIF/RUC
                  </label>
                  {editando ? (
                    <input
                      type="text"
                      value={formData.nifCifRuc || ''}
                      onChange={(e) => handleChange('nifCifRuc', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full"
                      placeholder="Ej: 20123456789"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.nifCifRuc || 'No especificado'}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Sector de Actividad</label>
                  {editando ? (
                    <select
                      value={formData.sectorActividad || ''}
                      onChange={(e) => handleChange('sectorActividad', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full"
                    >
                      <option value="">Seleccionar sector</option>
                      <option value="Telecomunicaciones / ISP">Telecomunicaciones / ISP</option>
                      <option value="Tecnología">Tecnología</option>
                      <option value="Retail">Retail</option>
                      <option value="Manufactura">Manufactura</option>
                      <option value="Servicios">Servicios</option>
                      <option value="Otro">Otro</option>
                    </select>
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.sectorActividad || 'No especificado'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                    <Users size={16} />
                    Tamaño de Empresa
                  </label>
                  {editando ? (
                    <select
                      value={formData.tamanioEmpresa || ''}
                      onChange={(e) => handleChange('tamanioEmpresa', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full"
                    >
                      <option value="">Seleccionar tamaño</option>
                      <option value="Microempresa (1-10 empleados)">Microempresa (1-10 empleados)</option>
                      <option value="Pequeña Empresa (11-50 empleados)">Pequeña Empresa (11-50 empleados)</option>
                      <option value="Mediana Empresa (51-250 empleados)">Mediana Empresa (51-250 empleados)</option>
                      <option value="Gran Empresa (+250 empleados)">Gran Empresa (+250 empleados)</option>
                    </select>
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.tamanioEmpresa || 'No especificado'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                    <Briefcase size={16} />
                    Cargo del Contacto
                  </label>
                  {editando ? (
                    <input
                      type="text"
                      value={formData.cargo || ''}
                      onChange={(e) => handleChange('cargo', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full"
                      placeholder="Ej: Gerente"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.cargo || 'No especificado'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <MapPin size={24} />
              Ubicación
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">País</label>
                  {editando ? (
                    <select
                      value={formData.pais || ''}
                      onChange={(e) => handleChange('pais', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full"
                    >
                      <option value="">Seleccionar país</option>
                      <option value="Perú">Perú</option>
                      <option value="España">España</option>
                      <option value="México">México</option>
                      <option value="Colombia">Colombia</option>
                      <option value="Chile">Chile</option>
                      <option value="Argentina">Argentina</option>
                    </select>
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.pais || 'No especificado'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Ciudad</label>
                  {editando ? (
                    <input
                      type="text"
                      value={formData.ciudad || ''}
                      onChange={(e) => handleChange('ciudad', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full"
                      placeholder="Ej: Abancay"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.ciudad || 'No especificado'}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Dirección Fiscal</label>
                  {editando ? (
                    <textarea
                      value={formData.direccionFiscal || ''}
                      onChange={(e) => handleChange('direccionFiscal', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full min-h-[100px]"
                      placeholder="Ej: Calle Unamba 123"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.direccionFiscal || 'No especificado'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Código Postal</label>
                  {editando ? (
                    <input
                      type="text"
                      value={formData.codigoPostal || ''}
                      onChange={(e) => handleChange('codigoPostal', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white w-full"
                      placeholder="Ej: 03001"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {datosEmpresa?.codigoPostal || 'No especificado'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="space-y-6">
          {/* Resumen */}
          <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Resumen</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estado</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  datosEmpresa?.verificado 
                    ? 'bg-emerald-900/30 text-emerald-400' 
                    : 'bg-amber-900/30 text-amber-400'
                }`}>
                  {datosEmpresa?.verificado ? 'Verificada' : 'Pendiente'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Acceso Precios</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  datosEmpresa?.acceso_precios 
                    ? 'bg-emerald-900/30 text-emerald-400' 
                    : 'bg-red-900/30 text-red-400'
                }`}>
                  {datosEmpresa?.acceso_precios ? 'Habilitado' : 'Deshabilitado'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sector</span>
                <span className="text-white">{datosEmpresa?.sectorActividad?.split('/')[0] || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Documentación */}
          <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Documentación</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                <span className="text-white">Certificado Digital</span>
                {datosEmpresa?.verificado ? (
                  <CheckCircle size={18} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={18} className="text-amber-400" />
                )}
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                <span className="text-white">RUC Validado</span>
                {datosEmpresa?.verificado ? (
                  <CheckCircle size={18} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={18} className="text-amber-400" />
                )}
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                <span className="text-white">Documentos Legales</span>
                <span className="text-slate-400 text-sm">Pendiente</span>
              </button>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 rounded-lg transition-colors">
                <Globe size={18} />
                <span>Solicitar Verificación</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 rounded-lg transition-colors">
                <DollarSign size={18} />
                <span>Solicitar Acceso a Precios</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}