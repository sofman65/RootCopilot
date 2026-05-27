clients = [
    {"_id": "client_demobank", "name": "DemoBank"},
    {"_id": "client_retailco", "name": "RetailCo"},
]

projects = [
    {
        "_id": "project_payments",
        "client_id": "client_demobank",
        "name": "Payments API",
    },
    {
        "_id": "project_checkout",
        "client_id": "client_retailco",
        "name": "Checkout Platform",
    },
]

environments = [
    {
        "_id": "env_uat",
        "project_id": "project_payments",
        "name": "UAT",
    },
    {
        "_id": "env_prod",
        "project_id": "project_payments",
        "name": "Production",
    },
    {
        "_id": "env_sit",
        "project_id": "project_checkout",
        "name": "SIT",
    },
]

issues = [
    {
        "_id": "issue_merchant_config",
        "environment_id": "env_uat",
        "title": "Transactions fail in UAT for one merchant",
        "description": "Authorization attempts fail only for merchant DEMO-102. Logs mention missing terminal profile.",
        "created_at": 1710000000000,
        "environment": "UAT",
        "breadcrumb": "DemoBank / Payments API / UAT",
        "priority": "High",
        "status": "In Progress",
    },
    {
        "_id": "issue_refund_timeout",
        "environment_id": "env_prod",
        "title": "Refund timeout during PSP callback",
        "description": "Refunds remain pending after external PSP callback latency.",
        "created_at": 1710001000000,
        "environment": "Production",
        "breadcrumb": "DemoBank / Payments API / Production",
        "priority": "Critical",
        "status": "Open",
    },
    {
        "_id": "issue_batch_date",
        "environment_id": "env_sit",
        "title": "Settlement batch fails due to invalid date format",
        "description": "Batch import fails when settlement file contains unexpected date format.",
        "created_at": 1710002000000,
        "environment": "SIT",
        "breadcrumb": "RetailCo / Checkout Platform / SIT",
        "priority": "Medium",
        "status": "Resolved",
    },
]

threads = [
    {
        "_id": "thread_merchant_config",
        "issue_id": "issue_merchant_config",
    }
]

messages = [
    {
        "_id": "msg_1",
        "thread_id": "thread_merchant_config",
        "role": "user",
        "content": "Can you analyze why this UAT transaction failure happens only for one merchant?",
        "created_at": 1710000000000,
        "issue_id": "issue_merchant_config",
        "issue_title": "Transactions fail in UAT for one merchant",
        "environment": "UAT",
        "breadcrumb": "DemoBank / Payments API / UAT",
    },
    {
        "_id": "msg_2",
        "thread_id": "thread_merchant_config",
        "role": "assistant",
        "content": "The most likely root cause is missing merchant or terminal configuration in UAT.",
        "created_at": 1710000100000,
        "issue_id": "issue_merchant_config",
        "issue_title": "Transactions fail in UAT for one merchant",
        "environment": "UAT",
        "breadcrumb": "DemoBank / Payments API / UAT",
    },
]

rag_entries = [
    {
        "entryId": "rag_1",
        "title": "Merchant configuration incident notes",
        "namespace": "payments",
        "createdAt": 1710000000000,
    }
]
