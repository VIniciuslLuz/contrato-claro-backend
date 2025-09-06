// index.js
import express from 'express';
import multer from 'multer';
import { getDocument } from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import admin from 'firebase-admin';

// Configurações
dotenv.config();
const app = express();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// CORS liberado
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// OpenAI e Stripe
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });

// Firebase Admin
let firestore;
try {
  let firebaseConfig;
  const configPath = path.join(process.cwd(), 'firebase-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else if (process.env.FIREBASE_ADMIN_SDK) {
    firebaseConfig = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
  } else {
    throw new Error('Nenhuma configuração do Firebase encontrada');
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(firebaseConfig) });
  }
  firestore = admin.firestore();
  console.log('✅ Firebase inicializado');
} catch (err) {
  console.error('❌ Erro Firebase:', err.message);
  // mock para não quebrar servidor
  firestore = { collection: () => ({ doc: () => ({ set: async () => {} }) }) };
}

// Extrair texto PDF
async function extractTextFromPDF(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('Arquivo não encontrado');
  const dataBuffer = fs.readFileSync(filePath);
  const pdf = await getDocument(dataBuffer).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    text += pageText + '\n';
  }
  return text;
}

// Extrair texto de imagem
async function extractTextFromImage(filePath) {
  const { data: { text } } = await Tesseract.recognize(filePath, 'por');
  return text;
}

// Teste do servidor
app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor funcionando!', firebase: firestore ? 'Conectado' : 'Não conectado' });
});

// Analisar contrato
app.post('/api/analisar-contrato', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Arquivo não enviado.' });

    let textoExtraido = '';
    if (file.mimetype === 'application/pdf') {
      textoExtraido = await extractTextFromPDF(file.path);
    } else if (file.mimetype.startsWith('image/')) {
      textoExtraido = await extractTextFromImage(file.path);
    } else {
      return res.status(400).json({ error: 'Tipo de arquivo não suportado.' });
    }

    const prompt = `Leia o texto abaixo de um contrato e destaque as cláusulas que podem ser de risco para o contratante, explicando de forma simples.\n\nContrato:\n${textoExtraido}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente jurídico que explica contratos em linguagem simples.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const resposta = completion.choices[0].message.content;
    const token = Math.random().toString(36).substr(2, 12) + Date.now();

    // Salvar no Firestore
    await firestore.collection('analises_contratos').doc(token).set({
      token,
      data: new Date().toISOString(),
      clausulas: resposta,
      pago: false
    });

    // Limpeza do arquivo
    fs.unlinkSync(file.path);

    res.json({ token, clausulas: resposta, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar o contrato.', details: err.message });
  }
});

// Buscar análise pelo token
app.get('/api/analise-por-token', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token não enviado.' });

    const doc = await firestore.collection('analises_contratos').doc(token).get();
    if (!doc.exists) return res.status(404).json({ error: 'Análise não encontrada.' });

    res.json(doc.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar análise.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
