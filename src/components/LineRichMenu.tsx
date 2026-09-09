import React, { useState } from 'react';
import { 
  Sparkles, MapPin, Compass, Clock, Gift, MessageCircle, 
  ChevronRight, ArrowRight, ShieldCheck, Flame, Zap
} from 'lucide-react';
import { AppSettings } from '../types';

interface LineRichMenuProps {
  settings: AppSettings;
  activeStaffCount: number;
  hasActiveBooking: boolean;
  onSelectAction: (action: 'book' | 'nearby' | 'gps' | 'tracking' | 'promo' | 'line_oa') => void;
}

export default function LineRichMenu({
  settings,
  activeStaffCount,
  hasActiveBooking,
  onSelectAction
}: LineRichMenuProps) {
  // Allow user or admin to preview different LINE templates as depicted in the uploaded guide
  // Default to Template 1 (6 blocks - 3x2)
  const [template, setTemplate] = useState<1 | 2 | 3>(1);

  const lineOaUrl = settings.lineOA?.startsWith('@') 
    ? `https://line.me/R/ti/p/${settings.lineOA}`
    : `https://line.me/R/ti/p/@sabaideemassage`;

  return (
    <div className="w-full space-y-2.5" id="line-rich-menu-section">
      {/* Header bar: LINE Official look & Template switcher */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#06C755] flex items-center justify-center text-white font-black text-[10px] shadow-xs">
            L
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
              ริชเมนูบริการด่วน
              <span className="text-[9px] font-extrabold text-[#06C755] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                LINE Rich Menu
              </span>
            </h3>
          </div>
        </div>

        {/* Template Selector Pill */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold">
          <button
            type="button"
            onClick={() => setTemplate(1)}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              template === 1 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="เทมเพลต 1 (6 ช่อง)"
          >
            6 ช่อง
          </button>
          <button
            type="button"
            onClick={() => setTemplate(3)}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              template === 3 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="เทมเพลต 3 (แบนเนอร์บน + 3 ช่อง)"
          >
            1+3 ช่อง
          </button>
          <button
            type="button"
            onClick={() => setTemplate(2)}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              template === 2 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="เทมเพลต 2 (4 ช่องใหญ่)"
          >
            4 ช่อง
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TEMPLATE 1: 6 BLOCKS (3 Columns x 2 Rows) - Sizing 800x809px per block     */}
      {/* ========================================================================= */}
      {template === 1 && (
        <div className="grid grid-cols-3 gap-2 bg-gradient-to-b from-slate-100/80 to-slate-200/50 dark:from-slate-800/60 dark:to-slate-900/80 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-fade-in">
          
          {/* Tile 1: Express Booking */}
          <button
            type="button"
            onClick={() => onSelectAction('book')}
            className="group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer overflow-hidden text-center min-h-[88px]"
          >
            <div className="absolute top-1 right-1">
              <span className="w-2 h-2 rounded-full bg-white/40 block" />
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] sm:text-xs font-black leading-tight text-white">จองนวดทันที</span>
            <span className="text-[9px] text-emerald-100 font-medium leading-none mt-0.5">เลือกบริการ</span>
          </button>

          {/* Tile 2: Nearby Staff */}
          <button
            type="button"
            onClick={() => onSelectAction('nearby')}
            className="group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer overflow-hidden text-center min-h-[88px]"
          >
            {activeStaffCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-amber-400 text-slate-900 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                {activeStaffCount} คน
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] sm:text-xs font-black leading-tight text-white">หมอนวดใกล้ฉัน</span>
            <span className="text-[9px] text-sky-100 font-medium leading-none mt-0.5">แผนที่สด</span>
          </button>

          {/* Tile 3: My Location GPS */}
          <button
            type="button"
            onClick={() => onSelectAction('gps')}
            className="group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer overflow-hidden text-center min-h-[88px]"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] sm:text-xs font-black leading-tight text-white">ปักหมุดพิกัด</span>
            <span className="text-[9px] text-indigo-100 font-medium leading-none mt-0.5">อัปเดต GPS</span>
          </button>

          {/* Tile 4: Booking Status Tracking */}
          <button
            type="button"
            onClick={() => onSelectAction('tracking')}
            className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all active:scale-95 cursor-pointer overflow-hidden text-center min-h-[88px] ${
              hasActiveBooking 
                ? 'bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md ring-2 ring-amber-300 animate-pulse'
                : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm hover:shadow-md'
            }`}
          >
            {hasActiveBooking && (
              <span className="absolute top-1.5 right-1.5 bg-white text-rose-600 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                งานสด!
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] sm:text-xs font-black leading-tight text-white">ติดตามสถานะ</span>
            <span className="text-[9px] text-amber-100 font-medium leading-none mt-0.5">เช็กงานนวด</span>
          </button>

          {/* Tile 5: Coupons & Promo */}
          <button
            type="button"
            onClick={() => onSelectAction('promo')}
            className="group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer overflow-hidden text-center min-h-[88px]"
          >
            <span className="absolute top-1.5 right-1.5 bg-yellow-300 text-slate-900 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
              {settings.couponDiscount ? `ลด ฿${settings.couponDiscount}` : 'โปรพิเศษ'}
            </span>
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] sm:text-xs font-black leading-tight text-white">คูปองส่วนลด</span>
            <span className="text-[9px] text-pink-100 font-medium leading-none mt-0.5">
              {settings.couponCode || 'SABAIDEE99'}
            </span>
          </button>

          {/* Tile 6: Official LINE OA Chat */}
          <button
            type="button"
            onClick={() => onSelectAction('line_oa')}
            className="group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-[#06C755] hover:bg-[#05b54d] text-white shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer overflow-hidden text-center min-h-[88px]"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] sm:text-xs font-black leading-tight text-white">แชท LINE OA</span>
            <span className="text-[9px] text-emerald-100 font-medium leading-none mt-0.5">
              {settings.lineOA || '@sabaideemassage'}
            </span>
          </button>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TEMPLATE 3: 1 Wide Top Banner (2400x809px) + 3 Bottom Blocks (800x809px)  */}
      {/* ========================================================================= */}
      {template === 3 && (
        <div className="space-y-2 bg-gradient-to-b from-slate-100/80 to-slate-200/50 dark:from-slate-800/60 dark:to-slate-900/80 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-fade-in">
          {/* Top Wide Banner */}
          <div 
            onClick={() => onSelectAction('book')}
            className="relative rounded-xl overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-transform flex items-center justify-between"
          >
            <div className="space-y-1 relative z-10 max-w-[70%]">
              <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white">
                <Flame className="w-3 h-3 text-amber-300" />
                <span>บริการนวดถึงบ้านตลอด 24 ชม.</span>
              </div>
              <h4 className="text-sm sm:text-base font-black leading-tight">
                จองบริการหมอนวดมืออาชีพ
              </h4>
              <p className="text-[10px] text-emerald-100 font-medium">
                ถึงที่พัก/คอนโด/โรงแรม ในพื้นที่ สุราษฎร์ธานี และใกล้เคียง
              </p>
            </div>
            <div className="relative z-10 bg-white text-emerald-700 font-black text-xs px-3 py-2 rounded-xl shadow-md flex items-center gap-1 shrink-0">
              <span>จองเลย</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            {/* Background shimmer */}
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
          </div>

          {/* Bottom 3 Blocks */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onSelectAction('nearby')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white shadow-xs hover:border-sky-500 active:scale-95 transition-all text-center min-h-[75px]"
            >
              <MapPin className="w-4 h-4 text-sky-500 mb-1" />
              <span className="text-[10px] font-bold leading-tight">หมอนวดใกล้ฉัน</span>
              <span className="text-[8px] text-slate-400 mt-0.5">{activeStaffCount} คนพร้อม</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectAction('tracking')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white shadow-xs hover:border-amber-500 active:scale-95 transition-all text-center min-h-[75px]"
            >
              <Clock className="w-4 h-4 text-amber-500 mb-1" />
              <span className="text-[10px] font-bold leading-tight">ติดตามงาน</span>
              <span className="text-[8px] text-slate-400 mt-0.5">
                {hasActiveBooking ? '● มีงานสด' : 'ไม่มีงานค้าง'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectAction('line_oa')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#06C755] text-white shadow-xs hover:bg-[#05b54d] active:scale-95 transition-all text-center min-h-[75px]"
            >
              <MessageCircle className="w-4 h-4 text-white mb-1" />
              <span className="text-[10px] font-black leading-tight">แชท LINE OA</span>
              <span className="text-[8px] text-emerald-100 mt-0.5">ติดต่อแอดมิน</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEMPLATE 2: 4 BLOCKS (2 Columns x 2 Rows) - Sizing 1200x809px per block   */}
      {/* ========================================================================= */}
      {template === 2 && (
        <div className="grid grid-cols-2 gap-2 bg-gradient-to-b from-slate-100/80 to-slate-200/50 dark:from-slate-800/60 dark:to-slate-900/80 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-fade-in">
          
          <button
            type="button"
            onClick={() => onSelectAction('book')}
            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs active:scale-95 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">จองนวดทันที</span>
              <span className="text-[9px] text-emerald-100 block mt-0.5">เลือกบริการ & พนักงาน</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectAction('nearby')}
            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-xs active:scale-95 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">หมอนวดใกล้ฉัน</span>
              <span className="text-[9px] text-sky-100 block mt-0.5">{activeStaffCount} คนพร้อมงาน</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectAction('tracking')}
            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs active:scale-95 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">ติดตามสถานะ</span>
              <span className="text-[9px] text-amber-100 block mt-0.5">
                {hasActiveBooking ? 'งานกำลังดำเนินการ' : 'เช็กงานนวดล่าสุด'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectAction('line_oa')}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#06C755] text-white shadow-xs active:scale-95 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">ติดต่อ LINE OA</span>
              <span className="text-[9px] text-emerald-100 block mt-0.5">{settings.lineOA || '@sabaideemassage'}</span>
            </div>
          </button>

        </div>
      )}
    </div>
  );
}
