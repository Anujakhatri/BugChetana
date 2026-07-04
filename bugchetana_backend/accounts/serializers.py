import hashlib
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import User, Role
from django.utils import timezone
from datetime import timedelta
from .models import UserSession

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email as django_validate_email
from rest_framework.exceptions import AuthenticationFailed

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(minutes=30)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('username', 'email', 'name', 'password', 'password2')

    def validate_email(self, value):
       try:
           django_validate_email(value)
       except DjangoValidationError:
           raise serializers.ValidationError("Please enter a valid email address.")

       if User.objects.filter(email__iexact=value).exists():
           raise serializers.ValidationError(
               "This email is already registered. Please log in or use a different email address."
           )
       return value

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
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            raise AuthenticationFailed("Must include 'email' and 'password'.")

        #email format validation
        try:
            django_validate_email(email)
        except DjangoValidationError:
            raise serializers.ValidationError(
                {"detail": "Please enter a valid email address."}
            )
        #email match but password don't
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise AuthenticationFailed("Invalid email or password.")

        #lockout check happens before password check
        if user.locked_until and user.locked_until > timezone.now():
            minutes_left = int((user.locked_until - timezone.now()).total_seconds() // 60) + 1
            raise AuthenticationFailed(
                f"Account temporarily locked due to multiple failed login attempts. "
                f"Try again in {minutes_left} minute(s)."
            )

        if not user.check_password(password):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.locked_until = timezone.now() + LOCKOUT_DURATION
                user.failed_login_attempts = 0
                user.save(update_fields=['failed_login_attempts', 'locked_until'])
                raise AuthenticationFailed(
                    f"Account locked due to too many failed attempts. "
                    f"Try again in {int(LOCKOUT_DURATION.total_seconds() // 60)} minutes."
                )
            user.save(update_fields=['failed_login_attempts', 'locked_until'])
            raise AuthenticationFailed(
                f"Account locked due to too many failed attempts. "
            )
        # success
        if user.failed_login_attempts or user.locked_until:
            user.failed_login_attempts = 0
            user.locked_until = None
            user.save(update_fields=['failed_login_attempts', 'locked_until'])

        self.user = user
        refresh = self.get_token(user)
        refresh_token = str(refresh)

        token_hash = hashlib.sha256(refresh_token.encode('utf-8')).hexdigest()
        UserSession.objects.create(
            user=self.user,
            refresh_token_hash=token_hash,
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        return {
            'refresh': refresh_token,
            'access': str(refresh.access_token),
        }


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

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ('id', 'name')