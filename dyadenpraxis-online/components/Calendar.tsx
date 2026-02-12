import React from 'react';
import { CalendarEvent } from '../types';
import { Calendar as CalendarIcon, Clock, Users } from 'lucide-react';

const Calendar: React.FC = () => {
  const events: CalendarEvent[] = [
    { id: '1', title: 'Morgen-Dyade', date: 'Heute', time: '07:00 - 07:45', attendees: 12 },
    { id: '2', title: 'Abend-Kontemplation', date: 'Heute', time: '20:00 - 20:45', attendees: 28 },
    { id: '3', title: 'Global Dyad (EN)', date: 'Morgen', time: '18:00 - 19:00', attendees: 156 },
    { id: '4', title: 'Stille Begegnung', date: 'Morgen', time: '20:00 - 20:45', attendees: 8 },
  ];

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto fade-in">
      <header className="mb-8">
        <h2 className="text-3xl font-serif text-slate-800 mb-2">Kalender</h2>
        <p className="text-slate-500 font-light">Plane deine achtsamen Begegnungen.</p>
      </header>

      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium tracking-wide mb-2">
                  {event.date}
                </span>
                <h3 className="text-xl font-serif text-slate-800 group-hover:text-slate-600 transition-colors">{event.title}</h3>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <CalendarIcon className="w-5 h-5" />
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{event.attendees} Teilnehmer</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button className="mt-8 w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-medium hover:border-slate-300 hover:text-slate-600 transition-all">
        + Eigene Session planen
      </button>
    </div>
  );
};

export default Calendar;
