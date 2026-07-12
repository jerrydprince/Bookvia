import React from 'react';
import { Outlet } from 'react-router-dom';

const TVLayout = () => {
  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden select-none" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542314831-c6a4d14d8c85?q=80&w=2070&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/80 backdrop-blur-[2px]"></div>
      
      {/* Content Area */}
      <div className="relative z-10 w-full h-full flex flex-col p-12">
        {/* Top Header / Branding */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10 L10 90 L35 90 L60 40 Z" fill="#DF6853"/>
              <path d="M40 90 L90 90 L75 60 L50 90 Z" fill="#DF6853"/>
              <path d="M25 15 L28 25 L38 28 L28 31 L25 41 L22 31 L12 28 L22 25 Z" fill="#DF6853"/>
            </svg>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white tracking-widest uppercase">Sparkles</span>
              <span className="text-xs text-gray-400 tracking-[0.3em] uppercase">Apartments</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-3xl font-light">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-sm text-gray-400">{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default TVLayout;
