import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { organizationsApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import DateRangeControl from '../../components/DateRangeControl.jsx';
import { ActivityIcon } from '../../components/icons.jsx';
import { timeAgo } from '../../utils/time.js';

export default function ActivitiesPage() {
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({ from: '', to: '' });

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    organizationsApi
      .activities(orgId, period)
      .then((r) => setItems(r.activities))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [orgId, period]);

  if (!org) {
    return (
      <div className="page">
        <EmptyState icon={<ActivityIcon size={30} />} title="No organization selected" description="Pick an organization to see its activity." />
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">All Activities</h1>
          <p className="page__subtitle">Everything happening in {org.name}.</p>
        </div>
        <DateRangeControl onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<ActivityIcon size={30} />} title="No activity yet" description="Actions in your organization will show up here." />
      ) : (
        <section className="panel">
          <ul className="activity">
            {items.map((a) => (
              <li key={a.id} className="activity__item">
                <span className="activity__dot" />
                <div className="activity__body">
                  <span className="activity__actor">{a.actor}</span> {a.summary}
                  <div className="activity__time">{timeAgo(a.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
