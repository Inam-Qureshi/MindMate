// components/Accessibility.jsx
import React from 'react';

/**
 * Accessibility utilities and components for better UX
 */

// Skip link for keyboard navigation
export const SkipLink = ({ href, children, className = "" }) => (
  <a
    href={href}
    className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
  >
    {children}
  </a>
);

// Accessible button component
export const AccessibleButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  ariaLabel,
  ariaDescribedBy,
  className = "",
  ...props
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    aria-disabled={disabled || loading}
    className={`focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
);

// Screen reader only text
export const ScreenReaderText = ({ children, className = "" }) => (
  <span className={`sr-only ${className}`}>
    {children}
  </span>
);

// Focus trap for modals
export const FocusTrap = ({ children, autoFocus = true }) => {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!autoFocus) return;

    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements?.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        const firstElement = focusableElements?.[0];
        const lastElement = focusableElements?.[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [autoFocus]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
};

// Accessible form field
export const AccessibleField = ({
  label,
  children,
  error,
  helpText,
  required = false,
  fieldId,
  className = ""
}) => {
  const helpId = helpText ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      {React.cloneElement(children, {
        id: fieldId,
        'aria-required': required,
        'aria-invalid': !!error,
        'aria-describedby': [helpId, errorId].filter(Boolean).join(' ') || undefined
      })}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {helpText && !error && (
        <p id={helpId} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

// Accessible dropdown/menu
export const AccessibleDropdown = ({
  trigger,
  children,
  isOpen,
  onToggle,
  onClose,
  ariaLabel,
  className = ""
}) => {
  const menuId = React.useId();
  const triggerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {trigger}
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
        >
          <div className="py-1">
            {React.Children.map(children, (child, index) =>
              React.cloneElement(child, {
                role: 'menuitem',
                tabIndex: index === 0 ? 0 : -1,
                onKeyDown: (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    child.props.onClick?.(e);
                    onClose();
                  }
                }
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Accessible tabs
export const AccessibleTabs = ({
  tabs,
  activeTab,
  onTabChange,
  className = ""
}) => {
  const tabListId = React.useId();

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Tabs"
        id={tabListId}
        className="flex space-x-1 border-b border-gray-200"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          className="mt-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};

// Accessible accordion
export const AccessibleAccordion = ({
  items,
  allowMultiple = false,
  defaultExpanded = [],
  className = ""
}) => {
  const [expandedItems, setExpandedItems] = React.useState(defaultExpanded);

  const toggleItem = (itemId) => {
    if (allowMultiple) {
      setExpandedItems(prev =>
        prev.includes(itemId)
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      );
    } else {
      setExpandedItems(prev =>
        prev.includes(itemId) ? [] : [itemId]
      );
    }
  };

  return (
    <div className={className}>
      {items.map((item, index) => {
        const isExpanded = expandedItems.includes(item.id);
        const itemId = `accordion-item-${item.id}`;
        const contentId = `accordion-content-${item.id}`;

        return (
          <div key={item.id} className="border-b border-gray-200">
            <button
              id={itemId}
              aria-expanded={isExpanded}
              aria-controls={contentId}
              onClick={() => toggleItem(item.id)}
              className="flex justify-between items-center w-full px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            >
              <span className="font-medium">{item.title}</span>
              <span className="ml-2" aria-hidden="true">
                {isExpanded ? '−' : '+'}
              </span>
            </button>
            <div
              id={contentId}
              role="region"
              aria-labelledby={itemId}
              hidden={!isExpanded}
              className="px-4 pb-3"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Live region for dynamic content announcements
export const LiveRegion = ({
  children,
  priority = "polite", // polite or assertive
  className = ""
}) => (
  <div
    aria-live={priority}
    aria-atomic="true"
    className={`sr-only ${className}`}
  >
    {children}
  </div>
);

// Accessible loading indicator
export const AccessibleLoader = ({
  message = "Loading...",
  size = "md",
  className = ""
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}
        role="status"
        aria-label={message}
      />
      <span className="sr-only">{message}</span>
      <span className="text-sm text-gray-600" aria-hidden="true">
        {message}
      </span>
    </div>
  );
};

// High contrast mode detector
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

// Reduced motion preference
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};
