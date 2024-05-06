from django.urls import path

from . import views

urlpatterns = [
    path("increase/", views.increase, name="increase"),
    path("read/", views.read, name="read"),
]
