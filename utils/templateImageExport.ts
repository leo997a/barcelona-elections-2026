export type TemplateExportFitMode = 'contain' | 'cover';

export type TemplateExportPresetId =
  | 'youtube_4k'
  | 'youtube_hd'
  | 'instagram_square'
  | 'instagram_portrait'
  | 'instagram_story'
  | 'x_landscape'
  | 'x_square'
  | 'facebook_landscape';

export type TemplateExportPreset = {
  id: TemplateExportPresetId;
  labelAr: string;
  shortLabelAr: string;
  platform: string;
  width: number;
  height: number;
  fit: TemplateExportFitMode;
  background: string;
};

export type TemplateExportResult = {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  preset: TemplateExportPreset;
};

export const TEMPLATE_EXPORT_PRESETS: TemplateExportPreset[] = [
  {
    id: 'youtube_4k',
    labelAr: 'يوتيوب 4K - صورة مصغرة',
    shortLabelAr: 'YouTube 4K',
    platform: 'YouTube',
    width: 3840,
    height: 2160,
    fit: 'contain',
    background: '#05070d',
  },
  {
    id: 'youtube_hd',
    labelAr: 'يوتيوب HD - 16:9',
    shortLabelAr: 'YouTube HD',
    platform: 'YouTube',
    width: 1920,
    height: 1080,
    fit: 'contain',
    background: '#05070d',
  },
  {
    id: 'instagram_square',
    labelAr: 'إنستغرام مربع - 1:1',
    shortLabelAr: 'IG مربع',
    platform: 'Instagram',
    width: 1080,
    height: 1080,
    fit: 'contain',
    background: '#05070d',
  },
  {
    id: 'instagram_portrait',
    labelAr: 'إنستغرام منشور - 4:5',
    shortLabelAr: 'IG 4:5',
    platform: 'Instagram',
    width: 1080,
    height: 1350,
    fit: 'contain',
    background: '#05070d',
  },
  {
    id: 'instagram_story',
    labelAr: 'ستوري / ريلز - 9:16',
    shortLabelAr: 'Story 9:16',
    platform: 'Instagram',
    width: 1080,
    height: 1920,
    fit: 'contain',
    background: '#05070d',
  },
  {
    id: 'x_landscape',
    labelAr: 'تويتر/X أفقي - 16:9',
    shortLabelAr: 'X 16:9',
    platform: 'X',
    width: 1600,
    height: 900,
    fit: 'contain',
    background: '#05070d',
  },
  {
    id: 'x_square',
    labelAr: 'تويتر/X مربع - 1:1',
    shortLabelAr: 'X مربع',
    platform: 'X',
    width: 1200,
    height: 1200,
    fit: 'contain',
    background: '#05070d',
  },
  {
    id: 'facebook_landscape',
    labelAr: 'فيسبوك أفقي - 16:9',
    shortLabelAr: 'Facebook',
    platform: 'Facebook',
    width: 1920,
    height: 1080,
    fit: 'contain',
    background: '#05070d',
  },
];

const XMLNS_XHTML = 'http://www.w3.org/1999/xhtml';

const readLayoutSize = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.round(element.scrollWidth || element.offsetWidth || element.clientWidth || rect.width));
  const height = Math.max(1, Math.round(element.scrollHeight || element.offsetHeight || element.clientHeight || rect.height));
  return { width, height };
};

export const getTemplateExportPreset = (presetId: TemplateExportPresetId): TemplateExportPreset =>
  TEMPLATE_EXPORT_PRESETS.find(preset => preset.id === presetId) || TEMPLATE_EXPORT_PRESETS[0];

export const sanitizeExportFilenamePart = (value: unknown): string => {
  const safe = String(value || 'reo-template')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
  return safe || 'reo-template';
};

const serializeStyle = (style: CSSStyleDeclaration): string => {
  const parts: string[] = [];
  for (let index = 0; index < style.length; index += 1) {
    const property = style.item(index);
    const value = style.getPropertyValue(property);
    if (!property || !value) continue;
    const priority = style.getPropertyPriority(property);
    parts.push(`${property}:${value}${priority ? ' !important' : ''};`);
  }
  return parts.join('');
};

const copyFormState = (source: Element, clone: Element) => {
  if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
    clone.setAttribute('value', source.value);
    if (source.checked) clone.setAttribute('checked', 'checked');
    else clone.removeAttribute('checked');
  }

  if (source instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
    clone.textContent = source.value;
  }

  if (source instanceof HTMLSelectElement && clone instanceof HTMLSelectElement) {
    Array.from(clone.options).forEach((option, index) => {
      if (source.options[index]?.selected) option.setAttribute('selected', 'selected');
      else option.removeAttribute('selected');
    });
  }
};

const inlineComputedStyles = (source: Element, clone: Element) => {
  if (source instanceof HTMLCanvasElement && clone instanceof HTMLCanvasElement) {
    try {
      const image = document.createElement('img');
      image.setAttribute('src', source.toDataURL('image/png'));
      image.setAttribute('width', String(source.width));
      image.setAttribute('height', String(source.height));
      image.setAttribute('style', serializeStyle(window.getComputedStyle(source)));
      clone.replaceWith(image);
      return;
    } catch {
      // If the canvas is tainted, continue with the structural clone.
    }
  }

  const computed = window.getComputedStyle(source);
  const existing = clone.getAttribute('style') || '';
  clone.setAttribute('style', `${existing};${serializeStyle(computed)}`);
  copyFormState(source, clone);

  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);
  sourceChildren.forEach((sourceChild, index) => {
    const cloneChild = cloneChildren[index];
    if (cloneChild) inlineComputedStyles(sourceChild, cloneChild);
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Failed to inline image'));
    reader.readAsDataURL(blob);
  });

