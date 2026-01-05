import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "success" | "danger";
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "CONFIRM",
  cancelText = "CANCEL",
  type = "info",
}) => {
  if (!isOpen) return null;

  const borderColor =
    type === "danger"
      ? "border-red-500"
      : type === "success"
      ? "border-[#22c55e]"
      : "border-zinc-700";

  const titleColor =
    type === "danger"
      ? "text-red-500"
      : type === "success"
      ? "text-[#22c55e]"
      : "text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md bg-black border ${borderColor} shadow-2xl p-1 relative transform transition-all scale-100`}
      >
        {/* Decorative corner markers */}
        <div className="absolute top-0 left-0 w-2 h-2 bg-white/20" />
        <div className="absolute top-0 right-0 w-2 h-2 bg-white/20" />
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-white/20" />
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-white/20" />

        <div className="bg-zinc-950/50 p-6 flex flex-col gap-4">
          <h3
            className={`text-lg font-black uppercase tracking-widest ${titleColor}`}
          >
            {title}
          </h3>
          <p className="text-zinc-400 text-xs font-mono leading-relaxed whitespace-pre-wrap">
            {message}
          </p>

          <div className="flex gap-4 mt-4 justify-end">
            {cancelText && (
              <button
                onClick={onCancel}
                className="px-6 py-2 text-[10px] font-black uppercase tracking-widest border border-zinc-700 text-zinc-500 hover:text-white hover:border-white transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest text-black transition-colors ${
                type === "danger"
                  ? "bg-red-500 hover:bg-red-400"
                  : "bg-[#22c55e] hover:bg-[#4ade80]"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
