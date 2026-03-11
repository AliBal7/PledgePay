import { useState, useEffect, useCallback } from 'react';
import { getMe, getStats, getTransactions, changePassword, getArchivedTasks } from '../services/api';

export default function Profile({ onBack }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [changing, setChanging] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userRes, statsRes, txRes, archiveRes] = await Promise.all([
        getMe(), getStats(), getTransactions(), getArchivedTasks()
      ]);
      setUser(userRes.data);
      setStats(statsRes.data);
      setTransactions(txRes.data);
      setArchivedTasks(archiveRes.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChangePassword = async () => {
    if (changing) return;
    setError('');
    if (pwForm.new !== pwForm.confirm) return setError('Yeni şifreler eşleşmiyor');
    if (pwForm.new.length < 6) return setError('Şifre en az 6 karakter olmalı');
    setChanging(true);
    try {
      const res = await changePassword(pwForm.old, pwForm.new);
      setMessage(res.data.message);
      setPwForm({ old: '', new: '', confirm: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
    }
    setChanging(false);
  };

  const tabs = [
    { key: 'stats', label: '📊 İstatistik', mobileLabel: '📊' },
    { key: 'transactions', label: '💰 Geçmiş', mobileLabel: '💰' },
    { key: 'archive', label: `🗂 Arşiv`, mobileLabel: '🗂' },
    { key: 'password', label: '🔒 Güvenlik', mobileLabel: '🔒' },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#0f0f18] text-white safe-bottom">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[300px] sm:w-[400px] h-[200px] sm:h-[300px] rounded-full bg-indigo-600/8 blur-[100px]" />
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      <header className="relative border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all flex-shrink-0">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-sm sm:text-base">Profil</h1>
            <p className="text-zinc-400 text-xs sm:text-sm truncate">{user?.email}</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 flex-shrink-0">
            <span className="text-violet-400 text-base sm:text-lg">◈</span>
            <p className="font-bold text-white text-sm sm:text-base leading-none">{user?.balance} <span className="text-violet-400 font-semibold text-xs sm:text-sm">token</span></p>
          </div>
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

        {/* Kullanıcı kartı */}
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-base sm:text-lg shadow-lg shadow-violet-500/25 flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm sm:text-base">{user?.username}</p>
            <p className="text-zinc-400 text-xs sm:text-sm truncate">{user?.email}</p>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-1 bg-zinc-900/50 border border-zinc-700 rounded-xl p-1 mb-4 sm:mb-6">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${activeTab === tab.key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.mobileLabel}</span>
            </button>
          ))}
        </div>

        {/* İstatistikler */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { label: 'Toplam Görev', value: stats.total_tasks, color: 'text-white' },
                { label: 'Başarı Oranı', value: `${stats.success_rate}%`, color: 'text-violet-400' },
                { label: 'Tamamlanan', value: stats.completed, color: 'text-emerald-400' },
                { label: 'Başarısız', value: stats.failed, color: 'text-red-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 sm:p-4 hover:border-zinc-600 transition-all">
                  <p className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 sm:p-4 flex justify-between items-center">
              <span className="text-zinc-400 text-sm sm:text-base">Aktif Görevler</span>
              <span className="font-bold text-violet-400 text-sm sm:text-base">{stats.active}</span>
            </div>
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 sm:p-4">
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <span className="text-zinc-400 text-xs sm:text-sm">Başarı Oranı</span>
                <span className="text-white text-xs sm:text-sm font-semibold">{stats.success_rate}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.success_rate}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Token Geçmişi */}
        {activeTab === 'transactions' && (
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl overflow-hidden">
            {transactions.length === 0 ? (
              <div className="text-center py-10 sm:py-12">
                <p className="text-3xl mb-2">💰</p>
                <p className="text-zinc-500 text-sm">Henüz işlem yok</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-700/50">
                {transactions.map(tx => (
                  <div key={tx.id} className="px-4 sm:px-5 py-3 sm:py-4 flex justify-between items-center hover:bg-zinc-700/20 transition-all">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm sm:text-base text-white truncate">{tx.description}</p>
                      <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`font-bold text-sm sm:text-base flex-shrink-0 ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Arşiv */}
        {activeTab === 'archive' && (
          <div>
            {archivedTasks.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <p className="text-3xl sm:text-4xl mb-3">🗂</p>
                <p className="text-zinc-500 text-sm">Arşivlenmiş görev yok</p>
                <p className="text-zinc-600 text-xs mt-1">Tamamlanan veya başarısız görevler buraya gelir</p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivedTasks.map(task => (
                  <div key={task.id} className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-4 sm:p-5 opacity-70">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-bold text-white text-sm sm:text-base">{task.title}</h3>
                      <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-lg font-semibold border whitespace-nowrap ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {task.status === 'completed' ? '✓ Tamamlandı' : '✗ Başarısız'}
                      </span>
                    </div>
                    {task.description && <p className="text-zinc-400 text-xs sm:text-sm mb-2">{task.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <span className="text-violet-400">◈</span> {task.stake_amount} token
                      </span>
                      <span>⏰ {new Date(task.deadline).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                      <span>{task.verification_method === 'gps' ? '📍 GPS' : '✋ Manuel'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Şifre Değiştir */}
        {activeTab === 'password' && (
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-4 sm:p-6">
            <h2 className="text-sm sm:text-base font-bold text-white mb-4 sm:mb-5">Şifre Değiştir</h2>
            <div className="space-y-3 sm:space-y-4">
              {[
                { key: 'old', placeholder: 'Mevcut şifre', label: 'Mevcut Şifre' },
                { key: 'new', placeholder: 'Yeni şifre (min 6 karakter)', label: 'Yeni Şifre' },
                { key: 'confirm', placeholder: 'Yeni şifre tekrar', label: 'Tekrar' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">{field.label}</label>
                  <input type="password" placeholder={field.placeholder}
                    value={pwForm[field.key]}
                    onChange={(e) => setPwForm({ ...pwForm, [field.key]: e.target.value })}
                    className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all" />
                </div>
              ))}
              <button onClick={handleChangePassword} disabled={changing}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-lg shadow-violet-500/20 disabled:opacity-50 active:scale-[0.98]">
                {changing ? '⏳ Güncelleniyor...' : 'Şifreyi Güncelle →'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}