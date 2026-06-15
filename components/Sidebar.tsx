
import React from 'react';
import { AlertTriangle, Home, LayoutGrid, Play, Tv, Cpu, Shield, Wifi, Star, Radio, Lock, LogOut, Loader2 } from 'lucide-react';
import { licenseService } from '../services/licenseService';
import { toSystemRole, can, getRoleDisplayName, type SystemRole } from '../utils/permissions';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  favoriteCount?: number;
  onLogout?: () => void;
  logoutLoading?: boolean;
  logoutError?: string;
}

const NAV_ALL = [
  { id: 'home',             label: 'الرئيسية',         icon: Home,        badge: null,   cap: null },
  { id: 'library',          label: 'المكتبة',           icon: LayoutGrid,  badge: null,   cap: null },
  { id: 'operator',         label: 'غرفة التحكم',       icon: Play,        badge: 'LIVE', cap: null },
  { id: 'integrations',     label: 'الربط الخارجي',     icon: Cpu,         badge: null,   cap: null },
  { id: 'broadcastcontrol', label: 'استوديو البث',      icon: Radio,       badge: null,   cap: null },
  { id: 'settings',         label: 'الحماية والإعدادات', icon: Shield,      badge: null,   cap: 'SECURITY_SETTINGS_EDIT' as const },
] as const;

const ROLE_BADGE_STYLE: Record<SystemRole, string> = {
  OWNER:           'bg-red-900/30 text-red-300 border-red-800/40',
  ADMIN_ASSISTANT: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/40',
  SUBSCRIBER:      'bg-blue-900/30 text-blue-300 border-blue-800/40',
  VIEWER:          'bg-gray-800/50 text-gray-400 border-gray-700/40',
};

const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  favoriteCount = 0,
  onLogout,
  logoutLoading = false,
  logoutError = '',
}) => {
  const stored = licenseService.getStored();
  const systemRole: SystemRole = stored?.valid ? toSystemRole(stored.role) : 'VIEWER';
  const roleName = getRoleDisplayName(systemRole);

  // Filter nav items by capability
  const visibleNav = NAV_ALL.filter(item =>
    !item.cap || can(systemRole, item.cap)
  );

  return (
    <div className="w-60 bg-[#0e1117] border-l border-gray-800/80 flex flex-col h-full z-50 shadow-2xl flex-shrink-0">

      {/* Logo */}
      <div className="p-5 border-b border-gray-800/80 flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
          <Tv className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-black text-white leading-none tracking-tight">
            REO <span className="text-blue-400 font-normal text-[11px]">LIVE</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] text-green-500 font-mono uppercase tracking-wider">System Ready</span>
          </div>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-4 pt-3 pb-1">
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${ROLE_BADGE_STYLE[systemRole]}`}>
          <Lock className="w-2.5 h-2.5" />
          {roleName}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleNav.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25 shadow-sm'
                  : 'text-gray-400 hover:bg-gray-800/70 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge === 'LIVE' && (
                <span className="mr-auto text-[9px] font-black bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50 uppercase">
                  LIVE
                </span>
              )}
            </button>
          );
        })}

        {/* Favorites shortcut */}
        <div className="pt-4 pb-2">
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest px-3 mb-2">المفضلة</p>
          <button
            onClick={() => onNavigate('library')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-gray-400 hover:bg-gray-800/70 hover:text-white border border-transparent`}
          >
            <Star className="w-4 h-4 flex-shrink-0 text-yellow-500/70 group-hover:text-yellow-400" />
            <span className="font-medium text-sm">القوالب المفضلة</span>
            {favoriteCount > 0 && (
              <span className="mr-auto text-[10px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/20">
                {favoriteCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Bottom hint */}
      <div className="p-3 border-t border-gray-800/80">
        {onLogout && (
          <div className="mb-3 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">REO Access</p>
                <p className="truncate text-xs font-bold text-gray-200">{roleName}</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                disabled={logoutLoading}
                className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-red-900/40 bg-red-950/30 text-red-300 transition-colors hover:border-red-700/70 hover:bg-red-900/40 disabled:cursor-wait disabled:opacity-60"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                {logoutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              </button>
            </div>
            {logoutError && (
              <div className="flex items-start gap-1.5 rounded-lg border border-red-900/40 bg-red-950/30 px-2 py-1.5 text-[10px] leading-4 text-red-200">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span>{logoutError}</span>
              </div>
            )}
          </div>
        )}
        <div className="bg-blue-900/20 rounded-xl p-3 border border-blue-500/15">
          <div className="flex items-center gap-2 mb-1.5">
            <Wifi className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-blue-300 font-bold">ربط Stream Deck</span>
          </div>
          <p className="text-[9px] text-blue-300/60 leading-relaxed">
            اذهب إلى <strong className="text-blue-300/80">المكتبة</strong> وانسخ "Token" من القالب المطلوب.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
