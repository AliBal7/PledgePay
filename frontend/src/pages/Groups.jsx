import { useState, useEffect } from 'react';
import { getMe, getGroups, createGroup, joinGroup, getGroupDetail, verifyGroup, finalizeGroup, inviteByUsername, forfeitGroup } from '../services/api';
import MapPicker from '../components/MapPicker';

export default function Groups({ onBack }) {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', verification_method: 'manual',
    stake_amount: 100, deadline: '', location_lat: null, location_lng: null,
    location_radius: 200, max_members: 10,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [userRes, groupsRes] = await Promise.all([getMe(), getGroups()]);
      setUser(userRes.data);
      setGroups(groupsRes.data);
    } catch (e) { console.error(e); }
  };

  const loadGroupDetail = async (groupId) => {
    try {
      const res = await getGroupDetail(groupId);
      setGroupDetail(res.data);
      setSelectedGroup(groupId);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
    }
  };

  const handleCreate = async () => {
    setError('');
    if (!form.title) return setError('Başlık gerekli');
    if (!form.deadline) return setError('Deadline gerekli');
    if (new Date(form.deadline) <= new Date()) return setError('Deadline bugünden sonra olmalı');
    if (form.max_members < 2) return setError('Grup en az 2 kişilik olmalı');
    if (form.verification_method === 'gps' && (!form.location_lat || !form.location_lng)) return setError('GPS için konum seç');
    try {
      await createGroup(form);
      setShowCreate(false);
      setForm({ title: '', description: '', verification_method: 'manual', stake_amount: 100, deadline: '', location_lat: null, location_lng: null, location_radius: 200, max_members: 10 });
      setMessage('Grup oluşturuldu! 🎯');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
    }
  };

  const handleJoin = async () => {
    setError('');
    if (!joinCode.trim()) return setError('Davet kodu gerekli');
    try {
      const res = await joinGroup(joinCode.trim().toUpperCase());
      setMessage(res.data.message);
      setJoinCode('');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
    }
  };

  const handleVerify = async (groupId) => {
    setVerifying(true);
    setError('');
    try {
      const group = groupDetail;
      let lat = 0, lng = 0;
      if (group.verification_method === 'gps') {
        setMessage('📍 Konumun alınıyor...');
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setMessage('');
      }
      const res = await verifyGroup(groupId, lat, lng);
      setMessage(res.data.message);
      loadGroupDetail(groupId);
      loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (e) {
      if (e.code === 1) setError('Konum izni reddedildi.');
      else { const detail = e.response?.data?.detail; setError(typeof detail === 'string' ? detail : 'Hata oluştu'); }
      setTimeout(() => setError(''), 4000);
    }
    setVerifying(false);
  };

  const handleForfeit = async (groupId) => {
    try {
      const res = await forfeitGroup(groupId);
      setMessage(res.data.message);
      setConfirmForfeit(false);
      loadGroupDetail(groupId);
      loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleFinalize = async (groupId) => {
    try {
      const res = await finalizeGroup(groupId);
      setMessage(res.data.message);
      loadGroupDetail(groupId);
      loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleInvite = async (groupId) => {
    setError('');
    if (!inviteUsername.trim()) return setError('Kullanıcı adı gerekli');
    try {
      await inviteByUsername(groupId, inviteUsername.trim());
      setMessage(`${inviteUsername} kullanıcısına davet gönderildi! ✓`);
      setInviteUsername('');
      setTimeout(() => setMessage(''), 4000);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Hata oluştu');
    }
  };

  const isDeadlinePassed = (deadline) => new Date() > new Date(deadline);

  const statusColor = (status) => {
    if (status === 'active') return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    if (status === 'completed') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const statusText = (status) => {
    if (status === 'active') return 'Devam Ediyor';
    if (status === 'completed') return '✓ Tamamladı';
    return '✗ Başarısız';
  };

  // Grup Detay Sayfası
  if (selectedGroup && groupDetail) {
    const myMembership = groupDetail.members?.find(m => m.user_id === user?.id);
    const deadlinePassed = isDeadlinePassed(groupDetail.deadline);
    const winners = groupDetail.members?.filter(m => m.status === 'completed') || [];
    const losers = groupDetail.members?.filter(m => m.status === 'failed') || [];
    const active = groupDetail.members?.filter(m => m.status === 'active') || [];
    const totalLost = groupDetail.stake_amount * losers.length;
    const perWinnerBonus = winners.length > 0 ? ((totalLost * 0.9) / winners.length).toFixed(1) : 0;

    return (
      <div className="min-h-screen bg-[#0f0f18] text-white">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full bg-violet-600/8 blur-[100px]" />
          <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
        </div>

        <header className="relative border-b border-zinc-700 bg-zinc-900/60 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => { setSelectedGroup(null); setGroupDetail(null); setConfirmForfeit(false); }}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all">←</button>
            <div className="flex-1">
              <h1 className="font-bold text-white text-base">{groupDetail.title}</h1>
              <p className="text-zinc-400 text-sm">{groupDetail.members?.length} üye · {groupDetail.stake_amount} token taahhüt</p>
            </div>
            <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2">
              <span className="text-violet-400 text-lg">◈</span>
              <div>
                <p className="text-xs text-violet-300/60 uppercase tracking-wider font-medium leading-none mb-0.5">Bakiye</p>
                <p className="font-bold text-white text-base leading-none">{user?.balance} <span className="text-violet-400 font-semibold text-sm">token</span></p>
              </div>
            </div>
          </div>
        </header>

        <main className="relative max-w-4xl mx-auto px-6 py-8 space-y-4">
          {message && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 text-base flex items-center gap-2"><span>✓</span> {message}</div>}
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-base flex items-center gap-2"><span>!</span> {error}</div>}

          {/* Grup istatistikleri */}
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-400">{winners.length}</p>
                <p className="text-zinc-400 text-sm">Tamamlayan</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-400">{active.length}</p>
                <p className="text-zinc-400 text-sm">Devam Eden</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{losers.length}</p>
                <p className="text-zinc-400 text-sm">Başarısız</p>
              </div>
            </div>
            {losers.length > 0 && winners.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-700 text-center">
                <p className="text-zinc-400 text-sm">Her kazanan <span className="text-violet-400 font-bold">+{perWinnerBonus} token</span> bonus kazanır</p>
              </div>
            )}
            {losers.length > 0 && winners.length === 0 && active.length === 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-700 text-center">
                <p className="text-zinc-400 text-sm">Kimse tamamlayamadı, tüm tokenler kaybedildi.</p>
              </div>
            )}
          </div>

          {/* Davet kodu */}
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5">
            <p className="text-zinc-400 text-sm mb-2">Davet Kodu</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-zinc-900/50 border border-zinc-600 rounded-xl px-4 py-3 text-violet-400 font-bold text-lg tracking-widest text-center">
                {groupDetail.invite_code}
              </code>
              <button onClick={() => { navigator.clipboard.writeText(groupDetail.invite_code); setMessage('Kod kopyalandı!'); setTimeout(() => setMessage(''), 2000); }}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-3 rounded-xl text-sm font-medium transition-all">
                Kopyala
              </button>
            </div>
          </div>

          {/* Kullanıcı adıyla davet (sadece kurucu) */}
          {groupDetail.creator_id === user?.id && (
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5">
              <p className="text-zinc-400 text-sm mb-3">Kullanıcı Adıyla Davet Et</p>
              <div className="flex gap-2">
                <input type="text" placeholder="kullanici_adi" value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="flex-1 bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                <button onClick={() => handleInvite(groupDetail.id)}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all">
                  Davet Et
                </button>
              </div>
            </div>
          )}

          {/* Aksiyon butonları */}
          {myMembership?.status === 'active' && !deadlinePassed && (
            <div className="space-y-2">
              <button onClick={() => handleVerify(groupDetail.id)} disabled={verifying}
                className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-bold py-3.5 rounded-xl transition-all text-base disabled:opacity-50">
                {verifying ? '⏳ Kontrol ediliyor...' : '✓ Görevi Tamamladım'}
              </button>

              {confirmForfeit ? (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-400 text-sm mb-3">
                    ⚠️ <b>{groupDetail.stake_amount} token</b> kaybedeceksin. Bu işlem geri alınamaz.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handleForfeit(groupDetail.id)}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-lg text-sm transition-all">
                      Evet, vazgeç
                    </button>
                    <button onClick={() => setConfirmForfeit(false)}
                      className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-bold py-2.5 rounded-lg text-sm transition-all">
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmForfeit(true)}
                  className="w-full bg-transparent hover:bg-red-500/5 border border-zinc-700 hover:border-red-500/20 text-zinc-500 hover:text-red-400 font-medium py-2.5 rounded-xl transition-all text-sm">
                  🏳 Gruptan Vazgeç
                </button>
              )}
            </div>
          )}

          {deadlinePassed && active.length > 0 && (
            <button onClick={() => handleFinalize(groupDetail.id)}
              className="w-full bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-400 font-bold py-3.5 rounded-xl transition-all text-base">
              🏁 Grubu Sonuçlandır & Ödülleri Dağıt
            </button>
          )}

          {/* Üye listesi */}
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-700">
              <h3 className="font-semibold text-white text-base">Üyeler</h3>
            </div>
            <div className="divide-y divide-zinc-700/50">
              {groupDetail.members?.map(member => (
                <div key={member.user_id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 border border-violet-500/20 flex items-center justify-center font-bold text-sm text-violet-300">
                      {member.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white text-base">{member.username}</p>
                      {member.completed_at && (
                        <p className="text-zinc-500 text-sm">
                          {new Date(member.completed_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-lg font-semibold border ${statusColor(member.status)}`}>
                    {statusText(member.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Ana Grup Listesi
  return (
    <div className="min-h-screen bg-[#0f0f18] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      <header className="relative border-b border-zinc-700 bg-zinc-900/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all">←</button>
          <div className="flex-1">
            <h1 className="font-bold text-white text-base">Grup Taahhütleri</h1>
            <p className="text-zinc-400 text-sm">Arkadaşlarınla birlikte kazan</p>
          </div>
          <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2">
            <span className="text-violet-400 text-lg">◈</span>
            <div>
              <p className="text-xs text-violet-300/60 uppercase tracking-wider font-medium leading-none mb-0.5">Bakiye</p>
              <p className="font-bold text-white text-base leading-none">{user?.balance} <span className="text-violet-400 font-semibold text-sm">token</span></p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-8">
        {message && <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 text-base flex items-center gap-2"><span>✓</span> {message}</div>}
        {error && <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-base flex items-center gap-2"><span>!</span> {error}</div>}

        {/* Koda göre katıl */}
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5 mb-6">
          <p className="text-zinc-400 text-sm mb-3">Davet Koduyla Katıl</p>
          <div className="flex gap-2">
            <input type="text" placeholder="ABCD1234" value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
            <button onClick={handleJoin}
              className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/20">
              Katıl
            </button>
          </div>
        </div>

        {/* Yeni Grup */}
        <button onClick={() => setShowCreate(!showCreate)}
          className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all duration-200 mb-6 ${showCreate
            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20'}`}>
          {showCreate ? '✕ İptal' : '+ Yeni Grup Oluştur'}
        </button>

        {showCreate && (
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-5">Yeni Grup</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Başlık *</label>
                <input type="text" placeholder="Grubun adı" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Açıklama</label>
                <input type="text" placeholder="Opsiyonel" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Doğrulama</label>
                <select value={form.verification_method}
                  onChange={(e) => setForm({ ...form, verification_method: e.target.value })}
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all">
                  <option value="manual">✋ Manuel</option>
                  <option value="gps">📍 GPS</option>
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
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Token</label>
                  <input type="number" placeholder="100" value={form.stake_amount}
                    onChange={(e) => setForm({ ...form, stake_amount: parseInt(e.target.value) })}
                    className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Maks Üye</label>
                  <input type="number" placeholder="10" min="2" value={form.max_members}
                    onChange={(e) => setForm({ ...form, max_members: parseInt(e.target.value) })}
                    className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Deadline</label>
                  <input type="datetime-local" value={form.deadline} min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-zinc-900/50 border border-zinc-600 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                </div>
              </div>
              <button onClick={handleCreate}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all text-base shadow-lg shadow-violet-500/20">
                Grubu Oluştur →
              </button>
            </div>
          </div>
        )}

        {/* Grup Listesi */}
        <h2 className="text-base font-bold text-white mb-4">Gruplarım</h2>
        {groups.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-base">Henüz bir gruba dahil değilsin.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.id} onClick={() => loadGroupDetail(group.id)}
                className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5 hover:border-zinc-600 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{group.title}</h3>
                    {group.description && <p className="text-zinc-400 text-sm mt-0.5">{group.description}</p>}
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-lg font-semibold border ${statusColor(group.my_status)}`}>
                    {statusText(group.my_status)}
                  </span>
                </div>
                <div className="flex items-center gap-5 text-sm text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="text-violet-400">◈</span>
                    <span className="font-semibold text-white">{group.stake_amount}</span> token
                  </span>
                  <span>👥 {group.member_count}/{group.max_members} üye</span>
                  <span>⏰ {new Date(group.deadline).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  <span className="ml-auto text-zinc-600 text-xs font-mono">{group.invite_code}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}