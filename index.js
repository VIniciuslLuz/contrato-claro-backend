import express from 'express';
import multer from 'multer';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import admin from 'firebase-admin';

dotenv.config();
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });

// Inicializa Firebase
let firestore;
try {
  if (!admin.apps.length) {
    const configPath = path.join(process.cwd(), 'firebase-config.json');
    const firebaseConfig = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
      : JSON.parse(process.env.FIREBASE_ADMIN_SDK);

    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig)
    });

    firestore = admin.firestore();
    console.log('✅ Firebase Admin SDK inicializado');
  } else {
    firestore = admin.firestore();
  }
} catch (err) {
  console.error('❌ Erro ao inicializar Firebase:', err);
  process.exit(1);
}

// Função para extrair texto de PDF
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfjsLib.getDocument(dataBuffer).promise;
    let text = '';
    for (let i = 1; i <= data.numPages; i++) {
      const page = await data.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
  } catch (err) {
    console.error('Erro ao extrair PDF:', err);
    return `Erro na extração: ${err.message}`;
  }
}

// Função para extrair texto de imagem
async function extractTextFromImage(filePath) {
  const { data: { text } } = await Tesseract.recognize(filePath, 'por');
  return text;
}

// Endpoint teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor funcionando', firestore: !!firestore });
});

// Endpoint principal de análise
app.post('/api/analisar-contrato', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Arquivo não enviado' });

    let textoExtraido = '';
    if (file.mimetype === 'application/pdf') {
      textoExtraido = await extractTextFromPDF(file.path);
    } else if (file.mimetype.startsWith('image/')) {
      textoExtraido = await extractTextFromImage(file.path);
    } else {
      return res.status(400).json({ error: 'Tipo de arquivo não suportado' });
    }

    const prompt = `Leia o texto abaixo de um contrato e destaque as cláusulas que podem ser de risco para o contratante, explicando cada uma delas de forma simples e leiga.\n\nContrato:\n${textoExtraido}`;

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

    // Gera token único
    const token = Math.random().toString(36).substr(2, 12) + Date.now();

    const analiseData = {
      token,
      uid: 'temp-user-' + Date.now(),
      data: new Date().toISOString(),
      clausulas: resposta,
      resumoSeguras: [],
      resumoRiscos: [],
      recomendacoes: 'Considere consultar um advogado para revisar o contrato.',
      pago: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    await firestore.collection('analises_de_contratos').doc(token).set(analiseData);

    // Remove arquivo temporário
    fs.unlinkSync(file.path);

    res.json({ clausulas: resposta, token, success: true });
  } catch (err) {
    console.error('Erro ao processar contrato:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
