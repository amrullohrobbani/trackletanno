'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  const value = {
    open,
    onOpenChange: onOpenChange || (() => {}),
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export function DialogTrigger({ children }: DialogTriggerProps) {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('DialogTrigger must be used within a Dialog');
  }

  const handleClick = () => {
    context.onOpenChange(true);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {children}
    </div>
  );
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onInteractOutside?: () => void;
}

export function DialogContent({ 
  className = '', 
  children, 
  onEscapeKeyDown,
  onInteractOutside 
}: DialogContentProps) {
  const context = useContext(DialogContext);
  const contentRef = useRef<HTMLDivElement>(null);
  
  if (!context) {
    throw new Error('DialogContent must be used within a Dialog');
  }

  const { open, onOpenChange } = context;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onEscapeKeyDown) {
          onEscapeKeyDown(event);
        } else {
          onOpenChange(false);
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        if (onInteractOutside) {
          onInteractOutside();
        } else {
          onOpenChange(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    // Focus trap
    const focusableElements = contentRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
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

    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [open, onOpenChange, onEscapeKeyDown, onInteractOutside]);

  if (!open) return null;

  const dialogContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm dialog-backdrop" />
      
      {/* Content */}
      <div
        ref={contentRef}
        className={`relative bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-lg w-auto min-w-80 mx-4 max-h-[90vh] overflow-y-auto text-white dialog-content ${className}`}
        style={{
          /* Ensure proper rendering on Windows/Linux */
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogHeader({ className = '', children }: DialogHeaderProps) {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
      {children}
    </div>
  );
}

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogTitle({ className = '', children }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight text-white ${className}`}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogDescription({ className = '', children }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-300 ${className}`}>
      {children}
    </p>
  );
}

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogFooter({ className = '', children }: DialogFooterProps) {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 ${className}`}>
      {children}
    </div>
  );
}
