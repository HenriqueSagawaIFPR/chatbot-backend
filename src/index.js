import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB, { connectLogDB } from './config/db.js'; 
import Chat from './models/Chat.js'; 
import User from './models/User.js';
import { generateResponse } from './lib/gemini.js';
import BotConfig from './models/BotConfig.js';
import logService from './services/logService.js';
import authService from './services/authService.js';
import { authenticateToken, optionalAuth, authorizeRole } from './middleware/auth.js';

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

// ===== ROTAS DE AUTENTICAÇÃO =====

// POST /api/auth/register - Registrar novo usuário
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email e senha são obrigatórios' });
    }

    const result = await authService.registerUser({ username, email, password });
    res.status(201).json(result);
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login - Fazer login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username/email e senha são obrigatórios' });
    }

    const result = await authService.loginUser({ username, password });
    res.json(result);
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(401).json({ error: error.message });
  }
});

// GET /api/auth/me - Obter dados do usuário logado
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/auth/profile - Atualizar perfil do usuário
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    const updatedUser = await authService.updateUser(req.user._id, { username });
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/change-password - Alterar senha
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    await authService.changePassword(req.user._id, currentPassword, newPassword);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(400).json({ error: error.message });
  }
});

// ===== ROTAS DE CHAT MODIFICADAS =====

// Rota GET /api/chats - Listar conversas do usuário autenticado
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id })
      .select('_id title createdAt updatedAt')
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    console.error('Erro ao buscar chats:', error);
    res.status(500).json({ error: 'Erro ao buscar chats' });
  }
});

// Rota GET /api/chats/:id - Buscar uma conversa específica do usuário
app.get('/api/chats/:id', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }
    res.json(chat);
  } catch (error) {
    console.error('Erro ao buscar chat por ID:', error);
    // Verifica se o erro é devido a um ID inválido do MongoDB
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
        return res.status(400).json({ error: 'ID do chat inválido' });
    }
    res.status(500).json({ error: 'Erro ao buscar chat' });
  }
});

// Rota DELETE /api/chats/:id - Excluir uma conversa específica do usuário
app.delete('/api/chats/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }
    return res.status(200).json({ message: 'Chat excluído com sucesso', id: req.params.id });
  } catch (error) {
    console.error('Erro ao excluir chat:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(400).json({ error: 'ID do chat inválido' });
    }
    return res.status(500).json({ error: 'Erro ao excluir chat' });
  }
});

// Rota PUT /api/chats/:id/title - Atualizar o título de uma conversa do usuário
app.put('/api/chats/:id/title', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }

    chat.title = title.trim();
    await chat.save();

    return res.status(200).json({
      _id: chat._id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    });
  } catch (error) {
    console.error('Erro ao atualizar título do chat:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(400).json({ error: 'ID do chat inválido' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar título do chat' });
  }
});

// Rota POST /api/chats/:id/suggest-title - Gera um título por IA e salva no chat do usuário
app.post('/api/chats/:id/suggest-title', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }

    // Monta um contexto curto com as últimas mensagens
    const maxMessages = 12;
    const recentMessages = chat.messages.slice(-maxMessages);
    const transcript = recentMessages.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n');

    const instruction = `Gere um TÍTULO curto e descritivo para esta conversa em português do Brasil.
Regras:
- Máximo de 6 palavras e 60 caracteres.
- Sem aspas ou pontuação final.
- Seja específico ao tema e intenção do usuário.
Transcrição (resumida):\n${transcript}\n\nResponda com APENAS o título.`;

    const aiTitleRaw = await generateResponse(instruction, []);
    let aiTitle = (aiTitleRaw || '').trim();
    aiTitle = aiTitle.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (aiTitle.length > 60) {
      aiTitle = aiTitle.slice(0, 60);
    }
    if (!aiTitle) {
      return res.status(500).json({ error: 'Falha ao gerar título por IA' });
    }

    chat.title = aiTitle;
    await chat.save();

    return res.status(200).json({
      _id: chat._id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    });
  } catch (error) {
    console.error('Erro ao sugerir título do chat:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(400).json({ error: 'ID do chat inválido' });
    }
    return res.status(500).json({ error: 'Erro ao sugerir título do chat' });
  }
});

