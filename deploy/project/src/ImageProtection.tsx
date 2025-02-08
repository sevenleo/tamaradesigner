import React, { useEffect, useRef } from 'react';

interface ImageProtectionProps {
  children: React.ReactNode;
  watermarkText?: string;
}

export const ImageProtection: React.FC<ImageProtectionProps> = ({ 
  children,
  watermarkText = 'Tamara Designer'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Prevent context menu
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common save shortcuts
      if ((e.ctrlKey || e.metaKey) && (
        e.key === 's' || // Save
        e.key === 'c' || // Copy
        e.key === 'i' || // Inspect
        e.key === 'u' || // View Source
        e.key === 'p'    // Print
      )) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Prevent PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent drag and selection
    const handleMouseDown = (e: MouseEvent) => {
      if (e.detail > 1) { // Prevent double click
        e.preventDefault();
      }
    };

    // Prevent drag start
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // Add event listeners
    container.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('selectstart', handleContextMenu);
    container.addEventListener('copy', handleContextMenu);
    container.addEventListener('cut', handleContextMenu);
    container.addEventListener('paste', handleContextMenu);

    // Cleanup
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('dragstart', handleDragStart);
      container.removeEventListener('selectstart', handleContextMenu);
      container.removeEventListener('copy', handleContextMenu);
      container.removeEventListener('cut', handleContextMenu);
      container.removeEventListener('paste', handleContextMenu);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative"
      style={{ 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}
      <div 
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          background: `repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.05),
            rgba(255, 255, 255, 0.05) 10px,
            transparent 10px,
            transparent 20px
          )`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="text-white/10 text-lg font-bold transform -rotate-45"
            style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            {watermarkText}
          </span>
        </div>
      </div>
    </div>
  );
};