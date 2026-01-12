import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

  // Move applyFilters above its usage!
  const applyFilters = () => {
    let filtered = [...expenses];

    if (filters.search) {
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        e.category.toLowerCase().includes(filters.search.toLowerCase())
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
  }, [expenses, filters]); // Correct dependencies

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
      // Non-fatal – filters will just show "All Categories"
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
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

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
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading expenses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="expenses-title">All Transactions</h1>
          <p className="text-gray-600 mt-1">View and manage your transactions</p>
        </div>

        {/* Filters */}
        <ExpenseFilters filters={filters} setFilters={setFilters} categories={categories} paidByMembers={paidByMembers} />

        {/* Summary Cards (Sticky) */}
        {filteredExpenses.length > 0 && (
          <div className="sticky top-20 z-40 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg shadow-md">
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  ₹{filteredExpenses
                    .filter(e => e.transaction_type === 'expense')
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ₹{filteredExpenses
                    .filter(e => e.transaction_type === 'income')
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <p className={`text-2xl font-bold mt-1 ${
                  (filteredExpenses.filter(e => e.transaction_type === 'income').reduce((sum, e) => sum + e.amount, 0) -
                   filteredExpenses.filter(e => e.transaction_type === 'expense').reduce((sum, e) => sum + e.amount, 0)) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  ₹{(filteredExpenses.filter(e => e.transaction_type === 'income').reduce((sum, e) => sum + e.amount, 0) -
                     filteredExpenses.filter(e => e.transaction_type === 'expense').reduce((sum, e) => sum + e.amount, 0))
                    .toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {filteredExpenses.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Member-wise Breakdown (when Paid By filter is active) */}
        {filters.paid_by && filteredExpenses.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              How {filters.paid_by}'s money was spent
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                // Calculate category-wise breakdown for selected member
                const categoryBreakdown = {};
                filteredExpenses
                  .filter(e => e.transaction_type === 'expense')
                  .forEach(e => {
                    if (!categoryBreakdown[e.category]) {
                      categoryBreakdown[e.category] = 0;
                    }
                    categoryBreakdown[e.category] += e.amount;
                  });
                
                return Object.entries(categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">{category}</span>
                      <span className="font-semibold text-gray-900">
                        ₹{amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid By</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No transactions found. Add your first transaction!
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50" data-testid={`expense-row-${expense.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{expense.description}</div>
                        {expense.notes && <div className="text-gray-500 text-xs mt-1">{expense.notes}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          expense.transaction_type === 'expense' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {expense.transaction_type === 'expense' ? 'Expense' : 'Income'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        <span className={expense.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                          {expense.transaction_type === 'expense' ? '-' : '+'}₹{expense.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {expense.paid_by || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                          data-testid={`edit-expense-${expense.id}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-900"
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


        {/* Floating Add Button */}
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowAddModal(true);
          }}
          className="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition duration-200"
          data-testid="add-expense-fab"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add/Edit Expense Modal */}
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
