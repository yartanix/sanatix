"use client";

import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

const variantMap = {
  danger:  "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-amber-500 hover:bg-amber-600 text-white",
  default: "bg-[#1B4D4D] hover:bg-[#1B4D4D]/90 text-white",
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-50 shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="text-sm text-[#2C2C2C]/70 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 text-sm font-medium text-[#2C2C2C]/70 hover:bg-[#F0EDE4] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${variantMap[variant]}`}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
