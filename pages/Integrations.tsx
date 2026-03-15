
import React, { useState } from 'react';
import { OverlayConfig } from '../types';
import { syncManager } from '../services/syncManager';
import { Smartphone, Download, Grid, Box, Zap, Settings, Command, Key, Check } from 'lucide-react';
import JSZip from 'jszip';

interface IntegrationsProps {
  overlays: OverlayConfig[];
}

const Integrations: React.FC<IntegrationsProps> = ({ overlays }) => {
  const [activeTab, setActiveTab] = useState<'plugin' | 'webdeck'>('plugin');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'done'>('idle');
  const studioId = syncManager.getStudioId();
  
  // --- GENERATE NATIVE STREAM DECK PLUGIN (SMART TOKEN EDITION v3) ---
  const handleDownloadPlugin = async () => {
      setDownloadStatus('downloading');
      const zip = new JSZip();
      const pluginName = "com.rge.controller.sdPlugin";
      const folder = zip.folder(pluginName);

      if (!folder) return;

      // 1. MANIFEST.JSON
      const manifest = {
          "Actions": [
              {
                  "Icon": "images/actionIcon",
                  "Name": "RGE Smart Action",
                  "States": [
                      { "Image": "images/actionIcon", "TitleAlignment": "middle", "FontSize": 10 }
                  ],
                  "Tooltip": "Paste your Smart Token",
                  "UUID": "com.rge.controller.action"
              }
          ],
          "SDKVersion": 2,
          "Author": "RGE System",
          "CodePath": "index.html",
          "PropertyInspectorPath": "pi.html",
          "Category": "RGE Cloud",
          "CategoryIcon": "images/categoryIcon",
          "Description": "Control RGE Graphics using Smart Tokens",
          "Name": "RGE Controller",
          "Icon": "images/pluginIcon",
          "Version": "3.0.0",
          "OS": [
              { "Platform": "mac", "MinimumVersion": "10.11" },
              { "Platform": "windows", "MinimumVersion": "10" }
          ],
          "Software": { "MinimumVersion": "4.1" }
      };
      folder.file("manifest.json", JSON.stringify(manifest, null, 2));

      // 2. INDEX.HTML (The Backend Logic)
      const indexHtml = `
<!DOCTYPE HTML>
<html>
<head>
    <title>RGE Plugin</title>
    <meta charset="utf-8" />
    <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
</head>
<body>
    <script>
        var websocket = null;
        var mqttClient = null;
        
        // MQTT Settings
        const MQTT_BROKER = "wss://broker.emqx.io:8084/mqtt";
        
        function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
            websocket = new WebSocket("ws://127.0.0.1:" + inPort);

            websocket.onopen = function() {
                var json = { "event": inRegisterEvent, "uuid": inPluginUUID };
                websocket.send(JSON.stringify(json));
                initMQTT(); // Ensure MQTT is ready
            };

            websocket.onmessage = function(evt) {
                var jsonObj = JSON.parse(evt.data);
                var event = jsonObj['event'];
                var payload = jsonObj['payload'] || {};

                if(event == "keyUp") {
                    handleKeyUp(jsonObj['context'], payload.settings);
                }
            };
        }

        function initMQTT() {
            if(mqttClient && mqttClient.connected) return;
            const clientId = 'rge_sd_' + Math.random().toString(16).substring(2, 8);
            mqttClient = mqtt.connect(MQTT_BROKER, { keepalive: 60, clientId: clientId, clean: true });
            mqttClient.on('connect', function () { console.log("RGE MQTT Connected"); });
            mqttClient.on('error', function (e) { console.error("RGE MQTT Error", e); });
        }

        function handleKeyUp(context, settings) {
            if(!mqttClient || !mqttClient.connected) {
                initMQTT();
                setTimeout(() => { if(!mqttClient.connected) showAlert(context); }, 500);
            }

            if(!settings || !settings.studioId || !settings.overlayId) {
                showAlert(context);
                return;
            }

            const topic = "rge/v3/" + settings.studioId + "/actions";
            let payload = {};
            const cmd = settings.actionCommand;
            const target = settings.overlayId;

            // --- SMART ACTION MAPPING ---
            
            // 1. VISIBILITY
            if(cmd === "toggle") payload = { action: "toggle_visible", targetId: target };
            else if (cmd === "set_on") payload = { action: "set_visible", targetId: target, value: true };
            else if (cmd === "set_off") payload = { action: "set_visible", targetId: target, value: false };
            
            // 2. SCOREBOARD
            else if (cmd === "score_home_plus") payload = { action: "increment_field", targetId: target, fieldId: "homeScore", amount: 1 };
            else if (cmd === "score_away_plus") payload = { action: "increment_field", targetId: target, fieldId: "awayScore", amount: 1 };
            else if (cmd === "score_home_minus") payload = { action: "increment_field", targetId: target, fieldId: "homeScore", amount: -1 };
            else if (cmd === "score_away_minus") payload = { action: "increment_field", targetId: target, fieldId: "awayScore", amount: -1 };
            
            // 3. SLIDES / SMART NEWS
            else if (cmd === "slide_next") payload = { action: "increment_field", targetId: target, fieldId: "currentPage", amount: 1 };
            else if (cmd === "slide_prev") payload = { action: "increment_field", targetId: target, fieldId: "currentPage", amount: -1 };
            else if (cmd === "slide_reset") payload = { action: "update_field", targetId: target, fieldId: "currentPage", value: 0 };

            if(payload.action) {
                mqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
                showOk(context);
            } else {
                showAlert(context);
            }
        }

        function showOk(context) { websocket.send(JSON.stringify({ event: "showOk", context: context })); }
        function showAlert(context) { websocket.send(JSON.stringify({ event: "showAlert", context: context })); }
    </script>
</body>
</html>
      `;
      folder.file("index.html", indexHtml);

      // 3. PROPERTY INSPECTOR (PI.HTML) - CONTEXT AWARE UI
      const piHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>RGE Settings</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css">
    <style>
        body { background-color: #2d2d2d; color: #b0b0b0; font-family: sans-serif; font-size: 12px; padding: 12px; }
        .sdpi-heading { color: #888; text-transform: uppercase; font-size: 10px; font-weight: bold; margin-bottom: 8px; margin-top: 16px; }
        input, select, textarea { width: 100%; padding: 6px; background: #3d3d3d; border: 1px solid #444; color: white; border-radius: 4px; box-sizing: border-box; }
        input:focus { border-color: #3b82f6; outline: none; }
        .token-box { font-family: monospace; font-size: 10px; color: #84cc16; }
        .info-box { background: #333; padding: 8px; border-radius: 4px; margin-top: 5px; display: none; border-left: 2px solid #888; }
        .info-box.valid { border-color: #84cc16; display: block; }
        .info-box.invalid { border-color: #ef4444; display: block; }
        .status-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .label { color: #888; }
        .val { color: #fff; font-weight: bold; }
        option { background: #333; }
        optgroup { color: #888; font-style: italic; }
    </style>
</head>
<body>
    <div class="sdpi-wrapper">
        
        <div class="sdpi-heading">RGE Smart Token</div>
        <input type="text" id="rawToken" class="token-box" placeholder="Paste rge_... token here" onchange="parseToken()">
        
        <div id="statusBox" class="info-box">
            <div id="statusMsg">Waiting for token...</div>
            <div id="details" style="margin-top:5px; display:none;">
                <div class="status-row"><span class="label">Name:</span> <span class="val" id="overlayName">-</span></div>
                <div class="status-row"><span class="label">Type:</span> <span class="val" id="overlayType">-</span></div>
            </div>
        </div>

        <div id="actionConfig" style="display:none;">
            <div class="sdpi-heading">Choose Action</div>
            <select id="actionCommand" onchange="saveSettings()">
                <!-- Options populated by JS based on type -->
            </select>
            <div style="margin-top:8px; font-size:10px; color:#666;">
                * This list changes based on the Smart Token type.
            </div>
        </div>

    </div>

    <script>
        var websocket = null;
        var uuid = null;
        var currentSettings = {};

        function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
            uuid = inUUID;
            websocket = new WebSocket("ws://127.0.0.1:" + inPort);
            
            const info = JSON.parse(inActionInfo);
            if(info.payload && info.payload.settings) {
                currentSettings = info.payload.settings;
                if(currentSettings.rawToken) {
                    document.getElementById('rawToken').value = currentSettings.rawToken;
                    parseToken(false); 
                }
            }

            websocket.onopen = function() {
                websocket.send(JSON.stringify({ "event": inRegisterEvent, "uuid": inUUID }));
            };
        }

        function parseToken(shouldSave = true) {
            const raw = document.getElementById('rawToken').value.trim();
            const statusBox = document.getElementById('statusBox');
            const details = document.getElementById('details');
            const actionDiv = document.getElementById('actionConfig');
            
            if(!raw.startsWith('rge_')) {
                statusBox.className = "info-box invalid";
                document.getElementById('statusMsg').innerText = "Invalid Token Format";
                details.style.display = 'none';
                actionDiv.style.display = 'none';
                return;
            }

            try {
                // Decode Smart Token
                const base64 = raw.substring(4);
                const jsonStr = decodeURIComponent(escape(window.atob(base64)));
                const data = JSON.parse(jsonStr);

                // Update UI
                statusBox.className = "info-box valid";
                document.getElementById('statusMsg').innerText = "✅ Token Verified";
                document.getElementById('overlayName').innerText = data.nm || 'Unknown';
                document.getElementById('overlayType').innerText = data.tp || 'General';
                details.style.display = 'block';

                // --- SMART POPULATION ---
                populateActions(data.tp);
                
                actionDiv.style.display = 'block';
                
                if(shouldSave) {
                    if(!currentSettings.actionCommand) {
                        document.getElementById('actionCommand').selectedIndex = 0;
                    }
                    saveSettings(data);
                } else {
                    if(currentSettings.actionCommand) {
                        document.getElementById('actionCommand').value = currentSettings.actionCommand;
                    }
                }

            } catch(e) {
                statusBox.className = "info-box invalid";
                document.getElementById('statusMsg').innerText = "Corrupt Token Data";
                console.error(e);
            }
        }

        function populateActions(type) {
            const select = document.getElementById('actionCommand');
            select.innerHTML = ''; 

            // 1. GENERAL GROUP
            const grpGeneral = document.createElement('optgroup');
            grpGeneral.label = "General Controls";
            select.appendChild(grpGeneral);
            addOption(grpGeneral, 'toggle', '👁 Toggle Visibility');
            addOption(grpGeneral, 'set_on', '🟢 Set ON AIR');
            addOption(grpGeneral, 'set_off', '🔴 Set OFF AIR');

            // 2. CONTEXT GROUP
            if(type === 'SCOREBOARD') {
                const grpScore = document.createElement('optgroup');
                grpScore.label = "Scoreboard Controls";
                select.appendChild(grpScore);
                addOption(grpScore, 'score_home_plus', '⚽ Home Score +1');
                addOption(grpScore, 'score_away_plus', '⚽ Away Score +1');
                addOption(grpScore, 'score_home_minus', '🔻 Home Score -1');
                addOption(grpScore, 'score_away_minus', '🔻 Away Score -1');
            }
            else if (type === 'SMART_NEWS') {
                const grpSlides = document.createElement('optgroup');
                grpSlides.label = "Slide Controls";
                select.appendChild(grpSlides);
                addOption(grpSlides, 'slide_next', '⏩ Next Slide');
                addOption(grpSlides, 'slide_prev', '⏪ Previous Slide');
                addOption(grpSlides, 'slide_reset', '⏮ Reset to Start');
            }
        }

        function addOption(parent, val, text) {
            var opt = document.createElement('option');
            opt.value = val;
            opt.innerHTML = text;
            parent.appendChild(opt);
        }

        function saveSettings(tokenData) {
            const raw = document.getElementById('rawToken').value;
            const cmd = document.getElementById('actionCommand').value;

            let newPayload = { 
                rawToken: raw, 
                actionCommand: cmd 
            };

            if(tokenData) {
                newPayload.studioId = tokenData.s;
                newPayload.overlayId = tokenData.id;
            } else {
                newPayload.studioId = currentSettings.studioId;
                newPayload.overlayId = currentSettings.overlayId;
            }
            
            currentSettings = newPayload; 
            var json = { "event": "setSettings", "context": uuid, "payload": newPayload };
            websocket.send(JSON.stringify(json));
        }
    </script>
</body>
</html>
      `;
      folder.file("pi.html", piHtml);

      // 4. IMAGES
      const imgFolder = folder.folder("images");
      if(imgFolder) {
          imgFolder.file("actionIcon.png", ""); 
          imgFolder.file("pluginIcon.png", ""); 
          imgFolder.file("categoryIcon.png", ""); 
      }

      // 5. DOWNLOAD
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "RGE_Smart_Controller_v3.streamDeckPlugin"; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setDownloadStatus('done');
      setTimeout(() => setDownloadStatus('idle'), 3000);
  };

  return (
    <div className="flex h-full bg-gray-950 text-white overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-72 bg-darker border-l border-gray-800 flex flex-col p-6">
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-500" />
                <span>مركز التكامل</span>
            </h1>
            <p className="text-xs text-gray-500 mb-8 leading-relaxed">
                خيارات الربط المتقدمة للتحكم في البث.
            </p>

            <div className="space-y-2">
                <button 
                    onClick={() => setActiveTab('plugin')}
                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${activeTab === 'plugin' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800'}`}
                >
                    <Grid className="w-5 h-5" />
                    <div className="text-right">
                        <div className="font-bold">Stream Deck Plugin</div>
                        <div className="text-[10px] opacity-70">إضافة RGE الأصلية</div>
                    </div>
                </button>

                <button 
                    onClick={() => setActiveTab('webdeck')}
                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${activeTab === 'webdeck' ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg' : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800'}`}
                >
                    <Smartphone className="w-5 h-5" />
                    <div className="text-right">
                        <div className="font-bold">Web Deck</div>
                        <div className="text-[10px] opacity-70">تحكم عبر الجوال</div>
                    </div>
                </button>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-950 p-10">
            
            {/* --- STREAM DECK PLUGIN SECTION --- */}
            {activeTab === 'plugin' && (
                <div className="max-w-4xl mx-auto space-y-10 animate-fade-in-up">
                    
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-4xl font-bold mb-4">RGE Smart Plugin v3</h2>
                            <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
                                نظام التحكم الذكي (Token-Based). حمل الإضافة الجديدة لتدعم التحكم الكامل (تبديل الشرائح، النتائج، الظهور).
                            </p>
                        </div>
                        <div className="bg-blue-600/20 p-4 rounded-2xl">
                             <Command className="w-16 h-16 text-blue-500" />
                        </div>
                    </div>

                    {/* Download Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                    <Box className="w-6 h-6 text-blue-400" />
                                    تثبيت الإضافة الذكية (v3.0)
                                </h3>
                                <p className="text-gray-400 mb-6 leading-relaxed">
                                    اضغط لتحميل ملف <code>.streamDeckPlugin</code>. النسخة الجديدة تفهم محتوى القالب وتعرض لك الأزرار المناسبة (مثل تقليب الشرائح للأخبار).
                                </p>
                                <button 
                                    onClick={handleDownloadPlugin}
                                    disabled={downloadStatus === 'downloading'}
                                    className={`w-full md:w-auto px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 ${
                                        downloadStatus === 'done' ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                                >
                                    {downloadStatus === 'downloading' ? (
                                        <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                                    ) : downloadStatus === 'done' ? (
                                        <Check className="w-6 h-6" />
                                    ) : (
                                        <Download className="w-6 h-6" />
                                    )}
                                    <span>{downloadStatus === 'done' ? 'تم التحميل' : 'تحميل RGE Controller v3'}</span>
                                </button>
                            </div>
                            
                            <div className="bg-black/30 p-6 rounded-xl border border-white/5 text-sm text-gray-400 space-y-3 max-w-xs">
                                <strong className="text-white block mb-2 border-b border-gray-700 pb-2">طريقة الاستخدام:</strong>
                                <p>1. ثبت الإضافة.</p>
                                <p>2. اذهب إلى صفحة <strong>المكتبة</strong>.</p>
                                <p>3. انسخ <strong>Smart Token</strong>.</p>
                                <p>4. في Stream Deck، اختر الزر ستظهر لك خيارات جديدة مثل (Next Slide).</p>
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                             <Zap className="w-8 h-8 text-yellow-500 mb-4" />
                             <h4 className="font-bold text-white mb-2">أزرار ديناميكية</h4>
                             <p className="text-xs text-gray-500">القائمة في Stream Deck تتغير حسب التوكن (أخبار = شرائح، رياضة = أهداف).</p>
                        </div>
                        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                             <Key className="w-8 h-8 text-green-500 mb-4" />
                             <h4 className="font-bold text-white mb-2">تزامن ذكي</h4>
                             <p className="text-xs text-gray-500">الأزرار تفهم حدود الشرائح ولا تتجاوز الرقم الأخير (Smart Bounds).</p>
                        </div>
                    </div>

                </div>
            )}

            {/* --- WEB DECK SECTION --- */}
            {activeTab === 'webdeck' && (
                 <div className="h-full flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-bold text-white mb-3">RGE Web Deck</h2>
                        <p className="text-gray-400 text-lg">حول هاتفك المحمول إلى وحدة تحكم Stream Deck فورية.</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-12 bg-gray-900 p-8 rounded-3xl border border-gray-800 shadow-2xl">
                        <div className="bg-white p-4 rounded-2xl shadow-inner">
                             <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href)}`} 
                                className="w-64 h-64 mix-blend-multiply"
                                alt="Scan QR"
                            />
                        </div>
                        <div className="space-y-6 max-w-md text-right">
                             <div className="flex items-start gap-4">
                                 <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">1</div>
                                 <div>
                                     <h3 className="font-bold text-white text-lg">امسح الكود</h3>
                                     <p className="text-gray-400 text-sm">افتح الكاميرا في هاتفك وامسح رمز QR الظاهر أمامك.</p>
                                 </div>
                             </div>
                             <div className="flex items-start gap-4">
                                 <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">2</div>
                                 <div>
                                     <h3 className="font-bold text-white text-lg">تحكم كامل</h3>
                                     <p className="text-gray-400 text-sm">ستظهر لك واجهة تحكم تفاعلية (Touch Interface) للتحكم في القوالب والنتائج مباشرة.</p>
                                 </div>
                             </div>
                        </div>
                    </div>
                 </div>
            )}

        </div>
    </div>
  );
};

export default Integrations;
