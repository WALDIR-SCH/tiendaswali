"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import {
  Save, Building, Truck, Shield, Phone, CreditCard,
  ChevronRight, Check, AlertCircle, Settings,
  Landmark, Globe, MapPin, Percent, Package,
  Zap, Eye, EyeOff, RefreshCcw
} from "lucide-react";

// ── PALETA OFICIAL ────────────────────────────────────────────
const C = {
  purple:      "#9851F9",
  purpleDark:  "#7c3aed",
  purpleLight: "#f5f0ff",
  orange:      "#FF6600",
  yellow:      "#F6FA00",
  green:       "#28FB4B",
  white:       "#FFFFFF",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray300:     "#D1D5DB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray600:     "#4B5563",
  gray700:     "#374151",
  gray800:     "#1F2937",
  gray900:     "#111827",
} as const;

// ── TIPOS ──────────────────────────────────────────────────────
interface ConfigType {
  bancos: {
    bcp:        { soles: string; dolares: string; cciSoles: string; cciDolares: string };
    interbank:  { soles: string; dolares: string; cciSoles: string; cciDolares: string };
    bbva:       { soles: string; dolares: string; cciSoles: string; cciDolares: string };
    scotiabank: { soles: string; dolares: string; cciSoles: string; cciDolares: string };
  };
  yape: string;
  plin: string;
  envios: {
    lima:             { costo: number; tiempo: string };
    provincia:        { costo: number; tiempo: string };
    recojoTienda:     boolean;
    direccionAlmacen: string;
  };
  empresa: {
    ruc:               string;
    razonSocial:       string;
    domicilioFiscal:   string;
    facturaElectronica:boolean;
    detracciones:      boolean;
    montoDetraccion:   number;
    percepcion:        boolean;
  };
  reglas: {
    minimoCompra:         number;
    minimoPorProducto:    number;
    stockCritico:         number;
    descuentosPorVolumen: { cantidad: number; descuento: number }[];
    bloquearSinLogin:     boolean;
  };
  wsVentas:       string;
  wsSoporte:      string;
  emailPedidos:   string;
  horarioAtencion:string;
}

const CONFIG_DEFAULT: ConfigType = {
  bancos: {
    bcp:        { soles: "", dolares: "", cciSoles: "", cciDolares: "" },
    interbank:  { soles: "", dolares: "", cciSoles: "", cciDolares: "" },
    bbva:       { soles: "", dolares: "", cciSoles: "", cciDolares: "" },
    scotiabank: { soles: "", dolares: "", cciSoles: "", cciDolares: "" },
  },
  yape: "",
  plin: "",
  envios: {
    lima:             { costo: 15, tiempo: "24-48h" },
    provincia:        { costo: 35, tiempo: "3-5 días" },
    recojoTienda:     true,
    direccionAlmacen: "",
  },
  empresa: {
    ruc:               "",
    razonSocial:       "",
    domicilioFiscal:   "",
    facturaElectronica:true,
    detracciones:      false,
    montoDetraccion:   700,
    percepcion:        false,
  },
  reglas: {
    minimoCompra:         0,
    minimoPorProducto:    0,
    stockCritico:         5,
    descuentosPorVolumen: [
      { cantidad: 50,  descuento: 5  },
      { cantidad: 100, descuento: 10 },
      { cantidad: 500, descuento: 15 },
    ],
    bloquearSinLogin: true,
  },
  wsVentas:        "",
  wsSoporte:       "",
  emailPedidos:    "",
  horarioAtencion: "Lun-Vie 9am-6pm",
};

// ── COMPONENTES REUTILIZABLES ─────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, color = C.purple }: {
  icon: any; title: string; subtitle?: string; color?: string;
}) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: `${color}12` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: C.gray900 }}>{title}</h2>
      {subtitle && <p className="text-[10px]" style={{ color: C.gray500 }}>{subtitle}</p>}
    </div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder, type = "text", required = false, mono = false }: {
  label: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; mono?: boolean;
}) => (
  <div>
    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block"
      style={{ color: C.gray500 }}>
      {label}{required && <span style={{ color: C.orange }}> *</span>}
    </label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all"
      style={{
        background: C.white,
        borderColor: C.gray200,
        color: C.gray900,
        fontFamily: mono ? "monospace" : "inherit",
      }}
      onFocus={e => e.currentTarget.style.borderColor = C.purple}
      onBlur={e => e.currentTarget.style.borderColor = C.gray200} />
  </div>
);

