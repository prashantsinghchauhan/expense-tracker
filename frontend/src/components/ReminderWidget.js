import React, { useState, useEffect } from 'react';
import axios from "../axios.js";
import { BellRing } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ReminderWidget({ onReminderExecuted }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState({});

  useEffect(() => {
    loadActiveReminders();
  }, []);

  const loadActiveReminders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/reminders/active`, {
        withCredentials: true
      });
      setReminders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error loading active reminders:', error);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReminder = async (reminderId, reminderName) => {
    if (executing[reminderId]) return;

    const confirm = window.confirm(
      `Execute reminder "${reminderName}"?\nThis will log a transaction for this month.`
    );
    if (!confirm) return;

    try {
      setExecuting(prev => ({ ...prev, [reminderId]: true }));

      await axios.post(
        `${BACKEND_URL}/api/reminders/${reminderId}/execute`,
        {},
        { withCredentials: true }
      );

      setReminders(prev => prev.filter(r => r.id !== reminderId));

      if (onReminderExecuted) {
        onReminderExecuted();
      }
    } catch (error) {
      console.error('Error executing reminder:', error);
      alert(
        error.response?.data?.detail ||
        'Failed to execute reminder. Please refresh.'
      );
      loadActiveReminders();
    } finally {
      setExecuting(prev => {
        const updated = { ...prev };
        delete updated[reminderId];
        return updated;
      });
    }
  };

  if (loading || reminders.length === 0) return null;

  return (
    <div className="glass-panel rounded-3xl p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Active Reminders (This Month)</h3>
            <p className="text-xs text-slate-400">
              Check off a scheduled commitment to log it to your ledger automatically
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {reminders.length} Pending
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reminders.map(reminder => (
          <div
            key={reminder.id}
            onClick={() => !executing[reminder.id] && handleExecuteReminder(reminder.id, reminder.name)}
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-indigo-500/50 cursor-pointer transition-all group"
          >
            <div className="flex items-start space-x-3 pr-2">
              <input
                type="checkbox"
                checked={false}
                disabled={executing[reminder.id]}
                onChange={() => {}}
                className="mt-1 w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <div className="font-bold text-sm text-white group-hover:text-indigo-300 transition">
                  {reminder.name}
                </div>
                <div className="text-xs text-slate-400 mt-1 space-x-1 flex flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 mb-1">{reminder.category}</span>
                  <span className="mb-1">• {reminder.payment_method}</span>
                  <span className="mb-1">• {reminder.paid_by}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-sm text-amber-400 block">
                ₹{Number(reminder.amount).toLocaleString('en-IN')}
              </span>
              {executing[reminder.id] ? (
                <span className="text-[10px] text-indigo-400 animate-pulse">Posting...</span>
              ) : (
                <span className="text-[10px] text-slate-500 group-hover:text-indigo-400">Click to log</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReminderWidget;