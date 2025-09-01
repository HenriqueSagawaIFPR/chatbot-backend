import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  // Gerar token JWT
  generateToken(userId) {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  // Registrar novo usuário
  async registerUser(userData) {
    try {
      // Verificar se o usuário já existe
      const existingUser = await User.findOne({
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        throw new Error('Usuário ou email já existe');
      }

      // Criar novo usuário
      const user = new User(userData);
      await user.save();

      // Retornar dados do usuário sem senha
      const userResponse = user.toPublicJSON();
      const token = this.generateToken(user._id);

      return {
        user: userResponse,
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Fazer login do usuário
  async loginUser(credentials) {
    try {
      const { username, password } = credentials;

      // Buscar usuário por username ou email
      const user = await User.findOne({
        $or: [
          { username: username },
          { email: username }
        ]
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      if (!user.isActive) {
        throw new Error('Usuário inativo');
      }

      // Verificar senha
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Senha incorreta');
      }

      // Atualizar último login
      user.lastLogin = new Date();
      await user.save();

      // Retornar dados do usuário sem senha
      const userResponse = user.toPublicJSON();
      const token = this.generateToken(user._id);

      return {
        user: userResponse,
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Verificar se o token é válido
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  // Atualizar dados do usuário
  async updateUser(userId, updateData) {
    try {
      // Remover campos que não devem ser atualizados
      delete updateData.password;
      delete updateData.email; // Email não pode ser alterado por segurança
      
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Alterar senha
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Senha atual incorreta');
      }

      // Atualizar senha
      user.password = newPassword;
      await user.save();

      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
