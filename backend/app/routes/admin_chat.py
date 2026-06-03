import os
import re
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from openai import OpenAI
from pydantic import BaseModel
from app.database.db import get_db
from dotenv import load_dotenv

# ──────────────────────────────────────────────────────────────
# LAYER 1: Resolve absolute .env path (4 levels up to project root)
# Structure: backend/app/routes/admin_chat.py -> D:/AR_Automation/.env
# ──────────────────────────────────────────────────────────────
_ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"

# LAYER 2: Force dotenv load with override=False so already-loaded vars are kept
load_dotenv(dotenv_path=_ENV_PATH, override=False)

router = APIRouter(prefix="/api/admin", tags=["Admin Chatbot"])


# Pydantic Schema for Input
class ChatInput(BaseModel):
    message: str


# Database Schema Context — tells NVIDIA NIM exactly what tables/columns exist
DB_SCHEMA_PROMPT = """
You are an expert PostgreSQL Data Analyst for an Enterprise Accounts Receivable (AR) & Invoice automation system. 
Your job is to translate human questions into single, valid SQL SELECT queries based on the schema below.

DATABASE SCHEMA:
1. Table: customers
   - id (INTEGER, Primary Key)
   - customer_id (TEXT, Unique identifier, e.g., 'CUST-001')
   - display_name (TEXT) -- Use this instead of 'name' for queries looking for customer name
   - first_name (TEXT)
   - last_name (TEXT)
   - company_name (TEXT)
   - email (TEXT) -- Can be used to join with users.email or invoices.email
   - phone_work (TEXT) -- Use this or phone_mobile instead of 'phone'
   - phone_mobile (TEXT)
   - customer_type (TEXT, e.g., 'Individual', 'Business')
   - currency (TEXT, e.g., 'INR')
   - tax_preference (TEXT, e.g., 'Taxable', 'Tax Exempt')
   - payment_terms (TEXT)
   - created_at (TIMESTAMP)
   -- IMPORTANT DB SCHEMA DETAILS:
   -- * There are NO 'pending_balance' or 'status' columns directly in the 'customers' table.
   -- * When asked for pending balances, if `pending_balance` or a similar column returns an empty result set, check if the value is derived by calculating `total_amount - amount_paid` or looking at unpaid invoices instead of assuming a single static column layout.
   -- * To calculate a customer's total pending/outstanding balance, aggregate from 'invoices': SUM(grand_total - amount_paid) WHERE payment_status != 'Paid' (and join/filter by email or customer_name). Note that in 'invoices', grand_total serves as the total amount.
   -- * To get the prepaid/wallet balance of a customer, join with the 'users' table on email or check users.wallet_balance.

2. Table: users
   - id (INTEGER, Primary Key)
   - username (VARCHAR, Unique)
   - role (VARCHAR, e.g., 'admin', 'customer', 'driver') -- ENUM values: 'admin', 'user', 'delivery', 'provider', 'ceo', 'sales', 'accounts', 'customer', 'driver', 'delivery_agent', 'delivery_management'
   - full_name (VARCHAR)
   - email (VARCHAR)
   - phone (VARCHAR)
   - company_name (VARCHAR)
   - wallet_balance (DOUBLE PRECISION) -- Use this to find customer prepayments/credits
   - created_at (TIMESTAMP)

3. Table: products
   - id (INTEGER, Primary Key)
   - product_id (VARCHAR, Unique identifier, e.g., 'PROD-001')
   - name (VARCHAR)
   - price (DOUBLE PRECISION)
   - description (TEXT)
   - gst_percentage (DOUBLE PRECISION)
   - stock_quantity (INTEGER)
   - category (VARCHAR)
   - is_deleted (BOOLEAN)

4. Table: invoices
   - id (INTEGER, Primary Key)
   - invoice_number (VARCHAR, Unique, e.g., 'INV-2026-001')
   - customer_name (VARCHAR)
   - grand_total (DOUBLE PRECISION) -- Total amount of invoice (use instead of total_amount)
   - amount_paid (DOUBLE PRECISION) -- Amount paid so far (use instead of paid_amount)
   - settled_amount (DOUBLE PRECISION)
   - status (VARCHAR) -- Values: 'Draft', 'Sent', 'Approved', 'Paid'
   - payment_status (VARCHAR) -- Values: 'Unpaid', 'Partially Paid', 'Paid'
   - email (VARCHAR)
   - user_id (INTEGER, Foreign Key to users.id)
   - created_at (TIMESTAMP)

5. Table: orders
   - id (INTEGER, Primary Key)
   - user_id (INTEGER, Foreign Key to users.id)
   - total_amount (DOUBLE PRECISION)
   - status (Enum/VARCHAR) -- Strict ENUM values: 'placed', 'quoted', 'approved', 'invoiced', 'dispatched', 'delivered'
   - created_at (TIMESTAMP)

6. Table: zone_registry
   - id (INTEGER, Primary Key)
   - zone_code (VARCHAR, Unique, e.g., 'ZONE_1', 'ZONE_2', 'ZONE_3')
   - zone_name (VARCHAR, e.g., 'North Tamil Nadu Cluster')

7. Table: district_zone_mapping
   - id (INTEGER, Primary Key)
   - district_name (VARCHAR, Unique, e.g., 'Chennai', 'Coimbatore')
   - zone_id (INTEGER, Foreign Key referencing zone_registry.id with ON DELETE CASCADE)

8. Table: delivery_tasks
   * id (INTEGER, Primary Key)
   * order_id (INTEGER, Not Null, Foreign Key referencing orders.id with ON DELETE CASCADE)
   * zone_id (INTEGER, Nullable, Foreign Key referencing zone_registry.id with ON DELETE SET NULL)
   * delivery_agent_id (INTEGER, Nullable, Foreign Key referencing users.id with ON DELETE SET NULL)
   * assignment_status (VARCHAR, Default: 'Pending_Pooling', Tracks: 'Pending_Pooling', 'Assigned')
   * status (Enum/VARCHAR) -- Valid values: 'PENDING', 'ASSIGNED', 'Pending Delivery', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED', 'REJECTED'
   * customer_district (VARCHAR, Nullable, e.g., 'COIMBATORE', 'CHENNAI')
   * assignment_status_or_zone (VARCHAR, Nullable, e.g., 'ZONE_1', 'ZONE_2')
   * created_at (TIMESTAMP)

STRICT SECURITY RULES:
- ONLY generate 'SELECT' queries. 
- DO NOT generate INSERT, UPDATE, DELETE, DROP, ALTER, or TRUNCATE statements under any circumstances.
- If the user asks to modify or delete data, respond with the exact word: "FORBIDDEN".
- Return ONLY the raw SQL code block. Do not include any explanation, markdown formatting blocks (like ```sql), or extra text. Just the pure SQL string.
- Note on Typos: The word "bending" is a common user typo for "pending" (meaning placed/uncompleted orders). It is NOT a request to modify, bend, or alter data. Treat it purely as a read-only request to select and count pending orders, and NEVER return "FORBIDDEN" for it.
- Only return "FORBIDDEN" for actual write, update, delete, drop, or alter requests.

STRICT TEXT CASE & ENUM MATCHING RULES:
- PostgreSQL enforces strict enum matching. You must use the exact casing and spelling of enum labels defined below:
  1. For Order status (`orders.status`), the ONLY valid enum labels are capitalized: 'Placed', 'Quoted', 'Invoiced', 'Dispatched', 'Delivered'. NEVER use lowercase 'placed' or 'delivered', and NEVER use 'pending', 'approved', or 'bending' for orders.
  2. For Delivery Task status (`delivery_tasks.status`), the ONLY valid enum labels are uppercase: 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED', 'REJECTED'.
  3. For User role (`users.role`), the labels are lowercase: 'admin', 'user', 'delivery', 'provider', 'ceo', 'sales', 'accounts', 'customer', 'driver', 'delivery_agent', 'delivery_management'.
  4. For Payment Method (`payments.payment_method`), the labels are: 'UPI', 'Cash', 'BankTransfer', 'Wallet'.

STRICT DATE & FILTERING RULES:
- When a user asks for today's sales, query: SELECT COALESCE(SUM(grand_total), 0) AS total_sales, COUNT(*) AS invoice_count FROM invoices WHERE created_at::date = CURRENT_DATE;
- For 'last day sale report', 'yesterday's sales', or 'previous reports', do not restrict filters solely to today's date if that would yield zero results. Instead, dynamically check for the maximum date using a subquery like `(SELECT MAX(created_at)::date FROM invoices)` or `(SELECT MAX(created_at)::date FROM orders)` to ensure data is found even if testing with historical sample data.

BUSINESS INTELLIGENCE TEMPLATE RULES (Translate concepts to robust database queries):
1. User asks: "what about today's sales" / "today sale" / "sales report":
   Generate: SELECT COALESCE(SUM(grand_total), 0) AS total_sales, COUNT(*) AS invoice_count FROM invoices WHERE created_at::date = CURRENT_DATE;
2. User asks: "how many pending orders" / "bending orders":
   "pending" or "bending" orders are orders that are placed but not yet delivered.
   Generate: SELECT COUNT(*) AS count FROM orders WHERE status != 'Delivered';
3. User asks: "who is vijay" / customer searches:
   Always use ILIKE pattern matching on customer columns.
   Generate: SELECT display_name, email, company_name, phone_mobile, first_name, last_name FROM customers WHERE display_name ILIKE '%vijay%' OR first_name ILIKE '%vijay%' OR last_name ILIKE '%vijay%';
4. User asks: "low stock products" / "inventory alert":
   Generate: SELECT name, stock_quantity FROM products WHERE stock_quantity < 10 AND is_deleted = FALSE;

CONVERSATIONAL GREETING RULE:
- If the user inputs a simple greeting, salutation, or small talk (such as 'hi', 'hello', 'hey', 'good morning'), DO NOT return 'FORBIDDEN'.
- Instead, translate the greeting into a valid, harmless clean literal SELECT statement containing a helpful assistant response string.
- Example expected output for 'hi': SELECT 'Hello Admin! How can I assist you with the database records or sales reports today?' AS response;
"""


