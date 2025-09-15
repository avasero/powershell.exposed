"""
Módulo de rate limiting e captcha
"""
import time
import secrets
from collections import defaultdict
from config.settings import (
    RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW, CAPTCHA_REQUIRED_AFTER,
    GLOBAL_RATE_LIMIT_REQUESTS, GLOBAL_RATE_LIMIT_WINDOW, CAPTCHA_EXPIRY_TIME
)

# Armazenamento em memória para rate limiting (em produção, use Redis)
request_counts = defaultdict(list)  # session_id -> [timestamps]
global_request_timestamps = []  # Lista global de timestamps de todas as requisições
captcha_tokens = {}  # token -> {session_id, expires_at, solved}
captcha_solutions = {}  # token -> solution


def cleanup_expired_data():
    """Remove expired rate limiting and captcha data"""
    current_time = time.time()
    
    # Limpar contadores de requisições expirados
    for session_id in list(request_counts.keys()):
        request_counts[session_id] = [req_time for req_time in request_counts[session_id] 
                                     if current_time - req_time < RATE_LIMIT_WINDOW]
        if not request_counts[session_id]:
            del request_counts[session_id]
    
    # Limpar timestamps globais expirados
    global global_request_timestamps
    global_request_timestamps = [req_time for req_time in global_request_timestamps 
                                if current_time - req_time < GLOBAL_RATE_LIMIT_WINDOW]
    
    # Limpar tokens de captcha expirados
    expired_tokens = [token for token, data in captcha_tokens.items() 
                     if current_time > data['expires_at']]
    for token in expired_tokens:
        del captcha_tokens[token]
        if token in captcha_solutions:
            del captcha_solutions[token]


def check_global_rate_limit() -> dict:
    """Checks if the global rate limit has been exceeded"""
    current_time = time.time()
    
    # Limpar dados expirados
    cleanup_expired_data()
    
    # Contar requisições globais na janela atual
    global_request_count = len(global_request_timestamps)
    
    # Calcular quando o rate limit global vai resetar
    reset_time = None
    seconds_until_reset = None
    
    if global_request_timestamps and global_request_count >= GLOBAL_RATE_LIMIT_REQUESTS:
        oldest_request = min(global_request_timestamps)
        reset_time = oldest_request + GLOBAL_RATE_LIMIT_WINDOW
        seconds_until_reset = max(0, int(reset_time - current_time))
        print(f"🌍 Rate limit global atingido: {global_request_count}/{GLOBAL_RATE_LIMIT_REQUESTS}")
        print(f"🌍 Reset em: {seconds_until_reset} segundos")
    
    return {
        "within_limit": global_request_count < GLOBAL_RATE_LIMIT_REQUESTS,
        "current_count": global_request_count,
        "limit": GLOBAL_RATE_LIMIT_REQUESTS,
        "window_seconds": GLOBAL_RATE_LIMIT_WINDOW,
        "reset_time": reset_time,
        "seconds_until_reset": seconds_until_reset
    }


def add_global_request():
    """Adds a new request to the global counter"""
    current_time = time.time()
    global_request_timestamps.append(current_time)
    print(f"🌍 Requisição global adicionada. Total: {len(global_request_timestamps)}/{GLOBAL_RATE_LIMIT_REQUESTS}")


def check_rate_limit(session_id: str) -> dict:
    """Checks if the session is within the rate limit"""
    current_time = time.time()
    
    # Limpar dados expirados
    cleanup_expired_data()
    
    # Se não há session_id, não aplicar rate limiting
    if not session_id:
        print("⚠️ Session ID não fornecido - sem rate limiting")
        return {
            "within_limit": True,
            "current_count": 0,
            "limit": RATE_LIMIT_REQUESTS,
            "window_seconds": RATE_LIMIT_WINDOW,
            "requires_captcha": False,
            "reset_time": None,
            "seconds_until_reset": None
        }
    
    # Contar requisições atuais (sem adicionar nova ainda)
    current_requests = [req_time for req_time in request_counts[session_id] 
                       if current_time - req_time < RATE_LIMIT_WINDOW]
    
    request_count = len(current_requests)
    
    # Calcular quando o rate limit vai resetar (baseado na requisição mais antiga)
    reset_time = None
    seconds_until_reset = None
    
    # Calcular reset apenas se atingiu o limite básico (5) sem captcha
    if current_requests and request_count >= RATE_LIMIT_REQUESTS:
        oldest_request = min(current_requests)
        reset_time = oldest_request + RATE_LIMIT_WINDOW
        seconds_until_reset = max(0, int(reset_time - current_time))
        print(f"🕐 Calculando timer para sessão {session_id}: oldest_request={oldest_request}, current_time={current_time}")
        print(f"🕐 Reset em: {seconds_until_reset} segundos")
    
    return {
        "within_limit": request_count < RATE_LIMIT_REQUESTS,
        "current_count": request_count,
        "limit": RATE_LIMIT_REQUESTS,  # 5 análises
        "window_seconds": RATE_LIMIT_WINDOW,  # 60 segundos
        "requires_captcha": request_count >= CAPTCHA_REQUIRED_AFTER - 1,  # Captcha a partir da 6ª (count >= 5)
        "reset_time": reset_time,
        "seconds_until_reset": seconds_until_reset
    }


def add_request_to_rate_limit(session_id: str):
    """Adds a new request to the counter"""
    if not session_id:
        print("⚠️ Session ID não fornecido - não adicionando ao rate limit")
        return
    
    current_time = time.time()
    request_counts[session_id].append(current_time)
    print(f"📊 Requisição adicionada para sessão {session_id}. Total: {len(request_counts[session_id])}")


def reset_rate_limit(session_id: str):
    """Resets the rate limit counter for a session"""
    if session_id and session_id in request_counts:
        del request_counts[session_id]
        print(f"🔄 Rate limit resetado para sessão: {session_id}")
    elif not session_id:
        print("⚠️ Session ID não fornecido para reset do rate limit")


def generate_captcha() -> dict:
    """Generates a new simple mathematical captcha challenge"""
    a = secrets.randbelow(10) + 1
    b = secrets.randbelow(10) + 1
    operation = secrets.choice(['+', '-', '*'])
    
    if operation == '+':
        solution = a + b
        question = f"What is {a} + {b}?"
    elif operation == '-':
        # Ensure positive result
        if a < b:
            a, b = b, a
        solution = a - b
        question = f"What is {a} - {b}?"
    else:  # *
        solution = a * b
        question = f"What is {a} × {b}?"
    
    token = secrets.token_urlsafe(16)
    
    return {
        "token": token,
        "question": question,
        "solution": solution
    }


def verify_captcha(token: str, user_answer: str) -> bool:
    """Verifies if the captcha answer is correct"""
    if token not in captcha_solutions:
        return False
    
    try:
        user_answer_int = int(user_answer.strip())
        correct_answer = captcha_solutions[token]
        return user_answer_int == correct_answer
    except (ValueError, TypeError):
        return False


def store_captcha_solution(token: str, solution: int, session_id: str):
    """Stores captcha solution and token data"""
    captcha_solutions[token] = solution
    captcha_tokens[token] = {
        "session_id": session_id,
        "expires_at": time.time() + CAPTCHA_EXPIRY_TIME,
        "solved": False
    }


def mark_captcha_solved(token: str):
    """Marks a captcha token as solved"""
    if token in captcha_tokens:
        captcha_tokens[token]["solved"] = True
