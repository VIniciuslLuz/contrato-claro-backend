# 🔧 Configuração do Banco de Dados - Contrato Claro

## ❌ Problema Identificado
O banco de dados não está recebendo os tokens dos contratos enviados. A última data de funcionamento foi 01/06.

## 🎯 Solução
O sistema usa **Firebase Firestore** como banco de dados. É necessário configurar as credenciais corretas.

## 📋 Passos para Configurar

### 1. Projeto Firebase Identificado ✅
**Seu projeto já existe**: `contratoclar0`
- **Project ID**: contratoclar0
- **Auth Domain**: contratoclar0.firebaseapp.com
- **Database URL**: https://contratoclar0-default-rtdb.firebaseio.com

**Agora você precisa ativar o Firestore Database:**
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto `contratoclar0`
3. No menu lateral, clique em **Firestore Database**
4. Clique em **Criar banco de dados**
5. Escolha **Modo de teste** (para desenvolvimento)
6. Escolha uma localização (recomendo: us-central1)

### 2. Gerar Credenciais de Serviço 🔑
1. No Firebase Console, vá em **Configurações** (ícone de engrenagem) > **Contas de serviço**
2. Na seção **Firebase Admin SDK**, clique em **Gerar nova chave privada**
3. Clique em **Gerar chave**
4. **IMPORTANTE**: Baixe o arquivo JSON e **NÃO compartilhe com ninguém**
5. Renomeie o arquivo baixado para `firebase-config.json`
6. Coloque na pasta `backend/`

### 3. Configurar no Backend
**✅ Arquivo de Configuração (Já criado)**
O arquivo `firebase-config.json` já foi criado na pasta `backend/` com a estrutura correta.

**Agora você precisa:**
1. Substituir o conteúdo do arquivo pelo JSON que você baixou do Firebase Console
2. O arquivo deve ter esta estrutura (com suas credenciais reais):
```json
{
  "type": "service_account",
  "project_id": "contratoclar0",
  "private_key_id": "sua-chave-real-aqui",
  "private_key": "-----BEGIN PRIVATE KEY-----\nsua-chave-privada-real-aqui\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@contratoclar0.iam.gserviceaccount.com",
  "client_id": "sua-chave-real-aqui",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40seu-projeto.iam.gserviceaccount.com"
}
```

**Opção B: Variável de Ambiente**
1. Crie um arquivo `.env` na pasta `backend/`
2. Adicione:
```
FIREBASE_ADMIN_SDK={"type":"service_account","project_id":"...","private_key":"..."}
```

### 4. Regras do Firestore
Configure as regras de segurança no Firestore:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Para desenvolvimento
    }
  }
}
```

## 🚀 Testando a Configuração

### Passo 1: Configurar o Firebase
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto `contratoclar0`
3. Ative o **Firestore Database** se ainda não estiver ativo
4. Gere as credenciais de serviço em **Configurações** > **Contas de serviço**
5. Substitua o conteúdo do arquivo `firebase-config.json` pelas credenciais reais

### Passo 2: Testar a Conexão
1. Execute o teste: `npm run test-db`
2. Se tudo estiver correto, você verá:
   ```
   ✅ Arquivo de configuração encontrado
   ✅ Firebase Admin SDK inicializado
   ✅ Conexão com Firestore funcionando!
   ✅ Escrita no banco funcionando!
   ✅ Leitura do banco funcionando!
   🎉 Todos os testes passaram!
   ```

### Passo 3: Iniciar o Servidor
1. Reinicie o servidor backend: `npm start`
2. Verifique os logs - deve aparecer:
   ```
   ✅ Firebase configurado via arquivo firebase-config.json
   ✅ Firebase Admin SDK inicializado com sucesso
   ✅ Conexão com Firestore testada com sucesso
   ```

3. Faça um teste enviando um contrato
4. Verifique se aparece:
   ```
   💾 Salvando análise no banco de dados...
   ✅ Análise salva com sucesso no banco de dados
   ```

## 🔍 Verificando no Firebase Console

1. Acesse o Firebase Console
2. Vá em **Firestore Database**
3. Verifique se a coleção **"análises de contratos"** está sendo criada
4. Verifique se os documentos estão sendo salvos com os tokens

## 🆘 Solução de Problemas

### Erro: "Firebase não configurado"
- Verifique se o arquivo `firebase-config.json` existe
- Verifique se as credenciais estão corretas
- Verifique se o projeto está ativo

### Erro: "Permission denied"
- Verifique as regras de segurança do Firestore
- Verifique se a conta de serviço tem permissões

### Erro: "Project not found"
- Verifique se o `project_id` está correto
- Verifique se o projeto está ativo no Firebase

## 📞 Suporte
Se o problema persistir, verifique:
1. Logs do servidor backend
2. Console do Firebase
3. Regras de segurança do Firestore
4. Status do projeto Firebase
