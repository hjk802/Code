// 데이터 스토어 (Zustand)
import { create } from 'zustand';
import { supabase } from '../supabaseClient';

const useDataStore = create((set, get) => ({
    tables: {
        devices: [],
        users: [],
        devices_status: [],
        locations: [],
        net_rssi_level: [],
        rejection_reason: [],
        trash_level: [],
        trash_types: [],
        waste_logs: [],
        point_carbon_pergram: []
    },
    isLoading: false,
    envConstants: {
        CO2_TREE_RATIO: 6.6,
    },
    fetchAllData: async () => {
        set({ isLoading: true });
        const tableNames = [
            'devices', 'devices_status', 'locations', 'net_rssi_level', 'rejection_reason', 'trash_level', 'trash_types', 'users', 'waste_logs', 'point_carbon_pergram'
        ];
        try {
            const results = await Promise.all(
                tableNames.map(name => {
                    let query = supabase.from(name).select('*');
                    if (name === 'waste_logs') {
                        query = query.not('point_earned', 'is', null);
                    }
                    return query;
                })
            );
            const newTables = {};
            tableNames.forEach((name, index) => {
                newTables[name] = results[index].data || [];
            });
            set({ tables: newTables, isLoading: false });
        } catch (error) {
            console.error("데이터 로드 실패:", error);
            set({ isLoading: false });
        }
    },

    enableRealtime: () => {
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                (payload) => {
                    console.log('실시간 변경 감지:', payload.table);
                    get().refreshTable(payload.table);
                }
            )
            .subscribe();
        return () => supabase.removeChannel(channel);
    },
    refreshTable: async (tableName) => {
        const { data } = await supabase.from(tableName).select('*');
        set((state) => ({
            tables: { ...state.tables, [tableName]: data || [] }
        }));
    }
}));

export default useDataStore;