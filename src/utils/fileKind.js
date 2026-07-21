// Extension (checked first) and mime-type fallback → a short label + brand-ish
// color, used to render a document's type at a glance in chat/attachment lists
// (PDF, Excel, Word, PowerPoint, archives, plain text, generic fallback).
const BY_EXT = {
  pdf: { label: 'PDF', color: '#dc2626' },
  doc: { label: 'DOC', color: '#2563eb' },
  docx: { label: 'DOC', color: '#2563eb' },
  xls: { label: 'XLS', color: '#16a34a' },
  xlsx: { label: 'XLS', color: '#16a34a' },
  csv: { label: 'CSV', color: '#16a34a' },
  ppt: { label: 'PPT', color: '#ea580c' },
  pptx: { label: 'PPT', color: '#ea580c' },
  zip: { label: 'ZIP', color: '#64748b' },
  rar: { label: 'ZIP', color: '#64748b' },
  '7z': { label: 'ZIP', color: '#64748b' },
  txt: { label: 'TXT', color: '#64748b' },
};

const DEFAULT_KIND = { label: 'FILE', color: '#6366f1' };

export function docKind(fileName = '', mimeType = '') {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext && BY_EXT[ext]) return BY_EXT[ext];

  if (mimeType.includes('pdf')) return BY_EXT.pdf;
  if (mimeType.includes('word')) return BY_EXT.doc;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return BY_EXT.xls;
  if (mimeType.includes('csv')) return BY_EXT.csv;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return BY_EXT.ppt;
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('rar')) return BY_EXT.zip;
  if (mimeType.startsWith('text/')) return BY_EXT.txt;
  return DEFAULT_KIND;
}
