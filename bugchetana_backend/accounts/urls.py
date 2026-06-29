from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, LogoutView, ProfileView, RoleUpdateView, UserListView
urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),

    #profile
    path('profile/', ProfileView.as_view(), name='profile'),

    #user management by release manager
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/role/', RoleUpdateView.as_view(), name='user-role-update'),
]