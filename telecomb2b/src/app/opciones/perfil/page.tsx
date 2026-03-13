"use client";
import { useEffect, useState, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  User, Mail, Phone, MapPin, Building, Briefcase, 
  Shield, Calendar, Edit2, Save, X, Camera,
  CheckCircle, AlertCircle, Globe, ChevronRight,
  Award, Clock, Lock
} from 'lucide-react';

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [datosUsuario, setDatosUsuario] = useState<any>(null);
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ CONFIGURACIÓN CORRECTA DE CLOUDINARY (usando tus datos)
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

  const formatearFechaFirestore = (fecha: any): string => {
    if (!fecha) return '—';
    try {
      if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
        const date = fecha.toDate();
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
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

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }

    setSubiendoFoto(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `perfiles/${usuario.uid}`);

      console.log('Subiendo a Cloudinary...', {
        cloudName: CLOUDINARY_CLOUD_NAME,
        preset: CLOUDINARY_UPLOAD_PRESET
      });

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error Cloudinary:', data);
        
        if (response.status === 401) {
          if (data.error?.message?.includes('Upload preset')) {
            throw new Error(`El upload preset "${CLOUDINARY_UPLOAD_PRESET}" no existe o no es unsigned. Verifica en Cloudinary.`);
          } else {
            throw new Error(`Error de autenticación. Verifica tu cloud name: "${CLOUDINARY_CLOUD_NAME}"`);
          }
        } else if (response.status === 404) {
          throw new Error(`Cloud name "${CLOUDINARY_CLOUD_NAME}" no encontrado`);
        } else {
          throw new Error(data.error?.message || 'Error al subir la imagen');
        }
      }
      
      if (data.secure_url) {
        console.log('✅ Imagen subida exitosamente:', data.secure_url);
        
        // Actualizar Firestore con la URL de la imagen
        const docRef = doc(db, "usuarios", usuario.uid);
        await updateDoc(docRef, {
          fotoPerfil: data.secure_url,
          ultima_actualizacion: new Date().toISOString()
        });

        // Actualizar estado local
        setFormData((prev: any) => ({ ...prev, fotoPerfil: data.secure_url }));
        setDatosUsuario((prev: any) => ({ ...prev, fotoPerfil: data.secure_url }));
        
        alert('✅ Foto de perfil actualizada correctamente');
      }
    } catch (error: any) {
      console.error("❌ Error al subir foto:", error);
      alert(error.message || "Error al subir la imagen. Intenta nuevamente.");
    } finally {
      setSubiendoFoto(false);
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    
    try {
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
      alert('✅ Cambios guardados correctamente');
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar los cambios");
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-gray-700 border-t-white animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <span>Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-medium text-white">Mi Perfil</span>
            </div>
            <h1 className="text-2xl font-semibold text-white">Mi Perfil</h1>
            <p className="text-sm text-gray-400 mt-1">Gestiona tu información personal y profesional</p>
          </div>
          
          <div className="flex items-center gap-2">
            {!editando ? (
              <button
                onClick={() => setEditando(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 text-sm font-medium rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar Perfil
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setEditando(false);
                    setFormData(datosUsuario);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors border border-gray-700"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Columna izquierda - 2 columnas */}
          <div className="lg:col-span-2 space-y-5">
            {/* Tarjeta de información básica */}
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800 shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-gray-900/50">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Información Personal
                </h2>
              </div>
              
              <div className="p-5">
                <div className="flex items-start gap-5">
                  {/* Foto de perfil */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden">
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
                        <User className="w-8 h-8 text-gray-500" />
                      </div>
                    </div>
                    {editando && (
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleSubirFoto}
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={subiendoFoto}
                          className="absolute -bottom-1 -right-1 w-7 h-7 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-lg"
                          title="Subir foto"
                        >
                          {subiendoFoto ? (
                            <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-gray-300" />
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Información principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {editando ? (
                        <input
                          type="text"
                          value={formData.nombre || ''}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                          placeholder="Nombre completo"
                          className="text-lg font-semibold bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-white focus:border-transparent outline-none w-full max-w-sm"
                        />
                      ) : (
                        <h3 className="text-lg font-semibold text-white">
                          {datosUsuario?.nombre || 'Sin nombre'}
                        </h3>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        datosUsuario?.verificado 
                          ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' 
                          : 'bg-amber-900/50 text-amber-400 border border-amber-800'
                      }`}>
                        {datosUsuario?.verificado ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        {datosUsuario?.verificado ? 'Verificado' : 'Pendiente'}
                      </span>
                      
                      <span className="px-2.5 py-1 bg-gray-800 text-gray-300 rounded-full text-xs font-medium border border-gray-700">
                        {datosUsuario?.rol || 'Cliente'}
                      </span>

                      {datosUsuario?.email && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {datosUsuario.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid de campos editables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-gray-500 mt-2.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Teléfono
                        </label>
                        {editando ? (
                          <input
                            type="tel"
                            value={formData.telefono || ''}
                            onChange={(e) => handleChange('telefono', e.target.value)}
                            placeholder="+51 999 999 999"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-white focus:border-transparent outline-none"
                          />
                        ) : (
                          <div className="text-sm text-white">
                            {datosUsuario?.telefono || '—'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Briefcase className="w-4 h-4 text-gray-500 mt-2.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Cargo / Puesto
                        </label>
                        {editando ? (
                          <input
                            type="text"
                            value={formData.cargo || ''}
                            onChange={(e) => handleChange('cargo', e.target.value)}
                            placeholder="Ej: Gerente de Compras"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-white focus:border-transparent outline-none"
                          />
                        ) : (
                          <div className="text-sm text-white">
                            {datosUsuario?.cargo || '—'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Globe className="w-4 h-4 text-gray-500 mt-2.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          País
                        </label>
                        {editando ? (
                          <select
                            value={formData.pais || ''}
                            onChange={(e) => handleChange('pais', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-white focus:border-transparent outline-none"
                          >
                            <option value="">Seleccionar</option>
                            <option value="Perú">Perú</option>
                            <option value="España">España</option>
                            <option value="México">México</option>
                            <option value="Colombia">Colombia</option>
                            <option value="Chile">Chile</option>
                            <option value="Argentina">Argentina</option>
                          </select>
                        ) : (
                          <div className="text-sm text-white">
                            {datosUsuario?.pais || '—'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gray-500 mt-2.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Ciudad
                        </label>
                        {editando ? (
                          <input
                            type="text"
                            value={formData.ciudad || ''}
                            onChange={(e) => handleChange('ciudad', e.target.value)}
                            placeholder="Ej: Lima"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-white focus:border-transparent outline-none"
                          />
                        ) : (
                          <div className="text-sm text-white">
                            {datosUsuario?.ciudad || '—'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de empresa */}
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800 shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-gray-900/50">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  Información de Empresa
                </h2>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Razón Social
                      </label>
                      <div className="text-sm text-white">
                        {datosUsuario?.razonSocial || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Nombre Comercial
                      </label>
                      <div className="text-sm text-white">
                        {datosUsuario?.nombreComercial || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        RUC / NIF / CIF
                      </label>
                      <div className="text-sm font-medium text-white">
                        {datosUsuario?.nifCifRuc || '—'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Sector de Actividad
                      </label>
                      <div className="text-sm text-white">
                        {datosUsuario?.sectorActividad || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Tamaño de Empresa
                      </label>
                      <div className="text-sm text-white">
                        {datosUsuario?.tamanioEmpresa || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha - 1 columna */}
          <div className="space-y-5">
            {/* Estado de la cuenta */}
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800 shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-gray-900/50">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  Estado de Cuenta
                </h2>
              </div>
              
              <div className="p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-gray-400">Verificación</span>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      datosUsuario?.verificado 
                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' 
                        : 'bg-amber-900/50 text-amber-400 border border-amber-800'
                    }`}>
                      {datosUsuario?.verificado ? 'Verificada' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-gray-400">Acceso Catálogo</span>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      datosUsuario?.acceso_catalogo 
                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' 
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}>
                      {datosUsuario?.acceso_catalogo ? 'Habilitado' : 'Sin acceso'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-gray-400">Acceso Precios</span>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      datosUsuario?.acceso_precios 
                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' 
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}>
                      {datosUsuario?.acceso_precios ? 'Habilitado' : 'Sin acceso'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fechas importantes */}
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800 shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-gray-900/50">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Actividad
                </h2>
              </div>
              
              <div className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">Registro</p>
                        <p className="text-xs text-gray-400">
                          {formatearFechaFirestore(datosUsuario?.fecha_registro)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
                        <Award className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">Verificación</p>
                        <p className="text-xs text-gray-400">
                          {formatearFechaFirestore(datosUsuario?.fecha_verificacion)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">Última actualización</p>
                        <p className="text-xs text-gray-400">
                          {formatearFechaFirestore(datosUsuario?.ultima_actualizacion)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Aceptaciones */}
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800 shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-gray-900/50">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  Aceptaciones
                </h2>
              </div>
              
              <div className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      datosUsuario?.aceptaTerminosB2B ? 'bg-emerald-600' : 'bg-gray-700'
                    }`}>
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs text-gray-300">Términos y condiciones B2B</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      datosUsuario?.aceptaPoliticaPrivacidad ? 'bg-emerald-600' : 'bg-gray-700'
                    }`}>
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs text-gray-300">Política de privacidad</span>
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