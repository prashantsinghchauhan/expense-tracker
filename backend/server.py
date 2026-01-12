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

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "expense-tracker-backend",
        "env": "production"
    }


# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Dev flag: when True, backend will bypass auth and use a fake user.
# By default this is enabled in local/dev environments so you can
# test the app without going through the login flow.
ENV = os.environ.get("ENV", "development").lower()
DISABLE_AUTH = os.environ.get(
    "DISABLE_AUTH",
    "true" if ENV == "development" else "false"
).lower() == "true"


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
    category: Optional[str] = None
    description: str
    amount: float
    transaction_type: str  # "expense" or "income"
    payment_method: str
    paid_by: str = Field(min_length=1)  # Now mandatory - must be a non-empty member name
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    date: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    transaction_type: Optional[str] = None
    payment_method: Optional[str] = None
    paid_by: Optional[str] = None  # Optional in update to allow partial updates
    notes: Optional[str] = None


class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category: str
    monthly_limit: float
    year: int = Field(default_factory=lambda: datetime.now(timezone.utc).year)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float
    year: Optional[int] = None


class BudgetUpdate(BaseModel):
    monthly_limit: float


class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaidBy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Reminder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str  # e.g., "Home EMI", "SIP Mutual Fund"
    amount: float
    category: str
    paid_by: str
    payment_method: str  # Cash, Credit Card, Debit Card, Bank Transfer, UPI
    frequency: str = "monthly"  # Only monthly for now
    start_month: str  # Format: YYYY-MM (e.g., "2026-01")
    end_month: str  # Format: YYYY-MM (e.g., "2026-05")
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReminderCreate(BaseModel):
    name: str
    amount: float
    category: str
    paid_by: str
    payment_method: str  # Mandatory
    frequency: str = "monthly"
    start_month: str  # YYYY-MM
    end_month: str  # YYYY-MM
    is_active: bool = True


class ReminderUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    paid_by: Optional[str] = None
    payment_method: Optional[str] = None
    frequency: Optional[str] = None
    start_month: Optional[str] = None
    end_month: Optional[str] = None
    is_active: Optional[bool] = None


class ReminderExecution(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reminder_id: str
    user_id: str
    year: int
    month: int  # 1-12
    transaction_id: str  # Links to the created expense transaction
    executed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"  # "completed" or "reverted"


# ============= CATEGORY ENDPOINTS =============

@api_router.get("/categories", response_model=List[Category])
async def get_categories(request: Request):
    """Get all user-defined categories"""
    user = await get_current_user(request)

    categories = await db.categories.find(
        {"user_id": user.user_id},
        {"_id": 0},
    ).to_list(200)

    for cat in categories:
        if isinstance(cat.get("created_at"), str):
            cat["created_at"] = datetime.fromisoformat(cat["created_at"])

    return categories


@api_router.post("/categories", response_model=Category)
async def create_category(request: Request):
    """Create a new category for the current user"""
    user = await get_current_user(request)
    body = await request.json()
    name = (body.get("name") or "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")

    # Prevent duplicates (case-insensitive) per user
    existing = await db.categories.find_one(
        {"user_id": user.user_id, "name": {"$regex": f"^{name}$", "$options": "i"}},
        {"_id": 0},
    )
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    now = datetime.now(timezone.utc)
    category = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "name": name,
        "created_at": now.isoformat(),
    }

    await db.categories.insert_one(category)

    category["created_at"] = now
    return Category(**category)


@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, request: Request):
    """Delete a category if it is not used in any expenses or budgets"""
    user = await get_current_user(request)

    category = await db.categories.find_one(
        {"id": category_id, "user_id": user.user_id},
        {"_id": 0},
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    name = category["name"]

    # Check usage in expenses and budgets
    used_in_expenses = await db.expenses.find_one(
        {"user_id": user.user_id, "category": name},
        {"_id": 1},
    )
    used_in_budgets = await db.budgets.find_one(
        {"user_id": user.user_id, "category": name},
        {"_id": 1},
    )

    if used_in_expenses or used_in_budgets:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category that is already used in transactions or budgets",
        )

    await db.categories.delete_one({"id": category_id, "user_id": user.user_id})
    return {"message": "Category deleted successfully"}


