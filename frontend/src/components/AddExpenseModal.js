import React, { useState, useEffect } from 'react';
import axios from "../axios.js";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const DEFAULT_CATEGORIES = ['Food', 'Fuel', 'Travel', 'Rent', 'Shopping', 'Entertainment', 'Bills', 'Investment', 'Health', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI'];

function AddExpenseModal({ expense, onClose, onSuccess }) {
  const isEdit = !!expense;
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [paidByMembers, setPaidByMembers] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [formData, setFormData] = useState({
    date: expense?.date || new Date().toISOString().split('T')[0],
    category: expense?.transaction_type === 'income' ? 'Credit' : (expense?.category || ''),
    description: expense?.description || '',
    amount: expense?.amount || '',
    transaction_type: expense?.transaction_type || 'expense',
    payment_method: expense?.payment_method || 'UPI',
    paid_by: expense?.paid_by || '',
    notes: expense?.notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const emptyRow = {
    description: '',
    amount: '',
    category: '',
    transaction_type: 'expense',
    payment_method: 'UPI',
    paid_by: '',
    notes: ''
  };
  const [rows, setRows] = useState([{ ...emptyRow }, { ...emptyRow }]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/categories`, { withCredentials: true });
        const apiNames = Array.isArray(res.data) ? res.data.map((c) => c.name) : [];
        setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...apiNames])));
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    const loadPaidByMembers = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/paidby`, { withCredentials: true });
        const memberNames = Array.isArray(res.data) ? res.data.map((m) => m.name) : [];
        setPaidByMembers(memberNames);
      } catch (err) {
        console.error('Error loading PaidBy members:', err);
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
        category: formData.transaction_type === 'income' ? 'Credit' : formData.category
      };

      if (isEdit) {
        await axios.put(`${BACKEND_URL}/api/expenses/${expense.id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${BACKEND_URL}/api/expenses`, payload, { withCredentials: true });
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
      const payload = rows
        .map((row) => ({
          date: bulkDate,
          description: row.description?.trim(),
          amount: row.amount ? parseFloat(row.amount) : 0,
          transaction_type: row.transaction_type || 'expense',
          payment_method: row.payment_method,
          paid_by: row.paid_by || undefined,
          notes: row.notes || undefined,
          category: row.transaction_type === 'income' ? 'Credit' : row.category
        }))
        .filter((item) => item.description && item.amount > 0 && item.payment_method && item.paid_by);

      if (payload.length === 0) {
        setError('Please fill at least one valid row before saving.');
        setSaving(false);
        return;
      }

      await axios.post(`${BACKEND_URL}/api/expenses/bulk`, payload, { withCredentials: true });
      onSuccess();
    } catch (err) {
      console.error('Error saving bulk expenses:', err);
      setError(err.response?.data?.detail || 'Failed to save bulk expenses');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className={`glass-panel rounded-3xl border border-slate-700/80 shadow-2xl w-full ${bulkMode ? 'max-w-4xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto p-6 sm:p-8`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white" data-testid="expense-modal-title">
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" data-testid="close-modal-button">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        {!isEdit && (
          <div className="mb-4 flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 pl-2">Mode</span>
            <button
              type="button"
              onClick={() => setBulkMode(!bulkMode)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold px-3 py-1 rounded-lg bg-indigo-500/10"
            >
              {bulkMode ? 'Switch to single entry' : 'Switch to bulk entry'}
            </button>
          </div>
        )}

        {!bulkMode ? (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Transaction Type *</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="transaction_type"
                    value="expense"
                    checked={formData.transaction_type === 'expense'}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                    data-testid="transaction-type-expense"
                  />
                  <span className="text-white font-medium">Expense</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="transaction_type"
                    value="income"
                    checked={formData.transaction_type === 'income'}
                    onChange={(e) => setFormData({ ...formData, transaction_type: 'income', category: 'Credit' })}
                    data-testid="transaction-type-income"
                  />
                  <span className="text-white font-medium">Income</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  required
                  data-testid="expense-date-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Amount (₹) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
                  min="0"
                  step="0.01"
                  required
                  data-testid="expense-amount-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Category *</label>
                <select
                  value={formData.transaction_type === 'income' ? 'Credit' : formData.category}
                  onChange={(e) => formData.transaction_type !== 'income' && setFormData({ ...formData, category: e.target.value })}
                  disabled={formData.transaction_type === 'income'}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  required
                  data-testid="expense-category-select"
                >
                  <option value="">Select Category</option>
                  {formData.transaction_type === 'income' ? (
                    <option value="Credit">Credit</option>
                  ) : (
                    categories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Payment Method *</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  required
                  data-testid="expense-payment-method-select"
                >
                  {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Description *</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                placeholder="What was this for?"
                required
                data-testid="expense-description-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Paid By *</label>
              <select
                value={formData.paid_by}
                onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                required
                data-testid="expense-paid-by-select"
              >
                <option value="">Select Member</option>
                {paidByMembers.map(member => <option key={member} value={member}>{member}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                rows="2"
                data-testid="expense-notes-input"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold"
                data-testid="cancel-expense-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
                data-testid="save-expense-button"
              >
                {saving ? 'Saving...' : (isEdit ? 'Update' : 'Save')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Shared Date</label>
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="w-full max-w-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 items-end">
                  <input
                    type="text"
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[index].description = e.target.value;
                      setRows(updated);
                    }}
                    className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[index].amount = e.target.value;
                      setRows(updated);
                    }}
                    className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white"
                  />
                  <select
                    value={row.category}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[index].category = e.target.value;
                      setRows(updated);
                    }}
                    className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">Category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={row.payment_method}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[index].payment_method = e.target.value;
                      setRows(updated);
                    }}
                    className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={row.paid_by}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[index].paid_by = e.target.value;
                      setRows(updated);
                    }}
                    className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">Paid By</option>
                    {paidByMembers.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((_, i) => i !== index))}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setRows([...rows, { ...emptyRow }])}
                className="text-xs font-bold text-indigo-400"
              >
                + Add Row
              </button>
              <div className="space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-900 rounded-xl text-xs font-bold text-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 rounded-xl text-xs font-bold text-white shadow-lg">
                  Save All
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddExpenseModal;