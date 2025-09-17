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


async def create_user_api_key(user_id: str, name: str = "Default API Key") -> Optional[Dict[str, Any]]:
    """
    Cria uma nova API Key para o usuário na tabela profiles
    """
    try:
        supabase = get_supabase_client()
        
        # Verificar se usuário já tem uma API Key ativa
        existing_response = supabase.table('profiles') \
            .select('*') \
            .eq('id', user_id) \
            .eq('api_key_is_active', True) \
            .execute()
        
        if existing_response.data and existing_response.data[0].get('api_key'):
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
        
        response = supabase.table('profiles').update(update_data).eq('id', user_id).execute()
        
        if response.data:
            print(f"✅ API Key criada para usuário {user_id}")
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
            return None
            
    except Exception as error:
        print(f"❌ Erro ao criar API Key: {error}")
        return None


async def get_user_api_key(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Busca a API Key ativa do usuário na tabela profiles
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('profiles') \
            .select('*') \
            .eq('id', user_id) \
            .single() \
            .execute()
        
        if response.data and response.data.get('api_key') and response.data.get('api_key_is_active'):
            profile = response.data
            return {
                "id": profile["id"],
                "api_key": profile["api_key"],
                "name": profile["api_key_name"],
                "created_at": profile["api_key_created_at"],
                "last_used_at": profile["api_key_last_used_at"],
                "usage_count": profile["api_key_usage_count"],
                "is_active": profile["api_key_is_active"]
            }
        
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
            .single() \
            .execute()
        
        if not response.data:
            return None
        
        profile = response.data
        
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


async def revoke_user_api_key(user_id: str) -> bool:
    """
    Revoga (desativa) a API Key do usuário na tabela profiles
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('profiles') \
            .update({"api_key_is_active": False}) \
            .eq('id', user_id) \
            .execute()
        
        return len(response.data) > 0
        
    except Exception as error:
        print(f"❌ Erro ao revogar API Key: {error}")
        return False


async def regenerate_user_api_key(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Regenera uma nova API Key para o usuário (revoga a antiga)
    """
    try:
        # Revogar API Key atual
        await revoke_user_api_key(user_id)
        
        # Criar nova API Key
        return await create_user_api_key(user_id, "Regenerated API Key")
        
    except Exception as error:
        print(f"❌ Erro ao regenerar API Key: {error}")
        return None
