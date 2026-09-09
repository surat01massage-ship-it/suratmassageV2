import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Clock, Star, MapPin, CheckCircle, Bell, History, TrendingUp, 
  User as UserIcon, LogOut, Check, X, ShieldAlert, CreditCard, ChevronRight, Upload,
  Compass, ExternalLink, Navigation, Volume2, VolumeX, Phone, PhoneCall, Copy,
  Camera, Image as ImageIcon, Sparkles, Trash2, Plus, Link as LinkIcon, Eye,
  CheckCheck, RefreshCw, ZoomIn, AlertCircle
} from 'lucide-react';
import { User, Staff, Booking, CreditTransaction, AppSettings } from '../types';
import InteractiveMap from './InteractiveMap';
import { calculateDistance, formatDistance, formatDistanceCompact, getGoogleMapsDirectionsUrl } from '../utils/distance';
import { getRealCurrentLocation, watchRealLocation } from '../utils/geolocation';
import { 
  playJobAlertSound, 
  startJobAlertRingtone, 
  stopJobAlertRingtone, 
  playOnlineActiveSound, 
  unlockAudioContext, 
  isAudioRunning,
  startAudioKeepAlive,
  stopAudioKeepAlive
} from '../utils/soundAlert';

// Canvas-based image compression for fast and lightweight storage
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
};

interface StaffPanelProps {
  currentUser: User | null;
  currentStaff: Staff | null;
  settings: AppSettings;
  onLogout: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onPlayNotificationSound?: () => void;
  onUpdateStaffData: (updatedStaff: Staff) => void;
  onUpdateUser?: (updatedUser: User) => void;
}