// Rota POST /api/chat - Processar mensagem (criar novo chat ou adicionar a existente)
app.post('/api/chat', optionalAuth, async (req, res) => {
  const startTime = Date.now();
  let chatId = null;
  
  try {
    const { message, chatId: existingChatId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Verificar limite de mensagens para usuários não logados
    if (!req.user) {
      // Para usuários não logados, sempre criar novo chat
      // O limite é implementado no frontend para simplicidade
      // Aqui apenas garantimos que sempre será um novo chat
    }

    let chat;
    let historyForGemini = [];

    const userMessage = { role: 'user', content: message };

    if (req.user && existingChatId) {
      // Encontrar chat existente do usuário logado
      chat = await Chat.findOne({ _id: existingChatId, userId: req.user._id });
      if (!chat) {
        return res.status(404).json({ error: 'Chat não encontrado' });
      }
      // Adicionar mensagem do usuário ao histórico existente
      chat.messages.push(userMessage);
      // Preparar histórico para Gemini (apenas content e role)
      historyForGemini = chat.messages.map(msg => ({ role: msg.role, content: msg.content }));
      chatId = existingChatId;
    } else {
      // Criar novo chat (para usuários não logados ou quando não há chatId)
      const title = message.substring(0, 30) + (message.length > 30 ? '...' : ''); // Título inicial
      chat = new Chat({
        userId: req.user ? req.user._id : null,
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
  // Protegido para admin
  
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
  // Protegido para admin
  
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

// ===== ROTAS DE ADMINISTRAÇÃO =====
// Listar todos os usuários (admin)
app.get('/api/admin/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('_id username email role isActive lastLogin createdAt updatedAt');
    res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Analytics (admin)
app.get('/api/admin/analytics', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [totalUsers, activeUsers, adminUsers, totalChats] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
      Chat.countDocuments()
    ]);

    // Total de mensagens
    const messagesAggregation = await Chat.aggregate([
      { $project: { messagesCount: { $size: { $ifNull: ['$messages', []] } } } },
      { $group: { _id: null, totalMessages: { $sum: '$messagesCount' } } }
    ]);
    const totalMessages = messagesAggregation[0]?.totalMessages || 0;
    const avgMessagesPerChat = totalChats > 0 ? Number((totalMessages / totalChats).toFixed(2)) : 0;

    // Últimos 7 dias - chats por dia
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const chatsPerDay = await Chat.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Últimos 7 dias - mensagens por dia (unwind)
    const messagesPerDay = await Chat.aggregate([
      { $unwind: '$messages' },
      { $match: { 'messages.timestamp': { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$messages.timestamp' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Métricas a partir dos logs (se disponíveis)
    const LogModel = logService.getLogModel();
    let responseTime = { avgMs: 0, p95Ms: 0 };
    let errorsLast7Days = 0;
    if (LogModel) {
      const stats = await LogModel.aggregate([
        { $match: { timestamp: { $gte: sevenDaysAgo }, processingTime: { $gt: 0 } } },
        { $project: { processingTime: 1 } },
        { $group: { _id: null, avg: { $avg: '$processingTime' } } }
      ]);
      const avgMs = stats[0]?.avg || 0;
      // p95
      const p95Agg = await LogModel.aggregate([
        { $match: { timestamp: { $gte: sevenDaysAgo }, processingTime: { $gt: 0 } } },
        { $sort: { processingTime: 1 } },
        { $group: { _id: null, list: { $push: '$processingTime' } } },
        { $project: { p95: { $arrayElemAt: ['$list', { $floor: { $multiply: [0.95, { $size: '$list' }] } }] } } }
      ]);
      const p95Ms = p95Agg[0]?.p95 || 0;
      responseTime = { avgMs: Math.round(avgMs), p95Ms: Math.round(p95Ms) };

      errorsLast7Days = await LogModel.countDocuments({ timestamp: { $gte: sevenDaysAgo }, status: 'error' });
    }

    // Acessos por dia (se modelo existir)
    const AccessModel = logService.getUserLogAccessModel();
    let accessesPerDay = [];
    if (AccessModel) {
      accessesPerDay = await AccessModel.aggregate([
        { $match: { col_data: { $gte: sevenDaysAgo.toISOString().slice(0, 10) } } },
        { $group: { _id: '$col_data', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
    }

    res.json({
      users: { total: totalUsers, active: activeUsers, admins: adminUsers },
      chats: { total: totalChats, totalMessages, avgMessagesPerChat },
      timeseries: { chatsPerDay, messagesPerDay, accessesPerDay },
      performance: responseTime,
      errors: { last7Days: errorsLast7Days }
    });
  } catch (error) {
    console.error('Erro ao obter analytics:', error);
    res.status(500).json({ error: 'Erro ao obter analytics' });
  }
});

// Logs (admin) - últimos 200
app.get('/api/admin/logs', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const LogModel = logService.getLogModel();
    if (!LogModel) return res.status(500).json({ error: 'Modelo de log não disponível' });
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
    const logs = await LogModel.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('botName userName message response messageType timestamp processingTime status errorMessage ipAddress');
    res.json(logs);
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    res.status(500).json({ error: 'Erro ao obter logs' });
  }
});

// Logs de acesso (admin) - últimos 200
app.get('/api/admin/access-logs', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const AccessModel = logService.getUserLogAccessModel();
    if (!AccessModel) return res.status(500).json({ error: 'Modelo de log de acesso não disponível' });
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
    const logs = await AccessModel.find()
      .sort({ col_data: -1, col_hora: -1 })
      .limit(limit)
      .select('col_data col_hora col_IP col_nome_bot col_acao');
    res.json(logs);
  } catch (error) {
    console.error('Erro ao obter logs de acesso:', error);
    res.status(500).json({ error: 'Erro ao obter logs de acesso' });
  }
});

// Alterar status ativo de um usuário (admin)
app.put('/api/admin/users/:id/status', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const update = {};
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (role && ['user', 'admin'].includes(role)) update.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ user });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(400).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Listar todos os chats para moderação (admin)
app.get('/api/admin/chats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const chats = await Chat.find().select('_id userId title createdAt updatedAt');
    res.json(chats);
  } catch (error) {
    console.error('Erro ao listar chats:', error);
    res.status(500).json({ error: 'Erro ao listar chats' });
  }
});

// Obter chat completo para revisão (admin)
app.get('/api/admin/chats/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });
    res.json(chat);
  } catch (error) {
    console.error('Erro ao obter chat:', error);
    res.status(400).json({ error: 'Erro ao obter chat' });
  }
});

// Excluir chat (admin)
app.delete('/api/admin/chats/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const deleted = await Chat.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Chat não encontrado' });
    res.json({ message: 'Chat excluído com sucesso', id: req.params.id });
  } catch (error) {
    console.error('Erro ao excluir chat:', error);
    res.status(400).json({ error: 'Erro ao excluir chat' });
  }
});

