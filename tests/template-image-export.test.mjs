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
    'loadExportableImageBlob',
    '/api/image-proxy?url=',
    'imageExportFallbackDataUrl',
    'replaceExternalImageForExport',
    'data-export-image-fallback',
    'sanitizeExportFilenamePart',
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${token} is missing`);
  }

  assert.match(source, /width:\s*3840[\s\S]*?height:\s*2160/);
  assert.match(source, /width:\s*1080[\s\S]*?height:\s*1920/);
  assert.doesNotMatch(source, /canvas export will surface any CORS failure/);
});

test('image export server proxy is registered for protected external images', async () => {
  const [proxyApi, server] = await Promise.all([
    readSource('../api/image-proxy.ts'),
    readSource('../server/server.ts'),
  ]);

  for (const token of [
    'MAX_IMAGE_BYTES',
    'FETCH_TIMEOUT_MS',
    'isBlockedHost',
    "contentType.startsWith('image/')",
    'response.arrayBuffer()',
  ]) {
    assert.match(proxyApi, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${token} is missing`);
  }

  assert.match(server, /import imageProxyHandler from '\.\.\/api\/image-proxy\.js';/);
  assert.match(server, /\['\/api\/image-proxy', imageProxyHandler as ApiHandler\]/);
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
