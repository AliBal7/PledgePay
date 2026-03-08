import { useState } from 'react';
import { login, register } from '../services/api';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (isRegister) await register(form);
      const res = await login({ email: form.email, password: form.password });
      localStorage.setItem('token', res.data.access_token);
      onLogin();
    } catch (e) {
      setError(e.response?.data?.detail || 'Bir hata oluştu');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f0f18] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/25">P</div>
            <span className="text-2xl font-bold text-white tracking-tight">PledgePay</span>
          </div>
          <p className="text-zinc-400 text-sm">Taahhüt et. Kazan. Büyü.</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-800/60 backdrop-blur-xl border border-zinc-700 rounded-2xl p-8 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex bg-zinc-800/50 rounded-xl p-1 mb-8">
            <button
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${!isRegister ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isRegister ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              Kayıt Ol
            </button>
          </div>

          <div className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Kullanıcı Adı</label>
                <input
                  type="text"
                  placeholder="kullanici_adi"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="ornek@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Şifre</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg shadow-violet-500/20 text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Yükleniyor...
              </span>
            ) : isRegister ? 'Hesap Oluştur →' : 'Giriş Yap →'}
          </button>
        </div>

        <p className="text-center text-zinc-500 text-xs mt-6">
          Hedeflerine ulaşmak için finansal taahhüt sistemi
        </p>
      </div>
    </div>
  );
}