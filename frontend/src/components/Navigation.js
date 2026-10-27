import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from "../axios.js";
import { LayoutDashboard, Receipt, PieChart, Sliders, LogOut } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Navigation({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const isActive = (path) => location.pathname === path || (path === '/dashboard' && location.pathname === '/');

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-extrabold text-xl">₹</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white">Expense Tracker</span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 rounded-full border border-indigo-500/30">
                Pro Suite
              </span>
            </div>
            <span className="block text-xs text-slate-400">Personal & Family Financial Ledger</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => navigate('/dashboard')}
            data-testid="nav-dashboard"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              isActive('/dashboard') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => navigate('/expenses')}
            data-testid="nav-expenses"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              isActive('/expenses') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Transactions</span>
          </button>

          <button
            onClick={() => navigate('/budgets')}
            data-testid="nav-budgets"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              isActive('/budgets') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Budgets</span>
          </button>

          <button
            onClick={() => navigate('/edit-tracker')}
            data-testid="nav-edit-tracker"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              isActive('/edit-tracker') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Edit Tracker</span>
          </button>
        </nav>

        {/* Right Actions / User Profile */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2.5 pl-2 border-l border-slate-800">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-indigo-500/40" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="text-left">
              <span className="block text-xs font-bold text-white leading-none">{user?.name?.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                data-testid="logout-button"
                className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center space-x-1 mt-0.5"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden justify-around border-t border-slate-800/80 bg-slate-900/90 py-2 px-2 pb-safe">
        <button onClick={() => navigate('/dashboard')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isActive('/dashboard') ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
          Dashboard
        </button>
        <button onClick={() => navigate('/expenses')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isActive('/expenses') ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
          Ledger
        </button>
        <button onClick={() => navigate('/budgets')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isActive('/budgets') ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
          Budgets
        </button>
        <button onClick={() => navigate('/edit-tracker')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isActive('/edit-tracker') ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
          Settings
        </button>
      </div>
    </header>
  );
}

export default Navigation;