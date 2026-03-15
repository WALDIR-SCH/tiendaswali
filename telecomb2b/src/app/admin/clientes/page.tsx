"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import {
  Users,
  ShieldCheck,
  Building2,
  Mail,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  RefreshCw,
  AlertTriangle,
  Package,
  TrendingUp,
  Ban,
  PlayCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-hot-toast";

/* ─── TIPOS ─── */
interface EmpresaData {
  id?: string;
  adminId?: string;
  emailPrincipal?: string;
  sectorActividad?: string;
  tamanioEmpresa?: string;
  estado?: string;
  nivelAcceso?: string;
  razonSocial?: string;
}

interface Cliente {
  id: string;
  empresa?: string;
  razonSocial?: string;
  email?: string;
  nombre?: string;
  cargo?: string;
  telefono?: string;
  nifCifRuc?: string;
  estado?: string;
  verificado?: boolean;
  acceso_catalogo?: boolean;
  rol?: string;
  empresaData?: EmpresaData | null;
}

/* ─── PALETA ─── */
const C = {
  purple:     "#7c3aed",
  purpleLight:"#ede9fe",
  purpleMid:  "#8b5cf6",
  green:      "#28FB4B",
  greenDark:  "#16a34a",
  greenLight: "#f0fdf4",
  orange:     "#FF6600",
  orangeLight:"#fff7ed",
  red:        "#dc2626",
  redLight:   "#fef2f2",
  yellow:     "#F6FA00",
  white:      "#ffffff",
  gray50:     "#f9fafb",
  gray100:    "#f3f4f6",
  gray200:    "#e5e7eb",
  gray300:    "#d1d5db",
  gray500:    "#6b7280",
  gray700:    "#374151",
  gray900:    "#111827",
};

/* ─── BADGE ESTADO ─── */
const EstadoBadge = ({ estado }: { estado?: string }) => {
  const map: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
    verificado: {
      bg: C.greenLight, text: C.greenDark, border: "#bbf7d0",
      icon: <CheckCircle size={11} />, label: "Verificado"
    },
    pendiente_verificacion: {
      bg: "#fffbeb", text: "#b45309", border: "#fde68a",
      icon: <Clock size={11} />, label: "Pendiente"
    },
    rechazado: {
      bg: C.redLight, text: C.red, border: "#fecaca",
      icon: <XCircle size={11} />, label: "Rechazado"
    },
    suspendido: {
      bg: C.orangeLight, text: C.orange, border: "#fed7aa",
      icon: <Ban size={11} />, label: "Suspendido"
    },
  };
  const cfg = map[estado || ""] || {
    bg: C.gray100, text: C.gray500, border: C.gray200,
    icon: <AlertTriangle size={11} />, label: estado || "—"
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      {cfg.icon}{cfg.label}
    </span>
  );
};

