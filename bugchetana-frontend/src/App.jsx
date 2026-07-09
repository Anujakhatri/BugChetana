import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import RootRedirect from './pages/RootRedirect.jsx';
import DashboardRedirect from './pages/DashboardRedirect.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ProtectedRoute from "@/components/shared/ProtectedRoute.jsx";
import { ProjectProvider } from './context/ProjectContext.jsx';
import BugDetail from "./pages/BugDetail.jsx";
import ProjectManagement from "@/pages/ProjectManagement.jsx";
import UserManagement from "@/pages/UserManagement.jsx";
import QaDevelopers from "@/pages/QaDevelopers.jsx";
import SubmitBug from './pages/SubmitBug.jsx';

import RoleLayout from './components/layout/RoleLayout.jsx';
// Developer pages
import DeveloperDashboardPage from './pages/developer/DeveloperDashboardPage.jsx';
import DeveloperHistoryPage from './pages/developer/DeveloperHistoryPage.jsx';
// QA pages
import QaDashboardPage from './pages/qa/QaDashboardPage.jsx';
import QaBugListPage from './pages/qa/QaBugListPage.jsx';
import QaHistoryPage from './pages/qa/QaHistoryPage.jsx';
// Release Manager pages
import RmDashboardPage from './pages/release-manager/RmDashboardPage.jsx';
import RmUsersPage from './pages/release-manager/RmUsersPage.jsx';
import RmReportsPage from './pages/release-manager/RmReportsPage.jsx';
import RmHistoryPage from './pages/release-manager/RmHistoryPage.jsx';
// Developer bug creation
import NewBug from './pages/bugs/NewBug.jsx';
// Profile
import RoleProfilePage from './pages/profile/RoleProfilePage.jsx';

function App() {
    return (
            <Routes>
                <Route element={<Layout />}>
                     {/* Public */}
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/submit-bug" element={<SubmitBug />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Back-compat for old single-dashboard route */}
                    <Route path="/dashboard" element={<DashboardRedirect />} />

                    <Route path="/bugs/:id" element={
                            <ProtectedRoute>
                                    <BugDetail />
                            </ProtectedRoute>
                    } />

                    {/* Developer routes */}
                    <Route path="/developer" element={
                        <ProtectedRoute allowedRoles={["Developer"]}>
                            <ProjectProvider>
                                <RoleLayout role="Developer" />
                            </ProjectProvider>
                        </ProtectedRoute>
                    }>
                        <Route index element={<DeveloperDashboardPage />} />
                        <Route path="dashboard" element={<DeveloperDashboardPage />} />
                        <Route path="submit-bug" element={<ProjectProvider><NewBug /></ProjectProvider>} />
                        <Route path="history" element={<DeveloperHistoryPage />} />
                        <Route path="profile" element={<RoleProfilePage />} />
                    </Route>

                    {/* QA routes */}
                    <Route path="/qa" element={
                        <ProtectedRoute allowedRoles={["QA"]}>
                            <ProjectProvider>
                                <RoleLayout role="QA" />
                            </ProjectProvider>
                        </ProtectedRoute>
                    }>
                        <Route index element={<QaDashboardPage />} />
                        <Route path="dashboard" element={<QaDashboardPage />} />
                        <Route path="bug-list" element={<QaBugListPage />} />
                        <Route path="history" element={<QaHistoryPage />} />
                        <Route path="profile" element={<RoleProfilePage />} />
                    </Route>

                    {/* Release Manager routes */}
                    <Route path="/release-manager" element={
                        <ProtectedRoute allowedRoles={["Release Manager"]}>
                            <ProjectProvider>
                                <RoleLayout role="Release Manager" />
                            </ProjectProvider>
                        </ProtectedRoute>
                    }>
                        <Route index element={<RmDashboardPage />} />
                        <Route path="dashboard" element={<RmDashboardPage />} />
                        <Route path="users" element={<RmUsersPage />} />
                        <Route path="reports" element={<RmReportsPage />} />
                        <Route path="submit-bug" element={<SubmitBug severityOnly={true} />} />
                        <Route path="history" element={<RmHistoryPage />} />
                        <Route path="profile" element={<RoleProfilePage />} />
                    </Route>

                    <Route path="/projects" element={
                            <ProtectedRoute allowedRoles={['Release Manager']}>
                                    <ProjectProvider>
                                        <ProjectManagement />
                                    </ProjectProvider>
                            </ProtectedRoute>
                    } />
                    <Route path="/users" element={
                            <ProtectedRoute allowedRoles={['Release Manager']}>
                                    <UserManagement />
                            </ProtectedRoute>
                    } />
                    <Route path="/developers" element={
                            <ProtectedRoute allowedRoles={['QA']}>
                                    <QaDevelopers />
                            </ProtectedRoute>
                    } />
                </Route>
            </Routes>
    );
}

export default App;
