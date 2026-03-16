import React, { useMemo, useState } from 'react';
import { OverlayConfig } from '../types';
import { syncManager } from '../services/syncManager';
import {
  AlertTriangle,
  Box,
  Check,
  Command,
  Download,
  Grid,
  Shield,
  Smartphone,
  Wifi,
  Zap,
} from 'lucide-react';
import JSZip from 'jszip';

interface IntegrationsProps {
  overlays: OverlayConfig[];
}

const FIREBASE_COMPAT_VERSION = '10.12.2';

const Integrations: React.FC<IntegrationsProps> = ({ overlays }) => {
  const [activeTab, setActiveTab] = useState<'plugin' | 'webdeck'>('plugin');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'done'>('idle');

  const secureConfig = useMemo(() => syncManager.getSecureConfig(), []);
  const secureContext = syncManager.getSmartTokenContext();
  const secureReady = Boolean(secureConfig && secureContext);

  const handleDownloadPlugin = async () => {
    if (!secureReady || !secureConfig) return;

    setDownloadStatus('downloading');
    const zip = new JSZip();
    const pluginName = 'com.rge.secure.controller.sdPlugin';
    const folder = zip.folder(pluginName);
    if (!folder) return;

    const manifest = {
      Actions: [
        {
          Icon: 'images/actionIcon',
          Name: 'RGE Secure Action',
          States: [{ Image: 'images/actionIcon', TitleAlignment: 'middle', FontSize: 10 }],
          Tooltip: 'Paste your Smart Token',
          UUID: 'com.rge.secure.controller.action',
        },
      ],
      SDKVersion: 2,
      Author: 'RGE System',
      CodePath: 'index.html',
      PropertyInspectorPath: 'pi.html',
      Category: 'RGE Secure',
      CategoryIcon: 'images/categoryIcon',
      Description: 'Secure Firebase controller for REO Live overlays',
      Name: 'RGE Secure Controller',
      Icon: 'images/pluginIcon',
      Version: '4.0.0',
      OS: [
        { Platform: 'mac', MinimumVersion: '10.11' },
        { Platform: 'windows', MinimumVersion: '10' },
      ],
      Software: { MinimumVersion: '4.1' },
    };

    folder.file('manifest.json', JSON.stringify(manifest, null, 2));

    const publicConfig = {
      apiKey: secureConfig.apiKey,
      authDomain: secureConfig.authDomain,
      databaseURL: secureConfig.databaseURL,
      projectId: secureConfig.projectId,
      appId: secureConfig.appId,
      messagingSenderId: secureConfig.messagingSenderId,
      storageBucket: secureConfig.storageBucket,
      measurementId: secureConfig.measurementId,
    };

    const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RGE Secure Controller</title>
  <script src="https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-database-compat.js"></script>
</head>
<body>
  <script>
    var websocket = null;
    var realtimeReady = null;
    const FIREBASE_CONFIG = ${JSON.stringify(publicConfig)};

    function createCommandId() {
      return 'cmd_' + Math.random().toString(16).slice(2) + Date.now().toString(16);
    }

    function initRealtime() {
      if (realtimeReady) return realtimeReady;

      realtimeReady = new Promise(function(resolve, reject) {
        try {
          var existing = firebase.apps.filter(function(candidate) { return candidate.name === 'rge-streamdeck'; })[0];
          var app = existing || firebase.initializeApp(FIREBASE_CONFIG, 'rge-streamdeck');
          app.auth().signInAnonymously().then(function() {
            resolve(app.database());
          }).catch(reject);
        } catch (error) {
          reject(error);
        }
      });

      return realtimeReady;
    }

    function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent) {
      websocket = new WebSocket('ws://127.0.0.1:' + inPort);

      websocket.onopen = function() {
        websocket.send(JSON.stringify({ event: inRegisterEvent, uuid: inPluginUUID }));
      };

      websocket.onmessage = function(evt) {
        var jsonObj = JSON.parse(evt.data);
        if (jsonObj.event === 'keyUp') {
          handleKeyUp(jsonObj.context, (jsonObj.payload || {}).settings || {});
        }
      };
    }

    async function handleKeyUp(context, settings) {
      if (!settings || !settings.studioId || !settings.overlayId || !settings.controlKey) {
        return showAlert(context);
      }

      var payload = mapCommand(settings.actionCommand, settings.overlayId);
      if (!payload) return showAlert(context);

      try {
        var database = await initRealtime();
        var commandRef = database.ref('rgeSecure/v1/studios/' + settings.studioId + '/commands/' + settings.controlKey + '/latest');
        await commandRef.set(Object.assign({}, payload, {
          commandId: createCommandId(),
          issuedAt: Date.now()
        }));
        showOk(context);
      } catch (error) {
        console.error('RGE secure command failed', error);
        showAlert(context);
      }
    }

    function mapCommand(cmd, target) {
      if (cmd === 'toggle') return { action: 'toggle_visible', targetId: target };
      if (cmd === 'set_on') return { action: 'set_visible', targetId: target, value: true };
      if (cmd === 'set_off') return { action: 'set_visible', targetId: target, value: false };
      if (cmd === 'score_home_plus') return { action: 'increment_field', targetId: target, fieldId: 'homeScore', amount: 1 };
      if (cmd === 'score_away_plus') return { action: 'increment_field', targetId: target, fieldId: 'awayScore', amount: 1 };
      if (cmd === 'score_home_minus') return { action: 'increment_field', targetId: target, fieldId: 'homeScore', amount: -1 };
      if (cmd === 'score_away_minus') return { action: 'increment_field', targetId: target, fieldId: 'awayScore', amount: -1 };
      if (cmd === 'slide_next') return { action: 'increment_field', targetId: target, fieldId: 'currentPage', amount: 1 };
      if (cmd === 'slide_prev') return { action: 'increment_field', targetId: target, fieldId: 'currentPage', amount: -1 };
      if (cmd === 'slide_reset') return { action: 'update_field', targetId: target, fieldId: 'currentPage', value: 0 };
      return null;
    }

    function showOk(context) {
      websocket.send(JSON.stringify({ event: 'showOk', context: context }));
    }

    function showAlert(context) {
      websocket.send(JSON.stringify({ event: 'showAlert', context: context }));
    }
  </script>
</body>
</html>`;

    folder.file('index.html', indexHtml);

    const piHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RGE Secure Settings</title>
  <style>
    body { background-color: #2d2d2d; color: #b0b0b0; font-family: sans-serif; font-size: 12px; padding: 12px; }
    .sdpi-heading { color: #888; text-transform: uppercase; font-size: 10px; font-weight: bold; margin-bottom: 8px; margin-top: 16px; }
    input, select { width: 100%; padding: 6px; background: #3d3d3d; border: 1px solid #444; color: white; border-radius: 4px; box-sizing: border-box; }
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
      <select id="actionCommand" onchange="saveSettings()"></select>
      <div style="margin-top:8px; font-size:10px; color:#666;">
        This list changes based on the Smart Token type.
      </div>
    </div>
  </div>

  <script>
    var websocket = null;
    var uuid = null;
    var currentSettings = {};

    function decodeBase64Url(input) {
      input = input.replace(/-/g, '+').replace(/_/g, '/');
      while (input.length % 4) input += '=';
      return decodeURIComponent(Array.prototype.map.call(atob(input), function(char) {
        return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    }

    function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
      uuid = inUUID;
      websocket = new WebSocket('ws://127.0.0.1:' + inPort);

      var info = JSON.parse(inActionInfo);
      if (info.payload && info.payload.settings) {
        currentSettings = info.payload.settings;
        if (currentSettings.rawToken) {
          document.getElementById('rawToken').value = currentSettings.rawToken;
          parseToken(false);
        }
      }

      websocket.onopen = function() {
        websocket.send(JSON.stringify({ event: inRegisterEvent, uuid: inUUID }));
      };
    }

    function parseToken(shouldSave) {
      if (shouldSave === undefined) shouldSave = true;
      var raw = document.getElementById('rawToken').value.trim();
      var statusBox = document.getElementById('statusBox');
      var details = document.getElementById('details');
      var actionDiv = document.getElementById('actionConfig');

      if (!raw.startsWith('rge_')) {
        statusBox.className = 'info-box invalid';
        document.getElementById('statusMsg').innerText = 'Invalid Token Format';
        details.style.display = 'none';
        actionDiv.style.display = 'none';
        return;
      }

      try {
        var payload = JSON.parse(decodeBase64Url(raw.substring(4)));
        if (!payload.ct) {
          statusBox.className = 'info-box invalid';
          document.getElementById('statusMsg').innerText = 'Secure sync is not enabled for this token';
          details.style.display = 'none';
          actionDiv.style.display = 'none';
          return;
        }

        statusBox.className = 'info-box valid';
        document.getElementById('statusMsg').innerText = 'Token verified';
        document.getElementById('overlayName').innerText = payload.nm || 'Unknown';
        document.getElementById('overlayType').innerText = payload.tp || 'General';
        details.style.display = 'block';

        populateActions(payload.tp);
        actionDiv.style.display = 'block';

        if (shouldSave) {
          if (!currentSettings.actionCommand) {
            document.getElementById('actionCommand').selectedIndex = 0;
          }
          saveSettings(payload);
        } else if (currentSettings.actionCommand) {
          document.getElementById('actionCommand').value = currentSettings.actionCommand;
        }
      } catch (error) {
        statusBox.className = 'info-box invalid';
        document.getElementById('statusMsg').innerText = 'Corrupt Token Data';
        details.style.display = 'none';
        actionDiv.style.display = 'none';
      }
    }

    function populateActions(type) {
      var select = document.getElementById('actionCommand');
      select.innerHTML = '';

      var general = document.createElement('optgroup');
      general.label = 'General Controls';
      select.appendChild(general);
      addOption(general, 'toggle', 'Toggle Visibility');
      addOption(general, 'set_on', 'Set ON AIR');
      addOption(general, 'set_off', 'Set OFF AIR');

      if (type === 'SCOREBOARD') {
        var score = document.createElement('optgroup');
        score.label = 'Scoreboard Controls';
        select.appendChild(score);
        addOption(score, 'score_home_plus', 'Home Score +1');
        addOption(score, 'score_away_plus', 'Away Score +1');
        addOption(score, 'score_home_minus', 'Home Score -1');
        addOption(score, 'score_away_minus', 'Away Score -1');
      } else if (type === 'SMART_NEWS') {
        var slides = document.createElement('optgroup');
        slides.label = 'Slide Controls';
        select.appendChild(slides);
        addOption(slides, 'slide_next', 'Next Slide');
        addOption(slides, 'slide_prev', 'Previous Slide');
        addOption(slides, 'slide_reset', 'Reset to Start');
      }
    }

    function addOption(parent, value, text) {
      var option = document.createElement('option');
      option.value = value;
      option.innerText = text;
      parent.appendChild(option);
    }

    function saveSettings(tokenData) {
      var payload = {
        rawToken: document.getElementById('rawToken').value,
        actionCommand: document.getElementById('actionCommand').value
      };

      if (tokenData) {
        payload.studioId = tokenData.s;
        payload.overlayId = tokenData.id;
        payload.controlKey = tokenData.ct;
      } else {
        payload.studioId = currentSettings.studioId;
        payload.overlayId = currentSettings.overlayId;
        payload.controlKey = currentSettings.controlKey;
      }

      currentSettings = payload;
      websocket.send(JSON.stringify({ event: 'setSettings', context: uuid, payload: payload }));
    }
  </script>
</body>
</html>`;

    folder.file('pi.html', piHtml);

    const images = folder.folder('images');
    if (images) {
      images.file('actionIcon.png', '');
      images.file('pluginIcon.png', '');
      images.file('categoryIcon.png', '');
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RGE_Secure_Controller_v4.streamDeckPlugin';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadStatus('done');
    setTimeout(() => setDownloadStatus('idle'), 3000);
  };

  return (
    <div className="flex h-full overflow-hidden bg-gray-950 text-white">
      <div className="w-72 border-l border-gray-800 bg-darker p-6">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
          <Shield className="h-6 w-6 text-blue-500" />
          <span>التكاملات</span>
        </h1>
        <p className="mb-8 text-xs leading-6 text-gray-500">
          الربط الخارجي انتقل الآن إلى طبقة آمنة مبنية على Firebase وقوالب Smart Tokens المحدثة.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => setActiveTab('plugin')}
            className={`w-full rounded-xl px-4 py-4 text-right transition-all ${
              activeTab === 'plugin'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Grid className="h-5 w-5" />
              <div>
                <div className="font-bold">Stream Deck Plugin</div>
                <div className="text-[10px] opacity-70">نسخة مؤمنة بـ Firebase</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('webdeck')}
            className={`w-full rounded-xl px-4 py-4 text-right transition-all ${
              activeTab === 'webdeck'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg'
                : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5" />
              <div>
                <div className="font-bold">Web Deck</div>
                <div className="text-[10px] opacity-70">تحكم عبر الهاتف</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10">
        {activeTab === 'plugin' && (
          <div className="mx-auto max-w-5xl space-y-8 animate-fade-in-up">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="mb-4 text-4xl font-black">RGE Secure Plugin</h2>
                <p className="max-w-2xl text-lg leading-8 text-gray-400">
                  هذه النسخة لم تعد تستخدم broker عام أو MQTT مفتوح. الأوامر تنتقل الآن إلى
                  Firebase Realtime من خلال مفاتيح تحكم خاصة داخل Smart Token.
                </p>
              </div>
              <div className="rounded-3xl bg-blue-600/20 p-4">
                <Command className="h-16 w-16 text-blue-400" />
              </div>
            </div>

            {!secureReady ? (
              <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-8">
                <div className="mb-3 flex items-center gap-3 text-yellow-100">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-lg font-bold">التكامل الآمن غير مُعد بعد</span>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-yellow-50/80">
                  قبل تنزيل الإضافة، افتح صفحة <strong>الحماية والربط</strong> وأضف Web Config
                  الخاص بـ Firebase مع القواعد الآمنة. بدون ذلك ستبقى الإضافة بدون مسار تحكم
                  خارجي موثوق.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-3xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl">
                  <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500" />
                  <div className="flex flex-col gap-8 p-8 md:flex-row md:items-center">
                    <div className="flex-1">
                      <h3 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white">
                        <Box className="h-6 w-6 text-blue-400" />
                        تنزيل إضافة Stream Deck الآمنة
                      </h3>
                      <p className="mb-6 max-w-2xl text-sm leading-7 text-gray-400">
                        الإضافة ستُنشأ وفي داخلها إعدادات Firebase العامة فقط، بينما صلاحية
                        التحكم الفعلية تأتي من Smart Token لكل قالب على حدة.
                      </p>
                      <button
                        onClick={handleDownloadPlugin}
                        disabled={downloadStatus === 'downloading'}
                        className={`inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-lg font-bold transition-all ${
                          downloadStatus === 'done'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                      >
                        {downloadStatus === 'downloading' ? (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : downloadStatus === 'done' ? (
                          <Check className="h-6 w-6" />
                        ) : (
                          <Download className="h-6 w-6" />
                        )}
                        <span>
                          {downloadStatus === 'done'
                            ? 'تم إنشاء الإضافة'
                            : 'تنزيل RGE Secure Controller'}
                        </span>
                      </button>
                    </div>

                    <div className="max-w-sm rounded-2xl border border-white/5 bg-black/20 p-6 text-sm text-gray-300">
                      <strong className="mb-3 block border-b border-gray-700 pb-2 text-white">
                        آلية التشغيل الجديدة
                      </strong>
                      <p className="mb-2">1. أنشئ أو حدّث الربط الآمن من صفحة الحماية.</p>
                      <p className="mb-2">2. من المكتبة انسخ Smart Token الخاص بالقالب المطلوب.</p>
                      <p className="mb-2">3. ألصق التوكن داخل Stream Deck.</p>
                      <p>4. الأوامر ستصل مباشرة إلى قناة التحكم الخاصة بهذا الاستوديو فقط.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
                    <Zap className="mb-4 h-8 w-8 text-yellow-500" />
                    <h4 className="mb-2 font-bold text-white">أوامر ذكية حسب النوع</h4>
                    <p className="text-xs leading-6 text-gray-500">
                      القوائم داخل Stream Deck تتغير حسب القالب نفسه: أخبار، نتائج، شرائح، أو
                      انتخابات.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
                    <Shield className="mb-4 h-8 w-8 text-emerald-500" />
                    <h4 className="mb-2 font-bold text-white">تحكم بمفتاح خاص</h4>
                    <p className="text-xs leading-6 text-gray-500">
                      كل Smart Token يحمل مفتاح تحكم خاص، ولا يعتمد بعد الآن على studio id وحده.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
                    <Wifi className="mb-4 h-8 w-8 text-blue-500" />
                    <h4 className="mb-2 font-bold text-white">متوافق مع الربط الحالي</h4>
                    <p className="text-xs leading-6 text-gray-500">
                      القوالب الحالية ستعمل كما هي، لكن الربط الخارجي ينتقل إلى المسار الآمن عند
                      ضبط الإعدادات.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'webdeck' && (
          <div className="flex h-full flex-col items-center justify-center animate-fade-in-up">
            <div className="mb-10 text-center">
              <h2 className="mb-3 text-4xl font-black text-white">RGE Web Deck</h2>
              <p className="text-lg text-gray-400">
                افتح واجهة التحكم نفسها من هاتفك وحوّله إلى سطح تحكم مخصص للبث.
              </p>
            </div>

            <div className="flex flex-col items-center gap-12 rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-2xl md:flex-row">
              <div className="rounded-2xl bg-white p-4 shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href)}`}
                  className="h-64 w-64 mix-blend-multiply"
                  alt="Scan QR"
                />
              </div>

              <div className="max-w-md space-y-6 text-right">
                <div>
                  <div className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-blue-400">
                    Remote Companion
                  </div>
                  <p className="text-sm leading-7 text-gray-400">
                    عند فتح هذه الصفحة من الهاتف يمكنك التحكم في الأداة نفسها، ومتابعة القوالب
                    النشطة وعددها الحالي: <strong className="text-white">{overlays.length}</strong>.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm leading-7 text-gray-300">
                  إذا أردت تحكمًا حقيقيًا من خارج الجهاز، فعّل الربط الآمن أولاً ثم استخدم Smart
                  Tokens أو إضافة Stream Deck المولدة من هذه الصفحة.
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
