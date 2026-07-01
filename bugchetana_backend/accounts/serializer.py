import hashlib
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import User, Role
from django.utils import timezone
from datetime import timedelta
from .models import UserSession


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)


    class Meta:
        model = User
        fields = ('username', 'email', 'name', 'password', 'password2')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError(
                {"password": "Password don't match"})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        try:
            developer_role = Role.objects.get(name__iexact='developer')
        except Role.DoesNotExist:
            raise serializers.ValidationError(
                {
                    'role': (
                        'Default Developer role is not configured in the database. '
                        'Contact an administrator.'
                    )
                }
            )

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            name=validated_data['name'],
            password=validated_data['password'],
            role=developer_role,
        )
        return user


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add extra claims to JWT token
        token['email'] = user.email
        token['username'] = user.username
        token['role_id'] = user.role_id
        token['role'] = user.role.name if user.role else None

        return token

    def validate(self, data):
        validated_data = super().validate(data)
        refresh_token = validated_data['refresh']

        # Hash the refresh token and save to session
        token_hash = hashlib.sha256(refresh_token.encode('utf-8')).hexdigest()

        UserSession.objects.create(
            user=self.user,
            refresh_token_hash=token_hash,
            expires_at=timezone.now() + timedelta(days=7)
        )
        return validated_data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, data):
        self.token = data['refresh']
        return data

    def save(self):
        try:
            token_hash = hashlib.sha256(self.token.encode('utf-8')).hexdigest()

            # Delete session
            UserSession.objects.filter(refresh_token_hash=token_hash).delete()

            # Blacklist the JWT
            RefreshToken(self.token).blacklist()

        except TokenError:
            raise serializers.ValidationError(
                {"refresh": "Refresh token is invalid or expired"})


class ProfileSerializer(serializers.ModelSerializer):
    role = serializers.StringRelatedField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'name', 'role', 'created_at')
        read_only_fields = fields  # read only, cannot edit

# Role Update garcha only by Release Manager
class RoleUpdateSerializer(serializers.Serializer):
    role_id = serializers.IntegerField()

    def validate_role_id(self, value):
        try:
            self.role_instance = Role.objects.get(id=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError("Role with this ID doesnot exist.")
        return value

    def update(self, instance, validated_data):
        old_role = instance.role.name if instance.role else None
        instance.role = self.role_instance
        instance.save()

        return instance, old_role

# User list which can see all users by Release Manager
class UserListSerializer(serializers.ModelSerializer):
    role=serializers.StringRelatedField()
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'name', 'role', 'status','created_at')
