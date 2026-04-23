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

    def after_insert(self):
        self._create_pricing_rule()

    def on_update(self):
        if self.pricing_rule:
            self._update_pricing_rule()
        else:
            self._create_pricing_rule()

    def on_trash(self):
        if self.pricing_rule:
            frappe.delete_doc("Pricing Rule", self.pricing_rule)

    def _create_pricing_rule(self):
        sub = frappe.get_all(
            "Subscription",
            filters={"party": self.customer},
            fields=["name", "sm_contract_term_end"],
            limit=1,
        )
        term_end = sub[0].sm_contract_term_end if sub else None

        pr = frappe.get_doc({
            "doctype": "Pricing Rule",
            "title": f"SM Rate {self.customer} {self.item_code}",
            "apply_on": "Item Code",
            "items": [{"item_code": self.item_code}],
            "applicable_for": "Customer",
            "customer": self.customer,
            "rate_or_discount": "Rate",
            "rate": self.contracted_rate,
            "priority": 1,
            "valid_from": self.effective_date,
            "valid_upto": term_end,
            "selling": 1,
        })
        pr.insert(ignore_permissions=True)
        self.pricing_rule = pr.name
        self.db_set("pricing_rule", pr.name)

    def _update_pricing_rule(self):
        pr = frappe.get_doc("Pricing Rule", self.pricing_rule)
        pr.rate = self.contracted_rate
        pr.valid_from = self.effective_date
        pr.save(ignore_permissions=True)
