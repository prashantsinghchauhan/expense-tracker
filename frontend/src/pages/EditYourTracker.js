import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Default categories that users can delete
const DEFAULT_CATEGORIES = ['Food', 'Fuel', 'Travel', 'Rent', 'Shopping', 'Entertainment', 'Bills', 'Investment', 'Health', 'Other'];

function EditYourTracker({ user }) {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories', 'paidby', 'reminders'
  const [categories, setCategories] = useState([]);
  const [paidByMembers, setPaidByMembers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Reminder form state
  const [newReminder, setNewReminder] = useState({
    name: '',
    amount: '',
    category: '',
    paid_by: '',
    payment_method: '',
    start_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    end_month: '',
    is_active: true
  });
  const [editingReminder, setEditingReminder] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadCategories(), loadPaidByMembers(), loadReminders()]);
    setLoading(false);
  };

  const loadCategories = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/categories`, {
        withCredentials: true
      });
      const apiCategories = Array.isArray(res.data) ? res.data.map((c) => ({ id: c.id, name: c.name })) : [];
      // Merge with defaults - show all categories (defaults + user-created)
      const allCategories = [...DEFAULT_CATEGORIES.map(name => ({ id: `default_${name}`, name, isDefault: true })), ...apiCategories];
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to defaults only
      setCategories(DEFAULT_CATEGORIES.map(name => ({ id: `default_${name}`, name, isDefault: true })));
    }
  };

  const loadPaidByMembers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/paidby`, {
        withCredentials: true
      });
      const members = Array.isArray(res.data) ? res.data.map((m) => ({ id: m.id, name: m.name })) : [];
      setPaidByMembers(members);
    } catch (error) {
      console.error('Error loading PaidBy members:', error);
      setPaidByMembers([]);
    }
  };

  const loadReminders = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/reminders`, {
        withCredentials: true
      });
      const reminderList = Array.isArray(res.data) ? res.data : [];
      setReminders(reminderList);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]);
    }
  };

  // ============= CATEGORY MANAGEMENT =============
  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      const res = await axios.post(`${BACKEND_URL}/api/categories`, { name }, {
        withCredentials: true
      });
      setCategories((prev) => [...prev, { id: res.data.id, name: res.data.name, isDefault: false }]);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert(error.response?.data?.detail || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete category "${categoryName}"? ${categoryId.startsWith('default_') ? 'Default categories can be hidden but will reappear on refresh. ' : ''}Categories already used in transactions cannot be deleted.`)) return;

    try {
      // If it's a default category (starts with "default_"), we can't delete via API
      // Remove from UI list (it will reappear on refresh since defaults are hardcoded)
      if (categoryId.startsWith('default_')) {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
        // Note: In a production app, you'd store user preferences for hidden defaults
        alert('Default category removed from view. It may reappear on page refresh.');
        return;
      }

      // User-created category - delete via API (backend validates usage)
      await axios.delete(`${BACKEND_URL}/api/categories/${categoryId}`, {
        withCredentials: true
      });
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.detail || 'Failed to delete category. It may be in use in transactions or budgets.');
    }
  };

  // ============= PAIDBY MEMBER MANAGEMENT =============
  const handleAddMember = async (e) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;

    try {
      const res = await axios.post(`${BACKEND_URL}/api/paidby`, { name }, {
        withCredentials: true
      });
      setPaidByMembers((prev) => [...prev, { id: res.data.id, name: res.data.name }]);
      setNewMemberName('');
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.detail || 'Failed to add member');
    }
  };

  const handleDeleteMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to delete member "${memberName}"? This cannot be done if they are already used in transactions.`)) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/paidby/${memberId}`, {
        withCredentials: true
      });
      setPaidByMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (error) {
      console.error('Error deleting member:', error);
      alert(error.response?.data?.detail || 'Failed to delete member. They may be in use.');
    }
  };

  // ============= REMINDER MANAGEMENT =============
  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.name || !newReminder.amount || !newReminder.category || !newReminder.paid_by || !newReminder.payment_method || !newReminder.end_month) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${BACKEND_URL}/api/reminders`, newReminder, {
        withCredentials: true
      });
      setNewReminder({
        name: '',
        amount: '',
        category: '',
        paid_by: '',
        payment_method: '',
        start_month: new Date().toISOString().slice(0, 7),
        end_month: '',
        is_active: true
      });
      loadReminders();
    } catch (error) {
      console.error('Error adding reminder:', error);
      alert(error.response?.data?.detail || 'Failed to add reminder');
    }
  };

  const handleUpdateReminder = async (reminderId, updates) => {
    try {
      await axios.put(`${BACKEND_URL}/api/reminders/${reminderId}`, updates, {
        withCredentials: true
      });
      loadReminders();
      setEditingReminder(null);
    } catch (error) {
      console.error('Error updating reminder:', error);
      alert(error.response?.data?.detail || 'Failed to update reminder');
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Are you sure you want to delete this reminder? Execution history will be preserved.')) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/reminders/${reminderId}`, {
        withCredentials: true
      });
      loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      alert(error.response?.data?.detail || 'Failed to delete reminder');
    }
  };

  const toggleReminderActive = async (reminder) => {
    await handleUpdateReminder(reminder.id, { is_active: !reminder.is_active });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navigation user={user} />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Your Tracker</h1>
          <p className="text-gray-600 mt-1">Manage categories, members, and reminders</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('paidby')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'paidby'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Paid By (Members)
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reminders'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reminders
            </button>
          </nav>
        </div>

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage Categories</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add custom categories or remove default categories you don't use. Categories already used in transactions cannot be deleted.
            </p>
            
            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition duration-200"
              >
                Add Category
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">All Categories</h3>
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500">No categories available.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm border ${
                        cat.isDefault 
                          ? 'bg-blue-50 border-blue-200 text-blue-800' 
                          : 'bg-gray-100 border-gray-200 text-gray-800'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {cat.isDefault && (
                        <span className="text-xs text-blue-600">(default)</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PaidBy Members Tab */}
        {activeTab === 'paidby' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage Paid By Members</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add members (people/accounts) who can pay for expenses. Members already used in transactions cannot be deleted.
            </p>
            
            <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder="Member name (e.g., John, My Account, etc.)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition duration-200"
              >
                Add Member
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">All Members</h3>
              {paidByMembers.length === 0 ? (
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                  No members yet. Add members above to use them when creating transactions.
                </div>
              ) : (
                <div className="space-y-2">
                  {paidByMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="text-sm font-medium text-gray-900">{member.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage Reminders</h2>
            <p className="text-sm text-gray-600 mb-4">
              Set up automatic monthly reminders for EMI, SIP, investments, and subscriptions. Reminders will automatically create expense transactions when you check them off in the dashboard.
            </p>

            {/* Add New Reminder Form */}
            <form onSubmit={handleAddReminder} className="mb-6 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Home EMI, SIP Mutual Fund"
                    value={newReminder.name}
                    onChange={(e) => setNewReminder({ ...newReminder, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newReminder.amount}
                    onChange={(e) => setNewReminder({ ...newReminder, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={newReminder.category}
                    onChange={(e) => setNewReminder({ ...newReminder, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.filter(c => !c.isDefault || c.name !== 'Credit').map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid By *</label>
                  {paidByMembers.length === 0 ? (
                    <input
                      type="text"
                      placeholder="Add members first"
                      value={newReminder.paid_by}
                      onChange={(e) => setNewReminder({ ...newReminder, paid_by: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      required
                    />
                  ) : (
                    <select
                      value={newReminder.paid_by}
                      onChange={(e) => setNewReminder({ ...newReminder, paid_by: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="">Select Member</option>
                      {paidByMembers.map((member) => (
                        <option key={member.id} value={member.name}>{member.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                  <select
                    value={newReminder.payment_method}
                    onChange={(e) => setNewReminder({ ...newReminder, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    required
                  >
                    <option value="">Select Payment Method</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Month *</label>
                  <input
                    type="month"
                    value={newReminder.start_month}
                    onChange={(e) => setNewReminder({ ...newReminder, start_month: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Month *</label>
                  <input
                    type="month"
                    value={newReminder.end_month}
                    onChange={(e) => setNewReminder({ ...newReminder, end_month: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition duration-200 text-sm"
              >
                Add Reminder
              </button>
            </form>

            {/* Reminders List */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">All Reminders</h3>
              {reminders.length === 0 ? (
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                  No reminders yet. Add a reminder above to get started.
                </div>
              ) : (
                reminders.map((reminder) => {
                  const isPastEnd = reminder.end_month < new Date().toISOString().slice(0, 7);
                  const isFuture = reminder.start_month > new Date().toISOString().slice(0, 7);
                  
                  return (
                    <div
                      key={reminder.id}
                      className={`p-4 rounded-lg border ${
                        !reminder.is_active
                          ? 'bg-gray-50 border-gray-200'
                          : isPastEnd
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">{reminder.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              !reminder.is_active
                                ? 'bg-gray-200 text-gray-600'
                                : isPastEnd
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {!reminder.is_active ? 'Inactive' : isPastEnd ? 'Ended' : 'Active'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Amount: ₹{parseFloat(reminder.amount).toLocaleString('en-IN')} • Category: {reminder.category}</p>
                            <p>Paid By: {reminder.paid_by} • Payment: {reminder.payment_method || 'Not set'}</p>
                            <p>Period: {reminder.start_month} to {reminder.end_month}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => toggleReminderActive(reminder)}
                            className={`px-3 py-1 text-xs rounded transition duration-200 ${
                              reminder.is_active
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {reminder.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="px-3 py-1 text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditYourTracker;
