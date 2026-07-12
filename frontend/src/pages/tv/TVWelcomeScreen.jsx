import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wifi, Phone, Clock, CloudSun, Utensils, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Using the standard location

const TVWelcomeScreen = () => {
  const { room_id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOccupied, setIsOccupied] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    const fetchWelcomeData = async () => {
      try {
        const response = await fetch(`/api/iptv/tv/${room_id}/welcome`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setIsOccupied(result.is_occupied);
            setData(result.data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("Backend fetch failed", e);
      }
      
      // Fallback if backend is completely down
      setLoading(false);
      setIsOccupied(false);
    };

    fetchWelcomeData();
  }, [room_id]);

  useEffect(() => {
    if (!loading && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [loading]);

  const handleContinue = () => {
    // Even if vacant, allow accessing the dashboard (e.g., for staff testing)
    navigate(`/tv/${room_id}/dashboard`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-brand-500"></div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (!isOccupied || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <svg className="w-32 h-32 mx-auto mb-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 10 L10 90 L35 90 L60 40 Z" fill="#DF6853"/>
            <path d="M40 90 L90 90 L75 60 L50 90 Z" fill="#DF6853"/>
            <path d="M25 15 L28 25 L38 28 L28 31 L25 41 L22 31 L12 28 L22 25 Z" fill="#DF6853"/>
          </svg>
          <h1 className="text-6xl font-bold text-white mb-6 drop-shadow-lg">Sparkles Apartments</h1>
          <p className="text-2xl text-gray-400 mb-12 max-w-2xl leading-relaxed">
            Welcome to Room {room_id}. The room is currently vacant. Please check in at the front desk to unlock all features.
          </p>
          <button 
            ref={buttonRef}
            onClick={handleContinue}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-dark-800 border border-dark-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-gray-400 hover:bg-dark-700 hover:scale-105"
          >
            Access Guest Menu Anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center max-w-5xl">
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <h2 className="text-4xl font-light text-gray-300 mb-2">{getGreeting()}</h2>
        <h1 className="text-7xl font-bold text-white mb-6 drop-shadow-lg">{data.guest_name}</h1>
        
        <p className="text-2xl text-gray-300 mb-12 max-w-2xl leading-relaxed">
          Welcome to Sparkles Apartments. We are delighted to have you stay with us in Room {data.room_number}.
        </p>

        <div className="grid grid-cols-3 gap-6 mb-12">
          {/* Card 1: Check-out */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center text-brand-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Check-out</div>
              <div className="text-xl font-semibold">{data.check_out_date}</div>
            </div>
          </div>

          {/* Card 2: Wi-Fi */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Wi-Fi: {data.wifi_network}</div>
              <div className="text-xl font-semibold font-mono tracking-widest">{data.wifi_password}</div>
            </div>
          </div>

          {/* Card 3: Weather */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400">
              <CloudSun className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Current Weather</div>
              <div className="text-xl font-semibold">{data.weather.temp} • {data.weather.condition}</div>
            </div>
          </div>
        </div>

        {/* Quick Directory */}
        <div className="flex gap-8 text-gray-300 mb-12">
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
            <Phone className="w-4 h-4 text-brand-400" />
            <span>Reception: Dial 0</span>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
            <Utensils className="w-4 h-4 text-brand-400" />
            <span>Room Service: Dial 8</span>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
            <Info className="w-4 h-4 text-brand-400" />
            <span>Breakfast: 6:30 AM (Ground Floor)</span>
          </div>
        </div>

        <button 
          ref={buttonRef}
          onClick={handleContinue}
          className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-brand-600 font-pj rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-400 focus:bg-brand-500 hover:bg-brand-500 hover:scale-105"
        >
          Press OK to Continue
        </button>
      </div>
    </div>
  );
};

export default TVWelcomeScreen;
