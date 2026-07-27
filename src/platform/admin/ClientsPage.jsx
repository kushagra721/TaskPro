import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import Select from '../../components/Select.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { UserIcon, SearchIcon } from '../../components/icons.jsx';
import { formatDate } from '../../utils/status.js';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [resellerId, setResellerId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.resellers.list().then((r) => setResellers(r.resellers));
  }, []);

  useEffect(() => {
    setLoading(true);
    platformApi.clients
      .list(resellerId || undefined)
      .then((res) => setClients(res.clients))
      .finally(() => setLoading(false));
  }, [resellerId]);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <h1 className="page__title">Clients</h1>
          <p className="page__subtitle">Every client workspace, and which reseller they belong to.</p>
        </div>
      </div>

      <div className="list-controls">
        <div className="search-box task-toolbar">
          <SearchIcon className="search-box__icon" size={16} />
          <input className="search-box__input" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select
          value={resellerId}
          onChange={setResellerId}
          placeholder="All resellers"
          options={[{ value: '', label: 'All resellers' }, ...resellers.map((r) => ({ value: r.id, label: r.brandName || r.name }))]}
        />
      </div>

      {loading ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<UserIcon size={30} />} title="No clients found" description="Clients appear here once they sign up (directly, or through a reseller's custom domain)." />
      ) : (
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Owner</th>
                <th>Reseller</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="task-table__name">{c.name}</td>
                  <td>{c.owner ? c.owner.name || c.owner.email : '—'}</td>
                  <td>{c.reseller ? <span className="status-pill status-pill--completed">{c.reseller.name}</span> : <span className="muted">House / Direct</span>}</td>
                  <td className="nowrap">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
