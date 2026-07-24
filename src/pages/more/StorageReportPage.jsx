import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { organizationsApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import Select from '../../components/Select.jsx';
import DocIcon from '../../components/DocIcon.jsx';
import Avatar from '../../components/Avatar.jsx';
import { prettySize } from '../../utils/fileSize.js';
import { formatDateTime } from '../../utils/status.js';
import { SearchIcon, VideoIcon, DownloadIcon, BuildingIcon } from '../../components/icons.jsx';
import { isAdminRole } from '../../utils/role.js';

export default function StorageReportPage() {
  const org = useSelector(selectCurrentOrg);
  const orgId = useSelector(selectCurrentOrgId);
  const isAdmin = isAdminRole(org?.role);

  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [memberFilter, setMemberFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!orgId || !isAdmin) return;
    setLoading(true);
    organizationsApi
      .storageReport(orgId)
      .then((r) => {
        setReport(r);
        setError('');
      })
      .catch((err) => setError(err.message || 'Could not load the storage report'))
      .finally(() => setLoading(false));
  }, [orgId, isAdmin]);

  const filteredFiles = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    return report.files.filter((f) => {
      if (memberFilter && f.uploadedBy.id !== memberFilter) return false;
      if (q && !f.fileName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [report, memberFilter, search]);

  if (!org) {
    return (
      <div className="page">
        <EmptyState icon={<BuildingIcon size={30} />} title="No workspace selected" description="Pick a workspace to see its storage usage." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <EmptyState icon={<BuildingIcon size={30} />} title="Admins only" description="Only a workspace admin can view the storage report." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Storage</h1>
        <p className="page__subtitle">Every image, video and document uploaded in {org.name} — from tasks, chat and edits alike.</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading || !report ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : (
        <>
          <div className="stat-grid stat-grid--3">
            <div className="stat-card stat-card--indigo">
              <div className="stat-card__value">{prettySize(report.overall.totalBytes)}</div>
              <div className="stat-card__label">Total storage used</div>
            </div>
            <div className="stat-card stat-card--violet">
              <div className="stat-card__value">{report.overall.totalFiles}</div>
              <div className="stat-card__label">Files uploaded</div>
            </div>
            <div className="stat-card stat-card--amber">
              <div className="stat-card__value">{report.members.length}</div>
              <div className="stat-card__label">Members</div>
            </div>
          </div>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">By member</h2>
            </div>
            <ul className="member-list">
              {report.members.map((m) => (
                <li key={m.id} className="member">
                  <Avatar name={m.name} email={m.email} src={m.avatarUrl} size={36} />
                  <div className="member__info">
                    <div className="member__name-text">{m.name || m.email}</div>
                    <div className="member__email">{m.email}</div>
                  </div>
                  <span className="tag">{m.totalFiles} file{m.totalFiles === 1 ? '' : 's'}</span>
                  <span className="tag tag--success">{prettySize(m.totalBytes)}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="list-controls">
            <div className="search-box" style={{ maxWidth: 320 }}>
              <SearchIcon size={16} />
              <input
                className="search-box__input"
                placeholder="Search files by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ minWidth: 220 }}>
              <Select
                value={memberFilter}
                onChange={setMemberFilter}
                placeholder="Everyone"
                options={[
                  { value: '', label: 'Everyone' },
                  ...report.members.map((m) => ({ value: m.id, label: m.name || m.email })),
                ]}
              />
            </div>
          </div>

          {filteredFiles.length === 0 ? (
            <EmptyState icon={<SearchIcon size={30} />} title="No files found" description="Nothing matches your search or filters." />
          ) : (
            <div className="storage-files">
              {filteredFiles.map((f) => (
                <div key={f.id} className="storage-file">
                  <span className="storage-file__icon">
                    {f.kind === 'image' ? (
                      <img src={f.url} alt={f.fileName} className="storage-file__thumb" />
                    ) : f.kind === 'video' ? (
                      <VideoIcon size={18} />
                    ) : (
                      <DocIcon fileName={f.fileName} mimeType={f.mimeType} />
                    )}
                  </span>
                  <div className="storage-file__info">
                    <div className="storage-file__name">{f.fileName}</div>
                    <div className="storage-file__meta">
                      {f.uploadedBy.name || f.uploadedBy.email} · {prettySize(f.size)} · {formatDateTime(f.createdAt)}
                    </div>
                  </div>
                  {f.url ? (
                    <a className="mini-btn mini-btn--primary" href={f.url} target="_blank" rel="noopener noreferrer">
                      <DownloadIcon size={13} /> View
                    </a>
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
