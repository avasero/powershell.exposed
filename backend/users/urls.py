from django.urls import path
from .views import (
    UserInfoView, UserRegistrationView, LoginView, LogoutView, 
    CookieTokenRefreshView, PowerShellSearchCreateView, PowerShellSearchListView
)

urlpatterns = [
    path('user-info/', UserInfoView.as_view(), name='user-info'),
    path('register/', UserRegistrationView.as_view(), name='register-user'),
    path("login/", LoginView.as_view(), name="user-login"),
    path("logout/", LogoutView.as_view(), name="user-logout"),
    path("refresh/", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("powershell-search/", PowerShellSearchCreateView.as_view(), name="powershell-search-create"),
    path("powershell-searches/", PowerShellSearchListView.as_view(), name="powershell-search-list"),
]