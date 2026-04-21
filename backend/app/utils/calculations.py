from typing import List, Dict

def calculate_gst_totals(items: List[Dict], place_of_supply: str, adjustment: float = 0.0):
    """
    Standardized GST calculation utility for Invoices and Delivery Challans.
    Returns: subtotal, cgst, sgst, igst, grand_total
    """
    subtotal = 0.0
    total_tax = 0.0
    
    for item in items:
        amount = float(item.get('amount', 0))
        tax_type = item.get('tax_type', 'GST18')
        
        subtotal += amount
        
        # Calculate tax for this item
        tax_rate = 0.18 if tax_type == 'GST18' else 0.12
        total_tax += amount * tax_rate
        
    cgst = 0.0
    sgst = 0.0
    igst = 0.0
    
    # Simple logic: If inside Tamil Nadu, 50/50 CGST/SGST. Otherwise IGST.
    # In a real app, this would be based on the Company's home state.
    if place_of_supply == 'Tamil Nadu':
        cgst = round(total_tax / 2, 2)
        sgst = round(total_tax / 2, 2)
    else:
        igst = round(total_tax, 2)
        
    grand_total = round(subtotal + cgst + sgst + igst + adjustment, 2)
    
    return {
        "subtotal": round(subtotal, 2),
        "cgst": cgst,
        "sgst": sgst,
        "igst": igst,
        "adjustment": adjustment,
        "grand_total": grand_total
    }
