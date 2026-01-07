import React from 'react';

function SummaryCards({ summary }) {
  if (!summary) return null;

  const cards = [
    {
      title: 'Total Expenses',
      value: `₹${summary.total_expense.toLocaleString('en-IN')}`,
      icon: '📉',
      color: 'red',
      testId: 'total-expense-card'
    },
    {
      title: 'Total Income',
      value: `₹${summary.total_income.toLocaleString('en-IN')}`,
      icon: '📈',
      color: 'green',
      testId: 'total-income-card'
    },
    {
      title: 'Balance',
      value: `₹${summary.balance.toLocaleString('en-IN')}`,
      icon: '💰',
      color: summary.balance >= 0 ? 'green' : 'red',
      testId: 'balance-card'
    },
    {
      title: 'This Month',
      value: `₹${summary.current_month_expense.toLocaleString('en-IN')}`,
      icon: '📅',
      color: 'indigo',
      testId: 'current-month-card'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6" data-testid={card.testId}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className={`text-2xl font-bold mt-2 text-${card.color}-600`}>
                {card.value}
              </p>
            </div>
            <div className="text-4xl">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;
