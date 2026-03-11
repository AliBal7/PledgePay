import { useState, useEffect, useCallback } from 'react';
import { getMe, getNotifications, markNotificationRead, markAllNotificationsRead, joinGroup } from '../services/api';

export default function Notifications({ onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [, notifRes] = await Promise.all([getMe(), getNotifications()]);
      setNotifications(notifRes.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleAcceptInvite = async (notification) => {
    try {
      const parsedData = JSON.parse(notification.data);
      const res = await joinGroup(parsedData.invite_code);
      setMessage(res.data.message);
      await markNotificationRead(notification.id);
      loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
      setTimeout(() => setError(''), 4000);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const notifIcon = (type) => {
    if (type === 'group_invite') return '📨';
    if (type === 'group_join') return '👥';
    if (type === 'group_result') return '🏆';
    return '🔔';
  };

  const notifBorder = (type, is_read) => {
    if (is_read) return 'border-zinc-700';
    if (type === 'group_invite') return 'border-violet-500/40';
    if (type === 'group_result') return 'border-emerald-500/30';
    return 'border-zinc-600';
  };

  return (
    <div className="min-h-[100dvh] bg-[#0f0f18] text-white safe-bottom">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[300px] sm:w-[400px] h-[200px] sm:h-[300px] rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      <header className="relative border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all flex-shrink-0">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-sm sm:text-base">Bildirimler</h1>
            <p className="text-zinc-400 text-xs sm:text-sm">{unreadCount > 0 ? `${unreadCount} okunmamış` : 'Tümü okundu'}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleReadAll}
              className="text-xs sm:text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors flex-shrink-0 active:scale-95">
              Tümünü Oku
            </button>
          )}
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {message && (
          <div className="mb-4 sm:mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <span>✓</span> {message}
          </div>
        )}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <span>!</span> {error}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <p className="text-3xl sm:text-4xl mb-3">🔔</p>
            <p className="text-zinc-500 text-sm">Henüz bildirim yok</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {notifications.map(notif => (
              <div key={notif.id}
                onClick={() => !notif.is_read && handleRead(notif.id)}
                className={`bg-zinc-800/60 border rounded-2xl p-3.5 sm:p-5 transition-all ${notifBorder(notif.type, notif.is_read)} ${!notif.is_read ? 'cursor-pointer hover:border-zinc-600' : 'opacity-60'}`}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0 ${!notif.is_read ? 'bg-violet-500/20' : 'bg-zinc-700/50'}`}>
                    {notifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <h3 className={`font-bold text-sm sm:text-base truncate ${notif.is_read ? 'text-zinc-400' : 'text-white'}`}>{notif.title}</h3>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">{notif.message}</p>
                    <p className="text-zinc-600 text-xs mt-1.5 sm:mt-2">
                      {new Date(notif.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {notif.type === 'group_invite' && !notif.is_read && (
                      <div className="flex gap-2 mt-2.5 sm:mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAcceptInvite(notif); }}
                          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-all active:scale-95">
                          ✓ Kabul Et
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRead(notif.id); }}
                          className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-all active:scale-95">
                          Reddet
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}