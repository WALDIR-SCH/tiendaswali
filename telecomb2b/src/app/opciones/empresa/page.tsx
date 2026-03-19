"use client";

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  Building, MapPin, FileText, Users, Globe, 
  Edit, Save, X, Briefcase, DollarSign,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

// ==========================================
// 1. PALETA CENTRALIZADA (MODO CLARO)
// ==========================================
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
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray900: "#111827",
  purple: "#9851F9",
  purpleDark: "#7C35E0",
  shadowHover: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  orange: "#FF6600",
  green: "#28FB4B",
  black: "#000000",
};

// ==========================================
// 2. TIPADOS & CONSTANTES DE ESTRUCTURA
// ==========================================
interface EmpresaData {
  razonSocial?: string;
  nombreComercial?: string;
  nifCifRuc?: string;
  sectorActividad?: string;
  tamanioEmpresa?: string;
  cargo?: string;
  pais?: string;
  ciudad?: string;
  direccionFiscal?: string;
  codigoPostal?: string;
  verificado?: boolean;
  acceso_precios?: boolean;
  ultima_actualizacion?: string;
  [key: string]: any;
}

const LAYOUT = {
  // Añadimos focus:ring y shadow para la interacción del input
  input: "w-full rounded-lg px-4 py-3 border focus:outline-none transition-all duration-300 focus:ring-2 focus:ring-opacity-50 focus:-translate-y-0.5 shadow-sm",
  // Añadimos hover:-translate-y-1 para que la tarjeta se eleve
  card: "rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1",
  label: "text-sm mb-2 font-medium flex items-center gap-2",
  textValue: "text-lg font-medium py-2 min-h-[44px] flex items-center border border-transparent transition-all duration-300",
  // Añadimos active:scale-95 para el efecto "click"
  button: "flex items-center justify-center gap-2 px-5 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
};

const OPCIONES_SECTOR = ["Telecomunicaciones / ISP", "Tecnología", "Retail", "Manufactura", "Servicios", "Otro"];
const OPCIONES_TAMANIO = ["Microempresa (1-10 empleados)", "Pequeña Empresa (11-50 empleados)", "Mediana Empresa (51-250 empleados)", "Gran Empresa (+250 empleados)"];
const OPCIONES_PAIS = ["Perú", "España", "México", "Colombia", "Chile", "Argentina"];

// ==========================================
// 3. CUSTOM HOOKS
// ==========================================
function useEmpresa() {
  const [datosActuales, setDatosActuales] = useState<EmpresaData | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCargando(false);
        return;
      }
      const unsubSnapshot = onSnapshot(doc(db, "usuarios", user.uid), (docSnap) => {
        if (docSnap.exists()) setDatosActuales(docSnap.data() as EmpresaData);
        setCargando(false);
      });
      return () => unsubSnapshot();
    });
    return () => unsubAuth();
  }, []);

  const actualizarEmpresa = async (nuevosDatos: EmpresaData) => {
    if (!auth.currentUser) throw new Error("No hay usuario autenticado");
    const docRef = doc(db, "usuarios", auth.currentUser.uid);
    await updateDoc(docRef, { ...nuevosDatos, ultima_actualizacion: new Date().toISOString() });
  };

  return { datosActuales, cargando, actualizarEmpresa };
}