# ============= PAIDBY (MEMBERS) ENDPOINTS =============

@api_router.get("/paidby", response_model=List[PaidBy])
async def get_paidby_members(request: Request):
    """Get all user-defined PaidBy members"""
    user = await get_current_user(request)

    members = await db.paidby.find(
        {"user_id": user.user_id},
        {"_id": 0},
    ).to_list(200)

    for member in members:
        if isinstance(member.get("created_at"), str):
            member["created_at"] = datetime.fromisoformat(member["created_at"])

    return members


@api_router.post("/paidby", response_model=PaidBy)
async def create_paidby_member(request: Request):
    """Create a new PaidBy member for the current user"""
    user = await get_current_user(request)
    body = await request.json()
    name = (body.get("name") or "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Member name is required")

    # Prevent duplicates (case-insensitive) per user
    existing = await db.paidby.find_one(
        {"user_id": user.user_id, "name": {"$regex": f"^{name}$", "$options": "i"}},
        {"_id": 0},
    )
    if existing:
        raise HTTPException(status_code=400, detail="Member already exists")

    now = datetime.now(timezone.utc)
    member = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "name": name,
        "created_at": now.isoformat(),
    }

    await db.paidby.insert_one(member)

    member["created_at"] = now
    return PaidBy(**member)


@api_router.delete("/paidby/{member_id}")
async def delete_paidby_member(member_id: str, request: Request):
    """Delete a PaidBy member if it is not used in any expenses"""
    user = await get_current_user(request)

    member = await db.paidby.find_one(
        {"id": member_id, "user_id": user.user_id},
        {"_id": 0},
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    name = member["name"]

    # Check usage in expenses
    used_in_expenses = await db.expenses.find_one(
        {"user_id": user.user_id, "paid_by": name},
        {"_id": 1},
    )

    if used_in_expenses:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete member that is already used in transactions",
        )

    await db.paidby.delete_one({"id": member_id, "user_id": user.user_id})
    return {"message": "Member deleted successfully"}


# ============= REMINDER ENDPOINTS =============

@api_router.get("/reminders", response_model=List[Reminder])
async def get_reminders(request: Request):
    """Get all reminders for the current user"""
    user = await get_current_user(request)

    reminders = await db.reminders.find(
        {"user_id": user.user_id},
        {"_id": 0},
    ).to_list(200)

    for reminder in reminders:
        if isinstance(reminder.get("created_at"), str):
            reminder["created_at"] = datetime.fromisoformat(reminder["created_at"])

    return reminders


@api_router.get("/reminders/active")
async def get_active_reminders(request: Request):
    """Get active reminders for the current month that haven't been executed yet"""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")  # YYYY-MM

    # Get all active reminders within time window
    reminders = await db.reminders.find(
        {
            "user_id": user.user_id,
            "is_active": True,
            "start_month": {"$lte": current_month},
            "end_month": {"$gte": current_month},
        },
        {"_id": 0},
    ).to_list(200)

    # Get execution records for current month
    current_year = now.year
    current_month_num = now.month
    executions = await db.reminder_executions.find(
        {
            "user_id": user.user_id,
            "year": current_year,
            "month": current_month_num,
            "status": "completed",
        },
        {"_id": 0, "reminder_id": 1},
    ).to_list(200)

    executed_reminder_ids = {ex["reminder_id"] for ex in executions}

    # Filter out reminders that have already been executed this month
    active_reminders = [r for r in reminders if r["id"] not in executed_reminder_ids]

    # Convert created_at strings to datetime
    for reminder in active_reminders:
        if isinstance(reminder.get("created_at"), str):
            reminder["created_at"] = datetime.fromisoformat(reminder["created_at"])

    return active_reminders


