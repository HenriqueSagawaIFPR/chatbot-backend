import createLogModel, { createUserLogAccessModel } from '../models/Log.js';
import { getLogConnection } from '../config/db.js';

class LogService {
  constructor() {
    this.logModel = null;
    this.userLogAccessModel = null;
    this.initializeLogModel();
  }

  async initializeLogModel() {
    try {
      const logConnection = getLogConnection();
      if (logConnection) {
        this.logModel = createLogModel(logConnection);
        this.userLogAccessModel = createUserLogAccessModel(logConnection);
      }
    } catch (error) {
      console.error('Erro ao inicializar modelo de log:', error);
    }
  }

  // Método para obter a conexão de log
  getLogConnection() {
    return getLogConnection();
  }

  // Método para obter o modelo de log
  getLogModel() {
    return this.logModel;
  }

  // Método para obter o modelo de log de acesso
  getUserLogAccessModel() {
    return this.userLogAccessModel;
  }

  async logUserMessage(chatId, message, requestInfo = {}) {
    try {
      if (!this.logModel) {
        console.warn('Modelo de log não disponível');
        return;
      }

      const logEntry = new this.logModel({
        botName: 'Vagner Terraplanista',
        userName: 'Henrique Sagawa',
        chatId: chatId,
        message: message,
        response: '', // Será preenchido quando o bot responder
        messageType: 'user',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        sessionId: requestInfo.sessionId,
        status: 'success'
      });

      await logEntry.save();
      console.log(`Log de mensagem do usuário salvo: ${logEntry._id}`);
    } catch (error) {
      console.error('Erro ao salvar log da mensagem do usuário:', error);
    }
  }

  async logBotResponse(chatId, userMessage, botResponse, processingTime, requestInfo = {}) {
    try {
      if (!this.logModel) {
        console.warn('Modelo de log não disponível');
        return;
      }

      const logEntry = new this.logModel({
        botName: 'Vagner Terraplanista',
        userName: 'Henrique Sagawa',
        chatId: chatId,
        message: userMessage,
        response: botResponse,
        messageType: 'bot',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        sessionId: requestInfo.sessionId,
        processingTime: processingTime,
        status: 'success'
      });

      await logEntry.save();
      console.log(`Log de resposta do bot salvo: ${logEntry._id}`);
    } catch (error) {
      console.error('Erro ao salvar log da resposta do bot:', error);
    }
  }

  async logError(chatId, message, error, requestInfo = {}) {
    try {
      if (!this.logModel) {
        console.warn('Modelo de log não disponível');
        return;
      }

      const logEntry = new this.logModel({
        botName: 'Vagner Terraplanista',
        userName: 'Henrique Sagawa',
        chatId: chatId,
        message: message,
        response: '',
        messageType: 'user',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        sessionId: requestInfo.sessionId,
        status: 'error',
        errorMessage: error.message || error.toString()
      });

      await logEntry.save();
      console.log(`Log de erro salvo: ${logEntry._id}`);
    } catch (logError) {
      console.error('Erro ao salvar log de erro:', logError);
    }
  }

  // NOVO: Método para registrar logs de acesso conforme especificação da atividade B2.P1.A7
  async logUserAccess(ip, acao, nomeBot = 'Vagner Terraplanista') {
    try {
      if (!this.userLogAccessModel) {
        console.warn('Modelo de log de acesso não disponível');
        return;
      }
  
      const agora = new Date();
      const dataFormatada = agora.toISOString().split('T')[0]; // YYYY-MM-DD
      const horaFormatada = agora.toTimeString().split(' ')[0]; // HH:MM:SS
  
      const logEntry = new this.userLogAccessModel({
        col_data: dataFormatada,
        col_hora: horaFormatada,
        col_IP: ip,
        col_nome_bot: nomeBot,
        col_acao: acao
      });
  
      await logEntry.save();
      console.log(`Log de acesso do usuário salvo: ${logEntry._id}`);
      return logEntry;
    } catch (error) {
      console.error('Erro ao salvar log de acesso do usuário:', error);
      throw error;
    }
  }

  // Função para obter informações da requisição
  extractRequestInfo(req) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      sessionId: req.headers['x-session-id'] || req.session?.id
    };
  }
}

// Instância singleton do serviço de log
const logService = new LogService();

export default logService; 