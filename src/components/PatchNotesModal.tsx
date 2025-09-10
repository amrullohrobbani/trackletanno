'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PatchNote {
  version: string;
  date: string;
  status: string;
  features: string[];
  bugFixes: string[];
  technical: string[];
}

export default function PatchNotesModal({ isOpen, onClose }: PatchNotesModalProps) {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPatchNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadPatchNotes = async () => {
    try {
      setIsLoading(true);
      console.log('Loading patch notes from /PATCH_NOTES.md');
      
      // Read the PATCH_NOTES.md file from the public directory
      const response = await fetch('/PATCH_NOTES.md');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch patch notes: ${response.status}`);
      }
      
      const content = await response.text();
      console.log('Patch notes content length:', content.length);
      console.log('First 200 characters:', content.substring(0, 200));
      
      const parsedNotes = parsePatchNotesMarkdown(content);
      console.log('Parsed notes count:', parsedNotes.length);
      console.log('Parsed notes:', parsedNotes);
      
      setPatchNotes(parsedNotes);
    } catch (error) {
      console.error('Error loading patch notes:', error);
      // Fallback to some sample data for testing
      setPatchNotes([
        {
          version: '1.4.0',
          date: 'September 10, 2025',
          status: 'Current Release',
          features: [
            'Enhanced Patch Notes Modal: Increased max width to XL and hidden scrollbar for better UX',
            'Dynamic Patch Notes Loading: Patch notes now load directly from PATCH_NOTES.md file',
            'Annotation Duplication Feature: Added ability to duplicate annotations from one frame to multiple target frames'
          ],
          bugFixes: [
            'Improved Modal Design: Better visual hierarchy and responsive layout',
            'Scrollbar Visibility: Hidden scrollbars in patch notes for cleaner appearance'
          ],
          technical: [
            'Single source of truth for patch notes documentation',
            'Enhanced Advanced Tracklet Modal with three operation types'
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const parsePatchNotesMarkdown = (content: string): PatchNote[] => {
    const notes: PatchNote[] = [];
    const lines = content.split('\n');
    let currentNote: Partial<PatchNote> | null = null;
    let currentSection: 'features' | 'bugFixes' | 'technical' | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Version header (## Version X.X.X)
      if (trimmedLine.match(/^## Version \d+\.\d+\.\d+/)) {
        if (currentNote && currentNote.version) {
          notes.push(currentNote as PatchNote);
        }
        const versionMatch = trimmedLine.match(/Version (\d+\.\d+\.\d+)(.*)/);
        if (versionMatch) {
          currentNote = {
            version: versionMatch[1],
            status: versionMatch[2].includes('Current') ? 'Current Release' : 'Previous Release',
            date: '',
            features: [],
            bugFixes: [],
            technical: []
          };
        }
      }
      
      // Date line (*Release Date: ...)
      else if (trimmedLine.match(/^\*Release Date:/)) {
        if (currentNote) {
          const dateMatch = trimmedLine.match(/\*Release Date: (.*)\*/);
          currentNote.date = dateMatch ? dateMatch[1] : '';
        }
      }
      
      // Section headers
      else if (trimmedLine.includes('🎯 New Features')) {
        currentSection = 'features';
      }
      else if (trimmedLine.includes('🐛 Bug Fixes')) {
        currentSection = 'bugFixes';
      }
      else if (trimmedLine.includes('🔧 Technical Improvements')) {
        currentSection = 'technical';
      }
      
      // Regular bullet points (- Item)
      else if (trimmedLine.startsWith('- ') && currentNote && currentSection) {
        // Handle regular bullet points
        const content = trimmedLine.substring(2); // Remove "- "
        currentNote[currentSection]?.push(content);
      }
      
      // Sub-bullet points (  - Item)
      else if (trimmedLine.match(/^  - /) && currentNote && currentSection) {
        const subContent = trimmedLine.replace(/^  - /, '• ');
        currentNote[currentSection]?.push(subContent);
      }
    }
    
    // Add the last note if it exists
    if (currentNote && currentNote.version) {
      notes.push(currentNote as PatchNote);
    }
    
    return notes;
  };

  const getStatusColor = (status: string) => {
    if (status === 'Current Release') return 'text-green-400 bg-green-900/30';
    if (status === 'Previous Release') return 'text-blue-400 bg-blue-900/30';
    if (status === 'Major Update') return 'text-purple-400 bg-purple-900/30';
    return 'text-gray-400 bg-gray-900/30';
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-7xl max-h-[80vh] !scrollbar-hide bg-gray-800 border-gray-600">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white">
              🔄 Patch Notes - Tracklet Annotation Tool
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto scrollbar-hide pr-2 space-y-6">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">
              Loading patch notes...
            </div>
          ) : patchNotes.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No patch notes available.
            </div>
          ) : (
            patchNotes.map((release, index) => (
              <div key={release.version} className="border-l-4 border-gray-600 pl-4">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    Version {release.version}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(release.status)}`}>
                    {release.status}
                  </span>
                  <span className="text-sm text-gray-400">
                    {release.date}
                  </span>
                </div>

                {/* Features */}
                {release.features.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center">
                      🎯 New Features
                    </h4>
                    <ul className="text-sm text-gray-300 space-y-1 ml-4">
                      {release.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-400 mr-2 mt-1">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Bug Fixes */}
                {release.bugFixes.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center">
                      🐛 Bug Fixes
                    </h4>
                    <ul className="text-sm text-gray-300 space-y-1 ml-4">
                      {release.bugFixes.map((fix, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-red-400 mr-2 mt-1">•</span>
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Technical Improvements */}
                {release.technical.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center">
                      🔧 Technical Improvements
                    </h4>
                    <ul className="text-sm text-gray-300 space-y-1 ml-4">
                      {release.technical.map((tech, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-blue-400 mr-2 mt-1">•</span>
                          <span>{tech}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Separator for all but the last item */}
                {index < patchNotes.length - 1 && (
                  <div className="border-b border-gray-700 my-6"></div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
