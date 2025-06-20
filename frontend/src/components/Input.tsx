import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  variant?: 'filled' | 'outlined';
  helperText?: string;
  fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  startIcon,
  endIcon,
  variant = 'filled',
  helperText,
  fullWidth = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getInputStyles = () => {
    const baseStyles = 'w-full text-sm transition-material focus:outline-none';
    const filledStyles = 'bg-surface-variant/50 border-b-2 rounded-t-md px-3 py-3 focus:bg-surface-variant/70';
    const outlinedStyles = 'bg-transparent border-2 rounded-md px-3 py-2.5';
    
    if (variant === 'filled') {
      return `${baseStyles} ${filledStyles} ${
        error 
          ? 'border-error-main focus:border-error-main' 
          : 'border-outline focus:border-primary-main'
      }`;
    } else {
      return `${baseStyles} ${outlinedStyles} ${
        error 
          ? 'border-error-main focus:border-error-main' 
          : 'border-outline focus:border-primary-main'
      }`;
    }
  };

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'max-w-md'}`}>
      <div className="relative">
        {label && (
          <motion.label
            className={`absolute left-3 pointer-events-none text-sm font-medium ${
              error ? 'text-error-main' : isFocused ? 'text-primary-main' : 'text-outline'
            }`}
            initial={false}
            animate={{
              y: isFocused || props.value ? '-24px' : '8px',
              scale: isFocused || props.value ? 0.85 : 1,
              x: isFocused || props.value ? '-8px' : '0px',
            }}
            transition={{ duration: 0.15 }}
          >
            {label}
          </motion.label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
              {startIcon}
            </div>
          )}
          <input
            {...props}
            className={`${getInputStyles()} ${startIcon ? 'pl-10' : ''} ${endIcon ? 'pr-10' : ''} ${className}`}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
          />
          {endIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-outline">
              {endIcon}
            </div>
          )}
        </div>
      </div>
      
      {/* Helper text or error message */}
      <div className="min-h-[20px] mt-1">
        {error ? (
          <motion.p
            className="text-xs text-error-main pl-3 flex items-center gap-1"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 11c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1 4h-2v-2h2v2z"/>
            </svg>
            {error}
          </motion.p>
        ) : helperText ? (
          <motion.p 
            className="text-xs text-outline pl-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
          >
            {helperText}
          </motion.p>
        ) : null}
      </div>
    </div>
  );
};

export default Input;
