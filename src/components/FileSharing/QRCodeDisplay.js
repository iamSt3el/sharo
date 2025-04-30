import React, { useEffect, useState } from 'react';

/**
 * QR Code display component
 * Requires 'qrcode' library to be installed: npm install qrcode
 */
const QRCodeDisplay = ({ roomId, size = 180 }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQr, setShowQr] = useState(false);
  
  useEffect(() => {
    if (!roomId) return;
    
    // Only load QRCode when component is mounted
    import('qrcode').then(QRCode => {
      // Generate URL that will open the app with the room ID
      const baseUrl = window.location.origin;
      const joinUrl = `${baseUrl}/receive?room=${roomId}`;
      
      // Generate QR code as data URL
      QRCode.toDataURL(joinUrl, {
        width: size,
        margin: 2,
        color: {
          dark: '#000',
          light: '#fff'
        }
      })
      .then(url => {
        setQrDataUrl(url);
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
      });
    }).catch(err => {
      console.error('Error loading QRCode library:', err);
    });
  }, [roomId, size]);
  
  if (!roomId) return null;
  
  return (
    <div className="qr-code-container">
      {!showQr ? (
        <button
          onClick={() => setShowQr(true)}
          className="btn btn-secondary btn-sm"
        >
          <span className="flex items-center">
            <svg className="mr-2" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Show QR Code
          </span>
        </button>
      ) : (
        <div className="qr-popup">
          <div className="qr-popup-content">
            <h3 className="mb-2">Scan to Connect</h3>
            <p className="text-sm mb-4">Scan this QR code with your device's camera to automatically connect</p>
            
            {qrDataUrl ? (
              <div className="qr-image-container">
                <img src={qrDataUrl} alt="QR Code for room connection" />
              </div>
            ) : (
              <div className="qr-loading">Generating QR code...</div>
            )}
            
            <button
              onClick={() => setShowQr(false)}
              className="btn btn-secondary btn-sm mt-4"
            >
              Hide QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;