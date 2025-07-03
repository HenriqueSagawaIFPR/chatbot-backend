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

// Array para simular o armazenamento de dados de ranking
let dadosRankingVitrine = [];

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
    // await logService.logUserMessage(chatId, message, requestInfo); // Removido para não registrar na collection 'logs'

    // Log de acesso do usuário na collection tb_cl_user_log_acess
    await logService.logUserAccess(requestInfo.ipAddress, 'acessou_chatbot', 'Vagner Terraplanista');

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

// NOVO: Endpoint POST /api/log-connection para logs de acesso conforme especificação da atividade B2.P1.A7
app.post('/api/log-connection', async (req, res) => {
  try {
    const { ip, acao } = req.body;

    if (!ip || !acao) {
      return res.status(400).json({ error: "Dados de log incompletos (IP e ação são obrigatórios)." });
    }

    await logService.logUserAccess(ip, acao, 'Vagner Terraplanista');

    res.status(201).json({ 
      message: "Log de acesso registrado com sucesso",
      data: { ip, acao, nomeBot: 'Vagner Terraplanista' }
    });
  } catch (error) {
    console.error('Erro ao registrar log de acesso:', error);
    res.status(500).json({ error: 'Erro ao registrar log de acesso' });
  }
});

// NOVO: Endpoint POST /api/ranking/registrar-acesso-bot para dados de ranking
app.post('/api/ranking/registrar-acesso-bot', (req, res) => {
  const { botId, nomeBot, timestampAcesso, usuarioId } = req.body;

  if (!botId || !nomeBot) {
    return res.status(400).json({ error: "ID e Nome do Bot são obrigatórios para o ranking." });
  }

  const acesso = {
    botId,
    nomeBot,
    usuarioId: usuarioId || 'anonimo',
    acessoEm: timestampAcesso ? new Date(timestampAcesso) : new Date(),
    contagem: 1
  };

  // Lógica simples para o ranking: adicionar ao array ou incrementar contagem
  const botExistente = dadosRankingVitrine.find(b => b.botId === botId);
  if (botExistente) {
    botExistente.contagem += 1;
    botExistente.ultimoAcesso = acesso.acessoEm;
  } else {
    dadosRankingVitrine.push({
      botId: botId,
      nomeBot: nomeBot,
      contagem: 1,
      ultimoAcesso: acesso.acessoEm
    });
  }
  
  console.log('[Servidor] Dados de ranking atualizados:', dadosRankingVitrine);
  res.status(201).json({ message: `Acesso ao bot ${nomeBot} registrado para ranking.` });
});

// NOVO: Endpoint GET /api/ranking/visualizar para ver os dados simulados
app.get('/api/ranking/visualizar', (req, res) => {
  // Ordenar por contagem, do maior para o menor
  const rankingOrdenado = [...dadosRankingVitrine].sort((a, b) => b.contagem - a.contagem);
  res.json(rankingOrdenado);
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

// NOVO: Rota para visualizar logs de acesso (apenas para desenvolvimento/debug)
app.get('/api/logs-access', async (req, res) => {
  try {
    const logConnection = logService.getLogConnection();
    if (!logConnection) {
      return res.status(500).json({ error: 'Conexão de log não disponível' });
    }

    const UserLogAccessModel = logService.getUserLogAccessModel();
    if (!UserLogAccessModel) {
      return res.status(500).json({ error: 'Modelo de log de acesso não disponível' });
    }

    const logs = await UserLogAccessModel.find()
      .sort({ col_data: -1, col_hora: -1 })
      .limit(100)
      .select('col_data col_hora col_IP col_nome_bot col_acao');

    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs de acesso:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de acesso' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;

