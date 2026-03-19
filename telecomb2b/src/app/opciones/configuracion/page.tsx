"use client";
// src/app/opciones/configuracion/page.tsx

import { useState, useEffect, useCallback } from 'react';
import { Settings, Bell, Lock, Shield, Palette, Download, Key, Database, Moon, Sun, Check, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/* ─── TRADUCCIONES ─── */
const TX: Record<string, Record<string, string>> = {
  titulo:         { es: "Configuración",              en: "Settings",                  pt: "Configurações"              },
  subtitulo:      { es: "Personaliza tu experiencia", en: "Customize your experience", pt: "Personalize sua experiência" },
  restablecer:    { es: "Restablecer",                en: "Reset",                     pt: "Restaurar"                  },
  apariencia:     { es: "Apariencia",                 en: "Appearance",                pt: "Aparência"                  },
  tema:           { es: "Tema",                       en: "Theme",                     pt: "Tema"                       },
  temaClaro:      { es: "Claro",                      en: "Light",                     pt: "Claro"                      },
  temaOscuro:     { es: "Oscuro",                     en: "Dark",                      pt: "Escuro"                     },
  idioma:         { es: "Idioma",                     en: "Language",                  pt: "Idioma"                     },
  notificaciones: { es: "Notificaciones",             en: "Notifications",             pt: "Notificações"               },
  notifEmail:     { es: "Por email",                  en: "Email alerts",              pt: "Por e-mail"                 },
  notifEmailDesc: { es: "Pedidos y cotizaciones",     en: "Orders and quotes",         pt: "Pedidos e cotações"         },
  notifApp:       { es: "En la app",                  en: "In-app",                    pt: "No app"                     },
  notifAppDesc:   { es: "Campana en tiempo real",     en: "Real-time bell",            pt: "Sino em tempo real"         },
  ofertas:        { es: "Ofertas y descuentos",       en: "Offers & discounts",        pt: "Ofertas e descontos"        },
  seguridad:      { es: "Seguridad",                  en: "Security",                  pt: "Segurança"                  },
  dosFactor:      { es: "Autenticación 2FA",          en: "2FA Authentication",        pt: "Autenticação 2FA"           },
  dosFactorDesc:  { es: "Capa extra de seguridad",    en: "Extra security layer",      pt: "Camada extra de segurança"  },
  privacidad:     { es: "Privacidad del perfil",      en: "Profile privacy",           pt: "Privacidade do perfil"      },
  publico:        { es: "Público",                    en: "Public",                    pt: "Público"                    },
  soloEmpresa:    { es: "Solo empresas verificadas",  en: "Verified companies only",   pt: "Só empresas verificadas"    },
  privado:        { es: "Privado",                    en: "Private",                   pt: "Privado"                    },
  cuenta:         { es: "Acciones de cuenta",         en: "Account actions",           pt: "Ações da conta"             },
  cambiarPass:    { es: "Cambiar contraseña",         en: "Change password",           pt: "Alterar senha"              },
  exportar:       { es: "Exportar mis datos",         en: "Export my data",            pt: "Exportar meus dados"        },
  historial:      { es: "Descargar historial",        en: "Download history",          pt: "Baixar histórico"           },
  passActual:     { es: "Contraseña actual",          en: "Current password",          pt: "Senha atual"                },
  passNueva:      { es: "Nueva contraseña",           en: "New password",              pt: "Nova senha"                 },
  passConfirmar:  { es: "Confirmar contraseña",       en: "Confirm password",          pt: "Confirmar senha"            },
  guardar:        { es: "Guardar cambios",            en: "Save changes",              pt: "Salvar alterações"          },
  cancelar:       { es: "Cancelar",                   en: "Cancel",                    pt: "Cancelar"                   },
  actualizar:     { es: "Actualizar",                 en: "Update",                    pt: "Atualizar"                  },
  confirmar:      { es: "Confirmar",                  en: "Confirm",                   pt: "Confirmar"                  },
  guardado:       { es: "✅ Cambios guardados",       en: "✅ Changes saved",          pt: "✅ Alterações salvas"       },
  activado:       { es: "Activado",                   en: "Enabled",                   pt: "Ativado"                    },
  vistaPrev:      { es: "Vista previa",               en: "Preview",                   pt: "Pré-visualização"           },
};

const t = (k: string, lang: string) => TX[k]?.[lang] ?? TX[k]?.["es"] ?? k;

/* ─── COLORES POR TEMA ─── */
const TEMAS = {
  claro: {
    bgPage:     "#f9fafb",
    bgCard:     "#ffffff",
    bgInput:    "#f3f4f6",
    bgHover:    "#f3f4f6",
    text:       "#111827",
    textSec:    "#6b7280",
    textMuted:  "#9ca3af",
    border:     "#e5e7eb",
    borderStr:  "#d1d5db",
    primary:    "#7c3aed",
    priLight:   "#f5f3ff",
    shadow:     "0 4px 20px rgba(0,0,0,0.07)",
    shadowHov:  "0 8px 32px rgba(0,0,0,0.12)",
  },
  oscuro: {
    bgPage:     "#0f0f13",
    bgCard:     "#1e1e2e",
    bgInput:    "#252535",
    bgHover:    "#2a2a3e",
    text:       "#f1f1f5",
    textSec:    "#a8a8c0",
    textMuted:  "#6b6b80",
    border:     "#2e2e42",
    borderStr:  "#3e3e58",
    primary:    "#9b5cf6",
    priLight:   "#1e1228",
    shadow:     "0 4px 20px rgba(0,0,0,0.4)",
    shadowHov:  "0 8px 32px rgba(0,0,0,0.6)",
  },
};

type TemaKey = keyof typeof TEMAS;

/* ─── APLICAR TEMA AL DOM ─── */
function applyThemeToDOM(tema: TemaKey) {
  const T = TEMAS[tema];
  const r = document.documentElement;
  r.setAttribute("data-theme", tema);
  if (tema === "oscuro") r.classList.add("dark"); else r.classList.remove("dark");
  // Variables CSS globales que afectan TODA la app
  const vars: Record<string, string> = {
    "--bg-page":       T.bgPage,
    "--bg-card":       T.bgCard,
    "--bg-input":      T.bgInput,
    "--bg-hover":      T.bgHover,
    "--color-text":    T.text,
    "--color-text-2":  T.textSec,
    "--color-muted":   T.textMuted,
    "--color-border":  T.border,
    "--color-border2": T.borderStr,
    "--color-primary": T.primary,
    "--color-priLight":T.priLight,
  };
  Object.entries(vars).forEach(([k, v]) => r.style.setProperty(k, v));
  // También setear body directamente para cobertura total
  document.body.style.backgroundColor = T.bgPage;
  document.body.style.color = T.text;
}

/* ─── TOGGLE ─── */
const Toggle = ({ on, onChange, C }: { on: boolean; onChange: () => void; C: typeof TEMAS.claro }) => (
  <button onClick={onChange} style={{
    position: "relative", width: 44, height: 24, borderRadius: 20,
    background: on ? C.primary : C.border, border: "none", cursor: "pointer",
    flexShrink: 0, transition: "background 0.25s",
  }}>
    <span style={{
      position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
      background: "#fff", transition: "left 0.25s",
      left: on ? 23 : 3, boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    }} />
  </button>
);

/* ─── ROW ─── */
const Row = ({ label, desc, right, C }: { label: string; desc?: string; right: React.ReactNode; C: typeof TEMAS.claro }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `1px solid ${C.border}` }}>
    <div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>{label}</p>
      {desc && <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textMuted }}>{desc}</p>}
    </div>
    {right}
  </div>
);

