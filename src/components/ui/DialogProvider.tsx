'use client';

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { setDialogStateSetter, clearDialogStateSetter } from '@/utils/dialogUtils';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  variant?: 'default' | 'destructive';
}

function AlertDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  onConfirm,
  confirmText = 'OK',
  variant = 'default'
}: AlertDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-auto min-w-80">
        <div onKeyDown={handleKeyDown} tabIndex={-1}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={handleConfirm}
              variant={variant}
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

function ConfirmDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  onConfirm,
  onCancel,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  variant = 'default'
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-auto min-w-80">
        <div onKeyDown={handleKeyDown} tabIndex={-1}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {cancelText}
            </Button>
            <Button 
              onClick={handleConfirm}
              variant={variant}
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

const initialDialogState: DialogState = {
  type: null,
  title: '',
  description: '',
  variant: 'default',
  confirmText: 'OK',
  cancelText: 'Cancel',
  onConfirm: () => {},
  onCancel: () => {},
};

let setGlobalDialogState: React.Dispatch<React.SetStateAction<DialogState>> | null = null;
let setGlobalDialogOpen: React.Dispatch<React.SetStateAction<boolean>> | null = null;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Set global references for both the existing system and new dialog utils
  React.useEffect(() => {
    setGlobalDialogState = setDialogState;
    setGlobalDialogOpen = setDialogOpen;
    
    // Also register with the dialog utils
    setDialogStateSetter(setDialogState, setDialogOpen);
    
    return () => {
      setGlobalDialogState = null;
      setGlobalDialogOpen = null;
      clearDialogStateSetter();
    };
  }, []);

  return (
    <>
      {children}
      
      {dialogState.type === 'alert' && (
        <AlertDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={dialogState.title}
          description={dialogState.description}
          onConfirm={dialogState.onConfirm}
          confirmText={dialogState.confirmText}
          variant={dialogState.variant}
        />
      )}
      
      {dialogState.type === 'confirm' && (
        <ConfirmDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={dialogState.title}
          description={dialogState.description}
          onConfirm={dialogState.onConfirm}
          onCancel={dialogState.onCancel}
          confirmText={dialogState.confirmText}
          cancelText={dialogState.cancelText}
          variant={dialogState.variant}
        />
      )}
    </>
  );
}

// Hook for using dialogs
export function useDialog() {
  const showAlert = useCallback((
    title: string, 
    description: string, 
    options: {
      confirmText?: string;
      variant?: 'default' | 'destructive';
      onConfirm?: () => void;
    } = {}
  ) => {
    const { confirmText = 'OK', variant = 'default', onConfirm = () => {} } = options;
    
    if (setGlobalDialogState && setGlobalDialogOpen) {
      setGlobalDialogState({
        type: 'alert',
        title,
        description,
        variant,
        confirmText,
        cancelText: 'Cancel',
        onConfirm,
        onCancel: () => {},
      });
      setGlobalDialogOpen(true);
    }
  }, []);

  const showConfirm = useCallback((
    title: string, 
    description: string,
    options: {
      confirmText?: string;
      cancelText?: string;
      variant?: 'default' | 'destructive';
      onConfirm?: () => void;
      onCancel?: () => void;
    } = {}
  ): Promise<boolean> => {
    const { 
      confirmText = 'Continue', 
      cancelText = 'Cancel', 
      variant = 'default',
      onConfirm = () => {},
      onCancel = () => {}
    } = options;
    
    return new Promise((resolve) => {
      if (setGlobalDialogState && setGlobalDialogOpen) {
        setGlobalDialogState({
          type: 'confirm',
          title,
          description,
          variant,
          confirmText,
          cancelText,
          onConfirm: () => {
            onConfirm();
            resolve(true);
          },
          onCancel: () => {
            onCancel();
            resolve(false);
          },
        });
        setGlobalDialogOpen(true);
      } else {
        resolve(false);
      }
    });
  }, []);

  return { showAlert, showConfirm };
}
