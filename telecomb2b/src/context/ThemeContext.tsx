"use client";
// src/context/ThemeContext.tsx
// ─── ESTE CONTEXTO MANEJA TEMA (claro/oscuro) GLOBALMENTE ───────────────────
// Úsalo en cualquier componente con: const { tema, setTema } = useTheme()

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Tema = "claro" | "oscuro";

interface ThemeContextType {
  tema: Tema;
  setTema: (t: Tema) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  tema: "claro",
  setTema: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// ─── Variables CSS por tema ──────────────────────────────────────────────────
const temaVars: Record<Tema, Record<string, string>> = {
  claro: {
    "--bg-primary":      "#f9fafb",
    "--bg-secondary":    "#ffffff",
    "--bg-card":         "#ffffff",
    "--bg-input":        "#f3f4f6",
    "--bg-hover":        "#f3f4f6",
    "--text-primary":    "#111827",
    "--text-secondary":  "#6b7280",
    "--text-muted":      "#9ca3af",
    "--border":          "#e5e7eb",
    "--border-strong":   "#d1d5db",
    "--shadow":          "rgba(0,0,0,0.06)",
    "--shadow-md":       "rgba(0,0,0,0.10)",
    "--primary":         "#7c3aed",
    "--primary-hover":   "#6d28d9",
    "--primary-light":   "#f5f3ff",
    "--orange":          "#FF6600",
    "--green":           "#28FB4B",
    "--yellow":          "#F6FA00",
    "--navbar-bg":       "#ffffff",
    "--navbar-border":   "#f3f4f6",
    "--footer-bg":       "#111827",
    "--overlay":         "rgba(0,0,0,0.5)",
  },
  oscuro: {
    "--bg-primary":      "#0f0f13",
    "--bg-secondary":    "#1a1a24",
    "--bg-card":         "#1e1e2e",
    "--bg-input":        "#252535",
    "--bg-hover":        "#252535",
    "--text-primary":    "#f1f1f5",
    "--text-secondary":  "#a8a8c0",
    "--text-muted":      "#6b6b80",
    "--border":          "#2e2e42",
    "--border-strong":   "#3e3e58",
    "--shadow":          "rgba(0,0,0,0.3)",
    "--shadow-md":       "rgba(0,0,0,0.5)",
    "--primary":         "#9b5cf6",
    "--primary-hover":   "#7c3aed",
    "--primary-light":   "#1e1228",
    "--orange":          "#ff7a20",
    "--green":           "#22e649",
    "--yellow":          "#f5f000",
    "--navbar-bg":       "#141420",
    "--navbar-border":   "#2e2e42",
    "--footer-bg":       "#08080f",
    "--overlay":         "rgba(0,0,0,0.75)",
  },
};

function applyTema(tema: Tema) {
  const root = document.documentElement;
  const vars = temaVars[tema];
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", tema);
  // También setear clase para compatibilidad con Tailwind dark:
  if (tema === "oscuro") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>("claro");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Leer tema guardado
    const saved = localStorage.getItem("mm_tema") as Tema | null;
    const initial: Tema = saved === "oscuro" ? "oscuro" : "claro";
    setTemaState(initial);
    applyTema(initial);
    setMounted(true);
  }, []);

  const setTema = (t: Tema) => {
    setTemaState(t);
    applyTema(t);
    localStorage.setItem("mm_tema", t);
    // Sincronizar con configuración guardada
    try {
      const cfg = JSON.parse(localStorage.getItem("configUsuario") || "{}");
      cfg.tema = t;
      localStorage.setItem("configUsuario", JSON.stringify(cfg));
    } catch {}
  };

  // Evitar flash de tema incorrecto
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ tema, setTema }}>
      {children}
    </ThemeContext.Provider>
  );
}