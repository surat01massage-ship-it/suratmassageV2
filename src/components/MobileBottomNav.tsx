import React from 'react';
import { Home, Sparkles, Clock, History, User, MessageCircle } from 'lucide-react';

export type CustomerNavTab = 'home' | 'booking' | 'history' | 'profile';

interface MobileBottomNavProps {
  activeTab: CustomerNavTab;
  onChangeTab: (tab: CustomerNavTab) => void;
  hasActiveBooking: boolean;
  lineOa: string;
}

export default function MobileBottomNav({
  activeTab,
  onChangeTab,
  hasActiveBooking,
  lineOa
}: MobileBottomNavProps) {
  const tabs = [
    { id: 'home' as CustomerNavTab, label: 'หน้าแรก', icon: Home },
    { id: 'booking' as CustomerNavTab, label: 'งานของฉัน', icon: Clock, hasBadge: hasActiveBooking },
    { id: 'history' as CustomerNavTab, label: 'ประวัติ', icon: History },
    { id: 'profile' as CustomerNavTab, label: 'โปรไฟล์', icon: User }
  ];

  return (
    <nav 
      id="mobile-bottom-nav-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-lg px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer min-w-[56px] ${
                isActive 
                  ? 'text-sky-600 dark:text-sky-400 font-black' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 font-semibold'
              }`}
            >
              {/* Active pill background effect */}
              {isActive && (
                <span className="absolute inset-0 bg-sky-50 dark:bg-sky-950/60 rounded-xl -z-10 animate-scale-up" />
              )}
              
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
                
                {/* Pulsing red badge for active booking */}
                {tab.hasBadge && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-0.5 leading-none transition-colors ${
                isActive ? 'font-black' : 'font-medium'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
