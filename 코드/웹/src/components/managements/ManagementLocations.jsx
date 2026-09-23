// 설치 구역 관리 섹션
import React, { useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import useDataStore from '../../store/useDataStore';
import { MapPin, Settings, Trash2 } from 'lucide-react';
import AddLocationForm from './AddLocationForm';

const ManagementLocations = () => {
    const { tables, fetchAllData } = useDataStore();
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const locations = useMemo(() => {
        const rawLocations = tables.locations || [];
        return [...rawLocations].sort((a, b) => {
            if (a.region !== b.region) return a.region.localeCompare(b.region);
            if (a.city !== b.city) return a.city.localeCompare(b.city);
            return a.road.localeCompare(b.road);
        });
    }, [tables.locations]);

    const handleDeleteLocation = async (locationNum) => {
        if (!window.confirm(`정말로 이 위치를 삭제하시겠습니까?`)) return;
        const { error } = await supabase
            .from('locations')
            .delete()
            .eq('num', locationNum);
        if (!error) {
            await fetchAllData();
            alert("삭제되었습니다.");
        } else {
            alert("삭제 실패: " + error.message);
        }
    };
    return (
        <section className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-10 overflow-hidden">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <MapPin size={28} className="text-emerald-500" />
                        설치 구역 관리 <span className="text-sm font-bold text-slate-300 ml-2">Total : {locations.length}</span>
                    </h2>
                    <p className="text-sm text-slate-400 font-bold mt-1 ml-1">기기가 설치될 수 있는 위치 정보를 관리</p>
                </div>
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setShowForm(true);
                    }}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 group"
                >
                    <MapPin size={20} className="group-hover:scale-110 transition-transform" />
                    새 위치 추가
                </button>
            </div>

            <div className="rounded-3xl border border-gray-100 overflow-hidden bg-white shadow-inner">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-slate-50/80 backdrop-blur-md text-left text-[10px] font-black text-slate-500 border-b border-gray-100 uppercase tracking-widest">
                                <th className="py-5 px-6">No.</th>
                                <th className="py-5 px-6">도/시</th>
                                <th className="py-5 px-6">시/군/구</th>
                                <th className="py-5 px-6">상세 도로명 (건물번호 포함)</th>
                                <th className="py-5 px-6">좌표 (위도, 경도)</th>
                                <th className="py-5 px-6">세부 특징</th>
                                <th className="py-5 px-6 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {locations.map((location) => (
                                <tr key={location.num} className="group hover:bg-slate-50/30 transition-all">
                                    <td className="py-5 px-6 text-sm font-black text-slate-400">
                                        #{location.num}
                                    </td>
                                    <td className="py-5 px-6 font-bold text-slate-700 text-sm">
                                        {location.region}
                                    </td>
                                    <td className="py-5 px-6 font-bold text-slate-700 text-sm">
                                        {location.city}
                                    </td>
                                    <td className="py-5 px-6 font-medium text-slate-600 text-sm">
                                        {location.road}
                                    </td>
                                    <td className="py-5 px-6">
                                        <p className="text-[11px] font-mono font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg inline-block">
                                            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                                        </p>
                                    </td>
                                    <td className="py-5 px-6 text-sm text-slate-400 italic">
                                        {location.detail || '-'}
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditingItem(location);
                                                    setShowForm(true);
                                                }}
                                                className="p-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            >
                                                <Settings size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLocation(location.num)}
                                                className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {locations.length === 0 && (
                        <div className="py-20 text-center text-slate-300 font-bold">
                            등록된 위치 정보가 없습니다.
                        </div>
                    )}
                </div>
            </div>
            {showForm && (
                <AddLocationForm
                    onClose={() => {
                        setShowForm(false);
                        setEditingItem(null);
                    }}
                    editData={editingItem}
                />
            )}
        </section>
    );
}

export default ManagementLocations;