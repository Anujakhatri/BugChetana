import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ProtectedRoute from "@/components/shared/ProtectedRoute.jsx";
import Dashboard from './pages/Dashboard.jsx';
import NewBug from './pages/bugs/NewBug.jsx';
import { ProjectProvider } from './context/ProjectContext.jsx';

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
          <Route path="/bugs/new" element={
              <ProtectedRoute>
                  <ProjectProvider>
                    <NewBug />
                  </ProjectProvider>
              </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
