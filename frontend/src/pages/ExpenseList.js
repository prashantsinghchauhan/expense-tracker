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
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    transaction_type: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadExpenses();
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

    setFilteredExpenses(filtered);
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
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="expenses-title">All Transactions</h1>
          <p className="text-gray-600 mt-1">View and manage your transactions</p>
        </div>

        {/* Filters */}
        <ExpenseFilters filters={filters} setFilters={setFilters} />

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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
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

        {/* Summary */}
        {filteredExpenses.length > 0 && (
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Transactions: {filteredExpenses.length}</span>
              <div className="flex space-x-6">
                <span className="text-red-600 font-semibold">
                  Expenses: -₹{filteredExpenses
                    .filter(e => e.transaction_type === 'expense')
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString('en-IN')}
                </span>
                <span className="text-green-600 font-semibold">
                  Income: +₹{filteredExpenses
                    .filter(e => e.transaction_type === 'income')
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

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
