import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateResponse } from './lib/gemini.js';

// Carrega as variáveis de ambiente
dotenv.config();

// Cria o servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsing de JSON e CORS
app.use(express.json());
app.use(cors());

// Rota principal para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.json({ message: 'API do Chatbot Terra Plana está funcionando!' });
});

// Endpoint POST /api/chat (equivalente ao route.ts do Next.js)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    // Validação da mensagem (obrigatória)
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Chama a função generateResponse para processar a mensagem
    const response = await generateResponse(message, history);

    // Retorna a resposta como JSON
    return res.json({ response });
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ error: 'Erro ao processar a mensagem' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;
