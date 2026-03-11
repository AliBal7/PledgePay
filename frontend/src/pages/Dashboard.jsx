import { useState, useEffect, useCallback } from 'react';
import { getMe, getTasks, createTask, verifyTask, forfeitTask, getGroups, getNotifications, archiveTask } from '../services/api';
import MapPicker from '../components/MapPicker';

export default function Dashboard({ onLogout, onProfile, onGroups, onNotifications }) {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [form, setForm] = useState({
    title: '', description: '', verification_method: 'manual',
    stake_amount: 100, deadline: '', location_lat: null, location_lng: null, location_radius: 200,
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verifying, setVerifying] = useState(null);
  const [confirmForfeit, setConfirmForfeit] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userRes, tasksRes, groupsRes, notifRes] = await Promise.all([getMe(), getTasks(), getGroups(), getNotifications()]);
      setUser(userRes.data);
      setTasks(tasksRes.data);
      setGroups(groupsRes.data);
      setUnreadCount(notifRes.data.filter(n => !n.is_read).length);
    } catch (e) { onLogout(); }
    setPageLoading(false);
  }, [onLogout]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateTask = async () => {
    if (creating) return;
    setError('');
    if (!form.title.trim()) return setError('Görev başlığı gerekli');
    if (!form.deadline) return setError('Deadline gerekli');
    if (form.stake_amount <= 0) return setError('Taahhüt miktarı 0\'dan büyük olmalı');
    if (new Date(form.deadline) <= new Date()) return setError('Deadline bugünden sonra olmalı');
    if (form.verification_method === 'gps' && (!form.location_lat || !form.location_lng)) return setError('GPS görevi için haritadan konum seçmelisin');
    setCreating(true);
    try {
      await createTask(form);
      setShowCreate(false);
      setForm({ title: '', description: '', verification_method: 'manual', stake_amount: 100, deadline: '', location_lat: null, location_lng: null, location_radius: 200 });
      setMessage('Görev oluşturuldu! 🎯');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
    }
    setCreating(false);
  };

  const handleVerify = async (taskId) => {
    if (verifying) return;
    setVerifying(taskId);
    setError('');
    try {
      const task = tasks.find(t => t.id === taskId);
      let lat = 0, lng = 0;
      if (task.verification_method === 'gps') {
        setMessage('📍 Konumun alınıyor...');
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000, enableHighAccuracy: true })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setMessage('');
      }
      const res = await verifyTask(taskId, lat, lng);
      setMessage(res.data.message);
      loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (e) {
      if (e.code === 1) setError('Konum izni reddedildi. Lütfen tarayıcı ayarlarından izin ver.');
      else if (e.code === 3) setError('Konum alınamadı, tekrar dene.');
      else { const detail = e.response?.data?.detail; setError(typeof detail === 'string' ? detail : 'Hata oluştu'); }
      setTimeout(() => setError(''), 5000);
    }
    setVerifying(null);
  };

  const handleForfeit = async (taskId) => {
    try {
      const res = await forfeitTask(taskId);
      setMessage(res.data.message);
      setConfirmForfeit(null);
      loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleArchive = async (taskId) => {
    try {
      await archiveTask(taskId);
      setMessage('Görev arşivlendi 🗂');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
      setTimeout(() => setError(''), 4000);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'active') return t.status === 'active';
    if (activeTab === 'completed') return t.status === 'completed';
    return t.status === 'failed';
  });

  const tabs = [
    { key: 'active', label: 'Aktif', count: tasks.filter(t => t.status === 'active').length },
    { key: 'completed', label: 'Tamamlanan', count: tasks.filter(t => t.status === 'completed').length },
    { key: 'failed', label: 'Başarısız', count: tasks.filter(t => t.status === 'failed').length },
  ];

  const activeGroups = groups.filter(g => g.my_status === 'active');

  if (pageLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f0f18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-violet-500/30 animate-pulse">P</div>
          <div className="flex items-center gap-2 text-zinc-400">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0f0f18] text-white safe-bottom">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[300px] sm:w-[500px] h-[200px] sm:h-[300px] rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      {/* Header */}
      <header className="relative border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-sm sm:text-base shadow-lg shadow-violet-500/25">P</div>
            <div>
              <span className="font-bold text-white text-sm sm:text-base">PledgePay</span>
              <p className="text-zinc-400 text-xs sm:text-sm hidden sm:block">Hoş geldin, {user?.username} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2">
              <span className="text-violet-400 text-base sm:text-xl">◈</span>
              <div>
                <p className="text-[10px] sm:text-xs text-violet-300/60 uppercase tracking-wider font-medium leading-none mb-0.5 hidden sm:block">Bakiye</p>
                <p className="font-bold text-white text-sm sm:text-lg leading-none">{user?.balance} <span className="text-violet-400 font-semibold text-xs sm:text-sm">token</span></p>
              </div>
            </div>
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-4">
              <div className="w-px h-8 bg-zinc-700" />
              <button onClick={onGroups} className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">Gruplar</button>
              <button onClick={onNotifications} className="relative text-zinc-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5">
                🔔
                {unreadCount > 0 && (
                  <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button onClick={onProfile} className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">Profil</button>
              <button onClick={() => { localStorage.removeItem('token'); onLogout(); }} className="text-zinc-500 hover:text-zinc-400 transition-colors text-xs">Çıkış</button>
            </div>
            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden relative p-2 text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full" />}
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-xl px-4 py-3 space-y-1">
            <button onClick={() => { onGroups(); setMobileMenu(false); }} className="w-full text-left text-zinc-300 hover:text-white py-2.5 px-3 rounded-lg hover:bg-zinc-800 transition-all text-sm">👥 Gruplar</button>
            <button onClick={() => { onNotifications(); setMobileMenu(false); }} className="w-full text-left text-zinc-300 hover:text-white py-2.5 px-3 rounded-lg hover:bg-zinc-800 transition-all text-sm flex items-center justify-between">
              <span>🔔 Bildirimler</span>
              {unreadCount > 0 && <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
            </button>
            <button onClick={() => { onProfile(); setMobileMenu(false); }} className="w-full text-left text-zinc-300 hover:text-white py-2.5 px-3 rounded-lg hover:bg-zinc-800 transition-all text-sm">👤 Profil</button>
            <button onClick={() => { localStorage.removeItem('token'); onLogout(); }} className="w-full text-left text-red-400/70 hover:text-red-400 py-2.5 px-3 rounded-lg hover:bg-zinc-800 transition-all text-sm">🚪 Çıkış Yap</button>
          </div>
        )}
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

        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`w-full py-3 sm:py-3.5 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 mb-5 sm:mb-8 active:scale-[0.98] ${showCreate
            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20'}`}
        >
          {showCreate ? '✕ İptal' : '+ Yeni Görev Oluştur'}
        </button>

        {showCreate && (
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-4 sm:p-6 mb-5 sm:mb-8 backdrop-blur-sm">
            <h2 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-5">Yeni Görev</h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Başlık *</label>
                <input type="text" placeholder="Ne yapacaksın?" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Açıklama</label>
                <input type="text" placeholder="Opsiyonel detay..." value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Doğrulama Yöntemi</label>
                <select value={form.verification_method}
                  onChange={(e) => setForm({ ...form, verification_method: e.target.value })}
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all">
                  <option value="manual">✋ Manuel — Kendin işaretle</option>
                  <option value="gps">📍 GPS — Konuma git, otomatik tamamla</option>
                </select>
              </div>
              {form.verification_method === 'gps' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Hedef Konum</label>
                    <MapPicker lat={form.location_lat} lng={form.location_lng}
                      onSelect={(lat, lng) => setForm({ ...form, location_lat: lat, location_lng: lng })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Kabul Mesafesi (metre)</label>
                    <input type="number" placeholder="200" value={form.location_radius}
                      onChange={(e) => setForm({ ...form, location_radius: parseInt(e.target.value) || 200 })}
                      className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                    <p className="text-xs text-zinc-500 mt-1.5">💡 Spor salonu için 100-200m önerilir</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Taahhüt (token)</label>
                  <input type="number" placeholder="100" value={form.stake_amount}
                    onChange={(e) => setForm({ ...form, stake_amount: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Son Tarih *</label>
                  <input type="datetime-local" value={form.deadline} min={new Date().toISOString().slice(0, 16)} max="9999-12-31T23:59"
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-zinc-900/50 border border-zinc-600 text-white rounded-xl px-3 sm:px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                </div>
              </div>
              <button onClick={handleCreateTask} disabled={creating}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:active:scale-100">
                {creating ? '⏳ Oluşturuluyor...' : 'Görevi Oluştur →'}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-1 bg-zinc-900/50 border border-zinc-700 rounded-xl p-1 mb-4 sm:mb-6">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${activeTab === tab.key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}>
              <span>{tab.label}</span>
              <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-lg font-bold ${activeTab === tab.key ? 'bg-zinc-600 text-zinc-200' : 'bg-zinc-800 text-zinc-500'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-10 sm:py-12">
            <p className="text-3xl mb-3">{activeTab === 'active' ? '🎯' : activeTab === 'completed' ? '🎉' : '💪'}</p>
            <p className="text-zinc-500 text-sm">
              {activeTab === 'active' ? 'Aktif görev yok. Yeni bir taahhüt oluştur!' :
               activeTab === 'completed' ? 'Tamamlanan görev yok veya hepsi arşivlendi.' : 'Başarısız görev yok.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => (
              <div key={task.id} className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-4 sm:p-5 backdrop-blur-sm hover:border-zinc-600 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 mr-3">
                    <h3 className="font-bold text-white text-sm sm:text-base">{task.title}</h3>
                    {task.description && <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">{task.description}</p>}
                  </div>
                  <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-lg font-semibold border whitespace-nowrap ${
                    task.status === 'active' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                    task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {task.status === 'active' ? 'Aktif' : task.status === 'completed' ? '✓ Tamamlandı' : '✗ Başarısız'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm text-zinc-400 mb-3 sm:mb-4">
                  <span className="flex items-center gap-1.5">
                    <span className="text-violet-400">◈</span>
                    <span className="font-semibold text-white">{task.stake_amount}</span> token
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span>⏰</span>
                    {new Date(task.deadline).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>{task.verification_method === 'gps' ? '📍 GPS' : '✋ Manuel'}</span>
                </div>
                {task.status === 'active' && (
                  <div className="space-y-2">
                    <button onClick={() => handleVerify(task.id)} disabled={verifying === task.id}
                      className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-bold py-2.5 sm:py-3 rounded-xl transition-all text-sm disabled:opacity-50 active:scale-[0.98]">
                      {verifying === task.id ? '⏳ Kontrol ediliyor...' : '✓ Görevi Tamamladım'}
                    </button>
                    {confirmForfeit === task.id ? (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 sm:p-4">
                        <p className="text-red-400 text-xs sm:text-sm mb-3">
                          ⚠️ <b>{task.stake_amount} token</b> kaybedeceksin. Bu işlem geri alınamaz.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => handleForfeit(task.id)}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-lg text-xs sm:text-sm transition-all active:scale-[0.98]">
                            Evet, vazgeç
                          </button>
                          <button onClick={() => setConfirmForfeit(null)}
                            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-bold py-2.5 rounded-lg text-xs sm:text-sm transition-all">
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmForfeit(task.id)}
                        className="w-full bg-transparent hover:bg-red-500/5 border border-zinc-700 hover:border-red-500/20 text-zinc-500 hover:text-red-400 font-medium py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm">
                        🏳 Görevden Vazgeç
                      </button>
                    )}
                  </div>
                )}
                {task.status !== 'active' && (
                  <button onClick={() => handleArchive(task.id)}
                    className="w-full bg-transparent hover:bg-zinc-700/30 border border-zinc-700 hover:border-zinc-600 text-zinc-600 hover:text-zinc-400 font-medium py-2 rounded-xl transition-all text-xs sm:text-sm mt-1">
                    🗂 Arşivle
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeGroups.length > 0 && activeTab === 'active' && (
          <div className="mt-6 sm:mt-8">
            <h2 className="text-sm sm:text-base font-bold text-white mb-3 sm:mb-4">Grup Görevleri</h2>
            <div className="space-y-3">
              {activeGroups.map(group => (
                <div key={group.id} onClick={onGroups}
                  className="bg-zinc-800/60 border border-violet-500/20 rounded-2xl p-4 sm:p-5 hover:border-violet-500/40 transition-all cursor-pointer active:scale-[0.99]">
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="flex-1 mr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] sm:text-xs bg-violet-500/20 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-lg font-medium">Grup</span>
                        <h3 className="font-bold text-white text-sm sm:text-base">{group.title}</h3>
                      </div>
                      {group.description && <p className="text-zinc-400 text-xs sm:text-sm">{group.description}</p>}
                    </div>
                    <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-lg font-semibold border bg-violet-500/10 text-violet-400 border-violet-500/20 whitespace-nowrap">
                      Aktif
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="text-violet-400">◈</span>
                      <span className="font-semibold text-white">{group.stake_amount}</span> token
                    </span>
                    <span>👥 {group.member_count}/{group.max_members}</span>
                    <span>⏰ {new Date(group.deadline).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <p className="text-zinc-600 text-xs mt-2 sm:mt-3">Detaylar için tıkla →</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}