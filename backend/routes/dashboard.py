# backend/routes/dashboard.py
from fastapi import APIRouter, Body
from services.database_manager import SupabaseManager
from services.dashboard_manager import DashboardManager

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
dashboard = DashboardManager(SupabaseManager())

@router.get("/metrics")
async def get_dashboard_metrics():
    return await dashboard.get_metrics_summary()

@router.get("/distribution")
async def get_dashboard_distribution():
    return await dashboard.get_distribution_data()

@router.post("/filtered")
async def get_filtered_dashboard_data(filters: dict):
    return await dashboard.get_filtered_metrics(filters)

@router.get("/followup")
async def get_followup_summary():
    return await dashboard.get_followup_analysis()

@router.get("/appointment-hours")
async def get_appointment_hours_distribution():
    return await dashboard.get_appointment_hours()

@router.get("/project-duration")
async def get_project_duration():
    return await dashboard.get_project_duration_distribution()

@router.post("/cross")
async def get_custom_cross_data(params: dict = Body(...)):
    col1 = params.get("col1", "")
    col2 = params.get("col2", "")
    return await dashboard.get_custom_cross(col1, col2)

@router.get("/new-this-month")
async def get_new_clients_count():
    return await dashboard.get_new_clients_this_month()

@router.get("/response-times")
async def get_avg_response_times():
    return await dashboard.get_response_times()

@router.get("/qualification-distribution")
async def get_qualification_distribution():
    return await dashboard.get_clients_by_qualification()