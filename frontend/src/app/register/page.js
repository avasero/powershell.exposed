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
        
        // Username validation
        if (username.length < 3) {
            setError("Username must be at least 3 characters long");
            return;
        }
        
        setLoading(true);
        setError("");
        setSuccess(false);
        
        try {
            const data = await registerUser(email, username, password);
            setSuccess(true);
            
            // If user was created successfully and returned user data
            if (data && data.user) {
                setRedirecting(true);
                // Wait a bit to show success message
                setTimeout(() => {
                    // Auto login after registration
                    login(data.user);
                }, 1500);
            } else {
                setRedirecting(true);
                // If no user data returned, wait a bit before redirecting
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            }
        } catch (e) {
            console.error('Registration error:', e);
            if (e.message.includes('{') && e.message.includes('}')) {
                // If message is JSON, parse and display specific errors
                try {
                    const errorObj = JSON.parse(e.message);
                    let errorMessage = "Error creating user:\n";
                    Object.keys(errorObj).forEach(field => {
                        if (Array.isArray(errorObj[field])) {
                            errorMessage += `${field}: ${errorObj[field].join(', ')}\n`;
                        } else {
                            errorMessage += `${field}: ${errorObj[field]}\n`;
                        }
                    });
                    setError(errorMessage);
                } catch (parseError) {
                    setError("Error creating user: " + e.message);
                }
            } else {
                setError("Error creating user: " + e.message);
            }
        } finally {
            setLoading(false);
        }
    }
   
    return (
        <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: 'var(--background)'}}>
            <form onSubmit={handleSubmit} className="p-8 rounded-lg shadow-lg w-full max-w-md space-y-6 border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
                <h2 className="text-2xl font-bold text-center mb-6 font-mono" style={{color: 'var(--accent)'}}>Create your account</h2>
                
                <FormInput
                    type="text"
                    id="username"
                    name="username"
                    label="Username"
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
                    label="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading || redirecting}
                    required
                />
                
                <ErrorMessage message={error} className="text-center" />
                <SuccessMessage 
                    message={success ? "User created successfully! Redirecting..." : ""} 
                    className="text-center" 
                />
                
                <ThemedButton 
                    type="submit" 
                    loading={loading}
                    disabled={loading || redirecting}
                    className="w-full"
                >
                    {redirecting ? "Redirecting..." : "Create Account"}
                </ThemedButton>
                
                <div className="text-center mt-2">
                    {!redirecting && (
                        <a href="/login" className="font-mono hover:underline" style={{color: 'var(--accent)'}}>
                            Already have an account? Login
                        </a>
                    )}
                </div>
            </form>
        </div>
    )
}