import sqlite3
import ollama
import re


def verify_payment_with_vision(invoice_id, image_path):
    # 1. Connect to DB to get Expected Amount
    conn = sqlite3.connect('data/ar_system.db')
    c = conn.cursor()
    c.execute("SELECT amount FROM invoices WHERE invoice_id = ?", (invoice_id,))
    result = c.fetchone()
    
    if not result:
        print(f"❌ Invoice {invoice_id} not found in DB.")
        return False
        
    expected_amount = float(result[0])
    print(f"\n🔍 [Vision AI] Analyzing Receipt for {invoice_id}...")
    print(f"💰 Expected Amount: ₹{expected_amount}")
    
    try:
        # 2. Call Ollama Vision Model
        # Namma prompt-la theliva solrom: 'Amount-a mattum number-a kudu' nu
        
        response = ollama.chat(
            model='llava', 
            messages=[{
                'role': 'user',
                'content': 'You are a strict financial AI. Analyze this payment receipt. Find the EXACT "Total Amount Paid" or "Successful Payment Amount". Ignore transaction IDs, dates, time, phone numbers, and account balances. Return ONLY the numeric value of the paid amount. No symbols, no text, no commas.',
                'images': [image_path]
            }]
        )
        
        ai_text = response['message']['content'].strip()
        print(f"🤖 Ollama Output: {ai_text}")
        
        # 3. Clean and verify the result
        # Extract only numbers from the AI response (in case it added extra words)
        numbers = re.findall(r'\d+\.?\d*', ai_text)
        
        if numbers:
            extracted_amount = float(numbers[0])
            print(f"✅ Extracted Amount: ₹{extracted_amount}")
            
            # 4. RECONCILIATION LOGIC (Match panrom)
            if extracted_amount == expected_amount:
                status = 'Paid & Verified'
                print("🎉 Match Successful! Updating Database...")
            else:
                status = 'Mismatch Alert'
                print(f"⚠️ Amount Mismatch! Expected: {expected_amount}, Found: {extracted_amount}")
                
            # Update the status in DB
            c.execute("UPDATE invoices SET status = ? WHERE invoice_id = ?", (status, invoice_id))
            conn.commit()
            conn.close()
            return True
            
        else:
            print("❌ Vision AI could not find any amount in the image.")
            conn.close()
            return False
            
    except Exception as e:
        print(f"⚠️ Error running Ollama Vision: {e}")
        print("Please ensure Ollama is running in the background.")
        conn.close()
        return False

# For direct testing
if __name__ == "__main__":
    print("This file acts as a module. Use inbound_bot.py to trigger it.")