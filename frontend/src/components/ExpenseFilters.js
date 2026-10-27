import React from 'react';

function ExpenseFilters({ filters, setFilters, categories, paidByMembers }) {
  const hasFilters = filters.search || filters.category || filters.transaction_type || filters.paid_by || filters.date_from || filters.date_to;

  return (
    <div className="glass-panel rounded-3xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white">Ledger Filters</h2>
        {hasFilters && (
          <button
            onClick={() => setFilters({ search: '', category: '', transaction_type: '', paid_by: '', date_from: '', date_to: '' })}
            className="text-xs font-bold text-rose-400 hover:text-rose-300"
            data-testid="clear-filters-button"
          >
            Clear All Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Description or category..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            data-testid="filter-search-input"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            data-testid="filter-category-select"
          >
            <option value="">All Categories</option>
            {(categories || []).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Type</label>
          <select
            value={filters.transaction_type}
            onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            data-testid="filter-type-select"
          >
            <option value="">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Paid By</label>
          <select
            value={filters.paid_by}
            onChange={(e) => setFilters({ ...filters, paid_by: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            data-testid="filter-paid-by-select"
          >
            <option value="">All Members</option>
            {(paidByMembers || []).map(member => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">From Date</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            data-testid="filter-date-from-input"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">To Date</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            data-testid="filter-date-to-input"
          />
        </div>
      </div>
    </div>
  );
}

export default ExpenseFilters;