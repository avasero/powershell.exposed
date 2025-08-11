-- Comando PowerShell que detecta TODOS os indicadores da base de dados
-- Execute este comando para ver todos os 6 indicadores sendo detectados

-- Primeiro, vamos ver quais são os patterns atuais:
SELECT name, patterns FROM powershell_signatures WHERE is_active = true ORDER BY basescore DESC;
