'use client';

import { useState, useEffect } from 'react';

export default function CaptchaModal({ 
  isOpen, 
  onClose, 
  onSolved, 
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000' 
}) {
  const [captchaData, setCaptchaData] = useState(null);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Gerar captcha quando modal abre
  useEffect(() => {
    if (isOpen && !captchaData) {
      generateCaptcha();
    }
  }, [isOpen, captchaData, generateCaptcha]);

  const generateCaptcha = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${apiUrl}/generate-captcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setCaptchaData(data.captcha);
      } else {
        setError(data.error || 'Erro ao gerar captcha');
      }
    } catch (err) {
      setError('Erro de conexão ao gerar captcha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!captchaData || !answer.trim()) {
      setError('Por favor, insira a resposta');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/verify-captcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: captchaData.token,
          answer: answer.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Captcha resolvido com sucesso
        onSolved({
          token: captchaData.token,
          answer: answer.trim()
        });
        handleClose();
      } else {
        setError(data.error || 'Resposta incorreta');
        // Gerar novo captcha após erro
        setTimeout(() => {
          setCaptchaData(null);
          setAnswer('');
          generateCaptcha();
        }, 1500);
      }
    } catch (err) {
      setError('Erro de conexão ao verificar captcha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCaptchaData(null);
    setAnswer('');
    setError('');
    onClose();
  };

  const handleRefresh = () => {
    setCaptchaData(null);
    setAnswer('');
    setError('');
    generateCaptcha();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Verificação de Segurança
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Para continuar usando o serviço, resolva o captcha abaixo:
          </p>

          {isLoading && !captchaData && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {captchaData && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-mono text-gray-900 dark:text-white">
                    {captchaData.question}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Gerar novo captcha"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="number"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Digite a resposta"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={isLoading || !answer.trim()}
                >
                  {isLoading ? 'Verificando...' : 'Verificar'}
                </button>
              </div>
            </form>
          )}

          {error && !captchaData && (
            <div className="text-center">
              <div className="text-red-600 dark:text-red-400 text-sm mb-4">
                {error}
              </div>
              <button
                onClick={generateCaptcha}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
