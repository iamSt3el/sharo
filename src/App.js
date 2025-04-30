import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FileSharing from './components/FileSharing';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gray-100 py-8">
        <Routes>
          {/* Home route */}
          <Route path="/" element={<FileSharing />} />
          
          {/* Explicit send mode route */}
          <Route path="/send" element={<FileSharing initialMode="send" />} />
          
          {/* Explicit receive mode route - this is what the QR code will use */}
          <Route path="/receive" element={<FileSharing initialMode="receive" />} />
          
          {/* Redirect any other routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;