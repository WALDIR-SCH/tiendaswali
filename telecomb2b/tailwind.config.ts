import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores personalizados para TelecomB2B
        "telecom-blue": "#1a56db", // Azul corporativo
        "telecom-dark": "#1e293b", // Gris oscuro para textos
      },
    },
  },
  plugins: [],
};
export default config;