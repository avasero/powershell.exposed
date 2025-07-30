from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

class CookieJWTAuthentication(JWTAuthentication):
   def authenticate(self, request):
      print(f"CookieJWTAuthentication - Tentando autenticar...")
      print(f"Cookies disponíveis: {list(request.COOKIES.keys())}")
      
      token = request.COOKIES.get("access_token")
      print(f"Access token encontrado: {'Sim' if token else 'Não'}")
      
      if token:
         print(f"Token (primeiros 20 chars): {token[:20]}...")

      if not token:
         print("Nenhum token de acesso encontrado nos cookies")
         return None
      try:
         print("Validando token...")
         validated_token = self.get_validated_token(token)
         print("Token validado com sucesso")
      except AuthenticationFailed as e:
         print(f"Falha na validação do token: {str(e)}")
         raise AuthenticationFailed(f"Token validation failed:{str(e)}")
      try:
         user = self.get_user(validated_token)
         print(f"Usuário autenticado: {user}")
         return user, validated_token
      except AuthenticationFailed as e:
         print(f"Erro ao obter usuário: {str(e)}")
         raise AuthenticationFailed(f"Error retrieving user:{str(e)}")
         

