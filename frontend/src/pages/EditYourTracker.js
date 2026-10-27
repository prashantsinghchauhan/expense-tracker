import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const DEFAULT_CATEGORIES = ['Food', 'Fuel', 'Travel', 'Rent', 'Shopping', 'Entertainment', 'Bills', 'Investment', 'Health', 'Other'];

function EditYourTracker({ user }) {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [paidByMembers, setPaidByMembers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [newReminder, setNewReminder] = useState({
    name: '',
    amount: '',
    category: '',
    paid_by: '',
    payment_method: 'UPI',
    start_month: new Date().toISOString().slice(0, 7),
    end_month: '',
    is_active: true
  });

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
      const res = await axios.get(`${BACKEND_URL}/api/categories`, { withCredentials: true });
      const apiCategories = Array.isArray(res.data) ? res.data.map((c) => ({ id: c.id, name: c.name })) : [];
      const allCategories = [...DEFAULT_CATEGORIES.map(name => ({ id: `default_${name}`, name, isDefault: true })), ...apiCategories];
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(DEFAULT_CATEGORIES.map(name => ({ id: `default_${name}`, name, isDefault: true })));
    }
  };

  const loadPaidByMembers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/paidby`, { withCredentials: true });
      setPaidByMembers(Array.isArray(res.data) ? res.data.map((m) => ({ id: m.id, name: m.name })) : []);
    } catch (error) {
      console.error('Error loading PaidBy members:', error);
      setPaidByMembers([]);
    }
  };

  const loadReminders = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/reminders`, { withCredentials: true });
      setReminders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      const res = await axios.post(`${BACKEND_URL}/api/categories`, { name }, { withCredentials: true });
      setCategories((prev) => [...prev, { id: res.data.id, name: res.data.name, isDefault: false }]);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert(error.response?.data?.detail || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete category "${categoryName}"?`)) return;

    try {
      if (categoryId.startsWith('default_')) {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
        return;
      }
      await axios.delete(`${BACKEND_URL}/api/categories/${categoryId}`, { withCredentials: true });
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.detail || 'Failed to delete category.');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;

    try {
      const res = await axios.post(`${BACKEND_URL}/api/paidby`, { name }, { withCredentials: true });
      setPaidByMembers((prev) => [...prev, { id: res.data.id, name: res.data.name }]);
      setNewMemberName('');
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.detail || 'Failed to add member');
    }
  };

  const handleDeleteMember = async (memberId, memberName) => {
    if (!window.confirm(`Delete member "${memberName}"?`)) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/paidby/${memberId}`, { withCredentials: true });
      setPaidByMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (error) {
      console.error('Error deleting member:', error);
      alert(error.response?.data?.detail || 'Failed to delete member.');
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.name || !newReminder.amount || !newReminder.category || !newReminder.paid_by || !newReminder.payment_method || !newReminder.end_month) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${BACKEND_URL}/api/reminders`, newReminder, { withCredentials: true });
      setNewReminder({
        name: '',
        amount: '',
        category: '',
        paid_by: '',
        payment_method: 'UPI',
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

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Delete this reminder?')) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/reminders/${reminderId}`, { withCredentials: true });
      loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const toggleReminderActive = async (reminder) => {
    try {
      await axios.put(`${BACKEND_URL}/api/reminders/${reminder.id}`, { is_active: !reminder.is_active }, { withCredentials: true });
      loadReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-16">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)] text-slate-400">Loading tracker settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-20 pb-12">
      <Navigation user={user} />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white">Edit Your Tracker</h1>
          <p className="text-slate-400 mt-1">Manage categories, household members, and recurring commitments</p>
        </div>

        <div className="mb-6 flex space-x-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit">
          {[
            { id: 'categories', label: 'Categories' },
            { id: 'paidby', label: 'Paid By (Members)' },
            { id: 'reminders', label: 'Reminders' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'categories' && (
          <div className="glass-panel rounded-3xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white">Manage Categories</h2>
            <form onSubmit={handleAddCategory} className="flex gap-3 max-w-md">
              <input
                type="text"
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white">
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200">
                  <span>{cat.name}</span>
                  <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-rose-400 font-bold ml-1">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'paidby' && (
          <div className="glass-panel rounded-3xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white">Manage Paid By Members</h2>
            <form onSubmit={handleAddMember} className="flex gap-3 max-w-md">
              <input
                type="text"
                placeholder="Member name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white">
                Add Member
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paidByMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <span className="font-bold text-sm text-white">{member.name}</span>
                  <button onClick={() => handleDeleteMember(member.id, member.name)} className="text-xs text-rose-400 font-bold">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reminders' && (
          <div className="glass-panel rounded-3xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white">Manage Recurring Reminders</h2>
            <form onSubmit={handleAddReminder} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <input
                type="text"
                placeholder="Reminder Name"
                value={newReminder.name}
                onChange={(e) => setNewReminder({ ...newReminder, name: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
              <input
                type="number"
                placeholder="Amount (₹)"
                value={newReminder.amount}
                onChange={(e) => setNewReminder({ ...newReminder, amount: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                required
              />
              <select
                value={newReminder.category}
                onChange={(e) => setNewReminder({ ...newReminder, category: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
              <select
                value={newReminder.paid_by}
                onChange={(e) => setNewReminder({ ...newReminder, paid_by: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                required
              >
                <option value="">Select Member</option>
                {paidByMembers.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
              <input
                type="month"
                value={newReminder.start_month}
                onChange={(e) => setNewReminder({ ...newReminder, start_month: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
              <input
                type="month"
                value={newReminder.end_month}
                onChange={(e) => setNewReminder({ ...newReminder, end_month: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
              <button type="submit" className="col-span-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white">
                + Add Reminder
              </button>
            </form>

            <div className="space-y-3">
              {reminders.map((rem) => (
                <div key={rem.id} className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm">{rem.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">₹{Number(rem.amount).toLocaleString('en-IN')} • {rem.category} • Paid by {rem.paid_by}</p>
                  </div>
                  <div className="space-x-2">
                    <button onClick={() => toggleReminderActive(rem)} className="px-3 py-1.5 bg-slate-800 text-xs text-slate-200 rounded-xl">
                      {rem.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDeleteReminder(rem.id)} className="px-3 py-1.5 bg-rose-500/10 text-xs text-rose-400 rounded-xl">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditYourTracker;