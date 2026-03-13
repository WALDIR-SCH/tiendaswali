import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session');
  const path = request.nextUrl.pathname;

  // Rutas públicas (NO requieren autenticación)
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    // '/products',
    // '/products/',
    // '/catalogo', // Si usas /catalogo como alias
  ];
  
  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some(route => 
    path === route || path.startsWith('/products/')
  );

  // Si es ruta pública, permitir acceso
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Si NO hay sesión, redirigir a login
  if (!session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/perfil/:path*',
    '/catalogo/:path*',
    '/dashboard/:path*',
    '/cart/:path*',
    '/orders/:path*',
    '/checkout/:path*',
    '/carrito/:path*',
  ]
};