import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Wallet, Calendar } from 'lucide-react';

function SummaryCards({ summary }) {
  if (!summary) return null;

  const savingsRate = summary.total_income > 0
    ? Math.max(0, (((summary.total_income - summary.total_expense) / summary.total_income) * 100)).toFixed(1)
    : '0.0';

  const cards = [
    {
      title: 'Total Expenses',
      value: `₹${Number(summary.total_expense || 0).toLocaleString('en-IN')}`,
      subtitle: `${summary.transaction_count || 0} recorded entries`,
      icon: <ArrowUpRight className="w-5 h-5" />,
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      valueClass: 'text-rose-400',
      testId: 'total-expense-card'
    },
    {
      title: 'Total Income',
      value: `₹${Number(summary.total_income || 0).toLocaleString('en-IN')}`,
      subtitle: 'Cumulative inflows',
      icon: <ArrowDownLeft className="w-5 h-5" />,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      valueClass: 'text-emerald-400',
      testId: 'total-income-card'
    },
    {
      title: 'Net Balance',
      value: `₹${Number(summary.balance || 0).toLocaleString('en-IN')}`,
      subtitle: `${savingsRate}% net savings rate`,
      icon: <Wallet className="w-5 h-5" />,
      badgeClass: summary.balance >= 0
        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      valueClass: summary.balance >= 0 ? 'text-white' : 'text-rose-400',
      testId: 'balance-card'
    },
    {
      title: 'This Month Spend',
      value: `₹${Number(summary.current_month_expense || 0).toLocaleString('en-IN')}`,
      subtitle: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      icon: <Calendar className="w-5 h-5" />,
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      valueClass: 'text-amber-400',
      testId: 'current-month-card'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {cards.map((card, idx) => (
        <div
          key={idx}
          data-testid={card.testId}
          className="glass-panel rounded-3xl p-6 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.title}</p>
              <p className={`text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight font-mono ${card.valueClass}`}>
                {card.value}
              </p>
            </div>
            <div className={`p-3 rounded-2xl border ${card.badgeClass} group-hover:scale-110 transition-transform`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>{card.subtitle}</span>
            <span className="text-indigo-400 font-semibold">Live</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;