// 대시보드 페이지
import React, { useMemo } from "react";
import useDataStore from '../store/useDataStore';
import PropTypes from 'prop-types';
import { Leaf, Clock, MapPin, Activity } from 'lucide-react';

const StatCard = ({ label, value, color, change, highlight, danger }) => (
    <div className={`p-8 rounded-[2.5rem] shadow-sm border ${color} border-gray-100 transition-all hover:shadow-md`}>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${danger ? 'text-red-900/50' : highlight ? 'text-emerald-900/50' : 'text-gray-400'}`}>{label}</p>
        <p className="text-3xl font-black tracking-tight text-slate-900">{value}</p>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] mt-4 font-black ${danger ? 'bg-red-100 text-red-600' :
            highlight ? 'bg-emerald-100 text-emerald-600' :
                'bg-gray-100 text-gray-500'
            }`}>
            {change}
        </div>
    </div>
);
const DeviceRow = ({ time, loc, status, statusStyle }) => (
    <tr className="group hover:bg-slate-50/50 transition-all border-b border-gray-50 last:border-0">
        <td className="py-6 font-bold text-slate-500 text-xs px-4">
            <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-300" /> {time}
            </div>
        </td>
        <td className="py-6 text-slate-800 font-black text-sm px-4">
            <div className="flex items-center gap-2">
                <MapPin size={14} className="text-emerald-500" /> {loc}
            </div>
        </td>
        <td className="py-6 px-4 text-right">
            <span className={`px-4 py-2 rounded-xl text-[10px] font-black shadow-sm tracking-widest ${statusStyle}`}>
                {status}
            </span>
        </td>
    </tr>
);

