const EXT_MIME = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function getAttachmentMime(fileName = '', fileType = '') {
  if (fileType) return fileType;
  const ext = String(fileName).split('.').pop()?.toLowerCase();
  return EXT_MIME[ext] || 'application/octet-stream';
}

export function getAttachmentDataUrl(fileAttachment, fileName = '', fileType = '') {
  if (!fileAttachment) return '';
  const value = String(fileAttachment).trim();
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  return `data:${getAttachmentMime(fileName, fileType)};base64,${value}`;
}

export function attachmentToBlobUrl(fileAttachment, fileName = '', fileType = '') {
  const dataUrl = getAttachmentDataUrl(fileAttachment, fileName, fileType);
  if (!dataUrl || /^(blob:|https?:\/\/)/i.test(dataUrl)) return dataUrl;

  const [meta, base64 = ''] = dataUrl.split(',');
  const mime = meta.match(/^data:([^;]+)/)?.[1] || getAttachmentMime(fileName, fileType);
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openAttachment(fileAttachment, fileName = '', fileType = '') {
  if (!fileAttachment) throw new Error('No attachment found.');
  const opened = window.open('', '_blank');
  if (!opened) throw new Error('Popup blocked. Allow popups and try again.');

  const url = attachmentToBlobUrl(fileAttachment, fileName, fileType);
  const mime = getAttachmentMime(fileName, fileType).toLowerCase();
  const isPdf = mime.includes('pdf') || String(fileName).toLowerCase().endsWith('.pdf');

  opened.opener = null;
  if (isPdf) {
    opened.document.open();
    opened.document.write(`<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(fileName || 'PDF')}</title>
          <style>
            html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; background: #111827; }
            .fallback { position: fixed; top: 12px; right: 12px; z-index: 2; font: 14px Arial, sans-serif; }
            .fallback a { color: #fff; background: #0f172a; padding: 8px 12px; border-radius: 8px; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="fallback"><a href="${url}" download="${escapeHtml(fileName || 'attachment.pdf')}">Download PDF</a></div>
          <iframe src="${url}" title="${escapeHtml(fileName || 'PDF')}"></iframe>
        </body>
      </html>`);
    opened.document.close();
  } else {
    opened.location.href = url;
  }

  setTimeout(() => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }, 120000);
}

export function downloadAttachment(fileAttachment, fileName = 'attachment', fileType = '') {
  const url = attachmentToBlobUrl(fileAttachment, fileName, fileType);
  if (!url) throw new Error('No attachment found.');
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'attachment';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }, 120000);
}
