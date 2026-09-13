import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Shield, User as UserIcon, Briefcase, Eye, ChevronRight, 
  MapPin, Phone, Lock, Moon, Sun, Bell, Volume2, ShieldAlert, CheckCircle, Info,
  Camera, Upload, Plus, Trash2, Check, Image as ImageIcon, Link as LinkIcon
} from 'lucide-react';
import { User, Staff, AppSettings } from './types';
import CustomerPanel from './components/CustomerPanel';
import StaffPanel from './components/StaffPanel';
import AdminPanel from './components/AdminPanel';
import { getRealCurrentLocation } from './utils/geolocation';
import { playJobAlertSound, playCustomerChime, unlockAudioContext } from './utils/soundAlert';

// Canvas-based image compression for registration uploads
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

let globalAudioCtx: any = null;
const getAudioContext = () => {
  if (!globalAudioCtx) {
    globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return globalAudioCtx;
};

const defaultAppSettings: AppSettings = {
  companyName: "SabaiDee Massage",
  logo: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=120&auto=format&fit=crop&q=60",
  themeColor: "#00B14F",
  travelFeePerKm: 15,
  travelFeeTiers: [
    { minKm: 0, maxKm: 3, fee: 0 },
    { minKm: 3, maxKm: 10, fee: 150 },
    { minKm: 10, maxKm: 15, fee: 200 }
  ],
  commissionRate: 15,
  minCredit: 398,
  searchRadius: 15,
  systemOpen: 'ON',
  contactPhone: "081-234-5678",
  lineOA: "@sabaideemassage",
  facebook: "SabaiDee Home Massage",
  businessHours: "09:00 - 22:00",
  bannerText: "✨ โปรโมชั่นพิเศษ! ลดค่าเดินทาง 50% สำหรับการจองครั้งแรก ✨",
  promotionText: "จองนวดอโรมาวันนี้ รับสิทธิ์นวดคอบ่าไหล่ฟรี 15 นาที!",
  couponCode: "SABAIDEE99",
  couponDiscount: 50,
  bankName: "ธนาคารกสิกรไทย",
  bankAccount: "123-4-56789-0",
  bankAccountName: "บจก. สบายดี มาสสาจ",
  qrCodeImage: "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
};

const getPersistedSettings = (): AppSettings => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sabaidee_app_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.companyName) {
          const merged = { ...defaultAppSettings, ...parsed };
          if (!merged.minCredit || merged.minCredit < 398) {
            merged.minCredit = 398;
          }
          return merged;
        }
      }
    } catch (e) {
      console.warn("Failed reading localStorage settings:", e);
    }
  }
  return defaultAppSettings;
};

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(false);
  
  // Sound enabled state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  
  // Tab/Panel selector
  const [userRoleMode, setUserRoleMode] = useState<'Customer' | 'Staff' | 'Admin'>('Customer');

  // Login Form input states
  const [phoneInput, setPhoneInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [authMode, setAuthMode] = useState<'welcome' | 'login' | 'register_select' | 'register_customer' | 'register_staff'>('welcome');

  // Registration Form states
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<'Customer' | 'Staff'>('Customer');
  const [regNickname, setRegNickname] = useState("");
  const [regAge, setRegAge] = useState<number | string>(25);
  const [regWeight, setRegWeight] = useState<number | string>(50);
  const [regHeight, setRegHeight] = useState<number | string>(160);
  const [regRegisteredAddress, setRegRegisteredAddress] = useState("");
  const [regExperience, setRegExperience] = useState<number | string>(2);
  const [regGender, setRegGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  
  // Photo states during Staff registration (starts completely empty so staff can add their own photos)
  const [regProfileImage, setRegProfileImage] = useState<string>('');
  const [regPhotos, setRegPhotos] = useState<string[]>([]);
  const [regLicenseFile, setRegLicenseFile] = useState<string>('');
  const [regIdCardFile, setRegIdCardFile] = useState<string>('');
  const [regHouseRegFile, setRegHouseRegFile] = useState<string>('');
  const [regCustomPhotoUrl, setRegCustomPhotoUrl] = useState<string>('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);

  // Platform global Settings loaded from server & localStorage for permanent persistence
  const [settings, setSettings] = useState<AppSettings>(getPersistedSettings);

  // Floating Toasts alerts state list
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type: 'success' | 'error' | 'info' }>>([]);

  // Load settings and auto-request device GPS on initial render
  useEffect(() => {
    fetchSettings();

    // Try auto-login if saved credentials exist
    const savedAuth = localStorage.getItem('sabaidee_auth');
    if (savedAuth) {
      try {
        const { phone, password } = JSON.parse(savedAuth);
        if (phone && password) {
          fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
          })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setCurrentUser(data.user);
              setCurrentStaff(data.staff);
              setUserRoleMode(data.user.Role);
              showToast(`ยินดีต้อนรับกลับมาค่ะ คุณ${data.user.Name} (เข้าสู่ระบบอัตโนมัติ)`, "success");
              
              // Immediately fetch and sync real phone GPS on login
              getRealCurrentLocation(8000).then(geo => {
                if (data.user?.UserID) {
                  fetch(`/api/users/${data.user.UserID}/location`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latitude: geo.latitude, longitude: geo.longitude })
                  }).catch(console.error);
                  setCurrentUser((prev) => prev ? { ...prev, Latitude: geo.latitude, Longitude: geo.longitude } : null);
                }
                if (data.staff?.StaffID) {
                  fetch('/api/staff/location', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ staffId: data.staff.StaffID, latitude: geo.latitude, longitude: geo.longitude })
                  }).catch(console.error);
                  setCurrentStaff((prev) => prev ? { ...prev, CurrentLatitude: geo.latitude, CurrentLongitude: geo.longitude } : null);
                }
              }).catch(console.warn);
            }
          })
          .catch(err => {
            console.error("Auto login failed:", err);
          });
        }
      } catch (err) {
        console.error("Error parsing saved auth:", err);
      }
    } else {
      // Auto-detect real phone GPS coordinates on app load if not logging in automatically (handled inside auto-login as well)
      getRealCurrentLocation(8000)
        .then((geo) => {
          console.log("📍 Initial device GPS acquired:", geo.latitude, geo.longitude);
        })
        .catch((err) => {
          console.warn("Initial GPS request note:", err.message);
        });
    }
  }, []);

  // One-time silent audio unlock on first interaction for mobile browsers
  useEffect(() => {
    const unlock = () => {
      unlockAudioContext();
    };
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const serverData: AppSettings = await res.json();
        if (serverData && typeof serverData === 'object' && serverData.companyName) {
          // Check if local cache has customized settings that should be preserved
          const localStr = typeof window !== 'undefined' ? localStorage.getItem('sabaidee_app_settings') : null;
          if (localStr) {
            try {
              const localSettings: AppSettings = JSON.parse(localStr);
              // If local settings were customized by admin and server returned uncustomized or older defaults
              if (localSettings.isCustomized && !serverData.isCustomized) {
                console.log("Restoring customized settings from localStorage to server...");
                fetch('/api/settings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(localSettings)
                }).catch(console.error);
                setSettings(localSettings);
                return;
              }
              if (localSettings.updatedAt && serverData.updatedAt && localSettings.updatedAt > serverData.updatedAt) {
                setSettings(localSettings);
                return;
              }
            } catch {
              // ignore parse errors
            }
          }

          if (!serverData.minCredit || serverData.minCredit < 398) {
            serverData.minCredit = 398;
          }
          setSettings(serverData);
          try {
            localStorage.setItem('sabaidee_app_settings', JSON.stringify(serverData));
          } catch {}
        }
      }
    } catch (e) {
      console.error("fetchSettings error:", e);
    }
  };

  const handlePersistSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('sabaidee_app_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn("Failed saving settings to localStorage:", e);
    }
  };

  // Play Gentle Customer Notification Chime
  const playChime = () => {
    if (!soundEnabled) return;
    playCustomerChime();
  };

  // Urgent & Melodic Alarm Sound for incoming staff jobs (Grab/LineMan style loud ringtone + phone vibration)
  const playJobAlert = () => {
    playJobAlertSound({ soundEnabled });
  };

  // Toast notices display trigger
  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Standard Login Submit handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput || !passwordInput) {
      showToast("กรุณากรอกเบอร์โทรศัพท์และรหัสผ่านด้วยค่ะ", "error");
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, password: passwordInput })
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('เซิร์ฟเวอร์กำลังเชื่อมต่อหรือเริ่มต้นระบบใหม่ กรุณารอสักครู่แล้วลองอีกครั้งค่ะ');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง');

      setCurrentUser(data.user);
      setCurrentStaff(data.staff);
      setUserRoleMode(data.user.Role);
      showToast(`ยินดีต้อนรับกลับมาค่ะ คุณ${data.user.Name}`, "success");

      // Immediately fetch and sync real phone GPS on login
      getRealCurrentLocation(8000)
        .then(async (geo) => {
          // Sync user GPS to server
          if (data.user?.UserID) {
            fetch(`/api/users/${data.user.UserID}/location`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude: geo.latitude,
                longitude: geo.longitude
              })
            }).catch(console.error);

            setCurrentUser((prev) => prev ? { ...prev, Latitude: geo.latitude, Longitude: geo.longitude } : null);
          }

          // If staff, sync staff GPS to server
          if (data.staff?.StaffID) {
            fetch('/api/staff/location', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                staffId: data.staff.StaffID,
                latitude: geo.latitude,
                longitude: geo.longitude
              })
            }).catch(console.error);

            setCurrentStaff((prev) => prev ? { ...prev, CurrentLatitude: geo.latitude, CurrentLongitude: geo.longitude } : null);
          }
        })
        .catch((geoErr) => {
          console.warn("Auto GPS sync on login note:", geoErr.message);
        });

      if (rememberMe) {
        localStorage.setItem('sabaidee_auth', JSON.stringify({ phone: phoneInput, password: passwordInput }));
      } else {
        localStorage.removeItem('sabaidee_auth');
      }

      // Clear forms
      setPhoneInput("");
      setPasswordInput("");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Handle file upload during registration
  const handleRegPhotoUpload = async (file: File, setAsProfile: boolean = true) => {
    if (!file) return;
    setIsCompressingPhoto(true);
    showToast("🖼️ กำลังประมวลผลรูปภาพ...", "info");
    try {
      const base64 = await compressImageFile(file);
      if (setAsProfile) {
        setRegProfileImage(base64);
        if (!regPhotos.includes(base64)) {
          setRegPhotos([base64, ...regPhotos]);
        }
      } else {
        if (!regPhotos.includes(base64)) {
          setRegPhotos([base64, ...regPhotos]);
        }
      }
      showToast("📸 อัปโหลดรูปภาพสำเร็จแล้วค่ะ", "success");
    } catch (e: any) {
      showToast(e.message || "ไม่สามารถอัปโหลดรูปภาพได้", "error");
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  // Standard Registration submit handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regPassword) {
      showToast("กรุณากรอกฟิลด์ข้อมูลสำคัญให้ครบถ้วนด้วยค่ะ", "error");
      return;
    }

    const currentRole: 'Customer' | 'Staff' = authMode === 'register_staff' ? 'Staff' : 'Customer';

    if (currentRole === 'Staff' && (!regLicenseFile || !regIdCardFile || !regHouseRegFile)) {
      showToast("กรุณาอัปโหลดใบอนุญาตนวด, สำเนาบัตรประชาชน และสำเนาทะเบียนบ้านเพื่อใช้ในการสมัครด้วยค่ะ", "error");
      return;
    }

    try {
      // Attempt to retrieve real phone GPS coordinates
      let userLat = 9.138244;
      let userLng = 99.321748;
      try {
        const geo = await getRealCurrentLocation(5000);
        userLat = geo.latitude;
        userLng = geo.longitude;
      } catch (geoErr) {
        console.warn("Could not fetch GPS on register, will use fallback:", geoErr);
      }

      const finalProfileImage = currentRole === 'Staff'
        ? (regProfileImage || "")
        : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";

      const finalStaffPhotos = currentRole === 'Staff'
        ? (regPhotos.length > 0 ? regPhotos : (finalProfileImage ? [finalProfileImage] : []))
        : undefined;

      const payload = {
        name: regName,
        phone: regPhone,
        password: regPassword,
        role: currentRole,
        latitude: userLat,
        longitude: userLng,
        profileImage: finalProfileImage,
        staffInfo: currentRole === 'Staff' ? {
          nickname: regNickname.trim() || regName.split(" ")[0],
          age: Number(regAge) || 25,
          weight: Number(regWeight) || 50,
          height: Number(regHeight) || 160,
          registeredAddress: regRegisteredAddress,
          gender: regGender,
          experience: Number(regExperience) || 0,
          description: "พร้อมให้บริการสปานวดเพื่อสุขภาพและการผ่อนคลายเต็มรูปแบบ",
          photos: finalStaffPhotos,
          licenseFile: regLicenseFile,
          idCardFile: regIdCardFile,
          houseRegFile: regHouseRegFile
        } : undefined
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('เซิร์ฟเวอร์กำลังเชื่อมต่อหรือเริ่มต้นระบบใหม่ กรุณารอสักครู่แล้วลองอีกครั้งค่ะ');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สมัครสมาชิกไม่สำเร็จ');

      showToast(currentRole === 'Staff' 
        ? "🎉 สมัครพนักงานนวดสำเร็จ! รับฟรี 398 เครดิตเพื่อเริ่มรับงานฟรี 1 ครั้งได้ทันที กรุณาเข้าสู่ระบบค่ะ" 
        : "สมัครสมาชิกลูกค้าสำเร็จเรียบร้อย! กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน", "success");
      setAuthMode('login');
      setPhoneInput(regPhone);
      setPasswordInput(regPassword);
      // Reset form
      setRegName("");
      setRegNickname("");
      setRegRegisteredAddress("");
      setRegProfileImage("");
      setRegPhotos([]);
      setRegLicenseFile("");
      setRegIdCardFile("");
      setRegHouseRegFile("");
      setRegCustomPhotoUrl("");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentStaff(null);
    setUserRoleMode('Customer');
    localStorage.removeItem('sabaidee_auth');
    showToast("ออกจากระบบในเบราว์เซอร์สำเร็จ", "info");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans flex flex-col ${
      darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`} id="main-app-container">
      
      {/* GLOBAL TOAST NOTIFICATION CONTAINER OVERLAY */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border text-xs font-semibold leading-normal animate-slide-in pointer-events-auto ${
              t.type === 'success' ? 'bg-sky-500 border-sky-400 text-slate-950 font-bold' :
              t.type === 'error' ? 'bg-rose-500 border-rose-400 text-white' :
              'bg-slate-900 border-slate-800 text-sky-400'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            {t.type === 'error' && <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* HEADER NAVBAR */}
      <header className={`border-b ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200/80'
      } sticky top-0 z-40 backdrop-blur-md shadow-xs`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo / Title brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-sky-500 text-white font-bold text-xl">
              <img src={settings.logo} className="w-full h-full object-cover" alt="Logo" />
            </div>
            <div>
              <span className="font-display font-black text-base text-slate-900 dark:text-white uppercase tracking-tight">{settings.companyName}</span>
              <p className="text-[9px] font-bold text-sky-600 tracking-wider uppercase font-sans">HomeMassage Booking Platform</p>
            </div>
          </div>

          {/* Nav Controls */}
          <div className="flex items-center gap-3">
            
            {/* Audio sound trigger */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                showToast(soundEnabled ? "ปิดเสียงแจ้งเตือนแล้ว" : "เปิดเสียงแจ้งเตือนแล้วค่ะ", "info");
              }}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                darkMode ? 'hover:bg-slate-800 border-slate-800' : 'hover:bg-slate-100 border-slate-200'
              }`}
              title="สลับเสียงแจ้งเตือน"
            >
              <Volume2 className={`w-4 h-4 ${soundEnabled ? 'text-sky-500' : 'text-slate-400'}`} />
            </button>

            {/* Dark mode trigger */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                darkMode ? 'hover:bg-slate-800 border-slate-800' : 'hover:bg-slate-100 border-slate-200'
              }`}
              title="สลับโหมดหน้าจอ"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Logout button */}
            {currentUser && (
              <button
                onClick={handleLogout}
                className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                ออกจากระบบ
              </button>
            )}
          </div>

        </div>
      </header>

      {/* MAIN LAYOUT CANVAS */}
      <main className="max-w-6xl w-full mx-auto px-2.5 sm:px-4 py-2 sm:py-6 flex-1">
        
        {/* CASE 1: USER IS NOT LOGGED IN IN THE SESSION (LOGIN PANEL) */}
        {!currentUser ? (
          <div className="max-w-md mx-auto bg-white text-slate-800 border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/60 space-y-6 animate-scale-up text-left">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-500 font-black">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900 pt-2">ยินดีต้อนรับสู่ SabaiDee Massage</h2>
              <p className="text-xs text-slate-500 font-semibold leading-normal">
                แพลตฟอร์มเรียกบริการหมอนวดมืออาชีพถึงบ้าน สะดวก ปลอดภัย ตลอด 24 ชม.
              </p>
            </div>

            {/* WELCOME LANDING */}
            {authMode === 'welcome' ? (
              <div className="space-y-4 animate-fade-in pt-4">
                <div className="space-y-3">
                  <button
                    type="button"
                    id="btn-welcome-register-customer"
                    onClick={() => {
                      setAuthMode('register_customer');
                      setRegRole('Customer');
                    }}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black text-xs py-4 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserIcon className="w-4 h-4" /> สมัครใช้งานครั้งแรก
                  </button>
                  <button
                    type="button"
                    id="btn-welcome-login"
                    onClick={() => setAuthMode('login')}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-black text-xs py-4 rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" /> เข้าสู่ระบบ (สำหรับลูกค้าเก่า)
                  </button>
                </div>

                {/* Subtle small bottom-left button for staff registration */}
                <div className="pt-5 border-t border-slate-100 flex items-center justify-start">
                  <button
                    type="button"
                    id="btn-register-staff-subtle"
                    onClick={() => {
                      setAuthMode('register_staff');
                      setRegRole('Staff');
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>สมัครเป็นพนักงานนวด</span>
                  </button>
                </div>
              </div>
            ) : authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">เบอร์โทรศัพท์มือถือ</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="เช่น 0823456789"
                      required
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl py-3 pl-10 pr-4 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">รหัสผ่านบัญชี</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl py-3 pl-10 pr-4 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 pb-1">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-sky-500 border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-[11px] font-bold text-slate-600 cursor-pointer select-none">
                    จำรหัสผ่านและเข้าสู่ระบบอัตโนมัติ
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs py-3.5 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  เข้าสู่ระบบสมาชิก
                </button>
                <div className="pt-4 space-y-2 text-center">
                  <button
                    type="button"
                    onClick={() => setAuthMode('welcome')}
                    className="text-slate-500 hover:text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    ย้อนกลับไปหน้าแรก
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-start">
                  <button
                    type="button"
                    id="btn-login-staff-subtle"
                    onClick={() => {
                      setAuthMode('register_staff');
                      setRegRole('Staff');
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>สมัครเป็นพนักงานนวด</span>
                  </button>
                </div>
              </form>
            ) : authMode === 'register_select' ? (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-center font-black text-slate-900 mb-2">เลือกประเภทการสมัครสมาชิก</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register_customer'); setRegRole('Customer'); }}
                    className="flex items-center gap-4 bg-white hover:bg-sky-50/50 border border-slate-200 p-4 rounded-2xl cursor-pointer transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 text-xl">
                      🙋
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-black text-slate-900">สมัครสมาชิกลูกค้า</span>
                      <span className="block text-[10px] font-bold text-slate-500">สำหรับผู้ที่ต้องการเรียกใช้บริการนวดถึงบ้าน</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode('register_staff'); setRegRole('Staff'); }}
                    className="flex items-center gap-4 bg-white hover:bg-emerald-50/50 border border-slate-200 p-4 rounded-2xl cursor-pointer transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-xl">
                      💆
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="block text-sm font-black text-slate-900">สมัครสมาชิกพนักงานนวด</span>
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                          ฟรี 398 CR
                        </span>
                      </div>
                      <span className="block text-[10px] font-bold text-slate-500">สำหรับผู้ให้บริการหมอนวดมืออาชีพ รับงานฟรี 1 ครั้งแรก</span>
                    </div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMode('welcome')}
                  className="w-full mt-2 text-slate-500 hover:text-slate-700 font-bold text-xs py-3.5 transition-colors cursor-pointer"
                >
                  ย้อนกลับไปหน้าเข้าสู่ระบบ
                </button>
              </div>
            ) : authMode === 'register_customer' ? (
              // 🙋 DEDICATED CUSTOMER REGISTRATION FORM (NO STAFF TOGGLE)
              <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setAuthMode('welcome')}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="ย้อนกลับ"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                      <span>🙋</span> สมัครสมาชิกลูกค้า
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-500">สร้างบัญชีสำหรับเรียกบริการหมอนวดมืออาชีพถึงบ้าน</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="เช่น นาย สมคิด รักสปา"
                    required
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">เบอร์โทรศัพท์มือถือ</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="เช่น 08xxxxxxxx"
                    required
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ตั้งรหัสผ่าน</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="อย่างน้อย 4 ตัวอักษรขึ้นไป"
                    required
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs py-3.5 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  🙋 ยืนยันสมัครสมาชิกลูกค้า
                </button>

                <div className="pt-2 text-center space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setAuthMode('welcome')}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer block w-full"
                  >
                    มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-start">
                  <button
                    type="button"
                    id="btn-customer-staff-subtle"
                    onClick={() => { setAuthMode('register_staff'); setRegRole('Staff'); }}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>สมัครเป็นพนักงานนวด</span>
                  </button>
                </div>
              </form>
            ) : (
              // 💆 DEDICATED STAFF REGISTRATION FORM (NO CUSTOMER TOGGLE)
              <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setAuthMode('welcome')}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="ย้อนกลับ"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                      <span>💆</span> สมัครสมาชิกพนักงานนวด
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-500">ร่วมงานเป็นหมอนวดมืออาชีพกับ SabaiDee Massage</p>
                  </div>
                </div>

                {/* 🎁 Welcome Credit Bonus Banner */}
                <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white rounded-2xl p-3.5 shadow-sm flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shrink-0 shadow-inner">
                    🎁
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black">สิทธิพิเศษพนักงานใหม่!</span>
                      <span className="text-[10px] font-black bg-amber-300 text-slate-900 px-2 py-0.5 rounded-full shadow-xs">
                        ฟรี 398 เครดิต
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-50 font-medium leading-tight mt-1">
                      สมัครวันนี้ รับเครดิตเริ่มต้น 398 CR ทันที สามารถใช้รับงานลูกค้าฟรีได้ 1 ครั้งโดยไม่ต้องเติมเงิน
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="เช่น น.ส. สมคิด บุญชู"
                    required
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ชื่อเล่น (สำหรับแสดงให้ลูกค้าเห็น)</label>
                  <input
                    type="text"
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder="เช่น คิด, แอน, แพร (เว้นว่างไว้จะใช้ชื่อจริง)"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* 📸 STAFF REGISTRATION PHOTO & GALLERY UPLOAD SECTION */}
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3.5 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-600" /> รูปโปรไฟล์และรูปถ่ายผลงาน
                      </span>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        เพิ่มรูปถ่ายใบหน้าหรือผลงาน เพื่อให้ลูกค้าเห็นเมื่อกดจอง
                      </p>
                    </div>
                  </div>

                  {/* Active Profile Preview Card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3.5 shadow-2xs">
                    {regProfileImage ? (
                      <div className="relative group shrink-0">
                        <img 
                          src={regProfileImage} 
                          className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                          alt="Profile Preview"
                        />
                        <span className="absolute bottom-0 right-0 bg-emerald-500 text-white p-0.5 rounded-full border-2 border-white shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      </div>
                    ) : (
                      <label className="relative shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-emerald-400 bg-emerald-50/80 hover:bg-emerald-100/70 flex flex-col items-center justify-center cursor-pointer transition-all text-emerald-600 group">
                        <Camera className="w-6 h-6 stroke-[1.8] group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black mt-0.5 text-emerald-700">+ เพิ่มรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isCompressingPhoto}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleRegPhotoUpload(file, true);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        regProfileImage 
                          ? 'text-emerald-700 bg-emerald-100/80' 
                          : 'text-amber-800 bg-amber-100'
                      }`}>
                        {regProfileImage ? 'รูปโปรไฟล์ที่จะแสดงในระบบ' : 'ยังไม่ได้เพิ่มรูปโปรไฟล์'}
                      </span>
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {regNickname ? `พี่${regNickname}` : (regName ? `คุณ ${regName}` : 'รูปภาพโปรไฟล์ของคุณ')}
                      </p>
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <label className="relative inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg cursor-pointer transition-all">
                          <Upload className="w-3 h-3" />
                          <span>{isCompressingPhoto ? "กำลังประมวลผล..." : (regProfileImage ? "ถ่ายรูป / เปลี่ยนรูป" : "ถ่ายรูป / เลือกรูปโปรไฟล์")}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isCompressingPhoto}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleRegPhotoUpload(file, true);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </label>

                        {regProfileImage && (
                          <button
                            type="button"
                            onClick={() => {
                              setRegProfileImage('');
                              showToast("เอารูปโปรไฟล์ออกเรียบร้อยค่ะ", "info");
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg cursor-pointer transition-all"
                            title="เอารูปโปรไฟล์ออก"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>เอารูปออก</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Photo Gallery List during registration */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                        <ImageIcon className="w-3 h-3 text-emerald-600" /> คลังรูปภาพ ({regPhotos.length} รูป)
                      </span>
                      {regPhotos.length > 0 && (
                        <span className="text-[9px] text-slate-400">แตะเพื่อสลับเป็นรูปโปรไฟล์</span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {/* Upload new photo to album */}
                      <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/50 rounded-xl flex flex-col items-center justify-center text-center p-2 cursor-pointer transition-all aspect-square relative">
                        <Plus className="w-4 h-4 text-emerald-600" />
                        <span className="text-[8px] font-bold text-emerald-700 mt-0.5">+ เพิ่มรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isCompressingPhoto}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleRegPhotoUpload(file, regPhotos.length === 0 && !regProfileImage);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>

                      {/* Display added photos */}
                      {regPhotos.map((photo, pIdx) => {
                        const isMain = regProfileImage === photo;
                        return (
                          <div 
                            key={pIdx} 
                            className={`relative rounded-xl overflow-hidden aspect-square border-2 group transition-all ${
                              isMain ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            <img 
                              src={photo} 
                              className="w-full h-full object-cover cursor-pointer" 
                              alt={`Reg photo ${pIdx}`}
                              onClick={() => setRegProfileImage(photo)}
                            />
                            {isMain ? (
                              <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[7px] font-black px-1 rounded-sm shadow">
                                โปรไฟล์
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRegProfileImage(photo)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-black transition-opacity cursor-pointer"
                              >
                                เลือกใช้
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = regPhotos.filter((_, i) => i !== pIdx);
                                setRegPhotos(updated);
                                if (isMain) {
                                  setRegProfileImage(updated.length > 0 ? updated[0] : '');
                                }
                              }}
                              className="absolute bottom-1 right-1 bg-black/60 hover:bg-rose-600 text-white p-1 rounded-md transition-colors cursor-pointer"
                              title="ลบรูปนี้"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {regPhotos.length === 0 && (
                      <p className="text-[9.5px] text-slate-400 italic pt-0.5">
                        * ไม่มีรูปภาพเริ่มต้น — พนักงานสามารถถ่ายรูปหรือเลือกรูปภาพของตนเองได้ตามต้องการ
                      </p>
                    )}
                  </div>

                  {/* Direct URL input option */}
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="url"
                      value={regCustomPhotoUrl}
                      onChange={(e) => setRegCustomPhotoUrl(e.target.value)}
                      placeholder="หรือใส่ลิงก์ URL รูปภาพโดยตรง..."
                      className="flex-1 text-[11px] border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (regCustomPhotoUrl.trim()) {
                          const url = regCustomPhotoUrl.trim();
                          setRegProfileImage(url);
                          if (!regPhotos.includes(url)) {
                            setRegPhotos([...regPhotos, url]);
                          }
                          setRegCustomPhotoUrl('');
                          showToast("เพิ่มรูปโปรไฟล์จาก URL สำเร็จแล้วค่ะ", "success");
                        } else {
                          showToast("กรุณากรอกลิงก์ URL รูปภาพ", "error");
                        }
                      }}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      เพิ่มรูป
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">เบอร์โทรศัพท์สมัคร</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="เช่น 08xxxxxxxx"
                    required
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ตั้งรหัสผ่าน</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="อย่างน้อย 4 ตัวอักษรขึ้นไป"
                    required
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Additional Staff Registration Details */}
                <div className="space-y-4 border-t border-slate-100 pt-4 animate-fade-in">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">อายุ (ปี)</label>
                      <input
                        type="number"
                        value={regAge}
                        onChange={(e) => setRegAge(e.target.value === '' ? '' : (parseInt(e.target.value) || ''))}
                        placeholder="เช่น 25"
                        required
                        min={18}
                        max={70}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">น้ำหนัก (กก.)</label>
                      <input
                        type="number"
                        value={regWeight}
                        onChange={(e) => setRegWeight(e.target.value === '' ? '' : (parseInt(e.target.value) || ''))}
                        placeholder="เช่น 50"
                        required
                        min={35}
                        max={150}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ส่วนสูง (ซม.)</label>
                      <input
                        type="number"
                        value={regHeight}
                        onChange={(e) => setRegHeight(e.target.value === '' ? '' : (parseInt(e.target.value) || ''))}
                        placeholder="เช่น 160"
                        required
                        min={120}
                        max={220}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ที่อยู่ตามทะเบียนบ้าน</label>
                    <input
                      type="text"
                      value={regRegisteredAddress}
                      onChange={(e) => setRegRegisteredAddress(e.target.value)}
                      placeholder="เช่น 12/34 ม.5 ต.ในเมือง อ.เมือง จ.ขอนแก่น"
                      required
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">เพศตามทะเบียน</label>
                      <select
                        value={regGender}
                        onChange={(e: any) => setRegGender(e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value="Female">👩 หญิง</option>
                        <option value="Male">👨 ชาย</option>
                        <option value="Other">🌈 อื่นๆ</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ประสบการณ์ (ปี)</label>
                      <input
                        type="number"
                        value={regExperience}
                        onChange={(e) => setRegExperience(e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                        placeholder="เช่น 2"
                        required
                        min={0}
                        max={50}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Document Uploads for Staff */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h4 className="text-[11px] font-black text-slate-700">เอกสารสำคัญสำหรับการสมัคร</h4>
                  
                  {/* License */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>ใบอนุญาต <span className="text-rose-500">*</span></span>
                      {regLicenseFile && <span className="text-emerald-500">อัปโหลดแล้ว</span>}
                    </label>
                    <label className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="text-slate-500">{regLicenseFile ? 'เปลี่ยนรูปใบอนุญาต' : 'อัปโหลดใบอนุญาตนวด'}</span>
                      <input type="file" accept="image/*" required className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const b64 = await compressImageFile(file);
                            setRegLicenseFile(b64);
                            showToast("อัปโหลดใบอนุญาตสำเร็จ", "success");
                          } catch (err) {
                            showToast("อัปโหลดไม่สำเร็จ", "error");
                          }
                        }
                      }} />
                    </label>
                  </div>

                  {/* ID Card */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>สำเนาบัตรประชาชน <span className="text-rose-500">*</span></span>
                      {regIdCardFile && <span className="text-emerald-500">อัปโหลดแล้ว</span>}
                    </label>
                    <label className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="text-slate-500">{regIdCardFile ? 'เปลี่ยนสำเนาบัตรประชาชน' : 'อัปโหลดสำเนาบัตรประชาชน'}</span>
                      <input type="file" accept="image/*" required className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const b64 = await compressImageFile(file);
                            setRegIdCardFile(b64);
                            showToast("อัปโหลดสำเนาบัตรประชาชนสำเร็จ", "success");
                          } catch (err) {
                            showToast("อัปโหลดไม่สำเร็จ", "error");
                          }
                        }
                      }} />
                    </label>
                  </div>

                  {/* House Registration */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>สำเนาทะเบียนบ้าน <span className="text-rose-500">*</span></span>
                      {regHouseRegFile && <span className="text-emerald-500">อัปโหลดแล้ว</span>}
                    </label>
                    <label className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-white text-slate-900 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="text-slate-500">{regHouseRegFile ? 'เปลี่ยนสำเนาทะเบียนบ้าน' : 'อัปโหลดสำเนาทะเบียนบ้าน'}</span>
                      <input type="file" accept="image/*" required className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const b64 = await compressImageFile(file);
                            setRegHouseRegFile(b64);
                            showToast("อัปโหลดสำเนาทะเบียนบ้านสำเร็จ", "success");
                          } catch (err) {
                            showToast("อัปโหลดไม่สำเร็จ", "error");
                          }
                        }
                      }} />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-3.5 rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>💆 ยืนยันสมัครสมาชิกพนักงานนวด</span>
                  <span className="bg-emerald-700/60 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    (รับฟรี 398 เครดิต)
                  </span>
                </button>

                <div className="pt-2 text-center space-y-1.5">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register_customer'); setRegRole('Customer'); }}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer block w-full"
                  >
                    ต้องการสมัครเป็นลูกค้าทั่วไป? คลิกที่นี่
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('welcome')}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer block w-full"
                  >
                    มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
                  </button>
                </div>
              </form>
            )}

          </div>
        ) : (
          /* CASE 2: USER IS AUTHENTICATED & READY IN SESSION */
          <div>
            
            {/* Direct match error notification alert if user has logged in but role doesn't match selection */}
            {userRoleMode !== currentUser.Role && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>
                    บัญชีของคุณเข้าสู่ระบบในบทบาท **"{currentUser.Role}"** อยู่ในขณะนี้
                  </span>
                </div>
                <button
                  onClick={() => setUserRoleMode(currentUser.Role)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  สลับไปที่หน้า {currentUser.Role}
                </button>
              </div>
            )}

            {/* ROUTE PANELS */}
            {userRoleMode === 'Customer' && (
              <CustomerPanel 
                currentUser={currentUser}
                settings={settings}
                onShowToast={showToast}
                onPlayNotificationSound={playChime}
                onUpdateUser={setCurrentUser}
              />
            )}

            {userRoleMode === 'Staff' && (
              <StaffPanel 
                currentUser={currentUser}
                currentStaff={currentStaff}
                settings={settings}
                onLogout={handleLogout}
                onShowToast={showToast}
                onPlayNotificationSound={playJobAlert}
                onUpdateStaffData={(updatedStaff) => setCurrentStaff(updatedStaff)}
                onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
              />
            )}

            {userRoleMode === 'Admin' && (
              <AdminPanel 
                currentUser={currentUser}
                settings={settings}
                onUpdateSettings={handlePersistSettings}
                onShowToast={showToast}
              />
            )}

          </div>
        )}

      </main>

      {/* Sleek Bottom Status Bar (Hidden on mobile to avoid colliding with Mobile Bottom Nav) */}
      <footer className={`hidden sm:flex h-11 border-t px-6 flex-row items-center justify-between gap-2 text-left ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-gray-100 text-slate-500'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-[#00B14F] rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">System Online</span>
          </div>
          <span className="text-[10px] text-gray-300">|</span>
          <span className="text-[10px] font-semibold">Google Maps APIs Integrated</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px]">SabaiDee Home Massage App</span>
          <span className="text-[10px] px-3 py-1 bg-sky-500/10 text-sky-600 rounded-full font-bold">Ver 1.2.0 (GAS Database)</span>
        </div>
      </footer>

    </div>
  );
}