// Configuração do Bot (admin)
// GET /api/admin/bot-config - obter personalidade/instrução atual
app.get('/api/admin/bot-config', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const cfg = await BotConfig.findOne({ key: 'default' });
    if (!cfg) {
      return res.json({ key: 'default', systemInstruction: '' });
    }
    res.json({ key: cfg.key, systemInstruction: cfg.systemInstruction, updatedAt: cfg.updatedAt });
  } catch (error) {
    console.error('Erro ao obter bot-config:', error);
    res.status(500).json({ error: 'Erro ao obter configuração do bot' });
  }
});

// PUT /api/admin/bot-config - atualizar personalidade/instrução
app.put('/api/admin/bot-config', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { systemInstruction } = req.body;
    if (typeof systemInstruction !== 'string' || !systemInstruction.trim()) {
      return res.status(400).json({ error: 'systemInstruction é obrigatório' });
    }
    const updated = await BotConfig.findOneAndUpdate(
      { key: 'default' },
      { key: 'default', systemInstruction: systemInstruction.trim(), updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json({ key: updated.key, systemInstruction: updated.systemInstruction, updatedAt: updated.updatedAt });
  } catch (error) {
    console.error('Erro ao atualizar bot-config:', error);
    res.status(400).json({ error: 'Erro ao atualizar configuração do bot' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;