/* ─── MODAL DETALLES ─── */
const ModalDetalle = ({
  cliente,
  onClose,
  onVerificar,
  onRechazar,
  onSuspender,
  onActivar,
}: {
  cliente: Cliente;
  onClose: () => void;
  onVerificar: (userId: string, empresaId?: string) => void;
  onRechazar: (userId: string, motivo: string) => void;
  onSuspender: (userId: string) => void;
  onActivar: (userId: string) => void;
}) => {
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [showRechazo, setShowRechazo] = useState(false);

  const Field = ({ label, value }: { label: string; value?: string }) => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: C.gray500 }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: value ? C.gray900 : C.gray300 }}>
        {value || "No especificado"}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl"
        style={{ border: `1px solid ${C.gray200}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: C.gray100 }}>
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: C.purpleLight }}
            >
              <Building2 size={20} style={{ color: C.purple }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: C.gray900 }}>
                {cliente.empresa || cliente.razonSocial || "Empresa"}
              </h3>
              <p className="text-xs" style={{ color: C.gray500 }}>Detalles del cliente empresarial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: C.gray500 }}
            onMouseEnter={e => (e.currentTarget.style.background = C.gray100)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Datos básicos */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-4" style={{ color: C.purple }}>Información de contacto</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Representante" value={cliente.nombre} />
              <Field label="Cargo" value={cliente.cargo} />
              <Field label="Email" value={cliente.email} />
              <Field label="Teléfono" value={cliente.telefono} />
            </div>
          </div>

          <div className="border-t" style={{ borderColor: C.gray100 }} />

          {/* Datos empresa */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-4" style={{ color: C.purple }}>Datos empresariales</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Razón Social" value={cliente.razonSocial || cliente.empresaData?.razonSocial} />
              <Field label="RUC / NIF / CIF" value={cliente.nifCifRuc} />
              <Field label="Sector" value={cliente.empresaData?.sectorActividad} />
              <Field label="Tamaño" value={cliente.empresaData?.tamanioEmpresa} />
            </div>
          </div>

          <div className="border-t" style={{ borderColor: C.gray100 }} />

          {/* Estado */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-4" style={{ color: C.purple }}>Estado actual</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ background: C.gray50, border: `1px solid ${C.gray200}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: C.gray500 }}>Estado B2B</p>
                <EstadoBadge estado={cliente.estado} />
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: C.gray50, border: `1px solid ${C.gray200}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: C.gray500 }}>Catálogo</p>
                <span className="text-sm font-bold" style={{ color: cliente.acceso_catalogo ? C.greenDark : C.red }}>
                  {cliente.acceso_catalogo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: C.gray50, border: `1px solid ${C.gray200}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: C.gray500 }}>Rol</p>
                <span className="text-sm font-bold" style={{ color: C.gray900 }}>
                  {cliente.rol?.replace("_pendiente", "") || "cliente"}
                </span>
              </div>
            </div>
          </div>

          {/* Formulario rechazo */}
          {showRechazo && (
            <div className="rounded-xl p-4" style={{ background: C.redLight, border: `1px solid #fecaca` }}>
              <p className="text-xs font-bold mb-2" style={{ color: C.red }}>Motivo del rechazo</p>
              <textarea
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                placeholder="Describe el motivo del rechazo..."
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                style={{ border: `1px solid #fecaca`, background: C.white }}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { if (motivoRechazo.trim()) { onRechazar(cliente.id, motivoRechazo); setShowRechazo(false); } }}
                  disabled={!motivoRechazo.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition-colors"
                  style={{ background: C.red }}
                >
                  Confirmar rechazo
                </button>
                <button
                  onClick={() => setShowRechazo(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                  style={{ background: C.gray100, color: C.gray700 }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 pt-2">
            {cliente.estado === "pendiente_verificacion" && (
              <>
                <button
                  onClick={() => { onVerificar(cliente.id, cliente.empresaData?.id); onClose(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                  style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleMid})`, boxShadow: `0 4px 14px ${C.purple}40` }}
                >
                  <CheckCircle size={15} /> Verificar empresa
                </button>
                <button
                  onClick={() => setShowRechazo(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-colors"
                  style={{ background: C.red }}
                >
                  <XCircle size={15} /> Rechazar
                </button>
              </>
            )}
            {cliente.estado === "verificado" && (
              <button
                onClick={() => { onSuspender(cliente.id); onClose(); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-colors"
                style={{ background: C.orange }}
              >
                <Ban size={15} /> Suspender acceso
              </button>
            )}
            {cliente.estado === "suspendido" && (
              <button
                onClick={() => { onActivar(cliente.id); onClose(); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleMid})`, boxShadow: `0 4px 14px ${C.purple}40` }}
              >
                <PlayCircle size={15} /> Reactivar acceso
              </button>
            )}
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ml-auto"
              style={{ background: C.gray100, color: C.gray700, border: `1px solid ${C.gray200}` }}
            >
              <Send size={14} /> Enviar email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════ */
export default function ClientesAdmin() {
  const [clientes,        setClientes]        = useState<Cliente[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showModal,       setShowModal]       = useState(false);
  const [filtroEstado,    setFiltroEstado]    = useState("todos");

  /* ─── CARGAR DATOS ─── */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [usuariosSnap, empresasSnap] = await Promise.all([
        getDocs(collection(db, "usuarios")),
        getDocs(collection(db, "empresas")),
      ]);
      const empresasData: EmpresaData[] = empresasSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmpresaData));
      const combinados: Cliente[] = usuariosSnap.docs.map(d => {
        const u = { id: d.id, ...d.data() } as Cliente;
        const emp = empresasData.find(e => e.adminId === u.id || e.emailPrincipal === u.email) || null;
        return { ...u, empresaData: emp };
      });
      setClientes(combinados);
    } catch {
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  /* ─── ACCIONES ─── */
  const verificarEmpresa = async (userId: string, empresaId?: string) => {
    try {
      await updateDoc(doc(db, "usuarios", userId), {
        estado: "verificado", verificado: true, acceso_catalogo: true,
        rol: "cliente", fecha_verificacion: Timestamp.now(),
      });
      if (empresaId) {
        await updateDoc(doc(db, "empresas", empresaId), {
          estado: "activo", nivelAcceso: "basico", fecha_verificacion: Timestamp.now(),
        });
      }
      setClientes(p => p.map(c => c.id === userId
        ? { ...c, estado: "verificado", verificado: true, acceso_catalogo: true, rol: "cliente",
            empresaData: c.empresaData ? { ...c.empresaData, estado: "activo", nivelAcceso: "basico" } : null }
        : c));
      toast.success("✅ Empresa verificada. Acceso B2B habilitado.");
    } catch { toast.error("Error al verificar la empresa"); }
  };

  const rechazarEmpresa = async (userId: string, motivo: string) => {
    try {
      await updateDoc(doc(db, "usuarios", userId), {
        estado: "rechazado", verificado: false, acceso_catalogo: false, motivoRechazo: motivo,
      });
      setClientes(p => p.map(c => c.id === userId
        ? { ...c, estado: "rechazado", verificado: false, acceso_catalogo: false } : c));
      setShowModal(false);
      toast.error(`Empresa rechazada`);
    } catch { toast.error("Error al rechazar la empresa"); }
  };

  const suspenderEmpresa = async (userId: string) => {
    try {
      await updateDoc(doc(db, "usuarios", userId), { acceso_catalogo: false, estado: "suspendido" });
      setClientes(p => p.map(c => c.id === userId
        ? { ...c, acceso_catalogo: false, estado: "suspendido" } : c));
      toast("Acceso B2B suspendido", { icon: "⚠️" });
    } catch { toast.error("Error al suspender acceso"); }
  };

  const activarEmpresa = async (userId: string) => {
    try {
      await updateDoc(doc(db, "usuarios", userId), { acceso_catalogo: true, estado: "verificado" });
      setClientes(p => p.map(c => c.id === userId
        ? { ...c, acceso_catalogo: true, estado: "verificado" } : c));
      toast.success("Acceso B2B reactivado");
    } catch { toast.error("Error al reactivar acceso"); }
  };

  const cambiarRol = async (id: string, nuevoRol: string) => {
    try {
      await updateDoc(doc(db, "usuarios", id), { rol: nuevoRol });
      setClientes(p => p.map(c => c.id === id ? { ...c, rol: nuevoRol } : c));
      toast.success(`Rol cambiado a ${nuevoRol}`);
    } catch { toast.error("Error actualizando rol"); }
  };

  /* ─── FILTROS ─── */
  const filteredData = clientes.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      c.empresa?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.razonSocial?.toLowerCase().includes(term) ||
      c.nifCifRuc?.toLowerCase().includes(term) ||
      c.empresaData?.razonSocial?.toLowerCase().includes(term);

    const matchEstado =
      filtroEstado === "todos" ? true :
      filtroEstado === "pendiente" ? c.estado === "pendiente_verificacion" :
      filtroEstado === "verificado" ? c.estado === "verificado" :
      filtroEstado === "rechazado" ? c.estado === "rechazado" :
      filtroEstado === "suspendido" ? c.estado === "suspendido" : true;

    return matchSearch && matchEstado;
  });

  /* ─── STATS ─── */
  const stats = {
    total:      clientes.length,
    pendientes: clientes.filter(c => c.estado === "pendiente_verificacion").length,
    verificados:clientes.filter(c => c.estado === "verificado").length,
    rechazados: clientes.filter(c => c.estado === "rechazado").length,
    suspendidos:clientes.filter(c => c.estado === "suspendido").length,
  };

  /* ══════ RENDER ══════ */
  return (
    <div className="min-h-screen antialiased" style={{ background: C.white, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── HEADER ── */}
        <header className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: C.purple }}>
                  <ShieldCheck size={13} color={C.white} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: C.purple }}>
                  Panel B2B · Gestión Empresarial
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: C.gray900 }}>
                Clientes Empresariales
              </h1>
              <p className="text-sm mt-1" style={{ color: C.gray500 }}>
                Verifica empresas, administra accesos y controla privilegios B2B
              </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: stats.total, bg: C.gray50, border: C.gray200, text: C.gray900, sub: C.gray500 },
                { label: "Pendientes", value: stats.pendientes, bg: "#fffbeb", border: "#fde68a", text: "#92400e", sub: "#b45309" },
                { label: "Verificados", value: stats.verificados, bg: C.greenLight, border: "#bbf7d0", text: C.greenDark, sub: "#15803d" },
                { label: "Rechazados", value: stats.rechazados, bg: C.redLight, border: "#fecaca", text: C.red, sub: "#b91c1c" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl px-4 py-3 border"
                  style={{ background: s.bg, borderColor: s.border }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: s.sub }}>{s.label}</p>
                  <p className="text-2xl font-bold" style={{ color: s.text }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── CONTROLES ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.gray300 }} />
            <input
              type="text"
              placeholder="Buscar empresa, RUC, email..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none transition-all"
              style={{
                border: `1.5px solid ${C.gray200}`,
                background: C.white,
                color: C.gray900,
              }}
              onFocus={e => { e.target.style.borderColor = C.purple; e.target.style.boxShadow = `0 0 0 3px ${C.purple}18`; }}
              onBlur={e => { e.target.style.borderColor = C.gray200; e.target.style.boxShadow = "none"; }}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Select */}
          <div className="relative">
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 text-sm rounded-xl focus:outline-none cursor-pointer transition-all"
              style={{
                border: `1.5px solid ${C.gray200}`,
                background: C.white,
                color: C.gray700,
                minWidth: 200,
              }}
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes de verificación</option>
              <option value="verificado">Verificados</option>
              <option value="rechazado">Rechazados</option>
              <option value="suspendido">Suspendidos</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.gray500 }} />
          </div>

          {/* Refresh */}
          <button
            onClick={cargarDatos}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${C.purple}, ${C.purpleMid})`,
              boxShadow: `0 4px 14px ${C.purple}40`,
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        {/* ── TABLA ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${C.gray200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
                  {["Empresa / Representante", "Identificación", "Estado B2B", "Acceso", "Acciones"].map((h, i) => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: C.gray500, textAlign: i === 4 ? "right" : "left" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  /* Loading skeleton */
                  [...Array(5)].map((_, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded-lg animate-pulse" style={{ background: C.gray100, width: j === 0 ? "70%" : "60%" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Building2 size={40} className="mx-auto mb-3" style={{ color: C.gray300 }} strokeWidth={1} />
                      <p className="font-semibold text-sm" style={{ color: C.gray500 }}>No se encontraron empresas</p>
                      <p className="text-xs mt-1" style={{ color: C.gray300 }}>Prueba con otros filtros</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((c, idx) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: idx < filteredData.length - 1 ? `1px solid ${C.gray100}` : "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#faf9ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = C.white)}
                    >
                      {/* Empresa */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: c.estado === "verificado" ? C.greenLight :
                                c.estado === "pendiente_verificacion" ? "#fffbeb" :
                                c.estado === "rechazado" ? C.redLight : C.purpleLight,
                              border: `1px solid ${
                                c.estado === "verificado" ? "#bbf7d0" :
                                c.estado === "pendiente_verificacion" ? "#fde68a" :
                                c.estado === "rechazado" ? "#fecaca" : "#ddd6fe"
                              }`,
                            }}
                          >
                            <Building2
                              size={18}
                              style={{
                                color: c.estado === "verificado" ? C.greenDark :
                                  c.estado === "pendiente_verificacion" ? "#b45309" :
                                  c.estado === "rechazado" ? C.red : C.purple
                              }}
                              strokeWidth={1.5}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-tight" style={{ color: C.gray900 }}>
                              {c.empresa || c.razonSocial || "Cliente independiente"}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: C.gray500 }}>
                              {c.nombre || "—"} {c.cargo ? `· ${c.cargo}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Identificación */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} style={{ color: C.gray300 }} />
                            <span className="text-xs font-medium" style={{ color: C.gray700 }}>{c.email}</span>
                          </div>
                          {c.nifCifRuc && (
                            <span
                              className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-md"
                              style={{ background: C.gray100, color: C.gray500, border: `1px solid ${C.gray200}` }}
                            >
                              {c.nifCifRuc}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          <EstadoBadge estado={c.estado} />
                          {c.acceso_catalogo !== undefined && (
                            <span
                              className="text-[9px] font-bold uppercase tracking-wide"
                              style={{ color: c.acceso_catalogo ? C.greenDark : C.red }}
                            >
                              {c.acceso_catalogo ? "✅ Catálogo activo" : "❌ Sin acceso"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border"
                          style={{
                            background: c.rol === "admin" ? C.gray900 : C.purpleLight,
                            color: c.rol === "admin" ? C.white : C.purple,
                            borderColor: c.rol === "admin" ? C.gray900 : "#ddd6fe",
                          }}
                        >
                          {c.rol === "admin" && <ShieldCheck size={11} />}
                          {c.rol?.replace("_pendiente", "") || "cliente"}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">

                          {/* Ver detalles */}
                          <button
                            onClick={() => { setSelectedCliente(c); setShowModal(true); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                            style={{ color: C.gray100, border: `1px solid ${C.gray200}` }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = C.purpleLight;
                              (e.currentTarget as HTMLElement).style.color = C.purple;
                              (e.currentTarget as HTMLElement).style.borderColor = "#ddd6fe";
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                              (e.currentTarget as HTMLElement).style.color = C.gray100;
                              (e.currentTarget as HTMLElement).style.borderColor = C.gray200;
                            }}
                            title="Ver detalles"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Acción rápida según estado */}
                          {c.estado === "pendiente_verificacion" && (
                            <button
                              onClick={() => verificarEmpresa(c.id, c.empresaData?.id)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all"
                              style={{
                                background: `linear-gradient(135deg, ${C.purple}, ${C.purpleMid})`,
                                boxShadow: `0 2px 8px ${C.purple}40`,
                              }}
                            >
                              Verificar
                            </button>
                          )}
                          {c.estado === "verificado" && c.acceso_catalogo && (
                            <button
                              onClick={() => suspenderEmpresa(c.id)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-colors"
                              style={{ background: C.orange }}
                            >
                              Suspender
                            </button>
                          )}
                          {c.estado === "suspendido" && (
                            <button
                              onClick={() => activarEmpresa(c.id)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all"
                              style={{
                                background: `linear-gradient(135deg, ${C.purple}, ${C.purpleMid})`,
                                boxShadow: `0 2px 8px ${C.purple}40`,
                              }}
                            >
                              Reactivar
                            </button>
                          )}

                          {/* Selector de rol */}
                          <div className="relative">
                            <select
                              value={c.rol || "cliente_pendiente"}
                              onChange={e => cambiarRol(c.id, e.target.value)}
                              className="appearance-none text-[10px] font-bold uppercase pl-2.5 pr-6 py-1.5 rounded-lg cursor-pointer focus:outline-none transition-all"
                              style={{
                                border: `1px solid ${C.gray200}`,
                                background: C.gray50,
                                color: C.gray500,
                              }}
                            >
                              <option value="cliente_pendiente">Pendiente</option>
                              <option value="cliente">Cliente</option>
                              <option value="admin">Admin</option>
                            </select>
                            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.gray100 }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6"
          style={{ borderTop: `1px solid ${C.gray100}` }}>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: C.gray300 }}>
              Telecom SAC © 2026 · Sistema B2B
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.green }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.greenDark }}>
                {filteredData.length} empresas visibles
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            {["Exportar CSV", "Historial"].map(btn => (
              <button
                key={btn}
                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: C.gray500, border: `1px solid ${C.gray200}` }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = C.purple;
                  (e.currentTarget as HTMLElement).style.borderColor = "#ddd6fe";
                  (e.currentTarget as HTMLElement).style.background = C.purpleLight;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = C.gray500;
                  (e.currentTarget as HTMLElement).style.borderColor = C.gray200;
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {btn}
              </button>
            ))}
          </div>
        </footer>
      </div>

      {/* ── MODAL ── */}
      {showModal && selectedCliente && (
        <ModalDetalle
          cliente={selectedCliente}
          onClose={() => { setShowModal(false); setSelectedCliente(null); }}
          onVerificar={verificarEmpresa}
          onRechazar={rechazarEmpresa}
          onSuspender={suspenderEmpresa}
          onActivar={activarEmpresa}
        />
      )}
    </div>
  );
}