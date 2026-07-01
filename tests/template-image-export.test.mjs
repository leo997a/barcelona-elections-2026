import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const readSource = async relativePath =>
  fs.readFile(new URL(relativePath, import.meta.url), 'utf8');

test('template image export library exposes real high-resolution platform presets', async () => {
  const source = await readSource('../utils/templateImageExport.ts');

  for (const token of [
    'TEMPLATE_EXPORT_PRESETS',
    "id: 'youtube_4k'",
    "id: 'instagram_square'",
    "id: 'instagram_story'",
    "id: 'x_landscape'",
    "id: 'facebook_landscape'",
    'exportTemplateElementAsPng',
    '<foreignObject',
    'inlineComputedStyles',
    'inlineImages',
    'isExportSafeImageUrl',
    'fetchExportSafeImageBlob',
    "mode: 'same-origin'",
    'imageExportFallbackDataUrl',
    'replaceExternalImageForExport',
    'data-export-image-fallback',
    'sanitizeExportFilenamePart',
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${token} is missing`);
  }

  assert.match(source, /width:\s*3840[\s\S]*?height:\s*2160/);
  assert.match(source, /width:\s*1080[\s\S]*?height:\s*1920/);
  assert.match(source, /parsed\.origin === window\.location\.origin/);
  assert.doesNotMatch(source, /canvas export will surface any CORS failure/);
  assert.doesNotMatch(source, /\/api\/image-proxy|fetchImageBlobThroughProxy|loadExportableImageBlob/);
});

test('image export is isolated from live output and does not expose a server image proxy', async () => {
  const [exportSource, app, server] = await Promise.all([
    readSource('../utils/templateImageExport.ts'),
    readSource('../App.tsx'),
    readSource('../server/server.ts'),
  ]);

  for (const forbidden of [
    '/api/image-proxy',
    'imageProxyHandler',
    'syncManager',
    '/api/live',
    '/api/stream',
    'BroadcastChannel',
    'EventSource',
    'localStorage',
    'sessionStorage',
  ]) {
    const pattern = new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    assert.doesNotMatch(exportSource, pattern, `export must not reference ${forbidden}`);
  }

  assert.doesNotMatch(server, /imageProxyHandler|\/api\/image-proxy/);
  assert.doesNotMatch(app, /templateImageExport|exportTemplateElementAsPng|\/api\/image-proxy/);
  assert.match(exportSource, /if \(!isExportSafeImageUrl\(absoluteUrl\)\) \{[\s\S]*?replaceExternalImageForExport\(image, rawSrc\);[\s\S]*?return;[\s\S]*?\}/);
});

test('public output pages block third-party injected network calls', async () => {
  const server = await readSource('../server/server.ts');

  for (const token of [
    'outputSecurityPolicy',
    "default-src 'self' data: blob:",
    "script-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    'applyOutputIsolationHeaders(response, requestUrl.pathname)',
    'Content-Security-Policy',
    'Permissions-Policy',
  ]) {
    assert.match(server, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${token} is missing`);
  }

  assert.match(
    server,
    /applyOutputIsolationHeaders\(response, requestUrl\.pathname\);\s*sendFile\(response, indexPath, 'no-cache'\);/
  );
});

test('color inputs never receive empty values', async () => {
  const [helper, editor, operator] = await Promise.all([
    readSource('../utils/colorInput.ts'),
    readSource('../pages/Editor.tsx'),
    readSource('../pages/Operator.tsx'),
  ]);

  assert.match(helper, /HEX_COLOR_RE = \/\^#\[0-9a-f\]\{6\}\$\/i/);
  assert.match(helper, /normalizeColorInputValue/);
  assert.match(editor, /value=\{normalizeColorInputValue\(field\.value\)\}/);
  assert.match(editor, /value=\{normalizeColorInputValue\(\(draftOverlay\.theme as any\)\[key\]\)\}/);
  assert.match(operator, /value=\{normalizeColorInputValue\(value\)\}/);
});

test('editor wires one-click PNG export to the clean preview surface', async () => {
  const source = await readSource('../pages/Editor.tsx');

  for (const token of [
    "from '../utils/templateImageExport'",
    'previewExportRef',
    'exportPresetId',
    'handleExportPreviewImage',
    'exportTemplateElementAsPng(target',
    'TEMPLATE_EXPORT_PRESETS.map',
    "setMotionPreviewPhase('HOLD')",
    '<Download className="h-3.5 w-3.5"',
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${token} is missing`);
  }

  assert.match(source, /<div ref=\{previewExportRef\} className="absolute inset-0 overflow-hidden bg-transparent">/);
  assert.match(source, /<div className="absolute inset-\[5%\] border border-white\/5 border-dashed pointer-events-none rounded" \/>/);
});
