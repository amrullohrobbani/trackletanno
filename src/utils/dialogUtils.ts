/**
 * Enhanced dialog utilities using custom modal dialogs
 */

import React from 'react';

// Global dialog state management
interface DialogState {
  type: 'alert' | 'confirm' | null;
  title: string;
  description: string;
  variant: 'default' | 'destructive';
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Global references to the dialog state setters
let setGlobalDialogState: React.Dispatch<React.SetStateAction<DialogState>> | null = null;
let setGlobalDialogOpen: React.Dispatch<React.SetStateAction<boolean>> | null = null;

// Global dialog manager functions
export const setDialogStateSetter = (
  stateSetter: React.Dispatch<React.SetStateAction<DialogState>>,
  openSetter: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setGlobalDialogState = stateSetter;
  setGlobalDialogOpen = openSetter;
};

export const clearDialogStateSetter = () => {
  setGlobalDialogState = null;
  setGlobalDialogOpen = null;
};

/**
 * Restores focus to the previously active element or document body
 * This helps fix input field focus issues after dialogs are closed
 */
const restoreFocus = () => {
  // Use setTimeout to ensure the dialog is fully closed before restoring focus
  setTimeout(() => {
    // First, try to blur any currently focused element to reset focus state
    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur();
    }
    
    // Force focus on document body to reset focus state
    document.body.focus();
    
    // Then try to focus on the first available input field if there's one visible
    setTimeout(() => {
      const inputs = document.querySelectorAll('input:not([disabled]):not([type="hidden"]):not([readonly]), textarea:not([disabled]):not([readonly])');
      const visibleInput = Array.from(inputs).find((input) => {
        const element = input as HTMLElement;
        const rect = element.getBoundingClientRect();
        return element.offsetParent !== null && // Element is visible
               element.style.display !== 'none' &&
               element.style.visibility !== 'hidden' &&
               rect.width > 0 && rect.height > 0; // Has actual dimensions
      }) as HTMLElement;
      
      if (visibleInput) {
        // For number inputs, we need special handling
        if (visibleInput.getAttribute('type') === 'number') {
          visibleInput.focus();
          // Additional blur/focus cycle for number inputs
          setTimeout(() => {
            visibleInput.blur();
            setTimeout(() => {
              visibleInput.focus();
            }, 10);
          }, 50);
        } else {
          visibleInput.focus();
        }
      }
    }, 100);
  }, 150);
};

/**
 * Enhanced alert function using custom modal dialog
 */
export const showAlert = (message: string, options?: {
  title?: string;
  variant?: 'default' | 'destructive';
  confirmText?: string;
}): Promise<void> => {
  const { title = 'Alert', variant = 'default', confirmText = 'OK' } = options || {};
  
  return new Promise((resolve) => {
    if (setGlobalDialogState && setGlobalDialogOpen) {
      setGlobalDialogState({
        type: 'alert',
        title,
        description: message,
        variant,
        confirmText,
        cancelText: 'Cancel',
        onConfirm: () => {
          restoreFocus();
          resolve();
        },
        onCancel: () => {
          restoreFocus();
          resolve();
        },
      });
      setGlobalDialogOpen(true);
    } else {
      // Fallback to browser alert if dialog system not available
      alert(message);
      restoreFocus();
      resolve();
    }
  });
};

/**
 * Enhanced confirm function using custom modal dialog
 */
export const showConfirm = (message: string, options?: {
  title?: string;
  variant?: 'default' | 'destructive';
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> => {
  const { 
    title = 'Confirm', 
    variant = 'default', 
    confirmText = 'Continue', 
    cancelText = 'Cancel' 
  } = options || {};
  
  return new Promise((resolve) => {
    if (setGlobalDialogState && setGlobalDialogOpen) {
      setGlobalDialogState({
        type: 'confirm',
        title,
        description: message,
        variant,
        confirmText,
        cancelText,
        onConfirm: () => {
          restoreFocus();
          resolve(true);
        },
        onCancel: () => {
          restoreFocus();
          resolve(false);
        },
      });
      setGlobalDialogOpen(true);
    } else {
      // Fallback to browser confirm if dialog system not available
      const result = window.confirm(message);
      restoreFocus();
      resolve(result);
    }
  });
};

/**
 * Enhanced alert for success messages
 */
export const showSuccess = (message: string): Promise<void> => {
  return showAlert(`✅ ${message}`, { title: 'Success', variant: 'default' });
};

/**
 * Enhanced alert for error messages
 */
export const showError = (message: string): Promise<void> => {
  return showAlert(`❌ ${message}`, { title: 'Error', variant: 'destructive' });
};

/**
 * Enhanced alert for warning messages
 */
export const showWarning = (message: string): Promise<void> => {
  return showAlert(`⚠️ ${message}`, { title: 'Warning', variant: 'default' });
};
