// 웹 진입점, 관리자 로그인 및 주요 뷰 렌더링 담당
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import PropTypes from 'prop-types';
import { LayoutDashboard, Target, Leaf, UserCog, LogOut, Clock3, Activity, FileText } from 'lucide-react';

import AnalysisReport from './components/AnalysisReport';
import Dashboard from './components/Dashboard';
import Monitoring from './components/Monitoring';
import ESGReport from './components/ESGReport';
import Management from './components/Management';
import useDataStore from './store/useDataStore';

const MenuLink = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all ${active ? 'bg-slate-700/60 text-emerald-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
  >
    <Icon size={20} />
    {label}
  </button>
);
const formatDateTime = (date) => {
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

function App() {
  const { fetchAllData } = useDataStore();
  const [view, setView] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isThrottled = false;

    if (session) {
      console.log('시스템 접속 성공: 초기 데이터 로딩 시작');
      fetchAllData();

      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            if (isThrottled) return;
            isThrottled = true;

            console.log(`실시간 변경 감지(${payload.table}): 데이터 갱신`);
            fetchAllData();

            setTimeout(() => {
              isThrottled = false;
            }, 1000);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        checkAdminRole(initialSession.user.id, initialSession);
      } else {
        setLoading(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        checkAdminRole(newSession.user.id, newSession);
      } else {
        setSession(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId, currentSession) => {
    setIsCheckingRole(true);
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (!error && data?.role === 'admin') {
      setIsAdmin(true);
      setSession(currentSession);
    } else {
      alert("관리자 권한이 없습니다.");
      await supabase.auth.signOut();
      setIsAdmin(false);
      setSession(null);
    }
    setIsCheckingRole(false);
    setLoading(false);
  };
  if (loading || isCheckingRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      alert("로그인 실패: " + error.message);
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  if (loading) return null;
  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-emerald-100 p-4 rounded-3xl mb-4">
              <Leaf size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">SMART ECO BIN</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="관리자 이메일"
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="비밀번호"
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 mt-4"
            >
              시스템 접속하기
            </button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800 flex">
      <aside className="w-64 bg-slate-900 rounded-2xl shadow-2xl p-6 mr-8 text-slate-300 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-10 pb-4 border-b border-slate-700/50">
            <Leaf size={32} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-white">SMART ECO BIN<span className='font-light text-slate-400'></span></h1>
          </div>
          <nav className="space-y-3">
            <MenuLink
              icon={LayoutDashboard}
              label="대시보드"
              active={view === 'dashboard'}
              onClick={() => { setView('dashboard'); }}
            />
            <MenuLink
              icon={Target}
              label="수거 성과 분석"
              active={view === 'analysis'}
              onClick={() => { setView('analysis'); }}
            />
            <MenuLink
              icon={Activity}
              label="실시간 모니터링"
              active={view === 'monitoring'}
              onClick={() => setView('monitoring')}
            />
            <MenuLink
              icon={FileText}
              label="ESG 리포트"
              active={view === 'esg_report'}
              onClick={() => setView('esg_report')}
            />
            <MenuLink
              icon={UserCog}
              label="기기 및 회원 관리"
              active={view === 'management'}
              onClick={() => setView('management')}
            />
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-sm text-slate-500 hover:text-white transition-colors"
        >
          <LogOut size={18} /> 로그아웃
        </button>
      </aside>
      <main className="flex-1">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950">
              {view === 'dashboard' && '대시보드'}
              {view === 'monitoring' && '실시간 모니터링'}
              {view === 'analysis' && '수거 성과 분석'}
              {view === 'esg_report' && 'ESG 리포트'}
              {view === 'management' && '기기 및 회원 관리'}
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-mono flex items-center gap-1.5">
              <Clock3 size={14} /> {formatDateTime(currentTime)}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right text-sm">
              <p className="text-gray-400 text-xs">{session.user.email}님 관리자</p>
            </div>
          </div>
        </header>
        {view === 'dashboard' && (
          <Dashboard />
        )}
        {view === 'analysis' && (
          <AnalysisReport />
        )}
        {view === 'monitoring' && (
          <Monitoring />
        )}
        {view === 'esg_report' && (
          <ESGReport />
        )}
        {view === 'management' && (
          <Management />
        )}
      </main>
    </div>
  );
}

MenuLink.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default App;
