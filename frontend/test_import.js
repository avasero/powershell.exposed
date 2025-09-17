// Teste rápido para verificar se o import do api.js funciona
const path = require('path');

console.log('🧪 Testando caminhos de import...');

// Simular estrutura de pastas
const componentPath = 'src/app/components/ApiKeyManager.js';
const apiPath = 'lib/api.js';

console.log(`📁 Componente em: ${componentPath}`);
console.log(`📁 API em: ${apiPath}`);

// Calcular caminho relativo
const relativePath = path.relative(path.dirname(componentPath), apiPath);
console.log(`🔗 Caminho relativo deveria ser: ${relativePath}`);

// Verificar se os arquivos existem
const fs = require('fs');

const apiExists = fs.existsSync(apiPath);
const componentExists = fs.existsSync(componentPath);

console.log(`✅ API existe: ${apiExists}`);
console.log(`✅ Componente existe: ${componentExists}`);

if (apiExists && componentExists) {
    console.log('🎉 Todos os arquivos existem!');
    console.log('💡 Use o caminho: ../../../lib/api');
} else {
    console.log('❌ Alguns arquivos não foram encontrados');
}
