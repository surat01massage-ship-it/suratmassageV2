import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, Calendar, DollarSign, Settings, Eye, Edit, Trash2, 
  Check, X, Plus, ShieldCheck, Database, FileCode, Copy, Download, RefreshCw, BarChart2, ChevronRight,
  MapPin, Compass, AlertTriangle, ShieldAlert, CheckCircle2, RotateCcw, Navigation,
  Bot, Sparkles, Cpu, Zap, Upload, FileCheck
} from 'lucide-react';
import { User, Staff, Service, CreditTransaction, AppSettings } from '../types';
import { googleAppsScriptFiles } from '../data/googleAppsScript';
import GoogleSheetsExport from './GoogleSheetsExport';
import StaffDetailModal from './StaffDetailModal';
import { getRealCurrentLocation } from '../utils/geolocation';

interface AdminPanelProps {
  currentUser: User | null;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function AdminPanel({
  currentUser,
  settings,
  onUpdateSettings,
  onShowToast
}: AdminPanelProps) {
  // Tabs controllers
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'staff' | 'services' | 'credits' | 'settings' | 'sheets' | 'gas'>('dashboard');
  const [activeSheet, setActiveSheet] = useState<string>('users');
  const [activeGasFileIndex, setActiveGasFileIndex] = useState(0);

  // Loaded database state lists
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [salesViewMode, setSalesViewMode] = useState<'daily' | 'monthly'>('daily');
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rawDb, setRawDb] = useState<any | null>(null);

