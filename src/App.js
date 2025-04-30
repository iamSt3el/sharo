// App.js with React Router
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FileSharing from './components/FileSharing';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="App min-h-screen bg-gray-100 py-8">
        <Routes>
          {/* Home route */}
          <Route path="/" element={<FileSharing />} />
          
          {/* Explicit send route */}
          <Route path="/send" element={<FileSharing initialMode="send" />} />
          
          {/* Explicit receive route - this handles QR code scans */}
          <Route path="/receive" element={<FileSharing initialMode="receive" />} />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;