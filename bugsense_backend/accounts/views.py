import hashlib
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializer import RegisterSerializer, LoginSerializer, LogoutSerializer, ProfileSerializer
from .models import UserSession

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
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # response.data बाट refresh token लिने + jwt decode garera user lighcha
        refresh_token = response.data['refresh']
        decoded= RefreshToken(refresh_token)
        user = User.objects.get(id=decoded['user_id'])

        #session save garne
        UserSession.objects.create(
            user = user,
            refresh_token_hash = hash_token(refresh_token),
            expires_at = timezone.now() + timedelta(days=7)
        )
        return Response({
            "message": "Login successful",
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