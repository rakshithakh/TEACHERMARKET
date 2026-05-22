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
  const value = String(fileAttachment);
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  return `data:${getAttachmentMime(fileName, fileType)};base64,${value}`;
}

export function attachmentToBlobUrl(fileAttachment, fileName = '', fileType = '') {
  const dataUrl = getAttachmentDataUrl(fileAttachment, fileName, fileType);
  if (!dataUrl || /^(blob:|https?:\/\/)/i.test(dataUrl)) return dataUrl;

  const [meta, base64 = ''] = dataUrl.split(',');
  const mime = meta.match(/^data:([^;]+)/)?.[1] || getAttachmentMime(fileName, fileType);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export function openAttachment(fileAttachment, fileName = '', fileType = '') {
  const url = attachmentToBlobUrl(fileAttachment, fileName, fileType);
  if (!url) throw new Error('No attachment found.');
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) throw new Error('Popup blocked. Allow popups and try again.');
  setTimeout(() => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }, 30000);
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
  }, 30000);
}
