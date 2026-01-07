# Expense Tracker Application - User Guide

## 🎉 What's Been Built

A complete, multi-user **Expense Tracker Dashboard** with Google OAuth authentication, budget management, and comprehensive analytics.

## ✨ Features

### 1. **Authentication & Security**
- ✅ Google Social Login (Emergent OAuth)
- ✅ Secure session management with httpOnly cookies
- ✅ Protected routes - only authenticated users can access the app

### 2. **Dashboard** (`/dashboard`)
- **Summary Cards**: Total Expenses, Total Income, Balance, Current Month Spending
- **Budget Alerts**: Visual warnings when you approach or exceed budget limits
  - Red alerts for exceeded budgets
  - Yellow warnings for 80%+ usage
- **Monthly Trend Chart**: Line graph showing income vs expenses over last 6 months
- **Category Breakdown**: Pie chart showing expense distribution by category
- **Recent Transactions**: Quick view of your latest 5 transactions

### 3. **Transaction Management** (`/expenses`)
- **Complete Transaction List**: View all your expenses and income
- **Advanced Filters**:
  - Search by description or category
  - Filter by category
  - Filter by type (Expense/Income)
  - Date range filtering
- **CRUD Operations**:
  - Add new transactions
  - Edit existing transactions
  - Delete transactions
- **Transaction Details**:
  - Date
  - Description
  - Category (Food, Fuel, Travel, Rent, Shopping, Entertainment, Bills, Investment, Health, Other)
  - Amount (₹)
  - Type (Expense/Income)
  - Payment Method (Cash, Credit Card, Debit Card, Bank Transfer, UPI)
  - Paid By
  - Notes

### 4. **Budget Management** (`/budgets`)
- Set monthly spending limits for each category
- Real-time budget tracking
- Visual progress bars
- Alerts when approaching or exceeding limits
- Easy budget updates

### 5. **Analytics**
- Monthly spending trends
- Category-wise expense breakdown
- Income vs Expense comparison
- Budget utilization percentages

## 🎨 Categories Available

1. Food
2. Fuel
3. Travel
4. Rent
5. Shopping
6. Entertainment
7. Bills
8. Investment
9. Health
10. Other

## 💳 Payment Methods

- Cash
- Credit Card
- Debit Card
- Bank Transfer
- UPI

## 🚀 How to Use

### First Time Setup

1. **Access the App**: Open your deployed URL
2. **Login**: Click "Continue with Google" button
3. **Dashboard**: You'll be redirected to your personal dashboard

### Adding Your First Transaction

1. Click the **blue floating + button** (bottom right on any page)
2. Fill in the details:
   - Transaction Type: Expense or Income
   - Date
   - Amount
   - Category
   - Payment Method
   - Description
   - (Optional) Paid By and Notes
3. Click "Add Transaction"

### Setting Up Budgets

1. Navigate to **Budgets** tab
2. Select a category from the dropdown
3. Enter your monthly limit
4. Click "Add Budget"
5. The dashboard will now show alerts if you approach/exceed this limit

### Viewing Analytics

1. **Dashboard**: See summary cards, charts, and recent transactions
2. **Transactions Page**: Use filters to analyze specific periods or categories
3. **Budget Alerts**: Check which categories need attention

### Filtering Transactions

On the Transactions page:
- Use the search box to find specific transactions
- Filter by category, type, or date range
- Clear filters to see all transactions

## 📊 Dashboard Insights

### Budget Alert Colors:
- 🟢 **Green/No Alert**: Under 80% of budget
- 🟡 **Yellow Warning**: 80-99% of budget used
- 🔴 **Red Alert**: 100%+ of budget (overspent)

### Summary Cards:
- **Total Expenses**: All-time expense total
- **Total Income**: All-time income total
- **Balance**: Income - Expenses
- **This Month**: Current month's expenses

## 🛠️ Technical Stack

### Backend
- FastAPI (Python)
- MongoDB (Database)
- Emergent Google OAuth
- Async/Await for performance

### Frontend
- React 19
- Tailwind CSS
- Recharts (for charts)
- Axios (API calls)
- React Router (navigation)

## 🔐 Security Features

- Session tokens stored in httpOnly cookies
- CSRF protection
- 7-day session expiry
- Server-side session validation
- Protected API endpoints

## 📱 Responsive Design

The app is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🎯 Data Privacy

- Each user sees only their own data
- All transactions are user-specific
- Budgets are personal to each account
- No data sharing between users

## 💡 Tips for Best Results

1. **Regular Updates**: Add transactions daily for accurate tracking
2. **Set Realistic Budgets**: Use past spending patterns to set achievable limits
3. **Use Categories**: Proper categorization helps with analysis
4. **Check Dashboard Weekly**: Review budget alerts and spending trends
5. **Use Filters**: Find specific transactions easily with search and filters

## 🆘 Troubleshooting

### Login Issues
- Make sure you're using Google OAuth
- Clear browser cookies if you face authentication issues

### Missing Data
- All data is user-specific - make sure you're logged into the correct account
- Transactions are sorted by date (newest first)

### Budget Alerts Not Showing
- Make sure you've set budgets for categories
- Budgets track current month spending only
- Add some expenses in that category to see the progress

## 📈 Currency

All amounts are in **Indian Rupees (₹)**

---

## 🎊 You're All Set!

Start tracking your expenses, set budgets, and gain insights into your spending patterns!
