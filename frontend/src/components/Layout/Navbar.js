import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
  { to: '/',            label: 'Home' },
  { to: '/game',        label: 'Play' },
  {
    label: 'Detect',
    submenu: [
      { to: '/detect/image', label: 'Upload Image' },
      { to: '/detect/video', label: 'Upload Video' },
      { to: '/detect/live',  label: 'Live Camera' }
    ]
  },
  {
    label: 'Analysis',
    submenu: [
      { to: '/analysis/upload',  label: 'Analyze PGN' },
      { to: '/analysis/history', label: 'View History' }
    ]
  },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/leaderboards',label: 'Leaderboards' },
  { to: '/profile',     label: 'Profile' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [detectMenuOpen, setDetectMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        {/* brand */}
        <Link to="/" className="text-primary-500 font-bold text-lg tracking-tight">
          ♟ Chess Analytics
        </Link>

        {/* desktop links */}
        <div className="hidden md:flex gap-1 items-center">
          {user && NAV_LINKS.map((item, idx) => {
            if (item.submenu) {
              // Dropdown menu for Detect
              return (
                <div
                  key={idx}
                  className="relative"
                  onMouseEnter={() => setDetectMenuOpen(true)}
                  onMouseLeave={() => setDetectMenuOpen(false)}
                >
                  <button
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1
                      ${location.pathname.startsWith('/detect')
                        ? 'bg-gray-800 text-primary-400'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
                  >
                    {item.label}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {detectMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                      {item.submenu.map((subitem) => (
                        <Link
                          key={subitem.to}
                          to={subitem.to}
                          className={`block px-4 py-2 text-sm transition-colors
                            ${location.pathname === subitem.to
                              ? 'bg-gray-700 text-primary-400'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        >
                          {subitem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              // Regular link
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${location.pathname === item.to
                      ? 'bg-gray-800 text-primary-400'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
                >
                  {item.label}
                </Link>
              );
            }
          })}
        </div>

        {/* right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden sm:inline text-gray-400 text-sm">{user.username}</span>
              <button onClick={logout} className="btn-secondary text-sm px-3 py-1.5">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="text-gray-300 hover:text-white text-sm">Login</Link>
              <Link to="/register" className="btn-primary text-sm px-3 py-1.5">Register</Link>
            </>
          )}

          {/* mobile hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-300 text-xl">
            ☰
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {menuOpen && user && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900 flex flex-col px-4 py-2 gap-1">
          {NAV_LINKS.map((item, idx) => {
            if (item.submenu) {
              // Expandable submenu for mobile
              return (
                <div key={idx}>
                  <div className="px-3 py-2 text-sm font-medium text-gray-400">
                    {item.label}
                  </div>
                  {item.submenu.map((subitem) => (
                    <Link
                      key={subitem.to}
                      to={subitem.to}
                      onClick={() => setMenuOpen(false)}
                      className="pl-6 pr-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white block"
                    >
                      {subitem.label}
                    </Link>
                  ))}
                </div>
              );
            } else {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  {item.label}
                </Link>
              );
            }
          })}
          <button onClick={logout} className="mt-2 text-red-400 text-sm text-left px-3 py-1">Logout</button>
        </div>
      )}
    </nav>
  );
}
