// Página de login removida - autenticação foi removida do projeto
export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
        Authentication Removed
      </h1>
      <p className="text-center font-mono" style={{color: 'var(--foreground)'}}>
        This application no longer requires authentication.
      </p>
    </div>
  );
}
