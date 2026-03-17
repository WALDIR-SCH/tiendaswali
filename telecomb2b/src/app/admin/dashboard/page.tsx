"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, doc, getDoc, updateDoc, deleteDoc, setDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

interface Producto   { id:string; nombre?:string; nombre_producto?:string; precio_caja?:number; precio_unitario?:number; stock_cajas?:number; stock_unidades?:number; stock_minimo_cajas?:number; stockMinimo?:number; }
interface Pedido     { id:string; numero?:string; cliente?:string; empresa?:string; total?:number; monto?:number; estado?:string; fecha?:any; }
interface Cliente    { id:string; empresa?:string; nombre?:string; email?:string; estado?:string; acceso_catalogo?:boolean; }
interface Cotizacion { id:string; numero?:string; cliente?:string; total?:number; estado?:string; fecha?:any; }
interface AdminUser  { id:string; email?:string; nombre?:string; rol?:string; cargo?:string; estado?:string; superadmin?:boolean; fecha_registro?:any; }

const C = {
  purple:"#9851F9", purpleDark:"#7C35E0", purpleDeep:"#5B1FBE",
  green:"#28FB4B",  yellow:"#F6FA00", orange:"#FF6600",
  white:"#FFFFFF",  gray50:"#f9fafb", gray100:"#f3f4f6",
  gray200:"#e5e7eb",gray500:"#6b7280",gray900:"#111827",
  red:"#dc2626",
};

const fmtPEN = (n:number) => new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN",minimumFractionDigits:0}).format(n||0);

const ESTADO_MAP: Record<string,{label:string;bg:string;color:string;dot:string}> = {
  completado:{ label:"Completado", bg:`${C.green}18`,  color:"#16a34a", dot:C.green  },
  procesando:{ label:"Procesando", bg:`${C.purple}14`, color:C.purple,  dot:C.purple },
  enviado:   { label:"Enviado",    bg:`${C.yellow}25`, color:"#a09600", dot:C.yellow },
  pendiente: { label:"Pendiente",  bg:`${C.orange}14`, color:C.orange,  dot:C.orange },
  confirmado:{ label:"Confirmado", bg:`${C.purple}14`, color:C.purple,  dot:C.purple },
  entregado: { label:"Entregado",  bg:`${C.green}18`,  color:"#16a34a", dot:C.green  },
  cancelado: { label:"Cancelado",  bg:"#fef2f2",       color:"#dc2626", dot:"#dc2626"},
};

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(255,255,255,0.97)", border:`1px solid ${C.purple}28`, borderRadius:14, padding:"10px 16px", boxShadow:`0 12px 40px ${C.purple}20` }}>
      <div style={{ fontSize:11, color:C.gray500, marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map((p:any,i:number) => (
        <div key={i} style={{ fontSize:13, fontWeight:800, color:p.color, marginTop:3, display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:p.color }}/>
          {p.name}: {p.name==="Ventas"?fmtPEN(p.value):p.value}
        </div>
      ))}
    </div>
  );
};

