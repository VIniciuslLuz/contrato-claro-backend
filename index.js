// index.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { firestore } from './setup-firebase.js'; // seu setup Firebase ES Module

const app = express();
const upload = multer({ dest: 'uploads/' });

// Função para extrair texto de PDF
async function extractTextFromPDF(filePath) {
  try {
    if (!fs.existsSync(filePath)) throw new Error(`Arquivo não encontrado: ${filePath}`);
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfjsLib.getDocument(dataBuffer).promise;

    let text = '';
    for (let i = 1; i <= data.numPages; i++) {
      const page = await data.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;

  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    return `Erro na extração do PDF: ${error.message}`;
  }
}

// Função para extrair texto de imagem
async function extractTextFromImage(filePath) {
  return 'Texto extraído da imagem (simulado)';
}

// Teste de servidor
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    firebase: firestore ? 'Conectado' : 'Não conectado'
  });
});

// Endpoint principal para análise de contrato
app.post('/api/analisar-contrato', upload.single('file'), async (req, res) => {
  console.log('📩 Recebendo requisição de análise de contrato');
  try {
    const file = req.file;
    const { token, uid } = req.body;

    if (!file) return res.status(400).json({ error: 'Arquivo não enviado.' });

    // Extrai texto
    let textoExtraido = '';
    if (file.mimetype === 'application/pdf') textoExtraido = await extractTextFromPDF(file.path);
    else textoExtraido = await extractTextFromImage(file.path);

    // Simulação de cláusulas (substitua pela análise real)
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
    }

    // Limpa arquivo temporário
    try { fs.unlinkSync(file.path); } catch (err) { console.error('Erro ao limpar arquivo:', err); }

    // Retorna resposta
    res.json({ clausulas, token: token || 'fake-token', success: true });

  } catch (error) {
    console.error('❌ Erro no processamento do contrato:', error);
    res.status(500).json({ error: error.message });
  }
});

// Inicializa servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
