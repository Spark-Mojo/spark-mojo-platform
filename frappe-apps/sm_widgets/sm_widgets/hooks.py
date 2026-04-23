app_name = "sm_widgets"
app_title = "SM Widgets"
app_publisher = "Spark Mojo"
app_description = "Custom DocTypes for Spark Mojo Platform — SM Task and related child tables"
app_icon = "octicon octicon-tasklist"
app_color = "#006666"
app_email = "dev@sparkmojo.com"
app_license = "MIT"

fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["fieldname", "like", "sm_%"]]
    },
    {
        "doctype": "Print Format",
        "filters": [["name", "=", "SM Mojo-Grouped Invoice"]]
    },
    {
        "doctype": "Workflow",
        "filters": [["name", "=", "SM Managed Account Invoice Approval"]]
    },
    {
        "doctype": "Client Script",
        "filters": [["name", "like", "SM%Invoice%"]]
    }
]

doc_events = {
    "Sales Invoice Item": {
        "before_insert": "sm_widgets.sm_widgets.sales_invoice_item_hooks.populate_sm_fields",
    },
}
