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

// Conexão secundária para logs
let logConnection = null;

const connectLogDB = async () => {
  try {
    if (!logConnection) {
      logConnection = await mongoose.createConnection(process.env.MONGODB_LOG_URI, {
        // Opções do Mongoose para evitar warnings de depreciação
      });
      console.log(`MongoDB Log Conectado: ${logConnection.connection.host}`);
    }
    return logConnection;
  } catch (error) {
    console.error(`Erro ao conectar ao MongoDB Log: ${error.message}`);
    // Não sai do processo, apenas loga o erro
    return null;
  }
};

// Função para obter a conexão de log
const getLogConnection = () => {
  return logConnection;
};

export default connectDB;
export { connectLogDB, getLogConnection };

