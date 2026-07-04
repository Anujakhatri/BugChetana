import hashlib
from urllib.request import Request
from .permissions import IsAdmin, IsAdminOrReleaseManager
from django.utils import timezone
from datetime import timedelta
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer, LoginSerializer, LogoutSerializer, ProfileSerializer,
    RoleUpdateSerializer, UserListSerializer, RoleSerializer,
)
from .models import UserSession, Role

from django.contrib.auth import get_user_model

User = get_user_model()

#token hash garna
def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

class RegisterView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (AnonRateThrottle,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh)

        UserSession.objects.create(
            user=user,
            refresh_token_hash=hash_token(refresh_token),
            expires_at=timezone.now() + timedelta(days=7)
        )

        return Response({
            "message": "Registration successful",
            "user": {
                "username": user.username,
                "email": user.email,
                "role": user.role.name if user.role else None
            },
            "tokens": {
                "access": str(refresh.access_token),
                "refresh": str(refresh)
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # response.data बाट refresh token लिने + jwt decode garera user lighcha
        refresh_token = response.data['refresh']
        decoded= RefreshToken(refresh_token)
        user = User.objects.get(id=decoded['user_id'])

        return Response({
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": user.name,
                "role": user.role.name if user.role else None
            },
            "tokens": response.data
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data['refresh']

        #session delete garne
        UserSession.objects.filter(
            user = request.user,
            refresh_token_hash = hash_token(refresh_token)
        ).delete()

        #jwt blackcklist garche
        serializer.save()

        return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

#Role update by release manager only
class RoleUpdateView(APIView):
    permission_classes = (IsAuthenticated,IsAdmin)

    def patch(self, request, pk):
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"message": "User does not exist"}, status=status.HTTP_404_NOT_FOUND)
        serializer = RoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_user, old_role = serializer.update(target_user, serializer.validated_data)

        return Response({
            "message": f"{updated_user.name}'s role updated from '{old_role}' to '{updated_user.role.name}'.",
            "user": {
                "id": updated_user.id,
                "username": updated_user.username,
                "email": updated_user.email,
                "role": updated_user.role.name
            }
        }, status=status.HTTP_200_OK)


#admin and release manager can see everyone
class UserListView(generics.ListAPIView):
    serializer_class = UserListSerializer
    permission_classes = (IsAuthenticated, IsAdmin, IsAdminOrReleaseManager)

    def get_queryset(self):
        return User.objects.select_related('role').order_by('created_at')

class RoleListView(generics.ListAPIView):
    """
    Lightweight lookup for populating role dropdowns in Role Management UI.
    Any authenticated user with UI access to role management needs this —
    same permission as UserListView/RoleUpdateView.
    """
    serializer_class = RoleSerializer
    permission_classes = (IsAuthenticated, IsAdminOrReleaseManager)
    queryset = Role.objects.all().order_by('name')