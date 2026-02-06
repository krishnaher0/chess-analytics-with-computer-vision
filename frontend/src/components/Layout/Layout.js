import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <footer className="text-center text-gray-600 text-xs py-4 border-t border-gray-900">
        Chess Analytics Prototype &mdash; Nepal Chess Club Project
      </footer>
    </div>
  );
}
