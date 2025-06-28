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
    required: true
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

// Índices para melhor performance nas consultas
logSchema.index({ timestamp: -1 });
logSchema.index({ botName: 1, userName: 1 });
logSchema.index({ chatId: 1 });

// Função para criar o modelo usando uma conexão específica
const createLogModel = (connection) => {
  return connection.model('Log', logSchema);
};

export default createLogModel; 