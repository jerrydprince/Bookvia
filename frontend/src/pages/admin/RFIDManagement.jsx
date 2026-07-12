import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Assuming standard supabase client location
import { CheckCircle, AlertTriangle, Key, Trash2, RefreshCw, Plus, Clock, Search, History, Tv, Smartphone } from 'lucide-react';

const RFIDManagement = () => {
  const [activeTab, setActiveTab] = useState('issue');
  const [activeCards, setActiveCards] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeBookings, setActiveBookings] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Form states for issuing
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [cardType, setCardType] = useState('guest');
  const [validDays, setValidDays] = useState(1);
  const [encodingStatus, setEncodingStatus] = useState(null); // null, 'encoding', 'success', 'error'

  useEffect(() => {
    fetchActiveBookings();
    fetchRooms();
    if (activeTab === 'manage') fetchActiveCards();
    if (activeTab === 'logs') fetchAuditLogs();
  }, [activeTab]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase.from('rooms').select('id, room_number').order('room_number');
      if (!error && data) setRooms(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          check_in_date,
          check_out_date,
          room_id,
          guest_id,
          profiles:guest_id(first_name, last_name),
          rooms:room_id(room_number)
        `)
        .in('status', ['checked_in', 'confirmed'])
        .order('check_in_date');
      if (!error && data) setActiveBookings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveCards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('keycards')
        .select('*, rooms(room_number), profiles:guest_id(first_name, last_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (!error && data) setActiveCards(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_access_logs')
        .select('*, keycards(rfid_uid, card_type), door_locks(vendor, rooms(room_number))')
        .order('event_time', { ascending: false })
        .limit(50);
      if (!error && data) setAuditLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const mockUSBEncode = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`UID-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
      }, 1500);
    });
  };

  const handleIssueCard = async (e) => {
    e.preventDefault();
    let guestIdToInsert = null;
    let roomIdToInsert = null;
    let validToInsert = new Date();

    if (cardType === 'guest') {
      if (!selectedBookingId) {
        alert("Please select a booking for the guest card.");
        return;
      }
      const booking = activeBookings.find(b => b.id === selectedBookingId);
      if (booking) {
        guestIdToInsert = booking.guest_id;
        roomIdToInsert = booking.room_id;
        validToInsert = new Date(booking.check_out_date);
      }
    } else {
      roomIdToInsert = selectedRoom || null;
      validToInsert.setDate(validToInsert.getDate() + parseInt(validDays));
    }

    setEncodingStatus('encoding');

    try {
      const newUid = await mockUSBEncode();
      const validFrom = new Date();

      const { error } = await supabase.from('keycards').insert([{
        rfid_uid: newUid,
        card_type: cardType,
        room_id: roomIdToInsert,
        guest_id: guestIdToInsert,
        valid_from: validFrom.toISOString(),
        valid_to: validToInsert.toISOString(),
        status: 'active'
      }]);

      if (error) throw error;

      setEncodingStatus('success');
      setTimeout(() => setEncodingStatus(null), 3000);
      
    } catch (err) {
      console.error(err);
      setEncodingStatus('error');
      setTimeout(() => setEncodingStatus(null), 3000);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this card?")) return;
    try {
      await supabase.from('keycards').update({ status: 'revoked' }).eq('id', id);
      fetchActiveCards();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-gray-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-brand-500" />
            Key Card Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">Issue, manage, and audit RFID key cards for rooms and staff.</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl shadow-lg border border-dark-700 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-dark-700 bg-dark-800/50">
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'issue' ? 'border-brand-500 text-brand-400 bg-dark-800' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-dark-700/50'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Issue New Card
            </div>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manage' ? 'border-brand-500 text-brand-400 bg-dark-800' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-dark-700/50'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Key className="w-4 h-4" /> Active Cards
            </div>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-brand-500 text-brand-400 bg-dark-800' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-dark-700/50'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <History className="w-4 h-4" /> Access Logs
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* ISSUE CARD TAB */}
          {activeTab === 'issue' && (
            <div className="max-w-xl mx-auto">
              <form onSubmit={handleIssueCard} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Card Type</label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="guest">Guest Room Card</option>
                    <option value="master">Master Card</option>
                    <option value="housekeeping">Housekeeping</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                {cardType === 'guest' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Select Guest Booking</label>
                    <select
                      value={selectedBookingId}
                      onChange={(e) => setSelectedBookingId(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:ring-brand-500 focus:border-brand-500"
                    >
                      <option value="">Select an active booking...</option>
                      {activeBookings.map(b => (
                        <option key={b.id} value={b.id}>
                          Room {b.rooms?.room_number || '?'} - {b.profiles?.first_name} {b.profiles?.last_name} (Checkout: {new Date(b.check_out_date).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {cardType !== 'guest' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Target Room (Optional)</label>
                      <select
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:ring-brand-500 focus:border-brand-500"
                      >
                        <option value="">No specific room (Master Access)</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>Room {r.room_number}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Validity (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={validDays}
                        onChange={(e) => setValidDays(e.target.value)}
                        className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                  </>
                )}

                <div className="bg-brand-900/30 border border-brand-500/30 rounded-lg p-4 flex gap-3">
                  <Smartphone className="w-5 h-5 text-brand-400 flex-shrink-0" />
                  <div className="text-sm text-gray-300">
                    <strong className="text-brand-300">USB Encoder Required.</strong> Place a blank MIFARE/RFID card on the encoder pad before issuing.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={encodingStatus === 'encoding'}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {encodingStatus === 'encoding' ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Encoding Card...</>
                  ) : (
                    <><Key className="w-5 h-5" /> Issue Key Card</>
                  )}
                </button>

                {encodingStatus === 'success' && (
                  <div className="p-4 bg-green-900/30 border border-green-500/30 text-green-400 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Card encoded and issued successfully.
                  </div>
                )}
                {encodingStatus === 'error' && (
                  <div className="p-4 bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Error communicating with USB Encoder.
                  </div>
                )}
              </form>
            </div>
          )}

          {/* MANAGE CARDS TAB */}
          {activeTab === 'manage' && (
            <div>
              {loading ? (
                <div className="text-center py-10 text-gray-400">Loading cards...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-dark-800/80 border-b border-dark-600 text-xs uppercase tracking-wider text-gray-400">
                        <th className="p-4 font-medium">Card UID</th>
                        <th className="p-4 font-medium">Type</th>
                        <th className="p-4 font-medium">Room</th>
                        <th className="p-4 font-medium">Valid Until</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {activeCards.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-gray-400">No active cards found.</td>
                        </tr>
                      ) : (
                        activeCards.map(card => (
                          <tr key={card.id} className="hover:bg-dark-800/50 transition-colors">
                            <td className="p-4 text-sm font-mono text-gray-300">{card.rfid_uid}</td>
                            <td className="p-4 text-sm capitalize">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${card.card_type === 'master' ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30' : 'bg-brand-900/30 text-brand-300 border border-brand-500/30'}`}>
                                {card.card_type}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-gray-200">{card.rooms?.room_number || '-'}</td>
                            <td className="p-4 text-sm text-gray-400">{new Date(card.valid_to).toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleRevoke(card.id)}
                                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                title="Revoke Card"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'logs' && (
            <div>
              {loading ? (
                <div className="text-center py-10 text-gray-400">Loading logs...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-dark-800/80 border-b border-dark-600 text-xs uppercase tracking-wider text-gray-400">
                        <th className="p-4 font-medium">Time</th>
                        <th className="p-4 font-medium">Card (UID)</th>
                        <th className="p-4 font-medium">Door/Room</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-gray-400">No access events recorded.</td>
                        </tr>
                      ) : (
                        auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-dark-800/50 transition-colors">
                            <td className="p-4 text-sm text-gray-400">{new Date(log.event_time).toLocaleString()}</td>
                            <td className="p-4 text-sm font-mono text-gray-300">
                              {log.keycards?.rfid_uid} <br/>
                              <span className="text-xs text-gray-500 capitalize">{log.keycards?.card_type}</span>
                            </td>
                            <td className="p-4 text-sm text-gray-200">{log.door_locks?.rooms?.room_number || 'Main Entrance'}</td>
                            <td className="p-4 text-sm">
                              <span className={`flex items-center gap-1 ${log.access_status === 'granted' ? 'text-green-400' : 'text-red-400'}`}>
                                {log.access_status === 'granted' ? <CheckCircle className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                                <span className="capitalize font-medium">{log.access_status}</span>
                              </span>
                            </td>
                            <td className="p-4 text-sm text-gray-500">{log.denial_reason || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RFIDManagement;
