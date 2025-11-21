/**
 * Modal component.
 */

'use client';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Modal component for dialogs.
 * TODO: Implement modal with overlay and close functionality
 */
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        <button className="modal-close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}
