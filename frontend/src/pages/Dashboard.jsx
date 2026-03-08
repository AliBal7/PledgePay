import { useState, useEffect } from 'react';
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

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const [userRes, tasksRes, groupsRes, notifRes] = await Promise.all([getMe(), getTasks(), getGroups(), getNotifications()]);
      setUser(userRes.data);
      setTasks(tasksRes.data);
      setGroups(groupsRes.data);
      setUnreadCount(notifRes.data.filter(n => !n.is_read).length);
    } catch (e) { onLogout(); }
  };

  const handleCreateTask = async () => {
    setError('');
    if (!form.title) return setError('Görev başlığı gerekli');
    if (!form.deadline) return setError('Deadline gerekli');
    if (new Date(form.deadline) <= new Date()) return setError('Deadline bugünden sonra olmalı');
    if (form.verification_method === 'gps' && (!form.location_lat || !form.location_lng)) return setError('GPS görevi için haritadan konum seçmelisin');
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
  };

  const handleVerify = async (taskId) => {
    setVerifying(taskId);
    setError('');
    try {
      const task = tasks.find(t => t.id === taskId);
      let lat = 0, lng = 0;
      if (task.verification_method === 'gps') {
        setMessage('📍 Konumun alınıyor...');
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
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
      if (e.code === 1) setError('Konum izni reddedildi.');
      else if (e.code === 3) setError('Konum alınamadı, tekrar dene.');
      else { const detail = e.response?.data?.detail; setError(typeof detail === 'string' ? detail : 'Hata oluştu'); }
      setTimeout(() => setError(''), 4000);
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
      setMessage('Görev arşivlendi, profil sekmesinden görebilirsin 🗂');
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

  return (
    <div className="min-h-screen bg-[#0f0f18] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      <header className="relative border-b border-zinc-700 bg-zinc-900/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-base shadow-lg shadow-violet-500/25">P</div>
            <div>
              <span className="font-bold text-white text-base">PledgePay</span>
              <p className="text-zinc-400 text-sm">Hoş geldin, {user?.username} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2">
              <span className="text-violet-400 text-xl">◈</span>
              <div>
                <p className="text-xs text-violet-300/60 uppercase tracking-wider font-medium leading-none mb-0.5">Bakiye</p>
                <p className="font-bold text-white text-lg leading-none">{user?.balance} <span className="text-violet-400 font-semibold text-sm">token</span></p>
              </div>
            </div>
            <div className="w-px h-8 bg-zinc-700" />
            <button onClick={onGroups} className="text-zinc-400 hover:text-white transition-colors text-base font-medium">Gruplar</button>
            <button onClick={onNotifications} className="relative text-zinc-400 hover:text-white transition-colors text-base font-medium flex items-center gap-1.5">
              🔔 Bildirimler
              {unreadCount > 0 && (
                <span className="bg-violet-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={onProfile} className="text-zinc-400 hover:text-white transition-colors text-base font-medium">Profil</button>
            <button onClick={() => { localStorage.removeItem('token'); onLogout(); }} className="text-zinc-500 hover:text-zinc-400 transition-colors text-sm">Çıkış</button>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-8">
        {message && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 text-base flex items-center gap-2">
            <span>✓</span> {message}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-base flex items-center gap-2">
            <span>!</span> {error}
          </div>
        )}

        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all duration-200 mb-8 ${showCreate
            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20'}`}
        >
          {showCreate ? '✕ İptal' : '+ Yeni Görev Oluştur'}
        </button>

        {showCreate && (
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6 mb-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-5">Yeni Görev</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Başlık *</label>
                <input type="text" placeholder="Ne yapacaksın?" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Açıklama</label>
                <input type="text" placeholder="Opsiyonel detay..." value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Doğrulama Yöntemi</label>
                <select value={form.verification_method}
                  onChange={(e) => setForm({ ...form, verification_method: e.target.value })}
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all">
                  <option value="manual">✋ Manuel — Kendin işaretle</option>
                  <option value="gps">📍 GPS — Konuma git, otomatik tamamla</option>
                </select>
              </div>
              {form.verification_method === 'gps' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Hedef Konum</label>
                    <MapPicker lat={form.location_lat} lng={form.location_lng}
                      onSelect={(lat, lng) => setForm({ ...form, location_lat: lat, location_lng: lng })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Kabul Mesafesi (metre)</label>
                    <input type="number" placeholder="200" value={form.location_radius}
                      onChange={(e) => setForm({ ...form, location_radius: parseInt(e.target.value) })}
                      className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                    <p className="text-sm text-zinc-500 mt-1.5">💡 Spor salonu için 100-200m önerilir</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Taahhüt (token)</label>
                  <input type="number" placeholder="100" value={form.stake_amount}
                    onChange={(e) => setForm({ ...form, stake_amount: parseInt(e.target.value) })}
                    className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Son Tarih *</label>
                  <input type="datetime-local" value={form.deadline} min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-zinc-900/50 border border-zinc-600 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                </div>
              </div>
              <button onClick={handleCreateTask}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all text-base shadow-lg shadow-violet-500/20">
                Görevi Oluştur →
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-1 bg-zinc-900/50 border border-zinc-700 rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === tab.key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}>
              <span>{tab.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${activeTab === tab.key ? 'bg-zinc-600 text-zinc-200' : 'bg-zinc-800 text-zinc-500'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-base">
              {activeTab === 'active' ? 'Aktif görev yok. Yeni bir taahhüt oluştur!' :
               activeTab === 'completed' ? 'Tamamlanan görev yok veya hepsi arşivlendi.' : 'Başarısız görev yok veya hepsi arşivlendi.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => (
              <div key={task.id} className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5 backdrop-blur-sm hover:border-zinc-600 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 mr-3">
                    <h3 className="font-bold text-white text-base">{task.title}</h3>
                    {task.description && <p className="text-zinc-400 text-sm mt-0.5">{task.description}</p>}
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-lg font-semibold border ${
                    task.status === 'active' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                    task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {task.status === 'active' ? 'Aktif' : task.status === 'completed' ? '✓ Tamamlandı' : '✗ Başarısız'}
                  </span>
                </div>
                <div className="flex items-center gap-5 text-sm text-zinc-400 mb-4">
                  <span className="flex items-center gap-1.5">
                    <span className="text-violet-400 text-base">◈</span>
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
                      className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-bold py-3 rounded-xl transition-all text-base disabled:opacity-50">
                      {verifying === task.id ? '⏳ Kontrol ediliyor...' : '✓ Görevi Tamamladım'}
                    </button>
                    {confirmForfeit === task.id ? (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                        <p className="text-red-400 text-sm mb-3">
                          ⚠️ <b>{task.stake_amount} token</b> kaybedeceksin. Bu işlem geri alınamaz.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => handleForfeit(task.id)}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-lg text-sm transition-all">
                            Evet, vazgeç
                          </button>
                          <button onClick={() => setConfirmForfeit(null)}
                            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-bold py-2.5 rounded-lg text-sm transition-all">
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmForfeit(task.id)}
                        className="w-full bg-transparent hover:bg-red-500/5 border border-zinc-700 hover:border-red-500/20 text-zinc-500 hover:text-red-400 font-medium py-2.5 rounded-xl transition-all text-sm">
                        🏳 Görevden Vazgeç
                      </button>
                    )}
                  </div>
                )}
                {task.status !== 'active' && (
                  <button onClick={() => handleArchive(task.id)}
                    className="w-full bg-transparent hover:bg-zinc-700/30 border border-zinc-700 hover:border-zinc-600 text-zinc-600 hover:text-zinc-400 font-medium py-2 rounded-xl transition-all text-sm mt-1">
                    🗂 Arşivle
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeGroups.length > 0 && activeTab === 'active' && (
          <div className="mt-8">
            <h2 className="text-base font-bold text-white mb-4">Grup Görevleri</h2>
            <div className="space-y-3">
              {activeGroups.map(group => (
                <div key={group.id} onClick={onGroups}
                  className="bg-zinc-800/60 border border-violet-500/20 rounded-2xl p-5 hover:border-violet-500/40 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs bg-violet-500/20 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-lg font-medium">Grup</span>
                        <h3 className="font-bold text-white text-base">{group.title}</h3>
                      </div>
                      {group.description && <p className="text-zinc-400 text-sm">{group.description}</p>}
                    </div>
                    <span className="text-sm px-3 py-1 rounded-lg font-semibold border bg-violet-500/10 text-violet-400 border-violet-500/20">
                      Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-5 text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="text-violet-400">◈</span>
                      <span className="font-semibold text-white">{group.stake_amount}</span> token
                    </span>
                    <span>👥 {group.member_count}/{group.max_members} üye</span>
                    <span>⏰ {new Date(group.deadline).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <p className="text-zinc-600 text-xs mt-3">Detaylar için tıkla →</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}