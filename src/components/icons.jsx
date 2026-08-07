// Lightweight Feather-style stroke icons. Each takes optional size + props.
const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const HomeIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
);

export const GroupsIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9.5" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13A4 4 0 0 1 16 11" />
  </svg>
);

export const ReportsIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M3 3v18h18" />
    <rect x="7" y="11" width="3" height="6" rx="1" />
    <rect x="13" y="7" width="3" height="10" rx="1" />
  </svg>
);

export const ChatIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export const MoreIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

export const BellIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export const PlusIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CheckIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const XIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const ChevronDownIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const UserIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </svg>
);

export const BuildingIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
  </svg>
);

export const MailIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const LogoutIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);

export const ChevronRightIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const TaskIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>
);

export const ArrowLeftIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

export const SearchIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const FilterIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M4 5h16M7 12h10M10 19h4" />
  </svg>
);

export const FolderIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </svg>
);

export const EditIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const TrashIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);

export const BoldIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M6 4h7a3.5 3.5 0 0 1 0 7H6z" />
    <path d="M6 11h8a3.5 3.5 0 0 1 0 7H6z" />
  </svg>
);

export const ItalicIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M10 4h7M7 20h7M14 4 10 20" />
  </svg>
);

export const UnderlineIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M6 4v7a6 6 0 0 0 12 0V4" />
    <path d="M4 21h16" />
  </svg>
);

export const ListIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const ListOrderedIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 5v3M4 5h1M4 8h1.5" />
    <path d="M4.2 12.2h1.3a.9.9 0 0 1 0 1.8H4.2M4.2 14h1.3a.9.9 0 0 1 0 1.8H4" />
    <path d="M4 19.5h1.6L4 21.5h1.6" />
  </svg>
);

export const LinkIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
  </svg>
);

export const PaperclipIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M21.4 11.05 12.5 20a5.5 5.5 0 0 1-7.78-7.78l9-9a3.5 3.5 0 1 1 4.95 4.95l-9 9a1.5 1.5 0 1 1-2.12-2.12l8.3-8.3" />
  </svg>
);

export const FileIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v4h4" />
  </svg>
);

export const DownloadIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3v12m0 0 4.5-4.5M12 15 7.5 10.5" />
    <path d="M4 19h16" />
  </svg>
);

/** Used for the "View" action beside a document's "Download". */
export const EyeIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.75" />
  </svg>
);

export const VideoIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="5" width="13" height="14" rx="2" />
    <path d="m16 10 5-3v10l-5-3" />
  </svg>
);

export const ShieldIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3 4 6.5V11c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6.5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

/** Change password. A key, matching the reference design's account menu. */
export const KeyIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="m10.9 12.1 8.1-8.1" />
    <path d="m17 4 3 3" />
    <path d="m14 7 2.5 2.5" />
  </svg>
);

export const DatabaseIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5V12c0 1.66 3.58 3 8 3s8-1.34 8-3V5.5" />
    <path d="M4 12v6.5c0 1.66 3.58 3 8 3s8-1.34 8-3V12" />
  </svg>
);

export const ActivityIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </svg>
);

export const CameraIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const RotateIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M3 12a9 9 0 1 1 3 6.7" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const CropIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </svg>
);

export const StickerIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M8 4h8a4 4 0 0 1 4 4v6l-6 6H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z" />
    <path d="M14 20v-4a2 2 0 0 1 2-2h4" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="14" cy="10" r="1" fill="currentColor" stroke="none" />
    <path d="M8.5 13.5a4 4 0 0 0 6 0" />
  </svg>
);

export const PencilIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 19 3 20l1-9 12-12 8 8Z" />
    <path d="M14 6.5 17.5 10" />
  </svg>
);

export const TypeIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M4 6h16M12 6v14" />
  </svg>
);

export const DoubleCheckIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="m2 12 4.5 4.5L15 8" />
    <path d="m9 12 4.5 4.5L22 8" />
  </svg>
);

/** Curved arrow turning back — the standard "reply" glyph. */
export const ReplyIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h9a7 7 0 0 1 7 7v4" />
  </svg>
);

export const InfoIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.01" />
  </svg>
);

export const SmileIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 10v.01M15.5 10v.01M8 14.5a5 5 0 0 0 8 0" />
  </svg>
);

export const UndoIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M3 10h11a5 5 0 0 1 0 10H9" />
    <path d="m3 10 5-5M3 10l5 5" />
  </svg>
);

export const ArrowRightIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const ExternalLinkIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </svg>
);

export const CopyIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const SettingsIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const CreditCardIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h4" />
  </svg>
);

export const ReceiptIcon = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M6 2h12v19l-3-2-3 2-3-2-3 2Z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);
