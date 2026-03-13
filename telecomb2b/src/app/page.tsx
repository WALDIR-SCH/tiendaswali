"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { 
  ShieldCheck, Zap, Globe, PackageCheck, 
  Server, Router, Cable, BarChart3, Clock,
  Cpu, HardDrive, Wifi, ArrowRight, 
  Truck, Award, Users, Target, 
  CheckCircle, Database, Cloud, Shield,
  LogIn, ShoppingCart, X, RefreshCw, Circle,
  Clock as ClockIcon, Shield as ShieldIcon, CheckCircle as CheckIcon,
  Globe as GlobeIcon, TrendingUp, Headphones
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HomePage() {
  const backgroundRef = useRef(null);
  const mainRef = useRef(null);
  const statsRef = useRef(null);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const circleCarouselRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);

  const handleCatalogClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLoginAlert(true);
  };

  useEffect(() => {
    // Animación de fondo con movimiento de mouse
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth - 0.5) * 10;
      const yPos = (clientY / window.innerHeight - 0.5) * 10;
      gsap.to(backgroundRef.current, { x: xPos, y: yPos, duration: 1.5, ease: "power2.out" });
    };

    // Animación de carrusel circular rotativo
    if (typeof window !== "undefined" && circleCarouselRef.current) {
      // Crear animación de rotación continua
      gsap.to(circleCarouselRef.current, {
        rotation: 360,
        duration: 40,
        ease: "none",
        repeat: -1,
        onUpdate: function() {
          setRotation(this.progress() * 360);
        }
      });

      // Animar elementos individuales para contrarrestar rotación
      const brandItems = circleCarouselRef.current.querySelectorAll('.brand-circle-item');
      brandItems.forEach((item, index) => {
        gsap.to(item, {
          rotation: -360,
          duration: 40,
          ease: "none",
          repeat: -1
        });
      });
    }

    // Animación de stats counter
    if (statsRef.current) {
      gsap.from(".stat-number", {
        textContent: 0,
        duration: 2,
        ease: "power2.out",
        snap: { textContent: 1 },
        stagger: 0.5,
        scrollTrigger: {
          trigger: statsRef.current,
          start: "top 80%",
        }
      });
    }

    // Animaciones de revelado
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".reveal").forEach((elem: any) => {
        gsap.fromTo(elem, 
          { opacity: 0, y: 30 },
          { 
            opacity: 1, 
            y: 0, 
            duration: 0.8, 
            ease: "power3.out",
            scrollTrigger: {
              trigger: elem,
              start: "top 85%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });
    }, mainRef);

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      ctx.revert();
    };
  }, []);

  const brands = [
    { name: "CISCO", logo: "https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg", color: "from-blue-600 to-blue-800" },
    { name: "HUAWEI", logo: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Huawei_logo.svg", color: "from-red-500 to-red-700" },
    { name: "UBIQUITI", logo: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Ubiquiti_Networks_logo.svg", color: "from-gray-700 to-gray-900" },
    { name: "MIKROTIK", logo: "https://upload.wikimedia.org/wikipedia/commons/9/95/MikroTik_logo.svg", color: "from-red-400 to-red-600" },
    { name: "FURUKAWA", logo: "https://www.furukawalatam.com/wp-content/uploads/2021/06/logo.svg", color: "from-blue-400 to-cyan-600" },
    { name: "TP-LINK", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/TP-Link_logo.svg/1280px-TP-Link_logo.svg.png", color: "from-blue-500 to-indigo-600" },
    { name: "D-LINK", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/D-Link_logo.svg/1280px-D-Link_logo.svg.png", color: "from-blue-400 to-blue-600" },
    { name: "COMMSCOPE", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Commscope_logo.svg/1280px-Commscope_logo.svg.png", color: "from-purple-500 to-purple-700" },
    { name: "ERICSSON", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Ericsson_logo_2009.svg/1280px-Ericsson_logo_2009.svg.png", color: "from-blue-700 to-blue-900" },
    { name: "NOKIA", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Nokia_logo_2016.svg/1280px-Nokia_logo_2016.svg.png", color: "from-blue-600 to-blue-800" },
    { name: "JUNIPER", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Juniper_Networks_Logo.svg/1280px-Juniper_Networks_Logo.svg.png", color: "from-gray-800 to-black" },
    { name: "PANDUIT", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Panduit_logo.svg/1280px-Panduit_logo.svg.png", color: "from-blue-700 to-blue-900" },
  ];

  // Posicionar marcas en un círculo
  const radius = 280; // Radio del círculo
  const centerX = 320; // Centro X
  const centerY = 320; // Centro Y
  const totalBrands = brands.length;
  const angleStep = (2 * Math.PI) / totalBrands;

  return (
    <div ref={mainRef} className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white font-['Inter'] overflow-x-hidden">
      
      {/* Alert de inicio de sesión */}
      {showLoginAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 backdrop-blur-sm rounded-lg">
                  <LogIn className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Acceso Requerido</h3>
              </div>
              <button 
                onClick={() => setShowLoginAlert(false)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-8">
              Para acceder a nuestro catálogo completo y precios especiales, es necesario iniciar sesión con una cuenta empresarial.
            </p>
            
            <div className="space-y-4">
              <Link 
                href="/login"
                className="block w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl text-center hover:shadow-lg hover:shadow-blue-500/30 transition-all backdrop-blur-sm"
              >
                Iniciar Sesión
              </Link>
              <Link 
                href="/register"
                className="block w-full py-3 border-2 border-blue-500/50 text-blue-400 font-semibold rounded-xl text-center hover:bg-blue-500/10 transition-colors backdrop-blur-sm"
              >
                Crear Cuenta Empresarial
              </Link>
            </div>
            
            <p className="text-sm text-gray-400 mt-6 text-center">
              ¿Necesitas ayuda? <Link href="/contact" className="text-blue-400 hover:text-blue-300 hover:underline">Contáctanos</Link>
            </p>
          </div>
        </div>
      )}

      {/* --- SECCIÓN 1: HERO PROFESIONAL --- */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
        {/* Fondo con efecto vidrio esmerilado */}
        <div className="absolute inset-0 z-0">
          {/* Textura de vidrio esmerilado */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
          {/* Patrón sutil de puntos */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
          {/* Gradiente oscuro */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-sm" />
          
          {/* Elementos decorativos */}
          <div 
            ref={backgroundRef}
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 20%, rgba(37, 99, 235, 0.3) 0%, transparent 50%),
                               radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)`,
            }}
          />
        </div>

        <div className="relative z-10 text-center max-w-6xl mx-auto">
          {/* Badge de profesionalismo */}
          <div className="mb-8 inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/30 rounded-full backdrop-blur-xl">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-300 text-sm font-bold uppercase tracking-[0.2em]">
              Proveedor Certificado Nivel Carrier
            </span>
            <Award className="w-4 h-4 text-blue-400" />
          </div>

          {/* Título principal con efecto neón */}
          <div className="relative mb-8">
            <div className="absolute inset-0 -inset-8 bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-blue-600/10 blur-3xl opacity-20" />
            <h1 className="relative text-6xl md:text-8xl lg:text-8xl font-black mb-6 tracking-tighter leading-[0.9]">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-blue-100 to-cyan-300 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                TELECOM
              </span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                SUPPLY CHAIN
              </span>
            </h1>
          </div>

          {/* Subtítulo */}
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light tracking-wide mb-10 leading-relaxed">
            Plataforma B2B especializada en distribución estratégica de 
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400"> accesorios y materiales de telecomunicaciones</span> 
            para operadores, ISPs y proyectos de infraestructura crítica.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <button 
              onClick={handleCatalogClick}
              className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl text-white font-bold text-lg uppercase tracking-wider flex items-center gap-3 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-sm"
            >
              <ShoppingCart className="w-5 h-5" />
              Explorar Catálogo
              <ArrowRight className="group-hover:translate-x-2 transition-transform" size={20} />
            </button>
            <Link 
              href="/register"
              className="px-8 py-4 bg-gray-800/50 backdrop-blur-sm border-2 border-blue-500/50 text-blue-300 font-bold text-lg uppercase tracking-wider rounded-xl hover:bg-gray-700/50 hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Solicitar Cuenta Empresarial
            </Link>
          </div>
        </div>

        {/* Indicador scroll */}
        <div className="absolute bottom-10 flex flex-col items-center gap-3 opacity-80">
          <span className="text-xs font-medium uppercase tracking-widest text-blue-400">Desplazar</span>
          <div className="w-6 h-10 border-2 border-blue-500/30 rounded-full flex justify-center backdrop-blur-sm">
            <div className="w-1 h-3 bg-blue-400 rounded-full mt-2 animate-bounce" />
          </div>
        </div>
      </section>

      {/* --- SECCIÓN 2: CARRUSEL CIRCULAR ROTATIVO --- */}
      <section className="py-24 bg-gradient-to-b from-gray-900/50 via-gray-800/50 to-gray-900/50 backdrop-blur-sm border-y border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 reveal">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Ecosistema de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">Marcas Globales</span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-6">
              Distribuimos exclusivamente equipamiento de los <span className="font-semibold text-cyan-300">fabricantes líderes</span> a nivel mundial en telecomunicaciones
            </p>
            
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700">
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-blue-300 font-medium">Carrusel Rotativo 360°</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-400">Activo</span>
              </div>
            </div>
          </div>

          {/* Contenedor principal del carrusel circular */}
          <div className="relative h-[700px] md:h-[800px] flex items-center justify-center">
            
            {/* Líneas de conexión radiales */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={`line-${i}`}
                  className="absolute w-[1px] h-64 bg-gradient-to-b from-blue-400/10 to-transparent"
                  style={{
                    transform: `rotate(${i * 30}deg)`,
                    transformOrigin: 'center center'
                  }}
                />
              ))}
            </div>
            
            {/* Anillos concéntricos decorativos */}
            <div className="absolute w-96 h-96 border border-blue-400/10 rounded-full backdrop-blur-sm" />
            <div className="absolute w-[500px] h-[500px] border border-blue-300/5 rounded-full backdrop-blur-sm" />
            <div className="absolute w-[600px] h-[600px] border border-blue-200/5 rounded-full backdrop-blur-sm" />
            
            {/* Punto central con efecto de pulso */}
            <div className="absolute z-20">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-2xl backdrop-blur-sm" />
                <div className="absolute inset-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-ping opacity-20" />
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-xl" />
              </div>
            </div>
            
            {/* Carrusel circular con rotación */}
            <div 
              ref={circleCarouselRef}
              className="relative w-[640px] h-[640px] z-10"
            >
              {/* Mostrar todas las marcas en posiciones circulares */}
              {brands.map((brand, index) => {
                const angle = index * angleStep;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                
                return (
                  <div
                    key={brand.name}
                    className="brand-circle-item absolute w-32 h-32 -ml-16 -mt-16"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: `rotate(${rotation}deg)`,
                    }}
                  >
                    <div className="group relative w-full h-full">
                      {/* Efecto de órbita */}
                      <div className="absolute -inset-4">
                        <div className="w-40 h-40 border border-blue-400/10 rounded-full group-hover:border-blue-400/30 transition-all duration-500 backdrop-blur-sm" />
                      </div>
                      
                      {/* Tarjeta de marca */}
                      <div className={`
                        absolute inset-0 bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-700/50
                        shadow-xl group-hover:shadow-2xl group-hover:scale-110 
                        group-hover:border-blue-400/30 transition-all duration-500
                        flex flex-col items-center justify-center p-4
                      `}>
                        {/* Fondo de gradiente sutil */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${brand.color}/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                        
                        {/* Logo de la marca */}
                        <div className="relative z-10 flex flex-col items-center">
                          {brand.logo ? (
                            <div className="mb-3 p-2 bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-lg">
                              <img 
                                src={brand.logo} 
                                alt={brand.name}
                                className="h-8 w-auto object-contain opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement!.innerHTML = 
                                    `<span class="text-sm font-bold text-blue-300">${brand.name}</span>`;
                                }}
                              />
                            </div>
                          ) : (
                            <div className="mb-3 p-2 bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-lg">
                              <span className="text-sm font-bold text-blue-300">{brand.name}</span>
                            </div>
                          )}
                          
                          <span className="text-sm font-semibold text-white text-center">
                            {brand.name}
                          </span>
                          
                          {/* Punto indicador de posición */}
                          <div className="absolute -bottom-6">
                            <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Indicador de rotación */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-full px-6 py-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-white">
                    Rotación: {Math.round(rotation)}°
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-600" />
                <div className="text-xs text-gray-400">
                  {brands.length} marcas en órbita
                </div>
              </div>
            </div>
          </div>

          {/* SE REEMPLAZA LA SECCIÓN ANTERIOR POR ALGO MÁS IMPORTANTE */}
          {/* SECCIÓN: SERVICIOS DE VALOR AGREGADO */}
          <div className="mt-24 reveal">
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Servicios Exclusivos</span> para Empresas
              </h3>
              <p className="text-gray-300 text-lg max-w-3xl mx-auto">
                Más que un distribuidor, somos tu <span className="font-semibold text-cyan-300">socio estratégico</span> en telecomunicaciones
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 hover:border-blue-500/30 hover:transform hover:-translate-y-2 transition-all duration-500">
                <div className="inline-flex p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl mb-6">
                  <Headphones className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-4">Soporte Técnico 24/7</h4>
                <p className="text-gray-300 mb-4">
                  Equipo especializado disponible las 24 horas para resolver emergencias técnicas y operativas.
                </p>
                <ul className="space-y-2">
                  {['Respuesta en menos de 30min', 'Técnicos certificados', 'Soporte remoto y presencial', 'Monitoreo proactivo'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 hover:border-blue-500/30 hover:transform hover:-translate-y-2 transition-all duration-500">
                <div className="inline-flex p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl mb-6">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-4">Consultoría Estratégica</h4>
                <p className="text-gray-300 mb-4">
                  Análisis y optimización de tu infraestructura de telecomunicaciones para maximizar ROI.
                </p>
                <ul className="space-y-2">
                  {['Auditoría técnica completa', 'Roadmap tecnológico', 'Optimización de costos', 'Plan de migración'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 hover:border-blue-500/30 hover:transform hover:-translate-y-2 transition-all duration-500">
                <div className="inline-flex p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl mb-6">
                  <ShieldIcon className="w-8 h-8 text-green-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-4">Garantías Extendidas</h4>
                <p className="text-gray-300 mb-4">
                  Cobertura de garantía superior a la estándar del fabricante con reemplazo inmediato.
                </p>
                <ul className="space-y-2">
                  {['Hasta 5 años de garantía', 'Reemplazo en 24 horas', 'Soporte de fabricante directo', 'Certificación original'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* CTA para servicios */}
            <div className="mt-12 text-center">
              <Link 
                href="/services"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600/30 to-cyan-500/30 border border-blue-500/30 text-blue-300 font-bold rounded-xl hover:bg-gradient-to-r hover:from-blue-600/40 hover:to-cyan-500/40 transition-all backdrop-blur-sm"
              >
                <GlobeIcon className="w-5 h-5" />
                Conoce todos nuestros servicios empresariales
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN 3: ESTADÍSTICAS IMPACTANTES --- */}
      <section ref={statsRef} className="py-24 bg-gradient-to-r from-gray-800/50 via-gray-700/50 to-gray-800/50 backdrop-blur-sm border-y border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 reveal">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Cifras que <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Respaldan</span> Nuestra Experiencia
            </h3>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Datos reales que demuestran nuestro compromiso con la excelencia en distribución B2B
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard 
              icon={<Users className="w-8 h-8 text-blue-400" />}
              number="500+"
              label="Clientes Empresariales"
              description="Operadores y ISPs confían en nosotros"
            />
            <StatCard 
              icon={<Database className="w-8 h-8 text-cyan-400" />}
              number="10,000+"
              label="SKUs Disponibles"
              description="Stock permanente garantizado"
            />
            <StatCard 
              icon={<Truck className="w-8 h-8 text-green-400" />}
              number="24h"
              label="Tiempo de Despacho"
              description="Envíos urgentes nacionales"
            />
            <StatCard 
              icon={<Shield className="w-8 h-8 text-purple-400" />}
              number="100%"
              label="Garantía Original"
              description="Productos certificados y homologados"
            />
          </div>
          
          {/* Aseguramiento de calidad */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/30">
              <div className="inline-flex p-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-full mb-4">
                <CheckIcon className="w-6 h-6 text-green-500" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Certificación ISO 9001</h4>
              <p className="text-gray-400 text-sm">Gestión de calidad certificada internacionalmente</p>
            </div>
            <div className="text-center p-6 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/30">
              <div className="inline-flex p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full mb-4">
                <Award className="w-6 h-6 text-yellow-500" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Partner de Fabricantes</h4>
              <p className="text-gray-400 text-sm">Certificación directa de los principales fabricantes</p>
            </div>
            <div className="text-center p-6 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/30">
              <div className="inline-flex p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full mb-4">
                <ShieldCheck className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Trazabilidad Completa</h4>
              <p className="text-gray-400 text-sm">Seguimiento de origen a destino de todos los productos</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN 4: CATEGORÍAS PRINCIPALES --- */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20 reveal">
          <h2 className="text-5xl font-bold mb-6 text-white">
            Soluciones <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">Integrales</span>
          </h2>
          <p className="text-gray-300 text-xl max-w-3xl mx-auto">
            Desde componentes pasivos hasta equipamiento activo de <span className="font-semibold text-cyan-300">última generación</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <CategoryCard 
            title="Fibra Óptica"
            description="Cables ADSS, OPGW, conectores y empalmes"
            icon={<Cable className="w-8 h-8 text-white" />}
            color="from-cyan-500 to-blue-600"
            image="https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=1200"
            onClick={handleCatalogClick}
          />
          <CategoryCard 
            title="Networking"
            description="Routers, switches, OLTs y equipos carrier"
            icon={<Router className="w-8 h-8 text-white" />}
            color="from-blue-500 to-purple-600"
            image="https://images.unsplash.com/photo-1558494949-ef010cbdcc48?auto=format&fit=crop&q=80&w=1200"
            onClick={handleCatalogClick}
          />
          <CategoryCard 
            title="Infraestructura"
            description="Racks, gabinetes, UPS y sistemas de energía"
            icon={<Server className="w-8 h-8 text-white" />}
            color="from-purple-500 to-indigo-600"
            image="https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&q=80&w=1200"
            onClick={handleCatalogClick}
          />
          <CategoryCard 
            title="Wireless"
            description="Antenas, radios, puntos de acceso y backhaul"
            icon={<Wifi className="w-8 h-8 text-white" />}
            color="from-pink-500 to-red-600"
            image="https://images.unsplash.com/photo-1516383274235-5f42d6c6426d?auto=format&fit=crop&q=80&w=1200"
            onClick={handleCatalogClick}
          />
        </div>
      </section>

      {/* --- SECCIÓN 5: VENTAJAS COMPETITIVAS --- */}
      <section className="py-24 bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 backdrop-blur-sm border-y border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <h2 className="text-5xl font-bold mb-8 text-white">
                Por qué elegir <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">TelecomB2B</span>
              </h2>
              
              <div className="space-y-6">
                <AdvantageItem 
                  icon={<Target className="w-6 h-6 text-blue-400" />}
                  title="Enfoque B2B Exclusivo"
                  description="Diseñado específicamente para las necesidades de empresas y operadores"
                />
                <AdvantageItem 
                  icon={<BarChart3 className="w-6 h-6 text-cyan-400" />}
                  title="Consultoría Técnica"
                  description="Asesoramiento especializado para optimizar tus proyectos"
                />
                <AdvantageItem 
                  icon={<PackageCheck className="w-6 h-6 text-green-400" />}
                  title="Logística Predictiva"
                  description="Sistema de pronóstico para mantener stock crítico"
                />
                <AdvantageItem 
                  icon={<Cloud className="w-6 h-6 text-purple-400" />}
                  title="Plataforma Digital"
                  description="Gestión completa de pedidos, facturas y seguimiento online"
                />
              </div>
            </div>

            <div className="relative reveal">
              <div className="relative h-[600px] rounded-3xl overflow-hidden border-2 border-gray-700/50 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200"
                  alt="Centro de Distribución"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-transparent" />
                
                {/* Overlay con datos */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Distribución Nacional</h3>
                      <p className="text-gray-300">Cobertura en todas las regiones</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN 6: CTA FINAL --- */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        {/* Fondo vidrio esmerilado */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80 backdrop-blur-xl" />
        {/* Textura sutil */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.05)_0%,_transparent_70%)]" />
        
        <div className="relative z-10 max-w-4xl mx-auto reveal">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-white drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            Transforma tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">Infraestructura</span>
          </h2>
          
          <p className="text-2xl text-gray-300 mb-12 leading-relaxed">
            Únete a la plataforma B2B líder en distribución de telecomunicaciones. 
            Accede a <span className="font-semibold text-cyan-300">precios especiales</span>, <span className="font-semibold text-blue-300">stock garantizado</span> y <span className="font-semibold text-green-300">soporte técnico especializado</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button 
              onClick={handleCatalogClick}
              className="group px-12 py-5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl text-white font-bold text-xl uppercase tracking-wider flex items-center gap-4 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-2 shadow-2xl backdrop-blur-sm"
            >
              Explorar Catálogo Completo
              <ArrowRight className="group-hover:translate-x-3 transition-transform" size={24} />
            </button>
            
            <Link 
              href="/contact"
              className="px-12 py-5 bg-gray-800/50 backdrop-blur-sm border-2 border-blue-500/50 text-blue-300 font-bold text-xl uppercase tracking-wider rounded-2xl hover:bg-gray-700/50 hover:border-blue-400 transition-all duration-300 shadow-2xl hover:shadow-xl"
            >
              Contactar Ventas
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER PROFESIONAL --- */}
      <footer className="py-16 border-t border-gray-700/30 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">TELECOM<span className="text-blue-400">B2B</span></span>
              </div>
              <p className="text-gray-400 text-sm">
                Plataforma especializada en distribución B2B de accesorios y materiales de telecomunicaciones.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-6 text-white">Categorías</h4>
              <ul className="space-y-3">
                {['Fibra Óptica', 'Networking', 'Wireless', 'Infraestructura', 'Herramientas', 'Consumibles'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors hover:pl-2 duration-300">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-6 text-white">Empresa</h4>
              <ul className="space-y-3">
                {['Sobre Nosotros', 'Certificaciones', 'Sostenibilidad', 'Trabaja con Nosotros', 'Blog Técnico'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors hover:pl-2 duration-300">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-6 text-white">Contacto</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="hover:text-blue-400 transition-colors">ventas@telecomb2b.com</li>
                <li className="hover:text-blue-400 transition-colors">+1 (555) 123-4567</li>
                <li className="hover:text-blue-400 transition-colors">Lunes a Viernes 8:00 - 18:00</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-700/30 text-center">
            <p className="text-gray-500 text-sm">
              © 2024 TelecomB2B. Todos los derechos reservados. | 
              <span className="mx-2 text-gray-400">Proveedor Certificado</span> |
              <span className="mx-2 text-gray-400">Socio Estratégico de Operadores</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componentes auxiliares
function StatCard({ icon, number, label, description }: any) {
  return (
    <div className="text-center p-8 bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 hover:border-blue-500/30 hover:shadow-2xl transition-all duration-300 reveal group">
      <div className="inline-flex p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl mb-6 shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div className="text-4xl font-bold text-white mb-2 stat-number bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">{number}</div>
      <h3 className="text-lg font-bold text-white mb-2">{label}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function CategoryCard({ title, description, icon, color, image, onClick }: any) {
  return (
    <div className="group relative h-96 rounded-3xl overflow-hidden reveal cursor-pointer" onClick={onClick}>
      <img 
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent" />
      
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className={`inline-flex p-3 bg-gradient-to-r ${color} rounded-xl mb-4 shadow-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors duration-300">{title}</h3>
        <p className="text-gray-200 mb-4 group-hover:text-gray-100 transition-colors duration-300">{description}</p>
        <button className="inline-flex items-center gap-2 text-cyan-300 font-medium hover:text-cyan-200 transition-colors group-hover:gap-3 duration-300">
          Explorar productos
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

function AdvantageItem({ icon, title, description }: any) {
  return (
    <div className="flex gap-4 p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl hover:border-blue-500/30 hover:shadow-lg transition-all hover:-translate-y-1 duration-300">
      <div className="flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-bold text-white mb-1">{title}</h4>
        <p className="text-gray-300">{description}</p>
      </div>
    </div>
  );
}