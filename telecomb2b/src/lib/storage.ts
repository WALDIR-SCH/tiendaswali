// Función para subir imágenes a Cloudinary
export const subirImagenCloudinary = async (file: File) => {
  // Creamos el formulario de envío
  const formData = new FormData();
  formData.append("file", file);
  // Usamos el preset que configuramos en el .env
  formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default");

  try {
    // Enviamos la imagen a la API de Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Error al subir la imagen a Cloudinary");
    }

    const data = await response.json();
    // Devolvemos la URL segura que nos da Cloudinary
    return data.secure_url; 
  } catch (error) {
    console.error("Error en storage.ts:", error);
    throw error;
  }
};