import React, { useState, useEffect } from 'react';
import axios from "../axios.js";
import Navigation from '../components/Navigation';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function BudgetSettings({ user }) {
  const [budgets, setBudgets] = useState([]);
  const [newBudget, setNewBudget] = useState({ category: '', monthly_limit: '', year: new Date().getFullYear() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadBudgets(budgetYear);
    loadCategories();
  }, [budgetYear]);

  const loadBudgets = async (year) => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/budgets`, {
        params: { year },
        withCredentials: true
      });
      setBudgets(response.data);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      // Load all categories (defaults + user-created) for budget selection
      const DEFAULT_CATEGORIES = ['Food', 'Fuel', 'Travel', 'Rent', 'Shopping', 'Entertainment', 'Bills', 'Investment', 'Health', 'Other'];
      const res = await axios.get(`${BACKEND_URL}/api/categories`, {
        withCredentials: true
      });
      const apiNames = Array.isArray(res.data) ? res.data.map((c) => c.name) : [];
      // Merge defaults with user categories
      const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...apiNames]));
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to defaults
      const DEFAULT_CATEGORIES = ['Food', 'Fuel', 'Travel', 'Rent', 'Shopping', 'Entertainment', 'Bills', 'Investment', 'Health', 'Other'];
      setCategories(DEFAULT_CATEGORIES);
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!newBudget.category || !newBudget.monthly_limit) return;

    try {
      setSaving(true);
      await axios.post(
        `${BACKEND_URL}/api/budgets`,
        {
          category: newBudget.category,
          monthly_limit: parseFloat(newBudget.monthly_limit),
          year: newBudget.year || budgetYear
        },
        { withCredentials: true }
      );
      setNewBudget({ category: '', monthly_limit: '', year: budgetYear });
      loadBudgets(budgetYear);
    } catch (error) {
      console.error('Error adding budget:', error);
      alert(error.response?.data?.detail || 'Failed to add budget');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBudget = async (budgetId, newLimit) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/budgets/${budgetId}`,
        { monthly_limit: parseFloat(newLimit) },
        { withCredentials: true }
      );
      loadBudgets(budgetYear);
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Failed to update budget');
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/budgets/${budgetId}`, {
        withCredentials: true
      });
      loadBudgets(budgetYear);
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    }
  };

  const availableCategories = categories.filter(cat => !budgets.some(b => b.category === cat));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading budgets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navigation user={user} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="budgets-title">Budget Settings</h1>
          <p className="text-gray-600 mt-1">Set monthly and yearly spending limits for each category</p>
        </div>

        {/* Budget year selector */}
        <div className="mb-4 flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Budget Year:</label>
          <select
            value={budgetYear}
            onChange={(e) => setBudgetYear(parseInt(e.target.value, 10))}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {Array.from({ length: 5 }).map((_, idx) => {
              const year = new Date().getFullYear() - 2 + idx;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        {/* Add New Budget */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Budget</h2>
          <form onSubmit={handleAddBudget} className="flex flex-col sm:flex-row gap-4">
            <select
              value={newBudget.category}
              onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              data-testid="budget-category-select"
            >
              <option value="">Select Category</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Monthly Limit (₹)"
              value={newBudget.monthly_limit}
              onChange={(e) => setNewBudget({ ...newBudget, monthly_limit: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              min="0"
              step="0.01"
              required
              data-testid="budget-limit-input"
            />
            <input
              type="number"
              value={newBudget.year}
              onChange={(e) => setNewBudget({ ...newBudget, year: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              min="2000"
              max="2100"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50"
              data-testid="add-budget-button"
            >
              {saving ? 'Adding...' : 'Add Budget'}
            </button>
          </form>
        </div>

        {/* Existing Budgets */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Current Budgets ({budgetYear})</h2>
          </div>
          {budgets.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No budgets set yet for this year. Add your first budget above!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {budgets.map((budget) => (
                <div key={budget.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50" data-testid={`budget-item-${budget.category}`}>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{budget.category}</h3>
                    <p className="text-sm text-gray-500">
                      Year: {budget.year} · Monthly limit: ₹{budget.monthly_limit.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      defaultValue={budget.monthly_limit}
                      onBlur={(e) => {
                        const newValue = e.target.value;
                        if (newValue && parseFloat(newValue) !== budget.monthly_limit) {
                          handleUpdateBudget(budget.id, newValue);
                        }
                      }}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                      data-testid={`edit-budget-${budget.category}`}
                    />
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                      data-testid={`delete-budget-${budget.category}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">About Budget Alerts</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Set monthly spending limits for each category per year</li>
                  <li>Get alerts on your dashboard when you exceed 80% of your budget</li>
                  <li>Track your spending patterns and stay within your limits</li>
                  <li>Update limits anytime by clicking on the amount and typing a new value</li>
                  <li>To manage categories, go to "Edit Your Tracker" in the navigation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BudgetSettings;
