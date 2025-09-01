import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testando conexão com o banco de dados...\n');

async function testDatabase() {
  try {
    // Tenta carregar configuração
    let firebaseConfig;
    const configPath = path.join(process.cwd(), 'firebase-config.json');
    
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('✅ Arquivo de configuração encontrado');
    } else {
      console.log('❌ Arquivo firebase-config.json não encontrado');
      console.log('📁 Procurando em:', process.cwd());
      return;
    }

    // Inicializa Firebase
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig)
      });
      console.log('✅ Firebase Admin SDK inicializado');
    }

    const firestore = admin.firestore();
    
    // Testa conexão
    console.log('🔍 Testando conexão com Firestore...');
    await firestore.collection('test').doc('test').get();
    console.log('✅ Conexão com Firestore funcionando!');

    // Testa escrita
    console.log('✍️ Testando escrita no banco...');
    const testData = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      teste: 'Conexão funcionando',
      data: new Date().toISOString()
    };
    
    await firestore.collection('testes').doc('conexao').set(testData);
    console.log('✅ Escrita no banco funcionando!');

    // Testa leitura
    console.log('📖 Testando leitura do banco...');
    const doc = await firestore.collection('testes').doc('conexao').get();
    if (doc.exists) {
      console.log('✅ Leitura do banco funcionando!');
      console.log('📄 Dados lidos:', doc.data());
    }

    // Limpa teste
    await firestore.collection('testes').doc('conexao').delete();
    console.log('🧹 Dados de teste removidos');

    console.log('\n🎉 Todos os testes passaram! O banco está funcionando perfeitamente.');
    
  } catch (error) {
    console.error('\n❌ Erro nos testes:', error.message);
    console.log('\n🔧 Verifique:');
    console.log('1. Se o arquivo firebase-config.json existe e está correto');
    console.log('2. Se o projeto Firebase está ativo');
    console.log('3. Se as regras de segurança permitem leitura/escrita');
    console.log('4. Se a conta de serviço tem permissões adequadas');
  }
}

testDatabase();
