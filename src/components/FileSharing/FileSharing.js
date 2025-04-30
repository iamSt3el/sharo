import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FileSender from './FileSender';
import FileReceiver from './FileReceiver';

/**
 * Main FileSharing component that handles mode selection
 * Updated to work with React Router for QR code scanning
 */
const FileSharing = ({ initialMode = 'choose' }) => {
  const [mode, setMode] = useState(initialMode);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check URL parameters and paths
    const checkUrlForMode = () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const pathname = location.pathname;
        
        // If path is /send, go to send mode
        if (pathname === '/send') {
          setMode('send');
          return;
        }
        
        // If path is /receive or has room parameter, go to receive mode
        if (pathname === '/receive' || urlParams.has('room')) {
          setMode('receive');
          return;
        }
        
        // If initialMode was provided, use that
        if (initialMode !== 'choose') {
          setMode(initialMode);
          return;
        }
      } catch (error) {
        console.error("Error parsing URL:", error);
      }
    };
    
    checkUrlForMode();
  }, [location, initialMode]);

  // Reset to initial state and update URL
  const resetApp = () => {
    setMode('choose');
    navigate('/', { replace: true });
  };

  return (
    <div className="app">
      <div className="card">
        {/* Header */}
        <div className="text-center mb-8">
          <h1>P2P File Sharing</h1>
          <p className="text-gray">Transfer files directly without uploads</p>
        </div>
        
        {/* Mode Selection */}
        {mode === 'choose' && (
          <div className="mb-6">
            <h2 className="mb-4">How would you like to share?</h2>
            <div className="grid grid-cols-1 grid-cols-2-sm gap-4">
              <button 
                className="btn btn-primary btn-lg btn-block"
                onClick={() => {
                  setMode('send');
                  navigate('/send', { replace: true });
                }}
              >
                <div className="flex flex-col items-center">
                  <svg className="mb-2" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Send a File
                </div>
              </button>
              <button 
                className="btn btn-success btn-lg btn-block"
                onClick={() => {
                  setMode('receive');
                  navigate('/receive', { replace: true });
                }}
              >
                <div className="flex flex-col items-center">
                  <svg className="mb-2" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Receive a File
                </div>
              </button>
            </div>
            
            {/* How it works section */}
            <div className="how-it-works">
              <h3>How it works</h3>
              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <p>Connect with a sharing code or scan QR code</p>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <p>Select file to transfer</p>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <p>Files transfer directly, peer-to-peer</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Sender Mode */}
        {mode === 'send' && (
          <div>
            <FileSender />
          </div>
        )}
        
        {/* Receiver Mode */}
        {mode === 'receive' && (
          <div>
            <FileReceiver />
          </div>
        )}
        
        {/* Reset Button */}
        {mode !== 'choose' && (
          <div className="text-center mt-8">
            <button 
              className="btn btn-secondary"
              onClick={resetApp}
            >
              <span className="flex items-center">
                <svg className="mr-2" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Start Over
              </span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <div className="footer-icon">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>End-to-end encrypted file transfer</span>
          </div>
          <p>Files are transferred directly between devices. No data is stored on servers.</p>
          {mode !== 'choose' && (
            <p className="mt-1">
              {mode === 'send' 
                ? 'Waiting for the receiver to connect using your room code or QR code.' 
                : 'Enter the room code provided by the sender to connect.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileSharing;