
import React, { useState, useEffect, useRef } from 'react';
import { OverlayConfig, OverlayType, Sponsor } from '../types';
import OverlayRenderer from '../components/OverlayRenderer';
import { Save, Eye, EyeOff, Monitor, Sparkles, ChevronRight, ChevronLeft, Plus, X, RotateCcw, AlertTriangle, Lock, Unlock, DollarSign, Trash2, ArrowDownUp, Image as ImageIcon, History, Edit3, Calendar } from 'lucide-react';
import { processSmartText, generateMatchData } from '../services/geminiService';
import { currencyService } from '../services/currencyService';
import { syncManager } from '../services/syncManager';
import { adminSessionService } from '../services/adminSession';
import { normalizeElectionOverlay } from '../utils/election';

interface EditorProps {
  overlay: OverlayConfig;
  onBack: () => void;
}

// Extensive List of Currencies for Arab & Global usage
const CURRENCY_OPTIONS = [
    { code: 'SAR', label: '🇸🇦 ريال سعودي (SAR)' },
    { code: 'AED', label: '🇦🇪 درهم إماراتي (AED)' },
    { code: 'KWD', label: '🇰🇼 دينار كويتي (KWD)' },
    { code: 'QAR', label: '🇶🇦 ريال قطري (QAR)' },
    { code: 'EGP', label: '🇪🇬 جنيه مصري (EGP)' },
    { code: 'BHD', label: '🇧🇭 دينار بحريني (BHD)' },
    { code: 'OMR', label: '🇴🇲 ريال عماني (OMR)' },
    { code: 'JOD', label: '🇯🇴 دينار أردني (JOD)' },
    { code: 'USD', label: '🇺🇸 دولار أمريكي (USD)' },
    { code: 'EUR', label: '🇪🇺 يورو (EUR)' },
    { code: 'GBP', label: '🇬🇧 جنيه استرليني (GBP)' },
    { code: 'JPY', label: '🇯🇵 ين ياباني (JPY)' },
    { code: 'CAD', label: '🇨🇦 دولار كندي (CAD)' },
    { code: 'AUD', label: '🇦🇺 دولار أسترالي (AUD)' },
];

