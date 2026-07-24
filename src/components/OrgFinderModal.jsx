import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import OrgBadge from './OrgBadge.jsx';
import { createOrg } from '../store/slices/orgSlice.js';
import { organizationsApi } from '../api/client.js';
import { joinOrgRoom } from '../realtime/socket.js';
import { useWorkspaceNameCheck } from '../hooks/useWorkspaceNameCheck.js';
import { XIcon, PlusIcon, CheckIcon } from './icons.jsx';

/**
 * Combined "find or create workspace" popup:
 * - Create a brand-new workspace (default tab).
 * - Or search existing workspaces and request to join.
 */
export default function OrgFinderModal({ onClose }) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('create'); // 'create' | 'search'

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [statusMap, setStatusMap] = useState({}); // orgId -> 'PENDING' after request
  const [error, setError] = useState('');

  // Create state
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const nameCheck = useWorkspaceNameCheck(name);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearching(true);
      organizationsApi
        .search(query.trim())
        .then((r) => setResults(r.organizations))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const requestJoin = async (org) => {
    setError('');
    try {
      await organizationsApi.requestToJoin(org.id);
      setStatusMap((m) => ({ ...m, [org.id]: 'PENDING' }));
    } catch (err) {
      setError(err.message || 'Could not send request');
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const org = await dispatch(createOrg(name.trim())).unwrap();
      joinOrgRoom(org.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not create workspace');
    } finally {
      setCreating(false);
    }
  };

  const statusFor = (o) => statusMap[o.id] || o.status;

  return (
    <Modal title="Workspaces" onClose={onClose}>
      <div className="seg-tabs">
        <button className={`seg-tab ${tab === 'create' ? 'seg-tab--active' : ''}`} onClick={() => setTab('create')}>
          Create new
        </button>
        <button className={`seg-tab ${tab === 'search' ? 'seg-tab--active' : ''}`} onClick={() => setTab('search')}>
          Search & join
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {tab === 'create' ? (
        <form onSubmit={create}>
          <div className="field">
            <label className="field__label" htmlFor="org-name">Workspace name</label>
            <div className="field__input-status">
              <input
                id="org-name"
                className={`input ${nameCheck.error ? 'input--error' : ''}`}
                autoFocus
                placeholder="Acme"
                value={name}
                // No spaces allowed — strip them as the user types.
                onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
              />
              {nameCheck.checking && <span className="spinner field__input-spinner" />}
              {!nameCheck.checking && nameCheck.available && <CheckIcon size={16} className="field__input-check" />}
            </div>
            {nameCheck.error ? (
              <span className="field__error">{nameCheck.error}</span>
            ) : (
              <span className="field__hint">5-15 characters. Letters and numbers only, no spaces.</span>
            )}
          </div>
          <button className="btn" type="submit" disabled={creating || !nameCheck.available}>
            {creating ? <span className="spinner" /> : (<><PlusIcon size={16} /> Create workspace</>)}
          </button>
        </form>
      ) : (
        <>
          <div className="search-box" style={{ width: '100%', marginBottom: 12 }}>
            <svg className="search-box__icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="search-box__input"
              style={{ width: '100%' }}
              autoFocus
              placeholder="Search workspaces by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="search-box__clear" onClick={() => setQuery('')} aria-label="Clear">
                <XIcon size={14} />
              </button>
            )}
          </div>

          <div className="org-results">
            {searching && <div className="dropdown__empty">Searching…</div>}
            {!searching && results.length === 0 && <div className="dropdown__empty">No workspaces found.</div>}
            {results.map((o) => {
              const st = statusFor(o);
              return (
                <div key={o.id} className="org-result">
                  <OrgBadge name={o.name} icon={o.icon} photoUrl={o.photoUrl} size="sm" />
                  <div className="org-result__info">
                    <div className="org-result__name">{o.name}</div>
                    <div className="org-result__meta">{o.memberCount} member{o.memberCount === 1 ? '' : 's'}</div>
                  </div>
                  {st === 'MEMBER' ? (
                    <span className="role-pill role-pill--member">Member</span>
                  ) : st === 'PENDING' ? (
                    <span className="role-pill role-pill--pending">Requested</span>
                  ) : (
                    <button className="mini-btn mini-btn--primary" onClick={() => requestJoin(o)}>
                      Request to join
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
