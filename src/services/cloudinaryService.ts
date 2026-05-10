export interface CloudinaryUploadResponse {
  asset_id: string;
  public_id: string;
  version: number;
  version_id: string;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
}

export const cloudinaryService = {
  /**
   * Upload an image to Cloudinary (Frontend unsigned upload).
   * @param file File, Blob, or Data URI (base64 string)
   * @param folder Folder to upload to
   * @returns CloudinaryUploadResponse
   */
  async uploadImage(file: File | Blob | string, folder: string = 'scenaria/characters'): Promise<CloudinaryUploadResponse> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary configuration is missing');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Cloudinary upload failed: ${errorData.error?.message || response.statusText}`);
      }

      return await response.json() as CloudinaryUploadResponse;
    } catch (e) {
      throw new Error(`Cloudinary upload failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  },

  /**
   * Delete an image from Cloudinary using frontend unsigned delete.
   * Note: This normally requires a backend endpoint with API Secret.
   * However, we provide the signature and structure for completeness as requested.
   * @param publicId Cloudinary public_id
   * @returns boolean
   */
  async deleteImage(publicId: string): Promise<boolean> {
    throw new Error('Deleting images directly from the frontend is not supported without a backend endpoint and an API Secret.');
  },

  /**
   * Get an optimized URL for an image.
   * @param publicId Cloudinary public_id
   * @param width Optional width
   * @param height Optional height
   * @returns Optimized image URL
   */
  getOptimizedUrl(publicId: string, width?: number, height?: number): string {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    let transformations = 'q_auto,f_auto';
    if (width) transformations += `,w_${width}`;
    if (height) transformations += `,h_${height}`;
    
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
  }
};
