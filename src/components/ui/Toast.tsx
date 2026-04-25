import { useEffect } from "react";
import type { Toast as ToastType } from "../../types";
import styles from "./Toast.module.css";

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

export default function Toast({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const getToastClass = () => {
    switch (toast.type) {
      case "success":
        return styles.toastSuccess;
      case "error":
        return styles.toastError;
      case "info":
        return styles.toastInfo;
      default:
        return styles.toastInfo;
    }
  };

  return (
    <div className={`${styles.toast} ${getToastClass()}`}>
      <span className={styles.toastMessage}>{toast.message}</span>
      <button
        className={styles.toastClose}
        onClick={() => onRemove(toast.id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
