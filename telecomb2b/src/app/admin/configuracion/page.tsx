"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";

export default function ConfiguracionAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    // 1. MÚLTIPLES CUENTAS BANCARIAS (PERÚ)
    bancos: {
      bcp: { soles: "", dolares: "", cciSoles: "", cciDolares: "" },
      interbank: { soles: "", dolares: "", cciSoles: "", cciDolares: "" },
      bbva: { soles: "", dolares: "", cciSoles: "", cciDolares: "" },
      scotiabank: { soles: "", dolares: "", cciSoles: "", cciDolares: "" }
    },
    yape: "",
    plin: "",
    
    // 2. LOGÍSTICA Y ENVÍOS
    envios: {
      lima: { costo: 15, tiempo: "24-48h" },
      provincia: { costo: 35, tiempo: "3-5 días" },
      transporte: ["Olva", "Shalom", "CargoExpreso", "Otro"],
      recojoTienda: true,
      direccionAlmacen: ""
    },
    
    // 3. FACTURACIÓN Y RUC
    empresa: {
      ruc: "",
      razonSocial: "",
      domicilioFiscal: "",
      facturaElectronica: true,
      detracciones: false,
      montoDetraccion: 700,
      percepcion: false
    },
    
    // 4. REGLAS DE VENTA B2B
    reglas: {
      minimoCompra: 0,
      minimoPorProducto: 0,
      stockCritico: 5,
      descuentosPorVolumen: [
        { cantidad: 50, descuento: 5 },
        { cantidad: 100, descuento: 10 },
        { cantidad: 500, descuento: 15 }
      ],
      bloquearSinLogin: true
    },
    
    // 5. DASHBOARD RÁPIDO (solo visual, se actualiza solo)
    dashboard: {
      ultimaActualizacion: new Date().toISOString()
    },
    
    // CONTACTOS
    wsVentas: "",
    wsSoporte: "",
    emailPedidos: "",
    horarioAtencion: "Lun-Vie 9am-6pm"
  });

  // Cargar configuración
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "ajustes", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        toast.error("Error al cargar configuración");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Guardar cambios
  const guardarCambios = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "ajustes", "global"), config, { merge: true });
      toast.success("✅ Configuración guardada");
    } catch (error) {
      toast.error("❌ Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-[#E5E9F0]">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-48 bg-[#E5E9F0] rounded"></div>
            <div className="h-4 w-32 bg-[#E5E9F0] rounded"></div>
          </div>
          <p className="mt-4 text-[#1E1E1E] font-bold">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* HEADER */}
          <div className="bg-[#1E1E1E] p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-8 bg-[#ff6601] rounded-full"></div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                Panel B2B
              </h1>
              <span className="bg-[#ff6601] text-[#1E1E1E] text-[10px] font-black px-2 py-1 rounded-full uppercase">
                ADMIN
              </span>
            </div>
            <p className="text-[#F5F7FA] text-xs ml-3">
              Configuración general del negocio
            </p>
          </div>

          {/* 5. DASHBOARD RÁPIDO */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E9F0] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[#ff6601] rounded-full"></div>
              <h2 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider">DASHBOARD RÁPIDO</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#F5F7FA] p-3 rounded-xl">
                <p className="text-[10px] text-[#1E1E1E]/60 uppercase">Pedidos hoy</p>
                <p className="text-xl font-black text-[#1E1E1E]">12</p>
              </div>
              <div className="bg-[#F5F7FA] p-3 rounded-xl">
                <p className="text-[10px] text-[#1E1E1E]/60 uppercase">Stock crítico</p>
                <p className="text-xl font-black text-[#ff6601]">3</p>
              </div>
              <div className="bg-[#F5F7FA] p-3 rounded-xl">
                <p className="text-[10px] text-[#1E1E1E]/60 uppercase">Cotizaciones</p>
                <p className="text-xl font-black text-[#1E1E1E]">5</p>
              </div>
              <div className="bg-[#F5F7FA] p-3 rounded-xl">
                <p className="text-[10px] text-[#1E1E1E]/60 uppercase">Ventas mes</p>
                <p className="text-xl font-black text-[#1E1E1E]">S/ 24,500</p>
              </div>
            </div>
          </div>

          {/* GRID PRINCIPAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 3. FACTURACIÓN Y RUC */}
            <div className="bg-white p-5 rounded-2xl border border-[#E5E9F0] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#ff6601] rounded-full"></div>
                <h2 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider">DATOS DE EMPRESA</h2>
              </div>
              <div className="space-y-3">
                <input 
                  type="text"
                  placeholder="RUC"
                  className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm font-medium text-[#1E1E1E]"
                  value={config.empresa.ruc}
                  onChange={(e) => setConfig({
                    ...config, 
                    empresa: {...config.empresa, ruc: e.target.value}
                  })}
                />
                <input 
                  type="text"
                  placeholder="Razón Social"
                  className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm font-medium text-[#1E1E1E]"
                  value={config.empresa.razonSocial}
                  onChange={(e) => setConfig({
                    ...config, 
                    empresa: {...config.empresa, razonSocial: e.target.value}
                  })}
                />
                <input 
                  type="text"
                  placeholder="Domicilio Fiscal"
                  className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm font-medium text-[#1E1E1E]"
                  value={config.empresa.domicilioFiscal}
                  onChange={(e) => setConfig({
                    ...config, 
                    empresa: {...config.empresa, domicilioFiscal: e.target.value}
                  })}
                />
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={config.empresa.detracciones}
                      onChange={(e) => setConfig({
                        ...config, 
                        empresa: {...config.empresa, detracciones: e.target.checked}
                      })}
                      className="w-4 h-4 accent-[#ff6601]"
                    />
                    <span className="text-xs text-[#1E1E1E]">Detracciones</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={config.empresa.percepcion}
                      onChange={(e) => setConfig({
                        ...config, 
                        empresa: {...config.empresa, percepcion: e.target.checked}
                      })}
                      className="w-4 h-4 accent-[#ff6601]"
                    />
                    <span className="text-xs text-[#1E1E1E]">Percepción</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 2. LOGÍSTICA Y ENVÍOS */}
            <div className="bg-white p-5 rounded-2xl border border-[#E5E9F0] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#ff6601] rounded-full"></div>
                <h2 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider">ENVÍOS</h2>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#1E1E1E]/60 uppercase">Lima (S/)</label>
                    <input 
                      type="number"
                      className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm font-bold"
                      value={config.envios.lima.costo}
                      onChange={(e) => setConfig({
                        ...config, 
                        envios: {...config.envios, lima: {...config.envios.lima, costo: Number(e.target.value)}}
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#1E1E1E]/60 uppercase">Provincia (S/)</label>
                    <input 
                      type="number"
                      className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm font-bold"
                      value={config.envios.provincia.costo}
                      onChange={(e) => setConfig({
                        ...config, 
                        envios: {...config.envios, provincia: {...config.envios.provincia, costo: Number(e.target.value)}}
                      })}
                    />
                  </div>
                </div>
                <input 
                  type="text"
                  placeholder="Dirección de almacén (recojo en tienda)"
                  className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm"
                  value={config.envios.direccionAlmacen}
                  onChange={(e) => setConfig({
                    ...config, 
                    envios: {...config.envios, direccionAlmacen: e.target.value}
                  })}
                />
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={config.envios.recojoTienda}
                    onChange={(e) => setConfig({
                      ...config, 
                      envios: {...config.envios, recojoTienda: e.target.checked}
                    })}
                    className="w-4 h-4 accent-[#ff6601]"
                  />
                  <span className="text-xs text-[#1E1E1E]">Permitir recojo en tienda</span>
                </label>
              </div>
            </div>

            {/* 4. REGLAS DE VENTA B2B */}
            <div className="bg-white p-5 rounded-2xl border border-[#E5E9F0] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#ff6601] rounded-full"></div>
                <h2 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider">REGLAS B2B</h2>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#1E1E1E]/60 uppercase">Mínimo general (S/)</label>
                    <input 
                      type="number"
                      className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm font-bold"
                      value={config.reglas.minimoCompra}
                      onChange={(e) => setConfig({
                        ...config, 
                        reglas: {...config.reglas, minimoCompra: Number(e.target.value)}
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#1E1E1E]/60 uppercase">Stock crítico</label>
                    <input 
                      type="number"
                      className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm font-bold"
                      value={config.reglas.stockCritico}
                      onChange={(e) => setConfig({
                        ...config, 
                        reglas: {...config.reglas, stockCritico: Number(e.target.value)}
                      })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={config.reglas.bloquearSinLogin}
                    onChange={(e) => setConfig({
                      ...config, 
                      reglas: {...config.reglas, bloquearSinLogin: e.target.checked}
                    })}
                    className="w-4 h-4 accent-[#ff6601]"
                  />
                  <span className="text-xs text-[#1E1E1E]">Bloquear compra a usuarios no registrados</span>
                </label>
              </div>
            </div>

            {/* WHATSAPP Y CONTACTO */}
            <div className="bg-white p-5 rounded-2xl border border-[#E5E9F0] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#ff6601] rounded-full"></div>
                <h2 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider">CONTACTO</h2>
              </div>
              <div className="space-y-3">
                <input 
                  type="text"
                  placeholder="WhatsApp Ventas"
                  className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm"
                  value={config.wsVentas}
                  onChange={(e) => setConfig({...config, wsVentas: e.target.value})}
                />
                <input 
                  type="text"
                  placeholder="WhatsApp Soporte"
                  className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm"
                  value={config.wsSoporte}
                  onChange={(e) => setConfig({...config, wsSoporte: e.target.value})}
                />
                <input 
                  type="email"
                  placeholder="Email de pedidos"
                  className="w-full p-3 bg-[#F5F7FA] border border-[#E5E9F0] rounded-xl text-sm"
                  value={config.emailPedidos}
                  onChange={(e) => setConfig({...config, emailPedidos: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* 1. MÚLTIPLES CUENTAS BANCARIAS - SECCIÓN COMPLETA */}
          <div className="bg-[#1E1E1E] p-5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 bg-[#ff6601] rounded-full"></div>
              <h2 className="text-xs font-black text-white uppercase tracking-wider">BANCOS PERÚ</h2>
              <span className="bg-[#ff6601] text-[#1E1E1E] text-[8px] font-black px-2 py-0.5 rounded-full">SOLES / USD</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BCP */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h3 className="text-white font-black text-sm mb-3">🇵🇪 BCP</h3>
                <div className="space-y-2">
                  <input 
                    placeholder="Cuenta Soles"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.bcp.soles}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, bcp: {...config.bancos.bcp, soles: e.target.value}}
                    })}
                  />
                  <input 
                    placeholder="CCI Soles"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.bcp.cciSoles}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, bcp: {...config.bancos.bcp, cciSoles: e.target.value}}
                    })}
                  />
                  <input 
                    placeholder="Cuenta Dólares"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.bcp.dolares}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, bcp: {...config.bancos.bcp, dolares: e.target.value}}
                    })}
                  />
                </div>
              </div>
              
              {/* INTERBANK */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h3 className="text-white font-black text-sm mb-3">🏦 INTERBANK</h3>
                <div className="space-y-2">
                  <input 
                    placeholder="Cuenta Soles"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.interbank.soles}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, interbank: {...config.bancos.interbank, soles: e.target.value}}
                    })}
                  />
                  <input 
                    placeholder="CCI Soles"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.interbank.cciSoles}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, interbank: {...config.bancos.interbank, cciSoles: e.target.value}}
                    })}
                  />
                  <input 
                    placeholder="Cuenta Dólares"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.interbank.dolares}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, interbank: {...config.bancos.interbank, dolares: e.target.value}}
                    })}
                  />
                </div>
              </div>
              
              {/* BBVA */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h3 className="text-white font-black text-sm mb-3">💙 BBVA</h3>
                <div className="space-y-2">
                  <input 
                    placeholder="Cuenta Soles"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.bbva.soles}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, bbva: {...config.bancos.bbva, soles: e.target.value}}
                    })}
                  />
                  <input 
                    placeholder="CCI Soles"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.bbva.cciSoles}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, bbva: {...config.bancos.bbva, cciSoles: e.target.value}}
                    })}
                  />
                  <input 
                    placeholder="Cuenta Dólares"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.bbva.dolares}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, bbva: {...config.bancos.bbva, dolares: e.target.value}}
                    })}
                  />
                </div>
              </div>
              
              {/* SCOTIABANK */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h3 className="text-white font-black text-sm mb-3">🔴 SCOTIABANK</h3>
                <div className="space-y-2">
                  <input 
                    placeholder="Cuenta Soles"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.scotiabank.soles}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, scotiabank: {...config.bancos.scotiabank, soles: e.target.value}}
                    })}
                  />
                  <input 
                    placeholder="CCI Soles"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.scotiabank.cciSoles}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, scotiabank: {...config.bancos.scotiabank, cciSoles: e.target.value}}
                    })}
                  />
                  <input 
                    placeholder="Cuenta Dólares"
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                    value={config.bancos.scotiabank.dolares}
                    onChange={(e) => setConfig({
                      ...config, 
                      bancos: {...config.bancos, scotiabank: {...config.bancos.scotiabank, dolares: e.target.value}}
                    })}
                  />
                </div>
              </div>
            </div>

            {/* YAPE / PLIN */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-[10px] text-white/60 uppercase">🟡 Yape</label>
                <input 
                  placeholder="Número"
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                  value={config.yape}
                  onChange={(e) => setConfig({...config, yape: e.target.value})}
                />
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-[10px] text-white/60 uppercase">🔵 Plin</label>
                <input 
                  placeholder="Número"
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
                  value={config.plin}
                  onChange={(e) => setConfig({...config, plin: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* BOTÓN GUARDAR */}
          <button 
            onClick={guardarCambios}
            disabled={saving}
            className="w-full bg-[#ff6601] text-[#1E1E1E] py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white transition-all disabled:opacity-50 shadow-lg shadow-[#ff6601]/20"
          >
            {saving ? "GUARDANDO CONFIGURACIÓN..." : "GUARDAR TODOS LOS CAMBIOS"}
          </button>

          {/* FOOTER */}
          <div className="text-center pt-2">
            <p className="text-[8px] font-black text-[#1E1E1E]/40 uppercase tracking-widest">
              PANEL DE ADMINISTRACIÓN B2B · PERÚ
            </p>
          </div>
        </div>
      </div>
    </>
  );
}