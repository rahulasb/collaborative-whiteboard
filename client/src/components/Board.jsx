import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Logo from './Logo';

const Board = ({ roomId }) => {
    const canvasRef = useRef(null);
    const [socket, setSocket] = useState(null);

    // State for UI
    const [color, setColor] = useState('#ffffff');
    const [brushSize, setBrushSize] = useState(5);
    const [cursors, setCursors] = useState({});
    const [userName, setUserName] = useState('');
    const [isJoined, setIsJoined] = useState(false); // Controls modal visibility

    // Refs for Drawing Logic (Mutable values that don't trigger re-renders or effect cleanups)
    const colorRef = useRef(color);
    const brushSizeRef = useRef(brushSize);
    const userNameRef = useRef(userName); // To access current name in event listeners if needed

    // Update refs when state changes
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
    useEffect(() => { userNameRef.current = userName; }, [userName]);

    // Connect to Socket.io ONLY once when joined
    useEffect(() => {
        if (!isJoined) return;

        const serverUrl = import.meta.env.PROD
            ? window.location.origin.replace('5173', '3000')
            : 'http://localhost:3000';

        // In production, we might need a proper URL check
        // If you are deploying the backend separately, replace this with your backend URL
        const s = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');

        setSocket(s);
        s.emit('join-board', roomId);

        return () => {
            s.disconnect();
        };
    }, [roomId, isJoined]);

    // Drawing & Sync Logic
    // DEPENDENCY FIX: Remove color/brushSize from dependencies to prevent canvas reset
    useEffect(() => {
        if (!socket || !isJoined) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size to full window (ONLY ONCE or on Resize)
        const resizeCanvas = () => {
            // Simple check to avoid clearing if size hasn't changed drastically 
            // or just accept resize clears for now (standard behavior), 
            // but the key is NOT to resize on color change.
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Request history again on resize if needed? 
            // For now, let's just resize. The history is better handled by re-requesting or storing off-screen canvas.
            // But since resize clears, we might want to ask server for history again?
            // Let's keep it simple: Resize clears local, but we could re-emit 'join-board' or just ask for history.
            socket.emit('join-board', roomId);
        };

        // Initial resize
        resizeCanvas();

        window.addEventListener('resize', resizeCanvas);
        const ctx = canvas.getContext('2d');

        // --- Helper to draw a line ---
        const drawLine = (x1, y1, x2, y2, strokeColor, strokeWidth) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.closePath();
        };

        // --- Socket Listeners ---
        socket.on('draw-stroke', (data) => {
            const { x1, y1, x2, y2, color, width } = data;
            drawLine(x1, y1, x2, y2, color, width);
        });

        socket.on('load-history', (history) => {
            history.forEach(stroke => {
                drawLine(stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width);
            });
        });

        socket.on('clear-board', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        socket.on('cursor-move', (data) => {
            setCursors(prev => ({
                ...prev,
                [data.userId]: data
            }));
        });

        // --- Mouse Interaction Logic ---
        let drawing = false;
        let lastX = 0;
        let lastY = 0;
        let lastEmit = 0;

        const onMouseDown = (e) => {
            drawing = true;
            lastX = e.clientX;
            lastY = e.clientY;
        };

        const onMouseMove = (e) => {
            const now = Date.now();
            // Emit cursor move
            if (now - lastEmit > 30) {
                socket.emit('cursor-move', {
                    roomId,
                    cursorData: {
                        x: e.clientX,
                        y: e.clientY,
                        name: userNameRef.current || 'Guest'
                    }
                });
            }

            if (!drawing) return;

            const currentX = e.clientX;
            const currentY = e.clientY;
            const currentColor = colorRef.current;
            const currentWidth = brushSizeRef.current;

            // Draw locally
            drawLine(lastX, lastY, currentX, currentY, currentColor, currentWidth);

            // Emit
            socket.emit('draw-stroke', {
                roomId,
                strokeData: {
                    x1: lastX,
                    y1: lastY,
                    x2: currentX,
                    y2: currentY,
                    color: currentColor,
                    width: currentWidth
                }
            });

            lastX = currentX;
            lastY = currentY;
            lastEmit = now;
        };

        const onMouseUp = () => { drawing = false; };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseout', onMouseUp);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mouseout', onMouseUp);

            socket.off('draw-stroke');
            socket.off('load-history');
            socket.off('clear-board');
            socket.off('cursor-move');
        };
    }, [socket, roomId]); // REMOVED color and brushSize from dependency array

    const clearBoard = () => {
        if (socket) socket.emit('clear-board', roomId);
    };

    const handleJoin = (e) => {
        e.preventDefault();
        if (userName.trim()) setIsJoined(true);
    };

    return (
        <div className="canvas-container">

            {/* Branding Header */}
            <div className="branding-header">
                <Logo />
                <div className="title-group">
                    <h1>Collaborative Board</h1>
                    <div className="subtitle">Real-time Sync</div>
                </div>
            </div>

            {/* Welcome Modal */}
            {!isJoined && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Join Whiteboard</h2>
                        <form onSubmit={handleJoin}>
                            <input
                                type="text"
                                className="name-input"
                                placeholder="Enter your name"
                                value={userName}
                                onChange={e => setUserName(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="join-btn">Start Drawing</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Advanced Toolbar */}
            <div className="toolbar">
                <div className="colors-group">
                    {['#ffffff', '#ff3b30', '#4cd964', '#007aff', '#ffcc00', '#ff2d55', '#5856d6'].map(c => (
                        <div
                            key={c}
                            className={`color-btn ${color === c ? 'active' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setColor(c)}
                        />
                    ))}
                </div>

                <div className="tools-group">
                    <input
                        type="range"
                        min="2"
                        max="20"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        title="Brush Size"
                    />
                    <button className="clear-btn" onClick={clearBoard}>Clear</button>
                </div>
            </div>

            <canvas ref={canvasRef} />

            {/* Cursors */}
            {Object.values(cursors).map(cursor => (
                cursor.userId !== socket?.id && ( // Don't show own cursor
                    <div
                        key={cursor.userId}
                        className="cursor-pointer"
                        style={{
                            transform: `translate(${cursor.x}px, ${cursor.y}px)`
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19177L11.7841 12.3673H5.65376Z" fill={cursor.color || "#FE2C55"} stroke="white" />
                        </svg>
                        <span className="cursor-label">{cursor.name}</span>
                    </div>
                )
            ))}

            {/* Author Footer */}
            <div className="author-footer">
                Designed by <a href="https://www.linkedin.com/in/rahul-adhini-satheesh-babu-4b3aa3285/" target="_blank" rel="noopener noreferrer">Rahul Adhini</a> © 2025
            </div>
        </div>
    );
};

export default Board;
