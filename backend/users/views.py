from django.shortcuts import render
from rest_framework.generics import RetrieveUpdateAPIView, CreateAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    CustomUserSerializer, RegisterUserSerializer, 
    PowerShellSearchSerializer, PowerShellSearchCreateSerializer
)
from .models import CustomUser, PowerShellSearch
from rest_framework.views import APIView 
from .serializers import LoginUserSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


class UserInfoView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomUserSerializer

    def get_object(self):
        return self.request.user

@method_decorator(csrf_exempt, name='dispatch')
class UserRegistrationView(CreateAPIView):
    serializer_class = RegisterUserSerializer
    
    def create(self, request, *args, **kwargs):
        print(f"Registration request data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            print(f"User created successfully: {user.email}")
            return Response({
                "message": "Usuário criado com sucesso!",
                "user": CustomUserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        print(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 

class LoginView(APIView):
    def post(self, request):
        serializer = LoginUserSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)  # Corrigido: era "accesss_token"

            response = Response({
                "user": CustomUserSerializer(user).data}, status=status.HTTP_200_OK)
            
            response.set_cookie(
                key="access_token",
                value=access_token,  # Corrigido: era "accesss_token"
                httponly=True,
                secure=False,  # Mudado para False para desenvolvimento em localhost
                samesite="Lax"  # Mudado de "None" para "Lax" para localhost
            )
            response.set_cookie(
                key="refresh_token",
                value=str(refresh),
                httponly=True,
                secure=False,  # Mudado para False para desenvolvimento em localhost
                samesite="Lax"  # Mudado de "None" para "Lax" para localhost
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class LogoutView(APIView):
    
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            try:   
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()
            except Exception as e:
                return Response({"error": "Error invalidating token: " + str(e) }, status=status.HTTP_400_BAD_REQUEST)

           
        response = Response ({"message":"Successfully logged out!"}, status=status.HTTP_200_OK)
        response.delete_cookie("access_token")  # Corrigido: era "acess_token"
        response.delete_cookie("refresh_token")
        return response
    
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request):

        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response({"error":"Refresh token not provided"}, status= status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)

            response = Response({"message": "Access token refreshed successfully"}, status= status.HTTP_200_OK)  # Corrigido: era "Acess"
            response.set_cookie(
                key="refresh_token",
                value=str(refresh),
                httponly=True,
                secure=False,  # Mudado para False para desenvolvimento em localhost
                samesite="Lax"  # Mudado de "None" para "Lax" para localhost
            )
            return response
        except InvalidToken:
            return Response({"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)


@method_decorator(csrf_exempt, name='dispatch')
class PowerShellSearchCreateView(CreateAPIView):
    """View para criar uma nova pesquisa de PowerShell"""
    permission_classes = [IsAuthenticated]
    serializer_class = PowerShellSearchCreateSerializer
    
    def perform_create(self, serializer):
        # Automaticamente associa o usuário autenticado
        # Captura IP e User-Agent do request
        ip_address = self.get_client_ip(self.request)
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')
        
        serializer.save(
            user=self.request.user,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    def get_client_ip(self, request):
        """Obtém o IP real do cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def create(self, request, *args, **kwargs):
        # Log simplificado: apenas usuário, comando e resultado
        command = request.data.get('command', 'N/A')
        severity = request.data.get('severity', 'N/A')
        risk_score = request.data.get('risk_score', 'N/A')
        
        print(f"📊 ANÁLISE SALVA - Usuário: {request.user.email} | Comando: {command[:50]}{'...' if len(command) > 50 else ''} | Severidade: {severity} | Score: {risk_score}")
        
        response = super().create(request, *args, **kwargs)
        return Response({
            "message": "Pesquisa salva com sucesso!",
            "data": response.data
        }, status=status.HTTP_201_CREATED)


class PowerShellSearchListView(ListAPIView):
    """View para listar as pesquisas do usuário autenticado"""
    permission_classes = [IsAuthenticated]
    serializer_class = PowerShellSearchSerializer
    
    def get_queryset(self):
        # Retorna apenas as pesquisas do usuário autenticado
        return PowerShellSearch.objects.filter(user=self.request.user)