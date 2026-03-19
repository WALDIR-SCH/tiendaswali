"use client";
import { useEffect, useState, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  User, Mail, Phone, MapPin, Building, Briefcase, 
  Shield, Calendar, Edit2, Save, X, Camera,
  CheckCircle, AlertCircle, Globe, ChevronRight,
  Award, Clock, Lock, Loader2
} from 'lucide-react';

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [datosUsuario, setDatosUsuario] = useState<any>(null);
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para las notificaciones dinámicas (Toasts)
  const [notificacion, setNotificacion] = useState<{visible: boolean, mensaje: string, tipo: 'success' | 'error'}>({
    visible: false, mensaje: '', tipo: 'success'
  });

  // ✅ CONFIGURACIÓN CLOUDINARY
  const CLOUDINARY_CLOUD_NAME = "dzazr0jiu";
  const CLOUDINARY_UPLOAD_PRESET = "config_b2b";

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsuario(user);
        const docRef = doc(db, "usuarios", user.uid);
        const unsub = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDatosUsuario(data);
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

  // Función para mostrar el Toast temporalmente
  const mostrarNotificacion = (mensaje: string, tipo: 'success' | 'error') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ visible: false, mensaje: '', tipo: 'success' }), 3500);
  };

  const formatearFechaFirestore = (fecha: any): string => {
    if (!fecha) return '—';
    try {
      if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
        const date = fecha.toDate();
        return date.toLocaleDateString('es-ES', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
      }
      return '—';
    } catch {
      return '—';
    }
  };

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !usuario) return;

    if (!file.type.startsWith('image/')) {
      mostrarNotificacion('Por favor selecciona una imagen válida', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      mostrarNotificacion('La imagen no debe superar los 5MB', 'error');
      return;
    }

    setSubiendoFoto(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `perfiles/${usuario.uid}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error?.message || 'Error al subir la imagen');
      
      if (data.secure_url) {
        const docRef = doc(db, "usuarios", usuario.uid);
        await updateDoc(docRef, {
          fotoPerfil: data.secure_url,
          ultima_actualizacion: new Date().toISOString()
        });

        setFormData((prev: any) => ({ ...prev, fotoPerfil: data.secure_url }));
        setDatosUsuario((prev: any) => ({ ...prev, fotoPerfil: data.secure_url }));
        
        mostrarNotificacion('Foto de perfil actualizada correctamente', 'success');
      }
    } catch (error: any) {
      console.error("❌ Error al subir foto:", error);
      mostrarNotificacion(error.message || "Error al subir la imagen. Intenta nuevamente.", 'error');
    } finally {
      setSubiendoFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    
    try {
      setGuardando(true);
      const docRef = doc(db, "usuarios", auth.currentUser.uid);
      await updateDoc(docRef, {
        nombre: formData.nombre || null,
        telefono: formData.telefono || null,
        cargo: formData.cargo || null,
        pais: formData.pais || null,
        ciudad: formData.ciudad || null,
        ultima_actualizacion: new Date().toISOString()
      });
      setEditando(false);
      mostrarNotificacion('Cambios guardados correctamente', 'success');
    } catch (error) {
      console.error("Error al guardar:", error);
      mostrarNotificacion("Error al guardar los cambios", 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* --- TOAST NOTIFICATION DINÁMICO --- */}
      <div 
        className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg transition-all duration-500 flex items-center gap-2 ${
          notificacion.visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'
        } ${notificacion.tipo === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
      >
        {notificacion.tipo === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span className="font-semibold">{notificacion.mensaje}</span>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            <p className="text-sm text-gray-500 mt-1">Gestiona tu información personal y profesional</p>
          </div>
          
          <div className="flex items-center gap-3">
            {!editando ? (
              <button
                onClick={() => setEditando(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow active:scale-95 group"
              >
                <Edit2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
                Editar Perfil
              </button>
            ) : (
              <>
                <button
                  disabled={guardando}
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  disabled={guardando}
                  onClick={() => { setEditando(false); setFormData(datosUsuario); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-all shadow-sm active:scale-95"
                >
                  <X className="w-4 h-4 transition-transform hover:rotate-90" />
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna izquierda - 2 columnas */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tarjeta de información básica */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden group/card">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg group-hover/card:scale-110 transition-transform">
                    <User className="w-4 h-4" />
                  </div>
                  Información Personal
                </h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-start gap-6">
                  {/* Foto de perfil */}
                  <div className="relative flex-shrink-0 group/photo">
                    <div className="w-24 h-24 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm transition-transform group-hover/photo:scale-105">
                      {datosUsuario?.fotoPerfil ? (
                        <img 
                          src={datosUsuario.fotoPerfil} 
                          alt="Foto de perfil" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.querySelector('.fallback')?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${datosUsuario?.fotoPerfil ? 'hidden' : ''} fallback flex items-center justify-center w-full h-full`}>
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                    </div>
                    {editando && (
                      <>
                        <input type="file" ref={fileInputRef} onChange={handleSubirFoto} accept="image/*" className="hidden" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={subiendoFoto}
                          className="absolute -bottom-2 -right-2 w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 transition-all shadow-md active:scale-95"
                          title="Subir foto"
                        >
                          {subiendoFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Información principal */}
                  <div className="flex-1 min-w-0 py-2">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {editando ? (
                        <input
                          type="text"
                          value={formData.nombre || ''}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                          placeholder="Nombre completo"
                          className="text-xl font-semibold bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-full max-w-sm transition-all shadow-sm"
                        />
                      ) : (
                        <h3 className="text-xl font-bold text-gray-900">
                          {datosUsuario?.nombre || 'Sin nombre'}
                        </h3>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${
                        datosUsuario?.verificado 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {datosUsuario?.verificado ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {datosUsuario?.verificado ? 'Verificado' : 'Pendiente'}
                      </span>
                      
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold uppercase tracking-wide border border-gray-200">
                        {datosUsuario?.rol || 'Cliente'}
                      </span>

                      {datosUsuario?.email && (
                        <span className="text-sm text-gray-500 flex items-center gap-1.5 font-medium">
                          <Mail className="w-4 h-4" /> {datosUsuario.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid de campos editables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-gray-100">
                  <div className="space-y-5">
                    <div className="group flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-1 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Teléfono</label>
                        {editando ? (
                          <input type="tel" value={formData.telefono || ''} onChange={(e) => handleChange('telefono', e.target.value)} placeholder="+51 999 999 999" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm" />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{datosUsuario?.telefono || '—'}</div>
                        )}
                      </div>
                    </div>

                    <div className="group flex items-start gap-3">
                      <Briefcase className="w-5 h-5 text-gray-400 mt-1 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cargo / Puesto</label>
                        {editando ? (
                          <input type="text" value={formData.cargo || ''} onChange={(e) => handleChange('cargo', e.target.value)} placeholder="Ej: Gerente de Compras" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm" />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{datosUsuario?.cargo || '—'}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="group flex items-start gap-3">
                      <Globe className="w-5 h-5 text-gray-400 mt-1 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">País</label>
                        {editando ? (
                          <select value={formData.pais || ''} onChange={(e) => handleChange('pais', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm">
                            <option value="">Seleccionar</option>
                            {["Perú", "España", "México", "Colombia", "Chile", "Argentina"].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{datosUsuario?.pais || '—'}</div>
                        )}
                      </div>
                    </div>

                    <div className="group flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-1 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ciudad</label>
                        {editando ? (
                          <input type="text" value={formData.ciudad || ''} onChange={(e) => handleChange('ciudad', e.target.value)} placeholder="Ej: Lima" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm" />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{datosUsuario?.ciudad || '—'}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de empresa */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden group/card">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg group-hover/card:scale-110 transition-transform">
                    <Building className="w-4 h-4" />
                  </div>
                  Información de Empresa
                </h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Razón Social</label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">{datosUsuario?.razonSocial || '—'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre Comercial</label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">{datosUsuario?.nombreComercial || '—'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">RUC / NIF / CIF</label>
                      <div className="text-sm font-bold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">{datosUsuario?.nifCifRuc || '—'}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sector de Actividad</label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">{datosUsuario?.sectorActividad || '—'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tamaño de Empresa</label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">{datosUsuario?.tamanioEmpresa || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha - 1 columna */}
          <div className="space-y-6">
            
            {/* Estado de la cuenta */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                    <Shield className="w-4 h-4" />
                  </div>
                  Estado de Cuenta
                </h2>
              </div>
              
              <div className="p-5">
                <div className="space-y-4">
                  {[
                    { label: 'Verificación', state: datosUsuario?.verificado },
                    { label: 'Acceso Catálogo', state: datosUsuario?.acceso_catalogo },
                    { label: 'Acceso Precios', state: datosUsuario?.acceso_precios }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${item.state ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                        item.state ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.state ? 'Habilitado' : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fechas importantes */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  Actividad Reciente
                </h2>
              </div>
              
              <div className="p-5">
                <div className="space-y-4">
                  {[
                    { icon: Clock, label: 'Registro', val: datosUsuario?.fecha_registro },
                    { icon: Award, label: 'Verificación', val: datosUsuario?.fecha_verificacion },
                    { icon: Edit2, label: 'Última actualización', val: datosUsuario?.ultima_actualizacion }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                        <item.icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{formatearFechaFirestore(item.val)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aceptaciones */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-gray-100 text-gray-600 rounded-lg">
                    <Lock className="w-4 h-4" />
                  </div>
                  Aceptaciones Legales
                </h2>
              </div>
              
              <div className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      datosUsuario?.aceptaTerminosB2B ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}>
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Términos y condiciones B2B</span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      datosUsuario?.aceptaPoliticaPrivacidad ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}>
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Política de privacidad</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}