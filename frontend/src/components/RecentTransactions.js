import React from 'react';

function RecentTransactions({ expenses, onViewAll }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        <div className="text-center py-8 text-gray-500">
          No transactions yet. Add your first transaction!
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="recent-transactions">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        <button
          onClick={onViewAll}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          data-testid="view-all-transactions"
        >
          View All
        </button>
      </div>
      <div className="space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
            data-testid={`recent-transaction-${expense.id}`}
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{expense.description}</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                  {expense.category}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {new Date(expense.date).toLocaleDateString('en-IN')} • {expense.payment_method}
              </div>
            </div>
            <div className="ml-4">
              <span className={`text-lg font-semibold ${
                expense.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'
              }`}>
                {expense.transaction_type === 'expense' ? '-' : '+'}₹{expense.amount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentTransactions;
