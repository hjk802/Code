// ESG 리포트 페이지
import React, { useState, useMemo, useEffect } from "react";
import useDataStore from '../store/useDataStore';
import { Activity, BarChart3, AlertCircle, Cpu } from 'lucide-react';

const ESGReport = () => {
    const { tables, envConstants } = useDataStore();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [reportData, setReportData] = useState([]);
    const [totalCarbon, setTotalCarbon] = useState(0);
    const [allAvailableYears, setAllAvailableYears] = useState([new Date().getFullYear()]);
    const treeEquivalent = totalCarbon > 0 ? (totalCarbon / envConstants.CO2_TREE_RATIO).toFixed(1) : "0.0";

    const devices = useMemo(() => {
        const rawDevices = tables.devices || [];
        return [...rawDevices].sort((a, b) => {
            return a.id - b.id;
        });
    }, [tables.devices]);
    const locations = useMemo(() => {
        const rawLocations = tables?.locations || [];
        return [...rawLocations].sort((a, b) => {
            return (a.region || 0) - (b.region || 0);
        });
    }, [tables?.locations]);
    const currentData = useMemo(() => {
        const startDate = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0).toISOString();
        const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
        return tables.waste_logs?.filter(log =>
            log.created_at >= startDate && log.created_at <= endDate
        ) || [];
    }, [tables.waste_logs, selectedYear, selectedMonth]);
    const availableYears = useMemo(() => {
        const logs = tables?.waste_logs || [];
        const years = logs.map(log =>
            log.created_at ? new Date(log.created_at).getFullYear() : new Date().getFullYear()
        );
        const uniqueYears = [...new Set(years)];
        return uniqueYears.length > 0 ? uniqueYears.sort((a, b) => b - a) : [new Date().getFullYear()];
    }, [tables?.waste_logs]);
    const esgStats = useMemo(() => {
        const defaultStats = {
            successCount: 0, rejectCount: 0, successRate: 0, rejectRate: 0,
            sortedTypeData: [], sortedRejectReasons: [],
            deviceUsageData: devices.map(d => ({ id: d.id, location: d.location, count: 0 }))
        };
        if (!reportData || reportData.length === 0) return defaultStats;
        const total = reportData.length;
        const successLogs = reportData.filter(log => log.trash_type !== 'reject');
        const rejectLogs = reportData.filter(log => log.trash_type === 'reject');
        const sCount = successLogs.length;
        const rCount = rejectLogs.length;
        const sRate = ((sCount / total) * 100).toFixed(1);
        const rRate = ((rCount / total) * 100).toFixed(1);
        const typeMap = {};
        successLogs.forEach(log => {
            const type = log.trash_type || 'unknown';
            typeMap[type] = (typeMap[type] || 0) + 1;
        });
        const sortedTypeData = Object.entries(typeMap)
            .map(([type, count]) => ({
                type,
                count,
                percentage: ((count / sCount) * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count);
        const reasonMap = {};
        rejectLogs.forEach(log => {
            const reason = log.rejection_reason || 'etc';
            reasonMap[reason] = (reasonMap[reason] || 0) + 1;
        });
        const sortedRejectReasons = Object.entries(reasonMap)
            .map(([reason, count]) => ({
                reason,
                count,
                percentage: ((count / rCount) * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count);
        const deviceLogCounts = {};
        reportData.forEach(log => {
            deviceLogCounts[log.device_id] = (deviceLogCounts[log.device_id] || 0) + 1;
        });
        const deviceUsageData = devices.map(d => ({
            id: d.id,
            location: d.location,
            count: deviceLogCounts[d.id] || 0
        })).sort((a, b) => b.count - a.count);
        return {
            successCount: sCount,
            rejectCount: rCount,
            successRate: sRate,
            rejectRate: rRate,
            sortedTypeData,
            sortedRejectReasons,
            deviceUsageData
        };
    }, [reportData, devices]);
    const {
        successCount: esgSuccessCount,
        rejectCount: esgRejectCount,
        successRate: esgSuccessRate,
        rejectRate: esgRejectRate,
        sortedTypeData,
        sortedRejectReasons,
        deviceUsageData
    } = esgStats;

    useEffect(() => {
        if (!currentData) return;
        setReportData(currentData);
        setTotalCarbon(currentData.reduce((acc, cur) => acc + (cur.carbon_reduction_gram || 0), 0) / 1000);
    }, [currentData]);
    useEffect(() => {
        if (availableYears) {
            setAllAvailableYears(availableYears);
        }
    }, [availableYears]);
    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-4">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-slate-100 border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {allAvailableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                        </select>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-slate-100 border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{m}월</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-gray-400 font-bold text-xs mb-2">총 탄소 저감량</p>
                    <p className="text-3xl font-black text-emerald-600">{totalCarbon.toFixed(2)} kg</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-gray-400 font-bold text-xs mb-2">소나무 식재 효과</p>
                    <p className="text-3xl font-black text-emerald-600">{treeEquivalent} 그루</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mt-8">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-emerald-500" /> 수거 및 거부 비율
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-bold text-gray-600">정상 수거</span>
                                <span className="text-xl font-black text-emerald-600">{esgSuccessCount}회 ({esgSuccessRate}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${esgSuccessRate}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-bold text-gray-600">거부 발생</span>
                                <span className="text-xl font-black text-red-500">{esgRejectCount}회 ({esgRejectRate}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                <div className="bg-red-500 h-full transition-all" style={{ width: `${esgRejectRate}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-500" /> 타입별 수거 비중
                    </h3>
                    <div className="space-y-4">
                        {sortedTypeData.map((item, index) => (
                            <div key={item.type} className="flex items-center gap-4">
                                <span className="w-6 font-black text-gray-300 italic">{index + 1}</span>
                                <span className="w-20 text-sm font-bold text-gray-700">{item.type.toUpperCase()}</span>
                                <div className="flex-1 bg-gray-50 h-8 rounded-lg flex items-center px-3 gap-2">
                                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                                    <span className="text-[11px] font-bold text-blue-600">{item.percentage}%</span>
                                </div>
                                <span className="text-sm font-black text-gray-800">{item.count}회</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                        <AlertCircle size={20} className="text-amber-500" /> 주요 거부 사유 순위
                    </h3>
                    <div className="space-y-4">
                        {sortedRejectReasons.map((item, index) => (
                            <div key={item.reason} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        {index + 1}
                                    </span>
                                    <span className="text-sm font-bold text-slate-700">{item.reason}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900">{item.count}건</p>
                                    <p className="text-[10px] font-bold text-slate-400">{item.percentage}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                        <Cpu size={20} className="text-purple-500" /> 기기별 이용 빈도
                    </h3>
                    <div className="max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white">
                                <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                    <th className="pb-3 px-2">기기 위치(아이디)</th>
                                    <th className="pb-3 text-right">총 작동 횟수</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {deviceUsageData.map((device) => (
                                    <tr key={device.id} className="group">
                                        <td className="py-3 px-2 text-sm font-bold text-gray-700">
                                            {(() => {
                                                const loc = locations.find(l => String(l.num) === String(device.location));
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-900 font-black">{loc ? `${loc.city}` : '알 수 없는 위치'}</span>
                                                        <span className="text-[11px] text-slate-400 font-medium leading-tight">
                                                            {loc ? loc.road : `ID: ${device.location}`}
                                                        </span>
                                                        <span className="text-[10px] text-slate-300">({device.id})</span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-4 px-2 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-base font-black text-slate-800">
                                                    {device.count.toLocaleString()} <span className="text-[11px] text-slate-400 font-bold ml-0.5">회</span>
                                                </span>
                                                <div className="w-16 bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className="bg-purple-400 h-full"
                                                        style={{
                                                            width: `${Math.min((device.count / (deviceUsageData[0]?.count || 1)) * 100, 100)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ESGReport;