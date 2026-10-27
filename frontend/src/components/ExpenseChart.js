import React from 'react';

function ExpenseChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between h-96">
        <h3 className="text-lg font-bold text-white">Monthly Cash Flow Trend</h3>
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          No monthly trend data available
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.flatMap(d => [d.income || 0, d.expense || 0]), 1000);

  return (
    <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Monthly Trend</h3>
          <p className="text-xs text-slate-400">6-Month Income vs Expenses comparison</p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <span className="flex items-center text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1.5"></span>Income
          </span>
          <span className="flex items-center text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></span>Expenses
          </span>
        </div>
      </div>

      <div className="h-64 flex items-end justify-around gap-4 pt-6 pb-2 px-2 border-b border-slate-800/80">
        {data.map((item, idx) => {
          const incHeight = Math.max(Math.round(((item.income || 0) / maxVal) * 180), 6);
          const expHeight = Math.max(Math.round(((item.expense || 0) / maxVal) * 180), 6);
          return (
            <div key={idx} className="flex-1 flex flex-col items-center group">
              <div className="w-full flex items-end justify-center space-x-2 h-48">
                {/* Income Bar */}
                <div className="relative flex flex-col items-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-slate-900 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                    ₹{(item.income || 0).toLocaleString('en-IN')}
                  </div>
                  <div
                    style={{ height: `${incHeight}px` }}
                    className="w-4 sm:w-6 rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 group-hover:brightness-110"
                  />
                </div>
                {/* Expense Bar */}
                <div className="relative flex flex-col items-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-slate-900 text-rose-300 border border-rose-500/30 text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                    ₹{(item.expense || 0).toLocaleString('en-IN')}
                  </div>
                  <div
                    style={{ height: `${expHeight}px` }}
                    className="w-4 sm:w-6 rounded-t-lg bg-gradient-to-t from-rose-600 to-rose-400 transition-all duration-500 group-hover:brightness-110"
                  />
                </div>
              </div>
              <span className="mt-3 text-[10px] sm:text-xs font-mono font-medium text-slate-400">{item.month}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>Hover over bars for figures</span>
        <span className="font-mono text-slate-300">Peak: ₹{maxVal.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

export default ExpenseChart;