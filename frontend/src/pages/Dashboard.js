import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../axios.js';
import Navigation from '../components/Navigation';
import SummaryCards from '../components/SummaryCards';
import ExpenseChart from '../components/ExpenseChart';
import CategoryChart from '../components/CategoryChart';
import BudgetAlerts from '../components/BudgetAlerts';
import RecentTransactions from '../components/RecentTransactions';
import AddExpenseModal from '../components/AddExpenseModal';
import ReminderWidget from '../components/ReminderWidget';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryMonth, setCategoryMonth] = useState('current');

  useEffect(() => {
    loadDashboardData();
  }, [categoryMonth]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const monthParam = categoryMonth === 'current' ? currentMonth : (categoryMonth || null);
      
      const categoryUrl = monthParam 
        ? `${BACKEND_URL}/api/expenses/summary/by-category?month=${monthParam}`
        : `${BACKEND_URL}/api/expenses/summary/by-category`;
      
      const [summaryRes, categoryRes, trendRes, alertsRes, expensesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/expenses/summary/stats`, { withCredentials: true }),
        axios.get(categoryUrl, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/expenses/summary/monthly-trend`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/budgets/alerts`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/expenses?limit=5`, { withCredentials: true })
      ]);

      setSummary(summaryRes.data);
      setCategoryData(categoryRes.data);
      setMonthlyTrend(trendRes.data);
      setBudgetAlerts(alertsRes.data);
      setRecentExpenses(expensesRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseAdded = () => {
    setShowAddModal(false);
    loadDashboardData();
  };

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-slate-400 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentMonthStr = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navigation user={user} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Executive Hero Header */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Active Financial Ledger • {currentMonthStr}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white" data-testid="dashboard-title">
                Welcome back, {user?.name?.split(' ')[0]}!
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Track your household expenses, member-wise spending, and automated monthly commitments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/edit-tracker')}
                className="px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-bold text-indigo-300 border border-indigo-500/20 transition"
              >
                Manage Members & Reminders
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <SummaryCards summary={summary} />

          {/* Budget Alerts Widget */}
          <BudgetAlerts alerts={budgetAlerts} onManageBudgets={() => navigate('/budgets')} />

          {/* Active Reminders Widget */}
          <ReminderWidget onReminderExecuted={loadDashboardData} />

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpenseChart data={monthlyTrend} />
            <CategoryChart 
              data={categoryData} 
              categoryMonth={categoryMonth} 
              setCategoryMonth={setCategoryMonth} 
            />
          </div>

          {/* Recent Transactions */}
          <RecentTransactions 
            expenses={recentExpenses} 
            onViewAll={() => navigate('/expenses')}
            onEdit={() => { /* In this version, we redirect to expenses page to edit */ navigate('/expenses'); }}
          />
        </div>

        {/* Floating Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-8 right-8 z-40 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full p-4 shadow-xl shadow-indigo-600/30 transition transform hover:scale-105 active:scale-95"
          data-testid="add-expense-fab"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </main>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={handleExpenseAdded}
        />
      )}
    </div>
  );
}

export default Dashboard;