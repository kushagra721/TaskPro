import { docKind } from '../utils/fileKind.js';

/** A colored PDF/XLS/DOC/PPT/ZIP chip standing in for a document's type icon. */
export default function DocIcon({ fileName, mimeType }) {
  const { label, color } = docKind(fileName, mimeType);
  return (
    <span className="doc-icon" style={{ background: color }}>
      {label}
    </span>
  );
}
