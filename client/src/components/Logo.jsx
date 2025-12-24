import React from 'react';

const Logo = () => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="url(#paint0_linear)" />
        <path d="M30 70C30 70 35 30 50 30C65 30 70 70 70 70" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 50H70" stroke="white" strokeWidth="6" strokeLinecap="round" />
        <circle cx="50" cy="30" r="8" fill="white" />
        <circle cx="30" cy="70" r="8" fill="white" />
        <circle cx="70" cy="70" r="8" fill="white" />
        <defs>
            <linearGradient id="paint0_linear" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#007AFF" />
                <stop offset="1" stopColor="#5856D6" />
            </linearGradient>
        </defs>
    </svg>
);

export default Logo;
