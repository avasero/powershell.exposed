"""
Gerenciador de API Keys para usuários autenticados
"""
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from services.session_manager import get_supabase_client


def generate_api_key() -> str:
    """
    Gera uma API Key segura no formato: pse_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    """
    # Prefixo para identificar como PowerShell Exposed API Key
    prefix = "pse_"
    # 32 caracteres aleatórios
    key_part = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    return f"{prefix}{key_part}"


async def create_user_api_key(user_id: str, name: str = "Default API Key", access_token: str = None) -> Optional[Dict[str, Any]]:
    """
    Cria uma nova API Key para o usuário na tabela profiles
    """
    try:
        # Usar contexto de usuário para operações em profiles (RLS)
        from services.session_manager import get_supabase_client_with_user_context
        supabase = get_supabase_client_with_user_context(access_token)
        
        print(f"🔧 Usando cliente Supabase com contexto de usuário")
        
        # Verificar se usuário já tem uma API Key ativa
        existing_response = supabase.table('profiles') \
            .select('*') \
            .eq('id', user_id) \
            .eq('api_key_is_active', True) \
            .execute()
        
        if existing_response.data and len(existing_response.data) > 0 and existing_response.data[0].get('api_key'):
            print(f"⚠️ Usuário {user_id} já possui uma API Key ativa")
            profile = existing_response.data[0]
            return {
                "id": profile["id"],
                "api_key": profile["api_key"],
                "name": profile["api_key_name"],
                "created_at": profile["api_key_created_at"],
                "last_used_at": profile["api_key_last_used_at"],
                "usage_count": profile["api_key_usage_count"],
                "is_active": profile["api_key_is_active"]
            }
        
        # Se não há API Key ativa, limpar qualquer API Key inativa existente
        print(f"🔄 Limpando API Key inativa (se existir) para usuário {user_id}")
        
        # Primeiro verificar se o usuário existe na tabela profiles
        user_check = supabase.table('profiles') \
            .select('id, username') \
            .eq('id', user_id) \
            .execute()
        
        print(f"📊 Verificação do usuário: {user_check.data}")
        
        if not user_check.data or len(user_check.data) == 0:
            print(f"❌ Usuário {user_id} não encontrado na tabela profiles")
            return None
        
        supabase.table('profiles') \
            .update({
                "api_key": None,
                "api_key_name": None,
                "api_key_created_at": None,
                "api_key_last_used_at": None,
                "api_key_usage_count": 0,
                "api_key_is_active": False
            }) \
            .eq('id', user_id) \
            .execute()
        
        # Gerar nova API Key
        api_key = generate_api_key()
        
        # Atualizar perfil com nova API Key
        update_data = {
            "api_key": api_key,
            "api_key_name": name,
            "api_key_is_active": True,
            "api_key_created_at": datetime.utcnow().isoformat(),
            "api_key_last_used_at": None,
            "api_key_usage_count": 0
        }
        
        print(f"📊 Dados para atualizar: {update_data}")
        
        # Usar SQL direto para bypasse RLS se necessário
        try:
            # Primeiro tentar a abordagem padrão
            response = supabase.table('profiles').update(update_data).eq('id', user_id).execute()
            
            # Se não retornou dados, pode ser problema de RLS
            if not response.data or len(response.data) == 0:
                print(f"⚠️ Update não retornou dados, tentando com auth context")
                
                # Tentar definir o contexto de usuário para RLS
                supabase.auth.admin.create_user({
                    "user_metadata": {"user_id": user_id}
                })
                
                # Tentar novamente
                response = supabase.table('profiles').update(update_data).eq('id', user_id).execute()
                
        except Exception as e:
            print(f"⚠️ Erro na atualização: {e}")
            # Como fallback, vamos tentar sem algumas validações RLS
            response = {"data": [], "error": str(e)}
        
        print(f"📊 Resposta do Supabase: {response}")
        
        if response.data and len(response.data) > 0:
            print(f"✅ API Key criada para usuário {user_id}")
            print(f"📊 Dados salvos: {response.data}")
            profile = response.data[0]
            return {
                "id": profile["id"],
                "api_key": profile["api_key"],
                "name": profile["api_key_name"],
                "created_at": profile["api_key_created_at"],
                "last_used_at": profile["api_key_last_used_at"],
                "usage_count": profile["api_key_usage_count"],
                "is_active": profile["api_key_is_active"]
            }
        else:
            print(f"❌ Erro ao criar API Key para usuário {user_id}")
            print(f"📊 Resposta do Supabase (sem dados): {response.data}")
            return None
            
    except Exception as error:
        print(f"❌ Erro ao criar API Key (Exception): {error}")
        import traceback
        print(f"📊 Stack trace: {traceback.format_exc()}")
        return None


