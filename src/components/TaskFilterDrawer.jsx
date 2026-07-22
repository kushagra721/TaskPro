import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons.jsx';
import Select from './Select.jsx';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Tasks can't be created in the future, so cap the created-date inputs at today.
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Right-side filter drawer for task lists.
 * - value: current filter object
 * - onApply(filters) / onClear()
 * - groups: optional [{id,name}] (omit inside a single group)
 * - members: [{id,name,email}]
 * - projects: optional [{id,name}]
 * - clients: optional [{id,name}]
 */
export default function TaskFilterDrawer({ open, onClose, value, onApply, onClear, groups, members, projects, clients }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const apply = () => {
    onApply(draft);
    onClose();
  };
  const clear = () => {
    // Keep status (controlled by the tabs); clear everything else.
    const empty = {
      priority: '', groupId: '', assigneeId: '', projectId: '', clientId: '', createdById: '',
      createdFrom: '', createdTo: '', dueFrom: '', dueTo: '',
    };
    setDraft((d) => ({ ...d, ...empty }));
    onClear();
    onClose();
  };

  return createPortal(
    <div className="drawer-overlay" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          <h3 className="drawer__title">Filters</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        <div className="drawer__body">
          <div className="field">
            <label className="field__label">Priority</label>
            <Select
              value={draft.priority || ''}
              onChange={setVal('priority')}
              placeholder="All"
              options={[{ value: '', label: 'All' }, ...PRIORITIES.map((p) => ({ value: p, label: p }))]}
            />
          </div>

          {groups && (
            <div className="field">
              <label className="field__label">Group</label>
              <Select
                value={draft.groupId || ''}
                onChange={setVal('groupId')}
                placeholder="All groups"
                options={[{ value: '', label: 'All groups' }, ...groups.map((g) => ({ value: g.id, label: `#${g.name}` }))]}
              />
            </div>
          )}

          <div className="field">
            <label className="field__label">Member (assignee)</label>
            <Select
              value={draft.assigneeId || ''}
              onChange={setVal('assigneeId')}
              placeholder="Anyone"
              options={[
                { value: '', label: 'Anyone' },
                { value: 'unassigned', label: 'Unassigned' },
                ...members.map((m) => ({ value: m.id, label: m.name || m.email })),
              ]}
            />
          </div>

          <div className="field">
            <label className="field__label">Created by</label>
            <Select
              value={draft.createdById || ''}
              onChange={setVal('createdById')}
              placeholder="Anyone"
              options={[
                { value: '', label: 'Anyone' },
                ...members.map((m) => ({ value: m.id, label: m.name || m.email })),
              ]}
            />
          </div>

          {projects && (
            <div className="field">
              <label className="field__label">Project</label>
              <Select
                value={draft.projectId || ''}
                onChange={setVal('projectId')}
                placeholder="All projects"
                options={[
                  { value: '', label: 'All projects' },
                  { value: 'none', label: 'No project' },
                  ...projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
          )}

          {clients && (
            <div className="field">
              <label className="field__label">Client</label>
              <Select
                value={draft.clientId || ''}
                onChange={setVal('clientId')}
                placeholder="All clients"
                options={[
                  { value: '', label: 'All clients' },
                  { value: 'none', label: 'No client' },
                  ...clients.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          )}

          <div className="field">
            <label className="field__label">Created date</label>
            <div className="row2">
              <input className="input" type="date" max={TODAY} value={draft.createdFrom || ''} onChange={set('createdFrom')} />
              <input className="input" type="date" max={TODAY} value={draft.createdTo || ''} onChange={set('createdTo')} />
            </div>
          </div>

          <div className="field">
            <label className="field__label">Due date</label>
            <div className="row2">
              <input className="input" type="date" value={draft.dueFrom || ''} onChange={set('dueFrom')} />
              <input className="input" type="date" value={draft.dueTo || ''} onChange={set('dueTo')} />
            </div>
          </div>
        </div>

        <div className="drawer__foot">
          <button className="btn btn--ghost" onClick={clear}>Clear all</button>
          <button className="btn" onClick={apply}>Apply filters</button>
        </div>
      </aside>
    </div>,
    document.body
  );
}