const Dashboard = () => {
    const { tables, envConstants } = useDataStore();
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth() + 1;
    const prevMonth = now.getMonth() - 1;
    const startThisMonthDate = new Date(thisYear, thisMonth - 1, 1, 0, 0, 0).toISOString();
    const endThisMonthDate = new Date(thisYear, thisMonth, 0, 23, 59, 59).toISOString();
    const startPrevMonthDate = new Date(thisYear, prevMonth, 1, 0, 0, 0).toISOString();
    const endPrevMonthDate = new Date(thisYear, prevMonth + 1, 0, 23, 59, 59).toISOString();

    const thisMonthData = useMemo(() => {
        return tables.waste_logs?.filter(log =>
            log.created_at >= startThisMonthDate && log.created_at <= endThisMonthDate
        ) || [];
    }, [tables.waste_logs, startThisMonthDate, endThisMonthDate]);
    const prevMonthData = useMemo(() => {
        return tables.waste_logs?.filter(log =>
            log.created_at >= startPrevMonthDate && log.created_at <= endPrevMonthDate
        ) || [];
    }, [tables.waste_logs, startPrevMonthDate, endPrevMonthDate]);
    const devices = useMemo(() => {
        const rawDevices = tables.devices || [];
        return [...rawDevices].sort((a, b) => new Date(b.last_sync) - new Date(a.last_sync));
    }, [tables.devices]);
    const locations = useMemo(() => tables.locations || [], [tables.locations]);
    const statusMap = useMemo(() => {
        const statusStyles = {
            'IDLE': 'bg-emerald-50 text-emerald-600',
            'RUNNING': 'bg-blue-50 text-blue-600',
            'WARN': 'bg-yellow-50 text-yellow-700',
            'CHECK': 'bg-orange-50 text-orange-700',
            'FULL': 'bg-red-50 text-red-600 animate-pulse',
        };
        const map = {};
        (tables.devices_status || []).forEach(loc => {
            const key = String(loc.status);
            map[key] = {
                displayName: loc.reason || loc.status,
                styleClass: statusStyles[key] || 'bg-gray-100 text-gray-500'
            };
        });
        return map;
    }, [tables.devices_status]);

    const thisMonthCount = thisMonthData.length;
    const thisMonthCarbon = (thisMonthData.reduce((acc, cur) => acc + (cur.carbon_reduction_gram || 0), 0) / 1000);
    const thisMonthReject = thisMonthData.filter(item => item.trash_type === 'reject').length;
    const thisMonthRate = thisMonthCount > 0 ? ((1 - (thisMonthReject / thisMonthCount)) * 100).toFixed(1) : "0.0";
    const prevMonthCount = prevMonthData.length;
    const prevMonthCarbon = (prevMonthData.reduce((acc, cur) => acc + (cur.carbon_reduction_gram || 0), 0) / 1000);
    const prevMonthReject = prevMonthData.filter(item => item.trash_type === 'reject').length;
    const prevMonthRate = prevMonthCount > 0 ? ((1 - (prevMonthReject / prevMonthCount)) * 100).toFixed(1) : "0.0";
    const avgCarbonPerDevice = devices.length > 0 ? (thisMonthCarbon / devices.length).toFixed(2) : "0.00";
    const treeEquivalent = (thisMonthCarbon / envConstants.CO2_TREE_RATIO).toFixed(1);

    const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? "신규 데이터" : "데이터 없음";
        const diff = ((current - previous) / previous * 100).toFixed(1);
        return `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}% 전월 대비`;
    };
    return (
        <div className="pb-20 animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-8 px-2">
                <div className="bg-slate-100 px-5 py-2.5 rounded-2xl text-[11px] font-black text-slate-500 shadow-inner">
                    {new Date(startThisMonthDate).toLocaleDateString()} - {new Date(endThisMonthDate).toLocaleDateString()}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    label="총 수거 횟수"
                    value={`${thisMonthCount.toLocaleString()} 회`}
                    color="bg-white"
                    change={calculateTrend(thisMonthCount, prevMonthCount)}
                    highlight={thisMonthCount >= prevMonthCount}
                    danger={thisMonthCount < prevMonthCount}
                />
                <StatCard
                    label="총 탄소 저감량"
                    value={`${thisMonthCarbon.toFixed(1)} kg`}
                    color="bg-emerald-50/50"
                    change={calculateTrend(thisMonthCarbon, prevMonthCarbon)}
                    highlight
                />
                <StatCard
                    label="정상 수거율"
                    value={`${thisMonthRate}%`}
                    color="bg-white"
                    change={calculateTrend(Number(thisMonthRate), Number(prevMonthRate))}
                    highlight={Number(thisMonthRate) >= Number(prevMonthRate)}
                    danger={Number(thisMonthRate) < Number(prevMonthRate)}
                />
                <StatCard
                    label="거부 건수"
                    value={`${thisMonthReject} 회`}
                    color="bg-red-50/30"
                    change={calculateTrend(thisMonthReject, prevMonthReject)}
                    highlight={thisMonthReject <= prevMonthReject}
                    danger={thisMonthReject > prevMonthReject}
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-sm border border-gray-100 p-10">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-xl font-black text-slate-950 flex items-center gap-3">
                            <Activity className="text-blue-500" size={24} /> 기기 운용 현황
                            <span className="text-xs font-bold text-slate-300 ml-2">{devices.length}대</span>
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-slate-400 border-b border-gray-50 text-[10px] font-black uppercase tracking-widest">
                                    <th className="pb-6 px-4">마지막 작동 시간</th>
                                    <th className="pb-6 px-4">설치 위치</th>
                                    <th className="pb-6 px-4 text-right">상태</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {devices.length > 0 ? (
                                    devices.map((device) => {
                                        const statusData = statusMap[String(device.status)];
                                        const loc = locations.find(l => String(l.num) === String(device.location));
                                        return (
                                            <DeviceRow
                                                key={device.id}
                                                time={new Date(device.last_sync).toLocaleString('ko-KR', {
                                                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
                                                })}
                                                loc={loc ? `${loc.city} ${loc.road}` : `기기 ID: ${device.id}`}
                                                status={statusData?.displayName || device.status}
                                                statusStyle={statusData?.styleClass || 'bg-gray-100 text-gray-500'}
                                            />
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="py-20 text-center text-slate-300 font-bold">등록된 기기 데이터가 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
                    <div className="relative z-10">
                        <div className="bg-emerald-500 w-12 h-12 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
                            <Leaf size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black mb-10 leading-tight">이번 달<br />ESG 성과 보고</h2>

                        <div className="space-y-10">
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">기기 1대당 평균 저감량</p>
                                <p className="text-4xl font-black">{avgCarbonPerDevice}<span className="text-lg ml-1 text-slate-500">kg</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">소나무 식재 효과</p>
                                <p className="text-4xl font-black">{treeEquivalent}<span className="text-lg ml-1 text-slate-500">그루</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 pt-10 border-t border-white/10 mt-10">
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">
                            * 탄소 저감량 {envConstants.CO2_TREE_RATIO}kg당 소나무 1그루 식재 효과와 동일한 가치를 지닙니다.
                        </p>
                    </div>

                    <Leaf size={200} className='absolute -bottom-20 -right-20 text-emerald-500/10 rotate-12 pointer-events-none' />
                </div>
            </div>
        </div>
    );
};

StatCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    color: PropTypes.string.isRequired,
    change: PropTypes.string.isRequired,
    highlight: PropTypes.bool,
    danger: PropTypes.bool
};
DeviceRow.propTypes = {
    time: PropTypes.string.isRequired,
    loc: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    statusStyle: PropTypes.string.isRequired
};

export default Dashboard;