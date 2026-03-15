
import React, { useState, useEffect } from 'react';
import { OverlayConfig, OverlayType } from './types';
import { INITIAL_TEMPLATES } from './constants';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Library from './pages/Library';
import Operator from './pages/Operator';
import Editor from './pages/Editor';
import Integrations from './pages/Integrations'; 
import OverlayRenderer from './components/OverlayRenderer';
import { Volume2, CloudLightning } from 'lucide-react';
import { syncManager } from './services/syncManager';

const AudioUnlockOverlay = () => {
    const [visible, setVisible] = useState(true);
    
    const handleUnlock = () => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            ctx.resume().then(() => {
                setVisible(false);
                setTimeout(() => ctx.close(), 1000);
            });
        } else {
            setVisible(false);
        }
    };
    
    if (!visible) return null;
    
    return (
        <div 
            onClick={handleUnlock} 
            className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer group hover:bg-black/10 transition-colors"
            title="انقر لتفعيل الصوت"
        >
             <div className="bg-black/80 text-white px-6 py-3 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 duration-300 shadow-2xl border border-white/10">
                 <Volume2 className="w-5 h-5 text-green-400 animate-pulse" />
                 <span className="text-sm font-bold">انقر في أي مكان لتفعيل الصوت</span>
             </div>
        </div>
    );
};

const App: React.FC = () => {
  const [overlays, setOverlays] = useState<OverlayConfig[]>([]);
  const [route, setRoute] = useState<string>('home'); 
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [hashPath, setHashPath] = useState(window.location.hash);
  
  // Handle Hash Routing (Output Window)
  useEffect(() => {
    const handleHashChange = () => setHashPath(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync Manager Subscription
  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setOverlays);
    return unsubscribe;
  }, []);
  
  // Actions delegated to SyncManager
  const handleCreateOverlay = (type: OverlayType) => {
    const template = INITIAL_TEMPLATES.find(t => t.type === type) || INITIAL_TEMPLATES[0];
    const newOverlay: OverlayConfig = {
      ...template,
      id: `instance-${Date.now()}`,
      name: `${template.name} #${overlays.length + 1}`,
      isVisible: false,
      createdAt: Date.now()
    };
    
    syncManager.addOverlay(newOverlay);
    setRoute('library');
  };

  const handleDeleteOverlay = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
       syncManager.deleteOverlay(id);
    }
  };

  // ----------------------------------------------------
  // RENDER: Output View (Browser Source)
  // ----------------------------------------------------
  if (hashPath.startsWith('#/output/')) {
    const id = hashPath.split('/output/')[1]?.split('?')[0];
    const overlay = overlays.find(o => o.id === id);
    
    if (!overlay) return (
      <div className="flex flex-col items-center justify-center h-screen bg-transparent text-gray-400 font-mono space-y-4">
        <div className="bg-black/50 p-4 rounded-full backdrop-blur-md animate-pulse flex items-center gap-3">
            <CloudLightning className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold text-white">Connecting to RGE Cloud...</span>
        </div>
      </div>
    );

    return (
       <div className="w-screen h-screen overflow-hidden bg-transparent relative">
         <AudioUnlockOverlay />
         <OverlayRenderer config={overlay} />
       </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Main App
  // ----------------------------------------------------
  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden" dir="rtl">
      {selectedOverlayId && selectedOverlay ? (
        <div className="w-full h-full">
           <Editor 
             overlay={selectedOverlay} 
             onBack={() => setSelectedOverlayId(null)}
           />
        </div>
      ) : (
        <>
          <Sidebar activePage={route} onNavigate={setRoute} />
          
          <main className="flex-1 overflow-y-auto bg-gray-950 relative">
             <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
             
             <div className="relative z-10 h-full">
               {route === 'home' && (
                  <Home 
                    overlays={overlays}
                    onNavigate={setRoute}
                    onCreate={handleCreateOverlay}
                  />
               )}

               {route === 'library' && (
                 <Library 
                   overlays={overlays} 
                   onSelect={setSelectedOverlayId}
                   onDelete={handleDeleteOverlay}
                   onCreate={handleCreateOverlay}
                   onNavigateOperator={() => setRoute('operator')}
                 />
               )}
               
               {route === 'operator' && (
                   <Operator 
                     overlays={overlays}
                     onUpdate={(o) => syncManager.updateOverlay(o)}
                   />
               )}

               {route === 'integrations' && <Integrations overlays={overlays} />}
             </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
