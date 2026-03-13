// // Utilidad para manejar imágenes faltantes
// export const getPlaceholderImage = (type: 'product' | 'avatar' | 'company' = 'product') => {
//   const placeholders = {
//     product: '/placeholder-product.png',
//     avatar: '/default-avatar.png',
//     company: '/placeholder-company.png'
//   };
  
//   return placeholders[type];
// };

// // Función para manejar errores de carga de imágenes
// export const handleImageError = (
//   e: React.SyntheticEvent<HTMLImageElement, Event>,
//   type: 'product' | 'avatar' | 'company' = 'product'
// ) => {
//   const target = e.target as HTMLImageElement;
//   target.src = getPlaceholderImage(type);
//   target.onerror = null; // Prevenir loops infinitos
// };