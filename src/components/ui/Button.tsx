'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

const buttonVariants = {
  default: 'bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus:bg-red-700',
  outline: 'border border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600 focus:bg-gray-600',
  secondary: 'bg-gray-600 text-gray-100 hover:bg-gray-500 focus:bg-gray-500',
  ghost: 'hover:bg-gray-700 text-gray-200 focus:bg-gray-700',
  link: 'text-blue-400 underline-offset-4 hover:underline focus:underline',
};

const buttonSizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
};

export function Button({ 
  className = '', 
  variant = 'default', 
  size = 'default', 
  children, 
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = buttonVariants[variant];
  const sizeClasses = buttonSizes[size];
  
  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
