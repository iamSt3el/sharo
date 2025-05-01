import React, { useState, useEffect, useRef } from 'react';
import webRTCService from '../../services/webrtc';
import { formatFileSize, createDownloadLink } from '../../utils/fileUtils';
import { validateRoomId } from '../../utils/idGenerator';
import * as encryption from '../../services/encryption';
import ProgressBar from './ProgressBar'; // Import the ProgressBar component
import StatusMessage from './StatusMessage'; // Import the StatusMessage component

const FileReceiver = () => {
  const [roomId, setRoomId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [receivedFile, setReceivedFile] = useState(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [progress, setProgress] = useState(0);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [fileBeingReceived, setFileBeingReceived] = useState(null);
  const [transferActive, setTransferActive] = useState(false);
  const [connectionStable, setConnectionStable] = useState(false);
  
  // Refs for file transfer state
  const fileChunks = useRef([]);
  const fileSize = useRef(0);
  const receivedSize = useRef(0);
  const encryptionKey = useRef(null);
  const encryptionIV = useRef(null);
  const fileInfo = useRef(null);
  const lastProgressUpdate = useRef(Date.now());
  const progressUpdateInterval = useRef(null);
  
  useEffect(() => {
    // Set up event handlers for WebRTC service
    webRTCService.on('onPeerConnected', handlePeerConnected);
    webRTCService.on('onPeerDisconnected', handlePeerDisconnected);
    webRTCService.on('onDataChannelOpen', handleDataChannelOpen);
    webRTCService.on('onDataChannelClose', handleDataChannelClose);
    webRTCService.on('onMessage', handleMessage);
    webRTCService.on('onRoomClosed', handleRoomClosed);
    
    // Check for room ID in URL parameters (for QR code scanning)
    const checkUrlParams = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const roomParam = urlParams.get('room');
        
        if (roomParam && validateRoomId(roomParam)) {
          setRoomId(roomParam);
          // Automatically connect if room ID is in URL
          setTimeout(() => {
            connectToRoom(roomParam);
          }, 500);
        }
      } catch (error) {
        console.error("Error parsing URL params:", error);
      }
    };
    
    checkUrlParams();
    
    return () => {
      // Clean up WebRTC connection and intervals when component unmounts
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
      webRTCService.cleanup();
    };
  }, []);

  // Setup progress monitoring for large files
  useEffect(() => {
    // Start progress monitoring when transfer is active
    if (transferActive && fileSize.current > 0) {
      // Clear any existing interval
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
      
      // Create a new interval to update UI even when chunks are slow to arrive
      progressUpdateInterval.current = setInterval(() => {
        const currentTime = Date.now();
        // If no update in 2 seconds, update UI with current progress
        if (currentTime - lastProgressUpdate.current > 2000) {
          updateProgressUI();
        }
      }, 1000);
      
      // Make sure connection status is visible
      setConnectionStable(isConnected);
    } else {
      // Clear interval when transfer is not active
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
        progressUpdateInterval.current = null;
      }
    }
    
    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    };
  }, [transferActive, isConnected]);
  
  // Update progress UI function
  const updateProgressUI = () => {
    if (fileSize.current > 0) {
      const percentage = Math.floor((receivedSize.current / fileSize.current) * 100);
      setProgress(percentage);
      
      // Update status based on progress
      if (percentage < 100) {
        setStatus(`Receiving ${fileInfo.current?.name || 'file'}: ${percentage}%`);
        setStatusType('info');
      } else if (percentage === 100 && !receivedFile) {
        setStatus('Processing file...');
        setStatusType('info');
      }
      
      lastProgressUpdate.current = Date.now();
    }
  };
  
  // Handle peer connection established
  const handlePeerConnected = () => {
    setIsConnected(true);
    setConnectionStable(true);
    setIsConnecting(false);
    setStatus('Connected to sender! Waiting for a file...');
    setStatusType('success');
  };
  
  // Handle peer disconnection
  const handlePeerDisconnected = () => {
    setIsConnected(false);
    setConnectionStable(false);
    
    if (transferActive) {
      setStatus('Connection to sender lost during transfer.');
      setStatusType('error');
      setTransferActive(false);
    } else {
      setStatus('Connection to sender lost.');
      setStatusType('warning');
    }
  };
  
  // Handle data channel opening
  const handleDataChannelOpen = () => {
    setIsConnected(true);
    setConnectionStable(true);
    setIsConnecting(false);
    setStatus('Ready to receive files!');
    setStatusType('success');
  };
  
  // Handle data channel closing
  const handleDataChannelClose = () => {
    setIsConnected(false);
    setConnectionStable(false);
    
    if (transferActive) {
      setStatus('Connection lost during file transfer.');
      setStatusType('error');
      setTransferActive(false);
    }
  };
  
  // Handle room being closed by the sender
  const handleRoomClosed = () => {
    setStatus('The sender closed the room.');
    setStatusType('warning');
    setIsConnected(false);
    setConnectionStable(false);
    setIsConnecting(false);
    setTransferActive(false);
  };
  
  // Connect to the room
  const connectToRoom = (id = null) => {
    const roomIdToUse = id || roomId;
    
    if (!roomIdToUse) {
      setStatus('Please enter a room code.');
      setStatusType('error');
      return;
    }
    
    if (!validateRoomId(roomIdToUse)) {
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
    setTransferActive(false);
    setReceivedFile(null);
    setFileBeingReceived(null);
    
    setIsConnecting(true);
    setStatus('Connecting to room...');
    setStatusType('info');
    
    // If not already set, update the roomId state
    if (!id && roomId !== roomIdToUse) {
      setRoomId(roomIdToUse);
    }
    
    webRTCService.initReceiver(roomIdToUse);
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
          
          // Set file being received information for UI
          setFileBeingReceived({
            name: message.name,
            size: message.size,
            type: message.fileType
          });
          
          setTransferActive(true);
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
            setStatus('Transfer complete. Processing file...');
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
                  setTransferActive(false);
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
            setTransferActive(false);
          } catch (error) {
            console.error("Error processing received file:", error);
            setStatus('Error processing file: ' + error.message);
            setStatusType('error');
            setTransferActive(false);
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
      updateProgressUI();
    }
  };
  
  return (
    <div className="file-receiver">
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
            onClick={() => connectToRoom()}
            disabled={isConnected || isConnecting || !roomId}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
      
      {connectionStable && (
        <div className="connection-status mb-4">
          <div className="status-dot status-dot-connected"></div>
          <span className="text-sm">Connected to sender</span>
        </div>
      )}
      
      {fileBeingReceived && (
        <div className="file-being-received mb-4">
          <h3 className="text-lg font-medium mb-2">Receiving File</h3>
          <div className="file-details p-3 bg-blue-50 rounded border border-blue-200">
            <p className="font-medium">{fileBeingReceived.name}</p>
            <p className="text-sm text-gray-600">{formatFileSize(fileBeingReceived.size)}</p>
          </div>
        </div>
      )}
      
      {isConnected && isEncrypted && (
        <div className="encryption-badge mb-4">
          <div className="encryption-badge-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="encryption-badge-title">End-to-end encrypted transfer</span>
          </div>
          <p className="encryption-badge-text">
            This file is being securely transferred with AES-256 encryption
          </p>
        </div>
      )}
      
      {/* Use the imported ProgressBar component */}
      {transferActive && <ProgressBar progress={progress} />}
      
      {receivedFile && (
        <div className="file-received">
          <div className="flex items-center mb-2">
            <svg className="w-6 h-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3>File Received!</h3>
          </div>
          <p className="mb-3">{receivedFile.name} ({formatFileSize(receivedFile.size)})</p>
          <a 
            href={receivedFile.url} 
            download={receivedFile.name}
            className="btn btn-success btn-block"
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </span>
          </a>
        </div>
      )}
      
      {/* Use StatusMessage component instead of custom status div */}
      {status && <StatusMessage status={status} type={statusType} />}
    </div>
  );
};

export default FileReceiver;