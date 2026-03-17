"use client";
import { useState, useEffect } from 'react';
import { 
  Settings, Bell, Lock, Mail, Shield, Palette, 
  Download, Key, Database, Moon, Sun
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

// Definimos la configuración completa por defecto
const defaultConfig = {
  notificacionesEmail: true,
  notificacionesApp: true,
  autenticacion2FA: false,
  idioma: 'es',
  tema: 'oscuro',
  privacidadPerfil: 'publico',
  mostrarPrecios: true,
  recibirOfertas: true,
  vistaCatalogo: 'grid',
  correoPrincipal: 'usuario@empresa.com',
  correosSecundarios: []
};

export default function ConfiguracionPage() {
  const { t, language, setLanguage } = useLanguage();
  const [config, setConfig] = useState({
    ...defaultConfig,
    idioma: language
  });
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Aplicar tema e idioma al cargar
  // En configuracion.tsx - dentro del useEffect
useEffect(() => {
  // Cargar configuración guardada
  const savedConfig = localStorage.getItem('configUsuario');
  if (savedConfig) {
    try {
      const parsedConfig = JSON.parse(savedConfig);
      const mergedConfig = { ...defaultConfig, ...parsedConfig };
      setConfig(mergedConfig);
      
      // Aplicar tema
      applyTheme(mergedConfig.tema);
      
      // Sincronizar con el contexto global
      if (mergedConfig.idioma !== language) {
        setLanguage(mergedConfig.idioma);
      }
      
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      applyTheme(defaultConfig.tema);
    }
  } else {
    applyTheme(defaultConfig.tema);
  }
}, [language, setLanguage]); // Añadir dependencias

  // Aplicar tema al documento
  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    
    if (theme === 'claro') {
      // Tema claro con paleta profesional
      root.style.setProperty('--background-primary', '#F3F4F6');
      root.style.setProperty('--background-secondary', '#FFFFFF');
      root.style.setProperty('--background-card', '#FFFFFF');
      root.style.setProperty('--text-primary', '#4B5563');
      root.style.setProperty('--text-secondary', '#6B7280');
      root.style.setProperty('--border-color', '#D1D5D8');
      root.style.setProperty('--primary-color', '#9851F9');
      root.style.setProperty('--primary-hover', '#7C35E0');
      root.style.setProperty('--accent-orange', '#FF6600');
      root.style.setProperty('--accent-green', '#28FB4B');
      root.style.setProperty('--accent-yellow', '#F6FA00');
    } else {
      // Tema oscuro con paleta profesional
      root.style.setProperty('--background-primary', '#1F2937');
      root.style.setProperty('--background-secondary', '#513c37');
      root.style.setProperty('--background-card', '#374151');
      root.style.setProperty('--text-primary', '#F9FAFB');
      root.style.setProperty('--text-secondary', '#D1D5DB');
      root.style.setProperty('--border-color', '#4B5563');
      root.style.setProperty('--primary-color', '#9851F9');
      root.style.setProperty('--primary-hover', '#7C35E0');
      root.style.setProperty('--accent-orange', '#FF6600');
      root.style.setProperty('--accent-green', '#28FB4B');
      root.style.setProperty('--accent-yellow', '#F6FA00');
    }
    
    localStorage.setItem('theme', theme);
  };

  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    // Aplicar cambios inmediatamente
    if (key === 'tema') {
      applyTheme(value);
    } else if (key === 'idioma') {
      // Usar el contexto global
      setLanguage(value);
      document.documentElement.lang = value;
    }
    
    // Guardar en localStorage
    localStorage.setItem('configUsuario', JSON.stringify(newConfig));
  };

  const toggle2FA = () => {
    if (!config.autenticacion2FA) {
      setShow2FAModal(true);
    } else {
      handleChange('autenticacion2FA', false);
    }
  };

  const activate2FA = () => {
    handleChange('autenticacion2FA', true);
    setShow2FAModal(false);
  };

  const handlePasswordChange = () => {
    if (!passwordData) {
      alert(t('common.error'));
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      alert(t('auth.passwordsNotMatch'));
      return;
    }
    
    if (passwordData.new.length < 6) {
      alert(t('auth.passwordMinLength'));
      return;
    }
    
    setPasswordData({ current: '', new: '', confirm: '' });
    setShowPasswordModal(false);
    alert(t('auth.passwordUpdated'));
  };

  const exportData = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `telecom-b2b-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const ToggleSwitch = ({ enabled, onChange, disabled = false }: { 
    enabled: boolean, 
    onChange: () => void,
    disabled?: boolean 
  }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
        enabled ? 'config-toggle-enabled' : 'config-toggle-disabled'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-md ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );

  // Estilos en línea para asegurar que los temas se apliquen
  const styles = `
    .config-page {
      background-color: var(--background-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }
    
    .config-card {
      background-color: var(--background-card);
      border-color: var(--border-color);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: all 0.3s ease;
    }
    
    .config-card:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    
    .config-text-primary {
      color: var(--text-primary);
    }
    
    .config-text-secondary {
      color: var(--text-secondary);
    }
    
    .config-border {
      border-color: var(--border-color);
    }
    
    .config-input {
      background-color: var(--background-secondary);
      border-color: var(--border-color);
      color: var(--text-primary);
      transition: all 0.3s ease;
    }
    
    .config-input:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(152, 81, 249, 0.1);
    }
    
    .config-button-primary {
      background-color: var(--primary-color);
      color: white;
      transition: all 0.3s ease;
    }
    
    .config-button-primary:hover {
      background-color: var(--primary-hover);
      transform: translateY(-1px);
    }
    
    .config-button-secondary {
      background-color: var(--background-secondary);
      color: var(--text-primary);
      border-color: var(--border-color);
      transition: all 0.3s ease;
    }
    
    .config-button-secondary:hover {
      background-color: var(--primary-color);
      color: white;
    }
    
    .config-toggle-enabled {
      background-color: var(--accent-green);
    }
    
    .config-toggle-disabled {
      background-color: var(--border-color);
    }
  `;

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="config-page space-y-6 max-w-8xl mx-auto px-30 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="config-text-primary text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Settings size={28} style={{color: '#9851F9'}} />
              {t('settings.title')}
            </h1>
            <p className="config-text-secondary mt-1 text-sm sm:text-base">{t('settings.subtitle')}</p>
          </div>
          <button 
            onClick={() => {
              const resetConfig = { ...defaultConfig, idioma: language };
              setConfig(resetConfig);
              applyTheme(defaultConfig.tema);
              document.documentElement.lang = language;
              localStorage.removeItem('configUsuario');
            }}
            className="config-button-secondary px-4 py-2 text-sm rounded-lg font-medium transition-all duration-300 hover:shadow-lg"
          >
            {t('settings.restoreDefaults')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-5">
            {/* Notificaciones */}
            <div className="config-card backdrop-blur-md rounded-xl p-5 border transition-all duration-300 hover:shadow-xl">
              <h2 className="config-text-primary text-lg font-bold mb-4 flex items-center gap-2">
                <Bell size={20} style={{color: '#FF6600'}} />
                {t('settings.notifications')}
              </h2>
              
              <div className="space-y-3">
                {[
                  { key: 'notificacionesEmail', label: t('settings.emailNotifications'), desc: t('settings.emailDesc') },
                  { key: 'notificacionesApp', label: t('settings.appNotifications'), desc: t('settings.appDesc') },
                  { key: 'recibirOfertas', label: t('settings.specialOffers'), desc: t('settings.offersDesc') }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="config-text-primary font-medium text-sm">{item.label}</div>
                      <div className="config-text-secondary text-xs">{item.desc}</div>
                    </div>
                    <ToggleSwitch 
                      enabled={config[item.key as keyof typeof config] as boolean}
                      onChange={() => handleChange(item.key, !config[item.key as keyof typeof config])}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Seguridad */}
            <div className="config-card backdrop-blur-md rounded-xl p-5 border transition-all duration-300 hover:shadow-xl">
              <h2 className="config-text-primary text-lg font-bold mb-4 flex items-center gap-2">
                <Lock size={20} style={{color: '#28FB4B'}} />
                {t('settings.security')}
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <div className="config-text-primary font-medium text-sm">{t('settings.twoFactor')}</div>
                    <div className="config-text-secondary text-xs">{t('settings.twoFactorDesc')}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {config.autenticacion2FA && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor: 'rgba(40, 251, 75, 0.15)', color: '#28FB4B'}}>
                        {t('settings.activate')}
                      </span>
                    )}
                    <ToggleSwitch 
                      enabled={config.autenticacion2FA}
                      onChange={toggle2FA}
                    />
                  </div>
                </div>

                <div>
                  <label className="config-text-primary font-medium text-sm mb-2 block">{t('settings.profilePrivacy')}</label>
                  <select
                    value={config.privacidadPerfil}
                    onChange={(e) => handleChange('privacidadPerfil', e.target.value)}
                    className="config-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="publico">
                      {t('settings.privacy.public')}
                    </option>
                    <option value="soloEmpresa">
                      {t('settings.privacy.verifiedCompanies')}
                    </option>
                    <option value="privado">
                      {t('settings.privacy.private')}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="config-text-primary font-medium text-sm mb-2 block">{t('settings.showPrices')}</label>
                  <select
                    value={config.mostrarPrecios ? 'si' : 'no'}
                    onChange={(e) => handleChange('mostrarPrecios', e.target.value === 'si')}
                    className="config-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="si">{t('settings.alwaysShow')}</option>
                    <option value="no">{t('settings.onlyLogin')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Panel derecho */}
          <div className="space-y-5">
            {/* Apariencia */}
            <div className="config-card backdrop-blur-md rounded-xl p-5 border transition-all duration-300 hover:shadow-xl">
              <h3 className="config-text-primary text-base font-bold mb-3 flex items-center gap-2">
                <Palette size={18} style={{color: '#9851F9'}} />
                {t('settings.appearance')}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="config-text-primary font-medium text-sm mb-2 block">{t('settings.theme')}</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'oscuro', label: t('settings.dark'), icon: Moon },
                      { value: 'claro', label: t('settings.light'), icon: Sun }
                    ].map((tema) => (
                      <button
                        key={tema.value}
                        onClick={() => handleChange('tema', tema.value)}
                        className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg transition-all duration-300 border-2 ${
                          config.tema === tema.value 
                            ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg transform scale-105' 
                            : 'border-gray-300 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-25 hover:shadow-md'
                        }`}
                      >
                        <tema.icon size={18} className="mb-1" />
                        <span className="text-sm font-medium">{tema.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="config-text-primary font-medium text-sm mb-2 block">{t('settings.language')}</label>
                  <select
                    value={config.idioma}
                    onChange={(e) => handleChange('idioma', e.target.value)}
                    className="config-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>

                <div>
                  <label className="config-text-primary font-medium text-sm mb-2 block">{t('settings.catalogView')}</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'grid', label: t('settings.grid') },
                      { value: 'lista', label: t('settings.list') }
                    ].map((vista) => (
                      <button
                        key={vista.value}
                        onClick={() => handleChange('vistaCatalogo', vista.value)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-300 ${
                          config.vistaCatalogo === vista.value 
                            ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' 
                            : 'border-gray-300 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-25 hover:shadow-sm'
                        }`}
                      >
                        {vista.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones de cuenta */}
            <div className="config-card backdrop-blur-md rounded-xl p-5 border transition-all duration-300 hover:shadow-xl">
              <h3 className="config-text-primary text-base font-bold mb-3">{t('settings.accountActions')}</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 hover:shadow-md font-medium"
                  style={{backgroundColor: 'rgba(246, 250, 0, 0.1)', color: '#000', border: '1px solid rgba(246, 250, 0, 0.3)'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(246, 250, 0, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(246, 250, 0, 0.1)'}
                >
                  <Key size={18} style={{color: '#FF6600'}} />
                  {t('settings.changePassword')}
                </button>
                <button 
                  onClick={exportData}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 hover:shadow-md font-medium"
                  style={{backgroundColor: 'rgba(152, 81, 249, 0.1)', color: '#9851F9', border: '1px solid rgba(152, 81, 249, 0.3)'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(152, 81, 249, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(152, 81, 249, 0.1)'}
                >
                  <Download size={18} />
                  {t('settings.exportData')}
                </button>
                <button 
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 hover:shadow-md font-medium"
                  style={{backgroundColor: 'rgba(255, 102, 0, 0.1)', color: '#FF6600', border: '1px solid rgba(255, 102, 0, 0.3)'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 102, 0, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 102, 0, 0.1)'}
                >
                  <Database size={18} />
                  {t('settings.downloadHistory')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal 2FA */}
        {show2FAModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="config-card backdrop-blur-md rounded-xl p-6 max-w-md w-full border-2 transition-all duration-300 hover:shadow-2xl" style={{borderColor: 'rgba(152, 81, 249, 0.3)'}}>
              <div className="flex items-center gap-3 mb-4">
                <Shield size={24} style={{color: '#28FB4B'}} />
                <h3 className="config-text-primary text-lg font-bold">{t('settings.activate2FA')}</h3>
              </div>
              <p className="config-text-secondary mb-4 text-sm">
                {t('settings.scanQR')}
              </p>
              <div className="bg-white p-4 rounded-lg mb-4 flex justify-center shadow-lg">
                <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg">
                  <div className="text-center text-gray-700">
                    <div className="text-xs mb-1 font-semibold">QR CODE</div>
                    <div className="text-xs">2FA-TELECOMB2B</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={activate2FA}
                  className="flex-1 py-2 rounded-lg transition-all duration-300 hover:shadow-lg font-medium text-white"
                  style={{backgroundColor: '#28FB4B', border: '1px solid #28FB4B'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1EDB3B'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28FB4B'}
                >
                  {t('common.confirm')}
                </button>
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 py-2 rounded-lg transition-all duration-300 hover:shadow-lg font-medium"
                  style={{backgroundColor: 'rgba(255, 102, 0, 0.1)', color: '#FF6600', border: '1px solid rgba(255, 102, 0, 0.3)'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 102, 0, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 102, 0, 0.1)'}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Cambiar Contraseña */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="config-card backdrop-blur-md rounded-xl p-6 max-w-md w-full border-2 transition-all duration-300 hover:shadow-2xl" style={{borderColor: 'rgba(246, 250, 0, 0.3)'}}>
              <div className="flex items-center gap-3 mb-4">
                <Key size={24} style={{color: '#FF6600'}} />
                <h3 className="config-text-primary text-lg font-bold">{t('settings.changePasswordTitle')}</h3>
              </div>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="config-text-primary text-sm block mb-1 font-medium">{t('settings.currentPassword')}</label>
                  <input
                    type="password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                    className="config-input w-full rounded-lg px-3 py-2 text-sm transition-all duration-300 focus:shadow-lg"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-white text-sm block mb-1">{t('settings.newPassword')}</label>
                  <label className="config-text-primary text-sm block mb-1 font-medium">{t('settings.newPassword')}</label>
                  <input
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                    className="config-input w-full rounded-lg px-3 py-2 text-sm transition-all duration-300 focus:shadow-lg"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-white text-sm block mb-1">{t('settings.confirmPassword')}</label>
                  <label className="config-text-primary text-sm block mb-1 font-medium">{t('settings.confirmPassword')}</label>
                  <input
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                    className="config-input w-full rounded-lg px-3 py-2 text-sm transition-all duration-300 focus:shadow-lg"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 py-2 rounded-lg transition-all duration-300 hover:shadow-lg font-medium text-white"
                  style={{backgroundColor: '#F6FA00', color: '#000', border: '1px solid #F6FA00'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E900'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F6FA00'}
                >
                  {t('common.update')}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ current: '', new: '', confirm: '' });
                  }}
                  className="flex-1 py-2 rounded-lg transition-all duration-300 hover:shadow-lg font-medium"
                  style={{backgroundColor: 'rgba(255, 102, 0, 0.1)', color: '#FF6600', border: '1px solid rgba(255, 102, 0, 0.3)'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 102, 0, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 102, 0, 0.1)'}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}