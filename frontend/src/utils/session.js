// Utilitário para gerenciar sessões anônimas

const SESSION_KEY = 'anonymous_session_id';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas em millisegundos

// Função para obter ou criar uma sessão anônima
export const getOrCreateSession = () => {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const sessionData = localStorage.getItem(SESSION_KEY);

    if (sessionData) {
      const session = JSON.parse(sessionData);
      const now = Date.now();

      // Verificar se a sessão ainda é válida
      if (session.created_at && (now - session.created_at) < SESSION_DURATION) {
        return session.id;
      }
    }

    // Se não existir ou expirou, criar nova
    const newSessionId = crypto.randomUUID();
    const newSession = {
      id: newSessionId,
      created_at: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    return newSessionId;

  } catch (error) {
    console.error('❌ Erro ao gerenciar sessão:', error);
    // Fallback se falhar (não salva mas retorna um ID temporário)
    return crypto.randomUUID();
  }
};

// Função para obter o ID da sessão atual
export const getCurrentSessionId = () => {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      const now = Date.now();

      if (session.created_at && (now - session.created_at) < SESSION_DURATION) {
        return session.id;
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao obter sessão atual:', error);
    return null;
  }
};

// Função para limpar a sessão
export const clearSession = () => {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(SESSION_KEY);

  } catch (error) {
    console.error('❌ Erro ao limpar sessão:', error);
  }
};

// Alias para clearSession (compatibilidade)
export const clearSessionFromStorage = clearSession;

// Função para renovar a sessão (estender duração)
export const renewSession = () => {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.created_at = Date.now();

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      return session.id;
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao renovar sessão:', error);
    return null;
  }
};

// Função para salvar sessão retornada pelo backend
export const saveSessionFromBackend = (sessionId) => {
  try {
    if (typeof localStorage === 'undefined') {

      return false;
    }

    if (!sessionId) {

      return false;
    }

    const session = {
      id: sessionId,
      created_at: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));


    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar sessão do backend:', error);
    return false;
  }
};

// Função para obter informações da sessão
export const getSessionInfo = () => {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      const now = Date.now();
      const age = now - session.created_at;
      const remaining = Math.max(0, SESSION_DURATION - age);

      return {
        id: session.id,
        created_at: session.created_at,
        age_hours: Math.floor(age / (60 * 60 * 1000)),
        remaining_hours: Math.floor(remaining / (60 * 60 * 1000)),
        is_valid: age < SESSION_DURATION
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao obter informações da sessão:', error);
    return null;
  }
};