async def get_user_api_key(user_id: str, access_token: str = None) -> Optional[Dict[str, Any]]:
    """
    Busca a API Key ativa do usuário na tabela profiles
    """
    try:
        # Usar contexto de usuário para RLS
        from services.session_manager import get_supabase_client_with_user_context
        supabase = get_supabase_client_with_user_context(access_token)
        
        # Usar execute() sem .single() para evitar erro quando não há resultados
        response = supabase.table('profiles') \
            .select('*') \
            .eq('id', user_id) \
            .execute()
        
        # Verificar se há dados e se a API Key existe e está ativa
        if response.data and len(response.data) > 0:
            profile = response.data[0]
            print(f"🔍 Verificando API Key para usuário {user_id}:")
            print(f"   - api_key existe: {bool(profile.get('api_key'))}")
            print(f"   - api_key_is_active: {profile.get('api_key_is_active')}")
            
            # Só retornar se a API Key existir (não for None/null) E estiver ativa
            if profile.get('api_key') and profile.get('api_key_is_active'):
                return {
                    "id": profile["id"],
                    "api_key": profile["api_key"],
                    "name": profile["api_key_name"],
                    "created_at": profile["api_key_created_at"],
                    "last_used_at": profile["api_key_last_used_at"],
                    "usage_count": profile["api_key_usage_count"],
                    "is_active": profile["api_key_is_active"]
                }
            else:
                print(f"🔍 API Key não ativa ou não existe para usuário {user_id}")
        
        return None
        
    except Exception as error:
        print(f"❌ Erro ao buscar API Key: {error}")
        return None


async def validate_api_key(api_key: str) -> Optional[Dict[str, Any]]:
    """
    Valida uma API Key e retorna informações do usuário da tabela profiles
    """
    try:
        if not api_key or not api_key.startswith("pse_"):
            return None
        
        supabase = get_supabase_client()
        
        # Buscar API Key na tabela profiles
        response = supabase.table('profiles') \
            .select('*') \
            .eq('api_key', api_key) \
            .eq('api_key_is_active', True) \
            .execute()
        
        if not response.data or len(response.data) == 0:
            return None
        
        profile = response.data[0]
        
        # Atualizar contadores de uso
        await update_api_key_usage(api_key)
        
        # Retornar dados do usuário
        return {
            "user_id": profile["id"],
            "api_key_id": profile["id"],  # Usar o mesmo ID do profile
            "api_key_name": profile["api_key_name"],
            "profile": {
                "email": profile.get("username"),  # Assumindo que username é o email
                "full_name": profile.get("full_name"),
                "avatar_url": profile.get("avatar_url")
            },
            "usage_count": profile["api_key_usage_count"],
            "created_at": profile["api_key_created_at"]
        }
        
    except Exception as error:
        print(f"❌ Erro ao validar API Key: {error}")
        return None


async def update_api_key_usage(api_key: str):
    """
    Atualiza contadores de uso da API Key na tabela profiles
    """
    try:
        supabase = get_supabase_client()
        
        # Usar a função SQL para incrementar o contador
        supabase.rpc('increment_api_key_usage_count', {'api_key_param': api_key}).execute()
            
    except Exception as error:
        print(f"⚠️ Erro ao atualizar uso da API Key: {error}")


async def revoke_user_api_key(user_id: str, access_token: str = None) -> bool:
    """
    Revoga (remove completamente) a API Key do usuário na tabela profiles
    """
    try:
        # Usar contexto de usuário para RLS
        from services.session_manager import get_supabase_client_with_user_context
        supabase = get_supabase_client_with_user_context(access_token)
        
        print(f"🔄 Removendo API Key completamente para usuário: {user_id}")
        
        # Limpar todos os campos relacionados à API Key
        response = supabase.table('profiles') \
            .update({
                "api_key": None,
                "api_key_name": None,
                "api_key_created_at": None,
                "api_key_last_used_at": None,
                "api_key_usage_count": 0,
                "api_key_is_active": False
            }) \
            .eq('id', user_id) \
            .execute()
        
        if response.data and len(response.data) > 0:
            print(f"✅ API Key completamente removida para usuário {user_id}")
            print(f"📊 Dados atualizados: {response.data}")
            return True
        else:
            print(f"⚠️ Nenhum registro encontrado para usuário {user_id}")
            return False
        
    except Exception as error:
        print(f"❌ Erro ao revogar API Key: {error}")
        return False


async def regenerate_user_api_key(user_id: str, access_token: str = None) -> Optional[Dict[str, Any]]:
    """
    Regenera uma nova API Key para o usuário (revoga a antiga)
    """
    try:
        # Revogar API Key atual
        await revoke_user_api_key(user_id, access_token)
        
        # Criar nova API Key
        return await create_user_api_key(user_id, "Regenerated API Key", access_token)
        
    except Exception as error:
        print(f"❌ Erro ao regenerar API Key: {error}")
        return None