@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(reminder_data: ReminderCreate, request: Request):
    """Create a new reminder"""
    user = await get_current_user(request)

    # Validate month format (YYYY-MM)
    try:
        datetime.strptime(reminder_data.start_month, "%Y-%m")
        datetime.strptime(reminder_data.end_month, "%Y-%m")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")

    if reminder_data.start_month > reminder_data.end_month:
        raise HTTPException(status_code=400, detail="start_month must be before or equal to end_month")

    now = datetime.now(timezone.utc)
    reminder = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "name": reminder_data.name,
        "amount": reminder_data.amount,
        "category": reminder_data.category,
        "paid_by": reminder_data.paid_by,
        "payment_method": reminder_data.payment_method, 
        "frequency": reminder_data.frequency,
        "start_month": reminder_data.start_month,
        "end_month": reminder_data.end_month,
        "is_active": reminder_data.is_active,
        "created_at": now.isoformat(),
    }

    await db.reminders.insert_one(reminder)

    reminder["created_at"] = now
    return Reminder(**reminder)


@api_router.put("/reminders/{reminder_id}", response_model=Reminder)
async def update_reminder(reminder_id: str, reminder_data: ReminderUpdate, request: Request):
    """Update a reminder"""
    user = await get_current_user(request)

    reminder = await db.reminders.find_one(
        {"id": reminder_id, "user_id": user.user_id},
        {"_id": 0},
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Validate month formats if provided
    update_dict = reminder_data.model_dump(exclude_unset=True)
    if "start_month" in update_dict:
        try:
            datetime.strptime(update_dict["start_month"], "%Y-%m")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_month format. Use YYYY-MM")
    if "end_month" in update_dict:
        try:
            datetime.strptime(update_dict["end_month"], "%Y-%m")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_month format. Use YYYY-MM")

    # Validate month order
    start_month = update_dict.get("start_month", reminder["start_month"])
    end_month = update_dict.get("end_month", reminder["end_month"])
    if start_month > end_month:
        raise HTTPException(status_code=400, detail="start_month must be before or equal to end_month")

    await db.reminders.update_one(
        {"id": reminder_id, "user_id": user.user_id},
        {"$set": update_dict}
    )

    updated = await db.reminders.find_one(
        {"id": reminder_id, "user_id": user.user_id},
        {"_id": 0},
    )
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])

    return Reminder(**updated)


