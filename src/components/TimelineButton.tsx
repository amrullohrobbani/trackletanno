'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useLanguage } from '@/contexts/LanguageContext';
import TrackletTimelineModal from '@/components/TrackletTimelineModal';

interface TimelineButtonProps {
  trackletId: number;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TimelineButton({ 
  trackletId, 
  variant = 'primary', 
  size = 'md',
  className = '' 
}: TimelineButtonProps) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const { annotations } = useAppStore();

  // Check if this tracklet has any annotations
  const hasAnnotations = annotations.some(ann => ann.tracklet_id === trackletId);

  if (!hasAnnotations) {
    return null; // Don't show button if no annotations exist for this tracklet
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-500 text-white',
    icon: 'bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white p-2'
  };

  const buttonClasses = `
    ${sizeClasses[size]} 
    ${variantClasses[variant]} 
    rounded font-medium transition-all duration-200 
    flex justify-center items-center gap-2 
    ${className}
  `.trim();

  const timelineIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={buttonClasses}
        title={`${t('tracklet.viewTimeline')} - ID ${trackletId}`}
      >
        {timelineIcon}
        {variant !== 'icon' && (
          <span>{t('tracklet.viewTimeline')}</span>
        )}
      </button>
      
      <TrackletTimelineModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        trackletId={trackletId}
      />
    </>
  );
}
