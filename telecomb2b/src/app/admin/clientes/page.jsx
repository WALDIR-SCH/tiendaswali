"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where,
  Timestamp 
} from "firebase/firestore";
import { 
  Users, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Search, 
  MoreHorizontal,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  FileText
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function ClientesAdmin() {
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos", "pendiente", "verificado", "rechazado"

  // Cargar clientes y empresas
  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar usuarios
      const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
      const usuariosData = usuariosSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // Cargar empresas
      const empresasSnapshot = await getDocs(collection(db, "empresas"));
      const empresasData = empresasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Combinar datos
      const datosCombinados = usuariosData.map(usuario => {
        const empresaRelacionada = empresasData.find(emp => 
          emp.adminId === usuario.id || 
          emp.emailPrincipal === usuario.email
        );
        
        return {
          ...usuario,
          empresaData: empresaRelacionada || null
        };
      });

      setClientes(datosCombinados);
      setEmpresas(empresasData);
      
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    cargarDatos(); 
  }, []);

  // VERIFICAR EMPRESA (Acción principal B2B)
  const verificarEmpresa = async (userId, empresaId) => {
    try {
      // 1. Actualizar usuario
      const userRef = doc(db, "usuarios", userId);
      await updateDoc(userRef, {
        estado: "verificado",
        verificado: true,
        acceso_catalogo: true,
        rol: "cliente", // Cambiar de "cliente_pendiente" a "cliente"
        fecha_verificacion: Timestamp.now(),
        verificadoPor: "admin_id_actual" // Aquí debes poner el ID del admin logueado
      });

      // 2. Actualizar empresa si existe
      if (empresaId) {
        const empresaRef = doc(db, "empresas", empresaId);
        await updateDoc(empresaRef, {
          estado: "activo",
          nivelAcceso: "basico",
          fecha_verificacion: Timestamp.now(),
          verificadoPor: "admin_id_actual",
          categoriaCliente: "nuevo"
        });
      }

      // 3. Actualizar estado local
      setClientes(prev => prev.map(c => 
        c.id === userId 
          ? { 
              ...c, 
              estado: "verificado", 
              verificado: true, 
              acceso_catalogo: true, 
              rol: "cliente",
              empresaData: c.empresaData ? {
                ...c.empresaData,
                estado: "activo",
                nivelAcceso: "basico"
              } : null
            } 
          : c
      ));

      // 4. Cerrar modal si está abierto
      setShowModal(false);
      setSelectedCliente(null);

      // 5. Mostrar notificación
      toast.success("Empresa verificada exitosamente. Acceso B2B habilitado.");

      // 6. Opcional: Enviar email de confirmación (aquí puedes integrar tu servicio de email)

    } catch (error) {
      console.error("Error verificando empresa:", error);
      toast.error("Error al verificar la empresa");
    }
  };

  // RECHAZAR EMPRESA
  const rechazarEmpresa = async (userId, motivo) => {
    try {
      const userRef = doc(db, "usuarios", userId);
      await updateDoc(userRef, {
        estado: "rechazado",
        verificado: false,
        acceso_catalogo: false,
        motivoRechazo: motivo
      });

      setClientes(prev => prev.map(c => 
        c.id === userId 
          ? { ...c, estado: "rechazado", verificado: false, acceso_catalogo: false } 
          : c
      ));

      setShowModal(false);
      toast.error(`Empresa rechazada. Motivo: ${motivo}`);
      
    } catch (error) {
      console.error("Error rechazando empresa:", error);
      toast.error("Error al rechazar la empresa");
    }
  };

  // SUSPENDER EMPRESA
  const suspenderEmpresa = async (userId) => {
    try {
      const userRef = doc(db, "usuarios", userId);
      await updateDoc(userRef, {
        acceso_catalogo: false,
        estado: "suspendido"
      });

      setClientes(prev => prev.map(c => 
        c.id === userId 
          ? { ...c, acceso_catalogo: false, estado: "suspendido" } 
          : c
      ));

      toast.error("Acceso B2B suspendido para esta empresa");
      
    } catch (error) {
      console.error("Error suspendiendo empresa:", error);
      toast.error("Error al suspender acceso");
    }
  };

  // ACTIVAR EMPRESA SUSPENDIDA
  const activarEmpresa = async (userId) => {
    try {
      const userRef = doc(db, "usuarios", userId);
      await updateDoc(userRef, {
        acceso_catalogo: true,
        estado: "verificado"
      });

      setClientes(prev => prev.map(c => 
        c.id === userId 
          ? { ...c, acceso_catalogo: true, estado: "verificado" } 
          : c
      ));

      toast.success("Acceso B2B reactivado");
      
    } catch (error) {
      console.error("Error activando empresa:", error);
      toast.error("Error al reactivar acceso");
    }
  };

  // Filtrar datos
  const filteredData = clientes.filter(c => {
    // Filtro por búsqueda
    const matchesSearch = 
      (c.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       c.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       c.nifCifRuc?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.empresaData?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro por estado
    const matchesEstado = 
      filtroEstado === "todos" ? true :
      filtroEstado === "pendiente" ? c.estado === "pendiente_verificacion" :
      filtroEstado === "verificado" ? c.estado === "verificado" :
      filtroEstado === "rechazado" ? c.estado === "rechazado" :
      filtroEstado === "suspendido" ? c.estado === "suspendido" : true;

    return matchesSearch && matchesEstado;
  });

  // Función para abrir modal de detalles
  const abrirDetalles = (cliente) => {
    setSelectedCliente(cliente);
    setShowModal(true);
  };

  // Cambiar rol (manteniendo tu función original)
  const cambiarRol = async (id, nuevoRol) => {
    try {
      const userRef = doc(db, "usuarios", id);
      await updateDoc(userRef, { rol: nuevoRol });
      setClientes(prev => prev.map(c => c.id === id ? { ...c, rol: nuevoRol } : c));
      toast.success(`Rol cambiado a ${nuevoRol}`);
    } catch (error) {
      toast.error("Error en la actualización de privilegios.");
    }
  };

  // Estadísticas
  const stats = {
    total: clientes.length,
    pendientes: clientes.filter(c => c.estado === "pendiente_verificacion").length,
    verificados: clientes.filter(c => c.estado === "verificado").length,
    rechazados: clientes.filter(c => c.estado === "rechazado").length,
    suspendidos: clientes.filter(c => c.estado === "suspendido").length,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] antialiased font-sans text-slate-900">
      {/* Toaster para notificaciones */}
      <div className="toast-container">
        {/* Esto requiere que tengas react-hot-toast instalado */}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* HEADER MEJORADO */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <ShieldCheck size={16} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                Verificación B2B • Telecom Sector
              </span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              Gestión de <span className="font-light text-slate-400 italic">Clientes Empresariales</span>
            </h1>
            <p className="text-slate-500 text-sm">
              Verifica empresas, habilita acceso B2B y gestiona privilegios
            </p>
          </div>

          {/* ESTADÍSTICAS RÁPIDAS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Total</div>
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase text-amber-600 tracking-widest">Pendientes</div>
              <div className="text-2xl font-bold text-amber-700">{stats.pendientes}</div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">Verificados</div>
              <div className="text-2xl font-bold text-emerald-700">{stats.verificados}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-xl border border-red-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase text-red-600 tracking-widest">Rechazados</div>
              <div className="text-2xl font-bold text-red-700">{stats.rechazados}</div>
            </div>
          </div>
        </header>

        {/* CONTROLES DE FILTRO MEJORADOS */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar por empresa, RUC, email, razón social..."
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all w-full shadow-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all shadow-sm"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes de verificación</option>
              <option value="verificado">Verificados (Activos)</option>
              <option value="rechazado">Rechazados</option>
              <option value="suspendido">Suspendidos</option>
            </select>
            
            <button 
              onClick={cargarDatos}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              Actualizar
            </button>
          </div>
        </div>

        {/* TABLA MEJORADA */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02),0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Empresa / Representante</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Identificación</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Estado B2B</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Acceso</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-24 text-center">
                      <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-full animate-pulse">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          Cargando base de datos empresarial...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center">
                      <div className="text-slate-400">
                        <Building2 className="mx-auto mb-3" size={48} strokeWidth={1} />
                        <p className="font-medium">No se encontraron empresas</p>
                        <p className="text-sm mt-1">Intenta con otros filtros de búsqueda</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.map((c) => (
                  <tr key={c.id} className="group hover:bg-slate-50/60 transition-colors duration-200">
                    {/* COLUMNA EMPRESA Y REPRESENTANTE */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`
                          h-12 w-12 rounded-xl border flex items-center justify-center transition-all duration-300
                          ${c.estado === "verificado" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                            c.estado === "pendiente_verificacion" ? "bg-amber-50 border-amber-100 text-amber-600" :
                            c.estado === "rechazado" ? "bg-red-50 border-red-100 text-red-600" :
                            "bg-slate-50 border-slate-100 text-slate-400"}
                        `}>
                          <Building2 size={22} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 leading-none mb-1">
                            {c.empresa || c.razonSocial || "Cliente Independiente"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {c.nombre || "Sin representante"} • {c.cargo || "Sin cargo"}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter mt-1">
                            ID: {c.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* COLUMNA IDENTIFICACIÓN */}
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-slate-300" />
                          <span className="text-sm font-medium">{c.email}</span>
                        </div>
                        {c.nifCifRuc && (
                          <div className="text-xs font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            {c.nifCifRuc}
                          </div>
                        )}
                        {c.empresaData?.sectorActividad && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            {c.empresaData.sectorActividad}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* COLUMNA ESTADO B2B */}
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className={`
                          inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border
                          ${c.estado === "verificado" ? 
                            "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            c.estado === "pendiente_verificacion" ? 
                            "bg-amber-50 text-amber-700 border-amber-200" :
                            c.estado === "rechazado" ? 
                            "bg-red-50 text-red-700 border-red-200" :
                            "bg-slate-50 text-slate-600 border-slate-200"
                          }
                        `}>
                          {c.estado === "verificado" && <CheckCircle size={12} />}
                          {c.estado === "pendiente_verificacion" && <Clock size={12} />}
                          {c.estado === "rechazado" && <XCircle size={12} />}
                          {c.estado || "pendiente"}
                        </span>
                        
                        {c.acceso_catalogo !== undefined && (
                          <span className={`
                            text-[9px] font-bold uppercase tracking-wider
                            ${c.acceso_catalogo ? "text-emerald-600" : "text-red-600"}
                          `}>
                            {c.acceso_catalogo ? "✅ Catálogo activo" : "❌ Sin acceso"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* COLUMNA ACCESO */}
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <span className={`
                          inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border
                          ${c.rol === 'admin' ? 
                            "bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-200" : 
                            "bg-white text-slate-600 border-slate-200"
                          }
                        `}>
                          {c.rol === 'admin' && <ShieldCheck size={12} />}
                          {c.rol?.replace("_pendiente", "") || "cliente"}
                        </span>
                      </div>
                    </td>

                    {/* COLUMNA ACCIONES MEJORADA */}
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        {/* BOTÓN VER DETALLES */}
                        <button 
                          onClick={() => abrirDetalles(c)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>

                        {/* ACCIONES SEGÚN ESTADO */}
                        {c.estado === "pendiente_verificacion" && (
                          <button 
                            onClick={() => verificarEmpresa(c.id, c.empresaData?.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                          >
                            Verificar
                          </button>
                        )}
                        
                        {c.estado === "verificado" && c.acceso_catalogo && (
                          <button 
                            onClick={() => suspenderEmpresa(c.id)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                          >
                            Suspender
                          </button>
                        )}
                        
                        {c.estado === "suspendido" && (
                          <button 
                            onClick={() => activarEmpresa(c.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                          >
                            Reactivar
                          </button>
                        )}

                        {/* SELECTOR DE ROL (mantenido) */}
                        <select 
                          onChange={(e) => cambiarRol(c.id, e.target.value)}
                          value={c.rol}
                          className="text-[10px] font-bold uppercase tracking-widest bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all cursor-pointer text-slate-500 hover:text-slate-900 ml-2"
                        >
                          <option value="cliente_pendiente">Pendiente</option>
                          <option value="cliente">Cliente</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE DETALLES */}
        {showModal && selectedCliente && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                {/* HEADER MODAL */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedCliente.empresa || selectedCliente.razonSocial}
                    </h3>
                    <p className="text-slate-500 text-sm">Detalles completos de la empresa</p>
                  </div>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* CONTENIDO MODAL */}
                <div className="space-y-6">
                  {/* SECCIÓN DATOS BÁSICOS */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                      Información Básica
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500">Representante</label>
                        <p className="font-medium">{selectedCliente.nombre || "No especificado"}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Cargo</label>
                        <p className="font-medium">{selectedCliente.cargo || "No especificado"}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Email</label>
                        <p className="font-medium">{selectedCliente.email}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Teléfono</label>
                        <p className="font-medium">{selectedCliente.telefono || "No especificado"}</p>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN DATOS EMPRESARIALES */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                      Datos Empresariales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500">Razón Social</label>
                        <p className="font-medium">{selectedCliente.razonSocial || "No especificado"}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">NIF/CIF/RUC</label>
                        <p className="font-medium">{selectedCliente.nifCifRuc || "No especificado"}</p>
                      </div>
                      {selectedCliente.empresaData && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-slate-500">Sector</label>
                            <p className="font-medium">{selectedCliente.empresaData.sectorActividad || "No especificado"}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-500">Tamaño Empresa</label>
                            <p className="font-medium">{selectedCliente.empresaData.tamanioEmpresa || "No especificado"}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* SECCIÓN ESTADO */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                      Estado y Acceso
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <label className="text-xs font-medium text-slate-500 block mb-1">Estado B2B</label>
                        <span className={`
                          inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest
                          ${selectedCliente.estado === "verificado" ? "bg-emerald-100 text-emerald-700" :
                            selectedCliente.estado === "pendiente_verificacion" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"}
                        `}>
                          {selectedCliente.estado || "pendiente"}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <label className="text-xs font-medium text-slate-500 block mb-1">Acceso Catálogo</label>
                        <span className={`font-bold ${selectedCliente.acceso_catalogo ? "text-emerald-600" : "text-red-600"}`}>
                          {selectedCliente.acceso_catalogo ? "ACTIVO" : "INACTIVO"}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <label className="text-xs font-medium text-slate-500 block mb-1">Rol</label>
                        <span className="font-bold text-slate-700">
                          {selectedCliente.rol?.replace("_pendiente", "") || "cliente"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN ACCIONES */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                      Acciones
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {selectedCliente.estado === "pendiente_verificacion" && (
                        <>
                          <button 
                            onClick={() => {
                              verificarEmpresa(selectedCliente.id, selectedCliente.empresaData?.id);
                              setShowModal(false);
                            }}
                            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle size={16} />
                            Verificar Empresa
                          </button>
                          <button 
                            onClick={() => {
                              const motivo = prompt("Motivo del rechazo:");
                              if (motivo) rechazarEmpresa(selectedCliente.id, motivo);
                            }}
                            className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                          >
                            <XCircle size={16} />
                            Rechazar
                          </button>
                        </>
                      )}
                      
                      {selectedCliente.estado === "verificado" && (
                        <button 
                          onClick={() => {
                            suspenderEmpresa(selectedCliente.id);
                            setShowModal(false);
                          }}
                          className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                          Suspender Acceso
                        </button>
                      )}
                      
                      {selectedCliente.estado === "suspendido" && (
                        <button 
                          onClick={() => {
                            activarEmpresa(selectedCliente.id);
                            setShowModal(false);
                          }}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          Reactivar Acceso
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          // Aquí puedes implementar envío de email
                          alert("Función de envío de email por implementar");
                        }}
                        className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                      >
                        <Send size={16} />
                        Enviar Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 border-t border-slate-200 pt-8">
          <div className="flex items-center gap-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">
              Telecom SAC © 2026 • Sistema B2B
            </p>
            <div className="flex items-center gap-2 text-emerald-500">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase">
                {filteredData.length} empresas en vista
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="text-[10px] font-bold uppercase tracking-widest hover:text-blue-600 transition-colors">
              Exportar CSV
            </button>
            <button className="text-[10px] font-bold uppercase tracking-widest hover:text-blue-600 transition-colors">
              Historial
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}