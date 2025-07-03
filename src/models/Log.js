import mongoose from 'mongoose';

// Schema para logs de conversas
const logSchema = new mongoose.Schema({
  botName: {
    type: String,
    required: true,
    default: 'Vagner Terraplanista'
  },
  userName: {
    type: String,
    required: true,
    default: 'Henrique Sagawa'
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  message: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: false
  },
  messageType: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  sessionId: {
    type: String
  },
  processingTime: {
    type: Number // Tempo de processamento em milissegundos
  },
  status: {
    type: String,
    enum: ['success', 'error', 'pending'],
    default: 'success'
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Schema para logs de acesso conforme especificação da atividade B2.P1.A7
const userLogAccessSchema = new mongoose.Schema({
  col_data: {
    type: String,
    required: true,
    // Formato YYYY-MM-DD
  },
  col_hora: {
    type: String,
    required: true,
    // Formato HH:MM:SS
  },
  col_IP: {
    type: String,
    required: true
  },
  col_nome_bot: {
    type: String,
    required: true,
    default: 'Vagner Terraplanista'
  },
  col_acao: {
    type: String,
    required: true,
    // Exemplos: "acessou_chatbot", "pediu_previsao_tempo", "usou_ferramenta_X"
  }
}, {
  timestamps: false // Não usar timestamps automáticos para manter controle manual
});

// Índices para melhor performance nas consultas
logSchema.index({ timestamp: -1 });
logSchema.index({ botName: 1, userName: 1 });
logSchema.index({ chatId: 1 });

// Índices para o novo schema de logs de acesso
userLogAccessSchema.index({ col_data: -1, col_hora: -1 });
userLogAccessSchema.index({ col_IP: 1 });
userLogAccessSchema.index({ col_nome_bot: 1 });
userLogAccessSchema.index({ col_acao: 1 });

// Função para criar o modelo usando uma conexão específica
const createLogModel = (connection) => {
  return connection.model('Log', logSchema);
};

// Função para criar o modelo de logs de acesso usando uma conexão específica
const createUserLogAccessModel = (connection) => {
  return connection.model('UserLogAccess', userLogAccessSchema, 'tb_cl_user_log_acess');
};

export default createLogModel;
export { createUserLogAccessModel }; 