@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, request: Request):
    """Delete a reminder (execution history is preserved for audit)"""
    user = await get_current_user(request)

    result = await db.reminders.delete_one({"id": reminder_id, "user_id": user.user_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")

    return {"message": "Reminder deleted successfully"}


@api_router.post("/reminders/{reminder_id}/execute")
async def execute_reminder(reminder_id: str, request: Request):
    """Execute a reminder for the current month - creates expense transaction and execution record"""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    current_year = now.year
    current_month_num = now.month
    current_date = now.strftime("%Y-%m-%d")

    # Get reminder
    reminder = await db.reminders.find_one(
        {"id": reminder_id, "user_id": user.user_id},
        {"_id": 0},
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Validate reminder is active and within time window
    current_month_str = now.strftime("%Y-%m")
    if not reminder.get("is_active", True):
        raise HTTPException(status_code=400, detail="Reminder is not active")
    if reminder["start_month"] > current_month_str or reminder["end_month"] < current_month_str:
        raise HTTPException(status_code=400, detail="Reminder is not active for the current month")

    # Check if already executed this month
    existing_execution = await db.reminder_executions.find_one(
        {
            "reminder_id": reminder_id,
            "user_id": user.user_id,
            "year": current_year,
            "month": current_month_num,
            "status": "completed",
        },
        {"_id": 1},
    )
    if existing_execution:
        raise HTTPException(status_code=400, detail="Reminder already executed for this month")

    # Create expense transaction
    expense_id = str(uuid.uuid4())
    expense = {
        "id": expense_id,
        "user_id": user.user_id,
        "date": current_date,
        "category": reminder["category"],
        "description": reminder["name"],
        "amount": reminder["amount"],
        "transaction_type": "expense",
        "payment_method": reminder["payment_method"],  # Use reminder's payment method
        "paid_by": reminder["paid_by"],
        "notes": f"Auto-generated from reminder: {reminder['name']}",
        "created_at": now.isoformat(),
    }

    await db.expenses.insert_one(expense)
    #hello 
    # Create execution record
    execution = {
        "id": str(uuid.uuid4()),
        "reminder_id": reminder_id,
        "user_id": user.user_id,
        "year": current_year,
        "month": current_month_num,
        "transaction_id": expense_id,
        "executed_at": now.isoformat(),
        "status": "completed",
    }

    await db.reminder_executions.insert_one(execution)

    return {
        "message": "Reminder executed successfully",
        "transaction_id": expense_id,
        "execution_id": execution["id"],
    }


@api_router.get("/reminders/{reminder_id}/history")
async def get_reminder_history(reminder_id: str, request: Request):
    """Get execution history for a reminder"""
    user = await get_current_user(request)

    # Verify reminder belongs to user
    reminder = await db.reminders.find_one(
        {"id": reminder_id, "user_id": user.user_id},
        {"_id": 1},
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    executions = await db.reminder_executions.find(
        {"reminder_id": reminder_id, "user_id": user.user_id},
        {"_id": 0},
    ).sort([("year", -1), ("month", -1)]).to_list(100)

    for ex in executions:
        if isinstance(ex.get("executed_at"), str):
            ex["executed_at"] = datetime.fromisoformat(ex["executed_at"])

    return executions


# ============= AUTH HELPERS =============

async def get_current_user(request: Request) -> User:
    """
    Extract and validate user.
    In DEV mode, always return ONE fixed user.
    """

    # ===== DEV MODE (FIXED) =====
    if DISABLE_AUTH:
        dev_user_id = os.environ.get("DEV_USER_ID", "dev_fixed_user")
        dev_email = os.environ.get("DEV_USER_EMAIL", "dev@example.com")
        dev_name = os.environ.get("DEV_USER_NAME", "Dev User")

        user_doc = await db.users.find_one(
            {"user_id": dev_user_id},
            {"_id": 0}
        )

        if not user_doc:
            now = datetime.now(timezone.utc)
            user_doc = {
                "user_id": dev_user_id,
                "email": dev_email,
                "name": dev_name,
                "picture": None,
                "created_at": now.isoformat(),
            }
            await db.users.insert_one(user_doc)

        if isinstance(user_doc.get("created_at"), str):
            user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])

        return User(**user_doc)

    # ===== NORMAL AUTH (PRODUCTION) =====
    session_token = request.cookies.get("session_token")

    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )

    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])

    return User(**user_doc)


# async def get_current_user(request: Request) -> User:
#     """Extract and validate user from session token (cookie or header)"""
#     # ===== DEV MODE: BYPASS AUTH COMPLETELY =====
#     # When DISABLE_AUTH is True, we skip all session checks and always
#     # return a fake/dev user. This is ONLY for local development.
#     if DISABLE_AUTH:
#         dev_email = os.environ.get("DEV_USER_EMAIL", "dev@example.com")
#         dev_name = os.environ.get("DEV_USER_NAME", "Dev User")

#         user_doc = await db.users.find_one(
#             {"email": dev_email},
#             {"_id": 0}
#         )

#         if not user_doc:
#             user_id = f"dev_{uuid.uuid4().hex[:8]}"
#             now = datetime.now(timezone.utc)
#             user_doc = {
#                 "user_id": user_id,
#                 "email": dev_email,
#                 "name": dev_name,
#                 "picture": None,
#                 "created_at": now,
#             }

#             insert_doc = dict(user_doc)
#             insert_doc["created_at"] = now.isoformat()
#             await db.users.insert_one(insert_doc)

#         if isinstance(user_doc.get("created_at"), str):
#             user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])

#         return User(**user_doc)

#     # ===== NORMAL AUTH FLOW (production) =====
#     # Try to get session_token from cookie first
#     session_token = request.cookies.get("session_token")
    
#     # Fallback to Authorization header
#     if not session_token:
#         auth_header = request.headers.get("Authorization")
#         if auth_header and auth_header.startswith("Bearer "):
#             session_token = auth_header.replace("Bearer ", "")
    
#     if not session_token:
#         raise HTTPException(status_code=401, detail="Not authenticated")
    
