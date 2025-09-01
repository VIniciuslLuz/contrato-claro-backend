import fs from 'fs';
import path from 'path';

console.log('🚀 Configuração Rápida do Firebase - Contrato Claro\n');

console.log('📋 Passos para configurar:');
console.log('');
console.log('1️⃣ Acesse: https://console.firebase.google.com/');
console.log('2️⃣ Selecione o projeto: contratoclar0');
console.log('3️⃣ No menu lateral, clique em "Firestore Database"');
console.log('4️⃣ Clique em "Criar banco de dados"');
console.log('5️⃣ Escolha "Modo de teste"');
console.log('6️⃣ Escolha localização: us-central1 (recomendado)');
console.log('');
console.log('🔑 Para gerar credenciais:');
console.log('1️⃣ Vá em "Configurações" (ícone de engrenagem)');
console.log('2️⃣ Clique em "Contas de serviço"');
console.log('3️⃣ Na seção "Firebase Admin SDK", clique em "Gerar nova chave privada"');
console.log('4️⃣ Clique em "Gerar chave"');
console.log('5️⃣ Baixe o arquivo JSON');
console.log('');
console.log('📁 Para configurar o backend:');
console.log('1️⃣ Substitua o conteúdo do arquivo firebase-config.json');
console.log('2️⃣ Execute: npm run test-db');
console.log('3️⃣ Se tudo estiver OK, execute: npm start');
console.log('');

// Verifica se o arquivo de configuração existe
const configPath = path.join(process.cwd(), 'firebase-config.json');
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.project_id === 'contratoclar0') {
      console.log('✅ Arquivo firebase-config.json encontrado e configurado para o projeto correto!');
      console.log('🎯 Project ID:', config.project_id);
    } else {
      console.log('⚠️ Arquivo encontrado mas com project_id diferente:', config.project_id);
      console.log('📝 Atualize o arquivo com as credenciais corretas do projeto contratoclar0');
    }
  } catch (error) {
    console.log('❌ Arquivo encontrado mas com formato inválido');
  }
} else {
  console.log('❌ Arquivo firebase-config.json não encontrado');
  console.log('📝 Crie o arquivo com as credenciais do Firebase');
}

console.log('');
console.log('🔒 IMPORTANTE: Nunca compartilhe suas credenciais do Firebase!');
console.log('📚 Para mais detalhes, consulte o README-CONFIGURACAO.md');
