import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#F97316'];

function CategoryChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: item.category,
    value: item.total
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => {
              // Show amount instead of percentage
              const formatted = `₹${value.toLocaleString('en-IN')}`;
              // Truncate long category names for better display
              const displayName = name.length > 12 ? name.substring(0, 10) + '...' : name;
              return `${displayName}\n${formatted}`;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
          <Legend 
            formatter={(value, entry) => {
              const item = chartData.find(d => d.name === value);
              return item ? `${value}: ₹${item.value.toLocaleString('en-IN')}` : value;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Show total below chart */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Total: <span className="font-semibold text-gray-900">₹{total.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

export default CategoryChart;
