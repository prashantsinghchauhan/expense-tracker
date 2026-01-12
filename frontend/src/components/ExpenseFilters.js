import React from 'react';

// Categories and paidByMembers are passed from the parent
function ExpenseFilters({ filters, setFilters, categories, paidByMembers }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Description or category"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            data-testid="filter-search-input"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            data-testid="filter-category-select"
          >
            <option value="">All Categories</option>
            {(categories || []).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <select
            value={filters.transaction_type}
            onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            data-testid="filter-type-select"
          >
            <option value="">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        {/* Paid By Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Paid By</label>
          <select
            value={filters.paid_by}
            onChange={(e) => setFilters({ ...filters, paid_by: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            data-testid="filter-paid-by-select"
          >
            <option value="">All Members</option>
            {(paidByMembers || []).map(member => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            data-testid="filter-date-from-input"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            data-testid="filter-date-to-input"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.search || filters.category || filters.transaction_type || filters.paid_by || filters.date_from || filters.date_to) && (
        <div className="mt-4">
          <button
            onClick={() => setFilters({ search: '', category: '', transaction_type: '', paid_by: '', date_from: '', date_to: '' })}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            data-testid="clear-filters-button"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default ExpenseFilters;
