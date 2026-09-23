// 시스템의 기준과 상태 사유를 설정하는 섹션
import React, { useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import useDataStore from '../../store/useDataStore';
import { X, Save, AlertCircle, Settings } from 'lucide-react';
import PropTypes from 'prop-types';

const ModalLayout = ({ title, isOpen, onClose, onSave, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        {title}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                    {children}
                </div>
                <div className="p-8 pt-4 bg-slate-50 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black hover:bg-slate-100 transition-all">
                        취소
                    </button>
                    <button onClick={onSave} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-emerald-600 shadow-lg transition-all flex items-center justify-center gap-2">
                        <Save size={18} /> 저장하기
                    </button>
                </div>
            </div>
        </div>
    );
};

const ManagementSettings = () => {
    const { tables, fetchAllData } = useDataStore();
    const [editingStatus, setEditingStatus] = useState([]);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState([]);
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [editingRssi, setEditingRssi] = useState([]);
    const [isRssiModalOpen, setIsRssiModalOpen] = useState(false);
    const [editingStandard, setEditingStandard] = useState([]);
    const [isStandardModalOpen, setIsStandardModalOpen] = useState(false);

    const editRssi = useMemo(() => [...(tables.net_rssi_level || [])].sort((a, b) => a.num - b.num), [tables.net_rssi_level]);
    const editLevel = useMemo(() => [...(tables.trash_level || [])].sort((a, b) => a.num - b.num), [tables.trash_level]);
    const editDeviceStatus = useMemo(() => [...(tables.devices_status || [])].sort((a, b) => a.num - b.num), [tables.devices_status]);
    const editStandard = useMemo(() => [...(tables.point_carbon_pergram || [])].sort((a, b) => a.num - b.num), [tables.point_carbon_pergram]);

    const handleUpdateRssi = async () => {
        const { error } = await supabase
            .from('net_rssi_level')
            .upsert(
                editingRssi.map(item => ({
                    num: Number(item.num),
                    net_rssi: Number(item.net_rssi),
                    status: item.status,
                    explain: item.explain
                }))
            );
        if (!error) {
            await fetchAllData();
            setIsRssiModalOpen(false);
            alert("신호 기준 정보가 업데이트되었습니다.");
        } else {
            alert("수정 실패: " + error.message);
        }
    };
    const handleUpdateStandard = async () => {
        const { error } = await supabase
            .from('point_carbon_pergram')
            .upsert(
                editingStandard.map(item => ({
                    num: Number(item.num),
                    type: item.type,
                    point: Number(item.point),
                    carbon_gram: Number(item.carbon_gram)
                }))
            );
        if (!error) {
            await fetchAllData();
            setIsStandardModalOpen(false);
            alert("포인트/탄소 저감량 기준 정보가 업데이트되었습니다.");
        } else {
            alert("수정 실패: " + error.message);
        }
    };
    const handleUpdateLevel = async () => {
        const { error } = await supabase
            .from('trash_level')
            .upsert(
                editingLevel.map(item => ({
                    num: Number(item.num),
                    distance_cm: Number(item.distance_cm),
                    level_percent: Number(item.level_percent)
                }))
            );
        if (!error) {
            await fetchAllData();
            setIsLevelModalOpen(false);
            alert("적재량 기준이 업데이트되었습니다.");
        } else {
            alert("수정 실패: " + error.message);
        }
    };
    const handleUpdateStatus = async () => {
        if (editingStatus.some(item => !item.reason?.trim())) {
            return alert("모든 상태의 사유를 입력해주세요.");
        }
        const { error } = await supabase
            .from('devices_status')
            .upsert(
                editingStatus.map(item => ({
                    num: Number(item.num),
                    status: item.status,
                    reason: item.reason
                }))
            );

        if (!error) {
            await fetchAllData();
            setIsStatusModalOpen(false);
            alert("상태 사유 정보가 업데이트되었습니다.");
        } else {
            alert("수정 실패: " + error.message);
        }
    };
    return (
        <div className="space-y-6">
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-wrap justify-between items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Settings size={28} className="text-blue-500" />
                            시스템 설정
                        </h2>
                        <p className="text-sm text-slate-400 font-bold mt-1 ml-1">판단 기준, 상태 사유 관리</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setEditingStandard(editStandard); setIsStandardModalOpen(true); }}
                            className="px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all shadow-sm hover:-translate-y-0.5 active:scale-95 bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                            포인트/탄소 저감량 기준
                        </button>
                        <button
                            onClick={() => { setEditingRssi(editRssi); setIsRssiModalOpen(true); }}
                            className="px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all shadow-sm hover:-translate-y-0.5 active:scale-95 bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                            신호 기준
                        </button>
                        <button
                            onClick={() => { setEditingLevel(editLevel); setIsLevelModalOpen(true); }}
                            className="px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all shadow-sm hover:-translate-y-0.5 active:scale-95 bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                            적재 기준
                        </button>
                        <button
                            onClick={() => { setEditingStatus(editDeviceStatus); setIsStatusModalOpen(true); }}
                            className="px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all shadow-sm hover:-translate-y-0.5 active:scale-95 bg-slate-900 text-white hover:bg-emerald-600"
                        >
                            상태 사유
                        </button>
                    </div>
                </div>
            </section>
            <ModalLayout title="1G당 포인트/탄소 저감량 기준 변경" isOpen={isStandardModalOpen} onClose={() => setIsStandardModalOpen(false)} onSave={handleUpdateStandard}>
                <div className="space-y-4">
                    {editingStandard.map((item) => (
                        <div key={item.num} className="bg-slate-50 p-5 rounded-2xl flex items-center justify-between gap-4">
                            <span className="font-black text-slate-400 w-30">{item.type}</span>
                            <div className="flex gap-4 w-full">
                                <div className="relative w-full">
                                    <input
                                        type="number"
                                        value={item.point || ''}
                                        onChange={e => setEditingStandard(prev => prev.map(p => p.num === item.num ? { ...p, point: e.target.value } : p))}
                                        className="w-full bg-white border-2 border-transparent focus:border-emerald-500 p-4 rounded-xl text-sm font-bold outline-none transition-all pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">P</span>
                                </div>
                                <div className="relative w-full">
                                    <input
                                        type="number"
                                        value={item.carbon_gram || ''}
                                        onChange={e => setEditingStandard(prev => prev.map(p => p.num === item.num ? { ...p, carbon_gram: e.target.value } : p))}
                                        className="w-full bg-white border-2 border-transparent focus:border-emerald-500 p-4 rounded-xl text-sm font-bold outline-none transition-all pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">G</span>
                                </div>

                            </div>

                        </div>
                    ))}
                </div>
            </ModalLayout>
            <ModalLayout title="통신 신호 세기 기준 변경" isOpen={isRssiModalOpen} onClose={() => setIsRssiModalOpen(false)} onSave={handleUpdateRssi}>
                <div className="space-y-4">
                    {editingRssi.map((item) => (
                        <div key={item.num} className="bg-slate-50 p-5 rounded-2xl flex items-center justify-between gap-4">
                            <span className="font-black text-slate-400 w-16">{item.status}</span>
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    value={item.net_rssi || ''}
                                    onChange={e => setEditingRssi(prev => prev.map(p => p.num === item.num ? { ...p, net_rssi: e.target.value } : p))}
                                    className="w-full bg-white border-2 border-transparent focus:border-emerald-500 p-4 rounded-xl text-sm font-bold outline-none transition-all pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">dBm</span>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2 text-[11px] text-amber-600 font-bold bg-amber-50 p-4 rounded-xl italic">
                        <AlertCircle size={14} /> RSSI 값은 보통 마이너스(-)로 입력되며, 0에 가까울수록 강함
                    </div>
                </div>
            </ModalLayout>
            <ModalLayout title="적재량 판단 기준 변경" isOpen={isLevelModalOpen} onClose={() => setIsLevelModalOpen(false)} onSave={handleUpdateLevel}>
                <div className="space-y-4">
                    {editingLevel.map((item) => (
                        <div key={item.num} className="bg-slate-50 p-6 rounded-3xl space-y-3 border border-slate-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.status || '레벨 정보'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 ml-1">거리 (cm)</label>
                                    <input
                                        type="number"
                                        disabled={item.num === 2}
                                        value={item.distance_cm || ''}
                                        onChange={e => setEditingLevel(prev => prev.map(p => p.num === item.num ? { ...p, distance_cm: e.target.value } : p))}
                                        className="w-full p-4 bg-white rounded-xl text-sm font-black disabled:opacity-50 border-2 border-transparent focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 ml-1">표시 (%)</label>
                                    <input
                                        type="number"
                                        disabled={item.num !== 2}
                                        value={item.level_percent || ''}
                                        onChange={e => setEditingLevel(prev => prev.map(p => p.num === item.num ? { ...p, level_percent: e.target.value } : p))}
                                        className="w-full p-4 bg-white rounded-xl text-sm font-black disabled:opacity-50 border-2 border-transparent focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ModalLayout>
            <ModalLayout title="기기 상태 사유 설명 수정" isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} onSave={handleUpdateStatus}>
                <div className="space-y-3">
                    {editingStatus.map((item) => (
                        <div key={item.num} className="group space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <span className="text-xs font-black text-slate-500">{item.status}</span>
                                <span className="text-[10px] text-slate-300 font-mono">Code: {item.num}</span>
                            </div>
                            <input
                                type="text"
                                placeholder="관리자가 식별할 사유를 입력하세요"
                                value={item.reason || ''}
                                onChange={e => setEditingStatus(prev => prev.map(p => p.num === item.num ? { ...p, reason: e.target.value } : p))}
                                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-slate-900 rounded-2xl text-sm font-bold outline-none transition-all"
                            />
                        </div>
                    ))}
                </div>
            </ModalLayout>
        </div>
    );
}

ModalLayout.propTypes = {
    title: PropTypes.string.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    children: PropTypes.node
};

export default ManagementSettings;