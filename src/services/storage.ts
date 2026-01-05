/**
 * Supabase Storage Utilities for Trade Entry Images
 * Bucket: trade-entries
 */

import { supabase } from "./supabase";

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a trade screenshot to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user's ID
 * @param tradeId - The trade's ID (optional, generates random if not provided)
 * @returns Upload result with URL or error
 */
export const uploadTradeImage = async (
  file: File,
  userId: string,
  tradeId?: string
): Promise<UploadResult> => {
  try {
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
      };
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File size exceeds 5MB limit.",
      };
    }

    // Generate file path: {userId}/{tradeId}_{timestamp}.{ext}
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `${tradeId || "temp"}_${timestamp}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("trade-entries")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      path: data.path,
      url: filePath, // Store the path in the database
    };
  } catch (error: any) {
    console.error("Upload exception:", error);
    return {
      success: false,
      error: error.message || "Unknown upload error",
    };
  }
};

/**
 * Get the public URL for a trade image
 * @param path - The storage path of the image
 * @returns Public URL or null if error
 */
export const getTradeImageUrl = (path: string | null): string | null => {
  if (!path) return null;

  const { data } = supabase.storage.from("trade-entries").getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Get a signed URL for private images (expires in 1 hour)
 * @param path - The storage path of the image
 * @returns Signed URL or null if error
 */
export const getSignedImageUrl = async (
  path: string | null
): Promise<string | null> => {
  if (!path) return null;

  try {
    const { data, error } = await supabase.storage
      .from("trade-entries")
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Signed URL exception:", error);
    return null;
  }
};

/**
 * Delete a trade image from storage
 * @param path - The storage path of the image
 * @returns Success status
 */
export const deleteTradeImage = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from("trade-entries")
      .remove([path]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Delete exception:", error);
    return false;
  }
};

/**
 * Update trade image (deletes old, uploads new)
 * @param oldPath - Path to old image (will be deleted)
 * @param newFile - New image file to upload
 * @param userId - User's ID
 * @param tradeId - Trade's ID
 * @returns Upload result
 */
export const updateTradeImage = async (
  oldPath: string | null,
  newFile: File,
  userId: string,
  tradeId: string
): Promise<UploadResult> => {
  // Delete old image if exists
  if (oldPath) {
    await deleteTradeImage(oldPath);
  }

  // Upload new image
  return uploadTradeImage(newFile, userId, tradeId);
};

/**
 * Compress image before upload (optional utility)
 * @param file - Original file
 * @param maxWidth - Maximum width
 * @param quality - JPEG quality (0-1)
 * @returns Compressed file
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Compression failed"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
    };
    reader.onerror = () => reject(new Error("File read failed"));
  });
};
