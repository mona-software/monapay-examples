from django.urls import path

from . import views


urlpatterns = [
    path("orders/<str:order_id>/qr", views.create_qr),
    path("webhooks/monapay", views.monapay_webhook),
]
