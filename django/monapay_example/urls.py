from django.urls import include, path


urlpatterns = [path("", include("payments.urls"))]
