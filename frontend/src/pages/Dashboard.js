import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navigation from '../components/Navigation';
import SummaryCards from '../components/SummaryCards';
import ExpenseChart from '../components/ExpenseChart';
import CategoryChart from '../components/CategoryChart';
import BudgetAlerts from '../components/BudgetAlerts';
import RecentTransactions from '../components/RecentTransactions';
import AddExpenseModal from '../components/AddExpenseModal';

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, categoryRes, trendRes, alertsRes, expensesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/expenses/summary/stats`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/expenses/summary/by-category`, { withCredentials: true }),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="dashboard-title">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
        </div>

        {/* Summary Cards */}
        <SummaryCards summary={summary} />

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <div className="mb-8">
            <BudgetAlerts alerts={budgetAlerts} />
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ExpenseChart data={monthlyTrend} />
          <CategoryChart data={categoryData} />
        </div>

        {/* Recent Transactions */}
        <RecentTransactions 
          expenses={recentExpenses} 
          onViewAll={() => navigate('/expenses')}
        />

        {/* Floating Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition duration-200"
          data-testid="add-expense-fab"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

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
