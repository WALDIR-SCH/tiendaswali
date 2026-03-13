"use client";
import { useEffect, useState } from "react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { 
  ChevronDown, User, Briefcase, LogOut, ShoppingCart, Zap, 
  ShieldCheck, UserPlus, LayoutGrid, Building, Mail, Phone, 
  MapPin, Settings, Package, FileText, CreditCard, Bell,
  Globe
} from "lucide-react";
import { useCart } from "@/context/CartContext"; 
import { useLanguage } from '@/context/LanguageContext';
import MiniCart from "./MiniCart";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalArticulos, abrirCarrito } = useCart();  
  const { language, setLanguage, t } = useLanguage();
  const [usuario, setUsuario] = useState<FirebaseUser | null>(null);
  const [datosExtra, setDatosExtra] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ SCROLL - SIN CAMBIOS
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ AUTH - SIN CAMBIOS
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      if (user) {
        setLoading(true);
        const docRef = doc(db, "usuarios", user.uid);
        const unsubDocs = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setDatosExtra(docSnap.data());
          }
          setLoading(false);
        });
        return () => unsubDocs();
      } else {
        setDatosExtra(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // ✅ IDIOMA - VERSIÓN ULTRA SIMPLE (SIN ERRORES)
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      const newLang = event.detail;
      // 🟢 SOLO ACTUALIZAR SI ES DIFERENTE - EL CONTEXTO YA PREVIENE CICLOS
      if (newLang && newLang !== language) {
        setLanguage(newLang);
      }
    };
    
    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
  }, [language, setLanguage]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const toggleLanguage = () => {
    const newLanguage = language === 'es' ? 'en' : 'es';
    setLanguage(newLanguage);
  };

  if (pathname.startsWith('/admin')) return null;

  const nombreAMostrar = datosExtra?.nombre || usuario?.displayName || t('user.guest');
  const nombreEmpresa = datosExtra?.nombreComercial || datosExtra?.razonSocial || t('company.none');
  const cargo = datosExtra?.cargo || t('position.notAssigned');
  const rol = datosExtra?.rol || "cliente";

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTranslatedRole = () => {
    if (rol === 'admin') return t('role.admin');
    if (rol === 'seller') return t('role.seller');
    return t('role.client');
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full z-30 px-6 transition-all duration-300 ${
        scrolled 
          ? "py-3 bg-gradient-to-r from-slate-900/95 via-blue-900/95 to-slate-900/95 backdrop-blur-xl shadow-xl shadow-blue-900/30" 
          : "py-5 bg-gradient-to-r from-slate-900/90 via-blue-900/90 to-slate-900/90 backdrop-blur-lg"
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          <Link href="/" className="flex items-center">
            <div className="relative p-1 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600" />
              <div className="relative z-10 flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-slate-900/95 to-slate-950/95 rounded-xl">
                <div className="animate-pulse">
                  <Zap size={28} className="text-cyan-400" />
                </div>
                <div className="flex flex-col">
                  <h1 className="font-black text-white text-2xl uppercase tracking-tighter leading-tight">
                    TELECOM<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">B2B</span>
                  </h1>
                  <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-blue-500/50 rounded-full"></div>
                </div>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            
            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                scrolled
                  ? 'bg-slate-800/50 hover:bg-slate-700/50'
                  : 'bg-slate-800/30 hover:bg-slate-700/30'
              }`}
              aria-label={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            >
              <Globe size={18} className="text-cyan-400" />
              <span className="text-sm font-medium text-white">
                {language === 'es' ? 'ES' : 'EN'}
              </span>
            </button>

            {usuario ? (
              <div className="flex items-center gap-4">
                {datosExtra?.acceso_catalogo && (
                  <Link 
                    href="/catalogo" 
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <LayoutGrid size={18} className="text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {t('nav.catalog')}
                    </span>
                  </Link>
                )}

                <button 
                  onClick={abrirCarrito}
                  className="relative p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label={t('nav.cart')}
                >
                  <ShoppingCart size={20} className="text-white" />
                  {totalArticulos > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center">
                      {totalArticulos}
                    </span>
                  )}
                </button>

                <button 
                  className="relative p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label={t('notifications.title')}
                >
                  <Bell size={20} className="text-white" />
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>

                <div className="relative">
                  <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    aria-label={t('user.menu')}
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400/50 flex items-center justify-center bg-slate-800">
                      {datosExtra?.fotoPerfil ? (
                        <img 
                          src={datosExtra.fotoPerfil} 
                          alt={t('user.avatar')} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-lg font-bold text-cyan-400">
                          {getInitials(nombreAMostrar)}
                        </div>
                      )}
                      {datosExtra?.verificado && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full">
                          <ShieldCheck size={12} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-bold text-white truncate max-w-[120px]">
                        {nombreAMostrar}
                      </span>
                      <span className="text-xs text-slate-400 truncate max-w-[120px]">
                        {cargo}
                      </span>
                    </div>
                    <ChevronDown size={16} className={`text-cyan-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {menuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setMenuOpen(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-cyan-400 flex items-center justify-center bg-slate-800">
                              {datosExtra?.fotoPerfil ? (
                                <img 
                                  src={datosExtra.fotoPerfil} 
                                  alt={t('user.avatar')} 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="text-lg font-bold text-cyan-400">
                                  {getInitials(nombreAMostrar)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-white truncate">{nombreAMostrar}</h3>
                              <p className="text-xs text-slate-400 truncate">{nombreEmpresa}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300">
                                  {cargo}
                                </span>
                                {datosExtra?.verificado && (
                                  <span className="text-xs px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded-full flex items-center gap-1">
                                    <ShieldCheck size={10} />
                                    {t('status.verified')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {datosExtra?.email && (
                            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                              <Mail size={12} />
                              <span className="truncate">{datosExtra.email}</span>
                            </div>
                          )}
                        </div>

                        <div className="p-2">
                          <Link 
                            href="/opciones/perfil" 
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            onClick={() => setMenuOpen(false)}
                          >
                            <User size={18} className="text-cyan-400"/> 
                            <div className="flex-1">
                              <span>{t('menu.profile')}</span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {t('menu.profileDescription')}
                              </p>
                            </div>
                          </Link>

                          <Link 
                            href="/opciones/empresa" 
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            onClick={() => setMenuOpen(false)}
                          >
                            <Building size={18} className="text-cyan-400"/> 
                            <div className="flex-1">
                              <span>{t('menu.company')}</span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {t('menu.companyDescription')}
                              </p>
                            </div>
                          </Link>

                          <Link 
                            href="/opciones/pedidos" 
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            onClick={() => setMenuOpen(false)}
                          >
                            <Package size={18} className="text-cyan-400"/> 
                            <div className="flex-1">
                              <span>{t('menu.orders')}</span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {t('menu.ordersDescription')}
                              </p>
                            </div>
                          </Link>

                          <Link 
                            href="/opciones/cotizaciones" 
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            onClick={() => setMenuOpen(false)}
                          >
                            <FileText size={18} className="text-cyan-400"/> 
                            <div className="flex-1">
                              <span>{t('menu.quotations')}</span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {t('menu.quotationsDescription')}
                              </p>
                            </div>
                          </Link>

                          <Link 
                            href="/opciones/facturacion" 
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            onClick={() => setMenuOpen(false)}
                          >
                            <CreditCard size={18} className="text-cyan-400"/> 
                            <div className="flex-1">
                              <span>{t('menu.billing')}</span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {t('menu.billingDescription')}
                              </p>
                            </div>
                          </Link>

                          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent my-2"></div>

                          <Link 
                            href="/opciones/configuracion" 
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            onClick={() => setMenuOpen(false)}
                          >
                            <Settings size={18} className="text-cyan-400"/> 
                            <div className="flex-1">
                              <span>{t('menu.settings')}</span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {t('menu.settingsDescription')}
                              </p>
                            </div>
                          </Link>

                          <button 
                            onClick={() => {
                              handleLogout();
                              setMenuOpen(false);
                            }} 
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-300 hover:text-white hover:bg-red-900/30 rounded-lg transition-all mt-1"
                          >
                            <LogOut size={18} /> 
                            <div className="flex-1 text-left">
                              <span>{t('auth.logout')}</span>
                              <p className="text-xs text-red-400/70 mt-0.5">
                                {t('auth.logoutDescription')}
                              </p>
                            </div>
                          </button>
                        </div>

                        <div className="p-3 bg-slate-950 border-t border-slate-800">
                          <div className="text-xs text-slate-500 text-center">
                            {datosExtra?.rol === "admin" ? (
                              <Link href="/admin" className="text-cyan-400 hover:text-cyan-300">
                                {t('menu.adminPanel')}
                              </Link>
                            ) : (
                              <span>{t('role.label')}: {getTranslatedRole()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link 
                  href="/login" 
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  <ShieldCheck size={18} className="text-white" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {t('auth.access')}
                  </span>
                </Link>

                <Link 
                  href="/register" 
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <UserPlus size={18} className="text-white" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {t('auth.register')}
                  </span>
                </Link>
              </div>
            )}

          </div>
        </div>
      </nav>
      
      <div className="h-20 w-full" />
      
      <MiniCart />
    </>
  );
}