import os
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from datetime import date

def generate_delivery_challan(invoice_id, customer_name, customer_address, contact_number, items_list):
    """
    Automated Delivery Challan Generator for SR.Thameem Billing.
    Saves PDF to static/challans/ for logistics use.
    """
    save_folder = os.path.join("static", "challans")
    # Clean name for filesystem
    safe_invoice_id = invoice_id.replace('/', '_').replace('\\', '_')
    safe_name = f"CHALLAN_{safe_invoice_id}"
    pdf_path = os.path.join(save_folder, f"{safe_name}.pdf")
    os.makedirs(save_folder, exist_ok=True)

    doc = SimpleDocTemplate(pdf_path, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    elements = []
    styles = getSampleStyleSheet()

    # 1. Header
    elements.append(Paragraph("<b>DELIVERY CHALLAN</b>", styles['Title']))
    elements.append(Spacer(1, 12))

    # 2. Information Grid
    details_data = [
        ["Customer Name:", customer_name, "Date:", str(date.today())],
        ["Delivery Address:", Paragraph(customer_address, styles['Normal']), "Invoice Ref:", invoice_id],
        ["Contact Number:", contact_number, "", ""]
    ]
    details_table = Table(details_data, colWidths=[100, 180, 80, 100])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.black),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 24))

    # 3. Items Table
    item_headers = ["#", "Item Description", "Quantity"]
    # items_list expected format: [{"Item Name": str, "Quantity": float}]
    item_rows = [[i+1, item['Item Name'], item['Quantity']] for i, item in enumerate(items_list)]
    table_data = [item_headers] + item_rows

    items_table = Table(table_data, colWidths=[40, 340, 80])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#4F46E5")), # Indigo
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('ALIGN', (1,0), (1,-1), 'LEFT'),
        ('ALIGN', (2,0), (2,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,0), (-1,0), 10),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 9),
    ]))
    elements.append(items_table)
    
    elements.append(Spacer(1, 40))
    elements.append(Paragraph("<i>This is a computer-generated delivery challan. No signature required.</i>", styles['Normal']))

    # Final Build
    doc.build(elements)
    return f"/static/challans/{safe_name}.pdf"
