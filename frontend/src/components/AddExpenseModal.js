import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Default categories used as a base; user-managed categories are loaded from the API
const DEFAULT_CATEGORIES = ['Food', 'Fuel', 'Travel', 'Rent', 'Shopping', 'Entertainment', 'Bills', 'Investment', 'Health', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI'];

function AddExpenseModal({ expense, onClose, onSuccess }) {
  const isEdit = !!expense;
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [paidByMembers, setPaidByMembers] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [formData, setFormData] = useState({
    date: expense?.date || new Date().toISOString().split('T')[0],
    // For income transactions, category must be "Credit"
    category: expense?.transaction_type === 'income' ? 'Credit' : (expense?.category || ''),
    description: expense?.description || '',
    amount: expense?.amount || '',
    transaction_type: expense?.transaction_type || 'expense',
    payment_method: expense?.payment_method || '',
    paid_by: expense?.paid_by || '',
    notes: expense?.notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Rows for bulk entry – all share the same date by default
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const emptyRow = {
    description: '',
    amount: '',
    category: '',
    transaction_type: 'expense',
    payment_method: '',
    paid_by: '',
    notes: ''
  };
  const [rows, setRows] = useState([
    { ...emptyRow },
    { ...emptyRow }
  ]);

  // Load user categories and merge with defaults (to keep existing data usable)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/categories`, {
          withCredentials: true
        });
        const apiNames = Array.isArray(res.data) ? res.data.map((c) => c.name) : [];
        const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...apiNames]));
        setCategories(merged);
      } catch (err) {
        // Silent failure – fall back to defaults
        console.error('Error loading categories:', err);
      }
    };

    const loadPaidByMembers = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/paidby`, {
          withCredentials: true
        });
        const memberNames = Array.isArray(res.data) ? res.data.map((m) => m.name) : [];
        setPaidByMembers(memberNames);
      } catch (err) {
        // Silent failure – empty list
        console.error('Error loading PaidBy members:', err);
        setPaidByMembers([]);
      }
    };

    loadCategories();
    loadPaidByMembers();
  }, []);

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        // Enforce "Credit" category for income transactions
        category: formData.transaction_type === 'income' ? 'Credit' : formData.category
      };

      if (isEdit) {
        await axios.put(
          `${BACKEND_URL}/api/expenses/${expense.id}`,
          payload,
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${BACKEND_URL}/api/expenses`,
          payload,
          { withCredentials: true }
        );
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(err.response?.data?.detail || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Build payload, ignore completely empty/invalid rows
      const payload = rows
        .map((row) => ({
          date: bulkDate,
          description: row.description?.trim(),
          amount: row.amount ? parseFloat(row.amount) : 0,
          transaction_type: row.transaction_type || 'expense',
          payment_method: row.payment_method,
          paid_by: row.paid_by || undefined,
          notes: row.notes || undefined,
          // For income, backend will coerce category to "Credit". For expenses we keep user category.
          category: row.transaction_type === 'income' ? undefined : row.category
        }))
        .filter(
          (item) =>
            item.description &&
            item.amount > 0 &&
            item.payment_method &&
            item.paid_by  // PaidBy is now mandatory
        );

      if (payload.length === 0) {
        setError('Please fill at least one valid row before saving.');
        setSaving(false);
        return;
      }

      await axios.post(
        `${BACKEND_URL}/api/expenses/bulk`,
        payload,
        { withCredentials: true }
      );

      onSuccess();
    } catch (err) {
      console.error('Error saving expenses in bulk:', err);
      setError(err.response?.data?.detail || 'Failed to save expenses');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900" data-testid="expense-modal-title">
              {isEdit ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              data-testid="close-modal-button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Mode toggle */}
          {!isEdit && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {bulkMode
                  ? 'Add multiple transactions for the same date in one go.'
                  : 'Add a single transaction.'}
              </span>
              <button
                type="button"
                onClick={() => setBulkMode(!bulkMode)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {bulkMode ? 'Switch to single entry' : 'Switch to bulk entry'}
              </button>
            </div>
          )}

          {/* Single transaction form */}
          {!bulkMode && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transaction_type"
                    value="expense"
                    checked={formData.transaction_type === 'expense'}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                    className="w-4 h-4 text-indigo-600"
                    data-testid="transaction-type-expense"
                  />
                  <span className="text-gray-700">Expense</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transaction_type"
                    value="income"
                    checked={formData.transaction_type === 'income'}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData({ 
                        ...formData, 
                        transaction_type: newType,
                        // When switching to Income, automatically set category to "Credit"
                        category: newType === 'income' ? 'Credit' : formData.category
                      });
                    }}
                    className="w-4 h-4 text-indigo-600"
                    data-testid="transaction-type-income"
                  />
                  <span className="text-gray-700">Income</span>
                </label>
              </div>
            </div>

            {/* Date and Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  data-testid="expense-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                  data-testid="expense-amount-input"
                />
              </div>
            </div>

            {/* Category and Payment Method */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *{formData.transaction_type === 'income' && ' (fixed to Credit)'}
                </label>
                <select
                  value={formData.transaction_type === 'income' ? 'Credit' : formData.category}
                  onChange={(e) => {
                    // Only allow changes if it's not an income transaction
                    if (formData.transaction_type !== 'income') {
                      setFormData({ ...formData, category: e.target.value });
                    }
                  }}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    formData.transaction_type === 'income' ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  disabled={formData.transaction_type === 'income'}
                  required
                  data-testid="expense-category-select"
                >
                  <option value="">Select Category</option>
                  {formData.transaction_type === 'income' ? (
                    <option value="Credit">Credit</option>
                  ) : (
                    categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  data-testid="expense-payment-method-select"
                >
                  <option value="">Select Payment Method</option>
                  {PAYMENT_METHODS.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="What was this transaction for?"
                required
                data-testid="expense-description-input"
              />
            </div>

            {/* Paid By - Now mandatory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paid By *
              </label>
              {paidByMembers.length === 0 ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.paid_by}
                    onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter member name (add members in Edit Your Tracker)"
                    required
                    data-testid="expense-paid-by-input"
                  />
                  <p className="text-xs text-gray-500">
                    No members yet. Add members in "Edit Your Tracker" section for easier selection.
                  </p>
                </div>
              ) : (
                <select
                  value={formData.paid_by}
                  onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  data-testid="expense-paid-by-select"
                >
                  <option value="">Select Member</option>
                  {paidByMembers.map(member => (
                    <option key={member} value={member}>{member}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows="3"
                placeholder="Additional notes (optional)"
                data-testid="expense-notes-input"
              />
            </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition duration-200"
                  data-testid="cancel-expense-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50"
                  data-testid="save-expense-button"
                >
                  {saving ? 'Saving...' : (isEdit ? 'Update' : 'Add Transaction')}
                </button>
              </div>
            </form>
          )}

          {/* Bulk transaction form – only when creating new */}
          {!isEdit && bulkMode && (
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              {/* Shared Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date for all rows *
                </label>
                <input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-7 gap-2 items-end border border-gray-100 rounded-lg p-3"
                  >
                    {/* Type */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={row.transaction_type}
                        onChange={(e) => {
                          const value = e.target.value;
                          const updated = [...rows];
                          updated[index] = {
                            ...updated[index],
                            transaction_type: value,
                            // When switching to income, clear category (backend will use Credit)
                            category: value === 'income' ? '' : updated[index].category
                          };
                          setRows(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => {
                          const updated = [...rows];
                          updated[index] = { ...updated[index], description: e.target.value };
                          setRows(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                        placeholder="Description"
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) => {
                          const updated = [...rows];
                          updated[index] = { ...updated[index], amount: e.target.value };
                          setRows(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    {/* Category (hidden/disabled for income) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Category{row.transaction_type === 'income' && ' (fixed to Credit)'}
                      </label>
                      <select
                        value={row.category}
                        onChange={(e) => {
                          const updated = [...rows];
                          updated[index] = { ...updated[index], category: e.target.value };
                          setRows(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                        disabled={row.transaction_type === 'income'}
                      >
                        <option value="">
                          {row.transaction_type === 'income' ? 'Credit' : 'Select'}
                        </option>
                        {row.transaction_type === 'expense' &&
                          categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Payment
                      </label>
                      <select
                        value={row.payment_method}
                        onChange={(e) => {
                          const updated = [...rows];
                          updated[index] = { ...updated[index], payment_method: e.target.value };
                          setRows(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                      >
                        <option value="">Select</option>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Paid By - mandatory */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Paid By *
                      </label>
                      {paidByMembers.length === 0 ? (
                        <input
                          type="text"
                          value={row.paid_by}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[index] = { ...updated[index], paid_by: e.target.value };
                            setRows(updated);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                          placeholder="Member name"
                        />
                      ) : (
                        <select
                          value={row.paid_by}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[index] = { ...updated[index], paid_by: e.target.value };
                            setRows(updated);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                        >
                          <option value="">Select</option>
                          {paidByMembers.map((member) => (
                            <option key={member} value={member}>
                              {member}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Remove row */}
                    <div className="flex space-x-2 justify-end">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = rows.filter((_, i) => i !== index);
                            setRows(updated);
                          }}
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add row + actions */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setRows([...rows, { ...emptyRow }])}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Add another row
                </button>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save All'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddExpenseModal;
