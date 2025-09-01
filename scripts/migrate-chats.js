import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../src/config/db.js';
import Chat from '../src/models/Chat.js';
import User from '../src/models/User.js';

// Carrega as variáveis de ambiente
dotenv.config();

const migrateChats = async () => {
  try {
    console.log('Conectando ao banco de dados...');
    await connectDB();
    
    console.log('Verificando se existe usuário padrão...');
    
    // Criar usuário padrão se não existir
    let defaultUser = await User.findOne({ email: 'admin@default.com' });
    
    if (!defaultUser) {
      console.log('Criando usuário padrão...');
      defaultUser = new User({
        username: 'admin',
        email: 'admin@default.com',
        password: 'admin123',
        isActive: true
      });
      await defaultUser.save();
      console.log('Usuário padrão criado com ID:', defaultUser._id);
    } else {
      console.log('Usuário padrão já existe com ID:', defaultUser._id);
    }
    
    // Buscar todos os chats sem userId
    const chatsWithoutUserId = await Chat.find({ userId: { $exists: false } });
    console.log(`Encontrados ${chatsWithoutUserId.length} chats sem userId`);
    
    if (chatsWithoutUserId.length > 0) {
      console.log('Atualizando chats...');
      
      // Atualizar todos os chats para incluir o userId padrão
      const updateResult = await Chat.updateMany(
        { userId: { $exists: false } },
        { $set: { userId: defaultUser._id } }
      );
      
      console.log(`${updateResult.modifiedCount} chats foram atualizados`);
    } else {
      console.log('Todos os chats já possuem userId');
    }
    
    // Verificar se a migração foi bem-sucedida
    const totalChats = await Chat.countDocuments();
    const chatsWithUserId = await Chat.countDocuments({ userId: { $exists: true } });
    
    console.log(`\nResumo da migração:`);
    console.log(`- Total de chats: ${totalChats}`);
    console.log(`- Chats com userId: ${chatsWithUserId}`);
    console.log(`- Chats sem userId: ${totalChats - chatsWithUserId}`);
    
    if (chatsWithUserId === totalChats) {
      console.log('\n✅ Migração concluída com sucesso!');
    } else {
      console.log('\n❌ Erro na migração. Alguns chats ainda não possuem userId.');
    }
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    // Fechar conexão com o banco
    await mongoose.connection.close();
    console.log('Conexão com o banco fechada.');
    process.exit(0);
  }
};

// Executar a migração
migrateChats();
