import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Phone, Mail, MapPin, Calendar, Star, DollarSign, Award, Clock, 
  CheckCircle, AlertCircle, RefreshCw, Edit2, Shield, Plus, Minus,
  ExternalLink, Check, Briefcase, Navigation, UserCheck, MessageSquare, History,
  FileText, Image as ImageIcon, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight,
  Download, Eye, AlertTriangle, ShieldCheck, Upload, Trash2, Camera,
  Maximize2, Minimize2, ChevronUp, ChevronDown, PanelTopClose, PanelTopOpen
} from 'lucide-react';
import { Staff, User, Service, Booking, Review, CreditTransaction } from '../types';

interface StaffDetailModalProps {
  staffId: string;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshStaffList: () => void;
}

export interface EvidenceDocument {
  id: string;
  type: 'license' | 'idcard' | 'housereg' | 'profile' | 'photo';
  title: string;
  category: string;
  description: string;
  url: string;
  required?: boolean;
}

// Client-side image compression helper
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
    };
    reader.onerror = (error) => reject(error);
  });
};

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

  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'services' | 'wallet' | 'bookings' | 'reviews'>('profile');
  
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

  // Lightbox viewer state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxRotation, setLightboxRotation] = useState<number>(0);

  // Fullscreen and Top Strip Collapse states (for full screen viewing of staff info & history)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKpiCollapsed, setIsKpiCollapsed] = useState(false);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, isFullscreen, onClose]);

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
        offeredServices: json.staff.OfferedServices || json.services.map((s: Service) => s.ServiceID),
        licenseFile: json.staff.LicenseFile || '',
        idCardFile: json.staff.IdCardFile || '',
        houseRegFile: json.staff.HouseRegFile || '',
        profileImage: json.staff.ProfileImage || '',
        photos: json.staff.Photos || []
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
      const payload = {
        ...editForm,
        age: editForm.age === '' ? 30 : (Number(editForm.age) || 30),
        weight: editForm.weight === '' ? 50 : (Number(editForm.weight) || 50),
        height: editForm.height === '' ? 160 : (Number(editForm.height) || 160),
        experience: editForm.experience === '' ? 0 : (Number(editForm.experience) || 0),
        maxJobDistance: editForm.maxJobDistance === '' ? 15 : (Number(editForm.maxJobDistance) || 15)
      };
      const res = await fetch(`/api/admin/staff/${staffId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  // Compile all available evidence documents and photos for this therapist
  const getEvidenceList = useCallback((): EvidenceDocument[] => {
    if (!data?.staff) return [];
    const staff = data.staff;

    const list: EvidenceDocument[] = [
      {
        id: 'license',
        type: 'license',
        title: 'ใบอนุญาต / ประกาศนียบัตรนวดเพื่อสุขภาพ',
        category: 'เอกสารรับรองมาตรฐานวิชาชีพ',
        description: 'หลักฐานการผ่านการอบรมหรือใบอนุญาตประกอบวิชาชีพนวดเพื่อสุขภาพ (สบส.)',
        url: staff.LicenseFile || '',
        required: true
      },
      {
        id: 'idcard',
        type: 'idcard',
        title: 'สำเนาบัตรประจำตัวประชาชน',
        category: 'เอกสารยืนยันตัวตน',
        description: 'บัตรประจำตัวประชาชนเพื่อยืนยันชื่อ-นามสกุล อายุ และสัญชาติของผู้สมัคร',
        url: staff.IdCardFile || '',
        required: true
      },
      {
        id: 'housereg',
        type: 'housereg',
        title: 'สำเนาทะเบียนบ้าน',
        category: 'หลักฐานที่อยู่อาศัยตามทะเบียนราษฎร์',
        description: 'เอกสารแสดงที่อยู่ตามทะเบียนบ้านของผู้สมัครเพื่อความถูกต้องและปลอดภัย',
        url: staff.HouseRegFile || '',
        required: true
      },
      {
        id: 'profile',
        type: 'profile',
        title: 'รูปถ่ายหน้าตรง / รูปโปรไฟล์พนักงาน',
        category: 'รูปภาพประจำตัว',
        description: 'ภาพถ่ายหน้าตรงความละเอียดสูงสำหรับแสดงให้ลูกค้าเห็นในหน้ารายชื่อหมอนวด',
        url: staff.ProfileImage || '',
        required: false
      }
    ];

    if (Array.isArray(staff.Photos) && staff.Photos.length > 0) {
      staff.Photos.forEach((photoUrl: string, idx: number) => {
        if (photoUrl) {
          list.push({
            id: `photo-${idx}`,
            type: 'photo',
            title: `รูปผลงาน & อัลบั้มภาพ #${idx + 1}`,
            category: 'รูปผลงาน / บรรยากาศการให้บริการ',
            description: `ภาพถ่ายตัวอย่างการให้บริการนวดและบุคลิกภาพของพนักงาน ภาพที่ ${idx + 1}`,
            url: photoUrl,
            required: false
          });
        }
      });
    }

    return list;
  }, [data?.staff]);

  const evidenceList = getEvidenceList();
  // Filter for items that actually have an image URL for lightbox cycling
  const activeMediaList = evidenceList.filter(item => Boolean(item.url));

  // Handle open lightbox
  const handleOpenLightbox = (targetUrl: string) => {
    const foundIdx = activeMediaList.findIndex(item => item.url === targetUrl);
    if (foundIdx !== -1) {
      setLightboxIndex(foundIdx);
      setLightboxZoom(1);
      setLightboxRotation(0);
    }
  };

  const handleCloseLightbox = () => {
    setLightboxIndex(null);
    setLightboxZoom(1);
    setLightboxRotation(0);
  };

  const handlePrevMedia = () => {
    if (lightboxIndex === null || activeMediaList.length <= 1) return;
    setLightboxIndex((lightboxIndex - 1 + activeMediaList.length) % activeMediaList.length);
    setLightboxZoom(1);
    setLightboxRotation(0);
  };

  const handleNextMedia = () => {
    if (lightboxIndex === null || activeMediaList.length <= 1) return;
    setLightboxIndex((lightboxIndex + 1) % activeMediaList.length);
    setLightboxZoom(1);
    setLightboxRotation(0);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') {
        handleCloseLightbox();
      } else if (e.key === 'ArrowLeft') {
        handlePrevMedia();
      } else if (e.key === 'ArrowRight') {
        handleNextMedia();
      } else if (e.key === '+' || e.key === '=') {
        setLightboxZoom(prev => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        setLightboxZoom(prev => Math.max(prev - 0.25, 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, activeMediaList.length]);

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

  // Count verified documents
  const requiredDocsCount = evidenceList.filter(d => d.required).length;
  const uploadedRequiredDocsCount = evidenceList.filter(d => d.required && Boolean(d.url)).length;
  const isDocumentsComplete = uploadedRequiredDocsCount >= requiredDocsCount;

  return (
    <div className={`fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center ${
      isFullscreen ? 'p-0' : 'p-2 sm:p-4'
    } overflow-hidden`}>
      <div className={`bg-white shadow-2xl flex flex-col transition-all duration-150 border border-slate-200 ${
        isFullscreen 
          ? 'w-screen h-screen max-w-none max-h-none rounded-none' 
          : 'max-w-6xl xl:max-w-7xl w-full max-h-[96vh] rounded-3xl animate-scale-up'
      } overflow-hidden`}>
        
        {/* Modal Top Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-3.5 sm:p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div 
              className="relative cursor-pointer group shrink-0"
              onClick={() => staff.ProfileImage && handleOpenLightbox(staff.ProfileImage)}
              title={staff.ProfileImage ? "คลิกเพื่อดูรูปโปรไฟล์ขนาดใหญ่" : undefined}
            >
              <img 
                src={staff.ProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.Nickname || 'พนักงาน')}&background=0D9488&color=fff&size=150`} 
                alt={staff.Nickname}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-md group-hover:ring-2 group-hover:ring-sky-400 transition-all"
              />
              {staff.ProfileImage && (
                <div className="absolute inset-0 rounded-full bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <ZoomIn className="w-5 h-5" />
                </div>
              )}
              <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white ${
                staff.Available === 'ON' ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-400'
              }`} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  พี่{staff.Nickname} <span className="text-xs sm:text-sm font-semibold text-slate-600">({staff.Name})</span>
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

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1 font-semibold">
                <span>รหัสหมอ: <strong className="text-slate-800 font-mono">{staff.StaffID}</strong></span>
                <span>•</span>
                <span>รหัสผู้ใช้: <strong className="text-slate-800 font-mono">{staff.UserID}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-500 font-black">
                  <Star className="w-3.5 h-3.5 fill-current" /> {staff.Rating?.toFixed(1) || '5.0'} ({staff.ReviewCount || 0} รีวิว)
                </span>
                <span>•</span>
                <span className={`inline-flex items-center gap-1 font-bold ${isDocumentsComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <FileText className="w-3.5 h-3.5" /> เอกสารหลักฐาน: {uploadedRequiredDocsCount}/{requiredDocsCount}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Toggle Fullscreen button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                isFullscreen 
                  ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300' 
                  : 'bg-white border border-slate-200 hover:bg-sky-50 text-slate-700 hover:text-sky-600 hover:border-sky-300'
              }`}
              title={isFullscreen ? "ย่อหน้าต่าง (Windowed Mode)" : "ขยายเต็มหน้าจอ (Fullscreen Mode)"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'ย่อหน้าต่าง' : 'เต็มจอ'}</span>
            </button>

            {/* Toggle Top Strip Collapse button */}
            <button
              onClick={() => setIsKpiCollapsed(!isKpiCollapsed)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isKpiCollapsed 
                  ? 'bg-amber-500 text-white shadow-xs' 
                  : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title={isKpiCollapsed ? "แสดงแถบสรุปด้านบน" : "ย่อแถบสรุปด้านบน เพื่อเพิ่มพื้นที่ดูข้อมูลด้านล่าง"}
            >
              {isKpiCollapsed ? <PanelTopOpen className="w-4 h-4" /> : <PanelTopClose className="w-4 h-4" />}
              <span className="hidden md:inline">{isKpiCollapsed ? 'แสดงส่วนบน' : 'ย่อส่วนบน'}</span>
            </button>

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
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip / Slim Summary */}
        {isKpiCollapsed ? (
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-50 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto text-[11px] font-semibold text-slate-600 scrollbar-none">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400 font-normal">เครดิต:</span> 
                <strong className="text-sky-600 font-mono font-bold">฿{staff.Credit?.toFixed(0)} CR</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400 font-normal">รายได้สะสม:</span> 
                <strong className="text-emerald-600 font-bold">฿{staff.TotalIncome?.toLocaleString() || '0'}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400 font-normal">งานสำเร็จ:</span> 
                <strong className="text-slate-800 font-bold">{staff.TotalJobs || 0} ครั้ง</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400 font-normal">ระยะทางรับงาน:</span> 
                <strong className="text-slate-800 font-bold">{staff.MaxJobDistance || 15} กม.</strong>
              </span>
            </div>
            <button
              onClick={() => setIsKpiCollapsed(false)}
              className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline cursor-pointer shrink-0 ml-2"
              title="ขยายแถบสรุป"
            >
              <span>ขยายส่วนบน</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative bg-slate-50/50 border-b border-slate-200/80 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:px-6">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ยอดเครดิตคงเหลือ</span>
                <span className="text-base font-black text-sky-600">฿{staff.Credit?.toFixed(0)} <span className="text-xs font-bold text-slate-400">CR</span></span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">รายได้สะสมทั้งหมด</span>
                <span className="text-base font-black text-emerald-600">฿{staff.TotalIncome?.toLocaleString() || '0'}</span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">จำนวนงานนวดสำเร็จ</span>
                <span className="text-base font-black text-slate-800">{staff.TotalJobs || 0} <span className="text-xs font-bold text-slate-400">ครั้ง</span></span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ระยะทางรับงานสูงสุด</span>
                <span className="text-base font-black text-slate-800">{staff.MaxJobDistance || 15} <span className="text-xs font-bold text-slate-400">กม.</span></span>
              </div>
            </div>
            <button
              onClick={() => setIsKpiCollapsed(true)}
              className="absolute top-1.5 right-3 text-[10px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 bg-white/90 hover:bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs cursor-pointer transition-colors"
              title="ย่อแถบสรุปเพื่อเพิ่มพื้นที่ดูข้อมูลด้านล่าง"
            >
              <span>ย่อส่วนบน</span>
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tab Navigation Menu */}
        <div className="bg-slate-100/95 backdrop-blur-md border-y border-slate-200 py-2.5 px-3 sm:px-6 sticky top-0 z-20 shadow-xs">
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
              onClick={() => { setActiveTab('documents'); setIsEditing(false); }}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/25 ring-2 ring-sky-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:text-sky-600 hover:border-sky-300'
              }`}
            >
              <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'documents' ? 'text-white' : 'text-sky-600'}`} />
              <span>เอกสารหลักฐานการสมัคร</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'documents' 
                  ? 'bg-white/20 text-white' 
                  : (isDocumentsComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
              }`}>
                {uploadedRequiredDocsCount}/{requiredDocsCount}
              </span>
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

            {/* Quick Fullscreen & Collapse Controls */}
            <div className="flex items-center gap-1.5 ml-auto pl-2 border-l border-slate-300 shrink-0">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isFullscreen 
                    ? 'bg-sky-600 text-white shadow-2xs' 
                    : 'bg-white text-slate-700 hover:text-sky-600 border border-slate-200 hover:border-sky-300'
                }`}
                title={isFullscreen ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isFullscreen ? 'ย่อขนาด' : 'เต็มจอ'}</span>
              </button>

              <button
                onClick={() => setIsKpiCollapsed(!isKpiCollapsed)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isKpiCollapsed 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                }`}
                title={isKpiCollapsed ? "แสดงแถบสรุปด้านบน" : "ย่อแถบสรุปเพื่อเพิ่มพื้นที่ดูข้อมูล"}
              >
                {isKpiCollapsed ? <PanelTopOpen className="w-3.5 h-3.5 text-amber-600" /> : <PanelTopClose className="w-3.5 h-3.5 text-slate-500" />}
                <span className="hidden md:inline">{isKpiCollapsed ? 'แสดงส่วนบน' : 'ย่อส่วนบน'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-left space-y-6">

          {/* 1. PROFILE & BIO TAB */}
          {activeTab === 'profile' && !isEditing && (
            <div className="space-y-6 animate-fade-in">

              {/* Fullscreen & Layout Helper Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:px-4 bg-sky-50/70 border border-sky-200/80 rounded-2xl text-xs shadow-2xs">
                <div className="flex items-center gap-2 text-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse shrink-0" />
                  <span className="font-bold">แผงข้อมูลทั่วไปและประวัติการทำงาน</span>
                  <span className="text-slate-400 hidden md:inline">|</span>
                  <span className="text-slate-500 hidden md:inline">
                    {isFullscreen ? 'โหมดเต็มจอ (100% Fullscreen)' : 'ขยายเต็มจอเพื่อดูข้อมูลและเอกสารได้กว้างเต็มที่'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap ${
                      isFullscreen 
                        ? 'bg-sky-600 text-white shadow-2xs' 
                        : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50 hover:border-sky-300'
                    }`}
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>{isFullscreen ? 'ย่อหน้าต่างลง' : 'ขยายเต็มจอ (Fullscreen)'}</span>
                  </button>

                  <button
                    onClick={() => setIsKpiCollapsed(!isKpiCollapsed)}
                    className="px-3 py-1.5 rounded-xl font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isKpiCollapsed ? <PanelTopOpen className="w-3.5 h-3.5 text-amber-600" /> : <PanelTopClose className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{isKpiCollapsed ? 'แสดงแถบสรุปบน' : 'ย่อแถบสรุปด้านบน'}</span>
                  </button>
                </div>
              </div>
              
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

              {/* Application Evidence Preview Strip (Quick View) */}
              <div className="bg-gradient-to-br from-slate-50 to-sky-50/40 border border-sky-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-sky-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        รูปหลักฐานการสมัครและเอกสารสำคัญ
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        คลิกที่รูปภาพเพื่อเปิดดูภาพขนาดใหญ่ ตรวจสอบความถูกต้องและซูมดูรายละเอียด
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('documents')}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 bg-white hover:bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer shadow-xs"
                  >
                    <span>ตรวจเอกสารทั้งหมด ({uploadedRequiredDocsCount}/{requiredDocsCount})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. License Card */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-slate-800">1. ใบอนุญาตนวด</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          staff.LicenseFile ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {staff.LicenseFile ? '✓ แนบแล้ว' : '✕ ยังไม่แนบ'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1">ใบรับรองมาตรฐานวิชาชีพ</p>
                    </div>

                    {staff.LicenseFile ? (
                      <div 
                        onClick={() => handleOpenLightbox(staff.LicenseFile)}
                        className="relative h-28 rounded-lg overflow-hidden border border-slate-200 group cursor-pointer bg-slate-100"
                      >
                        <img src={staff.LicenseFile} alt="ใบอนุญาตนวด" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white gap-1.5 text-xs font-bold">
                          <ZoomIn className="w-4 h-4" /> ดูรูปใหญ่
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                        <AlertCircle className="w-5 h-5 text-slate-300" />
                        <span className="text-[10px]">ไม่มีไฟล์</span>
                      </div>
                    )}

                    {staff.LicenseFile && (
                      <button
                        onClick={() => handleOpenLightbox(staff.LicenseFile)}
                        className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> กดดูรูปขนาดใหญ่
                      </button>
                    )}
                  </div>

                  {/* 2. ID Card */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-slate-800">2. สำเนาบัตรประชาชน</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          staff.IdCardFile ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {staff.IdCardFile ? '✓ แนบแล้ว' : '✕ ยังไม่แนบ'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1">เอกสารยืนยันตัวตน</p>
                    </div>

                    {staff.IdCardFile ? (
                      <div 
                        onClick={() => handleOpenLightbox(staff.IdCardFile)}
                        className="relative h-28 rounded-lg overflow-hidden border border-slate-200 group cursor-pointer bg-slate-100"
                      >
                        <img src={staff.IdCardFile} alt="สำเนาบัตรประชาชน" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white gap-1.5 text-xs font-bold">
                          <ZoomIn className="w-4 h-4" /> ดูรูปใหญ่
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                        <AlertCircle className="w-5 h-5 text-slate-300" />
                        <span className="text-[10px]">ไม่มีไฟล์</span>
                      </div>
                    )}

                    {staff.IdCardFile && (
                      <button
                        onClick={() => handleOpenLightbox(staff.IdCardFile)}
                        className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> กดดูรูปขนาดใหญ่
                      </button>
                    )}
                  </div>

                  {/* 3. House Reg Card */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-slate-800">3. สำเนาทะเบียนบ้าน</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          staff.HouseRegFile ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {staff.HouseRegFile ? '✓ แนบแล้ว' : '✕ ยังไม่แนบ'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1">หลักฐานที่อยู่ตามทะเบียนราษฎร์</p>
                    </div>

                    {staff.HouseRegFile ? (
                      <div 
                        onClick={() => handleOpenLightbox(staff.HouseRegFile)}
                        className="relative h-28 rounded-lg overflow-hidden border border-slate-200 group cursor-pointer bg-slate-100"
                      >
                        <img src={staff.HouseRegFile} alt="สำเนาทะเบียนบ้าน" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white gap-1.5 text-xs font-bold">
                          <ZoomIn className="w-4 h-4" /> ดูรูปใหญ่
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                        <AlertCircle className="w-5 h-5 text-slate-300" />
                        <span className="text-[10px]">ไม่มีไฟล์</span>
                      </div>
                    )}

                    {staff.HouseRegFile && (
                      <button
                        onClick={() => handleOpenLightbox(staff.HouseRegFile)}
                        className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> กดดูรูปขนาดใหญ่
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Staff Photos Gallery (Portfolio) */}
              {staff.Photos && Array.isArray(staff.Photos) && staff.Photos.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>คลังรูปภาพและผลงาน ({staff.Photos.length} รูป)</span>
                    <span className="text-[10px] text-slate-400 font-normal">คลิกรูปเพื่อดูภาพขนาดใหญ่</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {staff.Photos.map((photo: string, idx: number) => (
                      <div 
                        key={idx} 
                        onClick={() => handleOpenLightbox(photo)}
                        className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group cursor-pointer bg-slate-100"
                        title="คลิกเพื่อดูรูปขนาดใหญ่"
                      >
                        <img src={photo} alt={`Staff photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ZoomIn className="w-5 h-5" />
                        </div>
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

              {/* Recent Work & History Highlights */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <History className="w-4 h-4 text-sky-600" />
                      <span>ประวัติการรับงานและการให้บริการ</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      สรุปสถิติและรายการงานจองล่าสุดของหมอนวด
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 hover:underline cursor-pointer self-start sm:self-auto"
                  >
                    <span>ดูประวัติงานทั้งหมด ({bookings.length} รายการ)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* History Stats Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-400 block">งานสำเร็จทั้งหมด</span>
                    <span className="text-sm font-black text-slate-800">{staff.TotalJobs || 0} งาน</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-400 block">ประสบการณ์นวด</span>
                    <span className="text-sm font-black text-slate-800">{staff.Experience || 1} ปี</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-400 block">คะแนนความพึงพอใจ</span>
                    <span className="text-sm font-black text-amber-500 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" /> {staff.Rating?.toFixed(1) || '5.0'} / 5.0
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-400 block">รายได้สะสม</span>
                    <span className="text-sm font-black text-emerald-600">฿{staff.TotalIncome?.toLocaleString() || '0'}</span>
                  </div>
                </div>

                {/* Recent Bookings Mini Table */}
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3">รหัสงาน</th>
                        <th className="py-2 px-3">บริการ</th>
                        <th className="py-2 px-3">ลูกค้า</th>
                        <th className="py-2 px-3">ยอดเงิน</th>
                        <th className="py-2 px-3">สถานะ</th>
                        <th className="py-2 px-3">วันที่</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {bookings.slice(0, 5).length > 0 ? (
                        bookings.slice(0, 5).map((b: any) => (
                          <tr key={b.BookingID} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono font-bold text-sky-600">#{b.BookingID}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{b.ServiceName}</td>
                            <td className="py-2 px-3 text-slate-700 font-medium">{b.CustomerName}</td>
                            <td className="py-2 px-3 font-bold">฿{b.TotalPrice || b.ServicePrice}</td>
                            <td className="py-2 px-3">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                b.Status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                b.Status === 'Ongoing' || b.Status === 'Travelling' ? 'bg-sky-100 text-sky-800' :
                                b.Status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {b.Status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[10px] text-slate-400 font-mono">
                              {new Date(b.CreatedDate).toLocaleDateString('th-TH')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400 font-semibold">
                            ยังไม่มีประวัติการรับงานในระบบ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* 1.1 DOCUMENTS TAB (FULL INSPECTION VIEW) */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Inspection Header & Action Bar */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight flex items-center gap-2">
                        <span>ศูนย์ตรวจสอบหลักฐานและเอกสารการสมัคร</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDocumentsComplete ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isDocumentsComplete ? '✓ เอกสารบังคับครบถ้วน' : '⚠️ เอกสารยังไม่ครบ'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        ตรวจสอบความถูกต้องของเอกสารประจำตัว ใบอนุญาต และรูปภาพ เพื่อประกอบการอนุมัติสิทธิ์การเปิดรับงาน
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleVerifyStatusChange('Approved')}
                      className={`text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        staff.VerifyStatus === 'Approved'
                          ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400'
                          : 'bg-white/10 hover:bg-emerald-600 text-white border border-white/10'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>อนุมัติพนักงาน</span>
                    </button>

                    <button
                      onClick={() => handleVerifyStatusChange('Reject')}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        staff.VerifyStatus === 'Reject'
                          ? 'bg-rose-500 text-white shadow-md ring-2 ring-rose-400'
                          : 'bg-white/10 hover:bg-rose-600 text-white border border-white/10'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span>ไม่อนุมัติ</span>
                    </button>
                  </div>
                </div>

                {/* Progress Strip */}
                <div className="bg-white/10 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">ความพร้อมของเอกสาร:</span>
                    <strong className="text-white font-mono">{uploadedRequiredDocsCount} / {requiredDocsCount} ฉบับ</strong>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    สถานะการตรวจสอบปัจจุบัน: <span className="font-bold text-sky-300 uppercase">{staff.VerifyStatus}</span>
                  </div>
                </div>
              </div>

              {/* Documents Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evidenceList.map((doc, idx) => {
                  const hasFile = Boolean(doc.url);
                  return (
                    <div 
                      key={doc.id}
                      className={`bg-white border rounded-2xl p-4 space-y-3 shadow-xs flex flex-col justify-between transition-all ${
                        hasFile ? 'border-slate-200 hover:border-sky-300' : 'border-dashed border-amber-200 bg-amber-50/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                              {doc.category}
                            </span>
                            <h5 className="text-sm font-black text-slate-900 mt-0.5">
                              {doc.title}
                            </h5>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {doc.required && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                บังคับ
                              </span>
                            )}
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              hasFile ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {hasFile ? '✓ แนบแล้ว' : '✕ ยังไม่แนบ'}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          {doc.description}
                        </p>
                      </div>

                      {/* Image Thumbnail Container */}
                      {hasFile ? (
                        <div className="space-y-2">
                          <div 
                            onClick={() => handleOpenLightbox(doc.url)}
                            className="relative h-48 rounded-xl overflow-hidden border border-slate-200 group cursor-pointer bg-slate-100 flex items-center justify-center"
                          >
                            <img 
                              src={doc.url} 
                              alt={doc.title} 
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white gap-1.5">
                              <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-xs">
                                <ZoomIn className="w-6 h-6" />
                              </div>
                              <span className="text-xs font-black drop-shadow">คลิกเพื่อดูรูปขนาดใหญ่</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenLightbox(doc.url)}
                              className="flex-1 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>ดูรูปขนาดใหญ่ (Zoom)</span>
                            </button>

                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                              title="เปิดรูปในแท็บใหม่"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="h-44 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                          <AlertTriangle className="w-7 h-7 text-amber-400" />
                          <div>
                            <span className="text-xs font-bold text-slate-600 block">ยังไม่มีเอกสารในส่วนนี้</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">พนักงานยังไม่ได้อัปโหลดหลักฐานฉบับนี้เข้ามาในระบบ</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* 1.2 EDIT FORM MODE */}
          {activeTab === 'profile' && isEditing && (
            <form onSubmit={handleSaveEdit} className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 animate-fade-in text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h4 className="font-black text-sm text-slate-900">แก้ไขข้อมูลพนักงานและเอกสาร</h4>
                <span className="text-[10px] text-slate-500 font-semibold">* แอดมินสามารถปรับปรุงข้อมูลและเอกสารให้ถูกต้องได้</span>
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

              {/* Document and Image URL Updates */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h5 className="font-bold text-slate-800 text-[11px]">จัดการไฟล์เอกสาร &amp; รูปถ่าย</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* License File upload */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 block">ใบอนุญาตนวด</label>
                    {editForm.licenseFile && (
                      <div className="h-20 rounded-lg overflow-hidden border border-slate-200 relative group">
                        <img src={editForm.licenseFile} alt="License" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, licenseFile: '' })}
                          className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-md text-[9px]"
                        >
                          ลบ
                        </button>
                      </div>
                    )}
                    <label className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>{editForm.licenseFile ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const b64 = await compressImageFile(file);
                              setEditForm({ ...editForm, licenseFile: b64 });
                              onShowToast('อัปโหลดใบอนุญาตสำเร็จ', 'success');
                            } catch (err) {
                              onShowToast('อัปโหลดไม่สำเร็จ', 'error');
                            }
                          }
                        }} 
                      />
                    </label>
                  </div>

                  {/* ID Card upload */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 block">สำเนาบัตรประชาชน</label>
                    {editForm.idCardFile && (
                      <div className="h-20 rounded-lg overflow-hidden border border-slate-200 relative group">
                        <img src={editForm.idCardFile} alt="ID Card" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, idCardFile: '' })}
                          className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-md text-[9px]"
                        >
                          ลบ
                        </button>
                      </div>
                    )}
                    <label className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>{editForm.idCardFile ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const b64 = await compressImageFile(file);
                              setEditForm({ ...editForm, idCardFile: b64 });
                              onShowToast('อัปโหลดสำเนาบัตรประชาชนสำเร็จ', 'success');
                            } catch (err) {
                              onShowToast('อัปโหลดไม่สำเร็จ', 'error');
                            }
                          }
                        }} 
                      />
                    </label>
                  </div>

                  {/* House Reg upload */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 block">สำเนาทะเบียนบ้าน</label>
                    {editForm.houseRegFile && (
                      <div className="h-20 rounded-lg overflow-hidden border border-slate-200 relative group">
                        <img src={editForm.houseRegFile} alt="House Reg" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, houseRegFile: '' })}
                          className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-md text-[9px]"
                        >
                          ลบ
                        </button>
                      </div>
                    )}
                    <label className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>{editForm.houseRegFile ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const b64 = await compressImageFile(file);
                              setEditForm({ ...editForm, houseRegFile: b64 });
                              onShowToast('อัปโหลดสำเนาทะเบียนบ้านสำเร็จ', 'success');
                            } catch (err) {
                              onShowToast('อัปโหลดไม่สำเร็จ', 'error');
                            }
                          }
                        }} 
                      />
                    </label>
                  </div>
                </div>
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
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                  {['All', 'Requested', 'Matched', 'Travelling', 'Ongoing', 'Completed', 'Cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setBookingFilter(st)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        bookingFilter === st ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">รหัสจอง</th>
                      <th className="py-2.5 px-3">บริการ</th>
                      <th className="py-2.5 px-3">ลูกค้า</th>
                      <th className="py-2.5 px-3">ยอดเงิน</th>
                      <th className="py-2.5 px-3">สถานะ</th>
                      <th className="py-2.5 px-3">วัน-เวลา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredBookings.length > 0 ? (
                      filteredBookings.map((b: any) => (
                        <tr key={b.BookingID} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-600">
                            #{b.BookingID}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {b.ServiceName}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 block">{b.CustomerName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{b.CustomerPhone}</span>
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            ฿{b.TotalPrice || b.ServicePrice}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              b.Status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              b.Status === 'Ongoing' || b.Status === 'Travelling' ? 'bg-sky-100 text-sky-800' :
                              b.Status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {b.Status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[10px] text-slate-400 font-semibold">
                            {new Date(b.CreatedDate).toLocaleString('th-TH')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                          ไม่พบประวัติงานจองในสถานะนี้
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

      {/* FULL-SCREEN / LARGE IMAGE LIGHTBOX MODAL (ป๊อปอัปดูรูปขนาดใหญ่) */}
      {lightboxIndex !== null && activeMediaList[lightboxIndex] && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-950/92 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 select-none animate-fade-in"
          onClick={handleCloseLightbox}
        >
          {/* Lightbox Top Controls Bar */}
          <div 
            className="flex items-center justify-between gap-3 text-white max-w-6xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-sky-500/30 text-sky-300 border border-sky-400/40 shrink-0">
                {activeMediaList[lightboxIndex].category}
              </span>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-white truncate">
                  {activeMediaList[lightboxIndex].title}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium truncate">
                  พนักงาน: พี่{staff.Nickname} ({staff.Name}) • รหัส {staff.StaffID}
                </p>
              </div>
            </div>

            {/* Actions: Zoom, Rotate, Full View, Close */}
            <div className="flex items-center gap-1.5 shrink-0 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15">
              <button
                type="button"
                onClick={() => setLightboxZoom(prev => Math.max(prev - 0.25, 0.5))}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="ย่อรูป (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="text-[10px] font-mono font-bold px-1.5 text-slate-300">
                {(lightboxZoom * 100).toFixed(0)}%
              </span>

              <button
                type="button"
                onClick={() => setLightboxZoom(prev => Math.min(prev + 0.25, 3))}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="ขยายรูป (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setLightboxRotation(prev => (prev + 90) % 360)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="หมุน 90 องศา"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <a
                href={activeMediaList[lightboxIndex].url}
                target="_blank"
                rel="noreferrer"
                download={`staff_${staff.StaffID}_${activeMediaList[lightboxIndex].id}.jpg`}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="เปิดไฟล์ขนาดเดิมในแท็บใหม่"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="w-px h-4 bg-white/20 mx-0.5" />

              <button
                type="button"
                onClick={handleCloseLightbox}
                className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors cursor-pointer"
                title="ปิดหน้าต่างรูปภาพ (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Stage Area */}
          <div 
            className="flex-1 flex items-center justify-center relative overflow-hidden py-3 my-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Nav Button */}
            {activeMediaList.length > 1 && (
              <button
                type="button"
                onClick={handlePrevMedia}
                className="absolute left-2 sm:left-6 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-sky-600 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-xl active:scale-95"
                title="รูปก่อนหน้า (ลูกศรซ้าย)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Active Image Viewport */}
            <div className="max-w-5xl max-h-[75vh] w-full h-full flex items-center justify-center p-2">
              <img
                src={activeMediaList[lightboxIndex].url}
                alt={activeMediaList[lightboxIndex].title}
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                  transition: 'transform 0.2s ease-out'
                }}
                className="max-h-[72vh] max-w-[85vw] object-contain rounded-xl shadow-2xl transition-all cursor-grab active:cursor-grabbing select-none"
              />
            </div>

            {/* Right Nav Button */}
            {activeMediaList.length > 1 && (
              <button
                type="button"
                onClick={handleNextMedia}
                className="absolute right-2 sm:right-6 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-sky-600 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-xl active:scale-95"
                title="รูปถัดไป (ลูกศรขวา)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Strip & Caption */}
          <div 
            className="max-w-4xl w-full mx-auto space-y-2 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-semibold">
              <span>{activeMediaList[lightboxIndex].title}</span>
              <span>•</span>
              <span className="font-mono text-sky-400">รูปที่ {lightboxIndex + 1} จาก {activeMediaList.length}</span>
            </div>

            {/* Thumbnails row */}
            {activeMediaList.length > 1 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {activeMediaList.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxZoom(1);
                      setLightboxRotation(0);
                    }}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      lightboxIndex === idx
                        ? 'border-sky-400 ring-2 ring-sky-500/50 scale-105'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
