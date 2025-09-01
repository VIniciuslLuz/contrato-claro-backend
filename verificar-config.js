import fs from 'fs';
import path from 'path';

console.log('🔍 Verificando Configuração do Firebase...\n');

const configPath = path.join(process.cwd(), 'firebase-config.json');

if (!fs.existsSync(configPath)) {
  console.log('❌ ARQUIVO NÃO ENCONTRADO!');
  console.log('📁 Crie o arquivo firebase-config.json na pasta backend/');
  process.exit(1);
}

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  console.log('📋 Verificando campos obrigatórios:');
  
  // Verifica campos obrigatórios
  const camposObrigatorios = [
    'type', 'project_id', 'private_key_id', 'private_key', 
    'client_email', 'client_id'
  ];
  
  let todosCamposOk = true;
  
  camposObrigatorios.forEach(campo => {
    if (config[campo]) {
      if (campo === 'project_id' && config[campo] === 'contratoclar0') {
        console.log(`✅ ${campo}: ${config[campo]} (CORRETO!)`);
      } else if (campo === 'private_key' && config[campo].includes('-----BEGIN PRIVATE KEY-----')) {
        console.log(`✅ ${campo}: Formato correto`);
      } else if (campo === 'private_key_id' && config[campo] !== 'precisa_gerar_no_console') {
        console.log(`✅ ${campo}: ${config[campo]}`);
      } else if (campo === 'client_id' && config[campo] !== 'precisa_gerar_no_console') {
        console.log(`✅ ${campo}: ${config[campo]}`);
      } else if (campo === 'client_email' && config[campo].includes('@contratoclar0.iam.gserviceaccount.com')) {
        console.log(`✅ ${campo}: ${config[campo]}`);
      } else if (campo === 'type' && config[campo] === 'service_account') {
        console.log(`✅ ${campo}: ${config[campo]}`);
      } else {
        console.log(`⚠️ ${campo}: ${config[campo]} (PODE ESTAR INCORRETO)`);
        todosCamposOk = false;
      }
    } else {
      console.log(`❌ ${campo}: CAMPO AUSENTE`);
      todosCamposOk = false;
    }
  });
  
  console.log('\n🔑 Verificando credenciais específicas:');
  
  // Verifica se ainda tem valores de exemplo
  if (config.private_key_id === 'precisa_gerar_no_console') {
    console.log('❌ private_key_id: Ainda tem valor de exemplo!');
    console.log('📝 Gere as credenciais reais no Firebase Console');
    todosCamposOk = false;
  }
  
  if (config.private_key === '-----BEGIN PRIVATE KEY-----\nprecisa_gerar_no_console\n-----END PRIVATE KEY-----\n') {
    console.log('❌ private_key: Ainda tem valor de exemplo!');
    console.log('📝 Gere as credenciais reais no Firebase Console');
    todosCamposOk = false;
  }
  
  if (config.client_id === 'precisa_gerar_no_console') {
    console.log('❌ client_id: Ainda tem valor de exemplo!');
    console.log('📝 Gere as credenciais reais no Firebase Console');
    todosCamposOk = false;
  }
  
  console.log('\n📊 RESULTADO DA VERIFICAÇÃO:');
  
  if (todosCamposOk) {
    console.log('🎉 CONFIGURAÇÃO APARENTEMENTE CORRETA!');
    console.log('🚀 Agora execute: npm run test-db');
  } else {
    console.log('❌ CONFIGURAÇÃO INCOMPLETA OU INCORRETA!');
    console.log('\n🔧 PARA RESOLVER:');
    console.log('1. Acesse: https://console.firebase.google.com/');
    console.log('2. Selecione o projeto: contratoclar0');
    console.log('3. Vá em Configurações > Contas de serviço');
    console.log('4. Clique em "Gerar nova chave privada"');
    console.log('5. Baixe o arquivo JSON');
    console.log('6. Substitua TODO o conteúdo do firebase-config.json');
  }
  
} catch (error) {
  console.log('❌ ERRO AO LER ARQUIVO:', error.message);
  console.log('📝 Verifique se o arquivo tem formato JSON válido');
}
