import React from 'react';

const CHART_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6',
  '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#F97316'
];

function CategoryChart({ data, categoryMonth, setCategoryMonth }) {
  const total = (data || []).reduce((sum, item) => sum + item.total, 0);
  const sorted = [...(data || [])].sort((a, b) => b.total - a.total);

  return (
    <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Expenses by Category</h3>
          <p className="text-xs text-slate-400">Distribution of spending across categories</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCategoryMonth('current')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              categoryMonth === 'current'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setCategoryMonth(null)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              categoryMonth === null
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Overall
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          No category expenses recorded for this period
        </div>
      ) : (
        <div className="space-y-3.5 my-2 max-h-64 overflow-y-auto pr-1">
          {sorted.map((item, idx) => {
            const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : 0;
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            return (
              <div key={item.category} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white flex items-center">
                    <span
                      className="w-2.5 h-2.5 rounded-full mr-2"
                      style={{ backgroundColor: color }}
                    />
                    {item.category}
                  </span>
                  <span className="font-mono text-slate-300">
                    ₹{item.total.toLocaleString('en-IN')} <span className="text-slate-500">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
        <span className="text-slate-400">Total Categorized Spend</span>
        <span className="font-mono font-bold text-sm text-white">₹{total.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

export default CategoryChart;