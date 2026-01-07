from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # Format: YYYY-MM-DD
    category: str  # Food, Fuel, Travel, Rent, Shopping, Entertainment, Bills, Investment, Health, Other
    description: str
    amount: float
    transaction_type: str  # "expense" or "income"
    payment_method: str  # Cash, Credit Card, Debit Card, Bank Transfer, UPI
    paid_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExpenseCreate(BaseModel):
    date: str
    category: str
    description: str
    amount: float
    transaction_type: str
    payment_method: str
    paid_by: Optional[str] = None
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    date: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    transaction_type: Optional[str] = None
    payment_method: Optional[str] = None
    paid_by: Optional[str] = None
    notes: Optional[str] = None


class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category: str
    monthly_limit: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float


class BudgetUpdate(BaseModel):
    monthly_limit: float


# ============= AUTH HELPERS =============

async def get_current_user(request: Request) -> User:
    """Extract and validate user from session token (cookie or header)"""
    # Try to get session_token from cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session in database
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check if session is expired
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert created_at to datetime if it's a string
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return User(**user_doc)


# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token and create/update user"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent auth service
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10.0
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    
    user_data = auth_response.json()
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": user_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = user_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_sessions.insert_one(session)
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    # Return user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return User(**user_doc)


@api_router.get("/auth/me")
async def get_current_user_info(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    return user


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and delete session"""
    try:
        session_token = request.cookies.get("session_token")
        if session_token:
            await db.user_sessions.delete_one({"session_token": session_token})
        
        response.delete_cookie(
            key="session_token",
            path="/",
            secure=True,
            samesite="none"
        )
        
        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return {"message": "Logged out"}


# ============= EXPENSE ENDPOINTS =============

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, request: Request):
    """Create a new expense"""
    user = await get_current_user(request)
    
    expense_dict = expense_data.model_dump()
    expense_obj = Expense(user_id=user.user_id, **expense_dict)
    
    doc = expense_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.expenses.insert_one(doc)
    return expense_obj


@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(
    request: Request,
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    transaction_type: Optional[str] = None,
    limit: int = 1000
):
    """Get all expenses with optional filters"""
    user = await get_current_user(request)
    
    query = {"user_id": user.user_id}
    
    if category:
        query["category"] = category
    if transaction_type:
        query["transaction_type"] = transaction_type
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        query.setdefault("date", {})["$lte"] = date_to
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    
    for expense in expenses:
        if isinstance(expense.get('created_at'), str):
            expense['created_at'] = datetime.fromisoformat(expense['created_at'])
    
    return expenses


@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str, request: Request):
    """Get specific expense"""
    user = await get_current_user(request)
    
    expense = await db.expenses.find_one(
        {"id": expense_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if isinstance(expense.get('created_at'), str):
        expense['created_at'] = datetime.fromisoformat(expense['created_at'])
    
    return Expense(**expense)


@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, expense_data: ExpenseUpdate, request: Request):
    """Update expense"""
    user = await get_current_user(request)
    
    update_dict = {k: v for k, v in expense_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.expenses.update_one(
        {"id": expense_id, "user_id": user.user_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense = await db.expenses.find_one(
        {"id": expense_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if isinstance(expense.get('created_at'), str):
        expense['created_at'] = datetime.fromisoformat(expense['created_at'])
    
    return Expense(**expense)


@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, request: Request):
    """Delete expense"""
    user = await get_current_user(request)
    
    result = await db.expenses.delete_one(
        {"id": expense_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"message": "Expense deleted successfully"}


@api_router.get("/expenses/summary/stats")
async def get_expense_summary(request: Request, month: Optional[str] = None):
    """Get summary statistics"""
    user = await get_current_user(request)
    
    query = {"user_id": user.user_id}
    
    # If month provided (format: YYYY-MM), filter by month
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(10000)
    
    total_expense = sum(e["amount"] for e in expenses if e["transaction_type"] == "expense")
    total_income = sum(e["amount"] for e in expenses if e["transaction_type"] == "income")
    balance = total_income - total_expense
    
    # Current month stats
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    current_month_expenses = [e for e in expenses if e["date"].startswith(current_month)]
    current_month_total = sum(e["amount"] for e in current_month_expenses if e["transaction_type"] == "expense")
    
    return {
        "total_expense": total_expense,
        "total_income": total_income,
        "balance": balance,
        "current_month_expense": current_month_total,
        "transaction_count": len(expenses)
    }


@api_router.get("/expenses/summary/by-category")
async def get_expenses_by_category(request: Request, month: Optional[str] = None):
    """Get category-wise breakdown"""
    user = await get_current_user(request)
    
    query = {"user_id": user.user_id, "transaction_type": "expense"}
    
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(10000)
    
    category_totals = {}
    for expense in expenses:
        category = expense["category"]
        category_totals[category] = category_totals.get(category, 0) + expense["amount"]
    
    return [{"category": cat, "total": total} for cat, total in category_totals.items()]


@api_router.get("/expenses/summary/monthly-trend")
async def get_monthly_trend(request: Request):
    """Get monthly trend data for last 6 months"""
    user = await get_current_user(request)
    
    expenses = await db.expenses.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(10000)
    
    monthly_data = {}
    for expense in expenses:
        month = expense["date"][:7]  # YYYY-MM
        if month not in monthly_data:
            monthly_data[month] = {"expense": 0, "income": 0}
        
        if expense["transaction_type"] == "expense":
            monthly_data[month]["expense"] += expense["amount"]
        else:
            monthly_data[month]["income"] += expense["amount"]
    
    # Sort by month and return last 6 months
    sorted_months = sorted(monthly_data.keys(), reverse=True)[:6]
    result = []
    for month in reversed(sorted_months):
        result.append({
            "month": month,
            "expense": monthly_data[month]["expense"],
            "income": monthly_data[month]["income"]
        })
    
    return result


# ============= BUDGET ENDPOINTS =============

@api_router.post("/budgets", response_model=Budget)
async def create_budget(budget_data: BudgetCreate, request: Request):
    """Set budget for a category"""
    user = await get_current_user(request)
    
    # Check if budget already exists for this category
    existing = await db.budgets.find_one({
        "user_id": user.user_id,
        "category": budget_data.category
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this category. Use PUT to update.")
    
    budget_dict = budget_data.model_dump()
    budget_obj = Budget(user_id=user.user_id, **budget_dict)
    
    doc = budget_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.budgets.insert_one(doc)
    return budget_obj


@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(request: Request):
    """Get all budgets"""
    user = await get_current_user(request)
    
    budgets = await db.budgets.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for budget in budgets:
        if isinstance(budget.get('created_at'), str):
            budget['created_at'] = datetime.fromisoformat(budget['created_at'])
    
    return budgets


@api_router.put("/budgets/{budget_id}", response_model=Budget)
async def update_budget(budget_id: str, budget_data: BudgetUpdate, request: Request):
    """Update budget"""
    user = await get_current_user(request)
    
    result = await db.budgets.update_one(
        {"id": budget_id, "user_id": user.user_id},
        {"$set": {"monthly_limit": budget_data.monthly_limit}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    budget = await db.budgets.find_one(
        {"id": budget_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if isinstance(budget.get('created_at'), str):
        budget['created_at'] = datetime.fromisoformat(budget['created_at'])
    
    return Budget(**budget)


@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, request: Request):
    """Delete budget"""
    user = await get_current_user(request)
    
    result = await db.budgets.delete_one(
        {"id": budget_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return {"message": "Budget deleted successfully"}


@api_router.get("/budgets/alerts")
async def get_budget_alerts(request: Request):
    """Get budget alerts for current month"""
    user = await get_current_user(request)
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Get all budgets
    budgets = await db.budgets.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get current month expenses by category
    expenses = await db.expenses.find(
        {
            "user_id": user.user_id,
            "transaction_type": "expense",
            "date": {"$regex": f"^{current_month}"}
        },
        {"_id": 0}
    ).to_list(10000)
    
    category_spending = {}
    for expense in expenses:
        category = expense["category"]
        category_spending[category] = category_spending.get(category, 0) + expense["amount"]
    
    alerts = []
    for budget in budgets:
        category = budget["category"]
        limit = budget["monthly_limit"]
        spent = category_spending.get(category, 0)
        percentage = (spent / limit * 100) if limit > 0 else 0
        
        status = "normal"
        if percentage >= 100:
            status = "exceeded"
        elif percentage >= 80:
            status = "warning"
        
        alerts.append({
            "category": category,
            "limit": limit,
            "spent": spent,
            "remaining": max(0, limit - spent),
            "percentage": round(percentage, 1),
            "status": status
        })
    
    return alerts


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
