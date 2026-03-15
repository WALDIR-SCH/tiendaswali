"use client";
import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy, onSnapshot,
} from "firebase/firestore";
import Link from "next/link";
import {
  ArrowLeft, Plus, Search, RefreshCw, AlertTriangle,
  CheckCircle, Clock, DollarSign, Building2, X, TrendingUp,
} from "lucide-react";

/* ─── TIPOS ─── */
interface Cuenta {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmpresa: string;
  clienteEmail: string;
  pedidoId?: string;
  numeroPedido?: string;
  cotizacionId?: string;
  monto: number;
  montoPagado: number;
  saldoPendiente: number;
  fechaEmision: any;
  fechaVencimiento: any;
  diasCredito: number;
  estado: "pendiente" | "parcial" | "pagada" | "vencida" | "incobrable";
  notas: string;
  pagos: Pago[];
}

interface Pago {
  fecha: string;
  monto: number;
  metodo: string;
  referencia: string;
  registradoPor: string;
}

interface Cliente {
  id: string;
  empresa?: string;
  nombre?: string;
  email?: string;
  limiteCreditoPEN?: number;
}

/* ─── PALETA ─── */
const C = {
  purple:"#9851F9", purpleDark:"#7C35E0",
  green:"#28FB4B",  yellow:"#F6FA00", orange:"#FF6600",
  white:"#FFFFFF",  gray50:"#f9fafb", gray100:"#f3f4f6",
  gray200:"#e5e7eb",gray300:"#d1d5db",gray500:"#6b7280",
  gray700:"#374151",gray900:"#111827",
  red:"#dc2626",    redLight:"#fef2f2",
};

const fmtPEN = (n: number) =>
  new Intl.NumberFormat("es-PE", { style:"currency", currency:"PEN", minimumFractionDigits:2 }).format(n || 0);

const getDiasVencimiento = (fecha: any): number => {
  try {
    const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  } catch { return 0; }
};

const ESTADO_MAP: Record<string, { label:string; bg:string; color:string; border:string }> = {
  pendiente:   { label:"Pendiente",   bg:`${C.yellow}18`, color:"#a09600",  border:`${C.yellow}40` },
  parcial:     { label:"Pago Parcial",bg:`${C.purple}10`, color:C.purple,   border:`${C.purple}25` },
  pagada:      { label:"Pagada",      bg:`${C.green}12`,  color:"#16a34a",  border:`${C.green}30`  },
  vencida:     { label:"Vencida",     bg:C.redLight,      color:C.red,      border:"#fecaca"        },
  incobrable:  { label:"Incobrable",  bg:"#1e293b",       color:"#94a3b8",  border:"#334155"        },
};

const EstadoBadge = ({ estado }: { estado: string }) => {
  const e = ESTADO_MAP[estado] ?? ESTADO_MAP.pendiente;
  return (
    <span style={{ display:"inline-flex", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:e.bg, color:e.color, border:`1px solid ${e.border}` }}>
      {e.label}
    </span>
  );
};

