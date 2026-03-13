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
      root.style.setProperty('--background-primary', '#ffffff');
      root.style.setProperty('--background-secondary', '#f8fafc');
      root.style.setProperty('--background-card', '#ffffff');
      root.style.setProperty('--text-primary', '#1e293b');
      root.style.setProperty('--text-secondary', '#64748b');
      root.style.setProperty('--border-color', '#e2e8f0');
      root.style.setProperty('--primary-color', '#0ea5e9');
      root.style.setProperty('--primary-hover', '#0284c7');
    } else {
      // Tema oscuro con colores de la imagen
      root.style.setProperty('--background-primary', '#0f172a');
      root.style.setProperty('--background-secondary', '#1e293b');
      root.style.setProperty('--background-card', '#1e293b');
      root.style.setProperty('--text-primary', '#f1f5f9');
      root.style.setProperty('--text-secondary', '#94a3b8');
      root.style.setProperty('--border-color', '#334155');
      root.style.setProperty('--primary-color', '#0ea5e9');
      root.style.setProperty('--primary-hover', '#38bdf8');
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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-emerald-600' : 'bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
    }
    
    .config-button-primary {
      background-color: var(--primary-color);
      color: white;
    }
    
    .config-button-primary:hover {
      background-color: var(--primary-hover);
    }
  `;

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="config-page space-y-6 max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="config-text-primary text-2xl sm:text-3xl font-bold">{t('settings.title')}</h1>
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
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            {t('settings.restoreDefaults')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-5">
            {/* Notificaciones */}
            <div className="config-card backdrop-blur-md rounded-xl p-5 border">
              <h2 className="config-text-primary text-lg font-bold mb-4 flex items-center gap-2">
                <Bell size={20} />
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
            <div className="config-card backdrop-blur-md rounded-xl p-5 border">
              <h2 className="config-text-primary text-lg font-bold mb-4 flex items-center gap-2">
                <Lock size={20} />
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
                      <span className="text-xs px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded">
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
            <div className="config-card backdrop-blur-md rounded-xl p-5 border">
              <h3 className="config-text-primary text-base font-bold mb-3 flex items-center gap-2">
                <Palette size={18} />
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
                        className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all border ${
                          config.tema === tema.value 
                            ? 'config-button-primary border-cyan-600' 
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700'
                        }`}
                      >
                        <tema.icon size={16} />
                        <span className="text-xs mt-1">{tema.label}</span>
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
                        className={`flex-1 py-1.5 rounded-lg text-sm border ${
                          config.vistaCatalogo === vista.value 
                            ? 'config-button-primary' 
                            : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
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
            <div className="config-card backdrop-blur-md rounded-xl p-5 border">
              <h3 className="config-text-primary text-base font-bold mb-3">{t('settings.accountActions')}</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center gap-2 p-3 bg-amber-900/20 hover:bg-amber-800/30 text-amber-400 rounded-lg transition-colors text-sm"
                >
                  <Key size={16} />
                  {t('settings.changePassword')}
                </button>
                <button 
                  onClick={exportData}
                  className="w-full flex items-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Download size={16} />
                  {t('settings.exportData')}
                </button>
                <button className="w-full flex items-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm">
                  <Database size={16} />
                  {t('settings.downloadHistory')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal 2FA */}
        {show2FAModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <Shield size={24} className="text-cyan-400" />
                <h3 className="text-lg font-bold text-white">{t('settings.activate2FA')}</h3>
              </div>
              <p className="text-slate-300 mb-4 text-sm">
                {t('settings.scanQR')}
              </p>
              <div className="bg-white p-4 rounded-lg mb-4 flex justify-center">
                <div className="w-32 h-32 bg-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-700">
                    <div className="text-xs mb-1">QR CODE</div>
                    <div className="text-xs">2FA-TELECOMB2B</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={activate2FA}
                  className="config-button-primary flex-1 py-2 rounded-lg transition-colors"
                >
                  {t('common.confirm')}
                </button>
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <Key size={24} className="text-amber-400" />
                <h3 className="text-lg font-bold text-white">{t('settings.changePasswordTitle')}</h3>
              </div>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-white text-sm block mb-1">{t('settings.currentPassword')}</label>
                  <input
                    type="password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                    className="config-input w-full rounded-lg px-3 py-2 text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-white text-sm block mb-1">{t('settings.newPassword')}</label>
                  <input
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                    className="config-input w-full rounded-lg px-3 py-2 text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-white text-sm block mb-1">{t('settings.confirmPassword')}</label>
                  <input
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                    className="config-input w-full rounded-lg px-3 py-2 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg transition-colors"
                >
                  {t('common.update')}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ current: '', new: '', confirm: '' });
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
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