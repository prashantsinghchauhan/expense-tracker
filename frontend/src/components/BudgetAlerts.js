import React from 'react';
import { AlertTriangle } from 'lucide-react';

function BudgetAlerts({ alerts, onManageBudgets }) {
  const needsAttention = (alerts || []).filter(a => a.status !== 'normal');
  
  if (needsAttention.length === 0) return null;

  return (
    <div className="glass-panel rounded-3xl p-6 mb-8 border-l-4 border-l-amber-500" data-testid="budget-alerts">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Threshold & Budget Alerts</h3>
            <p className="text-xs text-slate-400">Categories exceeding 80% of your monthly allocation</p>
          </div>
        </div>
        <button
          onClick={onManageBudgets}
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 transition"
        >
          Adjust Limits →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {needsAttention.map((alert, index) => {
          const isExceeded = alert.status === 'exceeded';
          return (
            <div
              key={index}
              data-testid={`budget-alert-${alert.category}`}
              className={`p-4 rounded-2xl border ${
                isExceeded
                  ? 'bg-rose-950/25 border-rose-500/30'
                  : 'bg-amber-950/20 border-amber-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white">{alert.category}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                    isExceeded ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {alert.percentage}% utilized
                  </span>
                </div>
                <span className={`text-xs font-extrabold uppercase tracking-wider ${
                  isExceeded ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {isExceeded ? 'Over Budget!' : 'Approaching Limit'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-300 mb-2">
                <span>Spent: <strong className="font-mono">₹{alert.spent.toLocaleString('en-IN')}</strong></span>
                <span>Limit: <strong className="font-mono">₹{alert.limit.toLocaleString('en-IN')}</strong></span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isExceeded ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'
                  }`}
                  style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BudgetAlerts;