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
            return None
        
        # Criar string de localização
        location = format_location_string(country, region, city)
        
        # Tentar encontrar sessão existente (últimas 24 horas)
        yesterday = datetime.utcnow() - timedelta(hours=24)
        
        # Se user_id é fornecido, procurar sessão do usuário específico
        # Se não, procurar sessão anônima (user_id = null) para o IP
        if user_id:
            existing_session = supabase.table('sessions').select('id').eq('user_id', user_id).gte('created_at', yesterday.isoformat()).limit(1).execute()
        else:
            existing_session = supabase.table('sessions').select('id').eq('ip', ip_address).is_('user_id', 'null').gte('created_at', yesterday.isoformat()).limit(1).execute()
        
        if existing_session.data:
            session_id = existing_session.data[0]['id']
            return session_id
        
        # Criar nova sessão
        session_data = {
            "user_id": user_id,
            "ip": ip_address,
            "browser": user_agent,
            "location": location
        }
        
        new_session = supabase.table('sessions').insert(session_data).execute()
        
        if new_session.data:
            session_id = new_session.data[0]['id']
            return session_id
        else:
            return None
            
    except Exception as error:
        print(f"❌ Erro ao gerenciar sessão: {error}")
        return None


def get_supabase_client() -> Client:
    """Cria e retorna um cliente Supabase com Service Role (deveria bypassar RLS)"""
    from supabase import create_client
    from config.settings import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados")
    
    
    
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return client


def get_supabase_client_with_user_context(access_token: str = None) -> Client:
    """Cria cliente Supabase com contexto de usuário para RLS"""
    from supabase import create_client
    from config.settings import SUPABASE_URL, SUPABASE_ANON_KEY
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise ValueError("SUPABASE_URL e SUPABASE_ANON_KEY devem estar configurados")
    
    print(f"🔧 Criando cliente com contexto de usuário")
    print(f"🔧 Access token presente: {bool(access_token)}")
    if access_token:
        print(f"🔧 Access token: {access_token[:20]}...")
    
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    if access_token:
        # Definir o token JWT no cabeçalho de autorização
        client.postgrest.auth(access_token)
        
    return client
