"use client"
import React, { useState } from 'react'
import { loginUser } from '../../../utils/auth'
import { useAuth } from '../contexts/AuthContext'
import FormInput from '../components/FormInput'
import ThemedButton from '../components/ThemedButton'
import { ErrorMessage, SuccessMessage } from '../components/Messages'

export default function loginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const { login } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSuccess(false)
        setLoading(true)
        try {
            const data = await loginUser(email, password)
            if (data && data.user) {
                login(data.user)
                setSuccess(true)
            }
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: 'var(--background)'}}>
            <form onSubmit={handleSubmit} className="p-8 rounded-lg shadow-lg w-full max-w-md space-y-6 border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
                <h2 className="text-2xl font-bold text-center mb-6 font-mono" style={{color: 'var(--accent)'}}>Entrar</h2>
                
                <FormInput
                    type="email"
                    id="email"
                    name="email"
                    label="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
                
                <FormInput
                    type="password"
                    id="password"
                    name="password"
                    label="Senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                
                <ErrorMessage message={error} className="text-center" />
                <SuccessMessage message={success ? "Login realizado com sucesso!" : ""} className="text-center" />
                
                <ThemedButton 
                    type="submit" 
                    loading={loading}
                    className="w-full"
                >
                    Entrar
                </ThemedButton>
                
                <div className="text-center mt-2">
                    <a href="/register" className="font-mono hover:underline" style={{color: 'var(--accent)'}}>Não tem conta? Registre-se</a>
                </div>
            </form>
        </div>
    )
}