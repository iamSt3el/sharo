import React, { useState, useEffect, useRef } from 'react';
import webRTCService from '../../services/webrtc';
import { formatFileSize, readFileChunk } from '../../utils/fileUtils';
import { generateReadableRoomId } from '../../utils/idGenerator';
import * as encryption from '../../services/encryption';
import QRCodeDisplay from './QRCodeDisplay';
import ProgressBar from './ProgressBar';
import StatusMessage from './StatusMessage';
import useFileTransfer from './FileTransferHandler';

const FileSender = () => {
  const [generatedId, setGeneratedId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [optimizeForLargeFiles, setOptimizeForLargeFiles] = useState(true);
  
  // Refs for crypto and transfer state
  const encryptionKey = useRef(null);
  const encryptionIV = useRef(null);
  const transferAbortController = useRef(null);
  
  // Use the enhanced file transfer handler
  const {
    progress,
    transferSpeed,
    timeRemaining,
    formatSpeed,
    formatTimeRemaining,
    startTransfer,
    updateProgress,
    completeTransfer,
    resetTransfer
  } = useFileTransfer({
    fileSize: file?.size || 0,
    isActive: isTransferring,
    onComplete: () => {
      // This is called when the progress reaches 100%
      setStatus(`Sent ${file?.name || 'file'} successfully!`);
      setStatusType('success');
      setIsTransferring(false);
    }
  });
  
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
      
      // Abort any in-progress transfers
      if (transferAbortController.current) {
        transferAbortController.current.abort();
        transferAbortController.current = null;
      }
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
      
      // Abort the transfer
      if (transferAbortController.current) {
        transferAbortController.current.abort();
        transferAbortController.current = null;
      }
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
      
      // Abort the transfer
      if (transferAbortController.current) {
        transferAbortController.current.abort();
        transferAbortController.current = null;
      }
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
  
  // Determine optimal chunk size based on file size
  const getOptimalChunkSize = (fileSize) => {
    // For very large files, increase chunk size to reduce total number of chunks
    if (fileSize > 1024 * 1024 * 500) { // > 500MB
      return 256 * 1024; // 256KB chunks
    } else if (fileSize > 1024 * 1024 * 100) { // > 100MB
      return 128 * 1024; // 128KB chunks
    } else if (fileSize > 1024 * 1024 * 50) { // > 50MB
      return 64 * 1024; // 64KB chunks
    } else {
      return 32 * 1024; // 32KB chunks for smaller files
    }
  };
  
  // Send the selected file with optimizations for large files
  const sendFile = async () => {
    if (!file || !isConnected) {
      setStatus('Connection not ready or no file selected');
      setStatusType('error');
      return;
    }
    
    try {
      // Create abort controller for cancellation
      transferAbortController.current = new AbortController();
      const signal = transferAbortController.current.signal;
      
      setIsTransferring(true);
      resetTransfer();
      startTransfer();
      
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
      
      // Determine optimal chunk size based on file size
      const chunkSize = optimizeForLargeFiles ? getOptimalChunkSize(file.size) : 16 * 1024;
      
      // Read and send the file in chunks
      let offset = 0;
      
      // Function to send the next chunk with dynamic pacing
      const sendNextChunk = async () => {
        // Check for abort signal
        if (signal.aborted) {
          setStatus('Transfer canceled.');
          setStatusType('warning');
          setIsTransferring(false);
          return;
        }
        
        if (offset >= file.size) {
          // Transfer complete, send completion message
          webRTCService.sendMessage({
            type: 'transfer-complete',
            name: file.name,
            fileType: file.type,
            encrypted: isEncrypted
          });
          
          // Update progress to 100%
          completeTransfer();
          return;
        }
        
        try {
          // Determine how many chunks to read and send in one batch
          // This helps with large files by reducing the overhead of reading small chunks
          const remainingBytes = file.size - offset;
          const bytesToRead = Math.min(remainingBytes, chunkSize);
          
          // Read chunk from file
          const chunk = await readFileChunk(file, offset, bytesToRead);
          
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
          offset += bytesToRead;
          updateProgress(bytesToRead);
          
          // For very large files, adjust the sending rate to avoid overwhelming the connection
          // This introduces a small delay between chunks for smoother transfers
          if (file.size > 100 * 1024 * 1024) { // Over 100MB
            // Calculate delay based on network conditions (using a basic heuristic)
            // This simulates a kind of flow control
            const delayMs = transferSpeed > 1024 * 1024 ? 0 : 5; // If speed < 1MB/s, add small delay
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          // Schedule the next chunk using requestAnimationFrame for better performance
          // This helps prevent UI blocking in browsers
          requestAnimationFrame(() => {
            setTimeout(sendNextChunk, 0);
          });
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
  
  // Cancel an in-progress transfer
  const cancelTransfer = () => {
    if (transferAbortController.current) {
      transferAbortController.current.abort();
      transferAbortController.current = null;
    }
    
    setIsTransferring(false);
    setStatus('Transfer canceled.');
    setStatusType('warning');
  };
  
  // Render transfer stats if a transfer is in progress
  const renderTransferStats = () => {
    if (!isTransferring || !file) return null;
    
    return (
      <div className="transfer-stats mt-2 mb-4 p-3 bg-blue-50 rounded border border-blue-200">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Transfer Speed:</span>
          <span className="text-sm">{formatSpeed()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium">Estimated Time:</span>
          <span className="text-sm">{formatTimeRemaining()}</span>
        </div>
      </div>
    );
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
      
      <div className="form-group mb-6">
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={optimizeForLargeFiles}
            onChange={() => setOptimizeForLargeFiles(!optimizeForLargeFiles)}
            disabled={isTransferring}
          />
          <span>Optimize for large files</span>
        </label>
        {optimizeForLargeFiles && (
          <p className="text-sm text-gray mt-1">
            Improved performance for files over 50MB
          </p>
        )}
      </div>
      
      {isConnected && (
        <div className="connection-status mb-4">
          <div className="status-dot status-dot-connected"></div>
          <span className="text-sm">Connected to receiver</span>
        </div>
      )}
      
      {isTransferring ? (
        <button
          className="btn btn-danger btn-block"
          onClick={cancelTransfer}
        >
          Cancel Transfer
        </button>
      ) : (
        <button
          className="btn btn-primary btn-block"
          onClick={sendFile}
          disabled={!file || !isConnected}
        >
          Send File
        </button>
      )}
      
      {progress > 0 && (
        <div className="mt-4">
          <ProgressBar 
            progress={progress} 
            animated={progress < 100}
          />
        </div>
      )}
      
      {renderTransferStats()}
      
      {status && (
        <StatusMessage status={status} type={statusType} />
      )}
    </div>
  );
};

export default FileSender;