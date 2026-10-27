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
      const DEFAULT_CATEGORIES = ['Food', 'Fuel', 'Travel', 'Rent', 'Shopping', 'Entertainment', 'Bills', 'Investment', 'Health', 'Other'];
      const res = await axios.get(`${BACKEND_URL}/api/categories`, { withCredentials: true });
      const apiNames = Array.isArray(res.data) ? res.data.map((c) => c.name) : [];
      setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...apiNames])));
    } catch (error) {
      console.error('Error loading categories:', error);
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
      await axios.delete(`${BACKEND_URL}/api/budgets/${budgetId}`, { withCredentials: true });
      loadBudgets(budgetYear);
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    }
  };

  const availableCategories = categories.filter(cat => !budgets.some(b => b.category === cat));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-16">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-slate-400">Loading budgets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-20 pb-12">
      <Navigation user={user} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white" data-testid="budgets-title">Budget Settings</h1>
          <p className="text-slate-400 mt-1">Set monthly and yearly spending limits for each category</p>
        </div>

        <div className="mb-6 flex items-center space-x-3">
          <label className="text-xs font-bold uppercase text-slate-400">Budget Year:</label>
          <select
            value={budgetYear}
            onChange={(e) => setBudgetYear(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white"
          >
            {Array.from({ length: 5 }).map((_, idx) => {
              const year = new Date().getFullYear() - 2 + idx;
              return (
                <option key={year} value={year}>{year}</option>
              );
            })}
          </select>
        </div>

        <div className="glass-panel rounded-3xl p-6 mb-6">
          <h2 className="text-base font-bold text-white mb-4">Add New Budget</h2>
          <form onSubmit={handleAddBudget} className="flex flex-col sm:flex-row gap-4">
            <select
              value={newBudget.category}
              onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
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
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
              min="0"
              step="0.01"
              required
              data-testid="budget-limit-input"
            />
            <input
              type="number"
              value={newBudget.year}
              onChange={(e) => setNewBudget({ ...newBudget, year: e.target.value })}
              className="w-28 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
              min="2000"
              max="2100"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
              data-testid="add-budget-button"
            >
              {saving ? 'Adding...' : 'Add Budget'}
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">Current Budgets ({budgetYear})</h2>
          </div>
          {budgets.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 text-sm">
              No budgets set yet for this year. Add your first budget above!
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {budgets.map((budget) => (
                <div key={budget.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-900/40 transition" data-testid={`budget-item-${budget.category}`}>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">{budget.category}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
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
                      className="w-32 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
                      min="0"
                      step="0.01"
                      data-testid={`edit-budget-${budget.category}`}
                    />
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
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
      </div>
    </div>
  );
}

export default BudgetSettings;