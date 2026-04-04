import frappe
from frappe.model.document import Document


class SMBenchRegistry(Document):
    def validate(self):
        if self.bench_tier == "hipaa-health" and not self.capacity_threshold:
            self.capacity_threshold = 60
        elif self.bench_tier == "standard-smb" and not self.capacity_threshold:
            self.capacity_threshold = 100

    @property
    def utilization_pct(self):
        if not self.capacity_threshold:
            return 0
        return round((self.active_site_count / self.capacity_threshold) * 100, 1)
