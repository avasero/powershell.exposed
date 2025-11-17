
from datetime import datetime, timedelta
from supabase import Client
from utils.geolocation import format_location_string


async def get_or_create_session(
    supabase: Client, 
    user_id: str = None, 
    ip_address: str = None, 
    user_agent: str = None, 
    country: str = None
) -> str:
   
    try:
        if not ip_address:
            return None
        
      
        location = country
        
      
        yesterday = datetime.utcnow() - timedelta(hours=24)
        
       
        if user_id:
            existing_session = supabase.table('sessions').select('id').eq('user_id', user_id).gte('created_at', yesterday.isoformat()).limit(1).execute()
        else:
            existing_session = supabase.table('sessions').select('id').eq('ip', ip_address).is_('user_id', 'null').gte('created_at', yesterday.isoformat()).limit(1).execute()
        
        if existing_session.data:
            session_id = existing_session.data[0]['id']
            return session_id
        
      
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
        return None


def get_supabase_client() -> Client:
    from supabase import create_client
    from config.settings import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados")
    
    
    
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return client


def get_supabase_client_with_user_context(access_token: str = None) -> Client:
    from supabase import create_client
    from config.settings import SUPABASE_URL, SUPABASE_ANON_KEY
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise ValueError("SUPABASE_URL e SUPABASE_ANON_KEY devem estar configurados")
    
   
    if access_token:
        print(f"🔧 Access token: {access_token[:20]}...")
    
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    if access_token:
        client.postgrest.auth(access_token)
        
    return client
