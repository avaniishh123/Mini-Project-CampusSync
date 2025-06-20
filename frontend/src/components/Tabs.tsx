import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  layout?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large';
  scrollable?: boolean;
}

const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className = '',
  variant = 'primary',
  layout = 'horizontal',
  size = 'medium',
  scrollable = false
}) => {
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-1 text-xs';
      case 'large':
        return 'px-8 py-3 text-base';
      case 'medium':
      default:
        return 'px-6 py-2 text-sm';
    }
  };

  const getTabStyle = (isActive: boolean) => {
    // Base style with size
    const baseStyle = `${getSizeStyle()} font-medium duration-300 ease-material flex items-center gap-2 relative`;
    
    // Layout specific styles
    const layoutStyle = layout === 'horizontal' 
      ? 'border-b-2 border-transparent' 
      : 'border-l-2 border-transparent';
    
    // Active state styles
    if (isActive) {
      switch (variant) {
        case 'secondary':
          return `${baseStyle} ${layoutStyle} text-secondary-main border-secondary-main`;
        case 'tertiary':
          return `${baseStyle} ${layoutStyle} text-tertiary-main border-tertiary-main`;
        default:
          return `${baseStyle} ${layoutStyle} text-primary-main border-primary-main`;
      }
    }
    
    // Inactive state
    return `${baseStyle} ${layoutStyle} text-outline hover:text-primary-main hover:bg-surface-variant/30`;
  };

  const tabVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    hover: { 
      scale: 1.05,
      transition: { 
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    },
    tap: { 
      scale: 0.95,
      transition: { 
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    }
  };

  return (
    <div 
      className={`
        ${layout === 'horizontal' ? 'flex' : 'flex flex-col'} 
        ${scrollable ? 'overflow-x-auto' : ''}
        ${layout === 'horizontal' ? 'space-x-2' : 'space-y-2'} 
        p-1 
        ${className}
      `}
    >
      <AnimatePresence mode="wait">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={getTabStyle(activeTab === tab.id)}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            whileHover="hover"
            whileTap="tap"
          >
            {tab.icon && <span className="w-5 h-5">{tab.icon}</span>}
            <span>{tab.label}</span>
            
            {/* Badge indicator */}
            {tab.badge && (
              <span className={`
                inline-flex items-center justify-center
                ${typeof tab.badge === 'number' && tab.badge > 99 ? 'px-1.5' : 'px-1'} 
                h-5 
                text-xs 
                font-medium 
                rounded-full 
                ${activeTab === tab.id ? 'bg-surface-main' : 'bg-primary-container'} 
                ${activeTab === tab.id ? 'text-primary-main' : 'text-primary-main'}
              `}>
                {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
            
            {/* Active indicator line */}
            {activeTab === tab.id && (
              <motion.div
                className={`absolute ${layout === 'horizontal' ? 'bottom-0 left-0 right-0 h-2' : 'left-0 top-0 bottom-0 w-2'} bg-current rounded-full`}
                layoutId="activeTab"
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30
                }}
              />
            )}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Tabs;