// ==========================================
// 4. SUBCOMPONENTES (UI REUTILIZABLE)
// ==========================================
const EditableField = ({ label, value, fieldKey, isEditing, onChange, icon, placeholder, type = 'text', options = [] }: any) => {
  const colorStyles = {
    backgroundColor: C.white,
    borderColor: C.gray300,
    color: C.gray900,
  };

  return (
    <div className="group">
      <label className={LAYOUT.label} style={{ color: C.gray600 }}>
        <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>
        {label}
      </label>
      
      <div className={`transition-all duration-500 ease-in-out ${isEditing ? 'opacity-100 max-h-40' : 'opacity-100 max-h-20'}`}>
        {!isEditing ? (
          <div className={`${LAYOUT.textValue} group-hover:translate-x-1`} style={{ color: C.gray900 }}>
            {value ? value : <span style={{ color: C.gray400, fontStyle: 'italic' }}>No especificado</span>}
          </div>
        ) : type === 'select' ? (
          <select value={value} onChange={(e) => onChange(fieldKey as string, e.target.value)} className={LAYOUT.input} style={colorStyles}>
            <option value="">Seleccionar...</option>
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(fieldKey as string, e.target.value)}
            className={`${LAYOUT.input} min-h-[100px] resize-none`}
            style={colorStyles}
            placeholder={placeholder}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(fieldKey as string, e.target.value)}
            className={LAYOUT.input}
            style={colorStyles}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
};

// ==========================================
// 5. COMPONENTE PRINCIPAL
// ==========================================
export default function EmpresaPage() {
  const { datosActuales, cargando, actualizarEmpresa } = useEmpresa();
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState<EmpresaData>({});
  
  // Estado para las notificaciones dinámicas (Toasts)
  const [notificacion, setNotificacion] = useState<{visible: boolean, mensaje: string, tipo: 'success' | 'error'}>({
    visible: false, mensaje: '', tipo: 'success'
  });

  useEffect(() => {
    if (datosActuales && !editando) setFormData(datosActuales);
  }, [datosActuales, editando]);

  // Función para mostrar el Toast temporalmente
  const mostrarNotificacion = (mensaje: string, tipo: 'success' | 'error') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ visible: false, mensaje: '', tipo: 'success' }), 3500);
  };

  const handleSave = async () => {
    try {
      setGuardando(true);
      await actualizarEmpresa(formData);
      setEditando(false);
      mostrarNotificacion('¡Datos actualizados correctamente!', 'success');
    } catch (error) {
      console.error("Error al guardar:", error);
      mostrarNotificacion('Ocurrió un error al guardar los cambios.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-white">
        <Loader2 className="animate-spin" size={48} color={C.purple} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative relative overflow-hidden pb-10">
      
      {/* --- TOAST NOTIFICATION DINÁMICO --- */}
      <div 
        className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg transition-all duration-500 flex items-center gap-2 ${
          notificacion.visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'
        }`}
        style={{ 
          backgroundColor: notificacion.tipo === 'success' ? C.green : C.orange,
          color: notificacion.tipo === 'success' ? C.black : C.white 
        }}
      >
        {notificacion.tipo === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span className="font-semibold">{notificacion.mensaje}</span>
      </div>

      {/* --- ENCABEZADO --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold transition-colors" style={{ color: C.gray900 }}>Empresa</h1>
          <p className="mt-1" style={{ color: C.gray500 }}>Gestiona la información y configuración de tu organización</p>
        </div>
        <div className="flex gap-3">
          {!editando ? (
            <button 
              onClick={() => setEditando(true)} 
              className={LAYOUT.button} 
              style={{ backgroundColor: C.purple, color: C.white }}
            >
              <Edit size={18} className="transition-transform group-hover:rotate-12" /> 
              <span>Editar Empresa</span>
            </button>
          ) : (
            <>
              <button 
                disabled={guardando} 
                onClick={handleSave} 
                className={`${LAYOUT.button} overflow-hidden relative`} 
                style={{ backgroundColor: C.green, color: C.black }}
              >
                {guardando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} className="animate-bounce-short" />
                )}
                <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
              <button 
                disabled={guardando} 
                onClick={() => { setEditando(false); setFormData(datosActuales || {}); }} 
                className={LAYOUT.button} 
                style={{ backgroundColor: C.gray200, color: C.gray900 }}
              >
                <X size={18} className="transition-transform hover:rotate-90" /> 
                <span>Cancelar</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* --- SECCIÓN: INFORMACIÓN BÁSICA --- */}
          <div className={`${LAYOUT.card} hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]`} style={{ backgroundColor: C.white, borderColor: C.gray200, boxShadow: C.shadow }}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: C.gray200 }}>
              <div className="p-2 rounded-lg transition-transform hover:scale-110" style={{ backgroundColor: `${C.purple}1A`, color: C.purple }}>
                <Building size={24} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: C.gray900 }}>Información Básica</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <EditableField label="Razón Social" value={formData.razonSocial || ''} fieldKey="razonSocial" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} />
                <EditableField label="Nombre Comercial" value={formData.nombreComercial || ''} fieldKey="nombreComercial" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} />
                <EditableField label="NIF / CIF / RUC" value={formData.nifCifRuc || ''} fieldKey="nifCifRuc" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} icon={<FileText size={16} />} />
              </div>
              <div className="space-y-5">
                <EditableField label="Sector" value={formData.sectorActividad || ''} fieldKey="sectorActividad" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} type="select" options={OPCIONES_SECTOR} />
                <EditableField label="Tamaño" value={formData.tamanioEmpresa || ''} fieldKey="tamanioEmpresa" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} type="select" options={OPCIONES_TAMANIO} icon={<Users size={16} />} />
                <EditableField label="Cargo Contacto" value={formData.cargo || ''} fieldKey="cargo" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} icon={<Briefcase size={16} />} />
              </div>
            </div>
          </div>

          {/* --- SECCIÓN: UBICACIÓN --- */}
          <div className={`${LAYOUT.card} hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]`} style={{ backgroundColor: C.white, borderColor: C.gray200, boxShadow: C.shadow }}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: C.gray200 }}>
              <div className="p-2 rounded-lg transition-transform hover:scale-110" style={{ backgroundColor: `${C.purple}1A`, color: C.purple }}>
                <MapPin size={24} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: C.gray900 }}>Ubicación</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <EditableField label="País" value={formData.pais || ''} fieldKey="pais" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} type="select" options={OPCIONES_PAIS} />
                <EditableField label="Ciudad" value={formData.ciudad || ''} fieldKey="ciudad" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} />
              </div>
              <div className="space-y-5">
                <EditableField label="Dirección Fiscal" value={formData.direccionFiscal || ''} fieldKey="direccionFiscal" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} type="textarea" />
                <EditableField label="Código Postal" value={formData.codigoPostal || ''} fieldKey="codigoPostal" isEditing={editando} onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))} />
              </div>
            </div>
          </div>
        </div>

        {/* --- PANEL LATERAL --- */}
        <div className="space-y-8">
          
          {/* Resumen */}
          <div className={`${LAYOUT.card} hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]`} style={{ backgroundColor: C.white, borderColor: C.gray200, boxShadow: C.shadow }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: C.gray900 }}>Estado de la Cuenta</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg border transition-colors hover:bg-gray-100" style={{ backgroundColor: C.gray50, borderColor: C.gray200 }}>
                <span className="text-sm font-medium" style={{ color: C.gray600 }}>Verificación</span>
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border transition-all duration-300 hover:scale-105 cursor-default"
                  style={{ 
                    backgroundColor: datosActuales?.verificado ? `${C.green}1A` : `${C.orange}1A`,
                    color: datosActuales?.verificado ? C.green : C.orange,
                    borderColor: datosActuales?.verificado ? `${C.green}4D` : `${C.orange}4D`
                  }}
                >
                  {datosActuales?.verificado ? 'Verificada' : 'Pendiente'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border transition-colors hover:bg-gray-100" style={{ backgroundColor: C.gray50, borderColor: C.gray200 }}>
                <span className="text-sm font-medium" style={{ color: C.gray600 }}>Precios</span>
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border transition-all duration-300 hover:scale-105 cursor-default"
                  style={{ 
                    backgroundColor: datosActuales?.acceso_precios ? `${C.green}1A` : `${C.orange}1A`,
                    color: datosActuales?.acceso_precios ? C.green : C.orange,
                    borderColor: datosActuales?.acceso_precios ? `${C.green}4D` : `${C.orange}4D`
                  }}
                >
                  {datosActuales?.acceso_precios ? 'Habilitado' : 'Bloqueado'}
                </span>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className={`${LAYOUT.card} hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]`} style={{ backgroundColor: C.white, borderColor: C.gray200, boxShadow: C.shadow }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: C.gray900 }}>Documentación</h3>
            <div className="space-y-3">
              {[
                { label: 'Certificado Digital', state: datosActuales?.verificado },
                { label: 'RUC Validado', state: datosActuales?.verificado },
              ].map((doc, i) => (
                <button key={i} className="w-full group flex items-center justify-between p-3.5 border rounded-lg transition-all duration-200 hover:bg-gray-100 active:scale-95" style={{ backgroundColor: C.gray50, borderColor: C.gray200 }}>
                  <span className="text-sm font-medium transition-transform group-hover:translate-x-1" style={{ color: C.gray700 }}>{doc.label}</span>
                  {doc.state ? <CheckCircle size={18} color={C.green} className="transition-transform group-hover:scale-110" /> : <AlertCircle size={18} color={C.orange} className="transition-transform group-hover:scale-110" />}
                </button>
              ))}
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className={`${LAYOUT.card} hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]`} style={{ backgroundColor: C.white, borderColor: C.gray200, boxShadow: C.shadow }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: C.gray900 }}>Acciones Rápidas</h3>
            <div className="space-y-3">
              <button 
                className={`${LAYOUT.button} w-full group`}
                style={{ backgroundColor: `${C.purple}1A`, borderColor: `${C.purple}4D`, color: C.purple, borderWidth: '1px' }}
              >
                <Globe size={18} className="transition-transform group-hover:rotate-180 duration-500" /> 
                <span>Solicitar Verificación</span>
              </button>
              <button 
                className={`${LAYOUT.button} w-full group`}
                style={{ backgroundColor: C.gray100, borderColor: C.gray300, color: C.gray900, borderWidth: '1px' }}
              >
                <DollarSign size={18} className="transition-transform group-hover:scale-125" /> 
                <span>Solicitar Acceso</span>
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}