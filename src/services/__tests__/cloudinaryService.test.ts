import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cloudinaryService } from '../cloudinaryService';

describe('cloudinaryService', () => {
  beforeEach(() => {
    // Setup environment variables
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'test_cloud';
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = 'test_preset';
    vi.resetAllMocks();
  });

  describe('uploadImage', () => {
    it('should upload an image successfully', async () => {
      const mockResponse = {
        secure_url: 'https://res.cloudinary.com/test_cloud/image/upload/v1/test_image.png',
        public_id: 'test_image',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await cloudinaryService.uploadImage('base64data', 'test_folder');
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.cloudinary.com/v1_1/test_cloud/image/upload',
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if configuration is missing', async () => {
      delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      
      await expect(cloudinaryService.uploadImage('base64data'))
        .rejects
        .toThrow('Cloudinary configuration is missing');
    });

    it('should throw an error if upload fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'Invalid file format' } }),
      });

      await expect(cloudinaryService.uploadImage('base64data'))
        .rejects
        .toThrow('Cloudinary upload failed: Invalid file format');
    });
  });

  describe('getOptimizedUrl', () => {
    it('should generate an optimized url', () => {
      const url = cloudinaryService.getOptimizedUrl('test_public_id', 400, 300);
      expect(url).toBe('https://res.cloudinary.com/test_cloud/image/upload/q_auto,f_auto,w_400,h_300/test_public_id');
    });

    it('should generate an optimized url without dimensions', () => {
      const url = cloudinaryService.getOptimizedUrl('test_public_id');
      expect(url).toBe('https://res.cloudinary.com/test_cloud/image/upload/q_auto,f_auto/test_public_id');
    });
  });

  describe('deleteImage', () => {
    it('should throw an error about needing a backend', async () => {
      await expect(cloudinaryService.deleteImage('test_id'))
        .rejects
        .toThrow('Deleting images directly from the frontend is not supported without a backend endpoint and an API Secret.');
    });
  });
});
