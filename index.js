// index.js
import express from 'express';
import multer from 'multer';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'; // pdfjs 4.x compatível
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
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });

// Firestore
let firestore;
if (!admin.apps.length) {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-config.json');
  let firebaseConfig = null;

  if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    console.log('✅ Firebase configurado via arquivo');
  } else if (process.env.FIREBASE_ADMIN_SDK) {
    firebaseConfig = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
    console.log('✅ Firebase configurado via variável de ambiente');
  } else {
    console.error('❌ Nenhuma configuração do Firebase encontrada!');
  }

  admin.initializeApp({ credential: admin.credential.cert(firebaseConfig) });
  firestore = admin.firestore();
}

// ----------------- Funções -----------------

async function extractTextFromPDF(filePath) {
  try {
    if (!fs.existsSync(filePath)) throw new Error('Arquivo PDF não encontrado');

    const dataBuffer = fs.readFileSync(filePath);
    const pdf = await pdfjsLib.getDocument(dataBuffer).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }

    return text;
  } catch (err) {
    console.error('Erro PDF:', err.message);
    return `Erro na extração do PDF: ${err.message}`;
  }
}

async function extractTextFromImage(filePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'por');
    return text;
  } catch (err) {
    console.error('Erro OCR imagem:', err.message);
    return `Erro na extração da imagem: ${err.message}`;
  }
}

// ----------------- Endpoints -----------------

app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor funcionando!', firebase: firestore ? 'Conectado' : 'Não conectado' });
});

app.post('/api/analisar-contrato', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const uid = req.body.uid || 'test-user-' + Date.now();

    if (!file) return res.status(400).json({ error: 'Arquivo não enviado.' });

    let textoExtraido = '';
    if (file.mimetype === 'application/pdf') {
      textoExtraido = await extractTextFromPDF(file.path);
    } else if (file.mimetype.startsWith('image/')) {
      textoExtraido = await extractTextFromImage(file.path);
    } else {
      return res.status(400).json({ error: 'Tipo de arquivo não suportado.' });
    }

    // Envia para IA
    const prompt = `Leia o texto abaixo de um contrato e destaque cláusulas de risco, explicando de forma simples.\n\nContrato:\n${textoExtraido}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é assistente jurídico explicando contratos de forma simples.' },
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
      uid,
      data: new Date().toISOString(),
      clausulas: resposta,
      resumoSeguras: [],
      resumoRiscos: [],
      recomendacoes: 'Considere consultar um advogado para revisar o contrato.',
      pago: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // Salva no Firestore
    try {
      await firestore.collection('analises_contratos').doc(token).set(analiseData);
      console.log('✅ Análise salva no Firestore:', token);
    } catch (err) {
      console.error('❌ Erro ao salvar Firestore:', err.message);
      return res.status(500).json({ error: 'Erro ao salvar análise no Firestore', details: err.message });
    }

    // Remove arquivo temporário
    fs.unlink(file.path, () => {});

    res.json({ clausulas: resposta, token, success: true });
  } catch (err) {
    console.error('Erro geral análise:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Resumir cláusulas -----------------
app.post('/api/resumir-clausulas', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    const { clausulas } = req.body;
    if (!clausulas) return res.status(400).json({ error: 'Cláusulas não enviadas.' });

    const prompt = `Separe as cláusulas em "seguras" e "riscos", resuma cada uma, e retorne apenas JSON.\n\nCláusulas:\n${clausulas}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é assistente jurídico resumindo e classificando cláusulas.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const resposta = completion.choices[0].message.content;
    let json;
    try {
      const match = resposta.match(/{[\s\S]*}/);
      json = match ? JSON.parse(match[0]) : JSON.parse(resposta.replace(/```json|```/g,'').trim());
    } catch(e) {
      return res.status(500).json({ error: 'Erro ao interpretar resposta da IA', resposta });
    }

    res.json(json);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao resumir cláusulas.' });
  }
});

// ----------------- Stripe checkout -----------------
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token não enviado.' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price_data: { currency:'brl', product_data:{name:'Análise Contratual'}, unit_amount:499 }, quantity:1 }],
      success_url: `http://localhost:5173/success?token=${token}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: 'http://localhost:5173/cancel'
    });

    await firestore.collection('analises_contratos').doc(token).update({
      session_id: session.id,
      pago: false,
      ultima_atualizacao: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ url: session.url });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento.' });
  }
});

// ----------------- Verificar liberação -----------------
app.get('/api/analise-liberada', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(404).json({ error: 'Token inválido.' });

  try {
    const doc = await firestore.collection('analises_contratos').doc(token).get();
    if (!doc.exists) return res.status(404).json({ error: 'Token não encontrado.' });

    const analise = doc.data();
    if (!analise.session_id) return res.status(400).json({ error: 'Sessão de pagamento não encontrada.' });

    const session = await stripe.checkout.sessions.retrieve(analise.session_id);
    if (session.payment_status === 'paid') {
      await firestore.collection('analises_contratos').doc(token).update({
        pago: true,
        data_pagamento: admin.firestore.FieldValue.serverTimestamp(),
        status_pagamento: 'confirmado'
      });
      return res.json({ liberado: true });
    } else {
      return res.json({ liberado: false });
    }
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar pagamento.' });
  }
});

// ----------------- Buscar análise por token -----------------
app.get('/api/analise-por-token', async (req,res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token não enviado.' });

  try {
    const doc = await firestore.collection('analises_contratos').doc(token).get();
    if (!doc.exists) return res.status(404).json({ error: 'Análise não encontrada.' });

    const analise = doc.data();
    if (!analise.pago) return res.status(403).json({ error: 'Pagamento não confirmado.' });

    res.json({ analise });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar análise.' });
  }
});

// ----------------- Servidor -----------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
