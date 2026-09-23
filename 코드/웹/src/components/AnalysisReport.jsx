// 분석 리포트 페이지
import React, { useState, useMemo } from 'react';
import useDataStore from '../store/useDataStore';
import PropTypes from 'prop-types';
import { TrendingUp, AlertCircle, BarChart3, PieChart as PieIcon, Calendar, Search, Filter, Target, Cpu } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend } from 'recharts';

const InsightCard = ({ title, value, sub, icon: Icon, colorClass }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
    <Icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-10 ${colorClass}`} />
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
    <h3 className="text-3xl font-black text-slate-900">{value || '-'}</h3>
    <p className={`text-xs font-bold mt-2 ${colorClass}`}>{sub}</p>
  </div>
);

const AnalysisReport = () => {
  const { tables } = useDataStore();
  const [analysisType, setAnalysisType] = useState('location');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [timeScale, setTimeScale] = useState('month');
  const [selYear, setSelYear] = useState('');
  const [selMonth, setSelMonth] = useState('');
  const [selDay, setSelDay] = useState('');
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const safeLogs = useMemo(() => (Array.isArray(tables.waste_logs) ? tables.waste_logs : []), [tables.waste_logs]);
  const devices = useMemo(() => (Array.isArray(tables.devices) ? tables.devices : []), [tables.devices]);
  const locations = useMemo(() => (Array.isArray(tables.locations) ? tables.locations : []), [tables.locations]);
  const deviceLocationMap = useMemo(() => {
    const locMap = {};
    locations.forEach(loc => {
      locMap[String(loc.num)] = loc.city;
    });
    const devMap = {};
    devices.forEach(dev => {
      devMap[String(dev.id)] = locMap[String(dev.location)] || '위치 미지정';
    });
    return devMap;
  }, [devices, locations]);
  const yearOptions = useMemo(() => [...new Set(safeLogs.map(log => new Date(log.created_at).getFullYear().toString()))].sort(), [safeLogs]);
  const monthOptions = useMemo(() => {
    if (!selYear) return [];
    return [...new Set(safeLogs.filter(log => new Date(log.created_at).getFullYear().toString() === selYear).map(log => (new Date(log.created_at).getMonth() + 1).toString()))].sort((a, b) => a - b);
  }, [selYear, safeLogs]);
  const dayOptions = useMemo(() => {
    if (!selYear || !selMonth) return [];
    return [...new Set(safeLogs.filter(log => {
      const d = new Date(log.created_at);
      return d.getFullYear().toString() === selYear && (d.getMonth() + 1).toString() === selMonth;
    }).map(log => new Date(log.created_at).getDate().toString()))].sort((a, b) => a - b);
  }, [selYear, selMonth, safeLogs]);
  const filteredAnalysis = useMemo(() => {
    let logs = safeLogs.filter(log => {
      if (analysisType === 'location') {
        return log.city !== null && log.city !== undefined && log.city !== '';
      } else {
        return log.device_id !== null && log.device_id !== undefined;
      }
    });
    if (selectedTarget) {
      logs = logs.filter(log => {
        if (analysisType === 'location') return log.city === String(selectedTarget);
        return log.device_id === String(selectedTarget);
      });
    }
    logs = logs.filter(log => {
      const d = new Date(log.created_at);
      if (isNaN(d.getTime())) return false;
      return (selYear === '' || d.getFullYear().toString() === selYear) &&
        (selMonth === '' || (d.getMonth() + 1).toString() === selMonth) &&
        (selDay === '' || d.getDate().toString() === selDay);
    });
    const groupStats = {};
    const dayStats = Array(7).fill(0);
    const timeMap = {};
    const typeMap = {};
    const typeBest = {};
    logs.forEach(log => {
      let groupKey;
      let displayName;
      if (analysisType === 'location') {
        groupKey = log.city;
        displayName = log.city;
      } else {
        groupKey = String(log.device_id);
        displayName = `ID: ${log.device_id} (${deviceLocationMap[groupKey] || '알 수 없음'})`;
      }
      if (!groupStats[groupKey]) {
        groupStats[groupKey] = { name: displayName, total: 0, reject: 0, types: {} };
      }
      groupStats[groupKey].total++;
      if (log.trash_type === 'reject') {
        groupStats[groupKey].reject++;
      } else {
        typeMap[log.trash_type] = (typeMap[log.trash_type] || 0) + 1;
        groupStats[groupKey].types[log.trash_type] = (groupStats[groupKey].types[log.trash_type] || 0) + 1;
      }
      const d = new Date(log.created_at);
      dayStats[d.getDay()]++;
      let key = timeScale === 'year' ? `${d.getFullYear()}년` :
        timeScale === 'month' ? `${d.getMonth() + 1}월` :
          timeScale === 'weekday' ? dayNames[d.getDay()] :
            timeScale === 'day' ? `${d.getDate()}일` : `${d.getHours()}시`;
      timeMap[key] = (timeMap[key] || 0) + 1;
    });
    const sortedTotal = Object.values(groupStats).sort((a, b) => b.total - a.total);
    const sortedReject = Object.values(groupStats).sort((a, b) => b.reject - a.reject);
    const dayChartData = dayNames.map((name, i) => ({ name, count: dayStats[i] }));
    const bestDay = [...dayChartData].sort((a, b) => b.count - a.count)[0];
    const sortedKeys = Object.keys(timeMap).sort((a, b) => {
      if (timeScale === 'weekday') return dayNames.indexOf(a) - dayNames.indexOf(b);
      return parseInt(a) - parseInt(b);
    });
    Object.values(groupStats).forEach(group => {
      Object.entries(group.types).forEach(([type, count]) => {
        if (!typeBest[type] || typeBest[type].count < count) {
          typeBest[type] = { targetName: group.name, count };
        }
      });
    });
    const total = logs.length;
    const rejectCount = logs.filter(l => l.trash_type === 'reject').length;
    return {
      chartData: sortedKeys.map(k => ({ name: k, count: timeMap[k] })),
      total,
      rejectRate: total > 0 ? (rejectCount / total * 100).toFixed(1) : 0,
      typeShare: typeMap,
      sortedTotal,
      sortedReject,
      dayChartData,
      bestDay,
      typeBest
    };
  }, [selectedTarget, analysisType, timeScale, selYear, selMonth, selDay, safeLogs, deviceLocationMap, dayNames]);
  return (
    <div className="space-y-8 pb-20 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard
          title={analysisType === 'location' ? "최다 수거 시/군/구" : "최다 수거 기기"}
          value={filteredAnalysis.sortedTotal[0]?.name}
          sub={`수거 ${filteredAnalysis.sortedTotal[0]?.total || 0}회`}
          icon={analysisType === 'location' ? TrendingUp : Cpu} colorClass="text-emerald-500"
        />
        <InsightCard
          title={analysisType === 'location' ? "거부 1위 시/군/구" : "거부 1위 기기"}
          value={filteredAnalysis.sortedReject[0]?.name}
          sub={`거부 ${filteredAnalysis.sortedReject[0]?.reject || 0}회`}
          icon={AlertCircle} colorClass="text-rose-500"
        />
        <InsightCard
          title="최다 수거 요일"
          value={filteredAnalysis.bestDay?.count > 0 ? `${filteredAnalysis.bestDay.name}요일` : '-'}
          sub={filteredAnalysis.bestDay?.count > 0 ? `수거 ${filteredAnalysis.bestDay.count}회` : '-'}
          icon={Calendar} colorClass="text-blue-500"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
            <PieIcon size={20} className="text-blue-500" /> {analysisType === 'location' ? '시/군/구별' : '기기별'} 점유율
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePie>
                <Pie
                  data={filteredAnalysis.sortedTotal}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                >
                  {filteredAnalysis.sortedTotal.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i % 5]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </RePie>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-500" /> 요일별 수거 패턴
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredAnalysis.dayChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[10, 10, 10, 10]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-4 pb-8 border-b border-slate-50">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button onClick={() => { setAnalysisType('location'); setSelectedTarget(''); }} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${analysisType === 'location' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>시/군/구별</button>
              <button onClick={() => { setAnalysisType('device'); setSelectedTarget(''); }} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${analysisType === 'device' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>기기별</button>
            </div>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-sm font-bold outline-none min-w-[240px]"
            >
              <option value="">{analysisType === 'location' ? '전체 시/군/구' : '전체 기기'}</option>
              {analysisType === 'location'
                ? [...new Set(safeLogs.map(l => l.city).filter(Boolean))].sort().map(city => (
                  <option key={city} value={city}>{city}</option>
                ))
                : devices.map(d => (
                  <option key={d.id} value={d.id}>ID: {d.id} ({deviceLocationMap[String(d.id)] || '위치 미지정'})</option>
                ))
              }
            </select>
            <div className="flex items-center gap-2 ml-auto bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <Filter size={14} className="text-slate-400 ml-2" />
              <select value={selYear} onChange={(e) => { setSelYear(e.target.value); setSelMonth(''); setSelDay(''); }} className="bg-transparent text-xs font-bold outline-none">
                <option value="">연도 전체</option>
                {yearOptions.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select value={selMonth} disabled={!selYear} onChange={(e) => { setSelMonth(e.target.value); setSelDay(''); }} className="bg-transparent text-xs font-bold outline-none disabled:opacity-30">
                <option value="">월 전체</option>
                {monthOptions.map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
              <select value={selDay} disabled={!selMonth} onChange={(e) => setSelDay(e.target.value)} className="bg-transparent text-xs font-bold outline-none disabled:opacity-30">
                <option value="">일 전체</option>
                {dayOptions.map(d => <option key={d} value={d}>{d}일</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2"><Search size={18} className="text-blue-500" /> {selectedTarget || '전체'} 분석 트렌드</h4>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {[{ id: 'year', l: '년' }, { id: 'month', l: '월' }, { id: 'weekday', l: '요일' }, { id: 'day', l: '일' }, { id: 'hour', l: '시' }].map(u => (
                <button key={u.id} onClick={() => setTimeScale(u.id)} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${timeScale === u.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>{u.l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12 animate-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-80 w-full">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><BarChart3 size={14} /> 수거량 시계열 분석</h4>
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={filteredAnalysis.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                <Target size={14} /> 품목별 최다 발생 {analysisType === 'location' ? '시/군/구' : '기기'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(filteredAnalysis.typeBest).map(([type, data]) => (
                  <div key={type} className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                    <p className="text-[10px] font-bold text-blue-400 uppercase">{type}</p>
                    <p className="text-sm font-black mt-1">{data.targetName}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="p-8 bg-slate-50 rounded-[2.5rem]">
              <p className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest">수거 건수 요약</p>
              <div className="space-y-6">
                <div><p className="text-xs font-bold text-slate-500">총 횟수</p><p className="text-5xl font-black text-slate-900 leading-tight">{filteredAnalysis.total}<span className="text-xl ml-1 font-bold">회</span></p></div>
                <div className="pt-6 border-t border-slate-200 flex justify-between">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase">정상</p><p className="text-xl font-black text-emerald-500">{filteredAnalysis.total > 0 ? (100 - filteredAnalysis.rejectRate).toFixed(1) : 0}%</p></div>
                  <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">거부</p><p className="text-xl font-black text-rose-500">{filteredAnalysis.rejectRate}%</p></div>
                </div>
              </div>
            </div>
            <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
              <p className="text-[10px] font-black text-slate-400 mb-4 uppercase">품목별 비중</p>
              {Object.entries(filteredAnalysis.typeShare).map(([type, count]) => (
                <div key={type} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-[10px] font-black mb-1.5">
                    <span className="text-slate-500 uppercase">{type}</span>
                    <span className="text-slate-900">{((count / filteredAnalysis.total) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: `${(count / filteredAnalysis.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

InsightCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  sub: PropTypes.node,
  icon: PropTypes.elementType.isRequired,
  colorClass: PropTypes.string
};

export default AnalysisReport;