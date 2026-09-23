// 기기 등록, 수정, 삭제 기능 구현
import React, { useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import useDataStore from '../../store/useDataStore';
import { Settings, Smartphone, Cpu, X } from 'lucide-react';

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

const ManagementDevices = () => {
    const { tables, fetchAllData } = useDataStore();
    const [createDevice, setCreateDevice] = useState({ id: '', location: '', secret: '' });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const devices = useMemo(() => {
        const rawDevices = tables.devices || [];
        const rawLocations = tables.locations || [];
        return [...rawDevices].sort((a, b) => {
            const locA = rawLocations.find(l => String(l.num) === String(a.location));
            const locB = rawLocations.find(l => String(l.num) === String(b.location));
            const nameA = locA ? `${locA.city} ${locA.region}` : "";
            const nameB = locB ? `${locB.city} ${locB.region}` : "";
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return a.id - b.id;
        });
    }, [tables.devices, tables.locations]);
    const statusMap = useMemo(() => {
        const map = {};
        (tables.devices_status || []).forEach(item => {
            map[String(item.status)] = {
                displayName: item.reason,
                full: item
            };
        });
        return map;
    }, [tables.devices_status]);
    const locations = useMemo(() => tables.locations || [], [tables.locations]);
    const locationsOptions = useMemo(() => {
        return [...locations]
            .sort((a, b) => a.city.localeCompare(b.city))
            .map(loc => ({
                label: `${loc.city} (${loc.num})`,
                value: String(loc.num)
            }));
    }, [locations]);

    const handleCreateDevice = async () => {
        if (!createDevice.location || !createDevice.id || !createDevice.secret) {
            return alert("모든 정보를 입력해주세요. (ID, 위치, 비밀번호)");
        }
        const { error } = await supabase
            .from('devices')
            .insert({ location: createDevice.location, id: createDevice.id, secret: createDevice.secret });
        if (!error) {
            await fetchAllData();
            setIsCreateModalOpen(false);
            setCreateDevice({ id: '', location: '', secret: '' });
            alert("기기가 등록되었습니다.");
        }
    };
    const handleUpdateDevice = async () => {
        if (!editingDevice.location || !editingDevice.secret) return alert("위치와 비밀번호를 확인해주세요.");
        const originalDevice = devices.find(d => d.id === editingDevice.id);
        const isLocationChanged = String(originalDevice?.location) !== String(editingDevice.location);
        if (!window.confirm("변경사항을 저장하시겠습니까?(비밀번호는 기기에서 직접 변경해야 합니다. 위치 변경시 이전 로그와 분리됩니다.)")) return;
        try {
            if (isLocationChanged) {
                const { error: unlinkError } = await supabase
                    .from('waste_logs')
                    .update({ device_id: null })
                    .eq('device_id', editingDevice.id);

                if (unlinkError) {
                    console.error("로그 분리 실패:", unlinkError);
                    return alert("로그 데이터 처리 중 오류가 발생했습니다.");
                }
            }
            const updateData = {
                location: editingDevice.location,
                secret: editingDevice.secret,
            };
            if (isLocationChanged) {
                updateData.trans_level_pct = 0;
                updateData.opa_level_pct = 0;
                updateData.can_level_pct = 0;
                updateData.reject_level_pct = 0;
            }
            const { error: updateError } = await supabase
                .from('devices')
                .update(updateData)
                .eq('id', editingDevice.id);

            if (updateError) throw updateError;
            await fetchAllData();
            setIsEditModalOpen(false);
            if (isLocationChanged) {
                alert("기기 위치가 변경되어 이전 로그가 분리되었습니다.");
            } else {
                alert("기기 정보가 수정되었습니다.");
            }
        } catch (err) {
            console.error(err);
            alert("기기 정보 수정 중 오류가 발생했습니다.");
        }
    };
    const handleDeleteDevice = async (id) => {
        if (!window.confirm("정말로 이 기기를 삭제하시겠습니까?")) return;
        const { error } = await supabase.from('devices').delete().eq('id', id);
        if (!error) {
            await fetchAllData();
            setIsEditModalOpen(false);
            alert("삭제되었습니다.");
        } else {
            alert("삭제 실패: " + error.message);
        }
    };
    return (
        <div className="space-y-6">
            <section className="bg-white rounded-[3rem] shadow-xl border border-gray-100 p-10">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Smartphone size={28} className="text-blue-500" />
                            등록 기기 제어 <span className="text-sm font-bold text-slate-300 ml-2">Total : {devices.length}</span>
                        </h2>
                        <p className="text-sm text-slate-400 font-bold mt-1 ml-1">시스템에 연결된 모든 수거함 상태를 제어</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 group"
                    >
                        <Cpu size={20} className="group-hover:rotate-12 transition-transform" />
                        새 기기 등록
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {devices.map((device) => (
                        <div key={device.id} className="p-8 border border-gray-100 rounded-[2.5rem] bg-gray-50/40 hover:bg-white hover:shadow-2xl hover:border-blue-100 transition-all group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-8">
                                <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                                    <Smartphone size={24} className={device.status === 'RUNNING' ? 'text-emerald-500' : 'text-slate-400'} />
                                </div>
                                <span className={`text-[10px] font-black px-4 py-2 rounded-full border shadow-sm ${getStatusStyle(device.status)}`}>
                                    {statusMap[device.status]?.displayName || 'OFFLINE'}
                                </span>
                            </div>
                            <div className="mb-8">
                                <h3 className="font-black text-slate-800 text-xl mb-1">
                                    {(() => {
                                        const loc = locations.find(l => String(l.num) === String(device.location));
                                        return loc ? `${loc.city} ${loc.road}` : `위치 코드: ${device.location}`;
                                    })()}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-black">ID</span>
                                    <p className="text-sm text-gray-400 font-mono">{device.id}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {/*<button
                                    onClick={() => alert(`${device.id} 기기 재부팅 신호를 보냈습니다.`)}
                                    className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-black hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                                >
                                    원격 재부팅(구현해야함)
                                </button>*/}
                                <button
                                    onClick={() => { setEditingDevice(device); setIsEditModalOpen(true); }}
                                    className="p-4 bg-white border border-gray-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                                >
                                    <Settings size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            {(isCreateModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl animate-in zoom-in duration-300 relative">
                        <button
                            onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                            className="absolute right-8 top-8 text-slate-300 hover:text-slate-900 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <h3 className="text-2xl font-black text-slate-900 mb-8">
                            {isCreateModalOpen ? '새 기기 등록' : '기기 정보 수정'}
                        </h3>
                        <div className="space-y-8 mb-10">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">기기 고유 ID</label>
                                <input
                                    placeholder="id"
                                    value={isCreateModalOpen ? createDevice.id : (editingDevice?.id || '')}
                                    disabled={!isCreateModalOpen}
                                    readOnly={!isCreateModalOpen}
                                    onChange={e => setCreateDevice({ ...createDevice, id: e.target.value })}
                                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold transition-all outline-none
                                        ${!isCreateModalOpen
                                            ? 'opacity-60 cursor-not-allowed'
                                            : 'focus:ring-2 focus:ring-blue-500'
                                        }`}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">기기 비밀번호 (SECRET)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="기기 인증용 비밀번호"
                                        value={isCreateModalOpen ? createDevice.secret : (editingDevice?.secret || '')}
                                        onChange={e => {
                                            const val = e.target.value;
                                            isCreateModalOpen
                                                ? setCreateDevice({ ...createDevice, secret: val })
                                                : setEditingDevice({ ...editingDevice, secret: val });
                                        }}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">설치 구역(City)</label>
                                <select
                                    value={isCreateModalOpen ? createDevice.location : editingDevice?.location}
                                    onChange={e => {
                                        const val = e.target.value;
                                        isCreateModalOpen
                                            ? setCreateDevice({ ...createDevice, location: val })
                                            : setEditingDevice({ ...editingDevice, location: val });
                                    }}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 appearance-none outline-none cursor-pointer"
                                >
                                    <option value="">설치 지역 선택</option>
                                    {locationsOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            {isEditModalOpen && (
                                <button
                                    onClick={() => handleDeleteDevice(editingDevice.id)}
                                    className="px-6 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black hover:bg-rose-100 transition-all"
                                >
                                    삭제
                                </button>
                            )}
                            <button
                                onClick={isCreateModalOpen ? handleCreateDevice : handleUpdateDevice}
                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all"
                            >
                                {isCreateModalOpen ? '활성화하기' : '변경사항 저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManagementDevices;
