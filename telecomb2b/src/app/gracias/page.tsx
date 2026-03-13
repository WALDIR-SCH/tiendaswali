"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { 
  CheckCircle2, Printer, ShieldCheck, 
  Package, Calendar, Hash, CreditCard, ArrowRight, ShoppingBag 
} from "lucide-react";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

function GraciasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderId = searchParams.get("orderId") || "TRX-000000";
  const total = searchParams.get("total") || "0";
  const nombreProducto = searchParams.get("item") || "Equipos de Telecomunicación";
  const cantidadItems = searchParams.get("qty") || "1";
  
  const fecha = new Date().toLocaleString('es-PE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // --- FUNCIÓN PARA GENERAR LA BOLETA REAL ---
  const generarBoletaReal = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;

    ventana.document.write(`
      <html>
        <head>
          <title>Boleta_${orderId}</title>
          <style>
            @page { size: 80mm 200mm; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 70mm; 
              padding: 5mm; 
              color: #000;
              font-size: 12px;
              line-height: 1.2;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .header h2 { margin: 0; font-size: 16px; }
            .items-table { width: 100%; border-collapse: collapse; }
            .items-table th { border-bottom: 1px solid #000; text-align: left; }
            .total-section { margin-top: 10px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="text-center header">
            <h2>TELECOM B2B S.A.C.</h2>
            <p>RUC: 20123456789<br/>Av. Tecnología 123, Lima</p>
          </div>
          
          <div class="divider"></div>
          
          <div>
            <p>FECHA: ${fecha}</p>
            <p>ORDEN: #${orderId.toUpperCase()}</p>
            <p>ESTADO: PAGADO (ONLINE)</p>
          </div>
          
          <div class="divider"></div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>CANT</th>
                <th>DESC</th>
                <th class="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${cantidadItems}</td>
                <td>${nombreProducto.substring(0, 18)}...</td>
                <td class="text-right">$${Number(total).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="total-section text-right bold">
            TOTAL: $${Number(total).toLocaleString()}
          </div>
          
          <div class="divider" style="margin-top: 20px;"></div>
          
          <div class="text-center">
            <p>¡Gracias por su confianza!</p>
            <p style="font-size: 8px;">Comprobante de pago electrónico generado por Telecom B2B</p>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <div className={`${inter.className} min-h-screen bg-slate-100 flex items-center justify-center p-4`}>
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-500">
        
        {/* HEADER */}
        <div className="bg-white p-8 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full mb-4 shadow-inner">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
            Gracias por su compra
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
            Confirmación de Recepción de Pedido
          </p>
        </div>

        <div className="px-8 pb-8 space-y-6">
          
          {/* DATOS DE LA OPERACIÓN */}
          <div className="bg-slate-50 rounded-3xl p-6 space-y-3 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Hash size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Orden ID</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-900">
                {orderId.toUpperCase()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Fecha y Hora</span>
              </div>
              <span className="text-[11px] font-bold text-slate-900">{fecha}</span>
            </div>
          </div>

          {/* DETALLE DINÁMICO DEL PRODUCTO */}
          <div className="px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <ShoppingBag size={14} /> Detalle de Artículos
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="max-w-[70%]">
                  <p className="text-xs font-black text-slate-900 uppercase italic leading-tight">
                    {nombreProducto}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-bold italic">
                    {Number(cantidadItems) > 1 
                      ? `Y otros ${Number(cantidadItems) - 1} productos adicionales` 
                      : "Unidad individual certificada"}
                  </p>
                </div>
                <span className="text-sm font-black text-slate-900">
                  ${Number(total).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-2 text-emerald-600 border-t border-dashed border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Package size={12} /> Envío B2B Logística
                </span>
                <span className="text-[10px] font-black uppercase italic">Bonificado</span>
              </div>
            </div>
          </div>

          {/* TOTAL FINAL */}
          <div className="bg-slate-900 rounded-4xl p-6 text-white flex justify-between items-center shadow-xl shadow-blue-900/10">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Total Pagado</p>
              <h2 className="text-3xl font-black italic tracking-tighter">${Number(total).toLocaleString()}</h2>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                <ShieldCheck size={24} className="text-emerald-400" />
            </div>
          </div>

          {/* BOTONES */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={generarBoletaReal} 
              className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-slate-900 text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm"
            >
              <Printer size={16} /> Boleta Real
            </button>
            <button 
              onClick={() => router.push("/catalogo")}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              Finalizar <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em] leading-relaxed">
            Este ticket es un comprobante de pedido.<br/>
            Telecom B2B SAC · Lima, Perú · 2026
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GraciasPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-white italic font-black text-slate-400 animate-pulse uppercase tracking-[0.5em]">
            Procesando...
        </div>
    }>
      <GraciasContent />
    </Suspense>
  );
}