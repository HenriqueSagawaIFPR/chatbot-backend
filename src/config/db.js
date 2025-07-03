// Configuração da conexão com o MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Conexão principal para dados do chat
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Opções do Mongoose para evitar warnings de depreciação
      // As opções useNewUrlParser, useUnifiedTopology, useCreateIndex, useFindAndModify
      // não são mais necessárias a partir do Mongoose 6.
    });
    console.log(`MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erro ao conectar ao MongoDB: ${error.message}`);
    // Sai do processo com falha
    process.exit(1);
  }
};

// Conexão secundária para logs (MongoDB Atlas compartilhado)
let logConnection = null;

const connectLogDB = async () => {
  try {
    if (!logConnection) {
      const logUri = process.env.MONGO_URI || process.env.MONGODB_LOG_URI;
      if (!logUri) {
        console.error('String de conexão MONGO_URI não encontrada nas variáveis de ambiente');
        return null;
      }
      logConnection = mongoose.createConnection(logUri, {});
      logConnection.on('connected', () => {
        console.log('MongoDB Atlas Compartilhado Conectado!');
      });
      logConnection.on('error', (err) => {
        console.error('Erro na conexão do MongoDB Atlas Compartilhado:', err);
      });
    }
    return logConnection;
  } catch (error) {
    console.error(`Erro ao conectar ao MongoDB Atlas Compartilhado:`, error);
    return null;
  }
};

// Função para obter a conexão de log
const getLogConnection = () => {
  return logConnection;
};

export default connectDB;
export { connectLogDB, getLogConnection };

