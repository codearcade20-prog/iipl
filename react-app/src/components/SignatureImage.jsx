import React, { useState, useEffect } from 'react';

/**
 * A safe image loader that fetches an image via AJAX and displays it as a local blob URL.
 * This prevents browsers from triggering "Access other apps" permission prompts
 * which often happen when standard image URLs are intercepted by OS protocol handlers.
 */
const SignatureImage = ({ src, alt, className, style }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!src) {
            setLoading(false);
            return;
        }

        let currentBlobUrl = null;

        const loadImage = async () => {
            try {
                setLoading(true);
                const response = await fetch(src);
                if (!response.ok) throw new Error('Failed to fetch image');
                
                const blob = await response.blob();
                currentBlobUrl = URL.createObjectURL(blob);
                setBlobUrl(currentBlobUrl);
                setError(false);
            } catch (err) {
                console.error('Error loading signature as blob:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        loadImage();

        // Cleanup the blob URL when the component unmounts or src changes
        return () => {
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }
        };
    }, [src]);

    if (loading) {
        return <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>...</div>;
    }

    if (error || !blobUrl) {
        // Fallback to direct src if blob fails, or show nothing
        return <img src={src} alt={alt} className={className} style={style} />;
    }

    return <img src={blobUrl} alt={alt} className={className} style={style} />;
};

export default SignatureImage;
