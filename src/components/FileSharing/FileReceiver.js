import React, { useState, useEffect, useRef } from 'react';
import webRTCService from '../../services/webrtc';
import { formatFileSize, createDownloadLink } from '../../utils/fileUtils';
import { validateRoomId } from '../../utils/idGenerator';
import * as encryption from '../../services/encryption';

const FileReceiver = () => {
  const [roomId, setRoomId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [receivedFile, setReceivedFile] = useState(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [progress, setProgress] = useState(0);
  const [isEncrypted, setIsEncrypted] = useState(false);
  
  // Refs for file transfer state
  const fileChunks = useRef([]);
  const fileSize = useRef(0);
  const receivedSize = useRef(0);
  const encryptionKey = useRef(null);
  const encryptionIV = useRef(null);
  const fileInfo = useRef(null);
  
  useEffect(() => {
    // Set up event handlers for WebRTC service
    webRTCService.on('onPeerConnected', handlePeerConnected);
    webRTCService.on('onPeerDisconnected', handlePeerDisconnected);
    webRTCService.on('onDataChannelOpen', handleDataChannelOpen);
    webRTCService.on('onDataChannelClose', handleDataChannelClose);
    webRTCService.on('onMessage', handleMessage);
    webRTCService.on('onRoomClosed', handleRoomClosed);
    
    return () => {
      // Clean up WebRTC connection when component unmounts
      webRTCService.cleanup();
    };
  }, []);
  
  // Handle peer connection established
  const handlePeerConnected = () => {
    setIsConnected(true);
    setIsConnecting(false);
    setStatus('Connected to sender! Waiting for a file...');
    setStatusType('success');
  };
  
  // Handle peer disconnection
  const handlePeerDisconnected = () => {
    setIsConnected(false);
    setStatus('Connection to sender lost.');
    setStatusType('warning');
  };
  
  // Handle data channel opening
  const handleDataChannelOpen = () => {
    setIsConnected(true);
    setIsConnecting(false);
    setStatus('Ready to receive files!');
    setStatusType('success');
  };
  
  // Handle data channel closing
  const handleDataChannelClose = () => {
    setIsConnected(false);
  };
  
  // Handle room being closed by the sender
  const handleRoomClosed = () => {
    setStatus('The sender closed the room.');
    setStatusType('warning');
    setIsConnected(false);
    setIsConnecting(false);
  };
  
  // Connect to the room
  const connectToRoom = () => {
    if (!roomId) {
      setStatus('Please enter a room code.');
      setStatusType('error');
      return;
    }
    
    if (!validateRoomId(roomId)) {
      setStatus('Invalid room code format.');
      setStatusType('error');
      return;
    }
    
    // Reset file transfer state
    fileChunks.current = [];
    receivedSize.current = 0;
    fileSize.current = 0;
    encryptionKey.current = null;
    encryptionIV.current = null;
    fileInfo.current = null;
    setProgress(0);
    setReceivedFile(null);
    
    setIsConnecting(true);
    setStatus('Connecting to room...');
    setStatusType('info');
    
    webRTCService.initReceiver(roomId);
  };
  
  // Handle incoming messages from the data channel
  const handleMessage = async (data) => {
    // Text message (control messages)
    if (typeof data === 'string') {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'encryption-key') {
          // Receive encryption key and IV from sender
          setStatus('Receiving encryption key...');
          setIsEncrypted(true);
          try {
            encryptionKey.current = await encryption.importKey(message.key);
            encryptionIV.current = new Uint8Array(message.iv);
            setStatus('Encryption key received. Ready to receive encrypted file.');
          } catch (keyError) {
            console.error("Error importing encryption key:", keyError);
            setStatus('Error with encryption key: ' + keyError.message);
            setStatusType('error');
          }
        }
        
        else if (message.type === 'file-info') {
          // Prepare to receive a file
          fileChunks.current = [];
          receivedSize.current = 0;
          fileSize.current = message.size;
          fileInfo.current = {
            name: message.name,
            type: message.fileType,
            size: message.size
          };
          
          setStatus(`Receiving ${message.name} (${formatFileSize(message.size)})...`);
          setStatusType('info');
          
          // Update encryption status based on sender's message
          if (message.encrypted !== undefined) {
            setIsEncrypted(message.encrypted);
          }
        }
        
        else if (message.type === 'transfer-complete') {
          // File transfer complete, process the received file
          try {
            let finalBlob;
            
            // If the file was encrypted, decrypt all chunks before creating the blob
            if (message.encrypted && encryptionKey.current && encryptionIV.current) {
              setStatus('Decrypting file...');
              const decryptedChunks = [];
              
              for (const chunk of fileChunks.current) {
                try {
                  const decryptedChunk = await encryption.decryptData(
                    encryptionKey.current,
                    chunk,
                    encryptionIV.current
                  );
                  decryptedChunks.push(decryptedChunk);
                } catch (decryptError) {
                  console.error("Decryption error:", decryptError);
                  setStatus('Decryption error: ' + decryptError.message);
                  setStatusType('error');
                  return;
                }
              }
              
              finalBlob = new Blob(decryptedChunks, { type: message.fileType });
            } else {
              finalBlob = new Blob(fileChunks.current, { type: message.fileType });
            }
            
            const downloadLink = createDownloadLink(finalBlob, message.name);
            setReceivedFile(downloadLink);
            
            setStatus(`Received ${message.name} successfully!`);
            setStatusType('success');
            setProgress(100);
          } catch (error) {
            console.error("Error processing received file:", error);
            setStatus('Error processing file: ' + error.message);
            setStatusType('error');
          }
        }
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    } 
    // Binary data (file chunks)
    else {
      fileChunks.current.push(data);
      receivedSize.current += data.size;
      const percentage = Math.floor((receivedSize.current / fileSize.current) * 100);
      setProgress(percentage);
      setStatus(`Receiving file: ${percentage}%`);
    }
  };
  
  return (
    <div>
      <div className="form-group mb-6">
        <h2 className="mb-2">Enter sharing code</h2>
        <div className="input-group">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter the room code"
            className="form-input"
            disabled={isConnected || isConnecting}
          />
          <button 
            className="btn btn-success"
            onClick={connectToRoom}
            disabled={isConnected || isConnecting || !roomId}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
      
      {isConnected && isEncrypted && (
        <div className="encryption-badge">
          <div className="encryption-badge-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="encryption-badge-title">End-to-end encrypted transfer</span>
          </div>
          <p className="encryption-badge-text">
            This file is being securely transferred with AES-256 encryption
          </p>
        </div>
      )}
      
      {isConnected && (
        <div className="connection-status">
          <div className="status-dot status-dot-connected"></div>
          <span className="text-sm">Connected to sender</span>
        </div>
      )}
      
      {progress > 0 && (
        <div className="progress-container">
          <div 
            className={`progress-bar ${progress < 100 ? 'progress-bar-blue' : 'progress-bar-green'}`}
            style={{ width: `${progress}%` }}
          ></div>
          <div className="progress-text">{progress}%</div>
        </div>
      )}
      
      {receivedFile && (
        <div className="file-received">
          <h3>File Received!</h3>
          <p>{receivedFile.name} ({formatFileSize(receivedFile.size)})</p>
          <a 
            href={receivedFile.url} 
            download={receivedFile.name}
          >
            Download File
          </a>
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

export default FileReceiver;