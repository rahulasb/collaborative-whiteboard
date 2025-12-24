import React, { useState, useEffect } from 'react';
import Board from './components/Board';

function App() {
  // Simple Room ID logic: check URL path or default to 'general'
  // In a real router setup, we'd use useParams, but for this simple setup:
  const getRoomIdFromUrl = () => {
    const path = window.location.pathname;
    const parts = path.split('/');
    // e.g. /board/123 -> roomId = 123
    return parts.length > 2 && parts[1] === 'board' ? parts[2] : 'general';
  };

  const [roomId, setRoomId] = useState(getRoomIdFromUrl());

  useEffect(() => {
    const handlePopState = () => {
      setRoomId(getRoomIdFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <Board roomId={roomId} />
  );
}

export default App;
