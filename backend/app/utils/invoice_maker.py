import os
import pandas as pd
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_invoice(invoice_id, customer_email, items_list):
    """
    items_list format expect panrathu: 
    [{'Item Name': 'FastAPI Setup', 'Price': 10000}, ...]
    """
    print(f"\n⚙️ [Generator Engine] Building Invoice {invoice_id}...")
    
    # ==========================================
    # 1. THE MATH ENGINE (Pandas)
    # ==========================================
    df = pd.DataFrame(items_list)
    df['Price'] = df['Price'].astype(float)
    
    # 18% GST Calculation
    df['GST (18%)'] = df['Price'] * 0.18
    df['Total'] = df['Price'] + df['GST (18%)']
    
    subtotal = df['Price'].sum()
    total_gst = df['GST (18%)'].sum()
    grand_total = df['Total'].sum()
    
    # ==========================================
    # 2. PDF SETUP & DESIGN
    # ==========================================
    # Save panra folder check panrom
    save_folder = "data/invoices"
    os.makedirs(save_folder, exist_ok=True)
    pdf_path = f"{save_folder}/{invoice_id}.pdf"
    
    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Header Design
    header_style = ParagraphStyle(name='Header', parent=styles['Heading1'], alignment=1, fontSize=20, spaceAfter=10)
    elements.append(Paragraph("<b>THAMEEM TECH & IT SOLUTIONS</b>", header_style))
    elements.append(Paragraph("<para align=center>Automated Billing System | info@thameem.tech</para>", styles['Normal']))
    elements.append(Spacer(1, 30))
    
    # Invoice Details Section
    info_text = f"<b>Invoice Number:</b> {invoice_id}<br/>" \
                f"<b>Billed To:</b> {customer_email}<br/>" \
                f"<b>Date:</b> {date.today().strftime('%d-%b-%Y')}"
    elements.append(Paragraph(info_text, styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # ==========================================
    # 3. DRAWING THE TABLE
    # ==========================================
    # Table Header
    table_data = [['Description', 'Unit Price (₹)', 'GST 18% (₹)', 'Net Total (₹)']]
    
    # Adding items dynamically from Pandas DataFrame
    for index, row in df.iterrows():
        table_data.append([
            row['Item Name'],
            f"{row['Price']:.2f}",
            f"{row['GST (18%)']:.2f}",
            f"{row['Total']:.2f}"
        ])
        
    # Adding Summary Rows at the bottom
    table_data.append(['', '', 'Subtotal:', f"{subtotal:.2f}"])
    table_data.append(['', '', 'Total GST:', f"{total_gst:.2f}"])
    table_data.append(['', '', 'GRAND TOTAL:', f"₹ {grand_total:.2f}"])
    
    # Table Styling (Corporate Look)
    t = Table(table_data, colWidths=[220, 100, 90, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1A2B4C")), # Dark Blue Header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'), # Align numbers to right
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -4), colors.HexColor("#F5F5F5")), # Light Grey items
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTNAME', (2, -3), (2, -1), 'Helvetica-Bold'), # Bold for summary labels
        ('FONTNAME', (3, -1), (3, -1), 'Helvetica-Bold'), # Bold for Grand Total value
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#E0E0E0")), # Grand total row highlight
    ]))
    
    elements.append(t)
    
    # Final Build
    doc.build(elements)
    print(f"✅ Success! PDF Generated: {pdf_path}")
    print(f"💰 Extracted Grand Total for DB: ₹{grand_total}")
    
    # Rendu output return panrom: PDF path (mail-kku), Grand Total (DB-kku)
    return pdf_path, grand_total

# ==========================================
# TEST RUN BLOCK (Itha direct-a run panni paarkalam)
# ==========================================
if __name__ == "__main__":
    test_items = [
        {"Item Name": "FastAPI Backend Setup", "Price": 12000},
        {"Item Name": "LangGraph AI Agent", "Price": 18000},
        {"Item Name": "Heavy Duty Steel Hammer", "Price": 850}
    ]
    
    pdf_file, final_amount = generate_pdf_invoice("INV-2001", "manager@company.com", test_items)