/* ═══════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════ */
export default function ConfiguracionPage() {
  const { language, setLanguage } = useLanguage();
  const L = useCallback((k: string) => t(k, language), [language]);

  /* estado */
  const [tema,       setTemaState]  = useState<TemaKey>("claro");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifApp,   setNotifApp]   = useState(true);
  const [ofertas,    setOfertas]    = useState(true);
  const [twoFA,      setTwoFA]      = useState(false);
  const [priv,       setPriv]       = useState("publico");
  const [show2FA,    setShow2FA]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [toast,      setToast]      = useState(false);
  const [pass,       setPass]       = useState({ actual: "", nueva: "", confirm: "" });

  /* cargar config guardada */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_config");
      if (raw) {
        const c = JSON.parse(raw);
        const savedTema: TemaKey = c.tema === "oscuro" ? "oscuro" : "claro";
        setTemaState(savedTema);
        applyThemeToDOM(savedTema);
        if (c.notifEmail  !== undefined) setNotifEmail(c.notifEmail);
        if (c.notifApp    !== undefined) setNotifApp(c.notifApp);
        if (c.ofertas     !== undefined) setOfertas(c.ofertas);
        if (c.twoFA       !== undefined) setTwoFA(c.twoFA);
        if (c.priv        !== undefined) setPriv(c.priv);
        if (c.idioma && c.idioma !== language) setLanguage(c.idioma);
      } else {
        applyThemeToDOM("claro");
      }
    } catch { applyThemeToDOM("claro"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* guardar */
  const save = (overrides: Record<string, any> = {}) => {
    const cfg = { tema, notifEmail, notifApp, ofertas, twoFA, priv, idioma: language, ...overrides };
    localStorage.setItem("mm_config", JSON.stringify(cfg));
    // también guardar clave legacy para compatibilidad
    localStorage.setItem("mm_tema", cfg.tema);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  /* cambiar tema */
  const changeTema = (v: TemaKey) => {
    setTemaState(v);
    applyThemeToDOM(v);
    save({ tema: v });
  };

  /* cambiar idioma */
  const changeIdioma = (v: string) => {
    setLanguage(v);
    save({ idioma: v });
    // emitir evento para que el Navbar lo capture
    window.dispatchEvent(new CustomEvent("languageChanged", { detail: v }));
  };

  /* reset */
  const handleReset = () => {
    setTemaState("claro"); applyThemeToDOM("claro");
    setNotifEmail(true); setNotifApp(true); setOfertas(true);
    setTwoFA(false); setPriv("publico"); setLanguage("es");
    localStorage.removeItem("mm_config"); localStorage.removeItem("mm_tema");
    setToast(true); setTimeout(() => setToast(false), 2000);
  };

  const C = TEMAS[tema];

  /* ── Estilos reutilizables ── */
  const cardStyle: React.CSSProperties = {
    background: C.bgCard, border: `1px solid ${C.border}`,
    borderRadius: 18, padding: "20px 22px", boxShadow: C.shadow,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 11,
    border: `1.5px solid ${C.border}`, background: C.bgInput,
    color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ background: C.bgPage, minHeight: "100vh", padding: "32px 20px", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", transition: "background 0.3s, color 0.3s" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 80, right: 24, zIndex: 999,
            background: C.primary, color: "#fff",
            padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
            boxShadow: C.shadow, animation: "slideIn 0.3s ease",
          }}>
            {L("guardado")}
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: C.text, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.03em" }}>
              <Settings size={24} style={{ color: C.primary }} />
              {L("titulo")}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>{L("subtitulo")}</p>
          </div>
          <button onClick={handleReset} style={{
            padding: "9px 18px", borderRadius: 11, fontSize: 12, fontWeight: 700,
            background: C.bgInput, color: C.textSec, border: `1.5px solid ${C.border}`, cursor: "pointer",
          }}>
            {L("restablecer")}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>

          {/* ══ COLUMNA IZQUIERDA ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── APARIENCIA ── */}
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                <Palette size={18} style={{ color: C.primary }} />{L("apariencia")}
              </h2>

              {/* Tema */}
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{L("tema")}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {([
                  { val: "claro"  as TemaKey, Icon: Sun,  ic: "#f59e0b", preview: ["#f9fafb","#ffffff","#e5e7eb"] },
                  { val: "oscuro" as TemaKey, Icon: Moon, ic: "#818cf8", preview: ["#0f0f13","#1e1e2e","#2e2e42"] },
                ] as const).map(opt => {
                  const sel = tema === opt.val;
                  return (
                    <button key={opt.val} onClick={() => changeTema(opt.val)} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      padding: "16px 12px", borderRadius: 14, cursor: "pointer",
                      border: `2px solid ${sel ? C.primary : C.border}`,
                      background: sel ? C.priLight : C.bgInput,
                      position: "relative", transition: "all 0.2s",
                    }}>
                      {sel && (
                        <span style={{ position: "absolute", top: 8, right: 8, width: 16, height: 16, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={9} color="#fff" strokeWidth={3} />
                        </span>
                      )}
                      <opt.Icon size={22} style={{ color: sel ? C.primary : opt.ic }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: sel ? C.primary : C.textSec }}>
                        {L(opt.val === "claro" ? "temaClaro" : "temaOscuro")}
                      </span>
                      {/* swatches */}
                      <div style={{ display: "flex", gap: 4 }}>
                        {opt.preview.map((c, ci) => (
                          <div key={ci} style={{ width: 12, height: 12, borderRadius: 4, background: c, border: `1px solid ${C.border}` }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Idioma */}
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", paddingTop: 16, borderTop: `1px solid ${C.border}` }}>{L("idioma")}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { val: "es", flag: "🇵🇪", label: "Español" },
                  { val: "en", flag: "🇺🇸", label: "English" },
                  { val: "pt", flag: "🇧🇷", label: "Português" },
                ].map(l => {
                  const sel = language === l.val;
                  return (
                    <button key={l.val} onClick={() => changeIdioma(l.val)} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                      padding: "12px 8px", borderRadius: 12, cursor: "pointer",
                      border: `2px solid ${sel ? C.primary : C.border}`,
                      background: sel ? C.priLight : C.bgInput,
                      position: "relative", transition: "all 0.2s",
                    }}>
                      {sel && (
                        <span style={{ position: "absolute", top: 5, right: 5, width: 14, height: 14, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={8} color="#fff" strokeWidth={3} />
                        </span>
                      )}
                      <span style={{ fontSize: 22 }}>{l.flag}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sel ? C.primary : C.textSec }}>{l.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── NOTIFICACIONES ── */}
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={18} style={{ color: "#FF6600" }} />{L("notificaciones")}
              </h2>
              <Row C={C} label={L("notifEmail")} desc={L("notifEmailDesc")} right={<Toggle C={C} on={notifEmail} onChange={() => { setNotifEmail(v => !v); save({ notifEmail: !notifEmail }); }} />} />
              <Row C={C} label={L("notifApp")}   desc={L("notifAppDesc")}   right={<Toggle C={C} on={notifApp}   onChange={() => { setNotifApp(v => !v);   save({ notifApp: !notifApp });   }} />} />
              <Row C={C} label={L("ofertas")}    desc=""                    right={<Toggle C={C} on={ofertas}    onChange={() => { setOfertas(v => !v);    save({ ofertas: !ofertas });     }} />} />
            </div>

            {/* ── SEGURIDAD ── */}
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                <Lock size={18} style={{ color: "#22c55e" }} />{L("seguridad")}
              </h2>
              <Row C={C} label={L("dosFactor")} desc={L("dosFactorDesc")} right={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {twoFA && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#dcfce7", color: "#16a34a" }}>{L("activado")}</span>}
                  <Toggle C={C} on={twoFA} onChange={() => twoFA ? (setTwoFA(false), save({ twoFA: false })) : setShow2FA(true)} />
                </div>
              } />
              <Row C={C} label={L("privacidad")} desc="" right={
                <select value={priv} onChange={e => { setPriv(e.target.value); save({ priv: e.target.value }); }} style={{ ...inputStyle, width: 180 }}>
                  <option value="publico">{L("publico")}</option>
                  <option value="soloEmpresa">{L("soloEmpresa")}</option>
                  <option value="privado">{L("privado")}</option>
                </select>
              } />
            </div>
          </div>

          {/* ══ COLUMNA DERECHA ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Vista previa LIVE */}
            <div style={cardStyle}>
              <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{L("vistaPrev")}</p>
              {/* Mini mockup */}
              <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
                {/* navbar fake */}
                <div style={{ background: tema === "oscuro" ? "#141420" : "#ffffff", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: C.primary, opacity: 0.9 }} />
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.bgInput }} />
                  <div style={{ width: 24, height: 6, borderRadius: 3, background: C.primary, opacity: 0.5 }} />
                </div>
                {/* contenido fake */}
                <div style={{ background: C.bgPage, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ height: 8, borderRadius: 3, background: C.text, opacity: 0.15, width: "55%" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {[0, 1].map(n => (
                      <div key={n} style={{ background: C.bgCard, borderRadius: 7, padding: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ height: 24, borderRadius: 5, background: C.bgInput, marginBottom: 6 }} />
                        <div style={{ height: 5, borderRadius: 3, background: C.bgInput, marginBottom: 4 }} />
                        <div style={{ height: 5, borderRadius: 3, background: C.bgInput, width: "70%" }} />
                        <div style={{ marginTop: 7, height: 14, borderRadius: 5, background: C.primary, opacity: 0.6 }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 11, color: C.textMuted }}>
                {L(tema === "claro" ? "temaClaro" : "temaOscuro")} · {language.toUpperCase()}
              </p>
            </div>

            {/* Acciones */}
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: C.text }}>{L("cuenta")}</h2>
              {[
                {
                  label: L("cambiarPass"), Icon: Key, color: "#FF6600", bg: tema === "oscuro" ? "#2a1a0f" : "#fff7ed",
                  action: () => setShowPass(true),
                },
                {
                  label: L("exportar"), Icon: Download, color: C.primary, bg: C.priLight,
                  action: () => {
                    const d = localStorage.getItem("mm_config") || "{}";
                    const a = document.createElement("a");
                    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(d);
                    a.download = `config-${new Date().toISOString().slice(0,10)}.json`;
                    a.click();
                  },
                },
                {
                  label: L("historial"), Icon: Database, color: "#16a34a", bg: tema === "oscuro" ? "#0d1f10" : "#f0fdf4",
                  action: () => alert("Próximamente"),
                },
              ].map(a => (
                <button key={a.label} onClick={a.action} style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "12px 14px", borderRadius: 12, marginBottom: 8,
                  background: a.bg, border: `1px solid ${a.color}30`,
                  color: a.color, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <a.Icon size={15} />{a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Botón guardar */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => save()} style={{
            padding: "12px 32px", borderRadius: 13,
            background: `linear-gradient(135deg, ${C.primary}, ${tema === "oscuro" ? "#7c3aed" : "#5b21b6"})`,
            color: "#fff", border: "none", fontSize: 14, fontWeight: 800,
            cursor: "pointer", boxShadow: C.shadow,
          }}>
            {L("guardar")}
          </button>
        </div>
      </div>

      {/* ── Modal 2FA ── */}
      {show2FA && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, maxWidth: 360, width: "100%", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Shield size={20} style={{ color: "#22c55e" }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Activar 2FA</h3>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
              Escanea el código QR con Google Authenticator o Authy.
            </p>
            <div style={{ background: "#fff", padding: 16, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 90, height: 90, background: "#f3f4f6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#374151" }}>QR CODE</span>
                <span style={{ fontSize: 9, color: "#9ca3af" }}>2FA-MUNDOMMOVIL</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setTwoFA(true); save({ twoFA: true }); setShow2FA(false); }} style={{ flex: 1, padding: 11, borderRadius: 11, background: "#22c55e", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{L("confirmar")}</button>
              <button onClick={() => setShow2FA(false)} style={{ flex: 1, padding: 11, borderRadius: 11, background: C.bgInput, color: C.text, border: `1px solid ${C.border}`, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{L("cancelar")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Contraseña ── */}
      {showPass && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, maxWidth: 360, width: "100%", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Key size={20} style={{ color: "#FF6600" }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>{L("cambiarPass")}</h3>
            </div>
            {([
              { key: "actual", label: L("passActual") },
              { key: "nueva",  label: L("passNueva") },
              { key: "confirm",label: L("passConfirmar") },
            ] as const).map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textSec, marginBottom: 5 }}>{f.label}</label>
                <input type="password" value={pass[f.key]}
                  onChange={e => setPass(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.primary}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => {
                if (pass.nueva !== pass.confirm) { alert("Las contraseñas no coinciden"); return; }
                if (pass.nueva.length < 6) { alert("Mínimo 6 caracteres"); return; }
                setShowPass(false); setPass({ actual: "", nueva: "", confirm: "" }); alert("✅ Contraseña actualizada");
              }} style={{ flex: 1, padding: 11, borderRadius: 11, background: C.primary, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                {L("actualizar")}
              </button>
              <button onClick={() => { setShowPass(false); setPass({ actual: "", nueva: "", confirm: "" }); }} style={{ flex: 1, padding: 11, borderRadius: 11, background: C.bgInput, color: C.text, border: `1px solid ${C.border}`, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                {L("cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:translateX(0) } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}