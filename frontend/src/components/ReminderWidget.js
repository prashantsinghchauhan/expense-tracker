// import React, { useState, useEffect } from 'react';
// import axios from 'axios';

// const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// function ReminderWidget({ onReminderExecuted }) {
//   const [reminders, setReminders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [executing, setExecuting] = useState({});

//   useEffect(() => {
//     loadActiveReminders();
//   }, []);

//   const loadActiveReminders = async () => {
//     try {
//       setLoading(true);
//       const res = await axios.get(`${BACKEND_URL}/api/reminders/active`, {
//         withCredentials: true
//       });
//       setReminders(Array.isArray(res.data) ? res.data : []);
//     } catch (error) {
//       console.error('Error loading active reminders:', error);
//       setReminders([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleExecuteReminder = async (reminderId, reminderName) => {
//     if (executing[reminderId]) return; // Prevent double-click

//     if (!window.confirm(`Execute reminder "${reminderName}"? This will create an expense transaction for this month.`)) {
//       return;
//     }

//     try {
//       setExecuting(prev => ({ ...prev, [reminderId]: true }));
//       await axios.post(`${BACKEND_URL}/api/reminders/${reminderId}/execute`, {}, {
//         withCredentials: true
//       });
      
//       // Remove from list immediately
//       setReminders(prev => prev.filter(r => r.id !== reminderId));
      
//       // Notify parent to refresh dashboard data
//       if (onReminderExecuted) {
//         onReminderExecuted();
//       }
//     } catch (error) {
//       console.error('Error executing reminder:', error);
//       alert(error.response?.data?.detail || 'Failed to execute reminder. It may have already been executed.');
//       // Reload to get fresh state
//       loadActiveReminders();
//     } finally {
//       setExecuting(prev => {
//         const updated = { ...prev };
//         delete updated[reminderId];
//         return updated;
//       });
//     }
//   };

//   if (loading) {
//     return (
//       <div className="bg-white rounded-lg shadow p-6">
//         <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Reminders</h3>
//         <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
//       </div>
//     );
//   }

//   if (reminders.length === 0) {
//     return null; // Don't show widget if no active reminders
//   }

//   return (
//     <div className="bg-white rounded-lg shadow p-6">
//       <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Reminders (This Month)</h3>
//       <p className="text-sm text-gray-600 mb-4">
//         Check off reminders to automatically create expense transactions.
//       </p>
      
//       <div className="space-y-3">
//         {reminders.map((reminder) => (
//           <div
//             key={reminder.id}
//             className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200"
//           >
//             <div className="flex items-center space-x-3 flex-1">
//               <input
//                 type="checkbox"
//                 checked={false}
//                 onChange={() => handleExecuteReminder(reminder.id, reminder.name)}
//                 disabled={executing[reminder.id]}
//                 className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
//               />
//               <div className="flex-1">
//                 <label className="font-medium text-gray-900 cursor-pointer" onClick={() => handleExecuteReminder(reminder.id, reminder.name)}>
//                   {reminder.name}
//                 </label>
//                 <p className="text-sm text-gray-600">
//                   ₹{parseFloat(reminder.amount).toLocaleString('en-IN')} • {reminder.category} • {reminder.payment_method || 'Bank Transfer'} • Paid by {reminder.paid_by}
//                 </p>
//               </div>
//             </div>
//             {executing[reminder.id] && (
//               <div className="ml-4">
//                 <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
//               </div>
//             )}
//           </div>
//         ))}
//       </div>

//       <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
//         <p className="text-xs text-blue-800">
//           <strong>Note:</strong> Once checked, a reminder automatically creates an expense transaction for the current month. 
//           The transaction cannot be unchecked. Reminders outside their time window will not appear.
//         </p>
//       </div>
//     </div>
//   );
// }

// export default ReminderWidget;
import React, { useState, useEffect } from 'react';
import axios from "../axios.js";

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
      `Execute reminder "${reminderName}"?\nThis will create an expense transaction for this month.`
    );
    if (!confirm) return;

    try {
      setExecuting(prev => ({ ...prev, [reminderId]: true }));

      // IMPORTANT: empty body is OK, backend must use stored reminder data
      await axios.post(
        `${BACKEND_URL}/api/reminders/${reminderId}/execute`,
        {},
        { withCredentials: true }
      );

      // remove executed reminder immediately
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

  if (loading) return null;
  if (reminders.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">
        Active Reminders (This Month)
      </h3>

      <div className="space-y-3">
        {reminders.map(reminder => (
          <div
            key={reminder.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                disabled={executing[reminder.id]}
                onChange={() =>
                  handleExecuteReminder(reminder.id, reminder.name)
                }
                className="w-5 h-5 cursor-pointer"
              />
              <div>
                <div className="font-medium">{reminder.name}</div>
                <div className="text-sm text-gray-600">
                  ₹{Number(reminder.amount).toLocaleString('en-IN')}
                  {' • '}
                  {reminder.category}
                  {' • '}
                  {reminder.payment_method}
                  {' • '}
                  Paid by {reminder.paid_by}
                </div>
              </div>
            </div>

            {executing[reminder.id] && (
              <div className="animate-spin h-5 w-5 border-b-2 border-indigo-600 rounded-full" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-blue-800 bg-blue-50 p-3 rounded">
        Once checked, a reminder creates an expense transaction for the current
        month and disappears.
      </div>
    </div>
  );
}

export default ReminderWidget;
