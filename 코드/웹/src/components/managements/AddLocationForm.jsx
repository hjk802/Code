// 위치 관리 섹션 중 위치 추가 및 수정
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import useDataStore from '../../store/useDataStore';
import DaumPostcodeEmbed from 'react-daum-postcode';
import { Search, Save, X, Info } from 'lucide-react';
import PropTypes from 'prop-types';

const AddLocationForm = ({ onClose, editData }) => {
  const { fetchAllData } = useDataStore();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    lat: '', lng: '', sido: '', sigungu: '', road: '', detail: '', address: ''
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        lat: editData.latitude,
        lng: editData.longitude,
        sido: editData.region,
        sigungu: editData.city,
        road: editData.road,
        detail: editData.detail || '',
        address: `${editData.region} ${editData.city} ${editData.road}`
      });
    }
  }, [editData]);

  const handleComplete = (data) => {
    const fullAddress = data.roadAddress;
    let finalRoad = data.roadname;
    if (data.main_building_no) {
      finalRoad += ` ${data.main_building_no}`;
      if (data.sub_building_no && data.sub_building_no !== '0') {
        finalRoad += `-${data.sub_building_no}`;
      }
      if (data.buildingName) {
        finalRoad += ` (${data.buildingName})`;
      }
    } else {
      const addrParts = fullAddress.split(' ');
      finalRoad = addrParts.slice(2).join(' ');
      if (data.buildingName && !finalRoad.includes(data.buildingName)) {
        finalRoad += ` (${data.buildingName})`;
      }
    }
    console.log("DB에 저장될 최종 도로명(수정후):", finalRoad);
    setFormData(prev => ({
      ...prev,
      address: fullAddress,
      sido: data.sido,
      sigungu: data.sigungu,
      road: finalRoad
    }));
    setIsOpen(false);
  };
  const handleSubmit = async () => {
    const { lat, lng, sido, sigungu, road, detail } = formData;
    if (!sido || !sigungu || !road) return alert("주소를 검색해주세요.");
    const currentPayload = {
      latitude: parseFloat(Number(lat).toFixed(6)),
      longitude: parseFloat(Number(lng).toFixed(6)),
      region: sido,
      city: sigungu,
      road: road,
      detail: detail || null,
    };
    let result;
    if (editData) {
      result = await supabase.from('locations').update(currentPayload).eq('num', editData.num);
    } else {
      result = await supabase.from('locations').insert([currentPayload]);
    }
    if (result.error) {
      alert(`오류 발생: ${result.error.message}`);
    } else {
      await fetchAllData();
      alert(editData ? "위치 정보가 수정되었습니다." : "새로운 위치가 등록되었습니다.");
      onClose();
    }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative p-8 w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center sticky top-0 bg-white pb-2 z-10">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-800">
            {editData ? "위치 수정" : "위치 추가"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <input
                type="number" placeholder="위도"
                className="w-full border-none bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <input
                type="number" placeholder="경도"
                className="w-full border-none bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-1 ml-1">
            <Info size={12} /> 좌표는 구글 지도 등에서 확인 후 입력
          </p>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Search size={18} /> {formData.address ? "주소 다시 찾기" : "도로명 주소 검색"}
          </button>
          {isOpen && (
            <div className="border-2 border-slate-100 rounded-2xl mt-2 overflow-hidden animate-in slide-in-from-top-2">
              <DaumPostcodeEmbed
                onComplete={handleComplete}
                style={{ height: '450px' }}
              />
            </div>
          )}
          {formData.address && !isOpen && (
            <div className="bg-emerald-50 p-4 border border-emerald-100 rounded-2xl">
              <p className="text-xs text-emerald-800 font-bold">{formData.address}</p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Details</label>
          <input
            type="text" placeholder="예: 건물 1층 로비, 정문 우측 등"
            className="w-full border-none bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            value={formData.detail}
            onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
          />
        </div>
        <button
          onClick={handleSubmit}
          className="w-full bg-emerald-500 text-white p-5 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 active:scale-[0.98]"
        >
          <Save size={22} /> {editData ? "수정 완료" : "위치 등록하기"}
        </button>
      </div>
    </div>
  );
};

AddLocationForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  editData: PropTypes.object,
};

export default AddLocationForm;