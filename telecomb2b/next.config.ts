import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opciones de compilador React (las tuyas)
  reactCompiler: true,
  
  // Modo estricto de React (recomendado)
  reactStrictMode: true,
  
  // Permite conexiones desde tu IP local (elimina la advertencia)
  allowedDevOrigins: ['10.2.0.2', 'localhost', '*.local'],
  
  // Configuración de imágenes
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;