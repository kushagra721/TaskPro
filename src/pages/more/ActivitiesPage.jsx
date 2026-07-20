import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { organizationsApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import DateRangeControl from '../../components/DateRangeControl.jsx';
import Timeline from '../../components/Timeline.jsx';
import { ActivityIcon } from '../../components/icons.jsx';

export default function ActivitiesPage() {
  const navigate = useNavigate();
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
        <section className="panel timeline-panel">
          {/* Task entries get a "View" link straight to the task detail page. */}
          <Timeline items={items} onView={(taskId) => navigate(`/tasks/${taskId}`)} />
        </section>
      )}
    </div>
  );
}
