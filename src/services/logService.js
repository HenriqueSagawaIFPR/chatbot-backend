import createLogModel from '../models/Log.js';
import { getLogConnection } from '../config/db.js';

class LogService {
  constructor() {
    this.logModel = null;
    this.initializeLogModel();
  }

  async initializeLogModel() {
    try {
      const logConnection = getLogConnection();
      if (logConnection) {
        this.logModel = createLogModel(logConnection);
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