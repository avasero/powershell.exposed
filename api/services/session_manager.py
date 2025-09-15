"""
Módulo de gerenciamento de sessões
"""
from datetime import datetime, timedelta
from supabase import Client
from utils.geolocation import format_location_string


async def get_or_create_session(
    supabase: Client, 
    user_id: str = None, 
    ip_address: str = None, 
    user_agent: str = None, 
    country: str = None, 
    city: str = None, 
    region: str = None
) -> str:
    """
    Cria ou obtém uma sessão existente baseada no IP e user agent
    Retorna o ID da sessão
    """
    try:
        if not ip_address:
            print("⚠️ IP não fornecido, não é possível criar/obter sessão")
            return None
        
        # Criar string de localização
        location = format_location_string(country, region, city)
        
        # Tentar encontrar sessão existente (últimas 24 horas)
        yesterday = datetime.utcnow() - timedelta(hours=24)
        
        # Se user_id é fornecido, procurar sessão do usuário específico
        # Se não, procurar sessão anônima (user_id = null) para o IP
        if user_id:
            print(f"🔍 Procurando sessão existente para usuário: {user_id}")
            existing_session = supabase.table('sessions').select('id').eq('user_id', user_id).gte('created_at', yesterday.isoformat()).limit(1).execute()
        else:
            print(f"🔍 Procurando sessão anônima existente para IP: {ip_address}")
            existing_session = supabase.table('sessions').select('id').eq('ip', ip_address).is_('user_id', 'null').gte('created_at', yesterday.isoformat()).limit(1).execute()
        
        if existing_session.data:
            session_id = existing_session.data[0]['id']
            print(f"✅ Sessão existente encontrada: {session_id}")
            return session_id
        
        # Criar nova sessão
        session_data = {
            "user_id": user_id,
            "ip": ip_address,
            "browser": user_agent,
            "location": location
        }
        
        print(f"🔍 Criando nova sessão com dados: {session_data}")
        new_session = supabase.table('sessions').insert(session_data).execute()
        
        if new_session.data:
            session_id = new_session.data[0]['id']
            print(f"✅ Nova sessão criada: {session_id} para {'usuário ' + user_id if user_id else 'anônimo'}")
            return session_id
        else:
            print("❌ Erro ao criar nova sessão")
            print(f"❌ Response: {new_session}")
            return None
            
    except Exception as error:
        print(f"❌ Erro ao gerenciar sessão: {error}")
        return None


def get_supabase_client() -> Client:
    """Cria e retorna um cliente Supabase"""
    from supabase import create_client
    from config.settings import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados")
    
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
