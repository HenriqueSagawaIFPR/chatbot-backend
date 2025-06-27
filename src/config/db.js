// Configuração da conexão com o MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

export default connectDB;

