// src/context/LanguageContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'es' | 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// 🟢 FLAG GLOBAL PARA PREVENIR CICLOS
let isChangingLanguage = false;

// 🟢 TRADUCCIONES COMPLETAS INTEGRADAS DIRECTAMENTE
const translations = {
  es: {
    // Navegación principal
    'nav.catalog': 'Catálogo',
    'nav.cart': 'Carrito',
    
    // Usuario
    'user.guest': 'Invitado',
    'user.avatar': 'Avatar del usuario',
    'user.menu': 'Menú de usuario',
    
    // Estados
    'status.unverified': 'Sin verificar',
    'status.verified': 'Verificado',
    
    // Empresa
    'company.none': 'Sin empresa',
    
    // Cargo
    'position.notAssigned': 'Sin cargo asignado',
    
    // Roles
    'role.admin': 'Administrador',
    'role.seller': 'Vendedor',
    'role.client': 'Cliente',
    'role.label': 'Rol',
    
    // Menú del usuario
    'menu.profile': 'Mi Perfil',
    'menu.profileDescription': 'Ver y editar información personal',
    'menu.company': 'Empresa',
    'menu.companyDescription': 'Datos de la empresa',
    'menu.orders': 'Mis Órdenes',
    'menu.ordersDescription': 'Historial y seguimiento',
    'menu.quotations': 'Cotizaciones',
    'menu.quotationsDescription': 'Solicitudes de cotización',
    'menu.billing': 'Facturación',
    'menu.billingDescription': 'Datos fiscales y facturas',
    'menu.settings': 'Configuración',
    'menu.settingsDescription': 'Preferencias de cuenta',
    'menu.adminPanel': 'Panel de Administración',
    
    // Autenticación
    'auth.access': 'ACCESO',
    'auth.register': 'REGISTRAR',
    'auth.logout': 'Cerrar Sesión',
    'auth.logoutDescription': 'Salir de la cuenta',
    
    // Notificaciones
    'notifications.title': 'Notificaciones',
    
    // Idioma
    'language.switchToEnglish': 'Cambiar a inglés',
    'language.switchToSpanish': 'Cambiar a español',
    'language.switchToPortuguese': 'Cambiar a portugués',
    
    // Traducciones generales
    catalog: "Catálogo",
    profile: "Perfil",
    company: "Empresa",
    orders: "Pedidos",
    quotes: "Cotizaciones",
    billing: "Facturación",
    settings: "Configuración",
    search: "Buscar...",
    login: "Iniciar Sesión",
    logout: "Cerrar Sesión",
    products: "Productos",
    cart: "Carrito",
    notifications: "Notificaciones",
    help: "Ayuda",
    home: "Inicio",

    // CATÁLOGO
    'catalog.title': 'Catálogo',
    'catalog.professional': 'Profesional',
    'catalog.subtitle': 'Suministros especializados para infraestructura de telecomunicaciones',
    'catalog.marketBadge': 'TELCOMB2B MARKET',
    'catalog.searchPlaceholder': 'Buscar producto, SKU o marca...',
    'catalog.categories': 'CATEGORÍAS',
    'catalog.productsAvailable': 'productos disponibles',
    'catalog.filterBy': 'Filtrar por',
    'catalog.noProductsFound': 'No se encontraron productos',
    'catalog.noResultsFor': 'No hay resultados para',
    'catalog.in': 'en',
    'catalog.allCategories': 'todas las categorías',
    'catalog.tryAnotherCategory': 'Intenta seleccionar otra categoría o ampliar los criterios de búsqueda',
    'catalog.viewAllCatalog': 'Ver todo el catálogo',
    'catalog.loadingProduct': 'Cargando producto...',
    'catalog.viewDetails': 'Ver detalles de',
    'catalog.uncategorized': 'Sin categoría',
    
    // Lista de categorías
    'catalog.categoriesList.todos': 'Todos',
    'catalog.categoriesList.cableado_y_conectores': 'Cableado y Conectores',
    'catalog.categoriesList.equipos_activos_de_red': 'Equipos Activos de Red',
    'catalog.categoriesList.infraestructura_pasiva': 'Infraestructura Pasiva',
    'catalog.categoriesList.herramientas_de_instalacion': 'Herramientas de Instalación',
    'catalog.categoriesList.accesorios_para_radiofrecuencia': 'Accesorios para Radiofrecuencia',
    'catalog.categoriesList.componentes_ftth': 'Componentes FTTH',
    'catalog.categoriesList.consumibles_y_sellado': 'Consumibles y Sellado',
    'catalog.categoriesList.seguridad_y_proteccion_electrica': 'Seguridad y Protección Eléctrica',
    
    // Footer del catálogo
    'catalog.footer.platform': 'TelcomB2B Market • Plataforma profesional para suministros de telecomunicaciones',
    'catalog.footer.allPricesIn': 'Todos los precios en',
    
    // Traducciones generales
    'common.clear': 'Limpiar',
    'common.scrollToTop': 'Volver arriba',
    'common.confirm': 'Confirmar',
    'common.cancel': 'Cancelar',
    'common.update': 'Actualizar',
    'common.error': 'Error',

    // CONFIGURACIÓN
    'settings.title': 'Configuración',
    'settings.subtitle': 'Personaliza tu experiencia en la plataforma',
    'settings.notifications': 'Notificaciones',
    'settings.emailNotifications': 'Notificaciones por Email',
    'settings.emailDesc': 'Recibe actualizaciones importantes por correo',
    'settings.appNotifications': 'Notificaciones en App',
    'settings.appDesc': 'Alertas dentro de la plataforma',
    'settings.specialOffers': 'Ofertas especiales',
    'settings.offersDesc': 'Recibir promociones y descuentos',
    'settings.security': 'Seguridad',
    'settings.twoFactor': 'Autenticación de dos factores',
    'settings.twoFactorDesc': 'Protege tu cuenta con 2FA',
    'settings.profilePrivacy': 'Privacidad del perfil',
    'settings.showPrices': 'Mostrar precios',
    'settings.alwaysShow': 'Siempre mostrar',
    'settings.onlyLogin': 'Solo al iniciar sesión',
    'settings.appearance': 'Apariencia',
    'settings.theme': 'Tema',
    'settings.dark': 'Oscuro',
    'settings.light': 'Claro',
    'settings.language': 'Idioma',
    'settings.catalogView': 'Vista de catálogo',
    'settings.grid': 'Cuadrícula',
    'settings.list': 'Lista',
    'settings.accountActions': 'Acciones de Cuenta',
    'settings.changePassword': 'Cambiar contraseña',
    'settings.exportData': 'Exportar datos',
    'settings.downloadHistory': 'Descargar historial',
    'settings.restoreDefaults': 'Restaurar valores',
    'settings.activate': 'Activado',
    'settings.scanQR': 'Escanea este código QR con tu aplicación de autenticación',
    'settings.currentPassword': 'Contraseña actual',
    'settings.newPassword': 'Nueva contraseña',
    'settings.confirmPassword': 'Confirmar nueva contraseña',
    'settings.activate2FA': 'Activar 2FA',
    'settings.changePasswordTitle': 'Cambiar Contraseña',
    'settings.privacy.public': 'Público',
    'settings.privacy.verifiedCompanies': 'Solo empresas verificadas',
    'settings.privacy.private': 'Privado',

    // PRODUCTO DETALLE
    'product.title': 'Detalle del Producto',
    'product.backToCatalog': 'Volver al catálogo',
    'product.share': 'Compartir',
    'product.whatsapp': 'WhatsApp',
    'product.facebook': 'Facebook',
    'product.copyLink': 'Copiar enlace',
    'product.stock': 'Stock',
    'product.new': 'Nuevo',
    'product.premiumBadge': 'Premium B2B',
    'product.rating': 'Calificación',
    'product.reviews': 'opiniones',
    'product.review': 'opinión',
    'product.priceSpecial': 'Precio especial B2B • IVA no incluido',
    'product.shipping': 'Envío Express',
    'product.shippingTime': '24-48h nacional',
    'product.warranty': 'Garantía 12 meses',
    'product.warrantyDesc': 'B2B sin costos',
    'product.payment': 'Pago Seguro',
    'product.paymentDesc': 'SSL 256-bit',
    'product.quality': 'Calidad Premium',
    'product.qualityDesc': 'Certificado',
    'product.addToCart': 'Agregar al carrito',
    'product.addedToCart': '¡Añadido al carrito!',
    'product.outOfStock': 'Sin stock disponible',
    'product.description': 'Descripción',
    'product.specifications': 'Especificaciones',
    'product.customerPhotos': 'Fotos de clientes',
    'product.photo': 'foto',
    'product.photos': 'fotos',
    'product.verified': 'Verificado',
    'product.useful': 'Útil',
    'product.leaveReview': 'Deja tu opinión',
    'product.yourExperience': 'Tu experiencia',
    'product.minChars': 'Mínimo 10 caracteres',
    'product.photosOptional': 'Fotos (opcional)',
    'product.totalSize': 'Tamaño total',
    'product.maximum': 'Máximo',
    'product.uploadPhotos': 'Subir fotos',
    'product.photoCount': '/4 • Máx 3MB por imagen • 10MB total',
    'product.tip': '💡 Consejo: Las imágenes se comprimen automáticamente para una subida más rápida. Evita imágenes mayores a 3MB para mejor rendimiento.',
    'product.terms': 'Al publicar, aceptas que tu nombre será visible públicamente',
    'product.signInToReview': 'Inicia sesión para dejar una reseña',
    'product.signIn': 'Iniciar sesión',
    'product.noReviews': 'Aún no hay reseñas',
    'product.beFirst': '¡Sé el primero en compartir tu experiencia!',
    'product.loading': 'Cargando producto...',
    'product.productNotFound': 'Producto no encontrado',
    'product.notFoundDesc': 'El producto que buscas no existe o ha sido eliminado.',
    'product.gallery': 'Galería',
    'product.of': 'de',
    'product.previous': 'Anterior',
    'product.next': 'Siguiente',
    'product.close': 'Cerrar',
    'product.publishReview': 'Publicar reseña',
    'product.processing': 'Procesando...',
    'product.uploading': 'Subiendo',
    'product.progress': 'Progreso',
    'product.reviewPublished': '¡Reseña publicada exitosamente!',
    'product.reviewError': 'Error al enviar la reseña. Por favor intenta nuevamente.',
    'product.continueWithoutImages': '¿Deseas continuar sin imágenes?',
    'product.noImagesUploaded': 'No se pudo subir ninguna imagen',
    'product.imagesFailed': 'imágenes no se pudieron subir',
    'product.imagesUploaded': 'imágenes subidas exitosamente',

    // Calificaciones
    'product.ratings.excellent': '¡Excelente!',
    'product.ratings.veryGood': 'Muy bueno',
    'product.ratings.good': 'Bueno',
    'product.ratings.fair': 'Regular',
    'product.ratings.needsImprovement': 'Necesita mejorar',

    // Estados de subida
    'product.upload.preparing': 'Preparando subida...',
    'product.upload.processingImage': 'Procesando imagen',
    'product.upload.uploadingImage': 'Subiendo imagen',
    'product.upload.savingReview': 'Guardando reseña en Firestore...',
    'product.upload.completed': '¡Subida completada!',
    'product.upload.cancelled': 'Subida cancelada',

    // Botones
    'product.button.cancel': 'Cancelar',
    'product.button.continue': 'Continuar',
    'product.button.confirm': 'Confirmar',
    'product.button.delete': 'Eliminar',
    'product.button.retry': 'Reintentar',

    // Mensajes de validación
    'product.validation.loginRequired': 'Debes iniciar sesión para dejar una reseña',
    'product.validation.loginRequiredVote': 'Debes iniciar sesión',
    'product.validation.minCharacters': 'La reseña debe tener al menos 10 caracteres',
    'product.validation.maxImages': 'Máximo 4 imágenes por reseña',
    'product.validation.maxSizePerImage': 'Máximo 3MB por imagen',
    'product.validation.maxTotalSize': 'El tamaño total de las imágenes no puede superar 10MB',
    'product.validation.invalidImage': 'El archivo no es una imagen válida',

    // Autenticación adicional
    'auth.passwordsNotMatch': 'Las contraseñas no coinciden',
    'auth.passwordMinLength': 'La contraseña debe tener al menos 6 caracteres',
    'auth.passwordUpdated': 'Contraseña actualizada correctamente'
  },
  en: {
    // Navegación principal
    'nav.catalog': 'Catalog',
    'nav.cart': 'Cart',
    
    // Usuario
    'user.guest': 'Guest',
    'user.avatar': 'User avatar',
    'user.menu': 'User menu',
    
    // Estados
    'status.unverified': 'Unverified',
    'status.verified': 'Verified',
    
    // Empresa
    'company.none': 'No company',
    
    // Cargo
    'position.notAssigned': 'No position assigned',
    
    // Roles
    'role.admin': 'Administrator',
    'role.seller': 'Seller',
    'role.client': 'Client',
    'role.label': 'Role',
    
    // Menú del usuario
    'menu.profile': 'My Profile',
    'menu.profileDescription': 'View and edit personal information',
    'menu.company': 'Company',
    'menu.companyDescription': 'Company data',
    'menu.orders': 'My Orders',
    'menu.ordersDescription': 'History and tracking',
    'menu.quotations': 'Quotations',
    'menu.quotationsDescription': 'Quotation requests',
    'menu.billing': 'Billing',
    'menu.billingDescription': 'Tax data and invoices',
    'menu.settings': 'Settings',
    'menu.settingsDescription': 'Account preferences',
    'menu.adminPanel': 'Administration Panel',
    
    // Autenticación
    'auth.access': 'ACCESS',
    'auth.register': 'REGISTER',
    'auth.logout': 'Log Out',
    'auth.logoutDescription': 'Exit account',
    
    // Notificaciones
    'notifications.title': 'Notifications',
    
    // Idioma
    'language.switchToEnglish': 'Switch to English',
    'language.switchToSpanish': 'Switch to Spanish',
    'language.switchToPortuguese': 'Switch to Portuguese',
    
    // Traducciones generales
    catalog: "Catalog",
    profile: "Profile",
    company: "Company",
    orders: "Orders",
    quotes: "Quotes",
    billing: "Billing",
    settings: "Settings",
    search: "Search...",
    login: "Login",
    logout: "Logout",
    products: "Products",
    cart: "Cart",
    notifications: "Notifications",
    help: "Help",
    home: "Home",

    // CATALOG
    'catalog.title': 'Catalog',
    'catalog.professional': 'Professional',
    'catalog.subtitle': 'Specialized supplies for telecommunications infrastructure',
    'catalog.marketBadge': 'TELCOMB2B MARKET',
    'catalog.searchPlaceholder': 'Search product, SKU or brand...',
    'catalog.categories': 'CATEGORIES',
    'catalog.productsAvailable': 'products available',
    'catalog.filterBy': 'Filter by',
    'catalog.noProductsFound': 'No products found',
    'catalog.noResultsFor': 'No results for',
    'catalog.in': 'in',
    'catalog.allCategories': 'all categories',
    'catalog.tryAnotherCategory': 'Try selecting another category or expanding search criteria',
    'catalog.viewAllCatalog': 'View all catalog',
    'catalog.loadingProduct': 'Loading product...',
    'catalog.viewDetails': 'View details of',
    'catalog.uncategorized': 'Uncategorized',
    
    // Categories list
    'catalog.categoriesList.todos': 'All',
    'catalog.categoriesList.cableado_y_conectores': 'Cabling and Connectors',
    'catalog.categoriesList.equipos_activos_de_red': 'Active Network Equipment',
    'catalog.categoriesList.infraestructura_pasiva': 'Passive Infrastructure',
    'catalog.categoriesList.herramientas_de_instalacion': 'Installation Tools',
    'catalog.categoriesList.accesorios_para_radiofrecuencia': 'RF Accessories',
    'catalog.categoriesList.componentes_ftth': 'FTTH Components',
    'catalog.categoriesList.consumibles_y_sellado': 'Consumables and Sealing',
    'catalog.categoriesList.seguridad_y_proteccion_electrica': 'Security and Electrical Protection',
    
    // Catalog footer
    'catalog.footer.platform': 'TelcomB2B Market • Professional platform for telecommunications supplies',
    'catalog.footer.allPricesIn': 'All prices in',
    
    // General translations
    'common.clear': 'Clear',
    'common.scrollToTop': 'Scroll to top',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.update': 'Update',
    'common.error': 'Error',

    // SETTINGS
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize your platform experience',
    'settings.notifications': 'Notifications',
    'settings.emailNotifications': 'Email Notifications',
    'settings.emailDesc': 'Receive important updates by email',
    'settings.appNotifications': 'App Notifications',
    'settings.appDesc': 'Alerts within the platform',
    'settings.specialOffers': 'Special Offers',
    'settings.offersDesc': 'Receive promotions and discounts',
    'settings.security': 'Security',
    'settings.twoFactor': 'Two-Factor Authentication',
    'settings.twoFactorDesc': 'Protect your account with 2FA',
    'settings.profilePrivacy': 'Profile Privacy',
    'settings.showPrices': 'Show Prices',
    'settings.alwaysShow': 'Always show',
    'settings.onlyLogin': 'Only when logged in',
    'settings.appearance': 'Appearance',
    'settings.theme': 'Theme',
    'settings.dark': 'Dark',
    'settings.light': 'Light',
    'settings.language': 'Language',
    'settings.catalogView': 'Catalog View',
    'settings.grid': 'Grid',
    'settings.list': 'List',
    'settings.accountActions': 'Account Actions',
    'settings.changePassword': 'Change Password',
    'settings.exportData': 'Export Data',
    'settings.downloadHistory': 'Download History',
    'settings.restoreDefaults': 'Restore Defaults',
    'settings.activate': 'Activated',
    'settings.scanQR': 'Scan this QR code with your authentication app',
    'settings.currentPassword': 'Current Password',
    'settings.newPassword': 'New Password',
    'settings.confirmPassword': 'Confirm New Password',
    'settings.activate2FA': 'Activate 2FA',
    'settings.changePasswordTitle': 'Change Password',
    'settings.privacy.public': 'Public',
    'settings.privacy.verifiedCompanies': 'Verified companies only',
    'settings.privacy.private': 'Private',

    // PRODUCT DETAIL
    'product.title': 'Product Detail',
    'product.backToCatalog': 'Back to catalog',
    'product.share': 'Share',
    'product.whatsapp': 'WhatsApp',
    'product.facebook': 'Facebook',
    'product.copyLink': 'Copy link',
    'product.stock': 'Stock',
    'product.new': 'New',
    'product.premiumBadge': 'Premium B2B',
    'product.rating': 'Rating',
    'product.reviews': 'reviews',
    'product.review': 'review',
    'product.priceSpecial': 'Special B2B price • VAT not included',
    'product.shipping': 'Express Shipping',
    'product.shippingTime': '24-48h national',
    'product.warranty': '12-month Warranty',
    'product.warrantyDesc': 'B2B no costs',
    'product.payment': 'Secure Payment',
    'product.paymentDesc': 'SSL 256-bit',
    'product.quality': 'Premium Quality',
    'product.qualityDesc': 'Certified',
    'product.addToCart': 'Add to cart',
    'product.addedToCart': 'Added to cart!',
    'product.outOfStock': 'Out of stock',
    'product.description': 'Description',
    'product.specifications': 'Specifications',
    'product.customerPhotos': 'Customer photos',
    'product.photo': 'photo',
    'product.photos': 'photos',
    'product.verified': 'Verified',
    'product.useful': 'Useful',
    'product.leaveReview': 'Leave your opinion',
    'product.yourExperience': 'Your experience',
    'product.minChars': 'Minimum 10 characters',
    'product.photosOptional': 'Photos (optional)',
    'product.totalSize': 'Total size',
    'product.maximum': 'Maximum',
    'product.uploadPhotos': 'Upload photos',
    'product.photoCount': '/4 • Max 3MB per image • 10MB total',
    'product.tip': '💡 Tip: Images are automatically compressed for faster upload. Avoid images larger than 3MB for better performance.',
    'product.terms': 'By posting, you agree that your name will be publicly visible',
    'product.signInToReview': 'Sign in to leave a review',
    'product.signIn': 'Sign in',
    'product.noReviews': 'No reviews yet',
    'product.beFirst': 'Be the first to share your experience!',
    'product.loading': 'Loading product...',
    'product.productNotFound': 'Product not found',
    'product.notFoundDesc': 'The product you are looking for does not exist or has been removed.',
    'product.gallery': 'Gallery',
    'product.of': 'of',
    'product.previous': 'Previous',
    'product.next': 'Next',
    'product.close': 'Close',
    'product.publishReview': 'Publish review',
    'product.processing': 'Processing...',
    'product.uploading': 'Uploading',
    'product.progress': 'Progress',
    'product.reviewPublished': 'Review published successfully!',
    'product.reviewError': 'Error sending review. Please try again.',
    'product.continueWithoutImages': 'Do you want to continue without images?',
    'product.noImagesUploaded': 'Could not upload any images',
    'product.imagesFailed': 'images failed to upload',
    'product.imagesUploaded': 'images uploaded successfully',

    // Ratings
    'product.ratings.excellent': 'Excellent!',
    'product.ratings.veryGood': 'Very good',
    'product.ratings.good': 'Good',
    'product.ratings.fair': 'Fair',
    'product.ratings.needsImprovement': 'Needs improvement',

    // Upload states
    'product.upload.preparing': 'Preparing upload...',
    'product.upload.processingImage': 'Processing image',
    'product.upload.uploadingImage': 'Uploading image',
    'product.upload.savingReview': 'Saving review to Firestore...',
    'product.upload.completed': 'Upload completed!',
    'product.upload.cancelled': 'Upload cancelled',

    // Buttons
    'product.button.cancel': 'Cancel',
    'product.button.continue': 'Continue',
    'product.button.confirm': 'Confirm',
    'product.button.delete': 'Delete',
    'product.button.retry': 'Retry',

    // Validation messages
    'product.validation.loginRequired': 'You must sign in to leave a review',
    'product.validation.loginRequiredVote': 'You must sign in',
    'product.validation.minCharacters': 'Review must have at least 10 characters',
    'product.validation.maxImages': 'Maximum 4 images per review',
    'product.validation.maxSizePerImage': 'Maximum 3MB per image',
    'product.validation.maxTotalSize': 'Total image size cannot exceed 10MB',
    'product.validation.invalidImage': 'File is not a valid image',

    // Additional auth
    'auth.passwordsNotMatch': 'Passwords do not match',
    'auth.passwordMinLength': 'Password must be at least 6 characters',
    'auth.passwordUpdated': 'Password updated successfully'
  },
  pt: {
    // Navegación principal
    'nav.catalog': 'Catálogo',
    'nav.cart': 'Carrinho',
    
    // Usuario
    'user.guest': 'Convidado',
    'user.avatar': 'Avatar do usuário',
    'user.menu': 'Menu do usuário',
    
    // Estados
    'status.unverified': 'Não verificado',
    'status.verified': 'Verificado',
    
    // Empresa
    'company.none': 'Sem empresa',
    
    // Cargo
    'position.notAssigned': 'Sem cargo atribuído',
    
    // Roles
    'role.admin': 'Administrador',
    'role.seller': 'Vendedor',
    'role.client': 'Cliente',
    'role.label': 'Função',
    
    // Menú del usuario
    'menu.profile': 'Meu Perfil',
    'menu.profileDescription': 'Ver e editar informações pessoais',
    'menu.company': 'Empresa',
    'menu.companyDescription': 'Dados da empresa',
    'menu.orders': 'Meus Pedidos',
    'menu.ordersDescription': 'Histórico e rastreamento',
    'menu.quotations': 'Cotações',
    'menu.quotationsDescription': 'Solicitações de cotação',
    'menu.billing': 'Faturação',
    'menu.billingDescription': 'Dados fiscais e faturas',
    'menu.settings': 'Configurações',
    'menu.settingsDescription': 'Preferências da conta',
    'menu.adminPanel': 'Painel de Administração',
    
    // Autenticación
    'auth.access': 'ACESSO',
    'auth.register': 'REGISTRAR',
    'auth.logout': 'Sair',
    'auth.logoutDescription': 'Sair da conta',
    
    // Notificaciones
    'notifications.title': 'Notificações',
    
    // Idioma
    'language.switchToEnglish': 'Mudar para inglês',
    'language.switchToSpanish': 'Mudar para espanhol',
    'language.switchToPortuguese': 'Mudar para português',
    
    // Traducciones generales
    catalog: "Catálogo",
    profile: "Perfil",
    company: "Empresa",
    orders: "Pedidos",
    quotes: "Cotações",
    billing: "Faturação",
    settings: "Configurações",
    search: "Buscar...",
    login: "Entrar",
    logout: "Sair",
    products: "Produtos",
    cart: "Carrinho",
    notifications: "Notificações",
    help: "Ajuda",
    home: "Início",

    // CATÁLOGO
    'catalog.title': 'Catálogo',
    'catalog.professional': 'Profissional',
    'catalog.subtitle': 'Fornecimentos especializados para infraestrutura de telecomunicações',
    'catalog.marketBadge': 'TELCOMB2B MARKET',
    'catalog.searchPlaceholder': 'Buscar produto, SKU ou marca...',
    'catalog.categories': 'CATEGORIAS',
    'catalog.productsAvailable': 'produtos disponíveis',
    'catalog.filterBy': 'Filtrar por',
    'catalog.noProductsFound': 'Nenhum produto encontrado',
    'catalog.noResultsFor': 'Nenhum resultado para',
    'catalog.in': 'em',
    'catalog.allCategories': 'todas as categorias',
    'catalog.tryAnotherCategory': 'Tente selecionar outra categoria ou expandir os critérios de busca',
    'catalog.viewAllCatalog': 'Ver todo o catálogo',
    'catalog.loadingProduct': 'Carregando produto...',
    'catalog.viewDetails': 'Ver detalhes de',
    'catalog.uncategorized': 'Sem categoria',
    
    // Lista de categorias
    'catalog.categoriesList.todos': 'Todos',
    'catalog.categoriesList.cableado_y_conectores': 'Cablagem e Conectores',
    'catalog.categoriesList.equipos_activos_de_red': 'Equipamentos de Rede Ativos',
    'catalog.categoriesList.infraestructura_pasiva': 'Infraestrutura Passiva',
    'catalog.categoriesList.herramientas_de_instalacion': 'Ferramentas de Instalação',
    'catalog.categoriesList.accesorios_para_radiofrecuencia': 'Acessórios RF',
    'catalog.categoriesList.componentes_ftth': 'Componentes FTTH',
    'catalog.categoriesList.consumibles_y_sellado': 'Consumíveis e Vedação',
    'catalog.categoriesList.seguridad_y_proteccion_electrica': 'Segurança e Proteção Elétrica',
    
    // Rodapé do catálogo
    'catalog.footer.platform': 'TelcomB2B Market • Plataforma profissional para fornecimentos de telecomunicações',
    'catalog.footer.allPricesIn': 'Todos os preços em',
    
    // Traduções gerais
    'common.clear': 'Limpar',
    'common.scrollToTop': 'Ir para o topo',
    'common.confirm': 'Confirmar',
    'common.cancel': 'Cancelar',
    'common.update': 'Atualizar',
    'common.error': 'Erro',

    // CONFIGURAÇÕES
    'settings.title': 'Configurações',
    'settings.subtitle': 'Personalize sua experiência na plataforma',
    'settings.notifications': 'Notificações',
    'settings.emailNotifications': 'Notificações por Email',
    'settings.emailDesc': 'Receba atualizações importantes por e-mail',
    'settings.appNotifications': 'Notificações no App',
    'settings.appDesc': 'Alertas dentro da plataforma',
    'settings.specialOffers': 'Ofertas Especiais',
    'settings.offersDesc': 'Receber promoções e descontos',
    'settings.security': 'Segurança',
    'settings.twoFactor': 'Autenticação de Dois Fatores',
    'settings.twoFactorDesc': 'Proteja sua conta com 2FA',
    'settings.profilePrivacy': 'Privacidade do Perfil',
    'settings.showPrices': 'Mostrar Preços',
    'settings.alwaysShow': 'Sempre mostrar',
    'settings.onlyLogin': 'Somente ao fazer login',
    'settings.appearance': 'Aparência',
    'settings.theme': 'Tema',
    'settings.dark': 'Escuro',
    'settings.light': 'Claro',
    'settings.language': 'Idioma',
    'settings.catalogView': 'Visualização do Catálogo',
    'settings.grid': 'Grade',
    'settings.list': 'Lista',
    'settings.accountActions': 'Ações da Conta',
    'settings.changePassword': 'Alterar Senha',
    'settings.exportData': 'Exportar Dados',
    'settings.downloadHistory': 'Baixar Histórico',
    'settings.restoreDefaults': 'Restaurar Padrões',
    'settings.activate': 'Ativado',
    'settings.scanQR': 'Escaneie este código QR com seu aplicativo de autenticação',
    'settings.currentPassword': 'Senha Atual',
    'settings.newPassword': 'Nova Senha',
    'settings.confirmPassword': 'Confirmar Nova Senha',
    'settings.activate2FA': 'Ativar 2FA',
    'settings.changePasswordTitle': 'Alterar Senha',
    'settings.privacy.public': 'Público',
    'settings.privacy.verifiedCompanies': 'Somente empresas verificadas',
    'settings.privacy.private': 'Privado',

    // DETALHE DO PRODUTO
    'product.title': 'Detalhe do Produto',
    'product.backToCatalog': 'Voltar ao catálogo',
    'product.share': 'Compartilhar',
    'product.whatsapp': 'WhatsApp',
    'product.facebook': 'Facebook',
    'product.copyLink': 'Copiar link',
    'product.stock': 'Estoque',
    'product.new': 'Novo',
    'product.premiumBadge': 'Premium B2B',
    'product.rating': 'Classificação',
    'product.reviews': 'avaliações',
    'product.review': 'avaliação',
    'product.priceSpecial': 'Preço especial B2B • IVA não incluído',
    'product.shipping': 'Envio Expresso',
    'product.shippingTime': '24-48h nacional',
    'product.warranty': 'Garantia 12 meses',
    'product.warrantyDesc': 'B2B sem custos',
    'product.payment': 'Pagamento Seguro',
    'product.paymentDesc': 'SSL 256-bit',
    'product.quality': 'Qualidade Premium',
    'product.qualityDesc': 'Certificado',
    'product.addToCart': 'Adicionar ao carrinho',
    'product.addedToCart': 'Adicionado ao carrinho!',
    'product.outOfStock': 'Sem estoque disponível',
    'product.description': 'Descrição',
    'product.specifications': 'Especificações',
    'product.customerPhotos': 'Fotos dos clientes',
    'product.photo': 'foto',
    'product.photos': 'fotos',
    'product.verified': 'Verificado',
    'product.useful': 'Útil',
    'product.leaveReview': 'Deixe sua opinião',
    'product.yourExperience': 'Sua experiência',
    'product.minChars': 'Mínimo 10 caracteres',
    'product.photosOptional': 'Fotos (opcional)',
    'product.totalSize': 'Tamanho total',
    'product.maximum': 'Máximo',
    'product.uploadPhotos': 'Enviar fotos',
    'product.photoCount': '/4 • Máx 3MB por imagem • 10MB total',
    'product.tip': '💡 Dica: As imagens são comprimidas automaticamente para envio mais rápido. Evite imagens maiores que 3MB para melhor desempenho.',
    'product.terms': 'Ao publicar, você concorda que seu nome será visível publicamente',
    'product.signInToReview': 'Inicie sessão para deixar uma avaliação',
    'product.signIn': 'Iniciar sessão',
    'product.noReviews': 'Ainda não há avaliações',
    'product.beFirst': 'Seja o primeiro a compartilhar sua experiência!',
    'product.loading': 'Carregando produto...',
    'product.productNotFound': 'Produto não encontrado',
    'product.notFoundDesc': 'O produto que você procura não existe ou foi removido.',
    'product.gallery': 'Galeria',
    'product.of': 'de',
    'product.previous': 'Anterior',
    'product.next': 'Próximo',
    'product.close': 'Fechar',
    'product.publishReview': 'Publicar avaliação',
    'product.processing': 'Processando...',
    'product.uploading': 'Enviando',
    'product.progress': 'Progresso',
    'product.reviewPublished': 'Avaliação publicada com sucesso!',
    'product.reviewError': 'Erro ao enviar a avaliação. Por favor, tente novamente.',
    'product.continueWithoutImages': 'Deseja continuar sem imagens?',
    'product.noImagesUploaded': 'Não foi possível enviar nenhuma imagem',
    'product.imagesFailed': 'imagens falharam ao enviar',
    'product.imagesUploaded': 'imagens enviadas com sucesso',

    // Classificações
    'product.ratings.excellent': 'Excelente!',
    'product.ratings.veryGood': 'Muito bom',
    'product.ratings.good': 'Bom',
    'product.ratings.fair': 'Regular',
    'product.ratings.needsImprovement': 'Precisa melhorar',

    // Estados de envio
    'product.upload.preparing': 'Preparando envio...',
    'product.upload.processingImage': 'Processando imagem',
    'product.upload.uploadingImage': 'Enviando imagem',
    'product.upload.savingReview': 'Salvando avaliação no Firestore...',
    'product.upload.completed': 'Envio concluído!',
    'product.upload.cancelled': 'Envio cancelado',

    // Botões
    'product.button.cancel': 'Cancelar',
    'product.button.continue': 'Continuar',
    'product.button.confirm': 'Confirmar',
    'product.button.delete': 'Eliminar',
    'product.button.retry': 'Tentar novamente',

    // Mensagens de validação
    'product.validation.loginRequired': 'Você deve iniciar sessão para deixar uma avaliação',
    'product.validation.loginRequiredVote': 'Você deve iniciar sessão',
    'product.validation.minCharacters': 'A avaliação deve ter pelo menos 10 caracteres',
    'product.validation.maxImages': 'Máximo 4 imagens por avaliação',
    'product.validation.maxSizePerImage': 'Máximo 3MB por imagem',
    'product.validation.maxTotalSize': 'O tamanho total das imagens não pode exceder 10MB',
    'product.validation.invalidImage': 'O arquivo não é uma imagem válida',

    // Autenticação adicional
    'auth.passwordsNotMatch': 'As senhas não coincidem',
    'auth.passwordMinLength': 'A senha deve ter pelo menos 6 caracteres',
    'auth.passwordUpdated': 'Senha atualizada com sucesso'
  }
} as const;

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');

  // ✅ CARGA INICIAL - SOLO UNA VEZ
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language | null;
    if (savedLang && ['es', 'en', 'pt'].includes(savedLang)) {
      setLanguageState(savedLang);
      document.documentElement.lang = savedLang;
    } else {
      // Si no hay idioma guardado, usar español por defecto
      localStorage.setItem('language', 'es');
      document.documentElement.lang = 'es';
    }
  }, []);

  // ✅ FUNCIÓN SEGURA - SIN CICLOS INFINITOS
  const setLanguage = (lang: Language) => {
    // 🟢 PREVENIR RECURSIÓN INFINITA
    if (isChangingLanguage) return;
    if (lang === language) return;
    
    isChangingLanguage = true;
    
    // Actualizar estado
    setLanguageState(lang);
    
    // Guardar en localStorage
    localStorage.setItem('language', lang);
    
    // Actualizar atributo lang del HTML
    document.documentElement.lang = lang;
    
    // 🟢 DISPARAR EVENTO SOLO UNA VEZ
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('languageChanged', { detail: lang });
      window.dispatchEvent(event);
    }
    
    // Liberar flag después de un delay
    setTimeout(() => {
      isChangingLanguage = false;
    }, 100);
  };

  // ✅ FUNCIÓN DE TRADUCCIÓN MEJORADA
  const t = (key: string): string => {
    try {
      // Intentar obtener la traducción del idioma actual
      const translation = translations[language][key as keyof typeof translations.es];
      
      // Si existe traducción, devolverla
      if (translation !== undefined) {
        return translation;
      }
      
      // Si no hay traducción en el idioma actual, intentar en español
      const fallbackTranslation = translations.es[key as keyof typeof translations.es];
      if (fallbackTranslation !== undefined) {
        return fallbackTranslation;
      }
      
      // Si no hay traducción en ningún lado, devolver la clave
      return key;
    } catch (error) {
      // En caso de error, devolver la clave
      return key;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage debe usarse dentro de LanguageProvider');
  }
  return context;
};