  // Forms editing states
  const [userFilter, setUserFilter] = useState<'All' | 'Customer' | 'Staff' | 'Admin'>('All');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ name: '', phone: '', password: '', role: 'Customer' });
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  
  // Staff Details & Filters
  const [selectedStaffIdForDetail, setSelectedStaffIdForDetail] = useState<string | null>(null);
  const [staffSearchKeyword, setStaffSearchKeyword] = useState<string>('');
  const [staffGenderFilter, setStaffGenderFilter] = useState<string>('All');
  const [staffVerifyFilter, setStaffVerifyFilter] = useState<string>('All');
  const [staffOnlineFilter, setStaffOnlineFilter] = useState<string>('All');

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceFormName, setServiceFormName] = useState("");
  const [serviceFormDetail, setServiceFormDetail] = useState("");
  const [serviceFormPrice, setServiceFormPrice] = useState<number | string>(350);
  const [serviceFormDuration, setServiceFormDuration] = useState<number | string>(60);
  const [serviceFormCredit, setServiceFormCredit] = useState<number | string>(50);

  // Settings customizer states
  const [formSettings, setFormSettings] = useState<AppSettings>({ ...settings });
  const [isTestingLine, setIsTestingLine] = useState(false);

  // Gemini AI Status & Test states
  const [geminiStatus, setGeminiStatus] = useState<{ connected: boolean; model: string; status: string; supportedBanks?: string[] } | null>(null);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<string | null>(null);
  const [showSlipTester, setShowSlipTester] = useState(false);
  const [slipTestImage, setSlipTestImage] = useState<string>('');
  const [slipTestExpectedAmount, setSlipTestExpectedAmount] = useState<string>('');
  const [isTestingSlip, setIsTestingSlip] = useState(false);
  const [slipTestResult, setSlipTestResult] = useState<any | null>(null);

  const fetchGeminiStatus = async () => {
    try {
      const res = await fetch('/api/gemini/status');
      if (res.ok) {
        const data = await res.json();
        setGeminiStatus(data);
      }
    } catch {
      // ignore
    }
  };

  const handleTestGeminiConnection = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch('/api/gemini/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeminiTestResult(`✅ เชื่อมต่อสำเร็จ (${data.latencyMs}ms): ${data.message}`);
        onShowToast(`เชื่อมต่อ Gemini AI สำเร็จ (${data.latencyMs}ms)`, "success");
      } else {
        setGeminiTestResult(`❌ ทดสอบไม่สำเร็จ: ${data.error || 'ไม่สามารถติดต่อ AI ได้'}`);
        onShowToast(data.error || "เกิดข้อผิดพลาดในการทดสอบ AI", "error");
      }
    } catch (e: any) {
      setGeminiTestResult(`❌ ขัดข้อง: ${e.message}`);
      onShowToast(e.message, "error");
    } finally {
      setIsTestingGemini(false);
      fetchGeminiStatus();
    }
  };

  const handleTestSlipVerification = async () => {
    if (!slipTestImage) {
      onShowToast("กรุณาเลือกหรืออัปโหลดรูปภาพสลิปก่อนทดสอบ", "error");
      return;
    }
    setIsTestingSlip(true);
    setSlipTestResult(null);
    try {
      const res = await fetch('/api/gemini/verify-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slipImage: slipTestImage,
          expectedAmount: slipTestExpectedAmount ? parseFloat(slipTestExpectedAmount) : undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSlipTestResult(data);
        onShowToast("AI สแกนสลิปสำเร็จ 100%!", "success");
      } else {
        onShowToast(data.error || "ไม่สามารถอ่านสลิปได้", "error");
      }
    } catch (e: any) {
      onShowToast(e.message, "error");
    } finally {
      setIsTestingSlip(false);
    }
  };

  const handleTestLineNotification = async () => {
    const token = formSettings.lineChannelAccessToken;
    const adminId = formSettings.lineAdminUserId;

    if (!token || !adminId) {
      onShowToast("กรุณาระบุทั้ง Channel Access Token และ Admin User/Group ID ก่อนกดทดสอบค่ะ", "error");
      return;
    }

    setIsTestingLine(true);
    try {
      const res = await fetch('/api/admin/test-line-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, adminId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ส่งข้อความไม่สำเร็จ');

      onShowToast(data.message, "success");
    } catch (e: any) {
      onShowToast(e.message, "error");
    } finally {
      setIsTestingLine(false);
    }
  };

  // Load database tables
  useEffect(() => {
    fetchDashboardStats();
    fetchStaffList();
    fetchAllUsers();
    fetchServices();
    fetchTransactions();
    fetchRawDatabase();
    fetchGeminiStatus();
  }, [activeTab]);

  useEffect(() => {
    setFormSettings({ ...settings });
  }, [settings]);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      setDashboardStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      setAllStaff(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      // Sort users so Customers appear first during testing
      const sortedData = data.sort((a: any, b: any) => {
        const roleOrder: any = { 'Customer': 1, 'Staff': 2, 'Admin': 3 };
        return (roleOrder[a.Role] || 99) - (roleOrder[b.Role] || 99);
      });
      setAllUsers(sortedData);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/credits/transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRawDatabase = async () => {
    try {
      const res = await fetch('/api/database/export');
      const data = await res.json();
      setRawDb(data);
    } catch (e) {
      console.error(e);
    }
  };

  // User Management
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingUserId;
      const url = isEdit ? `/api/users/${editingUserId}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userForm })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onShowToast(isEdit ? `อัปเดตข้อมูล ${userForm.name} และซิงค์ Google Sheets สำเร็จ` : `เพิ่มผู้ใช้งาน ${userForm.name} และซิงค์เข้าชีตอัตโนมัติเรียบร้อย`, "success");
      setShowUserForm(false);
      setEditingUserId(null);
      setUserForm({ name: '', phone: '', password: '', role: 'Customer' });
      fetchAllUsers();
      if (userForm.role === 'Staff') fetchStaffList();
      fetchRawDatabase();
    } catch (e: any) {
      onShowToast(e.message, "error");
    }
  };
  
  const handleEditUser = (user: User) => {
    setEditingUserId(user.UserID);
    setUserForm({ name: user.Name, phone: user.Phone, password: user.PasswordHash || '', role: user.Role });
    setShowUserForm(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (currentUser && userToDelete.UserID === currentUser.UserID) {
      onShowToast("ไม่สามารถลบบัญชีแอดมินที่กำลังใช้งานอยู่ได้ค่ะ", "error");
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.UserID}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');

      onShowToast(data.message ? `${data.message} (ลบออกจากชีตเรียบร้อย)` : `ลบผู้ใช้งาน "${userToDelete.Name}" และแถวใน Google Sheets สำเร็จ`, "success");
      setUserToDelete(null);
      fetchAllUsers();
      fetchStaffList();
      fetchRawDatabase();
    } catch (e: any) {
      onShowToast(e.message || "เกิดข้อผิดพลาดในการลบผู้ใช้งาน", "error");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!res.ok) throw new Error();
      onShowToast(`เปลี่ยนสิทธิ์การใช้งานเป็น ${role} และอัปเดตชีตแล้ว`, "success");
      fetchAllUsers();
      if (role === 'Staff') fetchStaffList();
      fetchRawDatabase();
    } catch (e) {
      onShowToast("เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์", "error");
    }
  };

  // 1. Staff Approvals & Suspend actions
  const handleApproveStaff = async (staffId: string, status: 'Approved' | 'Reject') => {
    try {
      const res = await fetch(`/api/staff/${staffId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error();
      onShowToast(status === 'Approved' ? "🟢 อนุมัติการขึ้นทะเบียนพนักงานใหม่เรียบร้อยแล้วค่ะ" : "🔴 ปฏิเสธการสมัครพนักงานนวดสำเร็จ", "success");
      fetchStaffList();
    } catch (e) {
      onShowToast("อัปเดตสิทธิ์พนักงานล้มเหลว", "error");
    }
  };

  const handleToggleStaffOnlineState = async (staffId: string, available: 'ON' | 'OFF') => {
    try {
      const res = await fetch('/api/staff/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, available })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "เกิดข้อผิดพลาด");
      onShowToast(`อัปเดตสถานะออนไลน์พนักงานเรียบร้อย (${available})`, "success");
      fetchStaffList();
    } catch (e: any) {
      onShowToast(e.message || "ไม่สามารถอัปเดตสถานะออนไลน์ได้", "error");
    }
  };

  // 2. Credit approvals
  const handleApproveCreditTx = async (txId: string, status: 'Approved' | 'Reject') => {
    const tx = transactions.find(t => t.TransactionID === txId);
    const isRefund = tx?.Type === 'Refund';
    const remark = status === 'Approved' 
      ? (isRefund ? 'อนุมัติคืนเครดิตเนื่องจากงานถูกยกเลิก' : 'ผ่านหลักฐานใบเสร็จโอนเงิน') 
      : (isRefund ? 'ปฏิเสธคำขอคืนเครดิต' : 'หลักฐานสลิปการโอนเงินไม่ตรงกันกรุณาโอนใหม่');
    try {
      const res = await fetch(`/api/credits/transactions/${txId}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remark })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (isRefund) {
        onShowToast(status === 'Approved' ? "✅ ยืนยันอนุมัติคืนเครดิตให้พนักงานเรียบร้อยแล้ว!" : "⚠️ ปฏิเสธคำขอคืนเครดิต", "success");
      } else {
        onShowToast(status === 'Approved' ? "✅ อนุมัติเครดิตและโอนเข้าบัญชีพนักงานแล้ว!" : "⚠️ ปฏิเสธรายการโอนเงิน", "success");
      }
      fetchTransactions();
      fetchStaffList();
    } catch (e: any) {
      onShowToast(e.message, "error");
    }
  };

  // 3. Service CRUD
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ServiceName: serviceFormName,
      Detail: serviceFormDetail,
      Price: Number(serviceFormPrice) || 0,
      Duration: Number(serviceFormDuration) || 60,
      CreditRequired: Number(serviceFormCredit) || 0
    };

    try {
      let res;
      if (editingService) {
        // Edit existing
        res = await fetch(`/api/services/${editingService.ServiceID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Add new
        res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onShowToast(editingService ? "แก้ไขข้อมูลบริการสำเร็จ" : "เพิ่มบริการนวดใหม่ในระบบเรียบร้อยแล้วค่ะ", "success");
      setEditingService(null);
      setShowServiceForm(false);
      fetchServices();
    } catch (e: any) {
      onShowToast(e.message, "error");
    }
  };

  const handleEditServiceInit = (service: Service) => {
    setEditingService(service);
    setServiceFormName(service.ServiceName);
    setServiceFormDetail(service.Detail);
    setServiceFormPrice(service.Price);
    setServiceFormDuration(service.Duration);
    setServiceFormCredit(service.CreditRequired);
    setShowServiceForm(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("คุณต้องการลบหมวดหมู่บริการนวดนี้ออกจากแผงจองนวดจริงหรือไม่?")) return;
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onShowToast("ลบบริการออกจากระบบสำเร็จ", "success");
        fetchServices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Global Settings Update
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formSettings)
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateSettings(data.settings);
        onShowToast("บันทึกข้อมูลและธีมของแพลตฟอร์มเรียบร้อยแล้ว", "success");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 5. Code copier helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    onShowToast("คัดลอกรหัส Google Apps Script สำเร็จแล้ว! วางใน Editor ได้ทันที", "success");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12" id="admin-view-root">
      
      {/* Tab Select Header menu */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeTab === 'dashboard' ? 'bg-sky-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> สรุปภาพรวม (Dashboard)
        </button>

        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeTab === 'users' ? 'bg-sky-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> จัดการผู้ใช้งาน ({allUsers.length})
        </button>

        <button 
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeTab === 'staff' ? 'bg-sky-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> จัดการผู้ให้บริการ ({allStaff.length})
        </button>

        <button 
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeTab === 'services' ? 'bg-sky-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" /> บริการนวด
        </button>

        <button 
          onClick={() => setActiveTab('credits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeTab === 'credits' ? 'bg-sky-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <DollarSign className="w-4 h-4" /> ตรวจสอบยอดเติม ({transactions.filter(t=>t.Status==='Pending').length})
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeTab === 'settings' ? 'bg-sky-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Settings className="w-4 h-4" /> ตั้งค่าระบบ
        </button>

        <button 
          onClick={() => setActiveTab('sheets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeTab === 'sheets' ? 'bg-sky-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Database className="w-4 h-4" /> ฐานข้อมูล Google Sheets
        </button>

        <button 
          onClick={() => setActiveTab('gas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeTab === 'gas' ? 'bg-sky-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <FileCode className="w-4 h-4" /> Google Apps Script Export
        </button>
      </div>

      {/* 1. DASHBOARD ANALYTICS MODULE */}
      {activeTab === 'dashboard' && dashboardStats && (
        <div className="space-y-6 animate-fade-in text-left">
          
          {/* Main Key Metrics Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 border border-slate-100 rounded-3xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">สมาชิกทั้งหมด</span>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-2xl font-black text-slate-800">{dashboardStats.customersCount + dashboardStats.staffCount}</span>
                <span className="text-xs text-slate-400 font-semibold">ราย</span>
              </div>
              <p className="text-[9px] text-slate-400">ลูกค้า {dashboardStats.customersCount} / หมอนวด {dashboardStats.staffCount}</p>
            </div>

            <div className="bg-white p-5 border border-slate-100 rounded-3xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">งานจองนวดทั้งหมด</span>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-2xl font-black text-slate-800">{dashboardStats.totalJobs}</span>
                <span className="text-xs text-slate-400 font-semibold">รายการ</span>
              </div>
              <p className="text-[9px] text-slate-400">จองสดวันนี้: {dashboardStats.todayJobs} ครั้ง</p>
            </div>

            <div className="bg-white p-5 border border-slate-100 rounded-3xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">ยอดรายรับสะสม</span>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-2xl font-black text-slate-800">฿{dashboardStats.totalRevenue}</span>
                <span className="text-xs text-slate-400 font-semibold">บาท</span>
              </div>
              <p className="text-[9px] text-slate-400">รวมค่าเดินทางและค่าบริการนวด</p>
            </div>

            <div className="bg-white p-5 border border-slate-100 rounded-3xl space-y-1 bg-sky-50/20 border-sky-100">
              <span className="text-[10px] font-bold text-sky-800 block uppercase">รายได้คอมมิชชัน ({settings.commissionRate}%)</span>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-2xl font-black text-sky-600">฿{dashboardStats.commissionEarnings.toFixed(0)}</span>
                <span className="text-xs text-sky-500 font-semibold">บาท</span>
              </div>
              <p className="text-[9px] text-sky-600">ค่าส่วนแบ่งที่หักจากระบบ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Visual Charts simulation */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">สถิติยอดขาย</h4>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setSalesViewMode('daily')}
                    className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-colors cursor-pointer ${salesViewMode === 'daily' ? 'bg-white text-sky-600 shadow' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    7 วันล่าสุด
                  </button>
                  <button 
                    onClick={() => setSalesViewMode('monthly')}
                    className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-colors cursor-pointer ${salesViewMode === 'monthly' ? 'bg-white text-sky-600 shadow' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    รายเดือน
                  </button>
                </div>
              </div>
              
              <div className="flex items-end justify-between h-[150px] pt-4">
                {salesViewMode === 'daily' ? (
                  Object.entries(dashboardStats.salesByDay).map(([day, val]: any) => (
                    <div key={day} className="flex flex-col items-center gap-1.5 w-[12%]">
                      <div className="text-[8px] font-bold text-slate-400">฿{val}</div>
                      <div 
                        className="bg-sky-500 rounded-t w-full transition-all duration-500 min-h-[4px]"
                        style={{ height: `${Math.min(100, Math.max(5, (val / 5000) * 100))}%` }}
                      />
                      <div className="text-[8px] font-bold text-slate-500 truncate w-full text-center">
                        {day.split('-')[2]}
                      </div>
                    </div>
                  ))
                ) : (
                  Object.entries(dashboardStats.salesByMonth || {}).map(([monthStr, val]: any) => (
                    <div key={monthStr} className="flex flex-col items-center gap-1.5 flex-1 mx-1">
                      <div className="text-[8px] font-bold text-slate-400">฿{val}</div>
                      <div 
                        className="bg-sky-500 rounded-t w-full transition-all duration-500 min-h-[4px] max-w-[40px]"
                        style={{ height: `${Math.min(100, Math.max(5, (val / 30000) * 100))}%` }}
                      />
                      <div className="text-[8px] font-bold text-slate-500 truncate w-full text-center">
                        {monthStr.split('-')[1]}/{monthStr.split('-')[0].substring(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top performing providers list */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">5 อันดับผู้ให้บริการยอดเยี่ยม</h4>
              
              <div className="divide-y divide-slate-100">
                {dashboardStats.topStaff.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">ไม่พบสถิติพนักงานนวด</div>
                ) : (
                  dashboardStats.topStaff.map((s: any, idx: number) => (
                    <div key={s.Nickname} className="flex items-center justify-between text-xs py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold flex items-center justify-center text-slate-500">{idx+1}</span>
                        <div>
                          <span className="font-bold text-slate-800">พี่{s.Nickname}</span>
                          <span className="text-[10px] text-slate-400 ml-2">({s.TotalJobs} งาน)</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-800">฿{s.TotalIncome}</span>
                        <span className="text-[10px] text-amber-500 ml-2 font-bold">★ {s.Rating}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 text-left animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-800">จัดการผู้ใช้งานในระบบทั้งหมด</h3>
            <button
              onClick={() => {
                setEditingUserId(null);
                setUserForm({ name: '', phone: '', password: '', role: 'Customer' });
                setShowUserForm(!showUserForm);
              }}
              className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              + เพิ่มผู้ใช้งานใหม่
            </button>
          </div>

          {showUserForm && (
            <form onSubmit={handleCreateUser} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">เบอร์โทรศัพท์ (ใช้เข้าระบบ)</label>
                  <input
                    type="text"
                    required
                    value={userForm.phone}
                    onChange={e => setUserForm({...userForm, phone: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">รหัสผ่าน</label>
                  <input
                    type="password"
                    required
                    value={userForm.password}
                    onChange={e => setUserForm({...userForm, password: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">สิทธิ์การใช้งาน (Role)</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({...userForm, role: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="Customer">ผู้ใช้ทั่วไป (Customer)</option>
                    <option value="Staff">พนักงานนวด (Staff)</option>
                    <option value="Admin">แอดมิน (Admin)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUserId(null); }} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 rounded-xl">ยกเลิก</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl">บันทึกข้อมูล</button>
              </div>
            </form>
          )}

          <div className="flex gap-2 border-b border-slate-100 pb-2">
            {(['All', 'Customer', 'Staff', 'Admin'] as const).map(role => (
              <button
                key={role}
                onClick={() => setUserFilter(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  userFilter === role 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {role === 'All' ? 'ผู้ใช้งานทั้งหมด' : 
                 role === 'Customer' ? 'ผู้ใช้ทั่วไป (Customer)' : 
                 role === 'Staff' ? 'พนักงานนวด (Staff)' : 'แอดมิน (Admin)'}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-3 px-2">ข้อมูลผู้ใช้</th>
                  <th className="py-3 px-2">เบอร์โทรศัพท์</th>
                  <th className="py-3 px-2">สิทธิ์การใช้งาน (Role)</th>
                  <th className="py-3 px-2">วันที่สมัคร</th>
                  <th className="py-3 px-2 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {allUsers.filter(u => userFilter === 'All' || u.Role === userFilter).map((user) => (
                  <tr key={user.UserID} className="hover:bg-slate-50/50">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={user.ProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.Name || 'ผู้ใช้')}&background=0D9488&color=fff&size=80`} 
                          className="w-8 h-8 rounded-full object-cover" 
                          alt="User" 
                        />
                        <div>
                          <span className="font-bold text-slate-800 block">{user.Name}</span>
                          <span className="text-[10px] text-slate-400 block">{user.UserID}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2 font-medium">{user.Phone}</td>
                    <td className="py-4 px-2">
                      <select
                        value={user.Role}
                        onChange={(e) => handleChangeRole(user.UserID, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer outline-none ${
                          user.Role === 'Admin' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          user.Role === 'Staff' ? 'bg-sky-50 text-sky-600 border-sky-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <option value="Customer">Customer</option>
                        <option value="Staff">Staff</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-2 text-slate-400">
                      {new Date(user.CreatedDate).toLocaleDateString('th-TH')}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.Role === 'Staff' && (
                          <button
                            onClick={() => {
                              const s = allStaff.find(st => st.UserID === user.UserID);
                              if (s) {
                                setSelectedStaffIdForDetail(s.StaffID);
                              } else {
                                onShowToast('กำลังโหลดข้อมูลพนักงาน...', 'info');
                              }
                            }}
                            className="text-emerald-600 hover:text-emerald-700 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                          >
                            ดูโปรไฟล์หมอ
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditUser(user)} 
                          className="text-sky-500 hover:text-sky-600 text-xs font-bold underline cursor-pointer"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => {
                            if (currentUser && user.UserID === currentUser.UserID) {
                              onShowToast('ไม่สามารถลบบัญชีแอดมินที่กำลังใช้งานอยู่ได้ค่ะ', 'error');
                              return;
                            }
                            setUserToDelete(user);
                          }}
                          className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            currentUser && user.UserID === currentUser.UserID
                              ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                              : 'text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100'
                          }`}
                          title={currentUser && user.UserID === currentUser.UserID ? 'บัญชีที่คุณกำลังใช้งานอยู่' : 'ลบผู้ใช้นี้ออกจากระบบ'}
                          disabled={currentUser ? user.UserID === currentUser.UserID : false}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบ</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. MANAGE STAFF & APPROVALS */}
      {activeTab === 'staff' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 text-left animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800">รายชื่อและข้อมูลผู้ให้บริการทั้งหมดในระบบ</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                คลิกที่ชื่อหรือปุ่ม "ดูข้อมูลเต็ม" เพื่อตรวจสอบข้อมูล ประวัติงาน รีวิว และปรับยอดเครดิตแยกรายคน
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-sky-50 text-sky-700 px-3 py-1.5 rounded-xl border border-sky-100">
                พนักงานทั้งหมด: {allStaff.length} คน
              </span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">ค้นหาพนักงาน</label>
              <input
                type="text"
                value={staffSearchKeyword}
                onChange={(e) => setStaffSearchKeyword(e.target.value)}
                placeholder="ค้นหาชื่อเล่น, ชื่อจริง, เบอร์โทร, รหัส..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">สถานะการอนุมัติ</label>
              <select
                value={staffVerifyFilter}
                onChange={(e) => setStaffVerifyFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="All">ทั้งหมด ({allStaff.length})</option>
                <option value="Approved">อนุมัติแล้ว ({allStaff.filter(s => s.VerifyStatus === 'Approved').length})</option>
                <option value="Pending">รอตรวจสอบ ({allStaff.filter(s => s.VerifyStatus === 'Pending').length})</option>
                <option value="Reject">ไม่อนุมัติ ({allStaff.filter(s => s.VerifyStatus === 'Reject').length})</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">สถานะรับงาน</label>
              <select
                value={staffOnlineFilter}
                onChange={(e) => setStaffOnlineFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="All">ทั้งหมด</option>
                <option value="ON">🟢 กำลังออนไลน์ ({allStaff.filter(s => s.Available === 'ON').length})</option>
                <option value="OFF">⚪ ออฟไลน์ ({allStaff.filter(s => s.Available === 'OFF').length})</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">เพศ</label>
              <select
                value={staffGenderFilter}
                onChange={(e) => setStaffGenderFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="All">ทุกเพศ</option>
                <option value="Female">หญิง</option>
                <option value="Male">ชาย</option>
                <option value="Other">อื่นๆ</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-3 px-2">ข้อมูลพนักงาน</th>
                  <th className="py-3 px-2">ยอดเครดิต</th>
                  <th className="py-3 px-2">สถานะออนไลน์</th>
                  <th className="py-3 px-2">ผลงานและรายได้</th>
                  <th className="py-3 px-2">สิทธิ์อนุมัติ</th>
                  <th className="py-3 px-2 text-right">รายละเอียดรายคน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {allStaff
                  .filter(staff => {
                    const matchesKeyword = !staffSearchKeyword || 
                      staff.Nickname?.toLowerCase().includes(staffSearchKeyword.toLowerCase()) ||
                      staff.Name?.toLowerCase().includes(staffSearchKeyword.toLowerCase()) ||
                      staff.Phone?.includes(staffSearchKeyword) ||
                      staff.StaffID?.toLowerCase().includes(staffSearchKeyword.toLowerCase());
                    
                    const matchesGender = staffGenderFilter === 'All' || staff.Gender === staffGenderFilter;
                    const matchesVerify = staffVerifyFilter === 'All' || staff.VerifyStatus === staffVerifyFilter;
                    const matchesOnline = staffOnlineFilter === 'All' || staff.Available === staffOnlineFilter;

                    return matchesKeyword && matchesGender && matchesVerify && matchesOnline;
                  })
                  .map((staff) => (
                    <tr key={staff.StaffID} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-2">
                        <div 
                          onClick={() => setSelectedStaffIdForDetail(staff.StaffID)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="relative">
                            <img 
                              src={staff.ProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.Nickname || 'พนักงาน')}&background=0D9488&color=fff&size=80`} 
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 group-hover:ring-2 group-hover:ring-sky-400 transition-all" 
                              alt="Staff" 
                            />
                            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border border-white ${
                              staff.Available === 'ON' ? 'bg-emerald-500' : 'bg-slate-300'
                            }`} />
                          </div>
                          <div>
                            <span className="font-black text-slate-900 group-hover:text-sky-600 transition-colors block">
                              พี่{staff.Nickname} ({staff.Gender === 'Female' ? 'หญิง' : staff.Gender === 'Male' ? 'ชาย' : 'อื่นๆ'}) • {staff.Age} ปี
                            </span>
                            <span className="text-[10px] text-slate-400 block font-semibold">
                              {staff.Name} • โทร {staff.Phone} • <span className="font-mono text-slate-500">{staff.StaffID}</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <span className="font-black text-sky-700 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100 font-mono">
                          {staff.Credit.toFixed(0)} CR
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStaffOnlineState(staff.StaffID, staff.Available === 'ON' ? 'OFF' : 'ON')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                              staff.Available === 'ON' ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                staff.Available === 'ON' ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          <span className={`text-[10px] font-bold ${staff.Available === 'ON' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {staff.Available === 'ON' ? 'ออนไลน์' : 'ออฟไลน์'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <span className="font-black text-emerald-600 block">รายได้สะสม: ฿{staff.TotalIncome?.toLocaleString() || '0'}</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          งานสำเร็จ {staff.TotalJobs || 0} ครั้ง • ดาว ★{staff.Rating?.toFixed(1) || '5.0'}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        {staff.VerifyStatus === 'Pending' ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleApproveStaff(staff.StaffID, 'Approved')}
                              className="bg-sky-50 hover:bg-sky-100 text-sky-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="อนุมัติพนักงาน"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApproveStaff(staff.StaffID, 'Reject')}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="ปฏิเสธ"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            staff.VerifyStatus === 'Approved' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                          }`}>{staff.VerifyStatus}</span>
                        )}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button
                          onClick={() => setSelectedStaffIdForDetail(staff.StaffID)}
                          className="bg-sky-50 hover:bg-sky-100 text-sky-600 font-bold px-3 py-1.5 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> ดูข้อมูลเต็ม
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MANAGE SERVICES */}
      {activeTab === 'services' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 text-left animate-fade-in">
          
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-800">จัดการรายการหมวดหมู่บริการนวด</h3>
            <button
              onClick={() => {
                setEditingService(null);
                setServiceFormName("");
                setServiceFormDetail("");
                setServiceFormPrice(350);
                setServiceFormDuration(60);
                setServiceFormCredit(50);
                setShowServiceForm(true);
              }}
              className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> เพิ่มบริการนวดใหม่
            </button>
          </div>

          {/* Service Add/Edit Form Overlay Modal */}
          {showServiceForm && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <form onSubmit={handleServiceSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scale-up space-y-4">
                <h3 className="text-base font-black text-slate-900">
                  {editingService ? 'แก้ไขข้อมูลบริการนวด' : 'เพิ่มรายการบริการนวดตัวใหม่'}
                </h3>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ชื่อบริการนวด</label>
                  <input
                    type="text"
                    value={serviceFormName}
                    onChange={(e) => setServiceFormName(e.target.value)}
                    required
                    placeholder="เช่น นวดแผนไทยประคบสมุนไพร"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">รายละเอียดบริการ</label>
                  <textarea
                    value={serviceFormDetail}
                    onChange={(e) => setServiceFormDetail(e.target.value)}
                    rows={3}
                    placeholder="เช่น นวดกดจุดบำบัดรักษาพังผืดกล้ามเนื้อตึง..."
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ราคารวมที่ลูกค้าจ่าย (บาท)</label>
                      <input
                        type="number"
                        value={serviceFormPrice}
                        onChange={(e) => setServiceFormPrice(e.target.value === '' ? '' : (parseFloat(e.target.value) || ''))}
                        placeholder="เช่น 350"
                        required
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เวลาให้บริการ (นาที)</label>
                      <input
                        type="number"
                        value={serviceFormDuration}
                        onChange={(e) => setServiceFormDuration(e.target.value === '' ? '' : (parseInt(e.target.value) || ''))}
                        placeholder="เช่น 60"
                        required
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">เครดิตที่ต้องใช้ในการรับงาน (หักจากพนักงาน)</label>
                      <input
                        type="number"
                        value={serviceFormCredit}
                        onChange={(e) => setServiceFormCredit(e.target.value === '' ? '' : (parseInt(e.target.value) || ''))}
                        placeholder="เช่น 50"
                        required
                        className="w-full text-xs font-semibold border border-amber-200 rounded-xl p-3 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-amber-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">พนักงานจะได้รับเงินสดสุทธิ (บาท)</label>
                      <div className="w-full text-xs font-black border border-sky-200 rounded-xl p-3 bg-sky-50 text-sky-700 flex items-center">
                        ฿{Math.max(0, (Number(serviceFormPrice) || 0) - (Number(serviceFormCredit) || 0))} บาท
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    * เมื่อพนักงานกดรับงาน ระบบจะหักเครดิตจากกระเป๋าเงินพนักงานตามยอด "หักเครดิต" ทันที และพนักงานจะได้รับเงินสดจากลูกค้าโดยตรงเต็มจำนวน (หักลบกันคือรายได้สุทธิของพนักงาน)
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowServiceForm(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-3 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    บันทึกข้อมูลบริการ
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Services list display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => (
              <div key={service.ServiceID} className="border border-slate-100 bg-white p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] bg-sky-50 text-sky-800 border border-sky-100 font-extrabold px-2.5 py-0.5 rounded-full">
                      {service.Duration} นาที
                    </span>
                    <span className="text-xs font-black text-sky-600">฿{service.Price}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{service.ServiceName}</h4>
                  <p className="text-xs text-slate-500 leading-normal">{service.Detail}</p>
                </div>

                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3.5 mt-4 text-[10px] font-bold">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>หักเครดิตระบบ (เจ้าของร้าน):</span>
                    <span className="text-amber-600 font-black">{service.CreditRequired} CR</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>พนักงานได้เงินสุทธิ:</span>
                    <span className="text-sky-600 font-black">฿{Math.max(0, service.Price - service.CreditRequired)}</span>
                  </div>
                  <div className="flex justify-end gap-2 mt-1">
                    <button
                      onClick={() => handleEditServiceInit(service)}
                      className="text-sky-600 hover:text-sky-700 bg-sky-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> แก้ไข
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.ServiceID)}
                      className="text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 4. CREDIT TOPUPS & REFUND APPROVALS LIST */}
      {activeTab === 'credits' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 text-left animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                ตรวจสอบเครดิตและการคืนเงิน (ระบบคัดกรอง & ยืนยันโดยแอดมิน)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                สลิปโอนเงินที่ถูกต้อง AI จะเติมเครดิตให้อัตโนมัติ • หากงานถูกยกเลิก การคืนเครดิตพนักงานจะต้องได้รับการยืนยันจากแอดมินที่นี่
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                ขอคืนเครดิต: {transactions.filter(t => t.Status === 'Pending' && t.Type === 'Refund').length} รายการ
              </span>
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                สลิปค้างตรวจ: {transactions.filter(t => t.Status === 'Pending' && t.Type !== 'Refund').length} รายการ
              </span>
            </div>
          </div>

          {/* Slip Verification Status & Test Widget */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black tracking-tight">ระบบตรวจสลิปอัตโนมัติ (Slip Mini QR & AI)</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ไม่ต้องใช้ API Key (สแกน Slip QR ในตัว)
                    </span>
                    {geminiStatus?.connected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        + Gemini AI สำรอง
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    สแกนถอดรหัส QR Code ธนาคารทางการ ตรวจสอบรหัสอ้างอิงและกันสลิปซ้ำทันที 100% โดยไม่ต้องพึ่งพา API Key ภายนอก
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {geminiStatus?.connected && (
                  <button
                    type="button"
                    onClick={handleTestGeminiConnection}
                    disabled={isTestingGemini}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-300 ${isTestingGemini ? 'animate-spin' : ''}`} />
                    {isTestingGemini ? 'กำลังทดสอบ...' : 'ทดสอบ Gemini'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSlipTester(!showSlipTester)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showSlipTester
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5 text-emerald-300" />
                  {showSlipTester ? 'ซ่อนเครื่องมือทดสอบ' : 'ทดสอบสแกนสลิป'}
                </button>
              </div>
            </div>

            {geminiTestResult && (
              <div className="text-xs bg-black/40 border border-white/10 rounded-xl p-2.5 text-slate-200 font-mono">
                {geminiTestResult}
              </div>
            )}

            {/* Interactive Slip Tester Drawer */}
            {showSlipTester && (
              <div className="bg-slate-950/70 border border-white/15 rounded-xl p-4 space-y-4 animate-fade-in text-left">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase text-slate-200 tracking-wider">เครื่องมือทดสอบสแกนสลิป (Slip Inspector Sandbox)</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">⚡ ถอดรหัสผ่าน Slip QR Code โดยตรง (ไม่ต้องใช้ API Key)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-300 block">อัปโหลดรูปภาพสลิปที่ต้องการทดสอบ</label>
                    <div className="flex items-center gap-3 bg-white/5 border border-dashed border-white/20 p-3 rounded-xl relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSlipTestImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-16 h-20 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {slipTestImage ? (
                          <img src={slipTestImage} alt="Slip Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 text-xs text-slate-300">
                        {slipTestImage ? (
                          <span className="text-emerald-400 font-bold">แนบรูปภาพสลิปเรียบร้อยแล้ว</span>
                        ) : (
                          <span>คลิกหรือลากไฟล์ภาพสลิปมาวางที่นี่</span>
                        )}
                        <span className="block text-[10px] text-slate-400 mt-1">รองรับ JPG, PNG, WEBP จากทุกธนาคาร</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">ยอดเงินที่คาดหวัง (ระบุเพื่อทดสอบตรวจยอดเงินตรงหรือไม่)</label>
                      <input
                        type="number"
                        placeholder="เช่น 100, 300, 500 (ไม่บังคับ)"
                        value={slipTestExpectedAmount}
                        onChange={(e) => setSlipTestExpectedAmount(e.target.value)}
                        className="w-full text-xs font-mono bg-white/10 border border-white/15 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleTestSlipVerification}
                      disabled={isTestingSlip || !slipTestImage}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {isTestingSlip ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>กำลังตรวจสอบสลิปและถอดรหัส QR Code...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4" />
                          <span>เริ่มสแกนตรวจสอบสลิป (ไม่ต้องใช้ API Key)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Analysis Result Display */}
                  <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="text-[11px] font-bold text-slate-300 block">
                        ผลการตรวจสอบสลิป
                      </span>
                      {slipTestResult && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {slipTestResult.method || "Slip QR Decoder"}
                        </span>
                      )}
                    </div>
                    {slipTestResult ? (
                      <div className="space-y-2 font-mono text-[11px]">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white/5 p-2 rounded-lg">
                            <span className="text-slate-400 text-[9px] block">ยอดเงินในสลิป</span>
                            <span className="text-emerald-400 font-bold text-sm">฿{slipTestResult.result.amount} บาท</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg">
                            <span className="text-slate-400 text-[9px] block">ความมั่นใจของ AI</span>
                            <span className="text-sky-400 font-bold text-sm">{slipTestResult.result.confidence}%</span>
                          </div>
                        </div>

                        <div className="bg-white/5 p-2 rounded-lg space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">ธนาคาร:</span>
                            <span className="text-white font-sans font-bold">{slipTestResult.result.bankName || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">รหัสอ้างอิง (Ref No.):</span>
                            <span className="text-amber-300">{slipTestResult.result.refNo || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ผู้รับเงิน:</span>
                            <span className="text-white font-sans">{slipTestResult.result.receiverName || slipTestResult.result.receiverAccount || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ผู้โอน:</span>
                            <span className="text-slate-300 font-sans">{slipTestResult.result.senderName || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">เวลาโอน:</span>
                            <span className="text-slate-300">{slipTestResult.result.transferDateTime || '-'}</span>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${slipTestResult.result.isValidSlip ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                            <span className="text-slate-300">สลิปทางการถูกต้อง: {slipTestResult.result.isValidSlip ? '✅ ใช่' : '❌ ไม่ใช่'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${!slipTestResult.result.isTamperedOrFake ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                            <span className="text-slate-300">ไม่พบร่องรอยตัดต่อ: {!slipTestResult.result.isTamperedOrFake ? '✅ ผ่าน' : '❌ พบร่องรอยแก้ไข'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${!slipTestResult.isDuplicateRef ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                            <span className="text-slate-300">สลิปไม่ซ้ำในระบบ: {!slipTestResult.isDuplicateRef ? '✅ ผ่าน (ยังไม่เคยใช้)' : '❌ สลิปซ้ำ'}</span>
                          </div>
                        </div>

                        {slipTestResult.result.isSuspicious && (
                          <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 font-sans text-xs">
                            ⚠️ ข้อควรระวัง: {slipTestResult.result.suspiciousDetail || 'ภาพมีความผิดปกติ'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-center py-8">
                        เลือกรูปสลิปและกด "เริ่มสแกนตรวจสอบสลิป" เพื่อดูข้อมูลแบบเรียลไทม์
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {transactions.filter(t => t.Status === 'Pending').length === 0 ? (
              <div className="text-center py-10 bg-emerald-50/40 border border-emerald-100 rounded-2xl p-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-black text-emerald-800">ไม่มีสลิปหรือคำขอคืนเครดิตค้างตรวจสอบในขณะนี้</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  สลิปปกติได้รับการอนุมัติเติมเครดิตอัตโนมัติแล้ว และไม่มีรายการขอยกเลิกงานรอการยืนยันคืนเครดิตค่ะ
                </p>
              </div>
            ) : (
              transactions.filter(t => t.Status === 'Pending').map((t) => {
                const isRefund = t.Type === 'Refund';
                return (
                  <div 
                    key={t.TransactionID} 
                    className={`border rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all shadow-xs ${
                      isRefund
                        ? 'border-purple-200 bg-purple-50/40'
                        : t.IsSuspicious 
                          ? 'border-amber-300 bg-amber-50/30' 
                          : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Visual Icon / Slip Image Thumbnail */}
                      {isRefund ? (
                        <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-purple-100 border border-purple-200 text-purple-600 flex flex-col items-center justify-center shrink-0 shadow-xs gap-1">
                          <RotateCcw className="w-6 h-6 animate-spin-slow" />
                          <span className="text-[9px] font-black uppercase text-purple-700">คืนเครดิต</span>
                        </div>
                      ) : (
                        <div className="w-20 h-24 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 relative group shadow-xs">
                          <img src={t.SlipImage} className="w-full h-full object-cover" alt="Slip" />
                          <a 
                            href={t.SlipImage} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity gap-1"
                          >
                            <Eye className="w-5 h-5" />
                            <span className="text-[9px] font-bold">ดูรูปเต็ม</span>
                          </a>
                        </div>
                      )}

                      <div className="space-y-1.5 text-left">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-extrabold uppercase">
                            {t.TransactionID}
                          </span>
                          {isRefund ? (
                            <span className="text-[9px] bg-purple-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <RotateCcw className="w-3 h-3" />
                              คำขอคืนเครดิตจากงานยกเลิก
                            </span>
                          ) : t.IsSuspicious ? (
                            <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              ⚠️ ตรวจพบข้อสงสัย
                            </span>
                          ) : null}

                          {t.BookingID && (
                            <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                              งาน #{t.BookingID}
                            </span>
                          )}

                          {t.BankName && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                              {t.BankName}
                            </span>
                          )}
                          {t.SlipRefId && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded">
                              Ref: {t.SlipRefId}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2">
                          <h4 className="font-extrabold text-slate-900 text-base">
                            {isRefund ? `ขอคืนเครดิตจำนวน: ฿${t.Amount} CR` : `ยอดแจ้งเติม: ฿${t.Amount} บาท`}
                          </h4>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          พนักงาน: <strong className="text-slate-800">พี่{t.StaffNickname}</strong> ({t.StaffFullName}) • โทร {t.StaffPhone}
                        </p>

                        {/* Refund Details or Suspicious reasons */}
                        {isRefund ? (
                          <div className="bg-purple-100/60 border border-purple-200 rounded-xl p-2.5 text-xs text-purple-900 space-y-1 mt-1">
                            <span className="font-black text-[10px] uppercase text-purple-700 block">
                              📌 ข้อมูลการยกเลิกงาน:
                            </span>
                            <p className="text-[11px] font-medium leading-relaxed">
                              {t.AdminRemark || t.SlipVerificationDetail || 'มีการยกเลิกงานจองที่พนักงานเคยกดรับไว้'}
                            </p>
                          </div>
                        ) : t.SuspiciousReasons && t.SuspiciousReasons.length > 0 ? (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 space-y-1 mt-1">
                            <span className="text-[10px] font-black text-rose-800 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              สาเหตุที่ระบบส่งให้แอดมินตรวจสอบด้วยตนเอง:
                            </span>
                            <ul className="text-[10px] text-rose-700 list-disc list-inside space-y-0.5 font-medium">
                              {t.SuspiciousReasons.map((reason: string, idx: number) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {/* Details extracted from slip (for topups) */}
                        {!isRefund && (
                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 pt-0.5">
                            {t.ExtractedReceiver && (
                              <span className="bg-slate-100 px-2 py-0.5 rounded">
                                ผู้รับบนสลิป: {t.ExtractedReceiver}
                              </span>
                            )}
                            {t.ExtractedSender && (
                              <span className="bg-slate-100 px-2 py-0.5 rounded">
                                ผู้โอนบนสลิป: {t.ExtractedSender}
                              </span>
                            )}
                            {t.ExtractedTransferTime && (
                              <span className="bg-slate-100 px-2 py-0.5 rounded">
                                เวลาโอน: {t.ExtractedTransferTime}
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-[10px] text-slate-400 font-semibold">
                          ทำรายการเมื่อ: {t.CreatedDate.replace('T', ' ').substring(0, 19)}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => handleApproveCreditTx(t.TransactionID, 'Approved')}
                        className={`flex-1 sm:flex-initial text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ${
                          isRefund
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-emerald-500 hover:bg-emerald-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        {isRefund ? 'ยืนยันอนุมัติคืนเครดิต' : 'อนุมัติเติมเครดิต'}
                      </button>
                      <button
                        onClick={() => handleApproveCreditTx(t.TransactionID, 'Reject')}
                        className="flex-1 sm:flex-initial border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        {isRefund ? 'ปฏิเสธการคืน' : 'ปฏิเสธสลิป'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* History of transactions */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">ประวัติการตรวจสอบโอนเงินล่าสุด</h4>
            <div className="divide-y divide-slate-100 text-xs">
              {transactions.filter(t => t.Status !== 'Pending').slice(0, 10).map((t) => (
                <div key={t.TransactionID} className="py-3 flex justify-between items-center gap-4 text-left">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">ยอดโอน: ฿{t.Amount} บาท (หมอนวด: พี่{t.StaffNickname})</span>
                      {t.IsAutoApproved && (
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full">
                          🤖 AI อนุมัติอัตโนมัติ
                        </span>
                      )}
                      {t.BankName && (
                        <span className="text-[8px] bg-slate-100 text-slate-600 font-semibold px-1 py-0.5 rounded">
                          {t.BankName}
                        </span>
                      )}
                    </div>
                    {t.SlipRefId && (
                      <span className="text-[9px] text-slate-400 font-mono block">รหัสอ้างอิง: {t.SlipRefId}</span>
                    )}
                    <span className="text-[10px] text-slate-500 block">สถานะ: {t.Status === 'Approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'} • รายละเอียด: {t.AdminRemark || 'เรียบร้อย'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-bold shrink-0 ${
                    t.Status === 'Approved' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
                  }`}>{t.Status === 'Approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 5. SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 text-left animate-fade-in">
          <h3 className="text-base font-black text-slate-800">ตั้งค่าพารามิเตอร์แพลตฟอร์มเรียกนวด</h3>

          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ชื่อบริษัท / แพลตฟอร์ม</label>
                <input
                  type="text"
                  value={formSettings.companyName}
                  onChange={(e) => setFormSettings({ ...formSettings, companyName: e.target.value })}
                  required
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">โลโก้สถาบัน (URL รูปภาพ)</label>
                <input
                  type="text"
                  value={formSettings.logo}
                  onChange={(e) => setFormSettings({ ...formSettings, logo: e.target.value })}
                  required
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ค่าเดินทางเกินระยะต่อกม. (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formSettings.travelFeePerKm}
                  onChange={(e) => setFormSettings({ ...formSettings, travelFeePerKm: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ค่าคอมมิชชันระบบ (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formSettings.commissionRate}
                  onChange={(e) => setFormSettings({ ...formSettings, commissionRate: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                />
              </div>
            </div>

            {/* Dedicated Search Radius Section */}
            <div className="border border-sky-100 bg-sky-50/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500 text-white shadow-xs">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      ระยะทางการค้นหาพนักงานนวดสูงสุด (Search Radius)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      กำหนดรัศมีที่ระบบจะค้นหาและแสดงหมอนวดที่ออนไลน์ให้ลูกค้า โดยสามารถปรับแก้ไขและขยายได้มากกว่า 15 กม. อย่างอิสระ
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-sky-700 bg-white px-3 py-1 rounded-xl border border-sky-200 shadow-xs shrink-0">
                  {formSettings.searchRadius || 15} กม.
                </span>
              </div>

              {/* Input and Quick Presets */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      step="1"
                      value={formSettings.searchRadius}
                      onChange={(e) => setFormSettings({ ...formSettings, searchRadius: parseFloat(e.target.value) || 15 })}
                      required
                      className="w-full text-sm font-black border border-slate-300 rounded-xl pl-4 pr-12 py-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-xs"
                      placeholder="เช่น 15, 20, 25, 30, 50"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      กม.
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">ปุ่มลัด:</span>
                    {[15, 20, 25, 30, 50, 100].map((radius) => {
                      const isSelected = formSettings.searchRadius === radius;
                      return (
                        <button
                          key={radius}
                          type="button"
                          onClick={() => setFormSettings({ ...formSettings, searchRadius: radius })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                          }`}
                        >
                          {radius} กม.
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic guidance based on radius */}
                {formSettings.searchRadius > 15 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>ขยายพื้นที่บริการแล้ว:</strong> ขณะนี้ระบบค้นหาหมอนวดในระยะ <strong>{formSettings.searchRadius} กม.</strong> (กว้างกว่า 15 กม.) ลูกค้าจะสามารถค้นหาและจองหมอนวดในพื้นที่นี้ได้ทันที แนะนำให้ตรวจสอบตารางอัตราค่าเดินทางด้านล่างหากต้องการกำหนดราคาค่าเดินทางแยกตามช่วงระยะทางค่ะ
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    💡 ค่าเริ่มต้นทั่วไปคือ 15 กม. หากในอนาคตต้องการขยายพื้นที่ให้บริการ สามารถปรับเพิ่มตัวเลขหรือคลิกปุ่มลัดด้านบนได้ทันทีค่ะ
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">ตั้งค่าอัตราค่าเดินทางตามระยะทาง</label>
                <button
                  type="button"
                  onClick={() => setFormSettings({
                    ...formSettings,
                    travelFeeTiers: [...(formSettings.travelFeeTiers || []), { minKm: 0, maxKm: 0, fee: 0 }]
                  })}
                  className="flex items-center gap-1 text-[10px] bg-sky-50 text-sky-600 hover:bg-sky-100 px-2 py-1 rounded font-bold transition-colors"
                >
                  <Plus className="w-3 h-3" /> เพิ่มช่วงระยะ
                </button>
              </div>
              
              <div className="space-y-2">
                {formSettings.travelFeeTiers?.map((tier, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">ตั้งแต่</span>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.minKm}
                        onChange={(e) => {
                          const newTiers = [...formSettings.travelFeeTiers];
                          newTiers[index].minKm = parseFloat(e.target.value) || 0;
                          setFormSettings({ ...formSettings, travelFeeTiers: newTiers });
                        }}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        placeholder="กม."
                      />
                      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">ถึง</span>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.maxKm}
                        onChange={(e) => {
                          const newTiers = [...formSettings.travelFeeTiers];
                          newTiers[index].maxKm = parseFloat(e.target.value) || 0;
                          setFormSettings({ ...formSettings, travelFeeTiers: newTiers });
                        }}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        placeholder="กม."
                      />
                      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">กม. ราคา</span>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.fee}
                        onChange={(e) => {
                          const newTiers = [...formSettings.travelFeeTiers];
                          newTiers[index].fee = parseFloat(e.target.value) || 0;
                          setFormSettings({ ...formSettings, travelFeeTiers: newTiers });
                        }}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        placeholder="บาท"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newTiers = formSettings.travelFeeTiers.filter((_, i) => i !== index);
                        setFormSettings({ ...formSettings, travelFeeTiers: newTiers });
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!formSettings.travelFeeTiers || formSettings.travelFeeTiers.length === 0) && (
                  <div className="text-[10px] text-slate-400 italic py-2 text-center">ไม่มีการตั้งค่าช่วงระยะทาง (จะใช้ค่าเริ่มต้นกม.ละ {formSettings.travelFeePerKm} บาท)</div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ข้อความแบนเนอร์ประชาสัมพันธ์</label>
              <input
                type="text"
                value={formSettings.bannerText}
                onChange={(e) => setFormSettings({ ...formSettings, bannerText: e.target.value })}
                required
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">รหัสคูปองส่วนลดสูงสุด</label>
                <input
                  type="text"
                  value={formSettings.couponCode}
                  onChange={(e) => setFormSettings({ ...formSettings, couponCode: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ยอดเงินส่วนลด (บาท)</label>
                <input
                  type="number"
                  value={formSettings.couponDiscount}
                  onChange={(e) => setFormSettings({ ...formSettings, couponDiscount: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                />
              </div>
            </div>

            {/* Gemini API Automation Settings Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 border border-indigo-800/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">การตรวจสลิปอัตโนมัติด้วย Google Gemini API (3.8 Flash)</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        เชื่อมต่อและทำงานอัตโนมัติแล้ว
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 mt-0.5">
                      คีย์ GEMINI_API_KEY ถูกติดตั้งและทำงานฝั่งเซิร์ฟเวอร์เรียบร้อย ตรวจสอบยอดเงิน ชื่อบัญชี และสลิปซ้ำให้พนักงานอัตโนมัติ 100%
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestGeminiConnection}
                  disabled={isTestingGemini}
                  className="text-xs font-bold px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 text-amber-300 ${isTestingGemini ? 'animate-spin' : ''}`} />
                  {isTestingGemini ? 'กำลังทดสอบ...' : 'ทดสอบเรียก AI'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                  <span className="text-indigo-300 font-bold block">1. สแกนอัตโนมัติ</span>
                  <span className="text-slate-300 text-[10px]">อ่าน Ref No., ยอดเงิน, ธนาคาร, และชื่อบัญชีผู้รับ</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                  <span className="text-indigo-300 font-bold block">2. ป้องกันทุจริต & สลิปซ้ำ</span>
                  <span className="text-slate-300 text-[10px]">เช็คประวัติในระบบว่าสลิปนี้เคยนำมาใช้แล้วหรือไม่</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                  <span className="text-indigo-300 font-bold block">3. เติมเครดิตทันที</span>
                  <span className="text-slate-300 text-[10px]">สลิปถูกต้อง พนักงานจะได้รับเครดิตทันที ไม่ต้องรอแอดมิน</span>
                </div>
              </div>
            </div>

            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 pt-4">ตั้งค่าบัญชีรับเงิน (สำหรับเติมเครดิต)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ธนาคาร</label>
                <input
                  type="text"
                  value={formSettings.bankName || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, bankName: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                  placeholder="เช่น ธนาคารกสิกรไทย"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เลขที่บัญชี</label>
                <input
                  type="text"
                  value={formSettings.bankAccount || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, bankAccount: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                  placeholder="เช่น 123-4-56789-0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ชื่อบัญชี</label>
                <input
                  type="text"
                  value={formSettings.bankAccountName || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, bankAccountName: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                  placeholder="เช่น บจก. สบายดี มาสสาจ"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ลิงก์รูปภาพ QR Code</label>
                <input
                  type="text"
                  value={formSettings.qrCodeImage || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, qrCodeImage: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* LINE Messaging API (Admin-Only Notification) */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    การแจ้งเตือน LINE สำหรับแอดมิน (Admin-Only Private Push)
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    ระบบจะส่งแจ้งเตือนแบบ Push เจาะจงเฉพาะ User ID ของแอดมิน หรือ Group ID ของกลุ่มทีมงานเท่านั้น <strong className="text-emerald-700 font-bold">ลูกค้าจะไม่เห็นข้อความแจ้งเตือนเหล่านี้ 100%</strong>
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-full self-start">
                  🔒 ปลอดภัย ไม่บรอดแคสต์หาลูกค้า
                </span>
              </div>

              {/* Troubleshooting helper box */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-slate-700 space-y-3 leading-relaxed">
                <div className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs">
                  ⚠️ เช็กลิสต์หากพบข้อผิดพลาด "LINE API Error (400: Failed to send messages)":
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-white/80 border border-amber-200/70 rounded-xl p-3 space-y-1.5">
                    <strong className="text-emerald-800 font-bold flex items-center gap-1">
                      ✅ ทางเลือกที่ 1: ส่งเข้า LINE ส่วนตัวแอดมิน (ง่ายสุด ได้ทันที)
                    </strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 pl-0.5">
                      <li>ใช้ค่า <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-700 font-bold">Your user ID</code> ที่ขึ้นต้นด้วยตัว <strong className="text-emerald-800">U</strong> (เช่น U1a2b3c...) จากแท็บ Basic settings</li>
                      <li><strong className="text-rose-700">สำคัญ:</strong> กด **เพิ่มเพื่อน (Add Friend)** กับบอท LINE OA ของคุณก่อนทดสอบ</li>
                    </ul>
                  </div>

                  <div className="bg-white/80 border border-amber-200/70 rounded-xl p-3 space-y-1.5">
                    <strong className="text-indigo-800 font-bold flex items-center gap-1">
                      👥 ทางเลือกที่ 2: ส่งเข้ากลุ่ม LINE ทีมงาน (Group ID: C...)
                    </strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 pl-0.5">
                      <li><strong className="text-rose-700">ขั้นตอนที่ 1:</strong> เข้า <a href="https://manager.line.biz" target="_blank" rel="noreferrer" className="text-sky-600 underline font-bold">LINE Official Account Manager</a> &gt; ตั้งค่า &gt; ตั้งค่าบัญชี &gt; **เปิด "อนุญาตให้บัญชีเข้าร่วมกลุ่มและแชทหลายคน"**</li>
                      <li><strong className="text-rose-700">ขั้นตอนที่ 2:</strong> เชิญบอท LINE OA เข้าไปในกลุ่มแอดมิน</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    LINE Channel Access Token (Long-Lived)
                  </label>
                  <input
                    type="password"
                    value={formSettings.lineChannelAccessToken || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, lineChannelAccessToken: e.target.value })}
                    className="w-full text-xs font-mono font-medium border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:border-emerald-500"
                    placeholder="eyJhbGciOiJIUzI1Ni..."
                  />
                  <p className="text-[9px] text-slate-400">จากแท็บ Messaging API &gt; Channel access token (long-lived) ใน LINE Developers</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Admin User ID หรือ Group ID (ผู้รับแจ้งเตือน)
                  </label>
                  <input
                    type="text"
                    value={formSettings.lineAdminUserId || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, lineAdminUserId: e.target.value })}
                    className="w-full text-xs font-mono font-medium border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:border-emerald-500"
                    placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx หรือ Cxxxxxx..."
                  />
                  <p className="text-[9px] text-slate-400">
                    แนะนำใช้ User ID (ขึ้นต้นด้วย U จาก Basic settings) หรือ Group ID (ขึ้นต้นด้วย C)
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTestLineNotification}
                  disabled={isTestingLine || !formSettings.lineChannelAccessToken || !formSettings.lineAdminUserId}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isTestingLine ? (
                    <>กำลังส่งข้อความทดสอบ...</>
                  ) : (
                    <>📲 ทดสอบส่งข้อความเข้า LINE แอดมิน</>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3.5 rounded-xl shadow transition-colors cursor-pointer"
            >
              บันทึกและซิงค์การตั้งค่าระบบใหม่
            </button>
          </form>
        </div>
      )}

      {/* 6. GOOGLE SHEETS DB SPREADSHEET EXPLORER */}
      {activeTab === 'sheets' && rawDb && (
        <div className="space-y-6">
          <GoogleSheetsExport rawDb={rawDb} onShowToast={onShowToast} />
          
          <div className="bg-white text-slate-800 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-left animate-fade-in font-sans">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-500" />
                โครงสร้างฐานข้อมูล (Google Sheets Database)
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">แสดงผลโครงสร้างคีย์และคอลัมน์ของชีตฐานข้อมูล 8 ชีตตามเงื่อนไขอย่างถูกต้อง</p>
            </div>
            
            <button
              onClick={fetchRawDatabase}
              className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> รีเฟรชฐานข้อมูล
            </button>
          </div>

          {/* Sheets List Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            {Object.keys(rawDb).map((tableKey) => (
              <button
                key={tableKey}
                onClick={() => setActiveSheet(tableKey)}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider capitalize transition-all cursor-pointer ${
                  activeSheet === tableKey ? 'bg-sky-500 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                📊 Sheet: {tableKey}
              </button>
            ))}
          </div>

          {/* Table Spreadsheet Renderer */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white max-h-[350px]">
            <table className="w-full text-left border-collapse text-[10px] font-mono whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200"># Row</th>
                  {rawDb[activeSheet] && rawDb[activeSheet].length > 0 ? (
                    Object.keys(rawDb[activeSheet][0]).map((h) => (
                      <th key={h} className="py-2.5 px-3 border-r border-slate-200 uppercase font-extrabold">{h}</th>
                    ))
                  ) : (
                    <th className="py-2.5 px-3">ไม่มีข้อมูลคอลัมน์คีย์</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rawDb[activeSheet] && rawDb[activeSheet].length > 0 ? (
                  rawDb[activeSheet].map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border-r border-slate-200 font-bold bg-slate-50 text-center text-slate-400">{idx + 2}</td>
                      {Object.values(row).map((val: any, vIdx) => (
                        <td key={vIdx} className="py-2 px-3 border-r border-slate-200 max-w-[150px] truncate" title={String(val)}>
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">ชีตนี้ว่างเปล่ายังไม่มีข้อมูลแถวลงบันทึก</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Instructions to sync to real google sheet */}
          <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl text-[11px] leading-relaxed text-slate-600">
            💡 **ข้อแนะนำ:** หากต้องการเชื่อมต่อสคริปต์เข้ากับ Google Sheets จริง แนะนำให้ก๊อปปี้โค้ดในแท็บ **Google Apps Script Export** ไปวางใน Apps Script แล้วเปิดไฟล์ `Setup.gs` กดปุ่ม "เรียกใช้" (Run) ฟังก์ชัน `setupInitialSheets` เพื่อให้ระบบสร้างแผ่นงาน (Sheets) ทั้งหมดและใส่ชื่อคอลัมน์ให้อัตโนมัติ!
          </div>
        </div>
        </div>
      )}

      {/* 7. GOOGLE APPS SCRIPT EXPORTER */}
      {activeTab === 'gas' && (
        <div className="bg-white text-slate-800 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-left animate-fade-in font-sans">
          
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-sky-500" />
              ชุดรหัสสคริปต์หลังบ้าน (Google Apps Script Production Package)
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">
              แบ่งออกเป็น 14 สคริปต์ย่อย (Modular GS Files) เรียงตามหลักสถาปัตยกรรมของแอปพลิเคชันอย่างครบถ้วนเพื่อประสิทธิภาพสูงสุด
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Sidebar list of .gs files */}
            <div className="flex flex-col gap-1 lg:col-span-1 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
              {googleAppsScriptFiles.map((file, idx) => (
                <button
                  key={file.name}
                  onClick={() => setActiveGasFileIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-mono tracking-wider transition-all flex items-center justify-between cursor-pointer ${
                    activeGasFileIndex === idx 
                      ? 'bg-sky-500 text-white font-bold shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  📄 {file.name}
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              ))}
            </div>

            {/* Code editor view display */}
            <div className="lg:col-span-3 space-y-3">
              <div className="flex justify-between items-center bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-t-2xl">
                <span className="text-[10px] font-mono text-sky-700 font-bold">
                  กำลังแสดง: {googleAppsScriptFiles[activeGasFileIndex].name}
                </span>
                
                <button
                  onClick={() => handleCopyCode(googleAppsScriptFiles[activeGasFileIndex].code)}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" /> คัดลอกรหัสไฟล์นี้
                </button>
              </div>

              {/* Textarea holding code block */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-b-2xl max-h-[350px] overflow-y-auto">
                <pre className="text-[10px] font-mono text-slate-800 leading-normal whitespace-pre">
                  {googleAppsScriptFiles[activeGasFileIndex].code}
                </pre>
              </div>

              {/* Deployment Instructions guide widget */}
              <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-sky-900 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-sky-600" /> ขั้นตอนการนำไปติดตั้งบน Google Sheets ของจริง
                </h4>
                <ol className="list-decimal pl-4 text-[10px] leading-relaxed text-slate-600 space-y-1 font-semibold">
                  <li>เปิดเว็บไซต์ Google Sheets แล้วสร้างชีตแผ่นงานขึ้นมาใหม่ 1 ไฟล์</li>
                  <li>ตั้งชื่อไฟล์ชีตตามต้องการ และสร้างแผ่นงานย่อยด้านล่างให้ครบ 8 ชีต ได้แก่: <span className="text-sky-700 font-mono">Users, Staff, Services, Booking, CreditTransaction, Reviews, Notification, Settings</span></li>
                  <li>ไปที่แถบเมนูด้านบน คลิกที่ <span className="text-sky-700 font-bold">ส่วนขยาย (Extensions) &gt; Apps Script</span></li>
                  <li>คลิกบวกสร้างไฟล์รหัสสคริปต์ให้ครบตามชื่อ 14 ไฟล์ด้านซ้าย และวางสคริปต์แต่ละหน้าลงไป</li>
                  <li>นำ **ID ของ Google Sheet** ในเบราว์เซอร์ไปวางทับค่าตัวแปร <span className="text-sky-700 font-mono">SPREADSHEET_ID</span> ในไฟล์ Database.gs</li>
                  <li>กดเมนูบนขวา <span className="text-sky-700 font-bold">การทำให้ใช้งานได้ (Deploy) &gt; การทำรายการแบบเว็บแอป (New Deployment Web App)</span> เลือกสิทธิ์การใช้งานเป็น "ทุกคน (Anyone)" แล้วบันทึกเรียบร้อย!</li>
                </ol>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 9. INDIVIDUAL STAFF DETAILED INSPECTION MODAL */}
      {selectedStaffIdForDetail && (
        <StaffDetailModal
          staffId={selectedStaffIdForDetail}
          onClose={() => setSelectedStaffIdForDetail(null)}
          onShowToast={onShowToast}
          onRefreshStaffList={fetchStaffList}
        />
      )}

      {/* 10. CONFIRM DELETE USER MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-800 space-y-5 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">ยืนยันการลบผู้ใช้งาน</h3>
                  <p className="text-[11px] text-slate-400">การดำเนินการนี้จะลบข้อมูลออกจากระบบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target user information summary card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5">
              <img
                src={userToDelete.ProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userToDelete.Name || 'ผู้ใช้')}&background=0D9488&color=fff&size=80`}
                className="w-12 h-12 rounded-full object-cover border border-slate-200"
                alt="Avatar"
              />
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-slate-800 truncate">{userToDelete.Name}</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    userToDelete.Role === 'Admin' ? 'bg-rose-100 text-rose-700' :
                    userToDelete.Role === 'Staff' ? 'bg-sky-100 text-sky-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {userToDelete.Role}
                  </span>
                </div>
                <p className="text-xs text-slate-500">เบอร์โทร: <span className="font-mono font-bold text-slate-700">{userToDelete.Phone}</span></p>
                <p className="text-[10px] text-slate-400 font-mono">รหัสผู้ใช้: {userToDelete.UserID}</p>
              </div>
            </div>

            {userToDelete.Role === 'Staff' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
                <p className="font-black flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>คำเตือน: ผู้ใช้นี้มีโปรไฟล์พนักงานนวด</span>
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed pl-5.5">
                  การลบผู้ใช้งานรายนี้ จะทำการลบข้อมูลพนักงานนวด (Staff) และสิทธิ์การรับงานออกจากระบบด้วย
                </p>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน <span className="font-bold text-slate-800">"{userToDelete.Name}"</span> ออกจากระบบ?
            </p>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-[11px] leading-relaxed flex items-start gap-2 text-left">
              <span className="text-sm">⚡</span>
              <span><strong>ซิงค์ Google Sheets ทันที:</strong> การลบผู้ใช้งานนี้จะนำข้อมูลออกจากระบบและลบแถวใน Google Sheets ให้ตรงกันทันทีอัตโนมัติ</span>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleDeleteUser}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-3 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeletingUser ? (
                  <span>กำลังลบ...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>ยืนยันลบผู้ใช้งาน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
