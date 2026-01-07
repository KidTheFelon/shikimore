import React from 'react';

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastItemProps {
  toast: Toast;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.type === "success" && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
        </svg>
      )}
      {toast.type === "error" && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM4.5 4.5a.5.5 0 01.707 0L8 7.293l2.793-2.793a.5.5 0 11.707.707L8.707 8l2.793 2.793a.5.5 0 01-.707.707L8 8.707l-2.793 2.793a.5.5 0 01-.707-.707L7.293 8 4.5 5.207a.5.5 0 010-.707z" />
        </svg>
      )}
      <span>{toast.message}</span>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
