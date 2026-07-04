import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ProtectedRoute from "@/components/shared/ProtectedRoute.jsx";
import Dashboard from './pages/Dashboard.jsx';
import NewBug from './pages/bugs/NewBug.jsx';
import { ProjectProvider } from './context/ProjectContext.jsx';
import BugDetail from "./pages/BugDetail.jsx";
import ProjectManagement from "@/pages/ProjectManagement.jsx";
import UserManagement from "@/pages/UserManagement.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
           {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Protected */}
          <Route path="/dashboard" element={
              <ProtectedRoute>
                  <ProjectProvider>
                    <Dashboard />
                  </ProjectProvider>
              </ProtectedRoute>
          } />
          <Route path="/bugs/:id" element={
              <ProtectedRoute>
                  <BugDetail />
              </ProtectedRoute>
          } />

          <Route path="/bugs/new" element={
              <ProtectedRoute allowedRoles={['Developer', 'Release Manager']}>
                  <ProjectProvider>
                    <NewBug />
                  </ProjectProvider>
              </ProtectedRoute>
          } />

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
            
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
