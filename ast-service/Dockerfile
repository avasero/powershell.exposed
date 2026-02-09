# PowerShell 7 on Ubuntu (Linux) - compatible with Render.com, Railway, etc.
FROM mcr.microsoft.com/powershell:lts-ubuntu-22.04

# Set working directory
WORKDIR /app

# Install Pode module for HTTP server functionality
RUN pwsh -Command "Set-PSRepository -Name PSGallery -InstallationPolicy Trusted; Install-Module -Name Pode -Force -Scope AllUsers"

# Create scripts directory
RUN mkdir -p /app/scripts

# Copy PowerShell scripts
COPY scripts/ /app/scripts/
COPY server.ps1 /app/server.ps1

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD pwsh -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:8081/health' -Method Get -TimeoutSec 5; if ($r.status -eq 'healthy') { exit 0 } else { exit 1 } } catch { exit 1 }"

# Run the PowerShell HTTP server
CMD ["pwsh", "-NoProfile", "-File", "/app/server.ps1"]
