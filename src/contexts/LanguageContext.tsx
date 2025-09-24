'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n.config';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { t, i18n } = useTranslation('common');
  const [language, setLanguageState] = useState('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initialize i18n first, then load language from localStorage
    const initializeLanguage = async () => {
      try {
        // Wait for i18n to be initialized
        await i18n.loadNamespaces('common');
        
        // Load language from localStorage on mount (only on client-side)
        const savedLanguage = typeof window !== 'undefined' 
          ? localStorage.getItem('language') || 'en' 
          : 'en';
        
        setLanguageState(savedLanguage);
        await i18n.changeLanguage(savedLanguage);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to initialize language:', error);
        // Fallback to English if initialization fails
        setLanguageState('en');
        setIsLoaded(true);
      }
    };

    initializeLanguage();
  }, [i18n]);

  const setLanguage = async (lang: string) => {
    try {
      setLanguageState(lang);
      await i18n.changeLanguage(lang);
      
      // Only use localStorage on client-side
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};
