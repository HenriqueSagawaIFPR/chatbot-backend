import mongoose from 'mongoose';

// Schema para as mensagens individuais dentro de um chat
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant'] // Define os papéis possíveis
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now // Define o timestamp padrão como a hora atual
  }
}, { _id: false }); // Não cria um _id separado para cada mensagem

// Schema principal para as conversas (chats)
const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Permite null para usuários convidados
  },
  title: {
    type: String,
    required: true,
    default: 'Nova Conversa' // Título padrão para novas conversas
  },
  messages: [messageSchema], // Array de mensagens usando o schema definido acima
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar o campo 'updatedAt' antes de salvar
chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Cria o modelo 'Chat' a partir do schema
const Chat = mongoose.model('Chat', chatSchema);

export default Chat;

