
import React from 'react';
import { Home, LayoutGrid, Play, Tv, Cpu, Wifi } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const menuItems = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'library', label: 'المكتبة (Tokens)', icon: LayoutGrid },
    { id: 'operator', label: 'غرفة التحكم', icon: Play }, 
    { id: 'integrations', label: 'الربط الخارجي', icon: Cpu },
  ];

  return (
    <div className="w-64 bg-darker border-l border-gray-800 flex flex-col h-full z-50 shadow-2xl">
      <div className="p-6 border-b border-gray-800 flex items-center gap-3 bg-gray-900/50">
        <div className="bg-gradient-to-tr from-blue-600 to-cyan-500 p-2 rounded-lg shadow-lg shadow-blue-500/20">
            <Tv className="w-6 h-6 text-white" />
        </div>
        <div>
            <h1 className="text-lg font-bold text-white tracking-tight">REO <span className="text-xs font-normal text-blue-400">LIVE</span></h1>
            <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] text-green-500 font-mono uppercase">System Ready</span>
            </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activePage === item.id 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg shadow-blue-900/10' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activePage === item.id ? 'text-blue-400' : 'text-gray-500'}`} />
            <span className="font-medium">{item.label}</span>
            {item.id === 'operator' && (
                <span className="mr-auto bg-red-900/30 text-red-400 text-[10px] px-1.5 py-0.5 rounded border border-red-900/50">LIVE</span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800 bg-gray-900/30">
        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
                <Wifi className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-blue-200 font-bold">طريقة الربط</span>
            </div>
            <p className="text-[10px] text-blue-300/70 leading-relaxed">
                لربط Stream Deck، اذهب إلى <strong>المكتبة</strong> وانسخ "Smart Token" من القالب الذي تريد التحكم به.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
