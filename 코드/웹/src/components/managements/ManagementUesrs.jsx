// 회원 관리 섹션
import React, { useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import useDataStore from '../../store/useDataStore';
import { Users, Search, Settings, Trash2, X, ChevronDown } from 'lucide-react';

const ManagementUsers = () => {
    const { tables, fetchAllData } = useDataStore();
    const [editingUser, setEditingUser] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const users = useMemo(() => {
        const rawUsers = tables?.users || [];
        return [...rawUsers].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at) : 0;
            const dateB = b.created_at ? new Date(b.created_at) : 0;
            return dateB - dateA;
        });
    }, [tables?.users]);

    const filteredUsers = useMemo(() => {
        return (users || []).filter(user =>
            user && (
                user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.mail?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [users, searchTerm]);

    const handleUpdateUser = async () => {
        if (!editingUser?.id) return;
        if (!editingUser.name) return alert("이름을 입력해주세요.");
        const { error } = await supabase
            .from('users')
            .update({
                name: editingUser.name,
                role: editingUser.role,
                total_points: Number(editingUser.total_points),
                total_carbon_reduction_gram: Number(editingUser.total_carbon_reduction_gram)
            })
            .eq('id', editingUser.id);
        if (!error) {
            await fetchAllData();
            setIsUserModalOpen(false);
            alert("회원 정보가 성공적으로 수정되었습니다.");
        } else {
            alert("수정 실패: " + error.message);
        }
    };
    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`정말로 ${userName} 회원을 삭제하시겠습니까?`)) return;
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        if (!error) {
            await fetchAllData();
            alert("삭제되었습니다.");
        } else {
            alert("삭제 실패: " + error.message);
        }
    };
    return (
        <div className="space-y-6">
            <section className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 mt-6">
                <div className="flex flex-wrap justify-between items-center mb-10 gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Users size={32} className="text-emerald-500" /> 회원 관리
                            <span className="text-sm font-bold text-slate-300 ml-2">Total : {users.length}</span>
                        </h2>
                        <p className="text-sm text-slate-400 font-bold mt-1 ml-1">이름/등급 관리, 포인트/탄소저감량 조정</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="이름 또는 이메일 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 w-80 font-bold shadow-inner outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-[11px] font-black text-slate-400 border-b border-gray-50 uppercase tracking-[0.2em]">
                                <th className="pb-6 px-4">사용자</th>
                                <th className="pb-6 px-4">역할</th>
                                <th className="pb-6 px-4">탄소 저감량</th>
                                <th className="pb-6 px-4">보유 포인트</th>
                                <th className="pb-6 px-4">가입일</th>
                                <th className="pb-6 text-right px-4">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="py-6 px-4">
                                        <div>
                                            <p className="font-black text-slate-800">{user.name}</p>
                                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user.mail}</p>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${user.role === 'admin'
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-1.5 font-black text-emerald-600">
                                            <span className="text-base">{(user.total_carbon_reduction_gram / 1000).toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                                            <span className="text-[10px] text-emerald-400">KG</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-1.5 font-black text-slate-700">
                                            <span className="text-base">{user.total_points?.toLocaleString() || 0}</span>
                                            <span className="text-[10px] text-slate-300">P</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-slate-400 text-xs font-bold">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-6 text-right px-4">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }}
                                                className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                title="수정"
                                            >
                                                <Settings size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="삭제"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                        <div className="py-24 text-center">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="text-slate-200" size={32} />
                            </div>
                            <p className="text-slate-400 font-bold">검색 결과와 일치하는 회원이 없습니다.</p>
                        </div>
                    )}
                </div>
            </section>
            {isUserModalOpen && editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">회원 정보 수정</h3>
                            </div>
                            <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-5 mb-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">사용자 이름</label>
                                <input
                                    value={editingUser.name || ''}
                                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 text-sm font-bold outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">사용자 역할</label>
                                <div className="relative">
                                    <select
                                        value={editingUser.role || ''}
                                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 appearance-none outline-none"
                                    >
                                        <option value="user">user (일반 사용자)</option>
                                        <option value="admin">admin (시스템 관리자)</option>
                                    </select>
                                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50 mt-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">포인트 (P)</label>
                                    <input
                                        type="number"
                                        value={editingUser.total_points || 0}
                                        onChange={e => setEditingUser({ ...editingUser, total_points: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">저감량 (g)</label>
                                    <input
                                        type="number"
                                        value={editingUser.total_carbon_reduction_gram || 0}
                                        onChange={e => setEditingUser({ ...editingUser, total_carbon_reduction_gram: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black hover:bg-slate-100 transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-emerald-600 shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                            >
                                저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagementUsers;