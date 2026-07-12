import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowRight, Search, Users, DollarSign, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCachedData, setCachedData } from '../utils/cache';

const Apartments = () => {
  const cachedRooms = getCachedData('rooms');
  const [rooms, setRooms] = useState(cachedRooms || []);
  const [loading, setLoading] = useState(!cachedRooms);

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityFilter, setCapacityFilter] = useState('all');
  const [priceSort, setPriceSort] = useState('default');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, capacityFilter, priceSort]);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase.from('rooms').select('id, name, type, capacity, size_sqm, base_price_ngn, image_url, status, amenities').order('name');
      if (data) {
        setRooms(data);
        setCachedData('rooms', data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-dark-900 w-full text-white pb-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 pt-10">
          <h4 className="text-gold-500 font-medium tracking-widest uppercase mb-4">Our Portfolio</h4>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">All Apartments</h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Explore our complete collection of premium apartments, designed for ultimate comfort and luxury.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-dark-800/80 backdrop-blur-md border border-dark-700 p-4 rounded-xl mb-10 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
              <Search size={18} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, type or amenities..."
              className="w-full bg-dark-900 text-white border border-dark-700 rounded-lg pl-11 pr-4 py-3 focus:border-gold-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
            <div className="relative w-full sm:w-48">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <Users size={16} />
              </span>
              <select
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value)}
                className="w-full bg-dark-900 text-white border border-dark-700 rounded-lg pl-10 pr-10 py-3 appearance-none focus:border-gold-500 outline-none cursor-pointer"
              >
                <option value="all">Any Capacity</option>
                <option value="1">1+ Guests</option>
                <option value="2">2+ Guests</option>
                <option value="4">4+ Guests</option>
                <option value="6">6+ Guests</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                <Filter size={14} />
              </div>
            </div>

            <div className="relative w-full sm:w-48">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <DollarSign size={16} />
              </span>
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value)}
                className="w-full bg-dark-900 text-white border border-dark-700 rounded-lg pl-10 pr-10 py-3 appearance-none focus:border-gold-500 outline-none cursor-pointer"
              >
                <option value="default">Sort by Price</option>
                <option value="asc">Price: Low to High</option>
                <option value="desc">Price: High to Low</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                <Filter size={14} />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading residences...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(() => {
                const filteredRooms = rooms
                  .filter(room => {
                    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      room.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (room.amenities && room.amenities.some(a => a.toLowerCase().includes(searchTerm.toLowerCase())));
                    const matchesCapacity = capacityFilter === 'all' || room.capacity >= parseInt(capacityFilter);
                    return matchesSearch && matchesCapacity;
                  })
                  .sort((a, b) => {
                    if (priceSort === 'asc') return Number(a.base_price_ngn) - Number(b.base_price_ngn);
                    if (priceSort === 'desc') return Number(b.base_price_ngn) - Number(a.base_price_ngn);
                    return 0; // default order
                  });

                const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedRooms = filteredRooms.slice(startIndex, startIndex + itemsPerPage);

                if (paginatedRooms.length === 0) {
                  return (
                    <div className="col-span-full py-16 text-center text-gray-400">
                      <p className="text-xl">No apartments match your search criteria.</p>
                      <button onClick={() => { setSearchTerm(''); setCapacityFilter('all'); setPriceSort('default'); }} className="mt-4 text-gold-500 hover:underline">Clear all filters</button>
                    </div>
                  );
                }

                return (
                  <>
                    {paginatedRooms.map(room => (
                      <div key={room.id} className="bg-dark-800 border border-dark-700 group overflow-hidden flex flex-col h-full rounded-lg shadow-lg hover:shadow-gold-500/10 transition-shadow">
                        <div className="relative h-64 overflow-hidden">
                          {room.image_url ? (
                            <img
                              src={room.image_url}
                              alt={room.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-dark-900 to-black text-center p-4">
                              <span className="text-gold-500 font-serif text-base tracking-widest uppercase">Luxe Residence</span>
                            </div>
                          )}
                          <div className="absolute top-4 right-4 bg-dark-900/90 backdrop-blur-sm px-4 py-2 text-gold-500 font-semibold border border-dark-700 rounded-sm">
                            ₦{Number(room.base_price_ngn).toLocaleString()} <span className="text-sm text-gray-400 font-normal">/ night</span>
                          </div>
                          {room.status === 'occupied' && (
                            <div className="absolute top-4 left-4 bg-red-500/90 backdrop-blur-sm px-3 py-1 text-white text-xs font-bold uppercase tracking-wider rounded-sm">
                              Currently Booked
                            </div>
                          )}
                        </div>
                        <div className="p-6 flex flex-col flex-grow">
                          <Link to={`/room/${room.id}`}>
                            <h3 className="text-2xl font-semibold mb-2 group-hover:text-gold-500 transition-colors text-white">{room.name}</h3>
                          </Link>
                          <div className="flex gap-4 text-sm text-gray-400 mb-6 pb-6 border-b border-dark-700">
                            <span>{room.type}</span>
                            <span>•</span>
                            <span>Up to {room.capacity} Guests</span>
                            <span>•</span>
                            <span>{room.size_sqm} sqm</span>
                          </div>
                          <div className="flex-grow">
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                              {room.amenities ? room.amenities.slice(0, 3).join(' • ') : 'Premium features included'}
                            </p>
                          </div>
                          <div className="flex gap-2 mt-auto">
                            <Link to={`/room/${room.id}`} className="btn-outline flex-1 text-center py-2 text-white border-dark-600 hover:bg-dark-700">
                              View Details
                            </Link>
                            <Link to={`/booking?room=${room.id}`} className="btn-primary flex-1 text-center flex justify-center items-center gap-2">
                              Book Dates <ArrowRight size={16} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="col-span-full mt-12 flex justify-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 border border-dark-700 bg-dark-900 rounded disabled:opacity-50 hover:bg-dark-800 transition-colors text-white"
                        >
                          Previous
                        </button>

                        <div className="flex gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                            // Show first, last, and pages around current page
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`w-10 h-10 flex items-center justify-center rounded border transition-colors ${currentPage === page
                                    ? 'border-gold-500 bg-gold-500/10 text-gold-500 font-bold'
                                    : 'border-dark-700 bg-dark-900 text-gray-400 hover:bg-dark-800 hover:text-white'
                                    }`}
                                >
                                  {page}
                                </button>
                              );
                            } else if (
                              page === currentPage - 2 ||
                              page === currentPage + 2
                            ) {
                              return <span key={page} className="px-1 text-gray-500 flex items-end pb-2">...</span>;
                            }
                            return null;
                          })}
                        </div>

                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 border border-dark-700 bg-dark-900 rounded disabled:opacity-50 hover:bg-dark-800 transition-colors text-white"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Apartments;
