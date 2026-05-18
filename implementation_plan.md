# High-Density UI Architecture Overhaul

This plan outlines the complete transition of the current web application interface to a compact, high-density layout. This involves reducing white space globally, resizing core standard components, and refactoring main form layouts to be multi-column, ensuring maximum information density for power users.

## User Review Required

> [!WARNING]
> This is a substantial, global change that will impact the look and feel of almost every screen in the application. Standard input sizes will be smaller, tables will be tighter, and form layouts will be structurally changed from single-column/wide to multi-column/compact grids. Please review the proposed changes below to ensure they align with the expected aesthetic.

## Proposed Changes

---

### Core UI Components (shadcn/ui)

We will modify the core UI components to significantly reduce their base sizes, paddings, and margins.

#### [MODIFY] [button.jsx](file:///d:/AR_Automation/frontend/src/components/ui/button.jsx)
- Reduce standard height (`h-8` -> `h-7`).
- Reduce padding (`px-2.5` -> `px-2`).
- Adjust text sizes to be slightly more compact if necessary.

#### [MODIFY] [input.jsx](file:///d:/AR_Automation/frontend/src/components/ui/input.jsx)
- Reduce height (`h-8` -> `h-7`).
- Reduce horizontal/vertical padding (`px-2.5 py-1` -> `px-2 py-0.5`).
- Ensure text size is strictly `text-sm`.

#### [MODIFY] [textarea.jsx](file:///d:/AR_Automation/frontend/src/components/ui/textarea.jsx)
- Reduce minimum height and padding to match the new high-density inputs.

#### [MODIFY] [card.jsx](file:///d:/AR_Automation/frontend/src/components/ui/card.jsx)
- Reduce overall padding in `CardContent` and `CardFooter` (e.g., from `p-6` / `p-4` to `p-3`).
- Reduce gap between child elements (`gap-4` -> `gap-2`).

#### [MODIFY] [table.jsx](file:///d:/AR_Automation/frontend/src/components/ui/table.jsx)
- Decrease table row and header heights (`h-10` -> `h-7` or `h-8`).
- Reduce cell padding (`p-2` -> `px-2 py-1`).

#### [MODIFY] [select.jsx](file:///d:/AR_Automation/frontend/src/components/ui/select.jsx)
- Reduce trigger height to match inputs (`h-8` -> `h-7`).
- Reduce padding of SelectItems for a tighter dropdown list.

#### [MODIFY] [dialog.jsx](file:///d:/AR_Automation/frontend/src/components/ui/dialog.jsx)
- Reduce padding of the dialog content container.

---

### Layout & Form Refactoring

We will overhaul the primary creation forms and dashboard views. The current pattern often uses `space-y-10`, `p-10`, and single-column fields that span wide areas. We will transition these to use tight multi-column grids (e.g., `grid-cols-2` or `grid-cols-3` with `gap-4`) and bring labels closer to their inputs.

#### [MODIFY] [CreateItem.jsx](file:///d:/AR_Automation/frontend/src/components/CreateItem.jsx)
- Change root container padding from `p-10` to `p-4` or `p-6`.
- Change `space-y-10` and `space-y-8` to `space-y-4` or `space-y-5`.
- Convert the 12-column single-field rows into a dense multi-column layout where related fields (e.g., HSN Code, Category, Tax Rates) sit side-by-side.
- Remove hardcoded `h-11` heights on inputs/selects to inherit the new dense `h-7` defaults.

#### [MODIFY] [CreateCustomer.jsx](file:///d:/AR_Automation/frontend/src/components/CreateCustomer.jsx)
- Refactor the form layout to use a compact multi-column grid.
- Reduce section spacing and container padding.

#### [MODIFY] [CreateInvoice.jsx](file:///d:/AR_Automation/frontend/src/components/CreateInvoice.jsx)
- Condense the top metadata section (Customer, Dates) into a tight 3 or 4 column grid.
- Reduce padding inside the line-item table.

#### [MODIFY] [CreateQuote.jsx](file:///d:/AR_Automation/frontend/src/components/CreateQuote.jsx)
- Apply the same multi-column density rules as `CreateInvoice`.

#### [MODIFY] [CreateDeliveryChallan.jsx](file:///d:/AR_Automation/frontend/src/components/CreateDeliveryChallan.jsx)
- Apply the same multi-column density rules.

---

### Dashboard and Tab Layouts

We will review the primary data view tabs to reduce excessive margins and ensure tables dominate the viewport.

#### [MODIFY] [DashboardTab.jsx](file:///d:/AR_Automation/frontend/src/components/DashboardTab.jsx)
- Reduce `gap` and `padding` values in the main grid layouts and stat cards.

#### [MODIFY] [InventoryTab.jsx](file:///d:/AR_Automation/frontend/src/components/InventoryTab.jsx)
- Reduce surrounding page padding.
- Ensure the toolbar (search/filters) is tightly packed above the table.

*(Similar density optimizations will be applied to `AdminCustomers.jsx`, `AdminOrders.jsx`, `InvoicesTab.jsx`, etc., primarily focusing on wrapper paddings and action bar gaps).*

## Verification Plan

### Manual Verification
- Navigate through all primary forms (`/inventory/new`, `/customers/new`, `/invoices/new`, etc.) to visually inspect the multi-column layouts and ensure no controls are overlapping or broken.
- Review all tables across the dashboard tabs to confirm they accurately reflect the new dense row heights and cell paddings.
- Test interactive components (Select dropdowns, Dialogs) to ensure their popovers remain fully legible and functional with the reduced padding.
