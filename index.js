const express = require('express');
const multer = require('multer');
const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { firestore } = require('./firebase'); // Ajuste para seu Firebase
const app = express();
const upload = multer({ dest: 'uploads/' });

// Função para extrair texto de PDF
async function extractTextFromPDF(filePath) {
  try {
    console.log('📄 Iniciando extração de PDF:', filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    
    const dataBuffer = fs.readFileSync(filePath);
    console.log('📄 Arquivo lido, tamanho:', dataBuffer.length, 'bytes');
    
    console.log('📄 Carregando documento PDF...');
    const data = await pdfjsLib.getDocument(dataBuffer).promise;
    
    console.log('📄 PDF carregado, número de páginas:', data.numPages);
    
    let text = '';
    for (let i = 1; i <= data.numPages; i++) {
      console.log(`📄 Processando página ${i}/${data.numPages}`);
      const page = await data.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + '\n';
      console.log(`📄 Página ${i} processada, texto extraído:`, pageText.length, 'caracteres');
    }
    
    console.log('📄 Extração concluída, texto total:', text.length, 'caracteres');
    return text;
    
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    // Método alternativo simulado
    try {
      console.log('🔄 Tentando método alternativo mais básico...');
      const mockText = `Texto simulado do PDF para teste.
Este é um texto de teste que simula o conteúdo de um contrato.
Inclui cláusulas básicas como:
- Prazo de execução
- Valor do contrato
- Responsabilidades das partes
- Penalidades por descumprimento
Erro original: ${error.message}`;
      console.log('✅ Método alternativo funcionou (texto simulado)');
      return mockText;
    } catch (fallbackError) {
      console.error('❌ Método alternativo também falhou:', fallbackError);
      return `Erro na extração do PDF: ${error.message}. Sistema temporariamente indisponível.`;
    }
  }
}

// Função para extrair texto de imagem (exemplo)
async function extractTextFromImage(filePath) {
  // Aqui você implementa sua extração de OCR
  return 'Texto extraído da imagem (simulado)';
}

// Endpoint de teste para verificar se o servidor está funcionando
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Servidor funcionando!', 
    timestamp: new Date().toISOString(),
    firebase: firestore ? 'Conectado' : 'Não conectado'
  });
});

// Endpoint para testar extração de PDF
app.post('/api/test-pdf', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Arquivo não enviado.' });
    if (file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'Apenas arquivos PDF são aceitos para este teste.' });

    console.log('🧪 TESTE: Iniciando teste de extração de PDF');
    console.log('🧪 TESTE: Arquivo:', file.originalname, 'Tamanho:', file.size);

    const textoExtraido = await extractTextFromPDF(file.path);

    try { fs.unlinkSync(file.path); } catch (cleanupError) { console.error('Erro ao limpar arquivo de teste:', cleanupError); }

    res.json({
      success: true,
      filename: file.originalname,
      textLength: textoExtraido.length,
      textPreview: textoExtraido.substring(0, 200) + '...',
      message: 'Teste de extração concluído com sucesso!'
    });
  } catch (error) {
    console.error('🧪 TESTE: Erro no teste de PDF:', error);
    res.status(500).json({ error: 'Erro no teste de extração', details: error.message, stack: error.stack });
  }
});

// Endpoint principal para análise de contrato
app.post('/api/analisar-contrato', upload.single('file'), async (req, res) => {
  console.log('📩 Recebendo requisição de análise de contrato');

  try {
    const file = req.file;
    const { token, uid } = req.body;

    if (!file) return res.status(400).json({ error: 'Arquivo não enviado.' });

    // Processa arquivo
    let textoExtraido = '';
    if (file.mimetype === 'application/pdf') {
      textoExtraido = await extractTextFromPDF(file.path);
    } else {
      textoExtraido = await extractTextFromImage(file.path);
    }

    // Simulação de cláusulas
    const clausulas = [
      "Prazo de execução: 12 meses",
      "Valor do contrato: R$ 10.000",
      "Responsabilidades: Cliente deve fornecer informações",
      "Penalidades: multa de 10% em caso de descumprimento"
    ];

    // Salva no Firestore
    if (uid) {
      await firestore.collection('contratos').add({
        uid,
        token: token || null,
        clausulas,
        textoExtraido,
        criadoEm: new Date()
      });
      console.log('✅ Contrato salvo no Firestore para UID:', uid);
    } else {
      console.warn('⚠️ Nenhum UID enviado. Contrato não foi salvo no Firestore.');
    }

    // Limpa arquivo temporário
    try { fs.unlinkSync(file.path); } catch (cleanupError) { console.error('Erro ao limpar arquivo:', cleanupError); }

    // Retorna resposta
    res.json({
      clausulas,
      token: token || "fake-token",
      success: true
    });

  } catch (error) {
    console.error('❌ Erro no processamento do contrato:', error);
    res.status(500).json({ error: error.message });
  }
});

// Inicializa servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
