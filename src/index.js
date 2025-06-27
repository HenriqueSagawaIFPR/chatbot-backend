import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js'; 
import Chat from './models/Chat.js'; 
import { generateResponse } from './lib/gemini.js';

// Carrega as variáveis de ambiente
dotenv.config();

// Conecta ao MongoDB
connectDB();

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

// Rota GET /api/chats - Listar todas as conversas (apenas ID e título)
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await Chat.find().select('_id title createdAt updatedAt').sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    console.error('Erro ao buscar chats:', error);
    res.status(500).json({ error: 'Erro ao buscar chats' });
  }
});

// Rota GET /api/chats/:id - Buscar uma conversa específica com mensagens
app.get('/api/chats/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }
    res.json(chat);
  } catch (error) {
    console.error('Erro ao buscar chat por ID:', error);
    // Verifica se o erro é devido a um ID inválido do MongoDB
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ error: 'ID do chat inválido' });
    }
    res.status(500).json({ error: 'Erro ao buscar chat' });
  }
});


// Rota POST /api/chat - Processar mensagem (criar novo chat ou adicionar a existente)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, chatId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    let chat;
    let historyForGemini = [];

    const userMessage = { role: 'user', content: message };

    if (chatId) {
      // Encontrar chat existente
      chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat não encontrado' });
      }
      // Adicionar mensagem do usuário ao histórico existente
      chat.messages.push(userMessage);
      // Preparar histórico para Gemini (apenas content e role)
      historyForGemini = chat.messages.map(msg => ({ role: msg.role, content: msg.content }));

    } else {
      // Criar novo chat
      const title = message.substring(0, 30) + (message.length > 30 ? '...' : ''); // Título inicial
      chat = new Chat({
        title: title,
        messages: [userMessage]
      });
      // Preparar histórico para Gemini (apenas a primeira mensagem do usuário)
      historyForGemini = [userMessage];
    }

    // Chamar Gemini (removendo a última mensagem do usuário do histórico passado, pois ela é o 'message' atual)
    const responseText = await generateResponse(message, historyForGemini.slice(0, -1)); 

    const botMessage = { role: 'assistant', content: responseText };
    chat.messages.push(botMessage);

    // Salvar o chat (novo ou atualizado)
    await chat.save();

    // Retorna a resposta do bot e o ID do chat
    return res.json({ response: responseText, chatId: chat._id });

  } catch (error) {
    console.error('Erro na API /api/chat:', error);
     // Verifica se o erro é devido a um ID inválido do MongoDB ao buscar
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ error: 'ID do chat inválido fornecido' });
    }
    res.status(500).json({ error: 'Erro ao processar a mensagem' });
  }
});


// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;

