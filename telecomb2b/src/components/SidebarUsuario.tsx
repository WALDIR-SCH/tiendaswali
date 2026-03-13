"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  User, Building, Package, FileText, 
  CreditCard, Settings, Home, BarChart,
  Shield, Bell, Lock
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard', adminOnly: false },
  { href: '/opciones/perfil', icon: User, label: 'Mi Perfil', adminOnly: false },
  { href: '/opciones/empresa', icon: Building, label: 'Empresa', adminOnly: false },
  { href: '/opciones/pedidos', icon: Package, label: 'Mis Órdenes', adminOnly: false },
  { href: '/opciones/cotizaciones', icon: FileText, label: 'Cotizaciones', adminOnly: false },
  { href: '/opciones/facturacion', icon: CreditCard, label: 'Facturación', adminOnly: false },
  { href: '/opciones/configuracion', icon: Settings, label: 'Configuración', adminOnly: false },
  { href: '/admin', icon: Shield, label: 'Administración', adminOnly: true },
];

export default function SidebarUsuario() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-4">
        <div className="mb-6 px-2">
          <h2 className="text-lg font-bold text-white">Menú Principal</h2>
          <p className="text-sm text-slate-400">Gestión de cuenta B2B</p>
        </div>
        
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-800/50 text-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="px-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Accesos rápidos</h3>
          </div>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all">
              <Bell size={18} />
              <span className="font-medium">Notificaciones</span>
              <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
            </button>
            <Link 
              href="/catalogo"
              className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all"
            >
              <BarChart size={18} />
              <span className="font-medium">Catálogo</span>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}