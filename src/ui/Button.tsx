import type { ButtonHTMLAttributes } from 'react';
export function Button({ variant = 'default', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' }) {
  return <button type="button" className={`sm-button sm-button--${variant} ${className}`} {...props}/>;
}
