// 모니터링 페이지
import React, { useState, useMemo } from "react";
import useDataStore from '../store/useDataStore';
import PropTypes from 'prop-types';
import { Activity, Terminal, Clock3 } from "lucide-react";

const getStatusStyle = (status) => {
    const styles = {
        'IDLE': 'bg-emerald-50 text-emerald-600',
        'RUNNING': 'bg-blue-50 text-blue-600',
        'WARN': 'bg-yellow-50 text-yellow-700',
        'CHECK': 'bg-orange-50 text-orange-700',
        'FULL': 'bg-red-50 text-red-600 animate-pulse'
    };
    return styles[status] || styles['IDLE'];
};
const SignalIndicator = ({ rssi, netMap }) => {
    const getSignalColor = (v) => {
        if (!netMap || !netMap['IDLE']) return 'text-slate-300';
        if (v > netMap['IDLE'].displayName) return 'text-amber-500';
        if (v > netMap['WARN'].displayName) return 'text-emerald-500';
        return 'text-rose-500';
    };
    return <Activity size={16} className={getSignalColor(rssi)} />;
};
const LevelIndicator = ({ rssi, levelMap }) => {
    if (!levelMap || !levelMap['FULL'] || !levelMap['IDLE']) return null;
    const percent = rssi;
    const safePercent = Math.min(Math.max(percent, 0), 100);
    const getSignalColor = () => {
        if (safePercent >= levelMap['FULL'].displayName) return 'bg-rose-500';
        if (safePercent >= levelMap['WARN'].displayName) return 'bg-amber-500';
        return 'bg-emerald-500';
    };
    return (
        <div className="inline-flex items-center gap-2 ml-auto">
            <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${getSignalColor()}`}
                    style={{ width: `${safePercent}%` }}
                ></div>
            </div>
            <span className="text-[11px] font-semibold text-gray-400 w-8 text-right">
                {Math.round(safePercent)}
            </span>
        </div>
    );
};
const formatDateTime = (date) => {
    if (!date || isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
};

const Monitoring = () => {
    const { tables } = useDataStore();
    const [logView, setLogView] = useState('all');
    const [selectedLogDevice, setSelectedLogDevice] = useState("");
    const [logLimit, setLogLimit] = useState(50);

    const devices = useMemo(() => {
        const rawDevices = tables?.devices || [];
        return [...rawDevices].sort((a, b) => new Date(b.last_sync || 0) - new Date(a.last_sync || 0));
    }, [tables?.devices]);
    const users = useMemo(() => tables?.users || [], [tables?.users]);
    const locations = useMemo(() => tables?.locations || [], [tables?.locations]);
    const allLogs = useMemo(() => {
        const rawLogs = tables?.waste_logs || [];
        return [...rawLogs]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, logLimit);
    }, [tables?.waste_logs, logLimit]);
    const statusMap = useMemo(() => {
        const map = {};
        (tables?.devices_status || []).forEach(loc => {
            if (loc.status) map[String(loc.status)] = { displayName: loc.reason, full: loc };
        });
        return map;
    }, [tables?.devices_status]);
    const netMap = useMemo(() => {
        const map = {};
        (tables?.net_rssi_level || []).forEach(loc => {
            if (loc.status) map[String(loc.status)] = { displayName: loc.net_rssi, full: loc };
        });
        return map;
    }, [tables?.net_rssi_level]);
    const levelMap = useMemo(() => {
        const map = {};
        (tables?.trash_level || []).forEach(loc => {
            if (loc.status) map[String(loc.status)] = { displayName: loc.level_percent, cm: loc.distance_cm, full: loc };
        });
        return map;
    }, [tables?.trash_level]);
    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-end">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Activity className="text-emerald-500" size={24} /> 디바이스 정보
                </h2>
            </div>
            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-widest">
                                <th className="px-6 py-5 font-bold">상태</th>
                                <th className="px-6 py-5 font-bold">위치 정보</th>
                                <th className="px-6 py-5 font-bold text-center">통신(RSSI)</th>
                                <th className="px-6 py-5 font-bold">품목별 적재 현황(%)</th>
                                <th className="px-6 py-5 font-bold">최근 사용자</th>
                                <th className="px-6 py-5 font-bold text-right">최근 동기화</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {devices.map((device) => (
                                <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-6">
                                        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border w-fit ${getStatusStyle(device.status)}`}>
                                            <span className="text-[11px] font-black tracking-tighter">
                                                {statusMap[device.status]?.displayName || '확인 중...'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 min-w-[200px]">
                                        <div className="flex flex-col">
                                            {(() => {
                                                const loc = locations.find(l => String(l.num) === String(device.location));
                                                return loc ? (
                                                    <>
                                                        <p className="text-sm font-black text-slate-800">{loc.city}</p>
                                                        <p className="text-[11px] text-gray-500 leading-tight">{loc.road}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm font-black text-slate-800">{device.location}</p>
                                                );
                                            })()}
                                            <p className="text-[10px] text-emerald-500 font-mono mt-1 font-bold">ID: {device.id}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <SignalIndicator rssi={device.net_rssi} netMap={netMap} />
                                            <span className="text-[10px] font-bold text-gray-500">{device.net_rssi} dBm</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 min-w-[300px]">
                                            {['trans', 'opa', 'can', 'reject'].map(type => (
                                                <div key={type} className="flex items-center justify-between text-[11px] font-bold text-gray-600 bg-slate-50 p-1.5 rounded-lg">
                                                    <span className="w-8">{type === 'trans' ? '투명' : type === 'opa' ? '불투명' : type === 'can' ? '캔' : '거부'}</span>
                                                    <LevelIndicator rssi={device[`${type}_level_pct`]} levelMap={levelMap} />
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        {(() => {
                                            if (!device.current_user_id) return '-';
                                            const foundUser = users.find(u => String(u.id) === String(device.current_user_id));
                                            return foundUser ? (
                                                <span className="text-sm font-medium text-slate-800">{foundUser.mail}</span>
                                            ) : (
                                                <span className="text-xs text-gray-400">{device.current_user_id.slice(0, 8)}...</span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        <p className="text-xs font-bold text-slate-700">{formatDateTime(new Date(device.last_sync || 0))}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="mt-8 bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Terminal size={20} className="text-emerald-400" /> SYSTEM LOG
                        </h3>
                        <div className="flex bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => { setLogView('all'); setSelectedLogDevice(""); }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${logView === 'all' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
                            >
                                전체 로그
                            </button>
                            <button
                                onClick={() => setLogView('device')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${logView === 'device' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
                            >
                                기기별 필터
                            </button>
                        </div>
                    </div>
                    {logView === 'device' && (
                        <select
                            value={selectedLogDevice}
                            onChange={(e) => setSelectedLogDevice(e.target.value)}
                            className="bg-slate-800 text-emerald-400 text-xs border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 font-bold"
                        >
                            <option value="">기기 선택...</option>
                            {devices.map(d => (
                                <option key={d.id} value={d.id}>
                                    {(() => {
                                        const loc = locations.find(l => String(l.num) === String(d.location));
                                        return loc ? `${loc.city} ${loc.road}` : `Device ${d.id}`;
                                    })()} ({d.id})
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="h-72 overflow-y-auto custom-scrollbar space-y-2 pr-2 font-mono">
                    {(() => {
                        const filteredLogs = logView === 'all'
                            ? allLogs
                            : allLogs.filter(l => String(l.device_id) === String(selectedLogDevice));
                        if (filteredLogs.length > 0) {
                            return filteredLogs.map((log) => (
                                <div key={log.num} className="flex items-center gap-4 text-[11px] py-2 border-b border-slate-800/50 hover:bg-white/5 px-2 rounded-lg">
                                    <span className="text-slate-500 w-36 font-mono text-[10px]">[{formatDateTime(new Date(log.created_at))}]</span>
                                    <span className="text-blue-400 font-bold w-20">ID: {log.device_id}</span>
                                    <span className={`px-2 py-0.5 rounded-[4px] font-black text-[9px] ${log.trash_type === 'reject' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {log.trash_type?.toUpperCase()}
                                    </span>
                                    <span className="text-slate-300 flex-1 italic truncate">
                                        {log.trash_type === 'reject' ? log.rejection_reason : `수거 완료 (${log.carbon_reduction_gram}g)`}
                                    </span>
                                </div>
                            ));
                        }
                        return (
                            <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">
                                {logView === 'device' && !selectedLogDevice ? "조회할 기기를 선택해주세요." : "로그가 없습니다."}
                            </div>
                        );
                    })()}
                    <div className="py-4 flex justify-center">
                        <button onClick={() => setLogLimit(prev => prev + 20)} className="text-[10px] font-bold text-slate-500 hover:text-emerald-400 flex items-center gap-1 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
                            <Clock3 size={12} /> 로그 더 보기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

SignalIndicator.propTypes = {
    rssi: PropTypes.number.isRequired,
    netMap: PropTypes.object.isRequired
};
LevelIndicator.propTypes = {
    rssi: PropTypes.number.isRequired,
    levelMap: PropTypes.object.isRequired
};

export default Monitoring;