from rest_framework.serializers import ModelSerializer, Serializer
from .models import CustomUser, PowerShellSearch
from rest_framework import serializers
from django.contrib.auth import authenticate

class CustomUserSerializer(ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'username')

class RegisterUserSerializer(ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = CustomUser
        fields = ('email', 'username', 'password')
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'username': {'required': True}
        }
    
    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Um usuário com este email já existe.")
        return value
    
    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Um usuário com este nome já existe.")
        return value
    
    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user
    
class LoginUserSerializer(Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        user = authenticate(**data)
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Invalid credentials")
    
class UserSerializer(ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'username')


class PowerShellSearchSerializer(ModelSerializer):
    class Meta:
        model = PowerShellSearch
        fields = [
            'id', 'command', 'created_at', 'ip_address', 
            'user_agent', 'analysis_result', 'risk_score', 'severity'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        # Remove o usuário dos dados validados pois será definido na view
        validated_data.pop('user', None)
        return super().create(validated_data)


class PowerShellSearchCreateSerializer(ModelSerializer):
    """Serializer específico para criação de pesquisas"""
    class Meta:
        model = PowerShellSearch
        fields = [
            'command', 'ip_address', 'user_agent', 
            'analysis_result', 'risk_score', 'severity'
        ]