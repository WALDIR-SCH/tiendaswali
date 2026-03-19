// src/middleware.ts  ← debe estar en la RAÍZ de /src o en la raíz del proyecto
// ✅ Renombra tu archivo proxy.ts → middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS PROTEGIDAS — solo accesibles con sesión activa
// ─────────────────────────────────────────────────────────────────────────────
const RUTAS_PROTEGIDAS = [
  "/catalogo",
  "/carrito",
  "/opciones",
  "/gracias",
  "/producto",
  "/checkout",
  "/orders",
  "/dashboard",
  "/perfil",
];

// RUTAS DE ADMIN — solo rol admin o seller
const RUTAS_ADMIN = ["/admin"];

// RUTAS AUTH — si ya estás logueado, te redirige fuera
const RUTAS_AUTH = ["/login", "/register"];

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICAR SESIÓN
// Busca la cookie "session" y extrae uid + rol.
// Tu sistema guarda: "uid.rol.timestamp" en la cookie.
// ─────────────────────────────────────────────────────────────────────────────
function verificarSesion(request: NextRequest): {
  uid: string;
  rol: "admin" | "cliente" | "seller";
} | null {
  // Busca en múltiples nombres de cookie por compatibilidad
  const cookieSession =
    request.cookies.get("session")?.value ||
    request.cookies.get("__session")?.value ||
    request.cookies.get("auth-token")?.value;

  if (!cookieSession) return null;

  // Si la cookie está vacía o es solo espacios
  const valor = cookieSession.trim();
  if (!valor || valor.length < 5) return null;

  try {
    const partes = valor.split(".");

    // Formato esperado: uid.rol.anything
    if (partes.length < 2) return null;

    const uid = partes[0];
    const rol = partes[1] as "admin" | "cliente" | "seller";

    if (!uid || uid.length < 3) return null;
    if (!["admin", "cliente", "seller"].includes(rol)) return null;

    return { uid, rol };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesion = verificarSesion(request);

  const estaLogueado = sesion !== null;
  const esAdmin      = sesion?.rol === "admin" || sesion?.rol === "seller";

  // ── 1. RUTAS DE ADMIN ──────────────────────────────────────────────────────
  if (RUTAS_ADMIN.some(r => pathname.startsWith(r))) {
    if (!estaLogueado) {
      return redirigir(request, "/login", pathname, "admin-required");
    }
    if (!esAdmin) {
      return redirigir(request, "/catalogo", null, "no-permission");
    }
    return NextResponse.next();
  }

  // ── 2. RUTAS PROTEGIDAS ────────────────────────────────────────────────────
  if (RUTAS_PROTEGIDAS.some(r => pathname.startsWith(r))) {
    if (!estaLogueado) {
      return redirigir(request, "/login", pathname, "login-required");
    }
    return NextResponse.next();
  }

  // ── 3. RUTAS AUTH (login / register) ──────────────────────────────────────
  // Si ya tienes sesión activa, no dejas entrar al login/register
  if (RUTAS_AUTH.some(r => pathname.startsWith(r))) {
    if (estaLogueado) {
      const destino = esAdmin ? "/admin" : "/catalogo";
      return NextResponse.redirect(new URL(destino, request.url));
    }
    return NextResponse.next();
  }

  // ── 4. RESTO → libre para todos ───────────────────────────────────────────
  return NextResponse.next();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — construir redirección con parámetros
// ─────────────────────────────────────────────────────────────────────────────
function redirigir(
  request: NextRequest,
  destino: string,
  redirectTo: string | null,
  msg: string
) {
  const url = new URL(destino, request.url);
  if (redirectTo) url.searchParams.set("redirect", redirectTo);
  url.searchParams.set("msg", msg);
  return NextResponse.redirect(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHER — rutas donde se activa el middleware
// IMPORTANTE: no incluyas rutas de assets estáticos
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas EXCEPTO:
     * - _next/static  (archivos JS/CSS de Next.js)
     * - _next/image   (optimización de imágenes)
     * - favicon.ico
     * - archivos con extensión (png, jpg, svg, etc.)
     * - /api          (tus endpoints de API)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf|css|js)$).*)",
  ],
};