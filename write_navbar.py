import re

with open("/Users/anujakhatri/Desktop/capstone/BugChetana/bugchetana-frontend/src/components/layout/Navbar.jsx", "r") as f:
    content = f.read()

new_content = """import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/shared/NotificationBell';
import bugchetanaIcon from '@/assets/bugchetana-icon.svg';
import ProfileModal from '@/components/shared/ProfileModel.jsx';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const handleSectionClick = (sectionId) => {
    if (location.pathname === '/') {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/');
      setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleLogoClick = (e) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showNotifications = user?.roleName === 'Developer' || user?.roleName === 'QA';
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200' : 'bg-transparent'
        }`}
    >
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto lg:mx-0 lg:mr-auto">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/"
            onClick={handleLogoClick}
            className="group flex items-center gap-2 sm:gap-3 shrink-0 min-w-0 rounded-md transition-opacity duration-200 hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="BugChetana home"
          >
            <img
              src={bugchetanaIcon}
              alt="BugChetana logo"
              width={40}
              height={40}
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 object-contain"
            />
            <div className="flex min-w-0 flex-col justify-center leading-none">
              <span className="truncate font-bold text-base sm:text-lg tracking-tight text-slate-900">
                Bug<span className="text-[#185FA5]">Chetana</span>
              </span>
              <span className="mt-0.5 truncate text-[10px] sm:text-xs leading-tight text-slate-500">
                AI-powered bug intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {!user ? (
              <>
                <button onClick={() => handleSectionClick('features')} className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Features</button>
                <button onClick={() => handleSectionClick('how-it-works')} className="text-slate-600 hover:text-blue-600 font-medium transition-colors">How It Works</button>
                <Link to="/submit-bug" className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-medium transition-colors">
                  Submit Bug
                </Link>
                <Link to="/login" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Login</Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Register
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                {showNotifications && <NotificationBell />}
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {user?.name || user?.username || 'User'}
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded capitalize">
                    {user?.roleName?.replace(/_/g, ' ')}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button - Or Profile for authenticated users */}
          <div className="md:hidden flex items-center gap-2">
            {!user ? (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-600 hover:text-slate-900 focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            ) : (
              <>
                {showNotifications && <NotificationBell />}
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[100px]">
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize shrink-0">
                    {user?.roleName?.replace(/_/g, ' ')}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav - Unauthenticated Only */}
      {!user && isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 shadow-lg">
          <div className="px-4 pt-2 pb-6 space-y-2 flex flex-col">
            <button
              onClick={() => { setIsMobileMenuOpen(false); handleSectionClick('features'); }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50"
            >
              Features
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); handleSectionClick('how-it-works'); }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50"
            >
              How It Works
            </button>
            <Link
              to="/submit-bug"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50"
            >
        
              Submit Bug
            </Link>
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50"
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 mt-4 text-center rounded-md text-base font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              Register
            </Link>
          </div>
        </div>
      )}

      <ProfileModal open={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} />
    </nav>
  );
}
"""

with open("/Users/anujakhatri/Desktop/capstone/BugChetana/bugchetana-frontend/src/components/layout/Navbar.jsx", "w") as f:
    f.write(new_content)

