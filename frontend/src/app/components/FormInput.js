"use client";

export default function FormInput({ 
  type = "text",
  label,
  id,
  name,
  value,
  onChange,
  required = false,
  placeholder,
  disabled = false,
  className = ""
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium font-mono" style={{color: 'var(--foreground)'}}>
          {label}
        </label>
      )}
      <input
        type={type}
        id={id}
        name={name}
        required={required}
        className="mt-1 block w-full px-3 py-2 rounded-lg border text-card-foreground shadow-sm cursor-target bg-black/80 border-green-500/30 p-4 hover:border-green-500/50 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer focus:outline-none font-mono"
        style={{
          color: 'var(--foreground)'
        }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
