import React, { useState } from 'react';
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

const STREAM_DECK_ICON_PNG_BASE64 = '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';

const Integrations: React.FC<IntegrationsProps> = ({ overlays }) => {
  const [activeTab, setActiveTab] = useState<'plugin' | 'webdeck'>('plugin');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'done'>('idle');

  const secureContext = syncManager.getSmartTokenContext();
  const secureReady = Boolean(secureContext);

  const handleDownloadPlugin = async () => {
    if (!secureReady) return;

    setDownloadStatus('downloading');
    const zip = new JSZip();
    const pluginName = 'com.rge.secure.controller.sdPlugin';
    const folder = zip.folder(pluginName);
    if (!folder) return;

    const manifest = {
      Actions: [
        {
          Icon: 'images/actionIcon',
          Name: 'RGE Live Action',
          States: [{ Image: 'images/actionIcon', TitleAlignment: 'middle', FontSize: 10 }],
          Tooltip: 'Paste your Smart Token',
          UUID: 'com.rge.secure.controller.action',
        },
      ],
      SDKVersion: 2,
      Author: 'RGE System',
      CodePath: 'index.html',
      PropertyInspectorPath: 'pi.html',
      Category: 'RGE Live',
      CategoryIcon: 'images/categoryIcon',
      Description: 'Official Live API controller for REO Live overlays',
      Name: 'RGE Live Controller',
      Icon: 'images/pluginIcon',
      Version: '4.5.0',
      OS: [
        { Platform: 'mac', MinimumVersion: '10.11' },
        { Platform: 'windows', MinimumVersion: '10' },
      ],
      Software: { MinimumVersion: '4.1' },
    };

    folder.file('manifest.json', JSON.stringify(manifest, null, 2));

    const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RGE Live Controller</title>
</head>
<body>
  <script>
    var websocket = null;
    const DEFAULT_CONTROL_KEY = 'studio-live-control';
    const DEFAULT_SITE_URL = 'https://barcelona-elections-2026.vercel.app';

    function createCommandId() {
      return 'cmd_' + Math.random().toString(16).slice(2) + Date.now().toString(16);
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

      var payload = mapCommand(settings.actionCommand, settings.overlayId, settings);
      if (!payload) return showAlert(context);

      try {
        var result = await sendLiveApiCommand(settings, payload);
        setButtonFeedback(context, settings, payload, result.nextState);
        showOk(context);
      } catch (error) {
        console.error('RGE Live API command failed', error);
        showAlert(context);
      }
    }

    async function sendLiveApiCommand(settings, payload) {
      var urls = [settings.siteUrl, DEFAULT_SITE_URL].filter(Boolean)
        .map(function(url) { return String(url).replace(/\\/+$/, ''); })
        .filter(function(url, index, list) { return /^https?:\\/\\//i.test(url) && list.indexOf(url) === index; });

      var lastError = null;
      for (var i = 0; i < urls.length; i += 1) {
        var endpoint = urls[i] + '/api/live?id=' + encodeURIComponent(settings.overlayId);
        try {
          var getResponse = await fetch(endpoint + '&_=' + Date.now(), { cache: 'no-store' });
          if (!getResponse.ok) throw new Error('GET ' + getResponse.status);
          var entry = await getResponse.json();
          var state = extractLiveState(entry);
          if (!state) throw new Error('No live state published for this overlay');
          var nextState = applyLiveCommand(state, payload);
          var postResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ state: nextState, clientVersion: Date.now() })
          });
          if (!postResponse.ok) throw new Error('POST ' + postResponse.status);
          return { previousState: state, nextState: nextState };
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error('Live API did not accept command');
    }

    function extractLiveState(entry) {
      if (!entry) return null;
      if (entry.state && typeof entry.state === 'object') return entry.state;
      if (entry.id && Array.isArray(entry.fields)) return entry;
      return null;
    }

    function applyLiveCommand(state, command) {
      var next = Object.assign({}, state);
      var fields = Array.isArray(state.fields) ? state.fields : [];

      if (command.action === 'toggle_visible') {
        next.isVisible = !Boolean(state.isVisible);
      } else if (command.action === 'set_visible') {
        next.isVisible = Boolean(command.value);
      } else if (command.action === 'update_field') {
        next.fields = setFieldValue(fields, command.fieldId, command.value, command.fieldMeta);
      } else if (command.action === 'toggle_field') {
        var field = fields.find(function(candidate) { return candidate.id === command.fieldId; });
        var fallback = 'fallback' in command ? Boolean(command.fallback) : false;
        next.fields = setFieldValue(fields, command.fieldId, !Boolean(field ? field.value : fallback), command.fieldMeta);
      } else if (command.action === 'update_fields') {
        next.fields = (command.fields || []).reduce(function(acc, item) {
          return setFieldValue(acc, item.fieldId, item.value, item.fieldMeta);
        }, fields);
      } else if (command.action === 'increment_field') {
        next.fields = fields.map(function(field) {
          if (field.id !== command.fieldId) return field;
          var currentValue = Number(field.value) || 0;
          return Object.assign({}, field, { value: Math.max(0, currentValue + Number(command.amount || 0)) });
        });
      }

      return next;
    }

    function setFieldValue(fields, fieldId, value, fieldMeta) {
      var hasField = fields.some(function(field) { return field.id === fieldId; });
      if (hasField) {
        return fields.map(function(field) {
          return field.id === fieldId ? Object.assign({}, field, { value: value }) : field;
        });
      }

      var meta = fieldMeta || getKnownFieldMeta(fieldId);
      if (!meta) return fields;
      return fields.concat([Object.assign({}, meta, { id: fieldId, value: value })]);
    }

    function getTokenFieldMeta(settings, fieldId) {
      var fields = Array.isArray(settings.tokenFields) ? settings.tokenFields : [];
      var field = fields.find(function(candidate) { return candidate.id === fieldId; });
      if (!field) return null;
      var type = normalizeTokenFieldType(field.ty);
      var meta = { label: field.lb || field.id, type: type };
      if (field.min !== undefined) meta.min = field.min;
      if (field.max !== undefined) meta.max = field.max;
      if (field.step !== undefined) meta.step = field.step;
      return meta;
    }

    function normalizeTokenFieldType(type) {
      if (type === 'boolean' || type === 'number' || type === 'range' || type === 'select' || type === 'color' || type === 'image' || type === 'text') {
        return type;
      }
      return 'text';
    }

    function getKnownFieldMeta(fieldId) {
      var known = {
        soundEnabled: { label: 'تفعيل الصوت', type: 'boolean' },
        sfxEnabled: { label: 'تفعيل المؤثرات', type: 'boolean' },
        voiceEnabled: { label: 'تفعيل الصوت الحقيقي', type: 'boolean' },
        soundVolume: { label: 'مستوى الصوت', type: 'range', min: 0, max: 3, step: 0.05 },
        audioUpdateCue: { label: 'مؤثر التحديث', type: 'hidden' },
        audioSceneId: { label: 'مشهد الصوت', type: 'hidden' },
        positionX: { label: 'إزاحة أفقية (X)', type: 'range', min: -1500, max: 1500, step: 10 },
        positionY: { label: 'إزاحة عمودية (Y)', type: 'range', min: -1000, max: 1000, step: 10 },
        scale: { label: 'حجم القالب', type: 'range', min: 0.5, max: 3, step: 0.05 },
        currentPage: { label: 'رقم الصفحة', type: 'number' }
      };
      return known[fieldId] || null;
    }

    function getFieldValue(state, fieldId, fallback) {
      var fields = Array.isArray(state.fields) ? state.fields : [];
      var field = fields.find(function(candidate) { return candidate.id === fieldId; });
      return field ? field.value : fallback;
    }

    function setButtonFeedback(context, settings, command, state) {
      try {
        var title = buildButtonFeedbackTitle(settings.actionCommand, command, state);
        if (title) setButtonTitle(context, title);
      } catch (error) {
        console.warn('Could not update Stream Deck title feedback', error);
      }
    }

    function buildButtonFeedbackTitle(cmd, command, state) {
      if (!state) return '';
      if (command.action === 'set_visible' || command.action === 'toggle_visible') {
        return state.isVisible ? 'LIVE' : 'OFF';
      }
      if (cmd === 'audio_toggle' || cmd === 'audio_on' || cmd === 'audio_off') {
        return Boolean(getFieldValue(state, 'soundEnabled', true)) ? 'AUDIO\\nON' : 'AUDIO\\nOFF';
      }
      if (cmd === 'sfx_toggle') {
        return Boolean(getFieldValue(state, 'sfxEnabled', true)) ? 'SFX\\nON' : 'SFX\\nOFF';
      }
      if (cmd === 'voice_toggle') {
        return Boolean(getFieldValue(state, 'voiceEnabled', false)) ? 'VOICE\\nON' : 'VOICE\\nOFF';
      }
      if (cmd === 'audio_reset') return 'AUDIO\\nRESET';
      if (cmd === 'transform_reset') return 'RESET\\nPOS';
      if (cmd === 'score_home_plus' || cmd === 'score_home_minus') {
        return 'HOME\\n' + String(getFieldValue(state, 'homeScore', 0));
      }
      if (cmd === 'score_away_plus' || cmd === 'score_away_minus') {
        return 'AWAY\\n' + String(getFieldValue(state, 'awayScore', 0));
      }
      if (cmd === 'slide_next' || cmd === 'slide_prev' || cmd === 'slide_reset') {
        return 'PAGE\\n' + String((Number(getFieldValue(state, 'currentPage', 0)) || 0) + 1);
      }
      return state.isVisible ? 'LIVE' : 'OFF';
    }

    function setButtonTitle(context, title) {
      websocket.send(JSON.stringify({
        event: 'setTitle',
        context: context,
        payload: { title: title, target: 0 }
      }));
    }

    function mapCommand(cmd, target, settings) {
      if (cmd && cmd.indexOf('field_toggle:') === 0) {
        var fieldId = cmd.substring('field_toggle:'.length);
        return { action: 'toggle_field', targetId: target, fieldId: fieldId, fallback: false, fieldMeta: getTokenFieldMeta(settings || {}, fieldId) };
      }
      if (cmd === 'toggle') return { action: 'set_visible', targetId: target, value: true };
      if (cmd === 'set_on') return { action: 'set_visible', targetId: target, value: true };
      if (cmd === 'set_off') return { action: 'set_visible', targetId: target, value: false };
      if (cmd === 'audio_toggle') return { action: 'toggle_field', targetId: target, fieldId: 'soundEnabled', fallback: true };
      if (cmd === 'audio_on') return { action: 'update_field', targetId: target, fieldId: 'soundEnabled', value: true };
      if (cmd === 'audio_off') return { action: 'update_field', targetId: target, fieldId: 'soundEnabled', value: false };
      if (cmd === 'sfx_toggle') return { action: 'toggle_field', targetId: target, fieldId: 'sfxEnabled', fallback: true };
      if (cmd === 'voice_toggle') return { action: 'toggle_field', targetId: target, fieldId: 'voiceEnabled', fallback: false };
      if (cmd === 'audio_reset') {
        return {
          action: 'update_fields',
          targetId: target,
          fields: [
            { fieldId: 'soundEnabled', value: true },
            { fieldId: 'sfxEnabled', value: true },
            { fieldId: 'voiceEnabled', value: false },
            { fieldId: 'soundVolume', value: 0.55 },
            { fieldId: 'audioUpdateCue', value: '' },
            { fieldId: 'audioSceneId', value: '' }
          ]
        };
      }
      if (cmd === 'transform_reset') {
        return {
          action: 'update_fields',
          targetId: target,
          fields: [
            { fieldId: 'positionX', value: 0 },
            { fieldId: 'positionY', value: 0 },
            { fieldId: 'scale', value: 1 }
          ]
        };
      }
      if (cmd === 'score_home_plus') return { action: 'increment_field', targetId: target, fieldId: 'homeScore', amount: 1 };
      if (cmd === 'score_away_plus') return { action: 'increment_field', targetId: target, fieldId: 'awayScore', amount: 1 };
      if (cmd === 'score_home_minus') return { action: 'increment_field', targetId: target, fieldId: 'homeScore', amount: -1 };
      if (cmd === 'score_away_minus') return { action: 'increment_field', targetId: target, fieldId: 'awayScore', amount: -1 };
      if (cmd === 'slide_next') return { action: 'increment_field', targetId: target, fieldId: 'currentPage', amount: 1 };
      if (cmd === 'slide_prev') return { action: 'increment_field', targetId: target, fieldId: 'currentPage', amount: -1 };
      if (cmd === 'slide_reset') return { action: 'update_field', targetId: target, fieldId: 'currentPage', value: 0 };
      if (cmd === 'probability_old') return { action: 'update_field', targetId: target, fieldId: 'probabilityShiftMode', value: 'old' };
      if (cmd === 'probability_today') return { action: 'update_field', targetId: target, fieldId: 'probabilityShiftMode', value: 'new' };
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
  <title>RGE Live Settings</title>
  <style>
    body { background-color: #2d2d2d; color: #b0b0b0; font-family: sans-serif; font-size: 12px; padding: 12px; }
    .sdpi-heading { color: #888; text-transform: uppercase; font-size: 10px; font-weight: bold; margin-bottom: 8px; margin-top: 16px; }
    input, select { width: 100%; padding: 6px; background: #3d3d3d; border: 1px solid #444; color: white; border-radius: 4px; box-sizing: border-box; }
    input:focus { border-color: #3b82f6; outline: none; }
    .token-box { font-family: monospace; font-size: 10px; color: #84cc16; }
    .info-box { background: #333; padding: 8px; border-radius: 4px; margin-top: 5px; display: none; border-left: 2px solid #888; }
    .info-box.valid { border-color: #84cc16; display: block; }
    .info-box.invalid { border-color: #ef4444; display: block; }
    .warning-box { background: rgba(245,158,11,.14); border: 1px solid rgba(245,158,11,.35); color: #fde68a; padding: 7px; border-radius: 4px; margin-top: 8px; display: none; line-height: 1.5; font-size: 10px; }
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
        <div class="status-row"><span class="label">Template:</span> <span class="val" id="templateId">-</span></div>
        <div class="status-row"><span class="label">Fields:</span> <span class="val" id="fieldCount">0</span></div>
        <div class="status-row"><span class="label">Capabilities:</span> <span class="val" id="capabilityList">-</span></div>
      </div>
    </div>

    <div id="actionConfig" style="display:none;">
      <div class="sdpi-heading">Choose Action</div>
      <select id="actionCommand" onchange="saveSettings()"></select>
      <div id="toggleWarning" class="warning-box">
        Legacy Toggle is converted to safe Show in v4.5, so it will not hide a live template. Use Hide / TAKE OUT for خروج.
      </div>
      <div style="margin-top:8px; font-size:10px; color:#666;">
        This list changes based on the Smart Token type.
      </div>
    </div>
  </div>

  <script>
    var websocket = null;
    var uuid = null;
    var currentSettings = {};
    var currentTokenData = null;

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
        currentTokenData = null;
        details.style.display = 'none';
        actionDiv.style.display = 'none';
        return;
      }

      try {
        var payload = JSON.parse(decodeBase64Url(raw.substring(4)));
        payload.ct = payload.ct || 'studio-live-control';
        payload.fs = Array.isArray(payload.fs) ? payload.fs : [];
        payload.cap = Array.isArray(payload.cap) ? payload.cap : [];
        currentTokenData = payload;

        statusBox.className = 'info-box valid';
        document.getElementById('statusMsg').innerText = 'Token verified';
        document.getElementById('overlayName').innerText = payload.nm || 'Unknown';
        document.getElementById('overlayType').innerText = payload.tp || 'General';
        document.getElementById('templateId').innerText = payload.tid || payload.id || '-';
        document.getElementById('fieldCount').innerText = String(payload.fs.length || 0);
        document.getElementById('capabilityList').innerText = payload.cap.length ? payload.cap.join(', ') : 'visibility';
        details.style.display = 'block';

        populateActions(payload);
        actionDiv.style.display = 'block';

        if (shouldSave) {
          if (!currentSettings.actionCommand) {
            document.getElementById('actionCommand').selectedIndex = 0;
          }
          saveSettings(payload);
        } else if (currentSettings.actionCommand) {
          document.getElementById('actionCommand').value = currentSettings.actionCommand;
        }
        updateToggleWarning();
      } catch (error) {
        statusBox.className = 'info-box invalid';
        document.getElementById('statusMsg').innerText = 'Corrupt Token Data';
        currentTokenData = null;
        details.style.display = 'none';
        actionDiv.style.display = 'none';
      }
    }

    function populateActions(token) {
      var select = document.getElementById('actionCommand');
      select.innerHTML = '';
      var type = token.tp || 'GENERAL';
      var fields = Array.isArray(token.fs) ? token.fs : [];
      var caps = Array.isArray(token.cap) ? token.cap : [];
      var fieldIds = fields.map(function(field) { return field.id; });
      var hasField = function(id) { return fieldIds.indexOf(id) !== -1; };
      var hasCap = function(id) { return caps.indexOf(id) !== -1; };

      var general = document.createElement('optgroup');
      general.label = 'Safe visibility';
      select.appendChild(general);
      addOption(general, 'set_on', 'Show / TAKE IN');
      addOption(general, 'set_off', 'Hide / TAKE OUT');
      addOption(general, 'toggle', 'Legacy Toggle - safe Show');

      if (hasCap('audio') || ['soundEnabled', 'sfxEnabled', 'voiceEnabled', 'soundVolume'].some(hasField)) {
        var audio = document.createElement('optgroup');
        audio.label = 'Audio controls';
        select.appendChild(audio);
        addOption(audio, 'audio_toggle', 'Toggle master audio');
        addOption(audio, 'audio_on', 'Audio ON');
        addOption(audio, 'audio_off', 'Audio OFF');
        if (hasField('sfxEnabled')) addOption(audio, 'sfx_toggle', 'Toggle SFX');
        if (hasField('voiceEnabled')) addOption(audio, 'voice_toggle', 'Toggle voice');
        addOption(audio, 'audio_reset', 'Reset Audio Safe');
      }

      if (hasCap('transform') || ['positionX', 'positionY', 'scale'].some(hasField)) {
        var layout = document.createElement('optgroup');
        layout.label = 'Transform';
        select.appendChild(layout);
        addOption(layout, 'transform_reset', 'Reset Position / Scale');
      }

      if (hasCap('scoreboard') || (hasField('homeScore') && hasField('awayScore')) || type === 'SCOREBOARD') {
        var score = document.createElement('optgroup');
        score.label = 'Scoreboard';
        select.appendChild(score);
        addOption(score, 'score_home_plus', 'Home Score +1');
        addOption(score, 'score_away_plus', 'Away Score +1');
        addOption(score, 'score_home_minus', 'Home Score -1');
        addOption(score, 'score_away_minus', 'Away Score -1');
      }

      if (hasCap('paging') || hasField('currentPage') || type === 'SMART_NEWS') {
        var slides = document.createElement('optgroup');
        slides.label = 'Pages / Slides';
        select.appendChild(slides);
        addOption(slides, 'slide_next', 'Next Slide');
        addOption(slides, 'slide_prev', 'Previous Slide');
        addOption(slides, 'slide_reset', 'Reset to Start');
      }

      if (hasCap('probability-shift') || hasField('probabilityShiftMode')) {
        var probability = document.createElement('optgroup');
        probability.label = 'Probability shift';
        select.appendChild(probability);
        addOption(probability, 'probability_old', 'Show old probabilities');
        addOption(probability, 'probability_today', 'Show today update');
      }

      var dynamicBooleans = fields.filter(function(field) {
        return field.ty === 'boolean'
          && ['soundEnabled', 'sfxEnabled', 'voiceEnabled', 'mediaMuted'].indexOf(field.id) === -1;
      }).slice(0, 12);

      if (dynamicBooleans.length > 0) {
        var toggles = document.createElement('optgroup');
        toggles.label = 'Template toggles from token';
        select.appendChild(toggles);
        dynamicBooleans.forEach(function(field) {
          addOption(toggles, 'field_toggle:' + field.id, 'Toggle ' + (field.lb || field.id));
        });
      }
    }

    function addOption(parent, value, text) {
      var option = document.createElement('option');
      option.value = value;
      option.innerText = text;
      parent.appendChild(option);
    }

    function saveSettings(tokenData) {
      var sourceToken = tokenData || currentTokenData || {};
      var payload = {
        rawToken: document.getElementById('rawToken').value,
        actionCommand: document.getElementById('actionCommand').value,
        tokenFields: Array.isArray(sourceToken.fs) ? sourceToken.fs : (currentSettings.tokenFields || []),
        tokenCaps: Array.isArray(sourceToken.cap) ? sourceToken.cap : (currentSettings.tokenCaps || [])
      };
      updateToggleWarning();

      if (tokenData) {
        payload.studioId = tokenData.s;
        payload.overlayId = tokenData.id;
        payload.controlKey = tokenData.ct || 'studio-live-control';
        payload.siteUrl = tokenData.u || 'https://barcelona-elections-2026.vercel.app';
      } else {
        payload.studioId = currentSettings.studioId;
        payload.overlayId = currentSettings.overlayId;
        payload.controlKey = currentSettings.controlKey;
        payload.siteUrl = currentSettings.siteUrl;
      }

      currentSettings = payload;
      websocket.send(JSON.stringify({ event: 'setSettings', context: uuid, payload: payload }));
    }

    function updateToggleWarning() {
      var warning = document.getElementById('toggleWarning');
      var select = document.getElementById('actionCommand');
      if (warning && select) warning.style.display = select.value === 'toggle' ? 'block' : 'none';
    }
  </script>
</body>
</html>`;

    folder.file('pi.html', piHtml);

    const images = folder.folder('images');
    if (images) {
      images.file('actionIcon.png', STREAM_DECK_ICON_PNG_BASE64, { base64: true });
      images.file('pluginIcon.png', STREAM_DECK_ICON_PNG_BASE64, { base64: true });
      images.file('categoryIcon.png', STREAM_DECK_ICON_PNG_BASE64, { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RGE_Live_Controller_v4_5.streamDeckPlugin';
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
          Stream Deck يعمل الآن رسميًا عبر Live API وSmart Tokens بدون مسار Firebase افتراضي.
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
                <div className="text-[10px] opacity-70">Live API official path</div>
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
                <h2 className="mb-4 text-4xl font-black">RGE Live API Plugin</h2>
                <p className="max-w-2xl text-lg leading-8 text-gray-400">
                  هذه النسخة لم تعد تستخدم broker عام أو MQTT مفتوح. الأوامر تنتقل الآن إلى
                  Live API عبر /api/live، وFirebase لم يعد مسار التحكم الافتراضي.
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
                  الخاص بـ Live API. بدون ذلك ستبقى الإضافة بدون مسار تحكم
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
                        الإضافة ستُنشأ وفي داخلها مسار Live API فقط، بينما صلاحية
                        التحكم الفعلية تأتي من Smart Token لكل قالب على حدة. نسخة v4.5 تضيف
                        قراءة ذكية لقدرات القالب وحقوله داخل Stream Deck مع أوامر آمنة للعرض والإخفاء.
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
                            : 'تنزيل RGE Live Controller'}
                        </span>
                      </button>
                    </div>

                    <div className="max-w-sm rounded-2xl border border-white/5 bg-black/20 p-6 text-sm text-gray-300">
                      <strong className="mb-3 block border-b border-gray-700 pb-2 text-white">
                        آلية التشغيل الجديدة
                      </strong>
                      <p className="mb-2">1. أنشئ أو حدّث الربط الآمن من صفحة الحماية.</p>
                      <p className="mb-2">2. من المكتبة أو من داخل محرر القالب انسخ Smart Token الخاص بالقالب المطلوب.</p>
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
                      القوائم داخل Stream Deck تتغير حسب القالب نفسه، مع أوامر عامة ثابتة للبث
                      والصوت وإعادة ضبط الموضع.
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
