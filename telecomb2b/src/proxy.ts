import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── PARSEAR COOKIE DE SESIÓN ──────────────────────────────────
function parsearSesion(request: NextRequest): { uid: string; rol: string } | null {
  const cookie = request.cookies.get("session")?.value;
  if (!cookie) return null;
  try {
    const partes = cookie.split(".");
    if (partes.length < 3) return null;
    const uid = partes[0];
    const rol = partes[1];
    if (!uid || !rol) return null;
    if (!["admin", "cliente", "seller"].includes(rol)) return null;
    return { uid, rol };
  } catch {
    return null;
  }
}

// ── PROXY PRINCIPAL ───────────────────────────────────────────
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesion = parsearSesion(request);

  const estaLogueado = sesion !== null;
  const esAdmin      = sesion?.rol === "admin" || sesion?.rol === "seller";
  const esCliente    = sesion?.rol === "cliente";

  // ── 1. RUTAS DE ADMIN → solo rol admin/seller ─────────────
  if (pathname.startsWith("/admin")) {
    if (!estaLogueado) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      url.searchParams.set("msg", "admin-required");
      return NextResponse.redirect(url);
    }
    if (!esAdmin) {
      // Cliente intentando entrar al admin → catálogo
      const url = new URL("/catalogo", request.url);
      url.searchParams.set("msg", "no-permission");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── 2. RUTAS PROTEGIDAS → requieren sesión activa ─────────
  const rutasProtegidas = [
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

  const esRutaProtegida = rutasProtegidas.some(r => pathname.startsWith(r));
  if (esRutaProtegida) {
    if (!estaLogueado) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      url.searchParams.set("msg", "login-required");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── 3. LOGIN / REGISTER → si ya hay sesión, redirigir ─────
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (estaLogueado) {
      const destino = esAdmin ? "/admin" : "/catalogo";
      return NextResponse.redirect(new URL(destino, request.url));
    }
    return NextResponse.next();
  }

  // ── 4. RESTO (/, /emails, /api, etc.) → libre ─────────────
  return NextResponse.next();
}

// ── MATCHER: rutas que activa el proxy ────────────────────────
export const config = {
  matcher: [
    "/admin/:path*",
    "/catalogo/:path*",
    "/carrito/:path*",
    "/opciones/:path*",
    "/gracias/:path*",
    "/producto/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/dashboard/:path*",
    "/perfil/:path*",
    "/login",
    "/register",
  ],
};