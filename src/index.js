import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB, { connectLogDB } from './config/db.js'; 
import Chat from './models/Chat.js'; 
import { generateResponse } from './lib/gemini.js';
import logService from './services/logService.js';

// Carrega as variáveis de ambiente
dotenv.config();

// Conecta ao MongoDB principal
connectDB();

// Conecta ao MongoDB de logs
connectLogDB().then(() => {
  // Inicializa o serviço de log após a conexão
  logService.initializeLogModel();
});

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
  const startTime = Date.now();
  let chatId = null;
  
  try {
    const { message, chatId: existingChatId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    let chat;
    let historyForGemini = [];

    const userMessage = { role: 'user', content: message };

    if (existingChatId) {
      // Encontrar chat existente
      chat = await Chat.findById(existingChatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat não encontrado' });
      }
      // Adicionar mensagem do usuário ao histórico existente
      chat.messages.push(userMessage);
      // Preparar histórico para Gemini (apenas content e role)
      historyForGemini = chat.messages.map(msg => ({ role: msg.role, content: msg.content }));
      chatId = existingChatId;
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

    // Log da mensagem do usuário
    const requestInfo = logService.extractRequestInfo(req);
    await logService.logUserMessage(chatId, message, requestInfo);

    // Chamar Gemini (removendo a última mensagem do usuário do histórico passado, pois ela é o 'message' atual)
    const responseText = await generateResponse(message, historyForGemini.slice(0, -1)); 

    const botMessage = { role: 'assistant', content: responseText };
    chat.messages.push(botMessage);

    // Salvar o chat (novo ou atualizado)
    await chat.save();
    
    // Atualizar chatId se for um novo chat
    if (!chatId) {
      chatId = chat._id;
    }

    // Calcular tempo de processamento
    const processingTime = Date.now() - startTime;

    // Log da resposta do bot
    await logService.logBotResponse(chatId, message, responseText, processingTime, requestInfo);

    // Retorna a resposta do bot e o ID do chat
    return res.json({ response: responseText, chatId: chat._id });

  } catch (error) {
    console.error('Erro na API /api/chat:', error);
    
    // Log do erro
    const requestInfo = logService.extractRequestInfo(req);
    await logService.logError(chatId, message, error, requestInfo);
    
    // Verifica se o erro é devido a um ID inválido do MongoDB ao buscar
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ error: 'ID do chat inválido fornecido' });
    }
    res.status(500).json({ error: 'Erro ao processar a mensagem' });
  }
});

// Rota para visualizar logs (apenas para desenvolvimento/debug)
app.get('/api/logs', async (req, res) => {
  try {
    const logConnection = logService.getLogConnection();
    if (!logConnection) {
      return res.status(500).json({ error: 'Conexão de log não disponível' });
    }

    const LogModel = logService.getLogModel();
    if (!LogModel) {
      return res.status(500).json({ error: 'Modelo de log não disponível' });
    }

    const logs = await LogModel.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .select('botName userName message response messageType timestamp processingTime status');

    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;

