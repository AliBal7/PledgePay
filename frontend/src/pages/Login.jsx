import { useState } from 'react';
import { login, register } from '../services/api';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setError('');

    if (isRegister) {
      if (!form.username.trim()) { setError('Kullanıcı adı gerekli'); setLoading(false); return; }
      if (form.password.length < 6) { setError('Şifre en az 6 karakter olmalı'); setLoading(false); return; }
      if (form.password !== form.confirmPassword) { setError('Şifreler eşleşmiyor'); setLoading(false); return; }
    }

    try {
      if (isRegister) await register({ email: form.email, username: form.username, password: form.password });
      const res = await login({ email: form.email, password: form.password });
      localStorage.setItem('token', res.data.access_token);
      onLogin();
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(', '));
      } else {
        setError(typeof detail === 'string' ? detail : 'Bir hata oluştu');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0f0f18] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-violet-500/30">P</div>
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">PledgePay</span>
          </div>
          <p className="text-zinc-400 text-sm">Taahhüt et. Kazan. Büyü.</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-800/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex bg-zinc-900/60 rounded-xl p-1 mb-6 sm:mb-8">
            <button
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${!isRegister ? 'bg-violet-600/20 text-violet-300 shadow-sm border border-violet-500/20' : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isRegister ? 'bg-violet-600/20 text-violet-300 shadow-sm border border-violet-500/20' : 'text-zinc-400 hover:text-zinc-300'}`}
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
                  className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
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
                className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Şifre</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && !isRegister && handleSubmit()}
                className="w-full bg-zinc-900/50 border border-zinc-600 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
              {isRegister && form.password && (
                <div className="mt-2 flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                      form.password.length >= i * 3
                        ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-orange-500' : i <= 3 ? 'bg-yellow-500' : 'bg-emerald-500'
                        : 'bg-zinc-700'
                    }`} />
                  ))}
                </div>
              )}
            </div>
            {isRegister && (
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Şifre Tekrar</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className={`w-full bg-zinc-900/50 border text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all ${
                    form.confirmPassword && form.confirmPassword !== form.password
                      ? 'border-red-500/50'
                      : form.confirmPassword && form.confirmPassword === form.password
                      ? 'border-emerald-500/50'
                      : 'border-zinc-600'
                  }`}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm animate-pulse">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-violet-500/20 text-sm"
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