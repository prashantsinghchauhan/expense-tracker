import React, { useState, useEffect } from 'react';
import axios from "../axios.js";
import Navigation from '../components/Navigation';
import AddExpenseModal from '../components/AddExpenseModal';
import ExpenseFilters from '../components/ExpenseFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ExpenseList({ user }) {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [paidByMembers, setPaidByMembers] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    transaction_type: '',
    paid_by: '',
    date_from: '',
    date_to: ''
  });

  const applyFilters = () => {
    let filtered = [...expenses];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }

    if (filters.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.transaction_type) {
      filtered = filtered.filter(e => e.transaction_type === filters.transaction_type);
    }

    if (filters.date_from) {
      filtered = filtered.filter(e => e.date >= filters.date_from);
    }

    if (filters.date_to) {
      filtered = filtered.filter(e => e.date <= filters.date_to);
    }

    if (filters.paid_by) {
      filtered = filtered.filter(e => e.paid_by === filters.paid_by);
    }

    setFilteredExpenses(filtered);
  };

  useEffect(() => {
    loadExpenses();
    loadCategories();
    loadPaidByMembers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [expenses, filters]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/expenses`, {
        withCredentials: true
      });
      setExpenses(response.data);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const DEFAULT_CATEGORIES = ['Food', 'Fuel', 'Travel', 'Rent', 'Shopping', 'Entertainment', 'Bills', 'Investment', 'Health', 'Other'];
      const res = await axios.get(`${BACKEND_URL}/api/categories`, {
        withCredentials: true
      });
      const apiNames = Array.isArray(res.data) ? res.data.map((c) => c.name) : [];
      setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...apiNames])));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPaidByMembers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/paidby`, {
        withCredentials: true
      });
      const memberNames = Array.isArray(res.data) ? res.data.map((m) => m.name) : [];
      setPaidByMembers(memberNames);
    } catch (error) {
      console.error('Error loading PaidBy members:', error);
      setPaidByMembers([]);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/expenses/${expenseId}`, {
        withCredentials: true
      });
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowAddModal(true);
  };

  const handleExpenseAdded = () => {
    setShowAddModal(false);
    setEditingExpense(null);
    loadExpenses();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-slate-400">Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-20 pb-12">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white" data-testid="expenses-title">All Transactions</h1>
            <p className="text-slate-400 mt-1">View, filter, and manage all your ledger entries</p>
          </div>
          <button
            onClick={() => { setEditingExpense(null); setShowAddModal(true); }}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
          >
            + Add Transaction
          </button>
        </div>

        {/* Filters Component */}
        <ExpenseFilters 
          filters={filters} 
          setFilters={setFilters} 
          categories={categories} 
          paidByMembers={paidByMembers} 
        />

        {/* Sticky Summary Bar */}
        {filteredExpenses.length > 0 && (
          <div className="sticky top-20 z-40 mb-6 glass-panel rounded-2xl p-4 border border-indigo-500/20 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                <p className="text-xs font-bold text-slate-400">Total Expenses</p>
                <p className="text-2xl font-bold font-mono text-rose-400 mt-1">
                  ₹{filteredExpenses
                    .filter(e => e.transaction_type === 'expense')
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                <p className="text-xs font-bold text-slate-400">Total Income</p>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  ₹{filteredExpenses
                    .filter(e => e.transaction_type === 'income')
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                <p className="text-xs font-bold text-slate-400">Net Balance</p>
                {(() => {
                  const balance = 
                    filteredExpenses.filter(e => e.transaction_type === 'income').reduce((sum, e) => sum + e.amount, 0) -
                    filteredExpenses.filter(e => e.transaction_type === 'expense').reduce((sum, e) => sum + e.amount, 0);
                  return (
                    <p className={`text-2xl font-bold font-mono mt-1 ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{balance.toLocaleString('en-IN')}
                    </p>
                  );
                })()}
              </div>
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                <p className="text-xs font-bold text-slate-400">Filtered Count</p>
                <p className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                  {filteredExpenses.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Member-wise Breakdown when Paid By filter is active */}
        {filters.paid_by && filteredExpenses.length > 0 && (
          <div className="glass-panel rounded-3xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">
              How {filters.paid_by}'s money was spent
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const categoryBreakdown = {};
                filteredExpenses
                  .filter(e => e.transaction_type === 'expense')
                  .forEach(e => {
                    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
                  });
                
                return Object.entries(categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
                      <span className="font-semibold text-slate-300 text-xs">{category}</span>
                      <span className="font-mono font-bold text-white text-sm">
                        ₹{amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <div className="glass-panel rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/90 text-slate-400">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Payment</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Paid By</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-900/40 transition" data-testid={`expense-row-${expense.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-300">
                        {new Date(expense.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <div className="font-bold">{expense.description}</div>
                        {expense.notes && <div className="text-slate-400 text-xs mt-0.5">{expense.notes}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase ${
                          expense.transaction_type === 'expense' 
                            ? 'bg-rose-500/15 text-rose-300' 
                            : 'bg-emerald-500/15 text-emerald-300'
                        }`}>
                          {expense.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold">
                        <span className={expense.transaction_type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}>
                          {expense.transaction_type === 'expense' ? '-' : '+'}₹{expense.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300">
                        {expense.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-white">
                        {expense.paid_by || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                          data-testid={`edit-expense-${expense.id}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          data-testid={`delete-expense-${expense.id}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddExpenseModal 
          expense={editingExpense}
          onClose={() => {
            setShowAddModal(false);
            setEditingExpense(null);
          }}
          onSuccess={handleExpenseAdded}
        />
      )}
    </div>
  );
}

export default ExpenseList;