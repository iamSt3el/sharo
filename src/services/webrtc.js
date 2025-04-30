/**
 * WebRTC service for peer connection and data channel management
 */
import signalingService from './signaling';

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.remoteUserId = null;
    this.roomId = null;
    this.isSender = false;

    this.callbacks = {};
    
    // Configure STUN servers for NAT traversal
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    // Set up signaling service event listeners
    this._setupSignaling();
  }

  // Set up signaling service event handlers
  _setupSignaling() {
    signalingService.on('onUserJoined', (userId) => {
      this.remoteUserId = userId;
      if (this.callbacks.onUserConnecting) this.callbacks.onUserConnecting();
      this.createOffer();
    });
    
    signalingService.on('onOffer', async (offer, from) => {
      this.remoteUserId = from;
      await this._handleOffer(offer);
    });
    
    signalingService.on('onAnswer', async (answer) => {
      await this._handleAnswer(answer);
    });
    
    signalingService.on('onIceCandidate', async (candidate, from) => {
      if (from === this.remoteUserId) {
        await this._handleIceCandidate(candidate);
      }
    });
    
    signalingService.on('onRoomClosed', () => {
      if (this.callbacks.onRoomClosed) this.callbacks.onRoomClosed();
      this.cleanup();
    });
    
    signalingService.on('onUserLeft', (userId) => {
      if (userId === this.remoteUserId) {
        if (this.callbacks.onPeerDisconnected) this.callbacks.onPeerDisconnected();
        // Keep the connection open but mark as disconnected
        this.remoteUserId = null;
      }
    });
  }

  // Set callback functions for events
  on(event, callback) {
    this.callbacks[event] = callback;
  }

  // Initialize as sender
  initSender(roomId) {
    this.roomId = roomId;
    this.isSender = true;
    
    // Create peer connection
    this._createPeerConnection();
    
    // Create data channel
    this.dataChannel = this.peerConnection.createDataChannel('fileTransfer');
    this._setupDataChannel();
    
    // Connect to signaling and create room
    signalingService.connect();
    signalingService.createRoom(roomId);
  }

  // Initialize as receiver
  initReceiver(roomId) {
    this.roomId = roomId;
    this.isSender = false;
    
    // Create peer connection
    this._createPeerConnection();
    
    // Set up data channel handler (will be received from sender)
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this._setupDataChannel();
    };
    
    // Connect to signaling and join room
    signalingService.connect();
    signalingService.joinRoom(roomId);
  }

  // Create the peer connection with event handlers
  _createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.config);
    
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalingService.sendIceCandidate(
          this.roomId,
          event.candidate,
          this.remoteUserId
        );
      }
    };
    
    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('Connection state:', state);
      
      if (state === 'connected') {
        if (this.callbacks.onPeerConnected) this.callbacks.onPeerConnected();
      } 
      else if (['disconnected', 'failed', 'closed'].includes(state)) {
        if (this.callbacks.onPeerDisconnected) this.callbacks.onPeerDisconnected();
      }
    };
  }

  // Set up the data channel event handlers
  _setupDataChannel() {
    if (!this.dataChannel) return;
    
    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      if (this.callbacks.onDataChannelOpen) this.callbacks.onDataChannelOpen();
    };
    
    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      if (this.callbacks.onDataChannelClose) this.callbacks.onDataChannelClose();
    };
    
    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      if (this.callbacks.onDataChannelError) this.callbacks.onDataChannelError(error);
    };
    
    this.dataChannel.onmessage = (event) => {
      if (this.callbacks.onMessage) this.callbacks.onMessage(event.data);
    };
  }

  // Create and send WebRTC offer
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      signalingService.sendOffer(this.roomId, offer);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  // Handle received WebRTC offer
  async _handleOffer(offer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      signalingService.sendAnswer(this.roomId, answer, this.remoteUserId);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // Handle received WebRTC answer
  async _handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  // Handle received ICE candidate
  async _handleIceCandidate(candidate) {
    try {
      if (candidate && this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  // Send data through the data channel
  sendData(data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(data);
      return true;
    }
    return false;
  }

  // Send a message (string/JSON)
  sendMessage(message) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    return this.sendData(message);
  }

  // Check if connected to peer
  isConnected() {
    return (
      this.peerConnection &&
      this.dataChannel &&
      this.dataChannel.readyState === 'open'
    );
  }

  // Clean up connections
  cleanup() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteUserId = null;
    this.roomId = null;
    
    signalingService.disconnect();
  }
}

// Export a singleton instance
const webRTCService = new WebRTCService();
export default webRTCService;