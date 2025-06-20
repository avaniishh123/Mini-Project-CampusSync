import React, { useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outlined' | 'text' | 'tonal' | 'elevated';
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
}

const Button = ({ 
  variant = 'primary', 
  children, 
  className = '', 
  icon,
  iconPosition = 'left',
  size = 'medium',
  fullWidth = false,
  loading = false,
  onClick, 
  ...props 
}: ButtonProps) => {
  const [rippleEffect, setRippleEffect] = useState({ x: 0, y: 0, show: false });

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-main text-primary-contrast hover:shadow-elevation-2 active:bg-primary-dark';
      case 'secondary':
        return 'bg-secondary-main text-secondary-contrast hover:shadow-elevation-2 active:bg-secondary-dark';
      case 'tertiary':
        return 'bg-tertiary-main text-tertiary-contrast hover:shadow-elevation-2 active:bg-tertiary-dark';
      case 'outlined':
        return 'border border-outline text-primary-main hover:bg-primary-main/8 active:bg-primary-main/12';
      case 'tonal':
        return 'bg-secondary-container text-secondary-main hover:shadow-elevation-1 active:bg-secondary-container/80';
      case 'elevated':
        return 'bg-surface-container text-primary-main shadow-elevation-1 hover:shadow-elevation-2 active:shadow-elevation-1';
      case 'text':
        return 'text-primary-main hover:bg-primary-main/8 active:bg-primary-main/12';
      default:
        return 'bg-primary-main text-primary-contrast hover:shadow-elevation-2 active:bg-primary-dark';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setRippleEffect({ x, y, show: true });
    setTimeout(() => setRippleEffect(prev => ({ ...prev, show: false })), 600);

    if (onClick) onClick(e);
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return 'px-4 py-1.5 text-sm';
      case 'large':
        return 'px-8 py-3 text-lg';
      case 'medium':
      default:
        return 'px-6 py-2';
    }
  };

  const variants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.02,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    },
    tap: { 
      scale: 0.98,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    }
  };

  return (
    <motion.button
      className={`
        relative
        overflow-hidden
        ${getSizeStyle()}
        rounded-full
        font-medium
        transition-material
        flex items-center justify-center gap-2
        ${fullWidth ? 'w-full' : ''}
        disabled:opacity-40
        disabled:cursor-not-allowed
        ${variant === 'outlined' ? 'border-2' : ''}
        ${getButtonStyle()}
        ${className}
      `}
      variants={variants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      onClick={handleClick}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        iconPosition === 'left' && icon && <span>{icon}</span>
      )}
      {children}
      {!loading && iconPosition === 'right' && icon && <span>{icon}</span>}
      {rippleEffect.show && (
        <span
          className="absolute rounded-full bg-white/30 animate-ripple"
          style={{
            top: rippleEffect.y,
            left: rippleEffect.x,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </motion.button>
  );
};

export default Button;
