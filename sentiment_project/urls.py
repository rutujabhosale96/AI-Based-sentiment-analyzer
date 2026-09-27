from django.urls import path, include

urlpatterns = [
    path('', include('sentiment_app.urls')),
]
