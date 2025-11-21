/**
 * Shared button component.
 */

'use client';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

/**
 * Button component.
 * TODO: Implement reusable button with variants
 */
export function Button({ children, onClick, variant = 'primary', disabled }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`button button-${variant}`}
    >
      {children}
    </button>
  );
}
