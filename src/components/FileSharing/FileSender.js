import React, { useState, useEffect, useRef } from 'react';
import webRTCService from '../../services/webrtc';
import { formatFileSize, readFileChunk } from '../../utils/fileUtils';
import { generateReadableRoomId } from '../../utils/idGenerator';
import * as encryption from '../../services/encryption';
import QRCodeDisplay from './QRCodeDisplay';
// Make sure to import our stylesheet if it's separate
// import './qrCodeStyles.css';

const FileSender = () => {
  const [generatedId, setGeneratedId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [progress, setProgress] = useState(0);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  
  // Refs for crypto
  const encryptionKey = useRef(null);
  const encryptionIV = useRef(null);
  
  useEffect(() => {
    // Create a room ID on component mount
    const roomId = generateReadableRoomId();
    setGeneratedId(roomId);
    
    // Generate encryption key and IV if encryption is enabled
    if (isEncrypted) {
      generateEncryptionKey();
    }
    
    // Initialize WebRTC as sender
    webRTCService.initSender(roomId);
    setStatus(`Room created! Share the code: ${roomId}`);
    setStatusType('info');
    
    // Set up event handlers for WebRTC service
    webRTCService.on('onPeerConnected', handlePeerConnected);
    webRTCService.on('onPeerDisconnected', handlePeerDisconnected);
    webRTCService.on('onDataChannelOpen', handleDataChannelOpen);
    webRTCService.on('onDataChannelClose', handleDataChannelClose);
    webRTCService.on('onUserConnecting', handleUserConnecting);
    
    // Clean up on unmount
    return () => {
      webRTCService.cleanup();
    };
  }, []);
  
  // Generate new encryption key and IV
  const generateEncryptionKey = async () => {
    try {
      encryptionKey.current = await encryption.generateKey();
      encryptionIV.current = encryption.generateIV();
      console.log("Encryption key and IV generated");
    } catch (error) {
      console.error("Error generating encryption key:", error);
      setStatus('Error generating encryption key: ' + error.message);
      setStatusType('error');
    }
  };
  
  // Update encryption state and regenerate key if needed
  useEffect(() => {
    if (isEncrypted && !encryptionKey.current) {
      generateEncryptionKey();
    }
  }, [isEncrypted]);
  
  // Handle peer connection established
  const handlePeerConnected = () => {
    setIsConnected(true);
    setStatus('Connected to receiver! Ready to send files.');
    setStatusType('success');
  };
  
  // Handle peer disconnection
  const handlePeerDisconnected = () => {
    setIsConnected(false);
    if (isTransferring) {
      setStatus('Connection lost during file transfer.');
      setStatusType('error');
      setIsTransferring(false);
    } else {
      setStatus('Receiver disconnected.');
      setStatusType('warning');
    }
  };
  
  // Handle data channel opening
  const handleDataChannelOpen = () => {
    setIsConnected(true);
    setStatus('Ready to send files!');
    setStatusType('success');
  };
  
  // Handle data channel closing
  const handleDataChannelClose = () => {
    setIsConnected(false);
    if (isTransferring) {
      setStatus('Connection lost during file transfer.');
      setStatusType('error');
      setIsTransferring(false);
    } else {
      setStatus('Connection closed.');
      setStatusType('info');
    }
  };
  
  // Handle user connecting to room
  const handleUserConnecting = () => {
    setStatus('Someone is connecting to your room...');
    setStatusType('info');
  };
  
  // Copy room ID to clipboard
  const copyRoomId = () => {
    navigator.clipboard.writeText(generatedId);
    setStatus('Code copied to clipboard!');
    setStatusType('success');
  };
  
  // Send the selected file
  const sendFile = async () => {
    if (!file || !isConnected) {
      setStatus('Connection not ready or no file selected');
      setStatusType('error');
      return;
    }
    
    try {
      setIsTransferring(true);
      setProgress(0);
      
      // If encryption is enabled, send the encryption key and IV first
      if (isEncrypted && encryptionKey.current) {
        const exportedKey = await encryption.exportKey(encryptionKey.current);
        webRTCService.sendMessage({
          type: 'encryption-key',
          key: exportedKey,
          iv: Array.from(encryptionIV.current)
        });
        
        setStatus('Sending encryption key to receiver...');
        // Give a small delay to ensure the key is received before sending the file
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Send file info
      webRTCService.sendMessage({
        type: 'file-info',
        name: file.name,
        size: file.size,
        fileType: file.type,
        encrypted: isEncrypted
      });
      
      // Read and send the file in chunks
      const chunkSize = 16384; // 16KB chunks
      let offset = 0;
      
      const sendNextChunk = async () => {
        if (offset >= file.size) {
          // Transfer complete
          webRTCService.sendMessage({
            type: 'transfer-complete',
            name: file.name,
            fileType: file.type,
            encrypted: isEncrypted
          });
          
          setStatus(`Sent ${file.name} successfully!`);
          setStatusType('success');
          setIsTransferring(false);
          return;
        }
        
        try {
          // Read chunk from file
          const chunk = await readFileChunk(file, offset, chunkSize);
          
          // Encrypt chunk if encryption is enabled
          let dataToSend = chunk;
          if (isEncrypted && encryptionKey.current) {
            try {
              dataToSend = await encryption.encryptData(
                encryptionKey.current, 
                chunk,
                encryptionIV.current
              );
            } catch (encryptError) {
              console.error("Encryption error:", encryptError);
              setStatus('Encryption error: ' + encryptError.message);
              setStatusType('error');
              setIsTransferring(false);
              return;
            }
          }
          
          // Send the chunk
          const success = webRTCService.sendData(dataToSend);
          if (!success) {
            setStatus('Failed to send data: connection lost.');
            setStatusType('error');
            setIsTransferring(false);
            return;
          }
          
          // Update offset and progress
          offset += chunk.byteLength;
          const percentage = Math.floor((offset / file.size) * 100);
          setProgress(percentage);
          setStatus(`Sending ${file.name}: ${percentage}%`);
          
          // Schedule the next chunk
          setTimeout(sendNextChunk, 0);
        } catch (error) {
          console.error("Error sending chunk:", error);
          setStatus('Error sending file: ' + error.message);
          setStatusType('error');
          setIsTransferring(false);
        }
      };
      
      // Start sending chunks
      sendNextChunk();
      
    } catch (error) {
      console.error("Error sending file:", error);
      setStatus('Error: ' + error.message);
      setStatusType('error');
      setIsTransferring(false);
    }
  };
  
  return (
    <div>
      <div className="form-group mb-6">
        <h2 className="mb-2">Share this code with receiver</h2>
        <div className="input-group">
          <input
            type="text"
            value={generatedId}
            readOnly
            className="form-input"
            style={{backgroundColor: '#f9fafb'}}
          />
          <button 
            className="btn btn-secondary"
            onClick={copyRoomId}
          >
            Copy
          </button>
        </div>
        
        {/* QR Code Display Component */}
        <QRCodeDisplay roomId={generatedId} />
      </div>
      
      <div className="form-group mb-6">
        <h2 className="mb-2">Select a file to send</h2>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0] || null)}
          className="file-input"
          disabled={isTransferring}
        />
        {file && (
          <div className="file-info">
            Selected: {file.name} ({formatFileSize(file.size)})
          </div>
        )}
      </div>
      
      <div className="form-group mb-6">
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={isEncrypted}
            onChange={() => setIsEncrypted(!isEncrypted)}
            disabled={isTransferring}
          />
          <span>Enable end-to-end encryption (AES-256)</span>
        </label>
        {isEncrypted && (
          <p className="text-sm text-gray mt-1">
            Files will be encrypted before sending and decrypted after receiving
          </p>
        )}
      </div>
      
      {isConnected && (
        <div className="connection-status mb-4">
          <div className="status-dot status-dot-connected"></div>
          <span className="text-sm">Connected to receiver</span>
        </div>
      )}
      
      <button
        className="btn btn-primary btn-block"
        onClick={sendFile}
        disabled={!file || !isConnected || isTransferring}
      >
        {isTransferring ? 'Sending...' : 'Send File'}
      </button>
      
      {progress > 0 && (
        <div className="progress-container">
          <div 
            className={`progress-bar ${progress < 100 ? 'progress-bar-blue' : 'progress-bar-green'}`}
            style={{ width: `${progress}%` }}
          ></div>
          <div className="progress-text">{progress}%</div>
        </div>
      )}
      
      {status && (
        <div className={`status-message status-${statusType}`}>
          <svg className="status-message-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {statusType === 'success' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            )}
            {statusType === 'error' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            )}
            {statusType === 'warning' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            )}
            {statusType === 'info' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <p>{status}</p>
        </div>
      )}
    </div>
  );
};

export default FileSender;