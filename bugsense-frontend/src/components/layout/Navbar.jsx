import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bug, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleSectionClick = (sectionId) => {
    if (location.pathname === '/') {
      // Already on HomePage — just scroll
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // On different page — go to Home first, then scroll
      navigate('/');
      setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      // Already on home — just scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // On another page — navigate home then scroll to top
      navigate('/');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200' : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button onClick={handleLogoClick} className="flex items-center space-x-2 focus:outline-none">
            <Bug className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl tracking-tight text-slate-900">BugSense</span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => handleSectionClick('features')} className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Features</button>
            <button onClick={() => handleSectionClick('how-it-works')} className="text-slate-600 hover:text-blue-600 font-medium transition-colors">How It Works</button>
            <Link to="/login" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Login</Link>
            <Link
              to="/register"
              className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Register
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
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
    </nav>
  );
}
