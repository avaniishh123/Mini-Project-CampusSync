import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  elevation?: 1 | 2 | 3 | 4 | 5;
  variant?: 'filled' | 'outlined' | 'elevated' | 'tonal';
  interactive?: boolean;
  noHover?: boolean; // New prop to disable hover animation
}

const Card = ({ 
  children, 
  className = '', 
  elevation = 1, 
  variant = 'elevated',
  interactive = true,
  noHover = false, // Default to false to maintain backward compatibility
  onClick, 
  ...props 
}: CardProps) => {
  // Only apply hover effect if interactive AND noHover is false
  const shouldApplyHoverEffect = interactive && !noHover;
  
  const variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    hover: shouldApplyHoverEffect ? { 
      scale: 1.01, // Reduced scale for subtler effect
      y: -2, // Reduced lift for subtler effect
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    } : {},
    tap: shouldApplyHoverEffect ? { 
      scale: 0.99, // Reduced scale for subtler effect
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    } : {}
  };

  const getCardStyle = () => {
    switch (variant) {
      case 'filled':
        return 'bg-surface-variant dark:bg-surface-dark';
      case 'outlined':
        return 'border border-outline dark:border-outline bg-surface-main dark:bg-surface-dark';
      case 'tonal':
        return 'bg-secondary-container dark:bg-secondary-dark text-secondary-main dark:text-secondary-light';
      default:
        return `bg-surface-container dark:bg-surface-dark shadow-elevation-${elevation}`;
    }
  };

  return (
    <motion.div
      className={`
        ${getCardStyle()}
        rounded-xl
        p-4
        transition-material
        ${interactive ? 'cursor-pointer' : ''}
        ${className}
      `}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      variants={variants}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
