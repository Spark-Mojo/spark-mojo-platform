import frappe
import json
from frappe.model.document import Document


class SMSiteRegistry(Document):
    def validate(self):
        # Validate JSON fields are parseable
        for field in ['connectors_json', 'capability_routing_json', 'feature_flags_json']:
            value = self.get(field)
            if value:
                try:
                    json.loads(value)
                except (json.JSONDecodeError, ValueError) as e:
                    frappe.throw(f"{field} must be valid JSON: {e}")

        # Enforce hipaa flag matches server_tier
        if self.server_tier == 'hipaa':
            self.hipaa = 1
        else:
            self.hipaa = 0

    def as_registry_dict(self):
        """Return the full SITE_REGISTRY entry dict for this site."""
        return {
            "frappe_site": self.frappe_site,
            "frappe_url": self.frappe_url,
            "server_tier": self.server_tier,
            "site_type": self.site_type,
            "display_name": self.display_name or self.site_subdomain,
            "hipaa": bool(self.hipaa),
            "is_active": bool(self.is_active),
            "connectors": json.loads(self.connectors_json or '{}'),
            "capability_routing": json.loads(self.capability_routing_json or '{}'),
            "feature_flags": json.loads(self.feature_flags_json or '{}'),
            "template": self.template or "",
        }
