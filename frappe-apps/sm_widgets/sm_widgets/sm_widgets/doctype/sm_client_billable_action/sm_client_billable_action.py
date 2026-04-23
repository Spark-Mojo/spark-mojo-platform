import frappe
from frappe.model.document import Document


class SMClientBillableAction(Document):
    def autoname(self):
        self.name = f"{self.customer}-{self.item_code}"

    def before_save(self):
        self.discount_amount = (self.quoted_rack_rate or 0) - self.contracted_rate
        item = frappe.get_doc("Item", self.item_code)
        if not self.unit_label:
            self.unit_label = item.stock_uom
        if not self.billing_type:
            self.billing_type = item.sm_billing_type
        if self.commission_eligible is None:
            self.commission_eligible = item.sm_commission_eligible
