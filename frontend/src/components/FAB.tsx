import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FABProps {
  icon: React.ReactNode;
  onClick?: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color?: 'primary' | 'secondary' | 'tertiary' | 'surface';
  size?: 'small' | 'medium' | 'large';
  variant?: 'regular' | 'extended';
}

const FAB: React.FC<FABProps> = ({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  color = 'primary',
  size = 'medium',
  variant = 'regular',
}) => {
  const positionClasses = {
    'bottom-right': 'right-6 bottom-6',
    'bottom-left': 'left-6 bottom-6',
    'top-right': 'right-6 top-6',
    'top-left': 'left-6 top-6',
  };

  const colorClasses = {
    primary: 'bg-primary-container text-primary-main hover:bg-primary-container/90 active:bg-primary-container/80',
    secondary: 'bg-secondary-container text-secondary-main hover:bg-secondary-container/90 active:bg-secondary-container/80',
    tertiary: 'bg-tertiary-container text-tertiary-main hover:bg-tertiary-container/90 active:bg-tertiary-container/80',
    surface: 'bg-surface-container text-primary-main hover:bg-surface-container-high active:bg-surface-container-low',
  };
  
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-14 h-14',
    large: 'w-24 h-24',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <motion.button
        className={`
          ${colorClasses[color]} 
          ${sizeClasses[size]} 
          ${variant === 'extended' ? 'px-6' : ''} 
          group flex items-center justify-center rounded-full shadow-elevation-3 transition-material
        `}
        onClick={onClick}
        whileHover={{ scale: 1.05, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="sr-only">{label}</span>
        <div className="flex items-center justify-center">
          {icon}
          {variant === 'extended' && label && (
            <span className="ml-2 font-medium">{label}</span>
          )}
        </div>
        
        {/* Tooltip - only show for regular FAB */}
        {label && variant === 'regular' && (
          <AnimatePresence>
            <motion.div
              className="absolute bottom-full mb-2 px-3 py-1.5 bg-surface-container-high text-on-surface text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 shadow-elevation-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {label}
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-surface-container-high" />
            </motion.div>
          </AnimatePresence>
        )}
      </motion.button>
    </div>
  );
};

export default FAB;
