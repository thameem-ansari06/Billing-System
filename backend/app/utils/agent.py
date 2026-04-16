from typing import TypedDict
from langgraph.graph import StateGraph, END
import sqlite3
import ollama
import re
import pywhatkit

# ==========================================
# 1. THE STATE (Namma Agent-oda Nyabagam)
# ==========================================
class AgentState(TypedDict):
    invoice_id: str
    image_path: str
    expected_amount: float
    extracted_amount: float
    status: str

# ==========================================
# 2. THE NODES (Namma Workers / Velaigal)
# ==========================================
def vision_node(state: AgentState):
    print(f"\n👀 [Node: Vision Worker] Scanning receipt for {state['invoice_id']}...")
    
    # DB-la irunthu expected amount edukurom
    conn = sqlite3.connect('data/ar_system.db')
    c = conn.cursor()
    c.execute("SELECT amount FROM invoices WHERE invoice_id = ?", (state['invoice_id'],))
    result = c.fetchone()
    expected_amount = float(result[0])
    
    # Ollama AI-a call panrom (Namma strict prompt vachi)
    prompt = """
Examine this Indian UPI payment screenshot carefully. 
Find the main payment amount. 
Remove commas and currency symbols. 
Reply ONLY with the numeric value (e.g., 11000). 
Do not add any explanation.
"""
    
    response = ollama.chat(model='llava', messages=[{'role': 'user', 'content': prompt, 'images': [state['image_path']]}])
    ai_text = response['message']['content'].strip()
    
    # Number-a mattum extract panrom
    numbers = re.findall(r'\d+\.?\d*', ai_text)
    extracted_amount = float(numbers[0]) if numbers else 0.0
    
    print(f"   💰 DB Expected: ₹{expected_amount}")
    print(f"   🤖 AI Found: ₹{extracted_amount}")
    
    # State-a update panrom
    return {"expected_amount": expected_amount, "extracted_amount": extracted_amount}

def success_node(state: AgentState):
    print("✅ [Node: Success Worker] Perfect Match! Updating DB to Green...")
    conn = sqlite3.connect('data/ar_system.db')
    c = conn.cursor()
    c.execute("UPDATE invoices SET status = 'Paid & Verified' WHERE invoice_id = ?", (state['invoice_id'],))
    conn.commit()
    conn.close()
    return {"status": "Paid & Verified"}

def alert_node(state: AgentState):
    print("⚠️ [Node: Alert Worker] Amount Mismatch! Updating DB to Purple...")
    conn = sqlite3.connect('data/ar_system.db')
    c = conn.cursor()
    c.execute("UPDATE invoices SET status = 'Mismatch Alert' WHERE invoice_id = ?", (state['invoice_id'],))
    conn.commit()
    conn.close()
    
    # --- PYWHATKIT WHATSAPP AUTOMATION ---
    manager_phone = "+918870574273"  # Inga unga Manager/Unga phone number podunga (with +91)
    
    alert_msg = (
        f"⚠️ *AR System Alert*\n\n"
        f"Invoice ID: {state['invoice_id']}\n"
        f"Billed Amount: ₹{state['expected_amount']}\n"
        f"Received Amount: ₹{state['extracted_amount']}\n\n"
        f"Action Required: Please check the payment proof."
    )
    
    print(f"📲 [Action] Opening WhatsApp Web to message Manager...")
    try:
        # 15 seconds wait pannum (WhatsApp load aaga), aprm msg send pannittu 3 secs-la tab close aagidum
        pywhatkit.sendwhatmsg_instantly(
            phone_no=manager_phone, 
            message=alert_msg, 
            wait_time=15, 
            tab_close=True, 
            close_time=3
        )
        print("✅ WhatsApp message sent successfully!")
    except Exception as e:
        print(f"❌ Failed to send WhatsApp message: {e}")
        
    return {"status": "Mismatch Alert"}

# ==========================================
# 3. THE ROUTER (Traffic Police)
# ==========================================
def router(state: AgentState):
    print("🚦 [Router] Yosikkiren... Entha route-la pogalam?")
    if state['expected_amount'] == state['extracted_amount']:
        print("   -> Match aagiduchu! Go to Success Node 🟩")
        return "success"
    else:
        print("   -> Match aagala! Go to Alert Node 🟪")
        return "alert"

# ==========================================
# 4. BUILD THE GRAPH (Wiring everything together)
# ==========================================
workflow = StateGraph(AgentState)

# Nodes-a map panrom
workflow.add_node("vision_worker", vision_node)
workflow.add_node("success_worker", success_node)
workflow.add_node("alert_worker", alert_node)

# Entry point (Muthalla yaru vela seiyyanum)
workflow.set_entry_point("vision_worker")

# Conditional Routing (Traffic police-a add panrom)
workflow.add_conditional_edges(
    "vision_worker",
    router,
    {
        "success": "success_worker",
        "alert": "alert_worker"
    }
)

# End points (Vela mudincha exit aaganum)
workflow.add_edge("success_worker", END)
workflow.add_edge("alert_worker", END)

# Graph-a compile panrom
reconciliation_agent = workflow.compile()

# Itha thaan namma inbound_bot call pannum
def run_agent(invoice_id, image_path):
    print("\n" + "="*50)
    print(f"🚀 WAKING UP LANGGRAPH AGENT FOR {invoice_id}")
    print("="*50)
    initial_state = {"invoice_id": invoice_id, "image_path": image_path}
    reconciliation_agent.invoke(initial_state)
    print("="*50 + "\n")