export default function StaffPanel({
  currentUser,
  currentStaff,
  settings,
  onLogout,
  onShowToast,
  onPlayNotificationSound,
  onUpdateStaffData,
  onUpdateUser
}: StaffPanelProps) {
  // Check if staff details are loaded
  const staff = currentStaff;

  // UI state controllers
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'credit' | 'profile'>('dashboard');
  const [isUpdatingGPS, setIsUpdatingGPS] = useState(false);
  const [showStaffMapModal, setShowStaffMapModal] = useState(false);
  const [tempStaffLat, setTempStaffLat] = useState<number>(staff?.CurrentLatitude || 9.138244);
  const [tempStaffLng, setTempStaffLng] = useState<number>(staff?.CurrentLongitude || 99.321748);
  const [staffAddressHint, setStaffAddressHint] = useState<string>("");
  
  // Database states
  const [bookings, setBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [incomingBooking, setIncomingBooking] = useState<any | null>(null);
  const [ongoingBooking, setOngoingBooking] = useState<any | null>(null);

  // Job cancellation by staff states
  const [showCancelJobModal, setShowCancelJobModal] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Countdown timer for incoming offer
  const [countdown, setCountdown] = useState(30);

  // Audio readiness state to ensure mobile sound works reliably
  const [audioReady, setAudioReady] = useState<boolean>(() => isAudioRunning());

  // Listen for one-time user touch or click to silently prepare browser audio session
  useEffect(() => {
    const handleGesture = async () => {
      await unlockAudioContext();
      setAudioReady(true);
    };
    window.addEventListener('click', handleGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleGesture, { once: true, passive: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, []);

  // When staff is Online, keep mobile audio hardware active and screen awake
  useEffect(() => {
    if (staff?.Available === 'ON') {
      startAudioKeepAlive();
    } else {
      stopAudioKeepAlive();
    }
    return () => {
      stopAudioKeepAlive();
    };
  }, [staff?.Available]);

  // Make sure ringtone is stopped when component unmounts
  useEffect(() => {
    return () => {
      stopJobAlertRingtone();
      stopAudioKeepAlive();
    };
  }, []);

  // Form states
  const [topupAmount, setTopupAmount] = useState("");
  const [slipImage, setSlipImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Profile Edit states
  const [editProfileImage, setEditProfileImage] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editAge, setEditAge] = useState(30);
  const [editWeight, setEditWeight] = useState(50);
  const [editHeight, setEditHeight] = useState(160);
  const [editGender, setEditGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [editRegisteredAddress, setEditRegisteredAddress] = useState("");
  const [editExperience, setEditExperience] = useState(3);
  const [editDescription, setEditDescription] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [editOfferedServices, setEditOfferedServices] = useState<string[]>([]);
  const [editMaxJobDistance, setEditMaxJobDistance] = useState(15);

  // Photo gallery and profile photo management states
  const [staffPhotos, setStaffPhotos] = useState<string[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState<boolean>(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>('');
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);

  // Load initial settings on edit form
  useEffect(() => {
    if (staff && currentUser) {
      setEditProfileImage(currentUser.ProfileImage || "");
      
      // Combine existing profile image and staff photos gallery
      const initialPhotos: string[] = [];
      if (currentUser.ProfileImage) {
        initialPhotos.push(currentUser.ProfileImage);
      }
      if (staff.Photos && Array.isArray(staff.Photos)) {
        staff.Photos.forEach(p => {
          if (p && !initialPhotos.includes(p)) {
            initialPhotos.push(p);
          }
        });
      }
      setStaffPhotos(initialPhotos);

      setEditNickname(staff.Nickname);
      setEditAge(staff.Age);
      setEditWeight(staff.Weight || 50);
      setEditHeight(staff.Height || 160);
      setEditGender(staff.Gender || 'Female');
      setEditRegisteredAddress(staff.RegisteredAddress || '');
      setEditExperience(staff.Experience);
      setEditDescription(staff.Description);
      setEditOfferedServices(staff.OfferedServices || []);
      setEditMaxJobDistance(staff.MaxJobDistance || 15);
    }
  }, [staff, currentUser]);

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(data.filter((s: any) => s.Active === 'ON')))
      .catch(console.error);
  }, []);

  // Periodic Polling for incoming bookings, ongoing state, and credit transactions
  useEffect(() => {
    if (!staff) return;

    fetchStaffData();
    const interval = setInterval(() => {
      fetchStaffData();
    }, 4000); // Polling every 4 seconds for immediate incoming alert response

    return () => clearInterval(interval);
  }, [staff?.StaffID]);

  const fetchStaffData = async () => {
    if (!staff) return;
    try {
      // 0. Fetch latest staff profile data from server to keep Credit, Jobs, Income 100% accurate
      try {
        const staffRes = await fetch(`/api/staff/${staff.StaffID}/details`);
        if (staffRes.ok) {
          const staffDetails = await staffRes.json();
          if (staffDetails.staff) {
            onUpdateStaffData(staffDetails.staff);
          }
        }
      } catch (err) {
        console.warn("Could not sync staff details:", err);
      }

      // 1. Fetch Bookings list
      const bRes = await fetch('/api/bookings');
      const bData = await bRes.json();
      const staffJobs = bData.filter((b: any) => b.StaffID === staff.StaffID);
      setBookings(staffJobs);

      // 2. Identify Incoming Booking (Status Waiting, offered to this Staff specifically)
      const incoming = bData.find((b: any) => 
        b.StaffID === staff.StaffID && 
        b.Status === 'Waiting'
      );
      
      if (incoming) {
        if (!incomingBooking || incomingBooking.BookingID !== incoming.BookingID) {
          // Start energetic repeating ringtone alert (Grab/LineMan style) + mobile vibration
          startJobAlertRingtone({
            title: `🔔 มีงานนวดใหม่เรียกตัวด่วน (${incoming.ServiceName})!`,
            message: `ลูกค้า ${incoming.CustomerName} เรียกงาน รายได้ ฿${incoming.NetIncome || incoming.TotalPrice} บาท`
          });
          if (onPlayNotificationSound) onPlayNotificationSound();
          onShowToast(`🚨 มีงานนวดใหม่เรียกตัวด่วน! ${incoming.ServiceName} จากคุณ ${incoming.CustomerName}`, "success");
          setCountdown(30); // reset timer
          setIncomingBooking(incoming);
        }
      } else {
        if (incomingBooking) {
          stopJobAlertRingtone();
          setIncomingBooking(null);
        }
      }

      // 3. Identify Ongoing active booking (Accepted or Working)
      const ongoing = staffJobs.find((b: any) => 
        b.Status === 'Accepted' || b.Status === 'Working'
      );
      setOngoingBooking(ongoing || null);

      // 4. Fetch Credit Transactions
      const txRes = await fetch('/api/credits/transactions');
      const txData = await txRes.json();
      setTransactions(txData.filter((t: any) => t.StaffID === staff.StaffID));

    } catch (e) {
      console.error(e);
    }
  };

  // Sound/countdown ticking
  useEffect(() => {
    if (!incomingBooking) {
      stopJobAlertRingtone();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Expiration reached
          stopJobAlertRingtone();
          setIncomingBooking(null);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      stopJobAlertRingtone();
    };
  }, [incomingBooking?.BookingID]);

  // Real GPS updater & automatic phone location sync
  useEffect(() => {
    if (!staff) return;

    const updateLocationToServer = async (lat: number, lng: number) => {
      try {
        const res = await fetch('/api/staff/location', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: staff.StaffID,
            latitude: lat,
            longitude: lng
          })
        });
        if (res.ok) {
          const updated = { ...staff, CurrentLatitude: lat, CurrentLongitude: lng };
          onUpdateStaffData(updated);
        }
      } catch (e) {
        console.error("Failed to update staff location to server:", e);
      }
    };

    // 1. Initial immediate location check on mount
    getRealCurrentLocation(6000)
      .then((geo) => updateLocationToServer(geo.latitude, geo.longitude))
      .catch((err) => console.warn("Staff GPS initial error:", err.message));

    // 2. Watch position continuously if Online
    let unwatch: (() => void) | null = null;
    if (staff.Available === 'ON') {
      unwatch = watchRealLocation((geo) => {
        updateLocationToServer(geo.latitude, geo.longitude);
      });
    }

    return () => {
      if (unwatch) unwatch();
    };
  }, [staff?.Available, staff?.StaffID]);

  // Auto turn-off availability if credit is insufficient
  useEffect(() => {
    if (staff && staff.Available === 'ON' && staff.Credit < (settings?.minCredit || 398)) {
      const turnOff = async () => {
        try {
          const res = await fetch('/api/staff/availability', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId: staff.StaffID, available: 'OFF' })
          });
          if (res.ok) {
            onUpdateStaffData({ ...staff, Available: 'OFF' });
            onShowToast("🔴 ระบบปิดรับงานอัตโนมัติ เนื่องจากเครดิตของคุณไม่เพียงพอ", "error");
          }
        } catch (e) {
          console.error("Failed to auto turn off availability:", e);
        }
      };
      turnOff();
    }
  }, [staff?.Credit, staff?.Available, settings?.minCredit]);

  // Toggle online/offline status
  const handleToggleOnline = async () => {
    if (!staff) return;
    const nextStatus = staff.Available === 'ON' ? 'OFF' : 'ON';

    if (nextStatus === 'ON' && staff.Credit < (settings?.minCredit || 398)) {
      onShowToast(`❌ เครดิตไม่พอรับงาน (ขั้นต่ำ ${settings?.minCredit || 398} CR) กรุณาเติมเครดิตก่อนเปิดรับงานค่ะ`, "error");
      return;
    }

    try {
      const res = await fetch('/api/staff/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staff.StaffID,
          available: nextStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onUpdateStaffData({ ...staff, Available: nextStatus });
      onShowToast(
        nextStatus === 'ON' 
          ? "🟢 เข้าสู่โหมดออนไลน์! ระบบเปิดพิกัดเพื่อรับงานรอบตัวคุณแล้ว ลูกค้ามองเห็นคุณบนแผนที่" 
          : "🔴 ปิดรับงานสำเร็จ พักผ่อนให้เต็มที่นะคะ", 
        "info"
      );
      
      // If switched ON, silently unlock audio and update real phone GPS
      if (nextStatus === 'ON') {
        unlockAudioContext().then(() => {
          setAudioReady(true);
        }).catch(() => {});

        getRealCurrentLocation(6000)
          .then((geo) => {
            fetch('/api/staff/location', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                staffId: staff.StaffID,
                latitude: geo.latitude,
                longitude: geo.longitude
              })
            }).then(() => {
              onUpdateStaffData({ ...staff, Available: 'ON', CurrentLatitude: geo.latitude, CurrentLongitude: geo.longitude });
            }).catch(console.error);
          })
          .catch(console.warn);
      }
    } catch (e: any) {
      onShowToast(e.message, "error");
    }
  };

  // Manual GPS update trigger with robust geolocation
  const handleManualGPSUpdate = async () => {
    setIsUpdatingGPS(true);
    onShowToast("🛰️ กำลังค้นหาตำแหน่ง GPS สดจากโทรศัพท์ของคุณ...", "info");
    try {
      const geo = await getRealCurrentLocation(8000);
      const res = await fetch('/api/staff/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staff.StaffID,
          latitude: geo.latitude,
          longitude: geo.longitude
        })
      });
      if (res.ok) {
        onUpdateStaffData({ ...staff, CurrentLatitude: geo.latitude, CurrentLongitude: geo.longitude });
        onShowToast(`📍 อัปเดตพิกัด GPS สดเรียบร้อย (${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)})`, "success");
      } else {
        throw new Error("ไม่สามารถบันทึกพิกัดได้");
      }
    } catch (e: any) {
      onShowToast(e.message || "เกิดข้อผิดพลาดในการส่งพิกัด", "error");
    } finally {
      setIsUpdatingGPS(false);
    }
  };

  // Respond to Booking Offer
  const handleAcceptJob = async (action: 'accept' | 'reject') => {
    if (!incomingBooking || !staff) return;
    stopJobAlertRingtone();

    if (action === 'reject') {
      try {
        await fetch(`/api/bookings/${incomingBooking.BookingID}/action`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', staffId: staff.StaffID })
        });
        setIncomingBooking(null);
        onShowToast("ปฏิเสธงานเรียกนวดเรียบร้อยแล้ว", "info");
      } catch (e) {
        setIncomingBooking(null);
      }
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${incomingBooking.BookingID}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          staffId: staff.StaffID
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถกดยอมรับงานนี้ได้");
      }

      onShowToast("🎉 ยอมรับงานบริการนวดสำเร็จ! เริ่มเดินทางไปให้บริการได้ทันที", "success");
      setIncomingBooking(null);
      if (data.staff) {
        onUpdateStaffData(data.staff);
      } else {
        // Local optimistic fallback
        onUpdateStaffData({
          ...staff,
          Credit: Math.max(0, staff.Credit - (incomingBooking.CreditRequired ?? 398)),
          TotalJobs: (staff.TotalJobs || 0) + 1
        });
      }
      await fetchStaffData();
    } catch (e: any) {
      onShowToast(e.message, "error");
    }
  };

  // Advance ongoing work status
  const handleUpdateOngoingStatus = async (actionName: 'start_travel' | 'complete') => {
    if (!ongoingBooking) return;

    try {
      const res = await fetch(`/api/bookings/${ongoingBooking.BookingID}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionName,
          staffId: staff?.StaffID
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (actionName === 'start_travel') {
        onShowToast("อัปเดตสถานะ: พนักงานนวดกำลังเดินทางพบบ้านลูกค้าแล้วค่ะ", "info");
      } else {
        onShowToast("💆 การให้บริการเสร็จสมบูรณ์เรียบร้อยแล้ว! รายได้โอนเข้าประวัติแล้ว", "success");
        if (data.staff) {
          onUpdateStaffData(data.staff);
        } else if (staff) {
          // Increase TotalIncome and Credit transaction logs locally
          onUpdateStaffData({
            ...staff,
            Credit: Math.max(0, staff.Credit - (ongoingBooking.CreditRequired ?? 398)),
            TotalIncome: staff.TotalIncome + (ongoingBooking.NetIncome || ongoingBooking.TotalPrice),
            TotalJobs: Math.max(1, (staff.TotalJobs || 0) + 1)
          });
        }
      }
      await fetchStaffData();
    } catch (e: any) {
      onShowToast(e.message, "error");
    }
  };

  // Cancel ongoing job by staff (requires admin confirmation to refund credit)
  const handleCancelOngoingJob = async () => {
    if (!ongoingBooking || !staff) return;
    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/bookings/${ongoingBooking.BookingID}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          staffId: staff.StaffID,
          reason: cancelReasonInput.trim() || 'พนักงานมีเหตุฉุกเฉินขอยกเลิกงาน'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถยกเลิกงานได้');

      onShowToast("⚠️ แจ้งยกเลิกงานสำเร็จแล้ว คำขอคืนเครดิตถูกส่งให้แอดมินตรวจสอบและยืนยันแล้วค่ะ", "info");
      setShowCancelJobModal(false);
      setCancelReasonInput('');
      setOngoingBooking(null);
      fetchStaffData();
    } catch (e: any) {
      onShowToast(e.message, "error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Submit Credit Topup proposal
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff || !topupAmount) return;

    setIsUploading(true);
    try {
      const res = await fetch('/api/credits/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staff.StaffID,
          amount: parseFloat(topupAmount),
          slipImage: slipImage
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป');

      if (data.transaction) {
        if (data.transaction.Status === 'Approved') {
          onShowToast(`🎉 ตรวจสอบสลิปผ่าน AI สมบูรณ์! เติมเครดิตอัตโนมัติ +${data.transaction.Amount} CR เรียบร้อยแล้ว`, "success");
          if (data.newCredit !== undefined) {
            onUpdateStaffData({ ...staff, Credit: data.newCredit });
          }
          setTopupAmount("");
          setSlipImage("");
          setActiveTab('dashboard');
        } else if (data.transaction.Status === 'Reject') {
          onShowToast(data.transaction.AdminRemark || data.error || "❌ สลิปไม่ผ่านการตรวจสอบ (อาจเป็นสลิปซ้ำหรือสลิปไม่ถูกต้อง)", "error");
        } else {
          onShowToast("ส่งรายการแจ้งโอนเงินแล้ว! ระบบกำลังรอเจ้าหน้าที่ตรวจสอบความถูกต้อง", "info");
          setTopupAmount("");
          setSlipImage("");
        }
        fetchStaffData();
      }
    } catch (e: any) {
      onShowToast(e.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Function to set any photo as profile picture and save immediately
  const handleSetAsProfilePicture = async (imageUrl: string, notify: boolean = true) => {
    if (!currentUser || !staff) return;
    setIsSavingPhoto(true);
    try {
      setEditProfileImage(imageUrl);
      
      // Ensure photo is preserved in staffPhotos
      let updatedPhotos = staffPhotos;
      if (!updatedPhotos.includes(imageUrl)) {
        updatedPhotos = [imageUrl, ...updatedPhotos];
        setStaffPhotos(updatedPhotos);
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          name: currentUser.Name,
          profileImage: imageUrl,
          staffInfo: {
            nickname: staff.Nickname,
            age: staff.Age,
            weight: staff.Weight,
            height: staff.Height,
            gender: staff.Gender,
            registeredAddress: staff.RegisteredAddress,
            experience: staff.Experience,
            description: staff.Description,
            offeredServices: staff.OfferedServices,
            maxJobDistance: staff.MaxJobDistance,
            photos: updatedPhotos
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถบันทึกรูปโปรไฟล์ได้');

      if (data.user && onUpdateUser) {
        onUpdateUser(data.user);
      }
      if (data.staff) {
        onUpdateStaffData(data.staff);
      }
      if (notify) {
        onShowToast("✨ ตั้งเป็นรูปโปรไฟล์พนักงานเรียบร้อยแล้วค่ะ!", "success");
      }
      setShowPhotoModal(false);
    } catch (e: any) {
      onShowToast(e.message || 'เกิดข้อผิดพลาดในการบันทึกรูปภาพ', "error");
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Add photo to staff gallery / portfolio
  const handleAddPhotoToGallery = async (imageUrl: string, setAsProfileImmediately: boolean = false) => {
    if (!currentUser || !staff) return;
    if (setAsProfileImmediately) {
      return handleSetAsProfilePicture(imageUrl, true);
    }

    if (staffPhotos.includes(imageUrl)) {
      onShowToast("รูปภาพนี้มีอยู่ในคลังแล้วค่ะ", "info");
      return;
    }

    const updatedPhotos = [imageUrl, ...staffPhotos];
    setStaffPhotos(updatedPhotos);

    try {
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          staffInfo: {
            photos: updatedPhotos
          }
        })
      });
      onShowToast("📸 เพิ่มรูปภาพลงในคลังรูปภาพเรียบร้อยแล้วค่ะ", "success");
    } catch (e: any) {
      console.error(e);
    }
  };

  // Delete photo from staff gallery
  const handleDeletePhotoFromGallery = async (imageUrl: string) => {
    if (!currentUser || !staff) return;
    const updatedPhotos = staffPhotos.filter(p => p !== imageUrl);
    setStaffPhotos(updatedPhotos);

    try {
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          staffInfo: {
            photos: updatedPhotos
          }
        })
      });
      onShowToast("🗑️ ลบรูปภาพออกจากคลังเรียบร้อย", "info");
    } catch (e: any) {
      console.error(e);
    }
  };

  // Handle file upload with canvas compression
  const handlePhotoFileUpload = async (file: File, setAsProfile: boolean = true) => {
    if (!file) return;
    setIsSavingPhoto(true);
    onShowToast("🖼️ กำลังประมวลผลรูปภาพ...", "info");
    try {
      const compressedBase64 = await compressImageFile(file);
      if (setAsProfile) {
        await handleSetAsProfilePicture(compressedBase64, true);
      } else {
        await handleAddPhotoToGallery(compressedBase64, false);
      }
    } catch (e: any) {
      onShowToast(e.message || "ไม่สามารถอัปโหลดรูปภาพได้", "error");
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          name: currentUser.Name,
          profileImage: editProfileImage,
          staffInfo: {
            nickname: editNickname,
            age: editAge,
            weight: editWeight,
            height: editHeight,
            gender: editGender,
            registeredAddress: editRegisteredAddress,
            experience: editExperience,
            description: editDescription,
            offeredServices: editOfferedServices,
            maxJobDistance: editMaxJobDistance,
            photos: staffPhotos
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.user && onUpdateUser) {
        onUpdateUser(data.user);
      }
      if (data.staff) {
        onUpdateStaffData(data.staff);
      }
      onShowToast("บันทึกการแก้ไขโปรไฟล์พนักงานสำเร็จแล้วค่ะ", "success");
      setActiveTab('dashboard');
    } catch (e: any) {
      onShowToast(e.message, "error");
    }
  };

  if (!staff) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center max-w-md mx-auto shadow-sm space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h3 className="font-bold text-slate-800 text-base">รอการอนุมัติพนักงาน</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
          บัญชีพนักงานนวดของคุณได้รับการสร้างในฐานข้อมูล (Sheet Users & Staff) สำเร็จแล้ว แต่ยังอยู่ในสถานะ <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-extrabold text-[10px]">รอดำเนินการ (Pending)</span>
        </p>
        <p className="text-[10px] text-slate-400">
          กรุณาสลับไปยังบทบาท **"แอดมิน"** ด้านล่างเพื่ออนุมัติข้อมูลพนักงานของคุณเพื่อเริ่มใช้ระบบค่ะ
        </p>
      </div>
    );
  }

  // Calculate earning sums
  const completedJobs = bookings.filter(b => b.Status === 'Completed');
  const todayEarnings = completedJobs
    .filter(b => b.BookingDate === new Date().toISOString().split('T')[0])
    .reduce((sum, b) => sum + (b.NetIncome || b.TotalPrice), 0);
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const thisMonthEarnings = completedJobs
    .filter(b => b.BookingDate.startsWith(currentMonthPrefix))
    .reduce((sum, b) => sum + (b.NetIncome || b.TotalPrice), 0);

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-12" id="staff-view-root">
      
      {/* ONLINE / OFFLINE TOGGLE SWITCHER (Grab style) */}
      <div className="bg-white text-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200 flex items-center justify-between relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setShowPhotoModal(true)} 
            className="relative cursor-pointer group"
            title="แตะเพื่อเปลี่ยนรูปโปรไฟล์ หรือเพิ่มรูปภาพพนักงาน"
          >
            {(currentUser?.ProfileImage || editProfileImage) ? (
              <img 
                src={currentUser?.ProfileImage || editProfileImage} 
                className="w-13 h-13 rounded-full object-cover border-2 border-slate-100 shadow group-hover:opacity-90 transition-opacity" 
                alt="Profile" 
              />
            ) : (
              <div className="w-13 h-13 rounded-full bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center group-hover:bg-sky-50 group-hover:text-sky-600 group-hover:border-sky-300 transition-colors">
                <UserIcon className="w-6 h-6" />
                <span className="text-[7px] font-bold mt-0.5">เพิ่มรูป</span>
              </div>
            )}
            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
              staff.Available === 'ON' ? 'bg-sky-500 animate-pulse' : 'bg-rose-500'
            }`} />
            <div className="absolute inset-0 bg-black/35 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
              <Camera className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-sm text-slate-900">พี่{staff.Nickname}</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                staff.VerifyStatus === 'Approved' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
              }`}>{staff.VerifyStatus}</span>
              <button
                onClick={() => setShowPhotoModal(true)}
                type="button"
                className="text-[9px] bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
              >
                <Camera className="w-2.5 h-2.5" /> เปลี่ยนรูป
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              {staff.Available === 'ON' ? '🟢 พร้อมรับงานนวดแบบเรียลไทม์' : '⚪ ออฟไลน์พักผ่อน'}
            </p>
          </div>
        </div>

        {/* Sliding Toggle Switch (slide left/right) */}
        <button
          onClick={handleToggleOnline}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
          aria-label="Toggle Job Acceptance Status"
        >
          <span className={`text-xs font-black transition-colors ${
            staff.Available === 'ON' ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
          }`}>
            {staff.Available === 'ON' ? 'เปิดรับงานอยู่' : 'ปิดรับงาน'}
          </span>
          <div className={`w-14 h-7 flex items-center rounded-full p-1 transition-all duration-300 ease-in-out ${
            staff.Available === 'ON' ? 'bg-sky-500' : 'bg-slate-200'
          }`}>
            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-all duration-300 ease-in-out ${
              staff.Available === 'ON' ? 'translate-x-7' : 'translate-x-0'
            }`} />
          </div>
        </button>
      </div>

      {/* Audio Readiness Banner for Mobile Autoplay & Sound Testing */}
      {staff.Available === 'ON' && (
        !audioReady ? (
          <div 
            onClick={async () => {
              await unlockAudioContext();
              setAudioReady(true);
              onShowToast("🔊 เปิดระบบเสียงแจ้งเตือนเรียบร้อย! ระบบจะส่งเสียงดังเฉพาะเมื่อมีงานเข้า", "success");
            }}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl p-3.5 shadow-md flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] border-2 border-amber-300"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-white/20 rounded-xl shrink-0">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-black truncate">⚠️ แตะตรงนี้ 1 ครั้ง เพื่อเปิดระบบเสียงเตือนงานเข้า 🔊</p>
                <p className="text-[10px] text-amber-100 font-medium">ระบบจะส่งเสียงไซเรนและสั่นเตือนเฉพาะตอนมีงานใหม่เข้ามาเท่านั้น</p>
              </div>
            </div>
            <span className="bg-white text-orange-700 text-[10px] font-black px-3 py-1.5 rounded-xl shadow-xs shrink-0 whitespace-nowrap">
              แตะเพื่อเปิดระบบ
            </span>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-2xl p-2.5 px-3.5 flex items-center justify-between gap-2.5 text-left">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <p className="text-[11px] font-extrabold truncate">
                🔊 ระบบเสียงแจ้งเตือนมือถือ: <span className="text-emerald-700 font-black">พร้อมทำงาน (ดังเฉพาะตอนมีงานเข้า)</span>
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await unlockAudioContext();
                playJobAlertSound();
                onShowToast("🔊 ทดสอบส่งเสียงไซเรนและสั่นเตือนเรียบร้อย!", "info");
              }}
              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap shadow-xs cursor-pointer active:scale-95"
            >
              แตะทดสอบเสียง
            </button>
          </div>
        )
      )}

      {/* GPS Location Broadcast Bar */}
      <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-xl shrink-0 ${staff.Available === 'ON' ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
            <Compass className={`w-4 h-4 ${isUpdatingGPS ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-800">ตำแหน่ง GPS สดของคุณ</span>
              {staff.Available === 'ON' ? (
                <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded">
                  ลูกค้ามองเห็นคุณบนแผนที่
                </span>
              ) : (
                <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded">
                  ซ่อนตำแหน่ง (ออฟไลน์)
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-mono truncate">
              พิกัด: {(staff.CurrentLatitude || 9.1382).toFixed(4)}, {(staff.CurrentLongitude || 99.3217).toFixed(4)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={async () => {
              await unlockAudioContext();
              setAudioReady(true);
              playJobAlertSound();
              onShowToast("🔊 ทดสอบเสียงเตือนงานเข้า (เสียงดังชัดเจน & สั่นเตือน)", "info");
            }}
            className="flex-1 sm:flex-none bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[10px] font-extrabold px-2.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
            title="ทดสอบระดับเสียงและสั่นเตือนบนโทรศัพท์"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
            <span>ทดสอบเสียงงานเข้า</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTempStaffLat(staff.CurrentLatitude || 9.138244);
              setTempStaffLng(staff.CurrentLongitude || 99.321748);
              setShowStaffMapModal(true);
            }}
            className="flex-1 sm:flex-none bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-extrabold px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>ปักหมุดบนแผนที่</span>
          </button>

          <button
            type="button"
            onClick={handleManualGPSUpdate}
            disabled={isUpdatingGPS}
            className="flex-1 sm:flex-none bg-white hover:bg-sky-100 border border-sky-300 text-sky-700 text-[10px] font-extrabold px-2.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Compass className={`w-3.5 h-3.5 text-sky-600 ${isUpdatingGPS ? 'animate-spin' : ''}`} />
            <span>{isUpdatingGPS ? 'กำลังส่ง...' : 'ดึง GPS'}</span>
          </button>
        </div>
      </div>

      {/* Staff Map Location Pinning Modal */}
      {showStaffMapModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-500" />
                  ปักหมุดตำแหน่งปัจจุบันของพนักงาน
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  แตะบนแผนที่เพื่อระบุจุดที่คุณอยู่จริง เพื่อให้ระบบคำนวณระยะทางกับลูกค้าได้แม่นยำ 100%
                </p>
              </div>
              <button
                onClick={() => setShowStaffMapModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-[280px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
              <InteractiveMap
                customerLat={tempStaffLat}
                customerLng={tempStaffLng}
                staffPins={[]}
                height="h-[280px]"
                onLocationChange={(lat, lng) => {
                  setTempStaffLat(lat);
                  setTempStaffLng(lng);
                }}
                onUseGPS={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setTempStaffLat(pos.coords.latitude);
                        setTempStaffLng(pos.coords.longitude);
                      },
                      (err) => onShowToast("ไม่สามารถดึง GPS ได้ กรุณาแตะบนแผนที่เพื่อปักหมุด", "info"),
                      { enableHighAccuracy: true }
                    );
                  }
                }}
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">พิกัดที่เลือก:</span>
              <span className="font-mono font-bold text-sky-700">{tempStaffLat.toFixed(5)}, {tempStaffLng.toFixed(5)}</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStaffMapModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch('/api/staff/location', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        staffId: staff.StaffID,
                        latitude: tempStaffLat,
                        longitude: tempStaffLng
                      })
                    });
                    const updated = { ...staff, CurrentLatitude: tempStaffLat, CurrentLongitude: tempStaffLng };
                    onUpdateStaffData(updated);
                    onShowToast("📍 บันทึกตำแหน่งพนักงานเรียบร้อยแล้ว", "success");
                    setShowStaffMapModal(false);
                  } catch (e: any) {
                    onShowToast("เกิดข้อผิดพลาดในการบันทึกพิกัด", "error");
                  }
                }}
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-3 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                บันทึกตำแหน่งนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVENUE STATS METRIC DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Main Wallet Grid cards */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Wallet credit card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-sky-500/5 rounded-full" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">กระเป๋าเครดิต (CR)</span>
                {staff.Credit >= 398 && (
                  <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                    รับงานได้ {Math.floor(staff.Credit / 398)} ครั้ง
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-2xl font-black text-slate-800">{staff.Credit.toFixed(0)}</span>
                <span className="text-xs font-semibold text-slate-500">เครดิต</span>
              </div>
              {staff.Credit === 398 && staff.TotalJobs === 0 && (
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                  🎁 เครดิตฟรีสำหรับรับงานครั้งแรก
                </div>
              )}
              <button
                onClick={() => setActiveTab('credit')}
                className="text-[9px] font-extrabold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 mt-2 cursor-pointer bg-sky-50 px-2 py-1 rounded-md w-fit"
              >
                <CreditCard className="w-3 h-3" /> เติมเครดิตที่นี่
              </button>
            </div>

            {/* Income Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">รายได้วันนี้</span>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-2xl font-black text-sky-600">฿{todayEarnings}</span>
                <span className="text-xs font-semibold text-slate-500">บาท</span>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 space-y-1">
                <div className="flex justify-between items-center text-[9px] font-semibold text-slate-500">
                  <span>รายได้เดือนนี้:</span>
                  <span className="text-sky-600 font-bold">฿{thisMonthEarnings}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400">
                  <span>รายได้สะสมทั้งหมด:</span>
                  <span>฿{staff.TotalIncome}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Average Stars ratings summary widget */}
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex items-center justify-around text-center">
            <div>
              <span className="text-[9px] font-bold text-slate-400 block uppercase">งานสำเร็จทั้งหมด</span>
              <span className="text-base font-extrabold text-slate-800 block mt-1">{staff.TotalJobs} ครั้ง</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-100" />
            <div>
              <span className="text-[9px] font-bold text-slate-400 block uppercase">เรตติ้งดาวเฉลี่ย</span>
              <div className="flex items-center justify-center text-amber-500 font-extrabold text-sm mt-1">
                <Star className="w-4 h-4 fill-current mr-0.5" />
                <span>{staff.Rating}</span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-slate-100" />
            <div>
              <span className="text-[9px] font-bold text-slate-400 block uppercase">รีวิวความเห็นลูกค้า</span>
              <span className="text-base font-extrabold text-slate-800 block mt-1">{staff.ReviewCount} รายการ</span>
            </div>
          </div>

          {/* ACTIVE ONGOING BOOKING CONTROLS */}
          {ongoingBooking && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-xs font-black text-amber-800">กำลังปฏิบัติงาน: #ID {ongoingBooking.BookingID}</span>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  {ongoingBooking.Status}
                </span>
              </div>

              {/* Customer Contact Box */}
              <div className="bg-white border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img 
                    src={ongoingBooking.CustomerProfileImage || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e'} 
                    className="w-12 h-12 rounded-full border-2 border-amber-300 object-cover shrink-0" 
                    alt="Customer" 
                  />
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">ลูกค้าผู้จอง</span>
                    <span className="font-black text-slate-900 block text-sm truncate">
                      {ongoingBooking.CustomerName}
                    </span>
                    {ongoingBooking.CustomerPhone ? (
                      <a 
                        href={`tel:${ongoingBooking.CustomerPhone}`} 
                        className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mt-0.5 hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                        <span>{ongoingBooking.CustomerPhone}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">ไม่พบเบอร์โทรศัพท์</span>
                    )}
                  </div>
                </div>

                {ongoingBooking.CustomerPhone && (
                  <a
                    href={`tel:${ongoingBooking.CustomerPhone}`}
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black px-3.5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4 fill-current animate-bounce" />
                    <span>โทรหาลูกค้า</span>
                  </a>
                )}
              </div>

              <div className="text-xs space-y-2 text-slate-700 bg-amber-100/40 p-3.5 rounded-2xl border border-amber-200/50">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">บริการ</span>
                  <span className="font-bold text-slate-900">{ongoingBooking.ServiceName} ({ongoingBooking.ServiceDuration} นาที)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">ระยะทางจริง</span>
                  <span className="font-bold text-sky-700 font-mono">
                    {formatDistance(
                      calculateDistance(
                        staff?.CurrentLatitude || 9.1382,
                        staff?.CurrentLongitude || 99.3217,
                        ongoingBooking.CustomerLatitude || 9.1372,
                        ongoingBooking.CustomerLongitude || 99.3245
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-start pt-1 border-t border-amber-200/40">
                  <span className="font-semibold text-slate-500 shrink-0">พิกัดจัดส่ง</span>
                  <div className="text-right flex flex-col items-end gap-1 overflow-hidden">
                    <span className="font-bold text-slate-900 max-w-[200px] truncate" title={ongoingBooking.CustomerAddress}>{ongoingBooking.CustomerAddress}</span>
                    <a 
                      href={getGoogleMapsDirectionsUrl(
                        staff?.CurrentLatitude || 9.1382,
                        staff?.CurrentLongitude || 99.3217,
                        ongoingBooking.CustomerLatitude || 9.1372,
                        ongoingBooking.CustomerLongitude || 99.3245
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-sky-600 hover:text-sky-700 bg-white border border-sky-100 rounded-md px-2 py-0.5 shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Compass className="w-3 h-3 text-sky-500 animate-pulse" />
                      เปิดพิกัด Google Maps ↗
                    </a>
                  </div>
                </div>
              </div>

              {/* Status workflow steppers */}
              <div className="flex gap-3 pt-2">
                {ongoingBooking.Status === 'Accepted' ? (
                  <>
                    <button
                      onClick={() => handleUpdateOngoingStatus('start_travel')}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-colors cursor-pointer"
                    >
                      🛵 ฉันเริ่มเดินทางแล้ว
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${staff?.CurrentLatitude || 9.1382},${staff?.CurrentLongitude || 99.3217}&destination=${ongoingBooking.CustomerLatitude || 9.1372},${ongoingBooking.CustomerLongitude || 99.3245}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs py-3 rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      นำทาง Google Maps
                    </a>
                  </>
                ) : ongoingBooking.Status === 'Working' ? (
                  <button
                    onClick={() => handleUpdateOngoingStatus('complete')}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black text-xs py-3 rounded-xl transition-colors cursor-pointer shadow-md"
                  >
                    💆 นวดบริการเสร็จสมบูรณ์ (รับเงิน ฿{ongoingBooking.TotalPrice})
                  </button>
                ) : null}
              </div>

              {/* Staff Job Cancellation Request button */}
              <div className="pt-2 border-t border-amber-200/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCancelReasonInput('');
                    setShowCancelJobModal(true);
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>⚠️ มีเหตุฉุกเฉิน / ขอยกเลิกงานนี้</span>
                </button>
              </div>
            </div>
          )}

          {/* Simple income list widget */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">ความเคลื่อนไหวล่าสุด</h4>
            {completedJobs.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">คุณยังไม่มีประวัติรายรับในวันนี้</div>
            ) : (
              <div className="space-y-2">
                {completedJobs.slice(-3).map((job) => (
                  <div key={job.BookingID} className="flex items-center justify-between text-xs py-1">
                    <div>
                      <span className="font-bold text-slate-800 block">{job.ServiceName}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{job.BookingDate} • ลูกค้า {job.CustomerName}</span>
                    </div>
                    <span className="font-bold text-sky-600">+฿{job.NetIncome || job.TotalPrice}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: CREDIT WALLET TOP-UP */}
      {activeTab === 'credit' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-black text-slate-800">แจ้งประวัติโอนเงิน / เติมเครดิต</h3>
          
          {/* Bank QR Code display mock */}
          <div className="bg-slate-50 rounded-2xl p-4 text-center space-y-3 border border-slate-100 max-w-sm mx-auto">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">แสกน QR Code จ่ายโอนเงิน</span>
            {settings.qrCodeImage && (
              <div className="w-40 h-40 bg-white border border-slate-200 rounded-xl mx-auto flex items-center justify-center p-2">
                <img src={settings.qrCodeImage} className="w-full h-full object-cover" alt="QR Code" />
              </div>
            )}
            <div>
              <p className="text-xs font-black text-slate-700">{settings.bankAccountName || 'บจก. สบายดี โฮมมาสซาจ'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">{settings.bankName || 'ธนาคารทั่วไป'}</p>
              <p className="text-[10px] text-sky-600 mt-0.5 font-bold">เลขที่บัญชี: {settings.bankAccount || '081-234-5678'}</p>
            </div>
          </div>

          <form onSubmit={handleTopupSubmit} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">จำนวนเงินที่โอนจ่าย (บาท)</label>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="กรอกตามสลิป เช่น 500"
                required
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">อัปโหลดภาพใบเสร็จโอนเงิน (สลิป)</label>
              
              <div className="flex gap-4 items-center bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setSlipImage(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {slipImage && !slipImage.startsWith('http') ? (
                    <img src={slipImage} className="w-full h-full object-cover" alt="Slip Preview" />
                  ) : slipImage ? (
                    <img src={slipImage} className="w-full h-full object-cover" alt="Slip Preview" />
                  ) : (
                    <Upload className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[10px] font-bold text-slate-600 block flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> แตะเพื่อแนบรูปภาพสลิปจากเครื่อง
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-3 rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUploading ? 'กำลังส่งแจ้งโอน...' : 'ยืนยันแจ้งเติมเงิน'}
              </button>
            </div>
          </form>

          {/* Past Transactions list */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide text-left">ประวัติการเติมเครดิตของคุณ</h4>
            <div className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">คุณยังไม่มีรายการโอนเงินในระบบ</div>
              ) : (
                transactions.map((t) => (
                  <div key={t.TransactionID} className="flex items-center justify-between text-xs py-3 gap-3">
                    <div className="text-left space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          t.Type === 'Deduct' ? 'text-rose-600' : t.Type === 'Refund' ? 'text-purple-600' : 'text-slate-800'
                        }`}>
                          {t.Type === 'Topup' ? `+${t.Amount} CR` : t.Type === 'Refund' ? `+${t.Amount} CR` : `-${t.Amount} CR`}
                        </span>
                        {t.Type === 'Refund' && (
                          <span className="text-[8px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded-full">
                            🔄 คืนเครดิตงานยกเลิก
                          </span>
                        )}
                        {t.AdminRemark?.includes('โบนัสต้อนรับ') && (
                          <span className="text-[8px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-full">
                            🎁 โบนัสต้อนรับ
                          </span>
                        )}
                        {t.IsAutoApproved && (
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full">
                            🤖 AI เติมอัตโนมัติ
                          </span>
                        )}
                        {t.BankName && (
                          <span className="text-[8px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                            {t.BankName}
                          </span>
                        )}
                      </div>
                      {t.SlipRefId && (
                        <p className="text-[9px] text-slate-500 font-mono">Ref: {t.SlipRefId}</p>
                      )}
                      {t.AdminRemark && (
                        <p className="text-[9px] text-slate-400 italic line-clamp-1">{t.AdminRemark}</p>
                      )}
                      <span className="text-[9px] text-slate-400 font-semibold block">{t.CreatedDate.split('T')[0]}</span>
                    </div>
                    <div className="shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        t.Status === 'Approved' ? 'bg-sky-50 text-sky-700' :
                        t.Status === 'Reject' ? 'bg-rose-50 text-rose-700' :
                        t.Type === 'Refund' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {t.Status === 'Approved' ? 'อนุมัติแล้ว' :
                         t.Status === 'Reject' ? 'ปฏิเสธ' :
                         t.Type === 'Refund' ? 'รอแอดมินยืนยัน' : 'รอตรวจสอบ'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: WORK HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-800 text-left">ประวัติการรับงานทั้งหมด</h3>
          
          <div className="divide-y divide-slate-100">
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">ไม่พบประวัติผลงานรับงานของคุณ</div>
            ) : (
              bookings.slice().reverse().map((b) => (
                <div key={b.BookingID} className="py-4 flex justify-between items-start text-xs border-b border-slate-100 last:border-0">
                  <div className="text-left space-y-1">
                    <span className="font-bold text-slate-800 block text-sm">{b.ServiceName}</span>
                    <span className="text-slate-400 block font-semibold">วันที่จอง: {b.BookingDate} • {b.BookingTime} น.</span>
                    <span className="text-slate-500 block font-semibold flex items-center gap-1.5 flex-wrap">
                      <span>ผู้สั่ง: {b.CustomerName}</span>
                      {b.CustomerPhone && (
                        <a 
                          href={`tel:${b.CustomerPhone}`} 
                          className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-bold text-[10px] hover:bg-emerald-100"
                        >
                          <Phone className="w-2.5 h-2.5 fill-emerald-600" />
                          <span>{b.CustomerPhone}</span>
                        </a>
                      )}
                      <span className="text-slate-400">({b.Distance.toFixed(2)} กม.)</span>
                    </span>
                    
                    {b.ReviewScore && (
                      <div className="mt-2 pt-2 border-t border-slate-50 inline-block">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-3 h-3 ${star <= b.ReviewScore ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                        {b.ReviewComment && <p className="text-slate-500 italic mt-1 text-[10px]">"{b.ReviewComment}"</p>}
                      </div>
                    )}
                  </div>

                  <div className="text-right space-y-1.5 shrink-0">
                    <span className="text-slate-800 font-extrabold text-sm block">฿{b.NetIncome || b.TotalPrice}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                      b.Status === 'Completed' ? 'bg-sky-50 text-sky-700' :
                      b.Status === 'Cancel' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}>{b.Status === 'Completed' ? 'สำเร็จ' : b.Status === 'Cancel' ? 'ยกเลิกแล้ว' : b.Status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800 text-left">ข้อมูลพนักงานนวด</h3>
            <div className="grid grid-cols-2 gap-y-4 text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ไอดีพนักงาน</span>
                <span className="block font-black text-slate-800">{staff.StaffID}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ชื่อ-นามสกุล</span>
                <span className="block font-black text-slate-800">{currentUser?.Name}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">น้ำหนัก</span>
                <span className="block font-black text-slate-800">{staff.Weight || '-'} กก.</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ส่วนสูง</span>
                <span className="block font-black text-slate-800">{staff.Height || '-'} ซม.</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">เพศ</span>
                <span className="block font-black text-slate-800">
                  {staff.Gender === 'Male' ? 'ชาย' : staff.Gender === 'Female' ? 'หญิง' : 'อื่นๆ'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">อายุ</span>
                <span className="block font-black text-slate-800">{staff.Age} ปี</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">คะแนนรีวิว</span>
                <div className="flex items-center gap-1 font-black text-amber-500 mt-0.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{staff.Rating} ({staff.ReviewCount} รีวิว)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 1. PHOTO MANAGEMENT & GALLERY SECTION */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-sky-500" />
                  รูปโปรไฟล์และคลังรูปภาพ
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  เพิ่มรูปภาพผลงานของคุณ และเลือกรูปภาพใดก็ได้เพื่อตั้งเป็นรูปโปรไฟล์
                </p>
              </div>
            </div>

            {/* Current Profile Picture Card */}
            <div className="bg-gradient-to-br from-sky-50/70 to-indigo-50/50 border border-sky-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => (currentUser?.ProfileImage || editProfileImage) && setPreviewZoomImage(currentUser?.ProfileImage || editProfileImage)}>
                {(currentUser?.ProfileImage || editProfileImage) ? (
                  <>
                    <img 
                      src={currentUser?.ProfileImage || editProfileImage} 
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform" 
                      alt="Profile" 
                    />
                    <span className="absolute bottom-0 right-0 bg-sky-500 text-white p-1 rounded-full border-2 border-white shadow">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  </>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white border-2 border-dashed border-sky-300 flex flex-col items-center justify-center text-sky-600 shadow-xs shrink-0">
                    <UserIcon className="w-8 h-8" />
                    <span className="text-[8px] font-bold mt-0.5 text-slate-500">ยังไม่มีรูป</span>
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full">
                  <CheckCheck className="w-3 h-3" /> {(currentUser?.ProfileImage || editProfileImage) ? 'รูปโปรไฟล์ที่ลูกค้ามองเห็นในระบบ' : 'ยังไม่ได้ตั้งรูปโปรไฟล์'}
                </span>
                <p className="text-xs font-bold text-slate-800">
                  พี่{staff.Nickname} (ไอดี: {staff.StaffID})
                </p>
                <p className="text-[10px] text-slate-500">
                  {(currentUser?.ProfileImage || editProfileImage)
                    ? 'อัปโหลดรูปภาพใหม่ หรือเลือกจากคลังรูปภาพด้านล่างเพื่อเปลี่ยนรูปโปรไฟล์ได้ทันที'
                    : 'อัปโหลดรูปภาพใบหน้าหรือผลงาน เพื่อให้ลูกค้าเห็นเมื่อกดจองบริการ'}
                </p>
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row gap-1.5 w-full sm:w-auto">
                <label className="relative bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-xs font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูปจากเครื่อง</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoFileUpload(file, true);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
                {(currentUser?.ProfileImage || editProfileImage) && (
                  <button
                    type="button"
                    onClick={() => handleSetAsProfilePicture('', true)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="เอารูปโปรไฟล์ออก"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>เอารูปออก</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom URL Input Accordion */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                <LinkIcon className="w-3 h-3 text-slate-400" /> ใส่ลิงก์ URL รูปภาพโดยตรง
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customPhotoUrl}
                  onChange={(e) => setCustomPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customPhotoUrl.trim()) {
                      handleSetAsProfilePicture(customPhotoUrl.trim(), true);
                      setCustomPhotoUrl('');
                    } else {
                      onShowToast("กรุณากรอกลิงก์รูปภาพ", "error");
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  ตั้งเป็นโปรไฟล์
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (customPhotoUrl.trim()) {
                      handleAddPhotoToGallery(customPhotoUrl.trim(), false);
                      setCustomPhotoUrl('');
                    } else {
                      onShowToast("กรุณากรอกลิงก์รูปภาพ", "error");
                    }
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  + เพิ่มในคลัง
                </button>
              </div>
            </div>

            {/* MY PHOTO GALLERY (PORTFOLIO ALBUM) */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-sky-600" />
                  คลังรูปภาพของฉัน ({staffPhotos.length} รูป)
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">แตะที่รูปเพื่อตั้งเป็นโปรไฟล์</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Upload New Box inside Grid */}
                <label className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all aspect-square relative group">
                  <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-sky-700 block">เพิ่มรูปภาพใหม่</span>
                    <span className="text-[9px] text-slate-400 font-semibold">เข้าคลังรูปภาพ</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoFileUpload(file, false);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>

                {/* Existing Gallery Photos */}
                {staffPhotos.map((photoUrl, idx) => {
                  const isCurrentProfile = (currentUser?.ProfileImage === photoUrl) || (editProfileImage === photoUrl);
                  return (
                    <div 
                      key={idx} 
                      className={`relative rounded-2xl overflow-hidden aspect-square border-2 group transition-all shadow-xs ${
                        isCurrentProfile ? 'border-sky-500 ring-2 ring-sky-300 ring-offset-2' : 'border-slate-100 hover:border-sky-300'
                      }`}
                    >
                      <img 
                        src={photoUrl} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer" 
                        alt={`Staff Gallery ${idx}`}
                        onClick={() => setPreviewZoomImage(photoUrl)}
                      />

                      {/* Active profile badge */}
                      {isCurrentProfile && (
                        <div className="absolute top-2 left-2 bg-sky-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> โปรไฟล์ปัจจุบัน
                        </div>
                      )}

                      {/* Action overlays */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        {!isCurrentProfile ? (
                          <button
                            type="button"
                            onClick={() => handleSetAsProfilePicture(photoUrl, true)}
                            className="bg-white/95 hover:bg-white text-sky-600 hover:text-sky-700 font-black text-[9px] py-1 px-2 rounded-lg flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer flex-1 justify-center"
                          >
                            <Sparkles className="w-2.5 h-2.5" /> ใช้เป็นรูปโปรไฟล์
                          </button>
                        ) : (
                          <span className="text-[9px] font-black text-white px-1">ใช้งานอยู่</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeletePhotoFromGallery(photoUrl)}
                          className="bg-black/50 hover:bg-rose-600 text-white p-1 rounded-lg transition-colors cursor-pointer"
                          title="ลบรูปภาพนี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. PROFILE DETAILS EDIT FORM */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800 text-left">แก้ไขประวัติเพิ่มเติม</h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ชื่อเรียก (ชื่อเล่น)</label>
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                required
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">เพศ</label>
                <select
                  value={editGender}
                  onChange={(e: any) => setEditGender(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none cursor-pointer"
                >
                  <option value="Female">👩 หญิง</option>
                  <option value="Male">👨 ชาย</option>
                  <option value="Other">🌈 อื่นๆ</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">อายุ (ปี)</label>
                <input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(parseInt(e.target.value) || 30)}
                  required
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">น้ำหนัก (กก.)</label>
                <input
                  type="number"
                  value={editWeight}
                  onChange={(e) => setEditWeight(parseInt(e.target.value) || 50)}
                  required
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ส่วนสูง (ซม.)</label>
                <input
                  type="number"
                  value={editHeight}
                  onChange={(e) => setEditHeight(parseInt(e.target.value) || 160)}
                  required
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ที่อยู่ตามทะเบียนบ้าน</label>
              <input
                type="text"
                value={editRegisteredAddress}
                onChange={(e) => setEditRegisteredAddress(e.target.value)}
                placeholder="ที่อยู่ตามบัตรประชาชน..."
                required
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ประสบการณ์ทำงาน (ปี)</label>
              <input
                type="number"
                value={editExperience}
                onChange={(e) => setEditExperience(parseInt(e.target.value) || 1)}
                required
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ระยะทางที่รับงานสูงสุด (กิโลเมตร)</label>
              <input
                type="number"
                step="0.01"
                value={editMaxJobDistance}
                onChange={(e) => setEditMaxJobDistance(parseFloat(e.target.value) || 15)}
                required
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">คำอธิบายประวัตินวด</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="อธิบายผลงาน จุดเด่นในการนวดนวดคอบ่าไหล่ บรรเทาอัมพฤกษ์ ฯลฯ"
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">บริการที่รับงาน</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-1 gap-2">
                {services.map(service => (
                  <label key={service.ServiceID} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editOfferedServices.includes(service.ServiceID)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditOfferedServices(prev => [...prev, service.ServiceID]);
                        } else {
                          setEditOfferedServices(prev => prev.filter(id => id !== service.ServiceID));
                        }
                      }}
                      className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">{service.ServiceName}</span>
                  </label>
                ))}
                {services.length === 0 && (
                  <span className="text-xs text-slate-400">กำลังโหลดบริการ...</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              บันทึกการแก้ไขโปรไฟล์พนักงาน
            </button>
          </form>

          <button
            onClick={onLogout}
            className="w-full mt-4 text-xs font-black text-rose-500 border border-rose-500/10 hover:bg-rose-50 py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> ออกจากระบบพนักงาน
          </button>
        </div>
        </div>
      )}

      {/* FOOTER TAB SYSTEM NAVIGATION */}
      <div className="bg-white border-t border-slate-100 fixed bottom-0 left-0 right-0 py-2.5 px-4 flex items-center justify-around z-40 max-w-lg mx-auto shadow-2xl">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            activeTab === 'dashboard' ? 'text-sky-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[9px] font-bold">แผงรับงาน</span>
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            activeTab === 'history' ? 'text-sky-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[9px] font-bold">ประวัติรับงาน</span>
        </button>

        <button 
          onClick={() => setActiveTab('credit')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            activeTab === 'credit' ? 'text-sky-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[9px] font-bold">เติมเครดิต</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            activeTab === 'profile' ? 'text-sky-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold">โปรไฟล์</span>
        </button>
      </div>

      {/* 🚨 OVERLAY 1: GRAB STYLE INCOMING BOOKING ALERT (Pop-up with buzzer) */}
      {incomingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-sky-500 rounded-3xl max-w-sm w-full p-6 text-slate-800 text-center space-y-6 shadow-2xl relative overflow-hidden animate-bounce-short">
            
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-sky-400/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-sky-500/30 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-sky-500 text-white flex items-center justify-center relative shadow-lg">
                <Bell className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs bg-sky-100 text-sky-800 px-3.5 py-1.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <Volume2 className="w-4 h-4 text-sky-600 animate-pulse" />
                  <span>มีงานใหม่เรียกตัวด่วน ({countdown} วิ)</span>
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-sky-600 font-black animate-pulse flex items-center gap-1">
                  <Volume2 className="w-4 h-4 text-rose-500 animate-bounce" />
                  <span>กำลังส่งเสียงไซเรน & สั่นเตือนมือถือ...</span>
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await unlockAudioContext();
                    setAudioReady(true);
                    startJobAlertRingtone();
                    onShowToast("🔊 เร่งเสียงไซเรนเตือนงานเข้าดังสุดขีดเรียบร้อย!", "success");
                  }}
                  className="text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-2xl font-black inline-flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 shadow-xs"
                >
                  <Volume2 className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span>แตะเพื่อเร่งเสียงไซเรนให้ดังที่สุด 🔊</span>
                </button>
              </div>
              
              {/* Show Customer Details During Testing */}
              <div className="flex flex-col items-center gap-2 mt-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <img src={incomingBooking.CustomerProfileImage || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e'} className="w-12 h-12 rounded-full border-2 border-sky-500 object-cover" alt="Customer" />
                <div>
                  <h3 className="text-sm font-black text-slate-800">{incomingBooking.CustomerName}</h3>
                  {incomingBooking.CustomerPhone && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-0.5">
                      <Phone className="w-3 h-3 fill-emerald-600" />
                      <span>{incomingBooking.CustomerPhone}</span>
                    </span>
                  )}
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{incomingBooking.CustomerAddress}</p>
                </div>
              </div>
            </div>

            {/* Price & predicted distance */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-around">
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase">ระยะทางจริง</span>
                <span className="text-xs font-black text-slate-800">{formatDistance(incomingBooking.Distance)}</span>
              </div>
              <div className="w-[1px] h-8 bg-slate-200" />
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase">ค่าเดินทาง</span>
                <span className="text-sm font-black text-slate-800">฿{incomingBooking.TravelFee.toFixed(2)}</span>
              </div>
              <div className="w-[1px] h-8 bg-slate-200" />
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase">รายได้สุทธิ</span>
                <span className="text-base font-black text-sky-600">฿{incomingBooking.NetIncome || incomingBooking.TotalPrice}</span>
              </div>
            </div>

            {/* Credit deduction policy notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-left space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>หักเครดิตทันทีเมื่อกดรับงาน:</span>
                <span className="font-mono text-rose-600 font-black">-{incomingBooking.CreditRequired ?? 398} CR</span>
              </div>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                • เครดิตคงเหลือของคุณ: <span className="font-bold">{staff?.Credit ?? 0} CR</span><br />
                • หากมีการยกเลิกงาน การคืนเครดิตจะต้องได้รับการตรวจสอบและยืนยันจากแอดมิน
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => handleAcceptJob('reject')}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-2xl text-xs transition-colors cursor-pointer"
              >
                ปฏิเสธงาน
              </button>
              <button
                onClick={() => handleAcceptJob('accept')}
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-3.5 rounded-2xl text-xs shadow-md transition-all cursor-pointer"
              >
                กดรับงานนวด (฿)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📷 OVERLAY 2: PHOTO & PROFILE PICTURE MANAGER MODAL */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-800 space-y-5 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">จัดการรูปภาพและโปรไฟล์</h3>
                  <p className="text-[10px] text-slate-400">อัปโหลดรูปภาพใหม่ หรือเลือกรูปจากคลัง</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Profile Preview */}
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-2xl p-4 flex items-center gap-3.5">
              {(currentUser?.ProfileImage || editProfileImage) ? (
                <img 
                  src={currentUser?.ProfileImage || editProfileImage} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                  alt="Active Avatar"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-sky-300 flex flex-col items-center justify-center text-sky-600 shadow-xs shrink-0">
                  <UserIcon className="w-7 h-7" />
                  <span className="text-[8px] font-bold text-slate-500">ยังไม่มีรูป</span>
                </div>
              )}
              <div className="text-left space-y-0.5">
                <span className="text-[9px] font-black uppercase text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full inline-block">
                  {(currentUser?.ProfileImage || editProfileImage) ? 'รูปโปรไฟล์ปัจจุบัน' : 'ยังไม่มีรูปโปรไฟล์'}
                </span>
                <h4 className="text-xs font-black text-slate-900">พี่{staff.Nickname}</h4>
                <p className="text-[10px] text-slate-500">
                  {(currentUser?.ProfileImage || editProfileImage) ? 'รูปลักษณ์ที่คุณเห็นตรงนี้คือรูปที่ลูกค้ามองเห็น' : 'อัปโหลดรูปภาพเพื่อให้ลูกค้าเห็นใบหน้าหรือผลงานของคุณ'}
                </p>
              </div>
            </div>

            {/* Upload Button Box */}
            <div className="space-y-2 text-left">
              <span className="text-[11px] font-bold text-slate-700 block">อัปโหลดรูปภาพใหม่:</span>
              <label className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all">
                <div className="w-11 h-11 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-sky-700 block">แตะเพื่อถ่ายรูป หรือเลือกรูปจากมือถือ</span>
                  <span className="text-[10px] text-slate-400">ระบบจะบันทึกและตั้งเป็นรูปโปรไฟล์ให้ทันที</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoFileUpload(file, true);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Custom URL Input */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">หรือใส่ URL รูปภาพ:</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customPhotoUrl}
                  onChange={(e) => setCustomPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customPhotoUrl.trim()) {
                      handleSetAsProfilePicture(customPhotoUrl.trim(), true);
                      setCustomPhotoUrl('');
                    } else {
                      onShowToast("กรุณากรอกลิงก์รูปภาพ", "error");
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  ตั้งเป็นโปรไฟล์
                </button>
              </div>
            </div>

            {/* Select from existing gallery */}
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                  เลือกจากคลังรูปภาพ ({staffPhotos.length} รูป):
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                {staffPhotos.map((photo, i) => {
                  const isCur = (currentUser?.ProfileImage === photo) || (editProfileImage === photo);
                  return (
                    <div 
                      key={i} 
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer group ${
                        isCur ? 'border-sky-500 ring-2 ring-sky-300' : 'border-slate-200 hover:border-sky-300'
                      }`}
                      onClick={() => handleSetAsProfilePicture(photo, true)}
                    >
                      <img src={photo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="gallery" />
                      {isCur ? (
                        <div className="absolute inset-0 bg-sky-500/30 flex items-center justify-center text-white">
                          <Check className="w-5 h-5 drop-shadow-md stroke-[3]" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-black transition-opacity">
                          เลือกรูปนี้
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPhotoModal(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* 🔍 OVERLAY 3: IMAGE ZOOM PREVIEW MODAL */}
      {previewZoomImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewZoomImage(null)}
        >
          <div className="relative max-w-lg w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2 border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewZoomImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewZoomImage} className="w-full max-h-[75vh] object-contain rounded-2xl" alt="Zoomed" />
            <div className="p-3 flex items-center justify-between gap-3 bg-slate-900 text-white">
              <span className="text-xs font-medium text-slate-300">พรีวิวรูปภาพพนักงาน</span>
              <button
                type="button"
                onClick={() => {
                  handleSetAsProfilePicture(previewZoomImage, true);
                  setPreviewZoomImage(null);
                }}
                className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                ตั้งเป็นรูปโปรไฟล์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ OVERLAY 4: CANCEL JOB MODAL */}
      {showCancelJobModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 space-y-4 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">ขอยกเลิกงานนี้</h3>
                  <p className="text-[10px] text-slate-400">กรณีมีเหตุฉุกเฉินหรือจำเป็น</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelJobModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>📌 เงื่อนไขการคืนเครดิต:</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                เนื่องจากเครดิตถูกหักไปแล้วเมื่อกดรับงาน เมื่อคุณกดยกเลิก ระบบจะส่งคำขอคืนเครดิตไปยังแอดมินเพื่อตรวจสอบและยืนยันการคืนเครดิตให้คุณค่ะ
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ระบุเหตุผลในการขอยกเลิก:
              </label>
              <textarea
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="เช่น รถเสียระหว่างเดินทาง, เกิดอุบัติเหตุ, ติดต่อลูกค้าไม่ได้..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => setShowCancelJobModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleCancelOngoingJob}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-3 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingCancel ? 'กำลังส่งคำขอ...' : 'ยืนยันยกเลิกงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
