import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MapPin, History } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { User } from '../types';
import { calculateRelevanceScore } from '../utils/searchUtils';

export default function TheYard() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error('Expected array of users, got:', data);
      }
    })
    .catch(console.error);
  }, [token]);

  const handleSendKite = async (receiverId: string, name: string) => {
    const content = prompt(`Send a kite to ${name}:`);
    if (!content) return;
    
    try {
      await fetch('/api/kites', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId, content })
      });
      alert('Kite sent successfully! Check your Kites tab to view the conversation.');
    } catch (err) {
      alert('Failed to send kite.');
    }
  };

  const filteredUsers = users
    .map(u => ({
      ...u,
      relevance: calculateRelevanceScore(u, search, {
        name: 3,
        history: 2, // facility
        location: 2,
        bio: 1
      })
    }))
    .filter(u => search.trim() === '' || u.relevance > 0)
    .sort((a, b) => {
      if (search.trim() === '') return 0; // Keep original order if no search
      return b.relevance - a.relevance;
    });

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <h2 className="text-6xl font-serif italic tracking-tighter">The Yard</h2>
        <p className="text-xl opacity-60 max-w-2xl">
          Find the people you walked the line with. Search by facility, name, or location.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by facility (e.g. San Quentin), name, or state..."
          className="w-full bg-white border border-[#141414] py-6 pl-14 pr-6 text-xl focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredUsers.length === 0 && (
          <div className="col-span-full p-8 text-center opacity-60 border border-dashed border-[#141414]">
            No users found. Be the first to invite your brothers.
          </div>
        )}
        {filteredUsers.map((user, idx) => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white border border-[#141414] p-8 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-3xl font-serif italic mb-1">{user.name}</h3>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-60">
                  <MapPin size={12} />
                  {user.location || 'Unknown Location'}
                </div>
              </div>
              <button className="p-3 border border-current rounded-full hover:bg-white hover:text-[#141414] transition-colors">
                <UserPlus size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-mono">
                <History size={16} className="opacity-40" />
                <span className="opacity-60">Facility:</span>
                <span>{user.history || 'Not specified'}</span>
              </div>
              <p className="text-sm leading-relaxed opacity-80">
                "{user.bio || 'No bio provided.'}"
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-current/10 flex gap-4">
              <button 
                onClick={() => handleSendKite(user.id, user.name)}
                className="text-xs uppercase tracking-widest font-bold hover:underline"
              >
                Send Kite
              </button>
              <button className="text-xs uppercase tracking-widest font-bold hover:underline">View Profile</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
