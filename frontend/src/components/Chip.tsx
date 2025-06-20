import React from 'react';
import { motion } from 'framer-motion';

interface ChipProps {
  label: string;
  onDelete?: () => void;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'tertiary' | 'default';
  variant?: 'filled' | 'outlined' | 'elevated' | 'assist';
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const Chip: React.FC<ChipProps> = ({
  label,
  onDelete,
  icon,
  color = 'default',
  variant = 'filled',
  selected = false,
  onClick,
  disabled = false,
}) => {
  const getChipStyle = () => {
    // Base styles based on variant
    let baseStyle = '';
    switch (variant) {
      case 'filled':
        baseStyle = selected ? 'shadow-elevation-1' : '';
        break;
      case 'outlined':
        baseStyle = 'border border-outline';
        break;
      case 'elevated':
        baseStyle = 'shadow-elevation-1 bg-surface-container';
        break;
      case 'assist':
        baseStyle = 'bg-surface-container-low';
        break;
      default:
        baseStyle = '';
    }

    // Color styles
    let colorStyle = '';
    if (selected) {
      switch (color) {
        case 'primary':
          return `${baseStyle} bg-primary-container text-primary-main`;
        case 'secondary':
          return `${baseStyle} bg-secondary-container text-secondary-main`;
        case 'tertiary':
          return `${baseStyle} bg-tertiary-container text-tertiary-main`;
        default:
          return `${baseStyle} bg-surface-container-high text-outline`;
      }
    }
    
    switch (color) {
      case 'primary':
        colorStyle = variant === 'outlined' 
          ? 'text-primary-main' 
          : 'bg-primary-container/50 text-primary-main';
        break;
      case 'secondary':
        colorStyle = variant === 'outlined' 
          ? 'text-secondary-main' 
          : 'bg-secondary-container/50 text-secondary-main';
        break;
      case 'tertiary':
        colorStyle = variant === 'outlined' 
          ? 'text-tertiary-main' 
          : 'bg-tertiary-container/50 text-tertiary-main';
        break;
      default:
        colorStyle = variant === 'outlined' 
          ? 'text-outline' 
          : 'bg-surface-variant text-outline';
    }

    return `${baseStyle} ${colorStyle} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`;
  };

  return (
    <motion.div
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-material ${getChipStyle()}`}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={disabled ? undefined : onClick}
      initial={false}
      animate={selected ? { scale: 1.05 } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {icon && (
        <span className="mr-2 h-4 w-4">
          {icon}
        </span>
      )}
      {label}
      {onDelete && !disabled && (
        <motion.button
          className="ml-2 p-0.5 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Remove"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </motion.button>
      )}
    </motion.div>
  );
};

export default Chip;
