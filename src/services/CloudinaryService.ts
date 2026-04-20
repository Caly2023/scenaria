export const cloudinaryService = {
  async uploadImage(base64Image: string) {
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload image to Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
  },
};