const Toggle = ({ label, sub, checked, onChange }: {
  label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void;
}) => (
  <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl border transition-all"
    style={{ borderColor: checked ? `${C.purple}30` : C.gray200, background: checked ? `${C.purple}05` : C.white }}>
    <div>
      <p className="text-sm font-semibold" style={{ color: C.gray800 }}>{label}</p>
      {sub && <p className="text-[10px]" style={{ color: C.gray500 }}>{sub}</p>}
    </div>
    <div className="relative w-10 h-5 shrink-0 ml-3">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
      <div className="w-10 h-5 rounded-full transition-all" style={{ background: checked ? C.purple : C.gray200 }} />
      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
    </div>
  </label>
);

const BancoCard = ({ nombre, emoji, banco, setBanco }: {
  nombre: string; emoji: string;
  banco: { soles: string; dolares: string; cciSoles: string; cciDolares: string };
  setBanco: (b: typeof banco) => void;
}) => {
  const [open, setOpen] = useState(false);
  const hasData = banco.soles || banco.cciSoles || banco.dolares;
  return (
    <div className="rounded-2xl border overflow-hidden transition-all"
      style={{ borderColor: open ? `${C.purple}30` : C.gray200 }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-all"
        style={{ background: open ? `${C.purple}05` : C.gray50 }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{emoji}</span>
          <div className="text-left">
            <p className="text-sm font-black" style={{ color: C.gray900 }}>{nombre}</p>
            {hasData && <p className="text-[10px]" style={{ color: C.green }}>✓ Configurado</p>}
            {!hasData && <p className="text-[10px]" style={{ color: C.gray400 }}>Sin configurar</p>}
          </div>
        </div>
        <ChevronRight size={15} style={{
          color: C.gray400,
          transform: open ? "rotate(90deg)" : "rotate(0)",
          transition: "transform 0.2s"
        }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-3" style={{ borderTop: `1px solid ${C.gray100}` }}>
          <InputField label="Cuenta Soles" value={banco.soles}
            onChange={v => setBanco({ ...banco, soles: v })}
            placeholder="0000-00-000000-0-00" mono />
          <InputField label="CCI Soles" value={banco.cciSoles}
            onChange={v => setBanco({ ...banco, cciSoles: v })}
            placeholder="002191000000000000" mono />
          <InputField label="Cuenta Dólares" value={banco.dolares}
            onChange={v => setBanco({ ...banco, dolares: v })}
            placeholder="Opcional" mono />
          <InputField label="CCI Dólares" value={banco.cciDolares}
            onChange={v => setBanco({ ...banco, cciDolares: v })}
            placeholder="Opcional" mono />
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════
export default function ConfiguracionAdmin() {
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [config,  setConfig]    = useState<ConfigType>(CONFIG_DEFAULT);
  const [activeSection, setActiveSection] = useState("empresa");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "ajustes", "global"));
        if (snap.exists()) setConfig(prev => ({ ...prev, ...snap.data() }));
      } catch { toast.error("Error al cargar configuración"); }
      finally { setLoading(false); }
    };
    fetchConfig();
  }, []);

  const guardar = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "ajustes", "global"), config, { merge: true });
      toast.success("✅ Configuración guardada correctamente");
    } catch { toast.error("❌ Error al guardar"); }
    finally { setSaving(false); }
  };

  const SECTIONS = [
    { id: "empresa",  label: "Empresa",       icon: Building,  color: C.purple },
    { id: "bancos",   label: "Bancos / Pagos", icon: Landmark,  color: C.orange },
    { id: "envios",   label: "Envíos",         icon: Truck,     color: C.green  },
    { id: "reglas",   label: "Reglas B2B",     icon: Shield,    color: C.purple },
    { id: "contacto", label: "Contacto",       icon: Phone,     color: C.orange },
  ] as const;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.white }}>
      <div className="text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${C.purple}30`, borderTopColor: C.purple }} />
        <p className="text-sm font-semibold" style={{ color: C.gray500 }}>Cargando configuración...</p>
      </div>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: "12px", fontWeight: 600, fontSize: "13px" }
      }} />

      <div className="min-h-screen" style={{ background: C.white }}>

        {/* ── HEADER ──────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: C.gray200 }}>
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
                <Settings size={17} />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-tight" style={{ color: C.gray900 }}>
                  Configuración General
                </h1>
                <p className="text-[10px]" style={{ color: C.gray400 }}>Panel B2B · Tiendas Waly</p>
              </div>
            </div>
            <button onClick={guardar} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})`, boxShadow: `0 4px 12px ${C.purple}30` }}>
              {saving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">

          {/* ── NAV LATERAL ─────────────────────────────── */}
          <aside className="lg:w-56 shrink-0">
            <div className="bg-white rounded-2xl border p-2 sticky top-20" style={{ borderColor: C.gray200 }}>
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
                  style={{
                    background:  activeSection === s.id ? `${s.color}10` : "transparent",
                    color:       activeSection === s.id ? s.color : C.gray600,
                    borderLeft:  activeSection === s.id ? `3px solid ${s.color}` : "3px solid transparent",
                  }}>
                  <s.icon size={15} style={{ color: activeSection === s.id ? s.color : C.gray400 }} />
                  {s.label}
                </button>
              ))}
              <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.gray100}` }}>
                <button onClick={guardar} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black text-white transition-all disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})` }}>
                  {saving ? <RefreshCcw size={12} className="animate-spin" /> : <Save size={12} />}
                  {saving ? "..." : "Guardar todo"}
                </button>
              </div>
            </div>
          </aside>

          {/* ── CONTENIDO ───────────────────────────────── */}
          <main className="flex-1 space-y-5">

            {/* ═══ EMPRESA ═══════════════════════════════ */}
            {activeSection === "empresa" && (
              <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.gray200 }}>
                <SectionHeader icon={Building} title="Datos de la Empresa"
                  subtitle="RUC, razón social y configuración fiscal SUNAT" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="RUC" value={config.empresa.ruc} required
                    onChange={v => setConfig({ ...config, empresa: { ...config.empresa, ruc: v } })}
                    placeholder="20XXXXXXXXX" mono />
                  <InputField label="Razón Social" value={config.empresa.razonSocial} required
                    onChange={v => setConfig({ ...config, empresa: { ...config.empresa, razonSocial: v.toUpperCase() } })}
                    placeholder="TIENDAS WALY SAC" />
                  <div className="sm:col-span-2">
                    <InputField label="Domicilio Fiscal" value={config.empresa.domicilioFiscal}
                      onChange={v => setConfig({ ...config, empresa: { ...config.empresa, domicilioFiscal: v } })}
                      placeholder="Av. Principal 123, Lima, Lima" />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.gray500 }}>Configuración Fiscal</p>
                  <Toggle label="Factura Electrónica SUNAT" sub="Habilitar emisión de comprobantes electrónicos"
                    checked={config.empresa.facturaElectronica}
                    onChange={v => setConfig({ ...config, empresa: { ...config.empresa, facturaElectronica: v } })} />
                  <Toggle label="Detracciones" sub="Aplicar sistema de detracciones SUNAT"
                    checked={config.empresa.detracciones}
                    onChange={v => setConfig({ ...config, empresa: { ...config.empresa, detracciones: v } })} />
                  {config.empresa.detracciones && (
                    <div className="ml-4">
                      <InputField label="Monto mínimo de detracción (S/)" type="number"
                        value={config.empresa.montoDetraccion}
                        onChange={v => setConfig({ ...config, empresa: { ...config.empresa, montoDetraccion: Number(v) } })}
                        placeholder="700" />
                    </div>
                  )}
                  <Toggle label="Percepción" sub="Aplicar régimen de percepciones"
                    checked={config.empresa.percepcion}
                    onChange={v => setConfig({ ...config, empresa: { ...config.empresa, percepcion: v } })} />
                </div>
              </div>
            )}

            {/* ═══ BANCOS ═════════════════════════════════ */}
            {activeSection === "bancos" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.gray200 }}>
                  <SectionHeader icon={Landmark} title="Cuentas Bancarias Perú"
                    subtitle="Configura las cuentas para transferencias B2B" color={C.orange} />
                  <div className="space-y-3">
                    <BancoCard nombre="BCP" emoji="🔵"
                      banco={config.bancos.bcp}
                      setBanco={b => setConfig({ ...config, bancos: { ...config.bancos, bcp: b } })} />
                    <BancoCard nombre="BBVA Continental" emoji="💙"
                      banco={config.bancos.bbva}
                      setBanco={b => setConfig({ ...config, bancos: { ...config.bancos, bbva: b } })} />
                    <BancoCard nombre="Interbank" emoji="🟢"
                      banco={config.bancos.interbank}
                      setBanco={b => setConfig({ ...config, bancos: { ...config.bancos, interbank: b } })} />
                    <BancoCard nombre="Scotiabank" emoji="🔴"
                      banco={config.bancos.scotiabank}
                      setBanco={b => setConfig({ ...config, bancos: { ...config.bancos, scotiabank: b } })} />
                  </div>
                </div>

                {/* Billeteras digitales */}
                <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.gray200 }}>
                  <SectionHeader icon={Zap} title="Billeteras Digitales"
                    subtitle="Yape, Plin y otros medios de pago digital" color={C.orange} />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="🟡 Yape (número)" value={config.yape}
                      onChange={v => setConfig({ ...config, yape: v })}
                      placeholder="+51 999 999 999" />
                    <InputField label="🔵 Plin (número)" value={config.plin}
                      onChange={v => setConfig({ ...config, plin: v })}
                      placeholder="+51 999 999 999" />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ ENVÍOS ══════════════════════════════════ */}
            {activeSection === "envios" && (
              <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.gray200 }}>
                <SectionHeader icon={Truck} title="Logística y Envíos"
                  subtitle="Tarifas y tiempos de entrega" color={C.green} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div className="rounded-xl border p-4" style={{ borderColor: `${C.green}30`, background: `${C.green}05` }}>
                    <p className="text-xs font-black mb-3 flex items-center gap-2" style={{ color: C.green }}>
                      <MapPin size={13} /> Lima Metropolitana
                    </p>
                    <div className="space-y-3">
                      <InputField label="Costo (S/)" type="number" value={config.envios.lima.costo}
                        onChange={v => setConfig({ ...config, envios: { ...config.envios, lima: { ...config.envios.lima, costo: Number(v) } } })} />
                      <InputField label="Tiempo estimado" value={config.envios.lima.tiempo}
                        onChange={v => setConfig({ ...config, envios: { ...config.envios, lima: { ...config.envios.lima, tiempo: v } } })}
                        placeholder="24-48h" />
                    </div>
                  </div>
                  <div className="rounded-xl border p-4" style={{ borderColor: `${C.orange}30`, background: `${C.orange}05` }}>
                    <p className="text-xs font-black mb-3 flex items-center gap-2" style={{ color: C.orange }}>
                      <Globe size={13} /> Provincias / Nacional
                    </p>
                    <div className="space-y-3">
                      <InputField label="Costo (S/)" type="number" value={config.envios.provincia.costo}
                        onChange={v => setConfig({ ...config, envios: { ...config.envios, provincia: { ...config.envios.provincia, costo: Number(v) } } })} />
                      <InputField label="Tiempo estimado" value={config.envios.provincia.tiempo}
                        onChange={v => setConfig({ ...config, envios: { ...config.envios, provincia: { ...config.envios.provincia, tiempo: v } } })}
                        placeholder="3-5 días hábiles" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Toggle label="Permitir recojo en tienda"
                    sub="Los clientes podrán recoger sus pedidos en el almacén"
                    checked={config.envios.recojoTienda}
                    onChange={v => setConfig({ ...config, envios: { ...config.envios, recojoTienda: v } })} />
                  {config.envios.recojoTienda && (
                    <div className="ml-4">
                      <InputField label="Dirección del almacén" value={config.envios.direccionAlmacen}
                        onChange={v => setConfig({ ...config, envios: { ...config.envios, direccionAlmacen: v } })}
                        placeholder="Av. Principal 123, Lima" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ REGLAS B2B ═════════════════════════════ */}
            {activeSection === "reglas" && (
              <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.gray200 }}>
                <SectionHeader icon={Shield} title="Reglas de Venta B2B"
                  subtitle="Mínimos, descuentos por volumen y restricciones" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                  <InputField label="Mínimo de compra (S/)" type="number" value={config.reglas.minimoCompra}
                    onChange={v => setConfig({ ...config, reglas: { ...config.reglas, minimoCompra: Number(v) } })} />
                  <InputField label="Mínimo por producto (uds)" type="number" value={config.reglas.minimoPorProducto}
                    onChange={v => setConfig({ ...config, reglas: { ...config.reglas, minimoPorProducto: Number(v) } })} />
                  <InputField label="Alerta stock crítico (uds)" type="number" value={config.reglas.stockCritico}
                    onChange={v => setConfig({ ...config, reglas: { ...config.reglas, stockCritico: Number(v) } })} />
                </div>

                <div className="space-y-3 mb-5">
                  <Toggle label="Bloquear compra sin login"
                    sub="Solo usuarios registrados y aprobados pueden comprar"
                    checked={config.reglas.bloquearSinLogin}
                    onChange={v => setConfig({ ...config, reglas: { ...config.reglas, bloquearSinLogin: v } })} />
                </div>

                {/* Descuentos por volumen */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.gray500 }}>
                      Descuentos por Volumen
                    </p>
                    <button
                      onClick={() => setConfig({
                        ...config,
                        reglas: {
                          ...config.reglas,
                          descuentosPorVolumen: [
                            ...config.reglas.descuentosPorVolumen,
                            { cantidad: 0, descuento: 0 }
                          ]
                        }
                      })}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all border"
                      style={{ borderColor: `${C.purple}30`, color: C.purple, background: `${C.purple}08` }}>
                      + Agregar nivel
                    </button>
                  </div>
                  <div className="space-y-2">
                    {config.reglas.descuentosPorVolumen.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border"
                        style={{ borderColor: C.gray200, background: C.gray50 }}>
                        <div className="flex-1">
                          <InputField label={`Nivel ${i+1}: Cantidad mínima (uds)`}
                            type="number" value={d.cantidad}
                            onChange={v => {
                              const arr = [...config.reglas.descuentosPorVolumen];
                              arr[i] = { ...arr[i], cantidad: Number(v) };
                              setConfig({ ...config, reglas: { ...config.reglas, descuentosPorVolumen: arr } });
                            }} />
                        </div>
                        <div className="flex-1">
                          <InputField label="Descuento (%)"
                            type="number" value={d.descuento}
                            onChange={v => {
                              const arr = [...config.reglas.descuentosPorVolumen];
                              arr[i] = { ...arr[i], descuento: Number(v) };
                              setConfig({ ...config, reglas: { ...config.reglas, descuentosPorVolumen: arr } });
                            }} />
                        </div>
                        <button onClick={() => {
                          const arr = config.reglas.descuentosPorVolumen.filter((_, j) => j !== i);
                          setConfig({ ...config, reglas: { ...config.reglas, descuentosPorVolumen: arr } });
                        }} className="mt-5 p-2 rounded-lg transition-all" style={{ color: "#ef4444" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ CONTACTO ════════════════════════════════ */}
            {activeSection === "contacto" && (
              <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.gray200 }}>
                <SectionHeader icon={Phone} title="Contacto y Soporte"
                  subtitle="Números de WhatsApp, email y horarios" color={C.orange} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="📱 WhatsApp Ventas" value={config.wsVentas}
                    onChange={v => setConfig({ ...config, wsVentas: v })}
                    placeholder="+51 999 888 777" />
                  <InputField label="🛠 WhatsApp Soporte" value={config.wsSoporte}
                    onChange={v => setConfig({ ...config, wsSoporte: v })}
                    placeholder="+51 999 888 777" />
                  <InputField label="✉️ Email de Pedidos" value={config.emailPedidos}
                    onChange={v => setConfig({ ...config, emailPedidos: v })}
                    placeholder="pedidos@tiendaswaly.com" type="email" />
                  <InputField label="🕒 Horario de Atención" value={config.horarioAtencion}
                    onChange={v => setConfig({ ...config, horarioAtencion: v })}
                    placeholder="Lun-Vie 9am-6pm" />
                </div>

                <div className="mt-5 p-4 rounded-xl border" style={{ background: `${C.orange}06`, borderColor: `${C.orange}20` }}>
                  <p className="text-xs font-black mb-2" style={{ color: C.orange }}>Vista previa WhatsApp</p>
                  <p className="text-xs" style={{ color: C.gray600 }}>
                    Los clientes verán este número al hacer clic en "Contactar Asesor":
                  </p>
                  <p className="text-sm font-black mt-1" style={{ color: C.gray900 }}>
                    {config.wsVentas || "+51 (sin configurar)"}
                  </p>
                </div>
              </div>
            )}

            {/* Botón guardar bottom */}
            <div className="flex justify-end pt-2">
              <button onClick={guardar} disabled={saving}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg,${C.purple},${C.purpleDark})`, boxShadow: `0 4px 16px ${C.purple}30` }}>
                {saving ? <RefreshCcw size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? "Guardando..." : "Guardar todos los cambios"}
              </button>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}