function KPICard({ title, value, change, positive, icon, accent, loading }: {
  title:string; value:string; change:string; positive:boolean; icon:string; accent:string; loading?:boolean;
}) {
  return (
    <div className="kpi-card" style={{
      background:"rgba(255,255,255,0.9)", backdropFilter:"blur(16px)",
      borderRadius:18, padding:"22px 20px", border:`1px solid ${accent}30`,
      position:"relative", overflow:"hidden", boxShadow:`0 4px 24px ${accent}18`,
      transition:"transform .2s, box-shadow .2s",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:accent, borderRadius:"18px 18px 0 0", boxShadow:`0 0 12px ${accent}80` }}/>
      <div style={{ position:"absolute", top:-30, right:-30, width:110, height:110, borderRadius:"50%", background:accent, opacity:0.07, filter:"blur(22px)" }}/>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:`${accent}18`, border:`1.5px solid ${accent}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{icon}</div>
        <span style={{ fontSize:11, fontWeight:800, padding:"4px 10px", borderRadius:20, background:positive?`${C.green}18`:`${C.orange}18`, color:positive?"#16a34a":C.orange, border:`1px solid ${positive?C.green+"30":C.orange+"30"}` }}>{change}</span>
      </div>
      {loading
        ? <div style={{ height:28, width:"60%", borderRadius:8, background:`${accent}18`, animation:"pulse 1.4s ease infinite" }}/>
        : <div style={{ fontSize:28, fontWeight:900, color:C.gray900, letterSpacing:"-0.04em", lineHeight:1 }}>{value}</div>
      }
      <div style={{ fontSize:12, color:C.gray500, marginTop:7, fontWeight:600 }}>{title}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PANEL GESTIÓN DE ADMINS
══════════════════════════════════════════════ */
function PanelAdmins({ esSuperadmin }: { esSuperadmin: boolean }) {
  const [admins,       setAdmins]       = useState<AdminUser[]>([]);
  const [loadingAdmins,setLoadingAdmins]= useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [formEmail,    setFormEmail]    = useState("");
  const [formNombre,   setFormNombre]   = useState("");
  const [formRol,      setFormRol]      = useState<"admin"|"seller">("seller");
  const [formPassword, setFormPassword] = useState("");
  const [formCargo,    setFormCargo]    = useState("");
  const [creando,      setCreando]      = useState(false);
  const [confirmDelete,setConfirmDelete]= useState<string|null>(null);

  const cargarAdmins = async () => {
    try {
      const snap = await getDocs(collection(db, "usuarios"));
      const lista = snap.docs
        .map(d => ({ id:d.id, ...d.data() } as AdminUser))
        .filter(u => u.rol === "admin" || u.rol === "seller");
      setAdmins(lista);
    } catch { console.error("Error cargando admins"); }
    finally { setLoadingAdmins(false); }
  };

  useEffect(() => { cargarAdmins(); }, []);

  const crearAdmin = async () => {
    if (!formEmail || !formPassword || !formNombre) {
      alert("Completa todos los campos obligatorios"); return;
    }
    if (formPassword.length < 8) { alert("La contraseña debe tener al menos 8 caracteres"); return; }
    setCreando(true);
    try {
      // Crear en Firebase Auth con una instancia secundaria
      const secondaryApp = getAuth();
      const cred = await createUserWithEmailAndPassword(secondaryApp, formEmail, formPassword);
      const uid  = cred.user.uid;

      // Crear documento en Firestore
      await setDoc(doc(db, "usuarios", uid), {
        email:           formEmail,
        nombre:          formNombre,
        rol:             formRol,
        cargo:           formCargo || (formRol==="admin" ? "Administrador" : "Vendedor"),
        estado:          "activo",
        verificado:      true,
        acceso_catalogo: true,
        superadmin:      false,
        fecha_registro:  Timestamp.now(),
      });

      await cargarAdmins();
      setShowForm(false);
      setFormEmail(""); setFormNombre(""); setFormPassword(""); setFormCargo("");
      alert(`✅ ${formRol==="admin"?"Administrador":"Vendedor"} creado correctamente.`);
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") alert("❌ Ese email ya está registrado");
      else alert("❌ Error al crear la cuenta: " + e.message);
    }
    finally { setCreando(false); }
  };

  const cambiarRolAdmin = async (id:string, nuevoRol:string) => {
    const admin = admins.find(a=>a.id===id);
    if (admin?.superadmin) { alert("No puedes cambiar el rol del superadmin"); return; }
    try {
      await updateDoc(doc(db,"usuarios",id), { rol:nuevoRol });
      setAdmins(p => p.map(a => a.id===id ? { ...a, rol:nuevoRol } : a));
    } catch { alert("Error al cambiar rol"); }
  };

  const suspenderAdmin = async (id:string) => {
    const admin = admins.find(a=>a.id===id);
    if (admin?.superadmin) { alert("No puedes suspender al superadmin"); return; }
    try {
      const nuevoEstado = admin?.estado==="activo" ? "suspendido" : "activo";
      await updateDoc(doc(db,"usuarios",id), { estado:nuevoEstado });
      setAdmins(p => p.map(a => a.id===id ? { ...a, estado:nuevoEstado } : a));
    } catch { alert("Error al actualizar estado"); }
  };

  const eliminarAdmin = async (id:string) => {
    const admin = admins.find(a=>a.id===id);
    if (admin?.superadmin) { alert("El superadmin no puede ser eliminado"); setConfirmDelete(null); return; }
    try {
      // Solo eliminamos el documento de Firestore
      // Para eliminar de Auth se necesita la Admin SDK (backend)
      await deleteDoc(doc(db,"usuarios",id));
      setAdmins(p => p.filter(a => a.id!==id));
      setConfirmDelete(null);
      alert("✅ Colaborador eliminado del sistema.\nNota: Para revocar el acceso de autenticación contacta al administrador de Firebase.");
    } catch { alert("Error al eliminar"); }
  };

  const card: React.CSSProperties = {
    background:"rgba(255,255,255,0.9)", backdropFilter:"blur(16px)",
    borderRadius:18, border:`1px solid ${C.purple}14`,
    boxShadow:`0 4px 24px ${C.purple}08`,
  };

  return (
    <div style={{ ...card, padding:"26px", marginBottom:22 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h3 style={{ fontSize:15, fontWeight:800, color:C.gray900, margin:0 }}>
            👥 Equipo Administrativo
          </h3>
          <p style={{ fontSize:11, color:C.gray500, margin:"3px 0 0" }}>
            Gestiona admins y vendedores del sistema
          </p>
        </div>
        {esSuperadmin && (
          <button onClick={()=>setShowForm(!showForm)}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 18px", borderRadius:12,
              background: showForm ? C.gray100 : `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
              color: showForm ? C.gray500 : "#fff", fontSize:12, fontWeight:800, border:"none", cursor:"pointer",
              boxShadow: showForm ? "none" : `0 4px 16px ${C.purple}40`, transition:"all .2s" }}>
            {showForm ? "✕ Cancelar" : "+ Agregar colaborador"}
          </button>
        )}
      </div>

      {/* Formulario crear */}
      {showForm && esSuperadmin && (
        <div style={{ marginBottom:20, padding:20, borderRadius:14, background:`${C.purple}06`, border:`1px solid ${C.purple}20` }}>
          <p style={{ fontSize:12, fontWeight:800, color:C.purple, marginBottom:14, textTransform:"uppercase", letterSpacing:"0.1em" }}>
            Nuevo Colaborador
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", display:"block", marginBottom:5 }}>
                Nombre completo *
              </label>
              <input value={formNombre} onChange={e=>setFormNombre(e.target.value)} placeholder="Juan Pérez"
                style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.currentTarget.style.borderColor=C.purple}
                onBlur={e=>e.currentTarget.style.borderColor=C.gray200}/>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", display:"block", marginBottom:5 }}>
                Email *
              </label>
              <input type="email" value={formEmail} onChange={e=>setFormEmail(e.target.value)} placeholder="vendedor@empresa.com"
                style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.currentTarget.style.borderColor=C.purple}
                onBlur={e=>e.currentTarget.style.borderColor=C.gray200}/>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", display:"block", marginBottom:5 }}>
                Contraseña * (mín. 8 caracteres)
              </label>
              <input type="password" value={formPassword} onChange={e=>setFormPassword(e.target.value)} placeholder="••••••••"
                style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.currentTarget.style.borderColor=C.purple}
                onBlur={e=>e.currentTarget.style.borderColor=C.gray200}/>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", display:"block", marginBottom:5 }}>
                Cargo (opcional)
              </label>
              <input value={formCargo} onChange={e=>setFormCargo(e.target.value)} placeholder="Ej: Asesor Comercial"
                style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.currentTarget.style.borderColor=C.purple}
                onBlur={e=>e.currentTarget.style.borderColor=C.gray200}/>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:10, fontWeight:700, color:C.gray500, textTransform:"uppercase", display:"block", marginBottom:8 }}>
              Nivel de acceso *
            </label>
            <div style={{ display:"flex", gap:10 }}>
              {[
                { val:"seller", label:"🛒 Vendedor", desc:"Dashboard, catálogo, pedidos, POS" },
                { val:"admin",  label:"⚙️ Admin",    desc:"Todo excepto superadmin" },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={()=>setFormRol(opt.val as "admin"|"seller")}
                  style={{ flex:1, padding:"10px 14px", borderRadius:11, border:`2px solid ${formRol===opt.val?C.purple:C.gray200}`,
                    background:formRol===opt.val?`${C.purple}10`:C.white, cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:formRol===opt.val?C.purple:C.gray900 }}>{opt.label}</div>
                  <div style={{ fontSize:10, color:C.gray500, marginTop:3 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding:"10px 14px", borderRadius:10, background:`${C.orange}08`, border:`1px solid ${C.orange}20`, marginBottom:14 }}>
            <p style={{ fontSize:11, color:C.orange, fontWeight:600, margin:0 }}>
              ⚠️ La cuenta se crea en Firebase Authentication. Guarda las credenciales de forma segura.
            </p>
          </div>
          <button onClick={crearAdmin} disabled={creando || !formEmail || !formPassword || !formNombre}
            style={{ padding:"10px 24px", borderRadius:11, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
              color:"#fff", fontSize:13, fontWeight:800, border:"none", cursor:"pointer",
              opacity: creando || !formEmail || !formPassword || !formNombre ? 0.5 : 1,
              boxShadow:`0 4px 14px ${C.purple}40` }}>
            {creando ? "Creando cuenta..." : `Crear ${formRol==="admin"?"Administrador":"Vendedor"}`}
          </button>
        </div>
      )}

      {/* Lista de admins */}
      {loadingAdmins ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"30px 0", gap:10, color:C.gray500, fontSize:13 }}>
          <div style={{ width:20, height:20, border:`2px solid ${C.purple}28`, borderTopColor:C.purple, borderRadius:"50%", animation:"spin .75s linear infinite" }}/>
          Cargando equipo...
        </div>
      ) : admins.length === 0 ? (
        <div style={{ textAlign:"center", padding:"30px 0", color:C.gray500, fontSize:13 }}>
          Sin colaboradores registrados
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {admins.map(a => (
            <div key={a.id} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 16px", borderRadius:13,
              background: a.estado==="suspendido" ? "#fef2f2" : "rgba(255,255,255,0.7)",
              border:`1px solid ${a.superadmin ? `${C.purple}35` : a.estado==="suspendido" ? "#fecaca" : C.gray200}`,
              opacity: a.estado==="suspendido" ? 0.75 : 1,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:11, flexShrink:0,
                  background: a.superadmin ? `linear-gradient(135deg,${C.purple},${C.purpleDark})` : a.rol==="admin" ? `${C.purple}18` : `${C.orange}18`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:16, fontWeight:900, color: a.superadmin ? "#fff" : a.rol==="admin" ? C.purple : C.orange }}>
                  {a.nombre?.[0]?.toUpperCase() || a.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.gray900 }}>
                      {a.nombre || a.email?.split("@")[0] || "—"}
                    </span>
                    {a.superadmin && (
                      <span style={{ fontSize:9, fontWeight:900, padding:"2px 7px", borderRadius:20, background:C.purple, color:"#fff" }}>SUPERADMIN</span>
                    )}
                    {!a.superadmin && (
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:20,
                        background: a.rol==="admin" ? `${C.purple}15` : `${C.orange}15`,
                        color: a.rol==="admin" ? C.purple : C.orange }}>
                        {a.rol==="admin" ? "Admin" : "Vendedor"}
                      </span>
                    )}
                    {a.estado==="suspendido" && (
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:20, background:"#fecaca", color:C.red }}>SUSPENDIDO</span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:C.gray500, marginTop:2 }}>
                    {a.email} {a.cargo ? `· ${a.cargo}` : ""}
                  </div>
                </div>
              </div>

              {/* Acciones — solo superadmin puede modificar */}
              {esSuperadmin && !a.superadmin && (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {/* Cambiar rol */}
                  <select value={a.rol||"seller"} onChange={e=>cambiarRolAdmin(a.id,e.target.value)}
                    style={{ fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:9,
                      border:`1px solid ${C.gray200}`, background:C.gray50, color:C.gray500, cursor:"pointer" }}>
                    <option value="seller">Vendedor</option>
                    <option value="admin">Admin</option>
                  </select>
                  {/* Suspender/activar */}
                  <button onClick={()=>suspenderAdmin(a.id)}
                    style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:9,
                      border:`1px solid ${a.estado==="suspendido"?`${C.purple}30`:C.gray200}`,
                      background: a.estado==="suspendido"?`${C.purple}10`:C.gray50,
                      color: a.estado==="suspendido"?C.purple:C.gray500, cursor:"pointer" }}>
                    {a.estado==="suspendido" ? "Activar" : "Suspender"}
                  </button>
                  {/* Eliminar */}
                  {confirmDelete===a.id ? (
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>eliminarAdmin(a.id)}
                        style={{ fontSize:11, fontWeight:800, padding:"5px 12px", borderRadius:9, background:C.red, color:"#fff", border:"none", cursor:"pointer" }}>
                        Confirmar
                      </button>
                      <button onClick={()=>setConfirmDelete(null)}
                        style={{ fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:9, background:C.gray100, color:C.gray500, border:"none", cursor:"pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={()=>setConfirmDelete(a.id)}
                      style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:9,
                        border:`1px solid #fecaca`, background:"#fef2f2", color:C.red, cursor:"pointer" }}>
                      Eliminar
                    </button>
                  )}
                </div>
              )}
              {/* Si es admin normal solo puede ver */}
              {esSuperadmin && a.superadmin && (
                <span style={{ fontSize:11, color:C.gray100, fontStyle:"italic" }}>Protegido · No modificable</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   DASHBOARD PRINCIPAL
══════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [pedidos,    setPedidos]    = useState<Pedido[]>([]);
  const [productos,  setProductos]  = useState<Producto[]>([]);
  const [clientes,   setClientes]   = useState<Cliente[]>([]);
  const [cotizaciones,setCotizaciones]=useState<Cotizacion[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [period,     setPeriod]     = useState<"week"|"month">("week");
  const [userRol,    setUserRol]    = useState<string>("admin");
  const [esSuperadmin,setEsSuperadmin]=useState(false);
  const [tasks, setTasks] = useState([
    { id:1, text:"Revisar cotizaciones pendientes", done:false, p:"alta"  },
    { id:2, text:"Confirmar pedidos de hoy",        done:false, p:"alta"  },
    { id:3, text:"Reponer stock crítico",           done:false, p:"alta"  },
    { id:4, text:"Enviar estados de cuenta",        done:false, p:"media" },
    { id:5, text:"Actualizar precios por volumen",  done:false, p:"baja"  },
  ]);

  // Detectar rol del usuario
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db,"usuarios",u.uid));
          if (snap.exists()) {
            setUserRol(snap.data().rol || "admin");
            setEsSuperadmin(snap.data().superadmin === true);
          }
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  const esSeller = userRol === "seller";

  const hoy      = new Date(); hoy.setHours(0,0,0,0);
  const pedHoy   = pedidos.filter(p => { try { return p.fecha?.toDate?.()?.getTime()>=hoy.getTime(); } catch { return false; } });
  const ventaHoy = pedHoy.reduce((a,p)=>a+(p.total||p.monto||0),0);
  const pendCnt  = pedidos.filter(p=>p.estado==="pendiente"||p.estado==="procesando").length;
  const critCnt  = productos.filter(p=>(p.stock_cajas??0)<=(p.stock_minimo_cajas??p.stockMinimo??5)).length;
  const clienteActivos = clientes.filter(c=>c.acceso_catalogo&&c.estado==="verificado").length;
  const ventaMes = pedidos.reduce((a,p)=>a+(p.total||p.monto||0),0);
  const cotPend  = cotizaciones.filter(c=>c.estado==="pendiente"||c.estado==="enviada").length;

  const buildChartData = () => {
    const days: Record<string,{Ventas:number;Pedidos:number}> = {};
    if (period==="week") {
      for (let i=6;i>=0;i--) {
        const d=new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
        const key=d.toLocaleDateString("es-PE",{weekday:"short"});
        days[key]={Ventas:0,Pedidos:0};
      }
      pedidos.forEach(p=>{ try {
        const d=p.fecha?.toDate?.()??new Date();
        const diff=Math.floor((Date.now()-d.getTime())/86400000);
        if(diff<7){ const key=d.toLocaleDateString("es-PE",{weekday:"short"}); if(days[key]){ days[key].Ventas+=(p.total||p.monto||0); days[key].Pedidos++; } }
      } catch {} });
    } else {
      ["Sem 1","Sem 2","Sem 3","Sem 4"].forEach(s=>{days[s]={Ventas:0,Pedidos:0};});
      pedidos.forEach(p=>{ try {
        const d=p.fecha?.toDate?.()??new Date();
        const diff=Math.floor((Date.now()-d.getTime())/86400000);
        if(diff<28){ const sem=`Sem ${4-Math.floor(diff/7)}`; if(days[sem]){ days[sem].Ventas+=(p.total||p.monto||0); days[sem].Pedidos++; } }
      } catch {} });
    }
    return Object.entries(days).map(([dia,v])=>({dia,...v}));
  };

  const pieData = [
    { name:"Gama Alta",  value:productos.filter(p=>(p.precio_caja??p.precio_unitario??0)>500).length||35,  color:C.purple },
    { name:"Gama Media", value:productos.filter(p=>{ const pr=p.precio_caja??p.precio_unitario??0; return pr>=200&&pr<=500; }).length||40, color:C.orange },
    { name:"Gama Baja",  value:productos.filter(p=>(p.precio_caja??p.precio_unitario??0)<200).length||25,  color:C.green  },
  ];

  useEffect(()=>{
    (async()=>{
      try {
        const [pedSnap,proSnap,cliSnap,cotSnap] = await Promise.all([
          getDocs(query(collection(db,"pedidos"),    orderBy("fecha","desc"),limit(50))),
          getDocs(collection(db,"productos")),
          getDocs(collection(db,"usuarios")),
          getDocs(query(collection(db,"cotizaciones"),orderBy("fecha","desc"),limit(20))),
        ]);
        setPedidos(pedSnap.docs.map(d=>({id:d.id,...d.data()}as Pedido)));
        setProductos(proSnap.docs.map(d=>({id:d.id,...d.data()}as Producto)));
        setClientes(cliSnap.docs.map(d=>({id:d.id,...d.data()}as Cliente)));
        setCotizaciones(cotSnap.docs.map(d=>({id:d.id,...d.data()}as Cotizacion)));
      } catch(e){ console.error(e); }
      finally{ setLoading(false); }
    })();
  },[]);

  const stockCritico     = productos.filter(p=>(p.stock_cajas??0)<=(p.stock_minimo_cajas??p.stockMinimo??5)).slice(0,5);
  const pedidosRecientes = pedidos.slice(0,5);
  const doneCount        = tasks.filter(t=>t.done).length;
  const progressPct      = Math.round((doneCount/tasks.length)*100);

  const card: React.CSSProperties = {
    background:"rgba(255,255,255,0.9)", backdropFilter:"blur(16px)",
    borderRadius:18, border:`1px solid ${C.purple}14`,
    boxShadow:`0 4px 24px ${C.purple}08`,
  };

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", maxWidth:1600 }} className="dash-in">

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:30, fontWeight:900, color:C.gray900, margin:0, letterSpacing:"-0.045em" }}>
            Buen día 👋
            {esSeller && <span style={{ fontSize:14, fontWeight:700, color:C.orange, marginLeft:12, verticalAlign:"middle" }}>· Modo Vendedor</span>}
          </h1>
          <p style={{ fontSize:13, color:C.gray500, margin:"6px 0 0", display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:C.green, display:"inline-block", boxShadow:`0 0 8px ${C.green}` }}/>
            {new Date().toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Link href="/admin/cotizaciones/nueva" className="btn-primary" style={{
            display:"flex", alignItems:"center", gap:8, padding:"11px 20px",
            borderRadius:13, background:`linear-gradient(135deg,${C.purple},${C.purpleDark})`,
            color:"#fff", fontSize:13, fontWeight:800, textDecoration:"none",
            boxShadow:`0 6px 22px ${C.purple}50`,
          }}>📋 Nueva Cotización</Link>
          <Link href="/admin/pedidos/nuevo" className="btn-sec" style={{
            display:"flex", alignItems:"center", gap:8, padding:"11px 20px",
            borderRadius:13, background:"rgba(255,255,255,0.9)", backdropFilter:"blur(12px)",
            border:`1px solid ${C.purple}28`, fontSize:13, fontWeight:700, color:C.purple, textDecoration:"none",
          }}>+ Pedido</Link>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:14, marginBottom:22 }}>
        {[
          { title:"Ventas Hoy",      value:fmtPEN(ventaHoy),       change:"+hoy",       positive:true,          icon:"💰", accent:C.purple },
          { title:"Pedidos Activos", value:String(pendCnt),        change:`${pendCnt} activos`, positive:pendCnt===0, icon:"📦", accent:C.orange },
          { title:"Stock Crítico",   value:String(critCnt),        change:"alertas",    positive:critCnt===0,   icon:"⚡", accent:C.yellow },
          { title:"Clientes B2B",    value:String(clienteActivos), change:"activos",    positive:true,          icon:"🏢", accent:C.green  },
          { title:"Cotizaciones",    value:String(cotPend),        change:"pendientes", positive:cotPend===0,   icon:"📋", accent:C.purple },
          { title:"Ventas del Mes",  value:fmtPEN(ventaMes),       change:"mes actual", positive:true,          icon:"📈", accent:C.purpleDark },
        ].map((k,i)=><KPICard key={i} {...k} loading={loading}/>)}
      </div>

      {/* ── PANEL DE ADMINS — solo visible para superadmin ── */}
      {esSuperadmin && <PanelAdmins esSuperadmin={esSuperadmin}/>}

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:14, marginBottom:22 }}>
        <div style={{ ...card, padding:"26px 26px 18px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:800, color:C.gray900, margin:0 }}>Ventas y Pedidos</h3>
              <p style={{ fontSize:11, color:C.gray500, margin:"3px 0 0" }}>{period==="week"?"Últimos 7 días":"Este mes"} · Datos reales</p>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {(["week","month"] as const).map(p=>(
                <button key={p} onClick={()=>setPeriod(p)} style={{
                  padding:"5px 15px", borderRadius:9, fontSize:11, fontWeight:700, cursor:"pointer",
                  background:period===p?`linear-gradient(135deg,${C.purple},${C.purpleDark})`:`${C.purple}08`,
                  color:period===p?"#fff":C.gray500,
                  border:period===p?"none":`1px solid ${C.purple}20`,
                  boxShadow:period===p?`0 4px 14px ${C.purple}45`:"none",
                }}>{p==="week"?"Semana":"Mes"}</button>
              ))}
            </div>
          </div>
          <div style={{ height:265 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={buildChartData()} margin={{ top:0, right:4, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.purple} stopOpacity={0.2}/><stop offset="95%" stopColor={C.purple} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green}  stopOpacity={0.2}/><stop offset="95%" stopColor={C.green}  stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid stroke={`${C.purple}10`}/>
                <XAxis dataKey="dia" stroke="transparent" tick={{ fontSize:11, fill:C.gray500 }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="l" stroke="transparent" tick={{ fontSize:10, fill:C.gray500 }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="r" orientation="right" stroke="transparent" tick={{ fontSize:10, fill:C.gray500 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Area yAxisId="l" type="monotone" dataKey="Ventas"  stroke={C.purple} strokeWidth={2.5} fill="url(#gv)" dot={false}/>
                <Area yAxisId="r" type="monotone" dataKey="Pedidos" stroke={C.green}  strokeWidth={2.5} fill="url(#gp)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"flex", gap:20, marginTop:10, paddingLeft:4 }}>
            {[{c:C.purple,l:"Ventas (PEN)"},{c:C.green,l:"Pedidos"}].map((it,x)=>(
              <div key={x} style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:26, height:3, borderRadius:3, background:it.c }}/>
                <span style={{ fontSize:11, color:C.gray500, fontWeight:600 }}>{it.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding:"26px" }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:C.gray900, margin:"0 0 4px" }}>Distribución</h3>
          <p style={{ fontSize:11, color:C.gray500, margin:"0 0 16px" }}>Por gama de celulares</p>
          <div style={{ height:175 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:"rgba(255,255,255,0.97)", border:`1px solid ${C.purple}20`, borderRadius:12, fontSize:12 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:8 }}>
            {pieData.map((d,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:d.color, flexShrink:0 }}/>
                <span style={{ fontSize:12, color:"#64748b", flex:1 }}>{d.name}</span>
                <span style={{ fontSize:12, fontWeight:800, color:C.gray900 }}>{d.value} prods</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 290px 290px", gap:14, marginBottom:22 }}>
        {/* Pedidos */}
        <div style={{ ...card, padding:"26px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:800, color:C.gray900, margin:0 }}>Últimos Pedidos</h3>
              <p style={{ fontSize:11, color:C.gray500, margin:"3px 0 0" }}>Datos en tiempo real</p>
            </div>
            <Link href="/admin/pedidos" style={{ fontSize:12, fontWeight:700, color:C.purple, textDecoration:"none", display:"flex", alignItems:"center", gap:5, padding:"5px 14px", borderRadius:9, background:`${C.purple}10`, border:`1px solid ${C.purple}28` }}>Ver todos →</Link>
          </div>
          {loading ? (
            [...Array(4)].map((_,i)=><div key={i} style={{ height:60, borderRadius:13, background:`${C.purple}06`, marginBottom:9, animation:"pulse 1.4s ease infinite" }}/>)
          ) : pedidosRecientes.length===0 ? (
            <div style={{ textAlign:"center", padding:"30px 0", color:C.gray500, fontSize:13 }}>Sin pedidos aún</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {pedidosRecientes.map(p=>{
                const e = ESTADO_MAP[p.estado??"pendiente"]??ESTADO_MAP.pendiente;
                return (
                  <div key={p.id} className="pedido-row" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", borderRadius:13, border:`1px solid ${C.purple}0A`, background:"rgba(255,255,255,0.55)", cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:9, height:9, borderRadius:"50%", background:e.dot, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.gray900 }}>{p.numero||`#${p.id.slice(0,6)}`}</div>
                        <div style={{ fontSize:11, color:C.gray500, marginTop:2 }}>{p.empresa||p.cliente||"—"}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:14, fontWeight:900, color:C.gray900 }}>{fmtPEN(p.total||p.monto||0)}</div>
                      <div style={{ fontSize:10, fontWeight:700, marginTop:4, padding:"2px 9px", borderRadius:20, background:e.bg, color:e.color, display:"inline-block" }}>{e.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock */}
        <div style={{ ...card, padding:"26px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
            <h3 style={{ fontSize:15, fontWeight:800, color:C.gray900, margin:0 }}>Stock Crítico</h3>
            <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, background:`${C.orange}15`, color:C.orange, border:`1px solid ${C.orange}28` }}>{critCnt} alertas</span>
          </div>
          {loading ? (
            [...Array(4)].map((_,i)=><div key={i} style={{ height:50, borderRadius:12, background:`${C.orange}08`, marginBottom:9, animation:"pulse 1.4s ease infinite" }}/>)
          ) : stockCritico.length===0 ? (
            <div style={{ textAlign:"center", padding:"30px 0", color:"#16a34a", fontSize:13 }}>✅ Todo el stock OK</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {stockCritico.map(p=>{
                const s=p.stock_cajas??0, m=p.stock_minimo_cajas??p.stockMinimo??5;
                const pct=Math.min(100,(s/Math.max(m,1))*100);
                const bar=s===0?C.orange:pct<30?C.orange:C.yellow;
                return (
                  <div key={p.id} style={{ padding:"11px 13px", borderRadius:12, background:"rgba(255,255,255,0.55)", border:`1px solid ${C.purple}0A` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:C.gray900, flex:1, marginRight:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {p.nombre_producto||p.nombre||"Producto"}
                      </span>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, flexShrink:0, background:s===0?`${C.orange}15`:`${C.yellow}25`, color:s===0?C.orange:"#a09600" }}>
                        {s===0?"Agotado":`${s}/${m} cajas`}
                      </span>
                    </div>
                    <div style={{ height:5, borderRadius:5, background:`${C.purple}10`, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:5, width:`${pct}%`, background:bar, transition:"width .5s ease" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Link href="/admin/productos" style={{ display:"block", textAlign:"center", marginTop:16, padding:"10px", borderRadius:11, fontSize:12, fontWeight:700, textDecoration:"none", color:C.purple, background:`${C.purple}0E`, border:`1px solid ${C.purple}28` }}>
            Gestionar inventario →
          </Link>
        </div>

        {/* Tareas */}
        <div style={{ ...card, padding:"26px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
            <h3 style={{ fontSize:15, fontWeight:800, color:C.gray900, margin:0 }}>Tareas del Día</h3>
            <span style={{ fontSize:12, fontWeight:700, color:C.gray500 }}>{doneCount}/{tasks.length}</span>
          </div>
          <div style={{ marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
              <span style={{ fontSize:11, color:C.gray500 }}>Progreso</span>
              <span style={{ fontSize:11, fontWeight:800, color:C.purple }}>{progressPct}%</span>
            </div>
            <div style={{ height:6, borderRadius:6, background:`${C.purple}12`, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:6, width:`${progressPct}%`, background:`linear-gradient(90deg,${C.purple},${C.orange})`, transition:"width .5s cubic-bezier(.4,0,.2,1)" }}/>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {tasks.map(t=>{
              const pc=t.p==="alta"?`${C.orange}12`:t.p==="media"?`${C.yellow}20`:`${C.green}12`;
              const tc=t.p==="alta"?C.orange:t.p==="media"?"#a09600":"#16a34a";
              return (
                <div key={t.id} onClick={()=>setTasks(prev=>prev.map(x=>x.id===t.id?{...x,done:!x.done}:x))}
                  className="task-row"
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", borderRadius:11, cursor:"pointer", background:t.done?`${C.green}08`:"transparent" }}>
                  <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:t.done?C.green:"#fff", border:`1.5px solid ${t.done?C.green:`${C.purple}28`}`, transition:"all .2s" }}>
                    {t.done && <svg style={{ width:10, height:10 }} fill="none" stroke="#000" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                  </div>
                  <span style={{ fontSize:12, flex:1, color:t.done?C.gray500:C.gray900, textDecoration:t.done?"line-through":"none" }}>{t.text}</span>
                  <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pc, color:tc }}>{t.p}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cotizaciones pendientes */}
      {cotPend>0 && (
        <div style={{ ...card, padding:"26px", marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:800, color:C.gray900, margin:0 }}>Cotizaciones Pendientes</h3>
              <p style={{ fontSize:11, color:C.gray500, margin:"3px 0 0" }}>Requieren acción</p>
            </div>
            <Link href="/admin/cotizaciones" style={{ fontSize:12, fontWeight:700, color:C.purple, textDecoration:"none", padding:"5px 14px", borderRadius:9, background:`${C.purple}10`, border:`1px solid ${C.purple}28` }}>Ver todas →</Link>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {cotizaciones.filter(c=>c.estado==="pendiente"||c.estado==="enviada").slice(0,4).map(c=>(
              <Link key={c.id} href={`/admin/cotizaciones/${c.id}`} style={{ display:"block", padding:"14px 16px", borderRadius:13, border:`1px solid ${C.purple}18`, background:"rgba(255,255,255,0.55)", textDecoration:"none", transition:"all .15s" }} className="pedido-row">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.gray900 }}>{c.numero||`COT-${c.id.slice(0,6)}`}</span>
                  <span style={{ fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:20, background:`${C.yellow}25`, color:"#a09600" }}>{c.estado}</span>
                </div>
                <div style={{ fontSize:12, color:C.gray500, marginTop:4 }}>{c.cliente||"—"}</div>
                <div style={{ fontSize:16, fontWeight:900, color:C.purple, marginTop:8 }}>{fmtPEN(c.total||0)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes dashIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .dash-in         { animation: dashIn .4s cubic-bezier(.4,0,.2,1); }
        .kpi-card:hover  { transform:translateY(-3px) !important; }
        .btn-primary:hover{ transform:translateY(-2px) !important; }
        .btn-sec:hover   { background:rgba(152,81,249,0.06) !important; }
        .pedido-row:hover{ border-color:rgba(152,81,249,0.22) !important; background:rgba(152,81,249,0.04) !important; }
        .task-row:hover  { background:rgba(152,81,249,0.05) !important; }
      `}</style>
    </div>
  );
}