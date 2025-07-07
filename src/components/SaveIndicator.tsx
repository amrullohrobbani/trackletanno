'use client';

import { useAppStore } from '@/store/appStore';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function SaveIndicator() {
  const { saveStatus } = useAppStore();

  if (saveStatus === 'idle') return null;

  const getStatusConfig = () => {
    switch (saveStatus) {
      case 'saving':
        return {
          icon: (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
          ),
          text: 'Saving...',
          className: 'bg-yellow-600 text-yellow-100'
        };
      case 'saved':
        return {
          icon: <CheckCircleIcon className="w-4 h-4" />,
          text: 'Saved',
          className: 'bg-green-600 text-green-100'
        };
      case 'error':
        return {
          icon: <ExclamationCircleIcon className="w-4 h-4" />,
          text: 'Save Error',
          className: 'bg-red-600 text-red-100'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}
