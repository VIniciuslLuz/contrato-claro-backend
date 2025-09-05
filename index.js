// index.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { firestore } from './firebase.js'; // se o firebase também for ES Module

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
    const data = await pdfjsLib.getDocument(dataBuffer).promise;

    let text = '';
    for (let i = 1; i <= data.numPages; i++) {
      const page = await data.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + '\n';
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

// Rotas e endpoints...
// Mesma lógica que eu te mandei antes, só convertendo require → import

// Inicializa servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
