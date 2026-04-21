import os
import pandas as pd
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

def generate_pdf_invoice(invoice_id, customer_email, items_list, tax_data=None, terms=None, logo_path=None, logistics_data=None):
    """
    Professional PDF Generator for Antigravity Billing.
    Supports Tax Breakdown, Signatory, Terms, and Logistics.
    """
    print(f"\n⚙️ [Generator Engine] Building Professional Document {invoice_id}...")
    
    # Math Engine
    df = pd.DataFrame(items_list)
    df['Price'] = df['Price'].astype(float)
    
    # Use provided tax_data if available, else fallback to 18%
    subtotal = df['Price'].sum()
    if tax_data:
        cgst = tax_data.get('cgst', 0)
        sgst = tax_data.get('sgst', 0)
        igst = tax_data.get('igst', 0)
        grand_total = tax_data.get('grand_total', subtotal)
    else:
        total_gst = subtotal * 0.18
        cgst = total_gst / 2
        sgst = total_gst / 2
        igst = 0
        grand_total = subtotal + total_gst

    # PDF Setup
    save_folder = os.path.join("data", "invoices")
    # Sanitize invoice_id for filename (replace slashes with dashes to avoid directory issues)
    safe_invoice_id = invoice_id.replace("/", "-").replace("\\", "-")
    pdf_path = os.path.join(save_folder, f"{safe_invoice_id}.pdf")
    
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    
    doc = SimpleDocTemplate(pdf_path, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()
    
    # 1. Header with Logo Table
    header_data = [[
        Paragraph("<b>SR.Thameem BILLING</b><br/><font size=9>Your Professional Automation Partner</font>", styles['Normal']),
        Paragraph(f"<para align=right><b>DOCUMENT</b><br/><font size=12>#{invoice_id}</font></para>", styles['Normal'])
    ]]
    head_table = Table(header_data, colWidths=[3.5*inch, 3.5*inch])
    elements.append(head_table)
    elements.append(Spacer(1, 20))
    
    # 2. Bill To & Date
    info_data = [[
        Paragraph(f"<b>BILL TO:</b><br/>{customer_email}", styles['Normal']),
        Paragraph(f"<b>DATE:</b> {date.today().strftime('%d %b %Y')}", styles['Normal'])
    ]]
    info_table = Table(info_data, colWidths=[3.5*inch, 3.5*inch])
    elements.append(info_table)
    elements.append(Spacer(1, 25))

    # 3. Logistics Section (New)
    if logistics_data:
        logistics_title = Paragraph("<b>SHIPPING & LOGISTICS DETAILS</b>", styles['Normal'])
        elements.append(logistics_title)
        elements.append(Spacer(1, 5))
        
        l_data = [[
            Paragraph(f"<b>Vehicle#:</b> {logistics_data.get('vehicle_number', 'N/A')}", styles['Normal']),
            Paragraph(f"<b>Transporter:</b> {logistics_data.get('transporter_name', 'N/A')}", styles['Normal'])
        ], [
            Paragraph(f"<b>Driver:</b> {logistics_data.get('driver_name', 'N/A')} ({logistics_data.get('driver_mobile', '-')})", styles['Normal']),
            Paragraph(f"<b>Waybill/LR:</b> {logistics_data.get('waybill_number', 'N/A')}", styles['Normal'])
        ]]
        l_table = Table(l_data, colWidths=[3.5*inch, 3.5*inch])
        l_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.1, colors.lightgrey),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(l_table)
        elements.append(Spacer(1, 20))
    
    # 4. Items Table
    table_data = [['DESCRIPTION', 'QTY', 'RATE (₹)', 'AMOUNT (₹)']]
    for item in items_list:
        table_data.append([
            item.get('Item Name', 'Service'),
            str(item.get('Quantity', 1)),
            f"{float(item.get('Price', 0)):.2f}",
            f"{float(item.get('Amount', item.get('Price', 0))):.2f}"
        ])
        
    t = Table(table_data, colWidths=[3.5*inch, 0.8*inch, 1.2*inch, 1.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563eb")), # Blue Header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.1, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 15))
    
    # 5. Tax Breakdown & Totals
    summary_data = [
        ['', 'Sub Total:', f"₹ {subtotal:.2f}"],
    ]
    if igst > 0:
        summary_data.append(['', 'IGST:', f"₹ {igst:.2f}"])
    else:
        summary_data.append(['', 'CGST:', f"₹ {cgst:.2f}"])
        summary_data.append(['', 'SGST:', f"₹ {sgst:.2f}"])
    
    summary_data.append(['', 'GRAND TOTAL:', f"₹ {grand_total:.2f}"])
    
    summary_table = Table(summary_data, colWidths=[4*inch, 1.5*inch, 1.5*inch])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (-2, -1), (-1, -1), 12),
        ('TOPPADDING', (0, -1), (-1, -1), 5),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 40))
    
    # 6. Terms and Conditions & Signatory
    footer_data = [[
        Paragraph(f"<b>Terms & Conditions:</b><br/><font size=8>{terms or '1. Goods once sold will not be taken back.<br/>2. Pay within due date to avoid interest.'}</font>", styles['Normal']),
        Paragraph("<para align=right><b>Authorized Signatory</b><br/><br/><br/>________________________</para>", styles['Normal'])
    ]]
    footer_table = Table(footer_data, colWidths=[4*inch, 3*inch])
    elements.append(footer_table)
    
    # Final Build
    doc.build(elements)
    return pdf_path, grand_total

if __name__ == "__main__":
    test_items = [{"Item Name": "Test Product", "Quantity": 2, "Price": 500, "Amount": 1000}]
    generate_pdf_invoice("INV-TEST", "test@example.com", test_items)