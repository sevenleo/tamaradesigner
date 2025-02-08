import React, { useState } from 'react';
import { ImageProtection } from './ImageProtection';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
  watermarkText?: string;
}

export const ProtectedImage: React.FC<ProtectedImageProps> = ({
  src,
  alt,
  className = '',
  watermarkText
}) => {
  const [imageUrl, setImageUrl] = useState<string>(() => {
    // Obfuscate the original URL by creating a blob URL
    const createBlobUrl = async () => {
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setImageUrl(blobUrl);
        
        // Clean up the blob URL when component unmounts
        return () => URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Failed to create blob URL:', error);
        return src; // Fallback to original URL if blob creation fails
      }
    };
    
    createBlobUrl();
    return src; // Return original URL initially while blob is being created
  });

  return (
    <ImageProtection watermarkText={watermarkText}>
      <img
        src={imageUrl}
        alt={alt}
        className={`max-w-full ${className}`}
        style={{
          pointerEvents: 'none',
          // Break up the image into small segments to make it harder to screenshot
          WebkitMaskImage: 'linear-gradient(45deg, #000 95%, transparent 95%)',
          maskImage: 'linear-gradient(45deg, #000 95%, transparent 95%)',
        }}
        crossOrigin="anonymous"
        loading="lazy"
      />
    </ImageProtection>
  );
};