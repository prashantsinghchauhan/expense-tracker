import React from 'react';
import { useNavigate } from 'react-router-dom';

function BudgetAlerts({ alerts }) {
  const navigate = useNavigate();

  const needsAttention = alerts.filter(a => a.status !== 'normal');

  if (needsAttention.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="budget-alerts">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">⚠️ Budget Alerts</h3>
        <button
          onClick={() => navigate('/budgets')}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Manage Budgets
        </button>
      </div>
      <div className="space-y-3">
        {needsAttention.map((alert, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-l-4 ${
              alert.status === 'exceeded'
                ? 'bg-red-50 border-red-500'
                : 'bg-yellow-50 border-yellow-500'
            }`}
            data-testid={`budget-alert-${alert.category}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">{alert.category}</span>
                  <span className={`text-sm font-medium ${
                    alert.status === 'exceeded' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {alert.percentage}% used
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Spent ₹{alert.spent.toLocaleString('en-IN')} of ₹{alert.limit.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="ml-4">
                {alert.status === 'exceeded' ? (
                  <span className="text-red-600 font-bold">Over Budget!</span>
                ) : (
                  <span className="text-yellow-600 font-bold">Warning</span>
                )}
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  alert.status === 'exceeded' ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(alert.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BudgetAlerts;
