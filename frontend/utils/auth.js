import axios from "axios"
const API_URL = "http://localhost:8000/api/users/"  // Mudado de 127.0.0.1 para localhost

// Configurar axios para incluir cookies por padrão
axios.defaults.withCredentials = true;

export const registerUser = async (email, username, password) => {
    try {
        const response = await axios.post(`${API_URL}register/`, {
            email,
            username,
            password
        })
        return response.data
    }
    catch (e) {
        if (e.response && e.response.data) {
            throw new Error(JSON.stringify(e.response.data));
        } else {
            throw new Error("Registration failed");
        }
    }
}
export const loginUser = async (email, password) => {
    try {
        const response = await axios.post(`${API_URL}login/`, { email, password });
        return response.data;
    } catch (e) {
        if (e.response && e.response.data) {
            throw new Error(JSON.stringify(e.response.data));
        } else {
            throw new Error("Login failed");
        }
    }
}
export const logoutUser = async () => {
    try {
        const response = await axios.post(`${API_URL}logout/`);
        return response.data;
    } catch (e) {
        if (e.response && e.response.data) {
            throw new Error(JSON.stringify(e.response.data));
        } else {
            throw new Error("Logout failed");
        }
    }
}

// Função para salvar pesquisa de PowerShell
export const savePowerShellSearch = async (searchData) => {
    try {
        console.log('Enviando dados para salvar:', searchData);
        const response = await axios.post(`${API_URL}powershell-search/`, searchData);
        return response.data;
    } catch (e) {
        console.error('Erro detalhado:', e.response);
        if (e.response && e.response.data) {
            throw new Error(JSON.stringify(e.response.data));
        } else {
            throw new Error("Failed to save PowerShell search");
        }
    }
}