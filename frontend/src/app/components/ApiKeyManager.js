"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage, InfoMessage } from './Messages';
import ThemedButton from './ThemedButton';
import LoadingSpinner from './LoadingSpinner';
import ApiKeyRevealModal from './ApiKeyRevealModal';

export default function ApiKeyManager() {
  const { user, isAuthenticated } = useAuth();
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    if (isAuthenticated()) {
      loadApiKey();
    }
  }, [user]);

  const loadApiKey = async () => {
    try {
      setLoading(true);
      setError('');

      const { makeAuthenticatedJSONRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedJSONRequest('/user/api-key');

      if (response.success) {
        setApiKey(response.api_key);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { makeAuthenticatedJSONRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedJSONRequest('/user/api-key', {
        method: 'POST'
      });

      if (response.success) {
       
        setNewApiKey(response.api_key.api_key);
        setShowRevealModal(true);
        setApiKey(response.api_key);
        setSuccess(response.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!confirm('Are you sure you want to regenerate your API Key? Your current key will stop working immediately.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { makeAuthenticatedJSONRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedJSONRequest('/user/api-key', {
        method: 'PUT'
      });

      if (response.success) {
       
        setNewApiKey(response.api_key.api_key);
        setShowRevealModal(true);
        setApiKey(response.api_key);
        setSuccess(response.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async () => {
    if (!confirm('Are you sure you want to revoke your API Key? You will need to create a new one to use the API.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { makeAuthenticatedJSONRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedJSONRequest('/user/api-key', {
        method: 'DELETE'
      });

      if (response.success) {
        setApiKey(null);
        setSuccess(response.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US');
  };

  const maskApiKey = (key) => {
    if (!key) return '';
  
    if (key.length <= 12) return key;
    const start = key.substring(0, 8);
    const end = key.substring(key.length - 4);
    const middle = '*'.repeat(Math.max(8, key.length - 12));
    return `${start}${middle}${end}`;
  };

  const handleCloseModal = () => {
    setShowRevealModal(false);
    setNewApiKey('');
  };

  const handleModalCopy = () => {
  
    console.log('API Key copied from modal');
  };

  if (!isAuthenticated()) {
    return (
      <div className="p-4 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
        <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
          Please log in to manage your API Key.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-mono font-bold" style={{color: 'var(--accent)'}}>
          🔑 API Key Management
        </h2>
        <p className="mt-2 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
          Use your API Key to access the PowerShell.exposed API from external tools like Postman
        </p>
      </div>

      <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
        {loading && <LoadingSpinner />}
        
        {error && <ErrorMessage message={error} />}
        {success && <InfoMessage message={success} />}

        {!loading && (
          <>
            {apiKey ? (
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-sm font-medium mb-2" style={{color: 'var(--foreground)'}}>
                    Your API Key:
                  </label>
                  <div className="flex items-center space-x-2">
                    <code 
                      className="flex-1 p-3 rounded border font-mono text-sm break-all"
                      style={{
                        backgroundColor: 'var(--muted)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--foreground)'
                      }}
                    >
                      {maskApiKey(apiKey.api_key)}
                    </code>
                  </div>
                  <p className="text-xs font-mono mt-1" style={{color: 'var(--muted-foreground)'}}>
                    💡 The complete key is only shown once during creation for security
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <span style={{color: 'var(--muted-foreground)'}}>Created:</span>
                    <div style={{color: 'var(--foreground)'}}>{formatDate(apiKey.created_at)}</div>
                  </div>
                  <div>
                    <span style={{color: 'var(--muted-foreground)'}}>Last Used:</span>
                    <div style={{color: 'var(--foreground)'}}>{formatDate(apiKey.last_used_at)}</div>
                  </div>
                  <div>
                    <span style={{color: 'var(--muted-foreground)'}}>Usage Count:</span>
                    <div style={{color: 'var(--foreground)'}}>{apiKey.usage_count || 0} requests</div>
                  </div>
                  <div>
                    <span style={{color: 'var(--muted-foreground)'}}>Status:</span>
                    <div style={{color: apiKey.is_active ? 'var(--success)' : 'var(--destructive)'}}>
                      {apiKey.is_active ? '✅ Active' : '❌ Inactive'}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <ThemedButton
                    onClick={regenerateApiKey}
                    variant="outline"
                    disabled={loading}
                  >
                    🔄 Regenerate
                  </ThemedButton>
                  <ThemedButton
                    onClick={revokeApiKey}
                    variant="outline"
                    disabled={loading}
                    style={{
                      borderColor: 'var(--destructive)',
                      color: 'var(--destructive)'
                    }}
                  >
                    🗑️ Revoke
                  </ThemedButton>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">🔑</div>
                <h3 className="text-lg font-mono font-bold" style={{color: 'var(--accent)'}}>
                  No API Key Found
                </h3>
                <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                  Create an API Key to access the PowerShell.exposed API from external tools
                </p>
                <ThemedButton
                  onClick={createApiKey}
                  disabled={loading}
                  className="w-full"
                >
                  🔑 Create API Key
                </ThemedButton>
              </div>
            )}
          </>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="p-4 rounded-lg border" style={{backgroundColor: 'var(--muted)', borderColor: 'var(--border-color)'}}>
        <h3 className="font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
          📖 How to Use Your API Key
        </h3>
        <div className="space-y-2 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
          <p><strong>1. Copy your API Key from the modal when creating</strong></p>
          <p><strong>2. In Postman or any HTTP client:</strong></p>
          <ul className="ml-4 space-y-1">
            <li>• Set Authorization to &quot;Bearer Token&quot;</li>
            <li>• Paste your API Key (starts with pse_)</li>
          </ul>
          <p><strong>3. Available endpoints:</strong></p>
          <ul className="ml-4 space-y-1">
            <li>• <code>GET /user/command-evaluations</code> - Get your analyses</li>
            <li>• <code>POST /analyze-pcre2</code> - Analyze PowerShell commands</li>
          </ul>
        </div>
      </div>

      {/* Modal to reveal complete API Key */}
      {showRevealModal && (
        <ApiKeyRevealModal
          apiKey={newApiKey}
          onClose={handleCloseModal}
          onCopy={handleModalCopy}
        />
      )}
    </div>
  );
}
