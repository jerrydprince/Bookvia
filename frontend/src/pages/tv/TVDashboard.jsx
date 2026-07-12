import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Film, Info, Utensils, ConciergeBell, Shirt, Wrench, Sparkles, Dumbbell, Waves, Map, CloudSun, Tag, MessageSquare, Receipt, LogOut } from 'lucide-react';

const tiles = [
  { id: 'live-tv', title: 'Live TV', icon: Play, color: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/40 focus:bg-red-500/40 focus:ring-red-400', colSpan: 2, rowSpan: 2, bgImage: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=600&auto=format&fit=crop' },
  { id: 'movies', title: 'Movies', icon: Film, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/40 focus:bg-purple-500/40 focus:ring-purple-400', colSpan: 2, rowSpan: 1 },
  { id: 'room-service', title: 'Room Service', icon: Utensils, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/40 focus:bg-orange-500/40 focus:ring-orange-400', colSpan: 1, rowSpan: 1 },
  { id: 'hotel-info', title: 'Hotel Info', icon: Info, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/40 focus:bg-blue-500/40 focus:ring-blue-400', colSpan: 1, rowSpan: 1 },
  { id: 'spa', title: 'Spa & Wellness', icon: Sparkles, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/40 focus:bg-pink-500/40 focus:ring-pink-400', colSpan: 1, rowSpan: 1 },
  { id: 'gym', title: 'Fitness Center', icon: Dumbbell, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/40 focus:bg-gray-500/40 focus:ring-gray-400', colSpan: 1, rowSpan: 1 },
  { id: 'pool', title: 'Swimming Pool', icon: Waves, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/40 focus:bg-cyan-500/40 focus:ring-cyan-400', colSpan: 1, rowSpan: 1 },
  { id: 'housekeeping', title: 'Housekeeping', icon: ConciergeBell, color: 'bg-teal-500/20 text-teal-400 border-teal-500/30 hover:bg-teal-500/40 focus:bg-teal-500/40 focus:ring-teal-400', colSpan: 1, rowSpan: 1 },
  { id: 'laundry', title: 'Laundry', icon: Shirt, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/40 focus:bg-indigo-500/40 focus:ring-indigo-400', colSpan: 1, rowSpan: 1 },
  { id: 'maintenance', title: 'Maintenance', icon: Wrench, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/40 focus:bg-yellow-500/40 focus:ring-yellow-400', colSpan: 1, rowSpan: 1 },
  { id: 'attractions', title: 'Local Attractions', icon: Map, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/40 focus:bg-emerald-500/40 focus:ring-emerald-400', colSpan: 1, rowSpan: 1 },
  { id: 'promotions', title: 'Promotions', icon: Tag, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/40 focus:bg-rose-500/40 focus:ring-rose-400', colSpan: 1, rowSpan: 1 },
  { id: 'messages', title: 'Messages', icon: MessageSquare, color: 'bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/40 focus:bg-sky-500/40 focus:ring-sky-400', colSpan: 1, rowSpan: 1 },
  { id: 'bill', title: 'View Bill', icon: Receipt, color: 'bg-lime-500/20 text-lime-400 border-lime-500/30 hover:bg-lime-500/40 focus:bg-lime-500/40 focus:ring-lime-400', colSpan: 1, rowSpan: 1 },
  { id: 'checkout', title: 'Express Checkout', icon: LogOut, color: 'bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 focus:bg-zinc-700 focus:ring-zinc-400', colSpan: 2, rowSpan: 1 },
];

const TVDashboard = () => {
  const { room_id } = useParams();
  const firstTileRef = useRef(null);
  const [activeTile, setActiveTile] = useState(null);
  const [viewState, setViewState] = useState(null); // null, 'media', 'overlay'
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  useEffect(() => {
    if (firstTileRef.current && !viewState) {
      firstTileRef.current.focus();
    }
  }, [viewState]);

  const handleTileClick = (tile) => {
    setActiveTile(tile);
    if (tile.id === 'live-tv' || tile.id === 'movies') {
      setViewState('media');
    } else {
      setViewState('overlay');
      setActionSuccess(false);
    }
  };

  const closeView = () => {
    setViewState(null);
    setActiveTile(null);
    setActionSuccess(false);
  };

  const handleServiceRequest = async () => {
    setLoadingAction(true);
    // In a real app, this would post to a /api/services endpoint
    // We will simulate a network delay and then show success.
    setTimeout(() => {
      setLoadingAction(false);
      setActionSuccess(true);
    }, 1500);
  };

  if (viewState === 'media') {
    return (
      <div className="absolute inset-0 z-50 bg-black flex flex-col">
        {/* Mock Video Player Header */}
        <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center opacity-0 hover:opacity-100 transition-opacity absolute top-0 w-full z-10">
          <div className="text-white text-xl font-bold">{activeTile.title} Stream</div>
          <button 
            autoFocus
            onClick={closeView}
            className="bg-white/20 hover:bg-white/40 focus:bg-white/40 focus:outline-none focus:ring-4 focus:ring-white px-4 py-2 rounded-lg text-white font-medium backdrop-blur-md"
          >
            Back to Dashboard (Press OK)
          </button>
        </div>
        
        {/* Mock Stream Area */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
           {activeTile.id === 'live-tv' ? (
             <img src="https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=1920&auto=format&fit=crop" className="w-full h-full object-cover opacity-60" alt="Live TV" />
           ) : (
             <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920&auto=format&fit=crop" className="w-full h-full object-cover opacity-60" alt="Movies" />
           )}
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="text-center">
               <Play className="w-24 h-24 text-white/50 mx-auto mb-4" />
               <p className="text-white/70 text-2xl font-light tracking-wider">Streaming Placeholder</p>
               <p className="text-white/40 text-sm mt-2">Replace with HLS/M3U8 Web Player</p>
             </div>
           </div>
        </div>
      </div>
    );
  }

  if (viewState === 'overlay') {
    return (
      <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-12">
        <div className="bg-dark-800 border border-dark-600 rounded-3xl p-10 max-w-2xl w-full text-center shadow-2xl relative">
          <activeTile.icon className="w-20 h-20 text-brand-500 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-4">{activeTile.title}</h2>
          
          <div className="text-gray-300 text-lg mb-10">
            {activeTile.id === 'housekeeping' && "Would you like to request room cleaning service?"}
            {activeTile.id === 'laundry' && "Would you like to request laundry pickup? A staff member will arrive shortly."}
            {activeTile.id === 'maintenance' && "Are you experiencing an issue in your room? Request maintenance assistance."}
            {activeTile.id === 'room-service' && "Browse our digital menu and order in-room dining directly to your door."}
            {activeTile.id === 'checkout' && "Are you sure you want to process an express checkout? Your final folio will be emailed to you."}
            {activeTile.id === 'bill' && "Your current balance is 0 NGN. Everything is settled!"}
            {['hotel-info', 'spa', 'gym', 'pool', 'attractions', 'promotions'].includes(activeTile.id) && "Operating Hours: 6:00 AM - 10:00 PM. Dial 0 for reservations and details."}
            {activeTile.id === 'messages' && "You have no new messages from the front desk."}
          </div>

          {actionSuccess ? (
            <div className="bg-green-500/20 text-green-400 p-4 rounded-xl mb-8 border border-green-500/30">
              Request submitted successfully!
            </div>
          ) : null}

          <div className="flex justify-center gap-4">
            {['housekeeping', 'laundry', 'maintenance', 'checkout'].includes(activeTile.id) && !actionSuccess && (
              <button
                autoFocus
                onClick={handleServiceRequest}
                disabled={loadingAction}
                className="bg-brand-600 hover:bg-brand-500 focus:bg-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-400 px-8 py-3 rounded-xl text-white font-bold text-lg transition-all"
              >
                {loadingAction ? 'Processing...' : 'Confirm Request'}
              </button>
            )}
            <button
              autoFocus={!['housekeeping', 'laundry', 'maintenance', 'checkout'].includes(activeTile.id) || actionSuccess}
              onClick={closeView}
              className="bg-dark-700 hover:bg-dark-600 focus:bg-dark-600 focus:outline-none focus:ring-4 focus:ring-gray-400 px-8 py-3 rounded-xl text-white font-bold text-lg transition-all"
            >
              {actionSuccess ? 'Back to Dashboard' : 'Cancel / Close'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden pr-4 custom-scrollbar pb-12">

      <div className="grid grid-cols-6 gap-4 auto-rows-[140px]">
        {tiles.map((tile, index) => (
          <button
            key={tile.id}
            ref={index === 0 ? firstTileRef : null}
            onClick={() => handleTileClick(tile)}
            className={`
              relative group overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300
              flex flex-col items-center justify-center text-center p-6 outline-none focus:ring-4 focus:scale-[1.02] hover:scale-[1.02]
              ${tile.color}
            `}
            style={{
              gridColumn: `span ${tile.colSpan}`,
              gridRow: `span ${tile.rowSpan}`
            }}
          >
            {tile.bgImage && (
              <div className="absolute inset-0 z-0">
                <img src={tile.bgImage} className="w-full h-full object-cover opacity-40 group-focus:opacity-60 transition-opacity" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              </div>
            )}
            
            <div className="relative z-10 flex flex-col items-center gap-3">
              <tile.icon className={`${tile.rowSpan === 2 ? 'w-16 h-16 mb-2' : 'w-10 h-10'} group-focus:scale-110 transition-transform duration-300`} />
              <span className={`font-semibold ${tile.rowSpan === 2 ? 'text-3xl' : 'text-lg'}`}>{tile.title}</span>
            </div>
            
            <div className="absolute inset-0 border-2 border-white/0 group-focus:border-white/50 rounded-2xl transition-colors pointer-events-none"></div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TVDashboard;
