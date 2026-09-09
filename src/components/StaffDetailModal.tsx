import React, { useState, useEffect } from 'react';
import { 
  X, Phone, Mail, MapPin, Calendar, Star, DollarSign, Award, Clock, 
  CheckCircle, AlertCircle, RefreshCw, Edit2, Shield, Plus, Minus,
  ExternalLink, Check, Briefcase, Navigation, UserCheck, MessageSquare, History
} from 'lucide-react';
import { Staff, User, Service, Booking, Review, CreditTransaction } from '../types';

interface StaffDetailModalProps {
  staffId: string;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshStaffList: () => void;
}

export default function StaffDetailModal({
  staffId,
  onClose,
  onShowToast,
  onRefreshStaffList
}: StaffDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    staff: any;
    bookings: any[];
    reviews: any[];
    transactions: any[];
    services: Service[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'services' | 'wallet' | 'bookings' | 'reviews'>('profile');
  
  // Credit adjust form state
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [creditType, setCreditType] = useState<'Topup' | 'Deduct'>('Topup');
  const [creditRemark, setCreditRemark] = useState<string>('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  // Edit Staff details state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Booking status filter
  const [bookingFilter, setBookingFilter] = useState<string>('All');

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/staff/${staffId}/details`);
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลพนักงานได้');
      const json = await res.json();
      setData(json);
      setEditForm({
        name: json.staff.Name || '',
        phone: json.staff.Phone || '',
        email: json.staff.Email || '',
        nickname: json.staff.Nickname || '',
        gender: json.staff.Gender || 'Female',
        age: json.staff.Age || 30,
        weight: json.staff.Weight || 50,
        height: json.staff.Height || 160,
        experience: json.staff.Experience || 1,
        description: json.staff.Description || '',
        registeredAddress: json.staff.RegisteredAddress || '',
        address: json.staff.Address || '',
        province: json.staff.Province || '',
        district: json.staff.District || '',
        subDistrict: json.staff.SubDistrict || '',
        maxJobDistance: json.staff.MaxJobDistance || 15,
        verifyStatus: json.staff.VerifyStatus || 'Approved',
        available: json.staff.Available || 'OFF',
        status: json.staff.UserStatus || 'Active',
        offeredServices: json.staff.OfferedServices || json.services.map((s: Service) => s.ServiceID)
      });
    } catch (err: any) {
      onShowToast(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      fetchDetails();
    }
  }, [staffId]);

  const handleAdjustCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creditAmount <= 0) {
      onShowToast('กรุณาระบุจำนวนเครดิตที่มากกว่า 0', 'error');
      return;
    }

    try {
      setIsSubmittingCredit(true);
      const res = await fetch(`/api/admin/staff/${staffId}/credit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: creditAmount,
          type: creditType,
          remark: creditRemark
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'ปรับยอดเครดิตไม่สำเร็จ');

      onShowToast(`✅ ${creditType === 'Topup' ? 'เพิ่ม' : 'หัก'}เครดิต ${creditAmount} CR สำเร็จแล้ว`, 'success');
      setCreditAmount(100);
      setCreditRemark('');
      fetchDetails();
      onRefreshStaffList();
    } catch (err: any) {
      onShowToast(err.message || 'เกิดข้อผิดพลาดในการปรับเครดิต', 'error');
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingEdit(true);
      const res = await fetch(`/api/admin/staff/${staffId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บันทึกข้อมูลไม่สำเร็จ');

      onShowToast('✅ บันทึกและอัปเดตข้อมูลพนักงานเรียบร้อยแล้ว', 'success');
      setIsEditing(false);
      fetchDetails();
      onRefreshStaffList();
    } catch (err: any) {
      onShowToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!data?.staff) return;
    const newStatus = data.staff.Available === 'ON' ? 'OFF' : 'ON';
    try {
      const res = await fetch('/api/staff/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, available: newStatus })
      });
      const resData = await res.json().catch(() => null);
      if (res.ok) {
        onShowToast(`เปลี่ยนสถานะเป็น ${newStatus === 'ON' ? 'ออนไลน์' : 'ออฟไลน์'} สำเร็จ`, 'success');
        fetchDetails();
        onRefreshStaffList();
      } else {
        throw new Error(resData?.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      onShowToast(err.message || 'อัปเดตสถานะไม่สำเร็จ', 'error');
    }
  };

  const handleVerifyStatusChange = async (status: 'Approved' | 'Reject' | 'Pending') => {
    try {
      const res = await fetch(`/api/staff/${staffId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        onShowToast(`อัปเดตการอนุมัติเป็น ${status} สำเร็จ`, 'success');
        fetchDetails();
        onRefreshStaffList();
      }
    } catch (err) {
      onShowToast('อัปเดตสถานะไม่สำเร็จ', 'error');
    }
  };

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">กำลังโหลดข้อมูลรายละเอียดพนักงาน...</p>
        </div>
      </div>
    );
  }

  const { staff, bookings, reviews, transactions, services } = data;

  const filteredBookings = bookingFilter === 'All' 
    ? bookings 
    : bookings.filter(b => b.Status === bookingFilter);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up border border-slate-200">
        
        {/* Modal Top Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img 
                src={staff.ProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.Nickname || 'พนักงาน')}&background=0D9488&color=fff&size=150`} 
                alt={staff.Nickname}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-md"
              />
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                staff.Available === 'ON' ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-400'
              }`} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">
                  พี่{staff.Nickname} <span className="text-sm font-semibold text-slate-600">({staff.Name})</span>
                </h3>
                
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                  staff.VerifyStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  staff.VerifyStatus === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {staff.VerifyStatus === 'Approved' ? 'อนุมัติแล้ว' : staff.VerifyStatus === 'Pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ'}
                </span>

                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  staff.Available === 'ON' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {staff.Available === 'ON' ? '🟢 เปิดรับงาน (Online)' : '⚪ ปิดรับงาน (Offline)'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-semibold">
                <span>รหัสหมอ: <strong className="text-slate-800 font-mono">{staff.StaffID}</strong></span>
                <span>•</span>
                <span>รหัสผู้ใช้: <strong className="text-slate-800 font-mono">{staff.UserID}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-500 font-black">
                  <Star className="w-3.5 h-3.5 fill-current" /> {staff.Rating?.toFixed(1) || '5.0'} ({staff.ReviewCount || 0} รีวิว)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isEditing ? 'bg-sky-600 text-white shadow-sm' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="แก้ไขข้อมูลพนักงาน"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">{isEditing ? 'ปิดโหมดแก้ไข' : 'แก้ไขข้อมูล'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:px-6 bg-slate-50/50 border-b border-slate-200/80 text-xs">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ยอดเครดิตคงเหลือ</span>
            <span className="text-base font-black text-sky-600">฿{staff.Credit?.toFixed(0)} <span className="text-xs font-bold text-slate-400">CR</span></span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">รายได้สะสมทั้งหมด</span>
            <span className="text-base font-black text-emerald-600">฿{staff.TotalIncome?.toLocaleString() || '0'}</span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">จำนวนงานนวดสำเร็จ</span>
            <span className="text-base font-black text-slate-800">{staff.TotalJobs || 0} <span className="text-xs font-bold text-slate-400">ครั้ง</span></span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ระยะทางรับงานสูงสุด</span>
            <span className="text-base font-black text-slate-800">{staff.MaxJobDistance || 15} <span className="text-xs font-bold text-slate-400">กม.</span></span>
          </div>
        </div>

        {/* Tab Navigation Menu - Clear Distinct Segmented Pills */}
        <div className="bg-slate-100/95 backdrop-blur-md border-y border-slate-200 py-3 px-3 sm:px-6 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            <button
              onClick={() => { setActiveTab('profile'); setIsEditing(false); }}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/25 ring-2 ring-sky-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:text-sky-600 hover:border-sky-300'
              }`}
            >
              <UserCheck className={`w-4 h-4 shrink-0 ${activeTab === 'profile' ? 'text-white' : 'text-sky-600'}`} />
              <span>ข้อมูลทั่วไป &amp; ประวัติ</span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'services'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/25 ring-2 ring-sky-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:text-sky-600 hover:border-sky-300'
              }`}
            >
              <Briefcase className={`w-4 h-4 shrink-0 ${activeTab === 'services' ? 'text-white' : 'text-sky-600'}`} />
              <span>บริการที่เปิดรับ</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'services' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {staff.OfferedServices?.length || services.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('wallet')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'wallet'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/25 ring-2 ring-sky-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:text-sky-600 hover:border-sky-300'
              }`}
            >
              <DollarSign className={`w-4 h-4 shrink-0 ${activeTab === 'wallet' ? 'text-white' : 'text-sky-600'}`} />
              <span>กระเป๋าเครดิต &amp; ปรับยอด</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'wallet' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {transactions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/25 ring-2 ring-sky-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:text-sky-600 hover:border-sky-300'
              }`}
            >
              <History className={`w-4 h-4 shrink-0 ${activeTab === 'bookings' ? 'text-white' : 'text-sky-600'}`} />
              <span>ประวัติงานจอง</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'bookings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {bookings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/25 ring-2 ring-sky-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:text-sky-600 hover:border-sky-300'
              }`}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === 'reviews' ? 'text-white' : 'text-sky-600'}`} />
              <span>รีวิวลูกค้า</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'reviews' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {reviews.length}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-left space-y-6">

          {/* 1. PROFILE & BIO TAB */}
          {activeTab === 'profile' && !isEditing && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Quick Actions Bar */}
              <div className="flex flex-wrap gap-3 items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-slate-700">การอนุมัติพนักงาน:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleVerifyStatusChange('Approved')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                        staff.VerifyStatus === 'Approved' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      อนุมัติ (Approved)
                    </button>
                    <button
                      onClick={() => handleVerifyStatusChange('Reject')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        staff.VerifyStatus === 'Reject' ? 'bg-rose-500 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ปฏิเสธ (Reject)
                    </button>
                    <button
                      onClick={() => handleVerifyStatusChange('Pending')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        staff.VerifyStatus === 'Pending' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      รอตรวจสอบ
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">สถานะรับงาน:</span>
                  <button
                    onClick={handleToggleOnline}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      staff.Available === 'ON' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {staff.Available === 'ON' ? '🟢 กำลังออนไลน์' : '⚪ ออฟไลน์'}
                  </button>
                </div>
              </div>

              {/* Personal Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column 1: Identity & Physical */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    ข้อมูลประจำตัว & รูปร่าง
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">ชื่อ-นามสกุล</span>
                      <span className="font-bold text-slate-800">{staff.Name}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">ชื่อเล่น</span>
                      <span className="font-bold text-slate-800">พี่{staff.Nickname}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">เพศ</span>
                      <span className="font-bold text-slate-800">
                        {staff.Gender === 'Female' ? 'หญิง (Female)' : staff.Gender === 'Male' ? 'ชาย (Male)' : 'อื่นๆ'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">อายุ</span>
                      <span className="font-bold text-slate-800">{staff.Age} ปี</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">น้ำหนัก / ส่วนสูง</span>
                      <span className="font-bold text-slate-800">{staff.Weight || '-'} กก. / {staff.Height || '-'} ซม.</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">ประสบการณ์นวด</span>
                      <span className="font-bold text-sky-600">{staff.Experience} ปี</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Contact & Account */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    ช่องทางติดต่อ & บัญชี
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">เบอร์โทรศัพท์</span>
                      <a href={`tel:${staff.Phone}`} className="font-bold text-sky-600 hover:underline flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {staff.Phone}
                      </a>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">อีเมล</span>
                      <span className="font-bold text-slate-800">{staff.Email || '-'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">สถานะบัญชี</span>
                      <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded ${
                        staff.UserStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {staff.UserStatus === 'Active' ? 'ปกติ (Active)' : 'ระงับการใช้งาน (Inactive)'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">วันที่ลงทะเบียน</span>
                      <span className="text-slate-600 font-semibold">
                        {staff.UserCreatedDate ? new Date(staff.UserCreatedDate).toLocaleString('th-TH') : '-'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Staff Photos Gallery (Portfolio) */}
              {staff.Photos && Array.isArray(staff.Photos) && staff.Photos.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>คลังรูปภาพและผลงาน ({staff.Photos.length} รูป)</span>
                    <span className="text-[10px] text-slate-400 font-normal">พนักงานอัปโหลดในระบบ</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {staff.Photos.map((photo: string, idx: number) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={photo} alt={`Staff photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        {staff.ProfileImage === photo && (
                          <div className="absolute top-1 left-1 bg-sky-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow">
                            รูปโปรไฟล์
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Address & Location Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                  ที่อยู่ & พิกัดตำแหน่ง GPS ล่าสุด
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">ที่อยู่ตามทะเบียนบ้าน/บัตรประชาชน</span>
                    <p className="font-semibold text-slate-700 mt-0.5">{staff.RegisteredAddress || staff.Address || '-'}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">พื้นที่ประจำการปัจจุบัน</span>
                    <p className="font-semibold text-slate-700 mt-0.5">
                      {[staff.SubDistrict, staff.District, staff.Province].filter(Boolean).join(', ') || staff.Address || '-'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">พิกัด GPS ปัจจุบัน</span>
                    <span className="font-mono font-bold text-slate-800">
                      Lat: {staff.CurrentLatitude?.toFixed(6) || '-'}, Lng: {staff.CurrentLongitude?.toFixed(6) || '-'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      อัปเดตล่าสุด: {staff.LastLocationUpdate ? new Date(staff.LastLocationUpdate).toLocaleString('th-TH') : '-'}
                    </span>
                  </div>

                  {staff.CurrentLatitude && staff.CurrentLongitude && (
                    <a
                      href={`https://www.google.com/maps?q=${staff.CurrentLatitude},${staff.CurrentLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> เปิดดูใน Google Maps
                    </a>
                  )}
                </div>
              </div>

              {/* Bio & Skills Description */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  คำแนะนำตัว & ความเชี่ยวชาญ
                </h4>
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed font-semibold">
                  {staff.Description || 'ไม่มีข้อมูลคำแนะนำตัว'}
                </p>
              </div>

            </div>
          )}

          {/* 1.1 EDIT FORM MODE */}
          {activeTab === 'profile' && isEditing && (
            <form onSubmit={handleSaveEdit} className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 animate-fade-in text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h4 className="font-black text-sm text-slate-900">แก้ไขข้อมูลพนักงาน</h4>
                <span className="text-[10px] text-slate-500 font-semibold">* แอดมินสามารถปรับปรุงข้อมูลให้ถูกต้องได้</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={editForm.nickname}
                    onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">เพศ</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                  >
                    <option value="Female">หญิง (Female)</option>
                    <option value="Male">ชาย (Male)</option>
                    <option value="Other">อื่นๆ (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">อายุ (ปี)</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">ประสบการณ์นวด (ปี)</label>
                  <input
                    type="number"
                    value={editForm.experience}
                    onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">น้ำหนัก (กก.)</label>
                  <input
                    type="number"
                    value={editForm.weight}
                    onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">ส่วนสูง (ซม.)</label>
                  <input
                    type="number"
                    value={editForm.height}
                    onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">ระยะทางรับงานสูงสุด (กม.)</label>
                  <input
                    type="number"
                    value={editForm.maxJobDistance}
                    onChange={(e) => setEditForm({ ...editForm, maxJobDistance: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">ที่อยู่ตามบัตรประชาชน</label>
                <input
                  type="text"
                  value={editForm.registeredAddress}
                  onChange={(e) => setEditForm({ ...editForm, registeredAddress: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">รายละเอียด / คำแนะนำตัว</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSavingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          )}

          {/* 2. SERVICES TAB */}
          {activeTab === 'services' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    บริการนวดที่พนักงานคนนี้เปิดรับ
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    พนักงานจะได้รับการแจ้งเตือนงานเฉพาะบริการที่เลือกเปิดรับเท่านั้น
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((svc) => {
                  const isOffered = !staff.OfferedServices || staff.OfferedServices.includes(svc.ServiceID);
                  return (
                    <div
                      key={svc.ServiceID}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between ${
                        isOffered ? 'bg-sky-50/40 border-sky-200' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div>
                        <span className="font-black text-xs text-slate-900 block">{svc.ServiceName}</span>
                        <p className="text-[10px] text-slate-500 font-semibold line-clamp-1 mt-0.5">{svc.Detail}</p>
                        <div className="flex items-center gap-2 mt-2 text-[11px]">
                          <span className="font-black text-sky-600">฿{svc.Price}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 font-semibold">{svc.Duration} นาที</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-amber-600 font-bold">ใช้ {svc.CreditRequired} CR</span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                        isOffered ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isOffered ? '✓ เปิดรับ' : '✕ ปิดรับ'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. WALLET & CREDIT ADJUSTMENT TAB */}
          {activeTab === 'wallet' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Direct Adjustment Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-sky-500" />
                    แผงควบคุมและปรับยอดเครดิตพนักงาน (Admin Direct Adjust)
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    ยอดคงเหลือ: <strong className="text-sky-600 font-black">฿{staff.Credit?.toFixed(0)} CR</strong>
                  </span>
                </div>

                <form onSubmit={handleAdjustCredit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">การดำเนินการ</label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setCreditType('Topup')}
                        className={`flex-1 py-2 font-black transition-colors cursor-pointer ${
                          creditType === 'Topup' ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        + เติมเครดิต
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreditType('Deduct')}
                        className={`flex-1 py-2 font-black transition-colors cursor-pointer ${
                          creditType === 'Deduct' ? 'bg-rose-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        - หักเครดิต
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">จำนวนเครดิต (CR)</label>
                    <input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                      required
                      min={1}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">หมายเหตุสำหรับบันทึก</label>
                    <input
                      type="text"
                      value={creditRemark}
                      onChange={(e) => setCreditRemark(e.target.value)}
                      placeholder="เช่น โอนผ่านพร้อมเพย์แล้ว, ปรับปรุงยอด"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmittingCredit}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isSubmittingCredit ? 'กำลังบันทึก...' : `ยืนยัน${creditType === 'Topup' ? 'เพิ่ม' : 'หัก'}เครดิต`}
                    </button>
                  </div>
                </form>
              </div>

              {/* Transactions Log Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  ประวัติการเติม/หักเครดิตทั้งหมด ({transactions.length} รายการ)
                </h4>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">วัน-เวลา</th>
                        <th className="py-2.5 px-3">ประเภท</th>
                        <th className="py-2.5 px-3">จำนวน</th>
                        <th className="py-2.5 px-3">ยอดก่อน/หลัง</th>
                        <th className="py-2.5 px-3">สถานะ</th>
                        <th className="py-2.5 px-3">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {transactions.length > 0 ? (
                        transactions.map((tx: CreditTransaction) => (
                          <tr key={tx.TransactionID} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-500 text-[11px]">
                              {new Date(tx.CreatedDate).toLocaleString('th-TH')}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                tx.Type === 'Topup' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {tx.Type === 'Topup' ? 'เติมเงิน' : 'หักเงิน'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold font-mono">
                              <span className={tx.Type === 'Topup' ? 'text-emerald-600' : 'text-rose-600'}>
                                {tx.Type === 'Topup' ? '+' : '-'}{tx.Amount} CR
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                              {tx.BeforeCredit?.toFixed(0)} → {tx.AfterCredit?.toFixed(0)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                tx.Status === 'Approved' ? 'bg-sky-100 text-sky-800' :
                                tx.Status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {tx.Status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600">
                              {tx.AdminRemark || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                            ยังไม่มีประวัติการทำรายการเครดิต
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* 4. BOOKINGS HISTORY TAB */}
          {activeTab === 'bookings' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  รายการงานจองที่พนักงานคนนี้ได้รับ ({filteredBookings.length} รายการ)
                </h4>

                {/* Status Filter */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  {['All', 'Completed', 'Working', 'Accepted', 'Cancel'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setBookingFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        bookingFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st === 'All' ? 'ทั้งหมด' : st === 'Completed' ? 'สำเร็จ' : st === 'Working' ? 'กำลังนวด' : st === 'Accepted' ? 'รับงานแล้ว' : 'ยกเลิก'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">รหัสงาน</th>
                      <th className="py-2.5 px-3">ลูกค้า</th>
                      <th className="py-2.5 px-3">บริการ</th>
                      <th className="py-2.5 px-3">วัน-เวลานัด</th>
                      <th className="py-2.5 px-3">ระยะทาง</th>
                      <th className="py-2.5 px-3">ยอดเงินรวม</th>
                      <th className="py-2.5 px-3">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredBookings.length > 0 ? (
                      filteredBookings.map((b: any) => (
                        <tr key={b.BookingID} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-600 text-[11px]">
                            {b.BookingID}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold block">{b.CustomerName}</span>
                            <span className="text-[10px] text-slate-400 block">{b.CustomerPhone}</span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {b.ServiceName}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500">
                            {b.BookingDate} {b.BookingTime}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {b.Distance ? `${b.Distance.toFixed(1)} กม.` : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-black text-slate-900 font-mono">
                            ฿{b.TotalPrice}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              b.Status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              b.Status === 'Working' ? 'bg-sky-100 text-sky-800' :
                              b.Status === 'Accepted' ? 'bg-blue-100 text-blue-800' :
                              b.Status === 'Cancel' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {b.Status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                          ไม่พบประวัติงานจองในเงื่อนไขนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. CUSTOMER REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                ความคิดเห็นและคะแนนรีวิวจากลูกค้า ({reviews.length} รายการ)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reviews.length > 0 ? (
                  reviews.map((rev: any) => (
                    <div key={rev.ReviewID} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-900 block">{rev.CustomerName}</span>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {new Date(rev.CreatedDate).toLocaleDateString('th-TH')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-black text-[11px]">
                          <Star className="w-3 h-3 fill-current text-amber-500" />
                          {rev.Score} / 5
                        </div>
                      </div>

                      <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 text-[11px] leading-relaxed font-semibold">
                        "{rev.Comment || 'ลูกค้าไม่ได้ระบุข้อความรีวิว'}"
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-12 text-center text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-slate-200">
                    ยังไม่มีรีวิวจากลูกค้าสำหรับพนักงานคนนี้
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">
            พนักงาน: <strong className="text-slate-800">{staff.Name}</strong> (พี่{staff.Nickname})
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
