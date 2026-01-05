import React, { useState, useRef } from "react";
import {
  uploadTradeImage,
  deleteTradeImage,
  compressImage,
} from "../services/storage";

interface ImageUploadProps {
  userId: string;
  tradeId?: string;
  currentImagePath?: string | null;
  onImageUploaded: (path: string) => void;
  onImageRemoved: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  userId,
  tradeId,
  currentImagePath,
  onImageUploaded,
  onImageRemoved,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    currentImagePath || null
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, 1200, 0.85);

      // Upload to Supabase
      const result = await uploadTradeImage(compressedFile, userId, tradeId);

      if (result.success && result.url) {
        setPreview(result.url);
        onImageUploaded(result.url);
      } else {
        setError(result.error || "Upload failed");
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!preview) return;

    const confirm = window.confirm("Remove this screenshot?");
    if (!confirm) return;

    setUploading(true);
    const success = await deleteTradeImage(preview);

    if (success) {
      setPreview(null);
      onImageRemoved();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      setError("Failed to remove image");
    }
    setUploading(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button or preview */}
      {!preview ? (
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={uploading}
          className="w-full border border-white bg-black text-white py-8 px-4 hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Uploading...
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-2xl">📸</div>
              <div className="text-[10px] font-black uppercase tracking-widest">
                Upload Screenshot
              </div>
              <div className="text-[8px] text-zinc-500 uppercase">
                JPEG, PNG, or WebP • Max 5MB
              </div>
            </div>
          )}
        </button>
      ) : (
        <div className="relative border border-white bg-black">
          {/* Image preview */}
          <img src={preview} alt="Trade screenshot" className="w-full h-auto" />

          {/* Action buttons overlay */}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={uploading}
              className="bg-black border border-white text-white px-3 py-1.5 text-[9px] font-black uppercase hover:bg-white hover:text-black transition-colors disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="bg-red-900 border border-red-600 text-red-200 px-3 py-1.5 text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="border border-red-600 bg-red-900/20 text-red-400 px-4 py-3 text-[10px] font-black uppercase">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
