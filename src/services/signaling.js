/**
 * Socket.io signaling service for WebRTC connection establishment
 */
import { io } from 'socket.io-client';

class SignalingService {
  constructor() {
    this.socket = null;
    this.callbacks = {};
  }

  // Connect to the signaling server
  connect() {
    // Get server URL from environment
    const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://sharo-server.onrender.com/';
    
    // Create socket connection
    this.socket = io(SERVER_URL);
    
    // Set up default socket event listeners
    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      if (this.callbacks.onConnect) this.callbacks.onConnect();
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
    });
    
    this.socket.on('error', (error) => {
      console.error('Signaling server error:', error);
      if (this.callbacks.onError) this.callbacks.onError(error);
    });
    
    // Set up WebRTC signaling event listeners
    this.socket.on('room-created', (roomId) => {
      if (this.callbacks.onRoomCreated) this.callbacks.onRoomCreated(roomId);
    });
    
    this.socket.on('user-joined', (userId) => {
      if (this.callbacks.onUserJoined) this.callbacks.onUserJoined(userId);
    });
    
    this.socket.on('offer', ({offer, from}) => {
      if (this.callbacks.onOffer) this.callbacks.onOffer(offer, from);
    });
    
    this.socket.on('answer', ({answer, from}) => {
      if (this.callbacks.onAnswer) this.callbacks.onAnswer(answer, from);
    });
    
    this.socket.on('ice-candidate', ({candidate, from}) => {
      if (this.callbacks.onIceCandidate) this.callbacks.onIceCandidate(candidate, from);
    });
    
    this.socket.on('room-closed', () => {
      if (this.callbacks.onRoomClosed) this.callbacks.onRoomClosed();
    });
    
    this.socket.on('user-left', (userId) => {
      if (this.callbacks.onUserLeft) this.callbacks.onUserLeft(userId);
    });
  }

  // Set callback functions for socket events
  on(event, callback) {
    this.callbacks[event] = callback;
  }

  // Create a new room
  createRoom(roomId) {
    if (!this.socket) return;
    this.socket.emit('create-room', roomId);
  }

  // Join an existing room
  joinRoom(roomId) {
    if (!this.socket) return;
    this.socket.emit('join-room', roomId);
  }

  // Send WebRTC offer
  sendOffer(roomId, offer) {
    if (!this.socket) return;
    this.socket.emit('offer', { roomId, offer });
  }

  // Send WebRTC answer
  sendAnswer(roomId, answer, to) {
    if (!this.socket) return;
    this.socket.emit('answer', { roomId, answer, to });
  }

  // Send ICE candidate
  sendIceCandidate(roomId, candidate, to) {
    if (!this.socket) return;
    this.socket.emit('ice-candidate', { roomId, candidate, to });
  }

  // Disconnect from the signaling server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Export a singleton instance
const signalingService = new SignalingService();
export default signalingService;