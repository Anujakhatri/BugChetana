import { useAuth } from '@/context/AuthContext';
import DeveloperDashboard from './dashboards/DeveloperDashboard';
import QaDashboard from './dashboards/QaDashboard';
import ReleaseManagerDashboard from './dashboards/ReleaseManager';

export default function Dashboard() {
  const { user } = useAuth();

  switch (user?.roleName) {
    case 'Developer':
      return <DeveloperDashboard />;
    case 'QA':
      return <QaDashboard />;
    case 'Release Manager':
      return <ReleaseManagerDashboard />;
    default:
      return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-gray-700">No Projects Assigned</h2>
            <p className="text-gray-400 mt-2 text-sm">
              You are not currently assigned to any projects. Please contact an administrator.
            </p>
          </div>
        </div>
      );
  }
}
