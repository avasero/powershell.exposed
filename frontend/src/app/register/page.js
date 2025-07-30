"use client"
import React from 'react'
import { useState } from 'react'
import { registerUser } from '../../../utils/auth'
import { useAuth } from '../contexts/AuthContext'
import FormInput from '../components/FormInput'
import ThemedButton from '../components/ThemedButton'
import { ErrorMessage, SuccessMessage } from '../components/Messages'

export default function registerPage() {
    const [username, setUserName] = useState("")
    const [password, setPassword] = useState("")
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [redirecting, setRedirecting] = useState(false)
    const { login } = useAuth()
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if(username === "" || password === "" || email === "") {
            setError("Todos os campos são obrigatórios");
            return;
        }
        
        // Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Por favor, insira um email válido");
            return;
        }
        
        // Validação de senha
        if (password.length < 8) {
            setError("A senha deve ter pelo menos 8 caracteres");
            return;
        }
        
        // Validação de username
        if (username.length < 3) {
            setError("O nome de usuário deve ter pelo menos 3 caracteres");
            return;
        }
        
        setLoading(true);
        setError("");
        setSuccess(false);
        
        try {
            const data = await registerUser(email, username, password);
            setSuccess(true);
            
            // Se o usuário foi criado com sucesso e retornou dados do usuário
            if (data && data.user) {
                setRedirecting(true);
                // Aguardar um pouco para mostrar a mensagem de sucesso
                setTimeout(() => {
                    // Fazer login automático após registro
                    login(data.user);
                }, 1500);
            } else {
                setRedirecting(true);
                // Se não retornou dados do usuário, aguardar um pouco antes de redirecionar
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            }
        } catch (e) {
            console.error('Registration error:', e);
            if (e.message.includes('{') && e.message.includes('}')) {
                // Se a mensagem é um JSON, parse e exiba os erros específicos
                try {
                    const errorObj = JSON.parse(e.message);
                    let errorMessage = "Erro ao criar usuário:\n";
                    Object.keys(errorObj).forEach(field => {
                        if (Array.isArray(errorObj[field])) {
                            errorMessage += `${field}: ${errorObj[field].join(', ')}\n`;
                        } else {
                            errorMessage += `${field}: ${errorObj[field]}\n`;
                        }
                    });
                    setError(errorMessage);
                } catch (parseError) {
                    setError("Erro ao criar usuário: " + e.message);
                }
            } else {
                setError("Erro ao criar usuário: " + e.message);
            }
        } finally {
            setLoading(false);
        }
    }
   
    return (
        <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: 'var(--background)'}}>
            <form onSubmit={handleSubmit} className="p-8 rounded-lg shadow-lg w-full max-w-md space-y-6 border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
                <h2 className="text-2xl font-bold text-center mb-6 font-mono" style={{color: 'var(--accent)'}}>Crie sua conta</h2>
                
                <FormInput
                    type="text"
                    id="username"
                    name="username"
                    label="Usuário"
                    value={username}
                    onChange={e => setUserName(e.target.value)}
                    disabled={loading || redirecting}
                    required
                />
                
                <FormInput
                    type="email"
                    id="email"
                    name="email"
                    label="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading || redirecting}
                    required
                />
                
                <FormInput
                    type="password"
                    id="password"
                    name="password"
                    label="Senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading || redirecting}
                    required
                />
                
                <ErrorMessage message={error} className="text-center" />
                <SuccessMessage 
                    message={success ? "Usuário criado com sucesso! Redirecionando..." : ""} 
                    className="text-center" 
                />
                
                <ThemedButton 
                    type="submit" 
                    loading={loading}
                    disabled={loading || redirecting}
                    className="w-full"
                >
                    {redirecting ? "Redirecionando..." : "Criar Conta"}
                </ThemedButton>
                
                <div className="text-center mt-2">
                    {!redirecting && (
                        <a href="/login" className="font-mono hover:underline" style={{color: 'var(--accent)'}}>
                            Já tem conta? Faça login
                        </a>
                    )}
                </div>
            </form>
        </div>
    )
}