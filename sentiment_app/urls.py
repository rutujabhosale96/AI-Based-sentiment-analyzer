from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/analyze/', views.analyze, name='analyze'),
    path('api/bulk/', views.bulk_analyze_view, name='bulk_analyze'),
    path('api/history/', views.history, name='history'),
    path('api/stats/', views.stats, name='stats'),
    path('api/reset/', views.reset, name='reset'),
]
