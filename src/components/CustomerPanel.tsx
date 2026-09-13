import React, { useState, useEffect } from 'react';
import { 
  MapPin, Phone, Star, Sparkles, MessageSquare, Clock, Shield, CheckCircle, 
  ChevronRight, AlertTriangle, X, ShoppingBag, Send, ListCollapse, Award, Compass,
  Navigation, ExternalLink, Filter, Search, Eye, EyeOff, Check
} from 'lucide-react';
import { User, Staff, Service, Booking, Review, Notification, AppSettings } from '../types';
import InteractiveMap from './InteractiveMap';
import MobileBottomNav, { CustomerNavTab } from './MobileBottomNav';
import { calculateDistance, formatDistance, formatDistanceCompact, calculateTravelFee, getGoogleMapsDirectionsUrl } from '../utils/distance';
import { getRealCurrentLocation } from '../utils/geolocation';

interface CustomerPanelProps {
  currentUser: User | null;
  settings: AppSettings;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onPlayNotificationSound?: () => void;
  onUpdateUser?: (user: User) => void;
}

export default function CustomerPanel({
  currentUser,
  settings,
  onShowToast,
  onPlayNotificationSound,
  onUpdateUser
}: CustomerPanelProps) {
  // Database states
  const [services, setServices] = useState<Service[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // UI Selection states
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaffProfile, setSelectedStaffProfile] = useState<any | null>(null);
  const [selectedStaffForBooking, setSelectedStaffForBooking] = useState<any | null>(null);
  const [selectedStaffReviews, setSelectedStaffReviews] = useState<any[]>([]);
  
  // Custom Customer Location coordinates (Default: Surat Thani City Center)
  const [customerLat, setCustomerLat] = useState(9.138244);
  const [customerLng, setCustomerLng] = useState(99.321748);
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerAddressDetail, setCustomerAddressDetail] = useState("");

  // Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [bookingToReview, setBookingToReview] = useState<any | null>(null);
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [fullSizePhoto, setFullSizePhoto] = useState<string | null>(null);

  // Loading indicator states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerNavTab>('home');
  const [historyBookings, setHistoryBookings] = useState<any[]>([]);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'All' | 'Female' | 'Male'>('All');
  const [searchStaff, setSearchStaff] = useState('');
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'experience'>('distance');

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editProfileImage, setEditProfileImage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const startEditProfile = () => {
    if (currentUser) {
      setEditName(currentUser.Name || "");
      setEditPhone(currentUser.Phone || "");
      setEditProfileImage(currentUser.ProfileImage || "");
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    if (!editName.trim() || !editPhone.trim()) {
      onShowToast("กรุณากรอกชื่อและเบอร์โทรศัพท์ให้ครบถ้วน", "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${currentUser.UserID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          profileImage: editProfileImage
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (onUpdateUser) onUpdateUser(data.user);
      onShowToast("บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว", "success");
      setIsEditingProfile(false);
    } catch (e: any) {
      onShowToast(e.message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (addressSearchQuery.trim() && showSuggestions) {
        try {
          const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(addressSearchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setAddressSuggestions(data.results || []);
          }
        } catch (e) {
          console.warn("Error fetching suggestions:", e);
        }
      } else {
        setAddressSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [addressSearchQuery, showSuggestions]);

  const handleSelectSuggestion = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCustomerLat(lat);
      setCustomerLng(lng);
    }
    setCustomerAddress(suggestion.display_name);
    setAddressSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    onShowToast("ค้นหาตำแหน่งสำเร็จ", "success");
  };

  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          setCustomerAddress(data.address);
          return;
        }
      }
      setCustomerAddress(`พิกัดละติจูด ${lat.toFixed(5)}, ลองจิจูด ${lng.toFixed(5)}`);
    } catch (e) {
      setCustomerAddress(`พิกัดละติจูด ${lat.toFixed(5)}, ลองจิจูด ${lng.toFixed(5)}`);
    }
  };

  const handleMapLocationChange = (lat: number, lng: number) => {
    setCustomerLat(lat);
    setCustomerLng(lng);
    handleReverseGeocode(lat, lng);
  };

  const handleSearchAddress = async () => {
    if (!addressSearchQuery.trim()) return;
    setIsSearchingAddress(true);
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(addressSearchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        if (results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            setCustomerLat(lat);
            setCustomerLng(lng);
          }
          setCustomerAddress(results[0].display_name);
          onShowToast("ค้นหาตำแหน่งสำเร็จ", "success");
          return;
        }
      }
      onShowToast("ไม่พบตำแหน่งจากคำค้นหาดังกล่าว", "error");
    } catch (e) {
      onShowToast("ค้นหาตำแหน่งล้มเหลว", "error");
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchServices();
    fetchStaff();
    if (currentUser) {
      fetchActiveBooking();
      fetchNotifications();
    }
  }, [currentUser]);

  // Set initial location: auto-fetch real location on mount for all visitors
  useEffect(() => {
    let isMounted = true;

    // If user has saved coords, load them first
    if (currentUser?.Latitude && currentUser?.Longitude) {
      setCustomerLat(currentUser.Latitude);
      setCustomerLng(currentUser.Longitude);
      if (currentUser.Address) {
        setCustomerAddress(currentUser.Address);
      }
    }

    // Try fetching real phone GPS automatically
    getRealCurrentLocation(6000)
      .then((geo) => {
        if (!isMounted) return;
        setCustomerLat(geo.latitude);
        setCustomerLng(geo.longitude);
        handleReverseGeocode(geo.latitude, geo.longitude);

        // Sync to user profile on server if logged in
        if (currentUser?.UserID) {
          fetch(`/api/users/${currentUser.UserID}/location`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: geo.latitude,
              longitude: geo.longitude
            })
          }).catch(console.error);
        }
      })
      .catch((err) => {
        console.warn("Auto GPS initial fetch (can be ignored in preview):", err.message);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.UserID]);

  // Function to use real GPS location with full loading indicator and accuracy
  const handleUseGPS = async () => {
    setIsLoadingGPS(true);
    onShowToast("🛰️ กำลังค้นหาตำแหน่งปัจจุบันจากสัญญาณ GPS ในโทรศัพท์ของคุณ...", "info");
    try {
      const geo = await getRealCurrentLocation(10000);
      setCustomerLat(geo.latitude);
      setCustomerLng(geo.longitude);
      handleReverseGeocode(geo.latitude, geo.longitude);

      if (currentUser?.UserID) {
        fetch(`/api/users/${currentUser.UserID}/location`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: geo.latitude,
            longitude: geo.longitude
          })
        }).catch(console.error);
      }

      onShowToast("✅ อัปเดตและปักหมุดตำแหน่งปัจจุบันจาก GPS สำเร็จแล้ว", "success");
    } catch (error: any) {
      console.warn("Geolocation error:", error);
      onShowToast(error.message || "⚠️ ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาอนุญาตสิทธิ์การเข้าถึงตำแหน่งหรือคลิกปักหมุดบนแผนที่", "error");
    } finally {
      setIsLoadingGPS(false);
    }
  };

  // Set up polling for active booking status updates & notifications & live staff status
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStaff();
      if (currentUser) {
        fetchActiveBooking();
        fetchNotifications();
        // Hit match updates logic on server to advance offer queues
        fetch('/api/bookings/match-updates').then(() => {}).catch(() => {});
      }
    }, 4000); // Poll every 4 seconds

    return () => clearInterval(interval);
  }, [currentUser, activeBooking?.Status]);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data.filter((s: Service) => s.Active === 'ON'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      setAllStaff(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications/${currentUser.UserID}`);
      const data = await res.json();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveBooking = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/bookings');
      const bookings = await res.json();
      // Get the latest pending/active booking for this customer
      const customerBookings = bookings.filter((b: any) => 
        b.CustomerID === currentUser.UserID && 
        b.Status !== 'Completed' && 
        b.Status !== 'Cancel' &&
        b.Status !== 'Cancelled'
      );
      
      const latest = customerBookings[customerBookings.length - 1] || null;
      
      const allHistory = bookings.filter((b: any) => 
        b.CustomerID === currentUser.UserID && 
        (b.Status === 'Completed' || b.Status === 'Cancel' || b.Status === 'Cancelled')
      ).sort((a: any, b: any) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
      
      setHistoryBookings(allHistory);
      
      // If booking was completed/cancelled compared to previous state, alert user
      if (activeBooking && !latest) {
        // Find if latest completed booking exists
        const lastFinished = bookings.filter((b: any) => 
          b.CustomerID === currentUser.UserID && 
          b.BookingID === activeBooking.BookingID
        )[0];
        
        if (lastFinished) {
          if (lastFinished.Status === 'Completed') {
            onShowToast("💆 การจองบริการนวดเสร็จสมบูรณ์เรียบร้อยแล้วค่ะ!", "success");
            setBookingToReview(lastFinished);
            setShowReviewModal(true);
            if (onPlayNotificationSound) onPlayNotificationSound();
          } else if (lastFinished.Status === 'Cancel' || lastFinished.Status === 'Cancelled') {
            onShowToast("⚠️ การจองนวดของคุณถูกยกเลิกแล้ว", "info");
          }
        }
      }
      
      // Sound alert on status change
      if (latest && activeBooking && latest.Status !== activeBooking.Status) {
        if (latest.Status === 'Accepted') {
          onShowToast(`🟢 พี่ ${latest.StaffNickname} รับงานนวดของคุณแล้ว!`, "success");
        } else if (latest.Status === 'Working') {
          onShowToast("🛵 พนักงานเริ่มงานนวดหรือกำลังเดินทางมายังบ้านของคุณ", "info");
        }
        if (onPlayNotificationSound) onPlayNotificationSound();
      }

      setActiveBooking(latest);
    } catch (e) {
      console.error(e);
    }
  };

  // Obtain coordinates using Web Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      onShowToast("เบราว์เซอร์ของคุณไม่สนับสนุน Geolocation API", "error");
      return;
    }

    setIsLoadingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerLat(position.coords.latitude);
        setCustomerLng(position.coords.longitude);
        handleReverseGeocode(position.coords.latitude, position.coords.longitude);
        setIsLoadingGPS(false);
        onShowToast("อัปเดตตำแหน่งของคุณจาก GPS แล้ว", "success");
      },
      (error) => {
        setIsLoadingGPS(false);
        onShowToast("ไม่สามารถเข้าถึงตำแหน่ง GPS ได้ชั่วคราว", "error");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Submit Booking reservation
  const handleConfirmBooking = async () => {
    if (!currentUser) {
      onShowToast("กรุณาเข้าสู่ระบบก่อนทำการจองบริการนวด", "error");
      return;
    }
    if (!selectedService) {
      onShowToast("กรุณาเลือกบริการนวดที่ท่านต้องการก่อนค่ะ", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: currentUser.UserID,
          serviceId: selectedService.ServiceID,
          customerAddress: customerAddressDetail ? `${customerAddress} (รายละเอียดเพิ่มเติม: ${customerAddressDetail})` : customerAddress,
          customerLatitude: customerLat,
          customerLongitude: customerLng,
          preferredStaffId: selectedStaffForBooking?.StaffID || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "จองบริการนวดล้มเหลว");
      }

      onShowToast("ส่งคำขอจองบริการนวดสำเร็จ! กำลังติดต่อค้นหาพนักงานที่อยู่ใกล้ที่สุด...", "success");
      setActiveBooking(data.booking);
      setActiveTab('booking');
      setSelectedStaffProfile(null); // Close the staff profile modal/overlay
      setSelectedStaffForBooking(null); // Reset selection
      fetchStaff(); // refresh locations
      setTimeout(() => {
        const root = document.getElementById('customer-view-root');
        if (root) {
          root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (e: any) {
      onShowToast(e.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Review rating feedback
  const handleSubmitReview = async () => {
    if (!bookingToReview) return;
    
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingToReview.BookingID,
          customerId: bookingToReview.CustomerID,
          staffId: bookingToReview.StaffID,
          score: reviewScore,
          comment: reviewComment
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      onShowToast("ขอบคุณสําหรับการให้คะแนนรีวิวค่ะ! ความเห็นของคุณช่วยเพิ่มคุณภาพการให้บริการอย่างดีเยี่ยม", "success");
      setShowReviewModal(false);
      setBookingToReview(null);
      setReviewComment("");
      setReviewScore(5);
      fetchStaff(); // update ratings
      fetchActiveBooking(); // refresh history with review info
    } catch (e: any) {
      onShowToast(e.message, "error");
    }
  };

  // Find eligible online staff within search radius (configured by admin), sorted by distance
  const maxSearchRadius = settings.searchRadius && settings.searchRadius > 0 ? settings.searchRadius : 15;
  const minCreditRequirement = Math.max(settings.minCredit || 398, 398);
  const activeOnlineStaff = allStaff
    .filter((s) => s.Available === 'ON' && s.VerifyStatus !== 'Reject' && (s.Credit ?? 0) >= minCreditRequirement)
    .map((s) => {
      const staffLat = typeof s.CurrentLatitude === 'number' ? s.CurrentLatitude : 9.138244;
      const staffLng = typeof s.CurrentLongitude === 'number' ? s.CurrentLongitude : 99.321748;
      const distance = calculateDistance(customerLat, customerLng, staffLat, staffLng);
      return {
        ...s,
        CurrentLatitude: staffLat,
        CurrentLongitude: staffLng,
        distance,
        isWithinRadius: distance <= maxSearchRadius
      };
    })
    .filter((s) => s.distance <= maxSearchRadius)
    .sort((a, b) => a.distance - b.distance);

  // Filter and sort staff for mobile view
  const filteredOnlineStaff = activeOnlineStaff
    .filter((s) => {
      if (genderFilter !== 'All' && s.Gender !== genderFilter) return false;
      if (searchStaff.trim()) {
        const query = searchStaff.toLowerCase();
        const nicknameMatch = (s.Nickname || '').toLowerCase().includes(query);
        const descMatch = (s.Description || '').toLowerCase().includes(query);
        if (!nicknameMatch && !descMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.Rating || 0) - (a.Rating || 0);
      if (sortBy === 'experience') return (b.Experience || 0) - (a.Experience || 0);
      return a.distance - b.distance;
    });

  return (
    <div className="space-y-4 max-w-md sm:max-w-lg mx-auto pb-28" id="customer-view-root">
      {/* Mobile Top Status Bar & Quick GPS */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black text-slate-800">พร้อมให้บริการ</span>
          <span className="text-[10px] text-sky-700 bg-sky-50 font-black px-2 py-0.5 rounded-full border border-sky-100">
            {activeOnlineStaff.length} หมอนวดออนไลน์
          </span>
        </div>

        {/* Quick GPS Refresh Button */}
        <button
          type="button"
          onClick={handleUseGPS}
          disabled={isLoadingGPS}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
          title="ค้นหาตำแหน่งปัจจุบันผ่าน GPS"
        >
          <Compass className={`w-3.5 h-3.5 text-sky-500 ${isLoadingGPS ? 'animate-spin' : ''}`} />
          <span>{isLoadingGPS ? 'ค้นหา...' : 'อัปเดต GPS'}</span>
        </button>
      </div>

      {/* Booking Progress Tracker / Active Booking State Card */}
      {activeTab === 'booking' && activeBooking && (
        <div className="bg-white border border-slate-200 text-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full">
              ติดตามสถานะงานนวดสด
            </span>
            <span className="text-xs font-mono text-slate-400">#ID: {activeBooking.BookingID}</span>
          </div>

          <h3 className="text-lg font-bold mt-4 text-slate-900">
            {activeBooking.Status === 'Waiting' && '⏳ กำลังค้นหาพนักงานนวดนวดใกล้เคียง...'}
            {activeBooking.Status === 'Accepted' && '🛵 หมอนวดตอบรับแล้ว กำลังเตรียมตัวเดินทาง...'}
            {activeBooking.Status === 'Working' && '💆 พนักงานมาถึงแล้ว กำลังเริ่มนวดให้บริการ...'}
            {activeBooking.Status === 'Completed' && '🎉 การให้บริการเสร็จสิ้น ขอบคุณค่ะ'}
          </h3>

          {/* Map showing route */}
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <InteractiveMap 
              customerLat={customerLat}
              customerLng={customerLng}
              staffPins={activeOnlineStaff}
              activeBooking={{
                status: activeBooking.Status,
                staffLat: activeBooking.StaffID !== 'none' 
                  ? allStaff.find(s => s.StaffID === activeBooking.StaffID)?.CurrentLatitude 
                  : undefined,
                staffLng: activeBooking.StaffID !== 'none' 
                  ? allStaff.find(s => s.StaffID === activeBooking.StaffID)?.CurrentLongitude 
                  : undefined
              }}
              height="h-[200px]"
              searchRadius={maxSearchRadius}
            />
          </div>

          {/* Stepper Progress Visualizer */}
          <div className="mt-6 grid grid-cols-4 gap-1 relative text-center">
            <div className="absolute top-1.5 left-6 right-6 h-[2px] bg-slate-200 z-0" />
            <div 
              className="absolute top-1.5 left-6 h-[2px] bg-sky-500 z-0 transition-all duration-700" 
              style={{
                width: activeBooking.Status === 'Waiting' ? '12%' : 
                       activeBooking.Status === 'Accepted' ? '38%' : 
                       activeBooking.Status === 'Working' ? '75%' : '100%'
              }}
            />

            <div className="z-10 flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeBooking.Status === 'Waiting' ? 'bg-amber-500 text-white animate-pulse' : 'bg-sky-500 text-white'
              }`}>1</div>
              <span className="text-[10px] font-bold text-slate-500 mt-1">จองบริการ</span>
            </div>
            
            <div className="z-10 flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeBooking.Status === 'Waiting' ? 'bg-slate-200 text-slate-500' :
                activeBooking.Status === 'Accepted' ? 'bg-amber-500 text-white animate-pulse' : 'bg-sky-500 text-white'
              }`}>2</div>
              <span className="text-[10px] font-bold text-slate-500 mt-1">รับงาน</span>
            </div>

            <div className="z-10 flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                (activeBooking.Status === 'Waiting' || activeBooking.Status === 'Accepted') ? 'bg-slate-200 text-slate-500' :
                activeBooking.Status === 'Working' ? 'bg-amber-500 text-white animate-pulse' : 'bg-sky-500 text-white'
              }`}>3</div>
              <span className="text-[10px] font-bold text-slate-500 mt-1">เดินทาง/นวด</span>
            </div>

            <div className="z-10 flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeBooking.Status !== 'Completed' ? 'bg-slate-200 text-slate-500' : 'bg-sky-500 text-white'
              }`}>4</div>
              <span className="text-[10px] font-bold text-slate-500 mt-1">เสร็จงาน</span>
            </div>
          </div>

          {/* Assigned Staff Mini Card */}
          {activeBooking.StaffID !== 'none' && (
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={activeBooking.StaffProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeBooking.StaffNickname || 'พนักงาน')}&background=0D9488&color=fff&size=150`} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-sky-500" 
                  alt="Staff" 
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-sm">พี่{activeBooking.StaffNickname}</span>
                    <span className="bg-sky-100 text-sky-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded">มืออาชีพ</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">เบอร์ติดต่อ: {activeBooking.StaffPhone}</p>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-slate-500 text-xs">ยอดรวมบริการ</span>
                <p className="text-base font-extrabold text-sky-600">฿{activeBooking.TotalPrice}</p>
              </div>
            </div>
          )}

          {/* Cancel button if waiting or accepted */}
          {(activeBooking.Status === 'Waiting' || activeBooking.Status === 'Accepted') && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  const isAccepted = activeBooking.Status === 'Accepted';
                  const msg = isAccepted 
                    ? "พนักงานได้รับงานและกำลังเตรียมตัว หากยกเลิกตอนนี้ คำขอคืนเครดิตของพนักงานจะถูกส่งให้แอดมินยืนยัน คุณแน่ใจหรือไม่ว่าต้องการยกเลิก?"
                    : "คุณต้องการยกเลิกการจองนวดนี้ใช่หรือไม่?";
                  if (!window.confirm(msg)) return;

                  try {
                    await fetch(`/api/bookings/${activeBooking.BookingID}/action`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        action: 'cancel',
                        reason: 'ลูกค้ายกเลิกรายการจอง'
                      })
                    });
                    onShowToast("ยกเลิกรายการเรียกนวดเรียบร้อยแล้ว", "info");
                    setActiveBooking(null);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold py-2.5 rounded-xl border border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>❌ ยกเลิกการจองนวดนี้</span>
                {activeBooking.Status === 'Accepted' && (
                  <span className="text-[10px] text-rose-500 font-normal">(พนักงานรับงานแล้ว)</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Booking empty state */}
      {activeTab === 'booking' && !activeBooking && (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">ยังไม่มีรายการจอง</h3>
          <p className="text-xs text-slate-500 mb-6">คุณยังไม่ได้ทำการจองนวดในขณะนี้</p>
          <button
            onClick={() => setActiveTab('home')}
            className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-colors"
          >
            ไปที่หน้าจองนวด
          </button>
        </div>
      )}

      {/* Main Reservation panel when NO booking is active */}
      {activeTab === 'home' && (
        <div className="space-y-4 animate-fade-in">
          {/* Quick GPS Location Bar & Address Search */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <span className="text-xs text-slate-700 font-bold block">
                    จุดให้บริการของคุณ (ค้นหาในรัศมี {maxSearchRadius} กม.)
                  </span>
                </div>
              </div>

              {/* Toggle Live Map Button */}
              <button
                type="button"
                onClick={() => setShowLiveMap(!showLiveMap)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                  showLiveMap 
                    ? 'bg-sky-50 text-sky-700 border-sky-200' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {showLiveMap ? <EyeOff className="w-3.5 h-3.5 text-sky-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                <span>{showLiveMap ? 'ซ่อนแผนที่' : 'ดูแผนที่สด'}</span>
              </button>
            </div>

            {/* Collapsible Interactive Map */}
            {showLiveMap && (
              <div className="pt-2 rounded-2xl overflow-hidden border border-slate-100">
                <InteractiveMap 
                  customerLat={customerLat}
                  customerLng={customerLng}
                  staffPins={activeOnlineStaff.map((s) => ({
                    id: s.StaffID,
                    nickname: s.Nickname || 'หมอนวด',
                    lat: s.CurrentLatitude || 9.1382,
                    lng: s.CurrentLongitude || 99.3217,
                    available: s.Available,
                    status: s.VerifyStatus
                  }))}
                  searchRadius={maxSearchRadius}
                  height="h-[220px]"
                  onLocationChange={(lat, lng) => {
                    setCustomerLat(lat);
                    setCustomerLng(lng);
                  }}
                />
              </div>
            )}
          </div>

          {/* Available Massage Therapists Header & Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                  <span>👩‍⚕️</span>
                  <span>หมอนวดใกล้ฉัน</span>
                  <span className="text-xs font-bold text-sky-600">({filteredOnlineStaff.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">พร้อมเดินทางให้บริการถึงบ้านทันที</p>
              </div>
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={searchStaff}
                onChange={(e) => setSearchStaff(e.target.value)}
                placeholder="ค้นหาชื่อเล่นหมอนวด หรือ อาการนวด..."
                className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              {searchStaff && (
                <button
                  type="button"
                  onClick={() => setSearchStaff('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Gender and Sort Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setGenderFilter('All')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all ${
                  genderFilter === 'All' 
                    ? 'bg-sky-600 text-white shadow-2xs' 
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                ทั้งหมด ({activeOnlineStaff.length})
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('Female')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all ${
                  genderFilter === 'Female' 
                    ? 'bg-pink-600 text-white shadow-2xs' 
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                👩 หมอนวดหญิง
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('Male')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all ${
                  genderFilter === 'Male' 
                    ? 'bg-blue-600 text-white shadow-2xs' 
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                👨 หมอนวดชาย
              </button>
              <button
                type="button"
                onClick={() => setSortBy(sortBy === 'rating' ? 'distance' : 'rating')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
                  sortBy === 'rating' 
                    ? 'bg-amber-500 text-white shadow-2xs' 
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>คะแนนสูงสุด</span>
              </button>
            </div>

            {/* Mobile Therapist Cards List */}
            <div className="space-y-3">
              {filteredOnlineStaff.length === 0 ? (
                <div className="bg-white rounded-3xl p-6 text-center border border-slate-100 shadow-2xs">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 mt-2">ไม่พบหมอนวดออนไลน์ตามเงื่อนไขในระยะ {maxSearchRadius} กม.</p>
                  <p className="text-[11px] text-slate-400 mt-1">ลองเปลี่ยนตัวกรอง หรือขยายพิกัดค้นหาดูนะคะ</p>
                </div>
              ) : (
                filteredOnlineStaff.map((staff) => (
                  <div 
                    key={staff.StaffID}
                    onClick={async () => {
                      setSelectedStaffProfile(staff);
                      setSelectedStaffForBooking(staff);
                      try {
                        const res = await fetch(`/api/staff/${staff.StaffID}/reviews`);
                        const data = await res.json();
                        setSelectedStaffReviews(data);
                      } catch (e) {
                        console.error('Failed to fetch reviews', e);
                      }
                    }}
                    className="border border-slate-200/80 hover:border-sky-500 rounded-3xl p-4 bg-white shadow-2xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99] duration-150 relative overflow-hidden text-left"
                  >
                    <div className="flex gap-3.5 items-start">
                      {/* Avatar with status and tag */}
                      <div className="relative shrink-0">
                        <img 
                          src={staff.ProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.Nickname || 'พนักงาน')}&background=0D9488&color=fff&size=400`} 
                          className="w-20 h-24 rounded-2xl object-cover border border-slate-100 shadow-sm"
                          alt={staff.Nickname} 
                        />
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                        </span>
                        <div className="absolute bottom-1 left-1 bg-slate-900/80 backdrop-blur-xs text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                          <span>พร้อมรับ</span>
                        </div>
                      </div>

                      {/* Info Section */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <h4 className="font-black text-slate-900 text-base truncate group-hover:text-sky-600 transition-colors">
                              พี่{staff.Nickname}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold">ผู้ผ่านการตรวจสอบใบอนุญาต</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center text-amber-700 font-black text-[11px] bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-lg shadow-2xs">
                              <Star className="w-3 h-3 fill-current mr-0.5 text-amber-500" />
                              <span>{staff.Rating}</span>
                            </div>
                            <div className="flex items-center text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-lg font-bold">
                              <MapPin className="w-2.5 h-2.5 mr-0.5 text-sky-500" />
                              <span>{formatDistance(staff.distance)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {staff.Gender === 'Female' ? '👩 หญิง' : '👨 ชาย'}
                          </span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            อายุ {staff.Age} ปี
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Award className="w-2.5 h-2.5 text-emerald-600" />
                            ปสก. {staff.Experience} ปี
                          </span>
                        </div>

                        {/* Quote */}
                        {staff.Description && (
                          <p className="mt-1.5 text-[10.5px] text-slate-500 font-medium line-clamp-1 leading-snug">
                            "{staff.Description}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom CTA Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStaffProfile(staff);
                        setSelectedStaffForBooking(staff);
                      }}
                      className="w-full mt-3 text-xs font-black text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-md py-2.5 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <span>ดูโปรไฟล์ & จองบริการ</span>
                      <ChevronRight className="w-4 h-4 opacity-80" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Full Staff Profile Detail & Booking Checkout Modal */}
      {selectedStaffProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-lg w-full max-h-[92vh] sm:max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up">
            {/* Mobile Sheet Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300/80 rounded-full mx-auto my-2.5 sm:hidden" />
            
            {/* Header profile banner */}
            <div className="relative h-32 bg-slate-100">
              <button 
                onClick={() => setSelectedStaffProfile(null)}
                className="absolute top-4 right-4 bg-slate-950/60 hover:bg-slate-950/80 text-white p-1.5 rounded-full z-10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-40" />
              <img 
                src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=500&auto=format&fit=crop&q=60" 
                className="w-full h-full object-cover" 
                alt="Banner" 
              />
            </div>

            {/* Profile Avatar & Quick info */}
            <div className="px-6 pb-6 relative">
              <div className="flex justify-between items-end -mt-10 mb-4">
                <img 
                  src={selectedStaffProfile.ProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStaffProfile.Nickname || 'พนักงาน')}&background=0D9488&color=fff&size=150`} 
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-white relative z-10" 
                  alt="Avatar" 
                />
                <div className="flex gap-1.5">
                  <span className="bg-sky-50 text-sky-800 border border-sky-100 text-[10px] font-extrabold px-3 py-1 rounded-full">
                    ผ่านการตรวจสอบ
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">พี่{selectedStaffProfile.Nickname}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-slate-500">
                    <span>เพศ: {selectedStaffProfile.Gender === 'Female' ? 'หญิง' : 'ชาย'}</span>
                    <span>•</span>
                    <span>อายุ: {selectedStaffProfile.Age} ปี</span>
                    <span>•</span>
                    <span>ประสบการณ์: {selectedStaffProfile.Experience} ปี</span>
                  </div>
                </div>

                {/* Rating Stats block */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">คะแนนสะสม</span>
                    <div className="flex items-center justify-center text-amber-500 font-extrabold text-sm mt-0.5">
                      <Star className="w-4 h-4 fill-current mr-0.5" />
                      <span>{selectedStaffProfile.Rating}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">รีวิวรวม</span>
                    <span className="text-sm font-extrabold text-slate-700 block mt-0.5">{selectedStaffProfile.ReviewCount} ครั้ง</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">งานสำเร็จ</span>
                    <span className="text-sm font-extrabold text-slate-700 block mt-0.5">{selectedStaffProfile.TotalJobs || 0} งาน</span>
                  </div>
                </div>

                {/* Description Bio */}
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">คำอธิบายประวัติพนักงาน</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {selectedStaffProfile.Description || 'พนักงานนวดผู้ผ่านใบอนุญาต นวดแก้อาการและนวดอโรมาผ่อนคลาย ยินดีดูแลคุณลูกค้าถึงบ้านค่ะ'}
                  </p>
                </div>

                {/* Staff Photos Gallery (Portfolio) */}
                {selectedStaffProfile.Photos && Array.isArray(selectedStaffProfile.Photos) && selectedStaffProfile.Photos.length > 0 && (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                      คลังรูปภาพและผลงาน ({selectedStaffProfile.Photos.length} รูป)
                    </h4>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {selectedStaffProfile.Photos.map((photo: string, pIdx: number) => (
                        <div 
                          key={pIdx} 
                          onClick={() => setFullSizePhoto(photo)}
                          className="aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer group"
                        >
                          <img src={photo} alt={`ผลงาน ${pIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Credentials list */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <CheckCircle className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>มีใบประกาศรับรองนวดแผนไทยกระทรวงสาธารณสุข</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <CheckCircle className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>ประวัติการเติมเครดิตและพฤติกรรมยอดเยี่ยม</span>
                  </div>
                </div>
                
                {/* Reviews Section */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">รีวิวจากลูกค้า ({selectedStaffProfile.ReviewCount})</h4>
                  {selectedStaffReviews.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">ยังไม่มีรีวิว</p>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                      {selectedStaffReviews.map(r => (
                        <div key={r.ReviewID} className="bg-slate-50 p-3 rounded-xl">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-slate-600">{r.CustomerName}</span>
                            <div className="flex items-center text-amber-500">
                              <Star className="w-3 h-3 fill-current mr-0.5" />
                              <span className="text-[10px] font-bold">{r.Score}</span>
                            </div>
                          </div>
                          {r.Comment && <p className="text-xs text-slate-500 mt-1">"{r.Comment}"</p>}
                          <span className="text-[9px] text-slate-400 block mt-2">
                            {new Date(r.CreatedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CHOOSE SERVICE SECTION INSIDE PROFILE */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-white bg-sky-500 w-5 h-5 rounded-full flex items-center justify-center">1</span>
                    <h4 className="text-sm font-black text-slate-800">เลือกรายการบริการนวดที่ต้องการ</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    {services
                      .filter((s) => !selectedStaffProfile.OfferedServices || selectedStaffProfile.OfferedServices.includes(s.ServiceID))
                      .map((service) => {
                      const isSelected = selectedService?.ServiceID === service.ServiceID;
                      const hasSufficientCredit = selectedStaffProfile.Credit >= service.CreditRequired;

                      return (
                        <div
                          key={service.ServiceID}
                          onClick={() => {
                            if (!hasSufficientCredit) {
                              onShowToast(`พี่ ${selectedStaffProfile.Nickname} มีเครดิตไม่เพียงพอสำหรับบริการนี้`, "error");
                              return;
                            }
                            setSelectedService(service);
                          }}
                          className={`border p-3.5 rounded-2xl cursor-pointer transition-all duration-200 flex items-start justify-between relative overflow-hidden group ${
                            isSelected 
                              ? 'border-sky-500 bg-sky-50/40 ring-1 ring-sky-500/10' 
                              : !hasSufficientCredit
                                ? 'border-slate-100 bg-slate-50/50 opacity-50 cursor-not-allowed'
                                : 'border-slate-100 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1 max-w-[75%]">
                            <span className="text-[9px] font-extrabold uppercase tracking-wide bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                              {service.Duration} นาที
                            </span>
                            <h4 className="font-bold text-slate-800 text-xs mt-1.5">{service.ServiceName}</h4>
                            <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">{service.Detail}</p>
                          </div>

                          <div className="text-right flex flex-col justify-between h-full min-h-[45px] shrink-0">
                            <span className="text-base font-black text-sky-600">฿{service.Price}</span>
                            {!hasSufficientCredit && (
                              <span className="text-[8px] bg-red-50 text-red-600 font-extrabold p-0.5 rounded text-center mt-1">
                                เครดิตพี่นวดไม่พอ
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ADDRESS & MAP SECTION INSIDE PROFILE */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-white bg-sky-500 w-5 h-5 rounded-full flex items-center justify-center">2</span>
                      <h4 className="text-sm font-black text-slate-800">ระบุตำแหน่งสถานที่นวดของคุณ</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      พิกัด: {customerLat.toFixed(4)}, {customerLng.toFixed(4)}
                    </span>
                  </div>

                  {/* PROMINENT LARGE CURRENT LOCATION (GPS) BUTTON */}
                  <button
                    type="button"
                    onClick={handleUseGPS}
                    disabled={isLoadingGPS}
                    className={`w-full py-4 px-4 rounded-2xl font-bold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2.5 cursor-pointer border ${
                      isLoadingGPS 
                        ? 'bg-sky-100 text-sky-800 border-sky-300 animate-pulse cursor-wait' 
                        : 'bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-transparent hover:shadow-lg active:scale-[0.99]'
                    }`}
                  >
                    <Compass className={`w-5 h-5 ${isLoadingGPS ? 'animate-spin' : ''}`} />
                    <span className="text-[15px] font-black tracking-wide">
                      {isLoadingGPS ? 'กำลังค้นหาสัญญาณดาวเทียม GPS...' : '📍 ใช้ตำแหน่งปัจจุบันของฉัน (GPS)'}
                    </span>
                  </button>
                  {/* Search box on Map */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={addressSearchQuery}
                        onChange={(e) => {
                          setAddressSearchQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                        placeholder="ค้นหาสถานที่บนแผนที่ เช่น สยามพารากอน, ซอยสุขุมวิท 21..."
                        className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                      <button
                        onClick={handleSearchAddress}
                        disabled={isSearchingAddress}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-colors shrink-0"
                      >
                        {isSearchingAddress ? 'ค้นหา...' : '🔍 ค้นหา'}
                      </button>
                    </div>
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {addressSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                          >
                            <div className="font-semibold">{suggestion.display_name.split(',')[0]}</div>
                            <div className="text-[10px] text-slate-500 truncate">{suggestion.display_name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Interactive map visualization */}
                  <div className="space-y-2">
                    <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                      <InteractiveMap 
                        customerLat={customerLat}
                        customerLng={customerLng}
                        staffPins={[selectedStaffProfile]}
                        height="h-[250px]"
                        onLocationChange={handleMapLocationChange}
                        onUseGPS={handleUseGPS}
                        isLoadingGPS={isLoadingGPS}
                        searchRadius={maxSearchRadius}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold text-center">
                      👆 คุณสามารถแตะและเลื่อนบนแผนที่เพื่อเลือกตำแหน่งรับบริการได้แม่นยำขึ้น
                    </p>
                  </div>

                  {/* Address Editable Box */}
                  <div className="space-y-2 mt-3">
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="ระบุที่อยู่จัดส่ง แขวง เขต..."
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 min-h-[55px]"
                    />
                    <input
                      type="text"
                      value={customerAddressDetail}
                      onChange={(e) => setCustomerAddressDetail(e.target.value)}
                      placeholder="พิมพ์ที่อยู่เพิ่มเติม (ไม่บังคับ) เช่น ชั้น, ห้อง, ตึก..."
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* BOOKING DETAILS & CONFIRMATION ACTION */}
                {selectedService && (
                  <div className="border-t border-slate-100 pt-5 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-white bg-sky-500 w-5 h-5 rounded-full flex items-center justify-center">3</span>
                      <h4 className="text-sm font-black text-slate-800">สรุปยอดสุทธิและส่งคำขอจอง</h4>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5 text-xs text-slate-600">
                      <div className="flex justify-between font-medium">
                        <span>ค่าบริการนวด ({selectedService.ServiceName})</span>
                        <span className="font-bold text-slate-800">฿{selectedService.Price}</span>
                      </div>
                      
                      {(() => {
                        const distance = calculateDistance(
                          customerLat, 
                          customerLng, 
                          typeof selectedStaffProfile.CurrentLatitude === 'number' ? selectedStaffProfile.CurrentLatitude : 9.138244, 
                          typeof selectedStaffProfile.CurrentLongitude === 'number' ? selectedStaffProfile.CurrentLongitude : 99.321748
                        );
                        const { fee: travelFee, description: feeFormulaText } = calculateTravelFee(
                          distance,
                          settings.travelFeePerKm,
                          settings.travelFeeTiers
                        );
                        const totalPayment = selectedService.Price + travelFee;

                        return (
                          <>
                            <div className="flex justify-between font-medium">
                              <span>ค่าเดินทางจัดส่ง ({formatDistance(distance)})</span>
                              <span className="font-bold text-slate-800">฿{travelFee.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-200/60 my-2 pt-2.5 flex justify-between text-sm font-black text-slate-900">
                              <span className="text-sky-700">ยอดชำระสุทธิทั้งหมด</span>
                              <span className="text-sky-600 font-black text-base">฿{totalPayment.toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                              * {feeFormulaText} จากตำแหน่ง พี่{selectedStaffProfile.Nickname} ณ ปัจจุบัน จนถึงสถานที่ของคุณ
                            </p>
                          </>
                        );
                      })()}
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleConfirmBooking}
                      disabled={isLoading}
                      className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-sm py-4 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      {isLoading 
                        ? 'กำลังจองบริการและส่งงานนวด...' 
                        : `ยืนยันเรียก พี่${selectedStaffProfile.Nickname} มานวดให้คุณ`
                      }
                    </button>
                  </div>
                )}

                {/* Close Button at bottom */}
                <button
                  onClick={() => setSelectedStaffProfile(null)}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold py-3.5 rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  ย้อนกลับไปหน้าก่อนหน้า
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Review & Feedback Rating Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scale-up text-center space-y-6">
            <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8 text-sky-500" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">ให้คะแนนความพึงพอใจการนวด</h3>
              <p className="text-xs text-slate-500">กรุณาให้เรตติ้งเพื่อเป็นขวัญกำลังใจในการพัฒนาบริการของพี่หมอนวด</p>
            </div>

            {/* Stars Selector */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewScore(star)}
                  className="p-1 focus:outline-none transition-transform active:scale-125 cursor-pointer"
                >
                  <Star className={`w-10 h-10 ${
                    star <= reviewScore ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                  }`} />
                </button>
              ))}
            </div>

            {/* Comments Form */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ความคิดเห็นเพิ่มเติม</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="เขียนความพึงพอใจของคุณ เช่น นวดดีแก้อาการตรงจุด มารยาทเรียบร้อยดีมาก..."
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setBookingToReview(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-2xl text-xs transition-colors cursor-pointer"
              >
                ข้ามการประเมิน
              </button>
              <button
                onClick={handleSubmitReview}
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-3.5 rounded-2xl text-xs shadow-md transition-colors cursor-pointer"
              >
                ส่งคะแนนประเมิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History view */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-800">ประวัติการจอง</h2>
          
          {historyBookings.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
              <span className="text-3xl mb-3 block">🕰️</span>
              <p className="text-sm font-bold text-slate-500">ยังไม่มีประวัติการจอง</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyBookings.map((b, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400">#ID: {b.BookingID}</span>
                      <h4 className="font-bold text-slate-800">{b.ServiceName}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      b.Status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {b.Status === 'Completed' ? 'สำเร็จ' : 'ยกเลิก'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <p>วันที่: {b.BookingDate} เวลา {b.BookingTime}</p>
                    {b.StaffID !== 'none' && (
                      <p>พนักงาน: พี่{b.StaffNickname}</p>
                    )}
                    <p className="font-semibold text-sky-600 mt-2">ยอดรวม: ฿{b.TotalPrice}</p>
                  </div>
                  
                  {b.CancellationReason && (
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-[10px] text-rose-600 font-medium">
                      หมายเหตุ: {b.CancellationReason}
                    </div>
                  )}

                  {/* Review Section for Completed Bookings */}
                  {b.Status === 'Completed' && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {b.ReviewScore ? (
                        <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-amber-800">⭐ คะแนนรีวิวที่คุณให้</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star 
                                  key={s} 
                                  className={`w-3.5 h-3.5 ${
                                    s <= b.ReviewScore ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                  }`} 
                                />
                              ))}
                              <span className="text-xs font-bold text-amber-900 ml-1">({b.ReviewScore}/5)</span>
                            </div>
                          </div>
                          {b.ReviewComment && (
                            <p className="text-xs text-slate-600 italic">"{b.ReviewComment}"</p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setBookingToReview(b);
                            setReviewScore(5);
                            setReviewComment("");
                            setShowReviewModal(true);
                          }}
                          className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span>ให้คะแนนและเขียนรีวิวบริการนี้</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile view */}
      {activeTab === 'profile' && currentUser && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-800">โปรไฟล์ของคุณ</h2>
            {!isEditingProfile && (
              <button 
                onClick={startEditProfile}
                className="text-sky-500 hover:text-sky-600 text-xs font-bold px-3 py-1.5 bg-sky-50 rounded-lg transition-colors"
              >
                แก้ไขโปรไฟล์
              </button>
            )}
          </div>
          
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col items-center">
            
            {isEditingProfile ? (
              <div className="w-full space-y-5">
                

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">ชื่อ-นามสกุล</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">เบอร์โทรศัพท์</label>
                  <input 
                    type="tel" 
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    disabled={isSavingProfile}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold py-3.5 rounded-xl shadow-md transition-colors disabled:opacity-50"
                  >
                    {isSavingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-3xl font-black shadow-sm mb-4">{currentUser.Name ? currentUser.Name[0] : "ล"}</div>
                <h3 className="text-xl font-black text-slate-900">{currentUser.Name}</h3>
                <span className="bg-sky-100 text-sky-700 text-xs font-bold px-3 py-1 rounded-full mt-2">ลูกค้าสมาชิก</span>
                
                <div className="w-full mt-8 space-y-4">
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-sky-500" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">เบอร์ติดต่อ</span>
                      <span className="text-sm font-bold text-slate-700">{currentUser.Phone}</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3.5 rounded-xl transition-colors"
                >
                  ออกจากระบบ
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* FULL SIZE PHOTO LIGHTBOX MODAL */}
      {fullSizePhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setFullSizePhoto(null)}
        >
          <div className="relative w-full max-w-5xl h-full max-h-screen flex items-center justify-center">
            <button 
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors z-[110]"
              onClick={(e) => {
                e.stopPropagation();
                setFullSizePhoto(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={fullSizePhoto} 
              alt="ภาพขนาดเต็ม" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}

      {/* Floating Mobile Bottom Navigation Bar (LINE OA / Mobile Style) */}
      <MobileBottomNav 
        activeTab={activeTab} 
        onChangeTab={setActiveTab} 
        hasActiveBooking={!!activeBooking}
        lineOa={settings.lineOA}
      />

    </div>
  );
}