/* ─── MODAL REGISTRAR PAGO ─── */
function ModalPago({ cuenta, onClose, onSaved }: { cuenta:Cuenta; onClose:()=>void; onSaved:()=>void }) {
  const [monto,      setMonto]      = useState(cuenta.saldoPendiente);
  const [metodo,     setMetodo]     = useState("transferencia");
  const [referencia, setReferencia] = useState("");
  const [saving,     setSaving]     = useState(false);

  const handlePagar = async () => {
    if (monto <= 0 || monto > cuenta.saldoPendiente) { alert("Monto inválido"); return; }
    setSaving(true);
    try {
      const nuevoPagado = cuenta.montoPagado + monto;
      const nuevoSaldo  = cuenta.monto - nuevoPagado;
      const estado: Cuenta["estado"] = nuevoSaldo <= 0 ? "pagada" : "parcial";
      const nuevoPago: Pago = {
        fecha: new Date().toISOString(),
        monto, metodo, referencia,
        registradoPor: "admin",
      };
      await updateDoc(doc(db, "cuentas_cobrar", cuenta.id), {
        montoPagado: nuevoPagado,
        saldoPendiente: Math.max(0, nuevoSaldo),
        estado,
        pagos: [...(cuenta.pagos || []), nuevoPago],
        ...(estado === "pagada" ? { fechaPago: serverTimestamp() } : {}),
      });
      onSaved();
      onClose();
    } catch { alert("Error al registrar pago"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:70, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:460, border:`1px solid ${C.gray200}`, boxShadow:"0 24px 80px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${C.gray100}` }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:C.gray900 }}>Registrar Pago</h3>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:`1px solid ${C.gray200}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={16} style={{ color:C.gray500 }} />
          </button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ padding:"12px 16px", borderRadius:12, background:`${C.purple}08`, border:`1px solid ${C.purple}18` }}>
            <p style={{ margin:0, fontSize:12, color:C.gray500 }}>Saldo pendiente</p>
            <p style={{ margin:"4px 0 0", fontSize:22, fontWeight:900, color:C.purple }}>{fmtPEN(cuenta.saldoPendiente)}</p>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Monto a pagar (S/)</label>
            <input type="number" min={0.01} max={cuenta.saldoPendiente} step={0.01} value={monto}
              onChange={e => setMonto(Number(e.target.value))}
              style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900 }}
            />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Método de pago</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}
              style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white }}>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="deposito">Depósito bancario</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="yape">Yape / Plin</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Referencia / N° Operación</label>
            <input value={referencia} onChange={e => setReferencia(e.target.value)}
              placeholder="Ej: OP-123456789"
              style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900 }}
            />
          </div>
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:11, border:`1px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:600, color:C.gray700, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={handlePagar} disabled={saving}
              style={{ flex:2, padding:"10px", borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 14px ${C.purple}40` }}>
              {saving ? "Registrando..." : `💳 Registrar S/ ${monto.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MODAL NUEVA CUENTA ─── */
function ModalNuevaCuenta({ onClose, onSaved }: { onClose:()=>void; onSaved:()=>void }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    clienteId:"", clienteNombre:"", clienteEmpresa:"", clienteEmail:"",
    monto:0, diasCredito:30, notas:"", numeroPedido:"",
  });

  useEffect(() => {
    getDocs(collection(db, "usuarios")).then(snap => {
      setClientes(snap.docs.map(d => ({ id:d.id, ...d.data() } as Cliente)).filter(c => c.empresa));
    });
  }, []);

  const handleSave = async () => {
    if (!form.clienteId || form.monto <= 0) { alert("Completa todos los campos"); return; }
    setSaving(true);
    try {
      const venc = new Date();
      venc.setDate(venc.getDate() + form.diasCredito);
      await addDoc(collection(db, "cuentas_cobrar"), {
        ...form,
        montoPagado: 0,
        saldoPendiente: form.monto,
        estado: "pendiente",
        pagos: [],
        fechaEmision: serverTimestamp(),
        fechaVencimiento: venc,
      });
      onSaved();
      onClose();
    } catch { alert("Error al crear cuenta"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:70, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:500, border:`1px solid ${C.gray200}`, boxShadow:"0 24px 80px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${C.gray100}` }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:C.gray900 }}>Nueva Cuenta por Cobrar</h3>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:`1px solid ${C.gray200}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={16} style={{ color:C.gray500 }} />
          </button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Cliente *</label>
            <select value={form.clienteId} onChange={e => {
              const c = clientes.find(x => x.id === e.target.value);
              if (c) setForm(f => ({...f, clienteId:c.id, clienteNombre:c.nombre||"", clienteEmpresa:c.empresa||"", clienteEmail:c.email||""}));
            }}
              style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white }}>
              <option value="">— Selecciona cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa || c.nombre}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Monto (S/) *</label>
              <input type="number" min={0.01} step={0.01} value={form.monto || ""}
                onChange={e => setForm(f => ({...f, monto:Number(e.target.value)}))}
                style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900 }}
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Días de crédito</label>
              <select value={form.diasCredito} onChange={e => setForm(f => ({...f, diasCredito:Number(e.target.value)}))}
                style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900, background:C.white }}>
                <option value={7}>7 días</option>
                <option value={15}>15 días</option>
                <option value={30}>30 días</option>
                <option value={45}>45 días</option>
                <option value={60}>60 días</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>N° Pedido / Referencia</label>
            <input value={form.numeroPedido} onChange={e => setForm(f => ({...f, numeroPedido:e.target.value}))}
              placeholder="PED-000123"
              style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900 }}
            />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray700, display:"block", marginBottom:6 }}>Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({...f, notas:e.target.value}))} rows={2}
              style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none", resize:"vertical", color:C.gray900 }}
            />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:11, border:`1px solid ${C.gray200}`, background:C.white, fontSize:13, fontWeight:600, color:C.gray700, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:2, padding:"10px", borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer" }}>
              {saving ? "Guardando..." : "Crear cuenta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════ */
export default function CuentasCobrarAdmin() {
  const [cuentas,      setCuentas]      = useState<Cuenta[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [pagarModal,   setPagarModal]   = useState<Cuenta | null>(null);
  const [nuevaModal,   setNuevaModal]   = useState(false);

  const cargar = useCallback(() => {
    const q = query(collection(db, "cuentas_cobrar"), orderBy("fechaEmision", "desc"));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id:d.id, ...d.data() } as Cuenta));
      /* Auto-marcar vencidas */
      const hoy = Date.now();
      const actualizadas = data.map(c => {
        if (c.estado === "pendiente" || c.estado === "parcial") {
          try {
            const venc = c.fechaVencimiento?.toDate?.() ?? new Date(c.fechaVencimiento);
            if (venc.getTime() < hoy) return { ...c, estado:"vencida" as const };
          } catch {}
        }
        return c;
      });
      setCuentas(actualizadas);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = cargar();
    return () => unsub();
  }, [cargar]);

  const filtradas = cuentas.filter(c => {
    const matchS = c.clienteEmpresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   c.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   c.numeroPedido?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchE = filtroEstado === "todos" ? true : c.estado === filtroEstado;
    return matchS && matchE;
  });

  const stats = {
    totalCobrar: cuentas.filter(c => c.estado!=="pagada").reduce((a,c)=>a+c.saldoPendiente,0),
    vencidas:    cuentas.filter(c => c.estado==="vencida"),
    pendientes:  cuentas.filter(c => c.estado==="pendiente"||c.estado==="parcial"),
    cobradoMes:  cuentas.filter(c => c.estado==="pagada").reduce((a,c)=>a+c.monto,0),
  };

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif" }} className="dash-in">
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ marginBottom:8 }}>
            <Link href="/admin" style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12, color:C.purple, textDecoration:"none", fontWeight:600 }}>
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize:28, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.04em" }}>Cuentas por Cobrar</h1>
          <p style={{ fontSize:13, color:C.gray500, margin:"4px 0 0" }}>Control de crédito y cobranza B2B</p>
        </div>
        <button onClick={() => setNuevaModal(true)}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 22px", borderRadius:13, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:`0 6px 22px ${C.purple}50` }}>
          <Plus size={16} /> Nueva Cuenta
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        {[
          { label:"Por Cobrar",      val:fmtPEN(stats.totalCobrar), bg:`${C.purple}08`, border:`${C.purple}20`, color:C.purple, icon:"💰" },
          { label:"Cuentas Vencidas",val:String(stats.vencidas.length), bg:C.redLight, border:"#fecaca", color:C.red, icon:"⚠️" },
          { label:"Pendientes",      val:String(stats.pendientes.length), bg:`${C.yellow}15`, border:`${C.yellow}35`, color:"#a09600", icon:"⏳" },
          { label:"Cobrado (total)", val:fmtPEN(stats.cobradoMes), bg:`${C.green}10`, border:`${C.green}28`, color:"#16a34a", icon:"✅" },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:16, padding:"18px 20px", border:`1px solid ${s.border}`, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:28 }}>{s.icon}</div>
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:s.color, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.07em" }}>{s.label}</p>
              <p style={{ fontSize:20, fontWeight:900, color:s.color, margin:0 }}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas vencidas */}
      {stats.vencidas.length > 0 && (
        <div style={{ marginBottom:20, padding:"14px 18px", borderRadius:14, background:C.redLight, border:`1px solid #fecaca`, display:"flex", alignItems:"center", gap:12 }}>
          <AlertTriangle size={18} style={{ color:C.red, flexShrink:0 }} />
          <p style={{ margin:0, fontSize:13, color:C.red, fontWeight:600 }}>
            <strong>{stats.vencidas.length} cuenta(s) vencida(s)</strong> — Total: {fmtPEN(stats.vencidas.reduce((a,c)=>a+c.saldoPendiente,0))}. Requieren acción inmediata.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <div style={{ flex:1, position:"relative" }}>
          <Search size={15} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:C.gray300 }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por empresa, cliente, pedido..."
            style={{ width:"100%", paddingLeft:40, paddingRight:16, paddingTop:10, paddingBottom:10, borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, outline:"none", color:C.gray900 }}
          />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding:"10px 16px", borderRadius:12, border:`1.5px solid ${C.gray200}`, fontSize:14, color:C.gray700, outline:"none", background:C.white, minWidth:200 }}>
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="parcial">Pago parcial</option>
          <option value="vencida">Vencidas</option>
          <option value="pagada">Pagadas</option>
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background:C.white, borderRadius:18, border:`1px solid ${C.gray200}`, overflow:"hidden", boxShadow:`0 4px 24px ${C.purple}06` }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:C.gray50, borderBottom:`1px solid ${C.gray200}` }}>
              {["Cliente / Empresa","Pedido","Total","Pagado","Saldo","Vencimiento","Estado","Acciones"].map((h,i) => (
                <th key={h} style={{ padding:"12px 16px", fontSize:11, fontWeight:800, color:C.gray500, textAlign:i===7?"right":"left", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_,i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${C.gray100}` }}>
                  {[...Array(8)].map((_,j) => (
                    <td key={j} style={{ padding:"16px" }}>
                      <div style={{ height:16, borderRadius:6, background:C.gray100, animation:"pulse 1.4s ease infinite", width:"70%" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:"48px", textAlign:"center", color:C.gray500, fontSize:14 }}>Sin cuentas registradas</td></tr>
            ) : filtradas.map((c, idx) => {
              const diasVenc = getDiasVencimiento(c.fechaVencimiento);
              const pct = (c.montoPagado / Math.max(c.monto,1)) * 100;
              return (
                <tr key={c.id} style={{ borderBottom:idx<filtradas.length-1?`1px solid ${C.gray100}`:"none", transition:"background .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background="#faf9ff")}
                  onMouseLeave={e => (e.currentTarget.style.background=C.white)}>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:`${C.purple}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Building2 size={16} style={{ color:C.purple }} />
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.gray900 }}>{c.clienteEmpresa || c.clienteNombre}</div>
                        <div style={{ fontSize:11, color:C.gray500 }}>{c.clienteEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{ fontSize:13, fontWeight:600, color:C.purple }}>{c.numeroPedido || "—"}</span>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{ fontSize:14, fontWeight:800, color:C.gray900 }}>{fmtPEN(c.monto)}</span>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#16a34a" }}>{fmtPEN(c.montoPagado)}</div>
                      <div style={{ marginTop:4, height:4, borderRadius:4, background:C.gray100, overflow:"hidden", width:80 }}>
                        <div style={{ height:"100%", borderRadius:4, width:`${pct}%`, background:`linear-gradient(90deg,${C.green},${C.purple})` }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{ fontSize:14, fontWeight:900, color:c.saldoPendiente > 0 ? C.orange : "#16a34a" }}>{fmtPEN(c.saldoPendiente)}</span>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:13, color: c.estado==="vencida" ? C.red : C.gray700, fontWeight: c.estado==="vencida" ? 700 : 400 }}>
                      {c.fechaVencimiento?.toDate
                        ? c.fechaVencimiento.toDate().toLocaleDateString("es-PE")
                        : "—"}
                      {c.estado === "vencida" && (
                        <div style={{ fontSize:11, color:C.red, marginTop:2 }}>{diasVenc}d vencida</div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <EstadoBadge estado={c.estado} />
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", justifyContent:"flex-end", gap:6 }}>
                      {c.estado !== "pagada" && c.estado !== "incobrable" && (
                        <button onClick={() => setPagarModal(c)}
                          style={{ padding:"6px 14px", borderRadius:9, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`, color:C.white, border:"none", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                          💳 Registrar pago
                        </button>
                      )}
                      {c.estado === "vencida" && (
                        <button onClick={() => updateDoc(doc(db,"cuentas_cobrar",c.id),{estado:"incobrable"})}
                          style={{ padding:"6px 12px", borderRadius:9, background:"#1e293b", color:"#94a3b8", border:"none", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                          Incobrable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagarModal  && <ModalPago cuenta={pagarModal} onClose={() => setPagarModal(null)} onSaved={() => {}} />}
      {nuevaModal  && <ModalNuevaCuenta onClose={() => setNuevaModal(false)} onSaved={() => {}} />}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes dashIn { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1}50%{opacity:.5} }
        .dash-in { animation: dashIn .4s cubic-bezier(.4,0,.2,1); }
      `}</style>
    </div>
  );
}