#     # Find session in database
#     session_doc = await db.user_sessions.find_one(
#         {"session_token": session_token},
#         {"_id": 0}
#     )
    
#     if not session_doc:
#         raise HTTPException(status_code=401, detail="Invalid session")
    
#     # Check if session is expired
#     expires_at = session_doc["expires_at"]
#     if isinstance(expires_at, str):
#         expires_at = datetime.fromisoformat(expires_at)
#     if expires_at.tzinfo is None:
#         expires_at = expires_at.replace(tzinfo=timezone.utc)
    
#     if expires_at < datetime.now(timezone.utc):
#         raise HTTPException(status_code=401, detail="Session expired")
    
#     # Get user
#     user_doc = await db.users.find_one(
#         {"user_id": session_doc["user_id"]},
#         {"_id": 0}
#     )
    
#     if not user_doc:
#         raise HTTPException(status_code=404, detail="User not found")
    
#     # Convert created_at to datetime if it's a string
#     if isinstance(user_doc.get("created_at"), str):
#         user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
#     return User(**user_doc)


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
        secure=False,         # <-- local dev ke liye False
        samesite="lax",       # <-- local dev ke liye lax
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

    # ===== INCOME CATEGORY NORMALIZATION =====
    # For income transactions, always treat category as "Credit"
    # to separate it from normal expense categories.
    if expense_dict.get("transaction_type") == "income":
        expense_dict["category"] = "Credit"

    expense_obj = Expense(user_id=user.user_id, **expense_dict)
    
    doc = expense_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.expenses.insert_one(doc)
    return expense_obj


@api_router.post("/expenses/bulk", response_model=List[Expense])
async def create_expenses_bulk(expenses_data: List[ExpenseCreate], request: Request):
    """Create multiple expenses in a single request.

    Empty/invalid rows are ignored safely.
    """
    user = await get_current_user(request)

    valid_expenses: List[Expense] = []
    docs_to_insert = []

    for item in expenses_data:
        data = item.model_dump()

        # Basic validation / ignore "empty" rows
        if not data.get("date") or not data.get("description"):
            continue
        try:
            amount = float(data.get("amount", 0))
        except (TypeError, ValueError):
            continue
        if amount <= 0:
            continue
        if not data.get("payment_method"):
            continue
        # PaidBy is now mandatory
        paid_by = data.get("paid_by", "").strip()
        if not paid_by:
            continue

        # Normalize income category
        if data.get("transaction_type") == "income":
            data["category"] = "Credit"

        expense_obj = Expense(
            user_id=user.user_id,
            date=data["date"],
            category=data.get("category") or "Other",
            description=data["description"],
            amount=amount,
            transaction_type=data.get("transaction_type") or "expense",
            payment_method=data["payment_method"],
            paid_by=paid_by,  # Now mandatory, validated above
            notes=data.get("notes"),
        )

        valid_expenses.append(expense_obj)
        doc = expense_obj.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        docs_to_insert.append(doc)

    if docs_to_insert:
        await db.expenses.insert_many(docs_to_insert)

    return valid_expenses


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
    
    # Resolve target year (default: current year)
    target_year = budget_data.year or datetime.now(timezone.utc).year

    # Check if budget already exists for this category and year
    existing = await db.budgets.find_one({
        "user_id": user.user_id,
        "category": budget_data.category,
        "year": target_year,
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this category. Use PUT to update.")
    
    budget_dict = budget_data.model_dump()
    budget_dict["year"] = target_year
    budget_obj = Budget(user_id=user.user_id, **budget_dict)
    
    doc = budget_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.budgets.insert_one(doc)
    return budget_obj


@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(request: Request, year: Optional[int] = None):
    """Get all budgets, optionally filtered by year"""
    user = await get_current_user(request)

    query = {"user_id": user.user_id}
    if year is not None:
        query["year"] = year

    budgets = await db.budgets.find(
        query,
        {"_id": 0}
    ).to_list(200)
    
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
    current_year = datetime.now(timezone.utc).year
    
    # Get all budgets for the current year
    budgets = await db.budgets.find(
        {"user_id": user.user_id, "year": current_year},
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
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
