'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  isOpen,
  onClose,
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
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[450px] w-[90vw]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line text-left text-gray-300 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleCancel} className="min-w-[80px]">
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm} className="min-w-[80px]">
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm?: () => void;
  confirmText?: string;
  variant?: 'default' | 'destructive';
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  confirmText = 'OK',
  variant = 'default'
}: AlertDialogProps) {
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[450px] w-[90vw]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line text-left text-gray-300 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end pt-4">
          <Button variant={variant} onClick={handleConfirm} className="min-w-[80px]">
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
