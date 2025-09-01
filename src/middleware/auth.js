import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware para verificar se o usuário está autenticado
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta_aqui');
    
    // Buscar o usuário no banco
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    // Adicionar o usuário ao request para uso posterior
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro interno na autenticação' });
  }
};

// Middleware opcional para rotas que podem funcionar com ou sem autenticação
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta_aqui');
      const user = await User.findById(decoded.userId).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Se houver erro na autenticação, continua sem usuário
    next();
  }
};