const svgEscape = (value: string): string =>
  value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[character] || character));

const imageExportFallbackDataUrl = (image: HTMLImageElement, rawSrc: string): string => {
  const width = Math.max(
    16,
    Math.round(image.naturalWidth || image.width || image.clientWidth || Number(image.getAttribute('width')) || 640)
  );
  const height = Math.max(
    16,
    Math.round(image.naturalHeight || image.height || image.clientHeight || Number(image.getAttribute('height')) || 360)
  );
  const fileHint = rawSrc.split(/[\\/]/).pop()?.split(/[?#]/)[0]?.slice(0, 36) || 'external image';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="reoExportFallback" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#05070d"/>
          <stop offset="0.48" stop-color="#1637ff"/>
          <stop offset="1" stop-color="#ff1738"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="${Math.round(Math.min(width, height) * 0.04)}" fill="url(#reoExportFallback)"/>
      <circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.18)}" r="${Math.round(Math.min(width, height) * 0.2)}" fill="#08ead1" opacity="0.28"/>
      <circle cx="${Math.round(width * 0.86)}" cy="${Math.round(height * 0.78)}" r="${Math.round(Math.min(width, height) * 0.24)}" fill="#eeff00" opacity="0.22"/>
      <text x="50%" y="47%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${Math.max(18, Math.round(width * 0.055))}" font-weight="900">REO SHOW</text>
      <text x="50%" y="59%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" opacity="0.72" font-family="Arial, sans-serif" font-size="${Math.max(10, Math.round(width * 0.018))}" font-weight="700">${svgEscape(fileHint)}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const replaceExternalImageForExport = (image: HTMLImageElement, rawSrc: string) => {
  image.removeAttribute('srcset');
  image.removeAttribute('sizes');
  image.removeAttribute('crossorigin');
  image.setAttribute('data-export-image-fallback', 'true');
  image.setAttribute('src', imageExportFallbackDataUrl(image, rawSrc));
};

const inlineImages = async (root: HTMLElement) => {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map(async image => {
    const rawSrc = image.currentSrc || image.src || image.getAttribute('src') || '';
    if (!rawSrc || rawSrc.startsWith('data:')) return;
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.setAttribute('crossorigin', 'anonymous');

    try {
      const absoluteUrl = new URL(rawSrc, window.location.href).href;
      const response = await fetch(absoluteUrl, { cache: 'force-cache', credentials: 'omit', mode: 'cors' });
      if (!response.ok) {
        replaceExternalImageForExport(image, rawSrc);
        return;
      }
      const blob = await response.blob();
      image.setAttribute('src', await blobToDataUrl(blob));
    } catch {
      replaceExternalImageForExport(image, rawSrc);
    }
  }));
};

const waitForImage = (image: HTMLImageElement): Promise<void> =>
  new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to render template export SVG'));
  });

const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('The exported image was empty'));
      }, 'image/png', 1);
    } catch (error) {
      reject(error);
    }
  });

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
};

export const exportTemplateElementAsPng = async (
  element: HTMLElement,
  options: {
    presetId: TemplateExportPresetId;
    fileBaseName?: string;
    download?: boolean;
  },
): Promise<TemplateExportResult> => {
  const preset = getTemplateExportPreset(options.presetId);
  const { width: sourceWidth, height: sourceHeight } = readLayoutSize(element);
  const clone = element.cloneNode(true) as HTMLElement;

  inlineComputedStyles(element, clone);
  await inlineImages(clone);

  const scale = preset.fit === 'cover'
    ? Math.max(preset.width / sourceWidth, preset.height / sourceHeight)
    : Math.min(preset.width / sourceWidth, preset.height / sourceHeight);
  const fittedWidth = sourceWidth * scale;
  const fittedHeight = sourceHeight * scale;
  const offsetX = (preset.width - fittedWidth) / 2;
  const offsetY = (preset.height - fittedHeight) / 2;

  const wrapper = document.createElement('div');
  wrapper.setAttribute('xmlns', XMLNS_XHTML);
  wrapper.style.width = `${preset.width}px`;
  wrapper.style.height = `${preset.height}px`;
  wrapper.style.position = 'relative';
  wrapper.style.overflow = 'hidden';
  wrapper.style.background = preset.background;
  wrapper.style.margin = '0';
  wrapper.style.padding = '0';

  const holder = document.createElement('div');
  holder.style.position = 'absolute';
  holder.style.left = `${offsetX}px`;
  holder.style.top = `${offsetY}px`;
  holder.style.width = `${sourceWidth}px`;
  holder.style.height = `${sourceHeight}px`;
  holder.style.transform = `scale(${scale})`;
  holder.style.transformOrigin = 'top left';

  clone.style.width = `${sourceWidth}px`;
  clone.style.height = `${sourceHeight}px`;
  clone.style.margin = '0';
  clone.style.position = 'relative';
  holder.appendChild(clone);
  wrapper.appendChild(holder);

  const xhtml = new XMLSerializer().serializeToString(wrapper);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${preset.width}" height="${preset.height}" viewBox="0 0 ${preset.width} ${preset.height}">`,
    `<foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject>`,
    '</svg>',
  ].join('');

  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'sync';
    image.src = svgUrl;
    await waitForImage(image);

    const canvas = document.createElement('canvas');
    canvas.width = preset.width;
    canvas.height = preset.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available in this browser');
    context.drawImage(image, 0, 0, preset.width, preset.height);

    const blob = await canvasToPngBlob(canvas);
    const filename = `${sanitizeExportFilenamePart(options.fileBaseName)}-${preset.id}-${preset.width}x${preset.height}.png`;
    if (options.download !== false) downloadBlob(blob, filename);
    return { blob, filename, width: preset.width, height: preset.height, preset };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
};