const Editor: React.FC<EditorProps> = ({ overlay: liveOverlay, onBack }) => {
  const [activeTab, setActiveTab] = useState<string>('fields');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [previewChroma, setPreviewChroma] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageFieldId, setActiveImageFieldId] = useState<string | null>(null);

  // Draft State
  const [draftOverlay, setDraftOverlay] = useState<OverlayConfig>(() => normalizeElectionOverlay(JSON.parse(JSON.stringify(liveOverlay))));

  // --- SPONSORS MANAGEMENT STATE ---
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isAdminAuthorizing, setIsAdminAuthorizing] = useState(false);
  
  const [newSponsor, setNewSponsor] = useState({ name: '', amount: '', currency: 'SAR', avatar: '' });
  const [isAddingSponsor, setIsAddingSponsor] = useState(false);
  const [previewUSD, setPreviewUSD] = useState<number | null>(null);

  const [topUpSponsorId, setTopUpSponsorId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isToppingUp, setIsToppingUp] = useState(false);

  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [editSponsorData, setEditSponsorData] = useState({ name: '', avatar: '' });

  // --- SMART SYNC ---
  useEffect(() => {
     setDraftOverlay(prevDraft => {
         const newDraft = normalizeElectionOverlay({ ...prevDraft, fields: prevDraft.fields.map(field => ({ ...field })) });
         let shouldUpdate = false;

         if (prevDraft.isVisible !== liveOverlay.isVisible) {
             newDraft.isVisible = liveOverlay.isVisible;
             shouldUpdate = true;
         }

         liveOverlay.fields.forEach(liveField => {
             const draftField = newDraft.fields.find(f => f.id === liveField.id);
             if (draftField) {
                 const isControlField = ['homeScore', 'awayScore', 'currentPage', 'period', 'time'].includes(liveField.id);
                 if (isControlField && JSON.stringify(liveField.value) !== JSON.stringify(draftField.value)) {
                     draftField.value = liveField.value;
                     shouldUpdate = true;
                 }
             }
         });

         return shouldUpdate ? normalizeElectionOverlay(newDraft) : prevDraft;
     });
  }, [liveOverlay]);

  useEffect(() => {
      let isMounted = true;

      adminSessionService.verifyStoredSession().then(isValid => {
          if (isMounted) {
              setIsAdminUnlocked(isValid);
          }
      }).catch(error => {
          console.error('Failed to verify admin session', error);
      });

      return () => {
          isMounted = false;
      };
  }, []);

  // --- LIVE CURRENCY PREVIEW EFFECT ---
  useEffect(() => {
      if (newSponsor.amount && !isNaN(parseFloat(newSponsor.amount))) {
          const amount = parseFloat(newSponsor.amount);
          currencyService.convertToUSD(amount, newSponsor.currency).then(usd => {
              setPreviewUSD(usd);
          });
      } else {
          setPreviewUSD(null);
      }
  }, [newSponsor.amount, newSponsor.currency]);

  // --- HANDLERS ---
  const handleDraftFieldChange = (id: string, value: any) => {
    const updatedFields = draftOverlay.fields.map(f => 
      f.id === id ? { ...f, value } : f
    );
    const newOverlay = normalizeElectionOverlay({ ...draftOverlay, fields: updatedFields }, id);
    setDraftOverlay(newOverlay);
    syncManager.updateOverlay(newOverlay);
  };

  const updateDraftTheme = (key: string, value: string) => {
      const newOverlay = { ...draftOverlay, theme: { ...draftOverlay.theme, [key]: value } };
      setDraftOverlay(newOverlay);
      syncManager.updateOverlay(newOverlay);
  };

  const getDraftValue = (id: string) => draftOverlay.fields.find(f => f.id === id)?.value;

  const toggleLiveVisibility = () => {
      syncManager.updateLiveField(liveOverlay.id, 'isVisible', !liveOverlay.isVisible);
  };

  const updateLiveControl = (fieldId: string, value: any) => {
      syncManager.updateLiveField(liveOverlay.id, fieldId, value);
  };

  // --- SPONSORS LOGIC ---
  const handleAdminLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsAdminAuthorizing(true);
      setPasswordError(null);

      try {
          await adminSessionService.login(adminPassword);
          setIsAdminUnlocked(true);
          setAdminPassword('');
      } catch (error) {
          setPasswordError(error instanceof Error ? error.message : 'تعذر فتح جلسة المسؤول.');
      } finally {
          setIsAdminAuthorizing(false);
      }
  };

  const handleAdminLogout = () => {
      adminSessionService.clear();
      setIsAdminUnlocked(false);
      setPasswordError(null);
  };

  const handleAddSponsor = async () => {
      if (!newSponsor.name || !newSponsor.amount) return;
      setIsAddingSponsor(true);

      const amountNum = parseFloat(newSponsor.amount);
      const usdAmount = await currencyService.convertToUSD(amountNum, newSponsor.currency);

      const donation = {
          id: `don-${Date.now()}`,
          amount: amountNum,
          currency: newSponsor.currency,
          usdAmount: usdAmount,
          timestamp: Date.now()
      };

      const sponsorToAdd: Sponsor = {
          id: Date.now().toString(),
          name: newSponsor.name,
          amount: amountNum,
          currency: newSponsor.currency,
          usdAmount: usdAmount,
          avatar: newSponsor.avatar,
          history: [donation]
      };

      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      let currentSponsors: Sponsor[] = [];
      try { currentSponsors = JSON.parse(currentSponsorsStr); } catch (e) {}

      let updatedSponsors = [sponsorToAdd, ...currentSponsors];
      updatedSponsors.sort((a, b) => b.usdAmount - a.usdAmount);

      handleDraftFieldChange('sponsorsData', JSON.stringify(updatedSponsors));
      setNewSponsor({ name: '', amount: '', currency: 'SAR', avatar: '' });
      setIsAddingSponsor(false);
  };

  const handleDeleteSponsor = (id: string) => {
      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      const currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      const updated = currentSponsors.filter(s => s.id !== id);
      handleDraftFieldChange('sponsorsData', JSON.stringify(updated));
  };

  const handleAutoSort = () => {
      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      let currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      // Sort High to Low (using the calculated usdAmount)
      currentSponsors.sort((a, b) => b.usdAmount - a.usdAmount);
      handleDraftFieldChange('sponsorsData', JSON.stringify(currentSponsors));
  };

  const handleTopUp = async (id: string, amountToAdd?: number) => {
      const finalAmountStr = amountToAdd !== undefined ? amountToAdd.toString() : topUpAmount;
      if (!finalAmountStr || isNaN(parseFloat(finalAmountStr))) return;
      
      setIsToppingUp(true);
      const additionalAmount = parseFloat(finalAmountStr);

      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      const currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      const sponsorIndex = currentSponsors.findIndex(s => s.id === id);
      
      if (sponsorIndex !== -1) {
          const sponsor = currentSponsors[sponsorIndex];
          
          const donation = {
              id: `don-${Date.now()}`,
              amount: additionalAmount,
              currency: sponsor.currency,
              usdAmount: await currencyService.convertToUSD(additionalAmount, sponsor.currency),
              timestamp: Date.now()
          };

          const newHistory = [...(sponsor.history || []), donation];
          const newTotalAmount = newHistory.reduce((sum, entry) => sum + entry.amount, 0);
          const newTotalUsdAmount = newHistory.reduce((sum, entry) => sum + entry.usdAmount, 0);
          
          const updated = [...currentSponsors];
          updated[sponsorIndex] = { 
              ...sponsor, 
              amount: newTotalAmount, 
              usdAmount: newTotalUsdAmount,
              history: newHistory
          };
          
          updated.sort((a, b) => b.usdAmount - a.usdAmount);
          
          handleDraftFieldChange('sponsorsData', JSON.stringify(updated));
          setTopUpSponsorId(null);
          setTopUpAmount('');
      }
      setIsToppingUp(false);
  };

  const handleUpdateSponsorInfo = (id: string) => {
      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      const currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      const updated = currentSponsors.map(s => 
          s.id === id ? { ...s, name: editSponsorData.name, avatar: editSponsorData.avatar } : s
      );
      handleDraftFieldChange('sponsorsData', JSON.stringify(updated));
      setEditingSponsorId(null);
  };

  const handleDeleteDonation = (sponsorId: string, donationId: string) => {
      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      const currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      const sponsorIndex = currentSponsors.findIndex(s => s.id === sponsorId);
      
      if (sponsorIndex !== -1) {
          const sponsor = currentSponsors[sponsorIndex];
          const newHistory = sponsor.history.filter(d => d.id !== donationId);
          
          if (newHistory.length === 0) {
              handleDeleteSponsor(sponsorId);
              setViewingHistoryId(null);
              return;
          }

          const newTotalAmount = newHistory.reduce((sum, entry) => sum + entry.amount, 0);
          const newTotalUsdAmount = newHistory.reduce((sum, entry) => sum + entry.usdAmount, 0);
          
          const updated = [...currentSponsors];
          updated[sponsorIndex] = { 
              ...sponsor, 
              amount: newTotalAmount, 
              usdAmount: newTotalUsdAmount,
              history: newHistory
          };
          
          updated.sort((a, b) => b.usdAmount - a.usdAmount);
          handleDraftFieldChange('sponsorsData', JSON.stringify(updated));
      }
  };

  // --- IMAGES ---
  const triggerFileUpload = (fieldId: string) => {
    setActiveImageFieldId(fieldId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeImageFieldId) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            handleDraftFieldChange(activeImageFieldId, base64String);
            setActiveImageFieldId(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsDataURL(file);
    }
  };

  // --- RENDER ---
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      
      {/* RIGHT PANEL */}
      <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col z-10 shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
           <button onClick={onBack} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
             <ChevronRight className="w-4 h-4" /> عودة
           </button>
           <div className="flex items-center gap-2">
               <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-green-500 bg-green-900/20 border border-green-500/20">
                <Sparkles className="w-3 h-3" />
                <span>حفظ تلقائي</span>
               </div>
           </div>
        </div>
        
        <div className="flex border-b border-gray-800 overflow-x-auto no-scrollbar">
          {/* ALWAYS: Main data tab */}
          <button onClick={() => setActiveTab('fields')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'fields' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>📝 البيانات</button>

          {/* ALWAYS for non-ELECTION: Images tab (if has image fields) */}
          {draftOverlay.type !== OverlayType.ELECTION && draftOverlay.fields.some(f => f.type === 'image' || f.type === 'image-list') && (
            <button onClick={() => setActiveTab('images')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'images' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-gray-400 hover:text-white'}`}>🖼️ الصور</button>
          )}

          {/* ALWAYS for non-ELECTION: Appearance tab */}
          {draftOverlay.type !== OverlayType.ELECTION && (
            <button onClick={() => setActiveTab('style')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'style' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>🎨 المظهر</button>
          )}

          {/* ALWAYS for non-ELECTION: Position/Size tab */}
          {draftOverlay.type !== OverlayType.ELECTION && draftOverlay.fields.some(f => ['scale','positionX','positionY','containerWidth','sidebarWidth'].includes(f.id)) && (
            <button onClick={() => setActiveTab('position')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'position' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-400 hover:text-white'}`}>📐 الأبعاد</button>
          )}

          {/* ALWAYS for non-ELECTION: Sound tab if exists */}
          {draftOverlay.type !== OverlayType.ELECTION && draftOverlay.fields.some(f => f.id === 'soundEnabled' || f.id === 'useTTS') && (
            <button onClick={() => setActiveTab('sound')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'sound' ? 'text-green-400 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}>🔊 الصوت</button>
          )}

          {/* LEADERBOARD: Sponsors tab */}
          {draftOverlay.type === OverlayType.LEADERBOARD && (
             <button onClick={() => setActiveTab('sponsors')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'sponsors' ? 'text-green-400 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}>👥 الداعمين</button>
          )}

          {/* ELECTION: specialized tabs */}
          {draftOverlay.type === OverlayType.ELECTION && (() => {
              const designStyle = String(draftOverlay.fields.find(f => f.id === 'designStyle')?.value || '');
              return (
                  <>
                      {(designStyle === 'SPLIT_BAR_LEFT' || designStyle === 'STATEMENT_FULL' || designStyle === 'RESULTS_HUB') && <button onClick={() => setActiveTab('candidates')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'candidates' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>المرشحون</button>}
                      {designStyle === 'COUNTDOWN_TOP' && <button onClick={() => setActiveTab('time')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'time' ? 'text-orange-400 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}>الوقت</button>}
                      {(designStyle === 'LEAKS_FULL' || designStyle === 'STATEMENT_FULL' || designStyle === 'STUDIO_BACKGROUND' || designStyle === 'LIVE_TRANSITION' || designStyle === 'RESULTS_HUB') && <button onClick={() => setActiveTab('content')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'content' ? 'text-pink-400 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'}`}>المحتوى</button>}
                      {designStyle === 'STUDIO_BACKGROUND' && <button onClick={() => setActiveTab('camera')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'camera' ? 'text-teal-400 border-b-2 border-teal-500' : 'text-gray-400 hover:text-white'}`}>الكاميرا</button>}
                      {(designStyle === 'VOTER_TURNOUT' || designStyle === 'RESULTS_HUB') && <button onClick={() => setActiveTab('turnout')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'turnout' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}>الإقبال</button>}
                      <button onClick={() => setActiveTab('style')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'style' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>🎨 المظهر</button>
                  </>
              );
          })()}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* FIELDS TAB */}
          {['fields', 'candidates', 'time', 'content', 'camera', 'style', 'turnout', 'images', 'position', 'sound'].includes(activeTab) && (
             <>
               {draftOverlay.fields.map((field) => {
                 if (field.type === 'hidden' || field.id === 'currentPage') return null;
                 
                 // Separate Font Size controls for Typography section
                 if (['headerFontSize', 'nameFontSize', 'amountFontSize'].includes(field.id)) return null;

                  // SMART UNIVERSAL FIELD FILTERING
                  if (draftOverlay.type === OverlayType.ELECTION) {
                      const isStyleField = ['themePreset', 'designStyle', 'barcaLogo', 'scale', 'positionX', 'positionY', 'soundEnabled', 'soundVolume', 'soundInStyle', 'soundOutStyle', 'boxColor', 'accentColor'].includes(field.id);
                      const isCandidateField = field.id.startsWith('candidate') || ['showUndecided', 'undecidedLabel', 'undecidedPercent', 'undecidedColor'].includes(field.id);
                      const isTimeField = ['targetDate', 'targetTime', 'countdownTitle', 'countdownDays', 'countdownHours', 'countdownMinutes', 'countdownSeconds'].includes(field.id);
                      const isCameraField = field.id.startsWith('camera') || field.id === 'bgImage';
                      const isTurnoutField = ['currentVoters', 'totalVoters', 'turnoutTitle', 'turnoutSubtitle', 'currentVotersTitle'].includes(field.id);
                      const designStyle = String(draftOverlay.fields.find(f => f.id === 'designStyle')?.value || '');
                      const candidate1Profile = String(draftOverlay.fields.find(f => f.id === 'candidate1Profile')?.value || 'CUSTOM');
                      const candidate2Profile = String(draftOverlay.fields.find(f => f.id === 'candidate2Profile')?.value || 'CUSTOM');
                      const statementSource = String(draftOverlay.fields.find(f => f.id === 'statementSource')?.value || 'CANDIDATE_1');
                      const candidate1IdentityFields = ['candidate1Name', 'candidate1Image', 'candidate1Tag', 'candidate1Color'];
                      const candidate2IdentityFields = ['candidate2Name', 'candidate2Image', 'candidate2Tag', 'candidate2Color'];
                      const customStatementFields = ['statementSubjectName', 'statementSubjectTag', 'statementSubjectImage', 'statementSubjectColor'];
                      let isContentField = false;
                      if (designStyle === 'LEAKS_FULL') isContentField = ['leaksTitle', 'leaksSubtitle', 'leaksContent'].includes(field.id);
                      else if (designStyle === 'STATEMENT_FULL') isContentField = ['specialText', 'statementAuthor', 'statementTitle', 'statementSource', ...customStatementFields].includes(field.id);
                      else if (designStyle === 'LIVE_TRANSITION') isContentField = ['transitionTitle', 'transitionSubtitle', 'liveText'].includes(field.id);
                      else if (designStyle === 'STUDIO_BACKGROUND') isContentField = ['specialText', 'liveText'].includes(field.id);
                      else if (designStyle === 'RESULTS_HUB') isContentField = ['specialText'].includes(field.id);
                      const allContentFields = ['specialText', 'specialImage', 'statementAuthor', 'statementTitle', 'statementSource', ...customStatementFields, 'leaksTitle', 'leaksSubtitle', 'leaksContent', 'transitionTitle', 'transitionSubtitle', 'liveText'];
                      if (allContentFields.includes(field.id) && !isContentField) return null;
                      if (candidate1IdentityFields.includes(field.id) && candidate1Profile !== 'CUSTOM') return null;
                      if (candidate2IdentityFields.includes(field.id) && candidate2Profile !== 'CUSTOM') return null;
                      if (customStatementFields.includes(field.id) && statementSource !== 'CUSTOM') return null;
                      if (isTimeField && designStyle !== 'COUNTDOWN_TOP') return null;
                      if (isCandidateField && designStyle !== 'SPLIT_BAR_LEFT' && designStyle !== 'STATEMENT_FULL' && designStyle !== 'RESULTS_HUB') return null;
                      if (isCameraField && designStyle !== 'STUDIO_BACKGROUND') return null;
                      if (isTurnoutField && designStyle !== 'VOTER_TURNOUT' && designStyle !== 'RESULTS_HUB') return null;
                      if ((field.id === 'boxColor' || field.id === 'accentColor') && designStyle !== 'LEAKS_FULL' && designStyle !== 'STATEMENT_FULL') return null;
                      if (activeTab === 'fields') { if (isStyleField || isCandidateField || isTimeField || isContentField || isCameraField || isTurnoutField) return null; }
                      else if (activeTab === 'candidates') { if (!isCandidateField) return null; }
                      else if (activeTab === 'time') { if (!isTimeField) return null; }
                      else if (activeTab === 'content') { if (!isContentField) return null; }
                      else if (activeTab === 'camera') { if (!isCameraField) return null; }
                      else if (activeTab === 'turnout') { if (!isTurnoutField) return null; }
                      else if (activeTab === 'style') { if (!isStyleField) return null; }
                  } else {
                      // UNIVERSAL SMART TABS for ALL non-election templates
                      const POSITION_FIELDS = ['scale', 'positionX', 'positionY', 'containerWidth', 'sidebarWidth', 'itemsPerPage', 'rotationTime'];
                      const SOUND_FIELDS = ['soundEnabled', 'soundVolume', 'useTTS', 'ttsText', 'soundInStyle', 'soundOutStyle'];
                      const APPEARANCE_FIELDS = ['themePreset', 'designStyle', 'bgOpacity', 'watermarkText', 'showAvatars', 'showAmounts', 'showRanks', 'transitionEffect', 'scrollSpeed'];
                      const isPositionField = POSITION_FIELDS.includes(field.id);
                      const isSoundField = SOUND_FIELDS.includes(field.id);
                      const isAppearanceField = APPEARANCE_FIELDS.includes(field.id);
                      const isImageField = field.type === 'image' || field.type === 'image-list';
                      if (activeTab === 'fields') { if (isPositionField || isSoundField || isAppearanceField || isImageField) return null; }
                      else if (activeTab === 'images') { if (!isImageField) return null; }
                      else if (activeTab === 'style') { if (!isAppearanceField) return null; }
                      else if (activeTab === 'position') { if (!isPositionField) return null; }
                      else if (activeTab === 'sound') { if (!isSoundField) return null; }
                  }

                 // Render standard fields...
                 if (field.type === 'range') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <div className="flex items-center gap-2">
                                <input type="range" min={field.min} max={field.max} step={field.step} value={Number(field.value)} onChange={(e) => handleDraftFieldChange(field.id, parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg accent-blue-600" />
                                <span className="text-xs font-mono">{field.value}</span>
                            </div>
                         </div>
                     );
                 }
                 if (field.type === 'text' || field.type === 'number') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <input type={field.type} value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, field.type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500" />
                         </div>
                     )
                 }
                 if (field.type === 'select') {
                    return (
                        <div key={field.id} className="space-y-1">
                            <label className="text-xs text-gray-400 block">{field.label}</label>
                            <select value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500">
                                {field.options?.map(opt => {
                                  const option = typeof opt === 'string' ? { value: opt, label: opt } : opt;
                                  return <option key={option.value} value={option.value}>{option.label}</option>;
                                })}
                            </select>
                        </div>
                    )
                 }
                 if (field.type === 'boolean') {
                    return (
                        <div key={field.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                            <label className="text-xs text-gray-300">{field.label}</label>
                            <input type="checkbox" checked={field.value as boolean} onChange={(e) => handleDraftFieldChange(field.id, e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                        </div>
                    )
                 }
                 if (field.type === 'textarea') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <textarea value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} rows={5} className="w-full resize-y bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500" />
                         </div>
                     )
                 }
                 if (field.type === 'color') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
                                 <input type="color" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="h-10 w-14 cursor-pointer rounded border-none bg-transparent" />
                                 <input type="text" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="flex-1 bg-transparent text-sm font-mono text-white focus:outline-none" />
                             </div>
                         </div>
                     )
                 }
                 if (field.type === 'image') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <div className="flex items-center gap-2">
                                 <input type="text" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500" placeholder="رابط الصورة..." />
                                 <button onClick={() => triggerFileUpload(field.id)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors" title="رفع صورة من الجهاز">
                                     رفع
                                 </button>
                             </div>
                             {field.value && field.value.toString().startsWith('data:image') && (
                                 <div className="mt-2 text-[10px] text-green-400">تم رفع صورة محلية</div>
                             )}
                         </div>
                     )
                 }
                 return null;
               })}
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
             </>
          )}

          {/* SPONSORS MANAGEMENT TAB (PROTECTED) */}
          {activeTab === 'sponsors' && (
              <div className="space-y-4">
                  {!isAdminUnlocked ? (
                      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center space-y-4">
                          <div className="mx-auto w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                              <Lock className="w-6 h-6 text-red-500" />
                          </div>
                          <h3 className="text-white font-bold">منطقة محمية</h3>
                          <p className="text-xs text-gray-400">فقط المسؤول يمكنه تعديل قائمة الداعمين.</p>
                          <form onSubmit={handleAdminLogin} className="space-y-2">
                              <input 
                                type="password" 
                                placeholder="كلمة المرور" 
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full bg-black border border-gray-600 rounded p-2 text-white text-center focus:border-red-500 focus:outline-none"
                              />
                              <button type="submit" disabled={isAdminAuthorizing} className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-400 text-white py-2 rounded font-bold transition-colors">
                                  {isAdminAuthorizing ? 'جاري التحقق...' : 'فتح الجلسة'}
                              </button>
                              {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                          </form>
                      </div>
                  ) : (
                      <div className="space-y-6 animate-fade-in-up">
                          <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
                                  <Unlock className="w-4 h-4" /> وضع المسؤول
                              </h3>
                              <button onClick={handleAdminLogout} className="text-xs text-gray-500 hover:text-white">قفل</button>
                          </div>

                          {/* Add Form */}
                          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 space-y-3">
                              <h4 className="text-xs font-bold text-white mb-2">إضافة داعم جديد</h4>
                              
                              <div className="flex gap-2">
                                 <input 
                                    type="text" placeholder="اسم الداعم"
                                    value={newSponsor.name} onChange={e => setNewSponsor({...newSponsor, name: e.target.value})}
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                              </div>

                              <div className="flex gap-2">
                                  <input 
                                    type="number" placeholder="المبلغ"
                                    value={newSponsor.amount} onChange={e => setNewSponsor({...newSponsor, amount: e.target.value})}
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                                  <select 
                                    value={newSponsor.currency} onChange={e => setNewSponsor({...newSponsor, currency: e.target.value})}
                                    className="w-32 bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                  >
                                      {CURRENCY_OPTIONS.map(curr => (
                                          <option key={curr.code} value={curr.code}>{curr.label}</option>
                                      ))}
                                      <option value="OTH">أخرى (USD)</option>
                                  </select>
                              </div>

                              {/* LIVE USD PREVIEW */}
                              <div className="flex items-center justify-between px-2 text-[10px] text-gray-400 font-mono bg-black/20 rounded py-1 border border-white/5">
                                  <span>سيظهر كـ:</span>
                                  <span className="text-green-400 font-bold">
                                      {previewUSD !== null ? `$${previewUSD.toLocaleString()}` : '...'}
                                  </span>
                              </div>

                              <div className="relative">
                                  <input 
                                    type="text" placeholder="رابط الصورة (اختياري)"
                                    value={newSponsor.avatar} onChange={e => setNewSponsor({...newSponsor, avatar: e.target.value})}
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-gray-400 font-mono focus:outline-none focus:border-blue-500 pl-8"
                                  />
                                  <ImageIcon className="absolute top-2.5 left-2 w-4 h-4 text-gray-600" />
                              </div>

                              <button 
                                onClick={handleAddSponsor}
                                disabled={isAddingSponsor}
                                className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded flex items-center justify-center gap-2 font-bold transition-all transform active:scale-95"
                              >
                                  {isAddingSponsor ? 'جاري التحويل والإضافة...' : <><Plus className="w-4 h-4" /> إضافة للقائمة</>}
                              </button>
                          </div>

                          {/* List */}
                          <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-gray-400">القائمة الحالية</h4>
                                  <button onClick={handleAutoSort} className="text-xs flex items-center gap-1 text-blue-400 hover:text-white" title="ترتيب حسب المبلغ">
                                      <ArrowDownUp className="w-3 h-3" /> ترتيب
                                  </button>
                              </div>
                              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                                  {(() => {
                                      const sponsors: Sponsor[] = JSON.parse(String(getDraftValue('sponsorsData') || '[]'));
                                      return sponsors.length === 0 ? (
                                          <p className="text-xs text-gray-500 text-center py-4">القائمة فارغة</p>
                                      ) : (
                                          sponsors.map((s, idx) => (
                                              <React.Fragment key={s.id}>
                                              <div className="bg-black/40 p-2 rounded flex items-center justify-between group">
                                                  <div className="flex items-center gap-2 overflow-hidden">
                                                      <span className="text-[10px] w-5 h-5 bg-gray-800 text-gray-400 flex items-center justify-center rounded-full shrink-0">{idx + 1}</span>
                                                      <img src={s.avatar || `https://ui-avatars.com/api/?name=${s.name}`} className="w-6 h-6 rounded-full" alt="" />
                                                      <div className="text-sm text-white truncate max-w-[80px]">{s.name}</div>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                      <div className="text-right">
                                                          {/* Editor List shows original currency + USD hint */}
                                                          <div className="text-xs text-green-400 font-mono font-bold">
                                                              ${s.usdAmount.toLocaleString()}
                                                          </div>
                                                          <div className="text-[9px] text-gray-600">
                                                              ({s.amount} {s.currency})
                                                          </div>
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                          <button 
                                                            onClick={() => {
                                                                setEditingSponsorId(s.id);
                                                                setEditSponsorData({ name: s.name, avatar: s.avatar || '' });
                                                            }}
                                                            className="p-1 text-gray-500 hover:text-blue-400"
                                                            title="تعديل البيانات"
                                                          >
                                                              <Edit3 className="w-4 h-4" />
                                                          </button>
                                                          <button 
                                                            onClick={() => setViewingHistoryId(viewingHistoryId === s.id ? null : s.id)}
                                                            className={`p-1 rounded transition-colors ${viewingHistoryId === s.id ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-400'}`}
                                                            title="سجل الدعم"
                                                          >
                                                              <History className="w-4 h-4" />
                                                          </button>
                                                          <button 
                                                            onClick={() => setTopUpSponsorId(topUpSponsorId === s.id ? null : s.id)} 
                                                            className={`p-1 rounded transition-colors ${topUpSponsorId === s.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-400'}`}
                                                            title="إضافة مبلغ (دعم جديد)"
                                                          >
                                                              <Plus className="w-4 h-4" />
                                                          </button>
                                                          <button onClick={() => handleDeleteSponsor(s.id)} className="p-1 text-gray-600 hover:text-red-500" title="حذف">
                                                              <Trash2 className="w-4 h-4" />
                                                          </button>
                                                      </div>
                                                  </div>
                                              </div>
                                              
                                              {/* EDIT INFO UI */}
                                              {editingSponsorId === s.id && (
                                                  <div className="bg-gray-800 border border-blue-500/30 rounded-lg p-3 mt-1 mb-2 animate-cinematic-blur-in space-y-3">
                                                      <div className="flex items-center justify-between mb-1">
                                                          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">تعديل بيانات {s.name}</span>
                                                          <button onClick={() => setEditingSponsorId(null)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                                      </div>
                                                      <input 
                                                        type="text" value={editSponsorData.name} 
                                                        onChange={e => setEditSponsorData({...editSponsorData, name: e.target.value})}
                                                        className="w-full bg-black/40 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-400"
                                                        placeholder="الاسم"
                                                      />
                                                      <input 
                                                        type="text" value={editSponsorData.avatar} 
                                                        onChange={e => setEditSponsorData({...editSponsorData, avatar: e.target.value})}
                                                        className="w-full bg-black/40 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-400 font-mono focus:outline-none focus:border-blue-400"
                                                        placeholder="رابط الصورة"
                                                      />
                                                      <button 
                                                        onClick={() => handleUpdateSponsorInfo(s.id)}
                                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded text-xs font-bold"
                                                      >
                                                          تحديث البيانات
                                                      </button>
                                                  </div>
                                              )}

                                              {/* HISTORY VIEW UI */}
                                              {viewingHistoryId === s.id && (
                                                  <div className="bg-purple-900/10 border border-purple-500/30 rounded-lg p-3 mt-1 mb-2 animate-cinematic-blur-in space-y-2">
                                                      <div className="flex items-center justify-between mb-1 border-b border-purple-500/20 pb-1">
                                                          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                                                              <History className="w-3 h-3" /> سجل دعم {s.name}
                                                          </span>
                                                          <button onClick={() => setViewingHistoryId(null)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                                      </div>
                                                      <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                                          {(s.history || []).map((entry) => (
                                                              <div key={entry.id} className="flex items-center justify-between bg-black/30 p-1.5 rounded border border-white/5 group/history">
                                                                  <div className="flex flex-col">
                                                                      <span className="text-[11px] text-green-400 font-bold font-mono">
                                                                          {entry.amount} {entry.currency}
                                                                      </span>
                                                                      <span className="text-[8px] text-gray-500 flex items-center gap-1">
                                                                          <Calendar className="w-2 h-2" />
                                                                          {new Date(entry.timestamp).toLocaleDateString('ar-SA')} - {new Date(entry.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                                      </span>
                                                                  </div>
                                                                  <button 
                                                                    onClick={() => handleDeleteDonation(s.id, entry.id)}
                                                                    className="opacity-0 group-hover/history:opacity-100 text-gray-600 hover:text-red-500 transition-opacity"
                                                                  >
                                                                      <Trash2 className="w-3 h-3" />
                                                                  </button>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )}
                                              
                                              {/* TOP UP UI (GENIUS INLINE MODE) */}
                                              {topUpSponsorId === s.id && (
                                                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-1 mb-2 animate-cinematic-blur-in space-y-3">
                                                      <div className="flex items-center justify-between mb-1">
                                                          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">دعم إضافي لـ {s.name}</span>
                                                          <button onClick={() => setTopUpSponsorId(null)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                                      </div>
                                                      
                                                      <div className="flex gap-2">
                                                          <input 
                                                            autoFocus
                                                            type="number" 
                                                            placeholder="المبلغ المضاف..." 
                                                            value={topUpAmount}
                                                            onChange={e => setTopUpAmount(e.target.value)}
                                                            className="flex-1 bg-black/40 border border-blue-500/50 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-400"
                                                          />
                                                          <button 
                                                            onClick={() => handleTopUp(s.id)}
                                                            disabled={isToppingUp || !topUpAmount}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
                                                          >
                                                              {isToppingUp ? '...' : 'تحديث'}
                                                          </button>
                                                      </div>

                                                      {/* Quick Actions */}
                                                      <div className="grid grid-cols-4 gap-1">
                                                          {[5, 10, 50, 100].map(val => (
                                                              <button 
                                                                key={val}
                                                                onClick={() => handleTopUp(s.id, val)}
                                                                className="bg-gray-800 hover:bg-blue-600 text-[10px] py-1 rounded border border-gray-700 hover:border-blue-400 transition-all font-bold"
                                                              >
                                                                  +{val}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )}
                                              </React.Fragment>
                                          ))
                                      );
                                  })()}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'style' && (
             <div className="space-y-6">
                 {/* Typography Controls (Leaderboard Only) */}
                 {draftOverlay.type === OverlayType.LEADERBOARD && (
                     <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                         <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                             <Sparkles className="w-3 h-3 text-yellow-500" />
                             أحجام النصوص (Typography)
                         </h4>
                         <div className="space-y-3">
                            {['headerFontSize', 'nameFontSize', 'amountFontSize'].map(id => {
                                const field = draftOverlay.fields.find(f => f.id === id);
                                if (!field) return null;
                                return (
                                    <div key={field.id} className="space-y-1">
                                        <div className="flex justify-between">
                                            <label className="text-xs text-gray-400">{field.label}</label>
                                            <span className="text-xs text-blue-400 font-mono">{field.value}px</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min={field.min} max={field.max} step={field.step} 
                                            value={Number(field.value)} 
                                            onChange={(e) => handleDraftFieldChange(field.id, parseFloat(e.target.value))} 
                                            className="w-full h-1.5 bg-gray-700 rounded-lg accent-blue-500" 
                                        />
                                    </div>
                                );
                            })}
                         </div>
                     </div>
                 )}

                 {/* Standard Colors */}
                 {draftOverlay.type !== OverlayType.ELECTION && (
                     <div>
                        <h4 className="text-xs font-bold text-gray-400 mb-2">ألوان الثيم</h4>
                         {['primaryColor', 'secondaryColor'].map(key => (
                           <div key={key} className="mb-2">
                             <label className="text-xs text-gray-500 block mb-1">{key === 'primaryColor' ? 'اللون الأساسي' : 'اللون الثانوي'}</label>
                             <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                               <input type="color" value={(draftOverlay.theme as any)[key]} onChange={(e) => updateDraftTheme(key, e.target.value)} className="h-6 w-6 rounded border-none cursor-pointer bg-transparent" />
                               <span className="text-xs text-gray-400 font-mono">{(draftOverlay.theme as any)[key]}</span>
                             </div>
                           </div>
                       ))}
                     </div>
                 )}
             </div>
          )}
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col bg-gray-950 relative">
         <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900 shadow-lg z-20">
             <div className="flex items-center gap-4">
                 <button onClick={toggleLiveVisibility} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${liveOverlay.isVisible ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-700 text-gray-300'}`}>
                     {liveOverlay.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                     <span>{liveOverlay.isVisible ? 'ON AIR' : 'OFF AIR'}</span>
                 </button>
             </div>
             <button onClick={() => { window.open(syncManager.buildOutputUrl(liveOverlay.id), '_blank', 'width=1280,height=720') }} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-600/30"><Monitor className="w-5 h-5" /></button>
         </div>

         <div className="flex-1 overflow-hidden flex items-center justify-center p-8 bg-black/50 relative">
            <div className="relative z-10 w-full max-w-5xl aspect-video bg-transparent border border-gray-700 shadow-2xl transition-all duration-300">
                 <OverlayRenderer config={{ ...draftOverlay, isVisible: true }} chromaKey={previewChroma} isEditor={true} />
            </div>
         </div>
      </div>
    </div>
  );
};

export default Editor;
