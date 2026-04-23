app_name = "sm_provisioning"
app_title = "SM Provisioning"
app_publisher = "Spark Mojo"
app_description = "Site provisioning and registry for Spark Mojo Platform"
app_email = "dev@sparkmojo.com"
app_license = "MIT"

fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["dt", "=", "SM Site Registry"]]
    },
    {
        "doctype": "Role",
        "filters": [["role_name", "like", "SM %"]]
    }
]
