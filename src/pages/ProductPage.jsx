import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice.js';
import {
  BuildingIcon,
  GroupsIcon,
  TaskIcon,
  FolderIcon,
  ActivityIcon,
  DatabaseIcon,
} from '../components/icons.jsx';
import LandingHeader from '../components/landing/LandingHeader.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';

const MODULES = [
  {
    Icon: BuildingIcon,
    title: 'Organizations & members',
    desc: 'Create an organization, invite members by email, and manage roles — admins and members see exactly the data they should.',
  },
  {
    Icon: GroupsIcon,
    title: 'Groups & real-time chat',
    desc: 'Group conversations with reactions, rich text formatting and file/image/video attachments, delivered live.',
  },
  {
    Icon: TaskIcon,
    title: 'Tasks',
    desc: 'Priorities from Low to Critical, due dates, assignees and attachments, with status changes that require a remark.',
  },
  {
    Icon: FolderIcon,
    title: 'Projects',
    desc: 'Group related tasks under a project, with its own filterable task list and progress view.',
  },
  {
    Icon: ActivityIcon,
    title: 'Activity timeline & reports',
    desc: 'Every task edit, status change and group event is logged — searchable per task and across the whole organization.',
  },
  {
    Icon: DatabaseIcon,
    title: 'Storage reporting',
    desc: 'Every upload — task attachment, chat file, anything — is tracked so admins can see exactly how storage is being used.',
  },
];

export default function ProductPage() {
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  return (
    <div className="landing">
      <LandingHeader active="product" />

      <main>
        <section className="landing__page-hero">
          <h1>The Task Pro product</h1>
          <p>
            Everything your team needs to organize, communicate and get work done — in a single
            workspace built around your organization.
          </p>
        </section>

        <section className="landing__section">
          <h2 className="landing__section-title">What's inside</h2>
          <p className="landing__section-sub">Six connected modules, all working off the same data.</p>
          <div className="landing__features landing__features--grid">
            {MODULES.map(({ Icon, title, desc }) => (
              <div className="landing__feature-card" key={title}>
                <div className="landing__feature-icon"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing__section landing__about">
          <h2 className="landing__section-title">Real-time, everywhere</h2>
          <p className="landing__section-sub">
            Messages, reactions, task updates and notifications all arrive live over a socket
            connection — no refreshing to see what changed.
          </p>
        </section>

        <section className="landing__section landing__pricing">
          <h2 className="landing__section-title">See it in action</h2>
          <p className="landing__section-sub">Create an organization and try every module for free.</p>
          <button className="btn landing__cta" onClick={() => navigate(user ? '/dashboard' : '/login')}>
            {user ? 'Go to my workspace' : 'Get started'}
          </button>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