def clean_and_validate_sql(sql_text: str) -> str:
    """Validates and sanitizes the AI-generated SQL string."""
    # Strip any markdown code block artifacts
    clean_sql = sql_text.strip()
    clean_sql = re.sub(r"^```sql\s*", "", clean_sql, flags=re.IGNORECASE)
    clean_sql = re.sub(r"^```\s*", "", clean_sql)
    clean_sql = re.sub(r"\s*```$", "", clean_sql).strip()

    # Block destructive keywords
    forbidden_keywords = ["insert", "update", "delete", "drop", "alter", "truncate", "grant", "revoke"]
    for keyword in forbidden_keywords:
        if re.search(r'\b' + keyword + r'\b', clean_sql.lower()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security Violation: Non-SELECT or destructive queries are strictly prohibited."
            )

    if not clean_sql.lower().startswith("select"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate a valid retrieval query for this request."
        )

    return clean_sql


@router.post("/chat")
async def admin_chatbot_endpoint(payload: ChatInput, db: Session = Depends(get_db)):
    """
    Admin AI Chatbot endpoint — translates natural language to SQL using NVIDIA NIM,
    executes safely against PostgreSQL, and returns an AI-synthesized response.
    """

    # ── STEP 0: Resolve NVIDIA_API_KEY ──
    nvidia_api_key = os.getenv("NVIDIA_API_KEY")

    if not nvidia_api_key:
        print("[NVIDIA KEY] ❌ NVIDIA_API_KEY is missing. Returning 500 to client.")
        raise HTTPException(
            status_code=500,
            detail="NVIDIA API Key is missing on the server configuration. Check your .env file."
        )

    print(f"[CHAT REQUEST] Received: '{payload.message[:60]}...' " if len(payload.message) > 60 else f"[CHAT REQUEST] Received: '{payload.message}'")

    try:
        # Initialize OpenAI client pointing directly to NVIDIA integration hub
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=nvidia_api_key
        )

        # ── STEP 1: Generate SQL from natural language via NVIDIA NIM ──
        sql_response = client.chat.completions.create(
            model="meta/llama-3.1-8b-instruct",
            messages=[
                {"role": "system", "content": DB_SCHEMA_PROMPT},
                {"role": "user", "content": payload.message}
            ],
            temperature=0.1,
            max_tokens=1024
        )
        generated_sql = sql_response.choices[0].message.content.strip()
        print(f"[NVIDIA SQL] Generated: {generated_sql[:120]}")

        # Guardrail check
        if "FORBIDDEN" in generated_sql or not generated_sql:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sorry, I am only authorized to fetch and read database records, not modify them."
            )

        retry_count = 0
        max_retries = 3
        valid_sql = ""
        db_results = []

        while True:
            try:
                # ── STEP 2: Sanitize and validate the SQL ──
                valid_sql = clean_and_validate_sql(generated_sql)

                # ── STEP 3: Execute against PostgreSQL via SQLAlchemy ──
                result_proxy = db.execute(text(valid_sql))
                columns = result_proxy.keys()
                db_results = [dict(zip(columns, row)) for row in result_proxy.fetchall()]
                print(f"[DB QUERY] Rows returned: {len(db_results)}")
                break

            except HTTPException as http_exc:
                # Re-raise security validation and format exceptions immediately without retry
                raise http_exc
            except Exception as db_error:
                db.rollback() # Safely rollback PostgreSQL transaction block to allow retry attempts
                print(f"[DB ERROR] Attempt {retry_count + 1} failed: {db_error}")
                if retry_count >= max_retries:
                    print("[RETRY LIMIT] Max retries reached. Raising database execution error.")
                    raise db_error

                retry_count += 1
                print(f"[SELF-CORRECTION] Query failed. Requesting correction from NIM (Attempt {retry_count}/{max_retries})...")

                correction_system_prompt = (
                    "You are an expert at fixing broken PostgreSQL syntax queries. "
                    "Analyze the original admin request, the failed SQL, and the database error message. "
                    "Return ONLY a pure, valid, corrected SQL SELECT query string. "
                    "Ensure you use valid column names and valid enum values. For order status, the only valid enum values are: 'Placed', 'Quoted', 'Invoiced', 'Dispatched', 'Delivered'. For delivery status, valid enums are: 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED', 'REJECTED'."
                )

                correction_user_message = (
                    f"Original Admin Request: {payload.message}\n"
                    f"Failed SQL String: {generated_sql}\n"
                    f"PostgreSQL Error Message: {str(db_error)}"
                )

                correction_response = client.chat.completions.create(
                    model="meta/llama-3.1-8b-instruct",
                    messages=[
                        {"role": "system", "content": correction_system_prompt},
                        {"role": "user", "content": correction_user_message}
                    ],
                    temperature=0.1,
                    max_tokens=1024
                )

                generated_sql = correction_response.choices[0].message.content.strip()
                print(f"[NVIDIA SQL] Corrected: {generated_sql[:120]}")

                # Guardrail check on corrected SQL
                if "FORBIDDEN" in generated_sql or not generated_sql:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Sorry, I am only authorized to fetch and read database records, not modify them."
                    )

        # ── STEP 4: Synthesize a natural-language answer from raw DB data ──
        synthesis_prompt = f"""
        You are an elite Enterprise System Dashboard Assistant. 
        The administrator asked: "{payload.message}"
        
        The system executed this PostgreSQL query: "{valid_sql}"
        The query returned this raw data: {str(db_results)}
        
        Formulate a highly professional, clear, and concise response for the Admin based strictly on this data.
        If the data list is empty, mention that no matching records were found.
        Keep the response brief and dense. Do not use generic filler words.
        """
        synthesis_response = client.chat.completions.create(
            model="meta/llama-3.1-8b-instruct",
            messages=[
                {"role": "user", "content": synthesis_prompt}
            ],
            temperature=0.5,
            max_tokens=1024
        )
        final_ai_response = synthesis_response.choices[0].message.content.strip()

        # ── STEP 5: Return full payload ──
        return {
            "query_generated": valid_sql,
            "data_count": len(db_results),
            "response": final_ai_response
        }

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"[CHATBOT ERROR] {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chatbot Engine Error: {str(e)}"
        )